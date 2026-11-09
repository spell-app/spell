import { core, Thing, App, Place, prop, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Administración de la org:  dónde se guardan los roles de una org")
//////////////////////////////////////////////////////////////////////
// ## Administración de la org:  dónde se guardan los roles de una org
//////////////////////////////////////////////////////////////////////

/** La org misma, para el título de la página y como espacio que diseñar. */
export class Perfil extends Thing {
  // su "nombre" es texto, guardado como "name"
  @prop({ type: "text", storedAs: "name", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1082, end: 1124 } })
  accessor nombre!: string

  // su "espacio" es texto, guardado como "space"
  @prop({ type: "text", storedAs: "space", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1128, end: 1172 } })
  accessor espacio!: string

  static savedIn = {
    place: "roles_de_la_org",
    collection: "perfiles",
    times: ["created", "modified"], select: ["nombre", "espacio"] }

  // vive en roles de la org
  @prop({ type: "date", storedAs: "created", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1055, end: 1078 } })
  accessor creado!: any /* spell: type unknown */

  // vive en roles de la org
  @prop({ type: "date", storedAs: "modified", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1055, end: 1078 } })
  accessor modificado!: any /* spell: type unknown */
}

/** Un rol de la org, por su nombre. */
export class Función extends Thing {
  // su "nombre" es texto, guardado como "name"
  @prop({ type: "text", storedAs: "name", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1267, end: 1309 } })
  accessor nombre!: string

  static savedIn = {
    place: "roles_de_la_org",
    collection: "funciones",
    times: ["created", "modified"], select: ["nombre"] }

  // vive en roles de la org
  @prop({ type: "date", storedAs: "created", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1240, end: 1263 } })
  accessor creado!: any /* spell: type unknown */

  // vive en roles de la org
  @prop({ type: "date", storedAs: "modified", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1240, end: 1263 } })
  accessor modificado!: any /* spell: type unknown */
}

export class Miembro extends Thing {
  // su "persona" es texto, guardado como "person"
  @prop({ type: "text", storedAs: "person", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1367, end: 1412 } })
  accessor persona!: string

  // su "nombre" es texto, guardado como "name"
  @prop({ type: "text", storedAs: "name", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1416, end: 1458 } })
  accessor nombre!: string

  // su "rol" es texto, guardado como "role"
  @prop({ type: "text", storedAs: "role", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1462, end: 1501 } })
  accessor rol!: string

  // su "cargo" es texto, guardado como "roleName"
  @prop({ type: "text", storedAs: "roleName", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1505, end: 1550 } })
  accessor cargo!: string

  static savedIn = {
    place: "roles_de_la_org",
    collection: "miembros",
    times: ["created", "modified"]
  }

  // vive en roles de la org
  @prop({ type: "date", storedAs: "created", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1340, end: 1363 } })
  accessor creado!: any /* spell: type unknown */

  // vive en roles de la org
  @prop({ type: "date", storedAs: "modified", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1340, end: 1363 } })
  accessor modificado!: any /* spell: type unknown */
}

export class Equipo extends Thing {
  // su "nombre" es texto, guardado como "name"
  @prop({ type: "text", storedAs: "name", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1607, end: 1649 } })
  accessor nombre!: string

  // su "espacio" es texto, guardado como "space"
  @prop({ type: "text", storedAs: "space", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1653, end: 1697 } })
  accessor espacio!: string

  static savedIn = {
    place: "roles_de_la_org",
    collection: "equipos",
    times: ["created", "modified"]
  }

  // vive en roles de la org
  @prop({ type: "date", storedAs: "created", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1580, end: 1603 } })
  accessor creado!: any /* spell: type unknown */

  // vive en roles de la org
  @prop({ type: "date", storedAs: "modified", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1580, end: 1603 } })
  accessor modificado!: any /* spell: type unknown */
}

export class Proyecto extends Thing {
  // su "nombre" es texto, guardado como "name"
  @prop({ type: "text", storedAs: "name", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1756, end: 1798 } })
  accessor nombre!: string

  // su "equipo" es texto, guardado como "team"
  @prop({ type: "text", storedAs: "team", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1802, end: 1844 } })
  accessor equipo!: string

  // su "espacio" es texto, guardado como "space"
  @prop({ type: "text", storedAs: "space", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1848, end: 1892 } })
  accessor espacio!: string

  static savedIn = {
    place: "roles_de_la_org",
    collection: "proyectos",
    times: ["created", "modified"]
  }

  // vive en roles de la org
  @prop({ type: "date", storedAs: "created", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1729, end: 1752 } })
  accessor creado!: any /* spell: type unknown */

  // vive en roles de la org
  @prop({ type: "date", storedAs: "modified", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1729, end: 1752 } })
  accessor modificado!: any /* spell: type unknown */
}

