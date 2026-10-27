/**
 * Spell's events, end to end (epic `elemental-spell` P9):  `send` to a thing, up its chain until a handler takes it;
 * `pass event`, `cancel closing`, `sender`, `target`, `the original target`;  the mouse and keys, read anywhere.
 */
import { describe, test, expect, beforeEach } from "vite-plus/test"

import { core } from "spell/parser/core"
import { parseSpellProject, runSpell } from "spell/parser/spell/test"

/** `lines` compiled as one file, its comments and blank lines left out. */
function compile(lines: string[]): string {
  const { files } = parseSpellProject([{ path: "/test.spell", contents: lines.join("\n") }])
  const file = files[0]!
  if (file.errors.length) throw new Error(`parse errors:\n${JSON.stringify(file.errors, null, 2)}`)
  return `${file.compiled}`
}

/** Let every handler that's waiting run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

/** A pile holding a card, each counting what it heard. */
const PILE_AND_CARD = [
  'a "card" is a thing where:',
  '\t- its "flips" is a number',
  '\t- its "picks" is a number',
  "\t- on flipped:",
  "\t\tset its flips to its flips + 1",
  "\t- on picked:",
  "\t\tset its picks to its picks + 1",
  "\t\tpass event",
  "\t- to flip it:",
  "\t\tsend flipped",
  'a "pile" is a list of cards where:',
  '\t- its "picks" is a number',
  "\t- on picked:",
  "\t\tset its picks to its picks + 1",
  "\t- on flipped:",
  "\t\tset its picks to its picks + 1",
  "a card belongs to one pile",
  "set the pile to a new pile with picks = 0",
  "set the card to a new card with flips = 0 and picks = 0",
  "add the card to the pile"
]

describe("send", () => {
  beforeEach(() => {
    core.resetRuntime()
  })

  test("compiles to core's send(), to the thing whose method it is, from it", () => {
    const compiled = compile(PILE_AND_CARD)
    expect(compiled).toContain('send(this, "flipped", {}, this)')
  })

  test("the thing's own handler takes it:  nothing above hears it", async () => {
    const run = runSpell([...PILE_AND_CARD, "flip the card"])("card, pile")
    await settle()
    expect((run.card as { flips: number }).flips).toBe(1)
    expect((run.pile as { picks: number }).picks).toBe(0)
  })

  test("`pass event` hands it up:  the card's handler, then the pile holding it", async () => {
    const run = runSpell([...PILE_AND_CARD, "send picked to the card"])("card, pile")
    await settle()
    expect((run.card as { picks: number }).picks).toBe(1)
    expect((run.pile as { picks: number }).picks).toBe(1)
  })

  test("nobody takes it:  the program's own `on` hears it", async () => {
    const heard: string[] = []
    core.on("lonely", () => void heard.push("program"))
    await core.send(undefined, "lonely")
    expect(heard).toEqual(["program"])
  })

  test("an -ing event a handler cancels stops its sender there", async () => {
    const compiled = compile([
      'a "door" is a thing where:',
      '\t- its "state" is text',
      "\t- on closing:",
      "\t\tcancel event",
      "\t- to close it:",
      "\t\tsend closing",
      '\t\tset its state to "closed"'
    ])
    expect(compiled).toContain('if ((await send(this, "closing", {}, this)).canceled) return')
    const run = runSpell([
      'a "door" is a thing where:',
      '\t- its "state" is text',
      "\t- on closing:",
      "\t\tcancel event",
      "\t- to close it:",
      "\t\tsend closing",
      '\t\tset its state to "closed"',
      'set the door to a new door with state = "open"',
      "close the door"
    ])("door")
    await settle()
    expect((run.door as { state: string }).state).toBe("open")
  })

  test("a handler names the sender, its target and the original target", () => {
    const compiled = compile([
      'a "card" is a thing where:',
      "\t- on picked:",
      "\t\tprint the sender",
      "\t\tprint the target",
      "\t\tprint the original target"
    ])
    expect(compiled).toContain("core.console.log(event.sender)")
    expect(compiled).toContain("core.console.log(event.target)")
    expect(compiled).toContain("core.console.log(event.originalTarget)")
  })

  test("`when flipped:` is the same handler as `on flipped:`", () => {
    const when = compile(['a "card" is a thing where:', "\t- when flipped:", '\t\tprint "flipped"'])
    expect(when).toContain("onFlipped(event) {")
    // `when created` stays the creation hook
    expect(compile(['a "card" is a thing where:', "\t- when created:", '\t\tprint "made"'])).not.toContain("onCreated")
  })

  test("in Spanish:  `enviar`, `pasar evento`, `cancelar evento`", () => {
    const { files } = parseSpellProject([
      {
        path: "/prueba.es.spell",
        contents: [
          'una "puerta" es una cosa donde:',
          "\t- al cerrando:",
          "\t\tcancelar evento",
          "\t- para cerrarla:",
          "\t\tenviar cerrando"
        ].join("\n")
      }
    ])
    expect(files[0]!.errors).toEqual([])
    expect(`${files[0]!.compiled}`).toContain("event.cancel()")
    expect(`${files[0]!.compiled}`).toContain('if ((await send(this, "cerrando", {}, this)).canceled) return')
  })
})

describe("while", () => {
  test("`- while the mouse is down:` is a method the page starts and ends", () => {
    const compiled = compile([
      'a "card" is a thing where:',
      '\t- its "color" is text',
      "\t- while the mouse is down:",
      '\t\tset its color to "gold"'
    ])
    expect(compiled).toContain("whileMouseDown() {")
    expect(compiled).toContain('this.color = "gold"')
  })

  test("what it set goes back as it ends", () => {
    const { card } = runSpell([
      'a "card" is a thing where:',
      '\t- its "color" is text',
      "\t- while the mouse is down:",
      '\t\tset its color to "gold"',
      'set card to a new card with color = "red"'
    ])("card") as { card: { color: string } }
    core.startWhile(card, "whileMouseDown")
    expect(card.color).toBe("gold")
    core.endWhile(card, "whileMouseDown")
    expect(card.color).toBe("red")
  })
})

describe("the mouse and the keys", () => {
  test("read anywhere, from core.input", () => {
    expect(compile(["set shifted to the shift key is down"])).toContain("core.input.shiftKey")
    expect(compile(["set up to the mouse isn't down"])).toContain("!core.input.button")
    expect(compile(["set held to the mouse is still down"])).toContain("core.input.mouseStillDown")
    expect(compile(["set spaced to space is down"])).toContain('core.input.isKeyDown(" ")')
    expect(compile(["set right to the right button is down"])).toContain("core.input.rightButton")
    expect(compile(["set meta to the meta key is down"])).toContain("core.input.metaKey")
  })

  test("a program reads what's true when it asks", () => {
    core.input.set({ shiftKey: true })
    try {
      const run = runSpell(["set shifted to the shift key is down"])("shifted")
      expect(run.shifted).toBe(true)
    } finally {
      core.input.reset()
    }
  })
})
