/**
 * Loose types, constants, errors and small pure helpers of the page's server clients:
 * the review inbox's (`ReviewClient`), the running agents' (`AgentsClient`),
 * and the link both write through (`ServerLink`).
 * - The inbox's shapes are the route's own (`spell/epic/tool/ReviewInbox`), and the running agents' the list's
 *   (`tools/AgentList.ts`), imported as TYPES only:
 *   erased, so the node-only files never reach the pack, and a reply can't drift from what the server writes.
 */

import { clockTime } from "spell/util/time"
import type {
  InboxDoing,
  InboxDraft,
  InboxListener,
  InboxMark,
  InboxUrgency,
  InboxWoken,
  NewKind,
  NowAction,
  NowRequest,
  PageInbox,
  PickFields,
  AddedOption,
  EditedOption,
  WaitingComment,
  WorkingEntry
} from "spell/epic/tool/ReviewInbox"
import type { WakeResult } from "spell/epic/tool/ReviewStart"

import type { Redirect, RunningAgent as ListedAgent } from "spell/epic/tools/AgentList"

////////////////
// ## Constants
////////////////

/** The review store's routes (`spell/epic/tool/reviewRoutes.ts`):  every reply is the page's whole inbox. */
export const REVIEW_API = "/api/epics/review"

/**
 * The pages the routes review:  an epic page's own path, `.../epics/<name>/<name>.plan.html` (`reviewRoutes.ts`
 * `PLAN_DOC`, the same rule:  any other page gets a 403).
 * A copy anywhere else (`preview-epics/`) isn't reviewed, and doesn't ask.
 */
export const PLAN_DOC_PAGE = /\/(?:packages\/docs\/content\/)?epics\/([^/]+)\/\1\.plan\.html$/

/**
 * A SAGA page's own path, `.../sagas/<id>/<id>.saga.html` (epic `epic-workflow` P15):  the routes review it too,
 * its marks and comments in its own inbox beside it (`reviewRoutes.ts` `SAGA_PAGE`, the same rule).
 */
export const SAGA_PAGE = /\/sagas\/([^/]+)\/\1\.saga\.html$/

/**
 * How a saga page is NAMED to `/epic review` and the `epic` tool:  its short address, `SAGA:/<id>`.
 * - e.g. `/epic review SAGA:/drawable-spell`, `epic inbox wait SAGA:/drawable-spell`, `epic add SAGA:/drawable-spell#T`
 * - a saga id may be an epic's name too (`output-targets`):  the prefix says which page
 * - REFACTOR:  one resolver for every `SAGA:/` address once epic `epic-workflow` P15's `<epic-link>` work lands
 */
export const SAGA_PREFIX = "SAGA:/"

/** How often a VISIBLE page re-reads its inbox, so what Claude does to it shows. */
export const REVIEW_POLL_MS = 4000

/** How long a note box waits after the last keystroke before saving its draft. */
export const DRAFT_SAVE_MS = 10_000

/** How long a review notice stays up. */
export const NOTICE_MS = 6000

/** How long a note box opened for the reader keeps taking the focus while its item's body loads. */
export const FOCUS_HOLD_MS = 3000

/**
 * How long Owen leaves the page alone before Auto Send sends what's waiting, by default
 * (`SendCountdown`;  epic `epic-engine` P20:  "2 minutes of inactivity from me").
 */
export const COUNTDOWN_MS = 120_000

/** How often a running countdown ticks:  its ring drains a step, and it checks whether time is up. */
export const COUNTDOWN_TICK_MS = 1000

/**
 * How long a press of Accept Overview / Accept Phases waits before it goes to Claude (`<epic-stage-button>`;
 * epic `epic-engine` I181):  always 5 minutes, whatever Auto Send says.
 * - Owen, 2026-10-29:  "make 'accept overview' and 'accept phases' 5 minute countdown"
 * - its mark is HELD that long (`isHeld()`):  dated ahead, so no Send carries it early
 */
export const STAGE_COUNTDOWN_MS = 300_000

/**
 * AUTO SEND's choices, the page header's gear (epic `epic-engine` P53, J160), in the order its sub-menu lists them:
 * - `now`:  Immediately, each change sent as it's finished (a note when its box loses the focus);  no ring
 * - `2m`, `5m`:  the ring drains over that long after Owen last touched the page
 * - `off`:  only a press sends
 */
