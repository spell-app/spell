import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join, relative, resolve } from "node:path"

/****************
 * ### `FolderChecks`
 * A package's OWN checks, folder by folder, for a package of several folders (epic `repo-split` P9 for the kit, P11
 * for spell-lang and spell-app):  what its `yarn ts`, `test`, `lint`, `lint:fix`, `format` and `format:check` run.
 *
 * ```sh
 * spell-folders ts [folder ...]             # the declarations (spell-types, its "spellTypes"), then each folder's tsc
 * spell-folders test [folder ...]           # each folder's Vitest (and pytest, in a folder with Python)
 * spell-folders lint | lint:fix [folder ...]          # each folder's oxlint, its source and its tests (and ruff)
 * spell-folders format | format:check [folder ...]    # each folder's oxfmt (and ruff format)
 * ```
 *
 * - The package is ONE npm package (the kit `spell-kit`, Q35;  `spell-lang`, `spell-app`, Q36), but each folder is its
 *   own TypeScript program (node only, or browser-safe), with its own lint and test configs:  so each check runs folder
 *   by folder, each in its own folder, and its tests' in `tests/<folder>/`.
 * - The folders:  the package's `package.json`, `"spellFolders"`, lowest first (the order `ts` checks them in);  each
 *   a `Folder`.
 *   - A folder in `"spellTypes"` is type-checked by its declarations build (`spell-types`, run first);  any other by
 *     a plain `tsc -p <folder>`.
 * - `folder ...`:  only those;  none named:  all of them.
 * - Every folder runs, failed or not;  the summary says which failed, and the exit status is 1 if any did.
 * - Node runs this file as is (types stripped, `bin/spell-folders.ts`):  node's modules only, no alias, no `enum`, no
 *   parameter property.
 ****************/
export class FolderChecks {
  /** the checks it runs */
  static readonly CHECKS = ["ts", "test", "lint", "lint:fix", "format", "format:check"]

  /** the `vp lint` flags of a check (`lint`):  every warning fails it */
  static readonly STRICT = ["--report-unused-disable-directives", "--max-warnings", "0"]

  /** the package's folder:  where its `package.json` is */
  readonly root: string

  /** its folders, lowest first (`"spellFolders"`) */
  readonly folders: Folder[]

  /** the folders its declarations build compiles (`"spellTypes"`) */
  readonly typed: Set<string>

  constructor(root: string) {
    this.root = resolve(root)
    const manifest = JSON.parse(readFileSync(join(this.root, "package.json"), "utf8")) as Manifest
    this.folders = manifest.spellFolders ?? []
    this.typed = new Set(manifest.spellTypes ?? [])
  }

  /** Runs `command` in `cwd` (from the package's root), its output shown;  did it pass? */
  run(cwd: string, command: string, ...args: string[]): boolean {
    console.log(`\n>> ${cwd === "." ? "" : `(${cwd}) `}${command} ${args.join(" ")}`)
    return spawnSync(command, args, { cwd: resolve(this.root, cwd), stdio: "inherit" }).status === 0
  }

  /** The steps of check `check` for `folder`, each run in turn while they pass;  did they all? */
  checkFolder(check: string, folder: Folder): boolean {
    const { name, lint = ["src"], fmt = ["."], tests: testPaths = ["."] } = folder
    const tests = `tests/${name}`
    const python = folder.python && this.python(folder)
    switch (check) {
      case "ts":
        return (
          (this.typed.has(name) || this.run(".", "yarn", "tsc", "-p", name)) &&
          (!folder.node || this.run(".", "yarn", "tsc", "-p", `${name}/tsconfig.node.json`)) &&
          this.run(".", "yarn", "tsc", "-p", tests)
        )
      case "test":
        return this.run(name, "yarn", "vp", "test", "run") && (!python || python("pytest", "-q"))
      case "lint":
        return (
          this.run(name, "yarn", "vp", "lint", ...FolderChecks.STRICT, ...lint) &&
          this.run(tests, "yarn", "vp", "lint", ...FolderChecks.STRICT, ...testPaths) &&
          (!python || python("ruff", "check", ".", python.tests))
        )
      case "lint:fix":
        return (
          this.run(name, "yarn", "vp", "lint", "--fix", ...lint) &&
          this.run(tests, "yarn", "vp", "lint", "--fix", ...testPaths) &&
          (!python || python("ruff", "check", "--fix", ".", python.tests))
        )
      case "format":
        return (
          this.run(name, "yarn", "vp", "fmt", ...fmt) &&
          this.run(tests, "yarn", "vp", "fmt", ...testPaths) &&
          (!python || python("ruff", "format", ".", python.tests))
        )
      case "format:check":
        return (
          this.run(name, "yarn", "vp", "fmt", "--check", ...fmt) &&
          this.run(tests, "yarn", "vp", "fmt", "--check", ...testPaths) &&
          (!python || python("ruff", "format", "--check", ".", python.tests))
        )
    }
    throw new Error(`no check ${check}`)
  }

