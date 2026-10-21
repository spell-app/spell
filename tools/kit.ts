/**
 * `tools/kit.ts`:  the kit's OWN checks, over its five folders (epic `repo-split` P9):  what `yarn kit:ts`,
 * `kit:test`, `kit:lint`, `kit:lint:fix`, `kit:format` and `kit:format:check` run.
 * - The kit is ONE npm package, `spell-kit` (Q35), but each folder is its own TypeScript program (server and assembler
 *   node only, util and element browser-safe), with its own lint and test configs:  so each check runs folder by
 *   folder, each in its own folder, and its tests' in `tests/<folder>/`.
 * - Node 24 runs it as is (its types stripped):  node's own modules only, `import type` for types.
 *
 * ```sh
 * yarn kit:ts                # the declarations (spell-types:  util, server, assembler, element), then the rest's tsc
 * yarn kit:test              # every folder's Vitest
 * yarn kit:lint [--fix]      # every folder's oxlint, its source and its tests
 * yarn kit:format [--check]  # every folder's oxfmt
 * ```
 *
 * - Every folder runs, failed or not;  the summary says which failed, and the exit status is 1 if any did.
 */
import { spawnSync } from "node:child_process"
import { resolve } from "node:path"

/** The kit:  this file is in its `tools/`. */
const TOP = resolve(import.meta.dirname, "..")

/** One of the kit's folders, and what its checks cover. */
type Folder = {
  /** its folder at the kit's root, and its tests' in `tests/` */
  name: string
  /** what oxlint looks at in it */
  lint: string[]
  /** the configs `tsc` checks beside its source (its `tsconfig.node.json`), when it has them */
  node?: boolean
  /** its own source's `tsc`, when the declarations build doesn't check it (the toolchain:  no aliases, read as is) */
  plainTsc?: boolean
}

/** The folders, lowest first:  the order `kit:ts` checks them in. */
const FOLDERS: Folder[] = [
  { name: "toolchain", lint: ["src"], plainTsc: true },
  { name: "util", lint: ["src"], node: true },
  { name: "server", lint: ["src", "test", "scripts"], node: true },
  { name: "assembler", lint: ["src"], node: true },
  { name: "element", lint: ["src", "test"] }
]

/** The `vp lint` flags of a check (`lint`):  every warning fails it. */
const STRICT = ["--report-unused-disable-directives", "--max-warnings", "0"]

/** Runs `command` in `cwd` (from the kit's root), its output shown;  did it pass? */
function run(cwd: string, command: string, ...args: string[]): boolean {
  console.log(`\n>> ${cwd === "." ? "" : `(${cwd}) `}${command} ${args.join(" ")}`)
  return spawnSync(command, args, { cwd: resolve(TOP, cwd), stdio: "inherit" }).status === 0
}

/** The steps of check `check` for `folder`, each run in turn while they pass;  did they all? */
function checkFolder(check: string, folder: Folder): boolean {
  const { name } = folder
  const tests = `tests/${name}`
  switch (check) {
    case "ts":
      return (
        (!folder.plainTsc || run(".", "yarn", "tsc", "-p", name)) &&
        (!folder.node || run(".", "yarn", "tsc", "-p", `${name}/tsconfig.node.json`)) &&
        run(".", "yarn", "tsc", "-p", tests)
      )
    case "test":
      return run(name, "yarn", "vp", "test", "run")
    case "lint":
      return run(name, "yarn", "vp", "lint", ...STRICT, ...folder.lint) && run(tests, "yarn", "vp", "lint", ...STRICT, ".")
    case "lint:fix":
      return run(name, "yarn", "vp", "lint", "--fix", ...folder.lint) && run(tests, "yarn", "vp", "lint", "--fix", ".")
    case "format":
      return run(name, "yarn", "vp", "fmt", ".") && run(tests, "yarn", "vp", "fmt", ".")
    case "format:check":
      return run(name, "yarn", "vp", "fmt", "--check", ".") && run(tests, "yarn", "vp", "fmt", "--check", ".")
  }
  throw new Error(`no check ${check}`)
}

/** `node tools/kit.ts <check>`:  the check over every folder;  the exit status. */
function main([check]: string[]): number {
  const checks = ["ts", "test", "lint", "lint:fix", "format", "format:check"]
  if (!check || !checks.includes(check)) {
    console.error(`usage:  node tools/kit.ts ${checks.join(" | ")}`)
    return 2
  }
  const results: Array<[string, boolean]> = []
  // the declarations first (spell-types, the kit's "spellTypes" in order):  they ARE those folders' type check, and
  // each folder reads the ones before it by them
  if (check === "ts") results.push(["spell-types", run(".", "node", "toolchain/bin/spell-types.ts")])
  for (const folder of FOLDERS) results.push([folder.name, checkFolder(check, folder)])
  console.log(`\n==================== kit:${check}\n`)
  for (const [name, passed] of results) console.log(`${name.padEnd(12)} ${passed ? "passed" : "FAILED"}`)
  return results.every(([, passed]) => passed) ? 0 : 1
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2))
