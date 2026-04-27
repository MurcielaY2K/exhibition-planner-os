"use client";

import Link from "next/link";
import { type ReactNode, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { Card } from "@/components/ui/card";
import { Field, inputClassName } from "@/components/ui/field";
import { mmToCm } from "@/lib/domain/format";
import { getPlacementCenterlineMm } from "@/lib/domain/placement";
import { Room3DView } from "@/features/planner/components/room-3d-view";
import { WallElevationView } from "@/features/planner/components/wall-elevation-view";
import {
  getProjectBundle,
  useExhibitionStore,
} from "@/lib/state/use-exhibition-store";
import type { MountType, Placement } from "@/lib/domain/types";

const MOUNT_TYPE_OPTIONS: Array<{ value: MountType; label: string }> = [
  { value: "standard-hook", label: "Hook" },
  { value: "cleat", label: "Cleat" },
  { value: "direct-fix", label: "Direct fix" },
  { value: "rail", label: "Rail" },
  { value: "shelf", label: "Shelf" },
  { value: "pedestal", label: "Pedestal" },
  { value: "other", label: "Other" },
];

export function PlannerPage({ projectId }: { projectId: string }) {
  const {
    bundle,
    ui,
    setActiveView,
    selectWall,
    selectArtwork,
    selectPlacement,
    addArtwork,
    updateArtwork,
    placeArtworkOnWall,
    updatePlacement,
    updatePlacements,
    saveCameraView,
    deleteCameraView,
  } = useProjectPlanner(projectId);

  const room = useMemo(() => bundle?.rooms[0] ?? null, [bundle]);
  const selectedWall = useMemo(
    () => bundle?.walls.find((wall) => wall.id === ui?.selectedWallId) ?? null,
    [bundle, ui?.selectedWallId],
  );
  const wallPlacements = useMemo(
    () =>
      selectedWall && bundle
        ? bundle.placements.filter((placement) => placement.wallId === selectedWall.id)
        : [],
    [bundle, selectedWall],
  );
  const selectedPlacement = useMemo(
    () =>
      bundle?.placements.find((placement) => placement.id === ui?.primaryPlacementId) ?? null,
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
  const placementLabelMap = useMemo(
    () => buildPlacementLabelMap(wallPlacements),
    [wallPlacements],
  );
  const selectedPlacementLabel = selectedPlacement
    ? placementLabelMap.get(selectedPlacement.id) ?? "A1"
    : null;

  if (!bundle || !ui || !room) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)]">
        <Card className="mx-auto max-w-[720px] p-8">
          <h1 className="text-2xl font-semibold">Project not found</h1>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-[1680px] px-3 py-3 sm:px-5 sm:py-5">
        <div className="flex flex-col gap-4">
          <header className="flex flex-col gap-3 rounded-[24px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(14,20,27,0.96)_0%,rgba(10,15,20,0.96)_100%)] px-5 py-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--muted-strong)]">
                  {bundle.project.venueName}
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                  Planner
                </h1>
              </div>

              <nav className="flex flex-wrap gap-2">
                <TopLink href={`/projects/${projectId}`}>Overview</TopLink>
                <TopLink href={`/projects/${projectId}/planner`} isActive>
                  Planner
                </TopLink>
                <TopLink href={`/projects/${projectId}/artworks`}>Artworks</TopLink>
                <TopLink href={`/projects/${projectId}/export`}>Exports</TopLink>
              </nav>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <SurfaceToggle
                  label="2D"
                  isActive={ui.activeView === "elevation"}
                  onClick={() => setActiveView(projectId, "elevation")}
                />
                <SurfaceToggle
                  label="3D"
                  isActive={ui.activeView === "spatial"}
                  onClick={() => setActiveView(projectId, "spatial")}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <StatChip label="Room" value={room.name} />
                <StatChip
                  label="Wall"
                  value={selectedWall?.name ?? "None"}
                />
                <StatChip label="Unit" value="cm" />
              </div>
            </div>
          </header>

          <section className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_320px]">
            <aside className="space-y-4">
              <Card className="p-4">
                <Field label="Room">
                  <select
                    className={inputClassName}
                    value={room.id}
                    onChange={() => undefined}
                  >
                    <option value={room.id}>{room.name}</option>
                  </select>
                </Field>
              </Card>

              <Card className="p-4">
                <PanelTitle eyebrow="Walls" title="Active wall" />
                <div className="mt-4 grid gap-2">
                  {bundle.walls.map((wall) => (
                    <button
                      key={wall.id}
                      type="button"
                      onClick={() => selectWall(projectId, wall.id)}
                      className={`flex items-center justify-between rounded-[14px] border px-3 py-3 text-left transition ${
                        wall.id === selectedWall?.id
                          ? "border-[rgba(95,169,193,0.28)] bg-[rgba(77,142,163,0.18)]"
                          : "border-[var(--line)] bg-[rgba(18,27,37,0.72)] hover:border-[var(--line-strong)]"
                      }`}
                    >
                      <span className="text-sm font-medium">{wall.name.replace("Wall ", "")}</span>
                      <span className="text-xs text-[var(--muted-strong)]">
                        {countPlacementsForWall(bundle.placements, wall.id)}
                      </span>
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <PanelTitle eyebrow="Artworks" title="Wall set" />
                  <button
                    type="button"
                    onClick={() => addArtwork(projectId)}
                    className="rounded-[12px] border border-[var(--line)] bg-[rgba(18,27,37,0.72)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--foreground-soft)] transition hover:bg-[var(--surface-soft)]"
                  >
                    Add
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  {bundle.artworks.map((artwork) => {
                    const placement = bundle.placements.find(
                      (entry) => entry.artworkId === artwork.id,
                    );
                    const wallLabel = placement
                      ? placementLabelMap.get(placement.id) ?? "A?"
                      : null;
                    const isSelected =
                      selectedPlacement?.artworkId === artwork.id ||
                      selectedArtwork?.id === artwork.id;

                    return (
                      <button
                        key={artwork.id}
                        type="button"
                        onClick={() => {
                          if (placement) {
                            selectWall(projectId, placement.wallId);
                            selectPlacement(projectId, placement.id);
                            return;
                          }

                          selectArtwork(projectId, artwork.id);
                        }}
                        className={`w-full rounded-[14px] border px-3 py-3 text-left transition ${
                          isSelected
                            ? "border-[rgba(95,169,193,0.28)] bg-[rgba(77,142,163,0.18)]"
                            : "border-[var(--line)] bg-[rgba(18,27,37,0.72)] hover:border-[var(--line-strong)]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[var(--foreground)]">
                              {artwork.title}
                            </p>
                            <p className="mt-1 truncate text-xs text-[var(--muted-strong)]">
                              {artwork.artist}
                            </p>
                          </div>
                          {wallLabel ? (
                            <span className="rounded-[10px] border border-[var(--line)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--foreground-soft)]">
                              {wallLabel}
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="rounded-[10px] bg-[var(--accent)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#071018]"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (selectedWall) {
                                  placeArtworkOnWall(projectId, artwork.id, selectedWall.id);
                                }
                              }}
                            >
                              Place
                            </button>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>
            </aside>

            <div className="min-w-0">
              <Card className="overflow-hidden p-0">
                <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted-strong)]">
                      Canvas
                    </p>
                    <h2 className="mt-1 text-base font-semibold">
                      {selectedWall?.name ?? "Wall"}
                    </h2>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--muted-strong)]">
                    <span>Centerline {formatCompactCm(1550)}</span>
                    <span>{selectedWall ? formatCompactCm(selectedWall.heightMm) : "0"} H</span>
                  </div>
                </div>

                {selectedWall ? (
                  ui.activeView === "spatial" ? (
                    <Room3DView
                      room={room}
                      walls={bundle.walls}
                      openings={bundle.openings}
                      placements={bundle.placements}
                      artworks={bundle.artworks}
                      selectedWallId={selectedWall.id}
                      selectedPlacementIds={ui.selectedPlacementIds}
                      primaryPlacementId={ui.primaryPlacementId}
                      savedCameraViews={ui.savedCameraViews}
                      onSelectWall={(wallId) => selectWall(projectId, wallId)}
                      onSelectPlacement={(placementId, additive) =>
                        selectPlacement(projectId, placementId, additive)
                      }
                      onSaveCameraView={(view) => saveCameraView(projectId, view)}
                      onDeleteCameraView={(cameraViewId) =>
                        deleteCameraView(projectId, cameraViewId)
                      }
                    />
                  ) : (
                    <WallElevationView
                      wall={selectedWall}
                      artworks={bundle.artworks}
                      openings={bundle.openings.filter(
                        (opening) => opening.wallId === selectedWall.id,
                      )}
                      placements={wallPlacements}
                      selectedPlacementIds={ui.selectedPlacementIds}
                      selectedOpeningId={ui.selectedOpeningId}
                      onSelectOpening={() => undefined}
                      onSelectPlacement={(placementId, additive) =>
                        selectPlacement(projectId, placementId, additive)
                      }
                      onUpdatePlacements={(patches) =>
                        updatePlacements(projectId, patches)
                      }
                    />
                  )
                ) : (
                  <div className="grid min-h-[520px] place-items-center px-6 py-16 text-center text-sm text-[var(--muted-strong)]">
                    Select a wall
                  </div>
                )}
              </Card>
            </div>

            <aside className="space-y-4">
              <Card className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <PanelTitle eyebrow="Properties" title={selectedPlacementLabel ?? "Selection"} />
                  <span className="rounded-[12px] border border-[var(--line)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-strong)]">
                    cm
                  </span>
                </div>

                {selectedPlacement && selectedArtwork && selectedWall ? (
                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-lg font-semibold text-[var(--foreground)]">
                        {selectedPlacementLabel} — {selectedArtwork.title}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted-strong)]">
                        {selectedArtwork.artist}
                      </p>
                    </div>

                    <Collapsible title="Placement" defaultOpen>
                      <div className="grid gap-3">
                        <CompactNumberField
                          label="X"
                          value={mmToCm(selectedPlacement.xMm)}
                          onChange={(value) =>
                            updatePlacement(projectId, selectedPlacement.id, { xMm: value * 10 })
                          }
                        />
                        <CompactNumberField
                          label="Y"
                          value={mmToCm(selectedPlacement.yMm)}
                          onChange={(value) =>
                            updatePlacement(projectId, selectedPlacement.id, { yMm: value * 10 })
                          }
                        />
                        <CompactStatRow
                          label="C"
                          value={formatCompactCm(
                            getPlacementCenterlineMm(selectedPlacement),
                          )}
                        />
                        <CompactStatRow
                          label="W"
                          value={formatCompactCm(selectedPlacement.widthMm)}
                        />
                        <CompactStatRow
                          label="H"
                          value={formatCompactCm(selectedPlacement.heightMm)}
                        />
                      </div>
                    </Collapsible>

                    <Collapsible title="Mount" defaultOpen>
                      <div className="grid gap-3">
                        <Field label="Mount">
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
                        <CompactStatRow
                          label="Wall"
                          value={selectedWall.name.replace("Wall ", "")}
                        />
                      </div>
                    </Collapsible>

                    <Collapsible title="Artwork">
                      <div className="grid gap-3">
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
                      </div>
                    </Collapsible>
                  </div>
                ) : selectedWall ? (
                  <div className="mt-4 space-y-3">
                    <CompactStatRow label="W" value={formatCompactCm(selectedWall.lengthMm)} />
                    <CompactStatRow label="H" value={formatCompactCm(selectedWall.heightMm)} />
                    <CompactStatRow label="Art" value={wallPlacements.length.toString()} />
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-[var(--muted-strong)]">Select artwork</p>
                )}
              </Card>
            </aside>
          </section>
        </div>
      </div>
    </main>
  );
}

function useProjectPlanner(projectId: string) {
  return useExhibitionStore(
    useShallow((state) => ({
      bundle: getProjectBundle(state.projects, projectId),
      ui: state.ui[projectId],
      setActiveView: state.setActiveView,
      selectWall: state.selectWall,
      selectArtwork: state.selectArtwork,
      selectPlacement: state.selectPlacement,
      addArtwork: state.addArtwork,
      updateArtwork: state.updateArtwork,
      placeArtworkOnWall: state.placeArtworkOnWall,
      updatePlacement: state.updatePlacement,
      updatePlacements: state.updatePlacements,
      saveCameraView: state.saveCameraView,
      deleteCameraView: state.deleteCameraView,
    })),
  );
}

function PanelTitle({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted-strong)]">
        {eyebrow}
      </p>
      <h3 className="mt-2 text-base font-semibold text-[var(--foreground)]">{title}</h3>
    </div>
  );
}

function TopLink({
  href,
  children,
  isActive,
}: {
  href: string;
  children: ReactNode;
  isActive?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-[12px] px-3 py-2 text-sm transition ${
        isActive
          ? "bg-[rgba(77,142,163,0.18)] text-[var(--foreground)]"
          : "text-[var(--foreground-soft)] hover:bg-[rgba(18,27,37,0.72)]"
      }`}
    >
      {children}
    </Link>
  );
}

function SurfaceToggle({
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
      className={`rounded-[14px] px-4 py-2 text-sm font-medium transition ${
        isActive
          ? "bg-[rgba(77,142,163,0.22)] text-[var(--foreground)]"
          : "border border-[var(--line)] bg-[rgba(18,27,37,0.72)] text-[var(--foreground-soft)] hover:bg-[var(--surface-soft)]"
      }`}
    >
      {label}
    </button>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-[var(--line)] bg-[rgba(18,27,37,0.72)] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-strong)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function CompactStatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[12px] border border-[var(--line)] bg-[rgba(18,27,37,0.56)] px-3 py-3">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-strong)]">
        {label}
      </span>
      <span className="text-sm font-medium text-[var(--foreground)]">{value}</span>
    </div>
  );
}

function CompactNumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-[12px] border border-[var(--line)] bg-[rgba(18,27,37,0.56)] px-3 py-3">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-strong)]">
        {label}
      </span>
      <input
        type="number"
        step={0.1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="w-24 border-none bg-transparent text-right text-sm font-medium text-[var(--foreground)] outline-none"
      />
    </label>
  );
}

function Collapsible({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="rounded-[16px] border border-[var(--line)] bg-[rgba(18,27,37,0.72)]"
    >
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[var(--foreground)]">
        {title}
      </summary>
      <div className="border-t border-[var(--line)] px-4 py-4">{children}</div>
    </details>
  );
}

function countPlacementsForWall(placements: Placement[], wallId: string) {
  return placements.filter((placement) => placement.wallId === wallId).length;
}

function buildPlacementLabelMap(placements: Placement[]) {
  return new Map(
    placements
      .slice()
      .sort((left, right) => left.xMm - right.xMm || left.yMm - right.yMm)
      .map((placement, index) => [placement.id, `A${index + 1}`]),
  );
}

function formatCompactCm(mm: number) {
  return mmToCm(mm).toLocaleString("en-US", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  });
}
