/**
 * Tests of `tools/pages.js`' helpers for the docs tools' command lines.
 */
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { expect, test } from "vite-plus/test"

import { EPIC_UI } from "spell/epic/server/server.types.ts"
import { fakeMainCheckout } from "spell/server/test/checkouts"

import { CONTENT, EPIC_UI_DOCS, ROOT, pageAndId, pageAt, pagePath, runPagePath } from "spell/epic/tools/pages.js"

/** `src/tools/pages.js`, run in a child for another checkout (`EPIC_CHECKOUT` is read as it loads). */
const PAGES_JS = resolve(dirname(fileURLToPath(import.meta.url)), "../../src/tools/pages.js")

/** spell-epic's own `templates/`. */
const ENGINE_TEMPLATES = resolve(dirname(fileURLToPath(import.meta.url)), "../../templates")

// epic `epic-workflow` P19:  a docs page's comment named as an epic page's is, `seo#C3`
test("pageAndId():  `<page>#<id>` is the page and the id;  the two words read the same", () => {
  expect(pageAndId(["guides/x.html#C3", "on"])).toEqual(["guides/x.html", "C3", "on"])
  expect(pageAndId(["guides/x.html", "cm3", "on"])).toEqual(["guides/x.html", "cm3", "on"])
  expect(pageAndId(["guides/x.html#n3"])).toEqual(["guides/x.html", "n3"])
  expect(pageAndId([])).toEqual([])
})

// epic `epic-engine` P2 (T3):  Epic UI's pages take comments;  the tools name each by its served path, even in a
// checkout whose settings name no component sets (spell-epic's own, `ROOT` here)
test("Epic UI's pages are the engine's `src/docs/`, named `components/epics/...` as the page servers serve them", () => {
  expect(ROOT).toBe(resolve(dirname(fileURLToPath(import.meta.url)), "../.."))
  expect(EPIC_UI_DOCS).toBe(resolve(dirname(fileURLToPath(import.meta.url)), "../../src/docs"))
  expect(pagePath(join(EPIC_UI_DOCS, "epic-item.html"))).toBe(`${EPIC_UI.path}/epic-item.html`)
  expect(pageAt("components/epics/epic-item.html")).toBe(join(EPIC_UI_DOCS, "epic-item.html"))
})

// epic `epic-engine` P23:  a command run's folder holds no page;  the openers show its page, which the route serves
test("a command run's folder, or a file in it, is its page, `runs/<id>/`;  nothing else is", () => {
  const folder = join(CONTENT, "pages", "runs", "spell-translate-20261023-1912")
  expect(pagePath(folder)).toBe("runs/spell-translate-20261023-1912/")
  expect(runPagePath(join(folder, "run.json5"))).toBe("runs/spell-translate-20261023-1912/")
  expect(runPagePath(join(CONTENT, "pages", "runs"))).toBeUndefined()
  expect(runPagePath(join(CONTENT, "pages", "details", "x.html"))).toBeUndefined()
})

