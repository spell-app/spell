import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/ui/core"
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

  /** A click on the zoomed image:  shut too, as a lightbox does. */
  @E.on("click", { target: "renderRoot" })
  protected onClick(event: MouseEvent) {
    if (event.target instanceof Element && event.target.closest(`.${FIGURE}`)) this.shut()
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
