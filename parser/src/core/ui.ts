import { after, soon } from "spell/util/timing"
import { schemaOf, type Schema } from "spell/util/reactive"

import { core, whileReading } from "./core"
import { defineCoreModule } from "./core.types"

/** The program said `scroll to the top`, this moment. */
let wentToTheTop = false

/**
 * Did the program just say `scroll to the top`?  A long list drawn now stays there, rather than going back to where it was.
 * - True until the current task's done, as what it changes draws straight after it.
 */
export function isGoingToTheTop(): boolean {
  return wentToTheTop
}

/**
 * Assembled `core` UI-interaction methods:
 * - time (`pauseFor`)
 * - talking to the person running the program, on Spell UI's toasts and dialogs:
 *   `notify`, `alert`, `confirm`, `prompt` (spell's `rules/UI/`)
 * - stylesheet installation (`installStyles`)
 * - Drawing (`h()`, `drawThing()` ...) is `drawing.ts`.
 */
export const uiMethods = defineCoreModule({
  /**
   * The page's say over ⌘Z and ⇧⌘Z, asked before the program's history (`listenForUndoKeys()`):
   * true if it took the key.
   * - The editor's, in Edit:  a program's move isn't what people mean to undo there, the side bar's change is.
   * - None, as on any other page:  they're the program's.
   */
  pageUndoKey: undefined as ((action: "undo" | "redo") => boolean) | undefined,

  /**
   * Bring the top of the app back into view:  what `scroll to the top` compiles to.
   * - Under node, or before the app's drawn:  nothing.
   */
  scrollToTop(): void {
    wentToTheTop = true
    soon(() => {
      wentToTheTop = false
    })
    ;(core as { appRoot?: Element }).appRoot?.scrollIntoView?.({ block: "start" })
  },

  ////////////////
  // ## Sound
  //
  // One player per sound file, by its address, for the page's life:  `play` and `stop` (epic `data` T145).
  // Made the first time either names it, it starts loading at once (`preload="auto"`),
  // so a program that `load`s a sound as its page opens has it ready for the click that plays it.
  // Under node, or a page with no `Audio`:  nothing.
  ////////////////

  /**
   * Play `sound`, a sound file's address, from its start:  what `play its sound` compiles to.
   * - Started right here, in the same moment:  so in a click's action, a browser that wants sound to start from a
   *   click (Safari, phones) lets it.
   * - Playing it again while it plays starts it over.
   * - No address:  nothing.
   * - NEVER throws:  a sound the browser refuses, or can't load, is said on the program's console.
   */
  play(sound: string | undefined): void {
    const player = soundPlayerFor(sound)
    if (!player) return
    player.currentTime = 0
    player.play().catch((error: unknown) => {
      // `stop` while it was starting:  not a failure
      if ((error as Error | undefined)?.name === "AbortError") return
      core.console.warn(`play:  can't play ${sound}`, error)
    })
  },

  /**
   * Start loading `sound` now, so a later `play` starts it at once:  what `load its sound` compiles to.
   * - A page that opens with `load its sound` has it ready for the click that plays it.
   * - No address, or loaded already:  nothing.
   */
  loadSound(sound: string | undefined): void {
    soundPlayerFor(sound)
  },

  /**
   * Stop `sound`, if it's playing, and put it back to its start:  what `stop its sound` compiles to.
   * - Its player is made if it has none, so it loads now, as `loadSound()`.
   * - No address:  nothing.
   */
  stop(sound: string | undefined): void {
    const player = soundPlayerFor(sound)
    if (!player) return
    player.pause()
    player.currentTime = 0
  },

  ////////////////
  // ## Time
  ////////////////

  /** Multiplier from a unit name to milliseconds, e.g. `core.TIME_UNITS_MAP.tick`. */
  TIME_UNITS_MAP: {
    second: 1000,
    seconds: 1000,
    sec: 1000,

    millisecond: 1,
    milliseconds: 1,
    msec: 1,
    // a "tick" (from hypercard) is 1/60th of a second
    tick: 1000 / 60,
    ticks: 1000 / 60
  } as Record<string, number>,

  /**
   * Return promise which resolves after `number` `units` have elapsed.
   * - `units` looked up in `TIME_UNITS_MAP`; unrecognized `units` fall back to seconds.
   * - Compiles from spell `pause for {number} {units}` (see `rules/async/Pause.ts`); caller `await`s it.
   * - NEVER resolves while a recompiled program loads to take over the last run's things (`isCarryingOver`):
   *   - what its top level sets going stops at its first pause, e.g. `reset the game`'s new deal
   *   - and the game in progress carries on instead
   * - An action canceled while it waits here stops at once (`CanceledError`, `ActionQueue`).
   */
  pauseFor(number: number, units = "seconds"): Promise<void> {
    if (core.isCarryingOver) return new Promise(() => {})
    const multiplier = core.TIME_UNITS_MAP[units] || 1000
    // default to 0 if `isNaN`
    const delay = Math.round(number * multiplier) || 0
    if (core.RUNTIME) return core.RUNTIME.actions.pause(delay)
    return after(delay / 1000)
  },

  ////////////////
  // ## Talking to the person
  //
  // On the page's Spell UI (its runtime, one per page):  a toast, or a dialog.
  // With no Spell UI -- under node, `spell run` -- each prints on the program's console instead,
  // and a question takes its default answer.
  ////////////////

  /**
   * Show `message` for a moment, in a toast -- compiled from `notify "Saved!"`.
   * - `options`, from the clauses written after the message:  `NotifyOptions`
   *   - e.g. `notify success "Saved!" at the top right for 5 seconds` =>
   *     `core.notify("Saved!", { class: "success", position: "top right", time: 5, units: "seconds" })`
   * - Shown once Spell UI's runtime has loaded.
   * - Returns a promise of the toast being gone:  `notify "..." for 5 seconds` waits for it, plain `notify` doesn't.
   *   - One that stays until it's closed answers at once, so nothing waits on it for good.
   * - No Spell UI:  printed on the console, and gone at once.
   * - NEVER throws:  a toast that can't show says so on the console.
   */
  async notify(message: unknown, options: NotifyOptions = {}): Promise<void> {
    const ui = pageUI()
    if (!ui) return core.console.info(String(message))
    try {
      const toast = (await ui.load()).toast(toastOptionsFor(String(message), options))
      if (!toastStays(options)) await toast.closed
    } catch (error) {
      core.console.error("notify:  can't show a toast", error)
    }
  },

  /** Show `message` in a dialog, and wait until it's closed -- compiled from `alert "Yo!"` (`await`ed). */
  async alert(message: unknown, okText?: string): Promise<void> {
    core.RUNTIME?.actions.throwIfCanceled()
    const ui = pageUI()
    if (!ui) return core.console.info(String(message))
    await (await ui.load()).modals.alert({ message: String(message), okText })
  },

  /**
   * Warn the person in a dialog, and wait until it's closed -- compiled from `warn "Careful!"` (`await`ed).
   * - No Spell UI:  printed as a warning on the console.
   */
  async warn(message: unknown, okText?: string): Promise<void> {
    core.RUNTIME?.actions.throwIfCanceled()
    const ui = pageUI()
    if (!ui) return core.console.warn(String(message))
    await (await ui.load()).modals.alert({ message: String(message), okText })
  },

  /**
   * Ask a yes / no question in a dialog:  `true` for ok -- compiled from `confirm "Delete?"` (`await`ed).
   * - No Spell UI:  `true`, printed with the question.
   */
  async confirm(message: unknown, okText?: string, cancelText?: string): Promise<boolean> {
    core.RUNTIME?.actions.throwIfCanceled()
    const ui = pageUI()
    if (!ui) return (core.console.info(core.message("confirm-default", { question: String(message) })), true)
    return (await ui.load()).modals.confirm({ message: String(message), okText, cancelText })
  },

  /**
   * Ask for some text in a dialog:  what was typed, or `undefined` if cancelled.
   * - Compiled from `prompt "Name?" with "Untitled"` (`await`ed), `value` its starting text.
   * - No Spell UI:  `value`, printed with the question.
   */
  async prompt(message: unknown, value?: string): Promise<string | undefined> {
    core.RUNTIME?.actions.throwIfCanceled()
    const ui = pageUI()
    if (!ui) return (core.console.info(`${String(message)} (${value ?? ""})`), value)
    return (await ui.load()).modals.prompt({ message: String(message), value })
  },

  ////////////////
  // ## Styles
  ////////////////

  /**
   * Create/initialize a `name`d stylesheet with specified `css` text.
   * - If you call this a second time with same `name`, it'll replace the element with that `name`.
   * - Compiles from a bare (unquoted) CSS text literal, e.g. a spell `.css` file's contents.
   * - Newlines in `css` arrive escaped as `¬` (see the `css` rule, `rules/UI/CSSStyles.ts`),
   *   since they survived being embedded in a backtick template literal:
   *   unmunged back to `\n` here before use.
   * - Goes in `core.domRoot()`:  the app's shadow root if it's in one, so its styles stay inside it --
   *   else `document`'s `<head>`.
   */
  installStyles(name = "anonymous-css", safeCSS = ""): void {
    // UN-munge `¬` back to return character
    const css = safeCSS.replace(/¬/g, "\n")

    const id = `--spell-styles--${name}--`
    const newElement = document.createElement("style")
    newElement.id = id
    newElement.type = "text/css"
    newElement.appendChild(document.createTextNode(css))
    projectCss.set(name, css)
    uiMethods.projectSheet()?.replaceSync([...projectCss.values()].join("\n"))
    const root = core.domRoot()
    const oldElement = root.getElementById(id)
    if (oldElement) {
      oldElement.parentNode!.replaceChild(newElement, oldElement)
    } else {
      const parent = root === document ? (document.head ?? document.body) : root
      parent.appendChild(newElement)
    }
  },

  /**
   * The project's `.css` as one sheet, which each view adopts into its shadow root, so a person's stylesheet styles
   * what they drew, wherever they drew it (epic `language`, Q13).
   * - ONE sheet per program, changed in place as its files install:  a view gets what's installed later too.
   * - `undefined` with no `CSSStyleSheet`, as under node.
   */
  projectSheet(): CSSStyleSheet | undefined {
    if (typeof CSSStyleSheet === "undefined") return undefined
    return (projectSheet ??= new CSSStyleSheet())
  },

  ////////////////
  // ## Widget defaults
  ////////////////

  /**
   * The app's widget defaults from `file`:  what an app's `<ui-defaults>` block compiles to (epic `language` P29).
   * - `defaults`:  tag => attribute => value, in Spell UI's own names, e.g. `{ "ui-button": { appearance: "pill" } }`
   *   (the compiler translates a Spanish page's `<es-boton apariencia="píldora"/>`).
   * - `file`:  where they're written, e.g. `/Theme.spell`, or another project's file, `@spell/library/theme/ui-defaults.spell`:
   *   the Inspector names it beside a value that came from them (`uiDefaults().sources`).
   * - Kept for this run (`core.RUNTIME`);  a later file's value for the same attribute wins.
   * - The app's element takes them as the app mounts (`mountApp()`), and again when a file adds some after:
   *   through the page's `giveDefaults`, as core never imports Spell UI.
   */
  useDefaults(file: string, defaults: UIDefaultsTable): void {
    const kept = core.getRuntimeState("uiDefaults", () => new Map<string, UIDefaultsTable>())
    kept.set(file, defaults)
    if (typeof document === "undefined") return
    const element = core.appElement() as (HTMLElement & { spellRoot?: unknown }) | null
    if (element?.spellRoot) uiMethods.handDefaultsTo(element)
  },

  /**
   * This run's widget defaults, merged in the order their files gave them (`useDefaults()`):
   * - `defaults`:  tag => attribute => value, as `<ui-root defaults>` takes them
   * - `sources`:  tag => attribute => the file it came from
   * - `undefined` when the program has none.
   */
  uiDefaults(): { defaults: UIDefaultsTable; sources: Record<string, Record<string, string>> } | undefined {
    const kept = core.RUNTIME?.uiDefaults as Map<string, UIDefaultsTable> | undefined
    if (!kept?.size) return undefined
    const defaults: Record<string, Record<string, string | number | boolean>> = {}
    const sources: Record<string, Record<string, string>> = {}
    for (const [file, table] of kept) {
      for (const [tag, attributes] of Object.entries(table)) {
        Object.assign((defaults[tag] ??= {}), attributes)
        for (const attribute of Object.keys(attributes)) (sources[tag] ??= {})[attribute] = file
      }
    }
    return { defaults, sources }
  },

  /**
   * How the page gives an element widget defaults for everything drawn inside it (`useDefaults()`):
   * the app's runner sets it, as Spell UI's `RootSettings` (`E.RootSettings.set(element, { defaults })`).
   * - None (node, a page with no Spell UI):  the defaults are kept, and given to nothing.
   */
  giveDefaults: undefined as ((element: Element, defaults: UIDefaultsTable | undefined) => void) | undefined,

  /** Give `element`, where the app is drawn, this run's widget defaults (`giveDefaults`):  none clears them. */
  handDefaultsTo(element: Element): void {
    core.giveDefaults?.(element, uiMethods.uiDefaults()?.defaults)
  }
})
Object.assign(core, uiMethods)

