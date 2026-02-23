# Guia de theming

> Como usar SajaruUI en vistas, crear temas y aplicar estilos.

---

## Configuracion inicial

En el entry point de la app:

```swift
@main
struct SajaruBoxApp: App {
    @StateObject private var themeManager = ObservableThemeManager(
        themeType: .sabaruBox,
        mode: .light
    )
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(themeManager)
        }
    }
}
```

---

## Usar colores y fondos en una vista

### Property wrappers (acceso directo)

```swift
struct MiVista: View {
    @AppThemeColors var colors
    @AppThemeBackground var background
    @AppThemeFonts var fonts
    
    var body: some View {
        ZStack {
            background.base.ignoresSafeArea()
            
            VStack {
                Text("Titulo")
                    .font(fonts.h3.font)
                    .foregroundColor(colors.primary500)
                
                Text("Subtitulo")
                    .foregroundColor(colors.neutral700)
            }
        }
    }
}
```

### Style modifiers (recomendado)

```swift
struct MiVista: View {
    @AppThemeBackground var background
    
    var body: some View {
        ZStack {
            background.base.ignoresSafeArea()
            
            VStack {
                Text("Titulo")
                    .themedText(variant: .heading3, colorVariant: .primary)
                
                Text("Subtitulo")
                    .themedText(variant: .body1, colorVariant: .secondary)
            }
        }
    }
}
```

**Preferir style modifiers** porque encapsulan la logica del tema y son mas declarativos.

---

## Variantes de texto

| Variant | Uso |
|---------|-----|
| `.heading1` a `.heading6` | Titulos |
| `.body1` a `.body4` | Texto de cuerpo |
| `.label1` a `.label3` | Etiquetas |
| `.caption` | Texto pequeno |
| `.overline` | Texto superior de seccion |

| Color variant | Uso |
|---------------|-----|
| `.primary` | Texto principal |
| `.secondary` | Texto secundario |
| `.tertiary` | Texto terciario |
| `.inverse` | Texto sobre fondo oscuro |
| `.accent` | Texto de acento |
| `.error` | Texto de error |
| `.success` | Texto de exito |
| `.warning` | Texto de advertencia |

---

## Botones

```swift
// Variantes de boton
Button("Principal") { }.buttonStyle(.primary, size: .large)
Button("Secundario") { }.buttonStyle(.secondary, size: .medium)
Button("Peligro") { }.buttonStyle(.danger, size: .large)
Button("Ghost") { }.buttonStyle(.ghost, size: .small)
Button("Outline") { }.buttonStyle(.outline, size: .medium)
```

Tamanos: `.small`, `.medium`, `.large`

Variantes: `.primary`, `.secondary`, `.tertiary`, `.outline`, `.ghost`, `.danger`, `.success`, `.dashed`

---

## Campos de texto

```swift
TextField("Email", text: $email)
    .textFieldStyle(.email)

SecureField("Contrasena", text: $password)
    .textFieldStyle(.password)

TextField("Nombre", text: $nombre)
    .textFieldStyle(.text)

TextField("Telefono", text: $telefono)
    .textFieldStyle(.phone)

TextField("Buscar", text: $query)
    .textFieldStyle(.search)
```

---

## Cards y contenedores

```swift
VStack {
    Text("Contenido")
}
.themedCard()

// Divider tematico
AppDivider()
```

---

## Cambiar tema en runtime

```swift
@EnvironmentObject var themeManager: ObservableThemeManager

// Cambiar tipo de tema
themeManager.setThemeType(.ocean)

// Cambiar modo
themeManager.setMode(.dark)
```

---

## Crear un tema nuevo

### 1. Crear los color themes (light/dark/liquidGlass)

```swift
// Sources/SajaruUI/Implementations/NuevoTheme/

struct NuevoColorThemeLight: ColorTheme {
    var primary100: Color { Color(hex: "E3F2FD") }
    var primary200: Color { Color(hex: "BBDEFB") }
    var primary300: Color { Color(hex: "90CAF9") }
    var primary400: Color { Color(hex: "64B5F6") }
    var primary500: Color { Color(hex: "42A5F5") }
    var primary600: Color { Color(hex: "1E88E5") }
    // ... todos los colores
    
    // Neutrales: DEBEN usar Apple System Gray
    var neutral100: Color { Color(white: 1.0) }
    var neutral200: Color { Color(white: 0.95) }
    // ...
    
    // Error: DEBE usar .systemRed
    var error100: Color { .systemRed }
    // ...
    
    // Warning: DEBE usar .systemOrange
    var warning100: Color { .systemOrange }
    // ...
}
```

### 2. Crear los background themes

```swift
struct NuevoBackgroundThemeLight: BackgroundColorTheme {
    var base: Color { Color(white: 1.0) }
    var elevated: Color { Color(white: 0.98) }
    var surface: Color { Color(white: 0.96) }
    // ...
}
```

### 3. Crear el tema compuesto

```swift
struct NuevoThemeLight: Theme {
    var colors: ColorTheme { NuevoColorThemeLight() }
    var background: BackgroundColorTheme { NuevoBackgroundThemeLight() }
    var typography: TypographyTheme { SharedTypographyTheme() }  // Reutilizar
    var radius: RadiusTheme { SharedRadiusTheme() }              // Reutilizar
    var stroke: StrokeTheme { SharedStrokeTheme() }              // Reutilizar
    var spacing: SpacingTheme { SharedSpacingTheme() }           // Reutilizar
}
```

### 4. Crear la factory

