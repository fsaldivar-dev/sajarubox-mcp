# Autenticación con Firebase Auth

> Regla oficial de autenticación para el ecosistema SajaruBox.
> Firebase Auth es la única fuente de identidad. Los roles se resuelven desde Firestore.

---

## Decisión

- Firebase Authentication maneja login, registro y sesión.
- El rol del usuario se almacena y resuelve desde `Firestore/users/{uid}.role`.
- No existe backend REST propio para validación de tokens.

---

## Flujo canónico (iOS)

```
Usuario inicia sesión
  → Firebase Auth (email/Google/Apple)
  → Obtener IDToken + UID
  → Leer users/{uid} en Firestore
  → Resolver rol (admin, receptionist, trainer, member, guest)
  → Aplicar permisos en UI según rol
```

Ver implementación detallada en:
- `knowledge/ios-implementation/02-auth-flow.md`
- `knowledge/ios-implementation/03-session-resolver.md`

---

## Proveedores activos

| Proveedor | Plataforma | Estado |
|-----------|-----------|--------|
| Email/Password | iOS, Android | Activo |
| Google Sign-In | iOS, Android | Activo |
| Apple Sign-In | iOS | Activo |

---

## Mapeo de identidad

| Campo | Origen | Uso |
|------|--------|-----|
| `uid` | Firebase Auth | Document ID en `users/{uid}` |
| `email` | Firebase Auth | Correlación y contacto |
| `role` | Firestore `users.role` | Autorización en UI |
| `linkedMemberId` | Firestore `users.linkedMemberId` | Vinculación user ↔ member |

---

## Roles disponibles

| Rol | Descripción |
|-----|-------------|
| `admin` | Acceso total |
| `receptionist` | Operaciones de recepción (check-in, pagos, miembros) |
| `trainer` | Clases y rutinas |
| `member` | Autoservicio |
| `guest` | Acceso limitado |
| `visitor` | Solo lectura |

Ver permisos detallados en `knowledge/business-rules/02-user-roles.md`.

---

## Reglas de seguridad

1. Nunca confiar en el rol que envía el cliente — siempre leerlo de Firestore.
2. Firebase Security Rules restringen escritura según `request.auth.uid`.
3. El primer usuario registrado se convierte en admin (ver `05-admin-setup.md`).
4. No exponer `users` privados entre cuentas — cada usuario solo puede leer/editar su propio documento.

---

## Manejo de multi-proveedor

Un mismo email puede tener múltiples UIDs si el usuario usó distintos proveedores.
iOS gestiona la colección `user_emails` como índice email → UID primario para resolver
esta colisión. Ver `schema.md` sección `user_emails`.

---

## Migración futura (opcional)

Si se implementa backend REST propio, el flujo cambiaría a:
Firebase IDToken → API → validación server-side → rol desde MySQL.
Mientras eso no ocurra, la resolución de rol es directamente desde Firestore en el cliente.
