// Workflow({ scriptPath, args: { repo: "spell-parser" | "spell-ui" | "spell-epic" | "spell-app" })
// One child repo's README pages:  a writer per page (Opus), then one editor over the repo's set.
export const meta = {
  name: 'readme-repo-wave',
  description: "Rewrite one child repo's README pages in the chosen voice (a writer per page), then one editor pass over the repo's set",
  phases: [
    { title: 'Write', detail: 'a writer per page, Opus extra-high (the front page at max)', model: 'opus' },
    { title: 'Edit', detail: 'one editor over the repo:  no repeated facts, one voice, no brand, checks clean', model: 'opus' },
  ],
}

const KIT = '/Users/owen/www/spell.worktrees/readme'
const SPLIT = '/Users/owen/www/spell.worktrees/repo-split'
const DRAFTS = KIT + '/docs/drafts'
const EPIC = '/Users/owen/www/spell/spell.epics/epics/readme'

const REPO = args.repo
const REPOS = {
  'spell-parser': {
    outline: 'o4.html',
    research: 'explore-3-lang-cli.md (and explore-5-app-dev-wiki.md F, for the deep wiki\'s pictures)',
    reader: 'someone curious about the language itself:  a developer who has fought a parser generator, tried an LLM-written script, or wondered how a language that reads like English could be exact.  Contrast with parser generators and regular expressions, and with prompting a model.',
    pages: [
      { path: 'README.md', effort: 'max', brief: `The front page of Spell the language ("Spell is English you can run").  Follow the epic outline (parts/o4.html, README.md) as the plan, and the kit's README.md draft (docs/drafts/final.md) as the voice.  The hook is FizzBuzz, the whole program, then its JavaScript and Python side by side (verify them with spell compile --stdout);  the hero picture docs/images/languages-and-targets.svg already exists in the repo (keep it, check it for brand, caption it).  Include the generic-parser lead (670 of 670 spec examples for markdown, on the same parser), the pipeline picture, the pieces table (spell-parser's folders under src/, plus Rulex), what is NOT here, "Try it in two minutes" (every command verified, with what it prints), the language commands table (exactly the spell-parser commands in the help tree), "How Spell reads" in six bullets each shown BOTH ways (the sentence form and the outline form;  use the owner's card example from card-example/ for the outline form, and a REAL sentence-form card from a real file, checked with spell lint), the 🌱 Coming panel (Spanish, WebAssembly, mixins, Spell UI written in Spell, an agent that reads React or Python and rewrites it as Spell), and Working on it.  The history of the language goes only if it says something the kit's README does not.` },
      { path: 'README-parser.md', effort: 'xhigh', brief: `README-parser.md:  the generic rule-based parser.  Reader:  someone who has used a parser generator (PEG, ANTLR, a regex).  Contrast hard:  no grammar file, no generation step, rules are classes.  Keep one picture per stage, the scope chain, the sections in the owner's order (defining rules, working with matches, AST, output and bundling, running the output, creating parsers for other languages), the pets language, "Adding a rule" as a numbered recipe, and testing rules.  Follow the outline (parts/o4.html, README-parser.md).` },
      { path: 'README-rulex.md', effort: 'xhigh', brief: `README-rulex.md:  Rulex, regular expressions for words.  Keep the cheat sheet (every construct, with several examples:  syntax, inputs it matches, one it does not, what it compiles to), the three real rules, what it cannot say, and where it runs.  Verify every example by running it or reading its tests.  Reader:  someone who knows regexes.` },
      { path: 'README-markdown.md', effort: 'xhigh', brief: `README-markdown.md:  GitHub-flavoured markdown written as rules on the same parser.  Keep the verified calls with their output, the numbers (670 of 670 spec examples;  the speed and size comparison with marked:  re-check each number against the code or the spec test, or drop it), the picture, who uses it.  Reader:  a developer who has used marked or markdown-it.` },
      { path: 'README-spell.md', effort: 'xhigh', brief: `README-spell.md:  Spell itself as rules on the parser:  the rule modules (a table:  module, what it reads, an example line, an output line), what it reads (sentence and outline style, with the owner's card example;  every other snippet from a real file and spell lint clean), the compiler and the project model, the frozen test projects, "Adding a rule" as a recipe.  Reader:  someone who wants to know what the language can say, and how to extend it.` },
      { path: 'README-core.md', effort: 'xhigh', brief: `README-core.md:  the runtime compiled Spell runs on.  Keep the three things a reader trips on, each its own section with a worked example (reactivity, positions count from 1, the TypeScript and Python runtimes side by side), the pieces, and who may import it.  Reader:  a developer who reads compiled output and wants to know what core.* is.` },
      { path: 'README-targets.md', effort: 'xhigh', brief: `README-targets.md:  output targets (JavaScript on Solid, TypeScript on Solid, a TypeScript library, Python;  WebAssembly 🌱).  The kit's README.md already shows the owner's card compiled WHOLE to JavaScript, TypeScript and Python in nested expands:  do not repeat them;  link there, and show here what DIFFERS between targets, line by line (excerpts of the same compiled outputs in card-example/), plus the picture, the table of writers and their runtimes, and the output file names.  Reader:  a developer who wants to know what they get from each target and what each costs.` },
    ],
  },
  'spell-ui': {
    outline: 'o5.html',
    research: 'explore-4-ui-brand-epic.md (the spell-ui parts;  ignore everything about the brand repo)',
    reader: 'a developer who knows a component library and a framework (React, Vue, Svelte, Solid or none).  Contrast with their components:  a React component is a function the framework calls;  here <ui-button> is a node the page holds, with a component behind it drawing into a shadow root.',
    pages: [
      { path: 'README.md', effort: 'max', brief: `The front page of Spell UI.  Lead:  "Accessible, themeable web components that load themselves on demand, from plain HTML or any framework" (outline judgement call J1;  there is NO "Fomantic reborn" lede).  The hook is the thirty-second demo two ways (plain HTML page with one script and the import map;  and in a bundler program), written honestly:  Spell UI is not on npm yet, so mark the npm install lines 🌱 and show what works today from the kit.  Keep the hero picture of how a page loads its elements, the <ui-root> section (attributes table), component packs (ONE pack today:  the epics' pack;  no other), page-level CSS, the families table, using it from a framework (three lines and a link), other ways to load, install and working on it, and a two-line note on where the vocabulary comes from (Semantic UI and Fomantic UI), last, never the lede.  No brand pack, no brand theme, anywhere.  Follow the outline (parts/o5.html).` },
      { path: 'README-components.md', effort: 'xhigh', brief: `README-components.md:  the catalogue of every family, by topic, with tags and links.  The tables between the generated-block markers come from a script (yarn readme:components in spell-ui):  leave the generated lines alone and write the prose around them;  run the script to check the markers still work.  Where a small picture says more than a line, use the snapshots in docs/images/components/ if they exist.  Reader:  a developer choosing what to use.` },
      { path: 'README-runtime.md', effort: 'xhigh', brief: `README-runtime.md:  what is under the elements:  the UI runtime (one lazy chunk per page), vocabularies and localization, icons (with "Using another icon set":  what works today, and 🌱 what is coming), styles, the static render (spell ssr;  and "From Python, Flask or Quart":  what works, and 🌱 what is coming).  Reader:  a developer who wants to know what runs on their page and what it costs.` },
      { path: 'README-themes.md', effort: 'xhigh', brief: `README-themes.md:  theming, short on purpose, with 🌱 Coming for picking and making themes.  What ships:  the layer order, the token families, dark mode, the themes list (classic and the Fomantic ports, and Spell's own;  NO brand theme), UI.themes.apply(), and the four recipes (sitewide defaults, one component's defaults, applying a theme, restyling base styles through the app stylesheet).  Reader:  a developer who has themed Tailwind, MUI or CSS variables before.` },
      { path: 'README-frameworks.md', effort: 'xhigh', brief: `README-frameworks.md:  using Spell UI from plain JavaScript, React, Svelte, Solid and Vue.  The contract every framework meets (primitives as attributes, rich data as properties, ui-* events with detail, ready and custom states), one picture, then one section per framework in the same shape (install line, markup or JSX, events, the catch).  Svelte is NOT smoke-tested:  say "should work, standard contract" and nothing more.  Verify each snippet against the smoke pages (tools/frameworks/*.html in spell-ui).  Reader:  a developer in one of those frameworks who wants their snippet and their catch, fast.` },
      { path: 'README-migrating.md', effort: 'xhigh', brief: `README-migrating.md:  from Semantic UI, Fomantic UI or Semantic UI React.  The mapping (class grammar to attributes, a table of twenty common classes), what changes (shadow DOM, no jQuery, events, width not wide), from Semantic UI React (props, callbacks, no wrappers), and the migration tool as 🌱 Coming, clearly marked as not built.  Reader:  a developer with a Semantic or Fomantic page to move.` },
      { path: 'README-site.md', effort: 'xhigh', brief: `README-site.md:  the docs site (the component pages, the examples, the site scripts, how pages are generated).  Keep every script and path, verified.  Reader:  a contributor who wants to add or change a docs page.  Any brand page or brand pack is not mentioned.` },
    ],
  },
  'spell-epic': {
    outline: 'o7.html',
    research: 'explore-4-ui-brand-epic.md (C and D, the epic parts) and explore-5-app-dev-wiki.md E',
    reader: 'a developer who runs a project with an AI pair (Claude Code, today) and has lived with issue trackers, pull-request workflows and a chat scrollback.  Contrast with those:  the plan is a page that stays true.  The tool works with Claude Code ONLY for now:  say so plainly on the front page and where it matters.',
    pages: [
      { path: 'README.md', effort: 'max', brief: `The front page of spell-epic:  epics and sagas.  The hook:  what a session looks like (typing /epic and a name, the page appearing, a question with options, a mark, the answer landing on the page) or the hero picture docs/images/epic-life.svg (exists;  check it, caption it).  Keep the benefits (for you, for the agent, for the project), the words table, what the pages do, VS Code, how it is built from Spell UI and the epics' elements, beyond Spell (adopting it, honestly labelled), commands, working on it.  The history of the switch-over goes.  Follow the outline (parts/o7.html).` },
      { path: 'README-pages.md', effort: 'xhigh', brief: `README-pages.md:  what a reader meets on an epic page, section by section, and how the review works (marks, picks, comments, bullhorns, test runs, colours and fills, saga/details/choice pages, the epic-* components).  Screenshots exist or can be taken (see the old page and docs/images/).  Reader:  someone about to review their first epic page.` },
      { path: 'README-skills.md', effort: 'xhigh', brief: `README-skills.md:  the skills a person types and the hooks that run without being asked.  Verify the counts and every skill and hook against skills/*/SKILL.md and hooks/hooks.json in the fact base's repo.  Reader:  someone choosing which skill to reach for.` },
      { path: 'README-cli.md', effort: 'xhigh', brief: `README-cli.md:  the epic command, in full (the kit's README-cli.md has a SHORT section on it that links here, so this page owns the groups and the addressing).  Tables per group, every row clear by itself, written from ${DRAFTS}/reference/epic-help-tree.txt (generated from the repo-split worktree's epic, so it has the RENAMED verbs:  epic create, lint, status, update ... underway|done|noted, inbox watch|ignore, window should-stay;  the old names do not work).  Reader:  someone who wants the exact command.` },
      { path: 'README-vscode.md', effort: 'xhigh', brief: `README-vscode.md:  the epic extension:  the Review and Epic Docs views, the window bridge, building and installing it by hand.  Verify settings and commands against the extension's package.json.  Reader:  someone setting it up.` },
      { path: 'README-adopting.md', effort: 'xhigh', brief: `README-adopting.md:  using spell-epic in a project that is not Spell:  the four commands, the config file, the content folder, the extension, and the honest label (it ran once outside Spell;  list the rough edges).  Today's paths and commands only;  no history of the move.  Reader:  a developer who wants to try it on their own project.` },
    ],
  },
  'spell-app': {
    outline: 'o8.html',
    research: 'explore-5-app-dev-wiki.md (A and B)',
    reader: 'the front page is for someone who does NOT program:  an AI-assisted live programming environment for people who do not call themselves programmers.  Its first half must be readable by someone who has never programmed (no jargon without a plain explanation, pictures before prose);  the developer material comes after a clear line ("If you want to work on Spell itself").  The other pages are for developers.  The voice habits (proof first, specifics, every claim given its edge) apply to all of them.',
    pages: [
      { path: 'README.md', effort: 'max', brief: `The front page of the Spell app.  The hook:  the live loop, shown (the screenshot docs/images/examples/todos-form-based.png, and the hero picture docs/images/live-loop.svg;  both exist, caption them).  Lead:  you write (or ask an AI to write) a program in English and it runs beside the text as you type;  what the AI made is readable, checkable and changeable, not a black box.  Keep spaces, organizations and people (right after the lead), what you can do today, THE AMBITION in its own section with every stub clearly 🌱 (drag and drop:  building a program by placing Spell UI components and setting their properties;  shared editing:  several people in one project, each copy kept in step, running program first, then the source;  AI in the editor:  explain, write, fix, translate), the folders, setup from zero (point at the kit's page;  add only what is the app's:  yarn start and what it prints, yarn cli:install, spell app vscode, Python needs uv), the examples table, working on it.  No history section.  Follow the outline (parts/o8.html).` },
      { path: 'README-app.md', effort: 'xhigh', brief: `README-app.md:  the editor and the runners:  the web app, the editor store, the runner (runCompiled, keepThings), the four web components (<spell-app>, <spell-editor>, <spell-code>, <spell-markdown>) and how to embed them, the builds.  Reader:  a developer who wants to embed or extend the editor.` },
      { path: 'README-spaces.md', effort: 'xhigh', brief: `README-spaces.md:  where projects and people live:  spaces, addresses (keep the grammar block), the numbered recipe "Setting up spaces for your project" with what each step prints, the models, the servers, the Python server (its own section), people and orgs, 🌱 coming (orgs, sign-in, sharing).  Verify the recipe by reading the code (do not create projects in the fact base's worktree).  Reader:  someone who wants their own project in the app.` },
      { path: 'README-examples.md', effort: 'xhigh', brief: `README-examples.md:  the example apps and ideas for yours.  The tables and screenshots between the generated-block markers come from a script (yarn examples:readme in spell-app):  leave the generated lines alone, write the prose around them and the walkthroughs;  run the script to check the markers still work.  Only the finished examples.  Reader:  someone choosing which example to open first.` },
      { path: 'README-lsp.md', effort: 'xhigh', brief: `README-lsp.md:  the language server (and the VS Code extension that runs it):  what it gives an editor (errors, hover, completion, outline ...), how it is built on the parser's scope, how the editor and the command line share it.  Reader:  a developer who has written or used a language server.` },
      { path: 'README-page-server.md', effort: 'xhigh', brief: `README-page-server.md:  the page server's settings in spell-app (the route modules spell-app contributes to the kit's page server, which runs spell-epic's routes by settings, never importing it).  Keep every setting and route, verified.  Reader:  a developer who wants to know what the server serves and how to add a route.` },
    ],
  },
}

