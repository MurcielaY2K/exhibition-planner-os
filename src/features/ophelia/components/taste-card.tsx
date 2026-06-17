"use client";

import { useState } from "react";
import { useOpheliaStore } from "@/lib/ophelia/store";
import { AXIS_LABELS, ALL_AXES } from "@/lib/ophelia/types";
import type { AxisKey, LangPref, OUser } from "@/lib/ophelia/types";

const AXIS_COLORS: Record<AxisKey, string> = {
  moved: "#7ec5d6",
  confused: "#f0b95f",
  wantToOwn: "#b6c62a",
  changedMyMind: "#a78bfa",
  cantStopThinking: "#ff7b72",
  overhyped: "#7c7a74",
  underrated: "#34d399",
};

/** Punchy identity phrase per dominant axis — the viral hook. */
const AXIS_IDENTITY: Record<AxisKey, { en: string; th: string }> = {
  moved: { en: "The Romantic", th: "สายซึ้ง" },
  confused: { en: "The Seeker", th: "สายค้นหา" },
  wantToOwn: { en: "The Collector", th: "สายสะสม" },
  changedMyMind: { en: "The Open Mind", th: "สายเปิดใจ" },
  cantStopThinking: { en: "The Haunted", th: "สายติดตรึง" },
  overhyped: { en: "The Skeptic", th: "สายขี้สงสัย" },
  underrated: { en: "The Champion", th: "สายเชียร์ของดี" },
};

interface TasteCardProps {
  userId: string;
}

