import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell-ui/core"
import { imageVocabulary } from "./UIImage.en"

import imageCSS from "./UIImage.css?inline"

/****************
 * ### `UIImage`
 * The component behind `<ui-image>`:  an image, optionally a link.
 *
 * - Its shadow DOM is `<img class="ui … image" part="image" src alt width height loading>`;
 *   with `link`, Fomantic's wrapper form, `<a class="ui … image" part="image" href><img part="img" …></a>`,
 *   the link carrying the classes.
 *   The element is `display: contents`:  the inner box IS the image, so it floats and sits in text as Fomantic's did.
 *
 * - `alt` passes straight through:
 *   - `alt=""` is a decorative image (assistive tech skips it)
 *   - a MISSING `alt` stays missing:  a bug to fix in the page, which axe reports,
 *     not one to hide with an empty default
 *   - a linked image's `alt` names the link
 * - `width` / `height` are the native intrinsic size (they reserve space before it loads);
 *   `size` sets the drawn width.
 * - `caption` (or the `caption` slot) makes it a FIGURE (epic `ui-gaps` P12):
 *   `<figure part="figure">` round the image (or its link), then `<figcaption part="caption">` under it,
 *   no wider than the picture.
 * - `disabled`:  unusable, the base class's way (`elementSetup.disabled`):
 *   faded, the image (or its link) inert, `aria-disabled`;  a link also loses its link.
 * - `zoom` (epic `ui-gaps` P14):  a plain click, or Enter / Space, shows it full size in the page's `<ui-zoom>`
 *   (`ImageZoom.show()`, loaded on the first one).
 *   - without `link`, the image is a button for it:  focusable, named "<alt>:  show full size"
 *   - with `link`, a click with a modifier key still follows the link
 ****************/
export class UIImage extends E.UIComponent<typeof imageVocabulary> {
  @E.proto static vocabulary = imageVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { image: imageCSS },
    // `loading`:  Fomantic's placeholder look
    loading: "its own"
  } satisfies Partial<E.ElementSetup>

  /** Which named slots have content (the `caption` slot). */
  readonly slots = new E.SlotContent(this.domElement)

  /** A figure:  `caption`, or something in the `caption` slot. */
  get hasCaption(): boolean {
    return !!this.caption || this.slots.hasContent(this.slotForName("caption"))
  }

  render(): JSX.Element {
    return (
      <Show when={this.hasCaption} fallback={this.picture()}>
        <figure class={FIGURE} part={this.partForName("figure")}>
          {this.picture()}
          <figcaption part={this.partForName("caption")}>
            <slot name={this.slotForName("caption")}>{this.caption}</slot>
          </figcaption>
        </figure>
      </Show>
    )
  }

  /** The image, or its link round it. */
  private picture(): JSX.Element {
    return (
      <Show when={this.link} fallback={this.image("image")}>
        <a
          class={this.rootClass}
          part={this.partForName("image")}
          href={this.disabled ? undefined : this.link}
          target={this.sharedTarget}
          aria-disabled={this.disabled ? "true" : undefined}
          onClick={this.onZoomClick}
        >
          {this.image("img")}
        </a>
      </Show>
    )
  }

  /** The `<img>`:  the root (part `image`, with the classes), or the link's child (part `img`). */
  private image(part: "image" | "img"): JSX.Element {
    const isButton = () => part === "image" && this.isZoomButton
    return (
      <img
        class={part === "image" ? this.rootClass : undefined}
        part={this.partForName(part)}
        src={this.src}
        alt={this.alt}
        width={this.width}
        height={this.height}
        loading={this.loading as "eager" | "lazy" | undefined}
        role={isButton() ? "button" : undefined}
        tabindex={isButton() ? 0 : undefined}
        aria-label={isButton() ? this.zoomLabel : undefined}
        aria-haspopup={isButton() ? "dialog" : undefined}
        onClick={part === "image" ? this.onZoomClick : undefined}
        onKeyDown={part === "image" ? this.onZoomKey : undefined}
      />
    )
  }

  ////////////////
  // ## Zoom
  ////////////////

  /** `zoom`, with no link:  the image itself is the button that shows it full size. */
  get isZoomButton(): boolean {
    return !!this.zoom && !this.link && !this.disabled
  }

  /** The zoom button's name:  its alt text, then what it does. */
  get zoomLabel(): string {
    return this.alt ? this.translationForKey("zoom", { alt: this.alt }) : this.translationForKey("zoomUntitled")
  }

  /** A plain click on it (or its link), with `zoom`:  shown full size, the link not followed. */
  @E.untracked
  private readonly onZoomClick = (event: MouseEvent) => {
    if (!this.zoom || this.disabled || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    this.showFullSize()
  }

  /** Enter or Space on the zoom button. */
  @E.untracked
  private readonly onZoomKey = (event: KeyboardEvent) => {
    if (!this.isZoomButton || (event.key !== "Enter" && event.key !== " ")) return
    event.preventDefault()
    this.showFullSize()
  }

  /** In the page's `<ui-zoom>`:  its family (and `ImageZoom`) loaded on the first one, so an image without `zoom` never pays for it. */
  private showFullSize() {
    const image = this.domElement.shadowRoot?.querySelector("img")
    if (!image) return
    void import("spell-ui/components/ui-zoom")
      .then(({ ImageZoom }) => ImageZoom.show(image))
      .catch((error) => console.error(error))
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIImage extends E.AttributeValues<typeof imageVocabulary> {}

/** The figure's class. */
const FIGURE = "figure"
