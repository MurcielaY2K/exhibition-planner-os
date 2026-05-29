"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Room3DView } from "@/features/planner/components/room-3d-view";
import { RoomPlanView } from "@/features/planner/components/room-plan-view";
import { WallElevationView } from "@/features/planner/components/wall-elevation-view";
import { Card } from "@/components/ui/card";
import { mmToCm } from "@/lib/domain/format";
import { getPlacementCenterlineMm } from "@/lib/domain/placement";
import {
  getProjectBundle,
  useExhibitionStore,
} from "@/lib/state/use-exhibition-store";
import type { MountType, Placement } from "@/lib/domain/types";

const MOUNT_TYPE_OPTIONS: Array<{ value: MountType; label: string }> = [
  { value: "standard-hook", label: "Hook" },
  { value: "cleat", label: "Cleat" },
  { value: "direct-fix", label: "Fix" },
  { value: "rail", label: "Rail" },
  { value: "shelf", label: "Shelf" },
  { value: "pedestal", label: "Pedestal" },
  { value: "other", label: "Other" },
];

const WALL_COLOR_OPTIONS = [
  "#f4f0e8",
  "#d8d2c8",
  "#c4c0ba",
  "#8f9298",
  "#1f2c1f",
  "#1d1f35",
];

export function PlannerPage({ projectId }: { projectId: string }) {
  const {
    bundle,
    ui,
    setActiveView,
    selectWall,
    selectArtwork,
    selectOpening,
    selectLight,
    selectPlacement,
    addArtwork,
    addOpening,
    addLight,
    placeArtworkOnWall,
    updateRoom,
    updateArtwork,
    updateOpening,
    updateLight,
    updatePlacement,
    updatePlacements,
    updatePlannerUi,
    deleteArtwork,
    deletePlacement,
    deleteOpening,
    deleteLight,
    alignSelectedPlacements,
    distributeSelectedPlacements,
    autoSequenceWallPlacements,
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
  const selectedOpening = useMemo(
    () => bundle?.openings.find((opening) => opening.id === ui?.selectedOpeningId) ?? null,
    [bundle, ui?.selectedOpeningId],
  );
  const selectedLight = useMemo(
    () => bundle?.lights.find((light) => light.id === ui?.selectedLightId) ?? null,
    [bundle, ui?.selectedLightId],
  );
  const placementLabelMap = useMemo(
    () => buildPlacementLabelMap(wallPlacements),
    [wallPlacements],
  );
  const selectedPlacementLabel = selectedPlacement
    ? placementLabelMap.get(selectedPlacement.id) ?? "A1"
    : null;
  const [inspectorTab, setInspectorTab] = useState<"props" | "lights" | "plan">("props");
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const wallColor = ui?.wallColor ?? WALL_COLOR_OPTIONS[0];
  const ambientLight = ui?.ambientLight ?? 82;
  const [showAssetsPanel, setShowAssetsPanel] = useState(true);
  const [showInspectorPanel, setShowInspectorPanel] = useState(true);
  const plannerGridClassName =
    showAssetsPanel && showInspectorPanel
      ? "xl:grid-cols-[196px_minmax(0,1fr)_212px]"
      : showAssetsPanel
        ? "xl:grid-cols-[196px_minmax(0,1fr)]"
        : showInspectorPanel
          ? "xl:grid-cols-[minmax(0,1fr)_212px]"
          : "xl:grid-cols-[minmax(0,1fr)]";

  function handleSelectLight(lightId?: string) {
    selectLight(projectId, lightId);
    if (lightId) {
      setInspectorTab("lights");
    }
  }

  function handleSelectPlacement(placementId: string, additive: boolean) {
    selectPlacement(projectId, placementId, additive);
    setInspectorTab("props");
  }

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
    <main className="min-h-screen bg-[#090909] text-[#d0d0d0]">
      <div className="flex min-h-screen flex-col">
        <header className="safe-top safe-x border-b border-white/8 bg-[#0f0f0f] px-3 py-1.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="pr-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#f3f1e8]">
                Planner
              </span>
              <TopNavButton label="CURATOR" active />
              <TopNavButton
                label={ui.activeView === "spatial" ? "3D" : "2D"}
                onClick={() =>
                  setActiveView(
                    projectId,
                    ui.activeView === "spatial" ? "elevation" : "spatial",
                  )
                }
              />
              <TopNavButton label="ROOM" value={room.name} />
              <TopNavButton
                label="WALL"
                value={selectedWall?.name.replace("Wall ", "") ?? "A"}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <TopNavButton
                label={showAssetsPanel ? "ASSETS" : "SHOW A"}
                onClick={() => setShowAssetsPanel((current) => !current)}
              />
              <TopNavButton
                label={showInspectorPanel ? "INSPECT" : "SHOW I"}
                onClick={() => setShowInspectorPanel((current) => !current)}
              />
              <TopNavButton label="PROJECT" value={bundle.project.name} />
              <Link
                href={`/projects/${projectId}/export`}
                className="inline-flex min-h-[44px] items-center border border-[#ebff00] bg-[#ebff00] px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-black"
              >
                Export
              </Link>
            </div>
          </div>
        </header>

        <section className={`grid flex-1 grid-cols-1 ${plannerGridClassName}`}>
          {showAssetsPanel ? (
            <aside className="order-2 border-b border-white/8 bg-[#101010] xl:order-none xl:border-b-0 xl:border-r">
            <div className="flex h-full flex-col">
              <div className="border-b border-white/8 px-4 py-4">
                <div className="mb-4 border border-white/8 bg-[#0d0d0d] px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#6f6f6f]">
                    Room
                  </p>
                  <p className="mt-1.5 text-[12px] font-medium text-[#f1efe6]">{room.name}</p>
                  <div className="mt-2.5 grid grid-cols-3 gap-1">
                    {(["W", "D", "H"] as const).map((axis) => {
                      const key = axis === "W" ? "widthMm" : axis === "D" ? "depthMm" : "heightMm";
                      return (
                        <label key={axis} className="grid gap-1">
                          <span className="text-[10px] uppercase tracking-[0.2em] text-[#5a5a5a]">
                            {axis}
                          </span>
                          <input
                            type="number"
                            step={1}
                            min={100}
                            max={50000}
                            value={Math.round(room[key] / 10)}
                            onChange={(event) =>
                              updateRoom(projectId, room.id, {
                                [key]: Math.max(100, Math.min(50000, Number(event.target.value) || 100)) * 10,
                              })
                            }
                            className="w-full border border-white/8 bg-[#131313] px-1.5 py-1 text-[11px] text-[#c9c8c1] outline-none transition focus:border-white/16"
                          />
                        </label>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-[10px] text-[#4a4a4a]">cm</p>
                </div>

                <div className="mb-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#7a7a7a]">
                    Walls
                  </p>
                  <div className="mt-3 grid gap-1.5">
                    {bundle.walls.map((wall) => {
                      const isActive = selectedWall?.id === wall.id;
                      const placementCount = bundle.placements.filter(
                        (placement) => placement.wallId === wall.id,
                      ).length;
                      const openingCount = bundle.openings.filter(
                        (opening) => opening.wallId === wall.id,
                      ).length;

                      return (
                        <button
                          key={wall.id}
                          type="button"
                          onClick={() => selectWall(projectId, wall.id)}
                          className={`flex items-center justify-between border px-3 py-2 text-left transition ${
                            isActive
                              ? "border-[#ebff00]/70 bg-[#161616] text-[#f3f3f3]"
                              : "border-white/8 bg-[#111111] text-[#989898] hover:border-white/14 hover:bg-[#141414]"
                          }`}
                        >
                          <div>
                            <span className="block text-[12px] uppercase tracking-[0.18em]">
                              {wall.name}
                            </span>
                            <span className="mt-1 block text-[12px] text-[#6f6d67]">
                              {formatCompactCm(wall.lengthMm)} x {formatCompactCm(wall.heightMm)}
                            </span>
                          </div>
                          <span className="text-[12px] text-[#ebff00]">
                            P{placementCount} O{openingCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#7a7a7a]">
                      Openings
                    </p>
                    <div className="flex items-center gap-2">
                      {selectedWall ? (
                        <>
                          <button
                            type="button"
                            onClick={() => addOpening(projectId, selectedWall.id, "door")}
                            className="border border-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-[#c9c8c1] transition hover:border-white/20"
                          >
                            Door
                          </button>
                          <button
                            type="button"
                            onClick={() => addOpening(projectId, selectedWall.id, "window")}
                            className="border border-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-[#c9c8c1] transition hover:border-white/20"
                          >
                            Win
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                  {bundle.openings.filter((o) => o.wallId === selectedWall?.id).length > 0 ? (
                    <div className="mt-2 space-y-1">
                      {bundle.openings
                        .filter((o) => o.wallId === selectedWall?.id)
                        .map((opening) => (
                          <div
                            key={opening.id}
                            className="flex items-center justify-between border border-white/8 bg-[#111111] px-3 py-2"
                          >
                            <span className="text-[12px] text-[#c9c8c1]">{opening.label}</span>
                            <button
                              type="button"
                              onClick={() => deleteOpening(projectId, opening.id)}
                              className="text-[11px] text-[#ff7b72] transition hover:text-[#ff9a93]"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#7a7a7a]">
                    Artworks
                  </p>
                  <button
                    type="button"
                    onClick={() => addArtwork(projectId)}
                    className="text-lg leading-none text-[#ebff00]"
                  >
                    +
                  </button>
                </div>

                <div className="mt-4 border border-dashed border-white/10 bg-[#0d0d0d] px-3 py-4 text-center text-[11px] uppercase tracking-[0.18em] text-[#666]">
                  Add artworks
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto border-b border-white/8 px-4 py-4 scrollbar-subtle">
                <div className="space-y-1.5">
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
                      <div
                        key={artwork.id}
                        className={`flex items-center justify-between gap-2 border px-3 py-2.5 transition ${
                          isSelected
                            ? "border-[#ebff00]/70 bg-[#161616] text-[#f3f3f3]"
                            : "border-white/8 bg-[#111111] text-[#989898]"
                        }`}
                      >
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => {
                            if (placement) {
                              selectWall(projectId, placement.wallId);
                              handleSelectPlacement(placement.id, false);
                              return;
                            }

                            selectArtwork(projectId, artwork.id);
                            setInspectorTab("props");
                          }}
                        >
                          <span className="block truncate text-[12px] uppercase tracking-[0.16em] text-[#e7e5de]">
                            {artwork.title}
                          </span>
                          <span className="block truncate pt-1 text-[12px] text-[#6f6d67]">
                            {artwork.artist}
                          </span>
                        </button>
                        <div className="flex shrink-0 items-center gap-1">
                          {wallLabel ? (
                            <span className="text-[12px] text-[#ebff00]">{wallLabel}</span>
                          ) : (
                            <button
                              type="button"
                              className="min-h-[44px] px-2 text-[12px] uppercase tracking-[0.14em] text-[#ebff00]"
                              onClick={() => {
                                if (selectedWall) {
                                  placeArtworkOnWall(projectId, artwork.id, selectedWall.id);
                                }
                              }}
                            >
                              Place
                            </button>
                          )}
                          <button
                            type="button"
                            className="min-h-[44px] px-2 text-[14px] text-[#555] transition hover:text-[#ff7b72]"
                            aria-label={`Delete ${artwork.title}`}
                            onClick={() => deleteArtwork(projectId, artwork.id)}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-5 px-4 py-4">
                {selectedPlacement && selectedArtwork ? (
                  <div className="space-y-2.5 border border-white/8 bg-[#0d0d0d] px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-[#7a7a7a]">
                          Selection
                        </p>
                        <p className="mt-1 text-[11px] text-[#f1f1f1]">
                          {selectedPlacementLabel ?? "A1"} / {selectedArtwork.title}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => updatePlacement(projectId, selectedPlacement.id, {
                          isLocked: !selectedPlacement.isLocked,
                        })}
                        className={`border px-2 py-1 text-[11px] uppercase tracking-[0.18em] ${
                          selectedPlacement.isLocked
                            ? "border-[#ebff00]/40 text-[#ebff00]"
                            : "border-white/10 text-[#9a9a9a]"
                        }`}
                      >
                        {selectedPlacement.isLocked ? "Locked" : "Unlocked"}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <CompactInput
                        label="X"
                        value={Math.round(selectedPlacement.xMm / 10)}
                        onChange={(value) =>
                          updatePlacement(projectId, selectedPlacement.id, {
                            xMm: value * 10,
                          })
                        }
                      />
                      <CompactInput
                        label="Y"
                        value={Math.round(selectedPlacement.yMm / 10)}
                        onChange={(value) =>
                          updatePlacement(projectId, selectedPlacement.id, {
                            yMm: value * 10,
                          })
                        }
                      />
                      <CompactInput
                        label="W"
                        value={Math.round(selectedArtwork.widthMm / 10)}
                        onChange={(value) =>
                          updateArtwork(projectId, selectedArtwork.id, {
                            widthMm: value * 10,
                          })
                        }
                      />
                      <CompactInput
                        label="H"
                        value={Math.round(selectedArtwork.heightMm / 10)}
                        onChange={(value) =>
                          updateArtwork(projectId, selectedArtwork.id, {
                            heightMm: value * 10,
                          })
                        }
                      />
                    </div>

                    <label className="grid gap-1.5">
                      <span className="text-[11px] uppercase tracking-[0.2em] text-[#7a7a7a]">
                        Mount
                      </span>
                      <select
                        className="w-full border border-white/10 bg-[#151515] px-3 py-1.5 text-[12px] text-[#e8e8e8] outline-none transition focus:border-white/20"
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
                    </label>

                    <label className="grid gap-1.5">
                      <span className="text-[11px] uppercase tracking-[0.2em] text-[#7a7a7a]">
                        Notes
                      </span>
                      <input
                        value={selectedPlacement.installNotes}
                        placeholder="Install notes"
                        onChange={(event) =>
                          updatePlacement(projectId, selectedPlacement.id, {
                            installNotes: event.target.value,
                          })
                        }
                        className="w-full border border-white/10 bg-[#151515] px-3 py-1.5 text-[12px] text-[#e8e8e8] outline-none transition focus:border-white/20"
                      />
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedPlacement.requiresTeamLift}
                        onChange={(event) =>
                          updatePlacement(projectId, selectedPlacement.id, {
                            requiresTeamLift: event.target.checked,
                          })
                        }
                        className="accent-[#ebff00]"
                      />
                      <span className="text-[12px] text-[#c9c8c1]">Requires team lift</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => deletePlacement(projectId, selectedPlacement.id)}
                      className="w-full border border-white/10 py-2 text-[11px] uppercase tracking-[0.18em] text-[#9a9a9a] transition hover:border-[#ff7b72]/40 hover:text-[#ff7b72]"
                    >
                      Remove from wall
                    </button>
                  </div>
                ) : null}

                <div className="space-y-2.5 border border-white/8 bg-[#0d0d0d] px-3 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#7a7a7a]">
                      Lights
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        addLight(projectId, room.id);
                        setInspectorTab("lights");
                      }}
                      className="text-lg leading-none text-[#ebff00]"
                    >
                      +
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {bundle.lights.map((light) => (
                      <button
                        key={light.id}
                        type="button"
                        onClick={() => handleSelectLight(light.id)}
                        className={`flex w-full items-center justify-between border px-3 py-2 text-left transition ${
                          selectedLight?.id === light.id
                            ? "border-[#ebff00]/70 bg-[#161616] text-[#f3f3f3]"
                            : "border-white/8 bg-[#111111] text-[#989898] hover:border-white/14 hover:bg-[#141414]"
                        }`}
                      >
                        <div>
                          <span className="block text-[12px] uppercase tracking-[0.16em]">
                            {light.label}
                          </span>
                          <span className="mt-1 block text-[12px] text-[#6f6d67]">
                            {light.temperatureK}K / {light.intensity}
                          </span>
                        </div>
                        <span className={light.enabled ? "text-[#ebff00]" : "text-[#666]"}>
                          {light.enabled ? "On" : "Off"}
                        </span>
                      </button>
                    ))}
                  </div>

                  {selectedLight ? (
                    <div className="space-y-2 border-t border-white/8 pt-3">
                      <label className="grid gap-1.5">
                        <span className="text-[11px] uppercase tracking-[0.2em] text-[#7a7a7a]">
                          Label
                        </span>
                        <input
                          value={selectedLight.label}
                          onChange={(event) =>
                            updateLight(projectId, selectedLight.id, {
                              label: event.target.value,
                            })
                          }
                          className="w-full border border-white/10 bg-[#151515] px-3 py-1.5 text-[12px] text-[#e8e8e8] outline-none transition focus:border-white/20"
                        />
                      </label>

                      <div className="grid grid-cols-3 gap-2">
                        <CompactInput
                          label="X"
                          value={Math.round(selectedLight.xMm / 10)}
                          onChange={(value) =>
                            updateLight(projectId, selectedLight.id, { xMm: value * 10 })
                          }
                        />
                        <CompactInput
                          label="Z"
                          value={Math.round(selectedLight.zMm / 10)}
                          onChange={(value) =>
                            updateLight(projectId, selectedLight.id, { zMm: value * 10 })
                          }
                        />
                        <CompactInput
                          label="H"
                          value={Math.round(selectedLight.heightMm / 10)}
                          onChange={(value) =>
                            updateLight(projectId, selectedLight.id, { heightMm: value * 10 })
                          }
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <CompactInput
                          label="K"
                          value={selectedLight.temperatureK}
                          step={100}
                          onChange={(value) =>
                            updateLight(projectId, selectedLight.id, {
                              temperatureK: Math.max(2200, Math.min(6500, value)),
                            })
                          }
                        />
                        <CompactInput
                          label="I"
                          value={selectedLight.intensity}
                          onChange={(value) =>
                            updateLight(projectId, selectedLight.id, {
                              intensity: Math.max(0, Math.min(140, value)),
                            })
                          }
                        />
                        <CompactInput
                          label="Beam"
                          value={selectedLight.beamAngleDeg}
                          onChange={(value) =>
                            updateLight(projectId, selectedLight.id, {
                              beamAngleDeg: Math.max(10, Math.min(80, value)),
                            })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateLight(projectId, selectedLight.id, {
                              enabled: !selectedLight.enabled,
                            })
                          }
                          className={`border px-2 py-1 text-[11px] uppercase tracking-[0.18em] ${
                            selectedLight.enabled
                              ? "border-[#ebff00]/40 text-[#ebff00]"
                              : "border-white/10 text-[#9a9a9a]"
                          }`}
                        >
                          {selectedLight.enabled ? "Enabled" : "Disabled"}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteLight(projectId, selectedLight.id)}
                          className="border border-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-[#9a9a9a]"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#7a7a7a]">
                    Wall color
                  </p>
                  <div className="mt-3 flex gap-2">
                    {WALL_COLOR_OPTIONS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => updatePlannerUi(projectId, { wallColor: color })}
                        className={`h-11 w-11 border-2 ${
                          wallColor === color ? "border-[#ebff00]" : "border-white/12"
                        }`}
                        style={{ backgroundColor: color }}
                        aria-label={`Wall color ${color}`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#7a7a7a]">
                    Ambient light
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <input
                      type="range"
                      min={20}
                      max={140}
                      value={ambientLight}
                      onChange={(event) => updatePlannerUi(projectId, { ambientLight: Number(event.target.value) })}
                      className="h-px w-full appearance-none bg-white/12 accent-[#ebff00]"
                    />
                    <span className="w-8 text-right text-[11px] text-[#ebff00]">
                      {ambientLight}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            </aside>
          ) : null}

          <div className="order-1 flex min-h-[60svh] min-w-0 flex-col bg-[#070707] xl:order-none">
            {/* Mobile-only wall selector — desktop uses sidebar wall list */}
            <div className="safe-x flex items-center gap-2 overflow-x-auto border-b border-white/8 bg-[#0e0e0e] px-3 py-2 scrollbar-subtle xl:hidden">
              {bundle.walls.map((wall) => (
                <button
                  key={wall.id}
                  type="button"
                  onClick={() => selectWall(projectId, wall.id)}
                  className={`shrink-0 border px-3 py-2 text-[11px] uppercase tracking-[0.18em] transition ${
                    selectedWall?.id === wall.id
                      ? "border-[#ebff00]/60 bg-[#161616] text-[#ebff00]"
                      : "border-white/10 text-[#7a7a7a]"
                  }`}
                >
                  {wall.name.replace("Wall ", "")}
                </button>
              ))}
              {(["elevation", "spatial", "plan"] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setActiveView(projectId, view)}
                  className={`shrink-0 border px-3 py-2 text-[11px] uppercase tracking-[0.18em] transition ${
                    ui.activeView === view
                      ? "border-[#ebff00]/60 bg-[#161616] text-[#ebff00]"
                      : "border-white/10 text-[#7a7a7a]"
                  }`}
                >
                  {view === "elevation" ? "2D" : view === "spatial" ? "3D" : "Top"}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between border-b border-white/8 bg-[#0d0d0d] px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-[#696969]">
              <div className="flex items-center gap-3">
                <span className="text-[#f3f1e8]">{selectedWall?.name ?? "No wall"}</span>
                {selectedWall ? (
                  <span>{formatCompactCm(selectedWall.lengthMm)} x {formatCompactCm(selectedWall.heightMm)}</span>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <span>{ui.activeView === "spatial" ? "Spatial" : ui.activeView === "plan" ? "Floor plan" : "Elevation"}</span>
                <span>{wallPlacements.length} works</span>
              </div>
            </div>

            <div className="relative flex-1 overflow-hidden">
              {ui.activeView === "plan" ? (
                <div className="h-full overflow-auto p-4">
                  <RoomPlanView
                    room={room}
                    walls={bundle.walls}
                    openings={bundle.openings}
                    placements={bundle.placements}
                    artworks={bundle.artworks}
                    selectedWallId={selectedWall?.id}
                    selectedOpeningId={ui.selectedOpeningId}
                    onSelectWall={(wallId) => selectWall(projectId, wallId)}
                    onSelectOpening={(openingId) => selectOpening(projectId, openingId)}
                  />
                </div>
              ) : selectedWall ? (
                ui.activeView === "spatial" ? (
                  <Room3DView
                    room={room}
                    walls={bundle.walls}
                    openings={bundle.openings}
                    lights={bundle.lights}
                    placements={bundle.placements}
                    artworks={bundle.artworks}
                    selectedWallId={selectedWall.id}
                    selectedLightId={selectedLight?.id}
                    selectedPlacementIds={ui.selectedPlacementIds}
                    primaryPlacementId={ui.primaryPlacementId}
                    savedCameraViews={ui.savedCameraViews}
                    onSelectWall={(wallId) => selectWall(projectId, wallId)}
                    onSelectLight={handleSelectLight}
                    onSelectPlacement={handleSelectPlacement}
                    onUpdateLight={(lightId, patch) =>
                      updateLight(projectId, lightId, patch)
                    }
                    onSaveCameraView={(view) => saveCameraView(projectId, view)}
                    onDeleteCameraView={(cameraViewId) =>
                      deleteCameraView(projectId, cameraViewId)
                    }
                    embedded
                    multiSelectMode={multiSelectMode}
                    wallColor={wallColor}
                    ambientIntensity={ambientLight / 100}
                  />
                ) : (
                  <WallElevationView
                    wall={selectedWall}
                    artworks={bundle.artworks}
                    openings={bundle.openings.filter(
                      (opening) => opening.wallId === selectedWall.id,
                    )}
                    placements={wallPlacements}
                    selectedPlacement={
                      selectedPlacement?.wallId === selectedWall.id ? selectedPlacement : null
                    }
                    selectedArtwork={
                      selectedPlacement?.wallId === selectedWall.id ? selectedArtwork : null
                    }
                    selectedPlacementLabel={
                      selectedPlacement?.wallId === selectedWall.id
                        ? selectedPlacementLabel
                        : null
                    }
                    selectedPlacementIds={ui.selectedPlacementIds}
                    selectedOpeningId={ui.selectedOpeningId}
                    onSelectOpening={(openingId) => {
                      selectOpening(projectId, openingId);
                    }}
                    onSelectPlacement={handleSelectPlacement}
                    onUpdatePlacement={(placementId, patch) =>
                      updatePlacement(projectId, placementId, patch)
                    }
                    onUpdatePlacements={(patches) => updatePlacements(projectId, patches)}
                    multiSelectMode={multiSelectMode}
                  />
                )
              ) : (
                <div className="grid h-full min-h-[680px] place-items-center px-6 py-16 text-center text-sm text-[#6f6f6f]">
                  Select a wall
                </div>
              ) }

              <div className="safe-bottom pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-4">
                <div className="pointer-events-auto flex items-center gap-1 border border-white/10 bg-[#0e0e0e]/96 px-2.5 py-2 shadow-[0_12px_28px_rgba(0,0,0,0.42)]">
                  <QuickActionButton
                    label="2D"
                    active={ui.activeView === "elevation"}
                    onClick={() => setActiveView(projectId, "elevation")}
                  />
                  <QuickActionButton
                    label="3D"
                    active={ui.activeView === "spatial"}
                    onClick={() => setActiveView(projectId, "spatial")}
                  />
                  <QuickActionButton
                    label="Top"
                    active={ui.activeView === "plan"}
                    onClick={() => setActiveView(projectId, "plan")}
                    title="Floor plan view"
                  />
                  {ui.activeView === "elevation" ? (
                    <QuickActionButton
                      label="+"
                      active={multiSelectMode}
                      onClick={() => setMultiSelectMode((v) => !v)}
                      title="Multi-select mode"
                    />
                  ) : null}
                  <QuickActionButton
                    label="P"
                    active={inspectorTab === "props"}
                    onClick={() => setInspectorTab("props")}
                  />
                  <QuickActionButton
                    label="L"
                    active={inspectorTab === "lights"}
                    onClick={() => setInspectorTab("lights")}
                  />
                  <QuickActionButton
                    label="M"
                    active={inspectorTab === "plan"}
                    onClick={() => setInspectorTab("plan")}
                  />
                </div>
              </div>
            </div>
          </div>

          {showInspectorPanel ? (
            <aside className="order-3 border-t border-white/8 bg-[#101010] xl:border-l xl:border-t-0">
            <div className="flex border-b border-white/8 bg-[#0f0f0f]">
              <InspectorTab
                label="Props"
                active={inspectorTab === "props"}
                onClick={() => setInspectorTab("props")}
              />
              <InspectorTab
                label="Lights"
                active={inspectorTab === "lights"}
                onClick={() => setInspectorTab("lights")}
              />
              <InspectorTab
                label="Plan"
                active={inspectorTab === "plan"}
                onClick={() => setInspectorTab("plan")}
              />
            </div>

            <div className="p-3.5">
              {inspectorTab === "props" ? (
                selectedPlacement && selectedArtwork && selectedWall ? (
                  <div className="space-y-3">
                    <div className="border-b border-white/8 pb-4">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-[#7a7a7a]">
                        {selectedPlacementLabel ?? "A1"}
                      </p>
                      <h3 className="mt-1.5 text-[13px] font-semibold text-[#f1f1f1]">
                        {selectedArtwork.title}
                      </h3>
                      <p className="mt-1 text-[11px] text-[#7e7e7e]">{selectedArtwork.artist}</p>
                    </div>

                    <div className="grid gap-1.5">
                      <CompactStatRow
                        label="Wall"
                        value={selectedWall.name.replace("Wall ", "")}
                      />
                      <CompactStatRow label="X" value={formatCompactCm(selectedPlacement.xMm)} />
                      <CompactStatRow label="Y" value={formatCompactCm(selectedPlacement.yMm)} />
                      <CompactStatRow
                        label="C"
                        value={formatCompactCm(getPlacementCenterlineMm(selectedPlacement))}
                      />
                    </div>

                    <div className="space-y-2 border-t border-white/8 pt-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#7a7a7a]">
                        Artwork
                      </p>
                      <label className="grid gap-1">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-[#5a5a5a]">Title</span>
                        <input
                          value={selectedArtwork.title}
                          onChange={(e) => updateArtwork(projectId, selectedArtwork.id, { title: e.target.value })}
                          className="w-full border border-white/8 bg-[#131313] px-2 py-1.5 text-[12px] text-[#e8e8e8] outline-none transition focus:border-white/16"
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-[#5a5a5a]">Artist</span>
                        <input
                          value={selectedArtwork.artist}
                          onChange={(e) => updateArtwork(projectId, selectedArtwork.id, { artist: e.target.value })}
                          className="w-full border border-white/8 bg-[#131313] px-2 py-1.5 text-[12px] text-[#e8e8e8] outline-none transition focus:border-white/16"
                        />
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <CompactInput
                          label="W (cm)"
                          value={Math.round(selectedArtwork.widthMm / 10)}
                          onChange={(v) => updateArtwork(projectId, selectedArtwork.id, { widthMm: v * 10 })}
                        />
                        <CompactInput
                          label="H (cm)"
                          value={Math.round(selectedArtwork.heightMm / 10)}
                          onChange={(v) => updateArtwork(projectId, selectedArtwork.id, { heightMm: v * 10 })}
                        />
                      </div>
                      <label className="grid gap-1">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-[#5a5a5a]">Mount</span>
                        <select
                          className="w-full border border-white/8 bg-[#131313] px-2 py-1.5 text-[12px] text-[#e8e8e8] outline-none transition focus:border-white/16"
                          value={selectedPlacement.mountType}
                          onChange={(e) => updatePlacement(projectId, selectedPlacement.id, { mountType: e.target.value as MountType })}
                        >
                          {MOUNT_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    {ui.selectedPlacementIds.length >= 2 ? (
                      <div className="space-y-2 border-t border-white/8 pt-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-[#7a7a7a]">
                          Align {ui.selectedPlacementIds.length} selected
                        </p>
                        <div className="grid grid-cols-3 gap-1">
                          {(["left", "horizontal-center", "right", "top", "centerline", "bottom"] as const).map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => alignSelectedPlacements(projectId, mode)}
                              className="border border-white/10 py-1.5 text-[11px] uppercase tracking-[0.12em] text-[#9a9a9a] transition hover:border-white/20 hover:text-[#f1f1f1]"
                            >
                              {mode.replace("horizontal-", "H-").replace("centerline", "CL")}
                            </button>
                          ))}
                        </div>
                        {ui.selectedPlacementIds.length >= 3 ? (
                          <div className="grid grid-cols-2 gap-1">
                            <button
                              type="button"
                              onClick={() => distributeSelectedPlacements(projectId, "horizontal")}
                              className="border border-white/10 py-1.5 text-[11px] uppercase tracking-[0.12em] text-[#9a9a9a] transition hover:border-white/20 hover:text-[#f1f1f1]"
                            >
                              Dist H
                            </button>
                            <button
                              type="button"
                              onClick={() => distributeSelectedPlacements(projectId, "vertical")}
                              className="border border-white/10 py-1.5 text-[11px] uppercase tracking-[0.12em] text-[#9a9a9a] transition hover:border-white/20 hover:text-[#f1f1f1]"
                            >
                              Dist V
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {selectedWall && wallPlacements.length >= 2 ? (
                      <div className="border-t border-white/8 pt-3">
                        <button
                          type="button"
                          onClick={() => autoSequenceWallPlacements(projectId, selectedWall.id)}
                          className="w-full border border-white/10 py-2 text-[11px] uppercase tracking-[0.18em] text-[#9a9a9a] transition hover:border-white/20 hover:text-[#f1f1f1]"
                        >
                          Auto-sequence wall
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : selectedOpening ? (
                  <div className="space-y-3">
                    <div className="border-b border-white/8 pb-4">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-[#7a7a7a]">
                        {selectedOpening.type}
                      </p>
                      <h3 className="mt-1.5 text-[13px] font-semibold text-[#f1f1f1]">
                        {selectedOpening.label}
                      </h3>
                    </div>
                    <div className="space-y-2">
                      <label className="grid gap-1">
                        <span className="text-[11px] uppercase tracking-[0.2em] text-[#7a7a7a]">Label</span>
                        <input
                          value={selectedOpening.label}
                          onChange={(event) =>
                            updateOpening(projectId, selectedOpening.id, { label: event.target.value })
                          }
                          className="w-full border border-white/10 bg-[#151515] px-3 py-1.5 text-[12px] text-[#e8e8e8] outline-none"
                        />
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <CompactInput
                        label="X (cm)"
                        value={Math.round(selectedOpening.xMm / 10)}
                        onChange={(v) => updateOpening(projectId, selectedOpening.id, { xMm: v * 10 })}
                      />
                      <CompactInput
                        label="Y (cm)"
                        value={Math.round(selectedOpening.yMm / 10)}
                        onChange={(v) => updateOpening(projectId, selectedOpening.id, { yMm: v * 10 })}
                      />
                      <CompactInput
                        label="W (cm)"
                        value={Math.round(selectedOpening.widthMm / 10)}
                        onChange={(v) => updateOpening(projectId, selectedOpening.id, { widthMm: v * 10 })}
                      />
                      <CompactInput
                        label="H (cm)"
                        value={Math.round(selectedOpening.heightMm / 10)}
                        onChange={(v) => updateOpening(projectId, selectedOpening.id, { heightMm: v * 10 })}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteOpening(projectId, selectedOpening.id)}
                      className="w-full border border-white/10 py-2 text-[11px] uppercase tracking-[0.18em] text-[#9a9a9a] transition hover:border-[#ff7b72]/40 hover:text-[#ff7b72]"
                    >
                      Delete opening
                    </button>
                  </div>
                ) : (
                  <div className="pt-8 text-center text-[12px] uppercase tracking-[0.22em] text-[#666]">
                    Select artwork or opening
                  </div>
                )
              ) : null}

              {inspectorTab === "lights" ? (
                selectedLight ? (
                  <div className="space-y-3">
                    <div className="border-b border-white/8 pb-4">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-[#7a7a7a]">
                        {selectedLight.label}
                      </p>
                      <h3 className="mt-1.5 text-[13px] font-semibold text-[#f1f1f1]">
                        Room light
                      </h3>
                      <p className="mt-1 text-[11px] text-[#7e7e7e]">
                        {selectedLight.enabled ? "Enabled" : "Disabled"}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <CompactStatRow label="X" value={formatCompactCm(selectedLight.xMm)} />
                      <CompactStatRow label="Z" value={formatCompactCm(selectedLight.zMm)} />
                      <CompactStatRow
                        label="H"
                        value={formatCompactCm(selectedLight.heightMm)}
                      />
                      <CompactStatRow label="K" value={`${selectedLight.temperatureK}K`} />
                      <CompactStatRow label="I" value={`${selectedLight.intensity}`} />
                      <CompactStatRow
                        label="Beam"
                        value={`${selectedLight.beamAngleDeg}deg`}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <CompactStatRow label="Ambient" value={`${ambientLight}`} />
                    <CompactStatRow label="Wall" value={wallColor.toUpperCase()} />
                    <CompactStatRow label="Saved" value={ui.savedCameraViews.length.toString()} />
                    <CompactStatRow label="Lights" value={bundle.lights.length.toString()} />
                  </div>
                )
              ) : null}

              {inspectorTab === "plan" ? (
                <div className="space-y-3">
                  <MiniPlanView
                    room={room}
                    walls={bundle.walls}
                    openings={bundle.openings}
                    placements={bundle.placements}
                    selectedWallId={selectedWall?.id}
                    onSelectWall={(wallId) => selectWall(projectId, wallId)}
                  />
                  <CompactStatRow label="Room" value={room.name} />
                  <CompactStatRow
                    label="Wall"
                    value={selectedWall?.name.replace("Wall ", "") ?? "A"}
                  />
                  <CompactStatRow label="Placed" value={wallPlacements.length.toString()} />
                  <CompactStatRow
                    label="Openings"
                    value={bundle.openings
                      .filter((opening) => opening.wallId === selectedWall?.id)
                      .length.toString()}
                  />
                </div>
              ) : null}
            </div>
            </aside>
          ) : null}
        </section>

        <footer className="safe-x safe-bottom flex flex-wrap items-center justify-between gap-3 border-t border-white/8 bg-[#0f0f0f] px-3 py-2 text-[12px] uppercase tracking-[0.18em] text-[#6e6e6e]">
          <div className="flex flex-wrap items-center gap-2">
            <FooterPill label="Room" value={room.name} />
            <FooterPill label="Placed" value={bundle.placements.length.toString()} />
            <FooterPill label="Lights" value={bundle.lights.length.toString()} />
            <FooterPill
              label="Sel"
              value={selectedLight?.label ?? selectedPlacementLabel ?? "--"}
            />
          </div>
        </footer>
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
      selectOpening: state.selectOpening,
      selectLight: state.selectLight,
      selectPlacement: state.selectPlacement,
      addArtwork: state.addArtwork,
      addOpening: state.addOpening,
      addLight: state.addLight,
      placeArtworkOnWall: state.placeArtworkOnWall,
      updateRoom: state.updateRoom,
      updateArtwork: state.updateArtwork,
      updateOpening: state.updateOpening,
      updateLight: state.updateLight,
      updatePlacement: state.updatePlacement,
      updatePlacements: state.updatePlacements,
      updatePlannerUi: state.updatePlannerUi,
      deleteArtwork: state.deleteArtwork,
      deletePlacement: state.deletePlacement,
      deleteOpening: state.deleteOpening,
      deleteLight: state.deleteLight,
      alignSelectedPlacements: state.alignSelectedPlacements,
      distributeSelectedPlacements: state.distributeSelectedPlacements,
      autoSequenceWallPlacements: state.autoSequenceWallPlacements,
      saveCameraView: state.saveCameraView,
      deleteCameraView: state.deleteCameraView,
    })),
  );
}

function CompactStatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border border-white/8 bg-[#141414] px-3 py-1.5">
      <span className="text-[11px] uppercase tracking-[0.2em] text-[#737373]">
        {label}
      </span>
      <span className="text-[12px] font-medium text-[#f1f1f1]">{value}</span>
    </div>
  );
}

function CompactInput({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.2em] text-[#7a7a7a]">
        {label}
      </span>
      <input
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="w-full border border-white/10 bg-[#151515] px-2.5 py-1.5 text-[12px] text-[#e8e8e8] outline-none transition focus:border-white/20"
      />
    </label>
  );
}

function TopNavButton({
  label,
  value,
  active = false,
  onClick,
}: {
  label: string;
  value?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-[44px] items-center gap-2 border px-3 text-[11px] uppercase tracking-[0.22em] transition ${
        active
          ? "border-[#ebff00]/40 bg-[#161616] text-[#ebff00]"
          : "border-white/8 bg-[#0f0f0f] text-[#8a8a8a] hover:border-white/16 hover:text-[#d0d0d0]"
      }`}
    >
      <span>{label}</span>
      {value ? (
        <span className="text-[#d4d4d4] normal-case tracking-normal">{value}</span>
      ) : null}
    </button>
  );
}

function InspectorTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[44px] min-w-0 flex-1 border-r border-white/8 px-3 py-3 text-[11px] uppercase tracking-[0.24em] last:border-r-0 ${
        active
          ? "border-b border-b-[#ebff00] bg-[#121212] text-[#ebff00]"
          : "text-[#666] hover:text-[#bdbdbd]"
      }`}
    >
      {label}
    </button>
  );
}

function QuickActionButton({
  label,
  active = false,
  onClick,
  title,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`grid h-[44px] min-w-[44px] place-items-center border px-2 text-[11px] uppercase tracking-[0.18em] ${
        active
          ? "border-[#ebff00] bg-[#151515] text-[#ebff00]"
          : "border-white/10 text-[#5f5f5f] hover:border-white/16 hover:text-[#cfcfcf]"
      }`}
    >
      {label}
    </button>
  );
}

function FooterPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 border border-white/8 bg-[#121212] px-2.5 py-1">
      <span>{label}</span>
      <span className="text-[#ebff00]">{value}</span>
    </span>
  );
}

function MiniPlanView({
  room,
  walls,
  openings,
  placements,
  selectedWallId,
  onSelectWall,
}: {
  room: { widthMm: number; depthMm: number };
  walls: Array<{ id: string; index: 0 | 1 | 2 | 3; name: string }>;
  openings: Array<{ wallId: string; xMm: number; widthMm: number }>;
  placements: Array<{ wallId: string; xMm: number; widthMm: number }>;
  selectedWallId?: string;
  onSelectWall: (wallId: string) => void;
}) {
  const width = 320;
  const height = 220;

  return (
    <div className="border border-white/8 bg-[#131313] p-2.5">
      <svg className="block h-[172px] w-full bg-[#0c0c0c]" viewBox="-24 -24 368 268">
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill="none"
          stroke="rgba(255,255,255,0.24)"
          strokeWidth={2}
        />
        {walls.map((wall) => {
          const active = wall.id === selectedWallId;
          const stroke = active ? "#ebff00" : "rgba(255,255,255,0.18)";

          if (wall.index === 0) {
            return (
              <line
                key={wall.id}
                x1={0}
                y1={0}
                x2={width}
                y2={0}
                stroke={stroke}
                strokeWidth={8}
                onClick={() => onSelectWall(wall.id)}
              />
            );
          }
          if (wall.index === 1) {
            return (
              <line
                key={wall.id}
                x1={width}
                y1={0}
                x2={width}
                y2={height}
                stroke={stroke}
                strokeWidth={8}
                onClick={() => onSelectWall(wall.id)}
              />
            );
          }
          if (wall.index === 2) {
            return (
              <line
                key={wall.id}
                x1={0}
                y1={height}
                x2={width}
                y2={height}
                stroke={stroke}
                strokeWidth={8}
                onClick={() => onSelectWall(wall.id)}
              />
            );
          }
          return (
            <line
              key={wall.id}
              x1={0}
              y1={0}
              x2={0}
              y2={height}
              stroke={stroke}
              strokeWidth={8}
              onClick={() => onSelectWall(wall.id)}
            />
          );
        })}
        {placements.map((placement, index) => {
          const x =
            placement.wallId === walls[0]?.id || placement.wallId === walls[2]?.id
              ? (placement.xMm / room.widthMm) * width
              : placement.wallId === walls[1]?.id
                ? width - 8
                : 0;
          const y =
            placement.wallId === walls[1]?.id || placement.wallId === walls[3]?.id
              ? (placement.xMm / room.depthMm) * height
              : placement.wallId === walls[2]?.id
                ? height - 8
                : 0;
          const rectWidth =
            placement.wallId === walls[0]?.id || placement.wallId === walls[2]?.id
              ? Math.max((placement.widthMm / room.widthMm) * width, 8)
              : 8;
          const rectHeight =
            placement.wallId === walls[1]?.id || placement.wallId === walls[3]?.id
              ? Math.max((placement.widthMm / room.depthMm) * height, 8)
              : 8;

          return (
            <rect
              key={`${placement.wallId}-${index}`}
              x={x}
              y={y}
              width={rectWidth}
              height={rectHeight}
              fill="rgba(235,255,0,0.8)"
            />
          );
        })}
        {openings.map((opening, index) => {
          const x =
            opening.wallId === walls[0]?.id || opening.wallId === walls[2]?.id
              ? (opening.xMm / room.widthMm) * width
              : opening.wallId === walls[1]?.id
                ? width - 8
                : 0;
          const y =
            opening.wallId === walls[1]?.id || opening.wallId === walls[3]?.id
              ? (opening.xMm / room.depthMm) * height
              : opening.wallId === walls[2]?.id
                ? height - 8
                : 0;
          const rectWidth =
            opening.wallId === walls[0]?.id || opening.wallId === walls[2]?.id
              ? Math.max((opening.widthMm / room.widthMm) * width, 10)
              : 8;
          const rectHeight =
            opening.wallId === walls[1]?.id || opening.wallId === walls[3]?.id
              ? Math.max((opening.widthMm / room.depthMm) * height, 10)
              : 8;

          return (
            <rect
              key={`${opening.wallId}-${index}`}
              x={x}
              y={y}
              width={rectWidth}
              height={rectHeight}
              fill="rgba(255,255,255,0.32)"
            />
          );
        })}
      </svg>
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

function formatCompactCm(mm: number) {
  return mmToCm(mm).toLocaleString("en-US", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  });
}
