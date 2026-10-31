import { E } from "spell/ui/core"
import { ChunkedPlace } from "spell/util/places/ChunkedPlace"
import { WebChunks } from "spell/util/places/WebChunks"

import { EpicPageFormat } from "spell/epic/tool/EpicPageFormat"

/****************
 * ### `EpicBodies`
 * What loads an `<epic-*>` fold's part, for its `LoadableBody` (epic `data` P6):  the epic page's chunked place, on this
 * page's own folder.
 * - Both ways through here:  a fold opened, and a live re-fetch when its part changed on disk.
 * - Only a part, `source="parts/q1.html"`, on a served page.  Any other `source`, or a page opened from disk:  `undefined`,
 *   so `LoadableBody` takes `UI.sources`, which says what's wrong in the page's own words.
 * - A place per read, holding nothing:  no cache to forget, and the site's router can change the page under it.
 * - A newer load of the same fold aborts the older:  a real abort, where `UI.sources` only stops waiting.
 * - Position in the import graph:  `spell/ui/core`, and the place's files by name, none of them Spell UI's.
 *   Beside `Fold`:  every fold's, items' and sections' alike.
 ****************/
export class EpicBodies {
  /**
   * The text of the part `source` names:  a promise, or `undefined` if it's none of this class's.
   * - rejects:  a `SourceError` for no such part (a 404);  what the place threw for no answer
   */
  static loadText(source: string, { signal }: { signal?: AbortSignal }): Promise<string> | undefined {
    const id = EpicPageFormat.partIdOf(source)
    if (!id || location.protocol === "file:") return undefined
    return EpicBodies.textOfPart(id, source, signal)
  }

  /** The part's text, from this page's folder. */
  private static async textOfPart(id: string, source: string, signal: AbortSignal | undefined): Promise<string> {
    const format = new EpicPageFormat()
    const place = new ChunkedPlace({ store: new WebChunks({ url: new URL("./", document.baseURI).href }), format })
    const text = EpicPageFormat.textOf(await place.bodyOf("", id, signal ? { signal } : {}))
    if (text !== undefined) return text
    throw new E.SourceError(`EpicBodies.loadText():  this page has no part ${source};  check its skeleton`, {
      cause: { kind: "load", status: 404 }
    })
  }
}
