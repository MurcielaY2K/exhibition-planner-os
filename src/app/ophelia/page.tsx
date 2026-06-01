"use client";

import { useOpheliaStore } from "@/lib/ophelia/store";
import { EventCard } from "@/features/ophelia/components/event-card";
import { FilterBar } from "@/features/ophelia/components/filter-bar";

const HERO_EN = "YOUR EYE\nIS VALID.";
const HERO_TH = "สายตาคุณ\nมีคุณค่า.";

const MISSION_EN =
  "OPHELIA is where Bangkok's art crowd calls it as they see it. No gatekeeping. No credentials required. Just honest takes on exhibitions, installations, and cultural moments across the city.";
const MISSION_TH =
  "OPHELIA คือที่ที่คนดูศิลปะกรุงเทพฯ พูดความจริงในใจ ไม่มีการคัดกรอง ไม่ต้องมีคุณวุฒิ แค่ความเห็นตรงๆ ต่อนิทรรศการ อินสทอลเลชัน และวัฒนธรรมทั่วเมือง";

export default function OpheliaFeedPage() {
  const session = useOpheliaStore((s) => s.session);
  const getFilteredEvents = useOpheliaStore((s) => s.getFilteredEvents);
  const getAggregate = useOpheliaStore((s) => s.getAggregate);
  const events = useOpheliaStore((s) => s.events);
  const reviews = useOpheliaStore((s) => s.reviews);

  const filteredEvents = getFilteredEvents();
  const lang = session.lang;

  // Compute top-2 most divisive with at least 2 reviews
  const divisiveEvents = [...events]
    .map((e) => ({ event: e, agg: getAggregate(e.id) }))
    .filter(({ agg }) => agg.totalReviews >= 2)
    .sort((a, b) => b.agg.divisiveness - a.agg.divisiveness)
    .slice(0, 2);

  // Derive a short count label for divisive section
  const totalReviews = reviews.length;

  return (
    <div>
      {/* ─── HERO ─── */}
      <section
        className="relative overflow-hidden px-5 pb-16 pt-14 sm:px-8 sm:pt-20 md:px-12 md:pt-24"
        style={{
          borderBottom: "1px solid var(--line)",
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(182,198,42,0.07) 0%, transparent 65%)",
        }}
      >
        {/* Background texture marks */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-[-2%] top-6 select-none text-[clamp(280px,38vw,520px)] font-black leading-none opacity-[0.025]"
          style={{ color: "var(--accent-strong)", letterSpacing: "-0.06em" }}
        >
          ◉
        </div>

        <div className="relative mx-auto max-w-7xl">
          {/* Kicker */}
          <p
            className="mb-5 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.26em]"
            style={{ color: "var(--accent)" }}
          >
            <span
              aria-hidden
              style={{
                display: "inline-block",
                width: 18,
                height: 1,
                background: "var(--accent)",
                verticalAlign: "middle",
              }}
            />
            Bangkok Art Platform
            <span
              aria-hidden
              style={{
                display: "inline-block",
                width: 18,
                height: 1,
                background: "var(--accent)",
                verticalAlign: "middle",
              }}
            />
          </p>

          {/* Main headline */}
          <h1
            style={{
              fontFamily: "var(--font-satoshi, var(--font-sans))",
              fontWeight: 900,
              fontSize: "clamp(3.4rem, 11vw, 9.5rem)",
              lineHeight: 0.9,
              letterSpacing: "-0.03em",
              color: "var(--foreground)",
              whiteSpace: "pre-line",
              textTransform: "uppercase",
            }}
          >
            {lang === "th" ? (
              <>
                <span style={{ color: "var(--foreground)" }}>สายตาคุณ</span>
                <br />
                <span style={{ color: "var(--accent-strong)" }}>มีคุณค่า.</span>
              </>
            ) : (
              <>
                <span style={{ color: "var(--foreground)" }}>YOUR EYE</span>
                <br />
                <span style={{ color: "var(--accent-strong)" }}>IS VALID.</span>
              </>
            )}
          </h1>

          {/* Bilingual sub-deck */}
          <div className="mt-8 max-w-2xl">
            {lang === "both" ? (
              <div className="flex flex-col gap-2">
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--foreground-soft)" }}
                >
                  {MISSION_EN}
                </p>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--muted-strong)" }}
                >
                  {MISSION_TH}
                </p>
              </div>
            ) : (
              <p
                className="text-sm leading-relaxed sm:text-base"
                style={{ color: "var(--foreground-soft)" }}
              >
                {lang === "th" ? MISSION_TH : MISSION_EN}
              </p>
            )}
          </div>

          {/* Stats strip */}
          <div className="mt-10 flex flex-wrap gap-6">
            {[
              {
                value: events.length,
                labelEN: "events listed",
                labelTH: "งานที่ลงไว้",
              },
              {
                value: totalReviews,
                labelEN: "takes logged",
                labelTH: "ความเห็น",
              },
              {
                value: divisiveEvents.length,
                labelEN: "dividing rooms",
                labelTH: "งานที่ถกเถียง",
              },
            ].map(({ value, labelEN, labelTH }) => (
              <div key={labelEN} className="flex flex-col gap-0.5">
                <span
                  className="text-2xl font-black tabular-nums leading-none"
                  style={{ color: "var(--accent)" }}
                >
                  {value}
                </span>
                <span
                  className="text-[10px] uppercase tracking-widest"
                  style={{ color: "var(--muted-strong)" }}
                >
                  {lang === "th" ? labelTH : labelEN}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── DIVISIVE RIGHT NOW ─── */}
      {divisiveEvents.length > 0 && (
        <section
          className="px-5 py-10 sm:px-8 md:px-12"
          style={{ borderBottom: "1px solid var(--line)" }}
        >
          <div className="mx-auto max-w-7xl">
            {/* Section header */}
            <div className="mb-6 flex items-baseline gap-3">
              <h2
                className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: "var(--muted-strong)" }}
              >
                {lang === "th" ? "ถกเถียงที่สุดตอนนี้" : "Divisive right now"}
              </h2>
              <span
                aria-hidden
                className="flex-1"
                style={{
                  height: 1,
                  background: "var(--line)",
                  display: "inline-block",
                  verticalAlign: "middle",
                }}
              />
              <span
                className="flex items-center gap-1.5 text-[10px] font-semibold"
                style={{ color: "var(--warning)" }}
              >
                <span style={{ fontSize: "8px" }}>◈</span>
                {lang === "th" ? "ห้องแตกแยก" : "Room divided"}
              </span>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {divisiveEvents.map(({ event, agg }) => (
                <EventCard
                  key={event.id}
                  event={event}
                  aggregate={agg}
                  lang={lang}
                  href={`/ophelia/events/${event.id}`}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── FEED ─── */}
      <section className="px-5 py-10 sm:px-8 md:px-12">
        <div className="mx-auto max-w-7xl">
          {/* Filter bar */}
          <div className="mb-8">
            <FilterBar />
          </div>

          {/* Grid or empty state */}
          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-24 text-center">
              <span
                className="text-5xl"
                aria-hidden
                style={{ opacity: 0.3 }}
              >
                ◎
              </span>
              <p
                className="text-base font-bold"
                style={{ color: "var(--foreground-soft)" }}
              >
                {lang === "th"
                  ? "ไม่พบงานที่ตรงกับเงื่อนไข"
                  : "Nothing matches your filter"}
              </p>
              <p
                className="max-w-xs text-sm"
                style={{ color: "var(--muted-strong)" }}
              >
                {lang === "th"
                  ? "ลองเปลี่ยนตัวกรองหรือค้นหาด้วยคำอื่น"
                  : "Try adjusting your filters or searching for something else."}
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  aggregate={getAggregate(event.id)}
                  lang={lang}
                  href={`/ophelia/events/${event.id}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
