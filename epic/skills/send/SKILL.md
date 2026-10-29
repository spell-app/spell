---
name: send
description: Send a request to another epic instead of doing it here -- the person's words verbatim, their screenshots, what this session was looking at -- and wake that epic's session.  Use for `/send [<epic>] <text>`, and BY ITSELF whenever the person asks to change how they WORK (the epic page, comments, the Review tab, details pages, skills, hooks, windows, worktrees, `epic`) rather than this session's own work:  "fix this in the plan doc", "comment mechanism doesn't look right".
argument-hint: "[<epic>] <text>"
---

# /send

In Codex:  each step that needs a Claude Code tool says what Codex does instead, in a line like this one
(the long form:  `epic guide claude-only-tools`).

The person says what they want where they are;  it goes to the epic that owns it,
and this session carries on with its own work (epic `epic-workflow`, Owen, 2026-10-11).
- The request is written FIRST, into the epic's shared folder:  nothing is lost if that epic's session is closed.
- The epic's session turns it into a phase:  [the epic skill](../epic/SKILL.md), "12. Request".
- The command:  `epic send` ([Requests.ts](https://github.com/spell-app/spell/blob/main/epic/src/command/Requests.ts)).

## When

- `/send [<epic>] <text>`:  always.
- By itself (no `/send`):  the person asks for a change to DEV TOOLING, how they work, not what this session builds.
  - Dev tooling:  the epic page and its comments, marks and buttons;  the Review tab;  details pages;
    every skill and hook;  windows, worktrees, the page server;
    `epic`, and the repo's own dev commands (the kit's `spell`).
  - Not:  this session's OWN epic's content.
    "Fix P4's file list in the plan doc" in `🚧 python` is python's job;
    "the plan doc's comment box covers the text" is tooling.
  - Unsure which:  AskUserQuestion, "Send to `<home>`, or do it here?", saying what you took it to mean.
    - In Codex:  ask in the chat.
- NOT in the tooling home's own session (titled `🚧 <home>`):  tooling work is its own.

## Steps

1. Which epic:
   - the first word after `/send`, when `epics/<word>/<word>.plan.html` exists
   - else the tooling home:  `epic home` prints it
2. The person's words, VERBATIM, into a scratchpad file (quotes and all survive a file, not a shell string):
   - `/send`:  the text after it (and the epic's name, if given)
   - by itself:  their whole message about it
3. Screenshots:  count the images they pasted WITH this request, `--images <count>`.
   - Those in their message, or the ones just before it about the same thing.
   - `send` takes the newest ones from this session's transcript.
   - One they pasted while this session was mid-turn counts too:  it's in the transcript like any other
     (epic `epic-engine` I50).  Never describe it in words instead.
4. Context:  one or two lines the receiver needs to find it COLD.
   - What this session was looking at:
     the page and item id (`epics/python/python.plan.html#p4`), the file and line, the command that misbehaved.
   - And what this session works on (its epic or worktree).
5. Send, from the repo:

   ```sh
   epic send <epic> --file <words.md> --images <count> --context "<context>"
   ```

   - Without the plugin on:  `<kit>/epic/bin/epic send ...`.
6. Wake the receiver, as `send` printed:
   - `tell:  <name>` (its session is running):  `SendMessage` to `<name>`:
     "New request `<rN>` for epic `<epic>`, from `<this session's title>`:  <their first line>.
     Run `/epic request <epic> <rN>`'s steps (`epics/<epic>/requests/<rN>/request.md`)."
     - In Codex:  Codex can't message another session:  print that line for the person to type into it.
   - `this session is <epic>'s own`:  do it here, as [the epic skill](../epic/SKILL.md), "12. Request".
   - `no session of <epic> is running`:  run the `epic window launch ...` line it printed.
     It opens the epic's window with `/epic request <epic> <rN>` typed in:  the person presses Enter there.
   - The epic page's own Send wakes an epic the same way, from the page server (epic `epic-workflow` P16).
7. Reply ONE line, then go back to this session's own work:
   - "sent to `<epic>` as `<rN>`";  plus "its window is open:  press Enter on `/epic request ...` there", when it was.
   - NEVER do the request here as well, nor edit the tooling's files because of it.

## Never

- Stage or commit the request folder:  `epics/` is shared content, committed by the turn-end hook.
- Paraphrase the person's words in the request:  the receiver needs them as they said them.
