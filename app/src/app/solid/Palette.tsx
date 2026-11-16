import { For, Show, createSignal, flush, onSettled } from "solid-js"
import type { JSX } from "@solidjs/web"

import { kebabCase, upperFirst } from "spell/util"
import type { ComponentDefinition } from "spell/ui/components/ComponentDefinitions"
import type { MenuItem } from "spell/parser/core"
import { SP } from "spell/parser/spell"
// Import directly, NOT through the `spell/app/lsp` barrel, which would pull the language service into the bundle.
import type { ScopeNode } from "spell/app/lsp/lsp.types"
import { editor } from "spell/app/app/editor"
import { cutCopyOrPaste, EDITOR_HOTKEYS, undoWay } from "spell/app/app/pages/editorHotkeys"
import { editorPrefs } from "spell/app/app/editorPrefs"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { ActionMenus } from "spell/app/app/runner/ActionMenus"
import { Action } from "./Actions"
import { NotebookPageCells } from "spell/app/app/solid/notebook/NotebookPageCells"
import { ChangeThis } from "./ChangeThis"
import { Inspector } from "./Inspector"
import { on } from "./on"
import { PartEdits, type PartAction } from "./PartEdits"
import { chooseRow, treeChoosesRows } from "./treeRows"

import "./Palette.css"

/**
 * What can be added to the app, and whether it's kept open.
 * - Closed, it's the top bar's popup:  a menu in columns by topic.
 * - Kept open, it's the top bar's second row:  its topics' names, each a menu (epic `editor` T80).
 * - It reads the components' own descriptions (`ComponentDefinitions`), loaded the first time it opens:
 *   every vocabulary, which the page never needs otherwise.
 * - What's offered is what has a `snippet`:  a new component is offered by saying what it adds.
 * - First, This app:  the app's own views, each added as `{draw a new card}` (`Palette.ownViews`, epic `editor` P19).
 *   - On a page that draws its body, a notebook among them, it's This page, with a row of its own first:
 *     a new view, in plain Spell above the page (`addNewView()`, epic `notebook` P5;  `language` P47).
 *   - What else a page adds (an example, a section, text) are the components' own rows.
 * - In a page that draws its body, Spell UI's tags are written by their bare names, as a notebook writes them:
 *   `<example>`, `<section>`.
 *   `<example>` is then the page's own example, its code editable in place.
 */
export class Palette {
  /** Is it kept open as a strip (reactive)? */
  static get isPinned(): boolean {
    return isPinned()
  }

  /** Open it by itself, the next time the top bar's `+` is drawn:  a blank app shows what it can hold. */
  static openOnArrival(): void {
    opensOnArrival = true
    Palette.load()
  }

  /** Was it told to open on arrival?  Says so once. */
  static takeOpenOnArrival(): boolean {
    const opens = opensOnArrival
    opensOnArrival = false
    return opens
  }

  /**
   * Keep it open, or stop;  remembered.
   * - Its menus close either way (epic `editor` I175):  pinned, the bar shows in the popup's place.
   */
  static togglePinned(): void {
    Palette.closeMenus()
    const pinned = !isPinned()
    setPinned(pinned)
    editorPrefs.set(PINNED_PREF, pinned)
  }

  /**
   * Close its menus, the popup and the pinned bar's:  what's added, or dragged, lands on a page you can see
   * (epic `editor` I176).
   */
  static closeMenus(): void {
    for (const menu of menus) {
      if (menu.isConnected) menu.visible = false
      else menus.delete(menu)
    }
  }

  /** Load what it offers, the first time. */
  static load(): void {
    loading ??= import("spell/ui/components/ComponentDefinitions")
      .then(({ ComponentDefinitions }) => {
        definitions = ComponentDefinitions
        setOffered(ComponentDefinitions.paletteGroups())
      })
      .catch((error: unknown) => console.error("Palette.load():  couldn't load what it offers", error))
  }

  /**
   * The app's own views, by name (reactive):  This app, first in the palette.
   * - Its templates that are views, from the editor's scope tree (`editor.scopeTree`), but its app or page.
   * - Only in an English file for now:  what it writes is English.
   */
  static get ownViews(): readonly OwnView[] {
    return ownViewsIn(editor.scopeTree)
  }

