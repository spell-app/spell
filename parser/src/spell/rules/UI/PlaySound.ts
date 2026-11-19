import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Wording } from "spell/parser/spell/rules/expressions"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { QUIET_VOLUME } from "./MediaVolume"

/**
 * `play_sound` rule:  play a sound or a video, from its start, as a click or a key asks (epic `data` Q40, T145;
 * epic `language` P65).
 * - e.g. `play its sound`, `play "cry.ogg"`, `play sound "card slide"`, `play the "intro" video`
 * - What it plays:  a named one (`media_named`), a property holding one, or text, a name first, then a file's address.
 * - Then, each optional, in this order:
 *   - `at 1.5x`, `at half speed`, `at double speed`:  its speed (`media_speed`)
 *   - `from 0:30`:  where to start, minutes and seconds (`media_time`)
 *   - `at 50% volume`, `quietly`, `muted` (`media_volume`)
 *   - `over and over`, `looping` (`media_loop`)
 *   - `in a new window`, `full screen`:  where a video plays (`media_place`);  where it's drawn, else a new window,
 *     if not said
 *   - `and wait`:  what's next waits until it ends
 * - Compiles to `core.play(sound)`, then the options written:  `core.play(core.mediaNamed("intro", "video"),
 *   { speed: 1.5, where: "window" })`;  `await core.play(...)` with `and wait`.
 *   - One player per sound or video, played inside the click, so browsers that want sound to start from a click
 *     (Safari, phones) let it.
 * - A project's own method of the same words wins (`Priority.overridable`):  `play fizzbuzz`, `play from the stock`.
 */
export class PlaySound extends SpellStatement<"sound|speed?|from?|volume?|loop?|place?|wait?"> {
  @proto static alias = ["statement", "async"]
  @proto static priority = Priority.overridable

  getAST(match: P.MatchFor<this>) {
    const { sound, speed, from, volume, loop, place, wait } = match.groups
    const options = new P.ASTObjectLiteral(match)
    const yes = (at: P.Match) => new P.ASTBooleanLiteral(at, { value: true })
    if (speed) options.addProp("speed", P.asAST<P.ASTExpression>(speed.AST))
    if (from) options.addProp("from", P.asAST<P.ASTExpression>(from.AST))
    if (volume) {
      const { volume: level, quiet, muted } = volume.groups as { volume?: P.Match; quiet?: P.Match; muted?: P.Match }
      if (level) options.addProp("volume", P.asAST<P.ASTExpression>(level.AST))
      if (quiet) options.addProp("volume", new P.ASTNumericLiteral(quiet, { value: QUIET_VOLUME }))
      if (muted) options.addProp("muted", yes(muted))
    }
    if (loop) options.addProp("loop", yes(loop))
    const where = Wording.meaningOf(place)
    if (where) options.addProp("where", new P.ASTStringLiteral(place!, { value: where.replace("_", " "), quote: '"' }))
    const args = [P.asAST<P.ASTExpression>(sound.AST)]
    if (options.properties.length) args.push(options)
    const play = new P.ASTCoreMethodInvocation(match, { methodName: "play", args })
    return wait ? new P.ASTAwaitExpression(match, { expression: play }) : play
  }
}

/** Where a video plays, when `play` says:  `media_place`'s meanings, the core's `MediaPlace` with `_` for its space. */
export const MEDIA_PLACES = ["window", "full_screen"]
