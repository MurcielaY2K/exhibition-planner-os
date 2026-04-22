import type { Room, Wall } from "@/lib/domain/types";

const WALL_NAMES = ["Wall A", "Wall B", "Wall C", "Wall D"] as const;

export function createWallsForRoom(room: Room): Wall[] {
  return WALL_NAMES.map((name, index) => ({
    id: `${room.id}-wall-${index + 1}`,
    roomId: room.id,
    name,
    index: index as Wall["index"],
    lengthMm: getWallLength(room, index),
    heightMm: room.heightMm,
  }));
}

export function syncWallsWithRoom(room: Room, walls: Wall[]) {
  return walls.map((wall) =>
    wall.roomId === room.id
      ? {
          ...wall,
          lengthMm: getWallLength(room, wall.index),
          heightMm: room.heightMm,
        }
      : wall,
  );
}

export function getWallLength(room: Room, wallIndex: number) {
  return wallIndex === 0 || wallIndex === 2 ? room.widthMm : room.depthMm;
}
