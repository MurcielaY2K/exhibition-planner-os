"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProjectShell } from "@/components/project-shell";
import { Card } from "@/components/ui/card";
import { formatDimension } from "@/lib/domain/format";
import { getProjectBundle, useExhibitionStore } from "@/lib/state/use-exhibition-store";

export function ProjectOverviewPage({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { bundle, selectWall } = useExhibitionStore((state) => ({
    bundle: getProjectBundle(state.projects, projectId),
    selectWall: state.selectWall,
  }));

  if (!bundle) {
    return null;
  }

  const room = bundle.rooms[0];
  const unplacedArtworkCount = Math.max(bundle.artworks.length - bundle.placements.length, 0);

  return (
    <ProjectShell
      project={bundle.project}
      activePath="overview"
      title="Project overview"
      description="A calm, operational snapshot of the exhibition: room envelope, wall activity, artwork progress, and the next actions needed to move from planning into install and export."
      stats={[
        { label: "Room", value: room.name },
        {
          label: "Envelope",
          value: `${formatDimension(room.widthMm)} x ${formatDimension(room.depthMm)} x ${formatDimension(room.heightMm)}`,
        },
        { label: "Artworks", value: bundle.artworks.length.toString() },
        { label: "Placed", value: bundle.placements.length.toString() },
      ]}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-strong)]">
                  Project status
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  Current exhibition envelope
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionLink href={`/projects/${projectId}/planner`} label="Open planner" />
                <ActionLink href={`/projects/${projectId}/artworks`} label="Artwork library" />
                <ActionLink href={`/projects/${projectId}/export`} label="Export center" />
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <MetricCard label="Walls" value={bundle.walls.length.toString()} caption="Generated from the room definition" />
              <MetricCard label="Openings" value={bundle.openings.length.toString()} caption="Doors and windows currently modeled" />
              <MetricCard label="Unplaced works" value={unplacedArtworkCount.toString()} caption="Ready to assign to a wall" />
            </div>
          </Card>

          <Card className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-strong)]">
              Wall summary
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Wall-by-wall activity</h2>
            <div className="mt-5 grid gap-3">
              {bundle.walls.map((wall) => {
                const placements = bundle.placements.filter((placement) => placement.wallId === wall.id);
                const openings = bundle.openings.filter((opening) => opening.wallId === wall.id);

                return (
                  <div
                    key={wall.id}
                    className="grid gap-4 rounded-[22px] border border-black/8 bg-[var(--surface-muted)] px-5 py-4 md:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]"
                  >
                    <div>
                      <p className="text-lg font-semibold">{wall.name}</p>
                      <p className="mt-1 text-sm text-[var(--muted-strong)]">
                        {formatDimension(wall.lengthMm)} long / {formatDimension(wall.heightMm)} high
                      </p>
                    </div>
                    <MiniMetric label="Artworks" value={placements.length.toString()} />
                    <MiniMetric label="Openings" value={openings.length.toString()} />
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          selectWall(projectId, wall.id);
                          router.push(`/projects/${projectId}/planner`);
                        }}
                        className="inline-flex min-h-[44px] items-center rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-2 text-sm font-medium text-[var(--foreground-soft)] transition hover:bg-[var(--surface-muted)]"
                      >
                        Review wall
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-strong)]">
              Next steps
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Recommended workflow</h2>
            <ol className="mt-5 space-y-3 text-sm leading-6 text-[var(--muted-strong)]">
              <li>1. Refine room, wall, and opening geometry in the planner.</li>
              <li>2. Complete artwork records with exact physical dimensions.</li>
              <li>3. Review 2D and 3D placement together before exporting installer sheets.</li>
            </ol>
          </Card>

          <Card className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-strong)]">
              Project details
            </p>
            <h2 className="mt-2 text-2xl font-semibold">{bundle.project.name}</h2>
            <div className="mt-5 space-y-3 text-sm leading-6 text-[var(--muted-strong)]">
              <p>Venue: {bundle.project.venueName}</p>
              <p>Updated: {new Date(bundle.project.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
              <p>Room: {room.name}</p>
              <p>Planner model: authoritative mm-based geometry across 2D, installer checks, and export.</p>
            </div>
          </Card>
        </div>
      </div>
    </ProjectShell>
  );
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-[44px] items-center rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-2 text-sm font-medium text-[var(--foreground-soft)] transition hover:bg-[var(--surface-muted)]"
    >
      {label}
    </Link>
  );
}

function MetricCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="rounded-[22px] border border-[var(--line)] bg-[var(--surface-muted)] px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-strong)]">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.03em]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--foreground-soft)]">{caption}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-strong)]">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}
