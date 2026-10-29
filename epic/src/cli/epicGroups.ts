/**
 * The verbs of `epic`'s groups (`GroupName`), for their help (epic `epic-workflow` P19), and every verb's FLAGS:
 * - `epic ask create --help` prints that verb's usage, what it does, its flags and an example
 * - `epic ask --help` lists them
 * - a verb's flags (`flags`, and `VERB_FLAGS` for the verbs of no group):  its help lists them, and `EpicProgram`
 *   refuses any other `--flag` before the verb runs (epic `coherence` P20:  `epic summary seo --jsn` printed text, and
 *   exited 0)
 *
 * - Help and that check only:  each group's tool or class still READS its own arguments, passed through verbatim
 *   (`parseVerbArgs()`).
 *   - the tools' header comments (`src/tools/`, `src/window.mjs`, the page server's `cli.ts`)
 *     and the classes' (`Worktrees`, `Sessions` ...) say the same in more words:  keep them agreeing
 *   - a flag a tool reads and its verb doesn't list here is refused:  list it
 * - A verb not listed here is refused before the tool runs (`EpicProgram`),
 *   so each list is every verb the tool has.
 * - Lean:  data only, so `epic` starts fast.
 */
export const GROUP_VERBS: Record<GroupName, GroupVerb[]> = {
  ask: [
    {
      name: "create",
      usage: '<slug> [--title "..."] [--epic <epic>] [--description "..."] [--from <questions.json5>]',
      description:
        "make a details page from the template, and print its path;  --epic:  in that epic's details/ (else a " +
        "scratch page, swept after 14 days);  --from:  the whole page from a list of questions",
      example: 'epic ask create pick-layout --epic seo --title "Pick a layout"',
      flags: {
        "--title <title>": "the page's title",
        "--epic <epic>": "in that epic's details/, kept;  else a scratch page, swept after 14 days",
        "--description <text>": "what the page asks, under its title",
        "--from <questions.json5>": "the whole page, from a list of questions"
      }
    },
    {
      name: "round",
      usage: '<page> [--title "..."] [--description "..."] [--from <questions.json5>]',
      description:
        "ask the same question again:  the ONE page rewritten in place (from --from, else left to edit), the round " +
        "before folded at its bottom with what Owen sent;  never a second page (create refuses one)",
      example: "epic ask round seo/pick-layout --from round2.json5",
      flags: {
        "--title <title>": "the page's title",
        "--description <text>": "what the page asks, under its title",
        "--from <questions.json5>": "the new round's questions;  none:  the page stays as it is, to edit"
      }
    },
    {
      name: "show",
      usage: "<page> [--wait] [--timeout 8h]",
      description: "show the page in this session's VS Code side bar (the Review tab);  --wait:  then wait",
      example: "epic ask show seo/pick-layout --wait",
      flags: {
        "--wait": "then wait for the answer, as wait does",
        "--timeout <time>": "how long to wait:  8h (the default), 30m, 1h30m, or seconds"
      }
    },
    {
      name: "wait",
      usage: "<page> [--timeout 8h]",
      description:
        "wait until Owen sends an answer, print it and exit 0 (timeout:  exit 2);  run it in the background:  " +
        "its exit wakes the session",
      example: "epic ask wait seo/pick-layout",
      flags: {
        "--timeout <time>": "how long to wait:  8h (the default), 30m, 1h30m, or seconds"
      }
    },
    {
      name: "answer",
      usage: "<page> [--round <n>]",
      description: "print the answer Owen already sent (exit 1 if none);  --round:  an earlier round's, as sent",
      example: "epic ask answer seo/pick-layout",
      flags: {
        "--round <n>": "an earlier round's answer, as it was sent"
      }
    },
    {
      name: "draft",
      usage: "<page>",
      description:
        "print what Owen typed on the page and hasn't sent (exit 1 if nothing);  run it before rewriting a page " +
        "he may have open",
      example: "epic ask draft seo/pick-layout",
      flags: {}
    },
    {
      name: "list",
      usage: "[<epic>]",
      description: "every details page, answered or waiting;  with an epic, only that epic's (epics/<epic>/details/)",
      example: "epic ask list seo",
      flags: {}
    },
    {
      name: "sweep",
      usage: "[--days 14]",
      description: "delete the scratch pages (and their answers) older than that;  never an epic's",
      example: "epic ask sweep --days 7",
      flags: {
        "--days <n>": "older than that many days (default 14)"
      }
    },
    {
      name: "fold",
      usage: "[--dry-run]",
      description:
        "once:  every epic's near-copies made before round (x-2, x-3 beside x) folded into their first page as its " +
        "rounds, their files merged and removed;  --dry-run:  only say what it would do",
      example: "epic ask fold --dry-run",
      flags: {
        "--dry-run": "only say what it would do"
      }
    }
  ],
  choices: [
    {
      name: "create",
      usage: '<slug> --rows <rows.json5> [--title "..."] [--epic <epic>] [--description "..."]',
      description:
        "make a choice page from its rows (a table of names Claude recommends, Owen's call on each), and print its path",
      example: "epic choices create boolean-names --rows rows.json5 --epic seo",
      flags: {
        "--rows <rows.json5>": "the rows (required)",
        "--title <title>": "the page's title",
        "--epic <epic>": "in that epic's details/, kept;  else a scratch page",
        "--description <text>": "what the page asks, under its title"
      }
    },
    {
      name: "round",
      usage: '<page> --rows <rows.json5> [--title "..."] [--description "..."]',
      description:
        "ask the same question again:  the ONE page rewritten with the new rows, the round before folded at its " +
        "bottom with what Owen sent;  never a second page (create refuses one)",
      example: "epic choices round seo/boolean-names --rows round2.json5",
      flags: {
        "--rows <rows.json5>": "the new round's rows (required)",
        "--title <title>": "the page's title",
        "--description <text>": "what the page asks, under its title"
      }
    },
    {
      name: "show",
      usage: "<page> [--wait] [--timeout 8h]",
      description: "show the page in this session's VS Code side bar;  --wait:  then wait",
      example: "epic choices show seo/boolean-names --wait",
      flags: {
        "--wait": "then wait for the answer, as wait does",
        "--timeout <time>": "how long to wait:  8h (the default), 30m, 1h30m, or seconds"
      }
    },
    {
      name: "wait",
      usage: "<page> [--timeout 8h]",
      description:
        'wait until Owen presses "Do it", print his answer and exit 0 (timeout:  exit 2);  run it in the background',
      example: "epic choices wait seo/boolean-names",
      flags: {
        "--timeout <time>": "how long to wait:  8h (the default), 30m, 1h30m, or seconds"
      }
    },
    {
      name: "answer",
      usage: "<page> [--round <n>]",
      description: "print the answer Owen already sent (exit 1 if none);  --round:  an earlier round's, as sent",
      example: "epic choices answer seo/boolean-names",
      flags: {
        "--round <n>": "an earlier round's answer, as it was sent"
      }
    },
    {
      name: "list",
      usage: "[<epic>]",
      description: "every choice page:  answered, draft or waiting;  with an epic, only that epic's",
      example: "epic choices list seo",
      flags: {}
    }
  ],
  comments: [
    {
      name: "list",
      usage: "[<epic>] [--all] [--json]",
      description:
        "every comment Owen left on a docs page, still waiting for Claude;  with an epic, only that epic's;  " +
        "--all:  taken and answered ones too",
      example: "epic comments list seo",
      flags: {
        "--all": "taken and answered ones too",
        "--json": "print them as JSON"
      }
    },
    {
      name: "wait",
      usage: "[<page>...] [--timeout 8h]",
      description:
        "wait until a comment starts waiting (on those pages, else on any), print it and exit 0;  run it in the " +
        "background",
      example: "epic comments wait guides/solid/solid-2.html",
      flags: {
        "--timeout <time>": "how long to wait:  8h (the default), 30m, 1h30m, or seconds"
      }
    },
    {
      name: "gather",
      usage: "[<page>... | --all] [--epic <epic>] [--json]",
      description: "the waiting comments (and new page notes) into the standing epic feedback, one phase per page",
      example: "epic comments gather guides/solid/solid-2.html",
      flags: {
        "--all": "every page's waiting comments",
        "--epic <epic>": "the epic to gather them into (default the standing feedback)",
        "--json": "print what was gathered as JSON"
      }
    },
    {
      name: "working",
      usage: "<page>#<id> on | off",
      description: 'Claude is thinking about the comment (on), or stopped:  its thread shows "Claude: thinking…"',
      example: "epic comments working guides/solid/solid-2.html#C3 on",
      flags: {}
    },
    {
      name: "answer",
      usage: "<page>#<id> --file <reply.html> [--commit <sha>]",
      description: "Claude's answer on the comment's thread;  --commit:  the commit it was built in",
      example: "epic comments answer guides/solid/solid-2.html#C3 --file reply.html",
      flags: {
        "--file <reply.html>": "the answer, as HTML (required)",
        "--commit <sha>": "the commit it was built in"
      }
    }
  ],
  notes: [
    {
      name: "list",
      usage: "[<epic>] [--all] [--json]",
      description:
        "every new page note Owen left on a docs page;  with an epic, only on the pages it owns;  --all:  answered " +
        "and done ones too",
      example: "epic notes list seo",
      flags: {
        "--all": "answered and done ones too",
        "--json": "print them as JSON"
      }
    },
    {
      name: "answer",
      usage: "<page>#<id> --file <reply.html>",
      description: "Claude's reply under the note, which is then answered",
      example: "epic notes answer guides/solid/solid-2.html#n3 --file reply.html",
      flags: {
        "--file <reply.html>": "the reply, as HTML (required)"
      }
    },
    {
      name: "done",
      usage: "<page>#<id>",
      description: "the note is done:  nothing more to do for it",
      example: "epic notes done guides/solid/solid-2.html#n3",
      flags: {}
    }
  ],
  agents: [
    {
      name: "list",
      usage: "[--json] [--epic <epic>]",
      description: "the agents running now, one line each, oldest first (the default verb)",
      example: "epic agents",
      flags: {
        "--json": "print them as JSON",
        "--epic <epic>": "that epic's list (default this checkout's)"
      }
    },
    {
      name: "add",
      usage: '<name> "<task>" [--status "blocked on <name>"] [--task-id <id>]',
      description: "an agent starting:  prints its full name, <epic>-<name>;  exit 1 if it's running already",
      example: 'epic agents add docstrings "docstrings in string.ts"',
      flags: {
        "--status <status>": 'active, or "blocked on <name>"',
        "--task-id <id>": "the id of the background task it runs as",
        "--epic <epic>": "that epic's list (default this checkout's)"
      }
    },
    {
      name: "set",
      usage: '<name> [--status active | "blocked on <name>"] [--task-id <id>]',
      description: "an agent's status, or its task id",
      example: "epic agents set docstrings --task-id a1b2c3",
      flags: {
        "--status <status>": 'active, or "blocked on <name>"',
        "--task-id <id>": "the id of the background task it runs as",
        "--epic <epic>": "that epic's list (default this checkout's)"
      }
    },
    {
      name: "done",
      usage: "<name>",
      description: "an agent is back:  off the list",
      example: "epic agents done docstrings",
      flags: {
        "--epic <epic>": "that epic's list (default this checkout's)"
      }
    },
    {
      name: "wait",
      usage: "[--every <s>] [--max <s>] [--json]",
      description:
        "wait until Owen sends an agent a note from the epic page (exit 0, printing it), or none is left running " +
        "(exit 3);  run it in the background",
      example: "epic agents wait",
      flags: {
        "--every <time>": "how often to look (default 2):  seconds, or 30s, 1m",
        "--max <time>": "how long to wait (default 3600):  seconds, or 1h, 2h30m",
        "--json": "print the notes as JSON",
        "--epic <epic>": "that epic's list (default this checkout's)"
      }
    },
    {
      name: "told",
      usage: "<name>",
      description: "Owen's notes to the agent were passed on:  the page shows them told",
      example: "epic agents told docstrings",
      flags: {
        "--epic <epic>": "that epic's list (default this checkout's)"
      }
    }
  ],
  airplane: [
    {
      name: "status",
      usage: "[--json]",
      description: "airplane mode on or off, and since when (the default verb)",
      example: "epic airplane",
      flags: {
        "--json": "print it as JSON"
      }
    },
    {
      name: "on",
      usage: "",
      description: "turn airplane mode on:  everything Owen leaves on the pages waits for /airplane land",
      example: "epic airplane on",
      flags: {
        "--json": "print the state as JSON"
      }
    },
    {
      name: "off",
      usage: "",
      description: "turn airplane mode off",
      example: "epic airplane off",
      flags: {
        "--json": "print the state as JSON"
      }
    },
    {
      name: "check",
      usage: "[--fix] [--json]",
      description: "is this laptop ready to fly?  exit 1 while anything isn't;  --fix:  fix what can be",
      example: "epic airplane check --fix",
      flags: {
        "--fix": "fix what can be",
        "--json": "print the checks as JSON"
      }
    },
    {
      name: "inbox",
      usage: "[--since <iso>] [--json]",
      description: "everything Owen left while flying, by place:  what /airplane land works through",
      example: "epic airplane inbox",
      flags: {
        "--since <iso>": "since then (default:  since airplane mode went on)",
        "--json": "print it as JSON"
      }
    }
  ],

  ////////////////
  // ## Worktrees, sessions, parked work, shared content:  this folder's classes
  ////////////////

  worktree: [
    {
      name: "list",
      usage: "[--json]",
      description: "every running session and the worktree, branch and folder it works in;  then idle worktrees",
      example: "epic worktree list",
      flags: {
        "--json": "print them as JSON"
      }
    },
    {
      name: "status",
      usage: "<name>",
      description: "JSON:  where a worktree, branch, epic page or session of that name stands",
      example: "epic worktree status seo",
      flags: {}
    },
    {
      name: "path",
      usage: "<name>",
      description:
        "worktree <name>'s folder, absolute:  where it is (beside the repo, or the old .claude/worktrees), else " +
        "where a new one goes (sessions enter it by NAME, never by this path:  Claude Code would ask)",
      example: "epic worktree path seo",
      flags: {}
    },
    {
      name: "move",
      usage: "<name> | --idle [--dry-run] [--json]",
      description:
        "move a worktree from the old place (.claude/worktrees) beside the repo, its shared links and session " +
        "folder made again;  --idle:  every one no session works in (a busy one stays until its /epic done)",
      example: "epic worktree move --idle --dry-run",
      flags: {
        "--idle": "every one no session works in",
        "--dry-run": "only say what it would do",
        "--json": "print what it did as JSON"
      }
    },
    {
      name: "remove",
      usage: "<name | path> [--force]",
      description:
        "remove a worktree, its page and vite servers stopped FIRST, and its session-folder link;  not its branch " +
        "(git branch -d after);  --force:  git's, for one with changes",
      example: "epic worktree remove seo",
      flags: {
        "--force": "git's:  one with changes too",
        "--branches": "and its branch in each repo, when merged (git branch -d)"
      }
    },
    {
      name: "repos",
      usage: "[<name>] [--json]",
      description:
        "each repo's checkout in epic <name>'s worktree (default:  the one this runs in):  its branch, what's " +
        "uncommitted, how far it's ahead of and behind its base branch",
      example: "epic worktree repos",
      flags: {
        "--json": "print them as JSON"
      }
    },
    {
      name: "merge-main",
      usage: "[--continue] [--json]",
      description:
        "merge main into this checkout's branch, regenerating the generated files both sides changed;  exit 1 " +
        "on other conflicts:  resolve, git add, then --continue",
      example: "epic worktree merge-main",
      flags: {
        "--continue": "go on, once the conflicts are resolved and added",
        "--json": "print what it did as JSON"
      }
    },
    {
      name: "patch",
      usage: "[--all] [--dry-run] [--json]",
      description:
        "give this checkout the fixes its repo lists in .epic/config.json5's checkoutPatches that it doesn't have " +
        "yet:  a file copied from main and git-excluded, or a command run once;  --all:  main and every worktree;  " +
        "the session-start hook runs it by itself",
      example: "epic worktree patch --all --dry-run",
      flags: {
        "--all": "the main checkout and every worktree",
        "--dry-run": "only say what it would do",
        "--json": "print what it did as JSON"
      }
    }
  ],
  session: [
    {
      name: "list",
      usage: "[<words>...] [--all] [--limit <n>] [--json]",
      description: "this repo's saved sessions, newest first, matching every word (the default verb)",
      example: "epic session list --limit 3",
      flags: {
        "--all": "every project's sessions",
        "--limit <n>": "at most that many (default 15)",
        "--json": "print them as JSON"
      }
    },
    {
      name: "find",
      usage: "<name> [--json]",
      description: "the sessions titled <name>, or that worked in worktree <name>",
      example: "epic session find seo",
      flags: {
        "--json": "print them as JSON"
      }
    },
    {
      name: "open",
      usage: "<id prefix | title>",
      description: "open a session in the VS Code Claude panel:  the window it runs in, else this one",
      example: "epic session open 055da582",
      flags: {}
    },
    {
      name: "title",
      usage: "[<title>]",
      description: "this session's title;  with one, queued for its next prompt",
      example: 'epic session title "🚧 seo"',
      flags: {
        "--force": "queue it even when its tab seems to show it already"
      }
    },
    {
      name: "done",
      usage: "[<name>]",
      description: "mark finished work's sessions ✅:  this one, or every session of <name>",
      example: "epic session done seo",
      flags: {}
    },
    {
      name: "icons",
      usage: "[--dry-run]",
      description: "give every named session the icon its work's state calls for (🚧 📅 ✅ 🚨 ⏸️)",
      example: "epic session icons --dry-run",
      flags: {
        "--dry-run": "only say what it would do"
      }
    },
    {
      name: "window",
      usage: "[<pid>]",
      description: "the VS Code window id a process runs in (default this session's)",
      example: "epic session window",
      flags: {}
    },
    {
      name: "transcript",
      usage: "<id prefix> [--json]",
      description: "another session's prompts, last reply and the question it's waiting on",
      example: "epic session transcript 055da582",
      flags: {
        "--json": "print it as JSON"
      }
    },
    {
      name: "listen",
      usage: "[--json] [--monitor <pid>]",
      description:
        "one look at this session's epic page for it:  listen, say what's waiting (the plugin's monitor runs it)",
      example: "epic session listen",
      flags: {
        "--json": "print the look as JSON",
        "--monitor <pid>": "the inbox poller's process:  the listener's place is held while it runs"
      }
    }
  ],
  park: [
    {
      name: "list",
      usage: "",
      description: "JSON:  every parked worktree's PARKED note:  its state and where it stopped",
      example: "epic park list",
      flags: {}
    },
    {
      name: "candidates",
      usage: "",
      description: "JSON:  what /wait-for ? offers:  unfinished worktrees and epics, running sessions",
      example: "epic park candidates",
      flags: {}
    },
    {
      name: "wait",
      usage: "<name> [--every <seconds>] [--max <seconds>]",
      description:
        "poll until <name> finishes, then print its status;  exit 0 finished, 2 time's up (run it again), 3 " +
        "nothing by that name",
      example: "epic park wait seo --every 60",
      flags: {
        "--every <time>": "how often to look (default 60):  seconds, or 30s, 2m",
        "--max <time>": "how long to wait (default 7140):  seconds, or 1h, 2h"
      }
    }
  ],
  shared: [
    {
      name: "status",
      usage: "[--json]",
      description: "each checkout's links, and the shared repo's uncommitted files and last commit (the default verb)",
      example: "epic shared status",
      flags: {
        "--json": "print it as JSON"
      }
    },
    {
      name: "init",
      usage: "[--import]",
      description: "create the shared repo;  --import copies this checkout's folders in",
      example: "epic shared init --import",
      flags: {
        "--import": "copy this checkout's folders in"
      }
    },
    {
      name: "link",
      usage: "[--all]",
      description: "link this checkout's shared folders (--all:  every checkout's)",
      example: "epic shared link",
      flags: {
        "--all": "every checkout's"
      }
    },
    {
      name: "commit",
      usage: "[--session <id>] [--quiet]",
      description: "commit whatever changed in the shared repo, one commit per epic, guide or folder (every turn)",
      example: "epic shared commit --quiet",
      flags: {
        "--session <id>": "the session whose turn swept them up",
        "--quiet": "print nothing"
      }
    },
    {
      name: "migrate",
      usage: "<worktree> [--dry-run] [--json]",
      description: "move a worktree cut before the cutover onto the shared content",
      example: "epic shared migrate seo --dry-run",
      flags: {
        "--dry-run": "only say what it would do",
        "--json": "print the report as JSON"
      }
    }
  ],

  ////////////////
  // ## Windows and the page server:  scripts passed through
  ////////////////

  window: [
    {
      name: "init",
      usage: "",
      description: "write each package's missing window file, and bring every window file up to date",
      example: "epic window init",
      flags: {}
    },
    {
      name: "move",
      usage: "[--dry-run]",
      description:
        "carry the window files once from the main checkout's workspaces/ to the windows folder " +
        "(epic config windowsFolder), each folder path rewritten;  the old files are kept",
      example: "epic window move --dry-run",
      flags: {
        "--dry-run": "only say what it would do"
      }
    },
    {
      name: "which",
      usage: "",
      description: "this session's VS Code window:  pid, workspace file, folders",
      example: "epic window which",
      flags: {}
    },
    {
      name: "add",
      usage: "<path> [--name <name>]",
      description: "add a folder to the window (never a worktree's:  see the root AGENTS.md)",
      example: "epic window add ../other --name other",
      flags: {
        "--name <name>": "the folder's name in the window"
      }
    },
    {
      name: "remove",
      usage: "<path>",
      description: "remove that folder again",
      example: "epic window remove ../other",
      flags: {}
    },
    {
      name: "show",
      usage: "<file> [--hash <id>] [--review]",
      description: "show an .html page in the window's side bar:  Epic Docs, or with --review the Review tab",
      example: "epic window show epics/seo/seo.plan.html --review",
      flags: {
        "--hash <id>": "land on that id",
        "--review": "in the Review tab"
      }
    },
    {
      name: "reload",
      usage: "[--review]",
      description: "rebuild the side bar's view from scratch, at the page it shows",
      example: "epic window reload --review",
      flags: {
        "--review": "the Review tab's view"
      }
    },
    {
      name: "open",
      usage: "<name> [--pkg <pkg>] [--color <look>] [--no-open]",
      description: "open worktree <name> in a new window (--no-open:  only write its window file)",
      example: "epic window open seo --color purple",
      flags: {
        "--pkg <pkg>": "the window it's made from (default this one)",
        "--color <look>": "its look (epic window color lists them)",
        "--no-open": "only write its window file"
      }
    },
    {
      name: "launch",
      usage: "<name> [--pkg <pkg>] [--color <look>] [--prompt <text>] [--move]",
      description:
        "wake epic <name>:  its running session, else a NEW one in its open window (look untouched), else make " +
        "worktree <name> if needed, open its window, a NEW session there;  --move:  THIS session goes there instead",
      example: 'epic window launch seo --prompt "/epic request seo r3"',
      flags: {
        "--pkg <pkg>": "the window it's made from (default this one)",
        "--color <look>": "its look (epic window color lists them)",
        "--prompt <text>": "what's typed into the session (default /epic <name>)",
        "--move": "THIS session goes there instead"
      }
    },
    {
      name: "close",
      usage: "<name>",
      description: "close that window, delete its file",
      example: "epic window close seo",
      flags: {}
    },
    {
      name: "handoff",
      usage: "<name> [--back] [--prompt <text>]",
      description: "move this session to <name>'s window when this turn ends",
      example: "epic window handoff seo --prompt continue",
      flags: {
        "--back": "back to the window it came from",
        "--prompt <text>": "what's typed into it there"
      }
    },
    {
      name: "resume",
      usage: "<record> [--title <title>]...",
      description: "the move itself:  the Stop hook runs it",
      example: "epic window resume ~/.spell-epic/windows/handoffs/<id>.json",
      flags: {
        "--title <title>": "a title its old tab may show, to close it by;  once per title"
      }
    },
    {
      name: "should-stay",
      usage: "[--epic] [--json]",
      description: "stay in this window when isolating, or move?  recommend stay|window, and why",
      example: "epic window should-stay --epic",
      flags: {
        "--epic": "isolating for an epic",
        "--json": "print the advice as JSON"
      }
    },
    {
      name: "color",
      usage: "[<look>]",
      description: "give this window a look, Tomorrow Night Blue's in a hue;  no look:  list them",
      example: "epic window color purple",
      flags: {}
    },
    {
      name: "stay",
      usage: "<name> | --end",
      description: "a session staying here for worktree <name>:  title and tint the window;  --end puts both back",
      example: "epic window stay seo",
      flags: {
        "--end": "put the window's title and tint back"
      }
    }
  ],
  server: [
    {
      name: "serve",
      usage: "[--port <n>]",
      description: "run this checkout's page server in the foreground, until Ctrl-C",
      example: "epic server serve",
      flags: {
        "--port <n>": "the port to try first",
        "--root <dir>": "the kit (default the one this runs in)",
        "--spaces <dir>": "where people's spaces are kept"
      }
    },
    {
      name: "start",
      usage: "[--all] [--port <n>]",
      description: "start it in the background if it isn't running;  --all:  every web server (editor, Spell UI too)",
      example: "epic server start --all",
      flags: {
        "--all": "every web server:  the page server, the editor, Spell UI",
        "--port <n>": "the port to try first",
        "--root <dir>": "the kit (default the one this runs in)",
        "--spaces <dir>": "where people's spaces are kept"
      }
    },
    {
      name: "ensure",
      usage: "[--port <n>]",
      description: "start it in the background if it isn't running, and print where it is",
      example: "epic server ensure",
      flags: {
        "--port <n>": "the port to try first",
        "--root <dir>": "the kit (default the one this runs in)",
        "--spaces <dir>": "where people's spaces are kept"
      }
    },
    {
      name: "stop",
      usage: "",
      description: "stop it",
      example: "epic server stop",
      flags: {
        "--root <dir>": "the kit (default the one this runs in)"
      }
    },
    {
      name: "status",
      usage: "",
      description: "JSON:  where it runs;  exit 1 when it isn't",
      example: "epic server status",
      flags: {
        "--root <dir>": "the kit (default the one this runs in)"
      }
    },
    {
      name: "url",
      usage: "<file>",
      description: "ensure it runs, then print the URL that serves <file>",
      example: "epic server url epics/seo/seo.plan.html",
      flags: {
        "--port <n>": "the port to try first",
        "--root <dir>": "the kit (default the one this runs in)",
        "--spaces <dir>": "where people's spaces are kept"
      }
    },
    {
      name: "prune",
      usage: "[--dry-run]",
      description:
        "stop the page and vite servers whose checkout is gone (a removal stops its own first;  every session's " +
        "start runs this, hourly)",
      example: "epic server prune --dry-run",
      flags: {
        "--dry-run": "only say which",
        "--root <dir>": "the kit (default the one this runs in)"
      }
    }
  ],
  hub: [
    {
      name: "serve",
      usage: "[--port <n>]",
      description: "run the machine's epic server in the foreground, until Ctrl-C",
      example: "epic hub serve",
      flags: {
        "--port <n>": "the port to try first"
      }
    },
    {
      name: "start",
      usage: "[--port <n>]",
      description: "start it in the background if it isn't running",
      example: "epic hub start",
      flags: {
        "--port <n>": "the port to try first"
      }
    },
    {
      name: "ensure",
      usage: "[--port <n>]",
      description:
        "start it in the background if it isn't running (restarted when its code or repos changed), and print where it is",
      example: "epic hub ensure",
      flags: {
        "--port <n>": "the port to try first"
      }
    },
    {
      name: "stop",
      usage: "",
      description: "stop it",
      example: "epic hub stop",
      flags: {}
    },
    {
      name: "status",
      usage: "",
      description: "JSON:  where it runs and what it serves;  exit 1 when it isn't running",
      example: "epic hub status",
      flags: {}
    },
    {
      name: "url",
      usage: "<file>",
      description: "ensure it runs, then print the URL that serves <file>, a page in a registered repo's content",
      example: "epic hub url epics/seo/seo.plan.html",
      flags: {
        "--port <n>": "the port to try first"
      }
    }
  ],
  repo: [
    {
      name: "add",
      usage: "[<checkout>] [--name <name>] [--default]",
      description:
        "register the repo <checkout> is in (default:  this one) for the epic server;  --default:  served at /",
      example: "epic repo add ~/www/spell-app/spell-app --default",
      flags: {
        "--name <name>": "its name in the URL, /r/<name>/ (default its folder's)",
        "--default": "served at / too"
      }
    },
    {
      name: "list",
      usage: "[--json]",
      description: "every registered repo:  its URL prefix, checkout and content folder",
      example: "epic repo list",
      flags: {
        "--json": "print them as JSON"
      }
    },
    {
      name: "remove",
      usage: "<name>",
      description: "unregister a repo",
      example: "epic repo remove spell-app",
      flags: {}
    },
    {
      name: "default",
      usage: "<name>",
      description: "serve that repo at / (every repo is at /r/<name>/ too)",
      example: "epic repo default spell-app",
      flags: {}
    }
  ],
  plugin: [
    {
      name: "install",
      usage: "[--kit <folder>] [--dry-run] [--json]",
      description:
        "install the epic plugin in Claude Code as epic@spell, run in place from the kit's epic/ (from npm:  the " +
        "spell-epic package beside spell, its marketplace from GitHub):  the old " +
        "spell-epic@spell-epic taken out, the marketplace spell added, the cache, skill and epic links made;  " +
        "safe to run again",
      example: "epic plugin install --dry-run",
      flags: {
        "--kit <folder>": "the kit's checkout to install from (default this code's main checkout, ~/www/spell)",
        "--dry-run": "only say what it would change",
        "--json": "print the report as JSON"
      }
    }
  ],
  pages: [
    {
      name: "index",
      usage: "",
      description:
        "write the home page's area cards and each area's list page (epics, guides, sagas ...);  a missing one is made",
      example: "epic pages index",
      flags: {}
    },
    {
      name: "update",
      usage: "[--skip-ui-build] [--no-check]",
      description: "check the docs pages against their template:  sections, links, the engine's assets",
      example: "epic pages update --skip-ui-build",
      flags: {
        "--skip-ui-build": "reuse Spell UI's last build (the bundle is still rebuilt)",
        "--no-check": "skip the browser checks"
      }
    },
    {
      name: "create",
      usage: '<kind> <page> --title "..." [--dry-run]',
      description:
        "make a page from a template (durable, ...), at the right depth, and list it on its area's page;  " +
        "--dry-run:  say which template and page, write nothing",
      example: 'epic pages create durable guides/greet.html --title "How greet() works"',
      flags: {
        "--title <title>": "the page's title",
        "--description <text>": "the page's description",
        "--dry-run": "say which template and page, write nothing"
      }
    },
    {
      name: "template",
      usage: "[<name>]",
      description:
        "where a template is (spell-epic's templates/, the repo's own first:  repoTemplates);  " +
        "no name:  the templates folders",
      example: "epic pages template epics/plan-doc.md",
      flags: {}
    },
    {
      name: "open",
      usage: "[<page>] [--vs | --review]",
      description: "show a page in Chrome, or in VS Code's side bar (--vs;  --review:  its Review tab)",
      example: "epic pages open epics/seo/seo.plan.html --review",
      flags: {
        "--vs": "in VS Code's side bar",
        "--review": "in the side bar's Review tab"
      }
    },
    {
      name: "link",
      usage: '<page> [--hash <id>] [--text "..."] [--review] [--show]',
      description: "print a page's links for a reply:  the side bar's and the browser's;  --show:  show it too",
      example: "epic pages link epics/seo/seo.plan.html --hash p1 --review",
      flags: {
        "--hash <id>": "a link to that id",
        "--text <text>": "the link's words",
        "--review": "the side bar's link opens the Review tab",
        "--show": "show the page too"
      }
    },
    {
      name: "fuss",
      usage: "<path>... | --branch",
      description: "check the writing of pages and comments against the house rules",
      example: "epic pages fuss --branch",
      flags: {
        "--branch": "the files this branch changed",
        "--json": "print the misses as JSON"
      }
    },
    {
      name: "voice",
      usage: "[<page>...] [--voice <name>] [--done <page>...] [--all] [--json]",
      description:
        "the guides a voice still has to go over (none named:  every guide), and the voice's file;  " +
        "--done:  stamp guides as gone over",
      example: "epic pages voice --done guides/server.html",
      flags: {
        "--voice <name>": "that voice (default the one guides are written in)",
        "--done": "stamp the pages named as gone over",
        "--all": "the guides gone over too",
        "--json": "print the list as JSON"
      }
    },
    {
      name: "offline",
      usage: "[<page>...]",
      description: "what the docs pages load from the internet, for airplane mode",
      example: "epic pages offline",
      flags: {
        "--fix": "point the pages at the local copy first",
        "--json": "print what's left as JSON"
      }
    },
    {
      name: "shots",
      usage:
        "<page | URL> [--out <dir>] [--base <url>] [--full] [--scroll <px | selector>] [--hover <selector>] [--click <selector>]",
      description:
        "the designer review's screenshots:  a page at desk, mid and phone width, light and dark, and the states " +
        "asked for;  a JSON summary last (/designer)",
      example: "epic pages shots guides/changelog.html --full --out /tmp/designer",
      flags: {
        "--out <dir>": "where the shots go (default a temp folder)",
        "--base <url>": "the page server to load a page from",
        "--full": "the whole page at desk and phone width, in slices",
        "--scroll <where>": "desk and phone, scrolled that far down or to that selector;  again for more",
        "--hover <selector>": "desk, the pointer over it;  again for more",
        "--click <selector>": "desk, after clicking it;  again for more"
      }
    }
  ]
}

