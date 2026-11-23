import { For, Show } from "solid-js"
import type { JSX } from "@solidjs/web"

// Spell UI's page zoom:  its plain-DOM leaf alone, so the pack holds no second `<ui-zoom>` (as `<epic-field>`'s)
import { ImageZoom } from "spell/ui/components/ui-zoom/ImageZoom"

// the words' helpers alone:  the review barrel would bring the client
import { Pictures } from "spell/epic/review/Pictures"

/****************
 * ### `PictureWords`
 * The ONE way a component draws words the person typed with pictures in them (epic `epic-engine` P75), each picture a
 * labelled `<epic-picture>` (`IMG2`):  a comment (`<epic-thread>`), a note (`<epic-review>`'s marked note), an
 * option's note (`<epic-choices>`), the kickoff box's strip (`<epic-kickoff>`).
 * - `wordsOf()`:  the words, a paragraph per blank line, each picture where it was written
 * - `stripOf()`:  a box still being written:  its pictures alone, in a row under its field, each with its x
 * - Plain functions returning JSX, called in a component's `render()`:  no state of their own
 * - Position in the import graph:  `Pictures`' words alone, and Spell UI's zoom leaf;  `<epic-picture>` itself by its
 *   tag, which the pack defines
 ****************/
export class PictureWords {
  /**
   * `words` drawn:  a paragraph per blank line;  a single newline a line break;  `backticked` a code run (`code`);
   * a picture (`![IMG2](<path>)`) a labelled thumbnail, a click opening it full size.
   * - `paragraphClass`:  each `<p>`'s;  `code`:  backticks make code runs (a comment's words).  Default:  `false`
   */
  static wordsOf(words: string, options: WordsOptions = {}): JSX.Element {
    const blocks = words
      .trim()
      .split(/\n[ \t]*\n\s*/)
      .filter((block) => block.trim())
    return (
      <For each={blocks}>
        {(block) => (
          <p class={options.paragraphClass}>
            <For each={Pictures.piecesOf(block.trim())}>
              {(piece) =>
                typeof piece === "string"
                  ? PictureWords.textOf(piece, options.code ?? false)
                  : PictureWords.pictureOf(piece.picture, piece.label)
              }
            </For>
          </p>
        )}
      </For>
    )
  }

  /**
   * The pictures in `words`, in a row:  a box still being written draws it under its field, each picture labelled
   * and with its x, which hands `remove` its label.
   * - `words`:  read where it's drawn, so the row follows what's typed
   */
  static stripOf(words: () => string, remove: (label: string) => void): JSX.Element {
    return (
      <Show when={Pictures.picturesOf(words()).length}>
        <span class="pictures">
          <For each={Pictures.picturesOf(words())} keyed={(picture) => picture.path}>
            {(picture) => (
              <epic-picture
                label={picture().label}
                removable=""
                ref={(element: HTMLElement) =>
                  element.addEventListener("epic-picture-removed", ((event: CustomEvent<{ label: string }>) =>
                    remove(event.detail.label)) as EventListener)
                }
              >
                <img src={picture().path} alt={picture().label} onClick={PictureWords.zoom} />
              </epic-picture>
            )}
          </For>
        </span>
      </Show>
    )
  }

  /** One picture:  a labelled `<epic-picture>` around its `<img>`, a click opening it full size. */
  static pictureOf(path: string, label: string): JSX.Element {
    return (
      <epic-picture label={label}>
        <img src={path} alt={label} data-tooltip={label} onClick={PictureWords.zoom} />
      </epic-picture>
    )
  }

  /** A click on a picture:  full size, in the page's `<ui-zoom>`. */
  static zoom(event: MouseEvent): void {
    const image = event.currentTarget as HTMLImageElement | null
    if (!image || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    event.stopPropagation()
    ImageZoom.show(image)
  }

  /** Text between pictures:  its newlines line breaks, its `backticked` runs code when `code`. */
  private static textOf(text: string, code: boolean): JSX.Element {
    return (
      <For each={text.split(code ? /(`[^`]+`|\n)/ : /(\n)/)}>
        {(piece) =>
          piece === "\n" ? <br /> : code && CODE_RUN.test(piece) ? <code>{piece.slice(1, -1)}</code> : piece
        }
      </For>
    )
  }
}

/**
 * How `wordsOf()` draws:
 * - `paragraphClass`:  each `<p>`'s class
 * - `code`:  `backticked` runs are code.  Default:  `false`
 */
export type WordsOptions = { paragraphClass?: string; code?: boolean }

/** A `backticked` run. */
const CODE_RUN = /^`[^`]+`$/
