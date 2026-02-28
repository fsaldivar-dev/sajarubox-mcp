# Android: Configuración Multi-Database (v1.2.0)

## Resumen

Sistema de configuración para soportar múltiples bases de datos de Firestore según el ambiente (development, staging, production). Permite trabajar con datos aislados por ambiente sin mezclar información de testing con producción.

## Fecha de Implementación

2026-02-25

## Contexto

### Problema Anterior

- Todos los ambientes (dev, staging, prod) compartían la misma database de Firestore
- Datos de testing se mezclaban con datos de producción
- No había forma de aislar ambientes completamente
- Riesgo de corrupción de datos de producción durante desarrollo

### Solución

Firebase permite crear múltiples databases dentro de un mismo proyecto. Implementamos un sistema de configuración que:
1. Determina automáticamente qué database usar según el build variant
2. Centraliza la configuración de Firestore
3. Elimina hardcoding de valores de environment

---

## Arquitectura

### Estructura de Databases

El proyecto SajaruBox tiene las siguientes databases en Firebase:

```
Firebase Project: sajarubox
├── (default) → Legacy (no usar para nuevos datos)
├── prod      → Production
├── stage     → Staging
└── test      → Testing/Development
```

**Nota:** La database `(default)` se mantiene por compatibilidad pero no debe usarse para nuevos desarrollos.

### Mapeo por Build Variant

La configuración se determina automáticamente usando BuildConfig:

| Build Variant | Database ID | Environment | Application ID | BuildConfig |
|--------------|-------------|-------------|----------------|-------------|
| debug        | `test`      | `test`      | `com.shajaru.sajaruboxapp` | FIRESTORE_DATABASE_ID="test" |
| staging      | `stage`     | `stage`     | `com.shajaru.sajaruboxapp.stage` | FIRESTORE_DATABASE_ID="stage" |
| release      | `prod`      | `prod`      | `com.shajaru.sajaruboxapp` | FIRESTORE_DATABASE_ID="prod" |

---

## Componentes

### 1. FirestoreConfig

**Ubicación:** `app/src/main/kotlin/com/shajaru/sajaruboxapp/config/FirestoreConfig.kt`

**Propósito:** Objeto singleton que determina la configuración según el build variant usando BuildConfig.

**Propiedades:**

```kotlin
object FirestoreConfig {
    // ID de la database a usar (desde BuildConfig)
    val databaseId: String
        get() = BuildConfig.FIRESTORE_DATABASE_ID

    // Valor para filtros de environment en queries (desde BuildConfig)
    val environment: String
        get() = BuildConfig.ENVIRONMENT

    // Helpers
    val isDebug: Boolean
        get() = BuildConfig.DEBUG

    val isStaging: Boolean
        get() = environment == "stage"

    val isProduction: Boolean
        get() = environment == "prod"

    fun getEnvironmentInfo(): String
}
```

**Configuración en build.gradle.kts:**
```kotlin
buildTypes {
    getByName("debug") {
        buildConfigField("String", "FIRESTORE_DATABASE_ID", "\"test\"")
        buildConfigField("String", "ENVIRONMENT", "\"test\"")
    }
    create("staging") {
        buildConfigField("String", "FIRESTORE_DATABASE_ID", "\"stage\"")
        buildConfigField("String", "ENVIRONMENT", "\"stage\"")
    }
    getByName("release") {
        buildConfigField("String", "FIRESTORE_DATABASE_ID", "\"prod\"")
        buildConfigField("String", "ENVIRONMENT", "\"prod\"")
    }
}

buildFeatures {
    buildConfig = true  // Requerido para generar BuildConfig
}
```

**Uso:**
```kotlin
// En repositorios, para filtros
.whereEqualTo("environment", FirestoreConfig.environment)

// Para lógica condicional
if (FirestoreConfig.isProduction) {
    // Código específico de producción
}
```

### 2. FirestoreProvider

**Ubicación:** `app/src/main/kotlin/com/shajaru/sajaruboxapp/config/FirestoreProvider.kt`

