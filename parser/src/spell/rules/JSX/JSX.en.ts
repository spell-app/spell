/**
 * The `JSX` rules in English:  each rule's syntax and its tests, registered on the `JSX` module's parser.
 * - The rule CLASSES are their own files, beside this one:  what a rule does, whatever the language.
 * - Registered in the order the rules were registered before (`index.ts`):  a tie between two rules goes to the first.
 * - Another language registers the same classes with its own syntax, in `JSX.<lang>.ts` (epic `spanish`).
 */
import { P } from "spell-lang/parser"

import { JSX } from "./JSX.parser"
import { MarkdownBlock } from "./MarkdownBlock"
import { SpellJSX } from "./SpellJSX"
import { SpellJSXAttribute } from "./SpellJSXAttribute"
import { SpellJSXEndTag } from "./SpellJSXEndTag"
import { SpellJSXExpression } from "./SpellJSXExpression"
import { SpellJSXFragment } from "./SpellJSXFragment"
import { SpellJSXText } from "./SpellJSXText"

JSX.addRule(MarkdownBlock, {
  tests: [
    {
      title: "Markdown, as written",
      compileAs: "expression",
      tests: [
        [
          ["<markdown>", "\t## Klondike", "\tBuild each pile **down**, alternating colours.", "</markdown>"],
          'h("ui-markdown", "## Klondike\\nBuild each pile **down**, alternating colours.")',
          '<ui-markdown>{"## Klondike\\nBuild each pile **down**, alternating colours."}</ui-markdown>'
        ],
        // `*`, `#`, `<`, back ticks and braces in code, an escaped brace:  all untouched
        [
          [
            "<markdown>",
            "\t# Rules <small>v2</small>",
            "\t* a *list* with `{code}` and \\{braces\\}",
            "\t```css",
            "\t.red { color: crimson }",
            "\t```",
            "</markdown>"
          ],
          [
            'h("ui-markdown",',
            '  "# Rules <small>v2</small>\\n* a *list* with `{code}` and \\\\{braces\\\\}\\n```css\\n.red { color: crimson }\\n```"',
            ")"
          ],
          [
            "<ui-markdown>",
            '  {"# Rules <small>v2</small>\\n* a *list* with `{code}` and \\\\{braces\\\\}\\n```css\\n.red { color: crimson }\\n```"}',
            "</ui-markdown>"
          ]
        ],
        // inside a drawing, indented with it
        [
          ["<div>", "\t<markdown>", "\t\tHello **there**", "\t</markdown>", "</div>"],
          'h("div", h("ui-markdown", "Hello **there**"))',
          ["<div>", '  <ui-markdown>{"Hello **there**"}</ui-markdown>', "</div>"]
        ]
      ]
    },
    {
      title: "Holes, live",
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("card")
      },
      tests: [
        [
          ["<markdown>", "\tRank:  **{the rank of the card}**", "</markdown>"],
          'h("ui-markdown", () => `Rank:  **${card.rank}**`)',
          "<ui-markdown>{`Rank:  **${card.rank}**`}</ui-markdown>"
        ],
        // a back tick and `${` in the text stay text
        [
          ["<markdown>", "\t`${x}` and {the rank of the card}!", "</markdown>"],
          'h("ui-markdown", () => `\\`\\${x}\\` and ${card.rank}!`)',
          "<ui-markdown>{`\\`\\${x}\\` and ${card.rank}!`}</ui-markdown>"
        ],
        // a hole that doesn't read:  a parse error
        [
          ["<markdown>", "\tHi {foo bar baz}", "</markdown>"],
          [
            'h("ui-markdown",',
            '  () => `Hi ${null /* PARSE ERROR: Don\'t understand "{foo bar baz}" in <markdown>:  a hole is spell, e.g. {the score of the game};  write \\{ for a brace */}`',
            ")"
          ],
          [
            "<ui-markdown>",
            '  {`Hi ${null /* PARSE ERROR: Don\'t understand "{foo bar baz}" in <markdown>:  a hole is spell, e.g. {the score of the game};  write \\{ for a brace */}`}',
            "</ui-markdown>"
          ]
        ]
      ]
    }
  ]
})

