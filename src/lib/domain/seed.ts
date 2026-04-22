import { createWallsForRoom } from "@/lib/domain/rooms";
import type { PlannerSelection, ProjectBundle, Room } from "@/lib/domain/types";

const projectId = "project-autumn-2026";
const roomId = "room-main-gallery";

const room: Room = {
  id: roomId,
  projectId,
  name: "Main Gallery",
  widthMm: 9600,
  depthMm: 6400,
  heightMm: 3800,
  wallIds: [
    `${roomId}-wall-1`,
    `${roomId}-wall-2`,
    `${roomId}-wall-3`,
    `${roomId}-wall-4`,
  ],
};

export const seedProject: ProjectBundle = {
  project: {
    id: projectId,
    name: "Autumn Exhibition Layout",
    venueName: "North Hall Gallery",
    status: "draft",
    updatedAt: new Date("2026-04-21T10:00:00.000Z").toISOString(),
  },
  rooms: [room],
  walls: createWallsForRoom(room),
  openings: [],
  artworks: [
    {
      id: "artwork-blue-interval",
      projectId,
      title: "Blue Interval",
      artist: "A. Rivera",
      widthMm: 1400,
      heightMm: 1100,
      depthMm: 45,
      year: "2022",
      medium: "Oil on linen",
    },
    {
      id: "artwork-field-notes",
      projectId,
      title: "Field Notes",
      artist: "M. Abbas",
      widthMm: 900,
      heightMm: 1200,
      depthMm: 35,
      year: "2024",
      medium: "Pigment print",
    },
  ],
  placements: [
    {
      id: "placement-blue-interval",
      projectId,
      artworkId: "artwork-blue-interval",
      wallId: `${roomId}-wall-1`,
      widthMm: 1400,
      heightMm: 1100,
      xMm: 1200,
      yMm: 1000,
      installId: "INST-001",
      installNotes: "",
      priorityOrder: 1,
      mountType: "standard-hook",
      isLocked: false,
      requiresTeamLift: false,
      specialHandling: "none",
    },
  ],
};

export const seedSelection: Record<string, PlannerSelection> = {
  [projectId]: {
    selectedRoomId: roomId,
    selectedWallId: `${roomId}-wall-1`,
    selectedArtworkId: "artwork-blue-interval",
    selectedPlacementIds: ["placement-blue-interval"],
    primaryPlacementId: "placement-blue-interval",
    activeView: "elevation",
    savedCameraViews: [],
  },
};
