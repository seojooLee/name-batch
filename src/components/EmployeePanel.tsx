"use client";

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { EMPLOYEE_FIELDS } from "@/lib/constants";
import { parseEmployeesCsv, downloadTemplateCsv } from "@/lib/csv";
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
  const photoTargetId = useRef<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(emptyForm);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

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
      if (list.length === 0) return alert("CSV에서 직원을 찾지 못했습니다.");
      appendEmployees(list);
    } catch {
      alert("CSV를 읽지 못했습니다.");
    }
  }

  function submitForm() {
    if (!form.name?.trim()) return alert("이름은 필수입니다.");
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
      </div>

      <div className="p-3">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="w-full rounded bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? "닫기" : "+ 직원 직접 추가"}
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
