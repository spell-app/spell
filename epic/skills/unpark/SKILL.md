---
name: unpark
description: Pick a parked session's work back up -- find its worktree and PARKED note, offer to open the worktree's own VS Code window if this isn't it, merge the new `main` in and carry on with its next steps.  Use for `/unpark [<name>]`, or when the person says "unpark <name>" / "pick <name> back up" / "resume the parked <name>".
argument-hint: "[<name>]"
---

# /unpark

In Codex:  each step that needs a Claude Code tool says what Codex does instead, in a line like this one
(the long form:  `epic guide claude-only-tools`);  `${CLAUDE_PLUGIN_ROOT}` is the epic plugin's folder, `epic guide --root`.

The other half of `/park`.
- The steps that do the work are [the park skill](../park/SKILL.md)'s "Resume".
- This skill finds what to resume, and makes sure it happens in the right place.

## 1. What to unpark

- `$ARGUMENTS` given:  its note, `PARKED-<name>.md` at the worktree's root.
  - The worktree:  the folder `epic worktree path <name>` prints.
  - Missing:  say so, then the list below.
- None, and this session is in a worktree with a `PARKED-*.md`:  that one.
- Else `epic park list`:
  - none:  say "nothing parked", and stop
  - one:  use it, naming it in the reply
  - several:  AskUserQuestion "Which parked work?", one option per entry
    - In Codex:  ask in the chat, the entries numbered.
    - label:  `<name>`
    - description:  its `stopped` line and `state`
    - 4 per question;  more in extra questions

- Rename this session `<name>`, BEFORE anything else.
  - A typed `/unpark <name>` already was, by the repo's `UserPromptSubmit` hook
    ([prompt-gate.mjs](${CLAUDE_PLUGIN_ROOT}/hooks/prompt-gate.mjs)).
  - Else (no argument, or plain words):  `epic session title --force "🚧 <name>"`.
    It lands on the next prompt, or when the session opens in its new window.
    - In Codex:  no session title:  skip the rename.

## 2. Parked by a session that's still open

Another session still has it open, by `epic worktree status <name>`:
- a session in its `sessions` with `running: true`, other than this one

Then AskUserQuestion:
- In Codex:  Codex can't message another session:
  say it's open there, and print `/unpark <name>` for the person to type into it;  or unpark here.

- "Tell it to unpark (Recommended)":  `SendMessage` to it:  "Run `/unpark <name>` (asked by `<this session>`)."
  - Then one line, and stop.
  - Why:  it has the whole context;  this session only has the note.
- "Unpark here":  go on.
  Say in one line that the other session should be closed, so the two don't both edit.

## 3. The right window
In Codex:  skip the window question:
work from the worktree's folder (`cd "$(epic worktree path <name>)"`),
and print `epic window open <name>` for the person, if they want its window.

- This window:  `epic window which`, its `workspace` line.
- `<name>`'s window file:  `$(epic config windowsFolder)/ongoing/<name>.code-workspace`.
- Different (or no window file):  `epic window should-stay` first.
  - Then AskUserQuestion "This window isn't `<name>`'s.  Open it in a new window?".
    - Its reasons in the question.
    - The option it recommends first, with "(Recommended)"
      ([the isolate skill](../isolate/SKILL.md), "Start", step 2b).
  - "Open new window":
    1. not yet in the worktree:  `EnterWorktree` with `name: "<name>"`
       - never its `path`:  outside `.claude/worktrees/`, Claude Code asks the person every time (epic `epic-engine` P16)
    2. both from the worktree's root, as [the isolate skill](../isolate/SKILL.md)'s "Start", steps 4-5:
       - `epic window open <name>` (`--pkg <pkg>` when this isn't a package window)
       - then `epic window handoff <name>`
       - The session moves there when this turn ends.
  - "Stay in this window":  step 1, then `epic window stay <name>` (the window titled `⎇ <name>`, tinted).
- Same:  `EnterWorktree` with `name: "<name>"` if not in it yet, and go on.
  - In Codex:  `cd "$(epic worktree path <name>)"` if not there yet.

## 4. Resume

Follow [the park skill](../park/SKILL.md)'s "Resume", all steps.
- Moving windows (step 3):  do it all THIS turn.
  The move happens when the turn ends, with the work already resumed.
