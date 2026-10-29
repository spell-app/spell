/**
 * Who is at the keyboard, on the page server (epic `epic-friend` P1), and the colours the repo gives each person and
 * agent (P10):  a ROUTE MODULE (`spell/server/page`'s `RouteModule`), listed in spell-epic's `package.json`
 * `"pageServer": { "routes": [...] }`.
 * - Every page it serves is told the name its person goes by, as it's served:
 *   `window.SPELL_SERVER.person` (`EpicHome.person()`, read on every page:  `epic whoami Ana` shows at the next load).
 *   None kept and git has none:  no field.
 * - And the repo's colours, `window.SPELL_SERVER.colors` (`EpicConfig.colors`, the `.epic/config.json5` of the checkout
 *   served, read on every page):  a reply or a thread message draws its speaker in theirs (`ThreadFacts.voiceOf()`).
 *   None set, or a repo with no epic settings:  no field.
 * - No routes of its own:  only those fields (`addPageConfig()`), as `airplaneRoutes` does airplane mode.
 * - The kit's page server and the epic server both load it.
 */
import type { RouteModule } from "spell/server/page"
import { EpicConfig } from "spell/epic/config/EpicConfig"
import { EpicHome } from "spell/epic/config/EpicHome"

const personRoutes: RouteModule = {
  name: "person",
  setup({ addPageConfig, root }) {
    // the page's own name for whoever is reading it:  the pages put it on what they write, from the next phase on
    addPageConfig(() => {
      const { name } = EpicHome.person()
      const colors = colorsOf(root)
      return { ...(name && { person: name }), ...(colors && { colors }) }
    })
  }
}

export default personRoutes

/**
 * The colours checkout `root`'s repo gives people and agents (`EpicConfig.colors`);  `undefined` when it gives none,
 * or its settings won't read.
 * - NEVER throws:  a page is served either way
 */
function colorsOf(root: string): EpicConfig["colors"] | undefined {
  try {
    const colors = EpicConfig.ofSetUp(root)?.colors
    if (!colors) return undefined
    return Object.keys(colors.people).length || Object.keys(colors.agents).length ? colors : undefined
  } catch {
    return undefined
  }
}
