# SajaruBox MCP

Servidor MCP (**Model Context Protocol**) que expone el contexto compartido de SajaruBox a Claude Code. Actúa como fuente de verdad para reglas de negocio, schema de Firestore, roles, plataformas y sprints — disponible en cualquier sesión de Claude sin tener que pegarlo manualmente.

---

## ¿Qué hace?

Expone herramientas que Claude puede invocar para consultar:

| Herramienta | Descripción |
|-------------|-------------|
| `get_context(schema)` | Schema de Firestore (colecciones, campos, tipos) |
| `get_context(data-sources)` | Especificación cross-platform de fuentes de datos consultables |
| `get_context(storage-buckets)` | Inventario de buckets Storage y mapeo por ambiente |
| `get_context(rules)` | Reglas de negocio cross-platform |
| `get_context(roles)` | Roles de usuario y permisos por colección |
| `get_context(platforms)` | Descripción de cada plataforma y su stack |
| `get_context(sprint)` | Estado del sprint actual |
| `list_sprints()` | Lista todos los sprints disponibles |
| `get_sprint(filename)` | Contenido completo de un sprint específico |
| `add_feature(title, platform)` | Agrega un feature pendiente al sprint activo |

---

## Estructura

```
sajarubox-mcp/
├── knowledge/
│   ├── schema.md          # Schema de Firestore
│   ├── roles.md           # Roles y permisos
│   ├── platforms.md       # Plataformas (Android, iOS, Web)
│   ├── data-sources.md    # Fuentes de datos (Firestore/Auth/Storage/CLI)
│   ├── storage-buckets.md # Buckets de Firebase Storage por ambiente
│   └── business-rules.md  # Reglas de negocio
├── sprints/
│   └── sprint-01.md       # Sprints del proyecto
├── src/
│   └── index.ts           # Servidor MCP (TypeScript)
├── dist/                  # Build compilado (no editar)
├── scripts/
│   └── refresh.sh         # Script para actualizar y recargar
└── package.json
```

---

## Instalación en Claude Code

Agrega esto a tu `~/.claude.json` en la sección `mcpServers`:

```json
{
  "mcpServers": {
    "sajarubox": {
      "command": "node",
      "args": ["/ruta/absoluta/sajarubox-mcp/dist/index.js"]
    }
  }
}
```

Luego **reinicia Claude Code** para que cargue el servidor.

---

## Actualizar el MCP

Cuando hagas cambios en los archivos de `knowledge/` o `sprints/`, necesitas rebuildar y recargar:

```bash
./scripts/refresh.sh --force
```

El script:
1. Hace `git pull` para traer los últimos cambios
2. Compila TypeScript → `dist/`
3. Mata el proceso MCP en ejecución
4. Claude Code lo reinicia automáticamente en la próxima invocación

Verificacion recomendada despues del refresh:
1. Ejecutar `list_topics` y confirmar que aparecen los topics nuevos/actualizados
2. Ejecutar `get_context` en los topics cambiados (por ejemplo `user-roles`, `admin-setup`, `membership-assignments`, `classes`)

---

## Desarrollo

```bash
# Instalar dependencias
npm install

# Compilar
npm run build

# Modo desarrollo (sin compilar)
npm run dev
```

---

## Versionado

El MCP sigue **semver**:

| Tipo de cambio | Versión |
|----------------|---------|
| Nuevo tool o recurso | `minor` (1.x.0) |
| Cambio en reglas de negocio o schema | `minor` (1.x.0) |
| Fix de contenido o typo | `patch` (1.0.x) |
| Breaking change en la API del servidor | `major` (x.0.0) |

---

## Flujo de trabajo recomendado

```
1. Edita knowledge/*.md o sprints/*.md
2. Si cambias topics/resources, actualiza src/index.ts
3. Alinea version en package.json + src/index.ts + package-lock.json
4. Ejecuta ./scripts/refresh.sh --force
5. Reinicia Claude Code
6. Verifica con: list_topics y get_context(topic)
7. Haz commit con mensaje descriptivo
```
