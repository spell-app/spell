# The blog voice

How essays and posts are written:  an argument, told by a person, that a reader finishes because they want to.
Use it for any page that makes a case rather than documenting a system:
an essay on why a project exists, a launch or release post, a "why we built it this way" post, a website's story
page, a talk written up.

The reader's own repo adds its specifics on top:  its house style's writing rules, the names it never uses, its
checker.
Where the two disagree, the repo's rules win.

## 1. Who's reading

A curious person who arrived from a link, and will leave the moment the page stops paying them back.
- They may not program, or not in this project's world:  every term is explained the first time, in passing.
- They owe the page nothing.  A README reader came to do a job;  this one came to see if it's worth caring.
- They distrust a pitch, and they can smell one in the first paragraph.
- They want four things, in this order:
  1. something real, on the first screen, that surprises them
  2. the argument:  why this, why now, why not the obvious thing
  3. the honest part:  what it doesn't do yet, and who tried this before and failed
  4. a way in:  one thing to try, or one link to the manual

A second reader is a developer who will read on past the essay, into setup and reference.
Serve them with a clear line where the argument ends, and keep the manual's voice (the readme voice) below it.

## 2. Nine habits

**1. Open with the thing itself, and let the reader feel it.**
The first screen holds something real the reader can take in without help:  a few lines, a picture, a result.
Then one sentence that names what just happened to them.
- Like this:  three lines of a program, then "You just read a program.
  Nobody taught you its syntax, and you could explain it to a friend."
- Not this:  "In this post, we'll explore how plain-English programming could change who gets to make software."

**2. Make an argument, not a tour.**
An essay has a claim, and every section moves it forward:  the problem, the old answer, why it failed, what changed,
what that makes possible.
A section that only describes a part, and doesn't push the claim, belongs in the manual.
- Like this:  "Every other language asks you to learn to write it before you can read it.
  English turns that around:  you can READ a program on your first day, long before you could write one."
- Not this:  "The project has a parser, an editor, a component library and a command line."

**3. Prove each claim right after you make it.**
Every claim is followed, within a few lines, by the real code, output or picture that shows it.
An argument that runs two screens without evidence turns into a sermon, and the reader stops believing it.
- Like this:  "The language grows with the program", then the four lines that teach it a new phrase, then the rule
  in another file that uses that phrase "as if it had always been English".
- Not this:  three paragraphs on how the language "grows organically", and the example two sections later.

**4. Give the history its due, in one breath.**
Name who tried this before, what they got right, and why it didn't last;  then say what's different now.
A predecessor treated fairly makes the new claim believable.
Keep it short:  a paragraph or two, never the essay's main course.
- Like this:  "HyperCard had its own limits, and they were real:  it ran only on a Mac, it never met the network,
  its stacks were a binary format nothing else could open."
- Like this:  "There's an honest answer, and it's a graveyard.
  COBOL and AppleScript read like English too, and both taught the same lesson:  easy to read, hard to write."
- Not this:  a timeline from 1987 to today, one era a section.

**5. Say what's real and what's a bet, in bold, at the moment you make the bet.**
The essay is allowed to argue for a future;  it is never allowed to blur it with the present.
Where the argument reaches past what runs today, stop and say so, plainly, right there.
- Like this:  "**This is the direction, not a feature yet:  no AI feature ships in the editor today.**
  Today an agent writes the code, and you read it."
- Like this:  **Real today:** ...  **Not yet:** ...  **🌱 Coming:** ..., once, where the argument lands.
- Not this:  "With AI built in, anyone can now make software", when nothing is built in.

**6. Hand the reader something to do.**
A question to answer, a line to change, a command to run, early, before they're asked to install anything.
Participation beats persuasion:  a reader who got the answer right is already convinced.
- Like this:  "Try it now, before you install anything.  A card's direction is down.  Is it face up?",
  the answer in a fold.
- Like this:  "Its tests pass until you argue with them", then the one-word change and the real failing output.

**7. A person speaking, with turns of phrase that carry weight.**
First person, singular or plural, is fine;  so is talking straight to "you".
A good line is short and lands a point:  "it's a graveyard", "built the way it argues", "worth more than it was,
not less".
- Quote real people saying real things:  "_Why doesn't it do that already???_", heard at a talk, beats any line the
  writer could invent.
- One memorable line a section is plenty;  a line that is only clever, and carries no claim, goes.
- Never a metaphor the reader must decode, never at the reader's expense.

**8. Headings that tell the story.**
Read in a row, the headings are the argument's outline:  "The promise HyperCard made", "Why English, and not one more
syntax", "Then the machines started writing the code", "Change a sentence, and the running program changes".
- Each is a claim or a turn, never a label ("Background", "Motivation", "Features").

**9. Short paragraphs, and rhythm.**
A paragraph is one to four sentences;  put a short sentence after a long one, to land it.
- Prose carries the reasoning:  because, so, but, then.
- Bullets only for parallel things the argument names together:  a predecessor's limits, what's real today.
- ONE word in caps where the contrast lives (READ, MADE), a few a page at most.

