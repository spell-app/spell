/**
 * `tools/readme-pictures.ts`:  the pictures of the README examples, taken headlessly (`spell readme pictures` /
 * `yarn readme:pictures` at the kit's root;  epic `ui-gaps` P14, from epic `epic-engine` Q28, B).
 * - GitHub shows a README's Markdown and runs no custom elements, so a `<ui-example>` there would be plain text.
 *   A README shows an example as its markup, in an `html example` block, and the picture of what it draws under it.
 * - Each picture:  the markup drawn by the page server's Spell UI, in a `<ui-example>` (its frame, no code button),
 *   light and dark, saved beside the page in `images/readme/<page>.<n>.png` and `<page>.<n>.dark.png`.
 * - Under the block it writes (or rewrites) the `<picture>` and a stamp, the markup's fingerprint:
 *   `yarn readme:check` fails once the markup has changed since (`ReadmeCheck.examples()`, its `picture` rule).
 *
 * ````markdown
 * ```html example
 * <ui-button color="primary">Save</ui-button>
 * ```
 *
 * <picture><source media="(prefers-color-scheme: dark)" srcset="images/readme/README.1.dark.png"><img src="images/readme/README.1.png" width="96" height="58" alt="A blue Save button"></picture>
 * <!-- picture of the example above: 0a1b2c3d4e5f -->
 * ````
 *
 * ```sh
 * yarn readme:pictures                    # every page's stale or missing pictures
 * yarn readme:pictures ui/README.md # only those pages (paths from the kit's root)
 * yarn readme:pictures --all              # every picture, taken again
 * yarn readme:pictures --base http://localhost:4747   # another page server than this checkout's own
 * ```
 *
 * - The alt text is the author's:  kept as written, `What that markup draws` until someone writes it.
 * - Needs this checkout's page server running (`spell server start`, its `.spell-server.json`), else the one at
 *   `localhost:4747`:  it doesn't start one.
 *   The markup goes into a page of its own at the server's address, so `/_epic/assets/spell-ui.js` loads every family.
 * - Node 24 runs it as is (its types stripped):  node's own modules, and `spell/element-tools/BrowserPage`
 *   (which imports Playwright only as it launches).
 * - Exit status 1 when a picture couldn't be taken (the server isn't up, the page threw), 0 otherwise.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { basename, dirname, join, relative, resolve } from "node:path"
import { parseArgs } from "node:util"

import { BrowserPage } from "spell/element-tools/BrowserPage"

import { ReadmeCheck, type ReadmeExample } from "./readme-check.ts"

/****************
 * ### `ReadmePictures`
 * Takes the README examples' pictures, and writes each one's `<picture>` and stamp under its block.
 * - One headless Chromium for the run;  a page per example and scheme.
 ****************/
export class ReadmePictures {
  /** the kit's root:  this file is in its `tools/` */
  readonly root: string

  /** the page server's address */
  readonly base: string

  constructor(base: string | undefined, root = resolve(import.meta.dirname, "..")) {
    this.root = root
    this.base = (base ?? ReadmePictures.serverOf(root)).replace(/\/$/, "")
  }

  /** This checkout's page server's address (its `.spell-server.json`), else the usual one, `DEFAULT_BASE`. */
  private static serverOf(root: string): string {
    try {
      const { port } = JSON.parse(readFileSync(join(root, SERVER_FILE), "utf8")) as { port?: number }
      return port ? `http://localhost:${port}` : DEFAULT_BASE
    } catch {
      return DEFAULT_BASE
    }
  }

  /**
   * Take the pictures of `pages` (all, when none), writing each page back:  every picture with `all`, else only
   * the stale and missing ones.  Returns the problems, one line each.
   */
  async take(pages: string[], { all = false } = {}): Promise<string[]> {
    const problems: string[] = []
    const paths = pages.length ? pages.map((page) => resolve(this.root, page)) : new ReadmeCheck(this.root).pages()
    const work = paths
      .map((path) => ({ path, text: readFileSync(path, "utf8") }))
      .map((page) => ({ ...page, examples: ReadmeCheck.examples(page.text) }))
      .filter(({ examples }) => examples.length)
    if (!work.length) return problems
    await BrowserPage.with(async (browser) => {
      for (const { path, text, examples } of work) {
        const stale = examples.filter((example) => all || ReadmePictures.isStale(example, path))
        if (!stale.length) continue
        const taken = new Map<ReadmeExample, string>()
        for (const example of stale) {
          const number = examples.indexOf(example) + 1
          try {
            taken.set(example, await this.picture(browser, path, example, number))
            process.stdout.write(`${relative(this.root, path)}:${example.start}  picture ${number}\n`)
          } catch (error) {
            problems.push(`${relative(this.root, path)}:${example.start}  ${(error as Error).message}`)
          }
        }
        if (taken.size) writeFileSync(path, ReadmePictures.withPictures(text, taken))
      }
    })
    return problems
  }

