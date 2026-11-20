/**
 * The `sites` rule module's English:  every rule's syntax and tests, in tie-break order (epic `mockup` P1).
 * - `sites.es.ts` registers the same classes in the same order.
 */
import { Synonyms, Wording } from "spell/parser/spell/rules/expressions"
import { DefineGroup } from "spell/parser/spell/rules/classes"
import { sites } from "./sites.parser"
import { CreateSite } from "./CreateSite"
import { SiteOverlay } from "./SiteOverlay"
import { SitePage } from "./SitePage"
import { SiteLink } from "./SiteLink"
import { ShowSitePart } from "./ShowSitePart"
import { SiteAddressOf } from "./SiteAddressOf"
import { SitePartWords } from "./SitePartWords"

/**
 * What a page's line may say after its address:  what the navigation calls it, its icon there, its tab, its tags,
 * how far along it is, its picture, the real page it stands for, that it's drawn without the site's top bar, and that
 * its navigation doesn't list it (`, not in the navigation`:  reached by its address and links alone, epic
 * old-console-redo I35).
 */
const PAGE_DETAILS =
  "(, named {title:text})? (, icon {icon:text})? (, tab {tab:text})? (, tagged {tags:text})? (, {state:site_page_state})? (, thumbnail {thumbnail:text})? (, live {live:text})? (, (no_top_bar:no top bar))? (, (unlisted:not in the navigation))?"

/** What any part's line may end with:  its place in its section of the site editor's board, and its colour there. */
const CARD_DETAILS = "(, in row {row:number} column {column:number})? (, (colored|coloured) {color:site_card_color})?"

////////////////
// ## Word rules
////////////////

// the last word of a site's dialog, for `site_overlay`:  `- it has a settings dialog`
sites.addRule(Synonyms.specialize({ ruleName: "site_dialog" }), { syntax: "(dialog|modal)" })

// the last word of a site's sidebar, for `site_overlay`:  `- it has a syntax sidebar`
sites.addRule(Synonyms.specialize({ ruleName: "site_sidebar" }), { syntax: "(sidebar|flyout)" })

// a site's top bar, for `site_overlay`:  `- it has a top bar`, `- it has an app bar` (epic `mockup` T35)
sites.addRule(Wording.specialize({ ruleName: "site_top_bar", meanings: [] }), { syntax: "(top bar|app bar)" })

// the page layout every page of a site is in, unless its line says otherwise (epic `mockup` T39):
// `main layout is a page layout`
sites.addRule(Wording.specialize({ ruleName: "site_main_layout", meanings: [] }), {
  syntax: "(main layout|main page layout)"
})

// what state a site's page is in, last on its line:  `- it has a films page at "/films", old` (epic `mockup` P13, T14)
sites.addRule(Wording.specialize({ ruleName: "site_page_state", meanings: ["old", "new", "mocked", "built"] }), {
  syntax: "((old:old)|(new:new)|(mocked:mocked)|(built:built))"
})

// the colour of a part's card on the site editor's board, one of Spell UI's:  `- it has a films page at "/films", colored blue`
sites.addRule(
  Wording.specialize({
    ruleName: "site_card_color",
    meanings: ["red", "orange", "yellow", "olive", "green", "teal", "blue", "violet", "purple", "pink", "brown", "grey"]
  }),
  {
    syntax:
      "((red:red)|(orange:orange)|(yellow:yellow)|(olive:olive)|(green:green)|(teal:teal)|(blue:blue)|(violet:violet)|(purple:purple)|(pink:pink)|(brown:brown)|(grey:grey))"
  }
)