**Propósito:** Provider singleton que proporciona la instancia correcta de Firestore.

**Implementación:**

```kotlin
object FirestoreProvider {
    // Instancia singleton lazy-initialized
    val instance: FirebaseFirestore by lazy {
        initializeFirestore()
    }

    private fun initializeFirestore(): FirebaseFirestore {
        val databaseId = FirestoreConfig.databaseId

        return if (databaseId == "(default)") {
            Firebase.firestore
        } else {
            Firebase.firestore(Firebase.app, databaseId)
        }
    }

    suspend fun clearCache()
    fun getInfo(): String
}
```

**Características:**
- Lazy initialization (solo se crea cuando se usa)
- Logging detallado del ambiente y database
- Fallback a database por defecto en caso de error
- Cache configurado (100 MB, persistencia habilitada)

---

## Migración de Repositorios

### Patrón Anterior (hardcoded)

```kotlin
class MyRepository {
    private val db = FirebaseFirestore.getInstance()

    suspend fun getData(): List<Data> {
        return db.collection("myCollection")
            .whereEqualTo("environment", "stage")  // ❌ Hardcoded
            .get()
            .await()
            .documents
            .mapNotNull { it.toObject(Data::class.java) }
    }
}
```

### Patrón Nuevo (configurado)

```kotlin
import com.shajaru.sajaruboxapp.config.FirestoreConfig
import com.shajaru.sajaruboxapp.config.FirestoreProvider

class MyRepository {
    private val db = FirestoreProvider.instance  // ✅ Usa provider

    suspend fun getData(): List<Data> {
        return db.collection("myCollection")
            .whereEqualTo("environment", FirestoreConfig.environment)  // ✅ Dinámico
            .get()
            .await()
            .documents
            .mapNotNull { it.toObject(Data::class.java) }
    }
}
```

### Checklist de Migración

Para cada repositorio:

1. **Importar clases:**
   ```kotlin
   import com.shajaru.sajaruboxapp.config.FirestoreConfig
   import com.shajaru.sajaruboxapp.config.FirestoreProvider
   ```

2. **Cambiar instancia de Firestore:**
   ```kotlin
   // Antes
   private val db = FirebaseFirestore.getInstance()

   // Después
   private val db = FirestoreProvider.instance
   ```

3. **Reemplazar environment hardcoded:**
   ```kotlin
   // Antes
   "environment" to "stage"
   .whereEqualTo("environment", "stage")

   // Después
   "environment" to FirestoreConfig.environment
   .whereEqualTo("environment", FirestoreConfig.environment)
   ```

---

## Repositorios Actualizados

### Migrados (✅)

1. ✅ **AttendanceRepository** - v1.2.0
2. ✅ **BookingRepository** - v1.2.0 (Primera migración de ejemplo)
3. ✅ **ClassRepository** - v1.2.0
4. ✅ **FirestoreRepository** - v1.2.0 (base class)
5. ✅ **MemberRepository** - v1.2.0
6. ✅ **MembershipPlanRepository** - v1.2.0
7. ✅ **MembershipRepository** - v1.2.0
8. ✅ **ProductRepository** - v1.2.0
9. ✅ **UserRepository** - v1.2.0
10. ✅ **AuthRepository** - v1.2.4 (CRITICAL - usaba getInstance() en lugar de FirestoreProvider)

### No Requieren Cambios (➖)

Ninguno - todos los repositorios que usan Firestore han sido migrados.

---

## Configuración de Firebase Console

### Databases Existentes ✅

El proyecto ya tiene las databases configuradas:

```bash
$ firebase firestore:databases:list

┌───────────────────────────────────────────┐
│ Database Name                             │
├───────────────────────────────────────────┤
│ projects/sajarubox/databases/(default)    │
├───────────────────────────────────────────┤
│ projects/sajarubox/databases/prod         │
├───────────────────────────────────────────┤
│ projects/sajarubox/databases/stage        │
├───────────────────────────────────────────┤
│ projects/sajarubox/databases/test         │
└───────────────────────────────────────────┘
```

