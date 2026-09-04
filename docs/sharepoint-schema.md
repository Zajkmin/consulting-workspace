# Esquema de SharePoint para Gestión de Trabajo

## Estado actual

Esta etapa no se conecta con Microsoft Graph. El proveedor sigue siendo `local`, con mocks y `localStorage`.

El enlace compartido parece corresponder a `https://analytico835.sharepoint.com/sites/gestion-trabajo`. Esta URL base debe confirmarse antes de guardarla en `.env.local`; la URL larga de `SitePages/CollabHome.aspx` no debe usarse como `SHAREPOINT_SITE_URL`.

## Reglas de modelado

- Cada entidad tendrá un UUID estable en `AppId`.
- El `ID` numérico de SharePoint identifica la fila, pero no será una relación de dominio.
- Las relaciones entre listas guardarán UUID propios como texto indexado.
- Los nombres internos se crearán sin espacios ni tildes.
- No se duplicarán `ID`, `Created`, `Modified`, `Author` ni `Editor`.
- Las estadísticas calculadas no se almacenarán en proyectos.

## Lista `CW_Projects`

La columna nativa `Title` será el nombre visible del proyecto y corresponderá a `Project.name`.

| Nombre visible | Nombre interno | Tipo SharePoint | Obligatoria | Única | Indexada | Campo TypeScript | Regla |
|---|---|---|:---:|:---:|:---:|---|---|
| Título | `Title` | Una línea de texto | Sí | No | No | `name` | Máximo 255 caracteres |
| ID de aplicación | `AppId` | Una línea de texto | Sí | Sí | Sí | `id` | UUID canónico y no reutilizable |
| ID de cliente | `ClientId` | Una línea de texto | Sí | No | Sí | `clientId` | UUID de `CW_Clients.AppId` |
| Color | `ColorHex` | Una línea de texto | Sí | No | No | `color` | Formato `#RRGGBB` |
| Área principal | `PrimaryArea` | Una línea de texto | Sí | No | Sí | `area` | Debe coincidir con un área activa |
| Activo | `IsActive` | Sí/No | Sí | No | Sí | `active` | Sí = activo; No = archivado |

`Project.areas` se derivará de filas activas de `CW_Areas` cuyo `ProjectId` coincida con `CW_Projects.AppId`; no se duplicará como texto en `CW_Projects`.

```ts
const project: Project = {
  id: fields.AppId,
  clientId: fields.ClientId,
  name: fields.Title,
  color: fields.ColorHex,
  area: fields.PrimaryArea,
  areas: projectAreas.map((area) => area.name),
  active: fields.IsActive,
};
```

El `ID` nativo puede conservarse como metadata privada del repositorio para `PATCH` y `DELETE`, pero no reemplaza `Project.id`.

## Listas futuras preliminares

### `CW_Clients`

- `Title`: nombre; `AppId`: UUID único e indexado; `IsActive`: Sí/No indexado.

### `CW_Areas`

- `Title`, `AppId`, `ProjectId`, `IsActive`.
- Índices: `AppId`, `ProjectId`, `IsActive`.

### `CW_Initiatives`

- `Title`, `AppId`, `ProjectId`, `AreaId`, `Description`, `SuccessCriteria`, `Status`, `OwnerUserId`, `StartDate`, `Deadline`, `Impact`.
- `Status`: `Pendiente`, `En curso`, `En revisión`, `Completada`, `Retrasada`.
- `Impact`: `Alto`, `Medio`, `Bajo`.
- Índices: `AppId`, `ProjectId`, `AreaId`, `OwnerUserId`, `Status`, `Deadline`.

### `CW_Versions`

- `Title`, `AppId`, `InitiativeId`, `Code`, `Status`, `OwnerUserId`, `StartDate`, `Deadline`.
- Índices: `AppId`, `InitiativeId`, `OwnerUserId`, `Status`, `Deadline`.
- `taskIds` se deriva de `CW_Tasks.VersionId`.

### `CW_Tasks`

- `Title`, `AppId`, `ProjectId`, `InitiativeId`, `VersionId`, `Description`, `Priority`, `Status`, `Deadline`, `EstimatedMinutes`, `IsSplittable`, `Progress`, `AssignedUserId`.
- Índices: `AppId`, `ProjectId`, `InitiativeId`, `VersionId`, `AssignedUserId`, `Status`, `Deadline`.

