import { For, Match, Show, Switch, createEffect, createMemo, createSignal } from "solid-js"
import type { JSX } from "@solidjs/web"

import { editor, runtimeCore } from "spell/app/app/editor"
import { editorPrefs } from "spell/app/app/editorPrefs"
import { appTexts, type AppTextKey } from "spell/app/app/ui/AppTexts"
import type { ThingExplorerState } from "spell/app/app/ui/ui.types"
import { Inspector, addressKey, isThing, type InspectorBand, type InspectorPanel, type PartRow } from "./Inspector"
import { InspectorActions, type ActionParameter, type InspectorAction } from "./InspectorActions"
import { enabledWhenInSource, type WrittenEvent } from "./InspectorSource"
import { ThingExplorer } from "./ThingExplorer"
import { TypeExplorer } from "./TypeExplorer"
import { on } from "./on"

/****************
 * ### `<InspectorCard>`
 * The Inspector's properties card:  a header, in the editor's theme as the App pane's, over its body, in the brand's.
 * - The Views card is a pane already (`<InspectorViews>`);  this one follows once its look is settled (`editor` P2).
 * - The header:  a caret, the card's icon and title (`title`), then its own buttons (`actions`) and Close.
 * - A click on the caret or title folds the card to its header, or unfolds it (`Inspector.toggleFolded()`).
 * - Close hides the card (`Inspector.setShown()`);  the Inspector's button, held, shows it again.
 * - The body scrolls by itself, and is drawn only while the card is unfolded.
 ****************/
export function InspectorCard(props: {
  /** Which card. */
  panel: InspectorPanel
  /** Its title. */
  title: JSX.Element
  /** Its title's icon. */
  icon?: string
  /** Its own buttons, before Close. */
  actions?: JSX.Element
  /** The body's class. */
  class?: string
  /** The body. */
  children?: JSX.Element
}): JSX.Element {
  const isFolded = () => Inspector.isFolded(props.panel)
  return (
    <section class={["InspectorCard", { folded: isFolded() }]} data-panel={props.panel}>
      <header class="AppPaneHeader InspectorCardHead">
        <h2
          aria-expanded={isFolded() ? "false" : "true"}
          title={appTexts.text(isFolded() ? "inspectorUnfold" : "inspectorFold")}
          onClick={() => Inspector.toggleFolded(props.panel)}
        >
          <ui-icon name={isFolded() ? "caret right" : "caret down"} class="InspectorCardFold" />
          <Show when={props.icon}>{(icon) => <ui-icon name={icon()} />}</Show>
          {props.title}
        </h2>
        {props.actions}
        {/* an eye, not a ✕:  it hides the card, never lets go of what's picked (`<LetGo>`, I92) */}
        <ui-icon
          name="eye slash"
          link=""
          class="IconAction InspectorHideCard"
          label={appTexts.text("inspectorHide")}
          data-tooltip={appTexts.text("inspectorHide")}
          data-position="bottom right"
          data-inverted=""
          onClick={() => Inspector.setShown(props.panel, false)}
        />
      </header>
      <Show when={!isFolded()}>
        <div class={["Inspector", "InspectorSection", props.class]}>{props.children}</div>
      </Show>
    </section>
  )
}

/**
 * The running app's parts (reactive):  walked again whenever its drawing changes, once a frame at most.
 * - Then what was picked is picked again, if it was redrawn (`Inspector.restorePick()`).
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
  // what was picked comes back, once the app's drawn again
  createEffect(rows, (rows) => {
    Inspector.restorePick(rows)
  })
  return rows
}

/****************
 * ### `<InspectorViews>`
 * The Inspector's bottom card:  the app as Views, Things or Templates, which its header switches between
 * (remembered:  `VIEW_PREF`).
 * - Its header is ONE bar (`<ui-panel appearance="pane">`):  the chevron, the views, then its actions.
 *   Closed, the bar is left, still saying which view is chosen;  choosing one opens the card.
 * - Views:  the running app's parts as a tree (`<PartsTree>`);  the header's double chevron folds them all, or
 *   unfolds them all, as the epic page's does.
 * - Things:  what the running program has made, live (`<ThingExplorer>`);  a click on one inspects it at once
 *   (`Inspector.inspectThing()`), as a click on a View's row picks it.
 * - Templates:  every type the code knows (`<TypeExplorer>`).
 ****************/