/**
 * A group of `epic`'s verbs:
 * - a docs tool or script passed through:
 *   `ask`, `choices`, `comments`, `notes`, `agents`, `airplane`, `window`, `server`
 * - a class of this folder:  `worktree` (`Worktrees`), `session` (`Sessions`), `park` (`Parking`), `shared` (`Shared`),
 *   `hub` (`Hub`), `repo` (`Repos`), `plugin` (`PluginInstall`)
 * - the docs pages' tools:  `pages` (`EpicTools.runPages()`)
 */
export type GroupName =
  | "ask"
  | "choices"
  | "comments"
  | "notes"
  | "agents"
  | "airplane"
  | "worktree"
  | "session"
  | "park"
  | "shared"
  | "window"
  | "server"
  | "hub"
  | "repo"
  | "plugin"
  | "pages"

/** One verb of a group, for its help:  `epic <group> <name> <usage>`, what it does, a whole command line. */
export type GroupVerb = {
  /** the verb:  `create` */
  name: string
  /** its arguments:  `<slug> [--epic <epic>]` */
  usage: string
  /** what it does, for Owen */
  description: string
  /** a whole command line:  `epic ask create pick-layout --epic seo` */
  example: string
  /** its flags:  listed in its help, and the only ones it takes (`VerbFlags`) */
  flags: VerbFlags
}

