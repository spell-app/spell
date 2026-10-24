import { Command } from "commander"
import { describe, expect, test } from "vite-plus/test"

import { CLI } from "spell/cli"

/** A made-up repo, `spell-<short>`, at a made-up folder. */
function repo(short: string): CLI.SpellRepo {
  return { name: `spell-${short}`, short, root: `/kit/spell-${short}`, version: "0.0.0" }
}

/** A command list adding commands `names`, each doing nothing. */
function listOf(...names: string[]): CLI.CommandList {
  return (spell) => {
    for (const name of names) spell.command(name).description(`${name} it`)
  }
}

/** `program`'s top-level command names, help's own aside. */
function namesOf(program: Command): string[] {
  return program.commands.map((command) => command.name())
}

describe("addRepoCommands():  the clash rule (epic repo-split Q33)", () => {
  test("a name only one repo has:  at the top level, in its repo's help group", () => {
    const program = new Command("spell")
    const clashes = CLI.addRepoCommands(program, [
      [repo("parser"), listOf("compile", "run")],
      [repo("app"), listOf("projects")]
    ])
    expect(clashes.size).toBe(0)
    expect(namesOf(program)).toEqual(["compile", "run", "projects"])
    expect(program.commands[0]!.helpGroup()).toBe("spell-parser:")
    expect(program.commands[2]!.helpGroup()).toBe("spell-app:")
  })

  test("a fake clash, two repos both naming check:  both go under their repo's names, the bare word says where", () => {
    const program = new Command("spell")
    const clashes = CLI.addRepoCommands(program, [
      [repo("parser"), listOf("check", "compile")],
      [repo("app"), listOf("check")]
    ])
    expect([...clashes.keys()]).toEqual(["check"])
    expect(clashes.get("check")!.map((each) => each.name)).toEqual(["spell-parser", "spell-app"])
    const parser = program.commands.find((command) => command.name() === "parser")!
    const app = program.commands.find((command) => command.name() === "app")!
    expect(namesOf(parser)).toEqual(["check"])
    expect(namesOf(app)).toEqual(["check"])
    // the bare word:  hidden, so help lists only the two
    const bare = program.commands.find((command) => command.name() === "check")!
    expect((bare as unknown as { _hidden: boolean })._hidden).toBe(true)
    expect(namesOf(program)).toContain("compile")
  })

  test("a repo's own group by its short name takes its clashing commands (spell app ...)", () => {
    const program = new Command("spell")
    CLI.addRepoCommands(program, [
      [repo("parser"), listOf("lint")],
      [
        repo("app"),
        (spell) => {
          spell.command("app").command("create")
          spell.command("lint")
        }
      ]
    ])
    const app = program.commands.find((command) => command.name() === "app")!
    expect(namesOf(app)).toEqual(["create", "lint"])
  })
})

describe("addHelp()", () => {
  test("help for a sub-command, by its path", () => {
    const program = new Command("spell").exitOverride()
    CLI.addRepoCommands(program, [[repo("kit"), (spell) => void spell.command("server").command("start")]])
    CLI.addHelp(program)
    expect(namesOf(program)).toEqual(["server", "help"])
  })
})
