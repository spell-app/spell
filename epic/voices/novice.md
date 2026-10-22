# The novice voice

How a page is written for people who don't program, or not yet:  what the thing does for them, told so they can
follow it and try it.
Use it for any page whose first reader has never built software:
a project's landing page and the top of its front page, a "your first ..." walkthrough, an explainer of one idea,
a page of words and what they mean.

The reader's own project adds its specifics on top:  its house style's writing rules, the names it never uses, its
checker.
Where the two disagree, the project's rules win.

## 1. Who's reading

Someone curious, with an afternoon and something they want to make.
- They may have written a spreadsheet formula, or half a tutorial, or nothing at all.
- They use AI tools, and have run code an AI wrote without reading it, because they couldn't.
- A word they don't know stops them;  a wall of text loses them;  a thing they can DO keeps them.
- They want four things, in this order:
  1. to see it work, on someone like them
  2. a move of their own, on the first screen
  3. what's going on, in words they already have
  4. the truth about what works today, and the next step

A second reader is a developer who arrived at the same page.
Serve them after a clear line, never above it:  the top of the page belongs to the first reader.

## 2. Nine habits

**1. Open on a person, not a product.**
The first lines are a scene:  someone with a want, the thing in their hands, the moment it surprises them.
A name and one detail are enough;  the definition comes after.
- Like this:  "Maya has never written a program.
  She wants a game of solitaire, so she asks an AI for one ...
  She opens the file expecting gibberish, and finds sentences."
- Not this:  "X is a programming language you can read, and the environment around it:  an editor, a command line,
  a library ..."

**2. Show the real thing, then say what the reader just saw.**
Right after the scene, the real artefact:  the actual code, the actual screen, unedited.
Then one plain sentence saying what it means, and why that's unusual.
- "She can tell what that says, which is more than most of us could say about the first program we ever saw."
- For a longer example, a table of each line and what it says beats a paragraph about all of them:
  `its direction is up or down` | "It lies face up or face down, and nothing else."

**3. Hand the reader the move.**
Whatever the person in the scene did, the reader can do next, on the same screen.
If doing it needs an install, give them a move that needs none first, and say plainly where the install is.
- Like this:  "**Your move:**  open the game, choose the deck file, and change that line."
- Or, with nothing installed:  "What color is the queen of spades?  Can a card lie on its side?
  To make the clubs red instead, which line would you change?", the answers folded below.
- Not this:  a command they can't run yet, with "no tool yet?  setup is eight steps" as the escape hatch.

**4. Explain every word the first time it appears, in the sentence that needs it.**
A term the reader doesn't have gets a short clause, then the sentence carries on.
Mark the word once, in caps or bold, so they can find it again.
- "Spell first turns them into JavaScript, the language every web browser runs:  that step is called COMPILING."
- "Each command goes in a TERMINAL, the window where you type commands to your computer."
- Not this:  "a rule-based parser with no grammar file", above the line, with nothing to hold on to.
- Once a word is explained, use it plainly;  never explain it twice on one page.

**5. Show what happens, the failure too.**
Every step ends with what the reader will see:  the screen, the output, the change.
Show the wrong turn as well, because a reader who breaks something and can read why has learned the most.
- "Two seconds later the editor has compiled her sentence, and the clubs and spades on the table have turned red,
  in the game she was already playing, every card still where she left it."
- "She has just made it wrong, and she can read why", then the real output:
  `` ❌ Unexpected: `its color` should be `black` but is actually `red` ``, then "Change the line back, and both tests
  pass again."

**6. Tell them, early and plainly, what works today.**
A reader who can't judge a promise trusts the page completely, so the page must earn it.
The big idea and its limit sit together, near the top, in bold, once.
- "Not all of Maya's afternoon runs yet, so here is the honest version:
  **Real today:**  the language, the editor that runs as you type ...
  **Not yet:  the editor has no AI of its own.**"
- What's coming says so, and stops there:  "This is the direction, not a feature yet."

**7. One step at a time, one picture per idea.**
Short sentences, one to three to a paragraph, and numbered steps for anything done in order.
A picture wherever one says it faster, each with a caption saying what to look at.
- "_The editor:  a card file on the left, the game running on the right, the program's output below._"
- A diagram for the reader is four or five boxes in their words ("your sentences", "the editor runs it"),
  captioned with what they do and what the tool does:  "_You write the first box;  the tool does the rest._"

**8. Warm and direct, never cute, never down.**
Respect the reader:  they're new, not slow.
A little lightness is welcome when it's true ("she does what nobody does with code they didn't write:  she argues
with it"), never a joke at the reader's expense.
- Never "simply", "just", "easy" or "obviously":  each one tells a stuck reader it's their fault.
- "You" for the reader, the person's name for the story;  never "the user".

**9. Let the story go when it stops helping.**
The scene carries the first screens;  setup, reference and the developer material don't need it.
Bending every heading back to the person ("Retrace her afternoon", "She would never clone six repos") strains it.
- Mention them again only where it shows something new:  "Maya changed one line of her game.
  Changing the tool itself is the same loop, one level down."
- Then draw the line, plainly:  "Everything above the line is for anyone;  below it is for people working on the
  code itself."

## 3. The shape of a page

