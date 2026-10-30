import { For, Show } from "solid-js"

import { editor } from "spell/app/app/editor"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { FileDropdown, trackProjectFiles } from "./FileDropdown"

import "./FileTabs.css"

/****************
 * ### `<FileTabs>`
 * Every file of the project as a tab over the code, in the theme's tab look (epic `debut` P32):
 * Spell UI's `<ui-toolbar appearance="tabular">`, the file shown its chosen tab.
 * - Every file, always:  no tab closes (Owen, Q4).
 * - A tab whose file has changes not saved shows a dot.
 * - Too many to fit:  the toolbar's own ‹ › scroll them, and a click scrolls the tab it chose into view.
 * - Narrower than two tabs and a button:  the file dropdown instead (`<FileDropdown>`), by a container query
 *   (`FileTabs.css`).
 * - A click shows that file (`editor.showEditor()`).
 ****************/
export function FileTabs() {
  const state = trackProjectFiles()
  return (
    <div class="FileTabs">
      <ui-toolbar appearance="tabular" size="small" class="FileTabsRow" aria-label={appTexts.text("fileTabs")}>
        <For each={state().files} keyed={(file) => file.path}>
          {(file) => (
            <ui-item selected={file().path === state().path} onClick={() => editor.showEditor(file().path)}>
              {file().name}
              <Show when={file().isDirty}>
                <span class="NotSaved" title={appTexts.text("notSaved")} aria-label={appTexts.text("notSaved")} />
              </Show>
            </ui-item>
          )}
        </For>
      </ui-toolbar>
      <ui-menu size="small" class="FileTabsNarrow">
        <FileDropdown />
      </ui-menu>
    </div>
  )
}
