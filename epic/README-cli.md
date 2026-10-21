# The `epic` command

`epic` edits the one shared epic page from any checkout, runs the review inbox,
and drives the worktrees, windows and servers an epic works in.
The skills run it for the agent;  you can run it yourself, from any folder in the repo.

- It's on every Claude session's `PATH` while the plugin is on, and on yours once you link it
  ([README-adopting.md](README-adopting.md), step 3).
- There's no build step:  it runs spell-epic's source through `tsx`, so an edit is live at once.
- It loads no spell, so it starts in a fraction of a second:  `epic summary` takes about 0.4 seconds.
- Every verb runs on the caller's checkout:  a worktree's, when run in one.
  Every page verb edits the ONE shared page, whichever checkout it's run from.

```sh
epic summary readme
# READMEs
#   [x] P1 · Map and Outlines  (3h)
#   [x] P2 · Kit Pages  (3-4h)
#   ...
#   [~] P6 · spell-epic Pages  (2-3h)
#   [ ] P8 · Cross-links and Pictures  (2h)
# estimate:  23h-29h in all, 7h-8h left
# next:  P8 · Cross-links and Pictures
# open judgements:
#   - J3  README-cli: setup written to the end state, today's spelling folded
```

## Naming what a verb acts on

A verb takes an ADDRESS:  an epic's name, then `#` and an id for one thing on its page.

```text
seo                 the epic's page, epics/seo/seo.plan.html
seo#J3              an item:  J3 (a comment on the page, seo#M3, too;  m3, cm3 read the same)
seo#P3              a phase:  P3, or by its id, seo#p-epic-migrate;  phase, updated and file take its name
                    too:  seo#epic-migrate, "seo#Epic Migrate"
seo#J               a new item of that kind, for add:  epic add seo#J "Title"
SAGA:/epics         a saga's page, sagas/epics/epics.saga.html:  epic add SAGA:/epics#T "Title"
guides/x.html#M3    a comment on a docs page, for epic comments (and a page note, guides/x.html#n3)
```

- An id always goes after the `#`, never as a word of its own:
  `epic close seo J3` is refused, and the message spells it right.
- The short address `SAGA:/<saga>/<epic>#<id>` names an item through its saga.
  You can type it in chat, and `epic pages open` and `link` take it.
- `epic --help` lists every verb.
- A verb's usage and an example:  `epic <verb> --help`, or `epic help <verb>`.
  A group's verbs too:  `epic ask new --help`.
- `epic --version` says which code runs:  its commit, branch and checkout.

## Requests from other sessions

What `/send` files, and where it goes.

| Verb | What it does |
| --- | --- |
| `epic send [<epic>] --text "..."` | sends an epic a request:  your words, screenshots and what the session was looking at;  no epic:  the tooling's |
| `epic requests <epic>` | lists every request sent to an epic, and where each one went |
| `epic file <epic>#P3 <rN>` | files a request into a phase:  its words and screenshots into the phase's Requests field |
| `epic file <epic> <rN> "where it went"` | marks a request with no phase:  "dropped:  done in P3" |
| `epic home [<epic>]` | prints the epic that tooling requests go to;  with an epic, sets it |
| `epic merge <epic>` | puts a standing epic's phase onto `main` at once, fast-forward only;  run in the main checkout |

## Making and reading epic pages

| Verb | What it does |
| --- | --- |
| `epic new <epic>` | makes an epic page from the template;  `--future`:  an idea for later;  `--saga`:  the saga it serves;  `--prompt`:  the kickoff prompt |
| `epic list` | lists every epic:  in progress, future or done, where it runs, items not reviewed |
| `epic summary <epic>` | prints an epic's phases, the next one, and its open questions, issues, caveats and todos |
| `epic summaries` | prints `summary --json` for each page, worktrees' too:  what `/epics` reads |
| `epic items <epic>` | prints what a review walks:  sections, counts, items, the queue |
| `epic docs <epic>` | lists the docs an epic wrote besides its page, and its changelog entry:  what `/docs-check` reads |
| `epic decisions <epic>` | prints what a page settled:  phases' Done and Update notes, items' answers |
| `epic open <epic>` | shows an epic's page in VS Code's side bar:  Epic Docs, or with `--review` the Review tab |
| `epic check <epic>` | checks ids, `#id` links, phases and parts, then the page's links, then draws it in a headless browser |

