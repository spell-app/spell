import type { PrefForgetRequest, PrefKeysAnswer, PrefLoadAnswer, PrefSaved, PrefSaveRequest } from "spell/util"
import type { SRV } from "spell/server"
import { HOME_ORG, LOCAL_PERSON } from "spell/app/spaces/models/projectGroups"
import environment from "spell/app/spaces/server/node/environment"
import { queryText, respondWithJSON } from "spell/app/spaces/server/node/projects/response-utils"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"
import { SpacePrefs, type PrefPerson } from "./SpacePrefs"

/**
 * Preferences' routes, under `/api/prefs/` (epic `prefs-and-undo` P2):  what the kit's `ServerPlace` asks.
 * - `GET /api/prefs/load?store=<store>&key=<key>`:  `{ value }`, `value` left out for none
 * - `POST /api/prefs/save`, body `{ store, key, value }`:  `{ value }`;  no `value` forgets the key
 * - `GET /api/prefs/keys?store=<store>&under=<prefix>`:  `{ keys }`
 * - `POST /api/prefs/forget`, body `{ store, under }`:  `{ keys }`, the keys left
 * - A store name that can't be one:  400.
 * - Kept in the person's space, `@spell/owen@/__prefs/<store>.json5` (`SpacePrefs`).
 * - Whose:  this machine's person (`SPACES.LOCAL_PERSON`), until sign-in -- `prefsPersonFor()`.
 * - The protocol's types are the kit's (`spell/util`'s `PrefLoadAnswer` ...):  the client is generic.
 * - Each save is told to whoever listens (`onPrefSaved()`):  the app's route module hands it to every open page,
 *   over the page server's live channel (epic `debut` P21:  the person's theme, picked in one place, shows in all).
 */

/** The ONE prefs store, on spell-spaces:  made on the first call. */
let prefs: SpacePrefs | undefined

/** The prefs store on spell-spaces (`environment.spellSpacesDir`):  `SPELL_SPACES_DIR`, or the page server's `--spaces`. */
export function spacePrefs(): SpacePrefs {
  return (prefs ??= new SpacePrefs(new DiskStorage(environment.spellSpacesDir)))
}

/**
 * Whose preferences `request` reads and saves:  this machine's person, until sign-in.
 * - The ONE place sign-in changes:  it'll be the signed-in person's.
 */
export function prefsPersonFor(_request: SRV.Request): PrefPerson {
  return { id: LOCAL_PERSON, org: HOME_ORG }
}

/** `GET /api/prefs/load`:  see the file's docs. */
export const request_loadPref = respondWithJSON(async (request): Promise<PrefLoadAnswer> => {
  const value = await spacePrefs().load(prefsPersonFor(request), queryText(request, "store"), queryText(request, "key"))
  return value === undefined ? {} : { value }
})

/** `POST /api/prefs/save`:  see the file's docs.  Tells every `onPrefSaved()` listener. */
export const request_savePref = respondWithJSON(async (request): Promise<PrefLoadAnswer> => {
  const { store, key, value } = request.body as PrefSaveRequest
  await spacePrefs().save(prefsPersonFor(request), `${store}`, `${key}`, value)
  tellSaved(value === undefined ? { store: `${store}`, key: `${key}` } : { store: `${store}`, key: `${key}`, value })
  return value === undefined ? {} : { value }
})

/**
 * Call `listener` with each pref saved through `POST /api/prefs/save`;  returns the stop.
 * - e.g. the app's route module, sending it to every open page (`PREF_SAVED_EVENT`, the kit's `LiveReload.send()`)
 */
export function onPrefSaved(listener: (saved: PrefSaved) => void): () => void {
  savedListeners.add(listener)
  return () => {
    savedListeners.delete(listener)
  }
}

/** `onPrefSaved()`'s listeners. */
const savedListeners = new Set<(saved: PrefSaved) => void>()

/** Tell every listener `saved`;  one that throws is logged, and the rest still hear. */
function tellSaved(saved: PrefSaved): void {
  for (const listener of [...savedListeners]) {
    try {
      listener(saved)
    } catch (error) {
      console.error("prefsRoutes:  a pref-saved listener failed", error)
    }
  }
}

/** `GET /api/prefs/keys`:  see the file's docs. */
export const request_prefKeys = respondWithJSON(async (request): Promise<PrefKeysAnswer> => {
  const keys = await spacePrefs().keys(
    prefsPersonFor(request),
    queryText(request, "store"),
    queryText(request, "under")
  )
  return { keys }
})

/** `POST /api/prefs/forget`:  see the file's docs. */
export const request_forgetPrefs = respondWithJSON(async (request): Promise<PrefKeysAnswer> => {
  const { store, under } = request.body as PrefForgetRequest
  return { keys: await spacePrefs().forgetUnder(prefsPersonFor(request), `${store}`, `${under ?? ""}`) }
})
