# Gestion de Membresias — Resumen

> La gestion de membresias se divide en dos modulos independientes.
> Este documento es un indice. Consulta cada modulo para los detalles.

---

## Modulo 1: Catalogo de Planes

**Documento**: `06-membership-plans.md`

El catalogo de planes es configurable por el admin. Define los tipos de membresia disponibles (mensual, semanal, paquete de visitas, familiar, etc.), sus precios y duracion.

Los planes son **mutables**: el admin puede cambiar precios, renombrar o desactivar planes en cualquier momento.

---

## Modulo 2: Asignaciones de Membresia

**Documento**: `07-membership-assignments.md`

Cuando el admin asigna un plan a un miembro, se toma un **snapshot inmutable** del plan. Los cambios futuros al plan no afectan asignaciones existentes.

El snapshot incluye: nombre, tipo, precio, duracion y visitas al momento de la asignacion.

---

## Relacion entre modulos

```
membership_plans (catalogo)     members (inscripciones)
┌─────────────────────┐        ┌──────────────────────────────┐
│ Mensual: $350/30d   │──────> │ Juan: Mensual $350           │
│ Semanal: $120/7d    │        │   snapshot tomado el 15/Feb  │
│ 10 visitas: $250    │        │   status: active             │
└─────────────────────┘        └──────────────────────────────┘
         │
     (admin sube a $400)
         │
         v
┌─────────────────────┐        ┌──────────────────────────────┐
│ Mensual: $400/30d   │        │ Juan: sigue con $350         │
│ (precio actualizado) │        │   (snapshot NO cambia)       │
└─────────────────────┘        └──────────────────────────────┘
```

---

## Conceptos clave

| Concepto | Descripcion | Mutable? |
|---|---|---|
| Plan de membresia | Tipo de plan en el catalogo | Si (admin lo edita) |
| Asignacion | Plan asignado a un miembro especifico | No (snapshot inmutable) |
| Snapshot | Copia del plan al momento de asignar | No |
| Estado | `active`, `expired`, `suspended`, `cancelled`, `pending` | Si (transiciones definidas) |

---

## Referencias

- Catalogo de planes: `06-membership-plans.md`
- Asignaciones y check-in: `07-membership-assignments.md`
- Registro de miembros: `04-member-registration.md`
- Schema de Firestore: `schema.md`
