"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  OEvent,
  OUser,
  OReview,
  OVenue,
  OpheliaSession,
  FeedFilter,
} from "./types";
import { SEED_EVENTS, SEED_USERS, SEED_REVIEWS, SEED_VENUES } from "./seed";
import { computeAggregate } from "./ratings";
import type { AggregatedResponse } from "./types";
import {
  computeStreak,
  computeTasteRelations,
  computeTasteVector,
  computeDivisivenessLeaderboard,
  reviewsThisWeek,
  type TasteRelation,
  type TasteVector,
  type LeaderboardEntry,
} from "./taste";

/** Demo "today" — keeps seeded streaks and daily questions coherent. */
export const OPHELIA_TODAY = "2026-06-17";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

interface OpheliaState {
  events: OEvent[];
  users: OUser[];
  reviews: OReview[];
  venues: OVenue[];
  session: OpheliaSession;
  feedFilter: FeedFilter;
  searchQuery: string;

  // Engagement loop state
  activityDates: string[]; // YYYY-MM-DD the user showed up & acted
  dailyAnswers: Record<string, string>; // questionId -> optionId

  setSession: (patch: Partial<OpheliaSession>) => void;
  setFeedFilter: (filter: FeedFilter) => void;
  setSearchQuery: (q: string) => void;
  submitReview: (review: Omit<OReview, "id" | "createdAt">) => void;
  answerDailyQuestion: (questionId: string, optionId: string) => void;
  recordActivity: () => void;

  // derived helpers (not stored)
  getEvent: (id: string) => OEvent | undefined;
  getUser: (id: string) => OUser | undefined;
  getAggregate: (eventId: string) => AggregatedResponse;
  getEventReviews: (eventId: string) => OReview[];
  getFilteredEvents: () => OEvent[];
  getCurrentUser: () => OUser | undefined;

  // engagement / taste graph
  getStreak: () => number;
  getReviewsThisWeek: (userId: string) => number;
  getTasteVector: (userId: string) => TasteVector;
  getTasteRelations: (userId: string) => {
    twin?: TasteRelation;
    rival?: TasteRelation;
    all: TasteRelation[];
  };
  getDivisivenessLeaderboard: () => LeaderboardEntry[];
}

