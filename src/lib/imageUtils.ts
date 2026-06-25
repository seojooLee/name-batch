/** Read an uploaded image file, downscale it, and return a JPEG data URL.
 * Keeps localStorage small while staying high-res enough for print
 * (1600px across 90mm ≈ 450 DPI). Transparency is flattened onto white. */
export function fileToBackgroundDataUrl(
  file: File,
  maxWidth = 1600,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("캔버스를 만들 수 없습니다"));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 불러올 수 없습니다"));
    };
    img.src = url;
  });
}

/** Like fileToBackgroundDataUrl but for an image served by URL (e.g. a bundled
 * template in /public). Flattens transparency onto white and returns JPEG. */
export async function urlToBackgroundDataUrl(
  url: string,
  maxWidth = 1600,
): Promise<string> {
  const img = await loadImage(url);
  const scale = Math.min(1, maxWidth / img.width);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스를 만들 수 없습니다");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.92);
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 불러올 수 없습니다"));
    img.src = src;
  });
}

/** Render a photo into a box (cover-cropped) with a shape mask, as PNG bytes.
 * Transparent corners let the card background show through (circle/rounded). */
export async function renderPhotoPng(
  dataUrl: string,
  outW: number,
  outH: number,
  shape: "rect" | "rounded" | "circle",
): Promise<Uint8Array> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(outW));
  canvas.height = Math.max(1, Math.round(outH));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스를 만들 수 없습니다");
  const w = canvas.width;
  const h = canvas.height;

  ctx.save();
  if (shape === "circle") {
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.clip();
  } else if (shape === "rounded") {
    const r = Math.min(w, h) * 0.18;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, r);
    ctx.clip();
  }
  const s = Math.max(w / img.width, h / img.height);
  const dw = img.width * s;
  const dh = img.height * s;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  ctx.restore();

  const blob: Blob = await new Promise((res) =>
    canvas.toBlob((b) => res(b as Blob), "image/png"),
  );
  return new Uint8Array(await blob.arrayBuffer());
}

/** Convert a data URL into raw bytes for pdf-lib embedding. */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
