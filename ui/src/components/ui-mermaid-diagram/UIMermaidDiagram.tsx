import { For, Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

// Import directly:  in `core`'s util barrel the pref store cost every page 1.9 kB
import { PrefStore } from "spell/util/persist/PrefStore"
import { ColorScheme } from "spell/util/persist/ColorScheme"
import { E, UI, UIT } from "spell/ui/core"
// Import directly:  the one door to ELK, in no barrel (its header says why)
import { ElkEngine } from "spell/ui/util/ElkEngine"
import { mermaidDiagramVocabulary } from "./UIMermaidDiagram.en"
import { MermaidDrawer } from "./MermaidDrawer"
import {
  DEFAULT_MERMAID_THEME,
  MermaidSchemes,
  MermaidThemeNames,
  type MermaidLook,
  type SpellThemeScheme
} from "spell/util/diagram/MermaidThemes"
import type { DiagramIcon, MermaidPicks, MermaidProblemCause } from "./UIMermaidDiagram.types"

import mermaidDiagramCSS from "./UIMermaidDiagram.css?inline"

/****************
 * ### `DOMMermaidDiagramElement`
 * The DOM element of `<ui-mermaid-diagram>`:
 * it adds the drawing's read-only script API to the source API it inherits from `DOMLoadableElement`
 * (`content`, `loaded` ...):  `svg`, `diagramType`, `error`;  and `putBack()`.
 * - Above the component:  its `elementSetup` reads this class while the component is defined.
 ****************/
export class DOMMermaidDiagramElement extends E.DOMLoadableElement<UIMermaidDiagram> {
  /** The drawing as SVG text, for copying or saving;  `""` before the first drawing.  Untracked:  it's for scripts. */
  @E.untracked
  get svg(): string {
    return this.component?.drawn?.svg ?? ""
  }

  /** What Mermaid read the text as (`flowchart-v2`, `sequence` ...);  `undefined` before the first drawing. */
  @E.untracked
  get diagramType(): string | undefined {
    return this.component?.drawn?.diagramType
  }

  /** What went wrong, as the message says it;  `undefined` while the text draws. */
  @E.untracked
  get error(): string | undefined {
    return this.component?.errorText
  }

  /** Forget the reader's picks from the menu:  the attributes' theme and light or dark again. */
  putBack() {
    this.component?.putBack()
  }
}

/****************
 * ### `UIMermaidDiagram`
 * The component behind `<ui-mermaid-diagram>`:  a diagram drawn from Mermaid text.
 *
 * - Its shadow DOM:  `<div class="ui mermaid diagram" part="drawing" role="img" aria-label>` holding Mermaid's
 *   `<svg>`;  with `controls`, a `<ui-dropdown part="controls">` in the corner.
 * - The text:  the element's own (`<script type="text/mermaid">` keeps `<` and `&` exact),
 *   or a `source` file (see `LoadableComponent`);  it redraws when either changes.
 * - Mermaid loads on the first draw (`MermaidDrawer` -> `MermaidEngine`, the lazy chunk):  a page without a drawing
 *   pays nothing.
 * - Its colours:  `theme`, else `spell` (Spell UI's tokens, read from the page);  light or dark:  `scheme`, else
 *   the page's, redrawn when the page switches or wears another theme.
 *   - A reader's picks from the menu win over both (`controls`), kept under `remember` (`PrefStore`).
 * - Draws are numbered:  one finishing after a newer one started is thrown away.
 * - Bad text:  the message says the line Mermaid stopped at and what it expected,
 *   over the last good drawing, dimmed;  fixing the text brings the drawing back.
 * - Icons in the text are the page's own (`UI.icons`), drawn as SVG:  no Font Awesome sheet needed.
 * - ELK:  warmed up beside Mermaid when the drawing will be laid out with it (`ElkEngine`, the one copy a page).
 ****************/
export class UIMermaidDiagram extends E.LoadableComponent<typeof mermaidDiagramVocabulary> {
  @E.proto static vocabulary = mermaidDiagramVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { mermaidDiagram: mermaidDiagramCSS },
    DOMElement: DOMMermaidDiagramElement,
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## The drawing
  ////////////////

  /** The last good drawing, and what Mermaid read the text as;  kept while newer text doesn't draw. */
  @E.state accessor drawn: { svg: string; diagramType: string } | undefined = undefined

  /** A drawing is on its way:  `:state(drawing)`. */
  @E.cssState("drawing")
  @E.state
  accessor isDrawing = false

  /** Why the text didn't draw, as Mermaid said;  `undefined` while it draws. */
  @E.state accessor problem: MermaidProblemCause | undefined = undefined

  /** Draws started;  only the latest one's drawing is shown. */
  private ticket = 0

  /** The text and settings last drawn (or tried):  the same again draws nothing. */
  private lastDrawn: string | undefined

  /** Draw when the text, the settings or the page's look change, once the text is there. */
  @E.onChange("textToShow", "loadStatus", "drawKey")
  protected onDiagramChanged(text: string, status: E.SourceStatus, key: string) {
    const canDraw = status === E.SourceStatus.loaded || (status === E.SourceStatus.error && !!this.problem)
    // the page's light or dark is read once connected (`watchPage()`):  draw with it, not before
    if (!canDraw || isServer || !this.pageLook || `${key}\n${text}` === this.lastDrawn) return
    this.lastDrawn = `${key}\n${text}`
    void this.draw(text)
  }

  /** Everything a drawing depends on but its text, as one string:  a change to any draws again. */
  get drawKey(): string {
    return [this.shownTheme, this.shownScheme, this.look, this.layout, this.seed, this.pageLook].join(" ")
  }

  /** Draw `text`;  `ui-drawn` when done, the error message when Mermaid can't. */
  @E.untracked
  private async draw(text: string) {
    const ticket = ++this.ticket
    this.isDrawing = true
    try {
      const ui = await UI.load()
      const engine = await MermaidDrawer.load()
      if (ticket !== this.ticket) return
      if (this.usesElk(text)) ElkEngine.load().catch(() => undefined)
      const icons = await this.iconsFor(engine.iconsIn(text), ui)
      if (ticket !== this.ticket) return
      const config = MermaidDrawer.configFor(this.probe, this.drawSettings)
      const drawn = await engine.instance.draw(text, { config, icons })
      if (ticket !== this.ticket) return
      this.drawn = drawn
      this.problem = undefined
      if (this.loadStatus === E.SourceStatus.error) {
        this.loadStatus = E.SourceStatus.loaded
        this.loadError = undefined
      }
      this.send("ui-drawn", { diagramType: drawn.diagramType })
    } catch (error) {
      if (ticket !== this.ticket) return
      this.problem = (error as { cause?: MermaidProblemCause }).cause ?? { kind: "render", error }
      this.onLoadError(error, "render")
    } finally {
      if (ticket === this.ticket) this.isDrawing = false
    }
  }

  /** What the drawing is drawn with now:  the settled theme and scheme, and the attributes. */
  private get drawSettings() {
    return {
      theme: this.shownTheme,
      scheme: this.shownScheme,
      look: (this.look ?? "classic") as MermaidLook,
      layout: this.layout,
      seed: this.seed ?? DEFAULT_SEED
    }
  }

  /**
   * Will this drawing be laid out by ELK?  `layout="elk"`, or `auto` for a kind Mermaid lays out with it.
   * - Then ELK loads beside Mermaid, through the one loader, rather than after it.
   */
  private usesElk(text: string): boolean {
    if (this.layout === ELK) return true
    return (this.layout ?? "auto") === "auto" && ELK_KINDS.test(text.replace(FRONT_MATTER, "").trimStart())
  }

  /**
   * `icons` with their `<svg>`s, each from the packs this element draws from (`UI.icons`, or its root's):
   * the same names, packs and cache as `<ui-icon>`.
   * - One a pack doesn't have:  a warning naming it;  Mermaid draws an empty space.
   */
  private async iconsFor(icons: DiagramIcon[], ui: { icons: E.IconPacks }): Promise<DiagramIcon[]> {
    if (!icons.length) return icons
    const packs = E.IconGlyph.packsFor(this.domElement, ui.icons)
    return Promise.all(
      icons.map(async (icon) => {
        const svg = await packs.get(icon.pageName)
        if (!svg) E.Warnings.warn(WARNING_SOURCE, `no icon "${icon.pageName}" for ${icon.prefix}:${icon.name}`)
        return { ...icon, svg }
      })
    )
  }

  ////////////////
  // ## Colours and light or dark
  ////////////////

  /**
   * The theme asked for:  the reader's pick, else `theme`, else `spell`.
   * - `theme` as written, not its checked value:  an unknown one reaches `MermaidDrawer`, which warns naming the
   *   ones it knows, and draws `spell`.
   */
  get shownTheme(): string {
    return this.picks.theme ?? this.attributes.theme ?? DEFAULT_MERMAID_THEME
  }

  /** Light or dark, settled:  the reader's pick, else `scheme`, else what the page shows. */
  get shownScheme(): SpellThemeScheme {
    const asked = this.picks.scheme ?? this.scheme ?? "auto"
    return asked === "light" || asked === "dark" ? asked : this.pageScheme
  }

  /** Is it drawn dark?  `:state(dark)`. */
  @E.cssState("dark")
  get isDrawnDark(): boolean {
    return this.shownScheme === "dark"
  }

  /**
   * Is it drawn in the other scheme than the page's (`scheme`, or the reader's pick)?
   * - Then its box wears that scheme's background:  Spell's dark colours are made to sit on a dark page.
   */
  get isHeld(): boolean {
    return this.shownScheme !== this.pageScheme
  }

  /** What the page shows around the element, light or dark;  read again on `pageLook`'s changes. */
  @E.state accessor pageScheme: SpellThemeScheme = "light"

  /** Bumped when the page may look different (a theme worn, light or dark switched):  `spell` is read again. */
  @E.state accessor pageLook = 0

  /** An empty `<span>` in the shadow root that Spell UI's tokens are read on, made on first use. */
  @E.lazy private get probe(): HTMLElement {
    const probe = this.domElement.ownerDocument.createElement("span")
    probe.hidden = true
    this.domElement.renderRoot.append(probe)
    return probe
  }

  /** Read the page's light or dark again, and draw again when it may have changed. */
  @E.untracked
  private onPageLookChanged() {
    this.pageScheme = MermaidDrawer.schemeOf(this.probe)
    this.pageLook += 1
  }

  /**
   * Follow the page's look while connected:
   * - a theme worn (`UIT.THEME_APPLIED_EVENT`, once its sheets are on)
   * - the OS switching light or dark, or another tab choosing (`ColorScheme.watch()`)
   * - this page switching:  every switch shows on `<html>` (`ColorScheme.apply()`, the editor's own switch)
   */
  @E.whileConnected
  protected watchPage(): () => void {
    const document = this.domElement.ownerDocument
    E.afterSolidUpdate(() => this.onPageLookChanged())
    const onChange = () => this.onPageLookChanged()
    document.addEventListener(UIT.THEME_APPLIED_EVENT, onChange)
    const stopScheme = ColorScheme.watch(onChange)
    // oxlint-disable-next-line spell-ui/no-mutation-observer -- watches <html>, where every light / dark switch shows
    const observer = new MutationObserver(onChange)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: PAGE_LOOK_ATTRIBUTES })
    return () => {
      document.removeEventListener(UIT.THEME_APPLIED_EVENT, onChange)
      stopScheme()
      observer.disconnect()
    }
  }

  ////////////////
  // ## The reader's picks
  ////////////////

  /** The reader's picks from the menu, as kept for this drawing. */
  @E.state accessor picks: MermaidPicks = isServer ? {} : this.keptPicks()

  /** Pick theme `theme` for this drawing, for this reader;  kept. */
  @E.untracked
  pickTheme(theme: string) {
    this.keepPicks({ ...this.picks, theme })
  }

  /** Pick light, dark or `auto` (like the page) for this drawing, for this reader;  kept. */
  @E.untracked
  pickScheme(scheme: string) {
    this.keepPicks({ ...this.picks, scheme })
  }

  /** Forget the reader's picks:  the attributes' theme and light or dark again. */
  @E.untracked
  putBack() {
    this.keepPicks({})
  }

  /** Show `picks`, and keep them under the drawing's key;  none:  forgotten. */
  private keepPicks(picks: MermaidPicks) {
    this.picks = picks
    const key = this.memoryKey
    if (picks.theme === undefined && picks.scheme === undefined) UIMermaidDiagram.store.forget(key)
    else UIMermaidDiagram.store.set(key, picks)
  }

  /** The picks kept under the drawing's key;  none when nothing was kept. */
  private keptPicks(): MermaidPicks {
    const kept = UIMermaidDiagram.store.get(this.memoryKey)
    if (!kept || typeof kept !== "object") return {}
    const { theme, scheme } = kept as Record<string, unknown>
    return {
      ...(typeof theme === "string" && { theme }),
      ...(typeof scheme === "string" && { scheme })
    }
  }

  /**
   * The key the picks are kept under:  `remember`;
   * else the page's address and the drawing's `id`, else its `source`, else its place among the page's drawings.
   */
  private get memoryKey(): string {
    if (this.remember) return this.remember
    const domElement = this.domElement
    const document = domElement.ownerDocument
    const place =
      domElement.id || this.source || String([...document.querySelectorAll(domElement.localName)].indexOf(domElement))
    return `${document.location?.pathname ?? ""}#${place}`
  }

  /** Where every drawing keeps its reader's picks:  `ui-mermaid-diagram:<key>`. */
  private static get store(): PrefStore {
    return (UIMermaidDiagram.prefs ??= new PrefStore(PREF_STORE))
  }
  private static prefs: PrefStore | undefined

  ////////////////
  // ## Errors and names
  ////////////////

  /**
   * The error message, one thing a line:  that it couldn't be drawn, the line with the mistake, what may be missing
   * there, and that fixing it brings the drawing back;  or, for text of no kind, how to start it.
   */
  override get errorText(): string | undefined {
    const problem = this.problem
    if (!problem || !this.loadError) return super.errorText
    const lines = [this.translationForKey("mermaidCantDraw")]
    if (problem.isUnknownKind) lines.push(this.translationForKey("mermaidUnknownKind"))
    else {
      if (problem.line !== undefined) lines.push(this.translationForKey("mermaidStoppedAt", { line: problem.line }))
      if (problem.expected?.length) {
        const or = ` ${this.translationForKey("mermaidOr")} `
        lines.push(this.translationForKey("mermaidExpected", { expected: problem.expected.join(or) }))
      }
      if (problem.line !== undefined) lines.push(this.translationForKey("mermaidFixIt"))
    }
    return lines.join("\n")
  }

  /**
   * What a screen reader says for the drawing:  `label`;  else the title in the diagram's own text
   * (`accTitle`, or a `title`);  else its kind ("Flowchart diagram").
   */
  get accessibleName(): string {
    if (this.label) return this.label
    const text = this.textToShow
    const title = ACC_TITLE.exec(text)?.[1] ?? TITLE.exec(text)?.[1]
    if (title) return title.trim()
    const kind = UIMermaidDiagram.kindName(this.drawn?.diagramType ?? KIND_WORD.exec(text.trimStart())?.[0] ?? "")
    return this.translationForKey("mermaidLabel", { kind })
  }

  /**
   * A diagram type as people say it:  `flowchart-v2` => `Flowchart`, `sequenceDiagram` => `Sequence`.
   * - Static:  pure.
   */
  private static kindName(type: string): string {
    const words = type
      .replace(/-v\d+$|-beta$|Diagram$/i, "")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[-_]/g, " ")
      .trim()
    return words ? words[0].toUpperCase() + words.slice(1).toLowerCase() : DEFAULT_KIND
  }

  ////////////////
  // ## Rendering
  ////////////////

  protected renderContent(): JSX.Element {
    return (
      <div
        class={[DIAGRAM_CLASS, { [HELD_CLASS]: this.isHeld }]}
        part={this.partForName("drawing")}
        style={{ "color-scheme": this.shownScheme }}
      >
        <div
          class={[DRAWING_CLASS, { [STALE_CLASS]: this.hasError }]}
          role="img"
          aria-label={this.accessibleName}
          innerHTML={this.drawn?.svg ?? ""}
        />
        <Show when={this.controls}>{this.menu()}</Show>
      </div>
    )
  }

  /**
   * The menu in the corner:  the themes (Spell's first), light, dark or like the page, then Put back.
   * - A `<ui-dropdown>` with an icon for its button, shown on hover after `--ui-hover-delay`, at once by keyboard
   *   (`UIMermaidDiagram.css`).
   * - Each pick is a value (`theme:forest`, `scheme:dark`, `put-back`);  the dropdown holds none, so any pick sends.
   */
  private menu(): JSX.Element {
    const label = this.translationForKey("mermaidMenu")
    return (
      <ui-dropdown
        part={this.partForName("controls")}
        class={CONTROLS_CLASS}
        floating=""
        button=""
        padding="compact"
        size="small"
        direction="left"
        aria-label={label}
        title={label}
        ref={(dropdown: HTMLElement) => dropdown.addEventListener("ui-changed", (event) => this.onMenuPick(event))}
      >
        <span slot="trigger">
          <ui-icon name={MENU_ICON} aria-hidden="true" padding="none"></ui-icon>
        </span>
        <ui-item kind="header">{this.translationForKey("mermaidColors")}</ui-item>
        <For each={MermaidThemeNames}>
          {(theme) => (
            <ui-item value={`${THEME_PICK}${theme}`} icon={this.shownTheme === theme ? CHECK_ICON : undefined}>
              {theme === DEFAULT_MERMAID_THEME ? this.translationForKey("mermaidSpellTheme") : theme}
            </ui-item>
          )}
        </For>
        <ui-item kind="divider"></ui-item>
        <ui-item kind="header">{this.translationForKey("mermaidLightOrDark")}</ui-item>
        <For each={MermaidSchemes}>
          {(scheme) => (
            <ui-item
              value={`${SCHEME_PICK}${scheme}`}
              icon={(this.picks.scheme ?? this.scheme ?? "auto") === scheme ? CHECK_ICON : undefined}
            >
              {this.translationForKey(SCHEME_TEXTS[scheme])}
            </ui-item>
          )}
        </For>
        <ui-item kind="divider"></ui-item>
        <ui-item value={PUT_BACK}>{this.translationForKey("mermaidPutBack")}</ui-item>
      </ui-dropdown>
    )
  }

  /** A pick from the menu:  stop its `ui-changed` (it's the menu's, not the drawing's), and act on it. */
  private onMenuPick(event: Event) {
    event.stopPropagation()
    const dropdown = event.currentTarget as HTMLElement & { value: string }
    const { value } = (event as CustomEvent<{ value: string }>).detail
    dropdown.value = ""
    if (value === PUT_BACK) this.putBack()
    else if (value.startsWith(THEME_PICK)) this.pickTheme(value.slice(THEME_PICK.length))
    else if (value.startsWith(SCHEME_PICK)) this.pickScheme(value.slice(SCHEME_PICK.length))
  }
}

