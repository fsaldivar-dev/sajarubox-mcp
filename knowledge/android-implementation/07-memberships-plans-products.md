# Android: Membresías, Planes y Productos (v1.1.0)

## Resumen

Implementación completa de visualización de membresías activas, catálogo de planes disponibles y productos de tienda en la app Android (Fase 1 - Pública).

## Fecha de Implementación

2026-02-23

## Contexto

La app Android es la **app pública** para miembros/clientes. Los usuarios pueden:
- Ver su membresía activa
- Explorar planes disponibles para contratar
- Ver productos de la tienda

**Nota:** Esta versión es **read-only** (solo visualización). El sistema de checkout/pagos se implementará en una versión futura.

---

## Arquitectura de Datos

### Esquema MCP Adoptado

La implementación sigue el esquema MCP unificado:

#### Membresías Activas
- **Fuente de verdad:** Documento `members/{memberId}`
- **Campos relevantes:**
  - `membershipStatus`: "active" | "inactive" | "suspended"
  - `membershipPlanSnapshot`: Snapshot del plan contratado
  - `membershipStartDate`: Timestamp de inicio
  - `membershipEndDate`: Timestamp de fin
  - `remainingVisits`: Int (para planes de visita)

#### Catálogo de Planes
- **Colección:** `membership_plans`
- **Campos:**
  - `planName`: String
  - `planType`: "time_based" | "visit_based" | "mixed"
  - `planPrice`: Number
  - `durationInDays`: Int (opcional)
  - `totalVisits`: Int (opcional)
  - `maxMembers`: Int
  - `isActive`: Boolean
  - `sortOrder`: Int

#### Catálogo de Productos
- **Colección:** `products`
- **Campos:**
  - `name`: String
  - `description`: String
  - `category`: "equipment" | "apparel" | "supplements" | etc.
  - `price`: Number
  - `stock`: Int
  - `isActive`: Boolean

---

## Modelos

### 1. MembershipPlan

```kotlin
enum class MembershipPlanType {
    time_based,
    visit_based,
    mixed
}

data class MembershipPlan(
    val id: String = "",
    val name: String = "",
    val type: MembershipPlanType = MembershipPlanType.time_based,
    val price: Double = 0.0,
    val currency: String = "MXN",
    val durationInDays: Int? = null,
    val totalVisits: Int? = null,
    val maxMembers: Int = 1,
    val description: String = "",
    val isActive: Boolean = true,
    val sortOrder: Int = 0
)
```

### 2. Product

```kotlin
enum class ProductCategory {
    beverages, food, supplements, equipment,
    apparel, accessories, service, other
}

data class Product(
    val id: String = "",
    val name: String = "",
    val description: String = "",
    val category: ProductCategory = ProductCategory.other,
    val price: Double = 0.0,
    val costPrice: Double? = null,
    val currency: String = "MXN",
    val stock: Int = 0,
    val sku: String? = null,
    val imageURL: String? = null,
    val isActive: Boolean = true
)
```

### 3. Membership (actualizado)

```kotlin
enum class MembershipType {
    weekly,
    monthly,
    punch_card;

    fun toDisplayString(): String {
        return when (this) {
            weekly -> "Semanal"
            monthly -> "Mensual"
            punch_card -> "Visita"
        }
    }
}

enum class MembershipStatus {
    active,
    expired,
    paused;

    fun toDisplayString(): String {
        return when (this) {
            active -> "Activa"
            expired -> "Expirada"
            paused -> "Pausada"
        }
    }
}
```

### 4. Class (actualizado)

```kotlin
data class Class(
    val id: String = "",
    val gymId: String = "",
    val fecha: Timestamp? = null,
    val horaInicio: String = "",
    val duracionMin: Int = 60,
    val nombre: String = "",
    val capacidadMax: Int = 14,
    val recurrenceGroupId: String? = null,  // Nuevo
    val isActive: Boolean = true,            // Nuevo
    val createdAt: Timestamp? = null,
    val updatedAt: Timestamp? = null
)
```

### 5. ClassBooking (actualizado)

```kotlin
data class ClassBooking(
    val id: String = "",
    val classId: String = "",
    val userId: String = "",
    val gymId: String = "",
    val estado: BookingStatus = BookingStatus.activa,
    val environment: String = "stage"  // Nuevo
)
```

---

## Repositorios

### 1. MembershipPlanRepository

**Ubicación:** `app/src/main/kotlin/com/shajaru/sajaruboxapp/data/repository/MembershipPlanRepository.kt`

**Métodos:**
```kotlin
suspend fun getActivePlans(): List<MembershipPlan>
suspend fun getPlan(planId: String): MembershipPlan?
```

**Queries:**
- Filtra por `isActive = true`
- Ordena por `sortOrder`
- Ambiente: No filtra por environment (catálogo público)