JSX.addRule(SpellJSX, {
  tests: [
    {
      title: "Simple nested elements",
      compileAs: "expression",
      tests: [
        [`<a/>`, 'h("a")', "<a />"],
        [`<a></a>`, 'h("a")', "<a />"],
        [`<a b=1 c="ccc"/>`, 'h("a", { b: 1, c: "ccc" })', '<a b={1} c="ccc" />'],
        [`<a b=1 c="ccc" d></a>`, 'h("a", { b: 1, c: "ccc", d: true })', '<a b={1} c="ccc" d={true} />'],

        [`<a><b/></a>`, 'h("a", h("b"))', ["<a>", "  <b />", "</a>"]],
        [`<a><b></b></a>`, 'h("a", h("b"))', ["<a>", "  <b />", "</a>"]],
        [
          `<a A=1><b c=1>foo</b></a>`,
          'h("a", { A: 1 }, h("b", { c: 1 }, "foo"))',
          ["<a A={1}>", "  <b c={1}>foo</b>", "</a>"]
        ],
        [`<a><b><c>d</c></b></a>`, 'h("a", h("b", h("c", "d")))', ["<a>", "  <b>", "    <c>d</c>", "  </b>", "</a>"]],
        [
          `<a>\n\tBBB\n\t<c/>\n\tDDD</a>`,
          ['h("a",', '  "BBB",', '  h("c"),', '  "DDD"', ")"],
          ["<a>", "  BBB", "  <c />", "  DDD", "</a>"]
        ],
        [
          ["<ui-button ", "\thidden={1} ", "\tonPress={print 2}", "\t/>"],
          'h("ui-button", { hidden: 1, onPress: () => core.console.log(2) })',
          "<ui-button hidden={1} onPress={() => core.console.log(2)} />"
        ],
        [
          '<input attrOnly text="text" number=1 boolean={yes} expression={1 + 1} onClick={print the value of the target of the event} />',
          [
            'h("input", {',
            "  attronly: true,",
            '  text: "text",',
            "  number: 1,",
            "  boolean: true,",
            "  expression: () => 1 + 1,",
            "  onClick: (event) => core.console.log(event.target.value)",
            "})"
          ],
          '<input attronly={true} text="text" number={1} boolean={true} expression={1 + 1} onClick={(event) => core.console.log(event.target.value)} />'
        ]
      ]
    },
    {
      title: "Attribute expressions",
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("card")
      },
      tests: [
        [`<div foo/>`, 'h("div", { foo: true })', "<div foo={true} />"],
        [
          `<div rank={the rank of the card} value={1 + 2 + 3}/>`,
          'h("div", { rank: () => card.rank, value: () => 1 + 2 + 3 })',
          "<div rank={card.rank} value={1 + 2 + 3} />"
        ],
        [
          `<div rank={unknown expression} value={another unknown expression}/>`,
          [
            'h("div", {',
            '  rank: undefined /* PARSE ERROR: Don\'t understand "unknown expression" */,',
            '  value: undefined /* PARSE ERROR: Don\'t understand "another unknown expression" */',
            "})"
          ],
          "<div />"
        ],
        // DO parse a statement as an attribute expression
        [
          `<div on-click={print 1024}/>`,
          'h("div", { "on-click": () => core.console.log(1024) })',
          "<div on-click={() => core.console.log(1024)} />"
        ],
        // don't match attribute expressions that don't eat the entire text
        [
          "<div foo={true true}/>",
          'h("div", { foo: undefined /* PARSE ERROR: Don\'t understand "true true" */ })',
          "<div />"
        ],
        // ignore newlines in attribute expression
        // NOTE: this was once a comma expression `(a, b)`, not a `[a, b]` tuple,
        // which JS silently evaluated to a single-element array (the comma operator discards `a`).
        // `RuleTest`'s tuple typing caught it;  fixed to the evidently-intended 2-tuple.
        ["<div foo={\n1 + \n\t2\n\t}/>", 'h("div", { foo: () => 1 + 2 })', "<div foo={1 + 2} />"]
      ]
    },
    {
      title: "The page's names, decided when it compiles",
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("card")
      },
      tests: [
        // React's spellings, as the page spells them;  `class` first
        [
          `<td colSpan=2 htmlFor="x" className="suit"/>`,
          'h("td", { class: "suit", colspan: 2, for: "x" })',
          '<td class="suit" colspan={2} for="x" />'
        ],
        // on a `ui-*` tag, a value that can change is a property;  text, a dashed name and `class` stay attributes
        [
          `<ui-form value={the card} debug aria-label="Done" className={the card}/>`,
          'h("ui-form", { class: () => card, "prop:value": () => card, debug: true, "aria-label": "Done" })',
          '<ui-form class={card} prop:value={card} debug={true} aria-label="Done" />'
        ],
        // a dotted tag is a compile error:  `h()` would draw a `<UI>` with class `Form`
        [
          `<UI.Form/>`,
          "null /* PARSE ERROR: <UI.Form> isn't an element:  write Spell UI's own tag, e.g. <ui-form> */",
          "<UI.Form />"
        ]
      ]
    },
    {
      title: "Spell's words for the web's slots:  <children/> and in=",
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("card")
      },
      tests: [
        // where a drawable list's items show
        [`<children/>`, 'h("slot")', "<slot />"],
        // a named place
        [`<children name="header"/>`, 'h("slot", { name: "header" })', '<slot name="header" />'],
        // with what shows while it's empty
        [
          `<children name="header">Pile</children>`,
          'h("slot", { name: "header" }, "Pile")',
          '<slot name="header">Pile</slot>'
        ],
        // the web's own word keeps working
        [`<slot/>`, 'h("slot")', "<slot />"],
        [`<slot name="header"/>`, 'h("slot", { name: "header" })', '<slot name="header" />'],
        // a child says which named place it goes in
        [`<h3 in="header">Pile 1</h3>`, 'h("h3", { slot: "header" }, "Pile 1")', '<h3 slot="header">Pile 1</h3>'],
        [`<h3 slot="header">Pile 1</h3>`, 'h("h3", { slot: "header" }, "Pile 1")', '<h3 slot="header">Pile 1</h3>'],
        // on a custom tag, `slot` stays an attribute, even with a value that can change
        [`<game-card in={the card}/>`, 'h("game-card", { slot: () => card })', "<game-card slot={card} />"],
        // a frame with both
        [
          `<div className="pile"><children name="header"/><children/></div>`,
          ['h("div", { class: "pile" },', '  h("slot", { name: "header" }),', '  h("slot")', ")"],
          ['<div class="pile">', '  <slot name="header" />', "  <slot />", "</div>"]
        ]
      ]
    },
    {
      title: "Inline expressions",
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("card")
      },
      tests: [
        [
          `<div foo={<a><b><c>{1}</c></b></a>}/>`,
          'h("div", { foo: h("a", h("b", h("c", 1))) })',
          ["<div foo={<a>", "  <b>", "    <c>{1}</c>", "  </b>", "</a>} />"]
        ],
        // compound expression
        [`<div>{1 + 2 + 3}</div>`, 'h("div", () => 1 + 2 + 3)', "<div>{1 + 2 + 3}</div>"],
        // multi-line expression is fine
        ["<div>{\n\t1 + \n2 + 3\t\n}</div>", 'h("div", () => 1 + 2 + 3)', "<div>{1 + 2 + 3}</div>"],
        //
        [`<div>{the rank of the card}</div>`, 'h("div", () => card.rank)', "<div>{card.rank}</div>"],
        // fail if we don't eat entire expression
        [
          `<div>{true true}</div>`,
          'h("div", null /* PARSE ERROR: Don\'t understand "true true" */)',
          '<div>{null /* PARSE ERROR: Don\'t understand "true true" */}</div>'
        ],
        // fail on unknown expression
        [
          `<div>{unknown expression}</div>`,
          'h("div", null /* PARSE ERROR: Don\'t understand "unknown expression" */)',
          '<div>{null /* PARSE ERROR: Don\'t understand "unknown expression" */}</div>'
        ],
        // DO NOT parse a inline statement as a JSXExpression
        [
          `<div>{print 1024}</div>`,
          'h("div", null /* PARSE ERROR: Don\'t understand "print 1024" */)',
          '<div>{null /* PARSE ERROR: Don\'t understand "print 1024" */}</div>'
        ]
      ]
    }
  ]
})