/** The vocabulary getters, typed (`UIComponent`'s doc). */
export interface UIMermaidDiagram extends E.AttributeValues<typeof mermaidDiagramVocabulary> {}

/** `seed` when none is given:  fixed, so a hand-drawn drawing doesn't wobble each redraw. */
const DEFAULT_SEED = 1

/** `layout`'s ELK. */
const ELK = "elk"

/** The kinds Mermaid lays out with ELK by itself (`layout="auto"`):  by the text's first word. */
const ELK_KINDS = /^(flowchart|graph|stateDiagram|classDiagram|erDiagram)\b/

/** A front-matter block at the top of the text (`---` ... `---`). */
const FRONT_MATTER = /^\s*---\n[\s\S]*?\n---\s*\n/

/** The diagram's first word, its kind, when it hasn't been drawn yet. */
const KIND_WORD = /^[A-Za-z-]+/

/** An `accTitle:` line:  its title. */
const ACC_TITLE = /^\s*accTitle\s*:\s*(.+)$/m

/** A `title` line, or front matter's `title:`:  its title. */
const TITLE = /^\s*title\s*:?\s+(.+)$/m

/** A kind's name when the text names none. */
const DEFAULT_KIND = "Mermaid"

/** `<html>`'s attributes a light / dark switch writes:  its classes and its inline `color-scheme`. */
const PAGE_LOOK_ATTRIBUTES = ["class", "style"]

