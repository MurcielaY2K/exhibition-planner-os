"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ProjectShell } from "@/components/project-shell";
import { ArtworkImageField } from "@/components/ui/artwork-image-field";
import { Card } from "@/components/ui/card";
import { Field, inputClassName } from "@/components/ui/field";
import { useShallow } from "zustand/react/shallow";
import {
  downloadExhibitionPdf,
  downloadWallElevationPdf,
} from "@/lib/export/wall-elevation-pdf";
import {
  cmToMm,
  formatArtworkSize,
  formatDimension,
  formatMillimeters,
  formatMeters,
  mmToCm,
} from "@/lib/domain/format";
import {
  SNAP_TOLERANCE_MM,
  STANDARD_CENTERLINE_MM,
  alignPlacementsOnWall,
  getOpeningBoundingBox,
  getPlacementDrillPointWarnings,
  getPlacementHangingPoints,
  distributePlacementsOnWall,
  getPlacementBoundingBox,
  getPlacementCenterlineMm,
  getPlacementValidation,
  nudgePlacementsOnWall,
  placementPatchesFromPlacements,
} from "@/lib/domain/placement";
import {
  getProjectBundle,
  useExhibitionStore,
} from "@/lib/state/use-exhibition-store";
import { readFileAsDataUrl } from "@/lib/file";
import { Room3DView } from "@/features/planner/components/room-3d-view";
import { RoomPlanView } from "@/features/planner/components/room-plan-view";
import { WallElevationView } from "@/features/planner/components/wall-elevation-view";
import type {
  AlignmentMode,
  DrillPointWarning,
  DistributionMode,
  MountType,
  Placement,
  SpecialHandlingType,
  VisualGuide,
} from "@/lib/domain/types";

const MOUNT_TYPE_OPTIONS: Array<{ value: MountType; label: string }> = [
  { value: "standard-hook", label: "Standard hook" },
  { value: "cleat", label: "Cleat" },
  { value: "direct-fix", label: "Direct fix" },
  { value: "rail", label: "Rail" },
  { value: "shelf", label: "Shelf" },
  { value: "pedestal", label: "Pedestal" },
  { value: "other", label: "Other" },
];

const SPECIAL_HANDLING_OPTIONS: Array<{
  value: SpecialHandlingType;
  label: string;
}> = [
  { value: "none", label: "None" },
  { value: "fragile", label: "Fragile" },
  { value: "glazed", label: "Glazed" },
  { value: "oversized", label: "Oversized" },
  { value: "condition-sensitive", label: "Condition sensitive" },
  { value: "custom", label: "Custom" },
];

type PlannerWorkspaceMode = "curatorial" | "installer" | "export" | "three-d";

