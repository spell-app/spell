import { localTime } from "spell/util/time"
import { SRV } from "spell/server"

import { ThreadFacts } from "spell/epic/comments"
import { EpicHome } from "spell/epic/config/EpicHome"
import { DataFile } from "spell/epic/data/DataFile"
// By file:  the definitions' barrel loads every vocabulary, which reading an inbox doesn't need
import { isItemId } from "spell/epic/definitions/definitions.types"
import { PageStages, PhaseIds, type PageStage } from "spell/epic/phases"
// By file:  the review barrel is the page's (its client, its store);  these are plain functions
import { partOf, withInlineComments } from "spell/epic/review/review.types"

import { CommentList, type Comment, type IdentifiedComment } from "./CommentList"
import { SharedComments } from "./SharedComments"

/****************
 * ### `ReviewInbox`
 * An epic page's REVIEW INBOX:  the marks Owen leaves on its items from the page, waiting for Claude.
 * - the file:  `epics/<name>/<name>.inbox.json5`, beside `<name>.plan.html` (decision D1 of `review-review`);
 *   absent until the first mark, and deleted again once nothing is in it (`isEmpty`)
 *   - JSON5, saved keeping any comment added by hand (`DataFile`, epic `epic-workflow` P21);  its old name,
 *     `<name>.inbox.json5`, is read while there's no `.json5`, and removed by the next write
 *   - a SAGA page keeps one the same way (epic `epic-workflow` P15):  `sagas/<id>/<id>.inbox.json5`, beside
 *     `<id>.saga.html`, its marks and comments in this same shape
 * - per machine, NOT committed (`.gitignore`):  pending notes and session state, not the record;
 *   what Claude makes of a mark lands in the epic page itself
 *   - EXCEPT its comments (epic `epic-friend` P9):  shared through the content repo, one file per person beside it,
 *     `<name>.comments.<person>.json5` (`SharedComments`).  `comments` here is every person's, put together as it's
 *     read;  a write puts this machine's person's part back in their file, and keeps none in the inbox file.
 *     An inbox file from before P9 still holds its comments:  read as this machine's, moved by the next write
 * - writers:  the page server's route module (`reviewRoutes.ts`, the page's clicks)
 *   and `epic inbox ...` (Claude taking the marks:  `watch`, `wait`, `apply`, `done`, `clear`).
 *   Both go through `ReviewInbox.update()` / `updateAsync()`:
 *   under the file's lock (`SRV.FileLock`), written atomically (a temp file renamed over it),
 *   so neither clobbers the other and a reader never sees half a file
 * - an instance IS the file's JSON:  its own fields are exactly the file's keys, in the file's order
 *   (so `JSON.stringify()` writes it, and a route answers with it), plus any key a hand edit added;
 *   its methods change only it, so `ReviewInbox.test.ts` drives them directly
 * - Shape (`version: 1`):
 *   - `marks`:
 *     `{ [id]: { action, at, when?, note?, pick?, choices? } }`, one per item id (lower-case), the latest wins
 *     - what takes a mark (`itemIds()`):  an item, an Overview sub-section (`o3`), a phase (its stable id,
 *       `p-epic-migrate`), and the summary, keyed `summary` (it has no id of its own;  epic `airplane` P2)
 *     - a NEW item Owen asks for from the page (epic `airplane` P2), `{ action: "new", kind, title, note?, near? }`
 *       - under a key of its own, `new1`, `new2` ... (`setNew()`), so several wait at once
 *       - `kind`:  `todo` or `question`;  `near`:  the id of what it's about
 *       - sent with the rest;  `epic inbox apply` makes the item
 *     - a plain pick, `{ action: "pick", pick: "B", choices: 1 }`, on any item kind (I8):
 *       applied by `epic inbox apply`
 *       - `choices`:  WHICH of the item's option card sets, by position, 0 the first (`PlanItem.choiceSets()`):
 *         one item may hold several (its text's, a reply's)
 *       - none (an older mark):  the item's own (`PlanItem.choicesOf()`)
 *     - "pick B, but ...":  a revisit carrying the pick, `{ action: "revisit", when, note, pick: "B" }`;
 *       never applied:  Claude talks it over (`toMark()`)
 *     - a revisit whose content is Owen's comments in the part's text (epic `epic-engine` I140):
 *       `{ action: "revisit", when, note, comments: ["c1", "c3"] }`, the note pointing at them;
 *       `takeWork()` hands the comments over with it (`inlineComments`)
 *     - pressed by itself when Owen saves a comment in that text (`noteComment()`, `dropComment()`;  I158)
 *     - a TEST's answer from the page's test run (epic `epic-engine` P4), on a test item (`m3`) only:
 *       `{ action: "test", result, note?, shot? }`
 *       - `result`:  `passed`, `failed`, `skip` (no longer applies), `notnow` (can't do it yet):  `TEST_RESULTS`
 *       - `note`:  what Owen says (a failure's);  `shot`:  his screenshot, `tests/m3-20261019-1432.png`,
 *         from the epic page's folder (written by the review routes' `POST shot`)
 *       - sent with the rest;  `epic inbox apply` applies it (`PlanDoc.applyMark()`)
 *     - the page header's STAGE BUTTON (epic `epic-engine` P29), Accept Overview or Accept Phases:
 *       `{ action: "accept", stage: "overview" }` under the key `stage` (`STAGE_ID`), while the page is in that stage
 *       - sent at once with whatever else is unsent;  `epic inbox apply` moves the page on a stage
 *     - a phase's Defer, while the phases are agreed (P29):  `{ action: "defer" }`, applied by moving the phase after
 *       the others, still to do
 *     - a CHANGE MARK's buttons (`<epic-change id="ch3">`, epic `epic-engine` P30), under its id (`CHANGE_ID`):
 *       `{ action: "accept" }` (the change stands:  `inbox apply` marks it `accepted`, the orange goes, its chip
 *       stays) or `{ action: "reopen" }` (`inbox apply` reopens the question it names;  the mark stays orange)
 *       - only a change takes them, and a change takes nothing else;  `accept` without a `stage` is a change's
 *   - `drafts`:  `{ [id]: { action, note, at } }`, a note box's text as Owen types it (`setDraft()`),
 *     until the mark that uses it;  never sent or counted
 *   - `urgency`:  `{ [id]: { calm, at } }`, Owen's click on an open judgement call's or issue's id chip
 *     (`setUrgency()`):  `calm` true, not urgent (blue);  false, urgent (red) again.
 *     Beside its mark, never one:
 *     sent with the marks, written into the doc by `epic inbox apply` (`<epic-item calm>`)
 *   - `sent`:  ISO time of the last "send to Claude", else `null`;  marks newer than it are unsent (`unsentMarks`)
 *   - `now`, `[{ id, action, at, note?, pick?, choices? }]`:
 *     immediate requests (Add Details, revisit now) for Claude to take
 *   - `working`:  `{ [id]: { action, since } }`, Claude's agents at work on an item (the page shows a spinner)
 *   - `canceled`:  `{ [id]: { action, at, told } }`, a request Owen called off ("nevermind", `cancelNow()`):
 *     the waiting session stops its agent (`told` once handed over), and a late write into the item is refused
 *   - `listening`:  `{ session, since, seen, pid? }` while a Claude session waits on this inbox, else `null`
 *     - `seen`:  its last heartbeat (`epic inbox wait` stamps it every `LISTEN_HEARTBEAT_MS`);
 *       older than `LISTEN_STALE_MS` (an old file without one:  `since` that old), the session is gone:
 *       `liveListener()` is `null`, and the routes answer `listening: null` (`forPage()`)
 *     - `pid`:  the session's MONITOR's process, when the monitor listens (`InboxMonitor`, epic `epic-engine` P19):
 *       live while that process runs, heartbeat or not;  gone the moment it ends
 *   - `handedOver`:  the `sent` time a waiting session last took (`takeWork()`), else `null`:
 *     so a second `epic inbox wait` doesn't hand the same send over again
 *   - `comments`:  `{ [c1 ...]: comment }` (shown `C1`;  `m1` or `cm1` in an older file:  `CommentList.label()`), Owen's comments on the page's blocks and on selected text
 *     (epic `airplane` P11), in the shape a guide's inbox holds them (`CommentList`)
 *     - waiting until Claude answers them like a revisit's note (`/epic review`, `/airplane land`),
 *       then `answered` (`epic inbox done <name>#C3`)
 *     - Send hands them over, as it does marks (Owen, 2026-10-10:  he keeps Send as the way comments reach Claude):
 *       a waiting comment whose last words are newer than `sent` is unsent (`unsentComments`);
 *       a waiting session takes it with the send (`takeWork()`), once, until Owen speaks on its thread again
 *   - `doing`:  `{ text, items?, at }`, what the listening session is doing now (epic `epic-engine` P35:  "Responding",
 *     "Building P35"), the page's toolbar line;  `items`, what it's answering (`{ id, title }`), the line's tooltip
 *     - set by `epic inbox status`, gone with `--clear`, `ignore`, or the listener's heartbeat going stale
 *       (`forPage()` answers `doing: null` then:  a stale line never lingers)
 *   - `woken`:  `{ at, state, did, message }`, the last time the page server WOKE the epic (epic `epic-workflow`
 *     P16:  a Send or Do Now with nobody listening typed `/epic review <epic>` somewhere), else `null`
 *     - so one epic is woken once:  a second Send inside `WAKE_COOLDOWN_MS` says what the first one did
 *       (`claimWake()`), from the epic page or any page that wakes the same epic
 *     - `state` `waking` while the wake is under way, claimed under the lock:  two Sends at once wake once
 *     - gone once a session listens (`setListening()`), or `WAKE_COOLDOWN_MS` after `at` (`liveWoken()`)
 *   - `reviewAsked`:  ISO time Owen asked for a review from the page ("start review") while the session's inbox
 *     POLLER runs (epic `epic-engine` I144), else `null`:  the poller's next look says so (`📬`), which wakes the
 *     session, instead of typing into it (`askReview()`)
 *     - gone once a session waits on the inbox itself (`setListening()` with no poller), `epic inbox watch`
 * - Node only (`node:fs`, `spell/server`'s lock):  NOT in the `spell-epic` barrel, imported by path.
 *   Imports no other file of the tool but `CommentList` (its comments);  of the page's review code, only its plain
 *   functions (`review.types`:  a revisit's note naming comments, I158).
 * - From the docs tools' `inbox.js` (epic `epic-components`, P7), which now forwards here.
 ****************/
