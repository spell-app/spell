export const meta = {
  name: 'readme-voices-2',
  description: 'Round 2:  three novice-first rewrites of the kit README (storyteller, essay, a blend), judged with the novice lens weighted, then synthesized',
  phases: [
    { title: 'Write', detail: 'three rewrites, the top sections for a curious novice programmer', model: 'opus' },
    { title: 'Judge', detail: 'four lenses, the novice counted twice', model: 'opus' },
    { title: 'Synthesize', detail: 'the winner, with the best of the others grafted in', model: 'opus' },
  ],
}

const README = '/Users/owen/www/spell.worktrees/readme/README.md'
const BRIEF = '/Users/owen/www/spell/spell.epics/epics/readme/parts/o2.html'
const R1 = '/Users/owen/www/spell.worktrees/readme/docs/drafts'
const OUT = '/Users/owen/www/spell.worktrees/readme/docs/drafts/round2'
const OUTLINE = '/Users/owen/www/spell.worktrees/readme/spell-app/spaces/@spell/examples/outline-solitaire/Card.spell'
const DRAWABLE = '/Users/owen/www/spell.worktrees/readme/spell-app/spaces/@spell/examples/drawable-solitaire/Card.spell'
const SNAPS = '/Users/owen/www/spell.worktrees/readme/spell-parser/tests/spaces/@spell/test'

const COMMON = `
You are rewriting the front-page README of Spell (six repos;  this page is the kit's, the root everything is cloned into).
Read first:  the current page ${README} (whole);  the brief ${BRIEF} (audience, links, stubs, words);  the round-1 drafts the owner liked best, ${R1}/storyteller.md and ${R1}/essay.md, and the synthesis ${R1}/final.md;  and the real example sources ${OUTLINE} and ${DRAWABLE}, with their compiled snapshots in ${SNAPS}/outline-solitaire/ and ${SNAPS}/drawable-solitaire/.

The owner's direction after round 1:
- The TOP sections are for a CURIOUS NOVICE PROGRAMMER:  someone who has written a little code (a script, a spreadsheet formula, a tutorial) or none, uses AI tools, and wants to make something.  Plain words, every term explained the first time, a picture before a wall of text, and something they can DO within the first screen.  The developer-by-contrast material (React, build steps, repos) comes AFTER a clear line, for the reader who wants to work on Spell itself;  keep it, lower.
- He liked the storyteller and the essay best.
- The spell examples are from OUTLINE SOLITAIRE:  the outline style (a heading line, then bullets of what's true of a card), taken from ${OUTLINE};  and the opening line should be \`a card is a drawable thing\` (the real line in ${DRAWABLE}).  HONESTY RULE:  every spell you show must parse.  Make a scratch copy of the outline project under /private/tmp/claude-501/-Users-owen-www-spell/d5a307a4-0de5-4c43-817b-d113b0c12ede/scratchpad/ (copy the four .spell files and __project.json5), change its first line to \`a card is a drawable thing where:\` (or \`a "card" is a drawable thing where:\`), run \`spell check <that folder>\` (the \`spell\` command is on PATH;  else \`node /Users/owen/www/spell.worktrees/readme/spell-app/cli/bin/spell.mjs\`), and use that form ONLY if it checks clean;  otherwise show the outline file's real lines as they are and \`a card is a drawable thing\` as drawable solitaire's own line, and say which file each comes from.  Compiled output you show comes from the snapshots or from \`spell compile --stdout\`.  Prefer short excerpts:  the heading line plus three to six bullets (suit, rank, "is face up", color).
- Everything else in the brief holds:  every fact, number, command, output, link, picture, caption, expand, table and index entry of the current page stays (you may reorder, regroup, fold, rewrite);  nothing claimed that doesn't run today (🌱 for what's coming);  "people" not "users";  the owner's name only in WWOD's expansion;  no path in running prose;  no epic names in prose;  Mermaid blocks and their %%{init}%% lines unchanged;  under about 600 lines with expands open.
Write your draft to ${OUT}/<file>.md (make the folder if needed).  Nothing else on disk changes (the scratch project is in the scratchpad).  Return ONLY the path, then three lines on what you did with the voice and which card lines you used.
`

const VOICES = [
  { file: 'storyteller-2', voice: `VOICE:  the storyteller, round 2.  Keep what worked (a person with a problem;  her edit;  the running game changing under her hands), but she is a curious novice who has poked at code before, and the FIRST screen gives the reader the same move to make:  open outline solitaire, find one bullet, change it.  Every section still advances her afternoon;  the developer material is the part where she decides to look under the floorboards, after a clear line.` },
  { file: 'essay-2', voice: `VOICE:  the essay, round 2.  Keep the hook ("You just read a program") and the honesty, but the argument is for a curious novice:  shorter (the history in one breath, not 190 lines), concrete at every step (each claim followed by the real spell or output that shows it), and setup reachable within the first two screens through a "Skip to setup" link.  The developer-by-contrast material and the repos come after "Everything below this line is the manual".` },
  { file: 'novice-guide', voice: `VOICE:  the curious novice's guide.  Not a story and not an argument:  a warm, direct guide that assumes nothing and respects the reader.  "Here is a program.  Here is what each line means.  Here is how to change it and see it change.  Here is what Spell is made of, in the order you'll meet it."  Short paragraphs, a picture per idea, the one command to run at each step with what it prints.  Then the line, and the developer material.` },
]

