# The readme voice

How a repo's READMEs and an epic's guide are written:  one engineer to another, with proof.
Use it for any page a developer reads to understand, set up or change the code:
a repo's front page (`README.md`), a topic page (`README-<topic>.md`), an epic's guide, a reference page.

The reader's own repo adds its specifics on top:  its house style's writing rules, the names it never uses, its
checker.
Where the two disagree, the repo's rules win.

## 1. Who's reading

A developer who knows the common tools of the trade (for a web repo:  React, npm, git) and has 90 seconds.
- They don't know THIS project.
- They distrust marketing, and "coming soon" dressed as a feature.
- They want four things, in this order:
  1. proof it's real:  actual code, actual output
  2. a mental model, built from what they already know
  3. the edges:  what isn't finished, what it costs
  4. the next command to run

A second reader is a coding agent, who needs the same page to be exact about names, commands and paths.
Write for the first;  the second gets served by precision.

## 2. Eight habits

**1. Open with proof, not a definition.**
The first screen holds something real:  code, output, a picture.
The definition comes after, in terms the reader already has.
- Like this:  three lines of code, then "You just read a program.  Nobody taught you its syntax."
- Not this:  "X is a framework for building Y, and the environment around it:  an editor, a command line ..."

**2. Say the surprising thing plainly.**
If the reader's first suspicion is "that's probably a trick", answer it in the next sentence.
- "That isn't pseudo-code, and it isn't a prompt.  A parser reads it the same way every time."

**3. Explain by contrast with what the reader knows.**
Pick the thing THIS reader brings, and say what's different.
React is a common bridge, not the only one:  a parser page contrasts with parser generators,
a planning tool with issue trackers and pull requests, a language server with editor plugins.
- "Fast Refresh keeps your component's state across an edit.  This keeps what the program MADE."
- "A React component is a function the framework calls;  the page never holds it.  Here, `<ui-button>` is a node
  the page holds, like `<video>`."

**4. Be specific.**
Numbers, names, real output, the real file.
"About 75 ms for a thousand buttons" beats "fast", every time.
- Use only numbers you measured, or an old page measured and you re-checked.
- An adjective with no number behind it goes.

**5. Give every claim its edge.**
A section that makes a claim ends with where the claim stops:  what isn't finished, what it costs, what it won't do.
A claim without its edge reads as marketing, and this reader stops trusting the rest.
- Vary how the edge is said:  "The catch:", "Not yet:", a plain sentence.
  A formula repeated in every section is a tic, not a voice.
- Partly built:  say so in bold, once, plainly:  **Real today:** ...  **Not yet:** ...

**6. One idea per sentence, short paragraphs.**
A paragraph is one to four sentences;  put a short sentence next to a long one.
- Bullets for parallel facts, never a paragraph chopped up.
- Prose for reasoning:  because, so, unless, instead.

**7. A little wit, never decoration.**
One dry line a page is plenty:  "this catches everybody once".
Never a metaphor that carries no information, never at the reader's expense.

**8. Capital letters, sparingly.**
ONE word in caps where the contrast lives (MADE, ONE, SOURCE, READ), a few a page at most.

## 3. The shape of a page

