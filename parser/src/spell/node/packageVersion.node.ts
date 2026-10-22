import { existsSync, readFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

/**
 * Our `package.json` version -- the app's, NOT the spell language's (`SP.SPELL_VERSION`).
 * - The nearest `package.json` up from this file:  spell-lang's one (epic `repo-split` P11:  `src/spell/` is a folder of
 *   the `spell-lang` package, with no `package.json` of its own).
 * - NODE ONLY:  reads the file.  NEVER import from browser code -- it gets `__PACKAGE_VERSION__` from vite.
 */
export function readPackageVersion(): string {
  for (let at = dirname(fileURLToPath(import.meta.url)); ; at = dirname(at)) {
    const packageJson = join(at, "package.json")
    if (existsSync(packageJson)) return (JSON.parse(readFileSync(packageJson, "utf8")) as { version: string }).version
    if (dirname(at) === at) throw new Error("readPackageVersion:  no package.json above spell's node/ folder")
  }
}

/**
 * SIDE EFFECT: defines `__PACKAGE_VERSION__` for code `tsx` runs rather than vite.
 * - Vite and vitest define it themselves -- see `vite.packageVersion.ts`.
 * - What `tsx` runs imports this FIRST, before anything reads it:  spaces' servers (`appRoutes.ts`, `cli.ts`),
 *   lsp's `server.ts` and `scopes.ts`, the `spell` command (`main.ts`).
 */
globalThis.__PACKAGE_VERSION__ ??= readPackageVersion()
