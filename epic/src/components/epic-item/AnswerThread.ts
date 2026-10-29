import { ThreadFacts } from "spell/epic/comments"
import { PlanDates } from "spell/epic/dates"

/****************
 * ### `AnswerThread`
 * How an item draws the talk after its question (epic `epic-engine` P27, Owen's layout A, 2026-10-24):
 * worked out from its light children, so pages need no markup of their own for it.
 * - The THREAD:  Owen's words and Claude's replies (`<epic-reply>`), ONE section in the order said (I152):
 *   one card frame round them all, a thin rule between them, its corners rounded at its start and end
 *   - its HEAD:  its first reply, whose band is the section's header;  folding it folds the whole thread
 *     (everything after it hides), through its item (`ItemLink`)
 *   - the replies that END the details:  a reply before another card (Owen's note asking for More Details, kept
 *     above Claude's card) is a card of its own, folded to start with (`asksForMore()`)
 *   - an answer card whose item already says "Chosen: X" (`<epic-choices chosen>`) is redundant:  no band;
 *     its body, if any, opens the thread;  with none it's not drawn at all
 *   - a marked note Owen hasn't had answered yet (the review's `said` note) joins the thread after the replies
 * - Claude's STATUS cards (`<epic-status slot="status">`) are LINES:  a run of them about the same task is ONE line,
 *   `✓ Noted 15:21 → Done 15:25 · what Claude did`, drawn by the run's last card;  the others hide (`merged`).
 *   - a card continues the one before it when it was taken the minute that one finished (`at` === its `done-at`,
 *     else its `at`):  the tool writes a task's Done that way, right as its Noted finishes
 *   - in the thread, LAST, after Claude's reply (Owen picked A:  "the merged Noted / Done line last in the thread")
 *   - a DRIVE-BY:  a card taken BEFORE Owen's first reply in the thread (its `at` earlier than that reply's), about a
 *     comment he made before answering:  its line goes above the Choices, first in the details, not in the thread
 *     - an item with no reply of Owen's has no drive-bys:  every card is about what he marked
 * - Claude's NEWEST reply:  his last, when Owen hasn't replied since;  it wears NEW until Owen has seen it
 *   (`SeenReplies`, in `<epic-reply>`).
 * - STATIC and pure over the DOM:  reads attributes and children, writes nothing;  `<epic-item>` keeps one per change
 *   to its light DOM (`thread()`), and its cards read their part of it.
 ****************/
export class AnswerThread {
  /** Has the item a chosen option (`<epic-choices chosen>`):  its answer card says nothing the Choices don't. */
  readonly chosen: boolean

  /** Claude's newest reply, if Owen hasn't replied since:  it wears NEW until seen. */
  readonly newestReply: Element | undefined

  /** Each card's place in the thread's section:  only cards IN it (a thread needs a reply). */
  private readonly places = new Map<Element, ThreadPlace>()

  /** Each status card that draws a line, and its line;  `merged` for the ones it drew in. */
  private readonly lines = new Map<Element, StatusLine | "merged">()

  /** Owen's notes asking for More Details, each right before Claude's card:  they start folded. */
  private readonly moreRequests = new Set<Element>()

  /** Is the review's marked note in the thread, and does it end it?  Only with a thread to be in. */
  readonly said: ThreadPlace | undefined

