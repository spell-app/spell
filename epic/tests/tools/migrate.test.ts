/**
 * Tests of `migrate.js`:
 * - the docs' page kinds and their migration steps (epic `epic-workflow`, P8)
 * - that the `epic` tool's copy of the comment anchor rules (`PlanAnchors`) agrees with `BlockAnchors.js`
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { parseHTML } from "linkedom"
import { afterEach, describe, expect, test } from "vite-plus/test"

import { PAGE_KINDS } from "spell-epic/tool/migrations"
import { PlanAnchors } from "spell-epic/tool/PlanAnchors"

import { anchorOf, blocksIn, excerptOf, findBlock } from "spell-epic/tools/BlockAnchors.js"
import { KINDS, migratePages, pageKind, pagesFor, report, STEPS, stepsFor } from "spell-epic/tools/migrate.js"
import { formattedAlready, tidy } from "spell-epic/tools/pages.js"

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/** A scratch checkout with `files` (`{ path: html }`) written into it:  its root. */
function checkout(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "docs-migrate-"))
  dirs.push(root)
  for (const [path, html] of Object.entries(files)) {
    mkdirSync(join(root, path, ".."), { recursive: true })
    writeFileSync(join(root, path), html)
  }
  return root
}

/** A page in the OLD section markup:  one `section.s2` with a heading id. */
const OLD_PAGE =
  '<!doctype html><html><body><main><section class="s2"><ui-sticky class="spell-h2"><h2 id="one">One</h2></ui-sticky>' +
  "<p>Words.</p></section></main></body></html>"

describe("page kinds", () => {
  test("the same kinds as the `epic` tool's", () => {
    expect(KINDS).toEqual([...PAGE_KINDS])
  })

  test("a page's kind:  from where it lives and what it loads", () => {
    const root = checkout({
      "guides/x/x.html": "<main></main>",
      // `<epic-page>` named in an attribute's text is no epic page (I25:  the epic tool's guide)
      "guides/tool.html": '<ui-step description="its data moves onto <epic-page>, its chrome dropped"></ui-step>',
      "sagas/s/s.saga.html": '<ui-root>\n  <epic-page kind="saga"></epic-page>\n</ui-root>',
      "sagas/index.html": "",
      "guides/c.html": '<div class="spell-filter"></div>',
      "guides/dev/commands/commands.html": '<script src="commands.js"></script><div class="spell-filter"></div>',
      "guides/changelog.html": "",
      "pages/index.html": "",
      "guides/index.html": "",
      "templates/durable.html": "",
      "templates/goals/index.html": "",
      "epics/seo/seo.plan.html": "<epic-page></epic-page>",
      "epics/seo/details/q1.html": "",
      // the epic `details`:  its page is in a folder called `details/`, and is no details page
      "epics/details/details.plan.html": "<epic-page></epic-page>",
      "epics/details/details/q1.html": "",
      "pages/details/pick.html": "",
      "pages/details/pick.rows.json": "[]",
      "brand/pony.html": "",
      "ui/button.html": ""
    })
    const kind = (path: string) => pageKind(join(root, path), root)
    expect(
      [
        "guides/x/x.html",
        "guides/tool.html",
        "sagas/s/s.saga.html",
        "sagas/index.html",
        "guides/c.html",
        "guides/dev/commands/commands.html",
        "guides/changelog.html",
        "pages/index.html",
        "guides/index.html",
        "templates/durable.html",
        "templates/goals/index.html",
        "epics/seo/seo.plan.html",
        "epics/seo/details/q1.html",
        "epics/details/details.plan.html",
        "epics/details/details/q1.html",
        "pages/details/pick.html",
        "brand/pony.html",
        "ui/button.html"
      ].map(kind)
    ).toEqual([
      "guide",
      "guide",
      // a saga page, though it's an `<epic-page>`:  `epic migrate` lists only epics' pages
      "goal",
      "list",
      "cheatsheet",
      "command",
      "changelog",
      "home",
      "list",
      "template",
      "goal-set",
      "epic",
      "detail",
      "epic",
      "detail",
      "choice",
      "brand",
      "component"
    ])
  })

  test("the steps:  each with a day and kinds;  a step for a kind;  an unknown step refused", () => {
    for (const step of STEPS) {
      expect(step.date).toMatch(/^\d{4}-\d\d-\d\d$/)
      expect(step.kinds.every((kind) => KINDS.includes(kind) && kind !== "epic")).toBe(true)
    }
    expect(stepsFor("cheatsheet").map((step) => step.name)).toEqual(["components-not-markup", "engine-asset-paths"])
    expect(stepsFor("goal-set").map((step) => step.name)).toEqual(["engine-asset-paths"])
    expect(() => stepsFor("guide", "nope")).toThrow(/no step "nope"/)
  })
})

