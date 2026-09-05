# Gestión de Trabajo

`consulting-workspace` es un frontend para organizar proyectos, iniciativas, versiones, tareas y agenda de una consultora. Está construido con Next.js, App Router, TypeScript y Tailwind CSS, utilizando datos simulados y persistencia local.

## Ejecutar localmente

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`. Para validar una entrega, ejecutar `npm run lint` y `npm run build`.

## Datos y servicios

Los componentes consumen el estado de la aplicación y no importan mocks directamente. La capa `src/services` expone `projectService`, `taskService` y `scheduleService`; actualmente resuelven datos locales de `src/data/mocks`. Los cambios se guardan mediante `services/storage.ts` en `localStorage`.

La arquitectura está preparada para incorporar SharePoint Online mediante Microsoft Graph. `WorkspaceRepository` y `ProjectRepository` definen contratos comunes; `LocalRepository` representa la implementación local y `SharePointRepository` es todavía un límite no operativo. La selección futura se realizará con `DATA_PROVIDER` desde código de servidor.

El esquema y el orden de migración están documentados en [`docs/sharepoint-schema.md`](docs/sharepoint-schema.md). Esta versión no realiza llamadas a Microsoft Graph, no contiene credenciales y continúa usando `localStorage`.

## Acceso y permisos del prototipo

La pantalla `/login` simula una sesión local. Los usuarios de demostración utilizan la contraseña `consulting123`. Un usuario recibe únicamente los proyectos asignados; un administrador accede a todos y puede gestionar las asignaciones desde `/usuarios`.

Esta capa es únicamente visual y funcional. Al habilitar Microsoft Entra y Graph, el servidor deberá validar la sesión y aplicar la autorización en cada consulta; ocultar proyectos en React no sustituye los permisos del servidor.

## Flujo administrativo local

El administrador puede crear, editar, archivar o eliminar proyectos y áreas. Dentro de cada proyecto puede gestionar iniciativas, versiones y tareas desde la tabla maestra. El panel de usuarios permite conceder acceso de lectura o edición por proyecto y permisos separados para proyectos, agenda y usuarios. Todos estos cambios se guardan exclusivamente en `localStorage`.