  private constructor(item: Element, options: ThreadOptions) {
    const children = [...item.children]
    this.chosen = children.some((child) => child.localName === CHOICES_TAG && child.hasAttribute(CHOSEN_ATTRIBUTE))
    const statuses = children.filter(
      (child) => child.localName === STATUS_TAG && child.getAttribute("slot") === STATUS_SLOT
    )
    // the details as drawn, in order:  not the slotted children (status cards, the title), nor the commits
    const flow = children.filter((child) => !child.hasAttribute("slot") && child.localName !== COMMIT_TAG)
    const allReplies = flow.filter((child) => child.localName === REPLY_TAG)
    // the THREAD's replies:  the run of them that ends the details;  one before other cards (a More Details card
    // answering it) is a card of its own
    let start = flow.length
    while (start > 0 && flow[start - 1].localName === REPLY_TAG) start--
    const replies = flow.slice(start)
    const personStarts = AnswerThread.timeOf(replies.find(AnswerThread.isPersons)?.getAttribute("at"))

    // Claude's newest:  his last reply, with none of the person's after it
    const last = allReplies.at(-1)
    this.newestReply = last && !AnswerThread.isPersons(last) ? last : undefined

    // Owen's request for More Details, his note kept just before Claude's card:  it starts folded
    for (const [index, child] of flow.entries())
      if (child.localName === REPLY_TAG && AnswerThread.isPersons(child) && flow[index + 1]?.localName === MORE_TAG)
        this.moreRequests.add(child)

    // the lines:  drive-bys first (above the Choices), then the thread's
    const isDriveBy = (status: Element) => {
      const at = AnswerThread.timeOf(status.getAttribute("at"))
      return personStarts !== undefined && at !== undefined && at < personStarts
    }
    const driveBys = statuses.filter(isDriveBy)
    const threads = statuses.filter((status) => !isDriveBy(status))
    for (const [group, where] of [
      [driveBys, "drive-by"],
      [threads, "thread"]
    ] as const)
      for (const run of AnswerThread.runsOf(group)) {
        const lead = run.at(-1)!
        for (const merged of run.slice(0, -1)) this.lines.set(merged, "merged")
        this.lines.set(lead, { where, steps: AnswerThread.stepsOf(run) })
      }

    // the thread's block, in the order drawn:  the answer's body, the replies, the said note, the thread's lines
    // a redundant answer's body opens the thread when it comes right before its replies
    const answer = flow[start - 1]
    const answerInThread =
      replies.length && this.chosen && answer?.localName === ANSWER_TAG && AnswerThread.hasBody(answer) ? [answer] : []
    const leads = threads.filter((status) => this.lines.get(status) !== "merged")
    const opening: Element[] = [...answerInThread, ...replies]
    if (!opening.length) {
      this.said = undefined
      return
    }
    // the said note has no element of the item's:  `null` holds its place
    const members: (Element | null)[] = [...opening, ...(options.said ? [null] : []), ...leads]
    // its head:  the first reply, after a redundant answer's body
    const headIndex = answerInThread.length
    members.forEach((member, index) => {
      if (member)
        this.places.set(member, {
          start: index === 0,
          end: index === members.length - 1,
          head: index === headIndex,
          underHead: index > headIndex
        })
    })
    this.said = options.said ? { start: false, end: !leads.length, head: false, underHead: true } : undefined
  }

  /**
   * `item`'s thread, from its light children as they are now.
   * - `said`:  the review shows a marked note between the replies and the status lines (`<epic-item>`'s `said`)
   */
  static of(item: Element, options: ThreadOptions = {}): AnswerThread {
    return new AnswerThread(item, options)
  }

  ////////////////
  // ## What a card asks
  ////////////////

  /** `card`'s place in the thread's section, if it's in it. */
  placeOf(card: Element): ThreadPlace | undefined {
    return this.places.get(card)
  }

  /**
   * Is `reply` Owen's note asking for More Details, kept just before Claude's card (`<epic-more>`)?  It starts
   * folded, and isn't in the thread:  it came first (Owen, 2026-10-24:  "my comment should be ABOVE your 'MORE
   * DETAILS' and should be initially collapsed").
   */
  asksForMore(reply: Element): boolean {
    return this.moreRequests.has(reply)
  }

