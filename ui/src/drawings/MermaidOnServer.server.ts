import { fileURLToPath } from "node:url"

import type { Browser, Page } from "playwright"

import { SRV } from "spell/server"
import { BrowserPage } from "spell/element-tools/BrowserPage"
// Import directly:  node-safe and import-free, the text `<ui-mermaid-diagram>` itself reads (`LoadableComponent`)
import { InlineText } from "spell/ui/elements/InlineText"
import {
  DEFAULT_MERMAID_THEME,
  MAY_NAME_ICON,
  MermaidLayouts,
  MermaidLooks,
  MermaidSchemes
} from "spell/util/diagram/MermaidThemes"
import { DrawnItems } from "./DrawnItems.server"

/****************
 * ### `MermaidOnServer`
 * `<ui-mermaid-diagram>`'s diagrams drawn ahead, on the page server (`SRV.Drawings`, kind `mermaid`):
 * in ONE headless page it keeps open, which loads Spell UI's own Mermaid drawer and nothing else of a page
 * (`site/_src/drawings.ts`, at `PAGE`):  Mermaid needs a real page to measure its text.
 * - The same drawing the element would make:  the same code, Mermaid's settings from the same tokens.
 *   - asked for by a page:  drawn with that page's own settings (`hints.config`, its colours as it read them) and
 *     its text style (`hints.bodyText`):  Mermaid measures its labels in the page's font
 *   - found in a page as it's served:  with the headless page's colours, in a docs page's text style
 *   - either way its `look` (`MermaidDrawer.lookOf()`) goes with it:  an element shows it only when its own is the
 *     same, so a theme the reader wears that the server's page doesn't, or another font, is drawn in the page
 * - One per light and dark:  Mermaid works its colours out as plain ones.  A diagram whose `scheme` follows the page
 *   is found twice, once each.
 * - Never one with icons (`fa:fa-car`):  they're the page's own packs.
 * - COLD START:  the first drawing starts Chromium and the page, a few seconds;  every one after, a tenth of a
 *   second or so.  The page draws for itself meanwhile (`SRV.Drawings.waitMs`).
 * - A page that crashed or closed is opened again for the next drawing.
 * - Node only:  the page server loads it through Spell UI's route module (`drawingRoutes.server.ts`).
 ****************/
export class MermaidOnServer implements SRV.Drawer {
  readonly kind = MERMAID_KIND
  readonly name = "mermaid"

  /**
   * Mermaid's version, the drawer's code and the site bundle's last build:  a change to any draws everything again.
   * - asked at each drawing:  a rebuilt site bundle (the page server rebuilds it as its sources change) also opens
   *   the headless page again, so it never draws with the code it loaded before (`page()`)
   */
  get version(): string {
    return this.codeVersion()
  }

  /** `version`'s hash of the files, read again only when one changes (`SRV.codeVersion()`). */
  private readonly codeVersion = SRV.codeVersion([
    fileURLToPath(new URL("../components/ui-mermaid-diagram/MermaidDrawer.ts", import.meta.url)),
    fileURLToPath(new URL("../components/ui-mermaid-diagram/MermaidEngine.ts", import.meta.url)),
    fileURLToPath(new URL("../../../src/util/diagram/MermaidThemes.ts", import.meta.url)),
    fileURLToPath(new URL("../../site/_src/drawings.ts", import.meta.url)),
    fileURLToPath(new URL(`../../site/_assets/${SRV.BUNDLE_RECORD}`, import.meta.url)),
    fileURLToPath(import.meta.url),
    fileURLToPath(import.meta.resolve("mermaid/package.json"))
  ])

  /** The `version` the open page was opened at. */
  private openedAt?: string

  /** Where the page server is, asked when the first drawing opens the page (it's listening by then). */
  private readonly serverUrl: () => string

  /** The headless browser and its page, once opened;  the promise, so two first drawings open one. */
  private opened?: Promise<{ browser: Browser; page: Page }>

  constructor({ serverUrl }: { serverUrl: () => string }) {
    this.serverUrl = serverUrl
  }

  /** Where the headless page is:  Spell UI's route module answers it (`drawingRoutes.server.ts`). */
  static readonly PAGE = "/api/ui/drawings/mermaid.html"

