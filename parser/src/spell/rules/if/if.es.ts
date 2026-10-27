/**
 * The `if` rules in Spanish (epic `spanish`):
 * each rule's syntax and its tests, registered on Spanish's own `if` parser.
 * - The rule CLASSES are their own files, beside this one, shared with every language.
 * - Registered in the same order as `if.en.ts`, but for `else` and `else if`, which go FIRST:
 *   - `si no` is Spanish's `else`, and also `si` + the value `no`, `if false`.
 *   - Read both ways, it's the same length, and a tie goes to the first rule:  so `else` comes before `if`.
 *   - A longer `if` still wins, e.g. `si no hay una carta`:  only the `if` reads it all.
 * - Its tests compile to the same javascript as English's:  the same program, said in Spanish.
 */
import { P } from "spell/parser/parser"
import { SpellParser } from "spell/parser/spell/SpellParser"

import { BackwardsIf } from "./BackwardsIf"
import { Else } from "./Else"
import { ElseIf } from "./ElseIf"
import { If } from "./If"
import { ValueIf } from "./ValueIf"
import { ValueOtherwise } from "./ValueOtherwise"

/**
 * Spanish's `if` rules.
 * - Its tests name their variable `x` where English's say `a`:  `a` is Spanish's `to`, never a name.
 */
export const ifEs = new SpellParser({ module: "if" })

ifEs.addRule(ElseIf, {
  syntax: "(si no|sino|de lo contrario) si {condition:expression} (entonces|:)? {statement_body}?",
  tests: [
    {
      title: "correctly matches single-line else_if statements",
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        ;(scope as P.BlockScope).variables.add("x")
      },
      tests: [
        ["si no si x", "else if (x) {}"],
        ["sino si x:", "else if (x) {}"],
        ["de lo contrario si x entonces", "else if (x) {}"],
        ["si no si x b = 1", "else if (x) { const b = 1 }", "else if (x) { const b: number = 1 }"],
        ["si no si x: b = 1", "else if (x) { const b = 1 }", "else if (x) { const b: number = 1 }"],
        ["si no si x entonces b = 1", "else if (x) { const b = 1 }", "else if (x) { const b: number = 1 }"]
      ]
    },
    {
      title: "correctly matches multi-line else_if blocks",
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        ;(scope as P.BlockScope).variables.add("x")
      },
      tests: [
        {
          title: "Separate blocks if no indentation on second line.",
          input: ["si no si x:", "b = 1"],
          js: ["else if (x) {}", "export const b = 1"],
          ts: ["else if (x) {}", "export const b: number = 1"]
        },
        {
          title: "Indent with tab",
          input: ["si no si x:", "\tb = 1"],
          js: "else if (x) { const b = 1 }",
          ts: "else if (x) { const b: number = 1 }"
        },
        {
          title: "ANY number of spaces should count as indentation",
          input: ["si no si x:", " b = 1"],
          js: "else if (x) { const b = 1 }",
          ts: "else if (x) { const b: number = 1 }"
        },
        {
          title: "Multiple lines in the nested block",
          input: ["si no si x:", "\tb = 1", "\tc = 2"],
          js: ["else if (x) {", "  const b = 1", "  const c = 2", "}"],
          ts: ["else if (x) {", "  const b: number = 1", "  const c: number = 2", "}"]
        },
        {
          title: "Nested else ifs work fine",
          input: ["si no si x", "\tsi x", "\t\tc=2"],
          js: "else if (x) { if (x) { const c = 2 } }",
          ts: "else if (x) { if (x) { const c: number = 2 } }"
        },
        {
          title: "Show error if nested block AND inline statement. Prefer block.",
          input: ["si no si x b = 1", "\tc = 2"],
          js: [
            "else if (x) { const c = 2 }",
            "/* PARSE ERROR: Tiene a la vez una instrucción en la misma línea y un bloque con sangría debajo */"
          ],
          ts: [
            "else if (x) { const c: number = 2 }",
            "/* PARSE ERROR: Tiene a la vez una instrucción en la misma línea y un bloque con sangría debajo */"
          ]
        }
      ]
    }
  ]
})

ifEs.addRule(Else, {
  syntax: "(si no|sino|de lo contrario) :? {statement_body}?",
  tests: [
    {
      title: "correctly matches single-line else statements",
      compileAs: "block",
      tests: [
        ["si no", "else {}"],
        ["de lo contrario", "else {}"],
        ["sino: b = 1", "else { const b = 1 }", "else { const b: number = 1 }"],
        ["de lo contrario: b = 1", "else { const b = 1 }", "else { const b: number = 1 }"],
        ["si no b = 1", "else { const b = 1 }", "else { const b: number = 1 }"],
        ["de lo contrario b = 1", "else { const b = 1 }", "else { const b: number = 1 }"]
      ]
    },
    {
      title: "correctly matches multi-line else blocks",
      compileAs: "block",
      tests: [
        {
          title: "Separate blocks if no indentation on second line.",
          input: ["si no", "b = 1"],
          js: ["else {}", "export const b = 1"],
          ts: ["else {}", "export const b: number = 1"]
        },
        {
          title: "Indent with tab",
          input: ["si no", "\tb = 1"],
          js: "else { const b = 1 }",
          ts: "else { const b: number = 1 }"
        },
        {
          title: "ANY number of spaces should count as indentation",
          input: ["si no", " b = 1"],
          js: "else { const b = 1 }",
          ts: "else { const b: number = 1 }"
        },
        {
          title: "Multiple lines in the nested block",
          input: ["si no", "\tb = 1", "\tsea c = 2"],
          js: ["else {", "  const b = 1", "  const c = 2", "}"],
          ts: ["else {", "  const b: number = 1", "  const c: number = 2", "}"]
        },
        {
          title: "Show error if nested block AND inline statement. Prefer block.",
          input: ["si no b = 1", "\tc = 2"],
          js: [
            "else { const c = 2 }",
            "/* PARSE ERROR: Tiene a la vez una instrucción en la misma línea y un bloque con sangría debajo */"
          ],
          ts: [
            "else { const c: number = 2 }",
            "/* PARSE ERROR: Tiene a la vez una instrucción en la misma línea y un bloque con sangría debajo */"
          ]
        }
      ]
    }
  ]
})

