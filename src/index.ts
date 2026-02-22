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
  // Documentacion original (cross-platform)
  {
    uri: "sajarubox://schema",
    name: "Database Schema",
    description: "Esquema de Firestore: colecciones, campos y tipos",
    file: "knowledge/schema.md",
  },
  {
    uri: "sajarubox://roles",
    name: "Roles & Permissions",
    description: "Roles de usuario (admin/member) y permisos por coleccion",
    file: "knowledge/roles.md",
  },
  {
    uri: "sajarubox://rules",
    name: "Business Rules (legacy)",
    description: "Reglas de negocio generales (archivo original)",
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

  // Reglas de negocio (para PO)
  {
    uri: "sajarubox://business/authentication",
    name: "Reglas: Autenticacion",
    description: "Flujos de login, registro, multi-proveedor, seguridad",
    file: "knowledge/business-rules/01-authentication.md",
  },
  {
    uri: "sajarubox://business/user-roles",
    name: "Reglas: Roles de usuario",
    description: "Roles, permisos por coleccion, funcionalidad por rol",
    file: "knowledge/business-rules/02-user-roles.md",
  },
  {
    uri: "sajarubox://business/memberships",
    name: "Reglas: Membresias",
    description: "Planes, estados, asignacion, soft delete",
    file: "knowledge/business-rules/03-membership-management.md",
  },
  {
    uri: "sajarubox://business/members",
    name: "Reglas: Registro de miembros",
    description: "Alta de miembros, busqueda, grupos familiares",
    file: "knowledge/business-rules/04-member-registration.md",
  },
  {
    uri: "sajarubox://business/admin-setup",
    name: "Reglas: Setup de admin",
    description: "Deteccion de primer usuario, resolucion de sesion",
    file: "knowledge/business-rules/05-admin-setup.md",
  },
  {
    uri: "sajarubox://business/membership-plans",
    name: "Reglas: Catalogo de planes",
    description: "Tipos de plan (time_based, visit_based, mixed), campos, reglas de negocio",
    file: "knowledge/business-rules/06-membership-plans.md",
  },
  {
    uri: "sajarubox://business/membership-assignments",
    name: "Reglas: Asignaciones de membresia",
    description: "Snapshot inmutable, check-in, renovacion, vencimiento, planes familiares",
    file: "knowledge/business-rules/07-membership-assignments.md",
  },
  {
    uri: "sajarubox://business/payments",
    name: "Reglas: Pagos y cobros",
    description: "Tipos de pago, cobro de membresia, pase de dia, venta de productos/servicios, punto de venta",
    file: "knowledge/business-rules/08-payments.md",
  },

  // Arquitectura iOS (para IA)
  {
    uri: "sajarubox://ios/project-structure",
    name: "iOS: Estructura del proyecto",
    description: "Dos repos, modulos SPM, flujo de dependencias",
    file: "knowledge/ios-architecture/01-project-structure.md",
  },
  {
    uri: "sajarubox://ios/mvvm-pattern",
    name: "iOS: Patron MVVM",
    description: "View + ViewData + ViewModel con ejemplos",
    file: "knowledge/ios-architecture/02-mvvm-pattern.md",
  },
  {
    uri: "sajarubox://ios/dependency-injection",
    name: "iOS: Inyeccion de dependencias",
    description: "swift-dependencies, DependencyState, RouterManager",
    file: "knowledge/ios-architecture/03-dependency-injection.md",
  },
  {
    uri: "sajarubox://ios/navigation",
    name: "iOS: Sistema de navegacion",
    description: "Phase global + Router/FlowStack por modulo",
    file: "knowledge/ios-architecture/04-navigation-system.md",
  },
  {
    uri: "sajarubox://ios/design-system",
    name: "iOS: Sistema de diseno SajaruUI",
    description: "Protocolos, themes, property wrappers, styles, Moon components",
    file: "knowledge/ios-architecture/05-design-system.md",
  },
  {
    uri: "sajarubox://ios/data-sync",
    name: "iOS: Sincronizacion de datos",
    description: "SyncEngine, RemoteStore/LocalStore (planificado)",
    file: "knowledge/ios-architecture/06-data-sync.md",
  },

  // Reglas de negocio: Clases y Reportes
  {
    uri: "sajarubox://business/classes",
    name: "Reglas: Clases del gimnasio",
    description: "CRUD de clases, recurrencia, reservas, asistencia, compatibilidad cross-platform",
    file: "knowledge/business-rules/10-classes.md",
  },
  {
    uri: "sajarubox://business/reports",
    name: "Reglas: Reportes y metricas",
    description: "Metricas financieras, visitas, membresias, inventario, periodos, alertas",
    file: "knowledge/business-rules/11-reports.md",
  },

  // Implementacion iOS (para devs)
  {
    uri: "sajarubox://ios-impl/firestore",
    name: "iOS Impl: Operaciones Firestore",
    description: "CRUD, soft delete, email index, busqueda, codigo completo",
    file: "knowledge/ios-implementation/01-firestore-operations.md",
  },
  {
    uri: "sajarubox://ios-impl/auth-flow",
    name: "iOS Impl: Flujo de autenticacion",
    description: "AuthProvider pattern, Firebase Auth, AuthErrorMapper",
    file: "knowledge/ios-implementation/02-auth-flow.md",
  },
  {
    uri: "sajarubox://ios-impl/session-resolver",
    name: "iOS Impl: Session Resolver",
    description: "Algoritmo completo de resolucion de sesion",
    file: "knowledge/ios-implementation/03-session-resolver.md",
  },
  {
    uri: "sajarubox://ios-impl/new-module",
    name: "iOS Impl: Crear nuevo modulo",
    description: "Guia paso a paso para crear modulos MVVM",
    file: "knowledge/ios-implementation/04-creating-new-module.md",
  },
  {
    uri: "sajarubox://ios-impl/theming",
    name: "iOS Impl: Guia de theming",
    description: "Property wrappers, styles, crear temas nuevos",
    file: "knowledge/ios-implementation/05-theming-guide.md",
  },
  {
    uri: "sajarubox://ios-impl/classes",
    name: "iOS Impl: Modulo de clases",
    description: "Implementacion del modulo de clases: modelos, Firestore, UI, recurrencia",
    file: "knowledge/ios-implementation/10-classes-module.md",
  },
  {
    uri: "sajarubox://ios-impl/reports",
    name: "iOS Impl: Modulo de reportes",
    description: "Dashboard de metricas, TextAmount, calculo desde repositorios existentes",
    file: "knowledge/ios-implementation/11-reports-module.md",
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

function listKnowledgeFiles(subdir?: string): string[] {
  const baseDir = path.join(ROOT, "knowledge", subdir || "");
  if (!fs.existsSync(baseDir)) return [];

  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(subdir ? `${subdir}/${entry.name}` : entry.name);
    } else if (entry.isDirectory()) {
      const subFiles = listKnowledgeFiles(
        subdir ? `${subdir}/${entry.name}` : entry.name
      );
      files.push(...subFiles);
    }
  }
  return files.sort();
}

