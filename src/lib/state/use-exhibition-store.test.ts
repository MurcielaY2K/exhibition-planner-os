import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProjectBundle, useExhibitionStore } from "./use-exhibition-store";

// Reset to a clean, empty state before each test so tests are isolated from
// one another and from the seed data that the store initialises with.
beforeEach(() => {
  useExhibitionStore.setState({ projects: [], ui: {} });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTestProject() {
  return useExhibitionStore.getState().createProject({
    name: "Test Exhibition",
    venueName: "Test Gallery",
    roomName: "Main Room",
    widthMm: 5000,
    depthMm: 4000,
    heightMm: 3000,
  });
}

function getBundle(projectId: string) {
  return getProjectBundle(useExhibitionStore.getState().projects, projectId)!;
}

// ---------------------------------------------------------------------------
// createProject
// ---------------------------------------------------------------------------

describe("createProject", () => {
  it("adds a new bundle to projects", () => {
    const projectId = createTestProject();
    expect(useExhibitionStore.getState().projects).toHaveLength(1);
    expect(getBundle(projectId).project.id).toBe(projectId);
  });

  it("stores the project name and venue", () => {
    const projectId = createTestProject();
    expect(getBundle(projectId).project.name).toBe("Test Exhibition");
    expect(getBundle(projectId).project.venueName).toBe("Test Gallery");
  });

  it("sets the project status to draft", () => {
    const projectId = createTestProject();
    expect(getBundle(projectId).project.status).toBe("draft");
  });

  it("creates the room with the supplied dimensions", () => {
    const projectId = createTestProject();
    const room = getBundle(projectId).rooms[0];
    expect(room.widthMm).toBe(5000);
    expect(room.depthMm).toBe(4000);
    expect(room.heightMm).toBe(3000);
    expect(room.name).toBe("Main Room");
  });

  it("creates exactly 4 walls for the room", () => {
    const projectId = createTestProject();
    expect(getBundle(projectId).walls).toHaveLength(4);
  });

  it("initialises placements, artworks, and openings as empty arrays", () => {
    const projectId = createTestProject();
    const bundle = getBundle(projectId);
    expect(bundle.placements).toHaveLength(0);
    expect(bundle.artworks).toHaveLength(0);
    expect(bundle.openings).toHaveLength(0);
  });

  it("creates a ui selection entry for the new project", () => {
    const projectId = createTestProject();
    const ui = useExhibitionStore.getState().ui[projectId];
    expect(ui).toBeDefined();
    expect(ui.activeView).toBe("elevation");
  });

  it("returns different ids for two calls", () => {
    const id1 = createTestProject();
    const id2 = createTestProject();
    expect(id1).not.toBe(id2);
  });
});

// ---------------------------------------------------------------------------
// updateProject
// ---------------------------------------------------------------------------

describe("updateProject", () => {
  it("updates the project name", () => {
    const projectId = createTestProject();
    useExhibitionStore.getState().updateProject(projectId, { name: "Updated Exhibition" });
    expect(getBundle(projectId).project.name).toBe("Updated Exhibition");
  });

  it("updates the updatedAt timestamp", () => {
    vi.useFakeTimers();
    try {
      const projectId = createTestProject();
      const before = getBundle(projectId).project.updatedAt;
      vi.advanceTimersByTime(100);
      useExhibitionStore.getState().updateProject(projectId, { name: "New Name" });
      const after = getBundle(projectId).project.updatedAt;
      expect(after).not.toBe(before);
    } finally {
      vi.useRealTimers();
    }
  });
});

// ---------------------------------------------------------------------------
// updateRoom
// ---------------------------------------------------------------------------

describe("updateRoom", () => {
  it("updates the room dimensions", () => {
    const projectId = createTestProject();
    const roomId = getBundle(projectId).rooms[0].id;
    useExhibitionStore.getState().updateRoom(projectId, roomId, { widthMm: 6000 });
    expect(getBundle(projectId).rooms[0].widthMm).toBe(6000);
  });

  it("syncs wall lengths when room width changes", () => {
    const projectId = createTestProject();
    const roomId = getBundle(projectId).rooms[0].id;
    useExhibitionStore.getState().updateRoom(projectId, roomId, { widthMm: 6000 });
    const walls = getBundle(projectId).walls;
    // Wall A and C (indices 0, 2) use widthMm
    expect(walls.find((w) => w.index === 0)?.lengthMm).toBe(6000);
    expect(walls.find((w) => w.index === 2)?.lengthMm).toBe(6000);
  });

  it("syncs wall heights when room height changes", () => {
    const projectId = createTestProject();
    const roomId = getBundle(projectId).rooms[0].id;
    useExhibitionStore.getState().updateRoom(projectId, roomId, { heightMm: 3500 });
    getBundle(projectId).walls.forEach((w) => expect(w.heightMm).toBe(3500));
  });
});

// ---------------------------------------------------------------------------
// addArtwork
// ---------------------------------------------------------------------------

describe("addArtwork", () => {
  it("appends a new artwork with default values", () => {
    const projectId = createTestProject();
    useExhibitionStore.getState().addArtwork(projectId);
    expect(getBundle(projectId).artworks).toHaveLength(1);
    const artwork = getBundle(projectId).artworks[0];
    expect(artwork.title).toBe("Untitled");
    expect(artwork.widthMm).toBe(1000);
    expect(artwork.heightMm).toBe(1000);
  });

  it("selects the new artwork in the UI", () => {
    const projectId = createTestProject();
    useExhibitionStore.getState().addArtwork(projectId);
    const artworkId = getBundle(projectId).artworks[0].id;
    expect(useExhibitionStore.getState().ui[projectId].selectedArtworkId).toBe(artworkId);
  });
});

// ---------------------------------------------------------------------------
// updateArtwork
// ---------------------------------------------------------------------------

describe("updateArtwork", () => {
  it("updates artwork fields", () => {
    const projectId = createTestProject();
    useExhibitionStore.getState().addArtwork(projectId);
    const artworkId = getBundle(projectId).artworks[0].id;
    useExhibitionStore.getState().updateArtwork(projectId, artworkId, {
      title: "New Title",
      artist: "New Artist",
    });
    const artwork = getBundle(projectId).artworks[0];
    expect(artwork.title).toBe("New Title");
    expect(artwork.artist).toBe("New Artist");
  });
});

// ---------------------------------------------------------------------------
// placeArtworkOnWall
// ---------------------------------------------------------------------------

describe("placeArtworkOnWall", () => {
  it("creates a placement on the target wall", () => {
    const projectId = createTestProject();
    useExhibitionStore.getState().addArtwork(projectId);
    const artworkId = getBundle(projectId).artworks[0].id;
    const wallId = getBundle(projectId).walls[0].id;

    useExhibitionStore.getState().placeArtworkOnWall(projectId, artworkId, wallId);

    const placements = getBundle(projectId).placements;
    expect(placements).toHaveLength(1);
    expect(placements[0].artworkId).toBe(artworkId);
    expect(placements[0].wallId).toBe(wallId);
  });

  it("selects the new placement and wall in the UI", () => {
    const projectId = createTestProject();
    useExhibitionStore.getState().addArtwork(projectId);
    const artworkId = getBundle(projectId).artworks[0].id;
    const wallId = getBundle(projectId).walls[0].id;
    useExhibitionStore.getState().placeArtworkOnWall(projectId, artworkId, wallId);

    const ui = useExhibitionStore.getState().ui[projectId];
    expect(ui.selectedWallId).toBe(wallId);
    expect(ui.selectedPlacementIds).toHaveLength(1);
  });

  it("moves an existing placement to a different wall when not locked", () => {
    const projectId = createTestProject();
    useExhibitionStore.getState().addArtwork(projectId);
    const artworkId = getBundle(projectId).artworks[0].id;
    const [wallA, wallB] = getBundle(projectId).walls;

    useExhibitionStore.getState().placeArtworkOnWall(projectId, artworkId, wallA.id);
    useExhibitionStore.getState().placeArtworkOnWall(projectId, artworkId, wallB.id);

    const placements = getBundle(projectId).placements;
    expect(placements).toHaveLength(1); // still one placement (moved, not duplicated)
    expect(placements[0].wallId).toBe(wallB.id);
  });

  it("does not move a locked placement to a different wall", () => {
    const projectId = createTestProject();
    useExhibitionStore.getState().addArtwork(projectId);
    const artworkId = getBundle(projectId).artworks[0].id;
    const [wallA, wallB] = getBundle(projectId).walls;

    useExhibitionStore.getState().placeArtworkOnWall(projectId, artworkId, wallA.id);

    // Lock the placement
    const placementId = getBundle(projectId).placements[0].id;
    useExhibitionStore.getState().updatePlacement(projectId, placementId, { isLocked: true });

    // Attempt to move to wall B
    useExhibitionStore.getState().placeArtworkOnWall(projectId, artworkId, wallB.id);

    expect(getBundle(projectId).placements[0].wallId).toBe(wallA.id);
  });

  it("does not create a duplicate placement when placing on the same wall again", () => {
    const projectId = createTestProject();
    useExhibitionStore.getState().addArtwork(projectId);
    const artworkId = getBundle(projectId).artworks[0].id;
    const wallId = getBundle(projectId).walls[0].id;

    useExhibitionStore.getState().placeArtworkOnWall(projectId, artworkId, wallId);
    useExhibitionStore.getState().placeArtworkOnWall(projectId, artworkId, wallId);

    expect(getBundle(projectId).placements).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// addOpening / deleteOpening
// ---------------------------------------------------------------------------

describe("addOpening", () => {
  it("adds a door opening to the wall", () => {
    const projectId = createTestProject();
    const wallId = getBundle(projectId).walls[0].id;
    useExhibitionStore.getState().addOpening(projectId, wallId, "door");
    expect(getBundle(projectId).openings).toHaveLength(1);
    expect(getBundle(projectId).openings[0].type).toBe("door");
  });

  it("adds a window opening with correct defaults", () => {
    const projectId = createTestProject();
    const wallId = getBundle(projectId).walls[0].id;
    useExhibitionStore.getState().addOpening(projectId, wallId, "window");
    const opening = getBundle(projectId).openings[0];
    expect(opening.type).toBe("window");
    expect(opening.widthMm).toBe(1400);
    expect(opening.heightMm).toBe(1200);
  });

  it("selects the new opening in the UI", () => {
    const projectId = createTestProject();
    const wallId = getBundle(projectId).walls[0].id;
    useExhibitionStore.getState().addOpening(projectId, wallId, "door");
    const openingId = getBundle(projectId).openings[0].id;
    expect(useExhibitionStore.getState().ui[projectId].selectedOpeningId).toBe(openingId);
  });
});

describe("deleteOpening", () => {
  it("removes the opening from the project", () => {
    const projectId = createTestProject();
    const wallId = getBundle(projectId).walls[0].id;
    useExhibitionStore.getState().addOpening(projectId, wallId, "door");
    const openingId = getBundle(projectId).openings[0].id;
    useExhibitionStore.getState().deleteOpening(projectId, openingId);
    expect(getBundle(projectId).openings).toHaveLength(0);
  });

  it("clears the selected opening from the UI when the selected opening is deleted", () => {
    const projectId = createTestProject();
    const wallId = getBundle(projectId).walls[0].id;
    useExhibitionStore.getState().addOpening(projectId, wallId, "door");
    const openingId = getBundle(projectId).openings[0].id;
    useExhibitionStore.getState().deleteOpening(projectId, openingId);
    expect(useExhibitionStore.getState().ui[projectId].selectedOpeningId).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// selectPlacement
// ---------------------------------------------------------------------------

describe("selectPlacement", () => {
  function setupPlacement(projectId: string) {
    useExhibitionStore.getState().addArtwork(projectId);
    const artworkId = getBundle(projectId).artworks[0].id;
    const wallId = getBundle(projectId).walls[0].id;
    useExhibitionStore.getState().placeArtworkOnWall(projectId, artworkId, wallId);
    return getBundle(projectId).placements[0].id;
  }

  it("selects the given placement", () => {
    const projectId = createTestProject();
    const placementId = setupPlacement(projectId);
    useExhibitionStore.getState().selectPlacement(projectId, placementId);
    expect(useExhibitionStore.getState().ui[projectId].selectedPlacementIds).toContain(placementId);
  });

  it("replaces the current selection in non-additive mode", () => {
    const projectId = createTestProject();
    setupPlacement(projectId);
    // Add a second artwork and placement
    useExhibitionStore.getState().addArtwork(projectId);
    const artworkId2 = getBundle(projectId).artworks[1].id;
    const wallId = getBundle(projectId).walls[0].id;
    useExhibitionStore.getState().placeArtworkOnWall(projectId, artworkId2, wallId);
    const [p1Id, p2Id] = getBundle(projectId).placements.map((p) => p.id);

    useExhibitionStore.getState().selectPlacement(projectId, p1Id);
    useExhibitionStore.getState().selectPlacement(projectId, p2Id, false);
    expect(useExhibitionStore.getState().ui[projectId].selectedPlacementIds).toEqual([p2Id]);
  });

  it("adds to the selection in additive mode", () => {
    const projectId = createTestProject();
    setupPlacement(projectId);
    useExhibitionStore.getState().addArtwork(projectId);
    const artworkId2 = getBundle(projectId).artworks[1].id;
    const wallId = getBundle(projectId).walls[0].id;
    useExhibitionStore.getState().placeArtworkOnWall(projectId, artworkId2, wallId);
    const [p1Id, p2Id] = getBundle(projectId).placements.map((p) => p.id);

    useExhibitionStore.getState().selectPlacement(projectId, p1Id);
    useExhibitionStore.getState().selectPlacement(projectId, p2Id, true);
    const selected = useExhibitionStore.getState().ui[projectId].selectedPlacementIds;
    expect(selected).toContain(p1Id);
    expect(selected).toContain(p2Id);
  });

  it("removes a placement from the selection when toggled off in additive mode", () => {
    const projectId = createTestProject();
    const p1Id = setupPlacement(projectId);
    useExhibitionStore.getState().selectPlacement(projectId, p1Id);
    useExhibitionStore.getState().selectPlacement(projectId, p1Id, true); // toggle off
    expect(useExhibitionStore.getState().ui[projectId].selectedPlacementIds).not.toContain(p1Id);
  });
});

// ---------------------------------------------------------------------------
// autoSequenceWallPlacements
// ---------------------------------------------------------------------------

describe("autoSequenceWallPlacements", () => {
  it("assigns priorityOrder left-to-right based on xMm", () => {
    const projectId = createTestProject();
    const wallId = getBundle(projectId).walls[0].id;

    // Add two artworks and place them (they end up at auto-computed positions)
    useExhibitionStore.getState().addArtwork(projectId);
    useExhibitionStore.getState().addArtwork(projectId);
    const [a1, a2] = getBundle(projectId).artworks;
    useExhibitionStore.getState().placeArtworkOnWall(projectId, a1.id, wallId);
    useExhibitionStore.getState().placeArtworkOnWall(projectId, a2.id, wallId);

    // Manually force the x positions so we can predict the sequence
    const [p1Id, p2Id] = getBundle(projectId).placements.map((p) => p.id);
    useExhibitionStore.getState().updatePlacements(projectId, [
      { id: p1Id, xMm: 2000, yMm: 500 },
      { id: p2Id, xMm: 500, yMm: 500 },
    ]);

    useExhibitionStore.getState().autoSequenceWallPlacements(projectId, wallId);

    const placements = getBundle(projectId).placements;
    const leftmost = placements.find((p) => p.id === p2Id)!; // p2 is at x=500
    const rightmost = placements.find((p) => p.id === p1Id)!; // p1 is at x=2000

    expect(leftmost.priorityOrder).toBe(1);
    expect(rightmost.priorityOrder).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// selectWall / setActiveView
// ---------------------------------------------------------------------------

describe("selectWall", () => {
  it("changes the selected wall and clears placement selection", () => {
    const projectId = createTestProject();
    useExhibitionStore.getState().addArtwork(projectId);
    const artworkId = getBundle(projectId).artworks[0].id;
    const [wallA, wallB] = getBundle(projectId).walls;
    useExhibitionStore.getState().placeArtworkOnWall(projectId, artworkId, wallA.id);
    const placementId = getBundle(projectId).placements[0].id;
    useExhibitionStore.getState().selectPlacement(projectId, placementId);

    useExhibitionStore.getState().selectWall(projectId, wallB.id);

    const ui = useExhibitionStore.getState().ui[projectId];
    expect(ui.selectedWallId).toBe(wallB.id);
    expect(ui.selectedPlacementIds).toHaveLength(0);
  });
});

describe("setActiveView", () => {
  it("switches the active view", () => {
    const projectId = createTestProject();
    useExhibitionStore.getState().setActiveView(projectId, "plan");
    expect(useExhibitionStore.getState().ui[projectId].activeView).toBe("plan");
  });

  it("can switch back to elevation", () => {
    const projectId = createTestProject();
    useExhibitionStore.getState().setActiveView(projectId, "spatial");
    useExhibitionStore.getState().setActiveView(projectId, "elevation");
    expect(useExhibitionStore.getState().ui[projectId].activeView).toBe("elevation");
  });
});

// ---------------------------------------------------------------------------
// saveCameraView / deleteCameraView
// ---------------------------------------------------------------------------

describe("saveCameraView", () => {
  it("saves a new camera view and returns its id", () => {
    const projectId = createTestProject();
    const id = useExhibitionStore.getState().saveCameraView(projectId, {
      name: "Front View",
      position: [0, 2, 5],
      target: [0, 1, 0],
    });
    expect(id).toBeDefined();
    const views = useExhibitionStore.getState().ui[projectId].savedCameraViews;
    expect(views).toHaveLength(1);
    expect(views[0].name).toBe("Front View");
  });

  it("updates an existing camera view when the same id is passed", () => {
    const projectId = createTestProject();
    const id = useExhibitionStore.getState().saveCameraView(projectId, {
      name: "Side View",
      position: [5, 2, 0],
      target: [0, 1, 0],
    });
    useExhibitionStore.getState().saveCameraView(projectId, {
      id: id!,
      name: "Updated Side View",
      position: [6, 2, 0],
      target: [0, 1, 0],
    });
    const views = useExhibitionStore.getState().ui[projectId].savedCameraViews;
    expect(views).toHaveLength(1);
    expect(views[0].name).toBe("Updated Side View");
  });

  it("caps saved views at 8 entries", () => {
    const projectId = createTestProject();
    for (let i = 0; i < 10; i++) {
      useExhibitionStore.getState().saveCameraView(projectId, {
        name: `View ${i}`,
        position: [i, 2, 5],
        target: [0, 1, 0],
      });
    }
    expect(useExhibitionStore.getState().ui[projectId].savedCameraViews).toHaveLength(8);
  });
});

describe("deleteCameraView", () => {
  it("removes the specified camera view", () => {
    const projectId = createTestProject();
    const id = useExhibitionStore.getState().saveCameraView(projectId, {
      name: "To Delete",
      position: [0, 2, 5],
      target: [0, 1, 0],
    });
    useExhibitionStore.getState().deleteCameraView(projectId, id!);
    expect(useExhibitionStore.getState().ui[projectId].savedCameraViews).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// updatePlacements (bulk position patch)
// ---------------------------------------------------------------------------

describe("updatePlacements", () => {
  it("bulk-updates xMm and yMm for specified placements", () => {
    const projectId = createTestProject();
    useExhibitionStore.getState().addArtwork(projectId);
    const artworkId = getBundle(projectId).artworks[0].id;
    const wallId = getBundle(projectId).walls[0].id;
    useExhibitionStore.getState().placeArtworkOnWall(projectId, artworkId, wallId);
    const placementId = getBundle(projectId).placements[0].id;

    useExhibitionStore.getState().updatePlacements(projectId, [{ id: placementId, xMm: 800, yMm: 600 }]);

    const placement = getBundle(projectId).placements[0];
    expect(placement.xMm).toBe(800);
    expect(placement.yMm).toBe(600);
  });

  it("does not move a locked placement", () => {
    const projectId = createTestProject();
    useExhibitionStore.getState().addArtwork(projectId);
    const artworkId = getBundle(projectId).artworks[0].id;
    const wallId = getBundle(projectId).walls[0].id;
    useExhibitionStore.getState().placeArtworkOnWall(projectId, artworkId, wallId);
    const placementId = getBundle(projectId).placements[0].id;
    const originalX = getBundle(projectId).placements[0].xMm;
    useExhibitionStore.getState().updatePlacement(projectId, placementId, { isLocked: true });

    useExhibitionStore.getState().updatePlacements(projectId, [{ id: placementId, xMm: 800, yMm: 600 }]);

    expect(getBundle(projectId).placements[0].xMm).toBe(originalX);
  });
});
