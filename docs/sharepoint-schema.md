# Esquema de SharePoint — Gestión de Trabajo

## Reglas

- `AppId` es el UUID estable del dominio; el `ID` nativo sólo identifica la fila.
- Las relaciones usan UUID en texto indexado. No se usan `Lookup`, para facilitar filtros, aprovisionamiento y traslado entre tenants.
- SharePoint ya crea `ID`, `Title`, `Created`, `Modified`, `Author` y `Editor`; no se duplican.
- `Title` guarda el nombre de entidades y una etiqueta generada en filas relacionales.
- Toda columna única también está indexada. O/U/I significan obligatoria/única/indexada.
- Los nombres de usuario y área que hoy contienen las interfaces se derivarán de sus UUID al mapear.

Tipos: `Text` (una línea), `Note` (varias líneas), `Bool`, `Number`, `Date`, `DateTime`, `Choice`.

## Listas y columnas exactas

Cada fila tiene: `Visible | Interno | Tipo | O | U | I | TypeScript/regla`.

### `CW_Projects` — existente y protegida

| Visible | Interno | Tipo | O | U | I | TypeScript/regla |
|---|---|---|:--:|:--:|:--:|---|
| Título | `Title` | Text | Sí | No | No | `Project.name` |
| ID de aplicación | `AppId` | Text | Sí | Sí | Sí | `Project.id` |
| ID de cliente | `ClientId` | Text | Sí | No | Sí | `Project.clientId` → cliente |
| Color | `ColorHex` | Text | Sí | No | No | `Project.color`, `#RRGGBB` |
| Área principal | `PrimaryArea` | Text | Sí | No | Sí | `Project.area` |
| Activo | `IsActive` | Bool | Sí | No | Sí | `Project.active`; predeterminado `Sí` |

`Project.areas` se deriva de `CW_Areas`. Como la lista está vacía, el aprovisionador admite exclusivamente dos correcciones no destructivas sobre columnas existentes: hacer obligatorio `Title`, y hacer obligatorio `IsActive` con valor predeterminado `Sí`. No recrea columnas ni la lista; cualquier otra diferencia queda sólo como advertencia.

### `CW_Clients`

| Visible | Interno | Tipo | O | U | I | TypeScript/regla |
|---|---|---|:--:|:--:|:--:|---|
| Título | `Title` | Text | Sí | No | No | `Client.name` |
| ID de aplicación | `AppId` | Text | Sí | Sí | Sí | `Client.id` |

### `CW_Areas`

| Visible | Interno | Tipo | O | U | I | TypeScript/regla |
|---|---|---|:--:|:--:|:--:|---|
| Título | `Title` | Text | Sí | No | No | elemento de `Project.areas` |
| ID de aplicación | `AppId` | Text | Sí | Sí | Sí | UUID del área |
| ID de proyecto | `ProjectId` | Text | Sí | No | Sí | → `Project.id` |
| Activa | `IsActive` | Bool | Sí | No | Sí | inclusión en `Project.areas`; predeterminado `Sí` |

### `CW_Initiatives`

| Visible | Interno | Tipo | O | U | I | TypeScript/regla |
|---|---|---|:--:|:--:|:--:|---|
| Título | `Title` | Text | Sí | No | No | `Initiative.name` |
| ID de aplicación | `AppId` | Text | Sí | Sí | Sí | `id` |
| ID de proyecto | `ProjectId` | Text | Sí | No | Sí | `projectId` |
| ID de área | `AreaId` | Text | Sí | No | Sí | `area`, nombre derivado |
| Descripción | `Description` | Note | No | No | No | `description` |
| Criterio de éxito | `SuccessCriteria` | Note | No | No | No | `successCriteria` |
| Estado | `Status` | Choice | Sí | No | Sí | estados comunes¹ |
| ID de responsable | `OwnerUserId` | Text | Sí | No | Sí | `owner`, nombre derivado |
| Inicio | `StartDate` | Date | Sí | No | No | `startDate` |
| Fecha límite | `Deadline` | Date | Sí | No | Sí | `deadline` |
| Impacto | `Impact` | Choice | Sí | No | Sí | `Alto`, `Medio`, `Bajo` |

### `CW_Versions`

| Visible | Interno | Tipo | O | U | I | TypeScript/regla |
|---|---|---|:--:|:--:|:--:|---|
| Título | `Title` | Text | Sí | No | No | `DeliverableVersion.name` |
| ID de aplicación | `AppId` | Text | Sí | Sí | Sí | `id` |
| ID de iniciativa | `InitiativeId` | Text | Sí | No | Sí | `initiativeId` |
| Código | `Code` | Text | Sí | No | No | `code`; único por iniciativa en aplicación |
| Estado | `Status` | Choice | Sí | No | Sí | estados comunes¹ |
| ID de responsable | `OwnerUserId` | Text | Sí | No | Sí | `owner`, nombre derivado |
| Inicio | `StartDate` | Date | Sí | No | No | `startDate` |
| Fecha límite | `Deadline` | Date | Sí | No | Sí | `deadline` |

