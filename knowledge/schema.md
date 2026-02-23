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
| `check_ins` | UUID generado | Registros de asistencia (check-in/check-out) | iOS |
| `payments` | UUID generado | Pagos y cobros (membresias, pases de dia, productos) | iOS |
| `products` | UUID generado | Catalogo de productos y servicios del gimnasio | iOS |
| `classes` | Auto-generado | Clases del gimnasio | Android, iOS |
| `classBookings` | Auto-generado | Reservas de clases | Android, iOS |
| `classAttendance` | Auto-generado | Asistencia a clases | Android, iOS |

---

## `users/{uid}`

El UID de Firebase Auth es el ID del documento. Cada proveedor de auth genera un UID diferente, por lo que un mismo usuario puede tener multiples documentos si usa varios proveedores (ver `user_emails`).

### Esquema unificado (target)

> Este es el esquema target al que ambas plataformas deben converger.
> Los nombres de campo estan en ingles y alineados con la coleccion `members`.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | String | Si | UID de Firebase Auth (es el document ID) |
| `email` | String | Si | Email del usuario |
| `firstName` | String | Si | Nombre(s) de pila |
| `paternalLastName` | String | Si | Apellido paterno |
| `maternalLastName` | String | No | Apellido materno |
| `phone` | String | No | Telefono |
| `role` | String | Si | `admin`, `receptionist`, `trainer`, `member`, `guest`, `visitor` |
| `isActive` | Boolean | Si | Si el usuario esta activo (default: true) |
| `photoURL` | String | No | URL de foto de perfil |
| `linkedMemberId` | String | No | FK a `members/{id}` si tiene inscripcion en el gym |
| `onboardingCompleted` | Boolean | Si | Si completo el onboarding (default: false) |
| `createdAt` | Timestamp | Si | Fecha de creacion |
| `updatedAt` | Timestamp | Si | Fecha de ultima actualizacion |

**Consistencia con `members`**: Los campos de nombre (`firstName`, `paternalLastName`, `maternalLastName`) usan los mismos nombres que la coleccion `members` para facilitar la vinculacion y mantener consistencia en todo el sistema.

**Computed property `fullName`**: El modelo Swift incluye una computed `fullName` que concatena los campos separados. No se persiste en Firestore.

### Campos legacy de Android (pre-migracion)

Android actualmente escribe los siguientes campos en español. Estan documentados aqui para que iOS pueda leerlos hasta que Android migre al esquema unificado.

| Campo legacy | Tipo | Equivalente unificado |
|---|---|---|
| `nombre` | String | → `firstName` |
| `primerApellido` | String | → `paternalLastName` |
| `segundoApellido` | String | → `maternalLastName` |
| `telefono` | String | → `phone` |
| `activo` | Boolean | → `isActive` |
| `telefonoEmergencia` | String | (no tiene equivalente en `users`, se gestiona en `members`) |
| `fechaNacimiento` | Timestamp | (no tiene equivalente en `users`, se gestiona en `members`) |
| `enfermedades` | String | (datos de salud se gestionan en `members`) |
| `lesiones` | String | (datos de salud se gestionan en `members`) |
| `otros` | String | (datos de salud se gestionan en `members`) |
| `isMinor` | Boolean | (se gestiona en `members`) |

### Campos legacy de iOS (pre-migracion)

iOS actualmente escribe `fullName` como campo unico. Esta documentado para que el decoder lo maneje hasta que iOS migre al esquema unificado.

| Campo legacy | Tipo | Equivalente unificado |
|---|---|---|
| `fullName` | String | → `firstName` + `paternalLastName` + `maternalLastName` |

### Campos Android (tutor, solo si isMinor=true)

Estos campos los escribe Android durante el onboarding para menores de edad:

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

### Decodificacion cross-platform (iOS)

`FirestoreUserRepository.decodeUser(from:)` maneja documentos de TODAS las eras del esquema. Usa decodificacion manual (NO `Codable` automatico) con esta prioridad de fallback:

| Campo modelo Swift | Prioridad 1 (unificado) | Prioridad 2 (legacy iOS) | Prioridad 3 (legacy Android) | Default |
|---|---|---|---|---|
| `firstName` | `firstName` | primer token de `fullName` | `nombre` | `""` |
| `paternalLastName` | `paternalLastName` | segundo token de `fullName` | `primerApellido` | `""` |
| `maternalLastName` | `maternalLastName` | tercer token de `fullName` | `segundoApellido` | `nil` |
| `phone` | `phone` | — | `telefono` | `nil` |
| `isActive` | `isActive` | — | `activo` | `true` |

