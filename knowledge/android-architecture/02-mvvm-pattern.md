# Patron MVVM — Android

> Como estructurar ViewModel, estado y composables en el proyecto Android.
> Patron base establecido en Sprint 01. Seguirlo en todos los modulos nuevos.

---

## Estructura de un modulo

Cada feature tiene 3 archivos minimos:

```
ui/nuevo-modulo/
├── NuevoScreen.kt          # Composable stateful (con ViewModel)
├── NuevoViewModel.kt       # ViewModel + data class de estado
└── NuevoViewModelFactory.kt # Factory para instanciar el ViewModel
```

Si el Screen necesita snapshot tests, extraer un composable stateless adicional:
```
├── NuevoScreen.kt           # Stateful (ViewModel) + NuevoScreenContent (stateless)
```

---

## ViewModel

### Patron estandar

```kotlin
class NuevoViewModel(
    private val authRepository: AuthRepository,
    private val userRepository: UserRepository = UserRepository()
) : ViewModel() {

    // Estado mutable interno
    private val _data = MutableStateFlow(NuevoData())
    val data: StateFlow<NuevoData> = _data.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _errors = MutableStateFlow<Map<String, String>>(emptyMap())
    val errors: StateFlow<Map<String, String>> = _errors.asStateFlow()

    // Ejemplo: accion principal
    fun guardar() {
        if (!validate()) return

        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                // operacion async
                val uid = authRepository.getUserId() ?: return@launch
                val success = userRepository.updateUser(uid, buildData())
                if (!success) {
                    _error.value = "No se pudo guardar. Intenta de nuevo."
                }
            } catch (e: Exception) {
                _error.value = "Error inesperado."
            } finally {
                _isLoading.value = false
            }
        }
    }

    // Actualizadores de campos (limpian el error del campo al escribir)
    fun updateNombre(value: String) {
        _data.value = _data.value.copy(nombre = value)
        _errors.value = _errors.value - "nombre"
    }

    // Validacion local antes de llamada remota
    private fun validate(): Boolean {
        val d = _data.value
        val newErrors = mutableMapOf<String, String>()
        if (d.nombre.isBlank()) newErrors["nombre"] = "El nombre es requerido."
        _errors.value = newErrors
        return newErrors.isEmpty()
    }
}
```

### Reglas del ViewModel

1. Nunca referenciar `Context` directamente — pasarlo por el constructor si es necesario
2. Todo I/O en `viewModelScope.launch { }` (nunca en el hilo principal)
3. `_isLoading.value = true` antes de la operacion, `finally { _isLoading.value = false }` al terminar
4. Los `StateFlow` publicos son siempre `asStateFlow()` (solo lectura)
5. Los actualizadores de campo limpian el error del campo: `_errors.value = _errors.value - "campo"`
6. Validar localmente antes de cualquier llamada a Firebase

---

## Data class de estado

```kotlin
data class NuevoData(
    val nombre: String = "",
    val apellido: String = "",
    // Cada campo de formulario tiene su default vacio
)
```

**Reglas:**
- Siempre `data class` con defaults
- Campos de formulario son `String` (no nullable)
- Los errores estan separados en `_errors: Map<String, String>`

---

## ViewModelFactory

Obligatorio porque no usamos Hilt. Patron estandar:

```kotlin
class NuevoViewModelFactory(
    private val context: Context
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(NuevoViewModel::class.java)) {
            return NuevoViewModel(AuthRepository(context)) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class: ${modelClass.name}")
    }
}
```

---

## Screen: stateful + stateless

### Por que dos composables

El composable stateful (`NuevoScreen`) conecta el ViewModel y maneja efectos secundarios
(launchers de Google, `LaunchedEffect`). No se puede usar en Paparazzi porque requiere ViewModel.

El composable stateless (`NuevoScreenContent`) solo recibe datos y callbacks. Se puede usar
en Paparazzi para snapshot tests sin ninguna dependencia de Firebase o ViewModel.

### Composable stateful (con ViewModel)

