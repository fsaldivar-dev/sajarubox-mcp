# Inyeccion de Dependencias — Android

> El proyecto usa ViewModelFactory pattern (sin Hilt).
> Cada ViewModel recibe sus dependencias por constructor.

---

## Por que ViewModelFactory y no Hilt

El proyecto no tiene Hilt configurado. Las dependencias se pasan manualmente a traves de
`ViewModelProvider.Factory`. Esto es mas verboso pero mas explicito y facil de testear con MockK.

---

## Repositorios disponibles

| Repositorio | Coleccion Firestore | Proposito |
|-------------|---------------------|-----------|
| `AuthRepository(context)` | `users` + Firebase Auth | Autenticacion y rol |
| `UserRepository()` | `users` | CRUD de perfil |
| `ClassRepository()` | `classes` | Clases del gym |
| `MemberRepository()` | `members` (iOS) | Miembros del gym |
| `MembershipRepository()` | `membership_plans` | Planes de membresia |
| `BookingRepository()` | `classBookings` | Reservas |
| `AttendanceRepository()` | `classAttendance` | Asistencia |

---

## Como crear un ViewModel con dependencias

### 1. ViewModel con constructor

```kotlin
class NuevoViewModel(
    private val authRepository: AuthRepository,
    private val userRepository: UserRepository = UserRepository()
) : ViewModel() {
    // ...
}
```

Las dependencias opcionales (con default) no necesitan pasarse en la factory.

### 2. ViewModelFactory

```kotlin
class NuevoViewModelFactory(
    private val context: Context
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(NuevoViewModel::class.java)) {
            return NuevoViewModel(
                authRepository = AuthRepository(context),
                // userRepository usa su default (UserRepository())
            ) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class: ${modelClass.name}")
    }
}
```

### 3. Uso en composable

```kotlin
@Composable
fun NuevoScreen(
    onSuccess: () -> Unit,
    viewModel: NuevoViewModel = viewModel(
        factory = NuevoViewModelFactory(LocalContext.current)
    )
) { ... }
```

---

## AuthRepository

Es el repositorio central. Requiere `Context` para configurar Google Sign-In.

```kotlin
class AuthRepository(private val context: Context? = null) {
    private val auth = FirebaseAuth.getInstance()
    private val db = FirebaseFirestore.getInstance()

    val currentUser: FirebaseUser? get() = auth.currentUser
    val isAuthenticated: Boolean get() = currentUser != null

    // Metodos principales
    suspend fun signInWithEmail(email: String, password: String): Result<FirebaseUser>
    suspend fun signInWithGoogle(account: GoogleSignInAccount): Result<FirebaseUser>
    suspend fun signUpWithEmailOnly(email: String, password: String): Result<String>
    fun getGoogleSignInIntent(): Intent?
    fun signOut()
    fun getUserId(): String?
    suspend fun getCurrentUserRole(): String?
    suspend fun isAdmin(): Boolean
    suspend fun isOnboardingCompleted(): Boolean
    suspend fun getUserProfile(): User?
}
```

**Nota:** `context` puede ser `null` si no se necesita Google Sign-In (ej: en tests).

---

## UserRepository

No requiere `Context`. Usa Firestore directamente.

```kotlin
class UserRepository {
    private val db = FirebaseFirestore.getInstance()
    private val collection = "users"

    suspend fun getUser(uid: String): User?
    suspend fun updateUser(uid: String, data: Map<String, Any?>): Boolean
    suspend fun getAllUsers(): List<User>
    suspend fun updateOnboardingData(uid: String, data: Map<String, Any?>): Boolean
    suspend fun toggleUserStatus(uid: String, isActive: Boolean): Boolean
}
```

---

## Como mockear en tests

```kotlin
// En el test: pasar el mock directamente al constructor del ViewModel
class SignInViewModelTest {
    private lateinit var authRepository: AuthRepository
    private lateinit var viewModel: SignInViewModel

    @Before
    fun setUp() {
        authRepository = mockk()  // Mock sin context
        viewModel = SignInViewModel(authRepository)
    }
}
```

**Regla:** Como los repositorios se pasan por constructor, los tests no necesitan Hilt ni
ninguna configuracion especial. Solo `mockk()` y construir el ViewModel directamente.

---

## Agregar un repositorio nuevo

### Paso 1: Crear la clase del repositorio

```kotlin
class NuevoRepository {
    private val db = FirebaseFirestore.getInstance()
    private val collection = "nombre_coleccion"

    suspend fun getAll(): List<NuevoModelo> {
        return try {
            db.collection(collection)
                .get()
                .await()
                .documents
                .mapNotNull { it.toObject(NuevoModelo::class.java)?.copy(id = it.id) }
        } catch (e: Exception) {
            emptyList()
        }
    }
}
```

### Paso 2: Agregar al ViewModel

```kotlin
class NuevoViewModel(
    private val authRepository: AuthRepository,
    private val nuevoRepository: NuevoRepository = NuevoRepository()
) : ViewModel()
```

### Paso 3: Actualizar la Factory

```kotlin
return NuevoViewModel(
    authRepository = AuthRepository(context),
    nuevoRepository = NuevoRepository()
) as T
```

### Paso 4: Mockear en tests

```kotlin
private val nuevoRepository: NuevoRepository = mockk()
viewModel = NuevoViewModel(authRepository, nuevoRepository)
coEvery { nuevoRepository.getAll() } returns emptyList()
```

---

## Reglas

1. `AuthRepository` siempre recibe `Context` — no instanciar sin el
2. Los repositorios de Firestore (`UserRepository`, etc.) no requieren `Context`
3. Nunca instanciar repositorios dentro del ViewModel (`init` o metodos) — inyectarlos por constructor
4. En tests, siempre pasar mocks directamente al constructor del ViewModel
5. Si el repositorio tiene `context = null` (ej: test), verificar antes de usar Google Sign-In
