import { existsSync, readFileSync, writeFileSync } from "fs"
import { resolve } from "path"

import JSON5 from "json5"

import { json5Edited } from "spell/util/node/json5"
import { SP } from "spell/parser/spell"
import { PROJECT_FILE, PROJECT_FILES } from "spell/parser/spell/spell.types"

/**
 * A project's file on disk, by whichever name it has:  `__project.json5`, or an old `project.json`
 * (`SP.PROJECT_FILES`, epic `people-and-orgs` P12).
 * - NODE ONLY:  it looks at the disk.
 * - And the Spell a project matches, written into it:  `writeSpellVersion()`.
 */

/** The project file in folder `folder`, its full path:  the first name it has, `undefined` for none. */
export function projectFileIn(folder: string): string | undefined {
  for (const name of PROJECT_FILES) {
    const file = resolve(folder, name)
    if (existsSync(file)) return file
  }
  return undefined
}

/** Does folder `folder` hold a project file, by any of its names?  Then it's a project's folder. */
export function hasProjectFile(folder: string): boolean {
  return projectFileIn(folder) !== undefined
}

/** Where folder `folder`'s project file is, or would be written:  the one it has, else `__project.json5`. */
export function projectFileFor(folder: string): string {
  return projectFileIn(folder) ?? resolve(folder, PROJECT_FILE)
}

/**
 * Write the Spell the project in folder `folder` now matches, `SP.SPELL_VERSION`, into its project file, as
 * `spellVersion` (epic `language` P68, Q79):  once its old forms are rewritten (`SP.OldForms`).
 * - Only when the file names an older Spell, or none;  its comments stay (`json5Edited()`).
 * - Nothing for a folder with no project file.
 * - `write: false`:  only whether it would.
 * - Returns whether it changed (or would change) the file.
 * - Read by `spell upgrade` / `spell lint --fix`, and the language server's upgrade.
 */
export function writeSpellVersion(folder: string, { write = true }: { write?: boolean } = {}): boolean {
  const path = projectFileIn(folder)
  if (!path) return false
  const source = readFileSync(path, "utf8")
  const settings = JSON5.parse<Record<string, unknown>>(source.trim() || "{}")
  if (!SP.OldForms.isOlderSpell(settings.spellVersion as string | undefined)) return false
  if (write) writeFileSync(path, json5Edited(source, { ...settings, spellVersion: SP.SPELL_VERSION }))
  return true
}
