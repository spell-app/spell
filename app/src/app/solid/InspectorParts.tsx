import { For, Loading, Show, createEffect, createMemo, createSignal, untrack } from "solid-js"
import type { JSX } from "@solidjs/web"

import { scrollIntoSight } from "spell/util"
import { editor, runtimeCore } from "spell/app/app/editor"
import { editorPrefs } from "spell/app/app/editorPrefs"
import { appTexts, type AppTextKey } from "spell/app/app/ui/AppTexts"
import { SpellElement } from "spell/app/app/runner/SpellElement"
import {
  Inspector,
  addressKey,
  isThing,
  type InspectorBand,
  type InspectorPanel,
  type PartRow,
  type SlicePlace
} from "./Inspector"
import { LazyMonaco } from "./LazyMonaco"
import { InspectorActions, type ActionParameter, type InspectorAction } from "./InspectorActions"
import { enabledWhenInSource, type WrittenEvent } from "./InspectorSource"
import { PartEdits } from "./PartEdits"
import { chooseRow, treeChoosesRows, whenRowToggled } from "./treeRows"
import { on } from "./on"

/****************
 * ### `<InspectorCard>`
 * One of the Inspector's cards:  a pane (`<ui-panel appearance="pane">`), ONE bar over its body.
 * - The bar:  the chevron, then `bar` (the card's tabs, or what's selected), its `actions`, and the eye.
 * - The chevron folds the card to its bar, or unfolds it (`Inspector.toggleFolded()`), which remembers.
 * - The eye hides the card (`Inspector.setShown()`);  the Inspector's button, held, shows it again.
 * - The body scrolls by itself, and is drawn only while the card is unfolded.
 ****************/
export function InspectorCard(props: {
  /** Which card. */
  panel: InspectorPanel
  /** What a screen reader calls it. */
  label: string
  /** What the bar says:  `<ui-item>`s, or `slot="title"`. */
  bar?: JSX.Element
  /** Its own buttons, before the eye:  `slot="right"`. */
  actions?: JSX.Element
  /** The body's class. */
  class?: string
  /** The body. */
  children?: JSX.Element
}): JSX.Element {
  const isFolded = () => Inspector.isFolded(props.panel)
  const setFolded = (folded: boolean) => {
    if (folded !== isFolded()) Inspector.toggleFolded(props.panel)
  }
  return (
    <ui-panel
      appearance="pane"
      class={["InspectorCard", { folded: isFolded() }]}
      data-panel={props.panel}
      label={props.label}
      collapsible=""
      fold-icon="start"
      open={isFolded() ? "false" : undefined}
      ref={(panel: HTMLElement) => {
        // its own:  a row of a tree inside it sends these too
        on("ui-closing", (event) => {
          if (event.target === panel) setFolded(true)
        })(panel)
        on("ui-opening", (event) => {
          if (event.target === panel) setFolded(false)
        })(panel)
      }}
    >
      <ui-toolbar slot="actions" appearance="segmented link header" tabs="" shrinkable="" label={props.label}>
        {props.bar}
        {props.actions}
        {/* an eye, not a ✕:  it hides the card, never lets go of what's selected (`<LetGo>`, I92) */}
        <ui-icon
          slot="right"
          name="eye slash"
          link=""
          label={appTexts.text("inspectorHide")}
          title={appTexts.text("inspectorHide")}
          onClick={() => Inspector.setShown(props.panel, false)}
        />
      </ui-toolbar>
      <Show when={!isFolded()}>
        <div class={["Inspector", "InspectorSection", props.class]}>{props.children}</div>
      </Show>
    </ui-panel>
  )
}

/**
 * The running app's parts (reactive):  walked again whenever its drawing changes, once a frame at most.
 * - Then what was selected is selected again, if it was redrawn (`Inspector.restoreSelection()`).
 * - Call it in a component:  it watches the app while the component lives.
 */
export function appParts(): () => PartRow[] {
  const [redrawn, setRedrawn] = createSignal(0)
  createEffect(
    () => Inspector.area,
    (area) => {
      if (!area) return
      let frame = 0
      const observer = new MutationObserver(() => {
        frame ||= requestAnimationFrame(() => {
          frame = 0
          setRedrawn((count) => count + 1)
        })
      })
      observer.observe(area, { childList: true, subtree: true })
      return () => {
        observer.disconnect()
        cancelAnimationFrame(frame)
      }
    }
  )
  const rows = createMemo(() => {
    redrawn()
    const area = Inspector.area
    return area ? Inspector.partsIn(area) : []
  })
  // what was selected comes back, once the app's drawn again
  createEffect(rows, (rows) => {
    Inspector.restoreSelection(rows)
  })
  return rows
}

