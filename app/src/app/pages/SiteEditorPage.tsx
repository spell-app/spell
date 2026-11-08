import { For, Show, createMemo, createSignal } from "solid-js"
import type { RouteSectionProps } from "@solidjs/router"

import { Dragging } from "spell/util/Dragging"
import type { PropertyOrigin } from "spell/ui/components/ui-property-editor/UIPropertyEditor.types"
import { appTexts, type AppTextKey } from "spell/app/app/ui/AppTexts"
import { editor } from "spell/app/app/editor"
import { SpellPage } from "spell/app/app/solid"
import { editorHotkeys } from "./editorHotkeys"
import { followRoute } from "./followRoute"
import { ChooserToolbar } from "./ProjectChooser"
import { SiteEdits, type SitePart } from "./SiteEdits"
import { SiteWrites } from "./SiteWrites"
import { TileCard } from "./TileCard"

import "./SiteEditorPage.css"

/****************
 * ### `<SiteEditorRoute>`
 * The site editor's route, `/site/<project>` (epic `mockup` P4):  it shows the project its address names, then
 * `<SiteEditorPage>`.
 * - The project loads as it does for Edit and Run (`followRoute()`), with the page `site`:  the URL stays the
 *   project's, whichever file the editor shows.
 ****************/
export function SiteEditorRoute(props: RouteSectionProps) {
  followRoute(
    () => props.params,
    () => "site"
  )
  return <SiteEditorPage />
}

/****************
 * ### `<SiteEditorPage>`
 * A site's editor:  its pages as a tree and a board of cards, and the picked page's form (epic `mockup` P4, Q4 B).
 * - Its own page in the editor app, as the theme editor is:  the editor itself is untouched.
 * - The tree, on the left:  the site's pages as its side navigation nests them;  drag a row to move it, with its
 *   pages, before another row (or below the last, to the end).
 * - The board, in the middle:  a card per page, dialog and sidebar;  a click picks it, a double click opens it in
 *   Edit, at the line that declares it, with "Back to the site" in the editor's bar.
 * - The form, on the right:  the picked part's name, title and address;  its address's parameters, read only.
 * - Every change is ONE step of the editor's history, written into the site's file (`SiteWrites`):
 *   ⌘Z takes it back, ⌘S saves it (the editor's own keys, `editorHotkeys()`).
 * - A project that isn't a site says so, and how to make one.
 * - NOT yet:  live pictures of each page on its card;  the NERD tab (P10).
 ****************/
export function SiteEditorPage() {
  // the editor's own keys:  ⌘Z and ⇧⌘Z take back the site's changes, ⌘S saves
  editorHotkeys(() => false)
  const parts = createMemo(() => SiteWrites.parts() ?? [])
  const all = createMemo(() => SiteEdits.allParts(parts()))
  const [picked, setPicked] = createSignal<string>()
  const pickedPart = createMemo(() => all().find((part) => part.name === picked()))
  const addPage = () => {
    const address = SiteEditorPage.freeAddress(all())
    const name = SiteWrites.addPage(address, appTexts.text("siteNewPageTitle"))
    if (name) setPicked(name)
  }
  return (
    <SpellPage id="SiteEditorPage" fillWindow rows>
      <ChooserToolbar isHome={false} />
      <Show
        when={SiteWrites.siteFile()}
        fallback={
          <p class="SiteEditorPage-empty">
            {editor.project
              ? appTexts.text("siteNotASite", { project: editor.project.projectName ?? editor.project.path })
              : ""}
          </p>
        }
      >
        <div class="SiteEditorPage">
          <aside class="pages" aria-label={appTexts.text("sitePages")}>
            <header>
              <h2>{appTexts.text("sitePages")}</h2>
              <ui-button size="small" appearance="basic" icon="plus" onClick={addPage}>
                {appTexts.text("siteAddPage")}
              </ui-button>
            </header>
            <SitePartTree parts={parts()} picked={picked()} onPick={setPicked} />
          </aside>
          <main class="board">
            <header>
              <h1>{appTexts.text("siteEditorTitle", { project: editor.project?.projectName ?? "" })}</h1>
              <ui-button size="small" appearance="basic" icon="play" onClick={() => void editor.showRunner()}>
                {appTexts.text("siteRunSite")}
              </ui-button>
            </header>
            <div class="cards">
              <For each={all()}>
                {(part) => (
                  <TileCard
                    title={SiteEditorPage.titleOf(part)}
                    line={part.address ?? appTexts.text(`siteKind.${part.kind}` as AppTextKey)}
                    hueFrom={part.name}
                    selected={picked() === part.name}
                    class={`depth-${Math.min(part.depth, 2)}`}
                    onClick={() => setPicked(part.name)}
                    onDblClick={() => SiteEditorPage.openInEdit(part.name)}
                  />
                )}
              </For>
            </div>
          </main>
          <aside class="form">
            <Show when={pickedPart()} fallback={<p class="quiet">{appTexts.text("sitePickOne")}</p>}>
              {(part) => (
                <>
                  <SitePartForm part={part()} onRenamed={setPicked} />
                  <div class="actions">
                    <ui-button
                      size="small"
                      appearance="basic"
                      icon="edit"
                      onClick={() => SiteEditorPage.openInEdit(part().name)}
                    >
                      {appTexts.text("siteOpenPage")}
                    </ui-button>
                    <ui-button
                      size="small"
                      appearance="basic"
                      color="red"
                      icon="trash alternate outline"
                      onClick={() =>
                        void SiteWrites.removePart(part().name).then((isRemoved) => isRemoved && setPicked(undefined))
                      }
                    >
                      {appTexts.text("siteRemovePart", { name: part().name })}
                    </ui-button>
                  </div>
                </>
              )}
            </Show>
          </aside>
        </div>
      </Show>
    </SpellPage>
  )
}

