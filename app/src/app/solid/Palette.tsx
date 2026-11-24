import { For, Show, createSignal, flush, onSettled } from "solid-js"
import type { JSX } from "@solidjs/web"

import { kebabCase, upperFirst } from "spell/util"
import type { ComponentDefinition } from "spell/ui/components/ComponentDefinitions"
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
import { Inspector, type PartRow } from "./Inspector"
import { on } from "./on"
import { LazyPiece } from "./LazyPiece"
import { PartEdits, type MenuOpening, type PartAction } from "./PartEdits"

import "./Palette.css"

/**
 * What can be added to the app, and whether it's kept open.
 * - The top bar's popup:  a menu in columns by topic.
 * - In Edit, the add bar down the editor's left edge:  a button per group, each opening its parts beside it, your
 *   starred parts first (epic `editor` T151, T152;  a second row under the top bar, kept open by its pin, before).
 * - It reads the components' own descriptions (`ComponentDefinitions`), loaded the first time it opens:
 *   every vocabulary, which the page never needs otherwise;  and files them in its groups by its own rule and table
 *   (`PaletteGroups`, arranged on the palette groups page, `/palette`).
 * - What's offered is what has a `snippet`:  a new component is offered by saying what it adds.
 * - First, App views:  the app's own views, each added as `{draw a new card}` (`Palette.ownViews`, epic `editor` P19).
 *   - On a page that draws its body, a notebook among them, it's This page, with a row of its own first:
 *     a new view, in plain Spell above the page (`addNewView()`, epic `notebook` P5;  `language` P47).
 *   - What else a page adds (an example, a section, text) are the components' own rows.
 * - In a page that draws its body, Spell UI's tags are written by their bare names, as a notebook writes them:
 *   `<example>`, `<section>`.
 *   `<example>` is then the page's own example, its code editable in place.
 * - Its menu and its add bar are in `PaletteView.tsx`, loaded as it first opens (`Palette.views`, a `LazyPiece`):
 *   here are its state, Add a View's button and the right click's menu, in the editor's first load.
 */
export class Palette {
  /** The palette's menu and strip, loaded the first time it opens:  see `LazyPiece`. */
  static views = new LazyPiece(() => import("./PaletteView"))

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
   * Is the add bar's first showing on this page now?  Says so once (epic `editor` I255, T151):
   * only its first showing slides in, never a later one (Run and back, another page).
   */
  static takeRailArrival(): boolean {
    const arrives = !hasRailShown
    hasRailShown = true
    return arrives
  }

  /**
   * Close its menus, the popup and the add bar's flyouts:
   * what's added, or dragged, lands on a page you can see (epic `editor` I176).
   */
  static closeMenus(): void {
    for (const menu of menus) {
      if (menu.isConnected) menu.visible = false
      else menus.delete(menu)
    }
  }

  /**
   * The parts you've starred, in the order you starred them (reactive):  first in the add bar (epic `editor` T152).
   * - Only those Spell UI still offers, once what's offered is loaded:  a tag gone from the palette drops out.
   */
  static get favorites(): readonly ComponentDefinition[] {
    const parts = new Map(offered().flatMap((group) => group.parts.map((part) => [part.tag, part] as const)))
    return favoriteTags().flatMap((tag) => parts.get(tag) ?? [])
  }

  /** Is `definition` starred (reactive)? */
  static isFavorite(definition: ComponentDefinition): boolean {
    return favoriteTags().includes(definition.tag)
  }

  /** Star `definition`, or take its star away;  remembered for you, across reloads (`editorPrefs`). */
  static toggleFavorite(definition: ComponentDefinition): void {
    const tags = favoriteTags()
    const starred = tags.includes(definition.tag)
      ? tags.filter((tag) => tag !== definition.tag)
      : [...tags, definition.tag]
    setFavoriteTags(starred)
    editorPrefs.set(FAVORITES_PREF, starred)
  }