const CFG = REPOS[REPO]
if (!CFG) throw new Error('args.repo must be one of ' + Object.keys(REPOS).join(', ') + ';  got ' + REPO)

// args.only:  write just these pages (paths within the repo), e.g. ["README.md"];  default all of the repo's.
// args.edit:  false skips the editor pass.
// args.writerNote:  extra text for every writer;  args.editorNote:  extra text for the editor.
const ONLY = Array.isArray(args.only) ? args.only : null
const TO_WRITE = ONLY ? CFG.pages.filter(p => ONLY.includes(p.path)) : CFG.pages
const EDIT = args.edit !== false
const WRITER_NOTE = args.writerNote ? '\nA NOTE FOR YOU:  ' + args.writerNote + '\n' : ''
const EDITOR_NOTE = args.editorNote ? '\nA NOTE FOR YOU:  ' + args.editorNote + '\n' : ''
// the first run's reports (the writers that finished before an account limit stopped it)
const JOURNALS = '/Users/owen/.claude/projects/-Users-owen-www-spell/d5a307a4-0de5-4c43-817b-d113b0c12ede/subagents/workflows/'
const FIRST_RUN = { 'spell-parser': 'wf_53d101d4-de6', 'spell-ui': 'wf_7eb5e832-7f1', 'spell-epic': 'wf_70347c17-89a', 'spell-app': 'wf_8c07efb1-7fa' }

