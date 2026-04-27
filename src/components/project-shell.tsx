import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { Project } from "@/lib/domain/types";

export function ProjectShell({
  project,
  activePath,
  title,
  description,
  stats = [],
  children,
}: {
  project: Project;
  activePath: "overview" | "planner" | "artworks" | "export";
  title: string;
  description: string;
  stats?: Array<{ label: string; value: string }>;
  children: React.ReactNode;
}) {
  const baseHref = `/projects/${project.id}`;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-[1720px] px-3 py-3 sm:px-5 sm:py-5 xl:px-6">
        <div className="grid gap-4 xl:grid-cols-[272px_minmax(0,1fr)]">
          <aside className="xl:sticky xl:top-5 xl:h-[calc(100svh-40px)]">
            <Card className="flex h-full flex-col overflow-hidden p-4 sm:p-5">
              <div className="flex items-center gap-3 rounded-[18px] border border-[var(--line)] bg-[rgba(18,27,37,0.88)] px-4 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-[rgba(77,142,163,0.14)] text-sm font-semibold text-[var(--accent)]">
                  EP
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold uppercase tracking-[0.28em] text-[var(--foreground-soft)]">
                    {project.venueName}
                  </p>
                  <p className="mt-1 truncate text-sm text-[var(--muted-strong)]">
                    Exhibition Planner OS
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-[18px] border border-[var(--line)] bg-[rgba(18,27,37,0.82)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-strong)]">
                  Active project
                </p>
                <p className="mt-2 text-base font-semibold text-[var(--foreground)]">
                  {project.name}
                </p>
              </div>

              <nav className="mt-5 grid gap-2">
                <NavButton
                  href={baseHref}
                  isActive={activePath === "overview"}
                  label="Overview"
                />
                <NavButton
                  href={`${baseHref}/planner`}
                  isActive={activePath === "planner"}
                  label="Planner"
                />
                <NavButton
                  href={`${baseHref}/artworks`}
                  isActive={activePath === "artworks"}
                  label="Artworks"
                />
                <NavButton
                  href={`${baseHref}/export`}
                  isActive={activePath === "export"}
                  label="Exports"
                />
              </nav>

              <div className="mt-auto grid gap-3 pt-5">
                {stats.length > 0 ? (
                  <div className="rounded-[20px] border border-[var(--line)] bg-[rgba(18,27,37,0.82)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-strong)]">
                      Project status
                    </p>
                    <div className="mt-4 space-y-3">
                      {stats.slice(0, 4).map((stat) => (
                        <div
                          key={stat.label}
                          className="flex items-center justify-between gap-4 text-sm"
                        >
                          <span className="text-[var(--muted-strong)]">{stat.label}</span>
                          <span className="font-medium text-[var(--foreground)]">{stat.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="rounded-[20px] border border-[var(--line)] bg-[rgba(18,27,37,0.82)] p-4">
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {project.status === "draft" ? "Draft project" : project.status}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted-strong)]">Status</p>
                </div>
              </div>
            </Card>
          </aside>

          <section className="min-w-0 space-y-4">
            <Card className="overflow-hidden px-5 py-5 sm:px-7 sm:py-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 max-w-4xl">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted-strong)]">
                    <Link href="/" className="transition hover:text-[var(--foreground)]">
                      Dashboard
                    </Link>
                    <span>/</span>
                    <span>{project.name}</span>
                  </div>
                  <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)] sm:text-4xl">
                    {title}
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--foreground-soft)] sm:text-base">
                    {description}
                  </p>
                </div>

                {stats.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
                    {stats.map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-[18px] border border-[var(--line)] bg-[rgba(18,27,37,0.82)] px-4 py-3"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-strong)]">
                          {stat.label}
                        </p>
                        <p className="mt-2 text-base font-semibold text-[var(--foreground)]">
                          {stat.value}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </Card>

            {children}
          </section>
        </div>
      </div>
    </main>
  );
}

function NavButton({
  href,
  label,
  isActive,
}: {
  href: string;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center rounded-[16px] px-4 py-3 text-sm font-medium transition ${
        isActive
          ? "border border-[rgba(95,169,193,0.28)] bg-[rgba(77,142,163,0.24)] text-[var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
          : "border border-transparent text-[var(--foreground-soft)] hover:border-[var(--line)] hover:bg-[rgba(18,27,37,0.72)]"
      }`}
    >
      {label}
    </Link>
  );
}
