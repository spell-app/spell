import { PlanDates } from "spell-epic/dates"
import { ServerLink, clockOf, sentence, type ServerLinkOptions, type StorageFinder } from "spell-epic/review"

import { AnswerDraft } from "./AnswerDraft"
import { DraftSaver } from "./DraftSaver"
import {
  DETAILS_API,
  DETAILS_DRAFT_API,
  DETAILS_LISTEN_POLL_MS,
  DETAILS_LISTENING_API,
  DETAILS_PAGE,
  DETAILS_SAVE_MS,
  DETAILS_SETTLE_MS,
  DRAFT_KEY_PREFIX,
  type AnswerListener,
  type AnswerPart,
  type AskPart,
  type DetailsDraft,
  type KeptText,
  type ListenLine,
  type PageAnswer,
  type PartLabels,
  type SendFill,
  type SentAnswer,
  type TypedAnswer
} from "./answers.types"

/** What an `AnswerForm` is made from:  its link's facts, and the browser's storage for the draft's own copy. */
export type AnswerFormOptions = ServerLinkOptions & {
  /**
   * `localStorage`, or what finds it;  `null` or none:  no copy in the browser (private window, tests)
   * - a finder that throws (blocked site data):  this page's memory (`StoragePlace`)
   */
  storage?: StorageFinder
}

/****************
 * ### `AnswerForm`
 * A DETAILS PAGE's answer, as its elements hold it (epic `epic-workflow` P12):
 * what Owen picked and wrote, what was sent, and the sending.
 * - One per page (`forPage()`).
 * - The elements that hold part of the answer register while connected (`add()`):
 *   - each question, `<epic-ask>`:  its picks, "Provide more details"
 *   - each box, `<epic-text-box>`:  Other, a comment (on a section, on an option), the page's notes
 * - `<epic-send>` draws it:  where the answer stands ("Not sent", "Sent 10/8/26 14:34 · 5 of 17 decided"),
 *   Send's fill, the draft's save, and why a send failed.
 * - Sending:  `POST /api/docs/details/answer` (`src/tools/detailsRoutes.ts`), which writes `<slug>.answer.json5`
 *   beside the page, and wakes the waiting session (`epic ask wait`).
 *   - through a `ServerLink`, as the epic page's clients write:  the token, and its one refresh after a restart
 *   - NEVER locks (Owen, 2026-10-08):  a partial answer is fine, everything stays editable, and every Send sends the
 *     whole page again (the route marks what changed since the send before)
 * - On load (`load()`), `GET` reads the answer already sent, and every part shows its share of it.
 *   A part that connects later gets it as it registers.
 * - WHO HEARS a Send (epic `epic-engine` r6):  `listening`, the session waiting for the answer (`epic ask wait`),
 *   read with the answer on load, asked again every `DETAILS_LISTEN_POLL_MS` while the page is in view (`watch()`),
 *   and answered by each send;  `<epic-send>` says it (`listenLine`).  Nobody waiting:  Send still saves the answer,
 *   and says so (`notice`):  the next `ask wait` or `ask answer` reads it.
 * - Keeps a DRAFT of what's typed and not sent (P18:  agents rewrote a page under Owen, and lost what he typed):
 *   - every change Owen makes (`edited()`) goes into `typed` at once:  the page as he left it
 *   - a copy goes into the browser's storage at once, and to the page server as he types:
 *     `DETAILS_SAVE_MS` (half a second) after a change, and as the page goes away (`watch()`)
 *     - the server's copy:  `POST /api/docs/details/draft`, which writes `<slug>.draft.json5`
 *   - saved by the page's `DraftSaver` (epic `coherence` C10):  one save at a time, a failure said in red and tried
 *     again every 3s until one goes through (a page server back on its address takes it, with its new token)
 *   - the draft wakes nobody:  only Send does;  Send deletes it
 *   - on load, the newest draft newer than the answer (the server's, else the browser's) goes back into the parts,
 *     by id, over the answer sent (`AnswerDraft.over()`):  "Changes not sent"
 *   - an agent's rewrite patched IN PLACE replaces the questions that changed:
 *     a part that joins while there's a draft shows the draft's share, not the answer's
 *   - what was typed for a question, option or section that's gone from the page is KEPT,
 *     shown in its own box (the notes box draws it) and sent with the rest
 *     - kept by `settle()`, a moment after a part leaves, and after load
 *     - a part that comes back later than that moment takes its text back out of the kept box (`takeBack()`, I9)
 *   - only on a details page (`DETAILS_PAGE`):  an element's docs page keeps nothing
 * - Node-safe at import:  no `window` / `document` touched until `forPage()` or `watch()`;
 *   `fetch` and the storage come in through `AnswerFormOptions`, so tests stub them.
 * - Position in the import graph:  `spell-epic/review` (the link), `spell-epic/dates`, its peers.
 *   NEVER imports Solid or Spell UI:  the elements bridge its changes (`subscribe()`) into their own state.
 ****************/
