import { SPACE_FOLDERS_PREFIX } from "spell/places/places.types"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { CreatePlace, unclearNumbersOf } from "./CreatePlace"

/**
 * `projection_of` rule:  part of a space's data, written where other people can see it (epic `atmosphere` P17, Q16 A).
 * - e.g. `the published sheet is a projection of the sign up sheet`, with lines under it:
 *
 *   ```text
 *   the published sheet is a projection of the sign up sheet:
 *     - into "@rs/picnic"
 *     - showing each row's person and shift
 *     - only where its "status" is "confirmed"
 *   ```
 *
 * - Its own sentence, so the view has a name pages can show:  it's a place, read as any project data folder is.
 * - The source is a project data folder in a space (`... is a data folder at "@rs/picnic-private/signups"`).
 * - Only the fields its `showing` line names are shown:  a new field stays private until someone adds it.
 * - Spell's server keeps it up to date as the source changes (the app's `SpaceProjections`):
 *   it's always rebuilt from the source, so nothing is lost.
 * - Who reads it is what the target space's list says;  Spell never decides a read.
 * - Compiles to its class, then `core.place()` with the target's folder and a `projection`:
 *   `{ into: "@rs/picnic", of: "/api/places/spaces/...", fields: ["person", "shift"] }`.
 */
export class ProjectionOf extends CreatePlace {
  /** A data folder in a space, and lines that say where and what:  else refused, saying why. */
  protected placeChecked(match: P.MatchFor<this>): P.Match | undefined {
    const language = SP.Language.of(match.scope)
    const source = (match.groups as { source?: P.Match }).source
    const sourceType = source && match.scope.getType(source.datatype)
    const sourceAt = sourceType?.placeAt
    if (!sourceAt) {
      return SpellStatement.refuse(
        match,
        language.parserMessage("projection-not-a-folder", {
          source: (source?.tokens ?? []).map((token) => token.raw).join(" ")
        })
      )
    }
    match.data.placeKind = "data folder"
    ;(match.data as ProjectionData).sourceAt = sourceAt
    const refused = this.refuseTakenNames(match)
    if (refused !== match) return refused
    const lines = () => CreatePlace.detailsOf(match).projection ?? {}
    SP.SpellWarnings.refuseIf(
      match,
      language.parserMessage("projection-needs-a-space"),
      () => !SP.SpellLocation.isAddress(lines().into ?? "")
    )
    SP.SpellWarnings.refuseIf(match, language.parserMessage("projection-needs-fields"), () => !lines().fields?.length)
    return match
  }

  /** The target's folder, and the projection:  where it's written, from where, which fields, which things. */
  protected descriptionOf(match: P.MatchFor<this>): Record<string, unknown> {
    const { projection, ...details } = CreatePlace.detailsOf(match)
    const into = projection?.into ?? ""
    return {
      name: CreatePlace.placeNameOf(match),
      kind: "data folder",
      at: `${SPACE_FOLDERS_PREFIX}/${SP.SpellUrls.encodeAddress(into)}`,
      ...details,
      projection: { into, of: (match.data as ProjectionData).sourceAt, fields: [], ...projection },
      ...unclearNumbersOf(match.scope)
    }
  }
}

/** What a projection's match holds besides a place's. */
type ProjectionData = {
  /** The source's folder, as the page server serves it. */
  sourceAt?: string
}
