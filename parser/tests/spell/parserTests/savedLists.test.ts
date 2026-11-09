/**
 * Adding to and removing from a place's things, by the list a program names (epic `data` I61, I64):
 * - `the saved todos`:  every saved todo, whatever the program calls its own properties
 * - a warning where an add or remove only changes what a property read, and saves nothing
 * - a loop over a read, removing as it goes, reaches every one
 */
import { enableExternalSource, flush } from "solid-js"
import { beforeAll, beforeEach, describe, expect, it } from "vite-plus/test"

import { bridgeSolid } from "spell/util"

import { core } from "spell/parser/core"
import { parseSpellProject, runSpellFiles } from "spell/parser/spell/test"

/** A program's one file, compiled. */
function compiled(path: string, ...lines: string[]) {
  return parseSpellProject([{ path, contents: `${lines.join("\n")}\n` }]).files[0]!
}

/** Lets a write through, and an answer back. */
const settled = () => new Promise((resolve) => setTimeout(resolve, 60))

const TODOS = `todo list is an in memory database
a todo is a thing:
	- it is saved in the todo list
	- its "title" is text
	- its "user" is a number`

/** A page of one person's todos:  its own read called `todos`, as the type's plural is. */
const PAGE = (...action: string[]) => [
  TODOS,
  "",
  "my todos is an app:",
  '\t- its "todos" is every todo where its user is 1',
  '\t- its "new todo" is a todo',
  "\t- to go:",
  ...action.map((line) => `\t\t${line}`)
]

const SAVES = "core.saveThing(this.newTodo)"
const WARNING = "This adds only to what was read, and saves nothing:  to save it, add it to the saved todos"

describe("I61:  the saved todos, and a warning on a write to a read", () => {
  it("`the saved todos` saves, even with a property called `todos`", () => {
    const made = compiled("/Test.spell", ...PAGE("add its new todo to the saved todos"))
    expect(made.errors).toEqual([])
    expect(made.compiled).toContain(SAVES)
    expect(made.warnings).toEqual([])
    const removed = compiled("/Test.spell", ...PAGE("remove its new todo from the saved todos"))
    expect(removed.errors).toEqual([])
    expect(removed.compiled).toContain("core.removeSaved(this.newTodo)")
  })

  it("`the saved piles`, of a type no place saves, won't compile", () => {
    const made = compiled("/Test.spell", "a pile is a thing", "set x to the saved piles")
    expect(made.errors.join()).toContain('No place saves piles:  for every pile the program has, write "the piles"')
  })

  it("an add to the property, or to `its own todos`, warns;  a save doesn't", () => {
    for (const line of [
      "add its new todo to the todos",
      "add its new todo to its todos",
      "append its new todo to its todos"
    ]) {
      const made = compiled("/Test.spell", ...PAGE(line))
      expect(made.errors).toEqual([])
      expect(made.compiled).toContain("core.append(")
      expect(made.warnings.join()).toContain(WARNING)
    }
    const removed = compiled("/Test.spell", ...PAGE("remove its new todo from its todos"))
    expect(removed.warnings.join()).toContain(
      "This removes only from what was read, and nothing leaves the place:  to remove it there, remove it from the saved todos"
    )
    expect(compiled("/Test.spell", ...PAGE("add its new todo to every todo")).warnings).toEqual([])
  })

  it("the property below the action warns too", () => {
    const lines = PAGE("add its new todo to its todos")
    const [property] = lines.splice(4, 1)
    lines.push(property!)
    expect(compiled("/Test.spell", ...lines).warnings.join()).toContain(WARNING)
  })

  it("in Spanish:  `las tareas guardadas`, and the warning names them", () => {
    const PAGINA = (line: string) => [
      "lista de tareas es una base de datos en memoria",
      "una tarea es una cosa:",
      "\t- se guarda en la lista de tareas",
      '\t- su "título" es texto',
      '\t- su "usuario" es un número',
      "",
      "mis tareas es una aplicación:",
      '\t- sus "tareas" es cada tarea donde su usuario es 1',
      '\t- su "nueva tarea" es una tarea',
      "\t- para seguir:",
      `\t\t${line}`
    ]
    const saved = compiled("/Test.es.spell", ...PAGINA("añadir su nueva tarea a las tareas guardadas"))
    expect(saved.errors).toEqual([])
    expect(saved.compiled).toContain("core.saveThing(this.nuevaTarea)")
    expect(saved.warnings).toEqual([])
    const own = compiled("/Test.es.spell", ...PAGINA("añadir su nueva tarea a sus tareas"))
    expect(own.errors).toEqual([])
    expect(own.warnings.join()).toContain(
      "Esto añade solo a lo que se leyó, y no guarda nada:  para guardarlo, añádelo a las tareas guardadas"
    )
  })
})

describe("I64:  a loop removing what it reads reaches every one", () => {
  beforeAll(() => bridgeSolid({ enableExternalSource, flush }))
  beforeEach(() => core.resetRuntime())

  const BOX = `${TODOS}

my todos is an app:
	- its "all of them" is every todo
	- to add three:
		add (a new todo with title = "a", user = 1) to the todos
		add (a new todo with title = "b", user = 1) to the todos
		add (a new todo with title = "c", user = 1) to the todos
		add (a new todo with title = "d", user = 2) to the todos
	- to clear the first:
		for one in every todo where its user is 1:
			remove one from the todos
`

  it("compiles to a loop round a copy", () => {
    expect(compiled("/Test.spell", BOX).compiled).toContain(
      "core.duplicateList(await core.savedThings(Todo, { filter: { user: 1 } }))"
    )
  })

  it("three match, all three removed", async () => {
    const run = runSpellFiles([{ path: "/Test.spell", contents: BOX }], { registered: true })
    const { my_todos: page } = run("my_todos") as { my_todos: any }
    await page.addThree()
    await settled()
    await page.clearTheFirst()
    await settled()
    await core.reloadSaved()
    const left = (await core.answerOf(page, "allOfThem")) as { items: Array<{ title: string }> }
    expect(left.items.map(({ title }) => title)).toEqual(["d"])
  })
})
