/**
 * Daily Cultural Question — one prompt a day, swipeable answers. Builds the
 * daily-return habit through curiosity and identity ("what do I think?"),
 * not artificial scarcity. Results reveal where the crowd stands once you vote.
 */
export interface DailyQuestionOption {
  id: string;
  labelEN: string;
  labelTH: string;
  /** Optional deep link to an event the option refers to. */
  eventId?: string;
}

export interface DailyQuestion {
  id: string;
  promptEN: string;
  promptTH: string;
  options: DailyQuestionOption[];
  /** Seeded so the results bar feels populated on first answer. */
  seedVotes: Record<string, number>;
}

export const DAILY_QUESTIONS: DailyQuestion[] = [
  {
    id: "dq-overrated",
    promptEN: "Most overrated show in Bangkok right now?",
    promptTH: "งานไหนในกรุงเทพฯ ที่โอเวอร์เรตที่สุดตอนนี้?",
    options: [
      { id: "o1", labelEN: "NEON SAMSARA", labelTH: "นีออนสังสารวัฏ", eventId: "evt-7" },
      { id: "o2", labelEN: "Data Skins", labelTH: "ผิวข้อมูล", eventId: "evt-11" },
      { id: "o3", labelEN: "After the Flood", labelTH: "หลังน้ำท่วม", eventId: "evt-4" },
      { id: "o4", labelEN: "None — the haters are wrong", labelTH: "ไม่มี — พวกเกลียดคิดผิด" },
    ],
    seedVotes: { o1: 142, o2: 61, o3: 48, o4: 39 },
  },
  {
    id: "dq-risk",
    promptEN: "Which space is taking the biggest risks?",
    promptTH: "พื้นที่ไหนกล้าเสี่ยงที่สุด?",
    options: [
      { id: "o1", labelEN: "Cartel Artspace", labelTH: "Cartel Artspace" },
      { id: "o2", labelEN: "Gallery VER", labelTH: "Gallery VER" },
      { id: "o3", labelEN: "WTF Bangkok", labelTH: "WTF Bangkok" },
      { id: "o4", labelEN: "BACC", labelTH: "BACC" },
    ],
    seedVotes: { o1: 188, o2: 97, o3: 110, o4: 44 },
  },
  {
    id: "dq-underrated",
    promptEN: "Most underrated exhibition this month?",
    promptTH: "นิทรรศการที่ถูกมองข้ามที่สุดเดือนนี้?",
    options: [
      { id: "o1", labelEN: "Soft Hours", labelTH: "ชั่วโมงนุ่ม", eventId: "evt-13" },
      { id: "o2", labelEN: "Same Pot, Different Spoon", labelTH: "หม้อข้าวหม้อแกง", eventId: "evt-5" },
      { id: "o3", labelEN: "Night Soil", labelTH: "ดินกลบกาก", eventId: "evt-14" },
      { id: "o4", labelEN: "The Invisible Workers", labelTH: "คนที่มองไม่เห็น", eventId: "evt-6" },
    ],
    seedVotes: { o1: 76, o2: 64, o3: 51, o4: 88 },
  },
  {
    id: "dq-movedyou",
    promptEN: "What moved you most this season?",
    promptTH: "อะไรที่ทำให้คุณซึ้งที่สุดในซีซั่นนี้?",
    options: [
      { id: "o1", labelEN: "Unburied", labelTH: "ขุดขึ้นมา", eventId: "evt-12" },
      { id: "o2", labelEN: "Ghost Architecture", labelTH: "สถาปัตยกรรมผี", eventId: "evt-1" },
      { id: "o3", labelEN: "Margin Notes", labelTH: "หมายเหตุขอบหน้า", eventId: "evt-3" },
      { id: "o4", labelEN: "She Who Bends Light", labelTH: "เธอผู้โค้งงอแสง", eventId: "evt-10" },
    ],
    seedVotes: { o1: 203, o2: 134, o3: 119, o4: 156 },
  },
  {
    id: "dq-critics",
    promptEN: "Crowd or critics — who reads art better?",
    promptTH: "ฝูงชนหรือนักวิจารณ์ — ใครอ่านศิลปะได้ดีกว่า?",
    options: [
      { id: "o1", labelEN: "The crowd. Always.", labelTH: "ฝูงชน เสมอ" },
      { id: "o2", labelEN: "Critics, grudgingly", labelTH: "นักวิจารณ์ แบบไม่เต็มใจ" },
      { id: "o3", labelEN: "Depends on the show", labelTH: "ขึ้นกับงาน" },
      { id: "o4", labelEN: "Neither — trust your own eye", labelTH: "ไม่ทั้งคู่ — เชื่อสายตาตัวเอง" },
    ],
    seedVotes: { o1: 167, o2: 53, o3: 142, o4: 211 },
  },
  {
    id: "dq-divisive",
    promptEN: "Which show is splitting the room hardest?",
    promptTH: "งานไหนที่ทำให้ความเห็นแตกที่สุด?",
    options: [
      { id: "o1", labelEN: "Tongues of Fire", labelTH: "ลิ้นไฟ", eventId: "evt-2" },
      { id: "o2", labelEN: "NEON SAMSARA", labelTH: "นีออนสังสารวัฏ", eventId: "evt-7" },
      { id: "o3", labelEN: "The Committee", labelTH: "คณะกรรมการ", eventId: "evt-15" },
      { id: "o4", labelEN: "Data Skins", labelTH: "ผิวข้อมูล", eventId: "evt-11" },
    ],
    seedVotes: { o1: 98, o2: 121, o3: 87, o4: 64 },
  },
  {
    id: "dq-wantown",
    promptEN: "If you could take one piece home tonight?",
    promptTH: "ถ้าเอากลับบ้านได้หนึ่งชิ้นคืนนี้?",
    options: [
      { id: "o1", labelEN: "Something from Soft Hours", labelTH: "อะไรสักอย่างจากชั่วโมงนุ่ม", eventId: "evt-13" },
      { id: "o2", labelEN: "A Tongues of Fire painting", labelTH: "ภาพจากลิ้นไฟ", eventId: "evt-2" },
      { id: "o3", labelEN: "A ceramic vessel", labelTH: "ภาชนะเซรามิก", eventId: "evt-5" },
      { id: "o4", labelEN: "I don't collect — I witness", labelTH: "ฉันไม่สะสม — ฉันแค่ดู" },
    ],
    seedVotes: { o1: 71, o2: 93, o3: 58, o4: 84 },
  },
];

/** Deterministically pick the day's question from the date string (YYYY-MM-DD). */
export function getQuestionForDate(date: string): DailyQuestion {
  const dayNum = Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 86_400_000);
  const idx = ((dayNum % DAILY_QUESTIONS.length) + DAILY_QUESTIONS.length) % DAILY_QUESTIONS.length;
  return DAILY_QUESTIONS[idx];
}