  /** Add `view`, one of the app's own, beside what's selected, else at the end of the drawing. */
  static addOwn(view: OwnView): void {
    Palette.closeMenus()
    const place = PartEdits.placeForNew()
    Inspector.readyWordsNext()
    const snippet = withStartingValues(view.snippet, Inspector.startingValuesOf(view.classNames))
    PartEdits.add([snippet], appTexts.text("partStepAdd", { part: view.name }), place)
  }

  /** Is the open file a page that draws its body, a notebook (reactive)?  Its palette is This page's. */
  static get isPageShown(): boolean {
    void editor.edits
    const file = editor.file
    return !!file && NotebookPageCells.holdsDrawnPage(file)
  }

  /**
   * Add a new view of the open page's own, in plain Spell just above its head:  `a "new view" is a view:`,
   * drawn later by its name (epic `language` P47).
   */
  static addNewView(): void {
    const file = editor.file
    const opening = file && NotebookPageCells.drawnPageIn(file.contents ?? "", file.path)
    if (!file || opening === undefined) return
    Palette.closeMenus()
    const title = appTexts.text("partStepAdd", { part: appTexts.text("paletteNewView") })
    const whole = { start: opening, end: opening }
    PartEdits.add([NEW_VIEWS[languageOf(file)] ?? NEW_VIEWS.en!], title, { file, opening, where: "before", whole })
  }

  /**
   * Add `definition` beside what's selected, else at the end of the drawing.
   * - Never one example inside another:  an example selected, a new one goes after it (epic `notebook` P5).
   */
  static add(definition: ComponentDefinition): void {
    Palette.closeMenus()
    const place = PartEdits.placeForNew()
    Inspector.readyWordsNext()
    const snippet = snippetFor(definition, place?.file)
    const isExampleIn = (code: string) => EXAMPLE_START.test(code)
    const into = place?.where === "inside" && place.file.contents?.slice(place.opening)
    const at = into && isExampleIn(into) && isExampleIn(snippet) ? { ...place, where: "after" as const } : place
    PartEdits.add([snippet], stepTitle(definition), at)
  }
}

/** `ComponentDefinitions`, once it's loaded:  a row only shows after that, so a drop never waits for it. */
let definitions: typeof import("spell/ui/components/ComponentDefinitions").ComponentDefinitions | undefined

/** Its loading, once it's asked for. */
let loading: Promise<void> | undefined

/** Does it open when the `+` is next drawn?  `Palette.openOnArrival()`. */
let opensOnArrival = false

/** Its menus, the popup and the pinned bar's:  `Palette.closeMenus()` closes them, forgetting those gone. */
const menus = new Set<HTMLElement & { visible?: boolean }>()

/** A `ref` for one of its popups:  closed by `Palette.closeMenus()`, and by a drag starting from it. */
function closesWithPalette(popup: HTMLElement & { visible?: boolean }): void {
  menus.add(popup)
  PartEdits.onPaletteDrag = () => Palette.closeMenus()
}

/**
 * What `definition` adds to `file`, in its language.
 * - In a page that draws its body:  Spell UI's tags by their bare names, as a notebook writes them (`bareNames()`).
 */
function snippetFor(definition: ComponentDefinition, file: SP.AnySpellFile | undefined): string {
  const snippet =
    definitions?.snippetIn(definition, languageOf(file)) ??
    definition.snippet ??
    `<${definition.tag}></${definition.tag}>`
  return file && NotebookPageCells.holdsDrawnPage(file) ? bareNames(snippet, languageOf(file)) : snippet
}

/**
 * `code` with each Spell UI tag written by its bare name in `language`, as a notebook writes them:
 * `<ui-button>` => `<button>`, `<es-boton>` => `<boton>`.
 * - `<ui-example>` is then `<example>`:  the page's own example, drawn with its code editable in place.
 * - A tag whose bare name the language doesn't know is left as it is.
 */
function bareNames(code: string, language: string): string {
  return code.replace(TAG_WITH_PREFIX, (tag, slash: string, word: string) =>
    SP.ComponentPacks.tagFor(word, language) ? `<${slash}${word}` : tag
  )
}

/** What a page is built of, its examples and sections:  offered under This page, as well as under their topics. */
const PAGE_PART_TAGS = ["ui-example", "ui-section"]

/** An example's tag, as a page writes it:  `<example`, `<ejemplo` (`bareNames()`). */
const EXAMPLE_START = /^<(example|ejemplo)\b/

