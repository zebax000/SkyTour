# Guía de despliegue

SkyTour se publica en tres servicios: la base en **Neon**, el backend en **Render** y el frontend en **Vercel**. Sigue los pasos en este orden, porque cada servicio necesita la dirección del anterior.

## Antes de empezar

- El código debe estar en GitHub, en la rama `main`.
- Comprueba en tu equipo que todo pasa: `pytest` y `ruff check .` dentro de `backend/`, y `npm run lint` y `npm run build` dentro de `frontend/`.
- Ten a mano una clave de Gemini solo si quieres la explicación del riesgo y lectura de documentos con IA. Sin clave, la aplicación funciona con reglas.
- Ten a mano una cuenta gratuita en **Brevo** si quieres que el enlace de recuperación de contraseña se envíe por correo.
- No pegues claves ni cadenas de conexión en el repositorio. Se escriben solo en los paneles de cada servicio.

## Variables de entorno

| Variable | Dónde | Valor |
|---|---|---|
| `DATABASE_URL` | Render | Cadena de conexión de la base de producción en Neon |
| `SECRET_KEY` | Render | La genera Render; no hay que escribirla |
| `FRONTEND_URL` | Render | Dirección exacta del frontend en Vercel, sin barra final |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Render | `60` (ya viene en `render.yaml`) |
| `GEMINI_API_KEY` | Render | Opcional |
| `GEMINI_MODEL` | Render | Ya viene en `render.yaml`; debe existir para tu clave |
| `BREVO_API_KEY` | Render | Opcional; clave de API v3 de Brevo (`xkeysib-...`) |
| `CORREO_REMITENTE` | Render | Opcional; correo del remitente verificado en Brevo |
| `CORREO_NOMBRE_REMITENTE` | Render | `SkyTour` (ya viene en `render.yaml`) |
| `PYTHON_VERSION` | Render | Ya viene en `render.yaml`; cámbiala por la tuya |
| `VITE_API_URL` | Vercel | Dirección del backend en Render, sin barra final |

Las variables `VITE_` quedan visibles en el navegador: nunca pongas claves en ellas.

## 1. Base de datos en Neon

1. Crea una base **vacía** para producción. En tu proyecto de Neon, entra a Databases y crea una nueva (por ejemplo `skytour_prod`). Así no arrastras las cuentas ni los datos de demostración de la base de desarrollo.
2. Copia la cadena de conexión **directa** de esa base (sin `-pooler` en el nombre del servidor), con `sslmode=require`. Comprueba que termina en el nombre de la base nueva.
3. No ejecutes nada más: las tablas y migraciones (`0001` a `0005`) las aplica el backend al arrancar.

## 2. Backend en Render

1. En Render, elige **New > Blueprint** y selecciona el repositorio. Render lee `render.yaml`.
2. Cuando lo pida, escribe `DATABASE_URL` con la cadena de la base de producción. En `FRONTEND_URL` pon un valor provisional; lo corregirás en el paso 4.
3. Revisa `PYTHON_VERSION` en `render.yaml`. Si desarrollas con otra versión de Python, cámbiala antes de desplegar.
4. Espera al primer despliegue. Cada arranque ejecuta `alembic upgrade head`, así que las tablas se crean solas.
5. Abre `https://<tu-servicio>.onrender.com/health`. Debe responder `{"status":"ok"}`. Si falla, revisa los registros de Render.

Si falta `SECRET_KEY` o conserva el valor de ejemplo con un `FRONTEND_URL` que no es local, el backend se niega a arrancar. Es intencional.

## 3. Frontend en Vercel

1. En Vercel, importa el repositorio.
2. En **Root Directory** elige `frontend`.
3. Vercel detecta Vite. El comando de compilación es `npm run build` y la carpeta de salida es `dist`.
4. Añade `VITE_API_URL` con la dirección del backend de Render **antes** de desplegar. Esta variable se lee al compilar: si la cambias, hay que volver a desplegar.
5. Despliega. `frontend/vercel.json` ya redirige todas las rutas a `index.html`, así que recargar una pantalla interna (como `/restablecer-contrasena`) no da error 404.

## 4. Cerrar el círculo

El backend solo acepta peticiones de **una** dirección. Vuelve a Render y cambia `FRONTEND_URL` por la dirección real de Vercel, por ejemplo `https://skytour.vercel.app`, sin barra final. Render reinicia el servicio.

