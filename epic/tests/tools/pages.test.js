/**
 * Tests of `tools/pages.js`' helpers for the docs tools' command lines.
 */
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { expect, test } from "vite-plus/test"

import { pageAndId } from "../../src/tools/pages.js"

/** `src/tools/pages.js`, run in a child for another checkout (`EPIC_CHECKOUT` is read as it loads). */
const PAGES_JS = resolve(dirname(fileURLToPath(import.meta.url)), "../../src/tools/pages.js")

/** spell-epic's own `templates/`. */
const ENGINE_TEMPLATES = resolve(dirname(fileURLToPath(import.meta.url)), "../../templates")

// epic `epic-workflow` P19:  a docs page's comment named as an epic page's is, `seo#M3`
test("pageAndId():  `<page>#<id>` is the page and the id;  the two words read the same", () => {
  expect(pageAndId(["guides/x.html#M3", "on"])).toEqual(["guides/x.html", "M3", "on"])
  expect(pageAndId(["guides/x.html", "cm3", "on"])).toEqual(["guides/x.html", "cm3", "on"])
  expect(pageAndId(["guides/x.html#n3"])).toEqual(["guides/x.html", "n3"])
  expect(pageAndId([])).toEqual([])
})

// epic `epic-eject` T11:  every template is the engine's, spell-epic's own `templates/`, whichever checkout the tools
// work on;  its pages are `templates/...` all the same, as both page servers serve them
test("the templates are the engine's:  `templates/...` paths, wherever the checkout is;  the repo's own first", () => {
  const checkout = realpathSync(mkdtempSync(join(tmpdir(), "templates-")))
  try {
    mkdirSync(join(checkout, ".epic"))
    mkdirSync(join(checkout, "docs", "templates"), { recursive: true })
    writeFileSync(join(checkout, ".epic", "config.json5"), '{ "repoTemplates": "docs/templates" }\n')
    writeFileSync(join(checkout, "docs", "templates", "durable.html"), "<title>Ours</title>\n")
    writeFileSync(join(checkout, "docs", "templates", "extra.html"), "<title>Extra</title>\n")
    const script = `
      import * as P from ${JSON.stringify(PAGES_JS)}
      console.log(JSON.stringify({
        templates: P.TEMPLATES,
        repo: P.REPO_TEMPLATES,
        areas: P.AREAS.includes(P.REPO_TEMPLATES),
        path: P.pagePath(P.TEMPLATES + "/goals/index.html"),
        folder: P.pagePath(P.TEMPLATES),
        guide: P.pagePath(${JSON.stringify(join(checkout, "guides", "x.html"))}),
        at: P.pageAt("templates/review.html"),
        file: P.pageFile("templates/review.html"),
        url: P.serverUrl("http://h", P.TEMPLATES + "/review.html"),
        ours: P.templateFile("durable"),
        engine: P.templateFile("templates/review.html"),
        md: P.templateFile("epics/plan-doc.md"),
        none: P.templateFile("nope") ?? null
      }))`
    const out = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      encoding: "utf8",
      env: { ...process.env, EPIC_CHECKOUT: checkout }
    })
    const got = JSON.parse(out.trim().split("\n").at(-1))
    expect(got.templates).toBe(ENGINE_TEMPLATES)
    expect(got.repo).toBe(join(checkout, "docs", "templates"))
    expect(got.areas).toBe(true)
    expect(got.path).toBe("templates/goals/index.html")
    expect(got.folder).toBe("templates")
    expect(got.guide).toBe("guides/x.html")
    expect(got.at).toBe(join(ENGINE_TEMPLATES, "review.html"))
    expect(got.file).toBe(join(ENGINE_TEMPLATES, "review.html"))
    expect(got.url).toBe("http://h/templates/review.html")
    expect(got.ours).toBe(join(checkout, "docs", "templates", "durable.html"))
    expect(got.engine).toBe(join(ENGINE_TEMPLATES, "review.html"))
    expect(got.md).toBe(join(ENGINE_TEMPLATES, "epics", "plan-doc.md"))
    expect(got.none).toBeNull()
  } finally {
    rmSync(checkout, { recursive: true, force: true })
  }
})

