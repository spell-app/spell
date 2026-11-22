import { UTILITIES_SHEET, type StyleRegisterOptions, type StyleSource } from "./runtime.types"
import { AppStylesheet } from "./AppStylesheet"

/****************
 * ### `Styles`
 * Registry of named constructable stylesheets, and the one place that sets `adoptedStyleSheets`, as `UI.styles`.
 * - In the runtime's lazy chunk;  `UIRuntime` registers the foundation here, components adopt through it.
 * - Why a registry:  every component instance shares ONE `CSSStyleSheet` per name (no per-instance `<style>`),
 *   and re-registering a name updates it everywhere at once.
 * - Order inside every shadow root (`adoptInto()`):
 *   1. foundation sheets, in `setFoundation()` order (layers, reset, the colour and size remaps ...)
 *   1b. the FALLBACK sheets (`setFallback()`), only while the page has no tokens of its own
 *   2. the component's own sheets, as passed
 *   2b. the PAGE sheets, only in a root that draws `ui-*` elements in its own light content (`adoptPageSheetsInto()`)
 *   3. any sheets someone else put on the root (kept, not clobbered)
 *   4. utilities (`setUtilities()`, default `["utilities"]`)
 *   5. `shadow: true` sheets (themes), in registration order
 *   6. the app stylesheet (`#ui-app-stylesheet`) -- ALWAYS last, see `AppStylesheet`
 * - Unregistered names are skipped, not errors:
 *   foundation / utilities may be registered after components connect,
 *   and every adopted root is re-pushed when they are.
 * - Roots are held WEAKLY, so a disconnected component's shadow root can be collected.
 * - The tokens are set on the PAGE only (`pageOnly` sheets), and reach every shadow root by inheritance
 *   (epic `solid-2-final` P3):  a shadow root adopts no `:root` rule, and no `:host` copy of the tokens while the page
 *   has them.
 ****************/
export class Styles {
  /** name -> sheet */
  private readonly sheets = new Map<string, CSSStyleSheet>()
  /** name -> last CSS text, so re-registering identical text is a no-op */
  private readonly texts = new Map<string, string>()
  /** every sheet this registry created or was handed -- anything else on a root is "foreign" */
  private readonly owned = new WeakSet<CSSStyleSheet>()
  /** names also pushed onto `document.adoptedStyleSheets` */
  private readonly pageNames = new Set<string>()
  /** names also adopted into every shadow root, after utilities, see `StyleRegisterOptions.shadow` */
  private readonly shadowNames = new Set<string>()
  /** page names no shadow root takes, even one that takes the page sheets:  see `StyleRegisterOptions.pageOnly` */
  private readonly pageOnlyNames = new Set<string>()
  /** page names `ui.css` already carries, see `StyleRegisterOptions.linked` */
  private readonly linkedNames = new Set<string>()
  /** foundation names, in order */
  private foundation: string[] = []
  /** fallback names, in order:  adopted into shadow roots only while the page has no tokens */
  private fallback: string[] = []
  /** Does the page carry the tokens?  Read once, on the first push that needs it;  `undefined` until then. */
  private pageHasTokens: boolean | undefined
  /** utility names, in order */
  private utilities: string[] = [UTILITIES_SHEET]
  /** every root `adoptInto()` has seen */
  private readonly roots = new Set<WeakRef<ShadowRoot>>()
  /** component sheet names per root */
  private readonly rootNames = new WeakMap<ShadowRoot, string[]>()
  /** roots that also take the page sheets:  see `adoptPageSheetsInto()` */
  private readonly pageSheetRoots = new WeakSet<ShadowRoot>()
  /** `load` listener armed, so page sheets get re-evaluated once late `<link>`s are in */
  private isWatchingLoad = false

  ////////////////
  // ## Registry
  ////////////////

