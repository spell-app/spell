import { clockTime, localDate } from "spell/util/time"
import { VoiceColor } from "spell/epic/config/VoiceColor"
import type { Comment, CommentPlace, CommentReply, TakenInto, Turn } from "spell/epic/tool/CommentList"

/****************
 * ### `ThreadFacts`
 * What a comment's THREAD shows, worked out from the comment as the comments route answers it (epic `airplane` P11,
 * its threads since 2026-10-10):  who wrote each word, whose turn it is, a person's words their agent hasn't had yet, its
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
   * Which agent wrote `reply` (`"claude"`, `"codex"` ...), else `undefined`:  a person did.
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
   *   (Claude's old ones, `from="Claude"`, marked or not;  one `from` its own agent's name):  drawn "Claude"
   * - `agent`:  the agent that wrote it (`agentOf()`)
   * - `mine`:  `person` is `viewer`, the same words, any case:  "You", or plain "Codex" for your own session's
   */
  static speakerOf(reply: AnyReply, viewer: string | undefined = ThreadFacts.viewer()): Speaker {
    const agent = ThreadFacts.agentOf(reply)
    const author = ThreadFacts.authorOf(reply)
    // an agent's own name names nobody:  an old reply, or one the migration marked (`from="Claude" agent="claude"`)
    const namesNobody =
      !author ||
      (agent !== undefined && (sameName(author, CLAUDE_NAME) || sameName(author, ThreadFacts.agentLabel(agent))))
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

  /**
   * An agent's name as people read it, from its id (epic `epic-friend` P10):  `claude` -> "Claude", `codex` -> "Codex";
   * one epic doesn't know, capitalised (`gemini` -> "Gemini");  none:  "Claude", the agent of every page before P10.
   * - a product's name:  the same in every language, so it's here, not in a vocabulary's texts
   */
  static agentLabel(agent: string | undefined): string {
    const id = (agent ?? "").trim()
    if (!id) return CLAUDE_NAME
    return AGENT_LABELS[id.toLowerCase()] ?? id.charAt(0).toUpperCase() + id.slice(1)
  }

  ////////////////
  // ## Colours
  ////////////////

  /**
   * The colour of `speaker`'s voice, as CSS, for a reply, a thread message or a status card to draw in (epic
   * `epic-friend` P10, Q16);  `undefined` for one with neither a person nor an agent.
   * - its OWN theme token, the repo's colour for it (`colors()`) the token's fallback:
   *   `var(--epic-voice-agent-codex, #0f8b8d)`, `var(--epic-voice-person-ana)`
   * - a Spell UI colour name is the theme's colour (`VoiceColor.cssOf()`):  `var(--epic-voice-person-ana, var(--ui-green))`
   * - an agent's words take the AGENT's colour, whoever's session wrote them:  the agent wrote the words
   * - no colour of its own:  the token alone, which is unset, so the reader falls back to the shared one
   *   (`--epic-voice-agent`, `--epic-voice-person`):  every page looks as before until the settings say otherwise
   */
  static voiceOf(
    { person, agent }: Pick<Speaker, "person" | "agent">,
    colors: VoiceColors = ThreadFacts.colors()
  ): string | undefined {
    const [kind, who, own] = agent
      ? (["agent", agent, colorFor(colors.agents, agent)] as const)
      : (["person", person, colorFor(colors.people, person)] as const)
    const slug = slugOf(who)
    if (!slug) return undefined
    return `var(--epic-voice-${kind}-${slug}${own ? `, ${VoiceColor.cssOf(own)}` : ""})`
  }

  /**
   * The repo's colours for each person and each agent, as the page server told the page:  `window.SPELL_SERVER.colors`
   * (the repo's epic settings, `colors`;  epic `epic-friend` P10);  none, or not a colour:  left out.
   */
  static colors(holder: { SPELL_SERVER?: { colors?: unknown } } = globalThis as never): VoiceColors {
    const said = holder?.SPELL_SERVER?.colors as { people?: unknown; agents?: unknown } | undefined
    return { people: colorsIn(said?.people), agents: colorsIn(said?.agents) }
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
   * Whose turn it is on `comment`'s thread:  `done`, `person` or `agent` (sent by the comments route as each
   * comment's `turn`).
   * - `done`:  the person closed it
   * - `person`:  an agent spoke last.  Also an epic page's comment answered in the doc, with no words on the thread.
   * - `agent`:  a person spoke last (the comment, or a reply).  An agent may have TAKEN it, but hasn't answered yet.
   *   `claude` before epic `epic-friend` P10 (`asTurn()` reads it so)
   */
  static turnOf(comment: Comment): Turn {
    if (comment.done) return "done"
    const last = comment.replies?.at(-1)
    if (last) return ThreadFacts.isAgents(last) ? "person" : "agent"
    return comment.status === "answered" ? "person" : "agent"
  }

  /**
   * A turn as a server or a page said it, in today's words (`turnOf()`);  `undefined` for none, or one it doesn't know.
   * - the old words, kept for one release (epic `epic-friend` P10):  `owen` (before P2) is `person`, `claude`
   *   (before P10) is `agent`
   */
  static asTurn(said: unknown): Turn | undefined {
    if (said === OLD_PERSON_TURN) return "person"
    if (said === OLD_AGENT_TURN) return "agent"
    return TURNS.includes(said as Turn) ? (said as Turn) : undefined
  }

  /** Is it an agent's turn on `comment`:  its `turn` as the server sent it (old words too:  `asTurn()`), else `turnOf()`? */
  static isAgentsTurn(comment: Comment & { turn?: unknown }): boolean {
    return (ThreadFacts.asTurn(comment.turn) ?? ThreadFacts.turnOf(comment)) === "agent"
  }

  /**
   * `comments` as the server answered (none:  `[]`), each with its `turn`:  the server's, in today's words (`asTurn()`),
   * else `turnOf()`.
   */
  static withTurns(comments: readonly ThreadComment[] = []): ThreadComment[] {
    return comments.map((comment) => ({
      ...comment,
      turn: ThreadFacts.asTurn(comment.turn) ?? ThreadFacts.turnOf(comment)
    }))
  }

  /** The last reply a PERSON wrote on `comment`'s thread (not an agent:  `isAgents()`);  `undefined` for none. */
  static lastPersonReply(comment: Pick<Comment, "replies">): CommentReply | undefined {
    return comment.replies?.findLast((each) => !ThreadFacts.isAgents(each))
  }

  /** When an agent last replied on `comment`'s thread (an ISO time), else `""`. */
  static latestAgentAt(comment: Pick<Comment, "replies">): string {
    return comment.replies?.findLast((each) => ThreadFacts.isAgents(each) && each.at)?.at ?? ""
  }

  /**
   * Is `comment` new work for an agent:  its turn, and not taken (nor being worked on) since a person last spoke?
   * (`CommentList.waiting`)
   */
  static isWaiting(comment: Comment): boolean {
    if (ThreadFacts.turnOf(comment) !== "agent") return false
    const spoke = ThreadFacts.lastPersonReply(comment)?.at ?? comment.at
    const held = heldSince(comment)
    return !held || held < spoke
  }

  /**
   * When a person last changed their words on `comment`'s thread, ISO:
   * the latest of the comment, their replies, and their edits.
   * - what a Send compares with its `sent` (`ReviewInbox.unsentComments`, `GuideInbox`):
   *   words newer than the last send haven't gone to their agent yet
   */
  static lastWordsAt(comment: Comment): string {
    const times = [comment.at, comment.edited]
    for (const reply of comment.replies ?? []) if (!ThreadFacts.isAgents(reply)) times.push(reply.at, reply.edited)
    return times
      .filter((each): each is string => !!each)
      .reduce((latest, each) => (Date.parse(each) > Date.parse(latest) ? each : latest))
  }

  /**
   * A person's words on `comment` that their agent hasn't had yet, which they may still change:
   * - `edit`:  their first words, while the comment is `new` and no agent is thinking about it
   * - `reply`:  their pending reply (`pendingReplyOf()`)
   * - else `null`
   * - `person`:  whose words (epic `epic-friend` P9):  only their own comment, and their own reply;  none:  anyone's
   */
  static pendingOf(comment: Comment, person?: string): "edit" | "reply" | null {
    if (comment.done) return null
    if (comment.status === "new" && !comment.replies?.length)
      return comment.working || !isTheirs(comment.by, person) ? null : "edit"
    return ThreadFacts.pendingReplyOf(comment, person) ? "reply" : null
  }

  /**
   * A person's PENDING reply on `comment`:  its thread's last entry, a person's, not taken since, nor being thought
   * about (`working`);  else `null`.
   * - as the server's `CommentList` has it:  the next save changes it, rather than adding another
   * - `person`:  only theirs (epic `epic-friend` P9):  Ben's box never holds Ana's last words;  none:  anyone's
   */
  static pendingReplyOf(comment: Comment, person?: string): CommentReply | null {
    const last = comment.replies?.at(-1)
    if (!last || ThreadFacts.isAgents(last) || !isTheirs(last.by, person)) return null
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
   * A few words for a thread's header and the comment pane's:  the start of Owen's own words once he's written
   * some (Owen, 2026-10-29, epic `epic-engine` I162:  "show beginning of my text instead" of what was selected:  the
   * page already highlights that);  else what it's on, the start of the selected text, else of its block's, in
   * quotes;  "This page" for the page.
   */
  static headline(place: ThreadPlace & { text?: string }): string {
    const own = (place.text ?? "").replace(/\s+/g, " ").trim()
    if (own) return ThreadFacts.quoted(own)
    if (place.kind === "page") return "This page"
    const words = (place.quote || place.excerpt || place.label || "").replace(/\s+/g, " ").trim()
    if (!words) return `This ${ThreadFacts.kindName(place.kind)}`
    return ThreadFacts.quoted(words)
  }

  /** `words` in quotes, cut at `HEADLINE_CHARS` with "…". */
  private static quoted(words: string): string {
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

/**
 * A colour for each person and each agent (`ThreadFacts.voiceOf()`):  the repo's epic settings' `colors`, as
 * `EpicConfig.colors` reads them and the page server tells every page (`SPELL_SERVER.colors`).
 */
export type VoiceColors = {
  /** by a person's short name, as `epic whoami` prints it (`ana`), any case */
  people: Record<string, string>
  /** by an agent's id (`codex`) */
  agents: Record<string, string>
}

/** A reply, as `agentOf()` and the rest take it:  a page's `<epic-reply>`, or a comment's reply. */
export type AnyReply = ReplyElement | Pick<CommentReply, "by" | "at" | "agent">

/** A page's reply element, as far as `ThreadFacts` reads it:  its attributes. */
export type ReplyElement = { getAttribute(name: string): string | null }

/** Who a reply is from, as a page shows it (`speakerOf()`). */
export type Speaker = {
  /** the person who wrote it, or whose session did;  `undefined` for an old reply of Claude's, which names nobody */
  person: string | undefined
  /** the agent that wrote it (`"claude"`, `"codex"` ...);  `undefined`:  the person did */
  agent: string | undefined
  /** the person is whoever is reading */
  mine: boolean
}

/** Claude's marker, `agent="claude"`:  what an old reply by "Claude", with none, was written by (`agentOf()`). */
const CLAUDE_AGENT = "claude"

/**
 * The name Claude's replies went by before the marker;  still the rule for a page from before it (`isOldClaudes()`),
 * and the label of a reply naming no agent (`agentLabel()`).
 */
const CLAUDE_NAME = "Claude"

/** The agents epic knows, by id, as people read their names (`agentLabel()`);  any other:  its id capitalised. */
const AGENT_LABELS: Readonly<Record<string, string>> = { claude: "Claude", codex: "Codex" }

/** Whose turn it can be (`Turn`). */
const TURNS: readonly Turn[] = ["person", "agent", "done"]

/** What a page server from before epic `epic-friend` P2 calls the person's turn. */
const OLD_PERSON_TURN = "owen"

/** What a page server from before epic `epic-friend` P10 calls an agent's turn:  read for one release (`asTurn()`). */
const OLD_AGENT_TURN = "claude"


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

/** `colors`' colour for `name`, any case;  `undefined` for none. */
function colorFor(colors: Record<string, string>, name: string | undefined): string | undefined {
  if (!name) return undefined
  const key = Object.keys(colors).find((each) => sameName(each, name))
  return key === undefined ? undefined : colors[key]
}

/** `said`'s names and colours, the colours trimmed;  any that isn't a colour (`VoiceColor.isColor()`) left out. */
function colorsIn(said: unknown): Record<string, string> {
  if (!said || typeof said !== "object" || Array.isArray(said)) return {}
  return Object.fromEntries(
    Object.entries(said)
      .filter(([, color]) => VoiceColor.isColor(color))
      .map(([name, color]) => [name, (color as string).trim()])
  )
}

/** A name as a token's last word:  lower case, a dash for each run of anything else (`Ana Lima` -> `ana-lima`). */
function slugOf(name: string | undefined): string {
  return (name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

/** Did `person` write what `by` names (no `person`, or no `by`:  yes, anyone's)? */
function isTheirs(by: string | undefined, person: string | undefined): boolean {
  return !person || !by || sameName(by, person)
}

/** When an agent last took `comment`, ISO;  `taken` with no record of it:  when written;  never taken:  `undefined`. */
function takenAt(comment: Comment): string | undefined {
  return comment.taken?.at ?? (comment.status === "taken" ? comment.at : undefined)
}

/**
 * Since when an agent has held `comment`, ISO:  the later of when it took it (`takenAt()`) and when it started thinking
 * about it (`working`);  `undefined` for neither.
 */
function heldSince(comment: Comment): string | undefined {
  const times = [takenAt(comment), comment.working].filter((each): each is string => !!each)
  return times.sort().at(-1)
}
