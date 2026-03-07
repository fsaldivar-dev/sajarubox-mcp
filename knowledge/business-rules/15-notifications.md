# Notificaciones

> Reglas para notificaciones operativas del gimnasio (internas y de recordatorio).

---

## Objetivo

Notificar eventos relevantes de operacion sin depender de logica dispersa en cliente.

---

## Tipos de notificacion

| Tipo | Descripcion | Audiencia |
|------|-------------|-----------|
| `membership_expiring` | Membresia por vencer | admin, receptionist, member |
| `membership_expired` | Membresia vencida | admin, receptionist, member |
| `low_stock` | Inventario bajo | admin, receptionist |
| `recurring_expense_pending` | Gasto recurrente pendiente | admin |
| `class_reminder` | Recordatorio de clase | member |
| `payment_registered` | Confirmacion de cobro | admin, receptionist |

---

## Canales

1. In-app (prioritario en fase actual).
2. Push (fase incremental por plataforma).
3. Email/SMS (solo si se habilita explicitamente).

---

## Reglas de negocio

1. Notificaciones criticas deben generarse desde backend cuando el modulo ya este migrado.
2. No duplicar una notificacion activa para el mismo evento y usuario.
3. Toda notificacion debe incluir `type`, `entityId`, `createdAt`, `status`.
4. `status` permitido: `pending`, `sent`, `read`, `failed`.

---

## Priorizacion

1. Prioridad alta: `membership_expiring`, `membership_expired`, `low_stock`.
2. Prioridad media: `recurring_expense_pending`, `class_reminder`.
3. Prioridad baja: informativas no operativas.

---

## Reglas de acceso

1. Solo `admin` configura politicas globales de notificacion.
2. `member` solo puede gestionar preferencias personales permitidas.
3. `receptionist` no puede cambiar politicas globales.

---

## Errores esperados

| Caso | Codigo |
|------|--------|
| Configuracion invalida | `400 VALIDATION_ERROR` |
| Sin permisos | `403 FORBIDDEN` |
| Evento duplicado (idempotencia) | `409 CONFLICT` |

