# Roles de usuario

> Define los roles disponibles en el sistema, sus permisos y como se asignan.

---

## Roles disponibles

| Rol | Valor en base de datos | Descripcion |
|-----|------------------------|-------------|
| Admin | `admin` | Dueno o gestor del gimnasio. Acceso total. |
| Recepcionista | `receptionist` | Personal de recepcion. Gestiona miembros y pagos. |
| Entrenador | `trainer` | Entrenador. Gestiona rutinas. |
| Miembro | `member` | Cliente del gimnasio. Acceso basico. |
| Invitado | `guest` | Visitante con acceso temporal. |
| Visitante | `visitor` | Sin cuenta. Solo lectura publica. |

> Actualmente solo `admin` y `member` estan implementados. Los demas son para fases futuras.

---

## Asignacion de rol

- **Primer usuario registrado** en la base de datos se convierte automaticamente en `admin`
- **Todos los demas usuarios** se crean como `member` por defecto
- Solo un admin puede cambiar el rol de otro usuario

La deteccion del primer usuario se hace verificando el documento `app_config/setup`. Si ese documento no existe, el siguiente usuario que se registre sera admin.

---

## Permisos por plataforma

| Plataforma | Roles principales | Proposito |
|------------|-------------------|-----------|
| Android | `member` | App del cliente |
| iOS | `admin`, `receptionist` | App del gestor |
| Web | Publico + todos los roles | Landing + autoservicio |

---

## Funcionalidad por rol (iOS)

### Admin y Recepcionista
- Tab de Miembros: ver, crear, editar, desactivar miembros
- Tab de Membresias: ver, crear, editar, desactivar planes
- Tab de Ventas: (pendiente) productos e inventario
- Tab de Perfil: ver datos propios, cerrar sesion
- Tab de Configuracion: (pendiente) gestion de usuarios y roles

### Miembro
- Tab de Perfil: ver datos propios, cerrar sesion

---

## Permisos por coleccion

### `users`
| Operacion | admin | member |
|-----------|-------|--------|
| Leer su propio perfil | Si | Si |
| Leer todos los perfiles | Si | No |
| Editar su propio perfil | Si | Si |
| Editar perfil de otro | Si | No |
| Cambiar rol de otro | Si | No |

### `members`
| Operacion | admin | member |
|-----------|-------|--------|
| Ver lista de miembros | Si | No |
| Crear miembro | Si | No |
| Editar miembro | Si | No |
| Desactivar miembro | Si | No |

### `membership_plans`
| Operacion | admin | member |
|-----------|-------|--------|
| Ver planes activos | Si | Si |
| Ver todos los planes | Si | No |
| Crear plan | Si | No |
| Editar plan | Si | No |
| Desactivar plan | Si | No |
