/**
 * What a program's templates SAY about themselves, beyond their code (epic `elemental-spell` P5):
 * - each ACTION's description:  its title, its shortcuts, when it's enabled or selected, what its undo is called
 *   - `- to turn it over:` then `- shortcut meta+T`, `- enabled when it is face down`, `- undoable as "Turn Card"`
 * - each EVENT a template sends, with its parameters:  `- it sends "flipped" with a side as a direction`
 * - Compiled spell writes them after the class:  `core.describeAction(Card, "turnOver", { ... })`.
 * - What reads them:  the event phase (P9), and the actions' one way to run (`acting.ts`, P10),
 *   through `actionsOf()` and `eventsOf()`.
 * - An action `undoable` is ONE undo step:
 *   `describeAction()` declares it so (`declareAction()`, `undoing.ts`, C11).
 * - Kept per class, and inherited:  a joker has a card's actions, and may describe one again.
 * - Part of `core`:  imported by `spell/parser/core`'s barrel for its side effect.
 */
import { core } from "./core"
import { defineCoreModule } from "./core.types"
import {
  declareAction,
  PASSED,
  SERVER_FAILURE_STEPS,
  type ActionHooks,
  type CantBeUndone,
  type HookMoment,
  type HookLevel
} from "./undoing"

export const describedMethods = defineCoreModule({
  /**
   * Describe class `Class`'s action `name`, its method's name, e.g. `turnOver` for `to turn it over`.
   * - What compiled spell writes after the class, for an action with any of its description's lines.
   * - Again for the same name, e.g. a sub-class's:  the new description, whole.
   */
  describeAction(Class: Function, name: string, description: ActionDescription): void {
    ownDescriptions(ACTIONS, Class).set(name, description)
    // `undoable as "Turn Card"`:  ONE undo step, through the run's history (C11);  `can't be undone`:  none
    const method = (Class.prototype as Record<string, unknown>)[name]
    const { undoneAs, cantBeUndone, cancels, callsServer } = description
    const declares = undoneAs !== undefined || cantBeUndone !== undefined
    if (declares && typeof method === "function" && !UNDOABLE.has(method)) {
      const info = {
        ...(undoneAs !== undefined ? { undoneAs } : { cantBeUndone }),
        ...(cancels && { cancels }),
        ...(callsServer && { callsServer })
      }
      declareAction(Class, name, info, hooksOf(Class, name))
      UNDOABLE.add((Class.prototype as Record<string, unknown>)[name] as Function)
    }
  },

  /**
   * Run `Class`'s member `hook` at the end of its action `name`, inside its undo step:  an after hook (epic `language` P56).
   * - What compiled spell writes for `after putting a card on a pile`, in any file:
   *   `core.addAfterHook(Card, "putOnPile", { hook: "afterPutOnPile" })`, the hook a method of `Class` taking the
   *   action's blanks.
   * - Each runs in the order added, the program's file order;  skipped when the action is called off (`cancel`).
   * - Before or after the action is described:  the same list either way.
   * - See `runActing()` (`undoing.ts`).
   */
  addAfterHook(Class: Function, name: string, { hook }: { hook: string }): void {
    hooksOf(Class, name).after.push({ hook, level: "app" })
  },

  /**
   * Run `Class`'s member `hook` at `moment` of its action `name`, from a file at `level` (epic `data` P50):
   * the steps around a server's action, `before completing a job` and its kin, from any file.
   * - What compiled spell writes for `before completing a job`, `while ...`, `if completing a job fails`,
   *   and a second `to complete a job` saying `call the server` (`"around"`);  an `after` hook from the API file or a page.
   *   - e.g. `core.addActionHook(Job, "complete", { moment: "before", hook: "beforeComplete", level: "api" })`
   * - `level`, from the file it's in:  `"api"` (a `.api.spell` file), `"app"`, or `"page"` (a file holding a page,
   *   its class `page`).  Before and while steps run from the page outwards in, after and failure steps from the API
   *   file out;  a page's before and while steps only while it's shown (`isShowing()`).
   * - Each runs in the order added within its level, the program's file order.
   * - See `runActing()` (`undoing.ts`).
   */
  addActionHook(Class: Function, name: string, { moment, hook, level = "app", page }: ActionHookDescription): void {
    hooksOf(Class, name)[moment].push({ hook, level, ...(page && { page }) })
  },

  /**
   * Run `step` last when any server's action fails, after the action's own failure steps (epic `data` Q93):
   * what `when any server call fails` compiles to, the app's one place for, say, signing in again.
   * - `step` is given the error, and gives back `core.passTheError()` to send it on;  anything else, it caught it,
   *   and Spell's notice stays away.
   * - Several:  in the order added.  See `runActing()`.
   */
  addServerFailureStep(step: (error: unknown) => unknown): void {
    SERVER_FAILURE_STEPS.push(step)
  },

  /**
   * What a failure step gives back to send its error on, to the next step, and in the end to Spell's notice:
   * `pass the error` (epic `data` Q87).  See `runActing()`.
   */
  passTheError(): typeof PASSED {
    return PASSED
  },

  /**
   * Is `error` the kind `name` says, in Spell's words (epic `data` Q95):  what `if the error is "not found"` compiles to.
   * - `"not found"`:  no such thing
   * - `"not authorized"`:  not signed in (a place's refusal, `whyNot` `"signed out"`)
   * - `"not permitted"`:  signed in, and not allowed (any other refusal)
   * - `"out of date"`:  someone changed it first
   * - `"server not found"`:  the place isn't there
   * - `"limit"`:  too many rows, or asked too often
   * - `"offline"`:  no network
   * - `"anything"`:  every error:  `if that fails` means this
   * - Read from what places and the network throw (`PlaceError`, `TooSoonError`, `OfflineError`, a failed `fetch()`),
   *   by their names and causes:  never a status code.
   * - throws `TypeError` for a name that isn't one of these:  the compiler only writes these
   */
  errorIs(error: unknown, name: ErrorName): boolean {
    const test = ERROR_NAMES[name]
    if (!test)
      throw new TypeError(
        `core.errorIs():  "${name}" isn't an error's name;  it's one of ${Object.keys(ERROR_NAMES).join(", ")}`
      )
    return test(error as ErrorLike)
  },

  /**
   * Describe an event class `Class`'s things send, e.g. `flipped` with its `side`.
   * - What compiled spell writes after the class, for `- it sends "flipped" with a side as a direction`.
   */
  describeEvent(Class: Function, name: string, description: EventDescription): void {
    ownDescriptions(EVENTS, Class).set(name, description)
  },

  /**
   * Every action class `Class` describes, its own and its super-classes', by method name.
   * - A sub-class's description of an action wins over its super-class's.
   * - Empty for a class that describes none.
   */
  actionsOf(Class: Function): Map<string, ActionDescription> {
    return describedBy(ACTIONS, Class)
  },

  /** Every event class `Class`'s things send, its own and its super-classes', by name -- as `actionsOf()`. */
  eventsOf(Class: Function): Map<string, EventDescription> {
    return describedBy(EVENTS, Class)
  }
})

