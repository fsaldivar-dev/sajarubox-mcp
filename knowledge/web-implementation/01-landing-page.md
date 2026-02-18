# Landing Page — Sajaru Box Web

> Sitio estatico de una sola pagina (SPA con scroll).
> Objetivo: presentar el gym, generar contacto por WhatsApp y redes sociales.
> URL: dominio por confirmar | Hosting: Firebase Hosting

---

## Estructura de secciones

```
Navbar (fija en la parte superior)
├── Home / Hero (id="home")
├── Por Que Sajaru Box (id="servicios")
├── Horarios (id="horarios")
├── Contacto (id="contacto")
└── Musica (id="musica")
Footer
```

Orden de navegacion en la barra: Inicio → Servicios → Horarios → Música → Contacto.
Orden real en el HTML (scroll): Home → Servicios → Horarios → **Contacto → Musica** → Footer.

---

## Navbar

- Logo `dark_logo_sajaru_box.png` a la izquierda
- Links de scroll suave: Inicio, Servicios, Horarios, Música, Contacto
- Al hacer scroll >50px el navbar obtiene clase `.scrolled` (fondo semitransparente)
- No hay boton de login ni modo claro

---

## Hero (id="home")

### Video de fondo

- Archivo: `/public/hero-video.mp4`
- Autoplay, loop, muted, playsInline
- Overlay oscuro encima: `rgba(0, 3, 3, 0.85)`

### Copy actual

```
Titulo: "Transforma Tu Cuerpo, Fortalece Tu Mente"
Subtitulo: "Unete a la manada mas fuerte de Santiago"
CTA: "Comienza Ahora"  →  hace scroll a #contacto
```

### Barra lateral de redes sociales

Iconos SVG flotantes en el lado izquierdo/derecho del hero:

| Red | URL |
|-----|-----|
| Facebook | `https://www.facebook.com/profile.php?id=61584823104680` |
| Instagram | `https://www.instagram.com/sajarubox` |
| TikTok | `https://www.tiktok.com/@sajarubox` |
| WhatsApp | `https://wa.me/5217299595662` |

---

## Por Que Sajaru Box (id="servicios")

**Titulo de seccion:** "Por Que Sajaru Box"

Cuatro cards con propuesta de valor:

| # | Titulo | Descripcion |
|---|--------|-------------|
| 1 | Comunidad Motivadora | "Entrenas con gente como tu, nadie se queda atras." |
| 2 | Equipamiento Funcional | "Instalaciones equipadas con lo mejor para tu entrenamiento funcional y desarrollo atletico." |
| 3 | Resultados Reales | "El trabajo constante se nota en la fuerza, condicion y confianza." |
| 4 | Ambiente Profesional | "Espacio disenado para maximizar tu rendimiento en un entorno motivador y seguro." |

Layout: CSS Grid `repeat(auto-fit, minmax(240px, 1fr))`. En mobile colapsa a 1 columna.

---

## Horarios (id="horarios")

**Titulo de seccion:** "Horarios"

Card estilo Google Business con badge "Abierto ahora":

| Dia | Horario |
|-----|---------|
| Lunes | 4:00 PM – 8:00 PM |
| Martes | 4:00 PM – 8:00 PM |
| Miercoles | 4:00 PM – 8:00 PM |
| Jueves | 4:00 PM – 8:00 PM |
| Viernes | 4:00 PM – 8:00 PM |
| Sabado | Cerrado |
| Domingo | Cerrado |

> ⚠️ El badge "Abierto ahora" es estatico — no calcula la hora real.
> Si los horarios cambian, editar directamente el JSX en `App.jsx` lineas 224–252.

---

## Contacto (id="contacto")

**Titulo de seccion:** "Contacto"

Tres items de contacto clicables:

| Item | Etiqueta | Valor | URL |
|------|----------|-------|-----|
| Ubicacion | "Direccion" | Academia Musical "Sonus Virtus" | `https://maps.app.goo.gl/FpUM21mLUtoVkb7B8` |
| WhatsApp | "WhatsApp" | +52 1 729 959 5662 | `https://wa.me/5217299595662` |
| Email | "Email" | info@sajarubox.com | `mailto:info@sajarubox.com` |

> La ubicacion fisica es dentro de la Academia Musical "Sonus Virtus" — es el punto de referencia
> en Google Maps. La direccion exacta se obtiene desde el link de Maps.

---

## Musica (id="musica")

**Titulo de seccion:** "Musica de Entrenamiento"
**Subtitulo:** "La playlist perfecta para tu WOD"

Embed de SoundCloud (iframe 450px de alto):

```
Playlist: "Ritmos de Combate Sajaru Box"
Owner: francisco-javier-saldivar-rubio-143415277
URL directa: https://soundcloud.com/francisco-javier-saldivar-rubio-143415277/sets/ritmos-de-combate-sajaru-box
Color del player: #d98c40 (naranja --secondary-color)
```

---

## Footer

```
Logo + "© 2026 Sajaru Box. Todos los derechos reservados."
```

---

## Datos de contacto oficiales

```
WhatsApp:  +52 1 729 959 5662
           wa.me/5217299595662
Email:     info@sajarubox.com
Maps:      https://maps.app.goo.gl/FpUM21mLUtoVkb7B8
Facebook:  https://www.facebook.com/profile.php?id=61584823104680
Instagram: https://www.instagram.com/sajarubox
TikTok:    https://www.tiktok.com/@sajarubox
```

---

## Propuesta de valor — elementos que invitan a quedarse

La pagina comunica:

1. **Identidad de tribu**: "La manada mas fuerte de Santiago" — crea sentido de pertenencia
2. **Bajo umbral de entrada**: El CTA principal es WhatsApp, no un formulario — contacto directo
3. **Transparencia de horarios**: El usuario sabe exactamente cuando puede ir antes de contactar
4. **Prueba social vias redes**: Facebook, Instagram, TikTok visibles desde el primer scroll
5. **Energia a traves de la musica**: La playlist de SoundCloud comunica el ambiente del gym
6. **Propuesta de 4 pilares**: Comunidad, Equipamiento, Resultados, Ambiente — diferenciadores claros

---

## Lo que falta en la landing (features planeados)

- [ ] Galeria de fotos o video adicional del gym
- [ ] Seccion de planes y precios
- [ ] Formulario de inscripcion (o link directo a WhatsApp pre-rellenado)
- [ ] Testimonios de miembros
- [ ] Badge dinamico "Abierto ahora" (calcular hora vs horario real)
- [ ] SEO basico (meta description, og:image, og:title)

---

## Como actualizar contenido

### Cambiar horarios

Editar `App.jsx` lineas ~224–252:
```jsx
<span className="hours">4:00 PM – 8:00 PM</span>
```

### Cambiar copy del Hero

Editar `App.jsx` lineas ~180–184:
```jsx
<h1>Transforma Tu Cuerpo, Fortalece Tu Mente</h1>
<p>Unete a la manada mas fuerte de Santiago</p>
<button className="cta-button" ...>Comienza Ahora</button>
```

### Agregar una card de servicio

Editar `App.jsx` dentro del `.services-grid` (lineas ~192–210):
```jsx
<div className="service-card">
  <h3>Titulo del servicio</h3>
  <p>Descripcion breve del beneficio para el miembro.</p>
</div>
```

### Actualizar redes sociales

Editar los `href` de `.social-sidebar` en `App.jsx` lineas ~155–176.