export function InspectorViews(props: {
  /** The app's parts (`appParts()`). */
  rows: readonly PartRow[]
}): JSX.Element {
  const [view, setView] = createSignal((editorPrefs.get(VIEW_PREF) as ViewId | undefined) ?? "views")
  const isFolded = () => Inspector.isFolded("views")
  const setFolded = (folded: boolean) => {
    if (folded !== isFolded()) Inspector.toggleFolded("views")
  }
  // choosing a view while closed shows it
  const show = (id: ViewId) => {
    setView(id)
    editorPrefs.set(VIEW_PREF, id)
    setFolded(false)
  }
  const parents = () => shownRows(props.rows, new Set()).filter((row) => row.hasChildren)
  const isAllFolded = () => {
    const folded = foldedKeys()
    return parents().length > 0 && parents().every((row) => folded.has(row.key))
  }
  // the Things view's state, kept here so it outlives switching views
  let thingsState: ThingExplorerState = {}
  return (
    <ui-panel
      appearance="pane"
      class={["InspectorCard", { folded: isFolded() }]}
      data-panel="views"
      collapsible=""
      fold-icon="start"
      open={isFolded() ? "false" : undefined}
      ref={(panel: HTMLElement) => {
        on("ui-closing", () => setFolded(true))(panel)
        on("ui-opening", () => setFolded(false))(panel)
      }}
    >
      <span slot="label" class="ui-visually-hidden">
        {appTexts.text(VIEW_TEXTS.views)}
      </span>
      <ui-toolbar
        slot="actions"
        appearance="segmented link header"
        shrinkable=""
        label={appTexts.text(VIEW_TEXTS.views)}
      >
        <For each={VIEWS}>
          {(id) => (
            <ui-item selected={view() === id} onClick={() => show(id)}>
              <ui-icon name={VIEW_ICONS[id]} />
              {appTexts.text(VIEW_TEXTS[id])}
            </ui-item>
          )}
        </For>
        <Show when={view() === "views" && parents().length}>
          <ui-icon
            slot="right"
            name={isAllFolded() ? "angle double down" : "angle double up"}
            link=""
            label={appTexts.text(isAllFolded() ? "inspectorExpandAll" : "inspectorCollapseAll")}
            title={appTexts.text(isAllFolded() ? "inspectorExpandAll" : "inspectorCollapseAll")}
            onClick={() => setFolds(isAllFolded() ? [] : parents().map((row) => row.key))}
          />
        </Show>
        {/* an eye, not a ✕:  it hides the card, never lets go of what's picked (`<LetGo>`, I92) */}
        <ui-icon
          slot="right"
          name="eye slash"
          link=""
          label={appTexts.text("inspectorHide")}
          title={appTexts.text("inspectorHide")}
          onClick={() => Inspector.setShown("views", false)}
        />
      </ui-toolbar>
      <Show when={!isFolded()}>
        <div class="Inspector InspectorSection InspectorViews">
          <Switch>
            <Match when={view() === "views"}>
              <PartsTree rows={props.rows} />
            </Match>
            <Match when={view() === "things"}>
              <Show
                when={runtimeCore()?.things}
                keyed
                fallback={<p class="InspectorTip">{appTexts.text("inspectorNoParts")}</p>}
              >
                {(things) => (
                  <ThingExplorer
                    things={things}
                    words={editor.programWords}
                    state={thingsState}
                    onStateChange={(changed) => (thingsState = changed)}
                    onSelect={(thing) => Inspector.inspectThing(thing)}
                  />
                )}
              </Show>
            </Match>
            <Match when={view() === "templates"}>
              <TypeExplorer
                tree={editor.scopeTree}
                onOpen={editor.openScopeLink}
                loadDetails={editor.scopeDetails}
                onRefresh={() => void editor.refreshScopes()}
              />
            </Match>
          </Switch>
        </div>
      </Show>
    </ui-panel>
  )
}