export class AnswerForm {
  /** The answer as last sent (or read back on load);  `undefined` before the first send. */
  sent: SentAnswer | undefined

  /** Why the last send failed, as a sentence;  `""` for none. */
  error = ""

  /** A send on its way. */
  isSending = false

  /** Bumped on every change:  readers compare it, `<epic-send>` tracks it. */
  version = 0

  /**
   * Text typed for questions, options or sections gone from the page (an agent's rewrite):  shown in its own box,
   * sent with the rest, until Owen drops it (`dropKept()`).
   */
  kept: KeptText[] = []

  /**
   * The page as Owen left it, by id, since he last changed it (or since a draft came back);
   * `undefined` with nothing typed since the last send.
   * - holds what a part that just left had, until `settle()` keeps it
   */
  typed: TypedAnswer | undefined

  /**
   * The session waiting for the answer (`epic ask wait`);  `null` for none;  `undefined` while unknown (not asked
   * yet, no page server, not a details page).
   */
  listening: AnswerListener | null | undefined

  /** What the last send did, when nobody was waiting for it:  saved for the next look;  `""` otherwise. */
  notice = ""

  /** The page as last sent (`snapshot()`), to tell "Changes not sent";  `null` before the first send. */
  private sentSnapshot: string | null = null

  /** The parts, as registered. */
  private readonly parts = new Set<AnswerPart>()

  /** Called on every change. */
  private readonly listeners = new Set<() => void>()

  /** The page server, as answers are sent to it:  the write token, its refresh. */
  private readonly link: ServerLink

  /** `load()`'s promise:  one load per form. */
  private loading: Promise<void> | undefined

  /** The draft's saves, its browser copy (`DRAFT_KEY_PREFIX` + the page's path) and where it stands. */
  private readonly drafts: DraftSaver

  /** `settle()` waiting for the parts of a rewrite to join. */
  private settleTimer: ReturnType<typeof setTimeout> | undefined

  /**
   * The page as typed just before each `settle()` that kept something, laid over the last:
   * each kept text's own value, to move back into a part slower than the settle (`takeBack()`, I9).
   */
  private settledAway: TypedAnswer | undefined

  constructor(private readonly options: AnswerFormOptions) {
    this.link = new ServerLink(options)
    this.drafts = new DraftSaver({
      save: (save) => this.postDraft(save),
      wait: DETAILS_SAVE_MS,
      key: `${DRAFT_KEY_PREFIX}${options.page}`,
      storage: options.storage,
      link: this.link,
      onChange: () => this.changed()
    })
  }

  ////////////////
  // ## The page's form
  ////////////////

  /** The page's form, once made. */
  private static current: AnswerForm | undefined

  /** The page's form, made on the first call (browser only). */
  static forPage(): AnswerForm {
    // a browser that blocks it throws here:  `StoragePlace` keeps the draft's copy in memory then
    AnswerForm.current ??= new AnswerForm({ ...ServerLink.pageOptions(), storage: () => window.localStorage })
    return AnswerForm.current
  }

  /** Make `form` the page's from now on (`undefined`:  the next `forPage()` makes one):  tests. */
  static adopt(form: AnswerForm | undefined) {
    AnswerForm.current = form
  }

  ////////////////
  // ## Parts
  ////////////////

  /**
   * Register `part` while it's connected;  returns the undo.
   * - the answer already read back (or a draft over it):  it shows its share at once,
   *   and the page counts as sent still, unless it had changes before
   * - text kept from its ids (it came back later than `settle()` waited):
   *   moved back into it, out of the kept box (`takeBack()`, I9)
   * - the undo, with a draft:  what it held is kept if it doesn't come back (`settle()`)
   */
  add(part: AnswerPart): () => void {
    this.parts.add(part)
    const isTakenBack = this.takeBack(part)
    const shown = this.shown
    if (shown) {
      const wasPending = this.isPending
      part.showAnswer(shown)
      if (!wasPending && this.sent && !isTakenBack) this.sentSnapshot = this.snapshot()
    }
    if (isTakenBack) {
      this.writeLocal()
      this.saveSoon()
    }
    this.changed()
    return () => {
      this.parts.delete(part)
      if (this.typed) this.settleSoon()
      this.changed()
    }
  }

