import type { JSX } from "@solidjs/web"

import { E } from "spell/ui/core"
// the family barrel, not the leaf:
// the lib build then imports `ui-menu.js` instead of splitting a shared chunk
// (SIDE EFFECT:  defines `<ui-menu>` and `<ui-item>`, which an app menu extends and holds)
import { UIMenu } from "spell/ui/components/ui-menu"
import type { menuVocabulary } from "spell/ui/components/ui-menu/UIMenu.en"
import { appMenuVocabulary } from "./UIAppMenu.en"

import appMenuCSS from "./UIAppMenu.css?inline"

/****************
 * ### `<ui-app-menu>`
 * An app's top bar:  joined to the top of its window or page, in three sections.
 *
 *     <nav class="ui header menu" part="menu">
 *       <div class="start" part="start">  <slot name="start">  </div>     (a menu or sidebar button, a title)
 *       <div class="middle" part="middle">  <slot>  </div>                (on the bar's centre)
 *       <div class="end" part="end">  <slot name="end">  </div>           (buttons, at the bar's end)
 *     </nav>
 *
 * - It IS a `<ui-menu>` (it extends `UIMenu`, as `<ui-toolbar>` does):
 *   the same attributes, items, events and menubar, sub-menus in any section.
 *   - Its vocabulary is built on the menu's (`UIAppMenu.en.ts`).
 * - Its look is the menu's window bar, always (`UIMenu.css`, "Bar"):
 *   flat, full width, a hairline under it, dressed in the theme's bar;  `--ui-menu-header-bar-*` tune it.
 *   - It was `<ui-menu appearance="header">` till epic `mockup` T35:  that still draws the same bar.
 * - Its sections:
 *   - the start and end share what the middle leaves, so the middle stays on the bar's centre
 *   - each is at least its content's width:  too narrow for all three, the bar scrolls sideways, never overlaps
 *   - the end's content is pushed to the bar's end
 * - Its own items fill the bar's height:  no room of their own above or below.
 *   - Not a sub-menu's:  they adopt the sub-menu's sheets (`UIItem.styleSheetNames`), so the page sets theirs.
 ****************/
export class UIAppMenu extends UIMenu {
  // the menu's names under the app menu's tag:  same shape, but TypeScript only knows the menu's literals
  @E.proto static vocabulary = appMenuVocabulary as unknown as typeof menuVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { ...UIMenu.prototype.elementSetup.styleSheets, appMenu: appMenuCSS }
  } satisfies Partial<E.ElementSetup>

  /** The menu's window bar, whatever its `appearance`. */
  protected get extraClass(): string | undefined {
    return BAR_CLASS
  }

  /** Its three sections, each a box around its slot;  the middle, the menu's default slot. */
  protected boxContent(): JSX.Element {
    return (
      <>
        {this.section(START)}
        {this.section(MIDDLE)}
        {this.section(END)}
      </>
    )
  }

  /** Section `name`'s box. */
  private section(name: Section): JSX.Element {
    const slotName = name === MIDDLE ? undefined : this.slotForName(name as never)
    return (
      <div class={name} part={this.partForName(name as never)}>
        <slot name={slotName} />
      </div>
    )
  }
}

////////////////
// ## Constants
////////////////

/** The menu's class word for its window bar (`UIMenu.css`, "Bar"). */
const BAR_CLASS = "header"

/** The start section (and its box's class word, part and slot). */
const START = "start"

/** The middle section:  the menu's default slot. */
const MIDDLE = "middle"

/** The end section. */
const END = "end"

/** One of the bar's sections. */
type Section = typeof START | typeof MIDDLE | typeof END
