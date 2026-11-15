// Import directly:  the persist barrel would bring the database and server places too
import { PrefStore } from "spell/util/persist/PrefStore"
import { StoragePlace } from "spell/util/persist/StoragePlace"

import { AWAY_ID } from "spell/epic/definitions/definitions.types"
import {
  CLOSED_HOLD_MS,
  INSTANT_FAIL_MS,
  INSTANT_GRACE_MS,
  REVIEW_ACTIONS,
  REVIEW_API,
  REVISIT_KEY_PREFIX,
  NOBODY_LISTENING,
  STAGE_COUNTDOWN_MS,
  SUMMARY_ID,
  TESTS_API,
  TESTS_ID,
  commentsOf,
  emptyInbox,
  hasPick,
  hasSetChange,
  inboxOf,
  inlineCommentsNote,
  isAnchoredIn,
  isHeld,
  isImmediate,
  isInstant,
  isSent,
  isWorkOnMark,
  pickFieldsOf,
  pickOf,
  setPicksOf,
  withSetPick,
  type Inbox,
  type InboxDoing,
  type InboxDraft,
  type InboxMark,
  type InboxUrgency,
  type MarkInput,
  type NewItem,
  type NewItemInput,
  type NewKind,
  type NowAction,
  type PickFields,
  type ReviewAction,
  type SetPick,
  type ReviewClientOptions,
  type Running,
  type StartAnswer,
  type TestsEntry,
  sentence,
  storageNow,
  wakeOf,
  type WriteOptions
} from "./review.types"
import { PageStore } from "./PageStore"
import { ServerLink } from "./ServerLink"

/****************
 * ### `ReviewClient`
 * A page's REVIEW INBOX, as the page sees it:  the marks Owen leaves on its items and Overview sections,
 * read from and written to the page server's review routes (`spell/epic/tool/reviewRoutes.ts`),
 * one client per page (`forPage()`), a `PageStore` the elements follow (`subscribe()`).
 * - Who uses it:
 *   - the review controls (`<epic-review>`, drawn by `<epic-item>`, `<epic-section>` ...) draw from it
 *   - P10's Send, Review Now and Choose pills call it (`send()`, `choose()`), and an item's id chip (`toggleCalm()`)
 *   - Send hands over Owen's comments too (the docs runtime's bullhorns write them, in the same inbox file):
 *     the routes say which wait for it (`inbox.unsentComments`)
 * - REVIEWING only when the page is served with a token (`window.SPELL_SERVER`) and its inbox answers:
 *   never from `file://`, nor from a server without the routes (`reviewing` stays false, and nothing is drawn)
 * - every route's reply is the whole inbox:  a write's answer replaces what's shown;
 *   a failed write re-reads it, undoing what was shown early
 * - writes through its `ServerLink`:  a 403 on the token (the page server restarted since the page loaded)
 *   takes the server's new token from the page as it's served now, and tries once more
 * - it re-reads the inbox (`watch()`, the link's):
 *   - every `REVIEW_POLL_MS` while the page is visible
 *   - when the page becomes visible
 *   - when the page server says the inbox file changed (the page's live client's `spell-server:changed`)
 * - note drafts:
 *   - saved to the inbox (`POST draft`)
 *   - backed up in localStorage under the old page runtime's key (`REVISIT_KEY_PREFIX`),
 *     so a half-typed note survives the switch
 *   - a backup the inbox lacks is handed to it on start (`adoptBackups()`)
 *   - what's being typed also stays in memory (`typed`), for an element drawn anew
 * - a note Claude TOOK (`inbox.taken`, epic `epic-engine` I190) is no longer a draft:
 *   the box lets go of its words (`changed()`), the page shows them read-only (`takenNoteOf()`),
 *   and what's typed next is a NEW mark, for the next send (`typedMark()`)
 * - who listens:  `inbox.listening` (`null` once a session's heartbeat stopped:  the routes say so)
 * - Node-safe at import, and without `watch()`:  no `window` / `document` touched;
 *   the browser's services come in through `ReviewClientOptions`, so tests stub `fetch` and storage
 * - Position in the import graph:  its peers (types, `ServerLink`, `PageStore`) only;
 *   the inbox's types from `spell/epic/tool/ReviewInbox` (erased).
 *   NEVER imports Solid, Spell UI or the `spell-epic` barrel:  elements bridge its changes (`subscribe()`)
 *   into their own signals.
 ****************/
export class ReviewClient extends PageStore {
  /** The inbox as last read or written. */
  inbox: Inbox = emptyInbox()

  /** Served with a token, and the inbox answered:  the controls show. */
  reviewing = false

  /** Why the last write failed, in words:  for a caller that writes `quiet`. */
  lastWriteError = ""

  /** The page server, as the inbox writes to it:  the write token, its refresh, the watch. */
  private readonly link: ServerLink

  /** Called with every notice. */
  private readonly noticeListeners = new Set<(message: string) => void>()

  /** Immediate requests in flight, id -> their write. */
  private readonly asking = new Map<string, Promise<boolean>>()

  /** Ids whose immediate request is being called off. */
  private readonly calling = new Set<string>()

  /** Ids whose note box is open by itself (an item without details), or holds a draft being written. */
  private readonly boxes = new Set<string>()

  /** What's typed in each note box right now:  kept for an element drawn anew (the live update). */
  private readonly typed = new Map<string, string>()

  /**
   * Picks Claude TOOK:
   * id -> the pick of a sent mark that left the inbox without Owen (`inbox apply`, `done`, `clear`).
   * - kept until the page reloads or Owen marks the item again (`takenPickOf()`)
   * - why:  the inbox forgets the mark before the page has the doc's `chosen`
   *   (its live update can lag, or wait while the view is hidden),
   *   and the Choose pill dropped back to "Choose" meanwhile (Owen, 2026-10-10)
   */
  private readonly taken = new Map<string, PickFields>()
  /**
   * The Reads in "0. While you were out" (`away`, `away:<line>`) the page server applied and cleared since the page
   * loaded (epic `epic-engine` I268):  their lines stay faded (`wasRead()`) until the page's patch takes them away.
   */
  private readonly readAway = new Set<string>()

  /**
   * The instant marks (`isInstant()`:  a ✓ or x with nothing for Claude) in the inbox, id -> the mark's `at`
   * (`trackInstant()`, epic `epic-engine` I306):  what `isClosing()` follows from the click to the page's update.
   */
  private readonly instantMarks = new Map<string, string>()

  /** Ids whose instant mark Owen took back with a second click:  shown again at once, never held closed. */
  private readonly undoneInstant = new Set<string>()

  /**
   * Items whose instant mark the page server applied and took off the inbox, id -> until when (ms) they stay drawn
   * closed:  the page's own update of the item lands meanwhile, so it never shows open for a moment.
   */
  private readonly closedHere = new Map<string, number>()

  /** Instant marks the page server never applied (`id@at`):  the item shows again, and a notice says so. */
  private readonly failedInstant = new Set<string>()

  /**
   * Items Owen closed with an instant ✓ or x this visit, id -> the action:  kept in view, grey, until his next Send
   * or Auto Send (`isHeldInView()`, epic `epic-engine` T80;  Owen:  "mark as grey & collapse, then keep it
   * visible/gray until send or auto-send");  a click on the same button again takes it back, however long since.
   */
  private readonly heldInView = new Map<string, string>()

  /**
   * His instant marks this visit, oldest first, at most `UNDO_KEPT`:  what Cmd-Z walks back through (`undoLast()`,
   * T80), even once its item has folded away.
   */
  private readonly undoStack: Array<{ id: string; action: string }> = []

  /** Timers for `trackInstant()`, by `fail:<id>` and `hold:<id>`. */
  private readonly instantTimers = new Map<string, ReturnType<typeof setTimeout>>()

  /** Notes of sent marks the last inbox read no longer has, id -> words:  `changed()` lets their boxes go of them. */
  private readonly goneNotes = new Map<string, string>()

  /** The words each box let go of last, id -> words (`releasedOf()`):  Claude has them. */
  private readonly released = new Map<string, string>()

  /** Writes in flight:  a poll's answer can't overwrite what they're about to. */
  private writing = 0

  /** `start()`'s promise:  one start per client. */
  private starting: Promise<boolean> | undefined

