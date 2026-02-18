# Flujo de Autenticacion — Android

> Implementacion completa de login, registro y Google Sign-In en Android.
> Equivalente al `02-auth-flow.md` de iOS pero con Jetpack Compose y Kotlin Coroutines.

---

## AuthState — estado centralizado

```kotlin
// auth/AuthState.kt
sealed class AuthState {
    object Idle : AuthState()
    object Loading : AuthState()
    data class Success(val userId: String) : AuthState()
    data class SignUpSuccess(val message: String) : AuthState()
    data class Error(val message: String) : AuthState()
}
```

---

## AuthRepository — operaciones de autenticacion

```kotlin
class AuthRepository(private val context: Context? = null) {
    private val auth = FirebaseAuth.getInstance()
    private val db = FirebaseFirestore.getInstance()

    val currentUser: FirebaseUser? get() = auth.currentUser
    val isAuthenticated: Boolean get() = currentUser != null
}
```

### Operaciones disponibles

| Metodo | Descripcion |
|--------|-------------|
| `signInWithEmail(email, password)` | Login con email/contrasena |
| `signInWithGoogle(account)` | Login con Google (recibe `GoogleSignInAccount`) |
| `signUpWithEmailOnly(email, password)` | Registro (hace signOut post-creacion) |
| `getGoogleSignInIntent()` | Intent para lanzar Google Sign-In |
| `signOut()` | Cierra sesion en Firebase y Google |
| `getUserId()` | UID del usuario actual (`null` si no autenticado) |
| `getCurrentUserRole()` | Lee `role` de `users/{uid}` en Firestore |
| `isAdmin()` | `role == "admin"` |
| `isOnboardingCompleted()` | Lee `onboardingCompleted` de `users/{uid}` |
| `getUserProfile()` | Objeto `User` completo desde Firestore |

---

## SignInViewModel

```kotlin
class SignInViewModel(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _signInData = MutableStateFlow(SignInData())
    val signInData: StateFlow<SignInData> = _signInData.asStateFlow()

    private val _authState = MutableStateFlow<AuthState>(AuthState.Idle)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    private val _errors = MutableStateFlow<Map<String, String>>(emptyMap())
    val errors: StateFlow<Map<String, String>> = _errors.asStateFlow()

    fun updateEmail(value: String) {
        _signInData.value = _signInData.value.copy(email = value)
        _errors.value = _errors.value - "email"
    }

    fun updatePassword(value: String) {
        _signInData.value = _signInData.value.copy(password = value)
        _errors.value = _errors.value - "password"
    }

    fun signInWithEmail() {
        val newErrors = mutableMapOf<String, String>()
        val data = _signInData.value

        if (data.email.isBlank()) newErrors["email"] = "El email es requerido."
        if (data.password.isBlank()) newErrors["password"] = "La contrasena es requerida."
        if (newErrors.isNotEmpty()) { _errors.value = newErrors; return }

        viewModelScope.launch {
            _authState.value = AuthState.Loading
            val result = authRepository.signInWithEmail(data.email, data.password)
            _authState.value = result.fold(
                onSuccess = { user -> AuthState.Success(user.uid) },
                onFailure = { e -> AuthState.Error(mapFirebaseError(e)) }
            )
        }
    }

    fun signInWithGoogle(account: GoogleSignInAccount) {
        viewModelScope.launch {
            _authState.value = AuthState.Loading
            val result = authRepository.signInWithGoogle(account)
            _authState.value = result.fold(
                onSuccess = { user -> AuthState.Success(user.uid) },
                onFailure = { e -> AuthState.Error(e.message ?: "Error al iniciar sesion.") }
            )
        }
    }

    // Llamado cuando el launcher de Google retorna un error (antes de llamar signInWithGoogle)
    fun signInWithGoogleError(message: String) {
        _authState.value = AuthState.Error(message)
    }

    fun getGoogleSignInIntent() = authRepository.getGoogleSignInIntent()
}
```

---

## Google Sign-In en el composable

El flujo de Google Sign-In requiere un launcher de Activity. Solo puede vivir en el
composable stateful (no en el stateless).

```kotlin
@Composable
fun SignInScreen(
    onSignInSuccess: () -> Unit,
    viewModel: SignInViewModel = viewModel(factory = SignInViewModelFactory(LocalContext.current))
) {
    // 1. Launcher de Google Sign-In
    val googleSignInLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        try {
            if (result.data != null) {
                val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
                val account = task.getResult(ApiException::class.java)
                account?.let { viewModel.signInWithGoogle(it) }
            }
        } catch (e: ApiException) {
            val message = when (e.statusCode) {
                10 -> "Error de configuracion SHA-1. Verifica Firebase Console."
                12501 -> "El usuario cancelo el inicio de sesion."
                7 -> "Sin conexion con Google Play Services."
                else -> "Error al iniciar sesion con Google (${e.statusCode})."
            }
            viewModel.signInWithGoogleError(message)
        } catch (e: Exception) {
            viewModel.signInWithGoogleError("Error inesperado: ${e.message}")
        }
    }

    // 2. Reaccionar al estado de autenticacion
    val authState by viewModel.authState.collectAsState()
    LaunchedEffect(authState) {
        if (authState is AuthState.Success) {
            onSignInSuccess()
        }
    }

    // 3. Pasar callback de Google al composable stateless
    SignInScreenContent(
        // ...campos...
        onGoogleSignIn = {
            val intent = viewModel.getGoogleSignInIntent()
            if (intent != null) googleSignInLauncher.launch(intent)
            else viewModel.signInWithGoogleError("Google Sign-In no configurado.")
        }
    )
}
```

