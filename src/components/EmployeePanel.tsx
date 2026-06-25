"use client";

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { EMPLOYEE_FIELDS } from "@/lib/constants";
import { parseEmployeesCsv, downloadTemplateCsv } from "@/lib/csv";
import { imageBlobToJpegDataUrl } from "@/lib/imageUtils";
import { toast } from "@/lib/toast";
import CropModal from "./CropModal";

const emptyForm = () =>
  Object.fromEntries(EMPLOYEE_FIELDS.map((f) => [f.key, ""])) as Record<string, string>;

export default function EmployeePanel() {
  const employees = useStore((s) => s.employees);
  const selectedEmployeeId = useStore((s) => s.selectedEmployeeId);
  const selectEmployee = useStore((s) => s.selectEmployee);
  const addEmployee = useStore((s) => s.addEmployee);
  const removeEmployee = useStore((s) => s.removeEmployee);
  const appendEmployees = useStore((s) => s.appendEmployees);
  const setEmployeePhoto = useStore((s) => s.setEmployeePhoto);

  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);
  const photoTargetId = useRef<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(emptyForm);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [zipBusy, setZipBusy] = useState(false);

  function openPhotoPicker(id: string) {
    photoTargetId.current = id;
    photoRef.current?.click();
  }

  function onPhoto(file?: File | null) {
    if (!file || !photoTargetId.current) return;
    setCropSrc(URL.createObjectURL(file));
  }

  function closeCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  function applyCrop(dataUrl: string) {
    if (photoTargetId.current) setEmployeePhoto(photoTargetId.current, dataUrl);
    closeCrop();
  }

  async function onCsv(file?: File | null) {
    if (!file) return;
    try {
      const list = await parseEmployeesCsv(file);
      if (list.length === 0) {
        toast("CSV에서 직원을 찾지 못했습니다.", "error");
        return;
      }
      appendEmployees(list);
      toast(`${list.length}명을 추가했습니다.`, "success");
    } catch {
      toast("CSV를 읽지 못했습니다.", "error");
    }
  }

  // Upload a ZIP of photos; match each image to an employee whose 이름(name)
  // equals the file name (without extension). e.g. "김라온.jpg" → 김라온.
  async function onZip(file?: File | null) {
    if (!file) return;
    setZipBusy(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(file);
      // Korean file names from macOS zips are NFD-decomposed; CSV/typed names
      // are NFC. Normalize both sides so visually-identical names match.
      const norm = (s: string) => s.trim().normalize("NFC");
      const imgs = Object.values(zip.files).filter(
        (f) =>
          !f.dir &&
          !f.name.includes("__MACOSX/") &&
          !f.name.split("/").pop()!.startsWith("._") &&
          /\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name),
      );
      if (imgs.length === 0) {
        toast("ZIP 안에 이미지가 없습니다.", "error");
        return;
      }

      // name -> employee ids (handles duplicates by assigning to all matches)
      const byName = new Map<string, string[]>();
      for (const e of employees) {
        const n = norm(e.data.name ?? "");
        if (!n) continue;
        (byName.get(n) ?? byName.set(n, []).get(n)!).push(e.id);
      }

      let matched = 0;
      const missed: string[] = [];
      for (const ent of imgs) {
        const base = norm(
          ent.name
            .split("/")
            .pop()!
            .replace(/\.[^.]+$/, ""),
        );
        const ids = byName.get(base);
        if (!ids || ids.length === 0) {
          missed.push(base);
          continue;
        }
        const blob = await ent.async("blob");
        const url = await imageBlobToJpegDataUrl(blob, 700);
        ids.forEach((id) => setEmployeePhoto(id, url));
        matched += ids.length;
      }

      const head = `사진 ${matched}명 매칭 완료.`;
      const tail =
        missed.length > 0
          ? `\n이름이 일치하지 않아 건너뜀 ${missed.length}개: ${missed
              .slice(0, 8)
              .join(", ")}${missed.length > 8 ? " …" : ""}`
          : "";
      toast(head + tail, missed.length > 0 ? "info" : "success");
    } catch (err) {
      console.error(err);
      toast("ZIP을 처리하지 못했습니다.", "error");
    } finally {
      setZipBusy(false);
    }
  }

  function submitForm() {
    if (!form.name?.trim()) {
      toast("이름은 필수입니다.", "error");
      return;
    }
    const data = Object.fromEntries(
      Object.entries(form).filter(([, v]) => v.trim() !== ""),
    );
    addEmployee(data);
    setForm(emptyForm());
    setShowForm(false);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 p-3">
        <h3 className="text-sm font-semibold text-gray-700">
          직원 명단 <span className="text-gray-400">({employees.length})</span>
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
          >
            CSV 가져오기
          </button>
          <button
            onClick={downloadTemplateCsv}
            className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
          >
            양식
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            onCsv(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            onPhoto(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <input
          ref={zipRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(e) => {
            onZip(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      <div className="p-3">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="w-full rounded bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? "닫기" : "+ 직원 직접 추가"}
        </button>
        <button
          onClick={() => zipRef.current?.click()}
          disabled={zipBusy}
          title="사진 파일 이름이 직원 '이름'과 같으면 자동으로 매칭됩니다 (예: 김라온.jpg)"
          className="mt-2 w-full rounded border border-gray-300 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {zipBusy ? "매칭 중…" : "사진 ZIP 일괄 매칭"}
        </button>
        {showForm && (
          <div className="mt-2 space-y-1.5 rounded border border-gray-200 p-2">
            {EMPLOYEE_FIELDS.map((f) => (
              <input
                key={f.key}
                placeholder={f.label}
                value={form[f.key] ?? ""}
                onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              />
            ))}
            <button
              onClick={submitForm}
              className="w-full rounded bg-gray-900 py-1.5 text-sm text-white hover:bg-gray-700"
            >
              추가
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto border-t border-gray-200">
        {employees.length === 0 && (
          <p className="p-4 text-center text-sm text-gray-400">
            직원이 없습니다. CSV를 올리거나 직접 추가하세요.
          </p>
        )}
        {employees.map((e) => {
          const active = e.id === selectedEmployeeId;
          return (
            <div
              key={e.id}
              onClick={() => selectEmployee(active ? null : e.id)}
              className={`flex cursor-pointer items-center gap-2 border-b border-gray-100 px-3 py-2 text-sm ${
                active ? "bg-blue-50" : "hover:bg-gray-50"
              }`}
            >
              <button
                onClick={(ev) => {
                  ev.stopPropagation();
                  openPhotoPicker(e.id);
                }}
                title="사진 업로드"
                className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100"
              >
                {e.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.photo} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[9px] text-gray-400">
                    사진+
                  </span>
                )}
              </button>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-gray-900">
                  {e.data.name || "(이름 없음)"}
                </div>
                <div className="truncate text-xs text-gray-500">
                  {[e.data.department, e.data.title].filter(Boolean).join(" · ")}
                </div>
              </div>
              <button
                onClick={(ev) => {
                  ev.stopPropagation();
                  removeEmployee(e.id);
                }}
                className="ml-1 shrink-0 text-xs text-gray-400 hover:text-red-600"
              >
                삭제
              </button>
            </div>
          );
        })}
      </div>
      <p className="border-t border-gray-200 p-2 text-center text-[11px] text-gray-400">
        직원을 클릭하면 미리보기에 적용됩니다
      </p>

      {cropSrc && (
        <CropModal src={cropSrc} onCancel={closeCrop} onConfirm={applyCrop} />
      )}
    </div>
  );
}
