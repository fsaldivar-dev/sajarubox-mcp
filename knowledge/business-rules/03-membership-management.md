# Gestion de membresias

> Reglas para la administracion de planes de membresia y su asignacion a miembros.

---

## Conceptos clave

- **Plan de membresia**: Tipo de plan configurable por el admin (ej: Mensual, Semanal, Familiar)
- **Membresia de un miembro**: La asignacion de un plan a un miembro especifico con fechas de inicio y fin
- **Miembro**: Persona inscrita en el gimnasio. No necesariamente tiene cuenta en la app.

---

## Planes de membresia

### Campos de un plan

| Campo | Tipo | Ejemplo | Requerido |
|-------|------|---------|-----------|
| Nombre | Texto | "Mensualidad" | Si |
| Precio | Numero decimal | 350.00 | Si |
| Moneda | Texto (ISO) | "MXN" | Si (default: MXN) |
| Duracion en dias | Entero | 30 | Si |
| Descripcion | Texto | "Acceso ilimitado por 1 mes" | No |
| Activo | Booleano | true | Si (default: true) |
| Orden | Entero | 1 | Si (default: 0) |

### Operaciones permitidas (solo admin)

1. **Crear plan**: Definir nombre, precio, duracion y descripcion
2. **Editar plan**: Cambiar cualquier campo
3. **Desactivar plan**: Soft delete. El plan deja de aparecer para asignacion pero los miembros que ya lo tienen no se afectan
4. **Ver todos los planes**: Incluye activos e inactivos

> Los planes nunca se eliminan fisicamente de la base de datos. Solo se desactivan.

---

## Estados de membresia de un miembro

| Estado | Descripcion |
|--------|-------------|
| `active` | Membresia vigente. El miembro tiene acceso al gimnasio. |
| `expired` | Membresia vencida. Paso la fecha de fin. |
| `suspended` | Membresia suspendida temporalmente por el admin. |
| `cancelled` | Membresia cancelada definitivamente. |
| `pending` | Membresia registrada pero no activada (ej: falta pago). |

---

## Asignacion de membresia a un miembro

1. El admin selecciona un miembro existente
2. Elige un plan de membresia activo
3. Define la fecha de inicio (por defecto: hoy)
4. La fecha de fin se calcula automaticamente: fecha de inicio + duracion del plan
5. El estado se establece como `active`

---

## Vencimiento

- Cuando la fecha actual supera la fecha de fin, la membresia se considera `expired`
- El sistema calcula los dias restantes para mostrar al admin
- No hay renovacion automatica por el momento

---

## Reglas de negocio

1. Un miembro puede tener solo un plan activo a la vez
2. Al asignar un nuevo plan, el anterior se marca como `expired` o `cancelled`
3. Los planes desactivados no pueden asignarse a nuevos miembros
4. El precio se guarda al momento de la asignacion (snapshot), por si el plan cambia de precio despues
5. La moneda por defecto es MXN (peso mexicano)