// a group of a site's parts, its section of the site editor's board in a colour (epic `language` T112):
// `group "Hardware", color yellow`, `group "Hardware" with color yellow`, or as a part's line says it, `, colored yellow`
// - `with` as an action's head line says what it is (`with title "Deal"`, `action_modifiers`);  a comma as a part's line does
// - Compiles to nothing, as any group does (`classes`'s `group "x"`):  its colour is the site editor's, read from the text
// - `, icon "microchip"` after it:  the icon before the group's name in the site's navigation (epic `mockup` I20)
sites.addRule(DefineGroup, {
  syntax:
    "{type:subject_implied} group {group:text} ((with|,) (color|colour)|, (colored|coloured)) {color:site_card_color} (, icon {icon:text})?",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          title: "a coloured group heads its pages, as any group does:  its colour is the board's alone",
          input: [
            'a "films page" is a page',
            "galaxy guide is a site in the cloud:",
            '\tgroup "Films", color blue',
            '\tit has a films page at "/films"'
          ],
          js: [
            "export class FilmsPage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "export class GalaxyGuide extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "films page",',
            '    page: "FilmsPage",',
            '    address: "/films",',
            '    group: "Films"',
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "export const galaxyGuide = new GalaxyGuide()"
          ],
          ts: [
            "export class FilmsPage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "",
            "/**",
            " * `<test-sites-films-page>`:  a films page, drawn in its own element, e.g. by `draw the films page`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its films page's properties;  its methods call its films page's.",
            " * - What every view's element does, e.g. drawing its films page, is `SpellElement`'s.",
            " */",
            "export class FilmsPageElement extends SpellElement<FilmsPage> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-films-page", "films page", [])',
            "}",
            "core.useElement(FilmsPage, FilmsPageElement)",
            "export class GalaxyGuide extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "films page",',
            '    page: "FilmsPage",',
            '    address: "/films",',
            '    group: "Films"',
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "",
            "/**",
            " * `<test-sites-galaxy-guide>`:  a galaxy guide, drawn in its own element, e.g. by `draw the galaxy guide`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its galaxy guide's properties;  its methods call its galaxy guide's.",
            " * - What every view's element does, e.g. drawing its galaxy guide, is `SpellElement`'s.",
            " */",
            "export class GalaxyGuideElement extends SpellElement<GalaxyGuide> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-galaxy-guide", "galaxy guide", [])',
            "}",
            "core.useElement(GalaxyGuide, GalaxyGuideElement)",
            "export const galaxyGuide = new GalaxyGuide()"
          ]
        },
        {
          title: "with color, as an action's head line says what it is",
          input: [
            'a "films page" is a page',
            "galaxy guide is a site in the cloud:",
            '\tgroup "Films" with color blue',
            '\tit has a films page at "/films"'
          ],
          js: [
            "export class FilmsPage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "export class GalaxyGuide extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "films page",',
            '    page: "FilmsPage",',
            '    address: "/films",',
            '    group: "Films"',
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "export const galaxyGuide = new GalaxyGuide()"
          ],
          ts: [
            "export class FilmsPage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "",
            "/**",
            " * `<test-sites-films-page>`:  a films page, drawn in its own element, e.g. by `draw the films page`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its films page's properties;  its methods call its films page's.",
            " * - What every view's element does, e.g. drawing its films page, is `SpellElement`'s.",
            " */",
            "export class FilmsPageElement extends SpellElement<FilmsPage> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-films-page", "films page", [])',
            "}",
            "core.useElement(FilmsPage, FilmsPageElement)",
            "export class GalaxyGuide extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "films page",',
            '    page: "FilmsPage",',
            '    address: "/films",',
            '    group: "Films"',
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "",
            "/**",
            " * `<test-sites-galaxy-guide>`:  a galaxy guide, drawn in its own element, e.g. by `draw the galaxy guide`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its galaxy guide's properties;  its methods call its galaxy guide's.",
            " * - What every view's element does, e.g. drawing its galaxy guide, is `SpellElement`'s.",
            " */",
            "export class GalaxyGuideElement extends SpellElement<GalaxyGuide> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-galaxy-guide", "galaxy guide", [])',
            "}",
            "core.useElement(GalaxyGuide, GalaxyGuideElement)",
            "export const galaxyGuide = new GalaxyGuide()"
          ]
        },
        {
          title: "colored, as a part's line says it",
          input: [
            'a "films page" is a page',
            "galaxy guide is a site in the cloud:",
            '\tgroup "Films", colored blue',
            '\tit has a films page at "/films"'
          ],
          js: [
            "export class FilmsPage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "export class GalaxyGuide extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "films page",',
            '    page: "FilmsPage",',
            '    address: "/films",',
            '    group: "Films"',
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "export const galaxyGuide = new GalaxyGuide()"
          ],
          ts: [
            "export class FilmsPage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "",
            "/**",
            " * `<test-sites-films-page>`:  a films page, drawn in its own element, e.g. by `draw the films page`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its films page's properties;  its methods call its films page's.",
            " * - What every view's element does, e.g. drawing its films page, is `SpellElement`'s.",
            " */",
            "export class FilmsPageElement extends SpellElement<FilmsPage> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-films-page", "films page", [])',
            "}",
            "core.useElement(FilmsPage, FilmsPageElement)",
            "export class GalaxyGuide extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "films page",',
            '    page: "FilmsPage",',
            '    address: "/films",',
            '    group: "Films"',
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "",
            "/**",
            " * `<test-sites-galaxy-guide>`:  a galaxy guide, drawn in its own element, e.g. by `draw the galaxy guide`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its galaxy guide's properties;  its methods call its galaxy guide's.",
            " * - What every view's element does, e.g. drawing its galaxy guide, is `SpellElement`'s.",
            " */",
            "export class GalaxyGuideElement extends SpellElement<GalaxyGuide> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-galaxy-guide", "galaxy guide", [])',
            "}",
            "core.useElement(GalaxyGuide, GalaxyGuideElement)",
            "export const galaxyGuide = new GalaxyGuide()"
          ]
        },
        {
          title: "an icon after its colour:  its pages carry it, for the group's line in the navigation",
          input: [
            'a "films page" is a page',
            "galaxy guide is a site in the cloud:",
            '\tgroup "Films", color blue, icon "film"',
            '\tit has a films page at "/films"'
          ],
          js: [
            "export class FilmsPage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "export class GalaxyGuide extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "films page",',
            '    page: "FilmsPage",',
            '    address: "/films",',
            '    group: "Films",',
            '    groupIcon: "film"',
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "export const galaxyGuide = new GalaxyGuide()"
          ],
          ts: [
            "export class FilmsPage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "",
            "/**",
            " * `<test-sites-films-page>`:  a films page, drawn in its own element, e.g. by `draw the films page`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its films page's properties;  its methods call its films page's.",
            " * - What every view's element does, e.g. drawing its films page, is `SpellElement`'s.",
            " */",
            "export class FilmsPageElement extends SpellElement<FilmsPage> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-films-page", "films page", [])',
            "}",
            "core.useElement(FilmsPage, FilmsPageElement)",
            "export class GalaxyGuide extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "films page",',
            '    page: "FilmsPage",',
            '    address: "/films",',
            '    group: "Films",',
            '    groupIcon: "film"',
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "",
            "/**",
            " * `<test-sites-galaxy-guide>`:  a galaxy guide, drawn in its own element, e.g. by `draw the galaxy guide`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its galaxy guide's properties;  its methods call its galaxy guide's.",
            " * - What every view's element does, e.g. drawing its galaxy guide, is `SpellElement`'s.",
            " */",
            "export class GalaxyGuideElement extends SpellElement<GalaxyGuide> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-galaxy-guide", "galaxy guide", [])',
            "}",
            "core.useElement(GalaxyGuide, GalaxyGuideElement)",
            "export const galaxyGuide = new GalaxyGuide()"
          ]
        }
      ]
    }
  ]
})

