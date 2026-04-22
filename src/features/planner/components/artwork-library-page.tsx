"use client";

import { useMemo } from "react";
import { ProjectShell } from "@/components/project-shell";
import { Card } from "@/components/ui/card";
import { Field, inputClassName } from "@/components/ui/field";
import { useShallow } from "zustand/react/shallow";
import { cmToMm, formatArtworkSize, mmToCm } from "@/lib/domain/format";
import {
  getProjectBundle,
  useExhibitionStore,
} from "@/lib/state/use-exhibition-store";

export function ArtworkLibraryPage({ projectId }: { projectId: string }) {
  const { bundle, addArtwork, selectArtwork, updateArtwork, selectedArtworkId } =
    useExhibitionStore(
      useShallow((state) => ({
        bundle: getProjectBundle(state.projects, projectId),
        addArtwork: state.addArtwork,
        selectArtwork: state.selectArtwork,
        updateArtwork: state.updateArtwork,
        selectedArtworkId: state.ui[projectId]?.selectedArtworkId,
      })),
    );

  const selectedArtwork = useMemo(
    () => bundle?.artworks.find((artwork) => artwork.id === selectedArtworkId) ?? bundle?.artworks[0],
    [bundle, selectedArtworkId],
  );

  if (!bundle) {
    return null;
  }

  return (
    <ProjectShell
      project={bundle.project}
      activePath="artworks"
      title="Artwork Library"
      description="This route is the first dedicated artwork management screen. It stays close to registrar and curatorial workflows, with dimensions visible and editable at all times."
      stats={[
        { label: "Records", value: bundle.artworks.length.toString() },
        { label: "Placed", value: bundle.placements.length.toString() },
        {
          label: "Unplaced",
          value: Math.max(bundle.artworks.length - bundle.placements.length, 0).toString(),
        },
        { label: "Venue", value: bundle.project.venueName },
      ]}
    >
      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-strong)]">
                Artwork Records
              </p>
              <h2 className="mt-2 text-xl font-semibold">Library</h2>
            </div>
            <button
              type="button"
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-strong)]"
              onClick={() => addArtwork(projectId)}
            >
              Add artwork
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {bundle.artworks.map((artwork) => (
              <button
                key={artwork.id}
                type="button"
                onClick={() => selectArtwork(projectId, artwork.id)}
                className={`w-full rounded-[18px] border px-4 py-4 text-left transition ${
                  artwork.id === selectedArtwork?.id
                    ? "border-[var(--accent)] bg-[rgba(43,97,82,0.08)]"
                    : "border-black/8 bg-white hover:border-black/16"
                }`}
              >
                <p className="text-sm font-semibold">{artwork.title}</p>
                <p className="mt-1 text-sm text-[var(--muted-strong)]">
                  {artwork.artist}
                </p>
                <p className="mt-2 text-sm text-[var(--muted-strong)]">
                  {formatArtworkSize(artwork.widthMm, artwork.heightMm)}
                </p>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-strong)]">
            Editor
          </p>
          <h2 className="mt-2 text-xl font-semibold">Selected artwork</h2>

          {selectedArtwork ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Title">
                <input
                  className={inputClassName}
                  value={selectedArtwork.title}
                  onChange={(event) =>
                    updateArtwork(projectId, selectedArtwork.id, {
                      title: event.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Artist">
                <input
                  className={inputClassName}
                  value={selectedArtwork.artist}
                  onChange={(event) =>
                    updateArtwork(projectId, selectedArtwork.id, {
                      artist: event.target.value,
                    })
                  }
                />
              </Field>
              <DimensionField
                label="Width"
                valueMm={selectedArtwork.widthMm}
                onChange={(valueMm) =>
                  updateArtwork(projectId, selectedArtwork.id, { widthMm: valueMm })
                }
              />
              <DimensionField
                label="Height"
                valueMm={selectedArtwork.heightMm}
                onChange={(valueMm) =>
                  updateArtwork(projectId, selectedArtwork.id, { heightMm: valueMm })
                }
              />
              <DimensionField
                label="Depth"
                valueMm={selectedArtwork.depthMm ?? 0}
                onChange={(valueMm) =>
                  updateArtwork(projectId, selectedArtwork.id, { depthMm: valueMm })
                }
              />
              <Field label="Year">
                <input
                  className={inputClassName}
                  value={selectedArtwork.year ?? ""}
                  onChange={(event) =>
                    updateArtwork(projectId, selectedArtwork.id, {
                      year: event.target.value,
                    })
                  }
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Medium">
                  <input
                    className={inputClassName}
                    value={selectedArtwork.medium ?? ""}
                    onChange={(event) =>
                      updateArtwork(projectId, selectedArtwork.id, {
                        medium: event.target.value,
                      })
                    }
                  />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Image">
                  <div className="rounded-[18px] border border-dashed border-black/12 bg-[var(--surface-muted)] px-4 py-10 text-center text-sm text-[var(--muted-strong)]">
                    Image placeholder for MVP. Storage can later move to Supabase without changing the artwork data model.
                  </div>
                </Field>
              </div>
            </div>
          ) : (
            <p className="mt-5 rounded-[18px] border border-dashed border-black/12 px-4 py-4 text-sm text-[var(--muted-strong)]">
              Select an artwork to edit it.
            </p>
          )}
        </Card>
      </div>
    </ProjectShell>
  );
}

function DimensionField({
  label,
  valueMm,
  onChange,
}: {
  label: string;
  valueMm: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={`${label} (cm)`}>
      <input
        type="number"
        min={0}
        step={0.1}
        className={inputClassName}
        value={mmToCm(valueMm)}
        onChange={(event) => onChange(cmToMm(Number(event.target.value) || 0))}
      />
    </Field>
  );
}
