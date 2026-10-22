export const meta = {
  name: 'readme-kit-wave',
  description: "Rewrite the kit's nine README pages in the chosen voice (nine Opus writers), then one editor pass over all nine",
  phases: [
    { title: 'Write', detail: 'nine writers, one page each, Opus extra-high (the front page at max)', model: 'opus' },
    { title: 'Edit', detail: 'one editor over all nine:  no repeated facts, one voice, checks clean', model: 'opus' },
  ],
}

const KIT = '/Users/owen/www/spell.worktrees/readme'
const SPLIT = '/Users/owen/www/spell.worktrees/repo-split'
const DRAFTS = KIT + '/docs/drafts'
const EPIC = '/Users/owen/www/spell/spell.epics/epics/readme'

const COMMON = `
You are one of nine writers rewriting the pages of the Spell kit's documentation, in a house voice the owner chose after a contest of eight drafts.  Your job is ONE page, named at the end.  Write it so the owner is proud of it.

READ, in this order, whole, before you write a word:
1. ${DRAFTS}/readme-voice.md:  the style guide.  Its habits, page shapes and rules are your brief.
2. ${DRAFTS}/final.md:  the voice itself, on the kit's front page.  Match its register, rhythm and honesty, not its sentences.
3. Your page's FACT BASE (below), and then the code, commands and files it describes.

THE PAGE'S READER:  a developer who knows React, npm and git and has 90 seconds;  after them, a coding agent that needs exact names, commands and paths.  The owner's verdict on the earlier pages was "dry as dust":  correct, complete, linked, and nobody keeps reading.  Your page must be one a developer WANTS to read to the end, and it must lose no fact.

THE OWNER'S ORDERS (these override anything older):
- Spell is always capitalised in prose, like an English name.  Lowercase spell appears only in code:  the command, the file extension, package names.
- spell-brand is an internal project and is not mentioned anywhere:  no repo, no pack, no theme, no pages, no pictures.  If a fact exists only for it, cut the fact and say so in your report.
- Repo-split is finished:  write for the finished layout (guide, section 6).  There are five public repos:  the kit, spell-lang, spell-ui, spell-epic, spell-app.
- No repeated lists:  where two lists say the same thing, make it one, and put short bulleted contents INSIDE the table rows.  One home per fact (guide, section 5).
- The pages are rich in <details> expands (a blank line after every <summary>), pictures (Mermaid, drawn plain;  or a hero SVG already in docs/images/) with italic captions, and links between pages.  Nothing is claimed that does not run.  What is coming is marked with 🌱 and never dated.
- Write well:  specific, honest, dry-witted where it earns it, every claim given its edge, short paragraphs, plain words.  A reader who knows other frameworks learns what is DIFFERENT here, and why.

WHERE THINGS ARE:
- This checkout (write here, and only here):  ${KIT}.  Your page goes at its path in this checkout, overwriting the old one.  Do not commit.  Touch no other file (a picture you draw for your page goes in docs/images/, named for the page).
- The fact base:  ${SPLIT}/<your page's path>.  That worktree is another session's:  READ it and its code (src/ ...), and NEVER write there, and never run yarn, a build, a test or a check in it.
- The epic's brief and outlines, written before the owner's last corrections (the guide wins where they disagree):  ${EPIC}/parts/o2.html (the writers' brief) and ${EPIC}/parts/o3.html (the kit's outlines);  research reports in ${EPIC}/research/ (explore-*.md).  Read-only.
- The card example, for any page that wants a real Spell snippet:  ${DRAFTS}/card-example/ (Card.spell, and what it compiles to).  Other Spell comes from real files (spell-app/spaces/@spell/examples/..., spell-lang/tests/spaces/...) and must pass "spell lint".
- The real commands:  ${DRAFTS}/reference/cli-help-tree.txt.

HOW TO WORK:  guide section 7.  In particular:  verify what you state;  after your first draft, re-read it cold, name its three dullest paragraphs, and rewrite them;  do that twice.  Then run these checks from ${KIT}:
  node docs/drafts/tools/readme-compare.mjs <your page>
  node docs/drafts/tools/p14-check.mjs <your page>
and, if the page has Mermaid pictures, run  yarn mermaid:pretty <your page>  (it styles them in place;  draw them plain first), then the p14 check again.  A "link" finding for a file that is not in the repo-split worktree is a wrong path:  fix it.  Every fact the compare tool lists as missing is either put back, moved to the page that owns it, or named as a deliberate cut in your report.

FIXED HEADINGS other pages will link to (keep these exact heading texts on the page that owns them):  kit README.md:  "Setup from zero", "The five repos", "Every README", "The command line", "WWOD, the house style".  README-cli.md:  "Setting it up", "The kit", "spell-lang", "spell-ui", "spell-app", "epic".

Return the report the schema asks for, after the page is on disk.
`

