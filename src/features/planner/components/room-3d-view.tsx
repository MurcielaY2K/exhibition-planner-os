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
import type {
  Artwork,
  Opening,
  Placement,
  Room,
  SavedCameraView,
  Wall,
} from "@/lib/domain/types";
import {
  getPlacementFocusPreset,
  getRoomOverviewPreset,
  getSceneOpeningData,
  getScenePlacementData,
  getSceneWallData,
  getWallFocusPreset,
  mmToSceneUnits,
  WALL_THICKNESS_MM,
} from "@/features/planner/lib/room-scene";

type CameraIntent = "overview" | "wall" | "artwork" | "saved";

interface CameraSnapshot {
  position: [number, number, number];
  target: [number, number, number];
  wallId?: string;
}

interface CameraRequest extends CameraSnapshot {
  requestKey: string;
}

export function Room3DView({
  room,
  walls,
  openings,
  placements,
  artworks,
  selectedWallId,
  selectedPlacementIds,
  primaryPlacementId,
  savedCameraViews,
  onSelectWall,
  onSelectPlacement,
  onSaveCameraView,
  onDeleteCameraView,
}: {
  room: Room;
  walls: Wall[];
  openings: Opening[];
  placements: Placement[];
  artworks: Artwork[];
  selectedWallId?: string;
  selectedPlacementIds: string[];
  primaryPlacementId?: string;
  savedCameraViews: SavedCameraView[];
  onSelectWall: (wallId: string) => void;
  onSelectPlacement: (placementId: string, additive: boolean) => void;
  onSaveCameraView: (
    view: Omit<SavedCameraView, "id"> & { id?: string },
  ) => string | undefined;
  onDeleteCameraView: (cameraViewId: string) => void;
}) {
  const selectedWall = useMemo(
    () => walls.find((wall) => wall.id === selectedWallId) ?? null,
    [selectedWallId, walls],
  );
  const primaryPlacement = useMemo(
    () =>
      placements.find((placement) => placement.id === primaryPlacementId) ?? null,
    [placements, primaryPlacementId],
  );
  const primaryArtwork = useMemo(
    () =>
      artworks.find((artwork) => artwork.id === primaryPlacement?.artworkId) ?? null,
    [artworks, primaryPlacement?.artworkId],
  );
  const cameraSnapshotRef = useRef<CameraSnapshot>({
    ...getRoomOverviewPreset(room),
    wallId: undefined,
  });
  const [cameraIntent, setCameraIntent] = useState<CameraIntent>("wall");
  const [presentationMode, setPresentationMode] = useState(false);
  const [saveViewName, setSaveViewName] = useState("");
  const [cameraRequest, setCameraRequest] = useState<CameraRequest>(() => ({
    ...getRoomOverviewPreset(room),
    requestKey: "initial-overview",
    wallId: undefined,
  }));
  const suggestedSaveViewName = useMemo(() => {
    if (primaryArtwork && selectedWall) {
      return `${selectedWall.name} / ${primaryArtwork.title}`;
    }

    if (selectedWall) {
      return `${selectedWall.name} review`;
    }

    return "Room overview";
  }, [primaryArtwork, selectedWall]);

  useEffect(() => {
    if (cameraIntent === "wall" && selectedWall) {
      requestCamera(
        {
          ...getWallFocusPreset(room, selectedWall),
          wallId: selectedWall.id,
        },
        "wall",
      );
    }
  }, [cameraIntent, room, selectedWall]);

  useEffect(() => {
    if (cameraIntent !== "artwork" || !primaryPlacement) {
      return;
    }

    const wall = walls.find((entry) => entry.id === primaryPlacement.wallId);

    if (!wall) {
      return;
    }

    requestCamera(
      {
        ...getPlacementFocusPreset(room, wall, primaryPlacement),
        wallId: wall.id,
      },
      "artwork",
    );
  }, [cameraIntent, primaryPlacement, room, walls]);

  function requestCamera(snapshot: CameraSnapshot, intent: CameraIntent) {
    cameraSnapshotRef.current = snapshot;
    setCameraIntent(intent);
    setCameraRequest({
      ...snapshot,
      requestKey: crypto.randomUUID(),
    });
  }

  function focusRoomOverview() {
    requestCamera(
      {
        ...getRoomOverviewPreset(room),
        wallId: undefined,
      },
      "overview",
    );
  }

  function focusWall(wall: Wall | null) {
    if (!wall) {
      return;
    }

    onSelectWall(wall.id);
    requestCamera(
      {
        ...getWallFocusPreset(room, wall),
        wallId: wall.id,
      },
      "wall",
    );
  }

  function focusPrimaryPlacement() {
    if (!primaryPlacement) {
      return;
    }

    const wall = walls.find((entry) => entry.id === primaryPlacement.wallId);

    if (!wall) {
      return;
    }

    onSelectWall(wall.id);
    requestCamera(
      {
        ...getPlacementFocusPreset(room, wall, primaryPlacement),
        wallId: wall.id,
      },
      "artwork",
    );
  }

  function applySavedView(view: SavedCameraView) {
    if (view.wallId) {
      onSelectWall(view.wallId);
    }

    requestCamera(
      {
        position: view.position,
        target: view.target,
        wallId: view.wallId,
      },
      "saved",
    );
  }

  function handleSaveCurrentView() {
    const name =
      saveViewName.trim() ||
      suggestedSaveViewName ||
      `Saved view ${savedCameraViews.length + 1}`;
    onSaveCameraView({
      name,
      position: cameraSnapshotRef.current.position,
      target: cameraSnapshotRef.current.target,
      wallId: selectedWall?.id,
    });
  }

  const shell = (
    <SceneViewport
      room={room}
      walls={walls}
      openings={openings}
      placements={placements}
      artworks={artworks}
      selectedWall={selectedWall}
      selectedPlacementIds={selectedPlacementIds}
      cameraRequest={cameraRequest}
      presentationMode={presentationMode}
      onCameraSnapshot={(snapshot) => {
        cameraSnapshotRef.current = snapshot;
      }}
      onSelectWall={onSelectWall}
      onSelectPlacement={onSelectPlacement}
    />
  );

  return (
    <>
      <div className="overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_24px_70px_rgba(0,0,0,0.3)]">
        <div className="flex flex-col gap-4 border-b border-[var(--line)] px-4 py-4 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-strong)]">
              3D Room View
            </p>
            <h3 className="mt-1 text-lg font-semibold">{room.name}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--foreground-soft)]">
              The 3D viewer is now optimized for review rather than freeform wandering:
              jump between room, wall, and artwork views, store named camera positions,
              and enter a clean presentation surface when you need to show the scheme.
            </p>
          </div>
          <div className="grid gap-2 rounded-[18px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--foreground-soft)]">
            <p>
              Room: {formatDimension(room.widthMm)} x {formatDimension(room.depthMm)} x{" "}
              {formatDimension(room.heightMm)}
            </p>
            <p>Selected wall: {selectedWall?.name ?? "None"}</p>
            <p>Selected artworks: {selectedPlacementIds.length}</p>
            <p>Saved views: {savedCameraViews.length}</p>
          </div>
        </div>

        <div className="grid gap-4 bg-[linear-gradient(180deg,rgba(15,21,28,0.92)_0%,rgba(11,16,21,0.88)_100%)] p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_310px]">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <ToolbarButton
                label="Room overview"
                isActive={cameraIntent === "overview"}
                onClick={focusRoomOverview}
              />
              <ToolbarButton
                label={selectedWall ? `Focus ${selectedWall.name}` : "Focus wall"}
                isActive={cameraIntent === "wall"}
                disabled={!selectedWall}
                onClick={() => focusWall(selectedWall)}
              />
              <ToolbarButton
                label={primaryArtwork ? `Focus ${primaryArtwork.title}` : "Focus artwork"}
                isActive={cameraIntent === "artwork"}
                disabled={!primaryPlacement}
                onClick={focusPrimaryPlacement}
              />
              <ToolbarButton
                label="Presentation mode"
                onClick={() => setPresentationMode(true)}
              />
            </div>

            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {walls.map((wall) => (
                <ToolbarButton
                  key={wall.id}
                  label={wall.name}
                  isActive={selectedWall?.id === wall.id}
                  onClick={() => focusWall(wall)}
                />
              ))}
            </div>

            {shell}
          </div>

          <div className="space-y-4">
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-strong)]">
                Camera workflow
              </p>
              <h3 className="mt-2 text-lg font-semibold">Review controls</h3>
              <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--foreground-soft)]">
                <p>Jump to room, wall, and artwork views instead of navigating manually every time.</p>
                <p>Desktop: left drag rotates, right drag pans, wheel zooms.</p>
                <p>Mobile: one finger rotates, two fingers pan and zoom.</p>
              </div>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-strong)]">
                Saved views
              </p>
              <h3 className="mt-2 text-lg font-semibold">Named camera positions</h3>
              <div className="mt-4 grid gap-3">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-[var(--muted-strong)]">
                    Save current camera as
                  </span>
                  <input
                    className="w-full rounded-[16px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-strong)] focus:border-[var(--accent)] focus:bg-[var(--surface)]"
                    value={saveViewName || suggestedSaveViewName}
                    onChange={(event) => setSaveViewName(event.target.value)}
                    placeholder={suggestedSaveViewName}
                  />
                </label>
                <ToolbarButton label="Save current view" onClick={handleSaveCurrentView} />
                {savedCameraViews.length === 0 ? (
                  <p className="rounded-[16px] border border-dashed border-[var(--line)] px-4 py-4 text-sm text-[var(--muted-strong)]">
                    No saved camera views yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {savedCameraViews.map((view) => (
                      <div
                        key={view.id}
                        className="flex items-center justify-between gap-3 rounded-[16px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3"
                      >
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => applySavedView(view)}
                        >
                          <p className="truncate text-sm font-medium text-[var(--foreground)]">
                            {view.name}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted-strong)]">
                            {view.wallId
                              ? walls.find((wall) => wall.id === view.wallId)?.name ?? "Saved wall"
                              : "Room view"}
                          </p>
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--foreground-soft)] transition hover:bg-[var(--surface-muted)]"
                          onClick={() => onDeleteCameraView(view.id)}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {presentationMode ? (
        <div className="fixed inset-0 z-50 bg-[rgba(5,8,12,0.96)] p-3 sm:p-5">
          <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--surface-strong)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3 sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-strong)]">
                  Presentation mode
                </p>
                <h3 className="mt-1 text-lg font-semibold">
                  {selectedWall ? `${room.name} / ${selectedWall.name}` : room.name}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <ToolbarButton label="Overview" onClick={focusRoomOverview} />
                <ToolbarButton
                  label={selectedWall ? `Focus ${selectedWall.name}` : "Focus wall"}
                  disabled={!selectedWall}
                  onClick={() => focusWall(selectedWall)}
                />
                <ToolbarButton
                  label={primaryArtwork ? `Focus ${primaryArtwork.title}` : "Focus artwork"}
                  disabled={!primaryPlacement}
                  onClick={focusPrimaryPlacement}
                />
                <ToolbarButton
                  label="Exit presentation"
                  onClick={() => setPresentationMode(false)}
                />
              </div>
            </div>
            <div className="flex-1 p-3 sm:p-5">{shell}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SceneViewport({
  room,
  walls,
  openings,
  placements,
  artworks,
  selectedWall,
  selectedPlacementIds,
  cameraRequest,
  presentationMode,
  onCameraSnapshot,
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
  cameraRequest: CameraRequest;
  presentationMode: boolean;
  onCameraSnapshot: (snapshot: CameraSnapshot) => void;
  onSelectWall: (wallId: string) => void;
  onSelectPlacement: (placementId: string, additive: boolean) => void;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[24px] border border-[var(--line)] ${
        presentationMode
          ? "h-[calc(100vh-170px)] min-h-[420px]"
          : "h-[56svh] min-h-[380px] sm:h-[620px]"
      } bg-[radial-gradient(circle_at_top,rgba(245,248,251,0.16)_0%,rgba(12,18,25,0.2)_70%,rgba(5,8,12,0.3)_100%)]`}
    >
      <Canvas camera={{ position: getRoomOverviewPreset(room).position, fov: 34 }} shadows>
        <color attach="background" args={presentationMode ? ["#0a1016"] : ["#101820"]} />
        <fog attach="fog" args={presentationMode ? ["#0a1016", 8, 24] : ["#101820", 8, 22]} />
        <ambientLight intensity={0.82} />
        <directionalLight position={[4, 5, 3]} intensity={1.2} color="#ffffff" />
        <directionalLight position={[-3, 2, -4]} intensity={0.4} color="#cfe4ed" />
        <Suspense fallback={null}>
          <SceneContent
            room={room}
            walls={walls}
            openings={openings}
            placements={placements}
            artworks={artworks}
            selectedWall={selectedWall}
            selectedPlacementIds={selectedPlacementIds}
            cameraRequest={cameraRequest}
            onCameraSnapshot={onCameraSnapshot}
            onSelectWall={onSelectWall}
            onSelectPlacement={onSelectPlacement}
          />
        </Suspense>
      </Canvas>
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
  cameraRequest,
  onCameraSnapshot,
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
  cameraRequest: CameraRequest;
  onCameraSnapshot: (snapshot: CameraSnapshot) => void;
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
    camera.position.set(...cameraRequest.position);
    controlsRef.current?.target.set(...cameraRequest.target);
    camera.lookAt(...cameraRequest.target);
    controlsRef.current?.update();
    onCameraSnapshot({
      position: cameraRequest.position,
      target: cameraRequest.target,
      wallId: cameraRequest.wallId,
    });
  }, [camera, cameraRequest, onCameraSnapshot]);

  function publishCameraSnapshot() {
    const target = controlsRef.current?.target ?? new THREE.Vector3(0, 0, 0);

    onCameraSnapshot({
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [target.x, target.y, target.z],
      wallId: selectedWall?.id,
    });
  }

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[floorWidth, floorDepth]} />
        <meshStandardMaterial color="#111922" roughness={0.98} />
      </mesh>

      <gridHelper
        args={[Math.max(floorWidth, floorDepth) * 1.4, 24, "#31404d", "#1a2530"]}
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
                color={isSelected ? "#dce8ef" : "#cfd8de"}
                metalness={0}
                roughness={0.96}
                side={THREE.DoubleSide}
                transparent
                opacity={selectedWall && !isSelected ? 0.44 : 0.92}
              />
            </mesh>
            <lineSegments>
              <edgesGeometry args={[geometry]} />
              <lineBasicMaterial color={isSelected ? "#7ec5d6" : "#66727d"} />
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
                <meshStandardMaterial color="#8fb8c6" transparent opacity={0.32} />
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
                <lineBasicMaterial color="#87909a" />
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
                color={isSelected ? "#7ec5d6" : "#d6dedf"}
                emissive={isSelected ? "#0d2a31" : "#000000"}
                emissiveIntensity={isSelected ? 0.25 : 0}
                metalness={0}
                roughness={0.92}
                transparent
                opacity={isActiveWall ? 1 : 0.62}
              />
            </mesh>
            <lineSegments>
              <edgesGeometry
                args={[new THREE.BoxGeometry(data.width, data.height, data.depth)]}
              />
              <lineBasicMaterial color={isSelected ? "#f4f7fb" : "#4a5661"} />
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
        dampingFactor={0.09}
        screenSpacePanning
        minDistance={1.35}
        maxDistance={18}
        minPolarAngle={Math.PI / 10}
        maxPolarAngle={Math.PI / 2.02}
        zoomSpeed={0.88}
        panSpeed={0.82}
        rotateSpeed={0.68}
        onEnd={publishCameraSnapshot}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
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
  const bodyOpacity = 0.8;
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
