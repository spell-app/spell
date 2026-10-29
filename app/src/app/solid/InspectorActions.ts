import type { Core } from "spell/parser/core/core.types"
import type { SP } from "spell/parser/spell"
import type { WrittenEvent } from "./InspectorSource"

/****************
 * ### `InspectorActions`
 * What can be done to a thing of the running program, as the Inspector's Actions band lists it (epic `debut` P29):
 * each action of its type, in the program's words, with what it takes.
 * - Read from the RUNNING program:  the thing's methods, its core (`core.isActionEnabled()`, `core.things`),
 *   and the project's words file (`SP.SpellWordsData`) for their wording.
 * - Knows nothing of Solid or the page:  the band draws what it answers.
 * - NEVER imports `spell/parser/core`:  only its types, as the app may (core's AGENTS.md, "Who may value-import it").
 * - What an action takes, and of which type, comes from its words, `put a card on a pile`:
 *   the compiler records no parameter types yet.
 *   CONSIDER:  the words file recording each action's parameters (P29's plan), once the parser can take it.
 ****************/
export class InspectorActions {
  /**
   * `thing`'s actions:  each method of its type, its own first, then those it inherits, in the file's order.
   * - Down to -- NOT including -- spell's own base types (`Thing`, `List`, `App`, `View` ...);
   *   a built-in template's are in (a two sided view's `turn over`).
   * - Not an action:  a drawing (`draw ...`), an event (`on click`), a condition (`can take`), a question (`is a`).
   * - `words`:  the project's words file, for each one's wording;  none, its method's name in words.
   */
  static of(thing: object, core: Core, words?: SP.SpellWordsData): InspectorAction[] {
    const bases = new Set(BASE_TYPES.map((name) => core.things.classNamed(name)?.prototype).filter(Boolean))
    const typeWords = InspectorActions.knownTypeWords(core)
    const actions = new Map<string, InspectorAction>()
    for (
      let proto = Object.getPrototypeOf(thing) as object | null;
      proto && proto !== Object.prototype && !bases.has(proto);
      proto = Object.getPrototypeOf(proto)
    ) {
      const type = proto.constructor.name
      for (const [name, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(proto))) {
        if (actions.has(name) || typeof descriptor.value !== "function" || NOT_ACTIONS.test(name)) continue
        const written = words?.types[type]?.[name]
        if (written && NOT_ACTION_WORDS.test(written)) continue
        actions.set(name, actionFrom(name, (descriptor.value as Function).length, written, type, typeWords))
      }
    }
    return [...actions.values()]
  }

  /**
   * The names of `thing`'s type and those it inherits, in spell's words, its own first:  `["tableau", "pile", ...]`.
   * - From its classes' names:  `StockPile` => `stock pile`.
   */
  static typeWordsOf(thing: object): string[] {
    const names: string[] = []
    for (
      let proto = Object.getPrototypeOf(thing) as object | null;
      proto && proto !== Object.prototype;
      proto = Object.getPrototypeOf(proto)
    ) {
      const { name } = proto.constructor
      if (name) names.push(wordsOfName(name))
    }
    return names
  }

  /**
   * `thing`'s events by their methods' names, when its program's own words for them can't be read:
   * `onClick` => `on click`, its own first.  Their code isn't known:  `""`.
   */
  static eventsOf(thing: object): WrittenEvent[] {
    const events: WrittenEvent[] = []
    for (
      let proto = Object.getPrototypeOf(thing) as object | null;
      proto && proto !== Object.prototype;
      proto = Object.getPrototypeOf(proto)
    ) {
      for (const name of Object.getOwnPropertyNames(proto)) {
        const words = wordsOfName(name)
        if (EVENT_METHOD.test(name) && !events.some((event) => event.words === words))
          events.push({ kind: "event", words, code: "" })
      }
    }
    return events
  }

  /**
   * The running program's things of type `type` (`Pile`), its sub-types' too (tableaux and foundations are piles),
   * in the order they were made.  Reactive:  it reads the registry's version.
   */
  static thingsOfType(core: Core, type: string): object[] {
    return core.things.bySuperType().find((group) => group.type === type)?.things ?? []
  }

