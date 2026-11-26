import { existsSync, readdirSync, readFileSync, statSync } from "fs"
import { join, resolve } from "path"

import { SRV } from "spell/server"
import { DEFAULT_PORT, portFor } from "spell/server/page"

/**
 * Which page server `spell app serve` runs the editor on, and on what port.
 * - Why:  run from a project's checkout (a repo whose `node_modules/spell` links to Spell's main checkout), it used
 *   the KIT's own page server:  the kit's record, `.spell-server.json`, port 4747.
 *   So it started that server when it was down, or restarted it when it was older than its code -- as a child of
 *   whoever ran it -- and the person's own page server ended up inside someone else's job.
 * - Now a project's checkout uses its OWN page server, as `spell server local --spaces spaces` does:  its record,
 *   its spaces, any free port (`serveSpaces()`, `planPageServer()`).
 * - And `app serve` never starts, stops or restarts a page server another checkout owns.
 */

/** Where the spaces a page server serves come from:  the flag, the environment, and the caller's folder. */
export type ServeSpacesInput = {
  /** `--spaces <dir>`, as typed */
  given?: string
  /** `SPELL_SPACES_DIR`, already set */
  env?: string
  /** the folder `spell app serve` ran in */
  cwd: string
  /** the kit's root, whose page server it is (`pageServerRoot()`) */
  root: string
  /** a checkout with no spaces yet gets its root (`orgRepoSpaces()`'s `forNew`):  `spell app create`'s */
  forNew?: boolean
}

/**
 * The spaces folder `spell app serve` serves;  `undefined`:  the kit's own (spell.spaces).
 * - `--spaces <dir>`, from `cwd`
 * - else `SPELL_SPACES_DIR`, as the page server reads it
 * - else, run in a git checkout other than the kit's (a project's):  its spaces folder (`orgRepoSpaces()`),
 *   the checkout itself when it holds an org's folder (`@acme/`), else its `spaces/` folder, when it has one
 * - `forNew`:  an org's checkout with neither gets the layout to start, its root (`spell app create`)
 * - MUST be set (`SPELL_SPACES_DIR`) before the app's `environment` loads:  it reads the spaces once, as it loads
 */
export function serveSpaces({ given, env, cwd, root, forNew = false }: ServeSpacesInput): string | undefined {
  if (given) return resolve(cwd, given)
  if (env) return resolve(env)
  const caller = SRV.checkoutOf(cwd)
  if (!caller || !isOtherCheckout(cwd, root)) return undefined
  return orgRepoSpaces(caller.root, { forNew })
}

/**
 * The spaces folder of an org's repo at `root` (epic `editor` P47, Q100 A):  the repo itself when it holds an org's
 * folder (`@acme/`, beside its `package.json`), else its `spaces/` when it has one;  `undefined`:  neither.
 * - So `<root>/@acme/org-spell/dashboard/` is `@acme/org-spell/dashboard`, as `<root>/spaces/@acme/...` was:
 *   addresses don't change, nor links and imports between projects.
 * - `forNew`:  a repo that has neither yet, and names its org (`"spell": { "org" }` in its `package.json`), gets the
 *   layout to start, the root (`spell app create`);  any other repo, none, as before.
 * - Here, not in spaces' `spellSpacesDir.ts`:  that file reads the spaces as it loads, and this decides them first.
 */
export function orgRepoSpaces(root: string, { forNew = false }: { forNew?: boolean } = {}): string | undefined {
  if (orgFoldersIn(root).length) return root
  const spaces = join(root, "spaces")
  if (existsSync(spaces) && statSync(spaces).isDirectory()) return spaces
  return forNew && namesItsOrg(root) ? root : undefined
}

/** Does the repo at `root` name its org, `"spell": { "org": "acme" }` in its `package.json`?  NEVER throws. */
function namesItsOrg(root: string): boolean {
  try {
    const settings = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { spell?: { org?: unknown } }
    return typeof settings.spell?.org === "string" && !!settings.spell.org
  } catch {
    return false
  }
}

/** The org folders in `dir`, by name:  `["@acme"]`;  none when it isn't there. */
function orgFoldersIn(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && ORG_FOLDER.test(entry.name))
    .map((entry) => entry.name)
}

/** An org's folder in a spaces folder:  `@acme`. */
const ORG_FOLDER = /^@[a-z][a-z0-9_]*$/

/** The root of the git checkout `cwd` is in, when it's another than kit `root`'s (`isOtherCheckout()`):  a project's. */
export function otherCheckoutRoot(cwd: string, root: string): string | undefined {
  return isOtherCheckout(cwd, root) ? SRV.checkoutOf(cwd)?.root : undefined
}

