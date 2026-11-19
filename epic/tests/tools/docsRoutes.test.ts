/**
 * Tests of the Docs tab's route module on a real page server, over HTTP:
 * - the landing page and a README of the engine's folder, as pages and as Markdown
 * - their relative links:  to another README kept (they lead to its page), to a source file turned to GitHub
 * - pictures, the redirect, a worktree's address, and what it doesn't serve
 * - the READMEs are the kit's own, found through `EngineFiles` as the server finds them
 */
import { mkdirSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { PageServer } from "spell/server/page"
import { ask } from "spell/server/test/serve"

import docsRoutes, { DOCS_HOME, DOCS_PREFIX, DocsFiles } from "spell/epic/tools/docsRoutes"

let root: string
let server: PageServer
let port: number

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), "docs-routes-"))
  mkdirSync(join(root, ".git"))
  server = new PageServer({ root })
  await docsRoutes.setup(server.routeContext())
  await server.start({ port: 0, routes: false, pidFile: false })
  port = server.info.port
})

afterAll(async () => {
  await server.stop()
  rmSync(root, { recursive: true, force: true })
})

/** GET `path`, as a navigation unless `headers` say otherwise */
function get(path: string, headers: Record<string, string> = { "Sec-Fetch-Dest": "document" }) {
  return ask(port, "GET", path, { headers })
}

describe("the Docs tab's pages", () => {
  test("its address leads to the landing page, README-epics", async () => {
    for (const path of ["/_epic/docs", "/_epic/docs/"]) {
      const answer = await get(path)
      expect(answer.status).toBe(302)
      expect(answer.headers.location).toBe(`${DOCS_PREFIX}${DOCS_HOME}`)
    }
  })

  test.each([`${DOCS_PREFIX}README-epics.md`, `${DOCS_PREFIX}epic/README-setup.md`])(
    "%s is a page, with the site header and the server's config",
    async (path) => {
      const answer = await get(path)
      expect(answer.status).toBe(200)
      expect(answer.headers["content-type"]).toMatch(/^text\/html/)
      expect(answer.text).toContain("<spell-site-header>")
      expect(answer.text).toContain("<ui-markdown")
      expect(answer.text).toContain("window.SPELL_SERVER")
    }
  )

  test("README-epics, read by its page:  its Markdown, links to other READMEs kept", async () => {
    const answer = await get(`${DOCS_PREFIX}README-epics.md?raw`, {})
    expect(answer.status).toBe(200)
    expect(answer.headers["content-type"]).toMatch(/^text\/markdown/)
    expect(answer.text).toMatch(/^# Epics/)
    expect(answer.text).toContain("](epic/README-setup.md)")
    expect(answer.text).toContain("](epic/README-setup.md#on-gitlab)")
    expect(answer.text).toContain("](epic/docs/images/epic-page.png)")
  })

  test("a script's read without ?raw gets the Markdown too (`Sec-Fetch-Dest: empty`)", async () => {
    const answer = await get(`${DOCS_PREFIX}epic/README-setup.md`, { "Sec-Fetch-Dest": "empty" })
    expect(answer.headers["content-type"]).toMatch(/^text\/markdown/)
  })

  test("each README README-epics links to is served, and links back up", async () => {
    const { text } = await get(`${DOCS_PREFIX}README-epics.md?raw`, {})
    const linked = new Set([...text.matchAll(/\]\((epic\/README[\w-]*\.md)/g)].map((match) => match[1]!))
    expect(linked.size).toBeGreaterThan(5)
    for (const path of linked) expect((await get(`${DOCS_PREFIX}${path}`)).status, path).toBe(200)
    const sub = await get(`${DOCS_PREFIX}epic/README.md?raw`, {})
    expect(sub.text).toContain("](README-pages.md)")
  })

  test("a link to a source file goes to GitHub;  addresses stay", () => {
    const markdown = DocsFiles.markdownFor("epic/README.md", join(DocsFiles.root, "epic/README.md"))
    expect(markdown).toContain("](https://github.com/spell-app/spell/blob/main/epic/src/AGENTS.md)")
    expect(markdown).not.toMatch(/\]\(src\//)
    expect(markdown).toContain("](README-pages.md)")
  })

  test("its pictures", async () => {
    const answer = await get(`${DOCS_PREFIX}epic/docs/images/epic-page.png`)
    expect(answer.status).toBe(200)
    expect(answer.headers["content-type"]).toBe("image/png")
  })

  test("under a worktree's address too", async () => {
    expect((await get(`/worktrees/w${DOCS_PREFIX}epic/README-faq.md`)).status).toBe(200)
  })

  test.each([`${DOCS_PREFIX}README.md`, `${DOCS_PREFIX}epic/src/AGENTS.md`, `${DOCS_PREFIX}../package.json`])(
    "nothing else:  %s",
    async (path) => {
      expect((await get(path)).status).toBe(404)
    }
  )
})
