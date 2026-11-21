import { Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell/ui/core"

import {
  AnswerForm,
  type AskPart,
  type AskState,
  type PageAnswer,
  type PartLabels,
  type SentAnswer
} from "spell/epic/answers"
// the Other box:  its barrel first, so it's defined wherever `<epic-ask>` is
import "spell/epic/components/epic-text-box"

import { epicAskVocabulary } from "./EpicAsk.en"

import askCSS from "./EpicAsk.css?inline"

/** An option's attributes this reads:  ticked to start with, hidden under Open. */
const SELECTED = "selected"
const DONE = "done"

/** The option attributes its `options` follow:  read while the class is defined (`@E.watches`), so above it. */
const OPTION_ATTRIBUTES = [SELECTED, DONE, "letter"]

/****************
 * ### `EpicAsk`
 * The component behind `<epic-ask>`:  a question Owen answers ON the page (a details page's;
 * epic `epic-workflow` P12).
 * - Its children are an epic page's:  the question an `<epic-question>`, its options an `<epic-choices>` of
 *   `<epic-option>`s, so it reads as an epic page's question does.
 *   - Those options are ITS options (`<epic-ask> > <epic-choices> > <epic-option>`):  each draws a tick box, a
 *     comment box, and what the question asks for (the (?) of `more-details`), reading this question
 *     (`EpicOption`'s answering mode).
 *   - Options deeper inside (in an option's text, as the review's item picker quotes an epic page) are only text.
 * - It draws its line first:  its id chip in the epic page's state colours, `Pick one` / `Pick several`, and its
 *   tools (Select all, Open | All);  then its children;  then the Other box (`<epic-text-box type="other">`).
 *   - its chip numbers what the author means (`chipLabel`, epic `epic-engine` I369):  its key's id, its section's
 *     number, a letter each for two questions in one section (`Q12 · a`)
 * - `compact` (epic `epic-engine` T121;  Owen:  "a select for each item and a comment field for each"):  its children,
 *   then ONE row, the chip, its options as a Spell UI `<ui-select>` and a comment box (its Other, the same answer);
 *   its cards stay in the page, hidden
 *   - for a page of many short picks:  98 items of 4 + 3 cards read as 46 minutes
 * - It holds what's picked (`picks`) and what wants more details (`moreWanted`):  its options draw from them, and
 *   send a `ui-selected` / `ui-deselected` when Owen ticks one, which it takes (`onPick()`).
 *   - Before Owen picks:  the options marked `selected` (ticked to start with:  the review's item picker)
 * - Pick one:  its options' round tick boxes are ONE radio group to the keyboard (I5), though each is a native radio
 *   in its option's own shadow root, which the browser never groups:
 *   - one tab stop (`tabStop`:  the option picked, else the first shown), a roving `tabindex` on the tick boxes
 *   - the arrow keys move the pick and the focus to the next option shown, or the one before, round the ends
 *     (`onArrowKey()`)
 *   - `<epic-choices>` names the group:  `role="radiogroup"`, labelled by `groupLabel`
 * - Part of the page's answer (`AnswerForm`) while connected:  its picks under its key, "more details" under
 *   `<key>-more`.
 * - SIDE EFFECT:  writes its state on its `<ui-section>` (`data-state`) and on that section's button in the docs
 *   page's toolbar, whose badge takes its colour (`spell-doc.css`).
 ****************/
export class EpicAsk extends E.UIComponent<typeof epicAskVocabulary> implements AskPart {
  @E.proto static vocabulary = epicAskVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-ask": askCSS },
    // a form:  a click on its words must not jump to its first control
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## Its options
  ////////////////

  /** Its options' elements, in order:  `<epic-option>`s of its `<epic-choices>`. */
  @E.watches({ childList: true, subtree: true, attributeFilter: OPTION_ATTRIBUTES })
  get options(): readonly Element[] {
    return isServer ? [] : EpicAsk.optionsOf(this.domElement)
  }

  /** The letters ticked in the page's markup (`<epic-option selected>`):  the picks before Owen picks. */
  get startingPicks(): string[] {
    return this.options.filter((option) => option.hasAttribute(SELECTED)).map(letterOf)
  }

  /** What Owen picked (or the answer sent);  `undefined` until he does:  `startingPicks` then. */
  @E.state accessor chosen: readonly string[] | undefined = undefined

  /**
   * Pick any, as Owen switched it on the page (epic `epic-engine` P50, Q55):  the switch in its line;  `undefined`
   * until he flips it, its `multiple` meanwhile.  Page state only:  the answer carries the picks themselves.
   */
  @E.state accessor flipped: boolean | undefined = undefined

  /** Pick several:  its switch, else `multiple`. */
  get isMultiple(): boolean {
    return this.flipped ?? !!this.multiple
  }

  /** The switch flipped:  to pick one with several picked, the newest pick stays (the last), the others go. */
  @E.untracked
  private flip() {
    const multiple = !this.isMultiple
    this.flipped = multiple === !!this.multiple ? undefined : multiple
    if (!multiple && this.picks.length > 1) {
      this.chosen = this.picks.slice(-1)
      this.form?.edited()
    }
  }

  /** The letters picked. */
  get picks(): readonly string[] {
    return this.chosen ?? this.startingPicks
  }

  /** The letters whose "Provide more details" is pressed. */
  @E.state accessor moreWanted: readonly string[] = []

  /** The Other box's text, as typed. */
  @E.state accessor otherText = ""

  /** Is `letter` picked? */
  isPicked(letter: string): boolean {
    return this.picks.includes(letter)
  }

  /** Is "Provide more details" pressed on `letter`? */
  wantsMore(letter: string): boolean {
    return this.moreWanted.includes(letter)
  }

  ////////////////
  // ## Its key and state
  ////////////////

  /** The key its answer goes under:  `name`, else its section's id, else `""` (not answerable). */
  get key(): string {
    return this.name ?? this.domElement.closest("ui-section[id]")?.id ?? ""
  }

  /**
   * Its place among the page's question HOLDERS, from 1:  its section (`ui-section[id]`), else itself;  two questions
   * in one section share it.  Set as it connects.
   */
  @E.state accessor position = 1

  /** Its place among its section's questions, from 0;  `-1` while it's the only one.  Set as it connects. */
  @E.state accessor partIndex = -1

  /**
   * Its chip (epic `epic-engine` I369):  the number the AUTHOR means, never a count of every question on the page.
   * - `chip`, when the page gives one:  as written (`12`, `Q12`)
   * - else its key's id (`q3` -> `Q3`;  `q3-priority` -> `Q3`)
   * - else its section's number (`12 · Rename it` -> `Q12`)
   * - else `Q` and its section's place among the page's question sections (`Q2`)
   * - two or more questions in one section share its number, a letter each:  `Q12 · a`, `Q12 · b`
   */
  get chipLabel(): string {
    if (this.chip) return this.chip
    const number = this.chipNumber
    return this.partIndex < 0 ? number : `${number}${PART_SEPARATOR}${String.fromCharCode(97 + this.partIndex)}`
  }

  /** Its chip's number, before a part's letter:  its key's id, its section's number, else its place. */
  private get chipNumber(): string {
    const id = ID_KEY.exec(this.key)?.[1]
    if (id) return id.toUpperCase()
    const label = this.domElement.closest("ui-section[id]")?.getAttribute("label") ?? ""
    const number = NUMBERED_LABEL.exec(label)
    if (number) return `${(number[1] || "Q").toUpperCase()}${number[2]}`
    return `Q${this.position}`
  }

  /** Where it stands (`AskState`):  more details asked, or only Other written;  picked;  nothing yet. */
  get askState(): AskState {
    const picked = this.picks.length > 0
    if (this.moreWanted.length || (this.otherText.trim() && !picked)) return "working"
    return picked ? "done" : "attention"
  }

  /** Nothing yet:  red. */
  @E.cssState("attention")
  get needsAnswer(): boolean {
    return this.askState === "attention"
  }

  /** Picked:  green. */
  @E.cssState("done")
  get isDecided(): boolean {
    return this.askState === "done"
  }

  /** Claude has more to do:  blue. */
  @E.cssState("working")
  get isClaudesTurn(): boolean {
    return this.askState === "working"
  }

  ////////////////
  // ## Its tools
  ////////////////

  /** The filter's choice:  `open` (the options not `done`) or `all`. */
  @E.state accessor showing: "open" | "all" = "open"

  /** Options marked `done` are hidden:  the filter is on, showing Open. */
  get hidesDone(): boolean {
    return !!this.filter && this.showing === "open"
  }

  /** Its options shown (not hidden by the filter). */
  get shownOptions(): Element[] {
    return this.options.filter((option) => !(this.hidesDone && option.hasAttribute(DONE)))
  }

  /**
   * Pick one:  the letter of the option whose tick box Tab stops on (a roving `tabindex`, I5):  the one picked, else
   * the first shown;  `undefined` with `multiple`, where every tick box is a stop.
   */
  get tabStop(): string | undefined {
    if (this.isMultiple) return undefined
    const shown = this.shownOptions.map(letterOf)
    return shown.find((letter) => this.isPicked(letter)) ?? shown[0]
  }

  /** What its options' group is called:  its section's title (`Q1 · Which layout?`), else its chip. */
  get groupLabel(): string {
    return this.domElement.closest("ui-section[id]")?.getAttribute("label") ?? this.chipLabel
  }

  /** Every option shown is ticked:  the button says Select none. */
  get isAllSelected(): boolean {
    const shown = this.shownOptions
    return shown.length > 0 && shown.every((option) => this.isPicked(letterOf(option)))
  }

  ////////////////
  // ## Connected
  ////////////////

  /** The page's form, while it's registered there. */
  private form: AnswerForm | undefined

  /**
   * While connected:  its place among the page's question sections and among its section's questions, and its part
   * of the page's answer;  returns the undo.
   */
  @E.whileConnected
  protected joinForm() {
    const holderOf = (ask: Element) => ask.closest("ui-section[id]") ?? ask
    const asks = Array.from(document.querySelectorAll(this.domElement.localName))
    const holders = [...new Set(asks.map(holderOf))]
    const holder = holderOf(this.domElement)
    const partners = asks.filter((ask) => holderOf(ask) === holder)
    this.position = holders.indexOf(holder) + 1
    this.partIndex = partners.length > 1 ? partners.indexOf(this.domElement) : -1
    const form = AnswerForm.forPage()
    this.form = form
    const leave = form.add(this)
    return () => {
      leave()
      this.form = undefined
    }
  }

  /**
   * Its state on its section (`data-state`), and on that section's toolbar button (the docs runtime copies it from
   * the section when it builds the toolbar, so a later change goes to both).
   */
  @E.onChange("askState", "isConnected")
  protected markState(state: AskState, connected: boolean) {
    if (!connected) return
    const section = this.domElement.closest("ui-section[id]")
    section?.setAttribute(STATE_ATTRIBUTE, state)
    if (section)
      document
        .querySelector(`.spell-toolbar [data-rail="${CSS.escape(section.id)}"]`)
        ?.setAttribute(STATE_ATTRIBUTE, state)
  }

  ////////////////
  // ## Drawing
  ////////////////

  render(): JSX.Element {
    return (
      <div class={this.rootClass} part={this.partForName("base")}>
        <Show when={this.compact} fallback={this.renderCards()}>
          {this.renderCompact()}
        </Show>
      </div>
    )
  }

  /** Its id chip, in its state's colour, its state in words its tooltip. */
  private renderChip(): JSX.Element {
    return (
      <span
        class={CHIP}
        part={this.partForName("chip")}
        data-tooltip={this.translationForKey(`${this.askState}Tip`, { id: this.chipLabel })}
      >
        {this.chipLabel}
      </span>
    )
  }

  /**
   * `compact` (epic `epic-engine` T121):  its text, then ONE row, its chip, its options as one Spell UI select, and a
   * comment box beside it (its Other, worded as a comment), wrapping under the select when narrow.
   * - its `<epic-choices>` stay in the page, hidden:  the select lists them, their titles its entries
   */
  private renderCompact(): JSX.Element {
    return (
      <>
        <slot />
        <div class={ROW} part={this.partForName("row")}>
          <span class={PICK_LINE}>
            {this.renderChip()}
            <ui-select
              class={PICK}
              part={this.partForName("select")}
              size="small"
              aria-label={this.groupLabel}
              placeholder={this.translationForKey(this.isMultiple ? "pickSeveral" : "pickOne")}
              multiple={this.isMultiple ? "" : undefined}
              options={this.selectOptions}
              value={this.isMultiple ? this.picks.join(",") : (this.picks[0] ?? "")}
              on-ui-changed={this.onSelectPick}
            />
          </span>
          <epic-text-box
            class={COMMENT}
            part={this.partForName("other")}
            type="other"
            for={this.key}
            placeholder={this.translationForKey("comment")}
            onInput={this.onOtherInput}
          />
        </div>
      </>
    )
  }

  /** The select's entries:  each option's title (`recommended` says so), its letter the value. */
  get selectOptions(): { value: string; text: string }[] {
    return this.options.map((option) => {
      const letter = letterOf(option)
      const title = option.getAttribute("title") ?? letter
      const text = option.hasAttribute("recommended") ? this.translationForKey("recommended", { title }) : title
      return { value: letter, text }
    })
  }

  /** Its options as cards (the default):  its line (chip, how, tools), its text and cards, then Other. */
  private renderCards(): JSX.Element {
    return (
      <>
        <div class={LINE} part={this.partForName("line")}>
          {this.renderChip()}
          <button
            type="button"
            class={HOW}
            part={this.partForName("how")}
            role="switch"
            aria-checked={this.isMultiple ? "true" : "false"}
            data-tooltip={this.translationForKey(this.isMultiple ? "toOneTip" : "toSeveralTip")}
            onClick={() => this.flip()}
          >
            <span class={KNOB} aria-hidden="true" />
            {this.translationForKey(this.isMultiple ? "pickSeveral" : "pickOne")}
          </button>
          <span class={TOOLS} part={this.partForName("tools")}>
            <Show when={this.isMultiple && this.selectAll}>
              <ui-button
                size="mini"
                appearance="basic circular"
                icon="list check"
                aria-pressed={this.isAllSelected ? "true" : "false"}
                onClick={this.onSelectAll}
              >
                {this.translationForKey(this.isAllSelected ? "selectNone" : "selectAll")}
              </ui-button>
            </Show>
            <Show when={this.filter}>
              <span class={FILTER} role="group">
                <ui-button
                  size="mini"
                  appearance="basic circular"
                  icon="filter"
                  selected={this.showing === "open" ? "" : undefined}
                  aria-pressed={this.showing === "open" ? "true" : "false"}
                  data-tooltip={this.translationForKey("openTip")}
                  onClick={() => (this.showing = "open")}
                >
                  {this.translationForKey("open")}
                </ui-button>
                <ui-button
                  size="mini"
                  appearance="basic circular"
                  icon="list check"
                  selected={this.showing === "all" ? "" : undefined}
                  aria-pressed={this.showing === "all" ? "true" : "false"}
                  data-tooltip={this.translationForKey("allTip")}
                  onClick={() => (this.showing = "all")}
                >
                  {this.translationForKey("all")}
                </ui-button>
              </span>
            </Show>
          </span>
        </div>
        <slot />
        <epic-text-box
          class={OTHER}
          part={this.partForName("other")}
          type="other"
          for={this.key}
          placeholder={this.translationForKey(this.isMultiple ? "otherSeveral" : "otherOne")}
          onInput={this.onOtherInput}
        />
      </>
    )
  }

  ////////////////
  // ## Events
  ////////////////

  /**
   * One of its options was ticked, unticked, or had its (?) pressed (`<epic-option>`'s `ui-selected` / `ui-deselected`):
   * - pick one:  a tick picks it alone
   * - "Provide more details" pressed:  the option is ticked too
   * - options further down (quoted in an option's text) are none of its business
   */
  @E.on("ui-selected")
  @E.on("ui-deselected")
  protected onPick(event: Event) {
    const option = event.target as Element
    if (!this.options.includes(option)) return
    const { selected, more } = (event as CustomEvent<{ selected: boolean; more: boolean }>).detail
    const letter = letterOf(option)
    const ticked = selected || more
    const others = this.isMultiple ? this.picks.filter((each) => each !== letter) : []
    this.chosen = ticked ? [...others, letter] : others
    this.moreWanted = more
      ? [...this.moreWanted.filter((each) => each !== letter), letter]
      : this.moreWanted.filter((each) => each !== letter)
    this.form?.edited()
  }

  /**
   * Pick one:  an arrow key on an option's tick box moves the pick to the next option shown (Down, Right) or the one
   * before (Up, Left), round the ends, and the focus with it, as a native radio group does (I5).
   * - the tick boxes are native radios in the options' own shadow roots:  the browser groups none of them
   * - a key anywhere else (an option's comment box, Other) is left alone
   */
  @E.on("keydown")
  protected onArrowKey(event: KeyboardEvent) {
    const step = ARROW_STEPS[event.key]
    if (!step || this.isMultiple || event.altKey || event.ctrlKey || event.metaKey) return
    const path = event.composedPath()
    const box = path[0]
    if (!(box instanceof HTMLElement) || box.getAttribute("role") !== "radio") return
    const shown = this.shownOptions
    const at = shown.findIndex((option) => path.includes(option))
    if (at < 0) return
    event.preventDefault()
    const next = shown[(at + step + shown.length) % shown.length]
    this.chosen = [letterOf(next)]
    this.form?.edited()
    next.shadowRoot?.querySelector<HTMLElement>(TICK_PART)?.focus()
  }

  /** Select all:  tick every option shown;  once they all are, untick them (Select none). */
  private readonly onSelectAll = () => {
    const shown = this.shownOptions.map(letterOf)
    const rest = this.picks.filter((letter) => !shown.includes(letter))
    this.chosen = this.isAllSelected ? rest : [...rest, ...shown]
    this.form?.edited()
  }

  /** `compact`:  a pick in its select, one letter (`""`:  none) or, picking several, the letters picked. */
  private readonly onSelectPick = (event: CustomEvent<{ value: string | string[] }>) => {
    const { value } = event.detail
    this.chosen = (Array.isArray(value) ? value : [value]).filter(Boolean)
    this.form?.edited()
  }

  /** Typing in Other:  its state follows (the box tells the form itself). */
  private readonly onOtherInput = (event: InputEvent) => {
    this.otherText = (event.currentTarget as HTMLElement & { value: string }).value
  }

  ////////////////
  // ## Its part of the answer
  ////////////////

  /** Its picks under its key;  "more details" under `<key>-more`, when it asks for them. */
  gatherInto(page: PageAnswer) {
    const key = this.key
    if (!key) return
    const answer = (page.answers[key] ??= { picked: [] })
    answer.picked = [...this.picks]
    if (this.moreDetails) page.answers[`${key}${MORE_SUFFIX}`] = { picked: [...this.moreWanted] }
  }

  /**
   * Its ids, for a draft (P18):  its key, under its section's title (`Q1 · Which layout?`), and each option's
   * (`q1-B`), under the option's (`B · Blue`).
   */
  labelsInto(labels: PartLabels) {
    const key = this.key
    if (!key) return
    labels[key] = this.domElement.closest("ui-section[id]")?.getAttribute("label") ?? this.chipLabel
    for (const option of this.options) {
      const letter = letterOf(option)
      labels[`${key}-${letter}`] = `${letter} · ${option.getAttribute("title") ?? letter}`
    }
  }

  /** Show `answer`, as sent:  its picks, its "more details" and its Other (the box shows its own text). */
  showAnswer(answer: SentAnswer) {
    const key = this.key
    const got = answer.answers?.[key]
    this.chosen = [...(got?.picked ?? [])]
    this.otherText = got?.other ?? ""
    this.moreWanted = [...(answer.answers?.[`${key}${MORE_SUFFIX}`]?.picked ?? [])]
  }

  ////////////////
  // ## Shared with `<epic-option>`
  ////////////////

  /**
   * The `<epic-ask>` whose option `option` is (`<epic-ask> > <epic-choices> > <epic-option>`), or `null`:
   * an option anywhere else draws as an epic page's.
   */
  static askOf(option: Element): Element | null {
    const choices = option.parentElement
    const ask = choices?.localName === CHOICES_TAG ? choices.parentElement : null
    return ask?.localName === ASK_TAG ? ask : null
  }

  /** The options of the `<epic-ask>` `ask`, in order. */
  static optionsOf(ask: Element): Element[] {
    return Array.from(ask.children)
      .filter((child) => child.localName === CHOICES_TAG)
      .flatMap((choices) => Array.from(choices.children).filter((child) => child.localName === OPTION_TAG))
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicAsk extends E.AttributeValues<typeof epicAskVocabulary> {}

/** An option's letter (`A`;  the item picker's are item ids, `J7`). */
function letterOf(option: Element): string {
  return option.getAttribute("letter") ?? ""
}

/** The tags of a question's options. */
const ASK_TAG = "epic-ask"
const CHOICES_TAG = "epic-choices"
const OPTION_TAG = "epic-option"

/** Pick one:  the arrow keys that move the pick, and which way. */
const ARROW_STEPS: Readonly<Record<string, number>> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }

/** An option's tick box, in its shadow root (`<epic-option>`'s `tick` part). */
const TICK_PART = '[part~="tick"]'

/** The switch's knob, in its line. */
const KNOB = "knob"

/** The answer key of "Provide more details":  `<key>-more`. */
const MORE_SUFFIX = "-more"

/** The attribute its state goes in, on its section and the toolbar's button:  the docs runtime's. */
const STATE_ATTRIBUTE = "data-state"

/** A key that's an id, alone or before a dash (`q3`, `q3-priority`):  its chip's number (I369). */
const ID_KEY = /^([a-z]\d+)(?:$|-)/

/** A section label that starts with a number, after an id's letter or not (`12 · Rename it`, `Q3 · Which?`). */
const NUMBERED_LABEL = /^\s*([A-Za-z]?)(\d+)\s*(?:·|\.|$)/

/** Between a chip's number and its letter, when its section holds several questions:  `Q12 · a`. */
const PART_SEPARATOR = " · "

/** Classes of the shadow markup. */
const ROW = "row"
const PICK = "pick"
const PICK_LINE = "pick-line"
const COMMENT = "comment"
const LINE = "line"
const CHIP = "chip"
const HOW = "how"
const TOOLS = "tools"
const FILTER = "filter"
const OTHER = "other"
