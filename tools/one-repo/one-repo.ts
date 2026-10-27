/**
 * `tools/one-repo/one-repo.ts`:  epic `repo-split` P20, One Repo, as a script that can be run again.
 * - spell-parser, spell-ui, spell-epic and spell-app become folders of the kit's repo, WITH their history:
 *   `parser/`, `ui/`, `epic/` and `app/` beside the kit's own `src/` (Q56).
 * - They're folders of ONE package, `spell` (Q62):  their imports become `spell/ui/...` and so on.
 * - Node 24 runs it as is (types stripped):  node's own modules, `git` and `git filter-repo`
 *   (`brew install git-filter-repo`).
 *
 * ```sh
 * node tools/one-repo/one-repo.ts [--from <folder>] [--ref main] [--step history|manifest|imports|all] [--dry-run]
 * node tools/one-repo/one-repo.ts --step carry-on [--dry-run]     # spell rename branches:  an open epic's branches
 * ```
 *
 * The steps, each its own commit on the current branch of the kit (run from the kit's root, its tree clean):
 * 1. `history`:  for each repo, a throwaway clone of its `<ref>` (default `main`) from `<from>/<repo>` (default:  the
 *    kit's own folder, where the child repos are checked out), rewritten into its folder by `git filter-repo`
 *    (`FILTER`), then merged in by `git merge --allow-unrelated-histories`.
 *    - Each clone's commit map (old SHA, new SHA) is kept beside this file, `commit-map-<folder>.txt`, and committed:
 *      epic `epic-engine` P49 remaps the epic pages' `<epic-commit>` links with them.
 * 2. `manifest`:  the one package's `package.json` -- the folders' `exports` folded into the kit's (`./ui/*` =>
 *    `./ui/src/*`, each `spell-<repo>-source` condition `spell-source`), their dependencies merged into the kit's
 *    (what `spell publish` packs), `workspaces` the four folders.
 *    - Each folder's `package.json` keeps its scripts, its settings and its dependencies (yarn links a workspace's
 *      bins from its own:  `tsc`, `vp`), each at the kit's version, plus the kit itself (`spell`, `workspace:*`:
 *      `spell-types`, `spell-pack`);  never an export (but epic's:  the `spell-epic/...` names the plugin's hooks
 *      still import, until epic-engine P49).
 *    - The folders' copies of `.yarnrc.yml` go:  the kit's is the one.
 * 3. `imports`:  `spell rename imports` over the kit (`src/cli/commands/renameImports.ts`).
 *
 * `carry-on` (`spell rename branches`), in an epic's worktree once P20 is on `main` and merged into its branch:
 * - each old child repo still checked out inside it (`spell-ui/` ...) is rewritten with the SAME `FILTER`, so every
 *   commit it shares with the old `main` comes out with the SAME new SHA as in the merged history, and only its own
 *   commits are new;  then `spell rename imports` runs over them (so both sides renamed every import alike, and the
 *   merge has nothing to resolve there), and they're merged into the worktree's branch, into the folder
 * - its commit map goes beside this file too, `commit-map-<folder>-<branch>.txt`
 * - the old child repos' folders are left in place, git-ignored, for removing later
 *
 * Replaying P20 onto a newer `main` (the child repos' history moved since):
 * 1. a fresh branch from the kit's `main`
 * 2. this file and `src/cli/commands/renameImports.ts` from the P20 branch:
 *    `git checkout repo-split -- tools/one-repo src/cli` and commit them (or pick the commit that added them)
 * 3. `node tools/one-repo/one-repo.ts --from ~/www/spell` (the main checkout's child repos, at their `main`)
 * 4. pick the hand-made commits that came after the `imports` step (`git cherry-pick <first>^..<last>`), then
 *    `yarn install`
 */
import { execFileSync, spawnSync } from "node:child_process"
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, relative, resolve } from "node:path"

import { ImportRenamer, renameImportsCommand } from "spell/cli/commands/renameImports.ts"

/** The kit:  this file is in its `tools/one-repo/`. */
const KIT = process.env.ONE_REPO_KIT ?? resolve(import.meta.dirname, "..", "..")

/** Where the commit maps go.  `ONE_REPO_KIT` points the script at a scratch kit, for its tests. */
const HERE = join(KIT, "tools", "one-repo")

