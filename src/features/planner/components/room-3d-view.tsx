"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { Card } from "@/components/ui/card";
import { formatDimension } from "@/lib/domain/format";
import {
  HUMAN_REFERENCE_DEPTH_MM,
  HUMAN_REFERENCE_HEIGHT_MM,
  HUMAN_REFERENCE_WIDTH_MM,
} from "@/lib/domain/scale-reference";
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
    <div className="overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_24px_70px_rgba(0,0,0,0.3)]">
      <div className="flex flex-col gap-4 border-b border-[var(--line)] px-4 py-4 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
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
        <div className="grid gap-2 rounded-[18px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--foreground-soft)]">
          <p>
            Room: {formatDimension(room.widthMm)} x {formatDimension(room.depthMm)} x{" "}
            {formatDimension(room.heightMm)}
          </p>
          <p>Selected wall: {selectedWall?.name ?? "None"}</p>
          <p>Selected artworks: {selectedPlacementIds.length}</p>
        </div>
      </div>

      <div className="grid gap-4 bg-[linear-gradient(180deg,rgba(15,21,28,0.92)_0%,rgba(11,16,21,0.88)_100%)] p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_280px]">
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
  const scaleFigurePosition = useMemo(() => {
    const roomWidth = mmToSceneUnits(room.widthMm);
    const roomDepth = mmToSceneUnits(room.depthMm);
    const inset = mmToSceneUnits(900);

    if (!selectedWall) {
      return [roomWidth * 0.22 - roomWidth / 2, 0, roomDepth / 2 - inset] as const;
    }

    if (selectedWall.index === 0) {
      return [0, 0, -roomDepth / 2 + inset] as const;
    }

    if (selectedWall.index === 1) {
      return [roomWidth / 2 - inset, 0, 0] as const;
    }

    if (selectedWall.index === 2) {
      return [0, 0, roomDepth / 2 - inset] as const;
    }

    return [-roomWidth / 2 + inset, 0, 0] as const;
  }, [room.depthMm, room.widthMm, selectedWall]);

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

      <ScaleFigure position={scaleFigurePosition} />

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
            {artwork.imageUrl ? (
              <ArtworkFrontPlane
                imageUrl={artwork.imageUrl}
                width={data.width}
                height={data.height}
                depth={data.depth}
              />
            ) : null}
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

function ArtworkFrontPlane({
  imageUrl,
  width,
  height,
  depth,
}: {
  imageUrl: string;
  width: number;
  height: number;
  depth: number;
}) {
  const texture = useTexture(imageUrl);

  return (
    <mesh position={[0, 0, depth / 2 + 0.003]}>
      <planeGeometry args={[width * 0.94, height * 0.94]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function ScaleFigure({
  position,
}: {
  position: readonly [number, number, number];
}) {
  const bodyColor = "#7ec5d6";
  const bodyOpacity = 0.78;
  const shoulderWidth = mmToSceneUnits(HUMAN_REFERENCE_WIDTH_MM);
  const bodyDepth = mmToSceneUnits(HUMAN_REFERENCE_DEPTH_MM);
  const height = mmToSceneUnits(HUMAN_REFERENCE_HEIGHT_MM);

  return (
    <group position={[position[0], position[1], position[2]]}>
      <mesh position={[0, height * 0.935, 0]} castShadow>
        <sphereGeometry args={[0.11, 24, 24]} />
        <meshStandardMaterial
          color={bodyColor}
          transparent
          opacity={bodyOpacity}
          roughness={0.82}
        />
      </mesh>
      <mesh position={[0, height * 0.68, 0]} castShadow>
        <capsuleGeometry args={[0.12, 0.55, 8, 16]} />
        <meshStandardMaterial
          color={bodyColor}
          transparent
          opacity={bodyOpacity}
          roughness={0.82}
        />
      </mesh>
      <mesh
        position={[-shoulderWidth * 0.24, height * 0.68, 0]}
        rotation={[0, 0, Math.PI / 14]}
        castShadow
      >
        <capsuleGeometry args={[0.048, 0.54, 6, 12]} />
        <meshStandardMaterial
          color={bodyColor}
          transparent
          opacity={bodyOpacity}
          roughness={0.82}
        />
      </mesh>
      <mesh
        position={[shoulderWidth * 0.24, height * 0.68, 0]}
        rotation={[0, 0, -Math.PI / 14]}
        castShadow
      >
        <capsuleGeometry args={[0.048, 0.54, 6, 12]} />
        <meshStandardMaterial
          color={bodyColor}
          transparent
          opacity={bodyOpacity}
          roughness={0.82}
        />
      </mesh>
      <mesh
        position={[-shoulderWidth * 0.12, height * 0.22, 0]}
        rotation={[0, 0, Math.PI / 28]}
        castShadow
      >
        <capsuleGeometry args={[0.052, 0.7, 6, 12]} />
        <meshStandardMaterial
          color={bodyColor}
          transparent
          opacity={bodyOpacity}
          roughness={0.82}
        />
      </mesh>
      <mesh
        position={[shoulderWidth * 0.12, height * 0.22, 0]}
        rotation={[0, 0, -Math.PI / 28]}
        castShadow
      >
        <capsuleGeometry args={[0.052, 0.7, 6, 12]} />
        <meshStandardMaterial
          color={bodyColor}
          transparent
          opacity={bodyOpacity}
          roughness={0.82}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} receiveShadow>
        <circleGeometry args={[bodyDepth * 0.75, 28]} />
        <meshStandardMaterial color="#1a242d" transparent opacity={0.32} />
      </mesh>
    </group>
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
          ? "cursor-not-allowed border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--muted-strong)] opacity-50"
          : isActive
            ? "bg-[var(--accent)] text-[#051017]"
            : "border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--foreground-soft)] hover:bg-[var(--surface-muted)]"
      }`}
    >
      {label}
    </button>
  );
}
