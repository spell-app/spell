import { beforeAll, describe, expect, test } from "vite-plus/test"

import { parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"

/** A `.spellml` view whose drawing is `drawing`, over a list of films;  what it compiles to, and what's wrong. */
function compiled(drawing: string, path = "/Shelf.spellml") {
  const contents = [
    '<spell-thing "film">',
    "\t<spell>",
    '\t\t- its "title" is text',
    "\t</spell>",
    "\t<draw><text>{its title}</text></draw>",
    "</spell-thing>",
    '<spell-view "shelf">',
    "\t<spell>",
    '\t\t- its "films" is a list of films',
    "\t</spell>",
    "\t<draw>",
    drawing,
    "\t</draw>",
    "</spell-view>"
  ].join("\n")
  const [file] = parseSpellProject([{ path, contents }]).files
  return { code: file!.compiled, errors: file!.errors }
}

describe("<for>", () => {
  beforeAll(registerTestComponentPack)

  test("a plain <for film in films>:  a plain loop", () => {
    const { code, errors } = compiled(`\t\t<for film in its films>\n\t\t\t<text>{its title}</text>\n\t\t</for>`)
    expect(errors).toEqual([])
    expect(code).toContain("drawEach")
  })

  test("for its films names its item", () => {
    const { code, errors } = compiled(`\t\t<for its films>\n\t\t\t<text>{the title of film}</text>\n\t\t</for>`)
    expect(errors).toEqual([])
    expect(code).toContain("(film)")
  })

  test("<for its films /> draws each itself", () => {
    const { code, errors } = compiled(`\t\t<for its films />`)
    expect(errors).toEqual([])
    expect(code).toContain("core.drawThing(film)")
  })

  test("attributes become riders", () => {
    const { code, errors } = compiled(
      `\t\t<for its films title="The Films" as="cards" columns="4" doubling loading="Scanning..." empty="None" paging="pages" failed="Lost" />`
    )
    expect(errors).toEqual([])
    expect(code).toContain("core.drawRead")
    expect(code).toContain('"The Films"')
    expect(code).toContain('columns: "4"')
    expect(code).toContain("Scanning...")
  })

  test("loading={no}", () => {
    const { code, errors } = compiled(`\t\t<for its films loading={no} />`)
    expect(errors).toEqual([])
    expect(code).toContain("waiting")
  })

  test("a flag first is an error", () => {
    const { errors } = compiled(`\t\t<for its films as="cards" />\n\t\t<for films doubling as="cards" />`)
    expect(JSON.stringify(errors)).toContain("doubling")
  })

  test("a table takes cells", () => {
    const { code, errors } = compiled(
      `\t\t<for its films as="table" celled>\n\t\t\t<cell "Name">{its title}</cell>\n\t\t</for>`
    )
    expect(errors).toEqual([])
    expect(code).toContain('"data-column"')
    expect(JSON.stringify(compiled(`\t\t<for its films as="table" />`).errors)).toContain("columns")
  })

  test("for stars from 1 to 240", () => {
    const { code, errors } = compiled(`\t\t<for stars from 1 to 240>\n\t\t\t<text>{star}</text>\n\t\t</for>`)
    expect(errors).toEqual([])
    expect(code).toContain("(star)")
  })

  test("a bare empty after is stays in the phrase;  an = with spaces too", () => {
    const words = compiled(`\t\t<for its films>\n\t\t\t<if its title is empty><text>x</text></>\n\t\t</for>`)
    expect(words.errors).toEqual([])
    const { errors } = compiled(`\t\t<for film in its films where it is empty />`)
    expect(JSON.stringify(errors)).not.toContain("attributes of")
    expect(JSON.stringify(errors)).not.toContain("hide")
  })

  test("<failed> in a body is what shows when it fails;  each draws as its body says", () => {
    const { code, errors } = compiled(
      `\t\t<for film in its films>\n\t\t\t<text>x</text>\n\t\t\t<failed><text>Lost</text></failed>\n\t\t</for>`
    )
    expect(errors).toEqual([])
    expect(code).toContain("failed: () =>")
  })

  test("for each stays an accepted spelling", () => {
    const { code, errors } = compiled(`\t\t<for each film in its films>\n\t\t\t<text>x</text>\n\t\t</for>`)
    expect(errors).toEqual([])
    expect(code).toContain("core.drawEach")
  })

  test("Spanish:  para, its attributes and its slots", () => {
    const contents = [
      '<encanto-cosa "película">',
      "\t<encanto>",
      '\t\t- su "título" es texto',
      "\t</encanto>",
      "\t<dibujar><texto>{su título}</texto></dibujar>",
      "</encanto-cosa>",
      '<encanto-vista "estante">',
      "\t<encanto>",
      '\t\t- sus "películas" es una lista de películas',
      "\t</encanto>",
      "\t<dibujar>",
      '\t\t<para sus películas título="Las películas" como="tarjetas" columnas="4" cargando="Buscando..." vacío ocultar-vacío />',
      "\t\t<para estrellas de 1 a 240>",
      "\t\t\t<texto>{estrella}</texto>",
      "\t\t</para>",
      "\t</dibujar>",
      "</encanto-vista>"
    ].join("\n")
    const [file] = parseSpellProject([{ path: "/Estante.es.spellml", contents }]).files
    expect(file!.errors).toEqual([])
    expect(file!.compiled).toContain("core.drawRead")
    expect(file!.compiled).toContain("es-tarjetas")
    expect(file!.compiled).toContain("(estrella)")
  })

  test("<film/> in a loop of films is this film", () => {
    const { code, errors } = compiled(`\t\t<for its films>\n\t\t\t<film/>\n\t\t</for>`)
    expect(errors).toEqual([])
    expect(code).toContain("core.drawThing(film)")
  })
})