/****************
 * ### `<InspectorViews>`
 * The Inspector's bottom card:  the running app as ONE tree (`<ui-tree>`), with what it draws and what it doesn't.
 * - It's an `<InspectorCard>`:  the chevron, its name, then its actions.
 * - The header's magnifying glass opens a filter in that same row:  no new row until you ask for it.
 *   Esc or the glass again closes it, and the tree is as it was (`filter`).
 * - The header's double chevron closes every row, or opens them all.
 * - The header's sort puts each row's parts in document order, by name or by type, remembered (`ViewsOrder`).
 * - What the app made but doesn't draw, the deck say, is its own group:  a click shows it in the Inspector.
 ****************/
export function InspectorViews(props: {
  /** The app's parts (`appParts()`). */
  rows: readonly PartRow[]
}): JSX.Element {
  const [filter, setFilter] = createSignal<string>()
  const nodes = createMemo(() => sortedNodes(nodesFor(props.rows), viewsOrder()))
  const parents = () => {
    const walk = (list: readonly PartNode[]): PartNode[] =>
      list.flatMap((node) => (node.children.length ? [node, ...walk(node.children)] : []))
    return walk(nodes())
  }
  const isAllFolded = () => {
    const folded = foldedKeys()
    return parents().length > 0 && parents().every((node) => folded.has(node.key))
  }
  const toggleFilter = () => setFilter((text) => (text === undefined ? "" : undefined))
  return (
    <InspectorCard
      panel="views"
      label={appTexts.text("inspectorParts")}
      class="InspectorViews"
      bar={
        <Show when={filter() !== undefined} fallback={<span slot="title">{appTexts.text("inspectorParts")}</span>}>
          <ui-input
            slot="title"
            class="InspectorFilter"
            size="small"
            aria-label={appTexts.text("inspectorFilter")}
            placeholder={appTexts.text("inspectorFilter")}
            ref={(input: HTMLElement) => {
              on<{ value: string }>("ui-typed", (event) => setFilter(event.detail.value))(input)
              input.addEventListener("keydown", (event) => {
                if (event.key === "Escape") setFilter(undefined)
              })
              queueMicrotask(() => input.focus())
            }}
          />
        </Show>
      }
      actions={
        <>
          <ViewsSort />
          <ui-icon
            slot="right"
            name="search"
            link=""
            label={appTexts.text("inspectorFilter")}
            title={appTexts.text("inspectorFilter")}
            onClick={toggleFilter}
          />
          <Show when={parents().length}>
            <ui-icon
              slot="right"
              name={isAllFolded() ? "angle double down" : "angle double up"}
              link=""
              label={appTexts.text(isAllFolded() ? "inspectorExpandAll" : "inspectorCollapseAll")}
              title={appTexts.text(isAllFolded() ? "inspectorExpandAll" : "inspectorCollapseAll")}
              onClick={() => setFolds(isAllFolded() ? [] : parents().map((node) => node.key))}
            />
          </Show>
        </>
      }
    >
      <PartsTree rows={props.rows} nodes={nodes()} filter={filter()} />
    </InspectorCard>
  )
}

/****************
 * ### `<PartsTree>`
 * The running app as a tree (`<ui-tree>`):  its parts, nested as they are in the app, then what it made but doesn't draw.
 * - A part is a drawn thing or a Spell UI element (`Inspector.isPart()`);  the elements between them are skipped.
 * - A row says what a person would (`Inspector.rowWordsFor()`), how it's written in its tooltip.
 * - Clicking a row selects that part, and Shift, Command or Control several, as in the app.
 * - A part with parts inside closes;  what's closed is remembered with the project.
 * - What's not drawn:  a group of its own, closed to start.  A click inspects the thing (`Inspector.inspectThing()`).
 ****************/
