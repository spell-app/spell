---
name: details
description: Explain a question on a DETAILS PAGE in VS Code's right side bar, and let the person answer ON the page -- for a call that needs a picture (table, real code, diagram, live example) or more than the AskUserQuestion modal holds (4 options per question, 4 questions).  Use for `/details [topic]` ("show me that as a page"), and on your own whenever a question you're about to ask needs more than the modal.
argument-hint: "[topic]"
---

# /details

In Codex:  each step that needs a Claude Code tool says what Codex does instead, in a line like this one
(the long form:  `epic guide claude-only-tools`);  `${CLAUDE_PLUGIN_ROOT}` is the epic plugin's folder, `epic guide --root`.

A DETAILS PAGE:  a small page that explains one decision.
- It shows in the "Review" view:  VS Code's right side bar, beside "Epic Docs", where the person answers things.
  - In Cursor:  the same view, wherever the person put it (**View: Open View...** › Review).
- The person picks on the page, and clicks Send.
- The page server writes their answer beside the page,
  and a waiter running in the background exits with it, which wakes this session.
- Docs:  the details guide, the content folder's `guides/details.html`.

- Explain as [plan-doc.md](${CLAUDE_PLUGIN_ROOT}/templates/epics/plan-doc.md), "Explaining a question or issue", says:
  - plain words, coined words defined
  - the real code, tables
  - options side by side, one recommended

## Writing for the person

The person may run 5+ epics at once (Owen does), and reads a page cold, coming from another session.

Dense, terse pages make them ask "what do you mean?" (Owen, 2026-10-03), so:
- The "Where we are" box first, every time:
  - which epic or session
  - what that work is for (one line)
  - what just happened
  - what this choice changes for them
- Every question stands alone:  say what it's about in plain words BEFORE the options,
  as if nothing above it was read.
- Short sentences, one idea per line, bullets over paragraphs.
  Not caveman:  full words, the articles back in.
- No bare internal ids (`J1`, `T3`, `D6`, `C1`), phase numbers or file names.
  - Say what the thing is ("the call I made about how option cards are built").
  - Add the id after, in brackets, for reference.
- Options say what they'd SEE or GET, and the cost, not how it's built.
  How it's built goes in the folded details.
- A concrete example per option:  what the page, the command or the output would look like.

## 1. Page or modal?
In Codex:  "the modal" below is the chat:  a question that fits it is asked there, its options numbered;
the page is the same for both agents.

- Fits the modal (every question 4 options or fewer, 4 questions or fewer) AND needs no picture:
  the modal, as always.  No page.
- Fits the modal, but a picture would help the person decide:  a PICTURE PAGE (no questions on it), then the modal.
  Its option labels match the page's.
- Doesn't fit (more than 4 options, more than 4 questions, or answers that need typing):
  an ANSWER PAGE.  The person answers on it.
- The person typed `/details [topic]`:  the topic as a page, any choice in it answerable there.
  With no topic:  the question just asked, or the thing being discussed.

## 2. Make the page

