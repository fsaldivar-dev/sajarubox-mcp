# SajaruBox — Roles y Permisos

> Fuente de verdad para roles en todas las plataformas.

---

## Roles disponibles

| Rol | Valor en Firestore | Descripción |
|-----|--------------------|-------------|
| `admin` | `"admin"` | Dueño/gestor del gym |
| `member` | `"member"` | Cliente del gym |

> ⚠️ Valores anteriores deprecados (NO usar): `owner`, `staff`

---

## Lógica de asignación

- **Primer usuario registrado** → `admin`
- **Todos los demás** → `member`
- El rol se guarda en `users/{uid}.role`

---

## Permisos por colección

### `users`
| Operación | admin | member |
|-----------|-------|--------|
| Leer su propio perfil | ✅ | ✅ |
| Leer todos los perfiles | ✅ | ❌ |
| Editar su propio perfil | ✅ | ✅ |
| Editar perfil de otro usuario | ✅ | ❌ |

### `classes`
| Operación | admin | member |
|-----------|-------|--------|
| Leer clases | ✅ | ✅ |
| Crear clase | ✅ | ❌ |
| Editar/eliminar clase | ✅ | ❌ |

### `classBookings`
| Operación | admin | member |
|-----------|-------|--------|
| Leer todas las reservas | ✅ | ❌ |
| Leer sus propias reservas | ✅ | ✅ |
| Crear reserva (cualquiera) | ✅ | ❌ |
| Crear su propia reserva | ✅ | ✅ |
| Actualizar cualquier reserva | ✅ | ❌ |
| Actualizar su propia reserva | ✅ | ✅ |
| Eliminar reservas | ✅ | ❌ |

### `memberships`
| Operación | admin | member |
|-----------|-------|--------|
| Leer todas las membresías | ✅ | ❌ |
| Leer su propia membresía | ✅ | ✅ |
| Crear/editar/eliminar | ✅ | ❌ |

---

## Permisos por plataforma

| Plataforma | Roles que puede usar | Propósito |
|------------|---------------------|-----------|
| **Android** | `member` (principalmente) | App del cliente |
| **iOS** | `admin` (principalmente) | App del gestor |
| **Web** | Público + `member` + `admin` | Landing + autoservicio |
