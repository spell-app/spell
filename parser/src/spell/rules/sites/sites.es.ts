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

// el diseño en el que está cada página de un sitio, salvo que su línea diga otro (épica `mockup` T39):
// `diseño principal es un diseño`
sitesEs.addRule(Wording.specialize({ ruleName: "site_main_layout", meanings: [] }), {
  syntax: "(diseño principal|diseno principal)"
})

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
  syntax: `{type:type_words} es ${A} {superType:type} (en {address:text}|(cloud:en la nube))? (con {defaults:object_literal_properties})? {with_nested_statements}?`,
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          title: "sus propios valores en su línea, como los de un tipo:  el tema de sus páginas (I30)",
          input: [
            'una "portada" es una página',
            'guía galáctica es un sitio con tema "mockup"',
            '\t- tiene una portada en "/"'
          ],
          js: [
            "export class Portada extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "export class GuíaGaláctica extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  get theme() {",
            '    return "mockup"',
            "  }",
            "  static pages = [{",
            '    name: "portada",',
            '    page: "Portada",',
            '    address: "/"',
            "  }]",
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
            "  get theme(): string {",
            '    return "mockup"',
            "  }",
            "  static pages = [{",
            '    name: "portada",',
            '    page: "Portada",',
            '    address: "/"',
            "  }]",
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
          title: "su tema en su cuerpo, como antes (P8)",
          input: ["guía galáctica es un sitio", '\tsu "tema" es "mockup"'],
          js: [
            "export class GuíaGaláctica extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "",
            "  get theme() {",
            '    return "mockup"',
            "  }",
            "}",
            "export const guíaGaláctica = new GuíaGaláctica()"
          ],
          ts: [
            "export class GuíaGaláctica extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "",
            "  get theme(): string {",
            '    return "mockup"',
            "  }",
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
          title: "una página elige su diseño en su línea;  el diseño principal del sitio es el de las demás (T39)",
          input: [
            "diseño principal es un diseño",
            "diseño sencillo es un diseño",
            "portada es una página",
            "entrada es una página, sin diseño",
            "impresión es una página, en el diseño sencillo",
            "guía galáctica es un sitio:",
            '\t- tiene una portada en "/"',
            '\t- tiene una entrada en "/entrar"',
            '\t- tiene una impresión en "/imprimir"'
          ],
          js: [
            "export class DiseñoPrincipal extends PageLayout {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "export const diseñoPrincipal = new DiseñoPrincipal()",
            "export class DiseñoSencillo extends PageLayout {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "export const diseñoSencillo = new DiseñoSencillo()",
            "export class Portada extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "export const portada = new Portada()",
            "export class Entrada extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static layout = false",
            "}",
            "export const entrada = new Entrada()",
            "export class Impresión extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            '  static layout = "DiseñoSencillo"',
            "}",
            "export const impresión = new Impresión()",
            "export class GuíaGaláctica extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "portada",',
            '    page: "Portada",',
            '    address: "/"',
            "  }, {",
            '    name: "entrada",',
            '    page: "Entrada",',
            '    address: "/entrar"',
            "  }, {",
            '    name: "impresión",',
            '    page: "Impresión",',
            '    address: "/imprimir"',
            "  }]",
            '  static mainLayout = "DiseñoPrincipal"',
            "}",
            "export const guíaGaláctica = new GuíaGaláctica()"
          ],
          ts: [
            "export class DiseñoPrincipal extends PageLayout {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "",
            "/**",
            " * `<test-sites-diseno-principal>`:  a diseño principal, drawn in its own element, e.g. by `draw the diseño principal`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its diseño principal's properties;  its methods call its diseño principal's.",
            " * - What every view's element does, e.g. drawing its diseño principal, is `SpellElement`'s.",
            " */",
            "export class DiseñoPrincipalElement extends SpellElement<DiseñoPrincipal> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-diseno-principal", "diseño principal", [])',
            "}",
            "core.useElement(DiseñoPrincipal, DiseñoPrincipalElement)",
            "export const diseñoPrincipal = new DiseñoPrincipal()",
            "export class DiseñoSencillo extends PageLayout {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "",
            "/**",
            " * `<test-sites-diseno-sencillo>`:  a diseño sencillo, drawn in its own element, e.g. by `draw the diseño sencillo`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its diseño sencillo's properties;  its methods call its diseño sencillo's.",
            " * - What every view's element does, e.g. drawing its diseño sencillo, is `SpellElement`'s.",
            " */",
            "export class DiseñoSencilloElement extends SpellElement<DiseñoSencillo> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-diseno-sencillo", "diseño sencillo", [])',
            "}",
            "core.useElement(DiseñoSencillo, DiseñoSencilloElement)",
            "export const diseñoSencillo = new DiseñoSencillo()",
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
            "export const portada = new Portada()",
            "export class Entrada extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static layout = false",
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
            "export const entrada = new Entrada()",
            "export class Impresión extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            '  static layout = "DiseñoSencillo"',
            "}",
            "",
            "/**",
            " * `<test-sites-impresion>`:  an impresión, drawn in its own element, e.g. by `draw the impresión`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its impresión's properties;  its methods call its impresión's.",
            " * - What every view's element does, e.g. drawing its impresión, is `SpellElement`'s.",
            " */",
            "export class ImpresiónElement extends SpellElement<Impresión> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-impresion", "impresión", [])',
            "}",
            "core.useElement(Impresión, ImpresiónElement)",
            "export const impresión = new Impresión()",
            "export class GuíaGaláctica extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "portada",',
            '    page: "Portada",',
            '    address: "/"',
            "  }, {",
            '    name: "entrada",',
            '    page: "Entrada",',
            '    address: "/entrar"',
            "  }, {",
            '    name: "impresión",',
            '    page: "Impresión",',
            '    address: "/imprimir"',
            "  }]",
            '  static mainLayout = "DiseñoPrincipal"',
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