/** What the Views card shows. */
const VIEWS = ["views", "things", "templates"] as const
/** One of them. */
type ViewId = (typeof VIEWS)[number]
/** Each one's name, in the card's header. */
const VIEW_TEXTS: Record<ViewId, AppTextKey> = {
  views: "inspectorParts",
  things: "inspectorThings",
  templates: "inspectorTemplates"
}
/** Each one's icon:  Things' and Templates' are the Program panel's tabs' (Templates is its Types). */
const VIEW_ICONS: Record<ViewId, string> = { views: "layer group", things: "cubes", templates: "sitemap" }
/** The pref remembering which shows. */
const VIEW_PREF = "inspector:view"

/****************
 * ### `<PartsTree>`
 * The running app's parts as a tree (epic `debut` P13, C22):  a row each, its icon and title, nested as they are
 * in the app.
 * - A part is a drawn thing or a Spell UI element (`Inspector.isPart()`);  the elements between them are skipped.
 * - Each row's title in the text's colour, which one it is (`· discards`) and its icons muted.
 * - Clicking a row picks that part;  the picked one is highlighted.
 * - A part with parts inside folds:  its caret;  what's folded is remembered with the project.
 * - Its icons are stubs (`Inspector.iconFor()`):  one for drawn things, one for Spell UI elements.
 ****************/
function PartsTree(props: { rows: readonly PartRow[] }): JSX.Element {
  const shown = createMemo(() => shownRows(props.rows, foldedKeys()))
  return (
    <Show when={props.rows.length} fallback={<p class="InspectorTip">{appTexts.text("inspectorNoParts")}</p>}>
      <ul role="tree" class="InspectorTree">
        <For each={shown()}>
          {(row) => (
            <li
              role="treeitem"
              class={{ picked: Inspector.inspected?.element === row.element }}
              style={{ "--depth": row.depth }}
              aria-selected={Inspector.inspected?.element === row.element ? "true" : "false"}
              aria-expanded={row.hasChildren ? (row.isFolded ? "false" : "true") : undefined}
              onClick={() => Inspector.pick(row.element)}
            >
              <Show when={row.hasChildren} fallback={<span class="InspectorFold" />}>
                <ui-icon
                  name={row.isFolded ? "caret right" : "caret down"}
                  class="InspectorFold"
                  onClick={(event) => {
                    event.stopPropagation()
                    toggleFold(row.key)
                  }}
                />
              </Show>
              <ui-icon name={Inspector.iconFor(row.element)} />
              <span class="InspectorTreeTitle">{Inspector.labelPartsFor(row.element).title}</span>
              <Show when={Inspector.labelPartsFor(row.element).which}>
                {(which) => <span class="InspectorTreeWhich">{which()}</span>}
              </Show>
            </li>
          )}
        </For>
      </ul>
    </Show>
  )
}

/** A row of the tree as shown:  its part, its key, and whether it has parts inside, folded away. */
type ShownRow = PartRow & { key: string; hasChildren: boolean; isFolded: boolean }

/** `rows` as the tree shows them:  each with its key, the parts inside a folded one left out. */
function shownRows(rows: readonly PartRow[], folded: ReadonlySet<string>): ShownRow[] {
  const shown: ShownRow[] = []
  // rows deeper than this are inside a folded part
  let hiddenBelow = Infinity
  rows.forEach((row, index) => {
    if (row.depth > hiddenBelow) return
    hiddenBelow = Infinity
    const key = addressKey({ index, tag: row.element.localName })
    const hasChildren = (rows[index + 1]?.depth ?? -1) > row.depth
    const isFolded = hasChildren && folded.has(key)
    if (isFolded) hiddenBelow = row.depth
    shown.push({ ...row, key, hasChildren, isFolded })
  })
  return shown
}

