# Contratos REST (API v1)

> Estandar canonico de contratos para iOS, Android y Web.

---

## Convenciones

- Versionado por URL: `/api/v1/...`
- JSON como formato unico
- Fechas en ISO-8601 UTC
- Paginacion obligatoria (`page` + `limit` o cursor)
- `requestId` por request para trazabilidad

---

## Headers obligatorios

| Header | Uso |
|--------|-----|
| `Authorization: Bearer <token>` | Endpoints protegidos |
| `X-Request-Id` | Correlacion de logs (si no viene, backend lo genera) |
| `Idempotency-Key` | Obligatorio en `POST` de cobros/check-ins/asignaciones |

---

## Estructura de respuesta

### Exito

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "requestId": "req_123"
  }
}
```

### Error

```json
{
  "ok": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "No tienes permisos para esta accion.",
    "details": {}
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

---

## Codigos de error canonicos

| HTTP | code | Uso |
|------|------|-----|
| 400 | `VALIDATION_ERROR` | Datos invalidos |
| 401 | `UNAUTHORIZED` | Token invalido/ausente |
| 403 | `FORBIDDEN` | Sin permisos por rol |
| 404 | `NOT_FOUND` | Recurso no existe |
| 409 | `CONFLICT` | Estado/identidad/idempotencia conflictiva |
| 422 | `BUSINESS_RULE_VIOLATION` | Regla de negocio incumplida |
| 429 | `RATE_LIMITED` | Limite de peticiones |
| 500 | `INTERNAL_ERROR` | Error inesperado |

---

## Contratos minimos por modulo

### Auth bridge

- `POST /api/v1/auth/verify-token`
- `GET /api/v1/auth/me`

`POST /auth/verify-token` response `data`:

```json
{
  "user": {
    "id": "usr_123",
    "firebaseUid": "uid_abc",
    "email": "user@sajarubox.com",
    "role": "member",
    "linkedMemberId": null
  }
}
```

### Members

- `GET /api/v1/members?page=1&limit=20`
- `GET /api/v1/members/:id`
- `POST /api/v1/members`
- `PATCH /api/v1/members/:id`

`POST /members` request:

```json
{
  "firstName": "Juan",
  "paternalLastName": "Perez",
  "maternalLastName": "Lopez",
  "phone": "5512345678",
  "email": "juan@example.com",
  "birthDate": "2000-01-01T00:00:00Z"
}
```

### Membership Plans / Assignments

- `GET /api/v1/membership-plans`
- `POST /api/v1/membership-plans`
- `POST /api/v1/membership-assignments` (`Idempotency-Key` obligatorio)
- `POST /api/v1/membership-assignments/:id/renew` (`Idempotency-Key` obligatorio)

`POST /membership-assignments` request:

```json
{
  "memberId": "mem_123",
  "planId": "plan_456",
  "startDate": "2026-03-07T00:00:00Z",
  "payment": {
    "method": "cash",
    "amount": 350.0,
    "currency": "MXN"
  }
}
```

### Payments / Check-ins

- `POST /api/v1/payments` (`Idempotency-Key` obligatorio)
- `GET /api/v1/payments`
- `POST /api/v1/checkins` (`Idempotency-Key` obligatorio)
- `GET /api/v1/checkins`

`POST /checkins` request:

```json
{
  "memberId": "mem_123",
  "type": "member",
  "notes": "Entrada recepcion"
}
```

### Classes / Attendance

- `GET /api/v1/classes`
- `POST /api/v1/classes`
- `POST /api/v1/classes/:id/attendance`
- `GET /api/v1/classes/:id/attendance`

---

## RBAC minimo por endpoint

- Solo `admin` y `receptionist`: pagos, check-ins, membresias, inventario.
- Solo `admin`: cambios de rol y configuracion sensible.
- `trainer`: operaciones permitidas de clases/rutinas definidas por modulo.
- `member`: solo endpoints de autoservicio.

La matriz completa vive en backend y debe testearse con pruebas de autorizacion.

---

## Reglas de evolucion

1. Cambios incompatibles requieren `/api/v2`.
2. Campos nuevos inician como opcionales.
3. No eliminar campos sin ventana de deprecacion documentada.
4. Publicar changelog de contratos por version.
