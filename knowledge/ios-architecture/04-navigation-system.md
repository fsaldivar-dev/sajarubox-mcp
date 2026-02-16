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
struct AppFeatures: View {
    @Dependency(\.globalRouter) var globalRouter
    
    var body: some View {
        switch globalRouter.navigator.current {
        case .login:
            AuthFlow()
        case .home:
            HomeFlow()
        }
    }
}
```

**Transiciones:**
- Login exitoso: `globalRouter.navigator.next(.home)`
- Cerrar sesion: `router.pop(.login)` (desde HomeView con `@Environment(Phase<AppPhase>.self)`)

---

## Navegacion interna: Router + FlowStack

Dentro de cada flujo, se usa `Router<Destination>` con `FlowStack`:

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

## Diagrama de navegacion

```
SajaruBoxApp
    └── AppFeatures (Phase<AppPhase>)
            ├── .login → AuthFlow (Router<AuthRoute>)
            │               ├── .login → LoginView
            │               ├── .register → RegisterView
            │               └── .recoverPassword → (placeholder)
            │
            └── .home → HomeFlow (Router<HomeRoute>)
                          └── .welcome → HomeView (TabView)
                                          ├── MembersView (admin)
                                          ├── MembershipPlansView (admin)
                                          ├── Ventas (placeholder)
                                          ├── Perfil (todos)
                                          └── Config (admin)
```

---

## Resumen

| Nivel | Componente | Uso |
|-------|-----------|-----|
| Global | `Phase<AppPhase>` + `GlobalRouterManager` | Cambiar entre login y home |
| Modulo | `Router<Route>` + `FlowStack` + `RouterManager` | Navegar dentro de un flujo |

---

## Reglas

1. Cada flujo (Auth, Home, etc.) tiene su propio `RouterManager`
2. Los `RouterManager` se registran como `DependencyKey`
3. Las Views usan `@DependencyState` para acceder al router
4. Los ViewModels usan `@Dependency` para navegar
5. `FlowStack` maneja la pila de navegacion automaticamente
