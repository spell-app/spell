import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

import { afterAll, describe, expect, test } from "vite-plus/test"

import { SRV } from "spell/server"

/**
 * A checkout laid out as the kit is:  its install (`yarn.lock`, `node_modules/spell-ui` ...) at its root, with the
 * child repos inside it, and the docs' areas (`pages/`, `guides/`) as the page server serves them.
 * - Spell UI's repo, `spell-ui/`, and a kit's `src/server/` folder (`spell`, here in `spell-server/`):  what pages name,
 *   as `packages/ui/...`, `packages/server/...` (the old monorepo's spelling) or `spell-ui/...`.
 * - Made here:  a test never reads another repo's real files.
 */
const ROOT = realpathSync(mkdtempSync(join(tmpdir(), "linker-top-")))

/** Write an empty file (or `text`) at `path` under `ROOT`, making folders;  a `package.json` is `{}`, as node reads one. */
function put(path: string, text = ""): void {
  mkdirSync(dirname(join(ROOT, path)), { recursive: true })
  writeFileSync(join(ROOT, path), text)
}

for (const file of [
  "yarn.lock",
  "spell-ui/package.json",
  "spell-ui/AGENTS.md",
  "spell-ui/README.md",
  "spell-ui/tools/SiteCheck.ts",
  "spell-parser/package.json",
  "spell-parser/src/spell/spellSyntax.json",
  "epic/src/tool/Merged.ts",
  "spell-server/package.json",
  "spell-server/src/server/page/PageServer.ts",
  "tsconfig.base.json",
  "pages/index.html",
  "guides/index.html",
  "guides/spell-docs/spell-docs.md",
  "guides/spell-docs/details/x.html"
])
  put(file, file.endsWith("package.json") ? "{}" : "")
mkdirSync(join(ROOT, "node_modules"), { recursive: true })
symlinkSync(join(ROOT, "spell-ui"), join(ROOT, "node_modules", "spell-ui"))
symlinkSync(join(ROOT, "spell-server"), join(ROOT, "node_modules", "spell"))
afterAll(() => rmSync(ROOT, { recursive: true, force: true }))

/** Spell UI's `tools/`:  a package's folder outside its `src/`, in a child repo. */
const TOOLS = join(ROOT, "spell-ui/tools")

/** `epics/`:  epic pages. */
const EPICS = join(ROOT, "epics")

/** A page in `guides/spell-docs/`, two folders down from the root, as most pages are. */
const PAGE_DIR = join(ROOT, "guides", "spell-docs")

/** How a page links Spell UI's `SiteCheck.ts`, from any folder, and that link's target. */
const SITE_CHECK = 'href="/spell-ui/tools/SiteCheck.ts" target="src-spell-ui-tools-sitecheck-ts"'

