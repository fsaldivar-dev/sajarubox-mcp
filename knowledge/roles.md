# SajaruBox — Roles y Permisos

> Fuente de verdad para roles en todas las plataformas.

---

## Roles disponibles

| Rol | Valor en Firestore | Descripcion |
|-----|--------------------|-------------|
| `admin` | `"admin"` | Dueno/gestor del gym. Acceso total |
| `receptionist` | `"receptionist"` | Recepcionista. Gestion operativa sin configuracion |
| `trainer` | `"trainer"` | Entrenador. Acceso a miembros y clases |
| `member` | `"member"` | Cliente del gym |
| `guest` | `"guest"` | Invitado temporal |
| `visitor` | `"visitor"` | Visitante (acceso minimo) |

> Valores anteriores deprecados (NO usar): `owner`, `staff`

---

## Logica de asignacion

- **Primer usuario registrado** → `admin` (se marca en `app_config/setup`)
- **Todos los demas** → `member` (por defecto)
- **Pre-registro por admin** → El admin puede registrar staff con rol `receptionist` o `trainer` desde el modulo de Staff
- El rol se guarda en `users/{uid}.role`
- Solo un `admin` puede cambiar roles de otros usuarios

---

## Permisos por modulo (iOS)

### Tabs visibles en HomeView

| Tab | admin | receptionist | trainer | member |
|-----|:-----:|:------------:|:-------:|:------:|
| Miembros | Si | Si | Si | No |
| Clases | Si | Si | Si | No |
| Membresias | Si | Si | No | No |
| Inventario | Si | Si | No | No |
| Reportes | Si | Si | No | No |
| Perfil | Si | Si | Si | Si |
| Staff | Si | No | No | No |

### Operaciones por coleccion

#### `users`

| Operacion | admin | receptionist | trainer | member |
|-----------|:-----:|:------------:|:-------:|:------:|
| Leer su propio perfil | Si | Si | Si | Si |
| Leer todos los perfiles | Si | Si | No | No |
| Editar su propio perfil | Si | Si | Si | Si |
| Editar perfil de otro | Si | No | No | No |
| Cambiar rol de otro | Si | No | No | No |
| Registrar nuevo staff | Si | No | No | No |
| Activar/desactivar usuario | Si | No | No | No |

#### `members`

| Operacion | admin | receptionist | trainer | member |
|-----------|:-----:|:------------:|:-------:|:------:|
| Ver todos los miembros | Si | Si | Si (lectura) | No |
| Crear miembro | Si | Si | No | No |
| Editar miembro | Si | Si | No | No |
| Asignar membresia | Si | Si | No | No |
| Registrar check-in | Si | Si | No | No |

#### `membership_plans`

| Operacion | admin | receptionist | trainer | member |
|-----------|:-----:|:------------:|:-------:|:------:|
| Ver planes | Si | Si | No | No |
| Crear/editar plan | Si | No | No | No |
| Desactivar plan | Si | No | No | No |

#### `classes`

| Operacion | admin | receptionist | trainer | member |
|-----------|:-----:|:------------:|:-------:|:------:|
| Leer clases | Si | Si | Si | Si |
| Crear clase | Si | Si | No | No |
| Editar/eliminar clase | Si | Si | No | No |

#### `classBookings`

| Operacion | admin | receptionist | trainer | member |
|-----------|:-----:|:------------:|:-------:|:------:|
| Leer todas las reservas | Si | Si | Si | No |
| Leer sus propias reservas | Si | Si | Si | Si |
| Crear reserva (cualquiera) | Si | Si | No | No |
| Crear su propia reserva | Si | Si | Si | Si |
| Cancelar reservas | Si | Si | No | No |

#### `products` (inventario)

| Operacion | admin | receptionist | trainer | member |
|-----------|:-----:|:------------:|:-------:|:------:|
| Ver productos | Si | Si | No | No |
| Crear/editar producto | Si | Si | No | No |
| Desactivar producto | Si | No | No | No |

#### `payments`

| Operacion | admin | receptionist | trainer | member |
|-----------|:-----:|:------------:|:-------:|:------:|
| Ver todos los pagos | Si | Si | No | No |
| Registrar cobro | Si | Si | No | No |
| Ver reportes | Si | Si | No | No |

---

## Permisos por plataforma

| Plataforma | Roles que puede usar | Proposito |
|------------|---------------------|-----------|
| **Android** | `member` (principalmente) | App del cliente (clases, reservas) |
| **iOS** | `admin`, `receptionist`, `trainer`, `member` | App de gestion completa |
| **Web** | Publico + `member` + `admin` | Landing + autoservicio |

---

## Gestion de staff (iOS)

El admin puede gestionar el staff desde el modulo Staff en iOS:

### Registrar nuevo staff
1. Admin llena formulario: nombre, email, telefono, rol (receptionist/trainer)
2. Se crea cuenta Firebase Auth via instancia secundaria (no cierra sesion del admin)
3. Se crea documento `users/{uid}` con el rol asignado
4. Se registra `user_emails/{email}` para sync multi-proveedor
5. Se envia email de reset de contrasena para que el staff establezca su acceso

### Promover usuario existente
1. Admin busca entre usuarios registrados que no son staff
2. Selecciona el usuario y el nuevo rol
3. Se actualiza el documento `users/{uid}` con el nuevo rol

### Cambiar rol
1. Admin abre la ficha del usuario
2. Selecciona nuevo rol de la lista (admin, receptionist, trainer, member)
3. Confirma el cambio
4. Restriccion: un admin NO puede cambiar su propio rol
