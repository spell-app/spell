import { spawnSync } from "node:child_process"
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import type { Command } from "commander"
import JSON5 from "json5"
import { describe, expect, test, vi } from "vite-plus/test"

import { EpicProgram } from "spell/epic/cli/EpicProgram"
import { GROUP_VERBS, VERB_FLAGS, type GroupName, type VerbFlags } from "spell/epic/cli/epicGroups"
import { EpicCommandError } from "spell/epic/command/command.types"
import { EpicConfig } from "spell/epic/config/EpicConfig"

/**
 * The real `epic` command, end to end:  `bin/epic` run as a separate process, as a user would.
 * - Its data:  spell-app's checkout, beside spell-epic in the top `spell` repo (`SPELL_APP`), its epic pages
 *   (`unified-server`, merged long ago) and worktrees;  skipped without it.
 * - Moved from spell-app's CLI tests (`tests/cli/src/cli.test.ts`) at the switch (epic `epic-eject` I5).
 * - And, in this process, its flags (epic `coherence` P20):  each verb's, listed in its help;  any other refused
 *   (`EpicProgram.checkFlags()`);  every example in a verb's help taking only flags it has.
 */
const EPIC = resolve(import.meta.dirname, "../../bin/epic")

/**
 * spell-app's checkout:  the caller's data.  The top `spell` repo's child repo `spell-app`, as its `repos.json5` lists
 * them (epic `epic-engine` P10);  `undefined` outside one, or when it isn't cloned.
 */
const SPELL_APP = topRepoChild("spell-app")

/** Child repo `name` of the top `spell` repo above spell-epic:  its folder, when `repos.json5` lists it and it's there. */
function topRepoChild(name: string): string | undefined {
  for (let dir = resolve(import.meta.dirname, "../.."); dir !== dirname(dir); dir = dirname(dir)) {
    const list = join(dir, "repos.json5")
    if (!existsSync(list)) continue
    const { repos } = JSON5.parse(readFileSync(list, "utf8")) as { repos: { name: string }[] }
    const folder = join(dir, name)
    return repos.some((repo) => repo.name === name) && existsSync(folder) ? realpathSync(folder) : undefined
  }
  return undefined
}

// each run starts node and loads the epic code through `tsx`;  a test making several runs is over vitest's 5s default
vi.setConfig({ testTimeout: 30_000 })

/** Run `epic ...args` from `cwd`. */
function epic(args: string[], cwd = SPELL_APP!) {
  const { status, stdout, stderr } = spawnSync(process.execPath, [EPIC, ...args], { cwd, encoding: "utf8" })
  return { status, stdout, stderr }
}

