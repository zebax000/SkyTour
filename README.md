# SkyTour

Aplicación web para registrar, clasificar, evaluar y hacer seguimiento a proveedores turísticos (hoteles, aerolíneas, transportadores, guías y más). Incluye control de documentos y vigencias, evaluaciones, incidentes, comparador y un puntaje de riesgo con IA que explica sus factores.

Estado: el MVP funciona completo en local. La publicación en línea está explicada en [docs/Despliegue.md](docs/Despliegue.md).

## Qué hace

- Registro y clasificación de proveedores por tipo
- Servicios, tarifas y zonas de cobertura
- Documentos con semáforo de vigencias (vigente, por vencer, vencido) y lectura de archivos con IA
- Evaluaciones de 1 a 5, incidentes, incumplimientos y observaciones
- Riesgo de 0 a 100 (bajo, medio, alto) con explicación de factores
- Lista de atención, comparador de 2 a 4 proveedores, ranking con descarga en CSV y PDF, y Dashboard
- Tres roles: administrador, evaluador y consultor
- Administración de usuarios para el administrador: altas, cambio de rol, desactivación y restablecimiento de contraseña. Cada persona cambia la suya desde Mi cuenta
- Inicio de sesión protegido: cinco intentos fallidos bloquean el correo durante 15 minutos

## MVP

El trabajo se organiza en sprints. El Sprint 1 es el primer incremento y el MVP se completa al terminar el Sprint 3. El backlog se gestiona en Jira.

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | TypeScript, React y Vite |
| Backend | Python 3, FastAPI, SQLAlchemy y Pydantic |
| Base de datos | PostgreSQL (Neon) |
| IA | Gemini, con respaldo por reglas si no hay clave |
| Pruebas | pytest en el backend (las pruebas del frontend con Vitest están pendientes) |
| Despliegue | Vercel (frontend) y Render (backend) |
| Gestión | Git, GitHub, Jira y Figma |

## Estructura del repositorio

```
backend/    API, base de datos (modelos, migraciones y datos iniciales), motor de riesgo y pruebas
frontend/   Interfaz (React)
docs/       Especificación, tablas, USM, diagrama y guía de despliegue
render.yaml Configuración del backend en Render
```

## Cómo empezar

Necesitas Python 3, Node.js y una base PostgreSQL en [Neon](https://neon.tech). Usa una base de pruebas, no una con datos reales.

### 1. Variables de entorno

Copia `.env.example` a `.env` en la raíz del repositorio y completa los valores. Como mínimo `DATABASE_URL` y `SECRET_KEY`. El archivo `.env` nunca se sube.

### 2. Backend

```
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS o Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

- `alembic upgrade head` crea las tablas.
- `python -m app.seed` carga datos ficticios y tres usuarios de demostración (uno por rol) con la contraseña de `SEED_PASSWORD`. Los correos están en `backend/app/seed.py`. No lo ejecutes contra una base con datos reales.
- Para crear tu propio administrador en una base vacía: `python -m app.crear_admin --nombre "Tu Nombre" --correo tu@correo.com`. Pide la contraseña por teclado.
- La API queda en http://localhost:8000. Comprueba que responde en http://localhost:8000/health.

### 3. Frontend

```
cd frontend
npm install
npm run dev
```

La aplicación abre en http://localhost:5173 y por defecto habla con http://localhost:8000. Para apuntar a otra API, crea `frontend/.env` con `VITE_API_URL=` y la dirección.

### Pruebas y revisiones

- Backend: `pytest` dentro de `backend/`. No necesita base de datos.
- Backend: `ruff check .` dentro de `backend/`.
- Frontend: `npm run lint` y `npm run build` dentro de `frontend/`.

## Despliegue

El backend va en Render y el frontend en Vercel, sobre la base de Neon. Los pasos, las variables y las comprobaciones están en [docs/Despliegue.md](docs/Despliegue.md).

## Documentación

Todo está en la carpeta `docs/`. Lee primero la especificación del MVP.

## Cómo trabajamos

Las reglas de ramas, commits y Pull Requests están en `CONTRIBUTING.md`.
