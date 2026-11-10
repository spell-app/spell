import { For, Show } from "solid-js"

import { SP } from "spell/parser/spell"
import { editor } from "spell/app/app/editor"
import { Actions, FILE_ICON, on, tracked } from "spell/app/app/solid"
import { isStaticBuild } from "spell/app/app/static/staticBuild"

import "./FileDropdown.css"

/****************
 * ### `<FileDropdown>`
 * Menu of all available files for the selected project (`editor.project`):
 * a `<ui-dropdown>` of `<ui-item>`s, showing `editor.file`.
 * Same props as React's `UI.FileDropdown` had.
 * - Choosing a file shows it in `<SpellEditor>`, or in Run with `useRunner`.
 * - Its trigger shows the file icon before the file's name (the `trigger` slot), as each item does.
 * - Loading (spinning caret, no items) until the project's loaded and has a file.
 * - A file the project doesn't import (a `.spellml` beside its `.spell`) is listed after its imports, by its name,
 *   so the trigger still names it.
 * - Files in a project's folders group under a header naming the folder, by `groupByFolder()`:
 *   its files at the top come first, with no header.
 * - The dropdown's value is ALWAYS `editor.file`'s path (see `choose()`):
 *   choosing sets it back during the event, and shows the file chosen, which then becomes `editor.file`.
 * - `showActions`:  `Actions.FILE_DROPDOWN_ACTIONS` after a divider, as dropdown items;
 *   choosing one clicks it, as `<MoreMenu>` does.
 * - Sits in a menu:  wrapped in a `<ui-item class="FileDropdown">`.  Look:  `FileDropdown.css`.
 * - SEE:  its App UI components page, `app/docs/FileDropdown.html` (`/components/app/FileDropdown.html`).
 ****************/
export function FileDropdown(props: FileDropdownProps) {
  const state = trackProjectFiles()

  const selectedName = () => state().files.find((file) => file.path === state().path)?.name
  const grouped = () => groupByFolder(state().files)

  return (
    <ui-item class="FileDropdown">
      <ui-dropdown
        id="FileDropdown"
        class="FileDropdown"
        loading={!state().ready}
        value={state().path}
        ref={on<{ value: string }>("ui-changed", choose)}
      >
        <span slot="trigger" class="FileDropdownTrigger">
          <ui-icon name={FILE_ICON} />
          {selectedName()}
        </span>
        <For each={grouped().atTop} keyed={(file) => file.path}>
          {(file) => <FileRow file={file()} />}
        </For>
        <For each={grouped().folders} keyed={(group) => group.folder}>
          {(group) => (
            <>
              <ui-item kind="header">{group().folder}</ui-item>
              <For each={group().files} keyed={(file) => file.path}>
                {(file) => <FileRow file={file()} />}
              </For>
            </>
          )}
        </For>
        <Show when={props.showActions && state().ready && !isStaticBuild}>
          <ui-item kind="divider" />
          <Actions.FILE_DROPDOWN_ACTIONS />
        </Show>
      </ui-dropdown>
    </ui-item>
  )

  /** One file's row, under its folder's header if it's in one. */
  function FileRow(row: { file: ProjectFileRow }) {
    return (
      <ui-item value={row.file.path} icon={FILE_ICON} onClick={() => open(row.file.path)}>
        {row.file.nameInFolder}
      </ui-item>
    )
  }

  /** Show the file at `path`, in the editor or the runner. */
  function open(path: string) {
    if (props.useRunner) void editor.showRunner(path)
    else editor.showEditor(path)
  }
}

/** Props for `<FileDropdown>`. */
export type FileDropdownProps = {
  /** Open the file in Run, not Edit, when an item is clicked. */
  useRunner?: boolean
  /** Append `Actions.FILE_DROPDOWN_ACTIONS` after a divider -- never in the static build, which has none. */
  showActions?: boolean
}

/**
 * The dropdown's `ui-changed`:  click the item chosen -- a file's opens it, an action's runs it.
 * - SIDE EFFECT:  sets the dropdown's `value` back to `editor.file`'s DURING the event, so the dropdown keeps ours:
 *   the host decides (`requestChange()` on a `@controlled` member, the kit's `element/src/Reactive.ts`).
 * - Opening the file then moves it on.
 */
