/**
 * `yarn cli:install`, at the kit's root:  put `spell` on your `PATH`, as a symlink to `bin/spell.mjs` in this
 * checkout (the kit's `bin`, in its `package.json`).
 * - The work is `PathLink.link()` (`spell/cli/PathLink`), which `spell local on` shares:
 *   where it links, what it never replaces.
 * - ONLY `spell`:  the kit's other bins (`spell-pack`, `spell-types`) are for yarn scripts, through
 *   `node_modules/.bin`;  NOT `epic`, spell-epic's own (its `bin/epic`;  its README's "Install").
 * - `SPELL_BIN_DIR=/some/dir yarn cli:install` links there instead.
 * - A link made here is yours:  `spell local off` never removes it.
 * - NOT `npm link`:  that runs an npm install over this yarn project.
 * - Run it again after moving this checkout:  each link holds its full path.
 */
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { PathLink } from "spell/cli/PathLink.ts"

/** The kit's root, the `spell` package:  this file is in its `scripts/`. */
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const { bin } = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8"))

const { link, target, outcome, isOnPath } = new PathLink().link(resolve(packageRoot, bin.spell))
if (outcome === "blocked") {
  console.error(`${link} exists and isn't a symlink -- not replacing it.`)
  process.exit(1)
}
console.log(`Linked ${link} -> ${target}`)
if (!isOnPath) console.log(`NOTE: ${dirname(link)} isn't on your PATH -- add it to use \`spell\`.`)