export function TasteCard({ userId }: TasteCardProps) {
  const lang = useOpheliaStore((s) => s.session.lang);
  const getTasteVector = useOpheliaStore((s) => s.getTasteVector);
  const getUser = useOpheliaStore((s) => s.getUser);
  const [copied, setCopied] = useState(false);

  const user = getUser(userId);
  const vector = getTasteVector(userId);

  const total = (ALL_AXES as AxisKey[]).reduce((sum, k) => sum + vector[k], 0);

  if (!user || total === 0) {
    return <EmptyTasteCard lang={lang} hasUser={Boolean(user)} />;
  }

  const ranked = (ALL_AXES as AxisKey[])
    .map((k) => ({ key: k, count: vector[k] }))
    .sort((a, b) => b.count - a.count);

  const top = ranked[0];
  const topThree = ranked.filter((a) => a.count > 0).slice(0, 3);
  const maxCount = topThree[0]?.count ?? 1;

  const identity = AXIS_IDENTITY[top.key];
  const topColor = AXIS_COLORS[top.key];
  const name = lang === "th" ? user.nameTH : user.nameEN;

  const shareText = buildShareText(user, identity, lang);
  const shareTitle =
    lang === "th"
      ? `การ์ดรสนิยม OPHELIA ของ @${user.handle}`
      : `@${user.handle}'s OPHELIA Taste Card`;

  async function onShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText });
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch {
        // clipboard blocked — nothing more we can do gracefully
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* The card — designed to screenshot beautifully */}
      <div
        className="relative flex flex-col overflow-hidden rounded-[1.75rem] border p-6"
        style={{
          aspectRatio: "3/4",
          borderColor: "var(--line-strong)",
          background: `radial-gradient(120% 90% at 100% 0%, ${hexAlpha(
            topColor,
            0.22,
          )} 0%, transparent 55%), linear-gradient(160deg, var(--surface-raised, #0d0d0d) 0%, var(--background) 100%)`,
        }}
      >
        {/* Glow accent blob */}
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl"
          style={{ background: hexAlpha(topColor, 0.28) }}
          aria-hidden
        />

        {/* Header */}
        <div className="relative flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <span
              className="text-[10px] font-bold uppercase tracking-[0.3em]"
              style={{ color: "var(--accent-strong)" }}
            >
              OPHELIA
            </span>
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: "var(--muted-strong)" }}
            >
              {lang === "th" ? "การ์ดรสนิยม" : "Taste Card"}
            </span>
          </div>
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-black leading-none"
            style={{
              background: user.avatarColor,
              color: "#070707",
              outline: `2px solid ${topColor}`,
              outlineOffset: "2px",
            }}
            aria-hidden
          >
            {user.handle.slice(0, 1).toUpperCase()}
          </span>
        </div>

        {/* Handle + name */}
        <div className="relative mt-5 flex flex-col gap-0.5">
          <span
            className="text-base font-black"
            style={{ color: "var(--foreground)" }}
          >
            @{user.handle}
          </span>
          <span
            className="text-[12px] font-medium"
            style={{ color: "var(--muted-strong)" }}
          >
            {name}
          </span>
        </div>

        {/* Identity hook — the huge headline */}
        <div className="relative mt-auto">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.24em]"
            style={{ color: "var(--foreground-soft)" }}
          >
            {lang === "th" ? "คุณคือ" : "You are"}
          </p>
          <h2
            className="mt-1 font-black leading-[0.9]"
            style={{
              fontSize: "clamp(2.4rem, 11vw, 3.4rem)",
              color: topColor,
              letterSpacing: "-0.04em",
            }}
          >
            {lang === "th" ? identity.th : identity.en}
          </h2>
          <p
            className="mt-2 text-[12px] font-semibold"
            style={{ color: "var(--foreground-soft)" }}
          >
            {lang === "th"
              ? `เพราะ "${AXIS_LABELS[top.key].th}" คือหัวใจของสายตาคุณ`
              : `Because "${AXIS_LABELS[top.key].en}" defines your eye`}
          </p>
        </div>

        {/* Top 3 axes mini bars */}
        <div className="relative mt-5 flex flex-col gap-2.5">
          {topThree.map((axis) => {
            const color = AXIS_COLORS[axis.key];
            const meta = AXIS_LABELS[axis.key];
            const width = Math.max(8, Math.round((axis.count / maxCount) * 100));
            return (
              <div key={axis.key} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span
                    className="text-[11px] font-bold"
                    style={{ color: "var(--foreground-soft)" }}
                  >
                    {lang === "th" ? meta.th : meta.en}
                  </span>
                  <span
                    className="text-[11px] font-black tabular-nums"
                    style={{ color }}
                  >
                    {axis.count}
                  </span>
                </div>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full"
                  style={{ background: "var(--surface-soft)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${width}%`, background: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats row */}
        <div
          className="relative mt-5 flex items-center gap-5 border-t pt-4"
          style={{ borderColor: "var(--line)" }}
        >
          <Stat
            label={lang === "th" ? "อายสกอร์" : "Eye score"}
            value={user.eyeScore.toLocaleString()}
          />
          <span
            className="h-7 w-px"
            style={{ background: "var(--line)" }}
            aria-hidden
          />
          <Stat
            label={lang === "th" ? "ความเห็น" : "Takes"}
            value={user.reviewCount.toLocaleString()}
          />
        </div>

        {/* Footer */}
        <div
          className="relative mt-4 flex items-center justify-between border-t pt-3"
          style={{ borderColor: "var(--line)" }}
        >
          <span
            className="text-[12px] font-black italic"
            style={{ color: "var(--accent-strong)" }}
          >
            {lang === "th" ? "สายตาคุณมีค่า" : "Your eye is valid."}
          </span>
          <span
            className="text-[10px] font-semibold tracking-wide"
            style={{ color: "var(--muted-strong)" }}
          >
            ophelia.app/@{user.handle}
          </span>
        </div>
      </div>

      {/* Share button */}
      <button
        type="button"
        onClick={onShare}
        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full text-sm font-black transition-transform active:scale-[0.98]"
        style={{ background: "var(--accent)", color: "#070707" }}
      >
        {copied ? (
          <>
            <span aria-hidden>✓</span>
            {lang === "th" ? "คัดลอกแล้ว!" : "Copied!"}
          </>
        ) : (
          <>
            <span aria-hidden>↗</span>
            {lang === "th" ? "แชร์การ์ดรสนิยม" : "Share your Taste Card"}
          </>
        )}
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className="text-lg font-black leading-none tabular-nums"
        style={{ color: "var(--foreground)" }}
      >
        {value}
      </span>
      <span
        className="text-[9px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: "var(--muted-strong)" }}
      >
        {label}
      </span>
    </div>
  );
}

function EmptyTasteCard({
  lang,
  hasUser,
}: {
  lang: LangPref;
  hasUser: boolean;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 rounded-[1.75rem] border px-6 py-14 text-center"
      style={{
        aspectRatio: "3/4",
        background:
          "linear-gradient(160deg, var(--surface) 0%, var(--background) 100%)",
        borderColor: "var(--line)",
      }}
    >
      <span
        className="text-[10px] font-bold uppercase tracking-[0.3em]"
        style={{ color: "var(--accent-strong)" }}
      >
        {lang === "th" ? "การ์ดรสนิยม OPHELIA" : "OPHELIA Taste Card"}
      </span>
      <p
        className="text-xl font-black leading-tight"
        style={{ color: "var(--foreground)" }}
      >
        {hasUser
          ? lang === "th"
            ? "ลงความเห็นเพื่อสร้างการ์ดรสนิยมของคุณ"
            : "Log takes to generate your taste card"
          : lang === "th"
            ? "ไม่พบผู้ใช้"
            : "User not found"}
      </p>
      {hasUser && (
        <p
          className="text-[13px] leading-snug"
          style={{ color: "var(--muted-strong)" }}
        >
          {lang === "th"
            ? "ยิ่งคุณตอบสนองต่องานศิลปะมากเท่าไหร่ สายตาของคุณก็จะยิ่งชัดขึ้น"
            : "The more you react to art, the sharper your eye becomes."}
        </p>
      )}
    </div>
  );
}

function buildShareText(
  user: OUser,
  identity: { en: string; th: string },
  lang: LangPref,
): string {
  if (lang === "th") {
    return `ผมเป็น "${identity.th}" บน OPHELIA 👁️ สายตาคุณมีค่า — ดูการ์ดรสนิยมของผมที่ ophelia.app/@${user.handle}`;
  }
  return `I'm "${identity.en}" on OPHELIA 👁️ Your eye is valid — see my Taste Card at ophelia.app/@${user.handle}`;
}

/** Build an rgba() string from a #hex color and an alpha. */
function hexAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
