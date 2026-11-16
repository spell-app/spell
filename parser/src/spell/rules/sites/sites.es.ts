/**
 * The `sites` rule module's Spanish:  the same classes as `sites.en.ts`, in the same order (epic `mockup` P1).
 * - Each word through the glossary, `languages/es/GLOSSARY.md`.
 */
import { Synonyms, Wording } from "spell/parser/spell/rules/expressions"
import { DefineGroup } from "spell/parser/spell/rules/classes"
import { SpellParser } from "spell/parser/spell/SpellParser"
import { CreateSite } from "./CreateSite"
import { SiteOverlay } from "./SiteOverlay"
import { SitePage } from "./SitePage"
import { ShowSitePart } from "./ShowSitePart"
import { SiteAddressOf } from "./SiteAddressOf"
import { SitePartWords } from "./SitePartWords"

/** The `sites` rule module, in Spanish. */
export const sitesEs = new SpellParser({ module: "sites" })

/** Lo que la línea de una página dice tras su dirección. */
const PAGE_DETAILS =
  "(, (llamada|llamado) {title:text})? (, icono {icon:text})? (, pestaña {tab:text})? (, (etiquetada|etiquetado) {tags:text})? (, {state:site_page_state})? (, miniatura {thumbnail:text})? (, en vivo {live:text})? (, (no_top_bar:sin barra superior))?"

/** An indefinite article, either gender:  `un sitio`, `una página`. */
const A = "(un|una)"

// la palabra de un diálogo de un sitio, la primera en español:  `- tiene un diálogo de ajustes`
sitesEs.addRule(Synonyms.specialize({ ruleName: "site_dialog" }), { syntax: "(diálogo|dialogo|modal)" })

// la de un panel lateral:  `- tiene un panel de sintaxis`
sitesEs.addRule(Synonyms.specialize({ ruleName: "site_sidebar" }), { syntax: "(panel|lateral)" })

// la barra superior de un sitio, para `site_overlay`:  `- tiene una barra superior` (epic `mockup` T35)
sitesEs.addRule(Wording.specialize({ ruleName: "site_top_bar", meanings: [] }), { syntax: "(barra superior|cabecera)" })

// en qué estado está una página, al final de su línea:  `- tiene una película en "/peliculas", antigua` (epic `mockup` P13, T14)
sitesEs.addRule(Wording.specialize({ ruleName: "site_page_state", meanings: ["old", "new", "mocked", "built"] }), {
  syntax: "((old:antigua|antiguo)|(new:nueva|nuevo)|(mocked:maquetada|maquetado)|(built:construida|construido))"
})

// el color de la tarjeta de una parte en el tablero del editor, uno de los de Spell UI
sitesEs.addRule(
  Wording.specialize({
    ruleName: "site_card_color",
    meanings: ["red", "orange", "yellow", "olive", "green", "teal", "blue", "violet", "purple", "pink", "brown", "grey"]
  }),
  {
    syntax:
      "((red:rojo)|(orange:naranja)|(yellow:amarillo)|(olive:oliva)|(green:verde)|(teal:turquesa)|(blue:azul)|(violet:violeta)|(purple:morado)|(pink:rosa)|(brown:marrón)|(brown:marron)|(grey:gris))"
  }
)