  constructor(private readonly options: ReviewClientOptions) {
    super()
    this.link = new ServerLink(options)
  }

  ////////////////
  // ## The page's client
  ////////////////

  /**
   * The page's client, made and started on the first call (browser only):
   * `page` is `location.pathname`, the server's info `window.SPELL_SERVER`, and it `watch()`es the page.
   * - SIDE EFFECT:  the first call reads the inbox and starts polling
   * - a test hands it its own, on a stubbed fetch (`adopt()`)
   */
  static forPage(): ReviewClient {
    return ReviewClient.onePerPage(() => {
      const client = new ReviewClient(ReviewClient.pageOptions())
      void client
        .start()
        .then((reviewing) => reviewing && client.watch(window))
        .catch((error: unknown) => console.error("ReviewClient:  couldn't start", error))
      return client
    })
  }

  /** The page's facts and services, as the browser has them. */
  private static pageOptions(): ReviewClientOptions {
    return {
      ...ServerLink.pageOptions(),
      // a browser that blocks it throws here:  `StoragePlace` keeps the backups in memory then
      storage: () => window.localStorage,
      // the summary has no id of its own:  it's there when the page has one
      hasItem: (id) => !!document.getElementById(id) || (id === SUMMARY_ID && !!document.querySelector(SUMMARY_TAG))
    }
  }

  ////////////////
  // ## Start
  ////////////////

  /**
   * Read the inbox;  if it answers, the page is being reviewed:  backups handed over, drafts' boxes reopened.
   * - true when reviewing
   * - once per client
   * - only a page the routes review (`PLAN_DOC_PAGE`, `SAGA_PAGE`), served with a token:  else it never asks
   * - NEVER throws
   */
  start(): Promise<boolean> {
    this.starting ??= this.begin()
    return this.starting
  }

  /** `start()`'s work. */
  private async begin(): Promise<boolean> {
    if (!this.link.servesReviews || !(await this.load())) return false
    this.reviewing = true
    await this.adoptBackups()
    // a note being written reopens where it was, from any address
    for (const id of Object.keys(this.inbox.drafts)) this.boxes.add(id)
    this.changed()
    return true
  }

  /**
   * Keep the inbox fresh on `window`'s page;  returns the undo.
   * - a poll every `REVIEW_POLL_MS` while visible
   * - a read when it becomes visible
   * - one when the page server says the inbox file, or a person's comments file beside it, changed
   *   (`spell-server:changed`, the page's live client:
   *   never a connection of our own, each holds one of Chrome's 6 per host)
   */
  watch(window: Window): () => void {
    const inboxFile = this.link.file.replace(/(?:\.plan|\.saga)?\.html$/, ".inbox.json5")
    // and each person's comments file beside it (epic `epic-friend` P9):  a comment saved changes only that one
    const base = inboxFile.replace(/\.inbox\.json5$/, ".comments.")
    const inboxFiles = ServerLink.dataFileNames(inboxFile)
    const isOurs = (path: string) =>
      inboxFiles.includes(path) || (path.startsWith(base) && /^[^/.]+\.json5$/.test(path.slice(base.length)))
    const unwatch = ServerLink.watch(window, isOurs, () => void this.refresh())
    this.view = window
    // Cmd-Z (Ctrl-Z) outside a text field takes back his last instant ✓ or x (epic `epic-engine` T80);  in a field
    // it stays the field's own undo, and with nothing to undo it passes on (to VS Code, through the live client)
    const onKey = (event: KeyboardEvent) => {
      if (!isUndoKey(event) || isTyping(event) || !this.canUndo) return
      event.preventDefault()
      this.undoLast()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      unwatch()
      window.removeEventListener("keydown", onKey)
      this.view = undefined
    }
  }

  /** The window `watch()` follows, while it does:  Cmd-Z's listener, and where an undone item is scrolled to. */
  private view: Window | undefined

  ////////////////
  // ## Listening
  ////////////////

  /** Call `listener` with every notice (a failed write, nobody listening);  returns the undo. */
  onNotice(listener: (message: string) => void): () => void {
    this.noticeListeners.add(listener)
    return () => this.noticeListeners.delete(listener)
  }

  /** Say `message` to the page (`onNotice()`'s listeners:  the notice line). */
  notify(message: string) {
    for (const listener of this.noticeListeners) listener(message)
  }

  ////////////////
  // ## Reads
  ////////////////

  /** Item `id`'s mark, if any. */
  markOf(id: string): InboxMark | undefined {
    return this.inbox.marks[id]
  }

  /**
   * Is item `id` closing:  Owen's ✓ or x on it with nothing for Claude (`isInstant()`), which the page server applies
   * by itself (epic `epic-engine` I306;  Owen:  "it should show as grey and hide with an animate up immediately")?
   * - true from the click:  the item draws grey at once (`DrawnState`), and its section folds it away when grey items
   *   are hidden
   * - and for a while after the server applied it (`CLOSED_HOLD_MS`):  the page's own update lands meanwhile
   * - false once taken back (a second click), or when the server never applied it (`INSTANT_FAIL_MS`):
   *   the item shows again, and a notice says so
   */
  isClosing(id: string): boolean {
    const mark = this.inbox.marks[id]
    if (mark && isInstant(id, mark)) return !this.failedInstant.has(`${id}@${mark.at}`)
    if (this.heldInView.has(id)) return true
    const until = this.closedHere.get(id)
    return until !== undefined && until > Date.now()
  }

  /**
   * Is item `id` closed at Owen's instant ✓ or x this visit, and kept in view, grey, until his next Send or Auto Send
   * (epic `epic-engine` T80)?  Its section doesn't hide it till then;  a click on its button again takes it back.
   */
  isHeldInView(id: string): boolean {
    return this.heldInView.has(id)
  }

  /** Is there an instant mark of his this visit for Cmd-Z to take back (`undoLast()`)? */
  get canUndo(): boolean {
    return this.undoStack.length > 0
  }

  /** Is `id` (`away:<line>`) read:  its Seen in the inbox, or applied and cleared since the page loaded? */
  wasRead(id: string): boolean {
    return this.inbox.marks[id]?.action === "seen" || this.readAway.has(id)
  }

  /** Item `id`'s saved draft, if any. */
  draftOf(id: string): InboxDraft | undefined {
    return this.inbox.drafts[id]
  }

  /** Has `mark` gone to Claude? */
  isSent(mark: InboxMark): boolean {
    return isSent(mark, this.inbox.sent)
  }

  /**
   * Item `id`'s pick that Claude took off the inbox since the page loaded (`{ pick, choices? }`), if any:
   * a Choose pill keeps showing it as sent until the doc's `chosen` arrives.
   */
  takenPickOf(id: string): PickFields | undefined {
    return this.taken.get(id)
  }

  /** Is a Claude session waiting on the inbox? */
  get listening(): boolean {
    return !!this.inbox.listening
  }

  /** What the listening session is doing now (`epic inbox status`, epic `epic-engine` P35);  `null` for nothing. */
  get doing(): InboxDoing | null {
    return this.inbox.doing ?? null
  }

  /**
   * Why work waits, with nobody listening:  what the page server's wake did
   * (`Typed /epic review x into 🚧 x:  press Enter there`, epic `epic-workflow` P16), else `NOBODY_LISTENING`.
   */
  get waitingWhy(): string {
    return this.inbox.woken?.message.replace(/\.$/, "") ?? NOBODY_LISTENING
  }

  /**
   * Item `id`'s immediate request, if one is on its way or being worked on:
   * `{ action, queued }` (`queued`:  waiting, nobody listening);  else `null`.
   */
  runningOf(id: string): Running | null {
    if (this.calling.has(id)) return null
    const work = this.inbox.working[id]
    if (work) return { action: work.action, queued: false }
    const entry = this.inbox.now.find((each) => each.id === id)
    if (!this.asking.has(id) && !entry) return null
    const asked = this.inbox.marks[id]?.action
    const action = entry?.action ?? (asked === "revisit" || asked === "prepare" ? asked : "details")
    return { action, queued: !this.asking.has(id) && !this.inbox.listening }
  }

