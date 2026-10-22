import { Command } from "commander"
import { describe, expect, test } from "vite-plus/test"

import languageCommands from "spell-lang/cli/commands"

describe("the language's spell commands (epic repo-split P13)", () => {
  const spell = new Command("spell")
  languageCommands(spell)
  const names = spell.commands.map((command) => command.name())

  test("Owen's names:  lint (was check), speedtest (was speed);  no explore", () => {
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
      "explain"
    ])
  })

  test("each project command says how to name projects", () => {
    const compile = spell.commands.find((command) => command.name() === "compile")!
    expect(compile.helpInformation()).toContain("[projects...]")
  })
})
