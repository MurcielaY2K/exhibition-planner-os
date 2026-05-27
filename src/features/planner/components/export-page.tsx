"use client";

import { ProjectShell } from "@/components/project-shell";
import { Card } from "@/components/ui/card";
import { formatDimension } from "@/lib/domain/format";
import {
  downloadExhibitionPdf,
  downloadWallElevationPdf,
} from "@/lib/export/wall-elevation-pdf";
import {
  getProjectBundle,
  useExhibitionStore,
} from "@/lib/state/use-exhibition-store";

export function ExportPage({ projectId }: { projectId: string }) {
  const bundle = useExhibitionStore((state) =>
    getProjectBundle(state.projects, projectId),
  );

  if (!bundle) {
    return null;
  }

  const room = bundle.rooms[0];

  function handleDownloadWall(wallId: string) {
    if (!bundle) return;
    const wall = bundle.walls.find((w) => w.id === wallId);
    if (!wall) return;
    downloadWallElevationPdf({
      project: bundle.project,
      wall,
      artworks: bundle.artworks,
      placements: bundle.placements.filter((p) => p.wallId === wallId),
      openings: bundle.openings.filter((o) => o.wallId === wallId),
    });
  }

  function handleDownloadExhibition() {
    if (!bundle) return;
    downloadExhibitionPdf({
      project: bundle.project,
      walls: bundle.walls,
      artworks: bundle.artworks,
      placements: bundle.placements,
      openings: bundle.openings,
      includeCoverPage: true,
      exportedAt: new Date(),
    });
  }

  return (
    <ProjectShell
      project={bundle.project}
      activePath="export"
      title="Export Center"
      description="Download technical wall elevation sheets and full exhibition sets as PDF. Each sheet includes placed artwork positions, dimensions, hanging points, and installer notes."
      stats={[
        { label: "Walls", value: bundle.walls.length.toString() },
        { label: "Placed works", value: bundle.placements.length.toString() },
        { label: "Openings", value: bundle.openings.length.toString() },
        { label: "Venue", value: bundle.project.venueName },
      ]}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-strong)]">
            Full Exhibition
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Exhibition PDF</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted-strong)]">
            All walls in a single PDF with cover page, artwork positions, dimensions, and hanging
            points for every placed work.
          </p>
          <div className="mt-5 space-y-2 text-sm text-[var(--muted-strong)]">
            <p>Venue: {bundle.project.venueName}</p>
            <p>Room: {room.name} — {bundle.walls.length} walls</p>
            <p>
              Dimensions: {formatDimension(room.widthMm)} × {formatDimension(room.depthMm)} ×{" "}
              {formatDimension(room.heightMm)}
            </p>
            <p>Placed artworks: {bundle.placements.length}</p>
          </div>
          <button
            type="button"
            onClick={handleDownloadExhibition}
            disabled={bundle.placements.length === 0}
            className="mt-6 inline-flex min-h-[44px] items-center border border-[var(--accent)] bg-[var(--accent)] px-5 text-sm font-semibold text-black transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Download exhibition PDF
          </button>
        </Card>

        <Card className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-strong)]">
            Wall Sheets
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Per-wall PDFs</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted-strong)]">
            Individual technical elevation sheet for each wall, with artwork labels, positions,
            dimensions, and drill-point annotations.
          </p>
          <div className="mt-5 space-y-2">
            {bundle.walls.map((wall) => {
              const wallPlacements = bundle.placements.filter((p) => p.wallId === wall.id);
              return (
                <div key={wall.id} className="flex items-center justify-between gap-3 border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{wall.name}</p>
                    <p className="text-xs text-[var(--muted-strong)]">
                      {formatDimension(wall.lengthMm)} × {formatDimension(wall.heightMm)} —{" "}
                      {wallPlacements.length} work{wallPlacements.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadWall(wall.id)}
                    disabled={wallPlacements.length === 0}
                    className="min-h-[44px] border border-[var(--line-strong)] px-4 text-sm text-[var(--foreground-soft)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    PDF
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </ProjectShell>
  );
}
