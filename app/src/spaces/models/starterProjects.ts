import { SP } from "spell/parser/spell"

/**
 * A file a starter program makes beside its first one:  a site's page layout and home page.
 */
export type StarterFile = {
  /** its name in the project, `main.page-layout.spell` */
  fileName: string
  /** what it starts as */
  contents: string
}

/** One file a project is made with:  an imported project's first, say. */
export type StartingFile = {
  /** its path in the project, `/MyApp.spell` */
  filePath: string
  /** what it holds */
  contents: string
}

/**
 * What a project can start as:  its name, its first file, and the files it makes beside it.
 */
export type Starter = {
  /** the project's name when nobody types one, `my-app` */
  name: string
  /** its first file, the one the project is made with */
  fileName: string
  /** what its first file starts as, its heading `title` */
  contents: (title: string) => string
  /** the files made beside it, in their order in the project, after the first */
  alongside?: readonly StarterFile[]
}

/**
 * What a new project starts as:  a program with a drawing, so the palette has somewhere to add things.
 * - The name in the code is always "my app":  a person names their project anything, a word spell may read otherwise,
 *   and renaming it changes nothing here.
 * - Browser-safe, with no server:  plain text, used by `SpellProjectRoot.createApp()` and the landing page's starters.
 * - In plain Spell (epic `language` P46), its drawing's components by their bare names:  `<container>`.
 * - English for now:  a Spanish one needs its own words.
 */
export const STARTER_PROGRAMS = {
  /** Nothing in it yet:  what's added goes in its container. */
  blank: {
    name: "my-app",
    fileName: "MyApp.spell",
    contents: (title: string) => `# ${title}

my app is an app:
\tto draw it:
\t\t<container>
\t\t</container>
`
  },
  /** A button that counts its clicks. */
  counter: {
    name: "counter",
    fileName: "Counter.spell",
    contents: (title: string) => `# ${title}
// A button that counts its clicks.

my app is an app:
\tits "count" is a number
\twhen creating it:
\t\tset its count to 0
\tto count up:
\t\tset its count to its count + 1
\tto draw it:
\t\t<container>
\t\t\t<button onClick={count up}>Clicked {its count} times</button>
\t\t</container>
`
  },
  /** A little game:  roll a die, and see how far you get. */
  dice: {
    name: "roll-a-six",
    fileName: "RollASix.spell",
    contents: (title: string) => `# ${title}
// A little game:  how many rolls does it take to roll a six?

my app is an app:
\tits "roll" is a number
\tits "rolls" is a number
\twhen creating it:
\t\tset its roll to 1
\t\tset its rolls to 0
\tto roll the die:
\t\tset its roll to a random number in [1, 2, 3, 4, 5, 6]
\t\tset its rolls to its rolls + 1
\tto draw it:
\t\t<container>
\t\t\t<button onClick={roll the die}>Roll</button>
\t\t\t<text>You rolled {its roll}, in {its rolls} rolls</text>
\t\t</container>
`
  },
  /**
   * A site (epic `mockup` T40):  its routing alone in its site file, each page a file of its own,
   * and the main page layout every page is drawn in, as Star Wars' is.
   * - The layout's file is what makes it a site's main layout (T39, J149):  nothing in the site file names it.
   */
  site: {
    name: "my-site",
    fileName: "MySite.site.spell",
    contents: (title: string) => `# ${title}
// The site:  its pages, and the address of each.  Each page is a file of its own.

my site is a site
\tit has a Home at "/", icon "house"
`,
    alongside: [
      {
        fileName: "main.page-layout.spell",
        contents: `// Every page's frame:  the site's navigation in the drawer;  above each page its app menu,
// the drawer's button and where you are;  under that, the page's family as tabs.
main layout is a page layout
\tto draw its app menu
\t\t<app-menu>
\t\t\t<site-nav-button slot="start" />
\t\t\t<site-breadcrumbs slot="start" />
\t\t</app-menu>
`
      },
      {
        fileName: "home.spell",
        contents: `"Home" is a page
\t<header size="large">Home</header>
`
      }
    ]
  }
} as const satisfies Record<string, Starter>

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
