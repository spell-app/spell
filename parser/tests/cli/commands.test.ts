import { Command } from "commander"
import { describe, expect, test } from "vite-plus/test"

import languageCommands from "spell-parser/cli/commands"

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
      "parser"
    ])
  })

  test("the language packs' tools:  spell parser packs check, spell parser packs fix (epic spanish P7)", () => {
    const packs = spell.commands.find((command) => command.name() === "parser")!.commands[0]!
    expect([packs.name(), ...packs.commands.map((command) => command.name())]).toEqual(["packs", "check", "fix"])
  })

  test("translating a project:  spell parser translate --to (epic spanish P24)", () => {
    const translate = spell.commands.find((command) => command.name() === "parser")!.commands[1]!
    expect(translate.name()).toBe("translate")
    expect(translate.options.map((option) => option.long)).toEqual([
      "--to",
      "--out",
      "--update",
      "--no-ai",
      "--effort",
      "--names-effort",
      "--fix-ups-effort",
      "--model",
      "--seed",
      "--learn",
      "--cold"
    ])
  })

  test("timing it:  spell parser translate-time (epic spanish P29)", () => {
    const time = spell.commands.find((command) => command.name() === "parser")!.commands[2]!
    expect(time.name()).toBe("translate-time")
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