  /** The line a status card draws;  `merged` when a later card draws it in;  `undefined` for one not in the item. */
  lineOf(status: Element): StatusLine | "merged" | undefined {
    return this.lines.get(status)
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** Is `reply` a person's, not an agent's (`ThreadFacts.isAgents()`:  `<epic-reply agent>`, or Claude's old one)? */
  static isPersons(reply: Element): boolean {
    return !ThreadFacts.isAgents(reply)
  }

  /** A date attribute as a moment, to the minute;  `undefined` for none, or one that won't parse. */
  static timeOf(value: string | null | undefined): number | undefined {
    const read = value ? PlanDates.read(value) : undefined
    return read ? Math.floor(read.date.getTime() / MINUTE) : undefined
  }

  /** Has the answer card a body (not just its title)? */
  private static hasBody(answer: Element): boolean {
    return [...answer.childNodes].some((node) =>
      node.nodeType === ELEMENT_NODE
        ? (node as Element).getAttribute("slot") !== "title"
        : node.nodeType === TEXT_NODE && !!node.textContent?.trim()
    )
  }

  /** `statuses` cut into runs about one task:  each continues the last when taken the minute that one finished. */
  private static runsOf(statuses: readonly Element[]): Element[][] {
    const runs: Element[][] = []
    for (const status of statuses) {
      const run = runs.at(-1)
      const before = run?.at(-1)
      const finished = before && AnswerThread.timeOf(before.getAttribute("done-at") ?? before.getAttribute("at"))
      const taken = AnswerThread.timeOf(status.getAttribute("at"))
      if (run && finished !== undefined && finished === taken) run.push(status)
      else runs.push([status])
    }
    return runs
  }

  /**
   * A run's steps, in order:  each card's state, when it was taken (`at`);  the last one's when it finished
   * (`done-at`, else `at`).  A step the same as the one before it (two Noted in one minute) is dropped.
   */
  private static stepsOf(run: readonly Element[]): StatusStep[] {
    const steps: StatusStep[] = []
    run.forEach((status, index) => {
      const state = AnswerThread.stateOf(status)
      const lastOne = index === run.length - 1
      const at = (lastOne && status.getAttribute("done-at")) || status.getAttribute("at") || ""
      const before = steps.at(-1)
      if (before?.state === state && AnswerThread.timeOf(before.at) === AnswerThread.timeOf(at)) return
      steps.push({ state, at })
    })
    return steps
  }

  /** A status card's state, as its line says it:  `done`, `noted`, else `underway`. */
  private static stateOf(status: Element): StatusState {
    const state = status.getAttribute("state")
    return state === "done" || state === "noted" ? state : "underway"
  }
}

/** What `AnswerThread.of()` takes. */
export type ThreadOptions = {
  /** the review shows Owen's marked note, after the replies */
  said?: boolean
}

/** A card's place in the thread's section:  one card frame round all its cards. */
export type ThreadPlace = {
  /** first in the section:  the frame's top edge and corners, space above it */
  start: boolean
  /** last in the section:  the frame's bottom edge and corners */
  end: boolean
  /** the thread's head, its first reply:  its band is the section's header, its fold folds the whole thread */
  head: boolean
  /** after the head:  hidden while the head is folded */
  underHead: boolean
}

/** A status card's state, as a line says it. */
export type StatusState = "underway" | "done" | "noted"

/** One step of a status line:  `Noted 10/24/26 15:21`. */
export type StatusStep = {
  state: StatusState
  /** when, as the card's attribute holds it */
  at: string
}

/** A status card's line:  where it goes, and its steps. */
export type StatusLine = {
  /** `thread`:  last in the thread;  `drive-by`:  above the Choices, first in the details */
  where: "thread" | "drive-by"
  steps: StatusStep[]
}

/** A minute, in ms:  times compare to the minute, as the cards write them. */
const MINUTE = 60_000

/** `Node.ELEMENT_NODE`, `Node.TEXT_NODE`:  no DOM global needed on a server. */
const ELEMENT_NODE = 1
const TEXT_NODE = 3

/** The tags and names it reads. */
const CHOICES_TAG = "epic-choices"
const CHOSEN_ATTRIBUTE = "chosen"
const REPLY_TAG = "epic-reply"
const STATUS_TAG = "epic-status"
const STATUS_SLOT = "status"
const ANSWER_TAG = "epic-answer"
const MORE_TAG = "epic-more"
const COMMIT_TAG = "epic-commit"
