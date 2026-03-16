# Storage Buckets (Firebase)

> Inventario, propósito y estado de seguridad de los buckets de Firebase Storage en el proyecto `sajarubox`.

---

## Buckets activos

| Bucket | Ambiente | Tipo | Estado reglas |
|--------|----------|------|---------------|
| `sajarubox.firebasestorage.app` | Legado | Default automático de Firebase | Sin reglas definidas |
| `sajarubox_prod` | Producción | Multi-bucket manual | Sin reglas definidas |
| `sajarubox_stage` | Staging | Multi-bucket manual | Sin reglas definidas |
| `sajarubox_test` | Pruebas | Multi-bucket manual | Regla abierta temporal — **expira 2026-03-27** ⚠️ |

---

## Detalle por bucket

### `sajarubox.firebasestorage.app` — Default / Legacy

- Bucket creado automáticamente por Firebase al activar Storage.
- Usado antes de la configuración multi-bucket.
- No eliminar: puede tener archivos históricos referenciados desde clientes.
- **Pendiente:** definir si se mantiene activo o se migra contenido a `_prod`.

---

### `sajarubox_prod` — Producción

- Bucket oficial para el ambiente de producción.
- Todas las plataformas en release (iOS, Android) deben apuntar a este bucket.
- **Pendiente:** definir y publicar reglas de seguridad.

---

### `sajarubox_stage` — Staging

- Bucket para pruebas de integración y QA antes de producción.
- Plataformas en builds de staging/debug apuntan aquí.
- **Pendiente:** definir y publicar reglas de seguridad.

---

### `sajarubox_test` — Test ⚠️

- Bucket para desarrollo local y experimentos.
- Tiene una regla temporal abierta (lectura y escritura sin autenticación).
- **La regla expira el 2026-03-27** — después de esa fecha todo acceso es denegado.
- Antes de esa fecha se debe reemplazar por reglas reales o el bucket quedará bloqueado.

**Regla actual:**

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.time < timestamp.date(2026, 3, 27);
    }
  }
}
```

---

## Reglas de seguridad recomendadas (pendiente implementar)

Modelo base para `_prod` y `_stage`. Requiere usuario autenticado para leer; solo el propio usuario puede escribir en su carpeta, admins pueden escribir en cualquier ruta.

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // Perfil de miembro: solo el propio usuario escribe, cualquier auth lee
    match /profiles/{memberId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role
           in ['admin', 'receptionist'];
    }

    // Imágenes de productos y clases: solo admin/receptionist escribe
    match /products/{productId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role
           in ['admin', 'receptionist'];
    }

    match /classes/{classId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role
           in ['admin', 'trainer'];
    }

    // Denegar todo lo demás
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Convenciones de rutas

| Ruta | Descripción |
|------|-------------|
| `profiles/{memberId}/avatar.jpg` | Foto de perfil del miembro |
| `products/{productId}/image.jpg` | Imagen del producto |
| `classes/{classId}/cover.jpg` | Portada de clase |

---

## Reglas generales

1. Datos operativos (membresías, pagos, check-ins) no deben almacenarse en Storage — solo en Firestore.
2. No permitir escritura pública anónima en ningún bucket.
3. El rol del usuario se resuelve desde `Firestore/users/{uid}.role` — nunca confiar en claims del cliente.
4. Cualquier ruta nueva debe documentarse en la tabla de convenciones de este archivo.
5. El bucket legacy (`sajarubox.firebasestorage.app`) no debe recibir nuevas escrituras — apuntar siempre a `_prod` o `_stage`.
