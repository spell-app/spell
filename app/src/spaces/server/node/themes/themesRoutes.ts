import { SRV } from "spell/server"
import { HOME_ORG, LOCAL_PERSON } from "spell/app/spaces/models/projectGroups"
import { peopleStore } from "spell/app/spaces/server/node/people/peopleRoutes"
import { respondWithJSON } from "spell/app/spaces/server/node/projects/response-utils"
import type { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import { SpellUiThemes } from "./SpellUiThemes"

/**
 * Themes' routes, under `/api/themes/`:  Save into Spell UI, the theme editor's (epic `debut` P25).
 * - `GET /api/themes/spell-ui`:  `{ allowed }`, may this person save into Spell UI?
 * - `POST /api/themes/spell-ui`, body `{ name, text, overwrite? }`:  `{ file }`, the theme written as one of Spell's
 *   own (`SpellUiThemes`);  a name taken 409, a bad file 400.
 * - Only a Spell admin (Owen's C5, "admin function"):  the person's role in Spell's own org is `spell-admin`
 *   (the people library's `Membership.Roles`), asked of the people store;  anyone else is refused (403).
 *   - Spell UI never knows who the person is:  that's why the route is the app's.
 * - Whose:  this machine's person (`LOCAL_PERSON`), until sign-in, as the people routes.
 */

/** The ONE Spell UI themes writer:  made on the first call;  a test sets its own (`useSpellUiThemes()`). */
let themes: SpellUiThemes | undefined

/** Write through `writer` (a test's folder);  `undefined`:  Spell UI's own again. */
export function useSpellUiThemes(writer: SpellUiThemes | undefined): void {
  themes = writer
}

/** Is this machine's person a Spell admin:  `spell-admin` in Spell's own org?  `people`:  a test's store. */
export async function isSpellAdmin(people: PeopleStore = peopleStore()): Promise<boolean> {
  const { person } = await people.person(LOCAL_PERSON)
  if (!person) return false
  const roles = await people.rolesOf(person)
  return roles.some((org) => org.id === HOME_ORG && org.role === SPELL_ADMIN)
}

/** `GET /api/themes/spell-ui`:  see the file's docs. */
export const request_canSaveIntoSpellUi = respondWithJSON(async () => ({ allowed: await isSpellAdmin() }))

/** `POST /api/themes/spell-ui`:  see the file's docs. */
export const request_saveIntoSpellUi = respondWithJSON(async (request) => {
  if (!(await isSpellAdmin())) throw new SRV.HttpError(403, "only a Spell admin may save into Spell UI")
  const { name, text, overwrite } = request.body as { name?: string; text?: string; overwrite?: boolean }
  const file = (themes ??= new SpellUiThemes()).save({ name: `${name}`, text: `${text}`, overwrite: !!overwrite })
  return { file }
})

/** The role that may save into Spell UI. */
const SPELL_ADMIN = "spell-admin"
