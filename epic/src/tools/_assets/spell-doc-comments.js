/*
 * COMMENTS on a docs page or an epic page:  the bullhorns, the comment pane, the threads, a docs page's Send
 * (epic `airplane` P11;  `wireComments()` below says it all).
 * - Its own module since epic `epic-engine` P2 (T3), so two scripts carry it:
 *   - the docs bundle, `spell-ui.js`, through the page runtime (`spell-doc-runtime.js`):  guides, epic pages ...
 *   - `spell-comments.js` by itself (`spell-comments.entry.js`), on Epic UI's pages:
 *     they load Spell UI's site bundle, not the docs bundle, so nothing else of the runtime;
 *     it draws with the page's own Spell UI
 * - Plain DOM:  it makes elements and lets the page draw them, never imports Spell UI or the epics pack itself:
 *   - Spell UI's (`<ui-button>`), which the page's Spell UI draws
 *   - the epics pack's (epic `epic-engine` P3), which every page that takes comments loads
 *     (the docs runtime's `loadEpicsPack()`;  Epic UI's layout), each upgrading as the pack registers:
 *     - each comment's thread, `<epic-thread>`, in an `<epic-threads>` box under its block
 *     - the comment pane, `<epic-comment-pane>`
 *   - Owen's field, in the pane or a thread:  a native `<textarea>` this code owns, so it lives through every redraw
 *   - what a thread shows, and its ids and words:  `ThreadFacts` (`spell-epic/comments`), which the elements share
 * - Its look:  `spell-comments.css`, beside it (the bullhorns, Send, Owen's field, where a thread sits);
 *   the elements' own sheets draw the rest.
 * - What it keeps in the browser (drafts, what's been seen) goes through the kit's `PrefStore`:
 *   the helpers' `readJSON()` / `writeJSON()`.
 */

import {
  PAGE_ANCHOR,
  anchorOf,
  blockAround,
  blocksIn,
  excerptOf,
  findBlock,
  kindOf,
  offsetIn,
  pageHeadIn,
  quoteIn,
  sectionOf,
  sectionTitle
} from "spell-epic/tools/BlockAnchors.js"
import { nextFrame } from "spell/util/dom"
import { ThreadFacts } from "spell-epic/comments"
import { DraftSaver } from "spell-epic/answers"
import { ServerLink } from "spell-epic/review"
import {
  addBlockAction,
  BLOCK_ROW,
  addHeadTool,
  alignBlockActions,
  dropBlockAction,
  el,
  growField,
  noteToast,
  readJSON,
  titleInside,
  writeJSON
} from "./spell-doc-helpers.js"

////////////////
// ## Comments
////////////////

/** The page server's comments routes (`src/tools/commentsRoutes.ts`). */
const COMMENTS_API = "/api/docs/comments"

/** The page's comments, once the page server says it takes them (`wireComments()`):  Cmd / Ctrl + K reads them. */
let pageComments = null

/** The page's comments (`PageComments`), once the page server says it takes them;  else `null`. */
export function commentsOnPage() {
  return pageComments
}

/** `localStorage` key prefix of a page's unsaved comments (`{ [anchor | comment id]: text }`), per page. */
const COMMENT_DRAFT_KEY_PREFIX = "spell-comment-draft:"

/**
 * `localStorage` key prefix of the Claude replies Owen has SEEN on a page, per page:
 * `{ [comment id]: time of the latest Claude reply seen }`.
 * - the store the news-only cards kept before threads, read the same way:
 *   a time at or after the latest reply means seen
 */
const COMMENT_READ_KEY_PREFIX = "spell-comment-read:"

/** How long an open thread with an unseen reply must stay on screen to count as seen, ms. */
const SEEN_MS = 1200

/** The smallest blocks a quote's thread goes under (`holderOf()`):  a paragraph, a list item, a cell ... */
const TEXT_HOLDERS = "p, li, dt, dd, td, th, blockquote, pre, figcaption, h4, h5, h6"

/** Of those, the ones a thread goes INSIDE, at the end, so the list or table stays valid. */
const HOLDS_INSIDE = /^(li|dt|dd|td|th)$/

/** The CSS highlight the quoted text of every comment is drawn with (`::highlight()` in `spell-comments.css`). */
const QUOTE_HIGHLIGHT = "spell-comment-quote"

/**
 * The one a comment's quote is drawn with while it WAITS for Claude (its turn `claude`):  purple, Owen's comments
 * not taken in yet (Owen, 2026-10-25:  "highlight bullhorn items still-to-be-processed ... purple for my comments")
 */
const QUOTE_WAITING_HIGHLIGHT = "spell-comment-quote-waiting"

/** How long after Owen stops typing the comment box saves itself, ms. */
const COMMENT_SAVE_MS = 600

/** How long after the page's content changes (an epic page's part loading) the comments draw again, ms. */
const REDRAW_MS = 150

/**
 * How often a docs page with a Send asks again who is listening, ms.
 * - the server calls a session gone once its heartbeat is 90s old (`ReviewInbox` `LISTEN_STALE_MS`),
 *   with no file change to announce it
 */
const SEND_POLL_MS = 30_000

/**
 * The blocks with a title row and an `actions` slot in it (epic `epic-workflow` P25).
 * - their bullhorn goes in that slot, never over their own buttons:
 *   after the title, before the review pills, the date, the fold
 * - an epic page's item, update (drawn as a block, with its date), aside and code block:
 *   `Fold.types.ts`, in the epics pack
 * - the Overview (`<epic-overview>`, a comment on all of it):  first in its title row,
 *   before its review buttons, expand-all, collapse-all and the fold (epic `epic-engine` I55)
 *   - Owen, 2026-10-20:  "The buttons on the left should move into the 1. Overview header, as well as a bullhorn"
 *   - its summary and prose keep their own, on their corners
 * - a docs section has its own (`ui-section`'s `actions` slot, `.at-section`)
 * - every other block (a paragraph, a table, a list, a message, cards, a phase's field, the summary) has no title row:
 *   its bullhorn sits over its corner, first in its actions row
 *   (`.at-block`, in its `<epic-actions>`:  `addBlockAction()`)
 */
const TITLE_ROW_BLOCKS = "epic-overview, epic-item, epic-update[at], epic-aside, epic-code"

/** The blocks whose box of threads goes FIRST in them, under their title:  a docs section, the Overview. */
const THREADS_FIRST = /^(ui-section|epic-overview)$/

/**
 * COMMENTS (epic `airplane`, P11):  Owen's comments for Claude, on a page's blocks or on text he selected,
 * kept by the page server (`commentsRoutes.ts`).
 * - a docs page's in its inbox file (`<page>.inbox.json5`), an epic page's in the epic's review inbox
 * - No Claude, no network:  only the page server, so it works on a plane.
 * - served by the page server with a token, on a page that takes comments (the `GET` says `takesComments`):
 *   - a BULLHORN beside every major block, and in the page header (the whole page):  shown while the block is hovered
 *     - the blocks (`BlockAnchors.js` `blocksIn()`):  sections, tables, asides, code, messages, cards, steps,
 *       top-level lists;  an epic page's items, phase fields, summary and Overview prose
 *     - in the block's title row, when it has one (its `actions` slot):
 *       a docs section's, an epic page item's, update's, aside's or code block's
 *     - else over the block's top right corner
 *   - SELECTED TEXT:  ⌘ / Ctrl I, or the bullhorn that floats beside the selection
 *     - the box opens for that block, its header the text's first words
 *     - the comment keeps the quote, highlighted on the page while it exists
 *   - the box is a small PANE, fixed on the screen, just under the selection (or the button clicked):
 *     the page never scrolls, and Owen drags it by its header
 *     - Owen, 2026-10-10:  "a little floating pane below the selected text that I can move around --
 *       don't scroll the page and lose context!"
 *   - in it (`<epic-comment-pane>`):  a header (the first words, a floppy, a trash once saved, ×),
 *     and a textarea that grows, with no placeholder
 *     - ivory, no buttons below (Owen, 2026-10-10)
 *     - it saves itself as Owen types, the floppy says so
 *     - ×, Escape or the focus leaving it (Tab, a click elsewhere) closes it
 *     - what's typed and not saved yet is kept in this browser (`COMMENT_DRAFT_KEY_PREFIX`)
 *   - NEVER an empty comment:  nothing typed saves nothing;  emptied, it's deleted at once
 *   - the pane is for writing a NEW comment;  once saved and closed, it's a THREAD (below)
 *   - THREADS (Owen, 2026-10-10:  "the entire comment thread should be in one collapsable/accordion pane"):
 *     every comment shows as one, folding:  an `<epic-thread>` (`thread()`), in an `<epic-threads>` box
 *     - where:  under the paragraph (list item, cell ...) holding its quote (`holderOf()`), else under its block
 *     - all ivory, the pane's outline and corners, whoever spoke last
 *     - its edges:  an epic page item's note box's, else the block's it's under (spell-comments.css)
 *     - its header:  a chevron, the bullhorn (a check circle once done), the pane's summary (`ThreadFacts.headline()`)
 *       - then Owen's answer while it's his turn (Claude spoke last):  an epic page item's review pills
 *         (`<epic-review buttons="thread">`), Approve / Revisit / the x, as "that's good" / reply / "skip it"
 *       - Reopen once done;  the trash, always
 *     - the messages in order, a bold "You:" / "Claude:" first
 *       - his plain on the ivory, Claude's in a light violet box
 *       - each one's time in its top right corner (the first's with the day)
 *       - then a green Done line once closed;  "Claude: thinking…" last while Claude is at work on it (`working`)
 *     - open while it's Owen's turn, or Claude is thinking, or he opened it;  else folded to its header
 *     - a REPLY BOX last while it's open, saved as he types (`reply`), and as the focus leaves it
 *       - Revisit puts the cursor in it
 *       - the pen edits his first words while Claude hasn't had them
 *   - a click on a highlighted quote opens its thread
 *   - the trash, on a thread or the pane:  one click (`delete` while it waits, else `clear`);  Undo in the toast
 *   - the BULLHORN only ever starts a new comment:  no count, since the block's threads are right there
 *     (Owen, 2026-10-10:  "Bullhorn to the far right is unnecessary")
 * - IDS (epic `epic-engine` P44;  Owen, 2026-10-25:  "Can `Mark` be `Comment (C)`";  `M3` from epic `epic-workflow` P23):
 *   shown `C3`, small and muted in each thread's header, before its summary (`<epic-thread>`)
 *   - the server keys them `c3`, and a typed id takes `C3`, `c3` or `cm3` (`ThreadFacts.numberOf()`);  `M3` is a
 *     manual test's
 * - JUMPING to the threads waiting on Owen (Claude spoke last;
 *   Owen, 2026-10-10:  "Is there a way to jump to comments in replies?"):
 *   - a BULLHORN at the right of the page's toolbar, an orange count of them on it;  none:  hidden
 *     - each click lands on the next (`nextWaiting()`), in page order, round again after the last:
 *       opened, below the stuck titles
 *   - Cmd / Ctrl + K takes a comment's id, and lists them (`openJumpPrompt()`)
 * - drawn again:
 *   - after a live patch (`spell-doc:updated`)
 *   - when the page's content changes (an epic page's part loading)
 *   - when the inbox file changes (`spell-server:changed`:  another window, Claude)
 *   - when the page comes back into view
 * - what it adds in `main` carries `data-spell-added`:  a patch steps around it, the anchors never count it
 * - NEVER throws:  a page with no server, or a server without the routes, shows no bullhorns
 * - options:
 *   - `go(id)`:  lands on an id as a link to it does (the runtime's `wireAnchors()`);
 *     without it, the browser's `scrollIntoView()`
 *   - `signal`:  an `AbortSignal` that takes it all down again
 *     - for Epic UI's pages, whose `main` the site's router swaps for the next page's (`spell-comments.entry.js`)
 *     - every listener, observer and timer, the floating bullhorn
 *     - what's typed and not saved yet is sent first, as on leaving the page
 */
