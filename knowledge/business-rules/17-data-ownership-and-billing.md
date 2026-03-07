# Ownership de Datos y Control de Costos

> Regla de gobierno de datos y consumo para evitar sobrecostos operativos.

---

## Principios

1. El negocio controla el costo mensual con limites observables.
2. MySQL es la fuente de verdad de datos operativos.
3. Toda escritura critica debe ser auditable y trazable.
4. Ninguna plataforma cliente decide por si sola la estrategia de persistencia.

---

## Ownership por dominio

| Dominio | Fuente de verdad | Replica transitoria | Observaciones |
|--------|-------------------|---------------------|---------------|
| users (perfil/rol interno) | MySQL | Opcional a Firestore | `firebaseUid` es referencia externa |
| members | MySQL | Opcional a Firestore | Incluye estado de membresia |
| membership_plans | MySQL | No requerida | Catalogo mutable por backend |
| membership_assignments | MySQL | No requerida | Historial + snapshots |
| payments/sales/expenses | MySQL | No requerida | Datos contables, inmutables por evento |
| classes/attendance/checkins | MySQL | Opcional a Firestore | Registros operativos |
| credenciales | Firebase Auth | No aplica | Nunca replicar passwords |

---

## Reglas de inmutabilidad financiera

1. `payments` y `expenses` no se eliminan fisicamente.
2. Correcciones se hacen por evento compensatorio (reversal/adjustment).
3. Cada evento financiero debe guardar `actorId`, `reason`, `timestamp`.

---

## Politica de costo y consumo

### Umbrales

- Alertas al 60%, 80% y 95% del presupuesto mensual.
- A 95% se activa contencion:
  - limitar endpoints no criticos,
  - mover reportes pesados a batch,
  - pausar jobs opcionales.

### Medidas obligatorias

1. Rate limit por IP y por usuario para endpoints sensibles.
2. Paginacion obligatoria en listados.
3. Indices y consultas optimizadas en MySQL.
4. Jobs pesados fuera de request/response.
5. Metricas de error y latencia por endpoint.

---

## Retencion y auditoria

Campos minimos para entidades operativas:

- `createdAt`, `updatedAt`
- `createdBy`, `updatedBy`
- `deletedAt` (si aplica soft delete)

Eventos criticos:

- Cambio de rol
- Cobro y reversa
- Asignacion/renovacion/cancelacion de membresia
- Check-in manual override

Cada evento debe registrar `requestId` para trazabilidad cross-system.

---

## Reglas de operacion

1. Todo cambio de rol deja auditoria obligatoria.
2. Todo cobro es irreversible por delete; solo compensable.
3. Migraciones SQL son versionadas y probadas antes de produccion.
4. Prohibido hardcodear credenciales en clientes o repositorio.
5. No exponer datos sensibles en logs (`Authorization`, llaves privadas).

---

## Indicadores minimos

- Latencia p95 por endpoint
- Error rate 4xx/5xx por minuto
- Conexiones activas a DB
- Costo mensual acumulado vs presupuesto
- Throughput diario de check-ins y pagos