## Phases

| Verb | What it does |
| --- | --- |
| `epic add-phase <epic> "Short Name"` | adds a phase, with what's wrong (`--symptom`) and what changes (`--changes`);  `--before N` inserts it as P*N* |
| `epic update <epic>#P3` | sets a phase's fields (`--goal`, `--estimate` ...), an item's, or the page's flags (`--standing`) |
| `epic updated <epic>#P3 "<p>...</p>"` | records a change to a phase's plan:  an Update block at the end of its description |
| `epic phase <epic>#P3 todo \| active \| done` | sets a phase's status;  `done --done "<ul>..."` writes what was built |
| `epic commit <epic>#P3 <sha> "..."` | lists a commit under a phase or an item |
| `epic commits <epic> --backfill` | finds every phase and item commit in the history, and lists the missing ones |

## Items

| Verb | What it does |
| --- | --- |
| `epic add <epic>#J "Title"` | adds an item, and prints its id:  `J` judgement call, `Q` question, `I` issue, `C` caveat, `T` todo, `V` test, `D` a question born answered |
| `epic calm <epic>#J3` | marks calls or issues not urgent (yellow), as clicking the chip does;  `--loud`:  red again |
| `epic decide <epic>#Q3 "answer"` | answers a question, writing the answer into it;  `--option B` ticks the chosen option |
| `epic choose <epic>#J3 B` | records an option you settled in conversation, on any item, as a pick on the page would |
| `epic close <epic>#I3` | closes an item:  done, never deleted |
| `epic reopen <epic>#I3` | opens a closed or canceled item again |
| `epic cancel <epic>#T3 ["why"]` | strikes an item made moot by another decision |
| `epic details <epic>#Q3 --file <html>` | writes an agent's details or reply into an item;  `--append` adds a reply, `--more` a More Details card |
| `epic status <epic>#J3 underway "..."` | puts the agent's status card on an item:  `underway` (the spinner), `done`, or `noted` |
| `epic restore <epic>#Q3` | puts earlier text, from git, into an item's Original Discussion |
| `epic review <epic>#J3 ["outcome"]` | marks an item reviewed today;  the outcome goes in the log |
| `epic defer <epic>#J3` | puts an item off:  dated, still not reviewed |
| `epic queue <epic>#T3 "work"` | records work a review decided on, waiting to be done |
| `epic unqueue <epic>#T3` | takes it off that list:  started, or dropped |

- A test takes its fields as it's added, and optionally `--example shot.png` and `--if-not`:

  ```sh
  epic add seo#V "The sitemap lists every page" --step "Open /sitemap.xml" --should "Every guide is in it"
  ```

## The review inbox

The marks you send from a page, and how a review session takes them:
[README-pages.md](README-pages.md), "A review round".

| Verb | What it does |
| --- | --- |
| `epic inbox <epic>` | prints what you sent from the page:  requests, marks, comments |
| `epic inbox <epic> listen` / `unlisten` | this session is reviewing the page, or has stopped:  the page stops (or starts) saying nobody is |
| `epic inbox <epic> wait` | waits, in the background, until there's work;  prints it and exits, which wakes the session |
| `epic inbox <epic> apply` | applies the sent approvals, picks, todos and test answers;  `--all`:  unsent ones too |
| `epic inbox <epic>#J3 working on \| off` | turns the page's spinner on an item (or a comment) on or off |
| `epic inbox <epic>#J3 done` | an agent finished the item:  its mark and spinner go |
| `epic inbox <epic>#J3 clear` | drops an item's marks:  a revisit talked over |
| `epic test <epic>[#V3]` | opens your test run in the Review tab, one test at a time;  `--list`:  the open tests;  `--all`:  every epic's |

## Log and upkeep

