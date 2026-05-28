import type {
  AlignmentMode,
  DrillPointWarning,
  DistributionMode,
  HangingPoint,
  Opening,
  Placement,
  PlacementBoundingBox,
  PlacementIssue,
  PlacementValidation,
  SnapGuide,
  VisualGuide,
  Wall,
} from "@/lib/domain/types";

export const STANDARD_CENTERLINE_MM = 1550;
export const SNAP_TOLERANCE_MM = 15;
const SINGLE_POINT_TOP_INSET_MM = 150;
const TWO_POINT_TOP_INSET_MM = 150;
const TWO_POINT_MIN_EDGE_INSET_MM = 120;
const TWO_POINT_MAX_EDGE_INSET_MM = 300;
export const DRILL_EDGE_CLEARANCE_MM = 50;
export const DRILL_EDGE_WARNING_CLEARANCE_MM = 100;
export const DRILL_OPENING_CLEARANCE_MM = 50;
export const DRILL_OPENING_WARNING_CLEARANCE_MM = 100;
export const DRILL_POINT_CLEARANCE_MM = 120;
export const DRILL_POINT_WARNING_CLEARANCE_MM = 200;
export const DRILL_MIN_HEIGHT_MM = 200;
export const DRILL_MIN_WARNING_HEIGHT_MM = 300;
export const DRILL_TOP_CLEARANCE_MM = 200;
export const DRILL_TOP_WARNING_CLEARANCE_MM = 300;
export const SINGLE_POINT_LARGE_ARTWORK_WIDTH_MM = 1200;
export const SINGLE_POINT_LARGE_ARTWORK_HEIGHT_MM = 1200;
export const SINGLE_POINT_ERROR_ARTWORK_WIDTH_MM = 1600;
export const SINGLE_POINT_ERROR_ARTWORK_HEIGHT_MM = 1600;
const FIX_NUDGE_BUFFER_MM = 4;

interface PlacementActionResult {
  placements: Placement[];
  guides: VisualGuide[];
  applied: boolean;
}

export function getRectangleBoundingBox(
  xMm: number,
  yMm: number,
  widthMm: number,
  heightMm: number,
): PlacementBoundingBox {
  return {
    leftMm: xMm,
    rightMm: xMm + widthMm,
    bottomMm: yMm,
    topMm: yMm + heightMm,
    widthMm,
    heightMm,
  };
}

export function getPlacementBoundingBox(
  placement: Placement,
): PlacementBoundingBox {
  return getRectangleBoundingBox(
    placement.xMm,
    placement.yMm,
    placement.widthMm,
    placement.heightMm,
  );
}

export function getOpeningBoundingBox(opening: Opening): PlacementBoundingBox {
  return getRectangleBoundingBox(
    opening.xMm,
    opening.yMm,
    opening.widthMm,
    opening.heightMm,
  );
}

export function getPlacementCenterlineMm(placement: Placement) {
  return placement.yMm + placement.heightMm / 2;
}

export function getPlacementHangingPoints(placement: Placement): HangingPoint[] {
  if (placement.mountType === "pedestal") {
    return [];
  }

  const topInsetMm = getTopInsetMm(
    placement.heightMm,
    isTwoPointMount(placement) ? TWO_POINT_TOP_INSET_MM : SINGLE_POINT_TOP_INSET_MM,
  );
  const yMm = placement.yMm + placement.heightMm - topInsetMm;

  if (!isTwoPointMount(placement)) {
    return [
      {
        xMm: placement.xMm + placement.widthMm / 2,
        yMm,
        label: "DP1",
      },
    ];
  }

  const edgeInsetMm = getTwoPointEdgeInsetMm(placement.widthMm);

  if (edgeInsetMm <= 0) {
    return [
      {
        xMm: placement.xMm + placement.widthMm / 2,
        yMm,
        label: "DP1",
      },
    ];
  }

  return [
    {
      xMm: placement.xMm + edgeInsetMm,
      yMm,
      label: "DP1",
    },
    {
      xMm: placement.xMm + placement.widthMm - edgeInsetMm,
      yMm,
      label: "DP2",
    },
  ];
}