export async function wireComments(main, { go, signal } = {}) {
  if (!ServerLink.isServed()) return
  const comments = new PageComments(main, { go, signal })
  if (!(await comments.load()) || signal?.aborted) return
  pageComments = comments
  comments.draw()
  const reload = () => void comments.load().then((takes) => takes && !signal?.aborted && comments.draw())
  const listening = { signal }
  addEventListener("spell-doc:updated", () => comments.draw(), listening)
  // its inbox files changing, the page coming into view;  and, while a docs page's Send shows, every 30s:
  // who is listening, as a session that stopped leaves no file change, only an old heartbeat
  const unwatch = ServerLink.watch(window, (path) => comments.inboxPaths.includes(path), reload, {
    every: SEND_POLL_MS,
    polls: () => !!comments.send
  })
  // leaving (a reload, another page):  what's typed in the pane or a reply box and not saved yet goes now
  const flush = () => {
    comments.open?.flush?.()
    for (const each of comments.fields()) each.flush?.()
  }
  addEventListener("pagehide", flush, listening)
  // the page's layout changing (a width, an item folding) can bring a corner bullhorn over a thread's header
  const sizes = typeof ResizeObserver === "function" ? new ResizeObserver(() => comments.makeRoom()) : null
  sizes?.observe(main)
  comments.watchContent()
  comments.wireSelection()
  signal?.addEventListener(
    "abort",
    () => {
      flush()
      unwatch()
      sizes?.disconnect()
      comments.stop()
      if (pageComments === comments) pageComments = null
    },
    { once: true }
  )
}

/**
 * The URL paths the page server may announce inbox file `inbox` (`<page>.inbox.json5`) by:
 * - it, and the same without a worktree's prefix (`/worktrees/<w>/`:  a shared folder's changes come without it)
 * - each by its old name too, `.inbox.json` (`ServerLink.dataFileNames()`)
 */
function inboxPathsOf(inbox) {
  const paths = [inbox, inbox.replace(/^\/worktrees\/[^/]+(?=\/)/, "")]
  return [...new Set(paths.flatMap((path) => ServerLink.dataFileNames(path)))]
}

/****************
 * ### `PageComments`
 * One page's comments:
 * - what the server holds, drawn under their blocks
 * - the one comment pane open
 * - the floating bullhorn of a text selection
 * - `list`:  the comments as the server last answered;  every write answers the whole list, which is drawn again
 * - NEVER throws:  a failed save says so (the floppy turns red), the text kept in the pane
 ****************/
class PageComments {
  /**
   * - `main`:  the page's `main`, where the blocks are
   * - `go(id)`:  lands on the element with `id` as a link to it does (`wireAnchors()`), resolving once landed
   * - `signal`:  as `wireComments()` takes it
   */
  constructor(main, { go, signal } = {}) {
    /** the page's `main` */
    this.main = main
    /** lands on an id as a link does */
    this.go = go
    /** takes it all down again (`stop()`):  every listener added with it */
    this.signal = signal
    /** what `watchContent()` watches the page's content with */
    this.contentWatch = null
    /** the thread the toolbar's bullhorn last landed on (`nextWaiting()`):  the next click goes on from it */
    this.lastWaiting = ""
    /** the comments, as the server last answered (`CommentList` `all`) */
    this.list = []
    /**
     * the pane open for a NEW comment, if any:  `{ key, place, id?, finish? }`
     * - `place`:  `{ anchor, kind, label, excerpt, quote? ... }`
     * - `id`:  once its first save made it
     * - `finish()`:  saves what's typed, then forgets its draft
     */
    this.open = null
    /**
     * the open pane's element (`showPane()`, an `<epic-comment-pane>`), in `main` but fixed on the screen:
     * a redraw never touches it
     */
    this.pane = null
    /**
     * each comment's THREAD, by comment id (`thread()`):  ONE `<epic-thread>` for the visit,
     * given what the server holds at each redraw, and moved only when its place changes,
     * so Owen's box in it and the cursor stay
     */
    this.threads = new Map()
    /**
     * each open thread's REPLY BOX, by comment id (`replyBoxFor()`):
     * `{ id, how: "reply", box, field, floppy, saved(), busy(), finish(), flush() }`
     * - `box` (`field`):  its `<textarea>`, slotted into the thread,
     *   kept across redraws while Owen is in it or it holds words not saved yet
     * - `floppy`:  how its last save went (`{ tip, failed }`, none before one), which the thread shows
     */
    this.replyBoxes = new Map()
    /**
     * the pen's box, editing his first words while Claude hasn't had them (`startEdit()`), if open:
     * as a reply box, `how: "edit"`;  it stands in for the thread's reply box meanwhile
     */
    this.editing = null
    /** each quote's range on the page, by comment id (`highlightQuotes()`):  a click on one opens its thread */
    this.quotes = []
    /** each thread's fold, by comment id, as the reader left it on this visit;  else open while it's Owen's turn */
    this.folds = new Map()
    const page = decodeURIComponent(location.pathname)
    /**
     * the URL paths of the inbox files the comments may be in, as the page server announces their changes
     * - a worktree's page (`/worktrees/<w>/epics/...`) is in a shared folder,
     *   whose changes it announces without that prefix
     * - each by its old name too, `.inbox.json`, which a checkout on older code writes (epic `epic-workflow` P21)
     */
    const inbox = page.replace(/(\.plan|\.saga)?\.html$/, ".inbox.json5")
    this.inboxPaths = inboxPathsOf(inbox)
    /** the `localStorage` key of this page's drafts */
    this.draftKey = `${COMMENT_DRAFT_KEY_PREFIX}${location.pathname}`
    /** the `localStorage` key of the Claude replies Owen has seen on this page (`markSeen()`) */
    this.readKey = `${COMMENT_READ_KEY_PREFIX}${location.pathname}`
    /** what's in it, as `draw()` last read it */
    this.read = {}
    /** watches the open threads with an unseen reply (`watchSeen()`);  a timer per one on screen, by comment id */
    this.seenWatch = null
    this.seenTimers = new Map()
    /** a docs page's Send, as the server last answered (`keepSend()`);  `null` on an epic page */
    this.send = null
  }

  /**
   * Whether `comment` is ORANGE:  Claude spoke last and Owen hasn't answered yet (✓, a reply, ×).
   * - Looking at it doesn't clear it (Owen, 2026-10-10:  "I was expecting this to be orange, not ivory"):
   *   `markSeen()` only records the reply as read.
   * - Never once it's done.
   */
  unseen(comment) {
    // orange while it's Owen's turn, seen or not, until he answers (✓, a reply, ×):  Owen, 2026-10-10, on a thread
    // gone ivory once looked at:  "I was expecting this to be orange, not ivory"
    return comment.turn === "owen" && !!ThreadFacts.latestClaudeAt(comment)
  }

  /**
   * Owen has seen comment `id`'s latest reply from Claude (he opened it, or it was open on screen for `SEEN_MS`):
   * remembered in this browser, its orange gone;  a newer reply makes it orange again.
   */
  markSeen(id) {
    const comment = this.list.find((each) => each.id === id)
    if (!comment || !this.unseen(comment)) return
    const read = readJSON(this.readKey)
    // read already:  nothing to change (the thread stays orange until Owen answers, so the watcher fires again)
    const latest = ThreadFacts.latestClaudeAt(comment)
    if ((read[id] ?? "") >= latest) return
    read[id] = latest
    writeJSON(this.readKey, read)
    this.draw()
  }

