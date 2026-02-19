# Reglas de negocio: Clases del gimnasio

> Reglas agnosticas de plataforma. Aplican a Android, iOS y cualquier cliente futuro.

---

## Conceptos

Una **clase** es una sesion programada del gimnasio (ej: "Boxing", "Yoga", "CrossFit") con fecha, hora, duracion y capacidad maxima.

Una **reserva** (booking) indica que un usuario separo su lugar en una clase.

Una **asistencia** (attendance) registra si un usuario/miembro efectivamente asistio a la clase.

---

## Reglas de clases

### Campos obligatorios

| Campo | Regla |
|-------|-------|
| Nombre | No vacio, max 100 caracteres |
| Fecha | Fecha valida |
| Hora de inicio | Formato HH:mm |
| Duracion | Mayor a 0 minutos |
| Capacidad | Mayor a 0 |
| Gym ID | Siempre `"sajarubox"` |

### Recurrencia

- La recurrencia es **logica de UI**, no de esquema
- El admin selecciona: nombre, hora, duracion, capacidad, dias de la semana (L-D), rango de fechas (inicio-fin)
- El sistema genera **un documento individual por cada ocurrencia** en la coleccion `classes`
- Todas las clases del lote comparten un `recurrenceGroupId` (UUID) para agruparlas
- Cada clase generada es independiente: se puede editar o eliminar individualmente
- Eliminar el grupo (por `recurrenceGroupId`) desactiva todas las clases del lote

### Soft delete

- Las clases **nunca se eliminan** de Firestore
- Eliminar = marcar `isActive = false` + actualizar `updatedAt`
- Las consultas filtran por `isActive = true` (o por ausencia del campo para compatibilidad con Android)

### Permisos

| Accion | Roles permitidos |
|--------|-----------------|
| Ver clases | Todos |
| Crear clase | admin, receptionist |
| Editar clase | admin, receptionist |
| Eliminar clase | admin, receptionist |
| Ver asistencia | admin, receptionist |

---

## Reglas de reservas (bookings)

- Un usuario puede reservar lugar en una clase
- El estado es `activa` o `cancelada`
- La reserva NO garantiza asistencia (solo separa lugar)
- No se puede reservar si la clase esta llena (reservas activas >= capacidad maxima)
- Un usuario solo puede tener **una reserva activa** por clase

---

## Reglas de asistencia (attendance)

- Se registra despues de que la clase ocurre
- Indica si el usuario/miembro **asistio o no**
- `userId` identifica usuarios con cuenta en la app
- `memberId` identifica miembros del gym que no tienen cuenta (campo opcional)
- Un registro de asistencia es **inmutable**: no se modifica despues de crearse

---

## Flujo tipico

```
1. Admin crea clase (individual o recurrente)
2. Usuarios reservan lugar (booking con estado "activa")
3. Dia de la clase: se toma asistencia
4. Se crean registros de attendance (asistio = true/false)
```

---

## Compatibilidad cross-platform

- Los campos en Firestore usan **nombres en español** (`nombre`, `fecha`, `horaInicio`, etc.) por compatibilidad con Android
- iOS mapea estos campos internamente a nombres en ingles (`name`, `date`, `startTime`, etc.)
- iOS agrega campos opcionales (`description`, `isActive`, `recurrenceGroupId`) que Android ignora
- Ambas plataformas leen y escriben la misma coleccion