  /**
   * Register `css` as `name`.  Idempotent.
   * - Text:  built with `replaceSync`.
   *   Re-registering different text REPLACES the existing sheet's rules in place,
   *   so every root already using it updates with no re-push.
   * - A `CSSStyleSheet`:  used as-is;  a different object for an existing name is swapped into every root.
   * - `page: true`:  also pushed onto `document.adoptedStyleSheets`, once.
   *   With `pageOnly: true` too, never into a shadow root, even one that takes the page sheets.
   *   With `linked: true` too, only while the page doesn't link `ui.css` (see `StyleRegisterOptions`),
   *   also when `linked` comes on a later call.
   * - `shadow: true`:  also adopted into EVERY shadow root `adoptInto()` knows, now and later, after utilities
   *   (themes:  their class-grammar overrides must reach component markup).
   * - `""` UNREGISTERS `name`, whatever options it was registered with:
   *   dropped from the page, every shadow root and the registry (`has()` turns false).
   *   Returns an empty, detached sheet.
   * - NOTE: `page` / `shadow` / `linked` / `pageOnly` only ever ADD:  a later call without them keeps what an earlier one set.
   * - NOTE: `replaceSync` drops `@import` -- registered text MUST be self-contained.
   */
  register(
    name: string,
    css: StyleSource,
    { page = false, linked = false, shadow = false, pageOnly = false }: StyleRegisterOptions = {}
  ): CSSStyleSheet {
    if (css === "") return this.unregister(name)
    let sheet = this.sheets.get(name)
    let isSwapped = false
    if (typeof css === "string") {
      if (!sheet) sheet = new CSSStyleSheet()
      if (this.texts.get(name) !== css) {
        // WebKit:  a second `replaceSync` before anything read `cssRules` APPENDS to the old rules
        // (old ones stay live, and `cssRules` reads stale):  reading a rule first makes it replace
        if (this.texts.has(name)) void sheet.cssRules[0]
        sheet.replaceSync(css)
        this.texts.set(name, css)
      }
    } else if (css !== sheet) {
      isSwapped = !!sheet
      sheet = css
      this.texts.delete(name)
    }
    const isAdded = !this.sheets.has(name)
    this.sheets.set(name, sheet)
    this.owned.add(sheet)
    const isNewPage = page && !this.pageNames.has(name)
    const isNewLinked = page && linked && !this.linkedNames.has(name)
    if (isNewPage) this.pageNames.add(name)
    if (isNewLinked) this.linkedNames.add(name)
    if (page && pageOnly) this.pageOnlyNames.add(name)
    // a page sheet that just became `linked` may have to come OFF the page (epic `wwod-spell-ui`, I2)
    if (isNewPage || isNewLinked || (isSwapped && this.pageNames.has(name))) this.refreshPage()
    // a root that takes the page sheets takes a new one too
    if (isNewPage && !isAdded && !isSwapped) this.refreshRoots()
    const isNewShadow = shadow && !this.shadowNames.has(name)
    if (isNewShadow) this.shadowNames.add(name)
    if (isAdded || isSwapped || isNewShadow) this.refreshRoots()
    return sheet
  }

  /**
   * Forget `name`:  off the page, out of every shadow root, out of the registry.
   * - The old sheet stays in `owned`, so the re-pushes drop it rather than keep it as "foreign".
   * - A root that lists it as a COMPONENT sheet keeps the name, so registering it again puts it back.
   * - Returns an empty sheet nothing adopts, so `register()` keeps its return type.
   */
  private unregister(name: string): CSSStyleSheet {
    const isKnown = this.sheets.delete(name)
    this.texts.delete(name)
    this.linkedNames.delete(name)
    this.pageOnlyNames.delete(name)
    this.shadowNames.delete(name)
    // the page may have lost its tokens:  read it again
    this.pageHasTokens = undefined
    if (this.pageNames.delete(name)) this.refreshPage()
    if (isKnown) this.refreshRoots()
    return new CSSStyleSheet()
  }

  /**
   * Register each of `sheets` (`name => CSS text`) that isn't registered yet;  a name already registered is left as is.
   * - What a component's `elementSetup.styleSheets` go through:
   *   every element of the class calls it, only the first registers.
   * - `register()` is the one that REPLACES a sheet's text:  hot reload and themes rely on it.
   */
  registerOnce(sheets: Readonly<Record<string, string>>) {
    for (const [name, css] of Object.entries(sheets)) if (!this.has(name)) this.register(name, css)
  }

  /** Sheet registered as `name`, if any. */
  sheet(name: string): CSSStyleSheet | undefined {
    return this.sheets.get(name)
  }

