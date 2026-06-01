"use client";

import Link from "next/link";
import type { OEvent, AggregatedResponse, LangPref } from "@/lib/ophelia/types";
import { getDivisivenessLabel } from "@/lib/ophelia/ratings";
import { ResponseSpectrum } from "./response-spectrum";

interface EventCardProps {
  event: OEvent;
  aggregate: AggregatedResponse;
  lang: LangPref;
  href: string;
}

const EVENT_TYPE_LABELS: Record<string, { en: string; th: string }> = {
  exhibition: { en: "Exhibition", th: "นิทรรศการ" },
  installation: { en: "Installation", th: "อินสทอลเลชัน" },
  festival: { en: "Festival", th: "เทศกาล" },
  performance: { en: "Performance", th: "การแสดง" },
  venue: { en: "Venue", th: "สถานที่" },
};

function formatDateRange(startDate: string, endDate: string, lang: LangPref): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const locale = lang === "th" ? "th-TH" : "en-GB";
  return `${start.toLocaleDateString(locale, opts)} – ${end.toLocaleDateString(locale, opts)}`;
}

function daysUntil(dateStr: string): number {
  const today = new Date("2026-06-01");
  const end = new Date(dateStr);
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function EventCard({ event, aggregate, lang, href }: EventCardProps) {
  const title = lang === "th" ? event.titleTH : event.titleEN;
  const typeLabel = EVENT_TYPE_LABELS[event.type] ?? { en: event.type, th: event.type };
  const divLabel = getDivisivenessLabel(aggregate.divisiveness);
  const daysLeft = daysUntil(event.endDate);
  const isEndingSoon = daysLeft >= 0 && daysLeft <= 7;
  const isRoomDivided = aggregate.divisiveness >= 0.6 && aggregate.totalReviews >= 2;

  return (
    <Link
      href={href}
      className="group block outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-2xl"
      style={{ textDecoration: "none" }}
    >
      <article
        className="relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 ease-out group-hover:scale-[1.012]"
        style={{
          background: "var(--surface)",
          borderColor: "var(--line)",
        }}
      >
        {/* Hover border highlight */}
        <div
          className="pointer-events-none absolute inset-0 z-10 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ boxShadow: "inset 0 0 0 1px var(--line-strong)" }}
        />

        {/* Cover image */}
        <div className="relative overflow-hidden" style={{ aspectRatio: "4/3" }}>
          <img
            src={event.coverImage}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />

          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, transparent 35%, rgba(7,7,7,0.68) 100%)",
            }}
          />

          {/* Top-left badge strip */}
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {/* Event type */}
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm"
              style={{
                background: "rgba(7,7,7,0.75)",
                color: "var(--foreground-soft)",
                border: "1px solid var(--line-strong)",
              }}
            >
              {lang === "th" ? typeLabel.th : typeLabel.en}
            </span>

            {/* Paid */}
            {event.isPaid && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm"
                style={{
                  background: "rgba(240,185,95,0.18)",
                  color: "#f0b95f",
                  border: "1px solid rgba(240,185,95,0.32)",
                }}
              >
                {lang === "th" ? "มีค่าเข้าชม" : "Paid"}
              </span>
            )}

            {/* Ending soon */}
            {isEndingSoon && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm"
                style={{
                  background: "rgba(255,123,114,0.18)",
                  color: "var(--danger)",
                  border: "1px solid rgba(255,123,114,0.32)",
                }}
              >
                {lang === "th"
                  ? daysLeft === 0
                    ? "วันสุดท้าย"
                    : `${daysLeft} วันสุดท้าย`
                  : daysLeft === 0
                    ? "Last day"
                    : `${daysLeft}d left`}
              </span>
            )}
          </div>

          {/* Room divided badge — bottom right */}
          {isRoomDivided && (
            <div className="absolute bottom-3 right-3">
              <span
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm"
                style={{
                  background: "rgba(240,185,95,0.16)",
                  color: "#f0b95f",
                  border: "1px solid rgba(240,185,95,0.36)",
                }}
              >
                <span style={{ fontSize: "8px" }}>◈</span>
                {lang === "th" ? divLabel.th : divLabel.en}
              </span>
            </div>
          )}
        </div>

        {/* Card body */}
        <div className="flex flex-1 flex-col gap-3 p-4">
          {/* Venue + area */}
          <div className="flex items-center gap-1.5">
            <span
              className="text-xs font-medium"
              style={{ color: "var(--accent)" }}
            >
              {event.venueName}
            </span>
            <span style={{ color: "var(--line-strong)" }}>·</span>
            <span className="text-xs" style={{ color: "var(--muted-strong)" }}>
              {event.venueArea}
            </span>
          </div>

          {/* Title */}
          <h3
            className="text-base font-bold leading-snug transition-colors duration-200 group-hover:text-white"
            style={{ color: "var(--foreground)" }}
          >
            {title}
          </h3>

          {/* Date range */}
          <p
            className="text-[10px] uppercase tracking-widest"
            style={{ color: "var(--muted-strong)" }}
          >
            {formatDateRange(event.startDate, event.endDate, lang)}
          </p>

          {/* Divider */}
          <div className="h-px w-full" style={{ background: "var(--line)" }} />

          {/* Reactions section */}
          <div>
            {aggregate.totalReviews > 0 ? (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className="text-[9px] font-semibold uppercase tracking-widest"
                    style={{ color: "var(--muted-strong)" }}
                  >
                    {lang === "th" ? "ความรู้สึก" : "Reactions"}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[9px] font-semibold tabular-nums"
                    style={{
                      background: "var(--surface-soft)",
                      color: "var(--foreground-soft)",
                    }}
                  >
                    {aggregate.totalReviews}{" "}
                    {aggregate.totalReviews === 1
                      ? lang === "th"
                        ? "คน"
                        : "review"
                      : lang === "th"
                        ? "คน"
                        : "reviews"}
                  </span>
                </div>
                <ResponseSpectrum aggregate={aggregate} lang={lang} compact />
              </>
            ) : (
              <p
                className="text-[11px]"
                style={{ color: "var(--muted-strong)" }}
              >
                {lang === "th"
                  ? "ยังไม่มีรีวิว — เป็นคนแรก"
                  : "No reviews yet — be the first"}
              </p>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
