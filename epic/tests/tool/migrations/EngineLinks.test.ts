/**
 * Tests of the migration `engine-links` (epic `epic-engine` I27):  an epic page's dead links to the engine's old
 * places in spell-app lead to its new ones (as served:  `spell-epic/...`, Epic UI at `components/epics/`), their tab
 * names with them;  a gone file's link back to plain text;  a dead link with no move, or whose new place isn't there,
 * left and reported;  live links untouched;  a second run changing nothing.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

import { parseHTML } from "linkedom"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { AS } from "spell-kit/assembler"
import type { MigrationContext } from "$/epics/tool/migrations/migrations.types"
import { Migrations } from "$/epics/tool/migrations/Migrations"

/** The step under test. */
const STEP = Migrations.named("engine-links")!

/** A scratch spell-app checkout, `app/`, beside its content folder, `content/`. */
const scratch = mkdtempSync(join(tmpdir(), "engine-links-"))
afterAll(() => rmSync(scratch, { recursive: true, force: true }))
const app = join(scratch, "app")
const content = join(scratch, "content")

/** Write a file at `path`, from `base`, making its folders. */
function put(base: string, path: string): void {
  mkdirSync(dirname(join(base, path)), { recursive: true })
  writeFileSync(join(base, path), "x")
}
put(app, "spell-epic/src/tools/pages.js")
put(app, "spell-epic/skills/epic/SKILL.md")
put(app, "spell-epic/src/docs/epic-item.html")
put(app, "spell-epic/src/tools/check-spell.js")
put(app, "packages/spell/src/rules/BlockLine.ts")
put(content, "epics/seo/seo.plan.html")
put(content, "epics/seo/parts/o1.html")

/** The page's linker, as `PlanDocFiles` makes it:  under spell-app's checkout, Epic UI served at its address. */
const linker = new AS.Linker(app, { served: { "components/epics": "spell-epic/src/docs" }, content })

/** epic `seo`'s page, holding `links`. */
function page(links: string): Document {
  return parseHTML(
    `<html><body><main><epic-page epic="seo" title="SEO"><epic-section id="todos" kind="todos">` +
      `<epic-item id="t1" title="Links" status="open"><p>${links}</p></epic-item>` +
      `</epic-section></epic-page></main></body></html>`
  ).document as unknown as Document
}

/** A context for epic `seo`'s page, its notes gathered. */
function context(): MigrationContext & { notes: string[] } {
  return { now: new Date(2026, 9, 19), folder: join(content, "epics/seo"), root: content, linker, notes: [] }
}

