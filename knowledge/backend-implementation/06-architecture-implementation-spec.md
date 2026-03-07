# Especificacion de Implementacion de Arquitectura Backend

> Documento ejecutable para implementar el backend oficial SajaruBox.
> Alcance: Node.js API + MySQL + Firebase Auth bridge.

---

## 1) Objetivo

Construir un backend REST versionado (`/api/v1`) donde:

1. MySQL sea la fuente de verdad operativa.
2. Firebase solo autentique (ID token).
3. Toda autorizacion y logica de negocio viva en servidor.

---

## 2) Stack y estandar base

- Runtime: Node.js LTS
- Framework: Express
- DB: MySQL 8+
- Query layer: SQL tipado (ORM o query builder)
- Validacion: esquemas por endpoint
- Auth: Firebase Admin SDK
- Logs: JSON estructurado

---

## 3) Estructura canonica de codigo

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

Regla:

- `routes -> services -> repositories`
- Sin acceso a DB desde controllers.

---

## 4) Middlewares obligatorios (orden)

1. `requestId`
2. `securityHeaders` / CORS
3. `rateLimit`
4. `authGuard` (Firebase token)
5. `userResolver` (firebaseUid -> user interno)
6. `rbacGuard`
7. Handler de negocio
8. `errorHandler` canonico

---

## 5) Contrato de errores

Formato unico:

```json
{
  "ok": false,
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "La membresia no esta activa.",
    "details": {}
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

Codigos permitidos:

- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `BUSINESS_RULE_VIOLATION`
- `RATE_LIMITED`
- `INTERNAL_ERROR`

---

## 6) Operaciones transaccionales obligatorias

Implementar con transaccion SQL atomica:

1. Asignacion de membresia + payment + snapshot.
2. Renovacion + payment.
3. Check-in + decremento de visitas + expiracion.
4. Venta de producto + decremento de stock.

Regla: si una parte falla, `rollback` total.

---

## 7) Idempotencia

Para `POST` sensibles:

- `POST /payments`
- `POST /checkins`
- `POST /membership-assignments`
- `POST /membership-assignments/:id/renew`

Implementacion minima:

1. Requerir header `Idempotency-Key`.
2. Guardar key + hash payload + respuesta.
3. Repeticion de misma key retorna misma respuesta.
4. Key con payload distinto retorna `409 CONFLICT`.

---

## 8) Seguridad

1. Validar token Firebase por request protegida.
2. Autorizar por rol en backend (RBAC).
3. No loggear secretos ni bearer token.
4. CORS restrictivo por entorno.
5. Secretos solo en variables de entorno.

---

## 9) Modelo de datos minimo (MVP)

Tablas core:

- `users`
- `members`
- `membership_plans`
- `membership_assignments`
- `payments`
- `check_ins`
- `products`
- `classes`
- `class_attendance`
- `audit_events`
- `idempotency_keys`

Campos de auditoria:

- `createdAt`, `updatedAt`, `createdBy`, `updatedBy`

---

## 10) Fases de implementacion

### Fase A - Plataforma base

1. Bootstrap server
2. Healthcheck
3. Auth bridge (`verify-token`, `me`)
4. Observabilidad minima

### Fase B - Dominio core

1. Members CRUD
2. Membership plans
3. Membership assignments (transaccional)
4. Payments (transaccional)
5. Check-ins (transaccional)

### Fase C - Operacion extendida

1. Classes + attendance
2. Reports read-only
3. Hardening de performance y costos

---

## 11) Definition of Done por endpoint

Un endpoint esta terminado si cumple:

1. Contrato request/response documentado.
2. Validacion de entrada activa.
3. RBAC aplicado en backend.
4. Pruebas unit + integracion pasando.
5. Logs con `requestId`.
6. Manejo de errores canonico.

---

## 12) Checklist de salida a produccion

1. Migraciones SQL aplicadas y versionadas.
2. SLO basico cumplido en staging.
3. Alertas activas (error rate, p95, recursos).
4. Backup/restore probado.
5. Runbook de rollback listo.
