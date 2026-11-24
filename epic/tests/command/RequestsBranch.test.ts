import { execFileSync } from "child_process"
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { EpicConfig } from "spell/epic/config/EpicConfig"
import { Requests } from "spell/epic/command/Requests"

/**
 * An epic whose branch isn't its id (epic `epic-engine` I378):  epic `from-project`, its branch renamed `from-console`,
 * its worktree still in the folder named by its id.
 */
const REPO = realpathSync(mkdtempSync(join(tmpdir(), "branch-repo-")))
const CONTENT = realpathSync(mkdtempSync(join(tmpdir(), "branch-epics-")))
const WORKTREES = realpathSync(mkdtempSync(join(tmpdir(), "branch-worktrees-")))
const ELSEWHERE = join(WORKTREES, "somewhere-else")
afterAll(() => {
  for (const folder of [REPO, CONTENT, WORKTREES]) rmSync(folder, { recursive: true, force: true })
})

mkdirSync(join(REPO, ".epic"))
writeFileSync(
  join(REPO, ".epic", "config.json5"),
  JSON.stringify({ contentFolder: CONTENT, worktreesFolder: WORKTREES, baseBranch: "main" })
)
git("init", "-q", "-b", "main")
commit(".gitignore", ".epic/\n", "ignore the config")
commit("a.txt", "one", "first")
git("branch", "from-console")
git("worktree", "add", "-q", join(WORKTREES, "from-project"), "from-console")
commit("b.txt", "two", "from-console J104:  the fix", join(WORKTREES, "from-project"))
page("from-project", ' branch="from-console"')
page("epic-engine", ' branch="main"')
page("future-one", "")

describe("EpicConfig.branchOf()", () => {
  const config = new EpicConfig(REPO)

  test("the branch its page names", () => {
    expect(config.branchOf("from-project")).toBe("from-console")
  })

  test("its id:  no page, a page with no branch, or one naming the base branch (made in the main checkout)", () => {
    expect(config.branchOf("nothing-here")).toBe("nothing-here")
    expect(config.branchOf("future-one")).toBe("future-one")
    expect(config.branchOf("epic-engine")).toBe("epic-engine")
  })
})

describe("EpicConfig.worktreeFolder()", () => {
  test("its folder, when it's named by the id", () => {
    expect(new EpicConfig(REPO).worktreeFolder("from-project")).toBe(join(WORKTREES, "from-project"))
  })

  test("a folder named otherwise:  found by its branch, as git lists it", () => {
    git("branch", "renamed-too")
    git("worktree", "add", "-q", ELSEWHERE, "renamed-too")
    page("other-id", ' branch="renamed-too"')
    expect(realpathSync(new EpicConfig(REPO).worktreeFolder("other-id"))).toBe(ELSEWHERE)
    expect(new EpicConfig(REPO).worktreeFolder("no-such")).toBe(join(WORKTREES, "no-such"))
  })
})

describe("Requests.merge() of a renamed branch", () => {
  test("finds the branch by its page, and fast-forwards main to it", () => {
    const { commits } = Requests.merge("from-project", REPO)
    expect(commits.map((line) => line.replace(/^\w+ /, ""))).toEqual(["from-console J104:  the fix"])
    expect(git("log", "-1", "--format=%s", "main")).toBe("from-console J104:  the fix")
  })

  test("a page naming a branch git doesn't have:  the id, as before", () => {
    page("lost", ' branch="gone-branch"')
    expect(new EpicConfig(REPO).branchOf("lost")).toBe("lost")
    expect(() => Requests.merge("lost", REPO)).toThrow(/no branch 'lost'$/)
  })
})

/** An epic page in the epic folder, its `<epic-page>` with `attributes`. */
function page(epic: string, attributes: string): void {
  mkdirSync(join(CONTENT, "epics", epic), { recursive: true })
  writeFileSync(
    join(CONTENT, "epics", epic, `${epic}.plan.html`),
    `<!doctype html>\n<body>\n  <epic-page\n    epic="${epic}"\n    title="X"${attributes}\n  >\n  </epic-page>\n</body>\n`
  )
}

/** `git <args>` in `cwd`, its output trimmed. */
function git(...args: string[]): string {
  return execFileSync("git", args, { cwd: REPO, encoding: "utf8" }).trim()
}

/** A commit of `file` with `text`, in checkout `cwd`. */
function commit(file: string, text: string, message: string, cwd = REPO): void {
  writeFileSync(join(cwd, file), text)
  execFileSync("git", ["add", file], { cwd })
  execFileSync("git", ["-c", "user.name=test", "-c", "user.email=test@example.com", "commit", "-q", "-m", message], {
    cwd
  })
}
