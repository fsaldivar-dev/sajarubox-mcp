# Modulo de Check-in — Implementacion iOS

> Guia tecnica para la implementacion del modulo de check-in en la app iOS de SajaruBox.
> Referencia de reglas de negocio: `business-rules/07-membership-assignments.md` (seccion "Flujo: Check-in").
> **El check-in registra asistencia y descuenta visitas para planes visit_based y mixed.**

---

## Arquitectura

El modulo de check-in sigue el patron MVVM del proyecto y se integra directamente en el modulo de miembros (no tiene tab propio).

### Capas involucradas

| Capa | Archivo | Descripcion |
|------|---------|-------------|
| Modelo de dominio | `CheckInCore/CheckIn.swift` | Struct `CheckIn`, protocolo `CheckInRepository`, enum `CheckInError` |
| Repositorio Firestore | `FirebaseVendor/Services/CheckIn/FirestoreCheckInRepository.swift` | Implementacion `actor` con encode/decode manual |
| Dependencia | `PlatformAppiOS/Dependencies/CheckInDependencies/CheckInDependencies.swift` | Registro de `CheckInRepository` como `DependencyKey` |
| Modelo local | `App/Data/Local/CheckInLocal.swift` | Modelo `@Model` SwiftData para persistencia offline |
| ViewModel | `App/Presentation/CheckInModule/CheckInViewModel.swift` | Logica de negocio del check-in |
| ViewData | `App/Presentation/CheckInModule/CheckInViewData.swift` | Estado de la UI |
| Vista resultado | `App/Presentation/CheckInModule/CheckInResultView.swift` | Sheet de resultado (exito/error) |
| Vista principal | `App/Presentation/HomeModule/Pages/MembersView.swift` | Integracion via swipe action y menu contextual |

### Diagrama de dependencias

```mermaid
graph TD
    MembersView --> CheckInViewModel
    MembersView --> MemberViewModel
    CheckInViewModel --> CheckInRepository
    CheckInViewModel --> MemberRepository
    CheckInViewModel --> CurrentUserManager
    CheckInRepository --> FirestoreCheckInRepository
    CheckInResultView --> CheckInViewData
```

> `CheckInViewModel` depende de `MemberRepository` para descontar visitas en planes visit_based y mixed.

---

## Flujo de Check-in

### Diagrama de secuencia

```mermaid
sequenceDiagram
    participant Admin
    participant MembersView
    participant CheckInVM as CheckInViewModel
    participant CheckInRepo as FirestoreCheckInRepository
    participant MemberRepo as FirestoreMemberRepository

    Admin->>MembersView: Desliza "Check-in" o boton verde
    MembersView->>CheckInVM: performCheckIn(member)
    CheckInVM->>CheckInVM: Validar member.isActive
    CheckInVM->>CheckInVM: Validar member.membershipStatus == active
    CheckInVM->>CheckInVM: Validar remainingVisits > 0 (si aplica)

    alt Validacion falla
        CheckInVM->>MembersView: Mostrar error con mensaje especifico
    else Validaciones OK
        CheckInVM->>CheckInRepo: createCheckIn(registro)
        alt Plan con visitas (visit_based o mixed)
            CheckInVM->>CheckInVM: remainingVisits -= 1
            CheckInVM->>MemberRepo: updateMember(con nuevo remainingVisits)
            alt remainingVisits llega a 0
                CheckInVM->>MemberRepo: membershipStatus = expired
            end
        end
        CheckInVM->>CheckInRepo: getTodayCheckIns()
        CheckInVM->>MembersView: Mostrar resultado con visitas restantes
    end
```

### Paso a paso

1. Valida que el miembro este activo (`isActive == true`)
2. Valida que `membershipStatus == active`
3. Si el plan tiene `remainingVisits`, valida que sea > 0
4. Crea un documento nuevo en `check_ins` (registro de asistencia)
5. **Si el plan tiene `remainingVisits`**: descuenta 1 visita via `memberRepository.updateMember()`
6. **Si `remainingVisits` llega a 0**: marca `membershipStatus = .expired`
7. Muestra mensaje de bienvenida con visitas restantes (si aplica)

### Lo que el check-in hace

- Registra asistencia (documento en `check_ins`)
- Descuenta `remainingVisits` para planes `visit_based` y `mixed`
- Marca membresia como `expired` si las visitas llegan a 0
- Muestra conteo de check-ins del dia y visitas restantes

### Lo que el check-in NO hace

- **NO modifica `membershipEndDate`** — la expiracion por fecha se maneja en `MemberViewModel.loadMembers()`
- **NO cobra pagos** — eso se maneja en `MemberFormView` al asignar plan

### Validacion por estado de membresia

| Estado | Permitir check-in | Mensaje |
|--------|-------------------|---------|
| `active` | Si (continuar validacion de visitas) | — |
| `pending` | No | "Membresia pendiente. Asigna un plan primero." |
| `suspended` | No | "Membresia suspendida." |
| `cancelled` | No | "Membresia cancelada. Asigna un nuevo plan." |
| `expired` | No (verificar pase de dia pendiente) | "Membresia expirada. Renueva para continuar." |

### Validacion de visitas restantes

| Situacion | Resultado |
|-----------|-----------|
| `remainingVisits == nil` | Plan time_based, no se descuenta nada |
| `remainingVisits > 1` | Se descuenta 1, check-in exitoso |
| `remainingVisits == 1` | Se descuenta a 0, membresia pasa a `expired` |
| `remainingVisits == 0` | Error: "Sin visitas restantes. Renueva la membresia." |

### Validacion de pase de dia (pendiente de implementar)

