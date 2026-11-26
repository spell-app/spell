import { join } from "path"

import { SRV } from "spell/server"
import environment from "spell/app/spaces/server/node/environment"

/**
 * Spell's compiler, as folders:  the code that decides what a project compiles to (epic `editor` P45).
 * - ONE list, for both things that need to know when the compiler changed:
 *   - the editor's compile cache (`/api/compiles`, its version)
 *   - the build folder's fingerprints (`spell compile --stale`, the cli's `staleBecause()`)
 * - What's in it:
 *   - the parser folder:  the language, its writers (JavaScript, TypeScript, Python), the core and its declarations
 *   - the kit's util, which the parser stands on
 *   - spaces' models, which register Spell UI's names for drawings (`spellUIPack.ts`),
 *     and Spell UI's components and vocabularies those read
 *   - the language server's folder, whose scope packs a compile writes
 * - More than it needs, on purpose:  a needless rebuild costs a compile;  a missed change would serve stale output.
 *   - e.g. the core's runtime:  compiled code imports it, so a change to it needs no rebuild, but it's in the parser folder
 * - Its folders found by package (`environment.packageFolder()`), never by a path into another folder.
 */
export const COMPILER_CODE: readonly string[] = [
  environment.packageFolder("spell/parser"),
  environment.packageFolder("spell/util"),
  environment.packageFolder("spell/app/spaces/models"),
  environment.packageFolder("spell/ui/components"),
  environment.packageFolder("spell/ui/vocabulary"),
  join(environment.repoDir, "src", "lsp")
]

/**
 * The compiler's version:  a hash of the text of every code file in `COMPILER_CODE` (`SRV.codeVersion()`).
 * - Read again only when a file's size or time changed:  a file saved unchanged, or a checkout that touched it,
 *   gives the same version.
 */
export const compilerVersion: () => string = SRV.codeVersion(COMPILER_CODE)
