# SajaruBox — Reglas de Negocio

> Reglas que aplican en todas las plataformas.

---

## Registro y autenticación

- El **primer usuario** registrado en la base se convierte en `admin`
- Todos los demás usuarios son `member` por defecto
- Los métodos de registro disponibles son: **email/password** y **Google Sign-In**
- Tras registro con email/password el usuario debe **iniciar sesión manualmente**
- Tras registro con Google el usuario queda autenticado directamente

---

## Onboarding

- Todo usuario nuevo debe completar el onboarding antes de acceder a la app
- El onboarding se verifica con el campo `onboardingCompleted` en `users/{uid}`
- El onboarding tiene **3 pasos** (4 si es menor de edad):
  1. Datos personales (nombre, apellidos, fecha de nacimiento)
  2. Contacto (teléfono, teléfono de emergencia)
  3. Salud (enfermedades, lesiones, otros — todos opcionales)
  4. Tutor (solo si `isMinor = true`)

---

## Menores de edad

- Si la fecha de nacimiento indica que el usuario tiene **menos de 18 años**, `isMinor = true`
- Los menores deben proporcionar datos de un tutor en el onboarding
- Relaciones válidas para el tutor: `Padre`, `Madre`, `Tutor Legal`

---

## Membresías

### Tipos disponibles
| Tipo | Descripción |
|------|-------------|
| `monthly` | Acceso mensual ilimitado |
| `weekly` | Acceso semanal |
| `punch_card` | Paquete de clases (N clases) |

### Planes de precios (referencia)
| Plan | Precio | Notas |
|------|--------|-------|
| Individual | $X/mes | — |
| Familiar | $600/mes | 3-4 miembros |

---

## Clases

- Capacidad máxima por clase: **14 alumnos** (configurable)
- Duración por defecto: **60 minutos**
- Un miembro no puede reservar la misma clase dos veces
- Un miembro puede cancelar su propia reserva
- Solo admin puede marcar asistencia

---

## Familias (Fase 6 — pendiente)

- Un grupo familiar comparte un plan
- El campo `familyGroupId` en `users` vincula a los miembros del grupo
- El plan familiar soporta 3-4 miembros

---

## Gym

- Gym ID fijo: `"sajarubox"`
- Una sola ubicación física por ahora
