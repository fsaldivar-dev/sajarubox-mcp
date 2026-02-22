# Reglas de negocio: Reportes y metricas

> Reglas agnosticas de plataforma. Aplican a Android, iOS y cualquier cliente futuro.

---

## Conceptos

Un **reporte** es una vista calculada que agrega datos de pagos, check-ins, miembros, productos y membresias para dar visibilidad operativa y financiera al administrador del gimnasio.

Los reportes NO generan ni almacenan documentos en Firestore. Todo se calcula en tiempo real a partir de las colecciones existentes.

---

## Fuentes de datos

| Coleccion | Datos que aporta |
|-----------|-----------------|
| `payments` | Ingresos, metodos de pago, tipo de venta, montos |
| `members` | Estado de membresia, vencimientos, datos de miembro |
| `check_ins` | Visitas, frecuencia, hora pico |
| `products` | Costo de productos, stock, categoria |
| `membership_plans` | Catalogo de planes (referencia, no calculo directo) |

---

## Periodos de consulta

| Periodo | Rango |
|---------|-------|
| Hoy | Inicio del dia actual hasta ahora |
| Semana | Inicio de la semana (lunes) hasta ahora |
| Mes | Inicio del mes actual hasta ahora |

Los **totales globales** (ingresos y egresos totales) son independientes del periodo seleccionado y siempre muestran el acumulado historico.

---

## Metricas financieras

### Ingresos

- **Ingreso global**: Suma de todos los `payments` con `status = completed`, sin filtro de fecha.
- **Ingreso del periodo**: Suma de `payments` completados dentro del rango seleccionado.
- **Fecha de referencia**: Se usa `completedAt` si existe, de lo contrario `createdAt`.

### Egresos (costo)

- **Egreso global**: Suma del costo de todos los productos vendidos historicamente.
- **Egreso del periodo**: Suma del costo de productos vendidos dentro del rango.
- **Calculo de costo**: Para cada `payment` con `type = product`, se busca el producto en el catalogo y se usa su `costPrice`. Si no se puede asociar, se estima como 60% del monto de venta.

> **Nota**: En esta version, los egresos solo contemplan el costo de productos vendidos (COGS). No se registran gastos operativos (renta, servicios, nomina). Un modulo futuro de "Gastos" podria ampliar esto.

### Utilidad

```
utilidad = ingresos - egresos
margen (%) = (utilidad / ingresos) * 100
```

### Ticket promedio

```
ticket_promedio = ingreso_del_periodo / numero_de_transacciones
```

---

## Ingresos por categoria

Los pagos se categorizan por `PaymentType`:

| Tipo | Descripcion |
|------|-------------|
| `membership` | Pago de membresia (nueva o renovacion) |
| `day_pass` | Pase de un dia |
| `product` | Venta de producto fisico |
| `service` | Venta de servicio |
| `guest_invite` | Invitacion de invitado |

Cada categoria muestra: monto total y cantidad de operaciones.

---

## Metodos de pago

Los pagos se agrupan por `PaymentMethod`:

| Metodo | Descripcion |
|--------|-------------|
| `cash` | Efectivo |
| `card` | Tarjeta (debito/credito) |
| `transfer` | Transferencia bancaria |
| `stripe` | Pago online (Stripe) |
| `apple_pay` | Apple Pay |
| `google_pay` | Google Pay |

Cada metodo muestra: monto total y cantidad de operaciones.

---

## Productos/servicios mas vendidos

- Se filtran pagos con `type = product` o `type = service`.
- Se agrupan por `description` del payment (nombre del producto/servicio).
- Se ordenan por cantidad de ventas (descendente).
- Se muestran los top 10.

---

## Visitas (check-ins)

### Metricas del periodo

- **Total de check-ins**: Conteo de registros en el rango.
- **Promedio diario**: Total de check-ins / dias del periodo.

### Miembros mas frecuentes

- Se agrupan check-ins por `memberId`.
- Se cruza con el catalogo de miembros para obtener el nombre.
- Se ordenan por cantidad de check-ins (descendente).
- Se muestran los top 10.

---

## Estado de membresias

Resumen de todos los miembros activos (`isActive = true`):

| Estado | Descripcion |
|--------|-------------|
| `active` | Membresia vigente |
| `expired` | Venció por tiempo o visitas agotadas |
| `pending` | Registrado pero sin membresia activa |
| `suspended` | Suspendida por admin |
| `cancelled` | Cancelada definitivamente |

### Alertas de vencimiento

- **Por vencer**: Membresias con `membershipEndDate` dentro de los proximos 7 dias y actualmente `active`.

---

## Alertas de inventario

- **Stock bajo**: Productos con `isActive = true`, `category != service` y `stock <= 5`.
- Se ordenan por stock ascendente (los mas criticos primero).

---

## Reglas de acceso

| Rol | Acceso a reportes |
|-----|-------------------|
| `admin` | Todos los reportes |
| `receptionist` | Todos los reportes |
| `trainer` | Sin acceso |
| `member` | Sin acceso |
| `guest` | Sin acceso |
| `visitor` | Sin acceso |

---

## Reglas

1. Los reportes son de **solo lectura**. No crean, modifican ni eliminan documentos.
2. Los **totales globales** siempre son visibles, independientemente del periodo.
3. Solo se consideran pagos con `status = completed` para calculos financieros.
4. El costo de productos se calcula usando `costPrice` del catalogo actual. Si el producto no se encuentra, se estima como 60% del monto.
5. Los check-ins se filtran por el rango del periodo seleccionado.
6. Las membresias se evaluan sobre el estado actual (no historico).
7. Las alertas de vencimiento usan una ventana de 7 dias.
8. Las alertas de stock bajo usan un umbral de 5 unidades.
9. Los montos siempre se muestran usando el componente `TextAmount` del design system con `currencyCode: "MXN"`.
10. El periodo predeterminado al abrir reportes es "Hoy".
