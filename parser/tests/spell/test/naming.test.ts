import { describe, test, expect } from "vite-plus/test"

import { P } from "spell-lang/parser"

/**
 * Each output language names things by its own map (`P.Naming`, epic `drawable-thing` P11):
 * a writer that writes TYPES in snake_case leaves no type's PascalCase name anywhere in its code --
 * not as code (`class Card`, TypeScript's `card: Card`, `List<Card>`),
 * nor as text the runtime reads (`isOfType(x, 'Card')`, `instanceType: "Card"`).
 * - The maps themselves, here;  a whole frozen project (Solitaire) written with them, and checked by `tsc`:
 *   spell-app's `tests/spell/test/naming.test.ts`.
 */
describe("a writer's naming map", () => {
  test("javascript's own map writes what spell always wrote", () => {
    const naming = new P.Naming(P.Naming.JAVASCRIPT)
    expect(naming.nameOf("BankAccount", "type")).toBe("BankAccount")
    expect(naming.nameOf("turn_face_up", "method")).toBe("turnFaceUp")
    expect(naming.nameOf("start_pile", "variable")).toBe("startPile")
    expect(naming.nameOf("is_set_up", "property")).toBe("isSetUp")
    expect(naming.nameOf("Thing", "type")).toBe("Thing")
  })

  test("one case for all", () => {
    const naming = new P.Naming({ all: "snake_case" })
    expect(naming.nameOf("BankAccount", "type")).toBe("bank_account")
    expect(naming.nameOf("turn_face_up", "method")).toBe("turn_face_up")
    expect(naming.nameOf("DrawableList", "type")).toBe("DrawableList")
  })

  /** Python's, PEP 8's (epic `python-target` P7). */
  describe("Python's", () => {
    const naming = new P.Naming(P.Naming.PYTHON, P.Naming.PYTHON_CLASHES)

    test("classes PascalCase, constants in capitals, the rest snake_case", () => {
      expect(naming.nameOf("BankAccount", "type")).toBe("BankAccount")
      expect(naming.nameOf("Ranks", "constant")).toBe("RANKS")
      expect(naming.nameOf("turn_face_up", "method")).toBe("turn_face_up")
      expect(naming.nameOf("is_set_up", "property")).toBe("is_set_up")
      expect(naming.nameOf("move_to_$pile", "method")).toBe("move_to_pile")
      expect(naming.nameOf("start_pile", "variable")).toBe("start_pile")
    })

    test("a keyword steps aside with a trailing underscore, as any kind", () => {
      expect(naming.nameOf("class", "variable")).toBe("class_")
      expect(naming.nameOf("is", "method")).toBe("is_")
      expect(naming.nameOf("from", "property")).toBe("from_")
    })

    test("a builtin only as a variable:  a member hides nothing", () => {
      expect(naming.nameOf("list", "variable")).toBe("list_")
      expect(naming.nameOf("self", "variable")).toBe("self_")
      expect(naming.nameOf("type", "property")).toBe("type")
      expect(naming.nameOf("type", "variable")).toBe("type_")
      expect(naming.nameOf("match", "method")).toBe("match")
      expect(naming.nameOf("max", "property")).toBe("max")
    })

    test("never a dunder", () => {
      expect(naming.nameOf("__len__", "method")).toBe("len")
    })
  })
})