////////////////
// ## Undo keys
////////////////

/**
 * An app's widget defaults:  tag => attribute => value, in Spell UI's own names (`core.useDefaults()`).
 * - e.g. `{ "ui-button": { appearance: "pill" }, "ui-segment": { appearance: "raised" } }`
 */
export type UIDefaultsTable = Readonly<Record<string, Readonly<Record<string, string | number | boolean>>>>

/** The project's `.css` so far, by file:  `core.installStyles()`, for `core.projectSheet()`. */
const projectCss = new Map<string, string>()

/** The sheet of `projectCss`, made when first asked for. */
let projectSheet: CSSStyleSheet | undefined

/**
 * What a `<ui-table editable>` the program drew asks for, written into the program's things (epic `mockup` P9).
 * Returns how to stop.
 * - It hears Spell UI's `ui-editing` on `element`, its app's, in every language a program draws in (`es-editando`
 *   from a Spanish `<es-tabla>`;  epic `mockup` P14, T23), and takes one whose rows are THINGS (objects of a class,
 *   not plain data):  it cancels it, so the table leaves its rows alone and follows the things as they change.
 * - Everything one edit asks for is ONE undo step, `Edit Table`:
 *   - `set`:  the thing's property, written as any write is, so a thing kept in a place sends it there
 *   - `add`:  a new thing of the rows' class, its fields filled, kept where its class is (`core.saveThing()`),
 *     else added to the list the table was handed
 *   - `remove`:  out of its place (`core.removeSaved()`), else out of that list
 * - A table of plain rows is left to itself:  it shows its own changes.
 * - `core.mountApp()` calls it, and its `unmount()` stops it.
 * - NEVER throws:  a write that fails is said on the program's console, and the rest still go.
 */
