import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/ui/core"
import { ImageZoom, ZoomMotion } from "./ImageZoom"
import { zoomVocabulary } from "./UIZoom.en"

import zoomCSS from "./UIZoom.css?inline"

/****************
 * ### `<ui-zoom>`
 * The component behind `<ui-zoom>`:  something shown full size over the page (epic `ui-gaps` P14, from the epics
 * pack's `<epic-zoom>`;  Owen, epic `epic-engine` Q22:  "both.  `<ui-zoom>` can surround anything to zoom it").
 *
 * - Round any content:  the content is shown SHRUNK in the page, and full size on a click.
 *   - shrunk:  laid out at full size, then drawn at `shrink` of it (50% by default;  CSS `zoom`),
 *     within `max-width` / `max-height`, cut off past them
 *   - a button over the whole view opens it;  the content under it can't be reached until then (`inert`)
 *   - full size:  in a `<ui-modal appearance="basic">`, on the page's ground, at the width it had in the page;
 *     the view keeps its room meanwhile, so the page doesn't jump
 *   - `open` says it's open (and opens it from script);  Escape, the backdrop or the close button shut it
 * - With `src`:  that image full size, as `<epic-zoom>` did, in place of any content.
 *   - as large as fits the window (never cropped, never enlarged past its own size), its alt text under it
 *   - open while `src` is set;  Escape, a click anywhere or the close button close it, and it removes its own `src`
 *   - the page's ONE zoom for its screenshots is one of these, made by `ImageZoom.show()`;  `<ui-image zoom>` uses it
 * - Motion (none under `prefers-reduced-motion`):
 *   - it GROWS out of its place on the page (the content's view, or the picture clicked) and SHRINKS back into it
 *     before the modal closes, however it's closed (Escape, a click, the close button)
 *   - paging with the arrow keys slides the next picture in, like scrolling (`ImageZoom`)
 * - Arrow keys while showing:  the next / previous zoomable on the page;  past either end the picture bounces (`ImageZoom.step()`)
 * - The modal's own events (`ui-opened`, `ui-closed` ...) come out of it, as from any `<ui-modal>`.
 ****************/