export function getPlacementDrillPointWarnings(
  placement: Placement,
  wall: Wall,
  otherPlacements: Placement[],
  openings: Opening[] = [],
): DrillPointWarning[] {
  const warnings: DrillPointWarning[] = [];
  const hangingPoints = getPlacementHangingPoints(placement);

  hangingPoints.forEach((point) => {
    const leftEdgeDistanceMm = point.xMm;
    const rightEdgeDistanceMm = wall.lengthMm - point.xMm;
    const bottomDistanceMm = point.yMm;
    const topDistanceMm = wall.heightMm - point.yMm;

    pushThresholdWarning(
      warnings,
      {
        code: "edge-left",
        pointLabel: point.label,
        measuredMm: leftEdgeDistanceMm,
        errorThresholdMm: DRILL_EDGE_CLEARANCE_MM,
        warningThresholdMm: DRILL_EDGE_WARNING_CLEARANCE_MM,
        lowerIsRiskier: true,
        subject: "left wall edge",
        suggestion: "Move the artwork further right or switch to a mount with a wider point spread.",
        fix: createAxisNudgeFix(
          placement,
          "x",
          DRILL_EDGE_WARNING_CLEARANCE_MM - leftEdgeDistanceMm + FIX_NUDGE_BUFFER_MM,
          "right",
        ),
      },
    );
    pushThresholdWarning(
      warnings,
      {
        code: "edge-right",
        pointLabel: point.label,
        measuredMm: rightEdgeDistanceMm,
        errorThresholdMm: DRILL_EDGE_CLEARANCE_MM,
        warningThresholdMm: DRILL_EDGE_WARNING_CLEARANCE_MM,
        lowerIsRiskier: true,
        subject: "right wall edge",
        suggestion: "Move the artwork further left or switch to a mount with a wider point spread.",
        fix: createAxisNudgeFix(
          placement,
          "x",
          -(DRILL_EDGE_WARNING_CLEARANCE_MM - rightEdgeDistanceMm + FIX_NUDGE_BUFFER_MM),
          "left",
        ),
      },
    );
    pushThresholdWarning(
      warnings,
      {
        code: "height-low",
        pointLabel: point.label,
        measuredMm: bottomDistanceMm,
        errorThresholdMm: DRILL_MIN_HEIGHT_MM,
        warningThresholdMm: DRILL_MIN_WARNING_HEIGHT_MM,
        lowerIsRiskier: true,
        subject: "floor line",
        suggestion: "Raise the artwork or increase the hanging centerline.",
        fix: createAxisNudgeFix(
          placement,
          "y",
          DRILL_MIN_WARNING_HEIGHT_MM - bottomDistanceMm + FIX_NUDGE_BUFFER_MM,
          "up",
        ),
      },
    );
    pushThresholdWarning(
      warnings,
      {
        code: "height-high",
        pointLabel: point.label,
        measuredMm: topDistanceMm,
        errorThresholdMm: DRILL_TOP_CLEARANCE_MM,
        warningThresholdMm: DRILL_TOP_WARNING_CLEARANCE_MM,
        lowerIsRiskier: true,
        subject: "wall top",
        suggestion: "Lower the artwork to restore safer top clearance.",
        fix: createAxisNudgeFix(
          placement,
          "y",
          -(DRILL_TOP_WARNING_CLEARANCE_MM - topDistanceMm + FIX_NUDGE_BUFFER_MM),
          "down",
        ),
      },
    );

    openings
      .filter((opening) => opening.wallId === placement.wallId)
      .forEach((opening) => {
        const openingBox = getOpeningBoundingBox(opening);
        const clearanceMm = getPointToBoundingBoxDistanceMm(point, openingBox);
        const openingLabel = opening.label ?? `the ${opening.type}`;

        pushThresholdWarning(
          warnings,
          {
            code: "opening-clearance",
            pointLabel: point.label,
            measuredMm: clearanceMm,
            errorThresholdMm: DRILL_OPENING_CLEARANCE_MM,
            warningThresholdMm: DRILL_OPENING_WARNING_CLEARANCE_MM,
            lowerIsRiskier: true,
            subject: openingLabel,
            suggestion: "Shift the artwork away from the opening or use another wall position.",
            fix: createOpeningClearanceFix(
              placement,
              point,
              openingBox,
              DRILL_OPENING_WARNING_CLEARANCE_MM,
            ),
          },
        );
      });

    otherPlacements
      .filter((otherPlacement) => otherPlacement.id !== placement.id)
      .flatMap((otherPlacement) => getPlacementHangingPoints(otherPlacement))
      .forEach((otherPoint) => {
        const distanceMm = getPointDistanceMm(point, otherPoint);
        pushThresholdWarning(
          warnings,
          {
            code: "drill-point-clearance",
            pointLabel: point.label,
            measuredMm: distanceMm,
            errorThresholdMm: DRILL_POINT_CLEARANCE_MM,
            warningThresholdMm: DRILL_POINT_WARNING_CLEARANCE_MM,
            lowerIsRiskier: true,
            subject: `${otherPoint.label} on a neighboring artwork`,
            suggestion: "Increase spacing between artworks or change mount distribution.",
            fix: createDrillSpacingFix(
              placement,
              point,
              otherPoint,
              DRILL_POINT_WARNING_CLEARANCE_MM,
            ),
          },
        );
      });
  });

  if (
    hangingPoints.length === 1 &&
    (placement.widthMm > SINGLE_POINT_ERROR_ARTWORK_WIDTH_MM ||
      placement.heightMm > SINGLE_POINT_ERROR_ARTWORK_HEIGHT_MM ||
      placement.requiresTeamLift ||
      placement.specialHandling === "oversized")
  ) {
    warnings.push(
      createDrillPointWarning({
        code: "mount-mismatch",
        severity: "error",
        measuredMm: Math.max(placement.widthMm, placement.heightMm),
        thresholdMm: Math.max(
          SINGLE_POINT_ERROR_ARTWORK_WIDTH_MM,
          SINGLE_POINT_ERROR_ARTWORK_HEIGHT_MM,
        ),
        message:
          "Single-point support is too risky for this object profile. Measured size or handling risk exceeds the single-point error threshold.",
        suggestion: "Switch to a two-point mount before installation.",
        fix: {
          kind: "change-mount",
          label:
            "Switch to rail mount. Result: adds two drill points and distributes mounting load.",
          mountType: "rail",
        },
      }),
    );
  } else if (
    hangingPoints.length === 1 &&
    (placement.widthMm > SINGLE_POINT_LARGE_ARTWORK_WIDTH_MM ||
      placement.heightMm > SINGLE_POINT_LARGE_ARTWORK_HEIGHT_MM)
  ) {
    warnings.push(
      createDrillPointWarning({
        code: "mount-mismatch",
        severity: "warning",
        measuredMm: Math.max(placement.widthMm, placement.heightMm),
        thresholdMm: Math.max(
          SINGLE_POINT_LARGE_ARTWORK_WIDTH_MM,
          SINGLE_POINT_LARGE_ARTWORK_HEIGHT_MM,
        ),
        message:
          "Single-point support may be insufficient for this artwork size. The object exceeds the preferred single-point size threshold.",
        suggestion: "Consider a two-point mount for better stability.",
        fix: {
          kind: "change-mount",
          label:
            "Switch to rail mount. Result: adds two drill points and distributes mounting load.",
          mountType: "rail",
        },
      }),
    );
  }

  return dedupeDrillWarnings(warnings);
}

