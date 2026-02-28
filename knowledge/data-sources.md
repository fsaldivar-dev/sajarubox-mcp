# Especificacion de fuentes de datos (cross-platform)

Documento de referencia para saber **que fuentes existen**, **quien las usa** (Android/iOS/Web) y **que es consultable** desde el MCP.

---

## 1) Proyecto Firebase canonico

- `projectId`: `sajarubox`
- `storageBucket`: `sajarubox.firebasestorage.app`

Fuentes:
- iOS `GoogleService-Info-Stage.plist`
- iOS `GoogleService-Info-Release.plist`
- Firebase CLI (`firebase firestore:databases:list --project sajarubox`)

---

## 2) Firestore databases disponibles

Databases existentes en el proyecto:

| Database ID | Estado esperado | Uso principal |
|---|---|---|
| `(default)` | Legacy/compatibilidad | Flujos antiguos o no migrados |
| `prod` | Produccion | Datos reales de operacion |
| `stage` | Staging | QA/UAT |
| `test` | Desarrollo/testing | Pruebas aisladas |

Notas:
- Todas son `FIRESTORE_NATIVE` (region `nam5`).
- Cada database tiene reglas e indices propios.

---

## 3) Colecciones de dominio (fuente de verdad de datos)

Ver detalle completo en `schema.md`. Colecciones activas principales:

- `users`
- `members`
- `membership_plans`
- `check_ins`
- `payments`
- `products`
- `expenses`
- `classes`
- `classBookings`
- `classAttendance`
- `exercises`
- `routine_templates`
- `daily_routines`
- `app_config`
- `user_emails`

---

## 4) Otras fuentes de datos relevantes

### 4.1 Firebase Auth
- Fuente de identidad y UID primario.
- Proveedores: credentials / Google / Apple (segun plataforma).

### 4.2 Firebase Storage
- Bucket: `sajarubox.firebasestorage.app`
- Uso tipico: media/imagenes (ej. foto de perfil de miembro).

### 4.2.1 Inventario consultado (CLI)

Estado validado por CLI en el proyecto `sajarubox`:

| Verificacion | Resultado |
|---|---|
| `firebase apps:list --project sajarubox` | 6 apps (4 iOS, 2 Android, 0 Web) |
| `firebase apps:sdkconfig IOS <appId>` | `STORAGE_BUCKET = sajarubox.firebasestorage.app` |
| `firebase apps:sdkconfig ANDROID <appId>` | `storage_bucket = sajarubox.firebasestorage.app` |
| Bucket configurado por ambiente | Mismo bucket para stage/release en iOS y Android |

Observacion importante:
- En el entorno actual no hay `gcloud`/`gsutil`, por lo que **no se listaron objetos internos del bucket** desde terminal.
- El inventario de objetos/rutas debe hacerse con `gcloud storage` o `gsutil` en una máquina con ese tooling.

Comandos sugeridos (si hay gcloud/gsutil):

```bash
# Listar buckets del proyecto
gcloud storage buckets list --project sajarubox

# Listar prefijos/objetos del bucket
gcloud storage ls gs://sajarubox.firebasestorage.app
gcloud storage ls --recursive gs://sajarubox.firebasestorage.app/**
```

### 4.3 Configuracion local por plataforma
- iOS: `GoogleService-Info-Stage.plist`, `GoogleService-Info-Release.plist`
- Android: `google-services.json` + `BuildConfig`/flavors
- Web: config SDK en variables de entorno/build

---

## 5) Matriz por plataforma (estado actual)

| Plataforma | Firestore DB seleccionable por ambiente | Estado |
|---|---|---|
| Android | Si (documentado con `FirestoreProvider`/`FirestoreConfig`) | En migracion |
| iOS | Si (por esquema/configuracion: `Test`, `Stage`, `Release`) | Activo y validado en runtime |
| Web | Depende de implementacion actual | No estandarizado en esta doc |

---

## 6) Que se puede consultar desde el MCP (y que no)

### Consultable via MCP (actual)
- Reglas de negocio (`knowledge/business-rules/*`)
- Esquema (`knowledge/schema.md`)
- Arquitectura/implementacion por plataforma (`knowledge/*-architecture`, `knowledge/*-implementation`)
- Buckets y mapeo por ambiente (`knowledge/storage-buckets.md`)
- Sprints (`sprints/*`)

### No consultable directamente via MCP (sin tool especifico)
- Estado live de Firestore (documentos reales)
- Reglas activas por database en Firebase (live)
- Indices live
- Metricas de uso/costos
- Inventario de objetos de Cloud Storage (sin gcloud/gsutil o tool MCP dedicado)

Para lo anterior usar CLI/API (ej. Firebase CLI) o agregar tools MCP dedicados.

---

## 7) Comandos de verificacion recomendados (Firebase CLI)

```bash
# Listar databases
firebase firestore:databases:list --project sajarubox

# Detalle de una database
firebase firestore:databases:get --project sajarubox stage
firebase firestore:databases:get --project sajarubox test
firebase firestore:databases:get --project sajarubox prod
firebase firestore:databases:get --project sajarubox "(default)"
```

---

## 8) Implicaciones para el agente/IA

1. Si una decision depende de datos live, no asumir: validar con CLI/tooling.
2. Si una implementacion cambia fuentes, actualizar:
   - `schema.md`
   - esta especificacion (`data-sources.md`)
   - docs de plataforma afectada.
3. Si cambia la seleccion por ambiente en iOS/Web, documentar el selector central y el mapeo por ambiente.

### 8.1 Mapeo iOS validado (esquemas -> datasource)

- `SajaruBoxTest` (`TEST`):
  - Firestore DB: `test`
  - Storage bucket: `sajarubox_test`
- `SajaruBoxStage` (`STAGE`):
  - Firestore DB: `stage`
  - Storage bucket: `sajarubox_stage`
- `SajaruBox` (`RELEASE`):
  - Firestore DB: `prod`
  - Storage bucket: `sajarubox_prod`

Validacion recomendada:
- Revisar log de arranque en iOS:
  - `Firebase compileConfiguration=... appEnvironment=... firestoreDatabase=... storageBucket=...`
- Confirmar que el valor de `firestoreDatabase` coincide con el esquema seleccionado.

---

## 9) Checklist de cambios en fuentes de datos

- [ ] Se agrego/modifico database ID
- [ ] Se actualizo `schema.md` si cambian colecciones/campos
- [ ] Se actualizo `data-sources.md` (este archivo)
- [ ] Se actualizaron docs de plataforma afectada
- [ ] Se validaron reglas/indices por database (si aplica)
- [ ] Se validó bucket de Storage y prefijos activos (si aplica)
