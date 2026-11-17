---
name: focus
description: Focus mode on:  every running epic session keeps building and merging, asking the person nothing until `/back`.  Use for `/focus [why]`, or "I need to focus on something else".
argument-hint: "[why]"
---

# /focus

In Codex:  each step that needs a Claude Code tool says what Codex does instead, in a line like this one
(the long form:  `epic guide claude-only-tools`).

The person needs to focus on something else (epic `epic-engine` T93;  2026-11-17:  "Epics should keep going on running
things that are in flight").
Every running epic keeps building, and asks them nothing, until they type `/back` ([the back skill](../back/SKILL.md)).
- Typed in ANY session:  an epic's, a worktree's, or none.
- Focus mode is ONE switch per machine (`epic focus on | off | status`,
  [FocusCommands.ts](https://github.com/spell-app/spell/blob/main/epic/src/tool/FocusCommands.ts)).
- It's bedtime mode's "no modals" by day, for every running epic at once
  ([the bedtime skill](../bedtime/SKILL.md), "4. Bedtime mode"):  no phases picked, no questions up front.

## Steps

1. `epic focus on`, with `--why "<their words>"` when they gave a reason (`/focus the demo`).
   - It records the start, and prints a `TELL:` line for each running epic session (`to 🚧 seo:  /focus:  ...`).
   - `this session:  <epic>` when THIS session is an epic's:  follow the line yourself, as the epic skill says
     ([the epic skill](../epic/SKILL.md), "Focus mode").
2. Send each `TELL:` line, as is, to the session it names:  `SendMessage`, `to` its address (`🚧 seo`), one each.
   - In Codex:  Codex can't message another session:  print each line for the person to paste, or skip it;
     a session reads `epic focus status` at its next turn's start anyway.
   - Never `epic send`:  it's a mode, not a request.
3. Reply ONE line:  "focus on:  told N sessions".
   - No question, no page, no summary.

## While it's on

- A session started meanwhile hears it from the session-start hook (`hooks/focus-notice.mjs`), and behaves too.
- `epic focus status` says whether it's on, from any session.
- The person writing in a session doesn't end it:  only `/back` does.
  Answer what they asked, in that session, and go on.
