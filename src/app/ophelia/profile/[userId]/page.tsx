"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useOpheliaStore } from "@/lib/ophelia/store";
import { EyeScoreBadge } from "@/features/ophelia/components/eye-score-badge";
import { TasteCard } from "@/features/ophelia/components/taste-card";
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

const EVENT_TYPE_LABELS: Record<string, { en: string; th: string }> = {
  exhibition: { en: "Exhibition", th: "นิทรรศการ" },
  installation: { en: "Installation", th: "อินสทอลเลชัน" },
  festival: { en: "Festival", th: "เทศกาล" },
  performance: { en: "Performance", th: "การแสดง" },
  venue: { en: "Venue", th: "สถานที่" },
};

function UserList({
  users,
  lang,
  currentUserId,
  isFollowing,
  followUser,
  unfollowUser,
  emptyEN,
  emptyTH,
}: {
  users: OUser[];
  lang: LangPref;
  currentUserId: string | null;
  isFollowing: (from: string, to: string) => boolean;
  followUser: (from: string, to: string) => void;
  unfollowUser: (from: string, to: string) => void;
  emptyEN: string;
  emptyTH: string;
}) {
  if (users.length === 0) {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
      >
        <p className="text-sm" style={{ color: "var(--muted-strong)" }}>
          {lang === "th" ? emptyTH : emptyEN}
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {users.map((u) => {
        const name = lang === "th" ? u.nameTH : u.nameEN;
        const following = currentUserId ? isFollowing(currentUserId, u.id) : false;
        const canAct = !!currentUserId && currentUserId !== u.id;
        return (
          <div
            key={u.id}
            className="flex items-center gap-3 rounded-xl p-3"
            style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
          >
            <Link
              href={`/ophelia/profile/${u.id}`}
              className="flex flex-1 items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              style={{ textDecoration: "none", minWidth: 0 }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black"
                style={{ background: u.avatarColor, color: "#070707" }}
                aria-hidden
              >
                {u.handle.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold" style={{ color: "var(--foreground)" }}>
                  {name}
                </p>
                <p className="text-[10px] font-semibold" style={{ color: "var(--muted-strong)" }}>
                  @{u.handle}
                </p>
              </div>
            </Link>
            {canAct && (
              <button
                type="button"
                onClick={() =>
                  following
                    ? unfollowUser(currentUserId!, u.id)
                    : followUser(currentUserId!, u.id)
                }
                className="shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-150 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                style={{
                  minHeight: "36px",
                  background: following ? "var(--surface-soft)" : "var(--accent)",
                  color: following ? "var(--foreground-soft)" : "#070707",
                  border: following ? "1px solid var(--line)" : "none",
                  whiteSpace: "nowrap",
                }}
              >
                {following
                  ? lang === "th" ? "ติดตามอยู่" : "Following"
                  : lang === "th" ? "ติดตาม" : "Follow"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function getAxisLabel(key: AxisKey, lang: LangPref): string {
  const labels = AXIS_LABELS[key];
  if (lang === "th") return labels.th;
  if (lang === "both") return `${labels.en} · ${labels.th}`;
  return labels.en;
}

function relativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function ProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);

  const getUser = useOpheliaStore((s) => s.getUser);
  const getEvent = useOpheliaStore((s) => s.getEvent);
  const session = useOpheliaStore((s) => s.session);
  const reviews = useOpheliaStore((s) => s.reviews);
  const followUser = useOpheliaStore((s) => s.followUser);
  const unfollowUser = useOpheliaStore((s) => s.unfollowUser);
  const isFollowing = useOpheliaStore((s) => s.isFollowing);
  const getFollowers = useOpheliaStore((s) => s.getFollowers);
  const getFollowing = useOpheliaStore((s) => s.getFollowing);

  const [socialView, setSocialView] = useState<"followers" | "following" | null>(null);

  const user = getUser(userId);
  const lang = session.lang;

  if (!user) {
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
            {lang === "th" ? "ไม่พบผู้ใช้" : "User not found"}
          </p>
          <p className="text-sm" style={{ color: "var(--muted-strong)" }}>
            {lang === "th"
              ? "บัญชีนี้อาจถูกลบหรือไม่มีอยู่"
              : "This account doesn't exist or has been removed."}
          </p>
        </div>
        <Link
          href="/ophelia"
          className="rounded-full px-5 py-2 text-sm font-bold uppercase tracking-wider transition-opacity duration-150 hover:opacity-80"
          style={{ background: "var(--accent)", color: "#070707", textDecoration: "none" }}
        >
          {lang === "th" ? "กลับหน้าหลัก" : "Back to feed"}
        </Link>
      </div>
    );
  }

  // User's reviews, most recent first
  const userReviews = reviews
    .filter((r) => r.userId === userId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  // Taste profile: count axis usage across all reviews
  const axisCounts = Object.fromEntries(
    ALL_AXES.map((key) => [
      key,
      userReviews.filter((r) => r.axisKeys.includes(key)).length,
    ]),
  ) as Record<AxisKey, number>;

  const topAxes = [...ALL_AXES]
    .sort((a, b) => axisCounts[b] - axisCounts[a])
    .filter((key) => axisCounts[key] > 0)
    .slice(0, 4);

  const displayName = lang === "th" ? user.nameTH : user.nameEN;
  const initial = user.handle.charAt(0).toUpperCase();
  const isCurrentUser = session.userId === userId;
  const canFollow = !!session.userId && !isCurrentUser;
  const alreadyFollowing = canFollow && isFollowing(session.userId!, userId);
  const followers = getFollowers(userId);
  const following = getFollowing(userId);

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">

        {/* ─── BACK ─── */}
        <Link
          href="/ophelia"
          className="mb-8 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest transition-opacity duration-150 hover:opacity-70"
          style={{ color: "var(--muted-strong)", textDecoration: "none" }}
        >
          ← {lang === "th" ? "กลับ" : "Back"}
        </Link>

        {/* ─── PROFILE HEADER ─── */}
        <div
          className="mb-8 rounded-2xl p-6 sm:p-8"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
          }}
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3 sm:items-start">
              <div
                className="flex items-center justify-center rounded-2xl text-3xl font-black"
                style={{
                  width: "80px",
                  height: "80px",
                  background: user.avatarColor,
                  color: "#070707",
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                {initial}
              </div>

              {/* Eye Score */}
              <EyeScoreBadge score={user.eyeScore} size="lg" showLabel />
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  className="text-xl font-black"
                  style={{ color: "var(--foreground)" }}
                >
                  {displayName}
                </h1>
                {user.isVerified && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
                    style={{
                      background: "rgba(182,198,42,0.15)",
                      color: "var(--accent)",
                      border: "1px solid rgba(182,198,42,0.3)",
                    }}
                  >
                    {lang === "th" ? "ยืนยันแล้ว" : "Verified"}
                  </span>
                )}
                {isCurrentUser && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest"
                    style={{
                      background: "rgba(124,122,116,0.2)",
                      color: "var(--muted-strong)",
                      border: "1px solid var(--line)",
                    }}
                  >
                    {lang === "th" ? "คุณ" : "You"}
                  </span>
                )}
              </div>

              <p
                className="mt-0.5 text-sm font-semibold"
                style={{ color: "var(--muted-strong)" }}
              >
                @{user.handle}
              </p>

              {user.bio && (
                <p
                  className="mt-3 text-sm leading-relaxed"
                  style={{ color: "var(--foreground-soft)", maxWidth: "40ch" }}
                >
                  {user.bio}
                </p>
              )}

              {/* Follow button */}
              {canFollow && (
                <button
                  type="button"
                  onClick={() =>
                    alreadyFollowing
                      ? unfollowUser(session.userId!, userId)
                      : followUser(session.userId!, userId)
                  }
                  className="mt-4 rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-150 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  style={{
                    minHeight: "44px",
                    background: alreadyFollowing ? "var(--surface-soft)" : "var(--accent)",
                    color: alreadyFollowing ? "var(--foreground-soft)" : "#070707",
                    border: alreadyFollowing ? "1px solid var(--line)" : "none",
                  }}
                >
                  {alreadyFollowing
                    ? lang === "th" ? "ติดตามอยู่" : "Following"
                    : lang === "th" ? "ติดตาม" : "Follow"}
                </button>
              )}

              {/* Stats strip */}
              <div className="mt-5 flex flex-wrap gap-5">
                {[
                  {
                    value: user.reviewCount,
                    labelEN: "reviews",
                    labelTH: "รีวิว",
                    onClick: undefined,
                  },
                  {
                    value: user.attendedCount,
                    labelEN: "attended",
                    labelTH: "งานที่ไป",
                    onClick: undefined,
                  },
                  {
                    value: followers.length,
                    labelEN: "followers",
                    labelTH: "ผู้ติดตาม",
                    onClick: () => setSocialView(socialView === "followers" ? null : "followers"),
                  },
                  {
                    value: following.length,
                    labelEN: "following",
                    labelTH: "กำลังติดตาม",
                    onClick: () => setSocialView(socialView === "following" ? null : "following"),
                  },
                  {
                    value: user.eyeScore,
                    labelEN: "eye score",
                    labelTH: "คะแนนสายตา",
                    onClick: undefined,
                  },
                ].map(({ value, labelEN, labelTH, onClick }) => (
                  <div
                    key={labelEN}
                    className="flex flex-col gap-0.5"
                    style={{ cursor: onClick ? "pointer" : "default" }}
                    onClick={onClick}
                    role={onClick ? "button" : undefined}
                    tabIndex={onClick ? 0 : undefined}
                    onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
                  >
                    <span
                      className="text-xl font-black tabular-nums leading-none"
                      style={{ color: onClick ? "var(--accent)" : "var(--foreground)" }}
                    >
                      {value.toLocaleString()}
                    </span>
                    <span
                      className="text-[9px] uppercase tracking-widest"
                      style={{ color: "var(--muted-strong)" }}
                    >
                      {lang === "th" ? labelTH : labelEN}
                    </span>
                  </div>
                ))}
              </div>

              {/* Joined */}
              <p
                className="mt-3 text-[10px] uppercase tracking-widest"
                style={{ color: "var(--muted-strong)", opacity: 0.6 }}
              >
                {lang === "th" ? "เข้าร่วมเมื่อ" : "Joined"}{" "}
                {relativeDate(user.joinedAt)}
              </p>
            </div>
          </div>
        </div>

        {/* ─── FOLLOWERS / FOLLOWING PANEL ─── */}
        {socialView !== null && (
          <section className="mb-8">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setSocialView("followers")}
                  className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  style={{
                    background: socialView === "followers" ? "var(--accent)" : "var(--surface-soft)",
                    color: socialView === "followers" ? "#070707" : "var(--muted-strong)",
                    border: socialView === "followers" ? "none" : "1px solid var(--line)",
                  }}
                >
                  {lang === "th" ? `ผู้ติดตาม ${followers.length}` : `${followers.length} Followers`}
                </button>
                <button
                  type="button"
                  onClick={() => setSocialView("following")}
                  className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  style={{
                    background: socialView === "following" ? "var(--accent)" : "var(--surface-soft)",
                    color: socialView === "following" ? "#070707" : "var(--muted-strong)",
                    border: socialView === "following" ? "none" : "1px solid var(--line)",
                  }}
                >
                  {lang === "th" ? `กำลังติดตาม ${following.length}` : `${following.length} Following`}
                </button>
              </div>
              <div className="flex-1" style={{ height: 1, background: "var(--line)" }} />
              <button
                type="button"
                onClick={() => setSocialView(null)}
                className="text-[11px] font-semibold"
                style={{ color: "var(--muted-strong)" }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <UserList
              users={socialView === "followers" ? followers : following}
              lang={lang}
              currentUserId={session.userId}
              isFollowing={isFollowing}
              followUser={followUser}
              unfollowUser={unfollowUser}
              emptyEN={socialView === "followers" ? "No followers yet." : "Not following anyone yet."}
              emptyTH={socialView === "followers" ? "ยังไม่มีผู้ติดตาม" : "ยังไม่ได้ติดตามใคร"}
            />
          </section>
        )}

        {/* ─── TASTE CARD (shareable) ─── */}
        {topAxes.length > 0 && (
          <section className="mb-8">
            <div className="mb-4 flex items-center gap-3">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: "var(--muted-strong)" }}
              >
                {lang === "th" ? "การ์ดรสนิยม" : "Taste card"}
              </p>
              <div
                className="flex-1"
                style={{ height: 1, background: "var(--line)" }}
              />
            </div>
            <div className="mx-auto max-w-sm">
              <TasteCard userId={userId} />
            </div>
          </section>
        )}

        {/* ─── TASTE PROFILE ─── */}
        {topAxes.length > 0 && (
          <section className="mb-8">
            <div className="mb-4 flex items-center gap-3">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: "var(--muted-strong)" }}
              >
                {lang === "th" ? "รสนิยม" : "Taste profile"}
              </p>
              <div
                className="flex-1"
                style={{ height: 1, background: "var(--line)" }}
              />
            </div>

            <div
              className="rounded-2xl p-5"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
              }}
            >
              <p
                className="mb-4 text-xs"
                style={{ color: "var(--muted-strong)" }}
              >
                {lang === "th"
                  ? `${user.nameTH} มักรู้สึกแบบนี้กับงานศิลปะ`
                  : `${user.nameEN} most often feels:`}
              </p>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {topAxes.map((key) => {
                  const color = AXIS_COLORS[key];
                  const count = axisCounts[key];
                  const maxCount = Math.max(...topAxes.map((k) => axisCounts[k]), 1);
                  const pct = Math.max(8, (count / maxCount) * 100);

                  return (
                    <div
                      key={key}
                      className="flex flex-col items-center gap-2 rounded-xl p-3"
                      style={{
                        background: `${color}0e`,
                        border: `1px solid ${color}28`,
                      }}
                    >
                      {/* Axis icon bar */}
                      <div
                        className="w-full overflow-hidden rounded-full"
                        style={{ height: "3px", background: `${color}22` }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: color,
                          }}
                        />
                      </div>

                      {/* Emoji + label */}
                      <span
                        className="text-xl leading-none"
                        aria-hidden="true"
                        style={{ color }}
                      >
                        {AXIS_LABELS[key].emoji}
                      </span>
                      <span
                        className="text-center text-[10px] font-semibold leading-snug"
                        style={{ color }}
                      >
                        {getAxisLabel(key, lang)}
                      </span>
                      <span
                        className="text-[9px] tabular-nums"
                        style={{ color: "var(--muted-strong)" }}
                      >
                        ×{count}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Interests */}
              {user.interests.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5 border-t pt-4" style={{ borderColor: "var(--line)" }}>
                  <span
                    className="text-[9px] uppercase tracking-widest"
                    style={{ color: "var(--muted-strong)", alignSelf: "center" }}
                  >
                    {lang === "th" ? "ความสนใจ" : "Into"}
                  </span>
                  {user.interests.map((interest) => {
                    const label = EVENT_TYPE_LABELS[interest];
                    return (
                      <span
                        key={interest}
                        className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                        style={{
                          background: "var(--surface-soft)",
                          color: "var(--foreground-soft)",
                          border: "1px solid var(--line)",
                        }}
                      >
                        {lang === "th" ? label?.th : label?.en}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ─── REVIEWS LIST ─── */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: "var(--muted-strong)" }}
            >
              {lang === "th" ? "รีวิวทั้งหมด" : "All takes"}
            </p>
            {userReviews.length > 0 && (
              <span
                className="rounded-full px-2 py-0.5 text-[9px] font-bold tabular-nums"
                style={{
                  background: "var(--surface)",
                  color: "var(--accent)",
                  border: "1px solid var(--line)",
                }}
              >
                {userReviews.length}
              </span>
            )}
            <div
              className="flex-1"
              style={{ height: 1, background: "var(--line)" }}
            />
          </div>

          {userReviews.length === 0 ? (
            <div
              className="rounded-2xl p-8 text-center"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
              }}
            >
              <p className="text-sm" style={{ color: "var(--muted-strong)" }}>
                {lang === "th" ? "ยังไม่มีรีวิว" : "No takes logged yet."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {userReviews.map((review) => {
                const event = getEvent(review.targetId);
                const eventTitle = event
                  ? lang === "th"
                    ? event.titleTH
                    : event.titleEN
                  : review.targetId;
                const writtenTake =
                  lang === "th"
                    ? review.writtenTakeTH ?? review.writtenTakeEN
                    : review.writtenTakeEN ?? review.writtenTakeTH;

                return (
                  <Link
                    key={review.id}
                    href={`/ophelia/events/${review.targetId}`}
                    className="block rounded-xl p-4 transition-all duration-150 hover:scale-[1.005]"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--line)",
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "var(--line-strong)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "var(--line)";
                    }}
                  >
                    {/* Event name */}
                    <p
                      className="mb-2 text-sm font-bold"
                      style={{ color: "var(--foreground)" }}
                    >
                      {eventTitle}
                    </p>

                    {/* Venue */}
                    {event && (
                      <p
                        className="mb-2 text-[10px] uppercase tracking-widest"
                        style={{ color: "var(--accent)" }}
                      >
                        {event.venueName} · {event.venueArea}
                      </p>
                    )}

                    {/* Axis pills */}
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {review.axisKeys.map((key) => {
                        const color = AXIS_COLORS[key];
                        return (
                          <span
                            key={key}
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                            style={{
                              background: `${color}18`,
                              color: color,
                              border: `1px solid ${color}30`,
                            }}
                          >
                            <span
                              aria-hidden="true"
                              style={{ fontSize: "8px" }}
                            >
                              {AXIS_LABELS[key].emoji}
                            </span>
                            {getAxisLabel(key, lang)}
                          </span>
                        );
                      })}
                      {review.attendanceVerified && (
                        <span
                          className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{
                            background: "rgba(52,211,153,0.12)",
                            color: "#34d399",
                            border: "1px solid rgba(52,211,153,0.24)",
                          }}
                        >
                          <span style={{ fontSize: "9px" }}>📍</span>
                          {lang === "th" ? "ไปจริง" : "Was there"}
                        </span>
                      )}
                    </div>

                    {/* Written take */}
                    {writtenTake && (
                      <p
                        className="text-xs leading-relaxed"
                        style={{
                          color: "var(--foreground-soft)",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {writtenTake}
                      </p>
                    )}

                    {/* Date */}
                    <p
                      className="mt-2 text-[9px] uppercase tracking-widest"
                      style={{ color: "var(--muted-strong)", opacity: 0.7 }}
                    >
                      {relativeDate(review.createdAt)}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
