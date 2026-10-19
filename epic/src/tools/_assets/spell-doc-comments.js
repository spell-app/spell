/*
 * COMMENTS on a docs page or an epic page:  the bullhorns, the comment pane, the threads, a docs page's Send
 * (epic `airplane` P11;  `wireComments()` below says it all).
 * - Its own module since epic `epic-engine` P2 (T3), so two scripts carry it:
 *   - the docs bundle, `spell-ui.js`, through the page runtime (`spell-doc-runtime.js`):  guides, epic pages ...
 *   - `spell-comments.js` by itself (`spell-comments.entry.js`), on Epic UI's pages:  they load Spell UI's site
 *     bundle, not the docs bundle, so nothing else of the runtime;  it draws with the page's own Spell UI
 * - Plain DOM:  it makes `<ui-*>` markup and lets the page's Spell UI draw it, never imports Spell UI itself.
 * - Its look:  `spell-comments.css`, beside it.
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
} from "../BlockAnchors.js"
import { takenInto } from "$/epics/tool/CommentList"
import {
  attr,
  beforeToolbar,
  growField,
  noteToast,
  postJSON,
  readJSON,
  shortStamp,
  text,
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
 * `localStorage` key prefix of the Claude replies Owen has SEEN on a page (`{ [comment id]: time of the latest
 * Claude reply seen }`), per page.  The store the news-only cards kept before threads, read the same way:  a time
 * at or after the latest reply means seen.
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

/** How long after Owen stops typing the comment box saves itself, ms. */
const COMMENT_SAVE_MS = 600

/** How many characters of the selected text (or the block's) the comment box's header shows. */
const HEADLINE_CHARS = 40

/** How long after the page's content changes (an epic page's part loading) the comments draw again, ms. */
const REDRAW_MS = 150

/**
 * How often a docs page with a Send asks again who is listening, ms:  the server calls a session gone once its
 * heartbeat is 90s old (`ReviewInbox` `LISTEN_STALE_MS`), with no file change to announce it.
 */
const SEND_POLL_MS = 30_000

/**
 * The blocks with a title row and an `actions` slot in it (epic `epic-workflow` P25):  their bullhorn goes in that
 * slot, after the title and before their own buttons (review pills, the date, the fold), never over them.
 * - an epic page's item, update (drawn as a block, with its date), aside and code block:
 *   `Fold.types.ts`, in the epics pack
 * - a docs section has its own (`ui-section`'s `actions` slot, `.at-section`);  every other block (a paragraph, a
 *   table, a list, a message, cards, a phase's field, the summary) has no title row:  its bullhorn sits over its
 *   corner (`.at-block`)
 */
const TITLE_ROW_BLOCKS = "epic-item, epic-update[at], epic-aside, epic-code"

/** What a block kind is called in the bullhorn's tooltip and the comment box. */
const KIND_NAMES = {
  section: "section",
  item: "item",
  field: "field",
  update: "update",
  summary: "summary",
  prose: "paragraph",
  table: "table",
  aside: "aside",
  code: "code block",
  message: "message",
  cards: "cards",
  steps: "steps",
  list: "list",
  page: "page"
}

/**
 * COMMENTS (epic `airplane`, P11):  Owen's comments for Claude, on a page's blocks or on text he selected, kept by
 * the page server (`commentsRoutes.ts`):  a docs page's in its inbox file (`<page>.inbox.json5`), an epic page's in the
 * epic's review inbox.  No Claude, no network:  only the page server, so it works on a plane.
 * - served by the page server with a token, on a page that takes comments (the `GET` says `takesComments`):
 *   - a BULLHORN beside every major block (`BlockAnchors.js` `blocksIn()`:  sections, tables, asides, code,
 *     messages, cards, steps, top-level lists;  an epic page's items, phase fields, summary and Overview prose) and in
 *     the page header (the whole page):  shown while the block is hovered
 *     - in the block's title row, when it has one:  a docs section's, an epic page item's, update's, aside's or code
 *       block's (their `actions` slot);  else over the block's top right corner
 *   - SELECTED TEXT:  ⌘ / Ctrl I, or the bullhorn that floats beside the selection:  the box opens for that block,
 *     its header the text's first words;  the comment keeps the quote, highlighted on the page while it exists
 *   - the box is a small PANE, fixed on the screen, just under the selection (or the button clicked):  the page
 *     never scrolls, and Owen drags it by its header (Owen, 2026-10-10:  "a little floating pane below the selected
 *     text that I can move around -- don't scroll the page and lose context!")
 *   - in it:  a header (the first words, a floppy, a trash once saved, ×) and a textarea that grows, with no
 *     placeholder;  ivory, no buttons below (Owen, 2026-10-10);  it saves itself as Owen types, the floppy says so;
 *     ×, Escape or the focus leaving it (Tab, a click elsewhere) closes it;  what's typed and not saved yet is kept
 *     in this browser (`COMMENT_DRAFT_KEY_PREFIX`)
 *   - NEVER an empty comment:  nothing typed saves nothing;  emptied, it's deleted at once
 *   - the pane is for writing a NEW comment;  once saved and closed, it's a THREAD (below)
 *   - THREADS (Owen, 2026-10-10:  "the entire comment thread should be in one collapsable/accordion pane"):  every
 *     comment shows as one, folding, under the paragraph (list item, cell ...) holding its quote (`holderOf()`), else
 *     under its block (`thread()`)
 *     - all ivory, the pane's outline and corners, whoever spoke last;  its edges an epic page item's note box's, else
 *       the block's it's under (spell-comments.css)
 *     - its header:  a chevron, the bullhorn (a check circle once done), the pane's summary (`headline()`), then
 *       Owen's answer while it's his turn (Claude spoke last):  the epic page's review pills, Approve / Revisit /
 *       the x, as "that's good" / reply / "skip it";  Reopen once done;  the trash, always
 *     - the messages in order, a bold "You:" / "Claude:" first:  his plain on the ivory, Claude's in a light violet
 *       box;  each one's time in its top right corner (the first's with the day);  then a green Done line once
 *       closed;  "Claude: thinking…" last while Claude is at work on it (`working`)
 *     - open while it's Owen's turn, or Claude is thinking, or he opened it;  else folded to its header
 *     - a REPLY BOX last while it's open, saved as he types (`reply`), and as the focus leaves it;  Revisit puts
 *       the cursor in it;  the pen edits his first words while Claude hasn't had them
 *   - a click on a highlighted quote opens its thread
 *   - the trash, on a thread or the pane:  one click (`delete` while it waits, else `clear`);  Undo in the toast
 *   - the BULLHORN only ever starts a new comment:  no count, since the block's threads are right there (Owen,
 *     2026-10-10:  "Bullhorn to the far right is unnecessary")
 * - IDS (epic `epic-workflow` P23;  Owen, 2026-10-10:  "use `M3` for mark 1"):  shown `M3`, small and muted in each
 *   thread's header, before its summary (`threadHead()`);  the server keys them `m3`, and a typed id takes `M3`,
 *   `m3` or `cm3` (`commentNumber()`)
 * - JUMPING to the threads waiting on Owen (Claude spoke last;  Owen, 2026-10-10:  "Is there a way to jump to comments
 *   in replies?"):
 *   - a BULLHORN at the right of the page's toolbar, an orange count of them on it:  each click lands on the next, in
 *     page order, round again after the last, opened, below the stuck titles (`nextWaiting()`);  none:  hidden
 *   - Cmd / Ctrl + K takes a comment's id, and lists them (`openJumpPrompt()`)
 * - drawn again after a live patch (`spell-doc:updated`), when the page's content changes (an epic page's part
 *   loading), when the inbox file changes (`spell-server:file`:  another window, Claude), and when the page comes
 *   back into view
 * - what it adds in `main` carries `data-spell-added`:  a patch steps around it, the anchors never count it
 * - NEVER throws:  a page with no server, or a server without the routes, shows no bullhorns
 * - options:
 *   - `go(id)`:  lands on an id as a link to it does (the runtime's `wireAnchors()`);  without it, the browser's
 *     `scrollIntoView()`
 *   - `fitToolbar(toolbar)`:  fits the toolbar's titles again once its bullhorn shows or hides (the runtime's
 *     `fitTitles()`)
 *   - `signal`:  an `AbortSignal` that takes it all down again (Epic UI's pages, whose `main` the site's router swaps
 *     for the next page's:  `spell-comments.entry.js`):  every listener, observer and timer, the floating bullhorn;
 *     what's typed and not saved yet is sent first, as on leaving the page
 */
