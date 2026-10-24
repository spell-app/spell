import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

import { afterAll, describe, expect, test } from "vite-plus/test"

import { SRV } from "spell/server"

/**
 * A top repo as `spell` is (epic `repo-split` P8):  its install (`yarn.lock`, `node_modules/spell-ui` ...) over the
 * repos beside the checkout, `spell-app/`, which these tests link pages in.
 * - Spell UI's repo, `spell-ui/`, and a kit's `src/server/` folder (`spell`, here in `spell-server/`):  what pages name,
 *   as `packages/ui/...`, `packages/server/...` (the old monorepo's spelling) or `spell-ui/...`.
 * - Made here:  a test never reads another repo's real files.
 */
const TOP = realpathSync(mkdtempSync(join(tmpdir(), "linker-top-")))

/** Write an empty file (or `text`) at `path` under `TOP`, making folders. */
function put(path: string, text = ""): void {
  mkdirSync(dirname(join(TOP, path)), { recursive: true })
  writeFileSync(join(TOP, path), text)
}

for (const file of [
  "yarn.lock",
  "spell-ui/package.json",
  "spell-ui/AGENTS.md",
  "spell-ui/README.md",
  "spell-ui/tools/SiteCheck.ts",
  "spell-server/package.json",
  "spell-server/src/server/page/PageServer.ts",
  "spell-app/tsconfig.base.json",
  "spell-app/pages/index.html",
  "spell-app/guides/index.html",
  "spell-app/guides/spell-docs/spell-docs.md"
])
  put(file)
mkdirSync(join(TOP, "node_modules"), { recursive: true })
symlinkSync(join(TOP, "spell-ui"), join(TOP, "node_modules", "spell-ui"))
symlinkSync(join(TOP, "spell-server"), join(TOP, "node_modules", "spell"))
afterAll(() => rmSync(TOP, { recursive: true, force: true }))

/** The checkout these tests link pages in:  spell-app, in the top repo. */
const ROOT = join(TOP, "spell-app")

/** Spell UI's `tools/`:  a package's folder outside its `src/`, in the repo beside the checkout. */
const TOOLS = join(TOP, "spell-ui/tools")

/** `epics/`:  epic pages. */
const EPICS = join(ROOT, "epics")

/** A page in `guides/spell-docs/`, two folders down from the root, as most pages are. */
const PAGE_DIR = join(ROOT, "guides", "spell-docs")

/** How a page in `PAGE_DIR` links Spell UI's `SiteCheck.ts`, and that link's target. */
const SITE_CHECK = 'href="../../../spell-ui/tools/SiteCheck.ts" target="src-spell-ui-tools-sitecheck-ts"'

/** One linker for every test:  its bare-name index is built once. */
const LINKER = new SRV.Linker(ROOT)

/** `body` linked as a page in `PAGE_DIR`. */
function link(body: string) {
  return LINKER.link(`<html><head><title>t</title></head><body>${body}</body></html>`, PAGE_DIR)
}

/** Just the `<body>` of `link(body)`'s page. */
function linked(body: string) {
  return /<body>([\s\S]*)<\/body>/.exec(link(body).text)?.[1]
}

////////////////
// ## Tests
////////////////

