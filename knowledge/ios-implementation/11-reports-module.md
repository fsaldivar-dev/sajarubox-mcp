# Modulo de Reportes — Implementacion iOS

> Dashboard de metricas financieras, visitas, membresias e inventario.
> No requiere modelos propios de Firestore: todo se calcula en tiempo real.
> Para reglas de negocio, ver `business-rules/11-reports.md`.

---

## Estructura de archivos

```
sajaru-box-ios/
└── SajaruBox/App/Presentation/
    └── ReportsModule/
        ├── ReportsViewData.swift        # Estado: periodos, metricas, alertas
        ├── ReportsViewModel.swift       # Calculos desde 4 repositorios
        └── ReportsDashboardView.swift   # Dashboard scrollable con secciones
```

No hay modelos en PlatformCore ni implementaciones en Vendors.
El modulo consume repositorios existentes.

---

## Dependencias del ViewModel

```swift
@Dependency(\.paymentRepository) private var paymentRepository
@Dependency(\.memberRepository) private var memberRepository
@Dependency(\.checkInRepository) private var checkInRepository
@Dependency(\.productRepository) private var productRepository
```

### Metodos de repositorio utilizados

| Repositorio | Metodo | Uso |
|-------------|--------|-----|
| `PaymentRepository` | `getAllCompletedPayments()` | Todos los pagos completados (global + periodo) |
| `MemberRepository` | `getAllMembers()` | Estado de membresias, vencimientos |
| `CheckInRepository` | `getCheckIns(from:to:)` | Check-ins del periodo seleccionado |
| `ProductRepository` | `getAllProducts()` | Catalogo para costo, stock bajo |

> `getAllCompletedPayments()` fue agregado al protocolo `PaymentRepository` y a `FirestorePaymentRepository` como parte de este modulo. Filtra `status == completed` en Firestore.

---

## ViewData

### Modelos auxiliares

| Struct | Proposito |
|--------|-----------|
| `IncomeCategory` | Ingreso agrupado por PaymentType (nombre, icono, monto, conteo) |
| `PaymentMethodSummary` | Monto y conteo por PaymentMethod |
| `TopSeller` | Producto/servicio con mas ventas (nombre, conteo, revenue) |
| `MemberFrequency` | Miembro con mas check-ins (nombre, conteo) |
| `MembershipStatusSummary` | Conteo por estado (active, expired, pending, etc.) |

### ReportPeriod

```swift
enum ReportPeriod: String, CaseIterable, Identifiable {
    case today = "Hoy"
    case week = "Semana"
    case month = "Mes"
    
    var dateRange: (start: Date, end: Date) { ... }
}
```

### ReportsViewData

```swift
struct ReportsViewData {
    // Global (all-time, sin filtro)
    var globalIncome: Double = 0
    var globalCost: Double = 0
    var globalProfit: Double { globalIncome - globalCost }
    
    // Periodo (filtrado)
    var periodIncome: Double = 0
    var periodCost: Double = 0
    var periodProfit: Double { periodIncome - periodCost }
    var transactionCount: Int = 0
    var profitMargin: Double { ... }
    
    // Secciones
    var incomeCategories: [IncomeCategory] = []
    var paymentMethods: [PaymentMethodSummary] = []
    var topSellers: [TopSeller] = []
    var checkInCount: Int = 0
    var averageDailyCheckIns: Double = 0
    var topMembers: [MemberFrequency] = []
    var membershipSummary = MembershipStatusSummary()
    var lowStockProducts: [Product] = []
    var recentPayments: [Payment] = []
}
```

---

## ViewModel — Flujo de calculo

```
loadReports()
├── Fetch paralelo:
│   ├── paymentRepository.getAllCompletedPayments()
│   ├── memberRepository.getAllMembers()
│   ├── productRepository.getAllProducts()
│   └── checkInRepository.getCheckIns(from:to:)
└── calculateMetrics()
    ├── calculateGlobalTotals()     ← all-time
    ├── calculatePeriodRevenue()    ← filtered
    ├── calculateIncomeCategories()
    ├── calculatePaymentMethods()
    ├── calculateTopSellers()
    ├── calculateCheckInMetrics()
    ├── calculateTopMembers()
    ├── calculateMembershipSummary()
    └── calculateLowStock()
```

