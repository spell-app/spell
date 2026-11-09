import { proto, slug } from "spell/util"
import { CLOUD_KIND, PERSONAL_FOLDERS, SPACE_FOLDERS_PREFIX } from "spell/places/places.types"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
// Import directly to avoid circular import
import { CreatePlace } from "./CreatePlace"

/** The fewest words it's ever said in:  `se guarda en la nube`. */
const SHORTEST = 5

/** What a program's own place called `cloud` is called, if it has one. */
const OWN_CLOUD = "cloud"

/** The rule a TYPE's line names its type with:  `- it is saved in the cloud`. */
const SUBJECT_IT = "subject_it"

/**
 * `saved_in_the_cloud` rule:  a place in the signed-in person's own space on Spell's server
 * (epic `atmosphere` P8;  epic `data` Q3, P15).
 * - e.g. `family cookbook is saved in the cloud`:  a PLACE's line, naming the place, with no article
 *   - It IS a project data folder, plainly said:
 *     `family cookbook is a data folder at personal "family-cookbook"`,
 *     its folder its name's slug, in each person's own space (`ana@spell/__data/family-cookbook`).
 *   - Its kind's word is `the cloud`, as the side bar shows it (`CLOUD_KIND`).
 *   - Nobody signed in, it's kept in this browser, and the page says so;
 *     once someone signs in, it goes up (`identifiesBy: "a sign-in"`, `RemotePlace`).
 *   - Asked what changed every 5 seconds, unless a line under it says otherwise (`check it every`).
 *   - The line says what it is, at the line (`place-cloud-is`).
 * - e.g. `- it is saved in the cloud`:  a TYPE's line, with no place line at all:
 *   refused, saying to name the place first (`place-cloud-name-it`),
 *   as nothing would say what the place is called in the program.
 * - `is saved in` has two jobs, told apart by what's on each side:
 *   - `saved_in_place` takes `it` or `a recipe` on its left, and a place's NAME on its right
 *   - this takes a new name on its left, or `it`, and only ever the words `the cloud` on its right
 * - A program's own place called `cloud` wins:  `- it is saved in the cloud` means that one.
 * - Compiles as `create_place` does:  its class, then `core.place()`.
 */
export class SavedInTheCloud extends CreatePlace {
  @proto static alias = "statement"

  /** Quick test:  enough words for it, so an editor doesn't offer it after just any words, e.g. `set y`. */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    return tokens.length - start >= SHORTEST && SpellStatement.prototype.test.call(this, scope, tokens, start)
  }

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const plain = SpellStatement.prototype.parse.call(this, scope, tokens) as P.MatchFor<this> | undefined
    if (!plain) return undefined
    if (plain.groups.type.rule.name === SUBJECT_IT || isInAType(scope)) {
      if (scope.getType(OWN_CLOUD)?.placeName) return undefined
      return SpellStatement.refuse(plain, SP.Language.of(scope).parserMessage("place-cloud-name-it"))
    }
    const match = this.placeChecked(plain) as P.MatchFor<this> | undefined
    if (match === plain && match.data.folderAt) {
      const language = SP.Language.of(scope)
      SP.SpellWarnings.note(
        match,
        language.parserMessage("place-cloud-is", { place: `${match.groups.type.raw}`.trim(), folder: folderOf(match) })
      )
    }
    return match
  }

  /** Always the cloud. */
  protected placeKindOf(): string {
    return CLOUD_KIND
  }

  /** The person's own folder, named for the place:  `personal/family-cookbook`. */
  protected folderAddressOf(match: P.MatchFor<this>): string {
    return `${SPACE_FOLDERS_PREFIX}/${PERSONAL_FOLDERS}/${SP.SpellUrls.encodePart(folderOf(match))}`
  }
}

/** Is `scope` a type's lines (`- it ...`), where `it is saved in the cloud` is a type's line, whatever reads `it`? */
function isInAType(scope: P.Scope): boolean {
  for (let each: P.Scope | undefined = scope; each; each = each.parentScope) {
    if (each instanceof P.SubjectScope || each instanceof P.TypeScope) return true
  }
  return false
}

/** The folder a cloud place keeps its things in, its name's slug:  `family cookbook` => `family-cookbook`. */
function folderOf(match: P.Match): string {
  return slug(`${(match.groups.type as P.Match).raw}`, { fallback: "data" })
}
