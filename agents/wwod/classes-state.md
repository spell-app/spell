# WWOD spoke -- Classes & state

Classes, decorators, spell-cell state, `Loadable`, value objects and records.  Read with
`agents/wwod/WWOD.md` (the hub).
From:  original WWOD §12-16, root `AGENTS.md` "Decorators", `packages/ui/AGENTS.md` "UI rules" (classes rule,
widened).

Solid mechanics of spell cells (bridge, flush, `tracked()`):  `guides/solid/solid-2.md`
"Spell's decisions".
This spoke is house style on top.

## 12. Classes

- **The `instance.record` pattern:**
  - TODO:  write this rule up.  The shape:  a class wraps a plain record, with typed, validating accessors over it.

    ```ts
    class Vehicle<VR extends VehicleRecord = VehicleRecord> {
      protected record: VR
      constructor(record: VR) {
        this.record = record
      }
      get speed(): number {
        return this.record.speed ?? 0
      }
      set speed(speed: any) {
        if (typeof speed !== "number") ...
        this.record.speed = speed
      }
    }
    ```

- **A class for anything with IDENTITY, a LIFECYCLE, or that COORDINATES:**
  - "The operations look functional" is no reason to skip the class.  A state machine over a record IS a class:
    its transitions are methods (below, "Transitions MUTATE ...").
  - Runtime services are classes (`Keyboard`, `Overlays`, `Styles`), builders are classes (`ClassBuilder`), stateless
    singletons too -- WWOD §8.
  - Free functions only for pure helpers no one class owns, e.g. `extend.ts`'s `getProp()` / `setProp()`, shared by
    `Observable` and compiled spell.  A helper ONE class uses is a private method or `private static` on it;  a
    helper that earns a name becomes a private method or a small class.
- **Transitions MUTATE, and return a result structure or `this`;  derived reads are getters:**
  - A transition writes props through their setters (`@prop accessor`, or `setProp()`), e.g. `EditorStore`'s
    `showNotice()` / `hideNotice()` set `editor.notice`;  a read is a getter (`get appType()`), reactive because it
    reads a prop (`packages/app/src/editor.ts`).
  - Nothing else to return:  `return this`, typed `: this`, so calls chain and a subclass chains as itself, e.g.
    `UI.icons.reset()` (`packages/ui/src/runtime/IconPacks.ts`), `Loadable.stopInflightLoadOrSave()`.
  - NOT:  free functions that each take the record and return `{ ...record, changed }`.  Immutable-record-plus-spread
    forces every caller to re-assign the result, and a caller that forgets silently keeps a stale object.
  - What a prop HOLDS is not made reactive:  replace a held list / plain object, don't change it in place.
    SEE:  `guides/solid/solid-2.md` "Spell's decisions" › "Spell cells".
- **Say what the class does NOT know about:**
  SEE:  WWOD §6 › "A module or class docstring states its POSITION IN THE IMPORT GRAPH".
- **Constructor takes ONE `props` object, normalized inside, and maybe a separate `context` object for dependency
  injection:**
  - Typed `XProps`, declared below the class (WWOD §9), e.g. `Observable`'s `constructor(props)`,
    `new Logger({ prefix, level })` -- each property falls back to its field default.
  - A shorthand is fine when one property is the common case:  `new LoadableFile("url")` ~== `{ url }`.
  - The collaborators it's given (the host, a fetcher, the runtime) go in `context`, apart from its own data.
- **A collaborator constant for the object's life is a `readonly` field set once, NOT a parameter on every method:**
  - `FormFields` takes its `host` once (`private readonly host`) instead of threading it through every lookup;
    `CalendarDates` keeps the page's `Temporal` as `readonly temporal`.
  - Document it:  "STATIC for the object's life ... a test that needs a different one builds a different object."
- **The injected escape hatch is what makes it testable:**
  - Name the one seam a test or another environment swaps, e.g. `LoadableFile.fetch`:  "Replace it to answer
    in-process, e.g. from disk under node".
