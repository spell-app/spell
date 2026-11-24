import { existsSync, readdirSync, readFileSync } from "node:fs"
import { dirname, join, relative, resolve, sep } from "node:path"

import { DataFile } from "spell/server/DataFile"
import { EpicConfig } from "spell/epic/config/EpicConfig.ts"

/****************
 * ### `ShippedGuides`
 * The guides a repo SHIPS:  the ones in its own guides folder (`guidesFolder`), each saying in its head who it's for,
 * its topic, and whether it's a "Start here" (epic `epic-engine` P79).
 * - its LIST, `<guidesFolder>/guides.json5`, written from those metas (`write()`, `epic guides index`), so a reader
 *   (the Spell app's Guides page) reads one small file, never every page
 * - its CHECK (`check()`, `epic guides check`):  a shipped guide stands on its own, outside the epic pages' site
 *   - no link into the epic repo:  an epic page, a saga page, a short address (`SAGA:/...`), an `<epic-link>`, the
 *     docs' home, or a guide that doesn't ship
 *   - no command it names that doesn't exist (`spell parser check`), no file path it names that isn't there
 *   - the list up to date
 *   - and the same, but the list, for the epic plugin's guides, in the checkout that holds them (epic `epic-engine`
 *     I402):  they ship with the plugin, so link only each other
 * - The metas, beside `spell-saga`, after the description:
 *
 *   ```html
 *   <meta name="spell-audience" content="makers" />        makers, or programmers
 *   <meta name="spell-topic" content="Writing Spell" />    its section on the Guides page
 *   <meta name="spell-start-here" content="2" />           a Start here, 2nd;  more than one for a chapter:
 *   <meta name="spell-start-here" content="5" data-anchor="views" data-title="Views" />
 *   ```
 *
 * - Its position:  node only;  pure but for reading the guides folder and writing the list.
 ****************/
export class ShippedGuides {
  /** the checkout whose guides folder this is */
  readonly checkout: string

  /** its guides folder, absolute;  `undefined` when its repo names none */
  readonly folder: string | undefined

  constructor(checkout: string) {
    this.checkout = resolve(checkout)
    this.folder = EpicConfig.guideFoldersOf(this.checkout).find((each) => each.code)?.folder
  }

  /** The list's file:  `<guidesFolder>/guides.json5`;  `undefined` with no guides folder. */
  get file(): string | undefined {
    return this.folder && join(this.folder, LIST_FILE)
  }

  /**
   * The list, as `guides.json5` holds it:  every guide in the folder with a `spell-audience` meta, by path, and the
   * Start here entries in their order (a chapter's by its page's address and anchor).
   */
  build(): GuideList {
    const guides: ShippedGuide[] = []
    const startHere: StartHere[] = []
    for (const file of this.pages()) {
      const html = readFileSync(file, "utf8")
      const audience = metaOf(html, "spell-audience")
      if (audience !== "makers" && audience !== "programmers") continue
      const path = relative(this.checkout, file).split(sep).join("/")
      const title = TITLE.exec(html)?.[1]?.trim() ?? path
      guides.push({
        path,
        title,
        description: descriptionOf(html),
        audience,
        topic: metaOf(html, "spell-topic") ?? "Other"
      })
      for (const tag of html.match(START_HERE) ?? []) {
        const order = Number(attributeOf(tag, "content"))
        const anchor = attributeOf(tag, "data-anchor")
        startHere.push({ order, path, title: attributeOf(tag, "data-title") ?? title, ...(anchor ? { anchor } : {}) })
      }
    }
    startHere.sort((a, b) => a.order - b.order || a.path.localeCompare(b.path))
    return { "//": NOTE, guides, startHere }
  }

  /** Write the list into `guides.json5`;  returns whether it changed.  None (`false`) with no guides folder. */
  write(): boolean {
    const file = this.file
    if (!file) return false
    const next = this.build()
    if (sameList(DataFile.read<GuideList>(file), next)) return false
    DataFile.write(file, next)
    return true
  }