function choose(event: CustomEvent<{ value: string }>) {
  const dropdown = event.currentTarget as HTMLElement & { value?: unknown }
  dropdown.value = editor.file?.path ?? ""
  const item = [...dropdown.children].find(
    (child) =>
      child.localName === "ui-item" && (child.getAttribute("value") ?? child.textContent?.trim()) === event.detail.value
  )
  ;(item as HTMLElement | undefined)?.click()
}

/** What `<FileDropdown>` and `<FileTabs>` show of `editor`'s project:  its files, and the one shown. */
export type ProjectFilesState = {
  /** The project's loaded, and a file of it is shown. */
  ready: boolean
  /** The path of the file shown;  `""` before there's one. */
  path: string
  /** Every file, in the project's order. */
  files: ProjectFileRow[]
}

/** One file of `ProjectFilesState`. */
export type ProjectFileRow = {
  /** its address, as `editor.file.path` */
  path: string
  /** what a list of the whole project calls it:  `Card.spell`;  in a folder, `Button/Usage` */
  name: string
  /** the folder it's in, inside the project:  `Button`;  `""` for one at its top */
  folder: string
  /** what its folder's list calls it:  `Usage`;  at the project's top, its `name` */
  nameInFolder: string
  /** Has changes not saved. */
  isDirty: boolean
}

/**
 * `editor`'s project's files and the one shown, read in one go through `tracked()`.
 * - A file the project doesn't import (a `.spellml` beside its `.spell`) is listed after its imports, by its name.
 * - Call in a component body:  `tracked()` goes with the component.
 */
export function trackProjectFiles(): () => ProjectFilesState {
  return tracked(() => {
    const { project, file } = editor
    const ready = !!project?.isLoaded && !!file
    const files = ready
      ? project.imports.map(({ path, location, file: each }) => fileRowFor(path, location, each.isDirty))
      : []
    if (ready && !files.some((each) => each.path === file.path))
      files.push(fileRowFor(file.path, file.location, file.isDirty))
    return { ready, path: file?.path ?? "", files }
  })
}

/**
 * The row for the file at `path`, `location` its place.
 * - A file in a folder drops its spell ending, so its folder can name it:  `Button/Usage`, for `Button/Usage.spell`.
 *   Any other ending stays:  `Button/styles.css`.
 * - At the project's top it keeps its whole name, as `Card.spell`;  another project's import, its address.
 */
function fileRowFor(
  path: string,
  location: Pick<SP.SpellLocation, "file" | "folder">,
  isDirty: boolean
): ProjectFileRow {
  const name = location.file ?? path
  const folder = location.folder?.replace(/^\/|\/$/g, "") ?? ""
  if (!folder) return { path, name, folder, nameInFolder: name, isDirty }
  const spellEnding = [SP.SPELL_SUFFIX, ...SP.SPELLML_SUFFIXES].find((suffix) => name.endsWith(suffix))
  const nameInFolder = spellEnding ? name.slice(0, -spellEnding.length) : name
  return { path, name: `${folder}/${nameInFolder}`, folder, nameInFolder, isDirty }
}

/**
 * `files` for the dropdown:  those at the project's top first, then each folder's, in the order each folder first
 * appears in `files` (the project's own order).
 */
function groupByFolder(files: ProjectFileRow[]): { atTop: ProjectFileRow[]; folders: FolderOfFiles[] } {
  const atTop = files.filter((file) => !file.folder)
  const folders = new Map<string, FolderOfFiles>()
  for (const file of files.filter((each) => each.folder)) {
    const group = folders.get(file.folder) ?? { folder: file.folder, files: [] }
    group.files.push(file)
    folders.set(file.folder, group)
  }
  return { atTop, folders: [...folders.values()] }
}

/** A folder's files, for `groupByFolder()`. */
type FolderOfFiles = {
  /** its path inside the project, `Button` */
  folder: string
  /** its files, in the project's order */
  files: ProjectFileRow[]
}
