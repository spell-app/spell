# The epic demo:  showing epics to your team

![An epic page's Questions section, opened from the toolbar's Questions button with its red 2:  Q1 "When should
Juno read the morning briefing?" and Q2 "Which Jira and Confluence links should the briefing mention?", each with
three option cards, the recommended one marked with a thumbs up, and a note box under it.](docs/images/demo/questions.png)

_Two minutes in:  Claude's questions, on the page instead of in the chat, each with options and a pick._

A run-through for showing epics to a room, in about 20 minutes.
You ask for a feature in one line, Claude plans it on a page you both edit,
you agree the plan with two presses, it builds a phase,
and you come back to a summary of what happened.

The feature:  a Morning Briefing for Juno, a voice assistant.
Say "good morning", hear your meetings, the Jira and Confluence links worth checking, the weather and a joke.

**Running it in your repo:**  you run the same ask for real, with `/epic morning-briefing`.
- Claude really thinks, so each wait is a few minutes, not seconds.
  Run it once before the room, and show the page as it stands;  or talk through the waits.
- Spell's own copy is STAGED:  `epic demo` plays pre-written thinking on the real page and tools, so nobody waits.
  Its step files live in Spell's epic repo, so `epic demo check` fails anywhere else.
- Either way, every page, button and command is the real one.

## The stages

