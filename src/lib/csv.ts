import Papa from "papaparse";
import type { Employee } from "./types";
import { EMPLOYEE_FIELDS } from "./constants";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

/** Parse a CSV file (with a header row) into employees. */
export function parseEmployeesCsv(file: File): Promise<Employee[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (result) => {
        const rows = result.data.filter((row) =>
          Object.values(row).some((v) => (v ?? "").toString().trim() !== ""),
        );
        resolve(
          rows.map((row) => {
            const data: Record<string, string> = {};
            for (const [k, v] of Object.entries(row)) {
              if (k) data[k] = (v ?? "").toString().trim();
            }
            return { id: uid(), data };
          }),
        );
      },
      error: (err) => reject(err),
    });
  });
}

/** A blank CSV template (header row only) users can fill in Excel. */
export function buildTemplateCsv(): string {
  const headers = EMPLOYEE_FIELDS.map((f) => f.key);
  const sample = [
    "홍길동",
    "Gildong Hong",
    "팀장",
    "Team Lead",
    "전략기획팀",
    "Strategy Planning",
    "02-1234-5678",
    "010-1234-5678",
    "gildong@company.com",
  ];
  // Prepend BOM so Excel opens UTF-8 Korean correctly.
  return "﻿" + headers.join(",") + "\n" + sample.join(",") + "\n";
}

export function downloadTemplateCsv() {
  const blob = new Blob([buildTemplateCsv()], {
    type: "text/csv;charset=utf-8",
  });
  triggerDownload(blob, "직원명단_양식.csv");
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
