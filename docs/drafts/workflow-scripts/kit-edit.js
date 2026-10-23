// Workflow({ scriptPath })   (no args)
// The kit's nine pages are written (kit-wave.js, two instances per page after a mix-up, then an account limit);
// this edits them:  one editor for README.md (the front door), one for the eight topic pages.
export const meta = {
  name: 'readme-kit-edit',
  description: "Edit the kit's nine README pages:  one editor for the front page, one for the eight topic pages",
  phases: [{ title: 'Edit', detail: 'two editors, Opus extra-high:  README.md, and the eight topic pages', model: 'opus' }],
}

const KIT = '/Users/owen/www/spell.worktrees/readme'
const SPLIT = '/Users/owen/www/spell.worktrees/repo-split'
const DRAFTS = KIT + '/docs/drafts'
const FIRST_RUN = '/Users/owen/.claude/projects/-Users-owen-www-spell/d5a307a4-0de5-4c43-817b-d113b0c12ede/subagents/workflows/wf_0995c249-564/journal.jsonl'

const BASE = `
You are an editor of the Spell kit's README pages, in ${KIT} (the kit's checkout;  child repos are inside it).  The kit's nine pages were written by parallel writers in a house voice the owner chose after a contest of eight drafts:  README.md, README-util.md, README-toolchain.md, README-server.md, README-element.md, README-cli.md, README-development.md, README-vscode.md, README-agents.md.

READ FIRST, whole:  ${DRAFTS}/readme-voice.md (the style guide), ${DRAFTS}/final.md (the voice itself), ${DRAFTS}/late-changes.md (what the repo-split session still changes:  it overrides the fact base).  Then the pages you edit, cold, in the order a newcomer meets them, to their very LAST line.

THE STATE OF THE PAGES:
- Two instances of each writer worked on every page at once (a mix-up), then an account spend limit stopped them before their last checks.  So a page may repeat a section, mix two tones, leave a table truncated, a sentence dangling, a <details> or code fence unclosed, or a heading that no section answers.  Find and fix those first.
- The writers' own reports (their cuts, their unverified claims, where they say the page is still dry) are in ${FIRST_RUN}:  one JSON line per finished writer, "type":"result";  read the lines for your pages.  Their "unverified" lists are claims for you to check against the code or a run, as many as you can.
- The fact base (the old-voice pages already at the finished layout's paths, and the code at the finished layout) is ${SPLIT}:  READ it, never write there, never run yarn, a build, a test or a check there.  The pages are written for the FINISHED layout (one src/ per repo, imports by package name), which this checkout lacks, so run the page check as  node docs/drafts/tools/p14-check.mjs <pages>  (NOT yarn readme:check).

THE OWNER'S COMPLAINTS, which you answer:
- "dry as dust" (about the earlier pages):  correct, complete, linked, and nobody keeps reading.
- "I'm seeing lots of redundancies in the pages -- e.g. 'Every Readme', then 'The kits' pages' below.  Merge them, with the bulleted lists in the table."
- "DITCH BRAND ENTIRELY from the rest of the docs.  That's really an internal project, and shouldn't be referenced externally.  Remove it from diagrams/etc."
- "Spell should always be capitalized in text, like English."
- The pages should be rich in <details> expands, pictures and links, and the first screens must make a stranger want the second.

WHAT TO DO TO EACH PAGE YOU OWN:
1. FINISH:  as above.
2. REDUNDANCY:  every fact, list, table or paragraph that appears on two pages, or twice on one, gets ONE home (guide, section 5);  the other gets a sentence and a link.  The kit's README.md owns setup, the map of the repos, the index of every README, WWOD and the command line's overview.
3. ONE VOICE:  for each page find the five dullest or most listy passages and rewrite them in the voice, keeping every fact.  Remove the writers' tics ("The unfinished part:" as a formula where there is no real edge, a joke per section, every page opening the same way).  Keep what is already good:  do not rewrite a paragraph that reads well.
4. VERIFY:  check the "unverified" claims you can, against the code in ${SPLIT} or a read-only run here;  correct what is wrong, and say so in your report.
5. RULES:  grep your pages for the word "brand" in any form (only Font Awesome's fa7-brands pack id may stay), lowercase "spell" in prose and in every alt="" and title="" attribute (the checker does not see those), "users", "Owen" (allowed only as "What Would Owen Do?" once, in README.md's WWOD section, and the sample address owen@spell), "$/", "spell dev", "Until repo-split", "six repos", "spell-folders", "alias hook", "packModuleKey", the old epic verbs (late-changes.md), an "Also beside it" line;  fix them.
6. CHECKS, from ${KIT}:  node docs/drafts/tools/p14-check.mjs <your pages>  (one call);  node docs/drafts/tools/readme-compare.mjs <page>  for each;  yarn mermaid:pretty <your pages> (it styles Mermaid blocks in place), then p14-check once more.  Put back any fact lost by accident;  fix every finding.  A "link" finding for a file that is not in the repo-split worktree is a wrong path.

You may rewrite any part of the pages you own, and you may READ the others' pages.  Do NOT edit a page you do not own;  if you find a problem in one, put it in your report.  Never write in ${SPLIT}.  Do not commit.  Return the report the schema asks for.
`

