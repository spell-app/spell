export const meta = {
  name: 'readme-voices',
  description: 'Rewrite the kit README in five voices, judge them from three lenses, synthesize the winner',
  phases: [
    { title: 'Write', detail: 'five independent rewrites, one voice each, Opus at extra-high effort', model: 'opus' },
    { title: 'Judge', detail: 'three lenses score every draft', model: 'opus' },
    { title: 'Synthesize', detail: 'the winner, with the best of the others grafted in', model: 'opus' },
  ],
}

const README = '/Users/owen/www/spell.worktrees/readme/README.md'
const BRIEF = '/Users/owen/www/spell/spell.epics/epics/readme/parts/o2.html'
const OUT = '/private/tmp/claude-501/-Users-owen-www-spell/d5a307a4-0de5-4c43-817b-d113b0c12ede/scratchpad/readme-drafts'

const COMMON = `
You are rewriting the front-page README of Spell (six repos;  this page is the kit's, the root everything is cloned into).
The current page is at ${README}.  Read it whole first;  then read ${BRIEF} (the writers' brief:  audience, links, stubs, words).

The owner's verdict on the current page:  "dry as dust".  It is correct, complete and well linked, and nobody will keep reading it.
Your job is a page a developer WANTS to read to the end, in the voice described below, that loses NOTHING:
- every fact, number, command, output, link, picture, caption, expand and table of the current page stays (you may reorder, regroup, fold or unfold, and rewrite every sentence);  the index of every README stays complete
- nothing is claimed that doesn't run today;  what's coming stays marked 🌱
- no "users" (say "people");  the owner's name appears only in WWOD's expansion "What Would Owen Do?";  no path in running prose (link the thing's name);  no epic names in prose
- short paragraphs ARE allowed and wanted:  the house rule "a lead then bullets" is for reference text;  a front page may carry a story, a voice, rhythm, humour, a point of view.  Bullets where they help;  prose where it reads better.  Headlines that say something.
- keep it under about 550 lines with expands open;  GitHub-flavoured Markdown;  Mermaid blocks and their %%{init}%% lines unchanged
Write your draft to ${OUT}/<your-voice>.md (the file name is given below;  make the folder if needed).  Nothing else on disk changes.
Return ONLY:  the path, then three lines on what you did with the voice.
`

const VOICES = [
  { file: 'storyteller', voice: `VOICE:  the storyteller.  Open on a person with a problem (someone who wants a small app and has never programmed;  an AI writes it in spell;  they read it, change one line, it runs) and unfold the whole system from that scene:  the language, the editor, the components, the agents' tooling, the six repos.  Second person where it helps.  Every section advances the story;  the reference material (setup, commands, tests) is the "now you try" part.` },
  { file: 'product-page', voice: `VOICE:  the product page.  Confident, short paragraphs, headlines that make a promise and a body that keeps it ("English you can run.  Really.").  What it feels like to use, with real spell and real output as the proof.  Crisp, no marketing fog:  every claim is something the reader can run in the next five minutes.  The six repos are "what's in the box".` },
  { file: 'tour-guide', voice: `VOICE:  the tour guide.  The repo is a place and you're walking a visitor through it:  "You're standing in the kit.  Everything else is cloned inside it.  Over there is the language;  up those stairs is the editor."  Warm, concrete, oriented by where things ARE and what you do there.  Spatial pictures (the six repos as a map), "start here, then go there" paths, and a few asides a guide would make.` },
  { file: 'react-dev', voice: `VOICE:  the engineer's pitch to a React developer.  Contrast-driven and opinionated:  "You know components, props and a build step.  Here a component is a real element on the page;  here the program is English and the compiler runs in the browser;  here's why."  Explain each idea by what the reader already knows, say what's clever and what's unfinished, and why it's built this way.  Dry wit allowed.` },
  { file: 'essay', voice: `VOICE:  the essay.  HyperCard's promise for the web, Bret Victor, why English and not another syntax, and what an AI that writes programs changes:  the program the AI wrote is something you can READ.  Ambitious and honest, with the system laid out as the argument's evidence.  The reference material comes after the argument, under a line that says so.` },
]

phase('Write')
log('Five writers, one voice each')
const drafts = await parallel(VOICES.map(v => () =>
  agent(COMMON + '\n' + v.voice + `\nFile name:  ${v.file}.md`, { label: `write:${v.file}`, phase: 'Write', model: 'opus', effort: 'xhigh' })
    .then(text => ({ file: `${OUT}/${v.file}.md`, voice: v.file, note: text }))))
const written = drafts.filter(Boolean)
log(`${written.length} drafts written`)

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
const list = written.map(d => `- ${d.voice}:  ${d.file}`).join('\n')
const judgments = await parallel(LENSES.map(l => () =>
  agent(`${l.lens}\n\nThe drafts (read every one whole, and the original at ${README}):\n${list}\n\nScore all of them.  Name the winner and why in one paragraph.`,
    { label: `judge:${l.id}`, phase: 'Judge', model: 'opus', effort: 'xhigh', schema: SCORE_SCHEMA })))
const judged = judgments.filter(Boolean)

const totals = {}
for (const j of judged) for (const s of j.scores) {
  totals[s.voice] = (totals[s.voice] || 0) + s.keepsReading + s.understands + s.honest
}
const ranking = Object.entries(totals).sort((a, b) => b[1] - a[1])
log('Ranking:  ' + ranking.map(([v, t]) => `${v} ${t}`).join(' · '))
const winner = ranking[0] ? ranking[0][0] : (written[0] && written[0].voice)
const grafts = judged.flatMap(j => j.scores.filter(s => s.voice !== winner).map(s => `${s.voice}:  ${s.best}`)).join('\n')
const weaknesses = judged.flatMap(j => j.scores.filter(s => s.voice === winner).map(s => s.worst)).join('\n')

phase('Synthesize')
const final = await agent(COMMON + `
VOICE:  the winner's, "${winner}", kept as it is (read ${OUT}/${winner}.md whole).
Produce the FINAL page from it:  fix its weaknesses as the judges saw them, and graft in the one thing each other draft did best, only where it fits the winner's voice.
The judges' notes:
Weaknesses of the winner:
${weaknesses}
The best of each other draft (read those drafts to take the actual passages):
${grafts}
Then check the result against the ORIGINAL (${README}) line by line for lost facts, links, commands, outputs, pictures, expands and index entries, and put back anything missing.
File name:  final.md`, { label: 'synthesize', phase: 'Synthesize', model: 'opus', effort: 'xhigh' })

return { winner, ranking, judgments: judged.map(j => ({ winner: j.winner, why: j.why })), final: `${OUT}/final.md`, drafts: written.map(d => d.file), note: final }