# iOS Implementation: Modulo de Clases

> Detalles de implementacion especificos de iOS para el modulo de clases.
> Para reglas de negocio, ver `business-rules/10-classes.md`.

---

## Arquitectura

Sigue el patron de 5 pasos del proyecto:

| Paso | Package | Archivos |
|------|---------|----------|
| 1. Modelo | PlatformCore/ClassesCore | `GymClass.swift`, `ClassAttendance.swift`, `ClassBooking.swift` |
| 2. Firebase | Vendors/FirebaseVendor | `FirestoreGymClassRepository.swift`, `FirestoreClassAttendanceRepository.swift` |
| 3. DI | PlatformAppiOS | `ClassesDependencies.swift` |
| 4. Local | App/Data/Local | `GymClassLocal.swift` |
| 5. UI | App/Presentation/ClassesModule | `ClassScheduleView`, `ClassFormView`, `ClassDetailView` |

---

## Modelos de dominio (ClassesCore)

### GymClass

```swift
public struct GymClass: Codable, Identifiable, Equatable, Sendable {
    public let id: String
    public let name: String              // Firestore: "nombre"
    public let date: Date                // Firestore: "fecha"
    public let startTime: String         // Firestore: "horaInicio" (HH:mm)
    public let durationMinutes: Int      // Firestore: "duracionMin"
    public let maxCapacity: Int          // Firestore: "capacidadMax"
    public let gymId: String             // Siempre "sajarubox"
    public let description: String?      // Opcional (iOS only)
    public let isActive: Bool            // Soft delete (iOS only)
    public let recurrenceGroupId: String? // Agrupa clases en lote (iOS only)
    public let createdAt: Date
    public let updatedAt: Date
}
```

### ClassAttendance

```swift
public struct ClassAttendance: Codable, Identifiable, Equatable, Sendable {
    public let id: String
    public let classId: String           // FK a classes
    public let userId: String?           // FK a users
    public let memberId: String?         // FK a members (iOS only)
    public let attended: Bool            // Firestore: "asistio"
    public let timestamp: Date
}
```

### ClassBooking

```swift
public struct ClassBooking: Codable, Identifiable, Equatable, Sendable {
    public let id: String
    public let classId: String
    public let userId: String
    public let gymId: String
    public let status: String            // Firestore: "estado"
    public let createdAt: Date
}
```

---

## Repositorios

### GymClassRepository

```swift
public protocol GymClassRepository: Sendable {
    func getClasses(for date: Date) async throws -> [GymClass]
    func getClassesInRange(from: Date, to: Date) async throws -> [GymClass]
    func getClass(byId id: String) async throws -> GymClass?
    func createClass(_ gymClass: GymClass) async throws -> GymClass
    func createClasses(_ classes: [GymClass]) async throws  // Batch
    func updateClass(_ gymClass: GymClass) async throws -> GymClass
    func deleteClass(_ id: String) async throws              // Soft delete
    func deleteRecurrenceGroup(_ groupId: String) async throws
}
```

### ClassAttendanceRepository

```swift
public protocol ClassAttendanceRepository: Sendable {
    func getAttendance(for classId: String) async throws -> [ClassAttendance]
    func getAttendanceForMember(_ memberId: String, in range: ClosedRange<Date>) async throws -> [ClassAttendance]
}
```

---

## Firestore: Mapeo de campos

Los repositorios Firebase hacen encode/decode **manual** (no `Codable` automatico) porque los nombres de campos en Firestore estan en español.

### Encode (Swift → Firestore)

```swift
private func encode(_ gymClass: GymClass) -> [String: Any] {
    var data: [String: Any] = [
        "nombre": gymClass.name,
        "fecha": Timestamp(date: gymClass.date),
        "horaInicio": gymClass.startTime,
        "duracionMin": gymClass.durationMinutes,
        "capacidadMax": gymClass.maxCapacity,
        "gymId": gymClass.gymId,
        "isActive": gymClass.isActive,
        "createdAt": Timestamp(date: gymClass.createdAt),
        "updatedAt": Timestamp(date: gymClass.updatedAt)
    ]
    if let desc = gymClass.description { data["description"] = desc }
    if let groupId = gymClass.recurrenceGroupId { data["recurrenceGroupId"] = groupId }
    return data
}
```

### Decode (Firestore → Swift)

Usa casting manual (`data["nombre"] as? String`) con defaults para campos faltantes. El campo `isActive` defaults a `true` si no existe (compatibilidad con documentos creados por Android).

---

## Batch write (recurrencia)

La creacion de clases recurrentes usa **Firestore batch write**:

```swift
let batch = db.batch()
for gymClass in classes {
    let ref = collection.document(gymClass.id)
    batch.setData(encode(gymClass), forDocument: ref)
}
try await batch.commit()
```

Todas las clases del lote comparten el mismo `recurrenceGroupId`.

---

## Inyeccion de dependencias

```swift
@Dependency(\.gymClassRepository) var gymClassRepository
@Dependency(\.classAttendanceRepository) var classAttendanceRepository
```

---

## Presentacion

### ClassScheduleView (vista principal)

- `NavigationStack` con `.themedNavigationViewStyle()`
- Selector de semana (ScrollView horizontal con chips de dia)
- Lista de clases del dia seleccionado ordenadas por `startTime`
- Cada fila muestra: hora, nombre, duracion, capacidad
- `.searchable` para buscar clases por nombre
- Toolbar con boton "+" para crear
- `.sheet(item:)` para formulario y detalle

### ClassFormView (crear/editar)

- Modo individual: nombre, descripcion, fecha, hora, duracion, capacidad
- Modo recurrente (toggle): nombre, descripcion, hora, duracion, capacidad + dias de semana + rango de fechas
- Preview: "Se crearan N clases"
- Al guardar en modo recurrente: genera array de `GymClass` con `recurrenceGroupId` y llama `createClasses(_:)`

### ClassDetailView (detalle + asistencia)

- Info de la clase (nombre, fecha, hora, duracion, capacidad)
- Seccion de asistencia (de `classAttendance`)
- Cada fila: nombre/ID del usuario o miembro + badge asistio/falta

---

## Tab en HomeView

```swift
if currentUser.isAdmin || currentUser.role == .receptionist {
    ClassScheduleView()
        .tabItem {
            Label("Clases", systemImage: "calendar.badge.clock")
        }
}
```

Ubicado entre el tab de Inventario y el tab de Perfil.