const EDITOR_REPORT = {
  type: 'object',
  properties: {
    pages: { type: 'array', items: { type: 'string' }, description: 'the pages you edited' },
    linesBefore: { type: 'number', description: 'total lines of your pages when you began' },
    linesAfter: { type: 'number', description: 'total lines of your pages now' },
    changes: { type: 'array', items: { type: 'string' }, description: 'what you changed, by page, one line each' },
    corrected: { type: 'array', items: { type: 'string' }, description: 'claims you found wrong and fixed, with how you checked' },
    movedFacts: { type: 'array', items: { type: 'string' }, description: 'facts you moved to the page that owns them, with from and to' },
    forTheOthers: { type: 'array', items: { type: 'string' }, description: 'problems in pages you do not own' },
    suspectedBugs: { type: 'array', items: { type: 'string' }, description: 'suspected bugs in the code you came across (for the suspected-bugs log), one line each, with the file and how to prove it' },
    checkerSays: { type: 'string', description: 'the last p14 check over your pages:  "clean", or the findings' },
    stillDry: { type: 'array', items: { type: 'string' }, description: 'pages and passages that are still dry' },
  },
  required: ['pages', 'linesBefore', 'linesAfter', 'changes', 'corrected', 'movedFacts', 'forTheOthers', 'suspectedBugs', 'checkerSays', 'stillDry'],
}

const FRONT = `
YOU OWN:  README.md only (the kit's front page).  Another editor owns the other eight pages.

THE PAGE:
- It is 810 lines with every expand open;  the target is about 600 to 650 (the first screens matter most, and a reader who stops there must leave oriented).  Trim by FOLDING and MOVING, not by deleting facts:  fold the FizzBuzz Python output and the spell test block;  the "Every file the kit tracks" fold and the CI/scripts material belong to README-development.md (the writer says it holds them now:  verify, then drop the duplicate here);  shorten the setup's printed output to the lines that teach.  Keep every one of:  the hook (the owner's card, verbatim) and its "What those sentences compile to" expand with the JavaScript, TypeScript and Python sub-expands (check them byte for byte against ${DRAFTS}/card-example/Card.spell.js, .ts and .py), the "What to notice" bullets, the three React contrasts, "Where it's going", "The five repos" with the picture docs/images/repos.svg, "Setup from zero" (complete for a Node novice), "Things to try", the kit's folders table, "The command line", "Working on it", "WWOD, the house style" (the ONE place the acronym is spelled out:  What Would Owen Do?), the 🌱 Coming panel.
- The fixed headings other pages link to:  "Setup from zero", "The five repos", "Every README", "The command line", "WWOD, the house style".  Do not rename them.
- THE INDEX, "Every README":  ONE table, a row per page of all five repos (the kit's 9, spell-parser's 7, spell-ui's 7, spell-epic's 6, spell-app's 6), the second column a short bulleted list on ONE line (<ul><li>..</li></ul>, since a Markdown table row cannot span lines).  Word every cell from the page's REAL headings now (grep '^#' each page;  the child repos' pages are being finished by other editors, so their headings may still change a little:  keep each cell about topics, not exact headings, and say so in your report).  No second list of the same pages below it, no "Also beside it".  Check that every file named exists in ${KIT} or, for the finished layout, in ${SPLIT}.
- At the end, at most five See-also links, each with its reason.
- Verify what you can of "Things to try" and the setup with read-only runs (spell parse, spell run ... --no-browser, spell compile --stdout ...);  the page says the printed counts will drift.
- Known by now:  with the card as written, "the card is the queen of spades" does not call isTheRankOfSuit (it compiles to a comparison with "spades".queen);  the page claims only that the method exists, which is true:  keep it that way and list the finding in suspectedBugs.
`

