import { ThreadFacts } from "spell/epic/comments"

import { PlanItem } from "./PlanItem"
import { PlanMarkup } from "./PlanMarkup"

/**
 * What a follow-up todo says about what it came from (epic `epic-engine` I230):  the Problem, and the Proposed fix.
 * - `PlanDoc.followUp()` writes these on a todo Owen made with Make Todo, so the todo reads on its own;
 *   an issue's or call's Do this reads it too:  has it a fix yet (`PlanDoc.doThisSteps()`, I232)?
 * - The Problem:  the lead of the source's own text (its first paragraphs, whole sentences:  never cut mid-way);
 *   its title when it has no text of its own.
 * - The Proposed fix, the first of:
 *   - a field of that name already in the source (what Claude wrote on an issue, I232)
 *   - the option Owen chose, or its Net effect
 *   - the recommended Net effect, or a lone Net effect not tied to one option
 *   - the recommended option
 *   - Claude's latest reply offering a fix
 *   - Claude's latest Underway status card:  what it was about to do
 * - Reads `source` only, and copies what it keeps:  the source is left as it was.
 * - Plain HTML out, so it goes through `addItem()`'s `details` like any other text.
 */
export class FollowUpSummary {
  /** `source`'s summary;  `title`, its title, stands in for a source with no text of its own. */
  static of(source: Element, title: string): FollowUpSummary {
    return new FollowUpSummary(FollowUpSummary.problemOf(source, title), FollowUpSummary.fixOf(source))
  }

  private constructor(
    /** HTML:  the problem, in the source's own words */
    readonly problem: string,
    /** HTML:  the fix proposed;  `undefined` when nothing in the source proposes one */
    readonly fix: string | undefined
  ) {}

  /** Did the source propose a fix?  When not, the todo says so, and whoever works it writes one. */
  get hasFix(): boolean {
    return this.fix !== undefined
  }

  /** The two labelled fields, as HTML (`<epic-field label>`). */
  get html(): string {
    const fix = this.fix ?? `<p>${NO_FIX_YET}</p>`
    return `<epic-field label="${PROBLEM_LABEL}">${this.problem}</epic-field><epic-field label="${FIX_LABEL}">${fix}</epic-field>`
  }

  ////////////////
  // ## The problem
  ////////////////

  /** The lead of `source`'s own text, as HTML;  `title` as a paragraph when it has none. */
  private static problemOf(source: Element, title: string): string {
    return FollowUpSummary.leadOf(PlanItem.currentText(source)) || `<p>${PlanMarkup.text(title)}</p>`
  }

  /**
   * `box`'s first blocks of prose, as HTML, until `LEAD_LENGTH` characters or `LEAD_BLOCKS` blocks, at least one.
   * - skips cards (choices, answers, replies, code ...):  their own words aren't the lead
   * - `box` is a copy:  this moves things out of it
   */
  private static leadOf(box: Element): string {
    const lead: string[] = []
    let length = 0
    for (const block of FollowUpSummary.blocksIn(box)) {
      lead.push(block.outerHTML)
      length += PlanMarkup.squeeze(block.textContent ?? "").length
      if (length >= LEAD_LENGTH || lead.length >= LEAD_BLOCKS) break
    }
    return lead.join("")
  }

  /** The blocks of prose in `box`, in order:  inline runs wrapped in a `<p>`, the question as asked unwrapped. */
  private static blocksIn(box: Element): Element[] {
    const blocks: Element[] = []
    let run: Element | undefined
    for (const node of Array.from(box.childNodes)) {
      if (PlanMarkup.isElement(node) && node.localName === QUESTION_TAG) {
        run = undefined
        blocks.push(...FollowUpSummary.blocksIn(node))
      } else if (PlanMarkup.isElement(node) && LABELLED.test(node.localName) && node.hasAttribute("label")) {
        run = undefined
        blocks.push(FollowUpSummary.tidied(PlanItem.asProse(node, { plain: true }) as Element))
      } else if (PlanMarkup.isElement(node) && BLOCKS.test(node.localName)) {
        run = undefined
        blocks.push(FollowUpSummary.tidied(node))
      } else if (
        PlanMarkup.isElement(node) ? INLINE.test(node.localName) : node.nodeType === TEXT && node.textContent?.trim()
      ) {
        run ??= blocks[blocks.push(box.ownerDocument.createElement("p")) - 1]
        run!.append(node)
      } else if (PlanMarkup.isElement(node)) {
        run = undefined
      }
    }
    return blocks
  }

  /** `block` without its ids:  a copy must not make a second `#q3`, nor be what a link lands on. */
  private static tidied(block: Element): Element {
    for (const each of [block, ...block.querySelectorAll("[id]")]) each.removeAttribute("id")
    return block
  }

  ////////////////
  // ## The fix
  ////////////////

  /** What `source` proposes, as HTML (the class's list, in order);  `undefined` when nothing does. */
  private static fixOf(source: Element): string | undefined {
    const text = PlanItem.currentText(source)
    return (
      FollowUpSummary.fixField(text) ??
      FollowUpSummary.optionFix(source, text) ??
      FollowUpSummary.proseRecommendation(text) ??
      FollowUpSummary.latestFromClaude(source)
    )
  }

  /** The text of `text`'s own "Proposed fix" field, unless it's the placeholder saying there's none. */
  private static fixField(text: Element): string | undefined {
    const field = text.querySelector(`epic-field[label="${FIX_LABEL}"]`)
    return field && !field.textContent?.includes(NO_FIX_YET) && field.textContent?.trim() ? field.innerHTML : undefined
  }