export class ReviewInbox {
  /** the format this writes;  a file without one is read as this */
  version: number = INBOX_VERSION
  /** one mark per item id (lower-case), the latest wins */
  marks: Record<string, InboxMark> = {}
  /** a note box's text as Owen types it, per item:  never sent or counted */
  drafts: Record<string, InboxDraft> = {}
  /** Owen's urgency for an item (its id chip clicked), until applied */
  urgency: Record<string, InboxUrgency> = {}
  /** ISO time of the last "send to Claude", else `null` */
  sent: string | null = null
  /** immediate requests (Add Details, revisit now), oldest first */
  now: NowRequest[] = []
  /** Claude's agents at work, per item (the page's spinner) */
  working: Record<string, WorkingEntry> = {}
  /** requests Owen called off ("nevermind"), per item */
  canceled: Record<string, InboxCancel> = {}
  /** the Claude session waiting on this inbox, else `null` */
  listening: InboxListener | null = null
  /** the `sent` time a waiting session last took, else `null` */
  handedOver: string | null = null
  /**
   * every person's comments on the page's blocks, by id (`c1` ...;  `m1` or `cm1` in an older file):  `CommentList`;
   * kept in their comments files, never the inbox file (`SharedComments`, epic `epic-friend` P9)
   */
  comments: Record<string, Comment> = {}
  /** the page server's last wake of the epic (P16), else `null` */
  woken: InboxWoken | null = null
  /** what the listening session is doing now (P35:  the page's toolbar line), else `null` */
  doing: InboxDoing | null = null
  /** when Owen asked for a review from the page, for the session's poller to pass on (I144), else `null` */
  reviewAsked: string | null = null

  /**
   * An inbox:  empty, or the fields of `record` (a file's JSON) over an empty one's.
   * - a field the record lacks keeps its empty value, so readers never check;  a key it adds is kept, after them
   * - a comment key spelt an older way (`m3`, `cm3`) respelt (`CommentList.migrate()`)
   */
  constructor(record: Partial<InboxRecord> & Record<string, unknown> = {}) {
    Object.assign(this, record)
    CommentList.migrate(this.comments)
  }

  /**
   * The comments, to read or change (in place).
   * - what's written through it names this machine's person (`EpicHome.personName()`, read when something's written),
   *   and an answer the agent running `epic` (`EpicHome.agentName()`, epic `epic-friend` P10)
   */
  get commentList(): CommentList {
    return new CommentList(this.comments, { person: () => EpicHome.personName(), agent: () => EpicHome.agentName() })
  }

  ////////////////
  // ## The file
  ////////////////

  /**
   * The inbox file of the epic page at `planDoc`:  `<name>.inbox.json5` beside it.
   * - a saga page's too (`sagas/<id>/<id>.saga.html`, epic `epic-workflow` P15):  `<id>.inbox.json5`, the same shape
   * - an old epic page's name (`<name>.html`, before the `.plan.html` rename) gives the same file
   * - STATIC, as every file helper here:  they work on paths, before any inbox is read
   */
  static pathFor(planDoc: string): string {
    return planDoc.replace(/(\.plan|\.saga)?\.html$/, `.inbox${DataFile.SUFFIX}`)
  }

  /**
   * The inbox in `file`;  an empty one when there's no file.
   * - fills in missing fields, so readers never check:  an older or hand-edited file still reads
   * - its old `.json` name when there's no `.json5` (`DataFile.read()`)
   * - its comments:  every person's comments file beside it, put together (`SharedComments.merged()`), with any the
   *   file itself still holds (from before epic `epic-friend` P9)
   * - NEVER throws on a missing file;  a file that isn't JSON5 throws an `InboxError` naming it
   */
  static read(file: string): ReviewInbox {
    let raw: Record<string, unknown> | undefined
    let shared: SharedComments
    try {
      raw = DataFile.read<Record<string, unknown>>(file)
    } catch (error) {
      throw new InboxError(`${file} is not JSON5:  ${(error as Error).message}`)
    }
    try {
      shared = SharedComments.read(file)
    } catch (error) {
      throw new InboxError((error as Error).message)
    }
    const local = (raw?.comments ?? {}) as Record<string, Comment>
    const comments = shared.merged(local)
    const inbox = new ReviewInbox({ ...raw, version: (raw?.version as number | undefined) ?? INBOX_VERSION, comments })
    return inbox.sharing(shared)
  }

  /**
   * This inbox's comments files, as `read()` found them (`SharedComments`):  a write splits `comments` by them.
   * Not a field:  the file's JSON is the inbox's own fields.
   */
  declare private shared: SharedComments | undefined

  /** This inbox, its comments read from `shared` (`read()`). */
  private sharing(shared: SharedComments): this {
    Object.defineProperty(this, "shared", { value: shared, enumerable: false, writable: true })
    return this
  }

  /**
   * Write `comments` into this machine's person's comments file beside inbox file `file` (`SharedComments.write()`).
   * - an inbox made, not read:  the files there now
   * - SIDE EFFECT:  writes or removes that file
   */
  private writeComments(file: string): void {
    const shared = this.shared?.inbox === file ? this.shared : SharedComments.read(file)
    shared.write(this.comments, EpicHome.personName())
  }

  /** What the inbox FILE holds:  every field but the comments (`SharedComments`' files hold those). */
  private get fileRecord(): Omit<InboxRecord, "comments"> {
    const { comments: _comments, ...rest } = this.toRecord()
    return rest
  }

  /**
   * Write this inbox to `file`, atomically;  delete the file instead when the inbox is empty (`isEmpty`).
   * - its comments into this machine's person's comments file instead (`SharedComments`, epic `epic-friend` P9)
   * - a temp file (`<file>.tmp`) renamed over it:  readers (the page's poll, `epic inbox`) never see half of it
   * - a comment added to the file by hand stays (`DataFile.write()`);  its old `.json` goes
   * - call it under the lock (`update()`), or two writers may lose each other's changes
   * - sync, for the command line's `update()`;  the page server's `updateAsync()` writes through `writeAsync()`
   * - SIDE EFFECT:  writes or removes `file`
   */
  writeTo(file: string): void {
    this.writeComments(file)
    if (this.isEmpty) return DataFile.remove(file)
    DataFile.write(file, this.fileRecord)
  }

  /**
   * `writeTo()` for a server:  through the page server's one atomic write (`SRV.FileOperations.writeAtomic()`).
   * - NOT `SRV.FileOperations.save()`:  an empty inbox deletes its file, which a save can't
   * - call it under the lock (`updateAsync()`)
   * - SIDE EFFECT:  writes or removes `file`
   */
  private async writeAsync(file: string): Promise<void> {
    this.writeComments(file)
    if (this.isEmpty) return DataFile.remove(file)
    await SRV.FileOperations.writeAtomic(file, DataFile.textFor(DataFile.text(file) ?? "", this.fileRecord))
    DataFile.removeOld(file)
  }

  /**
   * Change the inbox in `file` with `change(inbox)` under its lock, write it, and return it.
   * - BLOCKS while waiting for the lock (`SRV.FileLock.run()`):  for command-line tools.  A server:  `updateAsync()`
   * - SIDE EFFECT:  writes `file` (or removes it:  `writeTo()`)
   */
  static update(file: string, change: (inbox: ReviewInbox) => unknown): ReviewInbox {
    return SRV.FileLock.run(file, () => {
      const inbox = ReviewInbox.read(file)
      change(inbox)
      inbox.writeTo(file)
      return inbox
    })
  }

  /**
   * `update()` for a server:  waits for the lock with timers, so it keeps serving meanwhile.
   * - `change` runs synchronously, under the lock
   * - SIDE EFFECT:  writes `file` (or removes it:  `writeAsync()`)
   */
  static updateAsync(file: string, change: (inbox: ReviewInbox) => unknown): Promise<ReviewInbox> {
    return SRV.FileLock.runAsync(file, async () => {
      const inbox = ReviewInbox.read(file)
      change(inbox)
      await inbox.writeAsync(file)
      return inbox
    })
  }

  /**
   * Is there nothing in this inbox worth a file?
   * No marks, no drafts, no urgency, no requests, no agents at work, nobody listening, no wake still cooling down,
   * no comment in any person's file (they keep `sent` meaning something).
   * - `sent` and `handedOver` alone don't count:  they only date marks, and there are none
   * - a wake does while it counts (`liveWoken()`):  a guide's Send wakes its epic through this file (P16),
   *   and the record must outlast a write
   */
  get isEmpty(): boolean {
    return (
      !Object.keys(this.marks).length &&
      !Object.keys(this.drafts).length &&
      !Object.keys(this.urgency).length &&
      !this.now.length &&
      !Object.keys(this.working).length &&
      !Object.keys(this.canceled).length &&
      !Object.keys(this.comments).length &&
      !this.listening &&
      !this.reviewAsked &&
      !this.liveWoken()
    )
  }

  ////////////////
  // ## Drafts
  ////////////////