export function boxesOverlap(
  left: PlacementBoundingBox,
  right: PlacementBoundingBox,
) {
  return !(
    left.rightMm <= right.leftMm ||
    left.leftMm >= right.rightMm ||
    left.topMm <= right.bottomMm ||
    left.bottomMm >= right.topMm
  );
}

export function getPlacementValidation(
  placement: Placement,
  wall: Wall,
  otherPlacements: Placement[],
  openings: Opening[] = [],
): PlacementValidation {
  const boundingBox = getPlacementBoundingBox(placement);
  const issues: PlacementIssue[] = [];

  if (boundingBox.leftMm < 0) {
    issues.push({
      code: "outside-left",
      message: "Artwork extends past the left wall edge.",
    });
  }

  if (boundingBox.rightMm > wall.lengthMm) {
    issues.push({
      code: "outside-right",
      message: "Artwork extends past the right wall edge.",
    });
  }

  if (boundingBox.bottomMm < 0) {
    issues.push({
      code: "outside-bottom",
      message: "Artwork extends below the floor line.",
    });
  }

  if (boundingBox.topMm > wall.heightMm) {
    issues.push({
      code: "outside-top",
      message: "Artwork extends above the wall height.",
    });
  }

  const collidingPlacement = otherPlacements.find((otherPlacement) => {
    if (otherPlacement.id === placement.id || otherPlacement.wallId !== placement.wallId) {
      return false;
    }

    return boxesOverlap(boundingBox, getPlacementBoundingBox(otherPlacement));
  });

  if (collidingPlacement) {
    issues.push({
      code: "collision",
      message: "Artwork overlaps another artwork on this wall.",
    });
  }

  const collidingOpening = openings.find((opening) => {
    if (opening.wallId !== placement.wallId) {
      return false;
    }

    return boxesOverlap(boundingBox, getOpeningBoundingBox(opening));
  });

  if (collidingOpening) {
    issues.push({
      code: "opening-overlap",
      message: `Artwork overlaps ${collidingOpening.label ?? `a ${collidingOpening.type}`}.`,
    });
  }

  return {
    boundingBox,
    issues,
    isValid: issues.length === 0,
  };
}

export function clampPlacementToWall(
  placement: Placement,
  wall: Wall,
): Placement {
  return {
    ...placement,
    xMm: clamp(placement.xMm, 0, Math.max(wall.lengthMm - placement.widthMm, 0)),
    yMm: clamp(placement.yMm, 0, Math.max(wall.heightMm - placement.heightMm, 0)),
  };
}

export function clampOpeningToWall(opening: Opening, wall: Wall): Opening {
  const widthMm = clamp(opening.widthMm, 1, Math.max(wall.lengthMm, 1));
  const heightMm = clamp(opening.heightMm, 1, Math.max(wall.heightMm, 1));

  return {
    ...opening,
    widthMm,
    heightMm,
    xMm: clamp(opening.xMm, 0, Math.max(wall.lengthMm - widthMm, 0)),
    yMm: clamp(opening.yMm, 0, Math.max(wall.heightMm - heightMm, 0)),
  };
}

export function syncPlacementSize(
  placement: Placement,
  widthMm: number,
  heightMm: number,
) {
  return {
    ...placement,
    widthMm,
    heightMm,
  };
}