| Verb | What it does |
| --- | --- |
| `epic log <epic> "text"` | adds a timestamped line to the page's log |
| `epic prompt <epic> "text"` | sets the kickoff prompt quoted in the Overview;  `""` removes it |
| `epic bedtime <epic> start "P3-P6"` / `done "summary"` | turns bedtime mode on for an overnight run, then off |
| `epic overnight <epic> remove` | removes an older page's Overnight report section, once read |
| `epic backfill <epic> \| --all` | marks items reviewed that past sessions show you went through;  a dry run unless `--apply` |
| `epic convert` | rewrites pages from the old markup into `<epic-*>` markup, into `--out` only |
| `epic split <epic>` / `join <epic>` | stores a page as a skeleton plus part files, or puts it back in one file;  `split --done`:  every finished epic |
| `epic migrate [--all]` | brings pages up to today's markup, every step of their kind, oldest first;  safe to run again |

- After a change to the page markup:
  - `epic migrate --all --dry-run` before merging
  - then `epic migrate --all --notify` once it's on `main`
  - idle epics are migrated, and each running one is printed as a `TELL:` line for its session

## Sagas

| Verb | What it does |
| --- | --- |
| `epic saga list` | lists the sagas in order, each with its epics and guide count |
| `epic saga set <epic> <saga>` | sets the saga an epic serves;  `--none`:  no saga |
| `epic saga new <id> "Title" --purpose "..."` | adds a saga, last or `--after <id>` |
| `epic saga move <id> --before <id>` | moves a saga in the list (or `--after`) |
| `epic saga title <id> "Title"` | retitles a saga |
| `epic saga rename <old> <new>` | renames a saga's id;  pages, folders and `SAGA:/` addresses follow |
| `epic saga page <id>` | makes a saga's page from the template;  `--force` remakes it |

## Worktrees, sessions and parked work

| Verb | What it does |
| --- | --- |
| `epic worktree list` | lists every running session and the worktree, branch and folder it works in, then the idle worktrees |
| `epic worktree status <name>` | prints, as JSON, where a worktree, branch, epic page or session of that name stands |
| `epic worktree path <name>` | prints a worktree's folder, or where a new one would go |
| `epic worktree move <name> \| --idle` | moves worktrees from the old place inside the repo to beside it |
| `epic worktree remove <name>` | removes a worktree, its page and Vite servers stopped FIRST;  not its branch |
| `epic worktree repos [<epic>]` | each repo's checkout in an epic's worktree:  its branch, what's uncommitted, how far ahead and behind |
| `epic worktree merge-main` | merges `main` into this checkout's branch, regenerating the generated files both sides changed |
| `epic session list [words]` | lists this repo's saved Claude sessions, newest first |
| `epic session find <name>` | finds the sessions titled `<name>`, or that worked in worktree `<name>` |
| `epic session open <id>` | opens a session in the VS Code Claude panel:  in the window it runs in, else this one |
| `epic session title [<title>]` | prints this session's title, or queues a new one for its next prompt |
| `epic session done [<name>]` | marks finished work's sessions ✅ |
| `epic session icons` | gives every named session the icon its work's state calls for:  🚧 📅 ✅ 🚨 ⏸️ |
| `epic session window` | prints the VS Code window id a process runs in |
| `epic session transcript <id>` | prints another session's prompts, last reply and the question it's waiting on |
| `epic park list` | prints, as JSON, every parked worktree's PARKED note |
| `epic park candidates` | prints what `/wait-for ?` offers:  unfinished worktrees and epics, running sessions |
| `epic park wait <name>` | waits until `<name>` finishes, then prints its status |
| `epic stock` | takes stock:  worktrees, branches, sessions, parked work, plans;  in process, hung or parked, dead |

- Never a bare `git worktree remove`:  it leaves the worktree's servers running, and nothing else ever stops them.
- Never a bare `git merge main` either:
  `epic worktree merge-main` rebuilds generated files instead of line-merging them.

## Shared content

The content folder is a git repo of its own, beside the checkout;  every checkout reads the pages from there.

