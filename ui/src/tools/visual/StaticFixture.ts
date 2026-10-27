/**
 * `yarn test:visual --static`'s server side:  one element example rendered by `StaticRender` (no shadow DOM, no
 * scripts), plus the ONE stylesheet that styles it (`StaticStylesheet`).
 * - Loaded through Vite's SSR (`server.ssrLoadModule()`, by `StaticPages`), NEVER by node directly:  the Solid
 *   plugin must compile the components' JSX for the server (`generate: "ssr"`) and `@solidjs/web` resolve to its
 *   server build (the `node` condition), as in vitest's `ssr` project.  `verify()` fails a page that shows
 *   otherwise.
 * - Which families:  `StaticFamilies`.  Every listed class is defined once, for every page (`StaticCatalog.define()`).
 */

import { ServerRuntime, StaticCatalog, StaticFamilies, StaticRender, StaticStylesheet } from "spell/ui/static"

/** Element examples, by path;  lazy, a page renders one. */
const ELEMENTS = import.meta.glob<string>("/src/components/*/examples/elements/*.html", {
  query: "?raw",
  import: "default"
})

/****************
 * ### `StaticFixture`
 * The static page's two halves:  an example's body HTML and the stylesheet;  `StaticPages` wraps them in
 * `fixture.html`'s chrome.
 * - STATIC:  one per SSR module graph;  `defined` is that graph's, page-wide.
 ****************/
export class StaticFixture {
  /** `StaticFamilies`' classes, once defined */
  private static defined?: Promise<void>

  /**
   * Body HTML of element example `id` (`ui-button/types`), rendered statically.
   * - Throws when `id` isn't an example of a `StaticFamilies` family, or the render fails `verify()`.
   */
  static async example(id: string): Promise<string> {
    await StaticFixture.define()
    const [family = "", name] = id.split("/")
    if (!StaticFamilies.covers(family))
      throw new Error(
        `StaticFixture.example():  "${family}" isn't compared statically;  add it to static/StaticFamilies.ssr.ts`
      )
    const load = ELEMENTS[`/src/components/${family}/examples/elements/${name}.html`]
    if (!load) throw new Error(`StaticFixture.example():  no element example "${id}"`)
    const source = await load()
    await StaticRender.prepare(source)
    const html = StaticRender.fragment(source)
    StaticFixture.verify(id, source, html)
    return html
  }

  /**
   * The static page's stylesheet:  the foundation plus every defined family's sheets, rewritten for light DOM.
   * - Built on every request, never cached:  it scopes each sheet to the elements SEEN adopting it
   *   (`StaticRender.sheetUsage`, e.g. items taking their list's sheet, after their own), which grows as pages render.  A page's
   *   stylesheet is requested after the page, so it covers that page.
   */
  static async stylesheet(): Promise<string> {
    await StaticFixture.define()
    return StaticStylesheet.build(StaticRender.families.values(), StaticRender.sheetUsage)
  }

  /** Define `StaticFamilies`' classes, once. */
  private static define(): Promise<void> {
    return (StaticFixture.defined ??= StaticFixture.load())
  }

  /** Load the default icon pack, as the element pages' runtime does (`ServerRuntime.icons()`), then define the families. */
  private static async load(): Promise<void> {
    await ServerRuntime.icons()
    await StaticCatalog.define()
  }

  /**
   * Throw unless `html` is a real static render of `source`:
   * - no `<slot>` (a client render, or a DOM element left unflattened)
   * - roots marked `data-ui="<noun>"` when `source` has a defined tag (the flattener's mark;  missing:  nothing
   *   rendered)
   * - no tag of a DEFINED family left (`ui-*` tags of other families stay, by design)
   */
  private static verify(id: string, source: string, html: string) {
    const problems: string[] = []
    if (/<slot[\s>]/.test(html)) problems.push("a <slot> is left")
    if (StaticFixture.definedTags(source).size && !html.includes("data-ui=")) {
      problems.push('no data-ui="..." root:  rendered by Solid\'s client build?')
    }
    const left = StaticFixture.definedTags(html)
    if (left.size) problems.push(`defined tags left unrendered:  ${[...left].join(", ")}`)
    if (problems.length) throw new Error(`StaticFixture.verify():  static render of ${id}:  ${problems.join(";  ")}`)
  }

  /** Tags in `html` that `StaticRender` defines. */
  private static definedTags(html: string): Set<string> {
    // comments may name tags (`<!-- <ui-root> ... -->`)
    const tags = [...html.replace(/<!--[\s\S]*?-->/g, "").matchAll(/<(ui-[\w-]+)/g)].map((match) => match[1]!)
    return new Set(tags.filter((tag) => StaticRender.families.has(tag)))
  }
}
