import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Align, Company, Employee, Field, Side, Template } from "./types";
import { CARD_W_MM, CARD_H_MM } from "./constants";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

function defaultFields(): Field[] {
  return [
    // Front (Korean)
    { id: uid(), side: "front", text: "{{companyName}}", x: 8, y: 7, fontSize: 8, bold: true, color: "#2563eb", align: "left" },
    { id: uid(), side: "front", text: "{{name}}", x: 8, y: 22, fontSize: 15, bold: true, color: "#111111", align: "left" },
    { id: uid(), side: "front", text: "{{department}} {{title}}", x: 8, y: 31, fontSize: 8, bold: false, color: "#555555", align: "left" },
    { id: uid(), side: "front", text: "M. {{mobile}}", x: 8, y: 39, fontSize: 7, bold: false, color: "#333333", align: "left" },
    { id: uid(), side: "front", text: "{{email}}", x: 8, y: 44, fontSize: 7, bold: false, color: "#333333", align: "left" },
    // Back (English)
    { id: uid(), side: "back", text: "{{companyEn}}", x: 8, y: 7, fontSize: 8, bold: true, color: "#2563eb", align: "left" },
    { id: uid(), side: "back", text: "{{nameEn}}", x: 8, y: 22, fontSize: 15, bold: true, color: "#111111", align: "left" },
    { id: uid(), side: "back", text: "{{titleEn}}, {{departmentEn}}", x: 8, y: 31, fontSize: 8, bold: false, color: "#555555", align: "left" },
    { id: uid(), side: "back", text: "M. {{mobile}}", x: 8, y: 39, fontSize: 7, bold: false, color: "#333333", align: "left" },
    { id: uid(), side: "back", text: "{{email}}", x: 8, y: 44, fontSize: 7, bold: false, color: "#333333", align: "left" },
  ];
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

  setCompany: (key: string, value: string) => void;
  addEmployee: (data: Record<string, string>) => void;
  updateEmployee: (id: string, data: Record<string, string>) => void;
  setEmployeePhoto: (id: string, photo: string | null) => void;
  removeEmployee: (id: string) => void;
  appendEmployees: (list: Employee[]) => void;
  replaceEmployees: (list: Employee[]) => void;

  resetAll: () => void;
}

function initialTemplate(): Template {
  return {
    widthMm: CARD_W_MM,
    heightMm: CARD_H_MM,
    bgFront: null,
    bgBack: null,
    fields: defaultFields(),
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
