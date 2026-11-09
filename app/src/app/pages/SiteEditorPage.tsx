import { For, Show, createMemo, createSignal } from "solid-js"
import type { RouteSectionProps } from "@solidjs/router"

import { Dragging } from "spell/util/Dragging"
import type { PropertyOrigin } from "spell/ui/components/ui-property-editor/UIPropertyEditor.types"
import { SP } from "spell/parser/spell"
import { appTexts, type AppTextKey } from "spell/app/app/ui/AppTexts"
import { editor } from "spell/app/app/editor"
import { SpellPage, rememberedSizes } from "spell/app/app/solid"
import { editorHotkeys } from "./editorHotkeys"
import { followRoute } from "./followRoute"
import { PageStories, type PageStory } from "./PageStories"

import { SiteBoardView } from "./SiteBoardView"
import { SiteData } from "./SiteData"
import { SiteEdits, type SitePart, type SitePartPlace } from "./SiteEdits"
import type { ProjectIndex } from "./SitePlaces"
import { SiteGroupPage, SitesHomePage } from "./SiteGroupPage"
import { SiteWrites } from "./SiteWrites"
import { EditorToolbar } from "./SpellEditor"

import "./SiteEditorPage.css"

/****************
 * ### `<SiteEditorRoute>`
 * The site editor's route, `/site/<address>` (epic `mockup` P4):
 * no address shows every site (`<SitesHomePage>`), a group's address its sites (`<SiteGroupPage>`),
 * a project's its site's editor.
 ****************/
export function SiteEditorRoute(props: RouteSectionProps) {
  const address = () => (props.params.address as string | undefined)?.replace(/\/+$/, "")
  const group = createMemo(() => SiteGroupPage.groupAt(address()))
  return (
    <Show when={address()} fallback={<SitesHomePage />}>
      <Show when={group()} fallback={<SiteProjectRoute params={props.params} />}>
        {(path) => <SiteGroupPage group={path()} />}
      </Show>
    </Show>
  )
}

/**
 * The project `/site/<project>` names, in `<SiteEditorPage>`.
 * - It loads as it does for Edit and Run (`followRoute()`), with the page `site`:
 *   the URL stays the project's, whichever file the editor shows.
 */
