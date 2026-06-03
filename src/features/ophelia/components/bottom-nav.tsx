"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOpheliaStore } from "@/lib/ophelia/store";

export function BottomNav() {
  const pathname = usePathname();
  const session = useOpheliaStore((s) => s.session);
  const lang = session.lang;
  const userId = session.userId;

  const isFeed = pathname === "/ophelia";
  const isDiscover = pathname === "/ophelia" && false; // future route
  const isProfile =
    pathname.startsWith("/ophelia/profile") ||
    pathname === "/ophelia/onboarding";

  const profileHref = userId
    ? `/ophelia/profile/${userId}`
    : "/ophelia/onboarding";

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 sm:hidden"
      style={{
        background: "rgba(7,7,7,0.94)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid var(--line)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      aria-label="Main navigation"
    >
      <div className="flex h-16 items-stretch">
        {/* Feed */}
        <Link
          href="/ophelia"
          className="flex flex-1 flex-col items-center justify-center gap-1 transition-opacity duration-100 active:opacity-60"
          aria-label={lang === "th" ? "ฟีด" : "Feed"}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
            style={{ color: isFeed ? "var(--accent-strong)" : "var(--muted-strong)" }}
          >
            <rect x="2" y="3" width="8" height="8" rx="1.5" fill="currentColor" opacity={isFeed ? 1 : 0.7} />
            <rect x="12" y="3" width="8" height="8" rx="1.5" fill="currentColor" opacity={isFeed ? 0.5 : 0.35} />
            <rect x="2" y="13" width="8" height="6" rx="1.5" fill="currentColor" opacity={isFeed ? 0.5 : 0.35} />
            <rect x="12" y="13" width="8" height="6" rx="1.5" fill="currentColor" opacity={isFeed ? 0.7 : 0.5} />
          </svg>
          <span
            className="text-[10px] font-semibold uppercase tracking-wider leading-none"
            style={{ color: isFeed ? "var(--accent-strong)" : "var(--muted-strong)" }}
          >
            {lang === "th" ? "ฟีด" : "Feed"}
          </span>
        </Link>

        {/* Discover — scroll to filter on feed */}
        <Link
          href="/ophelia"
          onClick={() => {
            const filterEl = document.getElementById("ophelia-filter-bar");
            if (filterEl) {
              filterEl.scrollIntoView({ behavior: "smooth", block: "start" });
              const input = filterEl.querySelector("input");
              if (input) setTimeout(() => input.focus(), 300);
            }
          }}
          className="flex flex-1 flex-col items-center justify-center gap-1 transition-opacity duration-100 active:opacity-60"
          aria-label={lang === "th" ? "ค้นหา" : "Search"}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
            stroke="var(--muted-strong)"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <circle cx="9.5" cy="9.5" r="6" />
            <line x1="14" y1="14" x2="19.5" y2="19.5" />
          </svg>
          <span
            className="text-[10px] font-semibold uppercase tracking-wider leading-none"
            style={{ color: "var(--muted-strong)" }}
          >
            {lang === "th" ? "ค้นหา" : "Search"}
          </span>
        </Link>

        {/* Write a take — primary CTA */}
        <div className="flex flex-1 items-center justify-center">
          <Link
            href="/ophelia"
            className="flex h-12 w-12 items-center justify-center rounded-full transition-transform duration-100 active:scale-90"
            style={{
              background: "var(--accent)",
              boxShadow: "0 0 0 3px rgba(182,198,42,0.18), 0 4px 16px rgba(182,198,42,0.25)",
            }}
            aria-label={lang === "th" ? "เขียนความเห็น" : "Write a take"}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="#070707"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <line x1="10" y1="4" x2="10" y2="16" />
              <line x1="4" y1="10" x2="16" y2="10" />
            </svg>
          </Link>
        </div>

        {/* Events */}
        <Link
          href="/ophelia"
          className="flex flex-1 flex-col items-center justify-center gap-1 transition-opacity duration-100 active:opacity-60"
          aria-label={lang === "th" ? "งาน" : "Events"}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
            stroke="var(--muted-strong)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="16" height="15" rx="2" />
            <line x1="3" y1="9" x2="19" y2="9" />
            <line x1="7.5" y1="2" x2="7.5" y2="6" />
            <line x1="14.5" y1="2" x2="14.5" y2="6" />
          </svg>
          <span
            className="text-[10px] font-semibold uppercase tracking-wider leading-none"
            style={{ color: "var(--muted-strong)" }}
          >
            {lang === "th" ? "งาน" : "Events"}
          </span>
        </Link>

        {/* Profile */}
        <Link
          href={profileHref}
          className="flex flex-1 flex-col items-center justify-center gap-1 transition-opacity duration-100 active:opacity-60"
          aria-label={lang === "th" ? "โปรไฟล์" : "Profile"}
        >
          {userId ? (
            <ProfileAvatar userId={userId} isActive={isProfile} />
          ) : (
            <>
              <svg
                width="22"
                height="22"
                viewBox="0 0 22 22"
                fill="none"
                stroke={isProfile ? "var(--accent-strong)" : "var(--muted-strong)"}
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <circle cx="11" cy="7.5" r="4" />
                <path d="M3 19c0-4.418 3.582-8 8-8s8 3.582 8 8" />
              </svg>
              <span
                className="text-[10px] font-semibold uppercase tracking-wider leading-none"
                style={{ color: isProfile ? "var(--accent-strong)" : "var(--muted-strong)" }}
              >
                {lang === "th" ? "โปรไฟล์" : "Profile"}
              </span>
            </>
          )}
        </Link>
      </div>
    </nav>
  );
}

function ProfileAvatar({ userId, isActive }: { userId: string; isActive: boolean }) {
  const getUser = useOpheliaStore((s) => s.getUser);
  const user = getUser(userId);
  if (!user) return null;

  return (
    <>
      <span
        className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black leading-none"
        style={{
          background: user.avatarColor,
          color: "#070707",
          outline: isActive ? "2px solid var(--accent-strong)" : "none",
          outlineOffset: "1px",
        }}
      >
        {user.handle.slice(0, 1).toUpperCase()}
      </span>
      <span
        className="max-w-[52px] truncate text-[10px] font-semibold uppercase tracking-wider leading-none"
        style={{ color: isActive ? "var(--accent-strong)" : "var(--muted-strong)" }}
      >
        {user.handle.split("_")[0]}
      </span>
    </>
  );
}