// epic `epic-engine`:  every component set's pages are named by their address, App UI's and Brand's too, as the epic
// server mounts them (`componentSetMounts()`);  the sets the checkout's settings name (epic `epic-engine` P8)
test("every component set the checkout's settings name is `components/<set>/...`, from its folder;  Epic UI the engine's", () => {
  const checkout = realpathSync(mkdtempSync(join(tmpdir(), "sets-")))
  try {
    const assets = "packages/ui/site/_assets"
    const componentSets = {
      ui: { name: "Spell UI", dir: "packages/ui/docs", assets },
      epics: { name: "Epic UI", dir: "epic/src/docs", assets },
      app: { name: "App UI", dir: "packages/app/docs", assets },
      brand: { name: "Brand", dir: "packages/brand/docs", assets }
    }
    writeFileSync(join(checkout, "package.json"), JSON.stringify({ pageServer: { componentSets } }))
    const at = (path) => join(checkout, path)
    const script = `
      import * as P from ${JSON.stringify(PAGES_JS)}
      console.log(JSON.stringify({
        ui: P.pagePath(${JSON.stringify(at("packages/ui/docs/x.html"))}),
        app: P.pagePath(${JSON.stringify(at("packages/app/docs/Chooser.inbox.json5"))}),
        brand: P.pageAt("components/brand/index.html"),
        uiAt: P.pageAt("components/ui/x.html"),
        epicUi: P.pagePath(P.EPIC_UI_DOCS + "/epic-item.html"),
        epicUiAt: P.pageAt("components/epics/epic-item.html"),
        code: P.pagePath(${JSON.stringify(at("packages/app/src/x.ts"))})
      }))`
    const run = (env) =>
      JSON.parse(
        execFileSync(process.execPath, ["--input-type=module", "-e", script], {
          encoding: "utf8",
          env: { ...process.env, EPIC_CHECKOUT: checkout, ...env }
        })
          .trim()
          .split("\n")
          .at(-1)
      )
    expect(run()).toEqual({
      ui: "components/ui/x.html",
      app: "components/app/Chooser.inbox.json5",
      brand: at("packages/brand/docs/index.html"),
      uiAt: at("packages/ui/docs/x.html"),
      epicUi: "components/epics/epic-item.html",
      epicUiAt: join(EPIC_UI_DOCS, "epic-item.html"),
      // their code isn't a set's
      code: "packages/app/src/x.ts"
    })
    // settings naming none:  only Epic UI is a set
    writeFileSync(join(checkout, "package.json"), "{}")
    expect(run()).toMatchObject({ ui: "packages/ui/docs/x.html", epicUi: "components/epics/epic-item.html" })
  } finally {
    rmSync(checkout, { recursive: true, force: true })
  }
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

// epic `epic-eject` P12:  the pages are the epic folder's, `contentFolder` in the repo's config, never through a
// link at the checkout's root;  a path through an older checkout's link names the same page
test("the epic folder holds the pages:  areas, page paths, files and URLs from it;  no links needed", () => {
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
    // an older checkout, still linking the epic folder's `epics` in at its root
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

// epic `epic-engine` I136:  `epic pages link /worktrees/<w>/components/ui/x.html` (a page as served) was refused
test("a SERVED path is the file it serves:  a set's address, a worktree's, the epic folder's", () => {
  const checkout = fakeMainCheckout(realpathSync(mkdtempSync(join(tmpdir(), "served-"))))
  try {
    const sets = { ui: { name: "UI", dir: "ui/docs", assets: "ui/site/_assets" } }
    mkdirSync(join(checkout, ".epic"))
    writeFileSync(join(checkout, ".epic", "config.json5"), '{ "contentFolder": "content", "worktreesFolder": "wt" }\n')
    for (const root of [checkout, join(checkout, "wt", "seo")]) {
      mkdirSync(join(root, "ui", "docs"), { recursive: true })
      writeFileSync(join(root, "package.json"), JSON.stringify({ pageServer: { componentSets: sets } }))
      writeFileSync(join(root, "ui", "docs", "ui-button.html"), "<title>Button</title>\n")
    }
    mkdirSync(join(checkout, "content", "epics", "x"), { recursive: true })
    writeFileSync(join(checkout, "content", "epics", "x", "x.plan.html"), "<title>X</title>\n")
    const script = `
      import * as P from ${JSON.stringify(PAGES_JS)}
      console.log(JSON.stringify([
        "/components/ui/ui-button.html",
        "/worktrees/seo/components/ui/ui-button.html",
        "/worktrees/seo/package.json",
        "/worktrees/seo/epics/x/x.plan.html",
        "/epics/x/x.plan.html",
        "/worktrees/nope/components/ui/ui-button.html",
        "/components/ui/nope.html"
      ].map((path) => P.pageFile(path))))`
    const out = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      encoding: "utf8",
      env: { ...process.env, EPIC_CHECKOUT: checkout }
    })
    expect(JSON.parse(out.trim().split("\n").at(-1))).toEqual([
      join(checkout, "ui", "docs", "ui-button.html"),
      join(checkout, "wt", "seo", "ui", "docs", "ui-button.html"),
      join(checkout, "wt", "seo", "package.json"),
      join(checkout, "content", "epics", "x", "x.plan.html"),
      join(checkout, "content", "epics", "x", "x.plan.html"),
      "/worktrees/nope/components/ui/ui-button.html",
      "/components/ui/nope.html"
    ])
  } finally {
    rmSync(checkout, { recursive: true, force: true })
  }
})
