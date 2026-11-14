import { describe, test, expect, beforeAll } from "vite-plus/test"

import { monaco } from "spell/app/app/ui/monaco/monaco"
import { SpellMonaco } from "spell/app/app/ui/monaco/SpellMonaco"
import { SpellTokensProvider } from "spell/app/app/ui/monaco/SpellTokensProvider"

/**
 * Spell's instant colouring, line by line as Monaco asks for it:  each line starts in the state the last one ended in.
 * - In a browser:  Monaco needs the DOM.
 */
describe("SpellTokensProvider", () => {
  const provider = new SpellTokensProvider()

  /** Each line's tokens as `"text" scope`, carrying the state from line to line. */
  function colour(lines: string[]): string[][] {
    let state = provider.getInitialState()
    return lines.map((line) => {
      const { tokens, endState } = provider.tokenize(line, state)
      state = endState
      return tokens
        .map((token, index) => [line.slice(token.startIndex, tokens[index + 1]?.startIndex), token.scopes] as const)
        .filter(([text, scopes]) => text.trim() && scopes)
        .map(([text, scopes]) => `${JSON.stringify(text)} ${scopes}`)
    })
  }

  // Monaco's CSS and markdown colouring load lazily
  beforeAll(() => Promise.all([monaco.editor.colorize("", "css", {}), monaco.editor.colorize("", "markdown", {})]))

  test("spell lines colour by their tokens", () => {
    expect(colour(['set x to "hi" // greet'])).toEqual([
      ['"set" identifier', '"x" identifier', '"to" identifier', '"\\"hi\\"" string', '"// greet" comment']
    ])
  })

  test("a <css> block colours as CSS, and spell picks up after </css>", () => {
    const [open, css, close, after] = colour(["\t<css>", "\t\t.red { color: red }", "\t</css>", "set x to 3"])
    expect(open).toEqual(['"<" delimiter', '"css" tag', '">" delimiter'])
    expect(css!.slice(0, 3)).toEqual(['".red" tag.css', '"{" delimiter.bracket.css', '"color:" attribute.name.css'])
    expect(close).toEqual(['"</" delimiter', '"css" tag', '">" delimiter'])
    expect(after).toContain('"3" number')
  })

  test("a <markdown> block colours as markdown, indented in a drawing, and spell picks up after it", () => {
    const [open, heading, bold, close, after] = colour([
      "\t\t<markdown>",
      "\t\t\t## Klondike",
      "\t\t\tBuild each pile **down**",
      "\t\t</markdown>",
      "set x to 3"
    ])
    expect(open).toEqual(['"<" delimiter', '"markdown" tag', '">" delimiter'])
    expect(heading).toEqual(['"## Klondike" keyword.md'])
    expect(bold).toContain('"**down**" strong.md')
    expect(close).toEqual(['"</" delimiter', '"markdown" tag', '">" delimiter'])
    expect(after).toContain('"3" number')
  })
})

/**
 * A page file colours by its own tokenizer (`SP.PageTokenizer`, epic `language` P47):
 * each tag line as its code-spell twin, its tag's own words around it;  its prose a comment.
 */
