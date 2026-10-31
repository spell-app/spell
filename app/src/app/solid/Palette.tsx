import { For, Show, createSignal, onSettled } from "solid-js"
import type { JSX } from "@solidjs/web"

import type { ComponentDefinition } from "spell/ui/components/ComponentDefinitions"
import { SP } from "spell/parser/spell"
import { cutCopyOrPaste, EDITOR_HOTKEYS, undoWay } from "spell/app/app/pages/editorHotkeys"
import { editorPrefs } from "spell/app/app/editorPrefs"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { Action } from "./Actions"
import { Inspector } from "./Inspector"
import { on } from "./on"
import { PartEdits, type PartAction } from "./PartEdits"
import { chooseRow, treeChoosesRows } from "./treeRows"

import "./Palette.css"

/**
 * What can be added to the app, and whether it's kept open:  the top bar's popup, or a pane.
 * - It reads the components' own descriptions (`ComponentDefinitions`), loaded the first time it opens:
 *   every vocabulary, which the page never needs otherwise.
 * - What's offered is what has a `snippet`:  a new component is offered by saying what it adds.
 */
export class Palette {
  /** Is it kept open as a pane (reactive)? */
  static get isPinned(): boolean {
    return isPinned()
  }

  /** Keep it open, or stop;  remembered. */
  static togglePinned(): void {
    const pinned = !isPinned()
    setPinned(pinned)
    editorPrefs.set(PINNED_PREF, pinned)
  }

  /** Load what it offers, the first time. */
  static load(): void {
    loading ??= import("spell/ui/components/ComponentDefinitions")
      .then(({ ComponentDefinitions }) => {
        definitions = ComponentDefinitions
        setOffered(ComponentDefinitions.palette())
      })
      .catch((error: unknown) => console.error("Palette.load():  couldn't load what it offers", error))
  }

  /** Add `definition` beside what's selected, else at the end of the drawing. */
  static add(definition: ComponentDefinition): void {
    const place = PartEdits.placeForNew()
    PartEdits.add([snippetFor(definition, place?.file)], stepTitle(definition), place)
  }
}

/** `ComponentDefinitions`, once it's loaded:  a row only shows after that, so a drop never waits for it. */
let definitions: typeof import("spell/ui/components/ComponentDefinitions").ComponentDefinitions | undefined

/** Its loading, once it's asked for. */
let loading: Promise<void> | undefined

/** What `definition` adds to `file`, in its language. */
function snippetFor(definition: ComponentDefinition, file: SP.AnySpellFile | undefined): string {
  return definitions?.snippetIn(definition, languageOf(file)) ?? definition.snippet!
}

/** The preference that remembers whether it's kept open. */
const PINNED_PREF = "palettePinned"

const [isPinned, setPinned] = createSignal<boolean>(editorPrefs.get(PINNED_PREF) === true)
const [offered, setOffered] = createSignal<readonly ComponentDefinition[]>([])

/** The language `file` is written in. */
function languageOf(file: SP.AnySpellFile | undefined): string {
  return file instanceof SP.SpellFile ? file.language.lang : "en"
}

/** A step's title for adding `definition`. */
function stepTitle(definition: ComponentDefinition): string {
  return appTexts.text("partStepAdd", { part: definition.name })
}

/** The top bar's `+`:  opens the palette as a popup, unless it's kept open as a pane. */
export function AddPartButton(): JSX.Element {
  let popup: (HTMLElement & { visible?: boolean }) | undefined
  onSettled(() => {
    PartEdits.onPaletteDrag = () => {
      if (popup) popup.visible = false
    }
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
      <Show when={!Palette.isPinned}>
        {/* a popup's own click on the +;  a pinned palette needs none */}
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
          <PaletteBody />
        </ui-popup>
      </Show>
    </>
  )
}

/** The `+`'s id, which its popup points at. */
const ADD_BUTTON_ID = "AddPartButton"

/** The palette as a pane, while it's kept open. */
export function PalettePane(): JSX.Element {
  onSettled(() => Palette.load())
  return (
    <div class="PalettePane">
      <PaletteBody />
    </div>
  )
}

/** What the palette shows:  its search and pin, then what can be added. */
function PaletteBody(): JSX.Element {
  const [filter, setFilter] = createSignal("")
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
        <ui-icon
          name="thumbtack"
          link=""
          class={["IconAction", "PalettePin", { pinned: Palette.isPinned }]}
          label={appTexts.text(Palette.isPinned ? "paletteUnpin" : "palettePin")}
          title={appTexts.text(Palette.isPinned ? "paletteUnpin" : "palettePin")}
          onClick={() => Palette.togglePinned()}
        />
      </div>
      <ui-tree class="PaletteTree" label={appTexts.text("addPart")} filter={filter()} ref={treeChoosesRows}>
        <For each={offered()}>{(definition) => <PaletteRow definition={definition} />}</For>
      </ui-tree>
    </div>
  )
}

