# Guía de contribución

Usamos GitHub Flow: una rama principal siempre funcional y ramas cortas para cada cambio.

## Flujo de trabajo

1. Actualiza main con `git checkout main` y `git pull`.
2. Crea una rama con `git checkout -b feat/nombre-corto`.
3. Haz commits pequeños con mensajes claros.
4. Sube la rama y abre un Pull Request hacia main.
5. Pide la revisión de al menos un compañero.
6. Une con Squash and merge y borra la rama.

## Antes de abrir un Pull Request

No hay revisiones automáticas, así que cada persona comprueba esto a mano:

- Mi rama está actualizada con main.
- Las pruebas pasan (`pytest` en el backend y las pruebas de Vitest en el frontend).
- El código está formateado (`ruff` en Python y Prettier en el frontend).
- No subí `.env` ni claves.
- El Pull Request menciona la historia de Jira que resuelve, por ejemplo HU-07.

## Nombres de ramas

- `feat/` para funcionalidades nuevas, por ejemplo `feat/login`
- `fix/` para corregir errores, por ejemplo `fix/semaforo-vigencias`
- `docs/` para documentación
- `test/` para pruebas

## Mensajes de commit

Escribe en español, en presente y de forma breve, con el prefijo del tipo. Ejemplo: `feat: agrega login con roles`.

## Reglas de archivos

- Nunca subas `.env`, claves ni cadenas de conexión.
- Trabaja dentro de la carpeta de tu bloque siempre que puedas.
- Si vas a tocar un archivo de otro bloque, avísale a su responsable.
- Los documentos y el logo van en `docs/`.

## Bloques de trabajo (propuesta por confirmar)

- Base de datos: Sebastian y Thomas
- Backend: Thomas y Andrés
- Frontend: Allison y Nicolas
- IA de riesgo: Sebastian y Nicolas
- Pruebas: Sebastian coordina y cada persona prueba lo que escribe

## Tareas

El trabajo se reparte en Jira, una tarea por historia de usuario.
