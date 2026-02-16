# Inyeccion de dependencias

> Basada en la libreria `swift-dependencies` de Point-Free.

---

## Conceptos clave

| Concepto | Descripcion |
|----------|-------------|
| `@Dependency` | Property wrapper para inyectar una dependencia en un ViewModel |
| `DependencyKey` | Protocolo que define una dependencia y su valor por defecto |
| `DependencyValues` | Extension donde se registra la dependencia |

---

## Como registrar una dependencia

### 1. Crear el tipo

```swift
@Observable
final class CurrentUserManager {
    var user: UsersCore.User?
    var role: Role { user?.role ?? .member }
    var isAdmin: Bool { role == .admin }
    var isLoggedIn: Bool { user != nil }
    
    func clearSession() { user = nil }
}
```

### 2. Conformar a DependencyKey

```swift
extension CurrentUserManager: DependencyKey {
    static var liveValue: CurrentUserManager = CurrentUserManager()
}
```

### 3. Registrar en DependencyValues

```swift
extension DependencyValues {
    var currentUser: CurrentUserManager {
        get { self[CurrentUserManager.self] }
        set { self[CurrentUserManager.self] = newValue }
    }
}
```

### 4. Usar en un ViewModel

```swift
final class HomeViewModel {
    @Dependency(\.currentUser) var currentUser
    
    var userName: String {
        currentUser.user?.fullName ?? "Usuario"
    }
}
```

---

## Dependencias registradas

| Key | Tipo | Descripcion |
|-----|------|-------------|
| `\.currentUser` | `CurrentUserManager` | Usuario actual en sesion |
| `\.globalRouter` | `GlobalRouterManager` | Navegacion global (login/home) |
| `\.authRouter` | `AuthRouterManager` | Navegacion dentro del flujo de auth |
| `\.homeRouter` | `HomeRouterManager` | Navegacion dentro del home |
| `\.authProvider` | `AuthProviderImplement` | Factory de servicios de autenticacion |
| `\.userRepository` | `FirestoreUserRepository` | Repositorio de usuarios (Firestore) |
| `\.memberRepository` | `FirestoreMemberRepository` | Repositorio de miembros (Firestore) |
| `\.membershipPlanRepository` | `FirestoreMembershipPlanRepository` | Repositorio de planes (Firestore) |

---

## Repositorios como `actor`

Todos los repositorios de Firestore son `actor` para thread safety:

```swift
public actor FirestoreUserRepository: UserRepository {
    private let db: Firestore
    
    public func getUser(byUserId userId: String) async throws -> User? {
        let document = try await db.collection("users").document(userId).getDocument()
        guard document.exists else { return nil }
        return try document.data(as: User.self)
    }
}
```

**Regla:** Los repositorios son `actor`, los ViewModels son `@MainActor`. Las llamadas entre ellos son siempre `async/await`.

---

## DependencyState para Views

Cuando una View necesita acceder a una dependencia observable:

```swift
@propertyWrapper
struct DependencyState<Value: AnyObject & Observable>: DynamicProperty {
    @State private var instance: Value
    
    init(_ keyPath: KeyPath<DependencyValues, Value>) {
        @Dependency(keyPath) var importedValue
        _instance = State(initialValue: importedValue)
    }
    
    var wrappedValue: Value { instance }
    var projectedValue: Bindable<Value> { Bindable(instance) }
}
```

**Uso:**

```swift
struct HomeView: View {
    @DependencyState(\.currentUser) var currentUser
    
    var body: some View {
        Text(currentUser.user?.fullName ?? "")
    }
}
```

---

## RouterManager protocol

Protocolo base para los routers de navegacion:

```swift
protocol RouterManager: DependencyKey, ObservableObject, Observable {
    associatedtype R: Hashable
    init()
    var router: Router<R> { get set }
}
```

Cada modulo define su propio router:

```swift
@Observable
final class AuthRouterManager: RouterManager {
    var router: Router<AuthRoute> = .init(start: .login)
    init() {}
}
```
