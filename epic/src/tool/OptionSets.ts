import { Markup } from "spell/epic/markup"
import { PhaseIds } from "spell/epic/phases"

import { PlanDocError, QUESTION_ID, type MarkResult, type OptionCard, type PlanMark } from "./planDoc.types"
import type { PlanDoc } from "./PlanDoc"

import { IncomingHtml } from "./IncomingHtml"
import { PlanItem } from "./PlanItem"
import { PlanMarkup } from "./PlanMarkup"
import { ADDED_KEY, STANDING_ID, type AddedOption, type EditedOption, type PickFields } from "./ReviewInbox"

/****************
 * ### `OptionSets`
 * Option sets (`<epic-choices>`) as the epic tool changes them (epic `epic-engine` P50):  Owen's picks, the pick-one /
 * pick-any flip, options added, edited and removed, a set closed.  Rules:  `PLAN-DOC.md` beside this, "Option sets".
 * - A set sits ANYWHERE on the page, and is keyed by what holds it, nearest first (`holderOf()`):
 *   - an item:  any of its sets (`PlanItem.choiceSets()`), by position
 *   - a phase:  every set in its body, by position, its Choices field's first
 *   - a standing set, in the Choices section:  itself, by its id (`s-upgrades`)
 * - ONE mark per set carries its whole change (`PickFields`):  `applyToItem()`, `applyToHolder()`
 * - `epic choose` with several letters, and `epic option add | edit | remove | close`:  `choose()`, `add()` ...
 * - Earlier text is never lost:  an edit keeps the old title and text in a folded `<div slot="was">`;  a removed option
 *   stays, `slot="removed"`;  a standing set's picks stay, `slot="picked"`
 * - Works on ONE `PlanDoc` (`plan`), IN PLACE;  pure DOM, no files.
 * - Imports `PlanDoc` as a type only:  `PlanDoc` makes one of these per change.
 ****************/
export class OptionSets {
  /** the doc it changes:  STATIC for the object's life */
  readonly plan: PlanDoc

  constructor(plan: PlanDoc) {
    this.plan = plan
  }

  ////////////////
  // ## Holders
  ////////////////

  /**
   * What holds the sets `ref` names, nearest first:  a standing set (`s-upgrades`), an item (`q52`), a phase (as people
   * name one:  `P50`, its id, its name);  `null` for none.
   */
  holderOf(ref: string): SetHolder | null {
    const key = String(ref).trim().toLowerCase()
    if (STANDING_ID.test(key)) {
      const set = this.standingSet(key)
      return set ? { kind: "standing", element: set, label: key, sets: [set] } : null
    }
    const item = this.plan.findItem(key)
    if (item) return { kind: "item", element: item, label: item.id.toUpperCase(), sets: PlanItem.choiceSets(item) }
    let n: number
    try {
      n = this.plan.phasePlace(ref)
    } catch (error) {
      if (error instanceof PlanDocError) return null
      throw error
    }
    const phase = this.plan.phase(n)
    return { kind: "phase", element: phase, label: PhaseIds.labelOf(phase), sets: OptionSets.setsIn(phase) }
  }

  /** The standing set with id `id` (`s-upgrades`), in the page's Choices section;  `null` for none. */
  standingSet(id: string): Element | null {
    return this.plan.document.querySelector(`epic-page > epic-section[kind="choices"] > epic-choices[id="${id}"]`)
  }

  /** Every option set in `host`'s body, in page order, never one in an Original Discussion (history). */
  static setsIn(host: Element): Element[] {
    return Array.from(host.querySelectorAll(CHOICES)).filter((set) => !set.closest(ORIGINAL))
  }

  /** Is `set` open:  neither `chosen` nor `closed`?  A standing set never counts:  it stays open on purpose. */
  static isOpen(set: Element): boolean {
    return !set.hasAttribute("chosen") && !set.hasAttribute("closed") && !set.hasAttribute("standing")
  }

  /**
   * Each phase's open option sets, written as `choices-open` (none:  no attribute), as every edit does
   * (`PlanDoc.updateStates()`):  its body is a part, so its title row reads this.  Returns how many phases changed.
   */
  static updateOpenCounts(phases: Element[]): number {
    let changed = 0
    for (const phase of phases) {
      const open = OptionSets.setsIn(phase).filter(OptionSets.isOpen).length
      const before = phase.getAttribute("choices-open")
      Markup.set<"epic-phase">(phase, { choicesOpen: open || undefined })
      if (before !== phase.getAttribute("choices-open")) changed++
    }
    return changed
  }

