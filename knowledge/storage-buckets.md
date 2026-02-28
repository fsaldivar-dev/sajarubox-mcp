# Firebase Storage Buckets (multi-bucket)

Documento de referencia para identificar los buckets de Storage del proyecto, su proposito y el mapeo por ambiente.

---

## 1) Estado actual verificado

Proyecto Firebase: `sajarubox`

Buckets observados:

| Bucket | Tipo | Region | Fuente de validacion |
|---|---|---|---|
| `sajarubox.firebasestorage.app` | Predeterminado Firebase Storage | `US-CENTRAL1` | Firebase Console (selector de bucket) + sdkconfig |
| `sajarubox_prod` | Bucket adicional | `US-CENTRAL1` | Firebase Console (selector de bucket) |
| `sajarubox_stage` | Bucket adicional | `US-CENTRAL1` | Firebase Console (selector de bucket) |
| `sajarubox_test` | Bucket adicional | `US-CENTRAL1` | Firebase Console (selector de bucket) |

Nota:
- La configuracion descargada por `firebase apps:sdkconfig` en iOS/Android sigue apuntando al bucket predeterminado (`sajarubox.firebasestorage.app`) si no se sobreescribe en runtime.

---

## 2) Modelo recomendado de uso por ambiente

| Ambiente app | Bucket recomendado |
|---|---|
| `prod` / `release` | `sajarubox_prod` |
| `stage` | `sajarubox_stage` |
| `test` / QA tecnico | `sajarubox_test` |
| Legacy / compatibilidad | `sajarubox.firebasestorage.app` |

Regla:
- No asumir que Firebase selecciona el bucket por ambiente automaticamente.
- El cliente debe inicializar `Storage` con el bucket explicito por entorno.

---

## 3) Implicaciones de arquitectura

1. Firestore multi-database y Storage multi-bucket deben mantenerse alineados por ambiente.
2. Las rutas de objetos deben conservar el mismo contrato entre buckets (ej: `members/{memberId}/profile.jpg`).
3. Reglas de Storage deben revisarse por bucket antes de mover trafico productivo.
4. Si una app usa bucket predeterminado por error en stage/test, se rompe el aislamiento de datos de media.

---

## 4) Verificacion operativa (CLI sugerido)

Comandos para inventario real (requiere `gcloud` o `gsutil`):

```bash
# Buckets existentes
gcloud storage buckets list --project sajarubox

# Metadata de un bucket
gcloud storage buckets describe gs://sajarubox_prod --project sajarubox
gcloud storage buckets describe gs://sajarubox_stage --project sajarubox
gcloud storage buckets describe gs://sajarubox_test --project sajarubox

# Prefijos/objetos por bucket
gcloud storage ls gs://sajarubox_prod
gcloud storage ls gs://sajarubox_stage
gcloud storage ls gs://sajarubox_test
```

---

## 5) Que es consultable via MCP

Consultable:
- Inventario documental de buckets y su mapeo por ambiente.
- Reglas de uso recomendadas y checklist operativo.

No consultable directamente (sin tool MCP dedicado):
- Objetos live dentro de cada bucket.
- ACL/IAM live por bucket.
- Metricas de costo, trafico o retencion.

---

## 6) Checklist de cambio (storage)

- [ ] Se actualizo el mapeo ambiente -> bucket
- [ ] Se validaron reglas por bucket
- [ ] Se validaron prefijos esperados por ambiente
- [ ] Se actualizo `knowledge/data-sources.md` si aplica
- [ ] Se actualizo este archivo (`knowledge/storage-buckets.md`)
