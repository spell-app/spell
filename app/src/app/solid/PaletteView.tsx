import { For, Show, createSignal, onCleanup, onSettled } from "solid-js"
import type { JSX } from "@solidjs/web"

import { kebabCase, upperFirst } from "spell/util"
import { after, type CancelablePromise } from "spell/util/timing"
import type { ComponentDefinition } from "spell/ui/components/ComponentDefinitions"
import { editor } from "spell/app/app/editor"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { hoverDelay } from "spell/app/app/ui/codePopups"
import { BarPanels, type BarPanel } from "./BarPanels"
import { Inspector } from "./Inspector"
import { on } from "./on"
import { PartEdits } from "./PartEdits"
import { PartPlacing, RAIL_MARK } from "./PartPlacing"
import { chooseRow, treeChoosesRows } from "./treeRows"

import {
  Palette,
  thisGroupMatches,
  groupsMatching,
  partBranches,
  type PartBranch,
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

import "./PaletteView.css"

/****************
 * ### `<PaletteRail>`
 * The add bar down the editor's left edge, in Edit (epic `editor` T151):  a button per group of what can be added.
 * - Top to bottom:  a `+`, opening the whole add panel (`<PlusPanel>`, T174), then the parts you've starred (T152),
 *   then App views (This page), then every group, as the palette's table orders them;
 *   a divider wherever the table puts one under a group (`dividerAfter`, set on the palette groups page, `/palette`).
 * - A group's button, its icon alone, its name the tooltip, opens its parts beside the bar (`<RailFlyout>`)
 *   once the mouse rests on it (T162):  a search over them at its top, then each by name, a family's parts inside
 *   its main one.  A click on one picks it up, to put in the app with the next
 *   click (`PartPlacing`, T153);  a drag places it;  its star stars it.
 * - What a button opens slides out of the bar, from behind it:  a SUB-PANEL (`RailPanels`, T173), in the top bar's
 *   menus' look, the button lit while it's out (I367);  the bar itself wears the top bar's fill and blur.
 *   - While one is out, pointing at another button opens its panel at once, gliding there from the last.
 * - A starred part's button picks it up the same way;  a drag places it;  a right click takes its star away.
 * - Marked as the rail (`RAIL_MARK`), its flyouts too:  a press on it is its own while a part is picked up.
 * - Slides in the first time it shows on a page, under a top bar already drawn (epic `editor` I255);  never again,
 *   switching modes or pages:  it stays where it was.
 * - Drawn on a blank app just made, or by ⌥⌘V in Run (`Palette.openOnArrival()`), it opens its `+` panel.
 * - Spell UI's own:  a vertical icon `<ui-menu>`, its buttons `<ui-item>`s, its flyouts `<ui-popup>`s.
 ****************/
export function PaletteRail(): JSX.Element {
  const isArriving = Palette.takeRailArrival()
  const thisGroup = () => appTexts.text(Palette.isPageShown ? "thisPage" : "paletteAppViews")
  onSettled(() => {
    Palette.load()
    // a blank app just made:  the add panel shows what it can hold
    if (Palette.takeOpenOnArrival()) void Palette.showPanel()
  })
  return (
    <div class={["PaletteRailPlace", { arriving: isArriving }]} {...{ [RAIL_MARK]: "" }}>
      <div class="SplitPane PaletteRail" data-tour="add-bar">
        <div class="PaletteRailColumn">
          <PlusPanel />
          <ui-menu direction="vertical" icon appearance="text" aria-label={appTexts.text("addPart")}>
            <Show when={Palette.favorites.length}>
              <For each={Palette.favorites}>{(definition) => <FavoriteButton definition={definition} />}</For>
              <ui-item kind="divider" />
            </Show>
            <Show when={ownViewsFor(editor.file).length || Palette.isPageShown}>
              <RailFlyout id={THIS_FLYOUT_ID} name={thisGroup()} icon={OWN_VIEW_ICON}>
                {(words) => <ThisGroupRows words={words} />}
              </RailFlyout>
            </Show>
            <For each={offered()}>
              {(group) => (
                <>
                  <RailFlyout id={flyoutId(group)} name={upperFirst(groupName(group))} icon={group.icon ?? GROUP_ICON}>
                    {(words) => <PartRows parts={group.parts} words={words} picksUp />}
                  </RailFlyout>
                  <Show when={group.dividerAfter}>
                    <ui-item kind="divider" />
                  </Show>
                </>
              )}
            </For>
          </ui-menu>
        </div>
      </div>
    </div>
  )
}

/** The start of each add bar button's id, which its flyout points at. */
const FLYOUT_ID = "PaletteFlyout-"

/** The `+`'s id in the add bar, which the whole add panel points at. */
const PLUS_ID = `${FLYOUT_ID}plus`

/** App views' (This page's) id in the add bar. */
const THIS_FLYOUT_ID = `${FLYOUT_ID}this`

/** `group`'s button's id in the add bar, which its flyout points at. */
function flyoutId(group: PaletteGroup): string {
  return `${FLYOUT_ID}${kebabCase(group.title ?? group.topic ?? "")}`
}

/**
 * ### `<RailFlyout>`
 * One button of the add bar, and the sub-panel it opens beside the bar.
 * - The button:  its icon alone, `name` its name for a screen reader;  no tooltip:  its menu, opening, names it (T162).
 * - The panel opens as the mouse rests on the button, after the page's hover delay (`--ui-hover-delay`;  T162),
 *   or as the button gets the focus;  it stays open while the mouse is over it.
 *   - At once while another is out:  it glides there from the last (`RailPanels`, T173).
 * - A click on the button opens it at once, with no wait (T170, Owen:  "Click opens it too").
 * - The panel:  `name` atop, a search button beside it (T162), then `rows`, handed the words typed (lowercase);
 *   - the search button slides the field open over the name, "Search <group>" (`<ui-search collapsed>`);
 *     ⌘F jumps into it (T166)
 *   - at its foot, what the part under the mouse is (`<PartAbout>`, epic `editor` T165)
 *   - its header and the button share one fill while it's out (T173, I367)
 * - Choosing a row, or dragging one, closes it (`Palette.closeMenus()`).
 */
function RailFlyout(props: {
  id: string
  name: string
  icon: string
  children: (words: () => string) => JSX.Element
}): JSX.Element {
  const [filter, setFilter] = createSignal("")
  const [isOut, setOut] = createSignal(false)
  const words = () => filter().trim().toLowerCase()
  let flyout: RailPanel | undefined
  let button: HTMLElement | undefined
  return (
    <>
      <ui-item
        id={props.id}
        class={["PaletteRailButton", { open: isOut() }]}
        icon={props.icon}
        aria-haspopup="menu"
        aria-label={props.name}
        ref={(item: HTMLElement) => (button = item)}
        onPointerEnter={() => flyout && button && RailPanels.pointedAt(flyout, button)}
        onClick={() => flyout && button && RailPanels.open(flyout, button)}
      />
      <ui-popup
        for={props.id}
        open-on="hover"
        position="right top"
        class={["BarMenuPopup", "PaletteFlyout"]}
        aria-label={props.name}
        ref={(popup: RailPanel) => {
          flyout = popup
          closesWithPalette(popup)
          RailPanels.follow(popup, () => button, setOut)
        }}
        {...{ [RAIL_MARK]: "" }}
      >
        <div class="PaletteFlyoutHead">
          <span class="PaletteFlyoutName">{props.name}</span>
          <ui-search
            class="PaletteFlyoutSearch"
            collapsed=""
            size="small"
            shortcut="mod+F"
            show-no-results="false"
            aria-label={appTexts.text("paletteSearchIn", { group: props.name })}
            placeholder={appTexts.text("paletteSearchIn", { group: props.name })}
            onInput={(event: InputEvent) => setFilter((event.composedPath()[0] as HTMLInputElement).value ?? "")}
            ref={on<{ value: string }>("ui-changed", (event) => setFilter(event.detail.value))}
          />
        </div>
        <ui-tree class="PaletteTree" label={props.name} ref={treeChoosesRows}>
          {props.children(words)}
        </ui-tree>
        <div class="PaletteFlyoutFoot">
          <PartAbout />
        </div>
      </ui-popup>
    </>
  )
}

/**
 * ### `<PlusPanel>`
 * The `+` atop the add bar, and the whole add panel it opens beside the bar (epic `editor` T174, Owen:
 * "Hovering over or clicking the plus in the bar should show the full add panel as we had it before, with columns,
 * with the cursor in the search field").
 * - The panel is the add panel's menu, `<PaletteMenu>`:  every part, in columns by topic,
 *   sliding out of the bar as a group's does (`RailPanels`, T173);  its search has the cursor as it opens.
 * - The mouse resting on the `+` opens it, after the page's hover delay;  a click, at once;
 *   at once too while a group's panel is out.
 * - It stays open as the mouse leaves, so typing in its search never closes it:
 *   Escape, a click elsewhere, a part added or dragged, or another of the bar's buttons pointed at closes it.
 * - The add bar's own Search button went with it (Owen:  "I think we can drop the search icon in this case"):
 *   this search looks through every part.
 * - ⌥⌘V and View › Add a View… open it too (`Palette.showPanel()`, epic `editor` T175);
 *   with no add bar (Run, Design), the same menu in a dialog of its own (`<PalettePanel>`).
 */
function PlusPanel(): JSX.Element {
  const [isOut, setOut] = createSignal(false)
  let panel: RailPanel | undefined
  let plus: HTMLElement | undefined
  /** The mouse resting on the `+`, before the panel opens. */
  let resting: CancelablePromise<unknown> | undefined
  // ⌥⌘V and View › Add a View… open it while it's here, as a click on the `+` does (T175)
  onCleanup(Palette.offerPlus(() => panel && plus && RailPanels.open(panel, plus)))
  // thinner or wider, shorter or taller, as its search changes what it shows:  it glides to its new size (I369)
  onSettled(() => {
    const body = panel?.querySelector(".PaletteBody")
    if (!body || !panel) return
    const box = panel
    let last: { width: number; height: number } | undefined
    const sizes = new ResizeObserver(() => {
      const { width, height } = body.getBoundingClientRect()
      const now = width && height ? { width, height } : undefined
      if (last && now && isOut()) RailPanels.resize(box, last, now)
      last = now
    })
    sizes.observe(body)
    return () => sizes.disconnect()
  })
  return (
    <>
      <div
        id={PLUS_ID}
        class={["PaletteRailAdd", { open: isOut() }]}
        role="button"
        tabindex="0"
        aria-label={appTexts.text("addPart")}
        aria-haspopup="dialog"
        ref={(element: HTMLElement) => (plus = element)}
        onKeyDown={(event: KeyboardEvent) => {
          if (event.key !== "Enter" && event.key !== " ") return
          event.preventDefault()
          if (panel && plus) RailPanels.open(panel, plus)
        }}
        onPointerEnter={() => {
          if (!panel || !plus || RailPanels.pointedAt(panel, plus)) return
          resting = after(hoverDelay(), () => panel && plus && RailPanels.open(panel, plus))
        }}
        onPointerLeave={() => resting?.cancel()}
        onClick={() => {
          resting?.cancel()
          if (panel && plus) RailPanels.open(panel, plus)
        }}
      >
        <ui-icon name="plus" />
      </div>
      <ui-popup
        for={PLUS_ID}
        open-on="manual"
        position="right top"
        class={["BarMenuPopup", "PaletteFlyout", "PalettePlus"]}
        aria-label={appTexts.text("addPart")}
        ref={(popup: RailPanel) => {
          panel = popup
          closesWithPalette(popup)
          RailPanels.follow(popup, () => plus, setOut)
          // the cursor in its search as it opens
          popup.addEventListener("toggle", (event) => {
            if ((event as ToggleEvent).newState === "open") popup.querySelector<HTMLElement>(".PaletteSearch")?.focus()
          })
        }}
        {...{ [RAIL_MARK]: "" }}
      >
        <PaletteMenu picksUp />
      </ui-popup>
    </>
  )
}

/** One of the add bar's sub-panels:  a `<ui-popup>`, shown and hidden by `visible`. */
type RailPanel = BarPanel

/**
 * The add bar's sub-panels, as one (epic `editor` T173):  pointing at another button while one is out opens it at
 * once, gliding up or down from where the last one was (`gliding`, `--PaletteFlyout-glide`, `PaletteView.css`).
 * - The top bar's menus move the same way, sideways (`BarPanels`).
 */
const RailPanels = new BarPanels({
  along: "y",
  glideToken: "--PaletteFlyout-glide",
  grows: "height",
  reopensWithinMs: 300
})

/**
 * ### `<FavoriteButton>`
 * A starred part's button in the add bar (epic `editor` T152), and the small sub-panel it opens beside the bar:
 * "Add [its icon] Text" (T183, Owen:  "It should feel like part of the same animation as the menus coming up").
 * - The panel slides out as a group's menu does, in the same look, the button lit (`RailPanels`):
 *   once the mouse rests on the button, at once on a click, or while another panel is out, gliding there.
 * - A click on the panel picks the part up to place with the next click in the app (`PartPlacing`, T153),
 *   as a click on the button itself did before;  its words say so to a screen reader (`paletteFavoriteTip`).
 * - A drag from the button or the panel places it;  a right click on the button takes its star away.
 * - The button is lit while its part is picked up.
 */
function FavoriteButton(props: { definition: ComponentDefinition }): JSX.Element {
  // lit while it's the part picked up to place
  const [isPicked, setPicked] = createSignal(false)
  const [isOut, setOut] = createSignal(false)
  onSettled(() => PartPlacing.watch(() => setPicked(PartPlacing.isPicked(props.definition.name))))
  const id = () => `${FLYOUT_ID}star-${kebabCase(props.definition.tag)}`
  let panel: RailPanel | undefined
  let button: HTMLElement | undefined
  return (
    <>
      <ui-item
        id={id()}
        class={["PaletteRailButton", "PaletteFavorite", { open: isOut() }]}
        icon={props.definition.icon ?? GROUP_ICON}
        selected={isPicked()}
        aria-haspopup="menu"
        aria-label={props.definition.name}
        ref={(element: HTMLElement) => {
          button = element
          startsDrag(element, props.definition)
        }}
        onPointerEnter={() => panel && button && RailPanels.pointedAt(panel, button)}
        onClick={() => panel && button && RailPanels.open(panel, button)}
        onContextMenu={(event: MouseEvent) => {
          event.preventDefault()
          Palette.toggleFavorite(props.definition)
        }}
      />
      <ui-popup
        for={id()}
        open-on="hover"
        position="right top"
        class={["BarMenuPopup", "PaletteFlyout", "PaletteFavoritePanel"]}
        aria-label={props.definition.name}
        ref={(popup: RailPanel) => {
          panel = popup
          closesWithPalette(popup)
          RailPanels.follow(popup, () => button, setOut)
        }}
        {...{ [RAIL_MARK]: "" }}
      >
        <ui-button
          class="PaletteFavoriteAdd"
          appearance="basic"
          aria-description={appTexts.text("paletteFavoriteTip", { part: props.definition.name })}
          ref={(add: Element) => startsDrag(add, props.definition)}
          onClick={(event: MouseEvent) => pickUp(props.definition, event)}
        >
          {addWords()[0]}
          <ui-icon name={props.definition.icon ?? GROUP_ICON} />
          {props.definition.name}
          {addWords()[1]}
        </ui-button>
      </ui-popup>
    </>
  )
}

/**
 * The words round a part's icon and name, "Add" and nothing, in the editor's language (`paletteAddPart`;  reactive):
 * the sentence is the language's own, the icon and name going where its `{part}` is.
 */
function addWords(): [string, string] {
  const [before = "", after = ""] = appTexts.text("paletteAddPart", { part: PART_MARK }).split(PART_MARK)
  return [before, after]
}

/** Where a part's icon and name go in `paletteAddPart`'s words:  a character no language writes. */
const PART_MARK = "\u0000"

/****************
 * ### `<PalettePanel>`
 * The add panel, over the editor (epic `editor` T167:  "Shortcut key to bring up the Add View panel in a modal"):
 * the palette's menu, `<PaletteMenu>`, in a `<ui-modal>`.
 * - Opened by its key, ⌥⌘V, or View › Add a View…, where there's no add bar (Run, Design):
 *   `Palette.showPanel()`, which mounts it and cleans up;  in Edit they open the `+` panel instead (T175).
 * - A click on a part adds it, a drag places it, as in the add bar's menus.
 * - Closes like every dialog:  its ✕, Escape, or a click beside it;
 *   and once a part is added, or a drag starts from it (`closesWithPalette`), so it lands on a page you can see.
 ****************/
export function PalettePanel(props: { onClose: () => void }): JSX.Element {
  return (
    <ui-modal
      class="PalettePanel"
      closedby="any"
      closable=""
      aria-label={appTexts.text("addPart")}
      visible=""
      ref={(modal: HTMLElement & { visible?: boolean }) => {
        closesWithPalette(modal)
        modal.addEventListener("ui-closed", () => props.onClose(), { once: true })
      }}
    >
      <PaletteMenu />
    </ui-modal>
  )
}

/**
 * The palette as a menu, in columns:
 * what to do and its search, then App views, the app's own views, then every part, by topic.
 * - Every group shows everything in it, as the palette's table orders it (`ui/paletteGroups.json`;  epic `editor` I174, T81).
 * - A search looks through all of them, by name, other names and description:  ⌘F jumps into it (epic `editor` T166).
 * - Its header's words say what the part under the mouse is, else how to add one (`<PartAbout>`, epic `editor` T165).
 * - `picksUp`, out of the add bar's `+`:  a click on a part picks it up to place with the next click in the app, as in
 *   the add bar's other menus (`PartPlacing`, T153;  epic `editor` I369);  in the dialog it's added at once.
 */
export function PaletteMenu(props: PaletteMenuProps): JSX.Element {
  const [filter, setFilter] = createSignal("")
  const words = () => filter().trim().toLowerCase()
  /** How many topics show, for the `+` panel to be as wide as they need (I369). */
  const topics = () => groupsMatching(words()).length + (thisGroupMatches(words()) ? 1 : 0)
  /** Its first group's name:  This page on a page that draws its body, else App views. */
  const thisGroup = () => (Palette.isPageShown ? "thisPage" : "paletteAppViews")
  return (
    <div class="PaletteBody" style={{ "--PaletteMenu-topics": topics() }}>
      <div class="PaletteHead">
        <PartAbout class="PaletteHint" />
        <ui-input
          class="PaletteSearch"
          type="search"
          shortcut="mod+F"
          size="small"
          aria-label={appTexts.text("paletteSearch")}
          placeholder={appTexts.text("paletteSearch")}
          ref={on<{ value: string }>("ui-typed", (event) => setFilter(event.detail.value))}
        />
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
                  <For each={group.parts}>
                    {(definition) => <PaletteRow definition={definition} picksUp={props.picksUp} />}
                  </For>
                </ui-tree>
              </section>
            )}
          </For>
        </div>
      </div>
    </div>
  )
}

