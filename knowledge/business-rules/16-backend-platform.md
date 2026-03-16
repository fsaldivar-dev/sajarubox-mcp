# Plataforma Backend Oficial

> Regla de arquitectura para todas las plataformas del ecosistema SajaruBox.
> El backend operativo actual usa Firebase (Firestore + Auth + Storage).

---

## Estado actual

SajaruBox opera 100% sobre Firebase:

- **Firebase Authentication** — login, registro, multi-proveedor
- **Firestore** — fuente de verdad de todos los datos operativos
- **Firebase Storage** — almacenamiento de archivos
- **Firebase Realtime Database** — timer de entrenamiento (Android TV)

No existe backend REST propio ni base de datos MySQL en producción.

---

## Responsabilidades por capa

| Capa | Responsabilidad |
|------|-----------------|
| Cliente (iOS/Android/Web) | UI, lógica de presentación, escritura directa a Firestore |
| Firebase Auth | Registro, login, emisión de ID token |
| Firestore | Fuente de verdad de datos operativos (miembros, pagos, check-ins, etc.) |
| Firebase Storage | Archivos binarios (imágenes, documentos) |
| Cloud Functions | Solo para operaciones críticas del sistema (ej: kill switch de billing) |

---

## Reglas críticas

1. Firestore es la fuente de verdad — ningún cliente debe duplicar estado crítico en local sin sincronización.
2. Las reglas de negocio se validan en el cliente antes de escribir a Firestore.
3. Soft delete obligatorio: `isActive = false`, nunca eliminar documentos.
4. Cambios de esquema se documentan en `schema.md` antes de implementar en cualquier plataforma.
5. Nunca exponer credenciales Firebase en repositorios.

---

## Migración futura (opcional)

Existe documentación de una posible migración a backend Node.js + MySQL en Hostinger
en `knowledge/backend-implementation/`. Esta migración **no está planificada ni activa**.
Se ejecutará solo si los costos de Firebase o los requerimientos operativos lo justifican.

Mientras eso no ocurra, toda nueva lógica de negocio se implementa sobre Firebase.
