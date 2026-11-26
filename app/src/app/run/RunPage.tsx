import { Show, createSignal, onCleanup } from "solid-js"
import type { JSX } from "@solidjs/web"

// Import directly, NOT through the `spell/server` barrel, which is the server's node code
import { joinLiveChannel } from "spell/server/liveClient"
// Import directly, NOT through the `spell/parser/spell` barrel, which would pull in the whole parser.
import { SpellUrls } from "spell/parser/spell/SpellUrls"
import { appTexts } from "spell/app/app/ui/AppTexts"
// Import directly, NOT through the `spell/app/app/runner` barrel, which would pull in `runCompiled()`, and so `core`.
import { SpellAppRunner } from "spell/app/app/runner/SpellAppRunner"
import { projectSource } from "spell/app/app/components/spell-viewer/projectSource"
import { RunSiteHost, type OpenedFile } from "./RunSiteHost"

import "./RunPage.css"

/****************
 * ### `<RunPage>`
 * The run page, `/run/<project>`:  a project running by itself, with a slim bar above it, its Edit button opening the
 * editor at `/edit/<project>` (epic `solid-2-final` P12).
 * - What a page opened straight at run mode gets, and a phone (which only runs):  the editor, its code pane and its
 *   language service stay on the server, never downloaded.
 *   - Switching from Edit to Run inside the editor keeps the editor's page, so live edits and the game in progress
 *     carry over.
 * - It runs what the spell server built of the project, as `<spell-viewer project>` does (`projectSource()`):
 *   the server compiles one whose built files are missing.
 * - The runner is `<spell-viewer>`'s, `<SpellAppRunner>`, its toolbar, console and explorers included.
 * - A site keeps its address in the page's:  `/run/<project>/films/4` (`RunSiteHost`);  a page alone in its file is
 *   named by the file too, `/run/<project>/home.spell`, the address the editor's Run gives it (`opened`).
 * - It joins the page server's live channel (`joinLiveChannel()`), as the editor does, through the editor's server:
 *   the runner's waiting box hears each step of the project being made ready to run (epic `editor` P45).
 * - NEVER imports the editor, the parser or `spell/parser/core`:  `build.test.ts` pins what `run.html` loads.
 ****************/
export function RunPage(props: RunPageProps): JSX.Element {
  const isPhone = phoneWidth()
  joinLiveChannel()
  const editUrl = `/edit/${SpellUrls.encodeAddress(props.address)}`
  const siteHost = new RunSiteHost(`/run/${SpellUrls.encodeAddress(props.projectId)}`, document, props.opened)
  return (
    <div class="RunPage">
      <div class="RunBar">
        <a class="RunHome" href="/" aria-label={appTexts.text("home")} data-tooltip={appTexts.text("home")}>
          <i class="RunHat" />
          <span>Spell</span>
        </a>
        <Show when={!isPhone()}>
          <ui-menu appearance="segmented link header" tabs="" class="RunModes" aria-label={appTexts.text("modes")}>
            <ui-item icon="play" selected data-tooltip={appTexts.text("runningTip")}>
              {appTexts.text("runMode")}
            </ui-item>
            <ui-item icon="pencil" data-tooltip={appTexts.text("editTip")} onClick={() => location.assign(editUrl)}>
              {appTexts.text("editMode")}
            </ui-item>
          </ui-menu>
        </Show>
      </div>
      <SpellAppRunner
        source={projectSource(props.projectId)}
        toolbar
        fluid={false}
        runtimeUrl={props.runtimeUrl}
        builtInsUrl={props.builtInsUrl}
        siteHost={() => siteHost}
        // a Type Explorer link:  its file, in the editor
        onOpen={(href) => location.assign(`/edit/${href.replace(/^spell:\//, "").replace(/#.*$/, "")}`)}
        editUrl={editUrl}
      />
    </div>
  )
}

/** Props for `<RunPage>`. */
export type RunPageProps = {
  /** The address the page's URL names, decoded:  `@spell/examples/StarWarsSite/films/4`, a file's, or a project's. */
  address: string
  /** The project it names:  `@spell/examples/StarWarsSite`. */
  projectId: string
  /** The project's file the address names, and the pages it declares:  `/home.spell` (`OpenedFile.of()`). */
  opened?: OpenedFile
  /** URL of `spell-runtime.js`, the program's `@spell/core`. */
  runtimeUrl: string
  /** URL of the built-in types' scope pack, `core.scopes.js`, for the Type Explorer. */
  builtInsUrl: string
}

/**
 * Is the window a phone's (Spell UI's `--ui-mobile`, 767px and narrower), as an accessor that follows it:
 * the editor's own test (`SpellEditor`'s `phoneWidth()`).
 * - Call in a component body:  its listener goes with the component.
 */
function phoneWidth(): () => boolean {
  const query = window.matchMedia(PHONE_QUERY)
  const [isPhone, setPhone] = createSignal(query.matches)
  const follow = () => setPhone(query.matches)
  query.addEventListener("change", follow)
  onCleanup(() => query.removeEventListener("change", follow))
  return isPhone
}

/** Spell UI's phone width (`--ui-mobile`, `spell/ui/styles/media.css`), as `SpellEditor` and `index.html` read it. */
export const PHONE_QUERY = "(width <= 767px)"
