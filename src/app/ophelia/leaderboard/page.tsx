"use client";

import Link from "next/link";
import { useOpheliaStore } from "@/lib/ophelia/store";
import { getDivisivenessLabel } from "@/lib/ophelia/ratings";
import { AXIS_LABELS, ALL_AXES } from "@/lib/ophelia/types";
import type {
  AxisKey,
  AggregatedResponse,
  LangPref,
  OEvent,
} from "@/lib/ophelia/types";
import type { LeaderboardEntry } from "@/lib/ophelia/taste";

const AXIS_COLORS: Record<AxisKey, string> = {
  moved: "#7ec5d6",
  confused: "#f0b95f",
  wantToOwn: "#b6c62a",
  changedMyMind: "#a78bfa",
  cantStopThinking: "#ff7b72",
  overhyped: "#7c7a74",
  underrated: "#34d399",
};

const LEVEL_COLORS: Record<"low" | "mid" | "high", string> = {
  low: "var(--accent)",
  mid: "var(--warning)",
  high: "var(--danger)",
};

export default function LeaderboardPage() {
  const lang = useOpheliaStore((s) => s.session.lang);
  const getDivisivenessLeaderboard = useOpheliaStore(
    (s) => s.getDivisivenessLeaderboard,
  );
  const getEvent = useOpheliaStore((s) => s.getEvent);
  const getAggregate = useOpheliaStore((s) => s.getAggregate);

  const entries = getDivisivenessLeaderboard();

  return (
    <div className="mx-auto max-w-3xl px-5 py-6">
      {/* Editorial header */}
      <header className="mb-7">
        <p
          className="mb-2 text-[10px] font-bold uppercase tracking-[0.28em]"
          style={{ color: "var(--danger)" }}
        >
          {lang === "th" ? "กระดานความแตกแยก" : "Divisiveness Leaderboard"}
        </p>
        <h1
          className="text-[2.7rem] font-black leading-[0.92]"
          style={{ color: "var(--foreground)", letterSpacing: "-0.04em" }}
        >
          {lang === "th" ? "ห้องแตกแยก" : "ROOM DIVIDED"}
        </h1>
        <p
          className="mt-3 text-sm font-medium leading-snug"
          style={{ color: "var(--foreground-soft)" }}
        >
          {lang === "th"
            ? "งานที่ทำให้ความเห็นแตกที่สุดในกรุงเทพฯ ตอนนี้"
            : "The shows splitting Bangkok hardest right now"}
        </p>

        {/* Explainer */}
        <p
          className="mt-4 rounded-xl border px-4 py-3 text-[12px] leading-relaxed"
          style={{
            background: "var(--surface)",
            borderColor: "var(--line)",
            color: "var(--muted-strong)",
          }}
        >
          {lang === "th"
            ? "คะแนนความแตกแยกสูง = ผู้ชมเห็นต่างกันจริง ๆ — OPHELIA ถือว่านี่คือคุณค่า ไม่ใช่สัญญาณรบกวน"
            : "A high divisiveness score means the crowd is genuinely split — OPHELIA treats that as a feature, not noise."}
        </p>
      </header>

      {entries.length === 0 ? (
        <EmptyState lang={lang} />
      ) : (
        <ol className="flex flex-col gap-2.5">
          {entries.map((entry) => {
            const event = getEvent(entry.eventId);
            if (!event) return null;
            const aggregate = getAggregate(entry.eventId);
            return (
              <li key={entry.eventId}>
                <LeaderboardRow
                  entry={entry}
                  event={event}
                  aggregate={aggregate}
                  lang={lang}
                />
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function LeaderboardRow({
  entry,
  event,
  aggregate,
  lang,
}: {
  entry: LeaderboardEntry;
  event: OEvent;
  aggregate: AggregatedResponse;
  lang: LangPref;
}) {
  const title = lang === "th" ? event.titleTH : event.titleEN;
  const label = getDivisivenessLabel(entry.divisiveness);
  const pct = Math.round(entry.divisiveness * 100);
  const isTop3 = entry.rank <= 3;
  const isTop = entry.rank === 1;
  const levelColor = LEVEL_COLORS[label.level];

  // Top two most-tapped axes (the split), only meaningful when there's signal.
  const topAxes = (ALL_AXES as AxisKey[])
    .map((k) => ({ key: k, count: aggregate.axisCount[k] }))
    .filter((a) => a.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 2);
  const showSplit = isTop && topAxes.length === 2;

  return (
    <Link
      href={`/ophelia/events/${event.id}`}
      className="group flex items-stretch gap-3.5 rounded-2xl border p-3 outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[var(--accent)] active:scale-[0.99]"
      style={{ background: "var(--surface)", borderColor: "var(--line)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--line-strong)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--line)";
      }}
    >
      {/* Rank */}
      <div className="flex w-9 shrink-0 items-center justify-center">
        <span
          className="font-black tabular-nums leading-none"
          style={{
            fontSize: isTop3 ? "1.9rem" : "1.35rem",
            color: isTop3 ? "var(--accent-strong)" : "var(--muted-strong)",
            letterSpacing: "-0.04em",
          }}
        >
          {entry.rank}
        </span>
      </div>

      {/* Thumbnail */}
      <img
        src={event.coverImage}
        alt={title}
        className="h-14 w-14 shrink-0 rounded-xl object-cover"
        style={{ border: "1px solid var(--line)" }}
      />

      {/* Body */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 py-0.5">
        <div className="min-w-0">
          <h3
            className="truncate text-[15px] font-bold leading-tight transition-colors group-hover:text-white"
            style={{ color: "var(--foreground)" }}
          >
            {title}
          </h3>
          <p
            className="mt-0.5 truncate text-[11px]"
            style={{ color: "var(--muted-strong)" }}
          >
            <span style={{ color: "var(--accent)" }}>{event.venueName}</span>
            <span style={{ color: "var(--line-strong)" }}> · </span>
            {event.venueArea}
          </p>
        </div>

        {/* Divisiveness meter */}
        <div className="flex flex-col gap-1.5">
          <div
            className="h-1.5 w-full overflow-hidden rounded-full"
            style={{ background: "var(--surface-soft)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background:
                  "linear-gradient(90deg, var(--accent) 0%, var(--warning) 55%, var(--danger) 100%)",
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: levelColor }}
                aria-hidden
              />
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: levelColor }}
              >
                {lang === "th" ? label.th : label.en}
              </span>
              <span
                className="text-[10px] font-bold tabular-nums"
                style={{ color: "var(--muted-strong)" }}
              >
                {pct}
              </span>
            </span>
            <span
              className="shrink-0 text-[10px] font-semibold tabular-nums"
              style={{ color: "var(--muted-strong)" }}
            >
              {entry.totalReviews} {lang === "th" ? "ความเห็น" : "takes"}
            </span>
          </div>
        </div>

        {/* The split — only on the #1 entry */}
        {showSplit && (
          <div
            className="mt-0.5 flex items-center gap-2 rounded-lg px-2.5 py-1.5"
            style={{ background: "var(--surface-soft)" }}
          >
            <AxisChip axis={topAxes[0].key} count={topAxes[0].count} lang={lang} />
            <span
              className="text-xs font-black"
              style={{ color: "var(--muted-strong)" }}
              aria-hidden
            >
              ↔
            </span>
            <AxisChip axis={topAxes[1].key} count={topAxes[1].count} lang={lang} />
          </div>
        )}
      </div>
    </Link>
  );
}

function AxisChip({
  axis,
  count,
  lang,
}: {
  axis: AxisKey;
  count: number;
  lang: LangPref;
}) {
  const color = AXIS_COLORS[axis];
  const meta = AXIS_LABELS[axis];
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: color }}
        aria-hidden
      />
      <span
        className="truncate text-[11px] font-bold"
        style={{ color: "var(--foreground-soft)" }}
      >
        {lang === "th" ? meta.th : meta.en}
      </span>
      <span
        className="text-[11px] font-black tabular-nums"
        style={{ color }}
      >
        {count}
      </span>
    </span>
  );
}

function EmptyState({ lang }: { lang: LangPref }) {
  return (
    <div
      className="rounded-2xl border px-5 py-12 text-center"
      style={{ background: "var(--surface)", borderColor: "var(--line)" }}
    >
      <p className="text-3xl font-black" style={{ color: "var(--muted-strong)" }}>
        ⚖
      </p>
      <p
        className="mt-3 text-base font-bold"
        style={{ color: "var(--foreground)" }}
      >
        {lang === "th"
          ? "ยังไม่มีงานที่แตกความเห็นมากพอ"
          : "No shows splitting the room yet"}
      </p>
      <p
        className="mt-1.5 text-[13px] leading-snug"
        style={{ color: "var(--muted-strong)" }}
      >
        {lang === "th"
          ? "เมื่อมีคนลงความเห็นมากขึ้น งานที่แตกแยกที่สุดจะโผล่มาที่นี่"
          : "As more takes roll in, the most divisive shows will surface here."}
      </p>
      <Link
        href="/ophelia"
        className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 text-sm font-bold transition-transform active:scale-[0.97]"
        style={{ background: "var(--accent)", color: "#070707" }}
      >
        {lang === "th" ? "สำรวจงาน" : "Browse shows"}
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
