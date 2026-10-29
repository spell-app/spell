import { clockTime, localDate } from "spell/util/time"
import type { Comment, CommentPlace, CommentReply, TakenInto, Turn } from "spell/epic/tool/CommentList"

/****************
 * ### `ThreadFacts`
 * What a comment's THREAD shows, worked out from the comment as the comments route answers it (epic `airplane` P11,
 * its threads since 2026-10-10):  who wrote each word, whose turn it is, a person's words Claude hasn't had yet, its
 * id as people see it, the few words its header and the comment pane say it's on, its times, and where a taken
 * comment went.
 * - ONE copy for everything that draws a thread, or asks who wrote a reply (epic `epic-engine` P3, `epic-friend` P2):
 *   - the docs runtime's comments (`spell-doc-comments.js`):  the pane, the reply boxes, Cmd / Ctrl + K
 *   - the `<epic-thread>` family (the epics pack):  the thread itself and its messages
 *   - the epic page's replies (`<epic-reply>`, `AnswerThread`) and the epic tool (`PlanItem`, `CommentList`,
 *     the inbox and comments commands):  `isAgents()`, `lastPersonReply()`
 * - WHO WROTE IT (epic `epic-friend` P2, Q9):  an AGENT's words are marked as such, never told by a name, so a person
 *   who calls themselves "Claude" stays a person (`agentOf()`)
 *   - a page's `<epic-reply from="Ana" agent="claude">`, a comment's reply `{ by: "Ana", agent: "claude" }`:
 *     Ana's Claude;  no `agent`:  Ana herself
 *   - `from` in the page's markup, `by` in data:  the same idea, who wrote it (or whose session did)
 * - STATIC and pure:  no DOM, no Solid, nothing but types imported, so the comments' own script
 *   (`spell-comments.js`, which must hold no Spell UI) and node load it alike.
 *   The one global it reads, the page's own person (`viewer()`), is a parameter with that default.
 * - NOT in the `spell-epic` barrel:  the docs runtime imports it alone.
 ****************/
export class ThreadFacts {
  ////////////////
  // ## Who wrote it
  ////////////////

  /**
   * Which agent wrote `reply` (`"claude"`), else `undefined`:  a person did.
   * - `reply`:  a page's `<epic-reply>` (anything with `getAttribute()`), or a comment's reply (`{ by, agent, at }`)
   * - its `agent`, when it says;  else the OLD RULE, for what was written before the marker (`AGENTS_MARKED`):
   *   by "Claude", any case, and dated before then (or not dated) is Claude's;  so no old page changes meaning,
   *   and a person who calls themselves "Claude" today is a person
   * - the migration `agents-marked` writes the marker on the old ones, so the old rule can go one day
   */
  static agentOf(reply: AnyReply | null | undefined): string | undefined {
    if (!reply) return undefined
    const agent = ThreadFacts.field(reply, "agent")?.trim()
    if (agent) return agent
    return ThreadFacts.isOldClaudes(reply) ? CLAUDE_AGENT : undefined
  }

  /** Did an agent write `reply` (`agentOf()`)? */
  static isAgents(reply: AnyReply | null | undefined): boolean {
    return ThreadFacts.agentOf(reply) !== undefined
  }

  /**
   * Is `reply` one of Claude's written before the marker, with none (`agentOf()`'s old rule):  by "Claude" (any
   * case), dated before `AGENTS_MARKED`, or not dated?
   */
  static isOldClaudes(reply: AnyReply): boolean {
    if (ThreadFacts.field(reply, "agent")?.trim()) return false
    if (!sameName(ThreadFacts.authorOf(reply), CLAUDE_NAME)) return false
    const at = ThreadFacts.field(reply, "at") ?? ""
    return !at || at < ThreadFacts.AGENTS_MARKED
  }

  /** Who wrote `reply`, or whose session did:  its `from` (a page's) or `by` (data's), trimmed;  `""` for none. */
  static authorOf(reply: AnyReply): string {
    return (ThreadFacts.field(reply, "from") ?? ThreadFacts.field(reply, "by") ?? "").trim()
  }