function PartsTree(props: { rows: readonly PartRow[]; nodes: readonly PartNode[]; filter?: string }): JSX.Element {
  const shown = () => shownIn(props.nodes, foldedKeys())
  // what's selected, however it came to be:  the rows around it open, so its row can be seen
  createEffect(
    () => Inspector.selected?.element,
    (element) => {
      // once this update's done:  folds written while a selection settles redrew the app's pane (I18)
      if (element) queueMicrotask(() => openRowsAround(props.nodes, element))
    }
  )
  const notDrawn = createMemo(() => {
    const drawn = new Set(props.rows.map((row) => SpellElement.thingOf(row.element)))
    const things = (runtimeCore()?.things.all() ?? []).filter((thing) => !drawn.has(thing))
    return sortedThings(things, viewsOrder())
  })
  return (
    <Show when={props.rows.length} fallback={<p class="InspectorTip">{appTexts.text("inspectorNoParts")}</p>}>
      <ui-tree
        class="InspectorTree"
        choose="many"
        label={appTexts.text("inspectorParts")}
        filter={props.filter ?? ""}
        ref={treeChoosesRows}
      >
        <For each={props.nodes} keyed={(node) => node.element}>
          {(node) => <PartItem node={node()} shown={shown} />}
        </For>
        <Show when={notDrawn().length}>
          <ui-tree-item
            group=""
            icon="eye slash outline"
            label={appTexts.text("inspectorNotDrawn")}
            which={String(notDrawn().length)}
            open={isFolded(NOT_DRAWN_KEY) ? undefined : ""}
            ref={whenRowToggled(() => toggleFold(NOT_DRAWN_KEY))}
          >
            <For each={notDrawn()}>
              {(thing) => (
                <ui-tree-item
                  icon="cube"
                  label={Inspector.thingLabel(thing)}
                  selected={Inspector.inspected?.value === thing}
                  ref={chooseRow(() => Inspector.inspectThing(thing))}
                />
              )}
            </For>
          </ui-tree-item>
        </Show>
      </ui-tree>
    </Show>
  )
}

/** Open the rows around `element`'s, among `nodes`, in one change:  its row then scrolls into view. */
function openRowsAround(nodes: readonly PartNode[], element: Element): void {
  const around = keysAround(nodes, element)
  const folded = foldedKeys()
  if (around?.some((key) => folded.has(key))) setFolds([...folded].filter((key) => !around.includes(key)))
}

/** The keys of the rows around `element`'s, outermost first:  `undefined` if it isn't among `nodes`. */
function keysAround(nodes: readonly PartNode[], element: Element): string[] | undefined {
  for (const node of nodes) {
    if (node.element === element) return []
    const inside = keysAround(node.children, element)
    if (inside) return [node.key, ...inside]
  }
  return undefined
}

/** One part's row, with the parts inside it. */
function PartItem(props: { node: PartNode; shown: () => Element[] }): JSX.Element {
  const words = () => Inspector.rowWordsFor(props.node.element)
  return (
    <ui-tree-item
      icon={Inspector.iconFor(props.node.element)}
      label={words().label}
      which={words().which}
      title={words().tag}
      selected={Inspector.isSelected(props.node.element)}
      open={isFolded(props.node.key) ? undefined : ""}
      ref={(row: Element) => {
        PartEdits.rememberRow(row, props.node.element)
        whenRowToggled(() => toggleFold(props.node.key))(row)
        chooseRow((event) => Inspector.clicked(props.node.element, props.shown(), event as MouseEvent))(row)
        // selected from elsewhere, a click in the code or the app:  its row comes into view,
        // again once the rows around it open (`openRowsAround()`), as it was hidden till then
        createEffect(
          () => Inspector.selected?.element === props.node.element && foldedKeys(),
          (isLast) => {
            if (isLast) requestAnimationFrame(() => scrollIntoSight(row))
          }
        )
      }}
    >
      <For each={props.node.children} keyed={(child) => child.element}>
        {(child) => <PartItem node={child()} shown={props.shown} />}
      </For>
    </ui-tree-item>
  )
}

/** A row of the tree:  its part, its key, and the parts inside it. */
type PartNode = { element: Element; key: string; children: PartNode[] }

/** `rows` nested, as the tree shows them. */
function nodesFor(rows: readonly PartRow[]): PartNode[] {
  const top: PartNode[] = []
  const around: PartNode[] = []
  rows.forEach((row, index) => {
    const node = { element: row.element, key: addressKey({ index, tag: row.element.localName }), children: [] }
    around.length = row.depth
    ;(around.at(-1)?.children ?? top).push(node)
    around.push(node)
  })
  return top
}

