"use client";

import { ALL_AXES, AXIS_LABELS } from "@/lib/ophelia/types";
import type { AggregatedResponse, AxisKey, LangPref } from "@/lib/ophelia/types";
import { getDivisivenessLabel } from "@/lib/ophelia/ratings";

interface ResponseSpectrumProps {
  aggregate: AggregatedResponse;
  criticAxisRatings?: Partial<Record<AxisKey, number>>;
  lang: LangPref;
  compact?: boolean;
}

const AXIS_COLORS: Record<AxisKey, string> = {
  moved: "#7ec5d6",
  confused: "#f0b95f",
  wantToOwn: "#b6c62a",
  changedMyMind: "#a78bfa",
  cantStopThinking: "#ff7b72",
  overhyped: "#7c7a74",
  underrated: "#34d399",
};

function getAxisLabel(key: AxisKey, lang: LangPref): string {
  const labels = AXIS_LABELS[key];
  if (lang === "th") return labels.th;
  if (lang === "both") return `${labels.en} · ${labels.th}`;
  return labels.en;
}

export function ResponseSpectrum({
  aggregate,
  criticAxisRatings,
  lang,
  compact = false,
}: ResponseSpectrumProps) {
  const { axisCount, totalReviews, divisiveness } = aggregate;

  const sortedAxes = [...ALL_AXES].sort((a, b) => axisCount[b] - axisCount[a]);
  const visibleAxes = compact ? sortedAxes.slice(0, 3) : sortedAxes;
  const maxCount = Math.max(...ALL_AXES.map((k) => axisCount[k]), 1);
  const divLabel = getDivisivenessLabel(divisiveness);

  const divDotColor =
    divLabel.level === "high"
      ? "#ff7b72"
      : divLabel.level === "mid"
        ? "#f0b95f"
        : "#34d399";

  return (
    <div style={{ fontFamily: "var(--font-satoshi, var(--font-sans))" }}>
      {/* Axis bars */}
      <div className={compact ? "space-y-1.5" : "space-y-3"}>
        {visibleAxes.map((key) => {
          const count = axisCount[key];
          const color = AXIS_COLORS[key];
          const pct = count === 0 ? 0 : Math.max(3, (count / maxCount) * 100);
          const criticVal = criticAxisRatings?.[key];
          const criticPct =
            criticVal !== undefined ? Math.max(3, (criticVal / 5) * 100) : null;

          return (
            <div key={key}>
              {/* Label row */}
              <div
                className={`flex items-center gap-2 ${compact ? "mb-0.5" : "mb-1.5"}`}
              >
                <span
                  className="shrink-0 font-bold"
                  style={{
                    color,
                    fontSize: compact ? "9px" : "11px",
                    minWidth: compact ? "14px" : "16px",
                    lineHeight: 1,
                  }}
                >
                  {AXIS_LABELS[key].emoji}
                </span>
                <span
                  className="flex-1 truncate font-medium"
                  style={{
                    color: "var(--foreground-soft)",
                    fontSize: compact ? "10px" : "11px",
                    letterSpacing: compact ? "0" : "0.01em",
                  }}
                >
                  {getAxisLabel(key, lang)}
                </span>
                <span
                  className="shrink-0 font-semibold tabular-nums"
                  style={{
                    color: count > 0 ? color : "var(--muted-strong)",
                    fontSize: compact ? "10px" : "11px",
                  }}
                >
                  {count}
                </span>
              </div>

              {/* Bar track */}
              <div
                className="relative overflow-hidden rounded-full"
                style={{
                  height: compact ? "3px" : "6px",
                  background: "var(--surface-soft)",
                }}
              >
                {/* Audience fill bar */}
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${pct}%`,
                    background:
                      count > 0
                        ? `linear-gradient(90deg, ${color}80 0%, ${color} 100%)`
                        : "transparent",
                    transition: "width 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                />

                {/* Critic overlay bar (full mode only) — dashed inner glow style */}
                {criticPct !== null && !compact && (
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${criticPct}%`,
                      boxShadow: `inset 0 0 0 1.5px ${color}`,
                      background: `${color}14`,
                      transition: "width 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s",
                    }}
                  />
                )}
              </div>

              {/* Critic annotation (full mode only) */}
              {criticPct !== null && !compact && (
                <div className="mt-1 flex items-center gap-1.5">
                  <span
                    className="font-semibold uppercase tracking-widest"
                    style={{ color: "var(--muted-strong)", fontSize: "8px" }}
                  >
                    critic
                  </span>
                  <div
                    className="h-px flex-1"
                    style={{ background: `${color}28` }}
                  />
                  <span
                    className="tabular-nums font-medium"
                    style={{ color, fontSize: "9px" }}
                  >
                    {criticVal?.toFixed(1)}/5
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Compact: response hint */}
      {compact && totalReviews > 0 && (
        <p
          className="mt-1.5 font-medium uppercase tracking-widest"
          style={{ color: "var(--muted-strong)", fontSize: "9px" }}
        >
          {totalReviews} {totalReviews === 1 ? "response" : "responses"}
        </p>
      )}

      {/* Divisiveness section — full mode only */}
      {!compact && (
        <div
          className="mt-5 rounded-xl p-3.5"
          style={{ background: "var(--surface-soft)" }}
        >
          {/* Header */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <span
              className="font-semibold uppercase tracking-widest"
              style={{ color: "var(--muted-strong)", fontSize: "9px" }}
            >
              {lang === "th" ? "ความหลากหลายของความเห็น" : "Audience consensus"}
            </span>
            <span
              className="font-bold uppercase tracking-wider"
              style={{ color: divDotColor, fontSize: "9px" }}
            >
              {lang === "th" ? divLabel.th : divLabel.en}
            </span>
          </div>

          {/* Gradient slider track */}
          <div className="relative" style={{ height: "10px" }}>
            {/* Full gradient track (dim) */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, #34d399 0%, #f0b95f 50%, #ff7b72 100%)",
                opacity: 0.22,
              }}
            />
            {/* Active portion */}
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${Math.max(2, divisiveness * 100)}%`,
                background:
                  "linear-gradient(90deg, #34d399 0%, #f0b95f 50%, #ff7b72 100%)",
                opacity: 0.85,
                transition: "width 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            />
            {/* Dot marker */}
            <div
              className="absolute top-1/2 rounded-full border-2"
              style={{
                width: "14px",
                height: "14px",
                left: `${Math.max(2, divisiveness * 100)}%`,
                transform: "translate(-50%, -50%)",
                background: "#070707",
                borderColor: divDotColor,
                boxShadow: `0 0 0 3px ${divDotColor}28, 0 0 10px ${divDotColor}50`,
                transition:
                  "left 0.7s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s, box-shadow 0.3s",
              }}
            />
          </div>

          {/* Pole labels */}
          <div className="mt-1.5 flex justify-between">
            <span
              className="font-medium uppercase tracking-widest"
              style={{ color: "var(--muted-strong)", fontSize: "8px" }}
            >
              {lang === "th" ? "เห็นพ้อง" : "Consensus"}
            </span>
            <span
              className="font-medium uppercase tracking-widest"
              style={{ color: "var(--muted-strong)", fontSize: "8px" }}
            >
              {lang === "th" ? "แตกต่าง" : "Divided"}
            </span>
          </div>

          {/* Stats row */}
          <div
            className="mt-3 flex items-center gap-3 border-t pt-3"
            style={{ borderColor: "var(--line)" }}
          >
            <div className="flex flex-col gap-0.5">
              <span
                className="font-semibold uppercase tracking-widest"
                style={{ color: "var(--muted-strong)", fontSize: "8px" }}
              >
                {lang === "th" ? "รีวิว" : "Reviews"}
              </span>
              <span
                className="font-bold tabular-nums"
                style={{ color: "var(--foreground)", fontSize: "15px" }}
              >
                {aggregate.totalReviews}
              </span>
            </div>

            <div
              className="h-7 w-px self-center"
              style={{ background: "var(--line)" }}
            />

            <div className="flex flex-col gap-0.5">
              <span
                className="font-semibold uppercase tracking-widest"
                style={{ color: "var(--muted-strong)", fontSize: "8px" }}
              >
                {lang === "th" ? "ยืนยันแล้ว" : "Verified"}
              </span>
              <span
                className="font-bold tabular-nums"
                style={{ color: "var(--accent)", fontSize: "15px" }}
              >
                {aggregate.verifiedCount}
              </span>
            </div>

            {aggregate.writtenTakeCount > 0 && (
              <>
                <div
                  className="h-7 w-px self-center"
                  style={{ background: "var(--line)" }}
                />
                <div className="flex flex-col gap-0.5">
                  <span
                    className="font-semibold uppercase tracking-widest"
                    style={{ color: "var(--muted-strong)", fontSize: "8px" }}
                  >
                    {lang === "th" ? "บทวิจารณ์" : "Written"}
                  </span>
                  <span
                    className="font-bold tabular-nums"
                    style={{ color: "var(--foreground-soft)", fontSize: "15px" }}
                  >
                    {aggregate.writtenTakeCount}
                  </span>
                </div>
              </>
            )}

            {/* Critic panel indicator */}
            {criticAxisRatings &&
              Object.keys(criticAxisRatings).length > 0 && (
                <>
                  <div
                    className="h-7 w-px self-center"
                    style={{ background: "var(--line)" }}
                  />
                  <div className="flex flex-col gap-0.5">
                    <span
                      className="font-semibold uppercase tracking-widest"
                      style={{ color: "var(--muted-strong)", fontSize: "8px" }}
                    >
                      {lang === "th" ? "นักวิจารณ์" : "Critic"}
                    </span>
                    <span
                      className="font-bold uppercase tracking-wider"
                      style={{ color: "#a78bfa", fontSize: "10px" }}
                    >
                      {lang === "th" ? "มีความเห็น" : "On record"}
                    </span>
                  </div>
                </>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
