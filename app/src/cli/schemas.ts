/**
 * The JSON Schema of each type a compiled LIBRARY exports, written for VS Code (epic `people-and-orgs` P5, Q43):
 * `<build folder>/schemas/Person.schema.json`.
 * - And beside it, its LEXICON, AT Protocol's schema language (epic `atmosphere` P10):  `Person.lexicon.json`.
 * - What `spell compile` writes after a project's library target (`ts/lib`, its `<project>.lib.ts`).
 * - Made from the compiled class itself (`SC.jsonSchemaFor()`, `SC.lexiconFor()`):
 *   so it says what the app's checker checks.  Never committed, never written by hand.
 * - VS Code finds one through the repo's settings (`json.schemas`), by the file's name, e.g. `__me.json5`.
 * - A Lexicon is named as its type says (`- it is published as "..."`), else by the project's address
 *   (`SC.nsidFor()`, `space.spell.spell.library.people.person`);  `spell space lexicon publish` publishes it.
 */
import { mkdirSync, statSync, writeFileSync } from "fs"
import { resolve } from "path"
import { pathToFileURL } from "url"

import { jsonSchemaFor, lexiconFor, nsidFor, type LexiconDocument } from "spell/parser/core/model"

/** The end of a Lexicon's file name, beside its type's JSON Schema:  `Person.lexicon.json`. */
export const LEXICON_SUFFIX = ".lexicon.json"

/** A compiled library's type:  a class with a schema, and maybe a published name. */
type LibraryType = Function & { declareProp: Function; publishedAs?: string | boolean }

/**
 * Write the JSON Schema and the Lexicon of each type library `libFile` exports into `folder`:
 * `<Type>.schema.json`, `<Type>.lexicon.json`;  returns the paths written.
 * - A type:  an exported class with a schema (`declareProp`), i.e. a spell thing.
 * - `projectId`:  the library's address, what an unnamed Lexicon is named by, e.g. `@spell/library/people`.
 * - Imports `libFile` afresh each time (its changed time in the URL), so a watch's recompile writes the new types.
 */
export async function writeSchemas(libFile: string, folder: string, projectId: string): Promise<string[]> {
  const wrote: string[] = []
  for (const [name, Class] of await libraryTypes(libFile)) {
    mkdirSync(folder, { recursive: true })
    const path = resolve(folder, `${name}.schema.json`)
    writeFileSync(path, JSON.stringify(jsonSchemaFor(Class), null, 2) + "\n")
    const lexicon = resolve(folder, `${name}${LEXICON_SUFFIX}`)
    writeFileSync(lexicon, JSON.stringify(lexiconOf(Class, name, projectId), null, 2) + "\n")
    wrote.push(path, lexicon)
  }
  return wrote
}

/**
 * The Lexicons of the types library `libFile` marks for publishing (`- it is published ...`), by type name.
 * - What `spell space lexicon publish` publishes.
 */
export async function publishedLexicons(libFile: string, projectId: string): Promise<Map<string, LexiconDocument>> {
  const published = new Map<string, LexiconDocument>()
  for (const [name, Class] of await libraryTypes(libFile)) {
    if (Class.publishedAs) published.set(name, lexiconOf(Class, name, projectId))
  }
  return published
}

/** Type `name`'s Lexicon:  named as it says, else by `projectId`. */
function lexiconOf(Class: LibraryType, name: string, projectId: string): LexiconDocument {
  const id = typeof Class.publishedAs === "string" ? Class.publishedAs : nsidFor(projectId, name)
  return lexiconFor(Class, { id })
}

/** Each type `libFile` exports, by name, imported afresh. */
async function libraryTypes(libFile: string): Promise<Array<[string, LibraryType]>> {
  const url = `${pathToFileURL(libFile).href}?at=${statSync(libFile).mtimeMs}`
  const library = (await import(url)) as Record<string, unknown>
  return Object.entries(library).filter(
    (entry): entry is [string, LibraryType] =>
      typeof entry[1] === "function" && typeof (entry[1] as { declareProp?: unknown }).declareProp === "function"
  )
}