export const AUTO_SEND_CHOICES = ["now", "2m", "5m", "off"] as const

/** One of `AUTO_SEND_CHOICES`. */
export type AutoSend = (typeof AUTO_SEND_CHOICES)[number]

/** Auto Send with nothing chosen in this browser:  2 minutes (Owen, 2026-10-29). */
export const DEFAULT_AUTO_SEND: AutoSend = "2m"

/** How long each choice that counts waits, ms. */
export const AUTO_SEND_MS: Readonly<Record<Exclude<AutoSend, "off">, number>> = {
  now: 0,
  "2m": COUNTDOWN_MS,
  "5m": 300_000
}

/**
 * `localStorage` key of the Auto Send choice, for every page this browser shows (decision Q6:  per viewer).
 * - NEW in P53 (J147):  P20's countdown keys (`spell-epics:send-countdown`, `epic-send-countdown`) are ignored, so a
 *   browser that turned the wand off while testing it starts at 2 minutes like everyone else
 */
export const AUTO_SEND_KEY = "spell-epics:auto-send"

/** What counts as Owen at work on the page, so the countdown starts again:  typing, clicking, scrolling. */
export const ACTIVITY_EVENTS = ["keydown", "pointerdown", "wheel", "input", "scroll"] as const

/**
 * localStorage key prefix of a page's note-box backups:  `spell-revisit:<path>`, `{ [item id]: text }`.
 * - the SAME key as the old runtime's (`spell-doc-runtime.js` `REVISIT_KEY_PREFIX`):  a note half-typed on a page
 *   the old runtime drew is handed to the inbox here (`ReviewClient.adoptBackups()`)
 * - only a BACKUP:  notes are kept in the inbox as drafts (`POST draft`), which every address reads;
 *   localStorage is per address (port included), which is how notes got lost (epic `windows-and-review` P1)
 */
export const REVISIT_KEY_PREFIX = "spell-revisit:"

/**
 * What the page says when no Claude session waits on the inbox (epic page `review-review`, D6):
 * `listening` null, which the routes also answer once a session's heartbeat stops (`ReviewInbox.forPage()`).
 * - since epic `epic-workflow` P16, Send (and a request for now) wakes the epic's session then (the page server types
 *   `/epic review <epic>` into it, or opens one):  what a wake did is `ReviewClient.waitingWhy`
 */
export const NOBODY_LISTENING = isAirplane()
  ? "Airplane mode:  queued for when you land (/airplane land)"
  : "No Claude session is reviewing this doc:  Send wakes one"

/**
 * Airplane mode is on (epic `airplane`):  Owen works with no Claude, and everything waits for `/airplane land`.
 * - the page server says so in `window.SPELL_SERVER.airplane`, as it serves the page (`AirplaneMode`):
 *   a page loaded before `epic airplane on` learns it on its next load
 * - `false` outside a browser
 */
export function isAirplane(): boolean {
  return typeof window !== "undefined" && !!(window as { SPELL_SERVER?: { airplane?: boolean } }).SPELL_SERVER?.airplane
}

/**
 * The review actions of an item's line:
 * - most items:  Approve, Revisit, Make Todo, then Do Now
 *   (`details`:  the inbox's name for an immediate request, kept from Add Details Now;  decision Q20)
 * - a todo (Owen, 2026-10-09):  `next` (the plane:  do it in the next phase), Revisit, `drop` (the x:  drop it)
 * - an open phase while the phases are agreed (epic `epic-engine` P29):  Looks good (`approve`), `defer` (after the
 *   others, still to do)
 * - a CHANGE MARK (`<epic-change>`, epic `epic-engine` P30):  `accept` (the change stands:  the orange goes, the chip
 *   stays), `reopen` (its question is talked over again)
 * - an UPDATE block (`<epic-update id="up3">`, epic `epic-engine` I168):  `seen` (folded to one grey line, out of its
 *   phase's pen)
 */
export const REVIEW_ACTIONS = [
  "approve",
  "revisit",
  "todo",
  "details",
  "next",
  "drop",
  "defer",
  "accept",
  "reopen",
  "seen",
  // a phase dragged to another place (epic `epic-engine` P34):  `{ action: "move", to }`
  "move"
] as const

