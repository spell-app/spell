import { render } from "@solidjs/web"

// Import directly, NOT through the `spell/parser/spell` barrel, which would pull in the whole parser.
import { SpellUrls } from "spell/parser/spell/SpellUrls"
import { SpellSetup } from "spell/parser/spell/SpellSetup"
// Import directly:  spell's project groups alone (for `@spell/examples/...`), without spaces' or spell's barrels
import {
  addGroupPages,
  addOrgGroups,
  groupPages,
  orgPageFor,
  setLocalPerson
} from "spell/app/spaces/models/projectGroups"
import { GROUP_PAGE_PROJECT } from "spell/app/spaces/models/spaceNames"
import { AppTexts } from "spell/app/app/ui/AppTexts"
import { RunPage } from "./RunPage"
import { OpenedFile } from "./RunSiteHost"
import { projectSource } from "spell/app/app/components/spell-viewer/projectSource"

// Solid follows spell cells:  BEFORE anything renders
import "spell/app/app/solid/cellsBridge"
// `<ui-root>`, which loads each Spell UI family the page draws as it appears:  never all of Spell UI
import "spell/ui/components/ui-root"
// the built-in types' scope pack, for the Type Explorer:  beside the build's chunks
import builtInsUrl from "spell/parser/core/core.scopes.js?url"

/**
 * The run page's entry, `run.html`:  `<RunPage>` for the project the URL names, `/run/<project>[/<page or file>]`
 * (epic `solid-2-final` P12).
 * - The editor's server sends `run.html` for a `/run/...` address opened straight (`editorPageFor()`), so a link
 *   to run a program loads the runner alone;  the editor's own switch to Run stays on the editor's page.
 * - NEVER imports `spell/parser/core`, the editor or the parser:  the program runs on its own copy of
 *   `spell-runtime.js`, the editor's (`runtimeUrl()`).
 * - An address only an org's own group holds (`@acme/tools/dashboard`):  the org's groups read first
 *   (`orgGroupsRead()`), else it'd be taken for the org's program `tools`.
 * - An org group's own address (`/run/@acme/org-spell`, or `/@acme/org-spell`, which the server sends here when the
 *   group holds its own page;  epic `editor` P47, Q99):
 *   - a group that holds its own page, a project named `home`:  that project runs, the address kept
 *   - any other group, or an org (`/run/@acme`):  its page in the editor, `/@acme/org-spell`, never a file
 */
AppTexts.namePageLanguage()

const root = document.getElementById("run-root")!
const address = addressIn(location.pathname)
void start()

/** Draw the run page for the project the URL names, once its group is known. */
async function start(): Promise<void> {
  await orgGroupsRead(address)
  const orgPage = orgPageFor(address)
  if (orgPage && !(orgPage.group && groupPages.includes(orgPage.group))) {
    // the group's or org's page is the editor's:  from `/run/...` its own address;  from that address, the editor's
    const pageUrl = `/${SpellUrls.encodeAddress(address)}`
    location.replace(location.pathname.startsWith("/run/") ? pageUrl : `/edit${pageUrl}`)
    return
  }
  let projectId: string | undefined
  try {
    projectId = orgPage?.group ? `${orgPage.group}/${GROUP_PAGE_PROJECT}` : SpellUrls.split(address).projectId
  } catch {
    projectId = undefined
  }
  if (projectId) {
    // a group's own page goes by the group's name;  its address stays the group's, the project's inside the page
    const runs = orgPage?.group ? projectId : address
    document.title = (orgPage?.group ?? projectId).slice((orgPage?.group ?? projectId).lastIndexOf("/") + 1)
    // a page by its file, as the editor's Run names it:  `/run/<project>/home.spell`
    const opened = await OpenedFile.of(runs.slice(projectId.length), projectSource(projectId).declarationsUrl!)
    render(
      () => (
        <RunPage
          address={runs}
          projectId={projectId}
          opened={opened}
          runtimeUrl={runtimeUrl()}
          builtInsUrl={builtInsUrl}
        />
      ),
      root
    )
    void wearEditorsTheme()
  } else {
    // no project group holds it:  the editor's home page says so, and lists what there is
    location.replace(`/edit/${SpellUrls.encodeAddress(address)}`)
  }
}