describe("engine-asset-paths", () => {
  // epic `repo-split` I63:  the saga pages, the parked goal sets and a brand page still loaded these
  test("the engine's files by an old checkout path -> /_epic/;  a plain link and another file kept;  once", () => {
    const page =
      '<!doctype html><html><head><link rel="stylesheet" href="../../../packages/epics/tools/_assets/spell-doc.css" />' +
      '<link rel="stylesheet" href="../../../packages/brand/_assets/brand-pages.css" /></head><body>' +
      '<ui-root><ui-components source="../../packages/epics/pack/epics.pack.js"></ui-components>' +
      '<a href="../../../packages/epics/tools/_assets/spell-ui.js">its source</a></ui-root>' +
      '<script src="../../../packages/epics/tools/_assets/goals-live.js"></script></body></html>'
    const root = checkout({ "goals/spell/ai/ai.html": page, "sagas/s/s.saga.html": page })
    const pages = pagesFor(root)
    expect(pages.map(({ kind }) => kind)).toEqual(["goal-set", "goal"])
    const { results } = migratePages(pages, { tidied: false })
    expect(results[0]!.notes).toEqual([
      "engine-asset-paths:  ../../../packages/epics/tools/_assets/spell-doc.css -> /_epic/assets/spell-doc.css",
      "engine-asset-paths:  ../../../packages/epics/tools/_assets/goals-live.js -> /_epic/assets/goals-live.js",
      "engine-asset-paths:  ../../packages/epics/pack/epics.pack.js -> /_epic/pack/epics.pack.js"
    ])
    const html = readFileSync(join(root, "goals/spell/ai/ai.html"), "utf8")
    expect(html).toContain('href="/_epic/assets/spell-doc.css"')
    expect(html).toContain('href="../../../packages/brand/_assets/brand-pages.css"')
    expect(html).toContain('source="/_epic/pack/epics.pack.js"')
    expect(html).toContain('<a href="../../../packages/epics/tools/_assets/spell-ui.js">')
    expect(html).toContain('src="/_epic/assets/goals-live.js"')
    expect(migratePages(pagesFor(root), { tidied: false }).written).toEqual([])
  })
})

