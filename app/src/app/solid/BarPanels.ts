import { cssSecondsFor } from "spell/util/dom"
import { afterSolidUpdate } from "spell/util/timing"

/****************
 * ### `BarPanels`
 * The panels that slide out from behind one of the editor's bars, as one (epic `editor` T173, T187):
 * the add bar's sub-panels (`RAIL_PANELS`, `PaletteView.tsx`) and the top bar's menus (`TOP_BAR_PANELS`, `MenuBar.tsx`).
 * - Which is out, and the button it's out of.
 * - Pointing at another button while one is out opens that one at once:
 *   the one out goes as it opens, with no slide back, and the new one glides from where it was to its own button
 *   (`gliding`, and the glide's distance in its `glideToken`, which the bar's sheet reads).
 *   - Owen, T173:  "hovering over other items in the bar should open them immediately with an animation like the bar is
 *     moving down";  T187:  the top bar's menus "look like they come from under the bar".
 * - The same just after one went (the bar's `reopensWithinMs`):  the mouse crossing a gap.
 * - Otherwise a panel slides out from behind the bar:  the sheet's own `@starting-style`.
 * - The bar's sheet draws all of it;  this only says which panel is out, and where a glide starts.
 * - One per bar, never shared:  the add bar's and the top bar's don't glide into each other.
 ****************/
export class BarPanels {
  /** The panel out, and the button it's out of. */
  private shown: { panel: BarPanel; button: HTMLElement } | undefined

  /** The size a gliding panel starts at:  the last one's (I365). */
  private sizeFrom: { panel: BarPanel; size: Size } | undefined

  /** The panel to go once the one replacing it opens. */
  private leaving: BarPanel | undefined

  /** The last panel to go, its button, and when:  a button reached just after opens at once too. */
  private gone: { panel: BarPanel; button: HTMLElement; at: number } | undefined

  constructor(readonly options: BarPanelsOptions) {}

  /**
   * Follow `panel`, out of `buttonOf()`, as it shows and hides:  `setOut()`, when given, says whether it's out.
   * - Every way it opens and closes counts:  its own hover or click, Escape, a click elsewhere, code closing it.
   */
  follow(panel: BarPanel, buttonOf: () => HTMLElement | undefined, setOut?: (isOut: boolean) => void): void {
    panel.addEventListener("beforetoggle", (event) => {
      const button = buttonOf()
      const isOpening = (event as ToggleEvent).newState === "open"
      setOut?.(isOpening)
      if (isOpening) {
        panel.classList.remove(SWITCHING)
        if (button) this.shown = { panel, button }
        // the one it replaces goes only now:  a panel opening for the first time takes a moment to draw
        const leaving = this.leaving
        this.leaving = undefined
        if (leaving && leaving !== panel) leaving.visible = false
        // its size from the last one's, as it glides (I365):  measured once it shows, before it's painted
        const from = this.sizeFrom
        this.sizeFrom = undefined
        if (from?.panel === panel) afterSolidUpdate(() => this.growFrom(panel, from.size))
        return
      }
      panel.classList.remove(GLIDING)
      if (this.shown?.panel !== panel) return
      this.shown = undefined
      if (button) this.gone = { panel, button, at: performance.now() }
    })
  }

  /**
   * The mouse is on `button`:  open its `panel` at once if another is out, or just went (`reopensWithinMs`).
   * - Returns whether it did:  otherwise the panel opens as it usually would (once the mouse rests, or on a click).
   */
  pointedAt(panel: BarPanel, button: HTMLElement): boolean {
    if (this.shown?.panel === panel || !this.last) return false
    this.open(panel, button)
    return true
  }

  /** Open `panel`, out of `button`, at once:  gliding from the panel out (or just gone), else sliding out. */
  open(panel: BarPanel, button: HTMLElement): void {
    if (this.shown?.panel === panel) return
    const last = this.last
    this.gone = undefined
    if (last && last.panel !== panel) {
      last.panel.classList.add(SWITCHING)
      this.leaving = last.panel
      // from the last one's place:  as far from its button as this one will be from its own
      const glide = startOf(last.button, this.options.along) - startOf(button, this.options.along)
      panel.style.setProperty(this.options.glideToken, `${Math.round(glide)}px`)
      panel.classList.add(GLIDING)
      const box = boxOf(last.panel)?.getBoundingClientRect()
      this.sizeFrom = { panel, size: { width: box?.width ?? 0, height: box?.height ?? 0 } }
    }
    panel.visible = true
  }

  /**
   * Grow or shrink `panel` from `size` to its own, as it glides into place (epic `editor` I365, Owen:  "the open menu
   * jumps in height as I hover over the other tabs in the sidebar, feels janky").
   * - Its height only, or its width too, as the bar's `grows` says.
   * - In the glide's time and ease (`--ui-duration-normal`, `--ui-ease-out`), so the two read as one move.
   * - Its box cuts what's past it meanwhile.
   * - Reduced motion:  none.
   */
  private growFrom(panel: BarPanel, size: Size): void {
    const own = boxOf(panel)?.getBoundingClientRect()
    if (!own?.height || !size.height) return
    if (this.options.grows === "height") {
      if (Math.abs(own.height - size.height) < 1) return
      this.glideBox(panel, [{ height: `${size.height}px` }, { height: `${own.height}px` }])
      return
    }
    this.resize(panel, size, own)
  }

