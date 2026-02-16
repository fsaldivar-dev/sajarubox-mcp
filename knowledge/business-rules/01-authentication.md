# Autenticacion

> Reglas de negocio para inicio de sesion y registro. Aplican en todas las plataformas.

---

## Proveedores de autenticacion

| Proveedor | Registro | Inicio de sesion |
|-----------|----------|------------------|
| Email y contrasena | Si | Si |
| Google | Si | Si |
| Apple | Si (solo iOS) | Si (solo iOS) |

---

## Flujo de registro (email y contrasena)

1. El usuario ingresa: nombre completo, email, contrasena, confirmacion de contrasena
2. Validacion local:
   - Nombre no puede estar vacio
   - Email debe tener formato valido
   - Contrasena minimo 6 caracteres
   - Confirmacion debe coincidir con la contrasena
3. Si la validacion local falla, se muestra el error junto al campo correspondiente
4. Se crea la cuenta en el proveedor de autenticacion (Firebase Auth)
5. Se ejecuta la **resolucion de sesion** (ver `05-admin-setup.md`)
6. El usuario queda autenticado y se redirige a la pantalla principal

---

## Flujo de registro (Google / Apple)

1. El usuario presiona el boton del proveedor
2. Se abre la pantalla nativa del proveedor (Google o Apple)
3. El usuario autoriza el acceso
4. Se obtiene el token del proveedor y se autentica con Firebase Auth
5. Se ejecuta la **resolucion de sesion**
6. El usuario queda autenticado y se redirige a la pantalla principal

---

## Flujo de inicio de sesion (email y contrasena)

1. El usuario ingresa: email y contrasena
2. Validacion local: campos no pueden estar vacios
3. Se autentica con Firebase Auth
4. Se ejecuta la **resolucion de sesion**
5. Se redirige a la pantalla principal

---

## Flujo de inicio de sesion (Google / Apple)

Identico al flujo de registro con proveedor social. La resolucion de sesion determina si el usuario ya existe o es nuevo.

---

## Sincronizacion multi-proveedor

Si un usuario se registra con email/contrasena y despues inicia sesion con Google (usando el mismo correo):

1. Firebase Auth genera un UID diferente por cada proveedor
2. La app detecta que el email ya existe en un indice interno (`user_emails`)
3. Se crea un nuevo documento de usuario con el nuevo UID, **heredando el rol y los datos** del usuario original
4. El usuario accede con los mismos permisos sin importar el proveedor

Esto permite al usuario usar cualquier metodo de autenticacion sin perder su cuenta.

---

## Regla de seguridad: mensajes de error

**Nunca revelar si un email ya esta registrado.**

| Situacion | Mensaje correcto | Mensaje incorrecto |
|-----------|------------------|--------------------|
| Email no existe (login) | "Correo o contrasena incorrectos." | "No existe una cuenta con ese email." |
| Email ya registrado (registro) | "No se pudo completar el registro. Intenta iniciar sesion." | "Ya existe una cuenta con ese email." |
| Contrasena incorrecta | "Correo o contrasena incorrectos." | "Contrasena incorrecta." |

---

## Recuperacion de contrasena

Pendiente de implementar. Se planea:
1. El usuario ingresa su email
2. Se envia un correo con enlace para restablecer la contrasena
3. El usuario crea una nueva contrasena desde el enlace

---

## Cierre de sesion

1. Se cierra la sesion en Firebase Auth
2. Se limpia la informacion del usuario actual en memoria
3. Se redirige a la pantalla de login
