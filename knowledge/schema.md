# SajaruBox — Database Schema (Firestore)

> Fuente de verdad compartida entre Android, iOS y Web.
> Cualquier cambio de esquema debe actualizarse aqui ANTES de implementarse en cualquier plataforma.

---

## Colecciones activas

| Coleccion | Documento ID | Descripcion | Plataforma |
|-----------|-------------|-------------|------------|
| `users` | Firebase Auth UID | Usuarios de la app | Android, iOS |
| `members` | UUID generado | Miembros del gimnasio (no requieren cuenta) | iOS |
| `membership_plans` | UUID generado | Planes de membresia configurables | iOS |
| `user_emails` | Email normalizado | Indice email → userId para sync multi-proveedor | iOS |
| `app_config` | `"setup"` | Configuracion global (admin setup) | iOS |
| `classes` | Auto-generado | Clases del gimnasio | Android |
| `classBookings` | Auto-generado | Reservas de clases | Android |
| `classAttendance` | Auto-generado | Asistencia a clases | Android |

---

## `users/{uid}`

El UID de Firebase Auth es el ID del documento. Cada proveedor de auth genera un UID diferente, por lo que un mismo usuario puede tener multiples documentos si usa varios proveedores (ver `user_emails`).

### Campos compartidos (Android + iOS)

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | String | Si | UID de Firebase Auth |
| `email` | String | Si | Email del usuario |
| `role` | String | Si | `admin` o `member` |
| `createdAt` | Timestamp | Si | Fecha de creacion |
| `updatedAt` | Timestamp | Si | Fecha de ultima actualizacion |

### Campos iOS

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `fullName` | String | Si | Nombre completo |
| `phone` | String | No | Telefono |
| `isActive` | Boolean | Si | Si el usuario esta activo |
| `photoURL` | String | No | URL de foto de perfil |
| `linkedMemberId` | String | No | FK a `members/{id}` si tiene inscripcion en el gym |
| `onboardingCompleted` | Boolean | Si | Si completo el onboarding (default: false) |

### Campos Android (onboarding)

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `nombre` | String | Si | Nombre |
| `primerApellido` | String | Si | Primer apellido |
| `segundoApellido` | String | No | Segundo apellido |
| `telefono` | String | No | Telefono |
| `telefonoEmergencia` | String | No | Telefono de emergencia |
| `fechaNacimiento` | Timestamp | No | Fecha de nacimiento |
| `enfermedades` | String | No | Enfermedades |
| `lesiones` | String | No | Lesiones |
| `otros` | String | No | Otros datos de salud |
| `activo` | Boolean | Si | Si el usuario esta activo |
| `onboardingCompleted` | Boolean | Si | Si completo el onboarding |
| `isMinor` | Boolean | No | Si es menor de edad |

### Campos Android (tutor, solo si isMinor=true)

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `guardianNombre` | String | Nombre del tutor |
| `guardianPrimerApellido` | String | Primer apellido del tutor |
| `guardianSegundoApellido` | String | Segundo apellido del tutor |
| `guardianTelefono` | String | Telefono del tutor |
| `guardianEmail` | String | Email del tutor |
| `guardianRelacion` | String | `Padre`, `Madre` o `Tutor Legal` |

### Campos pendientes de migracion

| Campo | Tipo | Nota |
|-------|------|------|
| `familyGroupId` | String | Pendiente — se gestiona en `members`, no en `users` |

---

## `members/{memberId}`

Miembros del gimnasio. No requieren cuenta en la app. Pueden ser creados por el admin (registro manual) o por el sistema (tras onboarding de auto-registro). Ver `business-rules/04-member-registration.md`.

### Datos personales

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | String | Si | UUID generado |
| `firstName` | String | Si | Nombre |
| `paternalLastName` | String | Si | Primer apellido |
| `maternalLastName` | String | No | Segundo apellido |
| `phone` | String | No | Telefono (normalizado: solo digitos) |
| `emergencyPhone` | String | No | Telefono de emergencia |
| `diseases` | String | No | Enfermedades |
| `injuries` | String | No | Lesiones |
| `otherNotes` | String | No | Otros datos |
| `birthDate` | Timestamp | No | Fecha de nacimiento |
| `guardianInfo` | String | No | Datos del tutor (menores) |

### Membresia (snapshot inmutable)

Ver `business-rules/07-membership-assignments.md` para flujos completos.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `membershipPlanId` | String | No | FK a `membership_plans` (referencia al plan original) |
| `membershipStatus` | String | Si | `active`, `expired`, `suspended`, `cancelled`, `pending` |
| `membershipStartDate` | Timestamp | No | Inicio del periodo de membresia |
| `membershipEndDate` | Timestamp | No | Fin del periodo (null si `visit_based` puro) |
| `remainingVisits` | Int | No | Visitas restantes (solo `visit_based` y `mixed`) |
| `membershipPlanSnapshot` | Map | No | Snapshot inmutable del plan al momento de asignar |

