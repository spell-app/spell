import { SP } from "spell/parser/spell"

/**
 * What a new project starts as:  a program with a drawing, so the palette has somewhere to add things.
 * - The name in the code is always "my app":  a person names their project anything, a word spell may read otherwise,
 *   and renaming it changes nothing here.
 * - Browser-safe, with no server:  plain text, used by `SpellProjectRoot.createApp()` and the landing page's starters.
 * - English for now:  a Spanish one needs its own tags, `<es-...>`.
 */
export const STARTER_PROGRAMS = {
  /** Nothing in it yet:  what's added goes in its container. */
  blank: {
    name: "my-app",
    fileName: "MyApp.spellml",
    contents: (title: string) => `# ${title}

<spell-app "my app">
\t<draw>
\t\t<ui-container>
\t\t</ui-container>
\t</draw>
</spell-app>
`
  },
  /** A button that counts its clicks. */
  counter: {
    name: "counter",
    fileName: "Counter.spellml",
    contents: (title: string) => `# ${title}
A button that counts its clicks.

<spell-app "my app">
\t<property "count">a number</>
\t<action "create it">set its count to 0</>
\t<action "count up">set its count to its count + 1</>
\t<draw>
\t\t<ui-container>
\t\t\t<ui-button onClick={count up}>Clicked {its count} times</ui-button>
\t\t</ui-container>
\t</draw>
</spell-app>
`
  },
  /** A little game:  roll a die, and see how far you get. */
  dice: {
    name: "roll-a-six",
    fileName: "RollASix.spellml",
    contents: (title: string) => `# ${title}
A little game:  how many rolls does it take to roll a six?

<spell-app "my app">
\t<property "roll">a number</>
\t<property "rolls">a number</>
\t<action "create it">
\t\tset its roll to 1
\t\tset its rolls to 0
\t</action>
\t<action "roll the die">
\t\tset its roll to a random number in [1, 2, 3, 4, 5, 6]
\t\tset its rolls to its rolls + 1
\t</action>
\t<draw>
\t\t<ui-container>
\t\t\t<ui-button onClick={roll the die}>Roll</ui-button>
\t\t\t<ui-text>You rolled {its roll}, in {its rolls} rolls</ui-text>
\t\t</ui-container>
\t</draw>
</spell-app>
`
  }
} as const

/** A program a project can start as:  a key of `STARTER_PROGRAMS`. */
export type StarterProgram = keyof typeof STARTER_PROGRAMS

/** The first free project id for `name` in group `rootPath`:  `owen@spell/my-app`, then `.../my-app-2` ... */
export function freeProjectId(rootPath: string, name: string, taken: readonly string[]): string {
  const first = `${rootPath}/${SP.SpellLocation.kebab(name) || STARTER_PROGRAMS.blank.name}`
  if (!taken.includes(first)) return first
  for (let count = 2; ; count++) {
    if (!taken.includes(`${first}-${count}`)) return `${first}-${count}`
  }
}

/**
 * A project as one file, to keep or to move:  `SpellProjectRoot.exportApp()` writes it, `importApp()` reads it.
 * - Only text:  a project's pictures, if any, stay behind.
 */
export type ProjectArchive = {
  /** What this file is, and the shape it's in. */
  format: typeof PROJECT_ARCHIVE_FORMAT
  /** Its folder's name, `my-app`. */
  name: string
  /** Its name for people, when its folder's name can't say it. */
  title?: string
  /** Its files, in order:  each path from the project, `/MyApp.spellml`, and its text. */
  files: ProjectArchiveFile[]
}

/** One file of a `ProjectArchive`. */
export type ProjectArchiveFile = {
  /** Its path from the project, `/MyApp.spellml`. */
  path: string
  /** Its text. */
  contents: string
}

/** What a `ProjectArchive` says it is:  anything else isn't one. */
export const PROJECT_ARCHIVE_FORMAT = "spell-project-1"

/** End of an exported project's file name. */
export const PROJECT_ARCHIVE_EXTENSION = ".spell.json"

/** Is `value` a `ProjectArchive`?  For a file a person chose, which could be anything. */
export function isProjectArchive(value: unknown): value is ProjectArchive {
  const archive = value as ProjectArchive | null
  return (
    archive?.format === PROJECT_ARCHIVE_FORMAT &&
    typeof archive.name === "string" &&
    Array.isArray(archive.files) &&
    archive.files.length > 0 &&
    archive.files.every(({ path, contents }) => typeof path === "string" && typeof contents === "string")
  )
}
