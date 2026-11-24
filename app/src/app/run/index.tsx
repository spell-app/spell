import { render } from "@solidjs/web"

// Import directly, NOT through the `spell/parser/spell` barrel, which would pull in the whole parser.
import { SpellUrls } from "spell/parser/spell/SpellUrls"
// Import directly:  spell's project groups alone (for `@spell/examples/...`), without spaces' or spell's barrels
import "spell/app/spaces/models/projectGroups"
import { AppTexts } from "spell/app/app/ui/AppTexts"
import { RunPage } from "./RunPage"

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
 */
AppTexts.namePageLanguage()

const root = document.getElementById("run-root")!
const address = addressIn(location.pathname)
let projectId: string | undefined
try {
  projectId = SpellUrls.split(address).projectId
} catch {
  projectId = undefined
}
if (projectId) {
  document.title = projectId.slice(projectId.lastIndexOf("/") + 1)
  render(
    () => <RunPage address={address} projectId={projectId} runtimeUrl={runtimeUrl()} builtInsUrl={builtInsUrl} />,
    root
  )
} else {
  // no project group holds it:  the editor's home page says so, and lists what there is
  location.replace(`/edit/${SpellUrls.encodeAddress(address)}`)
}

/** The address a run page's `pathname` names, decoded:  `/run/@spell/examples/Solitaire` => `@spell/examples/Solitaire`. */
function addressIn(pathname: string): string {
  return pathname
    .replace(/^\/run\//, "")
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