/**
 * Wear the theme and light / dark the person picked in the editor, as the editor's Run wears them:  the editor's own
 * choice, kept in their space's `spell-app` store (`EditorTheme.restore()`).
 * - So a project opened at `/run/` looks as it does after Edit, then Run:  dark when they picked dark there.
 *   Before, the page read only this browser's copy of the scheme (`spell-site:scheme`, which every Spell page writes
 *   as it's shown), so it followed whichever page was shown last, or the OS when none had written it.
 * - Spell UI's `ThemePreference` alone, never `EditorTheme`, which imports the editor;  loaded after the page draws.
 * - The read-only public build keeps the choice in the browser, as the editor does there.
 * - NEVER throws:  a failure leaves Spell UI's own look, said on the console.
 */
async function wearEditorsTheme(): Promise<void> {
  try {
    const [{ ThemePreference }, { isStaticBuild }] = await Promise.all([
      import("spell/ui/components/ui-theme-menu/ThemePreference"),
      import("spell/app/app/static/staticBuild")
    ])
    ThemePreference.keepIn(isStaticBuild ? "browser" : "space", EDITOR_THEME_STORE)
    await ThemePreference.restore()
  } catch (error) {
    console.error("the run page couldn't wear the editor's theme", error)
  }
}

/** The space's store the editor keeps its theme in:  `EditorTheme`'s, a copy (that file imports the editor). */
const EDITOR_THEME_STORE = "spell-app"

/**
 * Read this machine's person and their org's own groups (`GET /api/people/local`, as the editor's `NamePage` does),
 * when `address` is in an org:  so `@acme/tools/dashboard` is project `dashboard` of the group `@acme/tools`.
 * - Spell's own addresses (`@spell/examples/...`, a person's) ask nothing:  their groups are known up front.
 * - NEVER throws:  a failure is one line in the console, and the address is split as before.
 */
async function orgGroupsRead(address: string): Promise<void> {
  if (SpellSetup.groupFor(address)?.domain !== "org") return
  try {
    const response = await fetch("/api/people/local", { headers: { accept: "application/json" } })
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
    const answer = (await response.json()) as { id?: string; org: string; orgGroups?: string[]; groupPages?: string[] }
    if (answer.id) setLocalPerson({ id: answer.id, org: answer.org })
    addOrgGroups(answer.orgGroups ?? [])
    addGroupPages(answer.groupPages ?? [])
  } catch (error) {
    console.error("/api/people/local didn't answer, so an org's own groups are unknown:", error)
  }
}

/**
 * The address a run page's `pathname` names, decoded:  `/run/@spell/examples/Solitaire` => `@spell/examples/Solitaire`.
 * - A group's own address, `/@acme/org-spell`, names `@acme/org-spell`.
 */
function addressIn(pathname: string): string {
  return pathname
    .replace(/^\/(?:run\/)?/, "")
    .replace(/\/+$/, "")
    .split("/")
    .map((part) => {
      try {
        return decodeURIComponent(part)
      } catch {
        return part
      }
    })
    .join("/")
}

/**
 * URL of the runtime programs run on, also their `@spell/core`:  the editor's own (`editor.ts`'s `runtimeUrl()`).
 * - dev:  vite serves its source, `runner/spellRuntime.ts`
 * - a build:  its own entry, at a FIXED name (`vite.config.ts`)
 * - NOTE: NOT `new URL(..., import.meta.url)`:  vite takes that for an asset to bundle, and inlines it.
 */
function runtimeUrl(): string {
  if (import.meta.env.DEV) {
    const here = import.meta.url.slice(0, import.meta.url.lastIndexOf("/") + 1)
    return new URL("../runner/spellRuntime.ts", here).href
  }
  return new URL(`${import.meta.env.BASE_URL}spell-runtime.js`, location.href).href
}
