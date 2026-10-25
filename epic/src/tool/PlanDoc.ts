import { parseHTML } from "linkedom"

import { escapeRegExp } from "spell/util/string"
import {
  OVERVIEW_ID,
  OVERVIEW_PART_ID,
  SectionIds,
  type EpicData,
  type EpicTag,
  type PageSectionKind
} from "spell-epic/definitions"
import { Markup, type MarkupContent } from "spell-epic/markup"
import { PageStages, PhaseIds, type PageStage } from "spell-epic/phases"

import {
  CALM_ID,
  CLOSED,
  ITEM_STATUSES,
  KINDS,
  OLD_DECISION,
  PHASE_FIELDS,
  PHASE_STATUSES,
  PlanDocError,
  QUESTION_ID,
  REVIEW_AS,
  UNDERWAY_CARD,
  isItemKind,
  isPhaseStatus,
  type AddItemOptions,
  type AddPhaseOptions,
  type BackfilledCommit,
  type CommitLogEntry,
  type BackfillOptions,
  type CommitOptions,
  type CommitTarget,
  type Duration,
  type ParsedCommit,
  type ChooseOptions,
  type DecideOptions,
  type FinishedState,
  type ItemDescription,
  type ItemFacts,
  type ItemKind,
  type ItemText,
  type KeptNote,
  type MarkResult,
  type OptionCard,
  type OriginalOptions,
  type OriginalResult,
  type Phase,
  type PhaseFieldValues,
  type PhaseWindow,
  type PlanMark,
  type RenameResult,
  type ReviewAs,
  type StatusState
} from "./planDoc.types"

import { IncomingHtml } from "./IncomingHtml"
import { PhaseNumbers } from "./PhaseNumbers"
import { PlanCommits } from "./PlanCommits"
import { PlanItem } from "./PlanItem"
import { PlanMarkup } from "./PlanMarkup"
import { PlanReader } from "./PlanReader"
import { PlanTime } from "./PlanTime"
import { UpdateSummary } from "./UpdateSummary"
import { Migrations } from "./migrations"
import { CHANGE_ID, STAGE_ID, SUMMARY_ID } from "./ReviewInbox"

/****************
 * ### `PlanDoc`
 * A parsed epic page in `<epic-*>` markup, `epics/<name>/<name>.plan.html`, and the edits `epic` makes
 * to it.  What's data (ids, statuses, review marks, dates):  `PLAN-DOC.md` beside this.
 * - Every edit makes or sets `<epic-*>` elements THROUGH `spell-epic` `Markup`:  data in attributes, prose in children,
 *   checked against the definitions.  It never writes layout:  the elements draw their chrome (chips, labels, the
 *   step label, progress, a phase's Plan changes box, the Plan hung? notice ...).
 * - Children go where their parent's content model lists them (`Markup.place()`):  a phase's Symptom before its Goal, an
 *   item's text before its Choices, answer, replies, Original Discussion and commits.
 * - Pure:  a parsed document in, changes on it;  no files, no git, no clock unless passed one.
 *   The command line reads and writes the doc (its lock, its parts, links and formatting) and hands this the document.
 * - Reading (the summary, the review lists, item states) is `PlanReader`'s.
 * - The item STATE logic (stamps, colours, review marks, what a mark does) is the old tool's, unchanged (P7 ported
 *   it 1:1;  P8 switched its markup).
 ****************/
export class PlanDoc extends PlanReader {
  /** `PlanDoc` of HTML text;  `options` as the constructor's. */
  static parse(html: string, now?: Date, options?: ConstructorParameters<typeof PlanDoc>[2]): PlanDoc {
    return new PlanDoc(parseHTML(html).document as unknown as Document, now, options)
  }

  /** The doc as HTML text, ready to write:  boolean attributes bare, the doctype lower-case, `&` escaped (I2). */
  toString(): string {
    return PlanMarkup.serializePage(this.document)
  }

  ////////////////
  // ## The page
  ////////////////

  /** `<epic-page>`;  throws when the doc has none (not an epic page, or one in the old markup). */
  get page(): Element {
    const page = this.document.querySelector("epic-page")
    if (!page) throw new PlanDocError("no <epic-page> in the doc:  is it an epic page in the <epic-*> markup?")
    return page
  }

  /** `<epic-overview>`;  throws when there's none. */
  get overview(): Element {
    const overview = this.page.querySelector(":scope > epic-overview")
    if (!overview) throw new PlanDocError("no <epic-overview> in the doc")
    return overview
  }

  /** The epic's title:  `<epic-page title>`. */
  get title(): string {
    return this.document.querySelector("epic-page")?.getAttribute("title") ?? ""
  }

  /** A FUTURE epic:  `<epic-page future>`. */
  get future(): boolean {
    return Boolean(this.document.querySelector("epic-page")?.hasAttribute("future"))
  }

  /** A STANDING epic (epic `epic-workflow`):  `<epic-page standing>`, open for good;  every phase done is NOT done. */
  get standing(): boolean {
    return Boolean(this.document.querySelector("epic-page")?.hasAttribute("standing"))
  }

  /**
   * The page's STAGE (epic `epic-engine` P29):  `<epic-page stage>`, `overview`, `phases` or `building`;
   * a page with none is `building` (`PageStages.of()`).
   */
  get stage(): PageStage {
    return PageStages.of(this.document.querySelector("epic-page"))
  }

  /** The saga this epic serves (epic `epic-workflow` P15):  `<epic-page saga>`, its id;  `null` when it names none. */
  get saga(): string | null {
    return this.document.querySelector("epic-page")?.getAttribute("saga") || null
  }

  /** The phases a `/bedtime` run is on:  `<epic-page bedtime>`, `null` when none is. */
  get bedtimeRun(): string | null {
    return this.document.querySelector("epic-page")?.getAttribute("bedtime") || null
  }

  /** The Overview's total:  `<epic-overview estimate>`. */
  get estimate(): string | undefined {
    return this.document.querySelector("epic-page > epic-overview")?.getAttribute("estimate") ?? undefined
  }

  /** Stamp "updated" with today:  `<epic-page updated>`. */
  touch(): void {
    Markup.set(this.page, { updated: this.today })
  }

  /** The page's section of `kind` (`<epic-section kind>` in `<epic-page>`), or `null`. */
  findSection(kind: PageSectionKind): Element | null {
    return this.document.querySelector(`epic-page > epic-section[kind="${kind}"]`)
  }

  /** The page's section of `kind`;  made, empty, in its place when the doc has none. */
  section(kind: PageSectionKind): Element {
    const found = this.findSection(kind)
    if (found) return found
    const section = this.make("epic-section", { id: SectionIds[kind], kind })
    Markup.place(this.page, section)
    return section
  }

  ////////////////
  // ## Phases
  ////////////////

  /** The `<epic-phase>`s, in order. */
  get phaseElements(): Element[] {
    return Array.from(this.document.querySelectorAll('epic-page > epic-section[kind="phases"] > epic-phase'))
  }

  /**
   * Every phase, in order:  `{ n, number, id, name, status, estimate, took }`, from each `<epic-phase>`.
   * - `n`:  its place in the list, from 1:  what this class's methods take (`phase(n)`)
   * - `number`:  the number people see and say (`7`, `11.1`;  `PhaseIds.numberOf()`), not its id
   */
  get phases(): Phase[] {
    return this.phaseElements.map((phase, index) => {
      const estimate = phase.getAttribute("estimate")
      return {
        n: index + 1,
        number: PhaseIds.numberOf(phase),
        id: phase.id,
        name: PlanItem.titleOf(phase),
        status: phase.getAttribute("status") ?? "todo",
        estimate: estimate && estimate !== "TBD" ? estimate : undefined,
        took: phase.getAttribute("took") ?? undefined
      }
    })
  }

  /** The phase at place `n`'s `<epic-phase>`:  the `n`th, from 1;  throws when there's none. */
  phase(n: number): Element {
    const phase = this.phaseElements[n - 1]
    if (!phase) throw new PlanDocError(`no phase at place ${n} in the doc`)
    return phase
  }

  /** The phase at place `n`'s label, as people say it:  `P7`, `P11.1`. */
  phaseLabel(n: number): string {
    return PhaseIds.labelOf(this.phase(n))
  }

  /**
   * The phase whose id is `id` (`p-epic-migrate`);  `undefined` for none.
   * - an OLD id (`p3`) no phase has any more (a mark or a link from before `stable-phase-ids`):  the 3rd phase
   */
  phaseById(id: string): Element | undefined {
    const phases = this.phaseElements
    const phase = phases.find((each) => each.id === id)
    if (phase) return phase
    const n = PhaseIds.oldNumber(id)
    return n === undefined ? undefined : phases[n - 1]
  }

  /**
   * The PLACE of the phase `ref` names (from 1:  what `phase(n)` takes), as people name one (`PhaseIds.find()`):
   * `7`, `P7`, `#p7`, `11.1`, `P11.1`, its id (`p-epic-migrate`), its name or slug (`Epic Migrate`, `epic-migrate`).
   * - throws for none, saying what there is
   */
  phasePlace(ref: string | number): number {
    const phases = this.phaseElements
    const phase = PhaseIds.find(phases, ref)
    if (!phase) {
      const range = phases.length
        ? `${PhaseIds.labelOf(phases[0]!)}-${PhaseIds.labelOf(phases.at(-1)!)}, or a phase's name`
        : "none yet"
      const said = String(ref).trim()
      throw new PlanDocError(
        `no phase ${/^[Pp]?\d+(\.\d+)?$/.test(said) ? said.replace(/^[Pp]?/, "P") : `"${said}"`} in the doc (${range})`
      )
    }
    return phases.indexOf(phase) + 1
  }

  /**
   * Add phase `name` (2-4 words);  returns its PLACE (`phaseLabel()` says its number).
   * - its id:  STABLE, made from `name` once and kept for good (`PhaseIds.make()`:  `p-epic-migrate`), so a rename
   *   or a later insert never moves what points at it
   * - `symptom` / `changes` / `goal` / `files` / `verify`:  its `<epic-field>`s, as HTML:
   *   the symptom one line, the changes two or three, the goal a `<ul>` (the details)
   *   - omitted ones get `TBD` to fill in, but the goal:  optional once there's a symptom or changes
   *   - neither of those:  the shape before P3 of `windows-and-review`, Goal / Files / Verify
   * - `estimate` (`1-2h`):  `<epic-phase estimate>`
   * - WHERE, and its number:
   *   - `after` (`add-phase --after 11`, epic `epic-engine` P39):  a DECIMAL phase, P11.1 (P11.2 when P11.1 is
   *     there), right after P11 and its decimals (`PhaseIds.decimalAfter()`);  no other phase changes its number
   *   - `before` (`add-phase --before N`, epic `skillz`):  inserted as phase N, the to-do phases from N on moving
   *     down one (`makeRoomForPhase()`), the text naming them following (`renumberAll()`)
   *   - neither:  last;  but the DOC PASS FLOATS (epic `epic-engine` P33, M4):  when the last phase is Doc Review
   *     (`DOC_REVIEW`), the new one goes before it, as a decimal of the phase before it (P14.1 ahead of Doc Review
   *     P15, P39):  docs never trail the code
   *     - a Doc Review under way or done is to do again (logged), keeping its name and number:  it takes in the new
   *       phase's docs when it runs again
   *     - a Doc Review that is the only phase:  the new one goes in as P1, before it
   * - a future epic with a phase is planned:  no longer future;  the "Plan hung?" notice (drawn while there's no
   *   phase) goes by itself
   * - throws for both `before` and `after`, or a refused `before` (`makeRoomForPhase()`), changing nothing
   */
  addPhase(name: string, { estimate, before: asked, after, ...values }: AddPhaseOptions = {}): number {
    if (asked !== undefined && after !== undefined) throw new PlanDocError("add-phase:  --before or --after, not both")
    const docReview =
      asked !== undefined || after !== undefined || DOC_REVIEW.test(name) ? undefined : this.lastDocReview()
    const elements = this.phaseElements
    const base = after !== undefined ? this.phase(after) : docReview ? elements.at(-2) : undefined
    const decimal = base ? PhaseIds.decimalAfter(elements, base) : undefined
    // a Doc Review alone:  the new phase before it, renumbering (it's to do by then, below)
    const before = asked ?? (docReview && !decimal ? docReview.n : undefined)
    if (docReview && docReview.status !== "todo") {
      Markup.set<"epic-phase">(elements.at(-1)!, { status: "todo" })
      this.log(`P${docReview.number} ${docReview.name}:  back to do (was ${docReview.status}), after the new phase`)
    }
    // the room first:  a refused --before changes nothing
    if (before !== undefined) this.makeRoomForPhase(before)
    const numbers = before === undefined ? undefined : PhaseNumbers.snapshot(this.document)
    const section = this.section("phases")
    if (this.future) Markup.set(this.page, { future: false })
    const framed = values.symptom !== undefined || values.changes !== undefined
    // Claude's build plan only once written (`--plan`, P33):  no TBD for it
    const fields = PHASE_FIELDS.filter((name) => name !== "plan" || values.plan !== undefined)
      .filter((name) =>
        framed ? name !== "goal" || values.goal !== undefined : name !== "symptom" && name !== "changes"
      )
      .map((name) => this.make("epic-field", { name }, this.incoming(values[name] ?? "TBD")))
    const id = PhaseIds.make(name, PhaseIds.idsIn(this.document))
    const phase = this.make(
      "epic-phase",
      { id, number: decimal?.number, title: name, status: "todo", estimate },
      fields
    )
    if (decimal) decimal.after.after(phase)
    else if (before !== undefined) this.phase(before).before(phase)
    else section.append(phase)
    // the phases after it moved down a number:  what names them follows (r21)
    if (numbers) this.renumberAll(numbers)
    this.updateEstimate()
    return this.phaseElements.indexOf(phase) + 1
  }

  /** The last phase, when it's the doc pass (`DOC_REVIEW`, its name);  else `undefined`. */
  private lastDocReview(): Phase | undefined {
    const last = this.phases.at(-1)
    return last && DOC_REVIEW.test(last.name) ? last : undefined
  }

  /**
   * Check there's room for a new phase at place `n`, before the phase there now (`add-phase --before n`):
   * it and every later phase move down a number once it's in (`addPhase()`);  returns `n`.
   * - only NUMBERS move (P15):  a phase's id is stable, so its links, comments, marks and part file stay put
   *   - the `P5` in the words of links to it (`href="#p-docs"`) says `P6`
   *   - the `phase` / `of` of items, UPDATE markers and Updated lines (the phase active then, by number)
   * - prose naming a phase without a link ("P5 tries it") isn't changed:  link phases to keep them right
   * - throws if there's no phase `n`, or a phase from `n` on has started
   *   (done or active:  its commits and log say its number)
   */
  makeRoomForPhase(n: number): number {
    const phases = this.phases
    if (!Number.isInteger(n) || n < 1 || n > phases.length) {
      throw new PlanDocError(`--before ${n}:  no such phase (${phases.length ? `1-${phases.length}` : "none yet"})`)
    }
    const started = phases.find((phase) => phase.n >= n && phase.status !== "todo")
    if (started) throw new PlanDocError(`--before ${n}:  P${started.number} has started;  only to-do phases move down`)
    return n
  }