  /**
   * Watch the open threads with an unseen reply:  one on screen (half of it, or half the screen) for `SEEN_MS` while
   * the page is in view is seen (`markSeen()`).
   */
  watchSeen() {
    this.seenWatch?.disconnect()
    const threads = this.main.querySelectorAll("epic-thread[unseen][open]")
    for (const [id, timer] of this.seenTimers)
      if (![...threads].some((each) => each.id === `comment-${id}`)) {
        clearTimeout(timer)
        this.seenTimers.delete(id)
      }
    if (!threads.length || typeof IntersectionObserver !== "function") return
    this.seenWatch = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id.replace(/^comment-/, "")
          const screen = entry.rootBounds?.height ?? innerHeight
          const shown =
            entry.isIntersecting && (entry.intersectionRatio >= 0.5 || entry.intersectionRect.height >= screen / 2)
          if (!shown) {
            clearTimeout(this.seenTimers.get(id))
            this.seenTimers.delete(id)
          } else if (!this.seenTimers.has(id))
            this.seenTimers.set(
              id,
              setTimeout(() => {
                this.seenTimers.delete(id)
                if (document.visibilityState === "visible") this.markSeen(id)
                else this.watchSeen()
              }, SEEN_MS)
            )
        }
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    )
    for (const each of threads) this.seenWatch.observe(each)
  }

  /**
   * Keep a corner bullhorn off a thread's buttons (Owen, 2026-10-10:  "Overlap in bullhorn buttons").
   * - a block with no title row has its bullhorn over its top right corner, in its actions row
   *   (`<epic-actions>`, with a table's expand button)
   * - so a thread just under a short block (a one-line paragraph) can lie under them:
   *   that thread's header leaves room on its right, its buttons moving left
   *   (`--epic-thread-head-room`, which `<epic-thread>` reads)
   * - a block with a title row has its bullhorn IN that row (`TITLE_ROW_BLOCKS`), beside its own buttons:
   *   nothing to move
   *   - Before P25 of epic `epic-workflow` this also moved an item's corner bullhorn left of its review pills,
   *     and an update's left of its date.
   */
  makeRoom() {
    alignBlockActions(this.main)
    const horns = [...this.main.querySelectorAll(`${BLOCK_ROW} ui-button`)]
      .filter((each) => each?.checkVisibility?.({ contentVisibilityAuto: true }) !== false)
      .map((each) => each?.getBoundingClientRect())
      .filter((rect) => rect?.width)
    for (const thread of this.threads.values()) {
      thread.style.removeProperty(HEAD_ROOM)
      // not drawn yet (the pack still loading):  a resize comes once it is
      const head = thread.isConnected ? thread.header : undefined
      if (!head) continue
      const box = head.getBoundingClientRect()
      // hidden (a folded part's, `until-found`):  its place means nothing until it shows, and that's a resize
      if (!box.width || head.checkVisibility?.({ contentVisibilityAuto: true }) === false) continue
      const over = horns.filter(
        (rect) => rect.left < box.right && rect.right > box.left && rect.top < box.bottom && rect.bottom > box.top
      )
      if (over.length)
        thread.style.setProperty(HEAD_ROOM, `${Math.ceil(box.right - Math.min(...over.map((r) => r.left))) + 4}px`)
    }
  }

  /** Fetch the page's comments;  resolves to whether the page takes comments.  NEVER throws. */
  async load() {
    try {
      // the page now:  Epic UI's router swaps pages under one link
      const answer = await ServerLink.forPage().get(COMMENTS_API, { query: { page: location.pathname }, missing: {} })
      if (answer.takesComments !== true) return false
      this.list = ThreadFacts.withTurns(answer.comments)
      this.keepSend(answer)
      return true
    } catch {
      return false
    }
  }

  ////////////////
  // ## Send
  ////////////////

  /**
   * Keep a docs page's Send state from a comments route's answer:
   * `send`, `{ epic, owned, wakes, listening, sent, unsent, waiting }` (`commentsRoutes.ts` `PageSend`).
   * - an epic page's answer has none:  its Send is `<epic-page>`'s
   * - the epic's review inbox joins the files whose change redraws the page:  who is listening is in it
   */
  keepSend(answer) {
    if (!answer?.send) return
    this.send = answer.send
    const inbox = `/epics/${answer.send.epic}/${answer.send.epic}.inbox.json5`
    for (const path of inboxPathsOf(inbox)) if (!this.inboxPaths.includes(path)) this.inboxPaths.push(path)
  }

  /**
   * The page header's SEND (epic `epic-workflow` P13):  a docs page's comments go to the session of the epic the page
   * belongs to, as an epic page's do with its Send.
   * - Send and its countdown, the epics pack's `<epic-send-buttons>` (epic `epic-engine` P20), as an epic page's header
   *   draws it:  the paper plane with how many comments wait for it, blue by the fill rule (`templates/epics/
   *   plan-doc.md`, "Colours"):  grey outline with nothing waiting, dashed while some aren't sent, outlined once sent
   *   - the wand:  countdown mode;  on, the comments go by themselves 2 minutes after Owen stops typing, clicking and
   *     scrolling;  off, the plane is filled blue until he presses it
   *   - drawn anew with the comments, the countdown kept:  it's the page's, not the element's
   * - beside it, who is listening:  "python-target is listening", or nobody (then Send wakes the epic's session);
   *   a page no epic owns:  the standing epic `feedback`'s (epic `epic-engine` T9), "feedback is listening", or
   *   "nobody is listening:  Send wakes feedback" (`whoLabel()`)
   * - a press, or the countdown running out (`epic-send-saving`), sends (`POST /api/docs/comments/send`), and a toast
   *   says what went where
   * - drawn again with the comments;  none on an epic page, or from a server without it
   */
  drawSend() {
    const sticky = pageHeadIn(this.main)
    const head = sticky?.matches(".spell-page-head") ? sticky : (sticky?.querySelector(".spell-page-head") ?? sticky)
    head?.querySelector(":scope > .spell-send, :scope > .spell-head-tools > .spell-send")?.remove()
    const send = this.send
    if (!head || !send) return
    const unsent = send.unsent.length
    const state = unsent ? "unsent" : send.waiting.length ? "sent" : "idle"
    const button = el(SEND_BUTTONS_TAG, { state, count: unsent || undefined, "send-tip": sendWords(send, state) })
    button.addEventListener(SEND_ASKED, () => void this.sendNow())
    const who = el(
      "span",
      { class: "spell-send-who", "data-listening": send.listening ? "yes" : "no", title: whoWords(send) },
      whoLabel(send)
    )
    // the header's tools row, first (`addHeadTool()`)
    addHeadTool(
      head,
      el("span", { class: "spell-send", "data-spell-added": true, "data-state": state }, button, who),
      "send"
    )
  }

  /** Send, clicked:  every comment waiting so far goes to the page's epic;  a toast says so.  NEVER throws. */
  async sendNow() {
    const send = this.send
    if (!send) return
    if (!send.unsent.length) return noteToast("Nothing new to send:  every comment here went with an earlier Send.")
    try {
      const answer = await ServerLink.forPage().post(`${COMMENTS_API}/send`, { page: location.pathname })
      this.list = answer.comments ? ThreadFacts.withTurns(answer.comments) : this.list
      this.keepSend(answer)
      const count = `${send.unsent.length} comment${send.unsent.length === 1 ? "" : "s"}`
      // nobody listening:  the server woke the epic and says what it did
      // (P16;  a page no epic owns:  `feedback`, epic `epic-engine` T9);
      // else they wait for its review, or (`feedback` not made yet) for /airplane land
      const later = this.send.listening
        ? ""
        : answer.wake?.message
          ? `.  ${answer.wake.message.replace(/\.$/, "")}`
          : !send.wakes
            ? `:  nobody is listening, so /airplane land gathers them into ${send.epic}`
            : `:  nobody is listening, so they wait for /epic review ${send.epic}`
      noteToast(`Sent ${count} to ${send.epic}${later}.`, later ? "warning" : "success")
      this.draw()
    } catch (error) {
      noteToast(`Couldn't send:  ${error.message}`, "error")
    }
  }

  /**
   * Draw it all again:  every bullhorn, every comment's thread, the quotes' highlight.
   * - a thread goes under the paragraph (list item, cell ...) holding its quote, else under its block (`holderOf()`),
   *   in that block's box of threads (`<epic-threads>`, `boxFor()`)
   * - each comment's thread is ONE `<epic-thread>` for the visit (`threads`):  given what the server holds now, and
   *   moved only when its place changed, so Owen's box in it, what's typed and the cursor stay as they are
   * - a comment whose block can't be found any more goes under the page header, saying so
   * - the open pane stays as it is, where Owen put it, the cursor in it;  the comment it's writing has no thread yet
   * - a thread that had to move takes back the cursor it had:  in its box (the selection kept), or on its fold
   */
  draw() {
    const { main } = this
    const field = this.fields().find((each) => document.activeElement === each.field)?.field
    const [start, end] = field ? [field.selectionStart, field.selectionEnd] : [0, 0]
    const onFold = [...this.threads.values()].find((each) => each.isFoldFocused)
    this.read = readJSON(this.readKey)
    const blocks = blocksIn(main)
    const head = pageHeadIn(main)
    // the bullhorns KEPT where they still stand (epic `epic-engine` P28):  taking down and redrawing every one, on
    // every inbox change, poll and patch, redrew each item's title row under Owen's cursor
    const wanted = new Set(head ? [head, ...blocks] : blocks)
    const kept = new Set()
    for (const old of main.querySelectorAll(".spell-comment-mark")) {
      const block = bullhornBlocks.get(old)
      if (block && wanted.has(block) && !kept.has(block) && standsBy(old, block)) kept.add(block)
      else dropBlockAction(old)
    }
    const groups = new Map()
    const quotes = []
    for (const comment of this.list) {
      const { block, exact } = findBlock(main, comment, blocks)
      const at = block ?? head
      if (!at) continue
      const quoted = block && comment.quote && quoteIn(block, comment.quote, comment.offset)
      if (quoted) quotes.push({ ...quoted, id: comment.id, waiting: comment.turn === "claude" })
      if (this.open?.id === comment.id) continue
      const under = quoted ? holderOf(block, quoted) : at
      if (!groups.has(under)) groups.set(under, [])
      groups.get(under).push({ comment, exact: exact && Boolean(block) })
    }
    const ids = new Set(this.list.map((each) => each.id))
    if (this.editing && !ids.has(this.editing.id)) this.editing = null
    for (const id of this.replyBoxes.keys()) if (!ids.has(id)) this.replyBoxes.delete(id)
    // gone, or being written in the pane again:  no thread
    for (const [id, thread] of this.threads)
      if (!ids.has(id) || this.open?.id === id) {
        thread.remove()
        this.threads.delete(id)
      }
    for (const block of wanted) if (!kept.has(block)) this.addBullhorn(block)
    this.drawSend()
    const boxes = new Map()
    for (const [under, found] of groups) {
      const box = this.boxFor(under)
      boxes.set(box, found.length)
      found.forEach((each, at) => placeAt(box, this.thread(each), at))
    }
    // what's left in a box after its threads moved on, and the boxes no block has now
    for (const [box, count] of boxes) while (box.children.length > count) box.lastElementChild.remove()
    for (const old of main.querySelectorAll(`${THREADS_TAG}[data-spell-added]`)) if (!boxes.has(old)) old.remove()
    this.quotes = highlightQuotes(quotes)
    this.makeRoom()
    this.watchSeen()
    this.drawWaiting()
    // grown to their words once shown:  a thread just opened draws its box on the next frame
    requestAnimationFrame(() => this.growFields())
    if (onFold?.isConnected && !onFold.isFoldFocused) onFold.focusFold()
    if (!field?.isConnected || document.activeElement === field) return
    field.focus({ preventScroll: true })
    field.setSelectionRange(start, end)
  }

  /** Every box in an open thread as tall as its words (`growField()`):  a folded thread's has no height to measure. */
  growFields() {
    for (const replying of this.fields()) if (replying.field.getClientRects().length) growField(replying.field)
  }

  ////////////////
  // ## Jumping to the threads waiting on Owen
  ////////////////

  /** The comments waiting on Owen:  Claude spoke last on their threads (`turn` `owen`). */
  get waitingOnOwen() {
    return this.list.filter((comment) => comment.turn === "owen")
  }

  /** The comments waiting on Owen whose threads are drawn, in page order. */
  waitingInPageOrder() {
    return this.waitingOnOwen
      .map((comment) => ({ comment, thread: this.threadOf(comment.id) }))
      .filter((each) => each.thread)
      .sort((a, b) => (a.thread.compareDocumentPosition(b.thread) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
      .map((each) => each.comment)
  }

  /** Comment `id`'s thread, if drawn. */
  threadOf(id) {
    return this.main.querySelector(`#comment-${CSS.escape(id)}`)
  }

  /** The comment with id `typed` (`C3`, `c3`, the old `cm3`, a `#` aside), else `undefined`. */
  find(typed) {
    const number = ThreadFacts.numberOf(typed)
    return number === undefined ? undefined : this.list.find((each) => ThreadFacts.numberOf(each.id) === number)
  }

  /**
   * The toolbar's BULLHORN:  at the right of the page's toolbar (`.spell-toolbar`, an epic page's and a guide's alike),
   * an orange count of the threads waiting on Owen;  hidden when none.
   * - Owen, 2026-10-10:  "a bullhorn at the right of the toolbar, with an orange count,
   *   jumps to the next thread waiting on you"
   * - an item of the toolbar's menu like its section buttons (epic `epic-engine` P3):
   *   a `<ui-item appearance="link">` (a button), its count a `<ui-label>` over the icon's top right, as a section's badge
   * - kept when the toolbar is built anew (a live update), and drawn again with the comments
   * - where it goes:  `waitingHome()`, the one place to change to move it
   */
  drawWaiting() {
    const home = this.waitingHome()
    if (!home) return
    let bullhorn = home.querySelector(":scope > .spell-toolbar-waiting")
    if (!bullhorn) {
      bullhorn = el(
        "ui-item",
        { class: "spell-toolbar-item spell-toolbar-waiting", appearance: "link", icon: "bullhorn", hidden: true },
        el("ui-label", { class: "spell-toolbar-count replied", slot: "badge", appearance: "circular", size: "mini" })
      )
      bullhorn.addEventListener("click", () => this.nextWaiting())
    }
    if (home.lastElementChild !== bullhorn) home.append(bullhorn)
    const count = this.waitingInPageOrder().length
    const tip = `${count} ${count === 1 ? "thread waits" : "threads wait"} on you:  jump to the next`
    bullhorn.querySelector(".spell-toolbar-count").textContent = String(count)
    bullhorn.title = tip
    bullhorn.setAttribute("aria-label", tip)
    titleInside(bullhorn, "item")
    // a guide's titles share the row with it:  its menu fits them again (`<ui-toolbar shrinkable>`)
    bullhorn.hidden = !count
  }

  /**
   * Where the toolbar's bullhorn goes:  the page's toolbar (`.spell-toolbar`, Spell UI's menu), last in its row,
   * after a page's own tools there (the spell syntax guide's Expand all and Collapse all);  none without a toolbar.
   */
  waitingHome() {
    return document.querySelector(".spell-toolbar")
  }

  /**
   * The toolbar's bullhorn, clicked:  land on the next thread waiting on Owen after the one it last landed on, in
   * page order;  after the last, the first again.
   */
  nextWaiting() {
    const waiting = this.waitingInPageOrder()
    if (!waiting.length) return
    const at = waiting.findIndex((each) => each.id === this.lastWaiting)
    void this.landOn(waiting[(at + 1) % waiting.length].id)
  }

  /**
   * Land on comment `id`'s thread, opened, then the focus to its header without scrolling.
   * - as a link to it would (`go()`):  what hides it unfolds, it lands below the stuck titles,
   *   the address says `#comment-c3`
   * - seen (`markSeen()`)
   */
  async landOn(id) {
    if (!this.list.some((each) => each.id === id)) return
    this.lastWaiting = id
    this.folds.set(id, true)
    this.draw()
    this.markSeen(id)
    const anchor = `comment-${id}`
    if (this.go) await this.go(anchor)
    else document.getElementById(anchor)?.scrollIntoView({ block: "start" })
    this.threadOf(id)?.focusFold?.()
  }

  /** Every reply box there is:  each thread's (`replyBoxes`), and the pen's (`editing`). */
  fields() {
    return [...this.replyBoxes.values(), ...(this.editing ? [this.editing] : [])]
  }

  /**
   * Draw again when the page's own content changes:  an epic page's part loads its blocks when it opens.
   * - changes inside what this adds (`data-spell-added`) don't count:  drawing would wake it again
   */
  watchContent() {
    let timer = 0
    const ours = (node) =>
      node.nodeType === 1 && (node.matches("[data-spell-added]") || node.closest("[data-spell-added]"))
    this.contentWatch = new MutationObserver((records) => {
      const theirs = records.some(
        (record) =>
          !ours(record.target) &&
          [...record.addedNodes, ...record.removedNodes].some((node) => node.nodeType === 1 && !ours(node))
      )
      if (!theirs) return
      clearTimeout(timer)
      timer = setTimeout(() => this.draw(), REDRAW_MS)
    }).observe(this.main, { childList: true, subtree: true })
    this.signal?.addEventListener("abort", () => clearTimeout(timer), { once: true })
  }

  /**
   * Take down what this drew outside the page's content, and stop watching:  the floating bullhorn (in `body`), the
   * open pane, the content and seen watchers, the seen timers (`wireComments()`'s `signal`).
   * - the page's `main` keeps the rest:  it's on its way out
   */
  stop() {
    this.contentWatch?.disconnect()
    this.seenWatch?.disconnect()
    for (const timer of this.seenTimers.values()) clearTimeout(timer)
    this.seenTimers.clear()
    this.floating?.remove()
    this.floating = null
    this.pane?.remove()
    this.pane = null
    this.open = null
    document.documentElement.classList.remove("spell-over-quote")
  }

  ////////////////
  // ## Bullhorns
  ////////////////

  /**
   * The bullhorn of `block`, wherever its block keeps its own controls:
   * - a docs section's title (its `actions` slot)
   * - an epic page block's title row (its `actions` slot:  `TITLE_ROW_BLOCKS`)
   * - the page header
   * - else first in the block's actions row (`addBlockAction()`):
   *   a line of no height just before it, over its top right corner;  a table's expand button after it
   * - in a title row it's the last of the page's own buttons there, before the block's own (pills, date, fold)
   * - quiet until the block is hovered, always:  a click opens the pane for a NEW comment on it
   * - no count, and nothing to say about the block's comments:
   *   each has its thread right there on the page, orange while it has news (`thread()`)
   *   - Owen, 2026-10-10:  "Bullhorn to the far right is unnecessary"
   *   - Before, a block with comments showed "📢 N" always, its click listing them.
   */
  addBullhorn(block) {
    const place = this.placeOf(block)
    const what = place.kind === "page" ? "this page" : `this ${ThreadFacts.kindName(place.kind)}`
    const tip = `Comment on ${what}`
    const where =
      place.kind === "section" || place.kind === "page"
        ? place.kind
        : block.matches(TITLE_ROW_BLOCKS)
          ? "title"
          : "block"
    const button = iconButton("bullhorn", tip)
    const mark = el("span", { class: `spell-comment-mark at-${where}`, "data-spell-added": true }, button)
    bullhornBlocks.set(mark, block)
    button.addEventListener("click", (event) => {
      event.stopPropagation()
      // where it is NOW:  a kept bullhorn's block may have moved since it was drawn (an anchor is its place)
      const now = this.placeOf(block)
      this.openBox({ key: now.anchor, place: now }, event.currentTarget.getBoundingClientRect())
    })
    if (where === "section" || where === "title") {
      mark.slot = "actions"
      block.append(mark)
    } else if (where === "page") {
      // in the page header's tools row, last (`addHeadTool()`):  the toolbar stays its last row
      const head = block.querySelector(".spell-page-head")
      if (head) addHeadTool(head, mark, "comment")
      else block.append(mark)
    } else addBlockAction(block, mark, "comment")
  }

  /** Where `block` is, as a comment on it is saved:  `{ anchor, kind, label, excerpt }` (`BlockAnchors.js`). */
  placeOf(block) {
    if (block === pageHeadIn(this.main)) return { anchor: PAGE_ANCHOR, kind: "page", label: "", excerpt: "" }
    const kind = kindOf(block)
    const section = kind === "section" || kind === "item" ? block : sectionOf(block, this.main)
    return {
      anchor: anchorOf(block, this.main),
      kind,
      label: section ? sectionTitle(section) : "",
      excerpt: excerptOf(block)
    }
  }

  /**
   * The box of threads under `under` (a block, or the paragraph holding a quote:  `holderOf()`):
   * an `<epic-threads>`, made on first use.
   * - a docs section's and the Overview's:  first in its body, under its title
   * - a list item's or cell's:  last inside it
   * - the page's:  right under the page header
   * - anything else's:  right after it
   * - only one this code made (`data-spell-added`):  never one a page writes as an example (Epic UI's)
   */
  boxFor(under) {
    const where = THREADS_FIRST.test(under.localName) ? "first" : HOLDS_INSIDE.test(under.localName) ? "last" : "after"
    const next =
      where === "first"
        ? firstContentChild(under)
        : where === "last"
          ? under.lastElementChild
          : under.nextElementSibling
    if (next?.localName === THREADS_TAG && next.hasAttribute("data-spell-added")) return next
    const box = el(THREADS_TAG, { "data-spell-added": true })
    if (where === "after") under.after(box)
    else if (where === "last") under.append(box)
    else if (next) next.before(box)
    else under.append(box)
    return box
  }

  ////////////////
  // ## Selected text
  ////////////////

  /**
   * Comment on selected text:  ⌘ / Ctrl I, or the bullhorn floating beside the selection (`floatingBullhorn()`).
   * - only a selection inside one of the page's blocks;  never in a comment box or a field
   * - leaves the selection alone:  copy, ⌘ A ... work as before
   * - a click on a comment's highlighted quote opens that comment in the pane again (`quoteAt()`);
   *   the pointer says so over one
   */
  wireSelection() {
    let timer = 0
    const listening = { signal: this.signal }
    document.addEventListener(
      "selectionchange",
      () => {
        clearTimeout(timer)
        timer = setTimeout(() => this.showFloating(), 120)
      },
      listening
    )
    document.addEventListener(
      "click",
      (event) => {
        if (!getSelection()?.isCollapsed) return
        if (event.target.closest?.("a, button, ui-button, input, textarea, [data-spell-added]")) return
        const hit = this.quoteAt(event.clientX, event.clientY)
        if (hit) this.openComment(hit.id)
      },
      listening
    )
    let pending = false
    document.addEventListener(
      "pointermove",
      (event) => {
        if (pending || !this.quotes.length) return
        pending = true
        requestAnimationFrame(() => {
          pending = false
          document.documentElement.classList.toggle("spell-over-quote", !!this.quoteAt(event.clientX, event.clientY))
        })
      },
      { passive: true, ...listening }
    )
    addEventListener("scroll", () => this.floating?.setAttribute("hidden", ""), { passive: true, ...listening })
    document.addEventListener(
      "keydown",
      (event) => {
        if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey || event.key.toLowerCase() !== "i")
          return
        const selected = this.selected()
        if (!selected) return
        event.preventDefault()
        this.commentOn(selected)
      },
      listening
    )
    this.signal?.addEventListener("abort", () => clearTimeout(timer), { once: true })
  }

  /** The selection, when it's text in one of the page's blocks:  `{ block, quote, offset, range }`;  else `null`. */
  selected() {
    const selection = getSelection()
    if (!selection || selection.isCollapsed || !selection.rangeCount) return null
    const range = selection.getRangeAt(0)
    const start = range.startContainer
    if (!this.main.contains(start)) return null
    const element = start.nodeType === 1 ? start : start.parentElement
    if (element?.closest("[data-spell-added], textarea, input")) return null
    const block = blockAround(start, blocksIn(this.main))
    const quote = selection.toString().trim()
    if (!block || !quote) return null
    return { block, quote, offset: offsetIn(block, start, range.startOffset), range }
  }

  /** Open the comment pane on the selection's block, its text quoted, just under the selection. */
  commentOn({ block, quote, offset, range }) {
    this.floating?.setAttribute("hidden", "")
    const rects = range.getClientRects()
    const near = rects[rects.length - 1] ?? range.getBoundingClientRect()
    const place = { ...this.placeOf(block), quote: quote.slice(0, 2000), offset }
    this.openBox({ key: `${place.anchor}~${offset}`, place }, near)
  }

  /** The quote under the point (`x`, `y`):  `{ id, rect }`, the comment's id and the line hit;  else `null`. */
  quoteAt(x, y) {
    for (const { id, range } of this.quotes) {
      const rect = Array.from(range.getClientRects()).find(
        (each) => x >= each.left && x <= each.right && y >= each.top && y <= each.bottom
      )
      if (rect) return { id, rect }
    }
    return null
  }

  /**
   * Open comment `id`'s thread (a click on its quote), and take the focus to its
   * header;  the page scrolls only as far as it must to show it.  Still being written in the pane:  back into it.
   */
  openComment(id) {
    if (this.open?.id === id && this.pane) return this.focusPane()
    if (!this.list.some((each) => each.id === id)) return
    this.folds.set(id, true)
    this.draw()
    this.markSeen(id)
    const thread = this.threadOf(id)
    thread?.header?.scrollIntoView({ block: "nearest" })
    thread?.focusFold?.()
  }

  /** Show the floating bullhorn beside a selection in a block;  hide it otherwise. */
  showFloating() {
    const selected = this.selected()
    const button = this.floatingBullhorn()
    if (!selected) return button.setAttribute("hidden", "")
    const rects = selected.range.getClientRects()
    const last = rects[rects.length - 1] ?? selected.range.getBoundingClientRect()
    button.style.left = `${Math.min(innerWidth - 36, last.right + 6)}px`
    button.style.top = `${Math.max(4, last.top - 4)}px`
    button.removeAttribute("hidden")
  }

  /** The floating bullhorn, made once (in `body`, outside `main`):  a click comments on the selection. */
  floatingBullhorn() {
    if (this.floating) return this.floating
    const tip = `Comment on this text (${/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl "}I)`
    const button = iconButton("bullhorn", tip)
    button.classList.add("spell-comment-float")
    button.hidden = true
    // keep the selection:  a press would otherwise clear it before the click
    button.addEventListener("pointerdown", (event) => event.preventDefault())
    button.addEventListener("click", () => {
      const selected = this.selected()
      if (selected) this.commentOn(selected)
    })
    document.body.append(button)
    return (this.floating = button)
  }

  ////////////////
  // ## Threads
  ////////////////

  /**
   * A comment's THREAD (Owen, 2026-10-10:  "the entire comment thread should be in one collapsable/accordion pane"):
   * its `<epic-thread>` (the epics pack), made on first use and kept for the visit, given what to show now.
   * - the element draws it all:  its header, Owen's answer, the messages, the floppy (`EpicThread.tsx`)
   * - this says what:  the comment, whether it's open, orange (`unseen()`), moved, and which of Owen's words stand in
   *   the box under it (`boxed`)
   * - its box:  Owen's REPLY BOX (`replyBoxFor()`;  Owen, 2026-10-10:  "Probably should have a comment box at the
   *   bottom for me"), or the pen's box while he edits his first words;  none once done
   * - open while it's Owen's turn (Claude spoke last), or Claude is thinking about it, or he opened it on this visit
   *   (`folds`), or he's writing in it;  else folded to its header
   * - `exact` false:  its block changed or moved since, so it says what it was on
   */
  thread({ comment, exact }) {
    let thread = this.threads.get(comment.id)
    if (!thread) {
      thread = el(THREAD_TAG, { id: `comment-${comment.id}` })
      this.wireThread(thread, comment.id)
      this.threads.set(comment.id, thread)
    }
    const editing = this.editing?.id === comment.id ? this.editing : null
    const replying = editing ?? (comment.turn === "done" ? null : this.replyBoxFor(comment))
    const writing = !!replying && (replying.busy() || !!editing)
    if (comment.turn === "done") this.replyBoxes.delete(comment.id)
    const thinking = !!comment.working && comment.turn !== "done"
    const open = writing || (this.folds.get(comment.id) ?? (comment.turn === "owen" || thinking))
    thread.comment = comment
    thread.toggleAttribute("open", open)
    // orange while it has a reply from Claude Owen hasn't answered (`unseen()`):  the whole thread, that reply stronger
    thread.toggleAttribute("unseen", this.unseen(comment))
    thread.toggleAttribute("moved", !exact)
    setOrDrop(thread, "boxed", editing ? "first" : replying?.saved() ? "pending" : undefined)
    this.showFloppy(thread, replying)
    // its box:  the reply box, or the pen's;  moved in only when it isn't there already (the cursor stays)
    const box = replying?.box
    if (box ? thread.firstElementChild !== box || thread.childElementCount !== 1 : thread.childElementCount)
      thread.replaceChildren(...(box ? [box] : []))
    return thread
  }

  /** Thread `thread`'s floppy, as Owen's box in it last saved (`replying.floppy`):  none before a save. */
  showFloppy(thread, replying) {
    setOrDrop(thread, "saved", replying?.floppy?.tip)
    thread.toggleAttribute("failed", !!replying?.floppy?.failed)
  }

  /**
   * Thread `comment`'s reply box (Owen, 2026-10-10:  "How do I reply?  Probably should have a comment box at the
   * bottom for me"):  under its messages whenever it's open, Owen's turn or Claude's, so he can always add more.
   * - it holds his PENDING reply (his last words, which Claude hasn't taken), to change;  else it's empty, and what
   *   he types is a new reply
   * - kept across redraws while he's in it, or it holds words not saved yet;  else made again from what the server
   *   holds, so Claude taking his reply empties it
   */
  replyBoxFor(comment) {
    const saved = ThreadFacts.pendingReplyOf(comment)?.text ?? ""
    const kept = this.replyBoxes.get(comment.id)
    if (kept && (kept.busy() || kept.saved() === saved)) return kept
    kept?.drop()
    const replying = this.makeBox(comment.id, "reply", saved)
    this.replyBoxes.set(comment.id, replying)
    return replying
  }

  /**
   * A reply box for comment `id`, wired by `wireReply()`.
   * - `how`:  `reply` (his reply) or `edit` (his first words);  `saved`:  the words the server holds for it
   * - the pane's field:  a `<textarea>`, no placeholder, an `aria-label` (Owen, 2026-10-10)
   * - its thread draws the floppy in its corner
   * - a native `<textarea>` this code makes and keeps, slotted into the thread:
   *   it lives through every redraw, the cursor and what's typed with it
   *   (not a `<ui-textarea>`, whose form look would have to be undone)
   */
  makeBox(id, how, saved) {
    const field = el("textarea", {
      class: "spell-comment-field",
      rows: 1,
      "aria-label": how === "edit" ? "Your comment" : "Your reply"
    })
    const replying = { id, how, box: field, field, floppy: null }
    this.wireReply(replying, saved)
    return replying
  }

  /**
   * Wire `thread`, comment `id`'s:  what Owen does on it, as it says (`<epic-thread>`'s events).
   * - its header folded or unfolded:  remembered for the visit;  unfolded, seen (`markSeen()`)
   * - his answer (its review pills):  That's good and Skip it close it, Reply puts the cursor in its box, Reopen
   * - the pen:  his first words into a box to change;  the trash:  deleted at once, Undo in the toast
   */
  wireThread(thread, id) {
    const onFold = (event) => {
      const opening = !!event.detail?.open
      this.folds.set(id, opening)
      if (!opening) return
      requestAnimationFrame(() => this.growFields())
      this.markSeen(id)
    }
    thread.addEventListener("epic-thread-opened", onFold)
    thread.addEventListener("epic-thread-closed", onFold)
    thread.addEventListener("epic-thread-answered", (event) => {
      const act = event.detail?.act
      if (act === "reply") void this.focusReply(id)
      else if (act === "reopen") void this.reopen(id)
      else if (act === "good" || act === "skip") void this.resolve(id, act)
    })
    thread.addEventListener("epic-thread-editing", () => this.startEdit(id))
    thread.addEventListener("epic-thread-removing", () => void this.remove(id))
  }

  /**
   * Close thread `id`:  `good` ("that's good") or `skip` ("skip it").  NEVER throws.
   * - It folds, with a check circle in its header and a green Done line at its end.
   * - A toast says so, with Undo (`reopen()`).
   */
  async resolve(id, how) {
    if (this.editing?.id === id && !(await this.closeEdit())) return
    // what he typed in its reply box goes first
    if (this.replyBoxes.has(id) && !(await this.replyBoxes.get(id).finish())) return
    try {
      await this.post({ action: "resolve", id, how })
      this.folds.delete(id)
      this.draw()
      let undone = false
      const undo = () => {
        if (undone) return
        undone = true
        void this.reopen(id)
      }
      noteToast(how === "skip" ? "Skipped:  nothing more to do" : "Done:  that's good", "success", {
        displayTime: UNDO_MS,
        actions: [{ text: "Undo", icon: "rotate left", click: undo }]
      })
    } catch (error) {
      noteToast(`Couldn't close the thread:  ${error.message}`, "error")
    }
  }

  /** Open thread `id` again (Reopen, the toast's Undo):  Owen's turn again, so it opens.  NEVER throws. */
  async reopen(id) {
    try {
      await this.post({ action: "reopen", id })
      this.folds.delete(id)
      this.draw()
    } catch (error) {
      noteToast(`Couldn't reopen the thread:  ${error.message}`, "error")
    }
  }

  /** POST `change` to the comments route for this page, and keep the list it answers;  throws what `ServerLink.forPage().post()` does. */
  async post(change, options) {
    const answer = await ServerLink.forPage().post(COMMENTS_API, { page: location.pathname, ...change }, options)
    this.list = answer.comments ? ThreadFacts.withTurns(answer.comments) : this.list
    this.keepSend(answer)
    return answer
  }

  ////////////////
  // ## The reply box
  ////////////////

  /**
   * The cursor into thread `id`'s reply box, at the end (Revisit:  "reply");  the thread opens, and the page scrolls
   * only as far as it must to show it.  The pen's box open on it:  that one.
   * - once the thread has drawn its body:  a thread just opened shows its box on the next frame
   */
  async focusReply(id) {
    this.folds.set(id, true)
    this.draw()
    await nextFrame()
    const replying = this.editing?.id === id ? this.editing : this.replyBoxes.get(id)
    const field = replying?.field
    if (!field?.isConnected) return
    growField(field)
    field.scrollIntoView({ block: "nearest" })
    field.focus({ preventScroll: true })
    field.setSelectionRange(field.value.length, field.value.length)
  }

  /**
   * The pen:  edit his first words on thread `id` while Claude hasn't had them, in a box that stands in for them
   * (and for the thread's reply box), the cursor in it.  Another one open is saved and closed first.
   */
  startEdit(id) {
    if (this.editing?.id === id) return void this.focusReply(id)
    void this.closeEdit()
    const comment = this.list.find((each) => each.id === id)
    if (!comment) return
    this.editing = this.makeBox(id, "edit", comment.text)
    void this.focusReply(id)
  }

  /**
   * Save and close the pen's box, if open;  resolves to whether it closed.
   * - Emptied, the comment goes (Undo in the toast).
   * - A save that failed keeps it open, and says why in a toast.
   */
  async closeEdit() {
    const editing = this.editing
    if (!editing) return true
    if (!(await editing.finish())) {
      noteToast(editing.floppy?.tip ?? "Not saved", "error")
      return false
    }
    if (this.editing === editing) this.editing = null
    this.draw()
    return true
  }

  /**
   * Wire reply box `replying` (`makeBox()`);  `saved`:  the words the server holds for it.
   * - saves itself as Owen types, `COMMENT_SAVE_MS` after he stops, as the pane does (a `DraftSaver`:  a failed save
   *   tried again every 3s):
   *   his reply (`reply`;  emptied, his pending reply goes), or his first words (`edit`)
   *   - the floppy says how the last save went
   * - FOCUS LEAVING it (Tab, a click elsewhere):
   *   a reply box saves at once, an emptied pending reply going;  the pen's box closes
   *   - Owen, 2026-10-10:  "Tabbing out ... saves it automatically.  If it's empty, delete it"
   * - NEVER an empty comment:  his first words emptied go only as the pen's box closes (`remove()`, Undo in its toast),
   *   so clearing them to type afresh never loses the thread
   * - a draft is kept in this browser while what's typed differs from what's saved (`<id>~<how>`)
   * - Escape, or ⌘ / Ctrl Enter:  saved, and the cursor leaves it (the pen's box closes)
   * - `busy()`:  Owen is in it, or it holds words not saved yet:  a redraw keeps it as it is
   */
  wireReply(replying, saved) {
    const { id, how, box, field } = replying
    const slot = `${id}~${how}`
    // how the last save went, shown by the thread the box is in (its floppy)
    const showFloppy = (floppy) => {
      replying.floppy = floppy
      const thread = this.threads.get(id)
      if (thread && box.parentElement === thread) this.showFloppy(thread, replying)
    }
    field.value = readJSON(this.draftKey)[slot] ?? saved
    const keep = () => {
      const drafts = readJSON(this.draftKey)
      if (field.value.trim() !== saved) drafts[slot] = field.value
      else delete drafts[slot]
      writeJSON(this.draftKey, drafts)
    }
    const drafts = new DraftSaver({
      wait: COMMENT_SAVE_MS,
      save: async ({ keepalive }) => {
        const words = field.value.trim()
        if (words === saved || (!words && how === "edit")) return
        await this.post({ action: how, id, text: words }, { keepalive })
        saved = words
        keep()
        showFloppy(words ? { tip: savedTip() } : null)
        // whose turn it is changed:  its header's buttons with it
        if (this.replyBoxes.get(id) === replying || this.editing === replying) this.draw()
      },
      onChange: () => {
        if (drafts.state.kind === "failed") showFloppy({ tip: notSavedTip(drafts.state.why), failed: true })
      }
    })
    // a draft kept in this browser differs from what's saved:  the next save sends it
    drafts.isUnsaved = field.value.trim() !== saved
    const saveNow = () => drafts.save()
    replying.saved = () => saved
    replying.busy = () =>
      document.activeElement === field || field.value.trim() !== saved || drafts.isPending || drafts.isUnsaved
    replying.drop = () => drafts.stop()
    replying.finish = async () => {
      if (how === "edit" && !field.value.trim()) {
        drafts.stop()
        this.forget(slot)
        if (this.editing === replying) this.editing = null
        await this.remove(id)
        return true
      }
      const ok = await saveNow()
      if (ok) this.forget(slot)
      return ok
    }
    // the page is going:  a request that outlives it
    replying.flush = () => void drafts.save({ keepalive: true })
    field.addEventListener("input", () => {
      growField(field)
      keep()
      drafts.changed()
    })
    field.addEventListener("keydown", (event) => {
      const leaving = event.key === "Escape" || (event.key === "Enter" && (event.metaKey || event.ctrlKey))
      if (!leaving) return
      event.preventDefault()
      event.stopPropagation()
      if (how === "edit") void this.closeEdit()
      else field.blur()
    })
    field.addEventListener("blur", () => {
      // a redraw moves the box, and takes the cursor back into it;  another window or tab keeps it here:
      // only a real leave counts
      setTimeout(() => {
        if (!box.isConnected || document.activeElement === field) return
        if (how === "edit") {
          if (this.editing === replying) void this.closeEdit()
        } else if (this.replyBoxes.get(id) === replying) void saveNow()
      })
    })
  }

  ////////////////
  // ## Deleting
  ////////////////

  /**
   * Delete comment `id`, whatever its state, at once:  gone from the inbox, its thread and highlight with it.
   * NEVER throws.
   * - a toast says so, with Undo for `UNDO_MS` (Owen, 2026-10-10:  "didn't know it needed two clicks")
   * - while it waits for Claude:  `delete`;  once Claude has it:  `clear` (a taken one stays in its epic)
   * - its pane or reply box, if open, closes;  any draft of it is forgotten
   */
  async remove(id) {
    const action = this.waiting(id) ? "delete" : "clear"
    const was = this.list.find((each) => each.id === id)
    try {
      await this.post({ action, id })
      this.forget(id)
      this.forget(`${id}~reply`)
      if (this.editing?.id === id) this.editing = null
      this.replyBoxes.get(id)?.drop()
      this.replyBoxes.delete(id)
      if (this.open?.id === id) this.closePane()
      else this.draw()
      let undone = false
      const undo = () => {
        if (undone) return
        undone = true
        void this.restore(was)
      }
      noteToast("Comment deleted", "success", {
        displayTime: UNDO_MS,
        actions: was ? [{ text: "Undo", icon: "rotate left", click: undo }] : undefined
      })
    } catch (error) {
      noteToast(`Couldn't delete the comment:  ${error.message}`, "error")
    }
  }

  /**
   * Undo a delete:  comment `was` (as the server last gave it) back as it was, on its block, its quote highlighted
   * again;  its id the same unless a new comment took it meanwhile (the server's `restore`).  NEVER throws.
   */
  async restore(was) {
    try {
      const { id, ...comment } = was
      await this.post({ action: "restore", id, comment })
      this.draw()
    } catch (error) {
      noteToast(`Couldn't bring the comment back:  ${error.message}`, "error")
    }
  }

  ////////////////
  // ## The comment pane
  ////////////////

  /**
   * Open the comment pane for `open` (`{ key, place }`):  a NEW comment on `place`'s block (`quote`:  on that text).
   * - just under `near`, a `DOMRect`:  the selection's last line, the button clicked
   * - once saved and closed, it's a thread (`thread()`);  until then its thread isn't drawn
   * - only one is open:  opening another saves what's typed in this one, then closes it
   * - the same one again:  the cursor goes back into it, where Owen put it
   * - the page never scrolls (Owen, 2026-10-10:  "don't scroll the page and lose context!")
   */
  openBox(open, near) {
    if (this.pane && this.open?.key === open.key) return this.focusPane()
    void this.open?.finish?.()
    this.pane?.remove()
    this.open = open
    this.draw()
    this.showPane(near)
  }

  /** Close the pane, and draw the comments again (the comment it wrote shows as a thread). */
  closePane() {
    this.pane?.remove()
    this.pane = null
    this.open = null
    this.draw()
  }

  /**
   * Put the pane on the screen under `near`, else above it when there's no room below, never past the window's
   * edges;  the cursor in its field.
   * - an `<epic-comment-pane>` (the epics pack), which places itself under `near` and Owen drags;
   *   its field is a `<textarea>` this code makes, slotted into it
   * - fixed on the screen, in `main` (where the comments' styles reach):  the page scrolls under it
   * - the cursor goes in once the pane has drawn (it upgrades as the pack registers)
   */
  showPane(near) {
    const open = this.open
    const field = el("textarea", { class: "spell-comment-field", rows: 3, "aria-label": "Your comment" })
    const pane = (this.pane = el(
      PANE_TAG,
      {
        "data-spell-added": true,
        headline: ThreadFacts.headline(open.place),
        about: ThreadFacts.aboutTip(open)
      },
      field
    ))
    pane.near = near ? { left: near.left, top: near.top, bottom: near.bottom } : undefined
    this.wirePane(pane, field, open)
    this.main.append(pane)
    void drawn(pane).then(() => {
      if (this.pane !== pane) return
      growField(field)
      this.focusPane()
    })
  }

  /** The cursor into the open pane's field, at the end;  no scrolling. */
  focusPane() {
    const field = this.pane?.querySelector(":scope > textarea")
    if (!field) return
    field.focus({ preventScroll: true })
    field.setSelectionRange(field.value.length, field.value.length)
  }

  /**
   * Wire pane `pane` and its `field`, for `open` (`openBox()`'s).
   * - × or Escape closes it (⌘ / Ctrl Enter too, in the field), saving what's typed first
   * - so does the focus leaving it (Tab, a click elsewhere):  emptied, the comment goes
   * - the trash deletes the comment, one click, Undo in its toast;  shown once it's saved
   * - the field has no placeholder (Owen, 2026-10-10:  "remove the 'Anything:  a correction...' placeholder")
   */
  wirePane(pane, field, open) {
    const close = this.wireField(pane, field, open)
    pane.addEventListener("epic-comment-closing", () => void close())
    pane.addEventListener("keydown", (event) => {
      const closing = event.key === "Escape" || (event.key === "Enter" && (event.metaKey || event.ctrlKey))
      if (!closing) return
      event.preventDefault()
      event.stopPropagation()
      void close()
    })
    // focus leaving the pane (Tab, a click elsewhere):  closed as × closes it,
    // so what's typed is saved, and an emptied comment goes, with no Undo
    // - Owen, 2026-10-10:  "Tabbing out of a bullhorn modal saves it automatically.  If it's empty, delete it"
    // - another window or tab keeps the focus here:  it stays open
    // - its own buttons (in its shadow root) count as in it:  the focus there is the pane's
    pane.addEventListener("focusout", () => {
      setTimeout(() => {
        if (this.pane !== pane || pane.contains(document.activeElement)) return
        void close()
      })
    })
    pane.addEventListener("epic-comment-removing", () => void (open.discard ? open.discard() : this.remove(open.id)))
  }

  /**
   * Wire the pane's field for `open`;  returns what closes it.
   * - saves itself as Owen types, `COMMENT_SAVE_MS` after he stops (a `DraftSaver`:  a failed save tried again
   *   every 3s):  the first save adds the comment, the next ones edit it;  the floppy says how the last one went
   *   - Owen, 2026-10-10:  "Save should just happen as I type"
   * - NEVER an empty comment (Owen, 2026-10-10:  "don't save an empty bullhorn comment"):
   *   - nothing typed (or only spaces) saves nothing
   *   - emptied, a saved one goes at once (`delete`, else `clear`);  the trash deletes it
   * - a DRAFT is kept in this browser (`COMMENT_DRAFT_KEY_PREFIX`) only while what's typed differs from what the server
   *   holds:  under the comment's id once it has one, else under the pane's `key`.
   *   - So a reload never brings back, as a NEW comment, text already saved.
   *     Before 2026-10-10 it did, and closing the pane at once saved that text a second time.
   *   - A new comment's draft that copies a comment already on its block is dropped (`draftOf()`).
   * - leaving the page (`pagehide`):  what's typed and not saved yet goes at once (`flush()`)
   */
  wireField(pane, field, open) {
    const { key, place } = open
    // the floppy, in the pane's header, says how the last save went;  `floppy`:  its tooltip then
    let floppy = ""
    // what the server holds;  one save at a time, in order, so a quick typist never adds the comment twice
    let saved = (open.text ?? "").trim()
    // deleted with the trash:  nothing more is saved
    let gone = false
    // where its draft is kept
    const slot = () => open.id ?? key
    field.value = this.draftOf(open) ?? open.text ?? ""
    // keep what's typed as the draft while it differs from what's saved;  else none (`before`:  its old slot)
    const keep = (before = slot()) => {
      const drafts = readJSON(this.draftKey)
      delete drafts[before]
      const words = field.value.trim()
      if (words && words !== saved) drafts[slot()] = field.value
      else delete drafts[slot()]
      writeJSON(this.draftKey, drafts)
    }
    const save = async ({ keepalive }) => {
      const words = field.value.trim()
      if (gone || words === saved) return
      if (!words && !open.id) return
      const change = !words
        ? { action: this.waiting(open.id) ? "delete" : "clear", id: open.id }
        : open.id
          ? { action: "edit", id: open.id, text: words }
          : { action: "add", ...place, text: words }
      const answer = await ServerLink.forPage().post(
        COMMENTS_API,
        { page: location.pathname, ...change },
        { keepalive }
      )
      const before = slot()
      open.id = words ? (open.id ?? answer.id) : undefined
      saved = words
      this.list = answer.comments ? ThreadFacts.withTurns(answer.comments) : this.list
      this.keepSend(answer)
      keep(before)
      floppy = words ? savedTip() : ""
      setOrDrop(pane, "saved", floppy || undefined)
      pane.removeAttribute("failed")
      pane.toggleAttribute("deletable", !!open.id)
      // its highlight on the page, at once;  its thread waits until the pane closes
      if (this.open === open) this.draw()
    }
    const drafts = new DraftSaver({
      wait: COMMENT_SAVE_MS,
      save,
      onChange: () => {
        if (drafts.state.kind !== "failed") return
        floppy = notSavedTip(drafts.state.why)
        pane.setAttribute("saved", floppy)
        pane.setAttribute("failed", "")
      }
    })
    // a draft kept in this browser differs from what's saved:  the next save sends it
    drafts.isUnsaved = field.value.trim() !== saved
    const saveNow = () => drafts.save()
    open.finish = async () => {
      if (!(await saveNow())) return false
      this.forget(slot())
      this.forget(key)
      return true
    }
    // the page is going:  a request that outlives it
    open.flush = () => void drafts.save({ keepalive: true })
    open.discard = async () => {
      drafts.stop()
      // a save on its way first:  it may bring the comment's id
      await drafts.settled
      gone = true
      this.forget(slot())
      this.forget(key)
      if (open.id) return this.remove(open.id)
      if (this.open === open) this.closePane()
    }
    field.addEventListener("input", () => {
      growField(field)
      keep()
      drafts.changed()
    })
    field.addEventListener("blur", () => void saveNow())
    return async () => {
      if (!(await open.finish())) return noteToast(floppy, "error")
      if (this.open === open) this.closePane()
    }
  }

  /**
   * The draft kept for `open`'s pane (`wireField()`), or `undefined`:  none, blank, or (a new comment's) a copy of a
   * comment already on its block, which is dropped.
   */
  draftOf(open) {
    const slot = open.id ?? open.key
    const draft = readJSON(this.draftKey)[slot]
    if (typeof draft !== "string" || !draft.trim()) return undefined
    const { anchor, quote } = open.place
    const copy =
      !open.id &&
      this.list.some(
        (each) => each.anchor === anchor && (each.quote ?? "") === (quote ?? "") && each.text === draft.trim()
      )
    if (!copy) return draft
    this.forget(slot)
    return undefined
  }

  /** Whether comment `id` is still `new` (Claude hasn't had it), as the server last answered:  Owen may delete it. */
  waiting(id) {
    const comment = this.list.find((each) => each.id === id)
    return !comment || comment.status === "new"
  }

  /** Drop the draft under `key`. */
  forget(key) {
    const drafts = readJSON(this.draftKey)
    delete drafts[key]
    writeJSON(this.draftKey, drafts)
  }
}