/** The repos merged, lowest first, and each one's folder (Q56). */
const REPOS = [
  { repo: "spell-parser", folder: "parser" },
  { repo: "spell-ui", folder: "ui" },
  { repo: "spell-epic", folder: "epic" },
  { repo: "spell-app", folder: "app" }
]

/** The repo whose `exports` stay in its folder's `package.json`:  `spell-epic/...`, until epic-engine P49. */
const KEEPS_EXPORTS = "spell-epic"

/**
 * How each repo's history is rewritten:  into its folder, and NOTHING else, so a second run over a branch that shares
 * commits with the first gives those commits the same new SHAs (`carry-on`).
 * - `--preserve-commit-hashes`:  a SHA quoted in a message stays as written.  filter-repo would otherwise shorten it
 *   to the new commit's, as short as is unique among the objects THAT clone holds:  a clone with a branch's objects
 *   too can need a longer one, and every commit from there on would differ.  The commit maps translate them.
 */
const FILTER = ["filter-repo", "--quiet", "--force", "--preserve-commit-hashes", "--to-subdirectory-filter"]

/** Every commit message's last line. */
const TRAILER = "\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"

const args = process.argv.slice(2)
const option = (name: string, fallback: string) => {
  const at = args.indexOf(name)
  return at >= 0 ? args[at + 1]! : fallback
}
const from = resolve(option("--from", KIT))
const ref = option("--ref", "main")
const step = option("--step", "all")
const dryRun = args.includes("--dry-run")

if (step === "all" || step === "history") history()
if (step === "all" || step === "manifest") manifest()
if (step === "all" || step === "imports") imports()
if (step === "carry-on") carryOn()

////////////////
// ## 1. History
////////////////

