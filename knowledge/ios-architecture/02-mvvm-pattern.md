# Patron MVVM

> Model-View-ViewModel con ViewData. Patron principal para todos los modulos de la app iOS.

---

## Estructura de un modulo

Cada modulo (pantalla/feature) tiene 3 archivos:

```
LoginModule/
├── LoginView.swift         # Vista SwiftUI
├── LoginViewData.swift     # Estado de la UI
└── LoginViewModel.swift    # Logica y dependencias
```

---

## ViewData

Struct que contiene **todo el estado visible** de la pantalla. No contiene logica.

```swift
struct LoginViewData {
    var email: String = ""
    var password: String = ""
    
    var emailError: String?
    var passwordError: String?
    var generalError: String?
    
    var isLoading: Bool = false
    
    mutating func clearErrors() {
        emailError = nil
        passwordError = nil
        generalError = nil
    }
}
```

**Reglas:**
- Es un `struct` (value type)
- Solo contiene propiedades y metodos mutating simples (ej: `clearErrors`)
- Los campos de formulario son `String` (no value types como `Email` o `Password`)
- Los errores son `String?` (nil = sin error)
- Siempre tiene `isLoading: Bool`

---

## ViewModel

Clase que contiene la **logica del modulo**. Inyecta dependencias y modifica el ViewData.

```swift
@MainActor
protocol LoginViewModel: ObservableObject {
    var data: LoginViewData { get set }
    func onLoginGoogle()
    func onLoginApple()
    func onLoginWithCredentials()
}

final class LoginViewModelImpl: LoginViewModel {
    @Dependency(\.authRouter) var authRouter
    @Dependency(\.authProvider) var authProvider
    @Dependency(\.globalRouter) var globalRouter
    
    @Published var data: LoginViewData
    
    private let sessionResolver = SessionResolver()
    private var currentTask: Task<Void, Never>?
    
    init(data: LoginViewData = .init()) {
        self.data = data
    }
    
    func onLoginWithCredentials() {
        resetTask()
        currentTask = Task {
            data.clearErrors()
            // Validacion local
            guard !data.email.isEmpty else {
                data.emailError = "Ingresa tu correo."
                return
            }
            
            data.isLoading = true
            defer { data.isLoading = false }
            
            do {
                let credentials = AuthCredential(
                    email: try .init(validating: data.email),
                    password: Password(raw: data.password)
                )
                let userId = try await authProvider
                    .provide(type: .credentials(credentials: credentials))
                    .authenticate()
                _ = try await sessionResolver.resolve(
                    userId: userId.value,
                    email: data.email,
                    fullName: ""
                )
                globalRouter.navigator.next(.home)
            } catch {
                handleError(error)
            }
        }
    }
    
    private func handleError(_ error: Error) {
        let fieldError = AuthErrorMapper.map(error)
        switch fieldError.field {
        case .email: data.emailError = fieldError.message
        case .password: data.passwordError = fieldError.message
        case .general: data.generalError = fieldError.message
        }
    }
    
    private func resetTask() {
        currentTask?.cancel()
        currentTask = nil
    }
}
```

**Reglas:**
- Siempre `@MainActor final class`
- Implementa un protocolo que hereda de `ObservableObject`
- Tiene `@Published var data: ViewData`
- Usa `@Dependency` para inyeccion de dependencias
- Las operaciones async se ejecutan dentro de `Task`
- Los value types (`Email`, `Password`) se crean en el ViewModel, NO en el ViewData
- Maneja errores con `AuthErrorMapper` (u otro mapper segun el dominio)

---

## View

Vista SwiftUI que observa el ViewModel y renderiza el ViewData.

```swift
struct LoginView<ViewModel: LoginViewModel>: View {
    @ObservedObject var viewModel: ViewModel
    
    var body: some View {
        VStack {
            TextField("Email", text: $viewModel.data.email)
                .textFieldStyle(.email)
            
            if let error = viewModel.data.emailError {
                Text(error)
                    .themedText(variant: .label3, colorVariant: .error)
            }
            
            SecureField("Contrasena", text: $viewModel.data.password)
                .textFieldStyle(.password)
            
            Button("Iniciar sesion") {
                viewModel.onLoginWithCredentials()
            }
            .buttonStyle(.primary, size: .large)
            .disabled(viewModel.data.isLoading)
        }
    }
}
```

**Reglas:**
- Usa generics `<ViewModel: LoginViewModel>` para testabilidad
- Usa `@ObservedObject var viewModel: ViewModel`
- Bindings directos al ViewData: `$viewModel.data.email`
- Usa property wrappers de SajaruUI: `@AppThemeColors`, `@AppThemeBackground`
- Usa style modifiers de SajaruUI: `.themedText()`, `.buttonStyle()`, `.textFieldStyle()`
- No contiene logica de negocio

---

## Resumen del flujo de datos

```
View          ViewModel        ViewData
 │               │                │
 │  accion()  →  │                │
 │               │  data.x = y →  │
 │               │                │ (mutacion)
 │  ← @Published │  ← data       │
 │               │                │
 │  re-render    │                │
```

1. El usuario interactua con la View
2. La View llama un metodo del ViewModel
3. El ViewModel modifica el ViewData (`data.isLoading = true`)
4. `@Published` notifica a la View
5. SwiftUI re-renderiza
