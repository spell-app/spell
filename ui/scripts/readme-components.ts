/**
 * `yarn readme:components [--check] [--shoot <base url> [family ...]]`:  write the catalogue in
 * `README-components.md`, every family by group with a thumbnail where one exists, from the site's data
 * (`docs/__data/components.json5`).
 * - Grouped as the kitchen sink is (`site:kitchen`):  Fomantic's four groups by each family's main tag's topic, the
 *   generic content parts, then Spell UI's own;  A-Z by title inside a group.
 *   The docs site's own `<ui-docs-*>` families get a table of their own, last.
 * - A row:  thumbnail, the family (linked to its docs page, with its status unless done), its tags (a sub-tag with a
 *   page of its own linked to it), the main tag's one-line description, other libraries' names for it (`aka`).
 * - Thumbnails:  `docs/images/components/<folder>.png`, shown when the file exists, scaled to fit `THUMBNAIL_BOX`.
 *   - Delete a file to drop its picture;  `--shoot <url> <family>` adds one.
 * - `--shoot <base url> [family ...]`:  retake the thumbnails first, headless (Playwright's chromium), from the docs
 *   site served at `<base url>` (e.g. `http://localhost:4747/components/ui/`):  each family page's FIRST example,
 *   trimmed to what it draws.
 *   - No families named:  the ones that have a thumbnail already.
 *   - Needs the page server running;  it doesn't start one.
 * - Writes ONLY between the page's `<!-- components:start -->` and `<!-- components:end -->` markers:  the rest of
 *   the page is hand-kept.  The block is written as generated:  `yarn format` leaves Markdown alone (the toolchain's
 *   format settings skip `*.md`).
 * - Rerun after `yarn site:data`.
 * - `--check`:  write nothing;  exit 1 if the page is stale.
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { parseArgs } from "node:util"
import type { Page } from "playwright"

import { readJSON5File } from "spell/util/node/json5"
import { BrowserPage } from "spell/element-tools/BrowserPage"
import { Terminal } from "spell/element-tools/Terminal"
import { spliceGenerated, writeOrCheck } from "spell/element-tools/generatedFiles"

import type { SiteDataFile, SiteFamily } from "spell/ui/docs-components/docs-components.types"
import { SITE_DATA, SITE_PAGES, SPELL_UI_ROOT } from "spell/ui/tools/tools.types"

import { STATUS_TEXT } from "spell/ui/tools/generatedFiles"

/****************
 * ### `ComponentCatalogWriter`
 * Renders the catalogue block of `README-components.md` from the site's data, and splices it between the markers.
 * - Its `private static` helpers are STATIC because they're pure:  data in, text out.
 ****************/
class ComponentCatalogWriter {
  /** The page. */
  readonly file = path.join(SPELL_UI_ROOT, "README-components.md")

  /** The site's data. */
  readonly data: SiteDataFile = readJSON5File<SiteDataFile>(path.join(SPELL_UI_ROOT, SITE_DATA, "components.json5"))

  /** Every tag, library and doc-only, by name. */
  private readonly tags = new Map([...this.data.components, ...this.data.docs].map((tag) => [tag.tag, tag]))

  /** `page` with its generated block replaced by a fresh one. */
  render(page: string): string {
    return spliceGenerated(page, { file: this.file, start: START, end: END, block: () => this.block() })
  }

  /** The generated lines:  a count, then per group a header and a table. */
  private block(): string {
    const families = Object.values(this.data.families)
    const library = families.filter((family) => !family.docs)
    const inProgress = library.filter((family) => family.status !== "done").length
    const lines = [
      "",
      `${library.length} families, ${this.data.components.length} tags;  ${inProgress} families in progress.`
    ]
    for (const group of GROUPS) {
      const members = library
        .filter((family) => this.groupOf(family) === group.id)
        .sort((a, b) => a.title.localeCompare(b.title))
      if (!members.length) continue
      lines.push("", `### ${group.title}`, "", group.lead, "", ...this.table(members))
    }
    const docs = families.filter((family) => family.docs).sort((a, b) => a.title.localeCompare(b.title))
    lines.push(
      "",
      "<details>",
      `<summary>The docs site's own elements:  ${docs.length} families, never in the library</summary>`,
      "",
      ...this.table(docs),
      "",
      "</details>",
      ""
    )
    return lines.join("\n")
  }

  /**
   * One group's table:  a header row, then a row per family.
   * - The doc-only families have no pictures, so no picture column.
   */
  private table(families: readonly SiteFamily[]): string[] {
    const hasPictures = families.some((family) => !family.docs)
    const header = [...(hasPictures ? ["Picture"] : []), "Family", "Tags", "What it is", "Also called"]
    return [
      `| ${header.join(" | ")} |`,
      `| ${header.map(() => "---").join(" | ")} |`,
      ...families.map((family) => this.row(family, { hasPictures }))
    ]
  }

