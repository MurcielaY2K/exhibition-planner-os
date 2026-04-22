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
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 sm:py-5 xl:px-8">
        <div className="rounded-[32px] border border-black/8 bg-[linear-gradient(180deg,rgba(248,244,236,0.92)_0%,rgba(238,231,219,0.88)_100%)] px-5 py-5 shadow-[0_20px_70px_rgba(31,27,22,0.08)] sm:px-8 sm:py-6">
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/"
                className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--muted-strong)] transition hover:text-[var(--foreground)]"
              >
                {eyebrow}
              </Link>
              <div className="flex items-center gap-2">{action}</div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
              <div>
                <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
                  {title}
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--muted-strong)] sm:text-lg">
                  {description}
                </p>
              </div>
              <div className="rounded-[24px] border border-black/8 bg-[rgba(255,255,255,0.74)] px-5 py-4 text-sm leading-6 text-[var(--muted-strong)]">
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
