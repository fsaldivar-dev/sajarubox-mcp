# Backend en Hostinger (Node.js App)

> Guía técnica para desplegar la API REST oficial de SajaruBox en Hostinger.

---

## Topologia recomendada

- `sajarubox.com` -> Landing web (frontend)
- `api.sajarubox.com` -> Backend Node.js (REST API)
- MySQL gestionado en Hostinger

---

## Requisitos

1. Subdominio `api.sajarubox.com` creado en hPanel
2. Proyecto Node.js en repositorio Git (recomendado repo separado: `sajarubox-api`)
3. Base de datos MySQL y usuario dedicados

---

## Variables de entorno minimas

| Variable | Descripcion |
|----------|-------------|
| `NODE_ENV` | `production` o `staging` |
| `PORT` | Puerto de la app asignado por Hostinger |
| `DB_HOST` | Host de MySQL |
| `DB_PORT` | Puerto MySQL (normalmente 3306) |
| `DB_NAME` | Nombre de la DB |
| `DB_USER` | Usuario DB |
| `DB_PASSWORD` | Password DB |
| `FIREBASE_PROJECT_ID` | Proyecto Firebase Auth |
| `FIREBASE_CLIENT_EMAIL` | Service account email |
| `FIREBASE_PRIVATE_KEY` | Private key (escapada correctamente) |
| `CORS_ORIGINS` | Origenes permitidos, ej: `https://sajarubox.com` |

---

## Pasos de despliegue

1. Crear/validar subdominio `api.sajarubox.com`
2. En Hostinger, crear **Node.js App** vinculada al subdominio
3. Conectar repo Git del backend
4. Configurar build/start command segun `package.json`
5. Cargar variables de entorno
6. Ejecutar deploy
7. Validar `GET /api/v1/health`

---

## Convenciones operativas

- API base path: `/api/v1`
- Healthcheck: `/api/v1/health`
- Logs estructurados en stdout
- Timezone del backend y DB definida explicitamente

---

## Seguridad base

1. Nunca exponer credenciales en repositorio.
2. Validar ID token de Firebase en middleware.
3. Aplicar CORS restrictivo por dominio.
4. Agregar rate limit para endpoints de auth y operaciones sensibles.
5. Usar HTTPS obligatorio.
