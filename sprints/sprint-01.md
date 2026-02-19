# Sprint 01 — Registro + Onboarding Android

**Estado:** Completado
**Plataforma:** Android

## Features entregados

- [x] Modelo `User.kt` unificado
- [x] `UserRepository.kt` con CRUD sobre `users`
- [x] Sistema de roles simplificado (`admin`/`member`)
- [x] Primer usuario = admin automaticamente
- [x] `signUpWithEmailOnly()` con signOut post-registro
- [x] Google Sign-In en pantalla de registro
- [x] Onboarding wizard 3-4 pasos
- [x] Paso de tutor condicional para menores de edad
- [x] Navegacion post-auth con verificacion de onboarding
- [x] `MembersScreen` refactorizado para listar desde `users`
- [x] Firestore rules actualizadas con roles `admin`/`member`

---

# Sprint 02 — Admin iOS: Core

**Estado:** Completado
**Plataforma:** iOS

## Features entregados

- [x] Auth con Email, Google, Apple (multi-proveedor con SessionResolver)
- [x] Primer usuario = admin automatico (app_config/setup)
- [x] Gestion de miembros (CRUD, busqueda, vinculacion User-Member)
- [x] Catalogo de planes de membresia (time_based, visit_based, mixed)
- [x] Asignacion de membresia con snapshot inmutable + pago automatico
- [x] Check-in con descuento de visitas y expiracion automatica
- [x] Visualizacion de usuarios registrados desde Android (coleccion `users`)

---

# Sprint 03 — Admin iOS: Inventario, Ventas y Clases

**Estado:** Completado
**Plataforma:** iOS

## Features entregados

- [x] Inventario de productos (CRUD, historial de precios, costo y precio publico)
- [x] Punto de venta (cobro de productos y servicios por miembro)
- [x] Modulo de clases (CRUD, recurrencia batch, compatibilidad con Android)
- [x] Visualizacion de asistencia a clases (lectura desde classAttendance)
- [x] Acciones rapidas (QuickActionSheet): check-in, cobro de visita, venta, asignar plan

---

# Sprint 04 — Admin iOS: UX y Renovacion

**Estado:** Completado
**Plataforma:** iOS

## Features entregados

- [x] Sidebar adaptable en iPad (TabSection + .sidebarAdaptable), tabs en iPhone
- [x] Renovacion rapida de membresias (pre-seleccion de plan anterior, fecha inteligente)
- [x] Swipe action y context menu "Renovar" en lista de miembros
- [x] Badge "Anterior" en selector de planes
- [x] Fecha fija de vencimiento mensual (aritmetica de meses en vez de dias)
- [x] Barra de busqueda en miembros, membresias, inventario y clases

---

# Sprint 05 — Por definir

**Estado:** Pendiente
**Plataforma:** Por definir

## Candidatos

- [ ] iOS: Reportes / Dashboard (ingresos, check-ins, membresias por vencer)
- [ ] iOS: Configuracion y gestion de roles (crear recepcionistas)
- [ ] iOS: Perfil completo (editar datos, cambiar contrasena)
- [ ] iOS: Notificaciones (membresia por vencer, inventario bajo)
- [ ] Android: Notificaciones push para reservas
- [ ] Android: Grupos familiares
- [ ] Web: Horario publico de clases
- [ ] Web: Planes y precios
