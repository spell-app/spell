import { core, Thing, App, Place, h } from "@spell/core"

core.heading("Administración de la org:  dónde se guardan los roles de una org")
//////////////////////////////////////////////////////////////////////
// ## Administración de la org:  dónde se guardan los roles de una org
//////////////////////////////////////////////////////////////////////

export class Miembro extends Thing {
  // su "persona" es texto, guardado como "person"
  static { this.declareProp("persona", { type: "text", storedAs: "person", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 932, end: 977 } }) }
  get persona() { return this.getProp("persona") }
  set persona(value) { this.setProp("persona", value) }

  // su "nombre" es texto, guardado como "name"
  static { this.declareProp("nombre", { type: "text", storedAs: "name", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 981, end: 1023 } }) }
  get nombre() { return this.getProp("nombre") }
  set nombre(value) { this.setProp("nombre", value) }

  // su "rol" es texto, guardado como "role"
  static { this.declareProp("rol", { type: "text", storedAs: "role", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1027, end: 1066 } }) }
  get rol() { return this.getProp("rol") }
  set rol(value) { this.setProp("rol", value) }

  draw() {
    return h("ui-stack", { class: "member", direction: "horizontal", spacing: "md", align: "center", wrap: true },
      h("ui-text", () => this.nombre),
      h("ui-text", { color: "grey" }, () => this.persona),
      h("ui-text", () => this.rol),
      h("ui-button", {
        class: "remove",
        icon: "close",
        size: "mini",
        appearance: "transparent",
        "aria-label": "Sacarle de la org",
        title: "Sacarle de la org",
        onClick: core.pressed(this, () => core.removeSaved(this)),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      })
    )
  }

  static savedIn = { place: "roles_de_la_org", collection: "miembros" }
}

export class Equipo extends Thing {
  // su "nombre" es texto, guardado como "name"
  static { this.declareProp("nombre", { type: "text", storedAs: "name", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1123, end: 1165 } }) }
  get nombre() { return this.getProp("nombre") }
  set nombre(value) { this.setProp("nombre", value) }

  draw() {
    return h("ui-stack", { class: "team", direction: "horizontal", spacing: "md", align: "center", wrap: true },
      h("ui-text", () => this.nombre)
    )
  }

  static savedIn = { place: "roles_de_la_org", collection: "equipos" }
}

export class Proyecto extends Thing {
  // su "nombre" es texto, guardado como "name"
  static { this.declareProp("nombre", { type: "text", storedAs: "name", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1224, end: 1266 } }) }
  get nombre() { return this.getProp("nombre") }
  set nombre(value) { this.setProp("nombre", value) }

  // su "equipo" es texto, guardado como "team"
  static { this.declareProp("equipo", { type: "text", storedAs: "team", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1270, end: 1312 } }) }
  get equipo() { return this.getProp("equipo") }
  set equipo(value) { this.setProp("equipo", value) }

  draw() {
    return h("ui-stack", { class: "project", direction: "horizontal", spacing: "md", align: "center", wrap: true },
      h("ui-text", () => this.nombre),
      h("ui-text", () => this.equipo)
    )
  }

  static savedIn = { place: "roles_de_la_org", collection: "proyectos" }
}

