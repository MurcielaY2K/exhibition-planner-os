"use client";

import { useRouter } from "next/navigation";
import { AppFrame } from "@/components/app-frame";
import { Card } from "@/components/ui/card";
import { Field, inputClassName } from "@/components/ui/field";
import { cmToMm, mmToCm } from "@/lib/domain/format";
import { useExhibitionStore } from "@/lib/state/use-exhibition-store";
import { useState } from "react";

export function NewProjectPage() {
  const router = useRouter();
  const createProject = useExhibitionStore((state) => state.createProject);
  const [form, setForm] = useState({
    name: "New Exhibition Project",
    venueName: "Gallery Name",
    roomName: "Main Room",
    widthMm: 9000,
    depthMm: 6000,
    heightMm: 3600,
  });

  function submit() {
    const projectId = createProject(form);
    router.push(`/projects/${projectId}`);
  }

  return (
    <AppFrame
      eyebrow="New Project"
      title="Create a planning file with a room envelope ready for curatorial and installer work."
      description="This first setup creates one rectangular room with four generated walls, ready for wall placement, openings, installer checks, 3D review, and export."
    >
        <Card className="mt-6 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Project name">
              <input
                className={inputClassName}
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </Field>
            <Field label="Venue name">
              <input
                className={inputClassName}
                value={form.venueName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    venueName: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Room name">
              <input
                className={inputClassName}
                value={form.roomName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, roomName: event.target.value }))
                }
              />
            </Field>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <DimensionField
              label="Width"
              valueMm={form.widthMm}
              onChange={(widthMm) =>
                setForm((current) => ({ ...current, widthMm }))
              }
            />
            <DimensionField
              label="Depth"
              valueMm={form.depthMm}
              onChange={(depthMm) =>
                setForm((current) => ({ ...current, depthMm }))
              }
            />
            <DimensionField
              label="Height"
              valueMm={form.heightMm}
              onChange={(heightMm) =>
                setForm((current) => ({ ...current, heightMm }))
              }
            />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-strong)]"
              onClick={submit}
            >
              Create project and open overview
            </button>
            <button
              type="button"
              className="rounded-full border border-black/10 px-5 py-3 text-sm font-medium text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)]"
              onClick={() => router.push("/")}
            >
              Cancel
            </button>
          </div>
        </Card>
    </AppFrame>
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