  /**
   * Item `id`'s note box text, as Owen types it (epic `windows-and-review` P1);  `note` empty or `null` drops it.
   * - kept here, on the server, so a reload from ANY address finds it
   *   (the page's `localStorage` is per address, and lost notes that way)
   * - not a mark:  never sent, never counted, never wakes a waiting session;
   *   the mark that uses it drops it (`setMark()`, `requestNow()`)
   * - `note` kept as typed (not trimmed:  the box shows it back as it was)
   * - returns the draft set, or `null`
   */
  setDraft(id: unknown, action: unknown, note: unknown, at = isoTime()): InboxDraft | null {
    const key = ReviewInbox.toItemId(id)
    if (!isNoteAction(action)) throw new InboxError(`no note box on ${action} (${NOTE_ACTIONS.join(" | ")})`)
    if (note !== null && typeof note !== "string") throw new InboxError("a draft's note is text, or null")
    if (!note?.trim()) {
      delete this.drafts[key]
      return null
    }
    this.drafts[key] = { action, note, at }
    return this.drafts[key]
  }

  ////////////////
  // ## Urgency
  ////////////////

  /**
   * Owen's urgency for item `id` (its id chip clicked while the page is reviewed).
   * - `calm` true:  not urgent (blue);  false:  urgent (red);  `null` drops it (clicked back to what the doc says)
   * - not a mark:  an item may hold both (approve it AND say it's not urgent)
   * - sent with the marks, as they are (`sentUrgency`),
   *   and written into the doc by `epic inbox apply` (`PlanDoc.setCalm()`)
   * - only an open judgement call or issue is ever red for want of a review (`PlanReader.itemState()`):
   *   only their ids (`CALM_ID`);  an `InboxError` for any other
   * - returns the entry set, or `null`
   */
  setUrgency(id: unknown, calm: unknown, at = isoTime()): InboxUrgency | null {
    const key = ReviewInbox.toItemId(id)
    if (!CALM_ID.test(key)) throw new InboxError(`only a judgement call or an issue is urgent or not:  ${key}`)
    if (calm !== null && typeof calm !== "boolean") throw new InboxError("calm is true, false, or null")
    if (calm === null) {
      delete this.urgency[key]
      return null
    }
    this.urgency[key] = { calm, at }
    return this.urgency[key]
  }

  /** Every urgency as `[{ id, calm, at }]`, oldest first. */
  get urgencyList(): ListedUrgency[] {
    return Object.entries(this.urgency)
      .map(([id, entry]) => ({ id, ...entry }))
      .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  }

  /** Urgency a "send to Claude" handed over:  set at or before `sent`;  none before the first send. */
  get sentUrgency(): ListedUrgency[] {
    if (!this.sent) return []
    const sent = Date.parse(this.sent)
    return this.urgencyList.filter((entry) => Date.parse(entry.at) <= sent)
  }

  /** Urgency waiting for Owen's "send to Claude":  newer than `sent` (all of it before the first send). */
  get unsentUrgency(): ListedUrgency[] {
    const sent = this.sent ? Date.parse(this.sent) : -Infinity
    return this.urgencyList.filter((entry) => Date.parse(entry.at) > sent)
  }

  /**
   * Remove the urgency Claude applied, `[{ id, at }]`,
   * but only while each is still the one applied (as `clearApplied()`);  returns the ids cleared.
   */
  clearUrgency(entries: { id: string; at: string }[]): string[] {
    const cleared: string[] = []
    for (const { id, at } of entries) {
      const key = ReviewInbox.toItemId(id)
      if (this.urgency[key]?.at !== at) continue
      delete this.urgency[key]
      cleared.push(key)
    }
    return cleared
  }

  ////////////////
  // ## Marks
  ////////////////

  /**
   * Set item `id`'s mark to `mark` (checked:  `toMark()`), stamped `at`;  `null` removes it.
   * - the latest mark wins:  a new one replaces the old, whatever its action
   * - removing it, or replacing it with one that waits for a send, drops the item's queued `now` request:
   *   Owen changed his mind before Claude took it
   * - returns the mark set, or `null`
   */
  setMark(id: unknown, mark: unknown, at = isoTime()): InboxMark | null {
    const key = ReviewInbox.toItemId(id)
    const checked = mark === null ? null : { ...ReviewInbox.toMark(mark), at }
    if (checked && (checked.action === "new") !== NEW_ID.test(key))
      throw new InboxError(`a new item is asked for under its own key (new1 ...), never on an item:  ${key}`)
    if (checked?.action === "test" && !TEST_ID.test(key)) throw new InboxError(`only a test is tested:  ${key}`)
    if (checked) checkChangeMark(key, checked)
    if (!checked || !ReviewInbox.isImmediate(checked)) this.now = this.now.filter((each) => each.id !== key)
    if (checked) this.marks[key] = checked
    else delete this.marks[key]
    // the note box's text is in the mark now;  a mark removed (Clear) takes its unsent text with it
    if (!checked || checked.note !== undefined) delete this.drafts[key]
    return checked
  }

  /**
   * A NEW item Owen asks for from the page (epic `airplane` P2).
   * - `entry` (`{ kind, title, note?, near? }`, checked:  `toMark()`):
   *   under key `id`, or (none) the next free key, `new1`, `new2` ...
   * - `entry` `null` removes it
   * - a mark like any other, `{ action: "new", ... }`:  sent with the rest (`unsentMarks`),
   *   made into an item by `epic inbox apply` (`PlanDoc.applyMark()`), editable or removable until then
   * - the key is chosen here, under the inbox's lock:  two pages adding at once never take the same one
   * - returns the key, or `null` once removed
   * - throws an `InboxError` for a bad entry, a key that isn't a new item's, or a removal without a key
   */
  setNew(id: unknown, entry: unknown, at = isoTime()): string | null {
    const given = id !== undefined && id !== null
    if (given && (typeof id !== "string" || !NEW_ID.test(id.toLowerCase())))
      throw new InboxError(`not a new item's key:  ${JSON.stringify(id)}`)
    if (entry === null) {
      if (!given) throw new InboxError("remove which new item?  its key (new1 ...)")
      this.setMark(id, null, at)
      return null
    }
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new InboxError("a new item is an object")
    const key = given ? ReviewInbox.toItemId(id) : this.nextNewId()
    this.setMark(key, { ...entry, action: "new" }, at)
    return key
  }

  /** The next free new item key:  `new<N>`, one past the highest waiting. */
  private nextNewId(): string {
    const numbers = Object.keys(this.marks)
      .filter((key) => NEW_ID.test(key))
      .map((key) => Number(key.slice(NEW_PREFIX.length)))
    return `${NEW_PREFIX}${Math.max(0, ...numbers) + 1}`
  }

  /**
   * Item `id`'s IMMEDIATE request:  queue `{ id, action, at, note?, pick?, choices? }` on `now` and set its mark.
   * - `details`:  the mark is `details`;  `revisit`:  `revisit` with `when: "now"` and the note
   * - a revisit keeps the item's pick (a `pick` mark's, or a revisit's, with its card set):
   *   "pick B, but ..." asked now
   * - a request already queued for the same item is replaced, not doubled:  two clicks are one request
   * - returns the queued entry
   */
  requestNow(id: unknown, action: unknown, note = "", at = isoTime()): NowRequest {
    const key = ReviewInbox.toItemId(id)
    if (!isNowAction(action)) throw new InboxError(`not an immediate action:  ${action} (${NOW_ACTIONS})`)
    const pick = ReviewInbox.pickOf(this.marks[key])
    const mark = action === "revisit" ? { action, when: "now", note, ...pick } : { action }
    const checked = this.setMark(key, mark, at)
    const entry: NowRequest = {
      id: key,
      action,
      at,
      ...(checked?.note ? { note: checked.note } : {}),
      ...ReviewInbox.pickOf(checked)
    }
    this.now = this.now.filter((each) => each.id !== key)
    this.now.push(entry)
    // asked again:  an earlier "nevermind" is over
    delete this.canceled[key]
    return entry
  }

  /**
   * "Nevermind" (epic `windows-and-review` P2):  Owen calls off item `id`'s immediate request
   * (Add Details, revisit now), queued or already being worked on.
   * - its `now` entry, its `working` and its immediate mark go;  a mark waiting for a send isn't one, and stays
   * - recorded in `canceled` (`{ action, at, told }`), until `inbox done | clear` or a new request for the item:
   *   - a waiting session is woken to stop the item's agent (`takeWork()`, `told`)
   *   - `plan-doc details` refuses that agent's late write (`isCanceled()`)
   * - returns the entry recorded, or `null` when nothing was asked or running
   */
  cancelNow(id: unknown, at = isoTime()): InboxCancel | null {
    const key = ReviewInbox.toItemId(id)
    const queued = this.now.find((each) => each.id === key)
    const work = this.working[key]
    const mark = this.marks[key]
    if (!queued && !work && !(mark && ReviewInbox.isImmediate(mark))) return null
    this.now = this.now.filter((each) => each.id !== key)
    delete this.working[key]
    if (mark && ReviewInbox.isImmediate(mark)) delete this.marks[key]
    // a request still queued was never taken:  nobody to tell
    const action = work?.action ?? queued?.action ?? (mark?.action === "revisit" ? "revisit" : "details")
    this.canceled[key] = { action, at, told: !work }
    return this.canceled[key]
  }

  /** Did Owen call off item `id`'s request (`cancelNow()`), and nothing asked since? */
  isCanceled(id: unknown): boolean {
    return ReviewInbox.toItemId(id) in this.canceled
  }

  /** Owen pressed "send to Claude":  every mark so far is sent, and every waiting comment (`unsentComments`). */
  markSent(at = isoTime()): this {
    this.sent = at
    return this
  }