export function findNearestValidPlacementOnWall(
  placement: Placement,
  wall: Wall,
  otherPlacements: Placement[],
  openings: Opening[] = [],
) {
  const candidateXs = new Set<number>([
    clamp(placement.xMm, 0, Math.max(wall.lengthMm - placement.widthMm, 0)),
    0,
    Math.max(wall.lengthMm - placement.widthMm, 0),
  ]);
  const candidateYs = new Set<number>([
    clamp(placement.yMm, 0, Math.max(wall.heightMm - placement.heightMm, 0)),
    0,
    Math.max(wall.heightMm - placement.heightMm, 0),
    clamp(
      STANDARD_CENTERLINE_MM - placement.heightMm / 2,
      0,
      Math.max(wall.heightMm - placement.heightMm, 0),
    ),
  ]);

  otherPlacements
    .filter((otherPlacement) => otherPlacement.wallId === placement.wallId)
    .forEach((otherPlacement) => {
      const box = getPlacementBoundingBox(otherPlacement);
      candidateXs.add(clamp(box.leftMm, 0, Math.max(wall.lengthMm - placement.widthMm, 0)));
      candidateXs.add(clamp(box.rightMm, 0, Math.max(wall.lengthMm - placement.widthMm, 0)));
      candidateXs.add(
        clamp(box.leftMm - placement.widthMm, 0, Math.max(wall.lengthMm - placement.widthMm, 0)),
      );
      candidateXs.add(
        clamp(box.rightMm - placement.widthMm, 0, Math.max(wall.lengthMm - placement.widthMm, 0)),
      );

      candidateYs.add(clamp(box.bottomMm, 0, Math.max(wall.heightMm - placement.heightMm, 0)));
      candidateYs.add(clamp(box.topMm, 0, Math.max(wall.heightMm - placement.heightMm, 0)));
      candidateYs.add(
        clamp(box.bottomMm - placement.heightMm, 0, Math.max(wall.heightMm - placement.heightMm, 0)),
      );
      candidateYs.add(
        clamp(box.topMm - placement.heightMm, 0, Math.max(wall.heightMm - placement.heightMm, 0)),
      );
    });

  openings
    .filter((opening) => opening.wallId === placement.wallId)
    .forEach((opening) => {
      const box = getOpeningBoundingBox(opening);
      candidateXs.add(clamp(box.leftMm, 0, Math.max(wall.lengthMm - placement.widthMm, 0)));
      candidateXs.add(clamp(box.rightMm, 0, Math.max(wall.lengthMm - placement.widthMm, 0)));
      candidateXs.add(
        clamp(box.leftMm - placement.widthMm, 0, Math.max(wall.lengthMm - placement.widthMm, 0)),
      );
      candidateXs.add(
        clamp(box.rightMm - placement.widthMm, 0, Math.max(wall.lengthMm - placement.widthMm, 0)),
      );

      candidateYs.add(clamp(box.bottomMm, 0, Math.max(wall.heightMm - placement.heightMm, 0)));
      candidateYs.add(clamp(box.topMm, 0, Math.max(wall.heightMm - placement.heightMm, 0)));
      candidateYs.add(
        clamp(box.bottomMm - placement.heightMm, 0, Math.max(wall.heightMm - placement.heightMm, 0)),
      );
      candidateYs.add(
        clamp(box.topMm - placement.heightMm, 0, Math.max(wall.heightMm - placement.heightMm, 0)),
      );
    });

  const candidates = Array.from(candidateXs).flatMap((xMm) =>
    Array.from(candidateYs).map((yMm) => ({ ...placement, xMm, yMm })),
  );

  const validCandidates = candidates.filter((candidate) =>
    getPlacementValidation(candidate, wall, otherPlacements, openings).isValid,
  );

  if (validCandidates.length === 0) {
    return null;
  }

  return validCandidates.sort((left, right) => {
    const leftDistance =
      Math.abs(left.xMm - placement.xMm) + Math.abs(left.yMm - placement.yMm);
    const rightDistance =
      Math.abs(right.xMm - placement.xMm) + Math.abs(right.yMm - placement.yMm);

    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }

    if (left.yMm !== right.yMm) {
      return left.yMm - right.yMm;
    }

    return left.xMm - right.xMm;
  })[0];
}

export function snapPlacementOnWall(
  placement: Placement,
  wall: Wall,
  otherPlacements: Placement[],
): { placement: Placement; guides: SnapGuide[] } {
  let snappedPlacement = { ...placement };
  const guides: SnapGuide[] = [];

  const xCandidates: SnapGuide[] = [
    { axis: "x", kind: "wall-left", targetMm: 0, lineMm: 0 },
    {
      axis: "x",
      kind: "wall-right",
      targetMm: Math.max(wall.lengthMm - placement.widthMm, 0),
      lineMm: wall.lengthMm,
    },
  ];
  const yCandidates: SnapGuide[] = [
    { axis: "y", kind: "wall-bottom", targetMm: 0, lineMm: 0 },
    {
      axis: "y",
      kind: "wall-top",
      targetMm: Math.max(wall.heightMm - placement.heightMm, 0),
      lineMm: wall.heightMm,
    },
    {
      axis: "y",
      kind: "standard-centerline",
      targetMm: STANDARD_CENTERLINE_MM - placement.heightMm / 2,
      lineMm: STANDARD_CENTERLINE_MM,
    },
  ];

  otherPlacements.forEach((otherPlacement) => {
    if (otherPlacement.id === placement.id || otherPlacement.wallId !== placement.wallId) {
      return;
    }

    const otherBox = getPlacementBoundingBox(otherPlacement);
    xCandidates.push(
      {
        axis: "x",
        kind: "artwork-left",
        sourcePlacementId: otherPlacement.id,
        targetMm: otherBox.leftMm,
        lineMm: otherBox.leftMm,
      },
      {
        axis: "x",
        kind: "artwork-right",
        sourcePlacementId: otherPlacement.id,
        targetMm: otherBox.rightMm,
        lineMm: otherBox.rightMm,
      },
      {
        axis: "x",
        kind: "artwork-left",
        sourcePlacementId: otherPlacement.id,
        targetMm: otherBox.leftMm - placement.widthMm,
        lineMm: otherBox.leftMm,
      },
      {
        axis: "x",
        kind: "artwork-right",
        sourcePlacementId: otherPlacement.id,
        targetMm: otherBox.rightMm - placement.widthMm,
        lineMm: otherBox.rightMm,
      },
    );
    yCandidates.push(
      {
        axis: "y",
        kind: "artwork-bottom",
        sourcePlacementId: otherPlacement.id,
        targetMm: otherBox.bottomMm,
        lineMm: otherBox.bottomMm,
      },
      {
        axis: "y",
        kind: "artwork-top",
        sourcePlacementId: otherPlacement.id,
        targetMm: otherBox.topMm,
        lineMm: otherBox.topMm,
      },
      {
        axis: "y",
        kind: "artwork-bottom",
        sourcePlacementId: otherPlacement.id,
        targetMm: otherBox.bottomMm - placement.heightMm,
        lineMm: otherBox.bottomMm,
      },
      {
        axis: "y",
        kind: "artwork-top",
        sourcePlacementId: otherPlacement.id,
        targetMm: otherBox.topMm - placement.heightMm,
        lineMm: otherBox.topMm,
      },
    );
  });

  const xGuide = findNearestGuide(placement.xMm, xCandidates);
  if (xGuide) {
    snappedPlacement = { ...snappedPlacement, xMm: xGuide.targetMm };
    guides.push(xGuide);
  }

  const yGuide = findNearestGuide(placement.yMm, yCandidates);
  if (yGuide) {
    snappedPlacement = { ...snappedPlacement, yMm: yGuide.targetMm };
    guides.push(yGuide);
  }

  return {
    placement: snappedPlacement,
    guides,
  };
}