describe("Linker.link()", () => {
  test("links a code span naming a real file, relative to the page, with its own target", () => {
    expect(linked("<p><code>packages/ui/tools/SiteCheck.ts</code></p>")).toBe(
      `<p><a ${SITE_CHECK}><code>packages/ui/tools/SiteCheck.ts</code></a></p>`
    )
    // the new layout's own spelling, from the top repo (epic `repo-split` P8):  the same file, the same link
    expect(linked("<p><code>spell-ui/tools/SiteCheck.ts</code></p>")).toBe(
      `<p><a ${SITE_CHECK}><code>spell-ui/tools/SiteCheck.ts</code></a></p>`
    )
  })

  test("links a name with its path as its tooltip to that path, keeping the tooltip;  idempotent", () => {
    const span = '<code title="packages/ui/tools/SiteCheck.ts:12">ROOT</code>'
    const result = link(`<p>From ${span}.</p>`)
    expect(/<body>([\s\S]*)<\/body>/.exec(result.text)?.[1]).toBe(`<p>From <a ${SITE_CHECK}>${span}</a>.</p>`)
    expect(LINKER.link(result.text, PAGE_DIR).text).toBe(result.text)
    // the title is the path:  a name that's no file, under a title that's missing, is reported by its title
    expect(link('<code title="zz/missing.ts">pages.js</code>')).toMatchObject({
      linked: 0,
      unresolved: ["zz/missing.ts"]
    })
  })

  test("links a folder with a trailing slash", () => {
    expect(linked("<code>packages/ui/tools</code>")).toBe(
      '<a href="../../../spell-ui/tools/" target="src-spell-ui-tools"><code>packages/ui/tools</code></a>'
    )
    expect(linked("<code>guides/spell-docs</code>")).toBe(
      '<a href="./" target="src-guides-spell-docs"><code>guides/spell-docs</code></a>'
    )
  })

  test("NEVER links inside head, pre, script, style or an existing link", () => {
    const span = "<code>packages/ui/AGENTS.md</code>"
    const page = `<html><head><title>t</title>${span}</head><body><pre>${span}</pre><script>"${span}"</script><style>/*${span}*/</style></body></html>`
    expect(LINKER.link(page, PAGE_DIR)).toEqual({ text: page, linked: 0, unresolved: [] })
    expect(linked(`<a href="#x">${span}</a>`)).toBe(`<a href="#x">${span}</a>`)
  })

  test("reports unresolved path-like spans, sorted, and leaves paths outside the repo as text", () => {
    const result = link("<code>zz/missing.ts</code> <code>nope.md</code> <code>word</code> <code>/etc/hosts</code>")
    expect(result.linked).toBe(0)
    expect(result.unresolved).toEqual(["/etc/hosts", "nope.md", "zz/missing.ts"])
  })

  test("adds a target to a link without one, and leaves anchors and existing targets alone", () => {
    expect(
      linked('<a href="../index.html#links">i</a> <a href="#top">t</a> <a href="https://x.dev" target="x">x</a>')
    ).toBe(
      '<a href="../index.html#links" target="src-guides-index-html">i</a> <a href="#top">t</a> ' +
        '<a href="https://x.dev" target="x">x</a>'
    )
  })

  test("leaves a short address alone:  the docs runtime and the epics tool take it (epic `epic-workflow` P15)", () => {
    const body = '<a href="SAGA:/drawable-spell/python-target#T1">t1</a>'
    expect(linked(body)).toBe(body)
    expect(LINKER.check(link(body).text, PAGE_DIR)).toEqual({ destinations: 0, problems: [] })
  })

  test("renames an epic page's old target to its epic id", () => {
    expect(linked('<a href="../epics/commands/commands.html#p7" target="src-old">plan</a>')).toBe(
      '<a href="../epics/commands/commands.html#p7" target="commands">plan</a>'
    )
  })

  test("is idempotent:  a second run changes nothing", () => {
    const first = link(
      '<code>packages/ui/AGENTS.md</code> <code>packages/ui/tools</code> <a href="../index.html">i</a> <code>zz/x.ts</code>'
    )
    expect(first.linked).toBe(2)
    const second = LINKER.link(first.text, PAGE_DIR)
    expect(second.text).toBe(first.text)
    expect(second.linked).toBe(0)
  })
})