/** The parts folded in the tree, by key (reactive):  this project's, remembered. */
function foldedKeys(): ReadonlySet<string> {
  foldsChanged()
  return new Set((editorPrefs.get(Inspector.projectPref(FOLDED_PREF)) as string[] | undefined) ?? [])
}

/** Fold the part at `key`, or unfold it;  remember which. */
function toggleFold(key: string): void {
  const folded = new Set(foldedKeys())
  if (!folded.delete(key)) folded.add(key)
  setFolds([...folded])
}

/** Fold exactly the parts at `keys`;  remember which. */
function setFolds(keys: readonly string[]): void {
  editorPrefs.set(Inspector.projectPref(FOLDED_PREF), keys)
  setFoldsChanged((count) => count + 1)
}

/** Counts the folds, so the tree reads them again. */
const [foldsChanged, setFoldsChanged] = createSignal(0)

/** The start of the pref remembering what's folded, a project's each. */
const FOLDED_PREF = "inspector:folded"

/****************
 * ### `<EventsBand>`
 * The picked part's events, a folding band at the end of the properties card, titled Events (epic `debut` P28):
 * what it does when people touch it.
 * - A drawn thing's, in its program's own words (`Inspector.writtenEventsOf()`):
 *   - first its abilities' conditions, a hand each:  `it can give up a card if`, its condition under it
 *     (an ability with no condition, `it can be dragged`, its words alone)
 *   - then its events, a bolt each:  `on click` as written (`when clicked` if written so), its code under it
 * - A Spell UI element's:  what it handles (`Inspector.eventsOf()`), `on click`, with the code it was written with.
 * - Each code box grows as it's typed into (`<EventCode>`);  what's typed is kept with the project (T18).
 * - Then the events added here, with the band's "+":  a dropdown of the DOM's everyday events not there yet
 *   (`DEFAULT_EVENTS`).
 * - Folds as the card's other bands do, remembered (`Inspector.setGroupFolded("events")`).
 * - Drawn while the part has an event, or one could be added:  never a "None yet." line.
 ****************/
export function EventsBand(props: {
  /** The part picked, in the app. */
  element: Element
}): JSX.Element {
  const rows = createMemo((): EventRow[] => {
    const element = props.element
    if (!Inspector.isDrawnThing(element)) {
      const handlers = Inspector.writtenHandlersOf(element)
      return Inspector.eventsOf(element).map((event) => eventRow(event, handlers[event] ?? ""))
    }
    const written = Inspector.writtenEventsOf(element).map((row) => ({ ...row, key: row.words }))
    const added = Inspector.addedEventsOf(element)
      .filter((event) => !written.some((row) => sameWords(row.words, onWords(event))))
      .map((event) => eventRow(event, ""))
    return [...written, ...added]
  })
  const addable = () =>
    DEFAULT_EVENTS.filter((event) => !rows().some((row) => row.key === event || sameWords(row.words, onWords(event))))
  return (
    <Show when={rows().length || addable().length}>
      <ui-property-group
        class="InspectorEvents"
        label={appTexts.text("inspectorEvents")}
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
              if (event.detail.value) Inspector.addEvent(props.element, event.detail.value)
            })}
          >
            <ui-icon slot="trigger" name="plus" />
            <For each={addable()}>{(event) => <ui-item value={event}>{eventText(event)}</ui-item>}</For>
          </ui-dropdown>
        </Show>
        <For each={rows()}>{(row) => <EventCode element={props.element} row={row} />}</For>
      </ui-property-group>
    </Show>
  )
}

