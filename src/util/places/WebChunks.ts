import type { ChunkStore } from "./ChunkedPlace"
import { PlaceError, type PlaceCapabilities, type PlaceContext } from "./places.types"
import { WebPlace, type WebPlaceProps } from "./WebPlace"

/****************
 * ### `WebChunks`
 * A `ChunkStore` on any web address, static hosting included:  each read one plain `GET`, with no server of ours (epic `data` P5).
 * - Read only, as static hosting is:  a `ChunkedPlace` on it says `write: "none"`.
 * - Nothing there (a 404) is no chunk;  a 5xx or nothing at all is thrown, as no answer.
 * - On `WebPlace`, for its requests:  real aborts, and a key is never written.
 * - Always asks the server whether what the browser holds is still good (`no-cache`):  a read is of what's there NOW.
 ****************/
export class WebChunks extends WebPlace implements ChunkStore {
  /** A real abort. */
  readonly aborts = "hard"

  constructor(props: WebPlaceProps) {
    super({ changeIdHeader: false, ...props })
  }

  /** What a `ChunkedPlace` asks of it is its own to say:  this says only that nothing's written. */
  describe(): PlaceCapabilities {
    return {
      filter: "none",
      sort: "none",
      select: "none",
      page: "none",
      write: "none",
      atomic: false,
      live: "poll",
      abort: "hard"
    }
  }

  /** The text at `address`, under `url`:  `undefined` if there's none. */
  async read(address: string, context: PlaceContext = {}): Promise<string | undefined> {
    try {
      const response = await this.answerTo({ url: `${this.url}/${address}`, urlData: {}, cache: "no-cache" }, context)
      return await response.text()
    } catch (error) {
      if (error instanceof PlaceError && error.kind === "not found") return undefined
      throw error
    }
  }
}