| Verb | What it does |
| --- | --- |
| `epic shared status` | prints each checkout's links, and the content folder's uncommitted files and last commit |
| `epic shared init` | creates the content folder's repo;  `--import` copies this checkout's folders in |
| `epic shared link` | links this checkout's shared folders in (`--all`:  every checkout's) |
| `epic shared commit` | commits whatever changed in the content folder, one commit per epic, guide or folder:  the turn-end hook runs it |
| `epic shared migrate` | moves a worktree cut before the content folder existed onto it |
| `epic shared rename <new>` | renames the content folder, leaves a link at the old name, and rewrites what names it;  `--dry-run` first |
| `epic shared repair` | moves pages a branch left in old places into the content folder, fixes their links, then links |

## Windows and the page servers

| Verb | What it does |
| --- | --- |
| `epic window init` | writes each missing window file, and brings every window file up to date |
| `epic window open <name>` | opens a worktree's window from its file;  `--color <look>`;  `--no-open`:  only writes the file |
| `epic window close <name>` | closes that window and deletes its file |
| `epic window launch <name>` | wakes an epic:  its running session, else a NEW session in its window, opening it if needed |
| `epic window handoff <name>` | moves this session to `<name>`'s window when this turn ends (`resume` is the move itself, run by the hook) |
| `epic window stay <name>` / `stay --end` | a session staying in this window for a worktree:  titles and tints the window, then puts both back |
| `epic window stay-check` | recommends staying in this window or moving to a new one, and why |
| `epic window color [<look>]` | gives this window a look;  no look:  lists the twelve |
| `epic window which` | prints this session's window:  its process, window file and folders |
| `epic window show <page>` | shows a page in the window's side bar;  `--review`:  the Review tab |
| `epic window reload-view` | rebuilds a side-bar view from scratch, at the page it shows |
| `epic window add` / `remove <folder>` | adds a folder to the window, or removes it again:  never a worktree's |
| `epic window move` | carries the window files once from an old folder in the main checkout to the windows folder |
| `epic server <verb>` | this checkout's page server:  `serve`, `start` (`--all`:  every web server), `ensure`, `stop`, `status`, `url <file>`, `prune` |
| `epic hub <verb>` | the machine's ONE epic server:  `serve`, `start`, `ensure`, `stop`, `status`, `url <file>` |
| `epic repo <verb>` | the repos the epic server serves:  `add [<checkout>] [--default]`, `list`, `remove`, `default` |
| `epic pages index` | writes the docs' home page cards and each area's list page (Epics, Guides, Sagas ...) |
| `epic pages update` | checks the docs pages against their template:  sections, links, the engine's assets |
| `epic pages new <template> <page>` | makes a page from a template, at the right depth, and lists it on its area's page |
| `epic pages template [<name>]` | prints where a template is:  the repo's own first, then spell-epic's |
| `epic pages open <page>` | shows a page in the browser, or in VS Code's side bar (`--vs`;  `--review`) |
| `epic pages link <page>` | prints a page's links for a reply:  the side bar's and the browser's;  `--show` shows it too |
| `epic pages fuss` | checks the writing of pages and comments against the house rules |
| `epic pages offline` | lists what the docs pages load from the internet, for airplane mode |

## The repo's settings

| Verb | What it does |
| --- | --- |
| `epic config [<key>]` | prints where this repo keeps its epic things, from `.epic/config.json5`:  one value, or all of them |
| `epic init` | sets a repo up for epics:  its config file, the content folder beside it, the links;  safe to run again |

- Every key, and what `epic init` writes:  [README-adopting.md](README-adopting.md).

## Pages answered on, agents, airplane mode