export class UIZoom extends E.UIComponent<typeof zoomVocabulary> {
  @E.proto static vocabulary = zoomVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { zoom: zoomCSS }
  } satisfies Partial<E.ElementSetup>

  /** Its content shown full size:  `open`. */
  @E.cssState("open")
  @E.controlled("open")
  accessor isOpen = false

  /**
   * Opening and shutting it as a person does:  through `requestChange()`, so the page's own `open` wins;
   * no events of its own (its modal's come out), and its button's `aria-expanded`.
   */
  readonly disclosure = new E.Disclosure({ component: this, member: "isOpen" })

  /** The room the view took in the page, kept while its content is in the modal. */
  @E.state accessor heldSize: { width: number; height: number } | undefined = undefined

  /** The width its content was laid out at in the page, in px:  the modal shows it at that width. */
  @E.state accessor fullWidth: number | undefined = undefined

  /** The modal is up:  an image (`src`), or the content. */
  get isShowing(): boolean {
    return !!this.src || this.isOpen
  }

  /** `shrink` as a ratio:  `"50%"` => 0.5;  anything it can't read, the default. */
  get shrinkRatio(): number {
    const percent = Number.parseFloat(this.shrink ?? "")
    if (!Number.isFinite(percent) || percent <= 0) return DEFAULT_RATIO
    return Math.min(percent, 100) / 100
  }

  /** The view's box:  its caps, or the room it holds while open. */
  get viewStyle(): JSX.CSSProperties {
    const style: JSX.CSSProperties = {}
    if (this.maxWidth) style["max-inline-size"] = `min(100%, ${this.maxWidth})`
    if (this.maxHeight) style["max-block-size"] = this.maxHeight
    const held = this.isOpen ? this.heldSize : undefined
    if (held) Object.assign(style, { "inline-size": `${held.width}px`, "block-size": `${held.height}px` })
    return style
  }

  /** The shrunk view's box, once drawn. */
  private view?: HTMLElement
  /** The modal, once drawn. */
  private modal?: HTMLElement

  /** The button over the view:  its room kept, then shown full size. */
  @E.untracked
  protected showFullSize() {
    const view = this.view
    if (view) {
      const box = view.getBoundingClientRect()
      this.heldSize = { width: box.width, height: box.height }
      const shrunk = view.querySelector<HTMLElement>(`.${SHRUNK}`)
      if (shrunk) this.fullWidth = Math.round(shrunk.getBoundingClientRect().width / this.shrinkRatio)
    }
    this.disclosure.open()
  }

  /** Shut (Escape, its close button, the backdrop):  an image's `src` goes, ready for the next;  content goes back. */
  @E.on("ui-closed", { target: "renderRoot" })
  protected onClosed(event: Event) {
    // a modal in the content, closing, says so through this shadow root too:  only its own counts
    if (event.target !== this.modal) return
    this.shut()
  }

  /**
   * About to close (Escape, the backdrop, its close button):  shrink back into place first, then close.
   * - `ui-closing` is vetoed while it shrinks, then `shut()` closes the modal without asking again
   */
  @E.on("ui-closing", { target: "renderRoot" })
  protected onClosing(event: Event) {
    if (event.target !== this.modal) return
    if (!this.isShrinking && !this.canMove()) return
    event.preventDefault()
    void this.dismiss()
  }

  /** A click on the zoomed image:  shut too, as a lightbox does. */
  @E.on("click", { target: "renderRoot" })
  protected onClick(event: MouseEvent) {
    if (event.target instanceof Element && event.target.closest(`.${FIGURE}`)) void this.dismiss()
  }

  ////////////////
  // ## Growing and shrinking
  ////////////////

  /** Shown now, for `onShowingChanged()`. */
  private wasShowing = false

  /** It shrinks back into the page:  shutting waits for it. */
  private isShrinking = false

  /** It came up (a picture's `src`, or `open`):  grow out of its place. */
  @E.onChange("src", "isOpen")
  protected onShowingChanged() {
    const showing = this.isShowing
    if (showing && !this.wasShowing) void this.grow()
    this.wasShowing = showing
  }

  /** What's drawn full size:  the picture, or the content's box. */
  private get zoomed(): HTMLElement | null {
    return this.modal?.querySelector<HTMLElement>(`.${IMAGE}, .${CONTENT}`) ?? null
  }

  /** Where it sits on the page:  the picture clicked (still the one `src` shows), or the content's view. */
  private get placeOnPage(): DOMRect | undefined {
    let box: DOMRect | undefined
    if (this.src) {
      const shown = ImageZoom.shown
      const image = shown instanceof HTMLImageElement ? shown : shown?.shadowRoot?.querySelector("img")
      if (image?.isConnected && (image.currentSrc || image.src) === this.src) box = image.getBoundingClientRect()
    } else box = this.view?.getBoundingClientRect()
    return box?.width ? box : undefined
  }

  /** Can it grow or shrink:  motion allowed, something drawn, and its place on the page known? */
  private canMove(): boolean {
    return !ZoomMotion.isStill() && !!this.zoomed && !!this.placeOnPage
  }

  /** The transform that draws `zoomed` over `place`:  centred on it, scaled to its width. */
  private static over(place: DOMRect, zoomed: DOMRect): string {
    const dx = place.left + place.width / 2 - (zoomed.left + zoomed.width / 2)
    const dy = place.top + place.height / 2 - (zoomed.top + zoomed.height / 2)
    return `translate(${dx}px, ${dy}px) scale(${place.width / zoomed.width})`
  }

  /** Grow out of its place on the page. */
  private async grow() {
    if (ZoomMotion.isStill()) return
    // once it's drawn into the modal:  the first time, that takes the element's own set-up too
    let zoomed = this.zoomed
    for (let frame = 0; !zoomed && frame < DRAW_FRAMES; frame++) {
      await new Promise((resolve) => E.beforeNextPaint(() => resolve(undefined)))
      zoomed = this.zoomed
    }
    const place = this.placeOnPage
    if (!zoomed || !place) return
    if (zoomed instanceof HTMLImageElement) await zoomed.decode().catch(() => undefined)
    const frames = [
      { transform: UIZoom.over(place, zoomed.getBoundingClientRect()), opacity: 0.6 },
      { transform: "none", opacity: 1 }
    ]
    zoomed.animate(frames, { duration: ZoomMotion.growMs, easing: ZoomMotion.ease })
  }

  /** Shrink back into its place on the page, then `shut()`;  at once when it can't move. */
  @E.untracked
  private async dismiss() {
    if (this.isShrinking) return
    const zoomed = this.zoomed
    const place = this.placeOnPage
    if (!zoomed || !place || ZoomMotion.isStill()) return this.shut()
    this.isShrinking = true
    const frames = [
      { transform: "none", opacity: 1 },
      { transform: UIZoom.over(place, zoomed.getBoundingClientRect()), opacity: 0.4 }
    ]
    // held at the end while the modal fades
    const shrinking = zoomed.animate(frames, {
      duration: ZoomMotion.shrinkMs,
      easing: ZoomMotion.ease,
      fill: "forwards"
    })
    await shrinking.finished.catch(() => undefined)
    this.isShrinking = false
    this.shut()
  }

  /**
   * Arrow keys while showing:  the next / previous zoomable on the page (`ImageZoom.step()`).
   * Not from a text field in the zoomed content, which keeps its arrows.
   */
  @E.on("keydown", { target: "renderRoot" })
  protected onKeyDown(event: KeyboardEvent) {
    const step = ARROW_STEPS[event.key]
    if (!step || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || !this.isShowing) return
    const typing = event.composedPath()[0]
    if (typing instanceof HTMLElement && typing.matches(TEXT_FIELDS)) return
    event.preventDefault()
    ImageZoom.step(step, this.src ? undefined : this.domElement, () => this.shut())
  }

  /** Shut:  no `src`, not open. */
  @E.untracked
  private shut() {
    if (this.src) this.domElement.removeAttribute("src")
    this.disclosure.close()
  }

  render(): JSX.Element {
    return (
      <>
        <Show when={!this.src}>
          <div
            ref={(element) => (this.view = element)}
            class={VIEW}
            part={this.partForName("view")}
            style={this.viewStyle}
          >
            <Show when={!this.isOpen}>
              <div class={SHRUNK} inert={true} style={{ zoom: String(this.shrinkRatio) }}>
                <slot />
              </div>
            </Show>
            <button
              type="button"
              class={SHOW}
              part={this.partForName("button")}
              aria-label={this.translationForKey("show")}
              aria-haspopup="dialog"
              aria-expanded={this.disclosure.ariaExpanded}
              title={this.translationForKey("show")}
              onClick={() => this.showFullSize()}
            />
          </div>
        </Show>
        <ui-modal
          ref={(element: HTMLElement) => (this.modal = element)}
          class={this.rootClass}
          part={this.partForName("base")}
          appearance="basic"
          closable=""
          visible={this.isShowing ? "" : undefined}
        >
          <Show when={this.src} fallback={this.fullContent()}>
            {(src) => (
              <figure class={FIGURE}>
                <img
                  class={IMAGE}
                  part={this.partForName("image")}
                  src={src()}
                  alt={
                    this.alt ? this.translationForKey("zoomed", { alt: this.alt }) : this.translationForKey("untitled")
                  }
                />
                <Show when={this.alt}>
                  <figcaption class={CAPTION} part={this.partForName("caption")}>
                    {this.alt}
                  </figcaption>
                </Show>
              </figure>
            )}
          </Show>
        </ui-modal>
      </>
    )
  }

  /** Its content, full size, while open:  at the width it had in the page. */
  private fullContent(): JSX.Element {
    return (
      <Show when={this.isOpen}>
        <div class={CONTENT} part={this.partForName("content")}>
          <div style={this.fullWidth ? { "inline-size": `${this.fullWidth}px` } : undefined}>
            <slot />
          </div>
        </div>
      </Show>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIZoom extends E.AttributeValues<typeof zoomVocabulary> {}

/** Arrow keys that step to the next (1) or previous (-1) zoomable. */
const ARROW_STEPS: Record<string, 1 | -1 | undefined> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }

/** What keeps its own arrow keys. */
const TEXT_FIELDS = "input:not([type=checkbox], [type=radio], [type=button]), textarea, select, [contenteditable]"

/** How many frames it waits for its picture or content to be drawn, before it gives up growing. */
const DRAW_FRAMES = 30

/** `shrink`'s default:  half size. */
const DEFAULT_RATIO = 0.5

/** Classes of its shadow markup:  the view, its shrunk content, its button;  the image, its figure and caption;  the content full size. */
const VIEW = "view"
const SHRUNK = "shrunk"
const SHOW = "show"
const FIGURE = "figure"
const IMAGE = "image"
const CAPTION = "caption"
const CONTENT = "content"
