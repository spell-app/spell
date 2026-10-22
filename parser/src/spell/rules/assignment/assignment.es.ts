/**
 * The `assignment` rules in Spanish (epic `spanish`):
 * each rule's syntax and its tests, registered on Spanish's own `assignment` parser.
 * - The rule CLASSES are their own files, beside this one, shared with every language.
 * - Registered in the same order as `assignment.en.ts`:  a tie between two rules goes to the first.
 * - Its tests compile to the same javascript as English's:  the same program, said in Spanish.
 * - `it` stays `it`:  it's the name of the variable `obtener` declares, which spell's code shares.
 */
import { P } from "spell-lang/parser"
import { SpellParser } from "spell-lang/spell/SpellParser"

import { AssignmentStatement, setupAssignmentStatement } from "./AssignmentStatement"
import { Get } from "./Get"
import { ReturnStatement } from "./ReturnStatement"
import { WordsAssignment } from "./WordsAssignment"

/** Spanish's `assignment` rules. */
export const assignmentEs = new SpellParser({ module: "assignment" })

assignmentEs.addRule(AssignmentStatement, {
  syntax: "(thing:{expression}|{variable}) = {value:expression}",
  tests: [
    {
      ...setupAssignmentStatement(),
      tests: [
        {
          title: "non-existing var",
          input: "unknown-var = sí",
          js: "export const unknownVar = true",
          ts: "export const unknownVar: boolean = true"
        },
        { title: "existing var", input: "thing = sí", js: "thing = true" }
      ]
    }
  ]
})

assignmentEs.addRule(AssignmentStatement, {
  syntax: "sea (thing:{expression}|{variable}) = {value:expression}",
  tests: [
    {
      ...setupAssignmentStatement(),
      tests: [
        {
          title: "non-existing var: property set (won't work)",
          input: `sea el name de unknown-var = "bob"`,
          js: '/* PARSE ERROR: No entiendo "sea el name de unknown-var = "bob"" */'
        },
        {
          title: "existing var: property set",
          input: `sea el name de thing = "bob"`,
          js: `thing.name = "bob"`
        }
      ]
    }
  ]
})

assignmentEs.addRule(AssignmentStatement, {
  syntax: "(poner|fijar) (thing:{expression}|{variable}) (a|al|en) {value:expression}",
  tests: [
    {
      ...setupAssignmentStatement(),
      tests: [
        {
          title: "non-existing var",
          input: "poner unknown-var a sí",
          js: "export const unknownVar = true",
          ts: "export const unknownVar: boolean = true"
        },
        { title: "existing var", input: "fijar thing en si", js: "thing = true" },
        {
          title: "alias var reassign works",
          input: "poner it al name de it",
          js: "const it = this.name"
        },
        {
          title: "assignment to alias property doesn't redefine alias",
          input: "poner el title de it a el name de it",
          js: "this.title = this.name"
        }
      ]
    }
  ]
})

assignmentEs.addRule(AssignmentStatement, {
  syntax: "{thing:variable} es {value:expression}",
  tests: [
    {
      ...setupAssignmentStatement(),
      tests: [
        {
          title: "non-existing var",
          input: `bob es una nueva person cuyo name es "bob"`,
          js: 'export const bob = new Person({ name: "bob" })'
        },
        { title: "existing var", input: "thing es una nueva person", js: "thing = new Person()" }
      ]
    }
  ]
})

assignmentEs.addRule(WordsAssignment, {
  syntax: "(poner|fijar) {thing:words_variable} (a|al|en) {value:expression}",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          title: "a new variable",
          input: "poner start pile a sí",
          js: "export const startPile = true",
          ts: "export const startPile: boolean = true"
        }
      ]
    }
  ]
})

assignmentEs.addRule(Get, {
  syntax: "obtener {value:expression}",
  tests: [
    {
      title: "`it` is not already defined",
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        ;(scope as P.BlockScope).variables.add("thing")
      },
      tests: [
        ["obtener thing", "const it = thing"],
        ["obtener el foo de la thing", "const it = thing.foo"]
      ]
    },
    {
      title: "`it` is already defined",
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        const { variables } = scope as P.BlockScope
        variables.add("it")
        variables.add("thing")
      },
      tests: [
        ["obtener thing", "const it2 = thing"],
        ["obtener el foo de la thing", "const it2 = thing.foo"]
      ]
    },
    {
      title: "each `get` declares a new `it`, so a callback which captured an earlier one keeps it",
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        ;(scope as P.BlockScope).variables.add("thing")
      },
      tests: [
        {
          input: ["obtener thing", "obtener el foo de la thing", "imprimir it"],
          js: ["const it = thing", "const it2 = thing.foo", "core.console.log(it2)"]
        }
      ]
    },
    {
      title: "numbered `it`s skip names already in use",
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        const { variables } = scope as P.BlockScope
        variables.add("thing")
        variables.add("it-2")
      },
      tests: [
        {
          input: ["obtener thing", "obtener el foo de la thing"],
          js: ["const it = thing", "const it3 = thing.foo"]
        }
      ]
    },
    {
      title: "`it` gets redefined if defined as an alias",
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        const { variables } = scope as P.BlockScope
        variables.add({ name: "it", output: "this", isAlias: true })
        variables.add("thing")
      },
      tests: [
        {
          input: ["imprimir it", "obtener la thing", "imprimir it"],
          js: ["core.console.log(this)", "const it = thing", "core.console.log(it)"]
        },
        {
          input: ["imprimir it", "obtener su name", "imprimir it"],
          js: ["core.console.log(this)", "const it = this.name", "core.console.log(it)"]
        }
      ]
    }
  ]
})

assignmentEs.addRule(ReturnStatement, {
  syntax: "(devolver|salir con?) {expression}? {nested_expression}?",
  tests: [
    {
      title: "Simple return with inline expression",
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        ;(scope as P.BlockScope).variables.add("thing")
      },
      tests: [
        ["devolver", "return"],
        ["devolver thing", "return thing"],
        ["salir", "return"],
        ["salir con falso", "return false"]
      ]
    },
    {
      title: "Return with nested block expression",
      compileAs: "block",
      tests: [
        // simple expression
        ["devolver\n\t1 + 2", "return 1 + 2"],
        // inline JSX
        ["devolver\n\t<div/>", 'return h("div")', "return <div />"],
        ["devolver\n\t1 + <div/>", 'return 1 + h("div")', "return 1 + (<div />)"],
        // multi-line JSX
        [
          ["devolver", "\t<div>", "\t\t<span/>", "\t</div>"],
          'return h("div", h("span"))',
          ["return (", "  <div>", "    <span />", "  </div>", ")"]
        ],
        // fails for more than one indented line
        [
          "devolver\n\t<div/>\n\t1",
          ["return", '/* PARSE ERROR: No entiendo "<div/>" */', '/* PARSE ERROR: No entiendo "1" */']
        ]
      ]
    }
  ]
})
