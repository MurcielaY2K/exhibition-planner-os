"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useOpheliaStore } from "@/lib/ophelia/store";
import { ReviewForm } from "@/features/ophelia/components/review-form";

export default function ReviewPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const router = useRouter();

  const getEvent = useOpheliaStore((s) => s.getEvent);
  const session = useOpheliaStore((s) => s.session);

  const event = getEvent(eventId);
  const lang = session.lang;
  const [done, setDone] = useState(false);

  function handleSuccess() {
    setDone(true);
    // Brief delay so user sees the success state, then redirect
    setTimeout(() => {
      router.push(`/ophelia/events/${eventId}`);
    }, 1200);
  }

  function handleCancel() {
    router.push(`/ophelia/events/${eventId}`);
  }

  if (!event) {
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
            {lang === "th" ? "ไม่พบงาน" : "Event not found"}
          </p>
          <p className="text-sm" style={{ color: "var(--muted-strong)" }}>
            {lang === "th"
              ? "งานนี้อาจจะปิดไปแล้ว"
              : "This event may have been removed."}
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

  const title = lang === "th" ? event.titleTH : event.titleEN;
  const altTitle = lang === "th" ? event.titleEN : event.titleTH;

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>
      <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8">

        {/* ─── BACK LINK ─── */}
        <Link
          href={`/ophelia/events/${eventId}`}
          className="mb-8 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest transition-opacity duration-150 hover:opacity-70"
          style={{ color: "var(--muted-strong)", textDecoration: "none" }}
        >
          ← {lang === "th" ? "กลับไปหน้างาน" : "Back to event"}
        </Link>

        {/* ─── EVENT CONTEXT CARD ─── */}
        <div
          className="mb-8 flex items-center gap-4 rounded-2xl p-4"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
          }}
        >
          {/* Thumbnail */}
          <div
            className="shrink-0 overflow-hidden rounded-xl"
            style={{ width: "64px", height: "64px" }}
          >
            <img
              src={event.coverImage}
              alt={title}
              className="h-full w-full object-cover"
            />
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-sm font-bold"
              style={{ color: "var(--foreground)" }}
            >
              {title}
            </p>
            {altTitle !== title && (
              <p
                className="truncate text-xs"
                style={{ color: "var(--muted-strong)" }}
              >
                {altTitle}
              </p>
            )}
            <p
              className="mt-0.5 text-xs"
              style={{ color: "var(--accent)" }}
            >
              {event.venueName} · {event.venueArea}
            </p>
          </div>
        </div>

        {/* ─── SUCCESS STATE ─── */}
        {done ? (
          <div
            className="flex flex-col items-center gap-4 rounded-2xl p-10 text-center"
            style={{
              background: "rgba(182,198,42,0.08)",
              border: "1px solid rgba(182,198,42,0.28)",
            }}
          >
            <span
              aria-hidden
              className="text-5xl leading-none"
              style={{ color: "var(--accent-strong)" }}
            >
              ◉
            </span>
            <div>
              <p
                className="text-lg font-black uppercase tracking-tight"
                style={{ color: "var(--accent-strong)" }}
              >
                {lang === "th" ? "บันทึกแล้ว" : "Take logged."}
              </p>
              <p
                className="mt-1 text-sm"
                style={{ color: "var(--foreground-soft)" }}
              >
                {lang === "th"
                  ? "ความเห็นของคุณถูกบันทึกแล้ว"
                  : "Your eye is on the record."}
              </p>
            </div>
            <p
              className="text-[11px] uppercase tracking-widest"
              style={{ color: "var(--muted-strong)" }}
            >
              {lang === "th" ? "กำลังพากลับ…" : "Redirecting…"}
            </p>
          </div>
        ) : (
          /* ─── REVIEW FORM ─── */
          <ReviewForm
            eventId={eventId}
            lang={lang}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        )}
      </div>
    </div>
  );
}
