# Sistema de navegacion

> Dos niveles: navegacion global (entre flujos) y navegacion interna (dentro de un flujo).

---

## Navegacion global: Phase

La app tiene fases principales controladas por `Phase<AppPhase>`:

```swift
enum AppPhase {
    case login
    case home
}
```

`GlobalRouterManager` es una dependencia global que controla la fase actual:

```swift
@Observable
class GlobalRouterManager {
    var navigator: Phase<AppPhase> = Phase(start: .login)
}
```

El entry point de la app usa `AppFeatures` para decidir que mostrar:

```swift
AppFeatures(phase: globalRouter.navigator) { target in
    switch target {
    case .home:
        HomeFlow()
    case .login:
        AuthFlow()
    }
}
```

**Transiciones:**
- Login exitoso: `globalRouter.navigator.next(.home)`
- Cerrar sesion: `router.pop(.login)` (desde HomeView con `@Environment(Phase<AppPhase>.self)`)

---

## Navegacion interna: Router + FlowStack

Dentro de flujos que necesitan push/pop, se usa `Router<Destination>` con `FlowStack`.

**IMPORTANTE:** `FlowStack` internamente crea un `NavigationStack`. Nunca anidar un `NavigationStack` dentro de otro.

### Definir rutas

```swift
enum AuthRoute: Hashable {
    case login
    case register
    case recoverPassword
    case home
}
```

### Crear RouterManager

```swift
@Observable
final class AuthRouterManager: RouterManager {
    var router: Router<AuthRoute> = .init(start: .login)
    init() {}
}
```

### Usar en el Flow

```swift
struct AuthFlow: View {
    @DependencyState(\.authRouter) var authRouter
    
    var body: some View {
        FlowStack(router: $authRouter.router) {
            LoginView(viewModel: LoginViewModelImpl())
        } destinations: { route in
            switch route {
            case .login:
                LoginView(viewModel: LoginViewModelImpl())
            case .register:
                RegisterView(viewModel: RegisterViewModelDefault())
            case .recoverPassword:
                Text("Recuperar contrasena") // Placeholder
            case .home:
                HomeFlow()
            }
        }
    }
}
```

### Navegar

```swift
// En un ViewModel:
@Dependency(\.authRouter) var authRouter

// Ir a registro:
authRouter.router.to(.register)

// Volver atras:
authRouter.router.pop()
```

---

## HomeFlow (sin FlowStack)

`HomeFlow` NO usa `FlowStack` porque `HomeView` contiene un `TabView` donde cada tab tiene su propio `NavigationStack`. Usar `FlowStack` aqui crearia NavigationStacks anidados, lo que en iOS 26 oculta completamente el navigation bar (titulo, search, toolbar).

```swift
struct HomeFlow: View {
    var body: some View {
        HomeView()
            .forceThemeColorScheme()
    }
}
```

Cada tab gestiona su propia navegacion:

```swift
struct MembersView: View {
    var body: some View {
        NavigationStack {
            // contenido
            .navigationTitle("Miembros")
            .searchable(...)
            .toolbar { ... }
        }
        .themedNavigationViewStyle()
    }
}
```

---

## Layout adaptable: Sidebar en iPad, Tabs en iPhone

`HomeView` usa `TabView` con `.tabViewStyle(.sidebarAdaptable)` y el API moderno de `Tab` / `TabSection`. Esto permite que la misma vista se adapte automaticamente segun el dispositivo:

- **iPhone**: Tab bar tradicional en la parte inferior
- **iPad / pantallas grandes**: Sidebar a la izquierda con secciones agrupadas y el workspace del modulo seleccionado ocupa el area principal a la derecha

### Estructura con Tab y TabSection

```swift
struct HomeView: View {
    var body: some View {
        TabView {
            if currentUser.isAdmin || currentUser.role == .receptionist {
                TabSection("Administración") {
                    Tab("Miembros", systemImage: "person.3.fill") {
                        MembersView()
                    }
                    Tab("Membresías", systemImage: "creditcard.fill") {
                        MembershipPlansView()
                    }
                    Tab("Inventario", systemImage: "bag.fill") {
                        InventoryView()
                    }
                    Tab("Clases", systemImage: "calendar.badge.clock") {
                        ClassScheduleView()
                    }
                }
            }

            TabSection("Cuenta") {
                Tab("Perfil", systemImage: "person.fill") {
                    profileTab
                }
                if currentUser.isAdmin {
                    Tab("Configuración", systemImage: "gearshape.fill") {
                        // ...
                    }
                }
            }
        }
        .tabViewStyle(.sidebarAdaptable)
    }
}
```