  /**
   * Who `reply` is from, as a page shows it to `viewer` (the page's own person, `viewer()`):
   * - `person`:  the person who wrote it, or whose session did;  `undefined` for an agent's reply naming no person
   *   (Claude's old ones, `from="Claude"`, marked or not):  drawn "Claude"
   * - `agent`:  the agent that wrote it (`agentOf()`)
   * - `mine`:  `person` is `viewer`, the same words, any case:  "You", or plain "Claude" for your own session's
   */
  static speakerOf(reply: AnyReply, viewer: string | undefined = ThreadFacts.viewer()): Speaker {
    const agent = ThreadFacts.agentOf(reply)
    const author = ThreadFacts.authorOf(reply)
    // Claude's own name names nobody:  an old reply, or one the migration marked (`from="Claude" agent="claude"`)
    const namesNobody = !author || (agent !== undefined && sameName(author, CLAUDE_NAME))
    const person = namesNobody ? undefined : author
    return { person, agent, mine: !!person && !!viewer && sameName(person, viewer) }
  }

  /**
   * Who is reading this page:  the name the page server told it, `window.SPELL_SERVER.person` (epic `epic-friend`
   * P1);  `undefined` when it said none (no name kept, and git has none), or off a page server.
   */
  static viewer(holder: { SPELL_SERVER?: { person?: unknown } } = globalThis as never): string | undefined {
    const person = holder?.SPELL_SERVER?.person
    return typeof person === "string" && person.trim() ? person.trim() : undefined
  }

  /** Are `a` and `b` the same person's name:  the same words, any case, spaces trimmed? */
  static sameName(this: void, a: string | undefined, b: string | undefined): boolean {
    return sameName(a ?? "", b ?? "")
  }

  /** `reply`'s field `name`:  an element's attribute, or a record's own key;  `undefined` when it has none. */
  private static field(reply: AnyReply, name: "from" | "by" | "agent" | "at"): string | undefined {
    if (typeof (reply as ReplyElement).getAttribute === "function")
      return (reply as ReplyElement).getAttribute(name) ?? undefined
    const value = (reply as Record<string, unknown>)[name]
    return typeof value === "string" ? value : undefined
  }

  ////////////////
  // ## Whose turn
  ////////////////

  /**
   * Whose turn it is on `comment`'s thread:  `done`, `person` or `claude` (sent by the comments route as each
   * comment's `turn`).
   * - `done`:  the person closed it
   * - `person`:  Claude spoke last.  Also an epic page's comment answered in the doc, with no words on the thread.
   * - `claude`:  a person spoke last (the comment, or a reply).  Claude may have TAKEN it, but hasn't answered yet.
   */
  static turnOf(comment: Comment): Turn {
    if (comment.done) return "done"
    const last = comment.replies?.at(-1)
    if (last) return ThreadFacts.isAgents(last) ? "person" : "claude"
    return comment.status === "answered" ? "person" : "claude"
  }

  /**
   * `comments` as the server answered (none:  `[]`), each with its `turn`:  the server's, else `turnOf()`.
   * - a server from before epic `epic-friend` P2 says `owen` for the person's turn:  read as `person`
   */
  static withTurns(comments: readonly ThreadComment[] = []): ThreadComment[] {
    return comments.map((comment) => {
      const turn = (comment.turn as string) === OLD_PERSON_TURN ? "person" : comment.turn
      return turn ? { ...comment, turn } : { ...comment, turn: ThreadFacts.turnOf(comment) }
    })
  }

  /** The last reply a PERSON wrote on `comment`'s thread (not an agent:  `isAgents()`);  `undefined` for none. */
  static lastPersonReply(comment: Pick<Comment, "replies">): CommentReply | undefined {
    return comment.replies?.findLast((each) => !ThreadFacts.isAgents(each))
  }

  /** When Claude last replied on `comment`'s thread (an ISO time), else `""`. */
  static latestClaudeAt(comment: Pick<Comment, "replies">): string {
    return comment.replies?.findLast((each) => ThreadFacts.isAgents(each) && each.at)?.at ?? ""
  }

  /**
   * Is `comment` new work for Claude:  his turn, and not taken (nor being worked on) since a person last spoke?
   * (`CommentList.waiting`)
   */
  static isWaiting(comment: Comment): boolean {
    if (ThreadFacts.turnOf(comment) !== "claude") return false
    const spoke = ThreadFacts.lastPersonReply(comment)?.at ?? comment.at
    const held = heldSince(comment)
    return !held || held < spoke
  }

  /**
   * When a person last changed their words on `comment`'s thread, ISO:
   * the latest of the comment, their replies, and their edits.
   * - what a Send compares with its `sent` (`ReviewInbox.unsentComments`, `GuideInbox`):
   *   words newer than the last send haven't gone to Claude yet
   */
  static lastWordsAt(comment: Comment): string {
    const times = [comment.at, comment.edited]
    for (const reply of comment.replies ?? []) if (!ThreadFacts.isAgents(reply)) times.push(reply.at, reply.edited)
    return times
      .filter((each): each is string => !!each)
      .reduce((latest, each) => (Date.parse(each) > Date.parse(latest) ? each : latest))
  }