const COMMON = `
You are one of the writers rewriting the README pages of ${REPO}, in a house voice the owner chose after a contest of eight drafts.  Your job is ONE page, named at the end.  Write it so the owner is proud of it.

READ, in this order, whole, before you write a word:
1. ${DRAFTS}/readme-voice.md:  the style guide.  Its habits, page shapes and rules are your brief.
2. ${DRAFTS}/final.md:  the voice itself, on the kit's front page.  Match its register, rhythm and honesty, not its sentences.  (The kit's nine pages are written in this voice and own setup from zero, the map of the five repos, the index of every README and WWOD.  Link to them;  never repeat them.  ${KIT}/README.md is the best model of the voice, and ${KIT}/README-util.md and ${KIT}/README-element.md show it on topic pages.)
3. ${DRAFTS}/late-changes.md:  what the repo-split session is still changing (the alias hook, spell-folders and packModuleKey are gone;  pack module keys are npm names;  the epic verbs were renamed).  It OVERRIDES the fact base.
4. Your page's FACT BASE (below), and then the code, commands and files it describes.

THE PAGE'S READER:  ${CFG.reader}
After them, a coding agent that needs exact names, commands and paths.  The owner's verdict on the earlier pages was "dry as dust":  correct, complete, linked, and nobody keeps reading.  Your page must be one a reader WANTS to read to the end, and it must lose no fact.

THE OWNER'S ORDERS (these override anything older):
- Spell is always capitalised in prose, like an English name.  Lowercase spell appears only in code:  the command, the file extension, package names.
- spell-brand is an internal project and is not mentioned anywhere:  no repo, no pack (<brand-*>), no theme, no pages, no pictures, not in a "needs" list.  If a fact exists only for it, cut the fact and say so in your report.
- Repo-split is finished:  write for the finished layout (guide, section 6).  There are five public repos:  the kit, spell-parser, spell-ui, spell-epic, spell-app.  The CLI is exactly the help tree (no spell dev).
- No repeated lists:  where two lists say the same thing, make it one, and put short bulleted contents INSIDE the table rows.  One home per fact (guide, section 5).  Your page ends with at most five "See also" links, each with its reason, never a dump of siblings;  the repo's front page has ONE table of the repo's pages.
- The pages are rich in <details> expands (a blank line after every <summary>), pictures (Mermaid, drawn plain;  or a drawn SVG in the repo's docs/images/) with italic captions, and links between pages.  Nothing is claimed that does not run.  What is coming is marked with 🌱 and never dated.
- Where a card appears, it is the owner's card, from ${DRAFTS}/card-example/ (outline style, verbatim).
- Write well:  specific, honest, dry-witted where it earns it, every claim given its edge, short paragraphs, plain words.

WHERE THINGS ARE:
- This checkout (write here, and only here):  ${KIT}.  Your page goes at ${KIT}/${REPO}/<page>, overwriting the old one (${REPO} is a git repo of its own inside this checkout;  do not commit).  Touch no other file;  a picture you draw goes in ${KIT}/${REPO}/docs/images/.  A generated block between marker comments is regenerated by a script, so the lines between the markers stay as they are.
- The fact base:  ${SPLIT}/${REPO}/<page>.  That worktree is another session's:  READ it and its code, and NEVER write there, and never run yarn, a build, a test or a check in it.  Its pages are the old voice, already at the finished layout's paths.
- The epic's brief and outline, written before the owner's last corrections (the guide wins where they disagree, and where they mention the brand repo, ignore it):  ${EPIC}/parts/o2.html (the writers' brief) and ${EPIC}/parts/${CFG.outline} (this repo's outline);  research reports in ${EPIC}/research/:  ${CFG.research}.  Read-only.
- The real commands:  ${DRAFTS}/reference/cli-help-tree.txt (spell) and ${DRAFTS}/reference/epic-help-tree.txt (epic, with its renamed verbs).  Run spell from this checkout:  node ${KIT}/cli/bin/spell.mjs  (or spell, if it is on the PATH), and verify what you state.  Other Spell comes from real files and must pass "spell lint".
- What the checker catches, so you do not trip it:  the word "brand" in ANY form, plain English too ("a brand's colours":  say company, product or identity;  only Font Awesome's fa7-brands pack id is exempt);  a lowercase "spell" as a word ("spell out" the verb counts:  reword it) and in an image's alt text, which it does not see:  look yourself;  an "Also beside it" line (delete its continuation lines too);  the words of what repo-split deletes.

HOW TO WORK:  guide section 7.  In particular:  verify what you state;  after your first draft, re-read it cold, name its three dullest paragraphs, and rewrite them;  do that twice.  Then run these checks from ${KIT}, with the page's path from the kit root (${REPO}/<page>):
  node docs/drafts/tools/readme-compare.mjs ${REPO}/<your page>
  node docs/drafts/tools/p14-check.mjs ${REPO}/<your page>
and, if the page has Mermaid pictures, run  yarn mermaid:pretty ${REPO}/<your page>  (it styles them in place;  draw them plain first), then the p14 check again.  A "link" finding for a file that is not in the repo-split worktree is a wrong path:  fix it.  Every fact the compare tool lists as missing is either put back, moved to the page that owns it, or named as a deliberate cut in your report.

LINKS TO THE KIT (the kit's pages sit one folder up from yours):  setup is ../README.md#setup-from-zero, the repos map ../README.md#the-five-repos, the index ../README.md#every-readme, the command line ../README-cli.md#setting-it-up (and ../README-cli.md#spell-parser, #spell-ui, #spell-app, #epic), WWOD ../README.md#wwod-the-house-style, development ../README-development.md.  Links to the other repos' pages are relative too (../spell-ui/README-runtime.md).

Return the report the schema asks for, after the page is on disk.
`

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
log(REPO + ':  ' + TO_WRITE.length + ' writers')
const reports = (await parallel(TO_WRITE.map(p => () =>
  agent(COMMON + WRITER_NOTE + '\nYOUR PAGE:  ' + p.path + '\n' + p.brief, { label: 'write:' + REPO + '/' + p.path, phase: 'Write', model: 'opus', effort: p.effort, schema: WRITER_REPORT })))).filter(Boolean)