/** One of `REVIEW_ACTIONS`. */
export type ReviewAction = (typeof REVIEW_ACTIONS)[number]

/**
 * The summary's key in the inbox:  `<epic-summary>` has no id of its own (epic `airplane` P2).
 * As `ReviewInbox`'s `SUMMARY_ID`:  a copy, since that module is node-only.
 */
export const SUMMARY_ID = "summary"

/**
 * The stage button's key in the inbox (`<epic-stage-button>`) (Accept Overview, Accept Phases:  epic `epic-engine` P29).
 * As `ReviewInbox`'s `STAGE_ID`:  a copy, since that module is node-only.
 */
export const STAGE_ID = "stage"

/**
 * A change mark's id, its inbox key (`<epic-change id="ch3">`, epic `epic-engine` P30):  `ch` and a number.
 * As `ReviewInbox`'s `CHANGE_ID`:  a copy, since that module is node-only.
 */
export const CHANGE_ID = /^ch\d+$/

/** What a new item from the page may be:  as `ReviewInbox`'s `NEW_KINDS` (a copy:  that module is node-only). */
export const NEW_KINDS = ["todo", "question", "issue", "test", "phase"] as const

/** The longest title a new item may have:  as `ReviewInbox`'s `MAX_TITLE` (a copy:  that module is node-only). */
export const NEW_TITLE_MAX = 300

/** The page's own reload of its HTML:  the server's current token, as it serves the page now. */
export const SERVER_INFO = /window\.SPELL_SERVER = (\{.*?\})<\/script>/

/**
 * The four answers of a TEST RUN (epic `epic-engine` P4), a test mark's `result`:
 * `passed`, `failed` (with a note and a screenshot), `skip` (no longer applies), `notnow` (can't do it yet).
 * - As `ReviewInbox`'s (a copy:  that module is node-only).
 */
export const TEST_RESULTS = ["passed", "failed", "skip", "notnow"] as const

/** One of `TEST_RESULTS`. */
export type TestResult = (typeof TEST_RESULTS)[number]

/**
 * The epics with open tests, in Owen's saga order (`GET`, `[{ epic, open, page }]`):
 * where a run started by `epic test --all` goes next.
 */
export const TESTS_API = "/api/epics/tests"

/**
 * The Manual tests section's key in the inbox (epic `epic-engine` P51):  its Start testing, a request for now
 * (`prepare`).  As `ReviewInbox`'s `TESTS_ID` (a copy:  that module is node-only).
 */
export const TESTS_ID = "tests"

/** The biggest picture a note box or an option takes, as the shot route caps it (`POST shot`). */
export const SHOT_MAX_BYTES = 8 * 1024 * 1024

/** The running-agents routes (`src/tools/agentRoutes.ts`):  every reply is the epic's list, `{ agents }`. */
export const AGENTS_API = "/api/epics/agents"

/** The running-agents list's file, beside the epic page (`AgentList.ts`):  the page server announces its changes. */
export const AGENTS_FILE = "agents.json5"

////////////////
// ## Types
////////////////

/**
 * The inbox as the page keeps it:  every field a route's reply has that the page reads.
 * - `unsentComments`:  the ids of the comments Send would hand over, as the routes work it out
 *   (`ReviewInbox.forPage()`);  `[]` from a server started before Send took comments
 * - `waitingComments`:  every comment waiting for Claude, with where it is (its anchor), so Revisit on a part with
 *   Owen's comments in its text marks them at once (epic `epic-engine` I140);  `[]` from an older server
 * - `woken`:  the page server's wake of the epic (epic `epic-workflow` P16), while it counts and nobody listens;
 *   `null` otherwise, or from a server started before it woke epics
 * - `doing`:  what the listening session is doing now (epic `epic-engine` P35), the toolbar's line;  `null` for
 *   nothing, nobody listening, or a server started before it
 * - `lastListener`:  who listened last, while nobody does (epic `epic-friend` P11);  `null` otherwise, or from an
 *   older server
 */
export type Inbox = Pick<
  PageInbox,
  | "marks"
  | "drafts"
  | "urgency"
  | "sent"
  | "now"
  | "working"
  | "listening"
  | "lastListener"
  | "unsentComments"
  | "waitingComments"
  | "woken"
  | "doing"
