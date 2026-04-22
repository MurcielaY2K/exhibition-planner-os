"use client";

import { useRef, useState } from "react";
import {
  STANDARD_CENTERLINE_MM,
  arePlacementsValidOnWall,
  clampGroupDeltaToWall,
  getOpeningBoundingBox,
  getPlacementBoundingBox,
  getPlacementCenterlineMm,
  getPlacementDrillPointWarnings,
  getPlacementGroupBounds,
  getPlacementHangingPoints,
  getPlacementValidation,
  visualGuidesFromSnapGuides,
  snapPlacementOnWall,
  translatePlacement,
} from "@/lib/domain/placement";
import {
  formatArtworkSize,
  formatDimension,
  formatMillimeters,
} from "@/lib/domain/format";
import type {
  Artwork,
  DrillPointWarning,
  Opening,
  Placement,
  SnapGuide,
  VisualGuide,
  Wall,
} from "@/lib/domain/types";

interface PlacementPatch {
  id: string;
  xMm: number;
  yMm: number;
}

interface DragState {
  anchorPlacementId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  selectedPlacementIds: string[];
  startPlacements: Placement[];
  lastValidPatches: PlacementPatch[];
  guides: SnapGuide[];
  isInvalid: boolean;
}

const DRILL_POINT_CROSS_HALF_MM = 34;
const DRILL_POINT_RADIUS_MM = 14;
const DRILL_POINT_HALO_RADIUS_MM = 26;
const WARNING_COLOR = "#b7791f";
const ERROR_COLOR = "#8f3931";