### 2. ProductRepository

**Ubicación:** `app/src/main/kotlin/com/shajaru/sajaruboxapp/data/repository/ProductRepository.kt`

**Métodos:**
```kotlin
suspend fun getActiveProducts(): List<Product>
suspend fun getProductsByCategory(category: ProductCategory): List<Product>
suspend fun getProduct(productId: String): Product?
```

**Queries:**
- Filtra por `isActive = true`
- Ordena alfabéticamente por nombre
- Ambiente: No filtra por environment (catálogo público)

### 3. BookingRepository (actualizado)

**Cambios críticos:**
- Todos los métodos ahora filtran por `environment = "stage"`
- Afecta: `getBookingsByClass`, `getBookingCount`, `hasBooking`, `getBookingsByMember`

**Razón:** Evitar mezclar datos de diferentes ambientes (stage, production)

---

## ViewModels

### 1. MemberActiveMembershipViewModel (refactorizado)

**Ubicación:** `app/src/main/kotlin/com/shajaru/sajaruboxapp/ui/profile/MemberActiveMembershipViewModel.kt`

**Cambio fundamental:**
- **Antes:** Leía de colección `memberships`
- **Ahora:** Lee de documento `members/{memberId}` (esquema MCP)

**Flujo:**
1. Obtiene `userId` del usuario autenticado
2. Lee `user.linkedMemberId`
3. Lee documento `members/{linkedMemberId}`
4. Extrae campos de membresía del member document:
   - `membershipStatus`
   - `membershipPlanSnapshot`
   - `remainingVisits`
   - `membershipStartDate`
   - `membershipEndDate`
5. Convierte a modelo legacy `Membership` para compatibilidad con UI

**Mapeo de tipos:**
```kotlin
val tipo = when (planType) {
    "visit_based" -> MembershipType.punch_card
    "time_based" -> MembershipType.monthly
    else -> MembershipType.monthly
}
```

### 2. MembershipPlansViewModel

**Ubicación:** `app/src/main/kotlin/com/shajaru/sajaruboxapp/ui/membershipplans/MembershipPlansViewModel.kt`

**Estados:**
```kotlin
val plans: StateFlow<List<MembershipPlan>>
val isLoading: StateFlow<Boolean>
```

**Lógica:**
- Carga planes activos en `init`
- Ordena por `sortOrder` (viene del repository)
- Maneja estados vacíos

### 3. StoreViewModel

**Ubicación:** `app/src/main/kotlin/com/shajaru/sajaruboxapp/ui/store/StoreViewModel.kt`

**Estados:**
```kotlin
val products: StateFlow<List<Product>>
val isLoading: StateFlow<Boolean>
```

**Lógica:**
- Carga productos activos en `init`
- Ordena alfabéticamente (viene del repository)
- Maneja estados vacíos

---

## Pantallas

### 1. MemberActiveMembershipScreen (actualizada)

**Ubicación:** `app/src/main/kotlin/com/shajaru/sajaruboxapp/ui/profile/MemberActiveMembershipScreen.kt`

**Cambios:**
- Usa `membership.tipo.toDisplayString()` en lugar de `.name`
- Usa `membership.estado.toDisplayString()` en lugar de `.name`
- Muestra tipos en español: "Mensual", "Semanal", "Visita"
- Muestra estados en español: "Activa", "Expirada", "Pausada"

### 2. MembershipPlansScreen (nueva)

**Ubicación:** `app/src/main/kotlin/com/shajaru/sajaruboxapp/ui/membershipplans/MembershipPlansScreen.kt`

**Características:**
- Lista de planes en `LazyColumn`
- Cada plan muestra:
  - Nombre del plan
  - Precio formateado en MXN
  - Tipo (Mensual, Semanal, Visita)
  - Duración o número de visitas
  - Máximo de miembros
  - Descripción
- Estados: loading, empty, success

**Acceso:**
- Desde `MemberProfileScreen` → Botón "Ver Planes Disponibles"

### 3. StoreScreen (actualizada)

**Ubicación:** `app/src/main/kotlin/com/shajaru/sajaruboxapp/ui/store/StoreScreen.kt`

**Cambios:**
- Reemplazada completamente (antes era placeholder)
- Lista de productos en `LazyColumn`
- Cada producto muestra:
  - Nombre
  - Precio formateado en MXN
  - Categoría
  - Stock disponible
  - Indicador visual de disponibilidad (verde/rojo)
- Estados: loading, empty, success

---

## Navegación

### Rutas Agregadas

**NavGraph.kt:**
```kotlin
object MembershipPlans : Screen("membership_plans")

composable(Screen.MembershipPlans.route) {
    MembershipPlansScreen(
        onBack = { navController.popBackStack() }
    )
}
```

