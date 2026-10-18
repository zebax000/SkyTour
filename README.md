# SkyTour

Aplicación web para registrar, clasificar, evaluar y hacer seguimiento a proveedores turísticos (hoteles, aerolíneas, transportadores, guías y más). Incluye control de documentos y vigencias, evaluaciones, incidentes, comparador y un puntaje de riesgo con IA que explica sus factores.

## Qué hace

- Registro y clasificación de proveedores por tipo
- Servicios, tarifas y zonas de cobertura
- Documentos con semáforo de vigencias (vigente, por vencer, vencido)
- Evaluaciones de 1 a 5, incidentes, incumplimientos y observaciones
- Riesgo de 0 a 100 (bajo, medio, alto) con explicación de factores
- Lista de atención, comparador, ranking y Dashboard
- Tres roles: administrador, evaluador y consultor

## MVP

El trabajo se organiza en sprints. El Sprint 1 es el primer incremento y el MVP se completa al terminar el Sprint 3. El backlog se gestiona en Jira.

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | TypeScript, React y Vite |
| Backend | Python 3, FastAPI, SQLAlchemy y Pydantic |
| Base de datos | PostgreSQL (Neon) |
| Pruebas | pytest y Vitest |
| Gestión | Git, GitHub, Jira y Figma |

## Estructura del repositorio

```
backend/   API y motor de riesgo (Python)
frontend/  Interfaz (React)
db/        Migraciones y datos de demostración
docs/      Especificación, tablas, USM y branding
.github/   Plantillas de Pull Request e Issues
```

## Cómo empezar

1. Clona el repositorio.
2. Copia `.env.example` a `.env` y completa tus valores. El archivo `.env` nunca se sube.
3. Las instrucciones para ejecutar el backend y el frontend se agregarán cuando exista el código del MVP.

## Documentación

Todo está en la carpeta `docs/`. Lee primero la especificación del MVP.

## Cómo trabajamos

Las reglas de ramas, commits y Pull Requests están en `CONTRIBUTING.md`.
