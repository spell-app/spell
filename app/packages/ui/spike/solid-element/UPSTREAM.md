# Upstream plan

How each fix in `@spell/solid-element` could land in `solidjs/solid`, branch `next`, `packages/element`.
**Nothing here has been filed.**  Owen decides what goes upstream and when.

## Baseline

- Checked 2026-09-29:  `next`'s `packages/element/src/index.ts` is identical to the published
  `@solidjs/element@2.0.0-rc.11` (`dist/index.js`, 84 lines).  It depends on `component-register@^0.8.7`
  (0.8.8, last published 2025-09-08), which is the actual custom-element layer:  prop definitions, the element
  class, attributes, reflection, lifecycle.
- `component-register` issues and PRs referenced below were read on GitHub the same day (all still open):
  - issues:  #5 reconnect, #8 numeric strings parsed as numbers, #15 formAssociated, #20 default after an
    attribute is removed, #38 the `id` attribute becomes `"undefined"`, #40 multi-underscore props
  - PRs:  #30 initialize props in the constructor (`"key" in el`), #32 no case / dash transforms, #34 scoped
    registries, #37 readonly assignment in `createElementType`, #39 don't modify the element in the constructor
- Most fixes live in `component-register`.  Two routes:
  1. **Inline** (recommended):  `packages/element` absorbs the ~250 lines of `component-register` it uses (element
     class, props, reflection, HMR), drops the dependency, and each fix below is one PR against that copy.
     PR 0 is the inlining itself, behaviour-identical, with `compat.test.tsx` as its test.
  2. **Patch `component-register`**:  the same PRs against `ryansolid/component-register`, then a version bump
     in `packages/element`.  Its PR queue has been idle for years, so route 1 is likelier to move.
- Test files port from Vitest browser mode (this package) to the upstream `jsdom` setup, except where noted
  (`ElementInternals`, `delegatesFocus` and declarative shadow DOM need a real browser;  those tests would go
  in a browser project, or be marked `skipIf(!("attachInternals" in HTMLElement.prototype))`).

## PR 1 -- `options`:  base class, registry, shadow root, form association (`customElement.ts`, `element.ts`, `shadowRoot.ts`)

- **Problem:**  `customElement(tag, props, Component)` has no options (element `:77-83`).  No base class means no
  `static formAssociated`, no constructor of your own, no `attachInternals()`;  no registry means no scoped
  registries;  `renderRoot` hard-codes `attachShadow({ mode: "open" })` (`component-register.js:169-172`), so no
  `delegatesFocus`.  The workaround is calling `register(tag, props, { BaseElement, customElements })` with a
  fake registry that captures the class, subclassing it, and defining it yourself (`spike/solid`'s
  `ElementDefinition.register()`, ~40 lines).
- **Answers:**  issue #15 (formAssociated), PR #34 (scoped registries, via `registry`).
- **Patch outline:**
  - `customElement(tag, props?, Component, options?)`;  `register(tag, props, options)` already takes
    `BaseElement` / `customElements`:  add `registry` (alias), `shadowRootInit` (`ShadowRootInit | false`),
    `formAssociated`, `internals`
  - `createElementType`:  `if (options.formAssociated !== undefined) define static formAssociated`;  the
    `renderRoot` getter uses `options.shadowRootInit` and returns the element for `false`
- **Breaking:**  no.
- **Test:**  `options.test.tsx` -- `BaseElement` in the prototype chain, `formAssociated` static,
  `delegatesFocus` reaching the root, a stub registry receiving `define()`, `shadowRootInit: false`, closed mode.

## PR 2 -- accessors on the prototype + the upgrade step (`upgrade.ts`)