  /**
   * The page's option sets, for the summary (`PlanReader.summary()`):  the Choices section's standing sets (open ones,
   * and their options still on offer), and each phase's open sets.
   */
  static summaryOf(document: Document): ChoicesSummary {
    const standing = Array.from(document.querySelectorAll(`epic-page > epic-section[kind="choices"] > ${CHOICES}`))
    const open = standing.filter((set) => !set.hasAttribute("closed"))
    const phases = Array.from(document.querySelectorAll('epic-section[kind="phases"] > epic-phase')).flatMap(
      (phase) => {
        const count = OptionSets.setsIn(phase).filter(OptionSets.isOpen).length
        return count ? [{ phase: PhaseIds.labelOf(phase), open: count }] : []
      }
    )
    return {
      sets: standing.length,
      open: open.length,
      options: open.reduce((total, set) => total + liveOptions(set).length, 0),
      phases
    }
  }

  ////////////////
  // ## Marks
  ////////////////

  /**
   * A pick mark on item `item` (`PlanDoc.applyAction()`):  its set's whole change, then its picks.
   * - the set:  the mark's `choices`, by position (none:  the item's own);  a `closed` one:  left, not applied
   * - one pick in a pick-one set:  as before (`PlanDoc.pickOption()`):  a question answered, anything else approved,
   *   the pick's line on the set
   * - several in a pick-any set:  every letter into `chosen`;  a question answered with all of their titles
   * - no pick (only adds, edits, removals, a flip):  the set changed, the item left as it is
   */
  applyToItem(item: Element, mark: PlanMark): MarkResult {
    const set = PlanItem.choiceSet(item, mark.choices)
    if (!set) return { applied: false, left: `no option cards${setWords(mark.choices)}:  can't pick ${mark.pick}` }
    if (set.hasAttribute("closed")) return closedResult(item.id.toUpperCase())
    const change = this.tryChange(set, mark)
    if ("left" in change) return change
    const { letters, words } = change
    const plan = this.plan
    const kind = PlanItem.kindOfItem(item)
    const open = item.getAttribute("status") === "open"
    if (!letters.length) return { applied: true, did: words.join(";  ") }
    if (letters.length === 1) {
      const result = plan.pickOption(item, kind, open, letters[0], mark.choices)
      // its own words say the pick:  the rest of the change after them
      const more = words.slice(1)
      if (!result.applied || !more.length) return result
      const said = set.getAttribute("chosen-note")
      Markup.set<"epic-choices">(set, { chosenNote: [...more, said].filter(Boolean).join(";  ") })
      return { ...result, did: `${result.did};  ${more.join(";  ")}` }
    }
    Markup.set<"epic-choices">(set, { chosen: letters.join(" ") })
    const picked = pickedOptions(set, letters)
    let recorded = "recorded"
    if (QUESTION_ID.test(item.id)) {
      plan.decide(item.id, picked.map((option) => `${option.letter} · ${option.title}`).join(", "))
      for (const other of PlanItem.choiceSets(item)) if (other !== set) Markup.set(other, { chosen: undefined })
      Markup.set<"epic-choices">(set, { chosen: letters.join(" ") })
      plan.review(item.id)
      recorded = "recorded as the answer"
    } else {
      const approved = plan.approve(item, kind, open)
      const closed = /\((\w+)\)/.exec(approved)?.[1]
      if (closed) recorded = `recorded, the ${kind === "judgement" ? "call" : kind} ${closed}`
    }
    const card: OptionCard = {
      letter: letters.join(", "),
      title: picked.map((option) => option.title).join(", "),
      recommended: false
    }
    plan.notePick(item, set, card, [...words.slice(1), recorded, plan.nextStepWords()].join(";  "))
    return { applied: true, did: words.join(";  ") }
  }

