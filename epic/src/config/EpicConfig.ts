import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { basename, dirname, isAbsolute, join, resolve, sep } from "node:path"

import JSON5 from "json5"

// The server's checkout finder:  the main checkout from any worktree, with no `git` run.
// - By the server's package entry (its `exports`, epic `repo-split` P6):
//   plain `node` loads this file (the hooks, the window script), and finds the server package in `node_modules`
//   (the kit's install)
import { checkoutOf } from "spell/server/checkout"
import { Git } from "spell/server/Git"
import { RealPath } from "spell/server/RealPath"

/****************
 * ### `EpicConfig`
 * Where a repo keeps its epic things, read from ONE file in it:  `.epic/config.json5` (epic `epic-eject` P4).
 *
 * ```ts
 * const config = EpicConfig.of(process.cwd())   // the main checkout's file, from any worktree
 * config.contentFolder                           // => "/Users/ana/www/my-app.epics"
 * config.worktreeFolder("seo")                   // => "/Users/ana/www/my-app.worktrees/seo":  where it is, or would go
 * config.baseBranch                              // => "main"
 * EpicConfig.ofSetUp(process.cwd())              // => the same, or `undefined` in a repo `epic init` never set up
 * ```
 *
 * - The keys, their defaults and what reads each:  `EpicSettings`.
 *   - A key left out reads as `epic init` would write it for THIS repo (`defaultsFor()`, epic `epic-friend` P6):
 *     `../<repo>.epics`, its own base branch from git, the install its lock file names ...
 *     - never another repo's values:  until P6 they were an older Spell checkout's (`../spell-app-dev` ...)
 *     - the keys with no per-repo value take `DEFAULTS`
 *   - A repo with no file at all reads the same way;  but it isn't SET UP (`isSetUp`, `ofSetUp()`):
 *     the plugin's hooks, which run in every repo, leave it alone.
 *   - A key it doesn't know is skipped, so an older checkout reads a newer file.
 * - ONE file per repo:  the MAIN checkout's (`SRV.checkoutOf()`), so every worktree reads the same values.
 *   A branch's change to it counts once it's merged and the main checkout has it.
 * - Read fresh by `new EpicConfig()`:  nothing is cached, so a long-running page server picks up an edit at its next
 *   use of a new instance.
 * - The file is JSON5, read by `parse()` with the `json5` package, as the page server reads the same file
 *   (`SRV.contentFolderOf()`):  anything valid there is valid here, unquoted keys and single quotes too.
 *   - Written as JSON5's JSON-compatible part, as every tooling data file is (`DataFile`):
 *     keys and text in double quotes, `//` and `/* *\/` comments, trailing commas.
 *   - So `DataFile.write()` can write it later (`epic init`, epic `epic-eject` P9), keeping Owen's comments.
 *   - Plain `node` loads this file (the hooks, the window script):  `json5` comes from the same install as the kit's
 *     `spell/server/checkout` below.
 * - Who reads it:  the CLI (`epic shared`, `status`, `worktree` ...), the epic tool and the epics list,
 *   the hooks (`.claude/hooks/`), the window script (`src/window.mjs`), the running epics' route module.
 *   `epic config [key]` prints a value, for the skills.
 *   - Packages below epics never read it (the server, spaces):  they find the main checkout through git
 *     (`SRV.checkoutOf()`), or are told by epics' route module (`PageServer.serveWorktrees()`).
 * - Node only (`node:fs`):  NOT in the `spell-epic` barrel, imported by path (`spell/epic/config/EpicConfig`).
 * - Its position:  imports only node's own modules, the server's `checkout.ts` by its entry and `RealPath` beside it,
 *   so plain `node` loads it (types stripped);  NEVER an alias, an `enum` or a parameter property.
 * - A MULTI-REPO top (epic `epic-engine` P10, repo-split's Q9 A):  one repo holding others, its child repos.
 *   - The top repo's file names them (`"repos": "repos.json5"`).
 *   - Each child finds its top as the folder above its main checkout (`top`).
 *   - An epic's worktree is then the TOP's, `<worktreesFolder>/<epic>/`, with each child's inside it
 *     (`repoCheckouts()`).
 *   - A child's `worktreesFolder` is the top's, and its own worktree of an epic is `<epic>/<repo>` in it.
 *   - No `repos`:  a single repo, as before.
 * - A repo moved behind a compat link (repo-split's move to `~/www/spell/`;  epic `epic-engine` I59):
 *   - `main` is the REAL path, and every path compare is real on both sides (`RealPath`), so an old spelling (a
 *     worktree's `.git` file, a session's `cwd`) still matches
 *   - a configured folder missing beside the real `main`, but there beside its OLD spelling (`../spell-app.epics`
 *     moved too), is found there, with a warning on stderr to update the file (`folderFor()`)
 ****************/
export class EpicConfig {
  /** where a repo's config is, from its main checkout */
  static readonly FILE = ".epic/config.json5"

  /**
   * the value of each key with nothing to do with WHICH repo it is, for a file that leaves it out
   * - the per-repo keys (`contentFolder`, `baseBranch`, the window names ...) come from the repo itself:
   *   `defaultsFor()`
   */
  static readonly DEFAULTS: EpicDefaults = {
    contentRemote: "",
    installTimeout: 600,
    extraInstalls: [],
    windows: { worktreeOnly: true, settings: {} },
    linkSessionFolders: true,
    // what the epic tooling reads and writes:  epic pages (their parts, inboxes, `home.json5`), the sagas, the guides
    // epics write, the docs home and the scratch details pages;  not `templates`, which are spell-epic's
    sharedFolders: ["epics", "sagas", "guides", "pages"],
    engineFolder: "",
    repoTemplates: "",
    app: { path: "/editor/", url: "", urlFile: "", start: "" },
    repos: "",
    voices: {},
    pageVoices: { readme: "readme", guide: "readme", code: "code", "epic-page": "code" },
    checkoutPatches: [],
    promptAck: true,
    renamedRepos: {},
    colors: { people: {}, agents: {} },
    top: "",
    oldLayout: { carryOn: "", commitMaps: "", oldClones: "" }
  }

  /**
   * the voices spell-epic ships, one `<name>.md` each:  its `voices/` folder (epic `readme` P12)
   * - worked out when read:  the VS Code extension's bundle has no `import.meta.dirname`, and a constant
   *   computed as the class loads stopped it starting (epic `epic-engine` I76)
   */
  static get ENGINE_VOICES(): string {
    return resolve(import.meta.dirname ?? ".", "../../voices")
  }

  /**
   * where the window files were before epic `epic-eject` P13, from the main checkout:
   * `epic window move` carries them from here to `windowsFolder`
   */
  static readonly OLD_WINDOWS_FOLDER = "workspaces"

  /** the worktrees' window files' folder, in the windows folder:  `<windowsFolder>/ongoing/<name>.code-workspace` */
  static readonly WORKTREE_WINDOWS = "ongoing"

  /**
   * where Claude Code puts its OWN worktrees, from the main checkout:  `.claude/worktrees/<name>`
   * - the worktree hook's place in a repo `epic init` never set up, as Claude Code's would be
   * - and every repo's old place, before `worktreesFolder` moved them beside it (`worktreesFolders`)
   */
  static readonly CLAUDE_WORKTREES = ".claude/worktrees"

  /** the main checkout, its REAL path (links followed):  what the folders are relative to */
  readonly main: string

  /** the config file, `<main>/.epic/config.json5`, there or not */
  readonly file: string

  /** the values as written (folders relative to `main`), the defaults filling in what the file leaves out */
  readonly settings: EpicSettings

  /** the top-level keys the file itself names (`contentFolder` ...):  none with no file */
  readonly named: ReadonlySet<string>

  /** `main` as given, when it's another spelling of the real one (an old path, through a compat link) */
  private readonly givenMain: string

  /** `oldMains`' answer, once asked */
  private oldMainsFound: string[] | undefined

  /** `repos`' answer, once asked */
  private reposFound: string[] | undefined

  /** `top`'s answer, once asked:  `null` for none */
  private topFound: EpicConfig | null | undefined

  /** `peers`' answer, once asked */
  private peersFound: EpicPeer[] | undefined

  /** `kit`'s answer, once asked:  `null` for none */
  private kitFound: EpicConfig | null | undefined

  /**
   * The config of the repo whose MAIN checkout is `main`.
   * - `main`:  any spelling of it;  kept REAL (`RealPath.of()`), the one given remembered for `folderFor()`
   * - throws `SyntaxError` on a file that won't read, `TypeError` on a value of the wrong kind:  each names the file
   */
  constructor(main: string) {
    this.givenMain = resolve(main)
    this.main = RealPath.of(main)
    this.file = join(this.main, EpicConfig.FILE)
    const text = readOrEmpty(this.file)
    this.settings = EpicConfig.settingsFrom(text, this.file, this.main)
    this.named = new Set(text.trim() ? Object.keys(EpicConfig.parse(text, this.file) as object) : [])
  }

  /**
   * The config of the repo `path` is in:  its MAIN checkout's file, from the main checkout or any worktree.
   * - outside git:  `path` counts as the main checkout
   * - the main checkout as the worktree's `.git` file names it:  an old spelling too, for `folderFor()`
   */
  static of(path = process.cwd()): EpicConfig {
    return new EpicConfig(checkoutOf(path)?.main ?? resolve(path))
  }

  /**
   * The config of the repo `path` is in (`of()`), when that repo is SET UP for epics (`isSetUp`);  else `undefined`.
   * - the ONE "does this repo use epics?" check:  the plugin's hooks run in EVERY repo, and do nothing in one that
   *   doesn't (epic `epic-friend` P6)
   * - throws as `of()` does, on a file that won't read:  a hook catches it
   */
  static ofSetUp(path = process.cwd()): EpicConfig | undefined {
    const config = EpicConfig.of(path)
    return config.isSetUp ? config : undefined
  }

  /**
   * Whether the repo is set up for epics:
   * - its main checkout has `.epic/config.json5` (`epic init` writes it)
   * - or it's a child repo of a multi-repo top (`top`), whose file names it
   */
  get isSetUp(): boolean {
    return existsSync(this.file) || this.top !== undefined
  }

