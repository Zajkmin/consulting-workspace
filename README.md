# Gestión de consultoría

`consulting-workspace` es un frontend para organizar proyectos, iniciativas, versiones, tareas y agenda de una consultora. Está construido con Next.js, App Router, TypeScript y Tailwind CSS, utilizando datos simulados y persistencia local.

## Ejecutar localmente

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`. Para validar una entrega, ejecutar `npm run lint` y `npm run build`.

## Datos y servicios

Los componentes consumen el estado de la aplicación y no importan mocks directamente. La capa `src/services` expone `projectService`, `taskService` y `scheduleService`; actualmente resuelven datos locales de `src/data/mocks`. Los cambios se guardan mediante `services/storage.ts` en `localStorage`.

Para conectar Laravel se reemplazarán esos servicios por solicitudes HTTP a `NEXT_PUBLIC_API_URL`, conservando sus contratos TypeScript. La persistencia local se retirará o quedará limitada a preferencias del dispositivo. Esta versión no realiza llamadas a dicha URL.

Claude deberá integrarse posteriormente desde Laravel para no exponer credenciales y devolver propuestas de planificación mediante los mismos servicios.

## Acceso y permisos del prototipo

La pantalla `/login` simula una sesión local. Los usuarios de demostración utilizan la contraseña `consulting123`. Un consultor recibe únicamente los proyectos asignados; un administrador accede a todos y puede gestionar las asignaciones desde `/usuarios`.

Esta capa es únicamente visual y funcional. Al conectar Laravel, el backend deberá validar credenciales, emitir la sesión segura y aplicar la autorización en cada consulta; ocultar proyectos en React no sustituye los permisos del servidor.

## Flujo administrativo local

El administrador puede crear, editar, archivar o eliminar proyectos y áreas. Dentro de cada proyecto puede gestionar iniciativas, versiones y tareas desde la tabla maestra. El panel de usuarios permite conceder acceso de lectura o edición por proyecto y permisos separados para proyectos, agenda y usuarios. Todos estos cambios se guardan exclusivamente en `localStorage`.
