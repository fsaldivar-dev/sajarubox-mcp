# SajaruBox — Database Schema (Firestore)

> Fuente de verdad compartida entre Android, iOS y Web.
> Cualquier cambio de esquema debe actualizarse aquí ANTES de implementarse en cualquier plataforma.

---

## Colección: `users/{uid}`

El UID de Firebase Auth es el ID del documento.

| Campo | Tipo | Valores posibles | Plataforma que escribe |
|-------|------|-----------------|----------------------|
| `id` | String | UID de Firebase Auth | Android, iOS |
| `email` | String | — | Android, iOS |
| `nombre` | String | — | Android (onboarding), iOS |
| `primerApellido` | String | — | Android (onboarding) |
| `segundoApellido` | String | — | Android (onboarding) |
| `telefono` | String | — | Android (onboarding) |
| `telefonoEmergencia` | String | — | Android (onboarding) |
| `fechaNacimiento` | Timestamp | — | Android (onboarding) |
| `enfermedades` | String | — | Android (onboarding) |
| `lesiones` | String | — | Android (onboarding) |
| `otros` | String | — | Android (onboarding) |
| `role` | String | `admin` \| `member` | Android, iOS |
| `activo` | Boolean | — | Android, iOS |
| `onboardingCompleted` | Boolean | — | Android |
| `isMinor` | Boolean | — | Android (onboarding) |
| `guardianNombre` | String | Solo si isMinor=true | Android (onboarding) |
| `guardianPrimerApellido` | String | Solo si isMinor=true | Android (onboarding) |
| `guardianSegundoApellido` | String | Solo si isMinor=true | Android (onboarding) |
| `guardianTelefono` | String | Solo si isMinor=true | Android (onboarding) |
| `guardianEmail` | String | Solo si isMinor=true | Android (onboarding) |
| `guardianRelacion` | String | `Padre` \| `Madre` \| `Tutor Legal` | Android (onboarding) |
| `familyGroupId` | String | — | Pendiente (Fase 6) |
| `membershipType` | String | — | iOS (compatibilidad) |
| `status` | String | — | iOS (compatibilidad) |
| `startDate` | Timestamp | — | iOS (compatibilidad) |
| `expirationDate` | Timestamp | — | iOS (compatibilidad) |
| `createdAt` | Timestamp | — | Android, iOS |
| `updatedAt` | Timestamp | — | Android, iOS |

---

## Colección: `classes/{classId}`

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | String | Auto-generado |
| `gymId` | String | Siempre `"sajarubox"` |
| `fecha` | Timestamp | Fecha de la clase |
| `horaInicio` | String | Formato `HH:mm` |
| `duracionMin` | Int | Duración en minutos, default 60 |
| `nombre` | String | Nombre de la clase |
| `capacidadMax` | Int | Máximo de alumnos, default 14 |
| `createdAt` | Timestamp | — |
| `updatedAt` | Timestamp | — |

---

## Colección: `classBookings/{bookingId}`

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | String | Auto-generado |
| `classId` | String | Referencia a `classes/{classId}` |
| `userId` | String | UID del usuario (referencia a `users/{uid}`) |
| `gymId` | String | Siempre `"sajarubox"` |
| `estado` | String | `activa` \| `cancelada` |
| `createdAt` | Timestamp | — |

---

## Colección: `classAttendance/{attendanceId}`

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | String | Auto-generado |
| `classId` | String | Referencia a `classes/{classId}` |
| `userId` | String | UID del usuario |
| `asistio` | Boolean | — |
| `timestamp` | Timestamp | — |

---

## Colección: `memberships/{membershipId}`

| Campo | Tipo | Valores posibles | Notas |
|-------|------|-----------------|-------|
| `id` | String | Auto-generado | — |
| `userId` | String | UID del usuario | Referencia a `users/{uid}` |
| `gymId` | String | `"sajarubox"` | — |
| `tipo` | String | `weekly` \| `monthly` \| `punch_card` | — |
| `fechaInicio` | Timestamp | — | — |
| `fechaFin` | Timestamp | — | — |
| `estado` | String | `active` \| `expired` \| `paused` | — |
| `clasesRestantes` | Int | Solo para `punch_card` | — |

---

## ⚠️ Reglas para cambios de esquema

1. **Nunca renombrar un campo existente** — agrega uno nuevo y migra gradualmente
2. **Nunca cambiar el tipo de un campo** — puede romper la app que no se actualizó
3. **Documentar aquí antes de implementar** en cualquier plataforma
4. **Los campos nuevos deben ser opcionales** para no romper documentos existentes
