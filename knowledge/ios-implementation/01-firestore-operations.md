# Operaciones Firestore (iOS)

> Patrones de codigo Swift para leer, escribir y consultar datos en Firestore.
> Para la estructura de documentos y campos, ver `knowledge/schema.md`.

---

## Colecciones que iOS gestiona

| Coleccion | Repositorio Swift | Notas |
|-----------|-------------------|-------|
| `users` | `FirestoreUserRepository` | |
| `members` | `FirestoreMemberRepository` | Incluye `membershipPlanSnapshot` como sub-mapa |
| `membership_plans` | `FirestoreMembershipPlanRepository` | |
| `check_ins` | `FirestoreCheckInRepository` | |
| `payments` | `FirestorePaymentRepository` | Incluye `membershipPlanSnapshot` como sub-mapa |
| `user_emails` | `FirestoreUserRepository` (metodos de indice) | |
| `app_config` | `FirestoreUserRepository` (metodos de admin setup) | |

---

## Seleccion de datasource por ambiente (esquema iOS)

La seleccion de Firestore DB y Storage bucket se resuelve al arranque segun `SWIFT_ACTIVE_COMPILATION_CONDITIONS` del esquema:

- `TEST` -> Firestore `test`, Storage `sajarubox_test`
- `STAGE` -> Firestore `stage`, Storage `sajarubox_stage`
- `RELEASE` -> Firestore `prod`, Storage `sajarubox_prod`

Referencia tecnica:
- `SajaruBox/SajaruAppDelegate.swift` (`configureFirebaseDataSources`)
- `FirebaseDataSourceEnvironment.configure(...)`

Diagnostico rapido:
- Verificar el log de arranque:
  - `Firebase compileConfiguration=... appEnvironment=... firestoreDatabase=... storageBucket=...`
- Si el esquema es correcto pero el log no coincide, revisar `SWIFT_ACTIVE_COMPILATION_CONDITIONS` en `project.pbxproj` y `buildConfiguration` del `.xcscheme`.

---

## Patron de repositorio

Todos los repositorios son `actor` que reciben `Firestore` en el init:

```swift
public actor FirestoreMemberRepository: MemberRepository {
    private let db: Firestore
    private let collectionName: String
    
    private var collection: CollectionReference {
        db.collection(collectionName)
    }
    
    public init(
        collection: String = "members",
        db: Firestore = Firestore.firestore()
    ) {
        self.collectionName = collection
        self.db = db
    }
}
```

---

## Operaciones CRUD

### Leer un documento por ID

```swift
// Para colecciones single-platform (members, membership_plans, etc.)
public func getMember(byId memberId: String) async throws -> Member? {
    let document = try await collection.document(memberId).getDocument()
    guard document.exists else { return nil }
    return try document.data(as: Member.self)
}
```

`document.data(as:)` usa `Codable` automaticamente. El modelo debe conformar a `Codable`.

**EXCEPCION: coleccion `users`** — NUNCA usar `data(as: User.self)` porque los documentos pueden tener campos Android (`nombre`, `telefono`, `activo`) en vez de iOS (`fullName`, `phone`, `isActive`). Usar siempre el metodo `decodeUser(from:)` que maneja ambos esquemas. Ver `schema.md` seccion "Mapeo cross-platform".

### Leer todos los documentos

```swift
public func getAllMembers() async throws -> [Member] {
    let snapshot = try await collection
        .order(by: "paternalLastName", descending: false)
        .getDocuments()
    
    return try snapshot.documents.compactMap { document in
        try document.data(as: Member.self)
    }
}
```

### Leer con filtro

```swift
public func getActiveMembers() async throws -> [Member] {
    let snapshot = try await collection
        .whereField("isActive", isEqualTo: true)
        .order(by: "paternalLastName", descending: false)
        .getDocuments()
    
    return try snapshot.documents.compactMap { document in
        try document.data(as: Member.self)
    }
}
```

### Crear documento

Dos formas equivalentes:

```swift
// Forma 1: setData con Encoder (mas control)
let encoded = try Firestore.Encoder().encode(member)
try await collection.document(member.id).setData(encoded)

// Forma 2: setData(from:) directo
try collection.document(user.id).setData(from: user)
```

### Actualizar documento (merge)

```swift
let encoded = try Firestore.Encoder().encode(member)
try await collection.document(member.id).setData(encoded, merge: true)
```

