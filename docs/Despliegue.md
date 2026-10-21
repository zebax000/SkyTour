# Guía de despliegue

SkyTour se publica en tres servicios: la base en **Neon**, el backend en **Render** y el frontend en **Vercel**. Sigue los pasos en este orden, porque cada servicio necesita la dirección del anterior.

## Antes de empezar

- El código debe estar en GitHub, en la rama `main`.
- Comprueba en tu equipo que todo pasa: `pytest` y `ruff check .` dentro de `backend/`, y `npm run lint` y `npm run build` dentro de `frontend/`.
- Ten a mano una clave de Gemini solo si quieres la explicación del riesgo con IA. Sin clave, la aplicación funciona con reglas.
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
| `PYTHON_VERSION` | Render | Ya viene en `render.yaml`; cámbiala por la tuya |
| `VITE_API_URL` | Vercel | Dirección del backend en Render, sin barra final |

Las variables `VITE_` quedan visibles en el navegador: nunca pongas claves en ellas.

## 1. Base de datos en Neon

1. Crea una base **vacía** para producción. En tu proyecto de Neon, entra a Databases y crea una nueva (por ejemplo `skytour_prod`). Así no arrastras las cuentas ni los datos de demostración de la base de desarrollo.
2. Copia la cadena de conexión **directa** de esa base (sin `-pooler` en el nombre del servidor), con `sslmode=require`. Comprueba que termina en el nombre de la base nueva.
3. No ejecutes nada más: las tablas las crea el backend al arrancar.

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
5. Despliega. `frontend/vercel.json` ya redirige todas las rutas a `index.html`, así que recargar una pantalla interna no da error 404.

## 4. Cerrar el círculo

El backend solo acepta peticiones de **una** dirección. Vuelve a Render y cambia `FRONTEND_URL` por la dirección real de Vercel, por ejemplo `https://skytour.vercel.app`, sin barra final. Render reinicia el servicio.

Consecuencias de tener un solo origen permitido:

- Las vistas previas de Vercel (las direcciones de cada rama) no podrán iniciar sesión.
- Si añades un dominio propio, hay que actualizar `FRONTEND_URL`.

## 5. Primer administrador

La base de producción empieza sin usuarios. El primer administrador se crea con un script, desde tu equipo, apuntando a la base de producción:

```powershell
cd backend
# con el entorno virtual activo
$env:DATABASE_URL = "<cadena de la base de producción>"
python -m app.crear_admin --nombre "Tu Nombre" --correo tu@correo.com
Remove-Item Env:DATABASE_URL
```

El script pide la contraseña por teclado (mínimo 8 caracteres, con letras y números) y se niega a crear un correo que ya existe. Revisa dos veces a qué base apunta `DATABASE_URL` antes de ejecutarlo.

A partir de ahí, inicia sesión y crea al resto de personas desde la pantalla **Usuarios**. El administrador define una contraseña inicial y cada persona la cambia desde **Mi cuenta** (el nombre en la barra superior).

- Para una demostración con datos ficticios, usa una base aparte y `python -m app.seed`. No lo ejecutes sobre una base con datos reales.

## 6. Seguridad del inicio de sesión

- Cinco intentos fallidos seguidos con el mismo correo bloquean ese correo durante 15 minutos (respuesta 429). Un inicio de sesión correcto reinicia la cuenta.
- Si alguien queda bloqueado, el administrador puede desbloquearlo restableciéndole la contraseña desde Usuarios.
- El contador vive en la memoria del servidor: se borra al reiniciarse y solo es fiable con una instancia (el plan gratuito de Render). Con varias instancias habría que guardarlo en la base de datos.
- Los usuarios no se borran, se desactivan. Un usuario desactivado pierde el acceso de inmediato, aunque tenga una sesión abierta.

## 7. Comprobación final

- [ ] `/health` del backend responde `ok`.
- [ ] El administrador creado con el script inicia sesión.
- [ ] Desde Usuarios se crea un evaluador y un consultor, y ambos inician sesión y ven solo lo que su rol permite.
- [ ] Un evaluador no ve el menú Usuarios y, si escribe `/usuarios` en la barra, recibe «sin permiso».
- [ ] Desde Mi cuenta se cambia la contraseña y la nueva funciona al volver a entrar.
- [ ] Tras 5 contraseñas incorrectas, el inicio de sesión responde con el aviso de bloqueo.
- [ ] Recargar una pantalla interna, como `/comparador`, no da 404.
- [ ] Descargar el ranking en CSV y PDF funciona.
- [ ] Si hay clave de Gemini: la pestaña Riesgo IA y el botón de leer documentos responden.

## Cosas que conviene saber

- **Plan gratuito de Render:** el servicio se duerme tras 15 minutos sin tráfico y tarda cerca de un minuto en despertar. La primera petición después de una pausa puede fallar o tardar; la aplicación ya avisa de esto al usuario.
- **Archivos de documentos:** se guardan dentro de la base de datos (hasta 5 MB cada uno). Revisa el límite de almacenamiento de tu plan en Neon.
- **Cambiar `SECRET_KEY`:** cierra todas las sesiones abiertas. Hazlo si sospechas que se filtró.
- **Versión de Python:** si no la fijas, Render usa la más reciente para servicios nuevos y las dependencias podrían no estar probadas con ella.
- **Pruebas:** el backend se prueba con `pytest` sin tocar la base de datos. Las pruebas del frontend están pendientes.
