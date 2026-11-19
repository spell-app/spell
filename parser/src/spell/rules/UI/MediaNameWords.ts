import { P } from "spell/parser/parser"
import { Wording } from "spell/parser/spell/rules/expressions"
// Through the folder:  read only when parsing, once the folder has loaded
import { QuotedMember } from "spell/parser/spell/rules/properties"
import { mediaNameKey, mediaNamesIn } from "./UI.shared"

/** The most words a sound or video's name is read from, without quotes. */
const MOST_WORDS = 6

/**
 * `media_name_words` rule:  a sound or video's name without quotes, `card slide` in `play the card slide sound`
 * (epic `language` P65).
 * - The words of a name the program has given one, by then (`noteMediaName()`):  the longest that fits.
 * - Or, for a name given further down (a drawing's `<sound "boing" ... />` below the action that plays it), the words
 *   up to `sound` or `video`, when they and that word aren't a property of the thing it's in (`the alarm sound`);
 *   `media_named` refuses them once the program has parsed, if nothing gives that name.
 * - Any case;  a name's `-` or `_` reads as a space.
 * - Its value is the name's words, as the core finds it.
 * - Read by its own `parse()`:  its syntax is for people, and the syntax files.
 */
export class MediaNameWords extends P.Sequence {
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    let most = 0
    while (most < MOST_WORDS && tokens[most] instanceof P.WordToken) most++
    if (!most) return undefined
    const words = tokens.slice(0, most).map((token) => `${token.value}`)
    const names = mediaNamesIn(scope)
    let found = 0
    if (names.size) {
      for (let count = 1; count <= most; count++) {
        if (names.has(mediaNameKey(words.slice(0, count).join(" ")))) found = count
      }
    }
    found ||= MediaNameWords.namedFurtherDown(scope, tokens, most)
    if (!found) return undefined
    const matched = tokens.slice(0, found)
    return new P.Match({
      rule: this,
      matched,
      raw: words.slice(0, found).join(" "),
      value: mediaNameKey(words.slice(0, found).join(" ")),
      tokens: matched,
      scope
    })
  }

  /**
   * How many of `tokens`' first `most` words read as a name given further down:  the words before a `media_kind` word,
   * when they and it aren't a property of the thing `scope` is in -- 0 for none.
   */
  private static namedFurtherDown(scope: P.Scope, tokens: P.Token[], most: number): number {
    for (let count = 1; count < most; count++) {
      if (!Wording.lengthAt(scope, "media_kind", tokens, count)) continue
      const thing = P.MethodScope.thingTypeOf(scope)
      const words = tokens.slice(0, count + 1).map((token) => `${token.value}`)
      const asProperty = QuotedMember.nameOf(words.join(" "))
      return thing?.getMember(asProperty) ? 0 : count
    }
    return 0
  }
}
