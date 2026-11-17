/**
 * spell-epic's `spell` commands (its `package.json`'s `"spell": { "commands" }`, epic `repo-split` Q33):
 * - `spell voice check [--voice novice] [<file> | - | --text "..."] [--about "..."] [--model sonnet] [--json]`:
 *   a second name for `epic voice check` (epic `epic-engine` J256), the same `VoiceCheck`, so a check of text people
 *   see is one `spell` command, like the rest of the repo's checks
 * - Loads fast:  the action imports `VoiceCheck` only when it runs, as `spell help` loads every folder's list.
 * - Every other epic tool stays an `epic` verb (`spell epic <verb>` runs those).
 * - NOTE: the kit's `spell commands` reads this file's TEXT, for each `spell.command(...)` and `<group>.command(...)`
 *   call:  keep each command's name a literal at its call, and each group a `const`.
 */
import { CLI } from "spell/cli"

const epicCommands: CLI.CommandList = (spell) => {
  ////////////////
  // ## Voices
  ////////////////

  const voice = spell.command("voice").description("text people see, checked against a voice -- check")

  voice
    .command("check")
    .description(
      "a fresh reader with no context checks a text against a voice (novice by default):  comprehensible, concise, " +
        "clear, or agent speak -- the same as epic voice check;  exits 0 on a pass, 1 on a fail"
    )
    .argument(
      "[args...]",
      '<file>, - for stdin, or --text "...";  --voice, --about, --model, --json as epic takes them'
    )
    .allowUnknownOption()
    .action(() =>
      CLI.runCommand(async () =>
        new (await import("spell/epic/command/VoiceCheck")).VoiceCheck().run(CLI.rawArgsAfter("voice", "check"))
      )
    )
}

export default epicCommands
