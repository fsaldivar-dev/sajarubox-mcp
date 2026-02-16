# Flujo de autenticacion

> Implementacion completa del login, registro y manejo de errores en iOS.

---

## AuthProvider pattern

La autenticacion usa un patron de factory:

```swift
// Protocolo
public protocol AuthProvider: Sendable {
    func provide(type: AuthProviders) async throws -> AuthAuthenticator
}

// Tipos de auth
public enum AuthProviders {
    case google
    case credentials(credentials: AuthCredential)
    case apple
    case register(credentials: AuthCredential)
}

// Cada autenticador retorna un UserID
public protocol AuthAuthenticator: Sendable {
    func authenticate() async throws -> UserID
}
```

### Implementacion (FirebaseVendor)

```swift
public struct AuthProviderImplement: AuthProvider {
    public func provide(type: AuthProviders) async throws -> AuthAuthenticator {
        switch type {
        case .google:
            return FirebaseAuthGoogle()
        case .credentials(let credentials):
            return FirebaseAuthWithCredentialService(whith: credentials)
        case .apple:
            return FirebaseAuthWithApplicationService()
        case .register(let credentials):
            return FirebaseRegisterService(whith: credentials)
        }
    }
}
```

---

## Login con email/password

```swift
func onLoginWithCredentials() {
    currentTask = Task {
        data.clearErrors()
        
        // 1. Validacion local
        guard !data.email.isEmpty else {
            data.emailError = "Ingresa tu correo electronico."
            return
        }
        guard !data.password.isEmpty else {
            data.passwordError = "Ingresa tu contrasena."
            return
        }
        
        data.isLoading = true
        defer { data.isLoading = false }
        
        do {
            // 2. Crear value types
            let email = data.email
            let password = Password(raw: data.password)
            let credentials = AuthCredential(
                email: try .init(validating: email),
                password: password
            )
            
            // 3. Autenticar con Firebase
            let userId = try await authProvider
                .provide(type: .credentials(credentials: credentials))
                .authenticate()
            
            // 4. Resolver sesion
            let firebaseUser = Auth.auth().currentUser
            _ = try await sessionResolver.resolve(
                userId: userId.value,
                email: email,
                fullName: firebaseUser?.displayName ?? ""
            )
            
            // 5. Navegar a home
            globalRouter.navigator.next(.home)
        } catch {
            handleError(error)
        }
    }
}
```

### Internamente: Firebase Auth

```swift
// FirebaseAuthWithCredentialService
public func authenticate() async throws -> UserID {
    let authResult = try await auth.signIn(
        withEmail: credentials.email.rawValue,
        password: credentials.password.raw()
    )
    return UserID(authResult.user.uid)
}
```

---

## Login con Google

```swift
func onLoginGoogle() {
    currentTask = Task {
        data.clearErrors()
        data.isLoading = true
        defer { data.isLoading = false }
        
        do {
            let userId = try await authProvider
                .provide(type: .google)
                .authenticate()
            
            let firebaseUser = Auth.auth().currentUser
            _ = try await sessionResolver.resolve(
                userId: userId.value,
                email: firebaseUser?.email ?? "",
                fullName: firebaseUser?.displayName ?? ""
            )
            globalRouter.navigator.next(.home)
        } catch {
            handleError(error)
        }
    }
}
```

### Internamente: Google Sign-In

```swift
// FirebaseAuthGoogle
@MainActor
public func authenticate() async throws -> UserID {
    // 1. Obtener root view controller
    guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
          let rootViewController = windowScene.windows.first?.rootViewController else {
        throw AuthError.unknown("No view controller")
    }
    
    // 2. Configurar Google Sign In
    let config = GIDConfiguration(clientID: FirebaseApp.app()!.options.clientID!)
    GIDSignIn.sharedInstance.configuration = config
    
    // 3. Presentar Google Sign In
    let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: rootViewController)
    
    // 4. Obtener tokens
    let idToken = result.user.idToken!.tokenString
    let accessToken = result.user.accessToken.tokenString
    
    // 5. Crear credencial de Firebase
    let credential = GoogleAuthProvider.credential(
        withIDToken: idToken,
        accessToken: accessToken
    )
    
    // 6. Autenticar con Firebase
    let authResult = try await Auth.auth().signIn(with: credential)
    return UserID(authResult.user.uid)
}
```