// its epic pages are in its content folder (epic `epic-eject` P12), not behind an `epics/` link at its root
describe.skipIf(!SPELL_APP || !existsSync(resolve(EpicConfig.contentOf(SPELL_APP), "epics", "unified-server")))(
  "epic",
  () => {
    test("--help lists the verbs under headings, and how to name an item", () => {
      const { status, stdout } = epic(["--help"])
      expect(status).toBe(0)
      expect(stdout).toMatch(/^Usage: epic <verb> <epic>\[#<id>\] \[arguments\]\n/)
      for (const heading of ["Requests from other sessions:", "Epic page:  items:", "Pages you answer on"])
        expect(stdout).toContain(heading)
      expect(stdout).toMatch(/^ {2}update +set a phase's or an item's fields/m)
      expect(stdout).toMatch(/^ {2}seo#J3 +an item/m)
    })

    test("<verb> --help:  its usage, plain", () => {
      const { status, stdout } = epic(["close", "--help"])
      expect(status).toBe(0)
      expect(stdout).toMatch(/^Usage: epic close <epic>#J3\n/)
    })

    // epic `epic-workflow` P19
    test("<verb> --help:  an example too", () => {
      const { stdout } = epic(["close", "--help"])
      expect(stdout).toMatch(/\nExample:\n {2}epic close seo#J3\n/)
    })

    test("<group> <verb> --help:  that verb's own help, not the group's", () => {
      const { status, stdout } = epic(["ask", "create", "--help"])
      expect(status).toBe(0)
      expect(stdout).toMatch(/^Usage: epic ask create <slug> /)
      expect(stdout).toMatch(/\nExample:\n {2}epic ask create pick-layout/)
      const group = epic(["comments", "--help"])
      expect(group.stdout).toMatch(/^Usage: epic comments <verb> \[arguments\]\n/)
      expect(group.stdout).toMatch(/^ {2}working +Claude is thinking/m)
    })

    // epic `epic-engine` I147:  a phase's plan being written shows on its page
    test("phase --help:  planning, beside its statuses", () => {
      const { status, stdout } = epic(["phase", "--help"])
      expect(status).toBe(0)
      expect(stdout).toContain("<epic>#P3 planning [off]")
      expect(stdout).toMatch(/planning:\s+Claude is writing\s+its plan/)
    })

    test("an unknown verb, or a group's:  exit 1, listing the verbs", () => {
      const verb = epic(["bogus"])
      expect(verb.status).toBe(1)
      expect(verb.stderr).toContain("epic bogus?  no such verb.")
      expect(verb.stderr).toMatch(/summary, summaries, items/)
      const grouped = epic(["ask", "bogus"])
      expect(grouped.status).toBe(1)
      expect(grouped.stderr).toContain(
        "epic ask bogus?  no such verb.  The verbs:\n  create, round, show, wait, answer, draft, list, sweep, fold"
      )
    })

    test("the old order, with no #:  refused, exit 2, spelled right", () => {
      const { status, stderr } = epic(["close", "unified-server", "J3"])
      expect(status).toBe(2)
      expect(stderr).toContain("epic close unified-server#J3")
    })

    test("file:  the phase after a #;  a request it doesn't have:  a usage error", () => {
      const old = epic(["file", "unified-server", "r3", "7"])
      expect(old.status).toBe(2)
      expect(old.stderr).toContain("epic file unified-server#P7 r3")
      const missing = epic(["file", "unified-server#P1", "r999"])
      expect(missing.status).toBe(2)
      expect(missing.stderr).toContain("no request 'r999' in epic 'unified-server'")
    })

    test("an epic page's verb runs the `epic` tool", () => {
      const { status, stdout } = epic(["summary", "unified-server"])
      expect(status).toBe(0)
      expect(stdout).toMatch(/^Unified Server\n {2}\[x\] P1 · Library Core/)
    })

    test("a target the verb can't take:  a usage error, exit 2", () => {
      const { status, stderr } = epic(["summary", "unified-server#J3"])
      expect(status).toBe(2)
      expect(stderr).toContain("takes an epic, not unified-server#J3")
    })

    // epic `repo-split` P13:  Owen's names, and no stand-ins for the old ones
    test("create, lint, summarize, status, window should-stay | reload:  Owen's names;  the old ones are unknown", () => {
      expect(epic(["create", "--help"]).stdout).toMatch(/^Usage: epic create <epic> \[--title "Title"\]/)
      expect(epic(["lint", "--help"]).stdout).toMatch(/^Usage: epic lint <epic> \[--no-browser\] \[--links\]/)
      expect(epic(["summarize", "--help"]).stdout).toMatch(/^Usage: epic summarize <epic>#J3 --file <condensed.html>/)
      expect(epic(["status", "--help"]).stdout).toMatch(/^Usage: epic status \[--json\]/)
      expect(epic(["update", "--help"]).stdout).toMatch(/<epic>#J3 underway \| done \| noted/)
      expect(epic(["window", "should-stay", "--help"]).stdout).toMatch(/^Usage: epic window should-stay \[--epic\]/)
      expect(epic(["window", "reload", "--help"]).stdout).toMatch(/^Usage: epic window reload \[--review\]/)
      for (const old of ["new", "check", "overnight", "add-request", "plan-doc", "stock"]) {
        const { status, stderr } = epic([old, "unified-server"])
        expect(status).toBe(1)
        expect(stderr).toContain(`epic ${old}?  no such verb.`)
      }
    })

    test("inbox:  its own verb first;  the old order refused, spelled right", () => {
      expect(epic(["inbox", "--help"]).stdout).toMatch(/^Usage: epic inbox \[watch \| ignore \| wait \| apply\] <epic>/)
      const old = epic(["inbox", "unified-server", "wait"])
      expect(old.status).toBe(2)
      expect(old.stderr).toContain("epic inbox wait unified-server  (the inbox's verb goes first)")
    })

    test("home, and every other verb, answers in the lean program (no hand-over to main.ts since epic-eject P5)", () => {
      const { status } = epic(["home"])
      expect(status).toBe(0)
    })

    // epic `epic-eject` P5:  the verbs that were `epic window | worktree | park | session | stock | shared`
    test("worktree, session, park, shared, window, server:  their own headings, and their verbs' help", () => {
      const { stdout } = epic(["--help"])
      for (const heading of ["Worktrees, sessions and parked work:", "The epic repo:", "Windows and the page server:"])
        expect(stdout).toContain(heading)
      for (const verb of ["worktree", "session", "park", "status", "shared", "window", "server"])
        expect(stdout).toMatch(new RegExp(`^ {2}${verb} `, "m"))
      expect(epic(["worktree", "merge-main", "--help"]).stdout).toMatch(
        /^Usage: epic worktree merge-main \[--continue\]/
      )
      const bogus = epic(["session", "bogus"])
      expect(bogus.status).toBe(1)
      expect(bogus.stderr).toContain("epic session bogus?  no such verb.")
    })

    test("worktree status:  where a name stands, as JSON;  --version:  which code runs", () => {
      const { status, stdout } = epic(["worktree", "status", "no-such-name-at-all"])
      expect(status).toBe(0)
      expect(JSON.parse(stdout)).toMatchObject({ name: "no-such-name-at-all", branch: null, finished: false })
      expect(epic(["--version"]).stdout).toMatch(/^epic [0-9a-f]+ \(.*\) \//)
    })
  }
)

// epic `epic-engine` P56 (Owen, Q63:  "epic repos add | list | remove | default"):  the code repos the epic server
// serves are `epic repos`;  "the epic repo" is the one holding the pages.  The old `epic repo` still works, unshown.
describe("epic repos", () => {
  const home = realpathSync(mkdtempSync(join(tmpdir(), "epic-repos-")))
  const run = (args: string[]) => {
    const { status, stdout, stderr } = spawnSync(process.execPath, [EPIC, ...args], {
      cwd: tmpdir(),
      encoding: "utf8",
      env: { ...process.env, SPELL_EPIC_HOME: home }
    })
    return { status, stdout, stderr }
  }

  test("repos <verb>, and the old repo <verb> the same;  no help shows the old name", () => {
    try {
      expect(run(["repos", "list"])).toMatchObject({ status: 0, stdout: "no repos yet:  epic repos add <checkout>\n" })
      expect(run(["repo", "list"])).toMatchObject({ status: 0, stdout: "no repos yet:  epic repos add <checkout>\n" })
      const help = run(["repos", "--help"]).stdout
      for (const verb of ["add", "list", "remove", "default"]) expect(help).toMatch(new RegExp(`^ {2}${verb} `, "m"))
      expect(run(["repos", "list", "--help"]).stdout).toMatch(/^Usage: epic repos list \[--json\]/)
      expect(run(["repo", "list", "--help"]).stdout).toMatch(/^Usage: epic repos list \[--json\]/)
      const top = run(["--help"]).stdout
      expect(top).toMatch(/^ {2}repos +the code repos/m)
      expect(top).not.toMatch(/\brepo\|/)
      expect(top).not.toMatch(/^ {2}repo /m)
      expect(run(["repos", "bogus"]).stderr).toContain("epic repos bogus?  no such verb.")
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })
})

////////////////
// ## Flags (epic `coherence` P20):  each verb's listed in its help, any other refused, the help's examples taking them
////////////////

describe("EpicProgram.checkFlags()", () => {
  const FLAGS = { "--json": "print it as JSON", "--dry-run": "only say", "--epic <epic>": "that epic's" }

  test("a flag the verb hasn't got:  a usage error naming the nearest it has", () => {
    expect(() => EpicProgram.checkFlags("epic summary", FLAGS, ["seo", "--jsn"])).toThrow(
      "epic summary --jsn?  no such flag;  did you mean --json?  epic summary --help lists its flags"
    )
    expect(() => EpicProgram.checkFlags("epic summary", FLAGS, ["--zzzzzz"])).toThrow(
      "epic summary --zzzzzz?  no such flag.  epic summary --help lists its flags"
    )
    try {
      EpicProgram.checkFlags("epic summary", FLAGS, ["--jsn"])
    } catch (error) {
      expect(error).toBeInstanceOf(EpicCommandError)
      expect((error as EpicCommandError).exitCode).toBe(2)
    }
  })

  test("its own flags, any spelling the tools read (--dry-run, --dryRun);  values, words and -x untouched", () => {
    const args = ["seo", "--epic", "x", "--dryRun", "--json", "- a note", "-1", "--", "--a=b"]
    expect(EpicProgram.checkFlags("epic x", FLAGS, args)).toEqual(args)
    expect(EpicProgram.checkFlags("epic x", FLAGS, ["--here"], ["--here"])).toEqual(["--here"])
    expect(EpicProgram.checkFlags("epic x", undefined, ["--anything"])).toEqual(["--anything"])
  })
})

describe("every verb's flags", () => {
  const program = new EpicProgram()
  const verbs = program.epic.commands.filter((verb) => verb.name() !== "help")
  const groups = verbs.filter((verb) => verb.name() in GROUP_VERBS)

  test("every verb of no group lists its flags (VERB_FLAGS)", () => {
    const missing = verbs.filter((verb) => !(verb.name() in GROUP_VERBS) && !VERB_FLAGS[verb.name()])
    expect(missing.map((verb) => verb.name())).toEqual([])
  })

  test("its help lists them, under Options", () => {
    expect(helpOf(command("summary"))).toMatch(/Options:\n {2}--json +print it as JSON\n/)
    expect(helpOf(command("ask", "create"))).toMatch(/^ {2}--epic <epic> +in that epic's details\//m)
  })

  // the help's own examples must run (`epic pages update guides/greet.html` named a page the tool refuses)
  test("every example in a verb's help takes only flags the verb has", () => {
    const refused: string[] = []
    for (const verb of verbs) {
      const runs = groups.includes(verb) ? [verb, ...verb.commands] : [verb]
      for (const each of runs)
        for (const line of examplesIn(helpOf(each))) {
          try {
            checkExample(line)
          } catch (error) {
            refused.push(`${line}:  ${(error as Error).message}`)
          }
        }
    }
    expect(refused).toEqual([])
  })

  test("every flag a verb's usage names is one of its flags", () => {
    const wrong: string[] = []
    for (const verb of verbs) {
      if (verb.name() in GROUP_VERBS) {
        for (const each of GROUP_VERBS[verb.name() as GroupName])
          for (const flag of flagsIn(each.usage))
            if (!(flag in specs(each.flags))) wrong.push(`epic ${verb.name()} ${each.name}:  ${flag}`)
        continue
      }
      for (const flag of flagsIn(verb.usage()))
        if (!USAGE_PLACEHOLDERS.includes(flag) && !(flag in specs(VERB_FLAGS[verb.name()])))
          wrong.push(`epic ${verb.name()}:  ${flag}`)
    }
    expect(wrong).toEqual([])
  })

  /** Verb `name` (and group verb `sub`) of the program. */
  function command(name: string, sub?: string): Command {
    const found = program.epic.commands.find((verb) => verb.name() === name)!
    return sub ? found.commands.find((verb) => verb.name() === sub)! : found
  }

  /** Example `line` (`epic ask create x --epic seo`) through its verb's flag check. */
  function checkExample(line: string): void {
    const [, verb, sub, ...rest] = shellWords(line)
    if (!(verb! in GROUP_VERBS)) {
      EpicProgram.checkFlags(`epic ${verb}`, VERB_FLAGS[verb!], [sub ?? "", ...rest], ["--here"])
      return
    }
    const group = GROUP_VERBS[verb as GroupName]
    const known = group.find((each) => each.name === sub)
    const flags = known ? known.flags : Object.assign({}, ...group.map((each) => each.flags))
    EpicProgram.checkFlags(`epic ${verb} ${sub}`, flags, [sub ?? "", ...rest])
  }
})

/** Words of `usage` that name a flag but are placeholders, not flags:  `update`'s `--field <value>`. */
const USAGE_PLACEHOLDERS = ["--field"]

/** `command`'s whole help, as `--help` prints it:  its usage, options and the text after. */
function helpOf(command: Command): string {
  let text = ""
  command.configureOutput({ writeOut: (each) => (text += each), writeErr: (each) => (text += each) })
  command.outputHelp()
  return text
}

/** The example command lines in help `text`:  each line starting `  epic `, its description still on it (`shellWords()`). */
function examplesIn(text: string): string[] {
  return text
    .split("\n")
    .filter((line) => /^ {2}epic /.test(line))
    .map((line) => line.trim())
}

/**
 * `line` split as a shell would:  quotes kept together, unquoted;  stops at two spaces outside quotes, where a help's
 * example has its description.
 */
function shellWords(line: string): string[] {
  const words: string[] = []
  let word: string | undefined
  let quote: string | undefined
  for (let at = 0; at < line.length; at++) {
    const char = line[at]!
    if (quote) {
      if (char === quote) quote = undefined
      else word += char
    } else if (char === '"' || char === "'") {
      quote = char
      word ??= ""
    } else if (char === " ") {
      if (word !== undefined) words.push(word)
      word = undefined
      if (line[at + 1] === " ") break
    } else word = (word ?? "") + char
  }
  if (word !== undefined) words.push(word)
  return words
}

/** The `--flags` words of a usage line:  `<epic> [--json] [--epic <epic>]` -> `--json`, `--epic`. */
function flagsIn(usage: string): string[] {
  return [...usage.matchAll(/(?<![\w-])(--[a-z][\w-]*)/g)].map((match) => match[1]!)
}

/** The long names of `flags`' specs:  `{ "--epic <epic>": ... }` -> `{ "--epic": true }`. */
function specs(flags: VerbFlags | undefined): Record<string, true> {
  return Object.fromEntries(Object.keys(flags ?? {}).map((spec) => [/^(--[\w-]+)/.exec(spec)![1]!, true]))
}
