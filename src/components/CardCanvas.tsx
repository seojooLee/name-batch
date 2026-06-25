"use client";

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { PX_PER_MM, px, fontPx, round2 } from "@/lib/constants";
import { buildContext, resolveText, availableTokens } from "@/lib/tokens";
import { imageBlobToJpegDataUrl } from "@/lib/imageUtils";
import { toast } from "@/lib/toast";
import type { Field, Side } from "@/lib/types";

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

export default function CardCanvas({
  side,
  scale = 1,
}: {
  side: Side;
  scale?: number;
}) {
  const template = useStore((s) => s.template);
  const company = useStore((s) => s.company);
  const employees = useStore((s) => s.employees);
  const selectedEmployeeId = useStore((s) => s.selectedEmployeeId);
  const selectedFieldId = useStore((s) => s.selectedFieldId);
  const selectField = useStore((s) => s.selectField);
  const moveField = useStore((s) => s.moveField);
  const updateField = useStore((s) => s.updateField);
  const setEmployeePhoto = useStore((s) => s.setEmployeePhoto);

  const ref = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  // Live coordinate / size readout shown next to the field being manipulated.
  const [hud, setHud] = useState<{ id: string; text: string } | null>(null);
  // Double-click a field to open an editing popover (variable picker + text).
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editPos, setEditPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const tokens = availableTokens(company, employees);

  const W = template.widthMm;
  const H = template.heightMm;

  const previewEmployee =
    employees.find((e) => e.id === selectedEmployeeId) ?? employees[0];
  const ctx = buildContext(company, previewEmployee);
  const bg = side === "front" ? template.bgFront : template.bgBack;
  const fields = template.fields.filter((f) => f.side === side);

  function startDrag(e: React.PointerEvent, field: Field) {
    e.preventDefault();
    selectField(field.id);
    const startX = e.clientX;
    const startY = e.clientY;
    const ox = field.x;
    const oy = field.y;
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / (PX_PER_MM * scale);
      const dy = (ev.clientY - startY) / (PX_PER_MM * scale);
      const nx = round2(clamp(ox + dx, 0, W));
      const ny = round2(clamp(oy + dy, 0, H));
      moveField(field.id, nx, ny);
      setHud({ id: field.id, text: `X ${nx} · Y ${ny} mm` });
    };
    const up = () => {
      setHud(null);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  // Drag the bottom-right handle to resize a photo box directly in the editor.
  function startResize(e: React.PointerEvent, field: Field) {
    e.preventDefault();
    e.stopPropagation();
    selectField(field.id);
    const startX = e.clientX;
    const startY = e.clientY;
    const ow = field.w ?? 22;
    const oh = field.h ?? 28;
    const move = (ev: PointerEvent) => {
      const dw = (ev.clientX - startX) / (PX_PER_MM * scale);
      const dh = (ev.clientY - startY) / (PX_PER_MM * scale);
      const nw = round2(clamp(ow + dw, 5, W - field.x));
      const nh = round2(clamp(oh + dh, 5, H - field.y));
      updateField(field.id, { w: nw, h: nh });
      setHud({ id: field.id, text: `${nw} × ${nh} mm` });
    };
    const up = () => {
      setHud(null);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function startEdit(field: Field, rect: DOMRect) {
    selectField(field.id);
    setEditValue(field.text);
    setEditingId(field.id);
    // Position the popover just under the field, clamped to the viewport.
    const popW = 230;
    const x = clamp(rect.left, 8, window.innerWidth - popW - 8);
    const y = Math.min(rect.bottom + 6, window.innerHeight - 200);
    setEditPos({ x, y });
  }
  function commitEdit() {
    if (editingId) updateField(editingId, { text: editValue });
    setEditingId(null);
  }

  // Double-click a photo box to upload a picture for the previewed employee.
  function openPhotoUpload() {
    if (!previewEmployee) {
      toast("오른쪽 목록에서 직원을 먼저 선택하세요.", "info");
      return;
    }
    photoInputRef.current?.click();
  }
  async function onCanvasPhoto(file?: File | null) {
    if (!file || !previewEmployee) return;
    try {
      const url = await imageBlobToJpegDataUrl(file, 700);
      setEmployeePhoto(previewEmployee.id, url);
      toast("사진을 적용했습니다.", "success");
    } catch {
      toast("이미지를 처리하지 못했습니다.", "error");
    }
  }

  return (
    <>
    <div
      ref={ref}
      onPointerDown={(e) => {
        if (e.target === ref.current) selectField(null);
      }}
      className="relative select-none overflow-hidden rounded-md bg-white shadow-lg ring-1 ring-black/10"
      style={{
        width: px(W),
        height: px(H),
        transform: `scale(${scale})`,
        transformOrigin: "center",
      }}
    >
      {bg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bg}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-fill"
        />
      )}

      {fields.map((f) => {
        const selectedField = f.id === selectedFieldId;
        if (f.kind === "photo") {
          const photo = previewEmployee?.photo;
          const radius =
            f.shape === "circle" ? "9999px" : f.shape === "rounded" ? "14%" : "0";
          return (
            <div
              key={f.id}
              className="absolute"
              style={{
                top: px(f.y),
                left: px(f.x),
                width: px(f.w ?? 22),
                height: px(f.h ?? 28),
              }}
            >
              <div
                onPointerDown={(e) => startDrag(e, f)}
                onDoubleClick={openPhotoUpload}
                title="더블클릭하여 사진 업로드"
                className={`h-full w-full overflow-hidden ${
                  selectedField ? "outline-2 outline-blue-500" : "outline-1 outline-gray-300"
                } cursor-move outline-dashed`}
                style={{ borderRadius: radius }}
              >
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo}
                    alt=""
                    draggable={false}
                    className="pointer-events-none h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-100 text-[9px] text-gray-400">
                    사진
                  </div>
                )}
              </div>
              {selectedField && (
                <div
                  onPointerDown={(e) => startResize(e, f)}
                  title="드래그해서 크기 조절"
                  className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-sm border border-white bg-blue-500 shadow"
                  style={{ touchAction: "none" }}
                />
              )}
              {hud?.id === f.id && (
                <div
                  className="pointer-events-none absolute -top-4 left-0 z-10 whitespace-nowrap rounded bg-blue-600 px-1 text-white shadow"
                  style={{ fontSize: 9, lineHeight: "14px", fontWeight: 400 }}
                >
                  {hud.text}
                </div>
              )}
            </div>
          );
        }

        const resolved = resolveText(f.text, ctx);
        const isEmpty = resolved.trim() === "";
        const selected = f.id === selectedFieldId;
        const transform =
          f.align === "center"
            ? "translateX(-50%)"
            : f.align === "right"
              ? "translateX(-100%)"
              : "none";
        return (
          <div
            key={f.id}
            onPointerDown={(e) => startDrag(e, f)}
            onDoubleClick={(e) => startEdit(f, e.currentTarget.getBoundingClientRect())}
            title="더블클릭하여 내용 수정"
            className={`absolute cursor-move whitespace-nowrap leading-none ${
              selected ? "outline-2 outline-blue-500" : "hover:outline-1 hover:outline-blue-300"
            } outline-dashed`}
            style={{
              top: px(f.y),
              left: px(f.x),
              transform,
              fontSize: fontPx(f.fontSize),
              fontWeight: f.bold ? 700 : 400,
              color: isEmpty ? "#c0392b" : f.color,
              fontFamily: "NanumGothic, sans-serif",
              opacity: isEmpty ? 0.7 : 1,
            }}
          >
            {isEmpty ? f.text : resolved}
            {hud?.id === f.id && (
              <div
                className="pointer-events-none absolute -top-4 left-0 z-10 whitespace-nowrap rounded bg-blue-600 px-1 text-white shadow"
                style={{ fontSize: 9, lineHeight: "14px", fontWeight: 400, transform: "none" }}
              >
                {hud.text}
              </div>
            )}
          </div>
        );
      })}

      {/* trim-size hint */}
      <div className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/40 px-1 text-[9px] text-white">
        {W}×{H}mm
      </div>
    </div>

    <input
      ref={photoInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => {
        onCanvasPhoto(e.target.files?.[0]);
        e.target.value = "";
      }}
    />

    {editingId && (
      <>
        {/* click-away closes (saves) the popover */}
        <div className="fixed inset-0 z-40" onPointerDown={commitEdit} />
        <div
          className="fixed z-50 w-[230px] rounded-lg border border-gray-200 bg-white p-2.5 shadow-xl"
          style={{ left: editPos.x, top: editPos.y }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <label className="mb-1 block text-[11px] font-medium text-gray-500">
            변수 고르기
          </label>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) setEditValue(`{{${e.target.value}}}`);
              e.target.value = "";
            }}
            className="mb-2 w-full rounded border border-gray-300 px-2 py-1 text-sm"
          >
            <option value="">변수 선택…</option>
            {tokens.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>

          <label className="mb-1 block text-[11px] font-medium text-gray-500">
            내용 (직접 입력 / 변수 {`{{키}}`})
          </label>
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitEdit();
              } else if (e.key === "Escape") {
                setEditingId(null);
              }
            }}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
          <div className="mt-1 mb-2 truncate text-[11px] text-gray-400">
            → {resolveText(editValue, ctx).trim() || "(빈 값)"}
          </div>

          <div className="flex flex-wrap gap-1">
            {tokens.map((t) => (
              <button
                key={t.key}
                onClick={() =>
                  setEditValue((v) => `${v} {{${t.key}}}`.trim())
                }
                className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-blue-100 hover:text-blue-700"
              >
                +{t.label}
              </button>
            ))}
          </div>

          <div className="mt-2 flex justify-end gap-1">
            <button
              onClick={() => setEditingId(null)}
              className="rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={commitEdit}
              className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
            >
              저장
            </button>
          </div>
        </div>
      </>
    )}
    </>
  );
}
