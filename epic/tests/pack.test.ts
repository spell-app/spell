import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { expect, test } from "vite-plus/test"

/**
 * spell-app's `spell` command line, which still holds the pack tooling:  through spell-epic's `scripts/spell-app.mjs`,
 * from the spell-app checkout spell-epic uses (`.spell-app`).
 */
const SPELL_APP = fileURLToPath(new URL("../scripts/spell-app.mjs", import.meta.url))

/** spell-epic's root:  the package, whose `package.json` names the pack (`"spellPack"`, its `src/`). */
const PACKAGE = fileURLToPath(new URL("../", import.meta.url))

test("`src/components/__pack/` is CURRENT:  built from the vocabularies and sources as they are -- `yarn pack:build` if not", () => {
  const check = spawnSync(process.execPath, [SPELL_APP, "dev", "pack", "check", "epics"], {
    cwd: PACKAGE,
    encoding: "utf8"
  })
  expect(check.status, check.stdout + check.stderr).toBe(0)
}, 30_000)
