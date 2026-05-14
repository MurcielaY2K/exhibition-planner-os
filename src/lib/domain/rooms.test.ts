import { describe, expect, it } from "vitest";
import { createWallsForRoom, getWallLength, syncWallsWithRoom } from "./rooms";
import type { Room } from "./types";

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: "room-1",
    projectId: "project-1",
    name: "Main Gallery",
    widthMm: 5000,
    depthMm: 4000,
    heightMm: 3000,
    wallIds: ["room-1-wall-1", "room-1-wall-2", "room-1-wall-3", "room-1-wall-4"],
    ...overrides,
  };
}

describe("getWallLength", () => {
  it("returns widthMm for index 0 (Wall A)", () => {
    expect(getWallLength(makeRoom(), 0)).toBe(5000);
  });

  it("returns depthMm for index 1 (Wall B)", () => {
    expect(getWallLength(makeRoom(), 1)).toBe(4000);
  });

  it("returns widthMm for index 2 (Wall C)", () => {
    expect(getWallLength(makeRoom(), 2)).toBe(5000);
  });

  it("returns depthMm for index 3 (Wall D)", () => {
    expect(getWallLength(makeRoom(), 3)).toBe(4000);
  });

  it("distinguishes widthMm and depthMm correctly when they differ", () => {
    const room = makeRoom({ widthMm: 9600, depthMm: 6400 });
    expect(getWallLength(room, 0)).toBe(9600);
    expect(getWallLength(room, 1)).toBe(6400);
    expect(getWallLength(room, 2)).toBe(9600);
    expect(getWallLength(room, 3)).toBe(6400);
  });
});

describe("createWallsForRoom", () => {
  it("creates exactly 4 walls", () => {
    expect(createWallsForRoom(makeRoom())).toHaveLength(4);
  });

  it("names walls A, B, C, D in order", () => {
    const walls = createWallsForRoom(makeRoom());
    expect(walls.map((w) => w.name)).toEqual(["Wall A", "Wall B", "Wall C", "Wall D"]);
  });

  it("assigns indices 0 through 3", () => {
    const walls = createWallsForRoom(makeRoom());
    expect(walls.map((w) => w.index)).toEqual([0, 1, 2, 3]);
  });

  it("assigns roomId to all walls", () => {
    const room = makeRoom({ id: "room-42" });
    const walls = createWallsForRoom(room);
    walls.forEach((w) => expect(w.roomId).toBe("room-42"));
  });

  it("generates deterministic ids derived from the room id", () => {
    const walls = createWallsForRoom(makeRoom());
    expect(walls[0].id).toBe("room-1-wall-1");
    expect(walls[1].id).toBe("room-1-wall-2");
    expect(walls[2].id).toBe("room-1-wall-3");
    expect(walls[3].id).toBe("room-1-wall-4");
  });

  it("sets lengthMm using widthMm for walls A and C (indices 0 and 2)", () => {
    const walls = createWallsForRoom(makeRoom());
    expect(walls[0].lengthMm).toBe(5000); // A
    expect(walls[2].lengthMm).toBe(5000); // C
  });

  it("sets lengthMm using depthMm for walls B and D (indices 1 and 3)", () => {
    const walls = createWallsForRoom(makeRoom());
    expect(walls[1].lengthMm).toBe(4000); // B
    expect(walls[3].lengthMm).toBe(4000); // D
  });

  it("assigns the room heightMm to all walls", () => {
    const walls = createWallsForRoom(makeRoom({ heightMm: 2800 }));
    walls.forEach((w) => expect(w.heightMm).toBe(2800));
  });
});

describe("syncWallsWithRoom", () => {
  it("updates lengthMm when room widthMm changes", () => {
    const room = makeRoom();
    const walls = createWallsForRoom(room);
    const updated = syncWallsWithRoom({ ...room, widthMm: 6000 }, walls);
    expect(updated[0].lengthMm).toBe(6000); // Wall A
    expect(updated[2].lengthMm).toBe(6000); // Wall C
  });

  it("updates lengthMm when room depthMm changes", () => {
    const room = makeRoom();
    const walls = createWallsForRoom(room);
    const updated = syncWallsWithRoom({ ...room, depthMm: 5500 }, walls);
    expect(updated[1].lengthMm).toBe(5500); // Wall B
    expect(updated[3].lengthMm).toBe(5500); // Wall D
  });

  it("updates heightMm for all walls when room heightMm changes", () => {
    const room = makeRoom();
    const walls = createWallsForRoom(room);
    const updated = syncWallsWithRoom({ ...room, heightMm: 3500 }, walls);
    updated.forEach((w) => expect(w.heightMm).toBe(3500));
  });

  it("does not modify walls that belong to a different room", () => {
    const roomA = makeRoom({ id: "room-A", widthMm: 5000, depthMm: 4000 });
    const roomB = makeRoom({ id: "room-B", widthMm: 7000, depthMm: 6000 });
    const allWalls = [...createWallsForRoom(roomA), ...createWallsForRoom(roomB)];

    const updated = syncWallsWithRoom({ ...roomA, widthMm: 9000 }, allWalls);

    const roomBWalls = updated.filter((w) => w.roomId === "room-B");
    // Room B walls should still have their original dimensions
    expect(roomBWalls[0].lengthMm).toBe(7000);
    expect(roomBWalls[1].lengthMm).toBe(6000);
  });

  it("preserves all other wall properties (name, id, index)", () => {
    const room = makeRoom();
    const walls = createWallsForRoom(room);
    const updated = syncWallsWithRoom({ ...room, heightMm: 2800 }, walls);
    expect(updated[0].name).toBe("Wall A");
    expect(updated[0].id).toBe("room-1-wall-1");
    expect(updated[0].index).toBe(0);
  });

  it("returns a new array without mutating the original walls", () => {
    const room = makeRoom();
    const walls = createWallsForRoom(room);
    const updated = syncWallsWithRoom({ ...room, heightMm: 9999 }, walls);
    expect(updated).not.toBe(walls);
    expect(walls[0].heightMm).toBe(3000); // original unchanged
  });
});