/** Each repo's `ref`, rewritten into its folder and merged in;  then the commit maps, committed. */
function history(): void {
  mustBeClean()
  const scratch = mkdtempSync(join(tmpdir(), "spell-one-repo-"))
  try {
    for (const { repo, folder } of REPOS) {
      if (existsSync(join(KIT, folder, "package.json"))) {
        console.log(`${folder}/ is already here:  ${repo} skipped`)
        continue
      }
      const source = join(from, repo)
      const clone = join(scratch, repo)
      console.log(`${repo} (${ref}, from ${source}) => ${folder}/`)
      if (dryRun) continue
      const head = rewrite(source, ref, folder, clone, join(HERE, `commit-map-${folder}.txt`))
      git(KIT, [
        "merge",
        "--quiet",
        "--allow-unrelated-histories",
        "--no-ff",
        "-m",
        `repo-split P20:  One Repo -- ${repo}'s history merged in:  ${folder}/ (its ${ref}, ${head.slice(0, 10)} after filter-repo)${TRAILER}`,
        "FETCH_HEAD"
      ])
    }
    if (dryRun) return
    git(KIT, ["add", ...REPOS.map(({ folder }) => join(HERE, `commit-map-${folder}.txt`)).filter(existsSync)])
    if (staged())
      commit(
        "repo-split P20:  One Repo -- the commit maps of the four merged repos (old SHA, new SHA), tools/one-repo/commit-map-<folder>.txt:  epic-engine P49 remaps the <epic-commit> links with them"
      )
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
}

/**
 * Clone branch `branch` of the repo at `source` into `clone`, rewrite it into `folder` (`FILTER`), keep its commit map
 * at `mapFile`, and fetch it into the kit (`FETCH_HEAD`);  its new head SHA.
 */
function rewrite(source: string, branch: string, folder: string, clone: string, mapFile: string): string {
  git(KIT, ["-C", source, "rev-parse", "--verify", "--quiet", `refs/heads/${branch}`])
  git(KIT, ["clone", "--quiet", "--no-local", "--single-branch", "--no-tags", "--branch", branch, source, clone])
  git(clone, [...FILTER, folder])
  copyFileSync(join(clone, ".git", "filter-repo", "commit-map"), mapFile)
  git(KIT, ["fetch", "--quiet", "--no-tags", clone, `refs/heads/${branch}`])
  return git(clone, ["rev-parse", "HEAD"]).trim()
}

////////////////
// ## 2. The one package's manifest
////////////////

/** A `package.json`, as far as this step reads it. */
type Manifest = {
  name: string
  workspaces?: string[]
  exports?: Record<string, unknown>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  packageManager?: string
  [key: string]: unknown
}

/** Fold the folders' `exports` and dependencies into the kit's `package.json`;  `workspaces` the folders. */
function manifest(): void {
  mustBeClean()
  const kitFile = join(KIT, "package.json")
  const kit = readJson(kitFile)
  const names = new Set(REPOS.map(({ repo }) => repo).concat(kit.name))
  const exports = { ...kit.exports }
  const dependencies = { ...kit.dependencies }
  const devDependencies = { ...kit.devDependencies }
  const clashes: string[] = []

  for (const { repo, folder } of REPOS) {
    const file = join(KIT, folder, "package.json")
    if (!existsSync(file)) throw new Error(`one-repo:  no ${folder}/package.json;  run the history step first`)
    const own = readJson(file)
    for (const [key, target] of Object.entries(own.exports ?? {})) {
      if (key === "./package.json") continue
      exports[key === "." ? `./${folder}` : `./${folder}${key.slice(1)}`] = readBySource(retarget(target, folder, repo))
    }
    // its published short names (`"spellPublish": { "exports" }`, `./ui-*`), as the ONE package's (`spell/ui/ui-button`)
    for (const [key, target] of Object.entries(shortNames(own)))
      exports[`./${folder}${key.slice(1)}`] = sourceExport(folder, target)
    for (const [list, into] of [
      [own.dependencies, dependencies],
      [own.devDependencies, devDependencies]
    ] as const) {
      for (const [dep, version] of Object.entries(list ?? {})) {
        if (names.has(dep)) continue
        const had = dependencies[dep] ?? devDependencies[dep]
        if (had === undefined) into[dep] = version
        else if (had !== version) clashes.push(`${dep}:  ${folder} asks ${version}, kept ${had}`)
        // a runtime dependency anywhere is the package's runtime dependency
        if (into === dependencies && devDependencies[dep] !== undefined) {
          dependencies[dep] = devDependencies[dep]!
          delete devDependencies[dep]
        }
      }
    }
    // the folder keeps its dependencies, at the kit's versions (ONE copy each), and gains the kit itself
    own.dependencies = aligned(own.dependencies, names, dependencies, devDependencies)
    own.devDependencies = {
      [kit.name]: "workspace:*",
      ...aligned(own.devDependencies, names, dependencies, devDependencies)
    }
    if (!Object.keys(own.dependencies).length) delete own.dependencies
    delete own.peerDependencies
    delete own.packageManager
    if (repo === KEEPS_EXPORTS) own.exports = retargetConditions(own.exports ?? {}, repo)
    else delete own.exports
    if (!dryRun) writeJson(file, own)
    const yarnrc = join(KIT, folder, ".yarnrc.yml")
    if (existsSync(yarnrc) && !dryRun) git(KIT, ["rm", "--quiet", yarnrc])
  }

  kit.sideEffects = sideEffectsWith(kit.sideEffects, REPOS)
  kit.workspaces = REPOS.map(({ folder }) => folder)
  kit.exports = exports
  kit.dependencies = sorted(dependencies)
  kit.devDependencies = sorted(devDependencies)
  for (const clash of clashes) console.log(`  version:  ${clash}`)
  console.log(`exports:  ${Object.keys(exports).length} entries;  dependencies:  ${Object.keys(dependencies).length}`)
  if (dryRun) return
  writeJson(kitFile, kit)
  git(KIT, ["add", kitFile, ...REPOS.map(({ folder }) => join(KIT, folder, "package.json"))])
  commit(
    "repo-split P20:  One Repo -- one package, spell:  the four folders' exports in the kit's (./ui/* => ./ui/src/* ..., spell-source for each <repo>-source), their dependencies merged into the kit's, workspaces the four folders;  each folder's package.json keeps its scripts, settings and dependencies (at the kit's versions, plus spell itself for its bins), never an export (epic's stay:  the spell-epic/... alias until epic-engine P49);  their .yarnrc.yml copies go"
  )
}

/** An export target from `folder`'s own `package.json`, as the kit's:  every `./x` path `./<folder>/x`, one condition. */
function retarget(target: unknown, folder: string, repo: string): unknown {
  if (typeof target === "string") return target.replace(/^\.\//, `./${folder}/`)
  if (Array.isArray(target)) return target.map((each) => retarget(each, folder, repo))
  if (target && typeof target === "object") {
    return Object.fromEntries(
      Object.entries(target).map(([condition, value]) => [
        condition === `${repo}-source` ? "spell-source" : condition,
        retarget(value, folder, repo)
      ])
    )
  }
  return target
}

/**
 * An export target that names its source (`spell-source`) but no declarations (`types`:  a folder that builds none,
 * the app's), with `types` naming the source too:  so a program that reads the others' declarations (the app's node
 * program, Q59) still reads this folder's own names, as TypeScript adds no extension to `default`'s.
 */
function readBySource(target: unknown): unknown {
  if (!target || typeof target !== "object" || Array.isArray(target)) return target
  const conditions = target as Record<string, unknown>
  if (!("spell-source" in conditions) || "types" in conditions) return target
  const { "spell-source": source, ...rest } = conditions
  return { "spell-source": source, types: source, ...rest }
}

/** A folder's published short names, `"spellPublish": { "exports" }`:  `{ "./ui-*": ... }`, its family barrels. */
function shortNames(own: Manifest): Record<string, string> {
  return ((own.spellPublish as { exports?: Record<string, string> } | undefined)?.exports ?? {}) as Record<
    string,
    string
  >
}

/** The kit's export entry for `path` under `folder`'s `src/` (a family barrel:  `components/ui-button/index`):  source, declarations, default. */
function sourceExport(folder: string, path: string): Record<string, string> {
  return {
    "spell-source": `./${folder}/src/${path}.ts`,
    types: `./${folder}/dist-types/src/${path}.d.ts`,
    default: `./${folder}/src/${path}.ts`
  }
}

/** `exports` with its `<repo>-source` condition `spell-source`, paths unchanged. */
function retargetConditions(exports: Record<string, unknown>, repo: string): Record<string, unknown> {
  return JSON.parse(JSON.stringify(exports).replaceAll(`"${repo}-source"`, '"spell-source"')) as Record<string, unknown>
}

/**
 * A folder's dependencies `list`, without the merged repos' names, each at the version the kit's lists keep
 * (`dependencies`, then `devDependencies`):  one version of each package in the install.
 */
function aligned(
  list: Record<string, string> | undefined,
  names: Set<string>,
  dependencies: Record<string, string>,
  devDependencies: Record<string, string>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(list ?? {})
      .filter(([dep]) => !names.has(dep))
      .map(([dep, version]) => [dep, dependencies[dep] ?? devDependencies[dep] ?? version])
  )
}

/**
 * The kit's `sideEffects` with each folder's added:  a bundler reads them off the package a name resolves through
 * (`spell/ui/core` is `spell`'s), so a folder's own list would be ignored and its side effects shaken out
 * (Spell UI's `SpellUISettings`).
 * - A folder with no list (every file may have side effects):  `./<folder>/**`;  its own `./x`:  `./<folder>/x`.
 */
function sideEffectsWith(kit: unknown, repos: { folder: string }[]): unknown {
  if (!Array.isArray(kit)) return kit
  const list = [...(kit as string[])]
  for (const { folder } of repos) {
    const own = readJson(join(KIT, folder, "package.json")).sideEffects
    const added =
      own === undefined
        ? [`./${folder}/**`]
        : Array.isArray(own)
          ? (own as string[]).map((entry) => (entry.startsWith("./") ? `./${folder}/${entry.slice(2)}` : entry))
          : []
    for (const entry of added) if (!list.includes(entry)) list.push(entry)
  }
  return list
}

/** `record`, its keys sorted. */
function sorted(record: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)))
}

