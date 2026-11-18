/**
 * `spell place check <file...>`:  does a place's reference page still match its source (epic `data` P53)?
 * - Reads what `spell place ingest` wrote of each place, its `<Name>.api.json5`, and its Spell file, `<Name>.api.spell`,
 *   which holds a person's words about it as `--` lines (`PlaceWords`).
 * - Fails, exit 1, on:
 *   - a list the description has and the Spell has no type for:  `spell place update` writes it
 *   - a person's words whose thing the description no longer has
 * - Says, without failing, how many lists and fields have no words yet, and the fields the Spell leaves out.
 * - Node only:  it reads files.
 */
import { existsSync, readFileSync } from "node:fs"

import JSON5 from "json5"

import { CLI } from "spell/cli"
import { descriptionFromDisk } from "spell/parser/spell/ingest/PlaceOnDisk"
import { PlaceWords } from "spell/parser/spell/ingest/PlaceWords"
import type { PlaceDescriptionOnDisk } from "spell/parser/spell/ingest/ingest.types"

/**
 * Check each place `files` names, by its Spell file or its description;  0 when every one matches, else 1.
 * - throws a `CLI.CliError` for a file it can't find or read
 */
export function placeCheck(files: readonly string[]): number {
  let failed = false
  for (const file of files) {
    const spellFile = file.replace(DESCRIPTION_FILE, ".spell")
    const descriptionFile = spellFile.replace(SPELL_FILE, ".json5")
    const description = descriptionFromDisk(readJSON5(descriptionFile))
    const check = PlaceWords.check(read(spellFile), description)
    const { lists, fields, ofLists, ofFields } = check.wordless
    const problems = [...check.stale, ...check.orphaned]
    failed ||= problems.length > 0
    process.stdout.write(
      `${spellFile}:  ${problems.length ? `${problems.length} to fix` : "matches its description"};  ` +
        `${ofLists - lists} of ${ofLists} lists and ${ofFields - fields} of ${ofFields} fields have words\n`
    )
    for (const problem of problems) process.stdout.write(`  ${problem}\n`)
    if (check.stale.length) process.stdout.write("  Run spell place update to write what's missing.\n")
    if (check.unwritten.length) {
      const some = check.unwritten.slice(0, MOST_NAMED).join(", ")
      const more = check.unwritten.length > MOST_NAMED ? `, and ${check.unwritten.length - MOST_NAMED} more` : ""
      process.stdout.write(`  Not in the Spell, so they have no words:  ${some}${more}\n`)
    }
  }
  return failed ? 1 : 0
}

/** `file`'s text. */
function read(file: string): string {
  if (!existsSync(file)) {
    throw new CLI.CliError(`spell place check:  no file at ${file};  run \`spell place ingest\` to write one`)
  }
  return readFileSync(file, "utf8")
}

/** The description in `file`, as the ingester wrote it. */
function readJSON5(file: string): PlaceDescriptionOnDisk {
  try {
    return JSON5.parse(read(file)) as PlaceDescriptionOnDisk
  } catch (error) {
    if (error instanceof CLI.CliError) throw error
    throw new CLI.CliError(`spell place check:  can't read ${file}:  ${(error as Error).message}`)
  }
}

/** The most fields the Spell leaves out it names. */
const MOST_NAMED = 10

/** A place's Spell file's ending. */
const SPELL_FILE = /\.spell$/
/** A place's description's ending. */
const DESCRIPTION_FILE = /\.json5$/
