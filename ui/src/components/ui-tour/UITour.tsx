import { For, Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E, UI } from "spell/ui/core"
import { tourVocabulary } from "./UITour.en"
import { TourMemory } from "./TourMemory"
import { tourStepVocabulary } from "./UITourStep.en"
import type { DOMTourStepElement, UITourStep } from "./UITourStep"

import tourCSS from "./UITour.css?inline"

/****************
 * ### `DOMTourElement`
 * The DOM element of `<ui-tour>`:  the tour's script API, which its component does.
 * - `start()`, `stop()`, `next()`, `back()`, `show(step)`;  `offerToStart()`, `forget()`
 * - `step`, `running`, `seen`, `stepCount`
 * - NOTE: `DOMElement` checks its members against the attributes' property names;  none of these is one
 *   (so `offerToStart()`, not `offer()`:  `offer` is an attribute).
 * - Above the component:  its `elementSetup` reads this class while the component is defined.
 ****************/
export class DOMTourElement extends E.DOMElement<UITour> {
  /** Start at its first step, or at `step` (a number from 1, or a step's name);  false when it can't. */
  start(step?: number | string): boolean {
    return this.component?.start(step) ?? false
  }

  /** End it now, reason `stopped`:  not remembered as taken. */
  stop() {
    this.component?.end("stopped")
  }

  /** Show the next step;  after the last, end it (`done`). */
  next() {
    this.component?.next()
  }

  /** Show the step before. */
  back() {
    this.component?.back()
  }

  /** Show `step`, a number from 1 or a step's name, of this tour while it runs. */
  show(step: number | string) {
    this.component?.show(step)
  }

  /**
   * Offer to start, as its `offer` attribute says, unless it was taken before (`remember`):
   * a note asking first, straight away, or a pulsing dot.  True when it offered.
   * - At most one tour offers itself a visit.
   */
  offerToStart(): Promise<boolean> {
    return this.component?.offerToStart() ?? Promise.resolve(false)
  }

  /** Forget it was taken, so it can be offered again. */
  forget() {
    this.component?.forget()
  }

  /** The step showing, from 1;  `0` while it isn't running. */
  get step(): number {
    return this.component?.current ?? 0
  }

  /** A step shows. */
  get running(): boolean {
    return !!this.component?.isRunning
  }

  /** Taken before, and remembered (`remember`). */
  get seen(): boolean {
    return !!this.component?.isSeen
  }

  /** How many steps it has. */
  get stepCount(): number {
    return this.component?.steps.length ?? 0
  }
}

/****************
 * ### `UITour`
 * The component behind `<ui-tour>`:  leads someone through a feature one step at a time.
 * - Draws nothing until it starts.  Then, while it runs, over the whole page (the DOM element is a popover, so it's
 *   above everything, even dialogs opened before it):
 *   - a ring round what the step points at, its target, followed as it moves
 *   - beside it, a box with the step's text (its `<ui-tour-step>`, slotted), Back and Next, a ✕
 *     and where the tour is (`<ui-steps>`, one dot a step)
 *   - with `dim`, the rest of the page darkened, all but the target
 *   - a step with no target:  its box near the top of the screen, under the page's own bars (`--ui-tour-top`)
 * - Targets:  a step's `targetElement`, else its `target`, found anywhere on the page, inside shadow roots too
 *   (`targetFor()`):  a part's `id` (its name in a Spell app), a `data-tour` name, else a CSS selector.
 *   A target that isn't on the page skips its step, with a console warning.
 * - Waiting (`wait-for`):  the rest of the page can't be clicked, Next is hidden, and the event on the target
 *   moves it on.
 * - Ending:  `done` after the last step;  `closed` by its ✕ or Escape, which always works;  `stopped` by code.
 *   - `remember`:  finished or closed, it's kept as taken (`TourMemory`), so `offerToStart()` won't offer it again.
 * - One tour runs at a time on a page:  starting one stops the other.
 *   - Every tour on the page is in `UITour.all`;  Spell's tour words reach them through the page's tour control
 *     (`UITour.control`, put on `globalThis` by the family's barrel).
 * - Invoker commands:  `<button commandfor="<its id>" command="--start">` starts it, `--stop` stops it.
 * - Keys, while it runs:  Escape closes it;  with the focus in its box, ← and → go back and on.
 ****************/
