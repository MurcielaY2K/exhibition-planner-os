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
      className={`rounded-[24px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(15,21,28,0.94)_0%,rgba(11,16,21,0.94)_100%)] shadow-[0_22px_72px_rgba(0,0,0,0.28)] backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}
