import { Show, onCleanup, onSettled } from "solid-js"
import type { JSX } from "@solidjs/web"
import {
  createRouter,
  defineRoutes,
  useNavigate,
  type RouteSectionProps,
  type RouterHistory,
  type RouterInstance
} from "@solidjs/router"

import { SPACES } from "spell/app/spaces"
import { editor } from "spell/app/app/editor"
import { setNavigator } from "./navigation"
import { PageViews } from "./pageViews"
import { ProjectPageRoute } from "./SpellEditor"
import { GUIDES_PAGE, PALETTE_PAGE, PLACE_PAGE, SITE_PAGE, THEME_PAGE } from "./pages.types"

/**
 * The app's routes (`@solidjs/router`):  `/edit/`, `/design/` or `/run/`, then an address (decision Q40, epic
 * `people-and-orgs` P4).
 * - `/edit/<address>`:  `<SpellEditor>` in Edit, e.g. `/edit/@spell/examples/Solitaire/Solitaire.spell`
 * - `/design/<address>`:  the same page in Design (epic `editor` P37), e.g. `/design/@spell/examples/Solitaire/Card.spell`
 * - `/run/<address>`:  the same page in Run, e.g. `/run/owen@spell/errors`
 * - `/theme`:  the theme editor (`<ThemeEditorPage>`)
 * - `/palette`:  the + menu's groups, to arrange and save (`<PaletteGroupsPage>`, epic `editor` T81)
 * - `/site`:  every site there is (`<SitesHomePage>`)
 * - `/site/<project>`:  a site's editor, its pages and their addresses (`<SiteEditorPage>`, epic `mockup` P4)
 * - `/site/<group>`:  the group's sites (`<SiteGroupPage>`);  a registered group's address, else it's a project's
 * - `/place/<description>`:  a place's reference page (`<PlaceReferencePage>`, epic `data` P52), e.g.
 *   `/place/@spell/examples/StarWars/StarWars.api.json5`
 * - `/@<org>`, `/@<org>/<group>`:  an org's or an org group's page (`<GroupPage>`, epic `editor` P47), e.g.
 *   `/@acme/org-spell`;  so are `/edit/@acme` and `/run/@acme/org-spell` (`<ProjectPageRoute>`)
 * - `/guides`:  the guides that ship with Spell (`<GuidesPage>`, epic `epic-engine` P79);  `/guides/<path>` one of them,
 *   e.g. `/guides/data/data.html`
 * - ONE route for all three (`ProjectPageRoute`), so switching between them keeps the page.
 * - anything else:  `<ProjectChooser>`
 * - Each page is ONE route:  it stays mounted while only its address changes, e.g.
 *   moving between files, and follows them (`followRoute()`).
 * - Every page but the editor's loads the first time it shows (`PageViews`, epic `solid-2-final` P11):
 *   the editor's first load carries none of them.
 */
export const ROUTES = defineRoutes([
  {
    path: "/:page/*address",
    matchFilters: { page: ["edit", "design", "run"] },
    component: ProjectPageRoute
  },
  { path: THEME_PAGE, component: PageViews.theme.view("ThemeEditorPage") },
  { path: PALETTE_PAGE, component: PageViews.palette.view("PaletteGroupsPage") },
  { path: `${SITE_PAGE}/*address`, component: PageViews.site.view("SiteEditorRoute") },
  { path: `${PLACE_PAGE}/*address`, component: PageViews.place.view("PlaceReferencePage") },
  { path: [GUIDES_PAGE, `${GUIDES_PAGE}/*path`], component: PageViews.guides.view("GuidesPage") },
  { path: "/*address", matchFilters: { address: isOrgPageAddress }, component: GroupPageRoute },
  { path: "*", component: HomeRoute }
])

/** Is `address` (as the router hands it, maybe still encoded) an org's or an org group's alone:  `@acme`, `@acme/ops`? */
function isOrgPageAddress(address: string): boolean {
  return !!orgPageAt(address)
}

/** The org or group page `address` names (`SPACES.orgPageFor()`), decoded first;  `undefined`:  none. */
function orgPageAt(address: string | undefined): SPACES.OrgPage | undefined {
  try {
    return address ? SPACES.orgPageFor(decodeURIComponent(address)) : undefined
  } catch {
    return undefined
  }
}

/****************
 * ### `<GroupPageRoute>`
 * An org's page, `/@acme`, or an org group's, `/@acme/org-spell` (epic `editor` P47, Q99):  `<GroupPage>`,
 * the address left as typed.
 * - Only for an org with groups here, or one of its groups (`SPACES.orgPageFor()`):  any other address goes home.
 ****************/
function GroupPageRoute(props: RouteSectionProps) {
  return (
    <Show when={orgPageAt(props.params.address)} keyed>
      {(page) => <GroupPage page={page} mode="page" />}
    </Show>
  )
}

/** `<GroupPage>`, loaded the first time an org's or a group's page shows (`PageViews`). */
const GroupPage = PageViews.group.view("GroupPage")

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

/** `<ProjectChooser>`, loaded the first time the home page shows (`PageViews`). */
const ProjectChooser = PageViews.home.view("ProjectChooser")

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