/** Where the reader's picks are kept:  `ui-mermaid-diagram:<key>`. */
const PREF_STORE = "ui-mermaid-diagram"

/** Class of the box around the drawing and the menu. */
const DIAGRAM_CLASS = "ui mermaid diagram"

/** Class of the box while it's drawn in the other scheme than the page's:  it wears that scheme's background. */
const HELD_CLASS = "held"

/** Class of the box holding the `<svg>`. */
const DRAWING_CLASS = "drawing"

/** Class of the drawing while the text doesn't draw:  dimmed under the message. */
const STALE_CLASS = "stale"

/** Class of the menu in the corner. */
const CONTROLS_CLASS = "controls"

/** The menu button's icon. */
const MENU_ICON = "palette"

/** The mark beside the theme and scheme shown. */
const CHECK_ICON = "check"

/** A theme pick's value:  this, then the theme. */
const THEME_PICK = "theme:"

/** A scheme pick's value:  this, then the scheme. */
const SCHEME_PICK = "scheme:"

/** Put back's value. */
const PUT_BACK = "put-back"

/** Each scheme's words in the menu. */
const SCHEME_TEXTS = { auto: "mermaidAuto", light: "mermaidLight", dark: "mermaidDark" } as const

/** `Warnings` source of this class's warnings. */
const WARNING_SOURCE = "<ui-mermaid-diagram>"
