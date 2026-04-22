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
      className={`rounded-[28px] border border-black/8 bg-white shadow-[0_18px_60px_rgba(37,33,28,0.06)] ${className}`}
    >
      {children}
    </div>
  );
}
