"use client";

import Link from "next/link";
import { useOpheliaStore } from "@/lib/ophelia/store";

const DEMO_USER_ID = "u-1"; // rawiphat_sees

export function Nav() {
  const session = useOpheliaStore((s) => s.session);
  const setSession = useOpheliaStore((s) => s.setSession);
  const getCurrentUser = useOpheliaStore((s) => s.getCurrentUser);

  const currentUser = getCurrentUser();
  const isLoggedIn = !!session.userId && !!currentUser;

  function handleDemoSignIn() {
    setSession({ userId: DEMO_USER_ID });
  }

  function handleSignOut() {
    setSession({ userId: null });
  }

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        height: "52px",
        background: "rgba(7,7,7,0.88)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Left: logotype + desktop nav links */}
        <div className="flex items-center gap-6">
          <Link
            href="/ophelia"
            className="shrink-0 rounded outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            style={{
              fontFamily: "var(--font-satoshi, var(--font-sans))",
              fontSize: "15px",
              fontWeight: 900,
              letterSpacing: "0.14em",
              color: "var(--accent-strong)",
              textDecoration: "none",
            }}
          >
            OPHELIA
          </Link>

          {/* Desktop-only nav links */}
          <nav className="hidden items-center gap-1 sm:flex">
            {[
              { href: "/ophelia/today", labelEN: "Today", labelTH: "วันนี้" },
              { href: "/ophelia", labelEN: "Feed", labelTH: "ฟีด" },
              { href: "/ophelia/leaderboard", labelEN: "Divided", labelTH: "แตกแยก" },
            ].map(({ href, labelEN, labelTH }) => (
              <Link
                key={labelEN}
                href={href}
                className="rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wider transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                style={{ color: "var(--foreground-soft)", textDecoration: "none" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--foreground-soft)")}
              >
                {session.lang === "th" ? labelTH : labelEN}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: auth zone */}
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <>
              {/* Eye score — desktop only */}
              <div
                className="hidden items-center gap-1.5 rounded-full px-2.5 py-1 sm:flex"
                style={{ background: "var(--surface-soft)", border: "1px solid var(--line)" }}
              >
                <span style={{ color: "var(--accent)", fontSize: "10px", fontWeight: 800 }}>◉</span>
                <span className="tabular-nums font-bold" style={{ color: "var(--accent)", fontSize: "11px" }}>
                  {currentUser.eyeScore}
                </span>
              </div>

              {/* Avatar — always visible, links to profile */}
              <Link
                href={`/ophelia/profile/${session.userId}`}
                className="flex items-center gap-2 rounded-full px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                style={{ background: "var(--surface-soft)", border: "1px solid var(--line)", textDecoration: "none" }}
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-black"
                  style={{ background: currentUser.avatarColor, color: "#070707" }}
                >
                  {currentUser.handle.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden text-xs font-semibold sm:block" style={{ color: "var(--foreground-soft)" }}>
                  @{currentUser.handle}
                </span>
              </Link>

              <button
                onClick={handleSignOut}
                className="hidden rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:block"
                style={{ color: "var(--muted-strong)", background: "transparent", border: "1px solid var(--line)" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--line-strong)"; e.currentTarget.style.color = "var(--foreground-soft)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--muted-strong)"; }}
              >
                {session.lang === "th" ? "ออก" : "Sign out"}
              </button>
            </>
          ) : (
            <>
              {/* Mobile: one-tap demo login button */}
              <button
                onClick={handleDemoSignIn}
                className="rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-all duration-150 active:scale-95 sm:hidden outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                style={{ color: "#070707", background: "var(--accent)" }}
              >
                {session.lang === "th" ? "ทดลอง" : "Try demo"}
              </button>

              {/* Desktop: demo + sign in + join */}
              <button
                onClick={handleDemoSignIn}
                className="hidden rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-all duration-150 sm:block outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                style={{ color: "var(--muted-strong)", background: "transparent", border: "1px solid var(--line)" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(182,198,42,0.36)"; e.currentTarget.style.color = "var(--accent)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--muted-strong)"; }}
              >
                Demo: Rawiphat
              </button>
              <Link
                href="/ophelia/onboarding"
                className="hidden rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider sm:block outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                style={{ color: "var(--foreground-soft)", background: "var(--surface-soft)", border: "1px solid var(--line)", textDecoration: "none" }}
              >
                {session.lang === "th" ? "เข้าสู่ระบบ" : "Sign in"}
              </Link>
              <Link
                href="/ophelia/onboarding"
                className="hidden rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider active:scale-95 sm:block outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-strong)]"
                style={{ color: "#070707", background: "var(--accent)", textDecoration: "none" }}
              >
                {session.lang === "th" ? "สมัคร" : "Join"}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
