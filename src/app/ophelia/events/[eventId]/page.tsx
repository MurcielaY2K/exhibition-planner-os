"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useOpheliaStore } from "@/lib/ophelia/store";
import { ResponseSpectrum } from "@/features/ophelia/components/response-spectrum";
import { ReviewThread } from "@/features/ophelia/components/review-thread";
import type { LangPref } from "@/lib/ophelia/types";

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
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
  const locale = lang === "th" ? "th-TH" : "en-GB";
  return `${start.toLocaleDateString(locale, opts)} – ${end.toLocaleDateString(locale, opts)}`;
}

function daysLeft(endDate: string): number {
  const today = new Date("2026-06-01");
  const end = new Date(endDate);
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);

  const getEvent = useOpheliaStore((s) => s.getEvent);
  const getAggregate = useOpheliaStore((s) => s.getAggregate);
  const getEventReviews = useOpheliaStore((s) => s.getEventReviews);
  const session = useOpheliaStore((s) => s.session);

  const event = getEvent(eventId);
  const lang = session.lang;
  const [langOverride, setLangOverride] = useState<"en" | "th" | null>(null);
  const displayLang = langOverride ?? (lang === "both" ? "en" : lang);

  if (!event) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-5 text-center">
        <span
          aria-hidden
          className="text-[80px] leading-none"
          style={{ opacity: 0.2, color: "var(--accent-strong)" }}
        >
          ◎
        </span>
        <div>
          <p
            className="mb-2 text-xl font-black uppercase tracking-tight"
            style={{ color: "var(--foreground)" }}
          >
            Event not found
          </p>
          <p className="text-sm" style={{ color: "var(--muted-strong)" }}>
            This exhibition may have closed or moved.
          </p>
        </div>
        <Link
          href="/ophelia"
          className="rounded-full px-5 py-2 text-sm font-bold uppercase tracking-wider transition-opacity duration-150 hover:opacity-80"
          style={{ background: "var(--accent)", color: "#070707" }}
        >
          Back to feed
        </Link>
      </div>
    );
  }

  const aggregate = getAggregate(eventId);
  const reviews = getEventReviews(eventId);
  const typeLabel = EVENT_TYPE_LABELS[event.type] ?? { en: event.type, th: event.type };
  const days = daysLeft(event.endDate);
  const isEnded = days < 0;
  const isEndingSoon = days >= 0 && days <= 7;

  const title = displayLang === "th" ? event.titleTH : event.titleEN;
  const altTitle = displayLang === "th" ? event.titleEN : event.titleTH;
  const description = displayLang === "th" ? event.descriptionTH : event.descriptionEN;

  return (
    <div style={{ background: "var(--background)" }}>
      {/* ─── COVER IMAGE ─── */}
      <div className="relative w-full overflow-hidden" style={{ maxHeight: "400px" }}>
        <img
          src={event.coverImage}
          alt={title}
          className="h-full w-full object-cover"
          style={{ maxHeight: "400px", display: "block" }}
        />
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, transparent 40%, rgba(7,7,7,0.85) 100%)",
          }}
        />

        {/* Overlay badges */}
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest backdrop-blur-sm"
            style={{
              background: "rgba(7,7,7,0.75)",
              color: "var(--foreground-soft)",
              border: "1px solid var(--line-strong)",
            }}
          >
            {lang === "th" ? typeLabel.th : typeLabel.en}
          </span>
          {event.isPaid ? (
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest backdrop-blur-sm"
              style={{
                background: "rgba(240,185,95,0.18)",
                color: "#f0b95f",
                border: "1px solid rgba(240,185,95,0.36)",
              }}
            >
              {lang === "th" ? "มีค่าเข้าชม" : "Paid"}
            </span>
          ) : (
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest backdrop-blur-sm"
              style={{
                background: "rgba(52,211,153,0.14)",
                color: "#34d399",
                border: "1px solid rgba(52,211,153,0.28)",
              }}
            >
              {lang === "th" ? "เข้าฟรี" : "Free"}
            </span>
          )}
          {isEnded && (
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest backdrop-blur-sm"
              style={{
                background: "rgba(124,122,116,0.3)",
                color: "var(--muted-strong)",
                border: "1px solid var(--line-strong)",
              }}
            >
              {lang === "th" ? "จบแล้ว" : "Closed"}
            </span>
          )}
          {isEndingSoon && !isEnded && (
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm"
              style={{
                background: "rgba(255,123,114,0.18)",
                color: "var(--danger)",
                border: "1px solid rgba(255,123,114,0.32)",
              }}
            >
              {days === 0
                ? lang === "th" ? "วันสุดท้าย" : "Last day"
                : lang === "th" ? `${days} วันสุดท้าย` : `${days}d left`}
            </span>
          )}
        </div>

        {/* Back link */}
        <Link
          href="/ophelia"
          className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest backdrop-blur-sm transition-opacity duration-150 hover:opacity-80"
          style={{
            background: "rgba(7,7,7,0.7)",
            color: "var(--foreground-soft)",
            border: "1px solid var(--line-strong)",
            textDecoration: "none",
          }}
        >
          ← {lang === "th" ? "กลับ" : "Back"}
        </Link>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">

        {/* ─── EVENT HEADER ─── */}
        <div className="mb-10">
          {/* Lang toggle */}
          <div className="mb-4 flex items-center gap-2">
            <span
              className="text-[9px] font-semibold uppercase tracking-widest"
              style={{ color: "var(--muted-strong)" }}
            >
              {lang === "th" || lang === "both" ? "ภาษา" : "Lang"}
            </span>
            {(["en", "th"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLangOverride(l)}
                className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest transition-all duration-150"
                style={{
                  background:
                    displayLang === l
                      ? "var(--accent)"
                      : "var(--surface)",
                  color:
                    displayLang === l ? "#070707" : "var(--muted-strong)",
                  border:
                    displayLang === l
                      ? "1px solid var(--accent)"
                      : "1px solid var(--line)",
                }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Title */}
          <h1
            style={{
              fontWeight: 900,
              fontSize: "clamp(1.8rem, 5vw, 3rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "var(--foreground)",
            }}
          >
            {title}
          </h1>

          {/* Alt title (bilingual hint) */}
          {altTitle !== title && (
            <p
              className="mt-1 text-sm font-medium"
              style={{ color: "var(--muted-strong)" }}
            >
              {altTitle}
            </p>
          )}

          {/* Meta row */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--accent)" }}
            >
              {event.venueName}
            </span>
            <span style={{ color: "var(--line-strong)" }}>·</span>
            <span className="text-sm" style={{ color: "var(--muted-strong)" }}>
              {event.venueArea}
            </span>
            <span style={{ color: "var(--line-strong)" }}>·</span>
            <span
              className="text-[11px] uppercase tracking-widest"
              style={{ color: "var(--muted-strong)" }}
            >
              {formatDateRange(event.startDate, event.endDate, lang)}
            </span>
          </div>

          {/* Description */}
          <p
            className="mt-5 text-sm leading-relaxed sm:text-base"
            style={{ color: "var(--foreground-soft)", maxWidth: "65ch" }}
          >
            {description}
          </p>

          {/* Tags */}
          {event.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {event.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                  style={{
                    background: "var(--surface)",
                    color: "var(--foreground-soft)",
                    border: "1px solid var(--line)",
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ─── DIVIDER ─── */}
        <div className="mb-10 h-px w-full" style={{ background: "var(--line)" }} />

        {/* ─── RESPONSE SPECTRUM ─── */}
        <section className="mb-10">
          {/* Section kicker */}
          <div className="mb-5 flex items-center gap-3">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: "var(--muted-strong)" }}
            >
              {lang === "th" ? "สเปกตรัมความรู้สึก" : "Response Spectrum"}
            </p>
            <div
              className="flex-1"
              style={{ height: 1, background: "var(--line)" }}
            />
          </div>

          {aggregate.totalReviews === 0 ? (
            <div
              className="rounded-2xl p-8 text-center"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
              }}
            >
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--muted-strong)" }}
              >
                {lang === "th"
                  ? "ยังไม่มีข้อมูลความรู้สึก"
                  : "No response data yet"}
              </p>
              <p
                className="mt-1 text-xs"
                style={{ color: "var(--muted-strong)", opacity: 0.6 }}
              >
                {lang === "th"
                  ? "เป็นคนแรกที่บันทึกความรู้สึกของคุณ"
                  : "Be the first to log your take"}
              </p>
            </div>
          ) : (
            <div
              className="rounded-2xl p-5 sm:p-6"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
              }}
            >
              <ResponseSpectrum
                aggregate={aggregate}
                criticAxisRatings={event.criticAxisRatings}
                lang={lang}
              />
            </div>
          )}
        </section>

        {/* ─── WRITE YOUR TAKE CTA ─── */}
        <section className="mb-10">
          <div
            className="flex flex-col items-start gap-4 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between"
            style={{
              background:
                "linear-gradient(135deg, rgba(182,198,42,0.08) 0%, rgba(235,255,0,0.04) 100%)",
              border: "1px solid rgba(182,198,42,0.22)",
            }}
          >
            <div>
              <p
                className="text-base font-black uppercase tracking-tight"
                style={{ color: "var(--foreground)" }}
              >
                {lang === "th" ? "บันทึกสิ่งที่คุณรู้สึก" : "Write your take"}
              </p>
              <p
                className="mt-0.5 text-xs"
                style={{ color: "var(--muted-strong)" }}
              >
                {lang === "th"
                  ? "ความเห็นของคุณสำคัญกับ OPHELIA"
                  : "Your eye is valid — and it counts here"}
              </p>
            </div>
            <Link
              href={`/ophelia/events/${eventId}/review`}
              className="shrink-0 rounded-full px-5 py-2.5 text-sm font-black uppercase tracking-wider transition-all duration-150 hover:scale-[1.03] active:scale-95"
              style={{
                background: "var(--accent)",
                color: "#070707",
                textDecoration: "none",
              }}
            >
              {lang === "th" ? "เขียนรีวิว →" : "Add my take →"}
            </Link>
          </div>
        </section>

        {/* ─── DIVIDER ─── */}
        <div className="mb-10 h-px w-full" style={{ background: "var(--line)" }} />

        {/* ─── WRITTEN TAKES THREAD ─── */}
        <section>
          <div className="mb-5 flex items-center gap-3">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: "var(--muted-strong)" }}
            >
              {lang === "th" ? "บทวิจารณ์" : "Written takes"}
            </p>
            {reviews.length > 0 && (
              <span
                className="rounded-full px-2 py-0.5 text-[9px] font-bold tabular-nums"
                style={{
                  background: "var(--surface)",
                  color: "var(--accent)",
                  border: "1px solid var(--line)",
                }}
              >
                {reviews.length}
              </span>
            )}
            <div
              className="flex-1"
              style={{ height: 1, background: "var(--line)" }}
            />
          </div>

          <ReviewThread reviews={reviews} lang={lang} showLimit={5} />
        </section>
      </div>
    </div>
  );
}
