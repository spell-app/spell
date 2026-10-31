import { describe, expect, test } from "vite-plus/test"

import { csvLinesIn, csvLineText } from "spell/util/places/csv"
import { CsvFile, rowsInCommon } from "spell/util/places/CsvFile"
import type { PlaceRow } from "spell/util/places/places.types"

/** A file with what real ones have:  commas, quotes, a line end in a cell, a quote nobody needed, a column nobody knows. */
const AWKWARD = `id,title,servings,notes,shelf
r-1,Tomato soup,4,"Roast first, then blend.",top
r-2,"Dal",6,Temper last.,top
r-3,Tacos,4,"Pineapple.
Warm them.",low
r-4,Pizza,2,"A ""very hot"" oven.",low
`

/** The file `text`, with ids in `id`. */
const withIds = (text: string) => new CsvFile(text, { name: "recipes", idColumn: "id", numbers: ["servings"] })

/** The file `text`, with nothing saying which row is which. */
const withoutIds = (text: string) => new CsvFile(text, { name: "recipes" })

/** `csv`'s rows, with each change made by `edit`. */
function savedWith(csv: CsvFile, edit: (rows: PlaceRow[]) => PlaceRow[]) {
  return csv.saved(edit(csv.rows.map((row) => ({ ...row }))))
}

/** The lines of `after` that aren't in `before`, and those of `before` that aren't in `after`, each the way a diff shows them. */
function lineDiff(before: string, after: string) {
  const beforeLines = before.split(/(?<=\n)/)
  const afterLines = after.split(/(?<=\n)/)
  return {
    gone: beforeLines.filter((line) => !afterLines.includes(line)),
    added: afterLines.filter((line) => !beforeLines.includes(line))
  }
}

/** Row `id` moved to the end. */
const toEnd = (id: string) => (rows: PlaceRow[]) => [
  ...rows.filter((row) => row.id !== id),
  rows.find((row) => row.id === id)!
]

describe("csvLinesIn()", () => {
  test.each([
    ["plain", "a,b\n1,2\n"],
    ["no last line end", "a,b\n1,2"],
    ["CRLF", "a,b\r\n1,2\r\n"],
    ["lone CR", "a,b\r1,2\r"],
    ["mixed ends and blank lines", "a,b\n\n1,2\r\n\r\n3,4\n\n"],
    ["quotes kept", '"a","b"\n"1",2\n'],
    ["a line end and a comma inside quotes", '"a\r\nb","c,d"\n'],
    ["text after a closing quote", '"a"b,c\n'],
    ["a comma at the very end", "a,"],
    ["empty cells", ",b,\n,,\n"]
  ])("%s:  put back together, it's the same text, byte for byte", (_name, text) => {
    const text2 = csvLinesIn(text)
      .lines.map((line) => csvLineText(line) + line.ending)
      .join("")
    expect(text2).toBe(text)
  })

  test("a byte order mark is its own piece", () => {
    expect(csvLinesIn("﻿a\n").byteOrderMark).toBe("﻿")
    expect(csvLinesIn("﻿a\n").lines[0]!.cells[0]!.value).toBe("a")
  })
})