// un grupo de las partes de un sitio, su sección del tablero del editor en un color (epic `language` T112):
// `grupo "Hardware", color amarillo`, `grupo "Hardware" con color amarillo`, o como la línea de una parte, `, de color amarillo`
// - no compila a nada, como cualquier grupo
// - `, icono "microchip"` tras él:  el icono ante el nombre del grupo en la navegación del sitio (epic `mockup` I20)
sitesEs.addRule(DefineGroup, {
  syntax:
    "{type:subject_implied} grupo {group:text} ((con|,) color|, de color) {color:site_card_color} (, icono {icon:text})?",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          title: "un grupo de color encabeza sus páginas, como cualquier grupo",
          input: [
            'una "portada" es una página',
            "guía galáctica es un sitio en la nube:",
            '\tgrupo "Inicio", color rojo',
            '\ttiene una portada en "/"'
          ],
          js: [
            "export class Portada extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "export class GuíaGaláctica extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "portada",',
            '    page: "Portada",',
            '    address: "/",',
            '    group: "Inicio"',
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "export const guíaGaláctica = new GuíaGaláctica()"
          ],
          ts: [
            "export class Portada extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "",
            "/**",
            " * `<test-sites-portada>`:  a portada, drawn in its own element, e.g. by `draw the portada`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its portada's properties;  its methods call its portada's.",
            " * - What every view's element does, e.g. drawing its portada, is `SpellElement`'s.",
            " */",
            "export class PortadaElement extends SpellElement<Portada> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-portada", "portada", [])',
            "}",
            "core.useElement(Portada, PortadaElement)",
            "export class GuíaGaláctica extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "portada",',
            '    page: "Portada",',
            '    address: "/",',
            '    group: "Inicio"',
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "",
            "/**",
            " * `<test-sites-guia-galactica>`:  a guía galáctica, drawn in its own element, e.g. by `draw the guía galáctica`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its guía galáctica's properties;  its methods call its guía galáctica's.",
            " * - What every view's element does, e.g. drawing its guía galáctica, is `SpellElement`'s.",
            " */",
            "export class GuíaGalácticaElement extends SpellElement<GuíaGaláctica> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-guia-galactica", "guía galáctica", [])',
            "}",
            "core.useElement(GuíaGaláctica, GuíaGalácticaElement)",
            "export const guíaGaláctica = new GuíaGaláctica()"
          ]
        },
        {
          title: "con color, como dice la línea de cabeza de una acción",
          input: [
            'una "portada" es una página',
            "guía galáctica es un sitio en la nube:",
            '\tgrupo "Inicio" con color rojo',
            '\ttiene una portada en "/"'
          ],
          js: [
            "export class Portada extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "export class GuíaGaláctica extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "portada",',
            '    page: "Portada",',
            '    address: "/",',
            '    group: "Inicio"',
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "export const guíaGaláctica = new GuíaGaláctica()"
          ],
          ts: [
            "export class Portada extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "",
            "/**",
            " * `<test-sites-portada>`:  a portada, drawn in its own element, e.g. by `draw the portada`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its portada's properties;  its methods call its portada's.",
            " * - What every view's element does, e.g. drawing its portada, is `SpellElement`'s.",
            " */",
            "export class PortadaElement extends SpellElement<Portada> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-portada", "portada", [])',
            "}",
            "core.useElement(Portada, PortadaElement)",
            "export class GuíaGaláctica extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "portada",',
            '    page: "Portada",',
            '    address: "/",',
            '    group: "Inicio"',
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "",
            "/**",
            " * `<test-sites-guia-galactica>`:  a guía galáctica, drawn in its own element, e.g. by `draw the guía galáctica`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its guía galáctica's properties;  its methods call its guía galáctica's.",
            " * - What every view's element does, e.g. drawing its guía galáctica, is `SpellElement`'s.",
            " */",
            "export class GuíaGalácticaElement extends SpellElement<GuíaGaláctica> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-guia-galactica", "guía galáctica", [])',
            "}",
            "core.useElement(GuíaGaláctica, GuíaGalácticaElement)",
            "export const guíaGaláctica = new GuíaGaláctica()"
          ]
        },
        {
          title: "de color, como lo dice la línea de una parte",
          input: [
            'una "portada" es una página',
            "guía galáctica es un sitio en la nube:",
            '\tgrupo "Inicio", de color rojo',
            '\ttiene una portada en "/"'
          ],
          js: [
            "export class Portada extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "export class GuíaGaláctica extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "portada",',
            '    page: "Portada",',
            '    address: "/",',
            '    group: "Inicio"',
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "export const guíaGaláctica = new GuíaGaláctica()"
          ],
          ts: [
            "export class Portada extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "",
            "/**",
            " * `<test-sites-portada>`:  a portada, drawn in its own element, e.g. by `draw the portada`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its portada's properties;  its methods call its portada's.",
            " * - What every view's element does, e.g. drawing its portada, is `SpellElement`'s.",
            " */",
            "export class PortadaElement extends SpellElement<Portada> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-portada", "portada", [])',
            "}",
            "core.useElement(Portada, PortadaElement)",
            "export class GuíaGaláctica extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "portada",',
            '    page: "Portada",',
            '    address: "/",',
            '    group: "Inicio"',
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "",
            "/**",
            " * `<test-sites-guia-galactica>`:  a guía galáctica, drawn in its own element, e.g. by `draw the guía galáctica`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its guía galáctica's properties;  its methods call its guía galáctica's.",
            " * - What every view's element does, e.g. drawing its guía galáctica, is `SpellElement`'s.",
            " */",
            "export class GuíaGalácticaElement extends SpellElement<GuíaGaláctica> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-guia-galactica", "guía galáctica", [])',
            "}",
            "core.useElement(GuíaGaláctica, GuíaGalácticaElement)",
            "export const guíaGaláctica = new GuíaGaláctica()"
          ]
        },
        {
          title: "un icono tras su color:  sus páginas lo llevan, para la línea del grupo en la navegación",
          input: [
            'una "portada" es una página',
            "guía galáctica es un sitio en la nube:",
            '\tgrupo "Inicio", color rojo, icono "home"',
            '\ttiene una portada en "/"'
          ],
          js: [
            "export class Portada extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "export class GuíaGaláctica extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "portada",',
            '    page: "Portada",',
            '    address: "/",',
            '    group: "Inicio",',
            '    groupIcon: "home"',
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "export const guíaGaláctica = new GuíaGaláctica()"
          ],
          ts: [
            "export class Portada extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "",
            "/**",
            " * `<test-sites-portada>`:  a portada, drawn in its own element, e.g. by `draw the portada`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its portada's properties;  its methods call its portada's.",
            " * - What every view's element does, e.g. drawing its portada, is `SpellElement`'s.",
            " */",
            "export class PortadaElement extends SpellElement<Portada> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-portada", "portada", [])',
            "}",
            "core.useElement(Portada, PortadaElement)",
            "export class GuíaGaláctica extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "portada",',
            '    page: "Portada",',
            '    address: "/",',
            '    group: "Inicio",',
            '    groupIcon: "home"',
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "",
            "/**",
            " * `<test-sites-guia-galactica>`:  a guía galáctica, drawn in its own element, e.g. by `draw the guía galáctica`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its guía galáctica's properties;  its methods call its guía galáctica's.",
            " * - What every view's element does, e.g. drawing its guía galáctica, is `SpellElement`'s.",
            " */",
            "export class GuíaGalácticaElement extends SpellElement<GuíaGaláctica> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-guia-galactica", "guía galáctica", [])',
            "}",
            "core.useElement(GuíaGaláctica, GuíaGalácticaElement)",
            "export const guíaGaláctica = new GuíaGaláctica()"
          ]
        }
      ]
    }
  ]
})

