"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { compressImageWithMeta } from "@/lib/file";
import { mmToCm } from "@/lib/domain/format";
import {
  ensureScene,
  getProjectBundle,
  useExhibitionStore,
} from "@/lib/state/use-exhibition-store";
import type { Artwork, Scene, SceneCalibration, ScenePlacement } from "@/lib/domain/types";

const DEFAULT_WIDTH_NORM = 0.22;

interface CalibrationDraft {
  a?: { x: number; y: number };
  b?: { x: number; y: number };
}

export function OnSitePage({ projectId }: { projectId: string }) {
  const {
    bundle,
    sceneRaw,
    setSceneImage,
    setSceneCalibration,
    addScenePlacement,
    updateScenePlacement,
    removeScenePlacement,
  } = useExhibitionStore(
    useShallow((state) => ({
      bundle: getProjectBundle(state.projects, projectId),
      // Select the stable stored reference; normalize below in a memo so the
      // selector result stays referentially stable for useShallow.
      sceneRaw: state.scenes[projectId],
      setSceneImage: state.setSceneImage,
      setSceneCalibration: state.setSceneCalibration,
      addScenePlacement: state.addScenePlacement,
      updateScenePlacement: state.updateScenePlacement,
      removeScenePlacement: state.removeScenePlacement,
    })),
  );

  const scene = useMemo(() => ensureScene(sceneRaw), [sceneRaw]);

  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [calibrationDraft, setCalibrationDraft] = useState<CalibrationDraft>({});
  const [refLengthCm, setRefLengthCm] = useState("210");
  const [toast, setToast] = useState<string | null>(null);

  const artworks = useMemo(() => bundle?.artworks ?? [], [bundle]);

  // Keep the stage pixel size in sync so we can map normalized coords to px.
  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const update = () =>
      setStageSize({ width: node.clientWidth, height: node.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [scene.imageUrl]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!bundle) {
    return null;
  }

  async function handlePhoto(file: File) {
    setBusy(true);
    try {
      const { dataUrl, width, height } = await compressImageWithMeta(file);
      setSceneImage(projectId, { imageUrl: dataUrl, naturalWidth: width, naturalHeight: height });
      setSelectedId(null);
    } catch {
      setToast("Could not load that photo. Try another.");
    } finally {
      setBusy(false);
    }
  }

  function pointToNorm(clientX: number, clientY: number) {
    const node = stageRef.current;
    if (!node) return { x: 0.5, y: 0.5 };
    const rect = node.getBoundingClientRect();
    return {
      x: clamp01((clientX - rect.left) / rect.width),
      y: clamp01((clientY - rect.top) / rect.height),
    };
  }

  function handleAddArtwork(artwork: Artwork) {
    if (!scene.imageUrl) {
      setToast("Add a wall photo first.");
      return;
    }
    addScenePlacement(projectId, artwork.id, 0.5, 0.5, DEFAULT_WIDTH_NORM);
    setToast(`${artwork.title} placed — drag to position`);
  }

  function handleStageTap(event: React.PointerEvent) {
    if (calibrating) {
      const point = pointToNorm(event.clientX, event.clientY);
      setCalibrationDraft((draft) => {
        if (!draft.a) return { a: point };
        if (!draft.b) return { ...draft, b: point };
        // Both set: start over from the nearest endpoint reset.
        return { a: point };
      });
      return;
    }
    // Tapping empty canvas clears selection.
    setSelectedId(null);
  }

  function commitCalibration() {
    if (!calibrationDraft.a || !calibrationDraft.b) {
      setToast("Tap two points on the photo first.");
      return;
    }
    const referenceLengthMm = Math.max(1, Number(refLengthCm) * 10 || 0);
    setSceneCalibration(projectId, {
      ax: calibrationDraft.a.x,
      ay: calibrationDraft.a.y,
      bx: calibrationDraft.b.x,
      by: calibrationDraft.b.y,
      referenceLengthMm,
    });
    setCalibrating(false);
    setCalibrationDraft({});
    setToast("Scale set — artworks now show true size");
  }

  const mmPerPx = getMmPerPx(scene.calibration, stageSize);

  async function handleShare() {
    if (!scene.imageUrl) return;
    setBusy(true);
    try {
      await exportComposite(scene, artworks, mmPerPx, stageSize);
      setToast("Saved composite image");
    } catch {
      setToast("Could not export image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="safe-top flex min-h-[100svh] flex-col bg-[var(--background)] text-[var(--foreground)]">
      {/* Slim top bar */}
      <header className="safe-x flex items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/"
          aria-label="All projects"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line)] text-lg text-[var(--foreground-soft)] transition hover:bg-[var(--surface-soft)]"
        >
          ‹
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-semibold">{bundle.project.name}</p>
          <p className="truncate text-[11px] text-[var(--muted-strong)]">
            {scene.calibration ? "True scale · on-site" : "Place mode"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/projects/${projectId}/planner`}
            className="flex h-11 items-center rounded-full border border-[var(--line)] px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-strong)] transition hover:bg-[var(--surface-soft)]"
          >
            Pro
          </Link>
          <button
            type="button"
            onClick={handleShare}
            disabled={!scene.imageUrl || busy}
            className="flex h-11 items-center rounded-full bg-[var(--accent)] px-4 text-[13px] font-semibold text-black transition hover:bg-[var(--accent-strong)] disabled:opacity-40"
          >
            Share
          </button>
        </div>
      </header>

      {/* Stage */}
      <div className="safe-x relative flex flex-1 items-center justify-center overflow-hidden px-3 pb-2">
        {scene.imageUrl ? (
          <div className="relative flex max-h-full w-full items-center justify-center">
            <div
              ref={stageRef}
              className="relative w-full touch-none select-none overflow-hidden rounded-[20px] border border-[var(--line)]"
              style={{
                aspectRatio:
                  scene.naturalWidth && scene.naturalHeight
                    ? `${scene.naturalWidth} / ${scene.naturalHeight}`
                    : "4 / 3",
                maxHeight: "100%",
              }}
              onPointerDown={(event) => {
                // Only treat direct stage taps (not bubbled from a placement).
                if (event.target === event.currentTarget || event.target instanceof HTMLImageElement) {
                  handleStageTap(event);
                }
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={scene.imageUrl}
                alt="Wall"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                draggable={false}
              />

              {scene.placements.map((placement) => {
                const artwork = artworks.find((entry) => entry.id === placement.artworkId);
                if (!artwork) return null;
                return (
                  <PlacementView
                    key={placement.id}
                    placement={placement}
                    artwork={artwork}
                    stageSize={stageSize}
                    mmPerPx={mmPerPx}
                    selected={selectedId === placement.id}
                    disabled={calibrating}
                    onSelect={() => setSelectedId(placement.id)}
                    onMove={(xNorm, yNorm) =>
                      updateScenePlacement(projectId, placement.id, { xNorm, yNorm })
                    }
                    onResize={(widthNorm) =>
                      updateScenePlacement(projectId, placement.id, { widthNorm })
                    }
                    onRemove={() => {
                      removeScenePlacement(projectId, placement.id);
                      setSelectedId(null);
                    }}
                  />
                );
              })}

              {/* Calibration overlay */}
              {calibrating ? (
                <CalibrationOverlay draft={calibrationDraft} stageSize={stageSize} />
              ) : null}
            </div>

            {/* Calibration chip / badge */}
            <div className="pointer-events-none absolute left-5 top-2 flex gap-2">
              {!calibrating ? (
                <button
                  type="button"
                  onClick={() => {
                    setCalibrating(true);
                    setCalibrationDraft({});
                    setSelectedId(null);
                  }}
                  className="pointer-events-auto flex h-9 items-center gap-1.5 rounded-full bg-black/70 px-3 text-[12px] font-medium text-white backdrop-blur-sm"
                >
                  <span aria-hidden>⌗</span>
                  {scene.calibration ? "Scale set" : "Set scale"}
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <EmptyState busy={busy} onPhoto={handlePhoto} />
        )}

        {/* Calibration controls */}
        {calibrating ? (
          <div className="safe-x absolute inset-x-0 bottom-3 mx-auto flex max-w-md flex-col gap-3 rounded-[20px] border border-[var(--line)] bg-[rgba(12,12,12,0.94)] p-4 backdrop-blur">
            <p className="text-[13px] leading-5 text-[var(--foreground-soft)]">
              Tap two points a known distance apart — a door edge to edge, a window,
              anything you can measure. Then enter the real distance.
            </p>
            <div className="flex items-center gap-2">
              <label className="text-[12px] text-[var(--muted-strong)]">Real distance</label>
              <input
                inputMode="decimal"
                value={refLengthCm}
                onChange={(event) => setRefLengthCm(event.target.value)}
                className="h-11 w-24 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 text-sm text-[var(--foreground)]"
              />
              <span className="text-[12px] text-[var(--muted-strong)]">cm</span>
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCalibrating(false);
                    setCalibrationDraft({});
                  }}
                  className="h-11 rounded-full border border-[var(--line)] px-4 text-[13px] text-[var(--muted-strong)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={commitCalibration}
                  disabled={!calibrationDraft.a || !calibrationDraft.b}
                  className="h-11 rounded-full bg-[var(--accent)] px-5 text-[13px] font-semibold text-black disabled:opacity-40"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {toast ? (
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-[12px] text-white backdrop-blur">
            {toast}
          </div>
        ) : null}
      </div>

      {/* Artwork tray */}
      {scene.imageUrl && !calibrating ? (
        <div className="safe-bottom safe-x border-t border-[var(--line)] bg-[rgba(10,10,10,0.96)] px-3 pt-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-strong)]">
              Tap to place
            </p>
            <PhotoButton label="Change photo" busy={busy} onPhoto={handlePhoto} subtle />
          </div>
          <div className="flex gap-3 overflow-x-auto pb-3">
            <Link
              href={`/projects/${projectId}/artworks`}
              className="flex h-[88px] w-[72px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-[var(--line-strong)] text-[var(--muted-strong)]"
            >
              <span className="text-2xl leading-none">+</span>
              <span className="text-[10px]">Add art</span>
            </Link>
            {artworks.map((artwork) => (
              <button
                key={artwork.id}
                type="button"
                onClick={() => handleAddArtwork(artwork)}
                className="flex w-[72px] shrink-0 flex-col gap-1 text-left"
              >
                <span className="relative block h-[88px] w-[72px] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)]">
                  {artwork.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={artwork.imageUrl}
                      alt={artwork.title}
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] text-[var(--muted-strong)]">
                      {artwork.title}
                    </span>
                  )}
                </span>
                <span className="truncate text-[11px] font-medium">{artwork.title}</span>
                <span className="truncate text-[10px] text-[var(--muted-strong)]">
                  {Math.round(mmToCm(artwork.widthMm))}×{Math.round(mmToCm(artwork.heightMm))} cm
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </main>
  );
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function getMmPerPx(
  calibration: SceneCalibration | undefined,
  stageSize: { width: number; height: number },
): number | null {
  if (!calibration || stageSize.width === 0 || stageSize.height === 0) {
    return null;
  }
  const dxPx = (calibration.bx - calibration.ax) * stageSize.width;
  const dyPx = (calibration.by - calibration.ay) * stageSize.height;
  const distancePx = Math.hypot(dxPx, dyPx);
  if (distancePx < 1) return null;
  return calibration.referenceLengthMm / distancePx;
}

function placementPixelSize(
  placement: ScenePlacement,
  artwork: Artwork,
  mmPerPx: number | null,
  stageSize: { width: number; height: number },
) {
  const aspect = artwork.heightMm > 0 ? artwork.heightMm / artwork.widthMm : 1;
  if (mmPerPx && mmPerPx > 0) {
    const widthPx = artwork.widthMm / mmPerPx;
    return { widthPx, heightPx: widthPx * aspect };
  }
  const widthPx = (placement.widthNorm ?? DEFAULT_WIDTH_NORM) * stageSize.width;
  return { widthPx, heightPx: widthPx * aspect };
}

function PlacementView({
  placement,
  artwork,
  stageSize,
  mmPerPx,
  selected,
  disabled,
  onSelect,
  onMove,
  onResize,
  onRemove,
}: {
  placement: ScenePlacement;
  artwork: Artwork;
  stageSize: { width: number; height: number };
  mmPerPx: number | null;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  onMove: (xNorm: number, yNorm: number) => void;
  onResize: (widthNorm: number) => void;
  onRemove: () => void;
}) {
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const resizeRef = useRef<{ pointerId: number; startX: number; startWidthNorm: number } | null>(
    null,
  );

  const { widthPx, heightPx } = placementPixelSize(placement, artwork, mmPerPx, stageSize);
  const centerX = placement.xNorm * stageSize.width;
  const centerY = placement.yNorm * stageSize.height;

  const widthCm = Math.round(mmToCm(artwork.widthMm));
  const heightCm = Math.round(mmToCm(artwork.heightMm));

  return (
    <div
      className="absolute"
      style={{
        left: centerX - widthPx / 2,
        top: centerY - heightPx / 2,
        width: widthPx,
        height: heightPx,
        touchAction: "none",
      }}
      onPointerDown={(event) => {
        if (disabled) return;
        event.stopPropagation();
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          originX: placement.xNorm,
          originY: placement.yNorm,
          moved: false,
        };
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId || stageSize.width === 0) return;
        const dx = (event.clientX - drag.startX) / stageSize.width;
        const dy = (event.clientY - drag.startY) / stageSize.height;
        if (Math.abs(dx) > 0.004 || Math.abs(dy) > 0.004) drag.moved = true;
        onMove(clamp01(drag.originX + dx), clamp01(drag.originY + dy));
      }}
      onPointerUp={() => {
        const drag = dragRef.current;
        dragRef.current = null;
        if (drag && !drag.moved) onSelect();
      }}
      onPointerCancel={() => {
        dragRef.current = null;
      }}
    >
      {/* Soft drop shadow for realism */}
      <div
        className="absolute inset-0"
        style={{ boxShadow: "0 10px 26px rgba(0,0,0,0.42)", borderRadius: 2 }}
      />
      {artwork.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={artwork.imageUrl}
          alt={artwork.title}
          className="relative h-full w-full object-cover"
          draggable={false}
          style={{ outline: selected ? "2px solid var(--accent)" : "1px solid rgba(0,0,0,0.35)" }}
        />
      ) : (
        <div
          className="relative flex h-full w-full items-center justify-center bg-[#e9e6df] p-1 text-center text-[10px] text-[#444]"
          style={{ outline: selected ? "2px solid var(--accent)" : "1px solid rgba(0,0,0,0.35)" }}
        >
          {artwork.title}
        </div>
      )}

      {selected && !disabled ? (
        <>
          <button
            type="button"
            aria-label="Remove"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onRemove}
            className="absolute -right-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--danger)] text-sm font-bold text-black shadow"
          >
            ×
          </button>
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/80 px-2 py-0.5 text-[10px] text-white">
            {widthCm}×{heightCm} cm{mmPerPx ? " · true scale" : ""}
          </span>
          {/* Free-mode resize handle (only when not calibrated) */}
          {!mmPerPx ? (
            <span
              role="slider"
              aria-label="Resize"
              aria-valuenow={Math.round((placement.widthNorm ?? DEFAULT_WIDTH_NORM) * 100)}
              tabIndex={0}
              onPointerDown={(event) => {
                event.stopPropagation();
                (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
                resizeRef.current = {
                  pointerId: event.pointerId,
                  startX: event.clientX,
                  startWidthNorm: placement.widthNorm ?? DEFAULT_WIDTH_NORM,
                };
              }}
              onPointerMove={(event) => {
                const resize = resizeRef.current;
                if (!resize || resize.pointerId !== event.pointerId || stageSize.width === 0) return;
                const delta = (event.clientX - resize.startX) / stageSize.width;
                onResize(Math.min(1.5, Math.max(0.04, resize.startWidthNorm + delta * 2)));
              }}
              onPointerUp={() => {
                resizeRef.current = null;
              }}
              className="absolute -bottom-3 -right-3 flex h-7 w-7 cursor-se-resize items-center justify-center rounded-full bg-[var(--accent)] text-black shadow"
            >
              ⤡
            </span>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function CalibrationOverlay({
  draft,
  stageSize,
}: {
  draft: CalibrationDraft;
  stageSize: { width: number; height: number };
}) {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full">
      {draft.a && draft.b ? (
        <line
          x1={draft.a.x * stageSize.width}
          y1={draft.a.y * stageSize.height}
          x2={draft.b.x * stageSize.width}
          y2={draft.b.y * stageSize.height}
          stroke="var(--accent-strong)"
          strokeWidth={3}
          strokeDasharray="8 6"
        />
      ) : null}
      {[draft.a, draft.b].map((point, index) =>
        point ? (
          <g key={index}>
            <circle
              cx={point.x * stageSize.width}
              cy={point.y * stageSize.height}
              r={10}
              fill="var(--accent-strong)"
              stroke="black"
              strokeWidth={2}
            />
          </g>
        ) : null,
      )}
    </svg>
  );
}

function EmptyState({
  busy,
  onPhoto,
}: {
  busy: boolean;
  onPhoto: (file: File) => void;
}) {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-5 px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-[var(--line)] bg-[var(--surface-soft)] text-4xl">
        📷
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Snap your wall</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--foreground-soft)]">
          Take a photo of the real space, then tap your artworks to drop them onto it
          at true scale.
        </p>
      </div>
      <div className="flex w-full flex-col gap-3">
        <PhotoButton label="Take a photo" busy={busy} onPhoto={onPhoto} capture />
        <PhotoButton label="Choose from library" busy={busy} onPhoto={onPhoto} subtle />
      </div>
    </div>
  );
}

function PhotoButton({
  label,
  busy,
  onPhoto,
  capture = false,
  subtle = false,
}: {
  label: string;
  busy: boolean;
  onPhoto: (file: File) => void;
  capture?: boolean;
  subtle?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className={
          subtle
            ? "flex h-11 items-center justify-center rounded-full border border-[var(--line)] px-4 text-[12px] font-medium text-[var(--foreground-soft)] transition hover:bg-[var(--surface-soft)] disabled:opacity-40"
            : "flex h-12 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-black transition hover:bg-[var(--accent-strong)] disabled:opacity-40"
        }
      >
        {busy ? "Loading…" : label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        {...(capture ? { capture: "environment" as const } : {})}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPhoto(file);
          event.currentTarget.value = "";
        }}
      />
    </>
  );
}

// Render the photo + placed artworks to an offscreen canvas at full resolution
// and trigger a download — the on-the-go "share with the team" deliverable.
async function exportComposite(
  scene: Scene,
  artworks: Artwork[],
  mmPerPxStage: number | null,
  stageSize: { width: number; height: number },
) {
  if (!scene.imageUrl || !scene.naturalWidth || !scene.naturalHeight) return;

  const canvas = document.createElement("canvas");
  canvas.width = scene.naturalWidth;
  canvas.height = scene.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no ctx");

  const bg = await loadImage(scene.imageUrl);
  ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

  // Scale factor from on-screen stage px to natural px keeps true-scale sizing.
  const stageToNatural = stageSize.width > 0 ? canvas.width / stageSize.width : 1;

  for (const placement of scene.placements) {
    const artwork = artworks.find((entry) => entry.id === placement.artworkId);
    if (!artwork) continue;
    const { widthPx, heightPx } = placementPixelSize(placement, artwork, mmPerPxStage, stageSize);
    const w = widthPx * stageToNatural;
    const h = heightPx * stageToNatural;
    const cx = placement.xNorm * canvas.width;
    const cy = placement.yNorm * canvas.height;
    const x = cx - w / 2;
    const y = cy - h / 2;

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.42)";
    ctx.shadowBlur = Math.max(8, w * 0.04);
    ctx.shadowOffsetY = Math.max(6, h * 0.03);
    if (artwork.imageUrl) {
      const art = await loadImage(artwork.imageUrl);
      ctx.drawImage(art, x, y, w, h);
    } else {
      ctx.fillStyle = "#e9e6df";
      ctx.fillRect(x, y, w, h);
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = Math.max(1, w * 0.004);
    ctx.strokeRect(x, y, w, h);
  }

  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = "exhibition-on-site.jpg";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}
