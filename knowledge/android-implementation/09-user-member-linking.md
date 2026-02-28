# Android: Auto-vinculación User ↔ Member (v1.2.2)

## Resumen

Sistema de auto-vinculación que detecta cuando un usuario se loguea por primera vez y ya existe como `member` en Firestore (creado previamente desde el admin iOS). Salta el onboarding automáticamente y vincula las dos entidades.

## Fecha de Implementación

2026-02-27

## Contexto

### Problema Anterior

El flujo de creación de usuarios desde el administrador (iOS) causaba fricción en Android:

1. **Admin crea usuario (iOS):**
   - Crea `member` en Firestore con datos completos (nombre, teléfono, email, etc.)
   - Crea cuenta de autenticación en Firebase Auth

2. **Usuario se loguea (Android):**
   - `autoRegisterUser()` crea registro en `users` collection
   - **Problema:** Siempre creaba con `onboardingCompleted = false`
   - **Problema:** No detectaba que ya existía un `member` con ese email
   - **Resultado:** Onboarding pedía datos que ya existían en `members`

### Solución

Modificar `autoRegisterUser()` para buscar automáticamente si existe un `member` con el mismo email antes de crear el registro en `users`. Si lo encuentra, vincularlo y saltar el onboarding.

---

## Arquitectura

### Colecciones Involucradas

```
┌─────────────────────────────────────────────────────────────┐
│ Firebase Auth                                               │
│ UID: abc123                                                 │
│ Email: usuario@ejemplo.com                                  │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Login
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ autoRegisterUser()                                          │
│ 1. Busca member por email                                   │
│ 2. Si existe → vincula + skip onboarding                    │
│ 3. Si NO existe → onboarding normal                         │
└─────────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           │                               │
      Encontrado                      No encontrado
           │                               │
           ↓                               ↓
┌─────────────────────┐         ┌─────────────────────┐
│ users/{uid}         │         │ users/{uid}         │
│ - linkedMemberId ✅ │         │ - linkedMemberId ❌ │
│ - onboarding: true  │         │ - onboarding: false │
│ - datos copiados    │         │ - datos mínimos     │
└─────────────────────┘         └─────────────────────┘
           │                               │
           │                               │
           ↓                               ↓
┌─────────────────────┐         ┌─────────────────────┐
│ members/{memberId}  │         │ (no existe aún)     │
│ - email             │         │                     │
│ - firstName         │         │ Se creará después   │
│ - phone, etc.       │         │ del onboarding      │
└─────────────────────┘         └─────────────────────┘
```

### Casos de Uso

| Escenario | Member existe? | Resultado |
|-----------|----------------|-----------|
| Admin crea usuario desde iOS | ✅ Sí | Auto-vincula + skip onboarding |
| Usuario se auto-registra en Android | ❌ No | Onboarding normal → crea member |
| Usuario se loguea con Google (sin member) | ❌ No | Onboarding normal → crea member |
| Usuario se loguea con email (member existe) | ✅ Sí | Auto-vincula + skip onboarding |

---

## Implementación

### Función: `findMemberByEmail()`

**Ubicación:** `app/src/main/kotlin/com/shajaru/sajaruboxapp/auth/AuthRepository.kt`

**Propósito:** Buscar un member en Firestore por email.

```kotlin
private suspend fun findMemberByEmail(email: String): DocumentSnapshot? {
    return try {
        val snapshot = db.collection("members")
            .whereEqualTo("email", email)
            .limit(1)
            .get()
            .await()

        if (snapshot.isEmpty) {
            Log.d(TAG, "No se encontró member con email=$email")
            null
        } else {
            val memberDoc = snapshot.documents.first()
            Log.d(TAG, "Member encontrado: id=${memberDoc.id}, email=$email")
            memberDoc
        }
    } catch (e: Exception) {
        Log.e(TAG, "Error buscando member por email: ${e.message}", e)
        null
    }
}
```

**Características:**
- Query simple por email (campo indexado)
- Retorna `DocumentSnapshot?` para acceder a datos
- Logging detallado para debugging
- Manejo de errores con fallback a `null`

### Función Actualizada: `autoRegisterUser()`

**Lógica Modificada:**