  /**
   * The MAIN checkout of the repo `path` is in (`SRV.checkoutOf()`), its REAL path;  `path` itself outside git.
   * - real:  a worktree's `.git` file may name an old spelling of it, through a compat link (epic `epic-engine` I59)
   */
  static mainOf(path = process.cwd()): string {
    return RealPath.of(checkoutOf(path)?.main ?? path)
  }

  /**
   * Where checkout `root`'s pages are:  its repo's content folder (`contentFolder`), the ONE place the tools read and
   * write epics, guides, pages, sagas, brand and goals (epic `epic-eject` P12), never a link at the checkout's root.
   * - `root` itself, a checkout that holds its own pages, when
   *   - its repo has no config file (a test's made-up checkout;  the content folder itself, so `contentOf()` of a
   *     content folder is that folder)
   *   - the folder it names isn't there (a repo with no content repo yet), or the file won't read
   * - the folders inside it, and the page paths from it (`epics/seo/seo.plan.html`), are as they were from the root:
   *   the page servers serve it at `/`
   */
  static contentOf(root: string): string {
    try {
      const config = EpicConfig.of(root)
      if (config.isSetUp) {
        const content = config.contentFolder
        if (existsSync(content)) return content
        // named, but not there:  said, never silent (epic `epic-engine` I59);  a repo with no content repo yet names none
        if (config.named.has("contentFolder"))
          warnOnce(
            `contentFolder ${config.settings.contentFolder} is missing:  ${content};  using the checkout itself,` +
              ` ${resolve(root)} -- update ${config.file}`
          )
      }
    } catch {
      // a config that won't read:  the checkout's own
    }
    return resolve(root)
  }

  ////////////////
  // ## The values
  ////////////////

  /**
   * the shared content repo's address (`contentRemote`, epic `epic-friend` P4):  where everyone pulls the plans from
   * and pushes them to, as git takes it (`git@github.com:o/x-epics.git`);  `""` when it has none
   * - `epic init` writes it as it makes the shared repo, and clones it where the content folder is missing
   */
  get contentRemote(): string {
    return this.settings.contentRemote
  }

  /** the shared content repo (epics, guides, sagas ...):  `contentFolder`, from the main checkout */
  get contentFolder(): string {
    const kit = this.kitFor("contentFolder")
    return kit ? kit.contentFolder : this.folderFor("contentFolder", this.settings.contentFolder)
  }

  /** the branch worktrees start from and merge into */
  get baseBranch(): string {
    return this.settings.baseBranch
  }

  /**
   * the folder NEW worktrees go in, `<worktreesFolder>/<name>`:  `worktreesFolder`, from the main checkout
   * - existing ones may still be in the old place:  `worktreesFolders`
   * - a CHILD repo of a multi-repo top (`top`):  the TOP's, where each epic's worktree is (`~/www/spell.worktrees`);
   *   its own worktree of epic `<name>` is `<name>/<repo>` in it (`newWorktreeFolder()`)
   */
  get worktreesFolder(): string {
    const top = this.top
    return top && top !== this ? top.worktreesFolder : this.ownWorktreesFolder
  }

  /** `worktreesFolder` as this repo's own file has it, from its main checkout:  a child repo's place before its top's */
  private get ownWorktreesFolder(): string {
    // a PEER of a kit (`kit`):  its own, beside it, `../<repo>.worktrees` (repo-split's P20 arrangement, Q51 A)
    const written =
      this.kit && !this.named.has("worktreesFolder") ? `../${this.repoName}.worktrees` : this.settings.worktreesFolder
    return this.folderFor("worktreesFolder", written)
  }

  /**
   * every folder worktrees may be in, the new place first:
   * - `worktreesFolder`
   * - then the OLD places:
   *   - a child repo's own `worktreesFolder` (its worktrees from before its top's)
   *   - Claude Code's own place, `.claude/worktrees` (`CLAUDE_WORKTREES`), where every repo's went before the file
   *     moved them (epic `epic-eject` P8:  `../spell-app.worktrees`), and where they go in a repo not set up
   * - the old places stay on the list for good:
   *   harmless once empty, and a worktree there keeps working until its `/isolate done`
   */
  get worktreesFolders(): string[] {
    const old = resolve(this.main, EpicConfig.CLAUDE_WORKTREES)
    return [...new Set([this.worktreesFolder, this.ownWorktreesFolder, old])]
  }

  /**
   * The child repos this repo holds, lowest first, when it's a MULTI-REPO TOP (epic `epic-engine` P10, repo-split's
   * Q9 A):  `repos` in its config;  `[]` for any other repo (a single repo, or a child).
   * - `repos`:  a list of names (`["spell-parser", ...]`), or a file from the main checkout listing them
   *   (`"repos.json5"`:  `{ "repos": [{ "name": "spell-parser", ... }, ...] }`, the top repo `spell`'s own list)
   * - a file that won't read:  `[]`, said on stderr
   */
  get repos(): string[] {
    if (this.reposFound) return this.reposFound
    const written = this.settings.repos
    let names: string[] = []
    if (Array.isArray(written)) names = written
    else if (written) {
      const file = resolve(this.main, written)
      try {
        const data = EpicConfig.parse(readFileSync(file, "utf8"), file) as { repos?: unknown } | unknown[]
        const list = Array.isArray(data) ? data : (data as { repos?: unknown }).repos
        names = (Array.isArray(list) ? list : [])
          // a PEER (`"peer": true`) is a repo BESIDE the kit, never inside its worktree (`peers`, Q48 A)
          .filter((each) => (each as { peer?: unknown })?.peer !== true)
          .map((each) => (typeof each === "string" ? each : (each as { name?: unknown })?.name))
          .filter((name): name is string => typeof name === "string" && /^[\w.-]+$/.test(name))
      } catch (error) {
        warnOnce(`repos ${written} won't read (${(error as Error).message}):  a single repo`)
      }
    }
    this.reposFound = names
    return names
  }

  /**
   * The MULTI-REPO TOP this repo belongs to (epic `epic-engine` P10):  its config.
   * - this config itself, when it lists child repos (`repos`)
   * - the folder ABOVE its main checkout's, when that is a top whose `repos` names this repo (`~/www/spell` for
   *   `~/www/spell/spell-epic`)
   * - `undefined`:  a single repo, as every repo was before:  its worktrees, merges and windows are its own
   * - What it changes:  an epic's worktree is the top's, `<top's worktreesFolder>/<epic>/`, holding a worktree of
   *   every child repo at the same folder names, all on branch `<epic>` (`repoCheckouts()`)
   */
  get top(): EpicConfig | undefined {
    if (this.topFound !== undefined) return this.topFound ?? undefined
    if (this.repos.length) {
      this.topFound = this
      return this
    }
    let found: EpicConfig | undefined
    const parent = dirname(this.main)
    try {
      if (parent !== this.main && existsSync(join(parent, EpicConfig.FILE))) {
        const up = new EpicConfig(parent)
        if (up.repos.includes(this.repoName)) found = up
      }
    } catch {
      // a top whose config won't read:  a single repo
    }
    this.topFound = found ?? null
    return found
  }

  /**
   * The repos BESIDE this one that its repos file lists as PEERS (epic-engine's P49, Q48 A):
   * `{ "name": "spell-brand", "path": "../spell-brand", "peer": true }` in the kit's `repos.json5`.
   * - each one's MAIN checkout:  `path` (else `../<name>`), from this repo's main checkout
   * - a project of its own, with its own install and its own worktrees (`<name>.worktrees/` beside it, Q50 D):
   *   never part of an epic's worktree of this repo (`repos` and `repoCheckouts()` leave it out)
   * - `[]` with no repos file, or one that won't read
   */
  get peers(): EpicPeer[] {
    if (this.peersFound) return this.peersFound
    const written = this.settings.repos
    let peers: EpicPeer[] = []
    if (typeof written === "string" && written) {
      try {
        const file = resolve(this.main, written)
        const data = EpicConfig.parse(readFileSync(file, "utf8"), file) as { repos?: unknown } | unknown[]
        const list = Array.isArray(data) ? data : (data as { repos?: unknown }).repos
        peers = (Array.isArray(list) ? list : []).flatMap((each) => {
          const entry = (each ?? {}) as { name?: unknown; path?: unknown; peer?: unknown }
          if (entry.peer !== true || typeof entry.name !== "string" || !/^[\w.-]+$/.test(entry.name)) return []
          const path = typeof entry.path === "string" && entry.path ? entry.path : `../${entry.name}`
          return [{ name: entry.name, main: resolve(this.main, path) }]
        })
      } catch {
        // `repos` says it already
      }
    }
    this.peersFound = peers
    return peers
  }

  /**
   * The KIT this repo is a peer of (epic-engine's P49, Q51 A):  the config of the folder its own file names as
   * `"top"` (`{ "top": "../spell" }`, spell-brand's), from its main checkout;  `undefined` without one.
   * - a peer takes its kit's content folder, windows, window names, shared folders, session-folder links, engine and
   *   voices, for each key its own file leaves out (`kitFor()`);  its worktrees stay its OWN, `../<repo>.worktrees`
   *   beside it, and so do its install, base branch and app
   * - when the kit's repos file doesn't list this repo as a peer:  said once on stderr, and still used
   * - NOT a multi-repo `top`:  a peer's epic worktree is its own alone (Q50 D)
   */
  get kit(): EpicConfig | undefined {
    if (this.kitFound !== undefined) return this.kitFound ?? undefined
    let found: EpicConfig | undefined
    const written = this.settings.top
    if (written) {
      const folder = resolve(this.main, written)
      try {
        if (!existsSync(join(folder, EpicConfig.FILE)))
          warnOnce(`top ${written} has no ${EpicConfig.FILE} (${folder}):  ${this.file} is read alone`)
        else {
          found = new EpicConfig(folder)
          if (!found.peers.some((peer) => RealPath.same(peer.main, this.main)))
            warnOnce(
              `${this.repoName} names ${found.main} as its top, but that repo's list doesn't name it a peer ` +
                `("peer": true in its ${found.settings.repos || "repos file"})`
            )
        }
      } catch (error) {
        warnOnce(`top ${written} won't read (${(error as Error).message}):  ${this.file} is read alone`)
        found = undefined
      }
    }
    this.kitFound = found ?? null
    return found
  }