### Comportamiento por dispositivo

| Dispositivo | Rendering | Secciones visibles |
|-------------|-----------|-------------------|
| iPhone (portrait/landscape) | Tab bar inferior | Tabs planos sin headers de seccion |
| iPad (portrait) | Sidebar colapsable a la izquierda | Secciones "Administracion" y "Cuenta" como headers |
| iPad (landscape) | Sidebar fija a la izquierda | Secciones con headers, area principal amplia |

### Reglas del layout adaptable

1. Usar `Tab("titulo", systemImage:) { contenido }` en vez de `.tabItem { Label(...) }`
2. Agrupar tabs relacionados en `TabSection("nombre")` para organizar el sidebar
3. Cada tab sigue teniendo su propio `NavigationStack` interno
4. NO anidar NavigationStacks — la misma regla aplica tanto para tabs como para sidebar
5. Los condicionales por rol (`if currentUser.isAdmin`) funcionan dentro de `TabSection`

---

## Diagrama de navegacion

```
SajaruBoxApp
    └── AppFeatures (Phase<AppPhase>)
            ├── .login → AuthFlow (FlowStack → NavigationStack)
            │               ├── .login → LoginView
            │               ├── .register → RegisterView
            │               └── .recoverPassword → (placeholder)
            │
            └── .home → HomeFlow (sin FlowStack)
                          └── HomeView (TabView .sidebarAdaptable)
                                │
                                ├── [iPad] Sidebar con secciones:
                                │     ├── "Administración"
                                │     │     ├── Miembros (NavigationStack)
                                │     │     ├── Membresías (NavigationStack)
                                │     │     ├── Inventario (NavigationStack)
                                │     │     └── Clases (NavigationStack)
                                │     └── "Cuenta"
                                │           ├── Perfil
                                │           └── Configuración (admin)
                                │
                                └── [iPhone] Tab bar inferior:
                                      ├── Miembros
                                      ├── Membresías
                                      ├── Inventario
                                      ├── Clases
                                      ├── Perfil
                                      └── Configuración (admin)
```

---

## Resumen

| Nivel | Componente | Uso |
|-------|-----------|-----|
| Global | `Phase<AppPhase>` + `GlobalRouterManager` | Cambiar entre login y home |
| Modulo (con push) | `Router<Route>` + `FlowStack` + `RouterManager` | Navegar dentro de AuthFlow |
| Home (adaptable) | `TabView` + `Tab` + `TabSection` + `.sidebarAdaptable` | Sidebar en iPad, tabs en iPhone |
| Tab | `NavigationStack` directo | Navegar dentro de cada tab/modulo |

---

## Reglas

1. **NUNCA anidar NavigationStacks.** `FlowStack` ya crea un `NavigationStack` interno. Si un tab necesita `NavigationStack`, el Flow padre NO debe usar `FlowStack`
2. `HomeFlow` usa `HomeView()` directamente (sin `FlowStack`) porque cada tab tiene su propio `NavigationStack`
3. `AuthFlow` usa `FlowStack` porque necesita push/pop entre login, registro, etc.
4. Los `RouterManager` se registran como `DependencyKey`
5. Las Views usan `@DependencyState` para acceder al router
6. Los ViewModels usan `@Dependency` para navegar
7. `FlowStack` maneja la pila de navegacion automaticamente
8. Usar `Tab` / `TabSection` con `.tabViewStyle(.sidebarAdaptable)` para layout adaptable iPad/iPhone

---

## Compatibilidad iOS 26

En iOS 26, los NavigationStacks anidados causan que el navigation bar interno desaparezca completamente (sin titulo, sin search, sin toolbar). Esto afecta especialmente a iPads con el nuevo tab bar superior.

`ThemedNavigationViewStyle` tiene un branch `#available(iOS 26, *)` que usa solo modifiers ligeros de SwiftUI (.tint, .toolbarColorScheme) en vez de UINavigationBarAppearance manual, que interfiere con el rendering de Liquid Glass.
