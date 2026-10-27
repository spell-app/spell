import { BenchPages, type BenchPageId } from "spell/ui/docs-components/ui-docs-theme-bench/BenchPages"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { EditorTheme, SpellPage, on } from "spell/app/app/solid"
import { navigate } from "./navigation"
import { ChooserToolbar } from "./ProjectChooser"

import "./ThemeEditorPage.css"

/****************
 * ### `<ThemeEditorPage>`
 * The editor's theme editor, full size:  Spell UI's `<ui-theme-editor>` under the top bar (epic `debut` P6, P24),
 * at `/theme`.
 * - Reached from the palette menu's "Edit theme..." (`<ThemeMenu>`).
 * - It starts from the theme being made, or the one kept in this browser (`SavedTheme`), as the element does.
 * - While developing, it previews the same four real pages as the docs' theme bench (`BenchPages`):
 *   the editor and a notebook on this address, the epic page and Spell UI's on the page server's, through the
 *   dev server (`app/vite.config.ts` passes them through);  built, it shows the element's sample app.
 * - Use this theme (`ui-saved`):  the editor wears it at once (`EditorTheme.wearKept()`), and goes back to the page it
 *   came from, else the landing page.  Stop using:  the same, taking it off.
 * - Its element loads with the page, a chunk of its own:  no other page of the editor carries it.
 ****************/
export function ThemeEditorPage() {
  void import("spell/ui/components/ui-theme-editor").catch((error: unknown) =>
    console.error("ThemeEditorPage:  couldn't load the theme editor", error)
  )
  return (
    <SpellPage id="ThemeEditorPage" fillWindow dark>
      <div class="ThemeEditorPage">
        <ChooserToolbar isHome={false} />
        <ui-theme-editor class="ThemeEditor" pages={previewPages()} ref={on("ui-saved", () => void wearAndGoBack())} />
      </div>
    </SpellPage>
  )
}

/** The pages the theme editor previews:  `BenchPages`' four while developing, on this address;  none when built. */
function previewPages() {
  if (!import.meta.env.DEV) return []
  return BenchPages.pages({
    siteRoot: "",
    editorBase: location.origin,
    labelOf: (id: BenchPageId) => appTexts.text(`themePage.${id}`),
    noEditor: ""
  })
}

/** Wear the theme just kept (or taken off), then go back where the editor came from. */
async function wearAndGoBack(): Promise<void> {
  await EditorTheme.wearKept()
  if (history.length > 1) history.back()
  else navigate("/")
}