  /** The kit (`kit`) a key this repo's own file leaves out comes from;  `undefined`:  this repo's own value. */
  private kitFor(key: string): EpicConfig | undefined {
    return this.named.has(key) ? undefined : this.kit
  }

  /**
   * How this repo meets an epic worktree cut BEFORE it absorbed child repos (epic-engine's P49, repo-split's P20
   * · One Repo, Q40 changed):  `oldLayout` in its file.  All `""` (the default):  nothing to carry across.
   */
  get oldLayout(): EpicOldLayout {
    return this.settings.oldLayout
  }

  /** The repo's folder name:  its main checkout's (`spell-epic`) */
  get repoName(): string {
    return basename(this.main)
  }

  /**
   * Every repo's checkout in epic `name`'s worktree, the TOP first, then each child repo cloned in the top's main
   * checkout (it has `.git`), in `repos` order (lowest first):  `{ repo, main, worktree, top }`.
   * - a multi-repo top (`top`):  `<worktreesFolder>/<name>` for the top, `<worktreesFolder>/<name>/<repo>` for each
   *   child, where the worktree hook makes them (made or not)
   * - a single repo:  just its own, where it is or would go (`worktreeFolder()`)
   */
  repoCheckouts(name: string): RepoCheckout[] {
    const top = this.top
    if (!top) {
      const worktree = this.worktreeFolder(name)
      return [{ repo: this.repoName, main: this.main, worktree, top: true }, ...this.foundCheckouts(worktree, [])]
    }
    const folder = join(top.worktreesFolder, name)
    const listed: RepoCheckout[] = [
      { repo: top.repoName, main: top.main, worktree: folder, top: true },
      ...top.repos.flatMap((repo) => {
        const found = EpicConfig.childCheckout(join(top.main, repo), join(folder, repo), folder)
        return found ? [{ repo, ...found, top: false }] : []
      })
    ]
    return [...listed, ...top.foundCheckouts(folder, listed)]
  }