////////////////
// ## 3. The imports
////////////////

/** `spell rename imports` over the kit's checkout, committed. */
function imports(): void {
  mustBeClean()
  renameImportsCommand(KIT, { dryRun, repos: [KIT] })
  if (dryRun) return
  git(KIT, ["add", "--update"])
  if (staged())
    commit(
      "repo-split P20:  One Repo -- spell rename imports over the merged repo:  spell-ui/x => spell/ui/x (and parser, epic, app), each <repo>-source => spell-source, paths naming the old folders => the new (../spell-ui/ => ../ui/), GitHub links into the old repos' files => the merged repo's"
    )
}

////////////////
// ## Carry on:  an open epic's branches
////////////////

/**
 * Each old child repo still checked out inside the kit, its current branch rewritten as `history` rewrote its `main`,
 * its imports renamed, then merged into the kit's current branch, into its folder;  then `spell rename imports` over
 * the kit, for what the merge brought in.
 * - Throws, before changing anything, when a child repo has uncommitted changes, or the kit doesn't hold the merged
 *   folders yet (merge `main` first).
 * - Checks each rewritten branch shares the merged history:  its `main` commits came out with the SAME SHAs.
 */
function carryOn(): void {
  mustBeClean()
  const present = REPOS.filter(({ repo }) => existsSync(join(KIT, repo, ".git")))
  if (!present.length) {
    console.log("carry-on:  no old child repo here (spell-parser/, spell-ui/ ...):  nothing to carry on")
    return
  }
  for (const { repo, folder } of present) {
    if (!existsSync(join(KIT, folder, "package.json")))
      throw new Error(
        `carry-on:  no ${folder}/ here yet:  merge main (with epic repo-split P20) into this branch first`
      )
    if (git(join(KIT, repo), ["status", "--porcelain", "--untracked-files=no"]).trim())
      throw new Error(`carry-on:  ${repo}/ has uncommitted changes;  commit them on its branch first`)
  }
  const renamer = new ImportRenamer(KIT)
  const scratch = mkdtempSync(join(tmpdir(), "spell-carry-on-"))
  let carried = 0
  try {
    for (const { repo, folder } of present) {
      const source = join(KIT, repo)
      const branch = git(source, ["rev-parse", "--abbrev-ref", "HEAD"]).trim()
      const clone = join(scratch, repo)
      const mapFile = join(HERE, `commit-map-${folder}-${branch.replace(/[^\w.-]+/g, "-")}.txt`)
      console.log(`${repo} (its branch ${branch}) => ${folder}/`)
      if (!ownCommits(source, branch, join(HERE, `commit-map-${folder}.txt`))) {
        console.log(`${repo}: nothing of its own, skipped`)
        continue
      }
      if (dryRun) continue
      const head = rewrite(source, branch, folder, clone, mapFile)
      const base = git(KIT, ["merge-base", "HEAD", head], true).trim()
      if (!base) throw new Error(`carry-on:  ${repo}'s ${branch}, rewritten, shares no commit with this branch`)
      if (gitOk(KIT, ["merge-base", "--is-ancestor", head, "HEAD"])) {
        console.log(`${repo}: its ${branch} is already merged into ${folder}/, skipped`)
        // never leave a map file untracked
        if (!gitOk(KIT, ["ls-files", "--error-unmatch", mapFile])) rmSync(mapFile, { force: true })
        continue
      }
      const own = git(KIT, ["rev-list", "--count", `${base}..${head}`]).trim()
      console.log(`  ${own} commits of its own, on ${base.slice(0, 10)} (the merged history's)`)
      // rename its imports first, as the merged history's were:  both sides then changed each import line alike
      // only the files its own commits changed:  main's files, old-layout fixtures included, stay as they are
      const ownFiles = new Set(git(KIT, ["diff", "--name-only", "-z", base, head]).split("\0").filter(Boolean))
      const report = renamer.renameRepo(clone, false, ownFiles)
      let tip = head
      if (report.names) {
        git(clone, ["add", "--update"])
        git(clone, ["commit", "--quiet", "--no-verify", "-m", `${renamedMessage(repo, report.names)}${TRAILER}`])
        git(KIT, ["fetch", "--quiet", "--no-tags", clone, `refs/heads/${branch}`])
        tip = git(clone, ["rev-parse", "HEAD"]).trim()
      }
      const message = `repo-split P20:  carry on -- ${repo}'s branch ${branch} merged into ${folder}/ (${own} commits of its own, rewritten as P20's history was)${TRAILER}`
      if (!gitOk(KIT, ["merge", "--quiet", "--no-ff", "-m", message, tip]) && !mergeRenamed(renamer)) {
        throw new Error(
          `carry-on:  ${repo}'s branch ${branch} left conflicts in this checkout:  resolve them, \`git commit\`, ` +
            "then run carry-on again for the rest"
        )
      }
      carried++
      git(KIT, ["add", mapFile])
      if (staged())
        commit(`repo-split P20:  carry on -- ${repo}'s branch ${branch}:  its commit map, ${relative(KIT, mapFile)}`)
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
  if (!dryRun && carried) imports()
}

/**
 * Does the old repo's `branch` hold a commit that isn't in `mapFile`, the commit map of the `main` P20 merged?
 * - No such commit:  every one is already in the merged history, so there's nothing to carry on.
 * - No map file:  assume it does.
 */
function ownCommits(source: string, branch: string, mapFile: string): boolean {
  if (!existsSync(mapFile)) return true
  const merged = new Set(
    readFileSync(mapFile, "utf8")
      .split("\n")
      .map((line) => line.split(/\s+/)[0]!)
  )
  return git(source, ["rev-list", `refs/heads/${branch}`])
    .split("\n")
    .filter(Boolean)
    .some((sha) => !merged.has(sha))
}

/**
 * Settle a stopped merge's conflicts that come only from the rename:  each conflicted file merged again, three ways,
 * against its BASE renamed too (`renamer`), as both sides are;  a line only the rename changed then merges cleanly.
 * - Commits the merge and returns `true` when nothing's left;  else `false`, the files it couldn't settle left
 *   conflicted, with git's markers.
 */
function mergeRenamed(renamer: ImportRenamer): boolean {
  const conflicted = git(KIT, ["diff", "--name-only", "--diff-filter=U"]).split("\n").filter(Boolean)
  const scratch = mkdtempSync(join(tmpdir(), "spell-carry-merge-"))
  let left = 0
  try {
    for (const file of conflicted) {
      const [base, ours, theirs] = [1, 2, 3].map((stage) => git(KIT, ["show", `:${stage}:${file}`], true))
      if (base === "" || ours === "" || theirs === "") {
        left++
        continue
      }
      const paths = ["base", "ours", "theirs"].map((name) => join(scratch, name))
      writeFileSync(paths[0]!, renamer.renameText(base!).text)
      writeFileSync(paths[1]!, ours!)
      writeFileSync(paths[2]!, theirs!)
      const merged = spawnSync("git", ["merge-file", "-p", paths[1]!, paths[0]!, paths[2]!], {
        cwd: scratch,
        encoding: "utf8",
        maxBuffer: 1 << 28
      })
      if (merged.status !== 0) {
        left++
        continue
      }
      writeFileSync(join(KIT, file), merged.stdout)
      git(KIT, ["add", file])
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
  if (left) return false
  git(KIT, ["commit", "--quiet", "--no-verify", "--no-edit"])
  return true
}

/** The message of the commit that renames a carried-on branch's imports. */
function renamedMessage(repo: string, names: number): string {
  return `repo-split P20:  carry on -- spell rename imports over ${repo}'s branch, before its merge:  ${names} names`
}

////////////////
// ## Helpers
////////////////

/** Run git in `cwd`;  its output.  Throws when it fails, unless `orEmpty`:  then `""`. */
function git(cwd: string, gitArgs: string[], orEmpty = false): string {
  try {
    return execFileSync("git", gitArgs, {
      cwd,
      encoding: "utf8",
      maxBuffer: 1 << 28,
      stdio: ["ignore", "pipe", orEmpty ? "ignore" : "inherit"]
    })
  } catch (error) {
    if (orEmpty) return ""
    throw error
  }
}

/** Run git in `cwd`, its output shown only on failure;  did it succeed? */
function gitOk(cwd: string, gitArgs: string[]): boolean {
  return spawnSync("git", gitArgs, { cwd, stdio: ["ignore", "ignore", "pipe"] }).status === 0
}

/** Throws unless the kit's tracked files are unchanged:  each step commits what it changed, and only that. */
function mustBeClean(): void {
  if (dryRun) return
  if (git(KIT, ["status", "--porcelain", "--untracked-files=no"]).trim())
    throw new Error("one-repo:  the kit has uncommitted changes;  commit or set them aside first")
}

/** Anything staged? */
function staged(): boolean {
  return git(KIT, ["diff", "--cached", "--name-only"]).trim() !== ""
}

/** Commit what's staged. */
function commit(message: string): void {
  git(KIT, ["commit", "--quiet", "--no-verify", "-m", message + TRAILER])
}

/** A `package.json`'s JSON. */
function readJson(file: string): Manifest {
  return JSON.parse(readFileSync(file, "utf8")) as Manifest
}

/** Write a `package.json`, two spaces, a newline at the end. */
function writeJson(file: string, json: unknown): void {
  writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