| Verb | What it does |
| --- | --- |
| `epic ask new <slug>` | makes a details page from the template, and prints its path;  `--epic`:  in that epic's `details/` |
| `epic ask show <page>` | shows the page in this session's Review tab;  `--wait`:  then waits |
| `epic ask wait <page>` | waits, in the background, until you send an answer, then prints it |
| `epic ask answer <page>` | prints the answer you already sent |
| `epic ask draft <page>` | prints what you've typed on the page and not sent:  run before rewriting a page you may have open |
| `epic ask list [<epic>]` | lists every details page, answered or waiting |
| `epic ask sweep` | deletes scratch details pages older than a given age;  never an epic's |
| `epic choices new <slug> --rows <file>` | makes a choice page from its rows, and prints its path |
| `epic choices show` / `wait` / `answer` / `list` | as for details pages:  shows it, waits for "Do it", prints the answer, lists them |
| `epic comments list [<epic>]` | lists the comments left on docs pages still waiting;  `--all`:  answered ones too |
| `epic comments wait` | waits until a comment starts waiting, then prints it |
| `epic comments gather` | gathers waiting comments into the standing feedback epic, one phase per page |
| `epic comments working <page>#M3 on \| off` | shows "Claude:  thinking…" on a comment's thread, or stops |
| `epic comments answer <page>#M3 --file <html>` | writes the answer into the comment's thread;  `--commit`:  the commit it was built in |
| `epic notes list \| answer \| done` | the older page notes, from before comments:  list, answer, mark done |
| `epic agents list` | lists the background agents running now, oldest first |
| `epic agents add <name> "<task>"` | records an agent starting, and prints its full name, `<epic>-<name>` |
| `epic agents set` / `done <name>` | sets an agent's status, or takes it off the list when it's back |
| `epic agents wait` | waits until you send an agent a note from the epic page, or none is left running |
| `epic agents told <name>` | marks your notes to the agent as passed on |
| `epic airplane status \| on \| off` | airplane mode:  whether it's on, and turning it on or off |
| `epic airplane check [--fix]` | checks the laptop is ready to fly, fixing what it can |
| `epic airplane inbox` | lists everything left on the pages while flying:  what `/airplane land` works through |

## Old spellings

spell-app hands its older spellings on to `epic` word for word, so old scripts and skills keep running.

| Old spelling | Now |
| --- | --- |
| `spell dev plan-doc <verb> ...` | `epic <verb> ...` |
| `spell dev details ...` | `epic ask ...` |
| `spell dev docs ...` | `epic pages ...` |
| `spell dev worktree`, `window`, `session`, `park`, `stock`, `shared`, `choices`, `comments`, `notes`, `agents`, `airplane` | `epic` and the same word |
| `spell epic <verb> ...` | `epic <verb> ...` |

- Which `epic` they run:  the nearest checkout's own, `spell-epic/bin/epic`.
  Else the one on your `PATH`.
- spell-epic's own `yarn epic` runs it too.
- `epic add-request` is `epic file`'s old name, still accepted.

<details>
<summary>The cheat sheet the epic skill hands its agents</summary>

The `/epic` skill pastes this into every background agent's prompt.
It's copied here as [the epic skill](skills/epic/SKILL.md) has it ("Cheat sheet"),
with "you" for the reviewer.

