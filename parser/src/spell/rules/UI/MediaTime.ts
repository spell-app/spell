import { P } from "spell/parser/parser"

/** A time's seconds, two digits:  `0:05`, not `0:5`. */
const TWO_DIGITS = /^\d\d$/

/**
 * `media_time` rule:  where in a sound or video to start, minutes and seconds -- `0:30` in `play video "intro" from 0:30`
 * (epic `language` P65).
 * - Its value is the seconds:  `1:05` => 65.
 * - The `:` and the seconds touch the minutes:  `0:30`, never `0 : 30`.
 * - Only here, after `from`:  `9:30` elsewhere is still a time of day (`time_literal`).
 * - Read by its own `parse()`:  its syntax is for people, and the syntax files.
 */
export class MediaTime extends P.Sequence {
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const [minutes, colon, seconds] = tokens
    if (!(minutes instanceof P.NumberToken) || !Number.isInteger(minutes.value)) return undefined
    if (`${colon?.value}` !== ":" || !(seconds instanceof P.NumberToken)) return undefined
    if (!TWO_DIGITS.test(`${seconds.raw}`) || seconds.value > 59) return undefined
    if (minutes.end !== colon!.start || colon!.end !== seconds.start) return undefined
    const matched = tokens.slice(0, 3)
    return new P.Match({
      rule: this,
      matched,
      raw: matched.map((token) => token.raw ?? token.value).join(""),
      value: minutes.value * 60 + seconds.value,
      tokens: matched,
      scope
    })
  }

  getAST(match: P.MatchFor<this>) {
    return new P.ASTNumericLiteral(match, { value: match.value as number })
  }
}
