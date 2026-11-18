import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { basename, dirname, extname, join, resolve } from "node:path"

import { compactTime } from "spell/util/time"
import { SRV } from "spell/server"

import type { PastedImage } from "spell/epic/command/command.types"

import { PlanDocError } from "./planDoc.types"
import { PlanDocFiles } from "./PlanDocFiles"
import { PlanMarkup } from "./PlanMarkup"

/****************
 * ### `ItemPictures`
 * The pictures the person gives an item (epic `epic-engine` T87;  Owen, 2026-11-16:  "when I paste a picture into chat
 * which gets logged as an issue or todo, include the picture in the epic doc.  Make it so I can delete those pictures
 * from the epic page, which deletes the files").
 * - In:  `epic add <epic>#I "..." --picture <file>` (repeatable) and `--pasted <n>`, the newest `n` pictures the
 *   person pasted into this session's chat
 *   - a pasted picture is no file:  Claude Code keeps it only in the session's transcript, as base64
 *     (`~/.claude/projects/<slug>/<session>.jsonl`), which `Requests.pastedImages()` reads, as `epic send --images` does
 * - Kept:  beside the page, `pictures/<item>-<time>.<ext>` (`PICTURES`), as a comment's pictures are
 *   (`TestShots.savePicture()`), never over a file
 * - Shown:  an `<epic-picture>` each at the end of the item's details, around its `<img>`, labelled in order, IMG1,
 *   IMG2 ... (epic `epic-engine` P75);  a picture deleted leaves a gap, the others keep their labels (choice B)
 * - Deleted from the page (`<epic-picture>`'s trash):  the review routes' `POST delete-picture`, `remove()`
 * - node only;  the review routes load it lazily, as `InstantMarks`:  it brings `PlanDoc`
 ****************/
export class ItemPictures {
  /**
   * The pictures `--picture <file>` names, in order.
   * - throws a `PlanDocError` for a file that isn't there, or isn't a picture (`.png`, `.jpg`, `.gif`, `.webp`)
   */
  static fromFiles(files: readonly string[]): GivenPicture[] {
    return files.map((file) => {
      const path = resolve(file)
      const ext = extname(path).slice(1).toLowerCase()
      if (!PICTURE_FILE.test(ext)) throw new PlanDocError(`--picture ${file}:  a .png, .jpg, .gif or .webp`)
      if (!existsSync(path)) throw new PlanDocError(`--picture ${file}:  no such file`)
      return { bytes: readFileSync(path), ext: ext === "jpeg" ? "jpg" : ext, alt: basename(path) }
    })
  }

  /**
   * The newest `count` pictures the person pasted into session `session`'s chat, oldest first.
   * - `pasted`:  how they're read (`Requests.pastedImages()`, the transcript's);  a test hands its own
   * - throws a `PlanDocError` when there are fewer than `count`, or `count` isn't a whole number from 1
   */
  static async fromPasted(
    count: string | true | undefined,
    session: string | undefined,
    pasted: PastedReader = readPasted
  ): Promise<GivenPicture[]> {
    if (count === undefined) return []
    const wanted = Number(count === true ? NaN : count)
    if (!Number.isInteger(wanted) || wanted < 1)
      throw new PlanDocError(`--pasted <n>:  how many of the pictures pasted last, 1 or more, not ${String(count)}`)
    const found = await pasted(session, wanted)
    if (found.length < wanted)
      throw new PlanDocError(`--pasted ${wanted}:  this session's chat has ${found.length} pasted picture(s)`)
    const { PICTURE_EXTENSIONS } = await import("spell/epic/command/Requests")
    return found.map((image) => ({
      bytes: Buffer.from(image.data, "base64"),
      ext: PICTURE_EXTENSIONS[image.mediaType] ?? "png",
      alt: PASTED_ALT
    }))
  }

  /**
   * `pictures` named for item `id` of epic page `file`:  `pictures/t87-20261116-1302.png`, `-2` ... when a file of that
   * name is there, or an earlier one in the list took it.
   * - `now`:  the time they're stamped with, local, to the minute
   */
  static named(file: string, id: string, pictures: readonly GivenPicture[], now = new Date()): NamedPicture[] {
    const folder = dirname(file)
    const taken = new Set<string>()
    return pictures.map((picture) => {
      const stem = `${PICTURES}/${id.toLowerCase()}-${compactTime(now)}`
      for (let n = 1; ; n++) {
        const path = n === 1 ? `${stem}.${picture.ext}` : `${stem}-${n}.${picture.ext}`
        if (taken.has(path) || existsSync(join(folder, path))) continue
        taken.add(path)
        return { ...picture, path }
      }
    })
  }

