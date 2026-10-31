import { ThreadFacts } from "spell/epic/comments"

/** A kind of block (`table`, `field` ...):  lower case;  the page's runtime names them (`BlockAnchors.js`). */
const KIND = /^[a-z][a-z-]{0,19}$/

/** An anchor (`BlockAnchors.js`):  an id, or `<section id | page>#<kind>-<n>`;  no white space. */
const ANCHOR = /^[^\s#]{1,200}(?:#[a-z][a-z-]{0,19}-\d{1,4})?$/

/** Longest comment Owen may write, in characters:  a few screens. */
const MAX_TEXT = 20_000

/** Longest quote kept, in characters:  a paragraph or two. */
const MAX_QUOTE = 2_000

/** Longest label or excerpt kept, in characters. */
const MAX_LABEL = 200

/** A comment's statuses (`Comment.status`). */
const STATUSES: readonly string[] = ["new", "taken", "answered"]

/** How Owen closes a thread (`resolve()`):  "that's good", or "skip it". */
const RESOLUTIONS: readonly string[] = ["good", "skip"]

/** Who wrote a person's words, when nobody said (`CommentList`'s `person`):  as `EpicHome.personName()` has it. */
const SOMEONE = "someone"

/**
 * The agent an answer is marked as when nobody said which (`CommentList`'s `agent`):  `claude`, as
 * `EpicHome.agent()` guesses.
 */
const GUESSED_AGENT = "claude"

/** A commit, as Claude names one under an answer (`answer()`):  7-40 hex digits. */
const COMMIT = /^[0-9a-f]{7,40}$/

/**
 * A comment's id AS AN INBOX FILE KEYS IT:  `c` and its number, `c3` (epic `epic-engine` P44;  Owen, 2026-10-25:
 * "Can `Mark` be `Comment (C)`").  Owen sees and types `C3`:  `label()`, `idOf()`.
 * - before:  `m3` ("M" for mark, epic `epic-workflow` P23 to `epic-engine` P44), `cm3` (from comments' start, epic
 *   `airplane` P11);  an older file's keys are read as `c3` and written so at its next write (`migrate()`)
 * - `M3` TYPED is a manual test's now, never a comment's:  only a file's own keys are read the old way (`KEYED_ID`)
 * - a checkout on older code reads these SHARED files too, and finds a comment by its key as it is:  until it merges
 *   `main`, its `epic inbox <epic>#M3` commands and its page server miss the comments written since
 */
const STORED = "c"

/** Any way an id may be TYPED:  `C3`, `c3`, the old `cm3`;  any case, a `#` before it aside.  Not `M3`:  a test's. */
const ANY_ID = /^#?cm?(\d+)$/i

/** Any way an inbox file may KEY a comment:  `c3`, and the older `m3` and `cm3`. */
const KEYED_ID = /^(?:c|cm|m)(\d+)$/i

/** Characters that draw nothing and that `trim()` keeps:  zero-width spaces, joiners, the word joiner. */
const INVISIBLE = /[​-‍⁠]/g

/****************
 * ### `CommentsError`
 * A problem the person should see as a message, not a stack trace:  a bad anchor, a missing comment, one that can't
 * change any more.
 * - `status`:  the HTTP status the page server answers with (400 bad input, 404 no such comment, 409 not now)
 ****************/
export class CommentsError extends Error {
  declare cause: { status?: number } | undefined
  /** HTTP status for the page server;  400 unless the cause says otherwise. */
  get status(): number {
    return this.cause?.status ?? 400
  }
}
CommentsError.prototype.name = "CommentsError"

/****************
 * ### `CommentList`
 * COMMENTS Owen leaves on a page's blocks (epic `airplane`, P11), as an inbox file holds them:
 * `{ c1: {...}, c2: {...} }`, edited in place.
 * - IDS (epic `epic-engine` P44):  shown `C1`, `C2` ... (`label()`);  every method taking an id takes `C3`, `c3` or
 *   `cm3` (`idOf()`).  The file keys them `c3` (`STORED`), and an older file's `m3` or `cm3` is read as one
 *   (`migrate()`)
 * - two homes, one shape:
 *   - a docs page's own inbox file, `<page>.inbox.json5` (`GuideInbox`)
 *   - an epic page's review inbox, its `comments` (`ReviewInbox`)
 * - each comment:  where it is (`anchor`, `kind`, `label`, `excerpt`, and for a comment on selected text its
 *   `quote` and `offset`:  `src/tools/BlockAnchors.js`), Owen's text, when, and its status:
 *   - `new`:  saved, waiting for Claude;  Owen may edit or delete it
 *   - any status:  Owen may CLEAR it (`clear()`):  gone from the inbox, its highlight with it
 *   - deleted or cleared:  the page's Undo puts it back as it was (`restore()`)
 *   - `taken`:  Claude took it:  a guide's into epic `feedback` (`taken`:  which phase)
 *   - `answered`:  Claude answered it (an epic page's:  in the doc;  `replies` may hold the answer)
 * - a THREAD (Owen, 2026-10-10:  "the entire comment thread should be in one collapsable pane"):  the comment, then
 *   `replies` in order, Claude's (`answer()`) and Owen's (`reply()`), then maybe `done` (`resolve()`)
 *   - WHOSE TURN (`ThreadFacts.turnOf()`):  the person's once Claude spoke last;  Claude's while a person did;
 *     nobody's once done
 *   - WAITING (`waiting`, `ThreadFacts.isWaiting()`):  Claude's turn, and he hasn't taken it yet.  So a reply on a thread is new work, as a
 *     new comment is (`/epic review`, `/airplane land`, `epic comments gather`)
 *     - an epic page's waiting comment goes to Claude with its page's Send, as a mark does:
 *       `ReviewInbox.unsentComments`, by a person's last words (`ThreadFacts.lastWordsAt()`)
 *   - WORKING (`setWorking()`):  Claude is thinking about it now;  the page shows a "Claude: thinking…" stub at the
 *     thread's end until his answer lands (`answer()` turns it off).  What Owen said before it counts as read:  not
 *     waiting any more, and his last reply no longer his to change (a new one goes after it)
 * - WHO WROTE IT (epic `epic-friend` P2):  every entry names its person, `by`;  an agent's answers are marked
 *   with the agent too, `agent: "codex"` (the list's `agent`, P10), `by` naming whose session wrote them
 *   (`ThreadFacts.agentOf()`)
 *   - the person:  the list's `person`, the page server's or the command's (`EpicHome.personName()`), never the page's
 * - WHOSE IT IS (epic `epic-friend` P9):  a comment is its writer's, `by` (`isOwn()`);  everyone sees every thread
 *   - only its writer changes or clears it (`edit()`, `remove()`, `clear()`, `restore()`:  a 409 for anyone else);
 *     anyone replies on it, closes it or opens it again
 *   - each person's AGENT answers that person's threads:  a Send hands over only the list's person's own
 *     (`ownWaiting`, `unsentSince()`, `sentBy()`), and one nobody's name is on (written before names, or by
 *     "someone");  `waiting` lists everyone's
 *   - whose agent took it:  `claim` (`setWorking()`, `take()`), "taken by Ana's Claude"
 *   - kept one file per person, shared through the epic repo:  `SharedComments`
 * - pure:  no files;  the owner reads and writes them under its lock
 ****************/
export class CommentList {
  /**
   * - `comments`:  the inbox's record, by id;  edited IN PLACE, any key spelt the other way respelt first (`migrate()`)
   * - `person`:  who is writing through it, stamped as `by` on what they write and on their agent's answers;
   *   a function is asked only when something is written.  Default:  "someone"
   * - `agent`:  which agent answers through it (epic `epic-friend` P10), stamped as `agent` on its answers and claims
   *   (`EpicHome.agentName()`);  a function is asked only when it answers.  Default:  `claude`
   */
  constructor(
    readonly comments: Record<string, Comment>,
    {
      person = SOMEONE,
      agent = GUESSED_AGENT
    }: { person?: string | (() => string); agent?: string | (() => string) } = {}
  ) {
    CommentList.migrate(comments)
    this.whoWrites = typeof person === "function" ? person : () => person
    this.whichAgent = typeof agent === "function" ? agent : () => agent
  }

  /** Which agent answers through it:  the id stamped as `agent` (`agent`, asked when it answers). */
  get agent(): string {
    return this.whichAgent()
  }

  /** The constructor's `agent`, as a function. */
  private readonly whichAgent: () => string

  /** Who is writing through it:  the name stamped as `by` (`person`, asked when something's written). */
  get person(): string {
    return this.whoWrites()
  }

  /**
   * Is `comment` this list's person's own (epic `epic-friend` P9):  they wrote it, or nobody's name is on it (written
   * before names, or by "someone")?  A list that names no person owns every comment.
   * - their agent answers it;  only they change or clear it
   */
  isOwn(comment: Pick<Comment, "by">): boolean {
    const person = this.person
    if (!comment.by || comment.by === SOMEONE || person === SOMEONE) return true
    return ThreadFacts.sameName(comment.by, person)
  }

  /** The constructor's `person`, as a function. */
  private readonly whoWrites: () => string

  ////////////////
  // ## Ids
  ////////////////

  /**
   * Comment id `id` as the file keys it (`c3`), however it's typed:  `C3`, `c3`, `cm3`, any case, a `#` before it
   * aside;  anything else as it is, so a lookup says there's no such comment.
   */
  static idOf(this: void, id: string): string {
    const number = typeof id === "string" ? ANY_ID.exec(id.trim())?.[1] : undefined
    return number === undefined ? id : `${STORED}${Number(number)}`
  }

  /**
   * An inbox file's comment KEY as the file keys it now (`c3`):  its older `m3` and `cm3` too (`KEYED_ID`);  anything
   * else as it is.
   * - for a file's own keys only, which are all comments:  a TYPED `M3` is a manual test's (`idOf()`)
   */
  static keyOf(this: void, key: string): string {
    const number = typeof key === "string" ? KEYED_ID.exec(key)?.[1] : undefined
    return number === undefined ? key : `${STORED}${Number(number)}`
  }

  /** Comment id `id` as Owen sees it, on the page and in every command's output:  `C3` (from `c3`, `cm3` alike). */
  static label(this: void, id: string): string {
    const number = typeof id === "string" ? ANY_ID.exec(id.trim())?.[1] : undefined
    return number === undefined ? id : `C${Number(number)}`
  }

  /** Is `id` a comment's id (`C3`, `c3`, `cm3`), not an item's? */
  static isCommentId(this: void, id: string): boolean {
    return typeof id === "string" && ANY_ID.test(id.trim())
  }

  /**
   * Respell the keys of `comments` (an inbox's record) that aren't the file's spelling (`STORED`:  an older file's
   * `m3` or `cm3` is `c3`) IN PLACE;  returns `comments`.
   * - so an inbox written before epic `epic-engine` P44 reads as one written since, and is written so next time
   * - a number two ways (`m3` AND `c3`:  a checkout on older code added one since):  the respelt one takes the next
   *   free number
   * - the order kept:  by number, as `all` reads them
   */
  static migrate(this: void, comments: Record<string, Comment>): Record<string, Comment> {
    if (!comments || typeof comments !== "object") return comments
    CommentList.markAgents(comments)
    // spelt as the file keys it, or no comment id at all
    const keyed = (id: string) => CommentList.keyOf(id) === id
    if (Object.keys(comments).every(keyed)) return comments
    const entries = Object.entries(comments)
    for (const id of Object.keys(comments)) delete comments[id]
    for (const [id, comment] of entries) if (keyed(id)) comments[id] = comment
    for (const [id, comment] of entries) {
      if (keyed(id)) continue
      const wanted = CommentList.keyOf(id)
      comments[Object.hasOwn(comments, wanted) ? nextFree(comments) : wanted] = comment
    }
    const ordered = Object.entries(comments).sort(([a], [b]) => numberOf(a) - numberOf(b))
    for (const [id] of ordered) delete comments[id]
    for (const [id, comment] of ordered) comments[id] = comment
    return comments
  }

  /**
   * Give comments in `comments` (an inbox's record) new ids by `renames` (`c3` => `c5`), IN PLACE, ALL AT ONCE (a
   * rename may free an id another takes);  how many moved.
   * - the epic repo's sync, when two people both made `c3` (`Renumber.comments()`, epic `epic-friend` P9):  this
   *   machine's take the next free numbers
   * - an id already there under its new id:  the moved one wins (the sync freed it for it)
   */
  static renumber(this: void, comments: Record<string, Comment>, renames: Record<string, string>): number {
    const moving = Object.entries(renames)
      .filter(([from]) => Object.hasOwn(comments, from))
      .map(([from, to]) => [to, comments[from]!] as const)
    for (const [from] of Object.entries(renames)) if (Object.hasOwn(comments, from)) delete comments[from]
    for (const [to, comment] of moving) comments[to] = comment
    return moving.length
  }

  /**
   * Mark Claude's old answers on `comments`' threads as his, IN PLACE:  `agent: "claude"` on each reply written before
   * the marker (`ThreadFacts.isOldClaudes()`:  by "Claude", dated before `AGENTS_MARKED`);  did it change any?
   * - the inboxes' half of the migration `agents-marked` (epic `epic-friend` P2):  every read sees them marked, and the
   *   next write keeps them so;  `epic migrate` marks every inbox in the epic folder at once
   * - IDEMPOTENT:  a marked reply is left
   */
  static markAgents(this: void, comments: Record<string, Comment>): boolean {
    let changed = false
    for (const comment of Object.values(comments ?? {}))
      for (const reply of Array.isArray(comment?.replies) ? comment.replies : [])
        if (reply && typeof reply === "object" && ThreadFacts.isOldClaudes(reply)) {
          reply.agent = ThreadFacts.agentOf(reply)!
          changed = true
        }
    return changed
  }

  ////////////////
  // ## Reading
  ////////////////

  /** Every comment with its id, in the order written. */
  get all(): IdentifiedComment[] {
    return Object.entries(this.comments)
      .map(([id, comment]) => ({ id, ...comment }))
      .sort((a, b) => numberOf(a.id) - numberOf(b.id))
  }

  /**
   * The comments waiting for Claude:  new ones, and threads Owen replied on since Claude last answered or took them
   * (`isWaiting()`).
   */
  get waiting(): IdentifiedComment[] {
    return this.all.filter((comment) => ThreadFacts.isWaiting(comment))
  }

  /**
   * The waiting comments this list's person's agent answers (`isOwn()`, epic `epic-friend` P9):  what their Send hands
   * over;  another person's waits for theirs.
   */
  get ownWaiting(): IdentifiedComment[] {
    return this.waiting.filter((comment) => this.isOwn(comment))
  }

  /**
   * The waiting comments a Send at `sent` (ISO;  `null`:  never sent) has NOT handed over:
   * a person's last words newer than it (`ThreadFacts.lastWordsAt()`), all of them before the first send.
   * - only the list's person's own (`ownWaiting`):  a Send is theirs, for their agent
   * - an epic page's Send (`ReviewInbox.unsentComments`) and a guide's (`GuideInbox.unsentComments`) alike
   */
  unsentSince(sent: string | null): IdentifiedComment[] {
    const since = sent ? Date.parse(sent) : -Infinity
    return this.ownWaiting.filter((comment) => Date.parse(ThreadFacts.lastWordsAt(comment)) > since)
  }

  /**
   * The waiting comments a Send at `sent` handed over:  a person's last words at or before it;  none before the first
   * send (`sent` `null`).  Only the list's person's own (`ownWaiting`).
   */
  sentBy(sent: string | null): IdentifiedComment[] {
    if (!sent) return []
    const at = Date.parse(sent)
    return this.ownWaiting.filter((comment) => Date.parse(ThreadFacts.lastWordsAt(comment)) <= at)
  }

  /** Comment `id` (`C3`, `c3`, `cm3`);  throws a 404 `CommentsError` when there's none. */
  comment(id: string): Comment {
    const key = CommentList.idOf(id)
    const comment = Object.hasOwn(this.comments, key) ? this.comments[key] : undefined
    if (!comment) throw new CommentsError(`no comment ${CommentList.label(id)} here`, { cause: { status: 404 } })
    return comment
  }

  ////////////////
  // ## Owen's edits (the page's bullhorns)
  ////////////////

  /**
   * Add a comment on the block at `where`;  returns its id, as the file keys it (`c3`).
   * - throws on a bad anchor or kind, or blank text
   */
  add(where: CommentPlace, text: string, now = new Date()): string {
    const { anchor, kind, quote, offset } = where
    if (typeof anchor !== "string" || !ANCHOR.test(anchor)) throw new CommentsError(`"${anchor}" isn't an anchor`)
    if (typeof kind !== "string" || !KIND.test(kind)) throw new CommentsError(`"${kind}" isn't a kind of block`)
    const id = this.nextId()
    const comment: Comment = {
      anchor,
      kind,
      label: short(where.label),
      excerpt: short(where.excerpt),
      text: checkedText(text),
      by: this.person,
      at: now.toISOString(),
      status: "new"
    }
    if (typeof quote === "string" && quote.trim()) {
      comment.quote = quote.trim().slice(0, MAX_QUOTE)
      comment.offset = Number.isInteger(offset) && Number(offset) >= 0 ? Number(offset) : 0
    }
    this.comments[id] = comment
    return id
  }

  /** Replace comment `id`'s text;  only while it's `new`, and only its writer (`isOwn()`). */
  edit(id: string, text: string, now = new Date()): void {
    const comment = this.unseen(id)
    this.mustOwn(id, comment)
    comment.text = checkedText(text)
    comment.edited = now.toISOString()
  }

  /** Delete comment `id`;  only while it's `new`, and only its writer (`isOwn()`). */
  remove(id: string): void {
    this.mustOwn(id, this.unseen(id))
    delete this.comments[CommentList.idOf(id)]
  }

  /**
   * Clear comment `id`, whatever its status:  Owen's done with it (Owen, 2026-10-10:  "I should be able to clear a
   * comment").  A taken one stays in the epic it went into;  an answered one's answer goes with it.
   * - only its writer (`isOwn()`):  a 409 for anyone else
   */
  clear(id: string): void {
    this.mustOwn(id, this.comment(id))
    delete this.comments[CommentList.idOf(id)]
  }

  /**
   * Put back comment `comment`, deleted or cleared a moment ago, as it was:  its place, text, dates, status, the
   * phase it went into and Claude's answers (the page's Undo, Owen 2026-10-10:  "didn't know it needed two clicks").
   * Returns its id:  `id` again, unless a new comment took it meanwhile;  then the next free one.
   * - throws on what `add()` refuses (a bad anchor or kind, blank text), or a status that isn't one
   */
  restore(id: string, comment: Comment): string {
    const { anchor, kind, quote, offset, status, taken, replies, edited, done } = comment ?? ({} as Comment)
    if (typeof anchor !== "string" || !ANCHOR.test(anchor)) throw new CommentsError(`"${anchor}" isn't an anchor`)
    if (typeof kind !== "string" || !KIND.test(kind)) throw new CommentsError(`"${kind}" isn't a kind of block`)
    if (!STATUSES.includes(status)) throw new CommentsError(`"${status}" isn't a comment's status`)
    this.mustOwn(id, comment)
    const back: Comment = {
      anchor,
      kind,
      label: short(comment.label),
      excerpt: short(comment.excerpt),
      text: checkedText(comment.text),
      at: stamp(comment.at) ?? new Date().toISOString(),
      status
    }
    if (short(comment.by)) back.by = short(comment.by)
    if (typeof quote === "string" && quote.trim()) {
      back.quote = quote.trim().slice(0, MAX_QUOTE)
      back.offset = Number.isInteger(offset) && Number(offset) >= 0 ? Number(offset) : 0
    }
    if (stamp(edited)) back.edited = stamp(edited)
    if (taken && typeof taken.epic === "string" && isPhaseNumber(taken.phase)) {
      back.taken = { epic: taken.epic, phase: taken.phase, at: stamp(taken.at) ?? back.at }
      if (typeof taken.phaseId === "string" && PHASE_ID.test(taken.phaseId)) back.taken.phaseId = taken.phaseId
      if (short(taken.title)) back.taken.title = short(taken.title)
    }
    const thread = Array.isArray(replies) ? replies.flatMap((reply) => restoredReply(reply, back.at)) : []
    if (thread.length) back.replies = thread
    if (done && RESOLUTIONS.includes(done.how))
      back.done = { how: done.how, at: stamp(done.at) ?? back.at, ...(short(done.by) && { by: short(done.by) }) }
    if (short(comment.reopened?.by) && stamp(comment.reopened?.at))
      back.reopened = { at: stamp(comment.reopened!.at)!, by: short(comment.reopened!.by) }
    const { claim } = comment
    if (claim && short(claim.by) && short(claim.agent) && stamp(claim.at))
      back.claim = { by: short(claim.by), agent: short(claim.agent), at: stamp(claim.at)! }
    const wanted = CommentList.idOf(id)
    const free = CommentList.isCommentId(id) && !Object.hasOwn(this.comments, wanted)
    const restored = free ? wanted : this.nextId()
    this.comments[restored] = back
    return restored
  }

  ////////////////
  // ## Owen's thread (the page's threads)
  ////////////////

  /**
   * Owen's reply on comment `id`'s thread (Revisit:  saved as he types).
   * - his PENDING reply (the last entry, his, not taken since) takes `text`;  else a new one goes at the end
   * - reopens a closed thread
   * - `text` blank:  the pending reply goes (emptied, as a comment is);  with none pending, refused:  a reply needs
   *   words
   */
  reply(id: string, text: string, now = new Date()): void {
    const comment = this.comment(id)
    const pending = this.pendingReply(comment)
    const blank = typeof text !== "string" || !text.replace(INVISIBLE, "").trim()
    if (blank && pending) {
      comment.replies = comment.replies!.slice(0, -1)
      if (!comment.replies.length) delete comment.replies
      return
    }
    const words = checkedText(text)
    delete comment.done
    if (pending) {
      pending.text = words
      pending.edited = now.toISOString()
    } else comment.replies = [...(comment.replies ?? []), { by: this.person, at: now.toISOString(), text: words }]
  }

  /**
   * Close comment `id`'s thread:  `good` ("that's good":  done) or `skip` ("skip it":  nothing more to do).
   * - throws a 400 for any other `how`
   */
  resolve(id: string, how: string, now = new Date()): void {
    const comment = this.comment(id)
    if (!RESOLUTIONS.includes(how)) throw new CommentsError(`a thread closes as "good" or "skip", not "${how}"`)
    comment.done = { how: how as Resolution, at: now.toISOString(), by: this.person }
  }

  /**
   * Open comment `id`'s thread again:  the page's Undo after "that's good" or "skip it", and its Reopen.
   * - stamped `reopened`, so a close another person's file still holds counts no more (`SharedComments`)
   */
  reopen(id: string, now = new Date()): void {
    const comment = this.comment(id)
    delete comment.done
    comment.reopened = { at: now.toISOString(), by: this.person }
  }

  /** This list's person's pending reply on `comment` (`ThreadFacts.pendingReplyOf()`);  else `undefined`. */
  private pendingReply(comment: Comment): CommentReply | undefined {
    const person = this.person
    return ThreadFacts.pendingReplyOf(comment, person === SOMEONE ? undefined : person) ?? undefined
  }

  ////////////////
  // ## Claude's edits
  ////////////////

  /**
   * Mark comment `id` taken into `epic`'s phase `phase`:  no longer Owen's to change.
   * - `phaseId`, `title`:  the phase's stable id and its title (epic `epic-engine` I16), so its thread's link finds the
   *   phase after an insert moves its number (`ThreadFacts.takenInto()`, `spell/epic/comments`)
   * - `claim`:  the list's person's agent took it (epic `epic-friend` P9)
   */
  take(id: string, { epic, phase, phaseId, title }: TakenInto, now = new Date()): void {
    const comment = this.comment(id)
    comment.status = "taken"
    comment.taken = { epic, phase, ...(phaseId ? { phaseId } : {}), ...(title ? { title } : {}), at: now.toISOString() }
    comment.claim = this.claimOf(now)
  }

  /**
   * Claude is thinking about comment `id` (`on`), or stopped (`!on`):  the page shows a "Claude: thinking…" stub at
   * the end of its thread meanwhile (`epic comments working`, `epic inbox working <name>#C3 on`).
   * - `working`:  since when;  set again, it keeps the first time
   * - `claim`:  whose agent it is, the list's person's (epic `epic-friend` P9):  "taken by Ana's Claude"
   * - `answer()` turns it off
   */
  setWorking(id: string, on: boolean, now = new Date()): void {
    const comment = this.comment(id)
    if (!on) {
      delete comment.working
      return
    }
    // another person's agent working on it already:  this one takes it over, from now
    if (comment.working && comment.claim && !ThreadFacts.sameName(comment.claim.by, this.person)) delete comment.working
    comment.working ??= now.toISOString()
    comment.claim = this.claimOf(new Date(comment.working))
  }

  /** This list's person's agent taking a comment at `at` (`claim`):  "taken by Ana's Claude". */
  private claimOf(at: Date): CommentClaim {
    return { by: this.person, agent: this.agent, at: at.toISOString() }
  }

  /** Comment `id` (`comment`), when it's this list's person's (`isOwn()`);  throws a 409 naming its writer. */
  private mustOwn(id: string, comment: Comment): void {
    if (this.isOwn(comment)) return
    throw new CommentsError(
      `comment ${CommentList.label(id)} is ${comment.by}'s:  only they change or clear it;  reply on its thread instead`,
      { cause: { status: 409 } }
    )
  }

  /**
   * Comment `id` answered:  `html` (as is:  a `<p>` or more) on its thread, after any before it.
   * - none:  answered elsewhere (an epic page's comment, in the doc).  An entry with no words still goes on the
   *   thread, so it's Owen's turn, unless Claude spoke last already.
   * - `commit`:  the commit the answer was built in (the thread's Done line shows it);  throws a 400 when it isn't one
   * - Claude's done thinking about it:  its `working` goes
   * - marked the list's agent's (`agent: "codex"`;  epic `epic-friend` P10), `by` the list's `person`:  whose session
   *   answered
   */
  answer(id: string, html = "", now = new Date(), commit?: string): void {
    const comment = this.comment(id)
    const markup = String(html ?? "").trim()
    if (commit !== undefined && !COMMIT.test(commit)) throw new CommentsError(`"${commit}" isn't a commit`)
    const reply: CommentReply = { by: this.person, agent: this.agent, at: now.toISOString(), html: markup }
    if (commit) reply.commit = commit
    if (markup || commit || ThreadFacts.turnOf(comment) === "agent")
      comment.replies = [...(comment.replies ?? []), reply]
    if (comment.status === "new") comment.status = "answered"
    delete comment.working
  }

  /** The id a new comment gets:  one past the highest (`c3` after `c2`). */
  private nextId(): string {
    return nextFree(this.comments)
  }

  /** Comment `id`, while it's `new`;  throws a 409 once Claude has it. */
  private unseen(id: string): Comment {
    const comment = this.comment(id)
    if (comment.status !== "new")
      throw new CommentsError(
        `comment ${CommentList.label(id)} is ${comment.status}:  Claude has it, so add a new comment instead`,
        {
          cause: { status: 409 }
        }
      )
    return comment
  }
}

/** Where a comment is, as the page sends it (`BlockAnchors.js`). */
export type CommentPlace = {
  /** the block's anchor:  its id, or `<section id | page>#<kind>-<n>` */
  anchor: string
  /** its kind (`table` ...), or `page` */
  kind: string
  /** its section's title (`2. Memory`), for a reader;  `""` before any section */
  label?: string
  /** its first words, to find it again if the page changes */
  excerpt?: string
  /** a comment on selected text:  that text, as selected */
  quote?: string
  /** where `quote` starts in the block's text (white space squashed), to tell two copies of it apart */
  offset?: number
}

/** One comment, as an inbox file holds it. */
export type Comment = Required<Omit<CommentPlace, "quote" | "offset">> &
  Pick<CommentPlace, "quote" | "offset"> & {
    /** Owen's words, as typed:  plain text, blank lines between paragraphs */
    text: string
    /** who wrote them (epic `epic-friend` P2):  the person's name, as the page server stamped it;  none before */
    by?: string
    /** when written, ISO */
    at: string
    /** when last edited, ISO */
    edited?: string
    /** `new` (saved, waiting for Claude), `taken` (in an epic's phase) or `answered` */
    status: "new" | "taken" | "answered"
    /** the phase it went into, and when */
    taken?: TakenInto & { at: string }
    /** its thread after Owen's first words, in order:  Claude's answers, Owen's replies */
    replies?: CommentReply[]
    /** a person closed the thread:  "that's good" (`good`) or "skip it" (`skip`), when, and who (none before P9) */
    done?: { how: Resolution; at: string; by?: string }
    /** a person opened it again since a close (`reopen()`, epic `epic-friend` P9):  when, and who */
    reopened?: { at: string; by: string }
    /** Claude is thinking about it (`setWorking()`):  since when, ISO */
    working?: string
    /** whose agent took it last (`setWorking()`, `take()`;  epic `epic-friend` P9):  "taken by Ana's Claude" */
    claim?: CommentClaim
  }

/**
 * An agent taking a comment (`Comment.claim`, epic `epic-friend` P9):  whose session (`by`, a person's name), which
 * agent (`"claude"`, `"codex"` ...), and when.
 */
export type CommentClaim = { by: string; agent: string; at: string }

/**
 * One entry of a comment's thread (who wrote it:  `ThreadFacts.agentOf()`):
 * - an agent's (`agent: "codex"`;  Claude's before the marker, `by: "Claude"`):  `html`, as is (`""`:  answered elsewhere, an
 *   epic page's in the doc), and `commit`, the commit it was built in;  `by` whose session wrote it
 * - a person's (no `agent`, `by` their name):  `text`, as typed (plain, as a comment's), and `edited`, when they last
 *   changed it
 */
export type CommentReply = {
  /** who wrote it, or whose session did:  a person's name (`"Ana"`);  Claude's before the marker:  `"Claude"` */
  by: string
  /** the agent that wrote it (`"claude"`, `"codex"` ...);  none:  the person did */
  agent?: string
  at: string
  html?: string
  text?: string
  commit?: string
  edited?: string
}

/** How Owen closed a thread:  "that's good", or "skip it". */
export type Resolution = "good" | "skip"

/**
 * Whose turn it is on a thread (`ThreadFacts.turnOf()`):  a person's, an agent's, or nobody's once done.
 * - `agent` was `claude` before epic `epic-friend` P10 (`ThreadFacts.asTurn()` reads it so)
 */
export type Turn = "person" | "agent" | "done"

/** A comment with its id (`c3`). */
export type IdentifiedComment = Comment & { id: string }

/** `reply` as `restore()` keeps it:  one entry;  none when it's neither Claude's answer nor a person's words. */
function restoredReply(reply: CommentReply, fallback: string): CommentReply[] {
  if (typeof reply?.by !== "string") return []
  const at = stamp(reply.at) ?? fallback
  const agent = ThreadFacts.agentOf(reply)
  if (!agent) {
    if (typeof reply.text !== "string" || !reply.text.trim()) return []
    const kept: CommentReply = { by: reply.by, at, text: checkedText(reply.text) }
    if (stamp(reply.edited)) kept.edited = stamp(reply.edited)
    return [kept]
  }
  if (typeof reply.html !== "string") return []
  const kept: CommentReply = { by: reply.by, agent, at, html: reply.html }
  if (typeof reply.commit === "string" && COMMIT.test(reply.commit)) kept.commit = reply.commit
  return [kept]
}

/** `value` as an ISO date, when it's a date;  else `undefined`. */
function stamp(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

/** A comment key's number:  `c12` (the older `m12`, `cm12`) -> 12;  0 for anything else. */
function numberOf(id: string): number {
  return Number(KEYED_ID.exec(id)?.[1] ?? 0)
}

/** The id one past the highest of `comments`' (`c3` after `c2`, or after an old `m2`;  `c1` for none). */
function nextFree(comments: Record<string, Comment>): string {
  return `${STORED}${Math.max(0, ...Object.keys(comments).map(numberOf)) + 1}`
}

/**
 * `text` trimmed;  throws when blank (white space only, or characters that draw nothing:  zero-width spaces and
 * joiners) or too long:  NEVER an empty comment (Owen, 2026-10-10).
 */
function checkedText(text: unknown): string {
  const words = typeof text === "string" ? text.trim() : ""
  if (!words.replace(INVISIBLE, "").trim()) throw new CommentsError("a comment needs some text")
  if (words.length > MAX_TEXT) throw new CommentsError(`a comment holds at most ${MAX_TEXT} characters`)
  return words
}

/**
 * The phase a comment was taken into (`CommentList.take()`).
 * - `phase`:  its number then, `7`;  a decimal phase's as text, `"11.1"` (epic `epic-engine` P39)
 * - `phaseId`, `title`:  its stable id (`p-memory`) and title (`Memory`);  none in a comment taken before epic
 *   `epic-engine` I16
 */
export type TakenInto = { epic: string; phase: number | string; phaseId?: string; title?: string }

/** Is `phase` a phase's number, as `taken.phase` holds one:  `7`, or a decimal phase's `"11.1"`? */
function isPhaseNumber(phase: unknown): phase is number | string {
  return Number.isInteger(phase) || (typeof phase === "string" && /^\d+(\.\d+)?$/.test(phase))
}

/** A stable phase id, as `taken.phaseId` holds one:  `p-memory`. */
const PHASE_ID = /^p-[a-z0-9]+(?:-[a-z0-9]+)*$/

/** A label or excerpt, as kept:  one line, at most `MAX_LABEL` characters. */
function short(text: unknown): string {
  return typeof text === "string" ? text.replace(/\s+/g, " ").trim().slice(0, MAX_LABEL) : ""
}
