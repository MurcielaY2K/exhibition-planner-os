"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOpheliaStore } from "@/lib/ophelia/store";
import type { LangPref, EventType } from "@/lib/ophelia/types";

const DEMO_PERSONAS: Array<{
  id: string;
  nameEN: string;
  nameTH: string;
  handle: string;
  role: string;
  roleEN: string;
  avatarColor: string;
}> = [
  {
    id: "u-1",
    nameEN: "Rawiphat",
    nameTH: "รวิภัทร์",
    handle: "rawiphat_sees",
    role: "นักศึกษาศิลปะ",
    roleEN: "Art student, KMITL",
    avatarColor: "#b6c62a",
  },
  {
    id: "u-4",
    nameEN: "Krittin",
    nameTH: "กฤตธิ์",
    handle: "krittin_art",
    role: "คิวเรเตอร์",
    roleEN: "Independent curator",
    avatarColor: "#f0b95f",
  },
  {
    id: "u-8",
    nameEN: "Tara",
    nameTH: "ทาร่า",
    handle: "tara_crit",
    role: "อดีตเจ้าของแกลเลอรี",
    roleEN: "Ex-gallerist",
    avatarColor: "#60a5fa",
  },
];

const INTEREST_OPTIONS: Array<{
  value: EventType;
  labelEN: string;
  labelTH: string;
  icon: string;
}> = [
  { value: "exhibition", labelEN: "Exhibitions", labelTH: "นิทรรศการ", icon: "◻" },
  { value: "installation", labelEN: "Installations", labelTH: "อินสทอลเลชัน", icon: "◈" },
  { value: "festival", labelEN: "Festivals", labelTH: "เทศกาล", icon: "✦" },
  { value: "performance", labelEN: "Performances", labelTH: "การแสดง", icon: "◉" },
  { value: "venue", labelEN: "Venues", labelTH: "สถานที่", icon: "↗" },
];

