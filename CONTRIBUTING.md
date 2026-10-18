# Guía de contribución

Usamos GitHub Flow: una rama principal siempre funcional y ramas cortas para cada cambio.

## Flujo de trabajo

1. Actualiza main con `git checkout main` y `git pull`.
2. Crea una rama con `git checkout -b feat/nombre-corto`.
3. Haz commits pequeños con mensajes claros.
4. Sube la rama y abre un Pull Request hacia main.
5. Pide la revisión de al menos un compañero.
6. Une con Squash and merge y borra la rama.

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
- Antes de abrir un Pull Request, actualiza tu rama con main y prueba que todo funcione.

## Bloques de trabajo (propuesta por confirmar)

- Base de datos: Sebastian y Thomas
- Backend: Thomas y Andrés
- Frontend: Allison y Nicolas
- IA de riesgo: Sebastian y Nicolas
- Pruebas: todos prueban su bloque y una persona coordina

## Tareas

El trabajo se reparte en Jira. Cada rama y cada Pull Request debe mencionar el código de su historia, por ejemplo HU-07.
