/**
 * The top bar's Docs tab:  the epic tooling's READMEs, rendered as pages, on the page server (epic `epic-engine`):
 * a ROUTE MODULE (`spell/server/page`'s `RouteModule`), listed in spell-epic's `package.json`
 * `"pageServer": { "routes": [...] }`.  The kit's page server and the epic server both load it.
 *
 * ```text
 * /_epic/docs/                         -> redirects to README-epics.md, the landing page
 * /_epic/docs/README-epics.md          the front page for epics (the kit's root, or the `spell` package's)
 * /_epic/docs/epic/README-setup.md     each README of the engine's folder (`epic/README*.md`)
 * /_epic/docs/epic/docs/images/x.png   the pictures they show
 * ```
 *
 * - A README's address answers TWO ways:
 *   - a page (`readme-page.html`, through the server's page hooks:  site header, live reload) to a navigation
 *   - its Markdown to a script's read (`?raw`, or `Sec-Fetch-Dest: empty`):  what the page's `<ui-markdown>` loads
 *   - so the README's relative links (`epic/README-setup.md#on-gitlab`) lead straight to the next README's page
 * - Found through `EngineFiles`, never by counting folders:  the same layout in a checkout of the kit and in an npm
 *   install of `spell`, the engine's folder `epic/` with `README-epics.md` beside it (both ship:  `"spellPublish"`).
 * - A relative link to anything else (`src/AGENTS.md`, `bin/epic`) is turned to its GitHub address as the Markdown is
 *   served:  an install has no source to show, and the page server serves none of it here.
 * - The same under a worktree's address (`/worktrees/<w>/_epic/docs/...`):  the header's tab keeps it.
 *   ONE copy, as the engine routes are:  the server's own checkout's.
 * - Why a top-bar tab, not a tab of its own in VS Code's side bar:  a new extension build means restarting VS Code.
 */
import { readFileSync } from "node:fs"
import { dirname, join, posix } from "node:path"

import { SRV, type Handler } from "spell/server"
import type { RouteModule } from "spell/server/page"

import { EngineFiles } from "spell/epic/config/EngineFiles.mjs"

/** Where the Docs tab's pages are served, under every address. */
export const DOCS_PREFIX = "/_epic/docs/"

/** The landing page, from `DOCS_PREFIX`:  the front page for epics. */
export const DOCS_HOME = "README-epics.md"

const docsRoutes: RouteModule = {
  name: "docs",
  setup({ router, web }) {
    for (const pattern of ["/_epic/docs", "/worktrees/:worktree/_epic/docs"]) {
      router.get(pattern, (request, reply) => reply.redirect(`${request.path.replace(/\/?$/, "/")}${DOCS_HOME}`))
      router.get(`${pattern}/*`, docsHandler(web))
    }
  }
}

export default docsRoutes

/** The handler of every path under `DOCS_PREFIX`. */
function docsHandler(web: SRV.WebServer): Handler {
  return async (request, reply) => {
    const path = decodeURIComponent(request.path.replace(WORKTREE_ADDRESS, "/").slice(DOCS_PREFIX.length))
    const file = DocsFiles.fileFor(path)
    if (!file) throw new SRV.HttpError(404, `no epic doc at ${DOCS_PREFIX}${path}`)
    reply.set({ "Cache-Control": "no-store", Vary: "Sec-Fetch-Dest" })
    if (!README.test(path)) {
      reply.type(SRV.typeFor(file))
      return reply.sendFile(file)
    }
    const isRead = "raw" in request.query || request.get("sec-fetch-dest") === "empty"
    if (isRead) return void reply.type("text/markdown; charset=utf-8").send(DocsFiles.markdownFor(path, file))
    // a navigation:  the README's page, through the server's own page hooks (`window.SPELL_SERVER`, live reload)
    let page = readFileSync(EngineFiles.path(PAGE), "utf8")
    const served = { path: decodeURIComponent(request.path), file, request }
    for (const hook of web.files.html) page = hook(page, served)
    reply.type("text/html; charset=utf-8").send(page)
  }
}

/****************
 * ### `DocsFiles`
 * Which files the Docs tab serves, and the Markdown it serves of a README.
 * - STATIC and instance-free on purpose:  the files are the engine's, the same for every repo the server serves.
 ****************/
export class DocsFiles {
  /** The folder `README-epics.md` and the engine's folder `epic/` are in:  the kit's root, or the `spell` package's. */
  static get root(): string {
    return dirname(EngineFiles.root)
  }

  /** The file at `path` (from `DOCS_PREFIX`), when the Docs tab serves it;  `undefined` for anything else. */
  static fileFor(path: string): string | undefined {
    return SERVED.test(path) ? join(DocsFiles.root, path) : undefined
  }

  /**
   * README `path`'s Markdown, read from `file`, each relative link to a file the tab doesn't serve turned to its
   * GitHub address;  links to other READMEs, pictures and `#ids` kept as they are.
   */
  static markdownFor(path: string, file: string): string {
    const folder = posix.dirname(path)
    return readFileSync(file, "utf8").replace(MARKDOWN_LINK, (link, start: string, target: string, rest: string) => {
      if (ABSOLUTE.test(target)) return link
      const [to = "", hash = ""] = target.split(/(?=#)/)
      const at = posix.normalize(posix.join(folder, to))
      if (SERVED.test(at) || at.startsWith("../")) return link
      return `${start}${GITHUB}${at}${hash}${rest}`
    })
  }
}

/** The files the tab serves, from `DocsFiles.root`:  the front page, the engine's READMEs and their pictures. */
const SERVED =
  /^(?:README-epics\.md|epic\/README(?:-[\w-]+)?\.md|epic\/docs\/images\/[\w.-]+\.(?:png|svg|jpg|gif|webp))$/

/** A README, of the paths `SERVED` takes. */
const README = /\.md$/

/** The page every README is shown in, as a checkout has it (`EngineFiles.path()`). */
const PAGE = "src/tools/readme-page.html"

/** A worktree's address in front of a path:  `/worktrees/<w>/`. */
const WORKTREE_ADDRESS = /^\/worktrees\/[^/]+\//

/** A Markdown link's target:  `](target)`, `](target "title")`;  the parts kept, and the target. */
const MARKDOWN_LINK = /(\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g

/** A target that isn't a relative path:  an address, a scheme, a root path, an `#id`. */
const ABSOLUTE = /^(?:[a-z][\w+.-]*:|\/|#)/i

/** Where the kit's files are on GitHub, as the READMEs' own links say. */
const GITHUB = "https://github.com/spell-app/spell/blob/main/"