  /**
   * Rename phase `P6` or item `J3` (`target`, any case;  `6`, a phase's id or name are a phase too) to `title`, plain
   * text (`html`:  `title` is HTML, a `slot="title"` child when it has markup);  returns what it did:
   * `{ id, label, was, title, links }` (`rename <name> <P6 | id> "New title"`, epic `epic-workflow`).
   * - a phase keeps its id (P15:  made from the name it was added under, kept for good)
   * - its `title`, or its `slot="title"` child's words:  the UPDATE markers riding in the slot stay;
   *   a slot left plain goes back to a `title`
   * - links to it (`href="#p6"`) whose words say the old title are rewritten:  `P6 · Old` -> `P6 · New`, `Old` ->
   *   `New`;  any other words stay (`P6`, "the next phase"), and so does a link in an Original Discussion (history)
   * - a phase:  also each item's queued `work` that names it (`P6 · Old`, what a todo's `next` writes)
   * - an item is stamped and flagged UPDATE, as any change to it;  a phase isn't
   * - SIDE EFFECT:  logs it
   * - throws for no such phase or item, an empty title, or the title it has already
   */
  renameEntry(target: string, title: string, { html = false }: { html?: boolean } = {}): RenameResult {
    const key = String(target).trim().toLowerCase()
    const element = ITEM_REF.test(key) && !OLD_PHASE_REF.test(key) ? this.item(key) : this.phase(this.phasePlace(key))
    const label = element.localName === "epic-phase" ? PhaseIds.labelOf(element) : element.id.toUpperCase()
    const was = PlanItem.titleOf(element)
    const heading = html ? this.titleFromHTML(title) : { title: PlanMarkup.squeeze(title) }
    const shown = heading.slot ? PlanMarkup.squeeze(heading.slot.textContent ?? "") : heading.title!
    if (!shown) throw new PlanDocError(`rename ${label}:  the new title is empty`)
    if (shown === was) throw new PlanDocError(`${label} is titled "${was}" already`)
    this.retitle(element, heading)
    const links = this.relinkTitle(element.id, label, was, shown)
    if (element.localName === "epic-phase") {
      for (const item of this.allItems.filter((each) => each.getAttribute("work") === `${label} · ${was}`))
        Markup.set<"epic-item">(item, { work: `${label} · ${shown}` })
    } else {
      this.stamp(element)
      this.markUpdate(element)
    }
    this.log(`${label} renamed:  "${was}" -> "${shown}"${links ? ` (${links} link${links === 1 ? "" : "s"})` : ""}`)
    return { id: element.id, label, was, title: shown, links }
  }

  /**
   * `element`'s title is `heading` now (`titleFromHTML()`'s shape):  plain words in its `title`, or in its title slot
   * beside the UPDATE markers already riding there;  markup, a title slot holding it (and those markers).
   */
  private retitle(element: Element, heading: { title?: string; slot?: Element }): void {
    const old = element.querySelector(':scope > [slot="title"]')
    const markers = Array.from(old?.querySelectorAll(":scope > epic-update") ?? [])
    if (!old && !heading.slot) {
      Markup.set(element, { title: heading.title })
      return
    }
    const slot = heading.slot ?? this.document.createElement("span")
    if (!heading.slot) {
      slot.setAttribute("slot", "title")
      slot.textContent = heading.title!
    }
    for (const marker of markers) slot.append(this.document.createTextNode(" "), marker)
    if (old) old.replaceWith(slot)
    else {
      element.removeAttribute("title")
      element.prepend(slot)
    }
    if (!slot.children.length) this.untitleSlot(slot)
  }

  /**
   * Every link to `#id` whose words say `was` (`P6 · Old`, or `Old` alone) says `title` instead;  how many changed.
   * - a link in an Original Discussion is history:  left
   * - the words in a link with markup are changed in the text node holding them;  one split across markup stays
   */
  private relinkTitle(id: string, label: string, was: string, title: string): number {
    let changed = 0
    for (const link of PlanItem.current(this.document.querySelectorAll(`a[href="#${id}"]`))) {
      const words = PlanMarkup.squeeze(link.textContent ?? "")
      const labelled = new RegExp(`^${label}\\s*·\\s*`, "i").exec(words)
      if (words !== was && !(labelled && words.slice(labelled[0].length) === was)) continue
      const text = textNodes(link)
        .filter((node) => node.textContent!.includes(was))
        .at(-1)
      if (!text) continue
      const at = text.textContent!.lastIndexOf(was)
      text.textContent = `${text.textContent!.slice(0, at)}${title}${text.textContent!.slice(at + was.length)}`
      changed++
    }
    return changed
  }

  /** Set phase `n`'s estimate (`2h`, `1-2h`), then the Overview's total. */
  setEstimate(n: number, estimate: string): void {
    Markup.set(this.phase(n), { estimate })
    this.updateEstimate()
  }

  /**
   * The Overview's total, `<epic-overview estimate>`:  every phase's estimate added up, and what's left (phases not
   * done):  `4h-5h 30m in all, 2h-3h left (P5 not estimated)`.
   * - an estimate that won't parse (`TBD`, "a day") is named as not counted;  no phase estimated:  no total
   * - then, once done phases have a measured time (`took`, epic `epic-engine` P41), what they took against their
   *   estimate:  `;  3 done took 1h 9m, estimated 4h-6h`
   */
  updateEstimate(): void {
    const counted = this.phases.map((phase) => ({ ...phase, range: PlanTime.parseDuration(phase.estimate) }))
    const estimated = counted.filter((phase) => phase.range)
    if (!estimated.length) {
      Markup.set(this.overview, { estimate: undefined })
      return
    }
    const total = PlanTime.sumRanges(estimated.map((phase) => phase.range!))
    const left = PlanTime.sumRanges(estimated.filter((phase) => phase.status !== "done").map((phase) => phase.range!))
    const missing = counted.filter((phase) => !phase.range).map((phase) => `P${phase.number}`)
    let text = `${PlanTime.formatRange(total)} in all, ${PlanTime.formatRange(left)} left`
    if (missing.length) text += ` (${missing.join(", ")} not estimated)`
    text += PlanDoc.tookSummary(counted)
    Markup.set(this.overview, { estimate: text })
  }

  /**
   * What the done phases with a measured time took, against their estimates:  `;  3 done took 1h 9m, estimated
   * 4h-6h`;  `""` when none has one.
   * - only the phases with BOTH, so the two numbers are about the same work
   */
  private static tookSummary(phases: (Phase & { range?: Duration })[]): string {
    const timed = phases.flatMap((phase) => {
      const took = PlanTime.parseDuration(phase.took)
      return phase.status === "done" && took && phase.range ? [{ took: took.min, range: phase.range }] : []
    })
    if (!timed.length) return ""
    const took = timed.reduce((total, phase) => total + phase.took, 0)
    const estimate = PlanTime.formatRange(PlanTime.sumRanges(timed.map((phase) => phase.range)))
    return `;  ${timed.length} done took ${PlanTime.formatMinutes(took)}, estimated ${estimate}`
  }

  /**
   * Set phase `n` to `status` (`todo` / `active` / `done`).
   * - `done` removes the phase's UPDATE markers (`removeUpdateMarkers()`):  the bare labels on items, and the
   *   updates to prose outside a phase;  once it's finished, those changes are just the plan.
   *   A phase's own plan changes stay.
   * - `done` with `{ done }` (HTML:  a `<ul>` of what was built, what Owen will ask about first):  its Done field
   * - `done` accepts a build plan still marked waiting (`acceptPlan()`)
   * - `done` with `{ minutes }`:  how long Claude worked on it (`WorkTime`), as `<epic-phase took>`, and the log
   *   line says it:  `P41 done:  took 21m` (epic `epic-engine` P41);  0 or none:  no `took`
   * - throws on any other status
   * - SIDE EFFECT:  logs the change
   */
  setPhase(n: number, status: string, { done, minutes }: { done?: string; minutes?: number } = {}): void {
    if (!isPhaseStatus(status)) throw new PlanDocError(`status must be ${PHASE_STATUSES.join(" / ")}, not "${status}"`)
    Markup.set<"epic-phase">(this.phase(n), { status })
    const took = status === "done" && minutes ? PlanTime.formatMinutes(minutes) : undefined
    if (status === "done") {
      this.removeUpdateMarkers(n)
      if (done) this.setDone(n, done)
      // built, so its plan was accepted:  a plan rewritten after the Accept never leaves a done phase "waiting"
      if (this.phase(n).getAttribute("plan") === "waiting") this.acceptPlan(this.phase(n))
      if (took) Markup.set<"epic-phase">(this.phase(n), { took })
    }
    this.updateEstimate()
    this.log(`${this.phaseLabel(n)} ${status}${took ? `:  took ${took}` : ""}`)
  }

  /**
   * Phase `n` took `minutes` of Claude's time (`epic phase seo#P3 took`, worked out again for a phase done before):
   * `<epic-phase took>`, then the Overview's total;  logged.
   */
  setTook(n: number, minutes: number): void {
    const took = PlanTime.formatMinutes(minutes)
    Markup.set<"epic-phase">(this.phase(n), { took })
    this.updateEstimate()
    this.log(`${this.phaseLabel(n)} took:  ${took}`)
  }

  /**
   * When phase `n` was at work, as the log says (`P3 active`, `P3 done`):  from its last `active` before the done,
   * to its last `done` (a phase not done yet:  to now);  `undefined` when the log never says it went active.
   * - the log names a phase by its number at the time:  a phase renumbered since (a move, an insert before
   *   decimal numbers) finds no lines, or another's
   */
  activeWindow(n: number): PhaseWindow | undefined {
    const label = this.phaseLabel(n)
    const said = new RegExp(`^${escapeRegExp(label)} (active|done)\\b`)
    const events = Array.from(this.section("log").querySelectorAll("epic-event")).flatMap((event) => {
      const status = said.exec(event.textContent?.trim() ?? "")?.[1]
      const at = Date.parse(event.getAttribute("at") ?? "")
      return status && !Number.isNaN(at) ? [{ status, at }] : []
    })
    const done = this.phase(n).getAttribute("status") === "done"
    const to = done ? events.findLast((event) => event.status === "done")?.at : this.now.getTime()
    if (to === undefined) return undefined
    const from = events.findLast((event) => event.status === "active" && event.at <= to)?.at
    return from === undefined ? undefined : { from, to }
  }

  /** Phase `n`'s Done field (`<epic-field name="done">`):  what was built, as HTML;  replaces an earlier one. */
  setDone(n: number, html: string): void {
    this.setField(this.phase(n), "done", html)
  }

  /**
   * Set phase `n`'s fields:  `{ symptom, changes, goal, files, verify }`, as HTML;  each one given replaces that
   * field, or is made in its place;  `""` removes it.  Returns the fields set, by label (`Symptom` ...).
   */
  setPhaseFields(n: number, values: PhaseFieldValues): string[] {
    const phase = this.phase(n)
    const set: string[] = []
    for (const name of PHASE_FIELDS) {
      const html = values[name]
      if (html === undefined) continue
      this.setField(phase, name, html)
      set.push(`${name[0]!.toUpperCase()}${name.slice(1)}`)
    }
    // Claude's build plan (epic `epic-engine` P33):  a new one waits for Owen's Accept;  removed, nothing waits
    if (values.plan !== undefined) {
      // the doc pass never waits for an Accept (Owen, 2026-10-25:  "I shouldn't have to accept `doc review` phase")
      const docReview = DOC_REVIEW.test(PhaseIds.titleOf(phase))
      if (values.plan && docReview) this.acceptPlan(phase)
      else Markup.set<"epic-phase">(phase, { plan: values.plan ? "waiting" : undefined })
      const said = docReview ? "accepted, the doc pass" : "waiting for Owen's Accept"
      const label = PhaseIds.labelOf(phase)
      this.log(values.plan ? `${label} plan written:  ${said}` : `${label} plan removed`)
    }
    return set
  }

  /**
   * Owen accepted phase `phase`'s build plan (Accept plan, epic `epic-engine` P33):  the plan field `accepted` (now),
   * the phase `plan="accepted"`;  Claude builds it next.
   */
  acceptPlan(phase: Element): void {
    const field = phase.querySelector(':scope > epic-field[name="plan"]')
    if (field) Markup.set<"epic-field">(field, { accepted: PlanTime.clockTime(this.now) })
    Markup.set<"epic-phase">(phase, { plan: "accepted" })
  }

  /**
   * A change to phase `n`'s plan, `html` (what changed, and why), as one `<epic-update at summary>` block at the END of
   * the phase's description (Owen, 2026-10-11:  "The updated blocks themselves go at the end of the phase
   * description"), after the ones before it.
   * - where:  after Goal (and Owen's kept notes), before Done, the commits, Files, Verify and To review
   *   (`Markup.place()`, the vocabulary's order)
   * - `at`:  now, `YYYY-MM-DD HH:MM`;  `phase`:  the phase active when it was written, if any
   * - `summary`:  as given, else the first sentence of `html` (`UpdateSummary`);  drawn `Update: <summary>`
   * - it STAYS when a phase is done (unlike the UPDATE markers);  the phase's `changes` counts it
   *   (`writeChangeCounts()`, every edit)
   * - old prose shapes in `html` (a Net effect paragraph, a code accordion ...) become elements (`IncomingHtml`)
   * - SIDE EFFECT:  logs it
   */
  addPhaseUpdate(n: number, html: string, { summary }: { summary?: string } = {}): void {
    const phase = this.phase(n)
    const nodes = this.incoming(html)
    const given = PlanMarkup.squeeze(summary ?? "")
    const data = {
      at: PlanTime.clockTime(this.now),
      phase: this.activePhase,
      summary: given || UpdateSummary.of(nodes) || undefined
    }
    Markup.place(phase, this.make("epic-update", data, nodes))
    this.log(`${PhaseIds.labelOf(phase)} plan updated${data.summary ? `:  ${data.summary}` : ""}`)
  }

  /**
   * Request `id` (`r3`, epic `epic-workflow`) into phase `n`'s Requests field, as one labelled block:  `html` (his
   * words, the sender, the screenshots), under the label `r3 · <from>`.
   * - the field is made, after Symptom / Changes and their Updated lines, when the phase has none
   * - a block already there for `id` is replaced:  filing a request again moves nothing
   * - URLs in `html` are the page's (`requests/r3/image-1.png`):  a split doc's part file rebases them
   * - SIDE EFFECT:  logs it
   */
  addPhaseRequest(n: number, id: string, from: string, html: string): void {
    const phase = this.phase(n)
    let field = phase.querySelector(':scope > epic-field[name="requests"]')
    if (!field) {
      field = this.make("epic-field", { name: "requests" }, [])
      Markup.place(phase, field)
    }
    const label = `${id} · ${from}`
    for (const block of field.querySelectorAll(":scope > epic-field[label]")) {
      if (block.getAttribute("label")!.split(" · ")[0] === id) block.remove()
    }
    Markup.append(field, [this.make("epic-field", { label }, this.incoming(html))])
    this.log(`${id} filed into ${PhaseIds.labelOf(phase)}`)
  }

  /**
   * How many plan changes each phase holds, in its `changes` (none:  no attribute);  changed?
   * - its `<epic-update>` blocks (and an older doc's `<epic-updated>` lines, until migrated)
   * - in the skeleton, so a folded phase's title says its plan changed while its body, a part, isn't loaded
   * - STATIC:  the converter writes the same (`DocPass`);  `section` must hold its phases' updates (an ASSEMBLED doc:
   *   a skeleton alone would read as no changes)
   */
  static writeChangeCounts(section: Element): boolean {
    let changed = false
    for (const phase of section.querySelectorAll(":scope > epic-phase")) {
      const count = phase.querySelectorAll(PLAN_CHANGES).length
      if (phase.getAttribute("changes") === (count ? String(count) : null)) continue
      Markup.set<"epic-phase">(phase, { changes: count || undefined })
      changed = true
    }
    return changed
  }

  /** How many plan changes each of this doc's phases holds (`writeChangeCounts()`);  changed? */
  updateChangeCounts(): boolean {
    const section = this.findSection("phases")
    return section ? PlanDoc.writeChangeCounts(section) : false
  }

  /**
   * Bring this doc's markup up to today's, as every edit does (`Migrations.everyEdit`:  the cheap markup steps,
   * idempotent);  returns the steps that changed something.
   * - none today (epic `repo-split` Q45 took the old ones);  the rest (`links-agree`) run only on command:
   *   `epic migrate` (`MigrateCommands`)
   * - SIDE EFFECT:  logs them, `migrated:  <step>`
   */
  migrate(): string[] {
    const ran = Migrations.run(this.document, { now: this.now }, undefined, Migrations.everyEdit)
    if (ran.length) this.log(`migrated:  ${ran.join(", ")}`)
    return ran
  }

  /**
   * UPDATE markers of the phase at place `n`:  every `<epic-update phase="N">` (its number) but a phase's own plan
   * changes (`epic-phase > epic-update`, kept for good):  the bare labels, and the updates to prose.
   */
  updateMarkers(n: number): Element[] {
    const number = PhaseIds.numberOf(this.phase(n))
    return Array.from(this.document.querySelectorAll(`epic-update[phase="${number}"]`)).filter(
      (update) => update.parentElement?.localName !== "epic-phase"
    )
  }

  /**
   * Remove phase `n`'s UPDATE markers (`updateMarkers()`);  a title slot left with plain text goes back to a `title`
   * (as the converter writes a title without markup).
   */
  removeUpdateMarkers(n: number): void {
    for (const marker of this.updateMarkers(n)) {
      const slot = marker.parentElement?.getAttribute("slot") === "title" ? marker.parentElement : null
      marker.remove()
      if (slot && !slot.children.length) this.untitleSlot(slot)
    }
  }