export function translatePlacement(
  placement: Placement,
  deltaXmm: number,
  deltaYmm: number,
) {
  return {
    ...placement,
    xMm: placement.xMm + deltaXmm,
    yMm: placement.yMm + deltaYmm,
  };
}

export function clampGroupDeltaToWall(
  placements: Placement[],
  wall: Wall,
  deltaXmm: number,
  deltaYmm: number,
) {
  const groupBounds = getPlacementGroupBounds(placements);

  if (!groupBounds) {
    return { deltaXmm, deltaYmm };
  }

  const minDeltaX = -groupBounds.leftMm;
  const maxDeltaX = wall.lengthMm - groupBounds.rightMm;
  const minDeltaY = -groupBounds.bottomMm;
  const maxDeltaY = wall.heightMm - groupBounds.topMm;

  return {
    deltaXmm: clamp(deltaXmm, minDeltaX, maxDeltaX),
    deltaYmm: clamp(deltaYmm, minDeltaY, maxDeltaY),
  };
}

export function getPlacementGroupBounds(placements: Placement[]) {
  if (placements.length === 0) {
    return null;
  }

  return placements
    .map(getPlacementBoundingBox)
    .reduce((accumulator, box) => ({
      leftMm: Math.min(accumulator.leftMm, box.leftMm),
      rightMm: Math.max(accumulator.rightMm, box.rightMm),
      bottomMm: Math.min(accumulator.bottomMm, box.bottomMm),
      topMm: Math.max(accumulator.topMm, box.topMm),
      widthMm: 0,
      heightMm: 0,
    }));
}

export function arePlacementsValidOnWall(
  placements: Placement[],
  wall: Wall,
  stationaryPlacements: Placement[],
  openings: Opening[] = [],
) {
  return placements.every((placement) =>
    getPlacementValidation(
      placement,
      wall,
      [...stationaryPlacements, ...placements.filter((entry) => entry.id !== placement.id)],
      openings,
    ).isValid,
  );
}

export function nudgePlacementsOnWall(
  selectedPlacements: Placement[],
  stationaryPlacements: Placement[],
  wall: Wall,
  deltaXmm: number,
  deltaYmm: number,
  openings: Opening[] = [],
): PlacementActionResult {
  if (selectedPlacements.length === 0) {
    return { placements: selectedPlacements, guides: [], applied: false };
  }

  const clampedDelta = clampGroupDeltaToWall(
    selectedPlacements,
    wall,
    deltaXmm,
    deltaYmm,
  );
  const candidatePlacements = selectedPlacements.map((placement) =>
    translatePlacement(placement, clampedDelta.deltaXmm, clampedDelta.deltaYmm),
  );

  if (!arePlacementsValidOnWall(candidatePlacements, wall, stationaryPlacements, openings)) {
    return { placements: selectedPlacements, guides: [], applied: false };
  }

  return {
    placements: candidatePlacements,
    guides: [],
    applied:
      clampedDelta.deltaXmm !== 0 || clampedDelta.deltaYmm !== 0,
  };
}

export function alignPlacementsOnWall(
  selectedPlacements: Placement[],
  stationaryPlacements: Placement[],
  wall: Wall,
  referencePlacementId: string | undefined,
  mode: AlignmentMode,
  openings: Opening[] = [],
): PlacementActionResult {
  if (selectedPlacements.length < 2) {
    return { placements: selectedPlacements, guides: [], applied: false };
  }

  const referencePlacement =
    selectedPlacements.find((placement) => placement.id === referencePlacementId) ??
    selectedPlacements[0];
  const referenceBox = getPlacementBoundingBox(referencePlacement);
  const referenceCenterX = referenceBox.leftMm + referenceBox.widthMm / 2;
  const referenceCenterline = getPlacementCenterlineMm(referencePlacement);
  const candidatePlacements = selectedPlacements.map((placement) => {
    if (placement.id === referencePlacement.id) {
      return placement;
    }

    if (mode === "left") {
      return { ...placement, xMm: referenceBox.leftMm };
    }

    if (mode === "right") {
      return {
        ...placement,
        xMm: referenceBox.rightMm - placement.widthMm,
      };
    }

    if (mode === "horizontal-center") {
      return {
        ...placement,
        xMm: referenceCenterX - placement.widthMm / 2,
      };
    }

    if (mode === "bottom") {
      return { ...placement, yMm: referenceBox.bottomMm };
    }

    if (mode === "top") {
      return {
        ...placement,
        yMm: referenceBox.topMm - placement.heightMm,
      };
    }

    return {
      ...placement,
      yMm: referenceCenterline - placement.heightMm / 2,
    };
  });

  if (!arePlacementsValidOnWall(candidatePlacements, wall, stationaryPlacements, openings)) {
    return { placements: selectedPlacements, guides: [], applied: false };
  }

  const guides = getAlignmentGuides(referencePlacement, mode);

  return { placements: candidatePlacements, guides, applied: true };
}

