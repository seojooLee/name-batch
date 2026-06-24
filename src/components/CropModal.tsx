"use client";

import { useEffect, useRef, useState } from "react";
import { loadImage } from "@/lib/imageUtils";

const VIEW = 280; // crop viewport (square), px
const OUT = 420; // output resolution, px

type Pos = { x: number; y: number };

export default function CropModal({
  src,
  onCancel,
  onConfirm,
}: {
  src: string;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [minScale, setMinScale] = useState(1);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState<Pos>({ x: 0, y: 0 });
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    let alive = true;
    loadImage(src).then((im) => {
      if (!alive) return;
      const ms = Math.max(VIEW / im.width, VIEW / im.height);
      setImg(im);
      setMinScale(ms);
      setScale(ms);
      setPos({ x: (VIEW - im.width * ms) / 2, y: (VIEW - im.height * ms) / 2 });
    });
    return () => {
      alive = false;
    };
  }, [src]);

  function clamp(p: Pos, sc: number): Pos {
    if (!img) return p;
    const dw = img.width * sc;
    const dh = img.height * sc;
    return {
      x: Math.min(0, Math.max(VIEW - dw, p.x)),
      y: Math.min(0, Math.max(VIEW - dh, p.y)),
    };
  }

  function onZoom(next: number) {
    if (!img) return;
    const k = next / scale;
    const cx = VIEW / 2;
    const cy = VIEW / 2;
    const np = { x: cx - (cx - pos.x) * k, y: cy - (cy - pos.y) * k };
    setScale(next);
    setPos(clamp(np, next));
  }

  function onPointerDown(e: React.PointerEvent) {
    drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
    const move = (ev: PointerEvent) => {
      if (!drag.current) return;
      const np = {
        x: drag.current.ox + (ev.clientX - drag.current.sx),
        y: drag.current.oy + (ev.clientY - drag.current.sy),
      };
      setPos(clamp(np, scale));
    };
    const up = () => {
      drag.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function confirm() {
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, OUT, OUT);
    const r = OUT / VIEW;
    ctx.drawImage(
      img,
      pos.x * r,
      pos.y * r,
      img.width * scale * r,
      img.height * scale * r,
    );
    onConfirm(canvas.toDataURL("image/jpeg", 0.9));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-[320px] rounded-lg bg-white p-4 shadow-xl">
        <h3 className="mb-3 text-sm font-semibold text-gray-800">사진 자르기</h3>
        <div
          onPointerDown={onPointerDown}
          className="relative mx-auto cursor-move overflow-hidden rounded bg-gray-100 ring-1 ring-gray-300"
          style={{ width: VIEW, height: VIEW, touchAction: "none" }}
        >
          {img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute select-none"
              style={{
                left: pos.x,
                top: pos.y,
                width: img.width * scale,
                height: img.height * scale,
                maxWidth: "none",
              }}
            />
          )}
          {/* center guide */}
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/60" />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-gray-500">축소</span>
          <input
            type="range"
            min={minScale}
            max={minScale * 4}
            step={0.001}
            value={scale}
            onChange={(e) => onZoom(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-xs text-gray-500">확대</span>
        </div>
        <p className="mt-1 text-center text-[11px] text-gray-400">
          드래그로 위치, 슬라이더로 크기를 맞추세요
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={confirm}
            className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            적용
          </button>
        </div>
      </div>
    </div>
  );
}