describe("CsvFile.saved():  only the lines that changed", () => {
  test("nothing changed:  the same text, byte for byte", () => {
    for (const text of [AWKWARD, AWKWARD.replaceAll("\n", "\r\n"), `﻿${AWKWARD}`, AWKWARD.trimEnd(), `${AWKWARD}\n\n`]) {
      expect(savedWith(withIds(text), (rows) => rows).text).toBe(text)
    }
  })

  test("adding a row:  one new line, at the end", () => {
    const save = savedWith(withIds(AWKWARD), (rows) => [...rows, { id: "r-5", title: "Toast", servings: 1 }])
    expect(save.text).toBe(`${AWKWARD}r-5,Toast,1,,\n`)
    expect(save.added).toEqual(["r-5"])
    expect(save).toMatchObject({ moved: [], edited: [], removed: [] })
  })

  test("adding a row in the middle:  right after the one above it", () => {
    const save = savedWith(withIds(AWKWARD), (rows) => [rows[0]!, { id: "r-9", title: "New" }, ...rows.slice(1)])
    expect(lineDiff(AWKWARD, save.text)).toEqual({ gone: [], added: ["r-9,New,,,\n"] })
    expect(save.text.indexOf("r-9")).toBeLessThan(save.text.indexOf("r-2"))
  })

  test("removing a row:  its one line gone, a line end inside it too", () => {
    const save = savedWith(withIds(AWKWARD), (rows) => rows.filter((row) => row.id !== "r-3"))
    expect(save.text).toBe(AWKWARD.replace('r-3,Tacos,4,"Pineapple.\nWarm them.",low\n', ""))
    expect(save.removed).toEqual(["r-3"])
  })

  test("moving a row:  it's the only one that counts as moved, and its bytes come along", () => {
    const save = savedWith(withIds(AWKWARD), toEnd("r-2"))
    expect(save.moved).toEqual(["r-2"])
    expect(save.text).toBe(AWKWARD.replace('r-2,"Dal",6,Temper last.,top\n', "") + 'r-2,"Dal",6,Temper last.,top\n')
  })

  test("moving a row up finds the fewest moves:  the others stay", () => {
    const save = savedWith(withIds(AWKWARD), (rows) => [rows[3]!, ...rows.slice(0, 3)])
    expect(save.moved).toEqual(["r-4"])
  })

  test("editing a cell:  one line changes, and only that cell in it", () => {
    const save = savedWith(withIds(AWKWARD), (rows) =>
      rows.map((row) => (row.id === "r-1" ? { ...row, servings: 8 } : row))
    )
    expect(save.text).toBe(AWKWARD.replace("r-1,Tomato soup,4,", "r-1,Tomato soup,8,"))
    expect(save.edited).toEqual(["r-1"])
  })

  test("an edit and a move at once are both understood, with an id", () => {
    const save = savedWith(withIds(AWKWARD), (rows) =>
      toEnd("r-1")(rows).map((row) => (row.id === "r-1" ? { ...row, servings: 9 } : row))
    )
    expect(save).toMatchObject({ moved: ["r-1"], edited: ["r-1"], added: [], removed: [] })
    expect(save.text.trimEnd().endsWith('r-1,Tomato soup,9,"Roast first, then blend.",top')).toBe(true)
  })

  test("a cell quoted with no need keeps its quotes when it changes;  the others on the line stay as they were", () => {
    const save = savedWith(withIds(AWKWARD), (rows) =>
      rows.map((row) => (row.id === "r-2" ? { ...row, title: "Dal 2" } : row))
    )
    expect(save.text).toContain('r-2,"Dal 2",6,Temper last.,top\n')
  })

  test("a new value with a comma, a quote or a line end gets quotes;  it reads back", () => {
    const title = 'One, "two"\nthree\r\nfour'
    const save = savedWith(withIds(AWKWARD), (rows) => rows.map((row) => (row.id === "r-1" ? { ...row, title } : row)))
    expect(save.text).toContain('r-1,"One, ""two""\nthree\r\nfour",4,')
    expect(withIds(save.text).rows[0]!.title).toBe(title)
    expect(lineDiff(AWKWARD, save.text).gone).toEqual(['r-1,Tomato soup,4,"Roast first, then blend.",top\n'])
  })

  test("a file with every cell quoted gets a new row quoted the same", () => {
    const text = '"id","title"\n"r-1","Soup"\n"r-2","Dal"\n'
    expect(savedWith(withIds(text), (rows) => [...rows, { id: "r-3", title: "Toast" }]).text).toBe(
      `${text}"r-3","Toast"\n`
    )
  })

  test("CRLF stays, and a new line takes it", () => {
    const text = AWKWARD.replaceAll("\n", "\r\n")
    const save = savedWith(withIds(text), (rows) => [
      ...rows.map((row) => (row.id === "r-1" ? { ...row, servings: 8 } : row)),
      { id: "r-5", title: "Toast" }
    ])
    expect(save.text).toBe(`${text.replace("Tomato soup,4", "Tomato soup,8")}r-5,Toast,,,\r\n`)
  })

  test("mixed line ends each stay as they were", () => {
    const text = "id,title\r\nr-1,Soup\nr-2,Dal\r\n"
    expect(savedWith(withIds(text), (rows) => rows.map((row) => ({ ...row }))).text).toBe(text)
    expect(savedWith(withIds(text), (rows) => rows.filter((row) => row.id !== "r-1")).text).toBe(
      "id,title\r\nr-2,Dal\r\n"
    )
  })

  test("no line end on the last line:  still none, and the row that was last gets one", () => {
    const text = "id,title\nr-1,Soup\nr-2,Dal"
    expect(savedWith(withIds(text), (rows) => [...rows, { id: "r-3", title: "Toast" }]).text).toBe(
      "id,title\nr-1,Soup\nr-2,Dal\nr-3,Toast"
    )
    expect(savedWith(withIds(text), toEnd("r-1")).text).toBe("id,title\nr-2,Dal\nr-1,Soup")
    expect(savedWith(withIds(text), (rows) => rows.slice(0, 1)).text).toBe("id,title\nr-1,Soup")
  })

  test("a byte order mark stays", () => {
    const save = savedWith(withIds(`﻿${AWKWARD}`), (rows) => [...rows, { id: "r-5" }])
    expect(save.text.startsWith("﻿id,title")).toBe(true)
    expect(save.text.match(/﻿/g)).toHaveLength(1)
  })

  test("a column the program doesn't know stays:  a row it leaves out of keeps its cell", () => {
    const { shelf: _shelf, ...withoutShelf } = withIds(AWKWARD).rows[0]!
    const save = withIds(AWKWARD).saved([{ ...withoutShelf, servings: 8 }, ...withIds(AWKWARD).rows.slice(1)])
    expect(save.text).toContain('r-1,Tomato soup,8,"Roast first, then blend.",top\n')
  })

  test("cells past the last column, and a short line, stay until a change needs them", () => {
    const text = "id,title,notes\nr-1,Soup,x,past the end\nr-2,Dal\n"
    const save = savedWith(withIds(text), (rows) =>
      rows.map((row) => (row.id === "r-2" ? { ...row, notes: "n" } : { ...row, title: "S" }))
    )
    expect(save.text).toBe("id,title,notes\nr-1,S,x,past the end\nr-2,Dal,n\n")
    expect(savedWith(withIds(text), (rows) => rows).text).toBe(text)
  })

  test("a number written another way isn't an edit", () => {
    const text = "id,servings\nr-1,4.0\n"
    expect(savedWith(withIds(text), (rows) => rows).text).toBe(text)
    expect(withIds(text).saved([{ id: "r-1", servings: 4 }]).text).toBe(text)
  })

  test("blank lines stay where they are, with the row above them", () => {
    const text = "id,title\n\nr-1,Soup\n\nr-2,Dal\nr-3,Toast\n\n"
    const save = savedWith(withIds(text), (rows) => [...rows, { id: "r-4", title: "New" }])
    expect(save.text).toBe("id,title\n\nr-1,Soup\n\nr-2,Dal\nr-3,Toast\nr-4,New\n\n")
    expect(savedWith(withIds(text), (rows) => rows.slice(1)).text).toBe("id,title\n\n\nr-2,Dal\nr-3,Toast\n\n")
  })

  test("a line of nothing but commas stays, and isn't a row", () => {
    const text = "id,title\nr-1,Soup\n,\nr-2,Dal\n"
    expect(withIds(text).rows).toHaveLength(2)
    expect(savedWith(withIds(text), (rows) => rows.reverse()).text).toBe("id,title\nr-2,Dal\nr-1,Soup\n,\n")
  })

  test("an empty file takes its columns from the first row", () => {
    expect(withIds("").saved([{ id: "r-1", title: "A, b" }]).text).toBe('id,title\nr-1,"A, b"\n')
    expect(withIds("").saved([]).text).toBe("")
    expect(withoutIds("﻿").saved([{ a: "1" }]).text).toBe("﻿a\n1\n")
  })

  test("a field it has no column for is refused, and says which:  a new column would change every line", () => {
    expect(() => withIds(AWKWARD).saved([{ id: "r-1", rating: 5 }])).toThrow(/no column "rating"/)
  })

  test("a row with a blank or repeated id is unclear, and refuses", () => {
    for (const text of ["id,title\nr-1,A\nr-1,B\n", "id,title\n,A\n"]) {
      expect(withIds(text).whyUnclear).toMatch(/blank or repeated id/)
      expect(() => withIds(text).saved([])).toThrow(/blank or repeated id/)
    }
  })

  test("a row with no id handed in says so", () => {
    expect(() => withIds(AWKWARD).saved([{ title: "No id" }])).toThrow(TypeError)
  })
})