/** A tag's start, with its prefix:  `<ui-button`, `</es-boton`. */
const TAG_WITH_PREFIX = /<(\/?)[a-z]+-([a-z][\w-]*)/g

/** A new view of a page's own, in each language a page is written in:  `Palette.addNewView()`. */
const NEW_VIEWS: Record<string, string> = {
  en: 'a "new view" is a view\n\tto draw it: <text>A new view</text>',
  es: 'una "nueva vista" es una vista\n\tpara dibujarla: <texto>Una vista nueva</texto>'
}

/** The preference that remembers whether it's kept open. */
const PINNED_PREF = "palettePinned"

const [isPinned, setPinned] = createSignal<boolean>(editorPrefs.get(PINNED_PREF) === true)
const [offered, setOffered] = createSignal<readonly PaletteGroup[]>([])

/** One group of what's offered:  its topic or title, and its parts (`ComponentDefinitions.paletteGroups()`). */
type PaletteGroup = import("spell/ui/components/ComponentDefinitions").PaletteGroup

/** One of the app's own views, as the palette offers it. */
type OwnView = {
  /** Its name, as a person reads it, e.g. `Stock pile`. */
  name: string
  /** What adding it writes, before what it must be told:  `{draw a new card}`. */
  snippet: string
  /** Its type's compiled name, then those it inherits:  `["Card", "TwoSidedView", ...]`. */
  classNames: readonly string[]
}

/** Types an app draws on its page, the built-ins every view of an app's own extends. */
const DRAWN_TYPES = new Set(["View", "TwoSidedView", "ViewableList"])

/** Types that start a page of their own:  never drawn inside one. */
const PAGE_TYPES = new Set(["App", "Page"])

/**
 * The app's own views in `tree`, by name:  each of its project's types that extends a view, but its app or page.
 * - The project is the tree's last child (`LSP.ScopeExplorer`).
 */
