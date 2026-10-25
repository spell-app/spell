import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell-ui/core"

import { epicZoomVocabulary } from "./EpicZoom.en"

import zoomCSS from "./EpicZoom.css?inline"

/****************
 * ### `<epic-zoom>`
 * One image shown full size over the page (epic `epic-engine` I129;  Owen, 2026-10-25:  "bring it up in a
 * full-screen modal so I can `escape` to close it").
 * - a `<ui-modal appearance="basic">` over a dark backdrop, the image as large as fits the window (never cropped, never enlarged
 *   past its own size), its alt text under it
 * - shown while `src` is set;  Escape, a click anywhere (the image, the backdrop) or the close button close it,
 *   and it removes its own `src`
 * - ONE per page, made by `ImageZoom.show()` (beside this file), which the docs runtime and `<epic-field>`'s
 *   request thumbnails call:  never written in a page
 ****************/
export class EpicZoom extends E.UIComponent<typeof epicZoomVocabulary> {
  @E.proto static vocabulary = epicZoomVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-zoom": zoomCSS }
  } satisfies Partial<E.ElementSetup>

  /** Closed (Escape, its close button, the backdrop):  its `src` goes, ready for the next. */
  @E.on("ui-closed", { target: "renderRoot" })
  protected onClosed() {
    this.domElement.removeAttribute("src")
  }

  /** A click on the image, or round it:  closed too, as a lightbox does. */
  @E.on("click", { target: "renderRoot" })
  protected onClick(event: MouseEvent) {
    if (event.target instanceof Element && event.target.closest(`.${FIGURE}`)) this.domElement.removeAttribute("src")
  }

  render(): JSX.Element {
    return (
      <ui-modal
        class={this.rootClass}
        part={this.partForName("base")}
        appearance="basic"
        closable=""
        visible={this.src ? "" : undefined}
      >
        <Show when={this.src}>
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
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicZoom extends E.AttributeValues<typeof epicZoomVocabulary> {}

/** Classes of its shadow markup:  the image and its caption, the image, the caption. */
const FIGURE = "figure"
const IMAGE = "image"
const CAPTION = "caption"
