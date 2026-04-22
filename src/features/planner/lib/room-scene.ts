import * as THREE from "three";
import type { Opening, Placement, Room, Wall } from "@/lib/domain/types";

export const WALL_THICKNESS_MM = 120;
export const ARTWORK_WALL_GAP_MM = 24;

export function mmToSceneUnits(mm: number) {
  return mm / 1000;
}

export interface SceneWallData {
  wall: Wall;
  width: number;
  height: number;
  position: [number, number, number];
  rotationY: number;
  focusTarget: [number, number, number];
  shape: THREE.Shape;
}

export interface SceneOpeningData {
  opening: Opening;
  width: number;
  height: number;
  position: [number, number, number];
  rotationY: number;
}

export interface ScenePlacementData {
  placement: Placement;
  width: number;
  height: number;
  depth: number;
  position: [number, number, number];
  rotationY: number;
}

export interface SceneCameraPreset {
  position: [number, number, number];
  target: [number, number, number];
}

export function getSceneWallData(
  room: Room,
  wall: Wall,
  openings: Opening[],
): SceneWallData {
  const width = mmToSceneUnits(wall.lengthMm);
  const height = mmToSceneUnits(wall.heightMm);
  const shape = new THREE.Shape();

  shape.moveTo(0, 0);
  shape.lineTo(width, 0);
  shape.lineTo(width, height);
  shape.lineTo(0, height);
  shape.lineTo(0, 0);

  openings
    .filter((opening) => opening.wallId === wall.id)
    .forEach((opening) => {
      const hole = new THREE.Path();
      const x = mmToSceneUnits(opening.xMm);
      const y = mmToSceneUnits(opening.yMm);
      const openingWidth = mmToSceneUnits(opening.widthMm);
      const openingHeight = mmToSceneUnits(opening.heightMm);

      hole.moveTo(x, y);
      hole.lineTo(x + openingWidth, y);
      hole.lineTo(x + openingWidth, y + openingHeight);
      hole.lineTo(x, y + openingHeight);
      hole.lineTo(x, y);
      shape.holes.push(hole);
    });

  const roomWidth = mmToSceneUnits(room.widthMm);
  const roomDepth = mmToSceneUnits(room.depthMm);
  const centerY = height / 2;

  if (wall.index === 0) {
    return {
      wall,
      width,
      height,
      position: [0, centerY, -roomDepth / 2],
      rotationY: 0,
      focusTarget: [0, centerY, -roomDepth / 2],
      shape,
    };
  }

  if (wall.index === 1) {
    return {
      wall,
      width,
      height,
      position: [roomWidth / 2, centerY, 0],
      rotationY: -Math.PI / 2,
      focusTarget: [roomWidth / 2, centerY, 0],
      shape,
    };
  }

  if (wall.index === 2) {
    return {
      wall,
      width,
      height,
      position: [0, centerY, roomDepth / 2],
      rotationY: Math.PI,
      focusTarget: [0, centerY, roomDepth / 2],
      shape,
    };
  }

  return {
    wall,
    width,
    height,
    position: [-roomWidth / 2, centerY, 0],
    rotationY: Math.PI / 2,
    focusTarget: [-roomWidth / 2, centerY, 0],
    shape,
  };
}

export function getSceneOpeningData(room: Room, wall: Wall, opening: Opening): SceneOpeningData {
  const width = mmToSceneUnits(opening.widthMm);
  const height = mmToSceneUnits(opening.heightMm);
  const centerY = mmToSceneUnits(opening.yMm + opening.heightMm / 2);
  const roomWidth = mmToSceneUnits(room.widthMm);
  const roomDepth = mmToSceneUnits(room.depthMm);
  const alongWall = mmToSceneUnits(opening.xMm + opening.widthMm / 2);

  if (wall.index === 0) {
    return {
      opening,
      width,
      height,
      position: [-roomWidth / 2 + alongWall, centerY, -roomDepth / 2 + 0.001],
      rotationY: 0,
    };
  }

  if (wall.index === 1) {
    return {
      opening,
      width,
      height,
      position: [roomWidth / 2 - 0.001, centerY, -roomDepth / 2 + alongWall],
      rotationY: -Math.PI / 2,
    };
  }

  if (wall.index === 2) {
    return {
      opening,
      width,
      height,
      position: [-roomWidth / 2 + alongWall, centerY, roomDepth / 2 - 0.001],
      rotationY: Math.PI,
    };
  }

  return {
    opening,
    width,
    height,
    position: [-roomWidth / 2 + 0.001, centerY, -roomDepth / 2 + alongWall],
    rotationY: Math.PI / 2,
  };
}