export class Mandato extends Thing {
  // su "rol" es texto, guardado como "role"
  static { this.declareProp("rol", { type: "text", storedAs: "role", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1370, end: 1409 } }) }
  get rol() { return this.getProp("rol") }
  set rol(value) { this.setProp("rol", value) }

  // su "titular" es texto, guardado como "holder"
  static { this.declareProp("titular", { type: "text", storedAs: "holder", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1413, end: 1458 } }) }
  get titular() { return this.getProp("titular") }
  set titular(value) { this.setProp("titular", value) }

  // su "ámbito" es texto, guardado como "manages"
  static { this.declareProp("ámbito", { type: "text", storedAs: "manages", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1462, end: 1507 } }) }
  get ámbito() { return this.getProp("ámbito") }
  set ámbito(value) { this.setProp("ámbito", value) }

  // su "inicio" es texto, guardado como "starts"
  static { this.declareProp("inicio", { type: "text", storedAs: "starts", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1511, end: 1555 } }) }
  get inicio() { return this.getProp("inicio") }
  set inicio(value) { this.setProp("inicio", value) }

  // su "fin" es texto, guardado como "ends"
  static { this.declareProp("fin", { type: "text", storedAs: "ends", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1559, end: 1598 } }) }
  get fin() { return this.getProp("fin") }
  set fin(value) { this.setProp("fin", value) }

  draw() {
    return h("ui-stack", { class: "term", direction: "horizontal", spacing: "md", align: "center", wrap: true },
      h("ui-text", () => this.titular),
      h("ui-text", () => this.rol),
      h("ui-text", () => this.ámbito),
      h("ui-text", () => this.inicio),
      h("ui-text", () => this.fin),
      h("ui-button", {
        class: "end",
        icon: "close",
        size: "mini",
        appearance: "transparent",
        "aria-label": "Terminar este mandato",
        title: "Terminar este mandato:  su registro se queda",
        onClick: core.pressed(this, () => core.removeSaved(this)),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      })
    )
  }

  static savedIn = { place: "roles_de_la_org", collection: "mandatos" }
}

export class Aprobación extends Thing {
  // su "nombre" es texto, guardado como "name"
  static { this.declareProp("nombre", { type: "text", storedAs: "name", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1660, end: 1702 } }) }
  get nombre() { return this.getProp("nombre") }
  set nombre(value) { this.setProp("nombre", value) }

  // su "versión" es texto, guardado como "version"
  static { this.declareProp("versión", { type: "text", storedAs: "version", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1706, end: 1752 } }) }
  get versión() { return this.getProp("versión") }
  set versión(value) { this.setProp("versión", value) }

  draw() {
    return h("ui-stack", { class: "app", direction: "horizontal", spacing: "md", align: "center", wrap: true },
      h("ui-text", () => this.nombre),
      h("ui-text", () => this.versión),
      h("ui-button", {
        class: "unapprove",
        icon: "close",
        size: "mini",
        appearance: "transparent",
        "aria-label": "Quitarla de la lista",
        title: "Quitarla de la lista",
        onClick: core.pressed(this, () => core.removeSaved(this)),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      })
    )
  }

  static savedIn = { place: "roles_de_la_org", collection: "aprobaciones" }
}

/** Quien diseña cambia las páginas y el código de un espacio, sea cual sea su rol allí:  un Manager las publica. */
export class Diseñador extends Thing {
  // su "persona" es texto, guardado como "person"
  static { this.declareProp("persona", { type: "text", storedAs: "person", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1925, end: 1970 } }) }
  get persona() { return this.getProp("persona") }
  set persona(value) { this.setProp("persona", value) }

  // su "espacio" es texto, guardado como "space"
  static { this.declareProp("espacio", { type: "text", storedAs: "space", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1974, end: 2018 } }) }
  get espacio() { return this.getProp("espacio") }
  set espacio(value) { this.setProp("espacio", value) }

  draw() {
    return h("ui-stack", { class: "designer", direction: "horizontal", spacing: "md", align: "center", wrap: true },
      h("ui-text", () => this.persona),
      h("ui-text", () => this.espacio),
      h("ui-button", {
        class: "undesign",
        icon: "close",
        size: "mini",
        appearance: "transparent",
        "aria-label": "Ya no lo diseña",
        title: "Ya no lo diseña:  sus borradores se quedan, para un Manager",
        onClick: core.pressed(this, () => core.removeSaved(this)),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      })
    )
  }

  static savedIn = { place: "roles_de_la_org", collection: "diseñadores" }
}