`taskIds` se deriva de `CW_Tasks.VersionId`.

### `CW_Tasks`

| Visible | Interno | Tipo | O | U | I | TypeScript/regla |
|---|---|---|:--:|:--:|:--:|---|
| Título | `Title` | Text | Sí | No | No | `Task.title` |
| ID de aplicación | `AppId` | Text | Sí | Sí | Sí | `id` |
| ID de proyecto | `ProjectId` | Text | Sí | No | Sí | `projectId` |
| ID de iniciativa | `InitiativeId` | Text | Sí | No | Sí | `initiativeId` |
| ID de versión | `VersionId` | Text | Sí | No | Sí | `versionId` |
| Descripción | `Description` | Note | No | No | No | `description` |
| Prioridad | `Priority` | Choice | Sí | No | Sí | `Alta`, `Media`, `Baja` |
| Estado | `Status` | Choice | Sí | No | Sí | estados comunes¹ |
| Fecha límite | `Deadline` | Date | Sí | No | Sí | `deadline` |
| Minutos estimados | `EstimatedMinutes` | Number | Sí | No | No | `estimatedMinutes` |
| Divisible | `IsSplittable` | Bool | Sí | No | No | `splittable` |
| Avance | `Progress` | Number | Sí | No | No | `progress`, 0–100 validado en aplicación |
| ID de responsable | `AssignedUserId` | Text | Sí | No | Sí | `assignedTo`, nombre derivado |

### `CW_Subtasks`

| Visible | Interno | Tipo | O | U | I | TypeScript/regla |
|---|---|---|:--:|:--:|:--:|---|
| Título | `Title` | Text | Sí | No | No | `Subtask.title` |
| ID de aplicación | `AppId` | Text | Sí | Sí | Sí | `id` |
| ID de tarea | `TaskId` | Text | Sí | No | Sí | → `Task.id` |
| Completada | `IsCompleted` | Bool | Sí | No | Sí | `completed` |
| ID de responsable | `AssignedUserId` | Text | Sí | No | Sí | `assignedTo`, nombre derivado |
| Completada en | `CompletedAt` | DateTime | No | No | No | `completedAt` |

### `CW_TaskDependencies`

| Visible | Interno | Tipo | O | U | I | TypeScript/regla |
|---|---|---|:--:|:--:|:--:|---|
| Título | `Title` | Text | Sí | No | No | generado `TaskId → DependsOnTaskId` |
| ID de aplicación | `AppId` | Text | Sí | Sí | Sí | UUID de relación |
| ID de tarea | `TaskId` | Text | Sí | No | Sí | → `Task.id` |
| Depende de tarea | `DependsOnTaskId` | Text | Sí | No | Sí | elemento de `Task.dependencies` |

La combinación `TaskId + DependsOnTaskId` es única en la aplicación.

### `CW_ScheduleBlocks`

| Visible | Interno | Tipo | O | U | I | TypeScript/regla |
|---|---|---|:--:|:--:|:--:|---|
| Título | `Title` | Text | Sí | No | No | generado con fecha y tarea |
| ID de aplicación | `AppId` | Text | Sí | Sí | Sí | `ScheduleBlock.id` |
| ID de usuario | `UserId` | Text | Sí | No | Sí | contexto del usuario actual |
| ID de tarea | `TaskId` | Text | Sí | No | Sí | `taskId` |
| Fecha | `PlanDate` | Date | Sí | No | Sí | `date` |
| Hora de inicio | `StartTime` | Text | No | No | No | `startTime` |
| Hora de fin | `EndTime` | Text | No | No | No | `endTime` |
| Origen | `Source` | Choice | Sí | No | No | `manual`, `suggested` |
| Resultado del día | `Outcome` | Choice | Sí | No | Sí | `ScheduleBlock.outcome`; `planned`, `advanced`; predeterminado `planned` |
| Completada | `IsCompleted` | Bool | Sí | No | Sí | `ScheduleBlock.completed`; predeterminado `No` |
| Completada en | `CompletedAt` | DateTime | No | No | No | `ScheduleBlock.completedAt` |

`Outcome` sí contiene información propia: distingue un bloque simplemente planificado de uno en el que hubo avance sin terminar la tarea. La opción `completed` no se almacena allí porque duplicaría `IsCompleted`. Al mapear desde el tipo actual, `outcome === "completed"` se normaliza como `IsCompleted = true`; al leer, `IsCompleted = true` puede exponerse como `outcome: "completed"` para conservar compatibilidad. `CompletedAt` registra el instante de finalización.

