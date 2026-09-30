# The `UI` runtime (`src/runtime/`)

One shared runtime per page coordinates everything components can't do alone: keyboard shortcuts, the overlay stack, focus, stylesheets, animations, strings, ids, toasts / modals and fetch.

## Loading

```ts
import { UI } from "$/runtime"

class UIThing extends HTMLElement {
  async connectedCallback() {
    await UI.load() // first caller imports the runtime chunk; everyone else awaits the same promise
    UI.styles.adoptInto(this.shadowRoot!, ["thing"])
  }
}
```

- `src/runtime/load.ts` is the only eager code: `load()` (exported as `loadUI`) and the `UI` accessor. Everything else sits behind `import("./UIRuntime")`, so Vite puts the runtime in its own chunk. A scratch build of the barrel gives about 0.3 KB for the entry, 1 KB gzip for `load`, and one `UIRuntime-*.js` chunk.
- `UI` is a `Proxy` onto the page's instance:
  - `UI.load()` works at any time
  - any other property throws until the runtime has loaded, so a missing `await` fails loudly
- The instance lives at `globalThis[Symbol.for("@spell/ui:runtime")]`. `UIRuntime.instance` reuses it, so two copies of the package on one page share one runtime. In dev, a version mismatch prints a warning.
- The barrel exports service classes as **types only**. Exporting them as values would undo the code split. Reach services through the instance, e.g. `UI.keyboard.chord("Mod+K")` or `UI.focus.roving(...)`. Tests import leaf files directly.
- `UI.ready` currently resolves as soon as the runtime is constructed. The foundation sheets (`$/styles`) and `Vocabulary` (`$/vocabulary`) register into the runtime once it has loaded; the orchestrator wires them in.

## Services

| Field | Class | What it does |
|---|---|---|
| `UI.browser` | `Browser` | `supports.*` feature flags, detected once and all `false` under SSR. `isChromium` / `isFirefox` / `isSafari` / `isIOS` / `isApple` / `isTouch`. Live `reducedMotion` and `prefersDark`. Call sites branch on `supports`, NEVER on the user agent. |
| `UI.keyboard` | `Keyboard` + `Chord` | Shortcut registry: `register(scope, "Mod+Shift+K", handler, { target, global, inEditable, preventDefault, stopPropagation })` returns a disposer. Scopes form a stack (`pushScope` / `popScope`); only the topmost scope fires, plus `global` registrations. One capture `keydown` listener. Keys typed into editable fields are ignored unless the chord has Ctrl / Meta / Alt or the registration sets `inEditable`. Dev builds warn on conflicts. |
| `UI.overlays` | `Overlays` | Top-layer stack: `open(entry)` / `close(entry)` / `topmost(kind?)` / `closeAll(pool?)` / `isOpen`. Routes Escape (or a `CloseWatcher` close request) to the topmost entry and outside clicks to the topmost entry of each pool, using the `pointerdown`-origin rule and composed paths. Also handles scroll lock (reference counted) and focus restore. It only calls `entry.onDismiss(reason)`; the component decides what happens and then calls `close()`. |
| `UI.focus` | `Focus` + `RovingTabindex` | `activeElementDeep()`, `focusables(root)` (flat tree: shadow roots and slots; skips `inert`, `hidden`, unrendered, `:disabled` and `tabindex=-1`), `first` / `last`, `containsDeep`, `trap(root)` (only for non-`<dialog>` cases), and `roving(container, items, { orientation, wrap })`. |
| `UI.styles` | `Styles` + `AppStylesheet` | Named constructable sheets: `register(name, css, { page, linked })`, `sheet(name)`, `setFoundation(names)`, `setUtilities(names)`, `adoptInto(shadowRoot, names)`, `appSheetReady`. `page` also puts a sheet on the document; `linked` marks one `ui.css` already carries (the foundation, typography, native), left off a page that links `ui.css`. Component page sheets (`table`, `scroll-lock`) always go on. |
| `UI.transitions` | `Transitions` | `animate(el, name, "in" \| "out" \| "static", { duration, easing })` resolves `true` when the animation ends and `false` when interrupted. `whenTransitionEnds(el)`. |
| `UI.i18n` | `I18n` | `locale`, `register(locale, pack)`, `t(key, params)` (lookup order: `pt-BR`, then `pt`, then `en`, then the key itself), `formatDate`, `formatNumber`, `weekdays()`, `months()`, `firstDayOfWeek()`, `displayName()`. |
| `UI.ids` | `Ids` | `next(prefix)` and `ensure(el, prefix)` for ARIA id wiring. |
| `UI.toasts` / `UI.toast()` | `Toasts` | Delegates to `Toasts.provider`, which `ui-toast` registers. Throws until then. |
| `UI.modals` | `Modals` | `confirm` / `alert` / `prompt` delegate to the provider `ui-modal`'s barrel registers with `register(provider)` (`ModalDialogs`:  a `<ui-modal>` per call). Throws until then. |
| `UI.api` | `Api` | `url(template, data)` and `request({ url, urlData, method, data, throttle, key, signal, timeout, headers, responseType })`. |