/** What a part's card and row say:  its title, else its name. */
SiteEditorPage.titleOf = (part: SitePart): string => part.title ?? part.name

/** An address no page has yet, for a new page:  `/new-page`, then `/new-page-2` ... */
SiteEditorPage.freeAddress = (parts: readonly SitePart[]): string => {
  const taken = new Set(parts.map((part) => part.address))
  let address = NEW_PAGE_ADDRESS
  for (let number = 2; taken.has(address); number++) address = `${NEW_PAGE_ADDRESS}-${number}`
  return address
}

/**
 * Open part `name` in Edit, at the line that declares it (or lists it, for a page another project declares);
 * the editor's bar then offers "Back to the site" (`editor.cameFromSite`).
 * - NEVER throws:  a failure shows in the error banner.
 */
SiteEditorPage.openInEdit = (name: string): void => {
  const file = SiteWrites.siteFile()
  const project = editor.project
  if (!file || !project) return
  const text = file.contents ?? ""
  const quoted = JSON.stringify(name)
  const declared = [`<spell-page ${quoted}`, `a ${quoted} is a page`, `<spell-view ${quoted}`]
    .map((start) => text.search(new RegExp(`^${escapeForRegExp(start)}`, "m")))
    .find((at) => at >= 0)
  const at = declared ?? safely(() => SiteEdits.partNamed(text, name).line.start) ?? 0
  const line = text.slice(0, at).split("\n").length - 1
  editor.cameFromSite = project.path
  editor.showFileAt(file.path, { anchor: { line, ch: 0 }, head: { line, ch: 0 } }).catch(editor.showError)
}

/** Where a new page goes, before a number makes it free. */
const NEW_PAGE_ADDRESS = "/new-page"

/** `text` as a regular expression that matches only itself. */
function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** What `read()` answers, or `undefined` when it throws. */
function safely<T>(read: () => T): T | undefined {
  try {
    return read()
  } catch {
    return undefined
  }
}

/****************
 * ### `<SitePartTree>`
 * The site's parts as a `<ui-tree>`, nested as its side navigation nests them;  a row picked picks its part.
 * - A row dragged (the kit's `Dragging`) moves its part, with its pages, before the row it's dropped on, or to the end
 *   of the site below the last row:  one step of the editor's history (`SiteWrites.movePart()`).
 ****************/
function SitePartTree(props: { parts: readonly SitePart[]; picked?: string; onPick: (name: string) => void }) {
  return (
    <ui-tree
      label={appTexts.text("sitePages")}
      on-ui-changed={(event: CustomEvent<{ value: string }>) => props.onPick(event.detail.value)}
    >
      <SitePartRows parts={props.parts} picked={props.picked} />
    </ui-tree>
  )
}

/** The rows of `parts`, each with its own parts' rows inside it. */
function SitePartRows(props: { parts: readonly SitePart[]; picked?: string }) {
  return (
    <For each={props.parts}>
      {(part) => (
        <ui-tree-item
          label={SiteEditorPage.titleOf(part)}
          which={part.address ?? ""}
          value={part.name}
          icon={PART_ICONS[part.kind]}
          open=""
          selected={props.picked === part.name ? "" : undefined}
          onPointerDown={(event: PointerEvent) => startMove(event, part.name)}
        >
          <SitePartRows parts={part.parts} picked={props.picked} />
        </ui-tree-item>
      )}
    </For>
  )
}

