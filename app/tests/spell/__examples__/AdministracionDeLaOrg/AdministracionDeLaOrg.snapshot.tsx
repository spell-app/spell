import { core, Thing, App, Place, prop, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Administración de la org:  dónde se guardan los roles de una org")
//////////////////////////////////////////////////////////////////////
// ## Administración de la org:  dónde se guardan los roles de una org
//////////////////////////////////////////////////////////////////////

export class Miembro extends Thing {
  // su "persona" es texto, guardado como "person"
  @prop({ type: "text", storedAs: "person", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 932, end: 977 } })
  accessor persona!: string

  // su "nombre" es texto, guardado como "name"
  @prop({ type: "text", storedAs: "name", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 981, end: 1023 } })
  accessor nombre!: string

  // su "rol" es texto, guardado como "role"
  @prop({ type: "text", storedAs: "role", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1027, end: 1066 } })
  accessor rol!: string

  @drawn draw() {
    return (
      <ui-stack class="member" direction="horizontal" spacing="md" align="center" wrap={true}>
        <ui-text>{this.nombre}</ui-text>
        <ui-text color="grey">{this.persona}</ui-text>
        <ui-text>{this.rol}</ui-text>
        <ui-button class="remove" icon="close" size="mini" appearance="transparent" aria-label="Sacarle de la org" title="Sacarle de la org" onClick={core.pressed(this, () => core.removeSaved(this))} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
      </ui-stack>
    )
  }

  static savedIn = { place: "roles_de_la_org", collection: "miembros" }
}

export class Equipo extends Thing {
  // su "nombre" es texto, guardado como "name"
  @prop({ type: "text", storedAs: "name", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1123, end: 1165 } })
  accessor nombre!: string

  @drawn draw() {
    return (
      <ui-stack class="team" direction="horizontal" spacing="md" align="center" wrap={true}>
        <ui-text>{this.nombre}</ui-text>
      </ui-stack>
    )
  }

  static savedIn = { place: "roles_de_la_org", collection: "equipos" }
}

export class Proyecto extends Thing {
  // su "nombre" es texto, guardado como "name"
  @prop({ type: "text", storedAs: "name", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1224, end: 1266 } })
  accessor nombre!: string

  // su "equipo" es texto, guardado como "team"
  @prop({ type: "text", storedAs: "team", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1270, end: 1312 } })
  accessor equipo!: string

  @drawn draw() {
    return (
      <ui-stack class="project" direction="horizontal" spacing="md" align="center" wrap={true}>
        <ui-text>{this.nombre}</ui-text>
        <ui-text>{this.equipo}</ui-text>
      </ui-stack>
    )
  }

  static savedIn = { place: "roles_de_la_org", collection: "proyectos" }
}

export class Mandato extends Thing {
  // su "rol" es texto, guardado como "role"
  @prop({ type: "text", storedAs: "role", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1370, end: 1409 } })
  accessor rol!: string

  // su "titular" es texto, guardado como "holder"
  @prop({ type: "text", storedAs: "holder", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1413, end: 1458 } })
  accessor titular!: string

  // su "ámbito" es texto, guardado como "manages"
  @prop({ type: "text", storedAs: "manages", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1462, end: 1507 } })
  accessor ámbito!: string

  // su "inicio" es texto, guardado como "starts"
  @prop({ type: "text", storedAs: "starts", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1511, end: 1555 } })
  accessor inicio!: string

  // su "fin" es texto, guardado como "ends"
  @prop({ type: "text", storedAs: "ends", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1559, end: 1598 } })
  accessor fin!: string

  @drawn draw() {
    return (
      <ui-stack class="term" direction="horizontal" spacing="md" align="center" wrap={true}>
        <ui-text>{this.titular}</ui-text>
        <ui-text>{this.rol}</ui-text>
        <ui-text>{this.ámbito}</ui-text>
        <ui-text>{this.inicio}</ui-text>
        <ui-text>{this.fin}</ui-text>
        <ui-button class="end" icon="close" size="mini" appearance="transparent" aria-label="Terminar este mandato" title="Terminar este mandato:  su registro se queda" onClick={core.pressed(this, () => core.removeSaved(this))} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
      </ui-stack>
    )
  }

  static savedIn = { place: "roles_de_la_org", collection: "mandatos" }
}

