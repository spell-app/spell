import { For, Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

// Import directly:  in `core`'s util barrel the pref store cost every page 1.9 kB
import { PrefStore } from "spell/util/persist/PrefStore"
import { E, UI, UIT } from "spell-ui/core"
import { ThemePreference } from "spell-ui/components/ui-theme-menu/ThemePreference"
import { BenchBridge } from "./BenchBridge"
import { BenchColor } from "./BenchColor"
import { BenchEdits } from "./BenchEdits"
import { BenchTokens, type BenchGroup } from "./BenchTokens"
import { BenchTree, type BenchTreeNode } from "./BenchTree"
import { docsThemeBenchVocabulary } from "./UIDocsThemeBench.en"
import {
  BENCH_MESSAGE,
  BenchPlaceIds,
  BenchPlaces,
  EDITOR_REDIRECT,
  type BenchEditSet,
  type BenchFrameKey,
  type BenchMessage,
  type BenchPlaceId,
  type BenchReply,
  type BenchSchemes,
  type BenchSlot,
  type DocsThemeBenchVocabulary,
  type PageLook,
  type ThemeBenchTextKey,
  type TitlesAt,
  type TokenKind
} from "./UIDocsThemeBench.types"

import benchCSS from "./UIDocsThemeBench.css?inline"

/****************
 * ### `UIDocsThemeBench`
 * The component behind `<ui-docs-theme-bench>`:  Spell's real pages side by side, every one in the theme picked,
 * and the tokens behind their chrome (page tabs, section titles, surfaces) tuned live, for the theme work.
 *
 * - Its shadow DOM:
 *   - a BAR:  the title, `<ui-theme-menu>` (the theme and light / dark for every page), which pages to show
 *     (all four, or one), where their section titles sit (at rest, or stuck), Reload
 *   - the PAGES (`BenchPlaces`):  this epic's page, Spell UI's Button page, the Avatar notebook in the editor,
 *     and the editor on Solitaire in its full view (Debug, every side bar, a card picked);
 *     each a real page in a frame, drawn at a desk's width and scaled down to its cell
 *     - in light and dark side by side, a pair of frames (`schemes`, "both");  or once, in the scheme picked
 *     - a pair's dark editor frame is the editor at this machine's other name (`127.0.0.1`):  another origin,
 *       so the two keep their own schemes
 *   - the TUNING:  every token, in the theme tree's groups (`BenchTokens`), each with a control (a colour's picker and
 *     opacity, a length's slider, its text) and which pages' sheets read it;
 *     then the CHANGES, as the lines to put in the theme's file (`BenchEdits`)
 * - The theme:  the bench's menu is the docs site's (`ThemePreference`);  a pick there is made in every page too,
 *   as its own menu would, remembered there (`BenchPlace.themeKey`).
 *   - The bench itself always wears Glass (`CHROME_THEME`, `ThemePreference.wear()`), in the scheme picked:
 *     only the pages in the frames change, and the tuning goes into the frames only.
 * - A tuning applies to the theme shown, live:  a sheet over each page (`BenchBridge.applyCss()`).
 *   - A token whose value differs between light and dark is tuned for the scheme shown.
 *   - Tunings are kept in this browser (`spell-ui-site:theme-bench`), per theme, until reset.
 * - How it reaches each page (`BenchPlace.reach`):
 *   - the pages beside it, on the page server:  directly, through their documents (`BenchBridge`'s functions)
 *   - the editor app, on its own port:  through messages, which it takes in development (`BenchBridge.listen()`)
 * - The editor's address:  the page server's `/editor` redirect, followed (`EDITOR_REDIRECT`).
 * - SIDE EFFECTS:  writes each page's remembered theme, and the scheme every Spell site shares, as their menus do;
 *   listens to `window`'s messages while connected.
 ****************/
export class UIDocsThemeBench extends E.UIComponent<DocsThemeBenchVocabulary> {
  @E.proto static vocabulary = docsThemeBenchVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "docs-theme-bench": benchCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## The theme
  ////////////////

  /** The theme every page wears:  the bench's menu's. */
  @E.state accessor theme: string = isServer ? DEFAULT_THEME : ThemePreference.chosen.theme

  /** The scheme every page shows:  light or dark, never "the OS's", so a scheme's tuning has a class to sit under. */
  @E.state accessor scheme: "light" | "dark" = isServer ? "light" : ThemePreference.shownScheme()

  /**
   * While connected:  follow the bench's menu, for the pages in its frames;
   * the bench itself wears Glass whatever is picked (`CHROME_THEME`;  Owen, epic `debut`), in the scheme picked.
   */
  @E.whileConnected
  protected followMenu() {
    void ThemePreference.wear(CHROME_THEME)
    const stop = ThemePreference.subscribe((chosen) => {
      this.theme = chosen.theme
      this.scheme = ThemePreference.shownScheme(chosen.scheme)
    })
    return () => {
      stop()
      void ThemePreference.wear(undefined)
    }
  }

  /**
   * A new theme or scheme:  every frame wears it, and says again what its sheets read.
   * - A pair's frames keep their own schemes:  a new scheme moves only a one-scheme frame, and which half of each pair
   *   the tuning column reads.
   */
  @E.onChange("theme", "scheme", { defer: true })
  protected onThemeChanged() {
    for (const key of this.frameKeys) void this.dress(key, { theme: true, scheme: true, css: true, look: true })
  }

  ////////////////
  // ## The tokens
  ////////////////

  /** Every theme's files, worked out;  `undefined` while they load. */
  @E.state accessor tokens: BenchTokens | undefined = undefined

  /** Why the theme files didn't load. */
  @E.state accessor tokensError: string | undefined = undefined

  /** The text in the filter:  only tokens whose name has it show. */
  @E.state accessor filter = ""

  /** Load the theme files, once. */
  @E.once
  private async loadTokens(): Promise<void> {
    try {
      this.tokens = await BenchTokens.load()
    } catch (error) {
      this.tokensError = String(error)
    }
  }

  /** The groups for the theme shown, each its tokens, the filter applied:  to the CSS name, or the path in the tree. */
  get groups(): BenchGroup[] {
    const tokens = this.tokens
    const groups = tokens?.groupsFor(this.theme, this.looks.editor?.declares) ?? []
    const filter = this.filter.trim().toLowerCase()
    if (!filter || !tokens) return groups
    const matches = (token: string, place: string) =>
      token.includes(filter) || [place, ...tokens.pathOf(token, place)].join(" ").includes(filter)
    return groups
      .map((group) => ({ ...group, tokens: group.tokens.filter((token) => matches(token, group.place)) }))
      .filter((group) => group.tokens.length)
  }

  /** The groups as a tree, the way a theme file nests them (Owen:  "can we show this as a tree?"). */
  @E.derived
  get tree(): BenchTree {
    const tokens = this.tokens
    return new BenchTree({
      groups: this.groups,
      pathOf: (token, place) => tokens?.pathOf(token, place) ?? [token],
      labelOf: (place) => this.text(GROUP_TEXTS[place] ?? "groupOwn")
    })
  }

  /** Each branch's fold, by its id:  open or not;  kept in this browser (a branch never folded keeps its default). */
  @E.state accessor folds: Readonly<Record<string, boolean>> = isServer
    ? {}
    : (PREFS.get<Record<string, boolean>>(FOLDS_PREF) ?? {})

  /** Each branch's section, by its id:  so a fold is kept by the branch it's on. */
  private readonly branchSections = new Map<string, Element>()

  /** Whether branch `id` is open:  every one while filtering;  else as folded, a group open by default. */
  private isBranchOpen(id: string, isGroup: boolean): boolean {
    return !!this.filter.trim() || (this.folds[id] ?? isGroup)
  }

  /** Branch `id` folded or unfolded, by its title or find-in-page:  kept, unless it's the filter that opened it. */
  private onBranchFolded(event: CustomEvent<{ open: boolean; section: Element }>, id: string): void {
    // a branch inside it sends its own, which bubbles here:  each keeps only its own section's
    if (event.detail.section !== this.branchSections.get(id) || this.filter.trim()) return
    if (this.folds[id] === event.detail.open) return
    this.folds = { ...this.folds, [id]: event.detail.open }
    PREFS.set(FOLDS_PREF, this.folds)
  }

  /** Every token the groups hold, filtered or not:  what the pages are asked about. */
  private get tokenList(): string[] {
    return (this.tokens?.groupsFor(this.theme, this.looks.editor?.declares) ?? []).flatMap((group) => group.tokens)
  }

  ////////////////
  // ## The tuning
  ////////////////

  /** Every tuning, by theme, then token;  kept in this browser. */
  @E.state accessor edits: BenchEditSet = isServer ? {} : (PREFS.get<BenchEditSet>(EDITS_PREF) ?? {})

  /** The sheet laid over every page:  the theme shown's tunings. */
  get css(): string {
    return BenchEdits.css(this.edits, this.theme)
  }

  /** `:state(tuned)`:  some token of the theme shown is tuned. */
  @E.cssState("tuned")
  get isTuned(): boolean {
    return BenchEdits.count(this.edits, this.theme) > 0
  }

  /** A new sheet:  every frame wears it. */
  @E.onChange("css", { defer: true })
  protected onCssChanged() {
    for (const key of this.frameKeys) void this.dress(key, { css: true })
  }

  /**
   * Set `token` to `value`:  for `scheme` alone, or for both (`undefined`).
   * - By default:  the scheme shown when `token` shows light and dark apart (`isSplit()`), else both.
   */
  @E.untracked
  tune(token: string, value: string, scheme: Scheme | undefined = this.isSplit(token) ? this.scheme : undefined): void {
    this.keep(BenchEdits.set(this.edits, { theme: this.theme, token, value, scheme }))
  }

  /** Give `token` a light and a dark value of its own, each starting as it is now. */
  @E.untracked
  split(token: string): void {
    const [light, dark] = [this.valueOf(token, "light"), this.valueOf(token, "dark")]
    const edits = BenchEdits.set(this.edits, { theme: this.theme, token, value: light, scheme: "light" })
    this.keep(BenchEdits.set(edits, { theme: this.theme, token, value: dark, scheme: "dark" }))
  }

  /** Put `token` back to the theme's own;  every token, when none is given. */
  @E.untracked
  reset(token?: string): void {
    this.keep(BenchEdits.reset(this.edits, this.theme, token))
  }

  /** Make `edits` the tunings, and keep them. */
  private keep(edits: BenchEditSet): void {
    this.edits = edits
    PREFS.set(EDITS_PREF, Object.keys(edits).length ? edits : undefined)
  }

  /**
   * Whether `token` shows light and dark apart, each with its own control:  tuned per scheme,
   * or (untuned) its value differs between them in the theme shown.
   */
  isSplit(token: string): boolean {
    const edit = this.edits[this.theme]?.[token]
    if (edit) return !("both" in edit)
    const value = this.nowOf(token) || (this.tokens?.valueIn(this.theme, token) ?? "")
    return BenchTokens.forScheme(value, "light") !== BenchTokens.forScheme(value, "dark")
  }

  /** What the tuning's copy holds:  the theme file's lines, then the editor's own. */
  get changes(): string {
    const tokens = this.tokens
    if (!tokens) return ""
    return [BenchEdits.themeFile(this.edits, this.theme, tokens), BenchEdits.editorCss(this.edits, this.theme, tokens)]
      .filter(Boolean)
      .join("\n")
  }

  ////////////////
  // ## The pages
  ////////////////

  /** Which pages show:  all four, or one. */
  @E.state accessor layout: BenchLayout = "grid"

  /** Where the pages' section titles sit. */
  @E.state accessor titles: TitlesAt = "rest"

  /** Which schemes each page shows:  light and dark side by side (Owen:  "light/dark for the pages"), or one. */
  @E.state accessor schemes: BenchSchemes = "both"

  /** Each page's frames:  a pair, light and dark;  or its one, in the scheme picked. */
  get slots(): readonly BenchSlot[] {
    return this.schemes === "both" ? PAIR : ONE
  }

  /** Every frame shown, by key:  each page's slots. */
  get frameKeys(): BenchFrameKey[] {
    return BenchPlaceIds.flatMap((id) => this.slots.map((slot) => frameKey(id, slot)))
  }

  /** The scheme frame `slot` shows:  its own half of a pair, else the scheme picked. */
  private schemeOf(slot: BenchSlot): "light" | "dark" {
    return slot === "shown" ? this.scheme : slot
  }

  /** The editor app's address;  `undefined` while it's found, `""` when it isn't running. */
  @E.state accessor editorBase: string | undefined = undefined

  /**
   * What each page's sheets read, set and hold, as it last said:  from its frame in the scheme picked
   * (`isReadFrom()`), so the values read are that scheme's.
   */
  @E.state accessor looks: Readonly<Partial<Record<BenchPlaceId, PageLook>>> = {}

  /** Which frames are dressed and drawn:  until then, a loading line covers each one. */
  @E.state accessor loaded: Readonly<Partial<Record<BenchFrameKey, boolean>>> = {}

  /** Mark frame `key` loaded, or not. */
  private markLoaded(key: BenchFrameKey, isLoaded: boolean): void {
    if (!!this.loaded[key] !== isLoaded) this.loaded = { ...this.loaded, [key]: isLoaded }
  }

  /** Each frame's cell, as big as it's drawn. */
  @E.state accessor cells: Readonly<Partial<Record<BenchFrameKey, CellSize>>> = {}

  /** The tokens each page's sheets read, and those they set below `:root`, as sets. */
  @E.derived
  get readers(): Partial<Record<BenchPlaceId, { reads: ReadonlySet<string>; overrides: ReadonlySet<string> }>> {
    return Object.fromEntries(
      Object.entries(this.looks).map(([id, look]) => [
        id,
        { reads: new Set(look!.reads), overrides: new Set(look!.overrides) }
      ])
    )
  }

  /** New titles' place:  every frame scrolls there. */
  @E.onChange("titles", { defer: true })
  protected onTitlesChanged() {
    for (const key of this.frameKeys) void this.dress(key, { titles: true })
  }

  /** Each frame, by key. */
  private readonly frames = new Map<BenchFrameKey, HTMLIFrameElement>()

  /** Asks sent, so each reply finds its page. */
  private asked = 0

  /** Connected:  load the theme files and find the editor (once), and take the pages' messages. */
  @E.whileConnected
  protected listenToPages() {
    void this.loadTokens()
    void this.findEditor()
    const onMessage = (event: MessageEvent) => this.onPageMessage(event)
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }

  /**
   * Follow the page server's `/editor` to the editor app's address, once:  under the bench's own site address first
   * (a worktree's, on the main checkout's server), then at the server's root.
   */
  @E.once
  private async findEditor(): Promise<void> {
    for (const address of new Set([this.siteRoot + EDITOR_REDIRECT, EDITOR_REDIRECT])) {
      try {
        const response = await fetch(address)
        if (response.ok && response.redirected) {
          this.editorBase = response.url.replace(/\/$/, "")
          return
        }
      } catch {
        // not there:  the next
      }
    }
    this.editorBase = ""
  }

  /**
   * Where the bench's site starts on its server:  `""` at the root, `/worktrees/debut` for a worktree's pages on the
   * main checkout's server;  the pages beside it are found under it, so a worktree's bench shows the worktree's pages.
   */
  @E.lazy
  private get siteRoot(): string {
    return isServer ? "" : location.pathname.replace(BENCH_PAGE_PATH, "")
  }

  /**
   * Frame `key`'s address;  `undefined` for the editor's while it isn't found, or running.
   * - A pair's dark editor frame is the editor at this machine's OTHER name (`127.0.0.1` for `localhost`):
   *   another origin, so it keeps its own scheme where the light one keeps its own (the editor remembers its scheme in
   *   the browser, and its code follows that).
   */
  private urlOf(key: BenchFrameKey): string | undefined {
    const [id, slot] = splitKey(key)
    const place = BenchPlaces[id]
    if (place.reach === "page server") return this.siteRoot + place.path
    if (!this.editorBase) return undefined
    const base = slot === "dark" ? otherLoopback(this.editorBase) : this.editorBase
    return base + place.path
  }

  /**
   * A frame loaded (again):  a page server's, dress it all;  the editor's says hello once its app is up.
   * - Shown after `LOADED_ANYWAY_SECONDS` whatever happens, so a page that never answers still shows.
   */
  @E.untracked
  private onPageLoaded(key: BenchFrameKey): void {
    const [id] = splitKey(key)
    if (BenchPlaces[id].reach === "page server") void this.dress(key, ALL_PARTS).then(() => this.markLoaded(key, true))
    void E.after(LOADED_ANYWAY_SECONDS, () => this.markLoaded(key, true))
  }

  /** A frame's message:  it's listening (dress it all), or it answered an ask. */
  @E.untracked
  private onPageMessage(event: MessageEvent): void {
    const reply = event.data as BenchReply | undefined
    if (reply?.type !== BENCH_MESSAGE) return
    const key = this.frameKeys.find((each) => this.frames.get(each)?.contentWindow === event.source)
    if (!key) return
    if (reply.hello) void this.dress(key, ALL_PARTS)
    if (reply.look) this.took(key, reply.look)
  }

  /** Whether page `id`'s look is read from frame `key`:  its frame in the scheme picked. */
  private isReadFrom(key: BenchFrameKey): boolean {
    return this.schemeOf(splitKey(key)[1]) === this.scheme
  }

  /**
   * Frame `key` said what its page's sheets say:  keep it, when it's the frame its page is read from;
   * the editor's own tokens new to the bench, ask again for them.
   */
  private took(key: BenchFrameKey, look: PageLook): void {
    const [id] = splitKey(key)
    const isEditor = BenchPlaces[id].reach === "editor"
    if (isEditor) this.markLoaded(key, true)
    if (!this.isReadFrom(key)) return
    const known = new Set(this.tokenList)
    this.looks = { ...this.looks, [id]: look }
    const isNew = look.declares.some((token) => token.startsWith(EDITOR_PREFIX) && !known.has(token))
    if (isNew && isEditor) void this.dress(key, { look: true })
  }

  /**
   * Make frame `key` wear what `parts` says:  the theme, its scheme, the tuning, its titles' place;
   * then ask what its sheets say (`look`).
   * - A page server's frame keeps its scheme pinned (`BenchBridge.pinScheme()`):  a pair's two halves share the
   *   browser's storage, where each page follows the scheme the other stores.
   * - NEVER throws:  a page that can't be reached (not loaded, gone) warns.
   */
  private async dress(key: BenchFrameKey, parts: DressParts): Promise<void> {
    const [id, slot] = splitKey(key)
    const place = BenchPlaces[id]
    const frame = this.frames.get(key)
    if (!frame?.contentWindow) return
    if (place.reach === "editor") return this.post(key, frame.contentWindow, parts)
    const win = frame.contentWindow as FrameWindow
    const doc = frame.contentDocument
    if (!doc?.documentElement) return
    try {
      if (parts.theme) {
        win.localStorage.setItem(place.themeKey, this.theme)
        const runtime = await UIDocsThemeBench.runtimeOf(win)
        await runtime?.themes.apply(this.theme)
      }
      if (parts.scheme) BenchBridge.pinScheme(doc, this.schemeOf(slot))
      if (parts.css) BenchBridge.applyCss(doc, this.css)
      if (parts.titles) await E.after(LAYOUT_SECONDS, () => BenchBridge.scrollTitles(doc, this.titles))
      if (parts.look) this.took(key, BenchBridge.look(doc, this.tokenList))
    } catch (error) {
      E.Warnings.warn("<ui-docs-theme-bench>", `can't dress the ${key} page`, error)
    }
  }

  /** `dress()` for the editor app:  a message to its frame, `win`;  `look` asks, and its reply comes as a message. */
  private post(key: BenchFrameKey, win: Window, parts: DressParts): void {
    const url = this.urlOf(key)
    if (!url) return
    const [id, slot] = splitKey(key)
    const message: BenchMessage = { type: BENCH_MESSAGE }
    if (parts.theme) message.theme = this.theme
    if (parts.scheme) message.scheme = this.schemeOf(slot)
    if (parts.css) message.css = this.css
    if (parts.titles) message.titles = this.titles
    if (parts.fullMonty && id === "editor") message.fullMonty = true
    if (parts.look) message.ask = { id: ++this.asked, tokens: this.tokenList }
    win.postMessage(message, new URL(url).origin)
  }

  /** Reload page `id`'s frames;  every page's, when none is given. */
  @E.untracked
  reload(id?: BenchPlaceId): void {
    for (const key of this.frameKeys) {
      if (id && splitKey(key)[0] !== id) continue
      this.markLoaded(key, false)
      this.frames.get(key)?.contentWindow?.location.reload()
    }
  }

  /** Page `win`'s Spell UI runtime, once it's on the page and loaded;  `undefined` after 5s without one. */
  private static async runtimeOf(win: FrameWindow): Promise<typeof UI | undefined> {
    for (let tries = 0; tries < RUNTIME_TRIES; tries++) {
      // the docs site's bundle puts the runtime on the page;  the epic pages' only share Spell UI's core by name
      const runtime = win.UI ?? win.SpellUI?.packModules?.[CORE_MODULE]?.UI
      if (runtime?.load) {
        await runtime.load()
        return runtime
      }
      await E.after(RUNTIME_WAIT_SECONDS, () => undefined)
    }
    return undefined
  }

  /** Watch frame `key`'s cell, `cell`, for its size:  its frame is scaled to it. */
  private watchCell(key: BenchFrameKey, cell: HTMLElement): void {
    if (isServer) return
    cell.dataset.frame = key
    this.resizer.observe(cell)
  }

  /** One observer of every cell's size. */
  @E.lazy
  private get resizer(): ResizeObserver {
    return new ResizeObserver((entries) => {
      const cells = { ...this.cells }
      for (const entry of entries) {
        const key = (entry.target as HTMLElement).dataset.frame as BenchFrameKey
        cells[key] = { width: entry.contentRect.width, height: entry.contentRect.height }
      }
      this.cells = cells
    })
  }

  /** Frame `key`'s size:  its page's desk width, as tall as its cell, scaled to fit the cell's width. */
  private frameStyle(key: BenchFrameKey): string {
    const { width } = BenchPlaces[splitKey(key)[0]]
    const cell = this.cells[key]
    if (!cell?.width) return `width: ${width}px; height: 100%`
    const scale = cell.width / width
    return `width: ${width}px; height: ${Math.round(cell.height / scale)}px; transform: scale(${scale})`
  }

  ////////////////
  // ## A token's values
  ////////////////

  /** The box colours are probed in:  in the scheme shown, so a `light-dark()` resolves as the pages show it. */
  private probeBox: HTMLElement | undefined

  /** `token`'s value as the pages show it now:  the editor's own from the editor, the rest from the docs first. */
  private nowOf(token: string): string {
    const fromPages = this.pagesValueOf(token)
    if (fromPages) return fromPages
    // set at no page's root (a component's own token, which only the component reads):  the theme file's value, its
    // pointers worked out from the pages, so its field is never blank
    const written = this.tokens?.valueIn(this.theme, token)
    return written ? written.replace(VAR, (whole, name: string) => this.pagesValueOf(name) || whole) : ""
  }

  /** `token`'s value as the pages hold it at their root:  the editor's own from the editor first, the rest docs first. */
  private pagesValueOf(token: string): string {
    const order: readonly BenchPlaceId[] = token.startsWith(EDITOR_PREFIX) ? EDITOR_FIRST : DOCS_FIRST
    for (const id of order) {
      const value = this.looks[id]?.values[token]
      if (value) return value
    }
    return ""
  }

  /** `token`'s value in `scheme` (the one shown by default):  its tuning, else the pages' now. */
  private valueOf(token: string, scheme: Scheme = this.scheme): string {
    const tuned = BenchEdits.valueFor(this.edits, this.theme, token, scheme)
    return tuned ?? BenchTokens.forScheme(this.nowOf(token), scheme)
  }

  /** What control `token` gets, from its value in `scheme`. */
  private kindOf(token: string, scheme: Scheme = this.scheme): TokenKind {
    const value = this.valueOf(token, scheme)
    if (BenchColor.isColor(value)) return "color"
    if (PIXELS.test(value)) return "length"
    return "text"
  }

  ////////////////
  // ## Rendering
  ////////////////

  /** The bench's text for `key` (`translationForKey()`);  `""` until the runtime is in. */
  private readonly text = (key: ThemeBenchTextKey, params?: Record<string, string | number>): string =>
    this.isReady ? this.translationForKey(key, params) : ""

  render(): JSX.Element {
    return (
      <div class="ui theme-bench" part={this.partForName("bench")}>
        {this.bar()}
        <div class="body">
          <div class={["pages", this.layout]} part={this.partForName("pages")}>
            <For each={BenchPlaceIds}>{(id) => this.page(id)}</For>
          </div>
          {this.tuning()}
        </div>
        <div class={["probe", `ui-${this.scheme}`]} ref={(box) => (this.probeBox = box)} aria-hidden="true" />
      </div>
    )
  }

  /** The bar:  the title, the theme menu, which pages, the titles' place, Reload. */
  private bar(): JSX.Element {
    const t = this.text
    return (
      <header class="bar" part={this.partForName("bar")}>
        <div class="title">
          <ui-icon name="swatchbook" aria-hidden="true"></ui-icon>
          <div>
            <h1>{t("label")}</h1>
            <p class="lede">{t("lede")}</p>
          </div>
        </div>
        <ui-theme-menu size="small"></ui-theme-menu>
        <div class="tools">
          <div class="tool">
            <ui-menu
              appearance="segmented link"
              size="small"
              aria-label={t("layout")}
              on-ui-choosing={(event: CustomEvent<{ value: string }>) =>
                (this.layout = event.detail.value as BenchLayout)
              }
            >
              <ui-item value="grid" selected={this.layout === "grid" ? "" : undefined}>
                {t("grid")}
              </ui-item>
              <For each={BenchPlaceIds}>
                {(id) => (
                  <ui-item value={id} selected={this.layout === id ? "" : undefined}>
                    {t(id)}
                  </ui-item>
                )}
              </For>
            </ui-menu>
          </div>
          <div class="tool">
            <ui-menu
              appearance="segmented link"
              size="small"
              aria-label={t("titles")}
              on-ui-choosing={(event: CustomEvent<{ value: string }>) => (this.titles = event.detail.value as TitlesAt)}
            >
              <For each={TITLE_PLACES}>
                {(at) => (
                  <ui-item value={at} selected={this.titles === at ? "" : undefined}>
                    {t(at)}
                  </ui-item>
                )}
              </For>
            </ui-menu>
          </div>
          <div class="tool">
            <ui-menu
              appearance="segmented link"
              size="small"
              aria-label={t("schemes")}
              on-ui-choosing={(event: CustomEvent<{ value: string }>) =>
                (this.schemes = event.detail.value as BenchSchemes)
              }
            >
              <For each={SCHEME_CHOICES}>
                {(choice) => (
                  <ui-item value={choice} selected={this.schemes === choice ? "" : undefined}>
                    {t(choice)}
                  </ui-item>
                )}
              </For>
            </ui-menu>
          </div>
          <ui-button size="small" appearance="basic" icon="redo" onClick={() => this.reload()}>
            {t("reload")}
          </ui-button>
        </div>
      </header>
    )
  }

  /** Page `id`:  its title row, then its frames (a light and dark pair, or one), each scaled into its cell. */
  private page(id: BenchPlaceId): JSX.Element {
    const t = this.text
    const url = () => this.urlOf(frameKey(id, this.slots[0]!))
    return (
      <figure class="page" part={this.partForName("page")} hidden={this.layout !== "grid" && this.layout !== id}>
        <figcaption class="page-head">
          <span class="page-title">{t(id)}</span>
          <code class="page-path" title={BenchPlaces[id].path}>
            {BenchPlaces[id].path}
          </code>
          <ui-icon
            class="page-tool"
            name="redo"
            link=""
            appearance="link"
            label={t("reload")}
            title={t("reload")}
            onClick={() => this.reload(id)}
          ></ui-icon>
          <Show when={url()}>
            <a class="page-tool" href={url()} target="_blank" title={t("open")} aria-label={t("open")}>
              <ui-icon name="external alternate" appearance="link" aria-hidden="true"></ui-icon>
            </a>
          </Show>
        </figcaption>
        <div class={["frames", this.schemes]}>
          <For each={this.slots}>{(slot) => this.frame(frameKey(id, slot))}</For>
        </div>
      </figure>
    )
  }

  /** Frame `key`:  a pair's half named for its scheme, over its cell, the page scaled into it. */
  private frame(key: BenchFrameKey): JSX.Element {
    const t = this.text
    const [id, slot] = splitKey(key)
    const url = () => this.urlOf(key)
    return (
      <div class="frame">
        <div class={["viewport", { loaded: !!this.loaded[key] }]} ref={(cell) => this.watchCell(key, cell)}>
          <Show when={url()} fallback={<p class="note">{this.editorBase === "" ? t("noEditor") : t("loadingPage")}</p>}>
            <iframe
              src={url()}
              title={slot === "shown" ? t(id) : `${t(id)}, ${t(slot as "light" | "dark")}`}
              style={this.frameStyle(key)}
              ref={(frame) => this.frames.set(key, frame)}
              onLoad={() => this.onPageLoaded(key)}
            ></iframe>
            <Show when={!this.loaded[key]}>
              <p class="note loading">{t("loadingPage")}</p>
            </Show>
          </Show>
        </div>
      </div>
    )
  }

  /**
   * The tuning column:  the filter and the readers' legend, sticky;  every group of tokens;  the changes.
   */
  private tuning(): JSX.Element {
    const t = this.text
    return (
      <aside class="tuning" part={this.partForName("tuning")}>
        <div class="tuning-head">
          <ui-input
            class="find"
            size="small"
            icon="search"
            fluid=""
            placeholder={t("find")}
            aria-label={t("find")}
            value={this.filter}
            on-ui-typed={(event: CustomEvent<{ value: string }>) => (this.filter = event.detail.value)}
          ></ui-input>
          <Show when={this.tokens}>{this.readersLegend()}</Show>
        </div>
        <Show
          when={this.tokens}
          fallback={<p class="note">{this.tokensError ? t("failed", { error: this.tokensError }) : t("loading")}</p>}
        >
          <For each={this.tree.roots.map((node) => node.id)}>{(id) => this.branch(id, true)}</For>
        </Show>
        {this.changesSection()}
      </aside>
    )
  }

  /**
   * Branch `id` of the tree, folding:  its own token first when it's one too, then what's under it, drawn only while
   * it's open.
   * - By its id, never the node object:  each page's report makes a new tree, and a new object would draw the whole
   *   branch again (its fold, and the read-by icon under the pointer with its tooltip, lost).
   */
  private branch(id: string, isGroup = false): JSX.Element {
    const node = () => this.tree.nodes.get(id)
    const isOpen = () => this.isBranchOpen(id, isGroup)
    const onFolded = (event: CustomEvent<{ open: boolean; section: Element }>) => this.onBranchFolded(event, id)
    return (
      <ui-section
        ref={(section) => this.branchSections.set(id, section)}
        class={isGroup ? "group" : "branch"}
        label={node()?.name ?? ""}
        collapsible=""
        level={isGroup ? "4" : "5"}
        open={isOpen() ? "" : "false"}
        on-ui-opened={onFolded}
        on-ui-closed={onFolded}
      >
        <Show when={isGroup}>
          <code slot="actions" class="group-place">
            {id}
          </code>
        </Show>
        <Show when={isOpen()}>
          <Show when={node()?.token}>{this.leaf(id)}</Show>
          <For each={node()?.children.map((child) => child.id) ?? []}>
            {(childId) => (this.tree.nodes.get(childId)?.children.length ? this.branch(childId) : this.leaf(childId))}
          </For>
        </Show>
      </ui-section>
    )
  }

  /** Node `id`'s token, by its short name in the tree. */
  private leaf(id: string): JSX.Element {
    const node = (): BenchTreeNode | undefined => this.tree.nodes.get(id)
    const token = node()?.token
    return token ? this.token(token, () => node()?.name ?? token) : undefined
  }

  /**
   * One token's row:  its name and which pages read it, then its control;
   * a light and a dark control side by side when it shows them apart (`isSplit()`).
   */
  private token(token: string, label: () => string = () => token): JSX.Element {
    const t = this.text
    const isTuned = () => this.edits[this.theme]?.[token] !== undefined
    const isSplit = () => this.isSplit(token)
    return (
      <div class={["token", { tuned: isTuned(), split: isSplit() }]} part={this.partForName("token")}>
        <div class="token-head">
          <span class="token-name" title={`${token}  ·  ${this.tokens?.placeOf(token) ?? ""}`}>
            {label()}
            <Show when={this.filter.trim()}>
              <code class="token-css">{token}</code>
            </Show>
          </span>
          {this.readersIcons(token)}
          <Show when={!isSplit()}>
            <ui-button
              class="token-tool"
              size="mini"
              appearance="basic circular"
              icon="columns"
              aria-label={t("split")}
              title={t("split")}
              onClick={() => this.split(token)}
            ></ui-button>
          </Show>
          <Show when={isTuned()}>
            <ui-button
              class="token-tool"
              size="mini"
              appearance="basic circular"
              icon="undo"
              aria-label={t("reset")}
              title={t("reset")}
              onClick={() => this.reset(token)}
            ></ui-button>
          </Show>
        </div>
        <Show when={isSplit()} fallback={this.control(token)}>
          <div class="halves">
            {this.half(token, "light")}
            {this.half(token, "dark")}
          </div>
        </Show>
      </div>
    )
  }

  /** `token`'s one control, for both schemes:  a colour's picker, text and opacity;  a length's text and slider. */
  private control(token: string): JSX.Element {
    const t = this.text
    const kind = () => this.kindOf(token)
    return (
      <div class={["token-control", kind()]}>
        <Show when={kind() === "color"}>{this.colorPicker(token)}</Show>
        <ui-input
          size="small"
          fluid=""
          value={this.valueOf(token)}
          placeholder={t("unset", { theme: UIT.ThemeNames.titleOf(this.theme) })}
          aria-label={`${token}:  ${t("value")}`}
          on-ui-changed={(event: CustomEvent<{ value: string }>) => this.tune(token, event.detail.value.trim())}
        ></ui-input>
        <Show when={kind() === "color"}>{this.opacitySlider(token)}</Show>
        <Show when={kind() === "length"}>{this.lengthSlider(token)}</Show>
      </div>
    )
  }

  /**
   * `token`'s control for `scheme` alone, under its sun or moon:  a colour's swatch (the picker), hex and opacity;
   * anything else its text.
   */
  private half(token: string, scheme: Scheme): JSX.Element {
    const t = this.text
    const name = `${token}, ${t(scheme)}`
    const color = () => this.colorOf(token, scheme)
    return (
      <div class={["half", scheme, this.kindOf(token, scheme)]} title={t(scheme)}>
        <ui-icon class="half-scheme" name={scheme === "dark" ? "moon" : "sun"} aria-label={t(scheme)}></ui-icon>
        <Show
          when={this.kindOf(token, scheme) === "color"}
          fallback={
            <ui-input
              size="small"
              fluid=""
              value={this.valueOf(token, scheme)}
              placeholder={t("unset", { theme: UIT.ThemeNames.titleOf(this.theme) })}
              aria-label={`${name}:  ${t("value")}`}
              on-ui-changed={(event: CustomEvent<{ value: string }>) =>
                this.tune(token, event.detail.value.trim(), scheme)
              }
            ></ui-input>
          }
        >
          {this.colorPicker(token, scheme)}
          <ui-input
            class="hex"
            size="small"
            value={color().hex}
            aria-label={`${name}:  ${t("value")}`}
            on-ui-changed={(event: CustomEvent<{ value: string }>) =>
              this.tune(token, BenchColor.join(event.detail.value.trim(), color().opacity), scheme)
            }
          ></ui-input>
          <ui-input
            class="opacity"
            type="number"
            size="small"
            min="0"
            max={String(FULL)}
            step="1"
            value={String(color().opacity)}
            aria-label={`${name}:  ${t("alpha")}`}
            on-ui-changed={(event: CustomEvent<{ value: string }>) =>
              this.tune(token, BenchColor.join(color().hex, Number(event.detail.value) || 0), scheme)
            }
          ></ui-input>
          <span class="unit" aria-hidden="true">
            %
          </span>
        </Show>
      </div>
    )
  }

  /** `token`'s colour in `scheme` (the one shown by default), as the picker and the opacity take it. */
  private colorOf(token: string, scheme: Scheme = this.scheme): { hex: string; opacity: number } {
    return (
      (this.probeBox && BenchColor.split(this.valueOf(token, scheme), this.probeBox)) || {
        hex: FALLBACK_HEX,
        opacity: FULL
      }
    )
  }

  /** A colour's picker, the browser's own, its opacity kept:  for `scheme` alone, or as `tune()` picks. */
  private colorPicker(token: string, scheme?: Scheme): JSX.Element {
    return (
      <ui-input
        class="swatch-picker"
        type="color"
        size="small"
        value={this.colorOf(token, scheme).hex}
        aria-label={scheme ? `${token}, ${this.text(scheme)}` : token}
        on-ui-typed={(event: CustomEvent<{ value: string }>) =>
          this.tune(token, BenchColor.join(event.detail.value, this.colorOf(token, scheme).opacity), scheme)
        }
      ></ui-input>
    )
  }

  /** A colour's opacity, 0-100%. */
  private opacitySlider(token: string): JSX.Element {
    const opacity = () => this.colorOf(token).opacity
    return (
      <div class="amount-slider">
        <ui-slider
          min={0}
          max={FULL}
          step={1}
          value={opacity()}
          aria-label={`${token}:  ${this.text("alpha")}`}
          on-ui-moved={(event: CustomEvent<{ value: number }>) =>
            this.tune(token, BenchColor.join(this.colorOf(token).hex, event.detail.value))
          }
        ></ui-slider>
        <span class="amount">{opacity()}%</span>
      </div>
    )
  }

  /** A length's slider, in px. */
  private lengthSlider(token: string): JSX.Element {
    const px = () => parseFloat(this.valueOf(token)) || 0
    return (
      <div class="amount-slider">
        <ui-slider
          min={0}
          max={Math.max(MAX_PX, Math.ceil(px() * 2))}
          step={1}
          value={px()}
          aria-label={token}
          on-ui-moved={(event: CustomEvent<{ value: number }>) => this.tune(token, `${event.detail.value}px`)}
        ></ui-slider>
        <span class="amount">{px()}px</span>
      </div>
    )
  }

  /**
   * The icons of the pages whose sheets read `token`, on its name's line:  only those that do.
   * - Badged with a half dot (◐) where the page also sets it on its own elements:  a tuning on `:root` doesn't reach
   *   those.
   * - Each named in its tip;  the legend is in the column's head (`readersLegend()`).
   */
  private readersIcons(token: string): JSX.Element {
    const t = this.text
    // The ids, not objects:  `<For>` keeps each icon while its page goes on reading the token, so the one under the
    // pointer is never swapped for a copy (a swapped one loses its tooltip:  each page's report made new ones)
    const readerIds = () => BenchPlaceIds.filter((id) => this.readers[id]?.reads.has(token))
    const stateOf = (id: BenchPlaceId): ReaderState => (this.readers[id]?.overrides.has(token) ? "overrides" : "reads")
    return (
      <span class="readers" role="list" aria-label={t("readBy")}>
        <For each={readerIds()}>
          {(id) => {
            const tip = () => t(READER_TIPS[stateOf(id)], { place: t(id) })
            return (
              <span class={["reader", stateOf(id)]} role="listitem" title={tip()} aria-label={tip()}>
                <ui-icon name={BenchPlaces[id].icon} aria-hidden="true"></ui-icon>
              </span>
            )
          }}
        </For>
      </span>
    )
  }

  /** Which icon is which page, once, in the column's head:  the pages, then the half dot's meaning. */
  private readersLegend(): JSX.Element {
    const t = this.text
    return (
      <div class="legend" aria-hidden="true">
        <span class="legend-label">{t("readBy")}</span>
        <For each={BenchPlaceIds}>
          {(id) => (
            <span class="legend-item">
              <ui-icon name={BenchPlaces[id].icon}></ui-icon>
              {t(id)}
            </span>
          )}
        </For>
        <span class="legend-item overrides" title={t("overridesLegendTip")}>
          <span class="half-dot" />
          {t("overridesLegend")}
        </span>
      </div>
    )
  }

  /** The changes:  the theme file's lines and the editor's own, to copy;  Reset all. */
  private changesSection(): JSX.Element {
    const t = this.text
    return (
      <ui-section class="changes" label={t("changes")} collapsible="" level="4">
        <Show
          when={this.isTuned}
          fallback={<p class="note">{t("noChanges", { theme: UIT.ThemeNames.titleOf(this.theme) })}</p>}
        >
          <ui-code language="javascript" copy="" wrap="">
            {this.changes}
          </ui-code>
          <ui-button size="small" appearance="basic" icon="undo" onClick={() => this.reset()}>
            {t("resetAll")}
          </ui-button>
        </Show>
      </ui-section>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIDocsThemeBench extends E.AttributeValues<DocsThemeBenchVocabulary> {}

/** Which pages show:  all four, or one. */
type BenchLayout = "grid" | BenchPlaceId

/** A scheme a token's value can differ in. */
type Scheme = "light" | "dark"

/** How a page that reads a token treats it:  reads it, or reads it but sets its own below `:root` too. */
type ReaderState = "reads" | "overrides"

/** Each reader state's tip. */
const READER_TIPS: Readonly<Record<ReaderState, ThemeBenchTextKey>> = {
  reads: "readsTip",
  overrides: "overridesTip"
}

/** A cell's size, px. */
type CellSize = { width: number; height: number }

/** What `dress()` makes a page wear. */
type DressParts = {
  theme?: boolean
  scheme?: boolean
  css?: boolean
  titles?: boolean
  fullMonty?: boolean
  look?: boolean
}

/** A frame's window, with its page's Spell UI runtime, if any:  its own, or in the core its packs share. */
type FrameWindow = Window & {
  UI?: typeof UI
  SpellUI?: { packModules?: Record<string, { UI?: typeof UI } | undefined> }
}

/** The module name a page shares Spell UI's core by (`SpellUI.packModules`). */
const CORE_MODULE = "spell-ui/core"

/** Everything, for a page just loaded (or the editor just listening). */
const ALL_PARTS: DressParts = { theme: true, scheme: true, css: true, titles: true, fullMonty: true, look: true }

/**
 * The theme the bench's own bar, columns and frames' surrounds wear, whatever is picked for the pages in them
 * (Owen, epic `debut`:  "Make the \"chrome\" of the page ... stick to \"glass\"");  its tuning never reaches them.
 */
const CHROME_THEME = "glass"

/** The theme on a server, where there's no menu to read:  Spell UI's pages' own. */
const DEFAULT_THEME = "spell"

/** The bench's kept tunings:  the docs site's store (`spell-ui-site:theme-bench`). */
const PREFS = new PrefStore("spell-ui-site")
const EDITS_PREF = "theme-bench"
const FOLDS_PREF = "theme-bench-folds"

/** The titles' places, in the menu's order. */
const TITLE_PLACES: readonly TitlesAt[] = ["rest", "stuck"]

/** The schemes' choices, in the menu's order. */
const SCHEME_CHOICES: readonly BenchSchemes[] = ["both", "one"]

/** A page's frames:  a pair, or its one in the scheme picked. */
const PAIR: readonly BenchSlot[] = ["light", "dark"]
const ONE: readonly BenchSlot[] = ["shown"]

/** Frame key of page `id`'s `slot`. */
function frameKey(id: BenchPlaceId, slot: BenchSlot): BenchFrameKey {
  return `${id}:${slot}`
}

/** A frame key's page and slot. */
function splitKey(key: BenchFrameKey): [BenchPlaceId, BenchSlot] {
  return key.split(":") as [BenchPlaceId, BenchSlot]
}

/**
 * `address` at this machine's other name:  `localhost` <=> `127.0.0.1`;  the same server, another origin,
 * so its own browser storage.
 */
function otherLoopback(address: string): string {
  const url = new URL(address)
  url.hostname = url.hostname === LOCALHOST ? LOOPBACK_IP : LOCALHOST
  return url.origin + url.pathname.replace(/\/$/, "")
}

/** This machine's two names. */
const LOCALHOST = "localhost"
const LOOPBACK_IP = "127.0.0.1"

/**
 * Where a token's value now is read first:  the editor's own tokens from the editor, then the docs pages, which hold
 * them too (the editor's frames may not answer:  at main's address, or while the editor starts).
 */
const EDITOR_FIRST: readonly BenchPlaceId[] = ["editor", "notebook", "ui", "epic"]
const DOCS_FIRST: readonly BenchPlaceId[] = ["ui", "epic", "editor", "notebook"]

/** The editor app's own tokens start so. */
const EDITOR_PREFIX = "--spell-"

/** A `var()` with no nested brackets in its fallback:  its token. */
const VAR = /var\(\s*(--[\w-]+)\s*(?:,[^()]*)?\)/g

/** A length the slider takes:  px. */
const PIXELS = /^-?\d+(?:\.\d+)?px$/

/** A length slider's least top, px. */
const MAX_PX = 48

/** Fully opaque, in the opacity slider's units. */
const FULL = 100

/** The picker's colour while a value can't be painted. */
const FALLBACK_HEX = "#000000"

/** The bench's page, from its site's root:  what's before it is the site's address. */
const BENCH_PAGE_PATH = /\/components\/ui\/[^/]*$/

/** How long after its frame loads a page shows, dressed or not, in seconds. */
const LOADED_ANYWAY_SECONDS = 12

/** How long a page gets to draw before its titles are scrolled, in seconds. */
const LAYOUT_SECONDS = 0.6

/** How often, and how many times, a page is checked for its runtime:  5s in all. */
const RUNTIME_WAIT_SECONDS = 0.1
const RUNTIME_TRIES = 50

/** Each group's title. */
const GROUP_TEXTS: Readonly<Record<string, ThemeBenchTextKey>> = {
  surfaces: "groupSurfaces",
  "components.bar": "groupBar",
  "components.menu": "groupMenu",
  "components.section": "groupSection",
  own: "groupOwn",
  radii: "groupRadii",
  shadows: "groupShadows",
  borders: "groupBorders",
  "components.docs-nav": "groupDocsNav",
  editor: "groupEditor"
}
