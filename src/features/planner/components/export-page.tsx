"use client";

import { ProjectShell } from "@/components/project-shell";
import { Card } from "@/components/ui/card";
import { formatDimension } from "@/lib/domain/format";
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

  return (
    <ProjectShell
      project={bundle.project}
      activePath="export"
      title="Export Center"
      description="The export route holds the current PDF workflow as a first-class product surface: active wall sheets, full exhibition sets, and installer-facing technical output from the same planning model."
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
            Planned Outputs
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Next export slice</h2>
          <ul className="mt-5 space-y-3 text-sm leading-6 text-[var(--muted-strong)]">
            <li>Wall-by-wall PDF elevations with artwork labels and dimensions</li>
            <li>One floor-plan PDF with placed artwork positions</li>
            <li>Optional artwork list grouped by wall</li>
            <li>Export presets for page size and layout standards</li>
          </ul>
        </Card>

        <Card className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-strong)]">
            Current Project Summary
          </p>
          <h2 className="mt-2 text-2xl font-semibold">{bundle.project.name}</h2>
          <div className="mt-5 space-y-3 text-sm leading-6 text-[var(--muted-strong)]">
            <p>Venue: {bundle.project.venueName}</p>
            <p>Room: {room.name}</p>
            <p>
              Room dimensions: {formatDimension(room.widthMm)} x {formatDimension(room.depthMm)} x{" "}
              {formatDimension(room.heightMm)}
            </p>
            <p>Wall count: {bundle.walls.length}</p>
            <p>Artwork count: {bundle.artworks.length}</p>
            <p>Placed artworks: {bundle.placements.length}</p>
          </div>
        </Card>
      </div>
    </ProjectShell>
  );
}
