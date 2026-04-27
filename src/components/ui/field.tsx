import type { ReactNode } from "react";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-strong)]">
          {label}
        </span>
        {hint ? (
          <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted-strong)]">
            {hint}
          </span>
        ) : null}
      </div>
      {children}
    </label>
  );
}

export const inputClassName =
  "w-full rounded-[14px] border border-[var(--line)] bg-[rgba(21,30,40,0.9)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-strong)] focus:border-[var(--accent)] focus:bg-[var(--surface)]";
