import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/ui/core"
// the family barrel, not the leaf:
// the lib build then imports `ui-section.js` instead of splitting a shared chunk
// (SIDE EFFECT:  defines `<ui-section>` / `<ui-sections>`, which panels nest in and hold)
import { UISection } from "spell/ui/components/ui-section"
import { FoldIconPlace, type SectionVocabulary } from "spell/ui/components/ui-section/UISection.types"
import { ScrollShades } from "./ScrollShades"
import { PANE_APPEARANCE, panelVocabulary } from "./UIPanel.en"

import panelCSS from "./UIPanel.css?inline"

/****************
 * ### `UIPanel`
 * The component behind `<ui-panel>`:  a property panel, as in the brand's inspector
 * (the Color Set Chooser's left column).
 *
 * - A tinted box whose title is a full-width HEADER BAND, over its fields.
 *   - A panel inside a panel is a SUB-HEAD BAND (small capitals) over its own fields.
 *   - Every band can fold.
 * - It IS a `<ui-section>` (it extends `UISection`):  the same attributes, slots, parts,
 *   events and folding (`collapsible`, `open`, `ui-opening` / `ui-closing`, find-in-page, `source`).
 *   - Its vocabulary is built on the section's (`UIPanel.en.ts`),
 *     so an attribute the section gains reaches the panel too.
 *   - Only the look differs:  `UIPanel.css`, adopted after the section's sheet.
 * - Classes:  `ui … panel section`, plus `sub` (before the noun too) when the section around it is a panel.
 * - The chevron sits at the far end of each band, after any actions:
 *   the section's `fold-icon="end"` is the panel's default (`defaultFoldIcon`).
 *   `info` puts the section's tip under a band.
 * - `color`:  any hue, a theme's too (`spell-brand`'s `accent`);  no `color`:  `primary`.
 *   The sheet paints the box, bands, border and text from it,
 *   and hands it to the sub-panels that have no `color` of their own.
 * - Tokens (`--ui-panel-*`, read through private aliases):
 *   background, border colour, header and sub-head bands, radius, padding, gap, band space, shadow.
 *   Their defaults come from the panel's hue, with a plain `--ui-*` value under every `spell-brand` role,
 *   so it needs no brand theme.
 * - A folded LAST sub-panel closes the outer box:  its band reaches the bottom edge (`:host(:last-child)`).
 * - `appearance="pane"` (`:state(pane)`):  a whole pane under one flat bar, rather than a box:
 *   the title is the bar, 40px with a hairline;  the content fills what's left, so it can scroll by itself.
 *   - A `<ui-toolbar appearance="segmented header">` in `slot="actions"` takes the rest of the bar.
 *   - So the same widget is a pane's header wherever one's needed, folding or not.
 *   - SCROLL SHADES:  a soft shadow at the top of its body while it's scrolled down from the top
 *     (`:state(more-above)`), and at the bottom while there's more below (`:state(more-below)`);
 *     none at all when nothing scrolls (epic `editor` I201, I227).
 *     - The body is the first child in its content that scrolls by itself (`ScrollShades`).
 *     - Tokens:  `--ui-panel-scroll-shade` (its colour), `-size` (its height), `-top` (how far down the
 *       top one starts, under a line of the body's that sticks at the top).
 ****************/
export class UIPanel extends UISection {
  // the section's names under the panel's tag:  same shape, but TypeScript only knows the section's literals
  @E.proto static vocabulary = panelVocabulary as unknown as SectionVocabulary
  // a base class too (`<ui-property-group>` is a panel band):  typed as one, so a subclass may state other keys
  @E.protoMerged static elementSetup: Partial<E.ElementSetup> = {
    styleSheets: { ...UISection.prototype.elementSetup.styleSheets, panel: panelCSS }
  }
  // the band's chevron at its far end, after any actions (`fold-icon="start"` moves it back)
  @E.proto static defaultFoldIcon: FoldIconPlace = FoldIconPlace.end

  /** A whole pane under one flat bar:  `appearance` holds `pane`. */
  @E.cssState("pane")
  get isPane(): boolean {
    return String(this.appearance ?? "")
      .split(/\s+/)
      .includes(PANE_APPEARANCE)
  }

  ////////////////
  // ## Scroll shades
  ////////////////

  /** A pane's body is scrolled down from its top:  its top shade shows. */
  @E.cssState("more-above")
  @E.state
  accessor hasMoreAbove = false

  /** A pane's body has more below what shows:  its bottom shade shows. */
  @E.cssState("more-below")
  @E.state
  accessor hasMoreBelow = false

  /** Which ends of a pane's body can still scroll, while it's a pane in the page. */
  private readonly scrollShades = new ScrollShades(this.domElement, ({ start, end }) => {
    this.hasMoreAbove = start
    this.hasMoreBelow = end
  })

  /** A pane in the page, drawn:  watch its body's scroll;  else no shades. */
  @E.onChange("isReady", "isConnected", "isPane")
  protected onScrollShadesChanged(isReady: boolean, isConnected: boolean, isPane: boolean) {
    if (!isReady || !isConnected || !isPane) return undefined
    this.scrollShades.refresh()
    return () => this.scrollShades.stop()
  }

  /** What's in it changed:  its body may be another, or another size. */
  @E.watches({ childList: true, subtree: true })
  protected onBodyChanged() {
    if (this.isReady && this.domElement.isConnected && this.isPane) this.scrollShades.refresh()
  }

  /** A pane's two shades, first in its content:  drawn over its body, shown by its states. */
  protected contentStart(): JSX.Element {
    return (
      <Show when={this.isPane}>
        <div class={SCROLL_SHADE_TOP} aria-hidden="true" />
        <div class={SCROLL_SHADE_BOTTOM} aria-hidden="true" />
      </Show>
    )
  }

  /** `panel`, and `sub` inside another panel. */
  protected get extraClass(): string | undefined {
    const sub = this.enclosingSection instanceof UIPanel ? SUB_PANEL : undefined
    return [super.extraClass, PANEL, sub].filter(Boolean).join(" ")
  }
}

/** Class word added before the section's noun:  `ui ... panel section`. */
const PANEL = "panel"

/** Class word of a panel inside a panel:  drawn as a sub-head band. */
const SUB_PANEL = "sub"

/** Classes of a pane's top scroll shade. */
const SCROLL_SHADE_TOP = "top scroll shade"

/** Classes of a pane's bottom scroll shade. */
const SCROLL_SHADE_BOTTOM = "bottom scroll shade"
