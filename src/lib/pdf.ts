import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { Company, Employee, Template, PhotoShape } from "./types";
import { PT_PER_MM } from "./constants";
import { loadFonts, getBaselineRatio } from "./fonts";
import { buildContext, resolveText } from "./tokens";
import { dataUrlToBytes, renderPhotoPng } from "./imageUtils";

export type ExportLayout = "card" | "a4";

function hexToRgb(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return rgb(0, 0, 0);
  const n = parseInt(m[1], 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

const A4_W_MM = 210;
const A4_H_MM = 297;

/** Generate one PDF with every employee's front + back card. */
export async function generateBatchPdf(
  template: Template,
  company: Company,
  employees: Employee[],
  layout: ExportLayout = "card",
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const { regular, bold } = await loadFonts();
  // subset:false — Apple's renderer (Preview/Quick Look) drops glyphs from
  // pdf-lib's subsetted fonts. Embedding the full font renders everywhere.
  const fontRegular = await doc.embedFont(regular, { subset: false });
  const fontBold = await doc.embedFont(bold, { subset: false });

  // Place the PDF text baseline exactly where the browser preview does.
  const baselineRatio = await getBaselineRatio();

  const bgFront = template.bgFront
    ? await doc.embedJpg(dataUrlToBytes(template.bgFront))
    : null;
  const bgBack = template.bgBack
    ? await doc.embedJpg(dataUrlToBytes(template.bgBack))
    : null;

  const cardW = template.widthMm * PT_PER_MM;
  const cardH = template.heightMm * PT_PER_MM;

  // Embed each unique (photo, box-size, shape) only once.
  const photoCache = new Map<string, PDFImage>();
  const PX_PER_MM_PRINT = 300 / 25.4; // ~300 DPI
  async function embedPhotoForBox(
    dataUrl: string,
    wMm: number,
    hMm: number,
    shape: PhotoShape,
  ): Promise<PDFImage> {
    const key = `${dataUrl}::${wMm}x${hMm}::${shape}`;
    const hit = photoCache.get(key);
    if (hit) return hit;
    const png = await renderPhotoPng(
      dataUrl,
      wMm * PX_PER_MM_PRINT,
      hMm * PX_PER_MM_PRINT,
      shape,
    );
    const img = await doc.embedPng(png);
    photoCache.set(key, img);
    return img;
  }

  /** Draw one card side onto a page. (originX, cardTopY) is the card's
   * top-left measured from the page's top-left. */
  async function drawCard(
    page: PDFPage,
    pageH: number,
    originX: number,
    cardTopY: number,
    side: "front" | "back",
    emp: Employee,
  ) {
    const ctx = buildContext(company, emp);
    const bg = side === "front" ? bgFront : bgBack;
    if (bg) {
      page.drawImage(bg, {
        x: originX,
        y: pageH - cardTopY - cardH,
        width: cardW,
        height: cardH,
      });
    }
    for (const f of template.fields.filter((f) => f.side === side)) {
      if (f.kind === "photo") {
        if (!emp.photo) continue;
        const wMm = f.w ?? 22;
        const hMm = f.h ?? 28;
        const img = await embedPhotoForBox(emp.photo, wMm, hMm, f.shape ?? "rect");
        const boxW = wMm * PT_PER_MM;
        const boxH = hMm * PT_PER_MM;
        page.drawImage(img, {
          x: originX + f.x * PT_PER_MM,
          y: pageH - cardTopY - f.y * PT_PER_MM - boxH,
          width: boxW,
          height: boxH,
        });
        continue;
      }
      const text = resolveText(f.text, ctx);
      if (!text.trim()) continue;
      const font: PDFFont = f.bold ? fontBold : fontRegular;
      const size = f.fontSize;
      const widthPt = font.widthOfTextAtSize(text, size);
      const anchorX = originX + f.x * PT_PER_MM;
      let x = anchorX;
      if (f.align === "center") x = anchorX - widthPt / 2;
      else if (f.align === "right") x = anchorX - widthPt;
      const y = pageH - (cardTopY + f.y * PT_PER_MM + size * baselineRatio);
      page.drawText(text, { x, y, size, font, color: hexToRgb(f.color) });
    }
  }

  const hasBack =
    !!template.bgBack || template.fields.some((f) => f.side === "back");

  if (layout === "card") {
    // One card per page, sized exactly to the card (for print shops).
    for (const emp of employees) {
      const sides: ("front" | "back")[] = hasBack ? ["front", "back"] : ["front"];
      for (const side of sides) {
        const page = doc.addPage([cardW, cardH]);
        await drawCard(page, cardH, 0, 0, side, emp);
      }
    }
  } else {
    // A4 imposition: tile cards onto A4 sheets for a home/office printer.
    const A4W = A4_W_MM * PT_PER_MM;
    const A4H = A4_H_MM * PT_PER_MM;
    const margin = 8 * PT_PER_MM;
    const gap = 4 * PT_PER_MM;
    const cols = Math.max(1, Math.floor((A4W - 2 * margin + gap) / (cardW + gap)));
    const rows = Math.max(1, Math.floor((A4H - 2 * margin + gap) / (cardH + gap)));
    const perPage = cols * rows;
    const gridW = cols * cardW + (cols - 1) * gap;
    const gridH = rows * cardH + (rows - 1) * gap;
    const offX = (A4W - gridW) / 2;
    const offY = (A4H - gridH) / 2; // from top

    const slotX = (c: number) => offX + c * (cardW + gap);
    const slotTopY = (r: number) => offY + r * (cardH + gap);

    // One cell per card side, front immediately followed by its back, so each
    // card's front and back sit next to each other on the sheet.
    const cells: { emp: Employee; side: "front" | "back" }[] = [];
    for (const emp of employees) {
      cells.push({ emp, side: "front" });
      if (hasBack) cells.push({ emp, side: "back" });
    }

    for (let start = 0; start < cells.length; start += perPage) {
      const group = cells.slice(start, start + perPage);
      const page = doc.addPage([A4W, A4H]);
      for (let i = 0; i < group.length; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        page.drawRectangle({
          x: slotX(c),
          y: A4H - slotTopY(r) - cardH,
          width: cardW,
          height: cardH,
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 0.5,
        });
        await drawCard(page, A4H, slotX(c), slotTopY(r), group[i].side, group[i].emp);
      }
    }
  }

  return doc.save();
}
