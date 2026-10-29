import { For, Show, type Accessor } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E, UI } from "spell/ui/core"

import { PlanDates } from "spell/epic/dates"
import { NOBODY_LISTENING, ReviewClient, picks, type EditedOption } from "spell/epic/review"
// Import directly:  the question's class, not its barrel (which would define `<epic-ask>` here)
import { EpicAsk } from "spell/epic/components/epic-ask/EpicAsk"
import { Fold, type FoldTips } from "spell/epic/components/epic-item/Fold"
import type { EpicItem } from "spell/epic/components/epic-item/EpicItem"
// an answering option's comment box:  its barrel first, so it's defined wherever the option is
import "spell/epic/components/epic-text-box"
import { CLOSED_STATUSES } from "spell/epic/components/epic-section/EpicSection.types"
import type { OptionFormSaved } from "spell/epic/components/epic-option-form"
// Spell UI's page zoom:  its plain-DOM leaf alone, so the pack holds no second `<ui-zoom>` (as `<epic-field>`'s)
import { ImageZoom } from "spell/ui/components/ui-zoom/ImageZoom"

import { epicOptionVocabulary } from "./EpicOption.en"
import { EpicChoices } from "./EpicChoices"
import { ITEM_TAG, ORIGINAL_TAG, TOGGLE, type CardSet } from "./EpicChoices.types"
import { SetChange } from "./SetChange"

import choicesCSS from "./EpicChoices.css?inline"
import tooltipCSS from "spell/epic/components/epic-item/Tooltip.css?inline"
import picturesCSS from "./EpicOption.pictures.css?inline"

/****************
 * ### `EpicOption`
 * The component behind `<epic-option>`:  one option of a question.
 * - its header:  `A · A named palette`
 *   - a violet thumbs-up after the recommended one's title, no word (Owen, 2026-10-08)
 * - then its pros and cons:  its light children, through the default slot
 *
 * - Open question:  a CARD, its header a band at the top, open to start with.
 *   - the header is a button that folds its pros and cons (Owen, 2026-10-08:  everything in a section box folds)
 * - Answered (`EpicChoices.isAnswered()`):  a PANEL in the Choices box, folded to its header, which is a button.
 *   - the chosen one (`<epic-choices chosen>`):  marked with a green check and green text, and open to start with
 * - Either way the fold is page state;  folded, the pros and cons are `hidden="until-found"`.
 * - REVIEWED (the page's `ReviewClient` is `reviewing`:  served by the page server, its inbox answering):
 *   a "Choose" pill at the header's end (`pill()`).
 *   - a click marks its letter as the item's pick through the client (`ReviewClient.choose()`);  again, un-picks it
 *   - a pick is an action chosen:  the item folds (`EpicItem.foldAfterAction()`, Owen, 2026-10-10);
 *     an un-pick doesn't
 *   - a pick is a decision, so green, wearing the fill rule (decision Q20):
 *     - available:  the pill a grey outline
 *     - picked:  `Chosen · not sent`, the pill and the card's frame DASHED green (an answered panel:  its title green)
 *     - once sent:  `Chosen · sent`, outlined green
 *     - applied (its set's `chosen`):  `Chosen`, the pill SOLID green;
 *       a question answered with it, any other item approved with it (`epic inbox apply`)
 *   - from the pick on, the card says Chosen (Owen, 2026-10-10):  a sent pick Claude took off the inbox
 *     stays `Chosen · sent` until the doc's `chosen` reaches the page (`ReviewClient.takenPickOf()`)
 *   - WHEREVER its cards are (I8):  an item's text, a reply, More Details;
 *     the pick names its card set by position (`EpicChoices.setOf()`), as an item may hold several
 *   - on an OPEN item's cards
 *   - on a CLOSED one's (an answered question, an accepted call), but the chosen one,
 *     only while it's revisited (its note box open, a draft, a revisit or a pick):  "pick B instead, because ..."
 *   - never in an Original Discussion (`<epic-original>`):  history, not a choice
 * - EDITED IN PLACE (epic `epic-engine` P50;  Owen's comment C1), while the page is reviewed and its set is open:
 *   - a pencil and an ✕ on its band, before the pill, shown on hover and focus
 *   - the pencil turns the card into `<epic-option-form>`;  Save keeps the change in its set's mark (`SetChange`),
 *     the card showing the new title and text, dashed, `Edited · not sent`, with Undo
 *   - ✕:  the card faded, `Removed · not sent`, with Undo
 *   - applied (`epic inbox apply`):  its earlier text in its `was` slot, a folded `Was` line at its end;  a removed
 *     one moves to its set's `removed` slot (`removed`), a standing set's picked one to `picked` (`picked-on`):
 *     drawn as small panels there, no pill, no pencil
 * - Its pictures (an `<img>` in its text):  thumbnails, a page sheet's (`EpicOption.pictures.css`:  light DOM, out
 *   of reach of the shadow sheet);  a click shows one full size in the page's `<ui-zoom>` (`ImageZoom`)
 * - In a pick-any set (`multiple`), several pills are on at once;  a pick there doesn't fold the item.
 * - SIDE EFFECT:  the first one connected makes the page's `ReviewClient` (`forPage()`), which reads the inbox
 *
 * - ANSWERING, an option of an `<epic-ask>` (a page Owen answers on, epic `epic-workflow` P12):
 *   a card, drawn from its question (`ask`), which holds the picks.
 *   - its header:
 *     - the fold chevron (when it has pros and cons)
 *     - its tick box labelled by `A · title` (a click on the title ticks it)
 *     - the thumbs-up, its `badge`
 *     - at the end, the (?) of `more-details` and its state icon
 *   - pick one:  its tick box is a tab stop only when its question says so (`EpicAsk.tabStop`, a roving `tabindex`);
 *     the question moves the pick with the arrow keys
 *   - a comment box under it, always shown (`<epic-text-box>` for `<key>-<letter>`)
 *   - ticked:  framed green;  `done`, under the question's Open:  hidden
 *   - a tick, an untick or the (?) sends `ui-selected` / `ui-deselected`, which its question takes
 ****************/