export class Aprobación extends Thing {
  // su "nombre" es texto, guardado como "name"
  @prop({ type: "text", storedAs: "name", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1660, end: 1702 } })
  accessor nombre!: string

  // su "versión" es texto, guardado como "version"
  @prop({ type: "text", storedAs: "version", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1706, end: 1752 } })
  accessor versión!: string

  @drawn draw() {
    return (
      <ui-stack class="app" direction="horizontal" spacing="md" align="center" wrap={true}>
        <ui-text>{this.nombre}</ui-text>
        <ui-text>{this.versión}</ui-text>
        <ui-button class="unapprove" icon="close" size="mini" appearance="transparent" aria-label="Quitarla de la lista" title="Quitarla de la lista" onClick={core.pressed(this, () => core.removeSaved(this))} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
      </ui-stack>
    )
  }

  static savedIn = { place: "roles_de_la_org", collection: "aprobaciones" }
}

/** Quien diseña cambia las páginas y el código de un espacio, sea cual sea su rol allí:  un Manager las publica. */
export class Diseñador extends Thing {
  // su "persona" es texto, guardado como "person"
  @prop({ type: "text", storedAs: "person", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1925, end: 1970 } })
  accessor persona!: string

  // su "espacio" es texto, guardado como "space"
  @prop({ type: "text", storedAs: "space", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1974, end: 2018 } })
  accessor espacio!: string

  @drawn draw() {
    return (
      <ui-stack class="designer" direction="horizontal" spacing="md" align="center" wrap={true}>
        <ui-text>{this.persona}</ui-text>
        <ui-text>{this.espacio}</ui-text>
        <ui-button class="undesign" icon="close" size="mini" appearance="transparent" aria-label="Ya no lo diseña" title="Ya no lo diseña:  sus borradores se quedan, para un Manager" onClick={core.pressed(this, () => core.removeSaved(this))} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
      </ui-stack>
    )
  }

  static savedIn = { place: "roles_de_la_org", collection: "diseñadores" }
}

/** Las etapas de un evento, en orden:  a cada una la mueve "the team" o "its organizers". */
export class Etapa extends Thing {
  // su "nombre" es texto, guardado como "name"
  @prop({ type: "text", storedAs: "name", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2165, end: 2207 } })
  accessor nombre!: string

  // su "siguiente" es texto, guardado como "movesTo"
  @prop({ type: "text", storedAs: "movesTo", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2211, end: 2259 } })
  accessor siguiente!: string

  // su "quién mueve" es texto, guardado como "movedBy"
  @prop({ type: "text", storedAs: "movedBy", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2263, end: 2313 } })
  accessor quiénMueve!: string

  @drawn draw() {
    return (
      <ui-stack class="stage" direction="horizontal" spacing="md" align="center" wrap={true}>
        <ui-text>{this.nombre}</ui-text>
        <ui-text color="grey">{this.siguiente}</ui-text>
        <ui-text>{this.quiénMueve}</ui-text>
        <ui-button class="unstage" icon="close" size="mini" appearance="transparent" aria-label="Quitar esta etapa" title="Quitar esta etapa:  no mientras haya un evento en ella, o otra lleve a ella" onClick={core.pressed(this, () => core.removeSaved(this))} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
      </ui-stack>
    )
  }

  static savedIn = { place: "roles_de_la_org", collection: "etapas" }
}