/** The parts on screen in the tree, in its order:  a closed part's own parts aren't. */
function shownIn(nodes: readonly PartNode[], folded: ReadonlySet<string>): Element[] {
  return nodes.flatMap((node) => [node.element, ...(folded.has(node.key) ? [] : shownIn(node.children, folded))])
}

/****************
 * ### `<ViewsSort>`
 * The Views card's sort, at the right of its header:  a dropdown showing only its icon, the order in use ticked.
 ****************/
function ViewsSort(): JSX.Element {
  return (
    <ui-dropdown
      slot="right"
      class="ViewsSort"
      direction="left"
      title={appTexts.text("inspectorSort")}
      aria-label={appTexts.text("inspectorSort")}
      ref={on<{ value: string }>("ui-changed", (event) => {
        const { value } = event.detail
        if (VIEWS_ORDERS.some((it) => it.id === value)) setViewsOrder(value as ViewsOrder)
        // chosen again next time:  a dropdown tells only of a new value
        const dropdown = event.currentTarget as HTMLElement & { value: string }
        queueMicrotask(() => (dropdown.value = ""))
      })}
    >
      <ui-icon slot="icon" name="sort amount down" />
      <For each={VIEWS_ORDERS}>
        {(it) => (
          <ui-item value={it.id} icon={viewsOrder() === it.id ? "check" : it.icon}>
            {appTexts.text(it.text)}
          </ui-item>
        )}
      </For>
    </ui-dropdown>
  )
}

/**
 * How the Views tree lists each row's parts:
 * - `document`:  as the app draws them
 * - `name`:  by what a row says, ignoring case
 * - `type`:  by what each is, its tag, then by name
 */
type ViewsOrder = "document" | "name" | "type"

/** Each order, as a row of `<ViewsSort>`;  `text` its words' key. */
const VIEWS_ORDERS: Array<{ id: ViewsOrder; icon: string; text: AppTextKey }> = [
  { id: "document", icon: "list ol", text: "inspectorSortDocument" },
  { id: "name", icon: "sort alphabet down", text: "inspectorSortName" },
  { id: "type", icon: "cubes", text: "inspectorSortType" }
]

/** The pref remembering the order, the same for every project. */
const ORDER_PREF = "inspector:order"
editorPrefs.declare(ORDER_PREF, { oneOf: VIEWS_ORDERS.map((it) => it.id) })

const [viewsOrder, setOrder] = createSignal<ViewsOrder>((editorPrefs.get(ORDER_PREF) as ViewsOrder) ?? "document")

/** Sort the tree by `order`;  remembered. */
function setViewsOrder(order: ViewsOrder): void {
  setOrder(order)
  editorPrefs.set(ORDER_PREF, order)
}

/** `nodes` in `order`, each row's own parts too. */
function sortedNodes(nodes: PartNode[], order: ViewsOrder): PartNode[] {
  if (order === "document") return nodes
  const words = (node: PartNode) => Inspector.rowWordsFor(node.element).label
  const typeOf = (node: PartNode) => (order === "type" ? node.element.localName : "")
  return nodes
    .map((node) => ({ ...node, children: sortedNodes(node.children, order) }))
    .sort((a, b) => typeOf(a).localeCompare(typeOf(b)) || byWords(words(a), words(b)))
}

/** The things not drawn, in `order`:  as they were made, by name, or by type, then name. */
function sortedThings(things: object[], order: ViewsOrder): object[] {
  if (order === "document") return things
  const typeOf = (thing: object) => (order === "type" ? thing.constructor.name : "")
  return [...things].sort(
    (a, b) => typeOf(a).localeCompare(typeOf(b)) || byWords(Inspector.thingLabel(a), Inspector.thingLabel(b))
  )
}

/** Compares two labels as people would:  ignoring case, and with numbers in order, `T2` before `T10`. */
function byWords(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base", numeric: true })
}

/** The parts closed in the tree, by key (reactive):  this project's, remembered. */
function foldedKeys(): ReadonlySet<string> {
  foldsChanged()
  return new Set((editorPrefs.get(Inspector.projectPref(FOLDED_PREF)) as string[] | undefined) ?? [])
}

