---
name: coherence
description: Find where the code does one thing more than one way, or where a plan is about to -- a mechanism written twice that one shared one, handed what differs, would replace; new code rebuilding what already exists; two words for one idea -- and land each finding with the epic that owns it. Use for `/coherence sweep [area]` (code already written, an agent per area), `/coherence epic <name>` (an epic's kickoff, Overview and build plans, before they're agreed), or when the person asks "do we already have this?", "is anything doing this twice?", "check this plan for reuse".
---

# /coherence

A reviewer for ONE way of doing each thing (epic `coherence`).
- It reads, holds what it reads up against the repo's catalog and word list, and asks the code map;  it changes no
  code.
- The work is the coherence agent's (`coherence`, the epic plugin's);  this skill runs it and lands what it finds.
- Its rules:  [procedures.md](../../coherence/procedures.md).
- The repo's facts, at the checkout's root:  `agents/coherence/catalog.md` (the mechanisms it has, the areas to
  sweep) and `agents/coherence/words.md` (one word per idea).
- The map:  `spell map` (the kit's README of commands, "Asking the map").

## Forms

```
/coherence sweep               every area in the catalog's "Areas", an agent each (at most 5 at once)
/coherence sweep <area>        one area, by its name there
/coherence epic <name>         an epic's kickoff, Overview and build plans:  "do we already have this?"
```

## Steps

1. **Ready:**  from the checkout's root.
   - `spell map status`:  a stale or missing map, `spell map build`.  No graphify:  go on;  the agent searches.
   - `agents/coherence/` missing:  say so in one line, and go on with the search alone.
   - A sweep:  `spell coherence score --json` first, to compare with at the end (step 6).
2. **Agents:**  each named and listed (the root `CLAUDE.md`, "Delegated work"):  `epic agents add <name> "<task>"`.
   - A sweep:  one `coherence` agent per area, `<epic>-sweep-<area>`, up to 5 at once.
     Its prompt:  the area's folders (the catalog's "Areas"), the checkout, and "sweep:  find the mechanisms this
     area writes more than once, or rebuilds".
   - An epic:  ONE `coherence` agent, `<epic>-coherence`.
     Its prompt:  the epic's page (`epic items <epic> --json`, its Overview parts and phases' plans), its kickoff
     prompt, and "review:  what in the repos already does part of this?"
   - Each returns ranked findings in procedures.md's shape.
3. **Merge:**  a finding several agents report (one fold in Spell UI AND the epic pages) is ONE, every place listed;
   then rank them all, procedures.md's way.
4. **Check each one yourself** before it lands:  open the places it names, run its evidence command.
   - Not the same job after all:  drop it, into the "Considered, left out" line.
5. **Land each finding** with the epic it's about, by that epic's stage (epic `coherence` Q4, Q5):
   - which epic:  `epic owns <path...> --json`, the finding's files:  an owner whose `how` has `branch` (its branch
     changes them);  for a plan review, the epic under review
     - a page that only NAMES a file (`how` is just `plan`) doesn't own it:  long-running epics name hundreds
       (epic `coherence`, sweep 1)
   - **planning** (its Overview or phases not accepted yet):  worked into its plan.
     - The Overview's words, or a phase's goal, rewritten to use the mechanism, in a change mark:
       `<epic-change item="<id>">...</epic-change>`, then `epic change <epic>`.
     - The item:  a calm judgement call saying what the review found, `epic add <epic>#J "... (coherence)" --calm`.
     - A real choice (two good ways):  a question instead, `epic add <epic>#Q "... (coherence)"`, its options side
       by side.
   - **building:**  a question on its page, `epic add <epic>#Q "<title> (coherence)" --details "..."`:  its session
     takes it up.
   - **no epic, or done:**  a calm issue on the coherence epic's page,
     `epic add coherence#I "<title> (coherence)" --calm --details "..."`;  the person marks which become its phases.
   - Each item's details:  the finding in procedures.md's shape, its **Net effect** right after "The one" and
     BEFORE "Saves" (Owen, 2026-10-25), its places and evidence in a folded `<epic-code>`.
6. **Reply:**  one line per finding, where it landed, with its link (`epic pages link ... --hash <id>`);  the
   "Considered, left out" line.
   - A sweep:  then `spell coherence score --compare last --save`, and one line with its change, in words:
     "Coherence 81 → 83, 2% better (score up);  copies 233 → 220, 6% better (fewer copies)" (procedures.md,
     "The score").
   - A plan review:  "this plan adds N copies" per mechanism, where the agent could tell.
7. **Learn,** whenever the person gives a verdict on a finding (here or on the page):
   - agreed, and the mechanism exists:  its entry in the catalog gets the copies;  a new one:  a new entry
   - a word settled:  the word list gets it, with where it was decided
   - "that's fine as it is":  a line in the catalog's "Fine as it is", with why
   - Commit them with the turn's other kit changes:  the lists are code, versioned per branch.

## Never

- Change code, or the epic's plan beyond the change marks of step 5.
- Land a finding twice:  one place, by step 5's rule.
- Redo what an open epic already plans:  that epic's page gets a note at most.