export function WallElevationView({
  wall,
  artworks,
  openings,
  placements,
  selectedOpeningId,
  selectedPlacementIds,
  visualGuides,
  onSelectOpening,
  onSelectPlacement,
  onUpdatePlacements,
}: {
  wall: Wall;
  artworks: Artwork[];
  openings: Opening[];
  placements: Placement[];
  selectedOpeningId?: string;
  selectedPlacementIds: string[];
  visualGuides?: VisualGuide[];
  onSelectOpening: (openingId: string) => void;
  onSelectPlacement: (placementId: string, additive: boolean) => void;
  onUpdatePlacements: (patches: PlacementPatch[]) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const tickMarks = Array.from(
    { length: Math.floor(wall.lengthMm / 500) + 1 },
    (_, index) => index * 500,
  );
  const heightMarks = Array.from(
    { length: Math.floor(wall.heightMm / 500) + 1 },
    (_, index) => index * 500,
  );
  const standardCenterlineY = wall.heightMm - STANDARD_CENTERLINE_MM;
  const activeGuides = [
    ...(visualGuides ?? []),
    ...(dragState ? visualGuidesFromSnapGuides(dragState.guides) : []),
  ];

  function finishDrag() {
    if (!dragState) {
      return;
    }

    if (dragState.isInvalid && dragState.lastValidPatches.length > 0) {
      onUpdatePlacements(dragState.lastValidPatches);
    }

    setDragState(null);
  }

  function updateDrag(clientX: number, clientY: number) {
    if (!dragState || !svgRef.current) {
      return;
    }

    const bounds = svgRef.current.getBoundingClientRect();
    const deltaXmm =
      ((clientX - dragState.startClientX) / bounds.width) * wall.lengthMm;
    const deltaYmm =
      -((clientY - dragState.startClientY) / bounds.height) * wall.heightMm;
    const clampedDelta = clampGroupDeltaToWall(
      dragState.startPlacements,
      wall,
      deltaXmm,
      deltaYmm,
    );
    let candidatePlacements = dragState.startPlacements.map((placement) =>
      translatePlacement(
        placement,
        clampedDelta.deltaXmm,
        clampedDelta.deltaYmm,
      ),
    );
    const stationaryPlacements = placements.filter(
      (placement) => !dragState.selectedPlacementIds.includes(placement.id),
    );
    const anchorPlacement = candidatePlacements.find(
      (placement) => placement.id === dragState.anchorPlacementId,
    );

    let guides: SnapGuide[] = [];

    if (anchorPlacement) {
      const snappedAnchor = snapPlacementOnWall(
        anchorPlacement,
        wall,
        stationaryPlacements,
      );
      guides = snappedAnchor.guides;
      const snapDeltaX = snappedAnchor.placement.xMm - anchorPlacement.xMm;
      const snapDeltaY = snappedAnchor.placement.yMm - anchorPlacement.yMm;
      candidatePlacements = candidatePlacements.map((placement) =>
        translatePlacement(placement, snapDeltaX, snapDeltaY),
      );
    }

    const correctedGroup = fitPlacementsToWall(candidatePlacements, wall);
    const patches = correctedGroup.map((placement) => ({
      id: placement.id,
      xMm: placement.xMm,
      yMm: placement.yMm,
    }));
    const isValid = arePlacementsValidOnWall(
      correctedGroup,
      wall,
      stationaryPlacements,
      openings,
    );

    onUpdatePlacements(patches);
    setDragState((current) =>
      current
        ? {
            ...current,
            guides,
            isInvalid: !isValid,
            lastValidPatches: isValid ? patches : current.lastValidPatches,
          }
        : current,
    );
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-black/8 bg-white shadow-[0_18px_60px_rgba(37,33,28,0.08)]">
      <div className="flex items-center justify-between border-b border-black/8 px-6 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-strong)]">
            Wall Elevation
          </p>
          <h3 className="mt-1 text-lg font-semibold">{wall.name}</h3>
        </div>
        <p className="rounded-full border border-black/8 bg-[var(--surface-muted)] px-3 py-1 text-sm text-[var(--muted-strong)]">
          {formatDimension(wall.lengthMm)} L / {formatDimension(wall.heightMm)} H
        </p>
      </div>

      <svg
        ref={svgRef}
        className="block h-[52svh] min-h-[360px] w-full bg-[linear-gradient(180deg,#faf8f3_0%,#f2ece2_100%)] sm:h-[560px]"
        viewBox={`0 0 ${wall.lengthMm} ${wall.heightMm}`}
        onPointerMove={(event) => updateDrag(event.clientX, event.clientY)}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <line
          x1={0}
          x2={wall.lengthMm}
          y1={standardCenterlineY}
          y2={standardCenterlineY}
          stroke="rgba(43, 97, 82, 0.45)"
          strokeWidth={18}
          strokeDasharray="120 80"
        />
        <text
          x={wall.lengthMm - 160}
          y={standardCenterlineY - 46}
          fontSize={96}
          textAnchor="end"
          fill="rgba(43, 97, 82, 0.92)"
        >
          Standard centerline {formatMillimeters(STANDARD_CENTERLINE_MM)}
        </text>

        {activeGuides.map((guide, index) =>
          guide.axis === "x" ? (
            <line
              key={`${guide.label}-${guide.coordinateMm}-${index}`}
              x1={guide.coordinateMm}
              x2={guide.coordinateMm}
              y1={0}
              y2={wall.heightMm}
              stroke="rgba(28, 59, 84, 0.62)"
              strokeWidth={14}
              strokeDasharray="80 70"
            />
          ) : (
            <line
              key={`${guide.label}-${guide.coordinateMm}-${index}`}
              x1={0}
              x2={wall.lengthMm}
              y1={wall.heightMm - guide.coordinateMm}
              y2={wall.heightMm - guide.coordinateMm}
              stroke="rgba(28, 59, 84, 0.62)"
              strokeWidth={14}
              strokeDasharray="80 70"
            />
          ),
        )}

        {heightMarks.map((mark) => (
          <g key={`height-${mark}`}>
            <line
              x1={0}
              x2={wall.lengthMm}
              y1={wall.heightMm - mark}
              y2={wall.heightMm - mark}
              stroke="rgba(47, 43, 37, 0.07)"
              strokeWidth={16}
            />
            <text
              x={120}
              y={wall.heightMm - mark - 48}
              fontSize={110}
              fill="rgba(66, 60, 52, 0.52)"
            >
              {formatDimension(mark)}
            </text>
          </g>
        ))}

        {tickMarks.map((mark) => (
          <line
            key={`tick-${mark}`}
            x1={mark}
            x2={mark}
            y1={0}
            y2={wall.heightMm}
            stroke="rgba(47, 43, 37, 0.05)"
            strokeWidth={12}
          />
        ))}

        <line
          x1={0}
          x2={wall.lengthMm}
          y1={wall.heightMm}
          y2={wall.heightMm}
          stroke="rgba(47, 43, 37, 0.18)"
          strokeWidth={28}
        />

        {openings.map((opening) => {
          const box = getOpeningBoundingBox(opening);
          const topY = wall.heightMm - box.topMm;
          const isSelected = opening.id === selectedOpeningId;
          const fill =
            opening.type === "door"
              ? "rgba(250, 248, 243, 0.94)"
              : "rgba(199, 220, 235, 0.45)";
          const stroke =
            opening.type === "door" ? "rgba(78, 70, 61, 0.72)" : "rgba(28,59,84,0.78)";

          return (
            <g key={opening.id} onPointerDown={() => onSelectOpening(opening.id)}>
              <rect
                x={box.leftMm}
                y={topY}
                width={box.widthMm}
                height={box.heightMm}
                fill={fill}
                stroke={stroke}
                strokeWidth={18}
                rx={opening.type === "window" ? 26 : 12}
                style={{ cursor: "pointer" }}
              />
              {opening.type === "window" ? (
                <>
                  <line
                    x1={box.leftMm}
                    x2={box.rightMm}
                    y1={topY + box.heightMm / 2}
                    y2={topY + box.heightMm / 2}
                    stroke="rgba(28,59,84,0.55)"
                    strokeWidth={12}
                  />
                  <line
                    x1={box.leftMm + box.widthMm / 2}
                    x2={box.leftMm + box.widthMm / 2}
                    y1={topY}
                    y2={topY + box.heightMm}
                    stroke="rgba(28,59,84,0.55)"
                    strokeWidth={12}
                  />
                </>
              ) : (
                <line
                  x1={box.leftMm}
                  x2={box.rightMm}
                  y1={wall.heightMm}
                  y2={wall.heightMm}
                  stroke="rgba(78, 70, 61, 0.8)"
                  strokeWidth={20}
                />
              )}
              {isSelected ? (
                <rect
                  x={box.leftMm - 28}
                  y={topY - 28}
                  width={box.widthMm + 56}
                  height={box.heightMm + 56}
                  fill="none"
                  stroke="#2b6152"
                  strokeWidth={12}
                  strokeDasharray="90 50"
                />
              ) : null}
              <text
                x={box.leftMm + 80}
                y={topY + 150}
                fontSize={96}
                fill="rgba(48,43,37,0.8)"
              >
                {opening.label ?? (opening.type === "door" ? "Door" : "Window")}
              </text>
            </g>
          );
        })}

        {placements.map((placement) => {
          const artwork = artworks.find((entry) => entry.id === placement.artworkId);

          if (!artwork) {
            return null;
          }

          const validation = getPlacementValidation(placement, wall, placements, openings);
          const box = getPlacementBoundingBox(placement);
          const hangingPoints = getPlacementHangingPoints(placement);
          const drillWarnings = getPlacementDrillPointWarnings(
            placement,
            wall,
            placements.filter((entry) => entry.id !== placement.id),
            openings,
          );
          const topY = wall.heightMm - box.topMm;
          const isSelected = selectedPlacementIds.includes(placement.id);
          const centerlineY = wall.heightMm - getPlacementCenterlineMm(placement);
          const isInvalid = !validation.isValid;
          const fill = isInvalid
            ? "rgba(143, 57, 49, 0.16)"
            : isSelected
              ? "rgba(43, 97, 82, 0.2)"
              : "rgba(36, 33, 28, 0.12)";
          const stroke = isInvalid
            ? "#8f3931"
            : isSelected
              ? "#2b6152"
              : "rgba(36, 33, 28, 0.4)";

          return (
            <g
              key={placement.id}
              onPointerDown={(event) => {
                if (event.shiftKey) {
                  onSelectPlacement(placement.id, true);
                  return;
                }

                if (placement.isLocked) {
                  onSelectPlacement(placement.id, false);
                  return;
                }

                const effectiveSelection = selectedPlacementIds.includes(placement.id)
                  ? selectedPlacementIds.filter((selectedId) => {
                      const selectedPlacement = placements.find(
                        (entry) => entry.id === selectedId,
                      );
                      return selectedPlacement ? !selectedPlacement.isLocked : false;
                    })
                  : [placement.id];
                const startPlacements = placements.filter((entry) =>
                  effectiveSelection.includes(entry.id),
                );

                if (effectiveSelection.length === 0) {
                  onSelectPlacement(placement.id, false);
                  return;
                }

                if (!selectedPlacementIds.includes(placement.id)) {
                  onSelectPlacement(placement.id, false);
                }
                event.currentTarget.setPointerCapture(event.pointerId);
                setDragState({
                  anchorPlacementId: placement.id,
                  pointerId: event.pointerId,
                  startClientX: event.clientX,
                  startClientY: event.clientY,
                  selectedPlacementIds: effectiveSelection,
                  startPlacements,
                  lastValidPatches: startPlacements.map((entry) => ({
                    id: entry.id,
                    xMm: entry.xMm,
                    yMm: entry.yMm,
                  })),
                  guides: [],
                  isInvalid: false,
                });
              }}
            >
              {isSelected ? (
                <>
                  <rect
                    x={box.leftMm - 36}
                    y={wall.heightMm - box.topMm - 36}
                    width={box.widthMm + 72}
                    height={box.heightMm + 72}
                    fill="none"
                    stroke={isInvalid ? "#8f3931" : "#2b6152"}
                    strokeWidth={14}
                    strokeDasharray="90 50"
                  />
                  <line
                    x1={box.leftMm}
                    x2={box.leftMm}
                    y1={0}
                    y2={wall.heightMm}
                    stroke="rgba(28, 59, 84, 0.2)"
                    strokeWidth={12}
                    strokeDasharray="90 70"
                  />
                  <line
                    x1={box.rightMm}
                    x2={box.rightMm}
                    y1={0}
                    y2={wall.heightMm}
                    stroke="rgba(28, 59, 84, 0.2)"
                    strokeWidth={12}
                    strokeDasharray="90 70"
                  />
                  <line
                    x1={0}
                    x2={wall.lengthMm}
                    y1={centerlineY}
                    y2={centerlineY}
                    stroke="rgba(28, 59, 84, 0.2)"
                    strokeWidth={12}
                    strokeDasharray="90 70"
                  />
                </>
              ) : null}
              <rect
                x={placement.xMm}
                y={topY}
                width={placement.widthMm}
                height={placement.heightMm}
                rx={42}
                fill={fill}
                stroke={stroke}
                strokeWidth={isSelected ? 28 : 18}
                style={{
                  cursor: placement.isLocked
                    ? "not-allowed"
                    : dragState
                      ? "grabbing"
                      : "grab",
                }}
              />
              <text
                x={placement.xMm + 90}
                y={topY + 150}
                fontSize={110}
                fill="#17120d"
              >
                {artwork.title}
              </text>
              <text
                x={placement.xMm + 90}
                y={topY + 286}
                fontSize={90}
                fill="rgba(48, 43, 37, 0.76)"
              >
                {formatArtworkSize(placement.widthMm, placement.heightMm)}
              </text>
              {hangingPoints.map((point) => {
                const pointY = wall.heightMm - point.yMm;
                const pointWarnings = drillWarnings.filter(
                  (warning) => warning.pointLabel === point.label,
                );
                const highestSeverity = getHighestSeverity(pointWarnings);
                const markerStroke = highestSeverity === "error"
                  ? ERROR_COLOR
                  : highestSeverity === "warning"
                    ? WARNING_COLOR
                  : isSelected
                    ? "#1c3b54"
                    : "rgba(36, 33, 28, 0.68)";
                const markerFill = highestSeverity === "error"
                  ? ERROR_COLOR
                  : highestSeverity === "warning"
                    ? WARNING_COLOR
                  : isSelected
                    ? "#1c3b54"
                    : "rgba(36, 33, 28, 0.84)";

                return (
                  <g key={`${placement.id}-${point.label}`}>
                    <circle
                      cx={point.xMm}
                      cy={pointY}
                      r={DRILL_POINT_HALO_RADIUS_MM}
                      fill="rgba(255,255,255,0.94)"
                      stroke={markerStroke}
                      strokeWidth={4}
                    />
                    <line
                      x1={point.xMm - DRILL_POINT_CROSS_HALF_MM}
                      x2={point.xMm + DRILL_POINT_CROSS_HALF_MM}
                      y1={pointY}
                      y2={pointY}
                      stroke={markerStroke}
                      strokeWidth={12}
                    />
                    <line
                      x1={point.xMm}
                      x2={point.xMm}
                      y1={pointY - DRILL_POINT_CROSS_HALF_MM}
                      y2={pointY + DRILL_POINT_CROSS_HALF_MM}
                      stroke={markerStroke}
                      strokeWidth={12}
                    />
                    <circle
                      cx={point.xMm}
                      cy={pointY}
                      r={DRILL_POINT_RADIUS_MM}
                      fill={markerFill}
                    />
                    {highestSeverity ? (
                      <>
                        <circle
                          cx={point.xMm}
                          cy={pointY}
                          r={DRILL_POINT_RADIUS_MM + 18}
                          fill="none"
                          stroke={markerStroke}
                          strokeWidth={8}
                          strokeDasharray={highestSeverity === "error" ? "20 10" : "12 10"}
                        />
                        <circle
                          cx={point.xMm + 46}
                          cy={pointY - 42}
                          r={20}
                          fill={markerStroke}
                        />
                        <text
                          x={point.xMm + 46}
                          y={pointY - 28}
                          fontSize={42}
                          textAnchor="middle"
                          fill="#ffffff"
                        >
                          ⚠
                        </text>
                      </>
                    ) : null}
                    {isSelected ? (
                      <>
                        <text
                          x={point.xMm + 44}
                          y={pointY - 18}
                          fontSize={70}
                          fill={
                            highestSeverity === "error"
                              ? "rgba(143,57,49,0.92)"
                              : highestSeverity === "warning"
                                ? "rgba(176,121,31,0.92)"
                                : "rgba(28,59,84,0.88)"
                          }
                        >
                          {point.label}
                        </text>
                        <text
                          x={point.xMm + 44}
                          y={pointY + 48}
                          fontSize={60}
                          fill={
                            highestSeverity === "error"
                              ? "rgba(143,57,49,0.92)"
                              : highestSeverity === "warning"
                                ? "rgba(176,121,31,0.92)"
                                : "rgba(28,59,84,0.82)"
                          }
                        >
                          L {formatDimension(point.xMm)} / H {formatDimension(point.yMm)}
                        </text>
                      </>
                    ) : null}
                  </g>
                );
              })}
              {drillWarnings.length > 0 ? (
                <g>
                  <circle
                    cx={box.rightMm - 54}
                    cy={topY + 54}
                    r={34}
                    fill={getHighestSeverity(drillWarnings) === "error" ? ERROR_COLOR : WARNING_COLOR}
                  />
                  <text
                    x={box.rightMm - 54}
                    y={topY + 74}
                    fontSize={58}
                    textAnchor="middle"
                    fill="#ffffff"
                  >
                    ⚠
                  </text>
                </g>
              ) : null}
              {placement.isLocked ? (
                <text
                  x={placement.xMm + 90}
                  y={topY + placement.heightMm - 70}
                  fontSize={78}
                  fill="rgba(36, 33, 28, 0.78)"
                >
                  LOCKED
                </text>
              ) : null}
              {isSelected ? (
                <>
                  <line
                    x1={box.leftMm}
                    x2={box.rightMm}
                    y1={wall.heightMm - box.bottomMm + 110}
                    y2={wall.heightMm - box.bottomMm + 110}
                    stroke="#1c3b54"
                    strokeWidth={12}
                  />
                  <line
                    x1={box.leftMm}
                    x2={box.leftMm}
                    y1={wall.heightMm - box.bottomMm + 64}
                    y2={wall.heightMm - box.bottomMm + 156}
                    stroke="#1c3b54"
                    strokeWidth={12}
                  />
                  <line
                    x1={box.rightMm}
                    x2={box.rightMm}
                    y1={wall.heightMm - box.bottomMm + 64}
                    y2={wall.heightMm - box.bottomMm + 156}
                    stroke="#1c3b54"
                    strokeWidth={12}
                  />
                  <text
                    x={(box.leftMm + box.rightMm) / 2}
                    y={wall.heightMm - box.bottomMm + 260}
                    fontSize={88}
                    textAnchor="middle"
                    fill="#1c3b54"
                  >
                    Width {formatMillimeters(placement.widthMm)}
                  </text>

                  <line
                    x1={box.rightMm + 120}
                    x2={box.rightMm + 120}
                    y1={wall.heightMm - box.topMm}
                    y2={wall.heightMm - box.bottomMm}
                    stroke="#1c3b54"
                    strokeWidth={12}
                  />
                  <line
                    x1={box.rightMm + 76}
                    x2={box.rightMm + 164}
                    y1={wall.heightMm - box.topMm}
                    y2={wall.heightMm - box.topMm}
                    stroke="#1c3b54"
                    strokeWidth={12}
                  />
                  <line
                    x1={box.rightMm + 76}
                    x2={box.rightMm + 164}
                    y1={wall.heightMm - box.bottomMm}
                    y2={wall.heightMm - box.bottomMm}
                    stroke="#1c3b54"
                    strokeWidth={12}
                  />
                  <text
                    x={box.rightMm + 206}
                    y={wall.heightMm - (box.bottomMm + box.heightMm / 2)}
                    fontSize={88}
                    fill="#1c3b54"
                  >
                    Height {formatMillimeters(placement.heightMm)}
                  </text>

                  <text
                    x={box.leftMm}
                    y={wall.heightMm - box.bottomMm - 40}
                    fontSize={84}
                    fill="rgba(28,59,84,0.92)"
                  >
                    x {formatMillimeters(placement.xMm)} / y {formatMillimeters(placement.yMm)}
                  </text>
                </>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function fitPlacementsToWall(placements: Placement[], wall: Wall) {
  const bounds = getPlacementGroupBounds(placements);

  if (!bounds) {
    return placements;
  }

  let correctionX = 0;
  let correctionY = 0;

  if (bounds.leftMm < 0) {
    correctionX = -bounds.leftMm;
  } else if (bounds.rightMm > wall.lengthMm) {
    correctionX = wall.lengthMm - bounds.rightMm;
  }

  if (bounds.bottomMm < 0) {
    correctionY = -bounds.bottomMm;
  } else if (bounds.topMm > wall.heightMm) {
    correctionY = wall.heightMm - bounds.topMm;
  }

  if (correctionX === 0 && correctionY === 0) {
    return placements;
  }

  return placements.map((placement) =>
    translatePlacement(placement, correctionX, correctionY),
  );
}

function getHighestSeverity(
  warnings: DrillPointWarning[],
): DrillPointWarning["severity"] | null {
  if (warnings.some((warning) => warning.severity === "error")) {
    return "error";
  }

  if (warnings.some((warning) => warning.severity === "warning")) {
    return "warning";
  }

  return null;
}
