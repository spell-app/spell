import { For, Show, createEffect, createSignal, onSettled } from "solid-js"
import type { JSX } from "@solidjs/web"

import { kebabCase, upperFirst } from "spell/util"
import { beforeNextPaint } from "spell/util/timing"
import type { ComponentDefinition } from "spell/ui/components/ComponentDefinitions"
import { editor } from "spell/app/app/editor"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { barTooltip } from "./chrome"
import { Inspector } from "./Inspector"
import { on } from "./on"
import { PartEdits } from "./PartEdits"
import { chooseRow, treeChoosesRows } from "./treeRows"

import {
  Palette,
  thisGroupMatches,
  groupsMatching,
  matchClosers,
  ownViewsFor,
  offered,
  groupName,
  PaletteGroup,
  closesWithPalette,
  newViewMatches,
  pagePartsMatching,
  ownViewsMatching,
  snippetFor,
  stepTitle,
  OwnView
} from "./Palette"

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
 * - It fades and slides in the first time it shows on a page, under a top bar already drawn (epic `editor` I255);
 *   never again, switching modes or pages:  it stays where it was.
 */
export function PaletteStrip(): JSX.Element {
  const isArriving = Palette.takeStripArrival()
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
    <div class={["PaletteStrip", { arriving: isArriving }]} ref={(element: HTMLElement) => (strip = element)}>
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
 * - Every group shows everything in it, as the palette's table orders it (`ui/paletteGroups.json`;  epic `editor` I174, T81).
 * - A search looks through all of them, by name, other names and description.
 */
export function PaletteMenu(): JSX.Element {
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
