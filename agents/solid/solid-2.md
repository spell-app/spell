# Solid 2 -- rules for agents

Read this BEFORE writing or reviewing Solid code, JSX, `core` rendering, `spell/util` reactivity (spell cells),
or anything touching Spell UI (`spell/ui`).
- Distilled from two guides in the epic repo (`spell.epics`):
  `guides/solid/solid-2.html` (the why) and `guides/solid/cheatsheet.html` (the API).
  - `solid-2.html` below is that guide.
- It lives in the kit, `agents/solid/`, and ships in the npm `spell` package, so any project on Solid 2 can read it
  (epic `repo-split` P31;  the epic repo's `guides/solid/` until then).
  - Spell's own state and choices are their own sections, "Status" and "Spell's decisions":  another project
    reads the rest.

## Status

- The app is ON Solid 2 (migration built 2026-10-02, branch `solid-migration`):  the editor app, `<spell-viewer>`,
  `<spell-editor>` and the VS Code runner draw with Solid on Spell UI (`spell/ui`);  spell state is spell cells;
  `easy-state` is GONE.
  - How it's built now, and why:  `guides/solid-migration.html`.  The record (phases, decisions, log):
    `epics/solid-migration/`.
  - Compiled spell draws with Solid too, in both targets (epic `output-targets` P10-P12, on `main` since
    2026-10-10):
    - javascript calls Solid's own `h()` (`@solidjs/h`, imported from `@spell/core`;  P20) and
      `core.drawThing()`.  `core.element()`, what it called before P20, is gone (P22).
    - TypeScript (`ts/solid`, a `.compiled.tsx`) is real JSX, with `<Show>` / `<For>` and `@drawn draw()`
    - how, and why:  `guides/targets/targets.html`, "Drawing with Solid"
  - React is GONE from `app`, `core` and `util`:  no React kits, no `view()`, no `@vitejs/plugin-react`.
    Only the `spell` CLI keeps it, for its terminal screens (Ink).
  - Items still marked (planned) below wait on an open todo:  they are NOT in code.
- Target Solid 2.0 FINAL, `2.0.4` (2026-11-26, epic `solid-2-final` P21;  rc.21 from 2026-11-09, epic `epic-engine`
  P67), every package pinned EXACTLY:

  ```text
  solid-js, @solidjs/web, @solidjs/signals                 2.0.4
  @solidjs/h, @solidjs/compiler, @solidjs/babel-plugin     2.0.3
  @solidjs/vite-plugin                                     3.0.1
  @solidjs/router                                          2.0.1
  @solidjs/start-devtools  (an optional peer)              1.0.1
  seroval, seroval-plugins           yarn's pick (solid-js asks ^1.8.0:  1.8.2)
  ```

  - every repo is on them:  ONE copy at the kit's root, pinned in the root `resolutions`;
    upgrade them all together (one Solid per page)
  - what changed from rc.13 to 2.0, and bit us, is in the rules below, marked with its release where that still helps
  - 2.0.4 against rc.21, measured:  every experiment the same, every test the same, but for Spell's shadow-root events
    (`ShadowEvents`, which reads Solid's delegation:  `registerDelegatedContainer()` returns nothing now)
- Solid's own docs for agents ship IN `solid-js` since rc.16:  trust them first.
  They're in its folder, `node_modules/solid-js/`:
  - the 2.0 primer:  `skills/solid-2.0/`
  - the cheatsheet, as a skill:  `skills/solid-2.0-cheatsheet/`
  - every dev diagnostic code, and how to fix it:  `skills/reactivity-diagnostics/`
  - the same codes as data, each with its fix and docs link:  `diagnostics.json`
  - docs.solidjs.com is the 2.0 reference;  a dev console message links its code's page there
- Re-verified on 2.0.4:  every experiment read as on rc.21 (as rc.13 had as on rc.11:  `solid-2.html`, "rc.11 vs rc.13").
  - rc.13 moved `createErrorBoundary`, `createLoadingBoundary`, `createRevealOrder`, `sharedConfig` and `$DEVCOMP`
    out of `solid-js` into `solid-js/internal`.  NEVER import from `solid-js/internal`:  use `<Errored>` /
    `<Loading>` / `<Reveal>` (callable as functions, `children` as a getter -- see `UIComponent.mount()` in Spell UI).
  - A Solid upgrade:  run the kit's `guides/solid/experiments/*` on old and new (`SOLID_NODE_MODULES=<dir>` picks the
    Solid) and diff.
- NEVER model Solid 2 on React OR on Solid 1:  both priors produce wrong code here.

## The model in six bullets

- Components run ONCE.  No re-render, no diff.  Each dynamic JSX expression is its own tracking scope.
- Props are lazy getters:  pass VALUES, read `props.x` where used, NEVER destructure props.
- Writes are STAGED:  a read right after a write returns the OLD value until the microtask or `flush()`.  No `batch()`.
- Async is a value:  a memo may return a Promise;  `<Loading>` covers the first load only.
- A write feeding pending async is HELD, with every other write in the same batch.  That replaces transitions.
  - `isPending(fn)` = "is a change on the way?"  `latest(fn)` = "what is it?"
- An uncaught error in any computation HALTS the scheduler for the whole page (`REACTIVITY_HALTED`).

```tsx
;<Counter value={count()} /> // pass the value, not the accessor

function Counter(props: { value: number }) {
  return <div>{props.value}</div> // read where used;  `({ value })` would freeze it
}

setCount(1)
count() // still the old value
flush()
count() // 1
```

## Spell's decisions

- Spell state is NOT Solid signals:  spell needs read-after-write, Solid 2 can't give it (measured, `solid-2.html` §2).
- **Spell cells** -- BUILT (P11), ONE reactive engine for spell and (later) Spell UI:  `spell/util/reactive`
  (`src/util/reactive/`:  `cells.ts`, `Cell`, `Derived`, `Reaction`, `Schema`, `extend.ts`, `bridges.ts`,
  `decorators.ts`;  moved from `src/util/spell/` by `output-targets` P10, Q20).  `Observable` and `@thing`
  stay in `spell/util/spell`.  Prototypes kept in `solid/experiments/` (`spell-cells.core.ts`, `spell-cells.ts`,
  `decorators.ts`), pinned by `util`'s `reactive/cells.test.ts` and `app`'s `cellsBridge.browser.test.tsx`:
  - no lodash and no Solid in it (a test pins it), so any package can import it, file by file
  - Spell UI still keeps its own reactive members (`Reactive.ts`):  moving them onto spell cells has four costs to
    check first (`output-targets` C12).  Until then a derived value sees only its own side's members (C11)
  - each instance keeps its values in a `Map` record, the ONLY truth, read and written synchronously
  - a small synchronous core tracks deps and memoizes derived values
  - one `enableExternalSource` bridge makes Solid computations re-run when cells change:  `bridgeSolid()` in
    `spell/util`, INSTALLED BY THE HOST (`app`'s `src/solid/cellsBridge.ts`, imported by the editor, the runner,
    `<spell-viewer>`, `<spell-editor>` and `tracked()`) -- `util` / `core` never import Solid, so `spell-runtime.js` holds
    none
  - ONE cells context per page, on `globalThis` (`Symbol.for("spell:cells")`):  `spell/util` (the kit's) and every
    `spell-runtime.js` copy share the "who's reading" slot, the pending checks and the host's flush, so the one
    bridge sees every runtime's Things.  Bridged once per Solid (remembered there)
  - compiled output keeps its `getProp` / `setProp` accessor pairs;  derived getters may call `derive()`
  - values are NOT made reactive themselves:  no proxies, `===` holds everywhere.  A list or plain object a prop holds
    changed IN PLACE notifies nobody -- set the prop to a new one (spell's `List` copies on write)
  - plain code follows cells with `observe(fn)`.  (`view()`, the React bridge, is gone with React.)
- **Updates only on differences**, at three levels:
  - `setProp` ignores `===` writes:  nobody is notified
  - a memoized derived value bumps its version only when its value really changes (clean / check / dirty push-pull),
    so readers of an unchanged derived value don't re-run
  - Solid's DOM bindings skip equal text / attribute writes, except input `value` / `checked`:
    they're written again whenever their binding re-runs (SEE "Form inputs" below)
- Derived properties:  plain getter by default;  `this.derive(name, fn)` ONLY when the parser proves it pure AND
  worth it (loops, list aggregates).  Memoizing a cheap getter is ~2x SLOWER.  `derive()` is BUILT;  the parser's
  pure / worth-it analysis is (planned, epic page T6):  today every compiled JAVASCRIPT derived property is a plain
  getter, while compiled TypeScript puts `@derived` on a getter that loops (`output-targets` J22:  a stand-in for
  "worth it", not proven pure).
- **Keys in creation order:**  `keys()` lists own props in first-set order.
  - an overwrite keeps the position;  a delete (or setting `undefined`) removes the key;  re-setting appends it
  - the record MUST be a `Map`:  a plain object hoists integer-like keys (`"2"`, `"10"`) to the front
  - `keys()` tracks a per-instance `keys` cell, changed only when the key SET changes
- **Property types** live in a per-class schema (`schemaOf(Class)`, `Class.schema`):
  - declared by the parser (explicit specifier, or the default literal's type) -- declared types win.  Compiled:
    `static { this.declareProp('suit', { oneOf: Card.Suits }) }` in the class, `Card.declareProp(...)` outside it;
    `Thing` / `List` check a declared prop on the PROGRAM's console (`core.checkProp()`), as before
  - undeclared props:  observed per class, WIDENED on mismatch (`number | text`) with a dev warning, never thrown
  - `nothing` never counts;  Thing-typed props compare with `instanceof`, not by class name
- **Accessors for Things, a `Proxy` only for class-less data** (nested plain objects, JSON a program holds).
  Accessors BUILT;  the Proxy (planned, never started):  today nothing is proxied (see "values are NOT made
  reactive" above):
  - a Proxy that takes EVERY prop and wraps FIRST (P2) fixes the hazards:  `create()` and registration see the proxy,
    field initializers become defaults, `#private` is simply banned in Thing subclasses
  - what's left is cost, on every access:  ~2.5x reads and method calls, ~3.5x derived reads, ~6x construction
  - its wins (`Object.keys` / JSON see the record, plain `thing.foo = x` for ad-hoc props) are cheap with accessors:
    `keys()`, `toJSON()`, a DevTools formatter, `setProp`
  - revisit only if arbitrary ad-hoc props on Things become first-class spell syntax
- **Decorators for hand-written classes AND compiled TypeScript** (the editor's `EditorStore`, `core`'s
  `SpellConsole`;  open to `SP.*`;  `ts/solid`'s `.compiled.tsx`, which is built before it runs).  Compiled
  JAVASCRIPT can't use them (`blob:` URL, no transpile):  it writes the lowered form, `getProp` / `setProp` pairs and
  `declareProp()`, so both spellings MUST build the same runtime shape.  `Thing` / `List` / `App` themselves keep
  `getProp` / `setProp`.  All from `spell/util/reactive` (`decorators.ts`), re-exported by `@spell/core`:
  - `@prop({ type, default }) accessor x!: T` -- schema from decorator ARGS via `Symbol.metadata` (polyfilled in
    `spell/util`'s `Schema.ts`);  an initializer runs AFTER `create()`, so defaults go in the args (`default`, or
    `{ init: () => [] }` for objects).  BUILT;  used by the editor (`EditorStore`), `SpellConsole`, and compiled
    TypeScript (`@prop({ oneOf: RANKS }) accessor rank!: Rank`).
    SEE WWOD §13 › "State initializes LAZILY, in its getter, never in the constructor"
  - `@state` -- a value that isn't a prop:  its initializer is the starting value, and it warns when `create()` set it
    first.  BUILT (P10)
  - `@derived get y()` -- memoized with the equality cutoff;  only for pure, worth-it getters (compiled TypeScript:  a
    getter that loops).  `@state` and `@derived` take `{ equals }`, as Spell UI's do.  BUILT
  - `@drawn draw()` -- the drawing in its own error boundary (`core`'s `drawing.ts`, not `util`'s:  it shares
    `core.drawThing()`'s boundary).  BUILT (P12)
  - `@thing` on the class -- runs `create()` after the most-derived class's field initializers.  BUILT:
    `src/util/spell/spellDecorators.ts` (`import { thing } from "spell/util"`);  `Thing` / `List` skip their own
    `create()` call when a `@thing` class is in the chain (`runsCreate()`), so it runs exactly once, also for compiled
    classes extending a `@thing` class.  Pinned:  `spell-parser/tests/core/classes/construction.test.ts`
  - plain fields are NOT spell state:  not reactive, not keys, and clobbered by a base-constructor `create()` without
    `@thing`
  - decorated classes read / call / write as fast as hand-lowered accessors;  construction is ~6x slower (fine for
    few-instance classes;  don't decorate fields on a base every spell Thing inherits)
  - where a decorator goes on its line:  SEE WWOD §12 › "A decorator starts its line"
- The editor store is a decorated class (`EditorStore` in `app`'s `editor.ts`, BUILT):  `editor.x = y` call sites
  didn't change.  Solid 2 has NO mutable store.
- `core.flush()` / `flushCells()` (`spell/util`) = run pending derived checks, then the host's Solid `flush()`.  BUILT.
  - spell state:  tests and imperative code call `core.flush()`, NEVER Solid's bare `flush()`, which skips the
    derived checks
  - plain Solid signals and stores:  Solid's `flush()`
- `tracked(read)` (`app`'s `spell-app/app/solid`) = a Solid memo over a read of spell state (boxed, `equals: false`).  A plain
  read in JSX is reactive too (the bridge);  `tracked()` shares one read among readers.  Re-reads on Solid's schedule:
  never mid-write, so program code is safe to run in it (`deferred` is gone).
- Compiled JAVASCRIPT imports ONLY `@spell/core`, never Solid:  `h` included, which core exports (the page's one
  `@solidjs/h`).  It draws with `h()` directly (BUILT, `output-targets` P20, `core`'s `drawing.ts`;  before it,
  `core.element()`, gone since P22):
  - `h()` returns a THUNK:  `draw()` returns it as is, and the error boundary makes it (`madeOnce()`), once, inside its
    memo, so a throw while it's made shows the stand-in (`<Errored>`'s fallback).  Only `h()`'s own thunks:  any other function stays a live
    value.  Nested `h()` calls are made by their parent.
  - the parser emits a FUNCTION for every value that can change (`() => this.shortSuit`, an `ASTJSXLiveValue`)
  - the WRITER writes the page's spellings:  `class`, `for`, `colspan`;  on a tag with a dash, a live value or an
    object as `"prop:value"`
  - a dotted tag (`<UI.Form>`) is a compile error:  Spell UI's elements go by their own tags
  - each drawn thing in its own ERROR BOUNDARY, `drawInBoundary()`:
    `<Errored>` + a memo running `draw()`, the stand-in its fallback.
    - a throw:  one console line, a cancelable `ui-error`, a stand-in;  the rest keeps drawing
    - `drawThing()` for javascript, `@drawn` for TypeScript:  ONE boundary
    - `<Errored>` builds its fallback ONCE per showing since rc.15, so the stand-in is made once
      (`drawing.test.ts` pins it).
    - rc.13 rebuilt it on any change under it:
      the drawing's own `try/catch` for that is gone (epic `solid-17`).
  - `draw()` runs in a memo:  again only for what IT read, redrawing that thing alone
  - `drawItems()` is `<For>` by identity;  `mountApp()` is `render()` in a root of its own (`runWithOwner(null)`), left
    on the element as `spellRoot`
  - (planned) mapping spell's custom-event spelling to the exact `ui-*` event name
- Compiled TYPESCRIPT (`ts/solid`) imports `solid-js` (`Show`, `For`) and `@spell/core` (`prop`, `derived`, `drawn`,
  `on`, `trigger` ...) and is real JSX:  `buildTsx()` lowers its decorators (esbuild), then runs Solid's compiler.  It
  writes only the page's spellings (`class`, `colspan`, `prop:` on a `<ui-*>` tag):  Solid 2's JSX types take no
  others.  The runners can't run it yet;  the core contract does.
- One Solid per page, shared with Spell UI (whose `UI` runtime is already one per page, on `globalThis`):
  - within a bundle:  Solid + Spell UI live in the shared files, NEVER `spell-runtime.js`.  Each `<spell-viewer>`
    keeps its OWN `core`, all share ONE Solid.  `enableExternalSource` is registered once per Solid, by
    `bridgeSolid()` from the host (`app`'s `cellsBridge.ts`)
  - `spell-runtime.js` gets Solid, `@solidjs/web` and `@solidjs/h` from `spell-solid.js` (`sharedFiles()`), which
    also holds Spell UI's element core since `<spell-viewer>` became a Spell UI component;  it never loads
    `spell-ui.js` (`app`'s build tests pin both)
  - `spell run` and the core contract run Solid's BROWSER builds under node, on a linkedom page (`cli`'s
    `hooks.mjs`), with the cells bridged there too
  - across our bundles:  element / runner / editor builds import ONE shared Solid (and `ui`), not a Solid each:  SEE
    `app/AGENTS.md` "Overview".  Any other Solid / `ui` specifier (`solid-js/store`, `spell/ui/runtime`) is a
    build ERROR:  add it to `WHAT_BUILDS_SHARE` (`vite.shared.ts`) AND to what `vite.solid.config.ts` exports
  - on host pages with their own Solid / Spell UI:  an import-map variant of `<spell-viewer>` (bare specifiers)
    (planned, epic page T5:  not shipped -- such a page gets a second Solid today)
  - two copies on one page FAIL SILENTLY:  the fork's `register()` swaps `existing.Component` across copies
- NEVER put Things (class instances) in a Solid store:  stores wrap them in proxies, `===` breaks.

```ts
// hand-written and compiled TypeScript:  decorators;  compiled javascript emits the lowered equivalent
@thing
class Card extends Thing {
  @prop({ type: "text", default: "hearts" }) accessor suit!: string
  @prop({ init: () => [] }) accessor notes!: string[]

  @derived get isRed() {
    return this.suit === "hearts" || this.suit === "diamonds"
  }
}

class Todos extends Thing {
  // memoized:  pure (reads only cells) AND worth it (iterates a list)
  get incomplete() {
    return this.derive("incomplete", function () {
      let count = 0
      for (const task of this.tasks) if (!task.done) count++
      return count
    })
  }
}

card.keys() // ["suit", "rank", "nickname"]
card.suit = "diamonds" // overwrite:  same position;  readers of keys() don't re-run
card.deleteProp("rank") // ["suit", "nickname"]
card.setProp("score", "high") // after numbers:  observed type widens to "number | text", dev warning

// compiled javascript's JSX:  Solid's own h(), a function for everything that can change
h(
  "div",
  { class: () => "card " + this.color, onClick: (event) => this.play() },
  () => this.shortRank + " ",
  () => core.drawThing(this.pile)
)
```

```tsx
// compiled TypeScript (ts/solid):  real JSX, Solid's shapes, the error boundary as a decorator
@drawn
draw() {
  return (
    <Show when={this.isFaceDown} fallback={<div class={"card " + this.color}>{this.shortRank}</div>}>
      <div class="card back" />
    </Show>
  )
}
```

## Rules when writing Solid code

- Writes:
  - NEVER write a signal / store in a component body, memo, effect compute or `createRoot` body -- dev throws
    `REACTIVE_WRITE_IN_OWNED_SCOPE`.  `untrack` does NOT exempt it.
  - write from event handlers, `onSettled`, effect APPLY functions, or `action`s
  - cleanups may write too (rc.16):  an `onCleanup` / `onSettled` cleanup is teardown, not the computation
  - `{ ownedWrite: true }` only for a signal that is internal state by design
- Reads:
  - read reactive values in JSX, a memo or an effect compute -- a component body or `<For>` / `<Show>` callback body
    is an owner, NOT a tracking scope (`STRICT_READ_UNTRACKED`)
  - NEVER wrap a read in `untrack()` to quiet `STRICT_READ_UNTRACKED` (Solid's own advice, 2.0.4):
    the value still never updates, and the warning was the only sign.  Move the read to where it's used:
    JSX, a memo, an effect's compute, the event handler, or an accessor handed to a hook (`useThing(() => props.id)`)
    - `untrack()` is for a one-time snapshot someone DECIDED never follows its source, never for a value that may
      come from async
  - need the value now in imperative code or a test?  `flush()` first (`core.flush()` for spell state).  NEVER
    `flush()` inside an `action`, an effect apply or `onSettled`.
- Effects:
  - `createEffect(compute, apply)` -- two functions, always
  - the apply's RETURN VALUE IS ITS CLEANUP:  use braces, NEVER an expression body that returns a value (halts the page)
  - the apply runs (after the last cleanup) EVERY time the compute re-runs, even when it returned an equal value:
    effects never compare (documented in rc.17)
    - to skip an unchanged value, read a memo in the compute:  its `equals` (default `===`) stops the re-run
    - `const isActive = createMemo(() => status() === "active")`, then `createEffect(isActive, ...)`
  - NEVER create a memo, effect or root in the apply (or its cleanup) with no owner:
    rc.17's dev build THROWS `PRIMITIVE_IN_EFFECT_CALLBACK`.  It's easy to do without seeing it:
    - a custom element's `connectedCallback()`, when Solid inserts the element from an effect:
      the browser runs the callback right there
    - a detached `createRoot()` in code an effect's apply calls
    - a CONDITIONAL prop (`layout={isWide() ? a : b}`):  the compiler makes it a memo on its first read,
      so reading it first inside an apply throws
    - the fixes:
      - a detached root:  `E.Reactive.ownRoot(fn)`, from `spell/element`.
        It's `createRoot` under a module owner that's never disposed:  safe anywhere, and no context reaches in.
      - work that should live with the component:
        `const owner = getOwner()` in the body, then `runWithOwner(owner, () => ...)` in the apply
  - a cleanup that throws no longer stops the rest (rc.17):
    every cleanup runs, then `dispose()` (or `flush()`, inside a flush) rethrows the FIRST error
  - many React `useEffect`s should be a memo or an event handler instead
  - component setup + teardown:  `onSettled(() => { ...; return cleanup })`, not `onMount`
- Memos:  eager by default;  create them inside a component / owner, NEVER at module scope (unowned memos recompute
  forever).  `lazy: true` autodisposes when unobserved.
- Stores:  draft setters only.  A direct `store.x = 1` is IGNORED:
  dev warns `STORE_WRITE_OUTSIDE_SETTER` once per store and key (rc.17), production says nothing.
  - a derived store needs no seed (rc.16):  `createStore(fn)`, `createProjection(fn)`
    - its `fn` returns the whole value:  sync, a promise, or an async iterable
  - a seed, when you give one, is a COMPLETE `T` (rc.16):
    its type is `NoFn<T>`, was `Partial<T>`
    a `{}` seed on a derive that returns its value is a type error -- drop it;
    a derive that fills an empty draft needs `{} as T`
- Errors:  wrap app roots in an error boundary (`<Errored>`);  it heals itself when the data recovers.  The app
  wraps it:  SEE WWOD §17 › "`<ErrorBoundary>` around every region that can fail alone".
  - NOTE: an error thrown by a `createEffect` COMPUTE is NOT caught by an enclosing `<Errored>`:  it goes to the
    console, and the fallback never shows (measured, P6:  `app`'s `ASTViewer` / `MatchViewer`).  Read the value in
    JSX (a render expression) where a throw must show the fallback, or give the effect an `{ effect, error }`
    bundle.
    - Not re-measured since:  no release note from rc.14 to 2.0.4 says this changed.
      Solid's own docs still name the two ways:  `<Errored>`, or the effect's `error` option.
  - an uncaught error still halts the page;
    since rc.17 the dev `REACTIVITY_HALTED` message names where it escaped (`in <App> › <Composer> › effect`)
- Lists:  `<For each>` keys by identity (item = value, index = accessor);  `keyed={false}` by position (item =
  accessor);  `keyed={(t) => t.id}` by key.  `<Repeat count>` for windowing.  No `.map()` in JSX.
- Context:  the context IS the provider.  No default => a missing provider throws.
  - `undefined` counts as "not provided":  as a default, or from a provider
  - for a context that may be empty, use `null`:  `createContext<T | null>(null)`
- Dynamic components:  `dynamic(() => source())`, created once outside JSX.
  - `dynamicComponent` is in `solid-js` since rc.15;  `@solidjs/web` re-exports it, and keeps `dynamic`
- Optimistic values (`createOptimistic`, `createOptimisticStore`), since 2.0.4:  a guess NEVER becomes the real value.
  - it always goes back when its action settles;  the real value comes from the source the action refreshes
  - an optimistic write outside an action does nothing
  - Spell writes none today (grepped, 2026-11-26)
- New since rc.13, for when you need them:
  - `createDeferred(fn)` (rc.16):  an async memo that may lag, never lead;
    after its first answer, readers keep the old one until the new one lands, and `isPending` reports it
  - `lazyModule()` (rc.15):  `lazy()` for a module that isn't a component, preloaded and hydrated by module id
  - `onHydrationEnd(callback)` (rc.15):  public again, `@experimental`, for tests and markers
- More, as house style with this repo's examples (read once with `untrack`, `onCleanup`, load states, `<Show keyed>`,
  `useContext` needs an owner, the `ClassBuilder` exception):  WWOD §17, `agents/wwod/solid.md`.

```tsx
createEffect(
  () => count(),
  (value) => {
    list.push(value) // braces:  `(value) => list.push(value)` would return a number as the "cleanup"
  }
)

onSettled(() => {
  const id = setInterval(tick, 1000)
  return () => clearInterval(id)
})

setStore((draft) => {
  draft.user.name = "B"
})

const rows = (
  <For each={items()} keyed={(item) => item.id}>
    {(item) => <Row item={item()} />}
  </For>
)

const app = (
  // the context IS the provider
  <Todos value={createTodos()}>
    <TodoList />
  </Todos>
)

const Active = dynamic(() => (editing() ? Editor : Viewer))
```

## DOM and Spell UI elements

- `class`, not `className`;  array / object form, NEVER built class strings.  No `classList`.
- Attributes are HTML:  lowercase built-in names, boolean = presence.
  - The 1.x forms are COMPILE ERRORS since rc.17, on native elements and dashed tags alike:
    `on:`, `oncapture:`, `attr:`, `bool:`, `use:`, `classList`.  The message names the 2.0 replacement.
- On a tag with a dash, Solid sets a plain prop with `setAttribute(name, value)`, the value as it is.
  - On OUR elements that's enough:  a function or object reaches the element as itself (`options={[...]}`),
    through `spell/element`'s `RichAttributes`;  text stays an attribute.
  - On anyone else's, the browser turns it into text:  rich data there is `prop:options={...}`.
  - a valueless `prop:active` is `prop:active={true}` (rc.17;  before, it was dropped)
- Solid clones a dashed tag's template with `document.importNode()`:
  a DEFINED custom element is upgraded BEFORE Solid sets its props, an undefined one isn't.
  - `<ui-root>` defines every Spell UI tag up front (epic `solid-17` P7), so ours are always defined:
    PENDING (`:state(pending)`) until their family loads, then `:state(ready)` once drawn.
  - "Its family has loaded" is `E.DOMElement.isAttached(tag)` / `whenAttached(tag)`, NEVER `:defined`.
- Events:
  - `onClick` etc. are camelCase, delegated per render root.  The binding is NOT reactive:  put the choice inside
    the handler.
  - ONLY `on` + an UPPERCASE letter is an event (rc.14).
    Lowercase `onclick={fn}` is a plain attribute:  dev warns `LOWERCASE_EVENT_ATTRIBUTE`
  - `onChange` is the native change event -- use `onInput` per keystroke
  - the event's name is the rest, LOWERCASED:  `onUIChange` listens for `uichange`, NOT `ui-change`
    - so on OUR elements (`ui-*`, `epic-*` ...), write the event's own name after `on-`:  `on-ui-change={f}`
      - our elements take it in their own `setAttribute()` (`spell/element`'s `RichAttributes`, epic `solid-17`)
      - data the same way, a plain prop:  `options={[...]}` arrives as the array itself;  no `prop:`
      - Solid's dev build warns `LOWERCASE_EVENT_ATTRIBUTE` once per such name:  harmless, but the editor's console
        must stay clean (Owen, 2026-11-14, epic `editor` I98), so the editor's code, and the Spell UI elements
        it draws, listen with a ref instead:  the app's `ref={on("ui-changed", f)}`, a component's
        `ref={(menu) => menu.addEventListener("ui-choosing", ...)}`
    - any other element's hyphenated event:  a ref directive (below)
  - native options (capture, passive):  a ref directive too
- Form inputs:  `value={x()}` writes the input only when its binding re-runs,
  and a change to ANY other dynamic attribute in the same template re-runs it.
  - so typed text can be overwritten:  dev warns `UNCOMMITTED_INPUT_OVERWRITTEN` (rc.17)
  - keep typing in a draft signal (`onInput`), commit on `onChange` / submit
  - a handler that rejects input writes the accepted value back, as an unchanged signal won't revert the DOM:
    `e.currentTarget.value = next`, NOT `equals: false`
  - uncontrolled:  `defaultValue` / `defaultChecked`
- Refs are callbacks or directive factories, composable as arrays.  No `.current`, no `forwardRef`.  Ref callbacks
  are unowned -- create effects in the factory, not the callback.
  - Since 2.0.4 a ref callback that makes an effect, a memo or an `onCleanup` THROWS in dev:  make it in the factory
    that returns the ref (the component body), and return nothing from the callback.
- `render(() => <App />, el)` returns `dispose`.  A ShadowRoot works as the container.
- `<Portal>` defaults to `document.body`:  inside a shadow root ALWAYS pass `mount`.
- JSX types for `<ui-*>`:  Spell UI's, exact, generated from its vocabularies:
  `import type {} from "spell/ui/jsx"` once in the program.
  - A tag of your own:  augment `"@solidjs/web/types/jsx.js"`, NOT `"@solidjs/web"` (which only re-exports `JSX`).
- Spell UI controllers keep their state in REACTIVE MEMBERS, not bare signals
  (the element framework's `Reactive.ts`, `spell/element`;  P14):  a record per instance plus a notifier signal per
  member ("N" in `solid-2.html` §2), and `@derived` as a self-tracking cache over the record
  (spell cells' idea, "X", without `enableExternalSource`).  So `this.x = v;  this.x` is fresh with no `flush()`;
  Solid listeners re-run on the notifier, staged as usual.
  Rules:  `ui/AGENTS.md` "Solid authoring".
- Spell UI specifics (its events:  SEE `ui/AGENTS.md` "UI rules"):
  - never write a bare string attribute in JSX (`<ui-toast icon>` requests `true.js`):  write `icon=""`
  - glyphs must be emitted by the build
  - many hosts are `display: contents`

```tsx
const on = (type: string, handler: (event: Event) => void, options?: AddEventListenerOptions) => (el: Element) =>
  el.addEventListener(type, handler, options)

const row = <li class={["todo", props.class, { done: done(), error: !!error() }]} />

const picker = (
  <ui-dropdown
    value={selected()}
    options={projects()}
    on-ui-change={(event: CustomEvent<{ value: string }>) => setSelected(event.detail.value)}
  />
)

const modal = (
  <Portal mount={shadowRoot}>
    <Modal />
  </Portal>
)
```

## Hyperscript (`@solidjs/h`, what compiled javascript draws with)

- Nothing is reactive unless it's a FUNCTION.
- `h()` returns a thunk:  `render(() => h(App), el)`.  Fragments are arrays.
  - its type is `HyperElement`, the thunk alone (rc.17):  it was a union with `ExpandableNode[]`
  - so a cast to `JSX.Element` needs `as unknown as JSX.Element`
- A function on a lowercase `onclick` is wrapped in a getter, like any attribute (rc.14):
  only `onXxx` and `ref` are exempt.
- ARITY TRAP:  on a COMPONENT, a zero-arg function prop becomes a getter.  Handlers MUST take a parameter:
  `onPick: e => go()`, never `onPick: () => go()`.  Element `on*` props and `ref` are exempt.
- It imports `@solidjs/web` by bare specifier:  keep it inside bundled code, never in blob-loaded compiled spell.
  `spell-runtime.js` gets it from `spell-solid.js` (`sharedFiles()`), which re-exports `h`.

```ts
h("div", { id: () => props.id, class: "row" }, () => first() + " " + last(), h(Child, { name: () => name() }))

h(Picker, { onPick: (event: Event) => go() }) // callback:  takes a parameter
h(Picker, { onPick: () => go() }) // WRONG:  becomes a getter, passes go()'s result
```

## Testing

- `flush()` after any write or event, before asserting (`core.flush()` for spell state).
  `await resolve(() => x())` for async.
- Under Node, `@solidjs/web` resolves to the SERVER build (no DOM `render`):  component tests need the
  `browser` + `development` conditions plus jsdom or vitest browser mode.  An SSR test project needs its own `solid()`.
  - `@solidjs/vite-plugin` next.51 no longer sets Vitest's `environment: "jsdom"`:  a project that needs jsdom says so
  - it appends `export const $$moduleUrl` to every module it transforms for SSR, Vitest's node projects too:
    a test listing a module's exports sees it
  - `app` runs both, a node project and a browser one (Vitest browser mode, chromium through Playwright):  SEE
    `app/AGENTS.md` "Overview".
  - `app`'s component tests `render()` from `@solidjs/web` into a fixture and `await uiReady` for the `<ui-*>` tags.
    `@solidjs/testing-library@next` (1.0.0-beta.3) exists but isn't installed.
- Reactive semantics this repo depends on are pinned as vitest cases:  `util`'s `src/reactive/cells.test.ts` and
  `decorators.test.ts` (cells, no Solid), `app`'s `src/solid/cellsBridge.browser.test.tsx` (Solid's client build:
  staging, holds, the bridge), `core`'s `drawing.test.ts` and `app`'s `src/runner/runner.browser.test.tsx` (compiled
  spell drawing:  live values, the error boundary, `<For>` keeping nodes).  The `solid/experiments/*` scripts stay, to
  re-measure.

```tsx
fireEvent.click(button)
flush()
expect(button.textContent).toBe("Clicks: 1")
```

## Renames and removals (1.x -> 2.0)

- `Suspense` -> `Loading`;  `ErrorBoundary` -> `Errored`;  `SuspenseList` -> `Reveal`;  `Index` -> `<For keyed={false}>`
- `mergeProps` / `splitProps` -> `merge` / `omit`;  `unwrap` -> `snapshot`;  `getListener` -> `getObserver`
- `onMount` -> `onSettled`;  `createSelector` -> `createProjection`;  `<Dynamic>` -> `dynamic()`
- `createResource` -> async `createMemo` + `<Loading>`;  `startTransition` -> automatic holds + `isPending`
- `batch`, `createComputed`, `on()`, `produce`, `createMutable`, `from` / `observable` -> gone
- Imports:  `solid-js/web` -> `@solidjs/web`;  `solid-js/store` -> `solid-js`;  `solid-js/h` -> `@solidjs/h`;
  `vite-plugin-solid` -> `@solidjs/vite-plugin`;  router = `@solidjs/router@next`, `createRouter({ routes })`

## Router (`@solidjs/router@next`)

- `2.0.1`, the release for Solid 2.0, pinned exactly (was `2.0.0-next.44` on rc.19 to rc.21, next.41 on rc.15 and
  later, next.35 on rc.13).
  Config objects, no `<Route>` / `<A>` components.
- Since next.35:
  - params are DECODED, per segment (next.40):
    never decode them again (spell-app's `/edit/*address` stopped doing so in epic `solid-17`)
  - `action` is renamed `formAction` (the old name is an alias)
  - preloading a link's route on hover is opt-in (next.38)
- `createRouter({ routes })` once, at module scope:  the instance IS the provider;  its render-prop child is the root
  layout, which stays mounted.
- It ships Solid JSX SOURCE (`dist/*.jsx`):  the bundler's Solid plugin must compile it out of `node_modules`.
- Links are plain `<a>`, taken by delegation from the WHOLE page:  `explicitLinks: true` limits it to `<a link>`.
- `useNavigate()` works only under the router:  code outside components gets it handed over by the root layout.
  A bare `history.pushState()` changes the URL, not the page.
- How the app does each of these:  SEE `app/AGENTS.md` "Overview" (Routing).
- A route whose `path` is an ARRAY stays mounted across those URLs:  read `props.params` in an effect's compute.
- Tests:  `createRouter({ routes, history: memoryHistory("/url") })` per test.

## When something breaks

- A dev diagnostic code:  read `node_modules/solid-js/skills/reactivity-diagnostics/SKILL.md` (Solid's own repair
  guide;  hoisted to the kit's root `node_modules`).
  - the same codes as data:  `solid-js`'s `diagnostics.json`;  and in `cheatsheet.html`
  - the dev console message links the code's page on docs.solidjs.com
- `PRIMITIVE_IN_EFFECT_CALLBACK` thrown from a `connectedCallback()` or a prop read:
  SEE "Effects" above (rc.17).
- Nothing updates after an error:  the scheduler halted -- find the first thrown error, not the last symptom.
- A value reads stale right after a write:  that's staging -- use a cell, or `flush()` in tests.
- A write is invisible even after `flush()`:  it's entangled with a held async write in the same batch.
- A reader of a derived value didn't update in a test:  derived checks run on a microtask -- `core.flush()`.
