/**
 * The `core` rules in Spanish:  each rule's syntax and its tests, registered on Spanish's own `core` parser
 * (epic `spanish`).
 * - The rule CLASSES are their own files, beside this one, shared with every language.
 * - Registered in the same order as `core.en.ts`:  a tie between two rules goes to the first.
 * - Its tests compile to the same javascript as English's:  the same program, said in Spanish.
 * - A keyword with a written accent is accepted without it too:  `(sí|si)`.
 */
import { P } from "spell-lang/parser"
import { SpellParser } from "spell-lang/spell/SpellParser"

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

/** Spanish's `core` rules. */
export const coreEs = new SpellParser({ module: "core" })

coreEs.addRule(EatWhitespace, {
  syntax: "{whitespace}*"
})

coreEs.addRule(Whitespace)

coreEs.addRule(Indent)

coreEs.addRule(Newline)

coreEs.addRule(InlineWhitespace)

coreEs.addRule(NumberLiteral, {
  tests: [
    {
      title: "reconoce números",
      tests: [
        ["1", 1],
        ["1000", 1000],
        ["-1", -1],
        ["1.1", 1.1],
        ["000.1", 0.1],
        [".1", 0.1],
        ["1.", 1],
        ["-111.111", -111.111]
      ]
    },
    {
      title: "no reconoce lo que no es un número",
      tests: [
        ["", undefined],
        ["-", undefined],
        [".", undefined]
      ]
    },
    {
      title: "el signo negativo debe tocar el número",
      tests: [["- 1", undefined]]
    }
  ]
})

// `uno` is 1;  `un` and `una` are only the article (`una carta`), never the number:
// read as 1, they'd turn every `es una ...` into a comparison with 1
coreEs.addRule(
  NumberAsString.specialize({
    pattern: /^(cero|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)$/,
    VALUE_MAP: {
      cero: 0,
      uno: 1,
      dos: 2,
      tres: 3,
      cuatro: 4,
      cinco: 5,
      seis: 6,
      siete: 7,
      ocho: 8,
      nueve: 9,
      diez: 10
    }
  }),
  {
    tests: [
      {
        title: "reconoce los números escritos en palabras",
        tests: [
          ["cero", 0],
          ["uno", 1],
          ["una", undefined],
          ["un", undefined],
          ["dos", 2],
          ["tres", 3],
          ["cuatro", 4],
          ["cinco", 5],
          ["seis", 6],
          ["siete", 7],
          ["ocho", 8],
          ["nueve", 9],
          ["diez", 10]
        ]
      }
    ]
  }
)

coreEs.addRule(
  BooleanLiteral.specialize({
    ruleName: "boolean",
    pattern: /^(verdadero|falso|sí|si|no|aceptar|ok|cancelar|siempre|nunca)$/,
    VALUE_MAP: {
      verdadero: true,
      falso: false,
      sí: true,
      si: true,
      no: false,
      aceptar: true,
      ok: true,
      cancelar: false,
      siempre: true,
      nunca: false
    }
  }),
  {
    tests: [
      {
        title: "reconoce los booleanos",
        tests: [
          ["", undefined],
          ["verdadero", "true"],
          ["sí", "true"],
          ["si", "true"],
          ["aceptar", "true"],
          ["ok", "true"],
          ["siempre", "true"],
          ["falso", "false"],
          ["no", "false"],
          ["cancelar", "false"],
          ["nunca", "false"]
        ]
      },
      {
        title: "no reconoce una palabra dentro de otra más larga",
        tests: [
          ["sinsentido", undefined],
          ["sí-señor", undefined],
          ["sí_señor", undefined]
        ]
      }
    ]
  }
)

coreEs.addRule(TextLiteral, {
  tests: [
    {
      title: "reconoce el texto",
      tests: [
        ['""', '""'],
        ['"a"', '"a"'],
        ['"abcd"', '"abcd"'],
        ['"abc def ghi. jkl"', '"abc def ghi. jkl"'],
        [`"...¿Qué tal, señor?"`, `"...¿Qué tal, señor?"`]
      ]
    },
    {
      title: "valores dentro:  [nombre] se rellena;  [[ y \\[ son un [ de verdad",
      beforeEach(scope: P.Scope) {
        ;(scope as P.BlockScope).variables.add("rank")
        ;(scope as P.BlockScope).variables.add("suit")
      },
      tests: [
        ['"imagenes/[rank]-de-[suit].png"', "`imagenes/${rank}-de-${suit}.png`"],
        // TODO(es):  `'"[rank + 1] cartas"'` => "`${(rank + 1)} cartas`", once `math.es.ts` registers Spanish's `+`
        ['"[[borrador]] o \\[borrador]"', "`[borrador] o [borrador]`"],
        ['"una `marca` y ${x}"', '"una `marca` y ${x}"'],
        ['"`[rank]` ${x}"', "`\\`${rank}\\` \\${x}`"],
        ['"[nada así por aquí]"', undefined]
      ]
    }
  ]
})

coreEs.addRule(CommentLine, {
  tests: [
    {
      compileAs: "comment",
      tests: [
        ["//", "//"],
        ["// hola", "// hola"],
        ["-- hola", "//-- hola"],
        ["## hola", "//## hola"],
        ["//    hola qué tal", "//    hola qué tal"]
      ]
    }
  ]
})

coreEs.addRule(UndefinedLiteral, {
  syntax: "(indefinido|nada)",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["nada", "undefined"],
        ["indefinido", "undefined"]
      ]
    }
  ]
})

coreEs.addRule(KeywordRule, {
  tests: [
    {
      title: "reconoce las palabras",
      tests: [
        ["abc", "abc"],
        ["abc-def", "abc_def"],
        ["abc_def", "abc_def"],
        ["abc01", "abc01"],
        ["abc-def_01", "abc_def_01"],
        ["año-mañana", "año_mañana"]
      ]
    },
    {
      title: "no reconoce lo que no es una palabra",
      tests: [
        ["$asda", undefined],
        ["(asda)", undefined]
      ]
    }
  ]
})
