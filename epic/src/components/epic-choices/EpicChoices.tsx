import { For, Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/ui/core"

import { PlanDates } from "spell/epic/dates"
import { ReviewClient, pickedLetters, type AddedOption, type PickFields } from "spell/epic/review"
import { Fold } from "spell/epic/components/epic-item/Fold"
// Spell UI's page zoom:  its plain-DOM leaf alone, so the pack holds no second `<ui-zoom>` (as `<epic-field>`'s)
import { ImageZoom } from "spell/ui/components/ui-zoom/ImageZoom"
// Import directly:  the question's class, not its barrel (which would define `<epic-ask>` here)
import { EpicAsk } from "spell/epic/components/epic-ask/EpicAsk"
// Add choice's form:  its barrel first, so it's defined wherever a set is
import "spell/epic/components/epic-option-form"
import type { OptionFormSaved } from "spell/epic/components/epic-option-form"

import { epicChoicesVocabulary } from "./EpicChoices.en"
import { SetChange, type SetState } from "./SetChange"
import {
  ANSWERED,
  CHOICES_TAG,
  CHOSEN,
  CLOSED,
  ITEM_TAG,
  MULTIPLE,
  ORIGINAL_TAG,
  PHASE_TAG,
  STANDING,
  STATUS,
  TOGGLE,
  type CardSet
} from "./EpicChoices.types"

import choicesCSS from "./EpicChoices.css?inline"
import tooltipCSS from "spell/epic/components/epic-item/Tooltip.css?inline"

/****************
 * ### `EpicChoices`
 * The component behind `<epic-choices>`:  an option SET, `<epic-option>`s, drawn as it stands.
 * - Where a set sits (epic `epic-engine` P50), its marks kept under what holds it (`setOf()`):
 *   - a question's, or any item's prose (a call, a reply):  its item's id
 *   - a phase's own, in its Choices field:  the phase's id
 *   - a STANDING set, in the page's Choices section:  its own id (`s-upgrades`)
 * - Open:  the option cards side by side (as many as fit, at least 14em each;  one column when narrow).
 *   - a heading first, while the page is reviewed, while it's pick any, or for a standing set's title:
 *     `Pick one` / `Pick any`, which a reviewer flips (a switch:  `multiple`, sent with his Send)
 *   - Owen's added options, not sent yet, as cards after Claude's (from the set's mark:  `SetChange`)
 *   - Add choice under them, while reviewed, unless `fixed`:  `<epic-option-form>` in a card's place
 * - Answered (`chosen`, `closed`, or `answered` on its `<epic-item>`;  never a standing set until `closed`):
 *   folded away under a `Choices` aside.
 *   - its options panels in one box, the chosen ones marked and open
 *   - find-in-page unfolds it
 *   - atop the panels, the pick's own line (`chosen-on`, `chosen-note`):  `Chosen 10/29/26:  recorded as the
 *     answer;  waiting for a phase to take it up`, so a pick needs no Noted card of its own (I153)
 *   - the folded heading names the chosen ones, green with a check (`Choices  ✓ Chosen:  B · Bananas`),
 *     so the pick stays in sight while folded (Owen, 2026-10-10)
 * - At its end, folded:  a standing set's `Picked (n)` (its `picked` slot) and any set's `Removed (n)` (`removed`):
 *   never erased, out of the way.
 * - `closed`:  done.  No pills, switch, Add choice, pencils or ✕;  drawn answered.
 * - An `<epic-ask>`'s options, pick one:  a radio group (`role="radiogroup"`, labelled by the question's
 *   `groupLabel`), which the question moves through with the arrow keys (I5).
 * - Reads its item's `answered` and its own `chosen` as they change (`EpicChoices.watch()`);
 *   `<epic-option>` reads the same, through the same statics, and changes the set through this one (`change()`).
 * - SIDE EFFECT:  the first one connected makes the page's `ReviewClient` (`forPage()`), which reads the inbox
 ****************/
export class EpicChoices extends E.UIComponent<typeof epicChoicesVocabulary> {
  @E.proto static vocabulary = epicChoicesVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-tooltip": tooltipCSS, "epic-choices": choicesCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** Its question is answered (or the set closed):  folded under Choices. */
  @E.cssState("answered")
  @E.state
  accessor questionIsAnswered = EpicChoices.isAnswered(this.domElement)

  /** Its `chosen` letters as written (`A C`), followed as they change;  `undefined` while none is. */
  @E.state accessor chosenLetter = EpicChoices.chosenFor(this.domElement)

  /** The options of an `<epic-ask>` (a page Owen answers on, epic `epic-workflow` P12):  one card a row. */
  @E.cssState("answering")
  get isAnswering(): boolean {
    return this.domElement.parentElement?.localName === ASK_TAG
  }

  /** The `<epic-ask>` it holds the options of, drawn;  `undefined` elsewhere.  Read again as it connects. */
  @E.state accessor ask: EpicAsk | undefined = EpicChoices.askFor(this.domElement)

  /** While connected, find its question again:  it may have moved. */
  @E.whileConnected
  protected findAsk() {
    this.ask = EpicChoices.askFor(this.domElement)
    return undefined
  }

  /** The drawn `<epic-ask>` whose options `element` holds, if any. */
  private static askFor(element: Element): EpicAsk | undefined {
    const parent = element.parentElement as E.DOMElement | null
    return parent?.localName === ASK_TAG ? (parent.component as EpicAsk | undefined) : undefined
  }

  /** A pick-one question's options:  a radio group, labelled by the question (I5). */
  get isRadioGroup(): boolean {
    return !!this.ask && !this.ask.isMultiple
  }

  /** Its options' box:  folded until the reader opens it. */
  readonly fold = new Fold(() => false)

  /** Its chosen letters:  `["A", "C"]`;  `[]` while none is. */
  get chosenLetters(): string[] {
    return pickedLetters(this.chosenLetter)
  }

  /**
   * The chosen options, as the folded heading names them (`B · Bananas`, `A · Apples, C · Cherries`);  `undefined`
   * while none is.
   * - so Owen's pick stays in sight with the box folded (Owen, 2026-10-10:  "losing the Chosen marker")
   * - each title read plainly:  an option's title doesn't change under a set already chosen
   */
  get chosenName(): string | undefined {
    const letters = this.chosenLetters
    if (!letters.length) return undefined
    const options = Array.from(this.domElement.children).filter((child) => child.localName === OPTION_TAG)
    return letters
      .map((letter) => {
        const option = options.find((child) => child.getAttribute("letter") === letter)
        const title = (
          option?.getAttribute("title") ??
          option?.querySelector(":scope > [slot=title]")?.textContent ??
          ""
        ).trim()
        return title ? `${letter}${LETTER_SEPARATOR}${title}` : letter
      })
      .join(", ")
  }

  /**
   * The pick's line atop the unfolded panels:  when it was recorded and what happens next,
   * `Chosen 10/29/26:  recorded as the answer;  waiting for a phase to take it up`.
   * - `undefined` with no option chosen, or neither `chosen-on` nor `chosen-note` (a pick from before I153)
   */
  get pickNote(): string | undefined {
    if (!this.chosenLetter) return undefined
    const date = PlanDates.format(this.chosenOn?.trim())
    const note = this.chosenNote?.trim()
    if (date && note) return this.translationForKey("chosenNote", { date, note })
    if (date) return this.translationForKey("chosenOn", { date })
    if (note) return this.translationForKey("chosenNoteOnly", { note })
    return undefined
  }

  /** Answered and unfolded. */
  @E.cssState("open")
  get isOpen(): boolean {
    return this.questionIsAnswered && this.fold.isOpen()
  }

  protected get extraClass(): string | undefined {
    const classes = [this.questionIsAnswered && ANSWERED, this.standing && STANDING_CLASS]
    return classes.filter(Boolean).join(" ") || undefined
  }

  /**
   * While connected:  follow whether its question is answered, and its `chosen` letters.  Returns the undo.
   * - `watch()`'s own `MutationObserver`, not `@watches`:  it watches its `<epic-item>`, an ANCESTOR.
   */
  @E.whileConnected
  protected watchQuestion() {
    return EpicChoices.watch(this.domElement, () => {
      this.questionIsAnswered = EpicChoices.isAnswered(this.domElement)
      this.chosenLetter = EpicChoices.chosenFor(this.domElement)
    })
  }

  ////////////////
  // ## The set's change, in review (P50)
  ////////////////

  /** The page's review inbox (`ReviewClient.forPage()`), once connected;  never on the server. */
  private review: ReviewClient | undefined

  /** The page's review inbox's `version` as last seen:  bumped on every change, so what reads the inbox follows it. */
  @E.state accessor inboxVersion = 0

  /** Which set it is, and what holds it (`setOf()`);  read as it connects.  `undefined`:  no review (an Original). */
  @E.state accessor cardSet: CardSet | undefined = undefined

  /**
   * While connected, follow the page's review inbox;  returns the undo.
   * - not an `<epic-ask>`'s:  a page Owen answers on sends its own form
   */
  @E.whileConnected
  protected followReview(): () => void {
    this.cardSet = EpicChoices.setOf(this.domElement)
    if (this.isAnswering || !this.cardSet) return () => undefined
    const client = ReviewClient.forPage()
    this.review = client
    this.inboxVersion = client.version
    return client.subscribe(() => (this.inboxVersion = client.version))
  }

  /** The page is reviewed, and this set takes changes:  open, not `closed`, not an Original's or an `<epic-ask>`'s. */
  @E.cssState("reviewed")
  get isReviewed(): boolean {
    void this.inboxVersion
    return !!this.review?.reviewing && !!this.cardSet && !this.closed && !this.isAnswering
  }

  /** The set as the page shows it, for `SetChange`:  its place, `multiple`, `chosen`. */
  get setState(): SetState {
    return { index: this.cardSet?.index ?? 0, multiple: !!this.multiple, chosen: this.chosenLetters }
  }

  /** What Owen changed in it, not applied yet:  its mark's set fields (`{}` for none, or another set's). */
  get fields(): PickFields {
    void this.inboxVersion
    const holder = this.cardSet?.holder
    return holder && this.review ? SetChange.fieldsFor(this.review.markOf(holder), this.setState) : {}
  }

  /** Pick any, the mark's flip counted. */
  get isMultiple(): boolean {
    return SetChange.isMultiple(this.fields, this.setState)
  }

  /** The letters (and added keys) picked, as the page shows them (`SetChange.picksOf()`). */
  get picks(): string[] {
    return SetChange.picksOf(this.fields, this.setState)
  }

  /** Has the set's mark gone to Claude? */
  get isSent(): boolean {
    void this.inboxVersion
    const mark = this.cardSet && this.review?.markOf(this.cardSet.holder)
    return !!mark && !!this.review?.isSent(mark)
  }

  /**
   * Change the set:  `step` works out its mark's new fields from what it holds (`SetChange`), saved through the client.
   * - NEVER throws:  a failed write is the client's own notice, and re-reads the inbox
   */
  @E.untracked
  change(step: (fields: PickFields, state: SetState) => PickFields) {
    const holder = this.cardSet?.holder
    if (!this.review || !holder || !this.isReviewed) return
    const next = step(this.fields, this.setState)
    void this.review.changeSet(holder, next).catch((error: unknown) => console.error(error))
  }

  /** The heading shows:  reviewed and open, pick any, or a standing set's title. */
  get hasHeading(): boolean {
    if (this.isAnswering) return false
    return !!this.title || (!this.questionIsAnswered && (this.isReviewed || this.isMultiple))
  }

  /** Add choice shows:  reviewed, open, not `fixed`. */
  get canAdd(): boolean {
    return this.isReviewed && !this.questionIsAnswered && !this.fixed
  }

  /** Add choice's form is open. */
  @E.state accessor isAdding = false

  /** The key of the added option whose form is open (`+1`), changed before it's sent;  `undefined` for none. */
  @E.state accessor editingKey: string | undefined = undefined

  ////////////////
  // ## Picked and Removed
  ////////////////

  /** A standing set's picked options, and any set's removed ones:  how many of each its light DOM holds. */
  @E.watches({ childList: true, attributes: true, attributeFilter: ["slot"] })
  get slottedCounts(): { picked: number; removed: number } {
    const options = Array.from(this.domElement.children).filter((child) => child.localName === OPTION_TAG)
    return {
      picked: options.filter((child) => child.getAttribute("slot") === PICKED_SLOT).length,
      removed: options.filter((child) => child.getAttribute("slot") === REMOVED_SLOT).length
    }
  }

  /** The Picked list's fold, and the Removed list's:  folded to start with. */
  readonly pickedFold = new Fold(() => false)
  readonly removedFold = new Fold(() => false)

  ////////////////
  // ## Rendering
  ////////////////

  render(): JSX.Element {
    return (
      <div
        class={this.rootClass}
        part={this.partForName("base")}
        role={this.isRadioGroup ? "radiogroup" : undefined}
        aria-label={this.isRadioGroup ? this.ask?.groupLabel : undefined}
      >
        <Show when={this.questionIsAnswered} fallback={this.openSet()}>
          {this.fold.button({
            className: TOGGLE,
            part: this.partForName("toggle"),
            controls: PANELS_ID,
            tips: { fold: this.translationForKey("foldTip"), unfold: this.translationForKey("unfoldTip") },
            label: (
              <>
                {this.title ?? this.translationForKey("choices")}
                <Show when={this.chosenName}>
                  {(name) => (
                    <span class={CHOSEN_MARK} part={this.partForName("chosen")}>
                      <svg class={CHECK} viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M2.5 8.5l3.5 3.5 7.5-8" />
                      </svg>
                      {this.translationForKey("chosen", { name: name() })}
                    </span>
                  )}
                </Show>
                <Show when={this.closed && !this.chosenName}>
                  <span class={CLOSED_MARK}>{this.translationForKey("closedMark")}</span>
                </Show>
              </>
            ),
            clicks: true
          })}
          <div
            ref={this.fold.watch}
            id={PANELS_ID}
            class={PANELS}
            part={this.partForName("panels")}
            hidden={this.fold.hidden()}
          >
            <Show when={this.pickNote}>
              {(line) => (
                <p class={PICK_NOTE} part={this.partForName("note")}>
                  {line()}
                </p>
              )}
            </Show>
            <slot />
            {this.folded()}
          </div>
        </Show>
      </div>
    )
  }

  /** An open set:  its heading, the cards (Owen's added ones too), Add choice, then Picked and Removed. */
  private openSet(): JSX.Element {
    return (
      <>
        <Show when={this.hasHeading}>{this.heading()}</Show>
        <div class={CARDS} part={this.partForName("cards")}>
          <slot />
          <For each={this.fields.added ?? []}>{(option) => this.addedCard(option)}</For>
        </div>
        {/* under the grid, not in it:  a form spanning the grid would hold a third column open */}
        <Show when={this.isAdding && this.canAdd}>
          <epic-option-form
            class={FORM}
            heading={this.translationForKey("newChoice")}
            submit={this.translationForKey("add")}
            for={this.cardSet?.holder ?? ""}
            on-epic-option-saved={(event: CustomEvent<OptionFormSaved>) => this.onAdded(event.detail)}
            on-epic-option-canceled={() => (this.isAdding = false)}
          />
        </Show>
        <Show when={this.canAdd && !this.isAdding}>
          <button
            type="button"
            class={ADD}
            part={this.partForName("add")}
            title={this.translationForKey("addTip")}
            onClick={() => (this.isAdding = true)}
          >
            <ui-icon name="plus" />
            {this.translationForKey("addChoice")}
          </button>
        </Show>
        {this.folded()}
      </>
    )
  }

  /**
   * The heading:  a standing set's title, then how it's answered.
   * - reviewed:  a switch, `Pick any` on or off (`role="switch"`);  its tooltip says what flipping does
   * - else the words, `Pick any` (pick one says nothing:  the old look)
   */
  private heading(): JSX.Element {
    return (
      <div class={HEADING} part={this.partForName("heading")}>
        <Show when={this.title}>
          <span class={SET_TITLE} part={this.partForName("title")}>
            {this.title}
          </span>
        </Show>
        <Show
          when={this.isReviewed && !this.questionIsAnswered}
          fallback={
            <Show when={this.isMultiple}>
              <span class={MODE}>{this.translationForKey("pickAny")}</span>
            </Show>
          }
        >
          <button
            type="button"
            class={[SWITCH, { [FLIPPED]: this.fields.multiple !== undefined }]}
            part={this.partForName("switch")}
            role="switch"
            aria-checked={this.isMultiple ? "true" : "false"}
            title={this.translationForKey(this.isMultiple ? "switchToOneTip" : "switchToAnyTip")}
            onClick={() => this.change((fields, state) => SetChange.flip(fields, state))}
          >
            <span class={KNOB} aria-hidden="true" />
            {this.translationForKey(this.isMultiple ? "pickAny" : "pickOne")}
          </button>
        </Show>
      </div>
    )
  }

  /**
   * One option Owen added, not sent yet (`option`):  a card in the same look, dashed until sent, its Choose pill on
   * while it's picked;  its pencil opens the form on it, its ✕ drops it.
   */
  private addedCard(option: AddedOption): JSX.Element {
    const picked = () => this.picks.includes(option.key)
    return (
      <Show
        when={this.editingKey !== option.key}
        fallback={
          <epic-option-form
            class={FORM}
            heading={this.translationForKey("editNew")}
            option-title={option.title}
            note={option.note ?? ""}
            shot={option.shot ?? ""}
            for={this.cardSet?.holder ?? ""}
            on-epic-option-saved={(event: CustomEvent<OptionFormSaved>) => this.onAddedEdited(option.key, event.detail)}
            on-epic-option-canceled={() => (this.editingKey = undefined)}
          />
        }
      >
        <div
          class={[CARD, ADDED, { [PICKED]: picked(), [SENT]: this.isSent }]}
          part={this.partForName("added")}
          data-key={option.key}
        >
          <div class={HEADER}>
            <span class={TOGGLE}>
              <span class={TITLE}>
                {this.translationForKey("newLetter")}
                {LETTER_SEPARATOR}
                {option.title}
              </span>
            </span>
            <span class={ACTIONS}>
              {this.toolButtons(
                () => (this.editingKey = option.key),
                () => this.change((fields, state) => SetChange.dropAdded(fields, state, option.key))
              )}
              <button
                type="button"
                class={[CHOOSE, { [SENT]: this.isSent }]}
                aria-pressed={picked() ? "true" : "false"}
                title={this.translationForKey(picked() ? "tipNewPicked" : "tipNewChoose")}
                onClick={() => this.change((fields, state) => SetChange.toggle(fields, state, option.key))}
              >
                {this.translationForKey(picked() ? (this.isSent ? "chosenSent" : "chosenNotSent") : "choose")}
              </button>
            </span>
          </div>
          <Show when={option.note || option.shot}>
            <div class={BODY}>
              <For each={(option.note ?? "").split(/\n{2,}/).filter(Boolean)}>{(paragraph) => <p>{paragraph}</p>}</For>
              <Show when={option.shot}>
                {(shot) => (
                  <img
                    class={THUMB}
                    src={shot()}
                    alt={option.title}
                    title={this.translationForKey("zoomTip")}
                    onClick={(event: MouseEvent) => EpicChoices.zoom(event)}
                  />
                )}
              </Show>
            </div>
          </Show>
          <p class={DRAFT_LINE}>{this.translationForKey(this.isSent ? "addedSent" : "addedNotSent")}</p>
        </div>
      </Show>
    )
  }

  /**
   * A card's pencil and ✕, before its Choose pill:  shown on hover and focus (the sheet), while reviewed.
   * - `edit`, `remove`:  what each does
   * - `<ui-button>`s, round and quiet:  their icons centred by the component
   */
  toolButtons(edit: () => void, remove: () => void, letter?: string): JSX.Element {
    const name = letter ?? this.translationForKey("newLetter")
    return (
      <span class={TOOLS}>
        <ui-button
          appearance="circular basic"
          size="mini"
          icon="pen"
          aria-label={this.translationForKey("editTip", { letter: name })}
          title={this.translationForKey("editTip", { letter: name })}
          onClick={(event: MouseEvent) => {
            event.stopPropagation()
            edit()
          }}
        />
        <ui-button
          appearance="circular basic"
          size="mini"
          icon="xmark"
          aria-label={this.translationForKey("removeTip", { letter: name })}
          title={this.translationForKey("removeTip", { letter: name })}
          onClick={(event: MouseEvent) => {
            event.stopPropagation()
            remove()
          }}
        />
      </span>
    )
  }

  /** At the set's end, folded:  a standing set's Picked list, and any set's Removed list, while it has any. */
  private folded(): JSX.Element {
    return (
      <>
        <Show when={this.slottedCounts.picked}>
          {this.foldedList(this.pickedFold, PICKED_SLOT, "pickedList", this.slottedCounts.picked)}
        </Show>
        <Show when={this.slottedCounts.removed}>
          {this.foldedList(this.removedFold, REMOVED_SLOT, "removedList", this.slottedCounts.removed)}
        </Show>
      </>
    )
  }

  /** One folded list at the set's end:  its title (`Removed (1)`), and its slot's options under it. */
  private foldedList(
    fold: Fold,
    slot: typeof PICKED_SLOT | typeof REMOVED_SLOT,
    key: "pickedList" | "removedList",
    count: number
  ): JSX.Element {
    const id = `${slot}-list`
    return (
      <div class={[LIST, slot]} part={this.partForName(slot)}>
        {fold.button({
          className: TOGGLE,
          part: this.partForName("toggle"),
          controls: id,
          tips: { fold: this.translationForKey("foldListTip"), unfold: this.translationForKey("unfoldListTip") },
          label: <span class={LIST_TITLE}>{this.translationForKey(key, { count })}</span>,
          clicks: true
        })}
        <div ref={fold.watch} id={id} class={LIST_BODY} hidden={fold.hidden()}>
          <slot name={slot} />
        </div>
      </div>
    )
  }

  ////////////////
  // ## Events
  ////////////////

  /** Add choice's form saved:  the option joins the set's mark, picked (`SetChange.add()`);  the form closes. */
  @E.untracked
  private onAdded(saved: OptionFormSaved) {
    this.isAdding = false
    this.change((fields, state) => SetChange.add(fields, state, EpicChoices.optionOf(saved)))
  }

  /** An added option's form saved:  its title, note and picture changed in the mark. */
  @E.untracked
  private onAddedEdited(key: string, saved: OptionFormSaved) {
    this.editingKey = undefined
    this.change((fields, state) => SetChange.editAdded(fields, state, key, EpicChoices.optionOf(saved)))
  }

  /** What the form handed over, as an added option's fields:  empty ones left out. */
  private static optionOf(saved: OptionFormSaved): Omit<AddedOption, "key"> {
    return { title: saved.title, ...(saved.note && { note: saved.note }), ...(saved.shot && { shot: saved.shot }) }
  }

  /**
   * A click on an option's picture:  shown full size in the page's `<ui-zoom>` (`ImageZoom`).
   * - in a shadow root, which the docs runtime's listener never sees:  `ImageZoom.show()` takes it as it is
   */
  static zoom(event: MouseEvent) {
    const image = event.currentTarget as HTMLImageElement | null
    if (!image || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    event.stopPropagation()
    ImageZoom.show(image)
  }

  ////////////////
  // ## Shared with `<epic-option>`
  ////////////////

  /**
   * Is the set `element` sits in answered?  Its `chosen`, `closed`, or its `<epic-item answered>`;
   * a STANDING set never, until `closed`.
   */
  static isAnswered(element: Element): boolean {
    const choices = element.closest(CHOICES_TAG)
    if (choices?.hasAttribute(CLOSED)) return true
    if (choices?.hasAttribute(STANDING)) return false
    if (EpicChoices.chosenFor(element)) return true
    const item = element.closest(ITEM_TAG)
    return !!item && E.Converters.boolean(item.getAttribute(ANSWERED), ANSWERED)
  }

  /** The `chosen` letters of the `<epic-choices>` `element` is (or sits in), as written (`A C`), or `undefined`. */
  static chosenFor(element: Element): string | undefined {
    return element.closest(CHOICES_TAG)?.getAttribute(CHOSEN)?.trim() || undefined
  }

  /**
   * WHICH card set the `<epic-choices>` `element` is (or sits in), and what holds it (epic `epic-engine` P50):
   * - in an item:  `index`, its position among the item's sets in page order, never counting one in its Original
   *   Discussion;  `own`, the item's own (its first child set, else its first), what a pick from before I8 meant
   * - in a phase (its Choices field):  among every set in the phase, none in an Original
   * - a standing set:  itself, `index` 0, by its own id
   * - `undefined` in an Original, or with nothing to hold its marks
   * - the epic tool counts the same way (`PlanItem.choiceSets()`, `OptionSets.setsIn()`):  a pick's `choices`
   */
  static setOf(element: Element): CardSet | undefined {
    const choices = element.closest(CHOICES_TAG)
    if (!choices) return undefined
    const holder = choices.parentElement?.closest(`${ORIGINAL_TAG}, ${ITEM_TAG}, ${PHASE_TAG}`)
    if (holder?.localName === ORIGINAL_TAG) return undefined
    if (!holder) {
      const id = choices.id.toLowerCase()
      return choices.hasAttribute(STANDING) && id ? { holder: id, index: 0, own: true } : undefined
    }
    if (!holder.id) return undefined
    const sets = Array.from(holder.querySelectorAll(CHOICES_TAG)).filter(
      (each) => each.parentElement?.closest(`${ORIGINAL_TAG}, ${ITEM_TAG}, ${PHASE_TAG}`) === holder
    )
    const own = (holder.localName === ITEM_TAG && holder.querySelector(`:scope > ${CHOICES_TAG}`)) || sets[0]
    return { holder: holder.id.toLowerCase(), index: sets.indexOf(choices), own: choices === own }
  }

  /** The `status` of the item `element` sits in, or `undefined`. */
  static itemStatusFor(element: Element): string | undefined {
    return element.closest(ITEM_TAG)?.getAttribute(STATUS) ?? undefined
  }

  /**
   * Call `changed` whenever what `isAnswered()` / `chosenFor()` / `itemStatusFor()` read changes:
   * `chosen`, `closed`, the item's `answered` and `status`.  Returns how to stop.
   */
  static watch(element: Element, changed: () => void): () => void {
    // oxlint-disable-next-line spell-ui/no-mutation-observer -- watches ANCESTORS (`<epic-choices>`, `<epic-item>`)
    const observer = new MutationObserver(changed)
    const choices = element.closest(CHOICES_TAG)
    const item = element.closest(ITEM_TAG)
    if (choices) observer.observe(choices, { attributeFilter: [CHOSEN, CLOSED, MULTIPLE] })
    if (item) observer.observe(item, { attributeFilter: [ANSWERED, STATUS] })
    changed()
    return () => observer.disconnect()
  }

  /** The drawn `<epic-choices>` `element` sits in, if any. */
  static componentFor(element: Element): EpicChoices | undefined {
    const choices = element.closest(CHOICES_TAG) as E.DOMElement | null
    return choices?.component as EpicChoices | undefined
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicChoices extends E.AttributeValues<typeof epicChoicesVocabulary> {}

/** The question an answering page's choices sit in. */
const ASK_TAG = "epic-ask"

/** Class of the answered options' box. */
const PANELS = "panels"

/** `id` of that box, for its toggle's `aria-controls`. */
const PANELS_ID = "panels"

/** Class of the pick's line atop the unfolded panels (`pickNote`). */
const PICK_NOTE = "pick-note"

/** Class of the folded heading's chosen option (`Chosen:  B · Bananas`), and of its check;  a closed set's word. */
const CHOSEN_MARK = "chosen-mark"
const CHECK = "check"
const CLOSED_MARK = "closed-mark"

/** Its options' tag, and what joins a letter and a title (`B · Bananas`), as `<epic-option>` draws it. */
const OPTION_TAG = "epic-option"
const LETTER_SEPARATOR = " · "

/** Class words of an open set:  the cards' grid, the heading, its title, the words or the switch and its knob. */
const CARDS = "cards"
const HEADING = "set-heading"
const SET_TITLE = "set-title"
const MODE = "mode"
const SWITCH = "switch"
const KNOB = "knob"
/** The switch flipped from what the set says:  dashed, until sent. */
const FLIPPED = "flipped"

/** A standing set's box:  its title as its heading. */
const STANDING_CLASS = "standing"

/** Add choice, and its form in a card's place. */
const ADD = "add"
const FORM = "form"

/** An added option's card:  the classes `<epic-option>`'s cards wear, so one sheet draws both. */
const CARD = "card"
const ADDED = "added"
const PICKED = "picked"
const SENT = "sent"
const HEADER = "header"
const TITLE = "title"
const ACTIONS = "actions"
const CHOOSE = "choose"
const BODY = "body"
const THUMB = "thumb"
const DRAFT_LINE = "draft-line"
const TOOLS = "tools"

/** The folded lists at the set's end:  their slots, box, title and body. */
const PICKED_SLOT = "picked" as const
const REMOVED_SLOT = "removed" as const
const LIST = "folded-list"
const LIST_TITLE = "list-title"
const LIST_BODY = "list-body"