**Acceso:** https://console.firebase.google.com/project/sajarubox/firestore

### Verificar Reglas de Seguridad

Cada database debe tener sus propias reglas de seguridad configuradas. Para verificar y actualizar:

```bash
# Ver reglas de una database específica
firebase firestore:rules:get --database=stage

# Desplegar reglas a una database específica
firebase deploy --only firestore:stage
```

### Índices

Cada database necesita sus propios índices compuestos. Firebase mostrará errores en Logcat indicando qué índices crear.

**Ejemplo de índice común:**
```javascript
// Colección: classBookings
{
  "fields": [
    { "fieldPath": "classId", "order": "ASCENDING" },
    { "fieldPath": "estado", "order": "ASCENDING" },
    { "fieldPath": "environment", "order": "ASCENDING" }
  ]
}
```

---

## Build Configuration

### Build Types (build.gradle.kts)

```kotlin
android {
    buildFeatures {
        buildConfig = true  // ✅ Requerido para generar BuildConfig
        compose = true
    }
}

buildTypes {
    getByName("debug") {
        isMinifyEnabled = false
        signingConfig = signingConfigs.getByName("debug")
        buildConfigField("String", "FIRESTORE_DATABASE_ID", "\"test\"")
        buildConfigField("String", "ENVIRONMENT", "\"test\"")
    }

    create("staging") {
        isMinifyEnabled = false
        applicationIdSuffix = ".stage"
        versionNameSuffix = "-stage"
        signingConfig = signingConfigs.getByName("staging")
        buildConfigField("String", "FIRESTORE_DATABASE_ID", "\"stage\"")
        buildConfigField("String", "ENVIRONMENT", "\"stage\"")
    }

    getByName("release") {
        isMinifyEnabled = false
        proguardFiles(/* ... */)
        signingConfig = signingConfigs.getByName("release")
        buildConfigField("String", "FIRESTORE_DATABASE_ID", "\"prod\"")
        buildConfigField("String", "ENVIRONMENT", "\"prod\"")
    }
}
```

### Compilar por Ambiente

La database se selecciona automáticamente según el build variant:

```bash
# Development (usa database "test" automáticamente)
./gradlew assembleDebug

# Staging (usa database "stage" automáticamente)
./gradlew assembleStaging

# Production (usa database "prod" automáticamente)
./gradlew assembleRelease
```

No es necesario configurar nada manualmente - BuildConfig se genera en compile-time con los valores correctos para cada variant.

---

## Testing

### Unit Tests

Los tests unitarios pueden usar una database de test o mockear Firestore:

```kotlin
@Before
fun setup() {
    // Mockear FirestoreProvider
    mockkObject(FirestoreProvider)
    every { FirestoreProvider.instance } returns mockFirestore
}
```

### Integration Tests

Para tests de integración, usar el emulador de Firestore:

```bash
# Iniciar emulador
firebase emulators:start --only firestore

# Configurar SDK para usar emulador
FirebaseFirestore.getInstance()
    .useEmulator("localhost", 8080)
```

---

## Debugging

### Verificar Configuración Actual

Agregar en cualquier Activity o ViewModel:

```kotlin
Log.d("Firestore", FirestoreProvider.getInfo())
Log.d("Config", FirestoreConfig.getEnvironmentInfo())
```

**Output esperado:**
```
Environment: stage
Database ID: stage
Build Type: staging
Version: 1.2.0 (2)
Firestore Instance: [DEFAULT]
```

### Limpiar Cache

Si cambias de database manualmente o hay problemas de sincronización:

```kotlin
// En una coroutine
FirestoreProvider.clearCache()
```

---

## Ventajas

### ✅ Aislamiento de Datos
- Development no afecta production
- Testing seguro sin riesgo de corrupción

### ✅ Configuración Centralizada
- Un solo punto de cambio
- No más hardcoding de valores

### ✅ Seguridad
- Reglas de seguridad específicas por ambiente
- Datos de producción protegidos