/** Las etapas de un evento, en orden:  a cada una la mueve "the team" o "its organizers". */
export class Etapa extends Thing {
  // su "nombre" es texto, guardado como "name"
  static { this.declareProp("nombre", { type: "text", storedAs: "name", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2165, end: 2207 } }) }
  get nombre() { return this.getProp("nombre") }
  set nombre(value) { this.setProp("nombre", value) }

  // su "siguiente" es texto, guardado como "movesTo"
  static { this.declareProp("siguiente", { type: "text", storedAs: "movesTo", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2211, end: 2259 } }) }
  get siguiente() { return this.getProp("siguiente") }
  set siguiente(value) { this.setProp("siguiente", value) }

  // su "quién mueve" es texto, guardado como "movedBy"
  static { this.declareProp("quiénMueve", { type: "text", storedAs: "movedBy", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2263, end: 2313 } }) }
  get quiénMueve() { return this.getProp("quiénMueve") }
  set quiénMueve(value) { this.setProp("quiénMueve", value) }

  draw() {
    return h("ui-stack", { class: "stage", direction: "horizontal", spacing: "md", align: "center", wrap: true },
      h("ui-text", () => this.nombre),
      h("ui-text", { color: "grey" }, () => this.siguiente),
      h("ui-text", () => this.quiénMueve),
      h("ui-button", {
        class: "unstage",
        icon: "close",
        size: "mini",
        appearance: "transparent",
        "aria-label": "Quitar esta etapa",
        title: "Quitar esta etapa:  no mientras haya un evento en ella, o otra lleve a ella",
        onClick: core.pressed(this, () => core.removeSaved(this)),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      })
    )
  }

  static savedIn = { place: "roles_de_la_org", collection: "etapas" }
}

export class Cambio extends Thing {
  // su "cuándo" es texto, guardado como "at"
  static { this.declareProp("cuándo", { type: "text", storedAs: "at", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2370, end: 2410 } }) }
  get cuándo() { return this.getProp("cuándo") }
  set cuándo(value) { this.setProp("cuándo", value) }

  // su "quién" es texto, guardado como "who"
  static { this.declareProp("quién", { type: "text", storedAs: "who", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2414, end: 2454 } }) }
  get quién() { return this.getProp("quién") }
  set quién(value) { this.setProp("quién", value) }

  // su "hecho" es texto, guardado como "did"
  static { this.declareProp("hecho", { type: "text", storedAs: "did", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2458, end: 2498 } }) }
  get hecho() { return this.getProp("hecho") }
  set hecho(value) { this.setProp("hecho", value) }

  // su "qué" es texto, guardado como "what"
  static { this.declareProp("qué", { type: "text", storedAs: "what", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2502, end: 2541 } }) }
  get qué() { return this.getProp("qué") }
  set qué(value) { this.setProp("qué", value) }

  // su "por qué" es texto, guardado como "why"
  static { this.declareProp("porQué", { type: "text", storedAs: "why", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2545, end: 2587 } }) }
  get porQué() { return this.getProp("porQué") }
  set porQué(value) { this.setProp("porQué", value) }

  draw() {
    return h("ui-stack", { class: "change", direction: "horizontal", spacing: "md", align: "center", wrap: true },
      h("ui-text", { color: "grey" }, () => this.cuándo),
      h("ui-text", () => this.quién),
      h("ui-text", () => this.hecho),
      h("ui-text", () => this.qué),
      h("ui-text", () => this.porQué)
    )
  }

  static savedIn = { place: "roles_de_la_org", collection: "cambios" }
}

/**
 * Los roles de una org viven en su espacio de administración:  quién está, sus equipos y proyectos, quién dirige qué, y
 * hasta cuándo.  Cada cambio pasa por el servidor de Encanto, con las reglas de la org, y queda en el registro:
 * tampoco desde esta página puede un Project Manager quitar a un Team Manager.
 * La página de tu org nombra su propia org en la línea siguiente:  "@rs" es la de la Rock Society.
 */
export class RolDeLaOrg extends Place {}
export const rolesDeLaOrg = core.place(new RolDeLaOrg(), {
  name: "roles_de_la_org",
  kind: "data folder",
  at: "/api/places/spaces/@rs/__admin/roles",
  checkedEvery: 30,
  collections: {
    miembros: { at: "members" },
    equipos: { at: "teams" },
    proyectos: { at: "projects" },
    mandatos: { at: "terms" },
    aprobaciones: { at: "approved_apps" },
    diseñadores: { at: "designers" },
    etapas: { at: "event_stages" },
    cambios: { at: "role_changes" }
  },
  unclearNumbers: ",", firstReads: () => [[Miembro], [Equipo], [Proyecto], [Mandato], [Diseñador], [Aprobación], [Etapa], [Cambio]] })

