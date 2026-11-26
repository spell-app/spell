import { For, Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell/ui/core"

import { BellSteps, type BellGroup, type BellStep, type BellsValues, type BurnLevel } from "spell/epic/bells"
import { DEFAULT_AUTO_SEND, SendCountdown, ServerLink, type AutoSend } from "spell/epic/review"

import { epicBellsVocabulary } from "./EpicBells.en"
import { BELLS_API, type BellsAnswer, type BellsTextKey, type EpicBellsVocabulary } from "./EpicBells.types"

import bellsCSS from "./EpicBells.css?inline"

/****************
 * ### `DOMEpicBellsElement`
 * The DOM element of `<epic-bells>`:  its script API, which `<epic-page>` calls (the gear's Bells & Whistles).
 * - Above `EpicBells`:  its `elementSetup` reads it while the class is defined.
 ****************/
export class DOMEpicBellsElement extends E.DOMElement<EpicBells> {
  /** Open it, reading the switches afresh.  Nothing before its component exists. */
  show(): void {
    this.component?.show()
  }

  /** Close it, dropping what wasn't saved. */
  close(): void {
    this.component?.close()
  }

  /** It's showing. */
  get open(): boolean {
    return this.component?.isOpen ?? false
  }
}

/****************
 * ### `EpicBells`
 * The component behind `<epic-bells>`:  BELLS & WHISTLES (epic `epic-engine` P86;  Owen, 2026-11-26:  "make a list of
 * all of the things that are expensive / that someone might want to turn off and let's make a modal in the epic doc
 * gear menu to turn them on and off").
 * - Spell UI's `<ui-modal>`:  the browser's top layer;  its ×, Escape and Cancel drop what wasn't saved, Save keeps it
 * - it fills the window (the side bar's pane, the browser's), 20px from each edge, at every size;  only its rows
 *   scroll (T173)
 * - TOKEN BURN, in the footer at the left, Cancel / Save at the right (T173):  its name, then a three-stop
 *   `<ui-slider>` (Low, Medium, High), no tick marks, that sets the switches above at once (`BellSteps.withBurn()`);
 *   a switch flipped while it's down shows a Custom chip beside its name (`BellSteps.burnShown()`), the only time it
 *   has one:  the slider shows the level itself (T171)
 * - a section per group, in `BellSteps.STEPS`' order (by cost, the costliest first);  each row a toggle with its cost
 *   badge under it, in one column, then the bold title and one sentence, the full width left (T171)
 * - every rule is `BellSteps`':  this draws a DRAFT of the settings' `bells` group and asks it
 * - read and saved through the page server (`GET` / `POST /api/epics/settings`, `ServerLink`):  the person's own
 *   epic settings, one set for every epic
 * - Auto Send's row is the page's own choice, in this browser (`SendCountdown`):  on is 2 minutes, off is Off
 * - Drawn by `<epic-page>` in its shadow root;  never written in a page.
 * - SIDE EFFECT:  Save writes the settings file;  Auto Send's row, the browser's choice.
 ****************/
export class EpicBells extends E.UIComponent<EpicBellsVocabulary> {
  @E.proto static vocabulary = epicBellsVocabulary
  @E.protoMerged static elementSetup = {
    DOMElement: DOMEpicBellsElement,
    styleSheets: { "epic-bells": bellsCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## State
  ////////////////

  /** Showing. */
  @E.cssState("open")
  @E.state
  accessor isOpen = false

  /** The settings' `bells` group as changed here, not saved yet;  none until read. */
  @E.state accessor draft: BellsValues | undefined = undefined

  /** Auto Send as changed here, not saved yet. */
  @E.state accessor autoSend: AutoSend = DEFAULT_AUTO_SEND

  /** What's said beside the slider:  loading, or why a save failed;  else nothing. */
  @E.state accessor note = ""

  /** A save is on its way. */
  @E.state accessor isSaving = false

  /** The page's countdown, whose choice is Auto Send;  none in a server render. */
  private readonly countdown = isServer ? undefined : SendCountdown.forPage()

  /** The modal, as drawn. */
  private modal: (HTMLElement & { visible?: boolean }) | undefined

  ////////////////
  // ## Opening, saving, closing
  ////////////////

  /** Open it:  the switches read afresh from the page server. */
  @E.untracked
  show() {
    this.autoSend = this.countdown?.choice ?? DEFAULT_AUTO_SEND
    this.isOpen = true
    void this.load()
  }

  /** Close it, dropping the draft. */
  @E.untracked
  close() {
    this.isOpen = false
    this.note = ""
  }

  /** Read the switches.  NEVER throws:  a failure is said under the slider. */
  private async load() {
    if (!this.draft) this.note = this.translationForKey("loading")
    try {
      const answer = await ServerLink.forPage().get<BellsAnswer>(BELLS_API)
      if (answer) this.draft = answer.values
      this.note = ""
    } catch (failure) {
      this.note = this.translationForKey("unsaved", { why: (failure as Error).message })
    }
  }

  /** Save the draft and Auto Send, then close.  NEVER throws:  a refusal is said, and it stays open. */
  @E.untracked
  async save() {
    const draft = this.draft
    if (!draft || this.isSaving) return
    this.isSaving = true
    try {
      const answer = (await ServerLink.forPage().post(BELLS_API, { values: draft })) as BellsAnswer
      this.draft = answer.values
      if (this.countdown && this.countdown.choice !== this.autoSend) this.countdown.choose(this.autoSend)
      this.close()
    } catch (failure) {
      this.note = this.translationForKey("unsaved", { why: (failure as Error).message })
    } finally {
      this.isSaving = false
    }
  }

  /** Shown or hidden:  the modal follows. */
  @E.onChange("isOpen", "isReady")
  protected followOpen(open: boolean, ready: boolean) {
    const modal = this.modal
    if (!ready || isServer || !modal) return
    // the modal's family may load after it's drawn:  its `visible` then
    void E.DOMElement.whenAttached("ui-modal").then(() => {
      if (modal.visible !== open) modal.visible = open
    })
  }

  /** The modal closed itself (Escape):  closed here too, the draft dropped. */
  private readonly onModalClosed = () => {
    if (this.isOpen) this.close()
  }

  ////////////////
  // ## The draft
  ////////////////

  /** What the slider reads now:  a level, or `custom`. */
  get shown(): BurnLevel | "custom" {
    return this.draft ? BellSteps.burnShown(this.draft) : "high"
  }

  /** The slider moved to stop `index` (0 Low, 1 Medium, 2 High). */
  @E.untracked
  private moveBurn(index: number) {
    const level = BellSteps.BURN_LEVELS[index]
    if (this.draft && level) this.draft = BellSteps.withBurn(this.draft, level)
  }

  /** A step's switch flipped. */
  @E.untracked
  private flip(step: BellStep, on: boolean) {
    if (step.inBrowser) this.autoSend = on ? DEFAULT_AUTO_SEND : "off"
    else if (this.draft) this.draft = BellSteps.withSwitch(this.draft, step.key, on)
  }

  /** Is `step` on in the draft? */
  private isOn(step: BellStep): boolean {
    if (step.inBrowser) return this.autoSend !== "off"
    return this.draft ? BellSteps.stateOf(this.draft, step.key).on : true
  }

  /** A switch's tooltip:  why the slider holds it off, or that a flip is for now;  else none. */
  private tipOf(step: BellStep): string | undefined {
    if (step.inBrowser) return this.translationForKey("autoSendNote")
    const state = this.draft && BellSteps.stateOf(this.draft, step.key)
    if (state?.why === "burn") return this.translationForKey("heldOff")
    if (this.draft && this.draft.burn !== "high" && step.key in this.draft.burnFlips)
      return this.translationForKey("flipped")
    return undefined
  }

  ////////////////
  // ## Drawing
  ////////////////

  render(): JSX.Element {
    return (
      <ui-modal
        ref={(modal: HTMLElement) => this.adoptModal(modal)}
        class="bells-modal"
        part={this.partForName("base")}
        closedby="closerequest"
        aria-label={this.translationForKey("heading")}
      >
        <div class={[this.rootClass, "bells"]}>
          <div class="head">
            <h2 class="heading">{this.translationForKey("heading")}</h2>
            <ui-button
              class="close"
              appearance="circular basic"
              size="mini"
              icon="xmark"
              aria-label={this.translationForKey("closeTip")}
              data-tooltip={this.translationForKey("closeTip")}
              onClick={() => this.close()}
            />
          </div>
          <p class="lede">{this.translationForKey("lede")}</p>
          <div class="scroller">
            <For each={BellSteps.GROUPS}>{(group) => this.group(group)}</For>
            <p class="servers">{this.translationForKey("servers")}</p>
          </div>
          <div class="actions">
            {this.burn()}
            <ui-button class="cancel" appearance="basic" onClick={() => this.close()}>
              {this.translationForKey("cancel")}
            </ui-button>
            <ui-button
              class="save"
              appearance="primary"
              disabled={this.draft && !this.isSaving ? undefined : ""}
              onClick={() => void this.save()}
            >
              {this.translationForKey("save")}
            </ui-button>
          </div>
        </div>
      </ui-modal>
    )
  }

  /**
   * The Token burn slider, the footer's left:  its name (and Custom, once a switch was flipped below High), the three
   * stops;  under them only a note (loading, a refused save).
   */
  private burn(): JSX.Element {
    return (
      <div class="burn" part={this.partForName("burn")} data-shown={this.shown}>
        <div class="burn-head">
          <span class="burn-name">{this.translationForKey("burn")}</span>
          <Show when={this.shown === "custom"}>
            <ui-label
              class="burn-custom"
              size="mini"
              color="orange"
              data-tooltip={this.translationForKey("customLine")}
            >
              {this.translationForKey("custom")}
            </ui-label>
          </Show>
        </div>
        <ui-slider
          class="burn-slider"
          min="0"
          max="2"
          step="1"
          labeled=""
          disabled={this.draft ? undefined : ""}
          step-labels={BellSteps.BURN_LEVELS.map((level) => this.translationForKey(level))}
          value={BellSteps.BURN_LEVELS.indexOf(this.draft?.burn ?? "high")}
          aria-label={this.translationForKey("burn")}
          ref={(slider: HTMLElement) =>
            slider.addEventListener("ui-changed", ((event: CustomEvent<{ value: number }>) =>
              this.moveBurn(event.detail.value)) as EventListener)
          }
        />
        <Show when={this.note}>
          <p class="burn-note">{this.note}</p>
        </Show>
      </div>
    )
  }

  /** A group's section:  its title, then a row per step. */
  private group(group: BellGroup): JSX.Element {
    return (
      <section class="group" part={this.partForName("group")}>
        <h3 class="group-title">{this.words(group)}</h3>
        <For each={BellSteps.STEPS.filter((step) => step.group === group)}>{(step) => this.row(step)}</For>
      </section>
    )
  }

  /** A step's row:  its switch with its cost under it, then its bold title and sentence. */
  private row(step: BellStep): JSX.Element {
    return (
      <div class="row" part={this.partForName("row")} data-step={step.key}>
        <div class="side">
          <ui-checkbox
            class="switch"
            appearance="toggle"
            padding="none"
            selected={this.isOn(step) ? "" : undefined}
            disabled={this.draft || step.inBrowser ? undefined : ""}
            aria-label={this.words(step.key)}
            data-tooltip={this.tipOf(step)}
            ref={(box: HTMLElement) =>
              box.addEventListener("ui-changed", ((event: CustomEvent<{ selected: boolean }>) =>
                this.flip(step, event.detail.selected)) as EventListener)
            }
          />
          <ui-label
            class={["cost", step.cost]}
            part={this.partForName("cost")}
            size="mini"
            appearance="basic"
            color={COST_COLORS[step.cost]}
            data-tooltip={this.translationForKey("costTip")}
          >
            {this.translationForKey(COST_TEXTS[step.cost])}
          </ui-label>
        </div>
        <div class="words">
          <b class="title">{this.words(step.key)}</b>
          <span class="sentence">{this.words(`${step.key}Sentence`)}</span>
        </div>
      </div>
    )
  }

  /** Its words for `key`:  a step's key, a group's, a level's line (the table's keys, each in the vocabulary). */
  private words(key: string): string {
    return this.translationForKey(key as BellsTextKey)
  }

  /** The modal drawn:  kept, and its own closing heard. */
  private adoptModal(modal: HTMLElement) {
    this.modal = modal
    modal.addEventListener("ui-closed", this.onModalClosed)
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicBells extends E.AttributeValues<EpicBellsVocabulary> {}

/** Each cost's word. */
const COST_TEXTS = {
  high: "costHigh",
  medium: "costMedium",
  low: "costLow",
  none: "costNone",
  timesaver: "costTimesaver"
} as const

/** Each cost's badge colour;  `none` the plain label, quieter than `low`'s grey. */
const COST_COLORS = { high: "red", medium: "orange", low: "grey", none: undefined, timesaver: "green" } as const