/** Is the row at `key` closed (reactive)?  What's not drawn starts closed. */
function isFolded(key: string): boolean {
  return foldedKeys().has(key) !== (key === NOT_DRAWN_KEY)
}

/** Close the part at `key`, or open it;  remember which. */
function toggleFold(key: string): void {
  const folded = new Set(foldedKeys())
  if (!folded.delete(key)) folded.add(key)
  setFolds([...folded])
}

/** Close exactly the parts at `keys`;  remember which. */
function setFolds(keys: readonly string[]): void {
  editorPrefs.set(Inspector.projectPref(FOLDED_PREF), keys)
  setFoldsChanged((count) => count + 1)
}

/** Counts the folds, so the tree reads them again. */
const [foldsChanged, setFoldsChanged] = createSignal(0)

/** The key of the "Not drawn" group, among the parts' (theirs are `<place>|<tag>`). */
const NOT_DRAWN_KEY = "not-drawn"

/** The start of the pref remembering what's folded, a project's each. */
const FOLDED_PREF = "inspector:folded"

/****************
 * ### `<CodeBand>`
 * The selected part's code, a folding band at the end of the properties card, titled Code (epic `editor`,
 * Events In Code;  Owen's pick A):  what it does when people touch it, then what can be done to it.
 * - A drawn thing's events, in its program's own words (`Inspector.writtenEventsOf()`):
 *   - first its abilities' conditions, a hand each:  `it can give up a card if`, its condition under it
 *     (an ability with no condition, `it can be dragged`, its words alone)
 *   - then its events, a bolt each:  `on click` as written (`when clicked` if written so), its code under it
 * - A Spell UI element's:  what it handles (`Inspector.eventsOf()`), `on click`, with the code it was written with.
 * - Then a thing's actions (`InspectorActions.of()`), each its run button (`<ActionRow>`) and its code.
 * - Each one's code is the code editor on its lines of the file (`<CodeSlice>`):  typing there is typing in the file.
 *   Code it can't find in the file shows as written, to read.
 * - The band's "+":  a dropdown of the DOM's everyday events not there yet (`DEFAULT_EVENTS`), each writing an empty
 *   handler in its place (`Inspector.addEvent()`), which then takes the cursor.
 * - Folds as the card's other bands do, remembered (`Inspector.setGroupFolded("events")`).
 * - Drawn while there's code to show, or an event could be added:  never a "None yet." line.
 ****************/
export function CodeBand(props: {
  /** The part selected, in the app:  its events. */
  element?: Element
  /** The thing selected (or the trail leads to):  its actions. */
  thing?: object
}): JSX.Element {
  const rows = createMemo((): EventRow[] => {
    const element = props.element
    if (!element) return []
    // read again as a handler's added (`justAdded`), not on every key typed in one:  each row's editor follows its lines
    void Inspector.justAdded
    return untrack(() => {
      if (!Inspector.isDrawnThing(element)) {
        const handlers = Inspector.writtenHandlersOf(element)
        return Inspector.eventsOf(element).map((event) => eventRow(event, handlers[event] ?? ""))
      }
      return Inspector.writtenEventsOf(element).map((row) => ({ ...row, key: row.words }))
    })
  })
  const actions = createMemo(() => {
    const core = runtimeCore()
    return core && props.thing && isThing(props.thing)
      ? InspectorActions.of(props.thing, core, editor.programWords)
      : []
  })
  const addable = () =>
    props.element
      ? DEFAULT_EVENTS.filter(
          (event) => !rows().some((row) => row.key === event || sameWords(row.words, onWords(event)))
        )
      : []
  return (
    <Show when={rows().length || addable().length || actions().length}>
      <ui-property-group
        class="InspectorEvents"
        label={appTexts.text("inspectorCode")}
        collapsible=""
        open={Inspector.isGroupFolded("events") ? "false" : undefined}
        ref={foldRemembered("events")}
      >
        <Show when={addable().length}>
          <ui-dropdown
            slot="output"
            class="InspectorAddEvent"
            aria-label={appTexts.text("inspectorAddEvent")}
            title={appTexts.text("inspectorAddEvent")}
            onClick={(event: MouseEvent) => event.stopPropagation()}
            ref={on<{ value: string }>("ui-changed", (event) => {
              if (event.detail.value && props.element) Inspector.addEvent(props.element, event.detail.value)
            })}
          >
            <ui-icon slot="trigger" name="plus" />
            <For each={addable()}>{(event) => <ui-item value={event}>{eventText(event)}</ui-item>}</For>
          </ui-dropdown>
        </Show>
        <Show when={props.element} keyed>
          {(element) => (
            <For each={rows()} keyed={(row) => `${row.kind}|${row.key}`}>
              {(row) => <EventCode element={element} row={row()} />}
            </For>
          )}
        </Show>
        <Show when={props.thing} keyed>
          {(thing) => (
            <For each={actions()} keyed={(action) => action.name}>
              {(action) => <ActionCode thing={thing} action={action()} />}
            </For>
          )}
        </Show>
      </ui-property-group>
    </Show>
  )
}