  /** Load what it offers, and its views, the first time. */
  static load(): void {
    Palette.views.loadSoon()
    loading ??= Promise.all([
      import("spell/ui/components/ComponentDefinitions"),
      import("spell/app/app/ui/PaletteGroups")
    ])
      .then(([{ ComponentDefinitions }, { PaletteGroups }]) => {
        definitions = ComponentDefinitions
        groupRule = PaletteGroups
        setOffered(PaletteGroups.inGroups())
      })
      .catch((error: unknown) => console.error("Palette.load():  couldn't load what it offers", error))
  }

  /**
   * The app's own views, by name (reactive):  App views, first in the palette.
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
   * Add a new view of the open page's own, in plain Spell just above its head:
   * `a "new view" is a view:`, drawn later by its name (epic `language` P47).
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

/** The palette's rule for its groups, `PaletteGroups`, once it's loaded with `definitions`. */
let groupRule: typeof import("spell/app/app/ui/PaletteGroups").PaletteGroups | undefined

/** Its loading, once it's asked for. */
let loading: Promise<void> | undefined

/** Does it open when the `+` is next drawn?  `Palette.openOnArrival()`. */
let opensOnArrival = false

/** Has the add bar (`<PaletteRail>`) shown on this page yet?  `Palette.takeRailArrival()`. */
let hasRailShown = false

/** Its menus, the popup and the add bar's flyouts:  `Palette.closeMenus()` closes them, forgetting those gone. */
const menus = new Set<HTMLElement & { visible?: boolean }>()

/** A `ref` for one of its popups:  closed by `Palette.closeMenus()`, and by a drag starting from it. */
export function closesWithPalette(popup: HTMLElement & { visible?: boolean }): void {
  menus.add(popup)
  PartEdits.onPaletteDrag = () => Palette.closeMenus()
}

/**
 * What `definition` adds to `file`, in its language.
 * - In a page that draws its body:  Spell UI's tags by their bare names, as a notebook writes them (`bareNames()`).
 */
export function snippetFor(definition: ComponentDefinition, file: SP.AnySpellFile | undefined): string {
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

/** The preference that remembers the parts you've starred, by tag (`Palette.favorites`, epic `editor` T152). */
const FAVORITES_PREF = "paletteFavorites"
editorPrefs.declare(FAVORITES_PREF, { type: "object", default: [] })

const [favoriteTags, setFavoriteTags] = createSignal<readonly string[]>(starredIn(editorPrefs.get(FAVORITES_PREF)))
export const [offered, setOffered] = createSignal<readonly PaletteGroup[]>([])

/** The starred tags a saved preference holds:  none, for anything but a list of them. */
function starredIn(saved: unknown): readonly string[] {
  return Array.isArray(saved) ? saved.filter((tag): tag is string => typeof tag === "string") : []
}

/** One group of what's offered:  its topic or title, and its parts (`PaletteGroups.inGroups()`). */
export type PaletteGroup = import("spell/app/app/ui/PaletteGroups").PaletteGroup

/** One of the app's own views, as the palette offers it. */
export type OwnView = {
  /** Its name, as a person reads it, e.g. `Stock pile`. */
  name: string
  /** What adding it writes, before what it must be told:  `{draw a new card}`. */
  snippet: string
  /** Its type's compiled name, then those it inherits:  `["Card", "TwoSidedView", ...]`. */
  classNames: readonly string[]
  /** The file it's written in, by its name in the project:  `Card.spell`. */
  file: string
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
    .flatMap((file) => file.children.map((node) => ({ file, node })))
    .filter(({ node }) => node.kind === "type")
    .filter(
      ({ node }) =>
        bases(node).some((name) => DRAWN_TYPES.has(name)) && !bases(node).some((name) => PAGE_TYPES.has(name))
    )
    .map(({ file, node }) => ({
      name: upperFirst(wordsOf(node.name)),
      snippet: `{draw a new ${wordsOf(node.name)}}`,
      classNames: [node.name, ...bases(node)],
      file: file.name
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
export function ownViewsFor(file: SP.AnySpellFile | undefined): readonly OwnView[] {
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
export function groupName(group: PaletteGroup): string {
  return groupRule?.groupNameIn(group, appTexts.lang) ?? group.title ?? group.topic ?? ""
}

/** A step's title for adding `definition`. */
export function stepTitle(definition: ComponentDefinition): string {
  return appTexts.text("partStepAdd", { part: definition.name })
}

////////////////
// ## Search:  the popup's, and the add bar's
////////////////

/** Does `part` hold `words` (lowercase) in its name, its other names or its description?  Every part, for none. */
export function partMatches(part: ComponentDefinition, words: string): boolean {
  return `${part.name} ${part.aka.join(" ")} ${part.description ?? ""}`.toLowerCase().includes(words)
}

/** A row of the add bar's menus:  a part, and the parts of its family shown inside it (`partBranches()`). */
export type PartBranch = {
  /** the part */
  definition: ComponentDefinition
  /** its family's parts, shown inside it:  `Cards` inside `Card` */
  inside: ComponentDefinition[]
}

/**
 * `parts` as the add bar's menus show them, each family's own parts inside its main one (epic `editor` T162):
 * - a tag of a family's folder inside the family's main tag:  `Cards` inside `Card`, `Statistics` inside `Statistic`
 * - a generic content part its owner names (`ownsParts`) inside that owner:  `Value` inside `Statistic`
 * - only inside a part of the same list, one level deep, each part once:  inside the first that takes it
 * - `words` (lowercase):  only what matches, a match inside shown under its family's main part, matching or not
 */
export function partBranches(parts: readonly ComponentDefinition[], words: string): PartBranch[] {
  const outerOf = new Map<ComponentDefinition, ComponentDefinition>()
  for (const part of parts) {
    const outer = parts.find((other) => holds(other, part))
    if (outer) outerOf.set(part, outer)
  }
  const branches: PartBranch[] = []
  for (const part of parts) {
    if (outerOf.has(part)) continue
    const inside = parts.filter((other) => outerOf.get(other) === part && (!words || partMatches(other, words)))
    if (!words || partMatches(part, words) || inside.length) branches.push({ definition: part, inside })
  }
  return branches
}

/** Is `part` one of `outer`'s family, shown inside it:  `partBranches()`'s rule. */
function holds(outer: ComponentDefinition, part: ComponentDefinition): boolean {
  if (outer === part || outer.tag !== outer.folder) return false
  if (part.folder === outer.folder) return true
  return part.folder === GENERIC_PARTS && !!outer.ownsParts?.includes(part.tag.replace(/^ui-/, ""))
}

/** The folder of Spell UI's generic content parts (`<ui-value>`, `<ui-header>` ...), owned by what they're in. */
const GENERIC_PARTS = "ui-parts"

/** Every topic with a part matching `words`, cut to those parts, in the palette's order. */
export function groupsMatching(words: string): PaletteGroup[] {
  if (!words) return [...offered()]
  return offered()
    .map((group) => ({ ...group, parts: group.parts.filter((part) => partMatches(part, words)) }))
    .filter(({ parts }) => parts.length)
}

/** The app's own views matching `words`. */
export function ownViewsMatching(words: string): readonly OwnView[] {
  return ownViewsFor(editor.file).filter((view) => view.name.toLowerCase().includes(words))
}

/** A page's examples and sections (`PAGE_PART_TAGS`) matching `words`, by name and other names:  This page's. */
export function pagePartsMatching(words: string): ComponentDefinition[] {
  const parts = offered().flatMap((group) => group.parts)
  return PAGE_PART_TAGS.flatMap((tag) => parts.filter((part) => part.tag === tag)).filter((part) =>
    `${part.name} ${part.aka.join(" ")}`.toLowerCase().includes(words)
  )
}

/** Does This page's "new view" row match `words`? */
export function newViewMatches(words: string): boolean {
  return appTexts.text("paletteNewView").toLowerCase().includes(words)
}

/** Has App views (This page) a row matching `words`?  Shown at all, for none. */
export function thisGroupMatches(words: string): boolean {
  const onPage = Palette.isPageShown && (newViewMatches(words) || pagePartsMatching(words).length > 0)
  return onPage || ownViewsMatching(words).length > 0
}

/**
 * The top bar's "+ Add a View":  opens the palette, a menu with its search;  beside the add bar down the left edge.
 * - Its plus, then its words, in the round pill its neighbours have, as wide as its words (epic `editor` I250, C5:
 *   "Change plus to `+ Add a View`"):  no tooltip, the words say it.
 * - An item of the Run | Edit group, right after Inspect app (`<ModeButtons add>`;  epic `editor` T83:
 *   "Move `add` to the immediate right of the inspector crosshair"), so it stands as its neighbours do.
 * - It opens a menu, never becomes the mode chosen (its `aria-haspopup`).
 */
export function AddPartButton(): JSX.Element {
  let popup: (HTMLElement & { visible?: boolean }) | undefined
  // its menu is drawn once wanted:  its view loads then, not with the editor
  const [isWanted, setWanted] = createSignal(false)
  const want = () => {
    Palette.load()
    setWanted(true)
  }
  onSettled(() => {
    if (Palette.takeOpenOnArrival() && popup) {
      want()
      popup.visible = true
    }
  })
  return (
    <>
      <ui-item
        id={ADD_BUTTON_ID}
        icon="plus"
        appearance="circular"
        class="AddPartButton"
        aria-haspopup="menu"
        onPointerEnter={want}
        onFocusIn={want}
        onClick={want}
      >
        <span class="AddViewText">{appTexts.text("paletteAddView")}</span>
      </ui-item>
      <ui-popup
        for={ADD_BUTTON_ID}
        open-on="click"
        position="bottom center"
        class="PalettePopup"
        aria-label={appTexts.text("addPart")}
        ref={(element: HTMLElement) => {
          popup = element
          closesWithPalette(element)
        }}
      >
        <Show when={isWanted()}>
          <PaletteMenu />
        </Show>
      </ui-popup>
    </>
  )
}

/** The palette's menu, in Add a View's popup:  loaded on first use, see `PaletteView.tsx`. */
const PaletteMenu = Palette.views.view("PaletteMenu")

/** The add bar down the editor's left edge, in Edit:  loaded on first use, see `PaletteView.tsx` (epic `editor` T151). */
export const PaletteRail = Palette.views.view("PaletteRail")

/** Add a View's id, which its popup points at. */
const ADD_BUTTON_ID = "AddPartButton"

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
 * The ONE right-click menu on the app's parts, in the app and the Views tree (epic `editor` T160, Owen's order):
 * - Inspect first, under the mouse:  "Inspect Card", then Inspect Other Views (`<InspectRow>`)
 * - a line, then `PartMenuItems`, the same as the Edit menu's
 * - the program's own right-click menu there, if it has one (`<context-menu>`, `context-menu=`), between dashed lines,
 *   under its header, App Menu:  drawn as Run draws it (`ActionMenus.itemsFor()`;  epic `editor` I76)
 *   - Spell UI's dashed divider, `<ui-action kind="divider" appearance="dashed">`, edge to edge (`MenuBar.css`)
 * - a line, then Show in Code and Change This, together at the bottom
 * - Drawn as every right click's menu is, `<MenuPopup>`:  at once, inside the window, with arrow keys, Enter and Esc.
 * - What can't be done is greyed, and its tooltip says why (`PartEdits.whyNot()`).
 * - `PartEdits.openMenu()` opens it:  what was clicked is selected once the menu is on the screen.
 */
export function PartMenu(): JSX.Element {
  const [at, setAt] = createSignal<{ x: number; y: number }>()
  const [opening, setOpening] = createSignal<MenuOpening>()
  const programMenu = () => (opening()?.programMenu?.length ? opening()!.programMenu : undefined)
  onSettled(() => {
    PartEdits.onMenu = (next) => {
      setOpening(next)
      setAt({ x: next.x, y: next.y })
    }
  })
  // the program's items under their header, between dashed lines, drawn afresh each time the menu opens somewhere new
  const programItems = () => {
    at()
    const items = programMenu()
    if (!items) return null
    return (
      <>
        <ui-action kind="divider" appearance="dashed" />
        <ui-item kind="header" class={APP_MENU_HEADER}>
          {appTexts.text("menuAppMenu")}
        </ui-item>
        {ActionMenus.itemsFor(items)}
        <ui-action kind="divider" appearance="dashed" />
      </>
    )
  }
  return (
    <Show when={at()}>
      {(where) => (
        <MenuPopup
          at={where()}
          class={PART_MENU}
          label={appTexts.text("menuEdit")}
          onClose={() => {
            Inspector.ring(undefined)
            setAt(undefined)
          }}
          // the part right-clicked, if it's not selected yet:  the item acts on it
          onChoosing={() => PartEdits.selectMenuPart() && flush()}
        >
          <InspectRow part={opening()?.part} partsUnder={opening()?.partsUnder} />
          <ui-action kind="divider" />
          <PartMenuItems whyNot={(action) => whyNotAt(where(), action)} />
          {programItems()}
          <Show when={!programMenu()}>
            <ui-action kind="divider" />
          </Show>
          <Action
            menu
            icon="code"
            title={appTexts.text("menuShowInCode")}
            disabled={!!whyNoCodeAt(where())}
            tip={whyNoCodeAt(where())}
            onClick={() => void Inspector.showWritten(Inspector.allSelected.at(-1)!.element!)}
          />
          <Show when={ChangeThis.isAvailable}>
            <Action
              menu
              icon={ChangeThis.icon}
              title={appTexts.text("menuChangeThis")}
              shortcut={EDITOR_HOTKEYS.changeThis.shortcut}
              disabled={!!whyNoCodeAt(where())}
              tip={whyNoCodeAt(where())}
              onClick={() => ChangeThis.open(where())}
            />
          </Show>
        </MenuPopup>
      )}
    </Show>
  )
}

/****************
 * ### `<InspectRow>`
 * The part menu's Inspect rows (epic `editor` Q37, Owen's pick B + F):
 * - "Inspect Card", named by the type of the part the menu is for:
 *   a click selects that part, the top-most under the mouse, and opens the properties card.
 * - "Inspect Other Views", below it, with more than one part under the mouse:
 *   a plain submenu row whose side menu lists them, outermost first (`PartEdits.partsAt()`):
 *   a flat list, no indent and no tick column (epic `editor` T160).
 *   - Pointing at one rings it in the app, as Inspect app does on hover.
 *   - Choosing one selects it, as a click on it would (Shift or Command adds it), and opens the properties card.
 * - Holding Option while the menu is open shows only "Inspect Other Views", in the first row's place,
 *   as a Mac menu swaps a row while Option is down;  letting go swaps it back.
 * - Two rows, not one split row with an arrow at its end (P31's C2):
 *   Owen found the arrow didn't read as separate from the row.
 ****************/
function InspectRow(props: InspectRowProps): JSX.Element {
  const title = () => appTexts.text("menuInspect", { type: props.part ? Inspector.typeWordsOf(props.part) : "" }).trim()
  const hasChoice = () => (props.partsUnder?.length ?? 0) > 1
  const [isOptionDown, setOptionDown] = createSignal(false)
  // Listened to only while the menu is open:  this row lives as long as it does
  onSettled(() => {
    // every key down or up says whether Option is held:  its own, and any other pressed with it
    const onKey = (event: KeyboardEvent) => setOptionDown(event.altKey)
    const onBlur = () => setOptionDown(false)
    window.addEventListener("keydown", onKey, true)
    window.addEventListener("keyup", onKey, true)
    window.addEventListener("blur", onBlur)
    return () => {
      window.removeEventListener("keydown", onKey, true)
      window.removeEventListener("keyup", onKey, true)
      window.removeEventListener("blur", onBlur)
    }
  })
  return (
    <>
      <Show when={!(hasChoice() && isOptionDown())}>
        <Action menu icon="crosshairs" title={title()} onClick={() => Inspector.showSelected()} />
      </Show>
      <Show when={hasChoice()}>
        <ui-submenu
          icon="crosshairs"
          label={appTexts.text("menuInspectOtherViews")}
          flyout-label={appTexts.text("menuInspectParts")}
          class={INSPECT_ROW}
        >
          <For each={props.partsUnder}>
            {(row) => (
              <Action
                menu
                icon={Inspector.iconFor(row.element)}
                title={Inspector.labelFor(row.element)}
                onClick={(event: MouseEvent) => inspectPart(row.element, event)}
                onPointerEnter={() => Inspector.ring(row.element)}
                onPointerLeave={() => Inspector.ring(undefined)}
              />
            )}
          </For>
        </ui-submenu>
      </Show>
    </>
  )
}

/** Props for `<InspectRow>`. */
type InspectRowProps = {
  /** the part the menu is for:  its type names the row */
  part?: Element
  /** the parts under the mouse, outermost first (`PartEdits.partsAt()`):  Inspect Other Views, with more than one */
  partsUnder?: readonly PartRow[]
}

/** Select `part`, chosen in Inspect's submenu, as a click on it would (`keys` held add it), and show it. */
function inspectPart(part: Element, keys: MouseEvent): void {
  Inspector.ring(undefined)
  Inspector.clicked(part, Inspector.listAround(part), keys)
  Inspector.showSelected()
}

/****************
 * ### `<MenuPopup>`
 * A right click's menu at `at`:  the app's ONE look for one, the part menu's (`<PartMenu>`), and the code editor's
 * (CodeMirror's `CodeMirrorMenu`;  epic `codemirror` P5).
 * - A `<ui-popup>` at the click, holding a `<ui-menu>` of `children`:
 *   it stays inside the window, with arrow keys, Enter and Esc.
 * - It shows at once, with no fade in (`Palette.css`):  a quick second right click lands on it, not what's under it.
 *   - A right click on it is ours too:  the browser's own menu never shows over it (Owen, 2026-11-12).
 * - A row chosen closes it, decided as the click starts, before the row runs:
 *   a row may grey itself once it has run (Delete, Cut).
 ****************/
export function MenuPopup(props: MenuPopupProps): JSX.Element {
  // Decided as the click starts, before the row runs:  a row may grey itself once it has run (Delete, Cut)
  let isClosing = false
  return (
    <ui-popup
      at={props.at}
      open-on="manual"
      visible=""
      class={["BarMenuPopup", MENU_POPUP, props.class]}
      aria-label={props.label}
      ref={on("ui-closing", () => props.onClose())}
      onContextMenu={(event: MouseEvent) => event.preventDefault()}
    >
      <div
        class="BarMenuPanel"
        ref={(panel) =>
          panel.addEventListener(
            "click",
            (event) => {
              props.onChoosing?.()
              isClosing = isAnItem(event)
            },
            { capture: true }
          )
        }
        onClick={() => isClosing && props.onClose()}
      >
        <ui-menu
          direction="vertical"
          size="small"
          interactive=""
          icon-column=""
          class="BarMenuItems"
          aria-label={props.label}
        >
          {props.children}
        </ui-menu>
      </div>
    </ui-popup>
  )
}

/** Props for `<MenuPopup>`. */
export type MenuPopupProps = {
  /** where, on the page:  the click */
  at: { x: number; y: number }
  /** what it's called, for a screen reader */
  label: string
  /** its own class, beside the menu's */
  class?: string
  /** it's going:  Esc, a click away, or a row chosen */
  onClose: () => void
  /** a click on it is starting, before the row it's on runs */
  onChoosing?: () => void
  /** its rows:  `<Action menu>`s, `<ui-action kind="divider">`s */
  children: JSX.Element
}

/**
 * Is `event` on a row that does something:  not a divider, nor a greyed row?
 * - Not a submenu's row either (Inspect Other Views):  it only opens its side menu.
 */
function isAnItem(event: Event): boolean {
  return event.composedPath().some((target) => {
    return (
      target instanceof Element &&
      target.localName === "ui-action" &&
      !target.hasAttribute("disabled") &&
      !target.hasAttribute("kind")
    )
  })
}

/** The class of the part menu's App Menu header, over the program's own items (`Palette.css`). */
const APP_MENU_HEADER = "AppMenuHeader"

/** The class of the part menu's Inspect Other Views row (`Palette.css`). */
const INSPECT_ROW = "InspectRow"

/** The class of every right click's menu:  shown at once (`Palette.css`). */
const MENU_POPUP = "MenuPopup"

/** The class of the part menu's popup. */
const PART_MENU = "PartMenu"

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