// a site's group with an icon and no colour:  `group "Hardware", icon "microchip"` (epic `mockup` I20)
sites.addRule(DefineGroup, {
  syntax: "{type:subject_implied} group {group:text}, icon {icon:text}",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          title: "an icon alone:  its pages carry it, for the group's line in the navigation",
          input: [
            'a "films page" is a page',
            "galaxy guide is a site in the cloud:",
            '\tgroup "Films", icon "film"',
            '\tit has a films page at "/films"'
          ],
          js: [
            "export class FilmsPage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "export class GalaxyGuide extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "films page",',
            '    page: "FilmsPage",',
            '    address: "/films",',
            '    group: "Films",',
            '    groupIcon: "film"',
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "export const galaxyGuide = new GalaxyGuide()"
          ],
          ts: [
            "export class FilmsPage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "",
            "/**",
            " * `<test-sites-films-page>`:  a films page, drawn in its own element, e.g. by `draw the films page`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its films page's properties;  its methods call its films page's.",
            " * - What every view's element does, e.g. drawing its films page, is `SpellElement`'s.",
            " */",
            "export class FilmsPageElement extends SpellElement<FilmsPage> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-films-page", "films page", [])',
            "}",
            "core.useElement(FilmsPage, FilmsPageElement)",
            "export class GalaxyGuide extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "films page",',
            '    page: "FilmsPage",',
            '    address: "/films",',
            '    group: "Films",',
            '    groupIcon: "film"',
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "",
            "/**",
            " * `<test-sites-galaxy-guide>`:  a galaxy guide, drawn in its own element, e.g. by `draw the galaxy guide`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its galaxy guide's properties;  its methods call its galaxy guide's.",
            " * - What every view's element does, e.g. drawing its galaxy guide, is `SpellElement`'s.",
            " */",
            "export class GalaxyGuideElement extends SpellElement<GalaxyGuide> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-galaxy-guide", "galaxy guide", [])',
            "}",
            "core.useElement(GalaxyGuide, GalaxyGuideElement)",
            "export const galaxyGuide = new GalaxyGuide()"
          ]
        }
      ]
    }
  ]
})

// the words naming a site's part, `of` / `de` included (epic `mockup` P3, T5)
sites.addRule(SitePartWords, {
  tests: [
    {
      tests: [
        { title: "a name", input: "film page", js: "filmPage" },
        { title: "joined by of", input: "list of films page", js: "listOfFilmsPage" },
        { title: "of before an article ends it", input: "page of the", js: "page" }
      ]
    }
  ]
})

////////////////
// ## A site and its parts
////////////////