  ////////////////
  // ## Items
  ////////////////

  /** Every `<epic-item>`, in page order. */
  get allItems(): Element[] {
    return Array.from(this.document.querySelectorAll("epic-page > epic-section > epic-item"))
  }

  /** The elements in `kind`'s section. */
  protected sectionChildren(kind: ItemKind): Element[] {
    return Array.from(this.findSection(KINDS[kind].section)?.children ?? [])
  }

  /** What `<epic-item>` `item` says, through `Markup.read()`. */
  facts(item: Element): ItemFacts {
    const data = Markup.read<"epic-item">(item)
    return {
      id: item.id,
      title: PlanItem.titleOf(item),
      status: data.status ?? "open",
      changed: data.changed,
      phase: data.phase,
      answered: Boolean(data.answered),
      reviewed: data.reviewed,
      deferred: data.deferred,
      queued: data.queued,
      work: data.work,
      working: Boolean(data.working),
      underway: !!item.querySelector(UNDERWAY_CARD),
      bedtime: Boolean(data.bedtime),
      calm: Boolean(data.calm),
      awaitsPick: PlanItem.awaitsPick(item),
      reviewAs: data.reviewAs,
      handled: data.handled
    }
  }

  /**
   * The item with `id` (any case), or `null`.
   * - an old decision's id (`d7`), kept on an answer (`<epic-answer id="d7">`), finds the question holding it:
   *   `close d7`, `Fix D7:` commits still reach it
   */
  findItem(id: string): Element | null {
    const key = String(id).toLowerCase()
    let element = this.document.getElementById(key)
    if (element?.localName === "epic-answer" && OLD_DECISION.test(key)) element = element.closest("epic-item")
    return element?.localName === "epic-item" && element.parentElement?.localName === "epic-section" ? element : null
  }

  /** The item with `id` (any case);  throws when there's none. */
  item(id: string): Element {
    const item = this.findItem(id)
    if (!item) throw new PlanDocError(`no item "${id}"`)
    return item
  }

  /**
   * Add a `kind` item titled `title`;  returns its id (`c3`).
   * - `details`:  HTML, its children (its text, and cards:  `<epic-choices>` ...);  old shapes are turned into
   *   elements on the way in (`IncomingHtml`);  a question's lead, the question as asked, goes in an
   *   `<epic-question>` (P14) unless the HTML has one
   * - `titleHTML`:  `title` is HTML;  with markup, it's a `slot="title"` child
   * - a question goes after the open questions at the top of its section;  a decision is a question born answered
   *   (D13):  the next `q` id, `decided`, `answered`, `title` its answer, among the answered ones;
   *   everything else at the end
   * - while a phase is active:  `phase` (its "To review" line lists it) and an UPDATE marker
   * - in bedtime mode (a `/bedtime` run):  `overnight`, for good (the bed icon on its line)
   * - `calm`:  not urgent (yellow, not red, until reviewed):  a judgement call or issue that wouldn't surprise Owen
   * - stamped (`stamp()`)
   * - throws on a kind not in `KINDS`;  `calm` on a kind that's never urgent
   */
  addItem(kind: string, title: string, { details, titleHTML = false, calm = false }: AddItemOptions = {}): string {
    const id = this.nextId(kind)
    const spec = KINDS[kind as ItemKind]
    if (calm && !CALM_ID.test(id)) throw new PlanDocError(`--calm is for a judgement call or an issue, not a ${kind}`)
    const section = this.section(spec.section)
    const heading = titleHTML ? this.titleFromHTML(title) : { title }
    const data: EpicData<"epic-item"> = {
      id,
      title: heading.title,
      status: spec.live,
      phase: this.activePhase,
      answered: kind === "decision",
      ...((spec as { limit?: boolean }).limit && { limit: true }),
      ...(this.bedtime && { overnight: true }),
      ...(calm && { calm: true })
    }
    const item = this.make("epic-item", data, heading.slot ? [heading.slot] : [])
    for (const node of this.incoming(details, { question: kind === "question" })) Markup.place(item, node)
    section.append(item)
    if (spec.prefix === KINDS.question.prefix) this.placeQuestion(item)
    this.stamp(item)
    this.markUpdate(item)
    return id
  }

  /**
   * The id the next `kind` item will get (`addItem()`'s):  one past the highest of its LETTER, `t4`.
   * - a caveat and a todo share theirs (`c`, epic `epic-engine` P32)
   * - throws on a kind not in `KINDS`
   */
  nextId(kind: string): string {
    if (!isItemKind(kind)) throw new PlanDocError(`kind must be ${Object.keys(KINDS).join(" / ")}, not "${kind}"`)
    const { prefix } = KINDS[kind]
    const pattern = new RegExp(`^${prefix}\\d+$`)
    const ids = this.sectionChildren(kind).filter((item) => pattern.test(item.id))
    return `${prefix}${Math.max(0, ...ids.map((item) => PlanItem.idNumber(item.id))) + 1}`
  }

  /**
   * Answer question `questionId` with `answer` (text), INTO the question (D13);  returns its id (`q3`).
   * - `decided`, `answered`;  the title keeps the question
   * - the answer is an `<epic-answer title="<answer>">`, `details` (HTML) its children, after the question's text
   *   and Choices
   * - answering again replaces the answer in place:  the old one goes into the question's Original Discussion
   *   (`keepOriginal()`), never dropped;  an old decision's id (`d7`) stays on the new answer
   * - `option` (`A`):  that option is the chosen one (`chooseOption()`), of the question's own options or (`choices`,
   *   I8) of the card set at that position, a reply's say;  a question has ONE answer, so no other set stays chosen
   * - moves among the answered questions, in id order:  open ones stay on top
   * - throws when `questionId` isn't a question
   */
  decide(questionId: string, answer: string, { details, option, choices }: DecideOptions = {}): string {
    const question = this.item(questionId)
    if (!QUESTION_ID.test(question.id)) throw new PlanDocError(`${questionId} isn't a question`)
    const old = question.querySelector(":scope > epic-answer")
    const card = this.make("epic-answer", { title: answer }, this.incoming(details))
    if (old) {
      const id = old.getAttribute("id") ?? undefined
      old.replaceWith(card)
      Markup.set(old, { id: undefined })
      const same = PlanMarkup.bare(old.outerHTML) === PlanMarkup.bare(card.outerHTML)
      // the answer it replaces is kept (headed by its old decision's id, `D7`), unless it said the same
      if (!same) this.keepOriginal(question, [Markup.set(old, { id })])
      Markup.set(card, { id })
    } else Markup.place(question, card)
    if (option) {
      const set = this.chooseOption(question, option, choices)
      for (const other of PlanItem.choiceSets(question)) if (other !== set) Markup.set(other, { chosen: undefined })
    }
    Markup.set<"epic-item">(question, { status: "decided", answered: true })
    this.placeQuestion(question)
    this.stamp(question)
    this.markUpdate(question)
    return question.id
  }

  /**
   * Mark option `letter` (`A`, `B` ...) of `item` as the one chosen:  `<epic-choices chosen="B">`, on its own card set
   * or (`choices`) the one at that position (`PlanItem.choiceSet()`, I8);  returns that set.
   * - throws when the set has no option with that letter;  never one in its Original Discussion (that's history)
   */
  chooseOption(item: Element, letter: string, choices?: number): Element {
    const want = String(letter).trim().toUpperCase()
    const set = PlanItem.choiceSet(item, choices)
    if (!set || !PlanItem.optionsIn(set).some((option) => option.letter === want))
      throw new PlanDocError(`${item.id.toUpperCase()} has no option ${want}${cardSetWords(choices)}`)
    Markup.set(set, { chosen: want })
    return set
  }

  /**
   * `item`'s options:  `[{ letter, title, recommended }]`;
   * its own card set's, or (`choices`) the one at that position (`PlanItem.choiceSet()`, I8).
   */
  optionCards(item: Element, choices?: number): OptionCard[] {
    return PlanItem.optionsIn(PlanItem.choiceSet(item, choices)).map(({ letter, title, recommended }) => ({
      letter,
      title,
      recommended
    }))
  }

  /**
   * Put question `item` where it belongs in its section:  an open one after the open questions on top;
   * an answered (or dropped) one among the answered, in id order.
   */
  placeQuestion(item: Element): void {
    const section = item.parentElement!
    if (item.getAttribute("status") === "open") {
      const last = this.openQuestions(section)
        .filter((other) => other !== item)
        .at(-1)
      if (last) last.after(item)
      else section.prepend(item)
      return
    }
    const n = PlanItem.idNumber(item.id)
    const later = Array.from(section.children).find(
      (other) =>
        other !== item &&
        QUESTION_ID.test(other.id) &&
        other.getAttribute("status") !== "open" &&
        PlanItem.idNumber(other.id) > n
    )
    if (later) later.before(item)
    else section.append(item)
  }

  /** The open questions at the top of `section`, in order. */
  openQuestions(section: Element): Element[] {
    const run: Element[] = []
    for (const item of section.children) {
      if (!QUESTION_ID.test(item.id) || item.getAttribute("status") !== "open") break
      run.push(item)
    }
    return run
  }

  /**
   * Set item `id` open, done or canceled;  closed items stay (`canceled` ones struck through).  Returns its title.
   * - "open" means the kind's live status:  a reopened answered question is `decided` again, an unanswered one `open`
   * - a question moves to its place (`placeQuestion()`);  stamped (`stamp()`)
   * - throws on any other status, or an id the doc doesn't have
   */
  setItem(id: string, status: string): string {
    if (!(ITEM_STATUSES as readonly string[]).includes(status))
      throw new PlanDocError(`item status must be ${ITEM_STATUSES.join(" / ")}`)
    const item = this.item(id)
    const question = QUESTION_ID.test(item.id)
    let live: "open" | "decided" =
      Object.values(KINDS).find((spec) => new RegExp(`^${spec.prefix}\\d+$`).test(item.id))?.live ?? "open"
    if (question) live = item.hasAttribute("answered") ? "decided" : "open"
    Markup.set<"epic-item">(item, { status: status === "open" ? live : (status as "done" | "canceled") })
    if (question) this.placeQuestion(item)
    this.stamp(item)
    this.markUpdate(item)
    return PlanItem.titleOf(item)
  }

  /**
   * Stamp `item` as changed now:  `changed` (ISO local time, with offset), which `updateStates()` compares with the
   * page's `recent-since`;  during a `/bedtime` run also `bedtime`, until it's reviewed.
   * - `at`:  when, if not now (`review()`'s backfilled date);  `bedtime`:  `false` for a change Owen made
   */
  stamp(item: Element, { at = this.now, bedtime = this.bedtime }: { at?: Date; bedtime?: boolean } = {}): void {
    Markup.set<"epic-item">(item, { changed: PlanTime.isoTime(at), ...(bedtime && { bedtime: true }) })
  }

  /**
   * While a phase is active, flag `item` as changed in it (once):  an `<epic-update phase="N">` in its title, which
   * becomes a `slot="title"` child to hold it (as the converter writes one).
   */
  markUpdate(item: Element): void {
    const n = this.activePhase
    if (!n || item.querySelector(':scope > [slot="title"] > epic-update')) return
    const slot = this.titleSlot(item)
    slot.append(this.document.createTextNode(" "), this.make("epic-update", { phase: n }))
  }

  ////////////////
  // ## Review
  ////////////////

  /**
   * Mark item `id` reviewed today (`/epic review`, or any session that talked it through with Owen);
   * returns its title.
   * - `reviewed="YYYY-MM-DD"`;  clears `deferred`:  it's been gone through now
   * - the outcome goes in the log, not on the item
   * - `date`:  when it was reviewed, if not today (`backfill`:  the day of the evidence);  the change stamp is that
   *   day too, so a backfill doesn't make old items "recent"
   * - Owen has seen it now:  `bedtime` goes
   */
  review(id: string, { date = this.today }: { date?: string } = {}): string {
    const item = this.item(id)
    Markup.set(item, { reviewed: date, deferred: undefined })
    this.stamp(item, { at: date === this.today ? this.now : PlanTime.localDay(date), bedtime: false })
    Markup.set(item, { bedtime: undefined })
    return PlanItem.titleOf(item)
  }

  /**
   * Item `id` is urgent (`calm` false) or not (`calm` true):  Owen's click on its id chip, applied (`epic inbox
   * apply`);  returns what it did, for the log (`not urgent`), or `undefined` when it already was.
   * - only a judgement call or an issue:  throws for any other item, or an id the doc doesn't have
   */
  setCalm(id: string, calm: boolean): string | undefined {
    const item = this.item(id)
    if (!CALM_ID.test(item.id))
      throw new PlanDocError(`${item.id.toUpperCase()} is never urgent:  only calls and issues`)
    if (item.hasAttribute("calm") === calm) return undefined
    Markup.set(item, { calm: calm || undefined })
    this.stamp(item)
    return calm ? "not urgent" : "urgent"
  }

  /** Put item `id` off (`deferred`, today):  still outstanding, shown as such next review;  returns its title. */
  defer(id: string): string {
    const item = this.item(id)
    Markup.set(item, { deferred: this.today })
    this.stamp(item)
    return PlanItem.titleOf(item)
  }

  /**
   * Queue `work` for item `id`:  a review decided it should be done, and it isn't yet;  returns its title.
   * - `queued` (today) + `work`;  also marks it reviewed (so `bedtime` goes, as `review()`)
   * - survives sessions:  the next `/epic review` offers it first, `unqueue()` once it's started or dropped
   */
  queue(id: string, work: string): string {
    const item = this.item(id)
    Markup.set(item, { queued: this.today, work: String(work), reviewed: this.today, deferred: undefined })
    this.stamp(item, { bedtime: false })
    Markup.set(item, { bedtime: undefined })
    return PlanItem.titleOf(item)
  }

  /** Take item `id` off the queue (started, or dropped);  it stays reviewed.  Returns its title. */
  unqueue(id: string): string {
    const item = this.item(id)
    Markup.set(item, { queued: undefined, work: undefined })
    this.stamp(item)
    return PlanItem.titleOf(item)
  }

  /**
   * Does a decision (an answered question other than the item itself) link to `#id` in its current text (its
   * Original Discussion doesn't count)?
   */
  linkedFromDecision(id: string): boolean {
    return this.itemsOf("question").some(
      (decision) =>
        decision.id !== id &&
        decision.hasAttribute("answered") &&
        PlanItem.current(decision.querySelectorAll(`a[href="#${id}"]`)).length > 0
    )
  }

  /**
   * Item `item`'s current text (its Original Discussion left out) as text and as HTML (cards as prose, for a page
   * without the elements:  `ItemPicker`), its Original Discussion as text, its recommended option.
   */
  textOf(item: Element): ItemText {
    const current = PlanItem.currentText(item)
    const original = item.querySelector(":scope > epic-original")
    const prose = this.document.createElement("div")
    for (const node of Array.from(current.cloneNode(true).childNodes)) prose.append(PlanItem.asProse(node, PLAIN))
    return {
      details: PlanMarkup.squeeze(this.shownText(current)),
      detailsHtml: prose.innerHTML.trim(),
      original: original ? PlanMarkup.squeeze(original.textContent ?? "") : null,
      recommendation: PlanItem.recommendation(item)
    }
  }

  ////////////////
  // ## Review inbox
  ////////////////

  /**
   * Item `id` as the inbox shows it;  what takes notes as an item does too (`reviewPart()`):
   * an Overview sub-section (`o3`, Q14), kind `overview`;  a phase (`p-epic-migrate`), kind `phase`, its status;
   * the summary (`summary`), kind `summary`, its own text the title (epic `airplane` P2);  a change mark (`ch3`,
   * epic `epic-engine` P30), kind `change`, its words and question the title, `new` or `older`.
   */
  describeItem(id: string): ItemDescription | null {
    const change = this.findChange(id)
    if (change) {
      const status = this.isNewChange(change) ? "new" : "older"
      return { id: String(id).toUpperCase(), kind: "change", status, title: changeTitle(change) }
    }
    if (String(id).toLowerCase() === STAGE_ID) {
      const stage = this.stage
      return {
        id: STAGE_ID.toUpperCase(),
        kind: "stage",
        status: stage,
        title: `Accept ${stage.charAt(0).toUpperCase()}${stage.slice(1)}`
      }
    }
    const part = this.reviewPart(id)
    if (!part) return super.describeItem(id)
    const { element, kind } = part
    const status = kind === "phase" ? (element.getAttribute("status") ?? "todo") : "open"
    const title = kind === "summary" ? summaryText(element) : PlanItem.titleOf(element)
    return { id: String(id).toUpperCase(), kind, status, title }

    /** The summary's own text:  its slotted children (Owen's kept notes, status cards) left out. */
    function summaryText(summary: Element): string {
      const own = Array.from(summary.childNodes).filter(
        (node) => !(PlanMarkup.isElement(node) && node.hasAttribute("slot"))
      )
      return PlanMarkup.squeeze(own.map((node) => node.textContent ?? "").join(""))
    }
  }

