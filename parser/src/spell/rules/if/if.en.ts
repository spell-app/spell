/**
 * The `if` rules in English:  each rule's syntax and its tests, registered on the `if` module's parser.
 * - The rule CLASSES are their own files, beside this one:  what a rule does, whatever the language.
 * - Registered in TIE-BREAK order, the order `index.ts` once listed them:  a tie between two rules goes to the first.
 * - Another language registers the same classes with its own syntax, in `if.<lang>.ts` (epic `spanish`).
 */
import { P } from "spell/parser/parser"

import { _if_ } from "./if.parser"
import { BackwardsIf } from "./BackwardsIf"
import { Else } from "./Else"
import { ElseIf } from "./ElseIf"
import { If } from "./If"
import { ValueIf } from "./ValueIf"
import { ValueOtherwise } from "./ValueOtherwise"
import { StatementIf } from "./StatementIf"
import { ReturnOtherwise } from "./ReturnOtherwise"

_if_.addRule(If, {
  syntax: "if {condition:expression} (then|:)? {statement_body}?",
  tests: [
    {
      title: "correctly matches single-line if statements",
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        ;(scope as P.BlockScope).variables.add("a")
      },
      tests: [
        ["if a", "if (a) {}"],
        ["if a then", "if (a) {}"],
        ["if a:", "if (a) {}"],
        ["if a then b = 1", "if (a) { const b = 1 }", "if (a) { const b: number = 1 }"],
        ["if a: b = 1", "if (a) { const b = 1 }", "if (a) { const b: number = 1 }"],
        ["if a : b = 1", "if (a) { const b = 1 }", "if (a) { const b: number = 1 }"]
      ]
    },
    {
      title: "correctly matches multi-line if blocks",
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        ;(scope as P.BlockScope).variables.add("a")
      },
      tests: [
        {
          title: "Separate blocks if no indentation on second line.",
          input: ["if a:", "b = 1"],
          js: ["if (a) {}", "export const b = 1"],
          ts: ["if (a) {}", "export const b: number = 1"] // NOTE: this is correct!
        },
        {
          title: "Single tabbed statement appears inline",
          input: ["if a:", "\tb = 1"],
          js: "if (a) { const b = 1 }",
          ts: "if (a) { const b: number = 1 }"
        },
        {
          title: "ANY number of spaces should count as indentation",
          input: ["if a:", " b = 1"],
          js: "if (a) { const b = 1 }",
          ts: "if (a) { const b: number = 1 }"
        },
        {
          title: "Indent with tab, output has tabs spaces",
          input: ["if a:", "\tb = 1", "\tc=1"],
          js: ["if (a) {", "  const b = 1", "  const c = 1", "}"],
          ts: ["if (a) {", "  const b: number = 1", "  const c: number = 1", "}"]
        },
        {
          title: "Multiple lines in the nested block",
          input: ["if a:", "\tb = 1", "\tc = 2"],
          js: ["if (a) {", "  const b = 1", "  const c = 2", "}"],
          ts: ["if (a) {", "  const b: number = 1", "  const c: number = 2", "}"]
        },
        {
          title: "Nested ifs work fine",
          input: ["if a", "\tb = 1", "\tif b", "\t\tc = 2", "\t\td = 3"],
          js: ["if (a) {", "  const b = 1", "  if (b) {", "    const c = 2", "    const d = 3", "  }", "}"],
          ts: [
            "if (a) {",
            "  const b: number = 1",
            "  if (b) {",
            "    const c: number = 2",
            "    const d: number = 3",
            "  }",
            "}"
          ]
        },
        {
          title: "Show error if nested block AND inline statement. Prefer block.",
          input: ["if a b = 1", "\tc = 2"],
          js: ["if (a) { const c = 2 }", "/* PARSE ERROR: Got both inline statement and nested block */"],
          ts: ["if (a) { const c: number = 2 }", "/* PARSE ERROR: Got both inline statement and nested block */"]
        }
      ]
    }
  ]
})