// a site, and where it lives:  `spell ui is a site at "owen@spell/spell-ui":`, `galaxy guide is a site in the cloud`
sites.addRule(CreateSite, {
  roles: { band: "thing", type: "declaration" },
  syntax:
    "{type:type_words} is (a|an) {superType:type} (at {address:text}|(cloud:in the cloud))? (with {defaults:object_literal_properties})? {with_nested_statements}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          title: "a site, and the pages, dialogs and sidebars under it",
          input: [
            'a "film" is a thing where:',
            '\t- its "title" is text',
            'a "films page" is a page',
            'a "film page" is a page where:',
            "\t- it has a film",
            'galaxy guide is a site at "owen@spell/galaxy":',
            '\t- it has a films page at "/films", named "Films", icon "film"',
            '\t\t- it has a film page at "/films/:film"',
            "\t- it has a settings dialog",
            "\t- it has a film sidebar"
          ],
          js: [
            "export class Film extends Thing {",
            '  // - its "title" is text',
            '  static { this.declareProp("title", { type: "text" }) }',
            '  get title() { return this.getProp("title") }',
            '  set title(value) { this.setProp("title", value) }',
            "}",
            "export class FilmsPage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "export class FilmPage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "",
            "  // - it has a film",
            '  get film() { return this.getProp("film") }',
            '  set film(value) { this.setProp("film", value) }',
            "}",
            "export class GalaxyGuide extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "films page",',
            '    page: "FilmsPage",',
            '    address: "/films",',
            '    title: "Films",',
            '    icon: "film",',
            "    pages: [{",
            '      name: "film page",',
            '      page: "FilmPage",',
            '      address: "/films/:film",',
            '      params: ["film"]',
            "    }]",
            "  }]",
            '  static dialogs = [{ name: "settings dialog" }]',
            '  static sidebars = [{ name: "film sidebar" }]',
            '  static livesAt = "owen@spell/galaxy"',
            "}",
            "export const galaxyGuide = new GalaxyGuide()"
          ],
          ts: [
            "export class Film extends Thing {",
            '  // - its "title" is text',
            '  @prop({ type: "text" })',
            "  accessor title!: string",
            "}",
            "export class FilmsPage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "",
            "/**",
            " * `<test-sites-films-page>`:  a films page, drawn in its own element, e.g. by `draw the films page`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its films page's properties;  its methods call its films page's.",
            " * - What every view's element does, e.g. drawing its films page, is `SpellElement`'s.",
            " */",
            "export class FilmsPageElement extends SpellElement<FilmsPage> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-films-page", "films page", [])',
            "}",
            "core.useElement(FilmsPage, FilmsPageElement)",
            "export class FilmPage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "",
            "  // - it has a film",
            "  @prop() accessor film!: any /* spell: type unknown */",
            "}",
            "",
            "/**",
            " * `<test-sites-film-page>`:  a film page, drawn in its own element, e.g. by `draw the film page`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its film page's properties;  its methods call its film page's.",
            " * - What every view's element does, e.g. drawing its film page, is `SpellElement`'s.",
            " */",
            "export class FilmPageElement extends SpellElement<FilmPage> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-film-page", "film page", [',
            '    { name: "film", kind: "string", description: "Its film." }',
            "  ])",
            "}",
            "core.useElement(FilmPage, FilmPageElement)",
            "export class GalaxyGuide extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "films page",',
            '    page: "FilmsPage",',
            '    address: "/films",',
            '    title: "Films",',
            '    icon: "film",',
            "    pages: [{",
            '      name: "film page",',
            '      page: "FilmPage",',
            '      address: "/films/:film",',
            '      params: ["film"]',
            "    }]",
            "  }]",
            '  static dialogs = [{ name: "settings dialog" }]',
            '  static sidebars = [{ name: "film sidebar" }]',
            '  static livesAt = "owen@spell/galaxy"',
            "}",
            "",
            "/**",
            " * `<test-sites-galaxy-guide>`:  a galaxy guide, drawn in its own element, e.g. by `draw the galaxy guide`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its galaxy guide's properties;  its methods call its galaxy guide's.",
            " * - What every view's element does, e.g. drawing its galaxy guide, is `SpellElement`'s.",
            " */",
            "export class GalaxyGuideElement extends SpellElement<GalaxyGuide> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-galaxy-guide", "galaxy guide", [])',
            "}",
            "core.useElement(GalaxyGuide, GalaxyGuideElement)",
            "export const galaxyGuide = new GalaxyGuide()"
          ]
        },
        {
          title: "in the cloud",
          input: ['a "home page" is a page', "galaxy guide is a site in the cloud:", '\t- it has a home page at "/"'],
          js: [
            "export class HomePage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "export class GalaxyGuide extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "home page",',
            '    page: "HomePage",',
            '    address: "/"',
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "export const galaxyGuide = new GalaxyGuide()"
          ],
          ts: [
            "export class HomePage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "",
            "/**",
            " * `<test-sites-home-page>`:  a home page, drawn in its own element, e.g. by `draw the home page`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its home page's properties;  its methods call its home page's.",
            " * - What every view's element does, e.g. drawing its home page, is `SpellElement`'s.",
            " */",
            "export class HomePageElement extends SpellElement<HomePage> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-home-page", "home page", [])',
            "}",
            "core.useElement(HomePage, HomePageElement)",
            "export class GalaxyGuide extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "home page",',
            '    page: "HomePage",',
            '    address: "/"',
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "",
            "/**",
            " * `<test-sites-galaxy-guide>`:  a galaxy guide, drawn in its own element, e.g. by `draw the galaxy guide`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its galaxy guide's properties;  its methods call its galaxy guide's.",
            " * - What every view's element does, e.g. drawing its galaxy guide, is `SpellElement`'s.",
            " */",
            "export class GalaxyGuideElement extends SpellElement<GalaxyGuide> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-galaxy-guide", "galaxy guide", [])',
            "}",
            "core.useElement(GalaxyGuide, GalaxyGuideElement)",
            "export const galaxyGuide = new GalaxyGuide()"
          ]
        },
        {
          title: "a page not in the navigation:  reached by its address alone (old-console-redo I35)",
          input: [
            'a "settings page" is a page',
            "galaxy guide is a site in the cloud:",
            '\t- it has a settings page at "/settings", named "Settings", not in the navigation'
          ],
          js: [
            "export class SettingsPage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "export class GalaxyGuide extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "settings page",',
            '    page: "SettingsPage",',
            '    address: "/settings",',
            '    title: "Settings",',
            "    unlisted: true",
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "export const galaxyGuide = new GalaxyGuide()"
          ],
          ts: [
            "export class SettingsPage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "",
            "/**",
            " * `<test-sites-settings-page>`:  a settings page, drawn in its own element, e.g. by `draw the settings page`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its settings page's properties;  its methods call its settings page's.",
            " * - What every view's element does, e.g. drawing its settings page, is `SpellElement`'s.",
            " */",
            "export class SettingsPageElement extends SpellElement<SettingsPage> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-settings-page", "settings page", [])',
            "}",
            "core.useElement(SettingsPage, SettingsPageElement)",
            "export class GalaxyGuide extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "settings page",',
            '    page: "SettingsPage",',
            '    address: "/settings",',
            '    title: "Settings",',
            "    unlisted: true",
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "",
            "/**",
            " * `<test-sites-galaxy-guide>`:  a galaxy guide, drawn in its own element, e.g. by `draw the galaxy guide`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its galaxy guide's properties;  its methods call its galaxy guide's.",
            " * - What every view's element does, e.g. drawing its galaxy guide, is `SpellElement`'s.",
            " */",
            "export class GalaxyGuideElement extends SpellElement<GalaxyGuide> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-galaxy-guide", "galaxy guide", [])',
            "}",
            "core.useElement(GalaxyGuide, GalaxyGuideElement)",
            "export const galaxyGuide = new GalaxyGuide()"
          ]
        },
        {
          title: "its own values on its line, as a type's:  the theme its pages wear (I30)",
          input: [
            'a "home page" is a page',
            'galaxy guide is a site in the cloud with theme "mockup"',
            '\t- it has a home page at "/"'
          ],
          js: [
            "export class HomePage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "export class GalaxyGuide extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  get theme() {",
            '    return "mockup"',
            "  }",
            "  static pages = [{",
            '    name: "home page",',
            '    page: "HomePage",',
            '    address: "/"',
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "export const galaxyGuide = new GalaxyGuide()"
          ],
          ts: [
            "export class HomePage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "",
            "/**",
            " * `<test-sites-home-page>`:  a home page, drawn in its own element, e.g. by `draw the home page`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its home page's properties;  its methods call its home page's.",
            " * - What every view's element does, e.g. drawing its home page, is `SpellElement`'s.",
            " */",
            "export class HomePageElement extends SpellElement<HomePage> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-home-page", "home page", [])',
            "}",
            "core.useElement(HomePage, HomePageElement)",
            "export class GalaxyGuide extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  get theme(): string {",
            '    return "mockup"',
            "  }",
            "  static pages = [{",
            '    name: "home page",',
            '    page: "HomePage",',
            '    address: "/"',
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "",
            "/**",
            " * `<test-sites-galaxy-guide>`:  a galaxy guide, drawn in its own element, e.g. by `draw the galaxy guide`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its galaxy guide's properties;  its methods call its galaxy guide's.",
            " * - What every view's element does, e.g. drawing its galaxy guide, is `SpellElement`'s.",
            " */",
            "export class GalaxyGuideElement extends SpellElement<GalaxyGuide> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-galaxy-guide", "galaxy guide", [])',
            "}",
            "core.useElement(GalaxyGuide, GalaxyGuideElement)",
            "export const galaxyGuide = new GalaxyGuide()"
          ]
        },
        {
          title: "its theme in its body, as before (P8)",
          input: ["galaxy guide is a site", '\tits "theme" is "mockup"'],
          js: [
            "export class GalaxyGuide extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "",
            "  get theme() {",
            '    return "mockup"',
            "  }",
            "}",
            "export const galaxyGuide = new GalaxyGuide()"
          ],
          ts: [
            "export class GalaxyGuide extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "",
            "  get theme(): string {",
            '    return "mockup"',
            "  }",
            "}",
            "",
            "/**",
            " * `<test-sites-galaxy-guide>`:  a galaxy guide, drawn in its own element, e.g. by `draw the galaxy guide`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its galaxy guide's properties;  its methods call its galaxy guide's.",
            " * - What every view's element does, e.g. drawing its galaxy guide, is `SpellElement`'s.",
            " */",
            "export class GalaxyGuideElement extends SpellElement<GalaxyGuide> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-galaxy-guide", "galaxy guide", [])',
            "}",
            "core.useElement(GalaxyGuide, GalaxyGuideElement)",
            "export const galaxyGuide = new GalaxyGuide()"
          ]
        },
        {
          title: "a page picks its layout on its line;  the site's main layout is every other page's (T39)",
          input: [
            "main layout is a page layout",
            "bare layout is a page layout",
            "home page is a page",
            "login page is a page, no layout",
            "print page is a page, in the bare layout",
            "galaxy guide is a site:",
            '\t- it has a home page at "/"',
            '\t- it has a login page at "/login"',
            '\t- it has a print page at "/print"'
          ],
          js: [
            "export class MainLayout extends PageLayout {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "export const mainLayout = new MainLayout()",
            "export class BareLayout extends PageLayout {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "export const bareLayout = new BareLayout()",
            "export class HomePage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "export const homePage = new HomePage()",
            "export class LoginPage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static layout = false",
            "}",
            "export const loginPage = new LoginPage()",
            "export class PrintPage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            '  static layout = "BareLayout"',
            "}",
            "export const printPage = new PrintPage()",
            "export class GalaxyGuide extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "home page",',
            '    page: "HomePage",',
            '    address: "/"',
            "  }, {",
            '    name: "login page",',
            '    page: "LoginPage",',
            '    address: "/login"',
            "  }, {",
            '    name: "print page",',
            '    page: "PrintPage",',
            '    address: "/print"',
            "  }]",
            '  static mainLayout = "MainLayout"',
            "}",
            "export const galaxyGuide = new GalaxyGuide()"
          ],
          ts: [
            "export class MainLayout extends PageLayout {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "",
            "/**",
            " * `<test-sites-main-layout>`:  a main layout, drawn in its own element, e.g. by `draw the main layout`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its main layout's properties;  its methods call its main layout's.",
            " * - What every view's element does, e.g. drawing its main layout, is `SpellElement`'s.",
            " */",
            "export class MainLayoutElement extends SpellElement<MainLayout> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-main-layout", "main layout", [])',
            "}",
            "core.useElement(MainLayout, MainLayoutElement)",
            "export const mainLayout = new MainLayout()",
            "export class BareLayout extends PageLayout {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "",
            "/**",
            " * `<test-sites-bare-layout>`:  a bare layout, drawn in its own element, e.g. by `draw the bare layout`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its bare layout's properties;  its methods call its bare layout's.",
            " * - What every view's element does, e.g. drawing its bare layout, is `SpellElement`'s.",
            " */",
            "export class BareLayoutElement extends SpellElement<BareLayout> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-bare-layout", "bare layout", [])',
            "}",
            "core.useElement(BareLayout, BareLayoutElement)",
            "export const bareLayout = new BareLayout()",
            "export class HomePage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "",
            "/**",
            " * `<test-sites-home-page>`:  a home page, drawn in its own element, e.g. by `draw the home page`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its home page's properties;  its methods call its home page's.",
            " * - What every view's element does, e.g. drawing its home page, is `SpellElement`'s.",
            " */",
            "export class HomePageElement extends SpellElement<HomePage> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-home-page", "home page", [])',
            "}",
            "core.useElement(HomePage, HomePageElement)",
            "export const homePage = new HomePage()",
            "export class LoginPage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static layout = false",
            "}",
            "",
            "/**",
            " * `<test-sites-login-page>`:  a login page, drawn in its own element, e.g. by `draw the login page`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its login page's properties;  its methods call its login page's.",
            " * - What every view's element does, e.g. drawing its login page, is `SpellElement`'s.",
            " */",
            "export class LoginPageElement extends SpellElement<LoginPage> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-login-page", "login page", [])',
            "}",
            "core.useElement(LoginPage, LoginPageElement)",
            "export const loginPage = new LoginPage()",
            "export class PrintPage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            '  static layout = "BareLayout"',
            "}",
            "",
            "/**",
            " * `<test-sites-print-page>`:  a print page, drawn in its own element, e.g. by `draw the print page`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its print page's properties;  its methods call its print page's.",
            " * - What every view's element does, e.g. drawing its print page, is `SpellElement`'s.",
            " */",
            "export class PrintPageElement extends SpellElement<PrintPage> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-print-page", "print page", [])',
            "}",
            "core.useElement(PrintPage, PrintPageElement)",
            "export const printPage = new PrintPage()",
            "export class GalaxyGuide extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "home page",',
            '    page: "HomePage",',
            '    address: "/"',
            "  }, {",
            '    name: "login page",',
            '    page: "LoginPage",',
            '    address: "/login"',
            "  }, {",
            '    name: "print page",',
            '    page: "PrintPage",',
            '    address: "/print"',
            "  }]",
            '  static mainLayout = "MainLayout"',
            "}",
            "",
            "/**",
            " * `<test-sites-galaxy-guide>`:  a galaxy guide, drawn in its own element, e.g. by `draw the galaxy guide`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its galaxy guide's properties;  its methods call its galaxy guide's.",
            " * - What every view's element does, e.g. drawing its galaxy guide, is `SpellElement`'s.",
            " */",
            "export class GalaxyGuideElement extends SpellElement<GalaxyGuide> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-galaxy-guide", "galaxy guide", [])',
            "}",
            "core.useElement(GalaxyGuide, GalaxyGuideElement)",
            "export const galaxyGuide = new GalaxyGuide()"
          ]
        },
        {
          title: "not a site:  an app is `create_one_of_a_kind`'s",
          input: ["solitaire is an app"],
          js: [
            "export class Solitaire extends App {",
            '  static elementTag = core.defineElement(this, "test_sites", "App")',
            "}",
            "export const solitaire = new Solitaire()"
          ],
          ts: [
            "export class Solitaire extends App {",
            '  static elementTag = core.defineElement(this, "test_sites", "App")',
            "}",
            "",
            "/**",
            " * `<test-sites-app>`:  a solitaire, drawn in its own element, e.g. by `draw the solitaire`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its solitaire's properties;  its methods call its solitaire's.",
            " * - What every view's element does, e.g. drawing its solitaire, is `SpellElement`'s.",
            " */",
            "export class SolitaireElement extends SpellElement<Solitaire> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-app", "solitaire", [])',
            "}",
            "core.useElement(Solitaire, SolitaireElement)",
            "export const solitaire = new Solitaire()"
          ]
        }
      ]
    }
  ]
})