/**
 * A docs page's Send's tooltip (`drawSend()`):  what a click sends, and to which epic;  or why it sends nothing.
 * - `state`:  `unsent`, `sent` or `idle`
 */
function sendWords({ epic, unsent, waiting }, state) {
  const count = (n) => `${n} comment${n === 1 ? "" : "s"}`
  if (state === "unsent") return `Send ${count(unsent.length)} to epic ${epic}`
  if (state === "sent") return `Sent to ${epic}:  ${count(waiting.length)} waiting for Claude`
  return "Nothing to send:  no comment here is waiting for Claude"
}

/**
 * Who is listening, beside a docs page's Send (`drawSend()`):  `python-target is listening`, `nobody is listening`.
 * - a page no epic owns names the standing epic its comments go to (epic `epic-engine` T9):
 *   `feedback is listening`, `nobody is listening:  Send wakes feedback`
 */
function whoLabel({ epic, owned, wakes, listening }) {
  if (listening) return `${epic} is listening`
  if (owned) return "nobody is listening"
  return wakes ? `nobody is listening:  Send wakes ${epic}` : "no epic owns this page"
}

/** The tooltip of who is listening, beside a docs page's Send (`drawSend()`):  where its comments go, and when. */
function whoWords({ epic, owned, wakes, listening }) {
  const where = owned
    ? `epic ${epic}`
    : `epic ${epic}, the standing epic for every page no epic owns (no epic's See Also lists this one)`
  if (listening) return `A Claude session is reviewing ${where}:  Send hands it these comments now`
  if (wakes) return `No Claude session is reviewing ${where}:  Send wakes its session`
  return `No epic's See Also lists this page, and epic ${epic} isn't made yet:  /airplane land gathers its comments`
}

