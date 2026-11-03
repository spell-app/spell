import { For, Show, createSignal, onSettled } from "solid-js"
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
import { Action } from "./Actions"
import { ChangeThis } from "./ChangeThis"
import { Inspector } from "./Inspector"
import { on } from "./on"
import { PartEdits, type PartAction } from "./PartEdits"
import { chooseRow, treeChoosesRows } from "./treeRows"

import "./Palette.css"

/**
 * What can be added to the app, and whether it's kept open:  the top bar's popup, a menu in columns by topic,
 * or kept open, a strip of icons across the top of the panes.
 * - It reads the components' own descriptions (`ComponentDefinitions`), loaded the first time it opens:
 *   every vocabulary, which the page never needs otherwise.
 * - What's offered is what has a `snippet`:  a new component is offered by saying what it adds.
 * - First, This app:  the app's own views, each added as `{draw a new card}` (`Palette.ownViews`, epic `editor` P19).
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

  /** Keep it open, or stop;  remembered. */
  static togglePinned(): void {
    const pinned = !isPinned()
    setPinned(pinned)
    editorPrefs.set(PINNED_PREF, pinned)
  }

  /** Open the menu, with its search:  the strip's glass. */
  static openMenu(): void {
    Palette.load()
    Palette.showMenu?.()
  }

  /** Shows the menu:  `<AddPartButton>`'s, while it's drawn. */
  static showMenu: (() => void) | undefined

  /** Load what it offers, the first time. */
  static load(): void {
    loading ??= import("spell/ui/components/ComponentDefinitions")
      .then(({ ComponentDefinitions }) => {
        definitions = ComponentDefinitions
        setOffered([...ComponentDefinitions.paletteByTopic()].map(([topic, parts]) => ({ topic, parts })))
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
    const place = PartEdits.placeForNew()
    Inspector.readyWordsNext()
    PartEdits.add([view.snippet], appTexts.text("partStepAdd", { part: view.name }), place)
  }

  /** Add `definition` beside what's selected, else at the end of the drawing. */
  static add(definition: ComponentDefinition): void {
    const place = PartEdits.placeForNew()
    Inspector.readyWordsNext()
    PartEdits.add([snippetFor(definition, place?.file)], stepTitle(definition), place)
  }
}

/** `ComponentDefinitions`, once it's loaded:  a row only shows after that, so a drop never waits for it. */
let definitions: typeof import("spell/ui/components/ComponentDefinitions").ComponentDefinitions | undefined

/** Its loading, once it's asked for. */
let loading: Promise<void> | undefined

/** Does it open when the `+` is next drawn?  `Palette.openOnArrival()`. */
let opensOnArrival = false

/** What `definition` adds to `file`, in its language. */
function snippetFor(definition: ComponentDefinition, file: SP.AnySpellFile | undefined): string {
  return definitions?.snippetIn(definition, languageOf(file)) ?? definition.snippet!
}

/** The preference that remembers whether it's kept open. */
const PINNED_PREF = "palettePinned"

const [isPinned, setPinned] = createSignal<boolean>(editorPrefs.get(PINNED_PREF) === true)
const [offered, setOffered] = createSignal<readonly PaletteGroup[]>([])

/** One topic of what's offered. */
type PaletteGroup = {
  /** Its name in the vocabularies' `topics`. */
  topic: string
  /** What's filed under it, by name. */
  parts: readonly ComponentDefinition[]
}

/** One of the app's own views, as the palette offers it. */
type OwnView = {
  /** Its name, as a person reads it, e.g. `Stock pile`. */
  name: string
  /** What adding it writes:  `{draw a new card}`. */
  snippet: string
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
    .map((node) => ({ name: upperFirst(wordsOf(node.name)), snippet: `{draw a new ${wordsOf(node.name)}}` }))
    .sort((a, b) => a.name.localeCompare(b.name))
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

/** A step's title for adding `definition`. */
function stepTitle(definition: ComponentDefinition): string {
  return appTexts.text("partStepAdd", { part: definition.name })
}

/** The top bar's `+`:  opens the palette, a menu.  Kept open, it's the strip's glass that opens it too. */
export function AddPartButton(): JSX.Element {
  let popup: (HTMLElement & { visible?: boolean }) | undefined
  onSettled(() => {
    PartEdits.onPaletteDrag = () => {
      if (popup) popup.visible = false
    }
    Palette.showMenu = () => {
      if (popup) popup.visible = true
    }
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
 * The palette kept open:  a strip of icons, a row of one 40px bar above the panes, scrolling with its ‹ ›.
 * - Each a tooltip;  a click adds it, and a drag places it, as from the menu.
 * - Its search is a glass that opens the menu;  the pin at its end closes it.
 */
export function PaletteStrip(): JSX.Element {
  onSettled(() => Palette.load())
  return (
    <div class="PaletteStrip">
      <ui-toolbar class="PaletteStripItems" aria-label={appTexts.text("addPart")}>
        <For each={ownViewsFor(editor.file)}>
          {(view) => (
            <ui-item
              title={view.name}
              aria-label={view.name}
              onClick={() => Palette.addOwn(view)}
              ref={(item: Element) => startsOwnDrag(item, view)}
            >
              <ui-icon name={OWN_VIEW_ICON} />
            </ui-item>
          )}
        </For>
        <For each={offered().flatMap((group) => group.parts)}>
          {(definition) => (
            <ui-item
              title={definition.name}
              aria-label={definition.name}
              onClick={() => Palette.add(definition)}
              ref={(item: Element) => startsDrag(item, definition)}
            >
              <ui-icon name={definition.icon ?? "square outline"} />
            </ui-item>
          )}
        </For>
      </ui-toolbar>
      <ui-icon
        name="search"
        link=""
        class="IconAction"
        label={appTexts.text("paletteSearch")}
        title={appTexts.text("paletteSearch")}
        onClick={() => Palette.openMenu()}
      />
      <PinIcon />
    </div>
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

/** The palette as a menu:  its search and pin, then This app, the app's own views, then every part, by topic, in columns. */
function PaletteMenu(): JSX.Element {
  const [filter, setFilter] = createSignal("")
  const shown = () => {
    const words = filter().trim().toLowerCase()
    if (!words) return offered()
    return offered()
      .map(({ topic, parts }) => ({
        topic,
        parts: parts.filter((part) => `${part.name} ${part.description ?? ""}`.toLowerCase().includes(words))
      }))
      .filter(({ parts }) => parts.length)
  }
  const own = () => {
    const words = filter().trim().toLowerCase()
    return ownViewsFor(editor.file).filter((view) => view.name.toLowerCase().includes(words))
  }
  return (
    <div class="PaletteBody">
      <div class="PaletteHead">
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
        <Show when={own().length}>
          <section class="PaletteGroup ThisApp">
            <h4>{appTexts.text("thisApp")}</h4>
            <ui-tree class="PaletteTree" label={appTexts.text("thisApp")} ref={treeChoosesRows}>
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
            </ui-tree>
          </section>
        </Show>
        <For each={shown()}>
          {(group) => (
            <section class="PaletteGroup">
              <h4>{upperFirst(group.topic)}</h4>
              <ui-tree class="PaletteTree" label={group.topic} ref={treeChoosesRows}>
                <For each={group.parts}>{(definition) => <PaletteRow definition={definition} />}</For>
              </ui-tree>
            </section>
          )}
        </For>
      </div>
    </div>
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
        title={appTexts.text("menuCut")}
        shortcut={EDITOR_HOTKEYS.cutParts.shortcut}
        disabled={(!inCode() && !hasSelection()) || !!why("cut")}
        tip={why("cut")}
        onClick={() => cutCopyOrPaste("cut")}
      />
      <Action
        menu
        title={appTexts.text("menuCopy")}
        shortcut={EDITOR_HOTKEYS.copyParts.shortcut}
        disabled={(!inCode() && !hasSelection()) || !!why("copy")}
        tip={why("copy")}
        onClick={() => cutCopyOrPaste("copy")}
      />
      <Action
        menu
        title={appTexts.text("menuPaste")}
        shortcut={EDITOR_HOTKEYS.pasteParts.shortcut}
        disabled={!!why("paste")}
        tip={why("paste")}
        onClick={() => cutCopyOrPaste("paste")}
      />
      <Action
        menu
        title={appTexts.text("menuDuplicate")}
        shortcut={EDITOR_HOTKEYS.duplicateParts.shortcut}
        disabled={inCode() || !hasSelection() || !!why("duplicate")}
        tip={why("duplicate")}
        onClick={part("duplicate")}
      />
      <Action
        menu
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
 * - A `<ui-popup>` at the click, holding a `<ui-menu>`:  it stays inside the window, with arrow keys, Enter and Esc.
 * - What can't be done is greyed, and its tooltip says why (`PartEdits.whyNot()`).
 * - `PartEdits.onMenu` opens it, having selected what was clicked.
 */
export function PartMenu(): JSX.Element {
  const [at, setAt] = createSignal<{ x: number; y: number }>()
  onSettled(() => {
    PartEdits.onMenu = (x, y) => setAt({ x, y })
  })
  const isAnItem = (event: Event) =>
    event.composedPath().some((target) => {
      return (
        target instanceof Element &&
        target.localName === "ui-action" &&
        !target.hasAttribute("disabled") &&
        !target.hasAttribute("kind")
      )
    })
  return (
    <Show when={at()}>
      {(where) => (
        <ui-popup
          at={where()}
          open-on="manual"
          visible=""
          class={["BarMenuPopup", PART_MENU]}
          aria-label={appTexts.text("menuEdit")}
          on-ui-closing={() => setAt(undefined)}
        >
          <div class="BarMenuPanel" onClick={(event) => isAnItem(event) && setAt(undefined)}>
            <ui-menu
              direction="vertical"
              size="small"
              interactive=""
              class="BarMenuItems"
              aria-label={appTexts.text("menuEdit")}
            >
              <PartMenuItems whyNot={(action) => PartEdits.whyNot(action)} />
              <ui-action kind="divider" />
              <Action
                menu
                title={appTexts.text("menuShowInCode")}
                disabled={!!PartEdits.whyNoCode}
                tip={PartEdits.whyNoCode}
                onClick={() => void Inspector.showWritten(Inspector.allSelected.at(-1)!.element!)}
              />
              <Action menu title={appTexts.text("menuInspect")} onClick={() => Inspector.showSelected()} />
              <Show when={ChangeThis.isAvailable}>
                <ui-action kind="divider" />
                <Action
                  menu
                  title={appTexts.text("menuChangeThis")}
                  shortcut={EDITOR_HOTKEYS.changeThis.shortcut}
                  disabled={!!PartEdits.whyNoCode}
                  tip={PartEdits.whyNoCode}
                  onClick={() => ChangeThis.open()}
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