export function getScenePlacementData(
  room: Room,
  wall: Wall,
  placement: Placement,
  artworkDepthMm: number,
): ScenePlacementData {
  const width = mmToSceneUnits(placement.widthMm);
  const height = mmToSceneUnits(placement.heightMm);
  const depth = Math.max(mmToSceneUnits(artworkDepthMm), 0.02);
  const roomWidth = mmToSceneUnits(room.widthMm);
  const roomDepth = mmToSceneUnits(room.depthMm);
  const centerXAlongWall = mmToSceneUnits(placement.xMm + placement.widthMm / 2);
  const centerY = mmToSceneUnits(placement.yMm + placement.heightMm / 2);
  const gap = mmToSceneUnits(ARTWORK_WALL_GAP_MM);

  if (wall.index === 0) {
    return {
      placement,
      width,
      height,
      depth,
      position: [-roomWidth / 2 + centerXAlongWall, centerY, -roomDepth / 2 + depth / 2 + gap],
      rotationY: 0,
    };
  }

  if (wall.index === 1) {
    return {
      placement,
      width,
      height,
      depth,
      position: [roomWidth / 2 - depth / 2 - gap, centerY, -roomDepth / 2 + centerXAlongWall],
      rotationY: -Math.PI / 2,
    };
  }

  if (wall.index === 2) {
    return {
      placement,
      width,
      height,
      depth,
      position: [-roomWidth / 2 + centerXAlongWall, centerY, roomDepth / 2 - depth / 2 - gap],
      rotationY: Math.PI,
    };
  }

  return {
    placement,
    width,
    height,
    depth,
    position: [-roomWidth / 2 + depth / 2 + gap, centerY, -roomDepth / 2 + centerXAlongWall],
    rotationY: Math.PI / 2,
  };
}

export function getDefaultSceneCamera(room: Room): [number, number, number] {
  const roomWidth = mmToSceneUnits(room.widthMm);
  const roomDepth = mmToSceneUnits(room.depthMm);
  const roomHeight = mmToSceneUnits(room.heightMm);

  return [roomWidth * 0.9, roomHeight * 0.72, roomDepth * 1.05];
}

export function getRoomOverviewPreset(room: Room): SceneCameraPreset {
  return {
    position: getDefaultSceneCamera(room),
    target: [0, mmToSceneUnits(room.heightMm) * 0.4, 0],
  };
}

export function getWallFocusPreset(room: Room, wall: Wall): SceneCameraPreset {
  const roomWidth = mmToSceneUnits(room.widthMm);
  const roomDepth = mmToSceneUnits(room.depthMm);
  const roomHeight = mmToSceneUnits(room.heightMm);
  const offset = Math.max(roomWidth, roomDepth) * 0.58;
  const targetY = roomHeight * 0.46;

  if (wall.index === 0) {
    return {
      position: [0, targetY, -roomDepth / 2 + offset],
      target: [0, targetY, -roomDepth / 2],
    };
  }

  if (wall.index === 1) {
    return {
      position: [roomWidth / 2 - offset, targetY, 0],
      target: [roomWidth / 2, targetY, 0],
    };
  }

  if (wall.index === 2) {
    return {
      position: [0, targetY, roomDepth / 2 - offset],
      target: [0, targetY, roomDepth / 2],
    };
  }

  return {
    position: [-roomWidth / 2 + offset, targetY, 0],
    target: [-roomWidth / 2, targetY, 0],
  };
}
