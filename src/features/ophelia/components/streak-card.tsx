"use client";

import Link from "next/link";
import { useOpheliaStore } from "@/lib/ophelia/store";
import type { LangPref } from "@/lib/ophelia/types";

interface StreakCardProps {
  userId: string;
}

export function StreakCard({ userId }: StreakCardProps) {
  const lang = useOpheliaStore((s) => s.session.lang);
  const getStreak = useOpheliaStore((s) => s.getStreak);
  const getReviewsThisWeek = useOpheliaStore((s) => s.getReviewsThisWeek);

  const streak = getStreak();
  const reviewsThisWeek = getReviewsThisWeek(userId);
  const filledDots = Math.min(reviewsThisWeek, 7);
  const hasStreak = streak > 0;

  return (
    <section
      className="overflow-hidden rounded-2xl border"
      style={{ background: "var(--surface)", borderColor: "var(--line)" }}
    >
      <div className="flex items-stretch gap-4 p-5">
        {/* Streak glyph + number */}
        <div className="flex shrink-0 flex-col items-center justify-center">
          <span
            aria-hidden
            className="text-lg leading-none"
            style={{ color: "var(--accent)" }}
          >
            ✦
          </span>
          <span
            className="text-5xl font-black tabular-nums leading-none"
            style={{
              color: hasStreak ? "var(--accent-strong)" : "var(--muted-strong)",
              letterSpacing: "-0.03em",
            }}
          >
            {streak}
          </span>
        </div>

        {/* Copy block */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
          {hasStreak ? (
            <>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.18em]"
                style={{ color: "var(--foreground-soft)" }}
              >
                {lang === "th" ? "วันต่อเนื่อง" : "day cultural streak"}
              </p>
              <p
                className="text-sm font-semibold leading-snug"
                style={{ color: "var(--foreground)" }}
              >
                {lang === "th"
                  ? "ยอดเยี่ยม — คุณกำลังสะสมสายตาทางวัฒนธรรม"
                  : "Nicely done — you're building your cultural eye."}
              </p>
            </>
          ) : (
            <>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.18em]"
                style={{ color: "var(--muted-strong)" }}
              >
                {lang === "th" ? "วันต่อเนื่อง" : "day cultural streak"}
              </p>
              <p
                className="text-sm font-bold leading-snug"
                style={{ color: "var(--foreground)" }}
              >
                {lang === "th"
                  ? "เริ่มสตรีคของคุณวันนี้"
                  : "Start your streak — log a take today"}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Week tracker */}
      <div
        className="flex items-center justify-between gap-3 border-t px-5 py-3.5"
        style={{ borderColor: "var(--line)" }}
      >
        <span
          className="text-xs font-semibold tabular-nums"
          style={{ color: "var(--foreground-soft)" }}
        >
          {lang === "th" ? (
            <>
              <span
                className="font-black"
                style={{ color: "var(--accent)" }}
              >
                {reviewsThisWeek}
              </span>{" "}
              ความเห็นสัปดาห์นี้
            </>
          ) : (
            <>
              <span
                className="font-black"
                style={{ color: "var(--accent)" }}
              >
                {reviewsThisWeek}
              </span>{" "}
              {reviewsThisWeek === 1 ? "review" : "reviews"} this week
            </>
          )}
        </span>

        <div
          className="flex items-center gap-1.5"
          aria-label={
            lang === "th"
              ? `${filledDots} จาก 7 วันที่ใช้งาน`
              : `${filledDots} of 7 active days`
          }
        >
          {Array.from({ length: 7 }).map((_, i) => {
            const filled = i < filledDots;
            return (
              <span
                key={i}
                aria-hidden
                className="h-2 w-2 rounded-full transition-colors"
                style={{
                  background: filled ? "var(--accent)" : "var(--surface-soft)",
                  boxShadow: filled ? "0 0 6px rgba(182,198,42,0.45)" : "none",
                  border: filled ? "none" : "1px solid var(--line-strong)",
                }}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Reserved for callers needing a logged-out variant linking to onboarding.
export function StreakSignInPrompt({ lang }: { lang: LangPref }) {
  return (
    <Link
      href="/ophelia/onboarding"
      className="flex items-center justify-between gap-3 rounded-2xl border px-5 py-4 transition-colors"
      style={{ background: "var(--surface)", borderColor: "var(--line)" }}
    >
      <span
        className="text-sm font-bold"
        style={{ color: "var(--foreground)" }}
      >
        {lang === "th"
          ? "เข้าสู่ระบบเพื่อเริ่มสตรีคของคุณ"
          : "Sign in to start your cultural streak"}
      </span>
      <span aria-hidden style={{ color: "var(--accent)" }}>
        →
      </span>
    </Link>
  );
}
