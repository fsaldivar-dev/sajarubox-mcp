# Sistema de diseno: SajaruUI

> Arquitectura basada en protocolos con temas intercambiables, property wrappers y style modifiers.

---

## Arquitectura

```
SajaruUI (core)
├── Protocols: Theme, ColorTheme, BackgroundColorTheme, TypographyTheme, etc.
├── ThemeManager: ObservableThemeManager
├── Themes: 10 implementaciones (Alpha, Beta, Omega, Moon, Ocean, etc.)
├── PropertyWrappers: @AppThemeColors, @AppThemeBackground, etc.
├── Styles: .themedText(), .buttonStyle(), .textFieldStyle(), etc.
└── Tokens: ColorToken, BackgroundToken (bridge para Moon components)

Moon (componentes)
├── Atoms: MoonButton, MoonInput, MoonText, MoonIcon, MoonAvatar, etc.
├── Molecules: MoonSajarulInput, MoonCardBase, MoonListItemBase, etc.
└── Organisms: MoonAppHeader, MoonModalDialog, MoonEmptyState, etc.
```

---

## Protocolos de tema

### Theme (protocolo principal)

```swift
public protocol Theme {
    var colors: ColorTheme { get }
    var radius: RadiusTheme { get }
    var stroke: StrokeTheme { get }
    var background: BackgroundColorTheme { get }
    var typography: TypographyTheme { get }
    var spacing: SpacingTheme { get }
}
```

### ColorTheme

Define colores semanticos organizados en familias:
- **Primary**: `primary100` a `primary600` + alpha variants (`primaryAlpha10`, `primaryAlpha25`, `primaryAlpha50`, `primaryAlpha75`)
- **Secondary**: `secondary100` a `secondary600` + alpha
- **Accent**: `accent100` a `accent600` + alpha
- **Neutral**: `neutral100` a `neutral1000` + alpha (basado en Apple System Gray)
- **Error**: `error100` a `error600` + alpha (basado en `.systemRed`)
- **Warning**: `warning100` a `warning600` + alpha (basado en `.systemOrange`)
- **Success**: `success100` a `success600` + alpha

### BackgroundColorTheme

Fondos solidos y gradientes:
- Solidos: `base`, `elevated`, `surface`, `inverse`, `accent`, `success`, `error`, `warning`, `overlay`, `disabled`
- Gradientes: `gradient` (radial), `primaryGradient`, `accentGradient` (lineales)

### Otros protocolos

| Protocolo | Propiedades principales |
|-----------|------------------------|
| TypographyTheme | `h1`-`h6`, `b1`-`b4`, `label1`-`label3` (retornan `TextStyle`) |
| RadiusTheme | `none`, `xs`, `s`, `m`, `l`, `xl`, `full` |
| StrokeTheme | `s`, `m`, `l`, `xl` |
| SpacingTheme | Multiplos de 4pt: `_1` (4pt) a `_24` (96pt) |

---

## ThemeManager

```swift
public final class ObservableThemeManager: ThemeManager, ObservableObject {
    @Published private(set) public var theme: Theme
    @Published private(set) public var themeMode: ThemeMode
    @Published public private(set) var themeType: ThemeType
    
    @MainActor
    public static var shared = ObservableThemeManager(...)
    
    public func setMode(_ mode: ThemeMode) { ... }
    public func setThemeType(_ type: ThemeType) { ... }
}
```

### ThemeMode

| Modo | Descripcion |
|------|-------------|
| `.light` | Tema claro |
| `.dark` | Tema oscuro |
| `.liquidGlass` | Modo glassmorphism (iOS 26+) |

### ThemeType

10 temas disponibles: `.alpha`, `.beta`, `.omega`, `.sabaruBox`, `.moon`, `.ocean`, `.forest`, `.sunset`, `.otomi`, `.sonusAcademy`

---

## Property wrappers (para vistas de la app)

Acceden al tema actual via `@EnvironmentObject`:

| Wrapper | Acceso | Ejemplo |
|---------|--------|---------|
| `@AppThemeColors` | `colors.primary500` | `colors.neutral800` |
| `@AppThemeBackground` | `background.base` | `background.surface` |
| `@AppThemeFonts` | `fonts.h1.font` | `fonts.b1.font` |
| `@AppThemeRadius` | `radius.m` | `radius.l` |
| `@AppThemeStroke` | `stroke.m` | `stroke.l` |
| `@AppThemeSpacing` | `spacing._4` | `spacing._8` |
| `@AppThemeAnimations` | `animations.standard` | `animations.springBouncy` |

