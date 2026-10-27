import { Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E, UIT } from "spell-ui/core"
import { CODE_SPAN, HeadingLevels, type HeadingBounds } from "spell-ui/docs-components/docs-components.types"
import { ExampleSource } from "./ExampleSource"
import { docsExampleVocabulary } from "./UIDocsExample.en"

import exampleCSS from "./UIDocsExample.css?inline"

/****************
 * ### `UIDocsExample`
 * The component behind `<ui-docs-example>`:  Fomantic's docs example block.
 * A header and description, its own children LIVE, and their source in a code pane the code button shows and hides.
 *
 * - Its shadow DOM:  `<section class="ui [bare] [variation] example" part="example">` holding
 *   - the header row (`<ui-header>`), when there's a header;  then the description
 *     - both on the page, outside the frame (Owen, 2026-10-23:  "Text for the example should be OUTSIDE the ring")
 *   - `<div class="frame">`:
 *     - the code `<ui-button part="toggle">`, over the frame's top right corner
 *     - just left of it, the `tools` slot's buttons, in a row (`part="tools"`):  the page's own, in its look
 *     - `<ui-segment part="demo">` around the default slot (the live example:  the element's own children)
 *     - while `code` is on, `<ui-segment part="code">`, with the markup in a `<ui-code>`;
 *       or what the `source` slot holds instead (an editor:  spell-app's notebook examples)
 * - The markup shown is read ONCE, on first connect (`ExampleSource.of()`):
 *   - a `<template>` child
 *   - else the page snapshot the site entry took before any family loaded
 *   - else the live children minus runtime attributes
 *   - see `ExampleSource` for why, and its limits
 * - A `<template>` child is also stamped out live, once, right after it
 *   (on a microtask:  never inside this render, so the stamped elements upgrade under their own owners).
 * - `code` is the open state (auto-controlled, reflected):
 *   the button flips it and fires `ui-opened` / `ui-closed` (`{ open }`);  `:state(open)` follows it.
 * - A doc-only element (`src/docs-components/`):  its shadow DOM is built of other families' widgets,
 *   which its barrel imports.
 ****************/
export class UIDocsExample extends E.UIComponent<typeof docsExampleVocabulary> {
  // widened, as `UICode`'s is:  a subclass (spell-app's `<spell-example>`) brings its own tag
  @E.proto static vocabulary: E.ComponentVocabulary = docsExampleVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "docs-example": exampleCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** The markup to show, read once before anything here touches the light DOM. */
  readonly sourceMarkup: string = isServer ? "" : ExampleSource.of(this.domElement)

  /** Which slots have content:  the description shows only when there is one. */
  readonly slots = new E.SlotContent(this.domElement)

  constructor(...args: ConstructorParameters<typeof E.UIComponent>) {
    super(...args)
    // after `sourceMarkup` is read:  the fields initialize first
    if (!isServer) this.stamp()
  }

  ////////////////
  // ## The code pane
  ////////////////

  /** `code`:  the code pane is open. */
  @E.cssState("open")
  @E.controlled("code")
  accessor isCodeOpen = false

  /**
   * The code pane is drawn:  open, or still rolling closed.
   * - The open card's look stays until it has rolled away
   *   (Owen, 2026-10-23:  "code examples need to roll closed as well").
   */
  @E.cssState("code-shown")
  @E.state
  accessor isCodeShown = false

  /**
   * The code was open from the start (`code` in markup, or a page drawing the example again, open):
   * it shows at once, without rolling open;  the code button rolls it from then on.
   */
  @E.cssState("open-at-start")
  @E.state
  accessor isOpenAtStart = this.isCodeOpen

  /** Drawn at once as it opens;  as it closes, once its roll (`CLOSE_SECONDS`) is done, unless it opened again. */
  @E.onChange("isCodeOpen")
  protected onCodeOpenChanged(isOpen: boolean) {
    this.closingTimer?.cancel()
    if (isOpen) this.isCodeShown = true
    else if (this.isCodeShown) this.closingTimer = E.after(CLOSE_SECONDS, () => (this.isCodeShown = false))
  }

  /** The wait for the code to finish rolling closed (`onCodeOpenChanged()`). */
  private closingTimer?: E.CancelablePromise<unknown>

  /**
   * The code pane, open as `code` (`isCodeOpen`):  `ui-opened` / `ui-closed` as the code button opens or closes it;
   * the button's `aria-expanded`.
   */
  readonly disclosure = new E.Disclosure({ component: this, member: "isCodeOpen" })

  /** Open or close the code pane, as the viewer did with `event`:  then `ui-opened` / `ui-closed`. */
  toggle(event?: Event): void {
    this.isOpenAtStart = false
    if (this.disclosure.toggle(event)) this.disclosure.sendAfter(this.isCodeOpen, event)
  }