  /**
   * A mark on a PHASE's set or a STANDING set (`PlanDoc.applyMark()`, before the parts' rules);  `undefined` for any
   * other mark, which the doc applies as before.
   * - a phase's:  only a pick mark;  its set changed, its picks into `chosen`, `chosen-on`, `chosen-note`;  the phase
   *   isn't approved:  its line asks the session to adjust the phase's plan
   * - a standing set's:  a pick mark only (anything else:  left);  its picks stamped `picked-on` and folded under
   *   Picked (`slot="picked"`), never `chosen`;  the set stays open, its line asks the session to act on the round
   * - a `closed` set:  left, not applied
   * - SIDE EFFECT:  logs its line
   */
  applyToHolder(mark: PlanMark): MarkResult | undefined {
    const key = String(mark.id).toLowerCase()
    const standing = STANDING_ID.test(key)
    const phase = !standing && mark.action === "pick" && PhaseIds.isPhaseId(key) && !this.plan.findItem(key)
    if (!standing && !phase) return undefined
    const holder = this.holderOf(key)
    if (!holder) return { applied: false, gone: true, left: `no such ${standing ? "option set" : "phase"}:  dropped` }
    if (mark.action !== "pick") return { applied: false, left: `a standing set takes picks, not ${mark.action}` }
    const set = holder.sets[mark.choices ?? 0]
    if (!set) return { applied: false, left: `${holder.label} has no option cards${setWords(mark.choices)}` }
    if (set.hasAttribute("closed")) return closedResult(holder.label)
    const change = this.tryChange(set, mark)
    if ("left" in change) return change
    const result = this.recordPicks(holder, set, change)
    this.plan.log(`${holder.label.toUpperCase()} ${result.did}`)
    return result
  }

  /**
   * Phase `phase`'s open sets take their recommended option, as an approval does on a question (Accept plan, epic
   * `epic-engine` P50:  `PlanDoc.acceptPlan()`).  Returns what it took, for the log line:
   * `;  took the recommended B · Bananas`, `""` for none.
   */
  takeRecommended(phase: Element): string {
    const took: string[] = []
    for (const set of OptionSets.setsIn(phase).filter(OptionSets.isOpen)) {
      const option = PlanItem.optionsIn(set).find((each) => each.recommended && !each.option.hasAttribute("slot"))
      if (!option) continue
      Markup.set<"epic-choices">(set, {
        chosen: option.letter,
        chosenOn: this.plan.today,
        chosenNote: "the recommended option, taken with the plan's Accept"
      })
      took.push(`${option.letter} · ${option.title}`)
    }
    return took.length ? `;  took the recommended ${took.join(", ")}` : ""
  }

  ////////////////
  // ## Commands
  ////////////////

  /**
   * Options `letters` of `ref`'s set, as Owen settled them in conversation:  `epic choose seo#Q4 A C "..."`.
   * Returns what it did.
   * - the set:  `set` (from 1), else the holder's latest
   * - one letter on an item:  exactly as before (`PlanDoc.choose()`)
   * - several:  a pick-any set only;  an item answered / approved, a phase's or a standing set's picks recorded
   * - throws for no such holder, set or option, several letters in a pick-one set, a closed set
   * - SIDE EFFECT:  logs it, "settled in conversation"
   */
  choose(ref: string, letters: string[], { outcome, set: given }: { outcome?: string; set?: number } = {}): string {
    const want = letters.map((letter) => String(letter).trim().toUpperCase())
    const holder = this.need(ref, "to choose from")
    if (holder.kind === "item" && want.length === 1) return this.plan.choose(ref, want[0]!, { outcome, set: given })
    const choices = this.setIndex(holder, given)
    const set = holder.sets[choices]!
    if (want.length > 1 && !set.hasAttribute("multiple"))
      throw new PlanDocError(`${holder.label}:  a pick-one set takes one letter, not ${want.join(" ")}`)
    if (set.hasAttribute("closed")) throw new PlanDocError(closedResult(holder.label).left)
    const mark: PlanMark = { id: holder.element.id, action: "pick", pick: want.join(" "), choices }
    let result: MarkResult
    if (holder.kind === "item") {
      result = this.applyToItem(holder.element, mark)
      if (result.applied) this.plan.reviewedAs(holder.element, "approve")
    } else {
      const change = this.tryChange(set, mark)
      if ("left" in change) throw new PlanDocError(`${holder.label}:  ${change.left}`)
      result = this.recordPicks(holder, set, change, outcome)
    }
    if (!result.applied) throw new PlanDocError(`${holder.label}:  ${result.left}`)
    this.plan.log(
      `${holder.label.toUpperCase()} ${result.did};  settled in conversation${outcome ? `:  ${outcome}` : ""}`
    )
    return result.did
  }