>

/** What the session is doing, as the page reads it (`Inbox.doing`). */
export type { InboxDoing }

/**
 * What the page server's wake did, in a Send's or Do Now's answer (`wake`, epic `epic-workflow` P16):
 * the route's `WakeResult` (`spell/epic/tool/ReviewStart`), its type only.
 * - `message`:  for the notice;  `null` (no `wake`) while a session listens
 */
export type WakeAnswer = WakeResult

/** A mark to set, before the route stamps it. */
export type MarkInput = Omit<InboxMark, "at">

/** A new item to ask for from the page (`POST new`, epic `airplane` P2):  `near`, the id of what it's about. */
export type NewItemInput = { kind: NewKind; title: string; note?: string; near?: string }

/** A new item waiting in the inbox (`ReviewClient.newItems()`):  its key (`new1`) and its mark. */
export type NewItem = { id: string } & InboxMark & { kind: NewKind; title: string }

/**
 * A test's answer in a run (epic `epic-engine` P4), its mark without the action:
 * - `note`:  what Owen says went wrong (a failure's)
 * - `shot`:  his screenshot, a path from the epic's folder (`tests/v3-20261019-1432.png`), as `POST shot` answered
 */
export type TestAnswer = { result: TestResult; note?: string; shot?: string }

/** An epic with open tests (`GET /api/epics/tests`):  its name, how many, and its epic page's address. */
export type TestsEntry = { epic: string; open: number; page: string }

/** An item's immediate request on its way or being worked on:  `queued` while it waits with nobody listening. */
export type Running = { action: NowAction; queued: boolean }

/** The page server's facts the client needs:  `window.SPELL_SERVER`'s. */
export type ServerInfo = {
  /** the write token (`x-server-token`) */
  token: string
  /** the page's file, as the server announces changes (`spell-server:changed`'s `path`) */
  file?: string
  /** the checkout it serves, on disk:  a file's `vscode://` link (`ChoicesForm.fileUrl()`) */
  root?: string
  /** the folder it serves worktrees from, `/worktrees/<w>/` pages' checkouts */
  worktrees?: string
}

/** The browser's storage, or what finds it (`StoragePlace` calls it, and keeps memory when it throws). */
export type StorageFinder = Storage | (() => Storage) | null | undefined

/** `storage` as `StoragePlace` takes it:  the storage, found now;  none for none (memory). */
export function storageNow(storage: StorageFinder): Storage | undefined {
  return (typeof storage === "function" ? storage() : storage) ?? undefined
}

/** What a `ServerLink` (and an `AgentsClient`) is made from:  the page's facts, and `fetch` (stubbed in tests). */
export type ServerLinkOptions = {
  /** the page's URL path:  every route's `page` */
  page: string
  /** the page server's info;  none (`file://`, a plain static server):  nothing to review, no agents */
  server?: ServerInfo
  /** `location.protocol`:  `file:` never asks */
  protocol?: string
  /** `fetch`, bound */
  fetch: typeof fetch
  /**
   * the page as the page server serves it to the browser NOW, with its `window.SPELL_SERVER`
   * (`ServerLink`'s token refresh);  none:  `fetch()`ed (tests)
   * - why not `fetch()` in a browser:
   *   the server sends a script's `fetch()` the file as is, without it (`StaticHandler`, `Sec-Fetch-Dest: empty`)
   */
  readServed?: (page: string) => Promise<string>
}

/** What a `ReviewClient` is made from:  its link's facts, plus the browser's storage and the page's items. */
export type ReviewClientOptions = ServerLinkOptions & {
  /**
   * `localStorage`, for the note backups, or what finds it;  `null`:  none (private window, tests)
   * - a finder that throws (blocked site data):  this page's memory (`StoragePlace`)
   */
  storage?: StorageFinder
  /**
   * Is `id` an item or section of this page?
   * - a backup for one that's gone is dropped
   * - default:  always
   */
  hasItem?: (id: string) => boolean
}

/** What a write takes, besides its body. */
export type WriteOptions = {
  /** the caller says what went wrong (from `lastWriteError`):  no notice */
  quiet?: boolean
  /** the page is going away:  `fetch`'s `keepalive` */
  keepalive?: boolean
}

