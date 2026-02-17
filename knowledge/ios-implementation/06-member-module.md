# Modulo de Miembros (iOS)

> Implementacion iOS del registro, edicion y gestion de miembros del gimnasio.
> Solo cubre **Camino 2: registro manual por admin**. El auto-registro (onboarding) es un modulo pendiente.
> Para reglas de negocio, ver `knowledge/business-rules/04-member-registration.md`.
> Para esquema Firestore, ver `knowledge/schema.md`.

---

## Estructura de archivos

```
sajaru-box-ios/
└── SajaruBox/App/Presentation/
    ├── MembersModule/
    │   ├── MemberViewData.swift      # Estado de la vista + MemberFormMode
    │   ├── MemberViewModel.swift     # CRUD, validacion, snapshot, familia
    │   └── MemberFormView.swift      # Formulario de registro/edicion
    └── HomeModule/Pages/
        └── MembersView.swift         # Lista principal (tab Miembros)

sajarubox-mobile-ios-packages/
├── Packages/PlatformCore/Sources/MembersCore/
│   └── Member.swift                  # Modelo, protocolo, enums, errores
├── Packages/Vendors/Sources/FirebaseVendor/Services/Members/
│   └── FirestoreMemberRepository.swift  # Implementacion Firestore (actor)
└── Packages/PlatformAppiOS/Sources/PlatformAppiOS/Dependencies/
    └── MemberDependencies/
        └── MemberDependencies.swift  # DependencyKey registration
```

---

## Diagrama de arquitectura

```mermaid
flowchart LR
    subgraph ui [Capa UI]
        MembersView --> MemberFormView
    end

    subgraph vm [ViewModel]
        MemberViewModel
    end

    subgraph deps [Dependencias]
        MemberRepo["@Dependency memberRepository"]
        PlanRepo["@Dependency membershipPlanRepository"]
        CurrentUser["@Dependency currentUser"]
    end

    subgraph infra [Infraestructura]
        FirestoreMemberRepo["FirestoreMemberRepository (actor)"]
        Firestore["Firestore: members/"]
    end

    MembersView -->|"@StateObject"| MemberViewModel
    MemberFormView -->|"@ObservedObject"| MemberViewModel
    MemberViewModel --> MemberRepo
    MemberViewModel --> PlanRepo
    MemberViewModel --> CurrentUser
    MemberRepo --> FirestoreMemberRepo
    FirestoreMemberRepo --> Firestore
```

---

## Flujo completo de registro (admin)

```mermaid
flowchart TD
    Start["Admin presiona + en MembersView"] --> ShowSheet["sheet: MemberFormView"]
    ShowSheet --> FillPersonal["Llenar datos personales"]
    FillPersonal --> FillContact["Llenar contacto, salud, etc."]
    FillContact --> SelectPlan{"Admin selecciono plan?"}

    SelectPlan -->|No| ClickSave1["Presiona Registrar"]
    ClickSave1 --> Validate1{"validateForm()"}
    Validate1 -->|Error| ShowErrors["Errores inline bajo campos"]
    ShowErrors --> FillPersonal
    Validate1 -->|OK| CheckDuplicate1{"Buscar duplicado"}
    CheckDuplicate1 -->|Duplicado| ShowDupAlert["Alert: Posible duplicado"]
    ShowDupAlert -->|Cancelar| FillPersonal
    ShowDupAlert -->|Continuar| CreatePending["performSave: status = pending"]
    CheckDuplicate1 -->|Sin duplicado| CreatePending
    CreatePending --> SaveFirestore["memberRepository.createMember()"]

    SelectPlan -->|Si| CheckFamilyPlan{"plan.maxMembers > 1?"}
    CheckFamilyPlan -->|No individual| ClickSave2["Presiona Registrar"]
    ClickSave2 --> Validate2{"validateForm()"}
    Validate2 -->|Error| ShowErrors
    Validate2 -->|OK| CheckDuplicate2{"Buscar duplicado"}
    CheckDuplicate2 -->|Duplicado| ShowDupAlert
    CheckDuplicate2 -->|Sin duplicado| BuildSnapshot["Crear MembershipPlanSnapshot"]

    CheckFamilyPlan -->|Si familiar| ChooseGroup{"Crear nuevo grupo o existente?"}
    ChooseGroup -->|Nuevo| GenUUID["familyGroupId = UUID()"]
    ChooseGroup -->|Existente| EnterGroupId["Ingresar groupId"]
    EnterGroupId --> LoadGroupMembers["loadFamilyGroupMembers()"]
    LoadGroupMembers --> ValidateLimit{"count < maxMembers?"}
    ValidateLimit -->|No| ShowGroupError["Error: grupo lleno"]
    ShowGroupError --> ChooseGroup
    ValidateLimit -->|Si| ClickSave3["Presiona Registrar"]
    ClickSave3 --> Validate3{"validateForm()"}
    Validate3 -->|OK| BuildSnapshot
    GenUUID --> ClickSave3

    BuildSnapshot --> CalcDates["Calcular fechas segun tipo"]
    CalcDates --> CreateActive["performSave: status = active"]
    CreateActive --> SaveFirestore
    SaveFirestore --> DismissSheet["Cerrar sheet + toast exito"]
    DismissSheet --> ReloadList["loadMembers()"]
```