```kotlin
@Composable
fun NuevoScreen(
    onSuccess: () -> Unit,
    viewModel: NuevoViewModel = viewModel(
        factory = NuevoViewModelFactory(LocalContext.current)
    )
) {
    val data by viewModel.data.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()
    val errors by viewModel.errors.collectAsState()

    // Efectos secundarios: navegacion, launchers, etc.
    LaunchedEffect(/* condicion */) {
        // reaccionar a cambio de estado
    }

    NuevoScreenContent(
        data = data,
        isLoading = isLoading,
        error = error,
        errors = errors,
        onNombreChange = viewModel::updateNombre,
        onGuardar = viewModel::guardar
    )
}
```

### Composable stateless (testeable con Paparazzi)

```kotlin
@Composable
fun NuevoScreenContent(
    data: NuevoData,
    isLoading: Boolean,
    error: String?,
    errors: Map<String, String>,
    onNombreChange: (String) -> Unit,
    onGuardar: () -> Unit
) {
    // Solo UI: sin ViewModel, sin Firebase, sin Context
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 20.dp)
    ) {
        OutlinedTextField(
            value = data.nombre,
            onValueChange = onNombreChange,
            label = { Text("Nombre") },
            isError = errors.containsKey("nombre"),
            modifier = Modifier.fillMaxWidth()
        )

        errors["nombre"]?.let { err ->
            Text(
                text = err,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall
            )
        }

        if (error != null) {
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.errorContainer
                )
            ) {
                Text(
                    text = error,
                    color = MaterialTheme.colorScheme.onErrorContainer,
                    modifier = Modifier.padding(16.dp)
                )
            }
        }

        Button(
            onClick = onGuardar,
            enabled = !isLoading,
            modifier = Modifier.fillMaxWidth()
        ) {
            if (isLoading) {
                CircularProgressIndicator(modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(8.dp))
            }
            Text("Guardar")
        }
    }
}
```

---

## Leer estado en el composable

```kotlin
// CORRECTO — collectAsState() convierte StateFlow a State<T> de Compose
val data by viewModel.data.collectAsState()
val isLoading by viewModel.isLoading.collectAsState()

// INCORRECTO — no usar viewModel.data.value directamente en el cuerpo del composable
// porque no reacciona a cambios
val data = viewModel.data.value  // NO
```

---

## AuthState sealed class

Estado centralizado para flujos de autenticacion:

```kotlin
sealed class AuthState {
    object Idle : AuthState()
    object Loading : AuthState()
    data class Success(val userId: String) : AuthState()
    data class SignUpSuccess(val message: String) : AuthState()
    data class Error(val message: String) : AuthState()
}
```

Uso en composable:

```kotlin
val authState by viewModel.authState.collectAsState()

LaunchedEffect(authState) {
    if (authState is AuthState.Success) {
        onSignInSuccess()
    }
}

if (authState is AuthState.Error) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
        Text(
            text = (authState as AuthState.Error).message,
            color = MaterialTheme.colorScheme.onErrorContainer,
            modifier = Modifier.padding(16.dp)
        )
    }
}
```

---

## Errores comunes

### 1. Usar `viewModel.field.value` en lugar de `collectAsState()`

**Error**: La UI no se actualiza cuando cambia el StateFlow.

**Solucion**: Siempre `val field by viewModel.field.collectAsState()`.

### 2. Operaciones I/O fuera de `viewModelScope`

**Error**: `NetworkOnMainThreadException` o crash al rotar la pantalla.

**Solucion**: Todo acceso a Firebase dentro de `viewModelScope.launch { }`.

### 3. ViewModel sin factory en composable

**Error**: `IllegalArgumentException: No creator found for ...ViewModel`

**Solucion**: Pasar la factory en el argumento `factory = NuevoViewModelFactory(LocalContext.current)`.

### 4. Snapshot test del Screen stateful (con ViewModel)

**Error**: `Paparazzi` falla porque no puede instanciar el ViewModel con dependencias reales.

**Solucion**: Crear `NuevoScreenContent` stateless y hacer el snapshot sobre ese composable.
