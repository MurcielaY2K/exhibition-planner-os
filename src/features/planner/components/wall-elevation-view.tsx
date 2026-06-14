"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  STANDARD_CENTERLINE_MM,
  arePlacementsValidOnWall,
  clampGroupDeltaToWall,
  getHighestSeverity,
  getOpeningBoundingBox,
  getPlacementBoundingBox,
  getPlacementCenterlineMm,
  getPlacementDrillPointWarnings,
  getPlacementGroupBounds,
  getPlacementHangingPoints,
  getPlacementValidation,
  nudgePlacementsOnWall,
  snapPlacementOnWall,
  translatePlacement,
  visualGuidesFromSnapGuides,
} from "@/lib/domain/placement";
import { formatDimension, formatMillimeters } from "@/lib/domain/format";
import {
  HUMAN_REFERENCE_HEIGHT_MM,
  HUMAN_REFERENCE_WIDTH_MM,
} from "@/lib/domain/scale-reference";
import type {
  Artwork,
  MountType,
  Opening,
  Placement,
  PlacementBoundingBox,
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
  selectedPlacement,
  selectedArtwork,
  selectedPlacementLabel,
  selectedOpeningId,
  selectedPlacementIds,
  visualGuides,
  multiSelectMode = false,
  onSelectOpening,
  onSelectPlacement,
  onUpdatePlacement,
  onUpdatePlacements,
}: {
  wall: Wall;
  artworks: Artwork[];
  openings: Opening[];
  placements: Placement[];
  selectedPlacement?: Placement | null;
  selectedArtwork?: Artwork | null;
  selectedPlacementLabel?: string | null;
  selectedOpeningId?: string;
  selectedPlacementIds: string[];
  visualGuides?: VisualGuide[];
  multiSelectMode?: boolean;
  onSelectOpening: (openingId: string) => void;
  onSelectPlacement: (placementId: string, additive: boolean) => void;
  onUpdatePlacement: (placementId: string, patch: Partial<Placement>) => void;
  onUpdatePlacements: (patches: PlacementPatch[]) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  useEffect(() => {
    const NUDGE_MM = 10;

    function handleKeyDown(event: KeyboardEvent) {
      if (!selectedPlacementIds.length) return;
      const tag = (event.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const dirMap: Record<string, [number, number]> = {
        ArrowLeft: [-NUDGE_MM, 0],
        ArrowRight: [NUDGE_MM, 0],
        ArrowUp: [0, NUDGE_MM],
        ArrowDown: [0, -NUDGE_MM],
      };

      const delta = dirMap[event.key];
      if (!delta) return;
      event.preventDefault();

      const selected = placements.filter((p) => selectedPlacementIds.includes(p.id));
      const stationary = placements.filter((p) => !selectedPlacementIds.includes(p.id));
      const step = event.shiftKey ? NUDGE_MM * 10 : NUDGE_MM;
      const result = nudgePlacementsOnWall(
        selected,
        stationary,
        wall,
        delta[0] * (step / NUDGE_MM),
        delta[1] * (step / NUDGE_MM),
        openings,
      );

      if (result.applied) {
        onUpdatePlacements(result.placements.map((p) => ({ id: p.id, xMm: p.xMm, yMm: p.yMm })));
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPlacementIds, placements, wall, openings, onUpdatePlacements]);

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
  const selectedPlacementValidation = useMemo(
    () =>
      selectedPlacement
        ? getPlacementValidation(selectedPlacement, wall, placements, openings)
        : null,
    [openings, placements, selectedPlacement, wall],
  );
  const selectedPlacementBox = useMemo(
    () => (selectedPlacement ? getPlacementBoundingBox(selectedPlacement) : null),
    [selectedPlacement],
  );
  const floatingPanelPosition = useMemo(
    () => (selectedPlacementBox ? getFloatingPanelPosition(selectedPlacementBox, wall) : null),
    [selectedPlacementBox, wall],
  );

  function finishDrag() {
    if (!dragState) {
      return;
    }

    if (svgRef.current?.hasPointerCapture(dragState.pointerId)) {
      svgRef.current.releasePointerCapture(dragState.pointerId);
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
    <div className="relative overflow-hidden border border-[var(--line)] bg-[#0c0c0c] shadow-[0_18px_48px_rgba(0,0,0,0.34)]">
      <div className="flex items-center justify-between border-b border-[var(--line)] bg-[#101010] px-5 py-3 sm:px-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--muted-strong)]">
            {wall.name}
          </p>
        </div>
        <p className="border border-[var(--line)] bg-[#141414] px-3 py-1.5 text-[12px] text-[var(--foreground-soft)]">
          {formatDimension(wall.lengthMm)} x {formatDimension(wall.heightMm)}
        </p>
      </div>

      <svg
        ref={svgRef}
        className="block h-[56svh] min-h-[420px] w-full bg-[linear-gradient(180deg,#111111_0%,#0a0a0a_100%)] sm:h-[620px]"
        viewBox={`0 0 ${wall.lengthMm} ${wall.heightMm}`}
        style={{ touchAction: "none" }}
        onPointerMove={(event) => updateDrag(event.clientX, event.clientY)}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <line
          x1={0}
          x2={wall.lengthMm}
          y1={standardCenterlineY}
          y2={standardCenterlineY}
          stroke="rgba(235,255,0,0.2)"
          strokeWidth={12}
          strokeDasharray="96 72"
        />
        <text
          x={wall.lengthMm - 160}
          y={standardCenterlineY - 46}
          fontSize={74}
          textAnchor="end"
          fill="rgba(215,215,208,0.72)"
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
              stroke="rgba(235,255,0,0.36)"
              strokeWidth={10}
              strokeDasharray="68 64"
            />
          ) : (
            <line
              key={`${guide.label}-${guide.coordinateMm}-${index}`}
              x1={0}
              x2={wall.lengthMm}
              y1={wall.heightMm - guide.coordinateMm}
              y2={wall.heightMm - guide.coordinateMm}
              stroke="rgba(235,255,0,0.36)"
              strokeWidth={10}
              strokeDasharray="68 64"
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
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth={10}
            />
          </g>
        ))}

        {tickMarks.map((mark) => (
          <line
            key={`tick-${mark}`}
            x1={mark}
            x2={mark}
            y1={0}
            y2={wall.heightMm}
            stroke="rgba(255, 255, 255, 0.032)"
            strokeWidth={8}
          />
        ))}

        <line
          x1={0}
          x2={wall.lengthMm}
          y1={wall.heightMm}
          y2={wall.heightMm}
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth={18}
        />

        <g opacity={0.18}>
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
                if (event.shiftKey || multiSelectMode) {
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

                // Capture on the <svg> that owns the move/up/cancel handlers
                // (not the per-placement <g>), so the gesture survives any
                // mid-drag reordering of placement nodes.
                svgRef.current?.setPointerCapture(event.pointerId);
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
                    strokeWidth={10}
                    strokeDasharray="72 44"
                  />
                  <line
                    x1={box.leftMm}
                    x2={box.leftMm}
                    y1={0}
                    y2={wall.heightMm}
                    stroke="rgba(235,255,0,0.14)"
                    strokeWidth={8}
                    strokeDasharray="72 64"
                  />
                  <line
                    x1={box.rightMm}
                    x2={box.rightMm}
                    y1={0}
                    y2={wall.heightMm}
                    stroke="rgba(235,255,0,0.14)"
                    strokeWidth={8}
                    strokeDasharray="72 64"
                  />
                  <line
                    x1={0}
                    x2={wall.lengthMm}
                    y1={centerlineY}
                    y2={centerlineY}
                    stroke="rgba(235,255,0,0.14)"
                    strokeWidth={8}
                    strokeDasharray="72 64"
                  />
                </>
              ) : null}

              <rect
                x={placement.xMm}
                y={topY}
                width={placement.widthMm}
                height={placement.heightMm}
                rx={16}
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
                        rx={16}
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
                rx={16}
                fill="none"
                stroke={stroke}
                strokeWidth={isSelected ? 20 : 12}
              />
              <g transform={`translate(${placement.xMm + 72} ${topY + placement.heightMm - 72})`}>
                <rect
                  x={0}
                  y={-88}
                  width={110}
                  height={88}
                  rx={12}
                  fill="rgba(8,8,8,0.92)"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth={4}
                />
                <text
                  x={55}
                  y={-30}
                  fontSize={48}
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
                    W {formatMillimeters(placement.widthMm)}
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
                    H {formatMillimeters(placement.heightMm)}
                  </text>

                </>
              ) : null}
            </g>
          );
        })}
      </svg>

      {selectedPlacement && selectedArtwork && selectedPlacementBox && floatingPanelPosition ? (
        <div className="pointer-events-none absolute inset-0 z-10">
          <div
            className="pointer-events-auto absolute w-[min(280px,calc(100%-24px))]"
            style={{
              left: `${floatingPanelPosition.leftPercent}%`,
              top: `${floatingPanelPosition.topPercent}%`,
              transform:
                floatingPanelPosition.direction === "above"
                  ? "translate(-50%, calc(-100% - 14px))"
                  : "translate(-50%, 14px)",
            }}
          >
            <div
              className={`border bg-[rgba(10,10,10,0.96)] p-2.5 shadow-[0_20px_46px_rgba(0,0,0,0.34)] backdrop-blur ${
                selectedPlacementValidation?.isValid
                  ? "border-[rgba(255,255,255,0.1)]"
                  : "border-[rgba(143,57,49,0.42)]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-strong)]">
                    {selectedPlacementLabel ?? "A1"}
                  </p>
                  <p className="truncate text-[13px] font-semibold text-[var(--foreground)]">
                    {selectedArtwork.title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdatePlacement(selectedPlacement.id, {
                      isLocked: !selectedPlacement.isLocked,
                    })
                  }
                  className={`border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
                    selectedPlacement.isLocked
                      ? "border-[rgba(235,255,0,0.4)] bg-[rgba(235,255,0,0.08)] text-[var(--foreground)]"
                      : "border-[var(--line)] text-[var(--foreground-soft)] hover:bg-[rgba(255,255,255,0.04)]"
                  }`}
                >
                  {selectedPlacement.isLocked ? "Locked" : "Lock"}
                </button>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-1.5">
                <InlineNumberField
                  label="X"
                  value={selectedPlacement.xMm / 10}
                  onChange={(value) =>
                    onUpdatePlacement(selectedPlacement.id, { xMm: value * 10 })
                  }
                />
                <InlineNumberField
                  label="Y"
                  value={selectedPlacement.yMm / 10}
                  onChange={(value) =>
                    onUpdatePlacement(selectedPlacement.id, { yMm: value * 10 })
                  }
                />
                <InlineReadout
                  label="C"
                  value={getPlacementCenterlineMm(selectedPlacement) / 10}
                />
              </div>

              <div className="mt-1.5 grid grid-cols-[minmax(0,1fr)_72px] gap-1.5">
                <label className="grid gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-strong)]">
                    Mount
                  </span>
                  <select
                    className="w-full border border-[var(--line)] bg-[#141414] px-3 py-1.5 text-[13px] text-[var(--foreground)] outline-none transition focus:border-[var(--accent-strong)]"
                    value={selectedPlacement.mountType}
                    onChange={(event) =>
                      onUpdatePlacement(selectedPlacement.id, {
                        mountType: event.target.value as MountType,
                      })
                    }
                  >
                    {MOUNT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-strong)]">
                    Status
                  </span>
                  <div
                    className={`grid min-h-[44px] place-items-center border text-[12px] font-medium uppercase tracking-[0.08em] ${
                      selectedPlacementValidation?.isValid
                        ? "border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] text-[var(--foreground)]"
                        : "border-[rgba(143,57,49,0.38)] bg-[rgba(143,57,49,0.12)] text-[#efc0bc]"
                    }`}
                  >
                    {selectedPlacementValidation?.isValid ? "Valid" : "Conflict"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
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

function buildPlacementLabelMap(placements: Placement[]) {
  return new Map(
    placements
      .slice()
      .sort((left, right) => left.xMm - right.xMm || left.yMm - right.yMm)
      .map((placement, index) => [placement.id, `A${index + 1}`]),
  );
}

function getFloatingPanelPosition(box: PlacementBoundingBox, wall: Wall) {
  const centerPercent = ((box.leftMm + box.widthMm / 2) / wall.lengthMm) * 100;
  const topPercent = ((wall.heightMm - box.topMm) / wall.heightMm) * 100;
  const bottomPercent = ((wall.heightMm - box.bottomMm) / wall.heightMm) * 100;

  return {
    leftPercent: clampNumber(centerPercent, 16, 84),
    topPercent: topPercent < 18 ? bottomPercent : topPercent,
    direction: topPercent < 18 ? "below" : "above",
  } as const;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function InlineNumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-strong)]">
        {label}
      </span>
      <input
        type="number"
        step={0.1}
        value={roundToTenth(value)}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        inputMode="decimal"
        className="w-full min-h-[44px] border border-[var(--line)] bg-[#141414] px-2.5 py-1.5 text-[13px] text-[var(--foreground)] outline-none transition focus:border-[var(--accent-strong)]"
      />
    </label>
  );
}

function InlineReadout({
  label,
  value,
  className = "",
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className={`grid gap-1 ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-strong)]">
        {label}
      </span>
      <div className="grid min-h-[44px] place-items-center border border-[var(--line)] bg-[#141414] text-[13px] font-medium text-[var(--foreground)]">
        {roundToTenth(value)}
      </div>
    </div>
  );
}

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10;
}

const MOUNT_OPTIONS: Array<{ value: MountType; label: string }> = [
  { value: "standard-hook", label: "Hook" },
  { value: "cleat", label: "Cleat" },
  { value: "direct-fix", label: "Fix" },
  { value: "rail", label: "Rail" },
  { value: "shelf", label: "Shelf" },
  { value: "pedestal", label: "Pedestal" },
  { value: "other", label: "Other" },
];
