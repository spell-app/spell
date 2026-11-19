import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Wording } from "spell/parser/spell/rules/expressions"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Through the folder:  read only when parsing, once the folder has loaded
import { MediaNamed, mediaEventName } from "spell/parser/spell/rules/UI"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { On } from "./On"

/**
 * `when_media` rule:  run this when a sound or video ends, starts playing or pauses -- `when the "intro" video ends`,
 * `when sound "card slide" starts playing` (epic `language` P65);  Spanish `cuando el vídeo "intro" termina`.
 * - What a program builds its own player with:  each named sound or video sends these as it plays (the core's
 *   `media.ts`).
 * - Its event is the name's words, the kind and what happened, dashed, the same in every language:
 *   `intro-video-ends`, `card-slide-sound-starts`, `intro-video-pauses` -- so `on intro video ends` hears it too.
 * - Everyone hears it, as `trigger` sends:  the app and each page by their own handler (in an outline,
 *   `onIntroVideoEnds()`), then the program's own `on ...` listeners.
 * - The name must be written out:  a fill-in can't name a handler (`media-event-name`).
 * - Above `On`, which reads the same words as an event of that name (`Priority.specific`).
 */
export class WhenMedia extends On {
  @proto static priority = Priority.specific

  /** Refuses a name with a fill-in:  its event's name must be known now. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens)
    if (!match) return undefined
    const media = WhenMedia.mediaOf(match)
    if (MediaNamed.wordsOf(media.groups.name as P.Match) !== undefined) return match
    return SpellStatement.refuse(match, SP.Language.of(scope).parserMessage("media-event-name"))
  }

  /** What the event names:  see the class. */
  ownEventName(match: P.MatchFor<On>): string {
    const media = WhenMedia.mediaOf(match)
    const happened = Wording.meaningOf((match.groups as unknown as { happened: P.Match }).happened)
    const name = MediaNamed.wordsOf(media.groups.name as P.Match) ?? ""
    return mediaEventName(name, MediaNamed.kindOf(media as P.MatchFor<MediaNamed>), `${happened}`)
  }

  /** The sound or video it's about. */
  private static mediaOf(match: P.Match): P.Match {
    return (match.groups as unknown as { media: P.Match }).media
  }
}

/** What a sound or video sends as it plays:  `media_event`'s meanings, the core's `MediaEvent`. */
export const MEDIA_EVENTS = ["ends", "starts", "pauses"]