// -----------
core.heading("Administración de la org")
//////////////////////////////
// ## Administración de la org
//////////////////////////////
// La página de administración de una org:  quién está, sus equipos y proyectos, quién dirige qué y hasta cuándo, qué
// aplicaciones pueden instalar sus espacios, las etapas de sus eventos y el registro de cada cambio.
// Dónde se guardan está en AdministracionDeLaOrg.api.es.spell, y solo su primera línea lo sabe.
// Cada cambio pasa por el servidor de Encanto, con las reglas de la org:  uno que no puedes hacer dice por qué, y no cambia nada.

core.heading("Una fila para cada uno:  qué es, y un botón para quitarlo")
//## Una fila para cada uno:  qué es, y un botón para quitarlo

core.heading("La página:  una sección para cada uno, con un formulario para agregar uno arriba")
//## La página:  una sección para cada uno, con un formulario para agregar uno arriba

export class AdministraciónDeLaOrg extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  /** A quién agregar, por su dirección:  ana@rs */
  // su "miembro nuevo" es un nuevo miembro
  static { this.declareProp("miembroNuevo", { init: () => new Miembro(), early: true }) }
  get miembroNuevo() { return this.getProp("miembroNuevo") }
  set miembroNuevo(value) { this.setProp("miembroNuevo", value) }

  /** Un equipo permanente nuevo, por su nombre */
  // su "equipo nuevo" es un nuevo equipo
  static { this.declareProp("equipoNuevo", { init: () => new Equipo(), early: true }) }
  get equipoNuevo() { return this.getProp("equipoNuevo") }
  set equipoNuevo(value) { this.setProp("equipoNuevo", value) }

  /** Un proyecto nuevo, bajo un equipo (por su carpeta) o, sin ninguno, la org misma */
  // su "proyecto nuevo" es un nuevo proyecto
  static { this.declareProp("proyectoNuevo", { init: () => new Proyecto(), early: true }) }
  get proyectoNuevo() { return this.getProp("proyectoNuevo") }
  set proyectoNuevo(value) { this.setProp("proyectoNuevo", value) }

  // su "mandato nuevo" es un nuevo mandato
  static { this.declareProp("mandatoNuevo", { init: () => new Mandato(), early: true }) }
  get mandatoNuevo() { return this.getProp("mandatoNuevo") }
  set mandatoNuevo(value) { this.setProp("mandatoNuevo", value) }

  // su "aprobación nueva" es una nueva aprobación
  static { this.declareProp("aprobaciónNueva", { init: () => new Aprobación(), early: true }) }
  get aprobaciónNueva() { return this.getProp("aprobaciónNueva") }
  set aprobaciónNueva(value) { this.setProp("aprobaciónNueva", value) }

  /** Quién diseña las páginas de qué espacio:  ana@rs, picnic@rs */
  // su "diseñador nuevo" es un nuevo diseñador
  static { this.declareProp("diseñadorNuevo", { init: () => new Diseñador(), early: true }) }
  get diseñadorNuevo() { return this.getProp("diseñadorNuevo") }
  set diseñadorNuevo(value) { this.setProp("diseñadorNuevo", value) }

  /** Una etapa por la que pasa un evento:  su nombre cambia la etapa de ese nombre, o agrega una antes de la última */
  // su "etapa nueva" es una nueva etapa
  static { this.declareProp("etapaNueva", { init: () => new Etapa(), early: true }) }
  get etapaNueva() { return this.getProp("etapaNueva") }
  set etapaNueva(value) { this.setProp("etapaNueva", value) }

  agregarElMiembroNuevo() {
    core.saveThing(this.miembroNuevo)
    this.miembroNuevo = new Miembro()
  }

  agregarElEquipoNuevo() {
    core.saveThing(this.equipoNuevo)
    this.equipoNuevo = new Equipo()
  }

  agregarElProyectoNuevo() {
    core.saveThing(this.proyectoNuevo)
    this.proyectoNuevo = new Proyecto()
  }

  darElMandatoNuevo() {
    core.saveThing(this.mandatoNuevo)
    this.mandatoNuevo = new Mandato()
  }

  aprobarLaAprobaciónNueva() {
    core.saveThing(this.aprobaciónNueva)
    this.aprobaciónNueva = new Aprobación()
  }

  agregarElDiseñadorNuevo() {
    core.saveThing(this.diseñadorNuevo)
    this.diseñadorNuevo = new Diseñador()
  }

  agregarLaEtapaNueva() {
    core.saveThing(this.etapaNueva)
    this.etapaNueva = new Etapa()
  }

  draw() {
    return h("ui-container", { class: "org-admin" },
      h("ui-stack",
        h("ui-header", { size: "large" }, "Administración de la org"),
        h("ui-text", { color: "grey" },
          "Quién está en la org, quién dirige qué, y cada cambio, con quién lo hizo."
        ),
        h("ui-segment", { class: "people" },
          h("ui-header", { size: "medium" }, "Personas"),
          h("ui-form", { "prop:value": () => this.miembroNuevo },
            h("ui-input", {
              name: "persona",
              placeholder: "ana@rs",
              "aria-label": "Agrega a alguien, por su dirección",
              fluid: true,
              action: true
            },
              h("ui-button", {
                class: "add",
                slot: "action",
                color: "primary",
                disabled: () => this.miembroNuevo.persona === "",
                onClick: core.pressed(this, () => this.agregarElMiembroNuevo()),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "Agregar")
            )
          ),
          h("ui-stack", { class: "members", spacing: "sm" },
            () => core.drawRead(async () => await core.savedThings(Miembro, {}, "as drawn"), (miembro) => core.drawThing(miembro), {
              waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Buscando a la gente de la org"),
              none: () => h("ui-text", { class: "none", color: "grey" }, "Nadie todavía."),
              failed: () => h("ui-text", { color: "red" }, "No podemos leer a la gente de la org ahora mismo.")
            })
          )
        ),
        h("ui-segment", { class: "teams" },
          h("ui-header", { size: "medium" }, "Equipos y proyectos"),
          h("ui-form", { class: "new-team", "prop:value": () => this.equipoNuevo },
            h("ui-input", {
              name: "nombre",
              placeholder: "Equipo de eventos",
              "aria-label": "Un equipo nuevo",
              fluid: true,
              action: true
            },
              h("ui-button", {
                class: "add",
                slot: "action",
                color: "primary",
                disabled: () => this.equipoNuevo.nombre === "",
                onClick: core.pressed(this, () => this.agregarElEquipoNuevo()),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "Agregar equipo")
            )
          ),
          h("ui-form", { class: "new-project", "prop:value": () => this.proyectoNuevo },
            h("ui-stack", { direction: "horizontal" },
              h("ui-input", { name: "nombre", placeholder: "2026 T4", "aria-label": "Un proyecto nuevo", fluid: true }),
              h("ui-input", { name: "equipo", placeholder: "events_team", "aria-label": "Bajo el equipo" })
            )
          ),
          h("ui-button", {
            class: "add-project",
            color: "primary",
            disabled: () => this.proyectoNuevo.nombre === "",
            onClick: core.pressed(this, () => this.agregarElProyectoNuevo()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Agregar proyecto"),
          h("ui-header", { size: "small" }, "Equipos"),
          h("ui-stack", { class: "teams", spacing: "sm" },
            () => core.drawRead(async () => await core.savedThings(Equipo, {}, "as drawn"), (equipo) => core.drawThing(equipo), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Buscando los equipos") })
          ),
          h("ui-header", { size: "small" }, "Proyectos"),
          h("ui-stack", { class: "projects", spacing: "sm" },
            () => core.drawRead(async () => await core.savedThings(Proyecto, {}, "as drawn"), (proyecto) => core.drawThing(proyecto), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Buscando los proyectos") })
          )
        ),
        h("ui-segment", { class: "roles" },
          h("ui-header", { size: "medium" }, "Quién dirige qué"),
          h("ui-form", { "prop:value": () => this.mandatoNuevo },
            h("ui-stack", { direction: "horizontal", wrap: true },
              h("ui-input", { name: "titular", placeholder: "bo@rs", "aria-label": "Quién:  una persona, o un equipo" }),
              h("ui-input", { name: "rol", placeholder: "team-manager", "aria-label": "Rol" }),
              h("ui-input", { name: "ámbito", placeholder: "events_team", "aria-label": "De" }),
              h("ui-input", { name: "fin", placeholder: "2027-06-30", "aria-label": "Hasta" })
            )
          ),
          h("ui-button", {
            class: "give",
            color: "primary",
            disabled: () => this.mandatoNuevo.titular === "",
            onClick: core.pressed(this, () => this.darElMandatoNuevo()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Nombrarle"),
          h("ui-stack", { class: "terms", spacing: "sm" },
            () => core.drawRead(async () => await core.savedThings(Mandato, {}, "as drawn"), (mandato) => core.drawThing(mandato), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Buscando quién dirige qué") })
          )
        ),
        h("ui-segment", { class: "designers" },
          h("ui-header", { size: "medium" }, "Quién diseña qué"),
          h("ui-form", { "prop:value": () => this.diseñadorNuevo },
            h("ui-stack", { direction: "horizontal" },
              h("ui-input", { name: "persona", placeholder: "ana@rs", "aria-label": "Quién" }),
              h("ui-input", { name: "espacio", placeholder: "picnic@rs", "aria-label": "Qué espacio" })
            )
          ),
          h("ui-button", {
            class: "design",
            color: "primary",
            disabled: () => this.diseñadorNuevo.persona === "",
            onClick: core.pressed(this, () => this.agregarElDiseñadorNuevo()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Puede diseñarlo"),
          h("ui-stack", { class: "designers", spacing: "sm" },
            () => core.drawRead(async () => await core.savedThings(Diseñador, {}, "as drawn"), (diseñador) => core.drawThing(diseñador), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Buscando quién diseña qué") })
          )
        ),
        h("ui-segment", { class: "apps" },
          h("ui-header", { size: "medium" }, "Aplicaciones aprobadas"),
          h("ui-form", { "prop:value": () => this.aprobaciónNueva },
            h("ui-stack", { direction: "horizontal" },
              h("ui-input", { name: "nombre", placeholder: "@spell/sign-up-sheet", "aria-label": "Aplicación", fluid: true }),
              h("ui-input", { name: "versión", placeholder: "1.0.0", "aria-label": "Versión" })
            )
          ),
          h("ui-button", {
            class: "approve",
            color: "primary",
            disabled: () => this.aprobaciónNueva.nombre === "",
            onClick: core.pressed(this, () => this.aprobarLaAprobaciónNueva()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Aprobar"),
          h("ui-stack", { class: "approved", spacing: "sm" },
            () => core.drawRead(async () => await core.savedThings(Aprobación, {}, "as drawn"), (aprobación) => core.drawThing(aprobación), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Buscando las aplicaciones aprobadas") })
          )
        ),
        h("ui-segment", { class: "stages" },
          h("ui-header", { size: "medium" }, "Etapas de los eventos"),
          h("ui-form", { "prop:value": () => this.etapaNueva },
            h("ui-stack", { direction: "horizontal" },
              h("ui-input", { name: "nombre", placeholder: "Ensayo", "aria-label": "Etapa" }),
              h("ui-input", { name: "siguiente", placeholder: "open", "aria-label": "Lleva a" }),
              h("ui-input", { name: "quién mueve", placeholder: "its organizers", "aria-label": "La mueve" })
            )
          ),
          h("ui-button", {
            class: "stage-it",
            color: "primary",
            disabled: () => this.etapaNueva.nombre === "",
            onClick: core.pressed(this, () => this.agregarLaEtapaNueva()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Agregar o cambiar"),
          h("ui-stack", { class: "stages", spacing: "sm" },
            () => core.drawRead(async () => await core.savedThings(Etapa, {}, "as drawn"), (etapa) => core.drawThing(etapa), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Buscando las etapas de los eventos") })
          )
        ),
        h("ui-segment", { class: "log" },
          h("ui-header", { size: "medium" }, "Registro"),
          h("ui-stack", { class: "changes", spacing: "sm" },
            () => core.drawRead(async () => await core.savedThings(Cambio, {}, "as drawn"), (cambio) => core.drawThing(cambio), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Leyendo el registro") })
          )
        )
      )
    )
  }
}
export const administraciónDeLaOrg = new AdministraciónDeLaOrg()
// -----------
if (!core.isCarryingOver) administraciónDeLaOrg.start()