- **TS `private`, never `#private`:**
  - `private` / `protected` for fields and methods alike.
  - Why:  `#private` throws when reached through a `Proxy` wrapping the instance, and tests can't reach it.
  - NOT:  `#` for private fields, TS `private` for methods -- see above.
- **`static` class constants, declared after the main methods:**
  - In a class, all helpers and constants go AFTER the main methods, e.g. `EmojiData`'s registries
    (`private static readonly sets`, `loads`:  `packages/ui/components/ui-emoji/EmojiData.ts`).
  - Module level:  WWOD §8 › "Class first, its types and helpers below".
    - `ui` keeps a constant ONE class uses as a module `const` below the class instead (a static's name survives
      minification):  `packages/ui/AGENTS.md` "Classes" (epic `wwod-spell-ui`, Q18).
  - Tuning tables are `as const` objects, e.g. `UI.themes`' `slots = { base: BASE, theme: "theme" } as const`
    (`packages/ui/src/runtime/Themes.ts`).
  - Developer / debug switches are the exception and stay at the top ("ALL-CAPS switches" below).
  - If a value property can be overridden per instance or per subclass, use `@proto` to define it on the prototype
    ("`@proto static` defaults" below).
- **Every `static` member's docstring says WHY it's static:**
  - e.g. class-wide by nature ("How EVERY `LoadableFile` reaches its `url`"), or page-wide state ("so each chunk is
    requested once at a time", `EmojiData.loads`).
  - A static that CAN'T become an instance method records that too (called before any instance exists ...), so the
    refactor isn't re-proposed:  WWOD §6 › "Record the rejected refactor".
- **Class banner:**  SEE:  WWOD §6 › "Component banner".
- **`////////////////` sections INSIDE a long class, ordered outside-in:**
  - What it owns, then its state, then what callers do to it, then the private machinery, pure statics LAST.
  - e.g. `Loadable`:  load state → loading → saving → `## Internal`.
  - Static members are class-wide regardless of position, so reordering is free -- confirm with a clean `yarn ts`
    before touching anything else, then move them.
- **Brand checks only where `instanceof` can't work:**
  - TODO (not settled):  this rule, as written.
  - `instanceof` fails across bundles (each `<spell-app>`'s `spell-runtime.js` is its own copy), across HMR
    reloads, and on a global the environment lacks (`Element` / `Node` under node or linkedom).  There, and only
    there:  `static __isX__ = true` + an exported `isX()` guard above the class, with
    `// NOTE: use this rather than instanceof -- <which bundles / HMR / environment>.`
  - Or duck-type the shape, as cells do:  "a source is `{ subs, version, refresh? }`, never checked with
    `instanceof`" (`packages/util/src/reactive/cells.ts`).
- **Backing field declared immediately AFTER its getter:**  `get record() { ... }` then `private _record`.
- **Reach the owner's collaborators through one-line delegating getters, not stored copies:**
  - `get ui() { return this.owner.ui }`:  a copied field goes stale when the owner swaps its collaborator.
- **ALL-CAPS switches at the top of the class:**
  - Developer / debug switches, set by hand, one-line comment each, e.g. `Match.DEBUG_MATCH_INITIALIZATION`:  "Set
    `false` to skip constructor `assertType` / `assertArrayType` checks".
  - Behaviour a subclass or instance overrides is NOT one:  "`@proto static` defaults" below.
- **Debounced write-backs are `xSoon` members:**
  - e.g. `compileApp()` => `compileAppSoon()`:  the name says it's deferred and coalesced.
  - Through `debounce()` from `$/util`.
- **Derived reads are plain getters;  `@derived` only when worth it:**
  - `@derived get y()` / `this.derive(name, fn)` (`Observable`) ONLY for a pure getter doing real work (loops, list
    aggregates):  memoizing a cheap getter costs more than it saves.
  - SEE:  `guides/solid/solid-2.md` "Spell's decisions" (the measurement, derived properties,
    equality cutoff).
  - NOT:  `@memoize` every non-trivial getter that can run several times per render -- the cost above, and cells
    already re-run only readers whose value REALLY changed.
- **A lazily made collaborator keeps its identity:  `this.derived(name, getter)`:**
  - `Derivative.derived()`:  made on first read, the SAME object after (not reactive), `clearDerived(name)` resets;
    e.g. `SpellFile.project`.  NOTE:  `derived()` (compute once) is not `derive()` (reactive memo).
  - Outside a `Derivative`:  `@lazy get x()` (`$/util`), made on first read, the SAME value after;
    `@once` for a method run once (a loader's promise);  `forget(object, "x")` resets either, e.g. in a
    `static reset()`.  Replaces a backing field plus `return (this.field ??= make())`
    (`packages/ui/src/docs-components/SiteData.ts`).
  - A lazy value that is STATE (must be reactive, survive re-derivation) is `getState(name, init)` instead -- §13.
- **Literal getters say `as const`:**  a getter returning a fixed literal (a type name, an icon) narrows its type, so
  subclasses' literals stay distinct.
- **Pref keys are `static SCREAMING_CASE`, with a paired getter / setter:**
  - Over `getPref()` / `setPref()` (`$/util` `prefs.ts`;  `setPrefKey()` once per app, e.g. `editor.ts`'s
    `setPrefKey("spellEditor:")`).

    ```ts
    class EditorStore {
      /** Pref key for the last file shown, per project. */
      static LAST_FILE_PREF = "lastFile"
      get lastFile() {
        return getPref(EditorStore.LAST_FILE_PREF)
      }
      set lastFile(path: string | undefined) {
        setPref(EditorStore.LAST_FILE_PREF, path)
      }
    }
    ```

  - Today the editor keys by path instead, through overloaded get / set functions, e.g. `lastSelectionForFile(path)`
    reads, `lastSelectionForFile(path, selection)` writes (`packages/app/src/editor.ts`).
  - In `ui` (no `$/util` prefs):  one key table and static read / write pairs, every access wrapped, e.g.
    `NavPreferences` (`packages/ui/src/docs-components/ui-docs-nav/NavPreferences.ts`).
- **Subclass for behaviour, spread for plain config:**
  - Behaviour that varies is a subclass overriding methods, its class-level defaults `@proto static` ("`@proto
    static` defaults" below), e.g. `TextFile` / `JSONFile` extend `LoadableFile`.
  - A plain config / spec record (data, no methods) spreads over its defaults:
    `{ ...defaults, ...user, ...overrides }` (`packages/ui/src/elements/Shorthand.ts`).
  - NOT:  config-by-spread over subclassing for pluggable BEHAVIOUR (`{ ...BaseSpec, parse, stringify }`) -- a
    function in a spread record has no `super`, no `instanceof`, no docstring home.
- **Interning:**  SEE:  WWOD §15 › "Immutable and interned, so `===` is equality".
- **Converting immutable → mutable requires an await-audit:**
  - With an immutable record a lost race harmlessly dropped a stale copy;  once the record IS `this`, a lost race
    CORRUPTS the live object.
  - Walk every `await` that captured it, confirm a fence (epoch counter, generation check, in-flight identity) sits
    between the await and the write, and comment it at the call site.  `Loadable.load()`
    (`packages/util/src/spell/Loadable.ts`):

    ```ts
    const onSuccess = async (contents: ContentType) => {
      // Only update if the same `loader` is active
      if (this.loadState.loader === loader) {
    ```

### Decorators

- **Standard decorators only:**
  - Use STANDARD (TC39 2023-11) decorators, NEVER `experimentalDecorators` or legacy 3-arg decorators that mutate
    the property descriptor.  General-purpose ones live in `packages/util/src/decorators.ts` (`@proto`, `@lazy`,
    `@once`:  import from `$/util`;  `ui` has `$/ui/util`, which re-exports the generic ones).
  - The reactive ones (`@prop`, `@state`, `@derived`) live in `packages/util/src/reactive/decorators.ts`;  spell's
    own `@thing` in `packages/util/src/spell/spellDecorators.ts`, for HAND-WRITTEN `Observable`s only.  SEE:  `guides/solid/solid-2.md` "Spell's decisions" ›
    "Decorators for HAND-WRITTEN classes".
- **Lowered by esbuild:**
  - Lowered by esbuild via the repo root's `vite.decorators.ts` -- vite 8's own transformer (oxc) doesn't do it yet.
    Which configs use it:  the package's own "Decorators".
- **`@proto static` defaults:**

  ```ts
  class Rule {
    declare highlightAs?: string
  }
  class Keyword extends Rule {
    @proto static highlightAs = "keyword"
  }
  new Keyword().highlightAs === "keyword" // read from the prototype
  ```

  - A class-level default an instance reads as its own (`packages/util/src/decorators.ts`).
  - Why not an instance field:  instance fields initialize AFTER `super()` returns, so a base class constructor
    can't see a subclass's;  `@proto` puts the value on the PROTOTYPE, once, when the class is defined.
  - A subclass overrides with its own `@proto static`;  an instance shadows it with its own value
    (`Object.assign(this, props)`).
  - The field MUST be one instances declare (`declare highlightAs: string` on the base), so a typo is a compile
    error, not a silent static.
  - Where it goes:  with its property group, the base's `declare` and its `@proto static` default side by side, in
    the `////` section of the code that uses it -- not gathered at the top of the class (Owen:  "locate code near
    its siblings";  epic `wwod-spell-ui`, Q11;  e.g. `UIComponent.elementSetup`).
  - A base class hears each one through `static protoDefined(name, value)`, e.g. `P.Rule` registering
    `@proto static importableAs`.
  - Use it for behaviour a subclass or instance overrides, rather than a constructor default or a getter;  a
    developer / debug switch set by hand is ALL-CAPS instead ("ALL-CAPS switches at the top of the class").
- **Reactive members:  the decorator says how the member works** (`ui`'s components, and any class there;  Owen,
  2026-10-06, epic `wwod-spell-ui` P14:  "having to create decorators will keep us honest ... once learned, the
  decorator is a signal for how this bit works"):
  - `@state accessor isOpen = false` -- own state;  `@controlled("open") accessor isOpen` -- the host's property
    when set, else the starting value;  `@derived get rows()` -- a cached derived value;  `@cssState("open")` --
    `:state(open)` follows the member;  `elementSetup.cssStates: ["fluid"]` -- `:state(fluid)` follows the
    attribute, no getter;  `@aria("busy")` -- `internals.ariaBusy` follows the member;
    `@onChange("a", "b") onXChanged(a, b)` -- an effect calling the method.
  - All over ONE record per instance:  a read right after a write is fresh (no flush), and Solid follows the reads.
    `@derived` is a self-tracking cache over the record (spell cells' idea), never a Solid memo, so it MUST read
    only record members;  else a plain getter.
  - A plain getter for a cheap derived value, as "Derived reads are plain getters" says.
  - Where they live and the details:  `packages/ui/src/elements/Reactive.ts`, `packages/ui/AGENTS.md` "Solid
    authoring".  Hand-written spell `Observable`s keep `@prop` / `@derived` from `spellDecorators.ts`:  the same
    idea on spell cells.
- **A decorator starts its line:**
  - A decorator MUST be the first thing on its line, or that plugin won't notice the file.
  - The decorator and its field on ONE line is preferred:  `@proto static inlineInitialType = false`.  NOT
    `static readonly @proto x` (decorator mid-line).
- **A misapplied decorator throws a self-naming `TypeError`:**
  - Name the decorator, the member and the fix (WWOD §5).  Today's message (`packages/util/src/decorators.ts`) names
    the decorator, the member and the problem, and leaves the fix ("make it `static`") implied:

    ```ts
    if (!context.static) {
      throw new TypeError(`@proto ${String(context.name)}: only works on 'static' fields.`)
    }
    ```

  - Misuse that still works warns instead, e.g. `@prop` with an initializer:  "has an initializer, which runs after
    create() -- use @prop({ default })".

## 13. State

- **The instance IS the store:**
  - A class with reactive state extends `Observable` (`packages/util/src/spell/Observable.ts`):  its props and state
    are spell cells.  No separate store object (why:  the `solid-2.md` SEE below).
  - Readers (Solid computations through the host's bridge, React through `view()`, `observe()`) re-run when a value
    they read REALLY changes.  Reads are synchronous:  a read right after a write sees it.
  - e.g. `EditorStore` (`packages/app/src/editor.ts`):  `editor.x = y` anywhere, and Solid code reading `editor.x`
    re-runs.
  - SEE:  `guides/solid/solid-2.md` "Spell's decisions" › "Spell cells".
- **Props are public, state is transient:**
  - Props:  persisted, listed by `keys()` and `toJSON()` (§16).  Declared `@prop(info) accessor x!: T` in
    hand-written classes, `getProp()` / `setProp()` accessor pairs in compiled spell -- the same runtime shape.
  - State:  internal, never persisted, e.g. a `Task`'s `status`:  a getter over `getState("status")`, written with
    `setState()`, cleared with `resetState()`.
    - TODO:  `getPref()` to keep state across page loads.
    - TODO:  a `@state` decorator for `Observable`s?  (`ui` has one, on its own record:  §12 › "Reactive members".)
  - A plain field (`foo = 1`) is NOT spell state (`solid-2.md` "Spell's decisions" › "Decorators for HAND-WRITTEN
    classes").  Use one only for what no reader needs, and say so (`EditorStore`:  "a plain field
    (`compileAppSoonTimer` ...) is NOT reactive").
- **State initializes LAZILY, in its getter, never in the constructor:**
  - Subclass fields aren't set up yet while a base constructor runs.  Read through `getState(name, init)` /
    `getProp(name, init)`, whose initializer runs on first read:

    ```ts
    protected get loadState(): LoadState<ContentType, SaveResult> {
      return this.getState("loadState", () => ({ isLoaded: false }))
    }
    ```

  - A prop's default is in its declaration, NEVER an initializer (it runs after `create()`):  `@prop({ default: 1 })`,
    or `{ init: () => [] }` for an object made once per instance.  SEE:  `spellDecorators.ts` `@prop`.
- **Template hooks with empty bodies:**
  - The base class defines the hook empty, subclasses override, e.g. `Observable.onRemove()`,
    `Loadable.onContentsUpdated()`.  Add hooks as a class needs them, not up front.
  - The docstring says when it's called, what's already done by then, and whether `super` goes first or last.
  - Defaults come from the schema (`@prop({ default })`);  a persisted preference is the initializer:
    `getProp(name, () => getPref(KEY, fallback))`.
  - A hook that persists opens with a lifecycle guard (`if (this.wasRemoved) return`), and persists `toJSON()`
    (§16).
  - Normalize or validate a change in the prop's setter, before `setProp()` (a hand-written getter / setter pair).
    Type warnings:  override `checkPropType()`, as `Thing` / `List` do.
- **Change nested state by dotted path:**
  - `setState("loadState.isLoaded", true)` writes inside the `loadState` object and tells its readers (to unset:
    §16).  e.g. `Loadable.updateLoadState()`, one `setState()` per key.

## 14. `Loadable`

`Loadable` (`packages/util/src/spell/Loadable.ts`) is the base for anything loaded and maybe saved:  `LoadableFile`,
`TextFile`, `JSONFile` ...

- **Required subclass surface is `abstract`;  an optional capability is a concrete method that throws:**
  - Required:  `abstract getLoader(loadParams)`.
  - Optional (saving), the TARGET:  the base's `getSaver()` throws "can't save";  callers ask a getter that compares
    prototypes.  Today `getSaver()` is `abstract` and there's no `canBeSaved`:  `agents/CODE-DEBT.md` "util".
    The target getter:

    ```ts
    get canBeSaved() {
      return this.getSaver !== Loadable.prototype.getSaver
    }
    ```

- **Verb triple per operation:  public orchestrator → protected doer → hook:**
  - `load()` / `save()` orchestrate (cache, in-flight reuse, fences):  "NOTE: don't override this, override
    `getLoader()` instead!"
  - `getLoader()` / `getSaver()` do the work:  "Don't call this directly, it'll be called from `load()`."
  - `onContentsUpdated()` reacts:  a template hook (§13).
- **All mutable load state in ONE state object:**
  - `loadState` (`LoadState`), made lazily by `getState()` -- §13.
  - Written only through `updateLoadState(props)`, so §16's `===` no-op holds and a change tells the readers.
  - Exposed as public getters (`isLoaded`, `isLoading`, `isSaving`);  a setter only where callers may write
    (`isDirty`).
- **Per-instance debug is a `Logger` field:**
  SEE:  WWOD §19 › "One tagged logger per subsystem, as a class field".

## 15. Value objects / instance singletons

- **Immutable and interned, so `===` is equality:**
  - Why:  ONE instance per value, so `===` compares them, a `Map` can key on them, and anything derived from one is
    worked out once and shared by every holder.
  - `readonly` fields set in the constructor, or `Object.freeze(this)` -- e.g. `SpellLocation`'s `readonly path`,
    `projectId` ...;  `Rule.freeze()` ("Rules are shared by every parse, so per-parse state MUST go in `match.data`").
  - Interned in a `private static readonly` registry, plus a `static reset()` for tests:  the same input always
    gives the same object, e.g. `SpellLocation.registry`.  The same shape keeps any per-key object made once, e.g.
    `EmojiData`'s `private static readonly sets` + `reset()` ("For tests and hot reload"), `RootLoader.loads`
    ("Folder => its import, started once").
  - Constructor `protected`, reached through the static factories below.  Assign the debug-friendly field (`path`)
    FIRST, so a half-built object still prints, then the rest, then freeze.
- **Static factory pair:  `xOrDie(input)` throws, `optional(input)` returns `undefined`:**
  - The throwing one raises a house error naming the input, the problem and the fix (WWOD §5).  Today's message,
    `new SpellLocation('<path>'):: Invalid path`, names only the first two.
  - Subclasses redeclare them verbatim, to narrow the return type.
- **Subclasses may add methods and fields, but never change the contract of an existing property:**
  - Narrowing an inherited one's type is fine (`declare`-retype it);  changing what it means is not.
- **Validators:  `static X_PATTERN` + throwing `validXOrDie()` + non-throwing twin:**
  - The twin answers without throwing (`isValidX()`) or repairs (`normalizeX()`), e.g. `SpellLocation.isValidPath()`
    / `isValidPathSegment()`.
  - The pattern is a `static`, not a local `const` in the validator, so callers and tests share it.
- **Declarative filters:**  when callers ask "is this value one of the kind I want?" in several ways, put the
  checks in ONE table instead of a method per check:
  - A `private static FILTERS` map from a filter name to `(value) => true | "why not"`.
  - `matchesFilter(filter)` answers `true` / `false`;  `matchesFilterOrDie(filter)` throws the "why not" message.
  - Adding a kind of check is one line in the table;  every caller gets the same message.

    ```ts
    private static FILTERS = {
      project: (location: SpellLocation) => location.isProjectPath || "not a project",
      file: (location: SpellLocation) => location.isFilePath || "not a file"
    }
    ```
- **Conversion pair:  `toString()` / `toJSON()`:**
  - `toString()` for debugging (`SpellLocation: @user:projects:myProject`);  `toJSON()` for the wire.

## 16. Records

- **Unset with `undefined`, not a sentinel:**
  - `setProp(name, undefined)` / `setState(path, undefined)` delete the key:  it leaves `keys()` and `toJSON()`.
    `deleteProp(name)` says the same.
  - `delete this.prop` is NOT trapped -- never use it on an `Observable`.
  - Writing the value a prop already has (`===`) is a no-op (`solid-2.md` "Spell's decisions" › "Updates only on
    differences").  So a caller just writes;  it never checks "did this change?" first, or keeps a `somethingChanged`
    flag to decide whether to notify.
- **`toJSON()` is props only, in `keys()` order:**
  - `Observable.toJSON()` gives exactly that, never state.
  - An override deep-clones, serializes children through their own `toJSON()`, and prunes empty keys.
- **Bracket access for known-untyped JSON keys only:**  `record["gate_type"]` marks a key that no type declares;
  typed keys use `.`.
- **Compact domain encodings:**  module-private single-char consts + a `typeof` union + a name map, not an `enum`.
