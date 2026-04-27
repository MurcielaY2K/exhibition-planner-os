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
  snapPlacementOnWall,
  translatePlacement,
  visualGuidesFromSnapGuides,
} from "@/lib/domain/placement";
import { formatDimension, formatMillimeters } from "@/lib/domain/format";
import {
  HUMAN_REFERENCE_HEIGHT_MM,
  HUMAN_REFERENCE_LABEL,
  HUMAN_REFERENCE_WIDTH_MM,
} from "@/lib/domain/scale-reference";
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
const DEFAULT_DRILL_COLOR = "#d6dfeb";
const SELECTED_DRILL_COLOR = "#5fa9c1";
const SCALE_REFERENCE_INSET_MM = 180;

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
  const scaleReferenceX = Math.max(
    140,
    wall.lengthMm - HUMAN_REFERENCE_WIDTH_MM - SCALE_REFERENCE_INSET_MM,
  );
  const activeGuides = [
    ...(visualGuides ?? []),
    ...(dragState ? visualGuidesFromSnapGuides(dragState.guides) : []),
  ];
  const placementLabelMap = buildPlacementLabelMap(placements);

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
    <div className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(14,20,27,0.96)_0%,rgba(10,15,20,0.96)_100%)] shadow-[0_24px_70px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4 sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-strong)]">
            Wall
          </p>
          <h3 className="mt-1 text-lg font-semibold">{wall.name}</h3>
        </div>
        <p className="rounded-[14px] border border-[var(--line)] bg-[rgba(18,27,37,0.82)] px-3 py-2 text-sm text-[var(--foreground-soft)]">
          {formatDimension(wall.lengthMm)} L / {formatDimension(wall.heightMm)} H
        </p>
      </div>

      <svg
        ref={svgRef}
        className="block h-[48svh] min-h-[340px] w-full bg-[linear-gradient(180deg,#121a23_0%,#0d1319_100%)] sm:h-[520px]"
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
          stroke="rgba(95, 169, 193, 0.34)"
          strokeWidth={18}
          strokeDasharray="120 80"
        />
        <text
          x={wall.lengthMm - 160}
          y={standardCenterlineY - 46}
          fontSize={96}
          textAnchor="end"
          fill="rgba(214,223,235,0.9)"
        >
          C {formatDimension(STANDARD_CENTERLINE_MM)}
        </text>

        {activeGuides.map((guide, index) =>
          guide.axis === "x" ? (
            <line
              key={`${guide.label}-${guide.coordinateMm}-${index}`}
              x1={guide.coordinateMm}
              x2={guide.coordinateMm}
              y1={0}
              y2={wall.heightMm}
              stroke="rgba(95, 169, 193, 0.46)"
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
              stroke="rgba(95, 169, 193, 0.46)"
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
              stroke="rgba(214, 223, 235, 0.07)"
              strokeWidth={16}
            />
            <text
              x={120}
              y={wall.heightMm - mark - 48}
              fontSize={110}
              fill="rgba(135, 151, 170, 0.52)"
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
            stroke="rgba(214, 223, 235, 0.04)"
            strokeWidth={12}
          />
        ))}

        <line
          x1={0}
          x2={wall.lengthMm}
          y1={wall.heightMm}
          y2={wall.heightMm}
          stroke="rgba(214, 223, 235, 0.16)"
          strokeWidth={28}
        />

        <g opacity={0.62}>
          <circle
            cx={scaleReferenceX + HUMAN_REFERENCE_WIDTH_MM / 2}
            cy={wall.heightMm - HUMAN_REFERENCE_HEIGHT_MM + 120}
            r={112}
            fill="rgba(95,169,193,0.06)"
            stroke="rgba(95,169,193,0.24)"
            strokeWidth={18}
          />
          <rect
            x={scaleReferenceX + HUMAN_REFERENCE_WIDTH_MM / 2 - 118}
            y={wall.heightMm - HUMAN_REFERENCE_HEIGHT_MM + 270}
            width={236}
            height={560}
            rx={118}
            fill="rgba(95,169,193,0.06)"
            stroke="rgba(95,169,193,0.24)"
            strokeWidth={18}
          />
          <line
            x1={scaleReferenceX + HUMAN_REFERENCE_WIDTH_MM / 2 - 90}
            x2={scaleReferenceX + HUMAN_REFERENCE_WIDTH_MM / 2 - 46}
            y1={wall.heightMm - 40}
            y2={wall.heightMm - 560}
            stroke="rgba(95,169,193,0.28)"
            strokeWidth={24}
            strokeLinecap="round"
          />
          <line
            x1={scaleReferenceX + HUMAN_REFERENCE_WIDTH_MM / 2 + 90}
            x2={scaleReferenceX + HUMAN_REFERENCE_WIDTH_MM / 2 + 46}
            y1={wall.heightMm - 40}
            y2={wall.heightMm - 560}
            stroke="rgba(95,169,193,0.28)"
            strokeWidth={24}
            strokeLinecap="round"
          />
          <line
            x1={scaleReferenceX + HUMAN_REFERENCE_WIDTH_MM / 2 - 220}
            x2={scaleReferenceX + HUMAN_REFERENCE_WIDTH_MM / 2 + 220}
            y1={wall.heightMm - HUMAN_REFERENCE_HEIGHT_MM + 500}
            y2={wall.heightMm - HUMAN_REFERENCE_HEIGHT_MM + 620}
            stroke="rgba(95,169,193,0.22)"
            strokeWidth={22}
            strokeLinecap="round"
          />
          <text
            x={scaleReferenceX + HUMAN_REFERENCE_WIDTH_MM / 2}
            y={wall.heightMm - HUMAN_REFERENCE_HEIGHT_MM - 34}
            fontSize={84}
            textAnchor="middle"
            fill="rgba(135,151,170,0.72)"
          >
            {HUMAN_REFERENCE_LABEL}
          </text>
        </g>

        {openings.map((opening) => {
          const box = getOpeningBoundingBox(opening);
          const topY = wall.heightMm - box.topMm;
          const isSelected = opening.id === selectedOpeningId;
          const fill =
            opening.type === "door"
              ? "rgba(10,15,20,0.65)"
              : "rgba(95,169,193,0.14)";
          const stroke =
            opening.type === "door"
              ? "rgba(214,223,235,0.42)"
              : "rgba(95,169,193,0.72)";

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
                    stroke="rgba(95,169,193,0.55)"
                    strokeWidth={12}
                  />
                  <line
                    x1={box.leftMm + box.widthMm / 2}
                    x2={box.leftMm + box.widthMm / 2}
                    y1={topY}
                    y2={topY + box.heightMm}
                    stroke="rgba(95,169,193,0.55)"
                    strokeWidth={12}
                  />
                </>
              ) : (
                <line
                  x1={box.leftMm}
                  x2={box.rightMm}
                  y1={wall.heightMm}
                  y2={wall.heightMm}
                  stroke="rgba(214,223,235,0.46)"
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
                  stroke="#5fa9c1"
                  strokeWidth={12}
                  strokeDasharray="90 50"
                />
              ) : null}
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
          const placementLabel = placementLabelMap.get(placement.id) ?? "A";
          const fill = isInvalid
            ? "rgba(143,57,49,0.16)"
            : isSelected
              ? "rgba(95,169,193,0.16)"
              : "rgba(214,223,235,0.06)";
          const stroke = isInvalid
            ? "#8f3931"
            : isSelected
              ? "#5fa9c1"
              : "rgba(214,223,235,0.26)";

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
                    stroke={isInvalid ? "#8f3931" : "#5fa9c1"}
                    strokeWidth={14}
                    strokeDasharray="90 50"
                  />
                  <line
                    x1={box.leftMm}
                    x2={box.leftMm}
                    y1={0}
                    y2={wall.heightMm}
                    stroke="rgba(95,169,193,0.2)"
                    strokeWidth={12}
                    strokeDasharray="90 70"
                  />
                  <line
                    x1={box.rightMm}
                    x2={box.rightMm}
                    y1={0}
                    y2={wall.heightMm}
                    stroke="rgba(95,169,193,0.2)"
                    strokeWidth={12}
                    strokeDasharray="90 70"
                  />
                  <line
                    x1={0}
                    x2={wall.lengthMm}
                    y1={centerlineY}
                    y2={centerlineY}
                    stroke="rgba(95,169,193,0.2)"
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
                fill={artwork.imageUrl ? "rgba(10,14,18,0.88)" : fill}
                style={{
                  cursor: placement.isLocked
                    ? "not-allowed"
                    : dragState
                      ? "grabbing"
                      : "grab",
                }}
              />

              {artwork.imageUrl ? (
                <>
                  <defs>
                    <clipPath id={`artwork-preview-${placement.id}`}>
                      <rect
                        x={placement.xMm}
                        y={topY}
                        width={placement.widthMm}
                        height={placement.heightMm}
                        rx={42}
                      />
                    </clipPath>
                  </defs>
                  <image
                    href={artwork.imageUrl}
                    x={placement.xMm}
                    y={topY}
                    width={placement.widthMm}
                    height={placement.heightMm}
                    preserveAspectRatio="xMidYMid slice"
                    clipPath={`url(#artwork-preview-${placement.id})`}
                    opacity={isInvalid ? 0.36 : 0.94}
                  />
                  {isSelected || isInvalid ? (
                    <rect
                      x={placement.xMm}
                      y={topY}
                      width={placement.widthMm}
                      height={placement.heightMm}
                      rx={42}
                      fill={fill}
                    />
                  ) : null}
                </>
              ) : null}

              <rect
                x={placement.xMm}
                y={topY}
                width={placement.widthMm}
                height={placement.heightMm}
                rx={42}
                fill="none"
                stroke={stroke}
                strokeWidth={isSelected ? 28 : 18}
              />
              <g transform={`translate(${placement.xMm + 72} ${topY + placement.heightMm - 72})`}>
                <rect
                  x={0}
                  y={-116}
                  width={168}
                  height={116}
                  rx={28}
                  fill="rgba(8,11,16,0.84)"
                  stroke="rgba(214,223,235,0.14)"
                  strokeWidth={6}
                />
                <text
                  x={84}
                  y={-38}
                  fontSize={70}
                  textAnchor="middle"
                  fill="rgba(244,247,251,0.94)"
                >
                  {placementLabel}
                </text>
              </g>

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
                      ? SELECTED_DRILL_COLOR
                      : DEFAULT_DRILL_COLOR;
                const markerFill = highestSeverity === "error"
                  ? ERROR_COLOR
                  : highestSeverity === "warning"
                    ? WARNING_COLOR
                    : isSelected
                      ? SELECTED_DRILL_COLOR
                      : DEFAULT_DRILL_COLOR;

                return (
                  <g key={`${placement.id}-${point.label}`}>
                    <circle
                      cx={point.xMm}
                      cy={pointY}
                      r={DRILL_POINT_HALO_RADIUS_MM}
                      fill="rgba(255,255,255,0.96)"
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
                          !
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
                                : "rgba(214,223,235,0.9)"
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
                                : "rgba(198,210,225,0.82)"
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
                    !
                  </text>
                </g>
              ) : null}

              {placement.isLocked ? (
                <text
                  x={placement.xMm + 90}
                  y={topY + placement.heightMm - 70}
                  fontSize={78}
                  fill="rgba(198,210,225,0.76)"
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
                    stroke="#5fa9c1"
                    strokeWidth={12}
                  />
                  <line
                    x1={box.leftMm}
                    x2={box.leftMm}
                    y1={wall.heightMm - box.bottomMm + 64}
                    y2={wall.heightMm - box.bottomMm + 156}
                    stroke="#5fa9c1"
                    strokeWidth={12}
                  />
                  <line
                    x1={box.rightMm}
                    x2={box.rightMm}
                    y1={wall.heightMm - box.bottomMm + 64}
                    y2={wall.heightMm - box.bottomMm + 156}
                    stroke="#5fa9c1"
                    strokeWidth={12}
                  />
                  <text
                    x={(box.leftMm + box.rightMm) / 2}
                    y={wall.heightMm - box.bottomMm + 260}
                    fontSize={88}
                    textAnchor="middle"
                    fill="rgba(214,223,235,0.9)"
                  >
                    Width {formatMillimeters(placement.widthMm)}
                  </text>

                  <line
                    x1={box.rightMm + 120}
                    x2={box.rightMm + 120}
                    y1={wall.heightMm - box.topMm}
                    y2={wall.heightMm - box.bottomMm}
                    stroke="#5fa9c1"
                    strokeWidth={12}
                  />
                  <line
                    x1={box.rightMm + 76}
                    x2={box.rightMm + 164}
                    y1={wall.heightMm - box.topMm}
                    y2={wall.heightMm - box.topMm}
                    stroke="#5fa9c1"
                    strokeWidth={12}
                  />
                  <line
                    x1={box.rightMm + 76}
                    x2={box.rightMm + 164}
                    y1={wall.heightMm - box.bottomMm}
                    y2={wall.heightMm - box.bottomMm}
                    stroke="#5fa9c1"
                    strokeWidth={12}
                  />
                  <text
                    x={box.rightMm + 206}
                    y={wall.heightMm - (box.bottomMm + box.heightMm / 2)}
                    fontSize={88}
                    fill="rgba(214,223,235,0.9)"
                  >
                    Height {formatMillimeters(placement.heightMm)}
                  </text>

                  <text
                    x={box.leftMm}
                    y={wall.heightMm - box.bottomMm - 40}
                    fontSize={84}
                    fill="rgba(214,223,235,0.92)"
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

function buildPlacementLabelMap(placements: Placement[]) {
  return new Map(
    placements
      .slice()
      .sort((left, right) => left.xMm - right.xMm || left.yMm - right.yMm)
      .map((placement, index) => [placement.id, `A${index + 1}`]),
  );
}