  /**
   * A new option `title` in `ref`'s set (`epic option add`);  returns its letter.
   * - `note`:  its text, HTML when it starts with a tag, else plain (paragraphs);  `image`:  a picture's path from
   *   the epic page's folder (`tests/s-upgrades-20261029-1432.png`), shown in its card
   * - Claude's:  no `by`
   * - throws for no such holder or set, a closed set, or no letter left (`Z` taken)
   * - SIDE EFFECT:  logs it
   */
  add(ref: string, title: string, { note, image, set }: OptionAddOptions = {}): string {
    const { holder, element } = this.openSet(ref, set)
    const letter = this.addOption(element, { title, html: noteHTML(note), shot: image })
    this.plan.log(`${holder.label.toUpperCase()} option ${letter} added:  ${title}`)
    return letter
  }

  /**
   * Option `letter` of `ref`'s set edited in place (`epic option edit`):  its old title and text kept, folded.
   * - `title`, `note` (HTML or plain, as `add()`'s):  at least one
   * - throws for no such holder, set or option, a closed set, or nothing to change
   * - SIDE EFFECT:  logs it
   */
  edit(ref: string, letter: string, { title, note, set }: OptionEditOptions = {}): string {
    if (title === undefined && note === undefined) throw new PlanDocError("option edit:  --title and / or --note")
    const { holder, element } = this.openSet(ref, set)
    const option = this.liveOption(element, letter)
    this.editOption(option, { title: title ?? PlanItem.titleOf(option), html: noteHTML(note) })
    const did = `option ${letter.toUpperCase()} edited${title ? `:  ${title}` : ""}`
    this.plan.log(`${holder.label.toUpperCase()} ${did}`)
    return did
  }

  /**
   * Option `letter` of `ref`'s set removed (`epic option remove`):  never erased, folded under Removed.
   * - throws for no such holder, set or option, or a closed set
   * - SIDE EFFECT:  logs it
   */
  remove(ref: string, letter: string, { set }: { set?: number } = {}): string {
    const { holder, element } = this.openSet(ref, set)
    const option = this.liveOption(element, letter)
    this.removeOption(element, option)
    const did = `option ${letter.toUpperCase()} removed:  ${PlanItem.titleOf(option)}`
    this.plan.log(`${holder.label.toUpperCase()} ${did}`)
    return did
  }

  /**
   * `ref`'s set closed (`epic option close`):  done, no more picks, adds or edits;  a standing set too.
   * - throws for no such holder or set;  an already closed one says so
   * - SIDE EFFECT:  logs it
   */
  close(ref: string, { set }: { set?: number } = {}): string {
    const holder = this.need(ref)
    const element = holder.sets[this.setIndex(holder, set)]!
    if (element.hasAttribute("closed")) return `${holder.label}:  already closed`
    Markup.set<"epic-choices">(element, { closed: true })
    const did = `option set closed`
    this.plan.log(`${holder.label.toUpperCase()} ${did}`)
    return `${holder.label} ${did}`
  }

  /**
   * A STANDING set titled `title` in the page's Choices section (`epic add <epic>#choices "Title"`), made the first
   * time;  returns its id (`s-upgrades-on-offer`).
   * - `multiple`:  pick any;  `note`:  its lead, before it (HTML or plain)
   * - its id:  `s-` and the title's slug, `-2` ... on a clash with any id on the page
   * - SIDE EFFECT:  logs it
   */
  addStandingSet(title: string, { multiple = false, note }: { multiple?: boolean; note?: string } = {}): string {
    const plan = this.plan
    const section = plan.section("choices")
    const taken = new Set(Array.from(plan.document.querySelectorAll("[id]"), (element) => element.id))
    const slug = PhaseIds.slugOf(title) || "choices"
    let id = `s-${slug}`
    for (let n = 2; taken.has(id); n++) id = `s-${slug}-${n}`
    const set = plan.make("epic-choices", { title, standing: true, multiple: multiple || undefined })
    set.setAttribute("id", id)
    section.append(...IncomingHtml.nodes(plan.document, noteHTML(note) ?? ""), set)
    plan.log(`${id.toUpperCase()} standing option set added:  ${title}`)
    return id
  }

