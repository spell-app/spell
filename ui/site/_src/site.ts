/**
 * Entry of the Spell UI site's bundle, `site/_assets/site.js` (+ `site.css`):  the ONE script every page loads.
 * - Built by `yarn site:bundle` (`scripts/site-bundle.ts`, config `vite.site.config.ts`) into `site/_assets/`, NOT
 *   committed:  the page server builds it when it starts, if stale (`spell bundle`).  Edit THIS (and the
 *   library source), never `_assets/`.
 * - A page loads it as (paths relative to the page:  every page sits in its set's one folder):
 *     <link rel="stylesheet" href="_assets/site.css">
 *     <script type="module" src="_assets/site.js"></script>
 * - Every component set's pages load it (the page server's `componentSets` setting):  Spell UI's own at
 *   `/components/ui/`, Epic UI's, App UI's and the brand's, each taking its set's folder as the site's root.
 * - What it holds, in import order (ES modules evaluate top to bottom):
 *   1. `./snapshot`:  every `<ui-example>`'s markup, kept before anything upgrades;  then `./SitePacks`:
 *      `globalThis.SpellUI`, so a page's component packs (`<ui-components source="x.pack.js">`) share its Solid and
 *      Spell UI:  every set's layout loads the epics pack, for the comments' threads and pane, and Epic UI's, App UI's
 *      and the brand's their own for their live examples
 *   2. the page CSS:  `spell-ui`'s foundation (`ui.css`:  layers, tokens, reset, typography, native markup) +
 *      the site's layout glue (`./site.css`) -- extracted to `_assets/site.css`, which the page links
 *   3. `SiteData`, `BuiltInPacks`:  pointed at `__data/components.json5` and `_assets/icon-packs/` from THIS file's
 *      URL, so a page at any depth finds them;  `DocsFamilies.add()`:  `<ui-root>` may load the `<ui-docs-*>`
 *      families (the library's root knows only the library's;  their skeletons are in its catalog already)
 *   4. `ThemePreference.restore()`:  the viewer's theme and colour scheme, re-applied (the scheme already was, by
 *      the page's inline `<head>` script, `ThemePreference.HEAD_SCRIPT`);  Spell unless the viewer picked another
 *   5. `defineSite()`:  the `<spell-site-header>` bar shared by every page the page server serves
 *   6. `SiteShell.mount()`:  the page's `main` into the ONE layout, `__parts/layout.html` (fetched)
 *   7. THEN `<ui-root>` (`import()`):  defined only once the layout AND the theme's sheet are in, so its
 *      `display="when-ready"` shows the whole page at once, already themed;  every OTHER family, `<ui-docs-*>`
 *      and `<ui-theme-menu>` included, is a lazy chunk it imports on first use
 *   8. `SiteRouter`:  links to other pages swap only the `main`, the layout stays;
 *      `SitePatch`:  an edit to the shown page's file shows in place, no reload (epic `epic-engine` P40)
 * - The root's module joins `SpellUI.packModules` here, once imported (`SitePacks`)
 * - Lazy, by `import()`:  families, the runtime, icon packs (`_assets/icon-packs/`), emoji names, `<ui-code>`'s and
 *   `<ui-markdown>`'s engines, the Temporal polyfill.
 * - `window.UI`:  the runtime (`UI.load()` works at once;  the rest after it), for poking in DevTools.
 * - `window.SiteData`:  the site's data reader, for a page's own script:
 *   the icon browser reads `__data/icons.json5` with `SiteData.json()` (JSON5, so a comment written into it reads too).
 * - `window.IconName`:  icon names and Spell UI's ONE icon search (`IconName.search()`), for the icon browser's page
 *   script, so it finds what `spell icon` and `<ui-icon-picker>` find.
 */
import "./snapshot"
import "./SitePacks"

import "spell/ui/styles/ui.css"
import "./site.css"

import { E, UI } from "spell/ui/core"
import { DocsFamilies } from "spell/ui/docs-components/DocsFamilies"
import { SiteData } from "spell/ui/docs-components/SiteData"
import { ThemePreference } from "spell/ui/components/ui-theme-menu/ThemePreference"
import { LOGO_MARK, defineSite } from "spell/server/site"
import { SitePatch } from "./SitePatch"
import { SiteRouter } from "./SiteRouter"
import { SiteShell } from "./SiteShell"
import { PAGE_MAIN } from "./site.types"

/** This bundle's folder, `.../_assets/`:  a string slice, NOT `new URL(".", import.meta.url)` (Vite would inline it). */
const ASSETS = import.meta.url.slice(0, import.meta.url.lastIndexOf("/") + 1)