  /** The code button's name:  what a click does. */
  private get toggleLabel(): string {
    return this.isCodeOpen ? this.translationForKey("hideCode") : this.translationForKey("showCode")
  }

  /** The live example sits in a frame:  the code is shown (open, or rolling closed) and the example isn't `bare`. */
  private get demoIsFramed(): boolean {
    return this.isCodeShown && !this.bare
  }

  ////////////////
  // ## The example
  ////////////////

  /** The `description` attribute as text, with each backticked span as `<code>`. */
  private get descriptionWithCode(): (string | JSX.Element)[] {
    const text = this.description ?? ""
    return text.split(CODE_SPAN).map((piece, index) => (index % 2 ? <code>{piece}</code> : piece))
  }

  /**
   * Stamp a `<template>` child's content out right after it, once, if there is one.
   * - On a microtask:  this runs while the element renders, and the new elements must upgrade outside it.
   */
  private stamp() {
    const template = ExampleSource.template(this.domElement)
    if (template) E.afterSolidUpdate(() => template.after(template.content.cloneNode(true)))
  }

  ////////////////
  // ## Rendering
  ////////////////

  render(): JSX.Element {
    return (
      <section class={this.rootClass} part={this.partForName("example")}>
        <Show when={this.header}>
          <div class={HEADING_CLASS}>
            <ui-header
              part={this.partForName("header")}
              level={HeadingLevels.attributeFor(HeadingLevels.levelFor(this.level, LEVELS))}
              size={this.variation ? "small" : undefined}
            >
              {this.header}
            </ui-header>
          </div>
        </Show>
        <Show when={this.description || this.slots.hasContent(this.slotForName("description"))}>
          <div class={UIT.DESCRIPTION} part={this.partForName("description")}>
            <slot name={this.slotForName("description")}>{this.descriptionWithCode}</slot>
          </div>
        </Show>
        <div class={FRAME_CLASS}>
          {/* before the code button:  the Tab order follows the row, left to right */}
          <div class={TOOLS_CLASS} part={this.partForName("tools")}>
            <slot name={this.slotForName("tools")} />
          </div>
          <ui-button
            part={this.partForName("toggle")}
            icon={CODE_ICON}
            size={this.variation ? "mini" : "tiny"}
            aria-label={this.toggleLabel}
            title={this.toggleLabel}
            aria-expanded={this.disclosure.ariaExpanded}
            aria-controls={CODE_PANE_ID}
            ref={(button: HTMLElement) => button.addEventListener("click", (event) => this.toggle(event))}
            appearance="circular basic"
          />
          <ui-segment
            part={this.partForName("demo")}
            appearance={this.demoIsFramed ? undefined : "basic"}
            attach={this.demoIsFramed ? UIT.TOP : undefined}
          >
            <slot />
          </ui-segment>
          <Show when={this.isCodeShown}>
            <ui-segment
              id={CODE_PANE_ID}
              part={this.partForName("code")}
              attach={this.bare ? undefined : UIT.BOTTOM}
              appearance="secondary"
            >
              <slot name={this.slotForName("source")}>
                <ui-code
                  part={this.partForName("source")}
                  language={this.language || DEFAULT_LANGUAGE}
                  copy=""
                  content={this.sourceMarkup}
                />
              </slot>
            </ui-segment>
          </Show>
        </div>
      </section>
    )
  }
}

/** The vocabulary getters, typed (`UIComponent`'s doc). */
export interface UIDocsExample extends E.AttributeValues<typeof docsExampleVocabulary> {}

/** Class word of the header row:  the title. */
const HEADING_CLASS = "heading"

/** How long the code takes to roll closed, s:  `UIDocsExample.css`'s transition (0.26s), and a little more. */
const CLOSE_SECONDS = 0.3

/** Class word of the frame:  the live example, the code pane, and the code button over their top right corner. */
const FRAME_CLASS = "frame"

/** Class word of the row of the page's own buttons (the `tools` slot), just left of the code button. */
const TOOLS_CLASS = "tools"

/** The icon of the code button:  Fomantic's `code` icon. */
const CODE_ICON = "code"

/** `language` when unset (the vocabulary's default):  the source is markup. */
const DEFAULT_LANGUAGE = "html"

/** Id of the code pane inside the shadow root, for the button's `aria-controls`. */
const CODE_PANE_ID = "code"

/** `level`:  any heading level;  unset, `4`:  Fomantic's examples are `h4`. */
const LEVELS: HeadingBounds = { min: 1, max: 6, fallback: 4 }