| Stage | Starts at |
| --- | --- |
| [0. Install, one command](#0-install-one-command) | before |
| [1. Paste, and the analysis](#1-paste-and-the-analysis) | 0:00 |
| [2. Two questions](#2-two-questions) | 2:00 |
| [3. The Overview, and Accept](#3-the-overview-and-accept) | 4:00 |
| [4. Four phases, and picking the Joke](#4-four-phases-and-picking-the-joke) | 7:00 |
| [5. Building, and questions mid-stream](#5-building-and-questions-mid-stream) | 10:00 |
| [6. A Joke done, and "While you were out"](#6-a-joke-done-and-while-you-were-out) | 13:00 |
| [7. The close](#7-the-close) | 18:00 |

Most of the time is you talking;  Claude's part is the waits.

## Before you start

- A repo set up for epics ([Try it](https://github.com/spell-app/spell/blob/main/README-epics.md#try-it)),
  and the epic pages open in VS Code's side bar or a browser.
- A NEW Claude Code tab, in the repo's own window, not inside an earlier epic's worktree.
- The ask, below, open beside the tab, ready to copy.
- Light theme:  projectors wash dark out.
  Zoom in:  Cmd + twice in VS Code, 125% in the browser.
- One window:  the Claude panel on the left, the epic page on the right, the terminal closed.
- Do Not Disturb on;  chat and mail closed.
- A screen recording of an earlier run (Cmd Shift 5), in case the live one stalls.

<details>
<summary>The ask to paste</summary>

````text
Juno should give me a morning briefing.  When I say "good morning", read me one short spoken paragraph:  my upcoming meetings, the Jira and Confluence links worth checking, today's weather, and a joke to start the day.

Here's where the wake phrase is handled today, and the shape I have in mind.  Only the joke is real so far:  meetings, Jira / Confluence and weather are stubs.

```ts
// juno/src/skills/greetings.ts
export async function onWakePhrase(phrase: string, ctx: SkillContext) {
  if (/good morning/i.test(phrase)) {
    await ctx.speak(`Good morning, ${ctx.user.firstName}.`)
    // TODO: the briefing
  }
}

// juno/src/briefing/BriefingSource.ts
/** One part of the morning briefing:  gathers what it needs, and says it in a sentence or two. */
export interface BriefingSource {
  title: string
  /** what this part says, or nothing on a quiet morning */
  sentence(ctx: SkillContext): Promise<string | undefined>
}

export const meetings: BriefingSource = { title: "Upcoming meetings", sentence: async () => undefined } // stub
export const links: BriefingSource = { title: "Jira and Confluence", sentence: async () => undefined } // stub
export const weather: BriefingSource = { title: "Today's weather", sentence: async () => undefined } // stub
export const joke: BriefingSource = {
  title: "A joke",
  sentence: async () => "Why did the calendar feel popular?  Its days were all booked."
}
```
````

</details>

<details>
<summary>If something goes wrong</summary>

- Nothing happens after an Accept:  press **Send**, the paper plane.
  It sends the Accept at once, instead of after its 5 minutes.
- You pressed Send before Accept:  Claude says to press Accept when it looks right.  Press it.
- Claude seems stuck:  type `next` in the chat.  It carries on from where the page is.
- The side bar says "waiting for the page server":  it loads by itself once the server answers.
- The Review tab is empty:  `epic open morning-briefing` in a terminal, or the checklist button in the tab's title bar.
- A permission prompt:  answer it on screen, and say why it asks.
- The live run stalls for good:  play the recording.

</details>

## 0. Install, one command

**You do:**  show the command.  Don't run it, if your machine has it already.

```sh
npx spell@next epic init
```

**They see:**  in any git repo with at least one commit, it asks your name and a colour,
installs the Claude Code plugin and the VS Code extension, makes the repo for the pages,
and starts a small local server that shows them.
A Claude Code session already open needs `/reload-plugins` before `/epic`.

**Say:**
- One command.
- It works in any git repo, on GitHub or GitLab.
- Your code stays as it is, plus one config file and a block in `.gitignore`.

**They'll ask:**
- "What do I need first?"  Claude Code, VS Code, git, Node 24.11 or later, and `gh` or `glab`, logged in.
- "`epic: command not found`?"  `epic` lives in `~/.local/bin`, which must be on your `PATH`;
  `epic init` prints the line to add:  `export PATH="$HOME/.local/bin:$PATH"`.

## 1. Paste, and the analysis

**You do:**  in the new Claude tab, type `/epic morning-briefing `, with the space, paste the ask, press Enter.

**They see:**  Claude's take in the chat:  four parts, each its own `BriefingSource`, and two questions.
The Morning Briefing epic page opens beside the chat.

**Say:**
- One line starts an epic.  The plan doesn't live in the chat:  it's a page, beside the code.
- The chat scrolls away by morning.  The page stays true while it's built, and after the merge.
- The epic gets its own branch and worktree, a second checkout beside the repo,
  so the files you're in aren't touched until you merge.  Several epics run at once that way.

**They'll ask:**
- "Do I need VS Code?"  No:  the pages are plain HTML on a small local server, so any browser shows them.
  VS Code puts them in the side bar.

## 2. Two questions

**You do:**  point at the red 2 on the Questions button in the page's toolbar.
Click it, and unfold Q1, then Q2.  Don't answer yet.

**They see:**  the picture at the top of this page.
Q1, "When should Juno read the morning briefing?";  Q2, "Which Jira and Confluence links should the briefing mention?".
Three option cards each, one recommended, each with why and what it costs.
A real run words its own questions:  yours will differ.

**Say:**
- An agent either guesses, or sits waiting for you.  Here the question goes on the page instead.
- Each comes with its options, what each costs, and the one Claude recommends.  You answer when you have time.
- Red means it needs you.  The colours on this page say whose turn it is.
- Every item has a short id you can say out loud:  "pick B on Q1" works in the chat too.

**They'll ask:**
- "What if no option fits?"  Each question takes a note, pictures welcome, and Other.
- "Can a teammate answer?"  Yes:  the pages live in a git repo of their own, so two people can review one.

## 3. The Overview, and Accept

**You do:**  pick the recommended card on Q1 and on Q2.
Scroll to 1. Overview, and read its two-sentence summary aloud.
Unfold "How it works", and its folded code block.
Press **Accept Overview**, the green thumbs up on the Overview's title row.

![The epic page at its Overview:  the summary, then three parts, What you'll hear, How it works and What stays the
same, each with a note box under it, and Accept Overview at the top right.](docs/images/demo/overview.png)

_The Overview:  a summary, three short parts, a note box under each._

**They see:**  after Accept, Claude works, then the page moves on to its Phases.

**Say:**
- The Overview is what Claude understood, short enough to read in a minute.
- Accept Overview says "you understood the job".  Nothing is built before both Accepts.
- Every answer rewrites the Overview, its changed words in orange.
- The note box under each part takes a why, a question or a picture.
- An Accept waits 5 minutes, so you can take it back;  Send sends it now.

**They'll ask:**
- "What if it misunderstood?"  Write in the note box, or comment with the bullhorn, and Send.
  It rewrites, and you Accept when it's right.
- "Can I skip the Accepts?"  Yes:  "go" in the chat.

## 4. Four phases, and picking the Joke

**You do:**  unfold 2. Phases, and walk down P1 to P4:  each has a Symptom, a Goal, Changes and Claude's plan.
On P4 · A Joke's title row, press **Looks good**, the thumbs up left of the clock.
Then **Accept Phases**, on the Phases title row.

![The Phases section:  P1 Upcoming Meetings and P2 Jira and Confluence Links, each with its estimate, Symptom, Goal,
Changes and Claude's plan, and Accept Phases at the top right.](docs/images/demo/phases.png)

_Four phases, one per part of the briefing, each with its build plan and estimate._

**They see:**  P4 · A Joke starts;  the other three stay to do.
The clock beside the thumbs up is Defer, which moves a phase to the end:  you don't need it today.

**Say:**
- Each phase has a build plan:  the steps, and how it'll be checked.  One press agrees them all, up front.
- After that it builds without stopping.  No "shall I carry on?" waiting for you at 3am.
- The parts don't depend on each other, so I pick the order:  the joke first, the one part that's real today.
- Before a phase closes, a second agent holds its diff up against the plan I accepted.

**They'll ask:**
- "Can I change the plan later?"  Yes:  Revisit a phase with a note, add one, or Defer it to the end.
- "How big is a phase?"  Hours of agent work, committed as one `P4:  A Joke -- ...`.

## 5. Building, and questions mid-stream

**You do:**  while it builds, talk.
Open 3. Questions:  new ones came up mid-build.
Pick an answer on each, then press **Send**, the paper plane at the top.

![The epic page while P4 A Joke is built:  the phase pill at the top right turning on P4, and the Questions section
with the new Q3 "What kind of jokes should Juno tell?" and Q4 "What happens when you don't laugh?", each with three
option cards;  Q1 and Q2 answered, folded below.](docs/images/demo/building.png)

_P4 · A Joke under way, the pill turning, and two questions that came up mid-build._

**They see:**  the phase pill shows P4 under way, and the status says "Building A Joke".

**Say:**
- Named background agents build in the epic's worktree.  The session I typed into stays free to answer me.
- Questions that come up mid-build go on the page too, and it keeps building what doesn't depend on them.
- Send hands everything I marked to the session at once.  Auto Send does it after two quiet minutes.
- So I can walk away, or start another epic in another window.

**They'll ask:**
- "What if I don't answer?"  Calls it can make itself, it makes and records;  only the ones that need you wait.
- "Does it run the tests?"  Yes:  a phase's Done list ends with a `Checked:` line, each check and what it printed.

## 6. A Joke done, and "While you were out"

**You do:**  the page opens at 0. While you were out.  Read it top to bottom.
Then the toolbar buttons, one by one:  Judgement calls, Todo, Issues, Manual tests.
Unfold a red judgement call to show its options, and point at the coloured counts at the top right.
Open 2. Phases:  P4 is green, P1 to P3 still to do.

![The section 0. While you were out:  Waiting on you, J2;  What was done, P4 A Joke;  Fixed, to review, I2;  Newly
opened issues, I1;  New manual tests, M1.](docs/images/demo/away.png)

_"0. While you were out":  what waits on you first, then what was done._

![The Judgement calls, Todo, Issues and Manual tests sections, each item with a coloured id chip:  J1 yellow, J2 red,
T1 yellow, T2 grey, T3 blue and under way, I1 red, I2 orange and fixed, I3 light orange, M1
yellow.](docs/images/demo/items.png)

_The items, in every colour._

| Colour | Means | In the picture |
| --- | --- | --- |
| Red | needs you | J2, where the joke goes;  I1, puns that sound wrong |
| Orange | fixed, yours to look at | I2, the same joke twice in a week |
| Light orange | your own request, done | I3, no cat jokes |
| Yellow | open, but calm | J1, no work jokes on Mondays;  T1, your own jokes;  M1, hear it yourself |
| Blue | Claude is on it | T3, time zones, for P1 |
| Grey | a limit to know about | T2, only 60 jokes |
| Green | done | P4 · A Joke |

**Say:**
- Coming back cold, you read section 0, not the whole page.  It shows only what changed since you last looked.
- Judgement calls are what it decided without you, written down rather than asked at 3am.
  Yellow wouldn't surprise you;  red is one you'd want a say in, with options.
- The colours say whose turn it is:  red you, blue Claude, green nobody's.
- A request of yours comes back light orange, done, until you look.
- A manual test is the check only a person can do:  exact steps, and what should happen.

**They'll ask:**
- "Who reviews all this?"  You, when you like:  Approve, Revisit or Do this on each, or "approve J1" in the chat.
- "Isn't that a lot of items?"  It can be, and nobody reviews them for you.
  Click a colour's count to hide those.

## 7. The close

**You do:**  leave the page up, and give the pitch.

**Say:**
- A plan you and Claude both edit, live, and a worktree per epic.  You review on the page;  Claude builds.
- When the last phase is done, the epic writes its guide, a short write-up for the next person, then merges.
- The worktree goes;  the page stays, as the record of every question and call.
- Already use superpowers?  It lives alongside:  the epic owns the plan, the worktree and the finish;
  superpowers' test-first and debugging skills work inside a phase.
- Works with GitHub or GitLab, Claude Code first, Codex beside it.

**They'll ask:**
- "Can I try it today?"  Yes:  `npx spell@next epic init`, in a git repo.
  Say `@next`:  `latest` is still an old version.
- "Staying current?"  `epic upgrade`, then `/reload-plugins` in any open Claude Code session.
- "Will two plugins fight?"  No:  in an epic's worktree, superpowers is told to stand aside for planning,
  worktrees and finishing.
- "Where are the docs?"  The Docs tab on the epic pages' top bar:
  setting up, the pages, the skills, the `epic` command, and a FAQ for when something goes wrong.

## Afterwards

The demo epic is a real one, with its own worktree and branch.
To run it again from the top, close its Claude tab, then throw it away from your repo's root:

```sh
epic worktree remove morning-briefing --force    # its servers stopped, then the worktree
git branch -D morning-briefing                   # the branch, unmerged work and all
```

The catch:  its epic page stays, as every epic's does.
Run the next demo under a new name (`/epic morning-briefing-2`), or delete its folder from the epic repo by hand.

## See also

- [README-epics.md](https://github.com/spell-app/spell/blob/main/README-epics.md):  what an epic is, and setting it up
- [README-how-it-works.md](README-how-it-works.md):  sagas, epics and guides, the page in pictures
- [README-pages.md](README-pages.md):  every part of an epic page
- [README-superpowers.md](README-superpowers.md):  how epics and superpowers share a session
- [README-faq.md](README-faq.md):  what you see when something goes wrong, why, and the fix