export class UITour extends E.UIComponent<Vocabulary> {
  @E.proto static vocabulary = tourVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { tour: tourCSS },
    DOMElement: DOMTourElement,
    delegatesFocus: false,
    animation: "none"
  } satisfies Partial<E.ElementSetup>

  constructor(...args: ConstructorParameters<typeof E.UIComponent>) {
    super(...args)
    if (isServer) return
    // SIDE EFFECT:  the DOM element itself is the layer over the page, in the top layer once shown
    this.domElement.setAttribute("popover", "manual")
    this.domElement.addReleaseCallback(() => this.stopFollowing())
  }

  ////////////////
  // ## The page's tours
  ////////////////

  /** Every tour on the page, in the order they connected. */
  static readonly all = new Set<DOMTourElement>()

  /** The tour running, if one is. */
  static get running(): DOMTourElement | undefined {
    return [...UITour.all].find((tour) => tour.running)
  }

  /** The tour named `name` on the page;  none:  the first. */
  static named(name?: string): DOMTourElement | undefined {
    const tours = [...UITour.all]
    if (name === undefined) return tours[0]
    return tours.find((tour) => tour.component?.tourName === name)
  }

  /**
   * What Spell's tour words call (`start tour "x"`, `show step 3` ...), by the page-wide symbol
   * `Symbol.for("spell-ui:tours")`:  compiled Spell never imports Spell UI.
   */
  static readonly control: TourControl = {
    start: (name, step) => UITour.named(name)?.start(step) ?? false,
    stop: () => UITour.running?.stop(),
    show: (step) => UITour.running?.show(step),
    next: () => UITour.running?.next(),
    back: () => UITour.running?.back()
  }

  /** In `all` while connected. */
  @E.whileConnected
  protected joinThePage() {
    const domElement = this.domElement as DOMTourElement
    UITour.all.add(domElement)
    void this.readSeen()
    return () => {
      UITour.all.delete(domElement)
      if (this.isRunning) this.end("stopped")
      this.isOffering = undefined
    }
  }

  ////////////////
  // ## Steps
  ////////////////

  /** Its steps, in order:  its `<ui-tour-step>` children (any language's tag). */
  @E.watches({ childList: true })
  get steps(): DOMTourStepElement[] {
    return [...this.domElement.children].filter(isStep)
  }

  /** The step showing, from 1;  `0` while it isn't running. */
  @E.state accessor current = 0

  /** A step shows. */
  @E.cssState("running")
  get isRunning(): boolean {
    return this.current > 0
  }

  /** The step showing's element. */
  get currentStep(): DOMTourStepElement | undefined {
    return this.steps[this.current - 1]
  }

  /** Its `name`, `""` without one. */
  get tourName(): string {
    return this.name ?? ""
  }

  /** The step numbered `step` (from 1), or named `step`:  its number, `0` when there's none. */
  numberOf(step: number | string): number {
    if (typeof step === "number") return step >= 1 && step <= this.steps.length ? Math.floor(step) : 0
    return this.steps.findIndex((element) => stepOf(element)?.name === step) + 1
  }

  ////////////////
  // ## Starting and moving
  ////////////////

  /** Start at its first step, or at `step`;  false when it can't (no steps, or `ui-starting` was cancelled). */
  @E.untracked
  start(step: number | string = 1): boolean {
    const number = this.numberOf(step)
    if (!number) {
      E.Warnings.warn("<ui-tour>", `${this.label}:  no step ${JSON.stringify(step)} to start at`)
      return false
    }
    if (!this.send("ui-starting", { step: number })) return false
    const other = UITour.running
    if (other && other !== this.domElement) other.stop()
    this.isOffering = undefined
    this.showLayer()
    const shown = this.goTo(number, 1)
    if (shown) this.send("ui-started", { step: this.current })
    return shown
  }

  /** The next step;  after the last, it ends (`done`). */
  @E.untracked
  next() {
    if (!this.isRunning) return
    if (!this.goTo(this.current + 1, 1)) this.end("done")
  }

  /** The step before;  at the first, nothing. */
  @E.untracked
  back() {
    if (this.isRunning) this.goTo(this.current - 1, -1)
  }

  /** Show `step` while it runs. */
  @E.untracked
  show(step: number | string) {
    if (!this.isRunning) return
    const number = this.numberOf(step)
    if (number) this.goTo(number, number < this.current ? -1 : 1)
    else E.Warnings.warn("<ui-tour>", `${this.label}:  no step ${JSON.stringify(step)}`)
  }

  /**
   * Show step `number`, or the first one after it, going `direction`, whose target is on the page:
   * true when one shows.  Past either end:  false, and nothing changes.
   */
  private goTo(number: number, direction: 1 | -1): boolean {
    for (let candidate = number; candidate >= 1 && candidate <= this.steps.length; candidate += direction) {
      const step = this.steps[candidate - 1]!
      const target = this.targetOf(step)
      if (target === MISSING) {
        const name = stepOf(step)?.target ?? ""
        E.Warnings.warn(
          "<ui-tour>",
          `${this.label}:  step ${candidate}'s target \`${name}\` isn't on the page;  skipped`
        )
        continue
      }
      this.showStep(candidate, target)
      return true
    }
    return false
  }

  /** Make step `number` the one showing, pointing at `target`. */
  private showStep(number: number, target: Element | undefined) {
    const from = this.current
    this.steps.forEach((step, index) => (step.hidden = index !== number - 1))
    this.current = number
    this.target = target
    this.waitForTarget()
    if (target) target.scrollIntoView({ block: "nearest", inline: "nearest" })
    this.follow()
    this.send("ui-stepped", { from, to: number, name: stepOf(this.currentStep)?.name ?? "" })
    E.afterSolidUpdate(() => this.focusBox())
  }

  /** How it's named in warnings:  `"First game"`, or `the tour`. */
  private get label(): string {
    return this.tourName ? `"${this.tourName}"` : "the tour"
  }

  ////////////////
  // ## Ending
  ////////////////

  /** End it, for `reason`:  `ui-ended`;  `done` and `closed` are remembered (`remember`). */
  @E.untracked
  end(reason: TourEndReason) {
    if (!this.isRunning) return
    this.current = 0
    this.target = undefined
    this.waiting?.abort()
    this.stopFollowing()
    this.hideLayer()
    for (const step of this.steps) step.hidden = false
    if (reason !== "stopped") this.markSeen()
    this.send("ui-ended", { reason })
  }

  /** An invoker command aimed at the tour:  `--start` starts it, `--stop` stops it. */
  @E.on("command")
  protected onCommand(event: Event) {
    const command = (event as Event & { command?: string }).command
    if (command === START_COMMAND) this.start()
    else if (command === STOP_COMMAND) this.end("stopped")
  }

  /** The ✕:  close it. */
  readonly closeButton = new E.CloseButton({
    owner: this,
    shows: () => true,
    label: () => this.translationForKey("close"),
    part: this.partForName("close"),
    onClick: () => this.end("closed")
  })

  ////////////////
  // ## Targets
  ////////////////

  /** What the step showing points at;  `undefined` for none. */
  @E.state accessor target: Element | undefined = undefined

  /** Where `target` is on the screen, followed every frame while it runs. */
  @E.state({ equals: isSameBox }) accessor targetBox: Box | undefined = undefined

  /** `step`'s target:  `undefined` when it names none, `MISSING` when it names one that isn't on the page. */
  private targetOf(step: DOMTourStepElement): Element | undefined | typeof MISSING {
    if (step.targetElement) return step.targetElement.isConnected ? step.targetElement : MISSING
    const name = stepOf(step)?.target
    if (!name) return undefined
    return UITour.targetFor(name) ?? MISSING
  }

  /**
   * The element named `name` on the page, looking inside every open shadow root too, the first that's shown:
   * - an element whose `id` is `name`:  a part of a Spell app, by its name
   * - else one with `data-tour="<name>"`:  a page's own marks for its tours
   * - else the first that matches `name` as a CSS selector
   * - Pages may add their own ways first (`UITour.targetFinders`):  the first to answer wins.
   */
  static targetFor(name: string): Element | undefined {
    for (const find of UITour.targetFinders) {
      const found = find(name)
      if (found) return found
    }
    const quoted = CSS.escape(name)
    return (
      deepQuery(document, `[id="${quoted}"]`) ??
      deepQuery(document, `[data-tour="${quoted}"]`) ??
      (isSelector(name) ? deepQuery(document, name) : undefined)
    )
  }

  /** A page's own ways to find a target by its name, tried first (`targetFor()`). */
  static readonly targetFinders: ((name: string) => Element | undefined)[] = []

  /** Follow the target every frame, while it runs or offers. */
  private follow() {
    this.stopFollowing()
    const frame = () => {
      const target = this.target
      this.targetBox = target?.isConnected ? boxOf(target) : undefined
      this.cancelFrame = E.beforeNextPaint(frame)
    }
    frame()
  }

  /** Stop following the target. */
  private stopFollowing() {
    this.cancelFrame?.()
    this.cancelFrame = undefined
  }

  /** Cancels the next frame of `follow()`. */
  private cancelFrame?: () => void

  ////////////////
  // ## Waiting
  ////////////////

  /** The step showing waits for the person:  its `wait-for`, with a target to do it to. */
  get isWaiting(): boolean {
    return !!this.target && !!stepOf(this.currentStep)?.waitFor
  }

  /** Stops listening for the step's `wait-for`. */
  private waiting?: AbortController

  /** Listen for the step's `wait-for` on its target:  it moves the tour on. */
  private waitForTarget() {
    this.waiting?.abort()
    const type = stepOf(this.currentStep)?.waitFor
    if (!type || !this.target) return
    const waiting = (this.waiting = new AbortController())
    // after this event has finished with the target:  the next step may point at what it opened
    this.target.addEventListener(type, () => E.soon(() => this.next()), { once: true, signal: waiting.signal })
  }

  /** The step showing dims the page:  its own `dim`, else the tour's. */
  get isDimming(): boolean {
    const step = this.currentStep
    return step?.hasAttribute(step.component?.elementDefinition.localAttribute("dim") ?? "dim")
      ? !!stepOf(step)?.dim
      : !!this.dim
  }

  /** Which side of the target the box goes. */
  get placement(): string {
    return stepOf(this.currentStep)?.placement ?? "bottom"
  }

  ////////////////
  // ## Remembering
  ////////////////

  /** Taken before, and remembered:  `:state(seen)`. */
  @E.cssState("seen")
  @E.state
  accessor isSeen = false

  /** Where it remembers, with `remember`;  `undefined` without. */
  private get memory(): TourMemory | undefined {
    const remember = this.attributes.remember
    if (remember === null || remember === undefined || remember === "false") return undefined
    return new TourMemory({ name: this.tourName || this.domElement.id || "tour", remember })
  }

  /** Read whether it was taken.  NEVER throws. */
  private async readSeen() {
    const memory = this.memory
    if (!memory) return
    this.isSeen = await memory.hasBeenSeen().catch(() => false)
  }

  /** Remember it was taken.  NEVER throws. */
  private markSeen() {
    const memory = this.memory
    if (!memory) return
    this.isSeen = true
    void memory.markSeen().catch((error) => E.Warnings.warn("<ui-tour>", "couldn't remember it was taken:", error))
  }

  /** Forget it was taken. */
  forget() {
    this.memory?.forget()
    this.isSeen = false
  }

  ////////////////
  // ## Offering
  ////////////////

  /** How it's offering to start, while it does:  a note (`ask`) or a dot. */
  @E.state accessor isOffering: "ask" | "dot" | undefined = undefined

  /** Offer to start, as `offer` says, unless it was taken before or another tour offered this visit. */
  @E.untracked
  async offerToStart(): Promise<boolean> {
    await this.readSeen()
    if (this.isSeen || this.isRunning || UITour.hasOffered || !this.steps.length) return false
    UITour.hasOffered = true
    const offer = this.offer ?? "ask"
    if (offer === "start") return this.start()
    const first = this.steps[0]!
    const target = this.targetOf(first)
    this.target = target === MISSING ? undefined : target
    this.target?.scrollIntoView({ block: "nearest", inline: "nearest" })
    this.isOffering = offer
    this.showLayer()
    this.follow()
    return true
  }

  /** A tour has offered itself this visit:  at most one does. */
  private static hasOffered = false

  /** The offer turned down:  remembered, as taken. */
  private readonly turnDown = () => {
    this.isOffering = undefined
    this.target = undefined
    this.stopFollowing()
    this.hideLayer()
    this.markSeen()
  }

  ////////////////
  // ## The layer over the page
  ////////////////

  /** Show the DOM element over everything (the top layer), and listen for its keys. */
  private showLayer() {
    if (!this.domElement.matches(":popover-open")) this.domElement.showPopover()
    this.keys?.abort()
    this.keys = new AbortController()
    document.addEventListener("keydown", this.onKey, { signal: this.keys.signal })
  }

  /** Take it off the page. */
  private hideLayer() {
    this.keys?.abort()
    if (this.domElement.matches(":popover-open")) this.domElement.hidePopover()
  }

  /** Stops listening for keys. */
  private keys?: AbortController

  /** Escape closes it (or turns its offer down for now);  ← and → in its box go back and on. */
  private readonly onKey = (event: KeyboardEvent) => {
    if (event.defaultPrevented) return
    if (event.key === "Escape") {
      if (this.isRunning) this.end("closed")
      else if (this.isOffering) this.dropOffer()
      return
    }
    if (!this.isRunning || !event.composedPath().includes(this.box!)) return
    if (event.key === "ArrowRight" && !this.isWaiting) this.next()
    else if (event.key === "ArrowLeft") this.back()
  }

  /** The offer taken away for this visit (Escape), not remembered. */
  private dropOffer() {
    this.isOffering = undefined
    this.target = undefined
    this.stopFollowing()
    this.hideLayer()
  }

  /** Focus the box's main button, so the keys and a screen reader start there. */
  private focusBox() {
    const button = this.box?.querySelector<HTMLElement>(this.isWaiting ? ".back" : ".next")
    ;(button ?? this.box)?.focus({ preventScroll: true })
  }

  ////////////////
  // ## Rendering
  ////////////////

  /** The step's box. */
  private box?: HTMLElement

  /** The ring's place and size, `px`, 6px out from the target;  a point under the page's bars without one. */
  private get ringStyle(): JSX.CSSProperties {
    const box = this.targetBox
    if (!box) return {}
    return {
      left: `${box.left - RING_OUT}px`,
      top: `${box.top - RING_OUT}px`,
      width: `${box.width + 2 * RING_OUT}px`,
      height: `${box.height + 2 * RING_OUT}px`
    }
  }

  /** Four boxes round the ring that take every click, while a step waits:  only its target can be clicked. */
  private masks(): JSX.Element {
    const sides = () => {
      const box = this.targetBox
      if (!box) return []
      const left = box.left - RING_OUT
      const top = box.top - RING_OUT
      const right = box.left + box.width + RING_OUT
      const bottom = box.top + box.height + RING_OUT
      return [
        { left: "0", top: "0", right: "0", height: `${Math.max(0, top)}px` },
        { left: "0", top: `${bottom}px`, right: "0", bottom: "0" },
        { left: "0", top: `${top}px`, width: `${Math.max(0, left)}px`, height: `${bottom - top}px` },
        { left: `${right}px`, top: `${top}px`, right: "0", height: `${bottom - top}px` }
      ]
    }
    return <For each={sides()}>{(side) => <div class="mask" style={side} />}</For>
  }

  /** Where the tour is:  a dot a step, the one showing current, those before it done;  a click goes there. */
  private dots(): JSX.Element {
    return (
      <ui-steps class="dots" appearance="circular" size="mini" color="primary" ordered="">
        <For each={this.steps}>
          {(_step, index) => (
            <ui-step
              selected={index() + 1 === this.current ? "" : undefined}
              completed={index() + 1 < this.current ? "" : undefined}
              appearance="link"
              onClick={() => this.show(index() + 1)}
            />
          )}
        </For>
      </ui-steps>
    )
  }

  /** The step's box:  the tour's name and ✕, the step's text, where the tour is, Back and Next. */
  private stepBox(): JSX.Element {
    const isLast = () => this.current === this.steps.length
    return (
      <section
        ref={(element) => (this.box = element)}
        class={["box", this.placement, { pointless: !this.target }]}
        part={this.partForName("box")}
        role="dialog"
        aria-label={this.tourName || undefined}
        tabindex="-1"
      >
        <ui-segment appearance="raised">
          <div class="card">
            <div class="top">
              <ui-header size="tiny" class="title">
                {this.tourName}
              </ui-header>
              {this.closeButton.draw()}
            </div>
            <slot />
            <Show when={this.isWaiting}>
              <ui-text class="waiting" size="small" color="grey">
                {this.translationForKey("waiting")}
              </ui-text>
            </Show>
            <div class="bottom">
              <Show when={this.steps.length > 1}>{this.dots()}</Show>
              <span class="buttons">
                <Show when={this.current > 1}>
                  <ui-button class="back" size="small" appearance="basic" onClick={() => this.back()}>
                    {this.translationForKey("back")}
                  </ui-button>
                </Show>
                <Show when={!this.isWaiting}>
                  <ui-button class="next" size="small" color="primary" onClick={() => this.next()}>
                    {this.translationForKey(isLast() ? "done" : "next")}
                  </ui-button>
                </Show>
              </span>
            </div>
            <span class="where" aria-live="polite">
              {this.translationForKey("stepOf", { step: this.current, count: this.steps.length })}
            </span>
          </div>
        </ui-segment>
      </section>
    )
  }

  /** The note offering the tour (`offer="ask"`). */
  private offerNote(): JSX.Element {
    return (
      <section
        class={["box", "offer", "bottom", { pointless: !this.target }]}
        part={this.partForName("offer")}
        role="dialog"
        aria-label={this.translationForKey("offerTitle")}
      >
        <ui-segment appearance="raised">
          <div class="card">
            <ui-header size="tiny" class="title">
              {this.translationForKey("offerTitle")}
            </ui-header>
            <ui-text class="about">{[this.tourName, this.summary].filter(Boolean).join(":  ")}</ui-text>
            <ui-text class="length" size="small" color="grey">
              {this.steps.length === 1
                ? this.translationForKey("offerOneStep")
                : this.translationForKey("offerSteps", { count: this.steps.length })}
            </ui-text>
            <div class="bottom">
              <span class="buttons">
                <ui-button class="never" size="small" appearance="basic" onClick={this.turnDown}>
                  {this.translationForKey("offerNever")}
                </ui-button>
                <ui-button class="start" size="small" color="primary" onClick={() => this.start()}>
                  {this.translationForKey("offerStart")}
                </ui-button>
              </span>
            </div>
          </div>
        </ui-segment>
      </section>
    )
  }

  /** The pulsing dot offering the tour (`offer="dot"`):  a click starts it. */
  private offerDot(): JSX.Element {
    return (
      <ui-button
        class="dot"
        part={this.partForName("dot")}
        appearance="circular"
        size="mini"
        color="primary"
        icon="map signs"
        aria-label={this.translationForKey("dotLabel", { name: this.tourName })}
        onClick={() => this.start()}
      />
    )
  }

  render(): JSX.Element {
    return (
      <>
        <Show when={this.isRunning || this.isOffering}>
          <div
            class={[
              "ring",
              { dim: this.isRunning && this.isDimming, pointless: !this.targetBox, quiet: !this.isRunning }
            ]}
            part={this.partForName("ring")}
            style={this.ringStyle}
          />
        </Show>
        <Show when={this.isRunning && this.isWaiting}>{this.masks()}</Show>
        <Show when={this.isOffering === "ask"}>{this.offerNote()}</Show>
        <Show when={this.isOffering === "dot"}>{this.offerDot()}</Show>
        <div class="steps" hidden={!this.isRunning}>
          {this.stepBox()}
        </div>
      </>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UITour extends E.AttributeValues<Vocabulary> {}

/** Why a tour ended:  `ui-ended`'s `reason`. */
export type TourEndReason = "done" | "closed" | "stopped"

/** The page's tour control, `Symbol.for("spell-ui:tours")`:  what Spell's tour words call. */
export type TourControl = {
  /** start tour `name` (none:  the page's first), at `step`;  false when there's no such tour */
  start(name?: string, step?: number | string): boolean
  /** stop the tour running */
  stop(): void
  /** show `step` of the tour running, a number from 1 or a step's name */
  show(step: number | string): void
  /** the next step of the tour running */
  next(): void
  /** the step before, of the tour running */
  back(): void
}

/** A box on the screen, `px`, as `getBoundingClientRect()` gives it. */
type Box = { left: number; top: number; width: number; height: number }

/**
 * `element`'s box on the screen.
 * - A DOM element that draws no box of its own (`display: contents`, as many Spell UI elements are):
 *   the box round what it draws, its shadow root's boxes, else its children's.
 */
function boxOf(element: Element): Box {
  const { left, top, width, height } = element.getBoundingClientRect()
  if (width || height || getComputedStyle(element).display !== "contents") return { left, top, width, height }
  const inside = [...(element.shadowRoot ?? element).children].map(boxOf).filter((box) => !isEmptyBox(box))
  if (!inside.length) return { left, top, width, height }
  const right = Math.max(...inside.map((box) => box.left + box.width))
  const bottom = Math.max(...inside.map((box) => box.top + box.height))
  const first = { left: Math.min(...inside.map((box) => box.left)), top: Math.min(...inside.map((box) => box.top)) }
  return { ...first, width: right - first.left, height: bottom - first.top }
}

/** A box with no room:  nothing drawn. */
function isEmptyBox(box: Box): boolean {
  return !box.width && !box.height
}

/** Two boxes the same, or both none. */
function isSameBox(a: Box | undefined, b: Box | undefined): boolean {
  return a === b || (!!a && !!b && a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height)
}

/**
 * Is `element` a `<ui-tour-step>`, in any language?
 * - By its tag's name, canonical or translated (`UI.vocabulary.canonicalTagFor()`), as `UIDiagramNode.isNode()`:
 *   before the runtime loads, the canonical tag only.
 */
function isStep(element: Element): element is DOMTourStepElement {
  const name = element.localName
  return (
    name === tourStepVocabulary.tag ||
    ("vocabulary" in UI && UI.vocabulary.canonicalTagFor(name) === tourStepVocabulary.tag)
  )
}

/** A step's component, once its family has attached it. */
function stepOf(step: DOMTourStepElement | undefined): UITourStep | undefined {
  return step?.component as UITourStep | undefined
}

/**
 * The first element on the page matching `selector` that's shown, looking inside every open shadow root too;
 * else the first that matches at all.
 * - Shown:  it has a box on the screen (`boxOf()`), so a copy in a closed menu or a hidden panel loses to the one in view.
 */
function deepQuery(root: Document, selector: string): Element | undefined {
  const found = deepQueryAll(root, selector)
  return found.find((element) => !isEmptyBox(boxOf(element))) ?? found[0]
}

/** Every element under `root` matching `selector`, inside every open shadow root too, in document order per tree. */
function deepQueryAll(root: Document | ShadowRoot, selector: string): Element[] {
  const found = [...root.querySelectorAll(selector)]
  for (const element of root.querySelectorAll("*")) {
    if (element.shadowRoot) found.push(...deepQueryAll(element.shadowRoot, selector))
  }
  return found
}

/** Can `text` be read as a CSS selector? */
function isSelector(text: string): boolean {
  try {
    document.createDocumentFragment().querySelector(text)
    return true
  } catch {
    return false
  }
}

/** The invoker command that starts a tour:  `<button commandfor="tour" command="--start">`. */
const START_COMMAND = "--start"

/** The invoker command that stops a tour. */
const STOP_COMMAND = "--stop"

/** A step's target that isn't on the page. */
const MISSING = Symbol("missing")

/** How far the ring is out from its target, `px`. */
const RING_OUT = 6

/** The vocabulary type, for brevity. */
type Vocabulary = typeof tourVocabulary
