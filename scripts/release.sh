#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# release.sh — Flujo de release para sajarubox-mcp
#
# Uso:
#   ./scripts/release.sh patch    # 1.26.0 → 1.26.1
#   ./scripts/release.sh minor    # 1.26.0 → 1.27.0
#   ./scripts/release.sh major    # 1.26.0 → 2.0.0
#   ./scripts/release.sh 1.30.0   # versión explícita
#
# Flujo:
#   1. Bump version en package.json
#   2. Crea rama release/vX.X.X
#   3. Commit + push
#   4. Crea PR con gh CLI
#   5. Aprueba y mergea el PR a main
#   6. Crea tag vX.X.X en main
#   7. Push tag
# ─────────────────────────────────────────────────────────────────────────────
set -e

BUMP=${1:-patch}

# ── Validar que estamos en main y el working tree está limpio ─────────────────
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
  echo "❌ Debes estar en la rama main (actual: $BRANCH)"
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Hay cambios sin commitear. Haz commit primero."
  git status --short
  exit 1
fi

git pull origin main --quiet

# ── Calcular nueva versión ────────────────────────────────────────────────────
CURRENT=$(node -p "require('./package.json').version")

if [[ "$BUMP" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  NEW_VERSION="$BUMP"
else
  IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
  case "$BUMP" in
    major) NEW_VERSION="$((MAJOR + 1)).0.0" ;;
    minor) NEW_VERSION="${MAJOR}.$((MINOR + 1)).0" ;;
    patch) NEW_VERSION="${MAJOR}.${MINOR}.$((PATCH + 1))" ;;
    *)
      echo "❌ Tipo inválido: $BUMP (usa patch | minor | major | X.Y.Z)"
      exit 1
      ;;
  esac
fi

echo "🔖  $CURRENT → $NEW_VERSION"

RELEASE_BRANCH="release/v${NEW_VERSION}"

# ── Bump version en package.json ──────────────────────────────────────────────
sed -i '' "s/\"version\": \"${CURRENT}\"/\"version\": \"${NEW_VERSION}\"/" package.json

# ── Rama + commit ─────────────────────────────────────────────────────────────
git checkout -b "$RELEASE_BRANCH"
git add package.json
git commit -m "chore: bump version to v${NEW_VERSION}"
git push origin "$RELEASE_BRANCH"

# ── Crear PR ──────────────────────────────────────────────────────────────────
echo "📬  Creando PR..."
PR_URL=$(gh pr create \
  --title "release: v${NEW_VERSION}" \
  --body "$(cat <<EOF
## Release v${NEW_VERSION}

Bump de versión automático desde \`scripts/release.sh\`.

### Cambios incluidos
$(git log origin/main..HEAD --oneline | sed 's/^/- /')

🤖 Generado con release.sh
EOF
)" \
  --base main \
  --head "$RELEASE_BRANCH")

echo "✅  PR creado: $PR_URL"

# ── Aprobar y mergear ─────────────────────────────────────────────────────────
echo "🔀  Mergeando PR..."
gh pr merge "$PR_URL" --merge --delete-branch

# ── Volver a main y tag ───────────────────────────────────────────────────────
git checkout main
git pull origin main --quiet

git tag "v${NEW_VERSION}" -m "v${NEW_VERSION}"
git push origin "v${NEW_VERSION}"

echo ""
echo "🎉  Release v${NEW_VERSION} publicado"
echo "    Tag: v${NEW_VERSION}"
echo "    PR:  $PR_URL"