  ////////////////
  // ## Changes
  ////////////////

  /**
   * `mark`'s whole change on `set`, in order:  the flip, removals, edits, then the added options (each the next free
   * letter);  then its picks as letters (`+N` mapped to the added options').
   * - a pick-one set keeps the newest pick (the last), as the page's switch does
   * - `{ left }` for an option it doesn't have:  nothing is changed then
   */
  private tryChange(set: Element, mark: PickFields): SetChange | { applied: false; left: string } {
    // the checks first, so a bad mark changes nothing
    const live = new Set(liveOptions(set).map((option) => option.getAttribute("letter")))
    for (const letter of [...(mark.removed ?? []), ...(mark.edited ?? []).map((each) => each.letter)])
      if (!live.has(letter)) return { applied: false, left: `no option ${letter} to change${setWords(mark.choices)}` }
    const removed = new Set(mark.removed)
    for (const token of mark.pick?.split(" ") ?? [])
      if (!ADDED_KEY.test(token) && (!live.has(token) || removed.has(token)))
        return { applied: false, left: `no option ${token}${setWords(mark.choices)}` }
    if (nextLetter(set, mark.added?.length ?? 0) === undefined)
      return { applied: false, left: "no letter left for an added option (Z is taken)" }
    const words: string[] = []
    const flip = mark.multiple !== undefined && mark.multiple !== set.hasAttribute("multiple")
    if (flip) Markup.set<"epic-choices">(set, { multiple: mark.multiple || undefined })
    const removals = (mark.removed ?? []).map((letter) => {
      this.removeOption(set, this.liveOption(set, letter))
      return letter
    })
    const edits = (mark.edited ?? []).map(({ letter, title, note }: EditedOption) => {
      this.editOption(this.liveOption(set, letter), {
        title,
        html: note === undefined ? undefined : PlanMarkup.paragraphs(note)
      })
      return letter
    })
    const keys = new Map<string, string>()
    const adds = (mark.added ?? []).map(({ key, title, note, shot }: AddedOption) => {
      const letter = this.addOption(set, { title, html: PlanMarkup.paragraphs(note) || undefined, shot, by: "owen" })
      keys.set(key, letter)
      return `${letter} · ${title}`
    })
    let letters = (mark.pick?.split(" ") ?? []).map((token) => keys.get(token) ?? token)
    if (letters.length > 1 && !set.hasAttribute("multiple")) letters = letters.slice(-1)
    if (letters.length) {
      const picked = pickedOptions(set, letters)
      words.push(`picked ${picked.map((option) => `${option.letter} · ${option.title}`).join(", ")}`)
    }
    if (adds.length) words.push(`added ${adds.join(", ")}`)
    if (edits.length) words.push(`edited ${edits.join(", ")}`)
    if (removals.length) words.push(`removed ${removals.join(", ")}`)
    if (flip) words.push(mark.multiple ? "now pick any" : "now pick one")
    return { letters, words }
  }

  /**
   * A phase's or a standing set's picks recorded (`applyToHolder()`, `choose()`);  the set changed already.
   * - a phase's:  into `chosen`, with its line;  a standing set's:  each stamped `picked-on`, `slot="picked"`
   * - `outcome`:  `choose()`'s, in place of what happens next
   */
  private recordPicks(holder: SetHolder, set: Element, { letters, words }: SetChange, outcome?: string): MarkResult {
    const plan = this.plan
    const said = words.join(";  ")
    if (holder.kind === "standing") {
      for (const option of pickedOptions(set, letters)) {
        Markup.set<"epic-option">(option.option, { pickedOn: plan.today })
        option.option.setAttribute("slot", PICKED)
      }
      return { applied: true, did: `${said}${letters.length ? `:  ${outcome ?? "act on this round"}` : ""}` }
    }
    if (letters.length) {
      const next = outcome ?? `adjust ${holder.label}'s plan to it`
      Markup.set<"epic-choices">(set, {
        chosen: letters.join(" "),
        chosenOn: plan.today,
        chosenNote: `${["recorded", ...words.slice(1)].join(";  ")};  ${next}`
      })
    }
    return { applied: true, did: `${holder.label}'s choices:  ${said}${outcome ? "" : `;  adjust its plan`}` }
  }

