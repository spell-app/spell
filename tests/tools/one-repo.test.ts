import { execFileSync, spawnSync } from "node:child_process"
import { copyFileSync, mkdirSync, readFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

/** `spell rename branches` (`tools/one-repo/one-repo.ts --step carry-on`) over scratch git repos. */
const SCRIPT = join(import.meta.dirname, "..", "..", "tools", "one-repo", "one-repo.ts")
const hasFilterRepo = spawnSync("git", ["filter-repo", "--version"]).status === 0
const roots: string[] = []
afterAll(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })))

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd, encoding: "utf8" })
}

function write(root: string, path: string, text: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true })
  writeFileSync(join(root, path), text)
}

/**
 * A scratch kit with a merged `app/`, and an old `spell-app/` checkout inside it whose `main` P20 merged
 * (so `commit-map-app.txt` lists every commit of it) and whose current branch is `epic`.
 */
function scratchKit() {
  const kit = mkdtempSync(join(tmpdir(), "spell-one-repo-test-"))
  roots.push(kit)
  git(kit, "init", "-q", "-b", "main")
  write(kit, ".git/info/exclude", "spell-app/\n")
  write(kit, "package.json", '{ "name": "spell" }\n')
  git(kit, "add", "-A")
  git(kit, "commit", "-qm", "kit")
  const old = join(kit, "spell-app")
  mkdirSync(old)
  git(old, "init", "-q", "-b", "main")
  write(old, "a.txt", "a\n")
  git(old, "add", "-A")
  git(old, "commit", "-qm", "one")
  // what P20 did:  the old main rewritten into app/, merged in, its commit map kept
  const clone = join(kit, "..", `${kit.split("/").pop()}-clone`)
  roots.push(clone)
  git(kit, "clone", "-q", "--no-local", old, clone)
  git(clone, "filter-repo", "--quiet", "--force", "--preserve-commit-hashes", "--to-subdirectory-filter", "app")
  git(kit, "fetch", "-q", clone, "main")
  git(kit, "merge", "-q", "--allow-unrelated-histories", "-m", "app merged", "FETCH_HEAD")
  write(kit, "app/package.json", "{}\n")
  mkdirSync(join(kit, "tools/one-repo"), { recursive: true })
  copyFileSync(join(clone, ".git", "filter-repo", "commit-map"), join(kit, "tools/one-repo/commit-map-app.txt"))
  git(kit, "add", "-A")
  git(kit, "commit", "-qm", "map")
  git(old, "checkout", "-q", "-b", "epic")
  const ident = { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" }
  return {
    kit,
    run: () => {
      const result = spawnSync(process.execPath, [SCRIPT, "--step", "carry-on"], {
        cwd: kit,
        encoding: "utf8",
        env: { ...process.env, ...ident, ONE_REPO_KIT: kit }
      })
      expect(result.stderr).not.toContain("nothing added to commit")
      expect(result.status, result.stderr).toBe(0)
      return result.stdout
    },
    merges: () =>
      git(kit, "log", "--format=%s")
        .split("\n")
        .filter((line) => line.includes("merged into app/")).length,
    status: () => git(kit, "status", "--porcelain").trim()
  }
}

describe.skipIf(!hasFilterRepo)("spell rename branches", () => {
  test("skips a branch with no commits of its own, leaving nothing behind", () => {
    const { run, merges, status, kit } = scratchKit()
    const before = git(kit, "rev-parse", "HEAD")
    expect(run()).toContain("spell-app: nothing of its own, skipped")
    expect(git(kit, "rev-parse", "HEAD")).toBe(before)
    expect(merges()).toBe(0)
    expect(status()).toBe("")
  })

  test("carries a branch with its own commit once, and a rerun merges and commits nothing", () => {
    const { run, merges, status, kit } = scratchKit()
    const old = join(kit, "spell-app")
    write(old, "b.txt", "b\n")
    git(old, "add", "-A")
    git(old, "commit", "-qm", "two")
    run()
    expect(merges()).toBe(1)
    expect(status()).toBe("")
    const after = git(kit, "rev-parse", "HEAD")
    expect(run()).toContain("already merged")
    expect(git(kit, "rev-parse", "HEAD")).toBe(after)
    expect(merges()).toBe(1)
    expect(status()).toBe("")
  })
})

describe.skipIf(!hasFilterRepo)("spell rename branches, which files it renames", () => {
  test("renames only the files the branch's own commits changed", () => {
    const { run, kit } = scratchKit()
    const old = join(kit, "spell-app")
    write(kit, "app/fixture.ts", 'export const EXTRAS = ["spell-app/vscode"]\n')
    git(kit, "add", "-A")
    git(kit, "commit", "-qm", "main's fixture")
    write(old, "b.ts", 'import "spell-ui/ui-button"\n')
    git(old, "add", "-A")
    git(old, "commit", "-qm", "two")
    run()
    expect(readFileSync(join(kit, "app/fixture.ts"), "utf8")).toContain("spell-app/vscode")
  })
})