  /**
   * Apply one mark Owen SENT from the page, when it's mechanical:
   * returns `{ applied: true, did }`, or `{ applied: false, left }` (why it's left for Claude),
   * plus `gone: true` for an item the doc no longer has (the caller drops its mark).
   * - `approve`:
   *   - an open question:  answered with its recommended option (`decide()`, that option chosen), and reviewed;
   *     none recommended:  left, "needs talk"
   *   - an open judgement call:  closed (accepted);  an open test:  closed (it passed);  both reviewed
   *   - anything else (an open caveat, issue or todo;  a closed or answered item):  reviewed
   * - `pick`, from any of the item's card sets (`choices`, by position;  none, its own:  I8) (`pickOption()`):
   *   - that set's option chosen
   *   - a question answered with it (its title the answer), any other item APPROVED with it (as approve)
   *   - reviewed, a Noted card `Chose B · <title>:  recorded ...;  waiting for the next phase, P9 · <name>`
   * - `todo`:  a new todo, "Follow up:  <title>", linking back;  the item reviewed;  a Noted card `Made todo T23 ...`
   * - `next`, a todo's plane (Owen, 2026-10-09):  queued into the NEXT phase, the first still to do
   *   (`queue()`, its work `P10 · <name>`;  none:  "the next phase"), a Noted card `Queued for P10 · <name>`
   * - every card `apply` writes is NOTED, never Done (Owen, 2026-10-10):
   *   it records Owen's choice;  nothing is built yet
   * - `drop`, a todo's x:  canceled (struck through, grey), "dropped by Owen in review" in the log;  reviewed
   * - `skip`, every other note box's x (Owen, 2026-10-09):  nothing to do
   *   - reviewed, no status card, its state as it was (an open question stays open)
   *   - on a todo it's `drop`
   * - `next`, `drop`, `skip` with a note:  the note kept first, as Owen's reply (`keepNote()`)
   * - `revisit` soon:  left, for Claude to talk over in the chat;  `details`, revisit `now`:  left, an agent's
   *   - a revisit carrying a `pick` ("pick B, but ..."):  left too, NOT answered:  the note may change the pick
   * - an Overview sub-section (`o3`, Q14), a phase (`p3`), the summary (`summary`, epic `airplane` P2)
   *   (`applyToPart()`):
   *   - approve and skip are noted (a skip's note kept)
   *   - todo makes a todo
   *   - the rest as for an item
   * - `new`, a new todo or question Owen asked for from the page (epic `airplane` P2):
   *   made, as `plan-doc add` makes one (`addFromPage()`)
   * - `test`, a test's answer from the page's test run (epic `epic-engine` P4:  `applyTest()`):
   *   passed closes it, failed files an issue, skip cancels it, not now defers it
   * - `accept`, the page header's stage button (`stage`, epic `epic-engine` P29) (`applyAccept()`):  the page moves
   *   on from the stage it ended, `overview` -> `phases` -> `building`;  dropped when the page has moved on already
   * - `defer`, a phase's Defer while the phases are agreed (P29):  moved after the other phases, still to do
   * - `accept` / `reopen` on a change mark (`ch3`, epic `epic-engine` P30;  `applyChange()`):  the change stands
   *   (`accepted`), or its question opens again
   * - an applied mark adds ONE log line (`J9 approved:  closed (accepted)`);  the methods it calls stamp the item
   */
  applyMark(mark: PlanMark): MarkResult {
    if (mark.action === "new") return this.addFromPage(mark)
    if (String(mark.id).toLowerCase() === STAGE_ID) return this.applyAccept(mark)
    if (CHANGE_ID.test(String(mark.id).toLowerCase())) return this.applyChange(mark)
    const part = this.reviewPart(mark.id)
    if (part) {
      const result = this.applyToPart(part, mark)
      if (result.applied) this.log(`${String(mark.id).toUpperCase()} ${result.did}`)
      return result
    }
    const item = this.findItem(mark.id)
    if (!item) return { applied: false, gone: true, left: "no such item:  mark dropped" }
    // skipping a todo IS dropping it (its own note box's x is Drop It;  a skip comes from a page drawn before)
    const todoSkip = mark.action === "skip" && PlanItem.kindOfItem(item) === "todo"
    const applied = todoSkip ? { ...mark, action: "drop" as const } : mark
    const result = this.applyAction(item, applied)
    if (result.applied) {
      this.log(`${item.id.toUpperCase()} ${result.did}`)
      this.reviewedAs(item, applied.action === "pick" ? "approve" : applied.action)
    }
    return result
  }

  /**
   * Record on `item` how Owen's review mark was handled, once Claude applied it, talked it over or did it.
   * - `review-as`:  `approve`, `todo`, `revisit`, `now`, a todo's `next` and `drop`, `skip`
   * - the inbox forgets the mark, the doc keeps it (epic `windows-and-review` P2, Q8):
   *   the record, never drawn on the buttons, which clear;  the id chip shows the result (the fill rule, Q20)
   * - a pick counts as approve;  `now`:  an immediate request (Do Now) done
   * - any other action:  nothing to record
   */
  reviewedAs(item: Element, action: string): void {
    if ((REVIEW_AS as readonly string[]).includes(action)) Markup.set(item, { reviewAs: action as ReviewAs })
  }

  /** `applyMark()`'s work on `item`, the log line aside. */
  applyAction(item: Element, { action, pick, choices, when, note, at, result, shot }: PlanMark): MarkResult {
    const kind = PlanItem.kindOfItem(item)
    const open = item.getAttribute("status") === "open"
    switch (action) {
      case "approve": {
        if (kind === "question" && open) {
          const option = this.optionCards(item).find((card) => card.recommended)
          if (!option) return { applied: false, left: "needs talk:  no option is marked (recommended)" }
          this.answerWith(item, option)
          return { applied: true, did: `approved:  answered ${option.letter} · ${option.title} (recommended)` }
        }
        return { applied: true, did: `approved:  ${this.approve(item, kind, open)}` }
      }
      case "pick":
        return this.pickOption(item, kind, open, pick, choices)
      case "todo": {
        const from = { label: item.id.toUpperCase(), link: item.id, what: kind, title: PlanItem.titleOf(item) }
        const todo = this.followUp(from, note)
        this.review(item.id)
        this.noteStatus(item.id, filedTodo(todo))
        return { applied: true, did: `to caveat ${todo.toUpperCase()}` }
      }
      case "next": {
        const phase = this.phases.find((each) => each.status === "todo")
        const where = phase ? `P${phase.number} · ${phase.name}` : "the next phase"
        if (note) this.keepNote(item.id, { note, action: "next phase", at })
        this.queue(item.id, where)
        const card = phase ? `Queued for ${where}` : `Queued for the next phase:  there's no phase to do yet`
        this.noteStatus(item.id, PlanMarkup.text(card))
        return { applied: true, did: `queued for ${where}${phase ? "" : " (no phase to do yet)"}` }
      }
      case "drop": {
        if (note) this.keepNote(item.id, { note, action: "drop", at })
        this.setItem(item.id, "canceled")
        this.review(item.id)
        return { applied: true, did: "canceled:  dropped by Owen in review" }
      }
      case "skip": {
        if (note) this.keepNote(item.id, { note, action: "skip", at })
        this.review(item.id)
        return { applied: true, did: `skipped:  nothing to do, reviewed${note ? " (his note kept)" : ""}` }
      }
      case "test":
        return this.applyTest(item, kind, { result, note, shot, at })
      default:
        return this.leftForClaude({ action, pick, when, note }, () =>
          this.optionCards(item, choices).find((card) => card.letter === pick)
        )
    }
  }

  /**
   * A test's answer from Owen's TEST RUN on the page (epic `epic-engine` P4):  `result`, maybe his `note` and `shot`.
   * - `passed`:  closed (done), reviewed;  a `failed` from an earlier run goes
   * - `failed`:  a NEW issue, "T3 failed:  <test title>", linking the test, with his note and his screenshot
   *   (an `<img>`, its path from the epic page's folder, as the page's own) (`fileFailure()`)
   *   - the test stays open (a closed one reopens), reviewed, `failed="i42"`,
   *     and a Noted card linking the issue:  linked both ways
   * - `skip`:  it no longer applies:  canceled, reviewed
   * - `notnow`:  he can't do it yet:  stays open, deferred today, so the next run puts it last
   * - his COMMENT (the mark's `note`, any result;  Owen, 2026-10-19:  "it did part of what you asked, I want to
   *   explain how"):  kept on the test as his reply (`keepNote()`, `<epic-reply from="Owen" re="test passed">`);
   *   a failure's in its new issue too, a skip's in the cancel line
   * - his SCREENSHOT (`shot`, any result since 2026-10-22:  the run takes one on every card):  a failure's in its new
   *   issue;  any other answer's in that reply, under his words (a reply of the screenshot alone, with none)
   * - dropped (`gone`) when `item` isn't a test;  left for Claude when the result is none of those
   */
  private applyTest(
    item: Element,
    kind: string,
    { result, note, shot, at }: Omit<PlanMark, "id" | "action">
  ): MarkResult {
    const label = item.id.toUpperCase()
    if (kind !== "test") return { applied: false, gone: true, left: `${label} isn't a test:  its answer dropped` }
    const replyShot = result === "failed" ? undefined : shot
    if (note || replyShot) {
      this.keepNote(item.id, { note: note ?? "", action: TEST_NOTE_AS[result!] ?? "test", at, shot: replyShot })
    }
    switch (result) {
      case "passed":
        if (item.getAttribute("status") !== "done") this.setItem(item.id, "done")
        Markup.set(item, { failed: undefined })
        this.review(item.id)
        return { applied: true, did: `passed (${OWENS_RUN})` }
      case "failed": {
        const issue = this.fileFailure(item, { note, shot, at })
        if (item.getAttribute("status") !== "open") this.setItem(item.id, "open")
        Markup.set(item, { failed: issue })
        this.review(item.id)
        const link = `<a href="#${issue}">${issue.toUpperCase()}</a>`
        this.noteStatus(item.id, `Failed in Owen's test run:  filed as ${link}.`)
        return { applied: true, did: `failed (${OWENS_RUN}):  filed ${issue.toUpperCase()}`, filed: issue }
      }
      case "skip":
        this.setItem(item.id, "canceled")
        this.review(item.id)
        return {
          applied: true,
          did: `canceled:  no longer applies (${OWENS_RUN})${note ? `:  "${PlanMarkup.squeeze(note)}"` : ""}`
        }
      case "notnow":
        this.defer(item.id)
        return { applied: true, did: `not now:  deferred (${OWENS_RUN})` }
      default:
        return { applied: false, left: `a test's answer?  ${result}` }
    }
  }

  /**
   * File test `item`'s failure as a new issue, "T3 failed:  <test title>";  its id (`i42`).
   * - its details:  the run and a link back to the test, Owen's note in his words, his screenshot (`shot`, from the
   *   epic page's folder:  the page's own relative path, so it shows in the page and its part alike)
   */
  private fileFailure(item: Element, { note, shot, at }: Pick<PlanMark, "note" | "shot" | "at">): string {
    const label = item.id.toUpperCase()
    const title = PlanItem.titleOf(item)
    const when = PlanTime.clockTime(at ? new Date(at) : this.now)
    const run = `<p>Owen's test run, ${PlanMarkup.text(when)}:  <a href="#${item.id}">${label}</a> failed.</p>`
    const said = note ? promptHTML(note).replace("<p>", "<p><b>Owen:</b>  ") : ""
    const alt = PlanMarkup.text(`Owen's screenshot of ${label}`)
    const image = shot ? `<p><img src="${PlanMarkup.text(shot)}" alt="${alt}"></p>` : ""
    return this.addItem("issue", `${label} failed:  ${title}`, { details: `${run}${said}${image}` })
  }

  /**
   * Answer question `item` with option `option` (`optionCards()`'s):  `decide()`, the option chosen (in card set
   * `choices`, by position:  none, the question's own);  reviewed.
   */
  answerWith(item: Element, option: OptionCard, choices?: number): void {
    this.decide(item.id, option.title, { option: option.letter, choices })
    this.review(item.id)
  }

  /**
   * Approve `item` (of `kind`, `open` or not) as it stands;  returns what it did, for the log line.
   * - an open judgement call:  closed (accepted);  an open test:  closed (it passed);  both reviewed
   * - anything else (an open caveat, issue or todo;  a closed item):  reviewed
   */
  private approve(item: Element, kind: string, open: boolean): string {
    if (open && (kind === "judgement" || kind === "test")) {
      this.setItem(item.id, "done")
      this.review(item.id)
      return `closed (${kind === "test" ? "passed" : "accepted"})`
    }
    this.review(item.id)
    return "reviewed"
  }

  /**
   * A pick (a Choose pill, I8):  option `pick` of `item`'s card set at position `choices`
   * (none:  its own) is the chosen one, `<epic-choices chosen>`, wherever the set sits:
   * its text, a reply, More Details.
   * - a question:  answered with it (`answerWith()`)
   * - any other kind:  APPROVED with it (`approve()`:  an open judgement call closed, accepted;  reviewed)
   * - either way, a Noted status card, `Chose B · <title>:  <what was recorded>;  <what happens next>` (Q19;
   *   Noted, not Done:  Owen, 2026-10-10), and the option in the log line
   *   - `outcome` (`choose()`'s, a choice settled in conversation):  in place of what happens next
   * - left for Claude when the item has no such set, or the set no such option
   */
  private pickOption(
    item: Element,
    kind: string,
    open: boolean,
    pick: string | undefined,
    choices: number | undefined,
    outcome?: string
  ): MarkResult {
    const set = PlanItem.choiceSet(item, choices)
    if (!set) return { applied: false, left: `no option cards${cardSetWords(choices)}:  can't pick ${pick}` }
    const option = PlanItem.optionsIn(set).find((card) => card.letter === pick)
    if (!option) return { applied: false, left: `no option ${pick}${cardSetWords(choices)}` }
    const where = set.closest(REPLY_TAG) ? " (a reply's options)" : set.closest(MORE_TAG) ? " (More Details')" : ""
    const picked = `picked ${option.letter}:  ${option.title}${where}`
    let did: string
    let recorded: string
    if (kind === "question") {
      this.answerWith(item, option, choices)
      did = picked
      recorded = "recorded as the answer"
    } else {
      this.chooseOption(item, option.letter, choices)
      const approved = this.approve(item, kind, open)
      did = `${picked};  approved:  ${approved}`
      // `closed (accepted)` -> `recorded, the call accepted`;  `closed (passed)` -> `recorded, the test passed`
      const closed = /\((\w+)\)/.exec(approved)?.[1]
      recorded = closed ? `recorded, the ${kind === "judgement" ? "call" : kind} ${closed}` : "recorded"
    }
    this.noteStatus(item.id, pickedWords(option, `${recorded};  ${outcome ?? this.nextStepWords()}`))
    return { applied: true, did }
  }

