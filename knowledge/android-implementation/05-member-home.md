# Member Home — Android

> Pantalla principal del miembro (rol = "member").
> Estructura: BottomNavigation con 4 tabs.
> Destino tras onboarding o login exitoso de un miembro.

---

## Estructura de tabs

```
MemberHomeScreen
└── BottomNavigation
    ├── Tab 1: Clases    (icono: CalendarMonth)   ruta: member_home/classes
    ├── Tab 2: Membresía (icono: CardMembership)  ruta: member_home/membership
    ├── Tab 3: Store     (icono: Store)            ruta: member_home/store
    └── Tab 4: Perfil    (icono: Person)           ruta: member_home/profile
```

---

## Estado de implementación

| Tab | Pantalla | Estado | Notas |
|-----|----------|--------|-------|
| Clases | `ClassesScreen` | ✅ Implementado | Misma pantalla que usa el admin, vista adaptada para miembro |
| Membresía | `MemberActiveMembershipScreen` | ✅ Implementado | Muestra membresía activa del miembro |
| Store | `StoreScreen` | ❌ Pendiente | No existe aún |
| Perfil | `MemberProfileScreen` | ✅ Implementado | Info personal, historial, reservas, cerrar sesión |

**Pendiente de implementar:** La estructura de `BottomNavigation` que conecta los 4 tabs.
Actualmente la navegación entre estas pantallas es secuencial (botones dentro de cada pantalla).

---

## Tab 1 — Clases (`ClassesScreen`)

**Archivo:** `ui/classes/ClassesScreen.kt`

Lo que ve el miembro:
- Selector de fecha (navegar entre días)
- Lista de clases del gym para la fecha seleccionada
- Próximas clases de la semana (scroll horizontal o lista filtrada)
- Por cada clase: nombre, hora, cupos disponibles
- Botón "Reservar" si tiene cupo y no está inscrito
- Botón "Cancelar Reserva" si ya está inscrito

Lo que NO ve (solo admin):
- Botón "Agregar clase" (FAB)
- Click en clase → inscritos (va a `ClassBookingsScreen`)

**ViewModel:** `ClassesViewModel`

```kotlin
// Estados relevantes para el miembro:
val selectedDate: StateFlow<Timestamp>         // Fecha seleccionada
val classes: StateFlow<List<ClassWithBookings>> // Clases del dia
val isLoading: StateFlow<Boolean>
val memberBookings: StateFlow<Map<String, String>> // classId → bookingId (del miembro)
```

---

## Tab 2 — Membresía (`MemberActiveMembershipScreen`)

**Archivo:** `ui/profile/MemberActiveMembershipScreen.kt`

Lo que muestra:
- Tipo de membresía
- Estado (activa/inactiva)
- Fecha de inicio y fin
- Para planes `visit_based` o `mixed`: clases/visitas restantes

> ⚠️ Esta pantalla usa la colección `memberships` del esquema antiguo de Android.
> Pendiente migrar a leer de `members.membershipPlanSnapshot` (esquema compartido con iOS).

**ViewModel:** `MemberActiveMembershipViewModel`

---

## Tab 3 — Store (pendiente)

**Archivo:** No existe. Crear `ui/store/StoreScreen.kt`

Lo que debería mostrar:
- Catálogo de productos del gym (colección `products` en Firestore)
- Filtrado por categoría
- Detalle de producto

Ver `business-rules/10-store.md` si existe, o el schema de `products` en `schema.md`.

---

## Tab 4 — Perfil (`MemberProfileScreen`)

**Archivo:** `ui/profile/MemberProfileScreen.kt`

Secciones:
- Información personal: nombre, teléfono, estado (activo/inactivo)
- Acciones rápidas (cards clickeables):
  - Mi Historial de Asistencia → `MemberAttendanceHistoryScreen`
  - Mi Membresía → `MemberActiveMembershipScreen`
  - Mis Reservas → `MemberBookingsScreen`
  - Cerrar Sesión

