"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
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
  ProjectLight,
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
  type SceneWallData,
  WALL_THICKNESS_MM,
} from "@/features/planner/lib/room-scene";

type CameraIntent = "free" | "overview" | "wall" | "artwork" | "saved";

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
  lights,
  placements,
  artworks,
  selectedWallId,
  selectedLightId,
  selectedPlacementIds,
  primaryPlacementId,
  savedCameraViews,
  onSelectWall,
  onSelectLight,
  onSelectPlacement,
  onUpdateLight,
  onSaveCameraView,
  onDeleteCameraView,
  embedded = false,
  multiSelectMode = false,
  wallColor = "#cfd8de",
  ambientIntensity = 0.82,
}: {
  room: Room;
  walls: Wall[];
  openings: Opening[];
  lights: ProjectLight[];
  placements: Placement[];
  artworks: Artwork[];
  selectedWallId?: string;
  selectedLightId?: string;
  selectedPlacementIds: string[];
  primaryPlacementId?: string;
  savedCameraViews: SavedCameraView[];
  onSelectWall: (wallId: string) => void;
  onSelectLight: (lightId?: string) => void;
  onSelectPlacement: (placementId: string, additive: boolean) => void;
  onUpdateLight: (lightId: string, patch: Partial<ProjectLight>) => void;
  onSaveCameraView: (
    view: Omit<SavedCameraView, "id"> & { id?: string },
  ) => string | undefined;
  onDeleteCameraView: (cameraViewId: string) => void;
  embedded?: boolean;
  multiSelectMode?: boolean;
  wallColor?: string;
  ambientIntensity?: number;
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
  const handleCameraSnapshot = useCallback((snapshot: CameraSnapshot) => {
    cameraSnapshotRef.current = snapshot;
  }, []);
  const [cameraIntent, setCameraIntent] = useState<CameraIntent>("free");
  const [presentationMode, setPresentationMode] = useState(false);
  const [viewsPanelOpen, setViewsPanelOpen] = useState(false);
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
      lights={lights}
      placements={placements}
      artworks={artworks}
      selectedWall={selectedWall}
      selectedLightId={selectedLightId}
      selectedPlacementIds={selectedPlacementIds}
      cameraRequest={cameraRequest}
      presentationMode={presentationMode}
      wallColor={wallColor}
      ambientIntensity={ambientIntensity}
      multiSelectMode={multiSelectMode}
      onCameraSnapshot={handleCameraSnapshot}
      onSelectWall={onSelectWall}
      onSelectLight={onSelectLight}
      onSelectPlacement={onSelectPlacement}
      onUpdateLight={onUpdateLight}
    />
  );

  if (embedded) {
    return shell;
  }

  return (
    <>
      <div className="overflow-hidden border border-[var(--line)] bg-[var(--surface)] shadow-[0_18px_48px_rgba(0,0,0,0.3)]">
        <div className="border-b border-[var(--line)] bg-[#101010] px-4 py-2.5 sm:px-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted-strong)]">
                3D
              </span>
              <SceneBadge value={selectedWall?.name ?? room.name} />
              <SceneBadge value={`${formatDimension(room.widthMm)} x ${formatDimension(room.depthMm)} x ${formatDimension(room.heightMm)}`} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ToolbarButton
                label="Overview"
                isActive={cameraIntent === "overview"}
                onClick={focusRoomOverview}
              />
              <ToolbarButton
                label="Wall"
                isActive={cameraIntent === "wall"}
                disabled={!selectedWall}
                onClick={() => focusWall(selectedWall)}
              />
              <ToolbarButton
                label="Artwork"
                isActive={cameraIntent === "artwork"}
                disabled={!primaryPlacement}
                onClick={focusPrimaryPlacement}
              />
              <ToolbarButton
                label={viewsPanelOpen ? "Hide views" : "Views"}
                isActive={viewsPanelOpen}
                onClick={() => setViewsPanelOpen((current) => !current)}
              />
              <ToolbarButton label="Present" onClick={() => setPresentationMode(true)} />
            </div>
          </div>
        </div>

        <div className="space-y-3 bg-[linear-gradient(180deg,rgba(16,16,16,0.98)_0%,rgba(10,10,10,0.96)_100%)] p-3 sm:p-4">
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-subtle">
            {walls.map((wall) => (
              <ToolbarButton
                key={wall.id}
                label={wall.name.replace("Wall ", "")}
                isActive={selectedWall?.id === wall.id}
                onClick={() => focusWall(wall)}
              />
            ))}
          </div>

          {shell}

          {viewsPanelOpen ? (
            <div className="grid gap-3 border border-[var(--line)] bg-[rgba(12,12,12,0.88)] p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] sm:p-4">
              <label className="grid gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-strong)]">
                  Save view
                </span>
                <input
                  className="w-full border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-strong)] focus:border-[var(--accent-strong)] focus:bg-[var(--surface)]"
                  value={saveViewName}
                  onChange={(event) => setSaveViewName(event.target.value)}
                  placeholder={suggestedSaveViewName}
                />
                <ToolbarButton label="Save" onClick={handleSaveCurrentView} />
              </label>

              {savedCameraViews.length === 0 ? (
                <div className="grid min-h-[120px] place-items-center border border-dashed border-[var(--line)] px-4 text-sm text-[var(--muted-strong)]">
                  No saved views
                </div>
              ) : (
                <div className="grid gap-2">
                  {savedCameraViews.map((view) => (
                    <div
                      key={view.id}
                      className="flex items-center justify-between gap-3 border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3"
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => applySavedView(view)}
                      >
                        <p className="truncate text-sm font-medium text-[var(--foreground)]">
                          {view.name}
                        </p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--muted-strong)]">
                          {view.wallId
                            ? walls.find((wall) => wall.id === view.wallId)?.name ?? "Wall"
                            : "Room"}
                        </p>
                      </button>
                      <button
                        type="button"
                        className="border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--foreground-soft)] transition hover:bg-[var(--surface-muted)]"
                        onClick={() => onDeleteCameraView(view.id)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 border border-[var(--line)] bg-[rgba(12,12,12,0.76)] px-4 py-2.5 text-[11px] text-[var(--muted-strong)]">
              <span>Orbit. Pan. Zoom.</span>
              <span>{savedCameraViews.length} views</span>
            </div>
          )}
        </div>
      </div>

      {presentationMode ? (
        <div className="fixed inset-0 z-50 bg-[rgba(5,8,12,0.96)] p-3 sm:p-5">
          <div className="flex h-full flex-col overflow-hidden border border-[var(--line)] bg-[var(--surface-strong)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-[#101010] px-4 py-3 sm:px-6">
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
  lights,
  placements,
  artworks,
  selectedWall,
  selectedLightId,
  selectedPlacementIds,
  cameraRequest,
  presentationMode,
  wallColor,
  ambientIntensity,
  multiSelectMode,
  onCameraSnapshot,
  onSelectWall,
  onSelectLight,
  onSelectPlacement,
  onUpdateLight,
}: {
  room: Room;
  walls: Wall[];
  openings: Opening[];
  lights: ProjectLight[];
  placements: Placement[];
  artworks: Artwork[];
  selectedWall: Wall | null;
  selectedLightId?: string;
  selectedPlacementIds: string[];
  cameraRequest: CameraRequest;
  presentationMode: boolean;
  wallColor: string;
  ambientIntensity: number;
  multiSelectMode: boolean;
  onCameraSnapshot: (snapshot: CameraSnapshot) => void;
  onSelectWall: (wallId: string) => void;
  onSelectLight: (lightId?: string) => void;
  onSelectPlacement: (placementId: string, additive: boolean) => void;
  onUpdateLight: (lightId: string, patch: Partial<ProjectLight>) => void;
}) {
  return (
    <div
      className={`overflow-hidden border border-[var(--line)] ${
        presentationMode
          ? "h-[calc(100vh-170px)] min-h-[420px]"
          : "h-[56svh] min-h-[380px] sm:h-[620px]"
      } bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08)_0%,rgba(12,12,12,0.14)_72%,rgba(5,5,5,0.24)_100%)]`}
    >
      <Canvas camera={{ position: getRoomOverviewPreset(room).position, fov: 34 }} shadows>
        <color attach="background" args={presentationMode ? ["#0a0a0a"] : ["#0f0f0f"]} />
        <fog attach="fog" args={presentationMode ? ["#0a0a0a", 8, 24] : ["#0f0f0f", 8, 22]} />
        <ambientLight intensity={ambientIntensity} />
        <directionalLight position={[4, 5, 3]} intensity={1.2} color="#ffffff" />
        <directionalLight position={[-3, 2, -4]} intensity={0.4} color="#cfe4ed" />
        <Suspense fallback={null}>
          <SceneContent
            room={room}
            walls={walls}
            openings={openings}
            lights={lights}
            placements={placements}
            artworks={artworks}
            selectedWall={selectedWall}
            selectedLightId={selectedLightId}
            selectedPlacementIds={selectedPlacementIds}
            cameraRequest={cameraRequest}
            wallColor={wallColor}
            multiSelectMode={multiSelectMode}
            onCameraSnapshot={onCameraSnapshot}
            onSelectWall={onSelectWall}
            onSelectLight={onSelectLight}
            onSelectPlacement={onSelectPlacement}
            onUpdateLight={onUpdateLight}
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
  lights,
  placements,
  artworks,
  selectedWall,
  selectedLightId,
  selectedPlacementIds,
  cameraRequest,
  wallColor,
  multiSelectMode,
  onCameraSnapshot,
  onSelectWall,
  onSelectLight,
  onSelectPlacement,
  onUpdateLight,
}: {
  room: Room;
  walls: Wall[];
  openings: Opening[];
  lights: ProjectLight[];
  placements: Placement[];
  artworks: Artwork[];
  selectedWall: Wall | null;
  selectedLightId?: string;
  selectedPlacementIds: string[];
  cameraRequest: CameraRequest;
  wallColor: string;
  multiSelectMode: boolean;
  onCameraSnapshot: (snapshot: CameraSnapshot) => void;
  onSelectWall: (wallId: string) => void;
  onSelectLight: (lightId?: string) => void;
  onSelectPlacement: (placementId: string, additive: boolean) => void;
  onUpdateLight: (lightId: string, patch: Partial<ProjectLight>) => void;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera } = useThree();
  const draggingLightIdRef = useRef<string | null>(null);
  const wallData = useMemo(
    () => walls.map((wall) => getSceneWallData(room, wall, openings)),
    [openings, room, walls],
  );
  const floorWidth = mmToSceneUnits(room.widthMm);
  const floorDepth = mmToSceneUnits(room.depthMm);
  const selectedLight = useMemo(
    () => lights.find((light) => light.id === selectedLightId) ?? null,
    [lights, selectedLightId],
  );
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

  useEffect(() => {
    function handlePointerUp() {
      if (!draggingLightIdRef.current) {
        return;
      }

      draggingLightIdRef.current = null;
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
      }
    }

    window.addEventListener("pointerup", handlePointerUp);
    return () => window.removeEventListener("pointerup", handlePointerUp);
  }, []);

  function publishCameraSnapshot() {
    const target = controlsRef.current?.target ?? new THREE.Vector3(0, 0, 0);

    onCameraSnapshot({
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [target.x, target.y, target.z],
      wallId: selectedWall?.id,
    });
  }

  function sceneToLightCoordinates(point: THREE.Vector3) {
    return {
      xMm: Math.max(0, Math.min(room.widthMm, Math.round((point.x + floorWidth / 2) * 1000))),
      zMm: Math.max(0, Math.min(room.depthMm, Math.round((point.z + floorDepth / 2) * 1000))),
    };
  }

  function moveSelectedLightFromPoint(point: THREE.Vector3) {
    if (!selectedLight) {
      return;
    }

    onUpdateLight(selectedLight.id, sceneToLightCoordinates(point));
  }

  function beginLightDrag(lightId: string) {
    draggingLightIdRef.current = lightId;
    if (controlsRef.current) {
      controlsRef.current.enabled = false;
    }
  }

  function handleRoomPlaneMove(point: THREE.Vector3) {
    if (!draggingLightIdRef.current || draggingLightIdRef.current !== selectedLight?.id) {
      return;
    }

    moveSelectedLightFromPoint(point);
  }

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        position={[0, 0, 0]}
        onClick={(event) => {
          if (!selectedLight) {
            return;
          }

          event.stopPropagation();
          moveSelectedLightFromPoint(event.point);
        }}
        onPointerMove={(event) => {
          handleRoomPlaneMove(event.point);
        }}
      >
        <planeGeometry args={[floorWidth, floorDepth]} />
        <meshStandardMaterial color="#111922" roughness={0.98} />
      </mesh>

      <gridHelper
        args={[Math.max(floorWidth, floorDepth) * 1.4, 24, "#31404d", "#1a2530"]}
        position={[0, 0.002, 0]}
      />

      <ScaleFigure position={scaleFigurePosition} />

      {lights
        .filter((light) => light.roomId === room.id)
        .map((light) => (
          <LightFixture
            key={light.id}
            room={room}
            light={light}
            isSelected={selectedLightId === light.id}
            onClick={() => onSelectLight(light.id)}
            onDragStart={() => beginLightDrag(light.id)}
          />
        ))}

      {wallData.map((entry) => {
        const isSelected = entry.wall.id === selectedWall?.id;

        return (
          <WallMesh
            key={entry.wall.id}
            entry={entry}
            isSelected={isSelected}
            hasSelectedWall={!!selectedWall}
            wallColor={wallColor}
            onSelectWall={onSelectWall}
          />
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
              onSelectPlacement(placement.id, event.shiftKey || multiSelectMode);
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
              <BoxEdgesGeometry width={data.width} height={data.height} depth={data.depth} />
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
      className={`shrink-0 min-h-[44px] border px-3 py-2 text-[11px] font-medium uppercase tracking-[0.2em] transition ${
        disabled
          ? "cursor-not-allowed border-[var(--line)] bg-[var(--surface-soft)] text-[var(--muted-strong)] opacity-50"
          : isActive
            ? "border-[#ebff00]/42 bg-[rgba(235,255,0,0.08)] text-[#ebff00]"
            : "border-[var(--line)] bg-[var(--surface-soft)] text-[var(--foreground-soft)] hover:bg-[var(--surface-muted)]"
      }`}
    >
      {label}
    </button>
  );
}

function SceneBadge({ value }: { value: string }) {
  return (
    <span className="border border-[var(--line)] bg-[rgba(18,18,18,0.88)] px-3 py-1 text-[11px] text-[var(--foreground-soft)]">
      {value}
    </span>
  );
}

function LightFixture({
  room,
  light,
  isSelected,
  onClick,
  onDragStart,
}: {
  room: Room;
  light: ProjectLight;
  isSelected: boolean;
  onClick: () => void;
  onDragStart: () => void;
}) {
  const lightRef = useRef<THREE.SpotLight | null>(null);
  const targetRef = useRef<THREE.Object3D | null>(null);
  const position = useMemo<[number, number, number]>(
    () => [
      mmToSceneUnits(light.xMm - room.widthMm / 2),
      mmToSceneUnits(light.heightMm),
      mmToSceneUnits(light.zMm - room.depthMm / 2),
    ],
    [light.heightMm, light.xMm, light.zMm, room.depthMm, room.widthMm],
  );
  const color = useMemo(() => kelvinToColor(light.temperatureK), [light.temperatureK]);
  const beamAngle = THREE.MathUtils.degToRad(
    Math.max(Math.min(light.beamAngleDeg / 2, 44), 8),
  );
  const distance = Math.max(mmToSceneUnits(light.heightMm + 1200), 3.2);

  useEffect(() => {
    if (!lightRef.current || !targetRef.current) {
      return;
    }

    lightRef.current.target = targetRef.current;
    lightRef.current.target.updateMatrixWorld();
  }, [position]);

  return (
    <group
      position={position}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
        onClick();
        onDragStart();
      }}
    >
      {light.enabled ? (
        <spotLight
          ref={lightRef}
          color={color}
          intensity={light.intensity / 60}
          angle={beamAngle}
          penumbra={0.4}
          distance={distance}
          decay={1.6}
          castShadow
        />
      ) : null}
      <object3D ref={targetRef} position={[0, -position[1] + 0.01, 0]} />

      <mesh position={[0, -0.03, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.05, 22]} />
        <meshStandardMaterial
          color={isSelected ? "#ebff00" : light.enabled ? "#f2f0e8" : "#666666"}
          emissive={isSelected ? "#6b7200" : "#000000"}
          emissiveIntensity={isSelected ? 0.55 : 0}
          roughness={0.28}
          metalness={0.18}
        />
      </mesh>

      <mesh position={[0, -0.08, 0]}>
        <coneGeometry args={[0.075, 0.1, 20]} />
        <meshStandardMaterial
          color={light.enabled ? color : "#444444"}
          emissive={light.enabled ? color : "#000000"}
          emissiveIntensity={light.enabled ? 0.18 : 0}
          transparent
          opacity={0.8}
          roughness={0.4}
        />
      </mesh>

      {isSelected ? (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.11, 0]}>
            <ringGeometry args={[0.11, 0.15, 30]} />
            <meshBasicMaterial color="#ebff00" transparent opacity={0.85} />
          </mesh>
          <mesh position={[0, -0.16, 0]}>
            <boxGeometry args={[0.26, 0.01, 0.01]} />
            <meshBasicMaterial color="#ebff00" />
          </mesh>
          <mesh position={[0, -0.16, 0]}>
            <boxGeometry args={[0.01, 0.01, 0.26]} />
            <meshBasicMaterial color="#ebff00" />
          </mesh>
        </>
      ) : null}
    </group>
  );
}

function kelvinToColor(kelvin: number) {
  const temperature = Math.max(1000, Math.min(40000, kelvin)) / 100;
  let red = 255;
  let green = 255;
  let blue = 255;

  if (temperature <= 66) {
    red = 255;
    green = 99.4708025861 * Math.log(temperature) - 161.1195681661;
    blue =
      temperature <= 19
        ? 0
        : 138.5177312231 * Math.log(temperature - 10) - 305.0447927307;
  } else {
    red = 329.698727446 * Math.pow(temperature - 60, -0.1332047592);
    green = 288.1221695283 * Math.pow(temperature - 60, -0.0755148492);
    blue = 255;
  }

  return new THREE.Color(
    clampChannel(red) / 255,
    clampChannel(green) / 255,
    clampChannel(blue) / 255,
  );
}

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Number.isFinite(value) ? value : 0));
}