```kotlin
private suspend fun autoRegisterUser(user: FirebaseUser, emailOverride: String? = null) {
    try {
        val email = emailOverride ?: user.email
        if (email.isNullOrBlank()) {
            Log.e(TAG, "Email vacío, no se puede registrar")
            return
        }

        val userRef = db.collection("users").document(user.uid)
        val userDoc = userRef.get().await()

        // Si el usuario ya existe en users, solo actualizar
        if (userDoc.exists()) {
            // ... (sin cambios)
            return
        }

        // 🆕 NUEVO: Buscar member existente por email
        val existingMember = findMemberByEmail(email)

        if (existingMember != null) {
            // Member encontrado: crear user vinculado
            val userData = hashMapOf<String, Any>(
                "id" to user.uid,
                "email" to email,
                "firstName" to (existingMember.get("firstName") as? String ?: ""),
                "paternalLastName" to (existingMember.get("paternalLastName") as? String ?: ""),
                "phone" to (existingMember.get("phone") as? String ?: ""),
                "role" to "member",
                "isActive" to true,
                "linkedMemberId" to existingMember.id,  // ✅ Vinculación
                "onboardingCompleted" to true,          // ✅ Skip onboarding
                "isMinor" to false,
                "createdAt" to Timestamp.now(),
                "updatedAt" to Timestamp.now()
            )

            // Agregar campos opcionales
            (existingMember.get("maternalLastName") as? String)?.let {
                userData["maternalLastName"] = it
            }
            (existingMember.get("photoURL") as? String)?.let {
                userData["photoURL"] = it
            }

            userRef.set(userData).await()
            Log.d(TAG, "Usuario vinculado a member: linkedMemberId=${existingMember.id}")
            return
        }

        // No existe member: flujo normal (onboarding requerido)
        // ... (lógica existente sin cambios)
    } catch (e: Exception) {
        Log.e(TAG, "Error en auto-registro: ${e.message}", e)
    }
}
```

### Datos Copiados del Member

Cuando se encuentra un member existente, se copian los siguientes campos al crear el `user`:

| Campo en `members` | Campo en `users` | Obligatorio |
|--------------------|------------------|-------------|
| `email` | `email` | ✅ Sí |
| `firstName` | `firstName` | ✅ Sí |
| `paternalLastName` | `paternalLastName` | ✅ Sí |
| `maternalLastName` | `maternalLastName` | ❌ No (opcional) |
| `phone` | `phone` | ❌ No |
| `photoURL` | `photoURL` | ❌ No (opcional) |

**Campos adicionales en `user`:**
- `linkedMemberId`: ID del documento en `members`
- `onboardingCompleted`: `true` (para saltar onboarding)
- `role`: `"member"` (siempre, no puede ser admin desde este flujo)
- `isActive`: `true`
- `isMinor`: `false`

---

## Flujo de Navegación

### Con Member Existente (Skip Onboarding)

```
Usuario → SignIn
    ↓
signInWithEmail() / signInWithGoogle()
    ↓
autoRegisterUser()
    ↓
findMemberByEmail() → ✅ Member encontrado
    ↓
Crear user con:
- onboardingCompleted = true
- linkedMemberId = member.id
    ↓
NavGraph verifica isOnboardingCompleted()
    ↓
✅ true → Navega a MemberHome
    ↓
Usuario ve app completa (sin onboarding)
```

### Sin Member Existente (Onboarding Normal)

```
Usuario → SignIn
    ↓
signInWithEmail() / signInWithGoogle()
    ↓
autoRegisterUser()
    ↓
findMemberByEmail() → ❌ Member NO encontrado
    ↓
Crear user con:
- onboardingCompleted = false
- linkedMemberId = null
    ↓
NavGraph verifica isOnboardingCompleted()
    ↓
❌ false → Navega a Onboarding
    ↓
Usuario completa formulario
    ↓
OnboardingViewModel crea member
    ↓
Vincula user.linkedMemberId = member.id
```

---

## Verificación en NavGraph

**Ubicación:** `app/src/main/kotlin/com/shajaru/sajaruboxapp/navigation/NavGraph.kt`