/** Props for `<PaletteMenu>`. */
export type PaletteMenuProps = {
  /** a click on a part picks it up to place, rather than adding it at once.  Default:  `false`. */
  picksUp?: boolean
}

/**
 * App views' rows, or This page's, that match `words`:  the popup's first group, and the add bar's.
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
          aria-description={appTexts.text("paletteNewViewTip")}
          ref={(row: Element) => {
            chooseRow(() => Palette.addNewView())(row)
            describes(row, () => appTexts.text("paletteNewViewTip"))
          }}
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

/**
 * Pick `definition` up to place with the next click in the app (`PartPlacing`, epic `editor` T153):  the flyouts close,
 * and Enter (a key, not a click) starts the drop line at the app's first place.
 */
function pickUp(definition: ComponentDefinition, event: Event | undefined): void {
  Palette.closeMenus()
  PartPlacing.pickUp(
    {
      label: definition.name,
      title: stepTitle(definition),
      codesFor: (file) => {
        Inspector.readyWordsNext()
        return [snippetFor(definition, file)]
      }
    },
    { keyboard: event instanceof KeyboardEvent }
  )
}

/** The icon of the app's own views, in the palette. */
const OWN_VIEW_ICON = "cube"

/** The icon of a group in the add bar whose table names none (`paletteGroups.json`'s `icon`). */
const GROUP_ICON = "shapes"