export class EpicOption extends E.UIComponent<typeof epicOptionVocabulary> {
  @E.proto static vocabulary = epicOptionVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-tooltip": tooltipCSS, "epic-choices": choicesCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** The page's review inbox (`ReviewClient.forPage()`), once connected;  never on the server. */
  private review: ReviewClient | undefined

  /** It sits in an Original Discussion:  history, never a pill.  Read once connected. */
  private inOriginal = false

  ////////////////
  // ## The question
  ////////////////

  /** Its question is answered:  a panel, not a card. */
  @E.cssState("answered")
  @E.state
  accessor questionIsAnswered = EpicChoices.isAnswered(this.domElement)

  /** The chosen letter, or `undefined`. */
  @E.state accessor chosenLetter = EpicChoices.chosenFor(this.domElement)

  /** Its item's `status`:  a closed one's options take pills only while revisited. */
  @E.state accessor itemStatus = EpicChoices.itemStatusFor(this.domElement)

  /** It's a chosen option (a pick-any set's `chosen` may name several). */
  @E.cssState("chosen")
  get isChosen(): boolean {
    return !!this.letter && (this.chosenLetter ?? "").split(/\s+/).includes(this.letter)
  }

  /** Out of the cards:  removed (`removed`), or a standing set's picked one (`picked-on`);  a small panel. */
  @E.cssState("retired")
  get isRetired(): boolean {
    return !!this.removed || !!this.pickedOn
  }

  ////////////////
  // ## Edited in place (P50)
  ////////////////

  /** The drawn `<epic-choices>` it's an option of:  the set its pill, pencil and ✕ change. */
  get choices(): EpicChoices | undefined {
    void this.inboxVersion
    return EpicChoices.componentFor(this.domElement)
  }

  /** It takes the pencil and the ✕:  its set reviewed and open, it isn't retired, nor an `<epic-ask>`'s. */
  get canEdit(): boolean {
    const choices = this.choices
    return !!choices?.isReviewed && !this.questionIsAnswered && !this.isRetired && !this.ask && !!this.letter
  }

  /** Its edit in its set's mark, not applied yet;  `undefined` for none. */
  get pendingEdit(): EditedOption | undefined {
    return this.choices?.fields.edited?.find((each) => each.letter === this.letter)
  }

  /** Removed in its set's mark, not applied yet:  faded, with Undo. */
  @E.cssState("removing")
  get isRemoving(): boolean {
    return !!this.letter && !!this.choices?.fields.removed?.includes(this.letter)
  }

  /** The pencil's form is open on it. */
  @E.state accessor isEditing = false

  /** Its earlier text (its `was` slot), folded to start with. */
  readonly wasFold = new Fold(() => false)

  ////////////////
  // ## Answering:  an option of an `<epic-ask>`
  ////////////////

  /** The `<epic-ask>` it's an option of, drawn;  `undefined` for an epic page's option.  Read again as it connects. */
  @E.state accessor ask: EpicAsk | undefined = EpicOption.askFor(this.domElement)