describe("migratePages", () => {
  // epic `epic-engine` I7:  oxfmt folds runs of spaces in text;  a page it didn't format before keeps them
  test("tidied:  a page not formatted before keeps its text's spacing;  a formatted one is formatted after", () => {
    const old = "<main><table><tr><td>a</td></tr></table></main>"
    const root = checkout({
      "guides/bedtime/bedtime.html": `<!doctype html><html><body><h1>Bedtime:  epic-workflow</h1>${old}</body></html>`,
      "guides/tidy/tidy.html": `<!doctype html><html><body><h1>Bedtime: epic-workflow</h1>${old}</body></html>`
    })
    const bedtime = join(root, "guides/bedtime/bedtime.html")
    const neat = join(root, "guides/tidy/tidy.html")
    expect(tidy([neat])).toBe(true)
    expect(formattedAlready([bedtime, neat])).toEqual([neat])

    const { written } = migratePages(pagesFor(root, "guide"))
    expect(written).toEqual([bedtime, neat])
    const html = readFileSync(bedtime, "utf8")
    expect(html).toContain("<h1>Bedtime:  epic-workflow</h1>")
    expect(html).toContain(`<ui-table celled padding="compact" appearance="striped" unstackable>`)
    expect(readFileSync(neat, "utf8")).toContain(`<ui-table celled padding="compact" appearance="striped" unstackable>`)
    expect(formattedAlready([bedtime, neat])).toEqual([neat])
  }, 60_000)

  test("components-not-markup:  bare tables and <details> asides in components, every <ui-table> unstackable, every other byte kept;  once", () => {
    const table = '<table id="sizes"><tr><th>a</th></tr><tr><td class="num right aligned">1</td></tr></table>'
    const guide =
      '<!doctype html><html><body><main><ui-section id="one" label="One"><p>Words.</p>' +
      table +
      "<ui-table celled><table><tr><td>kept</td></tr></table></ui-table>" +
      '<ui-table celled stack-by="container"><table><tr><td>a demo</td></tr></table></ui-table>' +
      '<table class="ui very basic table"><tr><td>its own look</td></tr></table>' +
      '<details id="why" class="extra"><summary>Why <code>x</code>?</summary><p>Because.</p></details>' +
      "<details open><summary>a.ts · 1 line</summary><pre><code>const a = 1</code></pre></details>" +
      "<details><p>No summary.</p></details>" +
      "<template><table><tr><td>an example</td></tr></table></template>" +
      "<epic-choice-rows><table><tr><td>its data</td></tr></table></epic-choice-rows>" +
      "</ui-section></main>" +
      '<script src="/_epic/assets/spell-ui.js"></script></body></html>'
    const root = checkout({
      "guides/x/x.html": guide,
      "guides/own/own.html": `<main><table><tr><td>a</td></tr></table></main><script>document.querySelector("main > table")</script>`,
      // its own script:  its tables stay where they are, but an attribute moves nothing
      "guides/drawn/drawn.html": `<main><ui-table padding="compact"><table><tr><td>a</td></tr></table></ui-table></main><script src="x.js"></script>`,
      "templates/durable.html": `<main>\n  ${table}\n</main>`
    })
    const pages = pagesFor(root)
    const dry = migratePages(pages, { dryRun: true, tidied: false })
    expect(readFileSync(join(root, "guides/x/x.html"), "utf8")).toBe(guide)
    expect(report(dry.results, root, { dryRun: true })).toEqual([
      "guides/drawn/drawn.html:  would run components-not-markup",
      "  components-not-markup:  1 <ui-table>s made unstackable",
      "guides/own/own.html:  nothing to change",
      "  components-not-markup:  LEFT for a person:  <table>:  the page runs its own inline script",
      "guides/x/x.html:  would run components-not-markup",
      `  components-not-markup:  1 tables -> <ui-table celled padding="compact" appearance="striped" unstackable>`,
      "  components-not-markup:  1 <ui-table>s made unstackable",
      `  components-not-markup:  2 <details> -> <ui-accordion appearance="styled">`,
      "  components-not-markup:  <details> in #one:  started open, now folded",
      "  components-not-markup:  LEFT for a person:  <ui-table> in #one:  asks to stack (a demo of stacking?)",
      "  components-not-markup:  LEFT for a person:  <table> in #one:  its own class (which <ui-table> look?)",
      "  components-not-markup:  LEFT for a person:  <table> in #one:  in <epic-choice-rows>, which reads its children",
      "  components-not-markup:  LEFT for a person:  <details> in #one:  no <summary> first",
      // a template:  this step's too
      "templates/durable.html:  would run components-not-markup",
      `  components-not-markup:  1 tables -> <ui-table celled padding="compact" appearance="striped" unstackable>`,
      "guides:  2 of 3 would change (components-not-markup 2)",
      "templates:  1 of 1 would change (components-not-markup 1)"
    ])

    expect(migratePages(pages, { tidied: false }).written).toEqual([
      join(root, "guides/drawn/drawn.html"),
      join(root, "guides/x/x.html"),
      join(root, "templates/durable.html")
    ])
    const html = readFileSync(join(root, "guides/x/x.html"), "utf8")
    expect(html).toContain(
      `<p>Words.</p><ui-table celled padding="compact" appearance="striped" unstackable>${table}</ui-table>`
    )
    expect(html).toContain("<ui-table celled unstackable><table><tr><td>kept</td></tr></table></ui-table>")
    expect(html).toContain('<ui-table celled stack-by="container"><table>')
    expect(readFileSync(join(root, "guides/drawn/drawn.html"), "utf8")).toContain(
      '<ui-table padding="compact" unstackable><table>'
    )
    expect(html).toContain('<table class="ui very basic table">')
    expect(html).toContain(
      '<ui-accordion id="why" class="spell-aside extra" appearance="styled"><ui-title>Why <code>x</code>?</ui-title>' +
        "<ui-content><p>Because.</p></ui-content></ui-accordion>"
    )
    expect(html).toContain(
      '<ui-accordion class="spell-code" appearance="styled"><ui-title>a.ts · 1 line</ui-title>' +
        "<ui-content><pre><code>const a = 1</code></pre></ui-content></ui-accordion>"
    )
    expect(html).toContain("<details><p>No summary.</p></details>")
    expect(html).toContain("<template><table><tr><td>an example</td></tr></table></template>")
    expect(html).toContain("<epic-choice-rows><table>")
    // a table starting a line:  laid out inside, as written by hand
    expect(readFileSync(join(root, "templates/durable.html"), "utf8")).toContain(
      `<main>\n  <ui-table celled padding="compact" appearance="striped" unstackable>\n    ${table}\n  </ui-table>\n</main>`
    )
    // every other byte:  the page as it was, the new elements taken out
    const unwrapped = html
      .replace(/<ui-table celled padding="compact" appearance="striped" unstackable>(.*?)<\/ui-table>/, "$1")
      .replace("<ui-table celled unstackable>", "<ui-table celled>")
      .replace(/<ui-accordion id="why"[^]*?<\/ui-accordion>/, "")
      .replace(/<ui-accordion class="spell-code"[^]*?<\/ui-accordion>/, "")
    const old = guide.replace(/<details id="why"[^]*?<\/details>/, "").replace(/<details open>[^]*?<\/details>/, "")
    expect(unwrapped.replace(/<!doctype html>/i, "")).toBe(old.replace(/<!doctype html>/i, ""))

    const again = migratePages(pages, { tidied: false })
    expect(again.written).toEqual([])
    expect(report(again.results, root).at(-2)).toBe("guides:  0 of 3 changed")
  })

  test("a parked saga page keeps the old markup:  only its engine paths are a step's", () => {
    const root = checkout({ "templates/goals/index.html": OLD_PAGE })
    expect(migratePages(pagesFor(root), { tidied: false }).written).toEqual([])
  })
})