Object.assign(core, describedMethods)

/**
 * An action's description, in its class's names:  what `- to turn it over:`'s description lines say.
 * - `title`:  its name as people read it, e.g. `turn it over`
 * - `shortcuts`:  its keys, e.g. `["meta+T"]`:  `meta` is command on a Mac, control elsewhere (Q31)
 * - `icon`:  its icon's name, if it says one
 * - `enabledWhen`, `selectedWhen`:  the name of the class's getter that says so, e.g. `turnOverIsEnabled`
 * - `undoneAs`:  its undo's name, e.g. `Turn Card`, as the Edit menu says `Undo Turn Card`
 * - `cantBeUndone`:  `"keeps history"` for `can't be undone`:  nothing it changes is a step (epic `language` P55, Q60)
 * - `titleFrom`:  the name of the class's getter whose text is its title NOW, e.g. the app's `undoTitle`
 * - `replacesLast`:  the newest wins (`- a new one replaces the last one`), where a repeat is otherwise ignored
 * - `refusedWhileBusy`:  never waits its turn:  does nothing while an action runs, e.g. the app's `undo` (J2)
 * - `cancels`:  it may `cancel`, and so answers yes or no (epic `language` P56) -- see `ActionInfo.cancels`
 * - `callsServer`:  it's a server's action, `to complete a job is at "..."` (epic `data` P50) -- see `ActionInfo.callsServer`
 */
export type ActionDescription = {
  title: string
  shortcuts?: string[]
  icon?: string
  enabledWhen?: string
  selectedWhen?: string
  undoneAs?: string
  cantBeUndone?: CantBeUndone
  titleFrom?: string
  replacesLast?: boolean
  refusedWhileBusy?: boolean
  cancels?: boolean
  callsServer?: boolean
}