  /**
   * Move the text `settle()` kept for `part`'s ids back into the draft (`AnswerDraft.restore()`), out of the kept
   * box:  `part` joined later than the settle waited for (`DETAILS_SETTLE_MS`), and would show it twice (I9).
   * Did it move any?
   */
  private takeBack(part: AnswerPart): boolean {
    if (!this.typed || !this.settledAway || !this.kept.length) return false
    const present: PartLabels = {}
    part.labelsInto(present)
    const { typed, kept } = AnswerDraft.restore(this.typed, this.kept, present, this.settledAway)
    if (kept.length === this.kept.length) return false
    this.typed = typed
    this.kept = kept
    return true
  }

  /** Something on the page changed:  everyone listening hears it. */
  changed() {
    this.version++
    for (const listener of this.listeners) listener()
  }

  /**
   * Owen changed something (a pick, a box):  everyone hears it, and on a details page the draft follows:
   * `typed` at once, the browser's copy at once, the page server's a moment later.
   */
  edited() {
    if (this.keepsDrafts) {
      this.typed = AnswerDraft.over(this.typed ?? EMPTY, this.current())
      this.writeLocal()
      this.saveSoon()
    }
    this.changed()
  }

  /** Call `listener` on every change;  returns the undo. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** The questions, in page order. */
  get asks(): AskPart[] {
    return this.inPageOrder().filter((part): part is AskPart => "askState" in part)
  }

  /** How many questions are decided (anything but `attention`), of how many. */
  get decided(): { decided: number; total: number } {
    const asks = this.asks
    return { decided: asks.filter((ask) => ask.askState !== "attention").length, total: asks.length }
  }

  ////////////////
  // ## The answer
  ////////////////

  /**
   * What the page holds now, as the route takes it, its keys sorted:
   * the same page gathers the same, whatever order its parts registered in.
   * - `kept`, when there is any
   */
  gather(): PageAnswer {
    const page: PageAnswer = { answers: {}, comments: {}, notes: "" }
    for (const part of this.inPageOrder()) part.gatherInto(page)
    const gathered: PageAnswer = { answers: sorted(page.answers), comments: sorted(page.comments), notes: page.notes }
    if (this.kept.length) gathered.kept = this.kept.map((each) => ({ ...each }))
    return gathered
  }

  /** The ids the page's parts hold answers under, with their titles (`PartLabels`). */
  labels(): PartLabels {
    const labels: PartLabels = {}
    for (const part of this.inPageOrder()) part.labelsInto(labels)
    return labels
  }

  /** `gather()` as one string, to compare with what was sent. */
  snapshot(): string {
    return JSON.stringify(this.gather())
  }

  /** Nothing on the page:  no pick, Other, comment, note or kept text. */
  get isEmpty(): boolean {
    const { answers, comments, notes, kept } = this.gather()
    const picked = Object.values(answers).some((each) => each.picked.length || each.other)
    return !picked && !notes && !Object.keys(comments).length && !kept?.length
  }

  /** Something not sent:  the page differs from the send (never sent:  anything on it). */
  get isPending(): boolean {
    return this.sentSnapshot === null ? !this.isEmpty : this.snapshot() !== this.sentSnapshot
  }

  /** Where the answer stands, for Send's fill (`SendFill`). */
  get fill(): SendFill {
    return this.isPending ? "pending" : this.sent ? "sent" : "rest"
  }

  /**
   * The words beside Send, and their colour:
   * - "Not sent" (grey, nothing on the page;  blue, something on it)
   * - "Changes not sent" (blue)
   * - "Sent 10/8/26 14:34 · 5 of 17 decided" (green)
   */
  get stateLine(): { text: string; color: "grey" | "blue" | "green" } {
    if (this.isPending) return { text: this.sent ? "Changes not sent" : "Not sent", color: "blue" }
    if (!this.sent) return { text: "Not sent", color: "grey" }
    const { decided, total } = this.decided
    const when = PlanDates.formatDate(new Date(this.sent.answered))
    // a page of comment boxes alone has no question to count
    const count = total ? ` · ${decided} of ${total} decided` : ""
    return { text: `Sent ${when}${count}`, color: "green" }
  }

