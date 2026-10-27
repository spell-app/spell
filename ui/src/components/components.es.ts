/**
 * Spell UI in Spanish:  `<es-boton primario color="rojo">` ~== `<ui-button primary color="red">`.
 * - `es`, the whole dictionary:  `<ui-root lang="es">` hands it to the runtime itself (`RootLoader.useLanguage()`).
 *   - From code, its names:  `UI.vocabulary.defineComponents({ prefix: "es", dictionary: es })`
 *   - and its texts:  `UI.i18n.registerDictionary(es)`
 * - Gathered from two kinds of file:
 *   - each tag's own, `UI<Name>.es.ts` beside its vocabulary:  its tag, the names only it uses, its texts, `aka`
 *   - this one:  the names several tags share (`size`, `ui-changed`), the shared value sets (hues, sizes ...)
 *     and `words`, every other value, each translated once;  and the texts every component shares
 * - What stays English:
 *   - the platform's own attributes, with their values:  `href`, `type` on a button or input, `name`, `value`,
 *     `min`, `max`, `closedby` ...
 *   - names that are names:  ad units (`leaderboard`), providers (`youtube`), emoji sets
 *   - every shared attribute's values (`animation="fade up"`):  Fomantic's names
 *   - CSS classes, `:state()`s, JavaScript properties, `detail` keys:  as in every language
 * - Names are ASCII (`tamano`, `sin-anios`);  values may hold accents (`pequeño`), and are found without them.
 * - A first draft, for a native speaker's review:  the epic `spanish` lists the choices one might make otherwise.
 * - Its place in the import graph:  a lazy chunk only a Spanish page loads (`RootLoader`'s languages).
 *   - Every tag file by name, not a glob:  a glob's module objects put Rolldown's helpers in a chunk of their own,
 *     one more request on every page (`yarn measure`'s `runtimeChunks`);  and node can load this file too.
 *   - A new tag's file goes in the list below:  the Spanish test fails on a tag `es` doesn't name.
 */

