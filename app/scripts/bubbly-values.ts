/**
 * `yarn tsx scripts/bubbly-values.ts [--check]`:  writes the bubbly look's settings as plain values, light and dark,
 * for VS Code, which can't load CSS (`BubblyValues`, epic `language` P49 for P51).
 * - Read from the look's one sheet, `src/app/components/spell-code/bubbly.css`;
 *   written beside it, `bubbly.values.json`.
 * - `--check`:  writes nothing;  exits 1 if it's out of date.  The app's tests check it too (`BubblyValues.test.ts`).
 * - Run from the app folder's root.
 */
import { readFileSync } from "node:fs"
import { relative, resolve } from "node:path"

import { writeOrCheck } from "spell/element-tools/generatedFiles"
import { BubblyValues } from "spell/app/app/components/spell-code/BubblyValues"

const SHEET = resolve("src/app/components/spell-code/bubbly.css")
const TABLE = resolve("src/app/components/spell-code/bubbly.values.json")

const isCheck = process.argv.includes("--check")
const text = `${JSON.stringify(BubblyValues.of(readFileSync(SHEET, "utf8")), null, 2)}\n`
const stale = writeOrCheck([[TABLE, text]], { command: "tsx scripts/bubbly-values.ts", isCheck })
console.info(
  stale.length === 0
    ? "The bubbly values are up to date."
    : `${isCheck ? "Out of date" : "Wrote"}:  ${stale.map((file) => relative(process.cwd(), file)).join(", ")}`
)
