import type { AxisKey, OReview, OUser } from "./types";
import { ALL_AXES } from "./types";
import { computeAggregate } from "./ratings";

/**
 * Taste vector: a 7-dimensional fingerprint of how a user responds to art,
 * built from the axes they tap across all their reviews. This is the core of
 * the OPHELIA taste graph — it powers matching, twins, and the taste card.
 */
export type TasteVector = Record<AxisKey, number>;

export function computeTasteVector(userId: string, reviews: OReview[]): TasteVector {
  const vec = Object.fromEntries(ALL_AXES.map((k) => [k, 0])) as TasteVector;
  for (const review of reviews) {
    if (review.userId !== userId) continue;
    for (const axis of review.axisKeys) vec[axis]++;
  }
  return vec;
}

/** Normalize a taste vector to proportions that sum to 1 (0 if no signal). */
export function normalizeVector(vec: TasteVector): TasteVector {
  const total = ALL_AXES.reduce((sum, k) => sum + vec[k], 0);
  if (total === 0) return vec;
  return Object.fromEntries(
    ALL_AXES.map((k) => [k, vec[k] / total]),
  ) as TasteVector;
}

/** Cosine similarity between two taste vectors → 0..1. */
function cosineSimilarity(a: TasteVector, b: TasteVector): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (const k of ALL_AXES) {
    dot += a[k] * b[k];
    magA += a[k] * a[k];
    magB += b[k] * b[k];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export interface TasteRelation {
  user: OUser;
  matchPct: number; // 0..100
  sharedEvents: number;
}

/**
 * Find taste twins (most similar) and rivals (most opposite) for a user.
 * Only considers other users who have reviewed at least one shared event,
 * so the match is grounded in real overlap, not coincidence.
 */
export function computeTasteRelations(
  userId: string,
  users: OUser[],
  reviews: OReview[],
): { twin?: TasteRelation; rival?: TasteRelation; all: TasteRelation[] } {
  const myVec = computeTasteVector(userId, reviews);
  const myEvents = new Set(
    reviews.filter((r) => r.userId === userId).map((r) => r.targetId),
  );

  if (myEvents.size === 0) return { all: [] };

  const relations: TasteRelation[] = [];

  for (const other of users) {
    if (other.id === userId) continue;
    const otherEvents = new Set(
      reviews.filter((r) => r.userId === other.id).map((r) => r.targetId),
    );
    const shared = [...myEvents].filter((e) => otherEvents.has(e)).length;
    if (shared === 0) continue;

    const otherVec = computeTasteVector(other.id, reviews);
    const sim = cosineSimilarity(myVec, otherVec);
    relations.push({
      user: other,
      matchPct: Math.round(sim * 100),
      sharedEvents: shared,
    });
  }

  relations.sort((a, b) => b.matchPct - a.matchPct);

  return {
    twin: relations[0],
    rival: relations[relations.length - 1],
    all: relations,
  };
}

export interface LeaderboardEntry {
  eventId: string;
  divisiveness: number;
  totalReviews: number;
  rank: number;
}

/** Rank events by how hard they split the room. The signature OPHELIA chart. */
export function computeDivisivenessLeaderboard(
  eventIds: string[],
  reviews: OReview[],
  minReviews = 2,
): LeaderboardEntry[] {
  return eventIds
    .map((id) => {
      const agg = computeAggregate(id, reviews);
      return {
        eventId: id,
        divisiveness: agg.divisiveness,
        totalReviews: agg.totalReviews,
      };
    })
    .filter((e) => e.totalReviews >= minReviews)
    .sort((a, b) => b.divisiveness - a.divisiveness)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

/**
 * Cultural streak: consecutive days (ending today) on which the user logged
 * any activity. Healthy framing — a positive counter that celebrates showing
 * up, not a loss-aversion trap. We never punish a broken streak.
 */
export function computeStreak(activityDates: string[], today: string): number {
  if (activityDates.length === 0) return 0;
  const dates = new Set(activityDates);

  let streak = 0;
  const cursor = new Date(`${today}T00:00:00Z`);

  // Allow the streak to count even if today has no activity yet, as long as
  // yesterday did — so opening the app doesn't feel like instant failure.
  if (!dates.has(today)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export function reviewsThisWeek(
  userId: string,
  reviews: OReview[],
  today: string,
): number {
  const weekAgo = new Date(`${today}T00:00:00Z`);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
  return reviews.filter(
    (r) => r.userId === userId && new Date(r.createdAt) >= weekAgo,
  ).length;
}