import { Vocabulary, type Dictionary } from "spell/ui/vocabulary"
import { accordionEs } from "spell/ui/components/ui-accordion/UIAccordion.es"
import { adEs } from "spell/ui/components/ui-ad/UIAd.es"
import { breadcrumbsEs } from "spell/ui/components/ui-breadcrumbs/UIBreadcrumbs.es"
import { breadcrumbEs } from "spell/ui/components/ui-breadcrumbs/UIBreadcrumb.es"
import { buttonEs } from "spell/ui/components/ui-button/UIButton.es"
import { actionEs } from "spell/ui/components/ui-action/UIAction.es"
import { buttonsEs } from "spell/ui/components/ui-button/UIButtons.es"
import { orEs } from "spell/ui/components/ui-button/UIOr.es"
import { calendarEs } from "spell/ui/components/ui-calendar/UICalendar.es"
import { cardEs } from "spell/ui/components/ui-card/UICard.es"
import { cardsEs } from "spell/ui/components/ui-card/UICards.es"
import { checkboxEs } from "spell/ui/components/ui-checkbox/UICheckbox.es"
import { radioEs } from "spell/ui/components/ui-checkbox/UIRadio.es"
import { codeEs } from "spell/ui/components/ui-code/UICode.es"
import { commentEs } from "spell/ui/components/ui-comment/UIComment.es"
import { commentsEs } from "spell/ui/components/ui-comment/UIComments.es"
import { componentsEs } from "spell/ui/components/ui-components/UIComponents.es"
import { containerEs } from "spell/ui/components/ui-container/UIContainer.es"
import { dimmerEs } from "spell/ui/components/ui-dimmer/UIDimmer.es"
import { dividerEs } from "spell/ui/components/ui-divider/UIDivider.es"
import { dropdownEs } from "spell/ui/components/ui-dropdown/UIDropdown.es"
import { embedEs } from "spell/ui/components/ui-embed/UIEmbed.es"
import { emojiEs } from "spell/ui/components/ui-emoji/UIEmoji.es"
import { feedEs } from "spell/ui/components/ui-feed/UIFeed.es"
import { eventEs } from "spell/ui/components/ui-feed/UIFeedEvent.es"
import { flagEs } from "spell/ui/components/ui-flag/UIFlag.es"
import { flyoutEs } from "spell/ui/components/ui-flyout/UIFlyout.es"
import { fieldEs } from "spell/ui/components/ui-form/UIField.es"
import { fieldsEs } from "spell/ui/components/ui-form/UIFields.es"
import { formEs } from "spell/ui/components/ui-form/UIForm.es"
import { repeatEs } from "spell/ui/components/ui-form/UIRepeat.es"
import { columnEs } from "spell/ui/components/ui-grid/UIColumn.es"
import { gridEs } from "spell/ui/components/ui-grid/UIGrid.es"
import { rowEs } from "spell/ui/components/ui-grid/UIRow.es"
import { iconEs } from "spell/ui/components/ui-icon/UIIcon.es"
import { iconsEs } from "spell/ui/components/ui-icon/UIIcons.es"
import { iconPickerEs } from "spell/ui/components/ui-icon-picker/UIIconPicker.es"
import { imageEs } from "spell/ui/components/ui-image/UIImage.es"
import { imagesEs } from "spell/ui/components/ui-image/UIImages.es"
import { includeEs } from "spell/ui/components/ui-include/UIInclude.es"
import { inputEs } from "spell/ui/components/ui-input/UIInput.es"
import { textareaEs } from "spell/ui/components/ui-input/UITextarea.es"
import { itemEs } from "spell/ui/components/ui-item/UIItem.es"
import { itemsEs } from "spell/ui/components/ui-items/UIItems.es"
import { labelEs } from "spell/ui/components/ui-label/UILabel.es"
import { labelsEs } from "spell/ui/components/ui-label/UILabels.es"
import { listEs } from "spell/ui/components/ui-list/UIList.es"
import { loaderEs } from "spell/ui/components/ui-loader/UILoader.es"
import { markdownEs } from "spell/ui/components/ui-markdown/UIMarkdown.es"
import { menuEs } from "spell/ui/components/ui-menu/UIMenu.es"
import { messageEs } from "spell/ui/components/ui-message/UIMessage.es"
import { modalEs } from "spell/ui/components/ui-modal/UIModal.es"
import { zoomEs } from "spell/ui/components/ui-zoom/UIZoom.es"
import { nagEs } from "spell/ui/components/ui-nag/UINag.es"
import { panelEs } from "spell/ui/components/ui-panel/UIPanel.es"
import { actionsEs } from "spell/ui/components/ui-parts/UIActions.es"
import { authorEs } from "spell/ui/components/ui-parts/UIAuthor.es"
import { avatarEs } from "spell/ui/components/ui-parts/UIAvatar.es"
import { contentEs } from "spell/ui/components/ui-parts/UIContent.es"
import { dateEs } from "spell/ui/components/ui-parts/UIDate.es"
import { descriptionEs } from "spell/ui/components/ui-parts/UIDescription.es"
import { detailEs } from "spell/ui/components/ui-parts/UIDetail.es"
import { extraEs } from "spell/ui/components/ui-parts/UIExtra.es"
import { headerEs } from "spell/ui/components/ui-parts/UIHeader.es"
import { metaEs } from "spell/ui/components/ui-parts/UIMeta.es"
import { summaryEs } from "spell/ui/components/ui-parts/UISummary.es"
import { titleEs } from "spell/ui/components/ui-parts/UITitle.es"
import { valueEs } from "spell/ui/components/ui-parts/UIValue.es"
import { placeholderEs } from "spell/ui/components/ui-placeholder/UIPlaceholder.es"
import { placeholderHeaderEs } from "spell/ui/components/ui-placeholder/UIPlaceholderHeader.es"
import { placeholderImageEs } from "spell/ui/components/ui-placeholder/UIPlaceholderImage.es"
import { placeholderLineEs } from "spell/ui/components/ui-placeholder/UIPlaceholderLine.es"
import { placeholderParagraphEs } from "spell/ui/components/ui-placeholder/UIPlaceholderParagraph.es"
import { popupEs } from "spell/ui/components/ui-popup/UIPopup.es"
import { progressEs } from "spell/ui/components/ui-progress/UIProgress.es"
import { propertyEs } from "spell/ui/components/ui-property-editor/UIProperty.es"
import { propertyEditorEs } from "spell/ui/components/ui-property-editor/UIPropertyEditor.es"
import { propertyGroupEs } from "spell/ui/components/ui-property-editor/UIPropertyGroup.es"
import { railEs } from "spell/ui/components/ui-rail/UIRail.es"
import { ratingEs } from "spell/ui/components/ui-rating/UIRating.es"
import { revealEs } from "spell/ui/components/ui-reveal/UIReveal.es"
import { rootEs } from "spell/ui/components/ui-root/UIRoot.es"
import { searchEs } from "spell/ui/components/ui-search/UISearch.es"
import { sectionEs } from "spell/ui/components/ui-section/UISection.es"
import { sectionsEs } from "spell/ui/components/ui-section/UISections.es"
import { segmentEs } from "spell/ui/components/ui-segment/UISegment.es"
import { segmentsEs } from "spell/ui/components/ui-segment/UISegments.es"
import { selectEs } from "spell/ui/components/ui-select/UISelect.es"
import { shapeEs } from "spell/ui/components/ui-shape/UIShape.es"
import { sideEs } from "spell/ui/components/ui-shape/UISide.es"
import { pushableEs } from "spell/ui/components/ui-sidebar/UIPushable.es"
import { pusherEs } from "spell/ui/components/ui-sidebar/UIPusher.es"
import { sidebarEs } from "spell/ui/components/ui-sidebar/UISidebar.es"
import { sliderEs } from "spell/ui/components/ui-slider/UISlider.es"
import { statisticEs } from "spell/ui/components/ui-statistic/UIStatistic.es"
import { statisticsEs } from "spell/ui/components/ui-statistic/UIStatistics.es"
import { stepEs } from "spell/ui/components/ui-step/UIStep.es"
import { stepsEs } from "spell/ui/components/ui-step/UISteps.es"
import { stickyEs } from "spell/ui/components/ui-sticky/UISticky.es"
import { tabEs } from "spell/ui/components/ui-tab/UITab.es"
import { tabsEs } from "spell/ui/components/ui-tab/UITabs.es"
import { quoteEs } from "spell/ui/components/ui-quote/UIQuote.es"
import { keysEs } from "spell/ui/components/ui-keys/UIKeys.es"
import { pageEs } from "spell/ui/components/ui-page/UIPage.es"
import { videoEs } from "spell/ui/components/ui-video/UIVideo.es"
import { audioEs } from "spell/ui/components/ui-video/UIAudio.es"
import { termsEs } from "spell/ui/components/ui-terms/UITerms.es"
import { termEs } from "spell/ui/components/ui-terms/UITerm.es"
import { stackEs } from "spell/ui/components/ui-stack/UIStack.es"
import { tableEs } from "spell/ui/components/ui-table/UITable.es"
import { cellEs } from "spell/ui/components/ui-table/UICell.es"
import { textEs } from "spell/ui/components/ui-text/UIText.es"
import { linkEs } from "spell/ui/components/ui-text/UILink.es"
import { themeEditorEs } from "spell/ui/components/ui-theme-editor/UIThemeEditor.es"
import { themeMenuEs } from "spell/ui/components/ui-theme-menu/UIThemeMenu.es"
import { tocEs } from "spell/ui/components/ui-toc/UIToc.es"
import { exampleEs } from "spell/ui/components/ui-example/UIExample.es"
import { toastEs } from "spell/ui/components/ui-toast/UIToast.es"
import { toolbarEs } from "spell/ui/components/ui-toolbar/UIToolbar.es"
import { transitionEs } from "spell/ui/components/ui-transition/UITransition.es"
import { treeDiagramEs } from "spell/ui/components/ui-tree-diagram/UITreeDiagram.es"
import { visibilityEs } from "spell/ui/components/ui-visibility/UIVisibility.es"

