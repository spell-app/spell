import { isServer } from "@solidjs/web"

import { E } from "spell/element"

import {
  NOTICE_MS,
  PageNotices,
  ReviewClient,
  isImmediate,
  isSent,
  type InboxDraft,
  type InboxMark,
  type NewItem,
  type NewKind,
  type PickFields,
  type ReviewAction,
  type Running
} from "spell/epic/review"

import { NO_LIVE_REVIEW, type LiveReview } from "spell/epic/components/epic-item/EpicItem.types"

import { PAGE_TAG, REVIEWING, type ReviewFill } from "./EpicReview.types"

/****************
 * ### `ReviewState`
 * One element's view of the page's review inbox (`ReviewClient.forPage()`).
 * - Who has one:
 *   - `<epic-review>` (the review controls)
 *   - the elements that draw them, for their chips and where they show:
 *     `<epic-item>`, an Overview `<epic-section>`, an `<epic-phase>`, `<epic-summary>`
 *   - the page's own elements, for their new items (epic `airplane` P2):
 *     `<epic-page>`, `<epic-new-item>`, the Todos and Questions sections
 * - its reads are TRACKED:
 *   a counter `Cell` bumped on every change the client reports, so the element's controls redraw
 * - `connect()` while the element is connected (it returns the undo):
 *   the client is plain code, and a kept-alive element that's gone must stop listening
 * - the page's side, once per page (`watchPage()`):
 *   - `<epic-page reviewing>` while reviewed
 *   - the notice at the bottom of the window, in the page's one stack (`PageNotices`),
 *     for what can't be said on an item (a failed save, nobody listening)
 * - MUST be created under the element's owner (a field initializer):  it creates a signal
 * - Server render:  no client, never reviewing
 ****************/
export class ReviewState {
  /** The page's client;  none in a server render. */
  readonly client: ReviewClient | undefined = isServer ? undefined : ReviewClient.forPage()

  /** The client's `version`, as a signal:  every read below tracks it. */
  private readonly version = new E.Cell(0)

  /** `id`:  the element's id (lower-case, as the inbox keys it), read when asked. */
  constructor(private readonly idOf: () => string | undefined) {}

  /** Follow the client's changes;  returns the undo.  SIDE EFFECT:  the page's side, once (`watchPage()`). */
  connect(): () => void {
    const client = this.client
    if (!client) return () => undefined
    ReviewState.watchPage(client)
    this.version.set(client.version)
    return client.subscribe(() => this.version.set(client.version))
  }

  ////////////////
  // ## Reads (tracked)
  ////////////////

  /** The page is being reviewed:  the controls show.  The page's, so read with or without an id. */
  readonly reviewing = (): boolean => this.readPage((client) => client.reviewing) ?? false

  /**
   * The new items Owen asked for from the page, waiting to be made (epic `airplane` P2);  `kind`:  only those.
   * The page's, so read with or without an id.
   */
  readonly newItems = (kind?: NewKind): NewItem[] => this.readPage((client) => client.newItems(kind)) ?? []

  /**
   * Has item `itemId` a mark in the inbox, sent or not (epic `epic-engine` P43:  marked in this pass)?
   * - until Claude's `epic inbox apply` takes it off;  a draft being typed, or a comment, isn't a mark
   * - the page's inbox, so any element reads it for any item:  a section counts its items with it
   * - NOT a set change that picks nothing (the pick-one / pick-any switch, an option added or edited):  no answer
   *   yet, so the item keeps its colour and its count (Owen, 2026-10-29:  "Switched 'pick many' and Q4 thinks it was
   *   decided, even though I didn't pick one")
   */
  readonly isMarked = (itemId: string): boolean =>
    this.readPage((client) => {
      const mark = itemId ? client.markOf(itemId.toLowerCase()) : undefined
      return !!mark && !(mark.action === "pick" && !mark.pick)
    }) ?? false