  /**
   * Who hears a Send, for `<epic-send>` (`ListenLine`):  "repo-split is listening" (a session's `epic ask wait`), or
   * "nobody is waiting yet";  nothing where the page can't tell.
   */
  get listenLine(): ListenLine {
    if (this.listening === undefined) return { text: "", title: "", isListening: false }
    const who = epicOf(this.options.page) ?? "Claude"
    if (this.listening)
      return {
        text: `${who} is listening`,
        title: `A session is waiting for this page's answer (epic ask wait, since ${clockOf(this.listening.since)}):  Send wakes it`,
        isListening: true
      }
    return {
      text: "nobody is waiting yet",
      title:
        "No session is waiting for this page's answer (epic ask wait).  Send still saves it:  Claude reads it when it next looks.",
      isListening: false
    }
  }

  /** Drop `item` from the kept text (Owen's ×):  a change like any other, so the draft follows. */
  dropKept(item: KeptText) {
    this.kept = this.kept.filter((each) => each !== item)
    if (this.typed) this.typed = { ...this.typed, kept: [...this.kept] }
    this.edited()
  }

  ////////////////
  // ## Sending
  ////////////////

  /**
   * Send the whole page;  it stays as it is, editable.
   * - refused (the reason in `error`):  nothing on a page never sent, no page server
   * - sent:  the draft is done with (the route deletes its file;  the browser's copy goes too)
   * - NEVER throws:  a failure is `error`, said for people
   */
  async send(): Promise<void> {
    if (this.isSending) return
    if (!this.sent && this.isEmpty)
      return this.fail("Pick an option, or write something (Other, a comment, a note) first.")
    if (!this.link.isServed)
      return this.fail("This page isn't on the page server, so it can't send:  answer in chat instead.")
    this.isSending = true
    this.error = ""
    this.notice = ""
    this.changed()
    try {
      const page = this.gather()
      const reply = (await this.link.post(DETAILS_API, { page: this.options.page, ...page })) as {
        answer?: SentAnswer
        listening?: AnswerListener | null
      }
      this.sent = reply.answer
      this.sentSnapshot = this.snapshot()
      this.draftDone()
      // a page server from before r6 answers no `listening`:  it can't tell
      if (reply.listening !== undefined) this.listening = reply.listening
      if (reply.listening === null) this.notice = NOBODY_NOTICE
    } catch (failure) {
      this.error = `${sentence((failure as Error).message)}  Send again, or answer in chat instead.`
    } finally {
      this.isSending = false
      this.changed()
    }
  }

  /**
   * Read back the answer already sent (`<slug>.answer.json5`, through the route), and show it in every part;
   * then the newest draft newer than it (the server's `<slug>.draft.json5`, or the browser's copy) over it.
   * - once per form;  nothing off a details page (`DETAILS_PAGE`:  an element's docs page, say)
   * - from `file://`, or without a page server:  only the browser's copy
   * - NEVER throws:  no answer, or no route, shows nothing
   */
  load(): Promise<void> {
    this.loading ??= this.read()
    return this.loading
  }

  /** `load()`'s work. */
  private async read() {
    if (!this.keepsDrafts) return
    const [reply, draft] = await Promise.all([
      this.fetchReply<{ answer?: SentAnswer | null; listening?: AnswerListener | null }>(DETAILS_API),
      this.fetchJson<DetailsDraft>(DETAILS_DRAFT_API, "draft")
    ])
    const answer = reply?.answer ?? undefined
    if (reply && reply.listening !== undefined) this.listening = reply.listening
    if (answer) {
      this.sent = answer
      this.kept = answer.kept ?? []
      for (const part of this.parts) part.showAnswer(answer)
      this.sentSnapshot = this.snapshot()
    }
    const local = this.readLocal()
    const newest = AnswerDraft.newest([draft, local], answer)
    if (newest) this.putBack(newest, { isSaved: newest === draft })
    this.changed()
  }