  /**
   * "Review Now" (epic `windows-and-review` P4, Q2):
   * send every mark AND have the listening session work through the batch at once;  returns the ids it asked now.
   * - each revisit waiting for a send, or sent and still being talked over,
   *   becomes an immediate request (`requestNow()`, its note and its pick kept):
   *   a background agent answers it INTO its item (Q3), the page's spinner on it meanwhile
   * - approvals, picks and todos go with the send (`markSent()`), as "send to Claude" sends them
   */
  reviewNow(at = isoTime()): string[] {
    const revisits = this.markList.filter((mark) => mark.action === "revisit" && !ReviewInbox.isImmediate(mark))
    for (const mark of revisits) this.requestNow(mark.id, "revisit", mark.note ?? "", at)
    this.markSent(at)
    return revisits.map((mark) => mark.id)
  }

  /**
   * Marks waiting for Owen's "send to Claude":  `[{ id, ...mark }]`, oldest first.
   * - newer than `sent` (all of them before the first send)
   * - NOT immediate ones (`details`, `revisit` `now`):  `requestNow()` already handed them over
   */
  get unsentMarks(): ListedMark[] {
    const sent = this.sent ? Date.parse(this.sent) : -Infinity
    return this.markList.filter((mark) => !ReviewInbox.isImmediate(mark) && Date.parse(mark.at) > sent)
  }

  /**
   * Marks a "send to Claude" handed over:  `[{ id, ...mark }]`, oldest first.
   * - made at or before `sent`;  none before the first send
   * - NOT immediate ones:  those went through `now` (`takeWork()`)
   * - still here until Claude applies or clears them:  a revisit being talked over stays sent
   */
  get sentMarks(): ListedMark[] {
    if (!this.sent) return []
    const sent = Date.parse(this.sent)
    return this.markList.filter((mark) => !ReviewInbox.isImmediate(mark) && Date.parse(mark.at) <= sent)
  }

  /**
   * Comments waiting for Owen's "send to Claude":  Claude's turn on the thread, not taken
   * (`CommentList.waiting`), and Owen's last words newer than `sent` (all of them before the first send).
   * - a new comment, or his reply on a thread, waits for the send as a mark does
   */
  get unsentComments(): IdentifiedComment[] {
    return this.commentList.unsentSince(this.sent)
  }

  /**
   * Comments a "send to Claude" handed over and Claude hasn't taken up yet:
   * waiting (`CommentList.waiting`), with Owen's last words at or before `sent`;  none before the first send.
   */
  get sentComments(): IdentifiedComment[] {
    return this.commentList.sentBy(this.sent)
  }

  /** Every mark as `[{ id, ...mark }]`, oldest first. */
  get markList(): ListedMark[] {
    return Object.entries(this.marks)
      .map(([id, mark]) => ({ id, ...mark }))
      .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  }

  /**
   * Remove the marks of items `ids` (Claude applied them);  returns the ids that had one.
   * - their `now` requests go too
   */
  clearMarks(ids: string[]): string[] {
    const keys = ids.map(ReviewInbox.toItemId)
    const had = keys.filter((key) => key in this.marks)
    for (const key of keys) {
      delete this.marks[key]
      // the session is through with the item:  a "nevermind" on it has done its job
      delete this.canceled[key]
    }
    this.now = this.now.filter((each) => !keys.includes(each.id))
    return had
  }

  /**
   * Claude's agent finished items `ids` (`epic inbox done`):  their IMMEDIATE marks go (`clearMarks()`).
   * - returns `{ had, kept }`:  the ids whose mark went, and those whose mark stayed
   * - a mark Owen changed meanwhile to one waiting for a send stays, for the next send:
   *   e.g. he asked "revisit now", then chose card B while the agent worked
   *   (now a revisit `soon` with the note and the `pick`)
   */
  finishMarks(ids: string[]): { had: string[]; kept: string[] } {
    const keys = ids.map(ReviewInbox.toItemId)
    const kept = keys.filter((key) => key in this.marks && !ReviewInbox.isImmediate(this.marks[key]))
    const had = this.clearMarks(keys.filter((key) => !kept.includes(key)))
    return { had, kept }
  }

  ////////////////
  // ## Claude's side (P6)
  ////////////////

  /** Take every queued immediate request:  returns them, oldest first, and empties `now`. */
  takeNow(): NowRequest[] {
    const taken = this.now
    this.now = []
    return taken
  }

  /**
   * Claude's agent started (`action`) or finished (`null`) work on item `id`:  the page's spinner follows.
   * - returns the entry set, or `null`
   */
  setWorking(id: unknown, action: NowAction | null, at = isoTime()): WorkingEntry | null {
    const key = ReviewInbox.toItemId(id)
    if (action === null) {
      delete this.working[key]
      return null
    }
    this.working[key] = { action, since: at }
    return this.working[key]
  }

  /**
   * Claude session `session` started (or, `null`, stopped) waiting on this inbox.
   * - `seen`:  its first heartbeat (`touchListening()`)
   * - `pid`:  the session's MONITOR's process (`InboxMonitor`, its poller):  live while it runs, with no heartbeat
   * - the page says "No Claude session is reviewing this doc" while it's `null`, or stale
   *   (`liveListener()`;  decision D6)
   */
  setListening(session: string | null, at = isoTime(), pid?: number): InboxListener | null {
    this.listening = session === null ? null : { session, since: at, seen: at, ...(pid ? { pid } : {}) }
    // nobody listening:  nobody doing anything either (P35)
    if (session === null) this.doing = null
    // a session took over:  the wake did its job, and the next Send with nobody listening may wake again
    if (session !== null) this.woken = null
    // the session itself waits on the inbox (not its poller):  the review it was asked for has started
    if (session !== null && !pid) this.reviewAsked = null
    return this.listening
  }

  /**
   * Owen asked for a review from the page ("start review") while the session's poller runs (epic `epic-engine` I144):
   * its next look prints the `📬` line asking for `/epic review`, which wakes the session.
   * - stays until the session waits on the inbox itself (`setListening()`)
   */
  askReview(at = isoTime()): string {
    this.reviewAsked = at
    return at
  }

  /**
   * What the session is doing now (`text`:  "Responding", "Building P35"), and what it's answering (`items`);
   * `null`:  nothing (epic `epic-engine` P35).  Stamps the session's heartbeat.
   */
  setDoing(doing: { text: string; items?: DoingItem[] } | null, at = isoTime()): InboxDoing | null {
    const text = doing?.text.trim()
    this.doing = text ? { text, ...(doing!.items?.length && { items: doing!.items }), at } : null
    this.touchListening(at)
    return this.doing
  }

  /**
   * The listening session's heartbeat:  `listening.seen` is `at`.
   * Nobody listening:  nothing (a heartbeat never starts one:  that's `watch`'s).
   * - `epic inbox wait` calls it every `LISTEN_HEARTBEAT_MS`;  the session's other inbox commands, each time
   */
  touchListening(at = isoTime()): InboxListener | null {
    if (this.listening) this.listening.seen = at
    return this.listening
  }

  /**
   * The session listening:  `null` when nobody is, or its heartbeat stopped
   * (`seen`, an old file's `since`, older than `LISTEN_STALE_MS` at `now`, in ms).
   * - why:  a session killed without `ignore` leaves `listening` set;  the page must not claim it's there
   * - a monitor's (`pid` set):  live exactly while the monitor's process runs (`SRV.isProcessAlive()`)
   */
  liveListener(now = Date.now()): InboxListener | null {
    const listening = this.listening
    if (!listening) return null
    if (listening.pid) return SRV.isProcessAlive(listening.pid) ? listening : null
    const seen = Date.parse(listening.seen ?? listening.since)
    return now - seen > LISTEN_STALE_MS ? null : listening
  }

  /**
   * The inbox as the page reads it (every route's answer):
   * the whole inbox, but `listening` `null` once stale (`liveListener()`), so the page keeps no clock rule of its own.
   * - plus `unsentComments`, the ids of the comments Send would hand over (`unsentComments`):
   *   the threads' rules stay here, in `CommentList`
   * - a plain copy:  this inbox is untouched
   */
  forPage(now = Date.now()): PageInbox {
    const listening = this.liveListener(now)
    const woken = listening ? null : this.liveWoken(now)
    return {
      ...this.toRecord(),
      listening,
      // a session gone (or none) is doing nothing:  its last line never lingers (P35)
      doing: listening ? this.doing : null,
      // a wake under way has nothing to say yet
      woken: woken?.state === "waking" ? null : woken,
      unsentComments: this.unsentComments.map((comment) => comment.id),
      waitingComments: this.commentList.ownWaiting.map(({ id, anchor }) => ({ id, anchor }))
    }
  }

  /**
   * The comments a revisit's `comments` names (Owen's comments in its part's text, epic `epic-engine` I140), as the
   * inbox holds them now;  one gone since (cleared) is left out.
   */
  commentsOf(mark: { comments?: string[] }): IdentifiedComment[] {
    const all = new Map(this.commentList.all.map((comment) => [comment.id, comment]))
    return (mark.comments ?? []).flatMap((id) => all.get(id) ?? [])
  }

