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

## Reglas

1. Vistas de la app: usar property wrappers (`@AppThemeColors`, etc.)
2. Componentes Moon: usar tokens estaticos (`ColorToken.Primary._500`, etc.)
3. Nunca hardcodear colores (`Color.blue`, `Color(hex: "...")`)
4. Nunca hardcodear tamanos de fuente (`.font(.system(size: 16))`)
5. Neutrales DEBEN usar Apple System Gray (`Color(white: x)`)
6. Error DEBE usar `.systemRed`
7. Warning DEBE usar `.systemOrange`
8. Tipografia, radius, stroke y spacing se comparten entre temas (usar `Shared*Theme`)
9. Cada tema necesita 3 modos: light, dark y liquidGlass