  /**
   * A new option in `set`, with the next free letter, after its last option still on offer;  returns its letter.
   * - `html`:  its text;  `shot`:  its picture (an `<img>`, `alt` its title);  `by`:  `owen` for his
   */
  private addOption(set: Element, { title, html, shot, by }: NewOption): string {
    const letter = nextLetter(set, 1)
    if (!letter) throw new PlanDocError("no letter left for a new option (Z is taken)")
    const plan = this.plan
    const image = shot ? `<p><img src="${PlanMarkup.text(shot)}" alt="${PlanMarkup.text(title)}"></p>` : ""
    const option = plan.make("epic-option", { letter, title, ...(by && { by }) })
    option.append(...IncomingHtml.nodes(plan.document, `${html ?? ""}${image}`))
    const last = liveOptions(set).at(-1)
    if (last) last.after(option)
    else set.prepend(option)
    return letter
  }

  /**
   * `option` edited:  its old title and text into a new `<div slot="was" data-title>`, after the earlier ones;  its
   * title `title`;  its text `html` (none:  its text stays, the `was` keeping the old title alone);  `edited` today.
   */
  private editOption(option: Element, { title, html }: { title: string; html?: string }): void {
    const document = this.plan.document
    const was = document.createElement("div")
    was.setAttribute("slot", WAS)
    was.setAttribute("data-title", PlanItem.titleOf(option))
    option.querySelector(':scope > [slot="title"]')?.remove()
    if (html !== undefined) {
      const body = Array.from(option.childNodes).filter(
        (node) => !(PlanMarkup.isElement(node) && node.hasAttribute("slot"))
      )
      was.append(...body)
      const next = option.querySelector(`:scope > [slot="${WAS}"]`)
      for (const node of IncomingHtml.nodes(document, html)) option.insertBefore(node, next)
    }
    option.append(was)
    Markup.set<"epic-option">(option, { title, edited: this.plan.today })
  }

