import type { coreMethods } from "./core"
import type { collectionCoreMethods } from "./collection-core"
import type { collectionOtherMethods } from "./collection-other"
import type { stringMethods } from "./string"
import type { uiMethods } from "./ui"
import type { drawingMethods } from "./drawing"
import type { elementsMethods } from "./elements"
import type { referencesMethods } from "./references"
import type { pathMethods } from "./paths"
import type { testMethods } from "./tests"
import type { consoleMethods } from "./console"
import type { runtimeMethods } from "./runtime"
import type { thingsMethods } from "./things"
import type { jsonMethods } from "./json"
import type { carryMethods } from "./carry"
import type { classesMethods } from "./classes"
import type { deprecatedMethods } from "./deprecated"
import type { messageMethods } from "./messages"
import type { describedMethods } from "./described"
import type { sendingMethods } from "./sending"
import type { actingMethods } from "./acting"
import type { PropRule } from "spell/util"

// ## Importing core

/**
 * ES module specifier compiled spell imports its runtime from:  `import { core, Thing } from "@spell/core"`.
 * - Every runner -- the app, VS Code's, `<spell-viewer>` -- points it at the copy of the runtime the program runs on,
 *   by rewriting it:  see `linkModule()` in app's `runner/runCompiled.ts`.
 * - No import map.
 */
export const SPELL_CORE_MODULE = "@spell/core"

/**
 * Where compiled TypeScript imports the base class of each view type's element from, as a module name:
 * `import { E, SpellElement } from "@spell/elements"` (epic `drawable-thing` P10, J41).
 * - A name of its own, since core never imports Spell UI:  app's `SpellElement` is behind it.
 * - Resolved in three places:
 *   - a runner points it at the runtime copy, as `SPELL_CORE_MODULE`:  `linkModule()` in app's `runCompiled.ts`
 *   - the type check maps it to app's source:  `typecheck()` in spell's `node/typecheck.ts`
 *   - the headless run (`spell run`, the core contract) maps it to a stand-in:  cli's `runner/hooks.mjs`
 */
export const SPELL_ELEMENTS_MODULE = "@spell/elements"

/**
 * Spell's own classes, from `core/classes`:  what a project's types are made from, e.g. `a card is a thing`.
 * - What a Type Explorer lists as built in -- see `LSP.ScopeExplorer`.
 */
export const SPELL_CLASSES = ["Thing", "List", "App", "View", "Page", "TwoSidedView", "Notebook", "ViewableList"]

/** Names every compiled project imports from `SPELL_CORE_MODULE`:  `core`, and spell's classes. */
export const SPELL_CORE_NAMES = ["core", ...SPELL_CLASSES]

/**
 * Types built into spell, which every project starts with -- `core.BASE_TYPES`.
 * - Spell's classes, plus javascript's own `Object`, so spell can say `create an object` and `a list of objects`.
 *   NOT a spell class, so a Type Explorer leaves it out.
 * - Here, so the parser can read them WITHOUT importing `core`,
 *   whose code must stay in the runtime's own bundle entry -- see `spellRuntime.ts`.
 */
export const SPELL_BASE_TYPES = ["Object", ...SPELL_CLASSES]

/**
 * The type of the `core` singleton:  every module's methods, together.
 * - Built by accretion:  each module below does `Object.assign(core, { ...methods })` at runtime,
 *   so this is the intersection of every module's methods.
 *   `index.ts` has the side-effect imports, in order.
 * - It's the CORE CONTRACT too:  what another target's core must have (Python's `spell_core`, in `py/`).
 *   - What it must print is pinned by the `cli`'s `contract.test.ts`.
 *   - Except `deprecatedMethods`:  old names, for programs compiled before they changed.
 *     A new core has none.
 *   - Listed by name, for another core to check itself against, in `core.declarations.json5`:
 *     see `coreDeclarations()`.  A module added here goes in its `CORE_MODULES` too.
 */
export type Core = typeof coreMethods &
  typeof collectionCoreMethods &
  typeof collectionOtherMethods &
  typeof stringMethods &
  typeof uiMethods &
  typeof drawingMethods &
  typeof elementsMethods &
  typeof referencesMethods &
  typeof pathMethods &
  typeof testMethods &
  typeof consoleMethods &
  typeof runtimeMethods &
  typeof thingsMethods &
  typeof jsonMethods &
  typeof carryMethods &
  typeof classesMethods &
  typeof messageMethods &
  typeof describedMethods &
  typeof sendingMethods &
  typeof actingMethods &
  typeof deprecatedMethods

// ## Tests

/**
 * How one test went, as `core.testResults()` keeps it:  the `ActiveTest` it was, once it's ended.
 * - `name`:  its `message`, e.g. `test card setup`
 * - `passed`:  every check passed, and it didn't throw
 * - What runs tests reads them:  `spell test`, and the VS Code runner's Run Tests, which shows each failed check
 *   in the editor, on its line (epic `spanish`, Card Checks and Test Results).
 */
