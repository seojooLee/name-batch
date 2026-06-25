"use client";

import { useRef } from "react";
import { useStore } from "@/lib/store";
import { PX_PER_MM, px, fontPx, round2 } from "@/lib/constants";
import { buildContext, resolveText } from "@/lib/tokens";
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

  const ref = useRef<HTMLDivElement>(null);

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
      moveField(field.id, clamp(ox + dx, 0, W), clamp(oy + dy, 0, H));
    };
    const up = () => {
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
      updateField(field.id, {
        w: round2(clamp(ow + dw, 5, W - field.x)),
        h: round2(clamp(oh + dh, 5, H - field.y)),
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
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
            title={f.text}
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
              fontFamily: "MalgunGothic, 'Malgun Gothic', sans-serif",
              opacity: isEmpty ? 0.7 : 1,
            }}
          >
            {isEmpty ? f.text : resolved}
          </div>
        );
      })}

      {/* trim-size hint */}
      <div className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/40 px-1 text-[9px] text-white">
        {W}×{H}mm
      </div>
    </div>
  );
}