---

## Registro con email/password

```swift
func register() {
    currentTask = Task {
        data.clearErrors()
        var hasError = false
        
        // Validaciones
        if data.fullName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            data.fullNameError = "Ingresa tu nombre completo."
            hasError = true
        }
        if data.email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            data.emailError = "Ingresa tu correo electronico."
            hasError = true
        }
        if data.password.isEmpty {
            data.passwordError = "Ingresa una contrasena."
            hasError = true
        } else if data.password.count < 6 {
            data.passwordError = "La contrasena debe tener al menos 6 caracteres."
            hasError = true
        }
        if data.confirPassword.isEmpty {
            data.confirmPasswordError = "Confirma tu contrasena."
            hasError = true
        } else if data.password != data.confirPassword {
            data.confirmPasswordError = "Las contrasenas no coinciden."
            hasError = true
        }
        
        guard !hasError else { return }
        
        data.isLoading = true
        defer { data.isLoading = false }
        
        do {
            let credentials = AuthCredential(
                email: try .init(validating: data.email),
                password: Password(raw: data.password)
            )
            let userId = try await authProvider
                .provide(type: .register(credentials: credentials))
                .authenticate()
            
            _ = try await sessionResolver.resolve(
                userId: userId.value,
                email: data.email,
                fullName: data.fullName
            )
            globalRouter.navigator.next(.home)
        } catch {
            handleError(error)
        }
    }
}
```

### Internamente: Firebase createUser

```swift
// FirebaseRegisterService
public func authenticate() async throws -> UserID {
    let authResult = try await auth.createUser(
        withEmail: credentials.email.rawValue,
        password: credentials.password.raw()
    )
    return UserID(authResult.user.uid)
}
```

---

## Manejo de errores: AuthErrorMapper

Mapea errores de Firebase Auth a mensajes en espanol con campo afectado:

```swift
struct AuthFieldError {
    enum Field { case email, password, general }
    let field: Field
    let message: String
}

enum AuthErrorMapper {
    static func map(_ error: Error) -> AuthFieldError {
        // 1. Errores de validacion de Email
        if let emailError = error as? Email.ValidationError {
            return mapEmailValidation(emailError)
        }
        
        // 2. Errores de Firebase Auth
        let nsError = error as NSError
        guard let code = AuthErrorCode(rawValue: nsError.code) else {
            return AuthFieldError(field: .general, message: "Error inesperado.")
        }
        
        return mapFirebaseAuth(code)
    }
}
```

### Mapeo de codigos

| Codigo Firebase | Campo | Mensaje |
|-----------------|-------|---------|
| `invalidEmail` | email | "El formato del correo es invalido." |
| `userNotFound` | general | "Correo o contrasena incorrectos." |
| `wrongPassword` | general | "Correo o contrasena incorrectos." |
| `invalidCredential` | general | "Correo o contrasena incorrectos." |
| `emailAlreadyInUse` | general | "No se pudo completar el registro. Intenta iniciar sesion." |
| `weakPassword` | password | "La contrasena es muy debil (minimo 6 caracteres)." |
| `userDisabled` | general | "Esta cuenta ha sido deshabilitada." |
| `tooManyRequests` | general | "Demasiados intentos. Espera un momento." |
| `networkError` | general | "Sin conexion a internet." |

**Regla de seguridad:** `userNotFound`, `wrongPassword` e `invalidCredential` siempre muestran el mismo mensaje generico para no revelar si un email existe.

---

## Cierre de sesion

```swift
private func signOut() {
    try? Auth.auth().signOut()
    currentUser.clearSession()
    router.pop(.login)
}
```

---

## Cancelacion de tasks

Todos los ViewModels manejan cancelacion para evitar leaks:

```swift
private var currentTask: Task<Void, Never>?

private func resetTask() {
    currentTask?.cancel()
    currentTask = nil
}

deinit {
    currentTask?.cancel()
    currentTask = nil
}
```
