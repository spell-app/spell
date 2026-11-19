/**
 * Loose types, constants and small pure helpers of the `epic-pills` family:  the home page's Active epics.
 * - Data only, and pure helpers:  the route that answers (`spell/epic/list/runningRoutes`) imports from here too.
 */

import type { RunningEpic } from "spell/epic/list/RunningEpics"

/**
 * Where the pills come from:  `GET /api/epics/running?every`, every epic, running or not
 * (`spell/epic/list/runningRoutes`, the Epics page's route module).
 * - `spell/server/mainServer`'s `RUNNING_EPICS_API` is the same path:  the kit's `src/` can't import a folder
 */
export const RUNNING_EPICS_API = "/api/epics/running"

/**
 * What waits on an epic page, by the colour of its toolbar's badges (`spell-doc-toolbar.js` `toolbarItem()`):
 * - `urgent`:  red, items that need Owen
 * - `replied`:  orange, his turn to pick or review, light orange with it (epic `epic-engine` I347)
 * - `running`:  blue, the phases under way
 */
export type EpicBadges = { urgent: number; replied: number; running: number }

/** One badge kind:  a key of `EpicBadges`. */
export type BadgeKind = keyof EpicBadges

/** The badge kinds, most urgent first:  the order a pill draws them, and a split circle's slices. */
export const BADGE_KINDS: readonly BadgeKind[] = ["urgent", "replied", "running"]

/** One epic, as the page server answers it:  `RunningEpic` (`worktree:  ""` for one with no worktree). */
export type PillEpic = RunningEpic

/** How recently an epic was worked on to get a pill:  a week (Owen, 2026-11-18, J276). */
export const RECENT_DAYS = 7

/** How often the pills ask again by themselves, while the page shows:  agents start and stop without a page edit. */
export const PILLS_POLL_MS = 30_000

/**
 * An epic page's file, as the page server announces a change (`spell-server:changed`):  its skeleton, a part, or its
 * agents' list (`agents.json5`);  the pills ask again.
 */
export const PILL_FILE = /\/epics\/[^/]+\/(?:parts\/[^/]+\.html|[^/]+\.plan\.html|agents\.json5)$/

/** Each badge kind's colour:  the page's token (`spell-doc.css`), as the toolbar's (`BADGE_COLORS`). */
export const BADGE_COLORS: Record<BadgeKind, string> = {
  urgent: "--spell-state-attention",
  replied: "--spell-state-replied",
  running: "--spell-state-progress"
}

/**
 * The circle of several colours, one slice each, meeting in its centre:  its `conic-gradient()`, `kinds` most urgent
 * first (the first slice on the left).
 * - REFACTOR:  `spell-doc-toolbar.js` `badgeLabels()` builds the same gradient;  import this there when the docs
 *   bundle is next rebuilt for a reason of its own
 */
export function splitGradient(kinds: readonly BadgeKind[]): string {
  const slice = 100 / kinds.length
  const stops = kinds.map((kind, at) => {
    const color = `var(${BADGE_COLORS[kind]})`
    return at === kinds.length - 1 ? `${color} 0` : `${color} 0 ${Math.round((at + 1) * slice * 1000) / 1000}%`
  })
  return `conic-gradient(from 180deg, ${stops.join(", ")})`
}

/** The badge kinds epic `badges` has, most urgent first;  none:  `[]`. */
export function kindsOf(badges: EpicBadges | undefined): BadgeKind[] {
  return badges ? BADGE_KINDS.filter((kind) => badges[kind] > 0) : []
}

/**
 * Its phase under way's label, `P12` (the first, when several are);
 * `"done"` (`PHASES_DONE`) when every phase is finished;  `undefined` when neither:  phases left, none under way.
 */
export function phaseOf(epic: PillEpic): string | undefined {
  if (epic.active) return epic.active.split(" · ")[0]
  return epic.total > 0 && epic.done >= epic.total ? PHASES_DONE : undefined
}

/** `phaseOf()`'s word for an epic whose every phase is finished:  the pill says `Done`. */
export const PHASES_DONE = "done"