- **Problem:**
  - accessors are defined per INSTANCE in `connectedCallback` (`component-register.js:41`);  0.8.8's constructor
    also assigns `undefined` to every key (`:122`), apparently so `"key" in el` holds before connect, which
    - drops any property a framework set BEFORE the element was defined (the value is overwritten, then read
      back as `undefined`)
    - makes `document.createElement()` fail when a key is also an attribute-reflecting native (`style`, `id`:
      the constructor adds an attribute, `NotSupportedError`, issue #38:  `id="undefined"`)
    - adds own properties in the constructor (PR #39)
  - a prop named like a native member (`style`, `hidden`, `title`) silently replaces it on every instance
- **Answers:**  PR #30, PR #39, issue #38;  probably PR #37 too (its "assign to readonly property" error is
  what the constructor assignment does to a getter-only native, unverified).
- **Patch outline:**
  - `createElementType`:  after building the class, `Object.defineProperty(Class.prototype, key, { get, set })`
    per prop, reading / writing a per-instance value record created in the constructor
  - constructor:  for each key with `Object.hasOwn(this, key)`, stash the value, `delete this[key]`;  on first
    `connectedCallback`, re-set it through the setter (so it reflects and notifies)
  - definition time:  throw if `key in BaseElement.prototype` (or the element's own API) unless the definition
    sets `property` (rename, or explicit override)
- **Breaking:**  yes, mildly:  a key shadowing a native member now throws.  A softer upstream variant:  warn in
  dev and keep defining the accessor.
- **Test:**  `upgrade.test.tsx` -- property set before `define()` survives;  accessor on the prototype and no own
  property;  `id` prop with `property: "id"` keeps the author's id;  `style` prop throws;  rename via `property`.

## PR 3 -- per-prop definitions:  `type`, `converter`, `property`, the boolean rule (`props.ts`)

- **Problem:**
  - `parse` defaults to `typeof value !== "string"` and means `JSON.parse`, whose wrapper returns `undefined`
    for `""` (`component-register.js:60`):  a bare boolean attribute (`<x primary>`) is FALSE
  - numeric strings become numbers, losing precision (`"210246661446959104"` => `210246661446959100`)
  - with `parse: false`, `true` reflects as `"true"` (`:69-71`)
  - `toAttribute` replaces only the first `_` (`:76`)
- **Answers:**  issue #8, issue #40;  the boolean case has no issue yet.
- **Patch outline:**
  - `PropDefinition` gains `type` (`Boolean | Number | String | Array | Object`, inferred from `value`),
    `converter: { fromAttribute, toAttribute }` (or a function), `property`, `attribute: false`
  - `normalizePropDefs` binds `fromAttribute` / `toAttribute` per prop;  `parse: false` maps to `String`,
    `parse: true` without a typed default keeps the loose JSON parse (minus the `""` bug)
  - boolean:  `text !== null`;  reflection:  `true` => `""`, `false` / nullish => remove
  - JSON only for `Object` / `Array`;  untyped props get the text;  an object value reflects as JSON for every
    type (never `[object Object]`)
  - `converter.fromProperty(value)`:  optional normalization of PROPERTY writes (and of properties captured at
    upgrade), e.g. `"yes"` => `true`, a translated enum value => its canonical one.  Lit has no equivalent (it
    stores property writes as is);  it lets a component read ONE canonical value whichever way it was set,
    instead of a memo per prop re-converting (`spike/solid`'s old `ElementDefinition.convert()` layer)
  - `toAttribute`:  `/_/g`
- **Breaking:**  yes:  untyped props stop JSON-parsing;  `flag="false"` becomes `true` (HTML's rule);  `Number`
  uses `Number()`.  Could ship as the default of a new major, with `parse: true` as the escape hatch.
- **Test:**  `props.test.tsx` -- bare boolean, `true` reflection, numeric id, removal => default,
  underscores;  typed conversion;  converter both ways;  `fromProperty` (incl. pre-upgrade);  object values
  reflect as JSON;  the old `{ value, attribute, parse, reflect }` shape.

## PR 4 -- attribute traffic:  removals, change source, synchronous reflection guard (`attributes.ts`)

- **Problem:**
  - `attributeChangedCallback` ignores a removal when the current value is falsy (`:161`), so removing a bare
    attribute whose raw value is `""` never reaches the component
  - the reflection guard `__updating[attr]` is cleared a microtask later (`:70/:73`):  an author's own
    `setAttribute()` of the same attribute in that tick is swallowed
  - change callbacks can't tell an attribute write from a property write, so a caller needing "don't reflect
    what came from the attribute" keeps its own flags
- **Answers:**  issue #20 (together with PR 3's removal => default).
- **Patch outline:**
  - `attributeChangedCallback`:  drop the falsy early return;  convert `null` via `fromAttribute` (=> default)
  - `reflect()`:  set `__reflecting = attr` around `setAttribute()` / `removeAttribute()` and restore it in
    `finally` -- custom-element reactions run before `setAttribute()` returns, so the guard needs no microtask
  - callbacks:  `fn(key, value, old, source)`;  attribute writes don't reflect back
  - process attribute changes before the first connect too (the platform replays them at upgrade)
- **Breaking:**  no (a 4th callback argument).
- **Test:**  `attributes.test.tsx` -- bare removal, callback sources, same-tick `setAttribute()`, no echo,
  array reflection round trip.

## PR 5 -- `ElementInternals` and form hooks (`internals.ts`)

- **Problem:**  no way to get `ElementInternals` (it can only be attached by the element's own class) or to hear
  `formResetCallback` / `formDisabledCallback` / `formAssociatedCallback` / `formStateRestoreCallback` from a
  function component.
- **Answers:**  issue #15.
- **Patch outline:**
  - constructor:  `if ((formAssociated || internals) && !this.internals) this.internals = this.attachInternals()`
  - the class forwards the four form callbacks (after the base class's own) to hook sets on the element
  - `onFormAssociated` / `onFormDisabled` / `onFormReset` / `onFormStateRestore(fn)`:  register on
    `getCurrentElement()`, remove via `onCleanup`;  the first two replay the last reported state, because
    `formAssociatedCallback` fires on insertion, BEFORE `connectedCallback` renders the component
- **Breaking:**  no.
- **Test:**  `internals.test.tsx` -- submits through internals (browser-only);  states with `internals: true`;
  base-attached internals reused;  every hook forwarded;  base callback first.

## PR 6 -- lifecycle:  `keepAlive`, `onConnect` / `onDisconnect`, `dispose()` (`lifecycle.ts`)

- **Problem:**  every disconnect that outlives a microtask disposes the component, and a reconnect renders from
  scratch (`:146-155`):  moving an element to another container (drag-and-drop, sorted lists, portals) loses all
  component state.  There is no connect / disconnect hook.
- **Answers:**  issue #5.
- **Patch outline:**
  - option `keepAlive`:  `disconnectedCallback` returns early;  `element.dispose()` runs the release callbacks
  - `connectedCallback` / `disconnectedCallback` run `connect` / `disconnect` hook sets;
    `onConnect(fn)` / `onDisconnect(fn)` register like PR 5's hooks
  - default unchanged (dispose after a microtask when not re-attached)
- **Breaking:**  no.
- **Test:**  `lifecycle.test.tsx` -- state across a real detach with `keepAlive` (the original re-renders);
  default behaviour unchanged;  props flow while detached;  `onCleanup` on `dispose()` only;  hook order;
  nested hooks removed with their owner.

## PR 7 -- error boundary per element (`errors.ts`)

- **Problem:**  an error thrown while rendering or updating ANY element escapes to Solid's scheduler, which
  halts for the whole page (`[REACTIVITY_HALTED]`):  every other element, and the host app on the same runtime
  copy, stops updating.  In `spike/solid` one bug made 25 unrelated tests hang.
- **Answers:**  no upstream issue yet.
- **Patch outline:**
  - `withSolid`:  `createErrorBoundary(() => untrack(render), fallback)` around the component (untracked:  the
    boundary's compute tracks)
  - options `errorBoundary` (default `true`), `onError(element, error)` (default one `console.error`),
    `fallback(element, error)` (content), `errorEvent` (a cancelable `CustomEvent` name;  cancelling skips the
    other two);  `:state(errored)` when internals exist
  - `onError` and event listeners run under `runWithOwner(null)`, so they may write signals;  `fallback` runs
    under the boundary so its JSX is disposed with the element
- **Breaking:**  yes, in failure mode only:  errors are logged instead of thrown out of `connectedCallback`.
- **Test:**  `errors.test.tsx` -- a sibling keeps updating after an error (the original halts);  default log;
  `fallback` / `onError` / `:state(errored)`;  setup errors;  cancelable event;  `errorBoundary: false`.

## PR 8 -- owner lookup across shadow roots (`owner.ts`)

- **Problem:**  `lookupContext` walks `parentNode` (element `:19-31`), which ends at a `ShadowRoot`:  an element
  created WITHOUT JSX inside another element's shadow root (template clone, `innerHTML`, lazy content) gets no
  context from the page.
- **Answers:**  no upstream issue yet.
- **Patch outline:**  in the loop, `next = next.parentNode ?? (next.nodeType === 11 ? next.host : null)`.  Keep
  rc.11's foreign-runtime guard (solidjs/solid#3053) unchanged.  Only hop through `ShadowRoot` (`<a>.host` is a
  URL part).
- **Breaking:**  no (more context found, never less).
- **Test:**  `owner.test.tsx` -- a context provided above an element reaches an element added later inside its
  shadow root via `innerHTML`.

## PR 9 -- adopt a declarative shadow root (`shadowRoot.ts`)

- **Problem:**  `renderRoot` returns an existing shadow root as is, and `insert()` APPENDS:  server-rendered
  declarative shadow DOM plus the client render show everything twice.
- **Answers:**  no upstream issue yet.
- **Patch outline:**  when `renderRoot` finds an existing root (`this.shadowRoot`, or `internals.shadowRoot` for
  a closed one), flag it;  `withSolid` empties it right before `insert()`.  Hydration is a separate, larger
  feature.
- **Breaking:**  no.
- **Test:**  `shadowRoot.test.tsx` (browser-only:  `setHTMLUnsafe` + declarative shadow DOM) -- replaced not
  appended;  closed root via internals;  same root node kept.

## HMR -- redefinition in place, live-instance registry, Vite plugin (`hot.ts`, `vite.ts`)

- **Problem:**
  - `register()` on an existing tag swaps `Component` only (`component-register.js:276`):  new props (a new
    property-only prop, a changed converter or default) and options are silently ignored, and a change the
    platform CAN'T take (a new observed attribute) gives no signal at all
  - `hot(module, tag)` is webpack-shaped (`module.hot`);  with Vite each app writes its own
    `import.meta.hot.accept()` and walk
  - `reloadElement()` calls `connectedCallback()` (`:90-96`), which re-renders a DETACHED element too;  `hot()`
    walks only `document.body` (`:238-256`), missing detached and `keepAlive` instances;  the fork's
    `:state(errored)` would stick after a recovery
  - `@solidjs/element` has no Vite story:  `@solidjs/vite-plugin`'s refresh wraps exported function components,
    not `customElement()` calls, so an element module edit falls through to a full reload
- **Answers:**  no upstream issue yet.
- **Patch outline:**
  - `register()` on an existing tag, while `import.meta.hot` exists:  `redefine()` -- refuse (record the reason)
    when observed attributes, `formAssociated`, base class, internals or shadow root options changed;  else swap
    `Component`, `props` and `options` IN PLACE (the class's closures hold those objects), redefine accessors,
    and migrate each live instance's values (property writes kept, attribute values re-converted, new keys
    defaulted -- needs a dev-only "last write source" per key in `setProp()`)
  - dev-only `WeakRef` registry of instances per class (constructor);  `liveElements()` walks the document and
    open shadow roots when untracked
  - `hotUpdate(hot)`:  re-render every swapped class's instances, or `hot.invalidate(reason)`;
    `reloadElement()`:  dispose, clear `errored`, render only if connected
  - `@solidjs/element/vite` (or an option of `@solidjs/vite-plugin`):  append the accept to modules calling
    `customElement(`;  force a full reload when a changed module reaches several element modules (shared base
    code);  optional style-module hand-off
  - every dev path sits behind `import.meta.hot`, so builds drop it (0 bytes)
- **Breaking:**  no.  In dev a refused redefinition warns and reloads instead of half-applying.
- **Test:**  `hot.test.tsx` (registry, in-place swap with values kept, converter / default migration, each refusal
  reason, shadowing prop throws, error recovery, detached `keepAlive`, `hot()` still works);
  `spike/solid`'s `yarn test:hmr` is the end-to-end proof (a real Vite server, real file edits).

## Smaller changes riding along

- **Element as context** (`current.ts`):  `withSolid` provides the element through a Solid context, so
  `getCurrentElement()` and the hooks work from nested components and after setup.  Needs `untrack` inside the
  provider's `children` getter, or the component re-runs on every prop read in its body.
- **`ownedWrite` on prop signals** (`withSolid.ts`):  `el.value = x` is a DOM API, legal anywhere;  without it,
  setting a property from a Solid component body throws in dev (`solid2.test.tsx` reproduces it against rc.11).
- **HMR:**  re-registering a tag defined by another library throws instead of returning that class (see the HMR
  section for the rest).