  /**
   * Owen saved a NEW comment, `commentId`, or put one back (Undo):  when it lies in the text of a part that takes a
   * mark, that part's Revisit is pressed for it (epic `epic-engine` I158;  Owen, 2026-10-29:  "When I add a comment
   * to a phase, it should show as `revisit` automatically").  Returns the part's id, else `null`.
   * - `parts`:  what takes a mark on the epic page (`itemIds()`);  the comment's part is its anchor's (`partOf()`):
   *   an item, a phase, an Overview part.  The page header, the Overview as a whole, a section:  nothing.
   * - no mark yet:  the revisit Revisit makes on a part with comments in its text (`ReviewClient.press()`, I140),
   *   `{ action: "revisit", when: "soon", note: "see my comments in its text:  C4", comments: ["c4"] }`
   * - a revisit waiting or being talked over:  the comment joins its `comments`, and its note names it
   * - a pick:  that revisit, carrying the pick ("pick B, but ...")
   * - any other mark (Approve, Make Todo, a revisit asked now ...):  left as it is
   * - only while the comment waits for Claude (`CommentList.waiting`)
   * - SIDE EFFECT:  the mark is stamped `at`, so it waits for the next Send
   */
  noteComment(commentId: string, parts: ReadonlySet<string>, at = isoTime()): string | null {
    const comment = this.commentList.ownWaiting.find((each) => each.id === commentId)
    const part = comment && partOf(comment.anchor)
    if (!part || !parts.has(part) || !isMarkKey(part)) return null
    const mark = this.marks[part]
    if (mark && mark.action !== "pick" && !(mark.action === "revisit" && !ReviewInbox.isImmediate(mark))) return null
    const comments = [...new Set([...(mark?.comments ?? []), commentId])]
    const note = withInlineComments(mark?.note ?? "", comments)
    this.setMark(part, { action: "revisit", when: "soon", note, comments, ...ReviewInbox.pickOf(mark) }, at)
    return part
  }

  /**
   * Comment `commentId` is gone (deleted, cleared):  every revisit naming it lets it go (epic `epic-engine` I158);
   * returns the ids of the marks changed.
   * - its note names the rest, else only Owen's own words
   * - nothing left in it (no comment, no words):  a pick goes back to the plain pick, else the mark goes
   * - SIDE EFFECT:  a mark kept is stamped `at`
   */
  dropComment(commentId: string, at = isoTime()): string[] {
    const changed: string[] = []
    for (const [id, mark] of Object.entries(this.marks)) {
      if (mark.action !== "revisit" || !mark.comments?.includes(commentId)) continue
      const comments = mark.comments.filter((each) => each !== commentId)
      const note = withInlineComments(mark.note ?? "", comments)
      const pick = ReviewInbox.pickOf(mark)
      if (comments.length || note) {
        const left = { action: "revisit", when: mark.when, note, ...(comments.length && { comments }), ...pick }
        this.setMark(id, left, at)
      } else this.setMark(id, pick.pick ? { action: "pick", ...pick } : null, at)
      changed.push(id)
    }
    return changed
  }

  /**
   * The inbox as a plain record:  its own fields, the file's keys in the file's order (a hand-added one too).
   * - a shallow copy:  what `JSON.stringify()` writes of this inbox
   */
  toRecord(): InboxRecord {
    return Object.assign({}, this)
  }

  /**
   * Is there work for a waiting session (`epic inbox wait`)?
   * A queued immediate request, or a send it hasn't taken yet (`hasNewSend`).
   * - cheap, and read without the lock:  `takeWork()` checks again under it
   */
  get hasWork(): boolean {
    return this.now.length > 0 || this.hasNewSend || Object.values(this.canceled).some((each) => !each.told)
  }

  /** Has Owen pressed "send to Claude" since a waiting session last took a send (`handedOver`)? */
  get hasNewSend(): boolean {
    if (!this.sent) return false
    return !this.handedOver || Date.parse(this.sent) > Date.parse(this.handedOver)
  }

  /**
   * TAKE the work waiting for a session:  `{ now, sent, canceled }`, or `null` when there's none.
   * - `now`:  the queued immediate requests (`takeNow()`)
   *   - each item marked `working` (the page's spinner) until Claude's agent is done (`epic inbox done`)
   *   - their marks stay till then
   * - `sent`:  `{ at, marks, urgency, comments }` for a send not handed over yet (`hasNewSend`), else `null`
   *   - every sent mark (`sentMarks`), each `again: true` when an earlier send already handed it over
   *     (a revisit still being talked over)
   *   - and the sent urgency (`sentUrgency`)
   *   - and the comments this send handed over (`sentComments`):  only those Owen spoke on since the last send
   *     a session took, so a comment goes over once, until he replies again
   *   - `handedOver` becomes `sent`, so a send is taken once
   *   - a send with nothing left (all applied) is taken quietly:  nothing to wake for
   * - `canceled`:  "nevermind"s for work a session took:  stop those agents (`cancelNow()`)
   * - call it under the lock (`update()`)
   */
  takeWork(at = isoTime()): TakenWork | null {
    const now = this.takeNow()
    for (const each of now) this.setWorking(each.id, each.action, at)
    let sent: TakenWork["sent"] = null
    if (this.hasNewSend) {
      const before = this.handedOver ? Date.parse(this.handedOver) : -Infinity
      const marks = this.sentMarks.map((mark) => ({
        ...mark,
        again: Date.parse(mark.at) <= before,
        ...(mark.comments?.length && { inlineComments: this.commentsOf(mark) })
      }))
      const urgency = this.sentUrgency
      // a comment a sent revisit carries goes over inside it, never on its own too (I158)
      const carried = new Set(marks.flatMap((mark) => mark.comments ?? []))
      const comments = this.sentComments.filter(
        (comment) => !carried.has(comment.id) && Date.parse(ThreadFacts.lastWordsAt(comment)) > before
      )
      this.handedOver = this.sent
      if (marks.length || urgency.length || comments.length) sent = { at: this.sent!, marks, urgency, comments }
    }
    const canceled = Object.entries(this.canceled)
      .filter(([, each]) => !each.told)
      .map(([id, { action, at: when }]) => ({ id, action, at: when }))
    for (const { id } of canceled) this.canceled[id].told = true
    return now.length || sent || canceled.length ? { now, sent, canceled } : null
  }

  /**
   * Remove the marks Claude applied, `[{ id, at }]`, but only while each is still the one applied;
   * returns the ids cleared.
   * - a mark Owen changed meanwhile (a newer `at`) stays, for the next round
   */
  clearApplied(marks: { id: string; at: string }[]): string[] {
    const cleared: string[] = []
    for (const { id, at } of marks) {
      const key = ReviewInbox.toItemId(id)
      if (this.marks[key]?.at !== at) continue
      delete this.marks[key]
      cleared.push(key)
    }
    return cleared
  }

  ////////////////
  // ## Waking the epic (epic `epic-workflow` P16)
  ////////////////

  /**
   * Is there anything a Send would hand over that it hasn't yet?
   * A mark or urgency newer than `sent`, or a comment Owen spoke on since (`unsentMarks` ...).
   * - read BEFORE the send:  a Send with nothing new wakes nobody (J47)
   */
  get hasUnsent(): boolean {
    return this.unsentMarks.length > 0 || this.unsentUrgency.length > 0 || this.unsentComments.length > 0
  }

  /**
   * The last wake, while it still counts:  `woken`, until `WAKE_COOLDOWN_MS` after its `at`;  else `null`.
   * - a claim whose wake never finished (the server stopped) runs out the same way
   */
  liveWoken(now = Date.now()): InboxWoken | null {
    const woken = this.woken
    if (!woken) return null
    return now - Date.parse(woken.at) >= WAKE_COOLDOWN_MS ? null : woken
  }

  /**
   * A Send or Do Now just landed (`fresh`:  it handed over something new):  should the page server wake the epic?
   * Call it under the lock, in the same change as the request, so two at once claim one wake.
   * - `listening`:  a session is listening (`liveListener()`):  it takes the work as always, nothing to wake
   * - `airplane`:  airplane mode is on (`airplane`):  everything waits for `/airplane land`
   * - `nothing-new`:  the request handed over nothing new (only drafts, or marks sent already)
   * - `already`:  woken inside `WAKE_COOLDOWN_MS`, nobody listening since:  `woken` says how
   * - `due`:  wake it.  SIDE EFFECT:  `woken` is claimed, `{ at, state: "waking" }`;
   *   `recordWake()` with the same `at` says what came of it
   */
  claimWake({ fresh, airplane = false }: { fresh: boolean; airplane?: boolean }, now = new Date()): WakeClaim {
    if (this.liveListener(now.getTime())) return { state: "listening" }
    if (airplane) return { state: "airplane" }
    if (!fresh) return { state: "nothing-new" }
    const woken = this.liveWoken(now.getTime())
    if (woken) return { state: "already", woken }
    const at = isoTime(now)
    this.woken = { at, state: "waking", did: "", message: "" }
    return { state: "due", at }
  }

  /**
   * What wake `at` (`claimWake()`'s) did:  `done` when it typed or opened something, kept for the cooldown;
   * `null` when it did nothing (no window, several sessions ...):  the claim goes, so the next Send tries again.
   * - a claim no longer there (a session listened meanwhile) stays gone
   */
  recordWake(at: string, done: Omit<InboxWoken, "at"> | null): InboxWoken | null {
    if (this.woken?.at !== at) return null
    this.woken = done && { at, ...done }
    return this.woken
  }

  /**
   * Every entry keyed by an id in `renames` moves to its new id (`stable-phase-ids`, epic `epic-workflow` P15:
   * `p7` => `p-epic-migrate`);  returns how many entries moved.
   * - marks, drafts, urgency, agents at work, called-off requests:  their key;  an immediate request:  its `id`
   * - a new item about one (`near`), and a comment's anchor on one:  `p7`, `p7#field-1`
   * - an entry already under the new id wins:  the old one goes
   * - ALL AT ONCE:  a rename may free an id another takes (epic `epic-engine` P44:  `c3` => `t3`, `t3` => `m3`)
   */
  renameIds(renames: Record<string, string>): number {
    let moved = 0
    const rename = (entries: Record<string, unknown>) => {
      const taken = Object.entries(renames)
        .filter(([from]) => from in entries)
        .map(([from, to]) => [to, entries[from]] as const)
      for (const from of Object.keys(renames)) delete entries[from]
      for (const [to, value] of taken) {
        if (!(to in entries)) entries[to] = value
        moved++
      }
    }
    const keyed: Record<string, unknown>[] = [this.marks, this.drafts, this.urgency, this.working, this.canceled]
    for (const entries of keyed) rename(entries)
    for (const request of this.now) {
      if (!(request.id in renames)) continue
      request.id = renames[request.id]!
      moved++
    }
    for (const mark of Object.values(this.marks)) {
      if (!mark.near || !(mark.near in renames)) continue
      mark.near = renames[mark.near]!
      moved++
    }
    for (const comment of Object.values(this.comments)) {
      const [container, place] = comment.anchor.split("#")
      if (!(container! in renames)) continue
      comment.anchor = place === undefined ? renames[container!]! : `${renames[container!]}#${place}`
      moved++
    }
    return moved
  }