/** The icon of a page's new view of its own, in the palette. */
const NEW_VIEW_ICON = "plus square outline"

/**
 * One thing that can be added:  a click adds it, a drag places it.
 * - `picksUp`, in the add bar's flyouts:  a click (or Enter) picks it up instead, to put in the app with the next click
 *   (`PartPlacing`, epic `editor` T153);  in the top bar's popup it's added at once.
 * - Its star, at its end, stars it, or takes its star away (epic `editor` T152):  shown while the row is hovered or
 *   focused, and always on a starred one;  no tooltip, people know a star (T165);  its icon alone, no box, only its colour changing under the mouse (T162).
 * - No tooltip of its description either:  the menu's own field shows it while the row is hovered (`<PartAbout>`).
 * - `children`:  its family's rows, inside it (`<PartRows>`), shown while `isOpen`.
 */
function PaletteRow(props: {
  definition: ComponentDefinition
  picksUp?: boolean
  isOpen?: boolean
  children?: JSX.Element
}): JSX.Element {
  const isStarred = () => Palette.isFavorite(props.definition)
  const starText = () => appTexts.text(isStarred() ? "paletteUnstar" : "paletteStar", { part: props.definition.name })
  return (
    <ui-tree-item
      icon={props.definition.icon}
      label={props.definition.name}
      aria-description={props.definition.description}
      open={props.isOpen ? "" : undefined}
      ref={(row: Element) => {
        chooseRow((event) => (props.picksUp ? pickUp(props.definition, event) : Palette.add(props.definition)))(row)
        startsDrag(row, props.definition)
        describes(row, () => props.definition.description)
      }}
    >
      <ui-button
        slot="actions"
        class={["PaletteStar", { starred: isStarred() }]}
        size="mini"
        icon={isStarred() ? "star" : "star outline"}
        aria-pressed={isStarred() ? "true" : "false"}
        aria-label={starText()}
        onPointerDown={(event: PointerEvent) => event.stopPropagation()}
        onClick={(event: MouseEvent) => {
          event.stopPropagation()
          Palette.toggleFavorite(props.definition)
        }}
      />
      {props.children}
    </ui-tree-item>
  )
}