export function listenForTableEdits(element: HTMLElement): () => void {
  const onEditing = (event: Event) => {
    const { edits } = ((event as CustomEvent).detail ?? {}) as { edits?: readonly TableEdit[] }
    // the table itself, though it's drawn inside a view's shadow root:  `target` would be that view
    const table = event.composedPath()[0] as { rows?: unknown } | undefined
    if (!Array.isArray(edits) || !edits.length || !holdsThings(table?.rows, edits)) return
    event.preventDefault()
    // a new thing's save may wait for its place to be ready:  the step stays open until it's in
    const write = () => {
      const saving: Promise<void>[] = []
      for (const edit of edits) {
        try {
          const saved = writeTableEdit(edit, table!.rows)
          if (saved) saving.push(saved)
        } catch (error) {
          core.console.warn("editable table:  a change didn't go", error)
        }
      }
      return saving.length ? Promise.all(saving).then(() => undefined) : undefined
    }
    const history = core.RUNTIME?.history
    // un-awaited on purpose:  each write says its own failure on the program's console
    if (history) void history.transaction(core.message("table-edit"), write)
    else void write()
  }
  for (const name of TABLE_EDITING) element.addEventListener(name, onEditing)
  return () => {
    for (const name of TABLE_EDITING) element.removeEventListener(name, onEditing)
  }
}

