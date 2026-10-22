export const meta = {
  name: 'readme-judge',
  description: 'Judge the five README drafts (in the worktree) from three lenses, then synthesize the winner',
  phases: [
    { title: 'Judge', detail: 'three lenses score every draft', model: 'opus' },
    { title: 'Synthesize', detail: 'the winner, with the best of the others grafted in', model: 'opus' },
  ],
}

const README = '/Users/owen/www/spell.worktrees/readme/README.md'
const BRIEF = '/Users/owen/www/spell/spell.epics/epics/readme/parts/o2.html'
const OUT = '/Users/owen/www/spell.worktrees/readme/docs/drafts'
const VOICES = ['storyteller', 'product-page', 'tour-guide', 'react-dev', 'essay']

const COMMON = `
You are working on the front-page README of Spell (six repos;  this page is the kit's, the root everything is cloned into).
The current page is at ${README}.  The writers' brief (audience, links, stubs, words) is ${BRIEF}.
The owner's verdict on the current page:  "dry as dust".  Five rewrites in five voices exist in ${OUT}/ (storyteller.md, product-page.md, tour-guide.md, react-dev.md, essay.md).
Rules every draft had to keep:  every fact, number, command, output, link, picture, caption, expand and table of the current page;  nothing claimed that doesn't run today (what's coming stays 🌱);  no "users" (say "people");  the owner's name only in WWOD's expansion "What Would Owen Do?";  no path in running prose;  no epic names in prose;  short paragraphs and a voice are wanted on a front page.
Never write anywhere but ${OUT}/final.md.
`

const SCORE_SCHEMA = {
  type: 'object',
  properties: {
    scores: { type: 'array', items: { type: 'object', properties: {
      voice: { type: 'string' },
      keepsReading: { type: 'number', description: '1-10:  would this reader read to the end' },
      understands: { type: 'number', description: '1-10:  after reading, does the reader know what Spell is and what to do next' },
      honest: { type: 'number', description: '1-10:  nothing claimed beyond what runs;  every fact of the original kept' },
      best: { type: 'string', description: 'the one thing this draft does better than the others, to graft' },
      worst: { type: 'string', description: 'its one real weakness' },
    }, required: ['voice', 'keepsReading', 'understands', 'honest', 'best', 'worst'] } },
    winner: { type: 'string' },
    why: { type: 'string' },
  },
  required: ['scores', 'winner', 'why'],
}

const LENSES = [
  { id: 'react-dev-on-github', lens: `You are a developer who knows React and has 90 seconds on GitHub.  You skim.  You stop at the first paragraph that bores you or the first claim that smells like marketing.  Score each draft on whether you'd keep reading, whether you'd know what to do next, and whether it stays honest.` },
  { id: 'curious-non-programmer', lens: `You are a curious person who doesn't program but uses AI tools and wants to make a small app.  Jargon without a plain explanation loses you.  Score each draft on whether you'd keep reading, whether you understand what Spell is and could take a first step, and whether it promises only what exists.` },
  { id: 'house-style-and-facts', lens: `You are the house style's keeper.  First compare each draft against the ORIGINAL (${README}) and the brief (${BRIEF}):  every fact, link, command, output, picture, expand and index entry must survive;  no "users";  the owner's name only in WWOD's expansion;  nothing claimed that isn't built.  A draft that lost facts or broke a rule scores low on "honest" whatever its prose.  Then score readability honestly:  the house rule "lead then bullets" is NOT required on a front page.` },
]

phase('Judge')
const list = VOICES.map(v => `- ${v}:  ${OUT}/${v}.md`).join('\n')
const judgments = (await parallel(LENSES.map(l => () =>
  agent(`${COMMON}\n${l.lens}\n\nThe drafts (read every one whole, and the original at ${README}):\n${list}\n\nScore all of them.  Name the winner and why in one paragraph.`,
    { label: `judge:${l.id}`, phase: 'Judge', model: 'opus', effort: 'xhigh', schema: SCORE_SCHEMA })))).filter(Boolean)

const totals = {}
for (const j of judgments) for (const s of j.scores) {
  totals[s.voice] = (totals[s.voice] || 0) + s.keepsReading + s.understands + s.honest
}
const ranking = Object.entries(totals).sort((a, b) => b[1] - a[1])
log('Ranking:  ' + ranking.map(([v, t]) => `${v} ${t}`).join(' · '))
const winner = ranking[0] ? ranking[0][0] : VOICES[0]
const grafts = judgments.flatMap(j => j.scores.filter(s => s.voice !== winner).map(s => `${s.voice}:  ${s.best}`)).join('\n')
const weaknesses = judgments.flatMap(j => j.scores.filter(s => s.voice === winner).map(s => s.worst)).join('\n')

phase('Synthesize')
const final = await agent(COMMON + `
Produce the FINAL page in the winner's voice, "${winner}" (read ${OUT}/${winner}.md whole and keep its voice):
fix its weaknesses as the judges saw them, and graft in the one thing each other draft did best, only where it fits the winner's voice.
The judges' notes.  Weaknesses of the winner:
${weaknesses}
The best of each other draft (read those drafts to take the actual passages):
${grafts}
Then check the result against the ORIGINAL (${README}) line by line for lost facts, links, commands, outputs, pictures, expands and index entries, and put back anything missing.  Keep it under about 550 lines with expands open;  Mermaid blocks and their %%{init}%% lines unchanged.
Write it to ${OUT}/final.md.  Return ONLY the path and three lines on what you grafted.`,
  { label: 'synthesize', phase: 'Synthesize', model: 'opus', effort: 'xhigh' })

return { winner, ranking, judgments: judgments.map(j => ({ winner: j.winner, why: j.why, scores: j.scores })), final: `${OUT}/final.md`, note: final }