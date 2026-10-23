# The eight voices:  how to write them again

Notes to reproduce any of the voices tried for the Spell READMEs, and the verdict on each.
The READMEs use ONE voice, the react-dev voice as [final.md](final.md) wrote it:  [readme-voice.md](readme-voice.md)
is its style guide.
The website will use another, the storyteller / essayist, with live examples:  its notes are at the end.

## The shape of the contest

Two rounds, each a Workflow of Opus agents at extra-high effort:  write several drafts of the SAME page (the kit's
front page), judge every draft from several lenses, synthesize the winner with the best of the others grafted in.
The scripts are in [workflow-scripts/](workflow-scripts/):  run them again with the Workflow tool, after changing
`README`, `BRIEF` and `OUT` at their tops.

| Script | What it ran |
| --- | --- |
| [round-1-voices.js](workflow-scripts/round-1-voices.js) | five writers, three judges, one synthesis |
| [judge-a.js](workflow-scripts/judge-a.js), [judge-b.js](workflow-scripts/judge-b.js) | re-runs of round 1's judge and synthesis steps over the drafts already on disk (the first run's JSON output failed to parse) |
| [round-2-voices.js](workflow-scripts/round-2-voices.js) | three novice-first writers, four judges (the novice counted twice), one synthesis |

Every writer got the same COMMON brief:  the current page, the writers' brief (audience, links, stubs, banned
words), and the rule "lose nothing":  every fact, number, command, output, link, picture, expand and table row stays,
nothing is claimed that doesn't run, "people" not "users", no path in running prose.
Only the VOICE paragraph differed.
To get a new voice, copy a writer's `voice:` paragraph, change it, and keep COMMON.

## Round 1:  five voices

Scored 1 to 10 on keeps-reading, understands and honest, by three judges.

| Voice | Total | The VOICE paragraph, in short | Verdict |
| --- | --- | --- | --- |
| [product-page](product-page.md) | 72 | Confident, short paragraphs, headlines that make a promise and a body that keeps it ("English you can run.  Really."). Every claim runnable in five minutes. | Top total, but it reads as selling. Dropped. |
| [react-dev](react-dev.md) | 70 | An engineer's pitch to a React developer:  contrast-driven, opinionated, says what's clever and what's unfinished. Dry wit. | Won the synthesis. Became [final.md](final.md), and the README voice. |
| [storyteller](storyteller.md) | 69 | Opens on a person with a problem (never programmed, an AI writes the app, she changes a line) and unfolds the system from that scene. | Liked by the owner. Kept for the website. |
| [tour-guide](tour-guide.md) | 69 | The repo is a place;  walk a visitor through it. Spatial, warm, "start here, then go there". | Charming, but the metaphor carries no information. Dropped. |
| [essay](essay.md) | 62 | HyperCard's promise for the web, Bret Victor, why English, what an AI that writes programs changes:  the program is something you can READ. | Liked by the owner. Kept for the website. |

The three judges (lenses):
- a React developer with 90 seconds on GitHub, who skims and stops at the first marketing smell
- a curious non-programmer who uses AI tools and wants a small app
- the house style's keeper, who compares each draft with the original for lost facts and broken rules

## Round 2:  novice first

The owner's direction after round 1 (modal answer):  "rank and rewrite again, but with less emphasis on a react
developer who knows react and more on a curious novice programmer, particularly for the top sections.
I liked storyteller and essay best FWIW.
Also, change the script examples to outline solitaire, and use `a card is a drawable thing`."

| Voice | Total | The VOICE paragraph, in short |
| --- | --- | --- |
| [essay-2](essay-2.md) | 122 | The hook ("You just read a program") and the honesty, but the argument is for a novice:  the history in one breath, each claim followed by the real Spell or output that shows it, "Skip to setup" within two screens, developer material after "Everything below this line is the manual". |
| [storyteller-2](storyteller-2.md) | 118 | The person with a problem is a curious novice who has poked at code;  the first screen hands the reader the same move:  open outline Solitaire, find one bullet, change it. |
| [novice-guide](novice-guide.md) | 113 | Not a story, not an argument:  a warm guide that assumes nothing.  "Here is a program.  Here is what each line means.  Here is how to change it and see it change." |

Four judges, the curious novice counted twice:  the novice, a non-programmer with AI, the house-style keeper (who also
checks every Spell snippet parses), and a developer reading after the first screens.
[final-2.md](final-2.md) is the synthesis.

## The owner's verdict

"OK, this was a good exercise, but I think that these READMEs are best served by the more react-ish approach in
drafts/final.md.
Another exercise I'll have you do soon is a website, which will be more in the storyteller / essayist voice, but with
live examples."

So:
- the READMEs are in the round-1 react-dev voice, written to [readme-voice.md](readme-voice.md)
- [final-2.md](final-2.md), [essay-2.md](essay-2.md), [storyteller-2.md](storyteller-2.md) and
  [novice-guide.md](novice-guide.md) are the starting points for the website

## What made the react-dev voice work (the short list)

The full guide is [readme-voice.md](readme-voice.md).
In one breath:
- the first screen is real code, then "You just read a program"
- each idea is told by contrast with what the reader knows, and ends with "The unfinished part:" or "The cost:"
- numbers are measured, the edges are named, and a panel says Real today / Not yet / Coming
- short paragraphs, one dry joke a page, ONE word in caps where the contrast lives

## The website voice:  notes for the exercise to come

Not started.  What the owner said, and what the drafts already show:
- **Voice:**  the storyteller and the essayist, as in [storyteller-2.md](storyteller-2.md) and
  [essay-2.md](essay-2.md).  A person, an afternoon, a program she can read, a line she changes;  and the argument
  behind it, in the essay's order (HyperCard, why English, what an AI that writes programs changes).
- **Live examples:**  every code block can run.  The pieces exist:  `<spell-editor>` in the app, the browser
  compiler, and `<ui-*>` components.  The card in the kit's `README.md` (its first example) is the first
  example to make live:  edit a rule, the cards on the page change.
- **Readers:**  the curious novice first (round 2's direction), the developer after a clear line.
- **Reuse:**  the website can take whole paragraphs from [essay-2.md](essay-2.md) and
  [storyteller-2.md](storyteller-2.md);  the READMEs must NOT, because they're the manual and the website is the story.
- **Honesty rule, both places:**  every Spell shown parses and every output is real.  Run `spell lint` on a project
  before a snippet goes in.
- **Judging it:**  reuse the round-2 lenses.  Add a fifth:  someone who only clicks the examples and never reads the
  prose.
