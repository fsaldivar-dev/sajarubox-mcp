import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

// ── Recursos disponibles ──────────────────────────────────────────────────────

const RESOURCES = [
  {
    uri: "sajarubox://schema",
    name: "Database Schema",
    description: "Esquema de Firestore: colecciones, campos y tipos",
    file: "knowledge/schema.md",
  },
  {
    uri: "sajarubox://roles",
    name: "Roles & Permissions",
    description: "Roles de usuario (admin/member) y permisos por colección",
    file: "knowledge/roles.md",
  },
  {
    uri: "sajarubox://rules",
    name: "Business Rules",
    description: "Reglas de negocio: registro, onboarding, membresías, clases",
    file: "knowledge/business-rules.md",
  },
  {
    uri: "sajarubox://platforms",
    name: "Platform Features",
    description: "Features por plataforma (Android, iOS, Web)",
    file: "knowledge/platforms.md",
  },
  {
    uri: "sajarubox://sprint",
    name: "Current Sprint",
    description: "Sprint actual y backlog de features",
    file: "sprints/sprint-01.md",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function readFile(relativePath: string): string {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Archivo no encontrado: ${relativePath}`);
  }
  return fs.readFileSync(fullPath, "utf-8");
}

function writeFile(relativePath: string, content: string): void {
  const fullPath = path.join(ROOT, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf-8");
}

function listSprintFiles(): string[] {
  const sprintsDir = path.join(ROOT, "sprints");
  return fs
    .readdirSync(sprintsDir)
    .filter((f) => f.endsWith(".md"))
    .sort();
}

// ── Servidor MCP ──────────────────────────────────────────────────────────────

const server = new Server(
  { name: "sajarubox-mcp", version: "1.0.0" },
  { capabilities: { resources: {}, tools: {} } }
);

// Listar recursos
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: RESOURCES.map(({ uri, name, description }) => ({
    uri,
    name,
    description,
    mimeType: "text/markdown",
  })),
}));

// Leer recurso
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  const resource = RESOURCES.find((r) => r.uri === uri);
  if (!resource) throw new Error(`Recurso no encontrado: ${uri}`);
  const text = readFile(resource.file);
  return {
    contents: [{ uri, mimeType: "text/markdown", text }],
  };
});

// Listar tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_context",
      description:
        "Obtiene el contexto de un tema: schema, roles, rules, platforms o sprint",
      inputSchema: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            enum: ["schema", "roles", "rules", "platforms", "sprint"],
            description: "El tema a consultar",
          },
        },
        required: ["topic"],
      },
    },
    {
      name: "list_sprints",
      description: "Lista todos los sprints disponibles",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_sprint",
      description: "Obtiene el contenido de un sprint específico",
      inputSchema: {
        type: "object",
        properties: {
          filename: {
            type: "string",
            description: "Nombre del archivo, ej: sprint-01.md",
          },
        },
        required: ["filename"],
      },
    },
    {
      name: "add_feature",
      description:
        "Agrega un feature al sprint actual como ítem pendiente",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título del feature" },
          platform: {
            type: "string",
            enum: ["Android", "iOS", "Web", "Cross-platform"],
            description: "Plataforma objetivo",
          },
          sprint: {
            type: "string",
            description: "Nombre del sprint, ej: sprint-02.md",
            default: "sprint-01.md",
          },
        },
        required: ["title", "platform"],
      },
    },
  ],
}));

// Ejecutar tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "get_context": {
      const topicMap: Record<string, string> = {
        schema: "knowledge/schema.md",
        roles: "knowledge/roles.md",
        rules: "knowledge/business-rules.md",
        platforms: "knowledge/platforms.md",
        sprint: "sprints/sprint-01.md",
      };
      const file = topicMap[args?.topic as string];
      if (!file) throw new Error(`Topic inválido: ${args?.topic}`);
      const content = readFile(file);
      return { content: [{ type: "text", text: content }] };
    }

    case "list_sprints": {
      const files = listSprintFiles();
      const list = files.map((f) => `- ${f}`).join("\n");
      return { content: [{ type: "text", text: `Sprints disponibles:\n${list}` }] };
    }

    case "get_sprint": {
      const filename = args?.filename as string;
      const content = readFile(`sprints/${filename}`);
      return { content: [{ type: "text", text: content }] };
    }

    case "add_feature": {
      const { title, platform, sprint = "sprint-01.md" } = args as {
        title: string;
        platform: string;
        sprint?: string;
      };
      const filePath = `sprints/${sprint}`;
      let content = readFile(filePath);
      const newItem = `- [ ] ${platform}: ${title}`;
      // Agregar al final de la sección de candidatos o al final del archivo
      if (content.includes("## Candidatos")) {
        content = content.replace(
          /## Candidatos\n([\s\S]*?)(\n---|\n#|$)/,
          (match, items, end) => `## Candidatos\n${items}${newItem}\n${end}`
        );
      } else {
        content += `\n${newItem}`;
      }
      writeFile(filePath, content);
      return {
        content: [{ type: "text", text: `✅ Feature agregado: "${title}" (${platform}) en ${sprint}` }],
      };
    }

    default:
      throw new Error(`Tool desconocido: ${name}`);
  }
});

// ── Iniciar ───────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