const TOPICS = `
YOU OWN:  README-util.md, README-toolchain.md, README-server.md, README-element.md, README-cli.md, README-development.md, README-vscode.md, README-agents.md.  Another editor owns README.md (the kit's front page, which indexes every page).  Do not rename a heading another page links to without fixing that link in the page you own;  README.md's links to your pages are by file name.

KNOWN WORK:
- README-agents.md has three broken anchors:  README-development.md#worktrees-and-windows, README-vscode.md#the-spell-epic-extension, spell-epic/README-adopting.md#the-config-file.  Point them at the real headings (the target pages are written;  spell-epic/README-adopting.md may be edited by someone else, so link to a heading that exists NOW).
- README-util.md:  its writer was interrupted while applying six corrections.  For each, check the page and apply it if it is not there:
  1. The hook (Solid's signal vs a Spell cell) was run against Solid's BROWSER build:  under plain node, \`import "solid-js"\` resolves to Solid's SERVER build, where the write is visible at once.  The caption "One run under node" must say it is Solid 2.0.0-rc.13's browser build.
  2. "\`set x to 1\` then \`print x\`" is not cells at work (\`spell repl\` compiles it to a plain constant).  The real write-then-read is in spell-parser's tests/spaces/@spell/test/solitaire/Card.spell, test "card setup":  \`turn the card face down\` then \`expect the direction of the card to be down\` (compiles to card.turnFaceDown(), whose first line is \`this.direction = "down"\`, then core.expect(card.direction, ...)).  Use that.
  3. "ten writes re-run a reader once" is TRUE with bridgeSolid() (a reader re-runs once after flushCells(); an equal write re-runs nothing);  observe() is the opposite:  ten writes, ten re-runs.
  4. The \`@proto static\` count "786" did not reproduce:  627 in the five repos' src/, 691 with their tests:  say "over 600".  "Every repo has lodash of its own" is wrong (spell-epic's package.json has none).  The lodash re-exports are five names:  toLower, lowerFirst, upperFirst, toSnakeCase, and a memoized snakeCase.
  5. In the ResponseError table:  for a status error, $fetch passes the response's text as the message, which REPLACES the default (an empty 404 body gives "");  the default messages show only when the error is built elsewhere.
  6. (For the owner, NOT for the page:  src/util/spell/AppPrefStore.ts carries a third party's proprietary copyright header inside the public MIT kit.  Do not mention it on the page;  put it in your report.)
- README-toolchain.md:  its second writer was adding things it verified:  the real <ui-code> lint hook, oxlint's and oxfmt's own timing lines, the real UIForm disable comment, and that CI does not check formatting.  If the page lacks them and you can verify each in a few minutes (read-only runs;  oxlint and oxfmt can be timed with their --help-free options in this checkout), add them where they teach;  if not, skip.
- README-element.md is 752 lines:  check it for two writers' overlaps (the <epic-question> hook and a <ui-container> example may both be there:  keep the one that teaches more, and the other only if it shows something different).
- README-cli.md has the kit's section on the epic command SHORT on purpose (spell-epic's README-cli.md owns the verbs):  keep it short, and verify against ${DRAFTS}/reference/epic-help-tree.txt.
- The kit's yarn scripts (kit:ts, kit:test ...) may change shape before the last repo-split step lands:  name them, say what each does in a clause, and quote no long printed output.

Cross-page:  setup, the repos map and WWOD are README.md's (link, never repeat);  the checks and tests are README-development.md's;  the decorator pre-pass is README-toolchain.md's;  the cells are README-util.md's;  the page server is README-server.md's;  the command reference is README-cli.md's;  VS Code is README-vscode.md's;  agents are README-agents.md's.
`

phase('Edit')
const [front, topics] = await parallel([
  () => agent(BASE + FRONT, { label: 'edit:kit README.md', phase: 'Edit', model: 'opus', effort: 'xhigh', schema: EDITOR_REPORT }),
  () => agent(BASE + TOPICS, { label: 'edit:kit topic pages', phase: 'Edit', model: 'opus', effort: 'xhigh', schema: EDITOR_REPORT }),
])
return { front, topics }