/** One thing that can be added:  a click adds it, a drag places it. */
function PaletteRow(props: { definition: ComponentDefinition }): JSX.Element {
  return (
    <ui-tree-item
      icon={props.definition.icon}
      label={props.definition.name}
      title={props.definition.description}
      ref={(row: Element) => {
        chooseRow(() => Palette.add(props.definition))(row)
        row.addEventListener("pointerdown", (event) =>
          PartEdits.startPaletteDrag(
            event as PointerEvent,
            props.definition.name,
            (file) => [snippetFor(props.definition, file)],
            stepTitle(props.definition)
          )
        )
      }}
    />
  )
}

/**
 * Edit › Cut, Copy, Paste, Duplicate and Delete, and the same in a right click's menu.
 * - In the code, Cut, Copy and Paste are the code editor's own:  Duplicate and Delete are only for what's selected.
 */
export function PartMenuItems(): JSX.Element {
  const hasSelection = () => Inspector.allSelected.length > 0
  const inCode = () => undoWay() === "code"
  const part = (action: PartAction) => () => void PartEdits.run(action)
  return (
    <>
      <Action
        menu
        title={appTexts.text("menuCut")}
        shortcut={EDITOR_HOTKEYS.cutParts.shortcut}
        disabled={!inCode() && !hasSelection()}
        onClick={() => cutCopyOrPaste("cut")}
      />
      <Action
        menu
        title={appTexts.text("menuCopy")}
        shortcut={EDITOR_HOTKEYS.copyParts.shortcut}
        disabled={!inCode() && !hasSelection()}
        onClick={() => cutCopyOrPaste("copy")}
      />
      <Action
        menu
        title={appTexts.text("menuPaste")}
        shortcut={EDITOR_HOTKEYS.pasteParts.shortcut}
        onClick={() => cutCopyOrPaste("paste")}
      />
      <Action
        menu
        title={appTexts.text("menuDuplicate")}
        shortcut={EDITOR_HOTKEYS.duplicateParts.shortcut}
        disabled={inCode() || !hasSelection()}
        onClick={part("duplicate")}
      />
      <Action
        menu
        title={appTexts.text("menuDelete")}
        shortcut={EDITOR_HOTKEYS.deleteParts.shortcut}
        disabled={inCode() || !hasSelection()}
        onClick={part("remove")}
      />
    </>
  )
}

/**
 * The ONE right-click menu on the app's parts, in the app and the Views tree:  `PartMenuItems`, the same as the Edit menu's.
 * - A Spell UI popup and menu, opened at the click:  what else a right click should offer is added to `PartMenuItems`,
 *   or here for what only a right click offers.
 * - `PartEdits.onMenu` opens it, having selected what was clicked.
 */
export function PartMenu(): JSX.Element {
  const [at, setAt] = createSignal<{ x: number; y: number }>()
  onSettled(() => {
    PartEdits.onMenu = (x, y) => setAt({ x, y })
    const close = (event: Event) => {
      if (!event.composedPath().some((target) => target instanceof Element && target.classList.contains(PART_MENU))) {
        setAt(undefined)
      }
    }
    window.addEventListener("pointerdown", close, true)
    return () => window.removeEventListener("pointerdown", close, true)
  })
  return (
    <Show when={at()}>
      {(where) => (
        <>
          <div id={PART_MENU_AT} class="PartMenuAt" style={{ left: `${where().x}px`, top: `${where().y}px` }} />
          <ui-popup
            for={PART_MENU_AT}
            open-on="manual"
            visible
            position="bottom left"
            class={["BarMenuPopup", PART_MENU]}
            aria-label={appTexts.text("menuEdit")}
          >
            <div class="BarMenuPanel" onClick={() => setAt(undefined)}>
              <ui-menu direction="vertical" size="small" class="BarMenuItems" aria-label={appTexts.text("menuEdit")}>
                <PartMenuItems />
              </ui-menu>
            </div>
          </ui-popup>
        </>
      )}
    </Show>
  )
}

/** The class of the part menu's popup, and the id of the spot it opens at. */
const PART_MENU = "PartMenu"
const PART_MENU_AT = "PartMenuAt"
