import type { AppData, Project, Task, User } from "@/types";

export const projects: Project[] = [];
export const tasks: Task[] = [];

const administrator: User = {
  id: "u1",
  name: "Jazmín Irala",
  email: "jazmin@consulting-workspace.test",
  initials: "JI",
  role: "admin",
  assignedProjectIds: [],
  editableProjectIds: [],
  permissions: { manageUsers: true, manageProjects: true, manageSchedule: true },
  active: true,
};

export const initialData: AppData = {
  user: administrator,
  users: [administrator],
  clients: [],
  projects,
  initiatives: [],
  versions: [],
  tasks,
  schedule: [],
  workPreferences: {
    dayStart: "08:30",
    dayEnd: "17:30",
    workingDays: [1, 2, 3, 4, 5],
    focusBlockMinutes: 90,
  },
};