describe("engine-links", () => {
  test("named, dated, on command only (not every edit), after engine-asset-routes", () => {
    expect([STEP.kind, STEP.date, STEP.everyEdit]).toEqual(["epic", "2026-10-19", false])
    expect(Migrations.all.indexOf(STEP)).toBe(Migrations.all.indexOf(Migrations.named("engine-asset-routes")!) + 1)
  })

  test("a dead link to the engine's old place leads to its new one, its tab and #hash with it", () => {
    const doc = page(
      `<a href="../../packages/epics/tools/pages.js" target="src-packages-epics-tools-pages-js"><code>pages.js</code></a>` +
        `<a href="../../.claude/skills/epic/SKILL.md#rules" target="src-claude-skills-epic-skill-md">skill</a>` +
        `<a href="../../packages/epics/tools">tools</a>` +
        `<a href="../../packages/epics/docs/epic-item.html" target="src-packages-epics-docs-epic-item-html">item</a>` +
        `<a href="parts/o1.htm" target="custom">o1</a>`
    )
    const ctx = context()
    expect(STEP.run(doc, ctx)).toBe(true)
    expect(Array.from(doc.querySelectorAll("a"), (a) => [a.getAttribute("href"), a.getAttribute("target")])).toEqual([
      ["../../spell-epic/src/tools/pages.js", "src-spell-epic-src-tools-pages-js"],
      ["../../spell-epic/skills/epic/SKILL.md#rules", "src-spell-epic-skills-epic-skill-md"],
      ["../../spell-epic/src/tools", "src-spell-epic-src-tools"],
      // Epic UI at its served address;  its tab named for the folder it serves, as the linker names it
      ["../../components/epics/epic-item.html", "src-spell-epic-src-docs-epic-item-html"],
      // a part as named before Q12;  a tab name the linker didn't make is kept
      ["parts/o1.html", "custom"]
    ])
    expect(doc.querySelector("a code")!.textContent).toBe("pages.js")
    expect(ctx.notes).toContain(
      "engine-links:  ../../packages/epics/tools/pages.js -> ../../spell-epic/src/tools/pages.js"
    )
    // twice:  nothing more
    expect(STEP.run(doc, context())).toBe(false)
  })

  test("a link ONE folder too deep (I34) leads to the same tail from the checkout's root, or where that moved", () => {
    const doc = page(
      `<a href="../../../packages/spell/src/rules/BlockLine.ts" target="src-packages-spell-src-rules-blockline-ts">a</a>` +
        `<a href="../../../packages/docs/tools/check-spell.js">b</a>` +
        `<a href="../../../../packages/spell/src/rules/BlockLine.ts">two too deep</a>` +
        `<a href="../../../packages/spell/src/nope.ts">not there</a>`
    )
    const ctx = context()
    expect(STEP.run(doc, ctx)).toBe(true)
    expect(Array.from(doc.querySelectorAll("a"), (a) => a.getAttribute("href"))).toEqual([
      "../../packages/spell/src/rules/BlockLine.ts",
      "../../spell-epic/src/tools/check-spell.js",
      "../../../../packages/spell/src/rules/BlockLine.ts",
      "../../../packages/spell/src/nope.ts"
    ])
    expect(doc.querySelector("a")!.getAttribute("target")).toBe("src-packages-spell-src-rules-blockline-ts")
    expect(STEP.run(doc, context())).toBe(false)
  })

  test("a gone file's link goes, its words kept;  the same link twice is one note", () => {
    const doc = page(
      `See <a href="../../shared-pending/README.md" target="src-shared-pending-readme-md">` +
        `<code>shared-pending/README.md</code></a>, then ` +
        `<a href="../../shared-pending/README.md" target="src-shared-pending-readme-md">it again</a>.`
    )
    const ctx = context()
    expect(STEP.run(doc, ctx)).toBe(true)
    expect(doc.querySelector("p")!.innerHTML).toBe("See <code>shared-pending/README.md</code>, then it again.")
    expect(ctx.notes).toEqual([
      "engine-links:  ../../shared-pending/README.md:  gone, its words left as text (2 links)"
    ])
  })

  test("left as written:  live links, URLs, ids, routes, a dead link no move knows;  one whose new place isn't there, reported", () => {
    const links =
      `<a href="../../spell-epic/src/tools/pages.js">live</a><a href="https://example.com/x">url</a>` +
      `<a href="#t1">id</a><a href="/_epic/assets/spell-doc.css">route</a><a href="../../packages/ui/x.html">dead</a>` +
      `<a href="../../packages/epics/tools/gone.js">moved, not there</a>`
    const doc = page(links)
    const ctx = context()
    expect(STEP.run(doc, ctx)).toBe(false)
    expect(doc.querySelector("p")!.innerHTML).toBe(links)
    expect(ctx.notes).toEqual([
      "engine-links:  ../../packages/epics/tools/gone.js:  spell-epic/src/tools/gone.js isn't there:  left for you"
    ])
  })

  test("without the page's linker and folder:  nothing", () => {
    const doc = page(`<a href="../../packages/epics/tools/pages.js">x</a>`)
    expect(STEP.run(doc, { now: new Date() })).toBe(false)
  })
})
