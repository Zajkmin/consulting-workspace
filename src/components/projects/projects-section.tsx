"use client";

import Link from "next/link";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { useApp } from "@/hooks/use-app";
import { canManageProject, projectArchiveLabel } from "@/lib/project-archive";
import type { Project } from "@/types";
import { ProjectArchiveDialog } from "./project-archive-dialog";
import { ProjectCards } from "./project-cards";
import { ProjectForm } from "./project-form";

export function ProjectsSection() {
  const { data, projectData, currentUser, canArchiveProjects } = useApp();
  const [panel, setPanel] = useState<"manage" | "archive" | null>(null);
  const [editing, setEditing] = useState<Project | "new" | null>(null);
  const [changing, setChanging] = useState<Project | null>(null);
  const [feedback, setFeedback] = useState("");

  const canCreate = currentUser?.role === "admin" || currentUser?.role === "gestor";
  const editable = data.projects.filter(project => canManageProject(currentUser, project.id));
  const archived = projectData.projects.filter(project => !project.active);

  function openEditor(project: Project | "new") {
    setPanel(null);
    setEditing(project);
  }

  return (
    <section className="projects-section">
      <div className="section-title">
        <h2>Proyectos</h2>
        <div className="section-actions">
          <span>{data.projects.length} activos</span>
          <button className="link-button" onClick={() => setPanel("archive")}>Proyectos archivados</button>
          {editable.length > 0 && (
            <button className="link-button" onClick={() => setPanel("manage")}>Administrar</button>
          )}
          {canCreate && (
            <button className="button quiet compact" onClick={() => openEditor("new")}>+ Proyecto</button>
          )}
        </div>
      </div>
      {feedback && <p className="subtle" role="status">{feedback}</p>}
      <ProjectCards projects={data.projects} initiatives={data.initiatives} versions={data.versions} tasks={data.tasks} />

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Nuevo proyecto" : "Editar proyecto"}>
        {editing && <ProjectForm project={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />}
      </Modal>

      <Modal open={panel === "manage" && !changing} onClose={() => setPanel(null)} title="Administrar proyectos">
        <div className="project-archive-list">
          {editable.map(project => (
            <div className="project-archive-row" key={project.id}>
              <div className="project-archive-name">
                <i aria-hidden="true" style={{ background: project.color }} />
                <div>
                  <strong>{project.name}</strong>
                  <p className="subtle">{(project.areas ?? []).length} áreas · Activo</p>
                </div>
              </div>
              <div className="project-archive-actions">
                <button className="button quiet compact" onClick={() => openEditor(project)}>Editar</button>
                {canArchiveProjects && (
                  <button className="button quiet compact" onClick={() => setChanging(project)}>Archivar proyecto</button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button className="button quiet" onClick={() => setPanel(null)}>Cerrar</button>
          {canCreate && <button className="button primary" onClick={() => openEditor("new")}>+ Nuevo proyecto</button>}
        </div>
      </Modal>

      <Modal open={panel === "archive" && !changing} onClose={() => setPanel(null)} title="Proyectos archivados">
        {archived.length ? (
          <div className="project-archive-list">
            {archived.map(project => (
              <div className="project-archive-row" key={project.id}>
                <div>
                  <Link className="edit-link" href={`/proyectos/${project.id}`} onClick={() => setPanel(null)}>
                    <strong>{project.name}</strong>
                  </Link>
                  <p className="subtle">{projectArchiveLabel(project.archiveReason)}</p>
                </div>
                {canArchiveProjects && canManageProject(currentUser, project.id) && (
                  <button className="button quiet compact" onClick={() => setChanging(project)}>Reactivar proyecto</button>
                )}
              </div>
            ))}
          </div>
        ) : <p className="empty">No tenés proyectos archivados para consultar.</p>}
        <div className="modal-actions">
          <button className="button quiet" onClick={() => setPanel(null)}>Cerrar</button>
        </div>
      </Modal>

      {changing && (
        <ProjectArchiveDialog
          key={changing.id}
          project={changing}
          onClose={() => setChanging(null)}
          onSuccess={message => { setFeedback(message); setChanging(null); setPanel(null); }}
        />
      )}
    </section>
  );
}