function SiteProjectRoute(props: { params: RouteSectionProps["params"] }) {
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
 *   pages, before or after another row, or into a page as its first page (below the last row:  to the end).
 * - The board, in the middle:  a block per section, a card per page, dialog and sidebar (`<SiteBoardView>`);
 *   a click picks it, a double click opens it in Edit, at the line that declares it, with "Back to the site" in the
 *   editor's bar;  dragging moves it.
 * - The form, on the right:  the picked part's name, title and address;  its address's parameters, read only.
 *   - A page's STORIES under it (epic `mockup` P6):  what it must let people do, plain lines or Agile stories,
 *     to add, tick off, change, reorder and delete (`<SitePageStories>`);  each card counts them.
 * - The three panels are a `<ui-split-panel>`:  drag between them to resize, the board taking the difference;
 *   their widths are remembered (`rememberedSizes()`).
 * - Every change is ONE step of the editor's history, written into the site's file (`SiteWrites`):
 *   ⌘Z takes it back, ⌘S saves it (the editor's own keys, `editorHotkeys()`).
 * - A project that isn't a site says so, and how to make one.
 * - Its Data tab (epic `mockup` P11):  the places the site reads, as a NERD whose boxes turn over to their ERD,
 *   and a collection's sample rows to edit (`<SiteData>`).
 * - NOT yet:  live thumbnails of each page on its card.
 ****************/
export function SiteEditorPage() {
  // the editor's own keys:  ⌘Z and ⇧⌘Z take back the site's changes, ⌘S saves
  editorHotkeys(() => false)
  const parts = createMemo(() => SiteWrites.parts() ?? [])
  const all = createMemo(() => SiteEdits.allParts(parts()))
  const [picked, setPicked] = createSignal<string>()
  const [tab, setTab] = createSignal<SiteEditorTab>("pages")
  const columns = rememberedSizes(() => SITE_COLUMNS)
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
        <ui-split-panel
          class="SiteEditorPage"
          columns={columns.sizes()}
          grows="2"
          min-size={MIN_PANEL_SIZE}
          resizable
          on-ui-changed={columns.keep}
        >
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
              <span class="title">
                <ui-button
                  size="small"
                  appearance="basic"
                  icon="arrow left"
                  onClick={() => editor.showSiteEditor(editor.projectRoot?.path)}
                >
                  {appTexts.text("siteGroupBack")}
                </ui-button>
                <h1>{appTexts.text("siteEditorTitle", { project: editor.project?.projectName ?? "" })}</h1>
              </span>
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
                <SiteBoardView
                  parts={parts()}
                  picked={picked()}
                  titleOf={SiteEditorPage.cardTitleOf}
                  lineOf={SiteEditorPage.lineOf}
                  thumbnailOf={SiteEditorPage.thumbnailOf}
                  newTabUrlOf={SiteEditorPage.newTabUrlOf}
                  newTabLabel={appTexts.text("siteOpenInNewTab")}
                  onPick={setPicked}
                  onOpen={SiteEditorPage.openInEdit}
                />
              </div>
            </Show>
          </main>
          <aside class="form">
            <Show when={pickedPart()} fallback={<p class="quiet">{appTexts.text("sitePickOne")}</p>}>
              {(part) => (
                <>
                  <SitePartForm part={part()} onRenamed={setPicked} />
                  <Show when={part().kind === "page"}>
                    <SitePageStories name={part().name} />
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
        </ui-split-panel>
      </Show>
    </SpellPage>
  )
}

/** The editor's preference that remembers the panels' widths, and the widths they start with. */
const SITE_COLUMNS = { id: "siteEditor-columns", sizes: "280px,*,320px" }

/** The narrowest a dragged panel may get. */
const MIN_PANEL_SIZE = "180px"

/**
 * A card's second line:  a page's address, else what it is;  and how many of its stories are done, when it has some.
 * - e.g. `/films/:film · 1 of 3 stories`
 */
SiteEditorPage.lineOf = (part: SitePart): string => {
  const where = part.address ?? appTexts.text(`siteKind.${part.kind}` as AppTextKey)
  const stories = part.kind === "page" ? SiteWrites.storiesOf(part.name) : undefined
  if (!stories?.length) return where
  return `${where} · ${appTexts.text("siteStoriesCount", { done: PageStories.doneIn(stories), count: stories.length })}`
}

/** What a part's card and row say:  its title, else its name. */
SiteEditorPage.titleOf = (part: SitePart): string => part.title ?? part.name

/**
 * What a part's card says:  its title, else its name;  a dialog's or sidebar's, without the word for its kind,
 * which the card's line and shape say already:  `settings dialog` => `Settings`.
 */
SiteEditorPage.cardTitleOf = (part: SitePart): string => {
  const title = SiteEditorPage.titleOf(part)
  if (part.title || part.kind === "page") return title
  const words = title.replace(/\s+(?:dialog|modal|sidebar|flyout)$/i, "")
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** A part's thumbnail, as the address of its file:  its site line's, else its page's or view's own;  none has none. */
SiteEditorPage.thumbnailOf = (part: SitePart): string | undefined => {
  const thumbnail = part.thumbnail ?? SiteWrites.thumbnailOf(part.name)
  return thumbnail && SP.SpellUrls.fileUrl(`${editor.project?.path}/${thumbnail}`)
}

/** The real page a card stands for, on the live site, for a new tab;  none when the site doesn't say. */
SiteEditorPage.newTabUrlOf = (part: SitePart): string | undefined =>
  part.live && SiteEdits.isLiveLink(part.live) ? part.live : undefined

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
  SiteWrites.openPart(name).catch(editor.showError)
}

/** The board's tabs:  the site's pages, or the data it reads. */
type SiteEditorTab = "pages" | "data"

/** Where a new page goes, before a number makes it free. */
const NEW_PAGE_ADDRESS = "/new-page"

/****************
 * ### `<SitePartTree>`
 * The site's parts as a `<ui-tree>`, nested as its side navigation nests them;  a row picked picks its part.
 * - A row dragged (the kit's `Dragging`) moves its part, with its pages:
 *   one step of the editor's history (`SiteWrites.movePart()`).
 *   - On a row's top or bottom edge:  before or after it, at its depth;  a line shows where.
 *   - On the middle of a page's row:  inside it, as its first page;  the whole row lights up.
 *     A row that can't hold it (`SiteEdits.canNest()`, `canGoUnder()`) has only its two halves, before and after.
 *   - Below the last row:  to the end of the site, shown as after that row.
 *   - On itself, on one of its own pages, or anywhere else:  no mark, and the drop moves nothing.
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
          data-can-nest={SiteEdits.canNest(part) ? "" : undefined}
          data-can-go-under={SiteEdits.canGoUnder(part) ? "" : undefined}
          onPointerDown={(event: PointerEvent) => startMove(event, part.name)}
        >
          <SitePartRows parts={part.parts} picked={props.picked} />
        </ui-tree-item>
      )}
    </For>
  )
}

/** Each kind of part's icon, in the tree. */
const PART_ICONS = {
  page: "file outline",
  dialog: "window maximize outline",
  sidebar: "columns",
  group: "folder outline"
} as const

/** The attribute saying where a dragged part would go, on the row it would go by:  its value is `SitePartPlace`'s `where`. */
const DROP_MARK = "data-drop"

/** The attribute on a row whose part can nest (`SiteEdits.canNest()`). */
const CAN_NEST = "data-can-nest"

/** The attribute on a row whose part can go under a page (`SiteEdits.canGoUnder()`). */
const CAN_GO_UNDER = "data-can-go-under"

/** How much of a page's row, from its top and from its bottom, means before and after;  the rest means into it. */
const DROP_EDGE = 0.25

/**
 * A press on part `name`'s row:  if it's dragged, the part moves to the place the drop mark shows.
 * - Only the row's own press:  a press on a row inside it is that row's.
 */
function startMove(event: PointerEvent, name: string): void {
  const row = event.currentTarget as HTMLElement
  if (event.button !== 0 || (event.target as Element).closest("ui-tree-item") !== row) return
  let marked: HTMLElement | undefined
  const mark = (spot?: DropSpot) => {
    marked?.removeAttribute(DROP_MARK)
    marked = spot?.row
    if (spot) marked!.setAttribute(DROP_MARK, spot.where)
  }
  new Dragging(row, event, {
    carried: [row],
    follows: false,
    placing: (x, y) => mark(dropSpotAt(row, x, y)),
    onDrop: () => {
      const where = marked?.getAttribute(DROP_MARK) as SitePartPlace["where"] | null | undefined
      const part = marked?.getAttribute("value")
      mark()
      if (where && part) SiteWrites.movePart(name, { where, part })
    },
    onCancel: () => mark()
  })
}

/**
 * Where `dragged`'s part would land with the pointer at `x`, `y`:  none over itself, its own pages, or outside the tree.
 * - NOTE:  a dragged row ignores the pointer, so over it the row around it is what's found:
 *   `whereOnRow()` only answers for a pointer on the row's own line.
 */
function dropSpotAt(dragged: HTMLElement, x: number, y: number): DropSpot | undefined {
  const under = document.elementsFromPoint(x, y).find((each) => each.localName === "ui-tree-item") as
    | HTMLElement
    | undefined
  if (under) {
    if (under === dragged || dragged.contains(under)) return undefined
    const where = whereOnRow(under, y, dragged.hasAttribute(CAN_GO_UNDER) && under.hasAttribute(CAN_NEST))
    return where && { row: under, where }
  }
  const tree = dragged.closest("ui-tree")
  const last = tree?.querySelector<HTMLElement>(":scope > ui-tree-item:last-of-type")
  const pane = tree?.parentElement?.getBoundingClientRect()
  if (!last || last === dragged || !pane) return undefined
  const isBelowLast = y > last.getBoundingClientRect().bottom && y <= pane.bottom && x >= pane.left && x <= pane.right
  return isBelowLast ? { row: last, where: "after" } : undefined
}

/**
 * What height `y` means on `item`'s own line:  none when it's off that line, e.g. on the rows inside it.
 * - `canGoInside`:  its middle means into it;  else its top half is before, its bottom half after.
 */
function whereOnRow(item: HTMLElement, y: number, canGoInside: boolean): SitePartPlace["where"] | undefined {
  const line = (item.shadowRoot?.querySelector('[part~="row"]') ?? item).getBoundingClientRect()
  if (y < line.top || y > line.bottom) return undefined
  const along = (y - line.top) / line.height
  if (!canGoInside) return along < 0.5 ? "before" : "after"
  if (along < DROP_EDGE) return "before"
  return along > 1 - DROP_EDGE ? "after" : "into"
}

/** Where a dragged part would land:  by `row`, or inside it. */
type DropSpot = { row: HTMLElement; where: SitePartPlace["where"] }

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
    live: appTexts.text("siteFieldLive"),
    parameters: appTexts.text("siteFieldParameters")
  })
  const isPage = () => props.part.kind === "page"
  const isGroup = () => props.part.kind === "group"
  /** What the name field shows:  a group's own words, not what it's known by. */
  const shownName = () => (isGroup() ? (props.part.title ?? "") : props.part.name)
  const schema = () => ({
    name: props.part.kind,
    attributes: [
      { name: fields().name, kind: "string", description: "" },
      ...(isPage()
        ? [
            { name: fields().title, kind: "string", description: "" },
            { name: fields().address, kind: "string", description: "" },
            { name: fields().state, kind: "enum", values: PAGE_STATES, description: "" },
            { name: fields().live, kind: "string", description: "" },
            { name: fields().parameters, kind: "string", description: "" }
          ]
        : [])
    ]
  })
  const value = () => ({
    [fields().name]: shownName(),
    ...(isPage() && {
      [fields().title]: props.part.title ?? "",
      [fields().address]: props.part.address ?? "",
      [fields().state]: props.part.state ?? "",
      [fields().live]: props.part.live ?? "",
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
    const live = said("live")
    const name = said("name")?.trim()
    const wasGroup = part.kind === "group"
    typed.clear()
    if (
      (title !== undefined && title !== (part.title ?? "")) ||
      (address !== undefined && address !== part.address) ||
      (state !== undefined && state !== (part.state ?? "")) ||
      (live !== undefined && live !== (part.live ?? ""))
    ) {
      SiteWrites.changePart(part.name, { title, address, state, live })
    }
    if (name && name !== shownName() && SiteWrites.renamePart(part.name, name)) {
      props.onRenamed(wasGroup ? SiteEdits.groupKey(name) : name)
    }
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
 * ### `<SitePageStories>`
 * A page's STORIES, under its form (epic `mockup` P6, Q12):  what it must let people do, kept with the page for good.
 * - Each a row:  a thumb to drag it by (or move it with the arrow keys), its box to tick it off, one field of at least
 *   two rows that grows with its text (its words, then two blank lines and its description, if it has one);
 *   and a button to delete it, which asks first unless Option is held.
 * - "Add a story" adds an empty one, its field showing the shape to fill in:  `As a …, I want …, so that …`.
 * - Every change is ONE step of the editor's history, written into the page's own file (`SiteWrites.changeStories()`);
 *   typed words are written when the field is left, never once a keystroke.
 * - A page another project declares (a notebook a site imports) says its stories are written there.
 ****************/
function SitePageStories(props: { name: string }) {
  const stories = createMemo(() => SiteWrites.storiesOf(props.name))
  const write = (next: PageStory[]) => SiteWrites.changeStories(props.name, next)
  const changed = (story: PageStory, change: Partial<PageStory>) =>
    write((stories() ?? []).map((each) => (each === story ? { ...each, ...change } : each)))
  const movedTo = (story: PageStory, at: number) => {
    const list = [...(stories() ?? [])]
    const from = list.indexOf(story)
    if (from < 0 || at === from || at < 0 || at >= list.length) return
    list.splice(from, 1)
    list.splice(at, 0, story)
    write(list)
  }
  /** Arrow up or down on a thumb moves its story, and the focus with it:  rows stay put, their stories change. */
  const movedByKey = (event: KeyboardEvent, story: PageStory) => {
    const by = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0
    if (!by) return
    event.preventDefault()
    const at = (stories() ?? []).indexOf(story) + by
    movedTo(story, at)
    const rows = (event.currentTarget as HTMLElement).closest("ol")!.children
    rows[at]?.querySelector<HTMLElement>(".thumb")?.focus()
  }
  const removed = async (story: PageStory, event: MouseEvent) => {
    if (!event.altKey && !(await editor.confirm({ message: appTexts.text("siteStoryConfirmRemove") }))) return
    write((stories() ?? []).filter((each) => each !== story))
  }
  const added = (story: PageStory) => write([...(stories() ?? []), story])
  return (
    <section class="SitePageStories" aria-label={appTexts.text("siteStories")}>
      <h3>{appTexts.text("siteStories")}</h3>
      <Show
        when={stories()}
        fallback={<p class="quiet">{appTexts.text("siteStoriesElsewhere", { name: props.name })}</p>}
      >
        {(list) => (
          <>
            <Show when={list().length} fallback={<p class="quiet">{appTexts.text("siteStoriesNone")}</p>}>
              <ol>
                <For each={list()} keyed={false}>
                  {(story) => (
                    <li class={{ done: !!story().done }}>
                      <button
                        type="button"
                        class="thumb"
                        aria-label={appTexts.text("siteStoryMove")}
                        title={appTexts.text("siteStoryMove")}
                        onPointerDown={(event) => {
                          const moving = story()
                          startStoryMove(event, (at) => movedTo(moving, at))
                        }}
                        onKeyDown={(event) => movedByKey(event, story())}
                      >
                        <ui-icon name="grip vertical" />
                      </button>
                      <input
                        type="checkbox"
                        checked={!!story().done}
                        aria-label={appTexts.text("siteStoryDone")}
                        onChange={(event) => changed(story(), { done: event.currentTarget.checked })}
                      />
                      <textarea
                        class="text"
                        value={story().text}
                        placeholder={appTexts.text("siteNewStory")}
                        onChange={(event) => changed(story(), { text: event.currentTarget.value.trim() })}
                      />
                      <span class="actions">
                        <ui-button
                          size="mini"
                          appearance="basic"
                          icon="trash alternate outline"
                          aria-label={appTexts.text("siteStoryRemove")}
                          title={appTexts.text("siteStoryRemove")}
                          onClick={(event: MouseEvent) =>
                            void removed(story(), event).catch((error) => editor.showError(error))
                          }
                        />
                      </span>
                    </li>
                  )}
                </For>
              </ol>
            </Show>
            <div class="add">
              <ui-button size="small" appearance="basic" icon="plus" onClick={() => added(PageStories.newStory(""))}>
                {appTexts.text("siteAddStory")}
              </ui-button>
            </div>
          </>
        )}
      </Show>
    </section>
  )
}

/** The attribute saying where a dragged story would land:  `before` or `after` its row. */
const STORY_DROP = "data-drop"

/** The attribute on the story being dragged. */
const STORY_MOVING = "data-being-moved"

/**
 * A press on a story's thumb:  once dragged, a line shows where it would land, and `onMoved` hears where it did.
 * - Escape moves nothing;  so does a drop back where it started.
 */
function startStoryMove(event: PointerEvent, onMoved: (at: number) => void): void {
  if (event.button !== 0) return
  const row = (event.currentTarget as HTMLElement).closest("li")!
  const rows = [...row.parentElement!.children] as HTMLElement[]
  const from = rows.indexOf(row)
  let marked: HTMLElement | undefined
  let landing = from
  const stop = () => {
    marked?.removeAttribute(STORY_DROP)
    row.removeAttribute(STORY_MOVING)
  }
  new Dragging(row, event, {
    carried: [row],
    follows: false,
    placing: (_x, y) => {
      row.setAttribute(STORY_MOVING, "")
      const above = rows.findIndex((each) => {
        const { top, bottom } = each.getBoundingClientRect()
        return y < (top + bottom) / 2
      })
      const gap = above < 0 ? rows.length : above
      landing = gap > from ? gap - 1 : gap
      marked?.removeAttribute(STORY_DROP)
      marked = landing === from ? undefined : rows[above < 0 ? rows.length - 1 : gap]
      marked?.setAttribute(STORY_DROP, above < 0 ? "after" : "before")
    },
    onDrop: () => {
      stop()
      onMoved(landing)
    },
    onCancel: stop
  })
}