export function PlannerPage({ projectId }: { projectId: string }) {
  const {
    bundle,
    ui,
    updateRoom,
    setActiveView,
    selectWall,
    selectArtwork,
    selectOpening,
    selectPlacement,
    addArtwork,
    addOpening,
    updateArtwork,
    updateOpening,
    deleteOpening,
    placeArtworkOnWall,
    updatePlacement,
    updatePlacements,
    autoSequenceWallPlacements,
  } = useProjectPlanner(projectId);
  const [actionGuides, setActionGuides] = useState<VisualGuide[]>([]);
  const [includeCoverPage, setIncludeCoverPage] = useState(true);
  const [installerSheetMode, setInstallerSheetMode] = useState(false);
  const [workspaceMode, setWorkspaceMode] =
    useState<PlannerWorkspaceMode>("curatorial");
  const actionGuideTimeoutRef = useRef<number | null>(null);
  const room = useMemo(() => bundle?.rooms[0] ?? null, [bundle]);
  const selectedWall = useMemo(
    () => bundle?.walls.find((wall) => wall.id === ui?.selectedWallId) ?? null,
    [bundle, ui?.selectedWallId],
  );
  const selectedPlacements = useMemo(
    () =>
      bundle?.placements.filter((placement) =>
        ui?.selectedPlacementIds.includes(placement.id),
      ) ?? [],
    [bundle, ui?.selectedPlacementIds],
  );
  const selectedPlacement = useMemo(
    () =>
      bundle?.placements.find((placement) => placement.id === ui?.primaryPlacementId) ??
      null,
    [bundle, ui?.primaryPlacementId],
  );
  const selectedArtwork = useMemo(
    () =>
      bundle?.artworks.find(
        (artwork) =>
          artwork.id === selectedPlacement?.artworkId ||
          artwork.id === ui?.selectedArtworkId,
      ) ?? null,
    [bundle, selectedPlacement?.artworkId, ui?.selectedArtworkId],
  );
  const selectedOpening = useMemo(
    () => bundle?.openings.find((opening) => opening.id === ui?.selectedOpeningId) ?? null,
    [bundle, ui?.selectedOpeningId],
  );
  const wallPlacements = useMemo(
    () =>
      selectedWall && bundle
        ? bundle.placements.filter((placement) => placement.wallId === selectedWall.id)
        : [],
    [bundle, selectedWall],
  );
  const placementLabelMap = useMemo(
    () => buildPlacementLabelMap(wallPlacements),
    [wallPlacements],
  );
  const wallOpenings = useMemo(
    () =>
      selectedWall && bundle
        ? bundle.openings.filter((opening) => opening.wallId === selectedWall.id)
        : [],
    [bundle, selectedWall],
  );
  const movableSelectedPlacements = useMemo(
    () => selectedPlacements.filter((placement) => !placement.isLocked),
    [selectedPlacements],
  );
  const selectedPlacementLabel = selectedPlacement
    ? placementLabelMap.get(selectedPlacement.id) ?? "A?"
    : null;
  const selectedPlacementValidation = useMemo(
    () =>
      selectedPlacement && selectedWall && bundle
        ? getPlacementValidation(
            selectedPlacement,
            selectedWall,
            bundle.placements,
            bundle.openings,
          )
        : null,
    [bundle, selectedPlacement, selectedWall],
  );
  const selectedOpeningBoundingBox = useMemo(
    () => (selectedOpening ? getOpeningBoundingBox(selectedOpening) : null),
    [selectedOpening],
  );
  const selectedBoundingBox = useMemo(
    () => (selectedPlacement ? getPlacementBoundingBox(selectedPlacement) : null),
    [selectedPlacement],
  );
  const selectedHangingPoints = useMemo(
    () => (selectedPlacement ? getPlacementHangingPoints(selectedPlacement) : []),
    [selectedPlacement],
  );
  const selectedDrillWarnings = useMemo(
    () =>
      selectedPlacement && selectedWall
        ? getPlacementDrillPointWarnings(
            selectedPlacement,
            selectedWall,
            wallPlacements.filter((placement) => placement.id !== selectedPlacement.id),
            wallOpenings,
          )
        : [],
    [selectedPlacement, selectedWall, wallOpenings, wallPlacements],
  );
  const selectedDrillErrorCount = selectedDrillWarnings.filter(
    (warning) => warning.severity === "error",
  ).length;
  const selectedDrillWarningCount = selectedDrillWarnings.filter(
    (warning) => warning.severity === "warning",
  ).length;
  const selectedValidationChecks = useMemo(
    () => summarizeInstallationChecks(selectedDrillWarnings),
    [selectedDrillWarnings],
  );
  const workspaceHeading =
    workspaceMode === "installer"
      ? "Installer review"
      : workspaceMode === "export"
        ? "Export preparation"
        : workspaceMode === "three-d"
          ? "Spatial review"
          : "Curatorial planning";
  const workspaceDescription =
    workspaceMode === "installer"
      ? "Check drill points, install sequence, lock state, and wall-specific risks against the same placement geometry."
      : workspaceMode === "export"
        ? "Prepare the current wall and exhibition for technical PDF output without leaving the planning context."
        : workspaceMode === "three-d"
          ? "Review the room spatially using the same walls, placements, and openings already defined in 2D."
          : "Refine wall composition, spacing, and room context with the same authoritative mm-based planner model.";

  function handleExportWallPdf() {
    if (!bundle || !selectedWall) {
      return;
    }

    downloadWallElevationPdf({
      project: bundle.project,
      wall: selectedWall,
      artworks: bundle.artworks,
      placements: wallPlacements,
      openings: wallOpenings,
      installerMode: installerSheetMode,
    });
  }

  function handleExportExhibitionPdf() {
    if (!bundle) {
      return;
    }

    downloadExhibitionPdf({
      project: bundle.project,
      walls: bundle.walls,
      artworks: bundle.artworks,
      placements: bundle.placements,
      openings: bundle.openings,
      includeCoverPage,
      installerMode: installerSheetMode,
    });
  }

  function activateWorkspaceMode(mode: PlannerWorkspaceMode) {
    setWorkspaceMode(mode);

    if (mode === "three-d") {
      setActiveView(projectId, "spatial");
      return;
    }

    if (ui.activeView === "spatial") {
      setActiveView(projectId, "elevation");
    }
  }

  function flashGuides(guides: VisualGuide[]) {
    setActionGuides(guides);
    if (actionGuideTimeoutRef.current) {
      window.clearTimeout(actionGuideTimeoutRef.current);
    }

    actionGuideTimeoutRef.current = window.setTimeout(() => {
      setActionGuides([]);
    }, 900);
  }

  useEffect(() => {
    return () => {
      if (actionGuideTimeoutRef.current) {
        window.clearTimeout(actionGuideTimeoutRef.current);
      }
    };
  }, []);

  async function handleSelectedArtworkImage(file: File) {
    if (!selectedArtwork) {
      return;
    }

    const imageUrl = await readFileAsDataUrl(file);
    updateArtwork(projectId, selectedArtwork.id, { imageUrl });
  }

  function applyWarningFix(warning: DrillPointWarning) {
    if (!selectedPlacement || !warning.fix) {
      return;
    }

    if (warning.fix.kind === "change-mount" && warning.fix.mountType) {
      updatePlacement(projectId, selectedPlacement.id, {
        mountType: warning.fix.mountType,
      });
      return;
    }

    if (
      warning.fix.kind === "nudge-placement" &&
      warning.fix.nextXmm !== undefined &&
      warning.fix.nextYmm !== undefined &&
      !selectedPlacement.isLocked
    ) {
      updatePlacement(projectId, selectedPlacement.id, {
        xMm: warning.fix.nextXmm,
        yMm: warning.fix.nextYmm,
      });
    }
  }

  function applyAlignment(mode: AlignmentMode) {
    if (!selectedWall || movableSelectedPlacements.length < 2) {
      return;
    }

    const stationaryPlacements = wallPlacements.filter(
      (placement) =>
        !movableSelectedPlacements.some((entry) => entry.id === placement.id),
    );
    const result = alignPlacementsOnWall(
      movableSelectedPlacements,
      stationaryPlacements,
      selectedWall,
      ui.primaryPlacementId,
      mode,
      wallOpenings,
    );

    if (!result.applied) {
      return;
    }

    updatePlacements(projectId, placementPatchesFromPlacements(result.placements));
    flashGuides(result.guides);
  }

  function applyDistribution(mode: DistributionMode) {
    if (!selectedWall || movableSelectedPlacements.length < 3) {
      return;
    }

    const stationaryPlacements = wallPlacements.filter(
      (placement) =>
        !movableSelectedPlacements.some((entry) => entry.id === placement.id),
    );
    const result = distributePlacementsOnWall(
      movableSelectedPlacements,
      stationaryPlacements,
      selectedWall,
      mode,
      wallOpenings,
    );

    if (!result.applied) {
      return;
    }

    updatePlacements(projectId, placementPatchesFromPlacements(result.placements));
    flashGuides(result.guides);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!bundle || !ui || !selectedWall || movableSelectedPlacements.length === 0) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName ?? "";

      if (
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }

      let deltaXmm = 0;
      let deltaYmm = 0;
      const stepMm = event.altKey ? 1 : event.shiftKey ? 50 : 10;

      if (event.key === "ArrowLeft") {
        deltaXmm = -stepMm;
      } else if (event.key === "ArrowRight") {
        deltaXmm = stepMm;
      } else if (event.key === "ArrowUp") {
        deltaYmm = stepMm;
      } else if (event.key === "ArrowDown") {
        deltaYmm = -stepMm;
      } else {
        return;
      }

      event.preventDefault();

      const stationaryPlacements = wallPlacements.filter(
        (placement) =>
          !movableSelectedPlacements.some((entry) => entry.id === placement.id),
      );
      const result = nudgePlacementsOnWall(
        movableSelectedPlacements,
        stationaryPlacements,
        selectedWall,
        deltaXmm,
        deltaYmm,
        wallOpenings,
      );

      if (!result.applied) {
        return;
      }

      updatePlacements(projectId, placementPatchesFromPlacements(result.placements));
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    bundle,
    movableSelectedPlacements,
    projectId,
    selectedWall,
    ui,
    updatePlacements,
    wallOpenings,
    wallPlacements,
  ]);

  if (!bundle || !ui || !room) {
    return <MissingProjectState />;
  }

  return (
    <ProjectShell
      project={bundle.project}
      activePath="planner"
      title="Planner"
      description="A professional planning workspace for curatorial layout, installer review, export preparation, and first-pass spatial checking. Every mode reads from the same authoritative exhibition geometry."
      stats={[
        { label: "Room", value: room.name },
        {
          label: "Envelope",
          value: `${formatDimension(room.widthMm)} x ${formatDimension(room.depthMm)} x ${formatDimension(room.heightMm)}`,
        },
        { label: "Placed", value: bundle.placements.length.toString() },
        { label: "Openings", value: bundle.openings.length.toString() },
      ]}
    >
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_320px]">
        <Card className="order-2 p-4 sm:p-5 lg:order-1">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-strong)]">
            Project and Room
          </p>
          <h2 className="mt-2 text-xl font-semibold">Spatial definition</h2>

          <div className="mt-5 space-y-4">
            <Field label="Room name">
              <input
                className={inputClassName}
                value={room.name}
                onChange={(event) =>
                  updateRoom(projectId, room.id, { name: event.target.value })
                }
              />
            </Field>

            <div className="grid gap-3">
              <DimensionField
                label="Width"
                valueMm={room.widthMm}
                onChange={(valueMm) =>
                  updateRoom(projectId, room.id, { widthMm: valueMm })
                }
              />
              <DimensionField
                label="Depth"
                valueMm={room.depthMm}
                onChange={(valueMm) =>
                  updateRoom(projectId, room.id, { depthMm: valueMm })
                }
              />
              <DimensionField
                label="Height"
                valueMm={room.heightMm}
                onChange={(valueMm) =>
                  updateRoom(projectId, room.id, { heightMm: valueMm })
                }
              />
            </div>

            <div className="rounded-[20px] border border-[var(--line)] bg-[var(--surface-muted)] p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                Generated walls
              </p>
              <div className="mt-3 grid gap-2">
                {bundle.walls.map((wall) => (
                  <button
                    key={wall.id}
                    type="button"
                    onClick={() => selectWall(projectId, wall.id)}
                    className={`flex items-center justify-between rounded-[16px] border px-4 py-3 text-left transition ${
                      wall.id === selectedWall?.id
                        ? "border-[var(--accent)] bg-[rgba(43,97,82,0.08)]"
                        : "border-[var(--line)] bg-[var(--surface-soft)] hover:border-[var(--line-strong)]"
                    }`}
                  >
                    <span className="text-sm font-medium">{wall.name}</span>
                    <span className="text-sm text-[var(--muted-strong)]">
                      {formatDimension(wall.lengthMm)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[20px] border border-[var(--line)] bg-[var(--surface-muted)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    Wall openings
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted-strong)]">
                    Add doors and windows as physical exclusions on the active wall.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <ToolButton
                  label="Add door"
                  disabled={!selectedWall}
                  onClick={() =>
                    selectedWall ? addOpening(projectId, selectedWall.id, "door") : undefined
                  }
                />
                <ToolButton
                  label="Add window"
                  disabled={!selectedWall}
                  onClick={() =>
                    selectedWall ? addOpening(projectId, selectedWall.id, "window") : undefined
                  }
                />
              </div>

              <div className="mt-4 space-y-3">
                {wallOpenings.length === 0 ? (
                  <p className="rounded-[16px] border border-dashed border-black/10 px-4 py-4 text-sm text-[var(--muted-strong)]">
                    No openings on {selectedWall?.name ?? "this wall"} yet.
                  </p>
                ) : (
                  wallOpenings.map((opening) => (
                    <div
                      key={opening.id}
                      className={`rounded-[16px] border p-4 transition ${
                        opening.id === selectedOpening?.id
                          ? "border-[var(--accent)] bg-[rgba(43,97,82,0.08)]"
                          : "border-[var(--line)] bg-[var(--surface-soft)]"
                      }`}
                    >
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => selectOpening(projectId, opening.id)}
                      >
                        <p className="text-sm font-semibold">
                          {opening.label ?? `${opening.type === "door" ? "Door" : "Window"}`}
                        </p>
                        <p className="mt-1 text-sm text-[var(--muted-strong)]">
                          {opening.type === "door" ? "Door" : "Window"} / {formatDimension(opening.widthMm)} x {formatDimension(opening.heightMm)}
                        </p>
                        <p className="mt-2 text-sm text-[var(--muted-strong)]">
                          x {formatMillimeters(opening.xMm)} / y {formatMillimeters(opening.yMm)}
                        </p>
                      </button>
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          className="rounded-full border border-[rgba(143,57,49,0.16)] px-3 py-1.5 text-sm text-[#8f3931] transition hover:bg-[rgba(143,57,49,0.08)]"
                          onClick={() => deleteOpening(projectId, opening.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[20px] border border-[var(--line)] bg-[var(--surface-muted)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    Artwork quick place
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted-strong)]">
                    Add and assign works to the selected wall.
                  </p>
                </div>
                <button
                  type="button"
                    className="rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1 text-sm text-[var(--foreground-soft)] transition hover:bg-[var(--surface)]"
                  onClick={() => addArtwork(projectId)}
                >
                  Add
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {bundle.artworks.length === 0 ? (
                  <p className="rounded-[16px] border border-dashed border-black/10 px-4 py-4 text-sm text-[var(--muted-strong)]">
                    No artworks yet. Add the first record to start placing work on walls.
                  </p>
                ) : (
                  bundle.artworks.map((artwork) => {
                    const placement = bundle.placements.find(
                      (entry) => entry.artworkId === artwork.id,
                    );

                    return (
                      <div
                        key={artwork.id}
                    className="rounded-[16px] border border-[var(--line)] bg-[var(--surface-soft)] p-4"
                      >
                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() => selectArtwork(projectId, artwork.id)}
                        >
                          <p className="text-sm font-semibold">{artwork.title}</p>
                          <p className="mt-1 text-sm text-[var(--muted-strong)]">
                            {artwork.artist} / {formatArtworkSize(artwork.widthMm, artwork.heightMm)}
                          </p>
                        </button>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedWall ? (
                            <button
                              type="button"
                              className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[var(--accent-strong)]"
                              onClick={() =>
                                placeArtworkOnWall(projectId, artwork.id, selectedWall.id)
                              }
                            >
                              {placement ? "Move to selected wall" : "Assign to selected wall"}
                            </button>
                          ) : null}
                          {placement ? (
                  <span className="rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1.5 text-sm text-[var(--foreground-soft)]">
                              Placed
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </Card>

        <div className="order-1 space-y-6 lg:order-2">
          <Card className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-strong)]">
                  Workspace
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {workspaceHeading}
                </h2>
                <p className="mt-2 text-sm text-[var(--muted-strong)]">
                  {workspaceDescription}
                </p>
                  <p className="mt-3 rounded-[16px] border border-[var(--line)] bg-[var(--surface-muted)] px-4 py-3 text-sm leading-6 text-[var(--foreground-soft)]">
                  Coordinate system: origin is the bottom-left of the active wall.
                  `xMm` measures from the left wall edge to the artwork&apos;s left edge.
                  `yMm` measures from the floor line to the artwork&apos;s bottom edge.
                </p>
              </div>

              <div className="flex flex-col items-start gap-3">
                <div className="-mx-1 flex w-full gap-2 overflow-x-auto px-1 pb-1">
                  <ModeButton
                    label="Curatorial"
                    isActive={workspaceMode === "curatorial"}
                    onClick={() => activateWorkspaceMode("curatorial")}
                  />
                  <ModeButton
                    label="Installer"
                    isActive={workspaceMode === "installer"}
                    onClick={() => activateWorkspaceMode("installer")}
                  />
                  <ModeButton
                    label="Export"
                    isActive={workspaceMode === "export"}
                    onClick={() => activateWorkspaceMode("export")}
                  />
                  <ModeButton
                    label="3D View"
                    isActive={workspaceMode === "three-d"}
                    onClick={() => activateWorkspaceMode("three-d")}
                  />
                </div>
                <div className="-mx-1 flex w-full gap-2 overflow-x-auto px-1 pb-1">
                  <button
                    type="button"
                    onClick={handleExportExhibitionPdf}
                    className="rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-2 text-sm font-medium text-[var(--foreground-soft)] transition hover:bg-[var(--surface-muted)]"
                  >
                    Export Exhibition PDF
                  </button>
                  <button
                    type="button"
                    onClick={handleExportWallPdf}
                    className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-strong)]"
                  >
                    Export Wall PDF
                  </button>
                  <ViewButton
                    label="Wall elevation"
                    isActive={ui.activeView === "elevation" && workspaceMode !== "three-d"}
                    onClick={() => {
                      if (workspaceMode === "three-d" || workspaceMode === "export") {
                        setWorkspaceMode("curatorial");
                      }
                      setActiveView(projectId, "elevation");
                    }}
                  />
                  <ViewButton
                    label="Top-down room"
                    isActive={ui.activeView === "plan" && workspaceMode !== "three-d"}
                    onClick={() => {
                      if (workspaceMode === "three-d" || workspaceMode === "export") {
                        setWorkspaceMode("curatorial");
                      }
                      setActiveView(projectId, "plan");
                    }}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-[var(--muted-strong)]">
                  <input
                    type="checkbox"
                    checked={includeCoverPage}
                    onChange={(event) => setIncludeCoverPage(event.target.checked)}
                  />
                  Include cover page in exhibition export
                </label>
                <label className="flex items-center gap-2 text-sm text-[var(--muted-strong)]">
                  <input
                    type="checkbox"
                    checked={installerSheetMode}
                    onChange={(event) => setInstallerSheetMode(event.target.checked)}
                  />
                  Installer sheet mode in PDF export
                </label>
              </div>
            </div>
          </Card>

          {workspaceMode !== "three-d" && workspaceMode !== "export" ? (
            <Card className="p-4 sm:p-5">
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-strong)]">
                    {workspaceMode === "installer" ? "Installer tools" : "Layout tools"}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">
                    {workspaceMode === "installer" ? "Sequence and alignment" : "Align and distribute"}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--muted-strong)]">
                    Reference artwork: primary selection, which is the last clicked artwork.
                    Keyboard nudge: arrows = 10 mm, `Shift` + arrows = 50 mm, `Alt` + arrows = 1 mm.
                    Locked artworks remain selectable but stay fixed during nudge, align, and distribute actions.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <ToolbarGroup title="Horizontal">
                    <ToolButton
                      label="Align left"
                      disabled={movableSelectedPlacements.length < 2}
                      onClick={() => applyAlignment("left")}
                    />
                    <ToolButton
                      label="Align right"
                      disabled={movableSelectedPlacements.length < 2}
                      onClick={() => applyAlignment("right")}
                    />
                    <ToolButton
                      label="Align center"
                      disabled={movableSelectedPlacements.length < 2}
                      onClick={() => applyAlignment("horizontal-center")}
                    />
                    <ToolButton
                      label="Distribute"
                      disabled={movableSelectedPlacements.length < 3}
                      onClick={() => applyDistribution("horizontal")}
                    />
                  </ToolbarGroup>
                  <ToolbarGroup title="Vertical">
                    <ToolButton
                      label="Align bottom"
                      disabled={movableSelectedPlacements.length < 2}
                      onClick={() => applyAlignment("bottom")}
                    />
                    <ToolButton
                      label="Align top"
                      disabled={movableSelectedPlacements.length < 2}
                      onClick={() => applyAlignment("top")}
                    />
                    <ToolButton
                      label="Align centerline"
                      disabled={movableSelectedPlacements.length < 2}
                      onClick={() => applyAlignment("centerline")}
                    />
                    <ToolButton
                      label="Distribute"
                      disabled={movableSelectedPlacements.length < 3}
                      onClick={() => applyDistribution("vertical")}
                    />
                  </ToolbarGroup>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ToolButton
                    label="Auto-sequence active wall"
                    disabled={!selectedWall || wallPlacements.length === 0}
                    onClick={() =>
                      selectedWall
                        ? autoSequenceWallPlacements(projectId, selectedWall.id)
                        : undefined
                    }
                  />
                </div>
              </div>
            </Card>
          ) : null}

          {workspaceMode === "export" ? (
            <div className="flex flex-col gap-4">
              <Card className="p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-strong)]">
                  Export center
                </p>
                <h3 className="mt-2 text-2xl font-semibold">PDF output from live planner state</h3>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted-strong)]">
                  Export actions on this route use the current wall, artwork labels, installer metadata,
                  openings, and risk notes already present in the planner. No secondary export-only layout
                  model is created.
                </p>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Card className="border-[var(--line)] bg-[var(--surface-muted)] p-5 shadow-none">
                    <p className="text-lg font-semibold">Active wall sheet</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted-strong)]">
                      Export the selected wall as a technical elevation with artwork IDs,
                      openings, dimensions, drill points, and installer notes.
                    </p>
                    <button
                      type="button"
                      onClick={handleExportWallPdf}
                      className="mt-5 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-strong)]"
                    >
                      Export Wall PDF
                    </button>
                  </Card>
                <Card className="border-[var(--line)] bg-[var(--surface-muted)] p-5 shadow-none">
                    <p className="text-lg font-semibold">Full exhibition set</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted-strong)]">
                      Build a multi-page exhibition document with one wall per page and an optional cover.
                    </p>
                    <button
                      type="button"
                      onClick={handleExportExhibitionPdf}
                    className="mt-5 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-2 text-sm font-medium text-[var(--foreground-soft)] transition hover:bg-[var(--surface)]"
                    >
                      Export Exhibition PDF
                    </button>
                  </Card>
                </div>
              </Card>
            </div>
          ) : null}

          {selectedWall && ui.activeView === "elevation" && workspaceMode !== "export" ? (
            <WallElevationView
              wall={selectedWall}
              artworks={bundle.artworks}
              openings={wallOpenings}
              placements={wallPlacements}
              selectedOpeningId={ui.selectedOpeningId}
              selectedPlacementIds={ui.selectedPlacementIds}
              visualGuides={actionGuides}
              onSelectOpening={(openingId) => selectOpening(projectId, openingId)}
              onSelectPlacement={(placementId, additive) =>
                selectPlacement(projectId, placementId, additive)
              }
              onUpdatePlacements={(patches) =>
                updatePlacements(projectId, patches)
              }
            />
          ) : null}

          {ui.activeView === "plan" && workspaceMode !== "export" ? (
            <RoomPlanView
              room={room}
              walls={bundle.walls}
              openings={bundle.openings}
              placements={bundle.placements}
              artworks={bundle.artworks}
              selectedOpeningId={ui.selectedOpeningId}
              selectedWallId={selectedWall?.id}
              onSelectOpening={(openingId) => selectOpening(projectId, openingId)}
              onSelectWall={(wallId) => selectWall(projectId, wallId)}
            />
          ) : null}

          {ui.activeView === "spatial" ? (
            <Room3DView
              room={room}
              walls={bundle.walls}
              openings={bundle.openings}
              placements={bundle.placements}
              artworks={bundle.artworks}
              selectedWallId={selectedWall?.id}
              selectedPlacementIds={ui.selectedPlacementIds}
              onSelectWall={(wallId) => selectWall(projectId, wallId)}
              onSelectPlacement={(placementId, additive) =>
                selectPlacement(projectId, placementId, additive)
              }
            />
          ) : null}
        </div>

        <Card className="order-3 p-4 sm:p-5 xl:order-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-strong)]">
            Properties
          </p>
          <h2 className="mt-2 text-xl font-semibold">Selected object</h2>

          <div className="mt-5 space-y-4">
            {selectedPlacement && selectedArtwork && selectedWall ? (
              <>
                {selectedPlacements.length > 1 ? (
                  <SummaryBlock
                    title={`${selectedPlacements.length} artworks selected`}
                    subtitle="Dragging on the elevation moves the unlocked selection as a group while preserving relative spacing."
                  />
                ) : null}
                <SummaryBlock
                  title={`${selectedPlacementLabel ?? "A?"} / ${selectedArtwork.title}`}
                  subtitle={`${selectedArtwork.artist} on ${selectedWall.name}`}
                />
                <DimensionField
                  label="X position from left edge"
                  valueMm={selectedPlacement.xMm}
                  disabled={selectedPlacement.isLocked}
                  onChange={(valueMm) =>
                    updatePlacement(projectId, selectedPlacement.id, { xMm: valueMm })
                  }
                />
                <DimensionField
                  label="Y position from floor"
                  valueMm={selectedPlacement.yMm}
                  disabled={selectedPlacement.isLocked}
                  onChange={(valueMm) =>
                    updatePlacement(projectId, selectedPlacement.id, { yMm: valueMm })
                  }
                />
                <div className="grid gap-2 rounded-[18px] border border-[var(--line)] bg-[var(--surface-muted)] p-4 text-sm">
                  <MetaRow
                    label="Installer ID"
                    value={selectedPlacement.installId}
                  />
                  <MetaRow
                    label="Wall"
                    value={selectedWall.name}
                  />
                  <MetaRow
                    label="Computed centerline"
                    value={formatDimension(getPlacementCenterlineMm(selectedPlacement))}
                  />
                  <MetaRow
                    label="Bottom offset"
                    value={formatDimension(selectedPlacement.yMm)}
                  />
                  <MetaRow
                    label="Placement width"
                    value={formatMillimeters(selectedPlacement.widthMm)}
                  />
                  <MetaRow
                    label="Placement height"
                    value={formatMillimeters(selectedPlacement.heightMm)}
                  />
                  <MetaRow
                    label="Artwork size"
                    value={formatArtworkSize(selectedPlacement.widthMm, selectedPlacement.heightMm)}
                  />
                  <MetaRow
                    label="Install order"
                    value={selectedPlacement.priorityOrder.toString()}
                  />
                  <MetaRow
                    label="Mount type"
                    value={formatMountType(selectedPlacement.mountType)}
                  />
                  <MetaRow
                    label="Locked"
                    value={selectedPlacement.isLocked ? "Locked" : "Unlocked"}
                  />
                  <MetaRow
                    label="Placement validity"
                    value={
                      selectedPlacementValidation?.isValid ? "Valid" : "Invalid"
                    }
                  />
                  {selectedBoundingBox ? (
                    <>
                      <MetaRow
                        label="Bounding box left / right"
                        value={`${formatMillimeters(selectedBoundingBox.leftMm)} / ${formatMillimeters(selectedBoundingBox.rightMm)}`}
                      />
                      <MetaRow
                        label="Bounding box bottom / top"
                        value={`${formatMillimeters(selectedBoundingBox.bottomMm)} / ${formatMillimeters(selectedBoundingBox.topMm)}`}
                      />
                    </>
                  ) : null}
                </div>
                <div className="rounded-[18px] border border-[var(--line)] bg-[var(--surface-muted)] p-4">
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    Drill points
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted-strong)]">
                    Computed from placement geometry and mount type. Single-point mounts use one centered drill point. Cleat, rail, and shelf mounts use two drill points with fixed top inset and proportional side inset.
                  </p>
                  <div className="mt-3 space-y-2 text-sm">
                    {selectedHangingPoints.length === 0 ? (
                      <p className="text-[var(--muted-strong)]">
                        No wall drill points for this mount type.
                      </p>
                    ) : (
                      selectedHangingPoints.map((point) => (
                        <div
                          key={point.label}
                    className="rounded-[14px] border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-3"
                        >
                          <p className="text-sm font-semibold text-[var(--foreground)]">
                            {point.label}
                          </p>
                          <div className="mt-2 space-y-1">
                            <MetaRow
                              label="Horizontal offset from wall left"
                              value={formatDimension(point.xMm)}
                            />
                            <MetaRow
                              label="Drill height from floor"
                              value={formatDimension(point.yMm)}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div
                  className={`rounded-[18px] border px-4 py-4 ${
                    selectedDrillErrorCount > 0
                      ? "border-[rgba(143,57,49,0.18)] bg-[rgba(143,57,49,0.08)]"
                      : selectedDrillWarningCount > 0
                        ? "border-[rgba(176,121,31,0.18)] bg-[rgba(176,121,31,0.08)]"
                      : "border-[rgba(43,97,82,0.16)] bg-[rgba(43,97,82,0.08)]"
                  }`}
                >
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    Installation validation
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {selectedValidationChecks.map((check) => (
                      <ValidationCheckChip
                        key={check.label}
                        label={check.label}
                        status={check.status}
                      />
                    ))}
                  </div>
                  {selectedDrillWarnings.length > 0 ? (
                    <ul className="mt-2 space-y-2 text-sm leading-6 text-[var(--muted-strong)]">
                      {selectedDrillWarnings.map((warning) => (
                        <li
                          key={`${warning.code}-${warning.pointLabel ?? "placement"}-${warning.message}`}
                    className="rounded-[14px] border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2"
                        >
                          <p
                            className={`font-semibold ${
                              warning.severity === "error"
                                ? "text-[#8f3931]"
                                : "text-[#8a5b12]"
                            }`}
                          >
                            {warning.severity === "error" ? "Error" : "Warning"}
                            {warning.pointLabel ? ` / ${warning.pointLabel}` : ""}
                          </p>
                          <p className="mt-1">{warning.message}</p>
                          {warning.fix ? (
                            <div className="mt-3 flex items-center justify-between gap-3">
                              <p className="text-sm text-[var(--foreground)]">
                                Recommended action: {warning.fix.label}
                              </p>
                              <button
                                type="button"
                                disabled={
                                  selectedPlacement?.isLocked === true &&
                                  warning.fix.kind === "nudge-placement"
                                }
                                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                                  selectedPlacement?.isLocked === true &&
                                  warning.fix.kind === "nudge-placement"
                                    ? "cursor-not-allowed border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--muted-strong)] opacity-55"
                                    : warning.severity === "error"
                                      ? "bg-[#8f3931] text-white hover:bg-[#7b302a]"
                                      : "bg-[#b7791f] text-white hover:bg-[#996514]"
                                }`}
                                onClick={() => applyWarningFix(warning)}
                              >
                                Apply recommended fix
                              </button>
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">
                      Installation validated. Edge and opening clearance, drill spacing, and mount suitability are all passing for the selected placement.
                    </p>
                  )}
                  {selectedDrillWarnings.length === 0 ? (
                    <p className="mt-2 text-sm leading-6 text-[var(--muted-strong)]">
                      Confidence: drill geometry is consistent with the current wall, neighboring works, and mount setup.
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-3 rounded-[18px] border border-[var(--line)] bg-[var(--surface-muted)] p-4">
                  <Field label="Mount type">
                    <select
                      className={inputClassName}
                      value={selectedPlacement.mountType}
                      onChange={(event) =>
                        updatePlacement(projectId, selectedPlacement.id, {
                          mountType: event.target.value as MountType,
                        })
                      }
                    >
                      {MOUNT_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Install order">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      className={inputClassName}
                      value={selectedPlacement.priorityOrder}
                      onChange={(event) =>
                        updatePlacement(projectId, selectedPlacement.id, {
                          priorityOrder: Math.max(1, Number(event.target.value) || 1),
                        })
                      }
                    />
                  </Field>
                  <Field label="Special handling">
                    <select
                      className={inputClassName}
                      value={selectedPlacement.specialHandling}
                      onChange={(event) =>
                        updatePlacement(projectId, selectedPlacement.id, {
                          specialHandling: event.target.value as SpecialHandlingType,
                        })
                      }
                    >
                      {SPECIAL_HANDLING_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Install notes">
                    <textarea
                      className={`${inputClassName} min-h-[110px] resize-y`}
                      value={selectedPlacement.installNotes}
                      onChange={(event) =>
                        updatePlacement(projectId, selectedPlacement.id, {
                          installNotes: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                      <input
                        type="checkbox"
                        checked={selectedPlacement.isLocked}
                        onChange={(event) =>
                          updatePlacement(projectId, selectedPlacement.id, {
                            isLocked: event.target.checked,
                          })
                        }
                      />
                      Lock placement
                    </label>
                    <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                      <input
                        type="checkbox"
                        checked={selectedPlacement.requiresTeamLift}
                        onChange={(event) =>
                          updatePlacement(projectId, selectedPlacement.id, {
                            requiresTeamLift: event.target.checked,
                          })
                        }
                      />
                      Requires team lift
                    </label>
                  </div>
                  <button
                    type="button"
                    className="rounded-[16px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-2 text-sm font-medium text-[var(--foreground-soft)] transition hover:bg-[var(--surface)]"
                    onClick={() => autoSequenceWallPlacements(projectId, selectedWall.id)}
                  >
                    Auto-sequence this wall left to right
                  </button>
                </div>
                <p className="rounded-[18px] border border-[var(--line)] bg-[var(--surface-muted)] px-4 py-3 text-sm leading-6 text-[var(--foreground-soft)]">
                  Standard hanging centerline guide: {formatMillimeters(STANDARD_CENTERLINE_MM)}.
                  Placement snaps to this guide and to neighboring artwork edges within a
                  {formatMillimeters(SNAP_TOLERANCE_MM)} tolerance.
                  {selectedPlacement.isLocked
                    ? " This placement is locked, so drag and layout tools leave it fixed."
                    : ""}
                </p>
                {selectedPlacementValidation && !selectedPlacementValidation.isValid ? (
                  <div className="rounded-[18px] border border-[rgba(143,57,49,0.18)] bg-[rgba(143,57,49,0.08)] px-4 py-3">
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      Invalid placement
                    </p>
                    <ul className="mt-2 space-y-2 text-sm leading-6 text-[var(--muted-strong)]">
                      {selectedPlacementValidation.issues.map((issue) => (
                        <li key={`${issue.code}-${issue.message}`}>{issue.message}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="rounded-[18px] border border-[rgba(43,97,82,0.16)] bg-[rgba(43,97,82,0.08)] px-4 py-3 text-sm leading-6 text-[var(--foreground)]">
                    Placement is currently valid within wall bounds and non-overlapping.
                  </p>
                )}
              </>
            ) : selectedOpening && selectedWall ? (
              <>
                <SummaryBlock
                  title={selectedOpening.label ?? `${selectedOpening.type === "door" ? "Door" : "Window"}`}
                  subtitle={`${selectedOpening.type === "door" ? "Door" : "Window"} on ${selectedWall.name}`}
                />
                <Field label="Label">
                  <input
                    className={inputClassName}
                    value={selectedOpening.label ?? ""}
                    onChange={(event) =>
                      updateOpening(projectId, selectedOpening.id, {
                        label: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Type">
                  <select
                    className={inputClassName}
                    value={selectedOpening.type}
                    onChange={(event) =>
                      updateOpening(projectId, selectedOpening.id, {
                        type: event.target.value as "door" | "window",
                      })
                    }
                  >
                    <option value="door">Door</option>
                    <option value="window">Window</option>
                  </select>
                </Field>
                <DimensionField
                  label="X position from left edge"
                  valueMm={selectedOpening.xMm}
                  onChange={(valueMm) =>
                    updateOpening(projectId, selectedOpening.id, { xMm: valueMm })
                  }
                />
                <DimensionField
                  label="Y position from floor"
                  valueMm={selectedOpening.yMm}
                  onChange={(valueMm) =>
                    updateOpening(projectId, selectedOpening.id, { yMm: valueMm })
                  }
                />
                <DimensionField
                  label="Width"
                  valueMm={selectedOpening.widthMm}
                  onChange={(valueMm) =>
                    updateOpening(projectId, selectedOpening.id, { widthMm: valueMm })
                  }
                />
                <DimensionField
                  label="Height"
                  valueMm={selectedOpening.heightMm}
                  onChange={(valueMm) =>
                    updateOpening(projectId, selectedOpening.id, { heightMm: valueMm })
                  }
                />
                <div className="grid gap-2 rounded-[18px] border border-[var(--line)] bg-[var(--surface-muted)] p-4 text-sm">
                  {selectedOpeningBoundingBox ? (
                    <>
                      <MetaRow
                        label="Bounding box left / right"
                        value={`${formatMillimeters(selectedOpeningBoundingBox.leftMm)} / ${formatMillimeters(selectedOpeningBoundingBox.rightMm)}`}
                      />
                      <MetaRow
                        label="Bounding box bottom / top"
                        value={`${formatMillimeters(selectedOpeningBoundingBox.bottomMm)} / ${formatMillimeters(selectedOpeningBoundingBox.topMm)}`}
                      />
                    </>
                  ) : null}
                </div>
                <p className="rounded-[18px] border border-[var(--line)] bg-[var(--surface-muted)] px-4 py-3 text-sm leading-6 text-[var(--foreground-soft)]">
                  Openings use the same wall coordinate system and bounding-box geometry as artworks,
                  so any overlap is validated deterministically in mm.
                </p>
                <button
                  type="button"
                  className="w-full rounded-[18px] border border-[rgba(143,57,49,0.16)] px-4 py-3 text-sm font-medium text-[#8f3931] transition hover:bg-[rgba(143,57,49,0.08)]"
                  onClick={() => deleteOpening(projectId, selectedOpening.id)}
                >
                  Delete opening
                </button>
              </>
            ) : selectedArtwork ? (
              <>
                <SummaryBlock
                  title={selectedArtwork.title}
                  subtitle="Artwork record"
                />
                <Field label="Title">
                  <input
                    className={inputClassName}
                    value={selectedArtwork.title}
                    onChange={(event) =>
                      updateArtwork(projectId, selectedArtwork.id, {
                        title: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Artist">
                  <input
                    className={inputClassName}
                    value={selectedArtwork.artist}
                    onChange={(event) =>
                      updateArtwork(projectId, selectedArtwork.id, {
                        artist: event.target.value,
                      })
                    }
                  />
                </Field>
                <DimensionField
                  label="Width"
                  valueMm={selectedArtwork.widthMm}
                  onChange={(valueMm) =>
                    updateArtwork(projectId, selectedArtwork.id, { widthMm: valueMm })
                  }
                />
                <DimensionField
                  label="Height"
                  valueMm={selectedArtwork.heightMm}
                  onChange={(valueMm) =>
                    updateArtwork(projectId, selectedArtwork.id, { heightMm: valueMm })
                  }
                />
                <DimensionField
                  label="Depth"
                  valueMm={selectedArtwork.depthMm ?? 0}
                  onChange={(valueMm) =>
                    updateArtwork(projectId, selectedArtwork.id, { depthMm: valueMm })
                  }
                />
                <Field label="Year">
                  <input
                    className={inputClassName}
                    value={selectedArtwork.year ?? ""}
                    onChange={(event) =>
                      updateArtwork(projectId, selectedArtwork.id, {
                        year: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Medium">
                  <input
                    className={inputClassName}
                    value={selectedArtwork.medium ?? ""}
                    onChange={(event) =>
                      updateArtwork(projectId, selectedArtwork.id, {
                        medium: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Artwork visual">
                  <ArtworkImageField
                    imageUrl={selectedArtwork.imageUrl}
                    title={selectedArtwork.title}
                    onSelectFile={handleSelectedArtworkImage}
                    onClear={() =>
                      updateArtwork(projectId, selectedArtwork.id, {
                        imageUrl: undefined,
                      })
                    }
                  />
                </Field>
                <p className="rounded-[18px] border border-[var(--line)] bg-[var(--surface-muted)] px-4 py-3 text-sm leading-6 text-[var(--foreground-soft)]">
                  Internal unit: millimeters. Display helpers show centimeters and meters,
                  but all geometry and constraints are resolved in mm.
                </p>
              </>
            ) : selectedWall ? (
              <>
                <SummaryBlock
                  title={selectedWall.name}
                  subtitle="Wall definition"
                />
                <p className="rounded-[18px] border border-[var(--line)] bg-[var(--surface-muted)] px-4 py-3 text-sm leading-6 text-[var(--foreground-soft)]">
                  Length: {formatDimension(selectedWall.lengthMm)} ({formatMeters(selectedWall.lengthMm)})
                  <br />
                  Height: {formatDimension(selectedWall.heightMm)} ({formatMeters(selectedWall.heightMm)})
                </p>
              </>
            ) : (
              <p className="rounded-[18px] border border-dashed border-black/12 px-4 py-4 text-sm text-[var(--muted-strong)]">
                Select a wall or placement to edit properties.
              </p>
            )}
          </div>
        </Card>
      </div>
    </ProjectShell>
  );
}

function useProjectPlanner(projectId: string) {
  return useExhibitionStore(
    useShallow((state) => ({
      bundle: getProjectBundle(state.projects, projectId),
      ui: state.ui[projectId],
      updateRoom: state.updateRoom,
      setActiveView: state.setActiveView,
      selectWall: state.selectWall,
      selectArtwork: state.selectArtwork,
      selectOpening: state.selectOpening,
      selectPlacement: state.selectPlacement,
      addArtwork: state.addArtwork,
      addOpening: state.addOpening,
      updateArtwork: state.updateArtwork,
      updateOpening: state.updateOpening,
      deleteOpening: state.deleteOpening,
      placeArtworkOnWall: state.placeArtworkOnWall,
      updatePlacement: state.updatePlacement,
      updatePlacements: state.updatePlacements,
      autoSequenceWallPlacements: state.autoSequenceWallPlacements,
    })),
  );
}

function ViewButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
        isActive
          ? "bg-[var(--accent)] text-[#051017]"
          : "border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--foreground-soft)] hover:bg-[var(--surface-muted)]"
      }`}
    >
      {label}
    </button>
  );
}

function ModeButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
        isActive
          ? "bg-[var(--foreground)] text-[var(--surface-strong)]"
          : "border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--foreground-soft)] hover:bg-[var(--surface-muted)]"
      }`}
    >
      {label}
    </button>
  );
}

function ToolbarGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[18px] border border-[var(--line)] bg-[var(--surface-muted)] p-4">
      <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function ToolButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition ${
        disabled
          ? "cursor-not-allowed border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--muted-strong)] opacity-55"
          : "border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--foreground-soft)] hover:bg-[var(--surface)]"
      }`}
    >
      {label}
    </button>
  );
}

function DimensionField({
  label,
  valueMm,
  disabled,
  onChange,
}: {
  label: string;
  valueMm: number;
  disabled?: boolean;
  onChange: (valueMm: number) => void;
}) {
  return (
    <Field label={`${label} (cm)`}>
      <input
        type="number"
        min={0}
        step={0.1}
        className={inputClassName}
        disabled={disabled}
        value={mmToCm(valueMm)}
        onChange={(event) => onChange(cmToMm(Number(event.target.value) || 0))}
      />
    </Field>
  );
}

function SummaryBlock({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-[18px] border border-[var(--line)] bg-[var(--surface-muted)] p-4">
      <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--muted-strong)]">{subtitle}</p>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[var(--muted-strong)]">{label}</span>
      <span className="text-right font-medium text-[var(--foreground)]">{value}</span>
    </div>
  );
}

function ValidationCheckChip({
  label,
  status,
}: {
  label: string;
  status: "validated" | DrillPointWarning["severity"];
}) {
  const className =
    status === "error"
      ? "border-[rgba(143,57,49,0.18)] bg-[var(--surface-soft)] text-[#ff8e86]"
      : status === "warning"
        ? "border-[rgba(176,121,31,0.18)] bg-[var(--surface-soft)] text-[#f0b95f]"
        : "border-[rgba(126,197,214,0.16)] bg-[var(--surface-soft)] text-[var(--accent)]";

  return (
    <div className={`rounded-[14px] border px-3 py-2 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em]">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium">
        {status === "validated"
          ? "Validated"
          : status === "error"
            ? "Error"
            : "Warning"}
      </p>
    </div>
  );
}

function buildPlacementLabelMap(placements: Placement[]) {
  return new Map(
    placements
      .slice()
      .sort((left, right) => left.xMm - right.xMm || left.yMm - right.yMm)
      .map((placement, index) => [placement.id, `A${index + 1}`]),
  );
}

function formatMountType(mountType: MountType) {
  return (
    MOUNT_TYPE_OPTIONS.find((option) => option.value === mountType)?.label ??
    mountType
  );
}

function summarizeInstallationChecks(warnings: DrillPointWarning[]) {
  return [
    {
      label: "Edge / opening",
      status: getCheckStatus(warnings, [
        "edge-left",
        "edge-right",
        "height-low",
        "height-high",
        "opening-clearance",
      ]),
    },
    {
      label: "Drill spacing",
      status: getCheckStatus(warnings, ["drill-point-clearance"]),
    },
    {
      label: "Mount",
      status: getCheckStatus(warnings, ["mount-mismatch"]),
    },
  ];
}

function getCheckStatus(
  warnings: DrillPointWarning[],
  codes: DrillPointWarning["code"][],
): "validated" | DrillPointWarning["severity"] {
  const matchingWarnings = warnings.filter((warning) => codes.includes(warning.code));

  if (matchingWarnings.some((warning) => warning.severity === "error")) {
    return "error";
  }

  if (matchingWarnings.some((warning) => warning.severity === "warning")) {
    return "warning";
  }

  return "validated";
}

function MissingProjectState() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-10">
      <Card className="mx-auto max-w-[720px] p-8">
        <h1 className="text-2xl font-semibold">Project not found</h1>
        <p className="mt-3 text-base leading-7 text-[var(--muted-strong)]">
          The requested project is not available in the current local session.
        </p>
      </Card>
    </main>
  );
}
