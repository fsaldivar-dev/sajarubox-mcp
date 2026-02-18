# Design System — Web

> Variables CSS, colores, tipografia, breakpoints y componentes base.
> Todo vive en `src/App.css`. No hay libreria de UI externa.

---

## Paleta de colores (modo oscuro)

### Primario — Teal

| Variable | Hex | Uso |
|----------|-----|-----|
| `--primary-100` | `#66a6ad` | Color base — bordes, iconos, acentos |
| `--primary-200` | `#73b3ba` | Hover de links de nav |
| `--primary-300` | `#80c0c7` | — |
| `--primary-400` | `#8ccdd4` | — |
| `--primary-500` | `#99d9e1` | — |
| `--primary-600` | `#a6e6ed` | — |

### Secundario — Naranja

| Variable | Hex | Uso |
|----------|-----|-----|
| `--secondary-100` | `#d98c40` | Color base — CTA, badges, acentos activos |
| `--secondary-200` | `#e0994d` | Hover del CTA |
| `--secondary-300` | `#e8a659` | — |
| `--secondary-400` | `#f0b366` | — |
| `--secondary-500` | `#f7c073` | — |
| `--secondary-600` | `#ffcc80` | — |

### Acento — Beige calido

| Variable | Hex | Uso |
|----------|-----|-----|
| `--accent-100` | `#e6d9bf` | Texto decorativo / detalles calidos |

### Fondos

| Variable | Hex | Uso |
|----------|-----|-----|
| `--bg-base` | `#000303` | Fondo de pagina (negro casi puro) |
| `--bg-elevated` | `#1c1f21` | Secciones alternadas |
| `--bg-surface` | `#2b2e30` | Cards, contenedores |

### Texto

| Variable | Valor | Uso |
|----------|-------|-----|
| `--text-primary` | `#ffffff` | Titulos y texto principal |
| `--text-secondary` | `#b3b3b5` | Subtitulos y texto de soporte |

### Colores alfa (para overlays y bordes)

```css
--primaryAlpha10: rgba(102, 166, 173, 0.1)   /* Fondo de cards al hover */
--primaryAlpha25: rgba(102, 166, 173, 0.25)  /* Bordes sutiles */
--primaryAlpha50: rgba(102, 166, 173, 0.5)   /* Bordes activos */
--secondaryAlpha10: rgba(217, 140, 64, 0.1)  /* Fondo de badges */
--secondaryAlpha50: rgba(217, 140, 64, 0.5)  /* Sombras naranjas */
--overlay-color: rgba(0, 3, 3, 0.85)         /* Overlay sobre el video */
--border-color: rgba(102, 166, 173, 0.2)     /* Bordes de separacion */
```

### Colores semanticos

```css
--error-color: #ff453a    /* Errores */
--success-color: #32c759  /* Exito */
--warning-color: #ff9f0a  /* Advertencias */
```

---

## Variables de tema (aliases)

Estas son las variables que se usan en los componentes. Referencian la paleta:

```css
--primary-color: var(--primary-100)      /* #66a6ad */
--secondary-color: var(--secondary-100)  /* #d98c40 */
--dark-bg: var(--bg-base)               /* #000303 */
--section-bg: var(--bg-elevated)        /* #1c1f21 */
--card-bg: var(--bg-surface)            /* #2b2e30 */
--text-primary: var(--neutral-1000)     /* #ffffff */
--text-secondary: var(--neutral-900)    /* #b3b3b5 */
--accent-hover: var(--primary-200)      /* #73b3ba */
```

**Regla:** En CSS nuevo, usar siempre las variables de alias (`--primary-color`, `--card-bg`),
no los valores hexadecimales directamente.

---

## Tipografia

No hay fuente personalizada importada. Usa la fuente del sistema:

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Jerarquia de titulos usada

| Elemento | Uso en la pagina |
|----------|-----------------|
| `h1` | Titulo principal del Hero |
| `h2.section-title` | Titulo de cada seccion |
| `h3` | Titulos de cards (servicios, horarios) |
| `h4` | Subtitulos en contacto |
| `p` | Texto de soporte, descripciones |

---

## Breakpoints responsivos

```css
/* Desktop (base) */
/* Sin media query — estilos base para desktop */

/* Tablet */
@media (max-width: 1024px) { ... }

/* Mobile */
@media (max-width: 768px) { ... }

/* Mobile pequeno */
@media (max-width: 480px) { ... }
```

---

## Componentes CSS base

### `.container`

Centra el contenido con ancho maximo:

```css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}
```

### `.section`

Espaciado estandar para todas las secciones:

```css
.section {
  padding: 80px 0;
}
```

Las secciones alternas usan `--section-bg` en lugar de `--dark-bg`:

```css
.servicios { background: var(--dark-bg); }
.horarios  { background: var(--section-bg); }
.musica    { background: var(--dark-bg); }
.contacto  { background: var(--section-bg); }
```

### `.section-title`

```css
.section-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text-primary);
  text-align: center;
  margin-bottom: 48px;
  /* Linea decorativa debajo via ::after con --secondary-color */
}
```

### `.service-card` / `.contact-item`

```css
/* Card base */
background: var(--card-bg);
border: 1px solid var(--border-color);
border-radius: 12px;
padding: 32px;
transition: transform 0.3s ease, border-color 0.3s ease;

/* Hover */
transform: translateY(-4px);
border-color: var(--primary-color);
```

### `.cta-button`

Boton principal naranja del Hero:

```css
background: var(--secondary-color);   /* #d98c40 */
color: #000;
border-radius: 8px;
font-weight: 700;
/* Hover: background var(--secondary-200) */
```

### `.social-icon`

Iconos de redes sociales en la barra lateral:

```css
color: var(--text-secondary);
transition: color 0.3s ease, transform 0.3s ease;
/* Hover: color var(--primary-color), transform scale(1.2) */
```

---

## Animaciones

```css
@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-30px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

Usadas en `.hero-content` para la entrada del titulo y CTA.

---

## Scrollbar personalizado

```css
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: var(--dark-bg); }
::-webkit-scrollbar-thumb { background: var(--primary-color); border-radius: 4px; }
```

---

## Reglas para estilos nuevos

1. Usar siempre variables CSS — nunca hardcodear colores hex
2. Nuevas secciones siguen el patron `.section` con `padding: 80px 0`
3. Los colores de fondo alternan entre `--dark-bg` y `--section-bg`
4. Cards nuevas usan `--card-bg`, `--border-color` y el hover con `--primary-color`
5. Botones CTA usan `--secondary-color` (naranja)
6. Links y acentos interactivos usan `--primary-color` (teal)
7. Agregar breakpoints en los mismos 3 puntos: 1024px, 768px, 480px