describe("Linker.resolve()", () => {
  test("resolves against the page's folder, the repo root, `packages/`, the top repo, `#name/` aliases and bare file names", () => {
    // a content folder's file is found where it is, not through the checkout's old link (epic `epic-eject` P12)
    const guides = LINKER.content ? join(LINKER.content, "guides", "spell-docs") : PAGE_DIR
    expect(LINKER.resolve("spell-docs.md", PAGE_DIR)).toBe(join(guides, "spell-docs.md"))
    expect(LINKER.resolve("tsconfig.base.json")).toBe(join(ROOT, "tsconfig.base.json"))
    expect(LINKER.resolve("ui/tools/SiteCheck.ts")).toBe(join(TOOLS, "SiteCheck.ts"))
    expect(LINKER.resolve("#ui/../tools/SiteCheck.ts")).toBe(join(TOOLS, "SiteCheck.ts"))
    expect(LINKER.resolve("PageServer.ts")).toBe(join(TOP, "spell-server/src/server/page/PageServer.ts"))
    expect(LINKER.resolve("spell-ui/tools/SiteCheck.ts")).toBe(join(TOOLS, "SiteCheck.ts"))
    expect(LINKER.resolve("packages/ui/tools/SiteCheck.ts:12")).toBe(join(TOOLS, "SiteCheck.ts"))
    expect(LINKER.resolve("packages&#47;ui/tools/SiteCheck.ts")).toBe(join(TOOLS, "SiteCheck.ts"))
  })

  test("names special spans and solidjs.com pages, and leaves operators, words and unknown files alone", () => {
    expect(LINKER.resolve("solidjs/solid")).toBe("https://github.com/solidjs/solid/tree/next")
    expect(LINKER.resolve("solidjs.com/docs")).toBe("https://solidjs.com/docs")
    for (const text of ["/", "./", "..", "foo", "nope/missing.ts", "$/util/index.ts"])
      expect(LINKER.resolve(text)).toBe(undefined)
  })

  test("in a plain repo with no `packages/` (spell-epic's, epic `epic-engine` I14):  its own `src/`, nothing thrown", () => {
    const plain = mkdtempSync(join(tmpdir(), "linker-plain-"))
    try {
      mkdirSync(join(plain, "src", "tool"), { recursive: true })
      writeFileSync(join(plain, "src", "tool", "PlanDocFiles.ts"), "export {}\n")
      const linker = new SRV.Linker(plain)
      expect(linker.resolve("PlanDocFiles.ts")).toBe(join(plain, "src", "tool", "PlanDocFiles.ts"))
      expect(linker.resolve("nowhere.ts")).toBe(undefined)
    } finally {
      rmSync(plain, { recursive: true, force: true })
    }
  })
})

describe("Linker.targetFor()", () => {
  test("names URLs ext-<slug>, epic pages by epic id, everything else src-<repo-relative slug>, at most 80 characters", () => {
    expect(LINKER.targetFor("https://www.example.com/a/b?c=1")).toBe("ext-example-com-a-b-c-1")
    expect(LINKER.targetFor("http://example.com/")).toBe("ext-example-com")
    expect(LINKER.targetFor(join(EPICS, "commands/commands.html"))).toBe("commands")
    expect(LINKER.targetFor(join(EPICS, "commands/commands.plan.html"))).toBe("commands")
    expect(LINKER.targetFor(join(ROOT, "packages/docs/content/epics/commands/commands.plan.html"))).toBe("commands")
    expect(LINKER.targetFor(join(EPICS, "commands/notes.html"))).toBe("src-epics-commands-notes-html")
    expect(LINKER.targetFor(`https://example.com/${"x".repeat(100)}`)).toHaveLength(84)
  })
})

describe("Linker.check()", () => {
  test("passes linked pages, `_self` links and anything inside <pre>", () => {
    const page = link(
      '<code>packages/ui/AGENTS.md</code> <a href="../../pages/index.html" target="_self">i</a> <pre><a href="nope.html">x</a></pre>'
    ).text
    expect(LINKER.check(page, PAGE_DIR)).toEqual({ destinations: 1, problems: [] })
  })

  test("fails missing files, files outside the repo, links with no target, nested links", () => {
    const { problems } = LINKER.check(
      '<a href="nope.html" target="a">x</a> <a href="/etc/hosts" target="b">h</a> ' +
        '<a href="https://x.dev">x</a> <a href="https://y.dev" target="y"> <a href="https://z.dev" target="z">z</a></a>',
      PAGE_DIR
    )
    expect(problems).toEqual([
      "1 nested links",
      "missing:  nope.html",
      "outside repo:  /etc/hosts",
      "no target:  https://x.dev"
    ])
  })

  test("fails one destination with several targets, and one target with several destinations", () => {
    const { problems } = LINKER.check(
      '<a href="https://x.dev" target="a">1</a> <a href="https://x.dev" target="b">2</a> <a href="https://y.dev" target="b">3</a>',
      PAGE_DIR
    )
    expect(problems).toEqual([
      "several targets for https://x.dev:  a, b",
      "target b shared by https://x.dev, https://y.dev"
    ])
  })
})

