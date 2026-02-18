# Estructura del Proyecto Web

> Landing page de Sajaru Box.
> Stack: React 19 + Vite. Sin Firebase por ahora (sitio estatico).
> Repo: fsaldivar-dev/sajaru-box-web | Branch principal: develop

---

## Stack

| Componente | Version | Notas |
|------------|---------|-------|
| React | 19.2.0 | Version mas reciente |
| Vite | 7.2.4 | Build tool + dev server |
| ESLint | 9.39.1 | Flat config |
| Node | >= 18 | Requerido por Vite 7 |

Sin dependencias de UI externas (sin Tailwind, sin MUI, sin Bootstrap).
Estilos 100% CSS custom con variables.

---

## Estructura de archivos

```
sajaru-box-web/
├── public/
│   ├── hero-video.mp4          # Video de fondo del Hero (autoplay)
│   └── Light_Wolf.png          # Icono alternativo
├── src/
│   ├── main.jsx                # Entry point: ReactDOM.createRoot
│   ├── App.jsx                 # Componente unico (348 lineas) — toda la app
│   ├── App.css                 # Estilos completos (1224 lineas) + variables CSS
│   ├── index.css               # Reset y estilos globales minimos
│   └── assets/
│       ├── dark_logo_sajaru_box.png   # Logo principal (usado en navbar, hero, footer)
│       └── light_logo_sajaru_box.png  # Logo alternativo (no usado actualmente)
├── index.html                  # Template HTML con charset UTF-8, viewport
├── vite.config.js              # Config minima: solo plugin React
├── eslint.config.js            # ESLint 9 flat config
└── package.json
```

---

## Arquitectura actual: componente unico

Todo el sitio vive en `App.jsx`. Es un Single Page Application (SPA) con scroll
entre secciones. No hay router ni paginas separadas.

### Estado del componente

```jsx
const [scrolled, setScrolled] = useState(false)       // Navbar con fondo al scrollear
const [activeSection, setActiveSection] = useState('home')  // Seccion activa (para nav)
const videoRef = useRef(null)                          // Ref para controlar el video
```

### Navegacion

No usa React Router. La navegacion es scroll suave con `scrollIntoView`:

```jsx
const scrollToSection = (sectionId) => {
  const element = document.getElementById(sectionId)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
    setActiveSection(sectionId)
  }
}
```

IDs de secciones: `home`, `servicios`, `horarios`, `musica`, `contacto`

---

## Scripts

```bash
npm run dev      # Servidor de desarrollo (localhost:5173)
npm run build    # Build de produccion en dist/
npm run preview  # Preview del build local
npm run lint     # ESLint
```

---

## Tema

Solo modo oscuro. El modo claro esta implementado en CSS pero comentado en App.jsx.

```jsx
// Siempre dark mode al montar
useEffect(() => {
  document.documentElement.setAttribute('data-theme', 'dark')
}, [])
```

El tema se aplica via `data-theme="dark"` en `<html>` y las variables CSS lo consumen.

---

## Video de fondo (Hero) — solucion iOS

El video autoplay en iOS requiere configuracion especial. La solucion implementada:

```jsx
// Atributos requeridos para iOS
video.setAttribute('playsinline', '')
video.setAttribute('webkit-playsinline', '')
video.muted = true
video.defaultMuted = true
video.autoplay = true
video.volume = 0

// IntersectionObserver como fallback si el autoplay falla
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting && video.paused) {
      video.play()
    }
  })
}, { threshold: 0.1 })
```

**Regla:** Nunca remover `muted`, `playsInline` ni `defaultMuted` del video —
iOS bloquea el autoplay de videos con audio.

---

## Agregar una seccion nueva

1. Agregar el link en el navbar:
```jsx
<li><a onClick={() => scrollToSection('nueva-seccion')}>Nueva</a></li>
```

2. Agregar la seccion con el mismo ID:
```jsx
<section id="nueva-seccion" className="section nueva-seccion">
  <div className="container">
    <h2 className="section-title">Titulo</h2>
    {/* contenido */}
  </div>
</section>
```

3. Agregar estilos en `App.css` bajo el patron:
```css
/* ── Nueva Seccion ── */
.nueva-seccion { ... }
```

---

## Hosting

Firebase Hosting (estatico). El build genera `dist/` que se despliega directamente.
No hay servidor backend ni funciones.

```bash
# Deployment (cuando este configurado)
npm run build
firebase deploy --only hosting
```