  /**
   * What's wrong with the shipped guides, a line each (`guides/x.html:  ...`);  none:  `[]`.
   * - `commandExists(words)`:  whether a command line's first words are a command (`spell server start`);
   *   the caller's, from every folder's command list (`Guides`)
   * - `fileExists(path)`:  whether a path a guide names in code is there, from the checkout's root
   * - `plugin`:  the epic plugin's guides folder in this checkout, absolute, checked too;  none when it isn't here
   */
  check(props: CheckProps): string[] {
    const { plugin } = props
    const problems = plugin ? this.problemsIn(plugin, dirname(plugin), props) : []
    if (!this.folder) return problems
    problems.push(...this.problemsIn(this.folder, this.checkout, props))
    const listed = DataFile.read<GuideList>(this.file!)
    if (!sameList(listed, this.build()))
      problems.push(`${relative(this.checkout, this.file!)}:  stale:  epic guides index`)
    return problems
  }

  /**
   * What's wrong with the guides in `folder`, which ship together:  one may link another.
   * - `base`:  what their addresses are from (`guides/x.html`):  the checkout, or the epic plugin's folder
   * - each problem names its file from the checkout's root (`epic/guides/x.html`)
   */
  private problemsIn(
    folder: string,
    base: string,
    { commandExists, fileExists = (path) => existsSync(join(this.checkout, path)) }: CheckProps
  ): string[] {
    const problems: string[] = []
    const pages = this.pages(folder)
    const shipped = new Set(pages.map((file) => relative(base, file).split(sep).join("/")))
    for (const file of pages) {
      const html = readFileSync(file, "utf8")
      const path = relative(base, file).split(sep).join("/")
      const name = relative(this.checkout, file).split(sep).join("/")
      const say = (problem: string) => problems.push(`${name}:  ${problem}`)
      if (/<epic-link\b/.test(html)) say("an <epic-link>:  a link into the epic repo")
      // a code sample's own markup (`&lt;a href="..."&gt;` in a <pre>) is text, not a link
      for (const [, href] of html.replace(CODE_BLOCK, "").matchAll(LINK)) {
        const target = linkTarget(href!, dirname(path))
        if (target === undefined) continue
        if (EPIC_REPO.test(target)) say(`links ${href}, in the epic repo`)
        else if (target.startsWith("guides/") && target.endsWith(".html") && !shipped.has(target))
          say(`links ${href}, a guide that doesn't ship`)
      }
      for (const [, code] of html.matchAll(CODE)) {
        const text = decode(code!.replace(/<[^>]+>/g, "")).trim()
        const words = COMMAND.exec(text)?.[0]?.split(/\s+/)
        if (words && !commandExists(words)) say(`names \`${words.join(" ")}\`, which isn't a command`)
        else if (!words && FILE_PATH.test(text) && !fileExists(text.replace(/:\d+$/, "")))
          say(`names ${text}, which isn't there`)
      }
    }
    return problems
  }

  /** Every page in `folder` (default:  the guides folder), absolute, sorted;  not the folders that hold no pages. */
  pages(folder = this.folder): string[] {
    const found: string[] = []
    const walk = (dir: string) => {
      if (!existsSync(dir)) return
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith(".")) continue
        const path = join(dir, entry.name)
        if (entry.isDirectory()) {
          if (!NO_PAGES.has(entry.name)) walk(path)
        } else if (entry.name.endsWith(".html")) found.push(path)
      }
    }
    if (folder) walk(folder)
    return found.sort()
  }
}

/** `guides.json5`:  the shipped guides, and the Start here entries in order. */
export type GuideList = {
  "//"?: string
  /** every shipped guide, by path */
  guides: ShippedGuide[]
  /** the Start here entries, in their order */
  startHere: StartHere[]
}

/** One shipped guide, as its head says. */
export type ShippedGuide = {
  /** from the checkout's root, its address too:  `guides/data/data.html` */
  path: string
  /** its `<title>` */
  title: string
  /** its description meta */
  description: string
  /** who it's for */
  audience: "makers" | "programmers"
  /** its section on the Guides page:  `Writing Spell` */
  topic: string
}

/** One Start here entry:  a guide, or a chapter of one (`anchor`). */
export type StartHere = { order: number; path: string; title: string; anchor?: string }