### Callbacks

**MemberHomeScreen.kt:**
```kotlin
MemberProfileScreen(
    onNavigateToMembershipPlans = {
        rootNavController.navigate(Screen.MembershipPlans.route)
    }
)
```

---

## Reglas de Firestore

### Nuevas Reglas Agregadas

```javascript
// Members - Lectura pública para usuarios autenticados
match /members/{memberId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin();
}

// Membership Plans - Catálogo público
match /membership_plans/{planId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin();
}

// Products - Catálogo público
match /products/{productId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin();
}
```

### Reglas Actualizadas

```javascript
// ClassBookings - Validación de environment
match /classBookings/{bookingId} {
  allow create: if isAuthenticated() &&
    request.resource.data.environment == 'stage' && (
      isAdmin() ||
      request.resource.data.userId == request.auth.uid
    );

  allow update: if isAuthenticated() && (
    isAdmin() ||
    (resource.data.userId == request.auth.uid &&
     request.resource.data.userId == request.auth.uid)
  );
}
```

---

## Fixes Críticos

### 1. PERMISSION_DENIED al Cancelar Reservas

**Problema:**
- Usuarios no podían cancelar reservas (error de permisos)

**Causa:**
- Reglas de Firestore muy restrictivas
- Falta de validación bidireccional en update

**Solución:**
```javascript
allow update: if isAuthenticated() && (
  isAdmin() ||
  (resource.data.userId == request.auth.uid &&
   request.resource.data.userId == request.auth.uid)
);
```

### 2. Warnings de CustomClassMapper

**Problema:**
```
No setter/field for environment found on class ClassBooking
No setter/field for recurrenceGroupId found on class Class
No setter/field for isActive found on class Class
```

**Solución:**
- Agregados campos faltantes a los modelos
- `ClassBooking.environment: String = "stage"`
- `Class.recurrenceGroupId: String? = null`
- `Class.isActive: Boolean = true`

### 3. Filtros de Environment

**Problema:**
- Queries mezclaban datos de diferentes environments

**Solución:**
- Agregado `.whereEqualTo("environment", "stage")` a todos los queries en `BookingRepository`

---

## Testing

### Casos de Prueba

1. **Membresía Activa:**
   - ✅ Usuario con membresía activa ve sus datos
   - ✅ Usuario sin membresía ve mensaje "No tienes membresía activa"
   - ✅ Tipos se muestran en español

2. **Planes Disponibles:**
   - ✅ Se muestran 4 planes ordenados por `sortOrder`
   - ✅ Precios formateados correctamente en MXN
   - ✅ Navegación funciona correctamente

3. **Productos de Tienda:**
   - ✅ Se muestran 3 productos ordenados alfabéticamente
   - ✅ Indicador de stock funciona
   - ✅ Categorías se muestran correctamente

4. **Reservas:**
   - ✅ Usuarios pueden reservar clases
   - ✅ Usuarios pueden cancelar sus propias reservas
   - ✅ No hay errores de PERMISSION_DENIED

---

## Datos de Prueba en Firestore

### Membership Plans (4 planes)

1. **Plan Mensual** - $350 MXN
   - Tipo: time_based
   - Duración: 30 días
   - MaxMembers: 1

2. **Plan Semanal** - $120 MXN
   - Tipo: time_based
   - Duración: 7 días
   - MaxMembers: 1

3. **Plan de Visita** - $30 MXN
   - Tipo: visit_based
   - Visitas: 1
   - MaxMembers: 1

4. **Plan Familiar Mensual** - $600 MXN
   - Tipo: time_based
   - Duración: 30 días
   - MaxMembers: 4

### Products (3 productos)

1. **Vendas Blancas** - $20 MXN
   - Categoría: equipment
   - Stock: 50

2. **Guantes ADX** - $750 MXN
   - Categoría: equipment
   - Stock: 15

3. **Vendas ADX** - $180 MXN
   - Categoría: equipment
   - Stock: 25

---

## Próximos Pasos

### Funcionalidades Pendientes

1. **Sistema de Checkout/Pagos**
   - Integración con Stripe/MercadoPago
   - Compra de membresías
   - Compra de productos

2. **Gestión de Perfil**
   - Editar datos personales
   - Cambiar foto de perfil
   - Cambiar contraseña

3. **Notificaciones Push**
   - Recordatorios de clases
   - Vencimiento de membresía
   - Confirmación de reservas

4. **Check-in con QR**
   - Generar QR para asistencia
   - Escanear en recepción

---

## Versión

**Release:** v1.1.0
**Fecha:** 2026-02-23
**GitHub:** https://github.com/fsaldivar-dev/sajaru-box-android/releases/tag/v1.1.0