export class Mandato extends Thing {
  // su "rol" es texto, guardado como "role"
  @prop({ type: "text", storedAs: "role", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1950, end: 1989 } })
  accessor rol!: string

  // su "titular" es texto, guardado como "holder"
  @prop({ type: "text", storedAs: "holder", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1993, end: 2038 } })
  accessor titular!: string

  // su "ámbito" es texto, guardado como "manages"
  @prop({ type: "text", storedAs: "manages", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2042, end: 2087 } })
  accessor ámbito!: string

  // su "cargo" es texto, guardado como "roleName"
  @prop({ type: "text", storedAs: "roleName", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2091, end: 2136 } })
  accessor cargo!: string

  // su "nombre titular" es texto, guardado como "holderName"
  @prop({ type: "text", storedAs: "holderName", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2140, end: 2196 } })
  accessor nombreTitular!: string

  // su "nombre ámbito" es texto, guardado como "managesName"
  @prop({ type: "text", storedAs: "managesName", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2200, end: 2256 } })
  accessor nombreÁmbito!: string

  // su "inicio" es texto, guardado como "starts"
  @prop({ type: "text", storedAs: "starts", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2260, end: 2304 } })
  accessor inicio!: string

  // su "fin" es texto, guardado como "ends"
  @prop({ type: "text", storedAs: "ends", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2308, end: 2347 } })
  accessor fin!: string

  static savedIn = {
    place: "roles_de_la_org",
    collection: "mandatos",
    times: ["created", "modified"]
  }

  // vive en roles de la org
  @prop({ type: "date", storedAs: "created", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1923, end: 1946 } })
  accessor creado!: any /* spell: type unknown */

  // vive en roles de la org
  @prop({ type: "date", storedAs: "modified", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1923, end: 1946 } })
  accessor modificado!: any /* spell: type unknown */
}

export class Aprobación extends Thing {
  // su "nombre" es texto, guardado como "name"
  @prop({ type: "text", storedAs: "name", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2409, end: 2451 } })
  accessor nombre!: string

  // su "versión" es texto, guardado como "version"
  @prop({ type: "text", storedAs: "version", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2455, end: 2501 } })
  accessor versión!: string

  static savedIn = {
    place: "roles_de_la_org",
    collection: "aprobaciones",
    times: ["created", "modified"]
  }

  // vive en roles de la org
  @prop({ type: "date", storedAs: "created", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2382, end: 2405 } })
  accessor creado!: any /* spell: type unknown */

  // vive en roles de la org
  @prop({ type: "date", storedAs: "modified", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2382, end: 2405 } })
  accessor modificado!: any /* spell: type unknown */
}

/** Quien diseña cambia las páginas y el código de un espacio, sea cual sea su rol allí:  un Manager las publica. */
export class Diseñador extends Thing {
  // su "persona" es texto, guardado como "person"
  @prop({ type: "text", storedAs: "person", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2674, end: 2719 } })
  accessor persona!: string

  // su "espacio" es texto, guardado como "space"
  @prop({ type: "text", storedAs: "space", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2723, end: 2767 } })
  accessor espacio!: string

  // su "nombre persona" es texto, guardado como "personName"
  @prop({ type: "text", storedAs: "personName", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2771, end: 2827 } })
  accessor nombrePersona!: string

  static savedIn = {
    place: "roles_de_la_org",
    collection: "diseñadores",
    times: ["created", "modified"]
  }

  // vive en roles de la org
  @prop({ type: "date", storedAs: "created", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2647, end: 2670 } })
  accessor creado!: any /* spell: type unknown */

  // vive en roles de la org
  @prop({ type: "date", storedAs: "modified", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2647, end: 2670 } })
  accessor modificado!: any /* spell: type unknown */
}

