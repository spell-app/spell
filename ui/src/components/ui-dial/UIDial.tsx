import { For, Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E, UI } from "spell/ui/core"
import { F } from "spell/ui/forms"
import { SliderScale } from "spell/ui/components/ui-slider/SliderScale"
import { dialVocabulary } from "./UIDial.en"
import { DialFallback } from "./UIDial.fallback"
import { DialArc } from "./DialArc"
import { DEFAULT_MAX, DEFAULT_MIN, DEFAULT_STEP } from "./UIDial.types"

import dialCSS from "./UIDial.css?inline"

/****************
 * ### `UIDial`
 * The component behind `<ui-dial>`:  a dial, to pick a number by turning a handle round an open ring.
 *
 * - Its shadow DOM:
 *   `<div class="ui … dial" part="dial">` around the control (`part="control"`, `role=slider`) and, with `label`,
 *   the words under it (`part="label"`).
 *   - The control holds an SVG drawing (the ring, its coloured arc, the disc, the tick dots, the handle)
 *     and the value, written over the disc in the page's font.
 *   - The drawing is a 100 by 100 box;  its geometry is `DialArc`'s, the ring 270° with its gap at the bottom.
 *
 * - The control is an APG slider (`role=slider`, `aria-value*`):  it takes focus, and draws its focus ring round
 *   the handle.
 *   - Named by `aria-label`, a `<label for>` (`labels`), else by its own `label`.
 *   - `aria-valuetext` is the value as shown, `unit` included.
 *
 * - Keys (on the control), as `<ui-slider>`'s (`SliderScale.valueForKey()`):
 *   - Right / Up step up, Left / Down step down
 *   - PageUp / PageDown take 2 steps
 *   - Home / End go to `min` / `max`
 *   - each key sends `ui-moved`, then `ui-changed`.
 * - Wheel:  only while the control has focus (so the page still scrolls past it), a step a notch.
 * - Pointer:  pressing the ring moves the handle there, and dragging turns it (pointer capture).
 *   - The drag follows the pointer round, never across the gap:  `DialArc.follow()`.
 *   - A press on the disc's middle only focuses it:  its angle means nothing there.
 *   - `ui-moved` for each new value, `ui-changed` once when the drag ends somewhere new.
 *
 * - `value` is controlled (`@controlled`):  a `ui-moved` handler that sets it again wins.
 *   The ATTRIBUTE is the starting (and reset) value.
 * - The value maths is `<ui-slider>`'s `SliderScale`:  a dial is a slider's number line, bent round.
 * - A form control:  it submits `value`, restores a saved state, and takes `required` as a slider does.
 ****************/