/** The first line of `words`, cut to a short line with `…`. */
export function firstWords(words) {
  const line = String(words ?? "")
    .split("\n")[0]
    .trim()
  return line.length > 60 ? `${line.slice(0, 60).trimEnd()}…` : line
}

/**
 * Where a quote's thread goes (Owen, 2026-10-10:  "show them under the paragraph where they were defined"):  the
 * smallest paragraph, list item, cell ... (`TEXT_HOLDERS`) in `block` holding the quote (`quoted`:  `quoteIn()`'s);
 * else `block` itself.
 * - never inside an element that would hide it:  one drawing its children in a shadow root with no default slot
 */
function holderOf(block, { start, end }) {
  try {
    const range = document.createRange()
    range.setStart(...start)
    range.setEnd(...end)
    const node = range.commonAncestorContainer
    const holder = (node.nodeType === 1 ? node : node.parentElement)?.closest(TEXT_HOLDERS)
    if (!holder || holder === block || !block.contains(holder)) return block
    const shadow = holder.parentElement?.shadowRoot
    if (shadow && !shadow.querySelector("slot:not([name])")) return block
    return holder
  } catch {
    return block
  }
}

/**
 * Highlight each quote's text on the page:  softly once Claude has had it (`QUOTE_HIGHLIGHT`), purple while it waits
 * for him (`QUOTE_WAITING_HIGHLIGHT`);  returns each one's range, by comment id (`[{ id, range }]`), for a click to
 * find.  Not highlighted where the browser can't, but still found.
 */
