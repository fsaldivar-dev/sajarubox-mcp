# SajaruBox — Firebase & Google Cloud Setup

> Configuración de la infraestructura cloud del proyecto.
> Actualizar este documento ante cualquier cambio en servicios, proyectos o cuentas.

---

## Proyecto Google Cloud / Firebase

| Campo | Valor |
|-------|-------|
| Project ID | `sajarubox` |
| Project Number | `412512287883` |
| Firebase Console | https://console.firebase.google.com/project/sajarubox |
| Google Cloud Console | https://console.cloud.google.com/home/dashboard?project=sajarubox |
| Cuenta propietaria | `fsaldivar.dev@gmail.com` |

---

## Billing Account

| Campo | Valor |
|-------|-------|
| Account ID | `01DDAA-FDC5C9-D6F8D4` |
| Nombre | Pago de Firebase |
| Moneda | **MXN (Pesos Mexicanos)** |
| Plan | Blaze (pay-as-you-go) |

> **Importante:** La moneda es MXN, no USD. Al configurar presupuestos vía CLI usar `200MXN`, no `200USD`.

---

## Servicios activos

| Servicio | Uso | Plan |
|----------|-----|------|
| Firestore | Base de datos principal (miembros, pagos, clases, etc.) | Blaze |
| Firebase Auth | Autenticación (email, Google, Apple) | Gratis hasta 10K usuarios |
| Firebase Realtime Database | Timer de entrenamiento (timer-android + timer-tv) | Blaze |
| Firebase Storage | Archivos binarios (imágenes, docs) — 4 buckets activos | Blaze |
| Firebase Hosting | Landing web estática | Blaze |
| Cloud Functions (Gen 2) | Kill switch de billing | Blaze |
| Cloud Pub/Sub | Trigger del kill switch | Blaze |

---

## APIs habilitadas en Google Cloud

- `firestore.googleapis.com`
- `firebase.googleapis.com`
- `pubsub.googleapis.com`
- `cloudfunctions.googleapis.com`
- `cloudbuild.googleapis.com`
- `eventarc.googleapis.com`
- `run.googleapis.com`
- `artifactregistry.googleapis.com`
- `billingbudgets.googleapis.com`
- `cloudbilling.googleapis.com`
- `cloudresourcemanager.googleapis.com`

---

## Herramientas CLI

```bash
# Verificar autenticación
firebase login
gcloud auth list

# Cambiar proyecto activo
gcloud config set project sajarubox
firebase use sajarubox

# Ver servicios habilitados
gcloud services list --enabled
```