/** Each kind of part's icon, in the tree. */
const PART_ICONS = { page: "file outline", dialog: "window maximize outline", sidebar: "columns" } as const

/** The attribute that marks the row a dragged part would go before. */
const DROP_BEFORE = "data-drop-before"

/**
 * A press on part `name`'s row:  if it's dragged, the part moves before the row it's dropped on.
 * - Only the row's own press:  a press on a row inside it is that row's.
 */
function startMove(event: PointerEvent, name: string): void {
  const row = event.currentTarget as HTMLElement
  if (event.button !== 0 || (event.target as Element).closest("ui-tree-item") !== row) return
  let before: HTMLElement | undefined
  const mark = (target: HTMLElement | undefined) => {
    before?.removeAttribute(DROP_BEFORE)
    before = target
    before?.setAttribute(DROP_BEFORE, "")
  }
  new Dragging(row, event, {
    carried: [row],
    follows: false,
    placing: (x, y) => {
      const under = document.elementsFromPoint(x, y).find((each) => each.localName === "ui-tree-item")
      mark(under && under !== row && !row.contains(under) ? (under as HTMLElement) : undefined)
    },
    onDrop: () => {
      const target = before?.getAttribute("value") ?? undefined
      mark(undefined)
      SiteWrites.movePart(name, target)
    },
    onCancel: () => mark(undefined)
  })
}

/****************
 * ### `<SitePartForm>`
 * The picked part's form, a `<ui-property-editor>`:  its name, title and address, and its address's parameters,
 * read only.
 * - What's typed is held, and written when the field is left or Enter is pressed:  ONE step of the editor's
 *   history per change (`SiteWrites`), never one per keystroke.
 * - A dialog or sidebar has only its name.
 * - A name the site has already, or an address another page is at, is refused, and said in the error banner.
 ****************/
function SitePartForm(props: { part: SitePart; onRenamed: (name: string) => void }) {
  const fields = () => ({
    name: appTexts.text("siteFieldName"),
    title: appTexts.text("siteFieldTitle"),
    address: appTexts.text("siteFieldAddress"),
    parameters: appTexts.text("siteFieldParameters")
  })
  const isPage = () => props.part.kind === "page"
  const schema = () => ({
    name: props.part.kind,
    attributes: [
      { name: fields().name, kind: "string", description: "" },
      ...(isPage()
        ? [
            { name: fields().title, kind: "string", description: "" },
            { name: fields().address, kind: "string", description: "" },
            { name: fields().parameters, kind: "string", description: "" }
          ]
        : [])
    ]
  })
  const value = () => ({
    [fields().name]: props.part.name,
    ...(isPage() && {
      [fields().title]: props.part.title ?? "",
      [fields().address]: props.part.address ?? "",
      [fields().parameters]: parametersOf(props.part.address) || appTexts.text("siteNoParameters")
    })
  })
  const origins = (): Record<string, PropertyOrigin> => ({
    [fields().parameters]: { kind: "worked out", readonly: true }
  })
  const typed = new Map<string, unknown>()
  const commit = () => {
    if (!typed.size) return
    const { part } = props
    const said = (field: keyof ReturnType<typeof fields>) => typed.get(fields()[field]) as string | undefined
    const title = said("title")
    const address = said("address")
    const name = said("name")?.trim()
    typed.clear()
    if ((title !== undefined && title !== (part.title ?? "")) || (address !== undefined && address !== part.address)) {
      SiteWrites.changePart(part.name, { title, address })
    }
    if (name && name !== part.name && SiteWrites.renamePart(part.name, name)) props.onRenamed(name)
  }
  return (
    <ui-property-editor
      schema={schema()}
      value={value()}
      origins={origins()}
      compact=""
      writer={(write: { name: string; value: unknown }) => {
        typed.set(write.name, write.value)
        return true
      }}
      ref={(form: HTMLElement) => {
        // after the field's own handlers:  its value reaches `writer` as the same event goes on
        const commitSoon = () => setTimeout(commit)
        form.addEventListener("focusout", commitSoon)
        form.addEventListener("change", commitSoon)
        form.addEventListener("keydown", (event) => {
          if (event.key === "Enter") commitSoon()
        })
      }}
    />
  )
}

/** The parameters an address names, `:film`, as words:  `film`;  `""` for none. */
function parametersOf(address: string | undefined): string {
  return [...(address ?? "").matchAll(/:([\p{L}\p{N}_-]+)/gu)].map(([, name]) => name).join(", ")
}
