import { createEffect } from "solid-js"

import { SP } from "spell/parser/spell"
import { editor } from "spell/app/app/editor"
import type { EditorPage, SpellRouteParams } from "./pages.types"
import { RunSite, runSite } from "./RunSite"

/**
 * Show what the route's `params` name in `page`, now and whenever either changes.
 * - It calls `editor.selectPath()` on the address they spell.
 * - Call in a route component's body:  the effect goes with it.
 * - The route stays mounted while only its params change (`routes.tsx`),
 *   so moving between a project's files re-selects without redrawing the page.
 * - SIDE EFFECT:  sets `editor.projectPage` first:  `selectPath()` reads it to redirect to the page's own URL.
 * - A bad address shows as `editor.showError()`, never a throw:  an effect that throws halts Solid for the whole page.
 * - A page of a running app, `/run/owen@spell/solitaire/rules`, runs its app, and a SITE shows its page `/rules`
 *   (`RunSite.heard()`, epic `mockup` P2;  `SP.SpellUrls.withoutPage()`).
 *   - A file of a site, `/run/owen@spell/dashboard/home.spell`, shows the page it holds (epic `mockup` I15).
 */
export function followRoute(params: () => Partial<SpellRouteParams>, page: () => EditorPage): void {
  createEffect(
    () => [params().address ?? "", page()] as const,
    ([tail, page]) => {
      let path: string
      try {
        path = SP.SpellUrls.withoutPage(tail)
      } catch (error) {
        editor.showError(error)
        return
      }
      editor.projectPage = page
      // in Run, the part after the project is a running site's page:  `/run/<project>/films/4` (epic `mockup` P2),
      // or the file that holds it, `/run/<project>/home.spell` (I15)
      if (page === "runner") runSite.heard(RunSite.siteAddressIn(tail, location.pathname), fileIn(path))
      editor.selectPath(path).catch((error: unknown) => editor.showError(error))
    }
  )
}

/** The file `path` names, if it names one:  `undefined` for a project, or a path that names nothing. */
function fileIn(path: string): string | undefined {
  try {
    return new SP.SpellLocation(path).isFilePath ? path : undefined
  } catch {
    return undefined
  }
}
