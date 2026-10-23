import { spawnSync } from "node:child_process"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "vite-plus/test"

import { packageDir } from "spell-epic/tools/packageDir"

/**
 * The kit's pack tooling, `spell-pack` (`yarn pack:check`;  Spell UI's `spell-ui-pack` until epic `repo-split` P10),
 * from the kit's `bin/`, where Node's resolver finds the kit.
 */
const SPELL_PACK = join(packageDir("spell")!, "bin/spell-pack.mjs")

/** spell-epic's root:  the package, whose `package.json` names the pack (`"spellPack"`, its `src/`). */
const PACKAGE = fileURLToPath(new URL("../", import.meta.url))

test("`src/components/__pack/` is CURRENT:  built from the vocabularies and sources as they are -- `yarn pack:build` if not", () => {
  const check = spawnSync(process.execPath, [SPELL_PACK, "check"], {
    cwd: PACKAGE,
    encoding: "utf8"
  })
  expect(check.status, check.stdout + check.stderr).toBe(0)
}, 30_000)
