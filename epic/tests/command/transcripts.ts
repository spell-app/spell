/**
 * Made-up Claude Code transcripts for the working-time tests (`ActiveTime`, `WorkTime`;  epic `epic-engine` P41):
 * the lines as Claude Code writes them, with only the fields those read.
 */

/** One entry of a made-up transcript, on 2026-10-25 at `at` (`HH:MM:SS`, UTC). */
export type Line = {
  at: string
  /** Owen's prompt (or an agent's task) */
  owen?: string
  /** Claude's words */
  says?: string
  /** a tool call */
  tool?: { id: string; name: string; command?: string; background?: boolean }
  /** the result of tool call `result` */
  result?: string
  /** how its run was allowed */
  permission?: { source: string; reasonType?: string }
  /** a notice that tool call `notice`'s background work finished */
  notice?: string
}

/** `lines` as a transcript's text:  one JSON line each, keys in Claude Code's order. */
export function transcript(lines: Line[]): string {
  return lines.map((line, at) => JSON.stringify(entryOf(line, at))).join("\n")
}

/** `line` as Claude Code's entry. */
function entryOf(line: Line, at: number): object {
  const timestamp = `2026-10-25T${line.at}.000Z`
  const head = { parentUuid: at ? `u${at - 1}` : null, isSidechain: false }
  // `cwd`:  where it worked, which `Sessions.named()` dates a session by
  const tail = { uuid: `u${at}`, timestamp, cwd: "/repo" }
  if (line.says !== undefined)
    return { ...head, message: { content: [{ type: "text", text: line.says }] }, type: "assistant", ...tail }
  if (line.tool) {
    const { id, name, command = "ls", background } = line.tool
    const input = { command, ...(background && { run_in_background: true }) }
    return { ...head, message: { content: [{ type: "tool_use", id, name, input }] }, type: "assistant", ...tail }
  }
  if (line.result !== undefined) {
    const content = [{ tool_use_id: line.result, type: "tool_result", content: "ok" }]
    return { ...head, type: "user", message: { content }, ...tail, permissionDecision: line.permission }
  }
  if (line.notice !== undefined) {
    const content = `<task-notification>\n<task-id>x</task-id>\n<tool-use-id>${line.notice}</tool-use-id>\n</task-notification>`
    return { ...head, type: "user", message: { content }, ...tail }
  }
  return { ...head, type: "user", message: { content: line.owen ?? "" }, ...tail }
}
