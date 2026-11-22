/**
 * `yarn tsx scripts/bubbly-page.ts [--out <folder>]`:  draws the drawn-bubbly page, `card-bubbly.html`, with the real
 * code (epic `language` P49), and writes the look's sheet beside it.
 * - Solitaire's four files, then the Spanish card, then two HTML pages (`BubblyMarkup`), each laid out by the parser (`SP.BubblyLayout`) and drawn by
 *   `BubblyHtml`:  what `<spell-code>` shows, with each declaration in a `<ui-section>` the page's comments anchor to.
 * - The English files are laid out as ONE text, so each file's steps know the others' types and phrases.
 * - Then "Roles":  the roles-to-look table (epic `language` P60), each role's example a line of Solitaire, drawn.
 * - Also `bubbly.css` beside it:  a GENERATED copy of the app's sheet, the look's one home, which the analysis
 *   page's mock-ups link too.
 * - `--out`:  the page's folder, by default the epic repo's `epics/language/details/` (`epic config contentFolder`).
 * - Run from the app folder's root.
 */
import { execFileSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

import { SP } from "spell/parser/spell"
import { parseSpellProject } from "spell/parser/spell/test"
import { BubblyHtml } from "spell/app/app/components/spell-code/BubblyHtml"
import { BubblyMarkup } from "spell/app/app/components/spell-code/BubblyMarkup"

const outIndex = process.argv.indexOf("--out")
const OUT = resolve(
  outIndex > 0
    ? process.argv[outIndex + 1]!
    : join(execFileSync("epic", ["config", "contentFolder"], { encoding: "utf8" }).trim(), "epics/language/details")
)
const EXAMPLES = resolve("spaces/@spell/examples")
const SHEET = resolve("src/app/components/spell-code/bubbly.css")

/** Each drawing on the page:  its section's id and label, its files, its language. */
const DRAWINGS = [
  { id: "plain", label: "The card", files: ["Solitaire/Card.spell"] },
  { id: "solitaire", label: "Solitaire, the game", files: ["Solitaire/Solitaire.spell"] },
  { id: "pile", label: "Pile", files: ["Solitaire/Pile.spell"] },
  { id: "deck", label: "Deck", files: ["Solitaire/Deck.spell"] },
  { id: "carta", label: "La carta, en español", files: ["Solitario/Carta.es.spell"], lang: "es" },
  { id: "html-editor", label: "HTML:  the spell-editor demo", files: ["app/demo/spell-editor.html"], html: true }
]

/** The English files read as one text, card first:  alone, the game's steps can't know the card's phrases. */
const ENGLISH_ORDER = [
  "Solitaire/Card.spell",
  "Solitaire/Pile.spell",
  "Solitaire/Deck.spell",
  "Solitaire/Solitaire.spell"
]

/**
 * The roles-to-look table (epic `language` P60):  what each role is put on, how it draws, and a line of Solitaire that
 * shows it, found by its words.  The same table, as text:  `bubbly.css`'s header.
 */
const ROLES = [
  {
    role: "band",
    on: "the rule",
    draws: "the head's band, in its part of speech's colour",
    line: "after moving a card to a pile"
  },
  {
    role: "declaration",
    on: "a group, a word",
    draws: "a white pill:  what a person typed",
    line: 'its "suit" is one of'
  },
  {
    role: "blank",
    on: "a group",
    draws: "dotted underline in its pill, its kind word bold",
    line: "to move a card to a pile"
  },
  { role: "name", on: "a group, a word", draws: "bold", line: "it is droppable when" },
  { role: "choice", on: "a group", draws: "a bold pill for each value", line: 'its "rank" is one of' },
  {
    role: "value",
    on: "the rule, its groups",
    draws: "one dotted underline, outermost only",
    line: "add each card in the deck to the stock"
  },
  {
    role: "question",
    on: "the rule",
    draws: "one dotted underline, with what it asks of",
    line: "and the card is on top of its pile"
  },
  { role: "action call", on: "the rule", draws: "one dotted underline, whole", line: "turn over the next card" },
  { role: "quantity", on: "the rule", draws: "one dotted underline", line: "pause for 10 msec" },
  {
    role: "written value",
    on: "the rule",
    draws: "italic, never underlined",
    line: "set seven to a new card whose rank is 7"
  },
  { role: "plain", on: "a group", draws: "no bold, no underline", line: "return item column of" }
]

/** Solitaire's files, each drawn in its project's parse, as the editor draws them:  the roles' examples. */
const solitaireDrawings = parseSpellProject(
  ENGLISH_ORDER.map((file) => ({
    path: `/${file.split("/")[1]}`,
    contents: readFileSync(join(EXAMPLES, file), "utf8")
  }))
).files.map(({ contents, scope, match }) =>
  SP.BubblyLayout.of(contents, scope.parser as SP.SpellParser, {
    within: { match, inputLines: contents.split("\n") } as unknown as SP.SpellFile
  })
)

const ids = new Set<string>()
const drawn = new Map<string, string>()
const english = ENGLISH_ORDER.map((file) => readFileSync(join(EXAMPLES, file), "utf8"))
const whole = SP.BubblyLayout.of(english.join("\n"))
let from = 0
for (const [index, file] of ENGLISH_ORDER.entries()) {
  const to = from + english[index]!.length
  const nodes = whole.nodes.filter((node) => startOf(node) >= from && startOf(node) <= to)
  drawn.set(file, BubblyHtml.write({ ...whole, nodes }, { sections: { idPrefix: idOf(file), ids } }))
  from = to + 1
}
for (const { files, lang } of DRAWINGS.filter((drawing) => drawing.lang)) {
  const [file] = files
  const text = readFileSync(join(EXAMPLES, file!), "utf8")
  const layout = SP.BubblyLayout.of(text, SP.Language.for(lang).parser)
  drawn.set(file!, BubblyHtml.write(layout, { sections: { idPrefix: idOf(file!), ids } }))
}

// HTML, drawn the same way with its corners cut (`BubblyMarkup`):  files from the app folder's root
for (const { files } of DRAWINGS.filter((drawing) => drawing.html)) {
  // its `<style>` left out:  page CSS, noise beside the markup (Owen)
  const html = readFileSync(resolve(files[0]!), "utf8").replace(/[ \t]*<style\b[\s\S]*?<\/style>[ \t]*\n?/gi, "")
  drawn.set(files[0]!, BubblyMarkup.write(html))
}

const rolesSection = `
          <ui-section id="roles" label="${DRAWINGS.length + 1}. Roles:  what each part is, and how it draws" sticky collapsible dividing open="false">
            <p>Each grammar rule says what its parts ARE, its roles, beside its syntax;  each role draws one way.
              A rule with no roles draws by the defaults:  names bold, Spell's own words plain, written values italic.</p>
            <ui-table celled padding="compact" appearance="striped" unstackable><table>
              <thead><tr><th>Role</th><th>Put on</th><th>Draws as</th><th>In Solitaire</th></tr></thead>
              <tbody>${ROLES.map(
                ({ role, on, draws, line }) =>
                  `<tr><td><code>${role}</code></td><td>${on}</td><td>${draws}</td><td>${exampleLine(line)}</td></tr>`
              ).join("")}</tbody>
            </table></ui-table>
          </ui-section>
`

const sections = DRAWINGS.map(
  ({ id, label, files }, index) => `
          <ui-section id="${id}" label="${index + 1}. ${label}" sticky collapsible dividing open="false">
            ${files.map((file) => drawn.get(file)).join("")}
          </ui-section>
`
).join("")

writeFileSync(
  join(OUT, "card-bubbly.html"),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Card, Drawn Bubbly</title>
    <meta
      name="description"
      content="Solitaire drawn in the bubbly look by Spell's own code:  its card, the game, its piles and its deck, then the card in Spanish, for Owen's comments"
    />
    <link rel="stylesheet" href="/_epic/assets/spell-doc.css" />
    <!-- the look:  a generated copy of the app's bubbly.css, its one home -->
    <link rel="stylesheet" href="bubbly.css" />
  </head>
  <body class="spell-doc-page spell-details-page">
    <ui-root>
      <ui-components source="/_epic/pack/epics.pack.js"></ui-components>
      <spell-site-header></spell-site-header>
      <div class="spell-doc">
        <main class="spell-doc-main">
          <!--
            GENERATED by the app folder's scripts/bubbly-page.ts (epic language P49):  regenerate it, never edit it.
            A DETAILS PAGE that takes COMMENTS:  no questions and no Send of its own, so the page server
            says it takes them (commentsRoutes.ts, \`commentsPage()\`), and the docs runtime draws a bullhorn on each block.
            - each declaration is a block:  a \`<ui-section class="bubbly-section">\` with an id, no look of its own
            - each line is a \`<p>\`:  a comment on selected text (Cmd I) sits under its line
            - drawn by the real code:  the parser's layout (\`SP.BubblyLayout\`), the app's \`BubblyHtml\`, the app's sheet
          -->
          <ui-breadcrumbs class="spell-crumbs" size="small" aria-label="Breadcrumb">
            <ui-breadcrumb link="/pages/index.html" target="src-packages-docs-index-html">Docs</ui-breadcrumb>
            <ui-breadcrumb link="/epics/language/language.plan.html" target="language">language</ui-breadcrumb>
            <ui-breadcrumb link="/epics/language/details/spellml-or-plain.html">Tags or Plain Spell</ui-breadcrumb>
            <ui-breadcrumb selected>Card, Drawn Bubbly</ui-breadcrumb>
          </ui-breadcrumbs>
          <ui-sticky class="spell-h1"
            ><header class="spell-page-head">
              <h1>Card, Drawn Bubbly</h1>
            </header></ui-sticky
          >
          <p class="lede">
            Solitaire in the bubbly look, every line, drawn by Spell's own code as every page that shows Spell now draws
            it:  its card, the game, its piles and its deck, then the card in Spanish;  last, two of the app's HTML pages, drawn the same way with their corners cut. Comment on any block with its
            bullhorn, or select some text and press ⌘ I.
          </p>
${sections}${rolesSection}        </main>
      </div>
    </ui-root>
    <script src="/_epic/assets/highlight.min.js"></script>
    <script src="/_epic/assets/spell-ui.js"></script>
  </body>
</html>
`
)
writeFileSync(
  join(OUT, "bubbly.css"),
  `/* GENERATED by the app folder's scripts/bubbly-page.ts:  a copy of its src/app/components/spell-code/bubbly.css,
 * the bubbly look's one home.  Edit that, never this. */

${readFileSync(SHEET, "utf8")}`
)
console.info(`Wrote card-bubbly.html and bubbly.css in ${OUT}`)

/**
 * The first line of Solitaire starting with `words`, drawn alone:  a head on its band, no body;  a step as it is.
 * - Drawn as the editor draws it, in its project's parse (`solitaireDrawings`):  a call of its own actions is one.
 * - throws if no line holds them:  the table's example has gone from Solitaire
 */
function exampleLine(words: string): string {
  for (const drawing of solitaireDrawings) {
    const node = lineIn(drawing, words)
    if (node) return BubblyHtml.write({ ...drawing, nodes: [node] })
  }
  throw new TypeError(`bubbly-page:  no line of Solitaire starts \`${words}\`;  pick another for its role`)
}

/** `drawing`'s first line starting with `words`:  a head with no body, or a step at no depth. */
function lineIn(drawing: SP.BubblyDrawing, words: string): SP.BubblyNode | undefined {
  const holds = (line: SP.BubblyLine) => drawing.text.slice(line.start, line.end).startsWith(words)
  const find = (nodes: SP.BubblyNode[]): SP.BubblyNode | undefined => {
    for (const node of nodes) {
      if (node.kind === "line" && holds(node)) return { ...node, depth: 0 }
      if (node.kind === "block") {
        if (holds(node.head)) return { ...node, level: 0, body: [] }
        const found = find(node.body)
        if (found) return found
      }
    }
    return undefined
  }
  return find(drawing.nodes)
}

/** Where `node` starts. */
function startOf(node: SP.BubblyNode): number {
  return node.kind === "gap" ? node.start : node.kind === "line" ? node.start : node.head.start
}

/** A file's section ids' prefix:  its drawing's id. */
function idOf(file: string): string {
  return DRAWINGS.find((drawing) => drawing.files.includes(file))!.id
}
