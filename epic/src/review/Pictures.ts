import { SHOT_MAX_BYTES } from "./review.types"

/****************
 * ### `Pictures`
 * A picture Owen gives a page:  pasted, dropped or chosen, then sent to the page server (`POST shot`) as a PNG.
 * - ONE way for every place that takes one (epic `epic-engine` P51):  a note box (`<epic-review>`), an option's
 *   form (`<epic-option-form>`, P50)
 * - Plain browser DOM, static:  no Solid, no element;  the caller saves it (`ReviewClient.saveShot()`) and says what
 *   went wrong in its own words (`problemOf()`)
 ****************/
export class Pictures {
  /** The picture in a paste or a drop:  its first image file;  `undefined` for none (text, a link). */
  static fileOf(event: ClipboardEvent | DragEvent): File | undefined {
    const items = "clipboardData" in event ? event.clipboardData?.items : event.dataTransfer?.items
    const item = Array.from(items ?? []).find((each) => each.kind === "file" && each.type.startsWith("image/"))
    return item?.getAsFile() ?? ("dataTransfer" in event ? event.dataTransfer?.files[0] : undefined) ?? undefined
  }

  /** Why `file` can't be taken:  `notImage`, `tooBig` (over 8 MB);  `undefined` when it can. */
  static problemOf(file: File): "notImage" | "tooBig" | undefined {
    if (!file.type.startsWith("image/")) return "notImage"
    if (file.size > SHOT_MAX_BYTES) return "tooBig"
    return undefined
  }

  /**
   * `file` as a PNG data URL, what the page server takes:  a PNG as it is;  any other picture (a JPEG from Finder, a
   * WebP) drawn onto a canvas first.
   * - rejects when the browser can't read or draw it
   */
  static async pngOf(file: Blob): Promise<string> {
    if (file.type === PNG) return Pictures.dataUrlOf(file)
    const bitmap = await createImageBitmap(file)
    const canvas = document.createElement("canvas")
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0)
    bitmap.close()
    return canvas.toDataURL(PNG)
  }

  /** `file` as a data URL. */
  private static dataUrlOf(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error ?? new Error("couldn't read the picture"))
      reader.readAsDataURL(file)
    })
  }
}

/** The one type the page server takes. */
const PNG = "image/png"