/**
 * Name the columns a `<ui-table>` shows for `list`, a list of `Class`'s things (epic `mockup` P9):
 * its `tableColumns`, which Spell UI's table reads when it's handed no `columnDefs`.
 * - So an empty list still has its columns, and a table of it can take its first row.
 * - Each declared property, in the order declared (a parent class's first), headed by its words
 *   (`filmTitle` => `film title`), of its kind:  `number`, `date`, `choice` (true or false:
 *   a tick box), one of its values (`its "size" is small or large`);  a list, or a thing, isn't a column.
 * - SIDE EFFECT:  a getter on `list`, not enumerable, so its JSON and its items don't change.
 */
export function nameTableColumns(list: object, Class: Function): void {
  LIST_CLASS.set(list, Class)
  Object.defineProperty(list, "tableColumns", { get: () => tableColumnsOf(Class), configurable: true })
}

/** `Class`'s columns:  see `nameTableColumns()`.  The same list each time, so a table keeps its column cells. */
function tableColumnsOf(Class: Function): TableColumn[] {
  let columns = CLASS_COLUMNS.get(Class)
  if (!columns) CLASS_COLUMNS.set(Class, (columns = columnsFor(Class)))
  return columns
}

/** Each class's columns, as `tableColumnsOf()` made them. */
const CLASS_COLUMNS = new WeakMap<Function, TableColumn[]>()