### Cambio de periodo

```swift
func changePeriod(_ period: ReportPeriod) {
    // Solo recarga check-ins (date-range query)
    // Pagos se filtran client-side (ya cargados)
    // Recalcula todas las metricas
}
```

---

## Vista — Secciones del Dashboard

El dashboard es un `ScrollView` con `VStack` de secciones:

### 1. Totales globales (arriba del selector de periodo)

Dos cards lado a lado:
- **Ingresos totales** — `TextAmount(globalIncome, variant: .success)`
- **Egresos totales** — `TextAmount(globalCost, variant: .error)`

Centro:
- **Balance global** — `TextAmount(globalProfit, variant: .success/.error, textVariant: .heading2)`

### 2. Selector de periodo

`Picker` con `.pickerStyle(.segmented)`: Hoy | Semana | Mes

### 3. Cards de metricas del periodo

Grid 2x2:
- Ingresos del periodo — `TextAmount(.success)`
- Costos del periodo — `TextAmount(.error)`
- Utilidad — `TextAmount(.success/.error)` con margen %
- Ticket promedio — `TextAmount(.default)`

### 4. Check-ins y membresias

2 cards:
- Check-ins (conteo + promedio diario)
- Membresias activas (conteo + por vencer)

### 5. Ingresos por categoria

Lista con icono, nombre, conteo de operaciones y `TextAmount`.

### 6. Metodos de pago

Lista con icono, nombre, conteo y `TextAmount`.

### 7. Mas vendidos

Top 10 con ranking numerico (badge de color para top 3).

### 8. Miembros mas frecuentes

Top 5 con ranking numerico y conteo de check-ins.

### 9. Estado de membresias

Grid 3x3 con miniStats: activas, expiradas, pendientes, suspendidas, canceladas, por vencer.

### 10. Alertas

Condicional — solo si hay alertas:
- Membresias por vencer (icono naranja)
- Productos con stock bajo (icono rojo)

### 11. Ultimas transacciones

Lista de los 10 pagos mas recientes del periodo con icono por tipo, descripcion, fecha y `TextAmount`.

---

## Uso de TextAmount (SajaruUI)

Todos los montos monetarios usan el componente `TextAmount` de SajaruUI:

```swift
TextAmount(amount, variant: .success, textVariant: .heading4, currencyCode: "MXN")
```

Variantes usadas:
- `.success` — Ingresos, utilidad positiva, revenue
- `.error` — Costos, egresos, utilidad negativa
- `.default` — Ticket promedio, montos neutrales

NO se usa formateo manual (`$String(format:...)`).

---

## Integracion en HomeView

Tab dentro de la seccion "Administracion" (visible para admin y receptionist):

```swift
Tab("Reportes", systemImage: "chart.bar.fill") {
    ReportsDashboardView()
}
```

Posicion: despues de "Clases", antes de la seccion "Cuenta".

---

## Componentes reutilizables internos

| Componente | Uso |
|------------|-----|
| `metricCard(title:amount:amountVariant:icon:iconColor:subtitle:)` | Cards financieras con TextAmount |
| `countCard(title:value:icon:iconColor:subtitle:)` | Cards de conteo (check-ins, membresias) |
| `sectionContainer(title:icon:content:)` | Contenedor de seccion con titulo e icono |
| `miniStat(label:value:color:)` | Mini estadistica para grids |

---

## Puntos de extension futuros

- **Graficas**: Agregar charts con Swift Charts (barras para ventas por dia, lineas para tendencias).
- **Exportacion**: Exportar reportes como PDF o CSV.
- **Gastos operativos**: Modulo de registro de gastos (renta, servicios, nomina) para un P&L completo.
- **Comparativa**: Comparar periodo actual vs anterior (ej: este mes vs mes pasado).
- **Filtros avanzados**: Rango de fechas personalizado, filtro por categoria.
