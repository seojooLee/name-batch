"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { PX_PER_MM } from "@/lib/constants";
import { ensurePreviewFonts } from "@/lib/fonts";
import { generateBatchPdf, type ExportLayout } from "@/lib/pdf";
import { triggerDownload } from "@/lib/csv";
import CardCanvas from "@/components/CardCanvas";
import DesignPanel from "@/components/DesignPanel";
import EmployeePanel from "@/components/EmployeePanel";
import type { Side } from "@/lib/types";

export default function Page() {
  const [mounted, setMounted] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportLayout, setExportLayout] = useState<ExportLayout>("a4");

  const template = useStore((s) => s.template);
  const company = useStore((s) => s.company);
  const employees = useStore((s) => s.employees);
  const activeSide = useStore((s) => s.activeSide);
  const setActiveSide = useStore((s) => s.setActiveSide);
  const resetAll = useStore((s) => s.resetAll);

  useEffect(() => {
    setMounted(true);
    ensurePreviewFonts();
  }, []);

  async function onExport() {
    if (employees.length === 0) return;
    setExporting(true);
    try {
      const bytes = await generateBatchPdf(template, company, employees, exportLayout);
      const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
      triggerDownload(blob, `명함_일괄_${employees.length}명.pdf`);
    } catch (err) {
      console.error(err);
      alert("PDF 생성에 실패했습니다. 콘솔을 확인하세요.");
    } finally {
      setExporting(false);
    }
  }

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-400">
        불러오는 중…
      </div>
    );
  }

  // Fixed zoom so the card grows/shrinks with its real size (bigger size =
  // bigger canvas). Oversized cards scroll within the work area.
  const baseW = template.widthMm * PX_PER_MM;
  const baseH = template.heightMm * PX_PER_MM;
  const previewScale = 1.6;

  return (
    <div className="flex h-screen flex-col bg-gray-100 text-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">명함 일괄제작</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (confirm("모든 디자인·직원 데이터를 초기 상태로 되돌릴까요?")) resetAll();
            }}
            className="rounded border border-gray-300 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            초기화
          </button>
          <select
            value={exportLayout}
            onChange={(e) => setExportLayout(e.target.value as ExportLayout)}
            className="rounded border border-gray-300 px-2 py-1.5 text-xs text-gray-700"
            title="출력 방식"
          >
            <option value="a4">A4 배치 (가정용 프린터)</option>
            <option value="card">낱장 (인쇄소 입고)</option>
          </select>
          <button
            onClick={onExport}
            disabled={exporting || employees.length === 0}
            className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {exporting ? "생성 중…" : `PDF 내보내기 (${employees.length}명)`}
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        <aside className="w-72 shrink-0 overflow-hidden border-r border-gray-200 bg-white">
          <DesignPanel />
        </aside>

        <main className="min-w-0 flex-1 overflow-auto p-6">
          <div className="flex min-h-full w-fit min-w-full flex-col items-center justify-center gap-4">
            <div className="inline-flex overflow-hidden rounded-lg border border-gray-300 bg-white">
              {(["front", "back"] as Side[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveSide(s)}
                  className={`px-5 py-1.5 text-sm font-medium ${
                    activeSide === s
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {s === "front" ? "앞면" : "뒷면"}
                </button>
              ))}
            </div>

            <div
              className="flex shrink-0 items-center justify-center"
              style={{ width: baseW * previewScale, height: baseH * previewScale }}
            >
              <CardCanvas side={activeSide} scale={previewScale} />
            </div>

            <p className="text-center text-xs text-gray-400">
              필드를 드래그해 위치를 잡고, 배경은 왼쪽에서 업로드하세요.
              <br />
              오른쪽에서 고른 직원이 미리보기에 적용됩니다.
            </p>
          </div>
        </main>

        <aside className="w-72 shrink-0 overflow-hidden border-l border-gray-200 bg-white">
          <EmployeePanel />
        </aside>
      </div>
    </div>
  );
}