```kotlin
@Composable
fun AppNavGraph(
    modifier: Modifier = Modifier,
    authRepository: AuthRepository = AuthRepository()
) {
    // ...
    var needsOnboarding by remember { mutableStateOf<Boolean?>(null) }

    LaunchedEffect(currentUser) {
        if (currentUser != null) {
            isLoading = true
            val isAdmin = authRepository.isAdmin()
            val onboardingCompleted = authRepository.isOnboardingCompleted()

            // ✅ Si onboardingCompleted=true, salta onboarding
            needsOnboarding = !onboardingCompleted
            // ...
        }
    }
    // ...
}
```

**Método en AuthRepository:**

```kotlin
suspend fun isOnboardingCompleted(): Boolean {
    val uid = currentUser?.uid ?: return false
    return try {
        val userDoc = db.collection("users").document(uid).get().await()
        userDoc.getBoolean("onboardingCompleted") ?: false
    } catch (e: Exception) {
        Log.e(TAG, "Error verificando onboarding: ${e.message}", e)
        false
    }
}
```

---

## Logs de Debugging

### Member Encontrado

```
D/AuthRepository: Nuevo usuario: email=usuario@ejemplo.com
D/AuthRepository: Member encontrado: id=member123, email=usuario@ejemplo.com
D/AuthRepository: Usuario vinculado a member: linkedMemberId=member123
```

### Member NO Encontrado

```
D/AuthRepository: Nuevo usuario: email=nuevo@ejemplo.com
D/AuthRepository: No se encontró member con email=nuevo@ejemplo.com
D/AuthRepository: Usuario creado: role=member (requiere onboarding)
```

### Error en Query

```
E/AuthRepository: Error buscando member por email: <mensaje de error>
D/AuthRepository: Usuario creado: role=member (requiere onboarding)
```

---

## Casos Edge

### ¿Qué pasa si hay múltiples members con el mismo email?

**Respuesta:** La query usa `.limit(1)`, retorna el primero encontrado. En la práctica esto no debería pasar porque `email` debe ser único en `members`.

**Recomendación:** Agregar índice único en `members.email` en reglas de Firestore.

### ¿Qué pasa si el member tiene email vacío?

**Respuesta:** La query no encontrará nada (`whereEqualTo("email", null)` retorna vacío). El flujo continúa normal con onboarding requerido.

### ¿Qué pasa si falla la query?

**Respuesta:** `findMemberByEmail()` retorna `null` en el catch. El flujo continúa como si no existiera member (onboarding requerido). Es fail-safe.

### ¿Se puede desvincular un user de un member?

**Respuesta:** Sí, actualizando `user.linkedMemberId = null`. El onboarding NO se vuelve a mostrar porque `onboardingCompleted` sigue en `true`.

---

## Testing

### Prueba Manual

1. **Setup:**
   - Desde iOS admin: crear member con email `test@ejemplo.com`
   - Crear cuenta de autenticación con email `test@ejemplo.com`

2. **Test en Android:**
   - Loguear con `test@ejemplo.com`
   - Verificar en Logcat:
     ```
     D/AuthRepository: Member encontrado: id=<memberId>
     D/AuthRepository: Usuario vinculado a member
     ```
   - Verificar que navega directo a `MemberHome` (sin onboarding)

3. **Verificación en Firestore:**
   ```javascript
   // users/{uid}
   {
     "email": "test@ejemplo.com",
     "firstName": "Test",
     "paternalLastName": "Usuario",
     "linkedMemberId": "<memberId>",
     "onboardingCompleted": true,  // ✅
     "role": "member"
   }
   ```

### Test Unitario (TODO)

```kotlin
@Test
fun `autoRegisterUser vincula cuando member existe`() = runTest {
    // Given: member existente en Firestore
    val email = "test@ejemplo.com"
    val memberId = "member123"
    // Mock: db.collection("members").whereEqualTo("email", email).get()

    // When: autoRegisterUser() se llama
    authRepository.signInWithEmail(email, "password")

    // Then: user se crea con linkedMemberId y onboardingCompleted=true
    val user = authRepository.getUserProfile()
    assertEquals(memberId, user?.linkedMemberId)
    assertTrue(user?.onboardingCompleted ?: false)
}
```