  /**
   * The review button whose work on item `id` is on its way or under way
   * (it spins;  a click calls it off);  else `null`.
   * - the mark's own button (Approve, Make Todo, Revisit:  Claude took a sent mark)
   * - else Do Now (`details`:  Add Details, a revisit now)
   * - none when Owen marked the item AFTER Claude started on it (`isWorkOnMark()`):  that work is an earlier request's
   */
  busyButtonOf(id: string): ReviewAction | null {
    if (!this.runningOf(id)) return null
    const mark = this.inbox.marks[id]
    // Claude is on an earlier request:  the mark Owen made since is still his, and nothing of his turns (I280)
    const work = this.inbox.working[id]
    if (work && !isWorkOnMark(work, mark)) return null
    const own = mark && !isImmediate(mark) && REVIEW_ACTIONS.find((action) => action === mark.action)
    return own || "details"
  }

  /**
   * The mark Claude TOOK on item `id` (epic `epic-engine` I190), while it has a note or a picture to show:
   * what Claude is answering, shown read-only above its status card;  else `undefined`.
   * - `inbox.taken`:  its agent started on it, or a status card was written for it
   * - kept when Owen marks the item again meanwhile:  his new mark is `markOf()`, this the one being answered
   */
  takenNoteOf(id: string): InboxMark | undefined {
    const mark = this.takenOf(id)
    return mark && (mark.note || (mark.shot && mark.action !== "test")) ? mark : undefined
  }

  /**
   * Is item `id`'s mark the one Claude TOOK (`takenNoteOf()`)?  Then it's Claude's to answer, not Owen's to edit:
   * the note box doesn't hold it, and a note typed there is a new mark.
   */
  isTaken(id: string): boolean {
    const mark = this.inbox.marks[id]
    return !!mark && this.takenOf(id)?.at === mark.at
  }

  /** Item `id`'s mark while it's still Owen's to change:  `undefined` once Claude took it (`isTaken()`). */
  ownMarkOf(id: string): InboxMark | undefined {
    return this.isTaken(id) ? undefined : this.inbox.marks[id]
  }

  /**
   * The mark Claude took on item `id`, by the inbox's `taken`;
   * from a page server older than it (none sent):  its sent mark while Claude works on it.
   */
  private takenOf(id: string): InboxMark | undefined {
    const taken = this.inbox.taken[id]
    if (taken) return taken
    const mark = this.inbox.marks[id]
    return mark && this.inbox.working[id] && this.isSent(mark) ? mark : undefined
  }

  /** Has Claude taken item `id`'s request (`working`), rather than it waiting to be taken? */
  isWorkedOn(id: string): boolean {
    return !!this.inbox.working[id]
  }

  /**
   * Is Owen's own ask for item `id`'s details (Add Details, Clarify, its ? icon) on its way or being answered?
   * (epic `epic-engine` I295):  posted from here, queued, or taken as his ask (`working.asked`).
   * - NOT an agent merely at work on the item (`epic inbox working <id> on`, an issue taken up):  that's no ask of his
   *   - Owen, 2026-11-15, on language's I98, its ? icon turning while its agent worked:  "That should only spin when
   *     I've asked for clarification."
   */
  isClarifying(id: string): boolean {
    if (this.calling.has(id)) return false
    if (this.asking.has(id)) return true
    if (this.inbox.now.some((each) => each.id === id && each.action === "details")) return true
    const work = this.inbox.working[id]
    return !!work?.asked && work.action === "details"
  }

  /** Is `id`'s note box open by itself (an item without details), or being written in? */
  isBoxOpen(id: string): boolean {
    return this.boxes.has(id)
  }

  /** What's typed in `id`'s note box:  in memory, else its draft;  `""` for nothing. */
  typedOf(id: string): string {
    return this.typed.get(id) ?? this.inbox.drafts[id]?.note ?? ""
  }

  /** Item `id`'s urgency Owen set on the page, not applied yet:  `true` not urgent, `false` urgent;  else none. */
  calmOf(id: string): boolean | undefined {
    return this.inbox.urgency[id]?.calm
  }

  /**
   * The new items Owen asked for from the page, waiting in the inbox, in the order he added them;
   * `kind`:  only those.
   * - `{ action: "new" }` marks (epic `airplane` P2)
   */
  newItems(kind?: NewKind): NewItem[] {
    return Object.entries(this.inbox.marks)
      .filter(([, mark]) => mark.action === "new" && (!kind || mark.kind === kind))
      .map(([id, mark]) => ({ id, ...mark }) as NewItem)
      .sort((a, b) => newNumber(a.id) - newNumber(b.id))
  }

  /** Everything waiting for "Send to Claude":  marks, urgencies and comments. */
  get unsentCount(): number {
    return this.unsentMarkCount + this.unsentCommentCount
  }

  /**
   * How many marks and urgencies wait for "Send to Claude".
   * - and the items closed at his ✓ or x this visit, kept in view till his Send (`isHeldInView()`, T80):  Send (or
   *   Auto Send) folds them away, waking nobody for them
   */
  get unsentMarkCount(): number {
    return this.unsentMarks().length + this.unsentUrgency().length + this.heldInView.size
  }

  /**
   * How many comments wait for "Send to Claude":  Claude's turn on the thread, and Owen's words newer than the last
   * send (Owen, 2026-10-10:  Send is how comments reach Claude).
   * - the routes count them (`inbox.unsentComments`):  the threads' rules are the server's
   */
  get unsentCommentCount(): number {
    return this.inbox.unsentComments.length
  }

  ////////////////
  // ## Buttons
  ////////////////

  /**
   * The reader clicked `id`'s `action` button.  Answers:
   * - `"open-box"`:  Revisit should take them to the note box (the caller opens it)
   * - `"chosen"`:  the click chose an action for it
   *   (the caller folds the item:  Owen, 2026-10-10, "so he moves on to the next")
   * - else `undefined`:  the click handled (cleared, or called off)
   *
   * What a click does:
   * - running (it spins):  "nevermind", called off (`cancel()`)
   * - chosen already:  cleared, back to no action;
   *   a revisit, an Approve or a Do this carrying a pick keeps the pick ("pick B, but ..." without the "but")
   * - Approve and Do this keep the pick already made in the item's or phase's Choices, as one mark (epic
   *   `epic-engine` I217;  Owen, 2026-11-03:  "I should be able to choose and thumbs up at the same time")
   * - else:
   *   - Approve and Make Todo mark it
   *   - Approve (Accept plan) on a revisit made of his comments in its text KEEPS them (epic `epic-engine` I163;
   *     Owen, 2026-10-29:  "just incorporate the feedback and auto-approve rather than asking me again"):
   *     `{ action: "approve", note, comments }`;  clicked again, it's that revisit again
   *   - Revisit opens the note box;  but on a part with Owen's comments in its text (`commentsIn()`) and nothing
   *     typed, it marks the revisit at once, its note pointing at them, its `comments` naming them:  the inline
   *     comments ARE his note (Owen, 2026-10-26, epic `epic-engine` I140:  "don't make me type in the comment section")
   *   - Do Now (`details`, decision Q20) asks at once:
   *     with a note in the box, Claude answers it now (a revisit now, as the note box's Do Now was);
   *     without, Claude adds details
   * - a todo's plane (`next`:  do it in the next phase) and x (`drop`), Owen, 2026-10-09:  mark it, as Approve does;
   *   with a note in the box, the note goes along (why now, why not)
   */
  press(id: string, action: ReviewAction): "open-box" | "chosen" | undefined {
    const mark = this.inbox.marks[id]
    if (this.busyButtonOf(id) === action) return void this.cancel(id)
    // Claude has his last note:  Revisit is for a new one, never a click taking that one back (I190)
    if (action === "revisit" && this.isTaken(id)) return "open-box"
    if (action === "details") {
      const note = this.typedOf(id).trim()
      void (note ? this.useNote(id, "now", note) : this.askNow(id, "details"))
      return "chosen"
    }
    // a ✓ or x the server applied already, on an item still held in view (T80):  a second click puts it back
    if (!mark && this.heldInView.get(id) === action) return void this.undo(id)
    if (mark?.action === action && !isImmediate(mark)) {
      // a ✓ or x taken back inside its grace:  shown again at once, never held closed (I306)
      if (isInstant(id, mark)) {
        this.undoneInstant.add(id)
        this.forgetInstant(id)
      }
      // an Approve that kept his comments goes back to the revisit they made (I163):  never lost by a click
      if (action === "approve" && mark.comments?.length)
        return void this.save(id, {
          action: "revisit",
          when: "soon",
          note: mark.note ?? "",
          ...commentsOf(mark),
          ...pickOf(mark)
        })
      const pick = carriedPickOf(mark)
      return void this.save(id, hasPick(pick) ? { action: "pick", ...pick } : null)
    }
    if (action === "revisit") {
      const inline = this.commentsIn(id)
      if (!inline.length || this.typedOf(id).trim()) return "open-box"
      void this.save(id, {
        action: "revisit",
        when: "soon",
        note: inlineCommentsNote(inline),
        comments: inline,
        ...pickOf(mark)
      })
      return "chosen"
    }
    if (action === "next" || action === "drop") {
      const note = this.typedOf(id).trim()
      if (note) {
        void this.useNote(id, action, note)
        return "chosen"
      }
    }
    // Approve on a revisit of his comments in its text keeps them (I163):  approved, the comments folded in
    if (action === "approve" && mark?.action === "revisit" && !isImmediate(mark) && mark.comments?.length) {
      void this.save(id, { action, ...(mark.note && { note: mark.note }), ...commentsOf(mark), ...pickOf(mark) })
      return "chosen"
    }
    const input = { action, ...(CARRIES_PICK.has(action) && pickOf(mark)) }
    if (isInstant(id, input)) this.keepInstant(id, action)
    void this.save(id, input)
    return "chosen"
  }

