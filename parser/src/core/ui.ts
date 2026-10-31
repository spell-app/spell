import { core } from "./core"
import { defineCoreModule } from "./core.types"

/**
 * Assembled `core` UI-interaction methods:
 * - time (`pauseFor`)
 * - talking to the person running the program, on Spell UI's toasts and dialogs:
 *   `notify`, `alert`, `confirm`, `prompt` (spell's `rules/UI/`)
 * - stylesheet installation (`installStyles`)
 * - Drawing (`h()`, `drawThing()` ...) is `drawing.ts`.
 */
export const uiMethods = defineCoreModule({
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
    return new Promise((resolve) => setTimeout(resolve, delay))
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
    const root = core.domRoot()
    const oldElement = root.getElementById(id)
    if (oldElement) {
      oldElement.parentNode!.replaceChild(newElement, oldElement)
    } else {
      const parent = root === document ? (document.head ?? document.body) : root
      parent.appendChild(newElement)
    }
  }
})
Object.assign(core, uiMethods)

////////////////
// ## Undo keys
////////////////

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
}

/** What core hands Spell UI's `UI.toast()`:  a copy of the part of its `ToastOptions` that `notify` uses. */
type PageToastOptions = Omit<NotifyOptions, "time" | "units" | "button"> & {
  message: string
  displayTime?: number | "auto"
  actions?: { text: string }[]
}

/** `notify`'s message and options as Spell UI's toast options:  its time in milliseconds, its button an action. */
function toastOptionsFor(message: string, options: NotifyOptions): PageToastOptions {
  const { time, units = "seconds", button, ...toastOptions } = options
  const displayTime = button ? 0 : time === undefined ? "auto" : Math.round(time * (core.TIME_UNITS_MAP[units] ?? 1000))
  return { ...toastOptions, message, displayTime, ...(button ? { actions: [{ text: button }] } : {}) }
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