  /**
   * The markup that shows `pictures` in an item's details:  an `<epic-picture>` around each `<img>`, labelled in
   * order, `label="IMG1"` ... (epic `epic-engine` P75);  `""` for none.
   * - `first`:  the first one's number, for pictures after others.  Default:  1
   */
  static html(pictures: readonly NamedPicture[], first = 1): string {
    return pictures
      .map(
        ({ path, alt }, index) =>
          `<epic-picture label="IMG${first + index}"><img src="${PlanMarkup.attribute(path)}" ` +
          `alt="${PlanMarkup.attribute(alt)}" /></epic-picture>`
      )
      .join("")
  }

  /**
   * The number the next picture `item` shows gets:  one past its highest label (`IMG2` => 3), 1 for none;  a picture
   * deleted leaves a gap, the others keeping their labels (P75's choice B).
   */
  static nextNumber(item: Element | null | undefined): number {
    const labels = Array.from(item?.querySelectorAll("epic-picture[label]") ?? []).map((picture) =>
      Number(/^IMG(\d+)$/.exec(picture.getAttribute("label") ?? "")?.[1] ?? 0)
    )
    return Math.max(0, ...labels) + 1
  }

  /**
   * SIDE EFFECT:  `pictures` written beside epic page `file` (and `pictures/`), never over a file.
   * - throws what writing throws (a name taken since `named()`:  `EEXIST`)
   */
  static save(file: string, pictures: readonly NamedPicture[]): void {
    for (const picture of pictures) {
      const path = join(dirname(file), picture.path)
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, picture.bytes, { flag: "wx" })
    }
  }

  /**
   * SIDE EFFECT:  item `id`'s picture `src` taken out of epic page `file` (every `<epic-picture>` showing it), a log
   * line saying so, and its file deleted;  resolves to its path from the page's folder (`pictures/t3-...png`).
   * - `src`:  its `<img src>`, as the page has it:  a root path (`/epics/seo/pictures/t3-...png`) or from the page
   * - `root`:  the checkout the page server serves (`PlanDocFiles`)
   * - throws `SRV.HttpError`:  400 for a `src` that isn't one of the page's `pictures/`, 404 when the item doesn't show
   *   it;  its file already gone is no error
   */
  static async remove(file: string, root: string, id: string, src: unknown): Promise<string> {
    const path = ItemPictures.pathOf(src)
    await new PlanDocFiles({ root }).edit(file, (plan) => {
      const item = plan.item(id)
      const shown = [...item.querySelectorAll("epic-picture")].filter((picture) => {
        const img = picture.querySelector("img")?.getAttribute("src")
        return !!img && ItemPictures.pathOrNone(img) === path
      })
      if (!shown.length) throw new SRV.HttpError(404, `${id.toUpperCase()} shows no picture ${path}`)
      // its label goes with it, the others keep theirs:  a gap, so what was said about the next one stays true (P75)
      const label = shown[0]!.getAttribute("label")
      for (const picture of shown) picture.remove()
      plan.log(`${id.toUpperCase()}:  picture ${label ? `${label} ` : ""}deleted from the page, ${path}`)
    })
    rmSync(join(dirname(file), path), { force: true })
    return path
  }

  /**
   * `src` as a path from the page's folder, `pictures/<name>`.
   * - throws `SRV.HttpError` 400 for anything but a picture's file name in a `pictures/` folder
   */
  static pathOf(src: unknown): string {
    const path = typeof src === "string" ? ItemPictures.pathOrNone(src) : undefined
    if (!path) throw new SRV.HttpError(400, `not a picture of the page's:  ${String(src)}`)
    return path
  }

  /** `src` as a path from the page's folder (`pictures/<name>`), `undefined` when it isn't one. */
  private static pathOrNone(src: string): string | undefined {
    const name = PICTURE_SRC.exec(src.split(/[?#]/)[0]!)?.[1]
    return name ? `${PICTURES}/${name}` : undefined
  }
}

/** The folder of an item's pictures, beside its page:  `epics/<epic>/pictures/`, a comment's pictures' too. */
export const PICTURES = "pictures"

/** A picture given to an item, not saved yet:  its bytes, its file's extension, its `alt`. */
export type GivenPicture = { bytes: Buffer; ext: string; alt: string }

/** ... named:  its path from the page's folder, `pictures/t87-20261116-1302.png`. */
export type NamedPicture = GivenPicture & { path: string }

/** Reads the newest `count` pictures pasted into session `session`'s chat, oldest first. */
export type PastedReader = (session: string | undefined, count: number) => Promise<PastedImage[]>

/** The pictures read from the transcript, as `epic send --images` reads them. */
async function readPasted(session: string | undefined, count: number): Promise<PastedImage[]> {
  const { Requests } = await import("spell/epic/command/Requests")
  return new Requests().pastedImages(session, count)
}

/** A picture's extension. */
const PICTURE_FILE = /^(?:png|jpe?g|gif|webp)$/

/** A picture's `src`:  its name in a `pictures/` folder, nothing above it but folders. */
const PICTURE_SRC = /(?:^|\/)pictures\/([\w.-]+\.(?:png|jpe?g|gif|webp))$/i

/** A pasted picture's `alt`. */
const PASTED_ALT = "Picture pasted in the chat"
