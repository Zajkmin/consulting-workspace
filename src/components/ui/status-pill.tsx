import type { Priority, TaskStatus } from "@/types";

const statusAlias: Partial<Record<TaskStatus, string>> = { Retrasada: "Atrasada" };

export function StatusPill({ value }: { value: Priority | TaskStatus }) {
	const label = statusAlias[value as TaskStatus] ?? value;
	const className = value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replaceAll(" ", "-");
	return <span className={`pill ${className}`}>{label}</span>;
}
