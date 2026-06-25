import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Align, Company, Employee, Field, Side, Template } from "./types";
import { RAON_TAG } from "./constants";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

/** Field layout for the Raon name-tag (150×60mm), matching the bundled
 * template: circular photo left, department/name/title white text on the right.
 * Applied to both sides so double-sided prints look identical. */
export function raonFields(): Field[] {
  const fields: Field[] = [];
  for (const side of ["front", "back"] as Side[]) {
    fields.push(
      { id: uid(), side, kind: "photo", text: "", x: 11.36, y: 11.2, w: 37.6, h: 37.6, shape: "circle", fontSize: 9, bold: false, color: "#111111", align: "left" },
      { id: uid(), side, text: "{{department}}", x: 60, y: 17, fontSize: 15, bold: false, color: "#cfd4de", align: "left" },
      { id: uid(), side, text: "{{name}}", x: 60, y: 27, fontSize: 34, bold: true, color: "#ffffff", align: "left" },
      { id: uid(), side, text: "{{title}}", x: 98, y: 31, fontSize: 20, bold: false, color: "#ffffff", align: "left" },
    );
  }
  return fields;
}

function sampleEmployees(): Employee[] {
  return [
    {
      id: uid(),
      data: {
        name: "홍길동", nameEn: "Gildong Hong", title: "팀장", titleEn: "Team Lead",
        department: "전략기획팀", departmentEn: "Strategy Planning",
        phone: "02-1234-5678", mobile: "010-1234-5678", email: "gildong@company.com",
      },
    },
    {
      id: uid(),
      data: {
        name: "김영희", nameEn: "Younghee Kim", title: "대리", titleEn: "Associate",
        department: "마케팅팀", departmentEn: "Marketing",
        phone: "02-1234-5679", mobile: "010-9876-5432", email: "younghee@company.com",
      },
    },
  ];
}

const defaultCompany: Company = {
  companyName: "(주)회사이름",
  companyEn: "Company Inc.",
  address: "서울특별시 강남구 테헤란로 123",
  addressEn: "123 Teheran-ro, Gangnam-gu, Seoul",
  tel: "02-1234-5678",
  fax: "02-1234-5670",
  website: "www.company.com",
};

interface StoreState {
  template: Template;
  company: Company;
  employees: Employee[];
  activeSide: Side;
  selectedFieldId: string | null;
  selectedEmployeeId: string | null;

  setActiveSide: (s: Side) => void;
  selectField: (id: string | null) => void;
  selectEmployee: (id: string | null) => void;

  setCardSize: (widthMm: number, heightMm: number) => void;
  setBackground: (side: Side, dataUrl: string | null) => void;
  addField: (side: Side, text: string) => void;
  addPhotoField: (side: Side) => void;
  updateField: (id: string, patch: Partial<Field>) => void;
  moveField: (id: string, x: number, y: number) => void;
  removeField: (id: string) => void;
  replaceFields: (fields: Field[]) => void;

  setCompany: (key: string, value: string) => void;
  addEmployee: (data: Record<string, string>) => void;
  updateEmployee: (id: string, data: Record<string, string>) => void;
  setEmployeePhoto: (id: string, photo: string | null) => void;
  removeEmployee: (id: string) => void;
  appendEmployees: (list: Employee[]) => void;
  replaceEmployees: (list: Employee[]) => void;

  resetAll: () => void;
}

/** App default: the Raon name-tag. The background image is loaded on mount
 * (it needs a browser to fetch+convert the PNG to a JPEG data URL). */
function initialTemplate(): Template {
  return {
    widthMm: RAON_TAG.w,
    heightMm: RAON_TAG.h,
    bgFront: null,
    bgBack: null,
    fields: raonFields(),
  };
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      template: initialTemplate(),
      company: { ...defaultCompany },
      employees: sampleEmployees(),
      activeSide: "front",
      selectedFieldId: null,
      selectedEmployeeId: null,

      setActiveSide: (s) => set({ activeSide: s, selectedFieldId: null }),
      selectField: (id) => set({ selectedFieldId: id }),
      selectEmployee: (id) => set({ selectedEmployeeId: id }),

      setCardSize: (widthMm, heightMm) =>
        set((st) => ({
          template: { ...st.template, widthMm, heightMm },
        })),

      setBackground: (side, dataUrl) =>
        set((st) => ({
          template: {
            ...st.template,
            [side === "front" ? "bgFront" : "bgBack"]: dataUrl,
          },
        })),

      addField: (side, text) =>
        set((st) => {
          const id = uid();
          return {
            selectedFieldId: id,
            template: {
              ...st.template,
              fields: [
                ...st.template.fields,
                {
                  id, side, text,
                  x: st.template.widthMm / 2,
                  y: st.template.heightMm / 2,
                  fontSize: 9, bold: false, color: "#111111",
                  align: "center" as Align,
                },
              ],
            },
          };
        }),

      addPhotoField: (side) =>
        set((st) => {
          const id = uid();
          return {
            selectedFieldId: id,
            template: {
              ...st.template,
              fields: [
                ...st.template.fields,
                {
                  id, side, kind: "photo" as const, text: "",
                  x: st.template.widthMm / 2 - 11,
                  y: st.template.heightMm / 2 - 14,
                  w: 22, h: 28, shape: "rect" as const,
                  fontSize: 9, bold: false, color: "#111111",
                  align: "left" as Align,
                },
              ],
            },
          };
        }),

      updateField: (id, patch) =>
        set((st) => ({
          template: {
            ...st.template,
            fields: st.template.fields.map((f) =>
              f.id === id ? { ...f, ...patch } : f,
            ),
          },
        })),

      moveField: (id, x, y) =>
        set((st) => ({
          template: {
            ...st.template,
            fields: st.template.fields.map((f) =>
              f.id === id ? { ...f, x, y } : f,
            ),
          },
        })),

      removeField: (id) =>
        set((st) => ({
          selectedFieldId: null,
          template: {
            ...st.template,
            fields: st.template.fields.filter((f) => f.id !== id),
          },
        })),

      replaceFields: (fields) =>
        set((st) => ({
          selectedFieldId: null,
          template: { ...st.template, fields },
        })),

      setCompany: (key, value) =>
        set((st) => ({ company: { ...st.company, [key]: value } })),

      addEmployee: (data) =>
        set((st) => {
          const emp = { id: uid(), data };
          return { employees: [...st.employees, emp], selectedEmployeeId: emp.id };
        }),

      updateEmployee: (id, data) =>
        set((st) => ({
          employees: st.employees.map((e) => (e.id === id ? { ...e, data } : e)),
        })),

      setEmployeePhoto: (id, photo) =>
        set((st) => ({
          employees: st.employees.map((e) =>
            e.id === id ? { ...e, photo: photo ?? undefined } : e,
          ),
        })),

      removeEmployee: (id) =>
        set((st) => ({
          employees: st.employees.filter((e) => e.id !== id),
          selectedEmployeeId:
            st.selectedEmployeeId === id ? null : st.selectedEmployeeId,
        })),

      appendEmployees: (list) =>
        set((st) => ({ employees: [...st.employees, ...list] })),

      replaceEmployees: (list) =>
        set({ employees: list, selectedEmployeeId: null }),

      resetAll: () =>
        set({
          template: initialTemplate(),
          company: { ...defaultCompany },
          employees: sampleEmployees(),
          activeSide: "front",
          selectedFieldId: null,
          selectedEmployeeId: null,
        }),
    }),
    { name: "namecard-batch", version: 1 },
  ),
);
