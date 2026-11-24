import type { RouteModule } from "spell/server/page"
import { SpellOnServer } from "./SpellOnServer.server"

/**
 * The app's drawing route module (its part of the page server's settings, `"pageServer": { "routes" }`):
 * Spell's bubbly look drawn ahead on the page server (`SpellOnServer`, `SRV.Drawings`, epic `solid-2-final` P15).
 * - Its own module, not the app's `appRoutes.ts`:  that's spaces', which never imports the app's components.
 * - Added after Spell UI's drawers (the app's part comes later), so it's asked first for spell.
 * - A server with no drawings (spell-epic's own) skips it.
 */
const spellDrawingRoutes: RouteModule = {
  name: "spell drawings",
  setup({ drawings }) {
    drawings?.add(new SpellOnServer())
  }
}
export default spellDrawingRoutes
