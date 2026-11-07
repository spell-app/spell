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
 * - Its `lock`:  whether whoever can't write its file may change it (epic `notebook` P1, Q8).
 * - Everything else as a `View`.
 */
export class Page extends View {
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
   * Whether whoever can't write its file may change it:  a locked page's other readers only try things out.
   * - `<spell-page "x" locked>` says `locked`;  only the editor reads it, so far.
   * - Spanish's word for it is `candado` (`builtInMembers`).
   */
  @prop({ oneOf: () => Page.Locks })
  accessor lock!: Lock

  /**
   * Draw this page as the program's page, as an app starts:  `core.startDrawing()`.
   * - Compiles from `start the counter notebook`, which a `.spellml` page that draws its body says by itself
   *   (epic `elemental-spell` P16).
   */
  start(): void {
    core.startDrawing(this)
  }
}
