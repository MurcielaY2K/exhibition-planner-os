"use client";

import { useState } from "react";
import Link from "next/link";
import { useOpheliaStore } from "@/lib/ophelia/store";

const DEMO_USER_ID = "u-1"; // rawiphat_sees

export function Nav() {
  const session = useOpheliaStore((s) => s.session);
  const setSession = useOpheliaStore((s) => s.setSession);
  const getCurrentUser = useOpheliaStore((s) => s.getCurrentUser);
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentUser = getCurrentUser();
  const isLoggedIn = !!session.userId && !!currentUser;

  function handleDemoSignIn() {
    setSession({ userId: DEMO_USER_ID });
  }

  function handleSignOut() {
    setSession({ userId: null });
    setMobileOpen(false);
  }

  return (
    <>
      <header
        className="sticky top-0 z-50 w-full"
        style={{
          height: "56px",
          background: "rgba(7,7,7,0.82)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Left: logotype + nav links */}
          <div className="flex items-center gap-6">
            <Link
              href="/ophelia"
              className="shrink-0 tracking-[0.12em] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded"
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

            {/* Desktop nav links */}
            <nav className="hidden items-center gap-1 sm:flex">
              <Link
                href="/ophelia"
                className="rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wider transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                style={{ color: "var(--foreground-soft)", textDecoration: "none" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--foreground)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--foreground-soft)")
                }
              >
                {session.lang === "th" ? "ฟีด" : "Feed"}
              </Link>
              <Link
                href="/ophelia/events"
                className="rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wider transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                style={{ color: "var(--foreground-soft)", textDecoration: "none" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--foreground)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--foreground-soft)")
                }
              >
                {session.lang === "th" ? "งานทั้งหมด" : "Events"}
              </Link>
            </nav>
          </div>

          {/* Right: auth zone */}
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              /* Logged-in state */
              <div className="flex items-center gap-2">
                {/* Eye score badge */}
                <div
                  className="hidden items-center gap-1.5 rounded-full px-2.5 py-1 sm:flex"
                  style={{
                    background: "var(--surface-soft)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <span
                    style={{
                      color: "var(--accent)",
                      fontSize: "10px",
                      fontWeight: 800,
                      letterSpacing: "0.04em",
                    }}
                  >
                    ◉
                  </span>
                  <span
                    className="tabular-nums font-bold"
                    style={{ color: "var(--accent)", fontSize: "11px" }}
                  >
                    {currentUser.eyeScore}
                  </span>
                </div>

                {/* User handle + avatar */}
                <Link
                  href={`/ophelia/profile`}
                  className="flex items-center gap-2 rounded-full px-2 py-1 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  style={{
                    background: "var(--surface-soft)",
                    border: "1px solid var(--line)",
                    textDecoration: "none",
                  }}
                >
                  {/* Avatar circle */}
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-black"
                    style={{
                      background: currentUser.avatarColor,
                      color: "#070707",
                    }}
                  >
                    {currentUser.handle.slice(0, 1).toUpperCase()}
                  </span>
                  <span
                    className="hidden text-xs font-semibold sm:block"
                    style={{ color: "var(--foreground-soft)" }}
                  >
                    @{currentUser.handle}
                  </span>
                </Link>

                {/* Sign out */}
                <button
                  onClick={handleSignOut}
                  className="hidden rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:block"
                  style={{
                    color: "var(--muted-strong)",
                    background: "transparent",
                    border: "1px solid var(--line)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--line-strong)";
                    e.currentTarget.style.color = "var(--foreground-soft)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--line)";
                    e.currentTarget.style.color = "var(--muted-strong)";
                  }}
                >
                  {session.lang === "th" ? "ออก" : "Sign out"}
                </button>
              </div>
            ) : (
              /* Logged-out state */
              <div className="flex items-center gap-2">
                {/* Demo quick login */}
                <button
                  onClick={handleDemoSignIn}
                  className="hidden rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-all duration-150 sm:block outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  style={{
                    color: "var(--muted-strong)",
                    background: "transparent",
                    border: "1px solid var(--line)",
                  }}
                  title="Demo login as Rawiphat"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(182,198,42,0.36)";
                    e.currentTarget.style.color = "var(--accent)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--line)";
                    e.currentTarget.style.color = "var(--muted-strong)";
                  }}
                >
                  Demo: Rawiphat
                </button>

                <Link
                  href="/ophelia/onboarding"
                  className="rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  style={{
                    color: "var(--foreground-soft)",
                    background: "var(--surface-soft)",
                    border: "1px solid var(--line)",
                    textDecoration: "none",
                  }}
                >
                  {session.lang === "th" ? "เข้าสู่ระบบ" : "Sign in"}
                </Link>

                <Link
                  href="/ophelia/onboarding"
                  className="rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-150 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-strong)]"
                  style={{
                    color: "#070707",
                    background: "var(--accent)",
                    border: "1px solid var(--accent)",
                    textDecoration: "none",
                  }}
                >
                  {session.lang === "th" ? "สมัครสมาชิก" : "Join"}
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              className="ml-1 flex h-8 w-8 items-center justify-center rounded-full sm:hidden outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              style={{
                background: "var(--surface-soft)",
                border: "1px solid var(--line)",
                color: "var(--foreground-soft)",
              }}
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="3" y1="3" x2="13" y2="13" />
                  <line x1="13" y1="3" x2="3" y2="13" />
                </svg>
              ) : (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="2" y1="5" x2="14" y2="5" />
                  <line x1="2" y1="9" x2="14" y2="9" />
                  <line x1="2" y1="13" x2="14" y2="13" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-x-0 top-14 z-40 sm:hidden"
          style={{
            background: "rgba(7,7,7,0.96)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <nav className="flex flex-col px-4 py-4 gap-1">
            <Link
              href="/ophelia"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-semibold uppercase tracking-wider transition-colors duration-150"
              style={{ color: "var(--foreground-soft)", textDecoration: "none" }}
            >
              {session.lang === "th" ? "ฟีด" : "Feed"}
            </Link>
            <Link
              href="/ophelia/events"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-semibold uppercase tracking-wider transition-colors duration-150"
              style={{ color: "var(--foreground-soft)", textDecoration: "none" }}
            >
              {session.lang === "th" ? "งานทั้งหมด" : "Events"}
            </Link>

            <div
              className="my-2 h-px w-full"
              style={{ background: "var(--line)" }}
            />

            {isLoggedIn ? (
              <>
                {/* User info */}
                <div className="flex items-center gap-3 px-3 py-2">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black"
                    style={{
                      background: currentUser.avatarColor,
                      color: "#070707",
                    }}
                  >
                    {currentUser.handle.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--foreground)" }}
                    >
                      @{currentUser.handle}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--muted-strong)" }}
                    >
                      ◉ {currentUser.eyeScore} eye score
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
                  className="mt-1 rounded-lg px-3 py-2.5 text-left text-sm font-semibold uppercase tracking-wider transition-colors duration-150 outline-none"
                  style={{ color: "var(--danger)" }}
                >
                  {session.lang === "th" ? "ออกจากระบบ" : "Sign out"}
                </button>
              </>
            ) : (
              <>
                {/* Demo login */}
                <button
                  onClick={() => {
                    handleDemoSignIn();
                    setMobileOpen(false);
                  }}
                  className="rounded-lg px-3 py-2.5 text-left text-sm font-semibold uppercase tracking-wider transition-colors duration-150"
                  style={{ color: "var(--accent)" }}
                >
                  Demo: sign in as Rawiphat
                </button>

                <Link
                  href="/ophelia/onboarding"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-semibold uppercase tracking-wider"
                  style={{ color: "var(--foreground-soft)", textDecoration: "none" }}
                >
                  {session.lang === "th" ? "เข้าสู่ระบบ" : "Sign in"}
                </Link>

                <Link
                  href="/ophelia/onboarding"
                  onClick={() => setMobileOpen(false)}
                  className="mt-1 rounded-lg px-3 py-2.5 text-center text-sm font-bold uppercase tracking-wider"
                  style={{
                    color: "#070707",
                    background: "var(--accent)",
                    textDecoration: "none",
                  }}
                >
                  {session.lang === "th" ? "สมัครสมาชิก" : "Join OPHELIA"}
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