describe("PlanAnchors agrees with BlockAnchors", () => {
  /** An epic page with every kind of block an anchor names. */
  const html =
    `<html><body><main><epic-page epic="x" title="X"><epic-overview id="overview"><epic-summary>s</epic-summary>` +
    `<p>Prose one.</p><epic-section id="o1" kind="overview-part" title="Why"><p>Why.</p><ul><li>a</li></ul></epic-section>` +
    `</epic-overview><epic-section id="phases" kind="phases">` +
    `<epic-phase id="p1" title="One"><epic-field name="goal"><ul><li>Goal <code>x</code> one.</li></ul></epic-field>` +
    `<epic-update at="2026-10-11 09:00" summary="s"><p>Changed.</p></epic-update>` +
    `<epic-field name="files"><p>Files.</p></epic-field></epic-phase>` +
    `<epic-phase id="p2" title="Two"><epic-field name="goal"><p>Two.</p></epic-field></epic-phase></epic-section>` +
    `<epic-section id="todos" kind="todos"><epic-item id="t1" title="Do"><p>Details.</p>` +
    `<epic-update at="2026-10-11 10:00"><p>Item update.</p></epic-update></epic-item></epic-section>` +
    `</epic-page></main></body></html>`

  test("the same blocks, anchors and excerpts;  a moved block found the same", () => {
    const document = parseHTML(html).document as unknown as Document
    const main = document.querySelector("main")!
    const blocks = blocksIn(main)
    expect(PlanAnchors.blocksIn(main)).toEqual(blocks)
    expect(blocks.map((block) => PlanAnchors.anchorOf(block))).toEqual(blocks.map((block) => anchorOf(block, main)))
    expect(blocks.map((block) => PlanAnchors.excerptOf(block))).toEqual(blocks.map((block) => excerptOf(block)))
    // p2's field, saved when it was p1's second:  both find it by its excerpt
    const moved = { anchor: "p1#field-3", excerpt: "Two." }
    expect(PlanAnchors.find(document, moved.anchor, moved.excerpt).block).toBe(findBlock(main, moved).block)
  })
})