/** One row of the Code band's events:  an event or an ability, as written, its code, and its key. */
type EventRow = WrittenEvent & {
  /** Which it is, among the part's:  the DOM event (`click`), else its words. */
  key: string
}

/** The row for DOM event `event` (`click`):  `on click`, with `code`. */
function eventRow(event: string, code: string): EventRow {
  return { kind: "event", key: event, words: onWords(event), code }
}

/** DOM event `event`'s words:  `on click`, `on mouse down`. */
function onWords(event: string): string {
  return appTexts.text("inspectorEventHeading", { event: eventText(event) })
}

/** Are `a` and `b` the same words, whatever their spacing and case? */
function sameWords(a: string, b: string): boolean {
  return a.replace(/\s+/g, " ").toLowerCase() === b.replace(/\s+/g, " ").toLowerCase()
}

/** A band's fold, remembered:  its `ui-closing` and `ui-opening` tell the Inspector. */
function foldRemembered(band: InspectorBand): (group: HTMLElement) => void {
  return (group) => {
    on("ui-closing", () => Inspector.setGroupFolded(band, true))(group)
    on("ui-opening", () => Inspector.setGroupFolded(band, false))(group)
  }
}

/**
 * One of a part's events or abilities:  its icon and words, then its code, in the file (`<WrittenCode>`).
 * - An event's icon a bolt;  an ability's a hand.
 * - An ability with no condition (`it can be dragged`):  its words alone.
 * - Where its code is, read once as it's drawn:  its editor follows its lines from then on.
 */
function EventCode(props: { element: Element; row: EventRow }): JSX.Element {
  const isEvent = props.row.kind === "event"
  const place = Inspector.placeOfEvent(props.element, props.row)
  const isAdded = Inspector.justAdded !== "" && sameWords(Inspector.justAdded, props.row.key)
  // once drawn:  a write while drawing is refused
  if (isAdded) queueMicrotask(() => Inspector.tookCursor())
  return (
    <section class={["InspectorEvent", props.row.kind]}>
      <h3>
        <ui-icon name={isEvent ? EVENT_ICON : ABILITY_ICON} />
        {props.row.words}
      </h3>
      <Show when={place || props.row.code}>
        <WrittenCode place={place} code={props.row.code} focus={isAdded} />
      </Show>
    </section>
  )
}

/** One of a thing's actions:  its run button and fields (`<ActionRow>`), then its code, in the file. */
function ActionCode(props: { thing: object; action: InspectorAction }): JSX.Element {
  const place = Inspector.placeOfAction(props.thing, props.action)
  return (
    <section class="InspectorEvent action">
      <ActionRow thing={props.thing} action={props.action} />
      <Show when={place}>{(found) => <WrittenCode place={found()} code="" />}</Show>
    </section>
  )
}

/**
 * Code as written in the program:  the code editor on its lines of the file (`<CodeSlice>`, loaded with Monaco),
 * else -- its lines not found -- the text, to read.
 */
function WrittenCode(props: { place: SlicePlace | undefined; code: string; focus?: boolean }): JSX.Element {
  return (
    <Show when={props.place} fallback={<pre class="InspectorCode">{props.code}</pre>}>
      {(place) => (
        <Loading fallback={<pre class="InspectorCode">{props.code}</pre>}>
          <LazyMonaco.CodeSlice
            file={place().file}
            from={place().from}
            to={place().to}
            column={place().column}
            focus={props.focus}
          />
        </Loading>
      )}
    </Show>
  )
}

