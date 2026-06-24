import type { Company, Employee } from "./types";
import { FIELD_LABELS } from "./constants";

const TOKEN_RE = /\{\{\s*([\w]+)\s*\}\}/g;

/** Replace {{token}} occurrences using the given context (employee data + company). */
export function resolveText(
  text: string,
  ctx: Record<string, string>,
): string {
  return text.replace(TOKEN_RE, (_, key: string) => ctx[key] ?? "");
}

/** Merge company constants and a single employee's data into one lookup context. */
export function buildContext(company: Company, employee?: Employee) {
  return { ...company, ...(employee?.data ?? {}) };
}

/** Every token key currently available across company + all employees. */
export function availableTokens(
  company: Company,
  employees: Employee[],
): { key: string; label: string }[] {
  const keys = new Set<string>();
  Object.keys(company).forEach((k) => keys.add(k));
  employees.forEach((e) => Object.keys(e.data).forEach((k) => keys.add(k)));
  return [...keys]
    .filter((k) => k.length > 0)
    .map((key) => ({ key, label: FIELD_LABELS[key] ?? key }))
    .sort((a, b) => a.label.localeCompare(b.label, "ko"));
}