---

## Calculo de fechas por tipo de plan

```mermaid
flowchart TD
    PlanType{"plan.type"}
    PlanType -->|timeBased| TB["endDate = startDate + durationInDays"]
    TB --> TB2["remainingVisits = nil"]
    PlanType -->|visitBased| VB["endDate = nil"]
    VB --> VB2["remainingVisits = totalVisits"]
    PlanType -->|mixed| MX["endDate = startDate + durationInDays"]
    MX --> MX2["remainingVisits = totalVisits"]
```

| Tipo | `membershipEndDate` | `remainingVisits` |
|------|--------------------:|------------------:|
| `time_based` | `startDate + durationInDays` | `nil` |
| `visit_based` | `nil` | `plan.totalVisits` |
| `mixed` | `startDate + durationInDays` | `plan.totalVisits` |

---

## Creacion de snapshot

Al asignar un plan se crea un `MembershipPlanSnapshot` inmutable:

```swift
MembershipPlanSnapshot(
    planName: plan.name,
    planType: plan.type.rawValue,  // "time_based", "visit_based", "mixed"
    planPrice: plan.price,
    planCurrency: plan.currency,   // "MXN"
    durationInDays: plan.durationInDays,
    totalVisits: plan.totalVisits,
    maxMembers: plan.maxMembers,
    assignedAt: Date(),
    assignedBy: currentUser.user?.id ?? "unknown"
)
```

El snapshot se almacena como sub-mapa en Firestore (NO como JSON string). Se codifica/decodifica manualmente en `FirestoreMemberRepository`.

---

## Validaciones del formulario

Implementadas en `MemberViewModel.validateForm()`:

| Campo | Regla | Mensaje de error |
|-------|-------|------------------|
| Nombre | Requerido, min 2 caracteres | "El nombre es requerido." |
| Primer apellido | Requerido, min 2 caracteres | "El primer apellido es requerido." |
| Telefono | Opcional, si se llena: min 10 digitos | "El telefono debe tener al menos 10 digitos." |
| Tel. emergencia | Opcional, si se llena: min 10 digitos | "El telefono de emergencia debe tener al menos 10 digitos." |
| Fecha nacimiento | Opcional, no en el futuro | "La fecha de nacimiento no puede ser en el futuro." |
| Datos del tutor | Requerido si `isFormMinor == true` | "Los datos del tutor son requeridos para menores de edad." |
| Grupo familiar | Si plan familiar y grupo existente: no exceder `maxMembers` | "El grupo familiar ya alcanzo el limite de N miembros." |
| Fecha inicio | No anterior a hoy | "La fecha de inicio no puede ser anterior a hoy." |

---

## Deteccion de duplicados

Se ejecuta **solo en modo creacion** (no en edicion).

```mermaid
flowchart TD
    Save["saveMember()"] --> IsEdit{"isEditing?"}
    IsEdit -->|Si| SkipDup["Saltar deteccion"]
    IsEdit -->|No| Normalize["normalizePhone(formPhone)"]
    Normalize --> Search["Buscar en data.members donde:"]
    Search --> Match{"firstName == && paternalLastName == && phone =="}
    Match -->|Sin match| Proceed["performSave()"]
    Match -->|Match| AlreadyWarned{"showDuplicateWarning ya mostrado?"}
    AlreadyWarned -->|No| ShowAlert["Mostrar alert con nombre del duplicado"]
    ShowAlert -->|Cancelar| Back["Volver al formulario"]
    ShowAlert -->|Continuar| Proceed
    AlreadyWarned -->|Si| Proceed
```

Criterios de match:
- `firstName` (case-insensitive, trimmed)
- `paternalLastName` (case-insensitive, trimmed)
- `phone` (normalizado a digitos, solo si no vacio)

---

## Normalizacion de telefono

```swift
private func normalizePhone(_ phone: String) -> String {
    phone.filter { $0.isNumber }
}
```