/**
 * One running agent, as the page shows it.
 * - the list's own `RunningAgent` (`tools/AgentList.ts`), every field filled in (`agentsOf()`)
 * - `started`:  `""` for unknown
 * - `redirects`:  `[]` for none
 * - not `taskId`:  the page has no use for it
 */
export type RunningAgent = Required<Omit<ListedAgent, "taskId" | "redirects">> & { redirects: AgentRedirect[] }

/** A note Owen sent a running agent from the page:  the list's `Redirect`, `told` filled in (`""`:  not yet). */
export type AgentRedirect = Required<Redirect>

export type {
  InboxDraft,
  InboxListener,
  InboxMark,
  InboxUrgency,
  InboxWoken,
  NewKind,
  NowAction,
  NowRequest,
  PickFields,
  AddedOption,
  EditedOption,
  WaitingComment,
  WorkingEntry
}

////////////////
// ## Errors
////////////////

/**
 * A POST to the page server didn't go through (`ServerLink.post()`).  Its message says why, for people, in
 * lower case (`sentence()` makes it one):  the route's `error`, a stale token, no server.
 */
export class ServerWriteError extends Error {}
ServerWriteError.prototype.name = "ServerWriteError"

////////////////
// ## Helpers
////////////////

/** A route's reply as an inbox, every field there. */
export function inboxOf(reply: unknown): Inbox {
  const record = (reply ?? {}) as Partial<Record<keyof Inbox, unknown>>
  return {
    marks: isObject(record.marks) ? (record.marks as Inbox["marks"]) : {},
    drafts: isObject(record.drafts) ? (record.drafts as Inbox["drafts"]) : {},
    urgency: isObject(record.urgency) ? (record.urgency as Inbox["urgency"]) : {},
    sent: typeof record.sent === "string" ? record.sent : null,
    now: Array.isArray(record.now) ? (record.now as NowRequest[]) : [],
    working: isObject(record.working) ? (record.working as Inbox["working"]) : {},
    listening: isObject(record.listening) ? (record.listening as InboxListener) : null,
    lastListener: isObject(record.lastListener) ? (record.lastListener as InboxListener) : null,
    unsentComments: Array.isArray(record.unsentComments)
      ? record.unsentComments.filter((id): id is string => typeof id === "string")
      : [],
    waitingComments: Array.isArray(record.waitingComments)
      ? record.waitingComments.filter(
          (each): each is WaitingComment =>
            isObject(each) &&
            typeof (each as WaitingComment).id === "string" &&
            typeof (each as WaitingComment).anchor === "string"
        )
      : [],
    woken:
      isObject(record.woken) && typeof (record.woken as InboxWoken).message === "string"
        ? (record.woken as InboxWoken)
        : null,
    doing:
      isObject(record.doing) && typeof (record.doing as InboxDoing).text === "string"
        ? (record.doing as InboxDoing)
        : null
  }
}

/** A Send's or Do Now's reply:  what the page server's wake did (`wake`), or `null` (a session listens, an older server). */
export function wakeOf(reply: unknown): WakeAnswer | null {
  const wake = (reply as { wake?: unknown } | null)?.wake
  return isObject(wake) && typeof (wake as WakeAnswer).message === "string" ? (wake as WakeAnswer) : null
}

/** An empty inbox:  before the first read. */
export function emptyInbox(): Inbox {
  return inboxOf(null)
}

/**
 * Has `mark` gone to Claude?  Made before the last "Send to Claude" (`sent`, ISO time or null), or an immediate one
 * (Add Details, revisit now:  handed over when made), as `ReviewInbox.unsentMarks` counts.
 */
export function isSent(mark: { action: string; when?: string; at: string }, sent: string | null): boolean {
  if (isImmediate(mark)) return true
  return !!sent && Date.parse(mark.at) <= Date.parse(sent)
}

/**
 * Is `mark` HELD:  dated after `now` (ms), so it waits for its time, not for a Send (epic `epic-engine` I181)?
 * As `ReviewInbox.isHeld()`.
 * - a stage button's accept (`countdown`) is dated `STAGE_COUNTDOWN_MS` after the press
 * - held, it's neither unsent nor sent:  a Send before its time leaves it, as `sent` is older than it
 */
export function isHeld(mark: { at: string }, now = Date.now()): boolean {
  return Date.parse(mark.at) > now
}