  /**
   * Option `letter` of item `id` chosen, as Owen settled it IN CONVERSATION (a reply, the chat), not with the page's
   * Choose pill:  `epic choose seo#J9 A "Owen, 2026-10-06:  'require the parens';  built"`.
   * Returns what it did (`picked A:  ...;  approved:  closed (accepted)`).
   * - exactly what the page's pick does (`pickOption()`, `applyMark()`'s):  that set's `chosen`;  a question answered
   *   with the option's title;  a judgement call (or test) closed, accepted;  an issue, caveat or todo reviewed
   *   (still open:  fixing it is its own work);  a Noted card;  reviewed as approved
   * - the set:  `set` (from 1), else the item's LATEST (Claude's last reply's, often), never one in its Original
   *   Discussion
   * - `outcome`:  on the Noted card in place of what happens next, and in the log line
   * - throws when the item has no such set, or the set no such option;  nothing is changed then
   */
  choose(id: string, letter: string, { outcome, set }: ChooseOptions = {}): string {
    const item = this.item(id)
    const label = item.id.toUpperCase()
    const sets = PlanItem.choiceSets(item)
    if (!sets.length) throw new PlanDocError(`${label} has no option cards to choose from`)
    const choices = set === undefined ? sets.length - 1 : Number(set) - 1
    if (!Number.isInteger(choices) || !sets[choices])
      throw new PlanDocError(`${label} has no card set ${set}:  it has ${sets.length} (--set 1 to ${sets.length})`)
    const open = item.getAttribute("status") === "open"
    const pick = String(letter).trim().toUpperCase()
    const result = this.pickOption(item, PlanItem.kindOf(item.id), open, pick, choices, outcome)
    if (!result.applied) throw new PlanDocError(`${label}:  ${result.left}`)
    this.log(`${label} ${result.did};  settled in conversation${outcome ? `:  ${outcome}` : ""}`)
    this.reviewedAs(item, "approve")
    return result.did
  }

  /**
   * Record Owen's pick from a mark Claude finished without applying it
   * (`inbox done | clear`:  a revisit carrying a pick, "pick B, but ...", talked over or answered by an agent):
   * that set's `chosen` (`chooseOption()`), so his pick stays marked on the page, and a Noted card.
   * Returns what it did, for the log;  `undefined` when there was nothing to record.
   * - only while the set has NO `chosen` yet:  a `decide --option` after the talk had the last word
   * - never answers or closes the item:  the talk may have changed what happens (Claude's `decide` does that)
   * - NEVER throws:  an item, set or option gone since leaves nothing to record
   */
  keepPick(id: string, { pick, choices }: { pick?: string; choices?: number }): string | undefined {
    const item = this.findItem(id)
    const set = item && pick ? PlanItem.choiceSet(item, choices) : null
    if (!item || !set || set.hasAttribute("chosen")) return undefined
    const option = PlanItem.optionsIn(set).find((card) => card.letter === pick)
    if (!option) return undefined
    this.chooseOption(item, option.letter, choices)
    this.noteStatus(item.id, pickedWords(option, `recorded after the talk;  ${this.nextStepWords()}`))
    return `picked ${option.letter}:  ${option.title} (kept from the revisit)`
  }

  /**
   * Replace item `id`'s details with `html`, or (`append`) add `html` to them;  returns its title.
   * - for Claude's background agents during `/epic review`:  fuller details (Add Details), or a reply to Owen's
   *   revisit note (an `<epic-reply>`, appended)
   * - its answer, Original Discussion and commits stay;  everything goes where the item's content model lists it:
   *   appended prose at the end of its text (before its Choices and answer), a reply after the other replies
   * - replacing NEVER drops the text it replaces (Owen, 2026-10-04):  its text and cards (Choices, More Details,
   *   replies) move into the item's Original Discussion (`keepOriginal()`);  appending moves nothing
   * - replacing an ANSWERED question's text:
   *   the option chosen before stays chosen when the new options still have its letter
   * - old shapes in `html` (an option grid, a `div.plan-reply`, a Net effect paragraph, a code accordion ...) become
   *   elements (`IncomingHtml`)
   * - a question's new text:  its lead, the question as now asked, in an `<epic-question>` (P14);
   *   the one it replaces goes into the Original Discussion with the rest of the old text
   * - stamped (`changed`) and flagged UPDATE
   */
  setDetails(id: string, html: string, { append = false }: { append?: boolean } = {}): string {
    const item = this.item(id)
    const nodes = this.incoming(html, { question: !append && QUESTION_ID.test(item.id) })
    if (!append) {
      const answered = item.querySelector(":scope > epic-answer")
      const chosen = answered ? PlanItem.choicesOf(item)?.getAttribute("chosen") : null
      const replaced = Array.from(item.childNodes).filter((node) => !isKept(node))
      for (const node of replaced) node.remove()
      this.keepOriginal(item, replaced)
      for (const node of nodes) Markup.place(item, node)
      if (chosen && PlanItem.optionsOf(item).some((option) => option.letter === chosen)) this.chooseOption(item, chosen)
    } else for (const node of nodes) Markup.place(item, node)
    this.stamp(item)
    this.markUpdate(item)
    return PlanItem.titleOf(item)

    /** What a rewrite leaves:  slotted children (the title, status cards), the answer, Original Discussion, commits. */
    function isKept(node: Node): boolean {
      return PlanMarkup.isElement(node) && (node.hasAttribute("slot") || KEPT_ON_REWRITE.includes(node.localName))
    }
  }

  /**
   * Add Details (`details --more`):  item `id`'s text stays on top (the element labels it "Original reply"), and
   * `html` goes under it in an `<epic-more>` card;  returns its title.
   * - a second Add Details replaces the card:  the old card's text moves into the Original Discussion
   *   (`keepOriginal()`), as a rewrite's does
   * - stamped (`changed`) and flagged UPDATE
   */
  addMore(id: string, html: string): string {
    const item = this.item(id)
    const old = item.querySelector(":scope > epic-more")
    if (old) {
      old.remove()
      this.keepOriginal(item, Array.from(old.childNodes))
    }
    Markup.place(item, this.make("epic-more", {}, this.incoming(html)))
    this.stamp(item)
    this.markUpdate(item)
    return PlanItem.titleOf(item)
  }

  /**
   * Condense item `id` after a lot of back and forth:  `html`, Claude's condensed text, REPLACES what the item shows,
   * and everything that was there moves into its Original Discussion, folded (`epic summarize`;  Owen, epic
   * `repo-split` J141:  "(re-)condense the text/conversations in that section ... It gets to be too much to read").
   * Returns its title, and how many blocks moved.
   * - moved, as ONE version (`keepOriginal()`, cards as the prose they said):  its text, every reply (Owen's and
   *   Claude's), More Details, Choices nobody picked, asides, code
   * - stays where it is:
   *   - the question as asked (`<epic-question>`), the answer, Choices with Owen's pick (`chosen`)
   *     - a picked set inside a moved reply is copied out to the item, so the pick still shows;  the reply keeps it too
   *   - Claude's status cards and anything else slotted, the Original Discussion itself, commits
   *   - Owen's marks:  the item's attributes (reviewed, calm, queued ...) are untouched
   * - `html` as `details` takes it (old shapes become elements:  `IncomingHtml`);  a question gets no new
   *   `<epic-question>`:  the one asked stays
   * - stamped (`changed`);  NOT flagged UPDATE:  the item says what it said, shorter
   * - throws for no text, or an item with nothing to condense (its text is the condensed text already)
   */
  condense(id: string, html: string): { title: string; moved: number } {
    const item = this.item(id)
    const nodes = this.incoming(html)
    if (!nodes.some((node) => PlanMarkup.isElement(node) || !PlanMarkup.isBlank(node)))
      throw new PlanDocError(`${id.toUpperCase()}:  the condensed text is empty`)
    const moved = Array.from(item.childNodes).filter((node) => !staysOnCondense(node))
    if (!moved.some((node) => PlanMarkup.isElement(node) || !PlanMarkup.isBlank(node)))
      throw new PlanDocError(`${id.toUpperCase()}:  nothing to condense`)
    const picked = moved.flatMap((node) =>
      PlanMarkup.isElement(node)
        ? Array.from(node.querySelectorAll("epic-choices[chosen]"), (set) => set.cloneNode(true))
        : []
    )
    for (const node of moved) node.remove()
    this.keepOriginal(item, moved)
    for (const node of [...nodes, ...picked]) Markup.place(item, node)
    this.stamp(item)
    return { title: PlanItem.titleOf(item), moved: moved.filter((node) => PlanMarkup.isElement(node)).length }

    /** What condensing leaves:  the rewrite's keepers, the question as asked, and Choices Owen picked from. */
    function staysOnCondense(node: Node): boolean {
      if (!PlanMarkup.isElement(node)) return false
      if (node.hasAttribute("slot") || KEPT_ON_REWRITE.includes(node.localName)) return true
      return node.localName === "epic-question" || (node.localName === "epic-choices" && node.hasAttribute("chosen"))
    }
  }

  /**
   * Keep Owen's note -- `mark.note`, a mark Claude took and is clearing (`inbox done | clear`) -- in item `id`, as his
   * own reply:  `<epic-reply from="Owen" at="2026-10-06 10:42" re="revisit soon"><p>note</p></epic-reply>`.
   * - placed before the first reply dated at or after the note (Claude's answer to it), else after the replies
   * - a note asking for MORE DETAILS (Add Details, revisit now) whose answer is the item's last card, its More Details
   *   (`<epic-more>`, no reply after it):  placed just BEFORE that card, as it came first;  the item draws it folded
   *   (Owen, 2026-10-24, epic `epic-engine` P27:  "my comment should be ABOVE your 'MORE DETAILS'")
   * - a reply from Owen with the same time and note already there:  nothing (`done` after `clear`, a retry)
   * - an Overview sub-section's (Q14):  the same words as a paragraph at its end (a section holds prose only)
   * - a phase's (epic `airplane` P2):  the same reply, in the phase, under its Updated lines (its content model);
   *   the summary's:  under the summary, `<epic-reply slot="notes">`
   * - an item is stamped (`changed`);  no UPDATE flag:  nothing about the item changed but the record
   */
  keepNote(id: string, { note, action, when, at, shot }: KeptNote): void {
    const stamp = PlanTime.clockTime(at ? new Date(at) : this.now)
    const how = action === "revisit" ? `revisit ${when === "now" ? "now" : "soon"}` : action
    const part = this.overviewPart(id)
    if (part) return this.keepNoteInPart(part, { note, stamp, how })
    const host = this.reviewPart(id)?.element ?? this.item(id)
    const replies = Array.from(host.querySelectorAll(":scope > epic-reply"))
    if (replies.some(isSame)) return
    const said = note ? `<p>${PlanMarkup.text(note)}</p>` : ""
    const image = shot ? `<p><img src="${PlanMarkup.text(shot)}" alt="Owen's screenshot"></p>` : ""
    const reply = this.make("epic-reply", { from: "Owen", at: stamp, re: how }, `${said}${image}`)
    if (host.localName === "epic-summary") reply.setAttribute("slot", NOTES_SLOT)
    const next = replies.find((each) => (each.getAttribute("at") ?? "") >= stamp)
    const answeredBy = PlanDoc.moreAnswering(host, action, when)
    if (answeredBy) answeredBy.before(reply)
    else if (next) next.before(reply)
    else Markup.place(host, reply)
    if (host.localName === "epic-item") this.stamp(host)

    /** Is `reply` this note's already:  Owen's, at the same time, saying the same? */
    function isSame(reply: Element): boolean {
      return (
        reply.getAttribute("from") === "Owen" &&
        reply.getAttribute("at") === stamp &&
        reply.querySelector(":scope > p")?.textContent === note
      )
    }
  }

  /**
   * Keep `nodes` -- item `item`'s text being replaced, already out of the doc --
   * in its Original Discussion (`<epic-original>`), made when it has none.
   * Returns `"added"`, `"unchanged"` (a version saying the same is there)
   * or `"empty"` (nothing but whitespace:  no version).
   * - a new `<epic-version>`:  undated while it's the first (as first written);
   *   else `as-of` (default now, `YYYY-MM-DD HH:MM`), in date order
   * - a version holds prose only:  cards become the prose they say (`PlanItem.asProse()`);
   *   ids inside are renamed (`PlanItem.stripIds()`)
   */
  keepOriginal(item: Element, nodes: Node[], { asOf }: OriginalOptions = {}): OriginalResult {
    if (!nodes.some((node) => node.nodeType === 1 || node.textContent?.trim())) return "empty"
    let original = item.querySelector(":scope > epic-original")
    const versions = Array.from(original?.querySelectorAll(":scope > epic-version") ?? [])
    const when = asOf ?? PlanTime.clockTime(this.now)
    const dated = versions.length > 0 || asOf !== undefined
    const version = this.make("epic-version", { asOf: dated ? when : undefined })
    version.append(...nodes.map((node) => PlanItem.asProse(node)))
    PlanMarkup.trimWhitespace(version)
    PlanItem.stripIds(version)
    if (versions.some((other) => PlanMarkup.bare(other.innerHTML) === PlanMarkup.bare(version.innerHTML)))
      return "unchanged"
    if (!original) {
      original = this.make("epic-original", {})
      Markup.place(item, original)
    }
    // oldest first:  the undated first version never sorts after a date
    const later = versions.find((other) => (other.getAttribute("as-of") ?? "") > when)
    if (later) later.before(version)
    else original.append(version)
    return "added"
  }

  /**
   * Put `html` -- item `id`'s earlier text, e.g. recovered from git -- into its Original Discussion, as
   * `keepOriginal()` keeps replaced text;  returns `"added"`, `"unchanged"` or `"empty"`.
   * - `asOf`:  when that text was replaced, `YYYY-MM-DD HH:MM`;  none:  as first written while the item has no
   *   Original Discussion, else now
   * - left out of `html`:  commits (the item keeps its own), and an answer that says what the item's says
   * - an Original Discussion inside `html` (`<epic-original>`, or the old markup's `.plan-original`, since text from
   *   git is in it):  each of its versions kept on its own, with its date
   * - NOT stamped or flagged UPDATE:  restoring history doesn't make an item recent
   */
  restoreOriginal(id: string, html: string, { asOf }: OriginalOptions = {}): OriginalResult {
    const item = this.item(id)
    const box = this.fragment(html)
    const answer = item.querySelector(":scope > epic-answer")
    let result: OriginalResult = "empty"
    for (const nested of Array.from(box.querySelectorAll("epic-original, .plan-original"))) {
      nested.remove()
      for (const version of nested.querySelectorAll("epic-version, .plan-version")) {
        version.querySelector(":scope > h5")?.remove()
        const when = version.getAttribute("as-of") ?? version.getAttribute("data-as-of") ?? undefined
        result = merge(result, this.keepOriginal(item, Array.from(version.childNodes), { asOf: when }))
      }
    }
    const shown = answer && PlanMarkup.bare(this.shownText(PlanItem.asProse(answer.cloneNode(true)) as Element))
    for (const node of Array.from(box.children)) {
      const sameAnswer =
        node.matches("epic-answer, .plan-answer-block") &&
        shown === PlanMarkup.bare(this.shownText(PlanItem.asProse(node) as Element))
      if (node.matches("epic-commit, .plan-commits") || sameAnswer) node.remove()
    }
    return merge(result, this.keepOriginal(item, Array.from(box.childNodes), { asOf }))

    /** The stronger of two results:  added, else unchanged, else empty. */
    function merge(a: OriginalResult, b: OriginalResult): OriginalResult {
      return [a, b].includes("added") ? "added" : [a, b].includes("unchanged") ? "unchanged" : "empty"
    }
  }

  ////////////////
  // ## Status cards
  ////////////////

  /**
   * Claude took Owen's mark on item `id` (or an Overview sub-section, `o3`;  a phase, `p3`;  the summary):
   * a new status card saying what it took the task to be (`reading`, HTML);  returns its title (P13).
   * - `<epic-status slot="status" state="underway" at="2026-10-08 14:20"><p>reading</p></epic-status>`, after its
   *   other status cards:  a later mark adds a new card, the old ones stay
   * - `state`:
   *   - `underway` (the default):  Claude is on it
   *   - `noted`, a card born NOTED (`at` alone):  Claude RECORDED what Owen chose, nothing more
   *     (a pick, a todo made or queued, a new item made:  `inbox apply`;  `noteStatus()`)
   *   - `done`, a card born done:  work Claude did, with no underway card first
   * - `reading`:  inline HTML (wrapped in a `<p>`) or blocks (`<p>`, `<ul>` ...);
   *   plain text goes as it is (`&lt;` for a `<`)
   * - slotted, so never ordered (`Markup.place()`):  appended;  drawn under Owen's marked note, above the note box
   * - an item is stamped (`changed`), not flagged UPDATE:  a record of a mark, not a change to the item
   * - throws for an id the doc doesn't have, or a reading with no text
   */
  addStatus(id: string, reading: string, { state = "underway" }: { state?: StatusState } = {}): string {
    const host = this.statusHost(id)
    const blocks = this.statusBlocks(reading)
    if (!blocks.length) throw new PlanDocError(`${id.toUpperCase()}:  a status card needs a reading`)
    const at = PlanTime.clockTime(this.now)
    const card = this.make("epic-status", { state, at }, blocks)
    card.setAttribute("slot", STATUS_SLOT)
    Markup.place(host, card)
    if (host.localName === "epic-item") this.stamp(host)
    return PlanItem.titleOf(host)
  }