**Uso:**

```swift
struct MyView: View {
    @AppThemeColors var colors
    @AppThemeBackground var background
    
    var body: some View {
        Text("Hola")
            .foregroundColor(colors.primary500)
            .background(background.base)
    }
}
```

---

## Style modifiers (recomendado)

En lugar de usar property wrappers directamente, preferir los style modifiers:

```swift
// Texto
Text("Titulo")
    .themedText(variant: .heading3, colorVariant: .primary)

// Boton
Button("Continuar") { }
    .buttonStyle(.primary, size: .large)

// Campo de texto
TextField("Email", text: $email)
    .textFieldStyle(.email)

// Card
VStack { ... }
    .themedCard()

// Navegacion
NavigationStack { ... }
    .themedNavigationViewStyle()
```

### ThemedNavigationViewStyle y iOS 26

El modifier `.themedNavigationViewStyle()` tiene comportamiento diferenciado por version de iOS:

| iOS | Comportamiento |
|-----|---------------|
| < 26 | `UINavigationBarAppearance` manual + `.toolbarBackground(.visible)` + `.toolbarColorScheme` |
| 26+ | Solo `.toolbarColorScheme` + `.tint` (deja que Liquid Glass maneje el rendering nativo) |

En iOS 26, el `UINavigationBarAppearance` manual y `.toolbarBackground` forzado interferian con el rendering nativo de Liquid Glass, ocultando el navigation bar completo (titulo, search, toolbar).

**Regla critica:** NUNCA anidar `NavigationStack` dentro de `FlowStack`, porque `FlowStack` ya crea un `NavigationStack` interno. En iOS 26 esto causa que el navigation bar del `NavigationStack` interno desaparezca.

### Modifiers disponibles (30+)

| Modifier | Descripcion | Obligatorio |
|----------|-------------|:-----------:|
| `.themedText(variant:colorVariant:)` | Texto con tipografia y color del tema | Si (para texto estilizado) |
| `.buttonStyle(_:size:)` | Boton con variante (primary, secondary, danger, etc.) | Si |
| `.textFieldStyle(_:)` | Campo de texto (email, password, text, phone, search) | Si |
| `.themedNavigationViewStyle()` | Estilo de navegacion (toolbar, fondo) | **Si (en todo NavigationStack)** |
| `.themedListStyle(variant:)` | Estilo de lista con fondo del tema | **Si (en toda List)** |
| `.themedSegmentedControlStyle()` | Picker segmentado con colores del tema | **Si (en todo Picker segmentado)** |
| `.themedCard()` | Card con fondo y bordes del tema | Si |
| `.themedBadge()` | Badge/etiqueta | Si |
| `.themedChip()` | Chip seleccionable | Si |
| `.themedToggle()` | Toggle/switch | Si |
| `.themedAlert()` | Alerta tematica | Si |
| `.forceThemeColorScheme()` | Forzar color scheme del tema en flows | Si (en Flows) |
| `AppDivider` | Separador tematico | Si |

**Regla critica**: NUNCA usar estilos nativos (`.pickerStyle(.segmented)`, `.listStyle(.insetGrouped)`) cuando existe un equivalente tematico. Los estilos nativos muestran colores del sistema (azul) en lugar de los colores del tema.

---

## Token bridge types (para Moon components)

Los componentes Moon usan tokens estaticos que leen de `ObservableThemeManager.shared`:

```swift
// En Moon components (internos):
ColorToken.Primary._500    // Accede a theme.colors.primary500
BackgroundToken.base       // Accede a theme.background.base
RadiusToken.m              // Accede a theme.radius.m
StrokeToken.m              // Accede a theme.stroke.m
TypographyToken.h1         // Accede a theme.typography.h1
```

Los componentes Moon tambien necesitan `.observeTheme()` al final de su body.

**Regla:** Las vistas de la app usan property wrappers (`@AppThemeColors`). Los componentes Moon usan tokens estaticos (`ColorToken`). No mezclar.

---

## Configuracion en la app

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
