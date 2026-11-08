import { For, Show, createMemo, createSignal } from "solid-js"
import type { RouteSectionProps } from "@solidjs/router"

import { Dragging } from "spell/util/Dragging"
import type { PropertyOrigin } from "spell/ui/components/ui-property-editor/UIPropertyEditor.types"
import { SP } from "spell/parser/spell"
import { appTexts, type AppTextKey } from "spell/app/app/ui/AppTexts"
import { editor } from "spell/app/app/editor"
import { SpellPage } from "spell/app/app/solid"
import { editorHotkeys } from "./editorHotkeys"
import { followRoute } from "./followRoute"
import { PageJobs, type PageJob } from "./PageJobs"
import { SiteData } from "./SiteData"
import { SiteEdits, type SitePart } from "./SiteEdits"
import type { ProjectIndex } from "./SitePlaces"
import { SiteWrites } from "./SiteWrites"
import { EditorToolbar } from "./SpellEditor"
import { TileCard } from "./TileCard"

import "./SiteEditorPage.css"

/****************
 * ### `<SiteEditorRoute>`
 * The site editor's route, `/site/<project>` (epic `mockup` P4):
 * it shows the project its address names, then `<SiteEditorPage>`.
 * - The project loads as it does for Edit and Run (`followRoute()`), with the page `site`:
 *   the URL stays the project's, whichever file the editor shows.
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
 *   - A page's JOBS under it (epic `mockup` P6):  what it must let people do, plain lines or Agile stories,
 *     to add, tick off, change, reorder and delete (`<SitePageJobs>`);  each card counts them.
 * - Every change is ONE step of the editor's history, written into the site's file (`SiteWrites`):
 *   ⌘Z takes it back, ⌘S saves it (the editor's own keys, `editorHotkeys()`).
 * - A project that isn't a site says so, and how to make one.
 * - Its Data tab (epic `mockup` P11):  the places the site reads, as a NERD whose boxes turn over to their ERD,
 *   and a collection's sample rows to edit (`<SiteData>`).
 * - NOT yet:  live pictures of each page on its card.
 ****************/
