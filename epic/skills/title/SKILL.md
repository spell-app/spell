---
name: title
description: Show or change THIS session's title -- the name in the VS Code Claude panel's tab and session list -- which Claude can't set with `/rename` itself.  Use for `/title` (shows it, then offers names), `/title <title>`, or when the person says "name this session", "call this session <x>", "rename this session".
argument-hint: "[<title>]"
---

# /title

In Codex:  Claude Code only (session titles are its VS Code panel's);
a Codex session needs none:  `epic guide claude-only-tools`.

The command:  `epic session title [<title>]` ([Sessions.ts](https://github.com/spell-app/spell/blob/main/epic/src/command/Sessions.ts)).
Other skills that rename a session run the same command:  `/isolate`, `/park`, `/unpark` and `/session`.

## 1. With a title:  `/title <title>`

- `epic session title <title>`.  It checks first:
  - its tab already shows `<title>` (or it's queued):  nothing to do
    - not when Claude's own title came after `<title>` in its transcript:  the tab may show that
  - else it queues `<title>`
- Reply in one line:  "titled `<title>` (was "<old>");  shows on your next message".

## 2. Without:  `/title`

- `epic session title`:  the current title, and any title queued.
  - `*` = set by hand;  else Claude's own, or the first prompt.
  - "its tab may show ...":  Claude's own title came after it;  offer the current one again.
- Offer 3 short titles in the AskUserQuestion modal:  2-4 words, the work's name, e.g. `session tools`.
  - The current one described in the question.
  - "Other" takes a typed title.
  - Then step 1, with the pick.

## How it lands

- Claude can't run `/rename`, so:
  - the command writes `~/.claude/session-titles/<session id>`
  - the `UserPromptSubmit` hook returns it as `sessionTitle` on the person's NEXT message
    - the hook:  `~/.claude/hooks/session-title.mjs`
  - then deletes the file
  - Say so.
- NOTE:  undocumented hook output, found in CLI 2.1.287.
  If a later message shows the title didn't change:  say so, and fall back to one of these.
  - VS Code:  "rename it from the tab's context menu"
  - the terminal:  `/rename <title>`
