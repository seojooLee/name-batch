export const CARD_W_MM = 90;
export const CARD_H_MM = 50;

/** Preview scale: screen pixels per millimetre. */
export const PX_PER_MM = 4;

/** Unit conversions. */
export const PT_PER_MM = 72 / 25.4; // points per millimetre
export const MM_PER_PT = 25.4 / 72; // millimetres per point

/** Round a millimetre value to 2 decimal places. */
export const round2 = (n: number) => Math.round(n * 100) / 100;

/** mm -> preview pixels. */
export const px = (mm: number) => mm * PX_PER_MM;
/** font points -> preview pixels. */
export const fontPx = (pt: number) => pt * MM_PER_PT * PX_PER_MM;

/** Product size presets (mm). Drives the card/preview/PDF dimensions. */
export const PRODUCT_PRESETS: { id: string; label: string; w: number; h: number }[] = [
  { id: "card-h", label: "명함 (가로) 90×50", w: 90, h: 50 },
  { id: "card-v", label: "명함 (세로) 50×90", w: 50, h: 90 },
  { id: "badge-card", label: "사원증/이름표 86×54", w: 86, h: 54 },
  { id: "tag-h", label: "이름표 (가로) 100×70", w: 100, h: 70 },
  { id: "tag-v", label: "이름표 (세로) 70×100", w: 70, h: 100 },
];

/** Branded preset: Raon name-tag. Selecting it auto-sets the bundled template
 * background on both sides and resizes the card to the tag's dimensions. */
export const RAON_TAG = {
  id: "raon-tag",
  label: "라온 네임택 150×60",
  w: 150,
  h: 60,
  bg: "/raon_template.png",
};

/** Known employee-level fields (per person). key -> Korean label. */
export const EMPLOYEE_FIELDS: { key: string; label: string }[] = [
  { key: "name", label: "이름" },
  { key: "nameEn", label: "영문이름" },
  { key: "title", label: "직급" },
  { key: "titleEn", label: "영문직급" },
  { key: "department", label: "부서" },
  { key: "departmentEn", label: "영문부서" },
  { key: "phone", label: "직통" },
  { key: "mobile", label: "휴대폰" },
  { key: "email", label: "이메일" },
];

/** Known company-level fields (shared). key -> Korean label. */
export const COMPANY_FIELDS: { key: string; label: string }[] = [
  { key: "companyName", label: "회사명" },
  { key: "companyEn", label: "영문회사명" },
  { key: "address", label: "주소" },
  { key: "addressEn", label: "영문주소" },
  { key: "tel", label: "대표전화" },
  { key: "fax", label: "팩스" },
  { key: "website", label: "웹사이트" },
];

export const FIELD_LABELS: Record<string, string> = Object.fromEntries(
  [...EMPLOYEE_FIELDS, ...COMPANY_FIELDS].map((f) => [f.key, f.label]),
);