```swift
public struct NuevoTheme {
    public static func theme(for mode: ThemeMode) -> Theme {
        switch mode {
        case .light: return NuevoThemeLight()
        case .dark: return NuevoThemeDark()
        case .liquidGlass: return NuevoThemeLiquidGlass()
        }
    }
}
```

### 5. Registrar en ThemeType

Agregar el caso al enum `ThemeType` en `ThemeManager.swift` y actualizar los `switch` de factory.

---

## Estilos obligatorios en vistas de la app

Todas las vistas DEBEN usar los style modifiers de SajaruUI en lugar de estilos nativos de SwiftUI.

### NavigationStack

```swift
// CORRECTO
NavigationStack { ... }
    .themedNavigationViewStyle()

// INCORRECTO - sin estilo de tema
NavigationStack { ... }
```

Aplicar en TODAS las vistas que usen NavigationStack (tabs y sheets).

### Listas

```swift
// CORRECTO
List { ... }
    .themedListStyle(variant: .insetGrouped)

// INCORRECTO - estilo nativo sin tema
List { ... }
    .listStyle(.insetGrouped)
```

Variantes: `.default`, `.grouped`, `.insetGrouped`, `.plain`

### Segmented Pickers

```swift
// CORRECTO
Picker("Opciones", selection: $selection) { ... }
    .themedSegmentedControlStyle()

// INCORRECTO - picker nativo sin tema (muestra azul del sistema)
Picker("Opciones", selection: $selection) { ... }
    .pickerStyle(.segmented)
```

`.themedSegmentedControlStyle()` ya incluye `.pickerStyle(.segmented)` internamente.

### TabView sidebar tint

```swift
// CORRECTO - usa color primario del tema
TabView { ... }
    .tabViewStyle(.sidebarAdaptable)
    .tint(colors.primary500)

// INCORRECTO - muestra azul del sistema
TabView { ... }
    .tabViewStyle(.sidebarAdaptable)
    .tint(nil)
```

---

## Tipografia: mapeo de fuentes del sistema a SajaruUI

`TypographyTheme` expone: `h1`-`h6`, `b1`-`b4`, `label1`-`label3`. No tiene `caption` ni `overline` como propiedades directas.

| Fuente del sistema (INCORRECTO) | SajaruUI equivalente (CORRECTO) | Nota |
|---|---|---|
| `.font(.caption)` | `.font(fonts.b4.font)` | `.caption` de themedText mapea a `b4` |
| `.font(.caption.bold())` | `.font(fonts.label3.font)` | Caption bold = label pequena |
| `.font(.body)` | `.font(fonts.b1.font)` | Body estandar |
| `.font(.subheadline)` | `.font(fonts.b3.font)` | Subheadline = body3 |
| `.font(.callout)` | `.font(fonts.b2.font)` | Callout = body2 |
| `.font(.callout.bold())` | `.font(fonts.label1.font)` | Callout bold = label grande |
| `.font(.headline)` | `.font(fonts.h5.font)` | Headline = heading5 |
| `.font(.title3)` | `.font(fonts.h4.font)` | Title3 = heading4 |
| `.font(.title2)` | `.font(fonts.h3.font)` | Title2 = heading3 |
| `.font(.title)` | `.font(fonts.h2.font)` | Title = heading2 |
| `.font(.largeTitle)` | `.font(fonts.h1.font)` | LargeTitle = heading1 |

**Excepcion**: `.font(.system(size: XX))` en SF Symbols/iconos es aceptable porque se trata de dimensionamiento de iconos, no tipografia de texto.

### Preferir `.themedText()` cuando sea posible

```swift
// MEJOR - aplica font + color en uno
Text("Titulo")
    .themedText(variant: .heading3, colorVariant: .primary)

// ACEPTABLE - cuando el color viene de logica de negocio
Text("Estado: Activo")
    .font(fonts.b4.font)
    .foregroundStyle(colors.success100)
```

---

## Helpers centralizados (ThemeHelpers.swift)

Para evitar duplicacion de logica de mapeo status->color, usar extensions centralizadas:

```swift
// En ThemeHelpers.swift
extension MembershipStatus {
    func themeColor(_ colors: ColorTheme) -> Color {
        switch self {
        case .active: return colors.success100
        case .expired: return colors.error100
        case .suspended: return colors.warning100
        case .cancelled: return colors.neutral400
        case .pending: return colors.primary500
        }
    }
}

// Uso en vistas
Circle()
    .fill(member.membershipStatus.themeColor(colors))
```

Componentes reutilizables como `AppToast` tambien van en `ThemeHelpers.swift`.

---

## Reglas

1. Vistas de la app: usar property wrappers (`@AppThemeColors`, `@AppThemeFonts`, etc.)
2. Componentes Moon: usar tokens estaticos (`ColorToken.Primary._500`, etc.)
3. **NUNCA** hardcodear colores (`Color.blue`, `.red`, `.secondary`, `Color(hex: "...")`)
4. **NUNCA** hardcodear fuentes (`.font(.caption)`, `.font(.system(size: 16))`, `.font(.body)`)
5. **SIEMPRE** usar `.themedSegmentedControlStyle()` en Pickers segmentados
6. **SIEMPRE** usar `.themedListStyle(variant:)` en Listas
7. **SIEMPRE** usar `.themedNavigationViewStyle()` en NavigationStacks
8. **SIEMPRE** usar `.tint(colors.primary500)` en TabView sidebar
9. Neutrales DEBEN usar Apple System Gray (`Color(white: x)`)
10. Error DEBE usar `.systemRed`, Warning DEBE usar `.systemOrange`
11. Tipografia, radius, stroke y spacing se comparten entre temas (usar `Shared*Theme`)
12. Cada tema necesita 3 modos: light, dark y liquidGlass