/** Las etapas de un evento, en orden:  a cada una la mueve "the team" o "its organizers". */
export class Etapa extends Thing {
  // su "nombre" es texto, guardado como "name"
  @prop({ type: "text", storedAs: "name", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2974, end: 3016 } })
  accessor nombre!: string

  // su "siguiente" es texto, guardado como "movesTo"
  @prop({ type: "text", storedAs: "movesTo", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 3020, end: 3068 } })
  accessor siguiente!: string

  // su "quién mueve" es texto, guardado como "movedBy"
  @prop({ type: "text", storedAs: "movedBy", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 3072, end: 3122 } })
  accessor quiénMueve!: string

  static savedIn = {
    place: "roles_de_la_org",
    collection: "etapas",
    times: ["created", "modified"]
  }

  // vive en roles de la org
  @prop({ type: "date", storedAs: "created", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2947, end: 2970 } })
  accessor creado!: any /* spell: type unknown */

  // vive en roles de la org
  @prop({ type: "date", storedAs: "modified", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2947, end: 2970 } })
  accessor modificado!: any /* spell: type unknown */
}

export class Cambio extends Thing {
  // su "cuándo" es texto, guardado como "at"
  @prop({ type: "text", storedAs: "at", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 3179, end: 3219 } })
  accessor cuándo!: string

  // su "quién" es texto, guardado como "who"
  @prop({ type: "text", storedAs: "who", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 3223, end: 3263 } })
  accessor quién!: string

  // su "hecho" es texto, guardado como "did"
  @prop({ type: "text", storedAs: "did", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 3267, end: 3307 } })
  accessor hecho!: string

  // su "qué" es texto, guardado como "what"
  @prop({ type: "text", storedAs: "what", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 3311, end: 3350 } })
  accessor qué!: string

  // su "por qué" es texto, guardado como "why"
  @prop({ type: "text", storedAs: "why", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 3354, end: 3396 } })
  accessor porQué!: string

  static savedIn = {
    place: "roles_de_la_org",
    collection: "cambios",
    times: ["created", "modified"], select: ["cuándo", "quién", "hecho", "qué", "porQué"] }

  // vive en roles de la org
  @prop({ type: "date", storedAs: "created", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 3152, end: 3175 } })
  accessor creado!: any /* spell: type unknown */

  // vive en roles de la org
  @prop({ type: "date", storedAs: "modified", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 3152, end: 3175 } })
  accessor modificado!: any /* spell: type unknown */
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
    perfiles: { at: "org_profiles" },
    funciones: { at: "org_roles" },
    miembros: { at: "members" },
    equipos: { at: "teams" },
    proyectos: { at: "projects" },
    mandatos: { at: "terms" },
    aprobaciones: { at: "approved_apps" },
    diseñadores: { at: "designers" },
    etapas: { at: "event_stages" },
    cambios: { at: "role_changes" }
  },
  unclearNumbers: ",", firstReads: () => [[Perfil], [Cambio, { sort: [{ field: "cuándo", descending: true }] }], [Etapa], [Aprobación], [Miembro, { sort: [{ field: "nombre" }] }], [Equipo, { sort: [{ field: "nombre" }] }], [Proyecto, { sort: [{ field: "nombre" }] }], [Diseñador], [Función], [Mandato]] })

// -----------
core.heading("Administración de la org")
//////////////////////////////
// ## Administración de la org
//////////////////////////////
// La página de administración de una org:  quién está, sus equipos y proyectos, quién dirige qué y hasta cuándo, qué
// aplicaciones pueden instalar sus espacios, las etapas de sus eventos y el registro de cada cambio.
// Una barra con quién ha iniciado sesión, las secciones a un lado, y una sección cada vez junto a ellas.
// Dónde se guardan está en AdministracionDeLaOrg.api.es.spell, y solo su primera línea lo sabe.
// Cada cambio pasa por el servidor de Encanto, con las reglas de la org:  uno que no puedes hacer dice por qué, y no cambia nada.