export const useOpheliaStore = create<OpheliaState>()(
  persist(
    (set, get) => ({
      events: SEED_EVENTS,
      users: SEED_USERS,
      reviews: SEED_REVIEWS,
      venues: SEED_VENUES,
      session: { userId: null, lang: "en" },
      feedFilter: "all",
      searchQuery: "",
      activityDates: [],
      dailyAnswers: {},

      setSession: (patch) =>
        set((state) => ({ session: { ...state.session, ...patch } })),

      setFeedFilter: (filter) => set({ feedFilter: filter }),

      setSearchQuery: (q) => set({ searchQuery: q }),

      recordActivity: () =>
        set((state) => {
          const today = todayStr();
          if (state.activityDates.includes(today)) return state;
          return { activityDates: [...state.activityDates, today] };
        }),

      answerDailyQuestion: (questionId, optionId) =>
        set((state) => {
          const today = todayStr();
          const activityDates = state.activityDates.includes(today)
            ? state.activityDates
            : [...state.activityDates, today];
          return {
            dailyAnswers: { ...state.dailyAnswers, [questionId]: optionId },
            activityDates,
          };
        }),

      submitReview: (review) => {
        const id = `r-user-${Date.now()}`;
        const newReview: OReview = {
          ...review,
          id,
          createdAt: new Date().toISOString(),
        };
        const today = todayStr();
        set((state) => ({
          reviews: [...state.reviews, newReview],
          activityDates: state.activityDates.includes(today)
            ? state.activityDates
            : [...state.activityDates, today],
          users: state.users.map((u) =>
            u.id === review.userId
              ? {
                  ...u,
                  reviewCount: u.reviewCount + 1,
                  eyeScore:
                    u.eyeScore +
                    (review.writtenTakeEN || review.writtenTakeTH ? 15 : 5) +
                    (review.attendanceVerified ? 10 : 0),
                }
              : u,
          ),
        }));
      },

      getEvent: (id) => get().events.find((e) => e.id === id),

      getUser: (id) => get().users.find((u) => u.id === id),

      getAggregate: (eventId) => computeAggregate(eventId, get().reviews),

      getEventReviews: (eventId) =>
        get()
          .reviews.filter(
            (r) => r.targetType === "event" && r.targetId === eventId,
          )
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),

      getCurrentUser: () => {
        const { session, users } = get();
        return session.userId ? users.find((u) => u.id === session.userId) : undefined;
      },

      getStreak: () => computeStreak(get().activityDates, todayStr()),

      getReviewsThisWeek: (userId) =>
        reviewsThisWeek(userId, get().reviews, todayStr()),

      getTasteVector: (userId) => computeTasteVector(userId, get().reviews),

      getTasteRelations: (userId) =>
        computeTasteRelations(userId, get().users, get().reviews),

      getDivisivenessLeaderboard: () =>
        computeDivisivenessLeaderboard(
          get().events.map((e) => e.id),
          get().reviews,
        ),

      getFilteredEvents: () => {
        const { events, reviews, feedFilter, searchQuery } = get();
        let result = [...events];

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          result = result.filter(
            (e) =>
              e.titleEN.toLowerCase().includes(q) ||
              e.titleTH.includes(q) ||
              e.venueName.toLowerCase().includes(q) ||
              e.venueArea.toLowerCase().includes(q) ||
              e.tags.some((t) => t.includes(q)),
          );
        }

        const today = new Date("2026-06-01");

        switch (feedFilter) {
          case "divisive": {
            result = result
              .map((e) => ({ event: e, agg: computeAggregate(e.id, reviews) }))
              .filter(({ agg }) => agg.totalReviews >= 2)
              .sort((a, b) => b.agg.divisiveness - a.agg.divisiveness)
              .map(({ event }) => event);
            break;
          }
          case "recommended": {
            result = result
              .map((e) => ({
                event: e,
                agg: computeAggregate(e.id, reviews),
              }))
              .sort((a, b) => {
                const scoreA =
                  (a.agg.axisCount.moved + a.agg.axisCount.cantStopThinking) /
                  Math.max(a.agg.totalReviews, 1);
                const scoreB =
                  (b.agg.axisCount.moved + b.agg.axisCount.cantStopThinking) /
                  Math.max(b.agg.totalReviews, 1);
                return scoreB - scoreA;
              })
              .map(({ event }) => event);
            break;
          }
          case "ending-soon": {
            result = result
              .filter((e) => {
                const end = new Date(e.endDate);
                const diff =
                  (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
                return diff >= 0 && diff <= 14;
              })
              .sort(
                (a, b) =>
                  new Date(a.endDate).getTime() - new Date(b.endDate).getTime(),
              );
            break;
          }
          case "free": {
            result = result.filter((e) => !e.isPaid);
            break;
          }
        }

        return result;
      },
    }),
    {
      name: "ophelia-store",
      partialize: (state) => ({
        session: state.session,
        feedFilter: state.feedFilter,
        reviews: state.reviews.filter((r) => r.id.startsWith("r-user-")),
        activityDates: state.activityDates,
        dailyAnswers: state.dailyAnswers,
      }),
      // Recombine seed reviews with persisted user reviews so the seeded
      // dataset (and the taste graph it powers) survives reloads.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<OpheliaState>;
        const userReviews = (p.reviews ?? []).filter((r) =>
          r.id.startsWith("r-user-"),
        );
        return {
          ...current,
          ...p,
          reviews: [...SEED_REVIEWS, ...userReviews],
        };
      },
    },
  ),
);