// un grupo de un sitio con icono y sin color:  `grupo "Hardware", icono "microchip"` (epic `mockup` I20)
sitesEs.addRule(DefineGroup, {
  syntax: "{type:subject_implied} grupo {group:text}, icono {icon:text}",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          title: "un icono solo:  sus páginas lo llevan, para la línea del grupo en la navegación",
          input: [
            'una "portada" es una página',
            "guía galáctica es un sitio en la nube:",
            '\tgrupo "Inicio", icono "home"',
            '\ttiene una portada en "/"'
          ],
          js: [
            "export class Portada extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "export class GuíaGaláctica extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "portada",',
            '    page: "Portada",',
            '    address: "/",',
            '    group: "Inicio",',
            '    groupIcon: "home"',
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "export const guíaGaláctica = new GuíaGaláctica()"
          ],
          ts: [
            "export class Portada extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "",
            "/**",
            " * `<test-sites-portada>`:  a portada, drawn in its own element, e.g. by `draw the portada`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its portada's properties;  its methods call its portada's.",
            " * - What every view's element does, e.g. drawing its portada, is `SpellElement`'s.",
            " */",
            "export class PortadaElement extends SpellElement<Portada> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-portada", "portada", [])',
            "}",
            "core.useElement(Portada, PortadaElement)",
            "export class GuíaGaláctica extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "portada",',
            '    page: "Portada",',
            '    address: "/",',
            '    group: "Inicio",',
            '    groupIcon: "home"',
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "",
            "/**",
            " * `<test-sites-guia-galactica>`:  a guía galáctica, drawn in its own element, e.g. by `draw the guía galáctica`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its guía galáctica's properties;  its methods call its guía galáctica's.",
            " * - What every view's element does, e.g. drawing its guía galáctica, is `SpellElement`'s.",
            " */",
            "export class GuíaGalácticaElement extends SpellElement<GuíaGaláctica> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-guia-galactica", "guía galáctica", [])',
            "}",
            "core.useElement(GuíaGaláctica, GuíaGalácticaElement)",
            "export const guíaGaláctica = new GuíaGaláctica()"
          ]
        }
      ]
    }
  ]
})