| Entrada | Normalizado |
|---------|-------------|
| `55 1234 5678` | `5512345678` |
| `+52 55 1234 5678` | `525512345678` |
| `(55) 1234-5678` | `5512345678` |
| Vacio | Vacio (se trata como "sin telefono") |

Se aplica antes de guardar y antes de buscar duplicados.

---

## Grupos familiares

### Decision de grupo en el formulario

```mermaid
flowchart TD
    PlanSelected{"plan.maxMembers > 1?"}
    PlanSelected -->|No| NoGroup["familyGroupId = nil"]
    PlanSelected -->|Si| ShowSection["Mostrar seccion Grupo familiar"]
    ShowSection --> Choice{"formCreateNewGroup?"}
    Choice -->|true| NewGroup["familyGroupId = UUID().uuidString"]
    Choice -->|false| EnterID["Admin ingresa groupId existente"]
    EnterID --> LoadMembers["loadFamilyGroupMembers()"]
    LoadMembers --> Validate{"count < maxMembers?"}
    Validate -->|Si| UseGroup["familyGroupId = formExistingFamilyGroupId"]
    Validate -->|No| Error["Error: grupo lleno"]
```

### Datos mostrados al seleccionar grupo existente

- Lista de miembros actuales del grupo (nombre completo)
- Cupo disponible: `maxMembers - count`
- Color del cupo: verde si hay espacio, rojo si lleno

---

## Permisos por rol

| Accion | admin | receptionist | trainer | member |
|--------|:-----:|:------------:|:-------:|:------:|
| Ver lista de miembros | Todos | Solo activos | No | No |
| Crear miembro | Si | Si | No | No |
| Editar miembro | Si | Si | No | No |
| Desactivar miembro | Si | Si | No | No |
| Reactivar miembro | Si | No | No | No |
| Ver miembros inactivos | Si | No | No | No |

Implementacion:

```swift
var isAdmin: Bool { currentUser.isAdmin }
var isAdminOrReceptionist: Bool { currentUser.isAdmin || currentUser.role == .receptionist }
```

- `loadMembers()`: admin usa `getAllMembers()`, otros usan `getActiveMembers()`
- Toolbar "+" visible solo si `isAdminOrReceptionist`
- Seccion "Inactivos" visible solo si `isAdmin`

---

## Estructura de MemberViewData

```swift
struct MemberViewData {
    var members: [Member] = []
    var isLoading: Bool = false
    var errorMessage: String?
    var successMessage: String?
    var formMode: MemberFormMode?          // nil = sheet cerrada
    var showDeleteConfirmation: Bool = false
    var memberToDelete: Member?
    var showDuplicateWarning: Bool = false
    var duplicateName: String?
}
```

### MemberFormMode

```swift
enum MemberFormMode: Identifiable {
    case create(id: String = UUID().uuidString)
    case edit(Member)
    
    var id: String { ... }      // Unico por instancia
    var member: Member? { ... } // nil si .create
}
```

Se usa `Identifiable` para `.sheet(item:)` y evitar bugs de re-presentacion.

---

## Secciones del formulario (MemberFormView)

| # | Seccion | Visibilidad | Campos |
|---|---------|-------------|--------|
| 1 | Datos personales | Siempre | `firstName*`, `paternalLastName*`, `maternalLastName` |
| 2 | Contacto | Siempre | `phone`, `emergencyPhone` |
| 3 | Nacimiento | Siempre | Toggle + `DatePicker`, indicador menor |
| 4 | Datos del tutor | Si `isFormMinor` | `guardianInfo` (texto libre) |
| 5 | Salud | Siempre | `diseases`, `injuries`, `otherNotes` |
| 6 | Membresia | Solo creacion | Picker de plan, detalles, fecha inicio |
| 7 | Grupo familiar | Solo si plan familiar | Segmented (nuevo/existente), lista grupo |
| 8 | Resumen | Si nombre completo | Nombre, plan, fecha, grupo |

---

## Busqueda local

```swift
var filteredMembers: [Member] {
    guard !searchText.isEmpty else { return data.members }
    let query = searchText.lowercased()
    return data.members.filter { member in
        member.firstName.lowercased().contains(query) ||
        member.paternalLastName.lowercased().contains(query) ||
        (member.maternalLastName?.lowercased().contains(query) ?? false) ||
        (member.phone?.contains(searchText) ?? false)
    }
}
```

- Usa `.searchable()` de SwiftUI
- Case-insensitive para nombres
- Exact match para telefono (digitos)
- Se ejecuta sobre miembros ya cargados en memoria

---

