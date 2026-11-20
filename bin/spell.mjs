#!/usr/bin/env node
/**
 * The `spell` command:  runs the kit's `src/cli/main.ts` from THIS checkout, through `tsx` -- no build step.
 * - Run from inside ANOTHER checkout of the kit (a worktree), it hands off to that checkout's own `bin/spell.mjs`
 *   (`checkoutBin()`, below), so one checkout's code runs, whichever `spell` is on the `PATH` (epic `epic-engine` I282).
 * - `tsx` gets the kit's node settings explicitly, so they hold from ANY current folder,
 *   while relative paths on the command line still resolve against the caller's.
 *   - `tsx` takes ONE tsconfig for every file it runs:  the settings every repo's commands need are in it (JSX for
 *     spell-app's terminal screens, Ink's).
 *   - It's `tsconfig.tsx.json`, not `tsconfig.node.json` itself:  `tsx` applies a tsconfig only to the files it
 *     includes, and that one includes only the kit's folders (epic `repo-split` I69).
 * - It runs every installed repo's source (spell-parser's, spell-app's ...), each file imported by its package name
 *   (epic `repo-split` P14):  no alias hook.
 * - Every repo's commands:  `main.ts` reads each one's list (`"spell": { "commands" }` in its `package.json`).
 * - Run inside a PROJECT that installs `spell` from npm and doesn't run a checkout (no `.spell/kit.json5`, no
 *   `SPELL_KIT`), it hands off to that project's own `node_modules/spell` (epic `repo-split` T71):  the `PATH`'s
 *   `spell` is a checkout's, but the project gets the version it installed.
 * - Install on your `PATH` with `yarn cli:install`, at the kit's root -- see `scripts/install-cli.mjs`.
 * - NOTE: a symlink to this file works:  node runs the real path, so `import.meta.url` is in the kit.
 */
import { existsSync, readFileSync, realpathSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

/** The kit's root:  this file is in its `bin/`. */
const kitRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")

/** Set by this bin before it hands off to another `spell`:  that one runs itself, never handing back. */
const HANDED_OFF = Symbol.for("spell.bin.handedOff")

const handoff = globalThis[HANDED_OFF] ? undefined : (checkoutBin(process.cwd()) ?? (await installedBin(process.cwd())))
if (handoff) {
  globalThis[HANDED_OFF] = true
  await import(pathToFileURL(handoff).href)
} else {
  const { register } = await import("tsx/esm/api")
  register({ tsconfig: resolve(kitRoot, "tsconfig.tsx.json") })
  await import(pathToFileURL(resolve(kitRoot, "src/cli/main.ts")).href)
}

/**
 * The `bin/spell.mjs` of the kit checkout `folder` is in, when it's NOT this one and can run its own:
 * `undefined` to run this checkout's.
 * - Why:  the `PATH`'s `spell` is the main checkout's.  Run in a worktree, it served main's `Router` over the
 *   worktree's route modules, and every `/api` request answered 500, "handler is not a function".
 * - The checkout:  the nearest folder up from `folder` whose `package.json` is named `spell` (a big folder's,
 *   `spell-ui` ..., is skipped).
 * - Only once it's installed (`node_modules/tsx`):  a fresh worktree, before its `yarn install`, runs this
 *   checkout's, which has its packages (`epic window` works there).
 * - NEVER throws:  anything unreadable runs this checkout's.
 */
function checkoutBin(folder) {
  try {
    for (let dir = resolve(folder); ; dir = dirname(dir)) {
      const manifest = join(dir, "package.json")
      if (existsSync(manifest) && JSON.parse(readFileSync(manifest, "utf8")).name === "spell") {
        const bin = join(dir, "bin", "spell.mjs")
        const isOther = realpathSync(dir) !== realpathSync(kitRoot)
        return isOther && existsSync(bin) && existsSync(join(dir, "node_modules", "tsx")) ? bin : undefined
      }
      if (dirname(dir) === dir) return undefined
    }
  } catch {
    return undefined
  }
}

/**
 * In a project that installs `spell` from npm and runs no checkout:  that install's bin (`projectBin()`);
 * else `undefined`.
 * - NEVER throws:  before this checkout's `yarn install` links `spell/...`, `undefined`
 */
async function installedBin(folder) {
  try {
    const { projectBin } = await import("spell/cli/projectBin.ts")
    return projectBin(folder, ["node_modules/spell/bin/spell.mjs"])
  } catch {
    return undefined
  }
}