/** Is `mark` an immediate request (Add Details, revisit now), handed over when made?  As `ReviewInbox`'s. */
export function isImmediate(mark: { action: string; when?: string }): boolean {
  return mark.action === "details" || mark.action === "prepare" || (mark.action === "revisit" && mark.when === "now")
}

/**
 * Open tests in the order Owen goes through them (epic `epic-engine` P51), the ONE rule the page's Manual tests
 * section and `epic test --list` share:
 * - the PREPARED ones first (`prepared`, Start testing's place for each:  same window together), by that place
 * - then the rest in page order, the deferred ones (an older run's Not now) last
 * - `tests` in page order;  a new list, `tests` untouched
 */
export function inTestOrder<T extends { prepared?: string | null; deferred?: string | null }>(
  tests: readonly T[]
): T[] {
  const place = (test: T) => Number(test.prepared) || Infinity
  const prepared = tests.filter((test) => place(test) < Infinity).sort((a, b) => place(a) - place(b))
  const rest = tests.filter((test) => place(test) === Infinity)
  return [...prepared, ...rest.filter((test) => !test.deferred), ...rest.filter((test) => test.deferred)]
}

/**
 * `mark`'s pick and the rest of its set change (epic `epic-engine` P50), to carry into another mark (a revisit's
 * "pick B, but ..."):  `{ pick, choices, multiple, added, edited, removed }`, each only when given;  `{}` with no change.
 * As `ReviewInbox.pickOf()`.
 */
export function pickOf(mark: PickFields | null | undefined): PickFields {
  if (!mark || !hasSetChange(mark)) return {}
  const { pick, choices, multiple, added, edited, removed } = mark
  return {
    ...(pick && { pick }),
    ...(choices !== undefined && { choices }),
    ...(multiple !== undefined && { multiple }),
    ...(added?.length && { added }),
    ...(edited?.length && { edited }),
    ...(removed?.length && { removed })
  }
}

/** Does `mark` change its option set at all:  a pick, the flip, an option added, edited or removed? */
export function hasSetChange(mark: PickFields): boolean {
  const { pick, multiple, added, edited, removed } = mark
  return Boolean(pick || multiple !== undefined || added?.length || edited?.length || removed?.length)
}

/** The letters (and added keys, `+1`) a pick names:  `"A C +1"` => `["A", "C", "+1"]`;  `[]` for none. */
export function pickedLetters(pick: string | null | undefined): string[] {
  return (pick ?? "").split(/[\s,]+/).filter(Boolean)
}

/** `mark`'s comments, to carry into another revisit (epic `epic-engine` I140):  `{ comments }`, or `{}`. */
export function commentsOf(mark: { comments?: string[] } | null | undefined): { comments?: string[] } {
  return mark?.comments?.length ? { comments: mark.comments } : {}
}

/**
 * Is a comment at `anchor` in the text of `id` (an item, a phase, an Overview part)?
 * - its anchor is `id` itself, or a block placed in it, `<id>#<kind>-<n>` (`BlockAnchors.js`)
 * - NOT a block with an id of its own inside it, nor one in a part nested in it:  those are anchored by their own id
 */
export function isAnchoredIn(anchor: string, id: string): boolean {
  return partOf(anchor) === id.toLowerCase()
}

/**
 * The part a comment at `anchor` lies in, lower-case:  `t3` for `t3` or `t3#list-1`;  `page` for `page#list-1`.
 * - whether that part takes a mark is the caller's to say (`ReviewInbox.itemIds()`)
 */
export function partOf(anchor: string): string {
  return anchor.split("#")[0]!.toLowerCase()
}

/** How `inlineCommentsNote()` starts. */
const INLINE_NOTE_LEAD = "see my comments in its text:  "

/** `inlineCommentsNote()`'s line, at a note's end. */
const INLINE_NOTE = new RegExp(`(?:^|\\n+)${INLINE_NOTE_LEAD}[^\\n]*$`)

/**
 * The note of a revisit made of Owen's comments in its text (epic `epic-engine` I140):
 * `see my comments in its text:  C1, C3`.
 * - Owen's words to Claude, which Claude reads, as `DO_IT_NOTE`:  never translated
 */