// ── Topics para get_context ─────────────────────────────────────────────────

const TOPIC_MAP: Record<string, string | string[]> = {
  // Originales
  schema: "knowledge/schema.md",
  roles: "knowledge/roles.md",
  rules: "knowledge/business-rules.md",
  platforms: "knowledge/platforms.md",
  sprint: "sprints/sprint-01.md",
  // Reglas de negocio
  authentication: "knowledge/business-rules/01-authentication.md",
  "user-roles": "knowledge/business-rules/02-user-roles.md",
  memberships: "knowledge/business-rules/03-membership-management.md",
  members: "knowledge/business-rules/04-member-registration.md",
  "admin-setup": "knowledge/business-rules/05-admin-setup.md",
  "membership-plans": "knowledge/business-rules/06-membership-plans.md",
  "membership-assignments": "knowledge/business-rules/07-membership-assignments.md",
  payments: "knowledge/business-rules/08-payments.md",
  inventory: "knowledge/business-rules/09-inventory.md",
  classes: "knowledge/business-rules/10-classes.md",
  reports: "knowledge/business-rules/11-reports.md",
  // iOS arquitectura
  "ios-structure": "knowledge/ios-architecture/01-project-structure.md",
  "ios-mvvm": "knowledge/ios-architecture/02-mvvm-pattern.md",
  "ios-di": "knowledge/ios-architecture/03-dependency-injection.md",
  "ios-navigation": "knowledge/ios-architecture/04-navigation-system.md",
  "ios-design-system": "knowledge/ios-architecture/05-design-system.md",
  "ios-sync": "knowledge/ios-architecture/06-data-sync.md",
  // iOS implementacion
  "ios-firestore": "knowledge/ios-implementation/01-firestore-operations.md",
  "ios-auth": "knowledge/ios-implementation/02-auth-flow.md",
  "ios-session": "knowledge/ios-implementation/03-session-resolver.md",
  "ios-new-module": "knowledge/ios-implementation/04-creating-new-module.md",
  "ios-theming": "knowledge/ios-implementation/05-theming-guide.md",
  "ios-inventory": "knowledge/ios-implementation/09-inventory-module.md",
  "ios-classes": "knowledge/ios-implementation/10-classes-module.md",
  "ios-reports": "knowledge/ios-implementation/11-reports-module.md",
  // Bundles (multiples archivos)
  "all-business": [
    "knowledge/business-rules/01-authentication.md",
    "knowledge/business-rules/02-user-roles.md",
    "knowledge/business-rules/03-membership-management.md",
    "knowledge/business-rules/04-member-registration.md",
    "knowledge/business-rules/05-admin-setup.md",
    "knowledge/business-rules/06-membership-plans.md",
    "knowledge/business-rules/07-membership-assignments.md",
    "knowledge/business-rules/08-payments.md",
    "knowledge/business-rules/09-inventory.md",
    "knowledge/business-rules/10-classes.md",
    "knowledge/business-rules/11-reports.md",
  ],
  "all-ios-arch": [
    "knowledge/ios-architecture/01-project-structure.md",
    "knowledge/ios-architecture/02-mvvm-pattern.md",
    "knowledge/ios-architecture/03-dependency-injection.md",
    "knowledge/ios-architecture/04-navigation-system.md",
    "knowledge/ios-architecture/05-design-system.md",
    "knowledge/ios-architecture/06-data-sync.md",
  ],
  "all-ios-impl": [
    "knowledge/ios-implementation/01-firestore-operations.md",
    "knowledge/ios-implementation/02-auth-flow.md",
    "knowledge/ios-implementation/03-session-resolver.md",
    "knowledge/ios-implementation/04-creating-new-module.md",
    "knowledge/ios-implementation/05-theming-guide.md",
    "knowledge/ios-implementation/09-inventory-module.md",
    "knowledge/ios-implementation/10-classes-module.md",
    "knowledge/ios-implementation/11-reports-module.md",
  ],
};

