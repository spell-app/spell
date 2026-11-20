import { beforeAll, describe, expect, test } from "vite-plus/test"

import { parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"

/** A view whose drawing is `drawing`, inside a `<segment>`, over a list of films;  what it compiles to, and what's wrong. */
function compiled(drawing: string, path = "/Shelf.spell") {
  const contents = [
    'a "film" is a thing:',
    '\tits "title" is text',
    "\tto draw it: <text>{its title}</text>",
    'a "shelf" is a view:',
    '\tits "films" is a list of films',
    "\tto draw it:",
    // in plain Spell a `<for>` is read inside an element:  on a line of its own, a drawing says `for ...`
    "\t\t<segment>",
    drawing.replace(/^/gm, "\t"),
    "\t\t</segment>"
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

  test("page-size says how many at a time", () => {
    const { code, errors } = compiled(`\t\t<for its films paging="pages" page-size="12" />`)
    expect(errors).toEqual([])
    expect(code).toMatch(/pageSize:[^,]*12/)
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

  test("<loading> and <empty> in a body are slots too, each drawing what it holds (epic `data` T127)", () => {
    const { code, errors } = compiled(
      `\t\t<for film in its films>\n\t\t\t<text>x</text>\n\t\t\t<loading><text>Waiting</text></loading>\n\t\t\t<empty><text>None yet</text></empty>\n\t\t</for>`
    )
    expect(errors).toEqual([])
    expect(code).toContain("none: () =>")
    expect(code).toContain("waiting")
    expect(code).toContain("Waiting")
    expect(code).toContain("None yet")
  })

  test("for each stays an accepted spelling", () => {
    const { code, errors } = compiled(`\t\t<for each film in its films>\n\t\t\t<text>x</text>\n\t\t</for>`)
    expect(errors).toEqual([])
    expect(code).toContain("core.drawEach")
  })

  test("Spanish:  para, its attributes and its slots", () => {
    const contents = [
      'una "película" es una cosa:',
      '\tsu "título" es texto',
      "\tpara dibujarla: <texto>{su título}</texto>",
      'un "estante" es una vista:',
      '\tsus "películas" es una lista de películas',
      "\tpara dibujarlo:",
      "\t\t<segmento>",
      '\t\t\t<para sus películas título="Las películas" como="tarjetas" columnas="4" cargando="Buscando..." vacío ocultar-vacío />',
      "\t\t\t<para estrellas de 1 a 240>",
      "\t\t\t\t<texto>{estrella}</texto>",
      "\t\t\t</para>",
      "\t\t</segmento>"
    ].join("\n")
    const [file] = parseSpellProject([{ path: "/Estante.es.spell", contents }]).files
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

  test("<film/> beside other markup in an element is this film, in braces (epic `atmosphere` T48)", () => {
    const body = `\t\t<for its films>\n\t\t\t<button>\n\t\t\t\t<film/>\n\t\t\t\t<text>Pick</text>\n\t\t\t</button>\n\t\t</for>`
    const { code, errors } = compiled(body)
    expect(errors).toEqual([])
    expect(code).toMatch(/h\("ui-button",[^]*\(\) => core\.drawThing\(film\)/)
  })
})

describe("a <for> on a drawing's own line (epic `language` I73)", () => {
  beforeAll(registerTestComponentPack)

  /** A shelf whose drawing is `lines`, each on a line of its own. */
  function drawn(...lines: string[]) {
    const contents = [
      'a "film" is a thing:',
      '\tits "title" is text',
      "\tto draw it: <text>{its title}</text>",
      'a "shelf" is a view:',
      '\tits "films" is a list of films',
      "\tto draw it:",
      ...lines.map((line) => `\t\t${line}`)
    ].join("\n")
    const [file] = parseSpellProject([{ path: "/Shelf.spell", contents }]).files
    return { code: file!.compiled, errors: file!.errors }
  }

  test("alone, with a body:  the drawing is the loop", () => {
    const { code, errors } = drawn("<for film in its films>", "\t<text>{its title}</text>", "</for>")
    expect(errors).toEqual([])
    expect(code).toContain('return core.drawEach(this.films, (film) => h("ui-text", () => film.title))')
  })

  test("alone, drawing each itself", () => {
    const { code, errors } = drawn("<for its films />")
    expect(errors).toEqual([])
    expect(code).toContain("return core.drawEach(this.films, (film) => core.drawThing(film))")
  })

  test("with riders:  a read, as `for its films` lines are", () => {
    const { code, errors } = drawn('<for its films loading="Scanning..." />')
    expect(errors).toEqual([])
    expect(code).toContain("return core.drawRead(")
    expect(code).toContain("Scanning...")
  })

  test("returned:  the loop", () => {
    const { code, errors } = drawn("return <for its films />")
    expect(errors).toEqual([])
    expect(code).toContain("return core.drawEach(this.films, (film) => core.drawThing(film))")
  })

  test("in an if's branch:  that branch's loop", () => {
    const { code, errors } = drawn("if its films is empty", "\t<text>none</text>", "otherwise", "\t<for its films />")
    expect(errors).toEqual([])
    expect(code).toContain("else return core.drawEach(this.films, (film) => core.drawThing(film))")
  })

  test("after a line that draws nothing", () => {
    const { code, errors } = drawn("set its films to its films", "<for its films />")
    expect(errors).toEqual([])
    expect(code).toContain("return core.drawEach(this.films, (film) => core.drawThing(film))")
  })
})

describe("<for>'s attributes and slots read as the drawing does", () => {
  beforeAll(registerTestComponentPack)

  test("its, in a title or a <failed>, is the drawing's, not the item's", () => {
    const contents = [
      'a "film" is a thing:',
      '\tits "title" is text',
      "\tto draw it: <text>{its title}</text>",
      'a "shelf" is a view:',
      '\tits "films" is a list of films',
      '\tits "heading" is text',
      "\tto draw it:",
      "\t\t<segment>",
      "\t\t\t<for its films title={its heading}>",
      "\t\t\t\t<text>{its title}</text>",
      "\t\t\t\t<failed><text>{its heading}</text></failed>",
      "\t\t\t</for>",
      "\t\t</segment>"
    ].join("\n")
    const [file] = parseSpellProject([{ path: "/Shelf.spell", contents }]).files
    expect(file!.errors).toEqual([])
    expect(file!.compiled).toContain("film.title")
    expect(file!.compiled).toContain("label: () => this.heading")
    expect(file!.compiled).toContain('h("ui-text", () => this.heading)')
  })
})

describe("a <for> drawn by another loop's item follows its list", () => {
  beforeAll(registerTestComponentPack)

  /** A wall of shelves whose drawing is `lines`, each on a line of its own. */
  function drawn(...lines: string[]) {
    const contents = [
      'a "film" is a thing:',
      '\tits "title" is text',
      "\tto draw it: <text>{its title}</text>",
      'a "shelf" is a thing:',
      '\tits "films" is a list of films',
      'a "wall" is a view:',
      '\tits "shelves" is a list of shelves',
      "\tto draw it:",
      ...lines.map((line) => `\t\t${line}`)
    ].join("\n")
    const [file] = parseSpellProject([{ path: "/Wall.spell", contents }]).files
    return { code: file!.compiled, errors: file!.errors }
  }

  test("its list is read in a function, as the row's fields arrive", () => {
    const { code, errors } = drawn(
      '<for shelf in its shelves loading="Reading">',
      "\t<for film in its films>",
      "\t\t<text>{its title}</text>",
      "\t</for>",
      "</for>"
    )
    expect(errors).toEqual([])
    expect(code).toContain('core.drawRead(() => shelf.films, (film) => h("ui-text", () => film.title))')
    expect(code).not.toContain("core.drawEach(shelf.films")
  })

  test("so is one under a plain loop", () => {
    const { code, errors } = drawn("<for shelf in its shelves>", "\t<for its films />", "</for>")
    expect(errors).toEqual([])
    expect(code).toContain("core.drawRead(() => shelf.films, (film) => core.drawThing(film))")
  })
})