/**
 * The site's root (`/components/ui/`):  the folder above `_assets/`.
 * - Every set served with this bundle laid over it (`/components/epics/`:  the page server's `componentSets` setting)
 *   is its own root:  its layout (`__parts/`), its data (`__data/`), its routable pages
 */
const SITE_ROOT = new URL("../", ASSETS)

E.BuiltInPacks.base = ASSETS
SiteData.url ??= `${ASSETS}../__data/components.json5`
DocsFamilies.add()
Object.assign(globalThis, { UI, SiteData, IconName: E.IconName })

// the viewer's theme + scheme (`<ui-theme-menu>`):  started NOW, beside the layout's fetch;  `<ui-root>` waits for it
const theme = ThemePreference.restore().catch((error: unknown) =>
  E.Warnings.warn("Spell UI site", "the theme didn't load;  showing the page without it", error)
)

defineSite()

// the narrow top bar's search button:  the flyout's nav opens and focuses its search field (`/` and Cmd / Ctrl+K do too)
document.addEventListener("click", (event) => {
  if (!(event.target as Element | null)?.closest?.(".site-search-button")) return
  document.querySelector<HTMLElement & { focusSearch?(): void }>("#site-nav-flyout ui-docs-nav")?.focusSearch?.()
})

void SiteShell.mount(SITE_ROOT).then(async (content) => {
  // the hat before the top bar's brand (`site.css`, "Top bar"):  the site header's own mark, a constant SVG
  for (const hat of document.querySelectorAll(".site-hat")) hat.innerHTML = LOGO_MARK
  keepCurrentTabInView()
  // the page's own edits, patched in:  listening at once, from the source as loaded
  const patch = content && new SitePatch({ main: () => content.querySelector<HTMLElement>(PAGE_MAIN) ?? undefined })
  patch?.start()
  const router = content && new SiteRouter({ siteRoot: SITE_ROOT, content, patch })
  router?.followPage()
  // the swaps' landing, for the first page:  saved folds before the sections draw;  the hash once the root is ready
  router?.land(new URL(location.href), { isFirst: true })
  // the theme's sheet in place BEFORE the root shows the page:  no restyle (and reflow) after first paint
  await theme
  const root = await import("spell/ui/components/ui-root")
  // a pack's script may share the root's module too (`SitePacks`)
  const packModules = (globalThis as { SpellUI?: { packModules?: Record<string, unknown> } }).SpellUI?.packModules
  if (packModules) packModules["spell/ui/components/ui-root"] = root
  router?.start()
})

/**
 * The top bar's links scrolled so the CURRENT tab shows, centred where it can be,
 * whenever the bar's size changes:  it draws, shows (below 1200px), or the window is resized.
 * - the links are ONE row, scrolling sideways when the bar is too narrow (`site.css`, "Top bar"):
 *   at the side bar's width, Epic/UI or App/UI would sit under the `›` button, or past it
 * - the current tab:  the site header's `aria-current="page"` link, in its shadow root
 * - first once the bar has drawn (its `ready`):  its items' box is in its shadow root, drawn after the links are
 * - SIDE EFFECT:  a `ResizeObserver` on the bar, its links and its items' box, for the page's life
 */
function keepCurrentTabInView() {
  const bar = document.querySelector<HTMLElement & { ready?: Promise<unknown> }>("ui-toolbar.site-topbar")
  const links = bar?.querySelector<HTMLElement>(".site-topbar-links")
  if (!bar || !links) return
  let watchedBox: HTMLElement | undefined
  const center = () => {
    const box = bar.shadowRoot?.querySelector<HTMLElement>('[part~="menu"]')
    const current = links.shadowRoot?.querySelector<HTMLElement>('[aria-current="page"]')
    // the items' box too, once drawn:  it narrows as the brand's font loads
    if (box && box !== watchedBox) sizes.observe((watchedBox = box))
    if (!box || !current || box.scrollWidth <= box.clientWidth) return
    const boxRect = box.getBoundingClientRect()
    const tabRect = current.getBoundingClientRect()
    box.scrollLeft += tabRect.left + tabRect.width / 2 - (boxRect.left + boxRect.width / 2)
  }
  const sizes = new ResizeObserver(center)
  sizes.observe(bar)
  sizes.observe(links)
  void customElements
    .whenDefined("ui-toolbar")
    .then(() => bar.ready)
    .then(() => E.beforeNextPaint(center))
    .catch((error: unknown) => E.Warnings.warn("Spell UI site", "the top bar didn't draw", error))
}
