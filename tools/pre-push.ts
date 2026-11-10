/**
 * What the git hook runs before a push (`yarn install` writes the hook:  `installPrePush()`, in `tools/repos.ts`).
 * - A push updating `main`:  `spell deps check` (epic `epic-engine` P67), Owen's rule:
 *   "do a dependency check/fix BEFORE pushing to github or npm".
 * - Any other push:  nothing at all, so a branch's push costs nothing.
 * - `git push --no-verify` skips it.
 * - git hands the hook a line per ref on stdin:  `<local ref> <local sha> <remote ref> <remote sha>`.
 */
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"

const MAIN = "refs/heads/main"

const updatesMain = readFileSync(0, "utf8")
  .split("\n")
  .some((line) => line.split(" ")[2] === MAIN)

if (updatesMain) {
  const check = spawnSync(process.execPath, ["bin/spell.mjs", "deps", "check"], { stdio: "inherit" })
  process.exit(check.status ?? 1)
}