### `CW_WorkPreferences`

| Visible | Interno | Tipo | O | U | I | TypeScript/regla |
|---|---|---|:--:|:--:|:--:|---|
| Título | `Title` | Text | Sí | No | No | generado con usuario |
| ID de aplicación | `AppId` | Text | Sí | Sí | Sí | UUID de configuración |
| ID de usuario | `UserId` | Text | Sí | Sí | Sí | contexto del usuario actual |
| Inicio de jornada | `DayStart` | Text | Sí | No | No | `dayStart` |
| Fin de jornada | `DayEnd` | Text | Sí | No | No | `dayEnd` |
| Días laborables | `WorkingDays` | Text | Sí | No | No | `workingDays[]` como CSV numérico |
| Minutos de foco | `FocusBlockMinutes` | Number | Sí | No | No | `focusBlockMinutes` |

### `CW_Users`

| Visible | Interno | Tipo | O | U | I | TypeScript/regla |
|---|---|---|:--:|:--:|:--:|---|
| Título | `Title` | Text | Sí | No | No | `User.name` |
| ID de aplicación | `AppId` | Text | Sí | Sí | Sí | `id` |
| Objeto Entra | `EntraObjectId` | Text | No | Sí | Sí | identidad futura |
| Correo | `Email` | Text | Sí | Sí | Sí | `email` |
| Iniciales | `Initials` | Text | Sí | No | No | `initials` |
| Rol | `Role` | Choice | Sí | No | Sí | `admin`, `consultor` |
| Gestiona usuarios | `ManageUsers` | Bool | Sí | No | No | `permissions.manageUsers` |
| Gestiona proyectos | `ManageProjects` | Bool | Sí | No | No | `permissions.manageProjects` |
| Gestiona agenda | `ManageSchedule` | Bool | Sí | No | No | `permissions.manageSchedule` |
| Activo | `IsActive` | Bool | Sí | No | Sí | `active` |

### `CW_ProjectMembers`

| Visible | Interno | Tipo | O | U | I | TypeScript/regla |
|---|---|---|:--:|:--:|:--:|---|
| Título | `Title` | Text | Sí | No | No | generado usuario + proyecto |
| ID de aplicación | `AppId` | Text | Sí | Sí | Sí | UUID de relación |
| ID de proyecto | `ProjectId` | Text | Sí | No | Sí | elemento de `assignedProjectIds` |
| ID de usuario | `UserId` | Text | Sí | No | Sí | → `User.id` |
| Nivel de acceso | `AccessLevel` | Choice | Sí | No | Sí | `view`, `edit`, `admin`; deriva `editableProjectIds` |

`ProjectId + UserId` es único en aplicación. Estas dos listas adicionales reflejan perfiles, permisos y asignaciones que ya existen. No se agrega auditoría porque la app no implementa ese módulo.

¹ Estados comunes: `Pendiente`, `En curso`, `En revisión`, `Completada`, `Retrasada`.

## Datos derivados que no se almacenan

- `Project.areas`, `Initiative.versionIds`, `DeliverableVersion.taskIds`.
- `Task.dependencies`, `Task.subtasks` y los proyectos asignados/editables de `User`.
- Avances agregados de versión, iniciativa y proyecto.
- Ningún campo mutable que deba sobrevivir al refresco se clasifica como calculado. En particular, `ScheduleBlock.completed`, `completedAt` y el avance diario se persisten.

## Aprovisionamiento

El catálogo ejecutable está en `src/services/sharepoint/schema.ts`. El script pagina listas/columnas, compara nombre interno, tipo, O/U/I, valor predeterminado y elecciones. En `--dry-run` sólo efectúa token + `GET`. En `--apply` crea faltantes y sólo corrige propiedades seguras. `CW_Projects` permite únicamente las dos correcciones explícitas descritas arriba. Nunca borra, recrea, renombra ni cambia tipos.

```powershell
npm.cmd run --silent sharepoint:provision -- --dry-run
# únicamente tras autorización expresa:
npm.cmd run --silent sharepoint:provision -- --apply
```

## Índices, límites y migración

- Consultar por UUID, estado y fecha indexados; seguir siempre `@odata.nextLink` y usar `$select`.
- Evitar cargar el workspace entero y diseñar filtros para el umbral de vista de 5.000 elementos.
- En CRUD futuro usar `eTag`; para `429/503`, respetar `Retry-After`.
- Orden: clientes/usuarios/proyectos → áreas/membresías → iniciativas/versiones → tareas/subtareas/dependencias → preferencias/agenda → validación → cambio gradual de proveedor.

Hasta entonces `DATA_PROVIDER=local`, `use-app.tsx`, mocks, sesión y `localDataStore` conservan `localStorage` sin cambios.
