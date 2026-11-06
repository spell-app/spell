import { Cell } from "spell/util/reactive"
import type { Places, SavedOrigin, ValueOrigin, WorkedOutOrigin } from "spell/places/Places"
import type { WhyNotWritable } from "spell/places/places.types"
import type { PlaceEdit, PlaceThings } from "spell/parser/core/places"
import type { PropertyOrigin } from "spell/ui/components/ui-property-editor/UIPropertyEditor.types"
import { editor, runtimeCore } from "spell/app/app/editor"
import { appTexts, type AppTextKey } from "spell/app/app/ui/AppTexts"
import { InspectorWrites } from "./InspectorWrites"

/****************
 * ### `InspectorData`
 * A value the side bar shows that's kept in a data place, a back-end, not in the program's source (epic `editor` P26).
 * - Asks the running program where each value came from (`Places.originOf()`, epic `data`):
 *   - a saved value names its place and collection, and the line that declares it;  read only when the place says so
 *   - a worked-out value is read only, and lists the places it read
 * - A change to one is the PROGRAM's data, never a source edit:  the file stays clean.
 *   - Each keystroke is a plain set, held (`PlaceThings.startEdit()`);  Enter or leaving the field sends it,
 *     one undo step in the editor's own history (`editor.history`), so ⌘Z in the side bar takes it back.
 * - A place can be swapped for a sample while designing, the declaring line untouched:
 *   `showFrom()`, on epic `data`'s `useSample()`;  the app pane's header then says so (`<SampleBar>`).
 * - Plain TypeScript, no Solid, and NEVER a value import of `spell/parser/core`:
 *   the program's places come from its runtime (`core._placesNow()`).
 *   - `spell/places/SamplePlace` is loaded the first time a sample is asked for.
 ****************/
export class InspectorData {
  /** Where `property` of `thing` came from:  `undefined` for a value from no place, or before any place is read. */
  static originOf(thing: object, property: string): ValueOrigin | undefined {
    return InspectorData.placesNow()?.places.originOf(thing, property)
  }

  /** The program's places, and the things made from their rows:  `undefined` until it reads one. */
  static placesNow(): { places: Places; things: PlaceThings } | undefined {
    const now = runtimeCore()?._placesNow()
    if (now) InspectorData.followSwaps(now.places)
    return now
  }

  /**
   * How the side bar shows a value's origin (`<ui-property-editor origins>`), in the person's words.
   * - Saved:  `data`, its mark naming the place, and a button to the line that declares it, when it's known.
   * - Read only:  its tooltip says why.
   * - Worked out:  read only, listing the places it read.
   */
  static propertyOrigin(origin: ValueOrigin): PropertyOrigin {
    const action = origin.declaredAt ? ({ action: "show code" } as const) : {}
    if (origin.workedOut) return InspectorData.workedOutOrigin(origin, action)
    const place = InspectorData.placeWords(origin.place)
    const where = { place, collection: InspectorData.placeWords(origin.collection) }
    if (origin.isSample) {
      return {
        kind: "data",
        mark: appTexts.text("inspectorDataSample", { place }),
        from: appTexts.text("inspectorDataFromSample", where),
        ...action
      }
    }
    if (!origin.canWrite) {
      return {
        kind: "data",
        readonly: true,
        mark: appTexts.text("inspectorDataReadOnly", { place }),
        from: appTexts.text(WHY_NOT_TEXTS[origin.whyNot ?? "place"], where),
        ...action
      }
    }
    return {
      kind: "data",
      mark: appTexts.text("inspectorDataReal", { place }),
      from: appTexts.text("inspectorDataFrom", where),
      ...action
    }
  }