const PAGES = [
  {
    path: 'README.md',
    effort: 'max',
    brief: `YOUR PAGE:  README.md, the kit's front page and the front door of all of Spell.
Base:  ${DRAFTS}/final.md is the draft in the chosen voice, written before the owner's last corrections;  turn it into the FINAL page, using the fact base ${SPLIT}/README.md for every path, command and number (and verify them).  Keep what works in final.md (its hook, its three React contrasts, its "unfinished part" lines);  change what the owner asked:
1. THE HOOK is the owner's card example, verbatim (tabs and all), from card-example/Card.spell, in a spell code fence, with an italic caption that says what it is (a card, in Spell's outline style;  it compiles as written) and does NOT claim it is a file of the Solitaire example.  Then "You just read a program." and the argument that follows, rewritten for THIS example:  a suit that is one of four, a color worked out from it, a rank, a computed "is a face card", and two sentences that take arguments ("is a (rank)", "is the (rank) of (suit)").
2. "What those sentences compile to":  ONE expand, and inside it THREE sub-expands, JavaScript, TypeScript, Python, each holding the real compiled output from card-example/Card.spell.js, .ts and .py, whole and unchanged (say once, above them, that it is the output for a project named solitaire).  After the sub-expands, a short bulleted "What to notice" that points at specific lines of those outputs (the color getter;  the Python names;  the TypeScript types and the typed <solitaire-card> element).  To a programmer, this is the moment the page earns its keep:  make the notes sharp.
3. ONE index of every README of every repo, under "Every README":  a single table, a row per page, where the second column carries what is on the page as a short bulleted list.  Use an HTML list on ONE line inside the cell (<ul><li>..</li><li>..</li></ul>), because a Markdown table row cannot span lines.  This REPLACES both final.md's "Every README" table and its "The kit's pages, one line each" bullets.  The index is complete:  the kit's nine pages, spell-lang's seven, spell-ui's seven, spell-epic's six, spell-app's six, with the file names those pages actually have (see ${SPLIT} for each repo's files;  those pages are being rewritten right now in the same voice, so link the files and word each cell from the file name and the old page).  No "See also" dump of siblings:  at most five links, each with its reason.
4. Five repos, not six, and no word of spell-brand:  use docs/images/repos.svg as the hero picture (it already says "Five repos, one checkout"), and redraw the Mermaid "as text" fold with five repos.  Mention docs/images/six-repos.svg nowhere (the file goes).
5. No "Where Spell came from" history expand, no "Until repo-split P13/P14 lands" folds:  the finished layout is simply how it is.  Imports are package names plus the path under src/;  the assembler is part of the server.
6. The setup stays a complete, tested path for someone new to Node:  Node, corepack, clone, yarn install, yarn clone, Playwright's browser, yarn kit:test, each with what it prints (use the fact base's output, flagged as an example whose counts will drift).  Keep its three expands.  Things to try:  keep the five, each verified against the real command list (the editor is "spell app serve").
7. Keep:  the "If you know React, three things move" section (three subsections, each ending with its unfinished part or its cost), "Where it's going", the kit's folders table (the finished layout:  src/util ... src/cli, tests/, bin/, scripts/, tools/), "Working on it", the WWOD section (the ONE place the acronym is spelled out:  What Would Owen Do?), and the 🌱 Coming panel.
8. Length:  about 450 to 600 lines with the expands open.  The first screen must make a stranger want the second.`,
  },
  {
    path: 'README-cli.md',
    effort: 'xhigh',
    brief: `YOUR PAGE:  README-cli.md, the spell command line (and epic).  A REFERENCE page (guide, section 3):  the voice lives in the lead of each section and in the edges;  the reference itself is in tables, one row per command or option.
The CLI changed (repo-split P13):  the kit holds the base (src/cli/);  every installed repo adds its commands, named in its package.json;  "spell help" lists them grouped by repo.  Document the commands exactly as ${DRAFTS}/reference/cli-help-tree.txt shows them, and verify with  node bin/spell.mjs <command> --help  in this checkout (it has P13).
Make the first screen useful:  the one command that proves it works and what it prints;  then the shape (what a command line looks like, how a repo's commands arrive, how --all and group names like @spell/library work);  then the reference by repo.  The old page is about 980 lines;  the new one should be much tighter and still lose no command, option or fact:  option lists in tables, long examples in expands.
Include "Setting it up" (spell on your PATH:  yarn cli:install) and the epic command under its own heading "epic".  Mark what does not exist yet with 🌱.  There is no spell dev, no explore, no docs command.`,
  },
  {
    path: 'README-server.md',
    effort: 'xhigh',
    brief: `YOUR PAGE:  README-server.md, the page server and the page-writing steps (the assembler is part of the server, repo-split P14).  The word "assembler" never leads a section.  Contrast with what the reader knows:  Vite's dev server, Express, a static file server.  Hook idea:  one command and the URL it prints, or a request's path as a picture.  Keep the flows as numbered pictures, the URL table, the settings excerpt, the library table, and the short usage example with SRV.Linker and SRV.formatHTML.  Anchor every claim in the code (src/server/ in the fact base's worktree).`,
  },
  {
    path: 'README-element.md',
    effort: 'xhigh',
    brief: `YOUR PAGE:  README-element.md:  the element framework (src/element/), the element tools (src/element-tools/, the spell-pack bin) and the test helpers (src/test-helpers/), all three on this one page.  Your reader knows React:  contrast components, props, state, rendering and tests;  say what a custom element on Solid 2 is, what runs once and what updates, what the base class gives you, and what it costs.  Hook idea:  the smallest real element, in full, with what it does on the page.  Keep every table and recipe of the old page.`,
  },
  {
    path: 'README-toolchain.md',
    effort: 'xhigh',
    brief: `YOUR PAGE:  README-toolchain.md:  what every repo's checks share (src/toolchain/).  Reader:  a developer who has set up Vite, ESLint or Prettier, tsconfig and CI in other projects and wants to know what is different when five repos share ONE setup.  Hook idea:  one failing lint rule with its real message, or "yarn review" fanning out.  The finished repo-split has no alias table and no run-time alias hook where the old page described them:  describe what exists, not what was removed.`,
  },
  {
    path: 'README-util.md',
    effort: 'xhigh',
    brief: `YOUR PAGE:  README-util.md:  the helpers every repo shares (src/util/).  Reader:  a developer who wonders whether to reach for it or for lodash.  Hook idea:  the smallest decorator (@proto, @lazy) beside the code it replaces, or the reactive engine's write-then-read in four lines.  Keep the three layers, the files table and the rules of the folder.  Fix any stale claim you find, against the code.`,
  },
  {
    path: 'README-development.md',
    effort: 'xhigh',
    brief: `YOUR PAGE:  README-development.md:  working on Spell day to day.  Reader:  a contributor.  The checks (ts, lint, format, test, review) at the kit and over every repo, tests mirroring src/, CI, worktrees and epics for work across repos, the finishing pass.  Hook idea:  the loop of a real change, from branch to merged, in commands with what they print.  Keep every command, and verify them against ${SPLIT}/package.json.`,
  },
  {
    path: 'README-vscode.md',
    effort: 'xhigh',
    brief: `YOUR PAGE:  README-vscode.md:  VS Code and Spell:  the extension (spell-app/vscode), the editor settings, the workspace, the tasks and launch configs the repos ship, and any Claude panel conventions the old page has.  Reader:  a developer who opens the kit in VS Code and wants it to just work.  Hook idea:  what you see when you open the kit, or the extension doing one concrete thing.  Keep every setting and command, and verify them.`,
  },
  {
    path: 'README-agents.md',
    effort: 'xhigh',
    brief: `YOUR PAGE:  README-agents.md:  coding agents (Claude Code, Codex, others) working in Spell.  Reader:  someone who runs an agent on this code, and the agent itself.  What an agent reads first (CLAUDE.md, AGENTS.md, WWOD), the logs, the skills, and the epic method as the way agents and people plan together (Claude Code only, for now), what to do and what never to do.  Hook idea:  the first minute of an agent session in the kit.  Be exact:  agents read this page too.`,
  },
]