  /**
   * Cmd-Z (Ctrl-Z):  take back his last instant ✓ or x this visit (epic `epic-engine` T80;  Owen:  "Cmd-z to undo
   * the mark on the hidden thing?"):  its item back as it was, unfolding into view;  false with nothing to undo.
   * - not applied yet (inside its grace):  the mark taken off, as a second click does
   * - applied:  the page server puts the item back (`POST undo`, `InstantUndo`);  refused (changed since), a notice
   *   says why
   * - a notice says what was undone:  "Undid:  closed I57"
   */
  undoLast(): boolean {
    const last = this.undoStack.pop()
    if (!last) return false
    void this.undo(last.id, last.action)
    return true
  }

  /**
   * Take back his instant mark on item `id` (`action`:  which;  the held one's, else the inbox's):  off the inbox if
   * the server hasn't applied it, else put back by the server (`POST undo`);  says what was undone.
   */
  private async undo(id: string, action = this.heldInView.get(id) ?? this.inbox.marks[id]?.action ?? "") {
    this.forgetInstant(id)
    const mark = this.inbox.marks[id]
    const what = `${UNDONE_WORDS[action] ?? "marked"} ${id.toUpperCase()}`
    if (mark && isInstant(id, mark)) {
      this.undoneInstant.add(id)
      if (await this.save(id, null)) {
        this.notify(`Undid:  ${what}`)
        this.showAgain(id)
      }
      return
    }
    this.closedHere.delete(id)
    this.changed()
    if (await this.post("undo", { id })) {
      this.notify(`Undid:  ${what}`)
      this.showAgain(id)
    }
  }

  /** Item `id`, back after an undo:  scrolled into sight once it has unfolded, never jumping more than it must. */
  private showAgain(id: string) {
    const view = this.view
    view?.setTimeout(() => view.document.getElementById(id)?.scrollIntoView({ block: "nearest" }), UNFOLD_WAIT_MS)
  }

  /** His instant `action` on `id`, just made:  kept in view till Send, and on Cmd-Z's list (T80). */
  private keepInstant(id: string, action: string) {
    this.heldInView.set(id, action)
    this.undoStack.splice(0, this.undoStack.length, ...this.undoStack.filter((each) => each.id !== id))
    this.undoStack.push({ id, action })
    if (this.undoStack.length > UNDO_KEPT) this.undoStack.shift()
  }

  /** Item `id`'s instant mark taken back:  no longer held in view, nor on Cmd-Z's list. */
  private forgetInstant(id: string) {
    this.heldInView.delete(id)
    const at = this.undoStack.findIndex((each) => each.id === id)
    if (at >= 0) this.undoStack.splice(at, 1)
  }

  /**
   * His Send (or Auto Send) came:  the items held in view (`isHeldInView()`) are let go, folding away with the greys
   * as they hide (still drawn closing a moment, `RELEASE_FOLD_MS`, so their section folds them);  the ids let go.
   */
  private releaseHeld(): string[] {
    const ids = [...this.heldInView.keys()]
    if (!ids.length) return ids
    this.heldInView.clear()
    const until = Date.now() + RELEASE_FOLD_MS
    for (const id of ids) if (!this.inbox.marks[id]) this.closedHere.set(id, until)
    this.changed()
    return ids
  }

  /**
   * The ids of the comments waiting for Claude in `id`'s text (an item, a phase, an Overview part), in their order:
   * `["c1", "c3"]` (`isAnchoredIn()`;  epic `epic-engine` I140).
   * - waiting:  Owen spoke last on the thread, as the server works it out (`inbox.waitingComments`)
   */
  commentsIn(id: string): string[] {
    return this.inbox.waitingComments.filter((each) => isAnchoredIn(each.anchor, id)).map((each) => each.id)
  }

  /**
   * Is it Owen's turn on a comment in `id`'s text:  Claude spoke last on its thread, and he hasn't ticked, replied or
   * cleared it (`inbox.repliedComments`, the server's rule)?  Its item draws orange (epic `epic-engine` I284).
   */
  hasRepliedComments(id: string): boolean {
    return this.inbox.repliedComments.some((each) => isAnchoredIn(each.anchor, id))
  }

  /**
   * Pick option `letter` of card set `choices` on `id` (`null`:  drop the pick):  a "Choose" pill (P10).
   * - `choices`:  which of the item's `<epic-choices>` the option is in, by position
   *   (I8:  its text's, a reply's ...);  none, its own
   * - a revisit keeps its note:  "pick B, but ..."
   *   - one asked NOW turns `soon`, so the pick waits for the send with it
   *     (an immediate mark counts as sent:  Claude would never see the new pick)
   * - an Approve or a Do this stays pressed, the pick beside it (I217);  un-picked, it stays, plain
   * - anything else becomes a plain pick, or none
   * - with `choices`, the holder's OTHER sets' changes stay as they are (`sets`, epic `epic-engine` I227)
   */
  choose(id: string, letter: string | null, choices?: number): Promise<boolean> {
    const mark = this.inbox.marks[id]
    const own = letter ? { pick: letter, ...(choices !== undefined && { choices }) } : {}
    // the holder's other sets' changes stay (I227);  no set named, the pick replaces them all, as before
    const others = choices === undefined ? [] : setPicksOf(mark).filter((each) => (each.choices ?? 0) !== choices)
    const pick = pickFieldsOf([...others, own])
    if (keepsAction(mark)) return this.save(id, { ...withoutPick(mark!), ...pick })
    if (mark?.action !== "revisit") return this.save(id, hasSetChange(pick) ? { action: "pick", ...pick } : null)
    return this.save(id, { action: "revisit", when: "soon", note: mark.note ?? "", ...pick })
  }

