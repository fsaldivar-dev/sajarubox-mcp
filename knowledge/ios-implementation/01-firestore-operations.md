# Operaciones Firestore

> Guia para leer, escribir y consultar datos en Firestore desde iOS.

---

## Colecciones

| Coleccion | Documento ID | Descripcion |
|-----------|-------------|-------------|
| `users` | Firebase Auth UID | Usuarios de la app |
| `members` | UUID generado | Miembros del gimnasio |
| `membership_plans` | UUID generado | Planes de membresia |
| `user_emails` | Email normalizado | Indice email → userId |
| `app_config` | `"setup"` | Configuracion global |

---

## Estructura de documentos

### `users/{uid}`

```json
{
  "id": "abc123",
  "email": "admin@sajarubox.com",
  "fullName": "Francisco Saldivar",
  "phone": null,
  "role": "admin",
  "isActive": true,
  "photoURL": null,
  "createdAt": "2026-01-15T10:30:00Z",
  "updatedAt": "2026-01-15T10:30:00Z"
}
```

### `members/{memberId}`

```json
{
  "id": "uuid-1234",
  "firstName": "Juan",
  "paternalLastName": "Garcia",
  "maternalLastName": "Lopez",
  "phone": "5512345678",
  "emergencyPhone": "5587654321",
  "diseases": "No",
  "injuries": "No",
  "otherNotes": null,
  "birthDate": "1990-05-20T00:00:00Z",
  "guardianInfo": null,
  "membershipPlanId": "plan-uuid",
  "membershipStatus": "active",
  "registrationDate": "2026-01-10T00:00:00Z",
  "membershipStartDate": "2026-01-10T00:00:00Z",
  "membershipEndDate": "2026-02-09T00:00:00Z",
  "familyGroupId": null,
  "isActive": true,
  "createdAt": "2026-01-10T12:00:00Z",
  "updatedAt": "2026-01-10T12:00:00Z"
}
```

### `membership_plans/{planId}`

```json
{
  "id": "plan-uuid",
  "name": "Mensualidad",
  "price": 350.0,
  "currency": "MXN",
  "durationInDays": 30,
  "description": "Acceso ilimitado por 1 mes",
  "isActive": true,
  "sortOrder": 1,
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-01T00:00:00Z"
}
```

### `user_emails/{email}`

```json
{
  "primaryUserId": "firebase-auth-uid",
  "email": "admin@sajarubox.com",
  "createdAt": "2026-01-15T10:30:00Z"
}
```

### `app_config/setup`

```json
{
  "adminUserId": "firebase-auth-uid",
  "createdAt": "2026-01-15T10:30:00Z"
}
```

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
public func getMember(byId memberId: String) async throws -> Member? {
    let document = try await collection.document(memberId).getDocument()
    guard document.exists else { return nil }
    return try document.data(as: Member.self)
}
```

`document.data(as:)` usa `Codable` automaticamente. El modelo debe conformar a `Codable`.

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
