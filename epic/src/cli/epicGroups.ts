/**
 * The verbs of `epic`'s groups (`GroupName`), for their help (epic `epic-workflow` P19):
 * - `epic ask create --help` prints that verb's usage, what it does and an example
 * - `epic ask --help` lists them
 *
 * - Help only:  each group's tool or class reads its own arguments, passed through verbatim.
 *   - the tools' header comments (`src/tools/`, `src/window.mjs`, the page server's `cli.ts`)
 *     and the classes' (`Worktrees`, `Sessions` ...) say the same in more words:  keep them agreeing
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
      example: 'epic ask create pick-layout --epic seo --title "Pick a layout"'
    },
    {
      name: "show",
      usage: "<page> [--wait] [--timeout 8h]",
      description: "show the page in this session's VS Code side bar (the Review tab);  --wait:  then wait",
      example: "epic ask show seo/pick-layout --wait"
    },
    {
      name: "wait",
      usage: "<page> [--timeout 8h]",
      description:
        "wait until Owen sends an answer, print it and exit 0 (timeout:  exit 2);  run it in the background:  " +
        "its exit wakes the session",
      example: "epic ask wait seo/pick-layout"
    },
    {
      name: "answer",
      usage: "<page>",
      description: "print the answer Owen already sent (exit 1 if none)",
      example: "epic ask answer seo/pick-layout"
    },
    {
      name: "draft",
      usage: "<page>",
      description:
        "print what Owen typed on the page and hasn't sent (exit 1 if nothing);  run it before rewriting a page " +
        "he may have open",
      example: "epic ask draft seo/pick-layout"
    },
    {
      name: "list",
      usage: "[<epic>]",
      description: "every details page, answered or waiting;  with an epic, only that epic's (epics/<epic>/details/)",
      example: "epic ask list seo"
    },
    {
      name: "sweep",
      usage: "[--days 14]",
      description: "delete the scratch pages (and their answers) older than that;  never an epic's",
      example: "epic ask sweep --days 7"
    }
  ],
  choices: [
    {
      name: "create",
      usage: '<slug> --rows <rows.json5> [--title "..."] [--epic <epic>] [--description "..."]',
      description:
        "make a choice page from its rows (a table of names Claude recommends, Owen's call on each), and print its path",
      example: "epic choices create boolean-names --rows rows.json5 --epic seo"
    },
    {
      name: "show",
      usage: "<page> [--wait] [--timeout 8h]",
      description: "show the page in this session's VS Code side bar;  --wait:  then wait",
      example: "epic choices show seo/boolean-names --wait"
    },
    {
      name: "wait",
      usage: "<page> [--timeout 8h]",
      description:
        'wait until Owen presses "Do it", print his answer and exit 0 (timeout:  exit 2);  run it in the background',
      example: "epic choices wait seo/boolean-names"
    },
    {
      name: "answer",
      usage: "<page>",
      description: "print the answer Owen already sent (exit 1 if none)",
      example: "epic choices answer seo/boolean-names"
    },
    {
      name: "list",
      usage: "[<epic>]",
      description: "every choice page:  answered, draft or waiting;  with an epic, only that epic's",
      example: "epic choices list seo"
    }
  ],
  comments: [
    {
      name: "list",
      usage: "[<epic>] [--all] [--json]",
      description:
        "every comment Owen left on a docs page, still waiting for Claude;  with an epic, only that epic's;  " +
        "--all:  taken and answered ones too",
      example: "epic comments list seo"
    },
    {
      name: "wait",
      usage: "[<page>...] [--timeout 8h]",
      description:
        "wait until a comment starts waiting (on those pages, else on any), print it and exit 0;  run it in the " +
        "background",
      example: "epic comments wait guides/solid/solid-2.html"
    },
    {
      name: "gather",
      usage: "[<page>... | --all] [--epic <epic>] [--json]",
      description: "the waiting comments (and new page notes) into the standing epic feedback, one phase per page",
      example: "epic comments gather guides/solid/solid-2.html"
    },
    {
      name: "working",
      usage: "<page>#<id> on | off",
      description: 'Claude is thinking about the comment (on), or stopped:  its thread shows "Claude: thinking…"',
      example: "epic comments working guides/solid/solid-2.html#M3 on"
    },
    {
      name: "answer",
      usage: "<page>#<id> --file <reply.html> [--commit <sha>]",
      description: "Claude's answer on the comment's thread;  --commit:  the commit it was built in",
      example: "epic comments answer guides/solid/solid-2.html#M3 --file reply.html"
    }
  ],
  notes: [
    {
      name: "list",
      usage: "[<epic>] [--all] [--json]",
      description:
        "every new page note Owen left on a docs page;  with an epic, only on the pages it owns;  --all:  answered " +
        "and done ones too",
      example: "epic notes list seo"
    },
    {
      name: "answer",
      usage: "<page>#<id> --file <reply.html>",
      description: "Claude's reply under the note, which is then answered",
      example: "epic notes answer guides/solid/solid-2.html#n3 --file reply.html"
    },
    {
      name: "done",
      usage: "<page>#<id>",
      description: "the note is done:  nothing more to do for it",
      example: "epic notes done guides/solid/solid-2.html#n3"
    }
  ],
  agents: [
    {
      name: "list",
      usage: "[--json] [--epic <epic>]",
      description: "the agents running now, one line each, oldest first (the default verb)",
      example: "epic agents"
    },
    {
      name: "add",
      usage: '<name> "<task>" [--status "blocked on <name>"] [--task-id <id>]',
      description: "an agent starting:  prints its full name, <epic>-<name>;  exit 1 if it's running already",
      example: 'epic agents add docstrings "docstrings in string.ts"'
    },
    {
      name: "set",
      usage: '<name> [--status active | "blocked on <name>"] [--task-id <id>]',
      description: "an agent's status, or its task id",
      example: "epic agents set docstrings --task-id a1b2c3"
    },
    {
      name: "done",
      usage: "<name>",
      description: "an agent is back:  off the list",
      example: "epic agents done docstrings"
    },
    {
      name: "wait",
      usage: "[--every <s>] [--max <s>] [--json]",
      description:
        "wait until Owen sends an agent a note from the epic page (exit 0, printing it), or none is left running " +
        "(exit 3);  run it in the background",
      example: "epic agents wait"
    },
    {
      name: "told",
      usage: "<name>",
      description: "Owen's notes to the agent were passed on:  the page shows them told",
      example: "epic agents told docstrings"
    }
  ],
  airplane: [
    {
      name: "status",
      usage: "[--json] [--monitor <pid>]",
      description: "airplane mode on or off, and since when (the default verb)",
      example: "epic airplane"
    },
    {
      name: "on",
      usage: "",
      description: "turn airplane mode on:  everything Owen leaves on the pages waits for /airplane land",
      example: "epic airplane on"
    },
    { name: "off", usage: "", description: "turn airplane mode off", example: "epic airplane off" },
    {
      name: "check",
      usage: "[--fix] [--json]",
      description: "is this laptop ready to fly?  exit 1 while anything isn't;  --fix:  fix what can be",
      example: "epic airplane check --fix"
    },
    {
      name: "inbox",
      usage: "[--since <iso>] [--json]",
      description: "everything Owen left while flying, by place:  what /airplane land works through",
      example: "epic airplane inbox"
    }
  ],

  ////////////////
  // ## Worktrees, sessions, parked work, shared content:  this folder's classes
  ////////////////

  worktree: [
    {
      name: "list",
      usage: "[--json] [--monitor <pid>]",
      description: "every running session and the worktree, branch and folder it works in;  then idle worktrees",
      example: "epic worktree list"
    },
    {
      name: "status",
      usage: "<name>",
      description: "JSON:  where a worktree, branch, epic page or session of that name stands",
      example: "epic worktree status seo"
    },
    {
      name: "path",
      usage: "<name>",
      description:
        "worktree <name>'s folder, absolute:  where it is (beside the repo, or the old .claude/worktrees), else " +
        "where a new one goes (sessions enter it by NAME, never by this path:  Claude Code would ask)",
      example: "epic worktree path seo"
    },
    {
      name: "move",
      usage: "<name> | --idle [--dry-run] [--json]",
      description:
        "move a worktree from the old place (.claude/worktrees) beside the repo, its shared links and session " +
        "folder made again;  --idle:  every one no session works in (a busy one stays until its /isolate done)",
      example: "epic worktree move --idle --dry-run"
    },
    {
      name: "remove",
      usage: "<name | path> [--force]",
      description:
        "remove a worktree, its page and vite servers stopped FIRST, and its session-folder link;  not its branch " +
        "(git branch -d after);  --force:  git's, for one with changes",
      example: "epic worktree remove seo"
    },
    {
      name: "repos",
      usage: "[<name>] [--json]",
      description:
        "each repo's checkout in epic <name>'s worktree (default:  the one this runs in):  its branch, what's " +
        "uncommitted, how far it's ahead of and behind its base branch",
      example: "epic worktree repos"
    },
    {
      name: "merge-main",
      usage: "[--continue] [--json]",
      description:
        "merge main into this checkout's branch, regenerating the generated files both sides changed;  exit 1 " +
        "on other conflicts:  resolve, git add, then --continue",
      example: "epic worktree merge-main"
    },
    {
      name: "patch",
      usage: "[--all] [--dry-run] [--json]",
      description:
        "give this checkout the fixes its repo lists in .epic/config.json5's checkoutPatches that it doesn't have " +
        "yet:  a file copied from main and git-excluded, or a command run once;  --all:  main and every worktree;  " +
        "the session-start hook runs it by itself",
      example: "epic worktree patch --all --dry-run"
    }
  ],
  session: [
    {
      name: "list",
      usage: "[<words>...] [--all] [--limit <n>] [--json]",
      description: "this repo's saved sessions, newest first, matching every word (the default verb)",
      example: "epic session list --limit 3"
    },
    {
      name: "find",
      usage: "<name> [--json]",
      description: "the sessions titled <name>, or that worked in worktree <name>",
      example: "epic session find seo"
    },
    {
      name: "open",
      usage: "<id prefix | title>",
      description: "open a session in the VS Code Claude panel:  the window it runs in, else this one",
      example: "epic session open 055da582"
    },
    {
      name: "title",
      usage: "[<title>]",
      description: "this session's title;  with one, queued for its next prompt",
      example: 'epic session title "🚧 seo"'
    },
    {
      name: "done",
      usage: "[<name>]",
      description: "mark finished work's sessions ✅:  this one, or every session of <name>",
      example: "epic session done seo"
    },
    {
      name: "icons",
      usage: "[--dry-run]",
      description: "give every named session the icon its work's state calls for (🚧 📅 ✅ 🚨 ⏸️)",
      example: "epic session icons --dry-run"
    },
    {
      name: "window",
      usage: "[<pid>]",
      description: "the VS Code window id a process runs in (default this session's)",
      example: "epic session window"
    },
    {
      name: "transcript",
      usage: "<id prefix> [--json]",
      description: "another session's prompts, last reply and the question it's waiting on",
      example: "epic session transcript 055da582"
    },
    {
      name: "listen",
      usage: "[--json] [--monitor <pid>]",
      description:
        "one look at this session's epic page for it:  listen, say what's waiting (the plugin's monitor runs it)",
      example: "epic session listen"
    }
  ],
  park: [
    {
      name: "list",
      usage: "",
      description: "JSON:  every parked worktree's PARKED note:  its state and where it stopped",
      example: "epic park list"
    },
    {
      name: "candidates",
      usage: "",
      description: "JSON:  what /wait-for ? offers:  unfinished worktrees and epics, running sessions",
      example: "epic park candidates"
    },
    {
      name: "wait",
      usage: "<name> [--every <seconds>] [--max <seconds>]",
      description:
        "poll until <name> finishes, then print its status;  exit 0 finished, 2 time's up (run it again), 3 " +
        "nothing by that name",
      example: "epic park wait seo --every 60"
    }
  ],
  shared: [
    {
      name: "status",
      usage: "[--json] [--monitor <pid>]",
      description: "each checkout's links, and the shared repo's uncommitted files and last commit (the default verb)",
      example: "epic shared status"
    },
    {
      name: "init",
      usage: "[--import]",
      description: "create the shared repo;  --import copies this checkout's folders in",
      example: "epic shared init --import"
    },
    {
      name: "link",
      usage: "[--all]",
      description: "link this checkout's shared folders (--all:  every checkout's)",
      example: "epic shared link"
    },
    {
      name: "commit",
      usage: "[--session <id>] [--quiet]",
      description: "commit whatever changed in the shared repo, one commit per epic, guide or folder (every turn)",
      example: "epic shared commit --quiet"
    },
    {
      name: "migrate",
      usage: "<worktree> [--dry-run] [--json]",
      description: "move a worktree cut before the cutover onto the shared content",
      example: "epic shared migrate seo --dry-run"
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
      example: "epic window init"
    },
    {
      name: "move",
      usage: "[--dry-run]",
      description:
        "carry the window files once from the main checkout's workspaces/ to the windows folder " +
        "(epic config windowsFolder), each folder path rewritten;  the old files are kept",
      example: "epic window move --dry-run"
    },
    {
      name: "which",
      usage: "",
      description: "this session's VS Code window:  pid, workspace file, folders",
      example: "epic window which"
    },
    {
      name: "add",
      usage: "<path> [--name <name>]",
      description: "add a folder to the window (never a worktree's:  see the root AGENTS.md)",
      example: "epic window add ../other --name other"
    },
    {
      name: "remove",
      usage: "<path>",
      description: "remove that folder again",
      example: "epic window remove ../other"
    },
    {
      name: "show",
      usage: "<file> [--hash <id>] [--review]",
      description: "show an .html page in the window's side bar:  Spell Docs, or with --review the Review tab",
      example: "epic window show epics/seo/seo.plan.html --review"
    },
    {
      name: "reload",
      usage: "[--review]",
      description: "rebuild the side bar's view from scratch, at the page it shows",
      example: "epic window reload --review"
    },
    {
      name: "open",
      usage: "<name> [--pkg <pkg>] [--color <look>] [--no-open]",
      description: "open worktree <name> in a new window (--no-open:  only write its window file)",
      example: "epic window open seo --color purple"
    },
    {
      name: "launch",
      usage: "<name> [--pkg <pkg>] [--color <look>] [--prompt <text>]",
      description:
        "wake epic <name>:  its running session, else a NEW one in its open window (look untouched), else make " +
        "worktree <name> if needed, open its window, a NEW session there",
      example: 'epic window launch seo --prompt "/epic request seo r3"'
    },
    {
      name: "close",
      usage: "<name>",
      description: "close that window, delete its file",
      example: "epic window close seo"
    },
    {
      name: "handoff",
      usage: "<name> [--back] [--prompt <text>]",
      description: "move this session to <name>'s window when this turn ends",
      example: "epic window handoff seo --prompt continue"
    },
    {
      name: "resume",
      usage: "<record> [--title <title>]...",
      description: "the move itself:  the Stop hook runs it",
      example: "epic window resume ~/.spell-epic/windows/handoffs/<id>.json"
    },
    {
      name: "should-stay",
      usage: "[--epic] [--json]",
      description: "stay in this window when isolating, or move?  recommend stay|window, and why",
      example: "epic window should-stay --epic"
    },
    {
      name: "color",
      usage: "[<look>]",
      description: "give this window a look, Tomorrow Night Blue's in a hue;  no look:  list them",
      example: "epic window color purple"
    },
    {
      name: "stay",
      usage: "<name> | --end",
      description: "a session staying here for worktree <name>:  title and tint the window;  --end puts both back",
      example: "epic window stay seo"
    }
  ],
  server: [
    {
      name: "serve",
      usage: "[--port <n>]",
      description: "run this checkout's page server in the foreground, until Ctrl-C",
      example: "epic server serve"
    },
    {
      name: "start",
      usage: "[--all] [--port <n>]",
      description: "start it in the background if it isn't running;  --all:  every web server (editor, Spell UI too)",
      example: "epic server start --all"
    },
    {
      name: "ensure",
      usage: "[--port <n>]",
      description: "start it in the background if it isn't running, and print where it is",
      example: "epic server ensure"
    },
    { name: "stop", usage: "", description: "stop it", example: "epic server stop" },
    {
      name: "status",
      usage: "",
      description: "JSON:  where it runs;  exit 1 when it isn't",
      example: "epic server status"
    },
    {
      name: "url",
      usage: "<file>",
      description: "ensure it runs, then print the URL that serves <file>",
      example: "epic server url epics/seo/seo.plan.html"
    },
    {
      name: "prune",
      usage: "[--dry-run]",
      description:
        "stop the page and vite servers whose checkout is gone (a removal stops its own first;  every session's " +
        "start runs this, hourly)",
      example: "epic server prune --dry-run"
    }
  ],
  hub: [
    {
      name: "serve",
      usage: "[--port <n>]",
      description: "run the machine's epic server in the foreground, until Ctrl-C",
      example: "epic hub serve"
    },
    {
      name: "start",
      usage: "[--port <n>]",
      description: "start it in the background if it isn't running",
      example: "epic hub start"
    },
    {
      name: "ensure",
      usage: "[--port <n>]",
      description:
        "start it in the background if it isn't running (restarted when its code or repos changed), and print where it is",
      example: "epic hub ensure"
    },
    { name: "stop", usage: "", description: "stop it", example: "epic hub stop" },
    {
      name: "status",
      usage: "",
      description: "JSON:  where it runs and what it serves;  exit 1 when it isn't running",
      example: "epic hub status"
    },
    {
      name: "url",
      usage: "<file>",
      description: "ensure it runs, then print the URL that serves <file>, a page in a registered repo's content",
      example: "epic hub url epics/seo/seo.plan.html"
    }
  ],
  repo: [
    {
      name: "add",
      usage: "[<checkout>] [--name <name>] [--default]",
      description:
        "register the repo <checkout> is in (default:  this one) for the epic server;  --default:  served at /",
      example: "epic repo add ~/www/spell-app/spell-app --default"
    },
    {
      name: "list",
      usage: "[--json] [--monitor <pid>]",
      description: "every registered repo:  its URL prefix, checkout and content folder",
      example: "epic repo list"
    },
    { name: "remove", usage: "<name>", description: "unregister a repo", example: "epic repo remove spell-app" },
    {
      name: "default",
      usage: "<name>",
      description: "serve that repo at / (every repo is at /r/<name>/ too)",
      example: "epic repo default spell-app"
    }
  ],
  pages: [
    {
      name: "index",
      usage: "",
      description:
        "write the home page's area cards and each area's list page (epics, guides, sagas ...);  a missing one is made",
      example: "epic pages index"
    },
    {
      name: "update",
      usage: "[<page>...]",
      description: "check the docs pages against their template:  sections, links, the engine's assets",
      example: "epic pages update guides/greet.html"
    },
    {
      name: "create",
      usage: '<kind> <page> --title "..." [--dry-run]',
      description:
        "make a page from a template (durable, ...), at the right depth, and list it on its area's page;  " +
        "--dry-run:  say which template and page, write nothing",
      example: 'epic pages create durable guides/greet.html --title "How greet() works"'
    },
    {
      name: "template",
      usage: "[<name>]",
      description:
        "where a template is (spell-epic's templates/, the repo's own first:  repoTemplates);  " +
        "no name:  the templates folders",
      example: "epic pages template epics/plan-doc.md"
    },
    {
      name: "open",
      usage: "[<page>] [--vs | --review]",
      description: "show a page in Chrome, or in VS Code's side bar (--vs;  --review:  its Review tab)",
      example: "epic pages open epics/seo/seo.plan.html --review"
    },
    {
      name: "link",
      usage: '<page> [--hash <id>] [--text "..."] [--review] [--show]',
      description: "print a page's links for a reply:  the side bar's and the browser's;  --show:  show it too",
      example: "epic pages link epics/seo/seo.plan.html --hash p1 --review"
    },
    {
      name: "fuss",
      usage: "<path>... | --branch",
      description: "check the writing of pages and comments against the house rules",
      example: "epic pages fuss --branch"
    },
    {
      name: "voice",
      usage: "[<page>...] [--voice <name>] [--done <page>...] [--all] [--json]",
      description:
        "the guides a voice still has to go over (none named:  every guide), and the voice's file;  " +
        "--done:  stamp guides as gone over",
      example: "epic pages voice --done guides/server.html"
    },
    {
      name: "offline",
      usage: "[<page>...]",
      description: "what the docs pages load from the internet, for airplane mode",
      example: "epic pages offline"
    }
  ]
}

/**
 * A group of `epic`'s verbs:
 * - a docs tool or script passed through:
 *   `ask`, `choices`, `comments`, `notes`, `agents`, `airplane`, `window`, `server`
 * - a class of this folder:  `worktree` (`Worktrees`), `session` (`Sessions`), `park` (`Parking`), `shared` (`Shared`),
 *   `hub` (`Hub`), `repo` (`Repos`)
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
}
