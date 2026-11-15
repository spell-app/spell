import { spawnSync } from "child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join, resolve } from "path"
import { pathToFileURL } from "url"
import { describe, test, expect } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { PY } from "spell/parser/py"
import { buildTsx } from "spell/parser/spell/node/buildTsx"
import { SP } from "spell/parser/spell"
import {
  FIXTURES_GROUP,
  PYTHON_FIXTURES,
  bareNameOf,
  compiledFixture,
  fixtureImports,
  fixtureLanguages,
  fixtureProjectId,
  fixtureProjectNames
} from "spell/app/spaces/test"
import { CLI } from "spell/app/cli"

/**
 * The CORE CONTRACT:  every fixture project, compiled for each target, run headless as `spell run` runs it,
 * prints the SAME thing, line for line.
 * - What it prints is pinned in `__snapshots__/contract/` (`snapshotOf()`).
 * - So a target's core is right when it prints what the snapshot says.
 *   - `js/solid` and `ts/solid` share `@spell/core` today.
 *   - Python's core, `spell_core` (spell-parser's `src/py/core`), prints the same
 *     for the fixtures its writer writes so far, `PYTHON_FIXTURES` (epic `python-target`).
 *   - What a core must HAVE is `SC.Core` (`spell/parser/core/core.types`).
 * - The snapshot catches a broken core method, which both targets would share.
 * - A fixture that imports another project (`counter-app` imports the frozen counter library, `@spell/test/counter`)
 *   runs with that one compiled for the same target, as its `@spell/project/<id>`.
 * - Each runs in a FAKE PAGE (linkedom, `RunSpec.dom`) that `start the game` draws into.
 *   What it drew is printed last, so drawing is compared too:
 *   each view as its own element, e.g. `<test-project-card>`, its drawing in its place.
 * - Its random numbers start from seed 1 (`core.seedRandom()`),
 *   so Solitaire deals the same cards every run, on every target.
 * - Its requests all fail (`RunSpec.offline`):  a program on someone else's server draws what it shows without them.
 * - Only STDOUT is compared:  the program's own output, as data.
 *   A dump of a thing (`print the card`) goes to stderr, as do warnings (epic `python-target`, Q17):
 *   how a thing looks dumped is each target's own business.
 * - Changed on purpose:  `spell content check --bless`, then read the diff.
 */
const TARGET_FILES: Record<string, string> = { "js/solid": ".mjs", "ts/solid": ".tsx", py: ".py" }

/** The seed every contract run starts its random numbers from. */
const CONTRACT_SEED = 1

/**
 * What fixture `name` prints to stdout when its `target` code runs, as `spell run --seed 1` would run it.
 * - `code`:  that code, unless given.
 */
async function printed(name: string, target: string, code = compiledFixture(name, target)): Promise<string> {
  const extension = TARGET_FILES[target]
  const folder = mkdtempSync(join(tmpdir(), "spell-contract-"))
  try {
    const projects = await importedProjects(name, target, folder)
    const { exitCode, output, stdout } = await CLI.runCode("run", bareNameOf(name), code, {
      extension,
      projects,
      capture: true,
      dom: true,
      seed: CONTRACT_SEED,
      // a test's lines in the fixture's language, as `spell run` prints them:  `Solitario`'s in Spanish
      messages: SP.SpellWords.messagesFor(fixtureLanguages(name)[0]!),
      // only what's printed matters:  Python needn't wait at a pause (javascript's run as they are)
      pauses: false,
      // what a program on someone's server prints must not follow what they say
      offline: true
    })
    expect(exitCode, `${name} on ${target} exited ${exitCode}:\n${output}`).toBe(CLI.EXIT.OK)
    return stdout
  } finally {
    rmSync(folder, { recursive: true, force: true })
  }
}

/**
 * Each fixture `name` imports, and what THEY import, compiled for `target` into `folder`:
 * by project id, its file's URL, as `CLI.runCode()` takes them.
 * - TypeScript is built first (`buildTsx()`), as `runCode()` builds its own.
 */
