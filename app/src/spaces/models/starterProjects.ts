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
  /**
   * Counters you name (epic `mockup` T50):  each counts up and down by its own step and resets;
   * the app adds them up, and keeps them on this device.
   * - Still a counter, showing more of Spell in a minute's read:  a type with actions and a test,
   *   a list drawn as it changes, a worked-out total, and storage in two lines.
   */
  counter: {
    name: "counter",
    fileName: "Counter.spell",
    contents: (title: string) => `# ${title}
// Counters you name:  each counts up and down by its own step, and starts again at 0.
// The total adds them all up.  They're kept on this device, so they're still here next time.

## Where they're kept
// In this browser's own storage:  change these two lines to keep them somewhere else.
my counters is stored on this device
a counter lives in my counters

## A counter

a "counter" is a view
\tto draw it
\t\t// A form of its own, bound to it:  typing its name or its step changes the counter
\t\t<form value={it}>
\t\t\t<stack direction="horizontal" spacing="sm">
\t\t\t\t<input name="name" aria-label="Name" appearance="transparent" fluid />
\t\t\t\t<action "count down" icon-only />
\t\t\t\t<header level="3">{the count}</header>
\t\t\t\t<action "count up" icon-only />
\t\t\t\t<input name="step" type="number" aria-label="Step" size="small" style="width: 5em" />
\t\t\t\t<action "reset" icon-only appearance="tertiary" />
\t\t\t\t<action "delete" icon-only appearance="tertiary" />
\t\t\t</stack>
\t\t</form>

\tits "name" is text
\tits "count" is a number starting at 0
\tits "step" is a number starting at 1
\t\t// How much one click adds, or takes away

\tto "count up" with title "Up", icon "plus"
\t\tset the count to the count + the step
\tto "count down" with title "Down", icon "minus"
\t\tset the count to the count - the step
\tto "reset" with title "Reset", icon "undo"
\t\tset the count to 0
\tto "delete" with title "Delete", icon "trash alternate outline"
\t\tremove it from its tally
\t\tremove it from the counters

\tto test counting by its step
\t\tset the counter to a new counter with step = 5
\t\tcount up of the counter
\t\tcount up of the counter
\t\tcount down of the counter
\t\tthe counter's count should be 5
\t\treset the counter
\t\tthe counter's count should be 0

## The tally
// The counters, one under the other

a "tally" is a viewable list of counters
\tto draw it
\t\t<stack spacing="xs">
\t\t\t<children />
\t\t</stack>
a counter belongs to one tally

## The app

my app is an app
\tto draw it
\t\t<container>
\t\t\t<stack>
\t\t\t\t<stack direction="horizontal" justify="between">
\t\t\t\t\t<header level="2">${title}</header>
\t\t\t\t\t<label size="large">Total {the total}</label>
\t\t\t\t</stack>
\t\t\t\t{draw the tally}
\t\t\t\t<form value={it}>
\t\t\t\t\t<input name="draft" placeholder="Count something else" aria-label="New counter" fluid action>
\t\t\t\t\t\t<button slot="action" color="primary" disabled={the draft is ""} onClick={add the draft}>Add</button>
\t\t\t\t\t</input>
\t\t\t\t</form>
\t\t\t</stack>
\t\t</container>

\t"tally" is a new tally
\tits "draft" is text
\t\t// The next counter's name, as the field holds it
\tits "total" is
\t\t// Every counter's count, added up
\t\tset sum to 0
\t\tfor counter in the tally
\t\t\tset sum to sum + the count of counter
\t\treturn sum

\twhen creating it
\t\t// The counters kept on this device;  the first time, two to start with
\t\tfor counter in every counter
\t\t\tadd it to the tally
\t\tif the tally is not empty return
\t\tadd the counter "Cups of coffee"
\t\tadd the counter "Push-ups"

\tto add the counter (name as text)
\t\tset counter to a new counter with name = name
\t\tadd counter to the counters
\t\tadd counter to the tally

\tto add the draft
\t\tif the draft is "" return
\t\tadd the counter the draft
\t\tclear the draft
`
  },
  /**
   * A converter (epic `mockup` T44):  a number typed in, and the same in other units beside it.
   * - Each property says what it measures, `a length in km`, and `in miles` converts it:  Spell knows its units.
   */
  converter: {
    name: "converter",
    fileName: "Converter.spell",
    contents: (title: string) => `# ${title}
// Type a number, and see it in other units:  Spell knows what a kilometer, a degree and a kilogram are.

my app is an app:
\tits "distance" is a length in km
\tits "temperature" is a temperature in °C
\tits "weight" is a weight in kg
\twhen creating it:
\t\tset its distance to 5
\t\tset its temperature to 20
\t\tset its weight to 1
\tto draw it:
\t\t<container>
\t\t\t<form value={it}>
\t\t\t\t<field label="Kilometers">
\t\t\t\t\t<input name="distance" type="number" labeled="right" label={its distance in miles with commas && "miles"} />
\t\t\t\t</field>
\t\t\t\t<field label="Degrees Celsius">
\t\t\t\t\t<input name="temperature" type="number" labeled="right" label={its temperature in °F with commas && "°F"} />
\t\t\t\t</field>
\t\t\t\t<field label="Kilograms">
\t\t\t\t\t<input name="weight" type="number" labeled="right" label={its weight in pounds with commas && "pounds"} />
\t\t\t\t</field>
\t\t\t</form>
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
\tto draw it:
\t\t<container>
\t\t\t<button onClick={roll the die}>Roll</button>
\t\t\t<text>You rolled {its roll}, in {its rolls} rolls</text>
\t\t</container>

\tits "roll" is a number
\tits "rolls" is a number
\twhen creating it:
\t\tset its roll to 1
\t\tset its rolls to 0
\tto roll the die:
\t\tset its roll to a random number in [1, 2, 3, 4, 5, 6]
\t\tset its rolls to its rolls + 1
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