**REGLA CRITICA**: NUNCA usar `document.data(as: User.self)` (Codable automatico) para decodificar documentos de `users`. Siempre usar el metodo `decodeUser(from:)` de `FirestoreUserRepository` que maneja los tres esquemas (unificado, legacy iOS, legacy Android).

### Plan de migracion

1. **iOS**: Actualizar modelo `User` a campos separados. Escribir nuevos documentos con `firstName`/`paternalLastName`/`maternalLastName`. Mantener `decodeUser(from:)` con fallbacks para leer legacy.
2. **Android**: Migrar a escribir campos en ingles (`firstName`, `paternalLastName`, `phone`, `isActive`). Mantener lectura de campos legacy para documentos existentes.
3. **Datos existentes**: No se migran retroactivamente. Los fallbacks del decoder manejan documentos legacy indefinidamente.
4. **Datos de salud/tutor**: Se quedan en la coleccion `members`, no en `users`. Android puede seguir escribiendolos en `users` para su onboarding, pero iOS los lee como `OnboardingData` y los migra a `members` cuando corresponde.

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
| `email` | String | No | Email del miembro (para vinculacion con User y comunicacion) |
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

## `check_ins/{checkInId}`

Registros de asistencia al gimnasio. Cada vez que un miembro hace check-in, se crea un documento. El admin/recepcionista busca al miembro y registra su entrada. Ver `business-rules/07-membership-assignments.md` para el flujo completo de check-in.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | String | Si | UUID generado |
| `memberId` | String | Si | FK a `members/{id}` (siempre requerido) |
| `userId` | String | No | FK a `users/{uid}` (solo si el miembro tiene cuenta en la app) |
| `registeredBy` | String | No | UID del admin/recepcionista que registro el check-in |
| `type` | String | Si | `member`, `guest`, `visitor` |
| `checkInDate` | Timestamp | Si | Fecha/hora de entrada |
| `checkOutDate` | Timestamp | No | Fecha/hora de salida (null si aun esta en el gym) |
| `notes` | String | No | Notas adicionales |
| `createdAt` | Timestamp | Si | Fecha de creacion |
| `updatedAt` | Timestamp | Si | Fecha de actualizacion |

### Reglas de negocio del check-in

1. El check-in **siempre** requiere `memberId` — el admin busca al miembro por nombre/telefono
2. `userId` es opcional — muchos miembros no tienen cuenta en la app
3. El check-in registra asistencia y **descuenta `remainingVisits`** para planes `visit_based` y `mixed`. Si las visitas llegan a 0, la membresia pasa a `expired`
4. Al registrar, se **valida** que la membresia este activa, que tenga visitas restantes (si aplica), y que este dentro del rango de fechas del plan
5. Sirve para control de asistencias (cuantas veces visita el miembro), ingresos por hora, y gestion de visitas

---

## `payments/{paymentId}`

Registros de pagos y cobros. Se crea un documento cada vez que el admin registra un cobro (membresia, pase de dia, producto, servicio). Ver `business-rules/08-payments.md` para flujos completos.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | String | Si | UUID generado |
| `memberId` | String | Si | FK a `members/{id}` (siempre requerido) |
| `userId` | String | No | FK a `users/{uid}` (solo si el miembro tiene cuenta en la app) |
| `type` | String | Si | `membership`, `day_pass`, `product`, `service` |
| `method` | String | Si | `cash`, `card`, `transfer` |
| `status` | String | Si | `pending`, `completed`, `failed`, `refunded`, `cancelled` |
| `amount` | Double | Si | Monto del cobro |
| `currency` | String | Si | Codigo ISO 4217 (default: `MXN`) |
| `description` | String | No | Descripcion o concepto del cobro |
| `membershipPlanSnapshot` | Map | No | Snapshot del plan si `type = membership` (misma estructura que en `members`) |
| `registeredBy` | String | Si | UID del admin/recepcionista que registro el cobro |
| `createdAt` | Timestamp | Si | Fecha de creacion |
| `updatedAt` | Timestamp | Si | Fecha de actualizacion |
| `completedAt` | Timestamp | No | Fecha en que se completo el pago |

### Reglas de negocio de pagos

1. `memberId` es **siempre requerido** — todo cobro esta vinculado a un miembro del gym
2. `userId` es opcional — muchos miembros no tienen cuenta en la app
3. Un pago tipo `membership` debe incluir `membershipPlanSnapshot` con los datos del plan asignado
4. Al completar un pago tipo `membership`, se actualiza la membresia del miembro (status, fechas, snapshot)
5. Un pago `completed` **no se puede modificar** — solo se puede crear un pago tipo `refunded`
6. El pago tipo `day_pass` permite check-in ese dia aunque el miembro no tenga plan activo
7. `registeredBy` identifica al admin/recepcionista que realizo el cobro (auditoria)

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