export async function wireComments(main, { go, fitToolbar, signal } = {}) {
  if (!window.SPELL_SERVER?.token || location.protocol === "file:") return
  const comments = new PageComments(main, { go, fitToolbar, signal })
  if (!(await comments.load()) || signal?.aborted) return
  pageComments = comments
  comments.draw()
  const reload = () => void comments.load().then((takes) => takes && !signal?.aborted && comments.draw())
  const listening = { signal }
  addEventListener("spell-doc:updated", () => comments.draw(), listening)
  addEventListener(
    "spell-server:file",
    (event) => {
      if (comments.inboxPaths.includes(decodeURIComponent(event.detail?.path ?? ""))) reload()
    },
    listening
  )
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && reload(), listening)
  // a docs page's Send says who is listening:  a session that stopped leaves no file change, only an old heartbeat
  const poll = setInterval(() => comments.send && document.visibilityState === "visible" && reload(), SEND_POLL_MS)
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
      clearInterval(poll)
      sizes?.disconnect()
      comments.stop()
      if (pageComments === comments) pageComments = null
    },
    { once: true }
  )
}

/**
 * The URL paths the page server may announce inbox file `inbox` (`<page>.inbox.json5`) by:  it, and the same without
 * a worktree's prefix (`/worktrees/<w>/`:  a shared folder's changes come without it);  each by its old name too,
 * `.inbox.json`.
 */
function inboxPathsOf(inbox) {
  const paths = [inbox, inbox.replace(/^\/worktrees\/[^/]+(?=\/)/, "")]
  return [...new Set([...paths, ...paths.map((path) => path.replace(/\.json5$/, ".json"))])]
}

/****************
 * ### `PageComments`
 * One page's comments:  what the server holds, drawn under their blocks;  the one comment pane open;  the floating
 * bullhorn of a text selection.
 * - `list`:  the comments as the server last answered;  every write answers the whole list, which is drawn again
 * - NEVER throws:  a failed save says so (the floppy turns red), the text kept in the pane
 ****************/
