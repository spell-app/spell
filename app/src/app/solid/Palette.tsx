import { For, Show, createEffect, createSignal, flush, onSettled } from "solid-js"
import type { JSX } from "@solidjs/web"

import { kebabCase, upperFirst } from "spell/util"
import { beforeNextPaint } from "spell/util/timing"
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
import { barTooltip } from "./chrome"
import { Inspector, type PartRow } from "./Inspector"
import { on } from "./on"
import { PartEdits, type MenuOpening, type PartAction } from "./PartEdits"
import { chooseRow, treeChoosesRows } from "./treeRows"

import "./Palette.css"

/**
 * What can be added to the app, and whether it's kept open.
 * - Closed, it's the top bar's popup:  a menu in columns by topic.
 * - Kept open, it's the top bar's second row:  its topics' names, each a menu (epic `editor` T80).
 * - It reads the components' own descriptions (`ComponentDefinitions`), loaded the first time it opens:
 *   every vocabulary, which the page never needs otherwise.
 * - What's offered is what has a `snippet`:  a new component is offered by saying what it adds.
 * - First, App views:  the app's own views, each added as `{draw a new card}` (`Palette.ownViews`, epic `editor` P19).
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
   * Close its menus, the popup and the pinned bar's:
   * what's added, or dragged, lands on a page you can see (epic `editor` I176).
   */
  static closeMenus(): void {
    for (const menu of menus) {
      if (menu.isConnected) menu.visible = false
      else menus.delete(menu)
    }
    for (const close of matchClosers) close()
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

/** Its loading, once it's asked for. */
let loading: Promise<void> | undefined

/** Does it open when the `+` is next drawn?  `Palette.openOnArrival()`. */
let opensOnArrival = false

/** Its menus, the popup and the pinned bar's:  `Palette.closeMenus()` closes them, forgetting those gone. */
const menus = new Set<HTMLElement & { visible?: boolean }>()

/** What closes the pinned bar's search results, while the bar is drawn (`<PaletteStrip>`). */
const matchClosers = new Set<() => void>()

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

////////////////
// ## Search:  the popup's, and the pinned bar's
////////////////

/** Does `part` hold `words` (lowercase) in its name, its other names or its description?  Every part, for none. */
function partMatches(part: ComponentDefinition, words: string): boolean {
  return `${part.name} ${part.aka.join(" ")} ${part.description ?? ""}`.toLowerCase().includes(words)
}

/** Every topic with a part matching `words`, cut to those parts, in the palette's order. */
function groupsMatching(words: string): PaletteGroup[] {
  if (!words) return [...offered()]
  return offered()
    .map((group) => ({ ...group, parts: group.parts.filter((part) => partMatches(part, words)) }))
    .filter(({ parts }) => parts.length)
}

/** The app's own views matching `words`. */
function ownViewsMatching(words: string): readonly OwnView[] {
  return ownViewsFor(editor.file).filter((view) => view.name.toLowerCase().includes(words))
}

/** A page's examples and sections (`PAGE_PART_TAGS`) matching `words`, by name and other names:  This page's. */
function pagePartsMatching(words: string): ComponentDefinition[] {
  const parts = offered().flatMap((group) => group.parts)
  return PAGE_PART_TAGS.flatMap((tag) => parts.filter((part) => part.tag === tag)).filter((part) =>
    `${part.name} ${part.aka.join(" ")}`.toLowerCase().includes(words)
  )
}

/** Does This page's "new view" row match `words`? */
function newViewMatches(words: string): boolean {
  return appTexts.text("paletteNewView").toLowerCase().includes(words)
}

/** Has App views (This page) a row matching `words`?  Shown at all, for none. */
function thisGroupMatches(words: string): boolean {
  const onPage = Palette.isPageShown && (newViewMatches(words) || pagePartsMatching(words).length > 0)
  return onPage || ownViewsMatching(words).length > 0
}

/**
 * The top bar's `+`:  opens the palette, a menu with its search;  kept open too, beside the pinned bar.
 * - An item of the Run | Edit group, right after Inspect app (`<ModeButtons add>`;  epic `editor` T83:
 *   "Move `add` to the immediate right of the inspector crosshair"), so it stands as its neighbours do.
 * - It opens a menu, never becomes the mode chosen (its `aria-haspopup`).
 */
export function AddPartButton(): JSX.Element {
  let popup: (HTMLElement & { visible?: boolean }) | undefined
  onSettled(() => {
    if (Palette.takeOpenOnArrival() && popup) popup.visible = true
  })
  return (
    <>
      <ui-item
        id={ADD_BUTTON_ID}
        icon="plus"
        appearance="circular"
        class="AddPartButton"
        label={appTexts.text("addPart")}
        {...barTooltip(appTexts.text("addViewTip"))}
        aria-haspopup="menu"
        onPointerEnter={() => Palette.load()}
        onClick={() => Palette.load()}
      />
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
        <PaletteMenu />
      </ui-popup>
    </>
  )
}

/** The `+`'s id, which its popup points at. */
const ADD_BUTTON_ID = "AddPartButton"

/**
 * The palette kept open:  the top bar's second row, of its topics' names (epic `editor` T80).
 * - Centred under the top bar, only as wide as what it holds, its bottom corners rounded (epic `editor` T106).
 * - Its pin right before "Add a View", pinned:  a click unpins it, closing the bar (epic `editor` T92, I212;  a ✕ by the search before).
 * - Add a View, in bold, then each topic's icon and name (epic `editor` T86);
 *   the names have no tooltips:  each says what it is (epic `editor` T107, which dropped I229's).
 * - Each name opens a menu of what's filed under it, as the popup lists them:  a click adds one, a drag places it.
 * - App views (This page) first, then every topic, as in the popup;  the row scrolls with its ‹ › only when they don't fit
 *   the window beside the search (`Palette.css`).
 * - Its search, right after the last topic (T106), looks as the popup's does (epic `editor` J140, revisited):
 *   every topic with a match opens its menu at once, each listing only its matches, side by side under its name.
 *   - A magnifying glass at its start, a fixed width, and a ✕ inside its end while it holds text (epic `editor` T87).
 *   - Escape, clearing the field, a click elsewhere, or choosing or dragging a row closes them;  typing opens them again.
 *   - ↓ goes into the first one;  Escape there comes back to the field.
 */
export function PaletteStrip(): JSX.Element {
  const [filter, setFilter] = createSignal("")
  const [isDismissed, setDismissed] = createSignal(false)
  const words = () => filter().trim().toLowerCase()
  const thisGroup = () => appTexts.text(Palette.isPageShown ? "thisPage" : "paletteAppViews")
  const thisMatches = () => !!words() && thisGroupMatches(words())
  const groupMatches = () => (words() ? groupsMatching(words()) : [])
  const isShowingMatches = () => !isDismissed() && (thisMatches() || groupMatches().length > 0)
  let strip: HTMLElement | undefined
  let search: HTMLElement | undefined
  let matches: HTMLElement | undefined
  const layOut = () => matches && strip && layOutMatches(matches, strip)
  // each menu's height changes as its rows draw:  laid out again
  const resizes = new ResizeObserver(() => layOut())
  /** Back to the field, the menus closed:  focus first, as focusing the field opens them. */
  const backToSearch = () => {
    search?.focus()
    setDismissed(true)
  }
  /** The field's ✕:  emptied, the menus closed, the field still focused. */
  const clearSearch = () => {
    if (search) (search as HTMLElement & { value: string }).value = ""
    setFilter("")
    backToSearch()
  }

  onSettled(() => {
    Palette.load()
    const closeMatches = () => setDismissed(true)
    matchClosers.add(closeMatches)
    const closeOnPressElsewhere = (event: PointerEvent) => {
      const path = event.composedPath()
      if (matches && search && !path.includes(matches) && !path.includes(search)) setDismissed(true)
    }
    document.addEventListener("pointerdown", closeOnPressElsewhere, { capture: true })
    window.addEventListener("resize", layOut)
    return () => {
      matchClosers.delete(closeMatches)
      document.removeEventListener("pointerdown", closeOnPressElsewhere, { capture: true })
      window.removeEventListener("resize", layOut)
      resizes.disconnect()
    }
  })

  // shown or hidden, and laid out again, as what matches changes
  createEffect(
    () => (isShowingMatches() ? [thisMatches(), ...groupMatches().map(groupMenuId)].join(" ") : ""),
    (shown) => {
      if (!matches) return
      const isOpen = matches.matches(":popover-open")
      if (!shown) {
        if (isOpen) matches.hidePopover()
        return
      }
      if (!isOpen) matches.showPopover()
      beforeNextPaint(() => layOut())
    }
  )

  const onSearchKey = (event: KeyboardEvent) => {
    if (!isShowingMatches()) return
    if (event.key === "Escape") setDismissed(true)
    else if (event.key === "ArrowDown") matches?.querySelector<HTMLElement>("ui-tree-item")?.focus()
    else return
    event.preventDefault()
    event.stopPropagation()
  }
  const onMatchesKey = (event: KeyboardEvent) => {
    const rows = [...(event.currentTarget as HTMLElement).querySelectorAll("ui-tree-item")]
    const isFirstRow = event.composedPath()[0] === rows[0] || event.target === rows[0]
    if (event.key === "Escape" || (event.key === "ArrowUp" && isFirstRow)) {
      event.preventDefault()
      event.stopPropagation()
      backToSearch()
    }
  }

  return (
    <div class="PaletteStrip" ref={(element: HTMLElement) => (strip = element)}>
      <div class="PaletteStripAdd">
        <PinIcon />
        <span class="PaletteStripLabel">{appTexts.text("paletteAddView")}</span>
        <ui-toolbar appearance="text" class="PaletteStripGroups" aria-label={appTexts.text("addPart")}>
          <Show when={ownViewsFor(editor.file).length || Palette.isPageShown}>
            <PaletteGroupMenu id={THIS_GROUP_MENU_ID} name={thisGroup()} icon={OWN_VIEW_ICON}>
              <ThisGroupRows words={() => ""} />
            </PaletteGroupMenu>
          </Show>
          <For each={offered()}>
            {(group) => (
              <PaletteGroupMenu
                id={groupMenuId(group)}
                name={upperFirst(groupName(group))}
                icon={group.icon ?? GROUP_ICON}
              >
                <For each={group.parts}>{(definition) => <PaletteRow definition={definition} />}</For>
              </PaletteGroupMenu>
            )}
          </For>
        </ui-toolbar>
      </div>
      <div class="PaletteStripEnd">
        <div class="PaletteStripField">
          <ui-input
            class="PaletteStripSearch"
            size="small"
            icon="search"
            icon-position="left"
            aria-label={appTexts.text("paletteSearch")}
            placeholder={appTexts.text("paletteSearch")}
            onFocusIn={() => setDismissed(false)}
            ref={(element: HTMLElement) => {
              search = element
              element.addEventListener("keydown", onSearchKey, { capture: true })
              on<{ value: string }>("ui-typed", (event) => {
                setFilter(event.detail.value)
                setDismissed(false)
              })(element)
            }}
          />
          <Show when={filter()}>
            <ui-icon
              name="close"
              link=""
              class={["IconAction", "PaletteStripClear"]}
              label={appTexts.text("paletteClearSearch")}
              {...barTooltip(appTexts.text("paletteClearSearch"))}
              onClick={clearSearch}
            />
          </Show>
        </div>
      </div>
      <div
        popover="manual"
        class="PaletteMatches"
        ref={(element: HTMLElement) => {
          matches = element
          element.addEventListener("keydown", onMatchesKey, { capture: true })
        }}
      >
        <Show when={thisMatches()}>
          <PaletteMatchPanel for={THIS_GROUP_MENU_ID} name={thisGroup()} icon={OWN_VIEW_ICON} resizes={resizes}>
            <ThisGroupRows words={words} />
          </PaletteMatchPanel>
        </Show>
        <For each={groupMatches()}>
          {(group) => (
            <PaletteMatchPanel
              for={groupMenuId(group)}
              name={upperFirst(groupName(group))}
              icon={group.icon ?? GROUP_ICON}
              resizes={resizes}
            >
              <For each={group.parts}>{(definition) => <PaletteRow definition={definition} />}</For>
            </PaletteMatchPanel>
          )}
        </For>
      </div>
    </div>
  )
}

/** The start of each pinned bar topic's id, which its menu points at. */
const GROUP_MENU_ID = "PaletteGroup-"

/** App views' (This page's) id in the pinned bar. */
const THIS_GROUP_MENU_ID = `${GROUP_MENU_ID}this`

/** `group`'s id in the pinned bar:  its name's button, which its menu and its search results point at. */
function groupMenuId(group: PaletteGroup): string {
  return `${GROUP_MENU_ID}${kebabCase(group.title ?? group.topic ?? "")}`
}

/**
 * ### `<PaletteMatchPanel>`
 * One topic's search results in the pinned bar:  a menu of only its matches, under its name (`layOutMatches()`).
 * - `for`:  its name's id in the bar.
 * - Headed by the topic's icon and name, as a menu's section is (epic `editor` T99):
 *   with several open side by side, each says which topic it is, though its name in the bar may be off to one side.
 *   - Only a label:  no click, no focus, so ↓ from the field still lands on the first match.
 *   - It stays put while the rows under it scroll.
 */
function PaletteMatchPanel(props: {
  for: string
  name: string
  icon: string
  resizes: ResizeObserver
  children: JSX.Element
}): JSX.Element {
  let panel: HTMLElement | undefined
  onSettled(() => {
    if (panel) props.resizes.observe(panel)
    return () => panel && props.resizes.unobserve(panel)
  })
  return (
    <div class={MATCH_PANEL} data-for={props.for} ref={(element: HTMLElement) => (panel = element)}>
      <div class="PaletteMatchHeader" aria-hidden="true">
        <ui-icon name={props.icon} />
        <span>{props.name}</span>
      </div>
      <div class="PaletteMatchRows">
        <ui-tree class="PaletteTree" label={props.name} ref={treeChoosesRows}>
          {props.children}
        </ui-tree>
      </div>
    </div>
  )
}

/** The class of one topic's search results in the pinned bar. */
const MATCH_PANEL = "PaletteMatchPanel"

/** How wide each topic's search results are, in px. */
const MATCH_WIDTH = 200

/** The space between them, and between rows of them, in px. */
const MATCH_GAP = 6

/** The least space between them and the window's edges, in px. */
const MATCH_MARGIN = 8

/** The least height of each, in px, however many rows of them. */
const MATCH_MIN_HEIGHT = 120

/**
 * Put each topic's search results in `layer` under its name in `strip`, as its own menu would open:
 * side by side, never over each other or off the window.
 * - One that would overlap the one before moves right;  the last ones move left to stay in the window.
 * - More than fit across the window start a row under the tallest of the row before,
 *   each row's height shared out so they all stay in the window.
 */
function layOutMatches(layer: HTMLElement, strip: HTMLElement): void {
  if (!layer.matches(":popover-open")) return
  const panels = [...layer.querySelectorAll<HTMLElement>(`.${MATCH_PANEL}`)]
  const width = document.documentElement.clientWidth
  const top = strip.getBoundingClientRect().bottom + 2
  const perRow = Math.max(1, Math.floor((width - 2 * MATCH_MARGIN + MATCH_GAP) / (MATCH_WIDTH + MATCH_GAP)))
  const rows = Math.ceil(panels.length / perRow)
  const room = (window.innerHeight - top - MATCH_MARGIN - (rows - 1) * MATCH_GAP) / rows
  for (const panel of panels) {
    panel.style.width = `${MATCH_WIDTH}px`
    panel.style.maxHeight = `${Math.max(MATCH_MIN_HEIGHT, Math.min(room, MATCH_MAX_HEIGHT))}px`
  }
  // a name's element draws none of its own (`display: contents`):  the box is its item's
  const nameBox = (panel: HTMLElement) => {
    const name = document.getElementById(panel.dataset.for ?? "")
    return name?.shadowRoot?.querySelector("[part~=item]") ?? name
  }
  const wanted = panels.map((panel) => nameBox(panel)?.getBoundingClientRect().left ?? MATCH_MARGIN)
  const places = matchPlaces(
    wanted,
    panels.map((panel) => panel.offsetHeight),
    { width, perRow }
  )
  panels.forEach((panel, at) => {
    panel.style.left = `${places[at]!.left}px`
    panel.style.top = `${top + places[at]!.top}px`
  })
}

/** The tallest each topic's search results get, in px, as its own menu (`Palette.css`). */
const MATCH_MAX_HEIGHT = 560

/**
 * Where each of the search results goes, from the left each would start at (`wanted`) and how tall each is:
 * left to right, `perRow` a row, inside a window `width` wide;  `top` from the first row's top.
 */
function matchPlaces(
  wanted: readonly number[],
  heights: readonly number[],
  { width, perRow }: { width: number; perRow: number }
): { left: number; top: number }[] {
  const places: { left: number; top: number }[] = []
  let top = 0
  for (let start = 0; start < wanted.length; start += perRow) {
    const lefts: number[] = []
    // right, past the one before
    let edge = MATCH_MARGIN - MATCH_GAP
    for (const left of wanted.slice(start, start + perRow)) {
      lefts.push(Math.max(left, edge + MATCH_GAP))
      edge = lefts.at(-1)! + MATCH_WIDTH
    }
    // left, to stay in the window, pushing the ones before along
    let limit = width - MATCH_MARGIN
    for (let at = lefts.length - 1; at >= 0; at--) {
      lefts[at] = Math.min(lefts[at]!, limit - MATCH_WIDTH)
      limit = lefts[at]! - MATCH_GAP
    }
    for (const left of lefts) places.push({ left, top })
    top += Math.max(...heights.slice(start, start + perRow)) + MATCH_GAP
  }
  return places
}

/**
 * ### `<PaletteGroupMenu>`
 * One topic of the pinned bar:  its icon and name, a quiet button;  a click opens its rows under it.
 * - Choosing a row closes it, as a drag from it does (`Palette.closeMenus()`).
 */
function PaletteGroupMenu(props: { id: string; name: string; icon: string; children: JSX.Element }): JSX.Element {
  return (
    <>
      <ui-item
        id={props.id}
        appearance="link"
        class="PaletteGroupName"
        icon={props.icon}
        aria-haspopup="menu"
        aria-label={props.name}
      >
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
      {...barTooltip(appTexts.text(Palette.isPinned ? "paletteUnpin" : "palettePin"))}
      onClick={() => Palette.togglePinned()}
    />
  )
}

/**
 * The palette as a menu, in columns:
 * what to do and its search, then App views, the app's own views, then every part, by topic.
 * - Every group shows everything in it, as the palette's table orders it (`paletteGroups.json`;  epic `editor` I174, T81).
 * - A search looks through all of them, by name, other names and description.
 */
function PaletteMenu(): JSX.Element {
  const [filter, setFilter] = createSignal("")
  const words = () => filter().trim().toLowerCase()
  /** Its first group's name:  This page on a page that draws its body, else App views. */
  const thisGroup = () => (Palette.isPageShown ? "thisPage" : "paletteAppViews")
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
          <Show when={thisGroupMatches(words())}>
            <section class="PaletteGroup ThisApp">
              <h4>{appTexts.text(thisGroup())}</h4>
              <ui-tree class="PaletteTree" label={appTexts.text(thisGroup())} ref={treeChoosesRows}>
                <ThisGroupRows words={words} />
              </ui-tree>
            </section>
          </Show>
          <For each={groupsMatching(words())}>
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
 * App views' rows, or This page's, that match `words`:  the popup's first group, and the pinned bar's.
 * - On a page that draws its body:  a new view of its own, then its examples and sections (`PAGE_PART_TAGS`),
 *   which still show under their own topics too (epic `notebook` P9).
 * - Then the app's own views.
 */
function ThisGroupRows(props: { words: () => string }): JSX.Element {
  return (
    <>
      <Show when={Palette.isPageShown && newViewMatches(props.words())}>
        <ui-tree-item
          icon={NEW_VIEW_ICON}
          label={appTexts.text("paletteNewView")}
          title={appTexts.text("paletteNewViewTip")}
          ref={(row: Element) => chooseRow(() => Palette.addNewView())(row)}
        />
      </Show>
      <Show when={Palette.isPageShown}>
        <For each={pagePartsMatching(props.words())}>{(definition) => <PaletteRow definition={definition} />}</For>
      </Show>
      <For each={ownViewsMatching(props.words())}>
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

/** The icon of a topic in the pinned bar whose group names none (`paletteGroups.json`'s `icon`). */
const GROUP_ICON = "shapes"

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
 * - Inspect names what it inspects, "Inspect Card", and lists every part under the mouse at its side (`<InspectRow>`).
 * - The program's own right-click menu there comes first, if it has one (`<context-menu>`, `context-menu=`),
 *   drawn as Run draws it (`ActionMenus.itemsFor()`), then a dashed line, then ours (epic `editor` I76, Owen's pick).
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
          <InspectRow part={opening()?.part} partsUnder={opening()?.partsUnder} />
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
        </MenuPopup>
      )}
    </Show>
  )
}

/****************
 * ### `<InspectRow>`
 * The part menu's Inspect row:  "Inspect Card", naming the type of the part the menu is for.
 * - A click on it selects that part, the top-most under the mouse, and opens the properties card.
 * - With more than one part under the mouse, its right end opens a submenu at its side listing every one of them,
 *   outermost first, each indented under the one it's inside, the one the right click took ticked
 *   (`<ui-submenu split>`;  Owen, epic `editor` P31, Q35 C1, C2).
 *   - Pointing at one rings it in the app, as Inspect app does on hover.
 *   - Choosing one selects it, as a click on it would (Shift or Command adds it), and opens the properties card.
 * - Only one part, or no point to look under (a Views tree row, the Menu key):  a plain row.
 ****************/
function InspectRow(props: InspectRowProps): JSX.Element {
  const title = () => appTexts.text("menuInspect", { type: props.part ? Inspector.typeWordsOf(props.part) : "" }).trim()
  const hasChoice = () => (props.partsUnder?.length ?? 0) > 1
  return (
    <Show
      when={hasChoice()}
      fallback={<Action menu icon="crosshairs" title={title()} onClick={() => Inspector.showSelected()} />}
    >
      <ui-submenu
        split=""
        icon="crosshairs"
        label={title()}
        flyout-label={appTexts.text("menuInspectParts")}
        class={INSPECT_ROW}
        ref={on("click", (event) => isTitleClick(event) && Inspector.showSelected())}
      >
        <For each={props.partsUnder}>
          {(row) => (
            <Action
              menu
              icon={Inspector.iconFor(row.element)}
              title={Inspector.labelFor(row.element)}
              active={row.element === props.part}
              style={{ "--InspectRow-depth": String(row.depth) }}
              onClick={(event: MouseEvent) => inspectPart(row.element, event)}
              onPointerEnter={() => Inspector.ring(row.element)}
              onPointerLeave={() => Inspector.ring(undefined)}
            />
          )}
        </For>
      </ui-submenu>
    </Show>
  )
}

/** Props for `<InspectRow>`. */
type InspectRowProps = {
  /** the part the menu is for:  its type names the row */
  part?: Element
  /** every part under the mouse, outermost first (`PartEdits.partsAt()`):  its submenu, with more than one */
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
 * - A split submenu's title is one too (`isTitleClick()`);  its chevron end only opens its side menu.
 */
function isAnItem(event: Event): boolean {
  if (isTitleClick(event)) return true
  return event.composedPath().some((target) => {
    return (
      target instanceof Element &&
      target.localName === "ui-action" &&
      !target.hasAttribute("disabled") &&
      !target.hasAttribute("kind")
    )
  })
}

/**
 * Is `event` a click on a split submenu's title (`<ui-submenu split>`):  not on its chevron end, which opens its
 * side menu, nor on a row of that side menu?
 */
function isTitleClick(event: Event): boolean {
  const path = event.composedPath()
  const at = path.findIndex((target) => target instanceof Element && target.localName === SUBMENU_TAG)
  if (at < 0 || !(path[at] as Element).hasAttribute(SPLIT)) return false
  // inside it:  the chevron end, the side menu's box, or one of its rows (its light children)
  return !path
    .slice(0, at)
    .some((target) => target instanceof Element && (target.matches(SIDE_PARTS) || target.parentElement === path[at]))
}

/** Spell UI's submenu row, and its word for a row whose title chooses (`<ui-submenu split>`). */
const SUBMENU_TAG = "ui-submenu"
const SPLIT = "split"

/** The parts of a split submenu that aren't its title:  its chevron end, and its side menu's box. */
const SIDE_PARTS = "[part~=chevron], [part~=flyout]"

/** The class of the part menu's Inspect row, while it has a side menu (`Palette.css`). */
const INSPECT_ROW = "InspectRow"

/** The class of every right click's menu:  shown at once (`Palette.css`). */
const MENU_POPUP = "MenuPopup"

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
