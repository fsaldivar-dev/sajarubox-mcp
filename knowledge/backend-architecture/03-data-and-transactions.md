# Backend: Datos, Transacciones e Idempotencia

> Definicion de arquitectura de persistencia y consistencia.

---

## Fuente de verdad

- MySQL es la fuente de verdad operativa.
- Firestore queda solo como legado transitorio (si aplica).

---

## Patron de persistencia

1. `services` definen casos de uso.
2. `repositories` ejecutan acceso a datos.
3. Operaciones criticas deben ser atomicas con transacciones SQL.

---

## Operaciones transaccionales obligatorias

1. Asignacion de membresia + payment + snapshot.
2. Renovacion de membresia + payment.
3. Check-in + decremento de visitas + expiracion.
4. Venta + decremento de stock.

---

## Idempotencia

Para `POST` criticos (`payments`, `checkins`, `membership-assignments`):

1. Header `Idempotency-Key` obligatorio.
2. Almacenar key + hash payload + respuesta.
3. Reintento con misma key retorna mismo resultado.

---

## Auditoria

Toda accion critica registra:

- `requestId`
- `actorUserId`
- `action`
- `entityType`
- `entityId`
- `timestamp`
