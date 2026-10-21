import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { dirname, join } from "node:path"

import { parseHTML } from "linkedom"

import { EpicConfig } from "$/epics/config/EpicConfig"
import { EpicAddress, PageTargets, SAGA_SCHEME, type Landing, type TargetAnswer } from "$/epics/links"

import { Sagas } from "./Sagas"
import { ServedFolders } from "./ServedFolders"

/****************
 * ### `EpicTargets`
 * What a link to a saga, an epic, a phase or an item finds in ONE checkout (epic `epic-workflow` P15):  the page, the
 * id on it, its title, and what's broken.
 * - Used by the page server (`GET /api/epics/target` and `/saga/...`, `linkRoutes.ts`), the link check (`epic check`,
 *   `doc-links.js --check`:  `problemsIn()`) and the openers (`epic pages open | link SAGA:/...`).
 * - Broken:  a saga not in `sagas/sagas.json5`, a page that isn't there, an id not on its page, and an epic under a
 *   saga it doesn't name (its `<epic-page saga>`).  The last still LINKS:  only the check minds.
 * - Reads pages from disk with linkedom;  each kept while its file is unchanged (by mtime), so a page server asking
 *   for twenty links on a page reads each page once.
 * - Node only (`node:fs`):  never in a barrel.
 ****************/
export class EpicTargets {
  /** the content folder of checkout `root`'s repo (`EpicConfig.contentOf()`):  where page paths are from */
  readonly content: string

  /** the sagas' list */
  readonly sagas: Sagas

  /** the folders checkout `root` serves at another address, by address (`ServedFolders.under()`), absolute */
  readonly served: [string, string][]

  /** pages read, by file:  their mtime, and what they hold */
  private read = new Map<string, { mtime: number; targets: PageTargets; title: string }>()

  /** The links of the repo checkout `root` is in. */
  constructor(root: string) {
    this.content = EpicConfig.contentOf(root)
    this.sagas = new Sagas(root)
    // a set in spell-epic (Epic UI's `spell-epic/src/docs`) is THIS engine's, which serves it, from any checkout
    const folderOf = (dir: string) =>
      dir.startsWith(ENGINE_LINK) && !existsSync(join(root, ENGINE_LINK))
        ? join(ServedFolders.ENGINE, dir.slice(ENGINE_LINK.length))
        : join(root, dir)
    this.served = Object.entries(ServedFolders.under(root)).map(([address, dir]) => [`${address}/`, folderOf(dir)])
  }