async function importedProjects(
  name: string,
  target: string,
  folder: string,
  projects: Record<string, string> = {}
): Promise<Record<string, string>> {
  for (const [module, fixture] of Object.entries(fixtureImports(name))) {
    const projectId = decodeURI(module.slice(SP.SPELL_PROJECT_MODULE.length))
    if (projects[projectId]) continue
    let code = compiledFixture(fixture, target)
    const fileName = moduleNameOf(fixture)
    if (TARGET_FILES[target] === ".tsx") code = await buildTsx(code, { filename: `${fileName}.spell.tsx` })
    // Python imports another project as a module of its name, `from counter import Counter`
    const isPython = TARGET_FILES[target] === ".py"
    const file = join(folder, isPython ? `${PY.PyWriter.projectModule(module)}.py` : `${fileName}.spell.mjs`)
    writeFileSync(file, code)
    projects[projectId] = pathToFileURL(file).href
    await importedProjects(fixture, target, folder, projects)
  }
  return projects
}

/** A file or variable name for imported project `imported`, a fixture's name or a library's address:  `counter`. */
function moduleNameOf(imported: string): string {
  return imported.split("/").at(-1)!.replace(/\W/g, "_")
}

/**
 * Where test project `name`'s output is pinned, in `__snapshots__/contract/`, by its group:
 * - a fixture's (`@spell/test`) there:  `counter.out.txt`
 * - an example's or a Spell guide's in its group's folder:  `examples/Counter.out.txt`, `guides/a-first-spell.out.txt`
 * - So the example FizzBuzz and the fixture `fizzbuzz` are two files, on a disk that ignores case too.
 */
function snapshotOf(name: string): string {
  const projectId = fixtureProjectId(name)
  const folder = projectId.startsWith(`${FIXTURES_GROUP}/`) ? "" : `${projectId.split("/").at(-2)}/`
  return resolve(import.meta.dirname, `__snapshots__/contract/${folder}${bareNameOf(name)}.out.txt`)
}

/** Every target that runs a program:  all but a library (`ts/lib`), which keeps only the classes. */
const RUNNING_TARGETS = Object.values(SP.TARGETS)
  .filter((target) => target.can.run !== false)
  .map((target) => target.name)

describe("the core contract:  every target prints the same", () => {
  test("every target has a file extension to run from", () => {
    expect([...RUNNING_TARGETS].sort()).toEqual(Object.keys(TARGET_FILES).sort())
  })

  for (const name of fixtureProjectNames()) {
    test(
      name,
      async () => {
        // Python only where its writer writes the fixture so far -- see `PYTHON_FIXTURES`
        const targets = RUNNING_TARGETS.filter((target) => !target.startsWith("py") || PYTHON_FIXTURES.has(name))
        const [js, ...others] = await Promise.all(targets.map((target) => printed(name, target)))
        for (const [index, other] of others.entries()) {
          expect(other!.split("\n"), `${name} on ${targets[index + 1]}`).toEqual(js!.split("\n"))
        }
        await expect(js).toMatchFileSnapshot(snapshotOf(name))
      },
      60_000
    )
  }
})

/**
 * `core`'s names before epic `output-targets` P16, by their new ones:
 * a program compiled before then calls the old ones, and nothing recompiles it.  See `deprecated.ts` in `spell/parser/core`.
 */
const OLD_NAMES: Record<string, string> = {
  positionOf: "itemOf",
  getItemAt: "getItemOf",
  setItemAt: "setItemOf",
  removeItemAt: "removeItemOf",
  removeItemsAt: "removeItemsOf",
  duplicateList: "duplicateCollection",
  mergeLists: "mergeCollections",
  mergeListsInto: "mergeCollectionsInto"
}

/**
 * Javascript as written before epic `output-targets` P19:  every `core` helper called by name,
 * `core.getItemAt(stock, -1)`, never a list's own method -- see `P.JSWriter.coreCall()`.
 */
class HelpersByName extends P.JSWriter {
  coreCall(): string | undefined {
    return undefined
  }
}