  /** One family's row;  `hasPictures`:  its first cell is the thumbnail. */
  private row(family: SiteFamily, { hasPictures }: { hasPictures: boolean }): string {
    const main = this.tags.get(family.mainTag)
    const status = family.status === "done" ? "" : ` *(${STATUS_TEXT[family.status] ?? family.status})*`
    const name = family.docs ? family.title : `[${family.title}](${SITE_PAGES}/${family.mainTag}.html)${status}`
    const tags = family.tags.map((tag) => this.tagCell(family, tag)).join(" ")
    const aka = (main?.aka ?? []).slice(0, MAX_AKA).join(", ")
    const description = main?.description ?? family.summary
    const thumbnail = hasPictures ? [ComponentCatalogWriter.thumbnail(family)] : []
    const cells = [...thumbnail, name, tags, description, aka]
    return `| ${cells.map((cell) => ComponentCatalogWriter.cell(cell)).join(" | ")} |`
  }

  /** A tag in its family's row:  linked when it has a docs page of its own besides the family's. */
  private tagCell(family: SiteFamily, tag: string): string {
    const code = `\`<${tag}>\``
    return family.pages?.[tag] ? `[${code}](${SITE_PAGES}/${tag}.html)` : code
  }

  /** Which group `family` files under:  `GROUPS`' ids. */
  private groupOf(family: SiteFamily): string {
    if (PARTS_FAMILIES.includes(family.folder)) return "parts"
    const topics = this.tags.get(family.mainTag)?.topics ?? []
    return GROUPS.find((group) => group.topic && topics.includes(group.topic))?.id ?? "own"
  }

  /** `family`'s thumbnail as an `<img>`, scaled to fit `THUMBNAIL_BOX`;  `""` without one. */
  private static thumbnail(family: SiteFamily): string {
    const file = path.join(SPELL_UI_ROOT, THUMBNAILS, `${family.folder}.png`)
    if (!existsSync(file)) return ""
    const { width, height } = ComponentCatalogWriter.pngSize(file)
    const scale = Math.min(1, THUMBNAIL_BOX.width / width, THUMBNAIL_BOX.height / height)
    const size = `width="${Math.round(width * scale)}" height="${Math.round(height * scale)}"`
    return `<img src="${THUMBNAILS}/${family.folder}.png" alt="${family.title}, its first example" ${size}>`
  }

  /** A PNG's size, from its header (`IHDR`, bytes 16-23). */
  private static pngSize(file: string): { width: number; height: number } {
    const header = readFileSync(file).subarray(16, 24)
    return { width: header.readUInt32BE(0), height: header.readUInt32BE(4) }
  }

  /** `text` safe inside a table cell:  one line, pipes escaped. */
  private static cell(text: string): string {
    return text.replaceAll("\n", " ").replaceAll("|", "\\|")
  }
}

/****************
 * ### `ComponentThumbnails`
 * Takes each family's thumbnail headless, from the docs site:  its page's first example, trimmed to what it draws.
 ****************/
class ComponentThumbnails {
  /** The docs site's address, ending in `/`. */
  private readonly baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
  }

  /** Shoot each of `families` (folders, `ui-button`);  prints one line each, and never throws for one family. */
  async shoot(families: readonly SiteFamily[]): Promise<void> {
    mkdirSync(path.join(SPELL_UI_ROOT, THUMBNAILS), { recursive: true })
    await BrowserPage.with(async (browser) => {
      const page = await BrowserPage.newPage(browser, { viewport: VIEWPORT, context: { deviceScaleFactor: 1 } })
      for (const family of families) {
        try {
          await this.shootOne(page, family)
          Terminal.out(`thumbnail:  ${family.folder}`)
        } catch (error) {
          Terminal.err(`thumbnail:  ${family.folder} failed:  ${String(error).split("\n")[0]}`)
        }
      }
    })
  }

  /** Load `family`'s page, wait for its root, and save its first example's picture. */
  private async shootOne(page: Page, family: SiteFamily): Promise<void> {
    await page.goto(`${this.baseUrl}${family.mainTag}.html`, { waitUntil: "load" })
    await page.waitForFunction(() => document.querySelector("ui-root")?.matches(":state(ready)"), undefined, {
      timeout: READY_TIMEOUT
    })
    const example = page.locator("ui-example").first()
    await example.scrollIntoViewIfNeeded()
    await page.waitForTimeout(SETTLE_MS)
    const clip = await example.evaluate(contentBox, { maxWidth: MAX_SHOT.width, maxHeight: MAX_SHOT.height })
    if (!clip) throw new Error("its first example draws nothing")
    const trimmed = await ComponentThumbnails.trimmed(page, clip)
    await page.screenshot({ path: path.join(SPELL_UI_ROOT, THUMBNAILS, `${family.folder}.png`), clip: trimmed })
  }

  /** `clip` without the plain background around what's drawn, plus `PADDING`. */
  private static async trimmed(page: Page, clip: Box): Promise<Box> {
    const shot = await page.screenshot({ clip })
    const ink = await page.evaluate(inkBox, `data:image/png;base64,${shot.toString("base64")}`)
    if (!ink) return clip
    return {
      x: clip.x + Math.max(0, ink.x - PADDING),
      y: clip.y + Math.max(0, ink.y - PADDING),
      width: Math.min(clip.width, ink.width + 2 * PADDING),
      height: Math.min(clip.height, ink.height + 2 * PADDING)
    }
  }
}