  /** An option of an `<epic-ask>`:  a tick box and a comment box. */
  @E.cssState("answering")
  get isAnswering(): boolean {
    return !!this.ask
  }

  /** Ticked, in its question. */
  @E.cssState("ticked")
  get isTicked(): boolean {
    return !!this.ask && this.ask.isPicked(this.letter ?? "")
  }

  /**
   * Its tick box's `tabindex`:  pick one, `0` when its question's tab stop is this option, else `-1` (a roving
   * `tabindex`, I5);  pick several, none (every tick box a stop).
   */
  get tickTabIndex(): number | undefined {
    const stop = this.ask?.tabStop
    if (stop === undefined) return undefined
    return stop === this.letter ? 0 : -1
  }

  /** "Provide more details" pressed on it, in its question. */
  get wantsMore(): boolean {
    return !!this.ask && this.ask.wantsMore(this.letter ?? "")
  }

  /** Hidden by its question's filter:  `done`, while the filter shows Open. */
  @E.cssState("filtered")
  get isFiltered(): boolean {
    return !!this.ask?.hidesDone && !!this.done
  }

  /** Its state icon (`state-icon`). */
  readonly stateGlyph = new E.IconGlyph({ owner: this, name: () => (this.ask ? this.stateIcon : undefined) })

  /** The (?) of "Provide more details". */
  readonly moreGlyph = new E.IconGlyph({
    owner: this,
    name: () => (this.ask?.moreDetails ? MORE_ICON : undefined)
  })

  /** The drawn `<epic-ask>` `element` is an option of, if any. */
  private static askFor(element: Element): EpicAsk | undefined {
    const host = EpicAsk.askOf(element) as E.DOMElement | null
    return host?.component as EpicAsk | undefined
  }

  /** While connected, find its question again:  it may have moved. */
  @E.whileConnected
  protected findAsk() {
    this.ask = EpicOption.askFor(this.domElement)
    return undefined
  }

  ////////////////
  // ## Folding
  ////////////////

  /**
   * Open or folded, until the reader says otherwise:
   * a card (open question) open;  an answered panel open while it's the chosen one.
   */
  readonly fold = new Fold(() => (!this.questionIsAnswered && !this.isRetired) || this.isChosen)

  /** Light-DOM slot occupancy:  has it pros and cons? */
  readonly slots = new E.SlotContent(this.domElement)

  /** Does its header fold it?  An answered or retired panel always;  a card with pros and cons. */
  get canFold(): boolean {
    return this.questionIsAnswered || this.isRetired || this.slots.hasContent("")
  }

  /** Unfolded (a card or panel that folds). */
  @E.cssState("open")
  get isOpen(): boolean {
    return this.canFold && this.fold.isOpen()
  }

  /** The recommended one's mark:  a violet thumbs-up, no word (Owen, 2026-10-08, decision Q20's Q6). */
  readonly thumbsUp = new E.IconGlyph({ owner: this, name: () => (this.recommended ? RECOMMENDED_ICON : undefined) })

  ////////////////
  // ## The Choose pill
  ////////////////

  /** The page's review inbox's `version` as last seen:  bumped on every change, so `pill` follows the inbox. */
  @E.state accessor inboxVersion = 0

  /**
   * Its Choose pill, while the page is reviewed and the option takes one (see the banner);  else `undefined`.
   * - reads the client through `inboxVersion`:  the client itself isn't reactive
   */
  get pill(): PillState | undefined {
    void this.inboxVersion
    const client = this.review
    const letter = this.letter
    const set = this.cardSet()
    const id = set?.holder
    if (!client?.reviewing || !id || !letter || !set || this.isRetired || this.isRemoving) return undefined
    if (this.choices?.closed) return undefined
    const listening = client.listening
    const mark = client.markOf(id)
    // applied:  its set's `chosen`, solid (the fill rule's done);  a pick-any set's mark may take it off again
    const multiple = !!this.choices?.isMultiple
    const markPicks = this.choices?.fields.pick !== undefined
    if (this.isChosen && (!multiple || !markPicks || picks(mark, letter, set.index, set.own)))
      return { picked: true, sent: true, applied: true, listening }
    // Claude took the pick off the inbox, and the doc's `chosen` isn't on the page yet:  still Chosen, sent
    const taken = !mark && !this.chosenLetter && picks(client.takenPickOf(id), letter, set.index, set.own)
    const closed = (CLOSED_STATUSES as readonly string[]).includes(this.itemStatus ?? "")
    const revisiting =
      client.isBoxOpen(id) || !!client.draftOf(id) || mark?.action === "revisit" || !!mark?.pick || taken
    if (closed && !revisiting) return undefined
    if (taken) return { picked: true, sent: true, applied: false, listening }
    const picked = picks(mark, letter, set.index, set.own)
    return { picked, sent: picked && !!mark && client.isSent(mark), applied: false, listening }
  }

