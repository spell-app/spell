/**
 * `tools/rename-packages.ts`:  the package rename of epic `repo-split` P17 (Q54), kept so a branch open when it landed
 * can rerun it over its own lines before merging `main`.
 * - The kit's package `spell-kit` is `spell` (`spell-kit/util` => `spell/util`, `spell-kit-source` => `spell-source`).
 * - spell-lang is `spell-parser`:  its package, its folder, its GitHub repo (`spell-lang/parser` => `spell-parser/parser`).
 * - Node 24 runs it as is (its types stripped):  `node tools/repos.ts`'s rules, node's own modules only.
 *
 * ```sh
 * node tools/rename-packages.ts [--dry-run]    # from the kit's root:  the kit and every child repo there
 * yarn install                                 # after:  the links follow (`node_modules/spell`, `spell-parser`)
 * ```
 *
 * What it does, in each repo there (the kit's and each child repo's tracked files, by `git ls-files`):
 * 1. Every text file:  `spell-kit` => `spell`, `spell-lang` => `spell-parser`, as whole names only
 *    (`spell-language` stays);  `yarn.lock` is left to `yarn install`.
 * 2. spell-lang's folder becomes `spell-parser`:  a worktree by `git worktree move`, a main checkout by renaming it
 *    and repairing its worktrees;  its `origin` follows the GitHub repo.
 * - Prints each file it changed, with how many names;  `--dry-run` changes nothing.
 * - NEVER touches the content repo (`spell.epics`):  its pages keep their history.
 */
import { spawnSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

/** The kit, the top repo:  this file is in its `tools/`. */
const TOP = resolve(import.meta.dirname, "..")

/** Each old name, as a whole name (no letter, digit, `_` or `-` before;  no letter, digit or `_` after), and its new one. */
const RENAMES: [RegExp, string][] = [
  [/(?<![\w-])spell-kit(?!\w)/g, "spell"],
  [/(?<![\w-])spell-lang(?!\w)/g, "spell-parser"],
  [/\bspellLangRepo\b/g, "spellParserRepo"]
]

/** spell-lang's folder:  old name, new name. */
const OLD_FOLDER = "spell-lang"
const NEW_FOLDER = "spell-parser"

/** Its GitHub repo, renamed 2026-10-23 (GitHub redirects the old address). */
const NEW_URL = "git@github.com:spell-app/spell-parser.git"

/** Files never rewritten:  what a tool regenerates, and this file, which names the old names on purpose. */
const SKIPPED = /(^|\/)yarn\.lock$|^tools\/rename-packages\.ts$/

const dryRun = process.argv.includes("--dry-run")
let changedFiles = 0
let changedNames = 0
for (const repo of reposThere()) renameIn(repo)
console.log(`${dryRun ? "would change" : "changed"} ${changedNames} names in ${changedFiles} files`)
moveFolder()

/** The kit, then each child repo checked out inside it:  a folder of its own with a `.git`. */
function reposThere(): string[] {
  const children = readdirSync(TOP)
    .filter((name) => name.startsWith("spell-") && existsSync(join(TOP, name, ".git")))
    .map((name) => join(TOP, name))
  return [TOP, ...children]
}

/** Rewrite the old names in `repo`'s tracked text files. */
function renameIn(repo: string): void {
  const listed = spawnSync("git", ["-C", repo, "ls-files", "-z"], { encoding: "utf8" })
  if (listed.status !== 0) throw new Error(`rename-packages:  can't list ${repo}'s files:  ${listed.stderr}`)
  for (const file of listed.stdout.split("\0").filter(Boolean)) {
    const path = join(repo, file)
    if (SKIPPED.test(file) || !isFile(path)) continue
    const before = readFileSync(path, "utf8")
    // binary:  a NUL byte
    if (before.includes("\0")) continue
    let count = 0
    let after = before
    for (const [pattern, name] of RENAMES) {
      after = after.replace(pattern, () => {
        count++
        return name
      })
    }
    if (!count) continue
    changedFiles++
    changedNames += count
    console.log(`${String(count).padStart(5)}  ${path.slice(TOP.length + 1)}`)
    if (!dryRun) writeFileSync(path, after)
  }
}

/** A regular file (not a link, a folder or a submodule)? */
function isFile(path: string): boolean {
  try {
    return statSync(path).isFile()
  } catch {
    // listed but gone:  deleted in the working tree
    return false
  }
}

/** spell-lang's folder becomes `spell-parser`, and its `origin` the renamed GitHub repo. */
function moveFolder(): void {
  const from = join(TOP, OLD_FOLDER)
  const to = join(TOP, NEW_FOLDER)
  if (!existsSync(join(from, ".git"))) return
  if (existsSync(to)) throw new Error(`rename-packages:  both ${OLD_FOLDER} and ${NEW_FOLDER} are here;  move one away`)
  console.log(`${dryRun ? "would move" : "moving"} ${OLD_FOLDER}/ to ${NEW_FOLDER}/`)
  if (dryRun) return
  if (statSync(join(from, ".git")).isFile()) {
    // a worktree:  git moves it, and its record in the main checkout
    git(TOP, ["-C", from, "worktree", "move", from, to])
  } else {
    // the main checkout:  its worktrees find it again by `repair`
    renameSync(from, to)
    git(TOP, ["-C", to, "worktree", "repair"])
  }
  const origin = spawnSync("git", ["-C", to, "remote", "get-url", "origin"], { encoding: "utf8" }).stdout.trim()
  if (origin.includes(OLD_FOLDER)) git(TOP, ["-C", to, "remote", "set-url", "origin", NEW_URL])
}

/** Run git;  throws when it fails. */
function git(cwd: string, args: string[]): void {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" })
  if (result.status !== 0) throw new Error(`rename-packages:  git ${args.join(" ")} failed:  ${result.stderr}`)
}
