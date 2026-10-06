import type { Employee, JobPosition, TimeSchedule } from "@/types";

/** Horário efetivo do colaborador: cargo → carga legada no cadastro. */
export function employeeScheduleId(
  employee: Pick<Employee, "scheduleId" | "jobPositionId">,
  positions: JobPosition[],
): string | undefined {
  if (employee.jobPositionId) {
    const pos = positions.find((p) => p.id === employee.jobPositionId);
    if (pos?.scheduleId) return pos.scheduleId;
  }
  return employee.scheduleId;
}

export function employeeSchedule(
  employee: Pick<Employee, "scheduleId" | "jobPositionId">,
  positions: JobPosition[],
  schedules: TimeSchedule[],
): TimeSchedule | undefined {
  const id = employeeScheduleId(employee, positions);
  if (!id) return undefined;
  return schedules.find((s) => s.id === id);
}

export function employeeRoleLabel(
  employee: Pick<Employee, "role" | "jobPositionId">,
  positions: JobPosition[],
): string {
  if (employee.jobPositionId) {
    const pos = positions.find((p) => p.id === employee.jobPositionId);
    if (pos?.name) return pos.name;
  }
  return employee.role?.trim() || "—";
}
