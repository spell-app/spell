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

  describe("`open printing` (epic `mockup` P21)", () => {
    /** `contents`, parsed whole as `path`:  what it compiled to, and its errors. */
    function parsed(contents: string, path = "/Test.spell") {
      const { compiled, errors } = parseSpellProject([{ path, contents }]).files[0]!
      return { compiled, errors }
    }

    test("a button's click, and an action's step, in English", () => {
      const { compiled, errors } = parsed(`shopping list is an app:
	- to print the list:
		open printing
	- to draw it:
		<ui-button onClick={open printing}>Print</ui-button>
`)
      expect(errors).toEqual([])
      expect(compiled).toMatch(/printTheList\(\) \{[^}]*core\.openPrinting\(\)/)
      expect(compiled).toContain("onClick: core.pressed(this, () => core.openPrinting())")
    })

    test("and in Spanish:  `abrir impresión`", () => {
      const { compiled, errors } = parsed(
        `lista de compras es una app:
	- para imprimir la lista:
		abrir impresión
	- para dibujarla:
		<ui-button onClick={abrir impresión}>Imprimir</ui-button>
`,
        "/Test.es.spell"
      )
      expect(errors).toEqual([])
      expect(compiled.match(/core\.openPrinting\(\)/g)).toHaveLength(2)
    })

    test("a program's own `to open printing` is the one that runs", () => {
      const { compiled, errors } = parsed(`a report is a thing:
	- to open printing:
		set x to 1
	- to finish it:
		open printing
`)
      expect(errors).toEqual([])
      expect(compiled).toContain("this.openPrinting()")
      expect(compiled).not.toContain("core.openPrinting(")
    })
  })
})