class PageComments {
  /**
   * - `main`:  the page's `main`, where the blocks are
   * - `go(id)`:  lands on the element with `id` as a link to it does (`wireAnchors()`), resolving once landed
   * - `fitToolbar(toolbar)`, `signal`:  as `wireComments()` takes them
   */
  constructor(main, { go, fitToolbar, signal } = {}) {
    /** the page's `main` */
    this.main = main
    /** lands on an id as a link does */
    this.go = go
    /** fits the toolbar's titles again, once its bullhorn shows or hides */
    this.fitToolbar = fitToolbar
    /** takes it all down again (`stop()`):  every listener added with it */
    this.signal = signal
    /** what `watchContent()` watches the page's content with */
    this.contentWatch = null
    /** the thread the toolbar's bullhorn last landed on (`nextWaiting()`):  the next click goes on from it */
    this.lastWaiting = ""
    /** the comments, as the server last answered (`CommentList` `all`) */
    this.list = []
    /**
     * the pane open for a NEW comment, if any:  `{ key, place, id?, finish? }` (`place`:  `{ anchor, kind, label,
     * excerpt, quote? ... }`;  `id`, once its first save made it;  `finish()`:  saves what's typed, then forgets its
     * draft)
     */
    this.open = null
    /** the open pane's element (`showPane()`), in `main` but fixed on the screen:  a redraw never touches it */
    this.pane = null
    /**
     * each open thread's REPLY BOX, by comment id (`replyBoxFor()`):  `{ id, how: "reply", box, field, saved(),
     * busy(), finish(), flush() }`;  `box`:  its element, kept across redraws while Owen is in it or it holds words
     * not saved yet
     */
    this.replyBoxes = new Map()
    /**
     * the pen's box, editing his first words while Claude hasn't had them (`startEdit()`), if open:  as a reply box,
     * `how: "edit"`;  it stands in for the thread's reply box meanwhile
     */
    this.editing = null
    /** each quote's range on the page, by comment id (`highlightQuotes()`):  a click on one opens its thread */
    this.quotes = []
    /** each thread's fold, by comment id, as the reader left it on this visit;  else open while it's Owen's turn */
    this.folds = new Map()
    const page = decodeURIComponent(location.pathname)
    /**
     * the URL paths of the inbox files the comments may be in, as the page server announces their changes:  a
     * worktree's page (`/worktrees/<w>/epics/...`) is in a shared folder, whose changes it announces without that
     * prefix;  each by its old name too, `.inbox.json`, which a checkout on older code writes (epic `epic-workflow`
     * P21)
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
   * Whether `comment` is ORANGE:  Claude spoke last and Owen hasn't answered yet (✓, a reply, ×).  Looking at it
   * doesn't clear it (Owen, 2026-10-10:  "I was expecting this to be orange, not ivory");  `markSeen()` only records
   * the reply as read.  Never once it's done.
   */
  unseen(comment) {
    // orange while it's Owen's turn, seen or not, until he answers (✓, a reply, ×):  Owen, 2026-10-10, on a thread
    // gone ivory once looked at:  "I was expecting this to be orange, not ivory"
    return comment.turn === "owen" && !!latestClaudeAt(comment)
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
    if ((read[id] ?? "") >= latestClaudeAt(comment)) return
    read[id] = latestClaudeAt(comment)
    writeJSON(this.readKey, read)
    this.draw()
  }

  /**
   * Watch the open threads with an unseen reply:  one on screen (half of it, or half the screen) for `SEEN_MS` while
   * the page is in view is seen (`markSeen()`).
   */
  watchSeen() {
    this.seenWatch?.disconnect()
    const threads = this.main.querySelectorAll(".spell-thread[data-unseen][data-open]")
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
   * Keep a corner bullhorn off a thread's buttons (Owen, 2026-10-10:  "Overlap in bullhorn buttons"):  a block with no
   * title row has its bullhorn over its top right corner (`.at-block`), so a thread just under a short block (a
   * one-line paragraph) can lie under it:  that thread's header leaves room on its right, its buttons moving left.
   * - a block with a title row has its bullhorn IN that row (`TITLE_ROW_BLOCKS`), beside its own buttons:  nothing
   *   to move.  Before P25 of epic `epic-workflow` this also moved an item's corner bullhorn left of its review pills,
   *   and an update's left of its date.
   */
  makeRoom() {
    const marks = this.main.querySelectorAll(".spell-comment-mark.at-block")
    const horns = [...marks]
      .map((each) => each.querySelector(":scope > ui-button"))
      .filter((each) => each?.checkVisibility?.({ contentVisibilityAuto: true }) !== false)
      .map((each) => each?.getBoundingClientRect())
      .filter((rect) => rect?.width)
    for (const head of this.main.querySelectorAll(".spell-thread-head")) {
      head.style.paddingRight = ""
      const box = head.getBoundingClientRect()
      // hidden (a folded part's, `until-found`):  its place means nothing until it shows, and that's a resize
      if (!box.width || head.checkVisibility?.({ contentVisibilityAuto: true }) === false) continue
      const over = horns.filter(
        (rect) => rect.left < box.right && rect.right > box.left && rect.top < box.bottom && rect.bottom > box.top
      )
      if (over.length) head.style.paddingRight = `${Math.ceil(box.right - Math.min(...over.map((r) => r.left))) + 4}px`
    }
  }

  /** Fetch the page's comments;  resolves to whether the page takes comments.  NEVER throws. */
  async load() {
    try {
      const response = await fetch(`${COMMENTS_API}?page=${encodeURIComponent(location.pathname)}`, {
        cache: "no-store"
      })
      const answer = response.ok ? await response.json() : {}
      if (answer.takesComments !== true) return false
      this.list = withTurns(answer.comments)
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
   * Keep a docs page's Send state from a comments route's answer (`send`:  `{ epic, owned, listening, sent, unsent,
   * waiting }`, `commentsRoutes.ts` `PageSend`);  an epic page's answer has none (its Send is `<epic-page>`'s).
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
   * - a pill:  the paper plane, "Send" and how many comments wait for it;  blue by the fill rule (`templates/epics/
   *   plan-doc.md`, "Colours"):  grey outline with nothing waiting, dashed while some aren't sent, outlined once sent
   * - beside it, who is listening:  "python-target is listening", or nobody (then the comments wait, sent, for the
   *   epic's next `/epic review`), or no epic owns the page (`/airplane land` gathers it into `guide-changes`)
   * - a click sends (`POST /api/docs/comments/send`), and a toast says what went where
   * - drawn again with the comments;  none on an epic page, or from a server without it
   */
  drawSend() {
    const sticky = pageHeadIn(this.main)
    const head = sticky?.matches(".spell-page-head") ? sticky : (sticky?.querySelector(".spell-page-head") ?? sticky)
    head?.querySelector(":scope > .spell-send")?.remove()
    const send = this.send
    if (!head || !send) return
    const unsent = send.unsent.length
    const state = unsent ? "unsent" : send.waiting.length ? "sent" : "idle"
    const box = document.createElement("span")
    box.className = "spell-send"
    box.dataset.spellAdded = ""
    box.dataset.state = state
    const button = document.createElement("button")
    button.type = "button"
    button.className = "spell-send-button"
    button.title = sendWords(send, state)
    button.setAttribute("aria-label", button.title)
    button.innerHTML =
      `<ui-icon name="paper plane"></ui-icon><span>${state === "sent" ? "Sent" : "Send"}</span>` +
      (unsent ? `<span class="spell-send-count">${unsent}</span>` : "")
    button.addEventListener("click", () => void this.sendNow())
    const who = document.createElement("span")
    who.className = "spell-send-who"
    who.dataset.listening = send.listening ? "yes" : "no"
    who.textContent = !send.owned
      ? "no epic owns this page"
      : send.listening
        ? `${send.epic} is listening`
        : "nobody is listening"
    who.title = whoWords(send)
    box.append(button, who)
    beforeToolbar(head, box)
  }

  /** Send, clicked:  every comment waiting so far goes to the page's epic;  a toast says so.  NEVER throws. */
  async sendNow() {
    const send = this.send
    if (!send) return
    if (!send.unsent.length) return noteToast("Nothing new to send:  every comment here went with an earlier Send.")
    try {
      const answer = await postJSON(`${COMMENTS_API}/send`, { page: location.pathname })
      this.list = answer.comments ? withTurns(answer.comments) : this.list
      this.keepSend(answer)
      const count = `${send.unsent.length} comment${send.unsent.length === 1 ? "" : "s"}`
      // nobody listening:  the server woke the epic (P16) and says what it did;  else they wait for its review
      const later = !send.owned
        ? `:  no epic owns this page, so /airplane land gathers them into ${send.epic}`
        : this.send.listening
          ? ""
          : answer.wake?.message
            ? `.  ${answer.wake.message}`
            : `:  nobody is listening, so they wait for /epic review ${send.epic}`
      noteToast(`Sent ${count} to ${send.epic}${later}.`, later ? "warning" : "success")
      this.draw()
    } catch (error) {
      noteToast(`Couldn't send:  ${error.message}`, "error")
    }
  }

  /**
   * Draw it all again:  every bullhorn, every comment's thread, the quotes' highlight.
   * - a thread goes under the paragraph (list item, cell ...) holding its quote, else under its block (`holderOf()`)
   * - a comment whose block can't be found any more goes under the page header, saying so
   * - the open pane stays as it is, where Owen put it, the cursor in it;  the comment it's writing has no thread yet
   * - a reply box Owen is in moves into its thread drawn again, what's typed and the cursor kept
   */
  draw() {
    const { main } = this
    const field = this.fields().find((each) => document.activeElement === each.field)?.field
    const typing = !!field
    const [start, end] = typing ? [field.selectionStart, field.selectionEnd] : [0, 0]
    // a thread's fold in focus (Owen opened it, so it was seen:  `markSeen()`) keeps the focus once drawn again
    const folded = document.activeElement?.closest?.(".spell-thread")?.id
    const onFold = !!folded && document.activeElement.matches(".spell-thread-fold")
    this.read = readJSON(this.readKey)
    for (const old of main.querySelectorAll(".spell-comment-mark, .spell-comments")) old.remove()
    const blocks = blocksIn(main)
    const head = pageHeadIn(main)
    const threads = new Map()
    const quotes = []
    for (const comment of this.list) {
      const { block, exact } = findBlock(main, comment, blocks)
      const at = block ?? head
      if (!at) continue
      const quoted = block && comment.quote && quoteIn(block, comment.quote, comment.offset)
      if (quoted) quotes.push({ ...quoted, id: comment.id })
      if (this.open?.id === comment.id) continue
      const under = quoted ? holderOf(block, quoted) : at
      if (!threads.has(under)) threads.set(under, [])
      threads.get(under).push({ comment, exact: exact && Boolean(block) })
    }
    const ids = new Set(this.list.map((each) => each.id))
    if (this.editing && !ids.has(this.editing.id)) this.editing = null
    for (const id of this.replyBoxes.keys()) if (!ids.has(id)) this.replyBoxes.delete(id)
    for (const block of head ? [head, ...blocks] : blocks) this.addBullhorn(block)
    this.drawSend()
    for (const [under, found] of threads) this.boxFor(under).append(...found.map((each) => this.thread(each)))
    // grown to their words once shown:  a folded thread's has no height to measure
    for (const each of main.querySelectorAll(".spell-thread-reply > textarea"))
      if (each.getClientRects().length) growField(each)
    this.quotes = highlightQuotes(quotes)
    this.makeRoom()
    this.watchSeen()
    this.drawWaiting()
    if (onFold) main.querySelector(`#${CSS.escape(folded)} .spell-thread-fold`)?.focus({ preventScroll: true })
    if (!typing || !field.isConnected) return
    field.focus({ preventScroll: true })
    field.setSelectionRange(start, end)
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

  /** The comment with id `typed` (`M3`, `m3`, the old `cm3`, a `#` aside), else `undefined`. */
  find(typed) {
    const number = commentNumber(typed)
    return number === undefined ? undefined : this.list.find((each) => commentNumber(each.id) === number)
  }

  /**
   * The toolbar's BULLHORN (Owen, 2026-10-10:  "a bullhorn at the right of the toolbar, with an orange count, jumps to
   * the next thread waiting on you"):  at the right of the page's toolbar (`nav.spell-toolbar`, an epic page's and a
   * guide's alike), an orange count of the threads waiting on Owen;  hidden when none.
   * - made again whenever the toolbar is (a live update builds it anew, then draws the comments again)
   * - where it goes:  `waitingHome()`, the one place to change to move it
   */
  drawWaiting() {
    const home = this.waitingHome()
    if (!home) return
    let box = home.querySelector(":scope > .spell-toolbar-waiting")
    if (!box) {
      box = document.createElement("div")
      box.className = "spell-toolbar-waiting"
      box.hidden = true
      const button = document.createElement("button")
      button.type = "button"
      button.className = "spell-toolbar-item"
      button.addEventListener("click", () => this.nextWaiting())
      box.append(button)
    }
    if (home.lastElementChild !== box) home.append(box)
    const button = box.firstElementChild
    const count = this.waitingInPageOrder().length
    const tip = `${count} ${count === 1 ? "thread waits" : "threads wait"} on you:  jump to the next`
    if (button.dataset.count !== String(count)) {
      button.dataset.count = String(count)
      button.innerHTML =
        `<span class="spell-toolbar-icon"><ui-icon name="bullhorn"></ui-icon><span class="spell-toolbar-badges">` +
        `<span class="spell-toolbar-count replied">${count}</span></span></span>`
    }
    button.title = tip
    button.setAttribute("aria-label", tip)
    if (box.hidden === !count) return
    box.hidden = !count
    // a guide's titles share the row with it:  fitted again
    if (home.classList.contains("spell-toolbar-titled")) this.fitToolbar?.(home)
  }

  /**
   * Where the toolbar's bullhorn goes:  the page's toolbar (`nav.spell-toolbar`), last in its row, after a page's own
   * tools there (the spell syntax guide's Expand all and Collapse all);  none without a toolbar.
   */
  waitingHome() {
    return document.querySelector("nav.spell-toolbar")
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
   * Land on comment `id`'s thread, opened:  as a link to it would (`go()`:  what hides it unfolds, it lands below the
   * stuck titles, the address says `#comment-m3`), then the focus to its header without scrolling.  Seen
   * (`markSeen()`).
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
    document.getElementById(anchor)?.querySelector(".spell-thread-fold")?.focus({ preventScroll: true })
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
   * The bullhorn of `block`:  in a docs section's title (its `actions` slot), in an epic page block's title row (its
   * `actions` slot:  `TITLE_ROW_BLOCKS`), in the page header, else just before the block, over its top right corner.
   * - in a title row it's the last of the page's own buttons there, before the block's own (pills, date, fold)
   * - quiet until the block is hovered, always:  a click opens the pane for a NEW comment on it
   * - no count, and nothing to say about the block's comments (Owen, 2026-10-10:  "Bullhorn to the far right is
   *   unnecessary"):  each has its thread right there on the page, orange while it has news (`thread()`).
   *   Before, a block with comments showed "📢 N" always, its click listing them.
   */
  addBullhorn(block) {
    const place = this.placeOf(block)
    const what = place.kind === "page" ? "this page" : `this ${KIND_NAMES[place.kind] ?? place.kind}`
    const tip = `Comment on ${what}`
    const where =
      place.kind === "section" || place.kind === "page"
        ? place.kind
        : block.matches(TITLE_ROW_BLOCKS)
          ? "title"
          : "block"
    const mark = document.createElement(where === "block" ? "div" : "span")
    mark.className = `spell-comment-mark at-${where}`
    mark.dataset.spellAdded = ""
    mark.innerHTML =
      `<ui-button circular basic size="mini" icon="bullhorn" title="${attr(tip)}" aria-label="${attr(tip)}">` +
      `</ui-button>`
    titleInside(mark.querySelector("ui-button"))
    mark.querySelector("ui-button").addEventListener("click", (event) => {
      event.stopPropagation()
      this.openBox({ key: place.anchor, place }, event.currentTarget.getBoundingClientRect())
    })
    if (where === "section" || where === "title") {
      mark.slot = "actions"
      block.append(mark)
    } else if (where === "page") {
      // in the page header, before its toolbar:  the toolbar stays its last row
      const head = block.querySelector(".spell-page-head")
      if (head) beforeToolbar(head, mark)
      else block.append(mark)
    } else block.before(mark)
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
   * The box of threads under `under` (a block, or the paragraph holding a quote:  `holderOf()`), made on first use:  a
   * docs section's first in its body (under its title);  a list item's or cell's last inside it;  the page's right
   * under the page header;  anything else's right after it.
   */
  boxFor(under) {
    const where = under.localName === "ui-section" ? "first" : HOLDS_INSIDE.test(under.localName) ? "last" : "after"
    const next =
      where === "first"
        ? firstContentChild(under)
        : where === "last"
          ? under.lastElementChild
          : under.nextElementSibling
    if (next?.classList.contains("spell-comments")) return next
    const box = document.createElement("div")
    box.className = "spell-comments"
    box.dataset.spellAdded = ""
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
   * - a click on a comment's highlighted quote opens that comment in the pane again (`quoteAt()`);  the pointer
   *   says so over one
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
    const fold = this.main.querySelector(`#comment-${CSS.escape(id)} .spell-thread-fold`)
    fold?.scrollIntoView({ block: "nearest" })
    fold?.focus({ preventScroll: true })
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
    const button = document.createElement("button")
    button.type = "button"
    button.className = "spell-comment-float"
    button.hidden = true
    const tip = `Comment on this text (${/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl "}I)`
    button.title = tip
    button.setAttribute("aria-label", tip)
    button.innerHTML = `<ui-icon name="bullhorn"></ui-icon>`
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
   * one folding pane, all ivory, whoever spoke last (Owen, 2026-10-10:  "Make the entire thing ivory").
   * - its header (`threadHead()`);  a click on it, not on one of its buttons, folds it
   * - its body:  the messages in order (`messagesHTML()`), then, while Claude thinks about it, a "Claude: thinking…"
   *   stub (`working`);  then, unless it's done, Owen's REPLY BOX (`replyBoxFor()`;  Owen, 2026-10-10:  "Probably
   *   should have a comment box at the bottom for me")
   * - open while it's Owen's turn (Claude spoke last), or Claude is thinking about it, or he opened it on this visit
   *   (`folds`), or he's writing in it;  else folded to its header
   * - `exact` false:  its block changed or moved since, so it says what it was on
   */
  thread({ comment, exact }) {
    const thread = document.createElement("div")
    thread.className = "spell-thread"
    thread.id = `comment-${comment.id}`
    thread.dataset.turn = comment.turn
    // orange while it has a reply from Claude Owen hasn't seen (`unseen()`):  the whole thread, that reply stronger
    thread.toggleAttribute("data-unseen", this.unseen(comment))
    const editing = this.editing?.id === comment.id ? this.editing : null
    const replying = editing ?? (comment.turn === "done" ? null : this.replyBoxFor(comment))
    const writing = !!replying && (replying.busy() || !!editing)
    if (comment.turn === "done") this.replyBoxes.delete(comment.id)
    const thinking = !!comment.working && comment.turn !== "done"
    const open = writing || (this.folds.get(comment.id) ?? (comment.turn === "owen" || thinking))
    thread.toggleAttribute("data-open", open)
    thread.innerHTML =
      threadHead(comment, open, !editing) +
      `<div class="spell-thread-body">` +
      (exact ? "" : `<p class="spell-comment-moved">The block changed since:  it was “${text(comment.excerpt)}”.</p>`) +
      messagesHTML(comment, editing ? "edit" : replying?.saved() ? "reply" : undefined) +
      `</div>`
    if (replying) thread.querySelector(".spell-thread-body").append(replying.box)
    this.wireThread(thread, comment.id)
    return thread
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
    const saved = pendingReplyOf(comment)?.text ?? ""
    const kept = this.replyBoxes.get(comment.id)
    if (kept && (kept.busy() || kept.saved() === saved)) return kept
    kept?.drop()
    const replying = this.makeBox(comment.id, "reply", saved)
    this.replyBoxes.set(comment.id, replying)
    return replying
  }

  /**
   * A reply box for comment `id`:  `how` `reply` (his reply) or `edit` (his first words);  `saved`, the words the
   * server holds for it.  The pane's field, no placeholder, an `aria-label` (Owen, 2026-10-10), its floppy in the
   * corner;  wired by `wireReply()`.
   */
  makeBox(id, how, saved) {
    const box = document.createElement("div")
    box.className = "spell-thread-reply"
    box.innerHTML =
      `<textarea class="spell-comment-field" rows="1" aria-label="${how === "edit" ? "Your comment" : "Your reply"}">` +
      `</textarea><span class="spell-comment-saved" hidden><ui-icon name="floppy disk outline"></ui-icon></span>`
    const replying = { id, how, box, field: box.querySelector("textarea") }
    this.wireReply(replying, saved)
    return replying
  }

  /** Wire `thread`, comment `id`'s:  its fold, Owen's answer, Reopen, the pen, the trash. */
  wireThread(thread, id) {
    const fold = thread.querySelector(".spell-thread-fold")
    thread.querySelector(".spell-thread-head").addEventListener("click", (event) => {
      if (event.target.closest("ui-button, button:not(.spell-thread-fold)")) return
      const opening = !thread.hasAttribute("data-open")
      this.folds.set(id, opening)
      thread.toggleAttribute("data-open", opening)
      fold.setAttribute("aria-expanded", String(opening))
      fold.title = fold.title.replace(/\((Fold|Unfold) this thread\)$/, `(${opening ? "Fold" : "Unfold"} this thread)`)
      const field = thread.querySelector(".spell-thread-reply > textarea")
      if (opening && field) growField(field)
      // unfolded:  seen (`markSeen()`)
      if (opening) this.markSeen(id)
    })
    for (const button of thread.querySelectorAll(".spell-thread-answer ui-button")) {
      titleInside(button)
      button.addEventListener("click", (event) => {
        event.stopPropagation()
        const { act } = button.dataset
        if (act === "reply") this.focusReply(id)
        else if (act === "reopen") void this.reopen(id)
        else void this.resolve(id, act)
      })
    }
    thread.querySelector(".spell-thread-edit")?.addEventListener("click", (event) => {
      event.stopPropagation()
      this.startEdit(id)
    })
    wireDelete(thread.querySelector(".spell-comment-delete"), () => this.remove(id))
  }

  /**
   * Close thread `id`:  `good` ("that's good") or `skip` ("skip it").  It folds, with a check circle in its header
   * and a green Done line at its end;  a toast says so, with Undo (`reopen()`).  NEVER throws.
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
        actions: [{ text: "Undo", icon: "rotate left", class: "basic", click: undo }]
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

  /** POST `change` to the comments route for this page, and keep the list it answers;  throws what `postJSON()` does. */
  async post(change, options) {
    const answer = await postJSON(COMMENTS_API, { page: location.pathname, ...change }, options)
    this.list = answer.comments ? withTurns(answer.comments) : this.list
    this.keepSend(answer)
    return answer
  }

  ////////////////
  // ## The reply box
  ////////////////

  /**
   * The cursor into thread `id`'s reply box, at the end (Revisit:  "reply");  the thread opens, and the page scrolls
   * only as far as it must to show it.  The pen's box open on it:  that one.
   */
  focusReply(id) {
    this.folds.set(id, true)
    this.draw()
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
    if (this.editing?.id === id) return this.focusReply(id)
    void this.closeEdit()
    const comment = this.list.find((each) => each.id === id)
    if (!comment) return
    this.editing = this.makeBox(id, "edit", comment.text)
    this.focusReply(id)
  }

  /**
   * Save and close the pen's box, if open;  resolves to whether it closed.  Emptied, the comment goes (Undo in the
   * toast).  A save that failed keeps it open, and says why in a toast.
   */
  async closeEdit() {
    const editing = this.editing
    if (!editing) return true
    if (!(await editing.finish())) {
      noteToast(editing.box.querySelector(".spell-comment-saved").title, "error")
      return false
    }
    if (this.editing === editing) this.editing = null
    this.draw()
    return true
  }

  /**
   * Wire reply box `replying` (`makeBox()`);  `saved`:  the words the server holds for it.
   * - saves itself as Owen types, `COMMENT_SAVE_MS` after he stops, as the pane does:  his reply (`reply`;  emptied,
   *   his pending reply goes), or his first words (`edit`);  the floppy says how the last save went
   * - FOCUS LEAVING it (Tab, a click elsewhere;  Owen, 2026-10-10:  "Tabbing out ... saves it automatically.  If it's
   *   empty, delete it"):  a reply box saves at once, an emptied pending reply going;  the pen's box closes
   * - NEVER an empty comment:  his first words emptied go only as the pen's box closes (`remove()`, Undo in its
   *   toast), so clearing them to type afresh never loses the thread
   * - a draft is kept in this browser while what's typed differs from what's saved (`<id>~<how>`)
   * - Escape, or ⌘ / Ctrl Enter:  saved, and the cursor leaves it (the pen's box closes)
   * - `busy()`:  Owen is in it, or it holds words not saved yet:  a redraw keeps it as it is
   */
  wireReply(replying, saved) {
    const { id, how, box, field } = replying
    const floppy = box.querySelector(".spell-comment-saved")
    const slot = `${id}~${how}`
    let saving = Promise.resolve(true)
    let timer = 0
    let pending = 0
    field.value = readJSON(this.draftKey)[slot] ?? saved
    const keep = () => {
      const drafts = readJSON(this.draftKey)
      if (field.value.trim() !== saved) drafts[slot] = field.value
      else delete drafts[slot]
      writeJSON(this.draftKey, drafts)
    }
    const save = async ({ keepalive = false } = {}) => {
      const words = field.value.trim()
      if (words === saved || (!words && how === "edit")) return true
      try {
        await this.post({ action: how, id, text: words }, { keepalive })
        saved = words
        keep()
        floppy.hidden = !words
        floppy.removeAttribute("data-failed")
        floppy.title = `Saved ${localStamp(new Date().toISOString()).slice(11)} · waiting for Claude`
        // whose turn it is changed:  its header's buttons with it
        if (this.replyBoxes.get(id) === replying || this.editing === replying) this.draw()
        return true
      } catch (error) {
        floppy.hidden = false
        floppy.setAttribute("data-failed", "")
        floppy.title = `Not saved:  ${error.message} (kept in this browser)`
        return false
      }
    }
    const saveNow = () => {
      clearTimeout(timer)
      timer = 0
      pending++
      saving = saving.then(() => save())
      void saving.finally(() => pending--)
      return saving
    }
    replying.saved = () => saved
    replying.busy = () => document.activeElement === field || field.value.trim() !== saved || !!timer || pending > 0
    replying.drop = () => clearTimeout(timer)
    replying.finish = async () => {
      clearTimeout(timer)
      timer = 0
      if (how === "edit" && !field.value.trim()) {
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
    replying.flush = () => {
      clearTimeout(timer)
      saving = saving.then(() => save({ keepalive: true }))
    }
    field.addEventListener("input", () => {
      growField(field)
      keep()
      clearTimeout(timer)
      timer = setTimeout(saveNow, COMMENT_SAVE_MS)
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
      // a redraw moves the box, and takes the cursor back into it;  another window or tab keeps it here:  only a
      // real leave counts
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
   * Delete comment `id`, whatever its state, at once:  gone from the inbox, its thread and highlight with it;  a toast
   * says so, with Undo for `UNDO_MS` (Owen, 2026-10-10:  "didn't know it needed two clicks").  NEVER throws.
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
        actions: was ? [{ text: "Undo", icon: "rotate left", class: "basic", click: undo }] : undefined
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
   * Open the comment pane for `open` (`{ key, place }`), just under `near` (a `DOMRect`:  the selection's last line,
   * the button clicked):  a NEW comment on `place`'s block (`quote`:  on that text).  Once saved and closed, it's a
   * thread (`thread()`);  until then its thread isn't drawn.
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
   * - fixed on the screen, in `main` (where the comments' styles reach):  the page scrolls under it
   */
  showPane(near) {
    const pane = (this.pane = this.paneFor(this.open))
    this.main.append(pane)
    const field = pane.querySelector("textarea")
    if (field) growField(field)
    const { width, height } = pane.getBoundingClientRect()
    const left = near?.left ?? (innerWidth - width) / 2
    let top = near ? near.bottom + 8 : 80
    if (near && top + height > innerHeight - 8) top = near.top - height - 8
    movePane(pane, left, top)
    this.focusPane()
  }

  /** The cursor into the open pane's field, at the end (or into the pane, when it has none);  no scrolling. */
  focusPane() {
    const field = this.pane?.querySelector("textarea")
    if (!field) return this.pane?.focus({ preventScroll: true })
    field.focus({ preventScroll: true })
    field.setSelectionRange(field.value.length, field.value.length)
  }

  /**
   * The pane's markup and wiring, for `open` (`openBox()`'s):  a header, then the text;  no buttons below it.
   * - the header:  a few words of what it's on (the selected text, else the block:  `headline()`), the floppy, the
   *   trash, ×;  its tooltip names the block in full (`aboutTip()`);  Owen drags the pane by it
   * - the field has no placeholder (Owen, 2026-10-10:  "remove the 'Anything:  a correction...' placeholder")
   * - the trash deletes the comment, one click, Undo in its toast (`wireDelete()`);  shown once it's saved
   * - × or Escape closes it (⌘ / Ctrl Enter too, in the field), saving what's typed first;  so does the focus
   *   leaving it (Tab, a click elsewhere):  emptied, the comment goes
   */
  paneFor(open) {
    const pane = document.createElement("div")
    pane.className = "spell-comment-pane"
    pane.dataset.spellAdded = ""
    pane.tabIndex = -1
    pane.setAttribute("role", "dialog")
    pane.setAttribute("aria-label", `Comment on ${headline(open.place)}`)
    pane.innerHTML =
      `<div class="spell-comment-about" title="${attr(`${aboutTip(open)}\n(Drag to move)`)}">` +
      `<ui-icon name="bullhorn"></ui-icon><span class="spell-comment-on">${text(headline(open.place))}</span>` +
      `<span class="spell-comment-saved" hidden><ui-icon name="floppy disk outline"></ui-icon></span>` +
      deleteButton("saved", !open.id) +
      `<button type="button" class="spell-comment-tool spell-comment-close" title="${CLOSE_TIP}" ` +
      `aria-label="Close the comment box"><ui-icon name="xmark"></ui-icon></button></div>` +
      `<textarea class="spell-comment-field" rows="3" aria-label="Your comment"></textarea>`
    wireDrag(pane, pane.querySelector(".spell-comment-about"))
    const close = this.wireField(pane, open)
    pane.querySelector(".spell-comment-close").addEventListener("click", () => void close())
    pane.addEventListener("keydown", (event) => {
      const closing = event.key === "Escape" || (event.key === "Enter" && (event.metaKey || event.ctrlKey))
      if (!closing) return
      event.preventDefault()
      event.stopPropagation()
      void close()
    })
    // focus leaving the pane (Tab, a click elsewhere;  Owen, 2026-10-10:  "Tabbing out of a bullhorn modal saves it
    // automatically.  If it's empty, delete it"):  closed as × closes it, so what's typed is saved, and an emptied
    // comment goes, with no Undo.  Another window or tab keeps the focus here:  it stays open.
    pane.addEventListener("focusout", () => {
      setTimeout(() => {
        if (this.pane !== pane || pane.contains(document.activeElement)) return
        void close()
      })
    })
    wireDelete(pane.querySelector(".spell-comment-delete"), () =>
      open.discard ? open.discard() : this.remove(open.id)
    )
    return pane
  }

  /**
   * Wire the pane's field for `open`;  returns what closes it.
   * - saves itself as Owen types, `COMMENT_SAVE_MS` after he stops (Owen, 2026-10-10:  "Save should just happen as I
   *   type"):  the first save adds the comment, the next ones edit it;  the floppy says how the last one went
   * - NEVER an empty comment (Owen, 2026-10-10:  "don't save an empty bullhorn comment"):  nothing typed (or only
   *   spaces) saves nothing;  emptied, a saved one goes at once (`delete`, else `clear`);  the trash deletes it
   * - a DRAFT is kept in this browser (`COMMENT_DRAFT_KEY_PREFIX`) only while what's typed differs from what the
   *   server holds:  under the comment's id once it has one, else under the pane's `key`.
   *   - So a reload never brings back, as a NEW comment, text already saved.
   *     Before 2026-10-10 it did, and closing the pane at once saved that text a second time.
   *   - A new comment's draft that copies a comment already on its block is dropped (`draftOf()`).
   * - leaving the page (`pagehide`):  what's typed and not saved yet goes at once (`flush()`)
   */
  wireField(pane, open) {
    const { key, place } = open
    const field = pane.querySelector("textarea")
    const floppy = pane.querySelector(".spell-comment-saved")
    const trash = pane.querySelector(".spell-comment-delete")
    // what the server holds;  one save at a time, in order, so a quick typist never adds the comment twice
    let saved = (open.text ?? "").trim()
    let saving = Promise.resolve(true)
    let timer = 0
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
    const save = async ({ keepalive = false } = {}) => {
      const words = field.value.trim()
      if (gone || words === saved) return true
      if (!words && !open.id) return true
      const change = !words
        ? { action: this.waiting(open.id) ? "delete" : "clear", id: open.id }
        : open.id
          ? { action: "edit", id: open.id, text: words }
          : { action: "add", ...place, text: words }
      try {
        const answer = await postJSON(COMMENTS_API, { page: location.pathname, ...change }, { keepalive })
        const before = slot()
        open.id = words ? (open.id ?? answer.id) : undefined
        saved = words
        this.list = answer.comments ? withTurns(answer.comments) : this.list
        this.keepSend(answer)
        keep(before)
        floppy.hidden = !words
        floppy.removeAttribute("data-failed")
        floppy.title = `Saved ${localStamp(new Date().toISOString()).slice(11)} · waiting for Claude`
        trash.hidden = !open.id
        // its highlight on the page, at once;  its thread waits until the pane closes
        if (this.open === open) this.draw()
        return true
      } catch (error) {
        floppy.hidden = false
        floppy.setAttribute("data-failed", "")
        floppy.title = `Not saved:  ${error.message} (kept in this browser)`
        return false
      }
    }
    const saveNow = () => {
      clearTimeout(timer)
      return (saving = saving.then(() => save()))
    }
    open.finish = async () => {
      if (!(await saveNow())) return false
      this.forget(slot())
      this.forget(key)
      return true
    }
    // the page is going:  a request that outlives it
    open.flush = () => {
      clearTimeout(timer)
      saving = saving.then(() => save({ keepalive: true }))
    }
    open.discard = async () => {
      clearTimeout(timer)
      // a save on its way first:  it may bring the comment's id
      await saving
      gone = true
      this.forget(slot())
      this.forget(key)
      if (open.id) return this.remove(open.id)
      if (this.open === open) this.closePane()
    }
    field.addEventListener("input", () => {
      growField(field)
      keep()
      clearTimeout(timer)
      timer = setTimeout(saveNow, COMMENT_SAVE_MS)
    })
    field.addEventListener("blur", () => void saveNow())
    return async () => {
      if (!(await open.finish())) return noteToast(floppy.title, "error")
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
function sendWords({ epic, owned, unsent, waiting }, state) {
  const count = (n) => `${n} comment${n === 1 ? "" : "s"}`
  if (state === "unsent") return `Send ${count(unsent.length)} to ${owned ? `epic ${epic}` : epic}`
  if (state === "sent") return `Sent to ${epic}:  ${count(waiting.length)} waiting for Claude`
  return "Nothing to send:  no comment here is waiting for Claude"
}

/** The tooltip of who is listening, beside a docs page's Send (`drawSend()`):  where its comments go, and when. */
function whoWords({ epic, owned, listening }) {
  if (!owned)
    return `No epic's See Also lists this page:  its comments go to epic ${epic}, which /airplane land gathers`
  if (listening) return `A Claude session is reviewing epic ${epic}:  Send hands it these comments now`
  return `No Claude session is reviewing epic ${epic}:  sent comments wait for /epic review ${epic} or /airplane land`
}

/**
 * A few words of what a comment box is on, for its header:  the start of the selected text, else of its block's
 * text, in quotes;  "This page" for the page.
 */
function headline(place) {
  if (place.kind === "page") return "This page"
  const words = (place.quote || place.excerpt || place.label || "").replace(/\s+/g, " ").trim()
  if (!words) return `This ${KIND_NAMES[place.kind] ?? place.kind}`
  return `“${words.length > HEADLINE_CHARS ? `${words.slice(0, HEADLINE_CHARS).trimEnd()}…` : words}”`
}

/** The comment box header's tooltip:  which block it's on, in full ("On a field in Guide Comments"). */
export function aboutTip({ id, place }) {
  const what = place.kind === "page" ? "the page" : `a ${KIND_NAMES[place.kind] ?? place.kind}`
  const named = place.kind === "section" || place.kind === "item"
  const on = named && place.label ? `“${place.label}”` : what
  const where = place.kind === "page" || named || !place.label ? "" : ` in “${place.label}”`
  return `${id ? `Comment ${commentLabel(id)}, on` : "On"} ${on}${where}${place.quote ? `:  “${place.quote}”` : ""}`
}

/**
 * A thread's header (`PageComments.thread()`):  a chevron, the bullhorn (a check circle once done), its id (`M3`,
 * small and muted;  epic `epic-workflow` P23), the pane's summary (`headline()`:  the quote's first words, else the block's;  its tooltip the full place), then
 * - Owen's answer while it's his turn (`answerButtons()`);  Reopen once done
 * - the pen while his first words wait for Claude, unread (`pendingOf()`);  not while its box is open (`withPen`).
 *   His pending reply needs none:  it's in the reply box
 * - the trash, always
 * No date:  each message has its own time (Owen, 2026-10-10:  "Dont need date in the top if it's next to who spoke").
 */
function threadHead(comment, open, withPen) {
  const done = comment.turn === "done"
  const tip = `${aboutTip({ id: comment.id, place: comment })}\n(${open ? "Fold" : "Unfold"} this thread)`
  const pending = withPen && pendingOf(comment) === "edit" && "edit"
  const label = commentLabel(comment.id)
  return (
    `<div class="spell-thread-head">` +
    `<button type="button" class="spell-thread-fold" aria-expanded="${open}" title="${attr(tip)}">` +
    `<span class="spell-thread-chevron"><ui-icon name="chevron right"></ui-icon></span>` +
    `<span class="spell-thread-mark"><ui-icon name="${done ? "circle check" : "bullhorn"}"></ui-icon></span>` +
    `<span class="spell-thread-id">${text(label)}</span>` +
    `<span class="spell-thread-headline">${text(headline(comment))}</span></button>` +
    (comment.turn === "owen" ? answerButtons(THREAD_ANSWERS) : done ? answerButtons([REOPEN]) : "") +
    (pending
      ? `<button type="button" class="spell-comment-tool spell-thread-edit" data-how="${pending}" ` +
        `title="${attr(EDIT_TIP)}" aria-label="Edit your last words:  Claude hasn't taken them yet"><ui-icon name="edit"></ui-icon></button>`
      : "") +
    deleteButton(comment.status === "new" ? "saved" : "had") +
    `</div>`
  )
}

/**
 * Owen's answer on a thread, while it's his turn (Owen, 2026-10-10:  "Make top buttons same semantics/look as pills
 * in item header"):  an epic page item's review pills (`<epic-review>`, `$/epics`), drawn here with the same
 * markup, since a guide doesn't load that pack:  ONE grouped pill of square icon buttons, a grey outline at rest,
 * each in its colour under the pointer.
 * - Approve's check (green, decided):  "that's good" -- done, it folds
 * - Revisit's history (blue, an ask of Claude):  reply -- the cursor into the reply box under the messages
 *   (`focusReply()`)
 * - the note box's x (grey, no longer relevant):  "skip it" -- done, nothing more to do
 * - tooltips (`title`;  Owen, 2026-10-10:  "No tooltip on those same buttons"):  the name and, for the two that
 *   close it, that they do;  also on the button the pointer lands on (`titleInside()`);  a screen reader hears
 *   what it does
 */
const THREAD_ANSWERS = [
  {
    act: "good",
    color: "green",
    icon: "check",
    label: "That's good",
    title: "That's good:  done",
    tip: "done:  the thread folds, green"
  },
  {
    act: "reply",
    color: "blue",
    icon: "history",
    label: "Reply",
    title: "Reply",
    tip: "the cursor into the box under the thread, saved as you type;  Claude takes it up"
  },
  {
    act: "skip",
    color: "grey",
    icon: "xmark",
    label: "Skip it",
    title: "Skip it:  done, nothing more to do",
    tip: "done, nothing more to do"
  }
]

/** A closed thread's one button:  open it again (the toast's Undo does the same). */
const REOPEN = {
  act: "reopen",
  color: "blue",
  icon: "rotate left",
  label: "Reopen",
  title: "Reopen:  your turn on it again",
  tip: "your turn on it again"
}

/** The pen's tooltip:  his words, while Claude hasn't taken them. */
const EDIT_TIP = "Edit your last words"

/** What a thread says for Claude's answer with no words here:  an epic page's comment, answered in the doc. */
const ANSWERED_IN_DOC = "<p>Answered on the epic page.</p>"

/** `specs` (`THREAD_ANSWERS`, `REOPEN`) as a thread header's grouped pill. */
function answerButtons(specs) {
  return (
    `<span class="spell-thread-answer" role="group" aria-label="Your answer"><ui-buttons basic icon size="mini">` +
    specs
      .map(
        ({ act, color, icon, label, title, tip }) =>
          `<ui-button icon="${icon}" data-act="${act}" data-color="${color}" title="${attr(title)}" ` +
          `aria-label="${attr(`${label}:  ${tip}`)}"></ui-button>`
      )
      .join("") +
    `</ui-buttons></span>`
  )
}

/**
 * Put `host`'s `title` (a `<ui-button>`'s) on the button inside it too, once drawn:  the element the pointer lands
 * on carries the tooltip itself (Owen, 2026-10-10:  "No tooltip on those same buttons"), as an epic page item's note
 * buttons do, rather than leaving the browser to find it on the shadow host.
 */
function titleInside(host) {
  const copy = () => {
    const inner = host.shadowRoot?.querySelector('[part~="button"]')
    if (inner) inner.title = host.title
    return !!inner
  }
  if (!copy()) void customElements.whenDefined(host.localName).then(() => requestAnimationFrame(copy))
}

/** When Claude last replied on `comment`'s thread (an ISO time), else "". */
function latestClaudeAt(comment) {
  return comment.replies?.findLast((each) => each.by !== "Owen" && each.at)?.at ?? ""
}

/**
 * `comments` as the server answered (none:  `[]`), each with whose `turn` it is on its thread:  the server's
 * (`CommentList.turnOf()`), else worked out the same way here -- a page server started before threads sends none.
 */
function withTurns(comments = []) {
  return comments.map((comment) => (comment.turn ? comment : { ...comment, turn: turnOf(comment) }))
}

/**
 * A comment id's number, however typed or keyed:  `M3`, `m3`, `cm3` (any case, a `#` before it aside) -> 3;  else
 * `undefined`.  As `CommentList.idOf()`.
 */
function commentNumber(typed) {
  const number = /^#?c?m(\d+)$/i.exec(String(typed ?? "").trim())?.[1]
  return number === undefined ? undefined : Number(number)
}

/** A comment's id as Owen sees it:  `M3` (`cm3`, `m3` alike;  `CommentList.label()`). */
export function commentLabel(id) {
  const number = commentNumber(id)
  return number === undefined ? String(id) : `M${number}`
}

/** The first line of `words`, cut to a short line with `…`. */
export function firstWords(words) {
  const line = String(words ?? "")
    .split("\n")[0]
    .trim()
  return line.length > 60 ? `${line.slice(0, 60).trimEnd()}…` : line
}

/** Whose turn it is on `comment`'s thread, as `CommentList.turnOf()` has it:  `done`, `owen` or `claude`. */
function turnOf(comment) {
  if (comment.done) return "done"
  const last = comment.replies?.at(-1)
  if (last) return last.by === "Owen" ? "claude" : "owen"
  return comment.status === "answered" ? "owen" : "claude"
}

/**
 * Owen's words on `comment` that Claude hasn't had yet, which he may still change:  `edit` (his first words, while
 * the comment is `new` and Claude isn't thinking about it), `reply` (his pending reply:  `pendingReplyOf()`);  else
 * `null`.
 */
function pendingOf(comment) {
  if (comment.done) return null
  if (comment.status === "new" && !comment.replies?.length) return comment.working ? null : "edit"
  return pendingReplyOf(comment) ? "reply" : null
}

/**
 * Owen's PENDING reply on `comment`:  its thread's last entry, his, not taken since, nor being thought about
 * (`working`);  else `null`.  As the server's `CommentList` has it:  his next save changes it, rather than adding
 * another.
 */
function pendingReplyOf(comment) {
  const last = comment.replies?.at(-1)
  if (last?.by !== "Owen") return null
  const taken = comment.taken?.at ?? (comment.status === "taken" ? comment.at : undefined)
  // the later of the two (ISO dates compare as strings);  "" for neither
  const held = [taken, comment.working].reduce((late, each) => (each && each > late ? each : late), "")
  return held && held >= last.at ? null : last
}

/**
 * A thread's messages, in order (Owen, 2026-10-10:  "lose the 'claude' 'You' bit -- move the time to the top-right
 * of each bit position absolute"):  no names, the colour says who.
 * - Owen's words (his comment, his replies):  plain on the ivory, no box (Owen, 2026-10-10:  "my text doesn't get
 *   bordered (but keep spacing the same)")
 * - Claude's:  a light violet box -- an answer;  "taken into <epic> · <phase>", linked by the phase's id
 *   (`takenInto()`);  answered in the epic page.  His latest (`data-latest`) is orange while Owen hasn't seen it
 *   (`unseen()`), as the whole thread is
 * - a green Done line once closed:  a check, what he said, the commit Claude named
 * - while Claude thinks about it (`working`):  "Claude: thinking…" last, light violet, a spinner;  his answer takes
 *   its place
 * - each one's time in its top right corner:  the day with it on the first, and whenever the day changes;  the
 *   full date and time as its tooltip
 * - `editing` (the reply box's `how`, when it holds words of his):  the box stands in for them -- `edit` his first,
 *   `reply` his pending reply
 */
function messagesHTML(comment, editing) {
  const said = [{ by: "Owen", at: comment.at, text: comment.text }, ...(comment.replies ?? [])]
  if (editing === "edit") said.shift()
  else if (editing === "reply" && pendingReplyOf(comment)) said.pop()
  const messages = said.map((each) =>
    each.by === "Owen"
      ? { by: "owen", at: each.at, body: commentHTML(each.text ?? "") }
      : { by: "claude", at: each.at, body: each.html || ANSWERED_IN_DOC }
  )
  const { taken, done } = comment
  if (taken) {
    const after = messages.findIndex((each) => each.at > taken.at)
    const into = takenInto(taken)
    const where = `<a href="${attr(planLink(taken.epic, into.hash))}">${text(into.label)}</a>`
    const line = { by: "claude", at: taken.at, body: `<p>Taken into ${where}, to work into the page there.</p>` }
    messages.splice(after < 0 ? messages.length : after, 0, line)
  }
  // answered before threads, in an epic page:  no entry of Claude's at all
  if (comment.status === "answered" && !comment.replies?.some((each) => each.by !== "Owen"))
    messages.push({ by: "claude", at: "", body: ANSWERED_IN_DOC })
  if (done) {
    const commit = comment.replies?.findLast((each) => each.commit)?.commit
    const words = done.how === "skip" ? "Skipped:  nothing more to do." : "That's good."
    const built = commit ? `  Built in <code>${text(commit)}</code>.` : ""
    const check = `<span class="spell-thread-check"><ui-icon name="circle check"></ui-icon></span>`
    messages.push({ by: "done", at: done.at, body: `<p>${check}${words}${built}</p>` })
  }
  // Claude thinking about it now (`working`, since when):  a stub his answer replaces (Owen, 2026-10-10:  "You could
  // put in a stub and replace that when you've thought")
  if (comment.working && !done) {
    const spin = `<span class="spell-thread-spin" aria-hidden="true"><ui-icon name="circle notch"></ui-icon></span>`
    messages.push({ by: "thinking", at: comment.working, body: `<p>${spin}thinking…</p>` })
  }
  // Claude's latest reply:  orange while the thread is (`unseen()`), the reply Owen hasn't seen
  const latest = messages.findLastIndex((each) => each.by === "claude" && each.at)
  let day = ""
  return messages
    .map(({ by, at, body }, index) => {
      const local = at ? localStamp(at) : ""
      const shown = !local ? "" : local.slice(0, 10) === day ? local.slice(11) : shortStamp(local)
      if (local) day = local.slice(0, 10)
      // the time over the top right corner;  a hidden copy floats there, so the first line's text stops short of it
      const when = shown
        ? `<span class="spell-thread-room" aria-hidden="true">${text(shown)}</span>` +
          `<time class="spell-thread-when" datetime="${attr(at)}" title="${attr(local)}">${text(shown)}</time>`
        : ""
      // who, in bold, at the start of the first line (Owen, 2026-10-10:  "Put You in bold, same line, before me and
      // Claude: before yours");  the Done line has its check instead
      const who = WHO[by] ? `<b class="spell-thread-who">${WHO[by]}</b> ` : ""
      const said = who && body.startsWith("<p>") ? `<p>${who}${body.slice(3)}` : who + body
      // all but the last smaller and quieter (Owen, 2026-10-10:  "Make font smaller for "not current" things --
      // everything other than last message");  the thinking stub or the Done line is the last when there
      const older = index < messages.length - 1 ? " data-older" : ""
      const newest = index === latest ? " data-latest" : ""
      return (
        `<div class="spell-thread-msg" data-by="${by}"${older}${newest}>${when}` +
        `<div class="spell-thread-text">${said}</div></div>`
      )
    })
    .join("")
}

/** Who said a thread's message, as its first word says it (`messagesHTML()`):  the thinking stub is Claude's. */
const WHO = { owen: "You:", claude: "Claude:", thinking: "Claude:" }

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
 * Highlight each quote's text on the page, softly (`QUOTE_HIGHLIGHT`);  returns each one's range, by comment id
 * (`[{ id, range }]`), for a click to find.  Not highlighted where the browser can't, but still found.
 */
function highlightQuotes(quotes) {
  const found = quotes.flatMap(({ id, start, end }) => {
    try {
      const range = document.createRange()
      range.setStart(...start)
      range.setEnd(...end)
      return [{ id, range }]
    } catch {
      return []
    }
  })
  if (globalThis.Highlight && globalThis.CSS?.highlights)
    CSS.highlights.set(QUOTE_HIGHLIGHT, new Highlight(...found.map(({ range }) => range)))
  return found
}

/**
 * What the pane's × says, in its tooltip:  a few words, as every comment button's (Owen, 2026-10-10:  "The buttons
 * don't have browser tooltips -- unclear what they do");  the rest is in its `aria-label`.
 */
const CLOSE_TIP = "Close"

/** How long the toast saying a comment was deleted offers Undo, ms. */
const UNDO_MS = 6000

/** What a trash says:  its tooltip, then (`aria-label`) a comment still waiting for Claude, and one Claude has. */
const DELETE_TIP = "Delete this comment"
const DELETE_TELLS = {
  saved: "Delete this comment (Undo in the toast that follows)",
  had: "Delete this comment:  gone from the page, whatever Claude did with it (Undo in the toast that follows)"
}

/**
 * A comment's trash (Owen, 2026-10-10:  "allow me to delete bullhorn comments"):  on its thread's header, and in the
 * pane's;  icon only, plain as the pane's × (Owen, 2026-10-10:  "no round border like everything else").
 * `state`:  `saved` while Claude hasn't had it, else `had`;  `hidden`:  not saved yet (a new comment's pane).
 */
function deleteButton(state, hidden = false) {
  const tells = DELETE_TELLS[state === "saved" ? "saved" : "had"]
  return (
    `<button type="button" class="spell-comment-tool spell-comment-delete" title="${DELETE_TIP}" ` +
    `aria-label="${attr(tells)}"${hidden ? " hidden" : ""}><ui-icon name="trash can"></ui-icon></button>`
  )
}

/**
 * Wire trash `button` (`deleteButton()`) to `act`:  one click deletes at once, no dialog;  the toast that says so
 * offers Undo (`PageComments.remove()`).
 * - Before 2026-10-10 it took two clicks, the first turning it red:  Owen clicked once, and thought it broken
 */
function wireDelete(button, act) {
  button?.addEventListener("click", (event) => {
    event.stopPropagation()
    void act()
  })
}

/** Put the pane at (`left`, `top`) on the screen, inside the window's edges, 8px in. */
function movePane(pane, left, top) {
  const { width, height } = pane.getBoundingClientRect()
  pane.style.left = `${Math.max(8, Math.min(left, innerWidth - width - 8))}px`
  pane.style.top = `${Math.max(8, Math.min(top, innerHeight - height - 8))}px`
}

/** Let `handle` drag `pane` around the screen (not from a button on it). */
function wireDrag(pane, handle) {
  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest("ui-button, button")) return
    event.preventDefault()
    const start = pane.getBoundingClientRect()
    const dx = event.clientX - start.left
    const dy = event.clientY - start.top
    handle.setPointerCapture(event.pointerId)
    const move = (each) => movePane(pane, each.clientX - dx, each.clientY - dy)
    const stop = () => {
      handle.removeEventListener("pointermove", move)
      handle.removeEventListener("pointerup", stop)
      handle.removeEventListener("pointercancel", stop)
    }
    handle.addEventListener("pointermove", move)
    handle.addEventListener("pointerup", stop)
    handle.addEventListener("pointercancel", stop)
  })
}

/** A docs section's first child in its body (not its slotted icon, header or actions);  `null` for none. */
function firstContentChild(section) {
  return Array.from(section.children).find((child) => !child.hasAttribute("slot")) ?? null
}

/**
 * A comment's text as markup:  a `<p>` per block (split at blank lines), a single newline a `<br>`,
 * `backticked` runs `<code>`.  `PageNotes.js` `htmlOf()` does the same on the server.
 */
function commentHTML(words) {
  return words
    .trim()
    .split(/\n[ \t]*\n\s*/)
    .map(
      (block) =>
        `<p>${text(block.trim())
          .replace(/`([^`]+)`/g, "<code>$1</code>")
          .replace(/\n/g, "<br />")}</p>`
    )
    .join("")
}

/** An ISO time as local `YYYY-MM-DD HH:MM` (`shortStamp()` takes it from there). */
function localStamp(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso ?? ""
  const two = (value) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())} ${two(date.getHours())}:${two(date.getMinutes())}`
}

/**
 * The URL of the phase a comment was taken into, from this checkout's root (a worktree's `/worktrees/<w>/` too):
 * epic `epic`'s page, at `#hash` (`takenInto()`:  the phase's stable id, or an old taken comment's `p7`).
 */
function planLink(epic, hash) {
  const root = /^\/worktrees\/[^/]+\//.exec(location.pathname)?.[0] ?? "/"
  return `${root}epics/${encodeURIComponent(epic)}/${encodeURIComponent(epic)}.plan.html#${encodeURIComponent(hash)}`
}