## 3. The shape of a page

AN ESSAY (the case for a project, a website's story page):
1. **The hook:**  the thing itself, then the sentence that names what the reader just did.
2. **What it is,** in one or two sentences, and a link to skip straight to the manual.
3. **The problem and its history:**  who tried, what they got right, why it didn't last;  one breath.
4. **The turn:**  what changed, and why that makes the old idea work now.
5. **The proof:**  each claim of the turn shown working, a section each, with something to try.
6. **Where it stands:**  real today, not yet, coming, in bold.
7. **The way in:**  one thing to do next.
8. **The line,** if the manual follows on the same page:  "Everything below this line is the manual".

A POST (a release, a launch, "why we built it this way"):
1. **The hook:**  the change working:  a before and after, the new output, a screenshot.
2. **Why it matters,** in the reader's words, not the project's.
3. **The decision:**  the option it beat, and the reason, told as a short argument.
4. **The cost:**  what it breaks, what it doesn't do yet.
5. **Try it:**  the one command or link.

A SHORT POST (a note, an observation) keeps the hook, one argument with its proof, and its edge.

How long:
- An essay's argument, before the line, fits in about two to four screens.
  An essay that spends 190 lines on history before the reader can try anything has lost them.
- A link to skip to setup or the manual sits within the first two screens.
- Folds (`<details>`) hold the proof's long version and the "where this came from" notes;
  the page must read whole with every fold closed.

## 4. Symptoms of a lecture, and the cures

| Symptom | What it looks like | The cure |
| --- | --- | --- |
| The sermon | Two screens of argument, no code, no output | Cut to the claim;  put the evidence right under it. |
| The history lesson | A section per decade before the reader sees the thing | One breath:  who, what they got right, why it ended. |
| The pitch | "Revolutionary", "effortless", "anyone can" | The real output, and the edge beside it. |
| The future in present tense | "It writes your app for you", when that's the plan | Bold the line between real today and the bet. |
| The tour in disguise | "It has an editor, a parser, a library ..." | Pick the part that proves the current claim;  link the rest. |
| The throat-clearing | "In this post we'll ...", "Let's dive in" | Delete it:  start with the thing. |
| The strawman | A predecessor dismissed in a phrase | Its real strengths, then its real limits. |
| The label heading | "Background", "Overview", "Conclusion" | A heading that is a step of the argument. |
| The clever line with nothing in it | A joke or metaphor that makes no point | Cut it, or make it carry the claim. |
| The manual leaking up | Setup flags and file tables inside the argument | Below the line, or on the page that owns them. |

## 5. One home per fact

An essay borrows facts;  it never becomes their home.
- **The manual owns the facts:**  setup, commands, numbers, the parts of the system.
  The essay states the one it needs, in the same form, and links the page that owns it.
- **The argument is told ONCE:**  one essay per claim.  Another page says one sentence of it and links there.
- **Story and manual stay apart:**  an essay may borrow a README's example, but a README never borrows the essay's
  paragraphs, because one is the manual and the other is the story.
- **Each proof appears once on the page:**  the example that shows a claim isn't shown again two sections later;
  refer back to it.
- **A fact has one form:**  a number, a command or a name is spelled the same here as on the page that owns it,
  taken from the code or the command's output.
- **At the end, one way on:**  a link or two with the reason to follow each, not a list of everything.

## 6. Rules that aren't taste

- **Never claim what doesn't run.**  The argument may point at the future;
  the future is marked 🌱 or "Not yet", says where it stands, and has no date.
- **Every example is real:**  code that parses and runs, output copied from a real run, a picture of the real thing.
  Never invent an example to fit the argument;  find the real one, or change the argument.
- **Quotes are real:**  a person quoted said it, and the page says where.
- **Keep every fact** when rewriting:  every claim, example, quote, link and caveat survives, or is cut ON PURPOSE
  for a reason you name.
- **"People", not "users",** in what people read.
- **No file path in running prose:**  name the thing and link it.
- **Mechanics:**  the format the page is published in.
  In Markdown, a fold is `<details>`, then `<summary>`, then a BLANK line, then the body;
  every picture has an italic caption under it.

## 7. How to work

1. Read what exists:  the old page, the manual pages it borrows from, and the thing itself, running.
2. Write the argument in one sentence.  If you can't, there's no essay yet.
3. Plan the page in six words:  hook, problem, turn, proof, edge, way-in.
   List the headings alone, and read them as a story;  fix them until they are one.
4. For each claim, find its evidence before you write it:  run the code, copy the output, find the quote's source.
5. Write it.
6. Re-read it cold, as the reader in section 1, who can leave at any paragraph.
   At each one ask why they'd read the next:  cut what gives no reason, fold what proves a point twice.
   Name the three paragraphs where you'd stop reading, and rewrite them;  do that twice.
7. Run the repo's page checker, if it has one, and fix every finding.
8. Report:  the page, its lines before and after, the argument in one sentence, the facts you cut on purpose and why,
   what you couldn't verify, and one honest sentence on where it still reads like a lecture.