_if_.addRule(ElseIf, {
  syntax: "(otherwise|else) if {condition:expression} (then|:)? {statement_body}?",
  tests: [
    {
      title: "correctly matches single-line else_if statements",
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        ;(scope as P.BlockScope).variables.add("a")
      },
      tests: [
        ["otherwise if a", "else if (a) {}"],
        ["else if a", "else if (a) {}"],
        ["else if a:", "else if (a) {}"],
        ["else if a then", "else if (a) {}"],
        ["else if a b = 1", "else if (a) { const b = 1 }", "else if (a) { const b: number = 1 }"],
        ["else if a: b = 1", "else if (a) { const b = 1 }", "else if (a) { const b: number = 1 }"],
        ["else if a then b = 1", "else if (a) { const b = 1 }", "else if (a) { const b: number = 1 }"]
      ]
    },
    {
      title: "correctly matches multi-line else_if blocks",
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        ;(scope as P.BlockScope).variables.add("a")
      },
      tests: [
        {
          title: "Separate blocks if no indentation on second line.",
          input: ["else if a:", "b = 1"],
          js: ["else if (a) {}", "export const b = 1"],
          ts: ["else if (a) {}", "export const b: number = 1"]
        },
        {
          title: "Indent with tab",
          input: ["else if a:", "\tb = 1"],
          js: "else if (a) { const b = 1 }",
          ts: "else if (a) { const b: number = 1 }"
        },
        {
          title: "ANY number of spaces should count as indentation",
          input: ["else if a:", " b = 1"],
          js: "else if (a) { const b = 1 }",
          ts: "else if (a) { const b: number = 1 }"
        },
        {
          title: "Multiple lines in the nested block",
          input: ["else if a:", "\tb = 1", "\tc = 2"],
          js: ["else if (a) {", "  const b = 1", "  const c = 2", "}"],
          ts: ["else if (a) {", "  const b: number = 1", "  const c: number = 2", "}"]
        },
        {
          title: "Nested else ifs work fine",
          input: ["else if a", "\tif a", "\t\tc=2"],
          js: "else if (a) { if (a) { const c = 2 } }",
          ts: "else if (a) { if (a) { const c: number = 2 } }"
        },
        {
          title: "Show error if nested block AND inline statement. Prefer block.",
          input: ["else if a b = 1", "\tc = 2"],
          js: ["else if (a) { const c = 2 }", "/* PARSE ERROR: Got both inline statement and nested block */"],
          ts: ["else if (a) { const c: number = 2 }", "/* PARSE ERROR: Got both inline statement and nested block */"]
        }
      ]
    }
  ]
})

_if_.addRule(Else, {
  syntax: "(otherwise|else) :? {statement_body}?",
  tests: [
    {
      title: "correctly matches single-line else statements",
      compileAs: "block",
      tests: [
        // `otherwise` is the one word Spell writes;  `else` reads too (epic `language` P55, Q57)
        ["otherwise", "else {}"],
        ["else", "else {}"],
        ["else: b = 1", "else { const b = 1 }", "else { const b: number = 1 }"],
        ["otherwise: b = 1", "else { const b = 1 }", "else { const b: number = 1 }"],
        ["else b = 1", "else { const b = 1 }", "else { const b: number = 1 }"],
        ["otherwise b = 1", "else { const b = 1 }", "else { const b: number = 1 }"]
      ]
    },
    {
      title: "correctly matches multi-line else blocks",
      compileAs: "block",
      tests: [
        {
          title: "Separate blocks if no indentation on second line.",
          input: ["else", "b = 1"],
          js: ["else {}", "export const b = 1"],
          ts: ["else {}", "export const b: number = 1"]
        },
        {
          title: "Indent with tab",
          input: ["else", "\tb = 1"],
          js: "else { const b = 1 }",
          ts: "else { const b: number = 1 }"
        },
        {
          title: "ANY number of spaces should count as indentation",
          input: ["else", " b = 1"],
          js: "else { const b = 1 }",
          ts: "else { const b: number = 1 }"
        },
        {
          title: "Multiple lines in the nested block",
          input: ["else", "\tb = 1", "\tlet c = 2"],
          js: ["else {", "  const b = 1", "  const c = 2", "}"],
          ts: ["else {", "  const b: number = 1", "  const c: number = 2", "}"]
        },
        {
          title: "Show error if nested block AND inline statement. Prefer block.",
          input: ["else b = 1", "\tc = 2"],
          js: ["else { const c = 2 }", "/* PARSE ERROR: Got both inline statement and nested block */"],
          ts: ["else { const c: number = 2 }", "/* PARSE ERROR: Got both inline statement and nested block */"]
        }
      ]
    }
  ]
})