export class UIDial extends F.FormComponent<typeof dialVocabulary> {
  @E.proto static vocabulary = dialVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { dial: dialCSS },
    Fallback: DialFallback
  } satisfies Partial<E.ElementSetup>

  /** The control:  the drawing and the value, `role=slider`. */
  private control?: HTMLElement

  ////////////////
  // ## Value
  ////////////////

  /** `value`:  set by the page, or turned;  `min` until either. */
  @E.controlled("value") accessor value: number | undefined = undefined

  /** The number line. */
  @E.derived
  get scale(): SliderScale {
    return new SliderScale({
      min: this.min ?? DEFAULT_MIN,
      max: this.max ?? DEFAULT_MAX,
      step: this.step ?? DEFAULT_STEP
    })
  }

  /** The value, snapped. */
  get snappedValue(): number {
    const scale = this.scale
    return scale.snap(Number(this.value ?? scale.min))
  }

  /** Text for `value`:  the number in the page's format, then `unit`. */
  valueText(value: number): string {
    return UI.i18n.formatNumber(value) + (this.unit ?? "")
  }

  /**
   * Turn the dial to `value` as a person would:  send `ui-moved`, then set the DOM element's property,
   * unless a handler set it first.
   * - Returns true when the value changed.
   */
  @E.untracked
  private turnTo(value: number, originalEvent: Event): boolean {
    const next = this.scale.snap(value)
    if (next === this.snappedValue) return false
    return this.requestChange("value", next, () => this.send("ui-moved", { value: next, originalEvent }))
  }

  ////////////////
  // ## Disabled
  ////////////////

  /** Can a person change it? */
  get isInteractive(): boolean {
    return !this.isDisabled && !this.readonly
  }

  ////////////////
  // ## Form
  ////////////////

  get formValue(): E.FieldValue {
    return String(this.snappedValue)
  }

  /**
   * Empty while no value was ever set:  `required` then fails.
   * - The handle resting at `min` is a default, not a choice;  `formValue` still submits it.
   */
  protected get validationValue(): E.FieldValue {
    return this.value === undefined ? undefined : this.formValue
  }

  /** Back to the `value` ATTRIBUTE. */
  onFormReset() {
    this.value = E.Converters.number(this.attributes.value)
  }

  /** A saved state:  its value.  `null`:  DOM API `formStateRestoreCallback()`'s. */
  onFormStateRestore(state: File | string | FormData | null) {
    const saved = state instanceof FormData ? [...state.values()].map(String)[0] : state
    if (typeof saved === "string") this.value = Number(saved)
  }

  ////////////////
  // ## Ticks
  ////////////////

  /**
   * Number of gaps between tick dots:  `0` for none.
   * - `ticks` alone (or `true` / `yes`):  `DEFAULT_TICK_GAPS`;  a number:  that many;  `false` / `no`:  none.
   */
  get tickGaps(): number {
    const ticks = this.attributes.ticks
    if (ticks === null || ticks === undefined || OFF.test(ticks)) return 0
    const gaps = Math.round(Number(ticks))
    return ticks.trim() === "" || ON.test(ticks) ? DEFAULT_TICK_GAPS : Number.isFinite(gaps) ? Math.max(0, gaps) : 0
  }

  ////////////////
  // ## Rendering
  ////////////////

  /** Where the handle is drawn, `0` ... `1` along the ring. */
  get ratio(): number {
    return this.scale.ratio(this.snappedValue)
  }

  render(): JSX.Element {
    return (
      <div class={this.rootClass} part={this.partForName("dial")}>
        <div
          ref={(element) => this.attach(element)}
          class={CONTROL}
          part={this.partForName("control")}
          role="slider"
          tabindex={this.isDisabled ? undefined : 0}
          aria-valuemin={this.scale.min}
          aria-valuemax={this.scale.max}
          aria-valuenow={this.snappedValue}
          aria-valuetext={this.valueText(this.snappedValue)}
          aria-label={this.labels.accessibleName ?? this.label ?? undefined}
          aria-disabled={this.isDisabled ? "true" : undefined}
          aria-readonly={this.readonly ? "true" : undefined}
          onPointerDown={this.onPointerDown}
          onPointerMove={this.onPointerMove}
          onPointerUp={this.onPointerUp}
          onPointerCancel={this.onPointerUp}
          onKeyDown={this.onKeyDown}
        >
          {this.drawing()}
          <span class={VALUE} part={this.partForName("value")} aria-hidden="true">
            {this.valueText(this.snappedValue)}
          </span>
        </div>
        <Show when={this.label}>
          <div class={LABEL} part={this.partForName("label")} aria-hidden="true">
            {this.label}
          </div>
        </Show>
        {isServer && this.staticValue()}
      </div>
    )
  }

  /** The SVG drawing:  ring, arc, disc, ticks, focus ring, handle. */
  private drawing(): JSX.Element {
    const handle = () => DialArc.pointAt(this.ratio, TRACK_RADIUS)
    return (
      <svg class={RING} viewBox="0 0 100 100" aria-hidden="true">
        <path class={TRACK} part={this.partForName("track")} d={DialArc.path(0, 1, TRACK_RADIUS)} />
        <path class={TRACK_FILL} part={this.partForName("track-fill")} d={DialArc.path(0, this.ratio, TRACK_RADIUS)} />
        <circle class={DISC} part={this.partForName("disc")} cx={DialArc.CENTRE} cy={DialArc.CENTRE} r={DISC_RADIUS} />
        <Show when={this.tickGaps}>
          <g class={TICKS} part={this.partForName("ticks")}>
            <For each={this.tickRatios} keyed={false}>
              {(ratio) => (
                <circle
                  cx={DialArc.pointAt(ratio(), TICK_RADIUS).x}
                  cy={DialArc.pointAt(ratio(), TICK_RADIUS).y}
                  r={TICK_DOT_RADIUS}
                />
              )}
            </For>
          </g>
        </Show>
        <circle class={FOCUS_RING} cx={handle().x} cy={handle().y} r={FOCUS_RING_RADIUS} />
        <circle class={HANDLE} part={this.partForName("handle")} cx={handle().x} cy={handle().y} r={HANDLE_RADIUS} />
      </svg>
    )
  }

  /** The ratio of each tick dot, both ends included. */
  @E.derived
  private get tickRatios(): number[] {
    const gaps = this.tickGaps
    return Array.from({ length: gaps ? gaps + 1 : 0 }, (_, index) => index / gaps)
  }

  /**
   * Server render only (`spell/ui/static`):  the value as a hidden input, so a static form submits it without script.
   * - In a browser the DOM element submits (`ElementInternals`).
   */
  private staticValue(): JSX.Element {
    const name = this.name
    if (!name) return undefined
    return <input type="hidden" name={name} value={this.formValue as string} disabled={this.isDisabled} />
  }

  ////////////////
  // ## Turning:  pointer and wheel
  ////////////////

  /** The handle is being dragged. */
  @E.cssState("dragging")
  @E.state
  accessor isDragging = false

  /** The dragged angle, wound on past the ring's ends (`DialArc.follow()`);  `undefined` between drags. */
  private dragAngle?: number

  /** The value when the current drag began, to tell whether it changed anything. */
  private valueAtDragStart?: number

  /** Keep the control, and listen for the wheel on it:  not passive, so a turn can stop the page scrolling. */
  private attach(control: HTMLElement) {
    this.control = control
    control.addEventListener("wheel", this.onWheel, { passive: false })
  }

  /** Press:  on the ring, the handle jumps there and is dragged;  on the disc's middle, only focus. */
  @E.untracked
  private readonly onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || !this.isInteractive || !this.control) return
    event.preventDefault()
    this.control.focus()
    const { angle, distance } = this.pointerAt(event)
    if (distance < DEAD_CENTRE) return
    this.capture(event.pointerId)
    this.valueAtDragStart = this.snappedValue
    this.isDragging = true
    this.dragAngle = E.clamp(angle, -180, 180)
    this.turnTo(this.valueAtAngle(this.dragAngle), event)
  }

  /** Drag:  follow the pointer round. */
  @E.untracked
  private readonly onPointerMove = (event: PointerEvent) => {
    if (this.dragAngle === undefined) return
    this.dragAngle = DialArc.follow(this.dragAngle, this.pointerAt(event).angle)
    this.turnTo(this.valueAtAngle(this.dragAngle), event)
  }

  /** Release:  `ui-changed` when the drag moved anything. */
  @E.untracked
  private readonly onPointerUp = (event: PointerEvent) => {
    if (this.dragAngle === undefined) return
    this.dragAngle = undefined
    this.isDragging = false
    if (this.control?.hasPointerCapture(event.pointerId)) this.control.releasePointerCapture(event.pointerId)
    const before = this.valueAtDragStart
    this.valueAtDragStart = undefined
    E.afterSolidUpdate(() => {
      if (this.snappedValue !== before) this.send("ui-changed", { value: this.snappedValue, originalEvent: event })
    })
  }

  /** Wheel, while focused:  a step a notch (up turns up);  else the page scrolls as usual. */
  @E.untracked
  private readonly onWheel = (event: WheelEvent) => {
    if (!this.control?.matches(":focus") || !event.deltaY) return
    event.preventDefault()
    if (!this.isInteractive) return
    this.commit(this.scale.move(this.snappedValue, event.deltaY < 0 ? 1 : -1), event)
  }

  /**
   * Route pointer `id`'s moves to the control until release.
   * - A pointer with no pressed button (a synthetic event) can't be captured:  moves then only arrive while over it.
   */
  private capture(id: number) {
    try {
      this.control?.setPointerCapture(id)
    } catch {
      // not an active pointer
    }
  }

  /** The pointer's angle round the drawing's centre, and its distance from it in drawing units. */
  @E.untracked
  private pointerAt(event: PointerEvent): { angle: number; distance: number } {
    const box = this.control!.getBoundingClientRect()
    const scale = box.width / 100 || 1
    const dx = (event.clientX - box.left) / scale - DialArc.CENTRE
    const dy = (event.clientY - box.top) / scale - DialArc.CENTRE
    return { angle: DialArc.angleOf(dx, dy), distance: Math.hypot(dx, dy) }
  }

  /** The snapped value at `angle` round the ring. */
  @E.untracked
  private valueAtAngle(angle: number): number {
    return this.scale.valueAt(DialArc.ratioAt(angle))
  }

  ////////////////
  // ## Keys and clicks
  ////////////////

  /** Keys on the control, see the class doc. */
  @E.untracked
  private readonly onKeyDown = (event: KeyboardEvent) => {
    const next = this.scale.valueForKey(event.key, this.snappedValue)
    if (next === undefined) return
    event.preventDefault()
    if (!this.isInteractive) return
    this.commit(next, event)
  }

  /** Turn to `value` and, when it moved, send `ui-changed` at once:  a key or a wheel notch is a whole change. */
  @E.untracked
  private commit(value: number, event: Event) {
    if (this.turnTo(value, event)) this.send("ui-changed", { value: this.snappedValue, originalEvent: event })
  }

  /** A click aimed at the DOM element itself (its `<label for>`) focuses the control. */
  protected activateControl() {
    this.control?.focus()
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIDial extends E.AttributeValues<typeof dialVocabulary> {}

/** Gaps between tick dots for a bare `ticks`:  a dot every eighth of the ring, 9 in all. */
const DEFAULT_TICK_GAPS = 8

/** `ticks` values that turn them on, as the shared booleans read. */
const ON = /^(true|yes)$/i

/** `ticks` values that turn them off. */
const OFF = /^(false|no)$/i

////////////////
// ## The drawing, in its 100 by 100 units
////////////////

/** The ring's middle line:  the handle (`HANDLE_RADIUS`) just fits inside the box at 3 and 9 o'clock. */
const TRACK_RADIUS = 43

/** The handle. */
const HANDLE_RADIUS = 7

/** The focus ring round the handle:  a gap, then the ring's own width. */
const FOCUS_RING_RADIUS = HANDLE_RADIUS + 2.5

/** The disc in the middle, under the value. */
const DISC_RADIUS = 31

/** The circle the tick dots sit on:  between the disc and the ring. */
const TICK_RADIUS = 36

/** One tick dot. */
const TICK_DOT_RADIUS = 1

/** A press nearer the centre than this only focuses:  its angle is noise. */
const DEAD_CENTRE = 12

////////////////
// ## Class words
////////////////

/** Class of the control:  the drawing and the value. */
const CONTROL = "control"

/** Class of the SVG drawing. */
const RING = "ring"

/** Class of the empty ring. */
const TRACK = "track"

/** Class of the coloured arc. */
const TRACK_FILL = "track-fill"

/** Class of the disc in the middle. */
const DISC = "disc"

/** Class of the tick dots' group. */
const TICKS = "ticks"

/** Class of the focus ring round the handle, shown on keyboard focus. */
const FOCUS_RING = "focus-ring"

/** Class of the handle. */
const HANDLE = "handle"

/** Class of the value, written over the disc. */
const VALUE = "value"

/** Class of the words under the dial. */
const LABEL = "label"
