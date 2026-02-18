# Onboarding — Android

> Wizard de 3-4 pasos que captura los datos del usuario despues del registro.
> Incluye deteccion de menor de edad (paso 4 condicional) y vinculacion con Member.

---

## Flujo general

```
Paso 1: Datos personales (nombre, apellidos, fecha de nacimiento)
    ↓
Paso 2: Contacto (telefono, telefono de emergencia)
    ↓ [si fecha indica menor de 18 anos]
Paso 3: Salud (enfermedades, lesiones, otros — opcionales)
    ↓ [si isMinor = true]
Paso 4: Tutor (nombre, apellido, telefono, relacion)
    ↓
Guardar en Firestore → onboardingCompleted = true
    ↓
Navegar segun rol (admin → Members, member → Classes)
```

---

## OnboardingData

```kotlin
data class OnboardingData(
    // Paso 1
    val nombre: String = "",
    val primerApellido: String = "",
    val segundoApellido: String = "",
    val fechaNacimiento: Long? = null,      // epoch millis

    // Paso 2
    val telefono: String = "",
    val telefonoEmergencia: String = "",

    // Paso 3
    val enfermedades: String = "",
    val lesiones: String = "",
    val otros: String = "",

    // Paso 4 (si isMinor)
    val guardianNombre: String = "",
    val guardianPrimerApellido: String = "",
    val guardianSegundoApellido: String = "",
    val guardianTelefono: String = "",
    val guardianEmail: String = "",
    val guardianRelacion: String = ""       // "Padre" | "Madre" | "Tutor Legal"
)
```

---

## OnboardingViewModel — estado y logica

### Estados del ViewModel

```kotlin
val data: StateFlow<OnboardingData>      // Datos del formulario
val currentStep: StateFlow<Int>          // 0-indexed (0, 1, 2, 3)
val totalSteps: StateFlow<Int>           // 3 (adulto) o 4 (menor)
val isMinor: StateFlow<Boolean>          // Calculado desde fechaNacimiento
val isSaving: StateFlow<Boolean>         // true mientras guarda en Firestore
val error: StateFlow<String?>            // Error general (red, etc.)
val errors: StateFlow<Map<String, String>> // Errores por campo
val onboardingComplete: StateFlow<Boolean> // true cuando se guarda exitosamente
val role: StateFlow<String?>             // Rol del usuario para navegar al destino correcto
```

### Deteccion de menor de edad

```kotlin
private fun checkIfMinor(birthDateMillis: Long) {
    val today = Calendar.getInstance()
    val birth = Calendar.getInstance().apply { timeInMillis = birthDateMillis }
    var age = today.get(Calendar.YEAR) - birth.get(Calendar.YEAR)
    if (today.get(Calendar.DAY_OF_YEAR) < birth.get(Calendar.DAY_OF_YEAR)) {
        age--
    }
    val minor = age < 18
    _isMinor.value = minor
    _totalSteps.value = if (minor) 4 else 3
    // Si el usuario pone una fecha que lo hace adulto y estaba en paso 4, regresarlo
    if (!minor && _currentStep.value >= 3) {
        _currentStep.value = 2
    }
}
```

La deteccion se ejecuta cada vez que se actualiza `fechaNacimiento`:
```kotlin
fun updateFechaNacimiento(millis: Long?) {
    _data.value = _data.value.copy(fechaNacimiento = millis)
    _errors.value = _errors.value - "fechaNacimiento"
    millis?.let { checkIfMinor(it) }
}
```

### Validacion por paso

```kotlin
private fun validateCurrentStep(): Boolean {
    val d = _data.value
    val newErrors = mutableMapOf<String, String>()

    when (_currentStep.value) {
        0 -> {
            if (d.nombre.isBlank())
                newErrors["nombre"] = "El nombre es requerido."
            if (d.primerApellido.isBlank())
                newErrors["primerApellido"] = "El primer apellido es requerido."
            if (d.fechaNacimiento == null)
                newErrors["fechaNacimiento"] = "La fecha de nacimiento es requerida."
        }
        1 -> {
            if (d.telefono.isBlank())
                newErrors["telefono"] = "El telefono es requerido."
            if (d.telefonoEmergencia.isBlank())
                newErrors["telefonoEmergencia"] = "El telefono de emergencia es requerido."
        }
        2 -> { /* Todo opcional */ }
        3 -> {
            if (_isMinor.value) {
                if (d.guardianNombre.isBlank())
                    newErrors["guardianNombre"] = "El nombre del tutor es requerido."
                if (d.guardianPrimerApellido.isBlank())
                    newErrors["guardianPrimerApellido"] = "El apellido del tutor es requerido."
                if (d.guardianTelefono.isBlank())
                    newErrors["guardianTelefono"] = "El telefono del tutor es requerido."
                if (d.guardianRelacion.isBlank())
                    newErrors["guardianRelacion"] = "La relacion es requerida."
            }
        }
    }

    _errors.value = newErrors
    return newErrors.isEmpty()
}
```

### Guardar en Firestore