export class Cambio extends Thing {
  // su "cuándo" es texto, guardado como "at"
  @prop({ type: "text", storedAs: "at", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2370, end: 2410 } })
  accessor cuándo!: string

  // su "quién" es texto, guardado como "who"
  @prop({ type: "text", storedAs: "who", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2414, end: 2454 } })
  accessor quién!: string

  // su "hecho" es texto, guardado como "did"
  @prop({ type: "text", storedAs: "did", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2458, end: 2498 } })
  accessor hecho!: string

  // su "qué" es texto, guardado como "what"
  @prop({ type: "text", storedAs: "what", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2502, end: 2541 } })
  accessor qué!: string

  // su "por qué" es texto, guardado como "why"
  @prop({ type: "text", storedAs: "why", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2545, end: 2587 } })
  accessor porQué!: string

  @drawn draw() {
    return (
      <ui-stack class="change" direction="horizontal" spacing="md" align="center" wrap={true}>
        <ui-text color="grey">{this.cuándo}</ui-text>
        <ui-text>{this.quién}</ui-text>
        <ui-text>{this.hecho}</ui-text>
        <ui-text>{this.qué}</ui-text>
        <ui-text>{this.porQué}</ui-text>
      </ui-stack>
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
  @prop({ init: () => new Miembro(), early: true })
  accessor miembroNuevo!: Miembro

  /** Un equipo permanente nuevo, por su nombre */
  // su "equipo nuevo" es un nuevo equipo
  @prop({ init: () => new Equipo(), early: true })
  accessor equipoNuevo!: Equipo

  /** Un proyecto nuevo, bajo un equipo (por su carpeta) o, sin ninguno, la org misma */
  // su "proyecto nuevo" es un nuevo proyecto
  @prop({ init: () => new Proyecto(), early: true })
  accessor proyectoNuevo!: Proyecto

  // su "mandato nuevo" es un nuevo mandato
  @prop({ init: () => new Mandato(), early: true })
  accessor mandatoNuevo!: Mandato

  // su "aprobación nueva" es una nueva aprobación
  @prop({ init: () => new Aprobación(), early: true })
  accessor aprobaciónNueva!: Aprobación

  /** Quién diseña las páginas de qué espacio:  ana@rs, picnic@rs */
  // su "diseñador nuevo" es un nuevo diseñador
  @prop({ init: () => new Diseñador(), early: true })
  accessor diseñadorNuevo!: Diseñador

  /** Una etapa por la que pasa un evento:  su nombre cambia la etapa de ese nombre, o agrega una antes de la última */
  // su "etapa nueva" es una nueva etapa
  @prop({ init: () => new Etapa(), early: true })
  accessor etapaNueva!: Etapa

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

  @drawn draw() {
    return (
      <ui-container class="org-admin">
        <ui-stack>
          <ui-header size="large">Administración de la org</ui-header>
          <ui-text color="grey">Quién está en la org, quién dirige qué, y cada cambio, con quién lo hizo.</ui-text>
          <ui-segment class="people">
            <ui-header size="medium">Personas</ui-header>
            <ui-form prop:value={this.miembroNuevo}>
              <ui-input name="persona" placeholder="ana@rs" aria-label="Agrega a alguien, por su dirección" fluid={true} action={true}>
                <ui-button class="add" slot="action" color="primary" disabled={this.miembroNuevo.persona === ""} onClick={core.pressed(this, () => this.agregarElMiembroNuevo())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  Agregar
                </ui-button>
              </ui-input>
            </ui-form>
            <ui-stack class="members" spacing="sm">
              {core.drawRead(async () => await core.savedThings(Miembro, {}, "as drawn"), (miembro: Miembro) => core.drawThing(miembro), {
                waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Buscando a la gente de la org"}</ui-loader>,
                none: () => <ui-text class="none" color="grey">Nadie todavía.</ui-text>,
                failed: () => <ui-text color="red">No podemos leer a la gente de la org ahora mismo.</ui-text>
              })}
            </ui-stack>
          </ui-segment>
          <ui-segment class="teams">
            <ui-header size="medium">Equipos y proyectos</ui-header>
            <ui-form class="new-team" prop:value={this.equipoNuevo}>
              <ui-input name="nombre" placeholder="Equipo de eventos" aria-label="Un equipo nuevo" fluid={true} action={true}>
                <ui-button class="add" slot="action" color="primary" disabled={this.equipoNuevo.nombre === ""} onClick={core.pressed(this, () => this.agregarElEquipoNuevo())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  Agregar equipo
                </ui-button>
              </ui-input>
            </ui-form>
            <ui-form class="new-project" prop:value={this.proyectoNuevo}>
              <ui-stack direction="horizontal">
                <ui-input name="nombre" placeholder="2026 T4" aria-label="Un proyecto nuevo" fluid={true} />
                <ui-input name="equipo" placeholder="events_team" aria-label="Bajo el equipo" />
              </ui-stack>
            </ui-form>
            <ui-button class="add-project" color="primary" disabled={this.proyectoNuevo.nombre === ""} onClick={core.pressed(this, () => this.agregarElProyectoNuevo())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Agregar proyecto
            </ui-button>
            <ui-header size="small">Equipos</ui-header>
            <ui-stack class="teams" spacing="sm">
              {core.drawRead(async () => await core.savedThings(Equipo, {}, "as drawn"), (equipo: Equipo) => core.drawThing(equipo), { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Buscando los equipos"}</ui-loader> })}
            </ui-stack>
            <ui-header size="small">Proyectos</ui-header>
            <ui-stack class="projects" spacing="sm">
              {core.drawRead(async () => await core.savedThings(Proyecto, {}, "as drawn"), (proyecto: Proyecto) => core.drawThing(proyecto), { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Buscando los proyectos"}</ui-loader> })}
            </ui-stack>
          </ui-segment>
          <ui-segment class="roles">
            <ui-header size="medium">Quién dirige qué</ui-header>
            <ui-form prop:value={this.mandatoNuevo}>
              <ui-stack direction="horizontal" wrap={true}>
                <ui-input name="titular" placeholder="bo@rs" aria-label="Quién:  una persona, o un equipo" />
                <ui-input name="rol" placeholder="team-manager" aria-label="Rol" />
                <ui-input name="ámbito" placeholder="events_team" aria-label="De" />
                <ui-input name="fin" placeholder="2027-06-30" aria-label="Hasta" />
              </ui-stack>
            </ui-form>
            <ui-button class="give" color="primary" disabled={this.mandatoNuevo.titular === ""} onClick={core.pressed(this, () => this.darElMandatoNuevo())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Nombrarle
            </ui-button>
            <ui-stack class="terms" spacing="sm">
              {core.drawRead(async () => await core.savedThings(Mandato, {}, "as drawn"), (mandato: Mandato) => core.drawThing(mandato), { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Buscando quién dirige qué"}</ui-loader> })}
            </ui-stack>
          </ui-segment>
          <ui-segment class="designers">
            <ui-header size="medium">Quién diseña qué</ui-header>
            <ui-form prop:value={this.diseñadorNuevo}>
              <ui-stack direction="horizontal">
                <ui-input name="persona" placeholder="ana@rs" aria-label="Quién" />
                <ui-input name="espacio" placeholder="picnic@rs" aria-label="Qué espacio" />
              </ui-stack>
            </ui-form>
            <ui-button class="design" color="primary" disabled={this.diseñadorNuevo.persona === ""} onClick={core.pressed(this, () => this.agregarElDiseñadorNuevo())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Puede diseñarlo
            </ui-button>
            <ui-stack class="designers" spacing="sm">
              {core.drawRead(async () => await core.savedThings(Diseñador, {}, "as drawn"), (diseñador: Diseñador) => core.drawThing(diseñador), { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Buscando quién diseña qué"}</ui-loader> })}
            </ui-stack>
          </ui-segment>
          <ui-segment class="apps">
            <ui-header size="medium">Aplicaciones aprobadas</ui-header>
            <ui-form prop:value={this.aprobaciónNueva}>
              <ui-stack direction="horizontal">
                <ui-input name="nombre" placeholder="@spell/sign-up-sheet" aria-label="Aplicación" fluid={true} />
                <ui-input name="versión" placeholder="1.0.0" aria-label="Versión" />
              </ui-stack>
            </ui-form>
            <ui-button class="approve" color="primary" disabled={this.aprobaciónNueva.nombre === ""} onClick={core.pressed(this, () => this.aprobarLaAprobaciónNueva())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Aprobar
            </ui-button>
            <ui-stack class="approved" spacing="sm">
              {core.drawRead(async () => await core.savedThings(Aprobación, {}, "as drawn"), (aprobación: Aprobación) => core.drawThing(aprobación), { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Buscando las aplicaciones aprobadas"}</ui-loader> })}
            </ui-stack>
          </ui-segment>
          <ui-segment class="stages">
            <ui-header size="medium">Etapas de los eventos</ui-header>
            <ui-form prop:value={this.etapaNueva}>
              <ui-stack direction="horizontal">
                <ui-input name="nombre" placeholder="Ensayo" aria-label="Etapa" />
                <ui-input name="siguiente" placeholder="open" aria-label="Lleva a" />
                <ui-input name="quién mueve" placeholder="its organizers" aria-label="La mueve" />
              </ui-stack>
            </ui-form>
            <ui-button class="stage-it" color="primary" disabled={this.etapaNueva.nombre === ""} onClick={core.pressed(this, () => this.agregarLaEtapaNueva())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Agregar o cambiar
            </ui-button>
            <ui-stack class="stages" spacing="sm">
              {core.drawRead(async () => await core.savedThings(Etapa, {}, "as drawn"), (etapa: Etapa) => core.drawThing(etapa), { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Buscando las etapas de los eventos"}</ui-loader> })}
            </ui-stack>
          </ui-segment>
          <ui-segment class="log">
            <ui-header size="medium">Registro</ui-header>
            <ui-stack class="changes" spacing="sm">
              {core.drawRead(async () => await core.savedThings(Cambio, {}, "as drawn"), (cambio: Cambio) => core.drawThing(cambio), { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Leyendo el registro"}</ui-loader> })}
            </ui-stack>
          </ui-segment>
        </ui-stack>
      </ui-container>
    )
  }
}

/**
 * `<test-project-app>`:  an administración de la org, drawn in its own element, e.g. by `draw the administración de la org`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its administración de la org's properties;  its methods call its administración de la org's.
 * - What every view's element does, e.g. drawing its administración de la org, is `SpellElement`'s.
 */
export class AdministraciónDeLaOrgElement extends SpellElement<AdministraciónDeLaOrg> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "administración de la org", [
    { name: "miembro-nuevo", kind: "json", description: "Its miembroNuevo." },
    { name: "equipo-nuevo", kind: "json", description: "Its equipoNuevo." },
    { name: "proyecto-nuevo", kind: "json", description: "Its proyectoNuevo." },
    { name: "mandato-nuevo", kind: "json", description: "Its mandatoNuevo." },
    { name: "aprobación-nueva", kind: "json", description: "Its aprobaciónNueva." },
    { name: "diseñador-nuevo", kind: "json", description: "Its diseñadorNuevo." },
    { name: "etapa-nueva", kind: "json", description: "Its etapaNueva." }
  ])

  agregarElMiembroNuevo() {
    return this.currentThing?.agregarElMiembroNuevo()
  }

  agregarElEquipoNuevo() {
    return this.currentThing?.agregarElEquipoNuevo()
  }

  agregarElProyectoNuevo() {
    return this.currentThing?.agregarElProyectoNuevo()
  }

  darElMandatoNuevo() {
    return this.currentThing?.darElMandatoNuevo()
  }

  aprobarLaAprobaciónNueva() {
    return this.currentThing?.aprobarLaAprobaciónNueva()
  }

  agregarElDiseñadorNuevo() {
    return this.currentThing?.agregarElDiseñadorNuevo()
  }

  agregarLaEtapaNueva() {
    return this.currentThing?.agregarLaEtapaNueva()
  }
}
core.useElement(AdministraciónDeLaOrg, AdministraciónDeLaOrgElement)
export const administraciónDeLaOrg = new AdministraciónDeLaOrg()
// -----------
if (!core.isCarryingOver) administraciónDeLaOrg.start()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `AdministraciónDeLaOrgElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