## `products/{productId}`

Catalogo de productos y servicios del gimnasio. El admin puede crear, editar y desactivar productos. Los servicios son productos con `category = "service"` que no manejan stock.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | String | Si | UUID generado |
| `name` | String | Si | Nombre del producto o servicio |
| `description` | String | No | Descripcion del producto |
| `category` | String | Si | `beverages`, `food`, `supplements`, `equipment`, `apparel`, `accessories`, `service`, `other` |
| `price` | Double | Si | Precio de venta al publico |
| `costPrice` | Double | Si | Precio de costo (lo que pago el gimnasio). Default: 0 |
| `currency` | String | Si | Codigo ISO 4217 (default: `MXN`) |
| `stock` | Int | Si | Stock disponible (0 para servicios) |
| `sku` | String | No | Codigo interno del producto |
| `imageURL` | String | No | URL de imagen (futuro) |
| `isActive` | Boolean | Si | Si el producto esta disponible |
| `priceHistory` | Array\<Map\> | No | Historial de cambios de precio. Cada entrada: `{ price, costPrice, changedAt, changedBy }` |
| `createdAt` | Timestamp | Si | Fecha de creacion |
| `updatedAt` | Timestamp | Si | Fecha de actualizacion |

### Estructura de `priceHistory` (array de maps)

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `price` | Double | Precio de venta anterior |
| `costPrice` | Double | Precio de costo anterior |
| `changedAt` | Timestamp | Fecha del cambio |
| `changedBy` | String | UID del admin que cambio el precio |

### Reglas de negocio de productos

1. `name` es siempre requerido
2. `price` (venta) debe ser mayor a 0
3. `costPrice` es lo que costo el producto al gimnasio; se usa para calcular margen
4. Si `category = "service"`, el campo `stock` se ignora (no se trackea inventario)
5. Soft delete: `isActive = false` para desactivar, nunca eliminar documentos
6. El stock se ajusta manualmente por el admin o se descuenta al vender (futuro)
7. Al cambiar `price` o `costPrice`, se agrega una entrada a `priceHistory` con los valores anteriores
8. `priceHistory` es inmutable: nunca se editan ni eliminan entradas existentes

---

## `classes/{classId}`

Clases del gimnasio. Gestionada por Android e iOS. Los campos en español (`nombre`, `fecha`, etc.) son los originales de Android; iOS los mapea internamente a nombres en ingles.

### Campos compartidos (Android + iOS)

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

### Campos opcionales (iOS — Android los ignora)

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `description` | String | No | Descripcion de la clase |
| `isActive` | Boolean | No | Soft delete (default: true). Si `false`, la clase no se muestra |
| `recurrenceGroupId` | String | No | UUID compartido entre clases creadas en lote (recurrencia UI) |

### Mapeo de campos Swift ↔ Firestore

| Swift (iOS) | Firestore | Tipo |
|-------------|-----------|------|
| `name` | `nombre` | String |
| `date` | `fecha` | Timestamp |
| `startTime` | `horaInicio` | String |
| `durationMinutes` | `duracionMin` | Int |
| `maxCapacity` | `capacidadMax` | Int |

---

## `classBookings/{bookingId}`

Reservas de clases. Gestionada por Android e iOS (lectura).

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

Asistencia a clases. Android escribe los registros, iOS los consulta.

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `id` | String | Si | Auto-generado |
| `classId` | String | Si | FK a `classes` |
| `userId` | String | No | FK a `users` (cuenta en la app) |
| `asistio` | Boolean | Si | Si asistio |
| `timestamp` | Timestamp | Si | Fecha/hora del registro |

### Campos opcionales (iOS — Android los ignora)

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `memberId` | String | No | FK a `members` (para miembros sin cuenta en la app) |

---

## Reglas para cambios de esquema

1. **Nunca renombrar un campo existente** — agrega uno nuevo y migra gradualmente
2. **Nunca cambiar el tipo de un campo** — puede romper la app que no se actualizo
3. **Documentar aqui antes de implementar** en cualquier plataforma
4. **Los campos nuevos deben ser opcionales** para no romper documentos existentes
5. **Soft delete**: preferir `isActive = false` en vez de eliminar documentos
6. **Timestamps**: usar `FieldValue.serverTimestamp()` para `createdAt` y `updatedAt`
