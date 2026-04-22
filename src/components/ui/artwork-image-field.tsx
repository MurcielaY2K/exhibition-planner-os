"use client";

import { useId } from "react";
import Image from "next/image";

export function ArtworkImageField({
  imageUrl,
  title,
  onSelectFile,
  onClear,
}: {
  imageUrl?: string;
  title: string;
  onSelectFile: (file: File) => void;
  onClear: () => void;
}) {
  const inputId = useId();

  return (
    <div className="grid gap-3">
      <ArtworkThumbnail
        imageUrl={imageUrl}
        title={title}
        className="aspect-[5/4] w-full rounded-[20px] border border-[var(--line)] bg-[var(--surface-soft)]"
      />
      <div className="flex flex-wrap gap-2">
        <label
          htmlFor={inputId}
          className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[#041017] transition hover:bg-[var(--accent-strong)]"
        >
          Upload visual
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (!file) {
              return;
            }

            onSelectFile(file);
            event.currentTarget.value = "";
          }}
        />
        {imageUrl ? (
          <button
            type="button"
            className="rounded-full border border-[var(--line-strong)] bg-[var(--surface-soft)] px-4 py-2 text-sm font-medium text-[var(--foreground-soft)] transition hover:border-[var(--line-strong)] hover:bg-[var(--surface-muted)]"
            onClick={onClear}
          >
            Remove image
          </button>
        ) : null}
      </div>
      <p className="text-sm leading-6 text-[var(--muted-strong)]">
        Upload a reference visual to see the work directly in the planner and 3D room view.
      </p>
    </div>
  );
}

export function ArtworkThumbnail({
  imageUrl,
  title,
  className = "",
}: {
  imageUrl?: string;
  title: string;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--surface-soft)] ${className}`}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, 320px"
          unoptimized
          className="object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(180deg,rgba(126,197,214,0.08)_0%,rgba(11,16,21,0)_100%)] px-6 text-center text-sm leading-6 text-[var(--muted-strong)]">
          No artwork visual uploaded yet
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(8,11,16,0)_0%,rgba(8,11,16,0.9)_100%)] px-4 py-3">
        <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
      </div>
    </div>
  );
}