Consecuencias de tener un solo origen permitido:

- Las vistas previas de Vercel (las direcciones de cada rama) no podrán iniciar sesión.
- Si añades un dominio propio, hay que actualizar `FRONTEND_URL`.

## 5. Correo de recuperación con Brevo (API HTTPS)

Render en el plan gratuito bloquea los puertos SMTP (25, 465 y 587), por lo que SkyTour envía correos mediante la API HTTPS de **Brevo** (plan gratuito de hasta 300 correos diarios, sin exigir dominio propio):

1. Crea una cuenta gratuita en [Brevo](https://www.brevo.com/).
2. Entra a **Senders, Domains & Dedicated IPs > Senders** y verifica el correo que usarás como remitente (`CORREO_REMITENTE`).
3. Entra a **SMTP & API > API Keys** y genera una clave nueva de API v3 (`BREVO_API_KEY`).
4. En el panel del servicio en Render (**Environment**), define `BREVO_API_KEY`, `CORREO_REMITENTE` y opcionalmente `CORREO_NOMBRE_REMITENTE`.
5. Si no configuras `BREVO_API_KEY`, la pantalla `¿Olvidaste tu contraseña?` seguirá respondiendo igual sin fallar y registrará una advertencia en el servidor sin exponer datos sensibles.

## 6. Primer administrador

La base de producción empieza sin usuarios. El primer administrador se crea con un script, desde tu equipo, apuntando a la base de producción:

```powershell
cd backend
# con el entorno virtual activo
$env:DATABASE_URL = "<cadena de la base de producción>"
python -m app.crear_admin --nombre "Tu Nombre" --correo tu@correo.com
Remove-Item Env:DATABASE_URL
```

El script pide la contraseña por teclado (mínimo 8 caracteres, con letras y números) y se niega a crear un correo que ya existe. Revisa dos veces a qué base apunta `DATABASE_URL` antes de ejecutarlo.

A partir de ahí, inicia sesión y crea al resto de personas desde la pantalla **Usuarios**. El administrador define una contraseña inicial y cada persona la cambia desde **Mi cuenta** o mediante **¿Olvidaste tu contraseña?**.

- Para una demostración con datos ficticios, usa una base aparte y `python -m app.seed`. No lo ejecutes sobre una base con datos reales.

## 7. Seguridad y limitaciones conocidas

- Cinco intentos fallidos seguidos con el mismo correo bloquean ese correo durante 15 minutos (respuesta 429). Un inicio de sesión correcto o un restablecimiento de contraseña reinicia el contador.
- Los tokens de recuperación de contraseña se generan con `secrets.token_urlsafe(32)`, caducan a los 30 minutos, son de un solo uso e invalidan enlaces anteriores del mismo usuario. En la base de datos solo se guarda su hash SHA-256.
- **Correos de demostración:** Los usuarios creados por `seed.py` tienen correos ficticios (`@skytour.demo`) y no reciben mensajes reales. Para probar la recuperación por correo, crea una cuenta desde **Usuarios** con un correo real controlado por el equipo.
- **Sesiones abiertas tras cambio de clave:** Los tokens JWT de sesión ya emitidos siguen siendo válidos hasta que caduquen (`ACCESS_TOKEN_EXPIRE_MINUTES`). Para invalidarlos al instante en el futuro, se puede añadir una marca `contrasena_actualizada_en` en `usuario` y verificarla en `get_current_user`.
- **Límite en memoria:** El contador de intentos vive en la memoria del servidor; se borra al reiniciarse y solo es fiable con una instancia.

## 8. Comprobación final

- [ ] `/health` del backend responde `ok`.
- [ ] El administrador creado con el script inicia sesión.
- [ ] Desde Usuarios se crea un evaluador y un consultor, y ambos inician sesión y ven solo lo que su rol permite.
- [ ] Al entrar a la pestaña Riesgo IA, la explicación aparece automáticamente para los tres roles y se reutiliza sin volver a llamar a Gemini si el riesgo no cambió.
- [ ] Al subir un documento y pulsar «Leer con IA», se rellenan tipo, fechas, entidad emisora, número, titular, lugar, objeto y resumen.
- [ ] Con `BREVO_API_KEY` y remitente verificado, «¿Olvidaste tu contraseña?» envía el correo y el enlace permite cambiar la contraseña una sola vez.
