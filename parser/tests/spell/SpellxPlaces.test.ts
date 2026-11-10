import { beforeAll, describe, expect, test } from "vite-plus/test"

import { SP } from "spell/parser/spell"
import { compiledSpellProject, parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"

/** Compiled `/P.spell` holding `text`:  its code, and its errors. */
function compiled(text: string, path = "/P.spell") {
  const [file] = parseSpellProject([{ path, contents: text }]).files
  return { code: compiledSpellProject([{ path, contents: text }]).code, errors: file!.errors }
}

/**
 * A place's tag (epic `language` P40):  `<web-server "wikipedia" address="...">`, read as its plain line.
 * - One tag per kind of place, from a table in each language pack (`SP.SpellxPlaceWord`).
 */
describe("place tags", () => {
  beforeAll(registerTestComponentPack)

  /** Each tag, and the plain line it compiles the same as. */
  const PAIRS: Array<[string, string, string?]> = [
    ['<web-server "books" address="https://x.dev/v1" />', 'books is a web server at "https://x.dev/v1"'],
    ['<graphql-server "books" address="https://x.dev/q" />', 'books is a graphql server at "https://x.dev/q"'],
    ['<data-folder "books" address="books" />', 'books is a data folder at "books"'],
    ['<data-folder "books" personal address="books" />', 'books is a data folder at personal "books"'],
    ['<json-file "books" address="/api/x" />', 'books is a json file at "/api/x"'],
    ['<room "books" address="/api/rooms/x" />', 'books is a room at "/api/rooms/x"'],
    ['<sheet "books" address="./x.csv" />', 'books is a sheet at "./x.csv"'],
    ['<csv-file "books" address="./x.csv" />', 'books is a csv file at "./x.csv"'],
    ['<excel-file "books" address="x.xlsx" />', 'books is an excel file at "x.xlsx"'],
    ['<atmosphere "books" personal />', "books is a personal atmosphere account"],
    [
      '<atmosphere "books" personal address="com.x.books" />',
      'books is a personal atmosphere account at "com.x.books"'
    ],
    ['<atmosphere "books" address="did:plc:abc123" />', 'books is an atmosphere account at "did:plc:abc123"'],
    [
      '<atmosphere "books" space address="at://did:plc:a/space/b" />',
      'books is an atmosphere space at "at://did:plc:a/space/b"'
    ],
    ['<device-storage "books" />', "books is stored on this device"],
    ['<window-storage "books" />', "books is stored on this device, for each tab"],
    ['<memory-storage "books" />', "books is stored in memory"]
  ]

  const PAIRS_ES: Array<[string, string]> = [
    ['<servidor-web "libros" dirección="https://x.dev/v1" />', 'libros es un servidor web en "https://x.dev/v1"'],
    ['<carpeta-de-datos "libros" dirección="libros" />', 'libros es una carpeta de datos en "libros"'],
    [
      '<carpeta-de-datos "libros" personal dirección="libros" />',
      'libros es una carpeta de datos personal en "libros"'
    ],
    ['<archivo-json "libros" dirección="/api/x" />', 'libros es un archivo json en "/api/x"'],
    ['<sala "libros" dirección="/api/rooms/x" />', 'libros es una sala en "/api/rooms/x"'],
    ['<hoja "libros" dirección="./x.csv" />', 'libros es una hoja en "./x.csv"'],
    ['<archivo-csv "libros" dirección="./x.csv" />', 'libros es un archivo csv en "./x.csv"'],
    ['<atmosphere "libros" personal />', "libros es una cuenta personal de atmosphere"],
    [
      '<atmosphere "libros" espacio dirección="at://did:plc:a/space/b" />',
      'libros es un espacio de atmosphere en "at://did:plc:a/space/b"'
    ],
    ['<almacenamiento-del-dispositivo "libros" />', "libros se guarda en este dispositivo"],
    ['<almacenamiento-de-ventana "libros" />', "libros se guarda en este dispositivo, para cada pestaña"],
    ['<almacenamiento-en-memoria "libros" />', "libros se guarda en memoria"]
  ]

  test.each(PAIRS)("%s", (tag, plain) => {
    const fromTag = compiled(tag)
    expect(fromTag.errors).toEqual([])
    expect(fromTag.code).toBe(compiled(plain).code)
  })

  test.each(PAIRS_ES)("%s", (tag, plain) => {
    const fromTag = compiled(tag, "/P.es.spell")
    expect(fromTag.errors).toEqual([])
    expect(fromTag.code).toBe(compiled(plain, "/P.es.spell").code)
  })

  test("a tag's body is plain Spell, as its line's is", () => {
    const body = '\t- its id is its "title"\n\t- check it once a day\n'
    const tag = compiled(`<web-server "wiki" address="https://x.dev">\n${body}</web-server>\n`)
    expect(tag.errors).toEqual([])
    expect(tag.code.trim()).toBe(compiled(`wiki is a web server at "https://x.dev":\n${body}`).code.trim())
  })

  test("a tag closes with </> too, and a plain file can sit beside it", () => {
    expect(compiled('<web-server "wiki" address="https://x.dev">\n\t- check it once a day\n</>\n').errors).toEqual([])
  })

  test("a kind a library adds gets its tag by the same rule", () => {
    const kind = { path: "/A.spell", contents: "a supabase project is a place" }
    const files = (contents: string) => [kind, { path: "/P.spell", contents }]
    const tag = files('<supabase-project "books" address="https://x.dev" />\n')
    expect(parseSpellProject(tag).files[1]!.errors).toEqual([])
    expect(compiledSpellProject(tag).code).toBe(
      compiledSpellProject(files('books is a supabase project at "https://x.dev"\n')).code
    )
  })

  test("a top-level tag that's no place is still an unknown word", () => {
    expect(compiled('<web-sever "x" />').errors.join()).toMatch(/web-sever/)
  })

  test("inside a drawing, <room/> and <sheet/> are a project's own views, not places", () => {
    const view = (name: string) => `<spell-view "${name}">\n\t<draw>\n\t\t<ui-text>hi</>\n\t</>\n</spell-view>\n`
    const board = '<spell-view "board">\n\t<draw>\n\t\t<room/>\n\t\t<sheet/>\n\t</>\n</spell-view>\n'
    const { code, errors } = compiled(view("room") + view("sheet") + board)
    expect(errors).toEqual([])
    expect(code).not.toContain("core.place(")
  })

  test("`is a file at` fails, saying to write json file;  a json file compiles as a file place does", () => {
    expect(compiled('books is a file at "/api/x"').errors.join()).toMatch(/json file/)
    expect(compiled('libros es un archivo en "/api/x"', "/P.es.spell").errors.join()).toMatch(/archivo json/)
    expect(compiled('books is a json file at "/api/x"').code).toContain('kind: "file"')
  })

  test("a csv file is a sheet, by either name, in both languages", () => {
    expect(compiled('books is a csv file at "./x.csv"').code).toBe(compiled('books is a sheet at "./x.csv"').code)
    expect(compiled('libros es un archivo csv en "./x.csv"', "/P.es.spell").code).toBe(
      compiled('libros es una hoja en "./x.csv"', "/P.es.spell").code
    )
  })

  test("the old database lines still compile, as the new words do", () => {
    expect(compiled("books is a database on this device").code).toBe(compiled("books is stored on this device").code)
    expect(compiled("books is an in memory database").code).toBe(compiled("books is stored in memory").code)
  })

  test("the shape check counts a place tag:  it's in the first column", () => {
    expect(SP.formOfText('<room "x" address="/y" />', "/P.spell")).toBe("spellx")
  })
})