  /** `option` removed from `set`:  `removed` today, `slot="removed"`, and out of its `chosen`. */
  private removeOption(set: Element, option: Element): void {
    const letter = option.getAttribute("letter")
    Markup.set<"epic-option">(option, { removed: this.plan.today })
    option.setAttribute("slot", REMOVED)
    const chosen = (set.getAttribute("chosen") ?? "").split(/\s+/).filter((each) => each && each !== letter)
    if (set.hasAttribute("chosen")) Markup.set<"epic-choices">(set, { chosen: chosen.join(" ") || undefined })
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** The holder `ref` names, with at least one set;  throws otherwise (`doing`:  what the message says it's for). */
  private need(ref: string, doing = "to change"): SetHolder {
    const holder = this.holderOf(ref)
    if (!holder) throw new PlanDocError(`no item, phase or standing set "${ref}"`)
    if (!holder.sets.length) throw new PlanDocError(`${holder.label} has no option cards ${doing}`)
    return holder
  }

  /** The position of `holder`'s set `given` (from 1), else its latest;  throws for none. */
  private setIndex(holder: SetHolder, given: number | undefined): number {
    const count = holder.sets.length
    const index = given === undefined ? count - 1 : Number(given) - 1
    if (!Number.isInteger(index) || !holder.sets[index])
      throw new PlanDocError(`${holder.label} has no card set ${given}:  it has ${count} (--set 1 to ${count})`)
    return index
  }

  /** `ref`'s set `set` (from 1;  none:  its latest), not closed;  throws otherwise. */
  private openSet(ref: string, set: number | undefined): { holder: SetHolder; element: Element } {
    const holder = this.need(ref)
    const element = holder.sets[this.setIndex(holder, set)]!
    if (element.hasAttribute("closed")) throw new PlanDocError(closedResult(holder.label).left)
    return { holder, element }
  }

  /** `set`'s option `letter` still on offer (not removed, not picked from a standing set);  throws otherwise. */
  private liveOption(set: Element, letter: string): Element {
    const want = String(letter).trim().toUpperCase()
    const option = liveOptions(set).find((each) => each.getAttribute("letter") === want)
    if (!option) throw new PlanDocError(`no option ${want} on offer`)
    return option
  }

  /**
   * A mark's set change in words, for `epic inbox`'s listing:  `adds +1 · Faster builds;  edits B;  removes E;  now
   * pick any`;  `""` for none.
   */
  static markWords(mark: PickFields): string {
    const words = [
      mark.added?.length ? `adds ${mark.added.map((each) => `${each.key} · ${each.title}`).join(", ")}` : "",
      mark.edited?.length ? `edits ${mark.edited.map((each) => each.letter).join(", ")}` : "",
      mark.removed?.length ? `removes ${mark.removed.join(", ")}` : "",
      mark.multiple === undefined ? "" : mark.multiple ? "now pick any" : "now pick one"
    ]
    return words.filter(Boolean).join(";  ")
  }
}

////////////////
// ## Types
////////////////

/**
 * What holds option sets (`OptionSets.holderOf()`):
 * - `kind`:  `item`, `phase` or `standing`;  `element`:  it;  `label`:  how a line names it (`Q52`, `P50`, `s-upgrades`)
 * - `sets`:  its sets, by position, as a mark's `choices` counts them
 */
export type SetHolder = { kind: "item" | "phase" | "standing"; element: Element; label: string; sets: Element[] }

/** The page's option sets, for the summary (`OptionSets.summaryOf()`). */
export type ChoicesSummary = {
  /** standing sets in the Choices section */
  sets: number
  /** those not closed */
  open: number
  /** the options on offer in the open ones */
  options: number
  /** each phase with sets still open, and how many */
  phases: { phase: string; open: number }[]
}

/** `OptionSets.add()`'s options. */
export type OptionAddOptions = {
  /** its text:  HTML when it starts with a tag, else plain */
  note?: string
  /** a picture's path from the epic page's folder */
  image?: string
  /** which of the holder's sets, from 1 (none:  its latest) */
  set?: number
}

/** `OptionSets.edit()`'s options. */
export type OptionEditOptions = {
  /** its new title */
  title?: string
  /** its new text:  HTML when it starts with a tag, else plain */
  note?: string
  /** which of the holder's sets, from 1 (none:  its latest) */
  set?: number
}

/** A set's change, applied:  its picks as letters, and what it did in words (picks first). */
type SetChange = { letters: string[]; words: string[] }

/** A new option:  its title, text (HTML), picture and who added it. */
type NewOption = { title: string; html?: string; shot?: string; by?: string }

////////////////
// ## Constants and helpers
////////////////

/** An option set's tag. */
const CHOICES = "epic-choices"

/** An Original Discussion:  history, never picked from. */
const ORIGINAL = "epic-original"

/** The slots an option goes to:  an edit's old text, a removed option, a standing set's pick. */
const WAS = "was"
const REMOVED = "removed"
const PICKED = "picked"

/** The letters an option may have, in order. */
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

/** `set`'s options still on offer:  not removed, not picked from a standing set. */
function liveOptions(set: Element): Element[] {
  return Array.from(set.querySelectorAll(":scope > epic-option")).filter((option) => !option.hasAttribute("slot"))
}

/** `set`'s options of `letters`, in that order. */
function pickedOptions(set: Element, letters: string[]): ReturnType<typeof PlanItem.optionsIn> {
  const options = PlanItem.optionsIn(set)
  return letters.flatMap((letter) => options.filter((option) => option.letter === letter))
}

/**
 * The letter of the next option added to `set`, when `count` are added:  one past its highest (removed and picked
 * ones too:  a letter is never given twice);  the first one's, or `undefined` when they'd run past `Z`.
 */
function nextLetter(set: Element, count: number): string | undefined {
  const used = PlanItem.optionsIn(set).map((option) => LETTERS.indexOf(option.letter))
  const next = Math.max(-1, ...used) + 1
  return next + count - 1 < LETTERS.length || count === 0 ? LETTERS[next] : undefined
}

/** A note from the command line as HTML:  as it is when it starts with a tag, else plain text's paragraphs. */
function noteHTML(note: string | undefined): string | undefined {
  if (note === undefined || !note.trim()) return undefined
  return note.trim().startsWith("<") ? note : PlanMarkup.paragraphs(note)
}

/** A closed set's mark:  left, with why. */
function closedResult(label: string): { applied: false; left: string } {
  return { applied: false, left: `${label}'s option set is closed:  no picks, adds or edits (reopen it by hand)` }
}

/** A set by position, for a message:  ` in card set 2`;  `""` for the holder's own (none given). */
function setWords(choices: number | undefined): string {
  return choices === undefined ? "" : ` in card set ${choices + 1}`
}