log(reports.length + ' of ' + TO_WRITE.length + ' pages written')

const EDITOR_REPORT = {
  type: 'object',
  properties: {
    changes: { type: 'array', items: { type: 'string' }, description: 'what you changed, by page, one line each' },
    movedFacts: { type: 'array', items: { type: 'string' }, description: 'facts you moved to the page that owns them, with from and to' },
    brandRemoved: { type: 'array', items: { type: 'string' }, description: 'every brand mention or picture you removed or redrew' },
    remainingIssues: { type: 'array', items: { type: 'string' }, description: 'problems you could not fix' },
    checkerSays: { type: 'string', description: 'the last p14 check over the repo\'s pages:  "clean", or the findings' },
    stillDry: { type: 'array', items: { type: 'string' }, description: 'pages and passages that are still dry' },
  },
  required: ['changes', 'movedFacts', 'brandRemoved', 'remainingIssues', 'checkerSays', 'stillDry'],
}

phase('Edit')
const pageList = CFG.pages.map(p => REPO + '/' + p.path).join('  ')
const editor = !EDIT ? null : await agent(`
You are the editor of ${REPO}'s ${CFG.pages.length} README pages, written by parallel writers:  ${pageList}, all in ${KIT}.  Each followed ${DRAFTS}/readme-voice.md.  Read that guide and ${DRAFTS}/final.md first, then ALL the repo's pages, whole, in the order a newcomer would meet them.  The facts base is ${SPLIT}/${REPO} (read-only;  never write or run anything there).

THEIR STATE:  an account spend limit stopped the writers before they finished their own last checks, so each page may be unfinished toward its end.  Read to the very last line of every page, and finish what you find:  a truncated table, a dangling sentence, an unclosed <details> or code fence, a half-edited section, a heading no section answers.  The reports of the writers who did finish are in ${JOURNALS}${FIRST_RUN[REPO]}/journal.jsonl (one JSON line per finished writer, "type":"result":  read each page's cutOnPurpose, unverified and stillDry);  the rest are below.  Their "unverified" lists are the claims you should check against the code or a run, as many as you can.
${EDITOR_NOTE}
The owner's complaints about the earlier pages:  "dry as dust";  and "I'm seeing lots of redundancies in the pages -- e.g. 'Every Readme', then 'The kits' pages' below.  Merge them, with the bulleted lists in the table."  And:  "DITCH BRAND ENTIRELY from the rest of the docs.  That's really an internal project, and shouldn't be referenced externally.  Remove it from diagrams/etc."  And:  "Spell should always be capitalized in text, like English."  Your job is the whole set, not one page.  The writers' reports (their cuts, their own checks, where they think they are still dry) are below.

1. REDUNDANCY:  find every fact, list, table or paragraph that appears on two pages, or twice on one, and give it ONE home (guide, section 5);  the other gets a sentence and a link.  The front page has ONE table of the repo's pages, with short bulleted contents inside the cells, and no second list of the same pages;  word each cell from the page's REAL headings now, not from its old file.  The kit's pages (setup, the repos map, the index of every README, WWOD, the command line) are linked, never repeated.
2. ONE VOICE:  read each page cold as the reader in guide section 1 (and in this repo's brief:  ${CFG.reader}).  For each page find the five dullest or most listy passages and rewrite them in the voice, keeping every fact.  Remove the writers' tics:  "The unfinished part:" as a formula where there is no real edge, a joke per section, every page opening with the same move.  Variety within the habits.
3. BRAND:  grep the repo's pages AND its docs/images/*.svg (text inside the pictures) for "brand";  remove or redraw every hit (a picture that names the brand repo is redrawn or its row removed;  keep the picture's look).  Also check "needs" lists, tables of packs and themes, and the repo list in diagrams.
4. CROSS-LINKS:  every link among the repo's pages, to the kit's pages and to the other repos' pages resolves, anchors included (links to the kit's anchors:  ../README.md#setup-from-zero, #the-five-repos, #every-readme, #the-command-line, #wwod-the-house-style;  ../README-cli.md#setting-it-up, #the-kit, #spell-parser, #spell-ui, #spell-app, #epic).
5. RULES:  grep the repo's pages for lowercase "spell" in prose (not in code spans, fences, link targets or package names) and in every alt="" and title="" attribute (the checker does not see those), "users", "Owen" (allowed only as the sample address owen@spell), "$/", "spell dev", "Until repo-split", "six repos", "Fomantic reborn", "assembler/" as a path, "spell-folders", "alias hook", "packModuleKey", and the old epic verbs (epic new / check / stock, inbox listen, window stay-check:  see ${DRAFTS}/late-changes.md), and fix them.  Read ${DRAFTS}/late-changes.md first.
6. CHECKS:  from ${KIT} run  node docs/drafts/tools/p14-check.mjs ${pageList}  (one call) and  node docs/drafts/tools/readme-compare.mjs <page>  for each page;  put back any fact lost by accident and fix every finding.  Run the repo's generator if its pages have a generated block (spell-ui:  yarn readme:components;  spell-app:  yarn examples:readme) and check it leaves the pages as they are.  Then  yarn mermaid:pretty <the pages>  so every Mermaid block is styled, and run the p14 check once more.
You may rewrite any part of any page.  Never write in ${SPLIT}.  Do not commit.  Return the report the schema asks for.

THE REPORTS OF THE WRITERS OF THIS RUN:
${JSON.stringify(reports, null, 1)}
`, { label: 'edit:' + REPO, phase: 'Edit', model: 'opus', effort: 'xhigh', schema: EDITOR_REPORT })

return { repo: REPO, reports, editor }
