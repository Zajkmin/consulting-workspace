import { initialData } from "@/data/mocks"; import type { AppData } from "@/types";
const clone=<T,>(v:T):T=>JSON.parse(JSON.stringify(v));
export const projectService={async list(){return clone(initialData.projects)},async initiatives(){return clone(initialData.initiatives)}};
export const taskService={async list(){return clone(initialData.tasks)}};
export const scheduleService={async list(){return clone(initialData.schedule)}};
export const appService={async bootstrap():Promise<AppData>{return clone(initialData)}};