  /**
   * ONE option set's whole change, its mark's set fields (`SetChange`, epic `epic-engine` P50):  picks, the
   * pick-one / pick-any flip, options added, edited and removed;  `{}` drops them.
   * - `id`:  what holds the set, an item, a phase or a standing set (`s-upgrades`)
   * - `index`:  which of its sets (`EpicChoices.setOf()`);  the mark keeps the OTHER sets' changes as they are
   *   (`withSetPick()`, epic `epic-engine` I227:  a pick in a phase's 2nd set dropped its 1st set's)
   * - a revisit keeps its note and comments, its pick fields replaced ("pick B, but ...");  one asked NOW turns
   *   `soon`, as `choose()` does
   * - an Approve or a Do this stays pressed, the change beside it (I217)
   * - anything else becomes a plain pick mark, or none
   * - a page server older than the set's changes (started before P50:  it keeps a pick, and drops the flip and the
   *   options added, edited or removed) answers with less than was sent:  said in a notice, false (epic
   *   `epic-engine` I178:  the switch flipped back by itself, and nothing said why)
   */
  async changeSet(id: string, index: number, change: SetPick): Promise<boolean> {
    const mark = this.inbox.marks[id]
    const fields = withSetPick(mark, index, change)
    const changed = hasSetChange(fields)
    const saved = keepsAction(mark)
      ? await this.save(id, { ...withoutPick(mark!), ...fields })
      : mark?.action !== "revisit"
        ? await this.save(id, changed ? { action: "pick", ...fields } : null)
        : await this.save(id, {
            action: "revisit",
            when: "soon",
            note: mark.note ?? "",
            ...commentsOf(mark),
            ...fields
          })
    if (!saved) return false
    const kept = pickOf(this.inbox.marks[id])
    const dropped = (Object.keys(fields) as (keyof PickFields)[]).filter((key) => kept[key] === undefined)
    if (!dropped.length) return true
    this.notify(`${OLD_SERVER}  (It dropped ${dropped.map((key) => `\`${key}\``).join(", ")}.)`)
    return false
  }

  /**
   * Item `id`'s id chip clicked:  urgent becomes not urgent, and back (`docCalm`:  what the doc says, `calm`).
   * - shown at once, then saved
   * - back to what the doc says:  the inbox forgets it
   */
  toggleCalm(id: string, docCalm: boolean): Promise<boolean> {
    const calm = !(this.calmOf(id) ?? docCalm)
    if (calm === docCalm) delete this.inbox.urgency[id]
    else this.inbox.urgency[id] = { calm, at: new Date().toISOString() }
    this.changed()
    return this.write("urgency", { id, calm: calm === docCalm ? null : calm })
  }

  ////////////////
  // ## Pictures and testing (epic `epic-engine` P4, P51)
  ////////////////

  /**
   * Start testing (epic `epic-engine` P51):  the Manual tests section's request for now (`prepare`, under
   * `TESTS_ID`), which the session hands to an agent that checks what it can and writes out the rest;  true when asked.
   * - nobody listening:  the page server wakes the epic, as for Add Details (`askNow()`)
   */
  prepareTests(): Promise<boolean> {
    return this.askNow(TESTS_ID, "prepare")
  }

  /**
   * Put picture `shot` (a path `saveShot()` answered;  `undefined` takes it away) in item `id`'s note mark
   * (epic `epic-engine` P51:  a screenshot pasted or dropped in any note box);  true when saved.
   * - a note mark already (a revisit, Make Todo, the x, a todo's plane or drop):  the same mark, with the picture
   * - else what's typed makes the mark (`typedMark()`), a revisit with the picture, so Send hands it over;
   *   nothing typed:  a revisit holding only the picture
   * - taken away from a revisit with no words, pick or comments left:  the mark goes
   */
  attachShot(id: string, shot: string | undefined): Promise<boolean> {
    // a mark Claude took isn't the box's any more:  the picture starts a new note (I190)
    const mark = this.ownMarkOf(id)
    const typed = this.typedOf(id)
    const made = mark && NOTE_MARKS.has(mark.action) && !isImmediate(mark) ? stripped(mark) : this.typedMark(id, typed)
    const base: MarkInput =
      made && made !== "draft" ? made : { action: "revisit", when: "soon", note: typed.trim(), ...pickOf(mark) }
    const { shot: _old, ...rest } = base
    const empty = rest.action === "revisit" && !rest.note && !hasPick(rest) && !rest.comments?.length
    if (!shot && empty) return this.save(id, null)
    this.boxes.add(id)
    return this.save(id, { ...rest, ...(shot && { shot }) })
  }

  /**
   * Save `png` (a data URL) as item `id`'s picture (`POST shot`):  a note box's, an option's;  its path from the
   * epic's folder, as the route answers it (`tests/j3-20261029-1432.png`), or `undefined` when it failed (a notice
   * says why).
   * - its answer is the path, not the inbox:  the caller puts it in the mark (`attachShot()`, an option set's change)
   * - NEVER throws
   */
  async saveShot(id: string, png: string): Promise<string | undefined> {
    try {
      const reply = (await this.link.post(`${REVIEW_API}/shot`, { page: this.options.page, id, png })) as {
        shot?: unknown
      }
      if (typeof reply?.shot === "string") return reply.shot
      this.notify("The page server kept no screenshot.")
    } catch (failure) {
      this.notify(sentence((failure as Error).message))
    }
    return undefined
  }

  /**
   * Every epic with open tests, in Owen's saga order (`GET /api/epics/tests`):  where a run across every epic
   * (`epic test --all`) goes next;  `[]` when the server can't say.
   * - NEVER throws
   */
  async openTests(): Promise<TestsEntry[]> {
    try {
      const entries = await this.link.get<unknown>(TESTS_API)
      return Array.isArray(entries)
        ? (entries as Partial<TestsEntry>[]).filter(
            (entry): entry is TestsEntry =>
              typeof entry?.epic === "string" && typeof entry.open === "number" && typeof entry.page === "string"
          )
        : []
    } catch {
      return []
    }
  }

  ////////////////
  // ## Note box
  ////////////////

  /** Open `id`'s note box by itself (an item without details:  under its line). */
  openBox(id: string) {
    this.boxes.add(id)
    this.changed()
  }

  /** Close `id`'s note box;  `used`:  its note became a mark, so what was typed goes too. */
  closeBox(id: string, used: boolean) {
    this.boxes.delete(id)
    if (used) this.forgetTyped(id)
    this.changed()
  }

  /** `text` is in `id`'s note box now:  kept in memory and in this browser's backup (not saved:  `saveDraft()`). */
  type(id: string, text: string) {
    this.typed.set(id, text)
    this.backup(id, text)
  }

  /**
   * Make `id`'s note a mark;  what was typed is dropped from memory and the backup (the mark carries it).
   * - `how`:  the note box button pressed
   *   (`soon`:  Later, `skip`:  the x, `now`:  Do Now;  a todo's `next` and `drop`, Owen, 2026-10-09)
   * - Later keeps the item's pick:  "pick B, but ..."
   * - the x (`skip`:  nothing to do) replaces any other mark, a pick too;  its note may be empty
   */
  useNote(id: string, how: "skip" | "next" | "drop" | "soon" | "now", note: string): Promise<boolean> {
    this.forgetTyped(id)
    this.boxes.delete(id)
    if (how === "now") return this.askNow(id, "revisit", note)
    // a mark Claude took lends the new one nothing:  its pick and comments went with it (I190)
    const mark = this.ownMarkOf(id)
    // the box's picture goes with the button pressed (epic `epic-engine` P51)
    const shot = mark?.shot && mark.action !== "test" ? { shot: mark.shot } : {}
    if (how !== "soon") return this.save(id, { action: how, note, ...shot })
    return this.save(id, { action: "revisit", when: "soon", note, ...pickOf(mark), ...commentsOf(mark), ...shot })
  }

  /**
   * Save what's typed in `id`'s note box (`text`) as the mark it makes (`typedMark()`), else as its draft;
   * true when saved (the backup then goes).
   * - Owen, 2026-10-22 (epic `epic-engine` P20):  "when I type in the revisit box, revisit is automatically on (but
   *   don't auto-close the field from underneath me)"
   * - so Send, and the countdown, hand his words over without a press of Later
   * - the box stays open, and what's typed stays in it:  it counts as written in (`isBoxOpen()`), so the marked note
   *   isn't drawn above it as well
   */
  async saveTyped(id: string, text: string, options: WriteOptions = {}): Promise<boolean> {
    // the words Claude took, still in a box that had the focus as he took them:  nothing new to save (I190)
    if (this.isTaken(id) && text.trim() === (this.inbox.marks[id]?.note ?? "").trim()) {
      this.forgetTyped(id)
      this.changed()
      return true
    }
    const mark = this.typedMark(id, text)
    if (mark === "draft") return this.saveDraft(id, text, options)
    this.boxes.add(id)
    const saved = await this.save(id, mark, { quiet: true, ...options })
    if (saved && this.typedOf(id) === text) this.backup(id, "")
    return saved
  }

  /**
   * The mark `text` typed in `id`'s note box makes (`saveTyped()`):
   * - words, and no note mark yet (none, an Approve, a pick):
   *   Revisit ON, a revisit to talk over carrying them, the pick kept ("pick B, but ...")
   * - words, and a note mark already (a revisit, Make Todo, the x, a todo's plane or drop):
   *   the same mark, its words changed
   * - emptied:  a revisit goes again (its pick stays, a plain pick);
   *   any other mark stays as it is, and the empty box is a draft
   * - a mark Claude TOOK (`isTaken()`, epic `epic-engine` I190):  words make a NEW revisit, waiting for the next
   *   send, which replaces it in the inbox (the inbox keeps the taken one, `taken`);  nothing typed, a draft
   * - `"draft"`:  saved as the box's draft instead, as before P20:
   *   a request at work (Do Now, a revisit now) not taken yet, or an empty box with no revisit
   */
  typedMark(id: string, text: string): MarkInput | null | "draft" {
    const mark = this.inbox.marks[id]
    const note = text.trim()
    if (this.isTaken(id))
      return note && note !== (mark?.note ?? "").trim() ? { action: "revisit", when: "soon", note } : "draft"
    if (mark && isImmediate(mark)) return "draft"
    // a picture in the box stays with whatever its words make (epic `epic-engine` P51)
    const shot = mark?.shot && mark.action !== "test" ? { shot: mark.shot } : {}
    if (!note) {
      if (mark?.action !== "revisit") return "draft"
      if (shot.shot) return { action: "revisit", when: "soon", note: "", ...pickOf(mark), ...commentsOf(mark), ...shot }
      const pick = pickOf(mark)
      return hasPick(pick) ? { action: "pick", ...pick } : null
    }
    if (mark && TYPED_KEEPS.has(mark.action)) return { action: mark.action, note, ...shot, ...carriedPickOf(mark) }
    // his comments in its text stay its content (I140)
    return { action: "revisit", when: "soon", note, ...pickOf(mark), ...commentsOf(mark), ...shot }
  }

  /** Save `text` as `id`'s draft in the inbox;  true when saved (the backup then goes). */
  async saveDraft(id: string, text: string, { keepalive = false }: { keepalive?: boolean } = {}): Promise<boolean> {
    const saved = await this.write("draft", { id, action: "revisit", note: text }, { quiet: true, keepalive })
    if (saved && this.typedOf(id) === text) this.backup(id, "")
    return saved
  }

  ////////////////
  // ## Writes
  ////////////////

  /**
   * Phase `id` dragged to place `to` (1-based, epic `epic-engine` P34):  its move mark, waiting for Send as Defer's
   * does;  `inbox apply` moves it in the file.  A second drag replaces the first.
   */
  move(id: string, to: number): Promise<boolean> {
    return this.save(id, { action: "move", to })
  }

  /** The phases Owen dragged that Claude hasn't moved in the file yet, oldest first:  the page keeps them there. */
  get pendingMoves(): { id: string; to: number }[] {
    return Object.entries(this.inbox.marks)
      .filter(([, mark]) => mark.action === "move" && typeof mark.to === "number")
      .sort(([, a], [, b]) => a.at.localeCompare(b.at))
      .map(([id, mark]) => ({ id, to: mark.to! }))
  }

  /** Mark item `id` (`mark`, or `null` to clear), shown at once, then saved. */
  async save(id: string, mark: MarkInput | null, options: WriteOptions = {}): Promise<boolean> {
    // Owen marked it again:  what Claude took before is no longer his latest word
    this.taken.delete(id)
    // a stage accept's countdown (I181):  held from the first frame, as the server dates it
    const at = Date.now() + (mark?.countdown ? STAGE_COUNTDOWN_MS : 0)
    if (mark) this.inbox.marks[id] = { ...mark, at: new Date(at).toISOString() }
    else delete this.inbox.marks[id]
    this.changed()
    return this.write("mark", { id, mark }, options)
  }

  /**
   * Ask for a new todo or question (`entry`) from the page, or (`id`, `new1`) change one still waiting
   * (epic `airplane` P2):  saved to the inbox (`POST new`), which keys it;  true when saved.
   * - waits for the server's answer before it shows:  the key is the server's to choose
   * - says it's saved, and that it waits for Send (and for a review, with nobody listening)
   */
  async saveNew(entry: NewItemInput, id?: string): Promise<boolean> {
    if (id) {
      const mark = this.inbox.marks[id]
      if (mark) this.inbox.marks[id] = { ...mark, ...entry, action: "new" }
      this.changed()
    }
    const written = await this.write("new", id ? { id, entry } : { entry })
    if (!written) return false
    const what = `${id ? "Changed" : "Saved"}:  a new ${entry.kind}`
    this.notify(this.inbox.listening ? `${what}, sent with your next Send` : `${what}.  ${NOBODY_LISTENING}`)
    return true
  }

  /** Remove new item `id` (`new1`) before Claude makes it:  shown at once, then saved. */
  removeNew(id: string): Promise<boolean> {
    delete this.inbox.marks[id]
    this.changed()
    return this.write("new", { id, entry: null })
  }

  /**
   * Ask Claude to act on item `id` NOW (`details` | `revisit`):  queued in the inbox's `now`.
   * - a revisit keeps the item's pick (the route does too:  `ReviewInbox.requestNow()`)
   * - nobody listening:  the page server wakes the epic (epic `epic-workflow` P16), and the notice says how
   *   (its answer's `wake`), or that nobody is reviewing
   */
  async askNow(id: string, action: NowAction, note?: string): Promise<boolean> {
    const pick = pickOf(this.inbox.marks[id])
    const at = new Date().toISOString()
    this.inbox.marks[id] =
      action === "revisit" ? { action, when: "now", note: note ?? "", ...pick, at } : { action, at }
    const request = this.post("now", note === undefined ? { id, action } : { id, action, note })
    const written = request.then((reply) => reply !== undefined)
    this.asking.set(id, written)
    this.changed()
    const reply = await request
    this.asking.delete(id)
    // called off on its way:  `cancel()` takes it from here
    if (this.calling.has(id)) return reply !== undefined
    this.changed()
    if (reply !== undefined && !this.inbox.listening) this.notify(wakeOf(reply)?.message ?? NOBODY_LISTENING)
    return reply !== undefined
  }

  /**
   * "Nevermind":  call off item `id`'s immediate request (Add Details Now, revisit now),
   * queued or being worked on (`POST cancel`).
   * - shown at once
   * - a revisit's note comes back as a draft, its box open, so nothing typed is lost
   * - a request still on its way waits to land first:  a cancel that reached the server before it would find
   *   nothing to call off, and the request would be queued after it
   */
  async cancel(id: string): Promise<boolean> {
    const mark = this.inbox.marks[id]
    const note = mark?.action === "revisit" ? (mark.note ?? "") : ""
    this.calling.add(id)
    this.forgetRequest(id)
    if (this.asking.has(id)) {
      await this.asking.get(id)
      // its answer put the request back on the page
      this.forgetRequest(id)
    }
    const written = await this.write("cancel", { id })
    this.calling.delete(id)
    this.changed()
    if (!written) return false
    this.notify("Called off:  Claude stops working on it.")
    if (!note) return true
    this.typed.set(id, note)
    this.boxes.add(id)
    await this.write("draft", { id, action: "revisit", note }, { quiet: true })
    return true
  }

  /**
   * "Send to Claude" (`now`:  Review Now, every revisit waiting asked now too);
   * says what went, or why nothing did (P10's Send and Review Now, in the page header).
   * - hands over the unsent marks, urgencies AND comments (`unsentCommentCount`):
   *   a comment or a reply on a thread wakes a listening session only through a send
   * - nobody listening:  the page server wakes the epic (epic `epic-workflow` P16), and the notice says how
   */
  async send({ now = false }: { now?: boolean } = {}): Promise<boolean> {
    // a stage accept counting down goes NOW with a Send (I222;  Owen, 2026-11-04:  pressed Accept Overview, then Send
    // said "Nothing to send"):  the countdown is for when he doesn't Send;  the server ends it (`releaseHeld()`)
    const marks = Object.values(this.inbox.marks)
    const held = marks.filter((mark) => isHeld(mark))
    // an instant ✓ or x is never Claude's (I304):  Auto Send's run doesn't count it either (T80)
    const forClaude = Object.entries(this.inbox.marks)
      .filter(([id, mark]) => !isImmediate(mark) && !isInstant(id, mark))
      .map(([, mark]) => mark)
    const waiting = [...(now ? forClaude : [...this.unsentMarks(), ...held]), ...this.unsentUrgency()]
    const comments = this.unsentCommentCount
    // the items closed at his ✓ or x, held in view till now (T80):  they fold away;  alone, nothing goes to Claude
    const released = this.releaseHeld()
    if (!waiting.length && !comments && released.length) {
      this.notify(`Closed ${released.map((id) => id.toUpperCase()).join(", ")}:  nothing sent to Claude`)
      return true
    }
    if (!waiting.length && !comments) {
      this.notify(
        now
          ? "Nothing to work through:  mark an item or leave a comment first"
          : marks.length
            ? "Sent already:  waiting for Claude"
            : "Nothing to send:  mark an item or leave a comment first"
      )
      return false
    }
    const reply = await this.post("send", now ? { now: true } : {})
    if (reply === undefined) return false
    const what = countWords(waiting.length, comments)
    this.notify(
      !this.inbox.listening
        ? `Saved.  ${wakeOf(reply)?.message ?? NOBODY_LISTENING}`
        : now
          ? `Claude is working through ${what} now:  answers land in the items`
          : `Sent ${what} to Claude`
    )
    return true
  }

  /**
   * "Start a review" (epic `airplane` P12):  ask the page server to type `/epic review <epic>` into the ONE running
   * Claude session titled for the epic (`POST /api/epics/review/start`);  says what came of it (a notice).
   * - its answer, or `undefined` when the server couldn't be asked (the notice says why)
   * - NEVER throws
   */
  async startReview(): Promise<StartAnswer | undefined> {
    try {
      const answer = (await this.link.post(`${REVIEW_API}/start`, { page: this.options.page })) as StartAnswer
      this.notify(answer.message)
      return answer
    } catch (failure) {
      this.notify(sentence((failure as Error).message))
      return undefined
    }
  }

  /**
   * Read the inbox again (a poll, the page server's word) unless a write is in flight;  true when it answered.
   * - NEVER throws
   */
  async refresh(): Promise<boolean> {
    if (this.writing) return false
    const read = await this.load()
    if (read) this.changed()
    return read
  }

  /**
   * Something changed:  first, a note box still holding the words of a mark Claude has now TAKEN lets go of them
   * (`isTaken()`, epic `epic-engine` I190), its backup and its open box too, so it's empty for a new note.
   * - Owen, 2026-10-31:  "I typed the comment in at a previous send, but the text still shows in the comment box"
   * - so does one whose sent mark LEFT the inbox (`goneNotes`, epic `epic-engine` I200):  made a comment as Claude took
   *   it, or cleared once talked over (Owen, 2026-11-02:  "You are still leaving e.g. this after you have processed it")
   * - words typed since (after the taken note) stay:  they're his next note
   */
  protected changed() {
    for (const [id, text] of this.typed) {
      const words = this.isTaken(id) ? this.inbox.marks[id]?.note : this.goneNotes.get(id)
      if (words) this.letGo(id, text, words)
    }
    this.goneNotes.clear()
    this.trackInstant()
    super.changed()
  }

  /**
   * Follow the instant marks from the inbox (`isClosing()`, epic `epic-engine` I306):
   * - a new one:  a timer that, should the mark still stand `INSTANT_FAIL_MS` after its grace, gives up on it
   *   (`failedInstant`) and says so
   * - one gone, not taken back:  the server applied it;  its item stays closed `CLOSED_HOLD_MS` (`closedHere`)
   * - SIDE EFFECT:  timers, which call `changed()` when they fire
   */
  private trackInstant() {
    const now = Date.now()
    for (const [id, mark] of Object.entries(this.inbox.marks)) {
      if (!isInstant(id, mark) || this.instantMarks.get(id) === mark.at) continue
      this.instantMarks.set(id, mark.at)
      this.closedHere.delete(id)
      const key = `${id}@${mark.at}`
      const wait = Date.parse(mark.at) + INSTANT_GRACE_MS + INSTANT_FAIL_MS - now
      this.later(`fail:${id}`, wait, () => {
        if (this.inbox.marks[id]?.at !== mark.at || this.failedInstant.has(key)) return
        this.failedInstant.add(key)
        this.notify(`${id.toUpperCase()} isn't closed:  the page server didn't apply it.\nIt's back;  try again.`)
        this.changed()
      })
    }
    for (const [id, at] of this.instantMarks) {
      if (this.inbox.marks[id]?.at === at) continue
      this.instantMarks.delete(id)
      this.stopTimer(`fail:${id}`)
      if (this.undoneInstant.delete(id) || this.inbox.marks[id]) continue
      this.closedHere.set(id, now + CLOSED_HOLD_MS)
      this.later(`hold:${id}`, CLOSED_HOLD_MS, () => {
        this.closedHere.delete(id)
        this.changed()
      })
    }
  }

  /** Run `act` in `wait` ms, under `key`:  one timer per key, the last one set winning. */
  private later(key: string, wait: number, act: () => void) {
    this.stopTimer(key)
    this.instantTimers.set(
      key,
      setTimeout(
        () => {
          this.instantTimers.delete(key)
          act()
        },
        Math.max(0, wait)
      )
    )
  }

  /** Stop `later()`'s timer under `key`, if any. */
  private stopTimer(key: string) {
    const timer = this.instantTimers.get(key)
    if (timer !== undefined) clearTimeout(timer)
    this.instantTimers.delete(key)
  }

  /**
   * `id`'s box holds `text`:  when it starts with `words` (a note Claude has), let go of them (`released`), keeping
   * what comes after;  nothing after:  the box empties and closes, its backup gone.
   */
  private letGo(id: string, text: string, words: string) {
    const said = words.trim()
    const typed = text.trim()
    if (!said || !typed.startsWith(said)) return
    const rest = typed.slice(said.length).trim()
    this.released.set(id, said)
    this.backup(id, rest)
    if (rest) return void this.typed.set(id, rest)
    this.typed.delete(id)
    this.boxes.delete(id)
  }

  /**
   * The words `id`'s box let go of last (`letGo()`):  Claude has them;  `""` for none.
   * - so a box with the focus still drops them (`<epic-review>`'s `onTypedElsewhere()`)
   */
  releasedOf(id: string): string {
    return this.released.get(id) ?? ""
  }

  ////////////////
  // ## Backups
  ////////////////

  /**
   * Hand the inbox every note backup it lacks (an older page's drafts, or a save that failed),
   * then drop the backups it took:  nothing typed before this page is lost in the switch.
   * - an item gone from the page, or already holding the note:  its backup goes, quietly
   */
  async adoptBackups() {
    const backups = this.readBackups()
    for (const [id, text] of Object.entries(backups)) {
      const known =
        !!this.inbox.drafts[id] || this.inbox.marks[id]?.note === text.trim() || !(this.options.hasItem?.(id) ?? true)
      if (known || !text.trim() || (await this.write("draft", { id, action: "revisit", note: text }, { quiet: true })))
        delete backups[id]
    }
    this.writeBackups(backups)
  }

  /** Keep `text` as item `id`'s note backup in this browser;  empty drops it. */
  backup(id: string, text: string) {
    const backups = this.readBackups()
    if (text) backups[id] = text
    else delete backups[id]
    this.writeBackups(backups)
  }

  /** This page's backups, `{ [id]: text }`;  `{}` for none, or a value that isn't one. */
  readBackups(): Record<string, string> {
    const value = PrefStore.getAt(this.backupKey, this.backupsKept)
    return value && typeof value === "object" ? (value as Record<string, string>) : {}
  }

  /**
   * Save `backups`, as JSON;  none forgets the key.
   * - A browser that blocks storage keeps them for the visit.
   */
  private writeBackups(backups: Record<string, string>) {
    PrefStore.setAt(this.backupKey, Object.keys(backups).length ? backups : undefined, this.backupsKept)
  }

  /** Where the backups are kept:  `options.storage`, through `PrefStore`;  none:  this page's memory. */
  private backupsKept = new StoragePlace({
    storage: () => storageNow(this.options.storage),
    description: "this browser"
  })

  /** The page's backup key:  the old runtime's, so its backups are found. */
  private get backupKey(): string {
    return `${REVISIT_KEY_PREFIX}${this.options.page}`
  }

  ////////////////
  // ## Helpers
  ////////////////

  /**
   * The marks not sent yet, and not held for their time (a stage accept counting down:  `isHeld()`, I181).
   * - never an instant one (a ✓ or x with nothing for Claude:  `isInstant()`, epic `epic-engine` I304):  the page
   *   server applies it by itself, so Send neither counts nor carries it
   */
  private unsentMarks(): InboxMark[] {
    const now = Date.now()
    return Object.entries(this.inbox.marks)
      .filter(([id, mark]) => !this.isSent(mark) && !isHeld(mark, now) && !isInstant(id, mark))
      .map(([, mark]) => mark)
  }

  /** The urgencies not sent yet:  set after the last send. */
  private unsentUrgency(): InboxUrgency[] {
    return Object.values(this.inbox.urgency).filter(
      (entry) => !isSent({ action: "urgency", at: entry.at }, this.inbox.sent)
    )
  }

  /** Drop what was typed in `id`'s box:  its note became a mark. */
  private forgetTyped(id: string) {
    this.typed.delete(id)
    delete this.inbox.drafts[id]
    this.backup(id, "")
  }

  /** Take `id`'s immediate request off the page (its `now` entry, its work, its mark), and show it. */
  private forgetRequest(id: string) {
    this.inbox.now = this.inbox.now.filter((each) => each.id !== id)
    delete this.inbox.working[id]
    const asked = this.inbox.marks[id]
    if (asked && isImmediate(asked)) delete this.inbox.marks[id]
    this.changed()
  }

  /**
   * Show inbox `next` from now on, remembering each pick Claude took on the way (`taken`):
   * a SENT mark carrying a pick that `next` no longer has.
   * - a mark `next` has again (Owen's, or a pick taken back into a revisit) drops what was remembered for it
   */
  private replaceInbox(next: Inbox) {
    for (const [id, mark] of Object.entries(this.inbox.marks))
      if (hasPick(mark) && !next.marks[id] && this.isSent(mark)) this.taken.set(id, pickOf(mark))
    // a sent note that left (I200):  its box lets go of it (`changed()`)
    for (const [id, mark] of Object.entries(this.inbox.marks))
      if (mark.note && !next.marks[id] && this.isSent(mark)) this.goneNotes.set(id, mark.note)
    for (const id of Object.keys(next.marks)) this.taken.delete(id)
    // a Read the page server applied at once (I268):  remembered, so its line doesn't come back before the patch
    for (const [id, mark] of Object.entries(this.inbox.marks))
      if (mark.action === "seen" && id.startsWith(`${AWAY_ID}:`) && !next.marks[id]) this.readAway.add(id)
    this.inbox = next
  }

  /** Read the inbox;  true when it answered (a write in flight wins:  its answer is newer). */
  private async load(): Promise<boolean> {
    try {
      const reply = await this.link.getForPage<unknown>(`${REVIEW_API}/inbox`)
      if (reply === undefined) return false
      const read = inboxOf(reply)
      if (!this.writing) this.replaceInbox(read)
      return true
    } catch {
      return false
    }
  }

  /**
   * POST `body` (plus `page`) to `route`;  the reply is the new inbox.
   * - true when written
   * - else says why (a notice, unless `quiet`:  the caller says it, from `lastWriteError`),
   *   and re-reads the inbox, undoing what was shown early
   * - a 403 on the token:  the link takes the server's new token and tries once more (`ServerLink.post()`)
   */
  private async write(route: string, body: object, options: WriteOptions = {}): Promise<boolean> {
    return (await this.post(route, body, options)) !== undefined
  }

  /** `write()`, answering the route's whole reply (a Send's `wake` too), or `undefined` when it failed. */
  private async post(
    route: string,
    body: object,
    { quiet = false, keepalive = false }: WriteOptions = {}
  ): Promise<unknown> {
    this.writing++
    let error = ""
    try {
      const reply = await this.link.post(`${REVIEW_API}/${route}`, { page: this.options.page, ...body }, { keepalive })
      this.replaceInbox(inboxOf(reply))
      this.changed()
      return reply ?? {}
    } catch (failure) {
      error = (failure as Error).message
    } finally {
      this.writing--
    }
    this.lastWriteError = error
    if (!quiet) this.notify(sentence(error))
    await this.load()
    this.changed()
    return undefined
  }
}

