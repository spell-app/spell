---
name: voice
description: Rewrite docs guides in a VOICE -- the repo's rules for how a kind of page is written (`epic voice`) -- keeping every fact, id and number, then stamp each one done;  background agents do the writing, up to 5.  Use for `/voice [<page>...] [--voice <name>]` (no pages:  every guide not done yet), or when the person says "run the voice over the guides", "rewrite <guide> in the readme voice", "bring the guides up to the voice".
argument-hint: "[<page>...] [--voice <name>]"
---

# /voice

In Codex:  each step that needs a Claude Code tool says what Codex does instead, in a line like this one
(the long form:  `epic guide claude-only-tools`).

Rewrite guides in a voice (epic `readme` P14):  how they READ, never what they SAY.
- The voice:  `epic voice --for guide` (the repo's choice;  spell-epic ships `readme`), or `--voice <name>`.
- On top of it, everywhere, the repo's CODE voice, its house style's writing rules (`epic voice code`):
  it wins where the two differ.
- The list and the stamps:  `epic pages voice` ([voice.ts](https://github.com/spell-app/spell/blob/main/epic/src/tools/voice.ts)).
  - A guide gone over gets `<meta name="spell-voice" content="readme 2026-10-22">` in its head:
    `epic pages voice` lists only the ones without it.
- Not `/docs-check`:  that one fixes what docs SAY against an epic's decisions;  this one, how they read.

## Forms

```
/voice                          every guide the voice hasn't gone over
/voice guides/server.html ...   those guides
/voice --voice novice ...       another voice
```

## Steps

1. The list:  `epic pages voice [<page>...] [--voice <name>] --json > <scratch>/voice.json`.
   - `voice`, `file`:  the voice and its file;  `pages`:  each guide, its words, `done`.
   - Nothing left to do:  say so, and stop.
2. Is anyone else editing these?  `epic agents list`, `epic worktree list`.
   Another session or agent on the same guides:  say who, leave those out.
3. Split the guides not done into at most 5 groups of about equal WORDS (a long guide alone in its group),
   neighbours together (one folder's guides in one group).
4. One background agent per group, NAMED and LISTED ([the bg skill](../bg/SKILL.md), "Names"):
   - In Codex:  ask for Codex sub-agents, one per group, with that brief;
     Codex waits for them all, then step 5 runs for each.  No `epic agents add` / `done`:
     those list Claude Code's agents.
   - `epic agents add voice-<n> "<its guides, short>"`:  prints its full name
   - an `Agent` call, type `general-purpose`, `run_in_background: true`, its `description` starting with that name
   - its prompt:  "The agent's brief", below, word for word, with its guides (their REAL paths in the content folder:
     `epic config contentFolder`), the voice's file and the code voice's file
5. Each agent's notice, as it arrives:  `epic agents done voice-<n>`, then a short reply, its first line bold, by
   itself:  `**Agent <full name> came back with:**`, and its report's lines.
6. When all are back:  `epic pages voice` again, and the report ("Report").

## The agent's brief

```text
Rewrite these docs guides in the voice below:  how they READ, never what they SAY.

Read first, IN FULL:  the voice (<voice file>), then the house style's writing rules (<code voice file>), which win
where the two differ.  Then each guide, whole, before changing a word of it.

Keep, exactly:
- every fact, number, name, command, path, caveat and link;  every section and its id (other pages link to them)
- the markup:  <ui-section>, <ui-table>, <epic-*> and every other element and attribute stay as they are;
  you change the TEXT inside them, and may split a paragraph into a list or join two short ones
- code blocks, tables' data, quotes of people ("Owen, 2026-10-10:  ..."), dated history (feeds, "before <date>" notes)
- anything between generated markers (index:start / index:end, areas:start / areas:end)
- a guide's internal names:  these pages are for the team, so repos and tools are named as they are

Change, where the voice says to:
- the opening:  proof first (what it does, a real example), then what it is
- run-together sentences, dense paragraphs, filler, unexplained shorthand, claims with no edge
- "Spell" capitalised in prose (lowercase only in code)

Edit each guide at its real path (given below).  Never run git in the content folder:  its commits are automatic.
Then, for each guide, from the plugin's folder (`epic/` in the kit):
  1. yarn tsx src/tools/doc-links.js <page>
  2. yarn vp fmt <page>
  3. yarn tsx src/tools/doc-links.js --check <page>
  4. node src/tools/check-spell.js <page>   -- it must pass;  look at its screenshots
  5. epic pages voice --done <page>
A guide you can't make better without losing a fact:  leave it as it was, don't stamp it, and say why.

Report, one line per guide:  <page> · <words before> -> <words after> · what changed in a few words;
then anything you left, with why.
```

## Report

Short:
1. `<n> guides gone over in the <voice> voice (<words before> -> <words after> words);  <m> left`, and why each.
2. Per agent:  its guides, one line each, as its report said.
3. Where to review:  the content folder's `auto: guides/...` commits, one per folder, each reverted whole if the person
   doesn't like it;  the guides themselves (`epic pages link <page> --show`).
