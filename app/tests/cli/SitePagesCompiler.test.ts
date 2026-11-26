import { spawnSync } from "child_process"
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from "fs"
import { createRequire } from "module"
import { tmpdir } from "os"
import { dirname, join, resolve } from "path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { SP } from "spell/parser/spell"

/**
 * `spell compile --pages`, the page server's child that compiles a site page by page (epic `editor` P46):
 * the real `spell`, on App UI's guide, into a build folder of its own (`SPELL_BUILD_DIR`).
 * - A page compiled alone comes out as it does in the whole site:  checked against `spell compile --stdout`.
 */

/** The kit's `spell`, found by package. */
const SPELL = resolve(dirname(createRequire(import.meta.url).resolve("spell/package.json")), "bin/spell.mjs")

/** The site:  App UI's guide, 31 pages alone in their files. */
const SITE = "@spell/guides/AppUI"

/** A build folder of its own, so nothing of this checkout's is touched. */
const BUILD = realpathSync(mkdtempSync(join(tmpdir(), "spell-site-pages-")))

/** How long a run may take:  the first compiles `@spell/library` into the new build folder too. */
const TIMEOUT_MS = 120_000

/** Run `spell ...args`, `input` on its standard input, into `BUILD`. */
function spell(args: string[], input?: string) {
  const ran = spawnSync(process.execPath, [SPELL, ...args], {
    input,
    env: { ...process.env, SPELL_BUILD_DIR: BUILD },
    encoding: "utf8",
    timeout: TIMEOUT_MS
  })
  return { status: ran.status, stdout: ran.stdout, stderr: ran.stderr }
}

/** The code of each file in compiled javascript `text`, its imports and source map left out. */
function sectionsOf(text: string): string[] {
  return text
    .replace(/\n\/\/# sourceMappingURL=.*$/s, "")
    .split("\n// -----------\n")
    .map((section) => section.replace(/^import \{[^}]*\} from "[^"]+";?\n+/m, ""))
}

afterAll(() => rmSync(BUILD, { recursive: true, force: true }))

describe("spell compile --pages (editor P46)", () => {
  test(
    "a site's frame, then two pages asked for by class:  each written into __pages/, as the whole site compiles them",
    () => {
      const requests = [{ projectId: SITE }, { projectId: SITE, page: "MenuBar" }, { projectId: SITE, page: "Nope" }]
      const ran = spell(["compile", "--pages"], requests.map((it) => JSON.stringify(it)).join("\n") + "\n")
      expect(ran.status, ran.stderr).toBe(0)
      const answers = ran.stdout
        .split("\n")
        .filter((line) => line.startsWith("spell-pages: "))
        .map((line) => JSON.parse(line.slice("spell-pages: ".length)) as { result: string })
      expect(answers.map((it) => it.result)).toEqual(["built", "built", "no page"])

      const folder = join(BUILD, "spaces", SITE, "__pages")
      const frame = readFileSync(join(folder, `AppUI${SP.COMPILED_JS_SUFFIX}`), "utf8")
      const lazy = /^\/\/ spell-lazy-pages: (.*)$/m.exec(frame)![1]!.split(",")
      expect(lazy).toContain("MenuBar")
      expect(lazy.length).toBeGreaterThan(20)
      expect(frame).not.toMatch(/^export class MenuBar extends Page\b/m)
      for (const file of ["AppUI.declarations.json5", "AppUI.en.js", "frame.fingerprint.json"]) {
        expect(existsSync(join(folder, file)), file).toBe(true)
      }
      const chunk = readFileSync(join(folder, "MenuBar.page.js"), "utf8")
      expect(chunk).toMatch(/^export class MenuBar extends Page\b/m)

      // the same code the whole site compiles to, file by file
      const whole = spell(["compile", SITE, "--stdout"])
      expect(whole.status, whole.stderr).toBe(0)
      const wholeSections = sectionsOf(whole.stdout)
      expect(wholeSections).toContain(sectionsOf(chunk)[0])
      for (const section of sectionsOf(frame).slice(0, -1)) expect(wholeSections).toContain(section)
    },
    TIMEOUT_MS * 2
  )

  test("takes no projects:  it reads which on standard input", () => {
    const ran = spell(["compile", "--pages", SITE], "")
    expect(ran.status).not.toBe(0)
    expect(ran.stderr).toMatch(/--pages takes no projects/)
  }, TIMEOUT_MS)
})