export function inlineCommentsNote(ids: readonly string[]): string {
  return `${INLINE_NOTE_LEAD}${ids.map((id) => id.replace(/^c/i, "C")).join(", ")}`
}

/**
 * A revisit's note with its comments in its text named again (epic `epic-engine` I158):
 * Owen's own words, then `see my comments in its text:  C1, C4` on a line of its own;  `""` with neither.
 * - the line already there is dropped first, so there's ever one, naming `ids` (none:  no line)
 * - a comment saved or deleted in a part's text writes it (`ReviewInbox.noteComment()`, `dropComment()`)
 */
export function withInlineComments(note: string, ids: readonly string[]): string {
  const own = note.replace(INLINE_NOTE, "").trim()
  return [own, ids.length ? inlineCommentsNote(ids) : ""].filter(Boolean).join("\n\n")
}

/**
 * Is `mark`'s pick option `letter` of card set `choices` (its position among the item's sets, I8)?
 * - a pick-any set's mark names several (`A C`, P50):  any of them
 * A mark without `choices` (from before I8) picks from the item's OWN set:  `own` says whether set `choices` is it.
 */
export function picks(mark: PickFields | null | undefined, letter: string, choices: number, own: boolean): boolean {
  if (!mark || !pickedLetters(mark.pick).includes(letter)) return false
  return mark.choices === undefined ? own : mark.choices === choices
}

/**
 * ISO time `iso` as the viewer's clock time, 24-hour, `14:42`;  `""` for none.
 * - a time shown alone (`saved 14:42`, a redirect's `told 14:43`):
 *   the kit's `clockTime()`, never the locale's `2:42 PM`
 */
export function clockOf(iso: string | null | undefined): string {
  const date = iso ? new Date(iso) : null
  if (!date || isNaN(date.getTime())) return ""
  return clockTime(date)
}

/** A route's reply as the running agents, every field there (`AgentList.ts` has their shape);  `[]` for none. */
export function agentsOf(reply: unknown): RunningAgent[] {
  const agents = (reply as { agents?: unknown } | null)?.agents
  if (!Array.isArray(agents)) return []
  return (agents as (Record<string, unknown> | null)[])
    .filter((agent) => typeof agent?.name === "string")
    .map((agent) => ({
      name: agent!.name as string,
      task: stringOr(agent!.task, ""),
      status: stringOr(agent!.status, "active"),
      started: stringOr(agent!.started, ""),
      redirects: (Array.isArray(agent!.redirects) ? (agent!.redirects as (Record<string, unknown> | null)[]) : []).map(
        (redirect) => ({
          note: stringOr(redirect?.note, ""),
          at: stringOr(redirect?.at, ""),
          told: stringOr(redirect?.told, "")
        })
      )
    }))
}

/** `value` when it's a string, else `fallback`:  a reply's field, read safely. */
function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback
}

/** How long ago ISO time `iso` was, to `now` (ms):  `<1m`, `3m`, `2h 5m`, `1d 4h`;  `""` for none. */
export function ageOf(iso: string, now: number): string {
  const minutes = Math.floor((now - Date.parse(iso)) / 60_000)
  if (Number.isNaN(minutes)) return ""
  if (minutes < 1) return "<1m"
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return minutes % 60 ? `${hours}h ${minutes % 60}m` : `${hours}h`
  const days = Math.floor(hours / 24)
  return hours % 24 ? `${days}d ${hours % 24}h` : `${days}d`
}

/** `message` as a sentence:  a capital first, a full stop last (unless it ends in one already);  `""` for none. */
export function sentence(message: string): string {
  if (!message) return ""
  return `${message[0]!.toUpperCase()}${message.slice(1)}${/[.!?]$/.test(message) ? "" : "."}`
}

/** A plain object (not null, not an array)? */
function isObject(value: unknown): boolean {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

/**
 * The page server's answer to "start a review" (`POST /api/epics/review/start`, epic `airplane` P12):
 * its `StartResult`.
 * - `asked`:  told through its inbox poller (epic `epic-engine` I144);  `sent`:  typed into the one session titled for
 *   the epic;  `tab-open` / `none` / `several` / `no-window`:  nothing sent
 */
export type StartAnswer = {
  state: "asked" | "sent" | "tab-open" | "none" | "several" | "no-window"
  command: string
  sessions: string[]
  message: string
}
