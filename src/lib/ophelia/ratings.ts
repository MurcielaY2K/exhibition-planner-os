import type { AxisKey, AggregatedResponse, OReview } from "./types";
import { ALL_AXES } from "./types";

export function computeAggregate(
  eventId: string,
  reviews: OReview[],
): AggregatedResponse {
  const eventReviews = reviews.filter(
    (r) => r.targetType === "event" && r.targetId === eventId,
  );

  const axisCount = Object.fromEntries(
    ALL_AXES.map((k) => [k, 0]),
  ) as Record<AxisKey, number>;

  let writtenTakeCount = 0;
  let verifiedCount = 0;

  for (const review of eventReviews) {
    for (const axis of review.axisKeys) {
      axisCount[axis]++;
    }
    if (review.writtenTakeEN || review.writtenTakeTH) writtenTakeCount++;
    if (review.attendanceVerified) verifiedCount++;
  }

  const totalVotes = ALL_AXES.reduce((sum, k) => sum + axisCount[k], 0);
  const divisiveness = totalVotes === 0 ? 0 : computeDivisiveness(axisCount, totalVotes);

  return {
    eventId,
    totalReviews: eventReviews.length,
    verifiedCount,
    axisCount,
    divisiveness,
    writtenTakeCount,
  };
}

function computeDivisiveness(counts: Record<AxisKey, number>, total: number): number {
  const nonZero = ALL_AXES.map((k) => counts[k]).filter((n) => n > 0);
  if (nonZero.length <= 1) return 0;

  const entropy = nonZero.reduce((sum, n) => {
    const p = n / total;
    return sum - p * Math.log2(p);
  }, 0);

  const maxEntropy = Math.log2(ALL_AXES.length);
  return Math.min(1, entropy / maxEntropy);
}

export function getDivisivenessLabel(score: number): { en: string; th: string; level: "low" | "mid" | "high" } {
  if (score >= 0.72) return { en: "Room divided", th: "ความเห็นแตกต่าง", level: "high" };
  if (score >= 0.45) return { en: "Mixed signals", th: "สัญญาณหลากหลาย", level: "mid" };
  return { en: "Strong consensus", th: "เห็นพ้องต้องกัน", level: "low" };
}
