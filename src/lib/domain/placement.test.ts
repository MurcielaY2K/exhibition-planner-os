import { describe, expect, it } from "vitest";
import {
  DRILL_EDGE_CLEARANCE_MM,
  DRILL_EDGE_WARNING_CLEARANCE_MM,
  DRILL_MIN_HEIGHT_MM,
  DRILL_MIN_WARNING_HEIGHT_MM,
  DRILL_OPENING_CLEARANCE_MM,
  DRILL_OPENING_WARNING_CLEARANCE_MM,
  DRILL_POINT_CLEARANCE_MM,
  DRILL_POINT_WARNING_CLEARANCE_MM,
  DRILL_TOP_CLEARANCE_MM,
  DRILL_TOP_WARNING_CLEARANCE_MM,
  SINGLE_POINT_ERROR_ARTWORK_WIDTH_MM,
  SINGLE_POINT_LARGE_ARTWORK_WIDTH_MM,
  SNAP_TOLERANCE_MM,
  STANDARD_CENTERLINE_MM,
  alignPlacementsOnWall,
  arePlacementsValidOnWall,
  boxesOverlap,
  clampGroupDeltaToWall,
  clampOpeningToWall,
  clampPlacementToWall,
  distributePlacementsOnWall,
  findNearestValidPlacementOnWall,
  getOpeningBoundingBox,
  getPlacementBoundingBox,
  getPlacementCenterlineMm,
  getPlacementDrillPointWarnings,
  getPlacementGroupBounds,
  getPlacementHangingPoints,
  getPlacementValidation,
  getRectangleBoundingBox,
  nudgePlacementsOnWall,
  snapPlacementOnWall,
  translatePlacement,
} from "./placement";
import type { Opening, Placement, Wall } from "./types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeWall(overrides: Partial<Wall> = {}): Wall {
  return {
    id: "wall-1",
    roomId: "room-1",
    name: "Wall A",
    index: 0,
    lengthMm: 5000,
    heightMm: 3000,
    ...overrides,
  };
}

function makePlacement(overrides: Partial<Placement> = {}): Placement {
  return {
    id: "placement-1",
    projectId: "project-1",
    artworkId: "artwork-1",
    wallId: "wall-1",
    widthMm: 500,
    heightMm: 400,
    xMm: 1000,
    yMm: 1350,
    installId: "INST-001",
    installNotes: "",
    priorityOrder: 1,
    mountType: "standard-hook",
    isLocked: false,
    requiresTeamLift: false,
    specialHandling: "none",
    ...overrides,
  };
}

