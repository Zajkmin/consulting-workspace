"use client";
import { useState } from "react";
import { useApp } from "@/hooks/use-app";
import { ProjectCards } from "./project-cards";
import { ProjectForm } from "./project-form";
import { Modal } from "@/components/ui/modal";
import type { Project } from "@/types";

export function ProjectsSection() {
  const { data, currentUser } = useApp();
  const [editing, setEditing] = useState<Project | "new" | null>(null);
  const [manage, setManage] = useState(false);
  const canCreate = currentUser?.role === "admin" || currentUser?.role === "gestor";
  const editable = data.projects.filter(project => currentUser?.role === "admin" || currentUser?.editableProjectIds?.includes(project.id));

  return <section><div className="section-title"><h2>Proyectos</h2><div className="section-actions"><span>{data.projects.length} activos</span>{editable.length > 0 && <button className="link-button" onClick={() => setManage(true)}>Administrar</button>}{canCreate && <button className="button quiet compact" onClick={() => setEditing("new")}>+ Proyecto</button>}</div></div><ProjectCards projects={data.projects} initiatives={data.initiatives} versions={data.versions} tasks={data.tasks}/><Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Nuevo proyecto" : "Editar proyecto"}>{editing && <ProjectForm project={editing === "new" ? undefined : editing} onDone={() => setEditing(null)}/>}</Modal><Modal open={manage} onClose={() => setManage(false)} title="Administrar proyectos"><div className="manage-projects">{editable.map(project => <button key={project.id} onClick={() => { setManage(false); setEditing(project); }}><i style={{background:project.color}}/><span><b>{project.name}</b><small>{(project.areas ?? []).length} áreas · {project.active ? "Activo" : "Archivado"}</small></span><em>Editar</em></button>)}</div><div className="modal-actions"><button className="button quiet" onClick={() => setManage(false)}>Cerrar</button>{canCreate && <button className="button primary" onClick={() => { setManage(false); setEditing("new"); }}>+ Nuevo proyecto</button>}</div></Modal></section>;
}