// the words naming a site's part, `of` / `de` included (epic `mockup` P3, T5)
sitesEs.addRule(SitePartWords, {
  tests: [
    {
      tests: [
        { title: "un nombre", input: "portada", js: "portada" },
        { title: "unido por de", input: "página de película", js: "páginaDePelícula" },
        { title: "de ante un artículo lo termina", input: "página de la", js: "página" }
      ]
    }
  ]
})

// un sitio, y dónde vive:  `spell ui es un sitio en "owen@spell/spell-ui":`, `guía galáctica es un sitio en la nube`
sitesEs.addRule(CreateSite, {
  syntax: `{type:type_words} es ${A} {superType:type} (en {address:text}|(cloud:en la nube))? {with_nested_statements}?`,
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          title:
            "una barra superior, sus botones una vista de su nombre, sobre cada página salvo una sin barra superior",
          input: [
            'una "portada" es una página',
            'una "entrada" es una página',
            'una "barra superior" es una vista',
            "guía galáctica es un sitio:",
            "\t- tiene una barra superior",
            '\t- tiene una portada en "/"',
            '\t- tiene una entrada en "/entrar", sin barra superior'
          ],
          js: [
            "export class Portada extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "export class Entrada extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "export class BarraSuperior extends View {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "export class GuíaGaláctica extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "portada",',
            '    page: "Portada",',
            '    address: "/"',
            "  }, {",
            '    name: "entrada",',
            '    page: "Entrada",',
            '    address: "/entrar",',
            "    noTopBar: true",
            "  }]",
            '  static topBar = { name: "barra superior", view: "BarraSuperior" }',
            "}",
            "export const guíaGaláctica = new GuíaGaláctica()"
          ],
          ts: [
            "export class Portada extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "",
            "/**",
            " * `<test-sites-portada>`:  a portada, drawn in its own element, e.g. by `draw the portada`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its portada's properties;  its methods call its portada's.",
            " * - What every view's element does, e.g. drawing its portada, is `SpellElement`'s.",
            " */",
            "export class PortadaElement extends SpellElement<Portada> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-portada", "portada", [])',
            "}",
            "core.useElement(Portada, PortadaElement)",
            "export class Entrada extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "",
            "/**",
            " * `<test-sites-entrada>`:  an entrada, drawn in its own element, e.g. by `draw the entrada`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its entrada's properties;  its methods call its entrada's.",
            " * - What every view's element does, e.g. drawing its entrada, is `SpellElement`'s.",
            " */",
            "export class EntradaElement extends SpellElement<Entrada> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-entrada", "entrada", [])',
            "}",
            "core.useElement(Entrada, EntradaElement)",
            "export class BarraSuperior extends View {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "",
            "/**",
            " * `<test-sites-barra-superior>`:  a barra superior, drawn in its own element, e.g. by `draw the barra superior`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its barra superior's properties;  its methods call its barra superior's.",
            " * - What every view's element does, e.g. drawing its barra superior, is `SpellElement`'s.",
            " */",
            "export class BarraSuperiorElement extends SpellElement<BarraSuperior> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-barra-superior", "barra superior", [])',
            "}",
            "core.useElement(BarraSuperior, BarraSuperiorElement)",
            "export class GuíaGaláctica extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "portada",',
            '    page: "Portada",',
            '    address: "/"',
            "  }, {",
            '    name: "entrada",',
            '    page: "Entrada",',
            '    address: "/entrar",',
            "    noTopBar: true",
            "  }]",
            '  static topBar = { name: "barra superior", view: "BarraSuperior" }',
            "}",
            "",
            "/**",
            " * `<test-sites-guia-galactica>`:  a guía galáctica, drawn in its own element, e.g. by `draw the guía galáctica`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its guía galáctica's properties;  its methods call its guía galáctica's.",
            " * - What every view's element does, e.g. drawing its guía galáctica, is `SpellElement`'s.",
            " */",
            "export class GuíaGalácticaElement extends SpellElement<GuíaGaláctica> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-guia-galactica", "guía galáctica", [])',
            "}",
            "core.useElement(GuíaGaláctica, GuíaGalácticaElement)",
            "export const guíaGaláctica = new GuíaGaláctica()"
          ]
        },
        {
          title: "un sitio en la nube, y su página",
          input: [
            'una "portada" es una página',
            "guía galáctica es un sitio en la nube:",
            '\t- tiene una portada en "/", icono "home"'
          ],
          js: [
            "export class Portada extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "export class GuíaGaláctica extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "portada",',
            '    page: "Portada",',
            '    address: "/",',
            '    icon: "home"',
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "export const guíaGaláctica = new GuíaGaláctica()"
          ],
          ts: [
            "export class Portada extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "",
            "/**",
            " * `<test-sites-portada>`:  a portada, drawn in its own element, e.g. by `draw the portada`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its portada's properties;  its methods call its portada's.",
            " * - What every view's element does, e.g. drawing its portada, is `SpellElement`'s.",
            " */",
            "export class PortadaElement extends SpellElement<Portada> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-portada", "portada", [])',
            "}",
            "core.useElement(Portada, PortadaElement)",
            "export class GuíaGaláctica extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "portada",',
            '    page: "Portada",',
            '    address: "/",',
            '    icon: "home"',
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "",
            "/**",
            " * `<test-sites-guia-galactica>`:  a guía galáctica, drawn in its own element, e.g. by `draw the guía galáctica`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its guía galáctica's properties;  its methods call its guía galáctica's.",
            " * - What every view's element does, e.g. drawing its guía galáctica, is `SpellElement`'s.",
            " */",
            "export class GuíaGalácticaElement extends SpellElement<GuíaGaláctica> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-guia-galactica", "guía galáctica", [])',
            "}",
            "core.useElement(GuíaGaláctica, GuíaGalácticaElement)",
            "export const guíaGaláctica = new GuíaGaláctica()"
          ]
        }
      ]
    }
  ]
})