---

## Registro: signUpWithEmailOnly

El registro NO deja al usuario autenticado. Hace signOut despues de crear la cuenta
para que el usuario tenga que iniciar sesion explicitamente.

```kotlin
// AuthRepository
suspend fun signUpWithEmailOnly(email: String, password: String): Result<String> {
    return try {
        val result = auth.createUserWithEmailAndPassword(email, password).await()
        val user = result.user ?: return Result.failure(Exception("User is null"))
        autoRegisterUser(user)
        auth.signOut()
        googleSignInClient?.signOut()
        Result.success("Cuenta creada exitosamente")
    } catch (e: Exception) {
        Result.failure(e)
    }
}
```

En el ViewModel, el exito emite `AuthState.SignUpSuccess`:

```kotlin
val result = authRepository.signUpWithEmailOnly(data.email, data.password)
_authState.value = result.fold(
    onSuccess = { msg -> AuthState.SignUpSuccess(msg) },
    onFailure = { e ->
        val message = if (e.message?.contains("email-already-in-use") == true)
            "Este email ya esta registrado"
        else
            "No se pudo completar el registro. Intenta de nuevo."
        AuthState.Error(message)
    }
)
```

---

## Auto-registro de usuario en Firestore

Cada vez que alguien se autentica (login o registro), `autoRegisterUser` verifica si ya
existe en Firestore y lo crea si es nuevo. El primer usuario recibe rol `admin`.

```kotlin
// AuthRepository
private suspend fun autoRegisterUser(user: FirebaseUser, emailOverride: String? = null) {
    val email = emailOverride ?: user.email ?: return
    val userRef = db.collection("users").document(user.uid)
    val userDoc = userRef.get().await()

    if (userDoc.exists()) {
        // Usuario existente: solo actualizar email/nombre
        userRef.update(mapOf("email" to email, "updatedAt" to Timestamp.now())).await()
        return
    }

    // Nuevo usuario: determinar rol
    val isFirst = isFirstUser()  // Verifica si ya hay algun admin
    val role = if (isFirst) "admin" else "member"

    val userData = hashMapOf<String, Any>(
        "id" to user.uid,
        "email" to email,
        "nombre" to (user.displayName ?: email.split("@").first()),
        "role" to role,
        "activo" to true,
        "onboardingCompleted" to false,
        "isMinor" to false,
        "createdAt" to Timestamp.now(),
        "updatedAt" to Timestamp.now()
    )
    userRef.set(userData).await()
}

private suspend fun isFirstUser(): Boolean {
    val snapshot = db.collection("users")
        .whereEqualTo("role", "admin")
        .limit(1)
        .get()
        .await()
    return snapshot.isEmpty
}
```

> **Diferencia con iOS:** iOS usa `app_config/setup` como indicador. Android verifica
> directamente si existe algun usuario con `role == "admin"`.
> Ambos enfoques son validos pero diferentes — no mezclarlos en la misma plataforma.

---

## Mapeo de errores de Firebase

```kotlin
private fun mapFirebaseError(e: Throwable): String {
    val message = e.message ?: return "Error inesperado."
    return when {
        message.contains("INVALID_LOGIN_CREDENTIALS") ||
        message.contains("wrong-password") ||
        message.contains("user-not-found") ||
        message.contains("invalid-credential") ->
            "Correo o contrasena incorrectos."
        message.contains("network") || message.contains("Network") ->
            "Sin conexion a internet."
        message.contains("too-many-requests") ->
            "Demasiados intentos. Espera un momento."
        message.contains("user-disabled") ->
            "Esta cuenta ha sido deshabilitada."
        else -> "Error al iniciar sesion. Intenta de nuevo."
    }
}
```

**Regla de seguridad:** `user-not-found` y `wrong-password` siempre muestran el
mismo mensaje generico. Nunca revelar si el email existe.

---

## Mapeo de errores de Google Sign-In (ApiException)

| statusCode | Mensaje al usuario |
|------------|-------------------|
| 10 | "Error de configuracion SHA-1. Verifica Firebase Console." |
| 12501 | "El usuario cancelo el inicio de sesion." |
| 7 | "Sin conexion con Google Play Services." |
| otro | "Error al iniciar sesion con Google (codigo)." |

**Error 10 (DEVELOPER_ERROR):** Ocurre cuando el SHA-1 del certificado no esta registrado
en Firebase Console. Agregar el SHA-1 del debug keystore en Authentication > Settings.

---

## Cierre de sesion

```kotlin
fun signOut() {
    auth.signOut()
    googleSignInClient?.signOut()  // Necesario para que el picker aparezca de nuevo
}
```

Despues del signOut, navegar al SignIn limpiando el back stack:
```kotlin
navController.navigate(Screen.SignIn.route) {
    popUpTo(0) { inclusive = true }
}
```
