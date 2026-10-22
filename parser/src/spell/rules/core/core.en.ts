/**
 * The `core` rules in English:  each rule's syntax and its tests, registered on the `core` module's parser.
 * - The rule CLASSES are their own files, beside this one:  what a rule does, whatever the language.
 * - Registered in TIE-BREAK order, the order `index.ts` once listed them:  a tie between two rules goes to the first.
 * - Another language registers the same classes with its own syntax, in `core.<lang>.ts` (epic `spanish`).
 */
import { P } from "spell-lang/parser"

import { core } from "./core.parser"
import { BooleanLiteral } from "./BooleanLiteral"
import { CommentLine } from "./CommentLine"
import { EatWhitespace } from "./EatWhitespace"
import { Indent } from "./Indent"
import { InlineWhitespace } from "./InlineWhitespace"
import { KeywordRule } from "./KeywordRule"
import { Newline } from "./Newline"
import { NumberAsString } from "./NumberAsString"
import { NumberLiteral } from "./NumberLiteral"
import { TextLiteral } from "./TextLiteral"
import { UndefinedLiteral } from "./UndefinedLiteral"
import { Whitespace } from "./Whitespace"

core.addRule(EatWhitespace, {
  syntax: "{whitespace}*"
})

core.addRule(Whitespace)

core.addRule(Indent)

core.addRule(Newline)

core.addRule(InlineWhitespace)

core.addRule(NumberLiteral, {
  tests: [
    {
      title: "correctly matches numbers",
      tests: [
        ["1", 1],
        ["1000", 1000],
        ["-1", -1],
        ["1.1", 1.1],
        ["000.1", 0.1],
        [".1", 0.1],
        ["1.", 1],
        [".1", 0.1],
        ["-111.111", -111.111]
      ]
    },
    {
      title: "doesn't match things that aren't numbers",
      tests: [
        ["", undefined],
        ["-", undefined],
        [".", undefined]
      ]
    },
    {
      title: "requires negative sign to touch the number",
      tests: [["- 1", undefined]]
    }
  ]
})

core.addRule(
  NumberAsString.specialize({
    pattern: /^(zero|one|two|three|four|five|six|seven|eight|nine|ten)$/,
    VALUE_MAP: {
      zero: 0,
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5,
      six: 6,
      seven: 7,
      eight: 8,
      nine: 9,
      ten: 10
    }
  }),
  {
    tests: [
      {
        title: "correctly matches number strings",
        tests: [
          ["zero", 0],
          ["one", 1],
          ["two", 2],
          ["three", 3],
          ["four", 4],
          ["five", 5],
          ["six", 6],
          ["seven", 7],
          ["eight", 8],
          ["nine", 9],
          ["ten", 10]
        ]
      }
    ]
  }
)

core.addRule(
  BooleanLiteral.specialize({
    ruleName: "boolean",
    pattern: /^(true|false|yes|no|ok|cancel|always|never)$/,
    VALUE_MAP: {
      true: true,
      false: false,
      yes: true,
      no: false,
      ok: true,
      cancel: false,
      always: true,
      never: false
    }
  }),
  {
    tests: [
      {
        title: "correctly matches booleans",
        tests: [
          ["", undefined],
          ["true", "true"],
          ["yes", "true"],
          ["ok", "true"],
          ["always", "true"],
          ["false", "false"],
          ["no", "false"],
          ["cancel", "false"],
          ["never", "false"]
        ]
      },
      {
        title: "doesn't match in the middle of a longer keyword",
        tests: [
          ["yessir", undefined],
          ["yes-sir", undefined],
          ["yes_sir", undefined]
        ]
      }
    ]
  }
)

core.addRule(TextLiteral, {
  tests: [
    {
      title: "correctly matches text",
      tests: [
        ['""', '""'],
        ['"a"', '"a"'],
        ['"abcd"', '"abcd"'],
        ['"abc def ghi. jkl"', '"abc def ghi. jkl"'],
        [`"...Can't touch this"`, `"...Can't touch this"`]
      ]
    },
    {
      title: "values inside:  [name] fills in;  [[ and \\[ are a real [",
      beforeEach(scope: P.Scope) {
        ;(scope as P.BlockScope).variables.add("rank")
        ;(scope as P.BlockScope).variables.add("suit")
      },
      tests: [
        ['"images/[rank]-of-[suit].png"', "`images/${rank}-of-${suit}.png`"],
        ['"[rank + 1] cards"', "`${(rank + 1)} cards`"],
        ['"[[draft]] or \\[draft]"', "`[draft] or [draft]`"],
        ['"a `tick` and ${x}"', '"a `tick` and ${x}"'],
        ['"`[rank]` ${x}"', "`\\`${rank}\\` \\${x}`"],
        ['"[no such thing here]"', undefined]
      ]
    }
  ]
})

core.addRule(CommentLine, {
  tests: [
    {
      compileAs: "comment",
      tests: [
        ["//", "//"],
        ["// foo", "// foo"],
        ["-- foo", "//-- foo"],
        ["## foo", "//## foo"],
        ["//    foo bar baz", "//    foo bar baz"]
      ]
    }
  ]
})

core.addRule(UndefinedLiteral, {
  syntax: "(undefined|nothing)",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["nothing", "undefined"],
        ["undefined", "undefined"]
      ]
    }
  ]
})

core.addRule(KeywordRule, {
  tests: [
    {
      title: "correctly matches words",
      tests: [
        ["abc", "abc"],
        ["abc-def", "abc_def"],
        ["abc_def", "abc_def"],
        ["abc01", "abc01"],
        ["abc-def_01", "abc_def_01"]
      ]
    },
    {
      title: "doesn't match things that aren't words",
      tests: [
        ["$asda", undefined],
        ["(asda)", undefined] // TODO... ???
      ]
    }
  ]
})
