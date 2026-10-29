# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, and others)
when working with code in this folder, `src/cli/` of the kit's parser folder (`spell/parser/cli`).

**READ the parser folder's [AGENTS.md](../../AGENTS.md) and [WWOD](../../agents/wwod/WWOD.md) FIRST:**
the folder's layout, and the house style every folder shares.
Only what's local is below;  a section named like a WWOD rule extends it.

## Overview

- The language's commands for `spell`, the kit's command line ([README-cli.md](../../../README-cli.md)):

  ```
  compile  lint  run  test  watch  format  describe  explain  parse  repl  speedtest
  translate  translate check  translate fix  translate speedtest
  ```

  - Owen's names (epic `repo-split` P13):
    - `lint` was `spell check`
    - `speedtest` was `spell speed`
    - `spell explore` is gone
  - [the parser folder's README](../../README.md#the-language-commands), "Moving each command's work down into spell-parser",
    has what each needs to move down here.
- How the kit finds them:  `package.json`'s `"spell": { "commands": "./src/cli/commands.ts" }`.
  - [commands.ts](commands.ts) adds each command to the `spell` program it's handed (commander):
    its name, arguments, flags and help.
  - It MUST load fast:  `spell help` loads every folder's list.  It imports nothing of spell.
  - The kit's `spell commands` check reads its TEXT:  keep each name a literal at its `spell.command("...")` call.
- Their WORK is NOT here yet:
  it comes through the `"language"` hook, which [the app folder's hooks](../../../app/src/cli/hooks.ts) provide.
  - Why:  every one finds projects the app's way:
    addresses like `@spell/examples/solitaire`, groups, the editor's language service.
  - Without the app folder, each says the commands come with `app/`, to run `spell` from a checkout of the whole
    repo, and exits 2 (`CLI.needHook()`).
- `spell translate check|fix` (epic `spanish` P7) are the exception:
  their work IS here, in [packsCommand.ts](packsCommand.ts), as they need no project, only the parser folder's own rule files.
  - `commands.ts` imports it dynamically, when one runs:  it loads all of spell.
  - The checking and the stubs are spell's [packs.ts](../spell/languages/packs.ts), on text.
  - This file reads, writes, asks `claude -p` (`--ai`) and prints.
- `spell translate` (epic `spanish` P24-P29) is half and half:
  - the app's `translateCommand` finds and parses the project (the hook), as every project command does,
    and hands over what only the app has:  its declarations, its imports, Spell UI's names, a checker that lints
    and tests the translation
  - then [translateProject.ts](translateProject.ts), here, runs the three passes (names, lines, fix-ups),
    reads and writes the files, the shared glossary too (`--learn`)
  - and [claudeRunners.ts](claudeRunners.ts) asks Claude (epic `spanish` P27), `claudeRunnerFor()` picking:
    - `claudeApiRunner()`:  the Claude API, one `fetch` a call (no SDK), when `ANTHROPIC_API_KEY` is set;
      structured outputs, thinking off where the model can, the glossary cached, a 429 or 529 retried
    - `runClaude()`:  `claude -p`, as fast as its flags make it, `--json-schema` too;
      it says once, at the start, that a key would be faster
    - `--effort fast|balanced|best`, and one pass's (`--names-effort`, `--fix-ups-effort`):  in no provider's
      terms (`askingFor()`, in `translateProject.ts`);  each runner maps a pass's tier to a model and effort,
      Claude's by `CLAUDE_TIERS` (`inClaudeTerms()`), so another provider's runner brings a table of its own
    - `--model <model>[:<effort>]`, hidden, for experiments:  an exact model and effort for every call
  - the translating itself is spell's [translate/](../spell/translate/) (`NamesGlossary`, `NamesPass`, `Translator`,
    `ShapeCheck`, `FixUps`), on parsed files:  no node
  - `--out` keeps everything the run writes, its dictionary and record too (epic `spanish` J186):
    a dictionary beside the project is read, never written;  `--update` finds its record by the same `--out`
  - `--review` (epic `spanish` P31, P32):  between the names and the lines, [NamesReview.ts](NamesReview.ts) shows the
    names drafted on a page, a COMMAND RUN of the kit's (`SRV.CommandRun`, in the Review tab), STEERED:
    - a row per name drafted, with Claude's alternatives (`NamesPass`, asked in the same calls with `--review`);
      accepted, typed or picked, each answer is checked readable, marked reviewed in the dictionary
      (`TranslationNames.reviewed`), and ticked ones go into the shared glossary (`NamesGlossary.addReviewed()`)
    - each answer as it's given (`answersAsTheyCome()`), until Send or `--review-timeout`:  a good one into the
      dictionary at once and `take()`n;  an unreadable one's row says why at once, on the same row id;
      no Send in time, the answers given by then still count (J187)
    - the run stays open through the three passes, drawn on its status card (`startPass()` ...);  the effort picked
      there is read before the names and the fix-ups (`steerPass()`, in `translateProject.ts`), a pass's own flag
      winning;  it finishes `done`, `timed-out`, or `stopped` (a throw, Ctrl-C:  `finishOnInterrupt()`)
    - its run is injected (`TranslateSettings.openRun`):  `openCommandRun()` loads `spell/server` only then
  - `--cold` (epic `spanish` P29), for timing:  none of the lists earlier runs worked out -- the shared glossary,
    the project's dictionary, the record of fix-ups, a seed -- and nothing written but into `--out`
    - every report says which it started from (`pre-calculated:`, `TranslationLists`)
  - `translationOf()`:  the same translation, returning what it did in numbers (`TranslationResult`), printing
    nothing with `print: false`;  `translateProject()` is it, returning only the exit code
- `spell translate speedtest` (epic `spanish` P29) times it the same way, half and half:
  - the app's `translateTimeCommand` finds the projects (default Solitaire and todos-form-based) and the
    examples' twins a person translated (Solitaire's Solitario), and translates each run's copy, a session of its own
  - [translateTimes.ts](translateTimes.ts), here, copies each project to a scratch folder (without its own lists),
    runs it in each mode (`cold`, `glossary`, `update`) and tier, prints a table of min, median and max, writes
    `--json`, and deletes every scratch folder, a failed run's too