core.heading("La página:  una barra arriba, las secciones al lado, y la elegida")
//## La página:  una barra arriba, las secciones al lado, y la elegida

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

  // La sección elegida queda en la dirección de la página, y al recargar vuelve a ella
  @drawn draw() {
    return (
      <ui-stack class="org-admin" spacing="none">
        <ui-toolbar class="top-bar" appearance="text" aria-label="Administración de la org">
          {core.drawRead(async () => await core.savedThings(Perfil, {}, "as drawn"), (org: Perfil) => <ui-text slot="title" size="large">Administración de {org.nombre}</ui-text>)}
          <ui-item link="OrgChat">Chat</ui-item>
          <ui-item link="OrgFeed">Novedades</ui-item>
          <ui-item link="Inbox">Bandeja</ui-item>
          <ui-stack slot="right" direction="horizontal">{core.signInMenu()}</ui-stack>
        </ui-toolbar>
        <ui-tabs class="body" parameter="sección" direction="vertical" appearance="secondary" aria-label="Secciones">
          <ui-tab label="Personas" icon="users" value="personas">
            <slot name="sección_personas">{this.drawSecciónPersonas()}</slot>
          </ui-tab>
          <ui-tab label="Equipos y proyectos" icon="sitemap" value="equipos">
            <slot name="sección_equipos">{this.drawSecciónEquipos()}</slot>
          </ui-tab>
          <ui-tab label="Quién dirige qué" icon="user tie" value="roles">
            <slot name="sección_roles">{this.drawSecciónRoles()}</slot>
          </ui-tab>
          <ui-tab label="Quién diseña qué" icon="paint brush" value="diseñadores">
            <slot name="sección_diseñadores">{this.drawSecciónDiseñadores()}</slot>
          </ui-tab>
          <ui-tab label="Aplicaciones aprobadas" icon="check circle outline" value="aplicaciones">
            <slot name="sección_aplicaciones">{this.drawSecciónAplicaciones()}</slot>
          </ui-tab>
          <ui-tab label="Etapas de los eventos" icon="stream" value="etapas">
            <slot name="sección_etapas">{this.drawSecciónEtapas()}</slot>
          </ui-tab>
          <ui-tab label="Registro" icon="history" value="registro">
            <slot name="sección_registro">{this.drawSecciónRegistro()}</slot>
          </ui-tab>
        </ui-tabs>
      </ui-stack>
    )
  }

  drawSecciónPersonas() {
    return (
      <ui-stack class="people" part="sección_personas">
        <ui-header size="medium">Personas</ui-header>
        <ui-form class="add" prop:value={this.miembroNuevo}>
          <ui-input name="persona" placeholder="Agrega a alguien, por su dirección:  ana@rs" aria-label="Agrega a alguien, por su dirección" fluid={true} action={true}>
            <ui-button class="add" slot="action" color="primary" title="Agregarle a la org" disabled={this.miembroNuevo.persona === ""} onClick={core.pressed(this, () => this.agregarElMiembroNuevo())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Agregar
            </ui-button>
          </ui-input>
        </ui-form>
        {core.drawRead(async () => await core.savedThings(Miembro, { sort: [{ field: "nombre" }] }, "as drawn"), (miembro: Miembro) => <>
          <es-celda data-column="Nombre">{miembro.nombre}</es-celda>
          <es-celda data-column="Dirección">
            <ui-text color="grey">{miembro.persona}</ui-text>
          </es-celda>
          <es-celda data-column="Rol">
            <ui-label size="small">{miembro.cargo}</ui-label>
          </es-celda>
          <es-celda data-column="">
            <ui-button class="remove" icon="close" size="mini" appearance="transparent" aria-label="Sacarle de la org" title="Sacarle de la org" onClick={core.pressed(this, () => core.removeSaved(miembro))} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
          </es-celda>
        </>, {
          waiting: () => <ui-loader visible={true} inline={true} text={true} part="sección_personas">
            {"Buscando a la gente de la org"}
          </ui-loader>,
          items: () => <es-tabla appearance="very-basic" selectable={true} unstackable={true} part="sección_personas">
            <es-fila />
          </es-tabla>,
          none: () => <ui-text class="none" color="grey" part="sección_personas">Nadie todavía.</ui-text>,
          failed: () => <ui-text color="red" part="sección_personas">No podemos leer a la gente de la org ahora mismo.</ui-text>
        })}
      </ui-stack>
    )
  }

  drawSecciónEquipos() {
    return (
      <ui-stack class="teams" part="sección_equipos">
        <ui-header size="medium">Equipos</ui-header>
        <ui-form class="add new-team" prop:value={this.equipoNuevo}>
          <ui-input name="nombre" placeholder="Un equipo nuevo:  Equipo de eventos" aria-label="Un equipo nuevo" fluid={true} action={true}>
            <ui-button class="add" slot="action" color="primary" title="Agregar este equipo" disabled={this.equipoNuevo.nombre === ""} onClick={core.pressed(this, () => this.agregarElEquipoNuevo())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Agregar equipo
            </ui-button>
          </ui-input>
        </ui-form>
        {core.drawRead(async () => await core.savedThings(Equipo, { sort: [{ field: "nombre" }] }, "as drawn"), (equipo: Equipo) => <>
          <es-celda data-column="Nombre">{equipo.nombre}</es-celda>
          <es-celda data-column="Espacio">
            <ui-text color="grey">{equipo.espacio}</ui-text>
          </es-celda>
        </>, {
          waiting: () => <ui-loader visible={true} inline={true} text={true} part="sección_equipos">{"Buscando los equipos"}</ui-loader>,
          items: () => <es-tabla appearance="very-basic" selectable={true} unstackable={true} part="sección_equipos">
            <es-fila />
          </es-tabla>,
          none: () => <ui-text class="none" color="grey" part="sección_equipos">Ningún equipo todavía.</ui-text>
        })}
        <ui-header size="medium">Proyectos</ui-header>
        <ui-form class="add new-project" prop:value={this.proyectoNuevo}>
          <ui-stack class="row" direction="horizontal" align="center" wrap={true}>
            <ui-input name="nombre" placeholder="Un proyecto nuevo:  2026 T4" aria-label="Un proyecto nuevo" fluid={true} />
            <ui-select name="equipo" placeholder="Bajo la org misma" aria-label="Bajo el equipo">
              {core.drawRead(async () => await core.savedThings(Equipo, { sort: [{ field: "nombre" }] }, "as drawn"), (equipo: Equipo) => <ui-item value={equipo.id} part="sección_equipos">{equipo.nombre}</ui-item>)}
            </ui-select>
            <ui-button class="add-project" color="primary" title="Agregar este proyecto" disabled={this.proyectoNuevo.nombre === ""} onClick={core.pressed(this, () => this.agregarElProyectoNuevo())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Agregar proyecto
            </ui-button>
          </ui-stack>
        </ui-form>
        {core.drawRead(async () => await core.savedThings(Proyecto, { sort: [{ field: "nombre" }] }, "as drawn"), (proyecto: Proyecto) => <>
          <es-celda data-column="Nombre">{proyecto.nombre}</es-celda>
          <es-celda data-column="Bajo">{proyecto.equipo}</es-celda>
          <es-celda data-column="Espacio">
            <ui-text color="grey">{proyecto.espacio}</ui-text>
          </es-celda>
        </>, {
          waiting: () => <ui-loader visible={true} inline={true} text={true} part="sección_equipos">
            {"Buscando los proyectos"}
          </ui-loader>,
          items: () => <es-tabla appearance="very-basic" selectable={true} unstackable={true} part="sección_equipos">
            <es-fila />
          </es-tabla>,
          none: () => <ui-text class="none" color="grey" part="sección_equipos">Ningún proyecto todavía.</ui-text>
        })}
      </ui-stack>
    )
  }

  drawSecciónRoles() {
    return (
      <ui-stack class="roles" part="sección_roles">
        <ui-header size="medium">Quién dirige qué</ui-header>
        <ui-form class="add" prop:value={this.mandatoNuevo}>
          <ui-stack class="row" direction="horizontal" align="center" wrap={true}>
            <ui-select name="titular" placeholder="Quién" aria-label="Quién:  una persona, o un equipo">
              {core.drawRead(async () => await core.savedThings(Miembro, { sort: [{ field: "nombre" }] }, "as drawn"), (miembro: Miembro) => <ui-item value={miembro.persona} part="sección_roles">{miembro.nombre}</ui-item>)}
              {core.drawRead(async () => await core.savedThings(Equipo, { sort: [{ field: "nombre" }] }, "as drawn"), (equipo: Equipo) => <ui-item value={equipo.id} part="sección_roles">{equipo.nombre}</ui-item>)}
            </ui-select>
            <ui-select name="rol" placeholder="Rol" aria-label="Rol">
              {core.drawRead(async () => await core.savedThings(Función, {}, "as drawn"), (función: Función) => <ui-item value={función.id} part="sección_roles">{función.nombre}</ui-item>)}
            </ui-select>
            <ui-select name="ámbito" placeholder="Toda la org" aria-label="De">
              {core.drawRead(async () => await core.savedThings(Equipo, { sort: [{ field: "nombre" }] }, "as drawn"), (equipo: Equipo) => <ui-item value={equipo.id} part="sección_roles">{equipo.nombre}</ui-item>)}
              {core.drawRead(async () => await core.savedThings(Proyecto, { sort: [{ field: "nombre" }] }, "as drawn"), (proyecto: Proyecto) => <ui-item value={proyecto.id} part="sección_roles">{proyecto.nombre}</ui-item>)}
            </ui-select>
            <ui-input name="fin" type="date" aria-label="Hasta" />
            <ui-button class="give" color="primary" title="Darle este rol" disabled={this.mandatoNuevo.titular === ""} onClick={core.pressed(this, () => this.darElMandatoNuevo())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Nombrarle
            </ui-button>
          </ui-stack>
        </ui-form>
        {core.drawRead(async () => await core.savedThings(Mandato, {}, "as drawn"), (mandato: Mandato) => <>
          <es-celda data-column="Quién" title={mandato.titular}>{mandato.nombreTitular}</es-celda>
          <es-celda data-column="Rol">
            <ui-label size="small">{mandato.cargo}</ui-label>
          </es-celda>
          <es-celda data-column="De">{mandato.nombreÁmbito}</es-celda>
          <es-celda data-column="Desde">{mandato.inicio}</es-celda>
          <es-celda data-column="Hasta">{mandato.fin}</es-celda>
          <es-celda data-column="">
            <ui-button class="end" icon="close" size="mini" appearance="transparent" aria-label="Terminar este mandato" title="Terminar este mandato:  su registro se queda" onClick={core.pressed(this, () => core.removeSaved(mandato))} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
          </es-celda>
        </>, {
          waiting: () => <ui-loader visible={true} inline={true} text={true} part="sección_roles">
            {"Buscando quién dirige qué"}
          </ui-loader>,
          items: () => <es-tabla appearance="very-basic" selectable={true} unstackable={true} part="sección_roles">
            <es-fila />
          </es-tabla>,
          none: () => <ui-text class="none" color="grey" part="sección_roles">Nadie nombrado todavía.</ui-text>
        })}
      </ui-stack>
    )
  }

  drawSecciónDiseñadores() {
    return (
      <ui-stack class="designers" part="sección_diseñadores">
        <ui-header size="medium">Quién diseña qué</ui-header>
        <ui-text color="grey">
          {"Cambian las páginas de un espacio, sea cual sea su rol allí;  sus Managers las publican."}
        </ui-text>
        <ui-form class="add" prop:value={this.diseñadorNuevo}>
          <ui-stack class="row" direction="horizontal" align="center" wrap={true}>
            <ui-select name="persona" placeholder="Quién" aria-label="Quién">
              {core.drawRead(async () => await core.savedThings(Miembro, { sort: [{ field: "nombre" }] }, "as drawn"), (miembro: Miembro) => <ui-item value={miembro.persona} part="sección_diseñadores">{miembro.nombre}</ui-item>)}
            </ui-select>
            <ui-select name="espacio" placeholder="Qué espacio" aria-label="Qué espacio">
              {core.drawRead(async () => await core.savedThings(Perfil, {}, "as drawn"), (org: Perfil) => <ui-item value={org.espacio} part="sección_diseñadores">{org.nombre}</ui-item>)}
              {core.drawRead(async () => await core.savedThings(Equipo, { sort: [{ field: "nombre" }] }, "as drawn"), (equipo: Equipo) => <ui-item value={equipo.espacio} part="sección_diseñadores">{equipo.nombre}</ui-item>)}
              {core.drawRead(async () => await core.savedThings(Proyecto, { sort: [{ field: "nombre" }] }, "as drawn"), (proyecto: Proyecto) => <ui-item value={proyecto.espacio} part="sección_diseñadores">{proyecto.nombre}</ui-item>)}
            </ui-select>
            <ui-button class="design" color="primary" title="Dejarle cambiar las páginas de este espacio" disabled={this.diseñadorNuevo.persona === ""} onClick={core.pressed(this, () => this.agregarElDiseñadorNuevo())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Puede diseñarlo
            </ui-button>
          </ui-stack>
        </ui-form>
        {core.drawRead(async () => await core.savedThings(Diseñador, {}, "as drawn"), (diseñador: Diseñador) => <>
          <es-celda data-column="Quién" title={diseñador.persona}>{diseñador.nombrePersona}</es-celda>
          <es-celda data-column="Diseña">
            <ui-text color="grey">{diseñador.espacio}</ui-text>
          </es-celda>
          <es-celda data-column="">
            <ui-button class="undesign" icon="close" size="mini" appearance="transparent" aria-label="Ya no lo diseña" title="Ya no lo diseña:  sus borradores se quedan, para un Manager" onClick={core.pressed(this, () => core.removeSaved(diseñador))} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
          </es-celda>
        </>, {
          waiting: () => <ui-loader visible={true} inline={true} text={true} part="sección_diseñadores">
            {"Buscando quién diseña qué"}
          </ui-loader>,
          items: () => <es-tabla appearance="very-basic" selectable={true} unstackable={true} part="sección_diseñadores">
            <es-fila />
          </es-tabla>,
          none: () => <ui-text class="none" color="grey" part="sección_diseñadores">
            Solo los Managers de cada espacio, por ahora.
          </ui-text>
        })}
      </ui-stack>
    )
  }

  drawSecciónAplicaciones() {
    return (
      <ui-stack class="apps" part="sección_aplicaciones">
        <ui-header size="medium">Aplicaciones aprobadas</ui-header>
        <ui-form class="add" prop:value={this.aprobaciónNueva}>
          <ui-stack class="row" direction="horizontal" align="center" wrap={true}>
            <ui-input name="nombre" placeholder="@spell/sign-up-sheet" aria-label="Aplicación" fluid={true} />
            <ui-input name="versión" placeholder="1.0.0" aria-label="Versión" />
            <ui-button class="approve" color="primary" title="Dejar que los espacios de la org la instalen" disabled={this.aprobaciónNueva.nombre === ""} onClick={core.pressed(this, () => this.aprobarLaAprobaciónNueva())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Aprobar
            </ui-button>
          </ui-stack>
        </ui-form>
        {core.drawRead(async () => await core.savedThings(Aprobación, {}, "as drawn"), (aprobación: Aprobación) => <>
          <es-celda data-column="Aplicación">{aprobación.nombre}</es-celda>
          <es-celda data-column="Versión">{aprobación.versión}</es-celda>
          <es-celda data-column="">
            <ui-button class="unapprove" icon="close" size="mini" appearance="transparent" aria-label="Quitarla de la lista" title="Quitarla de la lista" onClick={core.pressed(this, () => core.removeSaved(aprobación))} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
          </es-celda>
        </>, {
          waiting: () => <ui-loader visible={true} inline={true} text={true} part="sección_aplicaciones">
            {"Buscando las aplicaciones aprobadas"}
          </ui-loader>,
          items: () => <es-tabla appearance="very-basic" selectable={true} unstackable={true} part="sección_aplicaciones">
            <es-fila />
          </es-tabla>,
          none: () => <ui-text class="none" color="grey" part="sección_aplicaciones">Ninguna aplicación aprobada todavía.</ui-text>
        })}
      </ui-stack>
    )
  }

  drawSecciónEtapas() {
    return (
      <ui-stack class="stages" part="sección_etapas">
        <ui-header size="medium">Etapas de los eventos</ui-header>
        <ui-form class="add" prop:value={this.etapaNueva}>
          <ui-stack class="row" direction="horizontal" align="center" wrap={true}>
            <ui-input name="nombre" placeholder="Una etapa:  Ensayo" aria-label="Etapa" fluid={true} />
            <ui-select name="siguiente" placeholder="Lleva a" aria-label="Lleva a">
              {core.drawRead(async () => await core.savedThings(Etapa, {}, "as drawn"), (etapa: Etapa) => <ui-item value={etapa.id} part="sección_etapas">{etapa.nombre}</ui-item>)}
            </ui-select>
            <ui-select name="quién mueve" placeholder="La mueve" aria-label="La mueve">
              <ui-item value="the team">El equipo</ui-item>
              <ui-item value="its organizers">Sus organizadores</ui-item>
            </ui-select>
            <ui-button class="stage-it" color="primary" title="Agregar esta etapa, o cambiar la de ese nombre" disabled={this.etapaNueva.nombre === ""} onClick={core.pressed(this, () => this.agregarLaEtapaNueva())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Agregar o cambiar
            </ui-button>
          </ui-stack>
        </ui-form>
        {core.drawRead(async () => await core.savedThings(Etapa, {}, "as drawn"), (etapa: Etapa) => <>
          <es-celda data-column="Etapa">{etapa.nombre}</es-celda>
          <es-celda data-column="Lleva a">
            <ui-text color="grey">{etapa.siguiente}</ui-text>
          </es-celda>
          <es-celda data-column="La mueve">{etapa.quiénMueve}</es-celda>
          <es-celda data-column="">
            <ui-button class="unstage" icon="close" size="mini" appearance="transparent" aria-label="Quitar esta etapa" title="Quitar esta etapa:  no mientras haya un evento en ella, o otra lleve a ella" onClick={core.pressed(this, () => core.removeSaved(etapa))} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
          </es-celda>
        </>, { waiting: () => <ui-loader visible={true} inline={true} text={true} part="sección_etapas">
          {"Buscando las etapas de los eventos"}
        </ui-loader>, items: () => <es-tabla appearance="very-basic" selectable={true} unstackable={true} part="sección_etapas">
          <es-fila />
        </es-tabla> })}
      </ui-stack>
    )
  }

  drawSecciónRegistro() {
    return (
      <ui-stack class="log" part="sección_registro">
        <ui-header size="medium">Registro</ui-header>
        {core.drawRead(async () => await core.savedThings(Cambio, { sort: [{ field: "cuándo", descending: true }] }, "as drawn"), (cambio: Cambio) => <>
          <es-celda data-column="Cuándo">
            <ui-text color="grey">{cambio.cuándo}</ui-text>
          </es-celda>
          <es-celda data-column="Quién">{cambio.quién}</es-celda>
          <es-celda data-column="Hizo">
            <ui-label size="small">{cambio.hecho}</ui-label>
          </es-celda>
          <es-celda data-column="Qué">{cambio.qué}</es-celda>
          <es-celda data-column="Por qué">{cambio.porQué}</es-celda>
        </>, {
          waiting: () => <ui-loader visible={true} inline={true} text={true} part="sección_registro">{"Leyendo el registro"}</ui-loader>,
          items: () => <es-tabla appearance="very-basic" unstackable={true} part="sección_registro">
            <es-fila />
          </es-tabla>,
          none: () => <ui-text class="none" color="grey" part="sección_registro">Nada ha cambiado todavía.</ui-text>
        })}
      </ui-stack>
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

  drawSecciónPersonas() {
    return this.currentThing?.drawSecciónPersonas()
  }

  drawSecciónEquipos() {
    return this.currentThing?.drawSecciónEquipos()
  }

  drawSecciónRoles() {
    return this.currentThing?.drawSecciónRoles()
  }

  drawSecciónDiseñadores() {
    return this.currentThing?.drawSecciónDiseñadores()
  }

  drawSecciónAplicaciones() {
    return this.currentThing?.drawSecciónAplicaciones()
  }

  drawSecciónEtapas() {
    return this.currentThing?.drawSecciónEtapas()
  }

  drawSecciónRegistro() {
    return this.currentThing?.drawSecciónRegistro()
  }
}
core.useElement(AdministraciónDeLaOrg, AdministraciónDeLaOrgElement)
export const administraciónDeLaOrg = new AdministraciónDeLaOrg()
// -----------
core.installStyles(undefined, `/* The page takes the theme's colours and type, light or dark, as its controls do. */¬.org-admin {¬  min-height: 100%;¬  color: CanvasText;¬  background: var(--ui-background);¬  font-family: var(--ui-font-family);¬}¬¬/* The section showing stands a little apart from the list of them. */¬.org-admin ui-tab {¬  margin-inline-start: 1rem;¬}¬¬/* The toolbar:  a rule below it, its title over the sections' labels. */¬.org-admin .top-bar {¬  padding-inline: 15px 0;¬  border-block-end: var(--ui-border-width, 1px) solid var(--ui-border-color);¬  margin-block-end: 0.75rem;¬  --ui-menu-item-padding: 0.5em 0.6em;¬}¬.org-admin .top-bar::part(menu) {¬  margin-block: 0;¬}¬.org-admin .top-bar::part(title) {¬  margin-inline-end: 12px;¬}¬¬/* Tables scroll inside themselves on a narrow page, rather than breaking a date in two. */¬.org-admin es-fila > es-celda {¬  color: CanvasText;¬  white-space: nowrap;¬  min-inline-size: max-content;¬}¬¬/* An add form:  its button keeps its size as the row wraps. */¬.org-admin .add .row > ui-button {¬  flex: none;¬}¬¬/* A row's take-away button stays quiet until the row is pointed at, or the button has the keyboard. */¬.org-admin es-tabla ui-button[icon="close"] {¬  opacity: 0;¬}¬.org-admin es-tabla es-fila:hover ui-button[icon="close"],¬.org-admin es-tabla ui-button[icon="close"]:focus-within {¬  opacity: 1;¬}¬¬/* A phone has nothing to point with. */¬@media (hover: none) {¬  .org-admin es-tabla ui-button[icon="close"] {¬    opacity: 1;¬  }¬}¬¬/* Too narrow for the sections to sit beside what they show:  they go above it. */¬@media (max-width: 640px) {¬  .org-admin ui-tab {¬    min-width: 100%;¬    margin-inline-start: 0;¬    margin-block-start: 0.75rem;¬  }¬}¬`)
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