**ViewModel:** `MemberProfileViewModel`

---

## Rutas necesarias (BottomNavigation)

Al implementar el BottomNav, agregar a `Screen` en `NavGraph.kt`:

```kotlin
// Home del miembro con tabs
object MemberHome : Screen("member_home")

// Tabs internas del BottomNav (nested navigation)
sealed class MemberTab(val route: String) {
    object Classes    : MemberTab("member_home/classes")
    object Membership : MemberTab("member_home/membership")
    object Store      : MemberTab("member_home/store")
    object Profile    : MemberTab("member_home/profile")
}
```

---

## Implementar el BottomNavigation

```kotlin
@Composable
fun MemberHomeScreen(
    onSignOut: () -> Unit,
    rootNavController: NavHostController
) {
    val tabNavController = rememberNavController()

    Scaffold(
        bottomBar = {
            NavigationBar {
                val navBackStackEntry by tabNavController.currentBackStackEntryAsState()
                val currentRoute = navBackStackEntry?.destination?.route

                NavigationBarItem(
                    selected = currentRoute == MemberTab.Classes.route,
                    onClick = { tabNavController.navigate(MemberTab.Classes.route) {
                        launchSingleTop = true
                        restoreState = true
                    }},
                    icon = { Icon(Icons.Default.CalendarMonth, null) },
                    label = { Text("Clases") }
                )
                NavigationBarItem(
                    selected = currentRoute == MemberTab.Membership.route,
                    onClick = { tabNavController.navigate(MemberTab.Membership.route) {
                        launchSingleTop = true
                        restoreState = true
                    }},
                    icon = { Icon(Icons.Default.CardMembership, null) },
                    label = { Text("Membresía") }
                )
                NavigationBarItem(
                    selected = currentRoute == MemberTab.Store.route,
                    onClick = { tabNavController.navigate(MemberTab.Store.route) {
                        launchSingleTop = true
                        restoreState = true
                    }},
                    icon = { Icon(Icons.Default.Store, null) },
                    label = { Text("Store") }
                )
                NavigationBarItem(
                    selected = currentRoute == MemberTab.Profile.route,
                    onClick = { tabNavController.navigate(MemberTab.Profile.route) {
                        launchSingleTop = true
                        restoreState = true
                    }},
                    icon = { Icon(Icons.Default.Person, null) },
                    label = { Text("Perfil") }
                )
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = tabNavController,
            startDestination = MemberTab.Classes.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(MemberTab.Classes.route) {
                ClassesScreen(/* sin botones de admin */)
            }
            composable(MemberTab.Membership.route) {
                MemberActiveMembershipScreen()
            }
            composable(MemberTab.Store.route) {
                StoreScreen() // pendiente
            }
            composable(MemberTab.Profile.route) {
                MemberProfileScreen(onSignOut = onSignOut)
            }
        }
    }
}
```

---

## Cambio en el flujo post-onboarding

Con el BottomNav, el destino del miembro cambia de `Screen.Classes` a `Screen.MemberHome`:

```kotlin
// OnboardingScreen — al completar
val dest = if (role == "admin") Screen.Members.route else Screen.MemberHome.route

// NavGraph — post-login
getCurrentUserRole() == "admin" → Screen.Members
                       "member" → Screen.MemberHome  // antes era Screen.Classes
```

---

## Pantallas secundarias (push desde tabs)

Desde el BottomNav se puede navegar a pantallas de detalle usando el `rootNavController`
(no el `tabNavController`), para que salgan en pantalla completa sin el BottomNav:

| Desde | Navega a | Controller |
|-------|----------|------------|
| Tab Clases | ClassForm (admin) | rootNavController |
| Tab Clases | ClassBookings (admin) | rootNavController |
| Tab Perfil | MemberAttendanceHistory | rootNavController |
| Tab Perfil | MemberBookings | rootNavController |