A FRONT PAGE, or the top of one (a landing page, a repo's front page shared with developers):
1. **The scene:**  a person, a want, the real thing in their hands, one surprise.
2. **The payoff:**  their change, and what happened on the screen;  a captioned picture.
3. **What it is**, in two sentences, in the reader's words, and the honest version:  real today, not yet.
4. **Your move:**  the same change, for the reader;  a move needing no install first, if one exists.
5. **What's going on:**  how it works, a short diagram and each new word explained.
6. **Getting it on your computer:**  numbered steps, each with what it printed when it worked.
7. **More to try:**  three to five things, each one command and what it showed.
8. **🌱 Where it's going:**  the direction, marked as the direction.
9. **The line,** then the developer material, in the project's reference voice.

A WALKTHROUGH ("your first ..."):
1. **What you'll have at the end:**  a picture of it, or its output.
2. **What you need:**  each thing named and explained in one clause, with where to get it.
3. **The steps:**  numbered, one action each, with what you'll see after it.
4. **If it went wrong:**  the two or three errors people really hit, what each looks like, and the fix.
5. **Where next:**  one or two pages, each with the reason you'd go.

AN EXPLAINER (one idea:  what compiling is, why tests matter):
1. **The question,** in the reader's words.
2. **An everyday picture** of it, then the real thing beside it.
3. **The words** it needs, each explained once.
4. **What it means for you,** and where it stops.

How long:
- The first screen does the most work:  scene, real thing, a move.
  A reader who stops there should know what the thing is and have touched it.
- The part above the line reads in about ten minutes;  below it, as long as its facts need.
- Expands (`<details>`) hold answers, long output and optional detail;  the page must read whole with every expand
  closed.

## 4. Lost the reader:  the symptoms and the cures

| Symptom | What it looks like | The cure |
| --- | --- | --- |
| The definition first | "X is a framework for ..." as the first line | The scene and the real thing first;  the definition after, in two sentences. |
| A word nobody explained | parser, repo, compile, target, in passing | One clause the first time, in the sentence that needs it. |
| A step they can't take | a command on the first screen, before any install | A move that needs nothing, and a plain pointer to setup. |
| The developer's bridge, too early | "If you've used React and a compiler ..." above the line | Move it below the line. |
| Narrating the page | "This page starts from zero, for anyone curious" | Delete it:  start from zero instead. |
| The caveat in a caption | three lines of which-file-it-came-from under the example | One short caption;  the provenance in a fold or a footnote. |
| A wall of text | four sentences of how it works, no picture | Steps, a picture, one idea a paragraph. |
| The talking-down word | simply, just, easy, obviously | Cut it. |
| A promise the reader can't check | "AI writes it for you" | Real today and not yet, side by side, in bold. |
| The story stretched | every heading bent back to the person in the scene | Let it go after the first screens (habit 9). |
| Output with no meaning | a block of output, then the next step | One line on what to notice in it. |

## 5. One home per fact

A novice page goes wrong two ways:  it repeats itself, or it sends the reader to find the rest.
- **The story is told ONCE,** on the front page;  other pages may name the person, never retell the scene.
- **A word is explained once a page,** at its first use;  a page of words, if the project has one, holds them all,
  and pages link a word there instead of re-defining it.
- **Setup lives on one page,** or one section;  every "you need it installed" points there.
- **"Where it's going" has one home:**  the big idea's honest version is said once, and pages link to it.
- **See also is curated:**  at most five links, each with the reason a reader would follow it.
- **A fact has one form:**  a version, a command or a name is spelled the same everywhere, taken from the code or the
  command's output, not from another page.

## 6. Rules that aren't taste

- **Never claim what doesn't run.**  This reader can't tell, so the line is drawn for them:  what's coming is marked
  🌱, says it's the direction, and has no date.
- **Every example the reader can try, works.**  Run it, check it parses, copy the output from a real run;
  where the page can run an example in place, let it.
- **Keep every fact** when rewriting:  every command, number, link, table row, caveat and picture survives
  (reworded, moved below the line, moved to the page that owns it), or is cut ON PURPOSE for a reason you name.
- **"People", not "users",** in what people read.
- **No file path in running prose:**  name the thing and link its file;  a path in a code span or a table is fine.
- **Links:**  relative within a repo;  a link into another repo is its full URL.
- **Mechanics:**  GitHub-flavoured Markdown, or the site's own markup.
  An expand is `<details>`, then `<summary>`, then a BLANK line, then the body.
  Every picture has an italic caption under it, saying what to look at.

## 7. How to work

1. Read the old page, and try the thing yourself, from nothing, as the reader would.
2. Find the scene:  who wants what, which real line they read, what they change, what happens.
3. Plan the page in six words:  scene, payoff, honest, move, how, next.
4. Run every command and example you'll show, and copy the real output.
5. Write it.
6. Re-read it cold, as someone who has never programmed:
   - circle every word they'd stop at, and explain or cut it
   - at every step, ask what they SEE, and whether the page says so
   - find the three densest paragraphs and split them, or turn them into steps or a picture
7. Run the project's page checker, if it has one, and fix every finding.
8. Report:  the page, its lines before and after, the words you explained, the facts you moved below the line or cut
   (and why), and one honest sentence on where a newcomer would still get stuck.
