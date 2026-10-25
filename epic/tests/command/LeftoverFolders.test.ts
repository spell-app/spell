/**
 * `LeftoverFolders` (epic `epic-engine` r22):  a removed worktree's folder git couldn't empty, finished off.
 * - on scratch folders and a scratch git repo:  a worktree whose folder `git worktree remove` can't delete (a file it
 *   can't remove, as a language server's busy cache stands in for), then the tool's own removal
 */
import { execFileSync } from "node:child_process"
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { LeftoverFolders } from "spell-epic/command/LeftoverFolders"
import { Worktrees } from "spell-epic/command/Worktrees"

const TEMP = realpathSync(mkdtempSync(join(tmpdir(), "leftover-folders-")))
const HOME = join(TEMP, "epic-home")

afterAll(() => {
  for (const dir of [join(TEMP, "stuck", "locked"), join(TEMP, "repo.worktrees", "w", "locked")])
    if (existsSync(dir)) chmodSync(dir, 0o755)
  rmSync(TEMP, { recursive: true, force: true })
})

describe("LeftoverFolders", () => {
  test("clear() deletes a folder;  sweep() empties the trash", () => {
    const folder = join(TEMP, "plain")
    mkdirSync(join(folder, "node_modules", ".cache"), { recursive: true })
    writeFileSync(join(folder, "node_modules", ".cache", "lsp.json"), "{}")
    expect(LeftoverFolders.clear(folder, { home: HOME })).toEqual({ done: "deleted" })
    expect(existsSync(folder)).toBe(false)

    mkdirSync(join(HOME, "trash", "w-1"), { recursive: true })
    writeFileSync(join(HOME, "trash", "w-1", "x"), "x")
    expect(LeftoverFolders.sweep({ home: HOME })).toBe(1)
    expect(readdirSync(join(HOME, "trash"))).toEqual([])
  })

  test("clear() moves a folder it can't empty into the trash:  its place is free at once", () => {
    const folder = join(TEMP, "stuck")
    mkdirSync(join(folder, "locked"), { recursive: true })
    writeFileSync(join(folder, "locked", "busy"), "x")
    // a folder whose entries can't be deleted:  as one still being written into
    chmodSync(join(folder, "locked"), 0o555)
    const result = LeftoverFolders.clear(folder, { home: HOME })
    expect(result.done).toBe("trashed")
    expect(existsSync(folder)).toBe(false)
    if (result.done === "trashed") {
      expect(result.to.startsWith(join(HOME, "trash", "stuck-"))).toBe(true)
      chmodSync(join(result.to, "locked"), 0o755)
    }
    expect(LeftoverFolders.said(folder, result)).toMatch(/moved to .*trash/)
  })

  test("Worktrees.removeOne() finishes a removal git left half done", () => {
    const repo = join(TEMP, "repo")
    const git = (args: string[], cwd = repo) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: "pipe" })
    mkdirSync(repo)
    git(["init", "-q", "-b", "main"])
    writeFileSync(join(repo, "a.txt"), "a")
    git(["add", "."])
    git(["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "a"])
    const worktree = join(TEMP, "repo.worktrees", "w")
    git(["worktree", "add", "-q", "-b", "w", worktree])
    // an untracked cache git can't delete:  git's removal fails "Directory not empty"
    mkdirSync(join(worktree, "locked"))
    writeFileSync(join(worktree, "locked", "busy"), "x")
    chmodSync(join(worktree, "locked"), 0o555)
    process.env.SPELL_EPIC_HOME = HOME
    try {
      const lines = Worktrees.removeOne(worktree, repo, { force: true })
      expect(lines[0]).toBe(`removed ${worktree}`)
      expect(existsSync(worktree)).toBe(false)
      expect(git(["worktree", "list"])).not.toContain(worktree)
    } finally {
      delete process.env.SPELL_EPIC_HOME
      for (const name of existsSync(join(HOME, "trash")) ? readdirSync(join(HOME, "trash")) : [])
        if (existsSync(join(HOME, "trash", name, "locked"))) chmodSync(join(HOME, "trash", name, "locked"), 0o755)
    }
  })
})
