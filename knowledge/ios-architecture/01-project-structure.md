# Estructura del proyecto iOS

> Dos repositorios enlazados por Swift Package Manager local.

---

## Repositorios

### 1. App: `sajaru-box-ios`

Contiene la aplicacion iOS con la UI, ViewModels y configuracion.

```
sajaru-box-ios/
├── SajaruBox/
│   ├── App/
│   │   ├── Data/Local/                  # SwiftData models (@Model)
│   │   ├── Presentation/               # Modulos UI
│   │   │   ├── AuthModule/             # Login, Register, SessionResolver
│   │   │   └── HomeModule/             # Home, Members, MembershipPlans
│   │   └── Utils/                       # DependencyState, RouterManager
│   ├── SajaruBoxApp.swift              # Entry point
│   ├── SajaruAppDelegate.swift         # Firebase config
│   └── Info.plist
├── SajaruBox.xcodeproj
└── Config/
    ├── GoogleService-Info-Stage.plist
    └── GoogleService-Info-Release.plist
```

### 2. Packages: `sajarubox-mobile-ios-packages`

Contiene todos los modulos reutilizables como Swift Packages locales.

```
sajarubox-mobile-ios-packages/
├── Packages/
│   ├── PlatformFoundation/             # Value types, utilidades base
│   │   └── Sources/
│   │       ├── TypesFoundation/        # Email, Password, UserID, AuthCredential
│   │       ├── UtilsFoundation/        # DateFormatters, Validators
│   │       ├── NetworkFoundation/      # NetworkClient protocol
│   │       └── LoggingFoundation/      # Logger protocol + OSLog impl
│   │
│   ├── PlatformCore/                    # Dominio (modelos + protocolos)
│   │   └── Sources/
│   │       ├── AuthCore/               # AuthProvider, AuthAuthenticator, AuthError
│   │       ├── UsersCore/              # User model, UserRepository protocol
│   │       ├── MembersCore/            # Member, MembershipPlan, MemberRepository
│   │       ├── RolesCore/              # Role enum, Permission, RolePermissionMapper
│   │       ├── PaymentsCore/           # Payment, PaymentRepository (futuro)
│   │       ├── CheckInCore/            # CheckIn, CheckInRepository (futuro)
│   │       ├── RoutinesCore/           # Routine, Exercise, RoutineRepository (futuro)
│   │       ├── InventoryCore/          # Product, Inventory, ProductRepository (futuro)
│   │       ├── ReportsCore/            # Report, ReportRepository (futuro)
│   │       └── DataSyncCore/           # SyncEngine, RemoteStore, LocalStore
│   │
│   ├── PlatformAppiOS/                 # Registro DI + re-exports
│   │   └── Sources/PlatformAppiOS/
│   │       └── PlatformAppiOSExports.swift
│   │
│   ├── SajaruUI/                       # Sistema de diseno
│   │   └── Sources/
│   │       ├── SajaruUI/              # Core: protocolos, themes, styles
│   │       └── Moon/                  # Componentes (Atoms, Molecules, Organisms)
│   │
│   ├── Vendors/                        # Implementaciones de terceros
│   │   └── Sources/
│   │       └── FirebaseVendor/        # Firestore repositories, Firebase Auth
│   │
│   └── AppSuite/                       # Orquestacion (navegacion, deep linking)
│       └── Sources/AppSuite/
│           ├── Navigation/
│           ├── DeepLinking/
│           └── FlowEngines/
```

---

## Enlace entre repos

El proyecto Xcode referencia el repo de packages como local:

```
XCLocalSwiftPackageReference: ../../sajarubox-mobile-ios-packages
```

Esto significa que ambos repos deben estar al mismo nivel en el filesystem:

```
Documents/SajaruBox/App/
├── iOS/SajaruBox/                      # App repo (Xcode project)
└── sajarubox-mobile-ios-packages/      # Packages repo
```

---

## Flujo de dependencias

```
PlatformFoundation (base)
       ↓
PlatformCore (dominio)
       ↓
  ┌────┴────┐
  ↓         ↓
Vendors   SajaruUI
(Firebase)  (UI)
  ↓         ↓
PlatformAppiOS (DI)
       ↓
   AppSuite (orquestacion)
       ↓
  SajaruBox App
```

---

## Responsabilidad de cada modulo

| Modulo | Responsabilidad | Depende de |
|--------|----------------|------------|
| PlatformFoundation | Value types (`Email`, `Password`, `UserID`), logging, validators | Nada |
| PlatformCore | Modelos de dominio, protocolos de repositorio, errores | PlatformFoundation |
| Vendors/Firebase | Implementaciones Firestore de los repositorios | PlatformCore, Firebase SDK |
| SajaruUI | Protocolos de tema, themes, styles, property wrappers | Nada |
| Moon | Componentes UI (Atoms, Molecules, Organisms) | SajaruUI |
| PlatformAppiOS | Re-exports, registro de dependencias | PlatformCore |
| AppSuite | Navegacion, deep linking, flow engines | PlatformCore |
| SajaruBox App | UI (Views, ViewModels), configuracion Firebase | Todo lo anterior |

---

## Regla importante

Siempre hacer **commit y push en el repo de packages primero**, antes que en el repo de la app. Si se hace al reves, el CI/CD de la app puede fallar al no encontrar los cambios de packages.
