/**
 * What the git hook runs before a push (`yarn install` writes the hook:  `installPrePush()`, in `tools/repos.ts`).
 * - EVERY push:  `spell names check --push <remote>` (epic `epic-engine` T153), over the commits being pushed:
 *   the names on this machine's private list, in their files, messages, pictures and branch names.
 *   A hit fails the push.
 * - A push updating `main`:  then `spell deps check` (epic `epic-engine` P67), Owen's rule:
 *   "do a dependency check/fix BEFORE pushing to github or npm".
 * - `git push --no-verify` skips both.
 * - git hands the hook the remote's name and address as arguments, and a line per ref on stdin:
 *   `<local ref> <local sha> <remote ref> <remote sha>`.
 * - Runs the `spell` of the kit this file is in, in the folder git runs it in (the repo pushing).
 */
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const MAIN = "refs/heads/main"

const SPELL = join(import.meta.dirname, "..", "bin", "spell.mjs")

const pushed = readFileSync(0, "utf8")
const remote = process.argv[2] || "origin"

const names = spawnSync(process.execPath, [SPELL, "names", "check", "--push", remote], {
  input: pushed,
  stdio: ["pipe", "inherit", "inherit"]
})
if (names.status !== 0) process.exit(names.status ?? 1)

const updatesMain = pushed.split("\n").some((line) => line.split(" ")[2] === MAIN)
if (updatesMain) {
  const check = spawnSync(process.execPath, [SPELL, "deps", "check"], { stdio: "inherit" })
  process.exit(check.status ?? 1)
}