/** `Class`'s columns, worked out. */
function columnsFor(Class: Function): TableColumn[] {
  const schemas: Schema[] = []
  for (let schema = schemaOf(Class as never) as Schema | undefined; schema; schema = schema.parent)
    schemas.unshift(schema)
  const columns: TableColumn[] = []
  for (const schema of schemas) {
    for (const [key, info] of schema.declared) {
      if (info.itemType || columns.some((column) => column.key === key)) continue
      const type = info.type
      const values = typeof info.oneOf === "function" ? info.oneOf() : info.oneOf
      const header = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase()
      if (key === "id") continue
      if (values?.length) columns.push({ key, header, type: "choice", choices: values.map((value) => ({ value })) })
      else if (type === "number" || type === "date") columns.push({ key, header, type })
      else if (type === "choice") columns.push({ key, header, type: "yes-no" })
      else if (!type || type === "text") columns.push({ key, header, type: "text" })
    }
  }
  return columns
}

/** One column of Spell UI's `<ui-table>`, as far as the core names it:  Spell UI's `TableColumn`. */
type TableColumn = {
  /** the property */
  key: string
  /** its words */
  header: string
  /** what it holds */
  type: "text" | "number" | "date" | "yes-no" | "choice"
  /** `choice`:  its values */
  choices?: { value: unknown }[]
}

/** Does a table of `rows`, edited by `edits`, hold things, not plain data?  A list the core named does, empty too. */
function holdsThings(rows: unknown, edits: readonly TableEdit[]): boolean {
  if (rows && typeof rows === "object" && LIST_CLASS.has(rows)) return true
  const first = edits.find((edit) => edit.row)?.row ?? firstOf(rows)
  return !!first && typeof first === "object" && !isPlainData(first)
}

/** The class of the things of each list `nameTableColumns()` named:  what a row added to it is made as. */
const LIST_CLASS = new WeakMap<object, Function>()

/** One edit of a table of things:  see `listenForTableEdits()`.  A new thing's save, while it waits for its place. */
function writeTableEdit(edit: TableEdit, rows: unknown): Promise<void> | undefined {
  if (edit.kind === "set") {
    ;(edit.row as Record<string, unknown>)[edit.key!] = edit.value
    return undefined
  }
  if (edit.kind === "remove") {
    const Class = (edit.row as object).constructor as { savedIn?: unknown }
    if (Class.savedIn) core.removeSaved(edit.row)
    else (rows as { remove?(...things: unknown[]): unknown }).remove?.(edit.row)
    return undefined
  }
  const first = firstOf(rows)
  const Class = ((rows && typeof rows === "object" && LIST_CLASS.get(rows)) ||
    (first as object | undefined)?.constructor) as ((new () => object) & { savedIn?: unknown }) | undefined
  if (!Class) {
    core.console.warn("editable table:  can't add a row to an empty table of things:  it doesn't know their kind")
    return undefined
  }
  const thing = new Class()
  // its first values are part of making it, no step of their own:  undoing the add takes it out whole,
  // where undoing a field after would write it back to its place
  whileReading(() => Object.assign(thing, edit.values))
  if (Class.savedIn) {
    return core.saveThing(thing).catch((error: unknown) => core.console.warn("editable table:", error))
  }
  ;(rows as { add?(...things: unknown[]): unknown }).add?.(thing)
  return undefined
}

/** The first of `rows`, an array or any other list. */
function firstOf(rows: unknown): unknown {
  if (!rows || typeof rows !== "object" || !(Symbol.iterator in rows)) return undefined
  for (const row of rows as Iterable<unknown>) return row
  return undefined
}