  /**
   * Which card set of its item it's in (`EpicChoices.setOf()`):  what its pick names (I8);
   * `undefined` in an Original Discussion (history:  never a pill), or outside an item.
   */
  private cardSet(): CardSet | undefined {
    return this.inOriginal ? undefined : EpicChoices.setOf(this.domElement)
  }

  /** Its letter is the item's pick, in review (P10), not applied yet (applied:  `chosen`). */
  @E.cssState("picked")
  get isPicked(): boolean {
    return !!this.pill?.picked && !this.pill.applied
  }

  /**
   * Words before the noun:  card or panel, `chosen`, `picked` in review, and `sent` once that pick has gone;
   * `edited` / `removing` with a change not applied yet (dashed until sent, as a pick).
   */
  protected get extraClass(): string | undefined {
    const changed = !!this.pendingEdit || this.isRemoving
    const sent = (this.isPicked && this.pill?.sent) || (changed && this.choices?.isSent)
    const classes = [
      this.questionIsAnswered || this.isRetired ? PANEL : CARD,
      this.pendingEdit && EDITED,
      this.isRemoving && REMOVING,
      this.isChosen && CHOSEN_CLASS,
      this.isPicked && PICKED,
      sent && SENT,
      this.isAnswering && ANSWERING,
      this.isTicked && TICKED
    ]
    return classes.filter(Boolean).join(" ")
  }

  ////////////////
  // ## Rendering
  ////////////////

  /**
   * While connected:  follow its question -- answered, the chosen letter, its item's status.  Returns the undo.
   * - `EpicChoices.watch()`'s own `MutationObserver`, not `@watches`:
   *   it watches its `<epic-choices>` and `<epic-item>`, ANCESTORS.
   */
  @E.whileConnected
  protected watchQuestion() {
    return EpicChoices.watch(this.domElement, () => {
      this.questionIsAnswered = EpicChoices.isAnswered(this.domElement)
      this.chosenLetter = EpicChoices.chosenFor(this.domElement)
      this.itemStatus = EpicChoices.itemStatusFor(this.domElement)
    })
  }

  render(): JSX.Element {
    return (
      <div class={this.rootClass} part={this.partForName("base")}>
        <Show when={this.isEditing && this.canEdit} fallback={this.card()}>
          <epic-option-form
            heading={this.translationForKey("editHeading", { letter: this.letter ?? "" })}
            option-title={this.pendingEdit?.title ?? this.title ?? this.textOf("title")}
            note={this.pendingEdit?.note ?? this.textOf("")}
            for={this.cardSet()?.holder ?? ""}
            on-epic-option-saved={(event: CustomEvent<OptionFormSaved>) => this.onEdited(event.detail)}
            on-epic-option-canceled={() => (this.isEditing = false)}
          />
        </Show>
      </div>
    )
  }

  /**
   * The card (or panel) as it stands:  its header, then its pros and cons -- an edit not applied yet shows its new
   * text instead -- its earlier text folded (`Was`), and a line for a change not applied yet, with Undo.
   */
  private card(): JSX.Element {
    return (
      <>
        <Show when={this.ask} fallback={this.reviewHeader()}>
          {(ask) => this.answeringHeader(ask)}
        </Show>
        <div
          ref={this.fold.watch}
          id={BODY_ID}
          class={[BODY, { [EMPTY]: !this.slots.hasContent("") && !this.pendingEdit?.note && !this.hasWas }]}
          part={this.partForName("body")}
          hidden={this.canFold ? this.fold.hidden() : undefined}
        >
          <Show when={this.pendingEdit?.note} fallback={<slot />}>
            {(note) => (
              <For
                each={note()
                  .split(/\n{2,}/)
                  .filter(Boolean)}
              >
                {(paragraph) => <p class={NEW_TEXT}>{paragraph}</p>}
              </For>
            )}
          </Show>
          <Show when={this.pickedOn}>
            <p class={DRAFT_LINE}>{this.translationForKey("pickedOn", { date: PlanDates.format(this.pickedOn) })}</p>
          </Show>
          <Show when={this.hasWas}>{this.was()}</Show>
        </div>
        <Show when={this.pendingEdit || this.isRemoving}>{this.changeLine()}</Show>
        <Show when={this.ask}>
          {(ask) => (
            <div class={[COMMENT, { [OPEN]: this.commentOpen }]}>
              <button
                type="button"
                class={COMMENT_LINK}
                part={this.partForName("comment-link")}
                aria-expanded={this.commentOpen ? "true" : "false"}
                onClick={(event: MouseEvent) => this.openComment(event)}
              >
                <ui-icon name="comment" />
                {this.translationForKey("commentLink")}
              </button>
              <epic-text-box
                part={this.partForName("comment")}
                type="comment"
                for={`${ask().key}-${this.letter ?? ""}`}
                placeholder={this.translationForKey("commentOn", { letter: this.letter ?? "" })}
                label={this.translationForKey("commentLabel", { letter: this.letter ?? "", title: this.title ?? "" })}
              />
            </div>
          )}
        </Show>
      </>
    )
  }