/** Con lo que puede terminar la línea de cualquier parte:  su lugar en su sección del tablero del editor, y su color. */
const CARD_DETAILS = "(, en la fila {row:number} columna {column:number})? (, de color {color:site_card_color})?"

// una página del sitio, en su dirección:  `- tiene una página de película en "/peliculas/:pelicula", llamada "Película"`
sitesEs.addRule(SitePage, {
  syntax: `{type:subject_it} tiene ${A} {part:site_part_words} en {address:text} ${PAGE_DETAILS} ${CARD_DETAILS} {with_nested_statements}?`
})

// ... sin el sujeto, como se dice en español:  `- tiene una página de película en "/peliculas/:pelicula"`
sitesEs.addRule(SitePage, {
  syntax: `{type:subject_implied} tiene ${A} {part:site_part_words} en {address:text} ${PAGE_DETAILS} ${CARD_DETAILS} {with_nested_statements}?`
})

// un diálogo o un panel del sitio:  `- tiene un diálogo de ajustes`, `- tiene un panel de sintaxis`
sitesEs.addRule(SiteOverlay, { syntax: `{type:subject_it} tiene ${A} {part:site_part_words} ${CARD_DETAILS}` })

// ... sin el sujeto:  `- tiene un diálogo de ajustes`
sitesEs.addRule(SiteOverlay, { syntax: `{type:subject_implied} tiene ${A} {part:site_part_words} ${CARD_DETAILS}` })