  /** Is `name` registered? */
  has(name: string): boolean {
    return this.sheets.has(name)
  }

  /** Set the foundation sheet names, in cascade order;  re-pushes every adopted root. */
  setFoundation(names: readonly string[]) {
    this.foundation = [...names]
    this.refreshRoots()
  }

  /**
   * Set the FALLBACK sheet names, in cascade order;  re-pushes every adopted root.
   * - The tokens' `:host` copies (`spell/ui/styles`' `fallbackCSS`):  a shadow root adopts them, after the
   *   foundation, only while the page has no tokens of its own.
   * - The page "has tokens" when its root element carries the colours' marker (`--ui-sheet-colors: loaded`):
   *   read once, and again when the page's sheets change while it had none.
   *   A page that links `ui.css` has them.
   */
  setFallback(names: readonly string[]) {
    this.fallback = [...names]
    this.refreshRoots()
  }

  /** Set the utility sheet names (adopted after component sheets);  re-pushes every adopted root. */
  setUtilities(names: readonly string[]) {
    this.utilities = [...names]
    this.refreshRoots()
  }

  ////////////////
  // ## Adoption
  ////////////////

  /**
   * Set `root.adoptedStyleSheets` to foundation + `names` + utilities + app sheet (see class docs for order),
   * and remember `root` so later registrations reach it.
   * - Called as the component is set up (`UIComponent.onMount()`), and again when its `styleSheetNames` change.
   * - Calling again with other names replaces that root's component sheets.
   * - SIDE EFFECT:  first call starts watching `#ui-app-stylesheet`.
   */
  adoptInto(root: ShadowRoot, names: string[]) {
    const isKnown = this.rootNames.has(root)
    this.rootNames.set(root, [...names])
    if (!isKnown) this.roots.add(new WeakRef(root))
    void this.startApp()
    this.push(root)
  }

  /**
   * `root` takes the PAGE sheets too (`register(..., { page: true })`), now and as more register:  for a shadow root
   * that draws `ui-*` elements whose light content a page sheet styles (epic `mockup` P8).
   * - e.g. a drawn view's root holding `<ui-table>` in rows mode:  its `<ui-row>`s and `<ui-cell>`s are styled by the
   *   table's page sheet, which the document's adopted sheets don't reach inside a shadow root.
   * - Only for a root `adoptInto()` already knows:  call it after the component is set up.
   */
  adoptPageSheetsInto(root: ShadowRoot) {
    if (this.pageSheetRoots.has(root)) return
    this.pageSheetRoots.add(root)
    if (this.rootNames.has(root)) this.push(root)
  }

  /**
   * Resolves once the app stylesheet reflects `#ui-app-stylesheet` as of its latest change.
   * - SIDE EFFECT:  starts watching it, if nothing has yet.
   */
  get appSheetReady(): Promise<void> {
    return this.startApp() ?? Promise.resolve()
  }

  /** The app stylesheet mirror, if started. */
  get appSheet(): CSSStyleSheet | undefined {
    return this.app?.sheet
  }
  /** the `#ui-app-stylesheet` mirror, created on first `adoptInto()` / `appSheetReady` */
  private app?: AppStylesheet

  /** Stop watching `#ui-app-stylesheet`, forget every root;  for tests and teardown. */
  dispose() {
    this.app?.stop()
    this.app = undefined
    this.roots.clear()
  }

  ////////////////
  // ## Internals
  ////////////////

  /** Create and start the app-sheet mirror once;  its current `ready`. */
  private startApp(): Promise<void> | undefined {
    if (typeof document === "undefined") return undefined
    if (!this.app) {
      // app sheets count as owned, so a swapped-out one is dropped from roots rather than kept as "foreign"
      this.app = new AppStylesheet({
        onSheetChange: (sheet) => {
          this.owned.add(sheet)
          this.refreshRoots()
        }
      })
      this.owned.add(this.app.sheet)
    }
    void this.app.start()
    return this.app.ready
  }

