# Storage Buckets (Firebase)

> Inventario y reglas de uso de buckets durante la transicion a backend centralizado.

---

## Objetivo

Documentar buckets y su uso para evitar configuraciones inconsistentes entre plataformas.

---

## Bucket canonico actual

| Proyecto | Bucket |
|----------|--------|
| `sajarubox` | `sajarubox.firebasestorage.app` |

---

## Regla de uso

1. Firebase Storage se usa para assets/media.
2. Datos operativos (membresias, pagos, check-ins) no deben depender de Storage.
3. Cualquier ruta nueva de media debe documentarse en este archivo.

---

## Convenciones de rutas (sugeridas)

- `profiles/{memberId}/avatar.jpg`
- `products/{productId}/image.jpg`
- `classes/{classId}/cover.jpg`

---

## Seguridad

1. Validar acceso por rol en reglas de Storage.
2. No permitir escritura publica anonima.
3. Evitar exponer rutas sensibles en cliente sin control de permisos.

---

## Estado de transicion

1. El backend oficial usa MySQL para datos operativos.
2. Storage puede mantenerse en Firebase mientras no exista reemplazo equivalente.
3. Si cambia proveedor de media, actualizar esta especificacion.

