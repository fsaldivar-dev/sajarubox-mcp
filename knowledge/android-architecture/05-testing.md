# Testing — Android

> Guia completa de tests unitarios (Robolectric + MockK + Turbine) y
> snapshot tests (Paparazzi). Patron establecido en Sprint 01.

---

## Stack de testing

| Libreria | Version | Uso |
|----------|---------|-----|
| JUnit 4 | 4.13.2 | Test runner base |
| Robolectric | 4.14.1 | Simula Android sin dispositivo fisico |
| Paparazzi | 2.0.0-alpha02 | Snapshot tests de composables sin dispositivo |
| MockK | 1.13.13 | Mocking de clases y coroutines |
| Turbine | 1.2.0 | Testing de Kotlin Flows |
| Coroutines Test | 1.9.0 | `runTest`, `StandardTestDispatcher` |

---

## Configuracion CRITICA: forkEvery = 1

```kotlin
// app/build.gradle.kts — NO ELIMINAR
tasks.withType<Test> {
    forkEvery = 1
}
```

**Problema sin esta config:** `IllegalStateException: Failed to init Bridge` o
`UninitializedPropertyAccessException: sessionParamsBuilder` al ejecutar
`./gradlew testDebugUnitTest` con tests de Robolectric y Paparazzi juntos.

**Causa raiz:** Robolectric y Paparazzi inicializan estado estatico de Android en la JVM.
Si comparten el mismo proceso JVM, Robolectric corrompe el `Bridge.init()` de Paparazzi.

**Solucion:** `forkEvery = 1` crea una JVM nueva por cada CLASE de test (no por metodo).
Con 8 clases de test = 8 procesos JVM aislados. Ligeramente mas lento, pero estable.

**No usar:** `exclude("**/snapshot/**")` en `tasks.withType<Test>` porque rompe el filtro
`--tests ClassName` de Android Studio para otros tasks como `testStagingUnitTest`.

---

## Test unitario — patron estandar

```kotlin
@RunWith(RobolectricTestRunner::class)
@OptIn(ExperimentalCoroutinesApi::class)
class NuevoViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var authRepository: AuthRepository
    private lateinit var viewModel: NuevoViewModel

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        authRepository = mockk()
        viewModel = NuevoViewModel(authRepository)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    // ── Tests de validacion ──

    @Test
    fun `campo vacio genera error`() = runTest {
        viewModel.updateNombre("")
        viewModel.guardar()
        testDispatcher.scheduler.advanceUntilIdle()

        assertNotNull(viewModel.errors.value["nombre"])
    }

    @Test
    fun `campo valido limpia el error`() = runTest {
        viewModel.updateNombre("")
        viewModel.guardar()
        testDispatcher.scheduler.advanceUntilIdle()
        assertNotNull(viewModel.errors.value["nombre"])

        // Actualizar limpia el error
        viewModel.updateNombre("Juan")
        assertNull(viewModel.errors.value["nombre"])
    }

    // ── Tests de operaciones async ──

    @Test
    fun `guardar exitoso emite estado success`() = runTest {
        viewModel.updateNombre("Juan")
        coEvery { authRepository.getUserId() } returns "uid-123"
        // mockear otras dependencias...

        viewModel.authState.test {
            viewModel.guardar()
            skipItems(1) // Idle inicial
            val loading = awaitItem()
            assertTrue(loading is NuevoState.Loading)
            val success = awaitItem()
            assertTrue(success is NuevoState.Success)
        }
    }

    @Test
    fun `guardar fallido emite estado error`() = runTest {
        viewModel.updateNombre("Juan")
        coEvery { authRepository.getUserId() } returns "uid-123"
        coEvery { userRepository.updateUser(any(), any()) } returns false

        viewModel.guardar()
        testDispatcher.scheduler.advanceUntilIdle()

        assertNotNull(viewModel.error.value)
    }
}
```

---

## MockK: casos especiales

### Mockear FirebaseUser (usar relaxed = true)

`FirebaseUser` tiene metodos internos que MockK no puede mockear sin `relaxed = true`:

```kotlin
// CORRECTO
val firebaseUser = mockk<FirebaseUser>(relaxed = true)
every { firebaseUser.uid } returns "test-uid"

// INCORRECTO — falla en runtime con MockK
val firebaseUser = mockk<FirebaseUser>()
```

### Mockear GoogleSignInAccount (usar relaxed = true)

```kotlin
val account = mockk<GoogleSignInAccount>(relaxed = true)
every { account.idToken } returns "fake-token"
every { account.email } returns "test@test.com"
```

### Mockear funciones suspend (coEvery)

```kotlin
// Para funciones suspend, usar coEvery (no every)
coEvery { authRepository.signInWithEmail(any(), any()) } returns Result.success(mockk(relaxed = true))
coEvery { authRepository.signInWithEmail(any(), any()) } throws Exception("Network error")
```

### Verificar llamadas suspend (coVerify)

```kotlin
coVerify { authRepository.signInWithEmail("test@test.com", "123456") }
coVerify(exactly = 0) { authRepository.signOut() }
```

---

## Turbine: testing de StateFlow

