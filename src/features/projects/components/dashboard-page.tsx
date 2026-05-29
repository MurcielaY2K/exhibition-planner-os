"use client";

import Link from "next/link";
import { AppFrame } from "@/components/app-frame";
import { Card } from "@/components/ui/card";
import { useExhibitionStore } from "@/lib/state/use-exhibition-store";
import { formatDimension } from "@/lib/domain/format";

export function DashboardPage() {
  const projects = useExhibitionStore((state) => state.projects);

  return (
    <AppFrame
      title="A precise planning workspace for real exhibition rooms, real walls, and real installation decisions."
      description="Move from room definition to wall placement, installer review, 3D spatial checking, and PDF output without changing tools or losing dimensional trust."
      action={
        <Link
          href="/projects/new"
          className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-strong)]"
        >
          New project
        </Link>
      }
    >
      <section>
        <section className="mt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-strong)]">
                Project List
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Active planning files</h2>
            </div>
            <p className="text-sm text-[var(--muted-strong)]">
              {projects.length} project{projects.length === 1 ? "" : "s"}
            </p>
          </div>

          {projects.length === 0 ? (
            <div className="mt-4 rounded-[24px] border border-dashed border-[var(--line)] bg-[rgba(18,27,37,0.6)] px-8 py-16 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--muted-strong)]">
                No projects yet
              </p>
              <p className="mt-3 text-base leading-7 text-[var(--foreground-soft)]">
                Create your first project to start planning an exhibition.
              </p>
              <div className="mt-6 flex justify-center">
                <Link
                  href="/projects/new"
                  className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-strong)]"
                >
                  New project
                </Link>
              </div>
            </div>
          ) : null}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {projects.map((bundle) => {
              const room = bundle.rooms[0];

              return (
                <Card key={bundle.project.id} className="p-5">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <p className="text-sm font-medium text-[var(--muted-strong)]">
                        {bundle.project.venueName}
                      </p>
                      <h3 className="mt-2 text-2xl font-semibold">
                        {bundle.project.name}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-[var(--muted-strong)]">
                        {room.name} / {formatDimension(room.widthMm)} x{" "}
                        {formatDimension(room.depthMm)} x{" "}
                        {formatDimension(room.heightMm)}
                      </p>
                    </div>

                    <div className="rounded-[18px] border border-black/8 bg-[var(--surface-muted)] px-4 py-3 text-right">
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-strong)]">
                        Artworks
                      </p>
                      <p className="mt-1 text-2xl font-semibold">
                        {bundle.artworks.length}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <RouteLink href={`/projects/${bundle.project.id}`} label="Open project" />
                    <RouteLink href={`/projects/${bundle.project.id}/planner`} label="Open planner" />
                    <RouteLink href={`/projects/${bundle.project.id}/artworks`} label="Artwork library" />
                    <RouteLink href={`/projects/${bundle.project.id}/export`} label="Export center" />
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      </section>
    </AppFrame>
  );
}

function RouteLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-[44px] items-center rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)]"
    >
      {label}
    </Link>
  );
}