/** A box on the page, in CSS pixels. */
type Box = { x: number; y: number; width: number; height: number }

/**
 * Runs IN THE PAGE:  the box around what a `<ui-example>`'s own children draw (not its slotted description),
 * padded, capped at `maxWidth` x `maxHeight`;  `undefined` when they draw nothing.
 * - A child with no box of its own (`display: contents`) counts its children, light and shadow.
 */
function contentBox(example: Element, { maxWidth, maxHeight }: { maxWidth: number; maxHeight: number }) {
  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity
  const add = (element: Element) => {
    const rect = element.getBoundingClientRect()
    if (rect.width && rect.height) {
      left = Math.min(left, rect.left)
      top = Math.min(top, rect.top)
      right = Math.max(right, rect.right)
      bottom = Math.max(bottom, rect.bottom)
      return
    }
    for (const child of element.shadowRoot?.children ?? []) add(child)
    for (const child of element.children) add(child)
  }
  for (const child of example.children) if (!child.slot) add(child)
  if (left === Infinity) return undefined
  const pad = 6
  return {
    x: Math.max(0, left - pad),
    y: Math.max(0, top - pad),
    width: Math.min(right - left + 2 * pad, maxWidth),
    height: Math.min(bottom - top + 2 * pad, maxHeight)
  }
}

/**
 * Runs IN THE PAGE:  the box around every pixel of the PNG at `dataUrl` that differs from its top-left pixel (the
 * background);  `undefined` when none does.
 */
async function inkBox(dataUrl: string) {
  const image = new Image()
  image.src = dataUrl
  await image.decode()
  const canvas = document.createElement("canvas")
  canvas.width = image.width
  canvas.height = image.height
  const context = canvas.getContext("2d")!
  context.drawImage(image, 0, 0)
  const { data } = context.getImageData(0, 0, image.width, image.height)
  let minX = image.width
  let minY = image.height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const at = (y * image.width + x) * 4
      const difference =
        Math.abs(data[at]! - data[0]!) + Math.abs(data[at + 1]! - data[1]!) + Math.abs(data[at + 2]! - data[2]!)
      if (difference <= 12) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
  if (maxX < 0) return undefined
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

////////////////
// ## Constants
////////////////

/** Start marker (its own line). */
const START = "<!-- components:start -->"

/** End marker (its own line). */
const END = "<!-- components:end -->"

/** The groups, in order:  Fomantic's four by topic, the generic content parts, then ours (no topic). */
const GROUPS: readonly { id: string; title: string; topic?: string; lead: string }[] = [
  { id: "elements", title: "Elements", topic: "elements", lead: "The basic pieces of a page." },
  { id: "collections", title: "Collections", topic: "collections", lead: "Pieces made of several kinds of part." },
  { id: "views", title: "Views", topic: "views", lead: "Ways to present a kind of content." },
  { id: "modules", title: "Modules", topic: "modules", lead: "Elements with behaviour:  they open, pick, move." },
  {
    id: "parts",
    title: "The generic content parts",
    lead: "One set of parts for every owner:  each styles itself by what it's in, a card, an item, a comment ..."
  },
  { id: "own", title: "Spell UI's own", lead: "Elements with no Fomantic counterpart." }
]

/** Families filed under the content parts, whatever their main tag's topics say. */
const PARTS_FAMILIES: readonly string[] = ["ui-parts"]

/** Thumbnails' folder, from the repo's root. */
const THUMBNAILS = "docs/images/components"

/** The box a thumbnail is scaled down to fit, in CSS pixels. */
const THUMBNAIL_BOX = { width: 200, height: 96 }

/** Other libraries' names shown per family. */
const MAX_AKA = 4

/** The page's viewport while shooting. */
const VIEWPORT = { width: 1280, height: 900 }

/** The largest picture taken of one example, before trimming. */
const MAX_SHOT = { width: 900, height: 560 }

/** Space kept around what an example draws, in pixels. */
const PADDING = 6

/** How long a page's root may take to get ready, in ms. */
const READY_TIMEOUT = 15_000

/** A pause for transitions and late images once the example is in view, in ms. */
const SETTLE_MS = 600

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { check: { type: "boolean", default: false }, shoot: { type: "string" } }
})
const writer = new ComponentCatalogWriter()
if (values.shoot) {
  const named = positionals.map((name) => (name.startsWith("ui-") ? name : `ui-${name}`))
  const families = Object.values(writer.data.families).filter((family) =>
    named.length
      ? named.includes(family.folder)
      : existsSync(path.join(SPELL_UI_ROOT, THUMBNAILS, `${family.folder}.png`))
  )
  await new ComponentThumbnails(values.shoot).shoot(families)
}
const page = writer.render(readFileSync(writer.file, "utf8"))
const [stale] = writeOrCheck([[writer.file, page]], { command: "readme:components", isCheck: values.check })
if (!values.check) Terminal.out(`README-components.md:  ${stale ? `wrote ${stale}` : "unchanged"}`)