## Overlay entries

```ts
const entry: OverlayEntry = {
  element: this,
  kind: "popover",
  anchor: triggerButton,
  onDismiss: (reason) => this.requestClose(reason)
}
UI.overlays.open(entry) // on show
UI.overlays.close(entry) // on hide, whatever caused it
```

Defaults depend on `kind`:

| Option | Default |
|---|---|
| `pool` | `"toast"` for toasts, `"default"` for everything else |
| `closeOnEscape` | `true` for every kind except `toast` |
| `closeOnOutsideClick` | `true` for every kind except `toast` |
| `modal` (scroll lock) | `true` for `modal`, `flyout` and `dimmer` |

- Every entry that handles Escape or is modal pushes a keyboard scope, so page shortcuts go quiet while it's open.
- A click on a modal `<dialog>`'s `::backdrop` counts as outside. The pointer position is compared with the dialog's box, because a backdrop click targets the dialog element itself.
- `<ui-modal>` sets `closeOnOutsideClick: false` when the browser does light dismiss itself (`<dialog closedby>`, `UI.browser.supports.dialogClosedBy`) and routes the dialog's `cancel` through its own `ui-close`;  Escape always goes through `Overlays`.
- `<ui-popup>` and the dropdown menu are `popover` entries with their target as `anchor`, so a click on the target never dismisses-then-reopens.
- Scroll lock adds `ui-scroll-locked` to `<html>` and sets `--ui-scrollbar-width`. `Overlays` registers the matching rule as the page sheet `scroll-lock`, in `@layer ui.base`.

## Animation protocol

- JS sets `data-ui-animation="<name> <direction>"`, e.g. `"fade-up in"`. `animations.css` owns the keyframes and matches the attribute.
- The `duration` and `easing` options become `--ui-animation-duration` / `--ui-animation-easing` on the element, so the CSS should read them: `animation-duration: var(--ui-animation-duration, …)`.
- `ANIMATION_NAMES` in `runtime.types.ts` is the catalogue. Fomantic's multi-word names are kebab-cased (`"horizontal flip"` becomes `flip-horizontal`).
- `in` removes `hidden` first. `out` sets `hidden` when it finishes, plus an inline `display: none` if the element's CSS overrides `[hidden]`. `static` leaves visibility alone.
- Reduced motion, or no matching keyframes, resolves at once. A fail-safe timeout (computed duration + `failSafeDelay`) catches a missing `animationend`.

## The `#ui-app-stylesheet` contract

Page CSS can't reach into shadow roots. Instead of per-component wiring, the app marks **one** stylesheet:

```html
<link rel="stylesheet" id="ui-app-stylesheet" href="/css/app.css" />
<!-- or -->
<style id="ui-app-stylesheet">
  @import url("./brand.css") layer(ui.app);
  ui-button::part(button) { letter-spacing: 0.02em; }
  .ui.primary.button { --ui-color: var(--ui-violet); }
</style>
```

- `Styles` mirrors it into ONE shared constructable sheet and appends it **last** in every component's `adoptedStyleSheets`, in this order: foundation, component, any foreign sheets, utilities, app sheet. Inside shadow roots, its rules can use Fomantic's class grammar on the semantic shadow markup.
- How each source is read:
  - `<style>`: its text
  - same-origin `<link>`: its `cssRules`, once `load` has fired
  - cross-origin `<link>` (reading `cssRules` throws): the `href` is fetched and its text used
- The sheet stays in sync. Changes are debounced by 30 ms, and `appSheetReady` resolves once the sheet is current. A `MutationObserver` watches:
  - the `<style>`'s text
  - the `<link>`'s `href`, `media` and `disabled`
  - the child lists of `<head>` and `<body>`, to catch late insertion, removal or replacement
- `@import`: constructable sheets ignore `@import`, so imports are inlined:
  - a `<link>` read through CSSOM is inlined at every depth, from each `CSSImportRule.styleSheet`
  - `<style>` text and fetched text are inlined **one level deep**, fetched relative to the importing sheet
  - an `@import` inside an imported file is dropped, with a console warning
  - `layer()`, `supports()` and media conditions become wrapping `@layer`, `@supports` and `@media` blocks
  - relative `url()`s in inlined files are made absolute, since the combined sheet has a single base URL (the `<link>`'s `href`, or the document for a `<style>`)
- Limitations:
  - an element that gains the id later through `setAttribute("id", …)` is not noticed; insert a new element instead
  - a cross-origin `@import` inside a same-origin `<link>` can't be read; use a `<style>` with `@import` instead, which gets fetched
  - its rules are not wrapped in a layer. Unlayered rules beat every `ui.*` layer, which is usually what an app override wants. Wrap them in `@layer ui.app { … }` to take part in the layer order instead.