  /**
   * Put `draft` back into the parts, over the answer sent;  then keep what was typed for ids gone from the page.
   * - `isSaved`:  the page server has it;  else (the browser's copy) it's saved there once more
   */
  private putBack(draft: DetailsDraft, { isSaved }: { isSaved: boolean }) {
    const { answers, comments, notes, labels, kept } = draft
    this.typed = { answers, comments, notes, labels, ...(kept?.length ? { kept } : {}) }
    this.kept = kept ?? []
    const shown = this.shown!
    for (const part of this.parts) part.showAnswer(shown)
    this.drafts.tell(`draft from ${clockOf(draft.saved)} put back`)
    if (!isSaved) this.saveSoon()
    this.settleSoon()
  }

  /**
   * Ask again who is waiting for the answer (`DETAILS_LISTENING_API`);  a change redraws.
   * - a session that started waiting clears the "nobody is waiting" notice:  it reads the answer saved
   * - NEVER throws:  no answer leaves it as it was
   */
  async refreshListening(): Promise<void> {
    if (!this.keepsDrafts) return
    const reply = await this.fetchReply<{ listening?: AnswerListener | null }>(DETAILS_LISTENING_API)
    if (!reply || reply.listening === undefined) return
    const before = JSON.stringify(this.listening ?? null)
    this.listening = reply.listening
    if (this.listening) this.notice = ""
    if (JSON.stringify(this.listening) !== before) this.changed()
  }

  /** Say why it can't send. */
  private fail(message: string) {
    this.error = message
    this.changed()
  }

  /** The parts, in page order. */
  private inPageOrder(): AnswerPart[] {
    return [...this.parts].sort((one, other) => pageOrder(one.domElement, other.domElement))
  }

  ////////////////
  // ## The draft
  ////////////////

  /** Does this page keep drafts:  a details page (`DETAILS_PAGE`), not an element's docs page? */
  get keepsDrafts(): boolean {
    return DETAILS_PAGE.test(this.options.page)
  }

  /**
   * What each part shows:  the answer sent, with `typed` laid over it when there is one.
   * - `undefined` before either.
   */
  get shown(): SentAnswer | undefined {
    if (!this.typed) return this.sent
    const view = AnswerDraft.over(this.sent ?? EMPTY, this.typed)
    return { page: this.options.page, answered: this.sent?.answered ?? "", changes: this.sent?.changes ?? 0, ...view }
  }

  /**
   * Keep what was typed for ids gone from the page (`AnswerDraft.settle()`):  the kept box shows it, the draft
   * and the next Send carry it.
   * - a part that shows a pick of an option now gone is told again, without it
   * - nothing typed (`typed`):  nothing to keep
   */
  settle() {
    if (this.settleTimer) clearTimeout(this.settleTimer)
    if (!this.typed) return
    const before = AnswerDraft.over(this.typed, this.current())
    const { typed, kept } = AnswerDraft.settle(before, this.labels(), this.sent)
    const isMoved = kept.length !== this.kept.length || JSON.stringify(typed.answers) !== JSON.stringify(before.answers)
    this.typed = typed
    if (!isMoved) return
    this.settledAway = this.settledAway ? AnswerDraft.over(this.settledAway, before) : before
    this.kept = kept
    const shown = this.shown!
    for (const part of this.parts) part.showAnswer(shown)
    this.writeLocal()
    this.saveSoon()
    this.changed()
  }

  /** The draft's save:  `saved 14:04`, `saving…`, or why it can't be (`isDraftError`):  `DraftSaver.text`. */
  get draftText(): string {
    return this.drafts.text
  }

  /** The draft's last save failed, or can't be made:  `draftText` says why. */
  get isDraftError(): boolean {
    return this.drafts.isError
  }

  /**
   * Save the draft to the page server now, if anything changed since the last save;  after any save on its way.
   * - `keepalive`:  the page is going away;  the request outlives it
   * - NEVER throws:  a failure shows in `draftText`, in red (the browser's copy still has it),
   *   and it tries again in 3s (`DraftSaver`)
   */
  async saveDraft({ keepalive = false }: { keepalive?: boolean } = {}): Promise<void> {
    await this.drafts.save({ keepalive })
  }

  /** `DraftSaver`'s save:  the draft as it stands to the page server;  when it was saved. */
  private async postDraft({ keepalive }: { keepalive: boolean }): Promise<string> {
    // the server stamps it `saved`
    const { page, answers, comments, notes, labels, kept } = this.draftNow()
    this.writeLocal()
    const body = { page, answers, comments, notes, labels, kept: kept ?? [] }
    const reply = (await this.link.post(DETAILS_DRAFT_API, body, { keepalive })) as { draft: DetailsDraft }
    return reply.draft.saved
  }

