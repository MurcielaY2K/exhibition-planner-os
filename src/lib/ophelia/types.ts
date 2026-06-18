export type AxisKey =
  | "moved"
  | "confused"
  | "wantToOwn"
  | "changedMyMind"
  | "cantStopThinking"
  | "overhyped"
  | "underrated";

export const AXIS_LABELS: Record<AxisKey, { en: string; th: string; emoji: string }> = {
  moved: { en: "Moved me", th: "ซึ้งใจ", emoji: "✦" },
  confused: { en: "Confused me", th: "งงดี", emoji: "?" },
  wantToOwn: { en: "Want to own it", th: "อยากเอากลับบ้าน", emoji: "◆" },
  changedMyMind: { en: "Changed my mind", th: "เปลี่ยนความคิด", emoji: "↻" },
  cantStopThinking: { en: "Can't stop thinking", th: "คิดไม่หาย", emoji: "∞" },
  overhyped: { en: "Overhyped", th: "โอเวอร์เกิน", emoji: "↓" },
  underrated: { en: "Underrated", th: "ถูกมองข้าม", emoji: "↑" },
};

export const ALL_AXES: AxisKey[] = [
  "moved",
  "confused",
  "wantToOwn",
  "changedMyMind",
  "cantStopThinking",
  "overhyped",
  "underrated",
];

export type EventType =
  | "exhibition"
  | "installation"
  | "festival"
  | "performance"
  | "venue";

export type LangPref = "th" | "en" | "both";

export interface OUser {
  id: string;
  handle: string;
  nameTH: string;
  nameEN: string;
  bio: string;
  langPref: LangPref;
  eyeScore: number;
  joinedAt: string;
  isVerified: boolean;
  attendedCount: number;
  reviewCount: number;
  interests: EventType[];
  avatarColor: string;
}

export interface OVenue {
  id: string;
  name: string;
  area: string;
  geoLat: number;
  geoLng: number;
  type: "gallery" | "museum" | "outdoor" | "pop-up" | "institution";
}

export interface OEvent {
  id: string;
  type: EventType;
  titleTH: string;
  titleEN: string;
  descriptionTH: string;
  descriptionEN: string;
  venueId: string;
  venueName: string;
  venueArea: string;
  startDate: string;
  endDate: string;
  geoLat: number;
  geoLng: number;
  coverImage: string;
  images: string[];
  organizerId: string;
  isPaid: boolean;
  ticketUrl?: string;
  tags: string[];
  criticAxisRatings?: Partial<Record<AxisKey, number>>;
}

export interface OReview {
  id: string;
  userId: string;
  targetType: "event";
  targetId: string;
  axisKeys: AxisKey[];
  writtenTakeTH?: string;
  writtenTakeEN?: string;
  attendanceVerified: boolean;
  createdAt: string;
}

export interface AggregatedResponse {
  eventId: string;
  totalReviews: number;
  verifiedCount: number;
  axisCount: Record<AxisKey, number>;
  divisiveness: number;
  writtenTakeCount: number;
}

export interface OpheliaSession {
  userId: string | null;
  lang: LangPref;
}

export interface OFollow {
  fromUserId: string;
  toUserId: string;
  createdAt: string;
}

export type FeedFilter =
  | "all"
  | "divisive"
  | "recommended"
  | "ending-soon"
  | "free"
  | "following";