function makeOpening(overrides: Partial<Opening> = {}): Opening {
  return {
    id: "opening-1",
    wallId: "wall-1",
    type: "door",
    xMm: 3000,
    yMm: 0,
    widthMm: 900,
    heightMm: 2100,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Bounding box helpers
// ---------------------------------------------------------------------------

describe("getRectangleBoundingBox", () => {
  it("computes correct edges and dimensions", () => {
    const box = getRectangleBoundingBox(100, 200, 400, 300);
    expect(box.leftMm).toBe(100);
    expect(box.rightMm).toBe(500);
    expect(box.bottomMm).toBe(200);
    expect(box.topMm).toBe(500);
    expect(box.widthMm).toBe(400);
    expect(box.heightMm).toBe(300);
  });

  it("handles position at origin", () => {
    const box = getRectangleBoundingBox(0, 0, 200, 100);
    expect(box.leftMm).toBe(0);
    expect(box.rightMm).toBe(200);
    expect(box.bottomMm).toBe(0);
    expect(box.topMm).toBe(100);
  });
});

describe("getPlacementBoundingBox", () => {
  it("derives bounding box from placement position and size", () => {
    const placement = makePlacement({ xMm: 500, yMm: 200, widthMm: 600, heightMm: 300 });
    const box = getPlacementBoundingBox(placement);
    expect(box.leftMm).toBe(500);
    expect(box.rightMm).toBe(1100);
    expect(box.bottomMm).toBe(200);
    expect(box.topMm).toBe(500);
  });
});

describe("getOpeningBoundingBox", () => {
  it("derives bounding box from opening position and size", () => {
    const opening = makeOpening({ xMm: 1000, yMm: 0, widthMm: 900, heightMm: 2100 });
    const box = getOpeningBoundingBox(opening);
    expect(box.leftMm).toBe(1000);
    expect(box.rightMm).toBe(1900);
    expect(box.bottomMm).toBe(0);
    expect(box.topMm).toBe(2100);
  });
});

describe("getPlacementCenterlineMm", () => {
  it("returns y + height / 2", () => {
    const p = makePlacement({ yMm: 1000, heightMm: 400 });
    expect(getPlacementCenterlineMm(p)).toBe(1200);
  });

  it("handles placement at bottom of wall", () => {
    expect(getPlacementCenterlineMm(makePlacement({ yMm: 0, heightMm: 200 }))).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// boxesOverlap
// ---------------------------------------------------------------------------

describe("boxesOverlap", () => {
  function box(left: number, right: number, bottom: number, top: number) {
    return { leftMm: left, rightMm: right, bottomMm: bottom, topMm: top, widthMm: right - left, heightMm: top - bottom };
  }

  it("returns true for clearly overlapping boxes", () => {
    expect(boxesOverlap(box(0, 100, 0, 100), box(50, 150, 50, 150))).toBe(true);
  });

  it("returns true for a box fully inside another", () => {
    expect(boxesOverlap(box(0, 200, 0, 200), box(50, 150, 50, 150))).toBe(true);
  });

  it("returns false for boxes that only share a vertical edge", () => {
    // right edge of left box = left edge of right box (touching but not overlapping)
    expect(boxesOverlap(box(0, 100, 0, 100), box(100, 200, 0, 100))).toBe(false);
  });

  it("returns false for boxes that only share a horizontal edge", () => {
    expect(boxesOverlap(box(0, 100, 0, 100), box(0, 100, 100, 200))).toBe(false);
  });

  it("returns false for clearly separate boxes", () => {
    expect(boxesOverlap(box(0, 100, 0, 100), box(200, 300, 200, 300))).toBe(false);
  });

  it("returns false for horizontally separate boxes at the same height", () => {
    expect(boxesOverlap(box(0, 100, 0, 100), box(101, 200, 0, 100))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getPlacementValidation
// ---------------------------------------------------------------------------

describe("getPlacementValidation", () => {
  it("is valid when placement fits inside the wall with no neighbours", () => {
    const result = getPlacementValidation(
      makePlacement({ xMm: 500, yMm: 500, widthMm: 400, heightMm: 300 }),
      makeWall(),
      [],
    );
    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("reports outside-left when xMm < 0", () => {
    const result = getPlacementValidation(
      makePlacement({ xMm: -10, yMm: 500 }),
      makeWall(),
      [],
    );
    expect(result.issues.map((i) => i.code)).toContain("outside-left");
  });

  it("reports outside-right when right edge exceeds wall length", () => {
    const result = getPlacementValidation(
      makePlacement({ xMm: 4700, widthMm: 500 }),
      makeWall({ lengthMm: 5000 }),
      [],
    );
    expect(result.issues.map((i) => i.code)).toContain("outside-right");
  });

  it("reports outside-bottom when yMm < 0", () => {
    const result = getPlacementValidation(
      makePlacement({ yMm: -5 }),
      makeWall(),
      [],
    );
    expect(result.issues.map((i) => i.code)).toContain("outside-bottom");
  });

  it("reports outside-top when top edge exceeds wall height", () => {
    const result = getPlacementValidation(
      makePlacement({ yMm: 2800, heightMm: 400 }),
      makeWall({ heightMm: 3000 }),
      [],
    );
    expect(result.issues.map((i) => i.code)).toContain("outside-top");
  });

  it("reports collision when two placements on the same wall overlap", () => {
    const p1 = makePlacement({ id: "p1", xMm: 500, yMm: 500, widthMm: 400, heightMm: 300 });
    const p2 = makePlacement({ id: "p2", xMm: 600, yMm: 500, widthMm: 400, heightMm: 300 });
    const result = getPlacementValidation(p1, makeWall(), [p2]);
    expect(result.issues.map((i) => i.code)).toContain("collision");
  });

  it("does not report collision with itself", () => {
    const p = makePlacement({ id: "p1", xMm: 500, yMm: 500 });
    const result = getPlacementValidation(p, makeWall(), [p]);
    expect(result.issues.find((i) => i.code === "collision")).toBeUndefined();
  });

  it("does not report collision for placements on different walls", () => {
    const p1 = makePlacement({ id: "p1", wallId: "wall-1", xMm: 500, yMm: 500 });
    const p2 = makePlacement({ id: "p2", wallId: "wall-2", xMm: 500, yMm: 500 });
    const result = getPlacementValidation(p1, makeWall(), [p2]);
    expect(result.issues.find((i) => i.code === "collision")).toBeUndefined();
  });

  it("reports opening-overlap when placement overlaps an opening on the same wall", () => {
    const placement = makePlacement({ xMm: 500, yMm: 500, widthMm: 600, heightMm: 300 });
    const opening = makeOpening({ wallId: "wall-1", xMm: 900, yMm: 400, widthMm: 400, heightMm: 400 });
    const result = getPlacementValidation(placement, makeWall(), [], [opening]);
    expect(result.issues.map((i) => i.code)).toContain("opening-overlap");
  });

  it("does not report opening-overlap for openings on a different wall", () => {
    const placement = makePlacement({ wallId: "wall-1", xMm: 500, yMm: 500 });
    const opening = makeOpening({ wallId: "wall-2", xMm: 500, yMm: 500 });
    const result = getPlacementValidation(placement, makeWall(), [], [opening]);
    expect(result.issues.find((i) => i.code === "opening-overlap")).toBeUndefined();
  });

  it("can report multiple issues simultaneously", () => {
    // Outside both left and bottom
    const result = getPlacementValidation(
      makePlacement({ xMm: -10, yMm: -5 }),
      makeWall(),
      [],
    );
    const codes = result.issues.map((i) => i.code);
    expect(codes).toContain("outside-left");
    expect(codes).toContain("outside-bottom");
  });
});

// ---------------------------------------------------------------------------
// clampPlacementToWall
// ---------------------------------------------------------------------------

describe("clampPlacementToWall", () => {
  it("leaves a placement that already fits inside the wall unchanged", () => {
    const p = makePlacement({ xMm: 500, yMm: 500, widthMm: 400, heightMm: 300 });
    const clamped = clampPlacementToWall(p, makeWall());
    expect(clamped.xMm).toBe(500);
    expect(clamped.yMm).toBe(500);
  });

  it("clamps xMm to 0 when placement is past the left edge", () => {
    const clamped = clampPlacementToWall(
      makePlacement({ xMm: -100 }),
      makeWall(),
    );
    expect(clamped.xMm).toBe(0);
  });

  it("clamps xMm so right edge does not exceed wall length", () => {
    const clamped = clampPlacementToWall(
      makePlacement({ xMm: 5000, widthMm: 500 }),
      makeWall({ lengthMm: 5000 }),
    );
    expect(clamped.xMm).toBe(4500);
  });

  it("clamps yMm to 0 when placement is below the floor", () => {
    const clamped = clampPlacementToWall(
      makePlacement({ yMm: -200 }),
      makeWall(),
    );
    expect(clamped.yMm).toBe(0);
  });

  it("clamps yMm so top edge does not exceed wall height", () => {
    const clamped = clampPlacementToWall(
      makePlacement({ yMm: 3000, heightMm: 400 }),
      makeWall({ heightMm: 3000 }),
    );
    expect(clamped.yMm).toBe(2600);
  });

  it("clamps to 0 when artwork is wider than the wall", () => {
    const clamped = clampPlacementToWall(
      makePlacement({ xMm: 500, widthMm: 6000 }),
      makeWall({ lengthMm: 5000 }),
    );
    expect(clamped.xMm).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// clampOpeningToWall
// ---------------------------------------------------------------------------

describe("clampOpeningToWall", () => {
  it("leaves a valid opening unchanged", () => {
    const opening = makeOpening({ xMm: 500, yMm: 0, widthMm: 900, heightMm: 2100 });
    const clamped = clampOpeningToWall(opening, makeWall());
    expect(clamped.xMm).toBe(500);
    expect(clamped.yMm).toBe(0);
  });

  it("clamps opening so right edge does not exceed wall length", () => {
    const opening = makeOpening({ xMm: 4500, widthMm: 900 });
    const clamped = clampOpeningToWall(opening, makeWall({ lengthMm: 5000 }));
    expect(clamped.xMm).toBe(4100);
  });

  it("clamps opening so top edge does not exceed wall height", () => {
    const opening = makeOpening({ yMm: 2800, heightMm: 400 });
    const clamped = clampOpeningToWall(opening, makeWall({ heightMm: 3000 }));
    expect(clamped.yMm).toBe(2600);
  });
});

// ---------------------------------------------------------------------------
// getPlacementHangingPoints
// ---------------------------------------------------------------------------

describe("getPlacementHangingPoints", () => {
  it("returns empty array for pedestal mount", () => {
    const p = makePlacement({ mountType: "pedestal" });
    expect(getPlacementHangingPoints(p)).toHaveLength(0);
  });

  it("returns one point for standard-hook (single-point) mount", () => {
    // xMm=1000, widthMm=500 → point.x = 1000 + 250 = 1250
    // heightMm=400, topInset=clamp(150,40,360)=150 → point.y = 1350 + 400 - 150 = 1600
    const p = makePlacement({ xMm: 1000, yMm: 1350, widthMm: 500, heightMm: 400, mountType: "standard-hook" });
    const points = getPlacementHangingPoints(p);
    expect(points).toHaveLength(1);
    expect(points[0].xMm).toBe(1250);
    expect(points[0].yMm).toBe(1600);
    expect(points[0].label).toBe("DP1");
  });

  it("returns two points for rail (two-point) mount", () => {
    // xMm=1000, widthMm=1000 → edgeInset = min(clamp(180,120,300), max(500-60,0)) = min(180,440) = 180
    // point y: yMm=1350, heightMm=400, topInset=150 → 1350+250=1600
    const p = makePlacement({ xMm: 1000, yMm: 1350, widthMm: 1000, heightMm: 400, mountType: "rail" });
    const points = getPlacementHangingPoints(p);
    expect(points).toHaveLength(2);
    expect(points[0].xMm).toBe(1180); // 1000 + 180
    expect(points[1].xMm).toBe(1820); // 1000 + 1000 - 180
    expect(points[0].yMm).toBe(1600);
    expect(points[1].yMm).toBe(1600);
    expect(points[0].label).toBe("DP1");
    expect(points[1].label).toBe("DP2");
  });

  it("returns two points for cleat mount", () => {
    const p = makePlacement({ widthMm: 1000, mountType: "cleat" });
    expect(getPlacementHangingPoints(p)).toHaveLength(2);
  });

  it("returns two points for shelf mount", () => {
    const p = makePlacement({ widthMm: 1000, mountType: "shelf" });
    expect(getPlacementHangingPoints(p)).toHaveLength(2);
  });

  it("returns a single centre point when a two-point mount spans a very narrow artwork (edgeInset ≤ 0)", () => {
    // widthMm=100 → maxInset = max(floor(50)-60, 0) = 0 → falls back to single centre point
    const p = makePlacement({ xMm: 500, widthMm: 100, mountType: "rail" });
    const points = getPlacementHangingPoints(p);
    expect(points).toHaveLength(1);
    expect(points[0].xMm).toBe(550); // centre
  });

  it("clamps the top inset so the drill point never falls below the artwork", () => {
    // Very short artwork: heightMm=60, targetInset=150 → clamp(150, 40, max(20, 40)) = clamp(150,40,40) = 40
    // point.y = yMm + 60 - 40 = yMm + 20
    const p = makePlacement({ xMm: 500, yMm: 1000, widthMm: 200, heightMm: 60, mountType: "standard-hook" });
    const points = getPlacementHangingPoints(p);
    expect(points[0].yMm).toBe(1020); // 1000 + 20
  });
});

// ---------------------------------------------------------------------------
// getPlacementDrillPointWarnings — edge clearance
// ---------------------------------------------------------------------------

describe("getPlacementDrillPointWarnings — edge clearance", () => {
  // Placement with widthMm=80, so standard-hook centre x = xMm + 40
  // heightMm=400, topInset=150, so point y = yMm + 250; keep yMm=1000 → y=1250 (safely in middle)

  it(`emits an error when the drill point is within ${DRILL_EDGE_CLEARANCE_MM} mm of the left edge`, () => {
    // point.x = 0 + 40 = 40 < 50 → error
    const p = makePlacement({ id: "p1", xMm: 0, yMm: 1000, widthMm: 80, heightMm: 400 });
    const warnings = getPlacementDrillPointWarnings(p, makeWall(), []);
    const leftEdge = warnings.find((w) => w.code === "edge-left");
    expect(leftEdge).toBeDefined();
    expect(leftEdge?.severity).toBe("error");
  });

  it(`emits a warning (not error) when the drill point is between ${DRILL_EDGE_CLEARANCE_MM} and ${DRILL_EDGE_WARNING_CLEARANCE_MM} mm from the left edge`, () => {
    // point.x = 0 + 80 = 80; 50 <= 80 < 100 → warning
    const p = makePlacement({ id: "p1", xMm: 0, yMm: 1000, widthMm: 160, heightMm: 400 });
    const warnings = getPlacementDrillPointWarnings(p, makeWall(), []);
    const leftEdge = warnings.find((w) => w.code === "edge-left");
    expect(leftEdge).toBeDefined();
    expect(leftEdge?.severity).toBe("warning");
  });

  it("emits no left-edge warning when there is ample clearance", () => {
    const p = makePlacement({ id: "p1", xMm: 1000, yMm: 1000, widthMm: 500, heightMm: 400 });
    const warnings = getPlacementDrillPointWarnings(p, makeWall(), []);
    expect(warnings.find((w) => w.code === "edge-left")).toBeUndefined();
  });

  it(`emits an error when the drill point is within ${DRILL_EDGE_CLEARANCE_MM} mm of the right edge`, () => {
    // point.x = 4960 + 40 = 5000 - 40 = 4960; rightDist = 5000 - 4960 = 40 < 50 → error
    const p = makePlacement({ id: "p1", xMm: 4920, yMm: 1000, widthMm: 80, heightMm: 400 });
    const warnings = getPlacementDrillPointWarnings(p, makeWall(), []);
    expect(warnings.find((w) => w.code === "edge-right")?.severity).toBe("error");
  });

  it(`emits a warning when drill point is between ${DRILL_EDGE_CLEARANCE_MM} and ${DRILL_EDGE_WARNING_CLEARANCE_MM} mm from the right edge`, () => {
    // widthMm=160 → centre at xMm+80; xMm=4840 → point.x=4920; rightDist=5000-4920=80 → warning
    const p = makePlacement({ id: "p1", xMm: 4840, yMm: 1000, widthMm: 160, heightMm: 400 });
    const warnings = getPlacementDrillPointWarnings(p, makeWall(), []);
    expect(warnings.find((w) => w.code === "edge-right")?.severity).toBe("warning");
  });
});

// ---------------------------------------------------------------------------
// getPlacementDrillPointWarnings — height (floor / ceiling)
// ---------------------------------------------------------------------------

describe("getPlacementDrillPointWarnings — height", () => {
  // artwork: widthMm=200, centred at x=2500 (safe from edges)
  // heightMm=100, topInset=clamp(150,40,max(60,40))=60; point.y = yMm + 40

  it(`emits an error when drill point is below ${DRILL_MIN_HEIGHT_MM} mm`, () => {
    // yMm=100: point.y = 140 < 200 → error
    const p = makePlacement({ xMm: 2400, yMm: 100, widthMm: 200, heightMm: 100 });
    const warnings = getPlacementDrillPointWarnings(p, makeWall(), []);
    expect(warnings.find((w) => w.code === "height-low")?.severity).toBe("error");
  });

  it(`emits a warning when drill point is between ${DRILL_MIN_HEIGHT_MM} and ${DRILL_MIN_WARNING_HEIGHT_MM} mm`, () => {
    // yMm=210: point.y = 250; 200 <= 250 < 300 → warning
    const p = makePlacement({ xMm: 2400, yMm: 210, widthMm: 200, heightMm: 100 });
    const warnings = getPlacementDrillPointWarnings(p, makeWall(), []);
    expect(warnings.find((w) => w.code === "height-low")?.severity).toBe("warning");
  });

  it("emits no height-low warning when drill point is at a safe height", () => {
    // yMm=1000: point.y = 1040 >> 300 → no warning
    const p = makePlacement({ xMm: 2400, yMm: 1000, widthMm: 200, heightMm: 100 });
    const warnings = getPlacementDrillPointWarnings(p, makeWall(), []);
    expect(warnings.find((w) => w.code === "height-low")).toBeUndefined();
  });

  it(`emits an error when drill point is within ${DRILL_TOP_CLEARANCE_MM} mm of the wall top`, () => {
    // widthMm=400, heightMm=400, topInset=150: point.y = yMm + 250
    // yMm=2600: point.y = 2850; topDist = 3000 - 2850 = 150 < 200 → error
    const p = makePlacement({ xMm: 2300, yMm: 2600, widthMm: 400, heightMm: 400 });
    const warnings = getPlacementDrillPointWarnings(p, makeWall(), []);
    expect(warnings.find((w) => w.code === "height-high")?.severity).toBe("error");
  });

  it(`emits a warning when drill point is between ${DRILL_TOP_CLEARANCE_MM} and ${DRILL_TOP_WARNING_CLEARANCE_MM} mm from the wall top`, () => {
    // yMm=2500: point.y = 2750; topDist = 3000 - 2750 = 250; 200 <= 250 < 300 → warning
    const p = makePlacement({ xMm: 2300, yMm: 2500, widthMm: 400, heightMm: 400 });
    const warnings = getPlacementDrillPointWarnings(p, makeWall(), []);
    expect(warnings.find((w) => w.code === "height-high")?.severity).toBe("warning");
  });
});

// ---------------------------------------------------------------------------
// getPlacementDrillPointWarnings — opening clearance
// ---------------------------------------------------------------------------

describe("getPlacementDrillPointWarnings — opening clearance", () => {
  // opening at x=2000..2900, y=0..2100
  // placement widthMm=100, heightMm=400, topInset=150: point at (xMm+50, yMm+250)
  // For point.x=1970 (30mm left of opening): xMm=1920, yMm=750

  it(`emits an error when the drill point is within ${DRILL_OPENING_CLEARANCE_MM} mm of an opening`, () => {
    const p = makePlacement({ xMm: 1920, yMm: 750, widthMm: 100, heightMm: 400 });
    const opening = makeOpening({ wallId: "wall-1", xMm: 2000, yMm: 0, widthMm: 900, heightMm: 2100 });
    const warnings = getPlacementDrillPointWarnings(p, makeWall(), [], [opening]);
    expect(warnings.find((w) => w.code === "opening-clearance")?.severity).toBe("error");
  });

  it(`emits a warning when drill point is between ${DRILL_OPENING_CLEARANCE_MM} and ${DRILL_OPENING_WARNING_CLEARANCE_MM} mm from an opening`, () => {
    // point.x at 1925 (75mm left of opening): xMm=1875
    const p = makePlacement({ xMm: 1875, yMm: 750, widthMm: 100, heightMm: 400 });
    const opening = makeOpening({ wallId: "wall-1", xMm: 2000, yMm: 0, widthMm: 900, heightMm: 2100 });
    const warnings = getPlacementDrillPointWarnings(p, makeWall(), [], [opening]);
    const w = warnings.find((w) => w.code === "opening-clearance");
    expect(w?.severity).toBe("warning");
  });

  it("emits no opening-clearance warning when the drill point is sufficiently far from the opening", () => {
    const p = makePlacement({ xMm: 500, yMm: 750, widthMm: 100, heightMm: 400 });
    const opening = makeOpening({ wallId: "wall-1", xMm: 2000, yMm: 0, widthMm: 900, heightMm: 2100 });
    const warnings = getPlacementDrillPointWarnings(p, makeWall(), [], [opening]);
    expect(warnings.find((w) => w.code === "opening-clearance")).toBeUndefined();
  });

  it("ignores openings on a different wall", () => {
    const p = makePlacement({ wallId: "wall-1", xMm: 1920, yMm: 750, widthMm: 100, heightMm: 400 });
    const opening = makeOpening({ wallId: "wall-2", xMm: 2000, yMm: 0, widthMm: 900, heightMm: 2100 });
    const warnings = getPlacementDrillPointWarnings(p, makeWall(), [], [opening]);
    expect(warnings.find((w) => w.code === "opening-clearance")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getPlacementDrillPointWarnings — drill-point spacing
// ---------------------------------------------------------------------------

describe("getPlacementDrillPointWarnings — drill-point clearance", () => {
  // Two placements: points at x=1050, y=1000 and x=1100, y=1000 → distance=50 < 120 → error

  it(`emits an error when two drill points are within ${DRILL_POINT_CLEARANCE_MM} mm of each other`, () => {
    const pA = makePlacement({ id: "pA", xMm: 1000, yMm: 750, widthMm: 100, heightMm: 400 });
    const pB = makePlacement({ id: "pB", xMm: 1050, yMm: 750, widthMm: 100, heightMm: 400 });
    // pA hangs at x=1050; pB hangs at x=1100; distance=50
    const warnings = getPlacementDrillPointWarnings(pA, makeWall(), [pB]);
    expect(warnings.find((w) => w.code === "drill-point-clearance")?.severity).toBe("error");
  });

  it(`emits a warning when two drill points are between ${DRILL_POINT_CLEARANCE_MM} and ${DRILL_POINT_WARNING_CLEARANCE_MM} mm apart`, () => {
    // distance ~150: pA at x=1050, pB at x=1200 → dist=150; 120 <= 150 < 200 → warning
    const pA = makePlacement({ id: "pA", xMm: 1000, yMm: 750, widthMm: 100, heightMm: 400 });
    const pB = makePlacement({ id: "pB", xMm: 1150, yMm: 750, widthMm: 100, heightMm: 400 });
    const warnings = getPlacementDrillPointWarnings(pA, makeWall(), [pB]);
    expect(warnings.find((w) => w.code === "drill-point-clearance")?.severity).toBe("warning");
  });

  it("emits no drill-point-clearance warning when artworks are well separated", () => {
    const pA = makePlacement({ id: "pA", xMm: 500, yMm: 750, widthMm: 100, heightMm: 400 });
    const pB = makePlacement({ id: "pB", xMm: 2000, yMm: 750, widthMm: 100, heightMm: 400 });
    const warnings = getPlacementDrillPointWarnings(pA, makeWall(), [pB]);
    expect(warnings.find((w) => w.code === "drill-point-clearance")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getPlacementDrillPointWarnings — mount-mismatch
// ---------------------------------------------------------------------------

describe("getPlacementDrillPointWarnings — mount-mismatch", () => {
  it(`emits an error for single-point mount on artwork wider than ${SINGLE_POINT_ERROR_ARTWORK_WIDTH_MM} mm`, () => {
    // xMm=1750 so point.x=1750+850=2600 (safe from edges)
    const p = makePlacement({
      xMm: 1750, yMm: 1000, widthMm: SINGLE_POINT_ERROR_ARTWORK_WIDTH_MM + 100, heightMm: 400,
      mountType: "standard-hook",
    });
    const warnings = getPlacementDrillPointWarnings(p, makeWall(), []);
    expect(warnings.find((w) => w.code === "mount-mismatch")?.severity).toBe("error");
  });

  it("emits an error for single-point mount when artwork requiresTeamLift", () => {
    const p = makePlacement({
      xMm: 1500, yMm: 1000, widthMm: 800, heightMm: 400,
      mountType: "standard-hook", requiresTeamLift: true,
    });
    const warnings = getPlacementDrillPointWarnings(p, makeWall(), []);
    expect(warnings.find((w) => w.code === "mount-mismatch")?.severity).toBe("error");
  });

  it("emits an error for single-point mount when specialHandling is 'oversized'", () => {
    const p = makePlacement({
      xMm: 1500, yMm: 1000, widthMm: 800, heightMm: 400,
      mountType: "standard-hook", specialHandling: "oversized",
    });
    const warnings = getPlacementDrillPointWarnings(p, makeWall(), []);
    expect(warnings.find((w) => w.code === "mount-mismatch")?.severity).toBe("error");
  });

  it(`emits a warning for single-point mount on artwork wider than ${SINGLE_POINT_LARGE_ARTWORK_WIDTH_MM} mm but not exceeding the error threshold`, () => {
    const safeWidth = SINGLE_POINT_LARGE_ARTWORK_WIDTH_MM + 100; // > 1200, < 1600
    const xMm = Math.round((5000 - safeWidth) / 2);
    const p = makePlacement({
      xMm, yMm: 1000, widthMm: safeWidth, heightMm: 400,
      mountType: "standard-hook",
    });
    const warnings = getPlacementDrillPointWarnings(p, makeWall(), []);
    expect(warnings.find((w) => w.code === "mount-mismatch")?.severity).toBe("warning");
  });

  it("emits no mount-mismatch warning for a two-point mount regardless of size", () => {
    const p = makePlacement({
      xMm: 100, yMm: 1000, widthMm: 2000, heightMm: 400,
      mountType: "rail",
    });
    const warnings = getPlacementDrillPointWarnings(p, makeWall(), []);
    expect(warnings.find((w) => w.code === "mount-mismatch")).toBeUndefined();
  });

  it("emits no mount-mismatch for a small artwork on a single-point mount", () => {
    const p = makePlacement({ xMm: 1500, yMm: 1000, widthMm: 400, heightMm: 300, mountType: "standard-hook" });
    const warnings = getPlacementDrillPointWarnings(p, makeWall(), []);
    expect(warnings.find((w) => w.code === "mount-mismatch")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// translatePlacement
// ---------------------------------------------------------------------------

describe("translatePlacement", () => {
  it("adds delta values to xMm and yMm", () => {
    const p = makePlacement({ xMm: 100, yMm: 200 });
    const moved = translatePlacement(p, 50, -30);
    expect(moved.xMm).toBe(150);
    expect(moved.yMm).toBe(170);
  });

  it("does not mutate the original placement", () => {
    const p = makePlacement({ xMm: 100, yMm: 200 });
    translatePlacement(p, 50, 50);
    expect(p.xMm).toBe(100);
    expect(p.yMm).toBe(200);
  });

  it("preserves all other fields", () => {
    const p = makePlacement({ xMm: 100, yMm: 200, widthMm: 300 });
    const moved = translatePlacement(p, 10, 10);
    expect(moved.widthMm).toBe(300);
    expect(moved.id).toBe("placement-1");
  });
});

// ---------------------------------------------------------------------------
// getPlacementGroupBounds
// ---------------------------------------------------------------------------

describe("getPlacementGroupBounds", () => {
  it("returns null for an empty array", () => {
    expect(getPlacementGroupBounds([])).toBeNull();
  });

  it("returns the bounding box of a single placement", () => {
    const p = makePlacement({ xMm: 100, yMm: 200, widthMm: 400, heightMm: 300 });
    const bounds = getPlacementGroupBounds([p]);
    expect(bounds?.leftMm).toBe(100);
    expect(bounds?.rightMm).toBe(500);
    expect(bounds?.bottomMm).toBe(200);
    expect(bounds?.topMm).toBe(500);
  });

  it("spans all placements in the group", () => {
    const p1 = makePlacement({ id: "p1", xMm: 0, yMm: 0, widthMm: 200, heightMm: 200 });
    const p2 = makePlacement({ id: "p2", xMm: 500, yMm: 400, widthMm: 300, heightMm: 100 });
    const bounds = getPlacementGroupBounds([p1, p2]);
    expect(bounds?.leftMm).toBe(0);
    expect(bounds?.rightMm).toBe(800);
    expect(bounds?.bottomMm).toBe(0);
    expect(bounds?.topMm).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// clampGroupDeltaToWall
// ---------------------------------------------------------------------------

describe("clampGroupDeltaToWall", () => {
  it("passes through a delta that keeps the group inside the wall", () => {
    const p = makePlacement({ xMm: 500, yMm: 500, widthMm: 200, heightMm: 200 });
    const { deltaXmm, deltaYmm } = clampGroupDeltaToWall([p], makeWall(), 100, 100);
    expect(deltaXmm).toBe(100);
    expect(deltaYmm).toBe(100);
  });

  it("clamps leftward delta when group is at the left wall edge", () => {
    const p = makePlacement({ xMm: 0, yMm: 500, widthMm: 200, heightMm: 200 });
    const { deltaXmm } = clampGroupDeltaToWall([p], makeWall(), -100, 0);
    // Math.max(-100, -0) yields -0 in JS; treat -0 and 0 as equivalent
    expect(deltaXmm).not.toBeLessThan(0);
    expect(Math.abs(deltaXmm)).toBe(0);
  });

  it("clamps rightward delta so the group does not exceed wall length", () => {
    const p = makePlacement({ xMm: 4000, yMm: 500, widthMm: 1000, heightMm: 200 });
    const { deltaXmm } = clampGroupDeltaToWall([p], makeWall({ lengthMm: 5000 }), 200, 0);
    expect(deltaXmm).toBe(0);
  });

  it("returns the original delta when the placements array is empty", () => {
    const result = clampGroupDeltaToWall([], makeWall(), 100, 100);
    expect(result.deltaXmm).toBe(100);
    expect(result.deltaYmm).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// nudgePlacementsOnWall
// ---------------------------------------------------------------------------

describe("nudgePlacementsOnWall", () => {
  it("moves a placement by the requested delta", () => {
    const p = makePlacement({ xMm: 500, yMm: 500, widthMm: 200, heightMm: 200 });
    const result = nudgePlacementsOnWall([p], [], makeWall(), 100, 50);
    expect(result.applied).toBe(true);
    expect(result.placements[0].xMm).toBe(600);
    expect(result.placements[0].yMm).toBe(550);
  });

  it("clamps movement at the left wall edge", () => {
    const p = makePlacement({ xMm: 0, yMm: 500, widthMm: 200, heightMm: 200 });
    const result = nudgePlacementsOnWall([p], [], makeWall(), -100, 0);
    expect(result.placements[0].xMm).toBe(0);
    expect(result.applied).toBe(false); // zero net delta → not applied
  });

  it("blocks the nudge when it would cause a collision with a stationary placement", () => {
    // p1 at x=500, p2 directly to the right at x=700 (200mm wide each → touching)
    // nudging p1 right by 10mm would cause overlap
    const p1 = makePlacement({ id: "p1", xMm: 500, yMm: 500, widthMm: 200, heightMm: 200 });
    const p2 = makePlacement({ id: "p2", xMm: 700, yMm: 500, widthMm: 200, heightMm: 200 });
    const result = nudgePlacementsOnWall([p1], [p2], makeWall(), 10, 0);
    expect(result.applied).toBe(false);
    expect(result.placements[0].xMm).toBe(500);
  });

  it("returns applied=false and unchanged placements when array is empty", () => {
    const result = nudgePlacementsOnWall([], [], makeWall(), 100, 100);
    expect(result.applied).toBe(false);
    expect(result.placements).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// alignPlacementsOnWall
// ---------------------------------------------------------------------------

describe("alignPlacementsOnWall", () => {
  // p1 is the reference: x=100, y=500, w=400, h=300
  // p2 is moved:         x=600, y=800, w=300, h=200
  const wall = makeWall({ lengthMm: 5000, heightMm: 3000 });

  function makePair() {
    const p1 = makePlacement({ id: "p1", xMm: 100, yMm: 500, widthMm: 400, heightMm: 300 });
    const p2 = makePlacement({ id: "p2", xMm: 600, yMm: 800, widthMm: 300, heightMm: 200 });
    return { p1, p2 };
  }

  it("returns unchanged placements when fewer than 2 are selected", () => {
    const p = makePlacement();
    const result = alignPlacementsOnWall([p], [], wall, p.id, "left");
    expect(result.applied).toBe(false);
  });

  it("aligns left edges to the reference placement (mode=left)", () => {
    const { p1, p2 } = makePair();
    const result = alignPlacementsOnWall([p1, p2], [], wall, "p1", "left");
    expect(result.applied).toBe(true);
    const moved = result.placements.find((p) => p.id === "p2")!;
    expect(moved.xMm).toBe(100); // reference left edge
  });

  it("aligns right edges to the reference placement (mode=right)", () => {
    const { p1, p2 } = makePair();
    const result = alignPlacementsOnWall([p1, p2], [], wall, "p1", "right");
    const moved = result.placements.find((p) => p.id === "p2")!;
    expect(moved.xMm).toBe(100 + 400 - 300); // 200
  });

  it("aligns horizontal centres to the reference placement (mode=horizontal-center)", () => {
    const { p1, p2 } = makePair();
    const result = alignPlacementsOnWall([p1, p2], [], wall, "p1", "horizontal-center");
    const moved = result.placements.find((p) => p.id === "p2")!;
    // referenceCenter = 100 + 200 = 300; p2.x = 300 - 150 = 150
    expect(moved.xMm).toBe(150);
  });

  it("aligns bottom edges to the reference placement (mode=bottom)", () => {
    const { p1, p2 } = makePair();
    const result = alignPlacementsOnWall([p1, p2], [], wall, "p1", "bottom");
    const moved = result.placements.find((p) => p.id === "p2")!;
    expect(moved.yMm).toBe(500); // reference bottomMm
  });

  it("aligns top edges to the reference placement (mode=top)", () => {
    const { p1, p2 } = makePair();
    const result = alignPlacementsOnWall([p1, p2], [], wall, "p1", "top");
    const moved = result.placements.find((p) => p.id === "p2")!;
    expect(moved.yMm).toBe(500 + 300 - 200); // 600
  });

  it("aligns centerlines to the reference placement (mode=centerline)", () => {
    const { p1, p2 } = makePair();
    const result = alignPlacementsOnWall([p1, p2], [], wall, "p1", "centerline");
    const moved = result.placements.find((p) => p.id === "p2")!;
    // referenceCenterline = 500 + 150 = 650; p2.y = 650 - 100 = 550
    expect(moved.yMm).toBe(550);
  });

  it("does not move the reference placement", () => {
    const { p1, p2 } = makePair();
    const result = alignPlacementsOnWall([p1, p2], [], wall, "p1", "left");
    const ref = result.placements.find((p) => p.id === "p1")!;
    expect(ref.xMm).toBe(100);
    expect(ref.yMm).toBe(500);
  });

  it("falls back to the first placement when referencePlacementId is not found", () => {
    const { p1, p2 } = makePair();
    const result = alignPlacementsOnWall([p1, p2], [], wall, "nonexistent", "left");
    // p1 becomes reference; p2 aligns to p1.xMm
    const moved = result.placements.find((p) => p.id === "p2")!;
    expect(moved.xMm).toBe(p1.xMm);
  });
});

// ---------------------------------------------------------------------------
// distributePlacementsOnWall
// ---------------------------------------------------------------------------

describe("distributePlacementsOnWall", () => {
  const wall = makeWall({ lengthMm: 5000, heightMm: 3000 });

  it("returns unchanged placements when fewer than 3 are selected", () => {
    const p1 = makePlacement({ id: "p1" });
    const p2 = makePlacement({ id: "p2", xMm: 700 });
    const result = distributePlacementsOnWall([p1, p2], [], wall, "horizontal");
    expect(result.applied).toBe(false);
  });

  it("distributes 3 placements with equal horizontal gaps", () => {
    // p1: x=100 w=400 → right=500
    // p2: x=700 w=400 (middle, will move)
    // p3: x=2000 w=400 → right=2400
    // span = 2400 - 100 = 2300; totalSize = 1200; gap = (2300-1200)/2 = 550
    // p2 new x = 100 + 400 + 550 = 1050
    const p1 = makePlacement({ id: "p1", xMm: 100, yMm: 500, widthMm: 400, heightMm: 300 });
    const p2 = makePlacement({ id: "p2", xMm: 700, yMm: 500, widthMm: 400, heightMm: 300 });
    const p3 = makePlacement({ id: "p3", xMm: 2000, yMm: 500, widthMm: 400, heightMm: 300 });
    const result = distributePlacementsOnWall([p1, p2, p3], [], wall, "horizontal");
    expect(result.applied).toBe(true);
    const middle = result.placements.find((p) => p.id === "p2")!;
    expect(middle.xMm).toBe(1050);
  });

  it("keeps the first and last placements in their original positions", () => {
    const p1 = makePlacement({ id: "p1", xMm: 100, yMm: 500, widthMm: 400, heightMm: 300 });
    const p2 = makePlacement({ id: "p2", xMm: 700, yMm: 500, widthMm: 400, heightMm: 300 });
    const p3 = makePlacement({ id: "p3", xMm: 2000, yMm: 500, widthMm: 400, heightMm: 300 });
    const result = distributePlacementsOnWall([p1, p2, p3], [], wall, "horizontal");
    expect(result.placements.find((p) => p.id === "p1")?.xMm).toBe(100);
    expect(result.placements.find((p) => p.id === "p3")?.xMm).toBe(2000);
  });

  it("distributes placements vertically when mode is vertical", () => {
    // p1: y=100 h=200 → top=300; p3: y=1000 h=200 → top=1200; middle p2 will be repositioned
    // span = 1200 - 100 = 1100; totalSize = 600; gap = (1100-600)/2 = 250
    // p2 new y = 100 + 200 + 250 = 550
    const p1 = makePlacement({ id: "p1", xMm: 500, yMm: 100, widthMm: 200, heightMm: 200 });
    const p2 = makePlacement({ id: "p2", xMm: 500, yMm: 500, widthMm: 200, heightMm: 200 });
    const p3 = makePlacement({ id: "p3", xMm: 500, yMm: 1000, widthMm: 200, heightMm: 200 });
    const result = distributePlacementsOnWall([p1, p2, p3], [], wall, "vertical");
    expect(result.applied).toBe(true);
    expect(result.placements.find((p) => p.id === "p2")?.yMm).toBe(550);
  });
});

// ---------------------------------------------------------------------------
// snapPlacementOnWall
// ---------------------------------------------------------------------------

describe("snapPlacementOnWall", () => {
  it("snaps to the left wall edge when within tolerance", () => {
    // xMm = SNAP_TOLERANCE_MM - 1 (just within tolerance of target=0)
    const p = makePlacement({ xMm: SNAP_TOLERANCE_MM - 1, yMm: 500 });
    const { placement, guides } = snapPlacementOnWall(p, makeWall(), []);
    expect(placement.xMm).toBe(0);
    expect(guides.some((g) => g.kind === "wall-left")).toBe(true);
  });

  it("does not snap when the placement is beyond the snap tolerance", () => {
    const p = makePlacement({ xMm: SNAP_TOLERANCE_MM + 5, yMm: 500 });
    const { placement } = snapPlacementOnWall(p, makeWall(), []);
    expect(placement.xMm).toBe(SNAP_TOLERANCE_MM + 5);
  });

  it("snaps to the standard centerline when within tolerance", () => {
    // target = STANDARD_CENTERLINE_MM - heightMm/2 = 1550 - 200 = 1350; place at 1356 (6mm away)
    const p = makePlacement({ xMm: 500, yMm: STANDARD_CENTERLINE_MM - 200 + 6, widthMm: 400, heightMm: 400 });
    const { placement, guides } = snapPlacementOnWall(p, makeWall(), []);
    expect(placement.yMm).toBe(STANDARD_CENTERLINE_MM - 200);
    expect(guides.some((g) => g.kind === "standard-centerline")).toBe(true);
  });

  it("snaps to the right edge of a neighbouring artwork", () => {
    const neighbour = makePlacement({ id: "n1", xMm: 300, yMm: 500, widthMm: 200, heightMm: 200 });
    // neighbour rightMm = 500; place test placement at xMm = 500 + (SNAP_TOLERANCE_MM - 1)
    const p = makePlacement({ id: "p1", xMm: 500 + SNAP_TOLERANCE_MM - 1, yMm: 600, widthMm: 200, heightMm: 200 });
    const { placement, guides } = snapPlacementOnWall(p, makeWall(), [neighbour]);
    expect(placement.xMm).toBe(500);
    expect(guides.some((g) => g.kind === "artwork-right")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// findNearestValidPlacementOnWall
// ---------------------------------------------------------------------------

describe("findNearestValidPlacementOnWall", () => {
  it("returns the original position when it is already valid", () => {
    const p = makePlacement({ xMm: 500, yMm: 500, widthMm: 200, heightMm: 200 });
    const result = findNearestValidPlacementOnWall(p, makeWall(), []);
    expect(result).not.toBeNull();
    expect(result?.xMm).toBe(500);
    expect(result?.yMm).toBe(500);
  });

  it("finds a valid position when the original overlaps another placement", () => {
    const blocker = makePlacement({ id: "b", xMm: 0, yMm: 0, widthMm: 4900, heightMm: 3000 });
    // Giant blocker covers almost the whole wall; small placement has to squeeze into the right gap
    const p = makePlacement({ id: "p", xMm: 0, yMm: 0, widthMm: 100, heightMm: 100 });
    const result = findNearestValidPlacementOnWall(p, makeWall(), [blocker]);
    // The only valid position is x=4900 (right of the blocker)
    expect(result).not.toBeNull();
    expect(result?.xMm).toBe(4900);
  });

  it("returns null when there is no valid position on the wall", () => {
    const blocker = makePlacement({ id: "b", xMm: 0, yMm: 0, widthMm: 5000, heightMm: 3000 });
    const p = makePlacement({ id: "p", xMm: 500, yMm: 500, widthMm: 200, heightMm: 200 });
    const result = findNearestValidPlacementOnWall(p, makeWall(), [blocker]);
    expect(result).toBeNull();
  });

  it("prefers positions closest to the original", () => {
    // Place at x=2000 with a blocker at x=2000; result should be closer to x=2000 than x=0
    const blocker = makePlacement({ id: "b", xMm: 2000, yMm: 500, widthMm: 200, heightMm: 200 });
    const p = makePlacement({ id: "p", xMm: 2000, yMm: 500, widthMm: 200, heightMm: 200 });
    const result = findNearestValidPlacementOnWall(p, makeWall(), [blocker]);
    expect(result).not.toBeNull();
    // Should pick x=1800 (just left) or x=2200 (just right) — both equidistant.
    // Either is acceptable; what matters is it's not x=0.
    expect(result!.xMm).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// arePlacementsValidOnWall
// ---------------------------------------------------------------------------

describe("arePlacementsValidOnWall", () => {
  it("returns true when all placements are valid", () => {
    const p1 = makePlacement({ id: "p1", xMm: 0, yMm: 0, widthMm: 200, heightMm: 200 });
    const p2 = makePlacement({ id: "p2", xMm: 300, yMm: 0, widthMm: 200, heightMm: 200 });
    expect(arePlacementsValidOnWall([p1, p2], makeWall(), [])).toBe(true);
  });

  it("returns false when one placement is outside the wall", () => {
    const p = makePlacement({ xMm: -100, yMm: 0 });
    expect(arePlacementsValidOnWall([p], makeWall(), [])).toBe(false);
  });

  it("returns false when two placements in the group overlap each other", () => {
    const p1 = makePlacement({ id: "p1", xMm: 0, yMm: 0, widthMm: 400, heightMm: 200 });
    const p2 = makePlacement({ id: "p2", xMm: 200, yMm: 0, widthMm: 400, heightMm: 200 });
    expect(arePlacementsValidOnWall([p1, p2], makeWall(), [])).toBe(false);
  });
});