  /**
   * A runner of `uv run <tool> ...` in `folder`'s Python project (a uv project, `<folder>/<python>/`);  its `tests`,
   * the project's tests from there (`tests/<folder>/<python>/tests`).
   */
  python(folder: Folder): ((...args: string[]) => boolean) & { tests: string } {
    const project = join(folder.name, folder.python!)
    const tests = relative(join(this.root, project), join(this.root, "tests", project, "tests"))
    return Object.assign((...args: string[]) => this.run(".", "uv", "run", "--directory", project, ...args), { tests })
  }

  /** `check` over the folders named (none:  all of them);  the exit status. */
  main(check: string, names: string[]): number {
    const unknown = names.filter((name) => !this.folders.some((folder) => folder.name === name))
    if (unknown.length) {
      console.error(`spell-folders:  no folder ${unknown.join(", ")} in "spellFolders";  it lists ${this.list()}`)
      return 2
    }
    const folders = names.length ? this.folders.filter((folder) => names.includes(folder.name)) : this.folders
    const results: Array<[string, boolean]> = []
    // the declarations first (spell-types, the package's "spellTypes" in order):  they ARE those folders' type check,
    // and each folder reads the ones before it by them
    if (check === "ts" && this.typed.size) results.push(["spell-types", this.run(".", "node", SPELL_TYPES)])
    for (const folder of folders) results.push([folder.name, this.checkFolder(check, folder)])
    console.log(`\n==================== ${check}\n`)
    for (const [name, passed] of results) console.log(`${name.padEnd(14)} ${passed ? "passed" : "FAILED"}`)
    return results.every(([, passed]) => passed) ? 0 : 1
  }

  /** its folders' names, for a message */
  list(): string {
    return this.folders.map((folder) => folder.name).join(", ") || "none"
  }

  /** The command line:  `spell-folders <check> [folder ...]`, in the package's folder;  the exit status. */
  static main([check, ...names]: string[]): number {
    if (!check || !FolderChecks.CHECKS.includes(check)) {
      console.error(`usage:  spell-folders ${FolderChecks.CHECKS.join(" | ")} [folder ...]`)
      return 2
    }
    const checks = new FolderChecks(process.cwd())
    if (!checks.folders.length) {
      console.error(`spell-folders:  no "spellFolders" in ${join(checks.root, "package.json")}`)
      return 2
    }
    return checks.main(check, names)
  }
}

/** The declarations build's command, the toolchain's own (`bin/spell-types.ts`), beside this file's folder. */
const SPELL_TYPES = resolve(import.meta.dirname, "..", "bin", "spell-types.ts")

/** One folder of a package of several, as its `"spellFolders"` lists it. */
export type Folder = {
  /** its folder at the package's root;  its tests are in `tests/<name>/` */
  name: string
  /** what oxlint looks at in it;  default `["src"]` */
  lint?: string[]
  /** what oxfmt formats in it;  default `["."]` */
  fmt?: string[]
  /** what oxlint and oxfmt look at in its tests' folder;  default `["."]` */
  tests?: string[]
  /** `tsc` checks its configs too (its `tsconfig.node.json`) */
  node?: boolean
  /** its Python, a uv project in it (`core`):  ruff and pytest run there, over `tests/<name>/<python>/tests` too */
  python?: string
}

/** What this file reads of a `package.json`. */
type Manifest = {
  /** the folders, lowest first */
  spellFolders?: Folder[]
  /** the folders the declarations build compiles */
  spellTypes?: string[]
}
