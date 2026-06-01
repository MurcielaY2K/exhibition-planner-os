"use client";

interface EyeScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

function scoreColor(score: number): string {
  if (score >= 600) return "var(--accent-strong)";
  if (score >= 300) return "var(--accent)";
  if (score >= 100) return "var(--foreground-soft)";
  return "var(--muted-strong)";
}

const SIZE_CONFIG = {
  sm: {
    wrapper: "inline-flex items-center gap-1",
    eye: { outer: 12, inner: 4, pupil: 2 },
    number: "text-[11px] font-semibold tabular-nums leading-none",
    label: "text-[9px] uppercase tracking-widest",
  },
  md: {
    wrapper: "inline-flex items-center gap-1.5",
    eye: { outer: 16, inner: 6, pupil: 2.5 },
    number: "text-sm font-bold tabular-nums leading-none",
    label: "text-[10px] uppercase tracking-widest",
  },
  lg: {
    wrapper: "flex flex-col items-center gap-1.5",
    eye: { outer: 28, inner: 10, pupil: 4 },
    number: "text-2xl font-bold tabular-nums leading-none",
    label: "text-[11px] uppercase tracking-widest",
  },
} as const;

function EyeIcon({
  size,
  color,
}: {
  size: { outer: number; inner: number; pupil: number };
  color: string;
}) {
  const { outer, inner, pupil } = size;
  const cx = outer / 2;
  const viewH = outer * 0.6;
  const eyeCy = outer * 0.3;
  const highlightOffsetX = outer * 0.032;
  const highlightOffsetY = outer * 0.04;

  return (
    <svg
      width={outer}
      height={viewH}
      viewBox={`0 0 ${outer} ${viewH}`}
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {/* Eye outline — almond shape */}
      <path
        d={`M ${outer * 0.02} ${eyeCy} Q ${cx} ${-outer * 0.04} ${outer * 0.98} ${eyeCy} Q ${cx} ${outer * 0.64} ${outer * 0.02} ${eyeCy} Z`}
        fill="none"
        stroke={color}
        strokeWidth={outer * 0.07}
        strokeLinejoin="round"
      />
      {/* Iris */}
      <circle
        cx={cx}
        cy={eyeCy}
        r={inner}
        fill={`${color}28`}
        stroke={color}
        strokeWidth={outer * 0.06}
      />
      {/* Pupil */}
      <circle cx={cx} cy={eyeCy} r={pupil} fill={color} />
      {/* Specular highlight */}
      <circle
        cx={cx + highlightOffsetX}
        cy={eyeCy - highlightOffsetY}
        r={outer * 0.04}
        fill={color}
        opacity={0.7}
      />
    </svg>
  );
}

export function EyeScoreBadge({
  score,
  size = "md",
  showLabel = false,
}: EyeScoreBadgeProps) {
  const config = SIZE_CONFIG[size];
  const color = scoreColor(score);
  const isLg = size === "lg";

  if (isLg && showLabel) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-2">
          <EyeIcon size={config.eye} color={color} />
          <span className={config.number} style={{ color }}>
            {score.toLocaleString()}
          </span>
        </div>
        <span
          className={config.label}
          style={{ color: "var(--muted-strong)" }}
        >
          Eye Score
        </span>
      </div>
    );
  }

  return (
    <span className={config.wrapper}>
      <EyeIcon size={config.eye} color={color} />
      <span className={config.number} style={{ color }}>
        {score.toLocaleString()}
      </span>
      {showLabel && (
        <span
          className={config.label}
          style={{ color: "var(--muted-strong)" }}
        >
          Eye Score
        </span>
      )}
    </span>
  );
}