  /**
   * The `<ui-mermaid-diagram>`s in `page` with text of their own and no icons, each in light and dark
   * (or in its `scheme`), with the settings the element draws with (`UIMermaidDiagram.drawSettings`).
   */
  find(page: string): SRV.DrawingItem[] {
    return DrawnItems.elementsIn(page, TAG).flatMap((element) => {
      if (element.hasAttribute("source")) return []
      const text = InlineText.of(element)
      if (!text.trim() || MAY_NAME_ICON.test(text)) return []
      const scheme = DrawnItems.oneOf(element, "scheme", MermaidSchemes)
      const seed = Number(element.getAttribute("seed") ?? DEFAULT_SEED)
      const base = {
        theme: element.getAttribute("theme") ?? DEFAULT_MERMAID_THEME,
        look: DrawnItems.oneOf(element, "look", MermaidLooks) ?? DEFAULT_LOOK,
        layout: DrawnItems.oneOf(element, "layout", MermaidLayouts) ?? DEFAULT_LAYOUT,
        seed: Number.isFinite(seed) ? seed : DEFAULT_SEED
      }
      const schemes = scheme === "light" || scheme === "dark" ? [scheme] : (["light", "dark"] as const)
      return schemes.map((each) => ({ kind: MERMAID_KIND, settings: { ...base, scheme: each }, text }))
    })
  }

  /** The diagram, drawn in the headless page;  throws when Mermaid can't read it (`SRV.Drawings` logs it). */
  async draw(item: SRV.DrawingItem): Promise<SRV.Drawing | undefined> {
    const { page } = await this.page()
    const drawn = await page.evaluate(
      ({ text, settings, config, bodyText }) =>
        (globalThis as unknown as { spellDrawings: SpellDrawingsPage }).spellDrawings.mermaid(
          text,
          settings,
          config,
          bodyText
        ),
      {
        text: item.text,
        settings: item.settings,
        config: item.hints?.config as Record<string, unknown> | undefined,
        bodyText: item.hints?.bodyText as Record<string, string> | undefined
      }
    )
    return { markup: drawn.svg, data: { diagramType: drawn.diagramType, look: drawn.look } }
  }

  /** Close the headless browser.  NEVER throws. */
  async stop(): Promise<void> {
    const opened = this.opened
    this.opened = undefined
    await opened?.then(({ browser }) => browser.close()).catch(() => undefined)
  }

  /**
   * The headless page, opened once and ready to draw;  opened again after it crashed or closed, or once `version`
   * changed
   */
  private page(): Promise<{ browser: Browser; page: Page }> {
    if (this.opened && this.openedAt !== this.version) void this.stop()
    this.openedAt = this.version
    this.opened ??= this.open().catch((error: unknown) => {
      this.opened = undefined
      throw error
    })
    return this.opened
  }

  /** Start Chromium, open `PAGE`, and wait until it says it's ready (`spellDrawings.ready`). */
  private async open(): Promise<{ browser: Browser; page: Page }> {
    const browser = await BrowserPage.launch()
    const page = await BrowserPage.newPage(browser)
    const reopen = () => void this.stop()
    page.on("crash", reopen)
    page.on("close", reopen)
    await page.goto(`${this.serverUrl()}${MermaidOnServer.PAGE}`)
    await page.waitForFunction(() => (globalThis as { spellDrawings?: { isReady?: boolean } }).spellDrawings?.isReady)
    return { browser, page }
  }
}

/** What the headless page offers (`site/_src/drawings.ts`). */
export type SpellDrawingsPage = {
  isReady: boolean
  mermaid(
    text: string,
    settings: Record<string, unknown>,
    config?: Record<string, unknown>,
    bodyText?: Record<string, string>
  ): Promise<{ svg: string; diagramType: string; look: string }>
}

/** The kind of drawing `<ui-mermaid-diagram>` asks for. */
export const MERMAID_KIND = "mermaid"

/** The tag it finds. */
const TAG = "ui-mermaid-diagram"

/** The element's `look` when it says none. */
const DEFAULT_LOOK = "classic"

/** The element's `layout` when it says none. */
const DEFAULT_LAYOUT = "auto"

/** The element's `seed` when it says none. */
const DEFAULT_SEED = 1