describe("SpellTokensProvider.forPages()", () => {
  const codeSpell = new SpellTokensProvider()
  const pages = SpellTokensProvider.forPages()
  // Monaco loads a language's colouring on first use:  html's, for markup
  beforeAll(() => monaco.editor.colorize("", "html", {}))

  /** Each line's tokens as `"text" scope`, carrying the state from line to line. */
  function colour(lines: string[], provider: SpellTokensProvider): string[][] {
    let state = provider.getInitialState()
    return lines.map((line) => {
      const { tokens, endState } = provider.tokenize(line, state)
      state = endState
      return tokens
        .map((token, index) => [line.slice(token.startIndex, tokens[index + 1]?.startIndex), token.scopes] as const)
        .filter(([text, scopes]) => text.trim() && scopes)
        .map(([text, scopes]) => `${JSON.stringify(text.trim())} ${scopes}`)
    })
  }

  /** The head every page below starts with. */
  const HEAD = '"card api" is a notebook page'

  // epic `language` P40:  every file `.spell`, its language from what it says
  test("a page file is Monaco's spell-page language;  a plain file stays spell", () => {
    const path = "/@spell/guides/Card.spell"
    expect(SpellMonaco.languageForPath(path, `${HEAD}\n\tA card.\n`)).toBe(SpellMonaco.PAGE_LANGUAGE)
    expect(SpellMonaco.languageForPath(path, `a "counter" is a view:\n\n${HEAD}\n`)).toBe("spell-page")
    expect(SpellMonaco.languageForPath(path, "a card is a thing")).toBe("spell")
    expect(SpellMonaco.languageForPath(path)).toBe("spell")
  })

  test("a page's head:  its name a string, its flags attribute names, its own words keywords;  its prose a comment", () => {
    expect(colour([HEAD, "\tA card, face up or down.", "\t## Its rank"], pages)).toEqual([
      ['"\\"card api\\"" string', '"is a" keyword', '"notebook" attribute.name', '"page" keyword'],
      ['"A card, face up or down." comment'],
      ['"## Its rank" comment']
    ])
  })

  test("a tag line:  its word a keyword, its phrase as its twin's words, its attributes' names", () => {
    const [, loop, card, closer] = colour(
      [HEAD, '\t<for card in its cards loading="Wait">', "\t\t<card/>", "\t</for>"],
      pages
    )
    expect(loop!.slice(0, 6)).toEqual([
      '"<" delimiter',
      '"for" keyword',
      '"card" identifier',
      '"in" identifier',
      '"its" identifier',
      '"cards" identifier'
    ])
    expect(loop).toContain('"loading" attribute.name')
    expect(card).toEqual(['"<" delimiter.html', '"card" tag.html', '"/>" delimiter.html'])
    expect(closer).toEqual(['"</for>" delimiter'])
  })

  test("a tag with its body on its line, and a comment after its closer", () => {
    const [, done] = colour([HEAD, "\t<if it is done>✓</>\t// done"], pages)
    expect(done).toEqual([
      '"<" delimiter',
      '"if" keyword',
      '"it" identifier',
      '"is" identifier',
      '"done" identifier',
      '">" delimiter',
      '"✓" operator',
      '"</>" delimiter',
      '"// done" comment'
    ])
  })

  // Owen, 2026-10-26:  `<!-- ... -->` is a page's comment, anywhere
  test("a `<!-- ... -->` comment is a comment, every line of it, and the line after it is a tag again", () => {
    const [, one, open, inside, close, after] = colour(
      [HEAD, "\t<!-- its rank -->", "\t<!--", "\t\t<if it is red> is no tag here", "\t-->", "\t<if it is red>"],
      pages
    )
    expect(one).toEqual(['"<!-- its rank -->" comment'])
    expect(open).toEqual(['"<!--" comment'])
    expect(inside).toEqual(['"<if it is red> is no tag here" comment'])
    expect(close).toEqual(['"-->" comment'])
    expect(after).toContain('"if" keyword')
  })

  test("a <spell> block's body is spell, an <if>'s markup, and the lines after a closer are tags again", () => {
    const [, , body, close, , markup, , otherwise] = colour(
      [
        HEAD,
        "\t<spell>",
        "\t\tset its count to 0",
        "\t</spell>",
        "\t<if it is red>",
        "\t\t<text>red</text>",
        "\t</if>",
        "\t<otherwise>"
      ],
      pages
    )
    expect(body).toEqual([
      '"set" identifier',
      '"its" identifier',
      '"count" identifier',
      '"to" identifier',
      '"0" number'
    ])
    expect(close).toEqual(['"</spell>" delimiter'])
    expect(markup).toContain('"text" tag.html')
    expect(otherwise).toEqual(['"<" delimiter', '"otherwise" keyword', '">" delimiter'])
  })

  // epic `editor` P25, plain since epic `language` P45:  a property editors file, `Card.editor.spell`
  test('a property editors file:  `"card" is a property editor` a line of spell, its lines markup', () => {
    const [, , head, property] = colour(
      ["# A card's property editor", "", '"card" is a property editor', '\t<ui-property name="rank" />'],
      codeSpell
    )
    expect(head).toEqual([
      '"\\"card\\"" string',
      '"is" identifier',
      '"a" identifier',
      '"property" identifier',
      '"editor" identifier'
    ])
    expect(property).toContain('"ui-property" tag.html')
    expect(property).toContain('"\\"rank\\"" attribute.value.html')
  })

  test('a property editors file\'s tag, `<property-editor "card">`:  a tag, its quoted word a value (epic `language` T125)', () => {
    const [, , head, property] = colour(
      [
        "# A card's property editor",
        "",
        '<property-editor "card">',
        '\t<ui-property name="rank" />',
        "</property-editor>"
      ],
      codeSpell
    )
    expect(head).toEqual([
      '"<" delimiter.html',
      '"property-editor" tag.html',
      '"\\"card\\"" attribute.value.html',
      '">" delimiter.html'
    ])
    expect(property).toContain('"ui-property" tag.html')
  })

  test("a .spell file's colours don't change", () => {
    const lines = [
      "a card is a thing",
      '\tits "rank" is one of ace, 2 ... 10, jack, queen, king  // ranks',
      "\t# card suit"
    ]
    expect(colour(lines, codeSpell)).toEqual([
      ['"a" identifier', '"card" identifier', '"is" identifier', '"a" identifier', '"thing" identifier'],
      [
        '"its" identifier',
        '"\\"rank\\"" string',
        '"is" identifier',
        '"one" identifier',
        '"of" identifier',
        '"ace" identifier',
        '"," operator',
        '"2" number',
        '"." operator',
        '"." operator',
        '"." operator',
        '"10" number',
        '"," operator',
        '"jack" identifier',
        '"," operator',
        '"queen" identifier',
        '"," operator',
        '"king" identifier',
        '"// ranks" comment'
      ],
      ['"# card suit" comment.header']
    ])
  })
})
