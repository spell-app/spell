/**
 * `yarn spell:gen:syntax`:  write the spell syntax tables at `spell/`'s root, one per language pack.
 * - English's `spellSyntax.json`, then each other language's, `spellSyntax.es.json` ... -- see `spellSyntaxFileFor()`.
 * - Run it after adding, renaming or changing a rule, its docstring or its tests, in any language:
 *   `spellSyntax.test.ts` fails until you do.
 * - What's in them:  `spellSyntax()`.  Who reads English's:  the spell syntax guide, `guides/spell-syntax/spell-syntax.html`.
 * - NODE ONLY, and NOT in the barrel:  it writes the files the moment it's imported.
 */
import { writeFileSync } from "fs"
import { resolve } from "path"

import { SP } from "spell/parser/spell"
import { spellSyntax, spellSyntaxFileFor } from "spell/parser/spell/node/spellSyntax"

for (const language of SP.Language.all.values()) {
  const path = resolve(import.meta.dirname, "..", spellSyntaxFileFor(language))
  writeFileSync(path, `${JSON.stringify(spellSyntax(language), null, 2)}\n`)
  process.stdout.write(`wrote ${path}\n`)
}
// NOTE: exits explicitly:  loading the core can leave timers running, which would keep the process alive
process.exit(0)