  /**
   * Item `itemId`'s mark, if any:  the page's inbox, so any element reads any id's (a phase its update blocks' Seen,
   * epic `epic-engine` I168).
   */
  readonly markOf = (itemId: string): InboxMark | undefined =>
    this.readPage((client) => (itemId ? client.markOf(itemId.toLowerCase()) : undefined))

  /** Its mark, if any. */
  readonly mark = (): InboxMark | undefined => this.read((client, id) => client.markOf(id))

  /** Its saved draft, if any. */
  readonly draft = (): InboxDraft | undefined => this.read((client, id) => client.draftOf(id))

  /** Its immediate request at work, if any. */
  readonly running = (): Running | null => this.read((client, id) => client.runningOf(id)) ?? null

  /** The review button whose work is on its way or under way (it spins), if any. */
  readonly busyButton = (): ReviewAction | null => this.read((client, id) => client.busyButtonOf(id)) ?? null

  /** Has Claude taken its request (an agent at work on it), rather than it waiting to be taken? */
  readonly workedOn = (): boolean => this.read((client, id) => client.isWorkedOn(id)) ?? false

  /**
   * What the inbox says of item `itemId` (its own id when none) for its drawn state (`DrawnState.of()`):
   * worked on, Owen's urgency, his check pressed.
   * - the page's inbox, so any element reads it for any item:  a section counts its items by it, as their chips draw
   */
  readonly liveOf = (itemId?: string): LiveReview =>
    this.readPage((client) => {
      const id = (itemId ?? this.id()).toLowerCase()
      if (!id) return NO_LIVE_REVIEW
      const urgency = client.inbox.urgency[id]
      return {
        workedOn: client.isWorkedOn(id),
        urgency: urgency && { calm: urgency.calm },
        approved: client.markOf(id)?.action === "approve"
      }
    }) ?? NO_LIVE_REVIEW

  /**
   * The comments waiting for Claude in its text (`ReviewClient.commentsIn()`, epic `epic-engine` I140), while nothing
   * is typed in its note box:  what a click on Revisit would mark at once;  `[]` otherwise.
   */
  readonly inlineComments = (): string[] =>
    this.read((client, id) => (client.typedOf(id).trim() ? [] : client.commentsIn(id))) ?? []

  /** Its pick Claude took off the inbox since the page loaded (`ReviewClient.takenPickOf()`), if any. */
  readonly takenPick = (): PickFields | undefined => this.read((client, id) => client.takenPickOf(id))

  /** Has its mark gone to Claude? */
  readonly isSent = (): boolean =>
    this.read((client, id) => !!client.markOf(id) && client.isSent(client.markOf(id)!)) ?? false

  /** How many marks, urgencies and comments wait for Send (`ReviewClient.unsentCount`).  The page's. */
  readonly unsentCount = (): number => this.readPage((client) => client.unsentCount) ?? 0

  /** Is a Claude session listening?  The page's, so read with or without an id. */
  readonly listening = (): boolean => this.readPage((client) => client.listening) ?? false

  /**
   * Why work waits with nobody listening:  what the page server's wake did, else that nobody is reviewing
   * (`ReviewClient.waitingWhy`).  The page's, so read with or without an id.
   */
  readonly waitingWhy = (): string => this.readPage((client) => client.waitingWhy) ?? ""

  /** Its note box open by itself, or being written in. */
  readonly boxOpen = (): boolean => this.read((client, id) => client.isBoxOpen(id)) ?? false

  /**
   * Its mark, while it shows as a marked note (`<epic-review shows="said">`):
   * a mark with a note or a picture (epic `epic-engine` P51), no draft, the box closed;  else `undefined`.
   */
  readonly noted = (): InboxMark | undefined => {
    const mark = this.mark()
    return (mark?.note || (mark?.shot && mark.action !== "test")) && !this.draft() && !this.boxOpen() ? mark : undefined
  }

  /** What's typed in its note box. */
  readonly typed = (): string => this.read((client, id) => client.typedOf(id)) ?? ""