// a page of a site, at its address:  `- it has a film page at "/films/:film", named "Film"`
sites.addRule(SitePage, {
  roles: { band: "property" },
  syntax: `{type:subject_it} has (a|an) {part:site_part_words} at {address:text} ${PAGE_DETAILS} ${CARD_DETAILS} {with_nested_statements}?`
})

// ... with the subject left out:  `- has a film page at "/films/:film"`
sites.addRule(SitePage, {
  syntax: `{type:subject_implied} has (a|an) {part:site_part_words} at {address:text} ${PAGE_DETAILS} ${CARD_DETAILS} {with_nested_statements}?`
})

// a dialog or a sidebar of a site:  `- it has a settings dialog`, `- it has a syntax sidebar`
sites.addRule(SiteOverlay, { syntax: `{type:subject_it} has (a|an) {part:site_part_words} ${CARD_DETAILS}` })

// ... with the subject left out:  `- has a settings dialog`
sites.addRule(SiteOverlay, { syntax: `{type:subject_implied} has (a|an) {part:site_part_words} ${CARD_DETAILS}` })

// ... its name quoted, as any name may be:  `- it has a "page of films" at "/films"`
sites.addRule(SitePage, {
  syntax: `{type:subject_it} has (a|an) {part:quoted_member} at {address:text} ${PAGE_DETAILS} ${CARD_DETAILS} {with_nested_statements}?`
})
sites.addRule(SitePage, {
  syntax: `{type:subject_implied} has (a|an) {part:quoted_member} at {address:text} ${PAGE_DETAILS} ${CARD_DETAILS} {with_nested_statements}?`
})

