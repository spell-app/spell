import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { ImportRenamer } from "spell/cli/commands/renameImports"

/**
 * A made-up merged kit:  `ui/` and `app/` with a few files, so the renamer can tell an import from a path by what's
 * on disk.
 */
const KIT = mkdtempSync(join(tmpdir(), "spell-rename-"))
afterAll(() => rmSync(KIT, { recursive: true, force: true }))

write("package.json", {
  name: "spell",
  exports: { "./ui/vite.config.ts": "./ui/vite.config.ts", "./ui/*": { default: "./ui/src/*" } }
})
write("ui/package.json", { name: "spell-ui" })
write("ui/src/components/ui-button/index.ts", "")
write("ui/src/core.ts", "")
write("ui/site/_assets/x.js", "")
write("ui/AGENTS.md", "")
write("app/package.json", { name: "spell-app" })
write("app/src/app/runner/main.tsx", "")
write("app/app/docs/x.html", "")

const renamer = new ImportRenamer(KIT)
const rename = (line: string) => renamer.renameLine(line).line

describe("ImportRenamer", () => {
  test("a second run changes nothing:  carry-on renames the merged checkout again", () => {
    const lines = [
      'import { UI } from "spell-ui/components/ui-button"',
      "[Spell UI's](spell-ui/AGENTS.md) and ../spell-ui/site/_assets",
      "https://github.com/spell-app/spell-ui/blob/main/README.md"
    ]
    for (const line of lines) expect(rename(rename(line))).toBe(rename(line))
  })

  test("import names become the package, then the folder", () => {
    expect(rename('import { UI } from "spell-ui/components/ui-button"')).toBe(
      'import { UI } from "spell/ui/components/ui-button"'
    )
    expect(rename('import "spell-ui"')).toBe('import "spell/ui"')
    expect(rename("shares `spell-ui/core` with its packs")).toBe("shares `spell/ui/core` with its packs")
    expect(rename('import config from "spell-ui/vite.config.ts"')).toBe('import config from "spell/ui/vite.config.ts"')
  })

  test("source conditions collapse into spell-source", () => {
    expect(rename('"customConditions": ["spell-ui-source"]')).toBe('"customConditions": ["spell-source"]')
  })

  test("paths naming the old folder name the new one", () => {
    expect(rename('"assets": "../spell-ui/site/_assets"')).toBe('"assets": "../ui/site/_assets"')
    expect(rename("[Spell UI's](spell-ui/AGENTS.md)")).toBe("[Spell UI's](ui/AGENTS.md)")
    expect(rename("in `spell-ui/site/_assets`")).toBe("in `ui/site/_assets`")
    expect(rename('href="/spell-ui/src/core.ts"')).toBe('href="/ui/src/core.ts"')
  })

  test("a name in both places:  an import in quotes or backticks, else by what's on disk", () => {
    expect(rename("`spell-app/app/runner/main`")).toBe("`spell/app/app/runner/main`")
    expect(rename("`spell-app/app/docs`")).toBe("`app/app/docs`")
  })

  test("GitHub links into a file move to the merged repo;  commits, issues and the org stay", () => {
    expect(rename("https://github.com/spell-app/spell-ui/blob/main/README.md")).toBe(
      "https://github.com/spell-app/spell/blob/main/ui/README.md"
    )
    for (const line of [
      "https://github.com/spell-app/spell-ui/blob/0123abcd/README.md",
      "https://github.com/spell-app/spell-app/issues/12",
      "gh repo view spell-app/spell-ui"
    ])
      expect(rename(line)).toBe(line)
  })

  test("what it leaves:  bare names, longer names, lint rules, installed packages, old checkouts, the rename itself", () => {
    for (const line of [
      '"spell-ui": "workspace:*"',
      "the spell-ui repo",
      "spell-ui-site:ready src-spell-ui-src-x",
      "the `spell-ui/*` rules, spell-ui/no-inline-style",
      "node_modules/spell-ui/dist/ui-button.js",
      "~/www/spell-app/spell-app.epics",
      "~/.claude/plugins/cache/spell-epic/spell-epic/0.1.0",
      '<a href="SAGA:/spell-ui/seo#J3">',
      'repoPrefixFor("spell-app") === "/r/spell-app/"',
      '{ "spell-ui/": "https://cdn.jsdelivr.net/npm/spell-ui/dist/" }',
      "[`spell-ui/${name}`, `/dist/${name}.js`]",
      "`spell-ui/x` => `spell/ui/x`"
    ])
      expect(rename(line)).toBe(line)
  })
})

/** Write `file` in the made-up kit:  text, or JSON. */
function write(file: string, content: string | object): void {
  const path = join(KIT, file)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, typeof content === "string" ? content : JSON.stringify(content))
}
