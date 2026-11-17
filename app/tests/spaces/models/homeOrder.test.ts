import { existsSync, readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import JSON5 from "json5"
import { describe, expect, test } from "vite-plus/test"

import { SPACES } from "spell/app/spaces"

/** The home page's order of cards (epic `mockup` P19):  `SPACES.inHomeOrder()`, and the list it reads. */
describe("the home page's order", () => {
  const projects = [
    "@spell/examples/calculator",
    "@spell/examples/zebra",
    "@spell/examples/fizzbuzz",
    "@spell/examples/apple"
  ].map((path) => ({ path }))
  const order = { "@spell/examples": ["fizzbuzz", "calculator"] }

  test("the listed ones in the list's order, then the rest by name:  a new project goes to the end", () => {
    expect(SPACES.inHomeOrder("@spell/examples", projects, order).map((each) => each.path)).toEqual([
      "@spell/examples/fizzbuzz",
      "@spell/examples/calculator",
      "@spell/examples/apple",
      "@spell/examples/zebra"
    ])
  })

  test("a group the list doesn't name:  by name;  the projects given are left as they were", () => {
    expect(SPACES.inHomeOrder("@spell/guides", projects, order).map(({ path }) => SPACES.folderNameOf(path))).toEqual([
      "apple",
      "calculator",
      "fizzbuzz",
      "zebra"
    ])
    expect(projects[0]!.path).toBe("@spell/examples/calculator")
  })

  test("the saved list names only projects that are there, each once", () => {
    for (const [group, names] of Object.entries(SPACES.HOME_ORDER)) {
      if (group === SPACES.HOME_SECTIONS_KEY || group === SPACES.HOME_HIDDEN_KEY) continue
      const folders = readdirSync(resolve(import.meta.dirname, "../../../spaces", group))
      for (const name of names) expect(folders, `${group}'s ${name}`).toContain(name)
      expect(new Set(names).size).toBe(names.length)
    }
  })
})

/** The home page's sections, in order (epic `repo-split` P28):  `SPACES.homeSections()`. */
describe("the home page's sections", () => {
  test("Spell's own org:  the saved list as it is, every section in it but those it hides", () => {
    const hidden = SPACES.HOME_ORDER[SPACES.HOME_HIDDEN_KEY] ?? []
    const saved = SPACES.HOME_ORDER[SPACES.HOME_SECTIONS_KEY]!
    expect(SPACES.homeSections(false)).toEqual(saved.filter((section) => !hidden.includes(section)))
    expect([...SPACES.homeSections(false), ...hidden.filter(SPACES.isHomeSection)].toSorted()).toEqual(
      [...SPACES.HOME_SECTIONS].toSorted()
    )
  })

  test("today's page (I40, I46):  your projects first under the hero, starting, examples, guides, Spanish, the org's;  no library or editor", () => {
    expect(SPACES.homeSections(false)).toEqual(["projects", "start", "examples", "guides", "spanish", "org"])
  })

  test("an org's app:  your projects and the org's groups first, in the saved order;  no library", () => {
    const order = { sections: ["examples", "org", "guides", "projects", "start", "library", "editor"] }
    expect(SPACES.homeSections(true, order)).toEqual([
      "org",
      "projects",
      "examples",
      "guides",
      "start",
      "editor",
      "spanish"
    ])
    expect(SPACES.homeSections(true)).toEqual(["projects", "org", "start", "examples", "guides", "spanish"])
  })

  test("an old list with no sections, or one naming what isn't one:  the rest in their first order", () => {
    expect(SPACES.homeSections(false, {})).toEqual([...SPACES.HOME_SECTIONS])
    expect(SPACES.homeSections(false, { sections: ["guides", "gone", "examples"] })).toEqual([
      "guides",
      "examples",
      "projects",
      "start",
      "library",
      "spanish",
      "org",
      "editor"
    ])
  })
})

/** A row showing some of a group's cards saves its new order into the group's whole one (epic `mockup` I40). */
describe("a run of a group's cards, reordered", () => {
  const all = ["fizzbuzz", "Counter", "FamilyCookbook", "TaskList", "Statusphere", "Solitaire"]

  test("the run's names take the run's places, in their new order;  the others stay put", () => {
    // the examples' row without the hidden ones, Solitaire dragged onto Counter
    expect(SPACES.withRunReordered(all, ["fizzbuzz", "Solitaire", "Counter", "TaskList"])).toEqual([
      "fizzbuzz",
      "Solitaire",
      "FamilyCookbook",
      "Counter",
      "Statusphere",
      "TaskList"
    ])
    // a row of just two of them, swapped
    expect(SPACES.withRunReordered(all, ["Statusphere", "FamilyCookbook"])).toEqual([
      "fizzbuzz",
      "Counter",
      "Statusphere",
      "TaskList",
      "FamilyCookbook",
      "Solitaire"
    ])
  })

  test("a name the order doesn't hold yet goes at the end;  `all` is left as it was", () => {
    expect(SPACES.withRunReordered(["a", "b"], ["new", "b", "a"])).toEqual(["b", "a", "new"])
    expect(all[0]).toBe("fizzbuzz")
  })
})

/** What the home page leaves out (Owen, epic `mockup` I40):  `SPACES.isOnHome()`, and the saved list's `"hidden"`. */
describe("the home page's hidden list", () => {
  const order = { hidden: ["library", "@spell/examples/fizzbuzz"] }

  test("a section or a project it names is off the page;  the rest are on", () => {
    expect(SPACES.isOnHome("library", order)).toBe(false)
    expect(SPACES.isOnHome("@spell/examples/fizzbuzz", order)).toBe(false)
    expect(SPACES.isOnHome("@spell/examples/calculator", order)).toBe(true)
    expect(SPACES.isOnHome("anything", {})).toBe(true)
    expect(SPACES.homeSections(false, order)).not.toContain("library")
  })

  test("today's:  too techy, too basic, needing a sign-in, the org apps, the to-do the Start row copies, and the guides of hidden examples", () => {
    expect(SPACES.HOME_ORDER[SPACES.HOME_HIDDEN_KEY]).toEqual([
      "library",
      "editor",
      "@spell/examples/fizzbuzz",
      "@spell/examples/Counter",
      "@spell/examples/PublicServers",
      "@spell/examples/StarWarsSite",
      "@spell/examples/RecipeBox",
      "@spell/examples/FamilyCookbook",
      "@spell/examples/PicnicLetter",
      "@spell/examples/SignUpSheet",
      "@spell/examples/Statusphere",
      "@spell/library/OrgAdmin",
      "@spell/library/OrgChat",
      "@spell/library/OrgFeed",
      "@spell/library/Inbox",
      "@spell/library/OrgEvents",
      "@spell/library/AdministracionDeLaOrg",
      "@spell/guides/how-fizzbuzz-works",
      // the Start row's to-do list copies Task List:  one to-do on the page, not three (epic `mockup` T42)
      "@spell/examples/TaskList",
      "@spell/examples/ListaDeTareas",
      "@spell/guides/how-task-list-works",
      "@spell/guides/como-funciona-lista-de-tareas"
    ])
  })

  test("names only sections, and projects that are there:  a hidden project is never deleted", () => {
    const spaces = resolve(import.meta.dirname, "../../../spaces")
    for (const name of SPACES.HOME_ORDER[SPACES.HOME_HIDDEN_KEY] ?? []) {
      if (SPACES.isHomeSection(name)) continue
      const group = name.slice(0, name.lastIndexOf("/"))
      expect(readdirSync(resolve(spaces, group)), name).toContain(SPACES.folderNameOf(name))
    }
  })
})

/** Each example's line on its home page card (epic `mockup` I48):  `SPACES.cardLineOf()`, whole in two lines. */
describe("an example's card line", () => {
  test("its description's first phrase, up to a `:`, `;` or sentence's end", () => {
    expect(SPACES.cardLineOf("A to-do list:  type a task and add it;  tick it off")).toBe("A to-do list")
    expect(SPACES.cardLineOf("The picnic's letter.  Then more")).toBe("The picnic's letter")
    expect(SPACES.cardLineOf(undefined)).toBeUndefined()
  })

  test("every example's is short enough to fit its card at its narrowest", () => {
    const examples = resolve(import.meta.dirname, "../../../spaces/@spell/examples")
    for (const name of readdirSync(examples)) {
      const file = resolve(examples, name, "__project.json5")
      if (!existsSync(file)) continue
      const line =
        SPACES.cardLineOf((JSON5.parse(readFileSync(file, "utf8")) as { description?: string }).description) ?? ""
      expect(line.length, `${name}'s card line, "${line}"`).toBeLessThanOrEqual(SPACES.CARD_LINE_LENGTH)
    }
  })
})