  /** Recompute one root's `adoptedStyleSheets`. */
  private push(root: ShadowRoot) {
    const names = this.rootNames.get(root) ?? []
    const foreign = root.adoptedStyleSheets.filter((sheet) => !this.owned.has(sheet))
    const sheets = [
      ...this.lookup(this.foundation),
      ...(this.fallback.length && !this.hasPageTokens ? this.lookup(this.fallback) : []),
      ...this.lookup(names),
      ...(this.pageSheetRoots.has(root) ? this.lookup(this.sharedPageNames()) : []),
      ...foreign,
      ...this.lookup(this.utilities),
      ...this.lookup(this.shadowNames),
      ...(this.app ? [this.app.sheet] : [])
    ]
    root.adoptedStyleSheets = [...new Set(sheets)]
  }

  /**
   * Re-push every live root;  drops collected ones.
   * - Skips a root out of the page's document for the moment:  its element being moved through a detached template's
   *   (Solid inserts a child before the new parent is on the page), where the browser refuses the page's sheets
   *   ("Sharing constructed stylesheets in multiple documents is not allowed";  epic `editor` P37).
   *   Its own sheets came when it was made;  it keeps them.
   */
  private refreshRoots() {
    const page = typeof document === "undefined" ? undefined : document
    for (const ref of this.roots) {
      const root = ref.deref()
      if (!root) this.roots.delete(ref)
      else if (!page || root.ownerDocument === page) this.push(root)
    }
  }

  /** The page names a shadow root that takes the page sheets takes:  all but the `pageOnly` ones. */
  private sharedPageNames(): string[] {
    return [...this.pageNames].filter((name) => !this.pageOnlyNames.has(name))
  }

  /**
   * Does the page carry the tokens?  See `setFallback()`.
   * - Read once and remembered:  a style read, so never once per root.
   * - `false` where there's no page to read (a server).
   */
  private get hasPageTokens(): boolean {
    if (this.pageHasTokens === undefined) {
      this.pageHasTokens =
        typeof document !== "undefined" &&
        typeof getComputedStyle === "function" &&
        getComputedStyle(document.documentElement).getPropertyValue(TOKENS_MARKER).trim() === LOADED
    }
    return this.pageHasTokens
  }

  /** Put the page sheets onto `document.adoptedStyleSheets`, keeping anything else already there. */
  private refreshPage() {
    if (typeof document === "undefined") return
    const foreign = document.adoptedStyleSheets.filter((sheet) => !this.owned.has(sheet))
    // a page that links `ui.css` already has ITS sheets:  adopting them again just doubles the CSS;
    // component page sheets (`table`, `scroll-lock`) aren't in it
    const isLinked = this.isPageLinked
    const ours = this.lookup([...this.pageNames].filter((name) => !isLinked || !this.linkedNames.has(name)))
    document.adoptedStyleSheets = [...foreign, ...ours]
    // a page that had no tokens may have them now:  read it again, and give its roots the fallback or not
    if (this.pageHasTokens === false) {
      this.pageHasTokens = undefined
      this.refreshRoots()
    }
    if (!isLinked && !this.isWatchingLoad && document.readyState !== "complete") {
      // a `<link>` still loading may bring the marker;  re-check once the page has settled
      this.isWatchingLoad = true
      window.addEventListener("load", () => this.refreshPage(), { once: true })
    }
  }

  /** Has the page linked `ui.css` (which sets `--ui-page-sheet: linked` on `:root`)? */
  private get isPageLinked(): boolean {
    return getComputedStyle(document.documentElement).getPropertyValue(PAGE_SHEET_PROPERTY).trim() === LINKED
  }

  /** Registered sheets for `names`, skipping unregistered ones. */
  private lookup(names: Iterable<string>): CSSStyleSheet[] {
    const found: CSSStyleSheet[] = []
    for (const name of names) {
      const sheet = this.sheets.get(name)
      if (sheet) found.push(sheet)
    }
    return found
  }
}

/** Custom property `ui.css` sets on `:root`, so the runtime knows the page links it. */
const PAGE_SHEET_PROPERTY = "--ui-page-sheet"

/** `PAGE_SHEET_PROPERTY`'s value on a page that links `ui.css`. */
const LINKED = "linked"

/** The colours' marker, set on `:root` wherever the page carries the tokens (`colors.css`, or `ui.css`). */
const TOKENS_MARKER = "--ui-sheet-colors"

/** `TOKENS_MARKER`'s value where the tokens are. */
const LOADED = "loaded"