_if_.addRule(BackwardsIf, {
  syntax: "if {operator:expression} (else|otherwise) (it is)? {expression}",
  tests: [
    {
      title: "correctly matches single-line backwards_if statements",
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        const { variables } = scope as P.BlockScope
        variables.add("bar")
        variables.add("foo")
      },
      tests: [
        {
          input: "print 1 if bar else 2",
          js: "core.console.log(bar ? 1 : 2)"
        },
        {
          input: "get the foo of the bar if bar is defined otherwise the bar of the foo",
          js: "const it = bar !== undefined ? bar.foo : foo.bar"
        },
        {
          input: `set color to "red" if 1 + 1 else "black"`,
          js: 'export const color = 1 + 1 ? "red" : "black"'
        },
        {
          title: "`otherwise it is X` is the other value, never a comparison with it (epic `spanish` I8)",
          input: `set color to "red" if bar otherwise it is "black"`,
          js: 'export const color = bar ? "red" : "black"'
        }
      ]
    }
  ]
})

_if_.addRule(ValueIf, {
  syntax:
    "(value:{expression}|{constant}) if {condition:expression} (otherwise it is (otherValue:{constant}|{expression}))?",
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        ;(scope as P.BlockScope).variables.add("suit")
      },
      tests: [
        [
          ["to pick a color:", `\tred if suit is "hearts"`],
          [
            "export function pickAColor() {",
            '  return core.asAction({ undoneAs: "Pick a Color" }, () => {',
            '    if (suit === "hearts") return "red"',
            "  })",
            "}"
          ]
        ]
      ]
    },
    {
      title: "Outside a getter or method:  an error saying where it belongs (epic page `outline-spell`, I9)",
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        ;(scope as P.BlockScope).variables.add("suit")
      },
      tests: [
        [
          `red if suit is "hearts"`,
          '/* PARSE ERROR: A line of a getter\'s body:  put it under one, e.g. "the color of a card is:" */'
        ]
      ]
    }
  ]
})

