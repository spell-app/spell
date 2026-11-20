import { E } from "spell/ui/core"
import type { MarkdownEngine } from "./MarkdownEngine"
import type { MarkdownSanitizer } from "./MarkdownSanitizer"

/****************
 * ### `MarkdownRenderer`
 * What `<ui-markdown>` asks to render:  loads an engine on first use, each in its own lazy chunk.
 * - `load()`:  marked (`MarkdownEngine`), what every `<ui-markdown>` draws with, `editable`'s preview too.
 *   - A subclass may draw with an engine of its own (`UIMarkdown.loadEngine()`):
 *     the app's `<spell-markdown>` draws with spell's.
 * - `loadSanitizer()`:  DOMPurify (`MarkdownSanitizer`), only for `sanitized`.
 * - `loadMermaid()`:  the `<ui-mermaid-diagram>` family, only for a text with a ````mermaid```` block;
 *   Mermaid itself loads when that element draws.
 * - The element only knows `render(text, options) -> { html, headings }` (`MarkdownRendering`).
 * - Static:  the loads are page-wide, started once and shared by every `<ui-markdown>`;
 *   the loaders are swapped page-wide too.
 ****************/
export class MarkdownRenderer {
  /**
   * Imports the engine module;  read once, on the first render.
   * - Replaceable, e.g. by a bundle that can't keep `import()`s
   *   (the docs' classic script loads it as a script of its own).
   */
  static engineLoader: () => Promise<{ MarkdownEngine: { instance: MarkdownEngine } }> = () =>
    import("./MarkdownEngine")

  /**
   * Imports `MarkdownSanitizer`.
   * - Replaceable as `engineLoader` (the docs' classic script loads it as a script of its own).
   */
  static sanitizerLoader: () => Promise<{ MarkdownSanitizer: { instance: MarkdownSanitizer } }> = () =>
    import("./MarkdownSanitizer")

  /**
   * Imports the `<ui-mermaid-diagram>` family, which defines the tag a ````mermaid```` block becomes.
   * - Replaceable as `engineLoader`.
   */
  static mermaidLoader: () => Promise<unknown> = () => import("spell/ui/components/ui-mermaid-diagram")

  /** marked, loaded on first use;  the import starts once. */
  @E.once static load(): Promise<MarkdownEngine> {
    return MarkdownRenderer.engineLoader().then((module) => module.MarkdownEngine.instance)
  }

  /** DOMPurify, loaded on first use;  the import starts once. */
  @E.once static loadSanitizer(): Promise<MarkdownSanitizer> {
    return MarkdownRenderer.sanitizerLoader().then((module) => module.MarkdownSanitizer.instance)
  }

  /**
   * The `<ui-mermaid-diagram>` family, loaded on first use;  the import starts once.
   * - NEVER rejects:  a family that won't load leaves its blocks as unknown tags, their text showing.
   */
  @E.once static loadMermaid(): Promise<void> {
    return MarkdownRenderer.mermaidLoader().then(
      () => undefined,
      (error: unknown) => E.Warnings.warn("<ui-markdown>", "<ui-mermaid-diagram> didn't load:", error)
    )
  }
}
