import { SP } from "spell/parser/spell"
import { loadProjectFile, noteAppChanged, saveProjectFile } from "./project-utils"
import * as responseUtils from "./response-utils"

/**
 * The Spell a project on disk says it's written for, `spellVersion` in its project file (epic `language` P68, Q79):
 * written when it's made (`createProject()`) and once the editor's Upgrade has rewritten its old forms.
 * - Not a setting a person edits:  Project Settings only shows it (`SPACES.PROJECT_SETTINGS` leaves it out).
 * - The disk's own, for the `spell` command and the language server, is the parser's `writeSpellVersion()`:
 *   this one goes through the project file's writer the routes use (`saveProjectFile()`), which makes a file for a
 *   project with none yet.
 * - Node only, imported by path.
 */

/**
 * SIDE EFFECT:  project `projectId`'s file says it's written for today's Spell, `SP.SPELL_VERSION`, its comments kept.
 * - Makes the project file, for a project with none yet.
 * - Returns the version it says now.
 */
export async function setSpellVersion(projectId: string): Promise<string> {
  const file = await loadProjectFile(projectId)
  if (file.spellVersion !== SP.SPELL_VERSION)
    await saveProjectFile(projectId, { ...file, spellVersion: SP.SPELL_VERSION })
  return SP.SPELL_VERSION
}

/**
 * `POST /api/projects/spellVersion/project` -- say in a project's file that it's written for today's Spell:
 * the editor's Upgrade, once it has rewritten the project's old forms (`SPACES.SpellProjectRoot.saveSpellVersion()`).
 * - Client sends body:  `{ projectId }`.
 * - Returns:  `{ spellVersion }`, what its file says now.
 * - Failure:  500 if `projectId` is invalid, or on write error.
 */
export const request_saveSpellVersion = responseUtils.respondWithJSON(async (request) => {
  const { projectId } = request.body
  await noteAppChanged(projectId)
  return { spellVersion: await setSpellVersion(projectId) }
})