/**
 * A verb's flags:  each as commander writes one, to what it does.
 * - `--json`:  a switch;  `--epic <epic>`:  takes a value;  `--standing [on|off]`:  a value or none
 * - its help lists them (`Options:`), and any other `--flag` is refused before it runs (`EpicProgram`)
 */
export type VerbFlags = Record<string, string>

////////////////
// ## The verbs of no group
////////////////

/** A wait's time, as every `--timeout` takes one (`duration()`). */
const TIME = "8h, 30m, 1h30m, or seconds"

/**
 * The flags of each verb of no group (`epic summary`, `epic send` ...), by verb:  as `GroupVerb.flags`.
 * - an epic page's verbs take `--here` too, unlisted:  accepted and ignored, for old callers (`EpicProgram.page()`)
 */
export const VERB_FLAGS: Record<string, VerbFlags> = {
  // requests from other sessions (`Requests`)
  send: {
    "--text <words>": "Owen's words, verbatim",
    "--file <file>": "his words, from a file",
    "--images <n>": "how many of the images he pasted last to keep (default none)",
    "--context <text>": "what he was looking at:  a page, a file, an item",
    "--from <session>": "the sending session's id (default this one)",
    "--json": "print what was sent, and to whom, as JSON"
  },
  requests: { "--json": "print them as JSON" },
  file: {
    "--file <html>": "the request as HTML, with --from:  in place of its own words",
    "--from <who>": "who sent it, with --file"
  },
  home: {},
  merge: { "--ditch": "move up to 3 hand-made stray files aside too, once Owen says so" },

  // an epic page:  making and reading (the `epic` tool's)
  create: {
    "--title <title>": "the page's title (default the name, title-cased)",
    "--prompt <text>": "the prompt that started it",
    "--prompt-file <file>": "the prompt, from a file",
    "--future": "an idea for later, not planned yet",
    "--saga <id>": "the saga it serves",
    "--stage <stage>": "the stage it starts in:  overview (the default), phases or building"
  },
  stage: {},
  change: { "--for <item>": "the item of the change marks that name none" },
  list: { "--json": "print them as JSON" },
  summary: { "--json": "print it as JSON" },
  summaries: {},
  items: {
    "--section <section>": "only that section:  questions, judgements, todos, issues or tests",
    "--filter <filter>": "unreviewed (the default), open, reviewed, queued or all",
    "--json": "print them as JSON",
    "--spec <file>": "write the review's item picker there:  a details page's questions"
  },
  docs: { "--json": "print them as JSON" },
  decisions: { "--json": "print them as JSON" },
  owns: { "--json": "print them as JSON" },
  open: { "--review": "in the side bar's Review tab" },
  lint: { "--no-browser": "skip the browser check", "--links": "fail on its links' problems too" },

  // an epic page:  phases
  "add-phase": {
    "--symptom <html>": "what's wrong:  one line",
    "--changes <html>": "what changes:  two or three lines",
    "--goal <html>": "its goal",
    "--plan <html>": "Claude's build plan, which waits for Owen's Accept",
    "--files <html>": "the files it touches",
    "--verify <html>": "how it's checked",
    "--estimate <time>": "its estimate, e.g. 1-2h",
    "--after <phase>": "right after that phase:  --after 11 makes it P12",
    "--before <phase>": "in that phase's place:  --before 4 makes it P4"
  },
  update: {
    "--symptom <html>": "a phase's symptom",
    "--changes <html>": "a phase's changes",
    "--goal <html>": "a phase's goal",
    "--plan <html>": "a phase's build plan, waiting for Owen's Accept",
    "--choices <html>": "a phase's own option sets, <epic-choices> (its Choices field)",
    "--accepted": "with --plan:  written accepted, Owen's comments on his Accept folded in (no second Accept)",
    "--files <html>": "a phase's files",
    "--verify <html>": "how a phase is checked",
    "--estimate <time>": "a phase's estimate, e.g. 1-2h",
    "--title <title>": "a phase's or an item's new title:  links that say the old one follow",
    "--html": "the title is HTML",
    "--calm": "an item not urgent (yellow)",
    "--loud": "an item urgent (red) again",
    "--standing [on|off]": "the page:  a standing epic, open for good, never done",
    "--no-standing": "the page:  not a standing epic",
    "--filed <what>": "a card:  done --filed is noted's older spelling"
  },
  updated: {
    "--file <file>": "the change, as HTML, from a file",
    "--summary <text>": "its one-line summary (default its first sentence)",
    "--for <ids>": "the items it's for, comma-separated:  nothing written when each has a change mark in the phase"
  },
  phase: {
    "--done <html>": "done:  what was built, a <ul>",
    "--no-open": "done:  don't bring the page forward in VS Code",
    "--dry-run": "took:  only say the time"
  },
  move: {},
  commit: {},
  commits: {
    "--backfill": "every phase and item commit in the page's history",
    "--merged <shas>": "only those commits, comma-separated",
    "--repo <repo>": "remap:  the old repo, and any older name of it, comma-separated",
    "--to <repo>": "remap:  the repo it was merged into (default this checkout's)",
    "--dry-run": "remap:  only say what it would change"
  },

  // an epic page:  items
  add: {
    "--details <html>": "its details",
    "--calm": "not urgent (yellow):  a judgement or issue that wouldn't surprise Owen",
    "--limit": "a todo:  a limit to know about, not work",
    "--step <html>": "a manual test:  exactly what to do",
    "--should <html>": "a manual test:  what should happen",
    "--example <png>": "a manual test:  a screenshot of it, or a line of text",
    "--if-not <html>": "a manual test:  what to tell Claude when it doesn't",
    "--options <list>":
      'a judgement or question:  its option set, split by " | ", "*" the recommended:  "*Do it | Don\'t"',
    "--multiple": "a standing set (#choices):  pick any, not pick one",
    "--note <html>": "a standing set (#choices):  its lead, before it"
  },
  calm: { "--loud": "urgent (red) again" },
  decide: { "--details <html>": "the answer's details, and why", "--option <letter>": "the option chosen" },
  choose: { "--set <n>": "on the Nth card set (default the latest)" },
  option: {
    "--set <n>": "on the Nth card set (default the latest)",
    "--image <png>": "add:  a picture for the option, copied beside the page (tests/)",
    "--title <title>": "edit:  the option's new title",
    "--note <html>": "edit:  the option's new text (HTML, or plain text)"
  },
  close: {},
  reopen: {},
  cancel: {},
  details: {
    "--file <reply.html>": "the details, as HTML",
    "--append": "add it under what's there, e.g. a reply",
    "--more": "add it as a More Details card, the text kept as it is",
    "--step <html>": "a manual test:  exactly what to do",
    "--should <html>": "a manual test:  what should happen",
    "--example <png>": "a manual test:  a screenshot of it, or a line of text",
    "--if-not <html>": "a manual test:  what to tell Claude when it doesn't"
  },
  summarize: { "--file <condensed.html>": "what the item shows now, as HTML" },
  restore: {
    "--file <old.html>": "the earlier text, as HTML",
    "--as-of <date>": 'when it was replaced:  "YYYY-MM-DD HH:MM"'
  },
  review: {},
  defer: {},
  queue: {},
  unqueue: {},

  // an epic page:  the review inbox
  inbox: {
    "--json": "print it as JSON",
    "--session <id>": "watch:  the session that waits (default this one)",
    "--timeout <time>": `wait:  how long (default 3300):  ${TIME}`,
    "--all": "apply:  the marks sent or not",
    "--clear": "status:  nothing being done",
    "--items <ids>": "status:  what it's answering, comma-separated",
    "--file <reply.html>": "done:  a comment's answer, as HTML",
    "--commit <sha>": "done:  the commit a comment's answer was built in"
  },
  test: {
    "--list": "its open tests, in the run's order;  open nothing",
    "--json": "print them as JSON",
    "--all": "every epic with open tests",
    "--at <id>": "land on that test, as <epic>#M3 does"
  },

  // an epic page:  log and upkeep
  log: {},
  prompt: { "--file <file>": "the prompt, from a file" },
  bedtime: {},
  backfill: { "--all": "every epic", "--apply": "mark them:  a dry run without it" },
  split: { "--dry-run": "only say what it would do", "--done": "every finished epic" },
  join: {},
  migrate: {
    "--all": "every epic page",
    "--file <page>": "that page alone",
    "--step <name>": "that step alone (--list lists them)",
    "--dry-run": "only say what it would change",
    "--notify": "an epic whose session runs is told, the rest migrated",
    "--list": "the steps, oldest first"
  },
  saga: {
    "--json": "list:  print them as JSON",
    "--none": "set:  the epic serves no saga",
    "--before <id>": "move:  before that saga",
    "--after <id>": "create, move:  after that saga",
    "--purpose <text>": "create:  what the saga is for",
    "--force": "page:  make the page again"
  },

  // worktrees, sessions, parked work;  the repo's settings
  status: { "--json": "print it as JSON" },
  loc: { "--print": "the by-repo table only;  the page is left as it is", "--json": "the numbers, as JSON" },
  config: { "--json": "print it as JSON" },
  voice: { "--for <kind>": "the voice that kind of page is written in", "--json": "print it as JSON" },
  init: { "--dry-run": "only say what it would do", "--json": "print what it did as JSON" }
}
