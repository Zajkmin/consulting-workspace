import Link from "next/link";
import { countStatuses, effectiveVersionStatus } from "@/lib/format";
import type { DeliverableVersion, Initiative, Project, Task } from "@/types";

export function ProjectCards({ projects, initiatives, versions, tasks, today }: { projects:Project[]; initiatives:Initiative[]; versions:DeliverableVersion[]; tasks:Task[]; today:string }) {
  return <div className="project-grid">{projects.map(project => {
    const initiativeIds = new Set(initiatives.filter(item => item.projectId === project.id).map(item => item.id));
    const deliverables = versions.filter(version => initiativeIds.has(version.initiativeId));
    const counts = countStatuses(deliverables.map(version => effectiveVersionStatus(version, tasks, today)));
    const open = deliverables.length - counts.Completada;
    const openOnTime = open - counts.Retrasada;
    return <Link key={project.id} href={`/proyectos/${project.id}`} className="project-card"><i style={{background:project.color}}/><div className="project-title"><b>{project.name}</b><span>→</span></div><small>{open} entregables abiertos</small><div className="project-stats"><span><b>{counts.Completada}</b> completadas</span><span><b>{openOnTime}</b> abiertas sin atraso</span><span className="late"><b>{counts.Retrasada}</b> atrasadas</span></div></Link>;
  })}</div>;
}