describe("CsvFile.saved(), with no id column:  rows match by their whole text", () => {
  const PLAIN = "title,servings\nSoup,4\nDal,6\nTacos,4\nPizza,2\n"

  test("added and moved rows are found, and the others stay", () => {
    const save = savedWith(withoutIds(PLAIN), (rows) => [
      rows[1]!,
      rows[2]!,
      rows[3]!,
      rows[0]!,
      { title: "Toast", servings: "1" }
    ])
    expect(save).toMatchObject({ moved: ["Soup,4"], added: ["Toast,1"], removed: [], edited: [] })
    expect(save.text).toBe("title,servings\nDal,6\nTacos,4\nPizza,2\nSoup,4\nToast,1\n")
  })

  test("an edited row reads as one gone and one new", () => {
    const save = savedWith(withoutIds(PLAIN), (rows) =>
      rows.map((row) => (row.title === "Dal" ? { ...row, servings: "8" } : row))
    )
    expect(save).toMatchObject({ added: ["Dal,8"], removed: ["Dal,6"], edited: [], moved: [] })
    expect(save.text).toBe(PLAIN.replace("Dal,6", "Dal,8"))
  })

  test("two rows the same stay two:  one removed leaves the other", () => {
    const text = "a\nx\ny\nx\n"
    const save = savedWith(withoutIds(text), (rows) => rows.slice(0, 2))
    expect(save.text).toBe("a\nx\ny\n")
    expect(save.removed).toEqual(["x"])
  })

  test("a row's quoting comes along when it moves", () => {
    const text = 'a,b\n"1",2\n3,4\n'
    expect(savedWith(withoutIds(text), (rows) => rows.reverse()).text).toBe('a,b\n3,4\n"1",2\n')
  })
})

