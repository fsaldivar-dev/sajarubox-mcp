#!/bin/bash

# =============================================================================
# SajaruBox MCP — Script de actualización
# Uso: ./scripts/refresh.sh
# Hace pull, rebuilda y reinicia el servidor MCP.
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_DIR="$(dirname "$SCRIPT_DIR")"

echo "📦 SajaruBox MCP — Refresh"
echo "================================"

# ── 1. Ir al directorio del MCP ───────────────────────────────────────────────
cd "$MCP_DIR"
echo "📁 Directorio: $MCP_DIR"

# ── 2. Verificar si hay cambios remotos ──────────────────────────────────────
echo ""
echo "🔍 Verificando versión remota..."
git fetch origin main --quiet

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "✅ Ya estás en la versión más reciente ($LOCAL)"
  NEEDS_BUILD=false
else
  echo "🆕 Nueva versión disponible"
  echo "   Local:  $LOCAL"
  echo "   Remoto: $REMOTE"
  NEEDS_BUILD=true
fi

# ── 3. Pull si hay cambios ────────────────────────────────────────────────────
if [ "$NEEDS_BUILD" = true ]; then
  echo ""
  echo "⬇️  Aplicando cambios..."
  git pull origin main
fi

# ── 4. Rebuildar siempre (permite forzar rebuild con --force) ─────────────────
if [ "$NEEDS_BUILD" = true ] || [ "$1" = "--force" ]; then
  echo ""
  echo "🔨 Compilando TypeScript..."
  npm run build
  echo "✅ Build exitoso"
else
  echo ""
  echo "ℹ️  Sin cambios. Usa --force para forzar rebuild:"
  echo "   ./scripts/refresh.sh --force"
fi

# ── 5. Matar proceso MCP en ejecución ────────────────────────────────────────
echo ""
echo "🔄 Reiniciando proceso MCP..."
if pkill -f "sajarubox-mcp/dist/index.js" 2>/dev/null; then
  echo "✅ Proceso anterior terminado"
else
  echo "ℹ️  No había proceso activo"
fi

# ── 6. Mostrar versión actual ─────────────────────────────────────────────────
VERSION=$(node -e "import('./package.json', {assert:{type:'json'}}).then(m=>console.log(m.default.version))" 2>/dev/null || node -p "require('./package.json').version" 2>/dev/null || echo "desconocida")
echo ""
echo "================================"
echo "✅ MCP listo — v$VERSION"
echo ""
echo "⚠️  Reinicia Claude Code para aplicar los cambios."
echo "================================"