function highlightQuotes(quotes) {
  const found = quotes.flatMap(({ id, start, end, waiting }) => {
    try {
      const range = document.createRange()
      range.setStart(...start)
      range.setEnd(...end)
      return [{ id, range, waiting }]
    } catch {
      return []
    }
  })
  if (globalThis.Highlight && globalThis.CSS?.highlights) {
    const ranges = (waiting) => found.filter((each) => !!each.waiting === waiting).map(({ range }) => range)
    CSS.highlights.set(QUOTE_HIGHLIGHT, new Highlight(...ranges(false)))
    CSS.highlights.set(QUOTE_WAITING_HIGHLIGHT, new Highlight(...ranges(true)))
  }
  return found
}

/** How long the toast saying a comment was deleted offers Undo, ms. */
const UNDO_MS = 6000

/**
 * A control the comments draw (epic `epic-engine` I26;  Owen, 2026-10-19:  "Why are we not using <ui-xxxx> ...
 * components for these pages?"):  a `<ui-button appearance="circular basic" size="mini">` with `icon`, never a raw `<button>`, so
 * the component centres its icon;  `tip` its tooltip and name, on the inner button too (`titleInside()`).
 * - `size`:  another size (Send's pill:  `tiny`, as the New epic pill)
 */
export function iconButton(icon, tip, { size = "mini" } = {}) {
  const button = el("ui-button", { appearance: "circular basic", size, icon, title: tip, "aria-label": tip })
  titleInside(button)
  return button
}

