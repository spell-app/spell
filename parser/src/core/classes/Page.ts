import { core } from "spell/parser/core/core"
// Import directly to avoid circular import
import { View } from "./View"

/**
 * `Page`:  a `View` people reach by its own address -- what `a home is a page` extends.
 * - NOTE:  its address, and moving from page to page, aren't built yet:  for now it's drawn as any view is.
 * - Everything else as a `View`.
 */
export class Page extends View {
  /**
   * Draw this page as the program's page, as an app starts:  `core.startDrawing()`.
   * - Compiles from `start the counter notebook`, which a `.spellx` notebook says by itself (epic `elemental-spell` P16).
   */
  start(): void {
    core.startDrawing(this)
  }
}