  /**
   * Comments renumbered by `renames` (`c3` => `c5`:  two people both made `c3`, and the content repo's sync gives this
   * machine's the next free number;  `Renumber.comments()`, epic `epic-friend` P9):  each under its new id, every
   * revisit naming one following, its note's last line too;  how many comments moved.
   */
  renameComments(renames: Record<string, string>): number {
    const moved = CommentList.renumber(this.comments, renames)
    for (const [id, mark] of Object.entries(this.marks)) {
      if (!mark.comments?.some((each) => Object.hasOwn(renames, each))) continue
      const comments = mark.comments.map((each) => renames[each] ?? each)
      this.marks[id] = { ...mark, comments, note: withInlineComments(mark.note ?? "", comments) }
    }
    return moved
  }

  ////////////////
  // ## Checks
  ////////////////

  /**
   * `mark` from a request, checked:  only its own fields, in a fixed order.
   * - `action`:  one of `ACTIONS`
   * - `revisit`:  `when` `soon` (default) or `now`;  `note` trimmed, `""` when none
   *   - `pick` too, when given (a letter):  "pick B, but ...", a pick with a remark, talked over rather than applied
   * - `pick`:  `pick` an option card's letter, `A`-`Z`
   * - with a pick:  `choices` too, when given:
   *   which of the item's option card sets it's from, by position (`0`, `1` ...:  I8);  none, the item's own
   * - `todo`, `next`, `drop`, `skip`:  `note` trimmed, kept only when there is one
   * - `accept` (the page header's stage button, epic `epic-engine` P29):  `stage`, the stage it ends, one of
   *   `ACCEPT_STAGES`;  none:  a change mark's Accept (P30), `{ action: "accept" }`
   * - `reopen` (a change mark's Reopen, P30):  the action alone
   * - `test` (a test run's answer, epic `epic-engine` P4):  `result` one of `TEST_RESULTS`;
   *   `note` trimmed, kept only when there is one;  `shot` kept when given, a screenshot in the epic's `tests/`
   *   (`tests/m3-20261019-1432.png`:  `TEST_SHOT`)
   * - `new` (a new item, `setNew()`):
   *   - `kind`:  one of `NEW_KINDS`
   *   - `title`:  trimmed, never empty, at most `MAX_TITLE` characters
   *   - `note`:  trimmed, kept only when there is one
   *   - `near`:  an id (`toItemId()`, lower-case), kept only when given;
   *     whether the doc HAS that id is the route's to check (it reads the doc)
   * - throws an `InboxError` for anything else;  `at` is never taken from it (the writer stamps it)
   * - STATIC, as every check here:  pure, on a request before any inbox is read
   */
  static toMark(mark: unknown): CheckedMark {
    if (!mark || typeof mark !== "object" || Array.isArray(mark)) throw new InboxError("a mark is an object, or null")
    const { action, when = "soon", note = "", pick, choices } = mark as Record<string, unknown>
    if (action === "new") return toNewItem(mark as Record<string, unknown>)
    if (action === "test") return toTestAnswer(mark as Record<string, unknown>)
    if (!isAction(action)) throw new InboxError(`no such action:  ${action} (${ACTIONS.join(" | ")})`)
    if (action === "revisit") {
      if (!REVISIT_WHEN.includes(when as RevisitWhen))
        throw new InboxError(`revisit when?  ${REVISIT_WHEN.join(" | ")}`)
      if (typeof note !== "string") throw new InboxError("a revisit's note is text")
      const inline = toCommentIds((mark as Record<string, unknown>).comments)
      if (pick === undefined || pick === null)
        return { action, when: when as RevisitWhen, note: note.trim(), ...inline }
      return {
        action,
        when: when as RevisitWhen,
        note: note.trim(),
        pick: toLetter(pick),
        ...toChoices(choices),
        ...inline
      }
    }
    if (action === "pick") return { action, pick: toLetter(pick), ...toChoices(choices) }
    if (action === "accept") {
      const { stage } = mark as Record<string, unknown>
      // a change mark's Accept (epic `epic-engine` P30):  no stage
      if (stage === undefined || stage === null) return { action }
      if (!(ACCEPT_STAGES as readonly unknown[]).includes(stage))
        throw new InboxError(`accept which stage?  ${ACCEPT_STAGES.join(" | ")}`)
      return { action, stage: stage as PageStage }
    }
    // a phase dragged to another place (epic `epic-engine` P34):  its new number
    if (action === "move") {
      const { to } = mark as Record<string, unknown>
      if (!Number.isInteger(to) || (to as number) < 1)
        throw new InboxError(`move where?  a phase's place, 1 or more:  ${to}`)
      return { action, to: to as number }
    }
    // Make Todo's note (epic `windows-and-review` P2:  its note box's button, until 2026-10-09):  why follow it up;
    // a todo's plane and x, and every note box's x (skip this), take the note box's words too (Owen, 2026-10-09)
    if (action === "todo" || action === "next" || action === "drop" || action === "skip") {
      if (typeof note !== "string") throw new InboxError(`a ${action} mark's note is text`)
      return note.trim() ? { action, note: note.trim() } : { action }
    }
    return { action }
  }

  /**
   * `id` as the inbox keys it:  lower-case, as the item's element id;  an `InboxError` when it isn't an item id.
   * - also the summary's key, `summary`, and a new item's, `new1` (epic `airplane` P2);  the stage button's, `stage`
   *   (`STAGE_ID`, epic `epic-engine` P29)
   */
  static toItemId(this: void, id: unknown): string {
    const key = typeof id === "string" ? id.toLowerCase() : ""
    if (!isMarkKey(key) && key !== SUMMARY_ID && key !== STAGE_ID && !NEW_ID.test(key))
      throw new InboxError(`not an item id:  ${id}`)
    return key
  }

  /** Is `id` a new item's key (`new1`:  `setNew()`), not something the doc has? */
  static isNewId(this: void, id: string): boolean {
    return NEW_ID.test(id.toLowerCase())
  }

  /**
   * `mark`'s pick, to carry into another mark:  `{ pick, choices? }`, or `{}` when it has none.
   * - "pick B, but ...":  a pick that becomes a revisit, or a revisit asked now, keeps WHICH cards it picked from
   */
  static pickOf(mark: PickFields | null | undefined): PickFields {
    if (!mark?.pick) return {}
    return { pick: mark.pick, ...(mark.choices !== undefined && { choices: mark.choices }) }
  }

  /** Is `mark` an immediate request (`requestNow()`), not one waiting for a send? */
  static isImmediate(mark: { action: string; when?: string }): boolean {
    return mark.action === "details" || (mark.action === "revisit" && mark.when === "now")
  }

  /**
   * The ids a review mark may name in epic page `html` (a skeleton:  every item's line is in it):
   * - every `<epic-item id>`, and every Overview sub-section, `<epic-section kind="overview-part" id>`
   *   (Q14:  they take review notes too)
   * - every phase, `<epic-phase id>`, and the summary, `summary` while the doc has an `<epic-summary>`
   *   (epic `airplane` P2:  notes on them too)
   * - the stage button's, `stage`, while `<epic-page stage>` is a stage one ends (`ACCEPT_STAGES`, epic `epic-engine` P29)
   * - every change mark waiting for Accept (`ch3`, epic `epic-engine` P30):  listed in its host's `to-accept` (the
   *   skeleton's:  its body, a part, may not be in `html`), or an `<epic-change id>` not `accepted` in `html` itself
   * - text, not a DOM:  cheap enough to run on every request;  attributes in any order, across lines
   */
  static itemIds(html: string): Set<string> {
    const ids = new Set<string>()
    const tags = /<(epic-item|epic-section|epic-phase|epic-summary|epic-page|epic-change)\b[^>]*>/g
    for (const [tag, name] of html.matchAll(tags)) {
      for (const change of /\sto-accept="([^"]*)"/.exec(tag)?.[1]?.split(/\s+/) ?? []) if (change) ids.add(change)
      if (name === "epic-change") {
        const id = /\sid="([^"]+)"/.exec(tag)?.[1]
        if (id && !/\saccepted[\s=>]/.test(tag)) ids.add(id.toLowerCase())
        continue
      }
      if (name === "epic-page") {
        const stage = /\sstage="([^"]*)"/.exec(tag)?.[1]
        if ((ACCEPT_STAGES as readonly string[]).includes(stage ?? "")) ids.add(STAGE_ID)
        continue
      }
      if (name === "epic-summary") {
        ids.add(SUMMARY_ID)
        continue
      }
      const id = /\sid="([^"]+)"/.exec(tag)?.[1]
      if (!id) continue
      const markable =
        name === "epic-item" || name === "epic-phase" || (name === "epic-section" && /\skind="overview-part"/.test(tag))
      if (markable) ids.add(id.toLowerCase())
    }
    return ids
  }
}

/** A problem with a request or a file, for the caller to show (the route answers 400). */
export class InboxError extends Error {}
InboxError.prototype.name = "InboxError"

////////////////
// ## Types
////////////////