/**
 * The note marks typing in the note box keeps as they are, changing only their words (`typedMark()`):
 * Make Todo, the x (`skip`), a todo's plane (`next`) and its x (`drop`).
 * - A revisit's words change too, as a revisit to talk over.
 */
const TYPED_KEEPS: ReadonlySet<string> = new Set(["todo", "skip", "next", "drop"])

/**
 * The note box's marks (epic `epic-engine` P51):  what a picture pasted in the box joins, rather than making a revisit.
 */
const NOTE_MARKS: ReadonlySet<string> = new Set(["revisit", "todo", "skip", "next", "drop"])

/**
 * What `changeSet()` says when the page server kept less of a set's change than was sent (epic `epic-engine` I178):
 * its code is older than the page's, and `spell server start` restarts a server older than its code.
 */
const OLD_SERVER =
  "The page server is older than this page and didn't keep that change:  restart it (`spell server start`), then try again."

/** `mark` as a mark to save again:  its own fields, without the stamp. */
function stripped({ at: _at, ...mark }: InboxMark): MarkInput {
  return mark
}

/**
 * The marks that carry a pick beside their own action, so his thumbs up and a pick in the Choices are ONE mark
 * (epic `epic-engine` I217):  a revisit ("pick B, but ..."), an Approve, a phase's Do this (`todo`).
 */