/**
 * One of an action's hooks, as compiled spell describes it:  `core.addActionHook()`.
 * - `moment`:  `"before"`, `"while"`, `"after"`, `"failed"` (`if completing a job fails`), or `"around"`
 *   (a second `to complete a job`, wrapping the first with `call the server`)
 * - `hook`:  the member of the action's class it runs
 * - `level`:  the file's, `"api"`, `"app"` (the default) or `"page"`
 * - `page`:  the page's class, for a page's:  a function giving it, as the class may come after the line
 */
export type ActionHookDescription = {
  moment: HookMoment
  hook: string
  level?: HookLevel
  page?: () => Function
}

/**
 * An event's description:  `params`, each parameter's name and its type as the template said it,
 * e.g. `{ side: "direction" }` for `with a side as a direction`.
 */
export type EventDescription = {
  params?: Record<string, string>
}

/** The methods `describeAction()` made undoable already:  a sub-class describing one again doesn't wrap it twice. */
const UNDOABLE = new WeakSet<Function>()

/** Each class's hooks, by its action's method name:  `addAfterHook()`, `addActionHook()`. */
const ACTION_HOOKS = new WeakMap<Function, Map<string, ActionHooks>>()

/** `Class`'s hooks of its action `name`:  the live lists, made empty the first time. */
function hooksOf(Class: Function, name: string): ActionHooks {
  const own = ownDescriptions(ACTION_HOOKS, Class)
  let hooks = own.get(name)
  if (!hooks) own.set(name, (hooks = { before: [], while: [], after: [], failed: [], around: [] }))
  return hooks
}

/** Each class's own action descriptions, by method name. */
const ACTIONS = new WeakMap<Function, Map<string, ActionDescription>>()

/** Each class's own event descriptions, by name. */
const EVENTS = new WeakMap<Function, Map<string, EventDescription>>()

/** `Class`'s own descriptions in `store`, made empty the first time. */
function ownDescriptions<D>(store: WeakMap<Function, Map<string, D>>, Class: Function): Map<string, D> {
  let own = store.get(Class)
  if (!own) store.set(Class, (own = new Map()))
  return own
}

/** `Class`'s descriptions in `store`, its super-classes' first, so its own win. */
function describedBy<D>(store: WeakMap<Function, Map<string, D>>, Class: Function): Map<string, D> {
  const chain: Function[] = []
  for (let current: Function | null = Class; current && current !== Function.prototype;) {
    chain.unshift(current)
    current = Object.getPrototypeOf(current) as Function | null
  }
  const described = new Map<string, D>()
  for (const each of chain) for (const [name, description] of store.get(each) ?? []) described.set(name, description)
  return described
}

/** What an error may say of itself, read by `core.errorIs()`. */
type ErrorLike =
  | {
      name?: string
      message?: string
      status?: number
      cause?: { kind?: string; whyNot?: string }
    }
  | undefined

/** The words a failure step names an error by (epic `data` Q95), each language's mapped to these by the compiler. */
export const ErrorNames = [
  "not found",
  "not authorized",
  "not permitted",
  "out of date",
  "server not found",
  "limit",
  "offline",
  "anything"
] as const
/** One of `ErrorNames`. */
export type ErrorName = (typeof ErrorNames)[number]

/** A place's error, of `kind`. */
function isPlaceError(error: ErrorLike, kind: string): boolean {
  return error?.name === "PlaceError" && error.cause?.kind === kind
}

/** How each name tells its error:  see `core.errorIs()`. */
const ERROR_NAMES: Record<ErrorName, (error: ErrorLike) => boolean> = {
  "not found": (error) => isPlaceError(error, "not found"),
  "not authorized": (error) => isPlaceError(error, "refused") && error?.cause?.whyNot === "signed out",
  "not permitted": (error) => isPlaceError(error, "refused") && error?.cause?.whyNot !== "signed out",
  "out of date": (error) => isPlaceError(error, "out of date"),
  "server not found": (error) => isPlaceError(error, "no such place"),
  limit: (error) =>
    isPlaceError(error, "over the ceiling") || error?.name === "TooSoonError" || error?.status === TOO_MANY_REQUESTS,
  offline: (error) =>
    error?.name === "OfflineError" ||
    (error?.name === "TypeError" && FAILED_FETCH.test(error.message ?? "")) ||
    (error?.name !== "PlaceError" && typeof navigator !== "undefined" && navigator.onLine === false),
  anything: () => true
}

/** A server saying it's asked too often:  how a place's request error says so, when nothing else does. */
const TOO_MANY_REQUESTS = 429

/** What `fetch()` throws with no network:  Chrome's, Firefox's, Safari's, node's. */
const FAILED_FETCH = /failed to fetch|networkerror|load failed|fetch failed/i