  /**
   * A person's words on `comment` that Claude hasn't had yet, which they may still change:
   * - `edit`:  their first words, while the comment is `new` and Claude isn't thinking about it
   * - `reply`:  their pending reply (`pendingReplyOf()`)
   * - else `null`
   */
  static pendingOf(comment: Comment): "edit" | "reply" | null {
    if (comment.done) return null
    if (comment.status === "new" && !comment.replies?.length) return comment.working ? null : "edit"
    return ThreadFacts.pendingReplyOf(comment) ? "reply" : null
  }

  /**
   * A person's PENDING reply on `comment`:  its thread's last entry, a person's, not taken since, nor being thought
   * about (`working`);  else `null`.
   * - as the server's `CommentList` has it:  the next save changes it, rather than adding another
   */
  static pendingReplyOf(comment: Comment): CommentReply | null {
    const last = comment.replies?.at(-1)
    if (!last || ThreadFacts.isAgents(last)) return null
    const held = heldSince(comment)
    return held && held >= last.at ? null : last
  }

  ////////////////
  // ## Ids
  ////////////////

  /**
   * A comment id's number, however typed or keyed:  `C3`, `c3`, the old `cm3` (any case, a `#` before it aside) -> 3;
   * else `undefined`.  As `CommentList.idOf()`.
   * - NOT `M3`:  a manual test's id since epic `epic-engine` P44 (a comment's before:  "M" for mark)
   */
  static numberOf(typed: string | undefined): number | undefined {
    const number = TYPED_ID.exec((typed ?? "").trim())?.[1]
    return number === undefined ? undefined : Number(number)
  }

  /** A comment's id as Owen sees it:  `C3` (`c3`, `cm3` alike;  `CommentList.label()`). */
  static label(id: string): string {
    const number = ThreadFacts.numberOf(id)
    return number === undefined ? String(id) : `C${number}`
  }

  ////////////////
  // ## What it's on
  ////////////////

  /**
   * A few words of what a comment is on, for a thread's header and the comment pane's:  the start of the selected
   * text, else of its block's text, in quotes;  "This page" for the page.
   */
  static headline(place: ThreadPlace): string {
    if (place.kind === "page") return "This page"
    const words = (place.quote || place.excerpt || place.label || "").replace(/\s+/g, " ").trim()
    if (!words) return `This ${ThreadFacts.kindName(place.kind)}`
    return `“${words.length > HEADLINE_CHARS ? `${words.slice(0, HEADLINE_CHARS).trimEnd()}…` : words}”`
  }

  /**
   * Which block a comment is on, in full, for a tooltip:  "On a field in “Guide Comments”";  with its id (a saved
   * comment's):  "Comment C3, on ..."
   */
  static aboutTip({ id, place }: { id?: string; place: ThreadPlace }): string {
    const what = THE_ONE.includes(place.kind)
      ? `the ${ThreadFacts.kindName(place.kind)}`
      : `a ${ThreadFacts.kindName(place.kind)}`
    const named = place.kind === "section" || place.kind === "item"
    const on = named && place.label ? `“${place.label}”` : what
    const where = place.kind === "page" || named || !place.label ? "" : ` in “${place.label}”`
    const said = place.quote ? `:  “${place.quote}”` : ""
    return `${id ? `Comment ${ThreadFacts.label(id)}, on` : "On"} ${on}${where}${said}`
  }

  /** What a block kind is called in a bullhorn's tooltip and the comment pane (`table`, `code block` ...). */
  static kindName(kind: string): string {
    return KIND_NAMES[kind] ?? kind
  }

  ////////////////
  // ## Times
  ////////////////

  /** An ISO time as local `YYYY-MM-DD HH:MM`;  not a date:  as given. */
  static localStamp(iso: string | undefined): string {
    const date = new Date(iso ?? "")
    if (Number.isNaN(date.getTime())) return iso ?? ""
    return `${localDate(date)} ${clockTime(date)}`
  }

  /** A local `YYYY-MM-DD HH:MM` (`localStamp()`) as a thread or a note shows it, no year:  `10/10 14:02`. */
  static shortStamp(at: string | undefined): string {
    const parts = SHORT_STAMP.exec(at ?? "")
    return parts ? `${Number(parts[1])}/${Number(parts[2])} ${parts[3]}` : (at ?? "")
  }