  /** Has it earlier text, kept in its `was` slot? */
  get hasWas(): boolean {
    return this.slots.hasContent(WAS_SLOT)
  }

  /** Its earlier text, at its body's end:  a folded `Was` line, its `was` slot under it. */
  private was(): JSX.Element {
    return (
      <div class={WAS} part={this.partForName("was")}>
        {this.wasFold.button({
          className: TOGGLE,
          part: this.partForName("toggle"),
          controls: WAS_ID,
          tips: { fold: this.translationForKey("foldWasTip"), unfold: this.translationForKey("unfoldWasTip") },
          label: <span class={WAS_TITLE}>{this.translationForKey("was")}</span>,
          clicks: true
        })}
        <div ref={this.wasFold.watch} id={WAS_ID} class={WAS_BODY} hidden={this.wasFold.hidden()}>
          <slot name={WAS_SLOT} />
        </div>
      </div>
    )
  }

  /** A change not applied yet:  `Edited · not sent` / `Removed · sent` ..., and Undo. */
  private changeLine(): JSX.Element {
    const key = () =>
      `${this.isRemoving ? "removed" : "edited"}${this.choices?.isSent ? "Sent" : "NotSent"}` as
        | "removedSent"
        | "removedNotSent"
        | "editedSent"
        | "editedNotSent"
    return (
      <p class={DRAFT_LINE} part={this.partForName("change")}>
        {this.translationForKey(key())}
        <Show when={this.choices?.isReviewed}>
          <button type="button" class={UNDO} title={this.translationForKey("undoTip")} onClick={() => this.onUndo()}>
            {this.translationForKey("undo")}
          </button>
        </Show>
      </p>
    )
  }

