import type { Metadata } from "next";
import { Nav } from "@/features/ophelia/components/nav";
import { BottomNav } from "@/features/ophelia/components/bottom-nav";

export const metadata: Metadata = {
  title: "OPHELIA — Your Eye Is Valid",
  description:
    "Rate Bangkok's art, exhibitions and cultural events. Your take counts.",
};

export default function OpheliaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      {/* pb-20 on mobile so bottom nav doesn't cover content; removed on sm+ */}
      <main className="flex-1 pb-20 sm:pb-0">{children}</main>
      <footer
        className="mt-auto hidden border-t px-6 py-8 sm:block"
        style={{ borderColor: "var(--line)" }}
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <span
            className="text-xs font-black uppercase tracking-[0.22em]"
            style={{ color: "var(--accent-strong)" }}
          >
            OPHELIA
          </span>
          <p
            className="text-center text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: "var(--muted-strong)" }}
          >
            Your eye is valid.
          </p>
          <p
            className="text-[10px]"
            style={{ color: "var(--muted-strong)", opacity: 0.5 }}
          >
            Bangkok art culture — rated by everyone
          </p>
        </div>
      </footer>
      <BottomNav />
    </div>
  );
}