- [index.ts](index.ts) (`spell/parser/cli`, here and from every other folder):  TYPES only, today.
  - [cli.types.ts](cli.types.ts):
    - `LanguageCommands`, the hook's shape
    - each command's flags:  `CompileOptions`, `LintOptions` ...
  - The app folder implements the hook against them:  every arrow points down.
- NEVER imports the app folder:  it's above the parser folder.

## Tests

As WWOD §20, plus:

- In the parser folder's [tests/cli/](../../tests/cli/):  the command list's names and help.
- The commands themselves run end to end in [the app folder's tests](../../../app/tests/cli/cli.test.ts):
  their work is the app's.
- `spell translate check|fix`' work:  [packs.test.ts](../../tests/spell/languages/packs.test.ts), beside the `packs.ts` it drives.
- `spell translate`'s:  each pass's own tests, [tests/spell/translate/](../../tests/spell/translate/);
  its three passes together, with a fake `claude` and a fake checker, [translateProject.test.ts](../../tests/cli/translateProject.test.ts);
  its `--cold` too, each list ignored, in the same file;
  its `--review`, with a fake steered run (answers as they come:  accepted, typed, picked, ticked, unreadable then fixed,
  changed, timed out;  the effort switched between passes;  the passes in order;  done / timed-out / stopped),
  and `--out`'s files (J186),
  in the same file;
  the timing, with a fake translation, [translateTimes.test.ts](../../tests/cli/translateTimes.test.ts);
  the two runners, the API's with a fake `fetch`, [claudeRunners.test.ts](../../tests/cli/claudeRunners.test.ts);
  the command end to end, the app folder's [cli.test.ts](../../../app/tests/cli/cli.test.ts).