// ... con el nombre entre comillas, como se nombra en español lo que lleva `de`:
// `- tiene una "página de película" en "/peliculas/:película"`
sitesEs.addRule(SitePage, {
  syntax: `{type:subject_it} tiene ${A} {part:quoted_member} en {address:text} ${PAGE_DETAILS} ${CARD_DETAILS} {with_nested_statements}?`
})
sitesEs.addRule(SitePage, {
  syntax: `{type:subject_implied} tiene ${A} {part:quoted_member} en {address:text} ${PAGE_DETAILS} ${CARD_DETAILS} {with_nested_statements}?`
})

// ... y un diálogo o un panel:  `- tiene un "diálogo de ajustes"`, `- tiene un "panel de películas"`
sitesEs.addRule(SiteOverlay, { syntax: `{type:subject_it} tiene ${A} {part:quoted_member} ${CARD_DETAILS}` })
sitesEs.addRule(SiteOverlay, { syntax: `{type:subject_implied} tiene ${A} {part:quoted_member} ${CARD_DETAILS}` })

////////////////
// ## Sus páginas de no encontrada y de error (epic `mockup` P2)
////////////////

// la página de un sitio para una dirección que no tiene:  `- tiene una página no encontrada`
sitesEs.addRule(Wording.specialize({ ruleName: "site_not_found_page", meanings: [] }), {
  syntax: "(página no encontrada|pagina no encontrada)"
})

// la de una página que falló:  `- tiene una página de error`
sitesEs.addRule(Wording.specialize({ ruleName: "site_error_page", meanings: [] }), {
  syntax: "(página de error|pagina de error)"
})

// `no` y `de` no caben en el nombre de un miembro:  cada una tiene su propia línea
sitesEs.addRule(SiteOverlay, { syntax: `{type:subject_it} tiene ${A} {part:site_not_found_page} ${CARD_DETAILS}` })
sitesEs.addRule(SiteOverlay, { syntax: `{type:subject_implied} tiene ${A} {part:site_not_found_page} ${CARD_DETAILS}` })
sitesEs.addRule(SiteOverlay, { syntax: `{type:subject_it} tiene ${A} {part:site_error_page} ${CARD_DETAILS}` })
sitesEs.addRule(SiteOverlay, { syntax: `{type:subject_implied} tiene ${A} {part:site_error_page} ${CARD_DETAILS}` })

////////////////
// ## Ir a sus páginas (epic `mockup` P2)
////////////////

// ir a una página, con su parámetro:  `ir a la página de película con esta película`
sitesEs.addRule(ShowSitePart, { syntax: "ir a (la|el) {part:site_part_words} ((para|con) {thing:expression})?" })
sitesEs.addRule(ShowSitePart, { syntax: "ir a (la|el) {part:quoted_member} ((para|con) {thing:expression})?" })

// mostrar una página, o abrir un diálogo o un panel:  `mostrar el diálogo de ajustes`
sitesEs.addRule(ShowSitePart, { syntax: "mostrar (la|el) {part:site_part_words} ((para|con) {thing:expression})?" })
sitesEs.addRule(ShowSitePart, { syntax: "mostrar (la|el) {part:quoted_member} ((para|con) {thing:expression})?" })

// cerrar un diálogo o una barra lateral abiertos:  `cerrar el diálogo de reseña`
sitesEs.addRule(ShowSitePart, { syntax: "(close:cerrar) (la|el) {part:site_part_words}" })
sitesEs.addRule(ShowSitePart, { syntax: "(close:cerrar) (la|el) {part:quoted_member}" })

// la dirección de una página, para un enlace:  `la dirección de la página de película con esta película`
sitesEs.addRule(SiteAddressOf, {
  syntax: "la (dirección|direccion) de (la|el) {part:site_part_words} ((para|con) {thing:expression})?"
})