  /**
   * Do action `action.name` to `thing`, with `args`, as a press of its button does.
   * - Nothing while it isn't enabled (`core.isActionEnabled()`).
   * - Returns its wait, if it waits (`put it on a pile` pauses):  the button shows it's busy meanwhile.
   * - An error, thrown or from that wait, goes to the program's console, as the program's own would.
   * - Called directly rather than through `core.runAction()`, which takes no arguments.
   * - NEVER throws.
   */
  static run(core: Core, thing: object, action: InspectorAction, args: unknown[] = []): Promise<void> | undefined {
    const report = (error: unknown) => core.console.error(`${action.words} failed`, error)
    if (!core.isActionEnabled(thing, action.name)) return undefined
    try {
      const result: unknown = (thing as Record<string, (...args: unknown[]) => unknown>)[action.name]!(...args)
      if (result instanceof Promise) return result.then(() => undefined, report)
    } catch (error) {
      report(error)
    }
    return undefined
  }

  /**
   * A typed value as spell would read it:  `yes` / `no` a yes or no, `12` a number, `"red"` (quoted) text,
   * anything else the text as typed.
   */
  static valueFrom(text: string): unknown {
    const typed = text.trim()
    if (/^(yes|true)$/i.test(typed)) return true
    if (/^(no|false)$/i.test(typed)) return false
    if (typed && !Number.isNaN(Number(typed))) return Number(typed)
    const quoted = /^"(.*)"$|^'(.*)'$/.exec(typed)
    return quoted ? (quoted[1] ?? quoted[2]) : typed
  }

  /** The program's types in spell's words, by name, the longest first:  `[["stock pile", "StockPile"], ...]`. */
  private static knownTypeWords(core: Core): [words: string, type: string][] {
    return core.things
      .knownClasses()
      .map((Class): [string, string] => [wordsOfName(Class.name), Class.name])
      .sort(([a], [b]) => b.length - a.length)
  }
}

/** One of a thing's actions, as the Actions band shows it. */
export type InspectorAction = {
  /** Its method's name:  `putOnPile`. */
  name: string
  /** Its words, the thing itself as `it`:  `put it on a pile`;  `turn over` for one with no words. */
  words: string
  /** What it takes, in order:  `[{ words: "a pile", type: "Pile" }]`. */
  parameters: ActionParameter[]
  /** The type it's written in:  `Card`, `TwoSidedView`. */
  type: string
}

/** Something an action takes. */
export type ActionParameter = {
  /** Its words in the action's:  `a pile`;  `""` when its words don't say. */
  words: string
  /** The program's type it is, if its words name one:  `Pile`. */
  type?: string
}

/** The action named `name` in `type`, taking `arity` arguments, from its `written` words. */
function actionFrom(
  name: string,
  arity: number,
  written: string | undefined,
  type: string,
  typeWords: [string, string][]
): InspectorAction {
  if (!written)
    return { name, words: wordsOfName(name), parameters: Array.from({ length: arity }, () => ({ words: "" })), type }
  // the thing itself:  the first `a card` in a card's action
  const own = new RegExp(`\\b(?:an?|the)\\s+${wordsOfName(type)}\\b`, "i")
  const words = written.replace(own, "it")
  // each `a <type>` after it, in order:  `a pile`
  const named: ActionParameter[] = []
  const tokens = words.split(/\s+/)
  tokens.forEach((token, index) => {
    if (!ARTICLE.test(token) || named.length >= arity) return
    const rest = tokens
      .slice(index + 1)
      .join(" ")
      .toLowerCase()
    const known = typeWords.find(([typeWord]) => rest === typeWord || rest.startsWith(`${typeWord} `))
    if (known) named.push({ words: `${token} ${known[0]}`, type: known[1] })
  })
  const parameters = Array.from({ length: arity }, (_, index) => named[index] ?? { words: "" })
  return { name, words, parameters, type }
}

/** A class or method name in words:  `StockPile` => `stock pile`, `turnOver` => `turn over`. */
function wordsOfName(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase()
}

/** A word before a thing's type, in an action's words:  `a pile`, `the pile`. */
const ARTICLE = /^(?:an?|the)$/i

/** Spell's own base types, by the names its core gives them:  where a thing's actions stop. */
const BASE_TYPES = ["Thing", "List", "App", "View", "Page", "ViewableList"]

/** An event's method:  `onClick`, `whenCardDroppedOn`, `whileCardDraggedOver`. */
const EVENT_METHOD = /^(?:on|when|while)[A-Z]/

/** Methods that aren't actions:  drawings, events, conditions, questions. */
const NOT_ACTIONS = /^(?:constructor|draw|(?:draw|on|when|while|can|is|has)[A-Z0-9_].*)$/

/** Words that aren't an action's:  a question (`is a (rank)`), a drawing (`draw it`). */
const NOT_ACTION_WORDS = /^(?:is|are|has|draw)\b/i