describe("a program compiled before P16, with core's old names", () => {
  test("prints what it prints today", async () => {
    const name = "@spell/examples/Solitaire"
    const helpersByName = compiledFixture(name, new HelpersByName())
    const before = helpersByName.replace(/\bcore\.(\w+)\(/g, (call, method: string) =>
      OLD_NAMES[method] ? `core.${OLD_NAMES[method]}(` : call
    )
    // it calls the old names, or this test proves nothing
    for (const old of ["getItemOf", "duplicateCollection"]) {
      expect(before).toContain(`core.${old}(`)
    }
    await expect(printed(name, "js/solid", before)).resolves.toEqual(await printed(name, "js/solid"))
  }, 60_000)
})

/**
 * A card table drawn as javascript compiled since epic `output-targets` P20 draws:
 * Solid's own `h()`, imported from `@spell/core`, in the page's spellings.
 * - `{{rank}}` is where each card's rank goes.
 */
const DRAWN_WITH_H = `
import { core, Thing, List, App, h } from "@spell/core"
export class Card extends Thing {
  draw() { return h("td", { class: "card", colspan: "2" }, () => this.rank) }
}
export class Table extends App {
  draw() { return h("table", h("tr", () => core.drawItems(this.cards))) }
}
const table = new Table()
table.cards = new List()
table.cards.add(new Card({ rank: "ace" }), new Card({ rank: "king" }))
table.start()
`

describe("drawing with h() from @spell/core, as `spell run` runs it", () => {
  /** What `code` prints to stdout, run headless in a fake page:  ending with what it drew. */
  async function drawn(code: string): Promise<string> {
    const { exitCode, output, stdout } = await CLI.runCode("run", "Table", code, { capture: true, dom: true })
    expect(exitCode, output).toBe(CLI.EXIT.OK)
    return stdout.trim()
  }

  test("draws a card table:  a cell per card, in the page's spellings", async () => {
    expect(await drawn(DRAWN_WITH_H)).toBe(
      `<div id="spell-app-root"><table><tr>` +
        `<td class="card" colspan="2">ace</td><td class="card" colspan="2">king</td>` +
        `</tr></table></div>`
    )
  }, 60_000)
})

/** The fixtures that are games:  a `deck` of cards, each with its own click handler, `on_click`. */
const GAMES = ["@spell/examples/Solitaire"]

/**
 * Where the board a run draws last starts, in its output's `lines`:  the last `<div id="spell-app-root">`.
 * - The board is the rest:  text drawn in it may have lines of its own, e.g. Klondike's `<markdown>` rules.
 */
function boardAt(lines: string[]): number {
  for (let index = lines.length - 1; index >= 0; index--) {
    if (lines[index]!.startsWith('<div id="spell-app-root">')) return index
  }
  return -1
}

/** `spell_core`'s uv project, which runs the player. */
const SPELL_CORE = resolve(import.meta.dirname, "../../../parser/src/py/core")
/** The player:  `spell_core`'s test script, in the repo's `tests/py/core/tests/`. */
const PLAYER = resolve(import.meta.dirname, "../../../parser/tests/py/core/tests/patches_in_a_game.py")

/**
 * Only what changed, sent click by click, gives the same state as sending it whole (epic `python-target` P18):
 * each game played on the `py` target, seeded, 300 clicks, a mirror reading each `patch()`.
 * - The player:  `patches_in_a_game.py`, in `spell_core`'s tests (`tests/py/core/tests/`).
 */
describe("the core contract:  a game's patches give its whole state, click by click", () => {
  for (const name of GAMES) {
    test(
      name,
      async () => {
        const folder = mkdtempSync(join(tmpdir(), "spell-patches-"))
        try {
          await importedProjects(name, "py", folder)
          const program = join(folder, `${bareNameOf(name)}.spell.py`)
          writeFileSync(program, compiledFixture(name, "py"))
          const args = ["run", "--quiet", "--project", SPELL_CORE, "python", PLAYER, program]
          const { status, stdout, stderr } = spawnSync("uv", [...args, "--seed", String(CONTRACT_SEED)], {
            encoding: "utf8"
          })
          expect(status, `${name}:\n${stderr}`).toBe(0)
          expect(stdout).toMatch(/[1-9]\d* of 300 clicks changed something;  every patch matched/)
        } finally {
          rmSync(folder, { recursive: true, force: true })
        }
      },
      60_000
    )
  }
})

/**
 * A Python game's page:  its drawing half, and those of the projects it imports, written as modules into `folder`.
 * - `projects`:  for `CLI.runCode()`, each imported project's module by its id
 * - `modules`:  the page's lines that import them, the game's as `program`
 * - `moduleNames`:  what `startPage()` is given, in order, as written in the page
 */
function pageModules(name: string, folder: string) {
  const elements = join(folder, `${bareNameOf(name)}.elements.mjs`)
  writeFileSync(elements, compiledFixture(name, PY.ElementsWriter.instance))
  const projects: Record<string, string> = {}
  const modules = [`import * as program from ${JSON.stringify(pathToFileURL(elements).href)}`]
  for (const [module, fixture] of Object.entries(fixtureImports(name))) {
    const file = join(folder, `${moduleNameOf(fixture)}.elements.mjs`)
    writeFileSync(file, compiledFixture(fixture, PY.ElementsWriter.instance))
    projects[decodeURI(module.slice(SP.SPELL_PROJECT_MODULE.length))] = pathToFileURL(file).href
    modules.push(`import * as ${moduleNameOf(fixture)} from ${JSON.stringify(module)}`)
  }
  const moduleNames = [...Object.values(fixtureImports(name)).map(moduleNameOf), "program"].join(", ")
  return { projects, modules, moduleNames }
}

/** The page's script lines that find an element through the shadow roots:  `found(document, selector)`. */
const FOUND = [
  "const found = (root, selector) => root.querySelector(selector) ??",
  "  [...root.querySelectorAll('*')].map((it) => it.shadowRoot && found(it.shadowRoot, selector)).find(Boolean)"
]

/**
 * A page draws a Python program as javascript draws it (epic `python-target` P19):
 * each game run on the `py` target, seeded, its state (`--state`) drawn in the fake page by its drawing half,
 * `<Project>.elements.spell.js` (`PY.ElementsWriter`), started by `@spell/core`'s `startPage()`.
 * - The board it draws is the javascript run's, the last line of its contract snapshot.
 * - A click on the toolbar's Auto Play sends Python a call of the solitaire's `auto play`, the solitaire by
 *   reference;  Python's session runs it.
 *   - Its button is the page's drawing half's, `<action "auto play"/>` (`core.drawAction()`), as javascript's is.
 *   - Found through the shadow roots:  the solitaire draws in its own element.
 */
describe("the core contract:  a page draws a Python game as javascript does", () => {
  for (const name of GAMES) {
    test(
      name,
      async () => {
        const folder = mkdtempSync(join(tmpdir(), "spell-page-"))
        try {
          await importedProjects(name, "py", folder)
          const program = join(folder, `${bareNameOf(name)}.spell.py`)
          writeFileSync(program, compiledFixture(name, "py"))
          const run = ["run", "--quiet", "--project", SPELL_CORE, "python", "-m"]
          const ran = spawnSync("uv", [...run, "spell_core.run", program, "--seed", "1", "--no-pauses", "--state"], {
            encoding: "utf8"
          })
          expect(ran.status, `${name}:\n${ran.stderr}`).toBe(0)
          const state = ran.stdout.trimEnd().split("\n").at(-1)!

          const { projects, modules, moduleNames } = pageModules(name, folder)
          const page = [
            'import { core, startPage } from "@spell/core"',
            ...modules,
            "const sent = []",
            `startPage({ modules: [${moduleNames}], state: ${state}, send: (message) => sent.push(message) })`,
            // the toolbar's Auto Play:  in the solitaire's drawing, as each view draws in its own shadow root
            ...FOUND,
            // its row, `<action \"auto play\"/>`, clicked:
            // `<ui-action>` runs the action it was handed (`core.drawAction()`), as its click does where Spell UI is loaded
            "found(document, 'ui-action[shortcut=\"A\"]')?.action.run('click')",
            "await new Promise((resolve) => setTimeout(resolve, 10))",
            "console.log(JSON.stringify(sent))"
          ].join("\n")
          const { exitCode, output, stdout } = await CLI.runCode("run", `${bareNameOf(name)}Page`, page, {
            projects,
            capture: true,
            dom: true
          })
          expect(exitCode, `${name}'s page:\n${output}`).toBe(CLI.EXIT.OK)
          const lines = stdout.trimEnd().split("\n")
          const board = boardAt(lines)
          // the messages sent, then a blank line, then the board
          const [messages, drawn] = [lines[board - 2], lines.slice(board).join("\n")]
          const snapshot = readFileSync(snapshotOf(name), "utf8")
          const expected = snapshot.trimEnd().split("\n")
          expect(drawn).toBe(expected.slice(boardAt(expected)).join("\n"))

          // the click:  a call of the solitaire's own method, which Python's session runs
          const [click] = JSON.parse(messages!) as Array<Record<string, unknown>>
          expect(click).toEqual({ call: "auto_play", on: "Solitaire#1", args: [] })
          const session = spawnSync("uv", [...run, "spell_core.page", program, "--seed", "1", "--no-pauses"], {
            encoding: "utf8",
            input: `${JSON.stringify(click)}\n`
          })
          expect(session.status, `${name}'s session:\n${session.stderr}`).toBe(0)
          expect(JSON.parse(session.stdout.trimEnd().split("\n").at(-1)!)).toBeInstanceOf(Array)
        } finally {
          rmSync(folder, { recursive: true, force: true })
        }
      },
      60_000
    )
  }
})

/**
 * A page's Undo and Redo follow a Python game's history (epic `language` P54):
 * each game run as its page runs it (`spell_core.page`), a stock card turned (one step, `Turn Card`), then undone;
 * its page, given the state and each patch, shows the toolbar's Undo and Redo rows after each (`<ui-action>`s).
 */
describe("the core contract:  a page's Undo and Redo follow a Python game's history", () => {
  for (const name of GAMES) {
    test(
      name,
      async () => {
        const folder = mkdtempSync(join(tmpdir(), "spell-undo-"))
        try {
          await importedProjects(name, "py", folder)
          const program = join(folder, `${bareNameOf(name)}.spell.py`)
          writeFileSync(program, compiledFixture(name, "py"))
          const run = ["run", "--quiet", "--project", SPELL_CORE, "python", "-m"]
          const app = { on: "Solitaire#1", args: [] }
          const messages = [
            { call: "turn_over_the_next_card", ...app },
            { call: "undo", ...app }
          ]
          const session = spawnSync("uv", [...run, "spell_core.page", program, "--seed", "1", "--no-pauses"], {
            encoding: "utf8",
            input: messages.map((message) => `${JSON.stringify(message)}\n`).join("")
          })
          expect(session.status, `${name}'s session:\n${session.stderr}`).toBe(0)
          // the program's own lines first, then the state, then a patch for each message
          const [state, ...patches] = session.stdout
            .trimEnd()
            .split("\n")
            .slice(-1 - messages.length)

          const { projects, modules, moduleNames } = pageModules(name, folder)
          const page = [
            'import { startPage } from "@spell/core"',
            ...modules,
            ...FOUND,
            `const page = startPage({ modules: [${moduleNames}], state: ${state}, send: () => {} })`,
            "const shown = async () => {",
            "  await new Promise((resolve) => setTimeout(resolve, 10))",
            // the toolbar's rows, by their keys:  each reads its action live, its title and whether it's enabled
            "  return ['mod+Z', 'mod+shift+Z']",
            '    .map((keys) => found(document, `ui-action[shortcut="${keys}"]`).action)',
            "    .map((action) => `${action.title}${action.isEnabled ? '' : ' (disabled)'}`)",
            "}",
            "const seen = [await shown()]",
            ...patches.map((patch) => `page.receive(${patch});  seen.push(await shown())`),
            "console.log(JSON.stringify(seen))"
          ].join("\n")
          const { exitCode, output, stdout } = await CLI.runCode("run", `${bareNameOf(name)}UndoPage`, page, {
            projects,
            capture: true,
            dom: true
          })
          expect(exitCode, `${name}'s page:\n${output}`).toBe(CLI.EXIT.OK)
          const seen = stdout.split("\n").find((line) => line.startsWith("[["))
          expect(JSON.parse(seen!)).toEqual([
            ["Undo (disabled)", "Redo (disabled)"],
            ["Undo Turn Card", "Redo (disabled)"],
            ["Undo (disabled)", "Redo Turn Card"]
          ])
        } finally {
          rmSync(folder, { recursive: true, force: true })
        }
      },
      60_000
    )
  }
})

/**
 * A game's whole opening is no undo step, as `spell run` runs it in javascript (epic `language` J180):
 * Undo isn't lit the moment it starts, its deal done;  a move after it is a step.
 * - The game is a project the page imports, so the page reads the core it runs on, then plays one move.
 * - `spell run` imports the page through `core.runOpening()` (`runProject.ts`), as `runCompiled()` imports a program.
 */
describe("the core contract:  a javascript game's opening is no undo step (epic `language` J180)", () => {
  for (const name of GAMES) {
    test(
      name,
      async () => {
        const folder = mkdtempSync(join(tmpdir(), "spell-opening-"))
        try {
          const projects = await importedProjects(name, "js/solid", folder)
          const file = join(folder, `${moduleNameOf(name)}.spell.mjs`)
          writeFileSync(file, compiledFixture(name, "js/solid"))
          projects[fixtureProjectId(name)] = pathToFileURL(file).href
          const page = [
            'import { core } from "@spell/core"',
            `import { solitaire } from ${JSON.stringify(`${SP.SPELL_PROJECT_MODULE}${fixtureProjectId(name)}`)}`,
            // after the page's own opening, which a top level that waits would keep going:  so not awaited there
            "void (async () => {",
            // its opening deal, held:  done once people's actions aren't held back any more
            "  while (core.RUNTIME.actions.isBusy) await new Promise((resolve) => setTimeout(resolve, 10))",
            "  const seen = [solitaire.canUndo]",
            "  await solitaire.turnOverTheNextCard()",
            "  seen.push(solitaire.canUndo, solitaire.undoTitle)",
            "  console.log(JSON.stringify(seen))",
            "})()"
          ].join("\n")
          const { exitCode, output, stdout } = await CLI.runCode("run", `${bareNameOf(name)}Opening`, page, {
            projects,
            capture: true,
            dom: true,
            seed: CONTRACT_SEED
          })
          expect(exitCode, `${name}'s opening:\n${output}`).toBe(CLI.EXIT.OK)
          const seen = stdout.split("\n").find((line) => line.startsWith("["))
          expect(JSON.parse(seen!)).toEqual([false, true, "Undo Turn Card"])
        } finally {
          rmSync(folder, { recursive: true, force: true })
        }
      },
      60_000
    )
  }
})

/** A program that turns its card over at its top level, an action no one waits for:  then once more, after its opening. */
const TURNED_AT_THE_TOP = `
import { core, Thing } from "@spell/core"
export class Card extends Thing {
  static {
    this.declareProp("faceUp", { type: "choice" })
  }
  get faceUp() { return this.getProp("faceUp") }
  set faceUp(faceUp) { this.setProp("faceUp", faceUp) }
}
export const card = new Card()
export function turnTheCardOver() {
  return core.asAction({ undoneAs: "Turn Card" }, () => { card.faceUp = !card.faceUp })
}
turnTheCardOver()
setTimeout(() => {
  const steps = () => core.RUNTIME.history.steps.map((step) => step.title)
  const seen = [steps()]
  turnTheCardOver()
  seen.push(steps())
  console.log(JSON.stringify(seen))
})
`

describe("a top-level action the opening calls, not waiting:  no undo step (epic `language` J180)", () => {
  test("its call at the top level is none;  its call after the opening is one", async () => {
    const { exitCode, output, stdout } = await CLI.runCode("run", "Turned", TURNED_AT_THE_TOP, { capture: true })
    expect(exitCode, output).toBe(CLI.EXIT.OK)
    expect(JSON.parse(stdout.trim())).toEqual([[], ["Turn Card"]])
  }, 60_000)
})