  /**
   * Item `id`'s work is finished (or an Overview sub-section's ...):  its LATEST underway status card turns
   * `done` (work was done:  an answer written, code changed, a phase built), or `noted` (Claude only RECORDED what
   * Owen chose), stamped `done-at`, its reading kept.  Returns its title.
   * - `summary` (HTML, as `addStatus()`'s reading) goes under the reading, `slot="summary"`,
   *   when there's something worth saying
   * - throws when it has no underway card:  `addStatus()` first, or a card born noted (`noteStatus()`)
   */
  finishStatus(id: string, summary?: string, { state = "done" }: { state?: FinishedState } = {}): string {
    const host = this.statusHost(id)
    const card = this.underwayCard(host)
    if (!card)
      throw new PlanDocError(
        `${id.toUpperCase()} has no underway status card:  \`epic update <name>#${id} underway "<reading>"\` first ` +
          `(or \`epic update <name>#${id} noted "<what was recorded>"\` when you only recorded Owen's choice)`
      )
    Markup.set<"epic-status">(card, { state, doneAt: PlanTime.clockTime(this.now) })
    for (const block of this.statusBlocks(summary ?? "")) {
      block.setAttribute("slot", SUMMARY_SLOT)
      card.append(block)
    }
    if (host.localName === "epic-item") this.stamp(host)
    return PlanItem.titleOf(host)
  }

  /**
   * Claude RECORDED what Owen chose on item `id` (or an Overview sub-section, a phase, the summary):
   * a Noted card, `what` (HTML, one line) saying what was recorded and what happens next.  Returns its title.
   * - its latest underway card, if any, turns `noted` (`finishStatus()`), `what` its summary:
   *   the session took the mark, and recording it was all there was to do
   * - else a card born noted (`addStatus()`)
   * - NOT for work done (an answer written, code changed):  that's `finishStatus()`'s Done
   */
  noteStatus(id: string, what: string): string {
    if (this.underwayCard(this.statusHost(id))) return this.finishStatus(id, what, { state: "noted" })
    return this.addStatus(id, what, { state: "noted" })
  }

  /**
   * What happens next to something Owen chose, for a Noted card:
   * `waiting for the next phase, P9 · Name`;  no phase to do:  `waiting for a phase to take it up`.
   */
  nextStepWords(): string {
    const phase = this.phases.find((each) => each.status === "todo")
    return phase ? `waiting for the next phase, P${phase.number} · ${phase.name}` : "waiting for a phase to take it up"
  }

  /** `host`'s latest underway status card, if any. */
  private underwayCard(host: Element): Element | undefined {
    return Array.from(host.querySelectorAll(UNDERWAY_CARD)).at(-1)
  }

  /**
   * What takes status cards:  the Overview sub-section, phase or summary `id` names (`reviewPart()`), else its item;
   * throws when there's neither.
   */
  private statusHost(id: string): Element {
    return this.reviewPart(id)?.element ?? this.item(id)
  }

  /**
   * `html` (a status card's reading or summary) as block elements of this doc:  blocks (`<p>`, `<ul>` ...) as they
   * are, each run of inline content between them in a `<p>`.  None for blank `html`.
   */
  private statusBlocks(html: string): Element[] {
    const blocks: Element[] = []
    let paragraph: Element | undefined
    for (const node of this.incoming(html)) {
      if (PlanMarkup.isElement(node) && STATUS_BLOCKS.test(node.localName)) {
        blocks.push(node)
        paragraph = undefined
      } else if (!PlanMarkup.isBlank(node) || paragraph) {
        if (!paragraph) blocks.push((paragraph = this.document.createElement("p")))
        paragraph.append(node)
      }
    }
    for (const block of blocks) PlanMarkup.trimWhitespace(block)
    return blocks
  }

  ////////////////
  // ## States
  ////////////////

  /**
   * The whole-doc pass every edit ends with (the command line's `edit()`):  one item's change can change others'
   * standing, so everything is worked out again;  returns how many things it changed.
   * - the page's `recent-since`:  from `recentSince` when it was passed in
   * - each item's `state` (`itemState()`):  what the page colours its id chip by
   * - each phase's "To review" field (`updateToReview()`)
   * - how many plan changes each phase holds (`updateChangeCounts()`)
   * - the change marks:  new ones given their id, time and answer, each host's `to-accept` (`updateChanges()`)
   */
  updateStates(): number {
    let changed = 0
    const page = this.page
    if (this.recentSince !== undefined) {
      const before = page.getAttribute("recent-since")
      Markup.set(page, { recentSince: this.recentSince ?? undefined })
      if (before !== page.getAttribute("recent-since")) changed++
    }
    // first:  a new mark in a phase's text marks its item handled, which its state reads
    changed += this.updateChanges()
    for (const item of this.allItems) {
      const state = this.itemState(item)
      if (item.getAttribute("state") === state) continue
      Markup.set<"epic-item">(item, { state })
      changed++
    }
    for (const phase of this.phaseElements) if (this.updateToReview(phase)) changed++
    if (this.updateChangeCounts()) changed++
    return changed
  }

  /**
   * Phase `phase`'s "To review" field (`<epic-field name="to-review">`), last:  the items added while it was active
   * (`phase="N"`) still open and not reviewed, not under way, in page order, as links;  none:  no field.  Changed?
   */
  updateToReview(phase: Element): boolean {
    const n = PhaseIds.numberOf(phase)
    const old = phase.querySelector(':scope > epic-field[name="to-review"]')
    const items = this.allItems.filter((item) => {
      const facts = this.facts(item)
      if (facts.phase !== n || CLOSED.has(facts.status) || OLD_DECISION.test(facts.id)) return false
      return facts.reviewed === undefined && facts.queued === undefined && !facts.working && !facts.underway
    })
    if (!items.length) {
      old?.remove()
      return Boolean(old)
    }
    const html = items.map((item) => `<a href="#${item.id}">${item.id.toUpperCase()}</a>`).join(", ")
    // as oxfmt left it:  only the whitespace may differ
    if (old && PlanMarkup.squeeze(old.innerHTML) === PlanMarkup.squeeze(html)) return false
    this.setField(phase, "to-review", html)
    return true
  }

  ////////////////
  // ## Commits
  ////////////////

  /**
   * List commit `sha` (full) under phase `phase` or item `item` (an id), with `sentence`:
   * an `<epic-commit sha>`, oldest first;  replaces the one already there for it.  Returns `"added"` or `"replaced"`.
   * - `base`:  the repo's GitHub page:  the page's `repo`, through which every commit links (`null`:  left as is)
   * - a phase's go after its Done (else Goal), before Files;  an item's at the end
   */
  addCommit(
    { phase, item }: CommitTarget,
    sha: string,
    sentence: string,
    { base = null, repo = null }: CommitOptions = {}
  ): "added" | "replaced" {
    const host = phase !== undefined ? this.phase(phase) : this.item(item!)
    if (base && this.page.getAttribute("repo") !== base) Markup.set(this.page, { repo: base })
    // a child repo's commit links to its own repo;  the page's links the rest
    const own = repo && repo !== this.page.getAttribute("repo") ? repo : undefined
    const entry = this.make("epic-commit", { sha, repo: own }, PlanMarkup.text(sentence))
    const old = PlanCommits.findCommit(host, sha)
    if (old) {
      old.replaceWith(entry)
      return "replaced"
    }
    Markup.place(host, entry)
    return "added"
  }

  /** Is commit `sha` listed under phase `phase` / item `item` already? */
  hasCommit({ phase, item }: CommitTarget, sha: string): boolean {
    return Boolean(PlanCommits.findCommit(phase !== undefined ? this.phase(phase) : this.item(item!), sha))
  }

  /**
   * Fill in commits from the doc's git history:  `log` is `{ sha, subject, repo }`s, newest first (`git log`);
   * returns what it added, `{ sha, phase }` / `{ sha, item }`, oldest first.
   * - subjects `PlanCommits.parseCommitSubject()` reads:
   *   phase commits (`P3:  Name -- summary`) and item fixes (`Fix I3:  ...`)
   * - only phases and items the doc has;  a commit already listed there is skipped, so it can run again
   * - a commit naming another epic first (`other-epic P7:`) is left out (`epic`)
   * - a phase by its number as people say it (`P11.1:` too, epic `epic-engine` P39)
   * - a phase by its NAME, not its number alone (epic `epic-engine` r17):  phases get renumbered
   *   - `P27:  Pile Drawing` is P27 only while P27 is called Pile Drawing
   *   - a title naming ANOTHER phase is that phase's, from before a renumbering:  left out
   *     (`outline-spell P27:  Doc Review`, once P27 became Pile Drawing)
   *   - a title naming no phase (`P1 follow-up:  more`) goes by its number
   */
  backfillCommits(log: Iterable<CommitLogEntry>, { base = null, epic }: BackfillOptions = {}): BackfilledCommit[] {
    const added: BackfilledCommit[] = []
    for (const { sha, subject, repo } of Array.from(log).reverse()) {
      const parsed = PlanCommits.parseCommitSubject(subject)
      if (!parsed || (epic && parsed.epic && parsed.epic !== epic)) continue
      const targets: CommitTarget[] = [
        ...this.phasesNamedBy(parsed).map((n) => ({ phase: n })),
        ...parsed.items.filter((id) => this.hasItem(id)).map((id) => ({ item: id }))
      ]
      for (const target of targets) {
        if (this.hasCommit(target, sha)) continue
        this.addCommit(target, sha, parsed.sentence, { base, repo })
        added.push({ sha, ...target })
      }
    }
    return added
  }

  /**
   * The phases a commit is for (`backfillCommits()`):  each number it names whose phase its title names, or whose
   * title names no other phase.
   */
  private phasesNamedBy({ phases, title }: ParsedCommit): number[] {
    const all = this.phases
    return phases.flatMap((number) => {
      const phase = all.find((each) => each.number === number)
      if (!phase) return []
      if (PlanCommits.titleNames(title, phase.name)) return [phase.n]
      const other = all.some((each) => each.name !== phase.name && PlanCommits.titleNames(title, each.name))
      return other ? [] : [phase.n]
    })
  }

  ////////////////
  // ## Log
  ////////////////

  /** Add a line to the log:  an `<epic-event at>`, local time with its offset (`2026-10-06T08:12-04:00`). */
  log(line: string): void {
    this.section("log").append(this.make("epic-event", { at: PlanTime.isoMinutes(this.now) }, PlanMarkup.text(line)))
  }

  ////////////////
  // ## Future epics
  ////////////////

  /**
   * Make this new doc a future epic (`/epic future <name>`, epic `epic-future`):
   * `<epic-page future>`, no branch or worktree yet.  The element draws its notice and its FUTURE label.
   */
  makeFuture(): void {
    Markup.set(this.page, { future: true, branch: undefined, worktree: undefined })
  }

  /**
   * Make this epic standing (`on`), or an ordinary one again:  `<epic-page standing>` (epic `epic-workflow`).
   * - standing:  open for good;  each phase merges into `main` on its own, and every phase done is NOT done
   *   (the Epics list page, `/epics` and its step label say STANDING, not DONE)
   * - SIDE EFFECT:  logs it
   */
  setStanding(on: boolean): void {
    Markup.set(this.page, { standing: on })
    this.log(on ? "standing:  open for good, each phase merging on its own" : "no longer standing")
  }

  /**
   * Put the page in `stage` (epic `epic-engine` P29):  `<epic-page stage>`, which decides what the page shows;
   * returns whether it changed.
   * - `building` is written too, not dropped:  a page that has been through its stages says so
   * - SIDE EFFECT:  logs it (`stage:  phases (was overview)`)
   */
  setStage(stage: PageStage): boolean {
    const was = this.stage
    if (was === stage && this.page.hasAttribute("stage")) return false
    Markup.set(this.page, { stage })
    this.log(`stage:  ${stage} (was ${was})`)
    return true
  }

  /**
   * The phase at place `n` DEFERRED (its Defer pill while the phases are agreed, epic `epic-engine` P29):
   * moved after every other phase, still to do;  its number changes, its id never.
   * - returns its new place
   */
  deferPhase(n: number): number {
    return this.movePhase(n, this.phaseElements.length)
  }

  /**
   * Move the phase at place `from` to place `to` (epic `epic-engine` P34:  Owen drags it there, or `epic move`);
   * returns `to`.
   * - only phases still TO DO move, and only among them:  every phase from `from` to `to` must be to do (a done or
   *   active one keeps its number:  its commits and log say it)
   * - its id stays;  the NUMBERS follow, all at once (`renumberAll()`):  items' `phase`, Updated lines' `of`, the
   *   `P5` in links' words, and every `P5 · <its name>` in the page's words and attributes (`relabelPhaseNames()`)
   * - a decimal phase (P11.1, P39) stays a decimal, of the whole-numbered phase before its new place
   * - SIDE EFFECT:  logs it
   * - throws for a place out of range, or a started phase in the way
   */
  movePhase(from: number, to: number): number {
    const phases = this.phases
    for (const n of [from, to])
      if (!Number.isInteger(n) || n < 1 || n > phases.length)
        throw new PlanDocError(`move ${from} to ${to}:  no place ${n} (1-${phases.length})`)
    if (from === to) return to
    const [low, high] = from < to ? [from, to] : [to, from]
    const started = phases.find((phase) => phase.n >= low && phase.n <= high && phase.status !== "todo")
    const said = `move P${phases[from - 1]!.number} to P${phases[to - 1]!.number}`
    if (started) throw new PlanDocError(`${said}:  P${started.number} has started;  only to-do phases move`)
    const before = PhaseNumbers.snapshot(this.document)
    const moving = this.phase(from)
    const name = PlanItem.titleOf(moving)
    if (from < to) this.phase(to).after(moving)
    else this.phase(to).before(moving)
    this.renumberAll(before)
    this.log(`P${phases[from - 1]!.number} ${name}:  moved to ${PhaseIds.labelOf(moving)}`)
    return to
  }

  /**
   * After phases moved:  everything that names one by NUMBER follows, from `before` (`PhaseNumbers.snapshot()`:
   * each phase's id => its number then), ALL AT ONCE, so a number another phase takes is never renamed twice.
   * - first, a decimal phase out of place takes the decimal that fits where it is now (`PhaseNumbers.fixDecimals()`)
   * - items' and updates' `phase`, Updated lines' `of`, the `P5` in the words of links to a phase (`href="#id"`):
   *   `PhaseNumbers.follow()`
   * - then the `P5 · <name>` text everywhere (`relabelPhaseNames()`)
   */
  private renumberAll(before: ReadonlyMap<string, string>): void {
    PhaseNumbers.fixDecimals(this.document)
    if (PhaseNumbers.follow(this.document, before)) this.relabelPhaseNames()
  }