// ── Servidor MCP ──────────────────────────────────────────────────────────────

const server = new Server(
  { name: "sajarubox-mcp", version: "1.17.0" },
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
        "Obtiene documentacion de SajaruBox por tema. Topics disponibles: schema, roles, rules, platforms, sprint, authentication, user-roles, memberships, members, admin-setup, membership-plans, membership-assignments, payments, inventory, classes, reports, ios-structure, ios-mvvm, ios-di, ios-navigation, ios-design-system, ios-sync, ios-firestore, ios-auth, ios-session, ios-new-module, ios-theming, ios-inventory, ios-classes, ios-reports, all-business, all-ios-arch, all-ios-impl",
      inputSchema: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            description: "El tema a consultar (ver lista en la descripcion)",
          },
        },
        required: ["topic"],
      },
    },
    {
      name: "list_topics",
      description: "Lista todos los topics disponibles para get_context",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "list_sprints",
      description: "Lista todos los sprints disponibles",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_sprint",
      description: "Obtiene el contenido de un sprint especifico",
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
        "Agrega un feature al sprint actual como item pendiente",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Titulo del feature" },
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
    {
      name: "list_knowledge",
      description: "Lista todos los archivos de documentacion disponibles en knowledge/",
      inputSchema: { type: "object", properties: {} },
    },
  ],
}));

// Ejecutar tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "get_context": {
      const topic = args?.topic as string;
      const files = TOPIC_MAP[topic];
      if (!files) {
        const available = Object.keys(TOPIC_MAP).join(", ");
        throw new Error(
          `Topic invalido: "${topic}". Disponibles: ${available}`
        );
      }

      if (Array.isArray(files)) {
        const contents = files.map((f) => {
          const content = readFile(f);
          return `# --- ${f} ---\n\n${content}`;
        });
        return {
          content: [{ type: "text", text: contents.join("\n\n---\n\n") }],
        };
      }

      const content = readFile(files);
      return { content: [{ type: "text", text: content }] };
    }

    case "list_topics": {
      const topics = Object.entries(TOPIC_MAP).map(([key, val]) => {
        const isBundle = Array.isArray(val);
        return `- **${key}**${isBundle ? ` (bundle: ${val.length} archivos)` : ""}`;
      });
      return {
        content: [
          {
            type: "text",
            text: `Topics disponibles para get_context:\n\n${topics.join("\n")}`,
          },
        ],
      };
    }

    case "list_sprints": {
      const files = listSprintFiles();
      const list = files.map((f) => `- ${f}`).join("\n");
      return {
        content: [
          { type: "text", text: `Sprints disponibles:\n${list}` },
        ],
      };
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
      if (content.includes("## Candidatos")) {
        content = content.replace(
          /## Candidatos\n([\s\S]*?)(\n---|\n#|$)/,
          (match, items, end) =>
            `## Candidatos\n${items}${newItem}\n${end}`
        );
      } else {
        content += `\n${newItem}`;
      }
      writeFile(filePath, content);
      return {
        content: [
          {
            type: "text",
            text: `Feature agregado: "${title}" (${platform}) en ${sprint}`,
          },
        ],
      };
    }

    case "list_knowledge": {
      const files = listKnowledgeFiles();
      const list = files.map((f) => `- knowledge/${f}`).join("\n");
      return {
        content: [
          {
            type: "text",
            text: `Archivos de documentacion:\n\n${list}`,
          },
        ],
      };
    }

    default:
      throw new Error(`Tool desconocido: ${name}`);
  }
});

// ── Iniciar ───────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
