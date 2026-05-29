import Link from "next/link";

export function AppFrame({
  eyebrow = "Exhibition Planner OS",
  title,
  description,
  action,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="safe-top min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 sm:py-5 xl:px-8">
        <div className="rounded-[32px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(20,29,38,0.96)_0%,rgba(11,16,21,0.94)_100%)] px-5 py-5 shadow-[0_28px_90px_rgba(0,0,0,0.34)] sm:px-8 sm:py-6">
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/"
                className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--muted-strong)] transition hover:text-[var(--foreground-soft)]"
              >
                {eyebrow}
              </Link>
              <div className="flex items-center gap-2">{action}</div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
              <div>
                <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
                  {title}
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--foreground-soft)] sm:text-lg">
                  {description}
                </p>
              </div>
              <div className="rounded-[24px] border border-[var(--line)] bg-[rgba(24,34,45,0.84)] px-5 py-4 text-sm leading-6 text-[var(--foreground-soft)]">
                Exhibition Planner OS is built for real gallery and museum decisions:
                room definition, precise placement, installer logic, and professional
                outputs from one authoritative geometry model.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
