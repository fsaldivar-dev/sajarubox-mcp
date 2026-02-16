# SajaruBox — Reglas de Negocio

> Reglas que aplican en todas las plataformas.

---

## Registro y autenticación

- El **primer usuario** registrado en la base se convierte en `admin`
- Todos los demás usuarios son `member` por defecto
- Los métodos de autenticación disponibles son: **email/password**, **Google Sign-In** y **Apple Sign-In**
- Tras registro con email/password el usuario debe **iniciar sesión manualmente**
- Tras registro con Google o Apple el usuario queda autenticado directamente

### Validaciones de registro
| Campo | Regla |
|-------|-------|
| Nombre completo | Requerido, mínimo 3 caracteres |
| Email | Requerido, formato válido |
| Contraseña | Requerida, mínimo 6 caracteres |
| Confirmar contraseña | Debe coincidir con contraseña |

---

## Onboarding

- Todo usuario nuevo debe completar el onboarding antes de acceder a la app
- El onboarding se verifica con el campo `onboardingCompleted` en `users/{uid}`
- El onboarding tiene **3 pasos** (4 si es menor de edad):
  1. **Datos personales** — nombre *(requerido)*, primer apellido *(requerido)*, segundo apellido *(opcional)*, fecha de nacimiento *(requerida)*
  2. **Contacto** — teléfono *(requerido)*, teléfono de emergencia *(requerido)*
  3. **Salud** — enfermedades, lesiones, otros *(todos opcionales)*
  4. **Tutor** — solo si `isMinor = true` (ver sección Menores de edad)

---

## Menores de edad

- Si la fecha de nacimiento indica que el usuario tiene **menos de 18 años**, `isMinor = true`
- Los menores deben proporcionar datos de un tutor en el onboarding (paso 4)
- Relaciones válidas para el tutor: `Padre`, `Madre`, `Tutor Legal`

### Campos del tutor
| Campo | Obligatorio |
|-------|-------------|
| Nombre | ✅ |
| Primer apellido | ✅ |
| Segundo apellido | ❌ |
| Teléfono | ✅ |
| Email | ❌ |
| Relación (`Padre` \| `Madre` \| `Tutor Legal`) | ✅ |

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

## Grupos familiares

- Un grupo familiar permite que varios miembros compartan un plan
- El campo `familyGroupId` en `users` vincula a los miembros del grupo
- El plan familiar soporta 3-4 miembros ($600/mes)
- Un miembro puede crear un grupo familiar o unirse a uno existente mediante código de invitación
- El código de invitación expira a las 24 horas
- Un miembro solo puede pertenecer a un grupo a la vez
- El administrador también puede crear y gestionar grupos desde su panel

---

## Gym

- Gym ID fijo: `"sajarubox"`
- Una sola ubicación física por ahora
