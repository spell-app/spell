import { prop } from "spell/util"
import { core } from "spell/parser/core/core"
// Import directly to avoid circular import
import { View } from "./View"

/** What a page's `lock` may be:  `unlocked` (the default) or `locked`. */
export type Lock = (typeof Page.Locks)[number]

/**
 * `Page`:  a `View` people reach by its own address -- what `a home is a page` extends.
 * - NOTE:  its address, and moving from page to page, aren't built yet:  for now it's drawn as any view is.
 * - It hears what the program triggers by its own handler, as its app does:  see `trigger()`.
 * - Its `lock`:  whether what's changed on the page is saved (epic `notebook` P1, Q8).
 * - Its element shows its drawing as its CHILDREN, as an app's does (`drawsInItsChildren`).
 * - Everything else as a `View`.
 */
export class Page extends View {
  /**
   * Does our element show our drawing as its children, in its `<slot>`, rather than in its shadow root?
   * - Yes for a page, as for an app (epic `notebook` P3):
   *   the program's page is drawn where the app mounts (`start()`), as an app is.
   * - So what's around it reaches its drawing:
   *   - the project's `.css` files, installed where the app mounts
   *   - the editor's docs frame, its styles and its "On this page" list (`<ui-toc>`), which find the page's sections
   * - Read by `core.drawThing()` and the page's element (app's `SpellElement`).
   */
  static drawsInItsChildren = true

  /**
   * SIDE EFFECT:  the running program's pages are listed as they're made, `core.RUNTIME.pages`:
   * each hears what `trigger()` sends by its own handler, `<on fizz>` (epic `language` T78).
   */
  constructor(props?: Record<string, unknown>) {
    super(props)
    core.RUNTIME?.pages.push(this)
  }

  /** What its `lock` may be:  `unlocked` or `locked`. */
  static Locks = ["unlocked", "locked"] as const

  /**
   * Whether the page may be changed:  in a locked page, every edit is a try-out, saved for nobody.
   * - `<spell-page "x" locked>` says `locked`;  only the editor reads it, so far (`editor.isLocked()`).
   * - Whoever may save the page's design locks or unlocks it.
   * - Spanish's word for it is `candado` (`builtInMembers`).
   */
  @prop({ oneOf: () => Page.Locks })
  accessor lock!: Lock

  /**
   * Draw this page as the program's page, as an app starts:  `core.startDrawing()`.
   * - Compiles from `start the counter notebook`, which a `.spell` page that draws its body says by itself
   *   (epic `elemental-spell` P16).
   */
  start(): void {
    core.startDrawing(this)
  }
}