const LANG_OPTIONS: Array<{
  value: LangPref;
  label: string;
  desc: string;
}> = [
  { value: "en", label: "English", desc: "EN only" },
  { value: "th", label: "ภาษาไทย", desc: "TH เท่านั้น" },
  { value: "both", label: "Both / สองภาษา", desc: "EN + TH" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const setSession = useOpheliaStore((s) => s.setSession);

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedLang, setSelectedLang] = useState<LangPref>("en");
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [selectedInterests, setSelectedInterests] = useState<Set<EventType>>(
    new Set(["exhibition"]),
  );

  const isTH = selectedLang === "th";

  function toggleInterest(value: EventType) {
    setSelectedInterests((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        if (next.size > 1) next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  }

  function handleStep1Continue() {
    setStep(2);
  }

  function handleComplete() {
    setSession({ lang: selectedLang, userId: selectedPersona ?? null });
    router.push("/ophelia");
  }

  function handleSkip() {
    setSession({ lang: selectedLang });
    router.push("/ophelia");
  }

  return (
    <div
      className="relative flex min-h-[calc(100vh-56px)] flex-col items-center justify-center px-5 py-16"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(182,198,42,0.07) 0%, transparent 65%)",
      }}
    >
      {/* Background glyph */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-5%] top-[10%] select-none text-[clamp(200px,30vw,400px)] font-black leading-none"
        style={{ color: "var(--accent-strong)", opacity: 0.025, letterSpacing: "-0.06em" }}
      >
        ◉
      </div>

      <div className="relative w-full max-w-md">

        {/* ─── STEP INDICATOR ─── */}
        <div className="mb-8 flex items-center gap-2">
          {([1, 2] as const).map((s) => (
            <div
              key={s}
              className="rounded-full transition-all duration-300"
              style={{
                height: "3px",
                flex: 1,
                background: step >= s ? "var(--accent)" : "var(--line-strong)",
              }}
            />
          ))}
        </div>

        {/* ─── BRAND MARK ─── */}
        <p
          className="mb-2 text-[10px] font-black uppercase tracking-[0.26em]"
          style={{ color: "var(--accent-strong)" }}
        >
          OPHELIA
        </p>

        {step === 1 && (
          <>
            {/* STEP 1: Language + Demo Persona */}
            <h1
              className="mb-1 text-2xl font-black uppercase leading-tight tracking-tight sm:text-3xl"
              style={{ color: "var(--foreground)" }}
            >
              {isTH ? "เลือกภาษา" : "Pick your language"}
            </h1>
            <p
              className="mb-8 text-sm"
              style={{ color: "var(--muted-strong)" }}
            >
              {isTH
                ? "OPHELIA รองรับทั้งภาษาไทยและอังกฤษ"
                : "OPHELIA works in both Thai and English — your call."}
            </p>

            {/* Language options */}
            <div className="mb-8 flex flex-col gap-2">
              {LANG_OPTIONS.map((opt) => {
                const isSelected = selectedLang === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedLang(opt.value)}
                    className="flex items-center gap-4 rounded-xl px-4 py-3.5 text-left transition-all duration-150 active:scale-[0.99]"
                    style={{
                      background: isSelected
                        ? "rgba(182,198,42,0.10)"
                        : "var(--surface)",
                      border: isSelected
                        ? "1.5px solid var(--accent)"
                        : "1.5px solid var(--line)",
                    }}
                    aria-pressed={isSelected}
                  >
                    {/* Radio dot */}
                    <span
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-150"
                      style={{
                        borderColor: isSelected ? "var(--accent)" : "var(--line-strong)",
                        background: isSelected ? "var(--accent)" : "transparent",
                      }}
                      aria-hidden="true"
                    >
                      {isSelected && (
                        <span
                          className="rounded-full"
                          style={{ width: 6, height: 6, background: "#070707" }}
                        />
                      )}
                    </span>

                    <div>
                      <p
                        className="text-sm font-bold"
                        style={{
                          color: isSelected
                            ? "var(--foreground)"
                            : "var(--foreground-soft)",
                        }}
                      >
                        {opt.label}
                      </p>
                      <p
                        className="text-[10px]"
                        style={{ color: "var(--muted-strong)" }}
                      >
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Demo personas */}
            <div className="mb-8">
              <p
                className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: "var(--muted-strong)" }}
              >
                {isTH
                  ? "หรือเลือก Demo Account เพื่อดูฟีเจอร์ทั้งหมด"
                  : "Quick demo — pick a persona to explore"}
              </p>

              <div className="flex flex-col gap-2">
                {DEMO_PERSONAS.map((persona) => {
                  const isSelected = selectedPersona === persona.id;
                  return (
                    <button
                      key={persona.id}
                      type="button"
                      onClick={() =>
                        setSelectedPersona(isSelected ? null : persona.id)
                      }
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-150 active:scale-[0.99]"
                      style={{
                        background: isSelected
                          ? `${persona.avatarColor}12`
                          : "var(--surface)",
                        border: isSelected
                          ? `1.5px solid ${persona.avatarColor}55`
                          : "1.5px solid var(--line)",
                      }}
                      aria-pressed={isSelected}
                    >
                      {/* Avatar */}
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black"
                        style={{
                          background: persona.avatarColor,
                          color: "#070707",
                        }}
                        aria-hidden="true"
                      >
                        {persona.handle.charAt(0).toUpperCase()}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p
                          className="text-sm font-bold"
                          style={{ color: "var(--foreground)" }}
                        >
                          {isTH ? persona.nameTH : persona.nameEN}
                        </p>
                        <p
                          className="text-[10px]"
                          style={{ color: "var(--muted-strong)" }}
                        >
                          @{persona.handle} · {isTH ? persona.role : persona.roleEN}
                        </p>
                      </div>

                      {isSelected && (
                        <span
                          className="shrink-0 text-[11px] font-bold"
                          style={{ color: "var(--accent)" }}
                          aria-hidden="true"
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <p
                className="mt-2.5 text-[10px]"
                style={{ color: "var(--muted-strong)", opacity: 0.6 }}
              >
                {isTH
                  ? "ข้ามได้ — เปิดดูเฉยๆ โดยไม่ต้องมีบัญชีก็ได้"
                  : "Optional — you can browse without an account."}
              </p>
            </div>

            {/* Continue */}
            <button
              type="button"
              onClick={handleStep1Continue}
              className="w-full rounded-full py-3 text-sm font-black uppercase tracking-wider transition-all duration-150 hover:scale-[1.02] active:scale-95"
              style={{ background: "var(--accent)", color: "#070707" }}
            >
              {isTH ? "ถัดไป →" : "Continue →"}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            {/* STEP 2: Interests */}
            <h1
              className="mb-1 text-2xl font-black uppercase leading-tight tracking-tight sm:text-3xl"
              style={{ color: "var(--foreground)" }}
            >
              {isTH ? "คุณสนใจอะไร?" : "What are you into?"}
            </h1>
            <p
              className="mb-8 text-sm"
              style={{ color: "var(--muted-strong)" }}
            >
              {isTH
                ? "เลือกประเภทงานที่คุณสนใจ (เลือกได้หลายอย่าง)"
                : "Select the types of events you care about — pick as many as you like."}
            </p>

            {/* Interest grid */}
            <div className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {INTEREST_OPTIONS.map((opt) => {
                const isSelected = selectedInterests.has(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleInterest(opt.value)}
                    className="flex flex-col items-start gap-2 rounded-xl px-3.5 py-3.5 text-left transition-all duration-150 active:scale-[0.97]"
                    style={{
                      background: isSelected
                        ? "rgba(182,198,42,0.10)"
                        : "var(--surface)",
                      border: isSelected
                        ? "1.5px solid var(--accent)"
                        : "1.5px solid var(--line)",
                    }}
                    aria-pressed={isSelected}
                  >
                    <span
                      className="text-lg leading-none"
                      aria-hidden="true"
                      style={{
                        color: isSelected
                          ? "var(--accent-strong)"
                          : "var(--muted-strong)",
                      }}
                    >
                      {opt.icon}
                    </span>
                    <span
                      className="text-xs font-bold leading-snug"
                      style={{
                        color: isSelected
                          ? "var(--accent)"
                          : "var(--foreground-soft)",
                      }}
                    >
                      {isTH ? opt.labelTH : opt.labelEN}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* OPHELIA manifesto blurb */}
            <div
              className="mb-8 rounded-xl p-4"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
              }}
            >
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--muted-strong)" }}
              >
                {isTH
                  ? "OPHELIA ไม่ตัดสินว่าคุณ \"ดูงานศิลปะถูกวิธี\" หรือเปล่า — ทุกสายตาเท่ากัน"
                  : "OPHELIA doesn't gatekeep how you look at art. No credentials. No right answers. Just your eye — and it's valid."}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleComplete}
                className="w-full rounded-full py-3 text-sm font-black uppercase tracking-wider transition-all duration-150 hover:scale-[1.02] active:scale-95"
                style={{ background: "var(--accent)", color: "#070707" }}
              >
                {isTH
                  ? selectedPersona
                    ? "เข้าสู่ OPHELIA →"
                    : "เข้าดูเลย →"
                  : selectedPersona
                    ? "Enter OPHELIA →"
                    : "Explore OPHELIA →"}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full rounded-full py-2.5 text-sm font-semibold transition-opacity duration-150 hover:opacity-70"
                style={{
                  background: "transparent",
                  color: "var(--muted-strong)",
                  border: "1px solid var(--line)",
                }}
              >
                {isTH ? "← ย้อนกลับ" : "← Back"}
              </button>

              <button
                type="button"
                onClick={handleSkip}
                className="mt-1 w-full py-2 text-[10px] font-semibold uppercase tracking-widest transition-opacity duration-150 hover:opacity-70"
                style={{ color: "var(--muted-strong)", background: "transparent" }}
              >
                {isTH ? "ข้ามไปก่อน" : "Skip for now"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
