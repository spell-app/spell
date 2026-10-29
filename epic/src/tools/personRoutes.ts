/**
 * Who is at the keyboard, on the page server (epic `epic-friend` P1):  a ROUTE MODULE (`spell/server/page`'s
 * `RouteModule`), listed in spell-epic's `package.json` `"pageServer": { "routes": [...] }`.
 * - Every page it serves is told the name its person goes by, as it's served:
 *   `window.SPELL_SERVER.person` (`EpicHome.person()`, read on every page:  `epic whoami Ana` shows at the next load).
 *   None kept and git has none:  no field.
 * - No routes of its own:  only that field (`addPageConfig()`), as `airplaneRoutes` does airplane mode.
 * - The kit's page server and the epic server both load it.
 */
import type { RouteModule } from "spell/server/page"
import { EpicHome } from "spell/epic/config/EpicHome"

const personRoutes: RouteModule = {
  name: "person",
  setup({ addPageConfig }) {
    // the page's own name for whoever is reading it:  the pages put it on what they write, from the next phase on
    addPageConfig(() => {
      const { name } = EpicHome.person()
      return name ? { person: name } : {}
    })
  }
}

export default personRoutes
