import { Command } from "commander"
import { describe, expect, test } from "vite-plus/test"

import languageCommands from "spell/parser/cli/commands"

describe("the language's spell commands (epic repo-split P13)", () => {
  const spell = new Command("spell")
  languageCommands(spell)
  const names = spell.commands.map((command) => command.name())

  test("Owen's names:  lint (was check), speedtest (was speed);  no explore;  translate for translating and the packs;  spellx (epic elemental-spell P12)", () => {
    expect(names).toEqual([
      "compile",
      "lint",
      "describe",
      "run",
      "test",
      "watch",
      "format",
      "speedtest",
      "parse",
      "repl",
      "explain",
      "translate",
      "spellx"
    ])
  })

  test("spellx's verb:  spell spellx convert (epic elemental-spell P12)", () => {
    const spellx = spell.commands.find((command) => command.name() === "spellx")!
    expect(spellx.commands.map((command) => command.name())).toEqual(["convert"])
  })

  test("the language packs' tools:  spell translate check, spell translate fix (epic spanish P7)", () => {
    const translate = spell.commands.find((command) => command.name() === "translate")!
    expect(translate.commands.map((command) => command.name())).toEqual(["check", "fix", "speedtest"])
  })

  test("translating a project:  spell translate --to (epic spanish P24)", () => {
    const translate = spell.commands.find((command) => command.name() === "translate")!
    expect(translate.options.map((option) => option.long)).toEqual([
      "--to",
      "--out",
      "--update",
      "--no-ai",
      "--effort",
      "--names-effort",
      "--fix-ups-effort",
      "--seed",
      "--learn",
      "--review",
      "--review-timeout",
      "--cold",
      "--model"
    ])
  })

  test("timing it:  spell translate speedtest (epic spanish P29)", () => {
    const time = spell.commands.find((command) => command.name() === "translate")!.commands[2]!
    expect(time.name()).toBe("speedtest")
    expect(time.options.map((option) => option.long)).toEqual([
      "--to",
      "--runs",
      "--effort",
      "--mode",
      "--reference",
      "--json"
    ])
  })

  test("each project command says how to name projects", () => {
    const compile = spell.commands.find((command) => command.name() === "compile")!
    expect(compile.helpInformation()).toContain("[projects...]")
  })
})
