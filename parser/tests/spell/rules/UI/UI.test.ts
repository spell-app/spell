import { describe, expect, test } from "vite-plus/test"
import { unitTestModuleRules, parseSpellProject } from "spell/parser/spell/test"
import { spellParser } from "spell/parser/spell"
import { core } from "spell/parser/core"

describe("testing spell module UI", () => {
  unitTestModuleRules(spellParser, "UI", core.resetRuntime)

  describe("`play its sound` / `stop its sound` (epic `data` T145)", () => {
    /** `contents`, parsed whole as `path`:  what it compiled to, and its errors. */
    function parsed(contents: string, path = "/Test.spell") {
      const { compiled, errors } = parseSpellProject([{ path, contents }]).files[0]!
      return { compiled, errors }
    }

    test("a thing's sound plays and stops, in English", () => {
      const { compiled, errors } = parsed(`a pokemon is a thing:
	- it has a sound as text
	- to hear it:
		play its sound
	- to hush it:
		stop its sound
`)
      expect(errors).toEqual([])
      expect(compiled).toContain("core.play(this.sound)")
      expect(compiled).toContain("core.stop(this.sound)")
    })

    test("and in Spanish:  `reproducir su sonido`, `parar su sonido`", () => {
      const { compiled, errors } = parsed(
        `un pokemon es una cosa:
	- tiene un sonido como texto
	- para oírlo:
		reproducir su sonido
	- para callarlo:
		parar su sonido
`,
        "/Test.es.spell"
      )
      expect(errors).toEqual([])
      expect(compiled).toContain("core.play(this.sonido)")
      expect(compiled).toContain("core.stop(this.sonido)")
    })

    test("a project's own method of the same words is the one that runs", () => {
      const { compiled, errors } = parsed(`a game is a thing:
	- to play from the stock:
		set x to 1
	- to stop it:
		set y to 1
	- to tick it:
		play from the stock
		stop it
`)
      expect(errors).toEqual([])
      expect(compiled).toContain("this.playFromTheStock()")
      expect(compiled).toContain("this.stop()")
      expect(compiled).not.toContain("core.play(")
      expect(compiled).not.toContain("core.stop(")
    })
  })
})
