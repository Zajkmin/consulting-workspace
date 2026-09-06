import Link from "next/link";
import type { DeliverableVersion, Initiative, Project, Task } from "@/types";
import { projectStats } from "@/lib/format";

export function ProjectCards({ projects, initiatives, versions, tasks }: { projects:Project[]; initiatives:Initiative[]; versions:DeliverableVersion[]; tasks:Task[] }) {
  return <div className="project-grid">{projects.map(project => {
    const stats = projectStats(project.id, tasks);
    const initiativeIds = new Set(initiatives.filter(item => item.projectId === project.id).map(item => item.id));
    const activeDeliverables = versions.filter(version => initiativeIds.has(version.initiativeId) && version.status !== "Completada").length;
    return <Link key={project.id} href={`/proyectos/${project.id}`} className="project-card"><i style={{background:project.color}}/><div className="project-title"><b>{project.name}</b><span>→</span></div><small>{activeDeliverables} entregables activos</small><div className="project-stats"><span><b>{stats.completed}</b> completadas</span><span><b>{stats.pending}</b> pendientes</span><span className="late"><b>{stats.late}</b> retrasadas</span></div></Link>;
  })}</div>;
}
