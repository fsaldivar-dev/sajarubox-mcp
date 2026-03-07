# Configuracion del Gimnasio

> Reglas de negocio para la configuracion global del gym (datos operativos y de contacto).

---

## Objetivo

Centralizar la configuracion del gimnasio en una fuente controlada, editable por administradores.

---

## Datos de configuracion

Campos minimos esperados:

| Campo | Tipo | Descripcion |
|------|------|-------------|
| `gymId` | String | Identificador unico del gym (`sajarubox`) |
| `name` | String | Nombre comercial |
| `phone` | String | Telefono principal |
| `whatsapp` | String | WhatsApp de contacto |
| `email` | String | Correo de contacto |
| `address` | String | Direccion o referencia principal |
| `mapsUrl` | String | URL publica de ubicacion |
| `businessHours` | Array | Horarios por dia |
| `dayPassPrice` | Number | Precio de pase de dia |
| `currency` | String | Moneda (`MXN`) |
| `socialLinks` | Object | URLs de redes sociales |
| `updatedAt` | Timestamp | Ultima actualizacion |
| `updatedBy` | String | Usuario que actualizo |

---

## Reglas de acceso

1. Solo `admin` puede editar configuracion global.
2. `receptionist` puede leer configuracion operativa.
3. `member` solo accede a configuracion publica.

---

## Reglas de operacion

1. Cambios de precio (`dayPassPrice`) deben quedar auditados.
2. Horarios deben validarse por formato y rango.
3. Configuracion publica debe estar disponible para web/landing.

---

## Fuente de verdad por etapa

1. Modulos nuevos: backend API + MySQL.
2. Durante migracion: se permite lectura desde legado si aun no hay cutover.
3. No crear nueva logica exclusiva de config en cliente.

---

## Errores esperados

| Caso | Codigo |
|------|--------|
| Payload invalido | `400 VALIDATION_ERROR` |
| Sin permisos | `403 FORBIDDEN` |
| Config no encontrada | `404 NOT_FOUND` |

