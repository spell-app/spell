import { onCleanup, onSettled } from "solid-js"
import type { JSX } from "@solidjs/web"
import { createRouter, defineRoutes, useNavigate, type RouterHistory, type RouterInstance } from "@solidjs/router"

import { editor } from "spell/app/app/editor"
import { setNavigator } from "./navigation"
import { PlaceReferencePage } from "./PlaceReference"
import { ProjectChooser } from "./ProjectChooser"
import { SiteEditorRoute } from "./SiteEditorPage"
import { ProjectPageRoute } from "./SpellEditor"
import { ThemeEditorPage } from "./ThemeEditorPage"
import { PLACE_PAGE, SITE_PAGE, THEME_PAGE } from "./pages.types"

/**
 * The app's routes (`@solidjs/router`):  `/edit/` or `/run/`, then an address (decision Q40, epic `people-and-orgs` P4).
 * - `/edit/<address>`:  `<SpellEditor>` in Edit or Debug, e.g. `/edit/@spell/examples/Solitaire/Solitaire.spell`
 * - `/run/<address>`:  the same page in Run, e.g. `/run/owen@spell/errors`
 * - `/theme`:  the theme editor (`<ThemeEditorPage>`)
 * - `/site`:  every site there is (`<SitesHomePage>`)
 * - `/site/<project>`:  a site's editor, its pages and their addresses (`<SiteEditorPage>`, epic `mockup` P4)
 * - `/site/<group>`:  the group's sites (`<SiteGroupPage>`);  a registered group's address, else it's a project's
 * - `/place/<description>`:  a place's reference page (`<PlaceReferencePage>`, epic `data` P52), e.g.
 *   `/place/@spell/examples/StarWars/StarWars.api.json5`
 * - ONE route for both (`ProjectPageRoute`), so switching between them keeps the page.
 * - anything else:  `<ProjectChooser>`
 * - Each page is ONE route:  it stays mounted while only its address changes, e.g.
 *   moving between files, and follows them (`followRoute()`).
 */
export const ROUTES = defineRoutes([
  {
    path: "/:page/*address",
    matchFilters: { page: ["edit", "run"] },
    component: ProjectPageRoute
  },
  { path: THEME_PAGE, component: ThemeEditorPage },
  { path: `${SITE_PAGE}/*address`, component: SiteEditorRoute },
  { path: `${PLACE_PAGE}/*address`, component: PlaceReferencePage },
  { path: "*", component: HomeRoute }
])

/****************
 * ### `<HomeRoute>`
 * The home page, `<ProjectChooser>`, which leaves the project the editor showed (`editor.leaveProject()`):
 * one made from a start card and not kept goes, or is asked about (epic `mockup` I42).
 * - However the page was reached:  Home, the browser's Back, a typed address.
 ****************/
function HomeRoute() {
  onSettled(() => void editor.leaveProject())
  return <ProjectChooser />
}

/**
 * A router over `ROUTES`;  `history` defaults to the browser's (tests pass `memoryHistory()`).
 * - `explicitLinks`:  the router takes only `<a link>` clicks.  The app navigates through `editor` (`navigate()`),
 *   never links, and a running PROGRAM's own `<a>`s are the program's:  without it, the router would take every
 *   same-origin link on the page.
 */
export function createAppRouter(history?: RouterHistory): RouterInstance<typeof ROUTES> {
  return createRouter({ routes: ROUTES, explicitLinks: true, ...(history && { history }) })
}

/** The app's router:  ONE per app (`@solidjs/router`'s rule), on the browser's history. */
export const AppRouter = createAppRouter()

/****************
 * ### `<Routes>`
 * The page the URL names, through `router` (default:  `AppRouter`).
 * - Its root layout, `<AppShell>`, stays mounted while the app runs, and hands the router's `navigate()` to
 *   `navigation.ts`, so `editor` can change the page.
 ****************/
export function Routes(props: { router?: RouterInstance<typeof ROUTES> }) {
  const Router = props.router ?? AppRouter
  return <Router>{(route) => <AppShell>{route.children}</AppShell>}</Router>
}

/****************
 * ### `<AppShell>`
 * The router's root layout:  the page, as is.
 * - SIDE EFFECT:  `setNavigator()` while it's mounted:  `editor.showEditor()` etc. navigate through the router.
 ****************/
function AppShell(props: { children?: JSX.Element }) {
  const navigate = useNavigate()
  setNavigator((url, options) => navigate(url, options))
  onCleanup(() => setNavigator(undefined))
  return <>{props.children}</>
}
