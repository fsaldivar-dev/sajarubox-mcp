# SajaruBox — Plataformas

---

## Android — App del Miembro

**Repo:** `fsaldivar-dev/sajaru-box-android`
**Branch principal:** `feature/environments-config`
**Stack:** Kotlin, Jetpack Compose, Firebase

### Features actuales
- Registro con email/password y Google
- Onboarding de perfil (3-4 pasos)
- Lista de clases por fecha
- Reserva de clase
- Cancelación de reserva
- Historial de asistencia
- Membresía activa
- Perfil de usuario

### Features únicos (diferenciadores)
- Onboarding completo de perfil con datos de salud
- Acceso rápido desde móvil para reservar clases
- Notificaciones push (pendiente)

---

## iOS — App del Administrador

**Stack:** Swift, SwiftUI, Firebase, SwiftData

### Features actuales
- Auth con Email, Google, Apple
- Gestión de miembros
- Check-ins
- Productos
- Pagos
- Sync bidireccional con SwiftData

### Features únicos (diferenciadores)
- Vista de administración del gym
- Registro de pagos y productos
- Dashboard de métricas (pendiente)
- Gestión de horarios

### ⚠️ Pendiente de migración
- iOS usa `membershipType`, `status`, `startDate`, `expirationDate` en `users` (campos de compatibilidad)
- iOS debe migrar referencia de colección `members` → `users`

---

## Web — Landing + Autoservicio

**Repo:** `fsaldivar-dev/sajaru-box-web`
**Branch principal:** `develop`
**Hosting:** Firebase Hosting (estático)
**Stack:** React 19.2.0 + Vite 7.2.4 | CSS custom con variables | Sin librería UI externa

### Features actuales
- Landing page SPA con scroll suave entre secciones
- Video de fondo (Hero) con solución de autoplay para iOS
- 4 secciones de contenido: Servicios, Horarios, Contacto, Música
- Barra lateral de redes sociales (Facebook, Instagram, TikTok, WhatsApp)
- Embed de SoundCloud (playlist "Ritmos de Combate Sajaru Box")
- Solo modo oscuro activo (`data-theme="dark"`)

### Features únicos planeados (diferenciadores)
- Horario público de clases (sin login)
- Planes y precios
- Formulario de contacto / WhatsApp
- Reserva de clase desde browser (sin instalar app)
- Pago de membresía online (pendiente — Stripe)
- Dashboard admin desde desktop

---

## Decisiones cross-platform

| Decisión | Valor | Razón |
|----------|-------|-------|
| Base de datos | Firestore | Compartida entre todas las plataformas |
| Auth | Firebase Auth | SSO entre plataformas |
| Gym ID | `"sajarubox"` (hardcoded) | Un solo gym por ahora |
| Roles | `admin` \| `member` | Simplificado desde `owner/staff/member` |