A FRONT PAGE (a repo's `README.md`):
1. **The hook:**  real code, real output or a picture, before any definition.
2. **What it is**, in two sentences, in the reader's terms.
3. **The proof:**  one real example with its real output;  the long version folded in an expand.
4. **The model:**  the two or three ideas that make the rest make sense, each by contrast.
5. **Do something:**  setup and things to try, every command with what it printed.
6. **The edges:**  what's unfinished, what it costs, what it doesn't do.
7. **The pages:**  ONE table of every page of the repo, the second column a short bulleted list of what's on it.
8. **🌱 Coming**, if anything is.

A TOPIC PAGE (`README-<topic>.md`) is the same shape smaller:  a hook, the model, how to use it, the edges, then
reference in tables and expands.

A REFERENCE PAGE (a command line, the settings) keeps the hook, what it is, do something and the edges, and puts the
reference in tables, one row per thing, each row clear by itself.
The voice lives in each section's lead and in the edges, not in the table cells.

AN EPIC'S GUIDE is a topic page about what the epic BUILT, for someone who wasn't there:
1. **The hook:**  the thing working:  a command and what it printed, a screenshot, the before and after.
2. **What it is and why:**  two sentences;  the problem it solved, in the reader's words, not the epic's ids.
3. **How to use it:**  each feature the way a reader meets it, with its real output.
4. **How it works:**  the model, by contrast, and a picture where one says it faster.
5. **Why it's built this way:**  the decisions that would surprise a reader, each with the option it beat.
6. **Limits:**  the open caveats, plainly.
7. **Where things are:**  a table of the files and commands, each linked.
- It never narrates the epic ("in P3 we ..."):  phase and item ids go in one folded "History" note at the end, if at
  all.

How long:
- As long as its facts need.  A front page may run 400 to 600 lines with every expand open, because a reader who
  stops after the first screens should still leave oriented.
- Expands (`<details>`) hold what a first reader skips;  the page must read whole with every expand closed.

## 4. Dry as dust:  the symptoms and the cures

| Symptom | What it looks like | The cure |
| --- | --- | --- |
| A list in disguise | "It has lint, format, decorators, declarations and folders." | Pick the one thing the reader meets first, and show it working. |
| The definition, again | The same "X is a ..." sentence on every page | Say it once, on the front page;  elsewhere a clause and a link. |
| Narrating the page | "This page covers ...", "In this section" | Delete it:  the headings do that job. |
| Adjectives for numbers | fast, lightweight, powerful, seamless | The measured number, or cut the sentence. |
| A claim with no edge | "Works from any framework." | Add what you checked, and what you didn't. |
| Insider shorthand | alias names, epic names, phase numbers, "the fork" | Say what it MEANS, in words the reader has. |
| A label for a heading | "Overview", "Details", "Notes" | A heading that makes a claim:  "The packages are source, all the way down". |
| A table where reasoning belongs | Rows of "X:  because Y" | Prose, with the because in it. |
| Prose where a table belongs | Ten sentences of "the flag `--a` does ..." | A table, one row per flag. |
| The same fact twice | A table of pages, then a list of the same pages, then See also | One home per fact (section 5). |

## 5. One home per fact

The easiest way for a set of pages to go dry is the same list, three times.
- **One index per repo:**  a single table of its pages, the "what's in it" cell a short bulleted list.
  No second list of the same pages below it, no "also beside it" line.
- **The front page owns** setup, the map of the parts, the index, and the house style's introduction;
  every other page links there and never repeats them.
- **A topic is explained on ONE page,** the one named for it;  others say a sentence and link.
- **See also is curated:**  at most five links, each with the reason you'd follow it, never a dump of siblings.
- **A fact has one form:**  a number, a command or a name is spelled the same everywhere, taken from the code or the
  command's output, not from another page.
- Two sections saying the same thing:  delete the weaker.

## 6. Rules that aren't taste

- **Never claim what doesn't run.**  What's coming is marked 🌱, says where it stands, and has no date.
- **Keep every fact** when rewriting:  every command, number, link, table row, caveat and picture survives
  (reworded, regrouped, moved to the page that owns it), or is cut ON PURPOSE for a reason you name:
  it repeated a fact stated elsewhere, it described how things used to be, or it was wrong.
- **Show only real output and real code:**  run it, or copy it from a file or a test snapshot.
- **"People", not "users",** in what people read.
- **No file path in running prose:**  name the thing and link its file;  a path in a code span or a table is fine.
- **Links:**  relative within a repo;  a link into ANOTHER repo is its full URL (on GitHub each repo stands alone, so
  a relative path into a sibling repo 404s there).
- **Mechanics:**  GitHub-flavoured Markdown.
  An expand is `<details>`, then `<summary>`, then a BLANK line, then the body;  expands nest.
  Every picture has an italic caption under it.
- **Generated blocks stay intact:**  the lines between a generator's marker comments are its own.

## 7. How to work

1. Read the old page and the code and commands behind it.
2. Plan the page in six words:  hook, proof, model, do, edges, next.
3. Check anything you will state against the source:  read the file, run the read-only command, count the lines.
4. Write it.
5. Re-read it cold, top to bottom, as the reader in section 1.
   At every paragraph ask what the reader DOES with it:  cut what they don't use, fold what they use once.
   Name the three dullest paragraphs and rewrite them;  do that twice.
6. Run the repo's page checker, if it has one, and fix every finding.
7. Report:  the page, its lines before and after, the facts you cut on purpose and why, what you couldn't verify,
   and one honest sentence on where the page is still dry.
