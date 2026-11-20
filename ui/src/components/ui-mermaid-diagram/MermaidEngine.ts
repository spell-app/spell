import mermaid, { type MermaidConfig } from "mermaid"

// Import directly:  the lazy chunk takes the one error class it throws from `core`'s own file (see `MarkdownEngine`)
import { SourceError } from "spell/ui/runtime/runtime.types"
import type { DiagramIcon, DrawnDiagram, MermaidDrawRequest, MermaidProblemCause } from "./UIMermaidDiagram.types"

/****************
 * ### `MermaidEngine`
 * Mermaid, in `<ui-mermaid-diagram>`'s LAZY chunk:  the ONLY file that imports Mermaid,
 * loaded on the first draw (`MermaidDrawer.load()`), so a page pays for it only when it draws a diagram.
 * - Mermaid splits itself by kind of diagram:  a page with one flowchart loads the flowchart's part, not all of them.
 * - Started once, with no drawing on load, and in Mermaid's STRICT security level:
 *   HTML in labels is shown as text, and clicks that would run code are off.
 * - Each draw:  check the text (`parse()`, which throws a readable error), then draw it (`render()`) under a new id.
 * - ONE draw at a time:  Mermaid's settings are page-wide, so each draw sets them, then draws, before the next starts.
 * - Icons:  `iconsIn()` finds the names a text uses;  the element fetches them from the page's packs
 *   (`UI.icons`) and hands them in, and `draw()` gives them to Mermaid as Iconify packs, under the prefixes the text
 *   used (`fa:fa-car`'s `fa`, `fa7-free:car`'s `fa7-free`).  A text with none fetches none.
 * - ELK:  Mermaid's own lazy file imports `elkjs/lib/elk.bundled.js`, the same file Spell UI's `ElkEngine` does,
 *   so the bundler makes them one chunk.
 * - Knows nothing of the element:  settings in, SVG text out.
 ****************/
export class MermaidEngine {
  /** The one engine:  static, as Mermaid itself is one per page. */
  static readonly instance = new MermaidEngine()

  /** Draws so far, for each drawing's unique id. */
  private count = 0

  /** The draw running now:  the next waits for it. */
  private queue: Promise<unknown> = Promise.resolve()

  /** Icons given to Mermaid so far, by prefix:  a new draw adds to them, so an earlier drawing's stay. */
  private readonly packs = new Map<string, Record<string, IconifyIcon>>()

  /**
   * `text` drawn with `request`'s settings and icons.
   * - Throws a `SourceError` (`render`) when Mermaid can't read the text:
   *   its `cause` has the `line` it stopped at and what it `expected`, when Mermaid said.
   */
  draw(text: string, request: MermaidDrawRequest): Promise<DrawnDiagram> {
    const drawn = this.queue.then(() => this.drawNow(text, request))
    this.queue = drawn.catch(() => undefined)
    return drawn
  }

  /** `draw()`, now that no other draw is running. */
  private async drawNow(text: string, { config, icons }: MermaidDrawRequest): Promise<DrawnDiagram> {
    mermaid.initialize({ ...(config as MermaidConfig), ...FIXED_SETTINGS })
    if (icons.length) this.register(icons)
    try {
      await mermaid.parse(text)
      const id = `${ID_PREFIX}${++this.count}`
      const { svg, diagramType } = await mermaid.render(id, text)
      return { svg, diagramType }
    } catch (error) {
      throw MermaidEngine.problemFor(error)
    }
  }

  ////////////////
  // ## Icons
  ////////////////

  /**
   * The icons `text` names, each once:
   * - Font Awesome's flowchart spelling, `fa:fa-car` (also `fab`, `far`, `fas`, `fal`, `fak`)
   * - a pack and a name, in an icon shape (`@{ icon: "fa7-free:car" }`) or an architecture diagram
   *   (`service db(fa7-free:database)[Database]`)
   * - Static:  pure text.
   */
  static iconsIn(text: string): DiagramIcon[] {
    const found = new Map<string, DiagramIcon>()
    for (const [, prefix, name] of text.matchAll(FONT_AWESOME_ICON)) {
      found.set(`${prefix}:${name}`, { prefix, name, pageName: MermaidEngine.pageNameFor(prefix, name) })
    }
    for (const match of text.matchAll(PACK_ICON)) {
      const prefix = match[1] ?? match[3]
      const name = match[2] ?? match[4]
      const pageName = FONT_AWESOME_PREFIX.test(prefix) ? MermaidEngine.pageNameFor(prefix, name) : `${prefix}:${name}`
      found.set(`${prefix}:${name}`, { prefix, name, pageName })
    }
    return [...found.values()]
  }

