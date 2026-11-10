# Epics:  plan on a page, build with your coding agent

An epic is one piece of work a coding agent does for you, start to finish, with its plan on a page that stays true.

You start one by typing a line in Claude Code:

```text
/epic seo make the docs findable
```

From that line, the agent:
- makes a git branch and a worktree of its own, so your checkout isn't touched until you merge
- writes an EPIC PAGE, open beside your code in VS Code:  what it understood, what it needs to ask you, its plan in phases
- keeps that page current as it builds:  each phase done, each choice it made without you, each problem it found

![An epic page in a browser:  a toolbar of sections with counts, then a list of issues, each with its id and buttons to answer it](epic/docs/images/epic-page.png)

_An epic page:  everything on it has a short id, and buttons for answering it._

## Contents

- On this page:  [why you'd want it](#why-youd-want-it) · [how you'll use it](#how-youll-use-it) · [try it](#try-it)
- [Setting it up](epic/README-setup.md):  every step, on GitHub or **[GitLab](epic/README-setup.md#on-gitlab)**,
  and [when main takes only pull or merge requests](epic/README-setup.md#when-main-takes-only-pull-requests)
- [With a team, or Codex](epic/README-teams.md):  joining, syncing, two people on one page
- [Settings, and what's still rough](epic/README-config.md):  the config file, worktrees, the local server
- [The method, in depth](epic/README.md):  how a page works, and why

## Why you'd want it

If you've used a coding agent on anything bigger than a small fix, you've met these:
- **The reasoning scrolls away.**
  A ticket says what to do, and goes stale the day the work starts.
  A pull request shows what was done, not the decisions behind it.
  The chat in between is gone by morning.
  An epic page holds all three, during the work and after the merge.
- **The agent guesses, or sits waiting for you.**
  Here a question goes on the page, with its options, what each would cost, and the one the agent recommends.
  You answer when you have time.
- **A new session starts from nothing.**
  `/epic resume seo` picks up from the page, not from a summary of a chat.
- **Two agents trip over each other.**
  Each epic has its own branch, worktree and VS Code window, so several can run at once.

What it costs:
- every worktree is another checkout, with an install of its own
- a page can collect more than you'll read:  the work is only as reviewed as you make it

## How you'll use it

1. **Ask.**
   In a Claude Code session in your repo:  `/epic <name> <what to plan>`.
   The page opens in VS Code's right side bar, and fills as the agent reads your code.
2. **Answer its questions, on the page.**
   Press Choose on the option you want, or leave a note.
3. **Agree the plan.**
   Accept Overview once it has understood the job;  it then writes the phases, and you press Accept Phases.
4. **Let it build.**
   It works through the phases in its worktree and commits each one.
   You can go and do something else, or start another epic.
5. **Review whenever you like.**
   Every item has buttons:  Approve, Revisit with a note, Do this.
   Any paragraph takes a comment.
   Press Send, or wait two minutes for it to send itself, and the agent takes your marks.
6. **Finish.**
   `/epic done` merges the branch, or opens a pull or merge request.
   The worktree goes;  the page stays, as the record.

The pages are plain HTML files, in a git repo of their own beside your code, so a whole team can share them.
A question or a bug has an id you can say out loud:  "approve J3" works in the chat.

## Try it

You need Claude Code, VS Code, git, Node 24.11 or later, and your code host's command, logged in.

**On GitHub:**

```sh
brew install gh
gh auth login
```

**On GitLab** ([what's different](epic/README-setup.md#on-gitlab)):

```sh
brew install glab
glab auth login                          # your own GitLab:  glab auth login --hostname git.acme.com
```

Then in your repo, a git repo with at least one commit:

```sh
npx spell@next epic init                 # a self-hosted GitLab whose address doesn't say so:  add --host gitlab
```

It asks your name and a colour, installs the Claude Code plugin and the VS Code extension,
makes the shared repo for the pages, and starts a small local server that shows them.
It leaves one config file and a block in `.gitignore` in your repo.

Every step, and what each question means:  [Setting epics up](epic/README-setup.md).

Three things to know before you start:
- **Sharing works with GitHub and GitLab.**
  `epic init` makes the team's epic repo with the host's own command:  `gh`, or `glab` ([On GitLab](epic/README-setup.md#on-gitlab)).
  Bitbucket or a bare git server work too, but you make the repo by hand and pass its address
  (`epic init --remote <address>`).
- **Claude Code first, Codex beside it.**
  The skills run in both, from one copy;  the moves between worktrees and windows are Claude Code's,
  in VS Code or Cursor, on macOS, Linux or Windows (Cursor, Windows and Linux not yet tried by a person).
  Any other agent works an epic from `epic guide` and its own end-of-turn step:
  [With Codex](epic/README-teams.md#with-codex).
- **It has run end to end outside Spell once**, in a throwaway repo:
  `epic init`, a saga, an epic page with a phase, a round through the review inbox, the pages on the epic server,
  `/isolate done`'s merge, and the worktree removed after it.
  - The rough edges are listed, not hidden:  [what's still Spell-shaped](epic/README-config.md#whats-still-spell-shaped).

## See also

- [epic/README-setup.md](epic/README-setup.md):  every step of setting a repo up
- [epic/README-pages.md](epic/README-pages.md):  a review round, on the page
- [epic/README-skills.md](epic/README-skills.md):  the commands you type in Claude Code
- [epic/README-cli.md](epic/README-cli.md):  every `epic` verb