/** One linker for every test:  its bare-name index is built once. */
const LINKER = new SRV.Linker(ROOT, { content: undefined })

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
  test("links a code span naming a real file by its ROOT PATH, with its own target", () => {
    expect(linked("<p><code>packages/ui/tools/SiteCheck.ts</code></p>")).toBe(
      `<p><a ${SITE_CHECK}><code>packages/ui/tools/SiteCheck.ts</code></a></p>`
    )
    // the new layout's own spelling (epic `repo-split` P8), and a root path:  the same file, the same link
    for (const span of ["spell-ui/tools/SiteCheck.ts", "/spell-ui/tools/SiteCheck.ts"])
      expect(linked(`<p><code>${span}</code></p>`)).toBe(`<p><a ${SITE_CHECK}><code>${span}</code></a></p>`)
  })

  test("links a file in the page's own folder by its name, one below it by its root path (Owen, P46 Q1)", () => {
    expect(linked("<code>spell-docs.md</code>")).toBe(
      '<a href="spell-docs.md" target="src-guides-spell-docs-spell-docs-md"><code>spell-docs.md</code></a>'
    )
    expect(linked("<code>details/x.html</code>")).toBe(
      '<a href="/guides/spell-docs/details/x.html" target="src-guides-spell-docs-details-x-html"><code>details/x.html</code></a>'
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

  test("links a folder with a trailing slash;  the page's own folder as `./`", () => {
    expect(linked("<code>packages/ui/tools</code>")).toBe(
      '<a href="/spell-ui/tools/" target="src-spell-ui-tools"><code>packages/ui/tools</code></a>'
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

  test("writes a relative link as its root path and targets it;  anchors and existing targets stay", () => {
    expect(
      linked('<a href="../index.html#links">i</a> <a href="#top">t</a> <a href="https://x.dev" target="x">x</a>')
    ).toBe(
      '<a href="/guides/index.html#links" target="src-guides-index-html">i</a> <a href="#top">t</a> ' +
        '<a href="https://x.dev" target="x">x</a>'
    )
  })

  test("leaves a short address alone:  the docs runtime and the epics tool take it (epic `epic-workflow` P15)", () => {
    const body = '<a href="SAGA:/drawable-spell/python-target#T1">t1</a>'
    expect(linked(body)).toBe(body)
    expect(LINKER.check(link(body).text, PAGE_DIR)).toEqual({ destinations: 0, problems: [] })
  })

  test("renames an epic page's old target to its epic id", () => {
    expect(linked('<a href="/epics/commands/commands.html#p7" target="src-old">plan</a>')).toBe(
      '<a href="/epics/commands/commands.html#p7" target="commands">plan</a>'
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

// epic `epic-engine` P46:  every local link a root path, the same text from any folder
describe("Linker.rootLinks()", () => {
  /** `text`'s rewrite, from `PAGE_DIR`. */
  const rooted = (text: string, options?: SRV.RootLinksOptions) => LINKER.rootLinks(text, PAGE_DIR, options)

  test("writes links as root paths, but to the page's own folder;  query and hash kept", () => {
    expect(
      rooted(
        '<a href="../../spell-ui/README.md#x">r</a> <a href="details/x.html?a=1">d</a> <a href="spell-docs.md">s</a> ' +
          '<a href="./spell-docs.md">s</a> <ui-breadcrumb link="../../pages/index.html">Docs</ui-breadcrumb>'
      ).text
    ).toBe(
      '<a href="/spell-ui/README.md#x">r</a> <a href="/guides/spell-docs/details/x.html?a=1">d</a> ' +
        '<a href="spell-docs.md">s</a> <a href="./spell-docs.md">s</a> ' +
        '<ui-breadcrumb link="/pages/index.html">Docs</ui-breadcrumb>'
    )
  })

  test("writes loads that climb as root paths;  a load below the page's folder stays", () => {
    expect(
      rooted(
        '<img src="../x.png"> <img src="shots/a.png"> <script src="_assets/site.js"></script> ' +
          '<link rel="stylesheet" href="../styles.css"> <section data-rows="../../spell-ui/a.json" data-fold="closed">'
      ).text
    ).toBe(
      '<img src="/guides/x.png"> <img src="shots/a.png"> <script src="_assets/site.js"></script> ' +
        '<link rel="stylesheet" href="/guides/styles.css"> <section data-rows="/spell-ui/a.json" data-fold="closed">'
    )
  })

  test("drops the site header's `root`, roots path tooltips, and never touches scripts, absolute URLs or placeholders", () => {
    const { text, changes } = rooted(
      '<spell-site-header root="../.."></spell-site-header> <code title="../../spell-ui/x.ts">x</code> ' +
        '<code title="a sentence">y</code> <script>const a = \'<a href="../x">\'</script> ' +
        '<a href="https://x.dev">x</a> <a href="mailto:a@b.c">m</a> <a href="#t3">t</a> <a href="${up}x.html">p</a>'
    )
    expect(text).toBe(
      '<spell-site-header></spell-site-header> <code title="/spell-ui/x.ts">x</code> ' +
        '<code title="a sentence">y</code> <script>const a = \'<a href="../x">\'</script> ' +
        '<a href="https://x.dev">x</a> <a href="mailto:a@b.c">m</a> <a href="#t3">t</a> <a href="${up}x.html">p</a>'
    )
    expect(changes.map((change) => change.kind)).toEqual(["dropped", "rooted"])
  })

  test("a part reads from its own folder;  a link above the root is left, and said", () => {
    const parts = join(ROOT, "epics", "seo", "parts")
    expect(LINKER.rootLinks('<a href="../../../spell-ui/x.ts">x</a> <a href="../a.png">a</a>', parts).text).toBe(
      '<a href="/spell-ui/x.ts">x</a> <a href="/epics/seo/a.png">a</a>'
    )
    expect(rooted('<a href="../../../x.ts">x</a>')).toEqual({
      text: '<a href="../../../x.ts">x</a>',
      changes: [{ from: "../../../x.ts", to: "../../../x.ts", kind: "outside" }]
    })
  })

  test("Markdown:  links and images, not code;  HTML in it too", () => {
    expect(
      rooted(
        "[a](../../spell-ui/README.md) ![s](../x.png) [d](details/x.html)\n`[c](../c.md)`\n```\n[c](../c.md)\n```\n" +
          '[ref]: ../../pages/index.html\n<a href="../index.html">i</a>\n',
        { markdown: true }
      ).text
    ).toBe(
      "[a](/spell-ui/README.md) ![s](/guides/x.png) [d](/guides/spell-docs/details/x.html)\n`[c](../c.md)`\n```\n" +
        '[c](../c.md)\n```\n[ref]: /pages/index.html\n<a href="/guides/index.html">i</a>\n'
    )
  })

  test("`mend`:  a link a move broke goes to its one new home;  one with none is written and said broken", () => {
    const { text, changes } = rooted(
      '<a href="../../spell-lang/src/spell/spellSyntax.json">s</a> <a href="../../packages/ui/tools/SiteCheck.ts">c</a> ' +
        '<a href="../../spell-lang/nowhere.ts">n</a>',
      { mend: true }
    )
    expect(text).toBe(
      '<a href="/spell-parser/src/spell/spellSyntax.json">s</a> <a href="/spell-ui/tools/SiteCheck.ts">c</a> ' +
        '<a href="/spell-lang/nowhere.ts">n</a>'
    )
    expect(changes.map((change) => change.kind)).toEqual(["mended", "mended", "broken"])
  })

  test("`mend`:  a child repo's old root path goes to its folder of the kit's ONE repo (epic `repo-split` P20)", () => {
    expect(rooted('<a href="../../spell-epic/src/tool/Merged.ts">m</a>', { mend: true }).text).toBe(
      '<a href="/epic/src/tool/Merged.ts">m</a>'
    )
  })

  test("is idempotent:  a second run changes nothing", () => {
    const first = rooted(
      '<a href="../index.html">i</a> <img src="../x.png"> <spell-site-header root=".."></spell-site-header>'
    )
    expect(LINKER.rootLinks(first.text, PAGE_DIR)).toEqual({ text: first.text, changes: [] })
  })
})

describe("Linker.resolve()", () => {
  test("resolves against the page's folder, the root (a root path too), `packages/`, `#name/` aliases and bare file names", () => {
    expect(LINKER.resolve("spell-docs.md", PAGE_DIR)).toBe(join(PAGE_DIR, "spell-docs.md"))
    expect(LINKER.resolve("tsconfig.base.json")).toBe(join(ROOT, "tsconfig.base.json"))
    expect(LINKER.resolve("/spell-ui/tools/SiteCheck.ts")).toBe(join(TOOLS, "SiteCheck.ts"))
    expect(LINKER.resolve("ui/tools/SiteCheck.ts")).toBe(join(TOOLS, "SiteCheck.ts"))
    expect(LINKER.resolve("#ui/../tools/SiteCheck.ts")).toBe(join(TOOLS, "SiteCheck.ts"))
    expect(LINKER.resolve("PageServer.ts")).toBe(join(ROOT, "spell-server/src/server/page/PageServer.ts"))
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

describe("Linker.fileFor()", () => {
  test("reads a root path from the root, a relative one from the page;  query, hash and `%20` handled", () => {
    expect(LINKER.fileFor("/spell-ui/tools/SiteCheck.ts#L3", PAGE_DIR)).toBe(join(TOOLS, "SiteCheck.ts"))
    expect(LINKER.fileFor("details/x.html?a=1", PAGE_DIR)).toBe(join(PAGE_DIR, "details", "x.html"))
    expect(LINKER.fileFor("/guides/a%20b.html", PAGE_DIR)).toBe(join(ROOT, "guides", "a b.html"))
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
      '<code>packages/ui/AGENTS.md</code> <a href="/pages/index.html" target="_self">i</a> <pre><a href="../nope.html">x</a></pre>'
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
      "missing:  /etc/hosts",
      "no target:  https://x.dev"
    ])
  })

  test("refuses a relative link, naming its root path, and a site header's `root` (epic `epic-engine` P46)", () => {
    const { problems } = LINKER.check(
      '<spell-site-header root="../.."></spell-site-header> <a href="../index.html" target="i">i</a>',
      PAGE_DIR
    )
    expect(problems).toEqual([
      'site header root:  root="../.." -- drop it, pages are served',
      "relative:  ../index.html -- write /guides/index.html"
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
  /** A linker that serves the kit's `src/server/` at `/srv/`, as the page server serves a component set. */
  const served = new SRV.Linker(ROOT, { served: { srv: "spell-server/src/server" }, content: undefined })

  /** A page in the server's `page/`, served at `/srv/page/`. */
  const dir = served.servedDir(join(ROOT, "spell-server", "src", "server", "page"))

  test("puts a page in a served folder at its address;  any other page stays where it is", () => {
    expect(dir).toBe(join(ROOT, "srv", "page"))
    expect(served.servedDir(PAGE_DIR)).toBe(PAGE_DIR)
  })

  test("writes its links as from its address:  out of the folder by root path, inside it as siblings", () => {
    const { text } = served.link(
      "<p><code>packages/ui/tools/SiteCheck.ts</code> <code>packages/server/src/page/PageServer.ts</code></p>",
      dir
    )
    expect(text).toBe(
      '<p><a href="/spell-ui/tools/SiteCheck.ts" target="src-spell-ui-tools-sitecheck-ts">' +
        "<code>packages/ui/tools/SiteCheck.ts</code></a> " +
        '<a href="PageServer.ts" target="src-spell-server-src-server-page-pageserver-ts">' +
        "<code>packages/server/src/page/PageServer.ts</code></a></p>"
    )
    expect(served.check(text, dir)).toEqual({ destinations: 2, problems: [] })
    // a root path to the address is the folder it serves
    expect(served.fileFor("/srv/page/PageServer.ts", PAGE_DIR)).toBe(
      join(ROOT, "spell-server/src/server/page/PageServer.ts")
    )
  })

  test("reads its relative links from its address:  a link written from its file's folder lands elsewhere", () => {
    expect(served.rootPathFor("../../../docs/tools/pages.js", dir)).toBe(undefined)
    expect(served.rootPathFor("../x.ts", dir)).toBe("/srv/x.ts")
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

  test("links a content page as served under the checkout:  root paths, the same targets as through a link", () => {
    const { text, unresolved } = linker.link(
      "<p><code>packages/a/src/A.ts</code> <code>epics/y/y.plan.html</code> <code>guides/g.html</code></p>",
      page
    )
    expect(unresolved).toEqual([])
    expect(text).toBe(
      '<p><a href="/packages/a/src/A.ts" target="src-packages-a-src-a-ts"><code>packages/a/src/A.ts</code></a> ' +
        '<a href="/epics/y/y.plan.html" target="y"><code>epics/y/y.plan.html</code></a> ' +
        '<a href="/guides/g.html" target="src-guides-g-html"><code>guides/g.html</code></a></p>'
    )
    // the page's folder given either way
    expect(linker.link("<p><code>guides/g.html</code></p>", join(root, "epics", "x")).text).toContain(
      'href="/guides/g.html"'
    )
    expect(linker.check(text, page)).toEqual({ destinations: 3, problems: [] })
    // a relative link from the content page:  its root path, where the server serves it
    expect(linker.rootPathFor("../../guides/g.html", page)).toBe("/guides/g.html")
  })

  test("checks a content page's links:  missing ones reported, the content repo's packages/ never the checkout's", () => {
    const { problems } = linker.check(
      '<a href="/guides/nope.html" target="a">1</a> <a href="/packages/docs/old.html" target="b">2</a>',
      page
    )
    expect(problems).toEqual(["missing:  /guides/nope.html", "missing:  /packages/docs/old.html"])
  })

  test("a link of the checkout's into the content folder that leads nowhere here:  the content folder's file", () => {
    // a worktree's `agents/PAPERCUTS.md`, made for a content folder beside it
    mkdirSync(join(root, "agents"), { recursive: true })
    mkdirSync(join(content, "agents"), { recursive: true })
    writeFileSync(join(content, "agents", "LOG.md"), "")
    symlinkSync(join(top, "nowhere", "LOG.md"), join(root, "agents", "LOG.md"))
    expect(linker.fileFor("/agents/LOG.md", page)).toBe(join(content, "agents", "LOG.md"))
  })
})