export function distributePlacementsOnWall(
  selectedPlacements: Placement[],
  stationaryPlacements: Placement[],
  wall: Wall,
  mode: DistributionMode,
  openings: Opening[] = [],
): PlacementActionResult {
  if (selectedPlacements.length < 3) {
    return { placements: selectedPlacements, guides: [], applied: false };
  }

  const sortedPlacements = [...selectedPlacements].sort((left, right) =>
    mode === "horizontal" ? left.xMm - right.xMm : left.yMm - right.yMm,
  );
  const firstPlacement = sortedPlacements[0];
  const lastPlacement = sortedPlacements.at(-1);

  if (!firstPlacement || !lastPlacement) {
    return { placements: selectedPlacements, guides: [], applied: false };
  }

  const firstBox = getPlacementBoundingBox(firstPlacement);
  const lastBox = getPlacementBoundingBox(lastPlacement);

  const totalSize = sortedPlacements.reduce(
    (sum, placement) =>
      sum + (mode === "horizontal" ? placement.widthMm : placement.heightMm),
    0,
  );
  const span =
    mode === "horizontal"
      ? lastBox.rightMm - firstBox.leftMm
      : lastBox.topMm - firstBox.bottomMm;
  const gapMm = (span - totalSize) / (sortedPlacements.length - 1);

  if (!Number.isFinite(gapMm)) {
    return { placements: selectedPlacements, guides: [], applied: false };
  }

  const candidatePlacements: Placement[] = [];
  let cursorMm = mode === "horizontal" ? firstBox.leftMm : firstBox.bottomMm;

  sortedPlacements.forEach((placement, index) => {
    if (index === 0) {
      candidatePlacements.push(placement);
      cursorMm +=
        (mode === "horizontal" ? placement.widthMm : placement.heightMm) + gapMm;
      return;
    }

    if (index === sortedPlacements.length - 1) {
      candidatePlacements.push(placement);
      return;
    }

    const distributedPlacement =
      mode === "horizontal"
        ? { ...placement, xMm: cursorMm }
        : { ...placement, yMm: cursorMm };

    candidatePlacements.push(distributedPlacement);
    cursorMm +=
      (mode === "horizontal" ? placement.widthMm : placement.heightMm) + gapMm;
  });

  if (!arePlacementsValidOnWall(candidatePlacements, wall, stationaryPlacements, openings)) {
    return { placements: selectedPlacements, guides: [], applied: false };
  }

  const guides = getDistributionGuides(
    candidatePlacements,
    mode,
    Math.round(gapMm),
  );

  return { placements: candidatePlacements, guides, applied: true };
}

export function placementPatchesFromPlacements(placements: Placement[]) {
  return placements.map((placement) => ({
    id: placement.id,
    xMm: placement.xMm,
    yMm: placement.yMm,
  }));
}

export function visualGuidesFromSnapGuides(guides: SnapGuide[]): VisualGuide[] {
  return guides.map((guide) => ({
    axis: guide.axis,
    coordinateMm: guide.lineMm,
    label: getSnapGuideLabel(guide),
  }));
}

function findNearestGuide(currentMm: number, guides: SnapGuide[]) {
  let nearestGuide: SnapGuide | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;

  guides.forEach((guide) => {
    const distance = Math.abs(currentMm - guide.targetMm);
    if (distance <= SNAP_TOLERANCE_MM && distance < nearestDistance) {
      nearestGuide = guide;
      nearestDistance = distance;
    }
  });

  return nearestGuide;
}

function isTwoPointMount(placement: Placement) {
  return (
    placement.mountType === "cleat" ||
    placement.mountType === "rail" ||
    placement.mountType === "shelf"
  );
}

function createAxisNudgeFix(
  placement: Placement,
  axis: "x" | "y",
  deltaMm: number,
  directionLabel: string,
): DrillPointWarning["fix"] | undefined {
  const roundedDeltaMm = roundDeltaMm(deltaMm);

  if (roundedDeltaMm === 0) {
    return undefined;
  }

  return {
    kind: "nudge-placement",
    label: `Move artwork ${formatSignedMillimeters(roundedDeltaMm)} ${directionLabel}. Result: repositions the drill points and rechecks clearance at the new wall position.`,
    nextXmm: axis === "x" ? placement.xMm + roundedDeltaMm : placement.xMm,
    nextYmm: axis === "y" ? placement.yMm + roundedDeltaMm : placement.yMm,
    deltaXmm: axis === "x" ? roundedDeltaMm : 0,
    deltaYmm: axis === "y" ? roundedDeltaMm : 0,
  };
}