`merge: true` solo actualiza los campos que se envian, no borra los demas.

### Actualizar campos especificos

```swift
try await collection.document(memberId).updateData([
    "isActive": false,
    "updatedAt": FieldValue.serverTimestamp()
])
```

`FieldValue.serverTimestamp()` usa la hora del servidor de Firestore (mas confiable que `Date()`).

### Eliminar documento (no recomendado)

```swift
try await collection.document(userId).delete()
```

**Preferir soft delete:** cambiar `isActive` a `false` en vez de eliminar.

---

## Soft delete pattern

```swift
public func deleteMember(_ memberId: String) async throws {
    let document = try await collection.document(memberId).getDocument()
    guard document.exists else {
        throw MemberError.memberNotFound
    }
    try await collection.document(memberId).updateData([
        "isActive": false,
        "updatedAt": FieldValue.serverTimestamp()
    ])
}
```

---

## Indice de email (multi-proveedor)

### Registrar

```swift
public func registerEmailIndex(email: String, userId: String) async throws {
    let normalized = email.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
    try await db.collection("user_emails").document(normalized).setData([
        "primaryUserId": userId,
        "email": normalized,
        "createdAt": FieldValue.serverTimestamp()
    ])
}
```

### Consultar

```swift
public func resolveUserIdByEmail(_ email: String) async throws -> String? {
    let normalized = email.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
    let document = try await db.collection("user_emails").document(normalized).getDocument()
    guard document.exists, let data = document.data() else { return nil }
    return data["primaryUserId"] as? String
}
```

---

## Admin setup

### Verificar si ya hay admin

```swift
public func isAdminSetupComplete() async throws -> Bool {
    let document = try await db.collection("app_config").document("setup").getDocument()
    return document.exists
}
```

### Marcar setup completado

```swift
public func markAdminSetupComplete(adminUserId: String) async throws {
    try await db.collection("app_config").document("setup").setData([
        "adminUserId": adminUserId,
        "createdAt": FieldValue.serverTimestamp()
    ])
}
```

---

## Busqueda de texto

Firestore no soporta busqueda full-text. Se hace local:

```swift
public func searchMembers(query: String) async throws -> [Member] {
    let allMembers = try await getActiveMembers()
    let q = query.lowercased()
    
    return allMembers.filter { member in
        member.firstName.lowercased().contains(q) ||
        member.paternalLastName.lowercased().contains(q) ||
        (member.maternalLastName?.lowercased().contains(q) ?? false) ||
        (member.phone?.contains(query) ?? false)
    }
}
```

---

## Count de documentos (sin descargarlos)

```swift
public func getUserCount() async throws -> Int {
    let countQuery = collection.count
    let snapshot = try await countQuery.getAggregation(source: .server)
    return Int(truncating: snapshot.count)
}
```

---

## Colisiones de nombres con FirebaseFirestore

`FirebaseFirestore` define varios tipos que pueden colisionar con tipos de nuestros modulos Core:

| Tipo de Firebase | Modulo que colisiona | Solucion |
|-----------------|---------------------|----------|
| `FirebaseFirestore.Transaction` | `PaymentsCore.Transaction` | Calificar como `PaymentsCore.Transaction` |
| `FirebaseFirestore.DocumentSnapshot` | — | No colisiona actualmente |
| `FirebaseFirestore.Timestamp` | — | No colisiona actualmente |

### Regla

Cuando un repositorio Firestore importa tanto `FirebaseFirestore` como un modulo Core que define un tipo con nombre generico, **calificar el tipo con el nombre del modulo**:

```swift
// En FirestorePaymentRepository.swift
// INCORRECTO — ambiguo con FirebaseFirestore.Transaction
public func getTransactions(by paymentId: String) async throws -> [Transaction]

// CORRECTO
public func getTransactions(by paymentId: String) async throws -> [PaymentsCore.Transaction]
```

### Nombres a evitar (o calificar) en modulos Core

Si un modulo Core define alguno de estos nombres, documentar la ambiguedad en la guia del modulo:

- `Transaction` (colisiona con `FirebaseFirestore.Transaction`)
- `Error` (colisiona con `Swift.Error`)
- `Query` (colisiona con `FirebaseFirestore.Query`)
- `Snapshot` (colisiona con `FirebaseFirestore.DocumentSnapshot`, `QuerySnapshot`)
- `FieldValue` (colisiona con `FirebaseFirestore.FieldValue`)
