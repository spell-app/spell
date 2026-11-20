import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { ProjectWorktrees } from "spell/cli/commands/localWorktrees"
import { kitSetting } from "spell/cli/kitCheckout"
import { kitFileAt, projectBin } from "spell/cli/projectBin"

/** A made-up project (a git repo) with two worktrees, each with its own npm install of spell. */
const root = realpathSync(mkdtempSync(join(tmpdir(), "local-worktrees-")))
afterAll(() => rmSync(root, { recursive: true, force: true }))

const project = join(root, "app")
const seo = join(root, "app.worktrees", "seo")
const docs = join(root, "app.worktrees", "docs")
const kit = join(root, "spell")
mkdirSync(project)
mkdirSync(kit)
/** git in `cwd`, with a made-up person. */
const git = (cwd: string, ...args: string[]) =>
  spawnSync("git", ["-c", "user.name=Alice", "-c", "user.email=alice@acme.test", ...args], { cwd })
git(project, "init", "-q")
git(project, "commit", "-q", "--allow-empty", "-m", "start")
git(project, "worktree", "add", "-q", seo)
git(project, "worktree", "add", "-q", docs)
for (const folder of [project, seo, docs]) {
  mkdirSync(join(folder, "node_modules", "spell", "bin"), { recursive: true })
  writeFileSync(join(folder, "node_modules", "spell", "bin", "spell.mjs"), "")
}
const KIT_TEXT = `{ kit: "${kit}" }\n`

describe("a project's worktrees follow its main checkout (repo-split T72)", () => {
  test("no setting:  each worktree runs its own npm install", () => {
    expect(kitFileAt(seo)).toBeUndefined()
    expect(projectBin(seo, ["node_modules/spell/bin/spell.mjs"], {})).toBe(
      join(seo, "node_modules", "spell", "bin", "spell.mjs")
    )
  })

  test("the main checkout's setting counts in a worktree, with no copy:  the checkout's bins run there", () => {
    mkdirSync(join(project, ".spell"))
    writeFileSync(join(project, ".spell", "kit.json5"), KIT_TEXT)
    expect(kitFileAt(seo)).toBe(join(project, ".spell", "kit.json5"))
    expect(kitFileAt(join(seo, "node_modules"))).toBeUndefined()
    expect(kitSetting(join(seo, "src"), {})?.kit).toBe(kit)
    expect(projectBin(seo, ["node_modules/spell/bin/spell.mjs"], {})).toBeUndefined()
  })

  test("follow():  a copy in each worktree for older bins, kept out of git;  a worktree's own file left alone", () => {
    mkdirSync(join(docs, ".spell"))
    writeFileSync(join(docs, ".spell", "kit.json5"), "{ kit: '~/other' }\n")
    const worktrees = new ProjectWorktrees(project)
    expect(worktrees.folders.sort()).toEqual([docs, seo].sort())
    expect(worktrees.follow(KIT_TEXT)).toEqual([seo])
    expect(readFileSync(join(seo, ".spell", "kit.json5"), "utf8")).toContain(KIT_TEXT)
    expect(git(seo, "check-ignore", "-q", ".spell/kit.json5").status).toBe(0)
    expect(worktrees.follow(KIT_TEXT)).toEqual([])
    expect(worktrees.notFollowing).toEqual([])
    expect(worktrees.unfollow()).toEqual([seo])
    expect(existsSync(join(seo, ".spell", "kit.json5"))).toBe(false)
    expect(readFileSync(join(docs, ".spell", "kit.json5"), "utf8")).toBe("{ kit: '~/other' }\n")
    expect(worktrees.notFollowing).toEqual([seo])
  })
})