/** What `ShippedGuides.check()` is handed. */
export type CheckProps = {
  /** whether a command line's first words are a command */
  commandExists: (words: string[]) => boolean
  /** whether a path a guide names is there, from the checkout's root */
  fileExists?: (path: string) => boolean
  /** the epic plugin's guides folder in this checkout, absolute;  none when the checkout doesn't hold it */
  plugin?: string
}

/** The list's file name, in the guides folder. */
export const LIST_FILE = "guides.json5"

/** The list's note, for whoever opens it. */
const NOTE = "GENERATED by `epic guides index` from each guide's metas (spell-audience, spell-topic, spell-start-here)"

/**
 * Folders that hold no guides.
 * - NOT `examples`:  a guide may be in one, and an example page beside a guide ships with it (epic `epic-engine` I396)
 */
const NO_PAGES = new Set(["node_modules", "experiments", "details", "parts", "requests", "pictures"])

/** A page's `<title>`:  `$1`. */
const TITLE = /<title>([^<]*)<\/title>/

/** Every Start here meta, whole. */
const START_HERE = /<meta\s+name="spell-start-here"[^>]*>/g

/** Every `href` or `src`:  `$1` the value. */
const LINK = /\s(?:href|src)="([^"]*)"/g

/** Every inline code span's inside:  `$1`. */
const CODE = /<code\b[^>]*>([\s\S]*?)<\/code>/g

/**
 * A command line a guide names:  `spell` or `epic`, a word, and a second only when it's a plain word, a verb
 * (`spell server start`);  `spell bundle ui-site`'s `ui-site` is an argument, never checked.
 */
const COMMAND = /^(?:spell|epic)\s+[a-z][\w-]*(?:\s+[a-z]+(?![\w./-]))?/

/** A `<pre>` or `<code>` block, whole:  a sample's markup in it is text. */
const CODE_BLOCK = /<(pre|code)\b[^>]*>[\s\S]*?<\/\1>/g

/** A path into one of the kit's folders, as a guide names it in code:  `parser/src/x.ts`, `src/server/`. */
const FILE_PATH = /^(?:src|parser|ui|epic|app|tests|bin|tools|agents|README)\/[\w./-]+(?::\d+)?$/

/**
 * A link's target as a path from the checkout's root (`guides/x.html`, `epics/...`);  `undefined` for one within the
 * page, to another site, or a short address (said as the epic repo's).
 */
function linkTarget(href: string, from: string): string | undefined {
  if (href.startsWith("SAGA:")) return "epics/"
  const bare = href.replace(/[?#].*$/, "")
  if (!bare || /^[a-z][\w+.-]*:/i.test(bare) || bare.startsWith("//")) return undefined
  if (bare.startsWith("/")) return bare.slice(1)
  return join(from, bare).split(sep).join("/")
}

/** A page path in the epic repo, never shipped:  an epic, a saga, the docs home, a details page, the brand. */
const EPIC_REPO = /^(?:epics|sagas|pages|goals|brand)\//

/** Meta `name`'s `content`, or `undefined`. */
function metaOf(html: string, name: string): string | undefined {
  const tag = new RegExp(`<meta\\s+name="${name}"[^>]*>`).exec(html)?.[0]
  return tag ? attributeOf(tag, "content") : undefined
}

/** The description meta's text, its spacing made one;  `""` for none. */
function descriptionOf(html: string): string {
  const tag = /<meta\s+name="description"(?:\s+[\w-]+="[^"]*")*\s*\/?>/.exec(html)?.[0]
  return decode(tag ? (attributeOf(tag, "content") ?? "") : "")
    .replace(/\s+/g, " ")
    .trim()
}

/** Attribute `name`'s value in a tag, or `undefined`. */
function attributeOf(tag: string, name: string): string | undefined {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1]
}

/** The few character references a page's text has. */
function decode(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
}

/** Whether list `a` (read from disk) holds what `b` does, its note aside. */
function sameList(a: GuideList | undefined, b: GuideList): boolean {
  if (!a) return false
  return JSON.stringify({ ...a, "//": "" }) === JSON.stringify({ ...b, "//": "" })
}
