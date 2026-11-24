import { For, Show, createSignal, onSettled } from "solid-js"
import type { JSX } from "@solidjs/web"

import { kebabCase, upperFirst } from "spell/util"
import type { ComponentDefinition } from "spell/ui/components/ComponentDefinitions"
import { editor } from "spell/app/app/editor"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { barTooltip, type BarTooltip } from "./chrome"
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
 * - Top to bottom:  a `+`, saying it's for adding (T162), Search, then the parts you've starred (T152),
 *   then App views (This page), then every group, as the palette's table orders them;  a divider wherever the table puts one under a group (`dividerAfter`, set on the
 *   palette groups page, `/palette`).
 * - A group's button, its icon alone, its name the tooltip, opens its parts beside the bar (`<RailFlyout>`)
 *   once the mouse rests on it (T162):  a search over them at its top, then each by name, a family's parts inside
 *   its main one.  A click on one picks it up, to put in the app with the next
 *   click (`PartPlacing`, T153);  a drag places it;  its star stars it.
 * - A starred part's button picks it up the same way;  a drag places it;  a right click takes its star away.
 * - Marked as the rail (`RAIL_MARK`), its flyouts too:  a press on it is its own while a part is picked up.
 * - Slides in the first time it shows on a page, under a top bar already drawn (epic `editor` I255);  never again,
 *   switching modes or pages:  it stays where it was.
 * - Spell UI's own:  a vertical icon `<ui-menu>`, its buttons `<ui-item>`s, its flyouts `<ui-popup>`s.
 ****************/
