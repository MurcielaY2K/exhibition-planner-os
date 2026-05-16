"use client";

import { create } from "zustand";
import { formatDimension } from "@/lib/domain/format";
import {
  clampOpeningToWall,
  clampPlacementToWall,
  findNearestValidPlacementOnWall,
  snapPlacementOnWall,
  syncPlacementSize,
} from "@/lib/domain/placement";
import { createWallsForRoom, syncWallsWithRoom } from "@/lib/domain/rooms";
import { seedProject, seedSelection } from "@/lib/domain/seed";
import type {
  Artwork,
  CreateProjectInput,
  MountType,
  Opening,
  OpeningType,
  Placement,
  PlannerSelection,
  PlannerView,
  ProjectLight,
  Project,
  ProjectBundle,
  Room,
  SavedCameraView,
} from "@/lib/domain/types";

interface ExhibitionState {
  projects: ProjectBundle[];
  ui: Record<string, PlannerSelection>;
  createProject: (input: CreateProjectInput) => string;
  updateProject: (projectId: string, patch: Partial<Project>) => void;
  updateRoom: (projectId: string, roomId: string, patch: Partial<Room>) => void;
  setActiveView: (projectId: string, view: PlannerView) => void;
  selectWall: (projectId: string, wallId: string) => void;
  selectArtwork: (projectId: string, artworkId: string) => void;
  selectOpening: (projectId: string, openingId?: string) => void;
  selectLight: (projectId: string, lightId?: string) => void;
  selectPlacement: (
    projectId: string,
    placementId: string,
    additive?: boolean,
  ) => void;
  addArtwork: (projectId: string) => void;
  addOpening: (projectId: string, wallId: string, type: OpeningType) => void;
  addLight: (projectId: string, roomId: string) => void;
  updateArtwork: (projectId: string, artworkId: string, patch: Partial<Artwork>) => void;
  updateOpening: (projectId: string, openingId: string, patch: Partial<Opening>) => void;
  updateLight: (projectId: string, lightId: string, patch: Partial<ProjectLight>) => void;
  deleteOpening: (projectId: string, openingId: string) => void;
  deleteLight: (projectId: string, lightId: string) => void;
  placeArtworkOnWall: (projectId: string, artworkId: string, wallId: string) => void;
  updatePlacement: (
    projectId: string,
    placementId: string,
    patch: Partial<Placement>,
  ) => void;
  updatePlacements: (
    projectId: string,
    patches: Array<Pick<Placement, "id" | "xMm" | "yMm">>,
  ) => void;
  autoSequenceWallPlacements: (projectId: string, wallId: string) => void;
  saveCameraView: (
    projectId: string,
    view: Omit<SavedCameraView, "id"> & { id?: string },
  ) => string | undefined;
  deleteCameraView: (projectId: string, cameraViewId: string) => void;
}

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function touchProject(project: Project): Project {
  return {
    ...project,
    updatedAt: new Date().toISOString(),
  };
}

function findProject(projects: ProjectBundle[], projectId: string) {
  return projects.find((bundle) => bundle.project.id === projectId);
}

function createInstallId(existingPlacements: Placement[]) {
  const nextNumber =
    existingPlacements.reduce((highest, placement) => {
      const match = placement.installId.match(/(\d+)$/);
      const value = match ? Number(match[1]) : 0;
      return Math.max(highest, value);
    }, 0) + 1;

  return `INST-${nextNumber.toString().padStart(3, "0")}`;
}

function createPlacementDefaults(existingPlacements: Placement[]): Pick<
  Placement,
  | "installId"
  | "installNotes"
  | "priorityOrder"
  | "mountType"
  | "isLocked"
  | "requiresTeamLift"
  | "specialHandling"
> {
  return {
    installId: createInstallId(existingPlacements),
    installNotes: "",
    priorityOrder: existingPlacements.length + 1,
    mountType: "standard-hook" satisfies MountType,
    isLocked: false,
    requiresTeamLift: false,
    specialHandling: "none",
  };
}

function patchTouchesPlacementGeometry(patch: Partial<Placement>) {
  return (
    patch.xMm !== undefined ||
    patch.yMm !== undefined ||
    patch.wallId !== undefined
  );
}

export function getProjectBundle(
  projects: ProjectBundle[],
  projectId: string,
) {
  return findProject(projects, projectId);
}

