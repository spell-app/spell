import { Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E, UI } from "spell-ui/core"
import { UIRoot } from "spell-ui/components/ui-root"
import { pageVocabulary } from "./UIPage.en"

import pageCSS from "./UIPage.css?inline"
import pagePageCSS from "./UIPage.page.css?inline"

/****************
 * ### `<ui-page>`
 * The component behind `<ui-page>`:  a whole window's frame, and a root (epic `ui-gaps` P10).
 *
 * - Its regions are the HTML landmarks screen readers jump between:
 *   `<header>`, `<nav>`, `<main>` (the unnamed slot), `<aside>` and `<footer>`, laid out in a CSS grid.
 *   - A region with nothing slotted into it isn't drawn.
 * - "Skip to content" comes first, hidden until the keyboard reaches it:  it moves focus to the main content.
 * - The whole window:  the page's background, the body's margin cleared (a page sheet), the system's light or dark
 *   when no `theme` is set.
 * - A root too, as `<ui-root>`:  it loads the components inside it, and shows them once they're ready.
 * - ONE per page:  a second still draws, and says so in the console.
 ****************/
export class UIPage extends UIRoot<typeof pageVocabulary> {
  @E.proto static vocabulary = pageVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { ...UIRoot.prototype.elementSetup.styleSheets, page: pageCSS }
  } satisfies Partial<E.ElementSetup>

  /** Which named slots have content. */
  readonly slots = new E.SlotContent(this.domElement)

  /** The main region, once drawn. */
  private main: HTMLElement | undefined

  /** Has slot `name` content? */
  private has(name: "header" | "nav" | "aside" | "footer"): boolean {
    return this.slots.hasContent(this.slotForName(name))
  }

  protected override content(): JSX.Element {
    return (
      <div class={this.rootClass} part={this.partForName("page")} style={this.contentStyle}>
        <a class={SKIP} part={this.partForName("skip")} href="#" onClick={(event) => this.skipToContent(event)}>
          {this.isReady ? this.translationForKey("skip") : ""}
        </a>
        <Show when={this.has("header")}>
          <header part={this.partForName("header")}>
            <slot name={this.slotForName("header")} />
          </header>
        </Show>
        <Show when={this.has("nav")}>
          <nav part={this.partForName("nav")}>
            <slot name={this.slotForName("nav")} />
          </nav>
        </Show>
        <main ref={(main: HTMLElement) => (this.main = main)} part={this.partForName("main")} tabindex="-1">
          <slot />
        </main>
        <Show when={this.has("aside")}>
          <aside part={this.partForName("aside")}>
            <slot name={this.slotForName("aside")} />
          </aside>
        </Show>
        <Show when={this.has("footer")}>
          <footer part={this.partForName("footer")}>
            <slot name={this.slotForName("footer")} />
          </footer>
        </Show>
      </div>
    )
  }

  /** "Skip to content":  focus the main region (a link's `#id` can't reach into a shadow root). */
  private skipToContent(event: MouseEvent) {
    event.preventDefault()
    this.main?.focus()
  }

  /**
   * While connected:  its page sheet in the document, and one page per document.
   * - SIDE EFFECT:  a console warning when another page is already there;  this one still draws.
   */
  @E.whileConnected
  protected watchPage() {
    if (isServer) return undefined
    // the runtime loads as the root connects:  register once it's there
    void UI.load()
      .then(() => UI.styles.register(PAGE_SHEET, pagePageCSS, { page: true }))
      .catch((error: unknown) => E.Warnings.warn("<ui-page>", "can't add its page sheet:", error))
    const pages = UIPage.connected
    if (pages.size) E.Warnings.warn("<ui-page>", "a second page frame on this page;  one <ui-page> frames a window")
    pages.add(this)
    return () => pages.delete(this)
  }

  /** The pages in the document now. */
  private static readonly connected = new Set<UIPage>()

  /** Forget the connected pages, for tests. */
  static reset() {
    UIPage.connected.clear()
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIPage extends E.AttributeValues<typeof pageVocabulary> {}

/** The skip link's class. */
const SKIP = "skip"

/** The page sheet's name in `UI.styles`. */
const PAGE_SHEET = "page-frame"