/** An event's icon, in the Code band:  a bolt. */
const EVENT_ICON = "bolt"
/** An ability's icon, in the Code band:  a hand. */
const ABILITY_ICON = "hand paper outline"

/**
 * One action:  its button, then a field for each thing it takes.
 * - Its button is off while it isn't enabled, while a field is empty, and while it runs.
 */
function ActionRow(props: { thing: object; action: InspectorAction }): JSX.Element {
  const [args, setArgs] = createSignal<unknown[]>(props.action.parameters.map(() => undefined))
  const [isRunning, setRunning] = createSignal(false)
  const isEnabled = () => runtimeCore()?.isActionEnabled(props.thing, props.action.name) ?? false
  const isReady = () => args().every((arg) => arg !== undefined && arg !== "")
  const why = () => {
    if (!isEnabled()) {
      const sources = editor.project?.spellFiles.map((file) => file.contents ?? "") ?? []
      const condition = enabledWhenInSource(props.action.words, sources)
      return condition
        ? appTexts.text("inspectorActionOnlyWhen", { condition })
        : appTexts.text("inspectorActionNotNow")
    }
    return isReady() ? undefined : appTexts.text("inspectorActionNeeds")
  }
  const setArg = (index: number, value: unknown) => setArgs((all) => all.map((arg, at) => (at === index ? value : arg)))
  const press = () => {
    const core = runtimeCore()
    if (!core) return
    const waiting = InspectorActions.run(core, props.thing, props.action, args())
    if (!waiting) return
    setRunning(true)
    void waiting.finally(() => setRunning(false))
  }
  return (
    <div class={["InspectorAction", { many: props.action.parameters.length > 1, off: !isEnabled() }]} title={why()}>
      <ui-button
        size="small"
        appearance="basic"
        icon="play"
        class="InspectorActionButton"
        disabled={!isEnabled() || !isReady() || isRunning() ? "" : undefined}
        loading={isRunning() ? "" : undefined}
        onClick={press}
      >
        {props.action.label}
      </ui-button>
      <For each={props.action.parameters}>
        {(parameter, index) => (
          <ActionParameterField parameter={parameter} onChange={(value) => setArg(index(), value)} />
        )}
      </For>
    </div>
  )
}

/**
 * A field for something an action takes, by its type:
 * - one of the program's types (`a pile`):  a select of the running program's things of that type, sub-types'
 *   too, by their titles (`Foundation · clubs`)
 * - anything else:  an input, read as spell would read a value (`InspectorActions.valueFrom()`)
 */
function ActionParameterField(props: { parameter: ActionParameter; onChange: (value: unknown) => void }): JSX.Element {
  const things = () => {
    const core = runtimeCore()
    return core && props.parameter.type ? InspectorActions.thingsOfType(core, props.parameter.type) : []
  }
  const placeholder = () => props.parameter.words || appTexts.text("inspectorActionValue")
  return (
    <Show
      when={props.parameter.type}
      fallback={
        <ui-input
          class="InspectorActionField"
          size="small"
          aria-label={placeholder()}
          placeholder={placeholder()}
          ref={on<{ value: string }>("ui-typed", (event) =>
            props.onChange(InspectorActions.valueFrom(event.detail.value))
          )}
        />
      }
    >
      <ui-select
        class="InspectorActionField"
        size="small"
        aria-label={placeholder()}
        placeholder={placeholder()}
        ref={on<{ value: string }>("ui-changed", (event) => props.onChange(things()[Number(event.detail.value)]))}
      >
        <For each={things()}>
          {(thing, index) => <ui-item value={String(index())}>{Inspector.thingLabel(thing)}</ui-item>}
        </For>
      </ui-select>
    </Show>
  )
}

/** An event's name for people:  `mousedown` => `mouse down`;  one with no text of its own, as it is. */
function eventText(event: string): string {
  return (DEFAULT_EVENTS as readonly string[]).includes(event) ? appTexts.text(`event.${event}` as AppTextKey) : event
}

/** The events "+" offers, for now:  the DOM's everyday ones, each named in the texts (`event.<name>`). */
const DEFAULT_EVENTS = [
  "click",
  "dblclick",
  "mousedown",
  "mouseup",
  "mouseenter",
  "mouseleave",
  "focus",
  "blur",
  "keydown",
  "keyup"
] as const