export function SiteEditorPage() {
  // the editor's own keys:  ⌘Z and ⇧⌘Z take back the site's changes, ⌘S saves
  editorHotkeys(() => false)
  const parts = createMemo(() => SiteWrites.parts() ?? [])
  const all = createMemo(() => SiteEdits.allParts(parts()))
  const [picked, setPicked] = createSignal<string>()
  const [tab, setTab] = createSignal<SiteEditorTab>("pages")
  const pickedPart = createMemo(() => all().find((part) => part.name === picked()))
  const addPage = () => {
    const address = SiteEditorPage.freeAddress(all())
    const name = SiteWrites.addPage(address, appTexts.text("siteNewPageTitle"))
    if (name) setPicked(name)
  }
  return (
    <SpellPage id="SiteEditorPage" fillWindow rows>
      <EditorToolbar mode="site" />
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
              <ui-buttons size="small" class="tabs">
                <ui-button
                  appearance={tab() === "pages" ? undefined : "basic"}
                  icon="sitemap"
                  aria-pressed={tab() === "pages" ? "true" : "false"}
                  onClick={() => setTab("pages")}
                >
                  {appTexts.text("siteTabPages")}
                </ui-button>
                <ui-button
                  appearance={tab() === "data" ? undefined : "basic"}
                  icon="database"
                  aria-pressed={tab() === "data" ? "true" : "false"}
                  onClick={() => setTab("data")}
                >
                  {appTexts.text("siteTabData")}
                </ui-button>
              </ui-buttons>
              <ui-button size="small" appearance="basic" icon="play" onClick={() => void editor.showRunner()}>
                {appTexts.text("siteRunSite")}
              </ui-button>
            </header>
            <Show when={tab() === "data"}>
              <SiteData
                projectId={editor.project?.projectId ?? ""}
                contents={editor.project?.contents as ProjectIndex | undefined}
              />
            </Show>
            <Show when={tab() === "pages"}>
              <div class="cards">
                <For each={all()}>
                  {(part) => (
                    <TileCard
                      title={SiteEditorPage.titleOf(part)}
                      line={SiteEditorPage.lineOf(part)}
                      hueFrom={part.name}
                      picture={part.picture && SP.SpellUrls.fileUrl(`${editor.project?.path}/${part.picture}`)}
                      selected={picked() === part.name}
                      class={`depth-${Math.min(part.depth, 2)}`}
                      onClick={() => setPicked(part.name)}
                      onDblClick={() => SiteEditorPage.openInEdit(part.name)}
                    />
                  )}
                </For>
              </div>
            </Show>
          </main>
          <aside class="form">
            <Show when={pickedPart()} fallback={<p class="quiet">{appTexts.text("sitePickOne")}</p>}>
              {(part) => (
                <>
                  <SitePartForm part={part()} onRenamed={setPicked} />
                  <Show when={part().kind === "page"}>
                    <SitePageJobs name={part().name} />
                  </Show>
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

/**
 * A card's second line:  a page's address, else what it is;  and how many of its jobs are done, when it has some.
 * - e.g. `/films/:film · 1 of 3 jobs`
 */
SiteEditorPage.lineOf = (part: SitePart): string => {
  const where = part.address ?? appTexts.text(`siteKind.${part.kind}` as AppTextKey)
  const jobs = part.kind === "page" ? SiteWrites.jobsOf(part.name) : undefined
  if (!jobs?.length) return where
  return `${where} · ${appTexts.text("siteJobsCount", { done: PageJobs.doneIn(jobs), count: jobs.length })}`
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

/** The board's tabs:  the site's pages, or the data it reads. */
type SiteEditorTab = "pages" | "data"

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
 * The picked part's form, a `<ui-property-editor>`:
 * its name, title and address, and its address's parameters, read only.
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
    state: appTexts.text("siteFieldState"),
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
            { name: fields().state, kind: "enum", values: PAGE_STATES, description: "" },
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
      [fields().state]: props.part.state ?? "",
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
    const state = said("state")
    const name = said("name")?.trim()
    typed.clear()
    if (
      (title !== undefined && title !== (part.title ?? "")) ||
      (address !== undefined && address !== part.address) ||
      (state !== undefined && state !== (part.state ?? ""))
    ) {
      SiteWrites.changePart(part.name, { title, address, state })
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

/** The states a page may be in:  none said, then the site language's four (epic `mockup` P13, T14). */
const PAGE_STATES = ["", "old", "new", "mocked", "built"]

/** The parameters an address names, `:film`, as words:  `film`;  `""` for none. */
function parametersOf(address: string | undefined): string {
  return [...(address ?? "").matchAll(/:([\p{L}\p{N}_-]+)/gu)].map(([, name]) => name).join(", ")
}

/****************
 * ### `<SitePageJobs>`
 * A page's JOBS, under its form (epic `mockup` P6, Q12):  what it must let people do, kept with the page for good.
 * - Each a row:  its box to tick it off, its words, and its details under them (`- done when:  ...`), each a field
 *   that grows with its text;  buttons to move it up or down, or delete it.
 * - "Add a job" adds a plain one;
 *   "Add a story" an Agile story to fill in, `As a …, I want …, so that …`, with a check under it.
 * - Every change is ONE step of the editor's history, written into the page's own file (`SiteWrites.changeJobs()`);
 *   typed words are written when the field is left, never once a keystroke.
 * - A page another project declares (a notebook a site imports) says its jobs are written there.
 ****************/
function SitePageJobs(props: { name: string }) {
  const jobs = createMemo(() => SiteWrites.jobsOf(props.name))
  const write = (next: PageJob[]) => SiteWrites.changeJobs(props.name, next)
  const changed = (job: PageJob, change: Partial<PageJob>) =>
    write((jobs() ?? []).map((each) => (each === job ? { ...each, ...change } : each)))
  const moved = (job: PageJob, by: -1 | 1) => {
    const list = [...(jobs() ?? [])]
    const at = list.indexOf(job)
    if (at < 0 || at + by < 0 || at + by >= list.length) return
    list.splice(at, 1)
    list.splice(at + by, 0, job)
    write(list)
  }
  const added = (job: PageJob) => write([...(jobs() ?? []), job])
  return (
    <section class="SitePageJobs" aria-label={appTexts.text("siteJobs")}>
      <h3>{appTexts.text("siteJobs")}</h3>
      <Show when={jobs()} fallback={<p class="quiet">{appTexts.text("siteJobsElsewhere", { name: props.name })}</p>}>
        {(list) => (
          <>
            <Show when={list().length} fallback={<p class="quiet">{appTexts.text("siteJobsNone")}</p>}>
              <ol>
                <For each={list()} keyed={false}>
                  {(job) => (
                    <li class={{ done: !!job().done }}>
                      <input
                        type="checkbox"
                        checked={!!job().done}
                        aria-label={appTexts.text("siteJobDone")}
                        onChange={(event) => changed(job(), { done: event.currentTarget.checked })}
                      />
                      <div class="words">
                        <textarea
                          class="text"
                          rows="1"
                          value={job().text}
                          onChange={(event) => changed(job(), { text: event.currentTarget.value.trim() })}
                        />
                        <textarea
                          class="details"
                          rows="1"
                          value={job().details.join("\n")}
                          placeholder={appTexts.text("siteJobDetails")}
                          onChange={(event) => changed(job(), { details: event.currentTarget.value.split("\n") })}
                        />
                      </div>
                      <span class="actions">
                        <ui-button
                          size="mini"
                          appearance="basic"
                          icon="arrow up"
                          aria-label={appTexts.text("siteJobUp")}
                          title={appTexts.text("siteJobUp")}
                          onClick={() => moved(job(), -1)}
                        />
                        <ui-button
                          size="mini"
                          appearance="basic"
                          icon="arrow down"
                          aria-label={appTexts.text("siteJobDown")}
                          title={appTexts.text("siteJobDown")}
                          onClick={() => moved(job(), 1)}
                        />
                        <ui-button
                          size="mini"
                          appearance="basic"
                          icon="trash alternate outline"
                          aria-label={appTexts.text("siteJobRemove")}
                          title={appTexts.text("siteJobRemove")}
                          onClick={() => write(list().filter((each) => each !== job()))}
                        />
                      </span>
                    </li>
                  )}
                </For>
              </ol>
            </Show>
            <div class="add">
              <ui-button
                size="small"
                appearance="basic"
                icon="plus"
                onClick={() => added(PageJobs.newJob(appTexts.text("siteNewJob")))}
              >
                {appTexts.text("siteAddJob")}
              </ui-button>
              <ui-button
                size="small"
                appearance="basic"
                icon="user outline"
                onClick={() =>
                  added(PageJobs.newJob(appTexts.text("siteNewStory"), [appTexts.text("siteNewStoryCheck")]))
                }
              >
                {appTexts.text("siteAddStory")}
              </ui-button>
            </div>
          </>
        )}
      </Show>
    </section>
  )
}