// epic `epic-eject` P12:  the pages are the content folder's, `contentFolder` in the repo's config, never through a
// link at the checkout's root;  a path through an older checkout's link names the same page
test("the content folder holds the pages:  areas, page paths, files and URLs from it;  no links needed", () => {
  const top = realpathSync(mkdtempSync(join(tmpdir(), "content-")))
  const checkout = join(top, "repo")
  const content = join(top, "repo.epics")
  const older = join(top, "older")
  try {
    const put = (path, text = "<title>x</title>\n") => {
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, text)
    }
    put(join(checkout, ".epic", "config.json5"), '{ "contentFolder": "../repo.epics" }\n')
    put(join(checkout, "packages", "brand", "x.html"))
    put(join(content, "guides", "x.html"))
    put(join(content, "epics", "seo", "seo.plan.html"))
    put(join(content, "pages", "index.html"))
    // an older checkout, still linking the content folder's `epics` in at its root
    mkdirSync(older)
    symlinkSync(join(content, "epics"), join(older, "epics"))
    const through = join(older, "epics", "seo", "seo.plan.html")
    const script = `
      import * as P from ${JSON.stringify(PAGES_JS)}
      console.log(JSON.stringify({
        content: P.CONTENT,
        areas: [P.EPICS, P.GUIDES, P.PAGES, P.BRAND, P.GOALS, P.SAGAS, P.HOME],
        guide: P.pagePath(${JSON.stringify(join(content, "guides", "x.html"))}),
        through: P.pagePath(${JSON.stringify(through)}),
        checkoutFile: P.pagePath(${JSON.stringify(join(checkout, "packages", "brand", "x.html"))}),
        at: P.pageAt("guides/x.html"),
        atNew: P.pageAt("epics/new/new.plan.html"),
        atCheckout: P.pageAt("packages/brand/x.html"),
        file: P.pageFile("guides/x.html"),
        fromArea: P.pageFile("x.html"),
        fileThrough: P.pageFile(${JSON.stringify(through)}),
        inContent: P.inContent(${JSON.stringify(through)}),
        url: P.serverUrl("http://h", ${JSON.stringify(through)}),
        found: P.findPages().filter((file) => !file.startsWith(P.TEMPLATES))
      }))`
    const out = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      encoding: "utf8",
      env: { ...process.env, EPIC_CHECKOUT: checkout }
    })
    const got = JSON.parse(out.trim().split("\n").at(-1))
    expect(existsSync(join(checkout, "epics"))).toBe(false)
    expect(got.content).toBe(content)
    expect(got.areas).toEqual(
      ["epics", "guides", "pages", "brand", "goals", "sagas", "pages/index.html"].map((path) => join(content, path))
    )
    expect(got.guide).toBe("guides/x.html")
    expect(got.through).toBe("epics/seo/seo.plan.html")
    expect(got.checkoutFile).toBe("packages/brand/x.html")
    expect(got.at).toBe(join(content, "guides", "x.html"))
    expect(got.atNew).toBe(join(content, "epics", "new", "new.plan.html"))
    expect(got.atCheckout).toBe(join(checkout, "packages", "brand", "x.html"))
    expect(got.file).toBe(join(content, "guides", "x.html"))
    expect(got.fromArea).toBe(join(content, "guides", "x.html"))
    expect(got.fileThrough).toBe(join(content, "epics", "seo", "seo.plan.html"))
    expect(got.inContent).toBe(join(content, "epics", "seo", "seo.plan.html"))
    expect(got.url).toBe("http://h/epics/seo/seo.plan.html")
    expect(got.found).toEqual(
      ["pages/index.html", "guides/x.html", "epics/seo/seo.plan.html"].map((path) => join(content, path))
    )
  } finally {
    rmSync(top, { recursive: true, force: true })
  }
})