  /**
   * The child-repo checkouts FOUND inside epic worktree `worktree` that `listed` doesn't hold (epic-engine's P49,
   * Q40 changed):  an OLD-LAYOUT worktree's, cut before repo-split's P20 · One Repo made the child repos folders of
   * the kit, still holding a worktree of each old clone (`spell-ui/` ...).
   * - each folder right inside `worktree` whose `.git` is a FILE (a git worktree) of ANOTHER repo:  paired with that
   *   repo's main checkout by git (`checkoutOf()`, which `git worktree repair` keeps true after Q41's move to
   *   `~/www/spell.old/`);  a broken one (its git folder gone) is left out
   * - `found: true`;  `peer: true` when its main checkout is one of `peers` (spell-brand's, before it moved out)
   * - in folder-name order;  none when `worktree` isn't there
   * - why:  every walker of an epic's checkouts (merge-main, the merge, removal, status, `epic loc`, the checkout
   *   patches) then sees them with no change of its own;  each decides what an old one needs (`isCrossed()`)
   */
  foundCheckouts(worktree: string, listed: RepoCheckout[]): RepoCheckout[] {
    let names: string[]
    try {
      names = readdirSync(worktree, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
    } catch {
      return []
    }
    const own = RealPath.of(this.main)
    return names.flatMap((name) => {
      const path = join(worktree, name)
      if (listed.some((each) => RealPath.same(each.worktree, path))) return []
      try {
        if (!statSync(join(path, ".git")).isFile()) return []
      } catch {
        return []
      }
      const found = checkoutOf(path)
      if (!found || found.missingGitDir || RealPath.same(found.main, own)) return []
      const peer = this.peers.some((each) => RealPath.same(each.main, found.main))
      return [{ repo: name, main: found.main, worktree: path, top: false, found: true, ...(peer ? { peer } : {}) }]
    })
  }

  /**
   * Whether found checkout `checkout` (`foundCheckouts()`) has CROSSED into this repo already:  its branch's tip is
   * an old id in one of the commit maps (`oldLayout.commitMaps`) of epic worktree `worktree`, or of the main checkout
   * - a map lists every commit repo-split's P20 · One Repo rewrote:  `main`'s (`commit-map-ui.txt`), and each
   *   branch its carry-on command crossed (`commit-map-ui-<branch>.txt`), so a tip there is in this repo's history
   * - a branch with no commits of its own has crossed with `main`'s map alone
   * - a peer's (`peer`), or a repo with no `commitMaps`:  never;  its work is only in its own repo
   */
  isCrossed(checkout: RepoCheckout, worktree: string): boolean {
    const folder = this.oldLayout.commitMaps
    if (!folder || checkout.peer) return false
    const tip = Git.out(["rev-parse", "HEAD"], checkout.worktree)
    if (!tip) return false
    return [worktree, this.main].some((root) => {
      const maps = join(root, folder)
      try {
        return readdirSync(maps)
          .filter((file) => /^commit-map-.*\.txt$/.test(file))
          .some((file) => readFileSync(join(maps, file), "utf8").includes(`${tip} `))
      } catch {
        return false
      }
    })
  }

  /**
   * The OLD-LAYOUT child checkouts inside epic worktree `worktree`:  `foundCheckouts()`, less the child repos a
   * multi-repo top lists (`repos`);  `[]` for a repo with no `oldLayout` (one that never absorbed child repos)
   */
  oldCheckouts(worktree: string): RepoCheckout[] {
    const { carryOn, commitMaps, oldClones } = this.oldLayout
    if (!carryOn && !commitMaps && !oldClones) return []
    const listed = (this.top ?? this).repos
    return this.foundCheckouts(worktree, []).filter(({ repo }) => !listed.includes(repo))
  }

  /**
   * The found checkouts (`foundCheckouts()`) inside epic worktree `worktree` that still hold work of their own
   * (epic-engine's P49, Q40 changed):  not crossed (`isCrossed()`), and with commits their main checkout's base
   * branch lacks.
   * - what removing the worktree refuses for, even forced, and what `epic merge` refuses for:  that work is in the old
   *   clone's branch alone until the carry-on command (`oldLayout.carryOn`) crosses it, or its own repo merges it
   *   (a peer's)
   * - NEVER throws:  a checkout git can't read counts as holding work
   */
  leftBehind(worktree: string): RepoCheckout[] {
    return this.oldCheckouts(worktree).filter((checkout) => {
      if (this.isCrossed(checkout, worktree)) return false
      let base = "main"
      try {
        base = new EpicConfig(checkout.main).baseBranch
      } catch {
        // an old clone whose settings won't read:  its `main`
      }
      const ahead = Git.out(["rev-list", "--count", `${base}..HEAD`], checkout.worktree)
      return ahead === undefined || Number(ahead) > 0
    })
  }

  /**
   * What to say of `leftBehind()`'s `checkouts`, in worktree `worktree`:  one line, naming each and what crosses it.
   * - `""` for none
   */
  leftBehindSaid(worktree: string, checkouts: RepoCheckout[]): string {
    if (!checkouts.length) return ""
    const names = checkouts.map(({ repo }) => repo).join(", ")
    const old = checkouts.filter((each) => !each.peer)
    const peers = checkouts.filter((each) => each.peer)
    const fixes = [
      ...(old.length
        ? [
            `cross ${old.map(({ repo }) => repo).join(", ")} over:  \`epic worktree merge-main\` in ${worktree} (it runs \`${this.oldLayout.carryOn || "the carry-on command"}\`)`
          ]
        : []),
      ...(peers.length ? [`merge ${peers.map(({ repo }) => repo).join(", ")} in its own repo`] : [])
    ]
    return `${names} inside ${worktree} still ${checkouts.length > 1 ? "hold" : "holds"} commits of ${checkouts.length > 1 ? "their" : "its"} own:  ${fixes.join(";  ")}`
  }

  /**
   * A child repo's main checkout and its checkout in an epic's worktree `folder`, paired by GIT, not only by name
   * (epic `epic-engine` I81):  a repo renamed (`spell-lang` => `spell-parser`, epic `repo-split` P17) is in one
   * place under its old name while the other has its new one.
   * - both under the expected names (`main`, `worktree`):  as they are
   * - only the worktree's:  its main checkout is the one its git folder belongs to (`checkoutOf()`'s `main`)
   * - only the main checkout's:  its worktree is whichever of its git worktrees is inside `folder` (else `worktree`,
   *   where a new one goes)
   * - neither:  `undefined`, a child repo this machine doesn't have
   * - STATIC:  git and the disk only
   */
  static childCheckout(main: string, worktree: string, folder: string): { main: string; worktree: string } | undefined {
    const hasGit = (path: string) => existsSync(join(path, ".git"))
    if (hasGit(main)) {
      if (hasGit(worktree)) return { main, worktree }
      const listed = Git.lines(["worktree", "list", "--porcelain"], main)
        .filter((line) => line.startsWith("worktree "))
        .map((line) => line.slice("worktree ".length))
      return { main, worktree: listed.find((path) => RealPath.isIn(path, folder)) ?? worktree }
    }
    if (!hasGit(worktree)) return undefined
    // a broken worktree (its git folder gone) git doesn't know:  no pair, as when this asked git
    const found = checkoutOf(worktree)
    return found && !found.missingGitDir ? { main: found.main, worktree } : undefined
  }

  /** what makes a new worktree ready to run, from its root;  `""`:  nothing to run (a repo with no packages) */
  get installCommand(): string {
    return this.settings.installCommand
  }

  /** whether the worktree hook runs `installCommand` in a NEW worktree before handing it over (epic `epic-eject` I2) */
  get installOnCreate(): boolean {
    return this.settings.installOnCreate
  }

  /** how long the worktree hook's install may take, in seconds, before it's stopped and the hook fails */
  get installTimeout(): number {
    return this.settings.installTimeout
  }

  /**
   * the folders in a new worktree that are yarn projects of their OWN, outside the one install (`vscode/`, epic
   * `epic-engine` I65):  `extraInstalls`, as written, each from the worktree's root (the top's, in a multi-repo top)
   * - the worktree hook runs `installCommand` in each, after the one at the root, when `installOnCreate` is on
   */
  get extraInstalls(): string[] {
    return this.settings.extraInstalls
  }

  /**
   * the fixes every checkout gets, on `main` and in every worktree however far behind its branch is
   * (`CheckoutPatches`, epic `epic-engine` P17):  `checkoutPatches`, from the MAIN checkout's file
   */
  get checkoutPatches(): CheckoutPatch[] {
    return this.settings.checkoutPatches
  }

  /**
   * whether the prompt hook shows an "On it:  ..." line for a message sent while the session is busy
   * (`PromptAck`, epic `epic-engine` P18):  `promptAck`
   */
  get promptAck(): boolean {
    return this.settings.promptAck
  }

  /**
   * the repo's OLD GitHub addresses, each to the one it was renamed to (`renamedRepos`, epic `epic-engine` I150):
   * what `EpicRepo` reads so an epic page recording the old name is still this repo's
   */
  get renamedRepos(): Record<string, string> {
    return this.settings.renamedRepos
  }

  /**
   * a colour for each person and each agent on the epic pages (`colors`, epic `epic-friend` P10, Q16):
   * `{ people: { ana: "#2f9e6e" }, agents: { codex: "#0f8b8d" } }`;  anyone left out keeps the shared voice
   * - the page server tells every page (`SPELL_SERVER.colors`, `personRoutes`), which draws a reply, a thread message
   *   in it (`ThreadFacts.voiceOf()`)
   */
  get colors(): EpicColors {
    return this.settings.colors
  }

  /** the window names:  the default window, and the folder names a window shows */
  get windows(): EpicWindows {
    return this.kitFor("windows")?.windows ?? this.settings.windows
  }

  /** whether each worktree's saved-session folder is linked to the main checkout's */
  get linkSessionFolders(): boolean {
    return this.kitFor("linkSessionFolders")?.linkSessionFolders ?? this.settings.linkSessionFolders
  }

  /**
   * the content folder's folders every checkout links in at its root (`epics`, `sagas` ...):  `epic shared link`
   * - a checkout's `package.json` `"shared": { "links" }` still wins, for a branch of spell-app cut before the file
   *   existed (`Shared.configOf()`)
   */
  get sharedFolders(): string[] {
    return this.kitFor("sharedFolders")?.sharedFolders ?? this.settings.sharedFolders
  }

  /**
   * the spell-epic checkout this repo's checkouts link in at their root as `spell-epic` (`engineFolder`, from the
   * main checkout);  `undefined` when the key is `""`:  no link
   * - `epic shared link` makes the link, only in a checkout whose `.gitignore` ignores it (`Shared.linkEngine()`)
   */
  get engineFolder(): string | undefined {
    const kit = this.kitFor("engineFolder")
    if (kit) return kit.engineFolder
    return this.settings.engineFolder ? this.folderFor("engineFolder", this.settings.engineFolder) : undefined
  }

  /**
   * the repo's OWN templates folder, as written:  a path from each checkout's root (a worktree's are its branch's);
   * `""` (the default):  none, the engine's templates are all there are
   * (spell-epic's `templates/`, epic `epic-eject` T11)
   * - the docs tools list it beside the engine's on the Templates page, and look a template up there first
   *   (`pages.js` `REPO_TEMPLATES`, `templateFile()`)
   */
  get repoTemplates(): string {
    return this.settings.repoTemplates
  }

  /**
   * the folder the VS Code window files are in (`epic window`;  epic `epic-eject` P13):
   * each machine's own, never tracked
   * - package windows and the whole repo's (`windowFile()`), and the worktrees' in its `ongoing/`
   *   (`worktreeWindowFile()`)
   * - where they go:  `newWindowsFolder`
   * - EXCEPT while the old folder, `workspaces/` in the main checkout, is there and the new one isn't:
   *   the old one, so the windows keep working until `epic window move` carries the files over
   */
  get windowsFolder(): string {
    const old = this.oldWindowsFolder
    return existsSync(old) && !existsSync(this.newWindowsFolder) ? old : this.newWindowsFolder
  }

  /**
   * where the window files go:  `windowsFolder` as written, from the main checkout;
   * left out (`""`), the content folder's `windows/` (`<contentFolder>/windows`, git-ignored there)
   * - repos sharing a content folder each need their own:  spell-epic's config keeps its `workspaces/`
   */
  get newWindowsFolder(): string {
    const kit = this.kitFor("windowsFolder")
    if (kit) return kit.newWindowsFolder
    const written = this.settings.windowsFolder
    return written ? this.folderFor("windowsFolder", written) : join(this.contentFolder, "windows")
  }

  /** where the window files were before epic `epic-eject` P13:  `workspaces/` in the main checkout */
  get oldWindowsFolder(): string {
    return join(this.main, EpicConfig.OLD_WINDOWS_FOLDER)
  }

  /**
   * the repo's APP, as the top bar's App tab opens it (epic `epic-engine` I49):  where the epic server answers for it
   * (`path`), where it answers (`url`, or the record `urlFile` its server writes) and what starts it (`start`)
   * - `undefined`:  none declared (neither `url` nor `urlFile`):  the tab shows a page saying so
   * - `urlFile`:  absolute, from the main checkout
   * - the epic server's `RepoApp` reads it, at each click
   */
  get app(): EpicApp | undefined {
    const app = this.settings.app
    if (!app.url && !app.urlFile) return undefined
    return { ...app, urlFile: app.urlFile && resolve(this.main, app.urlFile) }
  }

  /** the worktrees' window files' folder:  `<windowsFolder>/ongoing` */
  get worktreeWindowsFolder(): string {
    return join(this.windowsFolder, EpicConfig.WORKTREE_WINDOWS)
  }

  /**
   * the window file of package `pkg`, or of the whole repo (`windows.default`):
   * `<windowsFolder>/<pkg>.code-workspace`
   */
  windowFile(pkg: string): string {
    return join(this.windowsFolder, `${pkg}.code-workspace`)
  }

  /** worktree `name`'s window file:  `<windowsFolder>/ongoing/<name>.code-workspace` */
  worktreeWindowFile(name: string): string {
    return join(this.worktreeWindowsFolder, `${name}.code-workspace`)
  }

  /**
   * Worktree `name`'s folder:  where it IS, in any of `worktreesFolders`;
   * else where a new one goes, `<worktreesFolder>/<name>` (`newWorktreeFolder()`).
   * - so an old worktree (`.claude/worktrees/seo`) is still found after the file moved new ones beside the repo
   * - a child repo of a multi-repo top (`top`):  ITS worktree, `<top's worktreesFolder>/<name>/<repo>`, else one in
   *   its own old places
   */
  worktreeFolder(name: string): string {
    const olds = this.worktreesFolders.slice(1).map((folder) => join(folder, name))
    return [this.newWorktreeFolder(name), ...olds].find((folder) => existsSync(folder)) ?? this.newWorktreeFolder(name)
  }

  /**
   * Where a NEW worktree `name` goes:  `<worktreesFolder>/<name>`, whatever is in the old place.
   * - a child repo of a multi-repo top:  `<worktreesFolder>/<name>/<repo>`, inside the epic's worktree of the top
   */
  newWorktreeFolder(name: string): string {
    const top = this.top
    const own = top && top !== this ? [this.repoName] : []
    return join(this.worktreesFolder, name, ...own)
  }

  /**
   * The name of the worktree `path` is in (`<worktreesFolder>/<name>/...`);  `undefined` outside one.
   * - `path` under any of this repo's worktrees folders (`worktreesFolders`:  the new place and the old)
   * - or under a worktrees folder inside the checkout (`.claude/worktrees`) of ANY checkout:
   *   a session's `cwd`, a path `lsof` printed, a test's made-up `/repo/.claude/worktrees/seo`
   */
  worktreeNameOf(path: string | null | undefined): string | undefined {
    if (!path) return undefined
    for (const folder of this.worktreesFolders) {
      const inside = insideOf(folder, path)
      if (inside) return inside.split("/")[0] || undefined
    }
    for (const pattern of this.worktreesPatterns) {
      const marker = `${sep}${pattern.split("/").join(sep)}${sep}`
      for (const each of new Set([path, RealPath.of(path)])) {
        const at = each.indexOf(marker)
        if (at >= 0) return each.slice(at + marker.length).split(sep)[0] || undefined
      }
    }
    return undefined
  }

  /**
   * The NEW worktrees folder as a path inside the checkout (`.claude/worktrees`);
   * `undefined` when it's outside the checkout (`../spell-app.worktrees`).
   */
  get worktreesPattern(): string | undefined {
    return insideOf(this.main, this.worktreesFolder)
  }

  /**
   * Every worktrees folder inside the checkout, as a path from its root (`.claude/worktrees`), for a pattern in each
   * checkout (a window's `files.exclude`):  the old place too, while worktrees may be left there.
   */
  get worktreesPatterns(): string[] {
    return this.worktreesFolders.flatMap((folder) => insideOf(this.main, folder) ?? [])
  }

  /** Whether `path` (a worktree's folder) is OUTSIDE the main checkout:  beside the repo, not nested in it. */
  isOutside(path: string): boolean {
    return insideOf(this.main, path) === undefined
  }

  /**
   * Whether worktree `name`'s window holds only `⎇ <name>` and the content folder, no main checkout
   * (epic `epic-eject` O3):  `windows.worktreeOnly`, or its folder is beside the repo.
   * - a worktree still nested in the checkout keeps the old layout, the main root first (`src/window.mjs`)
   * - a MULTI-REPO top's epic worktree (`top`;  epic `epic-engine` P10, repo-split's Q9 A):
   *   the top's `windows.worktreeOnly` alone, off by default
   *   - off:  the main top checkout first (`~/www/spell`, its files hidden), so its Claude panel lists every session,
   *     then the epic's worktree, then the content folder
   */
  worktreeOnlyWindow(name: string): boolean {
    const top = this.top
    if (top) return top.windows.worktreeOnly
    return this.windows.worktreeOnly || this.isOutside(this.worktreeFolder(name))
  }

  /**
   * Folder `written` (config key `key`), from the main checkout:  where it is.
   * - beside the REAL main checkout, when it's there (or `written` is absolute)
   * - else beside an OLD spelling of the main checkout (`oldMains`), when it's there:  its real path, with a warning
   *   on stderr, once per process, to update the file (epic `epic-engine` I59)
   *   - e.g. spell-epic moved to `~/www/spell/` behind a compat link, with `"contentFolder": "../spell-app.epics"`:
   *     missing beside `~/www/spell/spell-epic`, there beside `~/www/spell-app/spell-epic` (the old path)
   * - else beside the real main checkout, missing:  the caller says so (`contentOf()`)
   */
  private folderFor(key: string, written: string): string {
    const folder = resolve(this.main, written)
    if (existsSync(folder) || isAbsolute(written)) return folder
    for (const old of this.oldMains) {
      const found = resolve(old, written)
      if (!existsSync(found)) continue
      const real = RealPath.of(found)
      warnOnce(`${key} ${written} is missing beside ${this.main};  using ${real} -- update ${this.file}`)
      return real
    }
    return folder
  }

  /**
   * The main checkout's OTHER spellings, which link to it:  where it was before a move behind a compat link.
   * - the one this config was given, when it isn't the real one (`of()` from a worktree whose `.git` file names it)
   * - and the one each worktree's `.git` file names, until `git worktree repair` (git's own record of each worktree,
   *   `<main>/.git/worktrees/<id>/gitdir`, names that file):  so the main checkout finds it too
   * - read once, the first time a folder is missing
   * - NEVER throws:  what won't read is skipped
   */
  private get oldMains(): string[] {
    if (this.oldMainsFound) return this.oldMainsFound
    const found = new Set<string>()
    if (this.givenMain !== this.main) found.add(this.givenMain)
    const records = join(this.main, ".git", "worktrees")
    try {
      for (const id of readdirSync(records)) {
        try {
          const dotGit = readFileSync(join(records, id, "gitdir"), "utf8").trim()
          const gitdir = /^gitdir:\s*(.+)$/m.exec(readFileSync(dotGit, "utf8"))?.[1]?.trim()
          if (!gitdir) continue
          // `<main>/.git/worktrees/<id>`
          const old = dirname(dirname(dirname(resolve(dirname(dotGit), gitdir))))
          if (old !== this.main && RealPath.of(old) === this.main) found.add(old)
        } catch {
          // a worktree gone, or a record that won't read
        }
      }
    } catch {
      // no worktrees, or not a main checkout
    }
    this.oldMainsFound = [...found]
    return this.oldMainsFound
  }

  /**
   * Every value as `epic config` prints it, by dotted key:  folders absolute, the rest as written.
   * - `{ contentFolder: "/.../my-app.epics", ..., "windows.default": "my-app", ... }`
   * - `sharedFolders` as one comma-separated line, `epics,guides,...`, so a skill reads it as one value
   */
  values(): Record<string, string | boolean | number> {
    return {
      contentFolder: this.contentFolder,
      contentRemote: this.contentRemote,
      baseBranch: this.baseBranch,
      worktreesFolder: this.worktreesFolder,
      installCommand: this.installCommand,
      installOnCreate: this.installOnCreate,
      installTimeout: this.installTimeout,
      extraInstalls: this.extraInstalls.join(","),
      "windows.default": this.windows.default,
      "windows.repoName": this.windows.repoName,
      "windows.contentName": this.windows.contentName,
      "windows.worktreeOnly": this.windows.worktreeOnly,
      "windows.settings": JSON.stringify(this.windows.settings),
      linkSessionFolders: this.linkSessionFolders,
      sharedFolders: this.sharedFolders.join(","),
      engineFolder: this.engineFolder ?? "",
      repoTemplates: this.repoTemplates,
      windowsFolder: this.windowsFolder,
      "app.path": this.settings.app.path,
      "app.url": this.settings.app.url,
      "app.urlFile": this.settings.app.urlFile && resolve(this.main, this.settings.app.urlFile),
      "app.start": this.settings.app.start,
      repos: this.repos.join(","),
      top: this.top?.main ?? "",
      ...Object.fromEntries(this.voiceNames.map((name) => [`voices.${name}`, this.voiceFile(name) ?? ""])),
      ...Object.fromEntries(
        Object.entries(this.settings.pageVoices).map(([kind, voice]) => [`pageVoices.${kind}`, voice])
      ),
      checkoutPatches: this.checkoutPatches.map((patch) => patch.id).join(","),
      promptAck: this.promptAck,
      renamedRepos: JSON.stringify(this.renamedRepos),
      colors: JSON.stringify(this.colors),
      peers: this.peers.map((peer) => `${peer.name}=${peer.main}`).join(","),
      kit: this.kit?.main ?? "",
      "oldLayout.carryOn": this.oldLayout.carryOn,
      "oldLayout.commitMaps": this.oldLayout.commitMaps,
      "oldLayout.oldClones": this.oldLayout.oldClones && resolve(this.main, this.oldLayout.oldClones)
    }
  }

  ////////////////
  // ## Voices
  ////////////////

  /**
   * The file of VOICE `name` (`readme`, `code` ...):  how a kind of people-facing page is written (epic `readme` P13).
   * - the repo's own, when its file names one (`"voices": { "code": "agents/wwod/writing.md" }`):  from the main
   *   checkout, absolute
   * - else, in a child repo of a MULTI-REPO top, the top's own (Spell's child repos write in the kit's house style)
   * - else spell-epic's, `voices/<name>.md` (`ENGINE_VOICES`), when it ships one
   * - else `undefined`:  no such voice here (spell-epic ships no `code`:  it's each repo's house style)
   */
  voiceFile(name: string): string | undefined {
    const own = this.settings.voices[name]
    if (own) return resolve(this.main, own)
    const top = this.top ?? this.kit
    const topsOwn = top && top.main !== this.main ? top.settings.voices[name] : undefined
    if (topsOwn) return resolve(top!.main, topsOwn)
    const shipped = join(EpicConfig.ENGINE_VOICES, `${name}.md`)
    return existsSync(shipped) ? shipped : undefined
  }

  /**
   * The voice a KIND of page is written in (`guide` => `readme`):  the file's `pageVoices`, over the defaults;
   * a kind it doesn't name, a voice of that name
   */
  voiceFor(kind: string): string {
    return this.settings.pageVoices[kind] ?? kind
  }

  /** every voice this repo can use:  its own, its top's, then spell-epic's, by name, sorted */
  get voiceNames(): string[] {
    const shipped = existsSync(EpicConfig.ENGINE_VOICES)
      ? readdirSync(EpicConfig.ENGINE_VOICES)
          .filter((name) => name.endsWith(".md"))
          .map((name) => name.slice(0, -3))
      : []
    const above = this.top ?? this.kit
    const tops = above && above.main !== this.main ? Object.keys(above.settings.voices) : []
    return [...new Set([...Object.keys(this.settings.voices), ...tops, ...shipped])].sort()
  }

  ////////////////
  // ## Reading the file
  ////////////////

  /**
   * The settings for the repo whose main checkout is `main`, as `epic init` writes them (epic `epic-eject` P9),
   * and what each key a file leaves out reads as (epic `epic-friend` P6):
   * - `contentFolder`:  `../<repo>.epics`;  `worktreesFolder`:  `../<repo>.worktrees`, both beside the repo
   * - `baseBranch`:  the remote's default branch, else `main` or `master`, else the main checkout's (`baseBranchOf()`)
   * - `installCommand`:  what the repo's lock file names (`installCommandOf()`), `""` with none
   * - `installOnCreate`:  on when there is an install command, so a worktree's window never opens without its packages
   * - `windows`:  named for the repo (`default`, `repoName`) and its content folder (`contentName`)
   * - `windowsFolder`:  the content folder's `windows/` (epic `epic-eject` P13)
   * - every other key:  `DEFAULTS`, the same for any repo
   * - `written`:  what a file names already, so the values that follow another key follow it:
   *   `contentName` and `windowsFolder` its `contentFolder`, `installOnCreate` its `installCommand`;
   *   and `baseBranch` is worked out only when it's left out
   * - static:  needs no instance, nor a file
   */
  static defaultsFor(main: string, written: Record<string, unknown> = {}): EpicSettings {
    const repo = basename(main)
    const text = (value: unknown) => (typeof value === "string" ? value : undefined)
    const contentFolder = text(written.contentFolder) ?? `../${repo}.epics`
    const installCommand = text(written.installCommand) ?? EpicConfig.installCommandOf(main)
    const defaults = EpicConfig.DEFAULTS
    return {
      ...defaults,
      contentFolder,
      baseBranch: written.baseBranch === undefined ? EpicConfig.baseBranchOf(main) : "main",
      worktreesFolder: `../${repo}.worktrees`,
      installCommand,
      installOnCreate: Boolean(installCommand),
      windows: { ...defaults.windows, default: repo, repoName: repo, contentName: basename(contentFolder) },
      windowsFolder: join(contentFolder, "windows")
    }
  }

  /**
   * The branch worktrees start from in the repo at `main`, the first of:
   * - the remote's default branch (`origin/HEAD`'s)
   * - a branch `main`, else `master`
   * - the branch the main checkout is on
   * - `main`
   * - read from git's own files (`.git/refs/...`, `packed-refs`, `HEAD`), no `git` run:  every config left without a
   *   `baseBranch` asks, the page server's included;  `git` only for git's newer `reftable` store, which has no such
   *   files
   */
  static baseBranchOf(main: string): string {
    const dotGit = join(main, ".git")
    if (existsSync(join(dotGit, "reftable")))
      return (
        Git.out(["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"], main)?.slice("origin/".length) ||
        "main"
      )
    const branchIn = (file: string) => /^ref:\s*refs\/(?:remotes\/origin|heads)\/(.+)$/m.exec(readOrEmpty(file))?.[1]
    const remote = branchIn(join(dotGit, "refs", "remotes", "origin", "HEAD"))
    if (remote) return remote
    const packed = readOrEmpty(join(dotGit, "packed-refs"))
    const has = (branch: string) =>
      existsSync(join(dotGit, "refs", "heads", branch)) || packed.includes(` refs/heads/${branch}\n`)
    return ["main", "master"].find(has) ?? branchIn(join(dotGit, "HEAD")) ?? "main"
  }

  /** The install command the lock file at `main`'s root names (`INSTALLERS`, first match);  `""` with none. */
  static installCommandOf(main: string): string {
    return EpicConfig.INSTALLERS.find(([file]) => existsSync(join(main, file)))?.[1] ?? ""
  }

  /**
   * The settings in config text `text` (from `file`, for messages):  each key left out from the repo itself
   * (`defaultsFor()`).
   * - `main`:  the repo's main checkout;  default the one `file` is in, `<main>/.epic/config.json5`
   * - `""`:  the repo's defaults
   * - throws `SyntaxError` on text that won't read, `TypeError` on a value of the wrong kind
   */
  static settingsFrom(text: string, file = EpicConfig.FILE, main = dirname(dirname(resolve(file)))): EpicSettings {
    const written = text.trim() ? EpicConfig.parse(text, file) : {}
    if (typeof written !== "object" || written === null || Array.isArray(written))
      throw new TypeError(`EpicConfig:  ${file} must hold an object, {...}`)
    const given = written as Record<string, unknown>
    const defaults = EpicConfig.defaultsFor(main, given)
    const windows = given.windows === undefined ? {} : given.windows
    if (typeof windows !== "object" || windows === null || Array.isArray(windows))
      throw new TypeError(`EpicConfig:  ${file}'s "windows" must be an object, { "default": ..., ... }`)
    const window = windows as Record<string, unknown>
    const windowSettings = window.settings === undefined ? defaults.windows.settings : window.settings
    if (typeof windowSettings !== "object" || windowSettings === null || Array.isArray(windowSettings))
      throw new TypeError(`EpicConfig:  ${file}'s "windows.settings" must be an object of VS Code settings, { ... }`)
    const appGiven = given.app === undefined ? {} : given.app
    if (typeof appGiven !== "object" || appGiven === null || Array.isArray(appGiven))
      throw new TypeError(`EpicConfig:  ${file}'s "app" must be an object, { "url": ..., "start": ... }`)
    const app = appGiven as Record<string, unknown>
    return {
      contentFolder: valueOf(given, "contentFolder", defaults.contentFolder, file),
      contentRemote: valueOf(given, "contentRemote", defaults.contentRemote, file, "", { empty: true }),
      baseBranch: valueOf(given, "baseBranch", defaults.baseBranch, file),
      worktreesFolder: valueOf(given, "worktreesFolder", defaults.worktreesFolder, file),
      installCommand: valueOf(given, "installCommand", defaults.installCommand, file, "", { empty: true }),
      installOnCreate: valueOf(given, "installOnCreate", defaults.installOnCreate, file),
      installTimeout: valueOf(given, "installTimeout", defaults.installTimeout, file),
      extraInstalls: pathsOf(given, "extraInstalls", defaults.extraInstalls, file),
      windows: {
        default: valueOf(window, "default", defaults.windows.default, file, "windows."),
        repoName: valueOf(window, "repoName", defaults.windows.repoName, file, "windows."),
        contentName: valueOf(window, "contentName", defaults.windows.contentName, file, "windows."),
        worktreeOnly: valueOf(window, "worktreeOnly", defaults.windows.worktreeOnly, file, "windows."),
        settings: windowSettings as Record<string, unknown>
      },
      linkSessionFolders: valueOf(given, "linkSessionFolders", defaults.linkSessionFolders, file),
      sharedFolders: foldersOf(given, "sharedFolders", defaults.sharedFolders, file),
      engineFolder: valueOf(given, "engineFolder", defaults.engineFolder, file, "", { empty: true }),
      repoTemplates: valueOf(given, "repoTemplates", defaults.repoTemplates, file, "", { empty: true }),
      windowsFolder: valueOf(given, "windowsFolder", defaults.windowsFolder, file, "", { empty: true }),
      repos: reposOf(given, defaults.repos, file),
      voices: namesTo(given, "voices", defaults.voices, file),
      pageVoices: { ...defaults.pageVoices, ...namesTo(given, "pageVoices", {}, file) },
      checkoutPatches: patchesOf(given, defaults.checkoutPatches, file),
      promptAck: valueOf(given, "promptAck", defaults.promptAck, file),
      renamedRepos: urlsTo(given, "renamedRepos", defaults.renamedRepos, file),
      colors: colorsOf(given, defaults.colors, file),
      top: valueOf(given, "top", defaults.top, file, "", { empty: true }),
      oldLayout: oldLayoutOf(given, defaults.oldLayout, file),
      app: {
        path: valueOf(app, "path", defaults.app.path, file, "app."),
        url: valueOf(app, "url", defaults.app.url, file, "app.", { empty: true }),
        urlFile: valueOf(app, "urlFile", defaults.app.urlFile, file, "app.", { empty: true }),
        start: valueOf(app, "start", defaults.app.start, file, "app.", { empty: true })
      }
    }
  }

  /**
   * Config text `text` as data:  JSON5, as the page server reads it (`json5`).
   * - throws `SyntaxError`, naming `file`
   */
  static parse(text: string, file = EpicConfig.FILE): unknown {
    try {
      return JSON5.parse(text)
    } catch (error) {
      throw new SyntaxError(`EpicConfig:  ${file} won't read:  ${(error as Error).message}`, { cause: error })
    }
  }

  /**
   * lock files and the install command each names, first match wins (`installCommandOf()`)
   * - static:  the same for every repo
   */
  private static readonly INSTALLERS: [file: string, command: string][] = [
    ["yarn.lock", "yarn install"],
    ["pnpm-lock.yaml", "pnpm install"],
    ["bun.lock", "bun install"],
    ["bun.lockb", "bun install"],
    ["package-lock.json", "npm install"],
    ["package.json", "npm install"],
    ["uv.lock", "uv sync"],
    ["Gemfile.lock", "bundle install"]
  ]
}

/**
 * One repo's checkout in an epic's worktree (`EpicConfig.repoCheckouts()`):  the repo's folder name, its MAIN
 * checkout, its worktree for the epic (made or not), and whether it's the top (or the single repo)
 */
export type RepoCheckout = {
  repo: string
  main: string
  worktree: string
  top: boolean
  /** an OLD-LAYOUT child checkout found inside the epic's worktree, not one the repo lists (`foundCheckouts()`) */
  found?: boolean
  /** a found checkout of one of the repo's `peers` (spell-brand's, in an old-layout worktree) */
  peer?: boolean
}

/** One of `EpicConfig.peers`:  a repo beside this one (`spell-brand`), and its MAIN checkout, absolute. */
export type EpicPeer = { name: string; main: string }

/**
 * `EpicSettings.oldLayout`:  how a repo that ABSORBED its child repos (repo-split's P20 · One Repo) meets an epic
 * worktree cut before, with a worktree of each old clone still inside it (epic-engine's P49, Q40 changed).
 * - `carryOn`:  the command, run from the worktree's root once `main` is merged in, that crosses its child-repo
 *   branches into the merged folders (`node bin/spell.mjs rename branches`):  `epic worktree merge-main` runs it
 * - `commitMaps`:  the folder of the history rewrite's commit maps, from a checkout's root (`tools/one-repo`):
 *   a found checkout whose tip is in one has crossed (`EpicConfig.isCrossed()`)
 * - `oldClones`:  where the main checkout's old clones went (`../spell.old`, Q41 B), from the main checkout:
 *   the worktree hook, reusing an old branch, names those that still hold it
 * - all `""` (the default):  a repo that never absorbed one;  found checkouts are walked as any other repo
 */
export type EpicOldLayout = { carryOn: string; commitMaps: string; oldClones: string }

/**
 * What `.epic/config.json5` holds:  where a repo keeps its epic things.
 * - Every key is optional in the file:  one left out reads as `epic init` would write it for the repo
 *   (`EpicConfig.defaultsFor()`);  the defaults below are a repo `my-app`'s.
 * - `contentFolder`:  the shared content repo, relative to the main checkout (`../my-app.epics`):
 *   the epics, guides, sagas and logs every checkout links in (`epic shared`, the turn-end commit hook)
 * - `contentRemote`:  the shared content repo's address, as git takes it (`git@github.com:o/my-app-epics.git`;
 *   epic `epic-friend` P4);  `""` (the default):  none, the plans stay on this machine
 *   - the FIRST person's `epic init` makes the repo on GitHub and writes it;  a later person's clones it, where the
 *     content folder is missing
 * - `baseBranch`:  the branch worktrees start from and merge into (the remote's default branch, from git):
 *   the worktree hook, `epic worktree merge-main`, `epic merge`, the behind-main notice
 * - `worktreesFolder`:  where NEW worktrees go, relative to the main checkout (`../my-app.worktrees`), one folder each:
 *   the worktree hook, the window script, the epics list, the page server's `/worktrees/<w>/`
 *   - outside the repo since epic `epic-eject` P8:  the old place, `.claude/worktrees`, is still read for the
 *     worktrees left there (`worktreesFolders`)
 * - `installCommand`:  what makes a new worktree ready to run (what the repo's lock file names, `yarn install`):
 *   `/isolate`, `/epic`, the hook;  `""` for none (a repo with no packages to install)
 * - `installOnCreate`:  whether the worktree hook runs `installCommand` itself, before it hands a NEW worktree over
 *   (off:  the skills run it, after entering).  On (the default when there's an install command), nothing opens the
 *   worktree without its packages (I2)
 * - `installTimeout`:  the seconds the hook's install may take (600)
 * - `extraInstalls`:  folders of a new worktree that are yarn projects of their own, NOT workspaces of the one install
 *   (`["epic/vscode", "app/vscode"]`, the extensions;  epic `epic-engine` I65), each a path from the
 *   worktree's root (the top's, in a multi-repo top);  `[]` (the default):  none
 *   - the worktree hook runs `installCommand` in each, after the one at the root, `installTimeout` seconds each
 *   - one that fails, or isn't there, is a warning:
 *     the worktree works, only what needs that folder's packages doesn't
 * - `windows`:  the VS Code windows (the window script)
 *   - `default`:  the window file a worktree's window is opened from when the session's window isn't a package's
 *     (`my-app`:  `<windowsFolder>/my-app.code-workspace`)
 *   - `repoName`:  the repo root's folder name in every window (`my-app`)
 *   - `contentName`:  the content repo's folder name in every window (`my-app.epics`, the content folder's name)
 *   - `worktreeOnly`:  whether EVERY worktree's window holds only the worktree and the content folder (on);
 *     a worktree beside the repo gets that window anyway (`worktreeOnlyWindow()`)
 *   - `settings`:  VS Code settings every window file gets, the repo's own, e.g. which TypeScript the editor runs
 *     (`{}`, none:  the default)
 *     - for WINDOW-scoped settings:  in a window of several folders,
 *       VS Code ignores them in a folder's `.vscode/settings.json`, and reads them from the window file only
 *     - `epic window init` writes them into the window files that exist;  a new one gets them as it's made
 * - `linkSessionFolders`:  whether the worktree hook links each NEW worktree's saved-session folder
 *   (`~/.claude/projects/<slug>`) to the main checkout's, so every window's Claude panel lists every session (on;
 *   `SessionFolders`, epic `epic-eject` Q4)
 * - `sharedFolders`:  the content folder's folders each checkout links in at its root (`epics`, `sagas`, `guides`,
 *   `pages`;  the kit's:  none):
 *   `epic shared link`, the turn-end commit hook
 *   - for people and other tools only:  the engine reads pages from the content folder itself (`contentOf()`)
 * - `engineFolder`:  the spell-epic checkout, relative to the main checkout, which `epic shared link` links in at each
 *   checkout's root as `spell-epic`, for a repo whose code imports the engine (spell-app's once did, epic `epic-eject`
 *   I5);  `""` (the default):  no link, a repo that only runs `epic`
 * - `repoTemplates`:  the repo's own page templates, a folder from each checkout's root (`""`, none:  the default);
 *   listed beside the engine's (spell-epic's `templates/`, epic `epic-eject` T11), and found by name before them
 * - `windowsFolder`:  the VS Code window files' folder, relative to the main checkout (`epic window`, epic `epic-eject`
 *   P13);  the content folder's `windows/` (`../my-app.epics/windows`);  `""` means it too
 *   - each machine's own, never tracked:  the content repo git-ignores `windows/`
 *   - before P13:  `workspaces/` in the main checkout, tracked by spell-app and marked `skip-worktree`
 * - `app`:  the repo's app, which the top bar's App tab opens through the epic server (epic `epic-engine` I49;
 *   `EpicApp`);  left out:  none, and the tab says so
 * - `repos`:  a MULTI-REPO TOP's child repos (epic `epic-engine` P10):  a file from the main checkout listing them
 *   (`"repos.json5"`, the top repo `spell`'s), or their names;  `""` (the default):  a single repo, as before
 *   - on, an epic's worktree is `<worktreesFolder>/<epic>/`:  a worktree of the top with one of every child repo
 *     inside it, all on branch `<epic>`, one install at its top (`top`, `repoCheckouts()`;  the worktree hook)
 *   - read in the TOP's config;  a child repo finds its top as the folder above its main checkout (`top`)
 * - `voices`:  the repo's own VOICES (epic `readme` P13), a name each, its file from the main checkout
 *   (`{ "code": "agents/wwod/writing.md" }`);  `{}` (the default):  only spell-epic's, `voices/<name>.md`
 *   - a name spell-epic ships too (`readme`) is the repo's own, in place of spell-epic's (`voiceFile()`)
 * - `pageVoices`:  which voice each KIND of page is written in, over the defaults
 *   (`readme` and `guide` in `readme`;  `code` and `epic-page` in `code`):  `voiceFor()`
 * - `checkoutPatches`:  fixes to a checkout's setup that every checkout gets at once, `main` and each worktree,
 *   however far behind `main` its branch is (`CheckoutPatch`, `CheckoutPatches`;  epic `epic-engine` P17);  `[]`
 *   (the default):  none
 *   - e.g. the kit's old `.ignore` (gone since the one repo), which let VS Code's Open File find the child repos' files
 *   - each repo's own:  a multi-repo top's patches are the top's checkouts', each child repo's its own
 * - `promptAck`:  whether the prompt hook shows a line, "On it:  <what Owen asked, in a sentence>", for a message
 *   sent while the session is busy (`PromptAck`, epic `epic-engine` P18);  on (the default), `false` turns it off
 * - `renamedRepos`:  the repo's OLD GitHub addresses, each to the address it was renamed to
 *   (`{ "https://github.com/spell-app/spell-kit": "https://github.com/spell-app/spell" }`, epic `epic-engine` I150);
 *   `{}` (the default):  none
 *   - GitHub redirects an old name, but an epic page records the address its repo had when it started:
 *     `EpicRepo` reads both as one repo, offline, so the page needs no rewrite
 *   - read from every repo of a multi-repo top, and from the checkout an address is looked for in (`EpicRepo.renamesOf()`)
 * - `colors`:  a colour for each person and each agent on the epic pages (epic `epic-friend` P10, Q16;  Owen:  "color
 *   per person and/or agent working on the project, set in epic project settings"), `EpicColors`;  `{ people: {},
 *   agents: {} }` (the default):  everyone in the shared person or agent colour
 *   - `epic init` doesn't write it;  `epic config colors` prints it
 * - `top`:  the KIT this repo is a PEER of, a folder from the main checkout (`"../spell"`, spell-brand's;
 *   epic-engine's P49, Q51 A);  `""` (the default):  none
 *   - each key this file leaves out that a peer shares (the content folder, windows ...) is the kit's (`kit`);
 *     its worktrees are its own, `../<repo>.worktrees` unless it says otherwise
 *   - the kit's repos file lists it with `"peer": true` (`peers`);  `epic config` warns when it doesn't
 * - `oldLayout`:  carrying an old-layout epic worktree across (`EpicOldLayout`), `{ carryOn, commitMaps, oldClones }`
 */
export type EpicSettings = {
  contentFolder: string
  contentRemote: string
  baseBranch: string
  worktreesFolder: string
  installCommand: string
  installOnCreate: boolean
  installTimeout: number
  extraInstalls: string[]
  windows: EpicWindows
  linkSessionFolders: boolean
  sharedFolders: string[]
  engineFolder: string
  repoTemplates: string
  windowsFolder: string
  app: EpicApp
  repos: string | string[]
  voices: Record<string, string>
  pageVoices: Record<string, string>
  checkoutPatches: CheckoutPatch[]
  promptAck: boolean
  renamedRepos: Record<string, string>
  colors: EpicColors
  top: string
  oldLayout: EpicOldLayout
}

/** The keys whose value comes from the repo itself, when a file leaves them out (`EpicConfig.defaultsFor()`). */
type RepoKey =
  | "contentFolder"
  | "baseBranch"
  | "worktreesFolder"
  | "installCommand"
  | "installOnCreate"
  | "windowsFolder"

/**
 * `EpicConfig.DEFAULTS`:  every key of `EpicSettings` with no per-repo value, the same in any repo
 * - the window names are the repo's;  only a window's layout and settings are here
 */
export type EpicDefaults = Prettify<
  Omit<EpicSettings, RepoKey | "windows"> & { windows: Omit<EpicWindows, "default" | "repoName" | "contentName"> }
>

/**
 * One of `EpicSettings.checkoutPatches`:  a fix to a checkout's setup that reaches every checkout, the worktrees behind
 * `main` included (`CheckoutPatches`).
 * - `id`:  its name, unique in the file (`vscode-ignore`):  what a checkout remembers having had
 * - `date`:  when it was added (`2026-10-22`)
 * - `why`:  what it fixes, for a person reading the report
 * - `copy`:  a file, from the repo's root, copied from the MAIN checkout into each checkout that doesn't track it yet
 *   - git-excluded there, so `git status` stays clean and the branch's merge of `main` replaces it
 *   - once the checkout tracks it (its branch has merged `main`), the patch does nothing there:  it retires by itself
 * - `run`:  a shell command run ONCE in each checkout's root (`yarn install`)
 * - one of `copy` or `run`, or both (the copy first)
 */
export type CheckoutPatch = { id: string; date: string; why: string; copy?: string; run?: string }

/**
 * `EpicSettings.app`:  the repo's app (spell-app's:  the editor), as the epic server opens it (`RepoApp`).
 * - `path`:  its address on the epic server (`/editor/`, the top bar's App tab),
 *   and under the repo's prefix (`/r/<repo>/editor/`)
 * - `url`:  where it answers (`http://localhost:3000/`)
 * - `urlFile`:  OR a JSON file its server writes once it's up, `{ "url": ... }`, from the main checkout
 *   - wins over `url` while it's there
 *   - spell-app's:  `.spell-server.editor.json`, written by spaces' `EditorServer`,
 *     as its page server's `/editor` reads it (`appRoutes.ts`)
 * - `start`:  the shell command that starts it, run DETACHED from the main checkout when it doesn't answer
 *   (`node ../bin/spell.mjs server start`, the kit's `spell`);  `""`:  nothing to run, the tab says it isn't up
 * - neither `url` nor `urlFile`:  no app (the default)
 */
export type EpicApp = { path: string; url: string; urlFile: string; start: string }

/**
 * `EpicSettings.colors`:  a colour for each person, by the short name `epic whoami` prints, and each agent, by its id
 * (`codex`);  a CSS colour each.  The page's shape of it:  `ThreadFacts`' `VoiceColors`.
 */
export type EpicColors = { people: Record<string, string>; agents: Record<string, string> }

/** `EpicSettings.windows`:  the default window, the folder names every window shows, its layout and settings. */
export type EpicWindows = {
  default: string
  repoName: string
  contentName: string
  worktreeOnly: boolean
  /** VS Code settings every window file gets (`settings` in the file), by name */
  settings: Record<string, unknown>
}

/** The text of `file`;  `""` when it isn't there. */
function readOrEmpty(file: string): string {
  try {
    return readFileSync(file, "utf8")
  } catch {
    return ""
  }
}

/**
 * Folder `path` as a path from `root` (`.claude/worktrees`), `/`-separated;
 * `undefined` when it's `root` itself or outside it.
 * - links followed on both sides (`RealPath.from()`):  an old spelling of either still counts
 */
function insideOf(root: string, path: string): string | undefined {
  return RealPath.from(root, path) || undefined
}

/** The messages `warnOnce()` has written, this process. */
const WARNED = new Set<string>()

/** Write `message` on stderr, as `EpicConfig:  <message>`, once per process:  a hook or a server asks many times. */
function warnOnce(message: string): void {
  if (WARNED.has(message)) return
  WARNED.add(message)
  process.stderr.write(`EpicConfig:  ${message}\n`)
}

/**
 * `given[key]`, of the same kind as `fallback`;  `fallback` when it's left out.
 * - throws `TypeError` naming the file and the key (`prefix` + `key`) when it's another kind, an empty string (unless
 *   `empty`), or a number that isn't more than 0
 */
function valueOf<T extends string | boolean | number>(
  given: Record<string, unknown>,
  key: string,
  fallback: T,
  file: string,
  prefix = "",
  { empty: emptyOk = false } = {}
): T {
  const value = given[key]
  if (value === undefined) return fallback
  const empty = typeof value === "string" ? !emptyOk && !value.trim() : typeof value === "number" && !(value > 0)
  if (typeof value !== typeof fallback || empty)
    throw new TypeError(
      `EpicConfig:  ${file}'s "${prefix}${key}" must be a ${typeof fallback}, not ${JSON.stringify(value)}`
    )
  return value as T
}

/**
 * `given[key]`, a list of folder names (`["epics", "sagas"]`);  `fallback` when it's left out.
 * - throws `TypeError` naming the file and the key when it isn't a list of plain names (no `/`, `..` or empty one)
 */
function foldersOf(given: Record<string, unknown>, key: string, fallback: string[], file: string): string[] {
  const value = given[key]
  if (value === undefined) return fallback
  const plain = (each: unknown) => typeof each === "string" && /^[\w.-]+$/.test(each) && each !== "." && each !== ".."
  if (!Array.isArray(value) || !value.every(plain))
    throw new TypeError(
      `EpicConfig:  ${file}'s "${key}" must be a list of folder names, ["epics", ...], not ${JSON.stringify(value)}`
    )
  return value as string[]
}

/**
 * `given[key]`, a list of folders, each a relative path (`["vscode", "app/vscode"]`);
 * `fallback` when it's left out.
 * - throws `TypeError` naming the file and the key when it isn't a list of `/`-separated plain names (no absolute path,
 *   no `.`, `..` or empty part)
 */
function pathsOf(given: Record<string, unknown>, key: string, fallback: string[], file: string): string[] {
  const value = given[key]
  if (value === undefined) return fallback
  const part = (each: string) => /^[\w.-]+$/.test(each) && each !== "." && each !== ".."
  const relative = (each: unknown) => typeof each === "string" && each.split("/").every(part)
  if (!Array.isArray(value) || !value.every(relative))
    throw new TypeError(
      `EpicConfig:  ${file}'s "${key}" must be a list of folders from the worktree's root, ["vscode", ...], not ` +
        JSON.stringify(value)
    )
  return value as string[]
}

/**
 * `given.repos`:  a file listing the child repos (`"repos.json5"`), or their names (`["spell-parser", ...]`);
 * `fallback` (`""`, none) when it's left out.
 * - throws `TypeError` naming the file for anything else
 */
function reposOf(given: Record<string, unknown>, fallback: string | string[], file: string): string | string[] {
  const value = given.repos
  if (value === undefined) return fallback
  const plain = (each: unknown) => typeof each === "string" && /^[\w.-]+$/.test(each) && each !== "." && each !== ".."
  if (typeof value === "string" || (Array.isArray(value) && value.every(plain))) return value as string | string[]
  throw new TypeError(
    `EpicConfig:  ${file}'s "repos" must be a file ("repos.json5") or a list of repo names, not ${JSON.stringify(value)}`
  )
}

/**
 * `given[key]`, an object of plain names to non-empty text (`{ "code": "agents/wwod/writing.md" }`);  `fallback` when
 * it's left out.
 * - throws `TypeError` naming the file and the key for anything else
 */
function namesTo(
  given: Record<string, unknown>,
  key: string,
  fallback: Record<string, string>,
  file: string
): Record<string, string> {
  const value = given[key]
  if (value === undefined) return fallback
  const ok =
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.entries(value).every(([name, text]) => /^[\w.-]+$/.test(name) && typeof text === "string" && text.trim())
  if (!ok)
    throw new TypeError(
      `EpicConfig:  ${file}'s "${key}" must be an object of names to text, { "code": "..." }, not ${JSON.stringify(value)}`
    )
  return value as Record<string, string>
}

/**
 * `given.checkoutPatches`:  a list of `CheckoutPatch`;  `fallback` (`[]`, none) when it's left out.
 * - throws `TypeError` naming the file for a patch without a plain `id`, `date` or `why`, one with neither `copy` nor
 *   `run`, a `copy` that isn't a relative path, or two patches with the same `id`
 */
function patchesOf(given: Record<string, unknown>, fallback: CheckoutPatch[], file: string): CheckoutPatch[] {
  const value = given.checkoutPatches
  if (value === undefined) return fallback
  const fail = (why: string) => {
    throw new TypeError(`EpicConfig:  ${file}'s "checkoutPatches" ${why}`)
  }
  if (!Array.isArray(value))
    fail(`must be a list of patches, [{ "id": ..., "copy": ... }], not ${JSON.stringify(value)}`)
  const ids = new Set<string>()
  return (value as unknown[]).map((each) => {
    const patch = (typeof each === "object" && each !== null ? each : {}) as Record<string, unknown>
    const text = (key: string) => typeof patch[key] === "string" && (patch[key] as string).trim() !== ""
    if (!text("id") || !/^[\w.-]+$/.test(patch.id as string))
      fail(`:  each needs an "id" of plain words, not ${JSON.stringify(each)}`)
    if (ids.has(patch.id as string)) fail(`:  two patches are "${patch.id}"`)
    ids.add(patch.id as string)
    if (!text("date") || !text("why")) fail(`:  "${patch.id}" needs a "date" and a "why"`)
    if (!text("copy") && !text("run")) fail(`:  "${patch.id}" needs a "copy" or a "run"`)
    const part = (name: string) => /^[\w.-]+$/.test(name) && name !== "." && name !== ".."
    if (patch.copy !== undefined && !(text("copy") && (patch.copy as string).split("/").every(part)))
      fail(`:  "${patch.id}"'s "copy" must be a file from the repo's root, not ${JSON.stringify(patch.copy)}`)
    const { id, date, why, copy, run } = patch as CheckoutPatch
    return { id, date, why, ...(copy ? { copy } : {}), ...(run ? { run } : {}) }
  })
}

/**
 * `given[key]`, an object of repo addresses to repo addresses (`{ "https://github.com/o/old": "https://github.com/o/new" }`);
 * `fallback` when it's left out.
 * - throws `TypeError` naming the file and the key for anything else, or an empty address on either side
 */
function urlsTo(
  given: Record<string, unknown>,
  key: string,
  fallback: Record<string, string>,
  file: string
): Record<string, string> {
  const value = given[key]
  if (value === undefined) return fallback
  const ok =
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.entries(value).every(([from, to]) => from.trim() && typeof to === "string" && to.trim())
  if (!ok)
    throw new TypeError(
      `EpicConfig:  ${file}'s "${key}" must be an object of old repo addresses to new ones, { "https://github.com/o/old": "https://github.com/o/new" }, not ${JSON.stringify(value)}`
    )
  return value as Record<string, string>
}

/**
 * `given.colors`:  `{ people: { <name>: <colour> }, agents: { <id>: <colour> } }`, each half optional;  left out,
 * `fallback`.
 * - a colour:  CSS colour words only (`#2f9e6e`, `teal`, `oklch(60% 0.1 180)`), nothing that ends a declaration:
 *   it goes into a page's style.  The page checks again as it reads them (`ThreadFacts.isColor()`).
 * - throws `TypeError` naming the file for anything else
 */
function colorsOf(given: Record<string, unknown>, fallback: EpicColors, file: string): EpicColors {
  const value = given.colors
  if (value === undefined) return fallback
  const isNames = (half: unknown) =>
    half === undefined ||
    (typeof half === "object" &&
      half !== null &&
      !Array.isArray(half) &&
      Object.entries(half).every(
        ([name, color]) => name.trim() && typeof color === "string" && COLOR.test(color.trim())
      ))
  const { people, agents } = (value ?? {}) as Record<string, unknown>
  const ok = typeof value === "object" && value !== null && !Array.isArray(value) && isNames(people) && isNames(agents)
  if (!ok)
    throw new TypeError(
      `EpicConfig:  ${file}'s "colors" must be { "people": { "ana": "#2f9e6e" }, "agents": { "codex": "#0f8b8d" } }, ` +
        `each a CSS colour, not ${JSON.stringify(value)}`
    )
  return { people: { ...(people as Record<string, string>) }, agents: { ...(agents as Record<string, string>) } }
}

/** A colour the settings may give (`colorsOf()`):  CSS colour words only;  the same rule as `ThreadFacts.isColor()`. */
const COLOR = /^[#\w][\w\s#%.,()/+-]{0,60}$/

/**
 * `given.oldLayout`:  `{ carryOn, commitMaps, oldClones }`, each text;  a key left out, `fallback`'s.
 * - throws `TypeError` naming the file for anything else
 */
function oldLayoutOf(given: Record<string, unknown>, fallback: EpicOldLayout, file: string): EpicOldLayout {
  const value = given.oldLayout
  if (value === undefined) return fallback
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new TypeError(`EpicConfig:  ${file}'s "oldLayout" must be an object, { "carryOn": ..., "commitMaps": ... }`)
  const layout = value as Record<string, unknown>
  const text = (key: keyof EpicOldLayout) => valueOf(layout, key, fallback[key], file, "oldLayout.", { empty: true })
  return { carryOn: text("carryOn"), commitMaps: text("commitMaps"), oldClones: text("oldClones") }
}
