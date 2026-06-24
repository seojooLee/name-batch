export type Side = "front" | "back";
export type Align = "left" | "center" | "right";

export type FieldKind = "text" | "photo";
export type PhotoShape = "rect" | "rounded" | "circle";

export interface Field {
  id: string;
  side: Side;
  /** "text" (default) renders text; "photo" renders the employee's photo. */
  kind?: FieldKind;
  /** Template text, may contain {{token}} placeholders, e.g. "{{department}} {{title}}" */
  text: string;
  /** Anchor position in mm from the top-left of the card. */
  x: number;
  y: number;
  /** Photo box size in mm (photo fields only). */
  w?: number;
  h?: number;
  /** Photo mask shape (photo fields only). */
  shape?: PhotoShape;
  /** Font size in points (print unit). */
  fontSize: number;
  bold: boolean;
  /** Hex color, e.g. "#111111". */
  color: string;
  align: Align;
}

export interface Template {
  widthMm: number;
  heightMm: number;
  /** Background image as a JPEG data URL, or null for plain white. */
  bgFront: string | null;
  bgBack: string | null;
  fields: Field[];
}

export interface Employee {
  id: string;
  /** Arbitrary key -> value, keys become {{token}} names. */
  data: Record<string, string>;
  /** Optional photo as a JPEG data URL (for photo fields). */
  photo?: string;
}

/** Company-level constants shared by every card (also usable as {{tokens}}). */
export type Company = Record<string, string>;