// ... and a dialog or sidebar's:  `- it has a "dialog of settings"`
sites.addRule(SiteOverlay, { syntax: `{type:subject_it} has (a|an) {part:quoted_member} ${CARD_DETAILS}` })
sites.addRule(SiteOverlay, { syntax: `{type:subject_implied} has (a|an) {part:quoted_member} ${CARD_DETAILS}` })

// a link out of the site, in its navigation among its pages (epic `old-console-redo` I6):
// `- it has a link to "https://docs.example.com", named "Help", icon "book"`
sites.addRule(SiteLink, {
  syntax: `{type:subject_it} has (a|an) link to {address:text} (, named {title:text})? (, icon {icon:text})?`,
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          title: "a link among the pages, in its group:  the site lists it apart from them, with its place",
          input: [
            'a "home page" is a page',
            "galaxy guide is a site in the cloud:",
            '\tit has a home page at "/", named "Home"',
            '\tgroup "Help", icon "book"',
            '\tit has a link to "https://docs.example.com", named "Help", icon "book"'
          ],
          js: [
            "export class HomePage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "export class GalaxyGuide extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "home page",',
            '    page: "HomePage",',
            '    address: "/",',
            '    title: "Home"',
            "  }]",
            "  static links = [{",
            '    link: "https://docs.example.com",',
            '    title: "Help",',
            '    icon: "book",',
            '    group: "Help",',
            '    groupIcon: "book",',
            "    at: 1",
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "export const galaxyGuide = new GalaxyGuide()"
          ],
          ts: [
            "export class HomePage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "",
            "/**",
            " * `<test-sites-home-page>`:  a home page, drawn in its own element, e.g. by `draw the home page`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its home page's properties;  its methods call its home page's.",
            " * - What every view's element does, e.g. drawing its home page, is `SpellElement`'s.",
            " */",
            "export class HomePageElement extends SpellElement<HomePage> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-home-page", "home page", [])',
            "}",
            "core.useElement(HomePage, HomePageElement)",
            "export class GalaxyGuide extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "home page",',
            '    page: "HomePage",',
            '    address: "/",',
            '    title: "Home"',
            "  }]",
            "  static links = [{",
            '    link: "https://docs.example.com",',
            '    title: "Help",',
            '    icon: "book",',
            '    group: "Help",',
            '    groupIcon: "book",',
            "    at: 1",
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "",
            "/**",
            " * `<test-sites-galaxy-guide>`:  a galaxy guide, drawn in its own element, e.g. by `draw the galaxy guide`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its galaxy guide's properties;  its methods call its galaxy guide's.",
            " * - What every view's element does, e.g. drawing its galaxy guide, is `SpellElement`'s.",
            " */",
            "export class GalaxyGuideElement extends SpellElement<GalaxyGuide> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-galaxy-guide", "galaxy guide", [])',
            "}",
            "core.useElement(GalaxyGuide, GalaxyGuideElement)",
            "export const galaxyGuide = new GalaxyGuide()"
          ]
        },
        {
          title: "a link under a page:  that page lists it",
          input: [
            'a "films page" is a page',
            "galaxy guide is a site in the cloud:",
            '\tit has a films page at "/films"',
            '\t\tit has a link to "https://films.example.com"'
          ],
          js: [
            "export class FilmsPage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "export class GalaxyGuide extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "films page",',
            '    page: "FilmsPage",',
            '    address: "/films",',
            '    links: [{ link: "https://films.example.com", at: 0 }]',
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "export const galaxyGuide = new GalaxyGuide()"
          ],
          ts: [
            "export class FilmsPage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "",
            "/**",
            " * `<test-sites-films-page>`:  a films page, drawn in its own element, e.g. by `draw the films page`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its films page's properties;  its methods call its films page's.",
            " * - What every view's element does, e.g. drawing its films page, is `SpellElement`'s.",
            " */",
            "export class FilmsPageElement extends SpellElement<FilmsPage> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-films-page", "films page", [])',
            "}",
            "core.useElement(FilmsPage, FilmsPageElement)",
            "export class GalaxyGuide extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "films page",',
            '    page: "FilmsPage",',
            '    address: "/films",',
            '    links: [{ link: "https://films.example.com", at: 0 }]',
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "",
            "/**",
            " * `<test-sites-galaxy-guide>`:  a galaxy guide, drawn in its own element, e.g. by `draw the galaxy guide`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its galaxy guide's properties;  its methods call its galaxy guide's.",
            " * - What every view's element does, e.g. drawing its galaxy guide, is `SpellElement`'s.",
            " */",
            "export class GalaxyGuideElement extends SpellElement<GalaxyGuide> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-galaxy-guide", "galaxy guide", [])',
            "}",
            "core.useElement(GalaxyGuide, GalaxyGuideElement)",
            "export const galaxyGuide = new GalaxyGuide()"
          ]
        },
        {
          title: "an address from the site's root is a page's:  refused",
          input: ["galaxy guide is a site in the cloud:", '\tit has a link to "/help", named "Help"'],
          js: [
            "export class GalaxyGuide extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            '  static livesAt = "cloud"',
            "}",
            "export const galaxyGuide = new GalaxyGuide()",
            '/* PARSE ERROR: A link goes outside the site, to a whole address like "https://example.com";  "/help" is the site\'s own:  list its page, - it has a help page at "/help" */'
          ],
          ts: [
            "export class GalaxyGuide extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            '  static livesAt = "cloud"',
            "}",
            "",
            "/**",
            " * `<test-sites-galaxy-guide>`:  a galaxy guide, drawn in its own element, e.g. by `draw the galaxy guide`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its galaxy guide's properties;  its methods call its galaxy guide's.",
            " * - What every view's element does, e.g. drawing its galaxy guide, is `SpellElement`'s.",
            " */",
            "export class GalaxyGuideElement extends SpellElement<GalaxyGuide> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-galaxy-guide", "galaxy guide", [])',
            "}",
            "core.useElement(GalaxyGuide, GalaxyGuideElement)",
            "export const galaxyGuide = new GalaxyGuide()",
            '/* PARSE ERROR: A link goes outside the site, to a whole address like "https://example.com";  "/help" is the site\'s own:  list its page, - it has a help page at "/help" */'
          ]
        }
      ]
    }
  ]
})