/** One row of the Events band:  an event or an ability, as written, its code, and its key for what's typed. */
type EventRow = WrittenEvent & {
  /** What its typed code is kept under, beside the part's key:  the DOM event (`click`), else its words. */
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
 * One of a part's events or abilities:  its icon and words, then its code, in a box that grows as it's typed into.
 * - An event's icon a bolt;  an ability's a hand.
 * - An ability with no condition (`it can be dragged`):  its words alone, no box.
 * - The box:  a `<ui-textarea grow>` (epic `ui-gaps` P14), one line to start;  its monospace look through its
 *   `control` part (`Inspector.css`).
 * - Its code:  what was typed here, else what the program was written with, else empty.
 */
function EventCode(props: { element: Element; row: EventRow }): JSX.Element {
  const key = () => `${Inspector.keyOf(props.element) ?? ""}|${props.row.key}`
  const isEvent = () => props.row.kind === "event"
  return (
    <section class={["InspectorEvent", props.row.kind]}>
      <h3>
        <ui-icon name={isEvent() ? EVENT_ICON : ABILITY_ICON} />
        {props.row.words}
      </h3>
      <Show when={isEvent() || props.row.code}>
        <ui-textarea
          class="InspectorCode"
          grow=""
          fluid=""
          spellcheck="false"
          aria-label={props.row.words}
          placeholder={appTexts.text(isEvent() ? "inspectorEventCode" : "inspectorConditionCode", {
            event: props.row.words
          })}
          value={eventCode()[key()] ?? props.row.code}
          ref={on<{ value: string }>("ui-typed", (event) => setEventCode(key(), event.detail.value))}
        />
      </Show>
    </section>
  )
}

/** An event's icon, in the Events band:  a bolt. */
const EVENT_ICON = "bolt"
/** An ability's icon, in the Events band:  a hand. */
const ABILITY_ICON = "hand paper outline"

/****************
 * ### `<ActionsBand>`
 * What can be done to the picked thing, a folding band at the very end of the properties card, titled Actions
 * (epic `debut` P29):  each action of its type, a button reading its own words (`turn over`, `play it`),
 * done to the thing in the running app.
 * - Its actions:  its type's own, then those it inherits, in their file's order (`InspectorActions.of()`).
 * - One that takes something has a field after its button:  a select of the game's piles for `put it on a pile`
 *   (`<ActionParameterField>`);  with more than one, they go under its button.
 * - Dimmed while it isn't enabled, following the thing live;  its tooltip says why, its `enabled when` in its own
 *   words.
 * - While it waits (`put it on a pile` pauses), its button shows it's busy.
 * - An error goes to the program's console, as its own would.
 * - Not drawn for something that isn't one of the program's things, nor with nothing to do.
 ****************/
export function ActionsBand(props: {
  /** The thing picked (or the trail leads to). */
  thing: object
}): JSX.Element {
  const actions = createMemo(() => {
    const core = runtimeCore()
    return core && isThing(props.thing) ? InspectorActions.of(props.thing, core, editor.programWords) : []
  })
  return (
    <Show when={actions().length}>
      <ui-property-group
        class="InspectorActions"
        label={appTexts.text("inspectorActions")}
        collapsible=""
        open={Inspector.isGroupFolded("actions") ? "false" : undefined}
        ref={foldRemembered("actions")}
      >
        <For each={actions()}>{(action) => <ActionRow thing={props.thing} action={action} />}</For>
      </ui-property-group>
    </Show>
  )
}

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

/** The code typed for events, by part and event (`<key>|<event>`;  reactive):  this project's, remembered. */
function eventCode(): Record<string, string> {
  codeChanged()
  return (editorPrefs.get(Inspector.projectPref(CODE_PREF)) as Record<string, string> | undefined) ?? {}
}

/** Remember `code` for the event at `key`. */
function setEventCode(key: string, code: string): void {
  editorPrefs.set(Inspector.projectPref(CODE_PREF), { ...eventCode(), [key]: code })
  setCodeChanged((count) => count + 1)
}

/** Counts the code typed, so the boxes read it again. */
const [codeChanged, setCodeChanged] = createSignal(0)

/** The start of the pref remembering the code typed for events, a project's each. */
const CODE_PREF = "inspector:code"

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
