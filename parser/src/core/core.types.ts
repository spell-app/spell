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
import type { waitingMethods } from "./waiting"
import type { savedMethods } from "./saved"
import type { abilityMethods } from "./abilities"
import type { dimensionMethods } from "./dimensions"
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
export const SPELL_CLASSES = [
  "Thing",
  "List",
  "App",
  "View",
  "Page",
  "TwoSidedView",
  "Notebook",
  "ViewableList",
  "Place"
]

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
  typeof savedMethods &
  typeof describedMethods &
  typeof sendingMethods &
  typeof actingMethods &
  typeof waitingMethods &
  typeof abilityMethods &
  typeof dimensionMethods &
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
 * | `waiting` | the stand-in on the page for a value that hasn't answered yet | |
 * | `confirm-default` | `confirm` with no Spell UI, e.g. `spell run`:  the question and its answer | `question` |
 * | `drop-event` | the event a page sends as a thing is dragged onto a list, e.g. `card-drop` | `thing` |
 * | `undo`, `redo` | an app's Edit menu with nothing to undo or redo (`App.undoTitle`, `undoing.ts`) | |
 * | `undo-step`, `redo-step` | an app's Edit menu, naming the step:  `Undo Turn Card` | `step` |
 * | `write-refused` | the notice when a place refuses a change | `thing` |
 * | `write-refused-role` | the same, refused as your role can't write:  a guest of a space, or no member (epic `atmosphere` P4) | `thing` |
 * | `write-refused-taken-down` | the same, refused as Spell took it down (epic `atmosphere` P6) | `thing` |
 * | `write-refused-editor` | the same, refused as it takes an editor (`needs`):  making a row, changing a page (epic `atmosphere` P23) | `thing` |
 * | `write-refused-manager` | the same, refused as it takes a manager (`needs`):  making a page, installing an app (epic `atmosphere` P23) | `thing` |
 * | `write-refused-owner` | the same, refused as it's someone else's:  their post (epic `atmosphere` P23) | `thing` |
 * | `write-refused-full` | the same, refused as a sign-up sheet's place is taken:  someone got it first (epic `atmosphere` P27) | `thing` |
 * | `write-refused-not-listed` | the same, refused as a sign-up sheet takes rows only from the people its list names (P27, J101) | `thing` |
 * | `write-refused-used-up` | the same, refused as you've asked for every invitation you have (P31) | `thing` |
 * | `write-retry`, `write-show-me` | that notice's buttons | |
 * | `write-merged` | the notice when a merge kept your value over someone else's | `thing`, `field`, `theirs` |
 * | `write-lost` | the notice when someone else's change replaced your long text | `thing`, `field`, `mine` |
 * | `write-deleted` | the notice when someone else deleted what you were editing | `thing` |
 * | `write-use-theirs` | that notice's button | |
 * | `write-use-mine` | `write-lost`'s button | |
 * | `write-restore` | `write-deleted`'s button | |
 * | `write-changed-under-draft` | the notice when someone else changed what a draft is a copy of | `thing` |
 * | `guest-person` | what someone with no name is called | `number` |
 * | `sign-in-signed-out` | what shows, with nobody signed in to a place where each person is someone | `place` |
 * | `sign-in-signing` | what shows while they sign in | `place` |
 * | `sign-in-as` | what shows with someone signed in, to an atmosphere account | `place`, `name` |
 * | `sign-in-as-spell` | the same, to a Spell account | `place`, `name` |
 * | `sign-in-spell-signed-out` | what shows with nobody signed in to a Spell account, on a place that takes them to be this machine's person | `place` |
 * | `sign-in-cloud-signed-out` | what shows with nobody signed in, on the cloud:  what's changed is kept in this browser until someone is | `place` |
 * | `sign-in-check-email` | what shows while it waits for the emailed link or code | `email` |
 * | `sign-in-email`, `sign-in-code` | the fields for a Spell account's email, and its code | |
 * | `sign-in-email-me` | the button that emails the link and code | |
 * | `sign-in-ended` | what shows once a sign-in has run out | `place` |
 * | `sign-in-failed` | what shows when signing in didn't work | `why` |
 * | `sign-in-abuse` | where to report abuse, the host's abuse contact, on a Spell account's bar (epic `atmosphere` P6) | `contact` |
 * | `sign-in-who` | the field for who they are | |
 * | `sign-in`, `sign-out` | its buttons | |
 * | `sign-in-bluesky`, `sign-in-link-bluesky` | a Spell account's buttons that sign in with, or link, a Bluesky account (epic `atmosphere` P19) | |
 * | `sign-in-linked` | what shows beside a Spell account linked to a Bluesky account | `handle` |
 * | `sign-in-not-linked`, `sign-in-taken-down`, `sign-in-linked-elsewhere` | why coming back from Bluesky didn't sign in | |
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
  waiting: "…",
  "confirm-default": "{question} (yes)",
  "drop-event": "{thing}-drop",
  undo: "Undo",
  "undo-step": "Undo {step}",
  redo: "Redo",
  "redo-step": "Redo {step}",
  "write-refused": "Couldn't save your change to {thing}",
  "write-refused-role": "Couldn't save your change to {thing}:  your role can't write here",
  "write-refused-taken-down": "Couldn't save your change to {thing}:  Spell took it down",
  "write-refused-editor": "Couldn't save your change to {thing}:  it takes an editor of this space",
  "write-refused-manager": "Couldn't save your change to {thing}:  it takes a manager of this space",
  "write-refused-owner": "Couldn't save your change to {thing}:  it's someone else's, and only they change it",
  "write-refused-full": "Couldn't save your change to {thing}:  someone got the last place first",
  "write-refused-not-listed": "Couldn't save your change to {thing}:  only the people its list names sign up here",
  "write-refused-used-up": "Couldn't save your change to {thing}:  you've asked for every invitation you have",
  language: "en",
  "write-retry": "Retry",
  "page-previous": "Previous",
  "page-next": "Next",
  "page-number": "Page {page}",
  "read-failed": "Can't read this right now:  {why}",
  "saved-added": "Add",
  "saved-removed": "Remove",
  "write-show-me": "Show me",
  "write-merged": "{thing}'s {field} also changed elsewhere.  Yours was kept;  theirs was:  {theirs}",
  "write-lost": "Someone else changed {thing}'s {field} at the same time, and theirs stands.  Yours was:  {mine}",
  "write-deleted": "Someone else deleted {thing} while you were changing it.",
  "write-use-theirs": "Use theirs",
  "write-use-mine": "Use mine",
  "write-restore": "Restore",
  "write-changed-under-draft":
    "Someone else changed {thing} while you were editing it.  What you're editing doesn't show that yet.",
  "guest-person": "Guest {number}",
  "sign-in-signed-out":
    "You aren't signed in to {place}, so you can read it, and what you change waits here until you do.",
  "sign-in-signing": "Signing in to {place}…",
  "sign-in-as": "Signed in to {place} as {name}, with an atmosphere account.",
  "sign-in-ended":
    "Your sign-in to {place} has ended:  they last two weeks at most.  Sign in again, and what you changed goes through.",
  "sign-in-failed": "That didn't sign you in:  {why}",
  "sign-in-abuse": "To report abuse on Spell:  {contact}",
  "sign-in-who": "Your handle, e.g. alice.bsky.social",
  "sign-in-as-spell": "Signed in to {place} with your Spell account, {name}.",
  "sign-in-spell-signed-out":
    "You aren't signed in to {place} with a Spell account:  until you are, it takes you to be this computer's person.",
  "sign-in-cloud-signed-out":
    "{place} is kept in this browser only, until you sign in with a Spell account:  then it's saved in the cloud, on every device you sign in on.",
  "sign-in-check-email":
    "Check your email:  {email} has a link and a code.  Open the link on any device, or type the code here.",
  "sign-in-email": "Your email, e.g. ana@example.com",
  "sign-in-email-me": "Email me a link",
  "sign-in-code": "The six-digit code",
  "sign-in": "Sign in",
  "sign-out": "Sign out",
  "sign-in-bluesky": "Sign in with Bluesky",
  "sign-in-link-bluesky": "Link a Bluesky account",
  "sign-in-linked": "You can sign in with Bluesky too, as {handle}.",
  "sign-in-not-linked":
    "That Bluesky account isn't linked to a Spell account here.  Spell is by invite only:  ask for an invite, sign in by email, then link it.",
  "sign-in-taken-down": "The Spell account that Bluesky account is linked to was taken down by Spell.",
  "sign-in-linked-elsewhere": "That Bluesky account is linked to another Spell account already."
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
  /** it may hold the address of a thing of `type`, until something follows it -- see `core.linked()` */
  link?: boolean
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
