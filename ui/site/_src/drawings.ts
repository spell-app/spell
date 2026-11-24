/**
 * Entry of the page the page server draws Mermaid's diagrams in, headless (`spell/ui/drawings`' `MermaidOnServer`):
 * `site/_assets/drawings.js`, a second entry of the site's bundle (`vite.site.config.ts`), sharing its chunks.
 * - The page:  Spell UI's route module answers it (`/api/ui/drawings/mermaid.html`):  the site's sheet, this script,
 *   nothing else.
 * - `globalThis.spellDrawings.mermaid(text, settings, config?)`:  a diagram drawn with the element's own code
 *   (`MermaidDrawer`, `MermaidEngine`), its colours from this page's tokens unless the page asking sent its own
 *   (`config`);  its SVG, its kind, and `look`, the hash an element checks its own settings against
 * - `isReady`:  once the runtime and the reader's theme are in, and the fonts loaded:  Mermaid measures its text
 *   in them, as a page would
 * - Never shown to a person:  no layout, no header, no `<ui-root>`.
 */
import { E, UI } from "spell/ui/core"
import { ThemePreference } from "spell/ui/components/ui-theme-menu/ThemePreference"
import { MermaidDrawer, type DrawSettings } from "spell/ui/components/ui-mermaid-diagram/MermaidDrawer"

/** An empty `<span>` Spell UI's tokens are read on, as `<ui-mermaid-diagram>` reads them on its own. */
const probe = document.createElement("span")
probe.hidden = true
document.body.append(probe)

/** What the page offers the page server. */
const spellDrawings = {
  isReady: false,

  /**
   * `text` drawn as `<ui-mermaid-diagram>` would with `settings`;  `config` and `bodyText`, the asking page's own,
   * win:  its Mermaid settings, and the text style its labels are measured in (`MermaidDrawer.bodyTextOf()`).
   */
  async mermaid(
    text: string,
    settings: DrawSettings,
    config?: Record<string, unknown>,
    bodyText?: Record<string, string>
  ) {
    textLike(bodyText)
    const drawnWith = config ?? MermaidDrawer.configFor(probe, settings)
    const font = (drawnWith.themeVariables as { fontFamily?: string } | undefined)?.fontFamily
    // the fonts Mermaid measures its labels in:  loaded, or every box is cut to the fallback's size
    for (const family of [font, getComputedStyle(document.body).fontFamily])
      if (family) await document.fonts.load(`16px ${family}`).catch(() => undefined)
    // the look first, of a copy:  Mermaid fills in its settings' nested objects as it draws
    const look = MermaidDrawer.lookOf(structuredClone(drawnWith), MermaidDrawer.bodyTextOf(document))
    const engine = await MermaidDrawer.load()
    const drawn = await engine.instance.draw(text, { config: drawnWith, icons: [] })
    return { svg: drawn.svg, diagramType: drawn.diagramType, look }
  }
}

/**
 * This page's `<body>` in the text style `bodyText` names, else a docs page's (`DOCS_TEXT`):  Mermaid measures its
 * labels in a box it adds to the body.
 */
function textLike(bodyText: Record<string, string> = DOCS_TEXT) {
  document.body.removeAttribute("style")
  for (const [name, value] of Object.entries(bodyText)) document.body.style.setProperty(name, value)
}

/**
 * The text style of the pages most diagrams are on, the docs pages (guides, epic pages, the READMEs' page):
 * what a diagram found in a page as it's served is drawn in.  A page of another style draws it itself.
 */
const DOCS_TEXT: Record<string, string> = {
  "font-family": "var(--ui-font-family)",
  "font-size": "16px",
  "line-height": "1.6",
  "text-rendering": "auto"
}
Object.assign(globalThis, { spellDrawings })

void (async () => {
  await UI.load()
  await ThemePreference.restore().catch((error: unknown) =>
    E.Warnings.warn("drawings page", "the theme didn't load;  drawing in Spell's own", error)
  )
  await MermaidDrawer.load()
  await document.fonts.ready
  spellDrawings.isReady = true
})()
