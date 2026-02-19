# Módulo de Clases — Android

> Agenda del gym. El miembro ve las clases del dia y puede reservar/cancelar.
> El admin puede crear, editar y eliminar clases desde iOS.
> Coleccion Firestore: `classes`

---

## Schema del documento `classes/{classId}`

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `gymId` | String | `"sajarubox"` (hardcoded) |
| `nombre` | String | Nombre de la clase (ej: "CrossFit", "Box") |
| `fecha` | Timestamp | Fecha y hora del inicio (solo la fecha, hora en `horaInicio`) |
| `horaInicio` | String | Formato `"HH:mm"` (ej: `"07:00"`) |
| `duracionMin` | Int | Duracion en minutos (default: 60) |
| `capacidadMax` | Int | Cupos maximos (default: 14) |
| `createdAt` | Timestamp | Fecha de creacion |
| `updatedAt` | Timestamp | Fecha de actualizacion |

> ⚠️ Android tenia un campo `environment = "stage"` que excluia las clases creadas por iOS.
> **Fue removido.** No usar `environment` como filtro en queries de `classes`.

---

## Archivos

```
ui/classes/
├── ClassesScreen.kt      — UI principal con DateSelector y lista de clases
├── ClassesViewModel.kt   — Estado: fecha seleccionada, clases, bookings del miembro
├── ClassesViewModelFactory.kt
├── ClassFormScreen.kt    — Formulario crear/editar clase (solo admin)
├── ClassFormViewModel.kt
└── ClassFormViewModelFactory.kt

data/model/
└── Class.kt              — Data class del modelo

data/repository/
└── ClassRepository.kt    — CRUD + query por fecha
```

---

## ClassesViewModel — estados

```kotlin
val selectedDate: StateFlow<Timestamp>              // Fecha activa en el selector
val classes: StateFlow<List<ClassWithBookings>>     // Clases del dia con conteo de inscritos
val isLoading: StateFlow<Boolean>
val memberBookings: StateFlow<Map<String, Boolean>> // classId → true si el miembro ya reservo
```

```kotlin
data class ClassWithBookings(
    val clazz: Class,
    val bookingsCount: Int
)
```

---

## Query de clases por fecha

```kotlin
// ClassRepository.getClassesByDate()
// Filtra por inicio y fin del dia (00:00:00 a 23:59:59)
db.collection("classes")
    .whereEqualTo("gymId", gymId)
    .whereGreaterThanOrEqualTo("fecha", startOfDay)
    .whereLessThan("fecha", endOfDay)
    .get()
```

> ⚠️ Este query requiere un indice compuesto en Firestore:
> `gymId ASC` + `fecha ASC`
> Si falla con `FAILED_PRECONDITION`, usar el link del error en Logcat para crearlo.

---

## DateSelector — navegacion entre dias

```kotlin
Row {
    IconButton { /* cal.add(DAY_OF_MONTH, -1) → onDateSelected */ }   // ← anterior
    Text(fecha, modifier = Modifier.clickable { showDatePicker = true }) // tappable
    IconButton { /* cal.add(DAY_OF_MONTH, +1) → onDateSelected */ }   // siguiente →
}

// Al tocar la fecha: DatePickerDialog de Material3
DatePickerDialog(
    confirmButton = { onDateSelected(Timestamp(Date(millis))) }
)
```

---

## Vista del miembro vs admin

| Elemento | Admin | Miembro |
|----------|-------|---------|
| FAB "+" agregar clase | ✅ | ❌ |
| Click en clase → inscritos | ✅ | ❌ |
| Botón "Reservar" | ❌ | ✅ (si hay cupo) |
| Botón "Cancelar Reserva" | ❌ | ✅ (si ya reservo) |
| Icono perfil en TopAppBar | ❌ | ✅ |
| DateSelector | ✅ | ✅ |

El rol se detecta con `AuthRepository.isAdmin()` al cargar la pantalla.

---

## Flujo de reserva (miembro)

```
bookClass(classId)
    ↓
authRepository.getCurrentUserMemberId() → uid del usuario
    ↓
ClassBooking(classId, userId = uid, gymId = "sajarubox")
    ↓
bookingRepository.createBooking(booking)
    ↓
loadMemberBookings() + loadClassesForDate() ← refresca UI
```

> ⚠️ `getCurrentUserMemberId()` retorna el `uid` de Firebase Auth, NO el `memberId`
> de la coleccion `members`. Revisar si esto es correcto al implementar validacion
> de membrecia activa antes de permitir reservar.

---

## Errores comunes

### 1. "No hay clases" aunque existen en Firestore

**Causa mas comun:** Filtro `environment = "stage"` en el query excluye clases creadas por iOS
(que no tienen ese campo).

**Solucion:** No agregar filtros de `environment` en queries de lectura de clases.

### 2. Query sin indice compuesto

**Error:** `FAILED_PRECONDITION: The query requires a composite index.`

**Campos requeridos:** `gymId ASC`, `fecha ASC`

**Solucion:** Crear el indice desde el link en Logcat o en Firestore Console.

### 3. Clases del dia incorrecto (timezone)

**Causa:** `Calendar.getInstance()` usa la zona horaria del dispositivo. Si el servidor
guarda en UTC y el dispositivo esta en America/Mexico_City, el inicio del dia puede
desplazarse.

**Solucion actual:** `Calendar.getInstance()` (hora local) — funciona si el dispositivo
esta en la misma zona que el gym. Para produccion, considerar `TimeZone.getTimeZone("America/Mexico_City")`.