### ✅ Escalabilidad
- Fácil agregar nuevos ambientes
- QA, UAT, etc.

### ✅ Debugging
- Logs claros de qué database se usa
- Información de ambiente disponible

---

## Consideraciones

### ⚠️ Costos

Cada database cuenta para el uso total del proyecto Firebase:
- Lecturas/escrituras suman
- Almacenamiento suma
- Monitorear uso en Firebase Console

### ⚠️ Sincronización

Las databases son independientes:
- Datos en `dev` no aparecen en `stage` o `prod`
- Configuración (planes, productos) debe replicarse manualmente
- Usar scripts de seed/migration para sincronizar catálogos

### ⚠️ Reglas de Seguridad

Cada database tiene sus propias reglas:
- Actualizar en todas las databases cuando cambien
- Usar Firebase CLI para deploy:
  ```bash
  firebase target:apply database dev dev
  firebase target:apply database stage stage
  firebase deploy --only firestore:dev
  firebase deploy --only firestore:stage
  ```

---

## Próximos Pasos

1. **Completar Migración:**
   - ✅ Todos los repositorios migrados a FirestoreProvider
   - ✅ FirestoreConfig configurado con databases reales
   - ✅ Integrado con BuildConfig para selección automática de ambiente

2. **Databases en Firebase:**
   - ✅ Database "test" creada
   - ✅ Database "stage" creada
   - ✅ Database "prod" creada
   - ⏳ Verificar reglas de seguridad en cada database
   - ⏳ Crear índices compuestos necesarios

3. **Scripts de Sincronización:**
   - ⏳ Script para copiar catálogos (planes, productos) entre databases
   - ⏳ Script para seed de datos de testing en database "test"

4. **Documentación:**
   - ✅ Guía de configuración multi-database
   - ⏳ Guía de setup para nuevos developers
   - ⏳ Procedimientos de deployment por ambiente

5. **Testing:**
   - ✅ FirestoreConfig configurado para cambiar según build variant
   - ✅ Verificado que cada build usa la database correcta (debug→test, staging→stage, release→prod)
   - ⏳ Pruebas de integración con cada ambiente

---

## Historial de Versiones

### v1.2.4 (2026-02-27) - CRITICAL FIX: AuthRepository

**Bug crítico detectado:**
- `AuthRepository` usaba `FirebaseFirestore.getInstance()` en lugar de `FirestoreProvider.instance`
- `getInstance()` SIEMPRE se conecta a database `(default)`, ignorando `FirestoreConfig`
- Todas las operaciones de auth se ejecutaban en la database incorrecta

**Síntomas:**
- `findMemberByEmail()` retornaba null (buscaba en `(default)` en lugar de `test`)
- Auto-vinculación user ↔ member NO funcionaba
- `onboardingCompleted` se leía/escribía en database incorrecta
- Usuarios creados en database incorrecta

**Solución:**
- Migrado `AuthRepository` a usar `FirestoreProvider.instance`
- Ahora todas las operaciones de auth usan la database correcta según build variant

**Impacto:**
- ✅ Auto-vinculación funciona correctamente
- ✅ Members se encuentran en la database correcta
- ✅ Onboarding se lee/escribe en la database correcta
- ✅ Todos los repositorios ahora usan FirestoreProvider

### v1.2.1 (2026-02-27) - Integración BuildConfig

**Mejora:**
- Integrado `FirestoreConfig` con `BuildConfig`
- Selección automática de database según build variant
- Eliminada configuración manual hardcoded

### v1.2.0 (2026-02-25) - Release Inicial

**Primera implementación:**
- Sistema de configuración multi-database
- `FirestoreConfig` y `FirestoreProvider`
- Migración de 9 repositorios (faltó `AuthRepository` - corregido en v1.2.4)
- Databases configuradas: `test`, `stage`, `prod`, `(default)`

---

## Versión Actual

**Release:** v1.2.4
**Fecha:** 2026-02-27
**Estado:** ✅ Producción