/** A docs section's first child in its body (not its slotted icon, header or actions);  `null` for none. */
function firstContentChild(section) {
  return Array.from(section.children).find((child) => !child.hasAttribute("slot")) ?? null
}

/** The epics pack's tags this draws (`<epic-thread>` ...):  each upgrades as the pack registers. */
const THREADS_TAG = "epic-threads"
const THREAD_TAG = "epic-thread"
const PANE_TAG = "epic-comment-pane"
const SEND_BUTTONS_TAG = "epic-send-buttons"

/** `<epic-send-buttons>`' ask to send:  a press on its plane, or its countdown running out. */
const SEND_ASKED = "epic-send-saving"

/** The room a thread's header leaves on its right for a corner bullhorn above it (`makeRoom()`;  `EpicThread.css`). */
const HEAD_ROOM = "--epic-thread-head-room"

/** Put `child` at index `at` of `box`'s children, moving it only when it isn't there already (the cursor stays). */
function placeAt(box, child, at) {
  const there = box.children[at]
  if (there !== child) box.insertBefore(child, there ?? null)
}

/** Set `element`'s attribute `name` to `value`;  `undefined`:  take it away. */
function setOrDrop(element, name, value) {
  if (value === undefined) element.removeAttribute(name)
  else if (element.getAttribute(name) !== value) element.setAttribute(name, value)
}

/** Resolves once `element` (one of the pack's) is defined and has drawn.  NEVER rejects. */
async function drawn(element) {
  await customElements.whenDefined(element.localName)
  await element.ready?.catch(() => undefined)
}

/** The floppy's tooltip once saved:  `Saved 14:02 · waiting for Claude`. */
function savedTip() {
  return `Saved ${ThreadFacts.localStamp(new Date().toISOString()).slice(11)} · waiting for Claude`
}

/** The floppy's tooltip when a save failed:  why, and that the words are kept. */
function notSavedTip(why) {
  return `Not saved:  ${why} (kept in this browser)`
}

/** Each bullhorn's block (`addBullhorn()`):  what `draw()` checks a kept one against. */
const bullhornBlocks = new WeakMap()

/**
 * Does bullhorn `mark` still stand by `block`:  in its title row (a child of it), the page header's tools, or the
 * actions row just before it (`addBlockAction()`)?
 */
function standsBy(mark, block) {
  if (!mark.isConnected || !block.isConnected) return false
  if (mark.parentElement === block || mark.classList.contains("at-page")) return true
  const row = mark.closest(BLOCK_ROW)
  return Boolean(row) && row.nextElementSibling === block
}