  /**
   * Every `P8 · <name>` naming a phase by its number AND its name, in the page's words and attributes (a queued
   * item's `work`, a Noted card's "Queued for P8 · ...", an Update block's `summary` or prose), said with the phase's
   * number NOW (epic `epic-engine` r21;  Owen, 2026-10-24:  keep renumbering, and fix the text that names numbers).
   * - by name, so it's idempotent, and mends text left stale before
   * - a bare `P8` with no name is left:  it may mean anything
   * - history keeps its numbers:  the log, an Original Discussion
   * - returns how many it changed
   */
  relabelPhaseNames(): number {
    const labels = this.phaseElements.map((element) => ({
      name: PlanItem.titleOf(element),
      n: PhaseIds.numberOf(element)
    }))
    // the longest first:  `Event Model` before `Event`
    const named = labels.filter((label) => label.name).sort((a, b) => b.name.length - a.name.length)
    if (!named.length) return 0
    const pattern = new RegExp(
      `\\bP\\d+(?:\\.\\d+)?( · (?:${named.map((label) => escapeRegExp(label.name)).join("|")}))(?![\\w-])`,
      "g"
    )
    const byName = new Map(named.map((label) => [label.name, label.n]))
    const relabel = (text: string) =>
      text.replace(pattern, (whole: string, rest: string) => `P${byName.get(rest.slice(3))}${rest}`)
    let changed = 0
    const walker = this.document.createTreeWalker(this.page, 4 /* NodeFilter.SHOW_TEXT */)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.parentElement?.closest(HISTORY)) continue
      const text = node.nodeValue ?? ""
      const next = relabel(text)
      if (next !== text) {
        node.nodeValue = next
        changed++
      }
    }
    for (const element of this.page.querySelectorAll("[work], [summary]")) {
      if (element.closest(HISTORY)) continue
      for (const name of ["work", "summary"]) {
        const value = element.getAttribute(name)
        if (!value) continue
        const next = relabel(value)
        if (next === value) continue
        element.setAttribute(name, next)
        changed++
      }
    }
    return changed
  }

  /**
   * Name saga `saga` as the one this epic serves, or none (`null`):  `<epic-page saga="<id>">` (epic `epic-workflow`
   * P15);  returns whether it changed.
   * - which ids are sagas is the caller's to check (`Sagas`, `sagas/sagas.json5`):  this doc doesn't know the list
   * - SIDE EFFECT:  logs it, when it changed
   */
  setSaga(saga: string | null): boolean {
    const was = this.saga
    if (was === saga) return false
    Markup.set(this.page, { saga: saga ?? undefined })
    this.log(saga ? `saga:  ${saga}${was ? ` (was ${was})` : ""}` : `no saga (was ${was})`)
    return true
  }

  /**
   * A future epic, planned at last (`/epic <name>` reusing it):  an ordinary epic, on `branch` in `worktree`.
   * Returns whether it was a future one.
   */
  promote({ branch, worktree }: { branch: string | null; worktree: string | null }): boolean {
    if (!this.future) return false
    Markup.set(this.page, { future: false })
    this.setMeta({ branch, worktree })
    this.log("planned:  no longer a future epic")
    return true
  }

  /** The page's branch and worktree (`null`:  none yet, a future epic). */
  setMeta({ branch, worktree }: { branch: string | null; worktree: string | null }): void {
    Markup.set(this.page, { branch: branch ?? undefined, worktree: worktree ?? undefined })
  }

  ////////////////
  // ## Bedtime
  ////////////////

  /** A `/bedtime` run starts:  bedtime mode on, `phases` (`P3-P6`) what it runs. */
  startBedtime(phases: string): void {
    Markup.set(this.page, { bedtime: phases })
  }

  /** The run is over:  bedtime mode off;  was it on? */
  finishBedtime(): boolean {
    const was = this.bedtime
    Markup.set(this.page, { bedtime: undefined })
    return was
  }

  ////////////////
  // ## Prompt
  ////////////////

  /**
   * Set the prompt that started the plan:  `<epic-prompt>` in the Overview (drawn folded, "Kickoff prompt", P14),
   * after its summary, one `<p>` per paragraph (blank lines split them, single newlines become `<br>`).
   * Replaces any earlier one, an older doc's `<blockquote slot="prompt">` too;  `""` removes it.
   */
  setPrompt(prompt: string | null | undefined): void {
    const overview = this.overview
    const old = overview.querySelector(`:scope > epic-prompt, :scope > [slot="prompt"]`)
    const html = promptHTML(prompt)
    if (!html) {
      old?.remove()
      return
    }
    const made = this.make("epic-prompt", {}, html)
    if (old) old.replaceWith(made)
    else Markup.place(overview, made)
  }

  ////////////////
  // ## Checking
  ////////////////

  /**
   * Structural problems, as text:  duplicate ids, `#id` links to nowhere (a link in an Original Discussion is
   * history:  skipped), phases without a valid status, change marks naming no item or not stamped
   * (`changeProblems()`), and what `Markup.validate()` finds.
   */
  check(): string[] {
    const problems: string[] = []
    const seen = new Map<string, number>()
    for (const el of this.document.querySelectorAll("[id]")) seen.set(el.id, (seen.get(el.id) ?? 0) + 1)
    for (const [id, count] of seen) if (count > 1) problems.push(`id "${id}" used ${count} times`)
    for (const a of PlanItem.current(this.document.querySelectorAll('a[href^="#"]'))) {
      const id = a.getAttribute("href")!.slice(1)
      if (id && !seen.has(id)) problems.push(`link to missing #${id} ("${(a.textContent ?? "").trim()}")`)
    }
    for (const phase of this.phases)
      if (!isPhaseStatus(phase.status)) problems.push(`P${phase.number} has status "${phase.status}"`)
    problems.push(...this.changeProblems())
    for (const problem of Markup.validate(this.document)) {
      // duplicate ids are counted above, once each
      if (problem.kind !== "duplicate id") problems.push(`${problem.kind}:  ${problem.where} ${problem.message}`)
    }
    return problems
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** A new `<tag>` of the doc, through `Markup.element()`:  the definitions check its data. */
  make<T extends EpicTag>(tag: T, data: EpicData<T>, children?: MarkupContent): Element {
    return Markup.element(this.document, tag, data, children)
  }

  /**
   * Set `phase`'s field `name` (`<epic-field name>`) to `html`:  replaces its children, or a new field in its place;
   * `""` removes it.
   */
  private setField(phase: Element, name: EpicData<"epic-field">["name"], html: string): void {
    const old = phase.querySelector(`:scope > epic-field[name="${name}"]`)
    if (html === "") {
      old?.remove()
      return
    }
    if (old) {
      old.replaceChildren()
      Markup.append(old, this.incoming(html))
      return
    }
    Markup.place(phase, this.make("epic-field", { name }, this.incoming(html)))
  }

  /**
   * `html` (a command's) as nodes of this doc, old shapes turned into elements (`IncomingHtml`).
   * - `question`:  it's a question's text:  its lead, the question as asked, goes in an `<epic-question>`
   */
  private incoming(html: string | undefined, { question = false }: { question?: boolean } = {}): Node[] {
    if (!html?.trim()) return []
    const nodes = IncomingHtml.nodes(this.document, html)
    return question ? IncomingHtml.asQuestion(this.document, nodes) : nodes
  }

  /** `html` parsed into a `<div>` of this doc, out of it. */
  private fragment(html: string): Element {
    const box = this.document.createElement("div")
    box.innerHTML = html
    return box
  }

  /**
   * A title given as HTML:
   * `{ title }` when it's plain text (entities decoded), else `{ slot }`, a `<span slot="title">` holding it.
   */
  private titleFromHTML(html: string): { title?: string; slot?: Element } {
    const box = this.fragment(html)
    if (!box.children.length) return { title: PlanMarkup.squeeze(box.textContent ?? "") }
    const slot = this.document.createElement("span")
    slot.setAttribute("slot", "title")
    slot.append(...Array.from(box.childNodes))
    return { slot }
  }

  /** `element`'s `slot="title"` child:  made from its `title` (which goes) when it has none. */
  private titleSlot(element: Element): Element {
    const found = element.querySelector(':scope > [slot="title"]')
    if (found) return found
    const slot = this.document.createElement("span")
    slot.setAttribute("slot", "title")
    slot.textContent = element.getAttribute("title") ?? ""
    element.removeAttribute("title")
    element.prepend(slot)
    return slot
  }

  /** A title slot holding plain text only, back into its parent's `title`. */
  private untitleSlot(slot: Element): void {
    const host = slot.parentElement!
    host.setAttribute("title", PlanMarkup.squeeze(slot.textContent ?? ""))
    slot.remove()
    Markup.set(host, {})
  }

  /**
   * `element`'s text as a reader sees it:  its own text, the headings its elements draw too (a card's, a Net effect's
   * label ...:  `PlanItem.asProse()`, plain).
   */
  private shownText(element: Element): string {
    const copy = element.cloneNode(true) as Element
    const prose = this.document.createElement("div")
    for (const node of Array.from(copy.childNodes)) prose.append(PlanItem.asProse(node, PLAIN))
    return prose.textContent ?? ""
  }

  /** The Overview sub-section `id` names (`o3`, any case), or `null`. */
  private overviewPart(id: string): Element | null {
    const key = String(id).toLowerCase()
    if (!OVERVIEW_PART_ID.test(key)) return null
    const part = this.document.getElementById(key)
    return part?.localName === "epic-section" && part.getAttribute("kind") === "overview-part" ? part : null
  }

  /**
   * What takes review notes as an item does, but isn't one, by its inbox id:  an Overview sub-section (`o3`, Q14), a
   * phase (`p3`) or the summary (`summary`:  it has no id of its own;  epic `airplane` P2);  `null` for anything else.
   * - with how a todo or a note names it:  `label` (`P3`, `the summary`), `what` it is in words, `title`,
   *   and `link` (its `#id`;  the summary's is the Overview's)
   */
  private reviewPart(id: string): ReviewPart | null {
    const key = String(id).toLowerCase()
    const part = this.overviewPart(key)
    if (part) {
      const title = PlanItem.titleOf(part)
      return {
        id: key,
        element: part,
        kind: "overview",
        label: key.toUpperCase(),
        link: key,
        what: "overview section",
        title
      }
    }
    if (key === SUMMARY_ID) {
      const summary = this.document.querySelector("epic-page > epic-overview > epic-summary")
      if (!summary) return null
      const label = "the summary"
      return { id: key, element: summary, kind: "summary", label, link: OVERVIEW_ID, what: "Overview", title: label }
    }
    const phase = PhaseIds.isPhaseId(key) ? this.phaseById(key) : undefined
    if (!phase) return null
    const label = PhaseIds.labelOf(phase)
    const title = `${label} · ${PlanItem.titleOf(phase)}`
    return { id: key, element: phase, kind: "phase", label, link: phase.id, what: "phase", title }
  }

  /**
   * A mark on what takes notes but isn't an item
   * (`reviewPart()`:  an Overview sub-section, Q14;  a phase or the summary, epic `airplane` P2):
   * - approve is noted (none of them has review marks:  the log says it)
   * - skip (the note box's x, Owen, 2026-10-09) too:  nothing to do;  its note kept (`keepNote()`), when typed
   * - todo makes a todo linking back, and a Noted status card on it
   * - pick isn't for them
   * - revisit and details are Claude's, as for an item
   */
  private applyToPart(part: ReviewPart, { action, pick, when, note, at, to }: PlanMark): MarkResult {
    switch (action) {
      case "approve":
        // a phase whose build plan waits:  Accept plan (P33)
        if (part.kind === "phase" && part.element.getAttribute("plan") === "waiting") {
          this.acceptPlan(part.element)
          return { applied: true, did: "plan accepted:  build it" }
        }
        return { applied: true, did: "approved" }
      case "skip":
        if (note) this.keepNote(part.id, { note, action: "skip", at })
        return { applied: true, did: `skipped:  nothing to do${note ? " (his note kept)" : ""}` }
      case "todo": {
        const todo = this.followUp(part, note)
        this.noteStatus(part.id, filedTodo(todo))
        return { applied: true, did: `to caveat ${todo.toUpperCase()}` }
      }
      case "pick":
        return { applied: false, left: `${part.label} (${part.what}):  can't pick ${pick}` }
      case "move": {
        if (part.kind !== "phase" || !to)
          return { applied: false, left: `${part.label} (${part.what}):  only a phase moves` }
        const from = this.phaseElements.indexOf(part.element) + 1
        try {
          this.movePhase(from, Math.min(to, this.phaseElements.length))
        } catch (error) {
          if (!(error instanceof PlanDocError)) throw error
          return { applied: false, gone: true, left: `${part.label}:  ${error.message}:  dropped` }
        }
        return { applied: true, did: `moved:  now ${PhaseIds.labelOf(part.element)}` }
      }
      case "defer": {
        if (part.kind !== "phase") return { applied: false, left: `${part.label} (${part.what}):  only a phase defers` }
        this.deferPhase(this.phaseElements.indexOf(part.element) + 1)
        return {
          applied: true,
          did: `deferred:  after the other phases, now ${PhaseIds.labelOf(part.element)}, still to do`
        }
      }
      default:
        return this.leftForClaude({ action, pick, when, note }, () => undefined)
    }
  }

  /**
   * The page header's stage button, Accept Overview or Accept Phases (epic `epic-engine` P29):
   * the page moves on from the stage the mark ended (`stage`) to the next (`PageStages.next()`).
   * - the page in another stage by now (moved by hand, or the mark sent twice):  dropped (`gone`), nothing changed
   * - Accept Phases accepts every build plan waiting too (epic `epic-engine` I125;  Owen, 2026-10-25:  "the mode where
   *   I 'accept the phase' twice (once for symptom/goals, once for plan) is slowing things down.  Collapse them into
   *   one"):  the plans are written with the phases, so ONE press starts the build
   * - logs it (`STAGE accepted overview:  stage phases, write the phases`):  what the session does next
   */
  private applyAccept({ stage }: PlanMark): MarkResult {
    const now = this.stage
    if (!PageStages.isStage(stage) || stage !== now)
      return { applied: false, gone: true, left: `accepts ${stage}, but the page is in ${now}:  dropped` }
    const next = PageStages.next(stage)
    // its own log line below, not `setStage()`'s
    Markup.set(this.page, { stage: next })
    const plans =
      next === "phases" ? [] : this.phaseElements.filter((phase) => phase.getAttribute("plan") === "waiting")
    for (const phase of plans) this.acceptPlan(phase)
    const then =
      next === "phases"
        ? "write the phases and their build plans"
        : `start building${plans.length ? ` (${plans.length} build plan${plans.length === 1 ? "" : "s"} accepted)` : ""}`
    const did = `accepted ${stage}:  stage ${next}, ${then}`
    this.log(`${STAGE_ID.toUpperCase()} ${did}`)
    return { applied: true, did }
  }

  /**
   * A change mark's button (`<epic-change id="ch3">`, epic `epic-engine` P30;  Q13, B), as Owen pressed it:
   * - `accept`:  the change stands.  It's `accepted` now:  the orange goes, the words and the Q&A chip stay for good.
   * - `reopen`:  the question it names opens again (red, Owen's to talk over), and the mark stays orange until
   *   it's answered again and the words rewritten
   *   - no longer handled in a phase (`handled`, P31):  it's back in the lists, to be talked over
   * - the mark gone from the doc (rewritten meanwhile):  dropped (`gone`);  accepted already:  nothing more to do
   * - logs it (`CH3 accepted:  Q13's change stands`)
   */
  private applyChange({ id, action }: PlanMark): MarkResult {
    const change = this.findChange(id)
    const label = String(id).toUpperCase()
    if (!change) return { applied: false, gone: true, left: `${label}:  no such change any more:  dropped` }
    const item = (change.getAttribute("item") ?? "").toUpperCase()
    if (action === "accept") {
      if (change.hasAttribute("accepted")) return { applied: true, did: "accepted already" }
      Markup.set<"epic-change">(change, { accepted: PlanTime.clockTime(this.now) })
      const did = `accepted:  ${item}'s change stands`
      this.log(`${label} ${did}`)
      return { applied: true, did }
    }
    if (action === "reopen") {
      const question = this.findItem(item)
      if (!question) return { applied: false, left: `${label}:  its question ${item} isn't on the page` }
      const was = question.getAttribute("status") ?? "open"
      if (question.hasAttribute("handled")) {
        Markup.set<"epic-item">(question, { handled: undefined })
        this.stamp(question)
      }
      if (was !== "open") {
        // open, red, Owen's to answer again:  `setItem()` would keep an answered question decided.
        // Its answer stays, readable, until he answers again
        Markup.set<"epic-item">(question, { status: "open" })
        if (QUESTION_ID.test(question.id)) this.placeQuestion(question)
        this.stamp(question)
        this.markUpdate(question)
      }
      const did = `reopened ${item}${was === "open" ? " (open already)" : `, was ${was}`};  the change waits`
      this.log(`${label} ${did}`)
      return { applied: true, did }
    }
    return { applied: false, left: `${label}:  a change takes Accept or Reopen, not ${action}` }
  }

  ////////////////
  // ## Change marks (epic `epic-engine` P30)
  ////////////////

  /**
   * Is change mark `change` NEW:  stamped less than `CHANGE_NEW_DAYS` ago, and not `accepted` (a page from before
   * changes needed no approval)?  As the page draws it:  orange while new (`<epic-change>`'s `isQuiet`).
   */
  isNewChange(change: Element): boolean {
    if (change.hasAttribute("accepted")) return false
    const at = Date.parse((change.getAttribute("at") ?? "").replace(" ", "T"))
    return !Number.isFinite(at) || this.now.getTime() - at < CHANGE_NEW_DAYS * 24 * 60 * 60 * 1000
  }

  /** Every change mark in the doc, `<epic-change>`, in page order. */
  get changes(): Element[] {
    return Array.from(this.document.querySelectorAll(CHANGE_TAG))
  }

  /** The change mark with id `id` (`ch3`, any case), or `null`. */
  findChange(id: string): Element | null {
    const key = String(id).toLowerCase()
    if (!CHANGE_ID.test(key)) return null
    const element = this.document.getElementById(key)
    return element?.localName === CHANGE_TAG ? element : null
  }

  /**
   * Bring the change marks up to date, as every edit does (`updateStates()`);  returns how many things changed.
   * - a mark Claude wrote by hand (`<epic-change item="q13">`) is STAMPED:
   *   - `id`:  the next free `ch<N>`, never one used before in the doc (`CHANGE_ID`:  its inbox key)
   *   - `at`:  now
   *   - `answer`:  its question's answer, in short (its `<epic-answer title>`), once it has one:  the chip shows it
   *     months later, whatever the question says by then
   *   - inside a PHASE's text, the item it names is HANDLED IN that phase (`handled`, epic `epic-engine` P31;
   *     Q17, A):  grey, quiet in the lists, its line linking the phase;  logged.  Only when first stamped:  a Reopen
   *     takes it off (`applyChange()`), and the mark rewritten after the next answer puts it back
   * - each body host (an Overview sub-section, a phase, an item, the log) lists the marks inside it still waiting
   *   for Accept, in `to-accept` (`ch3 ch5`;  none:  no attribute)
   *   - the SKELETON's, as `part-ids` is:  the page counts and finds them, and the review routes take their marks
   *     (`ReviewInbox.itemIds()`), with the bodies not loaded
   */
  updateChanges(): number {
    let changed = 0
    const changes = this.changes
    let next = Math.max(0, ...changes.map((change) => Number(CHANGE_ID.test(change.id) ? change.id.slice(2) : 0))) + 1
    const now = PlanTime.clockTime(this.now)
    for (const change of changes) {
      const data: Partial<EpicData<"epic-change">> = {}
      if (!CHANGE_ID.test(change.id)) {
        data.id = `ch${next++}`
        if (this.markHandled(change)) changed++
      }
      if (!change.hasAttribute("at")) data.at = now
      const answer = change.hasAttribute("answer") ? undefined : this.answerOf(change.getAttribute("item") ?? "")
      if (answer) data.answer = answer
      if (!Object.keys(data).length) continue
      Markup.set<"epic-change">(change, data)
      changed++
    }
    const waiting = new Map<Element, string[]>()
    for (const change of this.changes) {
      if (change.hasAttribute("accepted")) continue
      const host = change.parentElement?.closest(CHANGE_HOSTS)
      if (host) waiting.set(host, [...(waiting.get(host) ?? []), change.id])
    }
    for (const host of this.document.querySelectorAll(CHANGE_HOSTS)) {
      const ids = waiting.get(host)?.join(" ")
      if ((host.getAttribute("to-accept") ?? undefined) === ids) continue
      Markup.set<"epic-section">(host, { toAccept: ids })
      changed++
    }
    return changed
  }

  /**
   * Change mark `change`, just stamped:  inside a phase's text, its item is HANDLED IN that phase (`handled`, epic
   * `epic-engine` P31), logged (`Q13 handled in P4`);  changed?
   * - an item already handled there, or a mark outside a phase, or naming no item:  nothing
   */
  private markHandled(change: Element): boolean {
    const phase = change.closest("epic-section[kind='phases'] > epic-phase")
    const item = phase ? this.findItem(change.getAttribute("item") ?? "") : null
    if (!phase || !item || item.localName !== "epic-item" || item.getAttribute("handled") === phase.id) return false
    Markup.set<"epic-item">(item, { handled: phase.id })
    this.stamp(item)
    this.log(`${item.id.toUpperCase()} handled in P${PhaseIds.numberOf(phase)}`)
    return true
  }

  /** Item `id`'s answer in short (its `<epic-answer title>`, at most `ANSWER_MAX` characters);  `undefined` for none. */
  private answerOf(id: string): string | undefined {
    const item = id ? this.findItem(id) : null
    const answer = PlanMarkup.squeeze(item?.querySelector(":scope > epic-answer")?.getAttribute("title") ?? "")
    if (!answer) return undefined
    return answer.length > ANSWER_MAX ? `${answer.slice(0, ANSWER_MAX - 1).trimEnd()}…` : answer
  }

  /**
   * An item asking TWO choice sets at once (epic `epic-engine` I88, P33:  Owen could pick in only one):  its open
   * sets (`<epic-choices>` not `chosen`), outside its Original Discussion, more than one.  One question, one set.
   * - `epic lint` prints them, failing nothing:  a reply may offer new options while the old wait, and edits go on
   */
  choiceSetProblems(): string[] {
    const problems: string[] = []
    for (const item of this.allItems) {
      const open = Array.from(item.querySelectorAll("epic-choices:not([chosen])")).filter(
        (set) => !set.closest("epic-original")
      )
      if (open.length > 1)
        problems.push(`${item.id.toUpperCase()} asks ${open.length} choice sets at once:  one question, one set`)
    }
    return problems
  }

  /**
   * What's wrong with the change marks, as `check()` reports it:
   * - one naming no item on the page (`item`)
   * - one not stamped yet (no id):  written by hand, with no `epic` command since (`epic change <name>` stamps it)
   */
  private changeProblems(): string[] {
    const problems: string[] = []
    for (const change of this.changes) {
      const item = change.getAttribute("item")
      const words = PlanMarkup.squeeze(change.textContent ?? "").slice(0, 40)
      if (item && !this.findItem(item)) problems.push(`change "${words}" names ${item.toUpperCase()}:  no such item`)
      if (!CHANGE_ID.test(change.id))
        problems.push(`change "${words}" has no id:  \`epic change <name>\` stamps it (any epic edit does)`)
    }
    return problems
  }

  /**
   * A new todo, "Follow up:  <title>", linking back to what it's from (`from`:  its label, link and what it is),
   * Owen's note in his words;  its id.
   */
  private followUp(from: Pick<ReviewPart, "label" | "link" | "what" | "title">, note: string | undefined): string {
    // Owen's note (Make Todo's box, epic `windows-and-review` P2) goes in as his words
    const said = note ? `<p><b>Owen:</b>  ${PlanMarkup.text(note)}</p>` : ""
    const link = `<a href="#${from.link}">${PlanMarkup.text(from.label)}</a>`
    const details = `<p>From ${link} (${from.what}), marked "Make Todo" on the page:  ${PlanMarkup.text(from.title)}</p>${said}`
    return this.addItem("todo", `Follow up:  ${from.title}`, { details })
  }

  /**
   * A new todo or question Owen asked for from the page (`{ action: "new", kind, title, note?, near? }`, epic
   * `airplane` P2), made as `plan-doc add` makes one (`addItem()`):  his note its details, a line linking what it's
   * about (`near`), and a Noted status card saying where it came from;  one log line.
   * - a mark with no kind or title (a hand edit):  dropped (`gone`), nothing made
   */
  private addFromPage({ id: key, kind, title, note, near, at }: PlanMark): MarkResult {
    if (!kind || !title) return { applied: false, gone: true, left: "a new item with no kind or title:  dropped" }
    // a new PHASE (Add phase, epic `epic-engine` P34):  Claude drafts it, as `/epic phase` does, with Owen's words
    if (kind === "phase")
      return {
        applied: false,
        left: `${String(key).toUpperCase()}:  a new phase from the page, "${title}"${note ? `:  ${note}` : ""}:  draft it (add-phase), then inbox clear`
      }
    const about = near ? `<p>About ${this.aboutLink(near)}.</p>` : ""
    const details = `${promptHTML(note)}${about}`
    const id = this.addItem(kind, title, { details: details || undefined })
    const written = at ? `, written ${PlanTime.clockTime(new Date(at))}` : ""
    // a todo is a caveat now, work still to do (epic `epic-engine` P32)
    const word = kind === "todo" ? "caveat" : kind
    this.noteStatus(id, `Made from the page:  Owen's new ${word}${written}.`)
    this.log(`${id.toUpperCase()} made from the page:  Owen's new ${word} (${String(key).toUpperCase()})`)
    return { applied: true, did: `made ${word} ${id.toUpperCase()}:  ${title}` }
  }

  /** A link to `id` (an item, a phase, an Overview sub-section, `summary`) as HTML;  its id alone when it's gone. */
  private aboutLink(id: string): string {
    const part = this.reviewPart(id)
    const item = part ? null : this.findItem(id)
    if (!part && !item) return PlanMarkup.text(id.toUpperCase())
    const link = part?.link ?? item!.id
    return `<a href="#${link}">${PlanMarkup.text(part?.label ?? item!.id.toUpperCase())}</a>`
  }

  /**
   * The More Details card a request's note asks for:  for Add Details or revisit now, `host`'s `<epic-more>` when
   * no reply follows it (Claude's answer to the request, just written);  else `undefined`.
   */
  private static moreAnswering(host: Element, action: string, when: string | undefined): Element | undefined {
    if (action !== "details" && !(action === "revisit" && when === "now")) return undefined
    const more = host.querySelector(`:scope > ${MORE_TAG}`)
    if (!more) return undefined
    for (let next = more.nextElementSibling; next; next = next.nextElementSibling)
      if (next.localName === "epic-reply" && !next.hasAttribute("slot")) return undefined
    return more
  }

  /** What's left for Claude:  revisits (with or without a pick), Add Details, and actions there are none of. */
  private leftForClaude(
    { action, pick, when, note }: Omit<PlanMark, "id">,
    optionFor: () => OptionCard | undefined
  ): MarkResult & { applied: false } {
    switch (action) {
      case "revisit": {
        if (when === "now") return { applied: false, left: "revisit now:  an agent's (`inbox done` once answered)" }
        if (!pick) return { applied: false, left: `to talk over${note ? `:  "${note}"` : ""}` }
        // "pick B, but ...":  never applied, the remark may change the pick
        return { applied: false, left: `to talk over:  ${PlanItem.pickAsks(pick, optionFor(), note)}` }
      }
      case "details":
        return { applied: false, left: "Add Details:  an agent's (`inbox done` once written)" }
      default:
        return { applied: false, left: `no such action:  ${action}` }
    }
  }

  /** Owen's note on an Overview sub-section, as a paragraph at its end;  once. */
  private keepNoteInPart(part: Element, { note, stamp, how }: { note: string; stamp: string; how: string }): void {
    const line = `<p><b>Owen · ${PlanMarkup.text(stamp)} · ${PlanMarkup.text(how)}:</b>  ${PlanMarkup.text(note)}</p>`
    const same = Array.from(part.querySelectorAll(":scope > p")).some(
      (p) => PlanMarkup.squeeze(p.outerHTML) === PlanMarkup.squeeze(line)
    )
    if (!same) Markup.append(part, line)
  }
}

