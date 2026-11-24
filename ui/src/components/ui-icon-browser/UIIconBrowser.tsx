import { For, Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { drawnInWindow } from "spell/element/drawnWindow"
import { E, UI, UIT } from "spell/ui/core"
import { IconCatalog, type IconChoice, type IconSearchWords } from "spell/ui/components/ui-icon-picker"
import { iconBrowserVocabulary } from "./UIIconBrowser.en"

import iconBrowserCSS from "./UIIconBrowser.css?inline"

/****************
 * ### `UIIconBrowser`
 * The component behind `<ui-icon-browser>`:  every icon of one of the packs Spell UI ships, in a grid.
 *
 * - Top to bottom, all Spell UI's own elements in its shadow root:
 *   - the pack switch, a `<ui-buttons>`:  FA7 Free, FA7 Brands, Fomantic;  the one shown is `primary`
 *   - a search box (`<ui-input type=search>`), over the icons' names AND Font Awesome's search terms
 *     (`IconCatalog`:  `mail` finds `envelope`), best match first
 *   - what a page adds to use the pack (`<ui-message>`)
 *   - how many match, of how many (`<ui-label>`), and the name just copied
 *   - the grid:  a tile per glyph, a `<ui-button>` showing it over its name;  a click copies the name
 * - Its icons are the PACK's own, not the page's (`IconCatalog.choicesOfPack()`):  one tile per glyph, labelled with
 *   the name `name` takes (its file's own name when the pack has it), its other names in its tooltip.
 * - Each pack loads into its OWN set of packs (`UI.icons.scope([])`), so browsing Fomantic changes nothing the page's
 *   other icons mean.  The tiles draw from that set, asking the one pack by its prefix (`fomantic:x`).
 * - The grid draws its first tiles, then more as its end scrolls near (`drawnInWindow()`):
 *   the default pack has ~2,000 glyphs, each an SVG file of its own.
 *   A new search or pack starts the grid again from the top.
 * - `address`:  opens on the address's `q` and `pack` (`spell icon --open`).
 *   Only on opening:  a search typed later is not written back, so it never adds history steps to a page that routes.
 * - Font Awesome's search terms load (`IconCatalog.searchWords()`, ~110 KB) only as the first search is typed.
 * - Never imports a pack itself:  each comes through `UI.icons`, on demand.
 ****************/
export class UIIconBrowser extends E.UIComponent<typeof iconBrowserVocabulary> {
  @E.proto static vocabulary = iconBrowserVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { iconBrowser: iconBrowserCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## The pack
  ////////////////

  /** The pack a person chose with the switch, or the address named;  `undefined`:  `pack`'s. */
  @E.state accessor chosenPack: BuiltInPack | undefined = undefined

  /** The pack shown:  the one chosen, else `pack`, else the default. */
  get packShown(): BuiltInPack {
    return this.chosenPack ?? UIIconBrowser.packFor(this.pack) ?? DEFAULT_PACK
  }

  /** The pack shown's set of packs, and its icons, once loaded;  `undefined` while it loads. */
  @E.state accessor loaded: LoadedPack | undefined = undefined

  /** Each pack's load, started once:  its own set of packs, never the page's. */
  private readonly loads = new Map<BuiltInPack, Promise<LoadedPack>>()

  /**
   * Load the pack shown (once), then show its icons.
   * - NEVER throws:  a pack that won't load shows none.
   */
  @E.onChange("packShown", "isReady")
  protected onPackShown(pack: BuiltInPack, isReady: boolean) {
    if (!isReady || isServer) return undefined
    let isCurrent = true
    this.loaded = this.loaded?.pack === pack ? this.loaded : undefined
    void this.load(pack).then((loaded) => {
      if (isCurrent) this.loaded = loaded
    })
    return () => {
      isCurrent = false
    }
  }

  /** Pack `pack`, in a set of its own over the page's (`UI.icons.scope([])`), and its icons. */
  private load(pack: BuiltInPack): Promise<LoadedPack> {
    let loading = this.loads.get(pack)
    if (!loading) {
      loading = UI.load()
        .then(async (ui) => {
          const packs = ui.icons.scope([])
          const loadedPack = await packs.use(pack, { only: true })
          return { pack, packs, choices: loadedPack ? IconCatalog.choicesOfPack(loadedPack) : [] }
        })
        .catch((error: unknown) => {
          E.Warnings.warn("<ui-icon-browser>", `can't load the icon pack "${pack}":`, error)
          return { pack, packs: undefined, choices: [] }
        })
      this.loads.set(pack, loading)
    }
    return loading
  }

  /** A person chose `pack` with the switch:  it shows, the search kept. */
  @E.untracked
  private choosePack(pack: BuiltInPack) {
    this.chosenPack = pack
  }

  ////////////////
  // ## The search
  ////////////////

  /** What's typed in the search box;  `undefined` until a person types, or the address names one. */
  @E.state accessor typed: string | undefined = undefined

  /** The search:  what's typed, else `query`. */
  get queryShown(): string {
    return this.typed ?? this.query ?? ""
  }

  /** Font Awesome's search terms, once loaded as the first search was typed. */
  @E.state accessor searchWords: IconSearchWords | undefined = undefined

  /** The pack's icons that match the search, best first;  every icon for none. */
  @E.derived({ equals: E.isSameList })
  get matches(): readonly IconChoice[] {
    return IconCatalog.matches(this.loaded?.choices ?? [], this.queryShown, this.searchWords?.terms)
  }

  /**
   * What the grid draws:  the matches, and the pack they're from.
   * - A new one (a new search or pack) is a new list, and the grid starts again at its top.
   */
  @E.derived({ equals: (a, b) => a.loaded === b.loaded && a.choices === b.choices })
  get shown(): ShownIcons {
    return { loaded: this.loaded, choices: this.matches }
  }

  /**
   * The first search loads Font Awesome's search terms (once a page), and searches again with them.
   * - NEVER throws:  terms that won't load leave names alone to match.
   */
  @E.onChange("queryShown", "isReady")
  protected onSearched(query: string, isReady: boolean) {
    if (!isReady || isServer || this.searchWords || !E.IconName.normalize(query)) return
    void IconCatalog.searchWords().then((words) => {
      this.searchWords = words
    })
  }

  /** A person typed in the search box. */
  @E.untracked
  private readonly onSearchInput = (event: Event) => {
    const value = (event as CustomEvent<{ value?: string | number }>).detail?.value
    this.typed = value === undefined ? "" : String(value)
  }

  ////////////////
  // ## The address
  ////////////////

  /**
   * With `address`, each time it connects:  the search and the pack the address names (`?q=bell&pack=fa7-brands`).
   * - A pack it doesn't ship is left alone.
   */
  @E.onChange("isConnected", "address")
  protected onAddress(isConnected: boolean, address: boolean | undefined) {
    if (!isConnected || !address || isServer) return
    const { location } = this.domElement.ownerDocument.defaultView ?? window
    const query = E.AddressParameter.textIn(location, { parameter: QUERY_PARAMETER })
    const pack = UIIconBrowser.packFor(E.AddressParameter.textIn(location, { parameter: PACK_PARAMETER }))
    if (query !== undefined) this.typed = query
    if (pack) this.chosenPack = pack
  }

  ////////////////
  // ## Copying
  ////////////////

  /** The copy:  "Copied" for a moment. */
  readonly clipboard = new E.ClipboardCopy({ seconds: COPIED_SECONDS })

  /** The name last copied, and whether it got there;  `undefined` before the first click. */
  @E.state accessor lastCopy: { name: string; isCopied: boolean } | undefined = undefined

  /**
   * A tile was clicked:  its name to the clipboard, and say so;  with `pick`, only `ui-chosen`.
   * - `ui-chosen` either way, `isCopied` saying whether the name reached the clipboard.
   */
  @E.untracked
  private async choose(name: string) {
    if (this.pick) {
      this.send("ui-chosen", { name, isCopied: false })
      return
    }
    const isCopied = await this.clipboard.copy(name)
    this.lastCopy = { name, isCopied }
    this.send("ui-chosen", { name, isCopied })
  }

  /** What the copied label says:  while a copy is fresh, or after one was refused. */
  get copyNote(): { text: string; isCopied: boolean } | undefined {
    const copy = this.lastCopy
    if (!copy || (copy.isCopied && !this.clipboard.isCopied)) return undefined
    const key = copy.isCopied ? "copied" : "notCopied"
    return { text: this.translationForKey(key, { name: copy.name }), isCopied: copy.isCopied }
  }

  ////////////////
  // ## Rendering
  ////////////////

  render(): JSX.Element {
    return (
      <div class={this.rootClass}>
        <Show when={!this.compact}>{this.packSwitch()}</Show>
        <ui-input
          ref={(input: HTMLElement) => input.addEventListener("ui-typed", this.onSearchInput)}
          part={this.partForName("search")}
          type="search"
          icon="magnifying glass"
          fluid
          value={this.queryShown}
          placeholder={this.translationForKey("searchPlaceholder")}
          aria-label={this.translationForKey("searchLabel")}
          autocomplete="off"
        />
        <Show
          when={this.compact}
          fallback={
            <ui-message part={this.partForName("usage")} size="small">
              {this.usage()}
            </ui-message>
          }
        >
          {this.packSwitch()}
        </Show>
        <ui-labels>
          <ui-label part={this.partForName("count")} appearance="basic" role="status">
            {this.countText}
          </ui-label>
          <Show when={this.copyNote}>
            {(note) => (
              <ui-label
                part={this.partForName("copied")}
                color={note().isCopied ? "green" : "red"}
                appearance="basic"
                role="status"
              >
                {note().text}
              </ui-label>
            )}
          </Show>
        </ui-labels>
        <div class={GRID} part={this.partForName("grid")} role="list" aria-label={this.translationForKey("grid")}>
          {/* a list of one, what's shown:  a new search or pack is a new one, so the grid starts again at its top */}
          <For each={[this.shown]}>
            {({ loaded, choices }) =>
              drawnInWindow({
                items: () => choices,
                drawItem: (choice) => this.tile(choice, loaded),
                atOnce: TILES_AT_ONCE
              })
            }
          </For>
        </div>
        <Show when={this.loaded && !this.matches.length}>
          <div class={UIT.MESSAGE} role="status">
            {this.translationForKey("noMatches")}
          </div>
        </Show>
      </div>
    )
  }

  /** The pack switch:  a button per pack, the one shown `primary`. */
  private packSwitch(): JSX.Element {
    return (
      <ui-buttons part={this.partForName("packs")} equal aria-label={this.translationForKey("packs")}>
        <For each={PACKS}>
          {(pack) => (
            <ui-button
              color={this.packShown === pack ? "primary" : undefined}
              selected={this.packShown === pack}
              onClick={() => this.choosePack(pack)}
            >
              {this.translationForKey(PACK_TEXTS[pack])}
            </ui-button>
          )}
        </For>
      </ui-buttons>
    )
  }

  /** What a page adds to use the pack shown:  its text, the markup and script in it drawn as code. */
  private usage(): JSX.Element {
    const pack = this.packShown
    const text = this.translationForKey(USAGE_TEXTS[pack], UIIconBrowser.usageCode(pack))
    return text.split(CODE_MARK).map((piece, at) => (at % 2 ? <code>{piece}</code> : piece))
  }

  /** The count:  "Loading icons…", then how many match, of the pack's. */
  get countText(): string {
    const loaded = this.loaded
    if (!loaded) return this.translationForKey("loading")
    return this.translationForKey("count", { matches: this.matches.length, total: loaded.choices.length })
  }

  /** One icon's tile:  its glyph over its name;  a click copies the name, its tooltip says so. */
  private tile(choice: IconChoice, loaded: LoadedPack | undefined): JSX.Element {
    const packs = loaded?.packs
    // the pack by its prefix:  its own set holds the page's packs too, under it
    const name = `${loaded?.pack}:${choice.name}`
    const glyph = packs ? new E.IconGlyph({ owner: this, packs, name: () => name }) : undefined
    const others = choice.names.filter((name) => name !== choice.name)
    const tip = others.length
      ? this.translationForKey("copyTipAlso", { name: choice.name, others: others.join(", ") })
      : this.translationForKey("copyTip", { name: choice.name })
    return (
      <ui-button
        class={TILE}
        part={this.partForName("tile")}
        appearance="basic"
        role="listitem"
        data-tooltip={tip}
        data-name={choice.name}
        onClick={() => void this.choose(choice.name)}
      >
        <span class={GLYPH} part={this.partForName("glyph")} aria-hidden="true">
          {glyph?.svg}
        </span>
        <span class={NAME} part={this.partForName("name")}>
          {choice.name}
        </span>
      </ui-button>
    )
  }

  ////////////////
  // ## Statics
  ////////////////

  /** The code a usage line names, for `pack`, each piece marked (`CODE_MARK`). */
  private static usageCode(pack: BuiltInPack): Record<string, string> {
    const code = (text: string) => `${CODE_MARK}${text}${CODE_MARK}`
    return {
      markup: code(`<ui-root icons="${pack}">`),
      script: code(`UI.icons.use("${pack}")`),
      examples: `${code("x")}, ${code("warning")}`
    }
  }

  /**
   * Every icon in a dialog over the page:  a `compact` browser in a `<ui-modal>`, its search focused on top.
   * - To COPY (the default):  a click copies the icon's name and says so in a toast;  the dialog stays open.
   * - To PICK (`pick`):  a click closes it, and the promise has that name;  `undefined` when closed without one
   *   (`<ui-icon-picker>`'s Browse).
   * - Loads the dialog's family (and the toast's, to copy) itself, the first time:
   *   a page that never opens one never downloads them.
   * - SIDE EFFECT:  the dialog is added to `<body>`, and removed once it has closed.
   */
  static async openInDialog({ pick = false, query }: { pick?: boolean; query?: string } = {}): Promise<
    string | undefined
  > {
    const [{ UIModal }, ui] = await Promise.all([
      import("spell/ui/components/ui-modal"),
      UI.load(),
      // to copy:  the toast that says so
      pick ? undefined : import("spell/ui/components/ui-toast")
    ])
    const browserTag = UIIconBrowser.vocabulary.tag
    const modal = document.createElement(UIModal.vocabulary.tag) as HTMLElement & { visible: boolean }
    modal.setAttribute("size", DIALOG_SIZE)
    modal.setAttribute("closable", "")
    modal.setAttribute("closedby", "closerequest")
    modal.setAttribute(UIT.HEADING, ui.i18n.t("dialogTitle", undefined, browserTag))
    const browser = document.createElement(browserTag) as E.DOMElement<UIIconBrowser>
    browser.setAttribute("compact", "")
    if (pick) browser.setAttribute("pick", "")
    if (query) browser.setAttribute("query", query)
    // in the dialog's content box, as every dialog's body is:  its padding, its scrolling (`ui-parts`, which the dialog's family loads)
    const content = document.createElement(UIIconBrowser.tagFor(ui, UIT.CONTENT))
    content.append(browser)
    modal.append(content)
    document.body.append(modal)
    modal.visible = true
    // the search takes the keys at once:  type to find, as the picker's panel does
    void browser.ready.then(() => browser.shadowRoot?.querySelector<HTMLElement>("[part~=search]")?.focus())
    return new Promise((resolve) => {
      let picked: string | undefined
      browser.addEventListener("ui-chosen", (event) => {
        const { name, isCopied } = (event as CustomEvent<UIT.IconBrowserChosenDetail>).detail
        if (pick) {
          picked = name
          modal.visible = false
          return
        }
        const said = browser.component?.copyNote?.text
        if (said) ui.toast({ message: said, class: isCopied ? "success" : "error", displayTime: TOAST_MS })
      })
      modal.addEventListener(
        "ui-closed",
        () => {
          modal.remove()
          resolve(picked)
        },
        { once: true }
      )
    })
  }

  /** The tag of the part whose class noun is `noun` (`content` => `<ui-content>`), as this page names it. */
  private static tagFor(ui: typeof UI, noun: string): string {
    for (const vocabulary of ui.vocabulary.vocabularies.values()) if (vocabulary.noun === noun) return vocabulary.tag
    return `ui-${noun}`
  }

  /** `text` when it's a pack Spell UI ships;  else `undefined`. */
  static packFor(text: string | null | undefined): BuiltInPack | undefined {
    return (PACKS as readonly (string | null | undefined)[]).includes(text) ? (text as BuiltInPack) : undefined
  }
}

export interface UIIconBrowser extends E.AttributeValues<typeof iconBrowserVocabulary> {}

/** A pack Spell UI ships, as `pack` names it. */
type BuiltInPack = (typeof iconBrowserVocabulary.attributes)[0]["values"][number]

/** A pack, loaded:  its own set of packs to draw from, and its icons. */
type LoadedPack = {
  /** which */
  readonly pack: BuiltInPack
  /** its set of packs, over the page's;  `undefined` when it wouldn't load */
  readonly packs: E.IconPacks | undefined
  /** its icons, A-Z (`IconCatalog.choicesOfPack()`) */
  readonly choices: readonly IconChoice[]
}

/** What the grid draws (`shown`). */
type ShownIcons = {
  /** the pack they're from;  `undefined` while it loads */
  readonly loaded: LoadedPack | undefined
  /** the icons that match, best first */
  readonly choices: readonly IconChoice[]
}

/** The packs, in the switch's order. */
const PACKS = iconBrowserVocabulary.attributes[0].values

/** The pack shown when `pack` says none. */
const DEFAULT_PACK: BuiltInPack = iconBrowserVocabulary.attributes[0].default

/** Each pack's button. */
const PACK_TEXTS = { "fa7-free": "packFree", "fa7-brands": "packBrands", fomantic: "packFomantic" } as const

/** What each pack's usage line says. */
const USAGE_TEXTS = { "fa7-free": "usageFree", "fa7-brands": "usageBrands", fomantic: "usageFomantic" } as const

/** Marks the code in a usage line, around each piece, so `usage()` can split it out. */
const CODE_MARK = "\u0001"

/** The address's search:  `?q=bell`. */
const QUERY_PARAMETER = "q"

/** The address's pack:  `?pack=fa7-brands`. */
const PACK_PARAMETER = "pack"

/** How many tiles the grid draws at a time, as its end scrolls near. */
const TILES_AT_ONCE = 120

/** How long the copied label stays, in seconds. */
const COPIED_SECONDS = 4

/** `openInDialog()`'s dialog:  wide enough for several columns of tiles. */
const DIALOG_SIZE = "large"

/** `openInDialog()`'s toast after a copy, in ms. */
const TOAST_MS = 2000

/** Class of the grid. */
const GRID = "grid"

/** Class of each tile. */
const TILE = "tile"

/** Class of a tile's glyph box. */
const GLYPH = "glyph"

/** Class of a tile's name. */
const NAME = "name"