  ////////////////
  // ## Taken into an epic
  ////////////////

  /**
   * Where a taken comment's thread links, and what the link says (epic `epic-engine` I16):  `{ hash, label }`.
   * - by the phase's stable id, `#p-memory`, so the link still lands after a phase goes in ahead of it;  its words
   *   the epic and the phase's title, `feedback · Memory`
   * - one taken before I16 (no id):  by its number, `#p7` (an old address, landing on the 7th phase), `feedback P7`
   */
  static takenInto({ epic, phase, phaseId, title }: TakenInto): { hash: string; label: string } {
    return {
      hash: phaseId || `p${phase}`,
      label: phaseId && title ? `${epic} · ${title}` : `${epic} P${phase}`
    }
  }

  /**
   * When agents' replies started carrying their marker (`agent`), as a reply's `at` sorts:  `agentOf()`'s old rule
   * holds only before it.
   * - a day after epic `epic-friend` P2 was built, so sessions on older code could finish their turn;  a person named
   *   "Claude" before then reads as Claude
   * - STATIC:  one day for every page, data file and tool
   */
  static readonly AGENTS_MARKED = "2026-11-01"
}

/** Where a comment is, as its thread and the pane name it:  its kind, section, first words and quote. */
export type ThreadPlace = Pick<CommentPlace, "kind" | "label" | "excerpt" | "quote">

/**
 * A comment as the comments route answers it (`GET /api/docs/comments`):  as the inbox holds it, with its id and
 * whose `turn` it is (none from a server started before threads:  `ThreadFacts.withTurns()`).
 */
export type ThreadComment = Comment & { id: string; turn?: Turn }

/** A reply, as `agentOf()` and the rest take it:  a page's `<epic-reply>`, or a comment's reply. */
export type AnyReply = ReplyElement | Pick<CommentReply, "by" | "at" | "agent">

/** A page's reply element, as far as `ThreadFacts` reads it:  its attributes. */
export type ReplyElement = { getAttribute(name: string): string | null }

/** Who a reply is from, as a page shows it (`speakerOf()`). */
export type Speaker = {
  /** the person who wrote it, or whose session did;  `undefined` for an old reply of Claude's, which names nobody */
  person: string | undefined
  /** the agent that wrote it (`"claude"`);  `undefined`:  the person did */
  agent: string | undefined
  /** the person is whoever is reading */
  mine: boolean
}

/** The one agent today:  Claude's marker, `agent="claude"`. */
const CLAUDE_AGENT = "claude"

/** The name Claude's replies went by before the marker. */
const CLAUDE_NAME = "Claude"

/** What a page server from before epic `epic-friend` P2 calls the person's turn. */
const OLD_PERSON_TURN = "owen"

/** A typed comment id:  `C3`, `c3`, the old `cm3`, a `#` before it (`M3` is a manual test's:  epic `epic-engine` P44). */
const TYPED_ID = /^#?cm?(\d+)$/i

/** How many characters of the selected text (or the block's) a header shows. */
const HEADLINE_CHARS = 40

/** A local stamp's month, day and time (`localStamp()`, or a note's `at`). */
const SHORT_STAMP = /^\d{4}-(\d\d)-(\d\d)[ T](\d\d:\d\d)/

/** The blocks a page has one of:  "the page", "the Overview" (`aboutTip()`). */
const THE_ONE: readonly string[] = ["page", "overview"]

/** What a block kind is called, where it isn't its own name (`kindName()`). */
const KIND_NAMES: Readonly<Record<string, string>> = {
  overview: "Overview",
  prose: "paragraph",
  code: "code block"
}

/** Whether `written` and `name` are one name:  the same words, any case, spaces trimmed (as `epic whois` matches). */
function sameName(written: string, name: string): boolean {
  return !!written.trim() && written.trim().localeCompare(name.trim(), undefined, { sensitivity: "accent" }) === 0
}

/** When Claude last took `comment`, ISO;  `taken` with no record of it:  when written;  never taken:  `undefined`. */
function takenAt(comment: Comment): string | undefined {
  return comment.taken?.at ?? (comment.status === "taken" ? comment.at : undefined)
}

/**
 * Since when Claude has held `comment`, ISO:  the later of when he took it (`takenAt()`) and when he started thinking
 * about it (`working`);  `undefined` for neither.
 */
function heldSince(comment: Comment): string | undefined {
  const times = [takenAt(comment), comment.working].filter((each): each is string => !!each)
  return times.sort().at(-1)
}