```kotlin
fun completeOnboarding() {
    if (!validateCurrentStep()) return
    val uid = authRepository.getUserId() ?: return

    viewModelScope.launch {
        _isSaving.value = true
        _error.value = null

        val d = _data.value
        val fechaNacTimestamp = d.fechaNacimiento?.let { Timestamp(Date(it)) }

        val updateData = mutableMapOf<String, Any?>(
            "nombre" to d.nombre,
            "primerApellido" to d.primerApellido,
            "segundoApellido" to d.segundoApellido,
            "telefono" to d.telefono,
            "telefonoEmergencia" to d.telefonoEmergencia,
            "fechaNacimiento" to fechaNacTimestamp,
            "enfermedades" to d.enfermedades,
            "lesiones" to d.lesiones,
            "otros" to d.otros,
            "isMinor" to _isMinor.value
        )

        if (_isMinor.value) {
            updateData["guardianNombre"] = d.guardianNombre
            updateData["guardianPrimerApellido"] = d.guardianPrimerApellido
            updateData["guardianSegundoApellido"] = d.guardianSegundoApellido
            updateData["guardianTelefono"] = d.guardianTelefono
            updateData["guardianEmail"] = d.guardianEmail
            updateData["guardianRelacion"] = d.guardianRelacion
        }

        val success = userRepository.updateOnboardingData(uid, updateData)
        if (success) {
            _onboardingComplete.value = true
        } else {
            _error.value = "Error al guardar los datos. Intenta de nuevo."
        }
        _isSaving.value = false
    }
}
```

`updateOnboardingData` agrega automaticamente `onboardingCompleted = true` y `updatedAt`.

---

## OnboardingScreen — composable

### Estructura

```kotlin
@Composable
fun OnboardingScreen(
    onOnboardingComplete: (role: String?) -> Unit,
    viewModel: OnboardingViewModel = viewModel(factory = OnboardingViewModelFactory(LocalContext.current))
) {
    // ...
    LaunchedEffect(onboardingComplete) {
        if (onboardingComplete) {
            onOnboardingComplete(role)
        }
    }

    // Barra de progreso: (currentStep + 1) / totalSteps
    // AnimatedContent para transicion entre pasos
    // Botones: "Anterior" (si currentStep > 0) y "Siguiente"/"Completar"
}
```

### Paso actual con AnimatedContent

```kotlin
AnimatedContent(
    targetState = currentStep,
    label = "onboarding_step"
) { step ->
    when (step) {
        0 -> OnboardingStepPersonal(...)
        1 -> OnboardingStepContact(...)
        2 -> OnboardingStepHealth(...)
        3 -> OnboardingStepGuardian(...)
    }
}
```

---

## Vinculacion pendiente: Member-User linking

> **Issue #27 en Android — pendiente de implementar.**

Al completar el onboarding **paso 2** (telefono capturado), buscar en `members` si existe
un miembro pre-registrado por el admin con el mismo telefono:

```kotlin
// En OnboardingViewModel, al guardar el paso 2 o al completar el onboarding:
suspend fun attemptMemberLinking(uid: String, telefono: String) {
    // 1. Normalizar telefono: solo digitos
    val normalized = telefono.filter { it.isDigit() }
    if (normalized.isEmpty()) return

    // 2. Buscar en members por telefono normalizado y sin linkedUserId
    val snapshot = db.collection("members")
        .whereEqualTo("phone", normalized)
        .whereEqualTo("linkedUserId", null)
        .limit(1)
        .get()
        .await()

    if (snapshot.isEmpty) return

    val memberDoc = snapshot.documents.first()
    val memberId = memberDoc.id

    // 3. Vincular bidireccional
    db.collection("members").document(memberId)
        .update("linkedUserId", uid).await()
    db.collection("users").document(uid)
        .update("linkedMemberId", memberId).await()
}
```

### Normalizacion del telefono

```kotlin
// CORRECTO: solo digitos
val normalized = telefono.filter { it.isDigit() }

// Equivalente en regex
val normalized = telefono.replace(Regex("[^0-9]"), "")

// Ejemplos:
// "55 1234 5678"       → "5512345678"
// "+52 55 1234 5678"   → "525512345678"
// "551-234-5678"       → "5512345678"
```

### Si hay multiples matches por telefono

Mostrar lista para que el usuario seleccione:

```kotlin
val snapshot = db.collection("members")
    .whereEqualTo("phone", normalized)
    .whereEqualTo("linkedUserId", null)
    .get()
    .await()

if (snapshot.size() > 1) {
    // Mostrar lista de coincidencias al usuario
    _matchingMembers.value = snapshot.documents.map { it.toObject(Member::class.java) }
} else if (snapshot.size() == 1) {
    // Vincular automaticamente
    linkMember(uid, snapshot.documents.first().id)
}
```

---

## Errores comunes en onboarding

### 1. `fechaNacimiento` guardada como Long en lugar de Timestamp

**Causa:** El DatePicker devuelve epoch millis (`Long`). Si se guarda directamente como
`Long` en Firestore, iOS no puede leerlo como `Timestamp`.

**Solucion:** Convertir a `Timestamp` antes de guardar:
```kotlin
val fechaNacTimestamp = d.fechaNacimiento?.let { Timestamp(Date(it)) }
```

### 2. Paso 4 visible sin isMinor = true

**Causa:** `totalSteps` no se actualizo al cambiar la fecha.

**Solucion:** Verificar que `checkIfMinor` se llama en `updateFechaNacimiento`.

### 3. El usuario queda en paso 4 al cambiar a fecha de adulto

**Causa:** `currentStep` no se resetea cuando `isMinor` pasa a `false`.

**Solucion:** En `checkIfMinor`, agregar:
```kotlin
if (!minor && _currentStep.value >= 3) {
    _currentStep.value = 2
}
```

### 4. Guardar con campos nulos en Firestore

**Causa:** Los campos `String` vacios se guardan como `""` en Firestore, lo que
puede causar problemas al leerlos en iOS si espera `null`.

**Solucion:** Para campos opcionales, guardar `null` si estan vacios:
```kotlin
"segundoApellido" to d.segundoApellido.ifBlank { null }
```
