import type { MeAnswer, PersonChanges } from "spell/app/spaces/models/people"
import type { SRV } from "spell/server"
import environment from "spell/app/spaces/server/node/environment"
import { prefsPersonFor } from "spell/app/spaces/server/node/prefs/prefsRoutes"
import { respondWithJSON } from "spell/app/spaces/server/node/projects/response-utils"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"
import { PeopleStore } from "./PeopleStore"

/**
 * People's routes, under `/api/people/` (epic `people-and-orgs` P9):  what the app's "You" panel reads and saves.
 * - `GET /api/people/me`:  this machine's person, their orgs and roles (read only),
 *   and what their files got wrong (`MeAnswer`).
 *   - The first time, it writes their starter `__me.json5`, from git's name and email.
 * - `POST /api/people/me`, body `PersonChanges`:  changes them, and writes their file with its comments kept.
 *   - It answers as `GET` does.
 * - Whose:  whoever's signed in (epic `atmosphere` P3), else this machine's person, `SPACES.LOCAL_PERSON` of spell's
 *   own org, `owen@spell` -- `prefsPersonFor()`.
 * - Nobody's refused a save (J46):  the permissions UI is todo T8.
 */

/** The ONE people store, on spell-spaces:  made on the first call. */
let store: PeopleStore | undefined

/** The people store on spell-spaces (`environment.spellSpacesDir`):  `SPELL_SPACES_DIR`, or the page server's `--spaces`. */
export function peopleStore(): PeopleStore {
  return (store ??= new PeopleStore(new DiskStorage(environment.spellSpacesDir)))
}

/** Whoever's asking, as `GET /api/people/me` answers:  their file made first if there's none. */
async function meAnswer(request: SRV.Request, changes?: PersonChanges): Promise<MeAnswer> {
  const people = peopleStore()
  const { id, org } = prefsPersonFor(request)
  const { person } = await people.me(id, org)
  if (changes) await people.change(person, changes)
  const { person: read, problems } = await people.person(id, org)
  return { person: people.view(read ?? person), orgs: await people.rolesOf(read ?? person), problems }
}

/** `GET /api/people/me`:  see the file's docs. */
export const request_getMe = respondWithJSON(async (request) => meAnswer(request))

/** `POST /api/people/me`:  see the file's docs. */
export const request_saveMe = respondWithJSON(async (request) => meAnswer(request, request.body as PersonChanges))
