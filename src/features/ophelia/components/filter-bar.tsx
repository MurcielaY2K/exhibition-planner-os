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
    <div className="w-full">
      {/* Mobile: search above, pills below. Desktop: pills left, search right in a single row. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        {/* Filter pills — scrollable strip */}
        <div
          className="scrollbar-subtle flex shrink-0 gap-2 overflow-x-auto pb-0.5 sm:pb-0"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {FILTERS.map((filter) => {
            const isActive = feedFilter === filter.value;
            const label = lang === "th" ? filter.th : filter.en;
            return (
              <button
                key={filter.value}
                onClick={() => setFeedFilter(filter.value)}
                className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] active:scale-[0.96]"
                style={{
                  background: isActive
                    ? "var(--accent)"
                    : "var(--surface-soft)",
                  color: isActive ? "#070707" : "var(--foreground-soft)",
                  border: isActive
                    ? "1px solid var(--accent)"
                    : "1px solid var(--line)",
                  letterSpacing: "0.06em",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          {/* Search icon */}
          <span
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--muted-strong)" }}
            aria-hidden
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="6.5" cy="6.5" r="5" />
              <line x1="10.8" y1="10.8" x2="14" y2="14" />
            </svg>
          </span>

          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              lang === "th"
                ? "ค้นหาชื่องาน สถานที่…"
                : "Search by title, venue…"
            }
            className="w-full rounded-full pl-8 pr-4 py-1.5 text-xs outline-none transition-all duration-200"
            style={{
              background: "var(--surface-soft)",
              color: "var(--foreground)",
              border: "1px solid var(--line)",
              fontFamily: "inherit",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--line-strong)";
              e.currentTarget.style.background = "var(--surface-muted)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--line)";
              e.currentTarget.style.background = "var(--surface-soft)";
            }}
          />

          {/* Clear button */}
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 transition-colors duration-150"
              style={{ color: "var(--muted-strong)" }}
              aria-label="Clear search"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="3" y1="3" x2="13" y2="13" />
                <line x1="13" y1="3" x2="3" y2="13" />
              </svg>
            </button>
          )}
        </div>
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
