import { readFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

import { findUp } from "spell/util/node/findUp"

/**
 * Our `package.json` version -- the app's, NOT the spell language's (`SP.SPELL_VERSION`).
 * - The nearest `package.json` up from this file:  spell-parser's one (epic `repo-split` P11:  `src/spell/` is a folder of
 *   the `spell-parser` package, with no `package.json` of its own).
 * - NODE ONLY:  reads the file.  NEVER import from browser code -- it gets `__PACKAGE_VERSION__` from vite.
 */
export function readPackageVersion(): string {
  const at = findUp(dirname(fileURLToPath(import.meta.url)), "package.json")
  if (!at) throw new Error("readPackageVersion:  no package.json above spell's node/ folder")
  return (JSON.parse(readFileSync(join(at, "package.json"), "utf8")) as { version: string }).version
}

/**
 * SIDE EFFECT: defines `__PACKAGE_VERSION__` for code `tsx` runs rather than vite.
 * - Vite and vitest define it themselves -- see `vite.packageVersion.ts`.
 * - What `tsx` runs imports this FIRST, before anything reads it:  spaces' servers (`appRoutes.ts`, `cli.ts`),
 *   lsp's `server.ts` and `scopes.ts`, the `spell` command (`main.ts`).
 */
globalThis.__PACKAGE_VERSION__ ??= readPackageVersion()
