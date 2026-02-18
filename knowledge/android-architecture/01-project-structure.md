# Estructura del Proyecto Android

> App del miembro (cliente del gimnasio). Plataforma: Android.
> Arquitectura: MVVM + Jetpack Compose + Firebase.

---

## Paquete base

```
com.shajaru.sajaruboxapp
```

---

## Estructura de directorios

```
app/src/main/kotlin/com/shajaru/sajaruboxapp/
├── MainActivity.kt
├── auth/
│   ├── AuthState.kt
│   ├── AuthRepository.kt
│   ├── signin/
│   │   ├── SignInScreen.kt        # Stateful + stateless (SignInScreenContent)
│   │   ├── SignInViewModel.kt
│   │   └── SignInViewModelFactory.kt
│   └── signup/
│       ├── SignUpScreen.kt        # Stateful + stateless (SignUpScreenContent)
│       ├── SignUpViewModel.kt
│       └── SignUpViewModelFactory.kt
├── data/
│   ├── model/
│   │   ├── User.kt
│   │   ├── Class.kt
│   │   ├── ClassBooking.kt
│   │   ├── ClassAttendance.kt
│   │   ├── Membership.kt
│   │   ├── Member.kt
│   │   └── Gym.kt
│   └── repository/
│       ├── UserRepository.kt
│       ├── AuthRepository.kt
│       ├── ClassRepository.kt
│       ├── MemberRepository.kt
│       ├── MembershipRepository.kt
│       ├── BookingRepository.kt
│       ├── AttendanceRepository.kt
│       └── FirestoreRepository.kt
├── navigation/
│   ├── NavGraph.kt
│   └── NavigationHelper.kt
└── ui/
    ├── onboarding/
    │   ├── OnboardingScreen.kt
    │   ├── OnboardingViewModel.kt
    │   ├── OnboardingViewModelFactory.kt
    │   ├── OnboardingStepPersonal.kt
    │   ├── OnboardingStepContact.kt
    │   ├── OnboardingStepHealth.kt
    │   └── OnboardingStepGuardian.kt
    ├── classes/
    │   ├── ClassesScreen.kt
    │   ├── ClassesViewModel.kt
    │   └── ClassesViewModelFactory.kt
    ├── members/
    │   ├── MembersScreen.kt
    │   ├── MembersViewModel.kt
    │   └── MembersViewModelFactory.kt
    ├── profile/
    │   ├── MemberProfileScreen.kt
    │   ├── MemberActiveMembershipScreen.kt
    │   └── MemberAttendanceHistoryScreen.kt
    └── theme/
        ├── ThemeManager.kt
        └── ThemeSelectorDialog.kt

app/src/test/kotlin/com/shajaru/sajaruboxapp/
├── auth/
│   ├── SignInViewModelTest.kt     # 12 tests (Robolectric)
│   └── SignUpViewModelTest.kt     # 18 tests (Robolectric)
├── data/model/
│   ├── ClassBookingTest.kt        # 5 tests (Robolectric)
│   └── MembershipTest.kt          # 5 tests (Robolectric)
├── ui/onboarding/
│   └── OnboardingViewModelTest.kt # 12 tests (Robolectric)
└── snapshot/
    ├── AuthSnapshotTest.kt        # 8 tests (Paparazzi)
    └── OnboardingSnapshotTest.kt  # 5 tests (Paparazzi)
```

---

## Modulos locales

El proyecto tiene modulos adicionales como librerias locales:

```
sajaru-box-android/
├── app/                # Aplicacion principal
├── core-ui/            # Design System compartido (colores, tipografia, tema)
└── mobile-ui/          # Componentes UI moviles
```

Para usar los modulos locales en `app/build.gradle.kts`:
```kotlin
implementation(project(":core-ui"))
implementation(project(":mobile-ui"))
```

---

## Versiones clave (app/build.gradle.kts)

| Componente | Version |
|------------|---------|
| `compileSdk` | 36 |
| `targetSdk` | 35 |
| `minSdk` | 24 |
| Kotlin | 2.0.21 |
| Compose BOM | 2024.12.01 |
| Navigation Compose | 2.8.2 |
| Firebase BOM | 33.7.0 |
| Lifecycle/ViewModel | 2.8.7 |
| Coroutines Test | 1.9.0 |
| MockK | 1.13.13 |
| Robolectric | 4.14.1 |
| Paparazzi | 2.0.0-alpha02 |
| Turbine | 1.2.0 |

---

## Build types

| Tipo | applicationIdSuffix | Uso |
|------|---------------------|-----|
| `debug` | (ninguno) | Desarrollo local |
| `staging` | `.stage` | QA / pruebas |
| `release` | (ninguno) | Produccion |

Los tres tipos usan el debug keystore temporalmente. Para release real, cambiar `storeFile`.

---

## Configuracion critica de tests

```kotlin
// app/build.gradle.kts — OBLIGATORIO, no eliminar
tasks.withType<Test> {
    forkEvery = 1
}
```

**Por que es critico:** Robolectric y Paparazzi inicializan estado estatico de Android en la JVM.
Si comparten el mismo proceso, Robolectric corrompe `Bridge.init()` de Paparazzi causando
`IllegalStateException: Failed to init Bridge` o `UninitializedPropertyAccessException`.
`forkEvery = 1` corre cada clase de test en su propia JVM, eliminando el conflicto.

**Sin este config:** `./gradlew testDebugUnitTest` falla si hay tests de Paparazzi y Robolectric juntos.
**Con este config:** Todo pasa con BUILD SUCCESSFUL.

---

## Modelo de datos principal: User

```kotlin
data class User(
    val id: String = "",                    // UID de Firebase Auth
    val email: String = "",
    val nombre: String = "",
    val primerApellido: String = "",
    val segundoApellido: String = "",
    val telefono: String = "",
    val telefonoEmergencia: String = "",
    val fechaNacimiento: Timestamp? = null,
    val enfermedades: String = "",
    val lesiones: String = "",
    val otros: String = "",
    val role: String = "member",            // "admin" | "member"
    val activo: Boolean = true,
    val onboardingCompleted: Boolean = false,
    val isMinor: Boolean = false,
    // Tutor (si isMinor = true)
    val guardianNombre: String = "",
    val guardianPrimerApellido: String = "",
    val guardianSegundoApellido: String = "",
    val guardianTelefono: String = "",
    val guardianEmail: String = "",
    val guardianRelacion: String = "",      // "Padre" | "Madre" | "Tutor Legal"
    // Vinculacion con members (iOS)
    val linkedMemberId: String? = null,     // FK a members/{id}
    // Timestamps
    val createdAt: Timestamp? = null,
    val updatedAt: Timestamp? = null
)
```

> **Nota:** Los campos `nombre`, `primerApellido`, etc. son los campos de Android.
> iOS usa `fullName`. Al leer documentos cross-platform, verificar que el campo exista.
