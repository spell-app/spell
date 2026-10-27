import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { CoherenceScore, exportedNames, isUnder, totals, usersInMap, type ScoreSearches } from "spell/cli/coherence"
import type { MapGraph } from "spell/cli/map"

/**
 * A made-up checkout:  the kit, ONE git repo, with a watcher's home and its copies, and its folder `ui/` (epic
 * `repo-split` P20).
 * - First commit:  one copy in the kit, one in `ui/`.  Then the kit gets one more, in the working tree only.
 * - Beside the copies:  what's never counted (a comment, a bundle, a test, a path left out).
 */
const CHECKOUT = mkdtempSync(join(tmpdir(), "spell-coherence-"))
afterAll(() => rmSync(CHECKOUT, { recursive: true, force: true }))

const COPY = 'import { existsSync, watch } from "node:fs"'

write("package.json", JSON.stringify({ name: "spell", workspaces: ["ui"] }))
write("repos.json5", "{ repos: [] }")
write("src/server/LiveReload.ts", `${COPY}\n\nexport class LiveReload {}\nexport function reload() {}\n`)
write("src/server/CommandRun.ts", `${COPY}\nimport { SRV } from "spell/server"\n\nconst live = new SRV.LiveReload()\n`)
write("src/server/commented.ts", `// ${COPY}\n`)
write("src/tools/bundle.entry.js", "export {}\n")
write("src/tools/bundle.js", `${COPY}\n`)
write("src/server/Run.test.ts", `${COPY}\n`)
write("src/old/Kept.ts", `${COPY}\n`)
write("src/ui/events.ts", 'send("ui-fold")\nsend("ui-fold")\n')
write(
  "tests/server/run.test.ts",
  'test("one", () => {})\ntest.skip("two", () => {})\n  it.each([1])("three", () => {})\n'
)
write("ui/package.json", JSON.stringify({ name: "spell-ui" }))
write("ui/src/Watcher.ts", `${COPY}\nreload()\n`)
write("ui/tests/a.test.ts", 'it("a", () => {})\n')
commit("", "2026-10-25T10:00:00")
write("src/server/Another.ts", `${COPY}\n`)

/** The searches the checkout's catalog would give:  a watcher, and one word. */
const SEARCHES: ScoreSearches = {
  mechanisms: [
    {
      name: "Watching files",
      pattern: 'import \\{[^}]*\\bwatch\\b[^}]*\\} from "node:fs',
      within: [],
      homes: ["src/server/LiveReload.ts"],
      not: ["src/old/"]
    }
  ],
  words: [{ name: "open / close", pattern: '"ui-fold"', within: [], homes: [], not: [] }]
}

describe("CoherenceScore, over a made-up checkout", () => {
  const snapshot = new CoherenceScore(CHECKOUT, { searches: SEARCHES }).measure()
  const [watching] = snapshot.mechanisms

  test("copies:  every repo's code, the working tree's new file too;  never the home, a comment, a bundle, a test or a path left out", () => {
    expect(watching!.files).toEqual({
      "src/server/CommandRun.ts": 1,
      "src/server/Another.ts": 1,
      "ui/src/Watcher.ts": 1
    })
    expect(watching!.copies).toBe(3)
  })

  test("users, without a map:  the files using what the home exports, through a namespace too", () => {
    expect(snapshot.usersFrom).toBe("search")
    expect(watching!.users).toBe(2)
    expect(watching!.score).toBe(40)
  })

  test("the code's score, words and tests", () => {
    expect(snapshot).toMatchObject({ score: 40, copies: 3, users: 2, tests: { spell: 3, "spell-ui": 1 } })
    expect(snapshot.words).toEqual([{ name: "open / close", count: 2 }])
    expect(snapshot.at.dirty).toBe(true)
  })

  test("--at:  the code as it was, each repo at its commit by then", () => {
    const then = new CoherenceScore(CHECKOUT, { searches: SEARCHES, at: "2026-10-25 11:00" }).measure()
    expect(then.mechanisms[0]!.copies).toBe(2)
    expect(Object.keys(then.at.commits)).toEqual(["spell", "spell-ui"])
    expect(then.at.dirty).toBeUndefined()
  })

  test("--at before any commit:  the repos with none are left out", () => {
    expect(new CoherenceScore(CHECKOUT, { searches: SEARCHES, at: "2026-10-24 09:00" }).repos).toEqual([])
  })
})

describe("users from the code map", () => {
  const MAP: MapGraph = {
    directed: true,
    nodes: [
      { id: "home", label: "LiveReload", file_type: "code", source_file: "src/server/LiveReload.ts" },
      { id: "user", label: "CommandRun.ts", file_type: "code", source_file: "src/server/CommandRun.ts" },
      { id: "ui", label: "Watcher.ts", file_type: "code", source_file: "ui/src/Watcher.ts" },
      { id: "test", label: "Run.test.ts", file_type: "code", source_file: "src/server/Run.test.ts" },
      { id: "self", label: "LiveReload.ts", file_type: "code", source_file: "src/server/LiveReload.ts" }
    ],
    links: [
      { source: "user", target: "home", relation: "uses", confidence: "EXTRACTED" },
      { source: "ui", target: "home", relation: "imports_from", confidence: "EXTRACTED" },
      { source: "test", target: "home", relation: "uses", confidence: "EXTRACTED" },
      { source: "self", target: "home", relation: "contains", confidence: "EXTRACTED" }
    ]
  }

  test("each file linking into a home, once;  never the home itself or a test", () => {
    expect(usersInMap(MAP, ["src/server/LiveReload.ts"]).sort()).toEqual([
      "src/server/CommandRun.ts",
      "ui/src/Watcher.ts"
    ])
  })
})

describe("the score's sums", () => {
  test("weighted by size:  every mechanism's users over its users and copies", () => {
    const mechanism = (copies: number, users: number) => ({ name: "", copies, users, score: 0, files: {} })
    expect(totals([mechanism(10, 90), mechanism(90, 10)])).toEqual({ score: 50, copies: 100, users: 100 })
    expect(totals([mechanism(1, 9), mechanism(0, 0)])).toEqual({ score: 90, copies: 1, users: 9 })
    expect(totals([])).toEqual({ score: 100, copies: 0, users: 0 })
  })

  test("a home's names:  what it exports, never its types", () => {
    const text = "export class Git {}\nexport async function run() {}\nexport const X = 1\nexport type T = 1\n"
    expect(exportedNames(text)).toEqual(["Git", "run", "X"])
  })

  test("a path left out:  a file, a folder, or a glob", () => {
    expect(isUnder("ui/src/a/B.ts", "ui/src/a")).toBe(true)
    expect(isUnder("ui/src/ab/B.ts", "ui/src/a")).toBe(false)
    expect(isUnder("ui/src/a/UIB.fallback.ts", "ui/src/**.fallback.ts")).toBe(true)
    expect(isUnder("ui/src/a/UIB.ts", "ui/src/**.fallback.ts")).toBe(false)
  })
})

/** Write `text` to `path`, from the checkout's root. */
function write(path: string, text: string): void {
  mkdirSync(dirname(join(CHECKOUT, path)), { recursive: true })
  writeFileSync(join(CHECKOUT, path), text)
}

/** Make `folder` (from the checkout's root) a git repo, every file committed at `date`. */
function commit(folder: string, date: string): void {
  const cwd = join(CHECKOUT, folder)
  const env = { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date }
  const git = (...args: string[]) =>
    execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd, env })
  git("init", "-q", "-b", "main")
  git("add", ".")
  git("commit", "-qm", "one")
}
