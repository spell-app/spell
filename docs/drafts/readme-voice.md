# The README voice

How every README page of the Spell repos is written:  one engineer to another, with proof.
It's distilled from [final.md](final.md), the draft the owner chose out of eight (see [VOICES.md](VOICES.md) for the
contest).
Read that page end to end before you write a word of yours;  this guide says what to copy from it.

Files you work from, all in `docs/drafts/` of the kit (this checkout, `/Users/owen/www/spell.worktrees/readme`):
- [final.md](final.md):  the voice, on the kit's front page
- [reference/cli-help-tree.txt](reference/cli-help-tree.txt):  every `spell` command as it is now, and `epic --help`
- [tools/readme-compare.mjs](tools/readme-compare.mjs):  lists facts in the old page that your rewrite lost
- [tools/p14-check.mjs](tools/p14-check.mjs):  the page check (links, anchors, banned words ...) against the FINISHED
  layout, section 6
- [late-changes.md](late-changes.md):  what the repo-split session is still changing (things deleted, renamed epic
  verbs);  it overrides the fact base
- [reference/epic-help-tree.txt](reference/epic-help-tree.txt):  every `epic` verb, with the renamed ones

The FACT BASE for a page is its old version in the repo-split worktree, `/Users/owen/www/spell.worktrees/repo-split/`
plus the page's own path (`README-server.md`, `spell-lang/README.md`):
- it's the old-voice page, already moved to the finished layout (one `src/` per repo, imports by package name), by the
  session finishing repo-split
- READ it, and the code beside it, in that worktree;  NEVER write there, and never run `yarn`, a build, a test or a
  check there:  another session is working in it
- this checkout's own copy of a page is the older layout;  use it only for what the older one said and the newer lost

## 1. Who's reading

A developer who knows React, Vite, npm and git, and has 90 seconds.
They don't know Spell.
They distrust marketing, and "coming soon" dressed as a feature.
They want four things, in this order:
1. proof it's real:  actual code, actual output
2. a mental model, built from what they already know
3. the edges:  what isn't finished, what it costs
4. the next command to run

A second reader is a coding agent, who needs the same page to be exact about names, commands and paths.
Write for the first;  the second gets served by precision.

## 2. The voice:  eight habits

**1. Open with proof, not a definition.**
The first screen holds something real:  code, output, a picture.
A definition comes after, in terms the reader already has.
- Like this:  three lines of Spell, then "You just read a program.  Nobody taught you its syntax, and you could
  explain it to a friend."
- Not this:  "Spell is a programming language written in plain English, and the environment around it:  an editor,
  a command line, a library ..."

**2. Say the surprising thing plainly.**
If the reader's first suspicion is "that's probably a trick", answer it in the next sentence.
- "That isn't pseudo-code, and it isn't a prompt.
  A rule-based parser reads it the same way every time:  no model guessing what you meant."

**3. Explain by contrast with what the reader knows.**
React is the usual bridge, not the only one:  a parser page contrasts with parser generators and regular expressions,
the epic page with issue trackers and pull-request workflows, the language server page with editor plugins.
Pick the thing THIS reader brings, and say what's different.
- "Fast Refresh keeps your component's state across an edit.
  Spell keeps what the program MADE:  change a rule mid-game, and the cards stay on the table."
- "A React component is a function the framework calls;  the page never holds it.
  Here, `<ui-button>` is a node the page holds, like `<video>`."

**4. Be specific.**
Numbers, names, real output, the real file.
"About 75 ms for a thousand buttons" beats "fast", every time.
Use only numbers you measured, or the old page measured and you re-checked.
An adjective with no number behind it goes.

**5. Give every claim its edge.**
A section that makes a claim ends with where the claim stops:  "The unfinished part:  ...", "The cost:  ...",
"Not yet:  ...".
A claim without its edge reads as marketing, and this reader will stop trusting the rest.
When something is partly built, say so in bold, once, plainly:  **Real today:**  ...  **Not yet:**  ...

**6. One idea per sentence, short paragraphs.**
A paragraph is one to four sentences.
Put a short sentence next to a long one.
Bullets are for parallel facts, not for a paragraph chopped up.
Prose is for reasoning:  because, so, unless, instead.

**7. A little wit, never decoration.**
One dry line a page is plenty:  "this catches everybody once", "find the color line, and argue with it".
Never a metaphor that carries no information (a building tour, a kettle).
Never at the reader's expense.

**8. Capital letters, sparingly.**
The house habit:  ONE word in caps where the contrast lives (MADE, ONE, SOURCE, READ).
Not more than a few a page.

