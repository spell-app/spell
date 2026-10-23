import { Command } from "commander"
import { describe, expect, test } from "vite-plus/test"

import languageCommands from "spell-lang/cli/commands"

describe("the language's spell commands (epic repo-split P13)", () => {
  const spell = new Command("spell")
  languageCommands(spell)
  const names = spell.commands.map((command) => command.name())

  test("Owen's names:  lint (was check), speedtest (was speed);  no explore;  lang for the language's own tools", () => {
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
      "lang"
    ])
  })

  test("the language packs' tools:  spell lang packs check, spell lang packs fix (epic spanish P7)", () => {
    const packs = spell.commands.find((command) => command.name() === "lang")!.commands[0]!
    expect([packs.name(), ...packs.commands.map((command) => command.name())]).toEqual(["packs", "check", "fix"])
  })

  test("translating a project:  spell lang translate --to (epic spanish P24)", () => {
    const translate = spell.commands.find((command) => command.name() === "lang")!.commands[1]!
    expect(translate.name()).toBe("translate")
    expect(translate.options.map((option) => option.long)).toEqual([
      "--to",
      "--out",
      "--update",
      "--no-ai",
      "--model",
      "--seed",
      "--learn"
    ])
  })

  test("each project command says how to name projects", () => {
    const compile = spell.commands.find((command) => command.name() === "compile")!
    expect(compile.helpInformation()).toContain("[projects...]")
  })
})