function WallMesh({
  entry,
  isSelected,
  hasSelectedWall,
  wallColor,
  onSelectWall,
}: {
  entry: SceneWallData;
  isSelected: boolean;
  hasSelectedWall: boolean;
  wallColor: string;
  onSelectWall: (wallId: string) => void;
}) {
  const geometry = useMemo(() => {
    const geo = new THREE.ShapeGeometry(entry.shape);
    geo.translate(-entry.width / 2, -entry.height / 2, 0);
    return geo;
  }, [entry.shape, entry.width, entry.height]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group
      position={entry.position}
      rotation={[0, entry.rotationY, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelectWall(entry.wall.id);
      }}
    >
      <mesh geometry={geometry} receiveShadow castShadow>
        <meshStandardMaterial
          color={wallColor}
          metalness={0}
          roughness={0.96}
          side={THREE.DoubleSide}
          transparent
          opacity={hasSelectedWall && !isSelected ? 0.44 : 0.92}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[geometry]} />
        <lineBasicMaterial color={isSelected ? "#7ec5d6" : "#66727d"} />
      </lineSegments>
    </group>
  );
}

function BoxEdgesGeometry({
  width,
  height,
  depth,
}: {
  width: number;
  height: number;
  depth: number;
}) {
  const box = useMemo(() => new THREE.BoxGeometry(width, height, depth), [width, height, depth]);
  const edges = useMemo(() => new THREE.EdgesGeometry(box), [box]);

  useEffect(
    () => () => {
      box.dispose();
      edges.dispose();
    },
    [box, edges],
  );

  return <primitive object={edges} />;
}