function ownViewsIn(tree: ScopeNode | undefined): OwnView[] {
  const app = tree?.children.filter((child) => child.kind === "project").at(-1)
  if (!tree || !app) return []
  const byPath = new Map<string, ScopeNode>()
  const visit = (node: ScopeNode) => {
    byPath.set(node.path, node)
    node.children.forEach(visit)
  }
  visit(tree)
  const bases = (node: ScopeNode) => {
    const names: string[] = []
    // a type can name itself, or one that names it back:  each once
    const seen = new Set<ScopeNode>([node])
    for (let at = byPath.get(node.super ?? ""); at && !seen.has(at); at = byPath.get(at.super ?? "")) {
      seen.add(at)
      names.push(at.name)
    }
    return names
  }
  return app.children
    .flatMap((file) => file.children)
    .filter((node) => node.kind === "type")
    .filter(
      (node) => bases(node).some((name) => DRAWN_TYPES.has(name)) && !bases(node).some((name) => PAGE_TYPES.has(name))
    )
    .map((node) => ({
      name: upperFirst(wordsOf(node.name)),
      snippet: `{draw a new ${wordsOf(node.name)}}`,
      classNames: [node.name, ...bases(node)]
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * `snippet` telling the new thing what it must be told to draw (`Inspector.startingValuesOf()`):
 * `{draw a new card}` => `{draw a new card whose rank is ace and suit is clubs}`.
 */
function withStartingValues(snippet: string, values: readonly { words: string; value: string }[]): string {
  if (!values.length) return snippet
  const said = values.map(({ words, value }) => `${words} is ${value}`)
  const whose = said.length > 1 ? `${said.slice(0, -1).join(", ")} and ${said.at(-1)}` : said[0]!
  return snippet.replace(/\}$/, ` whose ${whose}}`)
}

/** A type's name as spell writes it:  `StockPile` => `stock pile`. */
function wordsOf(name: string): string {
  return kebabCase(name).replace(/^-/, "").replaceAll("-", " ")
}

/** The app's own views to offer in `file`:  none outside English yet. */
function ownViewsFor(file: SP.AnySpellFile | undefined): readonly OwnView[] {
  return languageOf(file) === "en" ? Palette.ownViews : []
}

/** The language `file` is written in. */
function languageOf(file: SP.AnySpellFile | undefined): string {
  return file instanceof SP.SpellFile ? file.language.lang : "en"
}

/**
 * `group`'s name in the editor's language:  its own title, else its topic's word from Spell UI's dictionary
 * (`forms` => `formularios` on a Spanish page).
 * - Reactive:  redrawn when the page language's texts arrive (`appTexts.lang`).
 */
function groupName(group: PaletteGroup): string {
  return definitions?.groupNameIn(group, appTexts.lang) ?? group.title ?? group.topic ?? ""
}

/** A step's title for adding `definition`. */
function stepTitle(definition: ComponentDefinition): string {
  return appTexts.text("partStepAdd", { part: definition.name })
}

/** The top bar's `+`:  opens the palette, a menu with its search;  kept open too, beside the pinned bar. */
export function AddPartButton(): JSX.Element {
  let popup: (HTMLElement & { visible?: boolean }) | undefined
  onSettled(() => {
    if (Palette.takeOpenOnArrival() && popup) popup.visible = true
  })
  return (
    <>
      <ui-icon
        id={ADD_BUTTON_ID}
        name="plus"
        link=""
        class={["IconAction", "AddPartButton"]}
        label={appTexts.text("addPart")}
        title={appTexts.text("addPart")}
        onPointerEnter={() => Palette.load()}
        onClick={() => Palette.load()}
      />
      <ui-popup
        for={ADD_BUTTON_ID}
        open-on="click"
        position="bottom right"
        class="PalettePopup"
        aria-label={appTexts.text("addPart")}
        ref={(element: HTMLElement) => {
          popup = element
          closesWithPalette(element)
        }}
      >
        <PaletteMenu />
      </ui-popup>
    </>
  )
}

/** The `+`'s id, which its popup points at. */
const ADD_BUTTON_ID = "AddPartButton"

/**
 * The palette kept open:  the top bar's second row, edge to edge, of its topics' names (epic `editor` T80).
 * - Each name opens a menu of what's filed under it, as the popup lists them:  a click adds one, a drag places it.
 * - This app (This page) first, then every topic, as in the popup;  the row scrolls with its ‹ › when they don't fit.
 * - The ✕ at its end stops keeping it open.
 * - No search of its own:  the top bar's `+` opens the popup, which has one.
 */
export function PaletteStrip(): JSX.Element {
  onSettled(() => Palette.load())
  const thisGroup = () => appTexts.text(Palette.isPageShown ? "thisPage" : "thisApp")
  return (
    <div class="PaletteStrip">
      <ui-toolbar appearance="text" class="PaletteStripGroups" aria-label={appTexts.text("addPart")}>
        <Show when={ownViewsFor(editor.file).length || Palette.isPageShown}>
          <PaletteGroupMenu id={`${GROUP_MENU_ID}this`} name={thisGroup()}>
            <ThisGroupRows words={() => ""} />
          </PaletteGroupMenu>
        </Show>
        <For each={offered()}>
          {(group) => (
            <PaletteGroupMenu
              id={`${GROUP_MENU_ID}${kebabCase(group.title ?? group.topic ?? "")}`}
              name={upperFirst(groupName(group))}
            >
              <For each={group.parts}>{(definition) => <PaletteRow definition={definition} />}</For>
            </PaletteGroupMenu>
          )}
        </For>
      </ui-toolbar>
      <ui-icon
        name="close"
        link=""
        class={["IconAction", "PaletteClose"]}
        label={appTexts.text("paletteUnpin")}
        title={appTexts.text("paletteUnpin")}
        onClick={() => Palette.togglePinned()}
      />
    </div>
  )
}

/** The start of each pinned bar topic's id, which its menu points at. */
const GROUP_MENU_ID = "PaletteGroup-"

/**
 * ### `<PaletteGroupMenu>`
 * One topic of the pinned bar:  its name, a quiet button;  a click opens its rows under it.
 * - Choosing a row closes it, as a drag from it does (`Palette.closeMenus()`).
 */
function PaletteGroupMenu(props: { id: string; name: string; children: JSX.Element }): JSX.Element {
  return (
    <>
      <ui-item id={props.id} appearance="link" class="PaletteGroupName" aria-haspopup="menu" aria-label={props.name}>
        {props.name}
      </ui-item>
      <ui-popup
        for={props.id}
        open-on="click"
        position="bottom left"
        class={["BarMenuPopup", "PaletteGroupPopup"]}
        aria-label={props.name}
        ref={closesWithPalette}
      >
        <ui-tree class="PaletteTree" label={props.name} ref={treeChoosesRows}>
          {props.children}
        </ui-tree>
      </ui-popup>
    </>
  )
}

/** Keeps the palette open, or stops. */
function PinIcon(): JSX.Element {
  return (
    <ui-icon
      name="thumbtack"
      link=""
      class={["IconAction", "PalettePin", { pinned: Palette.isPinned }]}
      label={appTexts.text(Palette.isPinned ? "paletteUnpin" : "palettePin")}
      title={appTexts.text(Palette.isPinned ? "paletteUnpin" : "palettePin")}
      onClick={() => Palette.togglePinned()}
    />
  )
}

/**
 * The palette as a menu, in columns:
 * what to do and its search, then This app, the app's own views, then every part, by topic.
 * - Every group shows everything in it, as the palette's table orders it (`paletteGroups.json`;  epic `editor` I174, T81).
 * - A search looks through all of them, by name, other names and description.
 */
function PaletteMenu(): JSX.Element {
  const [filter, setFilter] = createSignal("")
  const words = () => filter().trim().toLowerCase()
  const shown = (): PaletteGroup[] => {
    if (!words()) return [...offered()]
    const matches = (part: ComponentDefinition) =>
      `${part.name} ${part.aka.join(" ")} ${part.description ?? ""}`.toLowerCase().includes(words())
    return offered()
      .map((group) => ({ ...group, parts: group.parts.filter(matches) }))
      .filter(({ parts }) => parts.length)
  }
  const own = () => ownViewsFor(editor.file).filter((view) => view.name.toLowerCase().includes(words()))
  /** Its first group's name:  This page on a page that draws its body, else This app. */
  const thisGroup = () => (Palette.isPageShown ? "thisPage" : "thisApp")
  return (
    <div class="PaletteBody">
      <div class="PaletteHead">
        <span class="PaletteHint">{appTexts.text("paletteHint")}</span>
        <ui-input
          class="PaletteSearch"
          size="small"
          aria-label={appTexts.text("paletteSearch")}
          placeholder={appTexts.text("paletteSearch")}
          ref={on<{ value: string }>("ui-typed", (event) => setFilter(event.detail.value))}
        />
        <PinIcon />
      </div>
      <div class="PaletteGroups">
        <div class="PaletteColumns">
          <Show when={own().length || Palette.isPageShown}>
            <section class="PaletteGroup ThisApp">
              <h4>{appTexts.text(thisGroup())}</h4>
              <ui-tree class="PaletteTree" label={appTexts.text(thisGroup())} ref={treeChoosesRows}>
                <ThisGroupRows words={words} />
              </ui-tree>
            </section>
          </Show>
          <For each={shown()}>
            {(group) => (
              <section class="PaletteGroup">
                <h4>{upperFirst(groupName(group))}</h4>
                <ui-tree class="PaletteTree" label={groupName(group)} ref={treeChoosesRows}>
                  <For each={group.parts}>{(definition) => <PaletteRow definition={definition} />}</For>
                </ui-tree>
              </section>
            )}
          </For>
        </div>
      </div>
    </div>
  )
}

/**
 * This app's rows, or This page's, that match `words`:  the popup's first group, and the pinned bar's.
 * - On a page that draws its body:  a new view of its own, then its examples and sections (`PAGE_PART_TAGS`),
 *   which still show under their own topics too (epic `notebook` P9).
 * - Then the app's own views.
 */
function ThisGroupRows(props: { words: () => string }): JSX.Element {
  const own = () => ownViewsFor(editor.file).filter((view) => view.name.toLowerCase().includes(props.words()))
  const pageParts = () => {
    const parts = offered().flatMap((group) => group.parts)
    return PAGE_PART_TAGS.flatMap((tag) => parts.filter((part) => part.tag === tag)).filter((part) =>
      `${part.name} ${part.aka.join(" ")}`.toLowerCase().includes(props.words())
    )
  }
  return (
    <>
      <Show when={Palette.isPageShown}>
        <ui-tree-item
          icon={NEW_VIEW_ICON}
          label={appTexts.text("paletteNewView")}
          title={appTexts.text("paletteNewViewTip")}
          ref={(row: Element) => chooseRow(() => Palette.addNewView())(row)}
        />
        <For each={pageParts()}>{(definition) => <PaletteRow definition={definition} />}</For>
      </Show>
      <For each={own()}>
        {(view) => (
          <ui-tree-item
            icon={OWN_VIEW_ICON}
            label={view.name}
            ref={(row: Element) => {
              chooseRow(() => Palette.addOwn(view))(row)
              startsOwnDrag(row, view)
            }}
          />
        )}
      </For>
    </>
  )
}

/** A press on `element`, dragged:  places `definition`. */
function startsDrag(element: Element, definition: ComponentDefinition): void {
  element.addEventListener("pointerdown", (event) =>
    PartEdits.startPaletteDrag(
      event as PointerEvent,
      definition.name,
      (file) => {
        Inspector.readyWordsNext()
        return [snippetFor(definition, file)]
      },
      stepTitle(definition)
    )
  )
}

/** A press on `element`, dragged:  places `view`, one of the app's own. */
function startsOwnDrag(element: Element, view: OwnView): void {
  element.addEventListener("pointerdown", (event) =>
    PartEdits.startPaletteDrag(
      event as PointerEvent,
      view.name,
      () => {
        Inspector.readyWordsNext()
        return [view.snippet]
      },
      appTexts.text("partStepAdd", { part: view.name })
    )
  )
}

/** The icon of the app's own views, in the palette. */
const OWN_VIEW_ICON = "cube"

/** The icon of a page's new view of its own, in the palette. */
const NEW_VIEW_ICON = "plus square outline"

/** One thing that can be added:  a click adds it, a drag places it. */
function PaletteRow(props: { definition: ComponentDefinition }): JSX.Element {
  return (
    <ui-tree-item
      icon={props.definition.icon}
      label={props.definition.name}
      title={props.definition.description}
      ref={(row: Element) => {
        chooseRow(() => Palette.add(props.definition))(row)
        startsDrag(row, props.definition)
      }}
    />
  )
}

/**
 * Edit › Cut, Copy, Paste, Duplicate and Delete, and the same in a right click's menu.
 * - In the code, Cut, Copy and Paste are the code editor's own:  Duplicate and Delete are only for what's selected.
 */
export function PartMenuItems(props: { whyNot?: (action: PartAction) => string | undefined }): JSX.Element {
  const hasSelection = () => Inspector.allSelected.length > 0
  const inCode = () => undoWay() === "code"
  const part = (action: PartAction) => () => void PartEdits.run(action)
  const why = (action: PartAction) => props.whyNot?.(action)
  return (
    <>
      <Action
        menu
        icon="cut"
        title={appTexts.text("menuCut")}
        shortcut={EDITOR_HOTKEYS.cutParts.shortcut}
        disabled={(!inCode() && !hasSelection()) || !!why("cut")}
        tip={why("cut")}
        onClick={() => cutCopyOrPaste("cut")}
      />
      <Action
        menu
        icon="copy outline"
        title={appTexts.text("menuCopy")}
        shortcut={EDITOR_HOTKEYS.copyParts.shortcut}
        disabled={(!inCode() && !hasSelection()) || !!why("copy")}
        tip={why("copy")}
        onClick={() => cutCopyOrPaste("copy")}
      />
      <Action
        menu
        icon="paste"
        title={appTexts.text("menuPaste")}
        shortcut={EDITOR_HOTKEYS.pasteParts.shortcut}
        disabled={!!why("paste")}
        tip={why("paste")}
        onClick={() => cutCopyOrPaste("paste")}
      />
      <Action
        menu
        icon="clone outline"
        title={appTexts.text("menuDuplicate")}
        shortcut={EDITOR_HOTKEYS.duplicateParts.shortcut}
        disabled={inCode() || !hasSelection() || !!why("duplicate")}
        tip={why("duplicate")}
        onClick={part("duplicate")}
      />
      <Action
        menu
        icon="trash alternate outline"
        title={appTexts.text("menuDelete")}
        shortcut={EDITOR_HOTKEYS.deleteParts.shortcut}
        disabled={inCode() || !hasSelection() || !!why("remove")}
        tip={why("remove")}
        onClick={part("remove")}
      />
    </>
  )
}

/**
 * The ONE right-click menu on the app's parts, in the app and the Views tree:
 * `PartMenuItems`, the same as the Edit menu's, a line, then Show in Code and Inspect, a line, then Change This.
 * - The program's own right-click menu there comes first, if it has one (`<context-menu>`, `context-menu=`),
 *   drawn as Run draws it (`ActionMenus.itemsFor()`), then a dashed line, then ours (epic `editor` I76, Owen's pick).
 * - A `<ui-popup>` at the click, holding a `<ui-menu>`:  it stays inside the window, with arrow keys, Enter and Esc.
 * - What can't be done is greyed, and its tooltip says why (`PartEdits.whyNot()`).
 * - It shows at once, with no fade in (`Palette.css`):  a quick second right click lands on it, not the part.
 *   - A right click on it is ours too:  the browser's own menu never shows over it (Owen, 2026-11-12).
 * - `PartEdits.openMenu()` opens it:  what was clicked is selected once the menu is on the screen.
 */
export function PartMenu(): JSX.Element {
  const [at, setAt] = createSignal<{ x: number; y: number }>()
  const [programMenu, setProgramMenu] = createSignal<readonly MenuItem[]>()
  onSettled(() => {
    PartEdits.onMenu = (x, y, items) => {
      setProgramMenu(items?.length ? items : undefined)
      setAt({ x, y })
    }
  })
  // the program's items, drawn afresh each time the menu opens somewhere new, then the dashed line
  const programItems = () => {
    at()
    const items = programMenu()
    if (!items) return null
    return (
      <>
        {ActionMenus.itemsFor(items)}
        <ui-action kind="divider" class={PROGRAM_MENU_END} />
      </>
    )
  }
  const isAnItem = (event: Event) =>
    event.composedPath().some((target) => {
      return (
        target instanceof Element &&
        target.localName === "ui-action" &&
        !target.hasAttribute("disabled") &&
        !target.hasAttribute("kind")
      )
    })
  // Decided as the click starts, before the row runs:  a row may grey itself once it has run (Delete, Cut)
  let isClosing = false
  return (
    <Show when={at()}>
      {(where) => (
        <ui-popup
          at={where()}
          open-on="manual"
          visible=""
          class={["BarMenuPopup", PART_MENU]}
          aria-label={appTexts.text("menuEdit")}
          ref={on("ui-closing", () => setAt(undefined))}
          onContextMenu={(event: MouseEvent) => event.preventDefault()}
        >
          <div
            class="BarMenuPanel"
            ref={(panel) =>
              panel.addEventListener(
                "click",
                (event) => {
                  // the part right-clicked, if it's not selected yet:  the item acts on it
                  if (PartEdits.selectMenuPart()) flush()
                  isClosing = isAnItem(event)
                },
                { capture: true }
              )
            }
            onClick={() => isClosing && setAt(undefined)}
          >
            <ui-menu
              direction="vertical"
              size="small"
              interactive=""
              icon-column=""
              class="BarMenuItems"
              aria-label={appTexts.text("menuEdit")}
            >
              {programItems()}
              <PartMenuItems whyNot={(action) => whyNotAt(where(), action)} />
              <ui-action kind="divider" />
              <Action
                menu
                icon="code"
                title={appTexts.text("menuShowInCode")}
                disabled={!!whyNoCodeAt(where())}
                tip={whyNoCodeAt(where())}
                onClick={() => void Inspector.showWritten(Inspector.allSelected.at(-1)!.element!)}
              />
              <Action
                menu
                icon="crosshairs"
                title={appTexts.text("menuInspect")}
                onClick={() => Inspector.showSelected()}
              />
              <Show when={ChangeThis.isAvailable}>
                <ui-action kind="divider" />
                <Action
                  menu
                  icon="magic"
                  title={appTexts.text("menuChangeThis")}
                  shortcut={EDITOR_HOTKEYS.changeThis.shortcut}
                  disabled={!!whyNoCodeAt(where())}
                  tip={whyNoCodeAt(where())}
                  onClick={() => ChangeThis.open(where())}
                />
              </Show>
            </ui-menu>
          </div>
        </ui-popup>
      )}
    </Show>
  )
}

/** The class of the part menu's popup. */
const PART_MENU = "PartMenu"

/** The class of the dashed line, edge to edge, between the program's own right-click menu and ours (`MenuBar.css`). */
const PROGRAM_MENU_END = "ProgramMenuEnd"

/**
 * Why `action` can't be done, for the menu opened at `_at`:  read again each time it opens somewhere new,
 * as the part it's for may not be selected yet (`PartEdits.openMenu()`).
 */
function whyNotAt(_at: { x: number; y: number }, action: PartAction): string | undefined {
  return PartEdits.whyNot(action)
}

/** Why what the menu opened at `_at` is for can't be shown in the code:  `whyNotAt()`'s reason. */
function whyNoCodeAt(_at: { x: number; y: number }): string | undefined {
  return PartEdits.whyNoCode
}
