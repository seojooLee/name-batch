/**
 * Korean fonts for both the on-screen preview (FontFace) and the exported PDF
 * (pdf-lib embedding). Served locally from /public/fonts so it works offline
 * and avoids CDN/CORS issues.
 *
 * Malgun Gothic (맑은 고딕) is a glyf-based TrueType font: pdf-lib embeds it and
 * Apple's renderer (Preview/Quick Look) shows every glyph cleanly. The files
 * are large (~13MB each) so the embedded font dominates the exported PDF size.
 * (Pretendard's OTF/CFF outlines crash pdf-lib's subsetter with "Not a CFF Font".)
 */
export const FONT_FAMILY = "MalgunGothic";

const URLS = {
  regular: "/fonts/MalgunGothic-Regular.ttf",
  bold: "/fonts/MalgunGothic-Bold.ttf",
};

export interface FontBytes {
  regular: ArrayBuffer;
  bold: ArrayBuffer;
}

let fontsPromise: Promise<FontBytes> | null = null;

/** Fetch (and cache) the raw font bytes used by the PDF exporter. */
export function loadFonts(): Promise<FontBytes> {
  if (!fontsPromise) {
    fontsPromise = Promise.all([
      fetch(URLS.regular).then((r) => {
        if (!r.ok) throw new Error("폰트를 불러오지 못했습니다 (regular)");
        return r.arrayBuffer();
      }),
      fetch(URLS.bold).then((r) => {
        if (!r.ok) throw new Error("폰트를 불러오지 못했습니다 (bold)");
        return r.arrayBuffer();
      }),
    ]).then(([regular, bold]) => ({ regular, bold }));
  }
  return fontsPromise;
}

/**
 * The PDF must place its text baseline exactly where the browser preview does.
 * We measure the real CSS baseline (with line-height:1) in the DOM so the PDF
 * matches regardless of which font metrics the browser chooses.
 *
 * Returns the baseline distance from the line-box top, as a fraction of font size.
 */
export async function getBaselineRatio(): Promise<number> {
  const FALLBACK = 0.844;
  try {
    await ensurePreviewFonts();
    if (document.fonts?.load) await document.fonts.load(`100px ${FONT_FAMILY}`);
    const wrap = document.createElement("div");
    wrap.style.cssText = `position:absolute;left:-9999px;top:-9999px;visibility:hidden;font-family:${FONT_FAMILY},sans-serif;font-size:100px;line-height:1;white-space:nowrap;`;
    wrap.appendChild(document.createTextNode("가힣Ag1"));
    const strut = document.createElement("span");
    // A zero-height baseline-aligned box: its top edge sits on the baseline.
    strut.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline;";
    wrap.appendChild(strut);
    document.body.appendChild(wrap);
    const ratio =
      (strut.getBoundingClientRect().top - wrap.getBoundingClientRect().top) / 100;
    document.body.removeChild(wrap);
    return ratio > 0.5 && ratio < 1.2 ? ratio : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

let previewPromise: Promise<void> | null = null;

/** Register the same font with the browser so the preview matches the PDF. */
export function ensurePreviewFonts(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  if (!previewPromise) {
    previewPromise = loadFonts()
      .then(async ({ regular, bold }) => {
        const faces = [
          new FontFace(FONT_FAMILY, regular.slice(0), { weight: "400" }),
          new FontFace(FONT_FAMILY, bold.slice(0), { weight: "700" }),
        ];
        const loaded = await Promise.all(faces.map((f) => f.load()));
        loaded.forEach((f) => document.fonts.add(f));
      })
      .catch(() => {
        // Non-fatal: preview falls back to a system font.
      });
  }
  return previewPromise;
}
