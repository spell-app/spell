// Import directly:  the persist barrel would bring the database and server places too
import { PrefStore } from "spell/util/persist/PrefStore"
import { StoragePlace } from "spell/util/persist/StoragePlace"
import {
  REVIEW_ACTIONS,
  REVIEW_API,
  REVISIT_KEY_PREFIX,
  NOBODY_LISTENING,
  SUMMARY_ID,
  TESTS_API,
  TEST_RESULTS,
  commentsOf,
  emptyInbox,
  inboxOf,
  inlineCommentsNote,
  isAnchoredIn,
  isImmediate,
  isSent,
  pickOf,
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
  type ReviewClientOptions,
  type Running,
  type StartAnswer,
  type TestAnswer,
  type TestResult,
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
   * - one when the page server says the inbox file changed (`spell-server:changed`, the page's live client:
   *   never a connection of our own, each holds one of Chrome's 6 per host)
   */
  watch(window: Window): () => void {
    const inboxFile = this.link.file.replace(/(?:\.plan|\.saga)?\.html$/, ".inbox.json5")
    return ServerLink.watch(window, inboxFile, () => void this.refresh())
  }

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
    if (work) return { action: work.action === "revisit" ? "revisit" : "details", queued: false }
    const entry = this.inbox.now.find((each) => each.id === id)
    if (!this.asking.has(id) && !entry) return null
    const action = entry?.action ?? (this.inbox.marks[id]?.action === "revisit" ? "revisit" : "details")
    return { action, queued: !this.asking.has(id) && !this.inbox.listening }
  }

  /**
   * The review button whose work on item `id` is on its way or under way
   * (it spins;  a click calls it off);  else `null`.
   * - the mark's own button (Approve, Make Todo, Revisit:  Claude took a sent mark)
   * - else Do Now (`details`:  Add Details, a revisit now)
   */
  busyButtonOf(id: string): ReviewAction | null {
    if (!this.runningOf(id)) return null
    const mark = this.inbox.marks[id]
    const own = mark && !isImmediate(mark) && REVIEW_ACTIONS.find((action) => action === mark.action)
    return own || "details"
  }

  /** Has Claude taken item `id`'s request (`working`), rather than it waiting to be taken? */
  isWorkedOn(id: string): boolean {
    return !!this.inbox.working[id]
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

  /** How many marks and urgencies wait for "Send to Claude". */
  get unsentMarkCount(): number {
    return this.unsentMarks().length + this.unsentUrgency().length
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
   *   a revisit carrying a pick keeps the pick ("pick B, but ..." without the "but")
   * - else:
   *   - Approve and Make Todo mark it
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
    if (action === "details") {
      const note = this.typedOf(id).trim()
      void (note ? this.useNote(id, "now", note) : this.askNow(id, "details"))
      return "chosen"
    }
    if (mark?.action === action && !isImmediate(mark)) {
      const pick = action === "revisit" ? pickOf(mark) : {}
      return void this.save(id, pick.pick ? { action: "pick", ...pick } : null)
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
    void this.save(id, { action })
    return "chosen"
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
   * Pick option `letter` of card set `choices` on `id` (`null`:  drop the pick):  a "Choose" pill (P10).
   * - `choices`:  which of the item's `<epic-choices>` the option is in, by position
   *   (I8:  its text's, a reply's ...);  none, its own
   * - a revisit keeps its note:  "pick B, but ..."
   *   - one asked NOW turns `soon`, so the pick waits for the send with it
   *     (an immediate mark counts as sent:  Claude would never see the new pick)
   * - anything else becomes a plain pick, or none
   */
  choose(id: string, letter: string | null, choices?: number): Promise<boolean> {
    const mark = this.inbox.marks[id]
    const pick = letter ? { pick: letter, ...(choices !== undefined && { choices }) } : {}
    if (mark?.action !== "revisit") return this.save(id, letter ? { action: "pick", ...pick } : null)
    return this.save(id, { action: "revisit", when: "soon", note: mark.note ?? "", ...pick })
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
  // ## Test runs (epic `epic-engine` P4)
  ////////////////

  /** Test `id`'s answer in a run (its `test` mark), if any. */
  testAnswerOf(id: string): TestAnswer | undefined {
    const mark = this.inbox.marks[id]
    if (mark?.action !== TEST_ACTION || !isTestResult(mark.result)) return undefined
    return { result: mark.result, ...(mark.note && { note: mark.note }), ...(mark.shot && { shot: mark.shot }) }
  }

  /**
   * Answer test `id` (`{ action: "test", result, note?, shot? }`):  shown at once, then saved, as every mark;
   * true when saved.
   */
  answerTest(id: string, answer: TestAnswer): Promise<boolean> {
    return this.save(id, { action: TEST_ACTION, ...answer })
  }

  /**
   * Save `png` (a data URL) as test `id`'s screenshot (`POST shot`);  its path from the epic's folder, as the route
   * answers it (`tests/v3-20261019-1432.png`), or `undefined` when it failed (a notice says why).
   * - its answer is the path, not the inbox:  the caller puts it in the test's mark (`answerTest()`)
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
    if (how !== "soon") return this.save(id, { action: how, note })
    const mark = this.inbox.marks[id]
    return this.save(id, { action: "revisit", when: "soon", note, ...pickOf(mark), ...commentsOf(mark) })
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
   * - `"draft"`:  saved as the box's draft instead, as before P20:
   *   a request at work (Do Now, a revisit now), or an empty box with no revisit
   */
  typedMark(id: string, text: string): MarkInput | null | "draft" {
    const mark = this.inbox.marks[id]
    const note = text.trim()
    if (mark && isImmediate(mark)) return "draft"
    if (!note) {
      if (mark?.action !== "revisit") return "draft"
      const pick = pickOf(mark)
      return pick.pick ? { action: "pick", ...pick } : null
    }
    if (mark && TYPED_KEEPS.has(mark.action)) return { action: mark.action, note }
    // his comments in its text stay its content (I140)
    return { action: "revisit", when: "soon", note, ...pickOf(mark), ...commentsOf(mark) }
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
    if (mark) this.inbox.marks[id] = { ...mark, at: new Date().toISOString() }
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
    const marks = Object.values(this.inbox.marks)
    const waiting = [
      ...(now ? marks.filter((mark) => !isImmediate(mark)) : this.unsentMarks()),
      ...this.unsentUrgency()
    ]
    const comments = this.unsentCommentCount
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

  /** The marks not sent yet. */
  private unsentMarks(): InboxMark[] {
    return Object.values(this.inbox.marks).filter((mark) => !this.isSent(mark))
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
      if (mark.pick && !next.marks[id] && this.isSent(mark)) this.taken.set(id, pickOf(mark))
    for (const id of Object.keys(next.marks)) this.taken.delete(id)
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

/** A test answer's action (epic `epic-engine` P4). */
const TEST_ACTION = "test"

/**
 * The note marks typing in the note box keeps as they are, changing only their words (`typedMark()`):
 * Make Todo, the x (`skip`), a todo's plane (`next`) and its x (`drop`).
 * - A revisit's words change too, as a revisit to talk over.
 */
const TYPED_KEEPS: ReadonlySet<string> = new Set(["todo", "skip", "next", "drop"])

/** Is `result` one of a test's four answers? */
function isTestResult(result: unknown): result is TestResult {
  return (TEST_RESULTS as readonly unknown[]).includes(result)
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