describe("rowsInCommon():  a longest common subsequence", () => {
  /** The length of the longest one, the slow way anyone can check. */
  function slowLength(one: readonly string[], other: readonly string[]): number {
    const lengths = Array.from({ length: one.length + 1 }, () => new Array<number>(other.length + 1).fill(0))
    for (let i = one.length - 1; i >= 0; i--) {
      for (let j = other.length - 1; j >= 0; j--) {
        lengths[i]![j] =
          one[i] === other[j] ? lengths[i + 1]![j + 1]! + 1 : Math.max(lengths[i + 1]![j]!, lengths[i]![j + 1]!)
      }
    }
    return lengths[0]![0]!
  }

  test("as long as the slow way, in order in both, the same key at each pair, on many small lists", () => {
    let seed = 7
    const next = (below: number) => (seed = (seed * 48271) % 2147483647) % below
    for (let round = 0; round < 500; round++) {
      const keys = (size: number) => Array.from({ length: next(size) }, () => "abcdef"[next(6)]!)
      const [one, other] = [keys(12), keys(12)]
      const pairs = [...rowsInCommon(one, other)].sort(([a], [b]) => a - b)
      expect(pairs).toHaveLength(slowLength(one, other))
      pairs.forEach(([newAt, oldAt], at) => {
        expect(other[newAt]).toBe(one[oldAt])
        if (at) expect(oldAt).toBeGreaterThan(pairs[at - 1]![1])
      })
    }
  })

  test("ten thousand rows, one moved:  everything else stays, at once", () => {
    const old = Array.from({ length: 10_000 }, (_, at) => `r-${at}`)
    const now = [old[5000]!, ...old.slice(0, 5000), ...old.slice(5001)]
    expect(rowsInCommon(old, now).size).toBe(9_999)
  })
})