/** `node`'s text nodes, at any depth, in document order. */
function textNodes(node: Node): Node[] {
  return Array.from(node.childNodes).flatMap((child) => (child.nodeType === 3 ? [child] : textNodes(child)))
}

/** `PlanItem.asProse()`'s option for text as a reader sees it:  every element's heading, at any depth. */
const PLAIN = { plain: true }

/** Who a test answer's log line names (epic `epic-engine` P4):  `T3 passed (Owen's run)`. */
const OWENS_RUN = "Owen's run"

/** What Owen's note on a test answer is kept as (`<epic-reply re>`):  its result in words. */
const TEST_NOTE_AS: Record<string, string> = {
  passed: "test passed",
  failed: "test failed",
  skip: "test skipped",
  notnow: "test not now"
}

/** What a rewrite of an item's details (`PlanDoc.setDetails()`) leaves where it is, slotted children aside. */
const KEPT_ON_REWRITE = ["epic-answer", "epic-original", "epic-commit"]

/** The slot of Claude's status cards on an item or an Overview sub-section (`<epic-status slot="status">`). */
const STATUS_SLOT = "status"

/** The slot of a status card's summary, under its reading (`<p slot="summary">`). */
const SUMMARY_SLOT = "summary"

/** The slot of Owen's kept notes on the summary (`<epic-reply slot="notes">`, `PlanDoc.keepNote()`). */
const NOTES_SLOT = "notes"

/** An item's id, or what may be one:  `j3`, a comment's `m3` / `cm3`, `o2` (but an old phase id, `p3`:  `OLD_PHASE_REF`). */
const ITEM_REF = /^[a-z]{1,2}\d+$/

/** A phase by its number:  `p3`, `3`. */
const OLD_PHASE_REF = /^p?\d+$/

/**
 * What takes review notes as an item does, but isn't one (`PlanDoc.reviewPart()`):
 * its inbox `id`, `element`, `kind` (`overview`, `phase`, `summary`), and how a todo or a note names it:
 * `label`, `link` (an `#id`), `what` it is in words, `title`.
 */
type ReviewPart = {
  id: string
  element: Element
  kind: "overview" | "phase" | "summary"
  label: string
  link: string
  what: string
  title: string
}

/** Tags that stand as blocks in a status card's reading or summary;  anything else is inline, wrapped in a `<p>`. */
const STATUS_BLOCKS = /^(p|ul|ol|dl|div|blockquote|pre|table)$/

/** A Noted card's line for a todo `inbox apply` made (Q19):  `Made caveat C23 to follow this up.`, linked. */
function filedTodo(todo: string): string {
  return `Made caveat <a href="#${todo}">${todo.toUpperCase()}</a> to follow this up.`
}

/**
 * A Noted card's line for Owen's pick:  `Chose B · Bananas:  <what>`.
 * - e.g. `Chose B · Bananas:  recorded as the answer;  waiting for the next phase, P9 · Build`
 */
function pickedWords(option: OptionCard, what: string): string {
  return PlanMarkup.text(`Chose ${option.letter} · ${option.title}:  ${what}`)
}

/** The cards a pick's option set may sit in, for its log line (`PlanDoc.pickOption()`). */
const REPLY_TAG = "epic-reply"
const MORE_TAG = "epic-more"

/** A pick's card set by position, for a message:  ` in card set 2`;  `""` for the item's own (none given). */
function cardSetWords(choices: number | undefined): string {
  return choices === undefined ? "" : ` in card set ${choices + 1}`
}

/**
 * A phase's plan changes, counted in its `changes` (`PlanDoc.writeChangeCounts()`):  its `<epic-update>` blocks, and
 * an older doc's `<epic-updated>` lines until they're migrated.
 */
const PLAN_CHANGES = ":scope > epic-update[at], :scope > epic-update[summary], :scope > epic-updated"

/** The tags whose `phase` names a phase by number:  renumbered with it (`PlanDoc.makeRoomForPhase()`). */

/** A prompt's text as `<p>`s:  blank lines split paragraphs, single newlines become `<br>`;  `""` for none. */
function promptHTML(prompt: string | null | undefined): string {
  return String(prompt ?? "")
    .trim()
    .split(/\n\s*\n/)
    .filter((paragraph) => paragraph.trim())
    .map((paragraph) => `<p>${PlanMarkup.text(paragraph.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("")
}

/** The doc pass's phase, by its name:  `Doc Review` (epic `epic-engine` P33:  it floats to the end). */
const DOC_REVIEW = /^doc review$/i

/** A change mark's tag (epic `epic-engine` P30). */
const CHANGE_TAG = "epic-change"

/**
 * The hosts whose `to-accept` lists the change marks waiting inside them:  the body hosts of a split doc
 * (`EpicParts`), the nearest one holding each mark.
 */
const CHANGE_HOSTS = [
  "epic-overview > epic-section[kind='overview-part']",
  "epic-section[kind='phases'] > epic-phase",
  "epic-section > epic-item",
  "epic-page > epic-section[kind='log']"
].join(", ")

/** How long a change mark stays NEW, in days (`isNewChange()`;  `<epic-change>`'s `NEW_DAYS`, the same). */
const CHANGE_NEW_DAYS = 3

/** The longest answer a change mark's chip keeps (`answer`):  a line or two. */
const ANSWER_MAX = 160

/** A change mark as `epic inbox` lists it:  its first words, then its question (`"todos fold into ..." (Q16)`). */
function changeTitle(change: Element): string {
  const words = PlanMarkup.squeeze(change.textContent ?? "")
  const short = words.length > 50 ? `${words.slice(0, 49).trimEnd()}…` : words
  return `"${short}" (${(change.getAttribute("item") ?? "?").toUpperCase()})`
}

/** What keeps the numbers it said:  the log, an Original Discussion (`relabelPhaseNames()`). */
const HISTORY = 'epic-section[kind="log"], epic-original'
