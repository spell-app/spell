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

  describe("sounds and videos, by name (epic `language` P65)", () => {
    /** `contents`, parsed whole as `path`:  what it compiled to, and its errors. */
    function parsed(contents: string, path = "/Test.spell") {
      const { compiled, errors } = parseSpellProject([{ path, contents }]).files[0]!
      return { compiled, errors }
    }

    test("named on the app, either way round:  a property made with it, found by its name", () => {
      const { compiled, errors } = parsed(`my game is an app
	sound "card slide" is at "sounds/slide.mp3"
	its "intro" is a video at "intro.mp4"
	to start over
		play the card slide sound at double speed
		play sound "card slide" from 0:30
		play the "intro" video in a new window and wait
		play "card slide"
		play its intro
`)
      expect(errors).toEqual([])
      expect(compiled).toContain(
        `this.declareProp("cardSlide", { init: () => core.media("sound", "sounds/slide.mp3", "card slide"), early: true })`
      )
      expect(compiled).toContain(
        `this.declareProp("intro", { init: () => core.media("video", "intro.mp4", "intro"), early: true })`
      )
      expect(compiled).toContain(`core.play(core.mediaNamed("card slide", "sound"), { speed: 2 })`)
      expect(compiled).toContain(`core.play(core.mediaNamed("card slide", "sound"), { from: 30 })`)
      expect(compiled).toContain(`await core.play(core.mediaNamed("intro", "video"), { where: "window" })`)
      expect(compiled).toContain(`core.play("card slide")`)
      expect(compiled).toContain(`core.play(this.intro)`)
    })

    test("a name nobody gives won't compile;  a property called `... sound` stays the property", () => {
      const { errors } = parsed(`my game is an app
	sound "ding" is at "ding.mp3"
	to ring it
		play sound "dong"
`)
      expect(errors.join()).toContain('Nothing here is named "dong"')
      const { compiled, errors: none } = parsed(`a pokemon is a thing
	its "cry sound" is text
	to hear it
		play the cry sound
`)
      expect(none).toEqual([])
      expect(compiled).toContain("core.play(this.crySound)")
    })

    test("a drawing's tags name them and draw them;  a handler hears one end, above the drawing that names it", () => {
      const { compiled, errors } = parsed(`my game is an app
	when the "intro" video ends
		play the boing sound
	to draw it
		<video "intro" source="intro.mp4" />
		<sound "boing" source="boing.mp3" />
		<button onClick={play video "intro"}>Play</button>
`)
      expect(errors).toEqual([])
      expect(compiled).toContain("onIntroVideoEnds(event)")
      expect(compiled).toContain(`core.play(core.mediaNamed("boing", "sound"))`)
      expect(compiled).toContain(`() => core.drawMedia(core.mediaNamed("intro", "video"))`)
      expect(compiled).toContain(
        `this.declareProp("boing", { init: () => core.media("sound", "boing.mp3", "boing"), early: true })`
      )
    })

    test("and in Spanish", () => {
      const { compiled, errors } = parsed(
        `mi juego es una app
	sonido "deslizar" está en "sonidos/deslizar.mp3"
	su "intro" es una película en "intro.mp4"
	para empezar de nuevo
		reproducir el sonido deslizar al doble de velocidad
		reproducir el vídeo "intro" a pantalla completa y esperar
		pausar el vídeo "intro"
		parar todos los vídeos
	cuando el vídeo "intro" termina
		reproducir "deslizar"
	para dibujarlo
		<vídeo "intro" />
`,
        "/Juego.es.spell"
      )
      expect(errors).toEqual([])
      expect(compiled).toContain(`core.media("video", "intro.mp4", "intro")`)
      expect(compiled).toContain(`core.play(core.mediaNamed("deslizar", "sound"), { speed: 2 })`)
      expect(compiled).toContain(`await core.play(core.mediaNamed("intro", "video"), { where: "full screen" })`)
      expect(compiled).toContain(`core.pause(core.mediaNamed("intro", "video"))`)
      expect(compiled).toContain(`core.stopAll("video")`)
      expect(compiled).toContain("onIntroVideoEnds(event)")
      expect(compiled).toContain(`return core.drawMedia(core.mediaNamed("intro", "video"))`)
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

  describe("a page's tour (epic `editor` P40)", () => {
    /** `contents`, parsed whole as `path`:  what it compiled to, and its errors. */
    function parsed(contents: string, path = "/Test.spell") {
      const { compiled, errors } = parseSpellProject([{ path, contents }]).files[0]!
      return { compiled, errors }
    }

    test("every tour line, in an action, in English", () => {
      const { compiled, errors } = parsed(`a guide is a thing:
	- to walk through it:
		start tour "first game"
		start the "first game" tour
		show step 3
		show the tour step "drag"
		go to the next step
		show the next step of the tour
		go back a step
		stop the tour
`)
      expect(errors).toEqual([])
      expect(compiled).toContain('core.startTour("first game")')
      expect(compiled).toContain("core.showTourStep(3)")
      expect(compiled).toContain('core.showTourStep("drag")')
      expect(compiled.match(/core\.nextTourStep\(\)/g)).toHaveLength(2)
      expect(compiled).toContain("core.previousTourStep()")
      expect(compiled).toContain("core.stopTour()")
    })

    test("and in Spanish, beside an action of its own (`para ...`)", () => {
      const { compiled, errors } = parsed(
        `una guía es una cosa:
	- para enseñarlo:
		empieza el recorrido "primera partida"
		muestra el paso 2
		ve al siguiente paso
		retrocede un paso
		para el recorrido
	- para pararlo:
		para el recorrido
`,
        "/Test.es.spell"
      )
      expect(errors).toEqual([])
      expect(compiled).toContain('core.startTour("primera partida")')
      expect(compiled).toContain("core.showTourStep(2)")
      expect(compiled).toContain("core.nextTourStep()")
      expect(compiled).toContain("core.previousTourStep()")
      expect(compiled.match(/core\.stopTour\(\)/g)).toHaveLength(2)
      expect(compiled).toContain("parar() {")
    })

    test("`the tour` is always the tour showing, even beside an action named tour", () => {
      const { compiled, errors } = parsed(`a guide is a thing:
	- to tour:
		print 1
	- to deal:
		print 2
	- to stop everything:
		stop the tour
		stop the deal
`)
      expect(errors).toEqual([])
      expect(compiled).toContain("core.stopTour()")
      expect(compiled).not.toContain('core.cancelActions(this, "tour")')
      // the neighbour stays:  `stop the deal` stops the running action named deal
      expect(compiled).toContain('core.cancelActions(this, "deal")')
    })

    test('the neighbouring lines read as before:  `show "help"`, `stop its sound`, a `go back` method', () => {
      const { compiled, errors } = parsed(`a pokemon is a thing:
	- it has a sound as text
	- to hush it:
		show "help"
		stop its sound
	- to go back:
		print 1
	- to undo it:
		go back
`)
      expect(errors).toEqual([])
      expect(compiled).toContain('await core.showDrawn("help")')
      expect(compiled).toContain("core.stop(this.sound)")
      expect(compiled).toContain("this.goBack()")
      expect(compiled).not.toContain("TourStep")
    })
  })
})
