# Registro de miembros del gimnasio

> Reglas para el alta, busqueda y gestion de miembros. Un miembro es una persona inscrita en el gimnasio, no necesariamente un usuario de la app.

---

## Diferencia entre usuario y miembro

| Concepto | Usuario (`users`) | Miembro (`members`) |
|----------|-------------------|---------------------|
| Que es | Persona con cuenta en la app | Persona inscrita en el gimnasio |
| Requiere cuenta | Si | No |
| Quien lo crea | El propio usuario (registro) | El admin |
| Ejemplo | Admin que usa la app | Cliente que va al gimnasio |

Un admin es un usuario. Un cliente del gimnasio es un miembro. Pueden o no ser la misma persona.

---

## Datos de un miembro

### Datos personales (requeridos)

| Campo | Tipo | Ejemplo |
|-------|------|---------|
| Nombre | Texto | "Juan" |
| Primer apellido | Texto | "Garcia" |
| Segundo apellido | Texto (opcional) | "Lopez" |

### Datos de contacto (opcionales)

| Campo | Tipo | Ejemplo |
|-------|------|---------|
| Telefono | Texto | "5512345678" |
| Telefono de emergencia | Texto | "5587654321" |

### Datos de salud (opcionales)

| Campo | Tipo | Ejemplo |
|-------|------|---------|
| Enfermedades | Texto | "Diabetes" o "No" |
| Lesiones | Texto | "Rodilla derecha" o "No" |
| Otros | Texto | "Toma medicamentos" |

### Datos de nacimiento y tutor (opcionales)

| Campo | Tipo | Ejemplo |
|-------|------|---------|
| Fecha de nacimiento | Fecha | 2005-03-15 |
| Datos del tutor | Texto | "Veronica Hernandez - Mama" |

Si la fecha de nacimiento indica que el miembro es menor de 18 anos, se le considera menor de edad (`isMinor`).

---

## Operaciones

### Crear miembro
1. El admin ingresa nombre y primer apellido (obligatorios)
2. Opcionalmente agrega contacto, salud y membresia
3. Se genera un ID unico automaticamente
4. Se establece `isActive = true` y fecha de registro

### Editar miembro
- El admin puede modificar cualquier campo
- Se actualiza la fecha de `updatedAt`

### Desactivar miembro (soft delete)
- El miembro se marca como `isActive = false`
- El documento permanece en la base de datos
- No aparece en la lista de miembros activos

### Buscar miembros
- Busqueda por texto libre: nombre, primer apellido, segundo apellido, telefono
- La busqueda es local (se descargan todos los activos y se filtran en la app)

---

## Grupos familiares

- Varios miembros pueden compartir un mismo `familyGroupId`
- Esto los agrupa como familia para compartir un plan familiar
- El plan familiar soporta 3-4 miembros
- **Estado**: Pendiente de implementacion completa (Fase 6)

---

## Reglas de negocio

1. Nombre y primer apellido son obligatorios
2. Los miembros nunca se eliminan fisicamente, solo se desactivan
3. Un miembro puede existir sin membresia asignada
4. Un miembro puede estar activo pero con membresia expirada
5. La busqueda no distingue mayusculas/minusculas