  /**
   * The page's name for Font Awesome's `prefix:fa-name`:  the plain name (`fa`, `fas` ...), its outline for `far`
   * (`heart outline`), the brand's for `fab` (`github`).
   * - Static:  pure.
   */
  private static pageNameFor(prefix: string, name: string): string {
    return prefix === "far" ? `${name} outline` : name
  }

  /** Hand `icons` to Mermaid, each pack whole, its earlier icons kept. */
  private register(icons: DiagramIcon[]) {
    const changed = new Set<string>()
    for (const icon of icons) {
      if (!icon.svg) continue
      const pack = this.packs.get(icon.prefix) ?? {}
      pack[icon.name] = MermaidEngine.iconifyOf(icon.svg)
      this.packs.set(icon.prefix, pack)
      changed.add(icon.prefix)
    }
    mermaid.registerIconPacks(
      [...changed].map((prefix) => ({ name: prefix, icons: { prefix, icons: this.packs.get(prefix)! } }))
    )
  }

  /**
   * `svg` in Iconify's shape:  its inner markup, and its size from its view box.
   * - Its root's paint (`fill`, `stroke` ...) moves onto a `<g>` around the markup, as Iconify keeps only the inside:
   *   a Font Awesome icon keeps `currentColor`, a stroked set keeps `fill: none`.
   * - Static:  pure.
   */
  private static iconifyOf(svg: SVGSVGElement): IconifyIcon {
    const [, , width = DEFAULT_ICON_SIZE, height = DEFAULT_ICON_SIZE] = (svg.getAttribute("viewBox") ?? "")
      .trim()
      .split(/[\s,]+/)
      .map(Number)
    const paint = ROOT_PAINT.flatMap((name) => {
      const value = svg.getAttribute(name)
      return value === null ? [] : [`${name}="${value.replace(/"/g, "&quot;")}"`]
    })
    const body = [...svg.childNodes].map((node) => (node as Element).outerHTML ?? "").join("")
    return { body: paint.length ? `<g ${paint.join(" ")}>${body}</g>` : body, width, height }
  }

  ////////////////
  // ## Errors
  ////////////////

  /**
   * Mermaid's `error` as a `render` `SourceError`, with the line it stopped at and what it expected, when it said.
   * - Mermaid's older parsers (flowcharts, sequence ...) say both in `error.hash`, line counted from 0;
   *   the newer ones say the line in their message.
   * - Static:  pure.
   */
  private static problemFor(error: unknown): SourceError {
    const said = error instanceof Error ? error.message : String(error)
    const hash = (error as { hash?: MermaidErrorHash } | undefined)?.hash
    const lineIndex = hash?.loc?.first_line ?? (hash?.line === undefined ? undefined : hash.line + 1)
    const line = lineIndex ?? MermaidEngine.lineIn(said)
    const expected = MermaidEngine.readableTokens(hash?.expected ?? [])
    const isUnknownKind = (error as Error | undefined)?.name === UNKNOWN_DIAGRAM_ERROR
    const cause: MermaidProblemCause = { kind: "render", error, line, expected, isUnknownKind }
    return new SourceError(`MermaidEngine.draw():  Mermaid couldn't draw the text:  ${said}`, { cause })
  }

