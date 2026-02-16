# Sincronizacion de datos

> Arquitectura offline-first con sync bidireccional entre Firestore (remoto) y SwiftData (local).

---

## Estado actual

La infraestructura de sync esta definida en `DataSyncCore` pero **no esta implementada completamente**. Actualmente la app usa solo Firestore (online) sin cache local.

---

## Arquitectura planificada

### Protocolo Syncable

```swift
public protocol Syncable: Codable, Identifiable, Sendable {
    var id: String { get }
    var updatedAt: Date { get }
    var createdAt: Date { get }
}
```

Todos los modelos que participan en sync deben conformar a `Syncable`.

### SyncEngine

Motor generico de sync bidireccional:

```swift
public final class SyncEngine<Entity: Syncable> {
    private let remote: any RemoteStore<Entity>
    private let local: any LocalStore<Entity>
    
    // Estrategia: last-write-wins basado en updatedAt
    func sync() async throws -> SyncResult
    func push() async throws -> SyncResult
    func pull() async throws -> SyncResult
}
```

### RemoteStore (Firestore)

```swift
public protocol RemoteStore<Entity>: Sendable {
    associatedtype Entity: Syncable
    func getAll() async throws -> [Entity]
    func getModifiedAfter(_ date: Date) async throws -> [Entity]
    func upsert(_ entity: Entity) async throws
    func delete(_ id: String) async throws
}
```

Implementacion existente: `FirestoreStore<Entity>` en Vendors/Firebase.

### LocalStore (SwiftData)

```swift
public protocol LocalStore<Entity>: Sendable {
    associatedtype Entity: Syncable
    func getAll() async throws -> [Entity]
    func getPendingPush() async throws -> [Entity]
    func upsert(_ entity: Entity) async throws
    func delete(_ id: String) async throws
    func markSynced(_ id: String) async throws
}
```

Pendiente de implementar con SwiftData `@Model`.

---

## Estados de sync

| Estado | Descripcion |
|--------|-------------|
| `synced` | Datos iguales en local y remoto |
| `pendingPush` | Cambio local que aun no se subio |
| `pendingPull` | Cambio remoto que aun no se bajo |
| `conflict` | Cambio en ambos lados (resuelto por last-write-wins) |

---

## Estrategia de resolucion

**Last-write-wins:** Si hay conflicto, gana el registro con `updatedAt` mas reciente.

---

## SwiftData (local)

Para persistencia local, los modelos usan `@Model` con un protocolo `LocalPersistable`:

```swift
public protocol LocalPersistable {
    associatedtype DomainType
    func toDomain() -> DomainType
    static func fromDomain(_ domain: DomainType) -> Self
}
```

Esto permite convertir entre modelos de dominio (PlatformCore) y modelos de SwiftData.

---

## Roadmap

1. Fase actual: Solo Firestore online
2. Fase siguiente: SwiftData local + pull-only (cache)
3. Fase futura: Sync bidireccional completo con push/pull