/** The Spanish names and texts every tag shares;  each tag's own are in its `UI<Name>.es.ts`. */
export const sharedEs = {
  lang: "es",
  attributes: {
    caption: "leyenda",
    styled: "estilizado",
    fluid: "fluido",
    inverted: "invertido",
    basic: "basico",
    compact: "compacto",
    tree: "arbol",
    collapsible: "plegable",
    open: "abierto",
    source: "fuente",
    parent: "padre",
    select: "seleccionar",
    selector: "selector",
    centered: "centrado",
    size: "tamano",
    active: "activo",
    color: "color",
    primary: "primario",
    secondary: "secundario",
    positive: "positivo",
    negative: "negativo",
    tertiary: "terciario",
    toggle: "alternable",
    loading: "cargando",
    circular: "circular",
    wrapped: "multilinea",
    labeled: "etiquetado",
    animated: "animado",
    attached: "unido",
    floated: "flotado",
    icon: "icono",
    "icon-position": "posicion-icono",
    content: "contenido",
    label: "etiqueta",
    vertical: "vertical",
    equal: "igual",
    wrapping: "envolvente",
    spaced: "espaciado",
    stackable: "apilable",
    width: "ancho",
    text: "texto",
    inline: "en-linea",
    position: "posicion",
    required: "requerido",
    readonly: "solo-lectura",
    placeholder: "marcador",
    horizontal: "horizontal",
    raised: "elevado",
    link: "enlace",
    header: "encabezado",
    heading: "encabezado",
    description: "descripcion",
    image: "imagen",
    columns: "columnas",
    doubling: "duplicable",
    "stack-with": "apilar-con",
    indeterminate: "indeterminado",
    fitted: "ajustado",
    invisible: "invisible",
    "right-aligned": "alineado-derecha",
    selected: "seleccionado",
    load: "carga",
    collapsed: "plegado",
    wide: "amplio",
    relaxed: "holgado",
    "text-align": "alinear-texto",
    scrolling: "desplazable",
    resizable: "redimensionable",
    blurring: "difuminado",
    simple: "simple",
    "vertical-align": "alinear-vertical",
    clearing: "despejado",
    state: "estado",
    selection: "seleccion",
    multiple: "multiple",
    floating: "flotante",
    clearable: "borrable",
    short: "corto",
    "very-short": "muy-corto",
    long: "largo",
    "very-long": "muy-largo",
    pointing: "apuntando",
    direction: "direccion",
    // epic `ui-gaps` P4 (Owen's request r1):  the renamed attributes
    padding: "relleno",
    spacing: "separacion",
    align: "alinear",
    attach: "unir",
    length: "longitud",
    wrap: "envolver",
    clip: "recorte",
    limit: "limite",
    reveal: "revelar",
    hover: "al-pasar",
    persistent: "persistente",
    kind: "clase",
    "min-characters": "min-caracteres",
    options: "opciones",
    ordered: "ordenado",
    divided: "dividido",
    fullscreen: "pantalla-completa",
    closable: "cerrable",
    hint: "pista",
    output: "salida",
    error: "error",
    apply: "aplicar",
    mixed: "mixto",
    rules: "reglas",
    unstackable: "no-apilable",
    widths: "anchos",
    "equal-width": "ancho-igual",
    validate: "validar",
    "error-focus": "enfocar-error",
    "prevent-leaving": "impedir-salida",
    debug: "depurar",
    items: "elementos",
    stretched: "estirado",
    only: "solo",
    celled: "con-celdas",
    padded: "con-relleno",
    reversed: "orden-inverso",
    bordered: "con-borde",
    corner: "esquina",
    avatar: "avatar",
    rounded: "redondeado",
    height: "alto",
    transparent: "transparente",
    tag: "rotulo",
    tinted: "tintado",
    speed: "velocidad",
    appearance: "apariencia",
    tabular: "tabular",
    fixed: "fijo",
    alignment: "alineacion",
    overlay: "superpuesto",
    "display-time": "tiempo-visible",
    level: "nivel",
    badge: "insignia",
    "fold-icon": "icono-plegar",
    sticky: "pegado",
    offset: "desplazamiento",
    dividing: "divisorio",
    block: "bloque",
    seamless: "sin-juntas",
    aligned: "alineado",
    collapsing: "contraido",
    stacked: "apilado",
    piled: "amontonado",
    duration: "duracion"
  },
  events: {
    "ui-opening": "abriendo",
    "ui-opened": "abierto",
    "ui-closing": "cerrando",
    "ui-closed": "cerrado",
    "ui-loading": "cargando",
    "ui-loaded": "cargado",
    "ui-error": "error",
    "ui-changing": "cambiando",
    "ui-changed": "cambiado",
    "ui-saving": "guardando",
    "ui-saved": "guardado",
    "ui-save-failed": "fallo-al-guardar",
    "ui-applying": "aplicando",
    "ui-applied": "aplicado",
    "ui-searched": "buscado",
    "ui-removing": "quitando",
    "ui-removed": "quitado",
    "ui-approving": "aprobando",
    "ui-approved": "aprobado",
    "ui-denying": "denegando",
    "ui-denied": "denegado",
    "ui-valid": "valido",
    "ui-invalid": "invalido",
    "ui-cancelling": "cancelando",
    "ui-cancelled": "cancelado",
    "ui-typed": "escrito",
    "ui-moved": "movido",
    "ui-choosing": "eligiendo",
    "ui-chosen": "elegido",
    "ui-selected": "seleccionado",
    "ui-deselected": "deseleccionado",
    "ui-animated": "animado",
    "ui-completed": "completado",
    "ui-copied": "copiado",
    "ui-drawn": "dibujado",
    "ui-navigating": "navegando"
  },
  slots: {
    caption: "leyenda",
    icon: "icono",
    label: "etiqueta",
    reply: "respuesta",
    description: "descripcion",
    hint: "pista",
    output: "salida",
    actions: "acciones",
    badge: "insignia"
  },
  parts: {
    caption: "leyenda",
    title: "titulo",
    icon: "icono",
    content: "contenido",
    error: "error",
    list: "lista",
    section: "seccion",
    divider: "divisor",
    button: "boton",
    label: "etiqueta",
    group: "grupo",
    input: "entrada",
    control: "control",
    trigger: "disparador",
    popup: "emergente",
    header: "encabezado",
    grid: "cuadricula",
    image: "imagen",
    meta: "meta",
    description: "descripcion",
    extra: "extra",
    checkbox: "casilla",
    loader: "cargador",
    box: "caja",
    reply: "respuesta",
    text: "texto",
    menu: "menu",
    item: "elemento",
    search: "busqueda",
    placeholder: "marcador",
    close: "cerrar",
    field: "campo",
    row: "fila",
    actions: "acciones",
    output: "salida",
    info: "info",
    tip: "consejo",
    hint: "pista",
    form: "formulario",
    debug: "depuracion",
    detail: "detalle",
    tabs: "solapas",
    tab: "solapa",
    editor: "editor",
    message: "mensaje",
    heading: "titular",
    toggle: "alternar",
    "fold-icon": "icono-plegar",
    badge: "insignia",
    subhead: "subtitulo",
    value: "valor",
    progress: "progreso",
    bar: "barra",
    "error-line": "linea-error",
    scroller: "desplazador"
  },
  values: {
    hues: {
      primary: "primario",
      secondary: "secundario",
      red: "rojo",
      orange: "naranja",
      yellow: "amarillo",
      olive: "oliva",
      green: "verde",
      teal: "turquesa",
      blue: "azul",
      violet: "violeta",
      purple: "morado",
      pink: "rosa",
      brown: "marrón",
      grey: "gris",
      black: "negro",
      positive: "positivo",
      negative: "negativo"
    },
    sizes: {
      mini: "mini",
      tiny: "diminuto",
      small: "pequeño",
      medium: "mediano",
      large: "grande",
      big: "muy grande",
      huge: "enorme",
      massive: "gigante"
    },
    positions: {
      "top left": "arriba izquierda",
      "top center": "arriba centro",
      "top right": "arriba derecha",
      "bottom left": "abajo izquierda",
      "bottom center": "abajo centro",
      "bottom right": "abajo derecha",
      "left center": "izquierda centro",
      "right center": "derecha centro",
      "left top": "izquierda arriba",
      "left bottom": "izquierda abajo",
      "right top": "derecha arriba",
      "right bottom": "derecha abajo"
    },
    attachments: {
      top: "arriba",
      bottom: "abajo",
      left: "izquierda",
      right: "derecha",
      "top left": "arriba izquierda",
      "top right": "arriba derecha",
      "bottom left": "abajo izquierda",
      "bottom right": "abajo derecha"
    },
    alignments: { left: "izquierda", center: "centro", right: "derecha", justified: "justificado" },
    verticalAlignments: { top: "arriba", middle: "medio", bottom: "abajo" },
    floats: { left: "izquierda", right: "derecha" },
    devices: {
      mobile: "móvil",
      tablet: "tableta",
      computer: "ordenador",
      "large screen": "pantalla grande",
      widescreen: "panorámica"
    },
    booleans: { true: "verdadero", false: "falso", yes: "sí", no: "no" },
    topics: {
      basic: "básico",
      layout: "diseño",
      containers: "contenedores",
      navigation: "navegación",
      menus: "menús",
      forms: "formularios",
      inputs: "entradas",
      controls: "controles",
      buttons: "botones",
      selection: "selección",
      "date & time": "fecha y hora",
      text: "texto",
      typography: "tipografía",
      media: "multimedia",
      images: "imágenes",
      icons: "iconos",
      "data display": "visualización de datos",
      lists: "listas",
      tables: "tablas",
      cards: "tarjetas",
      feedback: "respuesta",
      messages: "mensajes",
      notifications: "notificaciones",
      overlays: "superposiciones",
      dialogs: "diálogos",
      popups: "ventanas emergentes",
      loading: "carga",
      progress: "progreso",
      status: "estado",
      animation: "animación",
      social: "social",
      "content parts": "partes de contenido",
      documentation: "documentación",
      elements: "elementos",
      collections: "colecciones",
      views: "vistas",
      modules: "módulos"
    }
  },
  words: {
    very: "muy",
    left: "izquierda",
    right: "derecha",
    top: "arriba",
    bottom: "abajo",
    center: "centro",
    middle: "medio",
    "top left": "arriba izquierda",
    "top right": "arriba derecha",
    "bottom left": "abajo izquierda",
    "bottom right": "abajo derecha",
    corner: "esquina",
    "left corner": "esquina izquierda",
    fade: "desvanecer",
    vertical: "vertical",
    date: "fecha",
    time: "hora",
    datetime: "fecha y hora",
    month: "mes",
    year: "año",
    container: "contenedor",
    page: "página",
    slider: "deslizador",
    toggle: "interruptor",
    eager: "inmediato",
    visible: "visible",
    idle: "en reposo",
    lazy: "diferido",
    short: "corto",
    "very short": "muy corto",
    long: "largo",
    "very long": "muy largo",
    medium: "mediano",
    light: "claro",
    "very light": "muy claro",
    dark: "oscuro",
    hover: "encima",
    click: "clic",
    focus: "foco",
    manual: "manual",
    none: "ninguno",
    error: "error",
    info: "información",
    success: "éxito",
    warning: "advertencia",
    positive: "positivo",
    negative: "negativo",
    neutral: "neutro",
    small: "pequeño",
    large: "grande",
    big: "muy grande",
    huge: "enorme",
    massive: "gigante",
    immediately: "al instante",
    "on leave": "al salir",
    "on save": "al guardar",
    mobile: "móvil",
    tablet: "tableta",
    computer: "ordenador",
    "large screen": "pantalla grande",
    widescreen: "panorámica",
    "mobile vertically": "móvil verticalmente",
    "tablet vertically": "tableta verticalmente",
    "computer vertically": "ordenador verticalmente",
    vertically: "verticalmente",
    horizontally: "horizontalmente",
    internally: "internamente",
    clockwise: "horario",
    counterclockwise: "antihorario",
    halfway: "media vuelta",
    item: "elemento",
    header: "encabezado",
    divider: "divisor",
    above: "encima",
    below: "debajo",
    slow: "lento",
    fast: "rápido",
    tabular: "tabular",
    pointing: "apuntando",
    secondary: "secundario",
    text: "texto",
    segmented: "segmentado",
    fluid: "fluido",
    start: "inicio",
    end: "fin",
    full: "completo",
    filling: "llenando",
    sliding: "deslizando",
    swinging: "balanceando",
    percent: "porcentaje",
    ratio: "proporción",
    up: "arriba",
    down: "abajo",
    skeleton: "esqueleto",
    "when-ready": "cuando esté listo",
    exact: "exacto",
    fuzzy: "aproximado",
    prefix: "prefijo",
    some: "algunas",
    all: "todas",
    tall: "alto",
    over: "encima",
    back: "atrás",
    overlay: "superpuesto",
    push: "empujar",
    "scale down": "reducir",
    uncover: "descubrir",
    "slide along": "deslizar junto",
    "slide out": "deslizar fuera",
    automatic: "automático",
    viewport: "ventana",
    head: "cabecera",
    foot: "pie",
    first: "primera",
    last: "última",
    ascending: "ascendente",
    descending: "descendente",
    basic: "básico",
    attached: "unido",
    image: "imagen",
    square: "cuadrado"
  },
  texts: {
    close: "Cerrar",
    cancel: "Cancelar",
    ok: "Aceptar",
    noResults: "No se encontraron resultados.",
    addItem: "Añadir {value}",
    loading: "Cargando…",
    today: "Hoy",
    clear: "Borrar",
    removeValue: "Quitar {value}",
    selectAll: "Seleccionar todo",
    more: "Más",
    less: "Menos",
    required: "Obligatorio",
    invalid: "Valor no válido"
  }
} as const satisfies Dictionary

