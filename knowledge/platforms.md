# SajaruBox — Plataformas

> **Estrategia de desarrollo:**
> - **Android**: Fase 1 = App pública (miembros/clientes) ✅ | Fase 2 = App admin ⏳
> - **iOS**: Fase 1 = App interna (admin/staff) ✅ | Fase 2 = App pública ⏳
> - **Web**: Landing estática ✅ | Autoservicio público ⏳

---

## Android — App Pública (Miembros/Clientes)

**Audiencia:** Miembros del gym que usan la app para reservar clases y ver su membresía
**Rol principal:** `member` (clientes del gym)

**Repo:** `fsaldivar-dev/sajaru-box-android`
**Branch principal:** `feature/environments-config`
**Stack:** Kotlin, Jetpack Compose, Firebase

### Features actuales
- Registro con email/password y Google
- Onboarding de perfil (3-4 pasos con datos de salud)
- Lista de clases por fecha
- Reserva y cancelacion de clases
- Historial de asistencia
- Membresia activa (visualizacion)
- Perfil de usuario

### Features unicos (diferenciadores)
- Onboarding completo de perfil con datos de salud y tutor para menores
- Acceso rapido desde movil para reservar clases
- Notificaciones push (pendiente)

---

## iOS — App Interna (Admin/Staff)

**Audiencia:** Administradores y recepcionistas del gym
**Roles principales:** `admin`, `receptionist`

**Repo:** `fsaldivar-dev/sajaru-box-ios`
**Branch principal:** `main`
**Stack:** Swift, SwiftUI, Firebase, SwiftData, SajaruUI (design system propio)
**Target:** iOS 26+

### Features actuales

| Modulo | Descripcion | Estado |
|--------|-------------|--------|
| Auth | Login/registro con Email, Google, Apple. Multi-proveedor con SessionResolver. | Completo |
| Miembros | CRUD, busqueda, vinculacion User-Member, usuarios registrados desde Android | Completo |
| Membresias | Catalogo de planes (time_based, visit_based, mixed), CRUD por admin | Completo |
| Asignacion | Asignar plan a miembro con snapshot inmutable + pago automatico | Completo |
| Renovacion | Renovacion rapida con plan anterior pre-seleccionado, swipe action, context menu | Completo |
| Check-in | Registro de asistencia, descuento de visitas, expiracion automatica | Completo |
| Inventario | Productos CRUD, historial de precios, costo y precio publico | Completo |
| Ventas / POS | Punto de venta, cobro de productos y servicios por miembro | Completo |
| Clases | CRUD de clases, recurrencia (batch), visualizacion de asistencia, compatibilidad con Android | Completo |
| Layout | Sidebar adaptable en iPad (TabSection), tabs en iPhone (.sidebarAdaptable) | Completo |
| Pagos | Registro de cobros (membresia, producto, servicio), historial por miembro | Completo |
| Fecha fija | Planes mensuales usan aritmetica de meses para que el miembro pague siempre el mismo dia | Completo |
| Perfil | Vista basica con datos y cerrar sesion | Basico |
| Configuracion | Placeholder — gestion de roles pendiente | Pendiente |
| Reportes | Dashboard de metricas del negocio | Pendiente |

### Features unicos (diferenciadores)
- Vista completa de administracion del gym (miembros, planes, inventario, clases, ventas)
- Acciones rapidas (QuickActionSheet): check-in, renovacion, venta de producto, cobro de visita
- Sidebar en iPad con secciones, tabs en iPhone
- Cross-platform: lee y escribe datos compatibles con la app Android (Firestore compartido)
- Design system propio (SajaruUI) con temas y Liquid Glass

---

## Web — Landing + Autoservicio

**Repo:** `fsaldivar-dev/sajaru-box-web`
**Branch principal:** `develop`
**Hosting:** Firebase Hosting (estatico)
**Stack:** React 19.2.0 + Vite 7.2.4 | CSS custom con variables | Sin libreria UI externa

### Features actuales
- Landing page SPA con scroll suave entre secciones
- Video de fondo (Hero) con solucion de autoplay para iOS
- 4 secciones de contenido: Servicios, Horarios, Contacto, Musica
- Barra lateral de redes sociales (Facebook, Instagram, TikTok, WhatsApp)
- Embed de SoundCloud (playlist "Ritmos de Combate Sajaru Box")
- Solo modo oscuro activo (`data-theme="dark"`)

### Features planeados
- Horario publico de clases (sin login)
- Planes y precios
- Formulario de contacto / WhatsApp
- Reserva de clase desde browser (sin instalar app)
- Pago de membresia online (pendiente — Stripe)

---

## Decisiones cross-platform

| Decision | Valor | Razon |
|----------|-------|-------|
| Base de datos | Firestore | Compartida entre todas las plataformas |
| Auth | Firebase Auth | SSO entre plataformas |
| Gym ID | `"sajarubox"` (hardcoded) | Un solo gym por ahora |
| Roles | `admin`, `receptionist`, `trainer`, `member`, `guest`, `visitor` | Definidos en RolesCore, implementados: admin, receptionist, member |
| Colecciones compartidas | `members`, `membership_plans`, `users`, `payments`, `products`, `classes`, `classBookings`, `classAttendance`, `check_ins` | Android e iOS leen/escriben las mismas colecciones |
| Campos Firestore | Espanol en Android, mapeo manual en iOS | Compatibilidad sin migracion de esquema |

---

## Roadmap de Plataformas

### Fase 1: Apps especializadas (Actual)
- ✅ **Android App Pública**: Miembros reservan clases, ven su membresía
- ✅ **iOS App Admin**: Staff gestiona miembros, cobros, inventario, check-in
- ✅ **Web Landing**: Información estática del gym

### Fase 2: Cross-platform completo (Futuro)
- ⏳ **Android App Admin**: Versión admin para tablets Android en recepción
- ⏳ **iOS App Pública**: Miembros iOS pueden auto-registrarse y usar la app
- ⏳ **Web Autoservicio**: Reservar clases sin instalar app, pago online

### Fase 3: Features avanzados (Planeado)
- ⏳ **TV Display**: Pantalla con WODs/rutinas en tiempo real
- ⏳ **Notificaciones push**: Recordatorios de clases, vencimiento de membresía
- ⏳ **Reports/Dashboard**: Analytics del negocio (ingresos, asistencia, conversión)

---

## ¿Por qué esta estrategia?

**Ventajas de desarrollar apps especializadas primero:**
1. **Velocidad**: Enfocarse en un caso de uso por plataforma acelera desarrollo
2. **Testing**: Cada app tiene usuarios reales (staff en iOS, clientes en Android)
3. **Feedback**: Iterar rápido con usuarios específicos antes de expandir
4. **Recursos**: Optimizar esfuerzo (iOS admin es más complejo que cliente)

**Resultado esperado:**
- Staff feliz con herramientas potentes (iOS)
- Clientes felices con experiencia simple (Android)
- Código reutilizable para Fase 2 (cross-platform completo)
