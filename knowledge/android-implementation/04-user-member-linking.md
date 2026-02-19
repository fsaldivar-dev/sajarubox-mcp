# User-Member Linking — Android

> Issue #27 — **Pendiente de implementar.**
> Vincula la cuenta Android (`users/{uid}`) con el registro del gym (`members/{memberId}`)
> creado por el admin en iOS. El vinculo se hace automaticamente por numero de telefono.

---

## Por que existe este flujo

El admin registra a los miembros desde iOS **antes** de que tengan cuenta en la app.
Cuando un miembro se descarga la app y completa el onboarding, la app busca si ya
existe un registro en `members` con su numero de telefono. Si lo encuentra, los vincula.

```
Admin (iOS)                    Miembro (Android)
────────────────               ──────────────────────────────────
Registra a Juan                Juan descarga la app
  members/{id}                 Hace registro + onboarding
    phone: "7299595662"          users/{uid}
    linkedUserId: null             telefono: "7299595662"
                                   linkedMemberId: null  ← falta
                      ↕ linking bidireccional
                    members/{id}.linkedUserId = uid
                    users/{uid}.linkedMemberId = memberId
```

---

## Estado actual del codigo

| Elemento | Estado | Problema |
|----------|--------|----------|
| `User.linkedMemberId` | ❌ FALTA | No existe el campo en `User.kt` |
| `Member.linkedUserId` | ❌ INCORRECTO | Se llama `userId` en lugar de `linkedUserId` |
| Busqueda por telefono | ❌ NO | `MemberRepository` no tiene metodo para buscar por `phone` |
| Vinculacion bidireccional | ❌ NO | No hay logica que actualice ambos documentos |
| Integracion con onboarding | ❌ NO | `OnboardingViewModel` no llama el flujo de linking |

---

## Cambios requeridos

### 1. `User.kt` — agregar campo

```kotlin
data class User(
    // ... campos existentes ...
    val linkedMemberId: String? = null   // FK a members/{id} — null si no esta vinculado
)
```

### 2. `Member.kt` — renombrar campo incorrecto

```kotlin
data class Member(
    // ANTES (incorrecto):
    // val userId: String = ""

    // DESPUES (correcto, coincide con Firestore y con iOS):
    val linkedUserId: String? = null     // FK a users/{uid} — null si no tiene cuenta
)
```

> ⚠️ Al renombrar `userId` → `linkedUserId`, revisar todos los lugares donde se usa
> `member.userId` en el codigo y actualizar a `member.linkedUserId`.

### 3. `MemberRepository.kt` — agregar metodos de linking

```kotlin
class MemberRepository {

    private val db = FirebaseFirestore.getInstance()

    // Buscar miembros sin vincular con este telefono normalizado
    suspend fun getMembersByPhoneUnlinked(phone: String): List<Member> {
        return try {
            db.collection("members")
                .whereEqualTo("phone", phone)
                .whereEqualTo("linkedUserId", null)
                .get()
                .await()
                .documents
                .mapNotNull { doc ->
                    doc.toObject(Member::class.java)?.copy(id = doc.id)
                }
        } catch (e: Exception) {
            emptyList()
        }
    }

    // Vincular el miembro con el usuario
    suspend fun linkToUser(memberId: String, userId: String): Boolean {
        return try {
            db.collection("members")
                .document(memberId)
                .update("linkedUserId", userId)
                .await()
            true
        } catch (e: Exception) {
            false
        }
    }
}
```

### 4. `UserRepository.kt` — agregar metodo de linking

```kotlin
class UserRepository {

    // Guardar linkedMemberId en el usuario
    suspend fun linkToMember(uid: String, memberId: String): Boolean {
        return try {
            db.collection("users")
                .document(uid)
                .update("linkedMemberId", memberId)
                .await()
            true
        } catch (e: Exception) {
            false
        }
    }
}
```

### 5. `OnboardingViewModel.kt` — integrar el linking al completar

```kotlin
fun completeOnboarding() {
    if (!validateCurrentStep()) return
    val uid = authRepository.getUserId() ?: return

    viewModelScope.launch {
        _isSaving.value = true
        _error.value = null

        // Guardar datos del usuario (logica existente)
        val success = userRepository.updateOnboardingData(uid, buildUpdateData())

        if (success) {
            // NUEVO: intentar vinculacion por telefono
            val telefono = _data.value.telefono
            attemptMemberLinking(uid, telefono)

            _onboardingComplete.value = true
        } else {
            _error.value = "Error al guardar los datos. Intenta de nuevo."
        }
        _isSaving.value = false
    }
}

private suspend fun attemptMemberLinking(uid: String, telefono: String) {
    // 1. Normalizar: solo digitos
    val normalized = telefono.filter { it.isDigit() }
    if (normalized.isEmpty()) return

    // 2. Buscar members con ese telefono y sin linkedUserId
    val matches = memberRepository.getMembersByPhoneUnlinked(normalized)

    when {
        matches.isEmpty() -> {
            // Sin registro previo — el miembro aparecera como NotLinked en el Home
            // (estado normal para miembros nuevos que aun no han ido al gym)
            return
        }
        matches.size == 1 -> {
            // Vinculacion automatica
            val memberId = matches.first().id
            performLinking(uid, memberId)
        }
        else -> {
            // Multiples matches — exponer para que el usuario seleccione
            _matchingMembers.value = matches
        }
    }
}

private suspend fun performLinking(uid: String, memberId: String) {
    // Vincular bidireccional (en paralelo o secuencial — ambos deben completarse)
    val memberLinked = memberRepository.linkToUser(memberId, uid)
    val userLinked = userRepository.linkToMember(uid, memberId)

    if (!memberLinked || !userLinked) {
        // Log del error pero no bloquear al usuario — el linking se puede reintentar
        // desde MemberHomeScreen cuando detecta NotLinked + telefono registrado
    }
}
```

