import { existsSync, readFileSync, realpathSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

/**
 * The project's own npm install of a command, for a checkout's bin on the `PATH` to hand off to (epic `repo-split`
 * T71):  the `PATH`'s `spell` and `epic` are a checkout's, but a project that runs no checkout gets the version it
 * installed.
 * - `installs`:  where the command is in an install, from a project's folder, first found wins
 *   (`node_modules/spell/bin/spell.mjs`;  `node_modules/spell-epic/bin/epic`, then `node_modules/spell/epic/bin/epic`)
 * - Looks from `folder` up;  `undefined`, to run the checkout, when:
 *   - `SPELL_KIT` is set, or a `.spell/kit.json5` is found first:  the project runs a checkout (`spell local on`)
 *   - a kit checkout is found first (a `package.json` named `spell`):  its own bin decides
 *   - no install is found
 * - An install is one whose real path is in a `node_modules`:  a `portal:` or a link to a checkout isn't.
 * - Imports only node's own modules, in TypeScript plain node runs:  the bins load it before `tsx`.
 * - NEVER throws:  anything unreadable runs the checkout.
 */
export function projectBin(
  folder: string,
  installs: string[],
  env: NodeJS.ProcessEnv = process.env
): string | undefined {
  if (env.SPELL_KIT?.trim()) return undefined
  try {
    for (let dir = resolve(folder); ; dir = dirname(dir)) {
      if (existsSync(join(dir, ".spell", "kit.json5")) || isKitCheckout(dir)) return undefined
      for (const install of installs) {
        const bin = join(dir, install)
        if (existsSync(bin) && realpathSync(bin).includes("/node_modules/")) return bin
      }
      if (dirname(dir) === dir) return undefined
    }
  } catch {
    return undefined
  }
}

/** Whether `dir` is a kit checkout's root:  its `package.json` is named `spell`. */
function isKitCheckout(dir: string): boolean {
  const manifest = join(dir, "package.json")
  return existsSync(manifest) && (JSON.parse(readFileSync(manifest, "utf8")) as { name?: string }).name === "spell"
}