/** Is `value` plain data, an object literal, rather than a thing of a class? */
function isPlainData(value: object): boolean {
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/** One change a `<ui-table editable>` asks for:  Spell UI's `TableEdit`, as far as the core reads it. */
type TableEdit = {
  /** `set`, `add` or `remove` */
  kind: "set" | "add" | "remove"
  /** `set`, `remove`:  the row, the very thing */
  row?: object
  /** `set`:  the property */
  key?: string
  /** `set`:  its new value */
  value?: unknown
  /** `add`:  the new row's values by property */
  values?: Record<string, unknown>
}

/**
 * The event an editable table sends, by each language a program draws in:  Spell UI's English, and its Spanish
 * dictionary's (`es-editando`, `UITable.es.ts`).  A new language's table adds its name here.
 * - Written out, not asked of Spell UI:  the core sits below it.
 */
const TABLE_EDITING = ["ui-editing", "es-editando"]

/** The keys that undo and redo, as Spell UI's keyboard names them:  `Mod` is ⌘ on a Mac, Ctrl elsewhere. */
const UNDO_KEYS = [
  { chord: "Mod+Z", action: "undo" },
  { chord: "Mod+Shift+Z", action: "redo" }
] as const

/** `<input type>`s nobody types into, so the app's keys stay live:  Spell UI's list, copied. */
const NON_TEXT_INPUTS = new Set(["button", "checkbox", "radio", "range", "reset", "submit", "color", "file", "image"])

/**
 * ⌘Z and ⇧⌘Z undo and redo the running program's history (epic `prefs-and-undo` P6).  Returns how to stop.
 * - While `element`, its app's, has the focus, or nothing does.
 * - Through the page's Spell UI keyboard registry (`UI.keyboard`), in its page scope:
 *   a modal open over the app keeps its own keys (Q19).
 * - A text field keeps its own ⌘Z:  the key passes on to it.  So does a key with nothing to undo.
 * - No Spell UI on the page (node, a bare page):  nothing listens.
 * - `core.mountApp()` calls it, and its `unmount()` stops it.
 * - NEVER throws:  a registry that fails to load is logged.
 */
export function listenForUndoKeys(element: HTMLElement): () => void {
  const ui = pageUI()
  if (!ui) return () => {}
  let stops: Array<() => void> = []
  let isStopped = false
  ui.load()
    .then((runtime) => {
      if (isStopped) return
      stops = UNDO_KEYS.map(({ chord, action }) =>
        runtime.keyboard.register({ chord, handler: (event) => undoKeyPressed(event, element, action) })
      )
    })
    .catch((error) => console.error(error))
  return () => {
    isStopped = true
    stops.forEach((stop) => stop())
  }
}

/** Undo or redo for a key pressed:  true if it did, false to pass the key on (see `listenForUndoKeys()`). */
function undoKeyPressed(event: KeyboardEvent, element: HTMLElement, action: "undo" | "redo"): boolean {
  const path = event.composedPath()
  const [focused] = path
  if (isTypedIn(focused)) return false
  if (!path.includes(element) && focused !== element.ownerDocument.body) return false
  if (core.pageUndoKey?.(action)) return true
  const { history, actions } = core.RUNTIME
  // while an action runs, undo is refused, as from a menu (epic `language`, J2);  the key is still taken
  if (actions.isBusy) return true
  return action === "undo" ? history.undo() : history.redo()
}

/**
 * Is `target` somewhere people type, with an undo of its own?  A text field, a text area, a select, editable text.
 * - The same test as Spell UI's keyboard registry:  a copy, as core never imports `ui`.
 */
function isTypedIn(target: EventTarget | undefined): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
    return true
  }
  return target instanceof HTMLInputElement && !NON_TEXT_INPUTS.has(target.type)
}

/**
 * What core uses of the page's Spell UI runtime (`UI`, `spell-ui`):  typed here, as core never imports `ui`.
 * - Its `modals` work once the `ui-modal` family is defined:  a runner's page defines every family.
 */
