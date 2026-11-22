import type { JSX } from "@solidjs/web"

import { E } from "spell-ui/core"
import { counterVocabulary } from "./UICounter.en"

import counterCSS from "./UICounter.css?inline"

/****************
 * ### `UICounter`
 * The component behind `<ui-counter>`, the custom elements guide's teaching element:
 * a number, and a button that adds `step` to it, up to `max`.
 *
 * - Steps 2 to 5 of the guide, top to bottom:
 *   2. the class:  its vocabulary, its style sheet, and `render()`
 *   3. its count:  `@E.controlled`, so the page may set it, or leave it to the counter
 *   4. a click:  `requestChange()` sends a cancelable `ui-change`, then writes the count
 *   5. a `:state()`:  `@E.cssState("at-max")`, and a key listener with `@E.on`
 * - A GUIDE-ONLY element (`guides/custom-elements/experiments/`):  built into the guide's own script with
 *   `packages/docs/tools/bundle-experiment.ts`, on the page's Spell UI.
 ****************/
export class UICounter extends E.UIComponent<typeof counterVocabulary> {
  @E.proto static vocabulary = counterVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { counter: counterCSS }
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## The count
  ////////////////

  /**
   * The number shown:  the DOM element's `count` when the page set one, else the counter's own, from 0.
   * - A write goes to the DOM element's `count` property, which writes the `count` attribute back.
   * - Not named `count`:  that name is the attribute's getter (the page's value, or `undefined`).
   */
  @E.controlled("count")
  accessor currentCount = 0

  /** At `max`:  `:state(at-max)`, and the button is disabled. */
  @E.cssState("at-max")
  get isAtMax(): boolean {
    return this.max !== undefined && this.currentCount >= this.max
  }

  /**
   * Add `step` for the person, unless at `max`.
   * - `requestChange()` sends `ui-change` first:  a page that cancels it keeps the old count.
   */
  @E.untracked
  add(originalEvent: Event) {
    if (this.isAtMax) return
    const next = Math.min(this.currentCount + this.step!, this.max ?? Infinity)
    this.requestChange("currentCount", next, () => this.send("ui-change", { count: next, originalEvent }))
  }

  ////////////////
  // ## Rendering
  ////////////////

  render(): JSX.Element {
    return (
      <div class={this.rootClass} part={this.partForName("counter")}>
        <slot />
        <output part={this.partForName("count")}>{this.currentCount}</output>
        <button
          type="button"
          part={this.partForName("button")}
          disabled={this.isAtMax}
          aria-label={this.translationForKey("add", { step: this.step! })}
          onClick={(event) => this.add(event)}
        >
          +{this.step}
        </button>
      </div>
    )
  }

  ////////////////
  // ## Keys
  ////////////////

  /** `+` or the up arrow, anywhere in the element, adds too. */
  @E.on("keydown")
  protected onKeyDown(event: KeyboardEvent) {
    if (event.key !== "+" && event.key !== "ArrowUp") return
    event.preventDefault()
    this.add(event)
  }
}

/** The vocabulary's attribute getters, typed:  `this.count`, `this.step`, `this.max`, `this.size`. */
export interface UICounter extends E.AttributeValues<typeof counterVocabulary> {}
