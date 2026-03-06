# Contratos REST (API v1)

> Estandar de contratos para iOS, Android y Web.

---

## Convenciones

- Versionado por URL: `/api/v1/...`
- JSON como formato unico de request/response
- Fechas en ISO-8601 UTC
- Paginacion por `page` + `limit` o cursor en endpoints de listas

---

## Estructura de respuesta exitosa

```json
{
  "ok": true,
  "data": {},
  "meta": {}
}
```

## Estructura de error

```json
{
  "ok": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "No tienes permisos para esta accion.",
    "details": {}
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
| 409 | `CONFLICT` | Estado/identidad en conflicto |
| 429 | `RATE_LIMITED` | Limite de peticiones |
| 500 | `INTERNAL_ERROR` | Error inesperado |

---

## Endpoints minimos por modulo

### Auth bridge

- `POST /api/v1/auth/verify-token`
- `GET /api/v1/auth/me`

### Members

- `GET /api/v1/members`
- `GET /api/v1/members/:id`
- `POST /api/v1/members`
- `PATCH /api/v1/members/:id`

### Membership Plans / Assignments

- `GET /api/v1/membership-plans`
- `POST /api/v1/membership-plans`
- `POST /api/v1/membership-assignments`
- `POST /api/v1/membership-assignments/:id/renew`

### Payments / Check-ins

- `POST /api/v1/payments`
- `GET /api/v1/payments`
- `POST /api/v1/checkins`
- `GET /api/v1/checkins`

### Classes / Attendance

- `GET /api/v1/classes`
- `POST /api/v1/classes`
- `POST /api/v1/classes/:id/attendance`
- `GET /api/v1/classes/:id/attendance`

---

## Compatibilidad y evolucion

1. Cambios incompatibles requieren `/api/v2`.
2. Campos nuevos deben ser opcionales al inicio.
3. Nunca eliminar campos sin ventana de deprecacion.