---

## Nuevos estados en el ViewModel (si hay multiples matches)

```kotlin
// Agregar a OnboardingViewModel:
private val _matchingMembers = MutableStateFlow<List<Member>>(emptyList())
val matchingMembers: StateFlow<List<Member>> = _matchingMembers.asStateFlow()

// El usuario selecciona uno de la lista:
fun selectMember(memberId: String) {
    val uid = authRepository.getUserId() ?: return
    viewModelScope.launch {
        performLinking(uid, memberId)
        _matchingMembers.value = emptyList()
        _onboardingComplete.value = true
    }
}
```

---

## Normalizacion del telefono

```kotlin
// CORRECTO — solo digitos, sin espacios, guiones ni prefijos
val normalized = telefono.filter { it.isDigit() }

// Ejemplos:
// "729 959 5662"       → "7299595662"   ← formato comun en Mexico
// "+52 729 959 5662"   → "527299595662" ← con prefijo pais
// "729-959-5662"       → "7299595662"
// "(729) 959-5662"     → "7299595662"
```

> ⚠️ El campo `phone` en `members` (iOS) tambien debe estar normalizado de la misma manera.
> Si iOS guarda "729 959 5662" con espacios y Android busca "7299595662", el query no va
> a encontrar nada. Coordinar con iOS para garantizar el mismo formato en Firestore.

---

## Flujo completo (diagrama)

```
OnboardingViewModel.completeOnboarding()
    │
    ├─ userRepository.updateOnboardingData(uid, data)  ← guarda perfil
    │
    └─ attemptMemberLinking(uid, telefono)
           │
           ├─ normalizar telefono → solo digitos
           │
           └─ memberRepository.getMembersByPhoneUnlinked(normalized)
                  │
                  ├─ 0 matches → no vincula, usuario queda como NotLinked
                  │              (normal — el admin lo registra despues)
                  │
                  ├─ 1 match  → performLinking(uid, memberId)
                  │              members/{memberId}.linkedUserId = uid
                  │              users/{uid}.linkedMemberId = memberId
                  │
                  └─ N matches → _matchingMembers = matches
                                 UI muestra lista para seleccionar
```

---

## Reintento de linking desde MemberHomeScreen

Si el onboarding completo sin vincular (0 matches), el Home muestra `NotLinked`.
Cuando el admin registra al miembro despues, la app puede reintentar el linking:

```kotlin
// En MemberHomeViewModel.loadMemberState():
// Si linkedMemberId == null, intentar linking de nuevo con el telefono guardado

val linkedMemberId = userDoc.getString("linkedMemberId")
if (linkedMemberId == null) {
    val telefono = userDoc.getString("telefono") ?: ""
    val linked = tryLinkingByPhone(uid, telefono)
    if (!linked) {
        _memberState.value = MemberHomeState.NotLinked
        return@launch
    }
    // Si vinculo, recargar el estado
    loadMemberState()
    return@launch
}
```

---

## Permisos Firestore requeridos

Para que Android pueda ejecutar el query y la escritura:

```javascript
// members/{memberId}
match /members/{memberId} {
  // Leer: si el uid es el linkedUserId del documento (o si no tiene linkedUserId)
  allow read: if request.auth != null
              && (resource.data.linkedUserId == request.auth.uid
                  || resource.data.linkedUserId == null);

  // Escribir linkedUserId: solo si el campo estaba null y se esta vinculando con el uid actual
  allow update: if request.auth != null
                && resource.data.linkedUserId == null
                && request.resource.data.linkedUserId == request.auth.uid
                && request.resource.data.diff(resource.data).affectedKeys().hasOnly(["linkedUserId"]);
}
```

> ⚠️ Las reglas de Firestore para `members` las administra iOS (son su coleccion principal).
> Coordinar con el admin de iOS para agregar estos permisos.

---

## Errores comunes

### 1. Query sin indice en Firestore

**Error:** `FAILED_PRECONDITION: The query requires a composite index.`

**Causa:** La query filtra por `phone` Y `linkedUserId` — requiere indice compuesto.

**Solucion:** Crear en Firestore Console:
- Collection: `members`
- Fields: `phone ASC`, `linkedUserId ASC`

O usar el link que aparece en Logcat al ejecutar la query por primera vez.

### 2. Telefono con formato distinto entre iOS y Android

**Causa:** iOS guarda "729 959 5662" con espacios; Android busca "7299595662".

**Solucion:** Acordar normalizar SIEMPRE a solo digitos antes de guardar en Firestore.
En iOS, aplicar el mismo filtro al guardar `phone` en `members`.

### 3. `linkedUserId` null vs campo ausente

**Causa:** En Firestore, un campo con valor `null` y un campo que no existe son distintos.
El query `.whereEqualTo("linkedUserId", null)` solo encuentra documentos donde el campo
existe y es `null` — no donde el campo no existe.

**Solucion:** Al crear un `member` desde iOS, siempre incluir `linkedUserId: null`
explicitamente en el documento.

### 4. Race condition en linking bidireccional

**Causa:** Si falla la segunda escritura, los documentos quedan en estado inconsistente
(member vinculado a user, pero user no vinculado a member).

**Solucion a corto plazo:** Reintentar desde `MemberHomeScreen` si `linkedMemberId == null`
pero el member ya tiene `linkedUserId == uid`.

**Solucion robusta:** Usar Firestore batch write:
```kotlin
val batch = db.batch()
batch.update(db.collection("members").document(memberId), "linkedUserId", uid)
batch.update(db.collection("users").document(uid), "linkedMemberId", memberId)
batch.commit().await()
```
