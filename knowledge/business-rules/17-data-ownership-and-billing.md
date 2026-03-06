# Ownership de Datos y Control de Costos

> Regla de gobierno de datos y consumo para evitar sobrecostos operativos.

---

## Principios

1. El negocio controla su costo mensual con limites observables.
2. La fuente de verdad de datos operativos es MySQL.
3. Toda escritura critica debe ser auditable.
4. Ninguna plataforma cliente define por si sola la estrategia de persistencia.

---

## Ownership por dominio

| Dominio | Fuente de verdad | Observaciones |
|--------|-------------------|---------------|
| users (perfil/rol interno) | MySQL | UID de Firebase se almacena como referencia externa |
| members | MySQL | Incluye estado de membresia y metadatos operativos |
| membership_plans | MySQL | Catalogo mutable administrado por backend |
| membership_assignments | MySQL | Historial y snapshots de asignacion |
| payments/sales/expenses | MySQL | Datos contables y de reportes |
| classes/attendance/checkins | MySQL | Registros operativos del gimnasio |
| credenciales | Firebase Auth | No se replica password en MySQL |

---

## Politica de costo y consumo

### Umbrales sugeridos

- Presupuesto mensual objetivo definido por administracion.
- Alertas al 60%, 80% y 95% del consumo mensual.
- Si se supera 95%, activar plan de contencion (limitar procesos no criticos, reportes pesados por lotes).

### Medidas obligatorias

1. Rate limiting por IP/usuario para endpoints sensibles.
2. Paginacion obligatoria en listados.
3. Indices y consultas optimizadas en MySQL.
4. Jobs pesados fuera de request/response (colas o cron).
5. Bitacora de errores y performance por endpoint.

---

## Retencion y auditoria

- Soft delete en entidades operativas cuando aplique.
- Campos minimos de auditoria: `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.
- Eventos criticos deben registrar actor, accion y timestamp.

---

## Reglas de operacion

1. Un cambio de rol siempre deja registro de auditoria.
2. Un cobro nunca se elimina fisicamente; solo se revierte con evento compensatorio.
3. Las migraciones de esquema se versionan y prueban antes de produccion.
4. Se prohibe hardcodear credenciales de base de datos en cliente o repositorio.

---

## Indicadores minimos de salud

- Latencia p95 por endpoint
- Errores 4xx/5xx por minuto
- Conexiones activas a DB
- Costo mensual acumulado vs presupuesto
- Throughput diario de check-ins y pagos