function ensurePlannerSelection(selection?: PlannerSelection): PlannerSelection {
  return {
    selectedRoomId: selection?.selectedRoomId ?? "",
    selectedWallId: selection?.selectedWallId ?? "",
    selectedArtworkId: selection?.selectedArtworkId,
    selectedOpeningId: selection?.selectedOpeningId,
    selectedLightId: selection?.selectedLightId,
    selectedPlacementIds: selection?.selectedPlacementIds ?? [],
    primaryPlacementId: selection?.primaryPlacementId,
    activeView: selection?.activeView ?? "elevation",
    savedCameraViews: selection?.savedCameraViews ?? [],
  };
}

export const useExhibitionStore = create<ExhibitionState>((set) => ({
  projects: [seedProject],
  ui: seedSelection,
  createProject: (input) => {
    const projectId = createId("project");
    const roomId = createId("room");
    const room: Room = {
      id: roomId,
      projectId,
      name: input.roomName,
      widthMm: input.widthMm,
      depthMm: input.depthMm,
      heightMm: input.heightMm,
      wallIds: [
        `${roomId}-wall-1`,
        `${roomId}-wall-2`,
        `${roomId}-wall-3`,
        `${roomId}-wall-4`,
      ],
    };

    const bundle: ProjectBundle = {
      project: {
        id: projectId,
        name: input.name,
        venueName: input.venueName,
        status: "draft",
        updatedAt: new Date().toISOString(),
      },
      rooms: [room],
      walls: createWallsForRoom(room),
      openings: [],
      lights: [],
      artworks: [],
      placements: [],
    };

    set((state) => ({
      projects: [...state.projects, bundle],
      ui: {
        ...state.ui,
        [projectId]: {
          selectedRoomId: room.id,
          selectedWallId: room.wallIds[0],
          selectedLightId: undefined,
          selectedPlacementIds: [],
          activeView: "elevation",
          savedCameraViews: [],
        },
      },
    }));

    return projectId;
  },
  updateProject: (projectId, patch) =>
    set((state) => ({
      projects: state.projects.map((bundle) =>
        bundle.project.id === projectId
          ? {
              ...bundle,
              project: touchProject({ ...bundle.project, ...patch }),
            }
          : bundle,
      ),
    })),
  updateRoom: (projectId, roomId, patch) =>
    set((state) => ({
      projects: state.projects.map((bundle) => {
        if (bundle.project.id !== projectId) {
          return bundle;
        }

        const rooms = bundle.rooms.map((room) =>
          room.id === roomId ? { ...room, ...patch } : room,
        );
        const updatedRoom = rooms.find((room) => room.id === roomId);

        if (!updatedRoom) {
          return bundle;
        }

        const syncedWalls = syncWallsWithRoom(updatedRoom, bundle.walls);

        return {
          ...bundle,
          project: touchProject(bundle.project),
          rooms,
          walls: syncedWalls,
          openings: bundle.openings.map((opening) => {
            const wall = syncedWalls.find((entry) => entry.id === opening.wallId);

            if (!wall || wall.roomId !== roomId) {
              return opening;
            }

            return clampOpeningToWall(opening, wall);
          }),
          placements: bundle.placements.map((placement) => {
            const wall = syncedWalls.find((entry) => entry.id === placement.wallId);
            const artwork = bundle.artworks.find(
              (entry) => entry.id === placement.artworkId,
            );

            if (!wall || wall.roomId !== roomId || !artwork) {
              return placement;
            }

            const candidatePlacement = clampPlacementToWall(
              syncPlacementSize(placement, artwork.widthMm, artwork.heightMm),
              wall,
            );
            return (
              findNearestValidPlacementOnWall(
                candidatePlacement,
                wall,
                bundle.placements.filter((entry) => entry.id !== placement.id),
                bundle.openings,
              ) ?? candidatePlacement
            );
          }),
        };
      }),
    })),
  setActiveView: (projectId, view) =>
    set((state) => ({
      ui: {
        ...state.ui,
        [projectId]: {
          ...ensurePlannerSelection(state.ui[projectId]),
          activeView: view,
        },
      },
    })),
  selectWall: (projectId, wallId) =>
    set((state) => ({
      ui: {
        ...state.ui,
        [projectId]: {
          ...ensurePlannerSelection(state.ui[projectId]),
          selectedWallId: wallId,
          selectedOpeningId: undefined,
          selectedLightId: undefined,
          selectedPlacementIds: [],
          primaryPlacementId: undefined,
        },
      },
    })),
  selectArtwork: (projectId, artworkId) =>
    set((state) => ({
      ui: {
        ...state.ui,
        [projectId]: {
          ...state.ui[projectId],
          selectedOpeningId: undefined,
          selectedLightId: undefined,
          selectedArtworkId: artworkId,
        },
      },
    })),
  selectOpening: (projectId, openingId) =>
    set((state) => {
      const bundle = findProject(state.projects, projectId);
      const opening = bundle?.openings.find((entry) => entry.id === openingId);

      return {
        ui: {
          ...state.ui,
          [projectId]: {
            ...ensurePlannerSelection(state.ui[projectId]),
            selectedOpeningId: openingId,
            selectedLightId: undefined,
            selectedWallId: opening?.wallId ?? state.ui[projectId]?.selectedWallId,
            selectedPlacementIds: [],
            primaryPlacementId: undefined,
          },
        },
      };
    }),
  selectLight: (projectId, lightId) =>
    set((state) => {
      const bundle = findProject(state.projects, projectId);
      const light = bundle?.lights.find((entry) => entry.id === lightId);

      return {
        ui: {
          ...state.ui,
          [projectId]: {
            ...ensurePlannerSelection(state.ui[projectId]),
            selectedLightId: lightId,
            selectedOpeningId: undefined,
            selectedPlacementIds: [],
            primaryPlacementId: undefined,
            selectedRoomId: light?.roomId ?? state.ui[projectId]?.selectedRoomId ?? "",
          },
        },
      };
    }),
  selectPlacement: (projectId, placementId, additive) =>
    set((state) => {
      const bundle = findProject(state.projects, projectId);
      const placement = bundle?.placements.find((entry) => entry.id === placementId);
      const currentSelection = state.ui[projectId]?.selectedPlacementIds ?? [];
      const nextSelection = additive
        ? currentSelection.includes(placementId)
          ? currentSelection.filter((entry) => entry !== placementId)
          : [...currentSelection, placementId]
        : [placementId];
      const primaryPlacementId = nextSelection.includes(placementId)
        ? placementId
        : nextSelection.at(-1);

      return {
        ui: {
          ...state.ui,
          [projectId]: {
            ...ensurePlannerSelection(state.ui[projectId]),
            selectedOpeningId: undefined,
            selectedLightId: undefined,
            selectedPlacementIds: nextSelection,
            primaryPlacementId,
            selectedArtworkId:
              placement?.artworkId ?? state.ui[projectId]?.selectedArtworkId,
            selectedWallId:
              placement?.wallId ?? state.ui[projectId]?.selectedWallId,
          },
        },
      };
    }),
  addArtwork: (projectId) =>
    set((state) => {
      const artworkId = createId("artwork");

      return {
        projects: state.projects.map((bundle) =>
          bundle.project.id === projectId
            ? {
                ...bundle,
                project: touchProject(bundle.project),
                artworks: [
                  ...bundle.artworks,
                  {
                    id: artworkId,
                    projectId,
                    title: "Untitled",
                    artist: "Unknown Artist",
                    widthMm: 1000,
                    heightMm: 1000,
                  },
                ],
              }
            : bundle,
        ),
        ui: {
          ...state.ui,
        [projectId]: {
          ...ensurePlannerSelection(state.ui[projectId]),
          selectedOpeningId: undefined,
          selectedLightId: undefined,
          selectedArtworkId: artworkId,
          selectedPlacementIds: [],
          primaryPlacementId: undefined,
        },
      },
      };
    }),
  addOpening: (projectId, wallId, type) =>
    set((state) => {
      const openingId = createId("opening");

      return {
        projects: state.projects.map((bundle) => {
          if (bundle.project.id !== projectId) {
            return bundle;
          }

          const wall = bundle.walls.find((entry) => entry.id === wallId);

          if (!wall) {
            return bundle;
          }

          const opening = clampOpeningToWall(
            {
              id: openingId,
              wallId,
              type,
              label:
                type === "door"
                  ? `Door ${bundle.openings.filter((entry) => entry.type === "door").length + 1}`
                  : `Window ${bundle.openings.filter((entry) => entry.type === "window").length + 1}`,
              xMm: Math.max(Math.round(wall.lengthMm * 0.18), 0),
              yMm: type === "door" ? 0 : Math.max(Math.round(wall.heightMm * 0.34), 0),
              widthMm: type === "door" ? 900 : 1400,
              heightMm: type === "door" ? 2100 : 1200,
            },
            wall,
          );

          return {
            ...bundle,
            project: touchProject(bundle.project),
            openings: [...bundle.openings, opening],
          };
        }),
        ui: {
          ...state.ui,
        [projectId]: {
          ...ensurePlannerSelection(state.ui[projectId]),
          selectedWallId: wallId,
          selectedOpeningId: openingId,
          selectedLightId: undefined,
          selectedPlacementIds: [],
          primaryPlacementId: undefined,
        },
      },
      };
    }),
  addLight: (projectId, roomId) =>
    set((state) => {
      const lightId = createId("light");

      return {
        projects: state.projects.map((bundle) => {
          if (bundle.project.id !== projectId) {
            return bundle;
          }

          const room = bundle.rooms.find((entry) => entry.id === roomId);

          if (!room) {
            return bundle;
          }

          const roomLights = bundle.lights.filter((entry) => entry.roomId === roomId);
          const nextLight: ProjectLight = {
            id: lightId,
            projectId,
            roomId,
            label: `Light ${roomLights.length + 1}`,
            xMm: Math.round(room.widthMm * 0.5),
            zMm: Math.round(room.depthMm * 0.45),
            heightMm: Math.max(room.heightMm - 450, 2200),
            intensity: 80,
            temperatureK: 3200,
            beamAngleDeg: 28,
            enabled: true,
          };

          return {
            ...bundle,
            project: touchProject(bundle.project),
            lights: [...bundle.lights, nextLight],
          };
        }),
        ui: {
          ...state.ui,
          [projectId]: {
            ...ensurePlannerSelection(state.ui[projectId]),
            selectedLightId: lightId,
            selectedOpeningId: undefined,
            selectedPlacementIds: [],
            primaryPlacementId: undefined,
            selectedRoomId: roomId,
          },
        },
      };
    }),
  updateArtwork: (projectId, artworkId, patch) =>
    set((state) => ({
      projects: state.projects.map((bundle) => {
        if (bundle.project.id !== projectId) {
          return bundle;
        }

        const artworks = bundle.artworks.map((artwork) =>
          artwork.id === artworkId ? { ...artwork, ...patch } : artwork,
        );

        return {
          ...bundle,
          project: touchProject(bundle.project),
          artworks,
          placements: bundle.placements.map((placement) => {
            if (placement.artworkId !== artworkId) {
              return placement;
            }

            const wall = bundle.walls.find((entry) => entry.id === placement.wallId);
            const artwork = artworks.find((entry) => entry.id === artworkId);

            if (!wall || !artwork) {
              return placement;
            }

            const candidatePlacement = clampPlacementToWall(
              syncPlacementSize(placement, artwork.widthMm, artwork.heightMm),
              wall,
            );
            return (
              findNearestValidPlacementOnWall(
                candidatePlacement,
                wall,
                bundle.placements.filter((entry) => entry.id !== placement.id),
                bundle.openings,
              ) ?? candidatePlacement
            );
          }),
        };
      }),
    })),
  placeArtworkOnWall: (projectId, artworkId, wallId) =>
    set((state) => {
      let nextPlacementId: string | undefined;
      let nextSelectedWallId = wallId;

      return {
        projects: state.projects.map((bundle) => {
          if (bundle.project.id !== projectId) {
            return bundle;
          }

          const wall = bundle.walls.find((entry) => entry.id === wallId);
          const artwork = bundle.artworks.find((entry) => entry.id === artworkId);

          if (!wall || !artwork) {
            return bundle;
          }

          const existingPlacement = bundle.placements.find(
            (placement) => placement.artworkId === artworkId,
          );

          if (existingPlacement?.isLocked && existingPlacement.wallId !== wallId) {
            nextPlacementId = existingPlacement.id;
            nextSelectedWallId = existingPlacement.wallId;
            return bundle;
          }

          const placementDefaults = createPlacementDefaults(bundle.placements);
          const sizedPlacement: Placement = {
            id: existingPlacement?.id ?? createId("placement"),
            projectId,
            artworkId,
            wallId,
            widthMm: artwork.widthMm,
            heightMm: artwork.heightMm,
            xMm:
              existingPlacement?.xMm ??
              Math.max((wall.lengthMm - artwork.widthMm) / 2, 0),
            yMm:
              existingPlacement?.yMm ??
              Math.max(1550 - artwork.heightMm / 2, 0),
            installId: existingPlacement?.installId ?? placementDefaults.installId,
            installNotes:
              existingPlacement?.installNotes ?? placementDefaults.installNotes,
            priorityOrder:
              existingPlacement?.priorityOrder ?? placementDefaults.priorityOrder,
            mountType: existingPlacement?.mountType ?? placementDefaults.mountType,
            isLocked: existingPlacement?.isLocked ?? placementDefaults.isLocked,
            requiresTeamLift:
              existingPlacement?.requiresTeamLift ??
              placementDefaults.requiresTeamLift,
            specialHandling:
              existingPlacement?.specialHandling ??
              placementDefaults.specialHandling,
          };
          const nextPlacementCandidate = clampPlacementToWall(
            snapPlacementOnWall(
              sizedPlacement,
              wall,
              bundle.placements.filter((placement) => placement.id !== sizedPlacement.id),
            ).placement,
            wall,
          );
          const nextPlacement = findNearestValidPlacementOnWall(
            nextPlacementCandidate,
            wall,
            bundle.placements.filter((placement) => placement.id !== sizedPlacement.id),
            bundle.openings,
          );

          if (!nextPlacement) {
            nextPlacementId = existingPlacement?.id;
            nextSelectedWallId = existingPlacement?.wallId ?? state.ui[projectId]?.selectedWallId ?? wallId;
            return bundle;
          }

          nextPlacementId = nextPlacement.id;
          nextSelectedWallId = nextPlacement.wallId;

          return {
            ...bundle,
            project: touchProject(bundle.project),
            placements: existingPlacement
              ? bundle.placements.map((placement) =>
                  placement.id === existingPlacement.id ? nextPlacement : placement,
                )
              : [...bundle.placements, nextPlacement],
          };
        }),
        ui: {
          ...state.ui,
          [projectId]: {
            ...ensurePlannerSelection(state.ui[projectId]),
            selectedOpeningId: undefined,
            selectedArtworkId: artworkId,
            selectedWallId: nextSelectedWallId,
            selectedPlacementIds: nextPlacementId ? [nextPlacementId] : [],
            primaryPlacementId: nextPlacementId,
          },
        },
      };
    }),
  updateOpening: (projectId, openingId, patch) =>
    set((state) => ({
      projects: state.projects.map((bundle) => {
        if (bundle.project.id !== projectId) {
          return bundle;
        }

        const currentOpening = bundle.openings.find((entry) => entry.id === openingId);
        const nextOpening = currentOpening ? { ...currentOpening, ...patch } : null;
        const wall = nextOpening
          ? bundle.walls.find((entry) => entry.id === nextOpening.wallId)
          : null;

        if (!nextOpening || !wall) {
          return bundle;
        }

        return {
          ...bundle,
          project: touchProject(bundle.project),
          openings: bundle.openings.map((opening) =>
            opening.id === openingId
              ? clampOpeningToWall(nextOpening, wall)
              : opening,
          ),
        };
      }),
    })),
  updateLight: (projectId, lightId, patch) =>
    set((state) => ({
      projects: state.projects.map((bundle) =>
        bundle.project.id === projectId
          ? {
              ...bundle,
              project: touchProject(bundle.project),
              lights: bundle.lights.map((light) =>
                light.id === lightId ? { ...light, ...patch } : light,
              ),
            }
          : bundle,
      ),
    })),
  deleteOpening: (projectId, openingId) =>
    set((state) => ({
      projects: state.projects.map((bundle) =>
        bundle.project.id === projectId
          ? {
              ...bundle,
              project: touchProject(bundle.project),
              openings: bundle.openings.filter((opening) => opening.id !== openingId),
            }
          : bundle,
      ),
      ui: {
        ...state.ui,
        [projectId]: {
          ...ensurePlannerSelection(state.ui[projectId]),
          selectedOpeningId:
            state.ui[projectId]?.selectedOpeningId === openingId
              ? undefined
              : state.ui[projectId]?.selectedOpeningId,
        },
      },
    })),
  deleteLight: (projectId, lightId) =>
    set((state) => ({
      projects: state.projects.map((bundle) =>
        bundle.project.id === projectId
          ? {
              ...bundle,
              project: touchProject(bundle.project),
              lights: bundle.lights.filter((light) => light.id !== lightId),
            }
          : bundle,
      ),
      ui: {
        ...state.ui,
        [projectId]: {
          ...ensurePlannerSelection(state.ui[projectId]),
          selectedLightId:
            state.ui[projectId]?.selectedLightId === lightId
              ? undefined
              : state.ui[projectId]?.selectedLightId,
        },
      },
    })),
  updatePlacement: (projectId, placementId, patch) =>
    set((state) => ({
      projects: state.projects.map((bundle) => {
        if (bundle.project.id !== projectId) {
          return bundle;
        }

        const placement = bundle.placements.find((entry) => entry.id === placementId);

        if (!placement) {
          return bundle;
        }

        if (placement.isLocked && patchTouchesPlacementGeometry(patch)) {
          return bundle;
        }

        const nextPlacement = { ...placement, ...patch };
        const wall = bundle.walls.find((entry) => entry.id === nextPlacement.wallId);
        const artwork = bundle.artworks.find(
          (entry) => entry.id === nextPlacement.artworkId,
        );

        if (!wall || !artwork) {
          return bundle;
        }

        const sizeSyncedPlacement = syncPlacementSize(
          nextPlacement,
          artwork.widthMm,
          artwork.heightMm,
        );
        const snappedPlacement = snapPlacementOnWall(
          sizeSyncedPlacement,
          wall,
          bundle.placements.filter((entry) => entry.id !== placementId),
        ).placement;
        const clampedPlacement = clampPlacementToWall(snappedPlacement, wall);
        const resolvedPlacement = findNearestValidPlacementOnWall(
          clampedPlacement,
          wall,
          bundle.placements.filter((entry) => entry.id !== placementId),
          bundle.openings,
        );

        if (!resolvedPlacement) {
          return bundle;
        }

        return {
          ...bundle,
          project: touchProject(bundle.project),
          placements: bundle.placements.map((entry) =>
            entry.id === placementId ? resolvedPlacement : entry,
          ),
        };
      }),
    })),
  updatePlacements: (projectId, patches) =>
    set((state) => ({
      projects: state.projects.map((bundle) => {
        if (bundle.project.id !== projectId) {
          return bundle;
        }

        return {
          ...bundle,
          placements: bundle.placements.map((placement) => {
            const patch = patches.find((entry) => entry.id === placement.id);

            if (!patch) {
              return placement;
            }

            if (placement.isLocked) {
              return placement;
            }

            const wall = bundle.walls.find((entry) => entry.id === placement.wallId);

            if (!wall) {
              return placement;
            }

            return clampPlacementToWall(
              {
                ...placement,
                xMm: patch.xMm,
                yMm: patch.yMm,
              },
              wall,
            );
          }),
        };
      }),
    })),
  autoSequenceWallPlacements: (projectId, wallId) =>
    set((state) => ({
      projects: state.projects.map((bundle) => {
        if (bundle.project.id !== projectId) {
          return bundle;
        }

        const wallPlacements = bundle.placements
          .filter((placement) => placement.wallId === wallId)
          .slice()
          .sort((left, right) => left.xMm - right.xMm || left.yMm - right.yMm);

        if (wallPlacements.length === 0) {
          return bundle;
        }

        const priorityMap = new Map(
          wallPlacements.map((placement, index) => [placement.id, index + 1]),
        );

        return {
          ...bundle,
          project: touchProject(bundle.project),
          placements: bundle.placements.map((placement) =>
            priorityMap.has(placement.id)
              ? {
                  ...placement,
                  priorityOrder: priorityMap.get(placement.id) ?? placement.priorityOrder,
                }
              : placement,
          ),
        };
      }),
    })),
  saveCameraView: (projectId, view) => {
    let savedId: string | undefined;

    set((state) => {
      const nextId = view.id ?? createId("camera-view");
      savedId = nextId;
      const currentUi = ensurePlannerSelection(state.ui[projectId]);
      const nextView: SavedCameraView = {
        id: nextId,
        name: view.name,
        position: view.position,
        target: view.target,
        wallId: view.wallId,
      };
      const savedCameraViews = [
        currentUi.savedCameraViews.filter((entry) => entry.id !== nextId),
        [nextView],
      ].flat().slice(-8);

      return {
        ui: {
          ...state.ui,
          [projectId]: {
            ...currentUi,
            savedCameraViews,
          },
        },
      };
    });

    return savedId;
  },
  deleteCameraView: (projectId, cameraViewId) =>
    set((state) => {
      const currentUi = ensurePlannerSelection(state.ui[projectId]);

      return {
        ui: {
          ...state.ui,
          [projectId]: {
            ...currentUi,
            savedCameraViews: currentUi.savedCameraViews.filter(
              (entry) => entry.id !== cameraViewId,
            ),
          },
        },
      };
    }),
}));

export function getProjectRouteSummary(bundle: ProjectBundle) {
  const room = bundle.rooms[0];
  return `${bundle.project.venueName} / ${room.name} / ${formatDimension(room.widthMm)} x ${formatDimension(room.depthMm)}`;
}