export function PaletteRail(): JSX.Element {
  const isArriving = Palette.takeRailArrival()
  const thisGroup = () => appTexts.text(Palette.isPageShown ? "thisPage" : "paletteAppViews")
  onSettled(() => Palette.load())
  return (
    <div class={["PaletteRailPlace", { arriving: isArriving }]} {...{ [RAIL_MARK]: "" }}>
      <div class="SplitPane PaletteRail" data-tour="add-bar">
        <div class="PaletteRailColumn">
          <div class="PaletteRailAdd">
            <ui-icon name="plus" label={appTexts.text("addPart")} />
          </div>
          <ui-menu direction="vertical" icon appearance="text" aria-label={appTexts.text("addPart")}>
            <RailFlyout id={SEARCH_FLYOUT_ID} name={appTexts.text("paletteSearchAll")} icon="search" isSearch>
              {(words) => <SearchRows words={words} />}
            </RailFlyout>
            <ui-item kind="divider" />
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

/** Search's id in the add bar. */
const SEARCH_FLYOUT_ID = `${FLYOUT_ID}search`

/** App views' (This page's) id in the add bar. */
const THIS_FLYOUT_ID = `${FLYOUT_ID}this`

/** `group`'s button's id in the add bar, which its flyout points at. */
function flyoutId(group: PaletteGroup): string {
  return `${FLYOUT_ID}${kebabCase(group.title ?? group.topic ?? "")}`
}

/** An add bar button's tooltip:  to the bar's right, as the top bar's are under it. */
function railTooltip(text: string): BarTooltip {
  return { ...barTooltip(text), "data-position": "right center" }
}

/**
 * ### `<RailFlyout>`
 * One button of the add bar, and the flyout it opens beside the bar.
 * - The button:  its icon alone, `name` its name for a screen reader;  no tooltip:  its menu, opening, names it (T162).
 * - The flyout opens as the mouse rests on the button, after the page's hover delay (`--ui-hover-delay`;  T162),
 *   or as the button gets the focus;  it stays open while the mouse is over it.
 * - The flyout:  `name` atop, a search button beside it (T162), then `rows`, handed the words typed (lowercase);
 *   - the search button slides the field open over the name, "Search <group>" (`<ui-search collapsed>`);
 *     Search's own (`isSearch`) is open from the start
 *     ⌘F jumps into it (T166)
 *   at its foot, what the part under the mouse is (`<PartAbout>`, epic `editor` T165).
 * - Choosing a row, or dragging one, closes it (`Palette.closeMenus()`).
 */
function RailFlyout(props: {
  id: string
  name: string
  icon: string
  /** Search's own:  its field open from the start, as searching is all it's for */
  isSearch?: boolean
  children: (words: () => string) => JSX.Element
}): JSX.Element {
  const [filter, setFilter] = createSignal("")
  const words = () => filter().trim().toLowerCase()
  return (
    <>
      <ui-item id={props.id} class="PaletteRailButton" icon={props.icon} aria-haspopup="menu" aria-label={props.name} />
      <ui-popup
        for={props.id}
        open-on="hover"
        position="right top"
        class={["BarMenuPopup", "PaletteFlyout"]}
        aria-label={props.name}
        ref={closesWithPalette}
        {...{ [RAIL_MARK]: "" }}
      >
        <div class="PaletteFlyoutHead">
          <span class="PaletteFlyoutName">{props.name}</span>
          <ui-search
            class="PaletteFlyoutSearch"
            collapsed={props.isSearch ? undefined : ""}
            size="small"
            shortcut="mod+F"
            show-no-results="false"
            aria-label={appTexts.text("paletteSearchIn", { group: props.name })}
            placeholder={props.isSearch ? props.name : appTexts.text("paletteSearchIn", { group: props.name })}
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

/** Search's rows:  every group with a match, each a row holding its matches;  App views (This page) first. */
function SearchRows(props: { words: () => string }): JSX.Element {
  const thisGroup = () => appTexts.text(Palette.isPageShown ? "thisPage" : "paletteAppViews")
  return (
    <>
      <Show when={thisGroupMatches(props.words())}>
        <ui-tree-item label={thisGroup()} icon={OWN_VIEW_ICON} open>
          <ThisGroupRows words={props.words} />
        </ui-tree-item>
      </Show>
      <For each={groupsMatching(props.words())}>
        {(group) => (
          <ui-tree-item label={upperFirst(groupName(group))} icon={group.icon ?? GROUP_ICON} open>
            <PartRows parts={partsOf(group)} words={props.words} picksUp />
          </ui-tree-item>
        )}
      </For>
    </>
  )
}

/**
 * A starred part's button in the add bar (epic `editor` T152):  a click picks it up to place with the next click in
 * the app (`PartPlacing`, T153), a drag places it, a right click takes its star away.
 */
function FavoriteButton(props: { definition: ComponentDefinition }): JSX.Element {
  // lit while it's the part picked up to place
  const [isPicked, setPicked] = createSignal(false)
  onSettled(() => PartPlacing.watch(() => setPicked(PartPlacing.isPicked(props.definition.name))))
  return (
    <ui-item
      class={["PaletteRailButton", "PaletteFavorite"]}
      icon={props.definition.icon ?? GROUP_ICON}
      selected={isPicked()}
      aria-label={props.definition.name}
      {...railTooltip(appTexts.text("paletteFavoriteTip", { part: props.definition.name }))}
      onClick={(event: MouseEvent) => pickUp(props.definition, event)}
      onContextMenu={(event: MouseEvent) => {
        event.preventDefault()
        Palette.toggleFavorite(props.definition)
      }}
      ref={(element: Element) => startsDrag(element, props.definition)}
    />
  )
}

/**
 * The palette as a menu, in columns:
 * what to do and its search, then App views, the app's own views, then every part, by topic.
 * - Every group shows everything in it, as the palette's table orders it (`ui/paletteGroups.json`;  epic `editor` I174, T81).
 * - A search looks through all of them, by name, other names and description.
 * - Its header's words say what the part under the mouse is, else how to add one (`<PartAbout>`, epic `editor` T165).
 */
export function PaletteMenu(): JSX.Element {
  const [filter, setFilter] = createSignal("")
  const words = () => filter().trim().toLowerCase()
  /** Its first group's name:  This page on a page that draws its body, else App views. */
  const thisGroup = () => (Palette.isPageShown ? "thisPage" : "paletteAppViews")
  return (
    <div class="PaletteBody">
      <div class="PaletteHead">
        <PartAbout class="PaletteHint" />
        <ui-input
          class="PaletteSearch"
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

/** `group`'s parts, all of them:  the palette's own group, not a search's cut of it (`groupsMatching()`). */
function partsOf(group: PaletteGroup): readonly ComponentDefinition[] {
  return offered().find((each) => groupName(each) === groupName(group))?.parts ?? group.parts
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