export type TestResult = {
  name: string
  method?: string
  passed: boolean
  checks: TestCheck[]
  output: unknown[]
  threw?: unknown
}

/**
 * One `expect()` in a test:  `its rank should be queen`.
 * - `what`, `expected`:  the spell they were written as, `its rank` and `queen`, as compiled into the call:
 *   so the language server finds the line it's on.  `expected` is `undefined` for `expect x` with no value.
 * - `message`:  what it printed, in the program's language, e.g. `Unexpected: ... should be ... but is actually ...`
 */
export type TestCheck = {
  passed: boolean
  what: string
  expected?: string
  message: string
}

// ## Messages

/**
 * What the core says to the person running a program, in English:  its built-in words, by key (epic `spanish` P12).
 * - `core.message(key, values)` fills one in:  each `{name}` is `values.name`.
 * - A project in another language brings its own, in its words file's `messages`, which the runner hands
 *   `core.useMessages()`:  each from its language pack (spell's `languages/<lang>/messages.ts`).
 *   - English writes none:  these are its words.
 * - ONLY what a person running the program sees.  What a programmer sees stays English:
 *   assertions, thrown errors, a property's type warnings, `draw() failed` on the console.
 *
 * | Key | Where it shows | Placeholders |
 * | --- | --- | --- |
 * | `expect-passed` | a test's ✅ line, `expect` | `what`, `expected` |
 * | `expect-failed` | a test's ❌ line, `expect` | `what`, `expected`, `actual` |
 * | `expect-truthy` | what `expect x` with no value expects | |
 * | `test-step` | a `to test ...` method's ▶️ line, each statement | `step` |
 * | `test-threw` | a test that threw (Python's core:  the javascript core's swallows it) | `test` |
 * | `cant-draw` | the stand-in on the page for a thing whose drawing failed | `type` |
 * | `confirm-default` | `confirm` with no Spell UI, e.g. `spell run`:  the question and its answer | `question` |
 * | `drop-event` | the event a page sends as a thing is dragged onto a list, e.g. `card-drop` | `thing` |
 * | `undo`, `redo` | an app's Edit menu with nothing to undo or redo (`App.undoTitle`, `undoing.ts`) | |
 * | `undo-step`, `redo-step` | an app's Edit menu, naming the step:  `Undo Turn Card` | `step` |
 *
 * - Python's `spell_core` has the same table (`messages.py`):  both read `messages.expected.json5` in their tests.
 */
export const CORE_MESSAGES = {
  "expect-passed": "As expected {what} is {expected}",
  "expect-failed": "Unexpected: {what} should be {expected} but is actually {actual}",
  "expect-truthy": "truthy",
  "test-step": "▶️ Executing   {step}",
  "test-threw": "Error in test {test}:",
  "cant-draw": "⚠ {type} can't draw",
  "confirm-default": "{question} (yes)",
  "drop-event": "{thing}-drop",
  undo: "Undo",
  "undo-step": "Undo {step}",
  redo: "Redo",
  "redo-step": "Redo {step}"
}

/** One of the core's messages, e.g. `expect-failed` -- see `CORE_MESSAGES`. */
export type CoreMessageKey = keyof typeof CORE_MESSAGES

/** Every one of the core's messages, in one language:  what a language pack holds (`SP.Language.messages`). */
export type CoreMessages = Record<CoreMessageKey, string>

// ## Properties

/**
 * What a compiled property setter checks a new value against -- warns, NEVER rejects.
 * - e.g. `set title(value) { this.setProp('title', value, { type: 'text' }) }`
 * - see `core.checkProp()`
 */
export type PropCheck = {
  /** type name, e.g. `text`, `choice`, `Card` -- see `core.isOfType()` */
  type?: string
  /**
   * legal values, e.g. `Card.Suits` -- or a function returning them, read when a value is set,
   * e.g. `() => Deck.Suits`:  a value kind's list is on ANOTHER class, which may be defined after ours
   */
  oneOf?: readonly unknown[] | (() => readonly unknown[])
  /** what its value must be, beyond its type, e.g. `[{ type: "empty" }]` -- see `PropRule` (epic `property-editor` P9) */
  rules?: readonly PropRule[]
}

// ## Modules

/**
 * Wrap a module's methods object, returning it as is:  marks it as part of `core`.
 * - Module method bodies call sibling methods through the imported `core` singleton, NOT `this`.
 * - NOTE: this intentionally does NOT try to type `this` as `Core` (e.g. via `ThisType<Core>`):
 *   `Core` is itself assembled from `typeof <module>Methods` for every module,
 *   so a signature here that mentions `Core` would make every module's methods type circularly depend on itself.
 */
export function defineCoreModule<T extends object>(methods: T): T {
  return methods
}
