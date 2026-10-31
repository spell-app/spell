import { spawn, spawnSync } from "child_process"
import { copyFileSync, existsSync, mkdtempSync, readdirSync, rmSync } from "fs"
import { tmpdir } from "os"
import { dirname, join, resolve } from "path"
import { fileURLToPath } from "url"

// Import directly, not through `spell/app/cli`:  the barrel loads spell, and each side's child loads its own
import { CLI } from "spell/cli"
import type { ContentCompareOptions } from "spell/app/cli/cli.types"
import { addCheckout, linkInstall, removeCheckout } from "spell/app/cli/tempCheckout"

/** The child process that compiles one side -- see its header. */
const RUNNER = resolve(dirname(fileURLToPath(import.meta.url)), "..", "runner", "compareProjects.mts")
/** The tsconfig `tsx` runs every folder's code with, from a checkout's root. */
const KIT_TSCONFIG = "tsconfig.node.json"
/** What a commit needs for `--against`:  the helpers the child compiles with. */
const FIXTURES_FILE = "app/src/spaces/test/fixtures.ts"

/**
 * `spell content compare [--against <ref>]`:  what a language change did to every built-in project:
 * - every test project and notebook compiled here, and at `ref` (`HEAD` unless given), in a temp git worktree
 * - then each changed line of their compiled code, errors and warnings, as `git diff`, and how many files changed
 * - Keeps nothing:  uncommitted changes against `HEAD` are the usual question, and a commit is always there to ask again.
 * - Returns the exit code:  `CLI.EXIT.OK` whether or not anything changed;  `CLI.EXIT.ERRORS` if a side crashed.
 */
export async function contentCompareCommand({ against = "HEAD" }: ContentCompareOptions = {}): Promise<number> {
  const kit = CLI.findCheckout(CLI.KIT_MARKER)
  const out = mkdtempSync(resolve(tmpdir(), "spell-compare-out-"))
  const [before, after] = [join(out, "before"), join(out, "after")]
  let checkout: string | undefined
  try {
    checkout = addCheckout(kit, against, "spell-compare-", (folder) => prepareCheckout(kit, folder, against))
    const runner = join(checkout, ".compareProjects.mts")
    copyFileSync(RUNNER, runner)
    await Promise.all([compileSide(checkout, runner, before), compileSide(kit, RUNNER, after)])
  } catch (error) {
    process.stderr.write(`spell content compare:  ${error instanceof Error ? error.message : String(error)}\n`)
    return CLI.EXIT.ERRORS
  } finally {
    if (checkout) removeCheckout(kit, checkout)
  }
  // `git diff --no-index` exits 1 when the folders differ:  that's its answer here, not a failure
  const diff = spawnSync("git", ["diff", "--no-index", "--no-color", "-U0", "--", "before", "after"], {
    cwd: out,
    encoding: "utf8",
    maxBuffer: 1 << 30
  })
  const changed = (diff.stdout.match(/^diff --git /gm) ?? []).length
  process.stdout.write(diff.stdout)
  const files = readdirSync(after, { recursive: true, withFileTypes: true }).filter((it) => it.isFile()).length
  process.stdout.write(`${changed} of ${files} files changed against ${against}\n`)
  rmSync(out, { recursive: true, force: true })
  return CLI.EXIT.OK
}

/**
 * Ready temp checkout `folder` of `ref` to compile as itself:
 * - a `node_modules` of its own (`linkInstall()`)
 * - throws if `ref` is too old to have the helpers the child uses
 */
function prepareCheckout(kit: string, folder: string, ref: string): void {
  if (!existsSync(join(folder, FIXTURES_FILE))) throw new CLI.CliError(`${ref} has no ${FIXTURES_FILE}`)
  linkInstall(kit, folder)
}

/** Compile checkout `checkout`'s projects into `out`, with its copy of the child.  Rejects if the child fails. */
function compileSide(checkout: string, runner: string, out: string): Promise<void> {
  const args = ["--import", import.meta.resolve("tsx/esm"), runner, out]
  const env = { ...process.env, TSX_TSCONFIG_PATH: join(checkout, KIT_TSCONFIG) }
  return new Promise((done, fail) => {
    const child = spawn(process.execPath, args, { cwd: checkout, stdio: ["ignore", "ignore", "pipe"], env })
    let stderr = ""
    child.stderr.on("data", (data) => (stderr += data))
    child.on("error", fail)
    child.on("exit", (code) =>
      code === 0 ? done() : fail(new Error(`${checkout}:  ${stderr.trim().split("\n").slice(-3).join("\n")}`))
    )
  })
}
