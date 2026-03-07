# Backend: Seguridad y RBAC

> Definicion de arquitectura de seguridad para API REST.

---

## Modelo de autenticacion

1. Firebase Auth autentica usuario.
2. Cliente envia `Authorization: Bearer <idToken>`.
3. Backend valida token en cada request protegida.

---

## Modelo de autorizacion

1. Backend resuelve usuario interno por `firebaseUid`.
2. Backend aplica RBAC por endpoint/accion.
3. UI puede ocultar opciones, pero la seguridad real esta en servidor.

---

## Roles base

- `admin`
- `receptionist`
- `trainer`
- `member`

Regla: permisos se definen por endpoint y no por plataforma cliente.

---

## Middlewares (orden canonico)

1. `requestId`
2. `authGuard`
3. `userResolver`
4. `rbacGuard`
5. handler de negocio

---

## Reglas de seguridad obligatorias

1. CORS restrictivo por entorno.
2. Rate limit por IP/usuario.
3. No loggear secretos ni tokens completos.
4. Respuestas de error seguras (sin fuga de datos internos).