---

## Ventajas

### ✅ Mejor Experiencia de Usuario

- Usuarios creados desde admin no llenan formularios duplicados
- Login directo a la app sin fricción

### ✅ Consistencia de Datos

- Single source of truth: datos en `members`
- `users` es una vista vinculada, no duplica información

### ✅ Automatización

- No requiere pasos manuales de vinculación
- El sistema detecta y vincula automáticamente

### ✅ Backward Compatible

- Auto-registro sigue funcionando normal
- No rompe flujos existentes

### ✅ Fail-Safe

- Si falla la búsqueda, continúa con onboarding normal
- No bloquea el login del usuario

---

## Consideraciones

### ⚠️ Email como Identificador Único

Este sistema asume que el email es único entre members. Si múltiples members comparten email, solo se vinculará al primero encontrado.

**Recomendación:** Implementar validación en iOS admin para evitar emails duplicados en `members`.

### ⚠️ Sincronización de Datos

Los datos se copian **una vez** al crear el `user`. Cambios posteriores en `members` NO se sincronizan automáticamente.

**Casos:**
- Admin actualiza nombre en `members` → `user.firstName` NO se actualiza
- Admin actualiza teléfono en `members` → `user.phone` NO se actualiza

**Solución futura:** Implementar Cloud Function que sincronice cambios de `members` a `users` vinculados.

### ⚠️ Rol de Usuario

Usuarios vinculados automáticamente siempre tienen `role = "member"`. No pueden ser admin por este flujo.

**Para crear admin:** Debe modificarse manualmente en Firestore después de crear el user.

---

## Próximos Pasos

1. **Cloud Function de Sincronización:**
   - Trigger en `members/{id}` → update
   - Buscar `users` con `linkedMemberId == memberId`
   - Actualizar campos (firstName, paternalLastName, phone, etc.)

2. **Validación de Email Único:**
   - Implementar en iOS admin
   - Regla de Firestore Security Rules

3. **Test Unitario:**
   - Mockear Firestore
   - Probar ambos casos (member existe / no existe)

4. **Metrics:**
   - Agregar Analytics event: `user_member_auto_linked`
   - Trackear cuántos usuarios se vinculan automáticamente

---

## Historial de Versiones

### v1.2.3 (2026-02-27) - Fix: Vinculación retroactiva

**Problema detectado en v1.2.2:**
- Solo vinculaba usuarios NUEVOS al registrarse
- Usuarios existentes que se loguearon antes del fix (como `eve@test.com`) quedaron sin vincular
- `autoRegisterUser()` detectaba que el user existe y salía sin verificar member

**Solución:**
- Modificado bloque de "usuario existente" en `autoRegisterUser()`
- Ahora verifica si el user tiene `linkedMemberId`
- Si NO lo tiene: busca member por email y vincula automáticamente
- Si ya lo tiene: solo actualiza email/nombre (sin cambios)

**Beneficios:**
- ✅ Fix retroactivo para todos los usuarios creados desde admin antes de v1.2.2
- ✅ Solo requiere que el usuario se loguee de nuevo
- ✅ No afecta usuarios ya vinculados correctamente

**Casos cubiertos:**
1. User nuevo + member existe → vincula (desde v1.2.2)
2. User nuevo + member NO existe → onboarding (desde v1.2.2)
3. User existente + ya vinculado → actualiza email (desde v1.2.3) ✨ NUEVO
4. User existente + NO vinculado + member existe → vincula (desde v1.2.3) ✨ NUEVO
5. User existente + NO vinculado + member NO existe → actualiza email (desde v1.2.3) ✨ NUEVO

### v1.2.2 (2026-02-27) - Release inicial

**Primera implementación:**
- Sistema de auto-vinculación user ↔ member
- Función `findMemberByEmail()` para buscar members por email
- Vinculación automática al crear usuarios NUEVOS
- Skip onboarding para usuarios con member existente

**Limitación:**
- Solo funcionaba para usuarios nuevos
- Usuarios existentes sin vincular no se reparaban

---

## Versión Actual

**Release:** v1.2.3
**Fecha:** 2026-02-27
**Estado:** ✅ Producción
