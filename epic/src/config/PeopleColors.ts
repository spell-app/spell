import { existsSync, mkdirSync, readdirSync, renameSync } from "node:fs"
import { join } from "node:path"

import { DataFile } from "spell/server/DataFile"

import { VoiceColor } from "./VoiceColor.ts"

/****************
 * ### `PeopleColors`
 * The colour each person picked for their words, kept in the SHARED plans repo (epic `epic-friend` P13;  Owen's pick,
 * 2026-10-29):  one small file per person, `<content>/people/<name>.json5`, `{ name: "Ana Lima", color: "green" }`.
 * - Synced every turn with the plans:  so a teammate's colour reaches everyone, and nobody commits anything in the
 *   code repo.
 * - One file per person:  two people never write the same file, so a sync never conflicts here.
 * - `epic init` asks for one (`RepoInit`), `EpicConfig.colors` reads them in, the config's own `colors` winning,
 *   and `epic whoami --rename` moves a person's file (`NameSweep`).
 * - Plain `node` loads it (the hooks load `EpicConfig`):  node's own modules, the kit's `DataFile` and `VoiceColor`.
 ****************/
export class PeopleColors {
  /** The folder of everyone's files, in epic folder `content`:  `<content>/people`. */
  static folderOf(content: string): string {
    return join(content, FOLDER)
  }

  /** Person `person`'s file in epic folder `content`:  `people/<name>.json5`, the name as `slugOf()` writes it. */
  static fileFor(content: string, person: string): string {
    return join(PeopleColors.folderOf(content), `${PeopleColors.slugOf(person)}${DataFile.SUFFIX}`)
  }

  /**
   * A person's name as their files name it:  lower case, each run of anything but letters and digits one `-`
   * ("Ana Lima" => `ana-lima`, "José" => `josé`);  "someone" for a name with nothing left.
   * - two ways of writing one name (`Ana`, `ana`) are one file, as `epic whois` counts them one person
   * - the ONE rule:  a person's comments files are named by it too (`SharedComments.slugOf()`)
   */
  static slugOf(person: string): string {
    const slug = person
      .normalize("NFC")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
    return slug || SOMEONE
  }

  /**
   * Everyone's colour in epic folder `content`, by the name each file holds:  `{ "Ana Lima": "green" }`.
   * - a file that won't read, or names no colour the settings may give (`VoiceColor.isColor()`):  left out
   * - NEVER throws:  no folder, nobody
   */
  static read(content: string): Record<string, string> {
    const folder = PeopleColors.folderOf(content)
    if (!existsSync(folder)) return {}
    const colors: Record<string, string> = {}
    for (const file of readdirSync(folder)
      .filter((name) => name.endsWith(DataFile.SUFFIX))
      .sort()) {
      try {
        const kept = DataFile.read<PersonColor>(join(folder, file))
        if (kept?.name?.trim() && VoiceColor.isColor(kept.color)) colors[kept.name.trim()] = kept.color.trim()
      } catch {
        // a file that won't parse is nobody's colour
      }
    }
    return colors
  }

  /**
   * Keep `color` as person `person`'s, in epic folder `content`;  the file written.
   * - SIDE EFFECT:  writes `people/<name>.json5`, making the folder
   */
  static write(content: string, person: string, color: string): string {
    const file = PeopleColors.fileFor(content, person)
    mkdirSync(PeopleColors.folderOf(content), { recursive: true })
    DataFile.write(file, { name: person, color } satisfies PersonColor)
    return file
  }

  /**
   * Person `from`'s file moved to `to`'s name, and the name in it made `to`;  the move, `[from, to]`, from
   * `content`, or `undefined` when they have no file.
   * - the same file name both ways (`ana` => `Ana`):  the name inside changed, nothing moved
   * - `dryRun`:  changes nothing, says the same
   * - SIDE EFFECT:  renames and writes the file
   */
  static rename(content: string, from: string, to: string, { dryRun = false } = {}): [string, string] | undefined {
    const old = PeopleColors.fileFor(content, from)
    const kept = existsSync(old) ? DataFile.read<PersonColor>(old) : undefined
    if (!kept) return undefined
    const now = PeopleColors.fileFor(content, to)
    const move: [string, string] = [old, now]
    if (dryRun) return move
    if (now !== old) renameSync(old, now)
    DataFile.write(now, { ...kept, name: to })
    return move
  }
}

/** One person's file:  their name, and the colour they picked. */
export type PersonColor = {
  /** their short name, as `epic whoami` prints it */
  name: string
  /** a Spell UI colour name (`green`) or a CSS colour:  `VoiceColor` */
  color: string
}

/** The epic folder's folder of people's files. */
const FOLDER = "people"

/** What a name with nothing left in it is written as. */
const SOMEONE = "someone"
