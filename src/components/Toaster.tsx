"use client";

import { useToast } from "@/lib/toast";

export default function Toaster() {
  const toasts = useToast((s) => s.toasts);
  const dismiss = useToast((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[70] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto max-w-sm whitespace-pre-line rounded-lg px-4 py-2.5 text-left text-sm font-medium text-white shadow-lg ${
            t.type === "error"
              ? "bg-red-600"
              : t.type === "success"
                ? "bg-emerald-600"
                : "bg-gray-900"
          }`}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