1. `epic ask create <slug> --title "<Title>"`:  prints the page's path.
   - Many questions of one shape (a list to pick from):  `--from <spec.json>` builds the whole page from data instead.
     - The data:  title, lede, "Where we are", context, questions and their options.
     - Its shape:  `DetailsSpec`, in [details.js](https://github.com/spell-app/spell/blob/main/epic/src/tools/details.js).
     - `/worktrees` and `/bedtime` use it.
   - In an epic (an epic page this session keeps):  add `--epic <name>`.
   - A question asked before (a page for it is there already):  NOT a new page, `epic ask round` ("Asking the same
     question again", below).
     - The page goes in `epics/<name>/details/`, beside the epic page
       (shared content, committed for you at the turn's end).
     - The decision it leads to links it.
   - Else scratch:  `pages/details/`.
     - Ignored by the shared repo too.
     - Swept after 14 days (`new` sweeps).
   - `<slug>`:  lower-kebab-case, about the decision (`answer-path`, `card-layout`), unique.
2. Edit the page (the template's placeholders show where):
   - lede:  what's being decided, and why now
   - meta:  "Asked by:  session `<name>`, while <doing what>"
   - the "Where we are" box:  filled in, never left as the template's placeholder ("Writing for the person")
   - `1. Context`:  the picture.
     - Page widgets:  [epics' AGENTS.md](${CLAUDE_PLUGIN_ROOT}/src/AGENTS.md), "Writing a page"
       (tables, code folded, pros / cons, steps ...).
     - Icons only from `ICONS`, in [bundle-spell-ui.js](https://github.com/spell-app/spell/blob/main/epic/src/tools/bundle-spell-ui.js).
   - one `<ui-section>` per question, holding an `<epic-ask>`:
     - ids `q1`, `q2` ..., header `Q1 · Short question`
     - the epics pack's elements, as an epic page's question is (epic `epic-workflow` P12)
     - each element has its page in Epic UI, `/components/epics/`

     ```html
     <ui-section id="q1" label="Q1 · Which card layout?" sticky collapsible dividing>
       <ui-icon slot="icon" name="circle question"></ui-icon>
       <epic-ask>
         <epic-question><p>The question in full, one or two lines.</p></epic-question>
         <epic-choices>
           <epic-option letter="A" title="Stacked cards" recommended>
             <p>One line:  what changes, why recommended.</p>
             <epic-aside title="Details"><!-- folded:  table, code, picture --></epic-aside>
           </epic-option>
           <epic-option letter="B" title="Side by side">
             <p>One line:  what changes, its cost.</p>
           </epic-option>
         </epic-choices>
       </epic-ask>
     </ui-section>
     ```

     - letters `A`, `B` ...
     - the recommended one FIRST, with `recommended`
     - `title`:  2-5 words
     - the summary:  one line;  everything longer in an `<epic-aside title="Details">` (it folds)
     - pick several:  `multiple` on the `<epic-ask>` (tick boxes);  else pick one (round ones)
     - The elements draw the rest:
       - each option, its tick box and a comment box
       - each question, an "Other" box and its state chip
       - Send, in the sticky header (`<epic-send>`, in the template)
     - Written into the page (the template has them):
       - a comment box last in every other section with no section inside it:  `<epic-text-box for="<section id>">`
       - the page's notes, after the last question:  `<epic-text-box type="notes">`
     - The page NEVER locks:  the person sends partial answers, and sends again whenever they like (Owen, 2026-10-08).
   - a picture page:  delete the question sections and `<epic-send>`;  nothing to send
3. In an epic:  format the page once it's written, as the engine's tools do:
   `yarn vp fmt <its ABSOLUTE path>`, from the kit's root
   ([epics' AGENTS.md](${CLAUDE_PLUGIN_ROOT}/src/AGENTS.md), "Finishing a page", step 2).

### Asking the same question again:  a new ROUND, never a new page

- Asked again (their answer raised more, a round 2 of the same names):  `epic ask round <slug> [--from <spec.json>]`,
  or for a choice page `epic choices round <slug> --rows <rows.json5>` (epic `epic-engine` P37).
  - Owen (2026-10-24):  "you updated the Event Names document several times, leaving multiple copies viable.
    Better to replace the one file."
  - It rewrites the ONE page in place:  the new round on top, the round before folded at its bottom
    ("Round 1 · 10/24 · what you sent"), with what they sent.
  - Without `--from`, a details page stays as it is, for you to edit into the new round.
  - The answer file keeps every round's:  `epic ask answer <slug>` prints the newest round's,
    `--round <n>` an earlier one.
  - A draft they typed and didn't send stays, and comes back over the new round (below);  a sent one goes.
- NEVER a new slug for the same question (`event-names-2`, `-round2`):  `create` refuses it, naming the `round`
  command.
- Read `epic ask draft <slug>` first, as for any rewrite (below).

### Rewriting a page the person may have open

- What they typed and picked and hasn't sent is a DRAFT (epic `epic-workflow` P18).
  - It's beside the page, `<slug>.draft.json5`:  saved a moment after each change, and in their browser too.
  - Your rewrite reloads the page (or patches it in place).
    The draft comes back into it over what they sent, by question / option / section id,
    and Send says "Changes not sent".
  - Text whose id your rewrite REMOVED is never dropped:
    - it shows in a box of its own above the notes, "Kept from before the page changed"
    - it goes with their next Send (`Kept from before the page changed:` in the answer)
- So, BEFORE rewriting:  `epic ask draft <slug>`.
  - It prints what's typed and not sent (exit 1:  nothing), as an answer reads.
  - Take it into account:
    - keep the ids of questions they're typing in
    - a new question gets a NEW id, not a reused one, so their text never lands on a question it wasn't written for
  - It's not an answer:  don't act on it as one.  They send when they're ready.

## 3. Show it, and wait

- Answer page:  `epic ask show <slug> --wait`, with Bash `run_in_background: true`.
  - In Codex:  run `epic ask show <slug> --wait` in the foreground:
    it returns when the person sends, so end the turn only if you can't wait.
  - Then END THE TURN with the page's link pair (`epic pages link <page>`, below):
    "answer in the side bar:  <link>".
  - Don't also ask in chat or the modal.
- Picture page:  `epic ask show <slug>` (foreground), then AskUserQuestion.
  - In Codex:  the question in the chat, its options numbered, after the picture page.
- Outside VS Code (a CLI session in a terminal):  `show` opens Chrome instead;  same flow.

## Links to pages

Any page you name to the person (a details page, an epic page, any docs page):
`epic pages link <page> --hash <id> --show`, and paste what it prints.
- It shows the page in this session's side bar NOW (`--show`), and prints two links:
  - the title opens it in the side bar (again)
  - `🌐`, after a `•`, opens it in Chrome:  `Title • 🌐` (Owen, 2026-10-11)
  - Both go through the page server ([showRoutes.ts](https://github.com/spell-app/spell/blob/main/epic/src/tools/showRoutes.ts)):
    the Claude panel ignores `vscode://` links, and opens `localhost` ones in a VS Code tab.
- `--hash`:  ALWAYS the id of what you mean.
  - e.g. `q2`, `t4`, a phase's `p-epic-migrate` ...;  `p3` lands on P3
  - The page lands there, below the sticky titles, unfolded.
- No page server here has the route yet (older than it):  it prints a plain link, and says so.

## 4. The answer

- The waiter exits 0:  its output IS the answer, as text:

  ```
  Answer to "Card layout" (/.../details/card-layout.html), sent 2026-10-03T22:00:00.000Z:  (sent 2×)
    1 of 2 decided
    Q1 · Which card layout?:  A · Stacked cards (recommended);  Other:  but collapsible  (new)
    Q2 · Where does it live?:  (not decided yet)
    Comments:
      1.2 What exists today:  the table is confusing  (new)
    Notes:  use spell/ui
  ```

  Act on it.
  - Epic:  record it, with `epic decide <name>#Q<n> "..."`, or `epic add <name>#D`.
    - Link the page:  `<a href="details/<slug>.html">`.
  - "(not decided yet)":  the person hasn't picked.
    Never read it as "no", or as the recommended one.
  - "(new)":  changed since their send before.
    Act on those;  the rest you've seen.
  - comments:  answer each (in chat, or on the page when it's a fix to the page)
  - "Kept from before the page changed":  what they typed for questions or sections a rewrite removed (P18)
    - under their old titles and ids
    - read each against the page as it is now, and act on it as a comment
- A PARTIAL answer (anything "not decided yet"):  act on what's there, then wait again at once.
  - `epic ask wait <slug>`, Bash `run_in_background: true`:  every Send wakes you.
    - In Codex:  `epic ask wait <slug>` in the foreground, the same way.
  - Stop once every question is decided, or the person says they're done.
- Exit 2:  no answer in 8 hours.
  One line saying so;  ask again only if it still matters.
- The person answered in chat instead:  stop the waiter (`TaskStop`), or it wakes you later with a stale answer.
  - In Codex:  a foreground wait ends by itself, or with Ctrl-C;  nothing is left running.
- They sent again while no waiter ran:  `epic ask answer <slug>` prints the latest.

## 5. When it fails

- The page says "can't take answers yet":  the page server serving it is older than its route module.
  - That's [detailsRoutes.ts](https://github.com/spell-app/spell/blob/main/epic/src/tools/detailsRoutes.ts).
    Route modules load when a page server starts.
  - Say so in one line;  ask in chat or the modal meanwhile.
    - In Codex:  ask in the chat meanwhile.
  - The person restarts it when no other session needs it:
    `epic server stop`, then `epic server ensure`, in the checkout whose server it is.
- "The page server restarted since this page loaded":  the person reloads the page, then sends again.
- `show` couldn't reach VS Code:  spell-epic's VS Code extension is missing or old.
  - Install it as [its README](${CLAUDE_PLUGIN_ROOT}/README-vscode.md) says, then reload the window.
  Meanwhile the page's URL (`epic server url <ABSOLUTE path>`) works in any browser.

## Commands (`epic ask ...`, from anywhere in the repo)

```
new <slug> [--title "..."] [--epic <name>] [--description "..."] [--from <spec.json>]
                                           a page from the template (or a spec);  prints its path
show <page> [--wait] [--timeout 8h]        in this session's side bar (Chrome outside VS Code);  then wait
wait <page> [--timeout 8h]                 until a NEW answer;  prints it, exit 0;  timeout:  exit 2
round <page> [--title "..."] [--from <spec.json>]
                                           the same question again:  the one page rewritten, the round before folded in
answer <page> [--round <n>]                the answer already sent (exit 1:  none);  --round:  an earlier round's
draft <page>                               what's typed and not sent (exit 1:  nothing);  read it before a rewrite
list                                       every details page, answered or waiting
sweep [--days 14]                          delete old scratch pages and answers;  never an epic's
fold [--dry-run]                           once:  every epic's near-copies (x-2, x-3) folded into x as its rounds
```

`<page>`:  a slug, `<epic>/<slug>`, or a path.  Flags go after it.
