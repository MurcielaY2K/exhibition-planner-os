# OPHELIA — Your Eye Is Valid

A social platform for rating and reviewing art, exhibitions, and cultural events. Built to take taste back from the gatekeepers. Launch market: Bangkok.

**"Art's been graded by 200 people for 200 years. Your turn."**

---

## What's in this repo

This repo contains two things:

| Path | What |
|---|---|
| `/src/app/projects/` | Exhibition Planner — a 3D room planning tool for galleries |
| `/src/app/ophelia/` | **OPHELIA** — the art rating platform (new) |

Navigate to `http://localhost:3000/ophelia` to see OPHELIA.

---

## Architecture

```
src/
├── app/
│   └── ophelia/
│       ├── layout.tsx                      # Nav + footer wrapper
│       ├── page.tsx                        # Feed (browse events)
│       ├── onboarding/page.tsx             # Language + interest setup
│       ├── events/[eventId]/
│       │   ├── page.tsx                    # Event detail + ResponseSpectrum
│       │   └── review/page.tsx             # Submit a review
│       └── profile/[userId]/page.tsx       # User profile + taste graph
│
├── features/ophelia/components/
│   ├── response-spectrum.tsx    # ★ The signature visualization
│   ├── event-card.tsx           # Feed card with compact spectrum
│   ├── filter-bar.tsx           # Feed filters + search
│   ├── nav.tsx                  # Sticky top nav
│   ├── review-form.tsx          # Multi-axis tap + written take
│   ├── review-thread.tsx        # Written takes list
│   └── eye-score-badge.tsx      # Credibility score display
│
└── lib/ophelia/
    ├── types.ts      # All shared TypeScript types
    ├── seed.ts       # 15 Bangkok exhibitions + 40 sample reviews
    ├── store.ts      # Zustand state (persisted to localStorage)
    └── ratings.ts    # Divisiveness index calculation
```

**Tech stack:**
- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4
- Zustand 5 with `persist` middleware
- No backend, no database — all state is client-side with seeded data

---

## Running locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000/ophelia`.

To try the demo: click "Demo: Rawiphat" in the nav to sign in as a founding eye, then browse events and submit reviews.

---

## The rating model

OPHELIA never shows a single star score. Every review is a set of **axis taps** chosen from:

| Axis | EN | TH | Color |
|---|---|---|---|
| `moved` | Moved me | ซึ้งใจ | Blue |
| `confused` | Confused me | งงดี | Amber |
| `wantToOwn` | Want to own it | อยากเอากลับบ้าน | Green |
| `changedMyMind` | Changed my mind | เปลี่ยนความคิด | Purple |
| `cantStopThinking` | Can't stop thinking | คิดไม่หาย | Coral |
| `overhyped` | Overhyped | โอเวอร์เกิน | Gray |
| `underrated` | Underrated | ถูกมองข้าม | Emerald |

### Divisiveness index

When responses spread across many axes, that's surfaced as a feature — not averaged away.

```
entropy = -sum(p * log2(p))   for each axis proportion p > 0
divisiveness = entropy / log2(7)   (normalized to 0–1)
```

- `< 0.45` — Strong consensus
- `0.45–0.72` — Mixed signals  
- `>= 0.72` — Room divided 🔥

### Eye Score

Earned credibility, never granted by appointment:
- +5 per axis tap review
- +15 for including a written take
- +10 for verified attendance

### Crowd vs Critics

Where critic data exists in the seed, the `ResponseSpectrum` component shows a secondary dashed overlay on each axis bar so the gap (or alignment) is visible at a glance.

---

## Seed data

15 fictional Bangkok exhibitions, bilingual (TH + EN), across real venues:

| # | Title | Venue | Type |
|---|---|---|---|
| 1 | Ghost Architecture | BACC | Exhibition |
| 2 | Tongues of Fire | River City | Exhibition |
| 3 | Margin Notes | Warehouse 30 | Exhibition |
| 4 | After the Flood | MOCA Bangkok | Exhibition |
| 5 | Same Pot, Different Spoon | BACC | Exhibition |
| 6 | The Invisible Workers | Cartel Artspace | Exhibition |
| 7 | NEON SAMSARA | TCDC | Installation |
| 8 | Concrete Memory | Warehouse 30 | Exhibition |
| 9 | Offerings | WTF Bangkok | Performance |
| 10 | She Who Bends Light | SAC Gallery | Exhibition |
| 11 | Data Skins | TCDC | Exhibition |
| 12 | Unburied | BACC | Exhibition |
| 13 | Soft Hours | Gallery VER | Installation |
| 14 | Night Soil | Jim Thompson Art Center | Exhibition |
| 15 | The Committee | Cartel Artspace | Installation |

40 sample reviews from 8 fictional founding eyes, with realistic axis distributions designed to show the full spectrum of divisiveness — from strong consensus (Soft Hours, Unburied) to split rooms (NEON SAMSARA, Tongues of Fire).

---

## Extending toward Phase 2 / 3

### Phase 2

**Eye Score engine (real)**
- Replace the simple `+5/+15/+10` in `store.ts → submitReview` with a proper backend scoring job
- Add peer endorsement: `Endorsement { fromUserId, toUserId }` table
- Attendance verification: swap the mocked checkbox for geo-based check-in (device location vs event `geoLat/geoLng` within ~200m)
- Anti-gaming: rate-limiting middleware, anomaly detection on review-velocity spikes

**Cultural Trails**
- New entity: `Trail { id, title, stops: { eventId, order, note }[] }`
- New page `/ophelia/trails/[trailId]` — an ordered map route through current shows

**Discovery**
- `/ophelia/search` — full-text across events + users
- Follow system: `Follow { followerId, followedId }` + personalised feed

### Phase 3 — Monetization hooks

**Institution dashboard** (separate Next.js app or `/ophelia/dashboard` behind auth)
- Aggregate anonymized response data per event
- Key charts: axis distribution over time, divisiveness trend, crowd vs critic gap, demographic breakdown by eye score tier

**Featured listings**
- Add `isFeatured: boolean` to `OEvent`; featured events get a special card treatment in the feed
- Flag clearly as promoted

**Connoisseur tier**
- Add `tier: "free" | "connoisseur"` to `OUser`
- Gate: advanced filter combinations, exportable taste profile (JSON/PDF), ad-free

**Ticketing affiliate**
- `isPaid` + `ticketUrl` already exist on `OEvent`
- Add UTM parameters to ticketUrl on click; track conversions

### Real backend migration

When you're ready to go beyond client-side state:

1. **Database**: PostgreSQL — the data model maps directly to tables matching the types in `src/lib/ophelia/types.ts`
2. **API**: Next.js Route Handlers (`/app/api/ophelia/`) or a separate Node/TypeScript service
3. **Auth**: Replace demo session with proper email+OTP or social login (NextAuth, Clerk, or custom)
4. **Images**: S3-compatible storage; replace `picsum.photos` placeholders with real upload endpoints
5. **i18n**: `next-intl` or `next-i18next` for proper server-side translation bundles

---

## Product principles (do not violate)

1. Users rate **experiences** (exhibitions, events, venues) by default. Individual artists are not rated unless they opt in.
2. No single aggregate score. Multi-axis only.
3. Surface disagreement as a feature.
4. Eye Score is earned by anyone, granted to no one by appointment.

---

## Go-to-market note (Bangkok)

The controversial moment that launches OPHELIA isn't built — it's curated. When you have 50+ founding eyes and a dense event dataset, publish the first **Crowd vs. Critics** report on a major Bangkok show. The establishment response *is* the marketing.

See `PART 3` of the original brief for what only you can supply.
