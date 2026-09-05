export type Priority = "Alta" | "Media" | "Baja";
export type TaskStatus = "Pendiente" | "En curso" | "En revisión" | "Completada" | "Retrasada";
export type UserRole = "admin" | "consultor";
export interface UserPermissions { manageUsers:boolean; manageProjects:boolean; manageSchedule:boolean }
export interface User { id:string; name:string; email:string; initials:string; role:UserRole; assignedProjectIds:string[]; editableProjectIds?:string[]; permissions?:UserPermissions; active:boolean }
export interface Client { id: string; name: string }
export interface Project { id:string; clientId:string; name:string; color:string; area:string; areas?:string[]; active:boolean }
export interface Subtask { id: string; title: string; completed: boolean; assignedTo: string; completedAt?: string }
export interface Task { id:string; projectId:string; initiativeId:string; versionId:string; title:string; description:string; priority:Priority; status:TaskStatus; deadline:string; estimatedMinutes:number; splittable:boolean; progress:number; assignedTo:string; dependencies:string[]; subtasks:Subtask[] }
export interface DeliverableVersion { id:string; initiativeId:string; code:string; name:string; status:TaskStatus; owner:string; startDate:string; deadline:string; taskIds:string[] }
export interface Initiative { id:string; projectId:string; name:string; description?:string; successCriteria?:string; area:string; status:TaskStatus; owner:string; startDate:string; deadline:string; impact:"Alto"|"Medio"|"Bajo"; versionIds:string[] }
export interface CalendarEvent { id:string; title:string; date:string; startTime:string; endTime:string }
export type DailyTaskOutcome = "planned" | "advanced" | "completed";
export interface ScheduleBlock { id:string; taskId:string; date:string; startTime:string; endTime:string; source:"manual"|"suggested"; completed:boolean; completedAt?:string; outcome?:DailyTaskOutcome }
export interface WorkPreferences { dayStart:string; dayEnd:string; workingDays:number[]; focusBlockMinutes:number }
export interface AppData { user:User; users:User[]; clients:Client[]; projects:Project[]; initiatives:Initiative[]; versions:DeliverableVersion[]; tasks:Task[]; schedule:ScheduleBlock[]; workPreferences:WorkPreferences }