  /** The chosen option, else the recommended one, else a Net effect that stands alone. */
  private static optionFix(source: Element, text: Element): string | undefined {
    const options = PlanItem.optionsOf(source)
    const chosen = PlanItem.choicesOf(source)?.getAttribute("chosen")
    const pick = options.find((each) => each.letter === chosen) ?? options.find((each) => each.recommended)
    const effects = Array.from(text.querySelectorAll(NET_EFFECT_TAG))
    if (pick) return FollowUpSummary.optionHTML(pick, effects)
    const recommended = effects.find((effect) => effect.hasAttribute("recommended"))
    if (recommended) return FollowUpSummary.effectHTML(recommended)
    const [lone] = effects
    return effects.length === 1 && !FollowUpSummary.letterOf(lone) ? FollowUpSummary.effectHTML(lone) : undefined
  }

  /** Option `pick` as HTML:  its heading, then its Net effect (`effects`, the source's) or its own lead. */
  private static optionHTML(pick: OptionPick, effects: Element[]): string {
    const heading = `<p><b>${PlanMarkup.text(`${pick.letter} · ${pick.title}`)}</b></p>`
    const effect = effects.find((each) => FollowUpSummary.letterOf(each) === pick.letter)
    return (
      heading +
      (effect ? FollowUpSummary.effectHTML(effect) : FollowUpSummary.leadOf(PlanItem.currentText(pick.option)))
    )
  }

  /** The option a Net effect is about:  its `option`, or the option card holding it;  `undefined` for neither. */
  private static letterOf(effect: Element): string | undefined {
    return effect.getAttribute("option") ?? effect.closest("epic-option")?.getAttribute("letter") ?? undefined
  }

  /** A Net effect's words, as HTML. */
  private static effectHTML(effect: Element): string {
    return FollowUpSummary.leadOf(effect.cloneNode(true) as Element)
  }

  /** An option marked "(recommended)" in prose (no cards), as a paragraph. */
  private static proseRecommendation(text: Element): string | undefined {
    const words = PlanItem.recommendationIn(text)
    return words ? `<p>${PlanMarkup.text(words)}</p>` : undefined
  }

  /**
   * Claude's newest word offering a fix:  a reply saying so (`PROPOSES`), or an Underway status card;
   * a card that recorded something (`noted`) or a finished one (`done`) proposes nothing.
   */
  private static latestFromClaude(source: Element): string | undefined {
    const replies = Array.from(source.querySelectorAll(`:scope > ${REPLY_TAG}`)).filter(ThreadFacts.isAgents)
    const cards = Array.from(source.querySelectorAll(`:scope > ${STATUS_TAG}`)).filter(
      (card) => (card.getAttribute("state") ?? "underway") === "underway"
    )
    const newestFirst = [...replies, ...cards].sort((a, b) => timeOf(b).localeCompare(timeOf(a)))
    for (const said of newestFirst) {
      const copy = said.cloneNode(true) as Element
      for (const slotted of copy.querySelectorAll(":scope > [slot]")) slotted.remove()
      const recommended = copy.querySelector("epic-option[recommended]")
      if (recommended) return FollowUpSummary.replyOption(recommended)
      if (said.localName === STATUS_TAG || PROPOSES.test(copy.textContent ?? "")) {
        const lead = FollowUpSummary.leadOf(copy)
        if (lead) return lead
      }
    }
    return undefined
  }

  /** A recommended option in one of Claude's replies, as HTML. */
  private static replyOption(option: Element): string {
    const heading = `<p><b>${PlanMarkup.text(`${option.getAttribute("letter")} · ${PlanItem.titleOf(option)}`)}</b></p>`
    return heading + FollowUpSummary.leadOf(PlanItem.currentText(option))
  }
}

/** An option card, as `PlanItem.optionsOf()` gives it. */
type OptionPick = ReturnType<typeof PlanItem.optionsOf>[number]

/** The `at` of a reply or card, for newest-first (ISO-ish:  sorts as text). */
function timeOf(element: Element): string {
  return element.getAttribute("at") ?? ""
}

/** The labels of a follow-up's two fields. */
const PROBLEM_LABEL = "Problem"
export const FIX_LABEL = "Proposed fix"

/** What the Proposed fix field says when nothing proposes one:  for the agent working the inbox. */
export const NO_FIX_YET = "No fix proposed yet:  Claude proposes one before building."

/** How much of the source counts as its lead (`leadOf()`):  enough for the facts, short enough to scan. */
const LEAD_LENGTH = 500
const LEAD_BLOCKS = 3

const TEXT = 3
const QUESTION_TAG = "epic-question"
const NET_EFFECT_TAG = "epic-net-effect"
const REPLY_TAG = "epic-reply"
const STATUS_TAG = "epic-status"

/** A labelled block in prose:  kept, its label written out. */
const LABELLED = /^epic-field$/

/** Blocks of prose the lead takes. */
const BLOCKS = /^(p|ul|ol|blockquote|div)$/

/** Inline elements a run of loose text may hold. */
const INLINE = /^(a|b|i|em|strong|code|span|kbd|br)$/

/** Words of a reply offering a fix, not just explaining. */
const PROPOSES = /\b(fix|propos|should|could|better|instead|recommend|suggest|the plan|i'd|we'd)/i
