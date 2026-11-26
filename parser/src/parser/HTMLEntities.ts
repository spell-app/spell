import { LoadOnce } from "spell/util"

/****************
 * ### `HTMLEntities`
 * Turns HTML's character references into their characters:  `&amp;` => `&`, `&copy;` => `©`, `&#123;` => `{`.
 * - ONE decoder for the parser's languages:  markdown's text and escapes, a drawing's JSX text.
 * - Every named one HTML knows needs its table (the `entities` package's), 16 KB brotli:
 *   it loads on first use, as a chunk of its own (`HTMLEntities.load()`), never up front
 *   (epic `solid-2-final` I64:  the editor's language worker was over its size budget).
 *   - `SP.loadGrammar()` loads it with the grammar, so every parse that waits for the grammar has it.
 *   - The language worker waits for it before its first message;  the page's markdown loads it with `MD`.
 *   - Node programs and tests load it up front:  `import "spell/parser/parser/htmlEntitiesUpFront"`
 *     (`spell/parser/spell/languages/all` does).
 * - Until it's in, `decode()` still knows numeric references and the six names text uses most (`&amp;`, `&lt;`,
 *   `&gt;`, `&quot;`, `&apos;`, `&nbsp;`);  any other name stays as it is, and the table starts loading.
 * - STATIC:  one table per program.
 * - Strict, as HTML's attributes read them:  a reference needs its `;`;  an unknown one stays as it is.
 ****************/
export class HTMLEntities {
  /**
   * `text` with each character reference decoded;  an unknown one stays as it is.
   * - Before the table is in:  see the class docstring.
   * - NEVER throws
   */
  static decode(text: string): string {
    if (!text.includes("&")) return text
    if (decodeWithTable) return decodeWithTable(text)
    return HTMLEntities.decodeBasic(text)
  }

  /**
   * `text` decoded with no table:  what `decode()` does until the table is in.
   * - Numeric references, and the six names in `BASIC_NAMES`;  any other name stays as it is, and the table starts
   *   loading (`load()`).
   * - NEVER throws
   */
  static decodeBasic(text: string): string {
    return text.replace(REFERENCE, (reference, name: string) => {
      if (name[0] === "#")
        return fromCodePoint(name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : +name.slice(1))
      const known = BASIC_NAMES[name]
      if (known !== undefined) return known
      void HTMLEntities.load().catch((error: unknown) => console.error("couldn't load HTML's entities", error))
      return reference
    })
  }

  /**
   * Load the whole table, once:  a chunk of its own in a browser.
   * - Every caller gets the same load (`LoadOnce`);  once it's in, it costs nothing.
   * - throws what the import threw:  a page that can't fetch its chunk
   */
  static async load(): Promise<void> {
    if (decodeWithTable) return
    await tableLoads.get("html", async () => {
      HTMLEntities.install((await import("entities/decode")).decodeHTMLStrict)
    })
  }

  /** Use `decode`, the `entities` package's `decodeHTMLStrict()`, from now on:  `htmlEntitiesUpFront`'s, or `load()`'s. */
  static install(decode: (text: string) => string): void {
    decodeWithTable = decode
  }
}

/** The whole table's decoder, once it's in. */
let decodeWithTable: ((text: string) => string) | undefined

/** The one load of the table's chunk. */
const tableLoads = new LoadOnce<string, void>()

/** A character reference, with its `;`:  `&amp;`, `&#35;`, `&#x22;`;  its name or number is group 1. */
const REFERENCE = /&(#[xX][0-9a-fA-F]+|#[0-9]+|[A-Za-z][A-Za-z0-9]*);/g

/** The names `decode()` knows before the table is in. */
const BASIC_NAMES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " }

/** What HTML reads code points 0x80-0x9f as (windows-1252), and 0:  as the table's decoder does. */
// oxfmt-ignore
const REPLACED_CODE_POINTS = new Map([
  [0, 0xfffd], [0x80, 0x20ac], [0x82, 0x201a], [0x83, 0x192], [0x84, 0x201e], [0x85, 0x2026], [0x86, 0x2020],
  [0x87, 0x2021], [0x88, 0x2c6], [0x89, 0x2030], [0x8a, 0x160], [0x8b, 0x2039], [0x8c, 0x152], [0x8e, 0x17d],
  [0x91, 0x2018], [0x92, 0x2019], [0x93, 0x201c], [0x94, 0x201d], [0x95, 0x2022], [0x96, 0x2013], [0x97, 0x2014],
  [0x98, 0x2dc], [0x99, 0x2122], [0x9a, 0x161], [0x9b, 0x203a], [0x9c, 0x153], [0x9e, 0x17e], [0x9f, 0x178]
])

/** The character for numeric reference `codePoint`:  a surrogate or one past Unicode's last is U+FFFD. */
function fromCodePoint(codePoint: number): string {
  if ((codePoint >= 0xd800 && codePoint <= 0xdfff) || codePoint > 0x10ffff) return "�"
  return String.fromCodePoint(REPLACED_CODE_POINTS.get(codePoint) ?? codePoint)
}