  /**
   * What `address` finds, from the page `from` (a page path) whose markup is `html` (default:  read
   * from disk;  `epic check` passes the whole doc, parts in).
   * - `href`:  a page path, `#id` kept (`epics/seo/seo.plan.html#j3`);  on the page it's in, `<page>#id`
   * - `problem`:  why it's broken, in a few words;  `undefined` when it isn't
   * - NEVER throws:  a page that won't read is a problem
   */
  resolve(address: EpicAddress, { from, html }: { from?: string; html?: string } = {}): ResolvedTarget {
    const samePage = !address.page || address.page === from
    const page = address.page ?? from
    const problems: string[] = []
    if (address.saga && !this.sagas.find(address.saga)) problems.push(`no saga "${address.saga}" in sagas/sagas.json5`)
    let read: { targets: PageTargets; title: string } | undefined
    if (samePage && html !== undefined) read = this.parse(html)
    else if (page && existsSync(join(this.content, page))) read = this.pageAt(page)
    else if (page)
      problems.push(
        address.epic || !address.saga ? `no page ${page}` : `saga ${address.saga} has no page yet (${page})`
      )
    else problems.push("no page:  a link with no saga or epic must be on the page it points into")
    if (read && address.epic && address.saga) {
      const named = read.targets.saga
      if (named !== address.saga)
        problems.push(
          named
            ? `epic ${address.epic} names saga "${named}", not "${address.saga}"`
            : `epic ${address.epic} names no saga`
        )
    }
    let landing: Landing | undefined
    if (read && address.hasId) {
      landing = read.targets.find(address) ?? (page ? this.inParts(page, address.id!) : undefined)
      if (!landing) problems.push(`no ${address.phase ? `phase "${address.phase}"` : `#${address.id}`} on ${page}`)
    }
    const id = landing?.id ?? address.id
    return {
      href: `${page ?? ""}${id ? `#${id}` : ""}`,
      title: landing?.title ?? read?.title,
      label: address.labelFor({ samePage, landing }),
      // the saga's words are the check's business:  the page and the id are what a click needs
      found: !!read && (!address.hasId || !!landing),
      ...(problems.length && { problem: problems.join(";  ") })
    }
  }

  /**
   * Every short-address link (`<a href="SAGA:/...">`) and `<epic-link>` in `html`, a page at `from` (a page path),
   * that's broken:  one line each, `broken link:  <the link> -- <why>`.
   * - and every link to the page server's show route (`/api/docs/show?path=<page>`, a test's action link:  epic
   *   `epic-engine` P4) whose `path` names no page:  in the content folder, or a folder served at another address
   *   (`/components/epics/`:  `ServedFolders`);  a worktree's (`/worktrees/...`) isn't looked for
   * - `<pre>` and `<script>` blocks are skipped (as `Linker.check()` skips `<pre>`):  examples, not links
   */
  problemsIn(html: string, from?: string): string[] {
    const body = html.replace(PRE, "")
    const problems: string[] = []
    const report = (written: string, make: () => EpicAddress) => {
      let address: EpicAddress
      try {
        address = make()
      } catch (error) {
        problems.push(`broken link:  ${written} -- ${(error as Error).message}`)
        return
      }
      const { problem } = this.resolve(address, { from, html })
      if (problem) problems.push(`broken link:  ${written} -- ${problem}`)
    }
    for (const match of body.matchAll(A_HREF)) {
      const href = decodeEntities(match[1])
      if (SAGA_SCHEME.test(href)) report(href, () => EpicAddress.parse(href))
      const shown = this.shownPageProblem(href)
      if (shown) problems.push(`broken link:  ${href} -- ${shown}`)
    }
    for (const match of body.matchAll(EPIC_LINK)) {
      const attributes = Object.fromEntries(
        Array.from(match[1].matchAll(ATTRIBUTE), ([, name, value]) => [name, decodeEntities(value ?? "")])
      ) as Record<string, string>
      const { saga, epic, item, phase } = attributes
      report(match[0], () => new EpicAddress({ saga, epic, item, phase }))
    }
    return problems
  }

  /**
   * `html` with its links to SERVED ROUTES made inert for the file link check (`AS.Linker.check()`):
   * their `href` `#`, which it skips.
   * - a route (`/api/...`) and a test's action link (`a.epic-test-action`, epic `epic-engine` P4) are pages the page
   *   server answers, opened in the side bar or the browser:  no file to find, and no tab of their own
   * - the show route's own check is `problemsIn()`'s
   * - only for checking:  never written back
   */
  static withoutServedLinks(html: string): string {
    return html.replace(A_TAG, (tag) =>
      SERVED_ROUTE.test(tag) || TEST_ACTION.test(tag) ? tag.replace(/\shref="[^"]*"/, ' href="#"') : tag
    )
  }

  /** Why show-route link `href` is broken (its `path` names no page), else `undefined`;  any other link:  `undefined`. */
  private shownPageProblem(href: string): string | undefined {
    if (!href.startsWith(SHOW_ROUTE)) return undefined
    const path = new URLSearchParams(href.slice(href.indexOf("?") + 1)).get("path")
    if (!path) return "no path=<page>"
    if (path.startsWith(WORKTREES)) return undefined
    const page = path.split("#")[0]!.replace(/^\//, "")
    const served = this.served.find(([address]) => page.startsWith(address))
    const file = served ? join(served[1], page.slice(served[0].length)) : join(this.content, page)
    return existsSync(file) ? undefined : `no page ${path}`
  }

  /**
   * An answer for the page server (`TargetAnswer`):  `resolve()`'s, without the problem's words.
   */
  answerFor(address: EpicAddress): TargetAnswer {
    const { href, title, label, found } = this.resolve(address)
    return { href, ...(title && { title }), label, found }
  }

  ////////////////
  // ## Reading pages
  ////////////////

  /** The page at page path `page`, read once while unchanged. */
  private pageAt(page: string): { targets: PageTargets; title: string } | undefined {
    const file = join(this.content, page)
    try {
      const mtime = statSync(file).mtimeMs
      const kept = this.read.get(file)
      if (kept?.mtime === mtime) return kept
      const read = { mtime, ...this.parse(readFileSync(file, "utf8")) }
      this.read.set(file, read)
      return read
    } catch {
      return undefined
    }
  }

  /** `html`'s targets and its title (`<title>`);  the last one kept, as `problemsIn()` asks for one page per link. */
  private parse(html: string): { targets: PageTargets; title: string } {
    if (this.parsed?.html !== html) {
      const { document } = parseHTML(html)
      const title = document.querySelector("title")?.textContent?.trim() ?? ""
      this.parsed = { html, targets: new PageTargets(document), title }
    }
    return this.parsed
  }

  /** the last markup `parse()` read, and what it holds */
  private parsed?: { html: string; targets: PageTargets; title: string }

  /**
   * `id` in one of the page's part files (`parts/*.html` beside it), for a page whose skeleton doesn't list what its
   * parts hold:  an Overview heading, an old answer card.
   */
  private inParts(page: string, id: string): Landing | undefined {
    const dir = join(this.content, dirname(page), "parts")
    if (!existsSync(dir)) return undefined
    const wanted = new RegExp(`\\bid="${id}"`, "i")
    for (const name of readdirSync(dir))
      if (name.endsWith(".html") && wanted.test(readFileSync(join(dir, name), "utf8"))) return { id }
    return undefined
  }
}

/** What `EpicTargets.resolve()` finds:  the page server's answer, plus why it's broken. */
export type ResolvedTarget = TargetAnswer & {
  /** why it's broken, in a few words;  absent when it isn't */
  problem?: string
}

/** A `<pre>` or `<script>` block (a `<ui-code>`'s `text/plain` source):  examples, never checked. */
const PRE = /<(pre|script)[\s>][\s\S]*?<\/\1>/gi

/** An `<a>` with an `href`:  `[1]` the href, as written. */
const A_HREF = /<a\s[^>]*?href="([^"]*)"/gi

/** An `<a>` start tag, whole. */
const A_TAG = /<a\b[^>]*>/gi

/** A tag whose link is a page server route:  `href="/api/..."`. */
const SERVED_ROUTE = /\shref="\/api\//

/** A tag that is a test's action link (`<a class="epic-test-action">`). */
const TEST_ACTION = /\sclass="[^"]*\bepic-test-action\b/

/** The page server's show route (`showRoutes.ts`):  `/api/docs/show?path=<page>`. */
const SHOW_ROUTE = "/api/docs/show?"

/** A checkout's link to spell-epic, where spell-app's served sets name its folders (`spell-epic/src/docs`). */
const ENGINE_LINK = "spell-epic/"

/** A worktree's pages, as the main checkout's page server serves them. */
const WORKTREES = "/worktrees/"

/** An `<epic-link>` start tag:  `[1]` its attributes. */
const EPIC_LINK = /<epic-link\b([^>]*)>/gi

/** One attribute:  `[1]` its name, `[2]` its value. */
const ATTRIBUTE = /([a-z-]+)(?:="([^"]*)")?/gi

/** `text` with the entities a page's attributes use decoded. */
function decodeEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
}