```kotlin
@Test
fun `loading state durante autenticacion`() = runTest {
    coEvery { authRepository.signInWithEmail(any(), any()) } coAnswers {
        delay(100)
        Result.success(mockk(relaxed = true))
    }

    viewModel.authState.test {
        assertEquals(AuthState.Idle, awaitItem())

        viewModel.signInWithEmail()

        assertEquals(AuthState.Loading, awaitItem())
        assertTrue(awaitItem() is AuthState.Success)
    }
}
```

**Metodos utiles de Turbine:**
- `awaitItem()` — espera el proximo item del flow
- `skipItems(n)` — omite N items (util para el estado inicial)
- `expectNoEvents()` — verifica que no hay mas eventos
- `cancelAndIgnoreRemainingEvents()` — cancela el test sin fallo por eventos no consumidos

---

## Snapshot tests con Paparazzi

### Patron estandar

```kotlin
// IMPORTANTE: NO usar @RunWith(RobolectricTestRunner::class)
// Paparazzi tiene su propio runner
class NuevoSnapshotTest {

    @get:Rule
    val paparazzi = Paparazzi(
        deviceConfig = DeviceConfig.PIXEL_5,
        theme = "android:Theme.Material.Light.NoActionBar"
    )

    @Test
    fun `snapshot estado vacio`() {
        paparazzi.snapshot {
            NuevoScreenContent(
                data = NuevoData(),
                isLoading = false,
                error = null,
                errors = emptyMap(),
                onNombreChange = {},
                onGuardar = {}
            )
        }
    }

    @Test
    fun `snapshot con errores de validacion`() {
        paparazzi.snapshot {
            NuevoScreenContent(
                data = NuevoData(nombre = ""),
                isLoading = false,
                error = null,
                errors = mapOf("nombre" to "El nombre es requerido."),
                onNombreChange = {},
                onGuardar = {}
            )
        }
    }

    @Test
    fun `snapshot estado cargando`() {
        paparazzi.snapshot {
            NuevoScreenContent(
                data = NuevoData(),
                isLoading = true,
                error = null,
                errors = emptyMap(),
                onNombreChange = {},
                onGuardar = {}
            )
        }
    }
}
```

### Comandos de Paparazzi

```bash
# Generar imagenes de referencia (primera vez o al cambiar la UI)
./gradlew recordPaparazziDebug

# Verificar contra las imagenes guardadas (en CI o al hacer cambios)
./gradlew verifyPaparazziDebug
```

Las imagenes se guardan en:
```
app/src/test/snapshots/images/
```

### Cuando regenerar las imagenes

- Al cambiar el diseno visual de un composable
- Al cambiar colores del tema
- Al agregar o quitar elementos del layout

**Nunca:** commitear imagenes que no corresponden al codigo actual.

---

## Estructura de tests por archivo

Cada ViewModel debe tener tests que cubran:

1. **Validacion de campos:** cada campo requerido con valor vacio/invalido
2. **Limpieza de errores:** actualizar un campo limpia su error
3. **Operacion exitosa:** la operacion principal emite el estado correcto
4. **Operacion fallida:** error de red/Firebase emite error con mensaje
5. **Casos especificos:** errores conocidos con mensajes especificos (ej: email-already-in-use)
6. **Google Sign-In:** si aplica, exitoso y fallido + `signInWithGoogleError`

Cada Screen con contenido visual debe tener snapshot tests que cubran:

1. **Estado vacio:** todos los campos en blanco
2. **Estado con errores:** errores de validacion visibles
3. **Estado cargando:** loader visible, boton deshabilitado
4. **Estado de error:** mensaje de error visible (si aplica)

---

## Ejecutar tests

```bash
# Todos los tests (debug)
./gradlew testDebugUnitTest

# Todos los tests (staging)
./gradlew testStagingUnitTest

# Una clase especifica
./gradlew testDebugUnitTest --tests "*.SignInViewModelTest"

# Solo snapshots
./gradlew testDebugUnitTest --tests "*.snapshot.*"
```

---

## Errores comunes en tests

### 1. `IllegalStateException: Failed to init Bridge` al correr todos los tests

**Causa:** Falta `forkEvery = 1` en `build.gradle.kts`.
**Solucion:** Agregar `tasks.withType<Test> { forkEvery = 1 }`.

### 2. `coEvery` en lugar de `every` para funciones suspend

**Error:** `MockKException: no answer found for suspend function`
**Solucion:** Usar `coEvery { }` para funciones `suspend`, `every { }` para funciones normales.

### 3. FirebaseUser no mockeable sin `relaxed = true`

**Error:** `MockKException: Can not mock final class`
**Solucion:** `mockk<FirebaseUser>(relaxed = true)`.

### 4. Paparazzi con `@RunWith(RobolectricTestRunner::class)`

**Error:** Conflict entre Robolectric y Paparazzi en la misma clase.
**Solucion:** Las clases de Paparazzi NO deben tener `@RunWith`. Son incompatibles.

### 5. `advanceUntilIdle()` olvidado en tests sin Turbine

**Causa:** El test verifica el estado antes de que el dispatcher lo ejecute.
**Solucion:** Llamar `testDispatcher.scheduler.advanceUntilIdle()` despues de invocar la accion.
