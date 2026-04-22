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
      <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 sm:py-6 xl:px-8">
        <Card className="overflow-hidden border-[var(--line-strong)] bg-[linear-gradient(180deg,rgba(19,27,35,0.96)_0%,rgba(11,16,21,0.92)_100%)] px-5 py-5 sm:px-8 sm:py-6">
          <div className="grid gap-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-4xl">
                <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted-strong)]">
                  <Link href="/" className="transition hover:text-[var(--foreground)]">
                    Dashboard
                  </Link>
                  <span>/</span>
                  <span>{project.name}</span>
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.32em] text-[var(--muted-strong)]">
                  {project.venueName}
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                  {title}
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--foreground-soft)]">
                  {description}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[320px]">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-[20px] border border-[var(--line)] bg-[rgba(24,34,45,0.84)] px-4 py-3"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-strong)]">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-base font-semibold text-[var(--foreground)]">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
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
                label="Artwork Library"
              />
              <NavButton
                href={`${baseHref}/export`}
                isActive={activePath === "export"}
                label="Export Center"
              />
            </div>
          </div>
        </Card>

        <div className="mt-6">{children}</div>
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
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
        isActive
          ? "bg-[var(--accent)] text-[#051017]"
          : "border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--foreground-soft)] hover:bg-[var(--surface-muted)]"
      }`}
    >
      {label}
    </Link>
  );
}