type PageUI = {
  /** resolves with the runtime once its services are in:  `UI.load()` */
  load(): Promise<PageUI>
  /** a toast:  `UI.toast()`, its options the ones `notify` uses (Spell UI's `ToastOptions`) */
  toast(options: PageToastOptions): { closed: Promise<void> }
  /** dialogs that answer with a promise:  `UI.modals` */
  modals: {
    alert(options: { message: string; okText?: string }): Promise<void>
    confirm(options: { message: string; okText?: string; cancelText?: string }): Promise<boolean>
    prompt(options: { message: string; value?: string }): Promise<string | undefined>
  }
  /** the page's keyboard shortcuts:  `UI.keyboard`;  `register()` answers how to stop */
  keyboard: {
    register(registration: { chord: string; handler: (event: KeyboardEvent) => boolean }): () => void
  }
}

/**
 * What `notify` takes after its message, one option per clause of `notify` (`rules/UI/Notify.ts`).
 * - Named as Spell UI's toast options are (`ToastOptions`), but for `time`, `units` and `button`.
 */
export type NotifyOptions = {
  /** bold first line:  `titled "Better?"` */
  title?: string
  /** its kind and colour words:  `"success"`, `"inverted red"` */
  class?: string
  /** where on the screen:  `"top left"`, `"centered"`, `"bottom right"` (Spell UI's default) */
  position?: string
  /** how long it shows, in `units`:  `for 5 seconds`;  `0`, `until clicked`;  none, as long as reading it takes */
  time?: number
  /** `time`'s unit, a key of `core.TIME_UNITS_MAP`;  default `"seconds"` */
  units?: string
  /** a bar counting the time down:  `with a progress bar at the top` */
  showProgress?: "top" | "bottom"
  /** the bar fills up instead of emptying:  `... filling up` */
  progressUp?: boolean
  /** toasts at its position line up side by side */
  horizontal?: boolean
  /** `false`:  the countdown keeps running under the pointer, `without pausing` */
  pauseOnHover?: boolean
  /** a button that closes it:  `with "Got it"`;  it stays until it's closed */
  button?: string
  /** buttons that DO something, e.g. Retry and Show me:  each closes it;  it stays until it's closed */
  actions?: readonly NotifyAction[]
}

/** One button of `NotifyOptions.actions`. */
export type NotifyAction = {
  /** what it says */
  text: string
  /** pressed */
  click: () => void
}

/** What core hands Spell UI's `UI.toast()`:  a copy of the part of its `ToastOptions` that `notify` uses. */
type PageToastOptions = Omit<NotifyOptions, "time" | "units" | "button" | "actions"> & {
  message: string
  displayTime?: number | "auto"
  actions?: { text: string; click?: () => void }[]
}

/** `notify`'s message and options as Spell UI's toast options:  its time in milliseconds, its button an action. */
function toastOptionsFor(message: string, options: NotifyOptions): PageToastOptions {
  const { time, units = "seconds", button, actions: pressed = [], ...toastOptions } = options
  const actions = [...pressed, ...(button ? [{ text: button }] : [])]
  const displayTime = actions.length
    ? 0
    : time === undefined
      ? "auto"
      : Math.round(time * (core.TIME_UNITS_MAP[units] ?? 1000))
  return { ...toastOptions, message, displayTime, ...(actions.length ? { actions } : {}) }
}

/** Does a toast stay until it's closed?  It has a button, or a time of 0. */
function toastStays(options: NotifyOptions): boolean {
  return !!options.button || options.time === 0
}

/**
 * The page's Spell UI runtime, if there is one -- `undefined` under node, or on a page without Spell UI.
 * - Where Spell UI keeps it, so every bundle on the page shares it (`RUNTIME_KEY`, `ui`'s `runtime.types.ts`).
 */
function pageUI(): PageUI | undefined {
  return (globalThis as Record<symbol, PageUI | undefined>)[UI_RUNTIME_KEY]
}

/** Spell UI's `RUNTIME_KEY`:  a copy, as core never imports `ui`. */
const UI_RUNTIME_KEY = Symbol.for("spell-ui:runtime")

/** Each sound file's player, by its address:  `core.play()` and `core.stop()`'s. */
const soundPlayers = new Map<string, HTMLAudioElement>()

/**
 * `sound`'s player, made the first time it's asked for, and loading from then on.
 * - `undefined` for no address, or where there's no `Audio` (node).
 */
function soundPlayerFor(sound: string | undefined): HTMLAudioElement | undefined {
  if (!sound || typeof Audio === "undefined") return undefined
  let player = soundPlayers.get(sound)
  if (!player) {
    player = new Audio()
    player.preload = "auto"
    player.src = sound
    soundPlayers.set(sound, player)
  }
  return player
}