Si `membershipStatus == expired`, buscar en `payments` si existe un pago tipo `day_pass` con `status == completed` del dia actual para ese `memberId`. Si existe, permitir el check-in.

> **Estado actual**: esta validacion aun no esta implementada. Requiere inyectar `PaymentRepository` en `CheckInViewModel`.

### Mensajes de check-in

| Situacion | Mensaje |
|-----------|---------|
| Entrada exitosa (sin visitas) | "Bienvenido, [nombre]. Asistencia registrada." |
| Entrada exitosa (con visitas) | "Bienvenido, [nombre]. Asistencia registrada.\nX visita(s) restante(s)." |
| Ultima visita (agotada) | "Bienvenido, [nombre]. Asistencia registrada.\nVisitas agotadas. La membresia ha expirado." |
| Segunda visita del dia | "Bienvenido de nuevo, [nombre]. Visita #N del dia." |
| Sin visitas restantes | "Sin visitas restantes. Renueva la membresia." |
| Membresia expirada | "Membresia expirada. Renueva para continuar." |
| Membresia pendiente | "Membresia pendiente. Asigna un plan primero." |
| Membresia suspendida | "Membresia suspendida." |
| Membresia cancelada | "Membresia cancelada. Asigna un nuevo plan." |
| Miembro inactivo | "Este miembro fue dado de baja." |

---

## CheckInResultView

Sheet que muestra el resultado del check-in con:

- Icono (verde checkmark o rojo warning)
- Nombre del miembro
- Mensaje de resultado
- Info de membresia (solo en exito):
  - Nombre del plan
  - Dias restantes (si time_based o mixed)
  - **Visitas restantes** (si visit_based o mixed)
  - Hora de entrada

---

## Decisiones tecnicas

### 1. `memberId` requerido, `userId` opcional

El campo `memberId` es **siempre requerido** porque el check-in lo hace el admin buscando al miembro por nombre/telefono. Muchos miembros del gimnasio no tienen cuenta en la app, por lo que `userId` es opcional y solo se llena si el miembro tiene un `linkedUserId`.

### 2. Encode/decode manual en Firestore

Se sigue el mismo patron que `FirestoreMemberRepository` para evitar problemas con `Codable` y Firestore:
- Funcion `encode(_:)` que excluye el campo `id` (se usa como document ID)
- Funcion `decode(document:)` con defaults seguros para campos faltantes
- Fechas como `Timestamp` de Firestore
- Ordenamiento en memoria (sin `.order(by:)` de Firestore) para evitar indices compuestos

### 3. Descuento de visitas en el check-in

El check-in **descuenta visitas** para planes `visit_based` y `mixed`:
- Si el miembro tiene `remainingVisits != nil`, se descuenta 1 al hacer check-in
- Si `remainingVisits` llega a 0, el `membershipStatus` pasa a `.expired`
- El miembro actualizado (con nuevo `remainingVisits` y posible nuevo `status`) se persiste via `memberRepository.updateMember()`
- El `CheckInResult` recibe el miembro actualizado para que la UI muestre el estado correcto

**No se descuenta nada** si `remainingVisits == nil` (plan `time_based` puro).

### 4. Integracion en MembersView (no tab separado)

El check-in se integra directamente en la lista de miembros via:
- **Swipe action** (borde leading): acceso rapido para el admin en recepcion
- **Boton visible**: boton verde circular con icono de check-in en cada fila de miembro activo
- **Menu contextual**: alternativa al swipe
- **Sheet de resultado**: muestra mensaje de bienvenida o error

Razon: el flujo natural del admin es "buscar miembro -> hacer check-in", que coincide con la pantalla de miembros.

### 5. ViewModel separado (CheckInViewModel)

Se usa un ViewModel independiente (`CheckInViewModel`) en lugar de agregar la logica al `MemberViewModel` por:
- **Separacion de responsabilidades**: mantener la logica de check-in aislada
- **Reutilizacion**: podria usarse desde otras pantallas en el futuro (QR scan, etc.)
- **Testing**: mas facil de testear aisladamente

---

## Coleccion Firestore

Coleccion: `check_ins`

Ver `schema.md` para la estructura completa de campos.

Indices recomendados:
- `memberId` + `checkInDate` (consultas de historial por miembro)
- `checkInDate` (consultas de check-ins del dia)

---

## Permisos por rol

| Accion | admin | receptionist | trainer | member |
|--------|:-----:|:------------:|:-------:|:------:|
| Hacer check-in | Si | Si | No | No |
| Ver check-ins del dia | Si | Si | No | No |
| Ver historial | Si | Si | No | Solo propio |

---

## Pendiente de implementar

1. **Validacion de pase de dia**: buscar en `payments` si hay un `day_pass` del dia actual para miembros con membresia expirada
2. **Check-out**: registrar hora de salida en `checkOutDate` (actualmente solo se registra entrada)
3. **Historial de check-ins del miembro**: vista detallada con filtros por fecha

---

## Checklist de mantenimiento

- [ ] Si se agregan campos a `CheckIn`, actualizar `encode()` y `decode()` en `FirestoreCheckInRepository`
- [ ] Si se agregan campos a `CheckIn`, actualizar `CheckInLocal` y sus funciones `toDomain()`/`fromDomain()`
- [ ] Si se agregan estados de membresia, actualizar el switch de validacion en `CheckInViewModel`
- [ ] Mantener sincronizado con `schema.md` y `07-membership-assignments.md` del MCP
- [ ] Al implementar validacion de pase de dia, inyectar `PaymentRepository` en `CheckInViewModel`
