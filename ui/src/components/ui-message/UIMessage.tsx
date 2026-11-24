import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E, UI, UIT } from "spell/ui/core"
import { messageVocabulary } from "./UIMessage.en"

import messageCSS from "./UIMessage.css?inline"

/****************
 * ### `UIMessage`
 * The component behind `<ui-message>`:  a box of text telling the reader something,
 * with an optional icon, header and close button.
 *
 * - Its shadow DOM is one box, `<div class="ui … message" part="message">`, holding, in order:
 *   the icon box, ALWAYS a `<div class="content" part="content">` (the `header` shorthand, then the default slot),
 *   and the `dismissible` close button.
 *   - It adds the `icon` class (before the noun) while there's an icon (the `icon` shorthand or a slotted
 *     `slot="icon"`):  `UIMessage.css` switches to the icon layout (`--_ui-message-layout: icon`) by it.
 *
 * - It OWNS the `header` and `content` parts (`ownsParts`):
 *   a slotted `<ui-header>` or `<ui-content>` finds it through `PartContext`,
 *   sets `:state(in-message)` and styles itself from `UIParts.css`,
 *   reading the owner tokens `UIMessage.css` declares on the inner box.
 *   `define()` registers it as their owner;  nothing to do here.
 *
 * - Dismissing (`disclosure`, as the nag and the toast close):  the close button sends the cancelable `ui-closing`.
 *   - Unless it's cancelled, the element sets `hidden` on ITSELF, then sends `ui-closed`.
 *   - It never removes itself:  a framework that drew the node still owns it.
 *
 * - No role:  a message inserted to announce something gets `role="status"` or `alert` from the page.
 *
 * - A `floating` message, lifted over the page (a warning, a notice), drops in as it first shows:
 *   a short slide and fade, `UI.transitions`' `fade-down`, so it catches the eye (epic `editor` T154).
 *   - Only the first time it's drawn:  a message the page hides and shows again fades, as every element does.
 *   - Reduced motion:  none, as every `UI.transitions` animation.
 *   - A message in the page's flow never moves:  a page full of them would all slide in at once.
 ****************/
export class UIMessage extends E.UIComponent<typeof messageVocabulary> {
  @E.proto static vocabulary = messageVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { message: messageCSS },
    cssStates: ["inverted"]
  } satisfies Partial<E.ElementSetup>

  /** Which of its slots have content in the light DOM:  a slotted icon. */
  readonly slots = new E.SlotContent(this.domElement)

  /** The glyph of the `icon` shorthand. */
  readonly iconGlyph = new E.IconGlyph({ owner: this, name: () => this.icon })

  /**
   * Shown until its close button closes it:  the cancelable `ui-closing`, then `hidden` on the DOM element and
   * `ui-closed`.
   * - Open means not `hidden`:  the page shows it again by taking `hidden` off.
   */
  readonly disclosure = new E.Disclosure({
    component: this,
    kept: {
      isOpen: () => !this.domElement.hidden,
      setOpen: (open) => {
        this.domElement.hidden = !open
      }
    },
    detail: (_open, originalEvent): UIT.MessageDismissDetail => ({ originalEvent }),
    afterDetail: () => ({}),
    onChange: (open) => {
      if (!open) this.disclosure.sendAfter(false)
    }
  })

  /** The close button of a `dismissible` message. */
  readonly closeButton = new E.CloseButton({
    owner: this,
    shows: () => !!this.dismissible,
    label: () => this.translationForKey("dismiss"),
    part: this.partForName("close"),
    onClick: (event) => this.disclosure.close(event)
  })

  /** Its box, which the entrance animates. */
  private box?: HTMLDivElement

  /** Has it come in already?  A `floating` message drops in only the first time it shows. */
  private hasEntered = false

  /**
   * Connected and ready, and `floating`:  drop in, once (see the class's docs).
   * - It waits for the runtime (`isReady`), as the render does:  the entrance animates the rendered box.
   */
  @E.onChange("isConnected", "isReady")
  protected onConnectedChanged(isConnected: boolean, isReady: boolean) {
    if (!isConnected || !isReady || this.hasEntered || !this.floating || !this.box) return
    this.hasEntered = true
    void UI.transitions.animate({ element: this.box, name: FADE_DOWN, direction: UIT.IN })
  }

  /** Has an icon (shorthand or `icon` slot)? */
  get hasIcon(): boolean {
    return !!this.icon || this.slots.hasContent(this.slotForName(UIT.ICON))
  }

  /** The `icon` class before the noun while it shows an icon:  the sheet's icon layout. */
  protected get extraClass(): string | undefined {
    return this.hasIcon ? UIT.ICON_CLASS : undefined
  }

  ////////////////
  // ## Rendering
  ////////////////

  render(): JSX.Element {
    return (
      <div class={this.rootClass} part={this.partForName("message")} ref={(element) => (this.box = element)}>
        <Show when={this.hasIcon}>
          <span class={UIT.ICON} part={this.partForName("icon")}>
            <slot name={this.slotForName(UIT.ICON)}>{this.iconGlyph.svg}</slot>
          </span>
        </Show>
        <div class={UIT.CONTENT} part={this.partForName("content")}>
          <Show when={this.heading}>
            <div class={UIT.HEADER} part={this.partForName("header")}>
              {this.heading}
            </div>
          </Show>
          <slot />
        </div>
        {this.closeButton.draw()}
      </div>
    )
  }
}
/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIMessage extends E.AttributeValues<typeof messageVocabulary> {}

/** `UI.transitions` animation a `floating` message comes in with:  it drops in. */
const FADE_DOWN = "fade-down"
