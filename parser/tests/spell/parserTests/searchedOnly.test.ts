/**
 * A collection a web server gives only to a search, and a field holding a picture's id on another server (epic `data` P29):
 * Open Library's books, `books are searched at "/search.json"`, and their covers,
 * `a book's "cover i" is a picture at "https://covers.openlibrary.org/b/id/{id}-M.jpg"`.
 */
import { describe, expect, test } from "vite-plus/test"

import { parseSpellProject } from "spell/parser/spell/test"

const HOST = "https://library.test"
const COVERS = "https://covers.library.test/b/id/{id}-M.jpg"

/** A project of these lines:  its one file's errors and compiled code. */
function compiled(lines: readonly string[], path = "/L.spell") {
  return parseSpellProject([{ path, contents: `${lines.join("\n")}\n` }]).files[0]!
}

const LIBRARY = [
  `open library is a web server at "${HOST}":`,
  `\t- its rows are its "docs"`,
  `\t- it searches titles with "q"`,
  `\t- books are searched at "/search.json"`,
  `\t- a book's "cover i" is a picture at "${COVERS}"`,
  `a "book" is a thing:`,
  `\t- it lives in open library`,
  `\t- its "title" is text`,
  `\t- its "cover i" is text`
]

describe("a collection given only to a search", () => {
  test("its line says so, and where its pictures are", () => {
    const { errors, compiled: code } = compiled([...LIBRARY, `set found to every book where its title includes "dune"`])
    expect(errors).toEqual([])
    expect(code).toContain(`at: "/search.json",`)
    expect(code).toContain(`searchedOnly: true,`)
    expect(code).toContain(`pictures: { coverI: "${COVERS}" }`)
    expect(code).toContain(`search: { title: "dune" }`)
  })

  test("every one of them is refused, saying how to search", () => {
    const every = compiled([...LIBRARY, `set found to every book`])
    expect(every.errors.join("\n")).toMatch(
      /books are only found by a search, with no list of them all:  search them, "every book where its title includes \.\.\."/
    )
    expect(compiled([...LIBRARY, `set found to the books`]).errors.join("\n")).toMatch(/only found by a search/)
  })

  test("a where that searches nothing is refused too", () => {
    const { errors } = compiled([...LIBRARY, `set found to every book where its cover i is "x"`])
    expect(errors.join("\n")).toMatch(/books are only found by a search/)
  })

  test("the same in Spanish", () => {
    const lines = [
      `biblioteca es un servidor web en "${HOST}":`,
      `\t- sus filas están en "docs"`,
      `\t- busca títulos con "q"`,
      `\t- los libros se buscan en "/search.json"`,
      `\t- el "portada" de un libro es una imagen en "${COVERS}"`,
      `un "libro" es una cosa:`,
      `\t- vive en biblioteca`,
      `\t- su "título" es texto`,
      `\t- su "portada" es texto`,
      `poner libros a cada libro`
    ]
    const { errors, compiled: code } = compiled(lines, "/L.es.spell")
    expect(code).toContain(`searchedOnly: true`)
    expect(code).toContain(`pictures: { portada: "${COVERS}" }`)
    expect(errors.join("\n")).toMatch(/solo se encuentran buscándolas/)
  })
})
