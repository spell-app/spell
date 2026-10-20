import { spawnSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs"
import { basename, dirname, join, sep } from "node:path"

// By relative path, `.ts` and all:  the hooks load this file with plain `node` (types stripped)
import { EpicConfig } from "./EpicConfig.ts"

/****************
 * ### `EpicRepo`
 * Which REPO an epic is worked in, seen from a checkout of some repo (epic `epic-engine` I47).
 *
 * ```ts
 * EpicRepo.elsewhere("epic-engine", "/Users/owen/www/spell-app/spell-app")
 * // => { name: "epic-engine", checkout: ".../spell-epic", worktree: ".../spell-epic.worktrees/epic-engine", ... }
 * EpicRepo.elsewhere("seo", "/Users/owen/www/spell-app/spell-app")   // => undefined:  spell-app's own
 * ```
 *
 * Why:  two repos share one content folder (spell-epic's epics are spell-app's pages), so an epic's page is found
 * from either repo's checkout, and nothing stopped a session in spell-app's window making worktree `epic-engine` in
 * spell-app, whose edits then went through its `spell-epic` link into spell-epic's MAIN checkout.
 * - What reads it:
 *   - the `WorktreeCreate` hook (`hooks/worktree.mjs`):  refuses worktree `<name>` in the wrong repo
 *   - the prompt gate (`PromptGate`):  `/epic resume <name>` ... in the wrong repo's window says which window
 *   - the session-start guard (`WorktreeGuard`):  a session in a stray worktree of that name
 *   - `epic worktree path <name>`, `epic window launch|open|close <name>`:  the epic's own repo's
 *   - `epic list --json`:  `repo`, and `checkout` in that repo
 *
 * How it knows, from the epic page's `<epic-page>` (`epics/<name>/<name>.plan.html` in this repo's content folder):
 * 1. `worktree`, the checkout `epic new` ran in:  its MAIN checkout is the epic's repo (`mainOfPath()`)
 *    - a folder gone since:  `<main>/.claude/worktrees/<w>`, or `<main>.worktrees/<w>` beside the repo
 * 2. else `repo`, its GitHub page:  compared with this checkout's `origin` (`sameUrl()`);  the repo's checkout then
 *    is a folder beside this one whose `origin` it is (`checkoutByUrl()`)
 * - Same repo when the main checkouts are one, or both have the same `origin` (another clone).
 * - Says nothing (`undefined`) when it can't tell:  no page, a future epic with neither attribute, no `origin`.
 *   Everything that reads it then goes on as before:  it only ever refuses when it's sure.
 *
 * Its position:  node's own modules and `EpicConfig` by path, so plain `node` loads it.
 * NEVER an alias, an `enum` or a parameter property.  All `static`.
 ****************/
export class EpicRepo {
  /**
   * Where epic `name` is worked in, seen from checkout `cwd`;  `undefined` when there's no page for it, or nothing on
   * it says (`EpicHome`).
   */
  static of(name: string, cwd: string): EpicHome | undefined {
    if (!name || !cwd) return undefined
    const here = EpicConfig.mainOf(cwd)
    const page = EpicRepo.pageOf(name, here)
    return page ? EpicRepo.homeOf(name, page, EpicRepo.attributesOf(page), here) : undefined
  }

  /**
   * `of()`, from what's read already:  epic `name`'s page `page`, its `<epic-page>`'s `worktree` and `repo`, seen from
   * main checkout `here`.
   * - `origins`:  each checkout's `origin` as found, kept for the next call (`epic list` asks for every epic)
   */
  static homeOf(
    name: string,
    page: string,
    { worktree, repo }: { worktree: string | null; repo: string | null },
    here: string,
    origins = new Map<string, string | null>()
  ): EpicHome | undefined {
    const origin = (dir: string) => {
      if (!origins.has(dir)) origins.set(dir, EpicRepo.originOf(dir))
      return origins.get(dir)!
    }
    const owner = worktree ? EpicRepo.mainOfPath(worktree) : null
    let own: boolean
    if (owner) own = real(owner) === real(here) || EpicRepo.sameUrl(origin(owner), origin(here))
    else if (repo && origin(here)) own = EpicRepo.sameUrl(repo, origin(here))
    else return undefined
    const checkout = own ? here : (owner ?? EpicRepo.checkoutByUrl(repo, here))
    const folder = checkout ? new EpicConfig(checkout).worktreeFolder(name) : null
    return {
      name,
      page,
      here,
      own,
      checkout,
      url: repo,
      worktree: folder,
      made: Boolean(folder && existsSync(join(folder, ".git")))
    }
  }

  /** `of()`, only when epic `name` is ANOTHER repo's than `cwd`'s;  else `undefined`. */
  static elsewhere(name: string, cwd: string): EpicHome | undefined {
    try {
      const home = EpicRepo.of(name, cwd)
      return home && !home.own ? home : undefined
    } catch {
      // can't tell:  never stand in the way
      return undefined
    }
  }

  /**
   * One line for Owen (and Claude) saying where epic `home` is worked, and how to get there:
   * the worktree hook's refusal, the prompt gate's note.
   */
  static refusal(home: EpicHome): string {
    const repo = home.checkout ? `${basename(home.checkout)} (${home.checkout})` : `the repo at ${home.url}`
    const enter =
      home.made && home.worktree
        ? `;  a session started in ${basename(home.checkout!)} enters it with EnterWorktree, path "${home.worktree}"`
        : ""
    return (
      `Epic ${home.name} is worked in ${repo}, not this repo (${basename(home.here)}):  ` +
      `no worktree ${home.name} here.  Open its own window:  \`epic window launch ${home.name}\`` +
      ` (it finds ${home.name}'s repo from here)${enter}.`
    )
  }

  /** Epic `name`'s page in main checkout `here`'s content folder:  `<name>.plan.html`, or an old `<name>.html`. */
  static pageOf(name: string, here: string): string | undefined {
    const dir = join(EpicConfig.contentOf(here), "epics", name)
    return [`${name}.plan.html`, `${name}.html`].map((file) => join(dir, file)).find((file) => existsSync(file))
  }

  /** The `<epic-page>`'s `worktree` and `repo` attributes in page `file` (`null`:  not there, or empty). */
  static attributesOf(file: string): { worktree: string | null; repo: string | null } {
    const tag = /<epic-page\b([^>]*)>/.exec(readFileSync(file, "utf8"))?.[1] ?? ""
    const attribute = (name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1]?.trim() || null
    return { worktree: attribute("worktree"), repo: attribute("repo") }
  }

  /**
   * The MAIN checkout of the repo folder `path` was in, whether or not it's still there;  `null` when it can't tell.
   * - there:  its main checkout (`EpicConfig.mainOf()`)
   * - gone:  `<main>/.claude/worktrees/<w>` -> `<main>`;  `<main>.worktrees/<w>` -> `<main>`
   * - only a folder that IS a checkout (it has `.git`)
   */
  static mainOfPath(path: string): string | null {
    const candidates = [] as string[]
    if (existsSync(path)) candidates.push(EpicConfig.mainOf(path))
    const nested = path.indexOf(`${sep}.claude${sep}worktrees${sep}`)
    if (nested > 0) candidates.push(path.slice(0, nested))
    const parent = dirname(path)
    if (parent.endsWith(".worktrees")) candidates.push(parent.slice(0, -".worktrees".length))
    return candidates.find((main) => existsSync(join(main, ".git"))) ?? null
  }

  /** Checkout `dir`'s `origin` URL;  `null` for none. */
  static originOf(dir: string): string | null {
    const run = spawnSync("git", ["remote", "get-url", "origin"], { cwd: dir, encoding: "utf8", timeout: 5_000 })
    return run.status === 0 ? run.stdout.trim() || null : null
  }

  /**
   * Whether repo URLs `a` and `b` are one repo:  `git@github.com:o/r.git`, `https://github.com/o/r` and
   * `https://github.com/o/r/` all are;  never when either is missing.
   */
  static sameUrl(a: string | null, b: string | null): boolean {
    return Boolean(a && b && normalUrl(a) === normalUrl(b))
  }

  /** The main checkout beside `here` (a sibling folder) whose `origin` is `url`;  `null` when none is. */
  static checkoutByUrl(url: string | null, here: string): string | null {
    if (!url) return null
    const parent = dirname(here)
    const named = join(parent, basename(normalUrl(url)))
    let siblings: string[] = []
    try {
      siblings = readdirSync(parent).map((entry) => join(parent, entry))
    } catch {
      // an unreadable folder:  only the named one
    }
    const found = [named, ...siblings.filter((dir) => dir !== named)].find(
      (dir) => existsSync(join(dir, ".git")) && EpicRepo.sameUrl(EpicRepo.originOf(dir), url)
    )
    return found ?? null
  }
}

/**
 * Where an epic is worked in, `EpicRepo.of()`'s answer.
 * - `here`:  the main checkout it was asked from;  `own`:  the epic is that repo's
 * - `checkout`:  the epic's repo's main checkout;  `null` when it's another repo that isn't on this machine
 * - `worktree`:  worktree `<name>`'s folder in THAT repo (where it is, or would go);  `made`:  it's there
 * - `url`:  the page's `repo`, if any;  `page`:  the epic page's file
 */
export type EpicHome = {
  name: string
  page: string
  here: string
  own: boolean
  checkout: string | null
  url: string | null
  worktree: string | null
  made: boolean
}

/** `url` with its scheme, user, `.git` and trailing `/` dropped, lower-cased:  `github.com/o/r`. */
function normalUrl(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^[a-z+]+:\/\//, "")
    .replace(/^[^@/]+@/, "")
    .replace(/^([^/:]+):(?!\d)/, "$1/")
    .replace(/\/+$/, "")
    .replace(/\.git$/, "")
}

/** `path` with links resolved;  as is when missing. */
function real(path: string): string {
  try {
    return realpathSync(path)
  } catch {
    return path
  }
}