/** Spell UI in Spanish:  every tag's names and texts, for `defineComponents()` and `UI.i18n`. */
export const es: Dictionary = Vocabulary.dictionaryFrom(sharedEs, [
  accordionEs,
  adEs,
  breadcrumbsEs,
  breadcrumbEs,
  buttonEs,
  buttonsEs,
  orEs,
  calendarEs,
  cardEs,
  cardsEs,
  checkboxEs,
  radioEs,
  codeEs,
  commentEs,
  commentsEs,
  componentsEs,
  containerEs,
  dimmerEs,
  dividerEs,
  dropdownEs,
  embedEs,
  emojiEs,
  feedEs,
  eventEs,
  flagEs,
  flyoutEs,
  fieldEs,
  fieldsEs,
  formEs,
  repeatEs,
  columnEs,
  gridEs,
  rowEs,
  iconEs,
  iconsEs,
  iconPickerEs,
  imageEs,
  imagesEs,
  includeEs,
  inputEs,
  textareaEs,
  itemEs,
  itemsEs,
  labelEs,
  labelsEs,
  listEs,
  loaderEs,
  markdownEs,
  menuEs,
  messageEs,
  modalEs,
  zoomEs,
  nagEs,
  panelEs,
  actionsEs,
  actionEs,
  authorEs,
  avatarEs,
  contentEs,
  dateEs,
  descriptionEs,
  detailEs,
  extraEs,
  headerEs,
  metaEs,
  summaryEs,
  titleEs,
  valueEs,
  placeholderEs,
  placeholderHeaderEs,
  placeholderImageEs,
  placeholderLineEs,
  placeholderParagraphEs,
  popupEs,
  progressEs,
  propertyEs,
  propertyEditorEs,
  propertyGroupEs,
  railEs,
  ratingEs,
  revealEs,
  rootEs,
  searchEs,
  sectionEs,
  sectionsEs,
  segmentEs,
  segmentsEs,
  selectEs,
  shapeEs,
  sideEs,
  pushableEs,
  pusherEs,
  sidebarEs,
  sliderEs,
  statisticEs,
  statisticsEs,
  stepEs,
  stepsEs,
  stickyEs,
  tabEs,
  tabsEs,
  stackEs,
  quoteEs,
  keysEs,
  pageEs,
  videoEs,
  audioEs,
  termsEs,
  termEs,
  tableEs,
  cellEs,
  textEs,
  linkEs,
  themeEditorEs,
  themeMenuEs,
  tocEs,
  exampleEs,
  toastEs,
  toolbarEs,
  transitionEs,
  treeDiagramEs,
  visibilityEs
])
