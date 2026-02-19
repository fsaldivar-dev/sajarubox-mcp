# Navegacion — Android

> Navigation Compose con rutas definidas en sealed class.
> El NavGraph determina el startDestination segun el estado del usuario.

---

## Rutas disponibles

```kotlin
// navigation/NavGraph.kt
sealed class Screen(val route: String) {
    // Auth
    object SignIn : Screen("signin")
    object SignUp : Screen("signup")

    // Onboarding
    object Onboarding : Screen("onboarding")

    // Admin (rol = "admin")
    object Members : Screen("members")
    object MemberForm : Screen("member_form/{memberId}") {
        fun createRoute(memberId: String? = null) =
            if (memberId != null) "member_form/$memberId" else "member_form/new"
    }
    object Classes : Screen("classes")
    object ClassForm : Screen("class_form/{classId}") {
        fun createRoute(classId: String? = null) =
            if (classId != null) "class_form/$classId" else "class_form/new"
    }
    object ClassBookings : Screen("class_bookings/{classId}") {
        fun createRoute(classId: String) = "class_bookings/$classId"
    }
    object Attendance : Screen("attendance/{classId}") {
        fun createRoute(classId: String) = "attendance/$classId"
    }
    object Memberships : Screen("memberships")
    object MembershipForm : Screen("membership_form/{membershipId}") {
        fun createRoute(membershipId: String? = null) =
            if (membershipId != null) "membership_form/$membershipId"
            else "membership_form/new"
    }

    // Miembro (rol = "member") — Home con BottomNavigation
    object MemberHome : Screen("member_home")  // contenedor del BottomNav

    // Pantallas de detalle del miembro (fuera del BottomNav)
    object MemberProfile : Screen("member_profile")
    object MemberAttendanceHistory : Screen("member_attendance_history")
    object MemberActiveMembership : Screen("member_active_membership")
    object MemberBookings : Screen("member_bookings")
}

// Tabs del BottomNav del miembro (nested NavHost dentro de MemberHomeScreen)
sealed class MemberTab(val route: String) {
    object Classes    : MemberTab("member_home/classes")
    object Membership : MemberTab("member_home/membership")
    object Store      : MemberTab("member_home/store")
    object Profile    : MemberTab("member_home/profile")
}
```

---

## Flujo de navegacion post-autenticacion

```
Firebase Auth exitoso
        |
        v
isOnboardingCompleted()?
        |
       NO → Onboarding → (al completar) → determinar rol
       SI → determinar rol
        |
        v
getCurrentUserRole() == "admin"?
       SI → Members (pantalla de administrador)
       NO → MemberHome (BottomNav con 4 tabs)
                ├── Tab 1: Clases
                ├── Tab 2: Membresía
                ├── Tab 3: Store
                └── Tab 4: Perfil
```

---

## NavHost

```kotlin
@Composable
fun NavGraph(
    navController: NavHostController,
    startDestination: String = Screen.SignIn.route
) {
    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(Screen.SignIn.route) {
            SignInScreen(
                onSignInSuccess = { /* navegar segun rol */ },
                onNavigateToSignUp = { navController.navigate(Screen.SignUp.route) }
            )
        }
        composable(Screen.Onboarding.route) {
            OnboardingScreen(
                onOnboardingComplete = { role ->
                    val dest = if (role == "admin") Screen.Members.route else Screen.Classes.route
                    navController.navigate(dest) {
                        popUpTo(Screen.Onboarding.route) { inclusive = true }
                    }
                }
            )
        }
        composable(Screen.Members.route) {
            MembersScreen(
                onMemberClick = { id -> navController.navigate(Screen.MemberForm.createRoute(id)) },
                onAddMember = { navController.navigate(Screen.MemberForm.createRoute()) }
            )
        }
        // ... mas composables
    }
}
```

---

## Navegar con parametros

```kotlin
// Navegar a MemberForm con ID
navController.navigate(Screen.MemberForm.createRoute(memberId = "abc123"))

// Navegar a MemberForm para crear nuevo
navController.navigate(Screen.MemberForm.createRoute())

// Leer el parametro en el composable destino
composable(Screen.MemberForm.route) { backStackEntry ->
    val memberId = backStackEntry.arguments?.getString("memberId")
    val isNew = memberId == "new"
    MemberFormScreen(memberId = if (isNew) null else memberId)
}
```

---

## Navegacion limpiando el back stack

Al ir de Onboarding a Home, no queremos que el usuario regrese al Onboarding:

```kotlin
navController.navigate(Screen.Members.route) {
    popUpTo(Screen.SignIn.route) { inclusive = true }
}
```

Al hacer signOut, volver al SignIn limpiando todo el back stack:

```kotlin
fun signOut(navController: NavController) {
    authRepository.signOut()
    navController.navigate(Screen.SignIn.route) {
        popUpTo(0) { inclusive = true }  // Limpia todo el back stack
    }
}
```

---

## Determinar startDestination en MainActivity

```kotlin
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            AppTheme {
                val navController = rememberNavController()

                // Determinar inicio segun estado de auth
                val startDestination = remember {
                    val auth = FirebaseAuth.getInstance()
                    if (auth.currentUser != null) {
                        // Usuario autenticado — NavGraph manejara onboarding y rol
                        Screen.Members.route  // o Screen.Classes, verificar rol async
                    } else {
                        Screen.SignIn.route
                    }
                }

                NavGraph(
                    navController = navController,
                    startDestination = startDestination
                )
            }
        }
    }
}
```

> **Nota:** La verificacion de onboarding y rol se hace de forma asincrona desde
> el ViewModel de la primera pantalla, no en MainActivity.

---

## Agregar una ruta nueva

1. Agregar objeto a `sealed class Screen`:
```kotlin
object NuevoModulo : Screen("nuevo_modulo")
```

2. Agregar `composable` en `NavGraph`:
```kotlin
composable(Screen.NuevoModulo.route) {
    NuevoScreen(
        onNavigateBack = { navController.popBackStack() }
    )
}
```

3. Navegar desde otra pantalla:
```kotlin
navController.navigate(Screen.NuevoModulo.route)
```

---

## Errores comunes

### 1. Ruta con parametro mal formada

**Error:** `java.lang.IllegalArgumentException: Navigation destination ... is unknown`

**Causa:** Usar `"member_form/null"` en lugar de `"member_form/new"`.

**Solucion:** Usar siempre `Screen.MemberForm.createRoute(memberId)` en lugar de construir el string manualmente.

### 2. Back stack no limpiado al hacer signOut

**Efecto:** El usuario puede presionar "back" y regresar a pantallas que requieren autenticacion.

**Solucion:** Usar `popUpTo(0) { inclusive = true }` al navegar a SignIn en signOut.

### 3. LaunchedEffect ejecutandose multiples veces

**Causa:** La clave del `LaunchedEffect` cambia en cada recomposicion.

**Solucion:** Usar una clave estable:
```kotlin
// CORRECTO
LaunchedEffect(authState) { ... }

// INCORRECTO — se ejecuta en cada recomposicion
LaunchedEffect(Unit) {
    if (authState is AuthState.Success) { ... }
}
```