  /**
   * On `window`'s page:  save the draft as the page goes away (`pagehide`, or the page hidden), and ask who is
   * waiting while it's in view (every `DETAILS_LISTEN_POLL_MS`, and as it comes back:  a wait that ends announces
   * nothing);  returns the undo.
   * - SIDE EFFECT:  listens on `window` and its document until undone
   */
  watch(window: Window): () => void {
    const unsave = this.drafts.watch(window)
    const unpoll = ServerLink.watch(window, undefined, () => void this.refreshListening(), {
      every: DETAILS_LISTEN_POLL_MS
    })
    return () => {
      unsave()
      unpoll()
      if (this.settleTimer) clearTimeout(this.settleTimer)
    }
  }

  /** The page as it is now, with the ids it's under. */
  private current(): TypedAnswer {
    return { ...this.gather(), labels: this.labels() }
  }

  /** The draft as it stands:  `typed`, with the page as it is now laid over it. */
  private draftNow(): DetailsDraft {
    const typed = AnswerDraft.over(this.typed ?? EMPTY, this.current())
    return { page: this.options.page, saved: new Date().toISOString(), ...typed }
  }

  /** Save the draft `DETAILS_SAVE_MS` after the last change (a details page only). */
  private saveSoon() {
    if (this.keepsDrafts) this.drafts.changed()
  }

  /** `settle()` once the parts of a rewrite have joined (`DETAILS_SETTLE_MS`). */
  private settleSoon() {
    if (this.settleTimer) clearTimeout(this.settleTimer)
    this.settleTimer = setTimeout(() => this.settle(), DETAILS_SETTLE_MS)
  }

  /** Sent:  the draft is done with;  nothing to save, and the browser's copy goes. */
  private draftDone() {
    this.typed = undefined
    this.drafts.done()
  }

  /** Write the draft to the browser's copy, at once. */
  private writeLocal() {
    this.drafts.keep(this.draftNow())
  }

  /** The browser's copy of the draft, or `undefined` (none, or not a draft). */
  private readLocal(): DetailsDraft | undefined {
    const draft = this.drafts.kept<DetailsDraft>()
    return draft && typeof draft.saved === "string" && draft.answers && draft.labels ? draft : undefined
  }

  /**
   * `GET <api>?page=` for this page:  the reply's `what`, or `undefined` (none, no route, no page server).
   * - NEVER throws
   */
  private async fetchJson<T>(api: string, what: string): Promise<T | undefined> {
    return (await this.fetchReply<Record<string, T | null>>(api))?.[what] ?? undefined
  }

  /**
   * `GET <api>?page=` for this page:  the whole reply, or `undefined` (no route, no page server, a failure).
   * - NEVER throws
   */
  private fetchReply<T>(api: string): Promise<T | undefined> {
    return this.link.getForPage<T>(api).catch(() => undefined)
  }
}

////////////////
// ## Helpers
////////////////

/** What a send says when nobody was waiting for it (`notice`):  saved all the same, for the next look. */
const NOBODY_NOTICE = "Saved:  nobody is waiting yet;  Claude reads it when it next looks."

/** The epic a details page belongs to, from its path (`/epics/<name>/details/x.html`);  `undefined` for a scratch one. */
function epicOf(page: string): string | undefined {
  return /\/epics\/([^/]+)\/details\/[^/]+\.html$/.exec(page)?.[1]
}

/** A page with nothing on it:  what a first change is laid over. */
const EMPTY: TypedAnswer = { answers: {}, comments: {}, notes: "", labels: {} }

/** `record` with its keys sorted. */
function sorted<T>(record: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(record).sort(([one], [other]) => (one < other ? -1 : one > other ? 1 : 0)))
}

/**
 * `one` before `other` in the page (negative), after (positive), or neither (0).
 * - across shadow roots too:  a box drawn inside a question's shadow root counts as where its question is
 */
function pageOrder(one: Element, other: Element): number {
  const position = hostOf(one).compareDocumentPosition(hostOf(other))
  if (position & 4 /* FOLLOWING */) return -1
  if (position & 2 /* PRECEDING */) return 1
  return 0
}

/** `element`, or the outermost host it's drawn inside, as the page's light DOM has it. */
function hostOf(element: Element): Element {
  let at = element
  for (let root = at.getRootNode(); "host" in root; root = at.getRootNode()) at = (root as ShadowRoot).host
  return at
}
