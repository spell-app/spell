/**
 * Tests of `ShippedGuides` (epic `epic-engine` P79):  the shipped guides' list, from their metas, a Start here
 * chapter by its anchor;  and the check, that each stands on its own.
 */
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { ShippedGuides } from "spell/epic/command/ShippedGuides"
import { commandsIn } from "spell/epic/command/Guides"

const TEMP = realpathSync(mkdtempSync(join(tmpdir(), "epic-shipped-")))
afterAll(() => rmSync(TEMP, { recursive: true, force: true }))

/** A guide page:  its title, its head's extra metas, its body. */
function page(title: string, metas: string, body = ""): string {
  return (
    `<!doctype html>\n<html>\n  <head>\n    <title>${title}</title>\n` +
    `    <meta name="description" content="About ${title}." />\n${metas}  </head>\n` +
    `  <body><main><h1>${title}</h1>${body}</main></body>\n</html>\n`
  )
}

/** A scratch repo naming its guides folder, holding `files` (path => text). */
function repo(name: string, files: Record<string, string>): string {
  const root = join(TEMP, name)
  const all = { ".epic/config.json5": '{ "contentFolder": ".", "guidesFolder": "guides" }', ...files }
  for (const [path, text] of Object.entries(all)) {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), text)
  }
  return root
}

const LANGUAGE = page(
  "The Spell Language",
  '    <meta name="spell-audience" content="makers" />\n    <meta name="spell-topic" content="Writing Spell" />\n' +
    '    <meta name="spell-start-here" content="1" />\n' +
    '    <meta name="spell-start-here" content="5" data-anchor="views" data-title="Views" />\n'
)
const SERVER = page(
  "The Page Server",
  '    <meta name="spell-audience" content="programmers" />\n    <meta name="spell-topic" content="Tools" />\n',
  "<p>Run <code>spell server start</code>, see <code>src/server/PageServer.ts</code>.</p>"
)

describe("ShippedGuides", () => {
  test("the list:  each guide with an audience, by path;  Start here in order, a chapter by its anchor", () => {
    const root = repo("list", {
      "guides/language/language.html": LANGUAGE,
      "guides/server.html": SERVER,
      // no audience:  not listed
      "guides/draft.html": page("Draft", "")
    })
    const shipped = new ShippedGuides(root)
    const list = shipped.build()
    expect(list.guides).toEqual([
      {
        path: "guides/language/language.html",
        title: "The Spell Language",
        description: "About The Spell Language.",
        audience: "makers",
        topic: "Writing Spell"
      },
      {
        path: "guides/server.html",
        title: "The Page Server",
        description: "About The Page Server.",
        audience: "programmers",
        topic: "Tools"
      }
    ])
    expect(list.startHere).toEqual([
      { order: 1, path: "guides/language/language.html", title: "The Spell Language" },
      { order: 5, path: "guides/language/language.html", title: "Views", anchor: "views" }
    ])
    expect(shipped.write()).toBe(true)
    expect(shipped.write()).toBe(false)
  })

  test("the check:  links into the epic repo, a guide that doesn't ship, a command or a file that isn't there", () => {
    const root = repo("check", {
      "src/server/PageServer.ts": "export {}\n",
      "guides/server.html": SERVER,
      "guides/bad.html": page(
        "Bad",
        '    <meta name="spell-audience" content="programmers" />\n',
        '<a href="/epics/seo/seo.plan.html">plan</a> <a href="SAGA:/spell">saga</a> <a href="private.html">x</a>' +
          '<epic-link epic="seo"></epic-link> <code>spell parser check</code> <code>src/server/Gone.ts</code>' +
          ' <a href="https://example.com/">fine</a> <a href="#here">fine</a> <a href="server.html">fine</a>'
      )
    })
    const shipped = new ShippedGuides(root)
    const commandExists = (words: string[]) => words.join(" ") !== "spell parser check"
    expect(shipped.check({ commandExists })).toEqual([
      "guides/bad.html:  an <epic-link>:  a link into the epic repo",
      "guides/bad.html:  links /epics/seo/seo.plan.html, in the epic repo",
      "guides/bad.html:  links SAGA:/spell, in the epic repo",
      "guides/bad.html:  links private.html, a guide that doesn't ship",
      "guides/bad.html:  names `spell parser check`, which isn't a command",
      "guides/bad.html:  names src/server/Gone.ts, which isn't there",
      "guides/guides.json5:  stale:  epic guides index"
    ])
    shipped.write()
    expect(shipped.check({ commandExists }).at(-1)).toMatch(/names src\/server\/Gone.ts/)
  })

  test("the check reads no link in a code sample, and no argument as a verb (I392, I397)", () => {
    const root = repo("samples", {
      "guides/samples.html": page(
        "Samples",
        '    <meta name="spell-audience" content="makers" />\n',
        '<pre><code>&lt;a href="/epics/x.html"&gt;x&lt;/a&gt;</code></pre> <code>spell bundle ui-site</code>'
      )
    })
    const shipped = new ShippedGuides(root)
    shipped.write()
    const asked: string[] = []
    const commandExists = (words: string[]) => (asked.push(words.join(" ")), true)
    expect(shipped.check({ commandExists })).toEqual([])
    expect(asked).toEqual(["spell bundle"])
  })

  test("commandsIn():  a group and its listed verb are commands;  a verb the group lacks isn't", () => {
    const has = commandsIn(join(import.meta.dirname, "../../.."))
    expect(has(["spell", "server", "start"])).toBe(true)
    expect(has(["spell", "server", "bogus"])).toBe(false)
    expect(has(["spell", "parser", "check"])).toBe(false)
    expect(has(["epic", "guides", "move"])).toBe(true)
    expect(has(["epic", "bogus"])).toBe(false)
  })
})