const WRITER_REPORT = {
  type: 'object',
  properties: {
    page: { type: 'string', description: 'the page, as a path from the kit root' },
    linesBefore: { type: 'number', description: 'lines of the fact base page' },
    linesAfter: { type: 'number', description: 'lines of your page' },
    cutOnPurpose: { type: 'array', items: { type: 'string' }, description: 'facts of the old page that are not in the new one, each with its reason (repeated elsewhere, history, brand, wrong)' },
    checkerSays: { type: 'string', description: 'what the p14 check printed at the end:  "clean", or the remaining findings' },
    unverified: { type: 'array', items: { type: 'string' }, description: 'claims you could not check against the source or a run' },
    stillDry: { type: 'string', description: 'one honest sentence:  where this page is still dry' },
    headings: { type: 'array', items: { type: 'string' }, description: 'the page\'s ## headings, as written' },
  },
  required: ['page', 'linesBefore', 'linesAfter', 'cutOnPurpose', 'checkerSays', 'unverified', 'stillDry', 'headings'],
}

phase('Write')
log('Nine writers, one page each')
const reports = (await parallel(PAGES.map(p => () =>
  agent(COMMON + '\n' + p.brief, { label: 'write:' + p.path, phase: 'Write', model: 'opus', effort: p.effort, schema: WRITER_REPORT })))).filter(Boolean)