  /**
   * Mermaid's expected tokens as a reader would type them, quoted, each once, the first few:
   * its grammar's names become their characters (`SQE` => `"]"`);  a name with no characters (`NODE_STRING`) is
   * dropped, so the message never shows the grammar's words.
   * - `undefined` when none is left.
   * - Static:  pure.
   */
  private static readableTokens(tokens: string[]): string[] | undefined {
    const readable = new Set<string>()
    for (const token of tokens) {
      const literal = /^'(.+)'$/.exec(token)?.[1]
      const typed = literal && !GRAMMAR_NAME.test(literal) ? literal : TOKEN_CHARACTERS[literal ?? token]
      if (typed) readable.add(`"${typed}"`)
      if (readable.size === MAX_EXPECTED) break
    }
    return readable.size ? [...readable] : undefined
  }

  /** The line number `message` names (`... at line 3 ...`), if it names one.  Static:  pure. */
  private static lineIn(message: string): number | undefined {
    const match = LINE_IN_MESSAGE.exec(message)
    return match ? Number(match[1]) : undefined
  }
}

/** One icon in Iconify's shape, as Mermaid takes it. */
type IconifyIcon = { body: string; width: number; height: number }

/** What Mermaid's older parsers put on their errors. */
type MermaidErrorHash = { line?: number; loc?: { first_line?: number }; expected?: string[] }

/** Settings every draw has, whatever the element asks:  no drawing on load, strict, no "bomb" picture on errors. */
const FIXED_SETTINGS = {
  startOnLoad: false,
  securityLevel: "strict",
  suppressErrorRendering: true
} as const satisfies MermaidConfig

/** The start of each drawing's id:  Mermaid scopes its styles under it. */
const ID_PREFIX = "ui-mermaid-diagram-"

/** Font Awesome's flowchart spelling, `fa:fa-car`:  its prefix and name, as Mermaid matches it. */
const FONT_AWESOME_ICON = /(fa[bklrs]?):fa-([\w-]+)/g

/** A Font Awesome prefix, which the page's own Font Awesome names answer. */
const FONT_AWESOME_PREFIX = /^fa[bklrs]?$/

/**
 * A pack and a name:  in an icon shape (`icon: "pack:name"`), or an architecture diagram's `(pack:name)`.
 * - Groups 1 and 2 for the first, 3 and 4 for the second.
 */
const PACK_ICON =
  /\bicon\s*:\s*["']?([a-z0-9]+(?:-[a-z0-9]+)*):([a-z0-9]+(?:-[a-z0-9]+)*)|\(([a-z0-9]+(?:-[a-z0-9]+)*):([a-z0-9]+(?:-[a-z0-9]+)*)\)/g

/** The paint a root `<svg>` may carry, moved onto the icon's `<g>`. */
const ROOT_PAINT = ["fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "style"] as const

/** An icon's size when its `<svg>` has no view box. */
const DEFAULT_ICON_SIZE = 512

/** A grammar's name for a token, not its characters:  `SQE`, `NODE_STRING`. */
const GRAMMAR_NAME = /^[A-Z][A-Z_]*$/

/**
 * Mermaid's grammar names for the tokens a half-typed diagram most often lacks, as their characters:
 * the closing brackets of each node shape, and the punctuation between parts.
 */
const TOKEN_CHARACTERS: Record<string, string> = {
  SQS: "[",
  SQE: "]",
  PS: "(",
  PE: ")",
  DIAMOND_START: "{",
  DIAMOND_STOP: "}",
  DOUBLECIRCLESTART: "((",
  DOUBLECIRCLEEND: "))",
  STADIUMSTART: "([",
  STADIUMEND: "])",
  SUBROUTINESTART: "[[",
  SUBROUTINEEND: "]]",
  CYLINDERSTART: "[(",
  CYLINDEREND: ")]",
  TRAPSTART: "[/",
  TRAPEND: "/]",
  INVTRAPSTART: "[\\",
  INVTRAPEND: "\\]",
  TAGEND: ">",
  COLON: ":",
  SEMI: ";",
  COMMA: ",",
  PIPE: "|",
  AMP: "&"
}

/** Most of Mermaid's expected tokens the error names:  past a few, the list helps nobody. */
const MAX_EXPECTED = 4

/** The name of Mermaid's error for a text whose kind it can't tell. */
const UNKNOWN_DIAGRAM_ERROR = "UnknownDiagramError"

/** A line number in a message:  `line 3`, `Line: 3`. */
const LINE_IN_MESSAGE = /\bline:?\s+(\d+)/i
