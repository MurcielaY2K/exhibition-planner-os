"use client";

import { useState, useMemo } from "react";
import { useOpheliaStore } from "@/lib/ophelia/store";
import { AXIS_LABELS } from "@/lib/ophelia/types";
import type { OReview, LangPref, AxisKey } from "@/lib/ophelia/types";

interface ReviewThreadProps {
  reviews: OReview[];
  lang: LangPref;
  showLimit?: number;
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

function getWrittenTake(
  review: OReview,
  lang: LangPref,
): string | undefined {
  if (lang === "th") {
    return review.writtenTakeTH ?? review.writtenTakeEN;
  }
  if (lang === "en") {
    return review.writtenTakeEN ?? review.writtenTakeTH;
  }
  // "both": prefer EN, show TH as fallback if EN absent
  return review.writtenTakeEN ?? review.writtenTakeTH;
}

function relativeTime(dateStr: string, lang: LangPref): string {
  const now = new Date("2026-06-01").getTime();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWk = Math.floor(diffDay / 7);
  const diffMo = Math.floor(diffDay / 30);

  if (lang === "th") {
    if (diffSec < 60) return "เมื่อกี้";
    if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
    if (diffHr < 24) return `${diffHr} ชั่วโมงที่แล้ว`;
    if (diffDay < 7) return `${diffDay} วันที่แล้ว`;
    if (diffWk < 5) return `${diffWk} สัปดาห์ที่แล้ว`;
    return `${diffMo} เดือนที่แล้ว`;
  }

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return diffDay === 1 ? "1 day ago" : `${diffDay} days ago`;
  if (diffWk < 5) return diffWk === 1 ? "1 week ago" : `${diffWk} weeks ago`;
  return diffMo === 1 ? "1 month ago" : `${diffMo} months ago`;
}

interface ReviewCardProps {
  review: OReview;
  lang: LangPref;
}

function ReviewCard({ review, lang }: ReviewCardProps) {
  const getUser = useOpheliaStore((s) => s.getUser);
  const user = getUser(review.userId);

  const writtenTake = getWrittenTake(review, lang);
  const timeLabel = relativeTime(review.createdAt, lang);

  const handle = user?.handle ?? review.userId;
  const eyeScore = user?.eyeScore ?? 0;
  const avatarColor = user?.avatarColor ?? "#7c7a74";
  const initial = handle.charAt(0).toUpperCase();

  // Eye score color
  let scoreColor = "var(--muted-strong)";
  if (eyeScore >= 600) scoreColor = "var(--accent-strong)";
  else if (eyeScore >= 300) scoreColor = "var(--accent)";
  else if (eyeScore >= 100) scoreColor = "var(--foreground-soft)";

  return (
    <article
      className="flex flex-col gap-3 rounded-xl p-4"
      style={{
        background: "var(--surface-muted)",
        border: "1px solid var(--line)",
      }}
    >
      {/* Header row: avatar + meta */}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          style={{
            background: avatarColor,
            color: "#070707",
          }}
          aria-hidden="true"
        >
          {initial}
        </div>

        {/* Handle + score */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className="truncate text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            @{handle}
          </span>

          {/* Eye score badge */}
          <span
            className="inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
            style={{
              background: "var(--surface-soft)",
              color: scoreColor,
            }}
            title={lang === "th" ? `คะแนนสายตา ${eyeScore}` : `Eye Score ${eyeScore}`}
          >
            <span aria-hidden="true" className="text-[9px]">◉</span>
            {eyeScore.toLocaleString()}
          </span>

          {/* Verified attendance badge */}
          {review.attendanceVerified && (
            <span
              className="inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
              style={{
                background: "rgba(52,211,153,0.12)",
                color: "#34d399",
                border: "1px solid rgba(52,211,153,0.24)",
              }}
              title={lang === "th" ? "ยืนยันการเข้าชม" : "Verified attendance"}
            >
              <span aria-hidden="true" style={{ fontSize: "9px" }}>📍</span>
              {lang === "th" ? "ไปจริง" : "Verified"}
            </span>
          )}
        </div>

        {/* Timestamp */}
        <time
          className="shrink-0 text-[10px] tabular-nums"
          style={{ color: "var(--muted-strong)" }}
          dateTime={review.createdAt}
        >
          {timeLabel}
        </time>
      </div>

      {/* Axis pills */}
      <div className="flex flex-wrap gap-1.5">
        {review.axisKeys.map((key) => {
          const color = AXIS_COLORS[key];
          const label = getAxisLabel(key, lang);
          const emoji = AXIS_LABELS[key].emoji;
          return (
            <span
              key={key}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{
                background: `${color}18`,
                color: color,
                border: `1px solid ${color}30`,
              }}
            >
              <span aria-hidden="true" className="leading-none" style={{ fontSize: "9px" }}>
                {emoji}
              </span>
              {label}
            </span>
          );
        })}
      </div>

      {/* Written take */}
      {writtenTake && (
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--foreground-soft)" }}
        >
          {writtenTake}
        </p>
      )}
    </article>
  );
}

export function ReviewThread({
  reviews,
  lang,
  showLimit = 5,
}: ReviewThreadProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Sort most recent first
  const sorted = useMemo(
    () =>
      [...reviews].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [reviews],
  );

  const hasMore = sorted.length > showLimit;
  const visible = isExpanded ? sorted : sorted.slice(0, showLimit);
  const hiddenCount = sorted.length - showLimit;

  if (sorted.length === 0) {
    return (
      <div className="py-8 text-center">
        <p
          className="text-sm"
          style={{ color: "var(--muted-strong)" }}
        >
          {lang === "th"
            ? "ยังไม่มีบทวิจารณ์ เป็นคนแรกสิ"
            : "No written takes yet. Be the first to add yours."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {visible.map((review) => (
        <ReviewCard key={review.id} review={review} lang={lang} />
      ))}

      {hasMore && (
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="w-full rounded-xl py-2.5 text-sm font-semibold transition-colors duration-150 hover:opacity-80"
          style={{
            background: "var(--surface-soft)",
            color: "var(--foreground-soft)",
            border: "1px solid var(--line)",
          }}
        >
          {isExpanded
            ? lang === "th"
              ? "ย่อรายการ"
              : "Show less"
            : lang === "th"
              ? `ดูเพิ่มอีก ${hiddenCount} รายการ`
              : `Show ${hiddenCount} more`}
        </button>
      )}
    </div>
  );
}