/**
 * Is `cwd` in a git checkout that isn't kit `root`'s, nor one of its worktrees?
 * - a folder in no git checkout (spell.spaces, a project folder of its own) isn't:  the kit's server is its server
 * - nor is anything when the kit is in no checkout (an npm install of `spell`)
 */
export function isOtherCheckout(cwd: string, root: string): boolean {
  const caller = SRV.checkoutOf(cwd)
  const kit = SRV.checkoutOf(root)
  return Boolean(caller && kit && caller.main !== kit.main)
}

/**
 * What `planPageServer()` asks of the machine:  what answers on a port, and whether it's free.
 * - tests hand in their own
 */
export type PortProbe = {
  /** the page server answering on `port`, `SRV.SERVER_API`;  `undefined`:  none */
  serverOn(port: number): Promise<SRV.ServerInfo | undefined>
  /** is `port` free to listen on */
  isFree(port: number): Promise<boolean>
}

/** The machine's own `PortProbe`:  free on IPv4 AND IPv6 (on macOS `::` binds while another holds `0.0.0.0`). */
export const MACHINE_PROBE: PortProbe = {
  serverOn: (port) => SRV.serverAt(`http://${SRV.LOCALHOST}:${port}`),
  isFree: async (port) => (await SRV.isFree(port, "0.0.0.0")) && (await SRV.isFree(port, "::"))
}

/** `planPageServer()`'s input. */
export type PlanInput = {
  /** the kit's root, whose page server it is */
  root: string
  /** the folder `spell app serve` ran in */
  cwd: string
  /** the spaces it serves (`serveSpaces()`);  `undefined`:  the kit's own */
  spaces?: string
  /** `--page-port`, when given */
  pagePort?: number
  /** default `MACHINE_PROBE` */
  probe?: PortProbe
}

/**
 * How `spell app serve` gets its page server.
 * - `own`:  `PageServer.ensure(root, port)`:  started if it isn't running, restarted if it's older than its code
 *   - it's this caller's own:  a project's spaces' server, or the kit's when run from the kit's checkout
 *   - `port` 0:  any free one
 * - `running`:  the kit's own server, which ANOTHER checkout owns:  used as it is, never started, stopped or restarted
 * - `notes`:  what to tell the person, e.g. a port taken by another server
 */
export type PagePlan = { use: "own"; port: number; notes: string[] } | { use: "running"; notes: string[] }

/**
 * Which page server `spell app serve` uses, and on what port (`PagePlan`).
 * - a project's spaces:  their own page server (`SRV.PidFile.forPageServer()`), on `--page-port` or any free port;
 *   never `DEFAULT_PORT` unasked (`portFor()`)
 * - the kit's own spaces from another checkout:  `running` only;  `--page-port` doesn't apply, and says so
 * - the kit's own spaces from the kit's checkout:  as `spell server start`:  the main checkout's on `DEFAULT_PORT`,
 *   a worktree's on any free port, or `--page-port`
 * - `--page-port`, or a project's port, held by ANOTHER root's or spaces' server, or another program:  says so, and
 *   takes any free port instead -- never stops what holds it
 *   - the main checkout's own `DEFAULT_PORT` stays its only port, as `spell server start` keeps it (it fails, taken)
 */
export async function planPageServer({
  root,
  cwd,
  spaces,
  pagePort,
  probe = MACHINE_PROBE
}: PlanInput): Promise<PagePlan> {
  const notes: string[] = []
  const pidFile = SRV.PidFile.forPageServer(root, spaces)
  const isProjects = pidFile.spaces !== undefined
  if (!isProjects && isOtherCheckout(cwd, root)) {
    if (pagePort !== undefined) {
      notes.push(`--page-port applies only to a page server this checkout owns:  ${root}'s is used as it is`)
    }
    return { use: "running", notes }
  }
  let port = portFor(root, pagePort ?? DEFAULT_PORT, pidFile.spaces)
  if (port && (isProjects || pagePort !== undefined)) {
    const holder = await probe.serverOn(port)
    if (holder && !pidFile.isServing(holder)) {
      const whose = holder.spaces ? `${holder.root}, for ${holder.spaces}` : holder.root
      notes.push(`Port ${port} is held by the page server of ${whose}:  using a free port instead`)
      port = 0
    } else if (!holder && !(await probe.isFree(port))) {
      notes.push(`Port ${port} is in use by another program:  using a free port instead`)
      port = 0
    }
  }
  return { use: "own", port, notes }
}