_if_.addRule(ValueOtherwise, {
  // the value before its word, or after it, as a sentence puts it:  `black otherwise`, `otherwise black` (epic `language` I110)
  syntax: "(((otherwise|else) (value:{expression}|{constant}))|((value:{expression}|{constant}) (otherwise|else)))",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          ["to pick a color:", "\totherwise black"],
          [
            "export function pickAColor() {",
            '  return core.asAction({ undoneAs: "Pick a Color" }, () => {',
            '    return "black"',
            "  })",
            "}"
          ]
        ],
        [
          ["to pick a color:", "\tblack otherwise"],
          [
            "export function pickAColor() {",
            '  return core.asAction({ undoneAs: "Pick a Color" }, () => {',
            '    return "black"',
            "  })",
            "}"
          ]
        ]
      ]
    },
    {
      title:
        "The word first, as the last line of a ladder;  a statement after it stays `else`'s (epic `language` I110)",
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.compile("a card is a thing\na card has a value as number\na pile is a list of cards")
        ;(scope as P.BlockScope).variables.add("bar")
      },
      tests: [
        {
          input: ["a pile:", '\t- its "value" is', "\t\t0 if it is empty", "\t\totherwise the value of its last card"],
          js: [
            'Object.defineProperty(Pile.prototype, "value", {',
            "  get() {",
            "    if (this.isEmpty) return 0",
            "    return this.lastItem.value",
            "  },",
            "  configurable: true",
            "})"
          ],
          ts: [
            "export interface Pile { readonly value: number }",
            'Object.defineProperty(Pile.prototype, "value", {',
            "  get(this: Pile) {",
            "    if (this.isEmpty) return 0",
            "    return this.lastItem!.value",
            "  },",
            "  configurable: true",
            "})"
          ]
        },
        {
          input: ["to count the points:", "\treturn", "\t\t- 10 if bar", "\t\t- otherwise 0"],
          js: [
            "export function countThePoints() {",
            '  return core.asAction({ undoneAs: "Count the Points" }, () => {',
            "    if (bar) return 10",
            "    return 0",
            "  })",
            "}"
          ]
        },
        {
          input: ["to count the points:", "\tif bar", "\t\tprint 1", "\totherwise print 2"],
          js: [
            "export function countThePoints() {",
            '  return core.asAction({ undoneAs: "Count the Points" }, () => {',
            "    if (bar) core.console.log(1)",
            "    else core.console.log(2)",
            "  })",
            "}"
          ]
        },
        {
          input: ["to count the points:", "\tif bar", "\t\tprint 1", "\totherwise bar = 2"],
          js: [
            "export function countThePoints() {",
            '  return core.asAction({ undoneAs: "Count the Points" }, () => {',
            "    if (bar) core.console.log(1)",
            "    else bar = 2",
            "  })",
            "}"
          ]
        }
      ]
    }
  ]
})

// a statement, then when it runs (epic `language` P55):  `return yes if the card is a king`
_if_.addRule(StatementIf, {
  syntax: "{statement} if {condition:expression}",
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        const { variables } = scope as P.BlockScope
        variables.add("bar")
        variables.add("foo")
      },
      tests: [
        { input: "return yes if bar", js: "if (bar) return true" },
        { input: 'print "won" if bar is 52', js: 'if (bar === 52) core.console.log("won")' },
        {
          title: "with `otherwise` it's `backwards_if`'s, a value either way",
          input: "print 1 if bar otherwise 2",
          js: "core.console.log(bar ? 1 : 2)"
        },
        {
          title: "a statement with a body keeps its own:  the inline body is ours",
          input: "if foo then print 1 if bar",
          js: "if (foo) { if (bar) core.console.log(1) }"
        }
      ]
    }
  ]
})

// the last of a run of `return ... if ...` lines (epic `language` I96):  `return 0 otherwise`
_if_.addRule(ReturnOtherwise, {
  syntax: "(return|exit with?) {value:expression} (otherwise|else)",
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        ;(scope as P.BlockScope).variables.add("bar")
      },
      tests: [
        [
          ["to count the points:", "\treturn 10 if bar", "\treturn 5 if bar is 2", "\treturn 0 otherwise"],
          [
            "export function countThePoints() {",
            '  return core.asAction({ undoneAs: "Count the Points" }, () => {',
            "    if (bar) return 10",
            "    if (bar === 2) return 5",
            "    return 0",
            "  })",
            "}"
          ]
        ],
        {
          title: "a comment between them is fine",
          input: ["to count the points:", "\treturn 10 if bar", "\t// else nothing", "\treturn 0 otherwise"],
          js: [
            "export function countThePoints() {",
            '  return core.asAction({ undoneAs: "Count the Points" }, () => {',
            "    if (bar) return 10",
            "    // else nothing",
            "    return 0",
            "  })",
            "}"
          ]
        }
      ]
    }
  ]
})
