import type { Comment, CommentPlace, CommentReply, TakenInto, Turn } from "spell-epic/tool/CommentList"

/****************
 * ### `ThreadFacts`
 * What a comment's THREAD shows, worked out from the comment as the comments route answers it (epic `airplane` P11,
 * its threads since 2026-10-10):  whose turn it is, Owen's words Claude hasn't had yet, its id as Owen sees it, the
 * few words its header and the comment pane say it's on, its times, and where a taken comment went.
 * - ONE copy for everything that draws a thread (epic `epic-engine` P3):
 *   - the docs runtime's comments (`spell-doc-comments.js`):  the pane, the reply boxes, Cmd / Ctrl + K
 *   - the `<epic-thread>` family (the epics pack):  the thread itself and its messages
 *   - the epic tool's `CommentList`:  `takenInto()`
 * - STATIC and pure:  no DOM, no Solid, nothing but types imported, so the comments' own script
 *   (`spell-comments.js`, which must hold no Spell UI) and node load it alike.
 * - NOT in the `spell-epic` barrel:  the docs runtime imports it alone.
 ****************/
export class ThreadFacts {
  /**
   * Whose turn it is on `comment`'s thread, as `CommentList.turnOf()` has it:  `done`, `owen` or `claude`.
   * - for a page server started before threads, which sends no `turn`
   */
  static turnOf(comment: ThreadComment): Turn {
    if (comment.done) return "done"
    const last = comment.replies?.at(-1)
    if (last) return last.by === OWEN ? "claude" : "owen"
    return comment.status === "answered" ? "owen" : "claude"
  }

  /** `comments` as the server answered (none:  `[]`), each with its `turn`:  the server's, else `turnOf()`. */
  static withTurns(comments: readonly ThreadComment[] = []): ThreadComment[] {
    return comments.map((comment) => (comment.turn ? comment : { ...comment, turn: ThreadFacts.turnOf(comment) }))
  }

  /** When Claude last replied on `comment`'s thread (an ISO time), else `""`. */
  static latestClaudeAt(comment: ThreadComment): string {
    return comment.replies?.findLast((each) => each.by !== OWEN && each.at)?.at ?? ""
  }

  /**
   * Owen's words on `comment` that Claude hasn't had yet, which he may still change:
   * - `edit`:  his first words, while the comment is `new` and Claude isn't thinking about it
   * - `reply`:  his pending reply (`pendingReplyOf()`)
   * - else `null`
   */
  static pendingOf(comment: ThreadComment): "edit" | "reply" | null {
    if (comment.done) return null
    if (comment.status === "new" && !comment.replies?.length) return comment.working ? null : "edit"
    return ThreadFacts.pendingReplyOf(comment) ? "reply" : null
  }

  /**
   * Owen's PENDING reply on `comment`:  its thread's last entry, his, not taken since, nor being thought about
   * (`working`);  else `null`.
   * - as the server's `CommentList` has it:  his next save changes it, rather than adding another
   */
  static pendingReplyOf(comment: ThreadComment): CommentReply | null {
    const last = comment.replies?.at(-1)
    if (last?.by !== OWEN) return null
    const taken = comment.taken?.at ?? (comment.status === "taken" ? comment.at : undefined)
    // the later of the two (ISO dates compare as strings);  "" for neither
    const held = [taken, comment.working].reduce<string>((late, each) => (each && each > late ? each : late), "")
    return held && held >= last.at ? null : last
  }

  ////////////////
  // ## Ids
  ////////////////

  /**
   * A comment id's number, however typed or keyed:  `M3`, `m3`, `cm3` (any case, a `#` before it aside) -> 3;  else
   * `undefined`.  As `CommentList.idOf()`.
   */
  static numberOf(typed: string | undefined): number | undefined {
    const number = TYPED_ID.exec((typed ?? "").trim())?.[1]
    return number === undefined ? undefined : Number(number)
  }

  /** A comment's id as Owen sees it:  `M3` (`cm3`, `m3` alike;  `CommentList.label()`). */
  static label(id: string): string {
    const number = ThreadFacts.numberOf(id)
    return number === undefined ? String(id) : `M${number}`
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
   * comment's):  "Comment M3, on ..."
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
    const two = (value: number) => String(value).padStart(2, "0")
    const day = `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`
    return `${day} ${two(date.getHours())}:${two(date.getMinutes())}`
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
}

/** Where a comment is, as its thread and the pane name it:  its kind, section, first words and quote. */
export type ThreadPlace = Pick<CommentPlace, "kind" | "label" | "excerpt" | "quote">

/**
 * A comment as the comments route answers it (`GET /api/docs/comments`):  as the inbox holds it, with its id and
 * whose `turn` it is (none from a server started before threads:  `ThreadFacts.withTurns()`).
 */
export type ThreadComment = Comment & { id: string; turn?: Turn }

/** Who writes Owen's words on a thread (`CommentList`'s `OWEN`). */
const OWEN = "Owen"

/** A typed comment id:  `M3`, `m3`, the old `cm3`, a `#` before it. */
const TYPED_ID = /^#?c?m(\d+)$/i

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
