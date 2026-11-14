import { describe, expect, it } from "vite-plus/test"

import { SessionLog } from "spell/app/spaces/server/node/changes/SessionLog"

/**
 * Reading what a started Claude session has streamed so far (epic `editor` I138).
 * - The lines are a real run's (a scratch project, 2026-11-14), cut down to what's read.
 */

const SPELL = "/usr/local/bin/node /kit/bin/spell.mjs"

/** The session's events, in the order a real run streamed them. */
const STARTED = [
  { type: "system", subtype: "session_title_changed", title: "Change This c1" },
  { type: "system", subtype: "init", cwd: "/disk/Proj", tools: ["Bash", "Edit", "Glob", "Grep", "Read", "Write"] }
]
const TOOK = tool("Bash", { command: `${SPELL} app changes take c1`, description: "Fetch the requested change" })
const READ = tool("Read", { file_path: "/disk/Proj/Solitaire.spell" })
const GREPPED = tool("Grep", { pattern: "Score" })
const EDITED = tool("Edit", { file_path: "/disk/Proj/Solitaire.spell", old_string: "Score: ", new_string: "Score " })
const DONE = tool("Bash", { command: `${SPELL} app changes done c1 "removed the colon"` })
const RESULT = { type: "result", subtype: "success", is_error: false, result: "I removed the colon after Score." }

describe("SessionLog.progress", () => {
  it("is starting until the session has taken its request", () => {
    expect(logOf().progress).toEqual({ step: "starting" })
    expect(logOf(...STARTED).progress).toEqual({ step: "starting" })
  })

  it("follows the last tool it used:  the request, then a file read, then a file edited, then done", () => {
    expect(logOf(...STARTED, TOOK).progress).toEqual({ step: "reading request" })
    expect(logOf(...STARTED, TOOK, READ).progress).toEqual({ step: "reading", file: "Solitaire.spell" })
    expect(logOf(...STARTED, TOOK, READ, EDITED).progress).toEqual({ step: "editing", file: "Solitaire.spell" })
    expect(logOf(...STARTED, TOOK, READ, EDITED, DONE).progress).toEqual({ step: "finishing" })
  })

  it("leaves the step as it was for a tool that says nothing new", () => {
    expect(logOf(...STARTED, TOOK, READ, GREPPED).progress).toEqual({ step: "reading", file: "Solitaire.spell" })
    expect(logOf(...STARTED, TOOK, tool("Bash", { command: "ls" })).progress).toEqual({ step: "reading request" })
  })

  it("passes over lines that aren't events, and a half-written last line", () => {
    const text = [JSON.stringify(TOOK), "Warning:  something", JSON.stringify(EDITED).slice(0, 40)].join("\n")
    expect(new SessionLog(text).progress).toEqual({ step: "reading request" })
  })
})

describe("SessionLog.summary", () => {
  it("is the session's result", () => {
    expect(logOf(...STARTED, TOOK, EDITED, DONE, RESULT).summary).toBe("I removed the colon after Score.")
  })

  it("is the last plain line when it has no result:  an error before it began", () => {
    expect(new SessionLog("Thinking...\nError:  not logged in\n").summary).toBe("Error:  not logged in")
    expect(new SessionLog(`${JSON.stringify(STARTED[0])}\nError:  not logged in\n`).summary).toBe(
      "Error:  not logged in"
    )
  })

  it("is nothing for a log with neither", () => {
    expect(logOf(...STARTED, TOOK).summary).toBeUndefined()
    expect(SessionLog.of("/nowhere/c1.log").summary).toBeUndefined()
  })

  it("is at most 300 characters", () => {
    expect(logOf({ ...RESULT, result: "x".repeat(400) }).summary).toHaveLength(300)
  })
})

/** A log of `events`, one a line. */
function logOf(...events: object[]): SessionLog {
  return new SessionLog(events.map((event) => JSON.stringify(event) + "\n").join(""))
}

/** The session asking for `name`, with `input`. */
function tool(name: string, input: Record<string, unknown>): object {
  return { type: "assistant", message: { content: [{ type: "tool_use", name, input }] } }
}