// packs: ok -- `si no` is `else` AND `if no`:  `else` must come first
ifEs.addRule(If, {
  syntax: "si {condition:expression} (entonces|:)? {statement_body}?",
  tests: [
    {
      title: "correctly matches single-line if statements",
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        ;(scope as P.BlockScope).variables.add("x")
      },
      tests: [
        ["si x", "if (x) {}"],
        ["si x entonces", "if (x) {}"],
        ["si x:", "if (x) {}"],
        ["si x entonces b = 1", "if (x) { const b = 1 }", "if (x) { const b: number = 1 }"],
        ["si x: b = 1", "if (x) { const b = 1 }", "if (x) { const b: number = 1 }"],
        ["si x : b = 1", "if (x) { const b = 1 }", "if (x) { const b: number = 1 }"]
      ]
    },
    {
      title: "correctly matches multi-line if blocks",
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        ;(scope as P.BlockScope).variables.add("x")
      },
      tests: [
        {
          title: "Separate blocks if no indentation on second line.",
          input: ["si x:", "b = 1"],
          js: ["if (x) {}", "export const b = 1"],
          ts: ["if (x) {}", "export const b: number = 1"] // NOTE: this is correct!
        },
        {
          title: "Single tabbed statement appears inline",
          input: ["si x:", "\tb = 1"],
          js: "if (x) { const b = 1 }",
          ts: "if (x) { const b: number = 1 }"
        },
        {
          title: "ANY number of spaces should count as indentation",
          input: ["si x:", " b = 1"],
          js: "if (x) { const b = 1 }",
          ts: "if (x) { const b: number = 1 }"
        },
        {
          title: "Indent with tab, output has tabs spaces",
          input: ["si x:", "\tb = 1", "\tc=1"],
          js: ["if (x) {", "  const b = 1", "  const c = 1", "}"],
          ts: ["if (x) {", "  const b: number = 1", "  const c: number = 1", "}"]
        },
        {
          title: "Multiple lines in the nested block",
          input: ["si x:", "\tb = 1", "\tc = 2"],
          js: ["if (x) {", "  const b = 1", "  const c = 2", "}"],
          ts: ["if (x) {", "  const b: number = 1", "  const c: number = 2", "}"]
        },
        {
          title: "Nested ifs work fine",
          input: ["si x", "\tb = 1", "\tsi b", "\t\tc = 2", "\t\td = 3"],
          js: ["if (x) {", "  const b = 1", "  if (b) {", "    const c = 2", "    const d = 3", "  }", "}"],
          ts: [
            "if (x) {",
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
          input: ["si x b = 1", "\tc = 2"],
          js: [
            "if (x) { const c = 2 }",
            "/* PARSE ERROR: Tiene a la vez una instrucción en la misma línea y un bloque con sangría debajo */"
          ],
          ts: [
            "if (x) { const c: number = 2 }",
            "/* PARSE ERROR: Tiene a la vez una instrucción en la misma línea y un bloque con sangría debajo */"
          ]
        }
      ]
    }
  ]
})

ifEs.addRule(BackwardsIf, {
  syntax: "si {operator:expression} (si no|sino|de lo contrario) es? {expression}",
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
          input: "imprimir 1 si bar si no 2",
          js: "core.console.log(bar ? 1 : 2)"
        },
        {
          input: "obtener el foo de la bar si bar está definido de lo contrario el bar del foo",
          js: "const it = bar !== undefined ? bar.foo : foo.bar"
        },
        {
          input: `poner color a "red" si 1 + 1 sino "black"`,
          js: 'export const color = 1 + 1 ? "red" : "black"'
        },
        {
          title: "`de lo contrario es X` is the other value, never a comparison with it (epic `spanish` I8)",
          input: `poner color a "red" si bar de lo contrario es "black"`,
          js: 'export const color = bar ? "red" : "black"'
        }
      ]
    }
  ]
})

ifEs.addRule(ValueIf, {
  syntax:
    "(value:{expression}|{constant}) si {condition:expression} (de lo contrario es (otherValue:{constant}|{expression}))?",
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        ;(scope as P.BlockScope).variables.add("suit")
      },
      tests: [
        [
          ["para elegir un color:", `\tred si suit es "hearts"`],
          ["export function elegirUnColor() {", '  if (suit === "hearts") return "red"', "}"]
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
          `red si suit es "hearts"`,
          '/* PARSE ERROR: Una línea del cuerpo de una propiedad calculada:  ponla debajo de una, p. ej. "el color de una carta es:" */'
        ]
      ]
    }
  ]
})

ifEs.addRule(ValueOtherwise, {
  // Not `si no`:  `negro si no` would be `negro` if `no`
  syntax: "(value:{expression}|{constant}) (de lo contrario|sino)",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          ["para elegir un color:", "\tblack de lo contrario"],
          ["export function elegirUnColor() {", '  return "black"', "}"]
        ]
      ]
    }
  ]
})