phase('Write')
const drafts = (await parallel(VOICES.map(v => () =>
  agent(COMMON + '\n' + v.voice + `\nFile name:  ${v.file}.md`, { label: `write:${v.file}`, phase: 'Write', model: 'opus', effort: 'xhigh' })
    .then(text => ({ file: `${OUT}/${v.file}.md`, voice: v.file, note: text }))))).filter(Boolean)
log(`${drafts.length} drafts written`)

const SCORE_SCHEMA = {
  type: 'object',
  properties: {
    scores: { type: 'array', items: { type: 'object', properties: {
      voice: { type: 'string', description: 'exactly one of:  storyteller-2, essay-2, novice-guide' },
      keepsReading: { type: 'number', description: '1-10:  would this reader read to the end' },
      understands: { type: 'number', description: '1-10:  after reading, does the reader know what Spell is and what to do next' },
      honest: { type: 'number', description: '1-10:  nothing claimed beyond what runs;  every fact of the original kept;  every spell shown parses' },
      best: { type: 'string', description: 'the one thing this draft does better than the others, to graft' },
      worst: { type: 'string', description: 'its one real weakness' },
    }, required: ['voice', 'keepsReading', 'understands', 'honest', 'best', 'worst'] } },
    winner: { type: 'string', description: 'exactly one of:  storyteller-2, essay-2, novice-guide' },
    why: { type: 'string' },
  },
  required: ['scores', 'winner', 'why'],
}

const LENSES = [
  { id: 'curious-novice', weight: 2, lens: `You are a curious novice programmer:  you've written a little code (a script, a formula, a tutorial), you use AI tools, and you want to make a small thing.  Jargon without a plain explanation loses you;  a wall of text loses you;  a thing you can DO on the first screen keeps you.  Score each draft on whether you'd keep reading, whether you understand what Spell is and could take a first step, and whether it promises only what exists.  Your score counts double.` },
  { id: 'non-programmer-with-ai', weight: 1, lens: `You are a person who doesn't program at all but uses AI tools daily and wants an app of your own.  Score each draft on whether you'd keep reading, whether you understand what Spell is and could take a first step, and whether it promises only what exists.` },
  { id: 'house-style-and-facts', weight: 1, lens: `You are the house style's keeper.  Compare each draft against the ORIGINAL (${README}) and the brief (${BRIEF}):  every fact, link, command, output, picture, expand and index entry must survive;  no "users";  the owner's name only in WWOD's expansion;  nothing claimed that isn't built;  and every spell snippet must be real (check it against ${OUTLINE}, ${DRAWABLE} or the writer's stated scratch check).  A draft that lost facts, broke a rule or shows spell that doesn't parse scores low on "honest" whatever its prose.  Then score readability honestly:  a front page may have a voice.` },
  { id: 'developer', weight: 1, lens: `You are a developer who knows React, reading after the first screens:  does the page still get you to the developer material, is it findable, is it right?  Score each draft on whether you'd keep reading, whether you'd know what to do next, and whether it stays honest.` },
]

phase('Judge')
const list = drafts.map(d => `- ${d.voice}:  ${d.file}`).join('\n')
const judgments = (await parallel(LENSES.map(l => () =>
  agent(`${COMMON}\n${l.lens}\n\nThe drafts (read every one whole, and the original at ${README}):\n${list}\n\nScore all of them, naming each by its file name exactly (storyteller-2, essay-2, novice-guide).  Name the winner and why in one paragraph.`,
    { label: `judge:${l.id}`, phase: 'Judge', model: 'opus', effort: 'xhigh', schema: SCORE_SCHEMA })
    .then(r => r && ({ ...r, weight: l.weight, lens: l.id }))))).filter(Boolean)

const totals = {}
const norm = v => /story/i.test(v) ? 'storyteller-2' : /essay/i.test(v) ? 'essay-2' : 'novice-guide'
for (const j of judgments) for (const s of j.scores) {
  const v = norm(s.voice)
  totals[v] = (totals[v] || 0) + j.weight * (s.keepsReading + s.understands + s.honest)
}
const ranking = Object.entries(totals).sort((a, b) => b[1] - a[1])
log('Ranking (novice counted twice):  ' + ranking.map(([v, t]) => `${v} ${t}`).join(' · '))
const winner = ranking[0] ? ranking[0][0] : 'storyteller-2'
const grafts = judgments.flatMap(j => j.scores.filter(s => norm(s.voice) !== winner).map(s => `${norm(s.voice)} (${j.lens}):  ${s.best}`)).join('\n')
const weaknesses = judgments.flatMap(j => j.scores.filter(s => norm(s.voice) === winner).map(s => `(${j.lens}) ${s.worst}`)).join('\n')

phase('Synthesize')
const final = await agent(COMMON + `
Produce the FINAL page in the winner's voice, "${winner}" (read ${OUT}/${winner}.md whole and keep its voice):
fix its weaknesses as the judges saw them, and graft in the one thing each other draft did best, only where it fits the winner's voice.
The judges' notes.  Weaknesses of the winner:
${weaknesses}
The best of each other draft (read those drafts to take the actual passages):
${grafts}
Then check the result against the ORIGINAL (${README}) line by line for lost facts, links, commands, outputs, pictures, expands and index entries, and put back anything missing;  and check every spell snippet is real (the honesty rule).  Under about 600 lines with expands open.
File name:  final.md`, { label: 'synthesize', phase: 'Synthesize', model: 'opus', effort: 'xhigh' })

return { winner, ranking, judgments: judgments.map(j => ({ lens: j.lens, winner: j.winner, why: j.why, scores: j.scores.map(s => ({ voice: norm(s.voice), keepsReading: s.keepsReading, understands: s.understands, honest: s.honest })) })), final: `${OUT}/final.md`, note: final }