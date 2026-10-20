import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { expect, test } from "vite-plus/test"

/**
 * Spell UI's pack tooling, `spell-ui-pack` (`yarn pack:check`;  epic `repo-split` P5), from the spell-app checkout
 * spell-epic links `@spell-app/ui` from (`.spell-app`).
 */
const SPELL_UI_PACK = fileURLToPath(new URL("../node_modules/@spell-app/ui/bin/spell-ui-pack.mjs", import.meta.url))

/** spell-epic's root:  the package, whose `package.json` names the pack (`"spellPack"`, its `src/`). */
const PACKAGE = fileURLToPath(new URL("../", import.meta.url))

test("`src/components/__pack/` is CURRENT:  built from the vocabularies and sources as they are -- `yarn pack:build` if not", () => {
  const check = spawnSync(process.execPath, [SPELL_UI_PACK, "check"], {
    cwd: PACKAGE,
    encoding: "utf8"
  })
  expect(check.status, check.stdout + check.stderr).toBe(0)
}, 30_000)