// ... with the subject left out:  `- has a link to "https://docs.example.com"`
sites.addRule(SiteLink, {
  syntax: `{type:subject_implied} has (a|an) link to {address:text} (, named {title:text})? (, icon {icon:text})?`
})

////////////////
// ## Its not found and error pages (epic `mockup` P2)
////////////////

// a site's page for an address it has no page for:  `- it has a not found page`
sites.addRule(Wording.specialize({ ruleName: "site_not_found_page", meanings: [] }), {
  syntax: "(not found page|missing page)"
})

// a site's page for a page that failed:  `- it has an error page`
sites.addRule(Wording.specialize({ ruleName: "site_error_page", meanings: [] }), {
  syntax: "(error page|failure page)"
})

// `not` can't be in a member's name, so each has a line of its own:
// `- it has a not found page` (Spanish's `de` can't either:  `página de error`)
sites.addRule(SiteOverlay, { syntax: `{type:subject_it} has (a|an) {part:site_not_found_page} ${CARD_DETAILS}` })
sites.addRule(SiteOverlay, { syntax: `{type:subject_implied} has (a|an) {part:site_not_found_page} ${CARD_DETAILS}` })
sites.addRule(SiteOverlay, { syntax: `{type:subject_it} has (a|an) {part:site_error_page} ${CARD_DETAILS}` })
sites.addRule(SiteOverlay, { syntax: `{type:subject_implied} has (a|an) {part:site_error_page} ${CARD_DETAILS}` })

////////////////
// ## Going to its pages (epic `mockup` P2)
////////////////

// go to a page, its parameter filled:  `go to the film page for this film`
sites.addRule(ShowSitePart, { syntax: "go to the {part:site_part_words} ((for|with) {thing:expression})?" })
sites.addRule(ShowSitePart, { syntax: "go to the {part:quoted_member} ((for|with) {thing:expression})?" })

// show a page, or open a dialog or sidebar:  `show the film page with this film`, `show the settings dialog`
sites.addRule(ShowSitePart, { syntax: "show the {part:site_part_words} ((for|with) {thing:expression})?" })
sites.addRule(ShowSitePart, { syntax: "show the {part:quoted_member} ((for|with) {thing:expression})?" })

// close an open dialog or sidebar:  `close the review dialog` (epic `mockup` P8)
sites.addRule(ShowSitePart, { syntax: "(close:close) the {part:site_part_words}" })
sites.addRule(ShowSitePart, { syntax: "(close:close) the {part:quoted_member}" })

// a page's address, for a link:  `the address of the film page for this film`
sites.addRule(SiteAddressOf, { syntax: "the address of the {part:site_part_words} ((for|with) {thing:expression})?" })
