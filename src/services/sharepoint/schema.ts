export type SharePointColumnKind = "text" | "multilineText" | "boolean" | "number" | "date" | "dateTime" | "choice";

export interface SharePointColumnSchema {
  displayName: string;
  internalName: string;
  kind: SharePointColumnKind;
  required: boolean;
  unique: boolean;
  indexed: boolean;
  typeScript: string;
  choices?: readonly string[];
  calculated?: string;
  defaultValue?: string;
}

export interface SharePointListSchema {
  name: string;
  description: string;
  protected?: boolean;
  columns: readonly SharePointColumnSchema[];
}

const title = (typeScript: string, calculated?: string): SharePointColumnSchema => ({
  displayName: "Título", internalName: "Title", kind: "text", required: true,
  unique: false, indexed: false, typeScript, calculated,
});
const appId = (): SharePointColumnSchema => ({
  displayName: "ID de aplicación", internalName: "AppId", kind: "text", required: true,
  unique: true, indexed: true, typeScript: "id",
});
const text = (displayName: string, internalName: string, typeScript: string, required = true, indexed = false): SharePointColumnSchema =>
  ({ displayName, internalName, kind: "text", required, unique: false, indexed, typeScript });
const multi = (displayName: string, internalName: string, typeScript: string): SharePointColumnSchema =>
  ({ displayName, internalName, kind: "multilineText", required: false, unique: false, indexed: false, typeScript });
const bool = (displayName: string, internalName: string, typeScript: string, indexed = false, defaultValue = "false"): SharePointColumnSchema =>
  ({ displayName, internalName, kind: "boolean", required: true, unique: false, indexed, typeScript, defaultValue });
const number = (displayName: string, internalName: string, typeScript: string): SharePointColumnSchema =>
  ({ displayName, internalName, kind: "number", required: true, unique: false, indexed: false, typeScript });
const date = (displayName: string, internalName: string, typeScript: string, indexed = false, required = true): SharePointColumnSchema =>
  ({ displayName, internalName, kind: "date", required, unique: false, indexed, typeScript });
const dateTime = (displayName: string, internalName: string, typeScript: string, required = false): SharePointColumnSchema =>
  ({ displayName, internalName, kind: "dateTime", required, unique: false, indexed: false, typeScript });
const choice = (displayName: string, internalName: string, typeScript: string, choices: readonly string[], indexed = false, defaultValue?: string): SharePointColumnSchema =>
  ({ displayName, internalName, kind: "choice", required: true, unique: false, indexed, typeScript, choices, defaultValue });

const statuses = ["Pendiente", "En curso", "En revisión", "Completada", "Retrasada"] as const;
const priorities = ["Alta", "Media", "Baja"] as const;

