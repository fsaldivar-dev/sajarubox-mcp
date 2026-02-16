# Crear un nuevo modulo

> Guia paso a paso para agregar una nueva pantalla/feature a la app iOS.

---

## Estructura final

```
App/Presentation/NuevoModule/
├── NuevoView.swift
├── NuevoViewData.swift
└── NuevoViewModel.swift
```

---

## Paso 1: Crear el ViewData

```swift
// NuevoViewData.swift

struct NuevoViewData {
    // Campos del formulario
    var nombre: String = ""
    var telefono: String = ""
    
    // Errores inline
    var nombreError: String?
    var telefonoError: String?
    var generalError: String?
    
    // Estado de carga
    var isLoading: Bool = false
    
    // Datos cargados
    var items: [AlgunModelo] = []
    
    mutating func clearErrors() {
        nombreError = nil
        telefonoError = nil
        generalError = nil
    }
}
```

**Checklist:**
- [ ] Es un `struct`
- [ ] Campos de formulario son `String`
- [ ] Errores son `String?`
- [ ] Tiene `isLoading: Bool`
- [ ] Tiene metodo `clearErrors()`

---

## Paso 2: Crear el ViewModel

### Definir el protocolo

```swift
// NuevoViewModel.swift

import SwiftUI
import Dependencies

@MainActor
protocol NuevoViewModel: ObservableObject {
    var data: NuevoViewData { get set }
    func onAppear()
    func guardar()
}
```

### Implementar

```swift
final class NuevoViewModelImpl: NuevoViewModel {
    // Dependencias
    @Dependency(\.algunRepository) var repository
    @Dependency(\.globalRouter) var globalRouter
    
    // Estado
    @Published var data: NuevoViewData
    private var currentTask: Task<Void, Never>?
    
    init(data: NuevoViewData = .init()) {
        self.data = data
    }
    
    // MARK: - Cargar datos
    
    func onAppear() {
        currentTask?.cancel()
        currentTask = Task {
            data.isLoading = true
            defer { data.isLoading = false }
            
            do {
                data.items = try await repository.getAll()
            } catch {
                data.generalError = "Error al cargar datos."
            }
        }
    }
    
    // MARK: - Guardar
    
    func guardar() {
        currentTask?.cancel()
        currentTask = Task {
            data.clearErrors()
            
            // Validacion local
            guard !data.nombre.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                data.nombreError = "El nombre es requerido."
                return
            }
            
            data.isLoading = true
            defer { data.isLoading = false }
            
            do {
                // Crear el modelo de dominio
                let nuevo = AlgunModelo(nombre: data.nombre, telefono: data.telefono)
                _ = try await repository.create(nuevo)
                
                // Recargar lista
                data.items = try await repository.getAll()
            } catch {
                data.generalError = "Error al guardar."
            }
        }
    }
    
    deinit {
        currentTask?.cancel()
    }
}
```

**Checklist:**
- [ ] `@MainActor final class`
- [ ] Implementa un protocolo que hereda de `ObservableObject`
- [ ] `@Published var data: ViewData`
- [ ] Dependencias con `@Dependency`
- [ ] Tasks cancelables
- [ ] Validacion local antes de llamadas remotas
- [ ] `defer { data.isLoading = false }` despues de `data.isLoading = true`

---

## Paso 3: Crear la View

```swift
// NuevoView.swift

import SwiftUI
import SajaruUI

struct NuevoView<ViewModel: NuevoViewModel>: View {
    @ObservedObject var viewModel: ViewModel
    @AppThemeBackground var background
    
    var body: some View {
        ZStack {
            background.base.ignoresSafeArea()
            
            VStack(spacing: 16) {
                // Campo de texto
                TextField("Nombre", text: $viewModel.data.nombre)
                    .textFieldStyle(.text)
                
                if let error = viewModel.data.nombreError {
                    Text(error)
                        .themedText(variant: .label3, colorVariant: .error)
                }
                
                // Boton
                Button("Guardar") {
                    viewModel.guardar()
                }
                .buttonStyle(.primary, size: .large)
                .disabled(viewModel.data.isLoading)
                
                // Error general
                if let error = viewModel.data.generalError {
                    Text(error)
                        .themedText(variant: .label2, colorVariant: .error)
                }
                
                // Lista de items
                ForEach(viewModel.data.items) { item in
                    Text(item.nombre)
                        .themedText(variant: .body1, colorVariant: .primary)
                }
            }
            .padding()
        }
        .onAppear {
            viewModel.onAppear()
        }
    }
}

#Preview("NuevoView") {
    NuevoView(viewModel: NuevoViewModelImpl())
        .previewModifierEnviroments()
}
```

**Checklist:**
- [ ] Generic sobre el protocolo del ViewModel
- [ ] `@ObservedObject var viewModel`
- [ ] Usa `@AppThemeBackground` y/o `@AppThemeColors`
- [ ] Usa style modifiers (`.themedText()`, `.buttonStyle()`, `.textFieldStyle()`)
- [ ] Muestra errores inline bajo cada campo
- [ ] Tiene `#Preview`

---

## Paso 4: Agregar navegacion

### En el Flow existente

Si el modulo es una pantalla dentro de un flujo existente:

```swift
// En el enum de rutas del flujo
enum HomeRoute: Hashable {
    case welcome
    case nuevo     // Agregar ruta
}

// En el FlowStack
case .nuevo:
    NuevoView(viewModel: NuevoViewModelImpl())
```

### Como un Tab

Si el modulo es un tab en HomeView:

```swift
// En HomeView.swift
TabView {
    NuevoView(viewModel: NuevoViewModelImpl())
        .tabItem {
            Label("Nuevo", systemImage: "plus.circle.fill")
        }
}
```

---

## Paso 5: Registrar dependencias (si es necesario)

Si el modulo necesita un repositorio nuevo:

### En PlatformCore: crear el protocolo

```swift
public protocol AlgunRepository: Sendable {
    func getAll() async throws -> [AlgunModelo]
    func create(_ item: AlgunModelo) async throws -> AlgunModelo
}
```

### En Vendors/Firebase: implementar

```swift
public actor FirestoreAlgunRepository: AlgunRepository {
    private let db: Firestore
    // ... implementar metodos
}
```

### Registrar como DependencyKey

```swift
extension FirestoreAlgunRepository: DependencyKey {
    public static var liveValue = FirestoreAlgunRepository()
}

extension DependencyValues {
    public var algunRepository: FirestoreAlgunRepository {
        get { self[FirestoreAlgunRepository.self] }
        set { self[FirestoreAlgunRepository.self] = newValue }
    }
}
```
