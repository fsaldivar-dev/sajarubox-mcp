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
                          └── HomeView (TabView)
                                ├── MembersView (NavigationStack propio)
                                ├── MembershipPlansView (NavigationStack propio)
                                ├── InventoryView (NavigationStack propio)
                                ├── Perfil (todos)
                                └── Config (admin)
```

---

## Resumen

| Nivel | Componente | Uso |
|-------|-----------|-----|
| Global | `Phase<AppPhase>` + `GlobalRouterManager` | Cambiar entre login y home |
| Modulo (con push) | `Router<Route>` + `FlowStack` + `RouterManager` | Navegar dentro de AuthFlow |
| Tab | `NavigationStack` directo | Navegar dentro de cada tab de HomeView |

---

## Reglas

1. **NUNCA anidar NavigationStacks.** `FlowStack` ya crea un `NavigationStack` interno. Si un tab necesita `NavigationStack`, el Flow padre NO debe usar `FlowStack`
2. `HomeFlow` usa `HomeView()` directamente (sin `FlowStack`) porque cada tab tiene su propio `NavigationStack`
3. `AuthFlow` usa `FlowStack` porque necesita push/pop entre login, registro, etc.
4. Los `RouterManager` se registran como `DependencyKey`
5. Las Views usan `@DependencyState` para acceder al router
6. Los ViewModels usan `@Dependency` para navegar
7. `FlowStack` maneja la pila de navegacion automaticamente

---

## Compatibilidad iOS 26

En iOS 26, los NavigationStacks anidados causan que el navigation bar interno desaparezca completamente (sin titulo, sin search, sin toolbar). Esto afecta especialmente a iPads con el nuevo tab bar superior.

`ThemedNavigationViewStyle` tiene un branch `#available(iOS 26, *)` que usa solo modifiers ligeros de SwiftUI (.tint, .toolbarColorScheme) en vez de UINavigationBarAppearance manual, que interfiere con el rendering de Liquid Glass.