export const sharePointSchema: readonly SharePointListSchema[] = [
  { name: "CW_Projects", description: "Proyectos de Gestión de Trabajo", protected: true, columns: [
    title("Project.name"), appId(), text("ID de cliente", "ClientId", "Project.clientId", true, true),
    text("Color", "ColorHex", "Project.color"), text("Área principal", "PrimaryArea", "Project.area", true, true),
    bool("Activo", "IsActive", "Project.active", true, "true"),
  ]},
  { name: "CW_Clients", description: "Clientes", columns: [title("Client.name"), appId()] },
  { name: "CW_Areas", description: "Áreas por proyecto", columns: [title("Project.areas[]"), appId(), text("ID de proyecto", "ProjectId", "Project.id", true, true), bool("Activa", "IsActive", "Project.areas[]", true, "true")] },
  { name: "CW_Initiatives", description: "Iniciativas", columns: [title("Initiative.name"), appId(), text("ID de proyecto", "ProjectId", "Initiative.projectId", true, true), text("ID de área", "AreaId", "Initiative.area (nombre derivado)", true, true), multi("Descripción", "Description", "Initiative.description"), multi("Criterio de éxito", "SuccessCriteria", "Initiative.successCriteria"), choice("Estado", "Status", "Initiative.status", statuses, true), text("ID de responsable", "OwnerUserId", "Initiative.owner (nombre derivado)", true, true), date("Inicio", "StartDate", "Initiative.startDate"), date("Fecha límite", "Deadline", "Initiative.deadline", true), choice("Impacto", "Impact", "Initiative.impact", ["Alto", "Medio", "Bajo"], true)] },
  { name: "CW_Versions", description: "Versiones entregables", columns: [title("DeliverableVersion.name"), appId(), text("ID de iniciativa", "InitiativeId", "DeliverableVersion.initiativeId", true, true), text("Código", "Code", "DeliverableVersion.code"), choice("Estado", "Status", "DeliverableVersion.status", statuses, true), text("ID de responsable", "OwnerUserId", "DeliverableVersion.owner (nombre derivado)", true, true), date("Inicio", "StartDate", "DeliverableVersion.startDate"), date("Fecha límite", "Deadline", "DeliverableVersion.deadline", true)] },
  { name: "CW_Tasks", description: "Tareas", columns: [title("Task.title"), appId(), text("ID de proyecto", "ProjectId", "Task.projectId", true, true), text("ID de iniciativa", "InitiativeId", "Task.initiativeId", true, true), text("ID de versión", "VersionId", "Task.versionId", true, true), multi("Descripción", "Description", "Task.description"), choice("Prioridad", "Priority", "Task.priority", priorities, true), choice("Estado", "Status", "Task.status", statuses, true), date("Fecha límite", "Deadline", "Task.deadline", true), number("Minutos estimados", "EstimatedMinutes", "Task.estimatedMinutes"), bool("Divisible", "IsSplittable", "Task.splittable"), number("Avance", "Progress", "Task.progress"), text("ID de responsable", "AssignedUserId", "Task.assignedTo (nombre derivado)", true, true)] },
  { name: "CW_Subtasks", description: "Subtareas", columns: [title("Subtask.title"), appId(), text("ID de tarea", "TaskId", "Task.id", true, true), bool("Completada", "IsCompleted", "Subtask.completed", true), text("ID de responsable", "AssignedUserId", "Subtask.assignedTo (nombre derivado)", true, true), dateTime("Completada en", "CompletedAt", "Subtask.completedAt")] },
  { name: "CW_TaskDependencies", description: "Dependencias entre tareas", columns: [title("generado: TaskId → DependsOnTaskId", "No pertenece al modelo de dominio"), appId(), text("ID de tarea", "TaskId", "Task.id", true, true), text("Depende de tarea", "DependsOnTaskId", "Task.dependencies[]", true, true)] },
  { name: "CW_ScheduleBlocks", description: "Bloques de agenda personal", columns: [title("generado: fecha + tarea", "No pertenece al modelo de dominio"), appId(), text("ID de usuario", "UserId", "contexto del usuario actual", true, true), text("ID de tarea", "TaskId", "ScheduleBlock.taskId", true, true), date("Fecha", "PlanDate", "ScheduleBlock.date", true), text("Hora de inicio", "StartTime", "ScheduleBlock.startTime", false), text("Hora de fin", "EndTime", "ScheduleBlock.endTime", false), choice("Origen", "Source", "ScheduleBlock.source", ["manual", "suggested"]), choice("Resultado del día", "Outcome", "ScheduleBlock.outcome (planned | advanced; completed se normaliza con IsCompleted)", ["planned", "advanced"], true, "planned"), bool("Completada", "IsCompleted", "ScheduleBlock.completed", true, "false"), dateTime("Completada en", "CompletedAt", "ScheduleBlock.completedAt")] },
  { name: "CW_WorkPreferences", description: "Preferencias personales de trabajo", columns: [title("generado: usuario", "No pertenece al modelo de dominio"), appId(), { ...text("ID de usuario", "UserId", "contexto del usuario actual", true, true), unique: true }, text("Inicio de jornada", "DayStart", "WorkPreferences.dayStart"), text("Fin de jornada", "DayEnd", "WorkPreferences.dayEnd"), text("Días laborables", "WorkingDays", "WorkPreferences.workingDays[]"), number("Minutos de foco", "FocusBlockMinutes", "WorkPreferences.focusBlockMinutes")] },
  { name: "CW_Users", description: "Perfiles y permisos funcionales", columns: [title("User.name"), appId(), { ...text("Objeto Entra", "EntraObjectId", "identidad de autenticación futura", false, true), unique: true }, { ...text("Correo", "Email", "User.email", true, true), unique: true }, text("Iniciales", "Initials", "User.initials"), choice("Rol", "Role", "User.role", ["admin", "usuario"], true), bool("Gestiona usuarios", "ManageUsers", "User.permissions.manageUsers"), bool("Gestiona proyectos", "ManageProjects", "User.permissions.manageProjects"), bool("Gestiona agenda", "ManageSchedule", "User.permissions.manageSchedule"), bool("Activo", "IsActive", "User.active", true)] },
  { name: "CW_ProjectMembers", description: "Acceso de usuarios a proyectos", columns: [title("generado: usuario + proyecto", "No pertenece al modelo de dominio"), appId(), text("ID de proyecto", "ProjectId", "User.assignedProjectIds[]", true, true), text("ID de usuario", "UserId", "User.id", true, true), choice("Nivel de acceso", "AccessLevel", "User.editableProjectIds[] / role", ["view", "edit", "admin"], true)] },
] as const;
