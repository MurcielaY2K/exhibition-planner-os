"use client";

import Link from "next/link";
import { useOpheliaStore, OPHELIA_TODAY } from "@/lib/ophelia/store";
import { getQuestionForDate } from "@/lib/ophelia/daily";
import type { DailyQuestionOption } from "@/lib/ophelia/daily";
import type { LangPref } from "@/lib/ophelia/types";

const KICKER_EN = "TODAY'S CULTURAL QUESTION";
const KICKER_TH = "คำถามวัฒนธรรมวันนี้";

function formatToday(date: string, lang: LangPref): string {
  const d = new Date(`${date}T00:00:00Z`);
  const locale = lang === "th" ? "th-TH" : "en-GB";
  return d.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

export function DailyQuestion() {
  const lang = useOpheliaStore((s) => s.session.lang);
  const dailyAnswers = useOpheliaStore((s) => s.dailyAnswers);
  const answerDailyQuestion = useOpheliaStore((s) => s.answerDailyQuestion);

  const question = getQuestionForDate(OPHELIA_TODAY);
  const chosenId = dailyAnswers[question.id];
  const answered = Boolean(chosenId);

  const prompt = lang === "th" ? question.promptTH : question.promptEN;

  const seedTotal = Object.values(question.seedVotes).reduce(
    (sum, n) => sum + n,
    0,
  );
  // The user's own vote is added to their chosen option once answered.
  const totalVotes = seedTotal + (answered ? 1 : 0);

  return (
    <section
      className="overflow-hidden rounded-2xl border"
      style={{ background: "var(--surface)", borderColor: "var(--line)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between gap-3 px-5 pt-5"
        style={{ paddingBottom: answered ? 0 : undefined }}
      >
        <div className="flex flex-col gap-1">
          <span
            className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em]"
            style={{ color: "var(--accent)" }}
          >
            <span
              aria-hidden
              style={{
                display: "inline-block",
                width: 14,
                height: 1,
                background: "var(--accent)",
              }}
            />
            {lang === "th" ? KICKER_TH : KICKER_EN}
          </span>
          <span
            className="text-[11px] font-medium tracking-wide"
            style={{ color: "var(--muted-strong)" }}
          >
            {formatToday(OPHELIA_TODAY, lang)}
          </span>
        </div>
      </div>

      {/* Prompt */}
      <h2
        className="px-5 pt-3 text-2xl font-black leading-tight"
        style={{ color: "var(--foreground)", letterSpacing: "-0.02em" }}
      >
        {prompt}
      </h2>

      <div className="px-5 pb-5 pt-4">
        {answered ? (
          <ResultsView
            question={question}
            chosenId={chosenId}
            totalVotes={totalVotes}
            lang={lang}
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {question.options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => answerDailyQuestion(question.id, option.id)}
                className="group flex min-h-[52px] w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200 active:scale-[0.99]"
                style={{
                  background: "var(--surface-soft)",
                  borderColor: "var(--line)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--line-strong)";
                  e.currentTarget.style.background = "var(--surface-muted)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--line)";
                  e.currentTarget.style.background = "var(--surface-soft)";
                }}
              >
                <span
                  className="text-[15px] font-bold leading-snug"
                  style={{ color: "var(--foreground)" }}
                >
                  {lang === "th" ? option.labelTH : option.labelEN}
                </span>
                <span
                  aria-hidden
                  className="shrink-0 text-base transition-transform duration-200 group-hover:translate-x-0.5"
                  style={{ color: "var(--accent)" }}
                >
                  →
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ResultsView({
  question,
  chosenId,
  totalVotes,
  lang,
}: {
  question: ReturnType<typeof getQuestionForDate>;
  chosenId: string;
  totalVotes: number;
  lang: LangPref;
}) {
  // Sort options by vote count descending for a clean results read.
  const ranked = [...question.options].sort((a, b) => {
    const va = (question.seedVotes[a.id] ?? 0) + (a.id === chosenId ? 1 : 0);
    const vb = (question.seedVotes[b.id] ?? 0) + (b.id === chosenId ? 1 : 0);
    return vb - va;
  });

  return (
    <div className="flex flex-col gap-3">
      {ranked.map((option) => {
        const votes =
          (question.seedVotes[option.id] ?? 0) +
          (option.id === chosenId ? 1 : 0);
        const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
        const isMine = option.id === chosenId;
        return (
          <ResultRow
            key={option.id}
            option={option}
            votes={votes}
            pct={pct}
            isMine={isMine}
            lang={lang}
          />
        );
      })}

      <p
        className="pt-1 text-[11px] font-medium tracking-wide"
        style={{ color: "var(--muted-strong)" }}
      >
        {lang === "th"
          ? `${totalVotes.toLocaleString()} เสียงทั้งหมด · คุณตอบแล้ว`
          : `${totalVotes.toLocaleString()} votes · you answered`}
      </p>
    </div>
  );
}

function ResultRow({
  option,
  votes,
  pct,
  isMine,
  lang,
}: {
  option: DailyQuestionOption;
  votes: number;
  pct: number;
  isMine: boolean;
  lang: LangPref;
}) {
  const label = lang === "th" ? option.labelTH : option.labelEN;

  return (
    <div
      className="relative overflow-hidden rounded-xl border px-3.5 py-2.5"
      style={{
        background: "var(--surface-soft)",
        borderColor: isMine ? "var(--accent)" : "var(--line)",
        boxShadow: isMine ? "inset 0 0 0 1px var(--accent)" : "none",
      }}
    >
      {/* Bar fill */}
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 transition-[width] duration-700 ease-out"
        style={{
          width: `${pct}%`,
          background: isMine
            ? "rgba(182,198,42,0.20)"
            : "rgba(255,255,255,0.05)",
        }}
      />

      <div className="relative flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            {option.eventId ? (
              <Link
                href={`/ophelia/events/${option.eventId}`}
                className="truncate text-[14px] font-bold leading-snug underline-offset-2 hover:underline"
                style={{ color: "var(--foreground)" }}
              >
                {label}
              </Link>
            ) : (
              <span
                className="truncate text-[14px] font-bold leading-snug"
                style={{ color: "var(--foreground)" }}
              >
                {label}
              </span>
            )}
            {isMine && (
              <span
                className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                style={{
                  background: "var(--accent)",
                  color: "#070707",
                }}
              >
                {lang === "th" ? "คุณเลือก" : "your pick"}
              </span>
            )}
          </div>
          <span
            className="text-[10px] font-medium tabular-nums tracking-wide"
            style={{ color: "var(--muted-strong)" }}
          >
            {votes.toLocaleString()}{" "}
            {lang === "th" ? "เสียง" : votes === 1 ? "vote" : "votes"}
          </span>
        </div>

        <span
          className="shrink-0 text-sm font-black tabular-nums"
          style={{ color: isMine ? "var(--accent-strong)" : "var(--foreground-soft)" }}
        >
          {pct}%
        </span>
      </div>
    </div>
  );
}
