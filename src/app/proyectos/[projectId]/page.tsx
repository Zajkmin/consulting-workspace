"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useApp } from "@/hooks/use-app";
import { Hierarchy } from "@/components/initiatives/hierarchy";

export default function ProjectPage() {
	const { projectId } = useParams<{ projectId: string }>();
	const { data } = useApp();
	const project = data.projects.find((item) => item.id === projectId);

	useEffect(() => {
		if (!project) return;
		const key = "consulting-recent-projects";
		const recent = JSON.parse(localStorage.getItem(key) ?? "[]").filter(
			(id: string) => id !== project.id,
		);
		localStorage.setItem(key, JSON.stringify([project.id, ...recent].slice(0, 3)));
		window.dispatchEvent(new Event("recent-projects-changed"));
	}, [project]);

	if (!project) {
		return (
			<main className="shell">
				<div className="empty">
					<b>Proyecto no encontrado</b>
					<Link href="/">Volver a iniciativas</Link>
				</div>
			</main>
		);
	}

	return (
		<main className="shell project-page">
			<h1>{project.name}</h1>
			<Hierarchy projectId={project.id} />
		</main>
	);
}