## 3. The shape of a page

A FRONT PAGE (a repo's README.md) runs:
1. **The hook:**  real code, real output or a picture, before any definition.
2. **What it is**, in two sentences, in the reader's terms.
3. **The proof:**  one real example with its real output;  the long version folded in an expand.
4. **The model:**  the two or three ideas that make the rest make sense, each by contrast ("If you know React, three
   things move").
5. **Do something:**  setup and things to try, every command with what it printed.
6. **The edges:**  what's unfinished, what it costs, what it doesn't do.
7. **The pages:**  ONE table of every page of the repo, with what's in each.
8. **🌱 Coming**, if anything is.

A TOPIC PAGE (`README-<topic>.md`) is the same shape at a smaller scale:  a hook, the model, how to use it, the
edges, then reference in tables and expands.

A REFERENCE PAGE (the command line, the checks, the settings) keeps 1, 2, 5 and 6, and puts the reference in tables,
one row per thing, each row clear by itself.
The voice lives in the lead paragraph of each section and in the edges, not in the table cells.

A page is as long as its facts need.
A front page may run 400 to 600 lines with the expands open, because a reader who stops after the first screens
should still leave oriented.
Expands (`<details>`) hold what a first reader skips;  the page must read whole with every expand closed.

## 4. Dry as dust:  the symptoms and the cures

| Symptom | What it looks like | The cure |
| --- | --- | --- |
| A list in disguise | "The toolchain has lint, format, decorators, declarations and folders." | Pick the one thing the reader meets first, and show it working. |
| The definition, again | The same "Spell is a ..." sentence at the top of every page | Say it once, on the kit's page.  Elsewhere, one clause of context, and a link. |
| Narrating the page | "This page covers ...", "In this section" | Delete it.  The headings do that job. |
| Adjectives for numbers | fast, lightweight, powerful, seamless | The measured number, or cut the sentence. |
| A claim with no edge | "Works from any framework." | Add what you checked and what you didn't. |
| Insider shorthand | alias names, epic names, phase numbers, "the fork" | Say what it MEANS, in words the reader has. |
| A label for a heading | "Overview", "Details", "Notes" | A heading that makes a claim:  "The packages are source, all the way down". |
| A table where reasoning belongs | Rows of "X: because Y" | Prose, with the because in it. |
| Prose where a table belongs | Ten sentences of "the flag `--a` does ..." | A table, one row per flag. |
| The same fact twice | A table of pages, then a list of the same pages, then See also | One home per fact (section 5). |

Before and after, to show the move (these are not text to copy):

```text
BEFORE  a package's front page, the dry way
  Spell UI is a library of web components.  It uses shadow DOM, cascade layers and OKLCH tokens.
  It supports popover, dialog and anchor positioning, and form-associated custom elements.

AFTER  the same facts, with the reader's world and a number in them
  A React component is a function the framework calls;  the page never holds it.
  Here, <ui-button> is a node the page holds, like <video>, with a component behind it drawing into a shadow root.
  It renders ONCE, then updates only the text node that read a changed value:  no second render, no diff.
  A thousand of them are built, rendered and ready in about 75 ms.
  The unfinished part:  Spell UI isn't on npm yet.
```

## 5. No redundancy:  one home per fact

The owner flagged this on the previous pages, and it's the easiest way for a page to go dry:
the same list, three times.
- **One index per repo:**  a single table, page | what's in it, where the "what's in it" cell carries the short list
  of what that page covers.
  No second list of the same pages below it, no "also beside it" line, no table plus bullets that say the same thing.
- **The kit's README owns** setup from zero, the map of the repos, the index of every page of every repo, and the
  introduction of WWOD.
  Every other page links there;  it never repeats them.
- **See also is curated:**  at most five links, each with the reason you'd follow it.
  Never a dump of the page's siblings.
  A page the reader reaches from the front page's table needn't be in See also unless it's the natural NEXT step.
- **A topic is explained on ONE page,** the one named for it.
  Other pages say one sentence and link.
- **A fact has one form:**  a number, a command or a name is spelled the same everywhere, and you got it from the
  code or the command's output, not from another page.
- When two sections of your page say the same thing, delete the weaker.

## 6. The rules that aren't taste

- **"Spell" is capitalised in text, like any name.**  "Spell reads English", "write Spell", "a Spell program".
  Lowercase `spell` appears only in code:  the command `spell`, the file extension `.spell`, `spell-lang`,
  `spell_core`, `@spell/core`, and fenced blocks.
  In prose, a repo or package name goes in code font (`spell-lang`) or is link text.
  `yarn readme:check` flags the rest.
- **spell-brand is not mentioned.**  It's an internal project.  No repo, no pack (`<brand-*>`), no theme, no brand
  pages, no "Brand UI", not in text, tables, diagrams or pasted output.
  If a feature only exists for it, cut the feature from the page.
  List every cut in your report, so the owner can restore one.
- **The card example is the card in the kit's `README.md` (its first example).**  Verbatim, tabs and all.
  Its compiled JavaScript, TypeScript and Python are in the same folder:  real output from
  `spell compile --stdout [--target ts/solid|py]` on a project named `solitaire` (so the element is
  `<solitaire-card>`).
  Any other Spell you show comes from a real file in the examples or the frozen test projects, or you ran it:
  `spell lint <folder>` must say ✓ before it goes in a page.
  Never invent Spell.
- **The finished repo-split is the truth.**  The CLI is exactly [reference/cli-help-tree.txt](reference/cli-help-tree.txt):
  no `spell dev`, `spell lint` not `check`, `spell app serve`, `spell app create`, `spell ssr`, `spell icon`,
  `spell speedtest`, `spell bundle`, `spell server`, no `explore`.
  Every repo's code is under ONE `src/` (`spell-kit/src/server/`, `spell-lang/src/parser/`);  every file is imported
  by its package name plus its path under `src/`, no extension (`spell-kit/util/string`,
  `spell-ui/components/ui-button`), from its own repo too:  no `$/`, no `#`, no `../`, no alias table.
  The assembler (`Linker`, `formatHTML()`, `Bundle`, `DataFile`) is part of the server:  `SRV.Linker`.
  Where the repo-split worktree's page and this checkout's differ in a path or a command, the worktree's is right.
  So there are NO "Until repo-split lands" folds, and no history of how the layout used to be.
- **Never claim what doesn't run.**  What's coming is marked 🌱 and says where it stands, with no date.
- **"People", never "users".**  The owner's name appears only in WWOD's expansion, "What Would Owen Do?", on the
  page that introduces WWOD, and in the sample address `owen@spell`.
- **No file path in running prose.**  Name the thing and link its file.
  A command or a path in a code span is fine.
- **Typography is the house's:**  two spaces after a colon, semicolon or full stop;  lines broken at phrases, under
  120 columns.
- **Mechanics:**  GitHub-flavoured Markdown.
  An expand is `<details>` then `<summary>`, then a BLANK line, then the body.
  Expands nest;  keep a blank line before and after each inner one.
  Mermaid blocks are drawn plain and get their look from `yarn mermaid:pretty`;  every picture has an italic caption
  under it.
  Links are relative.
  Never link into the content folder (`spell.epics`):  name a guide by its title and served path in a folded
  "More in the docs site" list, if at all.
- **Generated blocks stay intact:**  between `<!-- components:start -->` / `<!-- examples:start -->` markers, leave
  the lines alone.

## 6b. What stays from the old pages

Keep every fact.
Every command, number, link, table row, caveat and picture the old page had either survives (reworded, regrouped,
moved to the page that owns it) or is cut ON PURPOSE for one of these reasons, which you name in your report:
it repeated a fact stated elsewhere, it described how things used to be, it was about spell-brand, or it was wrong.
`node docs/drafts/tools/readme-compare.mjs <page>` shows what your draft lost against the repo-split worktree's copy.

## 7. How to work

1. Read [final.md](final.md) and the old page (the fact base, above), then the code and commands behind it.
2. Plan the page in six words:  hook, proof, model, do, edges, next.
3. Check anything you will state against the source:  read the file, count the lines, and run a command when it is
   read-only and exists in this checkout (`spell --help`, `spell parse ...`, `spell compile --stdout ...`);
   anything that depends on the finished layout, read in the repo-split worktree.
4. Write it, to the page's path in THIS checkout.
5. Re-read it cold, top to bottom, as the reader in section 1.
   At every paragraph ask what the reader DOES with it.
   Cut what they don't use;  fold what they use once.
6. Run `node docs/drafts/tools/readme-compare.mjs <page>` and `node docs/drafts/tools/p14-check.mjs <page>` (from
   this checkout's root;  NOT `yarn readme:check`, which checks against the old layout);  fix the findings.
   A `link` finding for a file that really isn't in the repo-split worktree is a wrong path:  fix it.
7. Report:  the page, its line count before and after, the facts you cut on purpose (and why), what the checker still
   says, anything you couldn't verify, and one honest sentence on where the page is still dry.
