import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { homedir, tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { checkoutToRun, kitCheckoutBin, kitSetting } from "spell/cli/kitCheckout"

/** A made-up checkout (`bin/spell.mjs`, installed) and an npm install of spell beside it, in a temporary folder. */
const root = realpathSync(mkdtempSync(join(tmpdir(), "kit-checkout-")))
afterAll(() => rmSync(root, { recursive: true, force: true }))

/** A folder under `root` with `files` in it (path => text). */
function folderWith(name: string, files: Record<string, string>): string {
  const dir = join(root, name)
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(dir, path, ".."), { recursive: true })
    writeFileSync(join(dir, path), text)
  }
  return dir
}

const SPELL = JSON.stringify({ name: "spell" })
const checkout = folderWith("spell", {
  "package.json": SPELL,
  "bin/spell.mjs": "",
  "node_modules/tsx/package.json": "{}"
})
const install = folderWith("project/node_modules/spell", { "package.json": SPELL, "bin/spell.mjs": "" })
/** The published bin's own URL:  what it passes as `self`. */
const installedBin = pathToFileURL(join(install, "bin", "spell.mjs")).href

describe("kitCheckoutBin()", () => {
  test("SPELL_KIT unset or empty:  the installed copy runs", () => {
    expect(kitCheckoutBin("bin/spell.mjs", installedBin, root, {})).toBeUndefined()
    expect(kitCheckoutBin("bin/spell.mjs", installedBin, root, { SPELL_KIT: " " })).toBeUndefined()
  })

  test("SPELL_KIT names a checkout:  its own bin, as a URL to import", () => {
    expect(kitCheckoutBin("bin/spell.mjs", installedBin, root, { SPELL_KIT: checkout })).toBe(
      pathToFileURL(join(checkout, "bin", "spell.mjs")).href
    )
  })

  test("the checkout's own bin, run with SPELL_KIT naming it:  no hand-off", () => {
    const own = pathToFileURL(join(checkout, "bin", "spell.mjs")).href
    expect(kitCheckoutBin("bin/spell.mjs", own, root, { SPELL_KIT: checkout })).toBeUndefined()
  })

  test("`~/` is the home folder", () => {
    expect(() => kitCheckoutBin("bin/spell.mjs", installedBin, root, { SPELL_KIT: "~/no-such-kit-here" })).toThrow(
      `no package.json in ${join(homedir(), "no-such-kit-here")}`
    )
  })

  test("a SPELL_KIT that can't run throws, saying why:  never the installed copy instead", () => {
    const other = folderWith("other", { "package.json": JSON.stringify({ name: "other" }) })
    const fresh = folderWith("fresh", { "package.json": SPELL, "bin/spell.mjs": "" })
    const binless = folderWith("binless", { "package.json": SPELL })
    const run = (kit: string) => () => kitCheckoutBin("bin/spell.mjs", installedBin, root, { SPELL_KIT: kit })
    expect(run(join(root, "nowhere"))).toThrow("no package.json")
    expect(run(other)).toThrow("isn't a checkout of spell")
    expect(run(binless)).toThrow("has no bin/spell.mjs")
    expect(run(fresh)).toThrow("isn't installed yet:  run yarn install there")
    expect(run(other)).toThrow("unset SPELL_KIT to run the installed spell")
  })
})

// epic `repo-split` T70:  one project's own file, `spell local on`'s
describe("kitSetting():  the project's .spell/kit.json5", () => {
  const project = folderWith("app", {
    "package.json": "{}",
    ".spell/kit.json5": '// mine\n{ kit: "../spell" }\n',
    "pages/deep/x.txt": ""
  })

  test("found from any folder of the project, its relative path from the project", () => {
    expect(kitSetting(join(project, "pages", "deep"), {})).toEqual({
      kit: checkout,
      namedBy: join(project, ".spell", "kit.json5"),
      setting: "../spell"
    })
    expect(kitCheckoutBin("bin/spell.mjs", installedBin, project, {})).toBe(
      pathToFileURL(join(checkout, "bin", "spell.mjs")).href
    )
  })

  test("SPELL_KIT wins over it", () => {
    expect(kitSetting(project, { SPELL_KIT: "/elsewhere" })?.kit).toBe("/elsewhere")
  })

  test("one naming a checkout that can't run says to turn it off", () => {
    const broken = folderWith("broken-app", { ".spell/kit.json5": '{ kit: "../nowhere" }' })
    expect(() => kitCheckoutBin("bin/spell.mjs", installedBin, broken, {})).toThrow(
      "fix it, or run spell local off to run the installed spell"
    )
  })

  test("spell local off never hands off:  it works while the checkout can't run", () => {
    expect(checkoutToRun("bin/spell.mjs", installedBin, ["local", "off"])).toBeUndefined()
  })
})
