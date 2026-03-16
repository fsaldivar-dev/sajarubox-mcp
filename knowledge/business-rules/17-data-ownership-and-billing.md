# Ownership de Datos y Control de Costos

> Regla de gobierno de datos y consumo para evitar sobrecostos operativos.

---

## Principios

1. Firestore es la fuente de verdad de todos los datos operativos.
2. Toda escritura crítica debe ser auditable y trazable.
3. Ninguna plataforma cliente decide por sí sola la estrategia de persistencia.
4. El negocio controla el costo mensual con límites observables (billing alerts en Firebase).

---

## Ownership por dominio

| Dominio | Fuente de verdad | Observaciones |
|--------|-------------------|---------------|
| `users` | Firestore | `firebaseUid` es el document ID |
| `members` | Firestore | Incluye snapshot de membresía |
| `membership_plans` | Firestore | Catálogo mutable por admin |
| `membership_assignments` | Firestore (en `members`) | Snapshot inmutable embebido |
| `payments` / `expenses` | Firestore | Datos contables, soft delete |
| `classes` / `classAttendance` / `check_ins` | Firestore | Registros operativos |
| `products` | Firestore | Inventario y catálogo |
| `exercises` / `routine_templates` / `daily_routines` | Firestore | Módulo de rutinas |
| credenciales | Firebase Auth | Nunca replicar passwords |
| archivos binarios | Firebase Storage | Imágenes, documentos |

---

## Reglas de inmutabilidad financiera

1. `payments` y `expenses` no se eliminan físicamente.
2. Correcciones se hacen por soft delete (`isActive = false`) o documento compensatorio.
3. Cada evento financiero debe guardar `registeredBy`, `createdAt`, `updatedAt`.

---

## Control de costos Firebase

### Umbrales (billing alerts configurados en GCP)

- Alerta al 60%, 80% y 95% del presupuesto mensual en MXN.
- A 95% se activa el kill switch via Cloud Function.

### Medidas obligatorias

1. Paginación en listados grandes (no descargar colecciones completas innecesariamente).
2. Búsqueda local sobre datos ya descargados (Firestore no soporta full-text).
3. Índices compuestos definidos antes de queries complejas.
4. Listeners en tiempo real solo cuando sea estrictamente necesario.

---

## Retención y auditoría

Campos mínimos para entidades operativas:

- `createdAt`, `updatedAt`
- `registeredBy` o `createdBy` (UID del actor)
- `isActive` (soft delete)

Eventos críticos que deben ser trazables:

- Cambio de rol de usuario
- Asignación/renovación/cancelación de membresía
- Registro de cobro
- Check-in manual

---

## Migración futura (opcional)

Si en algún momento se migra a backend propio con MySQL, la política de ownership
se revisará en ese momento. Ver `knowledge/backend-implementation/` para referencia.