```text
new <name> [--title "Title"] [--prompt "..." | --prompt-file f] [--future]
                                                    create from the template, update the docs' home page;  --future:  a
                                                    future epic (9.);  new on a future epic's doc plans it (promoted)
add-phase <name> "Short Name" --symptom .. --changes .. [--goal ..] [--files ..] [--verify ..] [--estimate 2h]
          [--before N]                              --before:  inserted as PN;  the to-do phases from N move down
update <name>#P<N> [--symptom ..] [--changes ..] [--goal ..] [--files ..] [--verify ..]   set ("" removes) fields
updated <name>#P<N> "<p>what changed</p>" [--summary ".."]   phase N's plan changed:  <epic-update>, after Goal
file <name>#P<N> <rN>                               a request into phase N's Requests field, marked filed there
file <name> <rN> "where it went"                    a request with no phase:  only marked, saying where it went
update <name>#P<N> --estimate "1-2h"                change a phase's estimate;  the Overview's total follows
phase <name>#P<N> todo|active|done [--no-open]      done drops UPDATE labels / prose updates;  reloads the tab
add <name>#Q|#J|#C|#I|#T|#V|#D "title" [--details "<p>html</p>"] [--calm]   prints the id (C3)
add <name>#V "title" --step .. --should .. [--example <png> | ".."] [--if-not ..]   a test, for your test run
test <name>[#V3] [--list [--json]]  /  test --all   your test run in the Review tab (?test=1);  --list:  open tests
calm <name>#<id> [<id>...] [--loud]                 calls / issues not urgent (yellow);  --loud:  red again
decide <name>#<Q id> "answer" [--details html]      answer a question, INTO it:  prints its id (Q3)
choose <name>#<id> <letter> ["outcome"] [--set N]   an option you settled in words, any item:  as your pick (latest set)
commit <name>#P<N> | <name>#<id>  <sha> "..."       list a commit under a phase or an item
commits <name> --backfill                           every phase / item commit (`P3:`, `<name> I3:`), once
update <name> --standing [on|off]                   a standing epic:  each phase merges on its own, never done
close <name>#<id>  /  reopen <name>#<id>            close (done) / open again, never delete
cancel <name>#<id> ["why"]                          made moot by another decision:  struck;  reopen undoes it
log <name> "text"                                   timestamped line in the doc's log
bedtime <name> start "P3-P6" | done "summary"       bedtime mode on / off:  the run's changes stay green (`/bedtime`)
overnight <name> remove                             an older doc's Overnight report (before 2026-10-05), once read
prompt <name> "text" | --file f                     set the prompt quoted in the Overview
migrate [<kind>] [<name>... | --all] [--file f] [--step s] [--dry-run] [--notify] [--list]
                                                    pages up to today's markup, every step of their kind, oldest
                                                    first, safe to run again;  alone:  every kind, every page;
                                                    --notify:  running epics told (TELL lines), idle ones migrated
summary <name> [--json]                             phases, next phase, open questions/issues/caveats/todos
check <name> [--no-browser]                         ids, links, phases, then the browser check
open <name> --review                                show in the side bar's Review tab
review <name>#<id> ["outcome"]                      mark reviewed today (outcome to the log)
defer <name>#<id>                                   deferred:  dated, still not reviewed
queue <name>#<id> "work"  /  unqueue <name>#<id>    work a review decided on, waiting  /  started or dropped
items <name> --section s --spec <file>              a review's item picker, as a details page spec
items <name> [--section s] [--filter unreviewed|open|reviewed|queued|all] [--json]
                                                    where reviews stand, the to-do list, sections and items
list [--json]                                       every epic once:  status, where it runs, not reviewed / all
backfill <name> | --all [--apply]                   one-off:  mark what past sessions show you went through
```

- Every command edits the epic's ONE shared page, wherever it's called from.

</details>

<details>
<summary>Exit codes</summary>

| Code | Means |
| --- | --- |
| 0 | done;  for a `wait`, there's work, and it's printed |
| 1 | an unknown verb (the verbs are listed);  a check that failed (`server status` with no server, `airplane check` not ready, `ask answer` with no answer);  `agents add` for one already running |
| 2 | a usage error, such as an id written without its `#`;  a `wait` that timed out:  run it again |
| 3 | `park wait` with nothing by that name;  `agents wait` with no agent left running |

- `inbox wait` gives up after 55 minutes.
- `park wait`, `ask wait`, `choices wait` and `agents wait` take `--max` or a timeout of their own:
  `--help` says.

</details>

<details>
<summary>Until repo-split P13 lands:  where the command's code is today</summary>

- The command's code is in [src/command/](src/command/) today, run by [bin/epic](bin/epic):
  its groups in [epicGroups.ts](src/command/epicGroups.ts), its verbs in [EpicProgram.ts](src/command/EpicProgram.ts).
  After P13 it's in spell-epic's `cli/`;  the command's name and verbs don't change.
- `spell docs <verb>` is `spell dev docs <verb>` today, handed to `epic pages <verb>`.

</details>

## See also

- [README.md](README.md):  spell-epic's front page
- [README-skills.md](README-skills.md):  the skills that run these verbs for you
- [README-pages.md](README-pages.md):  what the verbs write, and the review round
- [README-adopting.md](README-adopting.md):  `epic init`, `epic repo add` and `epic hub` in another repo
- [The kit's README](../README.md):  Spell as a whole
- [The kit's README-cli.md](../README-cli.md):  the `spell` command line, with `epic` beside it
- Also beside it:  [README-vscode.md](README-vscode.md)
