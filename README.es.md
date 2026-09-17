# KauaArtx Video Studio

[English](README.md) · [Português](README.pt-BR.md) · **Español**

El sistema de producción del canal [@KauaArtx](https://www.youtube.com/@KauaArtx). Lleva una idea hasta el vídeo publicado a través de un flujo de ocho etapas, manteniendo el guion, las decisiones y el progreso en un mismo lugar.

[Abrir la aplicación](https://sistema-videos.vercel.app) · Requiere autenticación

---

## Por qué existe

Un tablero de tareas genérico no entiende la producción de vídeo: sabe que existe una tarea llamada «grabar», pero no que grabar es recorrer los mismos fragmentos que escribiste y que después se editarán uno a uno. Aquí el guion es la columna vertebral del sistema, no un anexo.

## El flujo

```text
Idea → Guion → Grabación → Edición → Miniatura y Título → Revisión → Programado → Publicado
```

Cada etapa tiene su propio espacio de trabajo con los campos que corresponden allí — gancho y referencias en Idea, opciones de título en la etapa de Título, aprendizajes una vez publicado — en lugar de un formulario genérico repetido ocho veces.

## El bloque de guion es la columna vertebral

El vídeo se divide en bloques de tiempo («0–30s: digo tal cosa»). **Siempre es el mismo bloque cambiando de estado**: nace en Guion, se vuelve un elemento en Grabación y una tarea en Edición. No son tres listas separadas que haya que mantener sincronizadas mentalmente.

De ahí salen dos funciones:

- **Línea de tiempo continua.** Cada bloque empieza donde termina el anterior. Si mueves el final de uno, el siguiente lo acompaña y todos los de abajo se desplazan conservando su propia duración. Un bloque nunca se reduce a cero ni corre hacia atrás.
- **Modo lectura.** Un bloque a la vez en letra grande, a pantalla completa, con el tiempo previsto de ese fragmento y un cronómetro que se pone ámbar cuando lo superas. Las flechas pasan de bloque, `P` arranca el cronómetro y `Esc` cierra. Es lo que se usa al grabar.

## Otras capacidades

- Tablero Kanban con arrastrar y soltar entre las ocho etapas.
- Listas de verificación por etapa, editables y reordenables, guardadas por vídeo.
- Asistente editorial opcional para guion, títulos y conceptos de miniatura — con sugerencias locales deterministas cuando no hay modelo configurado, para no depender nunca de la IA.
- Exportación en JSON para copias de seguridad portátiles.
- Sistema de cuentas aprobadas que también atiende a las demás aplicaciones del ecosistema.

## Decisiones técnicas que merecen mención

- **Autorización comprobada en la base de datos, no en el cliente.** Las dieciocho operaciones de escritura pasan por una verificación que reduce la consulta al propietario del registro. Ningún miembro alcanza la fila de otro, y ninguna autorización confía en datos del navegador.
- **Row Level Security de verdad**, que cubre las cinco tablas de cuentas en vez de ser decorativa.
- **Contraseñas nunca reversibles.** Hash con scrypt y sal por cuenta, comparación en tiempo constante y límite de intentos.
- **La credencial de IA se queda en el servidor.** El endpoint valida la sesión, limita el tamaño de la petición y pone un tope de generaciones por hora.
- **Migraciones aplicadas por CI.** El despliegue de Vercel no ejecuta migraciones; un flujo dedicado aplica lo pendiente cuando cambia el esquema, para que el código nuevo nunca encuentre una base antigua.

## Tecnologías

Next.js 16, React 19, TypeScript, Prisma, PostgreSQL/Supabase, dnd-kit y Vercel.

## Desarrollo local

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd run db:deploy
npm.cmd run dev
```

Variables de entorno:

| Variable | Para qué sirve |
| --- | --- |
| `DATABASE_URL` | Conexión de la aplicación, por el pooler |
| `DIRECT_URL` | Conexión directa, usada por las migraciones |
| `APP_PASSWORD` | Contraseña del propietario |
| `AUTH_SECRET` | Secreto aleatorio que firma las cookies de sesión |
| `LLM_BASE_URL` | Endpoint compatible con OpenAI (opcional) |
| `LLM_MODEL` | Identificador del modelo (opcional) |
| `LLM_API_KEY` | Credencial del proveedor — nunca expuesta al navegador |

Nunca subas un `.env` real. La aplicación falla cerrada cuando faltan los secretos de autenticación.

## Verificación

```powershell
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd audit --omit=dev
```

## Mapa del repositorio

```text
prisma/            Esquema, migraciones y datos de siembra
src/actions/       Mutaciones autenticadas en el servidor
src/app/           Rutas, endpoints y páginas
src/components/    Tablero y espacio de trabajo del vídeo
src/lib/           Autenticación, base de datos, línea de tiempo y reglas del flujo
tests/             Pruebas de autenticación y de la línea de tiempo
```

## Estado

Herramienta en uso real por un creador. No es un SaaS multiempresa, y la IA externa es opcional, no una dependencia de ejecución.

Creado y mantenido por [Kauã Diniz Souza](https://github.com/Kauadsouza).