#### Estructura de `membershipPlanSnapshot`

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `planName` | String | Nombre del plan al asignar |
| `planType` | String | `time_based`, `visit_based`, `mixed` |
| `planPrice` | Double | Precio al asignar |
| `planCurrency` | String | Moneda al asignar |
| `durationInDays` | Int? | Duracion contratada |
| `totalVisits` | Int? | Visitas contratadas |
| `maxMembers` | Int | Maximo de miembros del plan |
| `assignedAt` | Timestamp | Fecha de asignacion |
| `assignedBy` | String | UID del admin que asigno |

### Vinculacion y meta

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `linkedUserId` | String | No | FK a `users/{uid}` si tiene cuenta en la app |
| `registeredBy` | String | Si | `"self"` (auto-registro) o `"admin:{uid}"` (manual) |
| `familyGroupId` | String | No | ID compartido entre miembros de un grupo familiar |
| `registrationDate` | Timestamp | Si | Fecha de inscripcion |
| `isActive` | Boolean | Si | Si el miembro esta activo |
| `createdAt` | Timestamp | Si | Fecha de creacion |
| `updatedAt` | Timestamp | Si | Fecha de actualizacion |

---

## `membership_plans/{planId}`

Catalogo de planes de membresia configurables por el admin. Ver `business-rules/06-membership-plans.md` para tipos y reglas.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | String | Si | UUID generado |
| `name` | String | Si | Nombre del plan (ej: "Mensualidad") |
| `type` | String | Si | `time_based`, `visit_based`, `mixed` |
| `price` | Double | Si | Precio del plan |
| `currency` | String | Si | Codigo ISO 4217 (default: `MXN`) |
| `durationInDays` | Int | Condicional | Requerido si `time_based` o `mixed` |
| `totalVisits` | Int | Condicional | Requerido si `visit_based` o `mixed` |
| `maxMembers` | Int | Si | 1 = individual, >1 = familiar |
| `description` | String | No | Descripcion del plan |
| `isActive` | Boolean | Si | Si el plan esta disponible para nuevas asignaciones |
| `sortOrder` | Int | Si | Orden de visualizacion (ascendente) |
| `createdAt` | Timestamp | Si | Fecha de creacion |
| `updatedAt` | Timestamp | Si | Fecha de actualizacion |

---

## `user_emails/{email}`

Indice para sincronizacion multi-proveedor. El ID del documento es el email normalizado (minusculas, sin espacios). Solo iOS lo gestiona.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `primaryUserId` | String | Si | UID del primer proveedor usado |
| `email` | String | Si | Email normalizado |
| `createdAt` | Timestamp | Si | Fecha de creacion |

---

## `app_config/setup`

Documento unico que indica si ya se configuro el primer admin. Solo iOS lo gestiona.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `adminUserId` | String | Si | UID del usuario admin |
| `createdAt` | Timestamp | Si | Fecha de creacion |

---

## `classes/{classId}`

Clases del gimnasio. Solo Android las gestiona.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | String | Si | Auto-generado |
| `gymId` | String | Si | Siempre `"sajarubox"` |
| `fecha` | Timestamp | Si | Fecha de la clase |
| `horaInicio` | String | Si | Formato `HH:mm` |
| `duracionMin` | Int | Si | Duracion en minutos (default: 60) |
| `nombre` | String | Si | Nombre de la clase |
| `capacidadMax` | Int | Si | Maximo de alumnos (default: 14) |
| `createdAt` | Timestamp | Si | Fecha de creacion |
| `updatedAt` | Timestamp | Si | Fecha de actualizacion |

---

## `classBookings/{bookingId}`

Reservas de clases. Solo Android las gestiona.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | String | Si | Auto-generado |
| `classId` | String | Si | FK a `classes` |
| `userId` | String | Si | FK a `users` |
| `gymId` | String | Si | Siempre `"sajarubox"` |
| `estado` | String | Si | `activa` o `cancelada` |
| `createdAt` | Timestamp | Si | Fecha de creacion |

---

## `classAttendance/{attendanceId}`

Asistencia a clases. Solo Android las gestiona.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | String | Si | Auto-generado |
| `classId` | String | Si | FK a `classes` |
| `userId` | String | Si | FK a `users` |
| `asistio` | Boolean | Si | Si asistio |
| `timestamp` | Timestamp | Si | Fecha/hora del registro |

---

## Reglas para cambios de esquema

1. **Nunca renombrar un campo existente** — agrega uno nuevo y migra gradualmente
2. **Nunca cambiar el tipo de un campo** — puede romper la app que no se actualizo
3. **Documentar aqui antes de implementar** en cualquier plataforma
4. **Los campos nuevos deben ser opcionales** para no romper documentos existentes
5. **Soft delete**: preferir `isActive = false` en vez de eliminar documentos
6. **Timestamps**: usar `FieldValue.serverTimestamp()` para `createdAt` y `updatedAt`
