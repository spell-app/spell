import { core } from "spell/parser/core/core"
// Import directly to avoid circular import
import { View } from "./View"

/**
 * `Page`:  a `View` people reach by its own address -- what `a home is a page` extends.
 * - NOTE:  its address, and moving from page to page, aren't built yet:  for now it's drawn as any view is.
 * - It hears what the program triggers by its own handler, as its app does:  see `trigger()`.
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

  /**
   * Draw this page as the program's page, as an app starts:  `core.startDrawing()`.
   * - Compiles from `start the counter notebook`, which a `.spellml` notebook says by itself (epic `elemental-spell` P16).
   */
  start(): void {
    core.startDrawing(this)
  }
}