/** An inbox file's JSON:  `ReviewInbox`'s own fields (see its banner for each one's meaning). */
export type InboxRecord = {
  version: number
  marks: Record<string, InboxMark>
  drafts: Record<string, InboxDraft>
  urgency: Record<string, InboxUrgency>
  sent: string | null
  now: NowRequest[]
  working: Record<string, WorkingEntry>
  canceled: Record<string, InboxCancel>
  listening: InboxListener | null
  handedOver: string | null
  comments: Record<string, Comment>
  woken: InboxWoken | null
  doing: InboxDoing | null
  reviewAsked: string | null
}

/** What the listening session is doing now (`ReviewInbox.doing`, epic `epic-engine` P35). */
export type InboxDoing = {
  /** a word or two:  `Responding`, `Building P35` */
  text: string
  /** what it's answering, by id and title */
  items?: DoingItem[]
  /** when it was set, ISO */
  at: string
}

/** One thing the session is answering:  its id (`q6`, a comment's `c3`) and title. */
export type DoingItem = { id: string; title: string }

/**
 * The inbox as the routes answer (`ReviewInbox.forPage()`):
 * the file's JSON, plus `unsentComments`, the ids of the comments the page's Send would hand over.
 */
export type PageInbox = InboxRecord & { unsentComments: string[]; waitingComments: WaitingComment[] }

/**
 * A comment waiting for Claude, as the page reads it (`PageInbox.waitingComments`):  its id and where it is
 * (`p-themes-as-data#field-4`), so Revisit on a part with Owen's comments in its text marks them at once
 * (epic `epic-engine` I140).
 */
export type WaitingComment = { id: string; anchor: string }

/** One item's mark, as stored:  checked (`ReviewInbox.toMark()`) and stamped. */
export type InboxMark = CheckedMark & { at: string }

/**
 * A mark as `ReviewInbox.toMark()` checks it, before it's stamped.
 * - `when`, `note`:  a revisit's (`note` a todo's, a new item's and a test answer's too)
 * - `pick`:  a pick's letter, or a revisit's "pick B, but ..."
 * - `choices`:  with a pick, which of the item's option card sets it's from, by position (I8);  none:  its own
 * - `kind`, `title`, `near`:  a new item's (`action: "new"`, epic `airplane` P2)
 * - `result`, `shot`:  a test answer's (`action: "test"`, epic `epic-engine` P4)
 * - `stage`:  the stage a stage button ends (`action: "accept"`, epic `epic-engine` P29)
 * - `to`:  a dragged phase's new place (`action: "move"`, epic `epic-engine` P34)
 * - `comments`:  a revisit's content, Owen's comments in its part's text (`c1` ...;  epic `epic-engine` I140)
 */
export type CheckedMark = {
  action: MarkAction
  when?: RevisitWhen
  note?: string
  comments?: string[]
  stage?: PageStage
  to?: number
} & PickFields &
  NewItemFields &
  TestFields

/**
 * A test answer's fields (`action: "test"`, epic `epic-engine` P4):
 * - `result`:  `passed`, `failed`, `skip`, `notnow` (`TEST_RESULTS`)
 * - `shot`:  Owen's screenshot, from the epic page's folder:  `tests/m3-20261019-1432.png`
 */
export type TestFields = { result?: TestResult; shot?: string }

/**
 * A new item's fields (`action: "new"`, `ReviewInbox.setNew()`):
 * - `kind`:  `todo` or `question`
 * - `title`
 * - `near`:  the id of what it's about (an item, a phase, an Overview sub-section, `summary`)
 */
export type NewItemFields = { kind?: NewKind; title?: string; near?: string }

/**
 * A pick's fields, on a mark or a `now` request:
 * - `pick`:  the option's letter
 * - `choices`:  which of the item's `<epic-choices>` it's from, by position (`PlanItem.choiceSets()`);
 *   none for the item's own (`choicesOf()`)
 */
export type PickFields = { pick?: string; choices?: number }

/** A mark with its item id:  `markList`, `sentMarks`, `unsentMarks`. */
export type ListedMark = { id: string } & InboxMark

/** A note box's text, as typed. */
export type InboxDraft = { action: NoteAction; note: string; at: string }

/** Owen's urgency for an item:  `calm` true, not urgent;  false, urgent again. */
export type InboxUrgency = { calm: boolean; at: string }

/** An urgency with its item id:  `urgencyList`, `sentUrgency`, `unsentUrgency`. */
export type ListedUrgency = { id: string } & InboxUrgency

/** An immediate request, queued on `now`. */
export type NowRequest = { id: string; action: NowAction; at: string; note?: string } & PickFields

/** An agent at work on an item. */
export type WorkingEntry = { action: NowAction; since: string }

/** A request Owen called off;  `told` once a waiting session heard of it. */
export type InboxCancel = { action: NowAction; at: string; told: boolean }

/**
 * The session waiting on the inbox:  `seen` its last heartbeat (missing in an old file).
 * - `pid`:  the session's monitor's process, when the monitor listens:  live while it runs, with no heartbeat
 *   (`liveListener()`)
 */
export type InboxListener = { session: string; since: string; seen?: string; pid?: number }

/**
 * The page server's wake of the epic (`ReviewInbox.claimWake()`, epic `epic-workflow` P16).
 * - `state`:  `waking` while under way;  then what it did (`WokenState`)
 * - `did`:  what it did, as words to follow "Already ":  `typed /epic review x into 🚧 x`
 * - `message`:  the page's notice and pill:  `Typed /epic review x into 🚧 x:  press Enter there`
 */
export type InboxWoken = { at: string; state: "waking" | WokenState; did: string; message: string }

/**
 * What a wake did that's worth remembering for the cooldown (`ReviewStart.wake()`):
 * - `typed`:  `/epic review <epic>` typed into the epic's running session
 * - `opened`:  a new session opened in an open window (the epic's worktree's, or a main one), the command typed in
 * - `launched`:  the epic's worktree window opened (`epic window launch`), a new session in it, the command typed in
 * - `told`:  the session's inbox poller runs (epic `epic-engine` I144):  it hears the Send and wakes the session,
 *   nothing typed
 */
export type WokenState = "typed" | "opened" | "launched" | "told"

/** `ReviewInbox.claimWake()`'s answer:  wake now (`due`, the claim's `at`), or why not. */
export type WakeClaim =
  | { state: "due"; at: string }
  | { state: "already"; woken: InboxWoken }
  | { state: "listening" | "airplane" | "nothing-new" }

/** What `ReviewInbox.takeWork()` hands a waiting session. */
export type TakenWork = {
  now: NowRequest[]
  sent: {
    at: string
    /** `inlineComments`:  a revisit's comments (its `comments`), as the inbox holds them (I140) */
    marks: (ListedMark & { again: boolean; inlineComments?: IdentifiedComment[] })[]
    urgency: ListedUrgency[]
    comments: IdentifiedComment[]
  } | null
  canceled: { id: string; action: NowAction; at: string }[]
}

////////////////
// ## Constants
////////////////

/** The inbox format this module writes;  a file without one is read as this. */
export const INBOX_VERSION = 1

/**
 * What a mark asks of Claude, in the order `epic inbox` prints them.
 * - `approve`:  accept the item as it stands (a judgement call, an answer)
 * - `todo`:  file it as a todo
 * - `next`:  a todo's plane (Owen, 2026-10-09):  do it in the next phase,
 *   queued into the first phase still to do (`PlanDoc.applyAction()`)
 * - `drop`:  a todo's x:  drop it, canceled
 * - `skip`:  every other note box's x (Owen, 2026-10-09):  skip this, nothing to do;  marked reviewed, a note kept
 * - `details`:  write more details into it (an immediate request:  `requestNow()`)
 * - `revisit`:  talk it through again;  `when` `soon` (with the next batch) or `now` (immediate), `note` Owen's text
 * - `pick`:  an option card, by letter (`pick: "B"`), on any item (I8):  `choices` says which card set
 * - `new`:  a new todo or question Owen asks for from the page (`setNew()`, epic `airplane` P2), under its own key
 * - `test`:  a test's answer from the page's test run (epic `epic-engine` P4):  `result`, maybe `note` and `shot`
 * - `accept`:  the page header's stage button (epic `epic-engine` P29):  the stage it ends (`stage`), under `STAGE_ID`
 * - `defer`:  a phase's Defer while the phases are agreed (P29):  after the others, still to do
 * - `accept` with no `stage`, and `reopen`:  a change mark's buttons (`<epic-change>`, P30), under its id
 */
export const ACTIONS = [
  "approve",
  "todo",
  "next",
  "drop",
  "skip",
  "details",
  "revisit",
  "pick",
  "new",
  "test",
  "accept",
  "defer",
  "move",
  "reopen"
] as const
/** One of `ACTIONS`. */
export type MarkAction = (typeof ACTIONS)[number]

/** What a new item from the page may be (`setNew()`):  `plan-doc add`'s kinds Owen asks for. */
export const NEW_KINDS = ["todo", "question", "issue", "test", "phase"] as const
/** One of `NEW_KINDS`. */
export type NewKind = (typeof NEW_KINDS)[number]

/**
 * A test's answers from the page's test run (epic `epic-engine` P4), as `PlanDoc.applyMark()` applies them:
 * - `passed`:  the test closed, done
 * - `failed`:  a new issue with Owen's note and screenshot;  the test stays open, marked failed
 * - `skip`:  it no longer applies:  canceled
 * - `notnow`:  he can't do it yet:  deferred, so the next run puts it last
 */
export const TEST_RESULTS = ["passed", "failed", "skip", "notnow"] as const
/** One of `TEST_RESULTS`. */
export type TestResult = (typeof TEST_RESULTS)[number]

/** The summary's key in the inbox:  `<epic-summary>` has no id of its own (epic `airplane` P2). */
export const SUMMARY_ID = "summary"

/**
 * The stage button's key in the inbox (epic `epic-engine` P29):  Accept Overview / Accept Phases is the PAGE's mark,
 * not an item's;  markable while the page is in a stage that ends with it (`itemIds()`).
 */
