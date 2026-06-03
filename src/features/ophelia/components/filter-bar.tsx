"use client";

import { useOpheliaStore } from "@/lib/ophelia/store";
import type { FeedFilter } from "@/lib/ophelia/types";

interface FilterOption {
  value: FeedFilter;
  en: string;
  th: string;
}

const FILTERS: FilterOption[] = [
  { value: "all", en: "All", th: "ทั้งหมด" },
  { value: "divisive", en: "Divisive right now", th: "ถกเถียงสุด" },
  { value: "recommended", en: "Recommended", th: "แนะนำ" },
  { value: "ending-soon", en: "Ending soon", th: "ใกล้ปิด" },
  { value: "free", en: "Free entry", th: "เข้าฟรี" },
];

export function FilterBar() {
  const feedFilter = useOpheliaStore((s) => s.feedFilter);
  const searchQuery = useOpheliaStore((s) => s.searchQuery);
  const setFeedFilter = useOpheliaStore((s) => s.setFeedFilter);
  const setSearchQuery = useOpheliaStore((s) => s.setSearchQuery);
  const lang = useOpheliaStore((s) => s.session.lang);

  return (
    <div id="ophelia-filter-bar" className="w-full">
      {/* Search input — full width on mobile, max-width on desktop */}
      <div className="relative mb-3">
        <span
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
          style={{ color: "var(--muted-strong)" }}
          aria-hidden
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <circle cx="6.5" cy="6.5" r="5" />
            <line x1="10.8" y1="10.8" x2="14" y2="14" />
          </svg>
        </span>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={lang === "th" ? "ค้นหาชื่องาน สถานที่…" : "Search exhibitions, venues, areas…"}
          className="w-full rounded-2xl pl-10 pr-10 outline-none transition-all duration-200 sm:max-w-sm"
          style={{
            background: "var(--surface-soft)",
            color: "var(--foreground)",
            border: "1px solid var(--line)",
            fontFamily: "inherit",
            fontSize: "14px",
            height: "44px",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--line-strong)"; e.currentTarget.style.background = "var(--surface-muted)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.background = "var(--surface-soft)"; }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full transition-colors duration-150 active:opacity-60"
            style={{ color: "var(--muted-strong)", background: "var(--surface-muted)" }}
            aria-label="Clear search"
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="2" x2="10" y2="10" /><line x1="10" y1="2" x2="2" y2="10" />
            </svg>
          </button>
        )}
      </div>

      {/* Filter pills — horizontally scrollable, 44px touch targets */}
      <div
        className="scrollbar-subtle flex gap-2 overflow-x-auto"
        style={{ WebkitOverflowScrolling: "touch", paddingBottom: "2px" }}
      >
        {FILTERS.map((filter) => {
          const isActive = feedFilter === filter.value;
          const label = lang === "th" ? filter.th : filter.en;
          return (
            <button
              key={filter.value}
              onClick={() => setFeedFilter(filter.value)}
              className="shrink-0 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] active:scale-[0.94]"
              style={{
                height: "44px",
                paddingLeft: "16px",
                paddingRight: "16px",
                background: isActive ? "var(--accent)" : "var(--surface-soft)",
                color: isActive ? "#070707" : "var(--foreground-soft)",
                border: isActive ? "1px solid var(--accent)" : "1px solid var(--line)",
                letterSpacing: "0.06em",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Active filter label — subtle editorial subheading */}
      {feedFilter !== "all" && (
        <p
          className="mt-3 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--muted-strong)" }}
        >
          {lang === "th"
            ? `กรอง: ${FILTERS.find((f) => f.value === feedFilter)?.th ?? ""}`
            : `Filtered: ${FILTERS.find((f) => f.value === feedFilter)?.en ?? ""}`}
        </p>
      )}
    </div>
  );
}