  /** A worked-out value's origin:  read only, with the places it read. */
  private static workedOutOrigin(origin: WorkedOutOrigin, action: Pick<PropertyOrigin, "action">): PropertyOrigin {
    const places = InspectorData.listWords(origin.readsFrom.map(InspectorData.placeWords))
    return {
      kind: "worked out",
      mark: appTexts.text("inspectorDataWorkedOut", { places }),
      from: appTexts.text("inspectorDataWorkedOutFrom", { places }),
      ...action
    }
  }

  /**
   * What the side bar says of `thing` as a whole, above its fields:  where it's kept, and whether that's the real data.
   * - `undefined`:  it's kept in no place.
   */
  static sourceOf(thing: object, names: readonly string[]): DataSource | undefined {
    const saved = names
      .map((name) => InspectorData.originOf(thing, name))
      .filter((origin): origin is SavedOrigin => !!origin && !origin.workedOut)
    const [first] = saved
    if (!first) return undefined
    const place = InspectorData.placeWords(first.place)
    const kind = first.isSample ? "sample" : saved.some((origin) => origin.canWrite) ? "real" : "read only"
    return {
      placeName: first.place,
      kind,
      words: appTexts.text(SOURCE_TEXTS[kind], {
        place,
        collection: InspectorData.placeWords(first.collection),
        kindOfPlace: first.kind ?? ""
      })
    }
  }

  ////////////////
  // ## Changing a value kept in a place
  ////////////////

  /**
   * `<ui-property-editor writer>`:  a field of a thing kept in a place became `value`.
   * - Writable:  held in its edit (one per thing and field), shown at once;  `commitEdits()` sends it.
   * - Read only:  taken, and nothing changes.
   * - Anything else:  `false`, so the editor sets it, and the source is written as for any field.
   * - NEVER throws:  a failure is logged, and nothing changes.
   */
  static readonly write = ({ thing, name, value }: { thing: object; name: string; value: unknown }): boolean => {
    const origin = InspectorData.originOf(thing, name)
    if (!origin) return false
    if (!origin.canWrite) return true
    try {
      InspectorData.editOf(thing, name)?.set(value)
    } catch (error) {
      console.error(`InspectorData.write():  couldn't change ${name}:`, error)
    }
    return true
  }

  /** Is field `name` of `thing` kept in a place, so a change to it is never a source edit? */
  static isKeptInPlace(thing: object, name: string): boolean {
    return !!InspectorData.originOf(thing, name)
  }

  /**
   * Send every change held in the side bar's fields:  one undo step for them all, in the editor's history.
   * - On Enter, leaving a field, choosing another part, and before a sample goes in or out.
   * - NEVER throws.
   */
  static commitEdits(): void {
    if (!InspectorData.edits.size) return
    const open = [...InspectorData.edits.values()].flatMap((edits) => [...edits.entries()])
    InspectorData.edits.clear()
    const title = open.length === 1 ? InspectorData.titleOf(open[0]![0]) : appTexts.text("inspectorDataChanges")
    try {
      editor.history.transaction(title, () => {
        for (const [, edit] of open) edit.commit()
      })
    } catch (error) {
      console.error("InspectorData.commitEdits():  couldn't send the changes:", error)
    }
  }

  /** The changes held, each thing's by field. */
  private static readonly edits = new Map<object, Map<string, PlaceEdit>>()

  /** The edit holding changes to `name` of `thing`:  started the first time. */
  private static editOf(thing: object, name: string): PlaceEdit | undefined {
    const things = InspectorData.placesNow()?.things
    if (!things) return undefined
    let edits = InspectorData.edits.get(thing)
    if (!edits) InspectorData.edits.set(thing, (edits = new Map()))
    let edit = edits.get(name)
    if (!edit) {
      const title = InspectorData.titleOf(name)
      edit = things.startEdit(thing as never, name, { title, history: editor.history as never })
      edits.set(name, edit)
    }
    return edit
  }

  /** A change's step title, as every side-bar change's:  `Change Title`. */
  private static titleOf(name: string): string {
    return InspectorWrites.titleOf(name)
  }