  /** Owen's urgency for it, not applied yet:  `calm` (true:  not urgent), and has it gone with a send?  Else none. */
  readonly urgency = (): { calm: boolean; sent: boolean } | undefined =>
    this.read((client, id) => {
      const entry = client.inbox.urgency[id]
      return entry && { calm: entry.calm, sent: isSent({ action: "urgency", at: entry.at }, client.inbox.sent) }
    })

  /**
   * How far `action`'s mark has got:  its review button's FILL (decision Q20).
   * - its mark dashed until sent, then outlined;  a request for now (`details`, an old Do Now) draws no button
   * - once Claude has handled a mark, it's gone from the inbox, and every button CLEARS (`none`):
   *   the buttons are Owen's INPUT (Owen, 2026-10-08), and the id chip shows the result
   * - the element's `review-as` stays as the record, never drawn here
   */
  readonly fillOf = (action: ReviewAction): ReviewFill => {
    const mark = this.mark()
    if (mark?.action !== action || isImmediate(mark)) return "none"
    return this.isSent() ? "outline" : "dashed"
  }

  /** Its id, as the inbox keys it. */
  readonly id = (): string => (this.idOf() ?? "").toLowerCase()

  ////////////////
  // ## Acts (untracked:  from handlers)
  ////////////////

  /**
   * Its `action` button clicked (`ReviewClient.press()`).  Answers:
   * - `"open-box"`:  the caller should take the reader to the note box
   * - `"chosen"`:  an action was chosen for it (the caller folds it)
   * - else `undefined`
   */
  @E.untracked
  press(action: ReviewAction): "open-box" | "chosen" | undefined {
    return this.client?.press(this.id(), action)
  }

  /**
   * Mark each of `ids` (update blocks, `up3`) SEEN, at once:  a phase's pen's ✓ (epic `epic-engine` I168).
   * - one marked seen already is left alone (pressing it would take the mark off)
   */
  @E.untracked
  markSeen(ids: readonly string[]) {
    const client = this.client
    if (!client) return
    for (const id of ids) if (client.markOf(id.toLowerCase())?.action !== "seen") client.press(id.toLowerCase(), "seen")
  }

  /** Its id chip clicked:  urgent <-> not urgent (`docCalm`:  what the doc says). */
  @E.untracked
  toggleCalm(docCalm: boolean) {
    void this.client?.toggleCalm(this.id(), docCalm)
  }

  /** A failed save's words:  the client's last write error. */
  get lastWriteError(): string {
    return this.client?.lastWriteError ?? ""
  }

  /** `fn(client, id)`, tracking the version;  `undefined` without a client or an id. */
  private read<T>(fn: (client: ReviewClient, id: string) => T): T | undefined {
    this.version.get()
    const id = this.id()
    return this.client && id ? fn(this.client, id) : undefined
  }

  /** `fn(client)`, for what's the page's, not an element's:  tracking the version;  `undefined` without a client. */
  private readPage<T>(fn: (client: ReviewClient) => T): T | undefined {
    this.version.get()
    return this.client ? fn(this.client) : undefined
  }

  ////////////////
  // ## The page
  ////////////////

  /** The clients whose page side is on. */
  private static readonly watched = new WeakSet<ReviewClient>()

  /**
   * The page's side of `client`, once:  `<epic-page reviewing>` while it's reviewed, and the notice line.
   * - SIDE EFFECT:  sets the attribute on every `<epic-page>`;
   *   the notices go to the page's one stack (`PageNotices`)
   */
  private static watchPage(client: ReviewClient) {
    if (ReviewState.watched.has(client)) return
    ReviewState.watched.add(client)
    const mark = () => {
      for (const page of document.querySelectorAll(PAGE_TAG)) page.toggleAttribute(REVIEWING, client.reviewing)
    }
    mark()
    client.subscribe(mark)
    client.onNotice((message) => PageNotices.show(message, { ms: NOTICE_MS }))
  }
}
