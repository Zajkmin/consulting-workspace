"use client";

import { ProjectsSection } from "@/components/projects/projects-section";
import { TaskTable } from "@/components/tasks/task-table";
import { useApp } from "@/hooks/use-app";
import { calendarLabel } from "@/lib/dates";

export default function Home() {
  const { data, today } = useApp();
  const weekday = calendarLabel(today, { weekday: "long" }) ?? "";
  const date = calendarLabel(today, { day: "numeric", month: "long" });
  return (
    <main className="shell">
      <section className="intro">
        <div>
          <p className="eyebrow">Mi trabajo</p>
          <h1>Hola, {data.user.name}.</h1>
          <p className="subtle">Esto es lo que necesita tu atención.</p>
        </div>
        <p className="today"><time dateTime={today}>{weekday.charAt(0).toUpperCase() + weekday.slice(1)} · {date}</time></p>
      </section>
      <ProjectsSection />
      <section className="work"><TaskTable /></section>
    </main>
  );
}