## Encoding/Decoding Firestore (decisiones tecnicas)

### Por que encode/decode manual

`FirestoreMemberRepository` **no** usa `document.data(as: Member.self)` ni `Firestore.Encoder().encode()`. Usa funciones manuales `encode(_:)` y `decode(document:)` por tres razones:

1. **Excluir `id` del payload**: el `id` es el `documentID` de Firestore, no debe duplicarse dentro del documento
2. **Resiliencia**: si un campo no-optional falta en Firestore, `data(as:)` falla silenciosamente. El decode manual pone defaults seguros
3. **Composite index**: queries con `whereField` + `order(by:)` requieren indices compuestos. Se ordena en memoria en su lugar

### Snapshot como sub-mapa

`MembershipPlanSnapshot` se almacena como mapa anidado en Firestore (no como JSON string):

```swift
// Encode
data["membershipPlanSnapshot"] = encodeSnapshot(snapshot)

// Decode
let snapshot = decodeSnapshot(data["membershipPlanSnapshot"])
```

Esto permite queries futuras sobre campos del snapshot si se necesitan.

### Campos opcionales

Los campos opcionales (`phone`, `diseases`, `familyGroupId`, etc.) solo se incluyen en el payload si tienen valor:

```swift
if let v = member.phone { data["phone"] = v }
```

---

## Modo edicion vs creacion

| Aspecto | Creacion | Edicion |
|---------|----------|---------|
| Seccion membresia | Visible | Oculta |
| Seccion grupo familiar | Visible si plan familiar | Oculta |
| Deteccion duplicados | Activa | Desactivada |
| `registeredBy` | `"admin:{uid}"` | Se conserva el original |
| `membershipStatus` | Segun plan seleccionado | Se conserva el original |
| `registrationDate` | `Date()` (hoy) | Se conserva el original |
| Boton | "Registrar" | "Guardar" |

En edicion, solo se actualizan datos personales/contacto/salud. Los campos de membresia se conservan del miembro existente.

---

## Lista de miembros (MembersView)

### Componentes de cada fila

```
┌──────────────────────────────────────────────────┐
│ Juan García López          🔗        [Activa]    │
│ [Mensual]              📞 5512345678             │
│ Vence: 15 Mar 2026 · 3 visitas restantes         │
└──────────────────────────────────────────────────┘
```

- Linea 1: nombre completo + icono link (si `linkedUserId != nil`) + chip de status
- Linea 2: nombre del plan (del snapshot) + telefono
- Linea 3: fecha vencimiento (rojo si <= 3 dias) + visitas restantes (rojo si <= 1)

### Acciones

| Gesto | Accion |
|-------|--------|
| Swipe izquierda (trailing) | Desactivar/Activar |
| Swipe derecha (leading) | Editar |
| Context menu | Editar / Desactivar |
| Pull to refresh | Recargar lista |
| Toolbar "+" | Abrir formulario creacion |

### Status chip colores

| Status | Color |
|--------|-------|
| `active` | Verde |
| `expired` | Rojo |
| `suspended` | Naranja |
| `cancelled` | Gris |
| `pending` | Azul |

---

## Pendiente (no implementado)

1. **Auto-registro (Camino 1)**: flujo de onboarding donde el usuario se registra desde la app y se vincula por telefono. Documentado en `04-member-registration.md` pero no implementado en iOS
2. **Asignacion de plan en edicion**: actualmente la edicion solo modifica datos personales. Reasignar plan requiere un flujo separado (ver `07-membership-assignments.md`)
3. **Historial de membresias**: al renovar, el snapshot anterior se sobreescribe. Para historial, crear subcoleccion `members/{id}/membership_history`
4. **Check-in**: descontar visitas al hacer check-in. Documentado en `07-membership-assignments.md`

---

## Checklist para modificar este modulo

- [ ] Verificar que los campos del modelo `Member` en `MembersCore` coincidan con el esquema Firestore (`knowledge/schema.md`)
- [ ] Si se agregan campos, actualizar `encode()` y `decode()` en `FirestoreMemberRepository`
- [ ] Si se agregan campos, actualizar `MemberLocal` (SwiftData) y su `toDomain()`/`fromDomain()`
- [ ] Si se agregan validaciones, actualizar `validateForm()` en `MemberViewModel` y la tabla de este documento
- [ ] Si se modifica el snapshot, actualizar `encodeSnapshot()` y `decodeSnapshot()` en el repositorio
- [ ] Ejecutar build con `xcodebuild` antes de commitear
- [ ] Commitear packages repo **primero**, luego app repo
- [ ] Actualizar **este documento** con los cambios realizados
