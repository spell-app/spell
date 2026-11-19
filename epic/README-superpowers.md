# Epics with superpowers

```text
$ claude          # opened in an epic's worktree, superpowers installed
superpowers is on:  in epic seo it stands aside for planning, worktrees and finishing.
```

_The first line of a session in an epic's worktree, with both plugins on._

If you already use [superpowers](https://github.com/obra/superpowers) (obra/superpowers, MIT), you know its loop:
brainstorm a design, write a plan file, make a worktree, build test first, finish the branch.
Epics run a loop of their own, and three of its jobs are the same jobs.
Install both and, left alone, two plugins would plan, two would make worktrees, and two would finish.

So in an epic's worktree, superpowers is told to stand aside for those three jobs, and only those.
You don't do anything for that:  epic says it, in the places below.
Setting epics up first:  [Try it](https://github.com/spell-app/spell/blob/main/README-epics.md#try-it).
Everything it does INSIDE a piece of work, test first, debugging, proof before done, is welcome.

## What each one does

| | superpowers | epic |
| --- | --- | --- |
| the plan | a design doc and a plan file, committed under `docs/superpowers/` | the epic page:  an Overview you accept, then phases, each with a build plan, accepted in one press |
| questions | asked in the chat, one at a time | written on the page, with options, costs and a recommendation;  you answer when you have time |
| the worktree | its `using-git-worktrees` skill, then an install | `/epic <name>` makes it beside your repo, and runs your repo's own install command |
| the build | a subagent per task, test first | named background agents, a phase at a time, each phase committed as `P3:  Name -- ...` |
| the finish | `finishing-a-development-branch`:  merge here, push a pull request, or keep the branch | `/epic done`:  the merge or the pull request, the changelog, the worktree removed with its servers stopped |
| what stays | the branch's commits, and its plan files | the epic page, as the record, and the epic's guide |

The model in one line:  **the epic owns the plan, the worktree and the finish;  superpowers' craft skills work inside a phase.**

## Where they fit together

In an epic's worktree, never these superpowers skills:
- `brainstorming`, `writing-plans`, `executing-plans`, `subagent-driven-development`:
  no design doc or plan file in the repo;  a question goes on the page (`epic add <epic>#Q`)
- `using-git-worktrees`:  no second worktree, and no install step:
  `/epic` already ran your install command (`epic config installCommand` prints it)
- `finishing-a-development-branch`:  never a bare `git merge`, never `git worktree remove` of an epic's worktree;
  `/epic done` is the only finish

Inside a phase, DO use these:
- `test-driven-development`, where your repo wants tests first (your AGENTS.md or CLAUDE.md says so)
- `systematic-debugging`, for any bug found;  file it on the page too (`epic add <epic>#I`)
- `verification-before-completion`, before a phase closes:  the phase's Done list names each check run and what it printed

Outside an epic's worktree, superpowers runs exactly as it always does.

## How the words reach a session

superpowers has no setting to turn a skill off.
It obeys only YOUR instructions, by its own rule:
"User instructions (CLAUDE.md, AGENTS.md, GEMINI.md, etc, direct requests) take precedence over skills".
So epic says its stand-aside words where a session will read them, in up to three places:

1. **The epic skill.**  Every session that typed `/epic` has them.
2. **The session-start hook,** in an epic's worktree, on every start, `/clear` and compaction.
   It speaks whenever superpowers is turned on, in any of these layers:
   - your own settings, `~/.claude/settings.json`
   - the project's `.claude/settings.json`, which is how a team shares a plugin, or `.claude/settings.local.json`
   - the managed settings
   - `claude --plugin-dir <superpowers folder>`, read off the session's own command line
3. **Your repo's AGENTS.md,** which every session reads, a teammate's too.
   `epic init` offers to write them there when superpowers is on:

```sh
epic init --superpowers     # write them into AGENTS.md without asking
epic guide superpowers      # print the words themselves
```

- They go in a marked block, `<!-- epic:superpowers:start ... -->`, which `epic init` writes again when the words change;
  the rest of the file is yours.
- The block is committed with `epic init`'s other two files.
  `epic init --local` (just for you, nothing committed) never writes it.

The catch:  the hook can't read `--plugin-dir` on Windows, or from a folder whose path has a space in it.
Put the words in AGENTS.md there.

## What a live trial showed

The words were tried for real, in a throwaway yarn repo:
superpowers 7.0.2 loaded with `claude --plugin-dir` (never installed), and the epic plugin beside it.
About $12 of runs, mostly Opus, with Sonnet and Haiku on the install check.

| Clash | Without the words | With the words |
| --- | --- | --- |
| Who plans:  does `/epic sp-test ...` start a brainstorm? | no brainstorm:  0 superpowers skills called;  the Overview went on the page, no `docs/` folder | no brainstorm |
| The install:  does its worktree skill run `npm install` in a yarn repo? | 1 run of 4 did:  it wrote a `package-lock.json` and rewrote `yarn.lock`'s resolved line, with no hash | never:  3 of 3 with the hook's words, 3 of 3 with AGENTS.md's, 2 of 2 in an `/epic` session |
| The finish:  does it merge with bare git? | yes:  `git -C <main checkout> merge sp-test`, skipping all of `/epic done` | never:  "your epic rules say an epic only finishes through `/epic done`" |
| Does it remove the epic's worktree? | no:  it removes only worktrees it believes it made | no |

What that says:
- Typing `/epic` wins by itself:  it's a direct request, and superpowers lets those win.
- The install and the merge bite only when the words are missing, which is why they're said in three places.
- The words worked wherever they were read:  the hook's, the skill's and AGENTS.md's alike.

**Not yet tried:**  superpowers' own subagent-per-task build inside a phase, beside epic's named agents.
It isn't on either list above;  until it's tried, let epic's agents build.

## Two ideas epic took from it

Both run in every epic, superpowers installed or not.

**Proof before done.**
A phase's Done list ends with a `Checked:` line:  each check run, and what it printed.

```text
Checked:  yarn test, 1128 passed / 65 files (was 1130:  two tests merged);  yarn lint, 0 errors
```

**The plan check.**
Before a phase closes, a `plan-check` agent holds the phase's diff up against the build plan you accepted.
It returns two lists:  what the plan said that wasn't built, and what was built that the plan didn't say.
- It changes nothing.  A small miss is built at once;  a bigger one is filed as an issue on the page.
- A miss that drops or changes what you asked for is filed red, so you see it.
- Its instructions:  [plan-check-agent.md](plan-check/plan-check-agent.md), borrowed from superpowers' spec review.
- In Codex:  `epic plugin install --codex` installs it as a custom agent.

## Common clashes, and their fixes

| You see | Why | The fix |
| --- | --- | --- |
| "Using brainstorming to ..." in an epic's session | the session never read the words | `epic init --superpowers`, so AGENTS.md carries them;  or start the session with `/epic resume <name>` |
| a `docs/superpowers/specs/` or `plans/` file in the branch | `writing-plans` ran | delete it;  the plan belongs on the epic page |
| a `package-lock.json` in a yarn repo, `yarn.lock` rewritten | `using-git-worktrees` ran its install step | `git checkout -- yarn.lock`, delete the lock file, then `epic init --superpowers` |
| the branch merged, but no changelog and the page didn't move | `finishing-a-development-branch` merged with bare git | run `/epic done` anyway:  it finishes the page, the changelog and the worktree |
| commits named "Add subtract test" that the page doesn't list | superpowers commits per task, with its own messages | epic finds a phase's commits by their subject (`P3:  Name -- ...`);  say in the chat, or in AGENTS.md, that a phase's work is committed as `P<N>:` commits |
| code you wrote before its test, deleted | `test-driven-development` deletes untested code, by design | say in AGENTS.md whether your repo wants tests first;  it's your call |
| about 65 lines of "EXTREMELY IMPORTANT" text in every session | superpowers' session-start text | harmless;  it's how superpowers works |
| its brainstorming companion loads a logo from its maker's site | it reports the version in use | set `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` |

## Still to come

- 🌱 Writing a phase's build plan out as a superpowers plan file, for people who want both.
- 🌱 Reading a superpowers design doc in as a new epic's kickoff.

Both are open todos on the plugin's own epic page.

## See also

- [README-epics.md](https://github.com/spell-app/spell/blob/main/README-epics.md):  what an epic is, and the one command to set one up
- [README-setup.md](README-setup.md#2-epic-init-in-your-repo):  `epic init`'s questions, the superpowers one among them
- [README-config.md](README-config.md#your-settings):  the settings layers the hook reads
- [README-skills.md](README-skills.md):  every skill and hook, the session-start one among them
