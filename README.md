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

## Portal del Consultor · correcciones funcionales de Etapa 1

- Los responsables se muestran a partir del identificador del perfil y, para datos históricos, del identificador, correo o nombre guardado. La presentación de las subtareas incluye sus responsables distintos, sin cambiar asignaciones ni permisos.
- Inicio, Proyecto, Resumen y Gantt usan los mismos estados calculados de versión. Una versión validada o completada cuenta como completada. La revisión explícita, o derivada de tareas al 100 %, conserva prioridad sobre el atraso por fecha. Las categorías completada, en curso, en revisión, pendiente y atrasada son disjuntas. El indicador combinado del Gantt incluye en curso y en revisión.
- El avance promedia tareas por versión, versiones por iniciativa e iniciativas por proyecto. Las colecciones vacías tienen avance 0 % y no se rellenan con estimaciones según el estado. El Resumen abarca el proyecto completo y no presupone una semana.
- Un vencimiento válido anterior al día civil de Asunción marca una tarea abierta como atrasada en la presentación, excepto si está en revisión. Vencer hoy no significa estar atrasada. La fecha de Inicio y la semana de Agenda usan la misma zona horaria.
- Los formularios revisados conservan la entrada ante un error, esperan la respuesta antes de cerrar y muestran el aviso existente. Los cambios de Agenda se realizan en secuencia y conservan los guardados ya confirmados si falla una operación posterior.
- La preferencia de tema conserva la clave `consulting-theme`. El documento la aplica desde el inicio y sigue los cambios del sistema cuando está elegido Sistema. La paleta y el archivado de proyectos se mantienen.

Comprobaciones de la etapa: `npm run typecheck`, `npm run lint`, `npm run build` y `node --test src/lib/*.test.ts src/services/auth/*.test.ts` en una versión de Node con soporte para TypeScript. Las pruebas unitarias usan datos ficticios. Esta etapa no requiere SQL ni migraciones.