  /** The text of its `slot` (`""`:  its pros and cons), as the form starts with it:  paragraphs, a blank line between. */
  @E.untracked
  private textOf(slot: string): string {
    const children = Array.from(this.domElement.children).filter((child) => (child.getAttribute("slot") ?? "") === slot)
    return children
      .map((child) => (child.textContent ?? "").replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join("\n\n")
  }

  /**
   * An answering option's header (`ask`, `<Show>`'s accessor):  the fold chevron (with pros and cons), the tick box
   * labelled by `A · title` and the thumbs-up, the badge;  at its end the (?) and the state icon.
   */
  private answeringHeader(ask: Accessor<EpicAsk>): JSX.Element {
    return (
      <div class={HEADER} part={this.partForName("header")}>
        <Show
          when={this.canFold}
          fallback={
            <span class={TOGGLE} part={this.partForName("toggle")}>
              {this.reviewTitle()}
            </span>
          }
        >
          {this.fold.button({
            className: TOGGLE,
            part: this.partForName("toggle"),
            controls: BODY_ID,
            tips: this.foldTips,
            label: this.reviewTitle(),
            clicks: true
          })}
        </Show>
        <Show when={this.badge}>
          <ui-label
            class={BADGE}
            part={this.partForName("badge")}
            size="mini"
            appearance="basic"
            color={this.badgeColor ?? "grey"}
          >
            {this.badge}
          </ui-label>
        </Show>
        <span class={MARKS}>
          <Show when={ask().moreDetails}>
            <button
              type="button"
              class={MORE}
              part={this.partForName("more")}
              aria-pressed={this.wantsMore ? "true" : "false"}
              aria-label={this.translationForKey("moreTip")}
              title={this.translationForKey("moreTip")}
              onClick={this.onMore}
            >
              {this.moreGlyph.svg}
            </button>
          </Show>
          <Show when={this.stateIcon}>
            <span
              class={STATE_MARK}
              part={this.partForName("state")}
              data-color={this.stateColor ?? "grey"}
              role="img"
              aria-label={this.stateLabel ?? this.stateIcon}
              title={this.stateLabel}
            >
              {this.stateGlyph.svg}
            </span>
          </Show>
        </span>
        <span class={ACTIONS}>
          <button
            type="button"
            class={[CHOOSE, { [TICKED]: this.isTicked }]}
            part={this.partForName("tick")}
            role={ask().isMultiple ? "checkbox" : "radio"}
            aria-checked={this.isTicked ? "true" : "false"}
            aria-label={`${this.translationForKey(this.isTicked ? "chosen" : "choose")}:  ${this.letter ?? ""}${LETTER_SEPARATOR}${this.title ?? ""}`}
            tabindex={this.tickTabIndex}
            title={this.translationForKey(this.isTicked ? "tipTicked" : "tipChoose", { letter: this.letter ?? "" })}
            onClick={this.onTick}
          >
            {this.translationForKey(this.isTicked ? "chosen" : "choose")}
          </button>
        </span>
      </div>
    )
  }

  /** The recommended one's thumbs-up, after its title:  violet, no word. */
  private recommendedMark(): JSX.Element {
    return (
      <Show when={this.recommended}>
        {" "}
        <span
          class={RECOMMENDED}
          part={this.partForName("recommended")}
          role="img"
          aria-label={this.translationForKey("recommended")}
          title={this.translationForKey("recommended")}
        >
          {this.thumbsUp.svg}
        </span>
      </Show>
    )
  }

  /** Its fold button's tooltips, naming its letter (`foldTipsOf()`). */
  private readonly foldTips: FoldTips = EpicOption.foldTipsOf(this)

  /** `option`'s fold button's tooltips:  getters, read as the button draws, so they follow its letter. */
  private static foldTipsOf(option: EpicOption): FoldTips {
    return {
      get fold() {
        return option.translationForKey("foldTip", { letter: option.letter ?? "" })
      },
      get unfold() {
        return option.translationForKey("unfoldTip", { letter: option.letter ?? "" })
      }
    }
  }

  /**
   * An epic page's option's header:  the fold toggle (its whole title, THE fold button:  `fold.button()`), the Choose
   * pill while reviewed.
   * - nothing to fold (a card with no pros and cons):  its title, no button
   */
  private reviewHeader(): JSX.Element {
    return (
      <div class={HEADER} part={this.partForName("header")}>
        <Show
          when={this.canFold}
          fallback={
            <span class={TOGGLE} part={this.partForName("toggle")}>
              {this.reviewTitle()}
            </span>
          }
        >
          {this.fold.button({
            className: TOGGLE,
            part: this.partForName("toggle"),
            controls: BODY_ID,
            tips: this.foldTips,
            label: this.reviewTitle(),
            clicks: true
          })}
        </Show>
        <Show when={this.canEdit && !this.isRemoving}>
          <span class={ACTIONS}>
            {this.choices?.toolButtons(
              () => (this.isEditing = true),
              () => this.onRemove(),
              this.letter
            )}
          </span>
        </Show>
        <Show when={this.pill}>{(pill) => this.pillButton(pill)}</Show>
      </div>
    )
  }

  /** A reviewed option's title, after the chevron:  its check once chosen, `A · title` and the thumbs-up. */
  private reviewTitle(): JSX.Element {
    return (
      <>
        <Show when={this.isChosen && this.questionIsAnswered}>
          <svg class={CHECK} part={this.partForName("check")} viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2.5 8.5l3.5 3.5 7.5-8" />
          </svg>
        </Show>
        <span class={TITLE} part={this.partForName("title")}>
          {this.letter}
          {LETTER_SEPARATOR}
          <Show when={this.pendingEdit} fallback={<slot name={this.slotForName("title")}>{this.title}</slot>}>
            {(edit) => <span class={NEW_TEXT}>{edit().title}</span>}
          </Show>
          {this.recommendedMark()}
        </span>
      </>
    )
  }

  /**
   * The Choose pill, at the header's end;  its words from `pillLabel()`:
   * - `Choose`:  a grey outline
   * - picked:  `Chosen · not sent`, dashed green
   * - sent:  `Chosen · sent`, outlined green
   * - applied (its set's `chosen`):  `Chosen`, solid green, and a click does nothing
   * - its tooltip says what a click does, and whether the pick has gone to Claude
   * - `pill`:  `<Show>`'s accessor, read in each binding:
   *   the callback's body runs once, so a value read there would never change
   */
  private pillButton(pill: Accessor<PillState>): JSX.Element {
    return (
      <span class={ACTIONS} part={this.partForName("actions")}>
        <button
          type="button"
          class={[CHOOSE, { [SENT]: pill().sent && !pill().applied, [APPLIED]: pill().applied }]}
          part={this.partForName("choose")}
          aria-pressed={pill().picked ? "true" : "false"}
          aria-disabled={pill().applied ? "true" : undefined}
          title={this.pillTip(pill())}
          onClick={this.onChoose}
        >
          {this.translationForKey(pillLabel(pill()))}
        </button>
      </span>
    )
  }

  /**
   * The pill's tooltip:  `Pick B`;  picked, `B is picked:  click to un-pick · sent` (or `not sent yet`);
   * applied, `B is the chosen option`.
   */
  private pillTip(pill: PillState): string {
    const letter = this.letter ?? ""
    if (pill.applied) return this.translationForKey("tipApplied", { letter })
    if (!pill.picked) return this.translationForKey("tipChoose", { letter })
    const where = this.translationForKey(pill.sent ? "tipSent" : "tipNotSent")
    const tip = `${this.translationForKey("tipChosen", { letter })} · ${where}`
    return pill.sent && !pill.listening ? `${tip}.  ${NOBODY_LISTENING}` : tip
  }

  ////////////////
  // ## Events
  ////////////////

  /** Answering:  its tick box changed:  its question hears it (`ui-selected` / `ui-deselected`);  unticked, its (?) goes off too. */
  private readonly onTick = (event: Event) => {
    event.stopPropagation()
    const selected = !this.isTicked
    this.send(selected ? "ui-selected" : "ui-deselected", {
      letter: this.letter ?? "",
      selected,
      more: selected && this.wantsMore
    })
  }

  /**
   * Answering:  its comment box folds under a Comment link (epic `epic-engine` P50, Q55), until Owen opens it;  a box
   * with text in it (a draft put back) shows by itself (the sheet:  `:state(filled)`).
   */
  @E.state accessor commentOpen = false

  /** The Comment link:  its box opens, and takes the focus. */
  @E.untracked
  private openComment(event: MouseEvent) {
    this.commentOpen = true
    const box = (event.currentTarget as Element).parentElement?.querySelector("epic-text-box") as HTMLElement | null
    E.afterSolidUpdate(() => box?.focus())
  }

  /** Answering:  its (?) pressed:  on, it's ticked too;  off, its tick stays as it is. */
  private readonly onMore = () => {
    const more = !this.wantsMore
    const selected = more || this.isTicked
    this.send(selected ? "ui-selected" : "ui-deselected", { letter: this.letter ?? "", selected, more })
  }

  /**
   * A click on its Choose pill:
   * - pick its letter in its card set (by the set's position:  I8), and fold the item
   * - or un-pick it when it's the pick
   * - applied already (its set's `chosen`):  nothing
   */
  private readonly onChoose = (event: MouseEvent) => {
    // a panel's header folds on a click;  the item's line would too
    event.stopPropagation()
    const letter = this.letter
    const choices = this.choices
    const pill = this.pill
    const multiple = !!choices?.isMultiple
    if (!choices || !letter || !this.cardSet() || (pill?.applied && !multiple)) return
    // the set's one mark, its other changes kept (`SetChange`);  a failed write is the client's own notice
    choices.change((fields, state) => SetChange.toggle(fields, state, letter))
    // pick any:  Owen may pick more, so the item stays open
    if (!pill?.picked && !multiple) this.itemComponent()?.foldAfterAction()
  }

  /** The pencil's form saved:  its new title and note in its set's mark;  the form closes. */
  @E.untracked
  private onEdited(saved: OptionFormSaved) {
    const letter = this.letter
    this.isEditing = false
    if (letter) this.choices?.change((fields, state) => SetChange.edit(fields, state, letter, saved.title, saved.note))
  }

  /** Its ✕:  removed in its set's mark, faded, with Undo. */
  @E.untracked
  private onRemove() {
    const letter = this.letter
    if (letter) this.choices?.change((fields, state) => SetChange.remove(fields, state, letter))
  }

  /** Undo on a change not applied yet:  its removal, else its edit, out of the mark. */
  @E.untracked
  private onUndo() {
    const letter = this.letter
    if (!letter) return
    const removing = this.isRemoving
    this.choices?.change((fields, state) =>
      removing ? SetChange.undoRemove(fields, state, letter) : SetChange.undoEdit(fields, state, letter)
    )
  }

  /**
   * A click on one of its pictures (an `<img>` in its text):  shown full size (`ImageZoom`), never its link.
   * - the docs runtime takes every other image's click on the page;  this one is for a page without it (Epic UI's)
   */
  @E.on("click")
  protected onPictureClick(event: MouseEvent) {
    if ((event.target as Element | null)?.closest?.("img")) ImageZoom.onClick(event)
  }

  /** Its pictures are thumbnails:  the page sheet that draws them, registered once per page. */
  @E.whileConnected
  protected registerPictures() {
    if (isServer) return undefined
    // the runtime may still be loading as the first option connects
    void UI.load()
      .then((runtime) => {
        if (!runtime.styles.has(PICTURES_PAGE_SHEET))
          runtime.styles.register(PICTURES_PAGE_SHEET, picturesCSS, { page: true })
      })
      .catch((error: unknown) => console.error(error))
    return undefined
  }

  /** The `<epic-item>` it belongs to, drawn;  else `undefined`. */
  private itemComponent(): EpicItem | undefined {
    const item = this.domElement.closest(ITEM_TAG) as E.DOMElement | null
    return item?.component as EpicItem | undefined
  }

  /**
   * While connected, follow the page's review inbox;  returns the undo.
   * - the client made (or found), the item's id read
   * - `inboxVersion` bumped on each of its changes
   */
  @E.whileConnected
  protected followReview(): () => void {
    const client = ReviewClient.forPage()
    this.review = client
    this.inOriginal = !!this.domElement.closest(ORIGINAL_TAG)
    this.inboxVersion = client.version
    return client.subscribe(() => (this.inboxVersion = client.version))
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicOption extends E.AttributeValues<typeof epicOptionVocabulary> {}

/** What an option's Choose pill shows:  is its letter the item's pick, has that gone to Claude, does anyone listen. */
export type PillState = {
  /** its letter is the item's pick */
  picked: boolean
  /** picked, and the mark carrying the pick has gone to Claude */
  sent: boolean
  /** its letter is its set's `chosen`:  the pick applied (solid, and a click does nothing) */
  applied: boolean
  /** a Claude session waits on the inbox */
  listening: boolean
}

/**
 * The pill's words, which say where the pick stands (Owen, 2026-10-10:  "losing the Chosen marker"):
 * `Choose`;  picked, `Chosen · not sent`, then `Chosen · sent`;  applied, `Chosen`.
 */
function pillLabel(pill: PillState): "choose" | "chosenNotSent" | "chosenSent" | "chosen" {
  if (!pill.picked) return "choose"
  if (pill.applied) return "chosen"
  return pill.sent ? "chosenSent" : "chosenNotSent"
}

/** Class names inside the shadow root. */
const HEADER = "header"
const CHECK = "check"
const TITLE = "title"
const RECOMMENDED = "recommended"

/** The recommended option's icon, after its title. */
const RECOMMENDED_ICON = "thumbs up"
const ACTIONS = "actions"
const CHOOSE = "choose"
const BODY = "body"

/** Class words on the box:  answered (a panel, not a card), chosen, picked in review (P10). */
const PANEL = "panel"
const CARD = "card"
const CHOSEN_CLASS = "chosen"
const PICKED = "picked"

/** Class word on a picked pill whose mark has gone to Claude:  outlined, not filled. */
const SENT = "sent"

/** Class word on the pill of its set's chosen option:  the pick applied, solid. */
const APPLIED = "applied"

/** Class words of an answering option (an `<epic-ask>`'s):  the box, ticked. */
const ANSWERING = "answering"
const TICKED = "ticked"

/** An answering option's pill, ticked:  its look, the card's frame. */

/** Classes of an answering option's badge, the box at its header's end, the (?), its state icon, its comment box. */
const BADGE = "badge"
const MARKS = "marks"
const MORE = "more"
const STATE_MARK = "state-mark"
const COMMENT = "comment"
const COMMENT_LINK = "comment-link"
const OPEN = "open"

/** The (?) of "Provide more details". */
const MORE_ICON = "circle question"

/** The body's class word with no pros and cons:  not drawn. */
const EMPTY = "empty"

/** `id` of its body, for its header's `aria-controls`. */
const BODY_ID = "body"

/** Between an option's letter and its title:  `A · A named palette`. */
const LETTER_SEPARATOR = " · "

/** Class words of a change not applied yet (P50):  edited, removed;  its line, its Undo, the new text. */
const EDITED = "edited"
const REMOVING = "removing"
const DRAFT_LINE = "draft-line"
const UNDO = "undo"
const NEW_TEXT = "new-text"

/** Its earlier text:  the slot, its box, title and body, and the body's `id`. */
const WAS_SLOT = "was"
const WAS = "was"
const WAS_TITLE = "list-title"
const WAS_BODY = "list-body"
const WAS_ID = "was-body"

/** The page sheet that draws its pictures as thumbnails. */
const PICTURES_PAGE_SHEET = "epic-option-pictures"