function createOpeningClearanceFix(
  placement: Placement,
  point: HangingPoint,
  openingBox: PlacementBoundingBox,
  preferredClearanceMm: number,
): DrillPointWarning["fix"] | undefined {
  const horizontalFixes = [
    {
      deltaMm:
        openingBox.leftMm - preferredClearanceMm - point.xMm - FIX_NUDGE_BUFFER_MM,
      directionLabel: "left",
    },
    {
      deltaMm:
        openingBox.rightMm + preferredClearanceMm - point.xMm + FIX_NUDGE_BUFFER_MM,
      directionLabel: "right",
    },
  ]
    .map((entry) => ({
      ...entry,
      roundedDeltaMm: roundDeltaMm(entry.deltaMm),
    }))
    .filter((entry) => entry.roundedDeltaMm !== 0)
    .sort((left, right) => Math.abs(left.roundedDeltaMm) - Math.abs(right.roundedDeltaMm));
  const verticalFixes = [
    {
      deltaMm:
        openingBox.bottomMm - preferredClearanceMm - point.yMm - FIX_NUDGE_BUFFER_MM,
      directionLabel: "down",
    },
    {
      deltaMm:
        openingBox.topMm + preferredClearanceMm - point.yMm + FIX_NUDGE_BUFFER_MM,
      directionLabel: "up",
    },
  ]
    .map((entry) => ({
      ...entry,
      roundedDeltaMm: roundDeltaMm(entry.deltaMm),
    }))
    .filter((entry) => entry.roundedDeltaMm !== 0)
    .sort((left, right) => Math.abs(left.roundedDeltaMm) - Math.abs(right.roundedDeltaMm));
  const bestHorizontalFix = horizontalFixes[0];
  const bestVerticalFix = verticalFixes[0];

  if (
    bestHorizontalFix &&
    (!bestVerticalFix ||
      Math.abs(bestHorizontalFix.roundedDeltaMm) <=
        Math.abs(bestVerticalFix.roundedDeltaMm))
  ) {
    return createAxisNudgeFix(
      placement,
      "x",
      bestHorizontalFix.roundedDeltaMm,
      bestHorizontalFix.directionLabel,
    );
  }

  if (bestVerticalFix) {
    return createAxisNudgeFix(
      placement,
      "y",
      bestVerticalFix.roundedDeltaMm,
      bestVerticalFix.directionLabel,
    );
  }

  return undefined;
}

function createDrillSpacingFix(
  placement: Placement,
  point: HangingPoint,
  otherPoint: HangingPoint,
  preferredClearanceMm: number,
): DrillPointWarning["fix"] | undefined {
  const deltaXmm = point.xMm - otherPoint.xMm;
  const deltaYmm = point.yMm - otherPoint.yMm;
  const horizontalTargetMm = Math.sqrt(
    Math.max(preferredClearanceMm ** 2 - deltaYmm ** 2, 0),
  );
  const verticalTargetMm = Math.sqrt(
    Math.max(preferredClearanceMm ** 2 - deltaXmm ** 2, 0),
  );
  const horizontalFixMm =
    horizontalTargetMm - Math.abs(deltaXmm) + FIX_NUDGE_BUFFER_MM;
  const verticalFixMm =
    verticalTargetMm - Math.abs(deltaYmm) + FIX_NUDGE_BUFFER_MM;
  const moveRight = deltaXmm >= 0;
  const moveUp = deltaYmm >= 0;
  const horizontalSignedMm = roundDeltaMm(
    (moveRight ? 1 : -1) * horizontalFixMm,
  );
  const verticalSignedMm = roundDeltaMm((moveUp ? 1 : -1) * verticalFixMm);

  if (
    horizontalSignedMm !== 0 &&
    (verticalSignedMm === 0 ||
      Math.abs(horizontalSignedMm) <= Math.abs(verticalSignedMm))
  ) {
    return createAxisNudgeFix(
      placement,
      "x",
      horizontalSignedMm,
      moveRight ? "right" : "left",
    );
  }

  if (verticalSignedMm !== 0) {
    return createAxisNudgeFix(
      placement,
      "y",
      verticalSignedMm,
      moveUp ? "up" : "down",
    );
  }

  return undefined;
}

function pushThresholdWarning(
  warnings: DrillPointWarning[],
  input: {
    code: DrillPointWarning["code"];
    pointLabel?: string;
    measuredMm: number;
    errorThresholdMm: number;
    warningThresholdMm: number;
    lowerIsRiskier: boolean;
    subject: string;
    suggestion: string;
    fix?: DrillPointWarning["fix"];
  },
) {
  const severity = getThresholdSeverity(
    input.measuredMm,
    input.errorThresholdMm,
    input.warningThresholdMm,
    input.lowerIsRiskier,
  );

  if (!severity) {
    return;
  }

  warnings.push(
    createDrillPointWarning({
      code: input.code,
      severity,
      pointLabel: input.pointLabel,
      measuredMm: input.measuredMm,
      thresholdMm:
        severity === "error" ? input.errorThresholdMm : input.warningThresholdMm,
      message: buildThresholdWarningMessage(
        input.pointLabel,
        input.subject,
        input.measuredMm,
        severity === "error" ? input.errorThresholdMm : input.warningThresholdMm,
        severity,
      ),
      suggestion: input.suggestion,
      fix: input.fix,
    }),
  );
}

function roundDeltaMm(value: number) {
  return value > 0 ? Math.ceil(value) : value < 0 ? Math.floor(value) : 0;
}

function formatSignedMillimeters(valueMm: number) {
  return `${valueMm > 0 ? "+" : ""}${Math.round(valueMm)} mm`;
}

