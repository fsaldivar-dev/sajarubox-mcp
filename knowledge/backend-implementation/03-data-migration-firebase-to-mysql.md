# Migracion de Datos: Firebase -> MySQL

> Estrategia gradual para mover datos operativos a MySQL sin romper operacion.

---

## Objetivo

Migrar entidades operativas desde Firestore a MySQL, manteniendo Firebase Auth para credenciales.

---

## Fases

### Fase 0: Inventario y normalizacion

- Listar colecciones y volumen por entorno
- Detectar campos inconsistentes/legacy
- Definir mapeo Firestore -> tablas SQL
- Acordar reglas de transformacion (tipos, fechas, enums)

### Fase 1: Esquema y carga inicial

- Crear migraciones SQL versionadas
- Ejecutar ETL inicial (export -> transform -> import)
- Validar conteos y checksum por entidad

### Fase 2: Validacion funcional paralela

- Backend lee MySQL para dominios migrados
- Ejecutar shadow reads (comparacion Firestore vs MySQL)
- Corregir diferencias y repetir

### Fase 3: Delta sync y cutover

- Congelar escrituras directas cliente->Firestore para dominios migrados
- Ejecutar delta final por `updatedAt` (high-water mark)
- Cambiar apps a API REST para escrituras y lecturas oficiales

### Fase 4: Post-cutover

- Monitoreo intensivo 14 dias
- Plan de rollback activo solo durante ventana definida
- Retiro gradual de dependencias Firestore operativas

---

## Delta sync (obligatorio)

1. Guardar `lastSyncedAt` por entidad.
2. Extraer documentos Firestore con `updatedAt > lastSyncedAt`.
3. Transformar y upsert en MySQL.
4. Reconciliar conflictos por version/timestamp.
5. Actualizar `lastSyncedAt` solo si lote completo fue exitoso.

Regla: el proceso debe ser idempotente y re-ejecutable.

---

## Mapeo inicial sugerido

| Firestore | MySQL |
|-----------|-------|
| `users` | `users` |
| `members` | `members` |
| `membership_plans` | `membership_plans` |
| `payments` | `payments` |
| `check_ins` | `check_ins` |
| `classes` | `classes` |
| `classAttendance` | `class_attendance` |
| `products` | `products` |
| `expenses` | `expenses` |

---

## Criterios de cutover (Go/No-Go)

`Go` solo si:

1. Conteo por entidad coincide >= 99.9%.
2. Integridad referencial sin errores bloqueantes.
3. Flujos criticos pasan en QA: login, asignacion, check-in, cobro, renovacion.
4. SLO base de API cumplido por 72 horas en staging.
5. Runbook de rollback aprobado.

---

## Rollback

Disparadores:

- Error critico de datos o autorizacion
- Error rate sostenido fuera de SLO
- Inconsistencia financiera detectada

Acciones:

1. Congelar escrituras en API del modulo afectado.
2. Restaurar lectura/escritura temporal desde capa legacy definida.
3. Ejecutar reconciliacion de datos.
4. Re-intentar cutover en nueva ventana.

---

## Riesgos y mitigaciones

| Riesgo | Mitigacion |
|-------|------------|
| Datos historicos inconsistentes | Scripts de normalizacion previos |
| Downtime en corte | Ventana corta + checklist operativa |
| Mapeo incorrecto de fechas | UTC + validaciones automáticas |
| Diferencias de tipo NoSQL->SQL | Capa de transformacion tipada |

---

## Regla de seguridad

- No migrar passwords.
- Firebase Auth sigue activo para identidad.
- Backend valida token Firebase y usa MySQL para autorizacion/negocio.