  /** Take `example`'s two pictures (light, dark), beside the page at `path`;  its `<picture>` line, written. */
  private async picture(browser: Browser, path: string, example: ReadmeExample, number: number): Promise<string> {
    const stem = `${PICTURE_FOLDER}/${basename(path, ".md")}.${number}`
    mkdirSync(join(dirname(path), PICTURE_FOLDER), { recursive: true })
    let size = { width: 0, height: 0 }
    for (const scheme of SCHEMES) {
      const pageProblems: string[] = []
      const page = await BrowserPage.newPage(browser, {
        viewport: VIEWPORT,
        colorScheme: scheme,
        context: { deviceScaleFactor: 2 },
        onProblem: (text) => pageProblems.push(text)
      })
      try {
        const url = `${this.base}${PICTURE_PAGE}`
        await page.route(url, (route) => route.fulfill({ contentType: "text/html", body: pageFor(example.markup) }))
        await page.goto(url)
        await BrowserPage.settle(page, { networkIdle: NETWORK_IDLE })
        if (pageProblems.length) throw new Error(`the example's page:  ${pageProblems[0]}`)
        const demo = page.locator(`#${EXAMPLE_ID}`).locator('[part~="demo"]')
        const box = await demo.boundingBox()
        if (!box) throw new Error("the example drew nothing")
        const clip = {
          x: box.x - MARGIN,
          y: box.y - MARGIN,
          width: box.width + 2 * MARGIN,
          height: box.height + 2 * MARGIN
        }
        size = { width: Math.round(clip.width), height: Math.round(clip.height) }
        await page.screenshot({ clip, path: join(dirname(path), `${stem}${scheme === "dark" ? ".dark" : ""}.png`) })
      } finally {
        await page.close()
      }
    }
    const alt = escapeAttribute(example.picture?.alt || DEFAULT_ALT)
    return (
      `<picture><source media="(prefers-color-scheme: dark)" srcset="${stem}.dark.png">` +
      `<img src="${stem}.png" width="${size.width}" height="${size.height}" alt="${alt}"></picture>\n` +
      `<!-- picture of the example above: ${example.hash} -->`
    )
  }

  /** Is `example`'s picture missing (or a file of it), or older than its markup? */
  private static isStale(example: ReadmeExample, path: string): boolean {
    const { picture } = example
    if (!picture || picture.hash !== example.hash) return true
    return ![picture.src, picture.dark].every((src) => existsSync(join(dirname(path), src)))
  }

  /**
   * `text` with each taken picture written under its block:  in place of the old `<picture>` (and stamp), else after
   * one blank line.
   */
  private static withPictures(text: string, taken: ReadonlyMap<ReadmeExample, string>): string {
    const lines = text.split("\n")
    // from the end, so earlier line numbers stay true
    for (const [example, picture] of [...taken].sort(([a], [b]) => b.start - a.start)) {
      if (example.picture) lines.splice(example.picture.line - 1, example.picture.lines, picture)
      else lines.splice(example.end, 0, "", picture)
    }
    return lines.join("\n")
  }
}

/** Playwright's browser, as `BrowserPage` hands it out. */
type Browser = Parameters<typeof BrowserPage.newPage>[0]

/** The example's page:  Spell UI as the guides load it, the markup in a `<ui-example>`, its code button hidden. */
function pageFor(markup: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="/_epic/assets/spell-doc.css" />
    <style>
      body { margin: 0; padding: 16px; background: transparent; }
      ui-example::part(toggle) { display: none; }
      ui-example { margin: 0; }
    </style>
  </head>
  <body class="spell-doc-page">
    <main class="spell-doc-main">
      <ui-example id="${EXAMPLE_ID}" bare>
${markup}
      </ui-example>
    </main>
    <script src="/_epic/assets/highlight.min.js"></script>
    <script src="/_epic/assets/spell-ui.js"></script>
  </body>
</html>`
}

/** `text` safe inside a double-quoted attribute. */
function escapeAttribute(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll('"', "&quot;")
}

/** The page server's address when `--base` isn't given and this checkout runs none of its own. */
const DEFAULT_BASE = "http://localhost:4747"

/** Where a running page server says where it is, at the checkout's root (`spell server start`). */
const SERVER_FILE = ".spell-server.json"

/** Where the example's page is answered, on the server's address (Playwright answers it;  the server never sees it). */
const PICTURE_PAGE = "/__readme-picture.html"

/** The pictures' folder, beside the page. */
const PICTURE_FOLDER = "images/readme"

/** The example's id in its page. */
const EXAMPLE_ID = "readme-example"

/** The alt text of a new picture, until its author writes one. */
const DEFAULT_ALT = "What that markup draws"

/** How long the network stays quiet before a picture is taken, ms (`BrowserPage.settle()`). */
const NETWORK_IDLE = 500

/** Room around what the example draws, px:  the page's own ground, so nothing touches the picture's edge. */
const MARGIN = 12

/** The window the markup is drawn in:  as wide as GitHub shows a README. */
const VIEWPORT = { width: 880, height: 600 }

/** Each picture's two schemes:  GitHub shows the one the reader's set to. */
const SCHEMES = ["light", "dark"] as const

////////////////
// ## Run
////////////////

if (import.meta.main) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { all: { type: "boolean" }, base: { type: "string" } }
  })
  const problems = await new ReadmePictures(values.base).take(positionals, { all: values.all })
  for (const problem of problems) process.stderr.write(`${problem}\n`)
  process.exit(problems.length ? 1 : 0)
}