export const STAGE_ID = "stage"

/**
 * A change mark's id, its key in the inbox (`<epic-change id="ch3">`, epic `epic-engine` P30):  `ch` and a number,
 * given by the epic tool (`PlanDoc.updateChanges()`).
 */
export const CHANGE_ID = /^ch\d+$/

/** The stages a stage button ends:  every stage but `building`. */
export const ACCEPT_STAGES = PageStages.ALL.filter(PageStages.isPlanning)

/** Actions an immediate request (`now`) may carry. */
export const NOW_ACTIONS = ["details", "revisit"] as const
/** One of `NOW_ACTIONS`. */
export type NowAction = (typeof NOW_ACTIONS)[number]

/** Actions whose mark carries a note Owen types:  their note box's text is kept as a draft until it's marked. */
export const NOTE_ACTIONS = ["revisit", "todo"] as const
/** One of `NOTE_ACTIONS`. */
export type NoteAction = (typeof NOTE_ACTIONS)[number]

/** A `revisit` mark's `when`. */
export const REVISIT_WHEN = ["soon", "now"] as const
/** One of `REVISIT_WHEN`. */
export type RevisitWhen = (typeof REVISIT_WHEN)[number]

/** How often a waiting session (`epic inbox wait`) stamps `listening.seen`:  one locked write. */
export const LISTEN_HEARTBEAT_MS = 30_000

/**
 * A `listening` whose heartbeat (`seen`) is older than this is a session that died without `ignore`
 * (closed tab, crash):  three missed heartbeats.
 */
export const LISTEN_STALE_MS = 90_000

/**
 * How long one wake of an epic stands (`claimWake()`), unless a session listens first:  10 minutes (J46).
 * Long enough to find the window and press Enter;  short enough that a forgotten tab doesn't block the next Send long.
 */
export const WAKE_COOLDOWN_MS = 10 * 60_000

/** An option card's letter. */
const OPTION_LETTER = /^[A-Z]$/

/** The highest card set position a pick may name:  a sanity bound, far above any item's count. */
const MAX_CHOICES = 99

/** A new item's key (`setNew()`):  `new1`, `new2` ... */
const NEW_PREFIX = "new"
const NEW_ID = /^new\d+$/

/** A manual test's id:  only a test takes a test answer. */
const TEST_ID = /^m\d+$/

/**
 * A test answer's screenshot, from the epic page's folder:  `tests/m3-20261019-1432.png` (`-2` ... when two land in one
 * minute), as the review routes' `POST shot` writes it.
 * - a test's older letters too, `t3-` (before epic `epic-engine` P44) and `v3-` (before P32):  the files keep their names
 */
export const TEST_SHOT = /^tests\/[mtv]\d+-\d{8}-\d{4}(?:-\d+)?\.png$/

/** The longest a test answer's note may be:  a few paragraphs, not a log. */
const MAX_TEST_NOTE = 20_000

/** The longest title a new item may have:  a line, not a page. */
const MAX_TITLE = 300

/**
 * The items Owen may call urgent or not (`setUrgency()`):
 * judgement calls and issues, the kinds red while open and not reviewed.
 * - `PlanReader.itemState()`, the same rule:  `CALM_ID` in `planDoc.types.ts`
 */
const CALM_ID = /^[ij]\d+$/

////////////////
// ## Helpers
////////////////

/**
 * A change mark (`CHANGE_ID`) takes only its two buttons' marks, and they go on nothing else (epic `epic-engine` P30):
 * an `InboxError` otherwise.
 * - `accept` with a `stage` is the stage button's, under `STAGE_ID`;  without one there, it asks which stage
 */
function checkChangeMark(key: string, mark: CheckedMark) {
  const forChange = mark.action === "reopen" || (mark.action === "accept" && mark.stage === undefined)
  if (CHANGE_ID.test(key) && !forChange)
    throw new InboxError(`a change takes Accept or Reopen, not ${mark.action}:  ${key}`)
  if (CHANGE_ID.test(key) || !forChange) return
  if (key === STAGE_ID) throw new InboxError(`accept which stage?  ${ACCEPT_STAGES.join(" | ")}`)
  const what = mark.action === "accept" ? "Accept with no stage" : "Reopen"
  throw new InboxError(`only a change (ch3 ...) takes ${what}:  ${key}`)
}

/** Is `action` one of `ACTIONS`? */
function isAction(action: unknown): action is MarkAction {
  return ACTIONS.includes(action as MarkAction)
}

/** Is `action` one of `NOW_ACTIONS`? */
function isNowAction(action: unknown): action is NowAction {
  return NOW_ACTIONS.includes(action as NowAction)
}

/** Is `action` one of `NOTE_ACTIONS`? */
function isNoteAction(action: unknown): action is NoteAction {
  return NOTE_ACTIONS.includes(action as NoteAction)
}

/** `pick` as an option card's letter (`A`-`Z`);  an `InboxError` when it isn't one. */
function toLetter(pick: unknown): string {
  if (typeof pick !== "string" || !OPTION_LETTER.test(pick)) throw new InboxError(`pick which option?  ${pick}`)
  return pick
}

/**
 * A new item's mark (`action: "new"`) from a request, checked (`ReviewInbox.toMark()`):
 * `{ action, kind, title, note?, near? }`, in that order.
 * - an `InboxError` for a bad kind, a missing or long title, a note that isn't text, or a `near` that isn't an id
 */
function toNewItem({ kind, title, note = "", near }: Record<string, unknown>): CheckedMark {
  if (!NEW_KINDS.includes(kind as NewKind)) throw new InboxError(`a new what?  ${kind} (${NEW_KINDS.join(" | ")})`)
  if (typeof title !== "string" || !title.trim()) throw new InboxError("a new item needs a title")
  if (title.trim().length > MAX_TITLE) throw new InboxError(`a title is a line:  ${MAX_TITLE} characters at most`)
  if (typeof note !== "string") throw new InboxError("a new item's note is text")
  const about = near === undefined || near === null || near === "" ? undefined : ReviewInbox.toItemId(near)
  if (about && NEW_ID.test(about)) throw new InboxError(`a new item can't be about another one:  ${near}`)
  return {
    action: "new",
    kind: kind as NewKind,
    title: title.trim(),
    ...(note.trim() ? { note: note.trim() } : {}),
    ...(about ? { near: about } : {})
  }
}

/**
 * A test's answer (`action: "test"`) from a request, checked (`ReviewInbox.toMark()`):
 * `{ action, result, note?, shot? }`, in that order.
 * - an `InboxError` for a bad result, a note that isn't text (or is too long), a shot that isn't one of the epic's
 *   `tests/` screenshots (`TEST_SHOT`)
 */
function toTestAnswer({ result, note = "", shot }: Record<string, unknown>): CheckedMark {
  if (!TEST_RESULTS.includes(result as TestResult))
    throw new InboxError(`a test's answer?  ${result} (${TEST_RESULTS.join(" | ")})`)
  if (typeof note !== "string") throw new InboxError("a test answer's note is text")
  if (note.length > MAX_TEST_NOTE) throw new InboxError(`a test answer's note:  ${MAX_TEST_NOTE} characters at most`)
  const given = shot !== undefined && shot !== null && shot !== ""
  if (given && (typeof shot !== "string" || !TEST_SHOT.test(shot)))
    throw new InboxError(`not a test's screenshot:  ${JSON.stringify(shot)} (tests/m3-20261019-1432.png)`)
  return {
    action: "test",
    result: result as TestResult,
    ...(note.trim() ? { note: note.trim() } : {}),
    ...(given ? { shot: shot as string } : {})
  }
}

/**
 * `choices`, a pick's card set by position, as a mark's field:  `{ choices }`, or `{}` when not given.
 * - an `InboxError` when it isn't a whole number from 0 to `MAX_CHOICES`
 */
function toChoices(choices: unknown): { choices?: number } {
  if (choices === undefined || choices === null) return {}
  if (!Number.isInteger(choices) || (choices as number) < 0 || (choices as number) > MAX_CHOICES)
    throw new InboxError(`pick from which option cards?  ${JSON.stringify(choices)}`)
  return { choices: choices as number }
}

/**
 * A revisit's `comments` (epic `epic-engine` I140), checked:  `{ comments: ["c1", "c3"] }`, each as the file keys it
 * (`CommentList.idOf()`), or `{}` for none.
 * - throws an `InboxError` unless it's a list of comment ids
 */
function toCommentIds(comments: unknown): { comments?: string[] } {
  if (comments === undefined || comments === null) return {}
  if (!Array.isArray(comments) || !comments.every((id) => CommentList.isCommentId(id)))
    throw new InboxError(`a revisit's comments are comment ids (C3):  ${JSON.stringify(comments)}`)
  const ids = [...new Set(comments.map((id: string) => CommentList.idOf(id)))]
  return ids.length ? { comments: ids } : {}
}

/**
 * `date` as ISO local time with its offset, to the MILLISECOND:  `2026-10-04T15:02:11.042-04:00`.
 * - the kit's `localTime()`, plus milliseconds
 * - why milliseconds:  `unsentMarks` compares a mark's `at` with `sent`;
 *   to the second, a mark made in the same second as a send would pass for sent
 */
export function isoTime(date = new Date()): string {
  const milliseconds = String(date.getMilliseconds()).padStart(3, "0")
  return localTime(date).replace(/(?=[+-]\d\d:\d\d$)/, `.${milliseconds}`)
}

/**
 * Whether a mark may be keyed by `key`:  an item's id, a letter or two and a number (`q7`, `j12`;  an Overview
 * sub-section's `o3`:  `isItemId()`), or a phase's stable id (`p-epic-migrate`, since P15;  an older page's `p3` has
 * an item id's shape).
 */
function isMarkKey(key: string): boolean {
  return isItemId(key) || PhaseIds.isStable(key)
}
