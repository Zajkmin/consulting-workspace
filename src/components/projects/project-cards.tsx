import Link from "next/link";
import type { DeliverableVersion, Initiative, Project, Task } from "@/types";

export function ProjectCards({ projects, initiatives, versions }: { projects:Project[]; initiatives:Initiative[]; versions:DeliverableVersion[]; tasks:Task[] }) {
  return <div className="project-grid">{projects.map(project => {
    const initiativeIds = new Set(initiatives.filter(item => item.projectId === project.id).map(item => item.id));
    const deliverables = versions.filter(version => initiativeIds.has(version.initiativeId));
    const stats = {
      completed: deliverables.filter(version => version.status === "Completada").length,
      late: deliverables.filter(version => version.status === "Retrasada").length,
      pending: deliverables.filter(version => version.status !== "Completada" && version.status !== "Retrasada").length,
    };
    const activeDeliverables = stats.pending + stats.late;
    return <Link key={project.id} href={`/proyectos/${project.id}`} className="project-card"><i style={{background:project.color}}/><div className="project-title"><b>{project.name}</b><span>→</span></div><small>{activeDeliverables} entregables activos</small><div className="project-stats"><span><b>{stats.completed}</b> completadas</span><span><b>{stats.pending}</b> pendientes</span><span className="late"><b>{stats.late}</b> retrasadas</span></div></Link>;
  })}</div>;
}
