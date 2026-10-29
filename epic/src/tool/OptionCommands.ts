import { readFileSync } from "node:fs"
import { extname } from "node:path"

import { stringFlag } from "spell/epic/command/command.types"

import { PlanDocError } from "./planDoc.types"

import { OptionSets } from "./OptionSets"
import type { Flags, PlanDocCommands } from "./PlanDocCommands"
import { TestShots } from "./TestShots"

/****************
 * ### `OptionCommands`
 * The epic tool's commands on option sets (epic `epic-engine` P50), each a change to one set (`OptionSets`):
 * - `option <name> add | edit | remove | close <id> ...`:  `epic option add seo#Q4 "Title" ["note"]` (a new noun:
 *   `epic choices` is the choice pages' command)
 * - `choose <name> <id> A [C ...] ["outcome"]`:  several letters, and a phase or a standing set as its target
 * - `add <name> choices "Title"`:  a standing set, in the Choices section (made the first time)
 * - Prints and edits through its owner (`PlanDocCommands`):  NOT a command line of its own.
 ****************/
export class OptionCommands {
  /** the command line it belongs to:  its files and output */
  readonly owner: PlanDocCommands

  constructor(owner: PlanDocCommands) {
    this.owner = owner
  }

  /**
   * `option <name> <verb> <id> ...` on page `file`:
   * - `add <id> "Title" ["note"] [--set N] [--image <png>]`:  prints the new option's letter
   * - `edit <id> <letter> [--title "..."] [--note "..."] [--set N]`
   * - `remove <id> <letter> [--set N]`, `close <id> [--set N]`
   * - `<id>`:  an item (`Q4`), a phase (`P50`, its id or name), a standing set (`s-upgrades`)
   * - `--image`:  a PNG, copied beside the page as `tests/<id>-<time>.png` (`TestShots`), shown in the option's card
   * - throws a `PlanDocError` for a verb it doesn't know, or what `OptionSets` refuses
   */
  async run(file: string, [verb, id, ...rest]: string[], flags: Flags): Promise<void> {
    const ref = need(id, `option ${verb ?? "add"}:  which item, phase or standing set?`)
    const set = setFlag(flags)
    switch (verb) {
      case "add": {
        const title = need(rest[0], 'option add:  its title ("Title")')
        const image = await this.image(file, ref, stringFlag(flags.image))
        const letter = await this.owner.edit(file, (plan) =>
          new OptionSets(plan).add(ref, title, { note: rest[1], image, set })
        )
        return this.owner.print(`${ref.toUpperCase()} option ${letter}:  ${title}`)
      }
      case "edit": {
        const letter = need(rest[0], "option edit:  which option (its letter)?")
        const title = stringFlag(flags.title)
        const note = stringFlag(flags.note)
        const did = await this.owner.edit(file, (plan) => new OptionSets(plan).edit(ref, letter, { title, note, set }))
        return this.owner.print(`${ref.toUpperCase()} ${did}`)
      }
      case "remove": {
        const letter = need(rest[0], "option remove:  which option (its letter)?")
        const did = await this.owner.edit(file, (plan) => new OptionSets(plan).remove(ref, letter, { set }))
        return this.owner.print(`${ref.toUpperCase()} ${did}`)
      }
      case "close":
        return this.owner.print(await this.owner.edit(file, (plan) => new OptionSets(plan).close(ref, { set })))
      default:
        throw new PlanDocError(`option what?  add | edit | remove | close (not "${verb}")`)
    }
  }

  /**
   * `choose <name> <id> A [C ...] ["outcome"] [--set N]` on page `file`:  the letters (`A C`, `A,C`), then the outcome.
   * - one letter on an item:  as before (`PlanDoc.choose()`);  several, or a phase or a standing set:  `OptionSets`
   */
  async choose(file: string, [id, ...rest]: string[], flags: Flags): Promise<void> {
    const ref = need(id, "an item id")
    const letters: string[] = []
    let at = 0
    for (; at < rest.length; at++) {
      const words = rest[at]!.split(/[\s,]+/).filter(Boolean)
      if (!words.length || !words.every((word) => LETTER.test(word))) break
      letters.push(...words.map((word) => word.toUpperCase()))
    }
    if (!letters.length) need(undefined, "the option's letter")
    const outcome = rest[at]
    const did = await this.owner.edit(file, (plan) =>
      new OptionSets(plan).choose(ref, letters, { outcome, set: setFlag(flags) })
    )
    this.owner.print(`${ref.toUpperCase()} ${did}`)
  }

  /** `add <name> choices "Title" [--multiple] [--note "..."]`:  a standing set;  prints its id. */
  async addStanding(file: string, title: string, flags: Flags): Promise<void> {
    const id = await this.owner.edit(file, (plan) =>
      new OptionSets(plan).addStandingSet(title, { multiple: flags.multiple === true, note: stringFlag(flags.note) })
    )
    this.owner.print(id)
  }

  /** `--image <png>` copied beside page `file` for holder `ref` (`TestShots.saveShot()`);  its path from there. */
  private async image(file: string, ref: string, path: string | undefined): Promise<string | undefined> {
    if (!path) return undefined
    if (extname(path).toLowerCase() !== ".png") throw new PlanDocError(`--image:  a PNG, not ${path}`)
    return TestShots.saveShot(file, ref.toLowerCase(), readFileSync(path))
  }
}

/** An option's letter, as typed:  `A`, `c`. */
const LETTER = /^[A-Za-z]$/

/** `--set N`, a number from 1;  `undefined` without one. */
function setFlag(flags: Flags): number | undefined {
  if (flags.set === undefined) return undefined
  const set = Number(flags.set)
  if (!Number.isInteger(set) || set < 1)
    throw new PlanDocError(`--set:  a card set's number, from 1 (not ${flags.set})`)
  return set
}

/** `value`, or a `PlanDocError` saying `what` is missing. */
function need(value: string | undefined, what: string): string {
  if (value === undefined || value === "") throw new PlanDocError(`${what}`)
  return value
}
