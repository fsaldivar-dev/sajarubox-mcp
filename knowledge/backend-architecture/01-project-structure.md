# Arquitectura Backend (Node.js + MySQL)

> Definicion tecnica canonica para implementacion del backend SajaruBox.

---

## Objetivo

Estandarizar estructura de codigo, limites de modulos y reglas de dependencia antes de implementar servicios REST.

---

## Estructura base recomendada

```text
src/
  app/
    server.ts
    routes.ts
  modules/
    auth/
    users/
    members/
    memberships/
    payments/
    checkins/
    classes/
    reports/
  shared/
    db/
    errors/
    middleware/
    observability/
    rbac/
    validation/
  infra/
    mysql/
    firebase-admin/
```

---

## Capas y responsabilidad

| Capa | Responsabilidad | No debe hacer |
|------|-----------------|---------------|
| Route/Controller | Parseo HTTP, validacion basica, response | Reglas de negocio complejas |
| Service | Reglas de negocio y casos de uso | SQL crudo repetitivo |
| Repository | Acceso a datos MySQL | Reglas de autorizacion |
| Middleware | Auth, RBAC, requestId, rate limit | Logica de dominio |

---

## Reglas de dependencia

1. `routes -> services -> repositories`.
2. `services` pueden usar multiples `repositories`.
3. `repositories` no dependen de `services`.
4. `shared` no depende de `modules`.
5. Dependencias entre modulos solo via interfaces explicitas.

---

## Operaciones transaccionales obligatorias

Usar transacciones SQL en:

1. Asignacion de membresia + creacion de pago + snapshot.
2. Renovacion de membresia + pago.
3. Check-in con decremento de visitas y expiracion.
4. Venta de producto con decremento de stock.

Regla: confirmar todo o revertir todo (`commit/rollback` atomico).

---

## Idempotencia

Para `POST` sensibles (`payments`, `checkins`, `membership-assignments`):

1. Requerir `Idempotency-Key`.
2. Guardar hash de payload + resultado.
3. Si llega la misma key, devolver misma respuesta sin duplicar evento.

---

## Modelo de errores

- Errores de dominio -> `BUSINESS_RULE_VIOLATION` (`422`).
- Errores de autorizacion -> `401/403`.
- Errores de concurrencia -> `409`.
- Nunca exponer stacktrace al cliente.

---

## Auditoria

Eventos obligatorios:

- cambios de rol
- asignacion/renovacion/cancelacion de membresia
- cobros y reversiones
- ajustes manuales de inventario

Formato minimo:

- `requestId`
- `actorUserId`
- `action`
- `entityType`
- `entityId`
- `timestamp`
- `before`/`after` (cuando aplique)

---

## Definition of Ready para implementar modulo

1. Contrato REST aprobado.
2. Reglas RBAC aprobadas.
3. Tablas e indices definidos.
4. Casos de error y idempotencia definidos.
5. Pruebas de modulo definidas.
