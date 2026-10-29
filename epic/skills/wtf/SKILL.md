---
name: wtf
description: Remind the person what's going on -- in THIS session, or (`/wtf <name>`) in the plan / isolate session named `<name>`:  the goal, where the work lives (worktree, branch), the epic page and its phase, what's done, what's running, what's waiting on them -- with live links into the epic page.  A `?` (`/wtf ?`, `/wtf <name>?`, or the person typing `wtf?`) also puts the open questions in a modal.  Use for `/wtf`, or when the person asks "where are we?", "what's going on?", "remind me what we're doing", "where is <name> at?".
argument-hint: "[<name>] [?]"
---

# /wtf

In Codex:  each step that needs a Claude Code tool says what Codex does instead, in a line like this one
(the long form:  `epic guide claude-only-tools`).

The person has lost the thread:  hand it back in one screen.
- Read-only:  change nothing, start nothing, commit nothing.
- The one exception:  relaying their answers, step 4.

## 1. Arguments

- `$ARGUMENTS` holds an optional name, and an optional `?`.
  - The `?` stands alone, or stuck to the name:  `seo?`.
- `?`, or the person typed `wtf?` without the slash:  ASK mode (step 4).
- No `<name>`:  THIS session.
- `<name>`:  the plan or isolate session of that name.
  - worktree and branch `<name>`;  its folder:  `epic worktree path <name>`
  - epic page `epics/<name>/`
  - a session renamed `<name>`
  - Nothing by that name:  say so in one line, list the names that do exist (worktrees, epic pages), and stop.

## 2. Gather (in parallel where possible)

- The story so far:
  - this session:  the conversation itself
  - `<name>`:
    - `epic session find <name>` lists its sessions, newest first.
    - `epic session transcript <id>` digests one:
      the person's prompts, its last reply, a question still waiting for an answer.
    - Several sessions:  digest the newest, mention the others.
    - Running or not:  `epic worktree list`.
  - either way:
    - The person's LAST stated intent (their words, not the plan's)
    - what's been done
    - what was asked, and not yet answered
- Where:  in the session's checkout (`git -C "$(epic worktree path <name>)"` for `<name>`):
  - `git branch --show-current`
  - `git status --short`
  - `git log --oneline main..HEAD` (a worktree), or the session's own commits (`main`)
- Epic page, if any:  the session's `/epic <name>`.
  Else the worktree's name, if `epic list` has it;  else one the session wrote to.
  - ONE shared doc, in `epics/<name>/` of every checkout (a link into the content folder).
  - A branch from before 2026-10-02 still has it under `plans/<name>/`.
  - `epic summary <name> --json`:
    phases with status, next phase, open questions / issues / todos / manual tests
  - its links:  `epic pages link <ABSOLUTE path> --hash <id>`:  the side bar link, then `• 🌐` (browser)
- A `/bedtime` run:  the summary's `bedtime` field (`epic summary`, above).
  - The phases it's running (`P3-P6`) while it goes;  `null` once it's over.
  - What it decided shows red in the doc (judgement calls, issues).
    `/epic review <name>` goes through them.
- In flight:
  - `ListAgents`:  agents this session started;  for `<name>`, whether its session is running
    - In Codex:  no `ListAgents`:  the sub-agents this session is waiting on, if any.
  - background shells, scheduled wakeups

## 3. Reply

Plain words, no jargon;  coined names defined in a few words.
- Every plan item named is a link:
  - the epic page's URL, plus its id, lower-case:  `<url>#q1`, `<url>#i3`
  - a phase:  its stable id, `<url>#p-short-name`, from `epic summary <name> --json`
    - or its number, `<url>#p2`, which lands on P2
  - text as the doc shows it:  `P2 · Short Name`, `Q1`
- Sections with nothing in them are left out.
- For `<name>`, the first line says which session:  its name, id, running / idle / waiting / not running.

1. **Goal** -- one or two sentences:  what the person asked for, in their words.
   If the work has drifted from their most recently stated intent, say how, in **bold**.
2. **Where** -- worktree and branch (or `main`), and what's uncommitted or staged.
   - Never the epic page, logs or docs pages:  shared content, committed for you.
   - The epic page, linked.
3. **Plan** -- the phases as one line each, linked, with status:  done, ACTIVE, to do.
4. **Done** -- numbered, in the order it happened, each a few words.
5. **In flight** -- agents, background jobs, wakeups:  what each is doing.
6. **Waiting on you** -- numbered (the person refers to them by number):
   - open questions (linked)
   - a modal the session is sitting on
     - In Codex:  a question this session asked in the chat and the person hasn't answered.
   - issues needing a call
   - staged work awaiting "commit?"
7. Last line:  where we are, as `/epic` says it:
   "[P1 · Short Name](<url>#p1) complete.  Next is [P2 · Short Name](<url>#p2)." or "All done".
   - Without an epic page, the same in words ("Skill edits staged.  Next is committing them.").

Not ASK mode:  stop here.

## 4. ASK mode (`?`)

- Nothing waiting on the person:  add "Nothing to answer.", and stop.
- Else, after the reply, AskUserQuestion with the questions from "Waiting on you"
  (4 per call, more calls if needed):
  - In Codex:  ask them in the chat, numbered, each question's options lettered.
  - the epic page's open questions, with their options (labels as the doc's, recommended first)
  - the session's waiting modal, as it was asked
  - "commit?", for staged work
- Answers:
  - this session:  act on them as if asked directly (`epic decide <name>#Q<n> "..."` for plan questions).
  - `<name>`:  that session owns the work, so relay, don't act.
    - `SendMessage` to it (its name from `ListAgents`), with each question and the person's answer.
      - In Codex:  Codex can't message another session:  always the block to paste, below.
    - Not running, or not in `ListAgents`:
      give the person the answers as one block to paste there, with `claude --resume <id>`.
