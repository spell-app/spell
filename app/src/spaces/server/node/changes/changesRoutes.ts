import { SP } from "spell/parser/spell"
import { SRV } from "spell/server"
import type { SPACES } from "spell/app/spaces"
import { queryText, respondWithJSON } from "spell/app/spaces/server/node/projects/response-utils"
import { ChangeRequests } from "./ChangeRequests"

/**
 * The routes of the changes people ask for on what's selected (epic `editor` P18):
 * - `POST /api/changes`, body `ChangeAsked`:  the new request, and whether a session is listening
 * - `GET /api/changes?id=c3`:  where it's got to, the same;  404 for none
 * - A request with no words, or no file:  400;  a picture that isn't a PNG, JPEG, GIF or WebP too (epic `editor` T62).
 */

/** `POST /api/changes`:  see the file's docs. */
export const request_askForChange = respondWithJSON(async (request): Promise<SPACES.ChangeAnswer> => {
  const asked = request.body as SPACES.ChangeAsked
  if (!asked?.text?.trim() || !asked.projectId || !asked.filePath) {
    throw new SRV.HttpError(400, "POST /api/changes:  it needs `text`, `projectId` and `filePath`")
  }
  const { serverPath } = SP.SpellLocation.getFileLocation(asked.projectId, asked.filePath)
  const inbox = ChangeRequests.here
  try {
    return { ...inbox.add(asked, serverPath), listening: inbox.isListening() }
  } catch (error) {
    // a picture of a type it doesn't take:  the caller's mistake
    if (error instanceof TypeError) throw new SRV.HttpError(400, `POST /api/changes:  ${error.message}`)
    throw error
  }
})

/** `GET /api/changes`:  see the file's docs. */
export const request_getChange = respondWithJSON(async (request): Promise<SPACES.ChangeAnswer> => {
  const inbox = ChangeRequests.here
  const found = inbox.of(queryText(request, "id"))
  if (!found) throw new SRV.HttpError(404, "GET /api/changes:  there's no such request")
  return { ...found, listening: inbox.isListening() }
})
