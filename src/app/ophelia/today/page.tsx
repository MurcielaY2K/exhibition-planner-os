"use client";

import Link from "next/link";
import { useOpheliaStore } from "@/lib/ophelia/store";
import { DailyQuestion } from "@/features/ophelia/components/daily-question";
import {
  StreakCard,
  StreakSignInPrompt,
} from "@/features/ophelia/components/streak-card";
import type { LangPref, OUser } from "@/lib/ophelia/types";
import type { TasteRelation } from "@/lib/ophelia/taste";

export default function TodayPage() {
  const lang = useOpheliaStore((s) => s.session.lang);
  const userId = useOpheliaStore((s) => s.session.userId);
  const getCurrentUser = useOpheliaStore((s) => s.getCurrentUser);
  const getTasteRelations = useOpheliaStore((s) => s.getTasteRelations);

  const currentUser = userId ? getCurrentUser() : undefined;
  const relations = userId ? getTasteRelations(userId) : { all: [] };
  const twin = relations.twin;
  const rival = relations.rival;
  const hasRelations = Boolean(twin);

  return (
    <div className="mx-auto max-w-2xl px-5 py-6">
      {/* Greeting */}
      <header className="mb-6">
        <p
          className="mb-1 text-[10px] font-semibold uppercase tracking-[0.26em]"
          style={{ color: "var(--accent)" }}
        >
          {lang === "th" ? "วันนี้" : "Today"}
        </p>
        <h1
          className="text-3xl font-black leading-none"
          style={{ color: "var(--foreground)", letterSpacing: "-0.03em" }}
        >
          {currentUser
            ? lang === "th"
              ? `สายตาของคุณ, ${currentUser.nameTH}`
              : `Your eye, ${currentUser.nameEN}`
            : lang === "th"
              ? "วันนี้บน OPHELIA"
              : "Today on OPHELIA"}
        </h1>
      </header>

      <div className="flex flex-col gap-5">
        {/* Streak / sign-in prompt */}
        {currentUser ? (
          <StreakCard userId={currentUser.id} />
        ) : (
          <StreakSignInPrompt lang={lang} />
        )}

        {/* Daily question — the hook, always shown */}
        <DailyQuestion />

        {/* Taste this week */}
        {currentUser && hasRelations && twin && (
          <section>
            <SectionHeader
              labelEN="Your taste this week"
              labelTH="รสนิยมของคุณสัปดาห์นี้"
            />
            <div className="flex flex-col gap-3">
              <TasteRelationCard
                relation={twin}
                kind="twin"
                lang={lang}
              />
              {rival && rival.user.id !== twin.user.id && (
                <TasteRelationCard
                  relation={rival}
                  kind="rival"
                  lang={lang}
                />
              )}
            </div>
          </section>
        )}

        {/* Logged in, but no taste graph yet */}
        {currentUser && !hasRelations && (
          <section
            className="rounded-2xl border px-5 py-6 text-center"
            style={{ background: "var(--surface)", borderColor: "var(--line)" }}
          >
            <p
              className="text-base font-bold leading-snug"
              style={{ color: "var(--foreground)" }}
            >
              {lang === "th"
                ? "ลงความเห็นสักสองสามครั้งเพื่อพบรสนิยมคู่แฝดของคุณ"
                : "Log a few takes to meet your taste twin"}
            </p>
            <Link
              href="/ophelia"
              className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 text-sm font-bold transition-transform active:scale-[0.97]"
              style={{ background: "var(--accent)", color: "#070707" }}
            >
              {lang === "th" ? "สำรวจงาน" : "Browse shows"}
              <span aria-hidden>→</span>
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}

function SectionHeader({
  labelEN,
  labelTH,
}: {
  labelEN: string;
  labelTH: string;
}) {
  const lang = useOpheliaStore((s) => s.session.lang);
  return (
    <div className="mb-3 flex items-center gap-3">
      <h2
        className="text-[10px] font-semibold uppercase tracking-[0.22em]"
        style={{ color: "var(--muted-strong)" }}
      >
        {lang === "th" ? labelTH : labelEN}
      </h2>
      <span
        aria-hidden
        className="h-px flex-1"
        style={{ background: "var(--line)" }}
      />
    </div>
  );
}

function TasteRelationCard({
  relation,
  kind,
  lang,
}: {
  relation: TasteRelation;
  kind: "twin" | "rival";
  lang: LangPref;
}) {
  const user: OUser = relation.user;
  const isTwin = kind === "twin";
  const accentColor = isTwin ? "var(--accent)" : "var(--danger)";

  const tagEN = isTwin ? "TASTE TWIN" : "TASTE RIVAL";
  const tagTH = isTwin ? "คู่แฝดรสนิยม" : "คู่ปรับรสนิยม";

  return (
    <Link
      href={`/ophelia/profile/${user.id}`}
      className="group flex items-center gap-4 rounded-2xl border px-4 py-4 transition-all duration-200 active:scale-[0.99]"
      style={{ background: "var(--surface)", borderColor: "var(--line)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--line-strong)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--line)";
      }}
    >
      {/* Avatar */}
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-black leading-none"
        style={{
          background: user.avatarColor,
          color: "#070707",
          outline: `2px solid ${accentColor}`,
          outlineOffset: "2px",
        }}
        aria-hidden
      >
        {user.handle.slice(0, 1).toUpperCase()}
      </span>

      {/* Body */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span
          className="text-[9px] font-bold uppercase tracking-[0.2em]"
          style={{ color: accentColor }}
        >
          {lang === "th" ? tagTH : tagEN}
        </span>
        <span
          className="truncate text-sm font-black"
          style={{ color: "var(--foreground)" }}
        >
          @{user.handle}
        </span>
        <span
          className="text-[11px] font-medium leading-snug"
          style={{ color: "var(--muted-strong)" }}
        >
          {isTwin ? (
            lang === "th" ? (
              <>
                <span
                  className="font-black tabular-nums"
                  style={{ color: "var(--foreground-soft)" }}
                >
                  {relation.matchPct}%
                </span>{" "}
                ตรงรสนิยม · {relation.sharedEvents} งานที่ดูร่วมกัน
              </>
            ) : (
              <>
                <span
                  className="font-black tabular-nums"
                  style={{ color: "var(--foreground-soft)" }}
                >
                  {relation.matchPct}%
                </span>{" "}
                taste match · {relation.sharedEvents}{" "}
                {relation.sharedEvents === 1 ? "shared show" : "shared shows"}
              </>
            )
          ) : lang === "th" ? (
            <>
              <span
                className="font-black tabular-nums"
                style={{ color: "var(--foreground-soft)" }}
              >
                {relation.matchPct}%
              </span>{" "}
              ตรงกัน — คุณสองคนไม่เคยเห็นพ้องกัน
            </>
          ) : (
            <>
              <span
                className="font-black tabular-nums"
                style={{ color: "var(--foreground-soft)" }}
              >
                {relation.matchPct}%
              </span>{" "}
              match — you two never agree
            </>
          )}
        </span>
      </div>

      <span
        aria-hidden
        className="shrink-0 text-base transition-transform duration-200 group-hover:translate-x-0.5"
        style={{ color: accentColor }}
      >
        →
      </span>
    </Link>
  );
}
