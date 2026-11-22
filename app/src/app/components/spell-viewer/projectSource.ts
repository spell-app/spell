// Import directly, NOT through the `spell/parser/spell` barrel, which would pull in the whole parser.
import { SpellUrls } from "spell/parser/spell/SpellUrls"
// Import directly, NOT through the `spell/app/app/runner` barrel, which would pull in `runCompiled()`, and so `core`.
import type { SpellAppSource } from "spell/app/app/runner/SpellAppRunner"

/**
 * What to run for a project, by its address (`@spell/examples/Solitaire`):  what the spell server built of it,
 * sources and all.
 * - `<spell-viewer project="...">` runs it;  so does the run page, `/run/<project>` (`spell/app/app/run`).
 * - Every file by its URL, `/spaces/<project>/<file>` (`SpellUrls`):  a compiled file sits beside its source's.
 * - The server compiles a project whose built files are missing (spaces' `ProjectBuild`):
 *   one that's there is served as it is, what its last compile wrote.
 * - Plain data and `SpellUrls` alone:  no parser, no `core`.
 */
export function projectSource(projectId: string): SpellAppSource {
  return {
    name: nameOf(projectId),
    projectId,
    // a built site's main chunk, each page alone in its file a chunk of its own (epic `solid-2-final` P13, `LazyPages`)
    compiledUrl: `${builtUrl(projectId, COMPILED_JS)}?${LAZY_PAGES_QUERY}`,
    declarationsUrl: builtUrl(projectId, DECLARATIONS_JSON),
    scopesUrl: builtUrl(projectId, SCOPES_JS),
    importUrl: (id) => builtUrl(id, COMPILED_JS),
    // its code files' javascript, as the editor's runner reads them (`call native`, epic `from-project` P10)
    nativeUrl: (module) => SpellUrls.codeFileUrl(module),
    importDeclarationsUrl: (id) => builtUrl(id, DECLARATIONS_JSON),
    wordsUrl: builtUrl(projectId, WORDS_JS),
    importWordsUrl: (id) => builtUrl(id, WORDS_JS),
    // `spell:/@spell/examples/Solitaire/Solitaire.spell` => its project id, then its file
    sourceUrl: (uri) => SpellUrls.fileUrl(decodeURI(uri.replace(/^spell:\//, "")))
  }
}

/** Name of project `projectId`, e.g. `solitaire`:  its address's last part. */
export function nameOf(projectId: string): string {
  return projectId.slice(projectId.lastIndexOf("/") + 1)
}

/**
 * URL of project `projectId`'s `<project><suffix>`, e.g. `/spaces/@spell/examples/Solitaire/Solitaire.spell.js`.
 * - `suffix` goes on AFTER the address is encoded:  the words' `{lang}` must stay as it is, for the runner to fill in
 *   (encoded, `%7Blang%7D`, the runner never saw it, so a Spanish app loaded no words and drew no Spanish tags).
 */
function builtUrl(projectId: string, suffix: string): string {
  return SpellUrls.SPACES + SpellUrls.encodeAddress(`${projectId}/${nameOf(projectId)}`) + suffix
}

/**
 * End of a compiled project's file name:  `SP.COMPILED_JS_SUFFIX`.
 * - NOTE: copies, NOT imported:  `spell/parser/spell` would pull the whole parser into the bundle.
 */
export const COMPILED_JS = ".spell.js"

/**
 * What asks the spell server for a program's main chunk, its pages alone in their files cut out (`SP.PageChunks`):
 * a host that sends files as they are sends it whole, and it runs whole.
 */
export const LAZY_PAGES_QUERY = "pages=lazy"

/** End of a scope pack's file name:  `SP.SCOPES_JS_SUFFIX`. */
export const SCOPES_JS = ".scopes.js"

/** End of a project's declarations file's name:  `SP.DECLARATIONS_JSON_SUFFIX`. */
export const DECLARATIONS_JSON = ".declarations.json5"

/**
 * End of a project's words file's name, in one of its languages:  `SP.wordsSuffixFor()`, e.g. `.en.js`, `.es.js`.
 * - `{lang}` is filled in with each language its declarations name when the words load
 *   (`SpellAppRunner`'s `wordsInLanguages()`):  a project mixing languages has a file in each (epic `spanish` P19).
 */
export const WORDS_JS = ".{lang}.js"