const CARRIES_PICK: ReadonlySet<string> = new Set(["revisit", "approve", "todo"])

/** `mark`'s pick, when its action carries one (`CARRIES_PICK`);  else `{}`. */
function carriedPickOf(mark: InboxMark | undefined): PickFields {
  return mark && CARRIES_PICK.has(mark.action) ? pickOf(mark) : {}
}

/** Does a pick in the Choices keep `mark`'s own action, an Approve or a Do this not asked now (I217)? */
function keepsAction(mark: InboxMark | undefined): boolean {
  return !!mark && (mark.action === "approve" || mark.action === "todo") && !isImmediate(mark)
}

/** `mark` without its time or its set change:  what stays as a pick changes beside it. */
function withoutPick(mark: InboxMark): MarkInput {
  const {
    at: _at,
    pick: _pick,
    choices: _choices,
    multiple: _multiple,
    added: _added,
    edited: _edited,
    removed: _removed,
    sets: _sets,
    ...rest
  } = mark
  return rest
}

/** The summary's tag:  how the page finds it, having no id. */
const SUMMARY_TAG = "epic-summary"

/** `marks` marks and `comments` comments, in words:  `2 marks, 1 comment`;  either left out at 0. */
function countWords(marks: number, comments: number): string {
  const counted = [
    marks ? `${marks} mark${marks === 1 ? "" : "s"}` : "",
    comments ? `${comments} comment${comments === 1 ? "" : "s"}` : ""
  ]
  return counted.filter(Boolean).join(", ")
}

/** A new item key's number:  `new12` -> 12, for their order. */
function newNumber(id: string): number {
  return Number(id.replace(/^\D+/, "")) || 0
}

/** How many of his instant marks Cmd-Z can walk back through (`undoLast()`, epic `epic-engine` T80). */
const UNDO_KEPT = 20

/** How long items let go at his Send stay drawn closing, so their section folds them away as they hide (ms). */
const RELEASE_FOLD_MS = 2000

/** What an instant mark did, for Cmd-Z's notice:  "Undid:  closed I57". */
const UNDONE_WORDS: Record<string, string> = {
  approve: "accepted",
  drop: "closed",
  skip: "closed",
  seen: "saw"
}

/** How long `showAgain()` waits for an undone item to unfold before scrolling to it (ms):  a fold's 200ms, and a frame. */
const UNFOLD_WAIT_MS = 260

/** Is `event` Cmd-Z (Ctrl-Z off a Mac):  undo, not redo (no Shift), no Alt? */
function isUndoKey(event: KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "z"
}

/** Is `event` typed into a text field (an input, a textarea, editable text), through shadow roots? */
function isTyping(event: KeyboardEvent): boolean {
  const target = event.composedPath()[0]
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || target.localName === "textarea" || target.localName === "input"
}