  /**
   * Glide `panel` from size `from` to `to`, as what's in it changes (the `+` panel's search;  epic `editor` I369, Owen:
   * "The menu should animate thinner/wider as I type in the search box"):  its box cuts what's past it meanwhile.
   * - Reduced motion:  none.
   */
  resize(panel: BarPanel, from: Size, to: Size): void {
    if (Math.abs(from.width - to.width) < 1 && Math.abs(from.height - to.height) < 1) return
    this.glideBox(panel, [
      { width: `${from.width}px`, height: `${from.height}px` },
      { width: `${to.width}px`, height: `${to.height}px` }
    ])
  }

  /**
   * Run `keyframes` on `panel`'s box, in the glide's time and ease;  nothing with reduced motion.
   * - Meanwhile its box may be narrower than what's in it, and cuts what's past it:
   *   a popup is never narrower than its words (`min-width: min-content`), so a menu growing wider jumped.
   */
  private glideBox(panel: BarPanel, keyframes: Keyframe[]): void {
    const box = boxOf(panel)
    if (!box || isReducedMotion()) return
    const seconds = cssSecondsFor(panel, "--ui-duration-normal") ?? DEFAULT_GLIDE_SECONDS
    const easing = getComputedStyle(panel).getPropertyValue("--ui-ease-out").trim() || "ease-out"
    const cutting = keyframes.map((keyframe) => ({ ...keyframe, minWidth: "0px", overflow: "hidden" }))
    box.animate(cutting, { duration: seconds * 1000, easing })
  }

  /** The panel out, else the one that went within the bar's `reopensWithinMs`. */
  private get last(): { panel: BarPanel; button: HTMLElement } | undefined {
    const gone = this.gone
    return this.shown ?? (gone && performance.now() - gone.at < this.options.reopensWithinMs ? gone : undefined)
  }
}

/** How a bar's panels move:  `new BarPanels(options)`. */
export type BarPanelsOptions = {
  /** Which way the bar runs, so which way a panel glides to the next button:  `y` down a side bar, `x` along a top bar. */
  along: "x" | "y"
  /** The custom property a gliding panel's distance goes in, which the bar's sheet reads (`--PaletteFlyout-glide`). */
  glideToken: string
  /**
   * What of a panel's size follows the last one's as it glides:
   * - `height`:  the add bar's, whose panels are one width
   * - `size`:  the top bar's menus, each as wide as its longest row
   */
  grows: "height" | "size"
  /**
   * How soon after a panel goes another still opens at once, gliding from it, in ms:
   * - the add bar's 300:  the mouse crossing to the next button, as its panels open on hover anyway
   * - the top bar's 0:  its menus open on a click, so a menu just chosen from never opens the next one by itself
   */
  reopensWithinMs: number
}

/** A box's size, in px. */
export type Size = { width: number; height: number }

/** One of a bar's panels:  a `<ui-popup>`, shown and hidden by `visible`. */
export type BarPanel = HTMLElement & { visible?: boolean }

/**
 * Where `button` starts along the bar, in the window (`along`:  its top, or its left):  its own box, else its shadow
 * root's first drawn box (a `<ui-item>` is `display: contents`, so it has no box of its own).
 */
function startOf(button: Element, along: BarPanelsOptions["along"]): number {
  const side = along === "y" ? "top" : "left"
  const own = button.getBoundingClientRect()
  if (own.height) return own[side]
  const drawn = [...(button.shadowRoot?.children ?? [])].find((child) => child.getBoundingClientRect().height)
  return drawn?.getBoundingClientRect()[side] ?? own[side]
}

/** A panel's box, its `popup` part:  what slides, glides and grows. */
function boxOf(panel: BarPanel): HTMLElement | undefined {
  return panel.shadowRoot?.querySelector<HTMLElement>("[part~=popup]") ?? undefined
}

/**
 * The person asks for less motion:  a panel's size doesn't glide (its slide and glide are the sheet's).
 * - Asked as it glides, not as the module loads:  `MenuBar.tsx` loads in node's tests too, where there's no `matchMedia()`.
 */
function isReducedMotion(): boolean {
  return matchMedia("(prefers-reduced-motion: reduce)").matches
}

/** A glide's time when the page says none:  Spell UI's normal duration. */
const DEFAULT_GLIDE_SECONDS = 0.2

/** A panel opening where another was:  it glides from there (the bar's sheet). */
const GLIDING = "gliding"

/** A panel going as another opens:  at once, with no slide back. */
const SWITCHING = "switching"