  ////////////////
  // ## Samples
  ////////////////

  /**
   * Show `placeName`'s data from a sample while designing, or from the real place again:  everything showing follows.
   * - The line that declares the place doesn't change.
   * - Changes held in the side bar go first, to whatever is behind the name now.
   * - NEVER throws:  a failure shows as the editor's error.
   */
  static async showFrom(placeName: string, from: DataFrom): Promise<void> {
    InspectorData.commitEdits()
    const now = InspectorData.placesNow()
    if (!now) return
    try {
      // renamed:  a `use...` call reads as a React hook to the linter
      const { useSample: putSampleIn, useRealPlace: putRealPlaceBack } = await import("spell/places/SamplePlace")
      if (from === "sample") {
        InspectorData.sampled.add(placeName)
        const rowsFromType = await runtimeCore()!._sampleRowsMaker()
        await putSampleIn(now.places, placeName, { rowsFromType })
      } else await putRealPlaceBack(now.places, placeName)
    } catch (error) {
      editor.showError(error)
    } finally {
      InspectorData.swapped.changed()
    }
  }

  /**
   * The places a sample stands in for now, by name, as the program declares them.
   * - Reactive:  a reader follows samples going in and out.
   */
  static get samplesInUse(): string[] {
    InspectorData.swapped.read()
    const places = InspectorData.placesNow()?.places
    if (!places) return []
    return [...InspectorData.sampled].filter((name) => places.placeFor(name)?.describe().isSample)
  }

  /** The names a sample was asked for:  `samplesInUse` says which still have one. */
  private static readonly sampled = new Set<string>()

  /** Changes as a sample goes in or out. */
  private static readonly swapped = new Cell()

  /** The program's places whose swaps it follows:  a new run's are new. */
  private static readonly followed = new WeakSet<Places>()

  /** Follow `places`' samples going in and out, from anywhere:  `samplesInUse` reads again. */
  private static followSwaps(places: Places): void {
    if (InspectorData.followed.has(places)) return
    InspectorData.followed.add(places)
    places.onSwapped(() => InspectorData.swapped.changed())
  }

  ////////////////
  // ## Words
  ////////////////

  /** A place's or collection's name as the program writes it:  `family_cookbook` => `family cookbook`. */
  static placeWords(name: string): string {
    return name.replaceAll("_", " ").trim()
  }

  /** Several names as one phrase, in the page's language:  `star wars and wikipedia`. */
  static listWords(names: readonly string[]): string {
    return new Intl.ListFormat(appTexts.lang, { type: "conjunction" }).format(names)
  }
}

/** Where a place's data comes from while designing:  `InspectorData.showFrom()`. */
export type DataFrom = "sample" | "real place"

/** Why a value can't be changed, in words. */
const WHY_NOT_TEXTS: Record<WhyNotWritable, AppTextKey> = {
  place: "inspectorDataWhyNotPlace",
  owner: "inspectorDataWhyNotOwner",
  field: "inspectorDataWhyNotField",
  role: "inspectorDataWhyNotRole",
  "taken down": "inspectorDataWhyNotTakenDown"
}

/** What the side bar says above a thing kept in a place, by what's behind it. */
const SOURCE_TEXTS: Record<DataSource["kind"], AppTextKey> = {
  real: "inspectorDataSourceReal",
  "read only": "inspectorDataSourceReadOnly",
  sample: "inspectorDataSourceSample"
}

/** What the side bar says of a thing kept in a place, above its fields. */
export type DataSource = {
  /** The place's name, as the program declares it:  `family_cookbook`. */
  placeName: string
  /**
   * What's behind it:
   * - `"real"`:  the real data, and changes go to it
   * - `"read only"`:  the real data, which takes no changes here
   * - `"sample"`:  a sample stands in for it
   */
  kind: "real" | "read only" | "sample"
  /** The line it shows, in the person's words. */
  words: string
}