JSX.addRule(SpellJSXFragment, {
  tests: [
    {
      title: "Explicit fragments:  <>...</>",
      compileAs: "expression",
      tests: [
        [`<><a/><b/></>`, ["[", '  h("a"),', '  h("b")', "]"], ["<>", "  <a />", "  <b />", "</>"]],
        [`<></>`, "[]", "<></>"],
        [`<>Hello</>`, '["Hello"]', "<>Hello</>"],
        [
          `<>\n\t<a>A</a>\n\t<b>B</b>\n</>`,
          ["[", '  h("a", "A"),', '  h("b", "B")', "]"],
          ["<>", "  <a>A</a>", "  <b>B</b>", "</>"]
        ],
        // inside an element, and an element inside it
        [
          `<div><><a/>{1 + 2}</></div>`,
          ['h("div",', "  [", '    h("a"),', "    () => 1 + 2", "  ]", ")"],
          ["<div>", "  <>", "    <a />", "    {1 + 2}", "  </>", "</div>"]
        ]
      ]
    },
    {
      title: "Implicit fragments:  elements one after another",
      compileAs: "expression",
      tests: [
        // on one line
        [`<a>A</a> <b>B</b>`, ["[", '  h("a", "A"),', '  h("b", "B")', "]"], ["<>", "  <a>A</a>", "  <b>B</b>", "</>"]],
        // on the next line
        [
          `<ui-container>\n\tA\n</ui-container>\n<ui-grid>\n\tB\n</ui-grid>`,
          ["[", '  h("ui-container", "A"),', '  h("ui-grid", "B")', "]"],
          ["<>", "  <ui-container>A</ui-container>", "  <ui-grid>B</ui-grid>", "</>"]
        ]
      ]
    }
  ]
})

JSX.addRule(SpellJSXAttribute)

JSX.addRule(SpellJSXText)

JSX.addRule(SpellJSXEndTag)

JSX.addRule(SpellJSXExpression)
