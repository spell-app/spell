---
name: back
description: Focus mode off:  each running epic session posts its own status in its window (waiting on you first, merged, running);  idle epics with news listed here.  Use for `/back` after `/focus`.
---

# /back

In Codex:  each step that needs a Claude Code tool says what Codex does instead, in a line like this one
(the long form:  `epic guide claude-only-tools`).

The end of focus mode ([the focus skill](../focus/SKILL.md);  epic `epic-engine` T93).
The person wants what happened while they were away, and each epic's status in that epic's own window
(2026-11-17:  "/back should show the status in each session's window").
- Typed in ANY session.

## Steps

1. `epic focus off`.
   - It ends focus mode, keeping its start and end, and prints:
     - a `TELL:` line for each running epic session (`to 🚧 seo:  /back:  ...`)
     - `this session:  <epic>` when THIS session is an epic's
     - `NO SESSION:`, each epic with news and nobody running it, one line (`seo:  2 waiting on you, 3 merged`)
   - "focus mode isn't on" (exit 1):  say so in one line, and stop.
2. Send each `TELL:` line, as is, to the session it names:  `SendMessage`, `to` its address, one each.
   - In Codex:  Codex can't message another session:  print each line for the person to paste into it.
   - Each session then posts its own status in its own window ([the epic skill](../epic/SKILL.md), "Focus mode").
3. Reply, short:
   - this session an epic's:  ITS status first, as each told session posts its own (below)
   - then one line per told epic:  "<epic>:  told", with its one line from `epic focus summary` (no epic:  one
     line each for every epic with news)
   - then the `NO SESSION:` epics, each line as printed, with its epic page's link pair
     (`epic pages link <its page> --hash away`)

## A session's status (told, or this one)

`epic focus summary <epic> --since <the start>` (`--json` for the data), then the reply-header rule
([the epic skill](../epic/SKILL.md), "Style"):
- `## Waiting on you` FIRST:  every Q, J, red item, fix to review, failed test, manual test and request it lists,
  each with its link pair (`epic pages link <epic page> --hash <id>`)
- `## Merged`:  the phases done and the commits on `main` since
- `## Still running`:  phases under way, and its agents (`epic agents`)
- Nothing since:  one line, "nothing new since <time>".
- Then back to the usual rules:  questions in the modal again.
  - In Codex:  questions in the chat again.
