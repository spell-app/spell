import { SP } from "spell/parser/spell"
import { SRV } from "spell/server"
import type { SPACES } from "spell/app/spaces"
import { shownPathFor } from "spell/app/spaces/server/node/projects/project-utils"
import { queryText, respondWithJSON } from "spell/app/spaces/server/node/projects/response-utils"
import { ChangeRequests } from "./ChangeRequests"
import { ClaudeExplainer } from "./ClaudeExplainer"
import { ClaudeStarter } from "./ClaudeStarter"

/**
 * The routes of the changes people ask for on what's selected (epic `editor` P18):
 * - `POST /api/changes`, body `ChangeAsked`:  the new request, whether a session is listening,
 *   and whether Claude Code is on this machine
 *   - nobody listening, and Claude Code here:  a session is started for it at once (`ClaudeStarter`, epic `editor` T66)
 * - `POST /api/changes/start?id=c3`:  start a session for a request still waiting, the box's Start Claude button
 * - `GET /api/changes?id=c3`:  where it's got to, the same, and what its session is doing (`progress`);  404 for none
 *   - a session started for it that has ended without finishing, or hasn't taken it within a minute:
 *     failed (`ClaudeStarter.settle()`)
 * - The file a request names is the one the asker sees:  their draft of it, when they have one (`shownPathFor()`;
 *   epic `editor` I152, where Claude edited the public file under Owen's draft, and nothing showed)
 * - A request with no words, or no file:  400;  a picture that isn't a PNG, JPEG, GIF or WebP too (epic `editor` T62).
 * - `POST /api/explain`, body `ExplainAsked`:  what a piece of Spell does, in plain words, answered at once by Claude Code
 *   on this machine (`ClaudeExplainer`;  the code's right-click Explain This, epic `editor` P32, Q39)
 *   - no code:  400;  Claude Code not on this machine:  409;  Claude couldn't answer:  502, saying why
 */

/** `POST /api/changes`:  see the file's docs. */
export const request_askForChange = respondWithJSON(async (request): Promise<SPACES.ChangeAnswer> => {
  const asked = request.body as SPACES.ChangeAsked
  if (!asked?.text?.trim() || !asked.projectId || !asked.filePath) {
    throw new SRV.HttpError(400, "POST /api/changes:  it needs `text`, `projectId` and `filePath`")
  }
  // the file as they see it:  their draft, when they have one
  const diskPath = await shownPathFor(request, SP.SpellLocation.getFileLocation(asked.projectId, asked.filePath))
  const inbox = ChangeRequests.here
  let added: SPACES.ChangeRequest
  try {
    added = inbox.add(asked, diskPath)
  } catch (error) {
    // a picture of a type it doesn't take:  the caller's mistake
    if (error instanceof TypeError) throw new SRV.HttpError(400, `POST /api/changes:  ${error.message}`)
    throw error
  }
  const starter = new ClaudeStarter(inbox)
  if (!inbox.isListening() && starter.hasClaude) added = startOrLeave(starter, added)
  return answerFor(starter, added)
})

/** `POST /api/changes/start`:  see the file's docs. */
export const request_startClaude = respondWithJSON(async (request): Promise<SPACES.ChangeAnswer> => {
  const starter = ClaudeStarter.here
  const found = starter.settle(starter.inbox.of(queryText(request, "id")))
  if (!found) throw new SRV.HttpError(404, "POST /api/changes/start:  there's no such request")
  if (!starter.hasClaude) throw new SRV.HttpError(409, "POST /api/changes/start:  Claude Code isn't on this machine")
  if (found.status !== "waiting") throw new SRV.HttpError(409, `POST /api/changes/start:  it's ${found.status} already`)
  return answerFor(starter, starter.start(found, projectFolderOf(found)))
})

/** `GET /api/changes`:  see the file's docs. */
export const request_getChange = respondWithJSON(async (request): Promise<SPACES.ChangeAnswer> => {
  const starter = ClaudeStarter.here
  const found = starter.settle(starter.inbox.of(queryText(request, "id")))
  if (!found) throw new SRV.HttpError(404, "GET /api/changes:  there's no such request")
  return answerFor(starter, found)
})

/** `POST /api/explain`:  see the file's docs. */
export const request_explain = respondWithJSON(async (request): Promise<SPACES.ExplainAnswer> => {
  const asked = request.body as SPACES.ExplainAsked
  if (typeof asked?.code !== "string" || !asked.code.trim()) {
    throw new SRV.HttpError(400, "POST /api/explain:  it needs `code`")
  }
  const explainer = new ClaudeExplainer()
  if (!explainer.hasClaude) throw new SRV.HttpError(409, "POST /api/explain:  Claude Code isn't on this machine")
  try {
    const explanation = await explainer.explain({ ...asked, language: asked.language || "en" })
    return { explanation }
  } catch (error) {
    throw new SRV.HttpError(502, `POST /api/explain:  ${error instanceof Error ? error.message : String(error)}`)
  }
})

/**
 * Start a session for `request`;  one that won't start leaves it waiting, the box offering Start Claude.
 * - NEVER throws:  the failure goes to the server's log
 */
function startOrLeave(starter: ClaudeStarter, request: SPACES.ChangeRequest): SPACES.ChangeRequest {
  try {
    return starter.start(request, projectFolderOf(request))
  } catch (ignored) {
    console.error("POST /api/changes:  can't start Claude for", request.id, ignored)
    return request
  }
}

/** The answer about `request`:  with what its session is doing, while it's under way (epic `editor` I138). */
function answerFor(starter: ClaudeStarter, request: SPACES.ChangeRequest): SPACES.ChangeAnswer {
  const progress = starter.progressOf(request)
  return {
    ...request,
    listening: starter.inbox.isListening(),
    hasClaude: starter.hasClaude,
    ...(progress ? { progress } : {})
  }
}

/** The folder of `request`'s project, on this machine:  where its session starts, and may edit. */
function projectFolderOf(request: SPACES.ChangeRequest): string {
  return SP.SpellLocation.getProjectLocation(request.projectId).serverPath
}
