"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { Card } from "@/components/ui/card";
import { formatDimension } from "@/lib/domain/format";
import type { Artwork, Opening, Placement, Room, Wall } from "@/lib/domain/types";
import {
  getRoomOverviewPreset,
  getSceneOpeningData,
  getScenePlacementData,
  getSceneWallData,
  getWallFocusPreset,
  mmToSceneUnits,
  WALL_THICKNESS_MM,
} from "@/features/planner/lib/room-scene";

type CameraIntent = "overview" | "wall";

export function Room3DView({
  room,
  walls,
  openings,
  placements,
  artworks,
  selectedWallId,
  selectedPlacementIds,
  onSelectWall,
  onSelectPlacement,
}: {
  room: Room;
  walls: Wall[];
  openings: Opening[];
  placements: Placement[];
  artworks: Artwork[];
  selectedWallId?: string;
  selectedPlacementIds: string[];
  onSelectWall: (wallId: string) => void;
  onSelectPlacement: (placementId: string, additive: boolean) => void;
}) {
  const [cameraIntent, setCameraIntent] = useState<CameraIntent>("wall");
  const selectedWall = useMemo(
    () => walls.find((wall) => wall.id === selectedWallId) ?? null,
    [selectedWallId, walls],
  );

  return (
    <div className="overflow-hidden rounded-[28px] border border-black/8 bg-white shadow-[0_18px_60px_rgba(37,33,28,0.08)]">
      <div className="flex flex-col gap-4 border-b border-black/8 px-4 py-4 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-strong)]">
            3D Room View
          </p>
          <h3 className="mt-1 text-lg font-semibold">{room.name}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-strong)]">
            The spatial viewer reads the same mm-based room, wall, placement, and
            opening records as the 2D planner. Camera controls are tuned for quick
            wall review, and you can always jump back to a clean overview.
          </p>
        </div>
        <div className="grid gap-2 rounded-[18px] border border-black/8 bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--muted-strong)]">
          <p>
            Room: {formatDimension(room.widthMm)} x {formatDimension(room.depthMm)} x{" "}
            {formatDimension(room.heightMm)}
          </p>
          <p>Selected wall: {selectedWall?.name ?? "None"}</p>
          <p>Selected artworks: {selectedPlacementIds.length}</p>
        </div>
      </div>

      <div className="grid gap-4 bg-[linear-gradient(180deg,#fbfaf6_0%,#f1ebe0_100%)] p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <ToolbarButton
              label="Room overview"
              isActive={cameraIntent === "overview"}
              onClick={() => setCameraIntent("overview")}
            />
            <ToolbarButton
              label={selectedWall ? `Focus ${selectedWall.name}` : "Focus wall"}
              isActive={cameraIntent === "wall"}
              disabled={!selectedWall}
              onClick={() => setCameraIntent("wall")}
            />
          </div>

          <div className="h-[52svh] min-h-[360px] overflow-hidden rounded-[24px] border border-black/8 bg-[radial-gradient(circle_at_top,#ffffff_0%,#f0ebdf_65%,#e6dfd1_100%)] sm:h-[560px] lg:h-[620px]">
            <Canvas
              camera={{ position: getRoomOverviewPreset(room).position, fov: 34 }}
              shadows
            >
              <color attach="background" args={["#f6f1e7"]} />
              <fog attach="fog" args={["#f6f1e7", 7, 22]} />
              <ambientLight intensity={0.78} />
              <directionalLight position={[4, 5, 3]} intensity={1.1} color="#ffffff" />
              <directionalLight position={[-2, 3, -4]} intensity={0.35} color="#f3ede0" />
              <Suspense fallback={null}>
                <SceneContent
                  room={room}
                  walls={walls}
                  openings={openings}
                  placements={placements}
                  artworks={artworks}
                  selectedWall={selectedWall}
                  selectedPlacementIds={selectedPlacementIds}
                  cameraIntent={cameraIntent}
                  onSelectWall={onSelectWall}
                  onSelectPlacement={onSelectPlacement}
                />
              </Suspense>
            </Canvas>
          </div>
        </div>

        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-strong)]">
            Spatial context
          </p>
          <h3 className="mt-2 text-lg font-semibold">Navigation</h3>
          <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted-strong)]">
            <p>Use `Room overview` any time the camera feels lost.</p>
            <p>Choose a wall in 2D or 3D and use `Focus wall` for a stable review angle.</p>
            <p>Desktop: drag to orbit, right-drag to pan, wheel to zoom.</p>
            <p>Mobile: one finger rotates, two fingers pan and zoom.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function SceneContent({
  room,
  walls,
  openings,
  placements,
  artworks,
  selectedWall,
  selectedPlacementIds,
  cameraIntent,
  onSelectWall,
  onSelectPlacement,
}: {
  room: Room;
  walls: Wall[];
  openings: Opening[];
  placements: Placement[];
  artworks: Artwork[];
  selectedWall: Wall | null;
  selectedPlacementIds: string[];
  cameraIntent: CameraIntent;
  onSelectWall: (wallId: string) => void;
  onSelectPlacement: (placementId: string, additive: boolean) => void;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera } = useThree();
  const wallData = useMemo(
    () => walls.map((wall) => getSceneWallData(room, wall, openings)),
    [openings, room, walls],
  );
  const floorWidth = mmToSceneUnits(room.widthMm);
  const floorDepth = mmToSceneUnits(room.depthMm);

  useEffect(() => {
    const preset =
      cameraIntent === "wall" && selectedWall
        ? getWallFocusPreset(room, selectedWall)
        : getRoomOverviewPreset(room);

    camera.position.set(...preset.position);
    controlsRef.current?.target.set(...preset.target);
    camera.lookAt(...preset.target);
    controlsRef.current?.update();
  }, [camera, cameraIntent, room, selectedWall]);

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[floorWidth, floorDepth]} />
        <meshStandardMaterial color="#ece6da" />
      </mesh>

      <gridHelper
        args={[Math.max(floorWidth, floorDepth) * 1.4, 24, "#c7beb0", "#ddd4c7"]}
        position={[0, 0.002, 0]}
      />

      {wallData.map((entry) => {
        const geometry = new THREE.ShapeGeometry(entry.shape);
        geometry.translate(-entry.width / 2, -entry.height / 2, 0);
        const isSelected = entry.wall.id === selectedWall?.id;

        return (
          <group
            key={entry.wall.id}
            position={entry.position}
            rotation={[0, entry.rotationY, 0]}
            onClick={(event) => {
              event.stopPropagation();
              onSelectWall(entry.wall.id);
            }}
          >
            <mesh geometry={geometry} receiveShadow castShadow>
              <meshStandardMaterial
                color={isSelected ? "#f7f3ea" : "#f1ebe0"}
                metalness={0}
                roughness={0.96}
                side={THREE.DoubleSide}
                transparent
                opacity={selectedWall && !isSelected ? 0.58 : 0.95}
              />
            </mesh>
            <lineSegments>
              <edgesGeometry args={[geometry]} />
              <lineBasicMaterial color={isSelected ? "#2b6152" : "#6f675b"} />
            </lineSegments>
          </group>
        );
      })}

      {openings.map((opening) => {
        const wall = walls.find((entry) => entry.id === opening.wallId);

        if (!wall) {
          return null;
        }

        const data = getSceneOpeningData(room, wall, opening);

        return (
          <group
            key={opening.id}
            position={data.position}
            rotation={[0, data.rotationY, 0]}
          >
            {opening.type === "window" ? (
              <mesh>
                <planeGeometry args={[data.width, data.height]} />
                <meshStandardMaterial color="#acc2cf" transparent opacity={0.35} />
              </mesh>
            ) : (
              <lineSegments>
                <edgesGeometry
                  args={[
                    new THREE.BoxGeometry(
                      data.width,
                      data.height,
                      mmToSceneUnits(WALL_THICKNESS_MM),
                    ),
                  ]}
                />
                <lineBasicMaterial color="#8d8272" />
              </lineSegments>
            )}
          </group>
        );
      })}

      {placements.map((placement) => {
        const wall = walls.find((entry) => entry.id === placement.wallId);
        const artwork = artworks.find((entry) => entry.id === placement.artworkId);

        if (!wall || !artwork) {
          return null;
        }

        const data = getScenePlacementData(room, wall, placement, artwork.depthMm ?? 45);
        const isSelected = selectedPlacementIds.includes(placement.id);
        const isActiveWall = !selectedWall || wall.id === selectedWall.id;

        return (
          <group
            key={placement.id}
            position={data.position}
            rotation={[0, data.rotationY, 0]}
            onClick={(event) => {
              event.stopPropagation();
              onSelectPlacement(placement.id, event.shiftKey);
            }}
          >
            <mesh castShadow receiveShadow>
              <boxGeometry args={[data.width, data.height, data.depth]} />
              <meshStandardMaterial
                color={isSelected ? "#2b6152" : "#e7dfd2"}
                emissive={isSelected ? "#17352d" : "#000000"}
                emissiveIntensity={isSelected ? 0.22 : 0}
                metalness={0}
                roughness={0.92}
                transparent
                opacity={isActiveWall ? 1 : 0.68}
              />
            </mesh>
            <lineSegments>
              <edgesGeometry
                args={[new THREE.BoxGeometry(data.width, data.height, data.depth)]}
              />
              <lineBasicMaterial color={isSelected ? "#dfe9e5" : "#534b40"} />
            </lineSegments>
          </group>
        );
      })}

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        screenSpacePanning
        minDistance={1.5}
        maxDistance={16}
        minPolarAngle={Math.PI / 8}
        maxPolarAngle={Math.PI / 2.02}
        zoomSpeed={0.9}
        panSpeed={0.85}
        rotateSpeed={0.72}
      />
    </>
  );
}

function ToolbarButton({
  label,
  isActive,
  disabled,
  onClick,
}: {
  label: string;
  isActive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
        disabled
          ? "cursor-not-allowed border border-black/8 bg-white/60 text-[var(--muted-strong)] opacity-50"
          : isActive
            ? "bg-[var(--foreground)] text-white"
            : "border border-black/10 bg-white text-[var(--muted-strong)] hover:bg-[var(--surface-muted)]"
      }`}
    >
      {label}
    </button>
  );
}
