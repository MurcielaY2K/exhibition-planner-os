export type PlannerView = "elevation" | "plan" | "spatial";

export interface Project {
  id: string;
  name: string;
  venueName: string;
  status: "draft";
  updatedAt: string;
}

export interface Room {
  id: string;
  projectId: string;
  name: string;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  wallIds: string[];
}

export interface Wall {
  id: string;
  roomId: string;
  name: "Wall A" | "Wall B" | "Wall C" | "Wall D";
  index: 0 | 1 | 2 | 3;
  lengthMm: number;
  heightMm: number;
}

export interface Artwork {
  id: string;
  projectId: string;
  title: string;
  artist: string;
  widthMm: number;
  heightMm: number;
  depthMm?: number;
  year?: string;
  medium?: string;
  imageUrl?: string;
}

export type OpeningType = "door" | "window";
export type MountType =
  | "standard-hook"
  | "cleat"
  | "direct-fix"
  | "rail"
  | "shelf"
  | "pedestal"
  | "other";
export type SpecialHandlingType =
  | "none"
  | "fragile"
  | "glazed"
  | "oversized"
  | "condition-sensitive"
  | "custom";

export interface HangingPoint {
  xMm: number;
  yMm: number;
  label: string;
}

export interface DrillPointFix {
  kind: "nudge-placement" | "change-mount";
  label: string;
  nextXmm?: number;
  nextYmm?: number;
  deltaXmm?: number;
  deltaYmm?: number;
  mountType?: MountType;
}

export interface DrillPointWarning {
  code:
    | "edge-left"
    | "edge-right"
    | "height-low"
    | "height-high"
    | "opening-clearance"
    | "drill-point-clearance"
    | "mount-mismatch";
  severity: "warning" | "error";
  pointLabel?: string;
  measuredMm?: number;
  thresholdMm?: number;
  suggestion?: string;
  fix?: DrillPointFix;
  message: string;
}

export interface Opening {
  id: string;
  wallId: string;
  type: OpeningType;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  label?: string;
}

export interface Placement {
  id: string;
  projectId: string;
  artworkId: string;
  wallId: string;
  widthMm: number;
  heightMm: number;
  xMm: number;
  yMm: number;
  installId: string;
  installNotes: string;
  priorityOrder: number;
  mountType: MountType;
  isLocked: boolean;
  requiresTeamLift: boolean;
  specialHandling: SpecialHandlingType;
}

export interface ProjectLight {
  id: string;
  projectId: string;
  roomId: string;
  label: string;
  xMm: number;
  zMm: number;
  heightMm: number;
  intensity: number;
  temperatureK: number;
  beamAngleDeg: number;
  enabled: boolean;
}

export interface PlacementBoundingBox {
  leftMm: number;
  rightMm: number;
  bottomMm: number;
  topMm: number;
  widthMm: number;
  heightMm: number;
}

export interface PlacementIssue {
  code:
    | "outside-left"
    | "outside-right"
    | "outside-bottom"
    | "outside-top"
    | "collision"
    | "opening-overlap";
  message: string;
}

export interface PlacementValidation {
  boundingBox: PlacementBoundingBox;
  issues: PlacementIssue[];
  isValid: boolean;
}

export interface SnapGuide {
  axis: "x" | "y";
  kind:
    | "wall-left"
    | "wall-right"
    | "wall-bottom"
    | "wall-top"
    | "standard-centerline"
    | "artwork-left"
    | "artwork-right"
    | "artwork-bottom"
    | "artwork-top";
  sourcePlacementId?: string;
  targetMm: number;
  lineMm: number;
}

export interface VisualGuide {
  axis: "x" | "y";
  coordinateMm: number;
  label: string;
}

export type AlignmentMode =
  | "left"
  | "right"
  | "horizontal-center"
  | "bottom"
  | "top"
  | "centerline";

export type DistributionMode = "horizontal" | "vertical";

export interface SavedCameraView {
  id: string;
  name: string;
  position: [number, number, number];
  target: [number, number, number];
  wallId?: string;
}

export interface PlannerSelection {
  selectedRoomId: string;
  selectedWallId: string;
  selectedArtworkId?: string;
  selectedOpeningId?: string;
  selectedLightId?: string;
  selectedPlacementIds: string[];
  primaryPlacementId?: string;
  activeView: PlannerView;
  savedCameraViews: SavedCameraView[];
  wallColor: string;
  ambientLight: number;
}

export interface ProjectBundle {
  project: Project;
  rooms: Room[];
  walls: Wall[];
  openings: Opening[];
  lights: ProjectLight[];
  artworks: Artwork[];
  placements: Placement[];
}

export interface CreateProjectInput {
  name: string;
  venueName: string;
  roomName: string;
  widthMm: number;
  depthMm: number;
  heightMm: number;
}
