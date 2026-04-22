"use client";

import { getPlacementValidation } from "@/lib/domain/placement";
import { formatDimension } from "@/lib/domain/format";
import {
  HUMAN_REFERENCE_DEPTH_MM,
  HUMAN_REFERENCE_LABEL,
  HUMAN_REFERENCE_WIDTH_MM,
} from "@/lib/domain/scale-reference";
import type { Artwork, Opening, Placement, Room, Wall } from "@/lib/domain/types";

export function RoomPlanView({
  room,
  walls,
  openings,
  placements,
  artworks,
  selectedOpeningId,
  selectedWallId,
  onSelectOpening,
  onSelectWall,
}: {
  room: Room;
  walls: Wall[];
  openings: Opening[];
  placements: Placement[];
  artworks: Artwork[];
  selectedOpeningId?: string;
  selectedWallId?: string;
  onSelectOpening: (openingId: string) => void;
  onSelectWall: (wallId: string) => void;
}) {
  const minX = -800;
  const minY = -800;
  const maxX = room.widthMm + 800;
  const maxY = room.depthMm + 800;
  const scaleReferenceX = Math.max(420, room.widthMm - HUMAN_REFERENCE_WIDTH_MM - 860);
  const scaleReferenceY = Math.max(420, room.depthMm - HUMAN_REFERENCE_DEPTH_MM - 860);

  return (
    <div className="overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_24px_70px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-strong)]">
            Room Plan
          </p>
          <h3 className="mt-1 text-lg font-semibold">{room.name}</h3>
        </div>
        <p className="rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1 text-sm text-[var(--foreground-soft)]">
          {formatDimension(room.widthMm)} x {formatDimension(room.depthMm)}
        </p>
      </div>

      <svg
        className="block h-[52svh] min-h-[360px] w-full bg-[linear-gradient(180deg,#fbfaf7_0%,#f3eee4_100%)] sm:h-[560px]"
        viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      >
        <rect
          x={0}
          y={0}
          width={room.widthMm}
          height={room.depthMm}
          fill="rgba(255,255,255,0.88)"
          stroke="rgba(37,33,28,0.3)"
          strokeWidth={120}
        />

        <g opacity={0.74}>
          <ellipse
            cx={scaleReferenceX + HUMAN_REFERENCE_WIDTH_MM / 2}
            cy={scaleReferenceY + HUMAN_REFERENCE_DEPTH_MM / 2}
            rx={HUMAN_REFERENCE_WIDTH_MM / 2}
            ry={HUMAN_REFERENCE_DEPTH_MM / 2}
            fill="rgba(28,59,84,0.1)"
            stroke="rgba(28,59,84,0.34)"
            strokeWidth={44}
          />
          <circle
            cx={scaleReferenceX + HUMAN_REFERENCE_WIDTH_MM / 2}
            cy={scaleReferenceY + 74}
            r={58}
            fill="rgba(28,59,84,0.14)"
            stroke="rgba(28,59,84,0.34)"
            strokeWidth={28}
          />
          <text
            x={scaleReferenceX + HUMAN_REFERENCE_WIDTH_MM / 2}
            y={scaleReferenceY + HUMAN_REFERENCE_DEPTH_MM + 240}
            fontSize={160}
            textAnchor="middle"
            fill="rgba(28,59,84,0.76)"
          >
            {HUMAN_REFERENCE_LABEL}
          </text>
        </g>

        {walls.map((wall) => {
          const isSelected = wall.id === selectedWallId;
          const line = getWallLine(room, wall);

          return (
            <g key={wall.id} onClick={() => onSelectWall(wall.id)}>
              <line
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={isSelected ? "#2b6152" : "rgba(37,33,28,0.18)"}
                strokeWidth={isSelected ? 180 : 130}
                strokeLinecap="round"
                style={{ cursor: "pointer" }}
              />
              <text
                x={line.labelX}
                y={line.labelY}
                fontSize={220}
                textAnchor="middle"
                fill="rgba(48,43,37,0.72)"
              >
                {wall.name}
              </text>
            </g>
          );
        })}

        {openings.map((opening) => {
          const wall = walls.find((entry) => entry.id === opening.wallId);

          if (!wall) {
            return null;
          }

          const footprint = getPlacementFootprint(room, wall, opening.xMm, opening.widthMm);
          const isSelected = opening.id === selectedOpeningId;

          return (
            <rect
              key={opening.id}
              x={footprint.x}
              y={footprint.y}
              width={footprint.width}
              height={footprint.height}
              rx={40}
              fill={opening.type === "door" ? "rgba(250,248,243,0.98)" : "rgba(199,220,235,0.78)"}
              stroke={isSelected ? "#2b6152" : opening.type === "door" ? "rgba(78,70,61,0.72)" : "rgba(28,59,84,0.72)"}
              strokeWidth={isSelected ? 90 : 70}
              style={{ cursor: "pointer" }}
              onClick={() => onSelectOpening(opening.id)}
            />
          );
        })}

        {placements.map((placement) => {
          const wall = walls.find((entry) => entry.id === placement.wallId);
          const artwork = artworks.find((entry) => entry.id === placement.artworkId);

          if (!wall || !artwork) {
            return null;
          }

          const footprint = getPlacementFootprint(room, wall, placement.xMm, placement.widthMm);
          const validation = getPlacementValidation(placement, wall, placements, openings);
          const isInvalid = !validation.isValid;

          return (
            <rect
              key={placement.id}
              x={footprint.x}
              y={footprint.y}
              width={footprint.width}
              height={footprint.height}
              rx={40}
              fill={isInvalid ? "rgba(143,57,49,0.18)" : "rgba(23,18,13,0.16)"}
              stroke={isInvalid ? "#8f3931" : "rgba(23,18,13,0.38)"}
              strokeWidth={70}
            />
          );
        })}
      </svg>
    </div>
  );
}

function getWallLine(room: Room, wall: Wall) {
  if (wall.index === 0) {
    return {
      x1: 0,
      y1: 0,
      x2: room.widthMm,
      y2: 0,
      labelX: room.widthMm / 2,
      labelY: -180,
    };
  }

  if (wall.index === 1) {
    return {
      x1: room.widthMm,
      y1: 0,
      x2: room.widthMm,
      y2: room.depthMm,
      labelX: room.widthMm + 320,
      labelY: room.depthMm / 2,
    };
  }

  if (wall.index === 2) {
    return {
      x1: 0,
      y1: room.depthMm,
      x2: room.widthMm,
      y2: room.depthMm,
      labelX: room.widthMm / 2,
      labelY: room.depthMm + 420,
    };
  }

  return {
    x1: 0,
    y1: 0,
    x2: 0,
    y2: room.depthMm,
    labelX: -320,
    labelY: room.depthMm / 2,
  };
}

function getPlacementFootprint(
  room: Room,
  wall: Wall,
  xMm: number,
  artworkWidthMm: number,
) {
  const thickness = 120;

  if (wall.index === 0) {
    return { x: xMm, y: 0, width: artworkWidthMm, height: thickness };
  }

  if (wall.index === 1) {
    return {
      x: room.widthMm - thickness,
      y: xMm,
      width: thickness,
      height: artworkWidthMm,
    };
  }

  if (wall.index === 2) {
    return {
      x: xMm,
      y: room.depthMm - thickness,
      width: artworkWidthMm,
      height: thickness,
    };
  }

  return { x: 0, y: xMm, width: thickness, height: artworkWidthMm };
}
