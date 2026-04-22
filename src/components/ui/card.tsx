import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[28px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_24px_70px_rgba(0,0,0,0.28)] ${className}`}
    >
      {children}
    </div>
  );
}