### `CW_Subtasks`

- `Title`, `AppId`, `TaskId`, `IsCompleted`, `AssignedUserId`, `CompletedAt`.
- Índices: `AppId`, `TaskId`, `AssignedUserId`, `IsCompleted`.

### `CW_TaskDependencies`

- `Title`, `AppId`, `TaskId`, `DependsOnTaskId`.
- Índices: los tres UUID. La aplicación valida la unicidad de `TaskId + DependsOnTaskId`.

### `CW_DailyPlans`

- `Title`, `AppId`, `UserId`, `TaskId`, `PlanDate`, `Outcome`, `EstimatedMinutes`.
- `Outcome`: `planned`, `advanced`, `completed`.
- Índices: `AppId`, `UserId`, `TaskId`, `PlanDate`, `Outcome`.
- Unicidad lógica: `UserId + TaskId + PlanDate`.

### `CW_Users`

- `Title`, `AppId`, `EntraObjectId`, `Email`, `Initials`, `Role`, `IsActive`.
- Índices: `AppId`, `EntraObjectId`, `Email`, `Role`, `IsActive`.
- `EntraObjectId` y `Email` deben ser únicos.

### `CW_ProjectMembers`

- `Title`, `AppId`, `ProjectId`, `UserId`, `AccessLevel`.
- `AccessLevel`: `view`, `edit`, `admin`.
- Índices: `AppId`, `ProjectId`, `UserId`, `AccessLevel`.
- Unicidad lógica: `ProjectId + UserId`.

### `CW_ActivityLog`

- `Title`, `AppId`, `ActorUserId`, `EntityType`, `EntityId`, `Action`, `OccurredAt`, `DetailsJson`.
- Índices: `AppId`, `ActorUserId`, `EntityType`, `EntityId`, `OccurredAt`.

## Relaciones mediante UUID

```text
Client.AppId
  └─ Project.ClientId
       ├─ Area.ProjectId
       ├─ Initiative.ProjectId
       ├─ Task.ProjectId
       └─ ProjectMember.ProjectId

Initiative.AppId
  └─ Version.InitiativeId
       └─ Task.VersionId
            ├─ Subtask.TaskId
            ├─ DailyPlan.TaskId
            └─ TaskDependency.TaskId / DependsOnTaskId
```

Los UUID permiten trasladar datos entre tenants sin reconstruir claves numéricas de SharePoint.

## Índices, paginación y límites

- Crear índices antes de que las listas crezcan.
- Filtrar siempre por claves indexadas: `ProjectId`, `UserId`, `TaskId`, `Status` y fechas.
- Solicitar solo columnas necesarias con `$select`.
- Seguir `@odata.nextLink`; nunca asumir que una respuesta contiene todos los elementos.
- No cargar listas completas en cada navegación ni guardar todo el workspace en una sola operación.
- Aplicar escrituras por entidad y control de concurrencia mediante `eTag`.
- Para `429` y `503`, respetar `Retry-After` y usar reintentos limitados.
- Evitar permisos únicos por fila; la autorización funcional utilizará `CW_ProjectMembers` y una capa de servidor.
- Diseñar filtros para el umbral práctico de vistas de 5.000 elementos.

## Orden de migración

1. Confirmar URL base, `Site ID`, `List ID` y consentimiento de `Sites.Selected`.
2. Conectar lectura de `CW_Projects` y validar el mapeo.
3. Habilitar CRUD de proyectos con control de concurrencia.
4. Crear y migrar clientes y áreas.
5. Migrar usuarios y miembros de proyectos.
6. Migrar iniciativas y versiones.
7. Migrar tareas, subtareas y dependencias.
8. Migrar agenda diaria.
9. Agregar auditoría.
10. Retirar `localStorage` como fuente principal.

## Arquitectura preparada

- `WorkspaceRepository` y `ProjectRepository` son los contratos compartidos.
- `LocalRepository` conserva el acceso local.
- `SharePointRepository` es deliberadamente no operativo y falla de forma explícita mientras falten permisos y credenciales.
- `createConfiguredRepository()` selecciona mediante `DATA_PROVIDER` y deberá ejecutarse únicamente en servidor cuando se habilite Graph.
- `use-app.tsx` continúa usando `localDataStore` directamente para no cambiar el funcionamiento actual.

No hay llamadas HTTP, tokens, secretos, autenticación real, endpoints ni simulaciones de conexión.
