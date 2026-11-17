import { mkdtempSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { pathToFileURL } from "url"
import { describe, expect, test } from "vite-plus/test"

import { SP } from "spell/parser/spell"
import {
  bareNameOf,
  compiledFixture,
  fixtureImports,
  fixtureLanguages,
  fixtureProjectNames
} from "spell/app/spaces/test"
import { CLI } from "spell/app/cli"

/**
 * A test project with files in another language than English runs its own spell tests, and they all pass
 * (epic `spanish`).
 * - So a Spanish program doesn't only compile:  `la carta es la reina de espadas` is true of the queen of spades.
 * - Each compiled as `compiledFixture()` does, then run as `spell run` runs it:  in a fake page, so a game that draws
 *   (Solitario) deals and draws too (epic `spanish` P21:  it was `cartas`, the cards alone, before).
 * - Every `esperar que ...` of every test must pass;  a failing one is listed, as it printed.
 */
describe("test projects in other languages pass their own tests", () => {
  for (const name of fixtureProjectNames().filter((name) => fixtureLanguages(name).some((lang) => lang !== "en"))) {
    test(
      name,
      async () => {
        expect(await failedChecks(name)).toEqual([])
      },
      60_000
    )
  }
})

/** Each check of test project `name`'s spell tests that failed, as it printed:  a line starting `❌`. */
async function failedChecks(name: string): Promise<string[]> {
  const folder = mkdtempSync(join(tmpdir(), "spell-imports-"))
  const run = await CLI.runCode("run", bareNameOf(name), compiledFixture(name), {
    extension: ".mjs",
    capture: true,
    dom: true,
    seed: 1,
    messages: SP.SpellWords.messagesFor(fixtureLanguages(name)[0]!),
    pauses: false,
    projects: importedProjects(name, folder)
  }).finally(() => rmSync(folder, { recursive: true, force: true }))
  const { exitCode, output, stdout } = run
  expect(exitCode, `${name} exited ${exitCode}:\n${output}`).toBe(CLI.EXIT.OK)
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith(FAILED))
}

/**
 * Each project `name` imports, and what THEY import, compiled into `folder`:  by project id, its file's URL,
 * as `CLI.runCode()` takes them (Fichas de recetas imports Lista de la compra;  epic `mockup` P21).
 * - The javascript target's alone:  the contract test's `importedProjects()` does every target's.
 */
function importedProjects(name: string, folder: string, projects: Record<string, string> = {}): Record<string, string> {
  for (const [module, imported] of Object.entries(fixtureImports(name))) {
    const projectId = decodeURI(module.slice(SP.SPELL_PROJECT_MODULE.length))
    if (projects[projectId]) continue
    const file = join(folder, `${bareNameOf(imported)}.spell.mjs`)
    writeFileSync(file, compiledFixture(imported))
    projects[projectId] = pathToFileURL(file).href
    importedProjects(imported, folder, projects)
  }
  return projects
}

/** How a failed check's line starts, in every language. */
const FAILED = "❌"
