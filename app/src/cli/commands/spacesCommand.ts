import { execFileSync } from "node:child_process"

import { CLI } from "spell/cli"
import { SRV } from "spell/server"
import { checkoutOf } from "spell/server/checkout"
import { pageServerRoot } from "spell/server/page/settings"
import { MORE_SPACES_FILE, moreSpacesInFile, servedSpaces, switchSpaces } from "spell/server/MoreSpaces"
import { repoDir, spellSpacesDir } from "spell/app/spaces/server/node/spellSpacesDir"

/**
 * `spell spaces [use <folder> [--org <org>] [--no-restart]]`:  which spaces folders the kit's page server serves, by
 * org, and switching one (the more spaces folders, `~/.spell/more-spaces.json5`:  spaces' `spellSpacesDir.ts`).
 * - `spell spaces`:  each org served, the folder it's served from, and that folder's git branch
 * - `spell spaces use <folder>`:  serve `<folder>` (any checkout's `spaces/`:  a project's main, or one of its
 *   worktrees', to see work before it's merged) for the orgs it holds, or for `--org` alone (`SRV.switchSpaces()`)
 *   - written into the file, in place of the folder that served those orgs:  ONE folder per org
 *   - the epic hub's Servers page does the same with its Show in the editor (spell-epic's `ServerKeeper`)
 *   - then the server keeper restarts the main checkout's page server, which reads the file as it starts
 *     (`SRV.KeeperLink`);  with no keeper running, or `--no-restart`, it says what to run
 * - Node only;  loads spaces' node side alone (no `loadApp()`).
 */
export async function spacesCommand(options: SpacesOptions = {}): Promise<number> {
  const file = options.file ?? MORE_SPACES_FILE
  const served = servedSpaces(moreSpacesInFile(file))
  const rows = [
    ...served.flatMap(({ dir, orgs }) => orgs.map((org) => ({ org, dir }))),
    { org: "spell", dir: spellSpacesDir }
  ]
  for (const { org, dir } of rows) {
    const branch = branchOf(dir)
    console.log(`@${org}  ${dir}${branch ? `  (${branch})` : ""}`)
  }
  if (!served.length) console.log(`No more spaces folders:  \`spell spaces use <folder>\` adds one (${file}).`)
  return 0
}

/** `spell spaces use <folder>`:  see `spacesCommand()`. */
export async function useCommand(folder: string, options: UseOptions = {}): Promise<number> {
  const file = options.file ?? MORE_SPACES_FILE
  let orgs: string[]
  try {
    orgs = switchSpaces(folder, { file, ...(options.org && { org: options.org }) })
  } catch (error) {
    if (error instanceof TypeError) throw new CLI.CliError(error.message)
    throw error
  }
  console.log(`@${orgs.join(", @")} now served from ${SRV.homeExpanded(folder)} (${file}).`)
  if (options.restart === false) {
    console.log(`Restart the page server to serve it:  ${RESTART}.`)
    return 0
  }
  const kit = checkoutOf(pageServerRoot(repoDir))?.main ?? pageServerRoot(repoDir)
  const keeper = options.keeper ?? new SRV.KeeperLink()
  try {
    const answer = await keeper.ask("restart", { checkout: kit })
    if (answer) {
      console.log("The server keeper restarted the page server:  it serves it now.")
      return 0
    }
  } catch (error) {
    console.log(`The server keeper couldn't restart the page server:  ${(error as Error).message}`)
    console.log(`Restart it to serve it:  ${RESTART}.`)
    return 1
  }
  console.log(`No server keeper runs:  restart the page server to serve it, ${RESTART}.`)
  return 0
}

/** How a person restarts the main checkout's page server by hand. */
const RESTART = "`epic servers restart page-server --repo spell`, or `spell server stop` then `spell server start`"

/** `dir`'s git branch, `main`;  `undefined` outside git.  NEVER throws. */
function branchOf(dir: string): string | undefined {
  try {
    return execFileSync("git", ["-C", dir, "rev-parse", "--abbrev-ref", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim()
  } catch {
    return undefined
  }
}

/** Options of `spell spaces`. */
export type SpacesOptions = {
  /** the more spaces file:  default `MORE_SPACES_FILE`;  tests hand their own */
  file?: string
}

/** Options of `spell spaces use`. */
export type UseOptions = SpacesOptions & {
  /** serve the folder for this org alone (`acme` or `@acme`):  default every org it holds */
  org?: string
  /** `false` (`--no-restart`):  write the file, and only say how to restart */
  restart?: boolean
  /** the server keeper's link:  default this machine's;  tests hand their own */
  keeper?: Pick<SRV.KeeperLink, "ask">
}
