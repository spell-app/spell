import { spawnSync } from "node:child_process"
import { existsSync, readFileSync, realpathSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import JSON5 from "json5"
import { describe, expect, test, vi } from "vite-plus/test"

import { EpicConfig } from "$/epics/config/EpicConfig"

/**
 * The real `epic` command, end to end:  `bin/epic` run as a separate process, as a user would.
 * - Its data:  spell-app's checkout, beside spell-epic in the top `spell` repo (`SPELL_APP`), its epic pages
 *   (`unified-server`, merged long ago) and worktrees;  skipped without it.
 * - Moved from spell-app's CLI tests (`tests/cli/src/cli.test.ts`) at the switch (epic `epic-eject` I5).
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
      for (const heading of ["Requests from other sessions:", "Epic page:  items:", "Pages Owen answers on"])
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
      const { status, stdout } = epic(["ask", "new", "--help"])
      expect(status).toBe(0)
      expect(stdout).toMatch(/^Usage: epic ask new <slug> /)
      expect(stdout).toMatch(/\nExample:\n {2}epic ask new pick-layout/)
      const group = epic(["comments", "--help"])
      expect(group.stdout).toMatch(/^Usage: epic comments <verb> \[arguments\]\n/)
      expect(group.stdout).toMatch(/^ {2}working +Claude is thinking/m)
    })

    test("an unknown verb, or a group's:  exit 1, listing the verbs", () => {
      const verb = epic(["bogus"])
      expect(verb.status).toBe(1)
      expect(verb.stderr).toContain("epic bogus?  no such verb.")
      expect(verb.stderr).toMatch(/summary, summaries, items/)
      const grouped = epic(["ask", "bogus"])
      expect(grouped.status).toBe(1)
      expect(grouped.stderr).toContain(
        "epic ask bogus?  no such verb.  The verbs:\n  new, show, wait, answer, draft, list, sweep"
      )
    })

    test("the old order, with no #:  refused, exit 2, spelled right", () => {
      const { status, stderr } = epic(["close", "unified-server", "J3"])
      expect(status).toBe(2)
      expect(stderr).toContain("epic close unified-server#J3")
    })

    test("file:  the phase after a #;  add-request, its old name, runs it, hidden", () => {
      expect(epic(["--help"]).stdout).not.toMatch(/^ {2}add-request /m)
      const old = epic(["file", "unified-server", "r3", "7"])
      expect(old.status).toBe(2)
      expect(old.stderr).toContain("epic file unified-server#P7 r3")
      const alias = epic(["add-request", "unified-server#P1", "r999"])
      expect(alias.status).toBe(2)
      expect(alias.stderr).toContain("no request 'r999' in epic 'unified-server'")
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

    // epic `epic-eject` I5:  what spell-app's `spell dev plan-doc ...` hands on to
    test("plan-doc:  the epic tool in its own order, hidden", () => {
      expect(epic(["--help"]).stdout).not.toMatch(/^ {2}plan-doc /m)
      const { status, stdout } = epic(["plan-doc", "summary", "unified-server"])
      expect(status).toBe(0)
      expect(stdout).toMatch(/^Unified Server\n {2}\[x\] P1 · Library Core/)
    })

    test("home, and every other verb, answers in the lean program (no hand-over to main.ts since epic-eject P5)", () => {
      const { status } = epic(["home"])
      expect(status).toBe(0)
    })

    // epic `epic-eject` P5:  the verbs that were `spell dev window | worktree | park | session | stock | shared`
    test("worktree, session, park, shared, window, server:  their own headings, and their verbs' help", () => {
      const { stdout } = epic(["--help"])
      for (const heading of ["Worktrees, sessions and parked work:", "Shared content:", "Windows and the page server:"])
        expect(stdout).toContain(heading)
      for (const verb of ["worktree", "session", "park", "stock", "shared", "window", "server"])
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
