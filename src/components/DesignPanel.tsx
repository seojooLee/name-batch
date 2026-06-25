"use client";

import { useRef } from "react";
import { useStore, raonFields } from "@/lib/store";
import { COMPANY_FIELDS, PRODUCT_PRESETS, RAON_TAG, round2 } from "@/lib/constants";
import { availableTokens } from "@/lib/tokens";
import { fileToBackgroundDataUrl, urlToBackgroundDataUrl } from "@/lib/imageUtils";
import type { Align, Side } from "@/lib/types";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-200 p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function DesignPanel() {
  const template = useStore((s) => s.template);
  const company = useStore((s) => s.company);
  const employees = useStore((s) => s.employees);
  const activeSide = useStore((s) => s.activeSide);
  const selectedFieldId = useStore((s) => s.selectedFieldId);
  const setCardSize = useStore((s) => s.setCardSize);
  const setBackground = useStore((s) => s.setBackground);
  const setCompany = useStore((s) => s.setCompany);
  const addField = useStore((s) => s.addField);
  const addPhotoField = useStore((s) => s.addPhotoField);
  const updateField = useStore((s) => s.updateField);
  const removeField = useStore((s) => s.removeField);
  const replaceFields = useStore((s) => s.replaceFields);

  const fileRef = useRef<HTMLInputElement>(null);
  const selectedField = template.fields.find((f) => f.id === selectedFieldId);
  const tokens = availableTokens(company, employees);

  const currentPreset =
    template.widthMm === RAON_TAG.w && template.heightMm === RAON_TAG.h
      ? RAON_TAG.id
      : (PRODUCT_PRESETS.find(
          (p) => p.w === template.widthMm && p.h === template.heightMm,
        )?.id ?? "custom");

  async function applyRaonTag() {
    setCardSize(RAON_TAG.w, RAON_TAG.h);
    replaceFields(raonFields());
    try {
      const url = await urlToBackgroundDataUrl(RAON_TAG.bg);
      setBackground("front", url);
      setBackground("back", url);
    } catch {
      alert("라온 네임택 배경을 불러오지 못했습니다.");
    }
  }

  async function onUpload(side: Side, file?: File | null) {
    if (!file) return;
    try {
      const dataUrl = await fileToBackgroundDataUrl(file);
      setBackground(side, dataUrl);
    } catch {
      alert("이미지를 처리하지 못했습니다.");
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <Section title="제품 / 크기">
        <select
          value={currentPreset}
          onChange={(e) => {
            if (e.target.value === RAON_TAG.id) {
              applyRaonTag();
              return;
            }
            const p = PRODUCT_PRESETS.find((x) => x.id === e.target.value);
            if (p) setCardSize(p.w, p.h);
          }}
          className="mb-2 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
        >
          {PRODUCT_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
          <option value={RAON_TAG.id}>{RAON_TAG.label}</option>
          <option value="custom">사용자 지정</option>
        </select>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-gray-500">
            가로(mm)
            <input
              type="number"
              min={20}
              max={300}
              step={0.01}
              value={template.widthMm}
              onChange={(e) =>
                setCardSize(round2(Number(e.target.value)) || template.widthMm, template.heightMm)
              }
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="text-xs text-gray-500">
            세로(mm)
            <input
              type="number"
              min={20}
              max={300}
              step={0.01}
              value={template.heightMm}
              onChange={(e) =>
                setCardSize(template.widthMm, round2(Number(e.target.value)) || template.heightMm)
              }
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </label>
        </div>
      </Section>

      <Section title={`배경 이미지 — ${activeSide === "front" ? "앞면" : "뒷면"}`}>
        <p className="mb-2 text-xs text-gray-500">
          90×50mm로 디자인한 명함 배경(PNG/JPG)을 올리세요.
        </p>
        {(activeSide === "front" ? template.bgFront : template.bgBack) ? (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={(activeSide === "front" ? template.bgFront : template.bgBack)!}
              alt=""
              className="w-full rounded border border-gray-200"
            />
            <button
              onClick={() => setBackground(activeSide, null)}
              className="text-xs text-red-600 hover:underline"
            >
              배경 제거
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full rounded border border-dashed border-gray-300 py-6 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600"
          >
            + 배경 업로드
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onUpload(activeSide, e.target.files?.[0])}
        />
      </Section>

      <Section title="필드 추가">
        <p className="mb-2 text-xs text-gray-500">
          변수를 고르면 카드 가운데에 추가됩니다. 드래그로 위치를 잡으세요.
        </p>
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) addField(activeSide, `{{${e.target.value}}}`);
            e.target.value = "";
          }}
          className="mb-2 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="">+ 변수 필드 추가…</option>
          {tokens.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label} ({`{{${t.key}}}`})
            </option>
          ))}
        </select>
        <button
          onClick={() => addField(activeSide, "텍스트")}
          className="mb-2 w-full rounded border border-gray-300 px-2 py-1.5 text-sm hover:bg-gray-50"
        >
          + 고정 텍스트 추가
        </button>
        <button
          onClick={() => addPhotoField(activeSide)}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm hover:bg-gray-50"
        >
          + 사진 영역 추가
        </button>
        <p className="mt-1 text-[11px] text-gray-400">
          사진은 오른쪽 직원 목록에서 각자 업로드합니다.
        </p>
      </Section>

      {selectedField?.kind === "photo" && (
        <Section title="선택한 사진 영역">
          <div className="mb-3 grid grid-cols-2 gap-2">
            <label className="text-xs text-gray-500">
              가로(mm)
              <input
                type="number"
                min={5}
                max={100}
                step={0.01}
                value={selectedField.w ?? 22}
                onChange={(e) =>
                  updateField(selectedField.id, { w: round2(Number(e.target.value)) || 22 })
                }
                className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="text-xs text-gray-500">
              세로(mm)
              <input
                type="number"
                min={5}
                max={100}
                step={0.01}
                value={selectedField.h ?? 28}
                onChange={(e) =>
                  updateField(selectedField.id, { h: round2(Number(e.target.value)) || 28 })
                }
                className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </label>
          </div>

          <label className="mb-1 block text-xs text-gray-500">도형</label>
          <div className="mb-3 flex gap-1">
            {([
              { v: "rect", label: "네모" },
              { v: "rounded", label: "둥근네모" },
              { v: "circle", label: "원" },
            ] as const).map((o) => (
              <button
                key={o.v}
                onClick={() => updateField(selectedField.id, { shape: o.v })}
                className={`flex-1 rounded border px-2 py-1 text-xs ${
                  (selectedField.shape ?? "rect") === o.v
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => removeField(selectedField.id)}
            className="text-xs text-red-600 hover:underline"
          >
            사진 영역 삭제
          </button>
        </Section>
      )}

      {selectedField && selectedField.kind !== "photo" && (
        <Section title="선택한 필드">
          <label className="mb-1 block text-xs text-gray-500">내용 (변수: {`{{키}}`})</label>
          <input
            value={selectedField.text}
            onChange={(e) => updateField(selectedField.id, { text: e.target.value })}
            className="mb-2 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
          <div className="mb-2 flex flex-wrap gap-1">
            {tokens.map((t) => (
              <button
                key={t.key}
                onClick={() =>
                  updateField(selectedField.id, {
                    text: `${selectedField.text} {{${t.key}}}`.trim(),
                  })
                }
                className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-blue-100 hover:text-blue-700"
              >
                +{t.label}
              </button>
            ))}
          </div>

          <div className="mb-2 grid grid-cols-2 gap-2">
            <label className="text-xs text-gray-500">
              크기(pt)
              <input
                type="number"
                min={4}
                max={48}
                value={selectedField.fontSize}
                onChange={(e) =>
                  updateField(selectedField.id, { fontSize: Number(e.target.value) || 9 })
                }
                className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="text-xs text-gray-500">
              색상
              <input
                type="color"
                value={selectedField.color}
                onChange={(e) => updateField(selectedField.id, { color: e.target.value })}
                className="mt-0.5 h-8 w-full rounded border border-gray-300"
              />
            </label>
          </div>

          <div className="mb-3 flex items-center gap-2">
            <button
              onClick={() => updateField(selectedField.id, { bold: !selectedField.bold })}
              className={`rounded border px-3 py-1 text-sm ${
                selectedField.bold
                  ? "border-blue-500 bg-blue-50 font-bold text-blue-700"
                  : "border-gray-300"
              }`}
            >
              B
            </button>
            <div className="flex overflow-hidden rounded border border-gray-300">
              {(["left", "center", "right"] as Align[]).map((a) => (
                <button
                  key={a}
                  onClick={() => updateField(selectedField.id, { align: a })}
                  className={`px-2.5 py-1 text-xs ${
                    selectedField.align === a ? "bg-blue-500 text-white" : "bg-white"
                  }`}
                >
                  {a === "left" ? "좌" : a === "center" ? "중" : "우"}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => removeField(selectedField.id)}
            className="text-xs text-red-600 hover:underline"
          >
            필드 삭제
          </button>
        </Section>
      )}

      <Section title="회사 정보 (공통)">
        <div className="space-y-2">
          {COMPANY_FIELDS.map((f) => (
            <label key={f.key} className="block text-xs text-gray-500">
              {f.label}
              <input
                value={company[f.key] ?? ""}
                onChange={(e) => setCompany(f.key, e.target.value)}
                className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
              />
            </label>
          ))}
        </div>
      </Section>
    </div>
  );
}