describe("Linker served folders", () => {
  /** A linker that serves the kit's `src/server/` (beside the checkout) at `/srv/`, as the page server serves a component set. */
  const served = new SRV.Linker(ROOT, { served: { srv: "../spell-server/src/server" } })

  /** A page in the server's `page/`, served at `/srv/page/`. */
  const dir = served.servedDir(join(TOP, "spell-server", "src", "server", "page"))

  test("puts a page in a served folder at its address;  any other page stays where it is", () => {
    expect(dir).toBe(join(ROOT, "srv", "page"))
    expect(served.servedDir(PAGE_DIR)).toBe(PAGE_DIR)
  })

  test("writes its links as from its address:  out of the folder through the root, inside it as siblings", () => {
    const { text } = served.link(
      "<p><code>packages/ui/tools/SiteCheck.ts</code> <code>packages/server/src/page/PageServer.ts</code></p>",
      dir
    )
    expect(text).toBe(
      '<p><a href="../../../spell-ui/tools/SiteCheck.ts" target="src-spell-ui-tools-sitecheck-ts">' +
        "<code>packages/ui/tools/SiteCheck.ts</code></a> " +
        '<a href="PageServer.ts" target="src-spell-server-src-server-page-pageserver-ts">' +
        "<code>packages/server/src/page/PageServer.ts</code></a></p>"
    )
    expect(served.check(text, dir)).toEqual({ destinations: 2, problems: [] })
  })

  test("checks its links from its address:  a link written from its file's folder is missing", () => {
    const { problems } = served.check('<a href="../../../docs/tools/pages.js" target="x">p</a>', dir)
    expect(problems).toEqual(["missing:  ../../../docs/tools/pages.js"])
  })
})

// epic `epic-eject` P12:  the shared content in a folder of its own, with no link at the checkout's root
describe("Linker content folder", () => {
  const top = mkdtempSync(join(tmpdir(), "linker-content-"))
  const root = join(top, "app")
  const content = join(top, "app.epics")
  afterAll(() => rmSync(top, { recursive: true, force: true }))
  for (const file of [
    "app/packages/a/src/A.ts",
    "app.epics/epics/x/x.plan.html",
    "app.epics/epics/y/y.plan.html",
    "app.epics/guides/g.html",
    // the content repo's own `packages/`:  never the checkout's
    "app.epics/packages/docs/old.html"
  ]) {
    mkdirSync(dirname(join(top, file)), { recursive: true })
    writeFileSync(join(top, file), "")
  }
  const linker = new SRV.Linker(root, { content })
  const page = join(content, "epics", "x")

  test("links a content page as from its place in the checkout:  the same hrefs and targets as through a link", () => {
    const { text, unresolved } = linker.link(
      "<p><code>packages/a/src/A.ts</code> <code>epics/y/y.plan.html</code> <code>guides/g.html</code></p>",
      page
    )
    expect(unresolved).toEqual([])
    expect(text).toBe(
      '<p><a href="../../packages/a/src/A.ts" target="src-packages-a-src-a-ts"><code>packages/a/src/A.ts</code></a> ' +
        '<a href="../y/y.plan.html" target="y"><code>epics/y/y.plan.html</code></a> ' +
        '<a href="../../guides/g.html" target="src-guides-g-html"><code>guides/g.html</code></a></p>'
    )
    // the page's folder given either way
    expect(linker.link("<p><code>guides/g.html</code></p>", join(root, "epics", "x")).text).toContain(
      'href="../../guides/g.html"'
    )
    expect(linker.check(text, page)).toEqual({ destinations: 3, problems: [] })
  })

  test("checks a content page's links:  missing ones reported, the content repo's packages/ never the checkout's", () => {
    const { problems } = linker.check(
      '<a href="../../guides/nope.html" target="a">1</a> <a href="../../packages/docs/old.html" target="b">2</a>',
      page
    )
    expect(problems).toEqual(["missing:  ../../guides/nope.html", "missing:  ../../packages/docs/old.html"])
  })
})
