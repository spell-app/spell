/**
 * The `assignment` rules in English:  each rule's syntax and its tests, registered on the `assignment` module's parser.
 * - The rule CLASSES are their own files, beside this one:  what a rule does, whatever the language.
 * - Registered in TIE-BREAK order, the order `index.ts` once listed them:  a tie between two rules goes to the first.
 * - Another language registers the same classes with its own syntax, in `assignment.<lang>.ts` (epic `spanish`).
 */
import { P } from "spell-lang/parser"

import { assignment } from "./assignment.parser"
import { AssignmentStatement, setupAssignmentStatement } from "./AssignmentStatement"
import { Get } from "./Get"
import { ReturnStatement } from "./ReturnStatement"
import { WordsAssignment } from "./WordsAssignment"

assignment.addRule(AssignmentStatement, {
  syntax: "(thing:{variable}|{expression}) = {value:expression}",
  tests: [
    {
      ...setupAssignmentStatement(),
      tests: [
        {
          title: "non-existing var",
          input: "unknown-var = yes",
          js: "export const unknownVar = true",
          ts: "export const unknownVar: boolean = true"
        },
        { title: "existing var", input: "thing = yes", js: "thing = true" }
      ]
    }
  ]
})

assignment.addRule(AssignmentStatement, {
  syntax: "let (thing:{variable}|{expression}) = {value:expression}",
  tests: [
    {
      ...setupAssignmentStatement(),
      tests: [
        {
          title: "non-existing var: property set (won't work)",
          input: `let the name of unknown-var = "bob"`,
          js: `/* PARSE ERROR: Don't understand "let the name of unknown-var = "bob"" */`
        },
        {
          title: "existing var: property set",
          input: `let the name of thing = "bob"`,
          js: `thing.name = "bob"`
        }
      ]
    }
  ]
})

assignment.addRule(AssignmentStatement, {
  syntax: "set (thing:{variable}|{expression}) to {value:expression}",
  tests: [
    {
      ...setupAssignmentStatement(),
      tests: [
        {
          title: "non-existing var",
          input: "set unknown-var to yes",
          js: "export const unknownVar = true",
          ts: "export const unknownVar: boolean = true"
        },
        { title: "existing var", input: "set thing to yes", js: "thing = true" },
        {
          title: "a number word is a name where it can't be a number (J96)",
          input: "set three to 3",
          js: "export const three = 3",
          ts: "export const three: number = 3"
        },
        {
          title: "alias var reassign works",
          input: "set it to the name of it",
          js: "const it = this.name"
        },
        {
          title: "assignment to alias property doesn't redefine alias",
          input: "set the title of it to the name of it",
          js: "this.title = this.name"
        }
      ]
    }
  ]
})

assignment.addRule(AssignmentStatement, {
  syntax: "{thing:variable} is {value:expression}",
  tests: [
    {
      ...setupAssignmentStatement(),
      tests: [
        {
          title: "non-existing var",
          input: `bob is a new person whose name is "bob"`,
          js: 'export const bob = new Person({ name: "bob" })'
        },
        { title: "existing var", input: "thing is a new person", js: "thing = new Person()" }
      ]
    }
  ]
})

assignment.addRule(WordsAssignment, {
  syntax: "set {thing:words_variable} to {value:expression}",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          title: "a new variable",
          input: "set start pile to yes",
          js: "export const startPile = true",
          ts: "export const startPile: boolean = true"
        }
      ]
    }
  ]
})

assignment.addRule(Get, {
  syntax: "get {value:expression}",
  tests: [
    {
      title: "`it` is not already defined",
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        ;(scope as P.BlockScope).variables.add("thing")
      },
      tests: [
        ["get thing", "const it = thing"],
        ["get the foo of the thing", "const it = thing.foo"]
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
        ["get thing", "const it2 = thing"],
        ["get the foo of the thing", "const it2 = thing.foo"]
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
          input: ["get thing", "get the foo of the thing", "print it"],
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
          input: ["get thing", "get the foo of the thing"],
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
          input: ["print it", "get the thing", "print it"],
          js: ["core.console.log(this)", "const it = thing", "core.console.log(it)"]
        },
        {
          input: ["print it", "get its name", "print it"],
          js: ["core.console.log(this)", "const it = this.name", "core.console.log(it)"]
        }
      ]
    }
  ]
})

assignment.addRule(ReturnStatement, {
  syntax: "(return|exit with?) {expression}? {nested_expression}?",
  tests: [
    {
      title: "Simple return with inline expression",
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        ;(scope as P.BlockScope).variables.add("thing")
      },
      tests: [
        ["return", "return"],
        ["return thing", "return thing"],
        ["exit", "return"],
        ["exit with false", "return false"]
      ]
    },
    {
      title: "Return with nested block expression",
      compileAs: "block",
      tests: [
        // simple expression
        ["return\n\t1 + 2", "return 1 + 2"],
        // inline JSX
        ["return\n\t<div/>", 'return h("div")', "return <div />"],
        ["return\n\t1 + <div/>", 'return 1 + h("div")', "return 1 + (<div />)"],
        // multi-line JSX
        [
          ["return", "\t<div>", "\t\t<span/>", "\t</div>"],
          'return h("div", h("span"))',
          ["return (", "  <div>", "    <span />", "  </div>", ")"]
        ],
        // fails for more than one indented line
        [
          "return\n\t<div/>\n\t1",
          ["return", '/* PARSE ERROR: Don\'t understand "<div/>" */', '/* PARSE ERROR: Don\'t understand "1" */']
        ]
      ]
    }
  ]
})
