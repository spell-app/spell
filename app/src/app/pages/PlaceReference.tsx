import { Show } from "solid-js"
import type { RouteSectionProps } from "@solidjs/router"

import { SP } from "spell/parser/spell"
import { SourceEdits } from "spell/app/lsp/SourceEdits"
import { editor } from "spell/app/app/editor"
import { SpellPage } from "spell/app/app/solid"
import { REFERENCE_EDIT_EVENT, type ReferenceEditDetail } from "spell/app/app/components/spell-reference-page"

import "./PlaceReference.css"

/****************
 * ### `<PlaceReferencePage>`
 * A place's reference page in the editor, `/place/<its description's address>` (epic `data` P52, P53):
 * `/place/@spell/examples/StarWars/StarWars.api.json5`.
 * - Linked from the site editor's Data tab, a link per place (`<SiteData>`).
 * - Its own page, under no top bar:  the reference alone, scrolling.
 * - The reference is a `<spell-reference-page>`, an element any page can hold;  here it's `editable`, and the editor
 *   saves the words a person makes clearer into the place's Spell file (`saveWords()`).
 ****************/
export function PlaceReferencePage(props: RouteSectionProps) {
  const path = () => (props.params.address as string | undefined)?.replace(/\/+$/, "") ?? ""
  return (
    <SpellPage id="PlaceReferencePage" fillWindow scrolling>
      <Show when={path()} keyed>
        {(shown) => <PlaceReference path={shown} />}
      </Show>
    </SpellPage>
  )
}

/****************
 * ### `<PlaceReference>`
 * A readable reference for one place, its words editable:  a `<spell-reference-page>`, whose saves the editor makes.
 * - Its title is the window's, once it has read the place.
 ****************/
export function PlaceReference(props: PlaceReferenceProps) {
  return (
    <spell-reference-page
      class="PlaceReference"
      src={props.path}
      editable=""
      ref={(page: HTMLElement) => {
        page.addEventListener(REFERENCE_EDIT_EVENT, (event) => {
          const detail = (event as CustomEvent<ReferenceEditDetail>).detail
          detail.waitUntil(saveWords(detail))
        })
        document.title = props.path
          .split("/")
          .at(-1)!
          .replace(/\.api\.json5$/, "")
      }}
    />
  )
}

/** What `<PlaceReference>` is handed. */
export type PlaceReferenceProps = {
  /** Its description's address, read once, as it mounts:  `@spell/examples/StarWars/StarWars.api.json5`. */
  path: string
}

/**
 * Save the words `detail` names into their file, as the editor makes any edit from outside the code
 * (`editor.applySourceEdits()`, epic `data` Q101):  the file's own undo, its unsaved dot, then saved.
 * - The edit is worked out on the file as the editor has it, unsaved edits and all.
 * - Resolves with the file's text, saved;  throws when the file isn't in its project.
 */
async function saveWords(detail: ReferenceEditDetail): Promise<string> {
  const location = new SP.SpellLocation(detail.file)
  const project = new SP.SpellProject(location.projectPath!)
  if (!project.isLoaded) await project.load(undefined)
  const file = project.getFile(location)
  if (!file) throw new Error(`${detail.file} isn't in its project.`)
  await file.load(undefined)
  const text = file.contents ?? ""
  const edit = detail.editIn(text)
  editor.applySourceEdits(file, [SourceEdits.replacing(text, { start: edit.start, end: edit.end }, edit.newText)])
  await file.save(undefined)
  return file.contents ?? ""
}