log(reports.length + ' of ' + PAGES.length + ' pages written')

const EDITOR_REPORT = {
  type: 'object',
  properties: {
    changes: { type: 'array', items: { type: 'string' }, description: 'what you changed, by page, one line each' },
    movedFacts: { type: 'array', items: { type: 'string' }, description: 'facts you moved to the page that owns them, with from and to' },
    remainingIssues: { type: 'array', items: { type: 'string' }, description: 'problems you could not fix' },
    checkerSays: { type: 'string', description: 'the last p14 check over all nine pages:  "clean", or the findings' },
    stillDry: { type: 'array', items: { type: 'string' }, description: 'pages and passages that are still dry' },
  },
  required: ['changes', 'movedFacts', 'remainingIssues', 'checkerSays', 'stillDry'],
}

phase('Edit')
const editor = await agent(`
You are the editor of the Spell kit's nine README pages, just written by nine writers in parallel:  README.md, README-util.md, README-toolchain.md, README-server.md, README-element.md, README-cli.md, README-development.md, README-vscode.md and README-agents.md, all in ${KIT}.  Each followed ${DRAFTS}/readme-voice.md.  Read that guide and ${DRAFTS}/final.md first, then ALL nine pages, whole, in the order a newcomer would meet them.

The owner's complaints about the earlier pages:  "dry as dust";  and "I'm seeing lots of redundancies in the pages -- e.g. 'Every Readme', then 'The kits' pages' below.  Merge them, with the bulleted lists in the table."  Your job is the whole set, not one page.  The writers' reports (their cuts, their own checks, where they think they are still dry) are below.

1. REDUNDANCY:  find every fact, list, table or paragraph that appears on two pages, or twice on one, and give it ONE home (guide, section 5);  the other gets a sentence and a link.  The kit README owns setup, the map of the repos, the index of every README, and the introduction of WWOD.
2. THE INDEX:  README.md's "Every README" table lists every page of every repo, with the right file names (see ${SPLIT} for the other repos' pages), a cell for each page in a short bulleted HTML list, and nothing repeated below it.
3. ONE VOICE:  read each page cold as the reader in guide section 1.  For each page find the five dullest or most listy passages and rewrite them in the voice, keeping every fact.  Remove the writers' tics:  "The unfinished part:" as a formula where there is no real edge, a joke per section, every page opening with the same move.  Variety within the habits.
4. CROSS-LINKS:  every link among the nine pages resolves, anchors included;  the fixed headings exist (README.md:  Setup from zero, The five repos, Every README, The command line, WWOD, the house style;  README-cli.md:  Setting it up, The kit, spell-lang, spell-ui, spell-app, epic).
5. RULES:  grep all nine for "brand", for lowercase "spell" in prose (not in code spans, fences, link targets or package names), "users", "Owen" (allowed only as "What Would Owen Do?" once, in README.md's WWOD section, and in the sample address owen@spell), "$/", "assembler/" as a path, "spell dev", "Until repo-split", "six repos", "Fomantic";  fix them.
6. CHECKS:  from ${KIT} run  node docs/drafts/tools/p14-check.mjs README.md README-util.md README-toolchain.md README-server.md README-element.md README-cli.md README-development.md README-vscode.md README-agents.md  (one call) and  node docs/drafts/tools/readme-compare.mjs <page>  for each page;  put back any fact lost by accident and fix every finding.  Then  yarn mermaid:pretty <the nine>  so every Mermaid block is styled, and run the p14 check once more.
You may rewrite any part of any page.  Never write in ${SPLIT}.  Do not commit.  Return the report the schema asks for.

THE WRITERS' REPORTS:
${JSON.stringify(reports, null, 1)}
`, { label: 'edit:kit', phase: 'Edit', model: 'opus', effort: 'xhigh', schema: EDITOR_REPORT })

return { reports, editor }
