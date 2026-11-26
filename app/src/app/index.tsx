import { createSignal, Show } from "solid-js"
import { render } from "@solidjs/web"

// Import directly, NOT through the `spell/server` barrel, which is the server's node code
import { joinLiveChannel } from "spell/server/liveClient"

// Import parser bits
import "spell/parser/parser"
import { editor } from "spell/app/app/editor"
import { AppTexts } from "spell/app/app/ui/AppTexts"
import { PageLoading } from "spell/app/app/solid/PageLoading"
import {
  BackToSite,
  EditorTheme,
  ErrorNotice,
  LocalPerson,
  NamePage,
  Notice,
  RestartNeeded,
  UpgradeNotice,
  addAppIconsPageWide
} from "spell/app/app/solid"
import { Routes } from "spell/app/app/pages/routes"
import { isStaticBuild } from "spell/app/app/static/staticBuild"
import { staticFiles } from "spell/app/app/static/StaticFiles"
import { ServerCompileStore } from "spell/app/app/ServerCompileStore"
import { reloadOutOfSight } from "spell/app/app/reloadOutOfSight"
import { stepsOnLoadingScreen } from "spell/app/app/solid/loadingSteps"

// Solid follows spell cells:  BEFORE anything renders
import "spell/app/app/solid/cellsBridge"

// The static build (the public preview) reads its files from the build and keeps edits in the browser;
// every other build has debug globals for hacking in the browser's console (`debug.ts`).
if (isStaticBuild) staticFiles.install()
else void import("./debug").catch((error) => console.error("debug globals:", error))

// A project that hasn't changed since it last compiled isn't compiled again:  its output is in the page server's
// compile cache (epic `language` P27).  Not in the static build, which has no page server.
if (!isStaticBuild) ServerCompileStore.install()

// The editor speaks the page's language:  the browser's, when `index.html` names none.
// BEFORE anything draws, so `<ui-root>` loads Spell UI's words in it too.
AppTexts.namePageLanguage()

// The dev server gone while the tab's out of sight:  reload once it's back, out of sight, not when the person returns.
reloadOutOfSight(import.meta.hot)

// Programs run on the runtime `editor` loads -- start loading it now.
// - It registers the `UI` / `SUI` tags spell JSX draws with, NOT the editor's `spell/app/app/solid`.
// - NEVER import `spell/parser/core` here:  see `spellRuntime.ts`.
void editor.loadRuntime()

// The editor's icon names are Fomantic's, page-wide too:  its dialogs open on `<body>`, outside `index.html`'s `<ui-root>`.
void addAppIconsPageWide()

// The editor's look:  the theme and light / dark picked last, Fruity at first (`EditorTheme`).
void EditorTheme.restore()

// Who's at this machine, before anything draws:  their own projects' group, and their org's, follow it (epic `repo-split` P27).
// Nobody named yet, on this machine:  the name page comes first, and the editor once they've said.
const local = isStaticBuild ? undefined : await LocalPerson.load()
const [isNamed, setIsNamed] = createSignal(!LocalPerson.asks(local))

/**
 * Draw the app, in Solid, into `#app-root` (inside `index.html`'s `<ui-root icons="fomantic">`).
 * - `<NamePage>` first, while nobody at this machine is named (`LocalPerson.asks()`).
 * - `<Routes>` picks `<ProjectChooser>` / `<SpellEditor>` (in Edit, Debug or Run) by URL.
 * - `<Notice>` / `<ErrorNotice>` show `editor.notice` / `editor.error` over every page;
 *   `<UpgradeNotice>`, a project written for an older Spell (`editor.upgradeOffered`).
 * - Dialogs need no root:  each `editor.alert()` / `choose()` ... opens its own `<ui-modal>`.
 * - A running program draws with the page's Solid, in its own root on `<AppRoot>`'s element:
 *   see `editor.setAppRoot()`.
 */
render(
  () => (
    <>
      <Show when={isNamed()} fallback={<NamePage local={local!} onNamed={() => setIsNamed(true)} />}>
        <Routes />
      </Show>
      <Notice />
      <UpgradeNotice />
      <RestartNeeded />
      <BackToSite />
      <ErrorNotice />
    </>
  ),
  document.getElementById("app-root")!
)

// The hero over the page goes once what holds it is ready:  the bar and the code, on the editor's pages.
PageLoading.start()

// While a project it opens waits on a build (an import not built yet), the hero says each step, and stays:
// the page server tells them over its live channel (epic `editor` P45).  Not in the static build, which has none.
if (!isStaticBuild) {
  joinLiveChannel()
  stepsOnLoadingScreen()
}
