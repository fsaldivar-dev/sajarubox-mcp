# Migracion de Datos: Firebase -> MySQL

> Estrategia gradual para mover datos operativos a MySQL sin romper la operación.

---

## Objetivo

Migrar entidades operativas desde Firestore a MySQL, conservando Firebase Auth como proveedor de credenciales.

---

## Alcance por fases

### Fase 0: Inventario

- Listar colecciones y volumen
- Detectar campos opcionales/inconsistentes
- Definir mapeo Firestore -> tablas MySQL

### Fase 1: Esquema y carga inicial

- Crear esquema SQL y migraciones
- Ejecutar export + transform + import inicial
- Validar conteos por entidad

### Fase 2: Validacion funcional

- Backend lee MySQL para dominios migrados
- Comparar reportes clave entre fuentes
- Corregir diferencias

### Fase 3: Cutover

- Ventana de corte controlada
- Sincronizacion final delta
- Activar MySQL como unica fuente operativa

### Fase 4: Post-cutover

- Monitoreo intensivo 7-14 dias
- Plan de rollback temporal documentado
- Retiro gradual de dependencias Firestore

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

## Validaciones obligatorias

1. Conteo total por entidad coincide (origen vs destino).
2. Integridad referencial de llaves foraneas.
3. Muestras aleatorias comparadas campo a campo.
4. Casos criticos funcionales pasan (login, check-in, cobro, asignacion de plan).

---

## Riesgos y mitigaciones

| Riesgo | Mitigacion |
|-------|------------|
| Datos inconsistentes historicos | Scripts de normalizacion previa |
| Downtime en corte | Ventana corta + checklist operativa |
| Errores de mapeo de fechas | Estandarizar UTC e ISO-8601 |
| Diferencias de tipo (NoSQL -> SQL) | Capa de transformacion tipada |

---

## Regla de seguridad

- No migrar passwords.
- Firebase Auth permanece activo para identidad.
- El backend valida token Firebase y usa MySQL para autorizacion/negocio.
