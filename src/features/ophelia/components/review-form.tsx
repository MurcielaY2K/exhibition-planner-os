"use client";

import { useState, useCallback } from "react";
import { useOpheliaStore } from "@/lib/ophelia/store";
import { ALL_AXES, AXIS_LABELS } from "@/lib/ophelia/types";
import type { AxisKey, LangPref } from "@/lib/ophelia/types";

interface ReviewFormProps {
  eventId: string;
  lang: LangPref;
  onSuccess: () => void;
  onCancel: () => void;
}

const MAX_CHARS = 280;

function getAxisLabel(key: AxisKey, lang: LangPref): string {
  const labels = AXIS_LABELS[key];
  if (lang === "th") return labels.th;
  if (lang === "both") return `${labels.en} · ${labels.th}`;
  return labels.en;
}

export function ReviewForm({
  eventId,
  lang,
  onSuccess,
  onCancel,
}: ReviewFormProps) {
  const submitReview = useOpheliaStore((s) => s.submitReview);
  const session = useOpheliaStore((s) => s.session);
  const getCurrentUser = useOpheliaStore((s) => s.getCurrentUser);
  const currentUser = getCurrentUser();

  const [selectedAxes, setSelectedAxes] = useState<Set<AxisKey>>(new Set());
  const [writtenTake, setWrittenTake] = useState("");
  const [attended, setAttended] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleAxis = useCallback((key: AxisKey) => {
    setSelectedAxes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (e.target.value.length <= MAX_CHARS) {
        setWrittenTake(e.target.value);
      }
    },
    [],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!session.userId || selectedAxes.size === 0 || isSubmitting) return;

      setIsSubmitting(true);

      const isEN = lang === "en" || lang === "both";
      const isTH = lang === "th" || lang === "both";
      const trimmedTake = writtenTake.trim();

      submitReview({
        userId: session.userId,
        targetType: "event",
        targetId: eventId,
        axisKeys: Array.from(selectedAxes),
        writtenTakeEN: isEN && trimmedTake ? trimmedTake : undefined,
        writtenTakeTH: isTH && trimmedTake ? trimmedTake : undefined,
        attendanceVerified: attended,
      });

      onSuccess();
    },
    [
      session.userId,
      selectedAxes,
      isSubmitting,
      lang,
      writtenTake,
      attended,
      submitReview,
      eventId,
      onSuccess,
    ],
  );

  const charsLeft = MAX_CHARS - writtenTake.length;
  const charsNearLimit = charsLeft <= 40;

  const headerEN = "Your eye. Your call.";
  const headerTH = "สายตาคุณ ความเห็นคุณ";
  const headerText =
    lang === "th"
      ? headerTH
      : lang === "both"
        ? `${headerEN} · ${headerTH}`
        : headerEN;

  const placeholderEN = "What made it land for you? (or not) — optional";
  const placeholderTH = "อะไรที่ทำให้มัน (หรือไม่) ติดใจคุณ?";
  const placeholder = lang === "th" ? placeholderTH : placeholderEN;

  // Not logged in state
  if (!session.userId) {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
        }}
      >
        <p
          className="mb-1 text-base font-bold"
          style={{ color: "var(--foreground)" }}
        >
          {lang === "th" ? headerTH : headerEN}
        </p>
        <p className="mb-4 text-sm" style={{ color: "var(--muted-strong)" }}>
          {lang === "th"
            ? "เข้าร่วม OPHELIA เพื่อฝากความเห็น"
            : "Join OPHELIA to leave your take"}
        </p>
        <button
          type="button"
          className="rounded-full px-5 py-2 text-sm font-semibold transition-opacity duration-150 hover:opacity-90 active:opacity-75"
          style={{
            background: "var(--accent)",
            color: "#070707",
          }}
        >
          {lang === "th" ? "เข้าร่วม / เข้าสู่ระบบ" : "Join / Sign in"}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 rounded-2xl p-5"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2
            className="text-base font-bold leading-tight"
            style={{ color: "var(--foreground)" }}
          >
            {headerText}
          </h2>
          {currentUser && (
            <p
              className="mt-0.5 text-[11px]"
              style={{ color: "var(--muted-strong)" }}
            >
              @{currentUser.handle}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 rounded-full p-1.5 text-sm leading-none transition-colors duration-150 hover:opacity-70"
          aria-label={lang === "th" ? "ยกเลิก" : "Cancel"}
          style={{ color: "var(--muted-strong)" }}
        >
          ✕
        </button>
      </div>

      {/* Axis grid */}
      <div>
        <p
          className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--muted-strong)" }}
        >
          {lang === "th" ? "เลือกความรู้สึก" : "What resonated?"}
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {ALL_AXES.map((key) => {
            const label = AXIS_LABELS[key];
            const isSelected = selectedAxes.has(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleAxis(key)}
                className="flex items-center gap-3 rounded-xl px-4 text-left transition-all duration-150 active:scale-[0.96]"
                style={{
                  minHeight: "52px",
                  background: isSelected ? "rgba(182,198,42,0.10)" : "var(--surface-soft)",
                  border: isSelected ? "1.5px solid var(--accent)" : "1.5px solid var(--line)",
                  color: isSelected ? "var(--accent)" : "var(--foreground-soft)",
                }}
                aria-pressed={isSelected}
              >
                <span
                  className="text-lg leading-none shrink-0"
                  aria-hidden="true"
                  style={{ color: isSelected ? "var(--accent-strong)" : "var(--muted-strong)" }}
                >
                  {label.emoji}
                </span>
                <span className="text-xs font-semibold leading-snug">
                  {getAxisLabel(key, lang)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Written take */}
      <div className="relative">
        <textarea
          value={writtenTake}
          onChange={handleTextChange}
          placeholder={placeholder}
          rows={3}
          className="w-full resize-none rounded-xl px-3.5 py-3 text-sm outline-none transition-colors duration-150"
          style={{
            background: "var(--surface-soft)",
            border: "1px solid var(--line)",
            color: "var(--foreground)",
            caretColor: "var(--accent)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--line-strong)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--line)";
          }}
        />
        <span
          className="pointer-events-none absolute bottom-2.5 right-3 text-[10px] tabular-nums transition-colors duration-150"
          style={{
            color: charsNearLimit ? "var(--warning)" : "var(--muted-strong)",
          }}
        >
          {charsLeft}
        </span>
      </div>

      {/* Attendance checkbox */}
      <label className="flex cursor-pointer items-start gap-3">
        <span className="relative mt-0.5 flex h-4 w-4 shrink-0">
          <input
            type="checkbox"
            checked={attended}
            onChange={(e) => setAttended(e.target.checked)}
            className="peer sr-only"
          />
          <span
            className="flex h-4 w-4 items-center justify-center rounded border transition-colors duration-150"
            style={{
              background: attended ? "var(--accent)" : "var(--surface-soft)",
              borderColor: attended ? "var(--accent)" : "var(--line-strong)",
            }}
            aria-hidden="true"
          >
            {attended && (
              <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                <path
                  d="M1 3.5L3.5 6L8 1"
                  stroke="#070707"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
        </span>
        <span
          className="text-xs leading-relaxed"
          style={{ color: "var(--foreground-soft)" }}
        >
          <span className="mr-1" aria-hidden="true">
            📍
          </span>
          {lang === "th" ? "ฉันไปชมด้วยตัวเองจริงๆ" : "I was physically there"}
        </span>
      </label>

      {/* Footer row: submit + cancel */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={selectedAxes.size === 0 || isSubmitting}
          className="flex-1 rounded-full text-sm font-bold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
          style={{
            height: "48px",
            background: selectedAxes.size > 0 ? "var(--accent)" : "var(--surface-soft)",
            color: selectedAxes.size > 0 ? "#070707" : "var(--muted-strong)",
          }}
        >
          {isSubmitting
            ? lang === "th" ? "กำลังบันทึก…" : "Saving…"
            : lang === "th" ? "ส่งความเห็น" : "Submit take"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-5 text-sm font-medium transition-colors duration-150 active:opacity-60"
          style={{
            height: "48px",
            background: "var(--surface-soft)",
            color: "var(--foreground-soft)",
            border: "1px solid var(--line)",
          }}
        >
          {lang === "th" ? "ยกเลิก" : "Cancel"}
        </button>
      </div>

      {selectedAxes.size === 0 && (
        <p
          className="mt-[-8px] text-center text-[11px]"
          style={{ color: "var(--muted-strong)" }}
        >
          {lang === "th"
            ? "เลือกอย่างน้อยหนึ่งความรู้สึก"
            : "Select at least one axis to submit"}
        </p>
      )}
    </form>
  );
}