function getThresholdSeverity(
  measuredMm: number,
  errorThresholdMm: number,
  warningThresholdMm: number,
  lowerIsRiskier: boolean,
): DrillPointWarning["severity"] | null {
  if (lowerIsRiskier) {
    if (measuredMm < errorThresholdMm) {
      return "error";
    }

    if (measuredMm < warningThresholdMm) {
      return "warning";
    }

    return null;
  }

  if (measuredMm > errorThresholdMm) {
    return "error";
  }

  if (measuredMm > warningThresholdMm) {
    return "warning";
  }

  return null;
}

function buildThresholdWarningMessage(
  pointLabel: string | undefined,
  subject: string,
  measuredMm: number,
  thresholdMm: number,
  severity: DrillPointWarning["severity"],
) {
  const prefix = pointLabel ? `${pointLabel}` : "Placement";
  return `${prefix} measures ${Math.round(measuredMm)} mm clearance to ${subject}; required ${severity === "error" ? "minimum" : "preferred minimum"} is ${thresholdMm} mm.`;
}

function createDrillPointWarning(input: DrillPointWarning): DrillPointWarning {
  const actionText = input.fix?.label
    ? ` Recommended action: ${input.fix.label}`
    : input.suggestion
      ? ` Suggested correction: ${input.suggestion}`
      : "";
  const message = `${input.message}${actionText}`;

  return {
    ...input,
    message,
  };
}

function getPointToBoundingBoxDistanceMm(
  point: HangingPoint,
  box: PlacementBoundingBox,
) {
  const deltaXmm =
    point.xMm < box.leftMm
      ? box.leftMm - point.xMm
      : point.xMm > box.rightMm
        ? point.xMm - box.rightMm
        : 0;
  const deltaYmm =
    point.yMm < box.bottomMm
      ? box.bottomMm - point.yMm
      : point.yMm > box.topMm
        ? point.yMm - box.topMm
        : 0;

  return Math.hypot(deltaXmm, deltaYmm);
}

function getPointDistanceMm(left: HangingPoint, right: HangingPoint) {
  return Math.hypot(left.xMm - right.xMm, left.yMm - right.yMm);
}

function dedupeDrillWarnings(warnings: DrillPointWarning[]) {
  const seen = new Set<string>();

  return warnings.filter((warning) => {
    const key = `${warning.code}:${warning.pointLabel ?? ""}:${warning.message}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getTopInsetMm(heightMm: number, targetInsetMm: number) {
  return clamp(targetInsetMm, 40, Math.max(heightMm - 40, 40));
}

function getTwoPointEdgeInsetMm(widthMm: number) {
  const maxInsetMm = Math.max(Math.floor(widthMm / 2) - 60, 0);
  const targetInsetMm = clamp(
    Math.round(widthMm * 0.18),
    TWO_POINT_MIN_EDGE_INSET_MM,
    TWO_POINT_MAX_EDGE_INSET_MM,
  );

  return Math.min(targetInsetMm, maxInsetMm);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getAlignmentGuides(
  referencePlacement: Placement,
  mode: AlignmentMode,
): VisualGuide[] {
  const box = getPlacementBoundingBox(referencePlacement);

  if (mode === "left") {
    return [{ axis: "x", coordinateMm: box.leftMm, label: "Align left" }];
  }

  if (mode === "right") {
    return [{ axis: "x", coordinateMm: box.rightMm, label: "Align right" }];
  }

  if (mode === "horizontal-center") {
    return [
      {
        axis: "x",
        coordinateMm: box.leftMm + box.widthMm / 2,
        label: "Align horizontal center",
      },
    ];
  }

  if (mode === "bottom") {
    return [{ axis: "y", coordinateMm: box.bottomMm, label: "Align bottom" }];
  }

  if (mode === "top") {
    return [{ axis: "y", coordinateMm: box.topMm, label: "Align top" }];
  }

  return [
    {
      axis: "y",
      coordinateMm: getPlacementCenterlineMm(referencePlacement),
      label: "Align centerline",
    },
  ];
}

function getDistributionGuides(
  placements: Placement[],
  mode: DistributionMode,
  gapMm: number,
): VisualGuide[] {
  if (placements.length < 3) {
    return [];
  }

  const sortedPlacements = [...placements].sort((left, right) =>
    mode === "horizontal" ? left.xMm - right.xMm : left.yMm - right.yMm,
  );

  return sortedPlacements.slice(1, -1).map((placement) => {
    const box = getPlacementBoundingBox(placement);

    return {
      axis: mode === "horizontal" ? "x" : "y",
      coordinateMm:
        mode === "horizontal"
          ? box.leftMm + box.widthMm / 2
          : box.bottomMm + box.heightMm / 2,
      label: `${mode === "horizontal" ? "Horizontal" : "Vertical"} gap ${gapMm} mm`,
    };
  });
}

function getSnapGuideLabel(guide: SnapGuide) {
  if (guide.kind === "standard-centerline") {
    return "Centerline";
  }

  if (guide.kind === "wall-left" || guide.kind === "wall-right") {
    return "Wall edge";
  }

  if (guide.kind === "wall-bottom" || guide.kind === "wall-top") {
    return "Wall edge";
  }

  return "Artwork edge";
}


export function getHighestSeverity(
  warnings: DrillPointWarning[],
): DrillPointWarning["severity"] | null {
  if (warnings.some((warning) => warning.severity === "error")) {
    return "error";
  }

  if (warnings.some((warning) => warning.severity === "warning")) {
    return "warning";
  }

  return null;
}