/**
 * The rows of `parts` that match `words`, each family's own parts inside its main one (`partBranches()`, T162):
 * `Statistics` and `Value` inside `Statistic`, always open.
 */
function PartRows(props: {
  parts: readonly ComponentDefinition[]
  words: () => string
  picksUp?: boolean
}): JSX.Element {
  return (
    <For each={partBranches(props.parts, props.words())}>
      {(branch: PartBranch) => (
        <PaletteRow definition={branch.definition} picksUp={props.picksUp} isOpen={branch.inside.length > 0}>
          <For each={branch.inside}>
            {(definition) => <PaletteRow definition={definition} picksUp={props.picksUp} />}
          </For>
        </PaletteRow>
      )}
    </For>
  )
}

/** The description of the part under the mouse or focused, in a menu of parts:  `<PartAbout>` shows it. */
const [described, setDescribed] = createSignal<string>()

/** `row`, hovered or focused, has `<PartAbout>` show `description`;  left, the hint again. */
function describes(row: Element, description: () => string | undefined): void {
  const show = () => setDescribed(description())
  const hide = () => setDescribed(undefined)
  row.addEventListener("pointerenter", show)
  row.addEventListener("pointerleave", hide)
  row.addEventListener("focusin", show)
  row.addEventListener("focusout", hide)
}

/**
 * ### `<PartAbout>`
 * What the part under the mouse (or the keyboard's focus) is, in a menu of parts (epic `editor` T165:  "have a field
 * somewhere that describes the item on hover"):  its description, from Spell UI's vocabularies, in place of a tooltip.
 * - With none hovered:  how to add one, "Click or drag to add to the page".
 * - In the add panel's header, and at the foot of each of the add bar's menus.
 * - Two lines at most, three in the add bar's narrow menus, cut short with a `…`:
 *   its box always that tall, so the menu never jumps as it changes (`PaletteView.css`).
 */
function PartAbout(props: { class?: string }): JSX.Element {
  return (
    <span class={["PartAbout", props.class]}>
      <span class="PartAboutText">{described() || appTexts.text("paletteHint")}</span>
    </span>
  )
}
