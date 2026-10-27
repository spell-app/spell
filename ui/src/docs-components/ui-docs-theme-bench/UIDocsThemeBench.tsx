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
import { docsThemeBenchVocabulary } from "./UIDocsThemeBench.en"
import {
  BENCH_MESSAGE,
  BenchPlaceIds,
  BenchPlaces,
  EDITOR_REDIRECT,
  type BenchEditSet,
  type BenchMessage,
  type BenchPlaceId,
  type BenchReply,
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
 *   - the PAGES:  four frames, each a real page drawn at a desk's width and scaled down to its cell
 *     (`BenchPlaces`):  this epic's page, Spell UI's Button page, the Avatar notebook in the editor,
 *     and the editor on Solitaire in its full view (Debug, every side bar, a card picked)
 *   - the TUNING:  every token, in the theme tree's groups (`BenchTokens`), each with a control (a colour's picker and
 *     opacity, a length's slider, its text), every theme's value for it, and which pages' sheets read it;
 *     then the CHANGES, as the lines to put in the theme's file (`BenchEdits`)
 * - The theme:  the bench's menu is the docs site's (`ThemePreference`);  a pick there is made in every page too,
 *   as its own menu would, remembered there (`BenchPlace.themeKey`).
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

  /** While connected:  follow the bench's menu. */
  @E.whileConnected
  protected followMenu() {
    return ThemePreference.subscribe((chosen) => {
      this.theme = chosen.theme
      this.scheme = ThemePreference.shownScheme(chosen.scheme)
    })
  }

  /** A new theme or scheme:  every page wears it, and says again what its sheets read. */
  @E.onChange("theme", "scheme", { defer: true })
  protected onThemeChanged() {
    for (const id of BenchPlaceIds) void this.dress(id, { theme: true, scheme: true, css: true, look: true })
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

  /** The groups for the theme shown, each its tokens, the filter applied. */
  get groups(): BenchGroup[] {
    const groups = this.tokens?.groupsFor(this.theme, this.looks.editor?.declares) ?? []
    const filter = this.filter.trim().toLowerCase()
    if (!filter) return groups
    return groups
      .map((group) => ({ ...group, tokens: group.tokens.filter((token) => token.includes(filter)) }))
      .filter((group) => group.tokens.length)
  }

  /** Every token the groups hold, filtered or not:  what the pages are asked about. */
  private get tokenList(): string[] {
    return (this.tokens?.groupsFor(this.theme, this.looks.editor?.declares) ?? []).flatMap((group) => group.tokens)
  }

  /** The themes, in the menu's order (Spell's own first), those with a file. */
  get themeNames(): string[] {
    const tokens = this.tokens
    if (!tokens) return []
    const own = this.isReady ? UI.themes.own.filter((name) => name in tokens.themes) : []
    return [...own, ...tokens.names.filter((name) => !own.includes(name))]
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

  /** A new sheet:  every page wears it. */
  @E.onChange("css", { defer: true })
  protected onCssChanged() {
    for (const id of BenchPlaceIds) void this.dress(id, { css: true })
  }

  /** Set `token` to `value`:  for the scheme shown when its value differs by scheme, else for both. */
  @E.untracked
  tune(token: string, value: string): void {
    const scheme = this.isPerScheme(token) ? this.scheme : undefined
    this.keep(BenchEdits.set(this.edits, { theme: this.theme, token, value, scheme }))
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

  /** Whether `token`'s value differs between light and dark, in the theme shown. */
  private isPerScheme(token: string): boolean {
    const value = this.tokens?.valueIn(this.theme, token) ?? this.nowOf(token)
    return value.includes(LIGHT_DARK)
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

  /** The editor app's address;  `undefined` while it's found, `""` when it isn't running. */
  @E.state accessor editorBase: string | undefined = undefined

  /** What each page's sheets read, set and hold, as it last said. */
  @E.state accessor looks: Readonly<Partial<Record<BenchPlaceId, PageLook>>> = {}

  /** Which pages are dressed and drawn:  until then, a loading line covers each frame. */
  @E.state accessor loaded: Readonly<Partial<Record<BenchPlaceId, boolean>>> = {}

  /** Mark page `id` loaded, or not. */
  private markLoaded(id: BenchPlaceId, isLoaded: boolean): void {
    if (!!this.loaded[id] !== isLoaded) this.loaded = { ...this.loaded, [id]: isLoaded }
  }

  /** Each page's cell, as big as it's drawn. */
  @E.state accessor cells: Readonly<Partial<Record<BenchPlaceId, CellSize>>> = {}

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

  /** New titles' place:  every page scrolls there. */
  @E.onChange("titles", { defer: true })
  protected onTitlesChanged() {
    for (const id of BenchPlaceIds) void this.dress(id, { titles: true })
  }

  /** Each page's frame, by id. */
  private readonly frames = new Map<BenchPlaceId, HTMLIFrameElement>()

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

  /** Follow the page server's `/editor` to the editor app's address, once. */
  @E.once
  private async findEditor(): Promise<void> {
    try {
      const response = await fetch(EDITOR_REDIRECT)
      this.editorBase = response.ok && response.redirected ? response.url.replace(/\/$/, "") : ""
    } catch {
      this.editorBase = ""
    }
  }

  /** Page `id`'s address;  `undefined` for the editor's while it isn't found, or running. */
  private urlOf(id: BenchPlaceId): string | undefined {
    const place = BenchPlaces[id]
    if (place.reach === "page server") return place.path
    return this.editorBase ? this.editorBase + place.path : undefined
  }

  /**
   * A page loaded (again):  a page server's, dress it all;  the editor's says hello once its app is up.
   * - Shown after `LOADED_ANYWAY_SECONDS` whatever happens, so a page that never answers still shows.
   */
  @E.untracked
  private onPageLoaded(id: BenchPlaceId): void {
    if (BenchPlaces[id].reach === "page server") void this.dress(id, ALL_PARTS).then(() => this.markLoaded(id, true))
    void E.after(LOADED_ANYWAY_SECONDS, () => this.markLoaded(id, true))
  }

  /** A page's message:  it's listening (dress it all), or it answered an ask. */
  @E.untracked
  private onPageMessage(event: MessageEvent): void {
    const reply = event.data as BenchReply | undefined
    if (reply?.type !== BENCH_MESSAGE) return
    const id = BenchPlaceIds.find((each) => this.frames.get(each)?.contentWindow === event.source)
    if (!id) return
    if (reply.hello) void this.dress(id, ALL_PARTS)
    if (reply.look) this.took(id, reply.look)
  }

  /** Page `id` said what its sheets say:  keep it;  the editor's own tokens new to the bench, ask again for them. */
  private took(id: BenchPlaceId, look: PageLook): void {
    const known = new Set(this.tokenList)
    this.looks = { ...this.looks, [id]: look }
    if (BenchPlaces[id].reach === "editor") this.markLoaded(id, true)
    const isNew = look.declares.some((token) => token.startsWith(EDITOR_PREFIX) && !known.has(token))
    if (isNew && BenchPlaces[id].reach === "editor") void this.dress(id, { look: true })
  }

  /**
   * Make page `id` wear what `parts` says:  the theme, the scheme, the tuning, its titles' place;
   * then ask what its sheets say (`look`).
   * - NEVER throws:  a page that can't be reached (not loaded, gone) warns.
   */
  private async dress(id: BenchPlaceId, parts: DressParts): Promise<void> {
    const place = BenchPlaces[id]
    const frame = this.frames.get(id)
    if (!frame?.contentWindow) return
    if (place.reach === "editor") return this.post(id, frame.contentWindow, parts)
    const win = frame.contentWindow as FrameWindow
    const doc = frame.contentDocument
    if (!doc?.documentElement) return
    try {
      if (parts.theme) {
        win.localStorage.setItem(place.themeKey, this.theme)
        const runtime = await UIDocsThemeBench.runtimeOf(win)
        await runtime?.themes.apply(this.theme)
      }
      if (parts.scheme) ThemePreference.applyScheme(this.scheme, doc.documentElement)
      if (parts.css) BenchBridge.applyCss(doc, this.css)
      if (parts.titles) await E.after(LAYOUT_SECONDS, () => BenchBridge.scrollTitles(doc, this.titles))
      if (parts.look) this.took(id, BenchBridge.look(doc, this.tokenList))
    } catch (error) {
      E.Warnings.warn("<ui-docs-theme-bench>", `can't dress the ${id} page`, error)
    }
  }

  /** `dress()` for the editor app:  a message to its frame, `win`;  `look` asks, and its reply comes as a message. */
  private post(id: BenchPlaceId, win: Window, parts: DressParts): void {
    if (!this.editorBase) return
    const message: BenchMessage = { type: BENCH_MESSAGE }
    if (parts.theme) message.theme = this.theme
    if (parts.scheme) message.scheme = this.scheme
    if (parts.css) message.css = this.css
    if (parts.titles) message.titles = this.titles
    if (parts.fullMonty && id === "editor") message.fullMonty = true
    if (parts.look) message.ask = { id: ++this.asked, tokens: this.tokenList }
    win.postMessage(message, new URL(this.editorBase).origin)
  }

  /** Reload page `id`;  every page, when none is given. */
  @E.untracked
  reload(id?: BenchPlaceId): void {
    for (const each of id ? [id] : BenchPlaceIds) {
      this.markLoaded(each, false)
      this.frames.get(each)?.contentWindow?.location.reload()
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

  /** Watch the cell of page `id`, `cell`, for its size:  its frame is scaled to it. */
  private watchCell(id: BenchPlaceId, cell: HTMLElement): void {
    if (isServer) return
    cell.dataset.place = id
    this.resizer.observe(cell)
  }

  /** One observer of every cell's size. */
  @E.lazy
  private get resizer(): ResizeObserver {
    return new ResizeObserver((entries) => {
      const cells = { ...this.cells }
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.place as BenchPlaceId
        cells[id] = { width: entry.contentRect.width, height: entry.contentRect.height }
      }
      this.cells = cells
    })
  }

  /** Page `id`'s frame's size:  its desk width, as tall as its cell, scaled to fit the cell's width. */
  private frameStyle(id: BenchPlaceId): string {
    const { width } = BenchPlaces[id]
    const cell = this.cells[id]
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
    const order: readonly BenchPlaceId[] = token.startsWith(EDITOR_PREFIX) ? EDITOR_FIRST : DOCS_FIRST
    for (const id of order) {
      const value = this.looks[id]?.values[token]
      if (value) return value
    }
    return ""
  }

  /** `token`'s value for the scheme shown:  its tuning, else the pages' now. */
  private valueOf(token: string): string {
    const tuned = BenchEdits.valueFor(this.edits, this.theme, token, this.scheme)
    return tuned ?? BenchTokens.forScheme(this.nowOf(token), this.scheme)
  }

  /** What control `token` gets, from its value. */
  private kindOf(token: string): TokenKind {
    const value = this.valueOf(token)
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
          <ui-menu
            appearance="segmented"
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
          <ui-menu
            appearance="segmented"
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
          <ui-button size="small" appearance="basic" icon="redo" onClick={() => this.reload()}>
            {t("reload")}
          </ui-button>
        </div>
      </header>
    )
  }

  /** Page `id`:  its title row, and its frame, scaled into its cell. */
  private page(id: BenchPlaceId): JSX.Element {
    const t = this.text
    const url = () => this.urlOf(id)
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
        <div class={["viewport", { loaded: !!this.loaded[id] }]} ref={(cell) => this.watchCell(id, cell)}>
          <Show when={url()} fallback={<p class="note">{this.editorBase === "" ? t("noEditor") : t("loadingPage")}</p>}>
            <iframe
              src={url()}
              title={t(id)}
              style={this.frameStyle(id)}
              ref={(frame) => this.frames.set(id, frame)}
              onLoad={() => this.onPageLoaded(id)}
            ></iframe>
            <Show when={!this.loaded[id]}>
              <p class="note loading">{t("loadingPage")}</p>
            </Show>
          </Show>
        </div>
      </figure>
    )
  }

  /** The tuning column:  the filter, every group of tokens, the changes. */
  private tuning(): JSX.Element {
    const t = this.text
    return (
      <aside class="tuning" part={this.partForName("tuning")}>
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
        <Show
          when={this.tokens}
          fallback={<p class="note">{this.tokensError ? t("failed", { error: this.tokensError }) : t("loading")}</p>}
        >
          <For each={this.groups}>{(group) => this.group(group)}</For>
        </Show>
        {this.changesSection()}
      </aside>
    )
  }

  /** One group of tokens, folding. */
  private group(group: BenchGroup): JSX.Element {
    return (
      <ui-section class="group" label={this.text(GROUP_TEXTS[group.place] ?? "groupOwn")} collapsible="" level="4">
        <code slot="actions" class="group-place">
          {group.place}
        </code>
        <For each={group.tokens}>{(token) => this.token(token)}</For>
      </ui-section>
    )
  }

  /** One token's row:  its name, its control, every theme's value, which pages read it. */
  private token(token: string): JSX.Element {
    const t = this.text
    const isTuned = () => this.edits[this.theme]?.[token] !== undefined
    const kind = () => this.kindOf(token)
    return (
      <div class={["token", { tuned: isTuned() }]} part={this.partForName("token")}>
        <div class="token-head">
          <code class="token-name" title={this.tokens?.placeOf(token)}>
            {token}
          </code>
          <Show when={isTuned()}>
            <ui-button
              size="mini"
              appearance="basic circular"
              icon="undo"
              aria-label={t("reset")}
              title={t("reset")}
              onClick={() => this.reset(token)}
            ></ui-button>
          </Show>
        </div>
        <div class={["token-control", kind()]}>
          <Show when={kind() === "color"}>{this.colorPicker(token)}</Show>
          <ui-input
            size="small"
            fluid=""
            value={this.valueOf(token)}
            aria-label={`${token}:  ${t("value")}`}
            on-ui-changed={(event: CustomEvent<{ value: string }>) => this.tune(token, event.detail.value.trim())}
          ></ui-input>
          <Show when={kind() === "color"}>{this.opacitySlider(token)}</Show>
          <Show when={kind() === "length"}>{this.lengthSlider(token)}</Show>
        </div>
        {this.themesRow(token, kind)}
        {this.readersRow(token)}
      </div>
    )
  }

  /** `token`'s colour, as the picker and the opacity slider take it. */
  private colorOf(token: string): { hex: string; opacity: number } {
    return (
      (this.probeBox && BenchColor.split(this.valueOf(token), this.probeBox)) || { hex: FALLBACK_HEX, opacity: FULL }
    )
  }

  /** A colour's picker:  the browser's own, its opacity kept. */
  private colorPicker(token: string): JSX.Element {
    return (
      <ui-input
        type="color"
        size="small"
        value={this.colorOf(token).hex}
        aria-label={token}
        on-ui-typed={(event: CustomEvent<{ value: string }>) =>
          this.tune(token, BenchColor.join(event.detail.value, this.colorOf(token).opacity))
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

  /** Every theme's value for `token`:  a swatch (light and dark halves) or its text;  a click wears that theme. */
  private themesRow(token: string, kind: () => TokenKind): JSX.Element {
    const t = this.text
    return (
      <ul class="themes" aria-label={t("themesRow")}>
        <For each={this.themeNames}>
          {(name) => {
            const light = () => this.tokens?.resolvedIn(name, token, "light")
            const dark = () => this.tokens?.resolvedIn(name, token, "dark")
            const tip = () => {
              const [lightText, darkText] = [light(), dark()]
              const value =
                lightText === undefined
                  ? t("notSet")
                  : lightText === darkText
                    ? lightText
                    : `${lightText}  /  ${darkText}`
              return `${UIT.ThemeNames.titleOf(name)}:  ${value}`
            }
            return (
              <li>
                <button
                  type="button"
                  class={["chip", { current: name === this.theme, unset: light() === undefined }]}
                  title={tip()}
                  aria-label={tip()}
                  onClick={() => void ThemePreference.setTheme(name)}
                >
                  <Show when={kind() === "color"} fallback={<span class="chip-text">{light() ?? "–"}</span>}>
                    <span
                      class="swatch"
                      style={`--_light: ${light() ?? "transparent"}; --_dark: ${dark() ?? "transparent"}`}
                    />
                  </Show>
                  <span class="chip-name">{UIT.ThemeNames.titleOf(name)}</span>
                </button>
              </li>
            )
          }}
        </For>
      </ul>
    )
  }

  /**
   * Which pages' sheets read `token`:  lit;  marked when a page also sets it on its own elements (a tuning on `:root`
   * doesn't reach there);  struck out when it doesn't read it;  dashed while a page hasn't said.
   */
  private readersRow(token: string): JSX.Element {
    const t = this.text
    return (
      <div class="readers" role="group" aria-label={t("readBy")}>
        <span class="readers-label">{t("readBy")}</span>
        <For each={BenchPlaceIds}>
          {(id) => {
            const state = (): ReaderState => {
              const sets = this.readers[id]
              if (!sets) return "unknown"
              if (!sets.reads.has(token)) return "not"
              return sets.overrides.has(token) ? "overrides" : "reads"
            }
            return (
              <span class={["reader", state()]} title={t(READER_TIPS[state()], { place: t(id) })}>
                {t(id)}
              </span>
            )
          }}
        </For>
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

/** How a page treats a token:  reads it, reads it but sets its own below `:root` too, doesn't, or hasn't said. */
type ReaderState = "reads" | "overrides" | "not" | "unknown"

/** Each reader state's tip. */
const READER_TIPS: Readonly<Record<ReaderState, ThemeBenchTextKey>> = {
  reads: "readsTip",
  overrides: "overridesTip",
  not: "notReadTip",
  unknown: "unknownTip"
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

/** The theme on a server, where there's no menu to read:  Spell UI's pages' own. */
const DEFAULT_THEME = "spell"

/** The bench's kept tunings:  the docs site's store (`spell-ui-site:theme-bench`). */
const PREFS = new PrefStore("spell-ui-site")
const EDITS_PREF = "theme-bench"

/** The titles' places, in the menu's order. */
const TITLE_PLACES: readonly TitlesAt[] = ["rest", "stuck"]

/** Where a token's value now is read first:  the editor's own tokens, then the rest. */
const EDITOR_FIRST: readonly BenchPlaceId[] = ["editor", "notebook"]
const DOCS_FIRST: readonly BenchPlaceId[] = ["ui", "epic", "editor", "notebook"]

/** The editor app's own tokens start so. */
const EDITOR_PREFIX = "--spell-"

/** A value per scheme. */
const LIGHT_DARK = "light-dark("

/** A length the slider takes:  px. */
const PIXELS = /^-?\d+(?:\.\d+)?px$/

/** A length slider's least top, px. */
const MAX_PX = 48

/** Fully opaque, in the opacity slider's units. */
const FULL = 100

/** The picker's colour while a value can't be painted. */
const FALLBACK_HEX = "#000000"

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
