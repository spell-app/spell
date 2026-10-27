/**
 * `yarn core:gen:templates`:  compile spell's built-in templates written in spell, ONCE (epic `elemental-spell` Q71).
 * - Writes each template's class into the core (`src/core/classes/TwoSidedView.ts`) and every template's declarations
 *   (`src/spell/builtInTemplates.generated.ts`) -- see `builtInTemplateFiles()`.
 * - Run it after changing a template in `src/core/templates/`:  `builtInTemplates.test.ts` fails until you do.
 * - NODE ONLY, and NOT in the barrel:  it writes the files the moment it's imported.
 */
import { writeFileSync } from "fs"
import { resolve } from "path"

import { builtInTemplateFiles } from "spell/parser/spell/node/builtInTemplateFiles"

for (const { path, text } of builtInTemplateFiles()) {
  const file = resolve(import.meta.dirname, "..", "..", "..", path)
  writeFileSync(file, text)
  process.stdout.write(`wrote ${file}\n`)
}
// NOTE: exits explicitly:  loading the core can leave timers running, which would keep the process alive
process.exit(0)
