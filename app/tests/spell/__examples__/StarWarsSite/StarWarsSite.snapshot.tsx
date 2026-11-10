import { core, Thing, View, Page, Site, Place, prop, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"
import { Character, Planet, Film, Species, Vehicle, Starship, WikiPage, Namespace, Title, Thumbnail, Originalimage, ContentUrl, Desktop, Mobile, Card, StarWar, Wikipedia } from "@spell/project/@spell/examples/StarWars"

core.heading("Reviews:  kept on this device")
///////////////////////////////////
// ## Reviews:  kept on this device
///////////////////////////////////

export class Review extends Thing {
  // - its "film title" is text
  @prop({ type: "text", declaredAt: { path: "/StarWarsReviews.api.spell", start: 325, end: 352 } })
  accessor filmTitle!: string

  // - its "stars" is a number
  @prop({ type: "number", declaredAt: { path: "/StarWarsReviews.api.spell", start: 357, end: 387 } })
  accessor stars!: number

  // - its "words" is text
  @prop({ type: "text", declaredAt: { path: "/StarWarsReviews.api.spell", start: 393, end: 415 } })
  accessor words!: string

  static savedIn = {
    place: "galaxy_reviews",
    collection: "reviews",
    times: ["created", "modified"]
  }

  // - it lives in galaxy reviews
  @prop({ type: "date", declaredAt: { path: "/StarWarsReviews.api.spell", start: 287, end: 313 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in galaxy reviews
  @prop({ type: "date", declaredAt: { path: "/StarWarsReviews.api.spell", start: 287, end: 313 } })
  accessor modified!: any /* spell: type unknown */
}

/**
 * What people think of a film, written on the site's film pages (epic `mockup` P8).
 * Kept in this browser:  change the next line to keep them somewhere else, and nothing else changes.
 */
export class GalaxyReview extends Place {}
export const galaxyReviews = core.place(new GalaxyReview(), { name: "galaxy_reviews", kind: "database on this device" })

// -----------
//
// The whole Star Wars example as a site (epic `mockup` P1), and its click-through mockup (P8):  each of its
// collections, films, people, planets, species, vehicles and starships, as a list page and a page for one of them.
// Each page says first what it must let people do, its jobs (epic `mockup` P6), plain lines or Agile stories,
// ticked where the mockup does it.
// The site says where each page is, and fills what an address names:  "/films/:film" shows the film page, its film
// the one the address names.
// It wears the Mockup theme, a hand-drawn sketch, so nobody takes it for the finished look.
// Its people, planets and ships are read from swapi.py4e.com, as the Star Wars example's are;  its reviews are kept
// on this device (StarWarsReviews.api.spell).
//

core.heading("Every page's top:  its title, and the settings")
//# Every page's top:  its title, and the settings

export class PageTop extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "title" is a text
  @prop({ type: "text" })
  accessor title!: string

  @drawn draw() {
    return (
      <ui-stack direction="horizontal" align="center" justify="between">
        <ui-header size="large">{this.title}</ui-header>
        <ui-button class="settings" appearance="basic" icon="cog" onClick={core.pressed(this, () => core.showSitePart("settings dialog"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Settings
        </ui-button>
      </ui-stack>
    )
  }
}

/**
 * `<test-project-page-top>`:  a page top, drawn in its own element, e.g. by `draw the page top`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its page top's properties;  its methods call its page top's.
 * - What every view's element does, e.g. drawing its page top, is `SpellElement`'s.
 */
export class PageTopElement extends SpellElement<PageTop> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-page-top", "page top", [])
}
core.useElement(PageTop, PageTopElement)

core.heading("The films")
//# The films

/** A person in a few lines:  the page and the sidebar both show them */
export class PersonFact extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "person" is a character
  static { this.declareProp("person", { type: "Character", link: true }) }
  get person(): Character { return core.linked(this, "person", Character) as Character }
  set person(value: Character) { this.setProp("person", value) }

  static drawsWaiting = true
  @drawn draw() {
    return (
      <ui-table appearance="definition" celled={true} unstackable={true}>
        <ui-row>
          <ui-cell>Born</ui-cell>
          <ui-cell>{core.whileWaiting(() => this.person?.birthYear)}</ui-cell>
        </ui-row>
        <ui-row>
          <ui-cell>Height</ui-cell>
          <ui-cell>{core.whileWaiting(() => core.measureShown(this.person?.height!, "Length", "centimeter"))}</ui-cell>
        </ui-row>
        <ui-row>
          <ui-cell>Gender</ui-cell>
          <ui-cell>{core.whileWaiting(() => this.person?.gender)}</ui-cell>
        </ui-row>
        <ui-row>
          <ui-cell>Home</ui-cell>
          <ui-cell>
            <ui-link link={core.siteAddressOf("planet page", this.person?.homeworld!)}>
              {core.whileWaiting(() => this.person?.homeworld?.name)}
            </ui-link>
          </ui-cell>
        </ui-row>
      </ui-table>
    )
  }
}

/**
 * `<test-project-person-fact>`:  a person fact, drawn in its own element, e.g. by `draw the person fact`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its person fact's properties;  its methods call its person fact's.
 * - What every view's element does, e.g. drawing its person fact, is `SpellElement`'s.
 */
export class PersonFactElement extends SpellElement<PersonFact> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-person-fact", "person fact", [
    { name: "person", kind: "string", description: "Its person." }
  ])
}
core.useElement(PersonFact, PersonFactElement)

export class PersonSidebar extends View {
  static elementTag = core.defineElement(this, "test-project")

  /** Whoever it's showing */
  // - its "person" is a character
  static { this.declareProp("person", { type: "Character", link: true }) }
  get person(): Character { return core.linked(this, "person", Character) as Character }
  set person(value: Character) { this.setProp("person", value) }

  static drawsWaiting = true
  @drawn draw() {
    return [
      <ui-header size="medium">{core.whileWaiting(() => this.person?.name)}</ui-header>,
      core.drawThing(new PersonFact({ person: this.person })),
      <ui-link class="whole-page" link={core.siteAddressOf("person page", this.person!)}>Their whole page</ui-link>
    ]
  }
}

/**
 * `<test-project-person-sidebar>`:  a person sidebar, drawn in its own element, e.g. by `draw the person sidebar`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its person sidebar's properties;  its methods call its person sidebar's.
 * - What every view's element does, e.g. drawing its person sidebar, is `SpellElement`'s.
 */
export class PersonSidebarElement extends SpellElement<PersonSidebar> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-person-sidebar", "person sidebar", [
    { name: "person", kind: "string", description: "Its person." }
  ])
}
core.useElement(PersonSidebar, PersonSidebarElement)

export type Units = (typeof SettingsDialog.Units)[number]
export type Crawl = (typeof SettingsDialog.Crawls)[number]

export class SettingsDialog extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "units" is metric or imperial
  static Units = ["metric", "imperial"] as const
  @prop({ oneOf: () => SettingsDialog.Units })
  accessor units!: Units

  // - its "crawl" is shown or hidden
  static Crawls = ["shown", "hidden"] as const
  @prop({ oneOf: () => SettingsDialog.Crawls })
  accessor crawl!: Crawl

  @drawn draw() {
    return (
      <>
        <ui-header size="medium">Settings</ui-header>
        <ui-form value={this}>
          <ui-field label="Lengths and weights in">
            <ui-select name="units">
              <ui-item value="metric">Metres and kilos</ui-item>
              <ui-item value="imperial">Feet and pounds</ui-item>
            </ui-select>
          </ui-field>
          <ui-field label="A film's opening crawl">
            <ui-select name="crawl">
              <ui-item value="shown">Shown</ui-item>
              <ui-item value="hidden">Hidden</ui-item>
            </ui-select>
          </ui-field>
        </ui-form>
        <ui-button class="done" color="primary" onClick={core.pressed(this, () => core.closeSitePart("settings dialog"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Done
        </ui-button>
      </>
    )
  }
}

/**
 * `<test-project-settings-dialog>`:  a settings dialog, drawn in its own element, e.g. by `draw the settings dialog`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its settings dialog's properties;  its methods call its settings dialog's.
 * - What every view's element does, e.g. drawing its settings dialog, is `SpellElement`'s.
 */
export class SettingsDialogElement extends SpellElement<SettingsDialog> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-settings-dialog", "settings dialog", [
    { name: "units", kind: "string", description: "Its units." },
    { name: "crawl", kind: "string", description: "Its crawl." }
  ])
}
core.useElement(SettingsDialog, SettingsDialogElement)

export class ReviewDialog extends View {
  static elementTag = core.defineElement(this, "test-project")

  /** The film it's a review of */
  // - its "film" is a film
  static { this.declareProp("film", { type: "Film", link: true }) }
  get film(): Film { return core.linked(this, "film", Film) as Film }
  set film(value: Film) { this.setProp("film", value) }

  /** The review being written:  saved when it's done */
  // - its "draft" is a new review with stars = 5
  @prop({ init: () => new Review({ stars: 5 }), early: true })
  accessor draft!: Review

  async saveTheReview() {
    this.draft.filmTitle = (await core.answerOf(this, "film"))?.title
    core.saveThing(this.draft)
    this.draft = new Review({ stars: 5 })
    core.closeSitePart("review dialog")
  }

  @drawn draw() {
    return (
      <>
        <ui-header size="medium">Review {core.whileWaiting(() => this.film?.title)}</ui-header>
        <ui-form prop:value={this.draft}>
          <ui-field label="Stars">
            <ui-input class="stars" name="stars" type="number" min="1" max="5" />
          </ui-field>
          <ui-field label="What did you think?">
            <ui-textarea class="words" name="words" rows="4" />
          </ui-field>
        </ui-form>
        <ui-button class="save-review" color="primary" disabled={this.draft.words === ""} onClick={core.pressed(this, async () => await this.saveTheReview())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Save the review
        </ui-button>
      </>
    )
  }
}

/**
 * `<test-project-review-dialog>`:  a review dialog, drawn in its own element, e.g. by `draw the review dialog`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its review dialog's properties;  its methods call its review dialog's.
 * - What every view's element does, e.g. drawing its review dialog, is `SpellElement`'s.
 */
export class ReviewDialogElement extends SpellElement<ReviewDialog> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-review-dialog", "review dialog", [
    { name: "film", kind: "string", description: "Its film." },
    { name: "draft", kind: "json", description: "Its draft." }
  ])

  saveTheReview() {
    return this.currentThing?.saveTheReview()
  }
}
core.useElement(ReviewDialog, ReviewDialogElement)

export class FilmsPage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  static stories = "<story \"S1\" done>see every film, in the order they came out</story>\n<story \"S2\">\n  As a fan, I want to sort the films by when they're set, so that I can watch them in story order\n  - done when:  a switch flips the list between release and story order\n</story>\n<story \"S3\" done>open a film's page from its row</story>"

  @drawn draw() {
    return [
      core.drawThing(new PageTop({ title: "Films" })),
      core.drawRead(async () => await core.savedThings(Film, {}, "as drawn"), (film: Film) => <>
        <ui-cell data-column="Episode">{film.episodeId}</ui-cell>
        <ui-cell data-column="Title">
          <ui-link class="film" link={core.siteAddressOf("film page", film)}>{film.title}</ui-link>
        </ui-cell>
        <ui-cell data-column="Directed by">{film.director}</ui-cell>
        <ui-cell data-column="Released">{core.dateShown(film.releaseDate)}</ui-cell>
      </>, { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Asking the galaxy for its films"}</ui-loader>, items: () => <ui-table celled={true} selectable={true}>
        <ui-row />
      </ui-table> })
    ]
  }
}

/**
 * `<test-project-films-page>`:  a films page, drawn in its own element, e.g. by `draw the films page`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its films page's properties;  its methods call its films page's.
 * - What every view's element does, e.g. drawing its films page, is `SpellElement`'s.
 */
export class FilmsPageElement extends SpellElement<FilmsPage> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-films-page", "films page", [])
}
core.useElement(FilmsPage, FilmsPageElement)
export const filmsPage = new FilmsPage()

export class FilmPage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  static stories = "<story \"S1\" done>read the film's opening crawl</story>\n<story \"S2\" done>\n  As a fan, I want to see who's in a film, so that I can find their other films\n  - done when:  its people are listed, each a link to their page\n</story>\n<story \"S3\" done>see the planets, starships and vehicles it shows</story>\n<story \"S4\" done>\n  As a fan, I want to say what I thought of a film, so that I remember it\n  - done when:  \"Add a review\" asks for stars and words, and the film's page lists the reviews\n</story>"

  /** The film the address names:  /films/:film */
  // - its "film" is a film
  static { this.declareProp("film", { type: "Film", link: true }) }
  get film(): Film { return core.linked(this, "film", Film) as Film }
  set film(value: Film) { this.setProp("film", value) }

  /** What's been said of it, on this device */
  static { this.declareProp("reviews", { declaredAt: { path: "/StarWarsSite.spell", start: 2597, end: 2791 }, readsFrom: ["galaxy_reviews"] }) }
  get reviews() { return core.waitedValue(this, "reviews", async () => {
    const title = (await core.answerOf(this, "film"))?.title
    return await core.savedThings(Review, { filter: { filmTitle: title }, sort: [{ field: "created", descending: true }] })
  }) }

  static drawsWaiting = true
  @drawn draw() {
    return [
      core.drawThing(new PageTop({ title: this.film?.title })),
      <ui-text color="grey">
        {"Episode "}
        {core.whileWaiting(() => this.film?.episodeId)}
        {" · directed by "}
        {core.whileWaiting(() => this.film?.director)}
        {" · released "}
        {core.whileWaiting(() => core.dateShown(this.film?.releaseDate!))}
      </ui-text>,
      <ui-segment>
        <ui-text paragraph={true}>{core.whileWaiting(() => this.film?.openingCrawl)}</ui-text>
      </ui-segment>,
      <ui-header size="small">Who's in it</ui-header>,
      core.drawRead(() => this.film?.characters, (person: Character) => <ui-button class="person" appearance="basic" size="small" onClick={core.pressed(this, () => core.showSitePart("person sidebar", person))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
        {person.name}
      </ui-button>, { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Following the links"}</ui-loader>, items: () => <ui-stack direction="horizontal" wrap={true} spacing="xs" /> }),
      <ui-header size="small">Where it happens</ui-header>,
      core.drawRead(() => this.film?.planets, (planet: Planet) => <ui-link link={core.siteAddressOf("planet page", planet)}>{planet.name}</ui-link>, { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Following the links"}</ui-loader>, items: () => <ui-stack direction="horizontal" wrap={true} spacing="xs" /> }),
      <ui-header size="small">What they fly</ui-header>,
      core.drawRead(() => this.film?.starships, (starship: Starship) => <ui-link link={core.siteAddressOf("starship page", starship)}>{starship.name}</ui-link>, { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Following the links"}</ui-loader>, items: () => <ui-stack direction="horizontal" wrap={true} spacing="xs" /> }),
      <ui-header size="small">What they drive</ui-header>,
      core.drawRead(() => this.film?.vehicles, (vehicle: Vehicle) => <ui-link link={core.siteAddressOf("vehicle page", vehicle)}>{vehicle.name}</ui-link>, { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Following the links"}</ui-loader>, items: () => <ui-stack direction="horizontal" wrap={true} spacing="xs" /> }),
      <ui-stack direction="horizontal" align="center" justify="between">
        <ui-header size="small">Reviews</ui-header>
        <ui-button class="add-review" color="primary" icon="pencil" onClick={core.pressed(this, async () => core.showSitePart("review dialog", (await core.answerOf(this, "film"))!))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Add a review
        </ui-button>
      </ui-stack>,
      core.drawRead(() => this.reviews, (review: Review) => <ui-segment class="review">
        <ui-text>{review.stars} of 5 · {review.words}</ui-text>
      </ui-segment>, { none: () => <ui-text>{"No reviews yet:  be the first."}</ui-text> })
    ]
  }
}

/**
 * `<test-project-film-page>`:  a film page, drawn in its own element, e.g. by `draw the film page`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its film page's properties;  its methods call its film page's.
 * - What every view's element does, e.g. drawing its film page, is `SpellElement`'s.
 */
export class FilmPageElement extends SpellElement<FilmPage> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-film-page", "film page", [
    { name: "film", kind: "string", description: "Its film." }
  ])
}
core.useElement(FilmPage, FilmPageElement)
export const filmPage = new FilmPage()

core.heading("The people")
//# The people

export class PeoplePage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  static stories = "<story \"S1\">find a person by name as I type</story>\n<story \"S2\" done>see each person's home planet and species at a glance</story>\n<story \"S3\" done>open a person in the side panel without leaving the list</story>"

  @drawn draw() {
    return [
      core.drawThing(new PageTop({ title: "People" })),
      core.drawRead(async () => await core.savedThings(Character, {}, "as drawn"), (person: Character) => <>
        <ui-cell data-column="Name">
          <ui-link link={core.siteAddressOf("person page", person)}>{person.name}</ui-link>
        </ui-cell>
        <ui-cell data-column="Born">{person.birthYear}</ui-cell>
        <ui-cell data-column="Home">{person.homeworld.name}</ui-cell>
        <ui-cell data-column="">
          <ui-button appearance="basic" size="small" onClick={core.pressed(this, () => core.showSitePart("person sidebar", person))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
            Glance
          </ui-button>
        </ui-cell>
      </>, { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Asking the galaxy for its people"}</ui-loader>, items: () => <ui-table celled={true} selectable={true}>
        <ui-row />
      </ui-table> })
    ]
  }
}

/**
 * `<test-project-people-page>`:  a people page, drawn in its own element, e.g. by `draw the people page`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its people page's properties;  its methods call its people page's.
 * - What every view's element does, e.g. drawing its people page, is `SpellElement`'s.
 */
export class PeoplePageElement extends SpellElement<PeoplePage> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-people-page", "people page", [])
}
core.useElement(PeoplePage, PeoplePageElement)
export const peoplePage = new PeoplePage()

export class PersonPage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  static stories = "<story \"S1\" done>see a person's height, birth year and home planet</story>\n<story \"S2\" done>\n  As a fan, I want to see every film a person is in, so that I can follow their story\n  - done when:  their films are listed in release order, each a link\n</story>"

  /** The person the address names:  /people/:person */
  // - its "person" is a character
  static { this.declareProp("person", { type: "Character", link: true }) }
  get person(): Character { return core.linked(this, "person", Character) as Character }
  set person(value: Character) { this.setProp("person", value) }

  static drawsWaiting = true
  @drawn draw() {
    return [
      core.drawThing(new PageTop({ title: this.person?.name })),
      core.drawThing(new PersonFact({ person: this.person })),
      <ui-header size="small">Films</ui-header>,
      core.drawRead(() => this.person?.films, (film: Film) => <ui-link link={core.siteAddressOf("film page", film)}>{film.title}</ui-link>, { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Following the links"}</ui-loader>, items: () => <ui-stack direction="horizontal" wrap={true} spacing="xs" /> })
    ]
  }
}

/**
 * `<test-project-person-page>`:  a person page, drawn in its own element, e.g. by `draw the person page`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its person page's properties;  its methods call its person page's.
 * - What every view's element does, e.g. drawing its person page, is `SpellElement`'s.
 */
export class PersonPageElement extends SpellElement<PersonPage> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-person-page", "person page", [
    { name: "person", kind: "string", description: "Its person." }
  ])
}
core.useElement(PersonPage, PersonPageElement)
export const personPage = new PersonPage()

core.heading("The planets")
//# The planets

export class PlanetsPage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  static stories = "<story \"S1\" done>see every planet, with its climate and terrain</story>\n<story \"S2\">sort the planets by how many people live there</story>"

  @drawn draw() {
    return [
      core.drawThing(new PageTop({ title: "Planets" })),
      core.drawRead(async () => await core.savedThings(Planet, {}, "as drawn"), (planet: Planet) => <>
        <ui-cell data-column="Name">
          <ui-link link={core.siteAddressOf("planet page", planet)}>{planet.name}</ui-link>
        </ui-cell>
        <ui-cell data-column="Climate">{planet.climate}</ui-cell>
        <ui-cell data-column="Terrain">{planet.terrain}</ui-cell>
        <ui-cell data-column="Population">{planet.population}</ui-cell>
      </>, { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Asking the galaxy for its planets"}</ui-loader>, items: () => <ui-table celled={true} selectable={true}>
        <ui-row />
      </ui-table> })
    ]
  }
}

/**
 * `<test-project-planets-page>`:  a planets page, drawn in its own element, e.g. by `draw the planets page`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its planets page's properties;  its methods call its planets page's.
 * - What every view's element does, e.g. drawing its planets page, is `SpellElement`'s.
 */
export class PlanetsPageElement extends SpellElement<PlanetsPage> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-planets-page", "planets page", [])
}
core.useElement(PlanetsPage, PlanetsPageElement)
export const planetsPage = new PlanetsPage()

export class PlanetPage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  static stories = "<story \"S1\" done>see who comes from a planet</story>\n<story \"S2\" done>see the films a planet appears in</story>"

  /** The planet the address names:  /planets/:planet */
  // - its "planet" is a planet
  static { this.declareProp("planet", { type: "Planet", link: true }) }
  get planet(): Planet { return core.linked(this, "planet", Planet) as Planet }
  set planet(value: Planet) { this.setProp("planet", value) }

  static drawsWaiting = true
  @drawn draw() {
    return [
      core.drawThing(new PageTop({ title: this.planet?.name })),
      <ui-text color="grey">
        {core.whileWaiting(() => this.planet?.climate)}
        {" · "}
        {core.whileWaiting(() => this.planet?.terrain)}
        {" · "}
        {core.whileWaiting(() => this.planet?.population)}
        {" people"}
      </ui-text>,
      <ui-header size="small">Who's from here</ui-header>,
      core.drawRead(() => this.planet?.residents, (person: Character) => <ui-button appearance="basic" size="small" onClick={core.pressed(this, () => core.showSitePart("person sidebar", person))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
        {person.name}
      </ui-button>, { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Following the links"}</ui-loader>, items: () => <ui-stack direction="horizontal" wrap={true} spacing="xs" /> }),
      <ui-header size="small">Seen in</ui-header>,
      core.drawRead(() => this.planet?.films, (film: Film) => <ui-link link={core.siteAddressOf("film page", film)}>{film.title}</ui-link>, { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Following the links"}</ui-loader>, items: () => <ui-stack direction="horizontal" wrap={true} spacing="xs" /> })
    ]
  }
}

/**
 * `<test-project-planet-page>`:  a planet page, drawn in its own element, e.g. by `draw the planet page`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its planet page's properties;  its methods call its planet page's.
 * - What every view's element does, e.g. drawing its planet page, is `SpellElement`'s.
 */
export class PlanetPageElement extends SpellElement<PlanetPage> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-planet-page", "planet page", [
    { name: "planet", kind: "string", description: "Its planet." }
  ])
}
core.useElement(PlanetPage, PlanetPageElement)
export const planetPage = new PlanetPage()

core.heading("The species")
//# The species

export class SpeciesListPage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  static stories = "<story \"S1\" done>see every species, with its classification and language</story>\n<story \"S2\">filter the species by how long they live</story>"

  @drawn draw() {
    return [
      core.drawThing(new PageTop({ title: "Species" })),
      core.drawRead(async () => await core.savedThings(Species, {}, "as drawn"), (one: Species) => <>
        <ui-cell data-column="Name">
          <ui-link link={core.siteAddressOf("species page", one)}>{one.name}</ui-link>
        </ui-cell>
        <ui-cell data-column="Classification">{one.classification}</ui-cell>
        <ui-cell data-column="Language">{one.language}</ui-cell>
        <ui-cell data-column="Lives">{one.averageLifespan}</ui-cell>
      </>, { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Asking the galaxy for its species"}</ui-loader>, items: () => <ui-table celled={true} selectable={true}>
        <ui-row />
      </ui-table> })
    ]
  }
}

/**
 * `<test-project-species-list-page>`:  a species list page, drawn in its own element, e.g. by `draw the species list page`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its species list page's properties;  its methods call its species list page's.
 * - What every view's element does, e.g. drawing its species list page, is `SpellElement`'s.
 */
export class SpeciesListPageElement extends SpellElement<SpeciesListPage> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-species-list-page", "species list page", [])
}
core.useElement(SpeciesListPage, SpeciesListPageElement)
export const speciesListPage = new SpeciesListPage()

export class SpeciesPage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  static stories = "<story \"S1\" done>see the people of a species</story>\n<story \"S2\">see a species' home world</story>"

  /** The species the address names:  /species/:species */
  // - its "species" is a species
  static { this.declareProp("species", { type: "Species", link: true }) }
  get species(): Species { return core.linked(this, "species", Species) as Species }
  set species(value: Species) { this.setProp("species", value) }

  static drawsWaiting = true
  @drawn draw() {
    return [
      core.drawThing(new PageTop({ title: this.species?.name })),
      <ui-text color="grey">
        {core.whileWaiting(() => this.species?.classification)}
        {" · speaks "}
        {core.whileWaiting(() => this.species?.language)}
      </ui-text>,
      <ui-header size="small">Its people</ui-header>,
      core.drawRead(() => this.species?.people, (person: Character) => <ui-button appearance="basic" size="small" onClick={core.pressed(this, () => core.showSitePart("person sidebar", person))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
        {person.name}
      </ui-button>, { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Following the links"}</ui-loader>, items: () => <ui-stack direction="horizontal" wrap={true} spacing="xs" /> })
    ]
  }
}

/**
 * `<test-project-species-page>`:  a species page, drawn in its own element, e.g. by `draw the species page`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its species page's properties;  its methods call its species page's.
 * - What every view's element does, e.g. drawing its species page, is `SpellElement`'s.
 */
export class SpeciesPageElement extends SpellElement<SpeciesPage> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-species-page", "species page", [
    { name: "species", kind: "string", description: "Its species." }
  ])
}
core.useElement(SpeciesPage, SpeciesPageElement)
export const speciesPage = new SpeciesPage()

core.heading("The vehicles and starships")
//# The vehicles and starships

export class VehiclesPage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  static stories = "<story \"S1\" done>see every vehicle, with its class and crew</story>\n<story \"S2\">sort the vehicles by speed</story>"

  @drawn draw() {
    return [
      core.drawThing(new PageTop({ title: "Vehicles" })),
      core.drawRead(async () => await core.savedThings(Vehicle, {}, "as drawn"), (vehicle: Vehicle) => <>
        <ui-cell data-column="Name">
          <ui-link link={core.siteAddressOf("vehicle page", vehicle)}>{vehicle.name}</ui-link>
        </ui-cell>
        <ui-cell data-column="Class">{vehicle.vehicleClass}</ui-cell>
        <ui-cell data-column="Crew">{vehicle.crew}</ui-cell>
      </>, { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Asking the galaxy for its vehicles"}</ui-loader>, items: () => <ui-table celled={true} selectable={true}>
        <ui-row />
      </ui-table> })
    ]
  }
}

/**
 * `<test-project-vehicles-page>`:  a vehicles page, drawn in its own element, e.g. by `draw the vehicles page`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its vehicles page's properties;  its methods call its vehicles page's.
 * - What every view's element does, e.g. drawing its vehicles page, is `SpellElement`'s.
 */
export class VehiclesPageElement extends SpellElement<VehiclesPage> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-vehicles-page", "vehicles page", [])
}
core.useElement(VehiclesPage, VehiclesPageElement)
export const vehiclesPage = new VehiclesPage()

export class VehiclePage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  static stories = "<story \"S1\" done>see who has piloted a vehicle</story>\n<story \"S2\" done>see the films it appears in</story>"

  /** The vehicle the address names:  /vehicles/:vehicle */
  // - its "vehicle" is a vehicle
  static { this.declareProp("vehicle", { type: "Vehicle", link: true }) }
  get vehicle(): Vehicle { return core.linked(this, "vehicle", Vehicle) as Vehicle }
  set vehicle(value: Vehicle) { this.setProp("vehicle", value) }

  static drawsWaiting = true
  @drawn draw() {
    return [
      core.drawThing(new PageTop({ title: this.vehicle?.name })),
      <ui-text color="grey">
        {core.whileWaiting(() => this.vehicle?.model)}
        {" · "}
        {core.whileWaiting(() => this.vehicle?.manufacturer)}
      </ui-text>,
      <ui-header size="small">Piloted by</ui-header>,
      core.drawRead(() => this.vehicle?.pilots, (person: Character) => <ui-button appearance="basic" size="small" onClick={core.pressed(this, () => core.showSitePart("person sidebar", person))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
        {person.name}
      </ui-button>, {
        waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Following the links"}</ui-loader>,
        none: () => <ui-text>{"Nobody we know of."}</ui-text>,
        items: () => <ui-stack direction="horizontal" wrap={true} spacing="xs" />
      }),
      <ui-header size="small">Seen in</ui-header>,
      core.drawRead(() => this.vehicle?.films, (film: Film) => <ui-link link={core.siteAddressOf("film page", film)}>{film.title}</ui-link>, { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Following the links"}</ui-loader>, items: () => <ui-stack direction="horizontal" wrap={true} spacing="xs" /> })
    ]
  }
}

/**
 * `<test-project-vehicle-page>`:  a vehicle page, drawn in its own element, e.g. by `draw the vehicle page`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its vehicle page's properties;  its methods call its vehicle page's.
 * - What every view's element does, e.g. drawing its vehicle page, is `SpellElement`'s.
 */
export class VehiclePageElement extends SpellElement<VehiclePage> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-vehicle-page", "vehicle page", [
    { name: "vehicle", kind: "string", description: "Its vehicle." }
  ])
}
core.useElement(VehiclePage, VehiclePageElement)
export const vehiclePage = new VehiclePage()

export class StarshipsPage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  static stories = "<story \"S1\" done>see every starship, with its class and hyperdrive rating</story>\n<story \"S2\">\n  As a pilot, I want to compare two starships side by side, so that I can pick the faster one\n  - done when:  picking two starships shows their numbers in two columns\n</story>"

  @drawn draw() {
    return [
      core.drawThing(new PageTop({ title: "Starships" })),
      core.drawRead(async () => await core.savedThings(Starship, {}, "as drawn"), (starship: Starship) => <>
        <ui-cell data-column="Name">
          <ui-link link={core.siteAddressOf("starship page", starship)}>{starship.name}</ui-link>
        </ui-cell>
        <ui-cell data-column="Class">{starship.starshipClass}</ui-cell>
        <ui-cell data-column="Hyperdrive">{starship.hyperdriveRating}</ui-cell>
      </>, { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Asking the galaxy for its starships"}</ui-loader>, items: () => <ui-table celled={true} selectable={true}>
        <ui-row />
      </ui-table> })
    ]
  }
}

/**
 * `<test-project-starships-page>`:  a starships page, drawn in its own element, e.g. by `draw the starships page`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its starships page's properties;  its methods call its starships page's.
 * - What every view's element does, e.g. drawing its starships page, is `SpellElement`'s.
 */
export class StarshipsPageElement extends SpellElement<StarshipsPage> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-starships-page", "starships page", [])
}
core.useElement(StarshipsPage, StarshipsPageElement)
export const starshipsPage = new StarshipsPage()

export class StarshipPage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  static stories = "<story \"S1\" done>see a starship's pilots</story>\n<story \"S2\" done>see its length, crew and cost</story>"

  /** The starship the address names:  /starships/:starship */
  // - its "starship" is a starship
  static { this.declareProp("starship", { type: "Starship", link: true }) }
  get starship(): Starship { return core.linked(this, "starship", Starship) as Starship }
  set starship(value: Starship) { this.setProp("starship", value) }

  static drawsWaiting = true
  @drawn draw() {
    return [
      core.drawThing(new PageTop({ title: this.starship?.name })),
      <ui-text color="grey">
        {core.whileWaiting(() => this.starship?.length)}
        {" m long · crew "}
        {core.whileWaiting(() => this.starship?.crew)}
        {" · "}
        {core.whileWaiting(() => this.starship?.costInCredits)}
        {" credits"}
      </ui-text>,
      <ui-header size="small">Piloted by</ui-header>,
      core.drawRead(() => this.starship?.pilots, (person: Character) => <ui-button appearance="basic" size="small" onClick={core.pressed(this, () => core.showSitePart("person sidebar", person))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
        {person.name}
      </ui-button>, {
        waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Following the links"}</ui-loader>,
        none: () => <ui-text>{"Nobody we know of."}</ui-text>,
        items: () => <ui-stack direction="horizontal" wrap={true} spacing="xs" />
      })
    ]
  }
}

/**
 * `<test-project-starship-page>`:  a starship page, drawn in its own element, e.g. by `draw the starship page`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its starship page's properties;  its methods call its starship page's.
 * - What every view's element does, e.g. drawing its starship page, is `SpellElement`'s.
 */
export class StarshipPageElement extends SpellElement<StarshipPage> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-starship-page", "starship page", [
    { name: "starship", kind: "string", description: "Its starship." }
  ])
}
core.useElement(StarshipPage, StarshipPageElement)
export const starshipPage = new StarshipPage()

core.heading("Every review, edited like a spreadsheet")
//# Every review, edited like a spreadsheet

export class ReviewsPage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  static stories = "<story \"S1\" done>see every review written on this device, in one table</story>\n<story \"S2\" done>\n  As a fan, I want to fix a review's stars or words in place, so that I don't have to write it again\n  - done when:  a cell edits as a spreadsheet's does, and Enter keeps it\n</story>\n<story \"S3\" done>add or remove a review right in the table</story>\n<story \"S4\" done>paste a block of reviews copied from a spreadsheet</story>"

  static drawsWaiting = true
  @drawn draw() {
    return [
      core.drawThing(new PageTop({ title: "Reviews" })),
      <ui-table editable={true} celled={true} prop:rows={core.waitedValue(this, "every review", async () => await core.savedThings(Review))} />
    ]
  }
}

/**
 * `<test-project-reviews-page>`:  a reviews page, drawn in its own element, e.g. by `draw the reviews page`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its reviews page's properties;  its methods call its reviews page's.
 * - What every view's element does, e.g. drawing its reviews page, is `SpellElement`'s.
 */
export class ReviewsPageElement extends SpellElement<ReviewsPage> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-reviews-page", "reviews page", [])
}
core.useElement(ReviewsPage, ReviewsPageElement)
export const reviewsPage = new ReviewsPage()

core.heading("The dialogs:  the settings, and a review of a film")
//# The dialogs:  the settings, and a review of a film

core.heading("The site:  where each page is, its dialogs and sidebars, and the theme it wears")
//# The site:  where each page is, its dialogs and sidebars, and the theme it wears

export class GalaxyGuide extends Site {
  static elementTag = core.defineElement(this, "test-project")
  static pages = [{
    name: "films page",
    page: "FilmsPage",
    address: "/films",
    title: "Films",
    pages: [{
      name: "film page",
      page: "FilmPage",
      address: "/films/:film",
      title: "Film",
      params: ["film"]
    }]
  }, {
    name: "people page",
    page: "PeoplePage",
    address: "/people",
    title: "People",
    pages: [{
      name: "person page",
      page: "PersonPage",
      address: "/people/:person",
      title: "Person",
      params: ["person"]
    }]
  }, {
    name: "planets page",
    page: "PlanetsPage",
    address: "/planets",
    title: "Planets",
    pages: [{
      name: "planet page",
      page: "PlanetPage",
      address: "/planets/:planet",
      title: "Planet",
      params: ["planet"]
    }]
  }, {
    name: "species list page",
    page: "SpeciesListPage",
    address: "/species",
    title: "Species",
    pages: [{
      name: "species page",
      page: "SpeciesPage",
      address: "/species/:species",
      title: "Species",
      params: ["species"]
    }]
  }, {
    name: "vehicles page",
    page: "VehiclesPage",
    address: "/vehicles",
    title: "Vehicles",
    pages: [{
      name: "vehicle page",
      page: "VehiclePage",
      address: "/vehicles/:vehicle",
      title: "Vehicle",
      params: ["vehicle"]
    }]
  }, {
    name: "starships page",
    page: "StarshipsPage",
    address: "/starships",
    title: "Starships",
    pages: [{
      name: "starship page",
      page: "StarshipPage",
      address: "/starships/:starship",
      title: "Starship",
      params: ["starship"]
    }]
  }, {
    name: "reviews page",
    page: "ReviewsPage",
    address: "/reviews",
    title: "Reviews"
  }]
  static dialogs = [{ name: "settings dialog", view: "SettingsDialog" }, { name: "review dialog", view: "ReviewDialog" }]
  static sidebars = [{ name: "person sidebar", view: "PersonSidebar" }]
  static notFoundPage = { name: "not found page" }
  static errorPage = { name: "error page" }

  /** The theme its pages wear:  a hand-drawn sketch, while it's a mockup */
  get theme() {
    return "mockup"
  }
}

/**
 * `<test-project-galaxy-guide>`:  a galaxy guide, drawn in its own element, e.g. by `draw the galaxy guide`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its galaxy guide's properties;  its methods call its galaxy guide's.
 * - What every view's element does, e.g. drawing its galaxy guide, is `SpellElement`'s.
 */
export class GalaxyGuideElement extends SpellElement<GalaxyGuide> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-galaxy-guide", "galaxy guide", [])
}
core.useElement(GalaxyGuide, GalaxyGuideElement)
export const galaxyGuide = new GalaxyGuide()

// -----------
if (!core.isCarryingOver) galaxyGuide.start()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `PageTopElement` */
      "test-project-page-top": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `PersonFactElement` */
      "test-project-person-fact": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `PersonSidebarElement` */
      "test-project-person-sidebar": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `SettingsDialogElement` */
      "test-project-settings-dialog": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `ReviewDialogElement` */
      "test-project-review-dialog": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `FilmsPageElement` */
      "test-project-films-page": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `FilmPageElement` */
      "test-project-film-page": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `PeoplePageElement` */
      "test-project-people-page": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `PersonPageElement` */
      "test-project-person-page": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `PlanetsPageElement` */
      "test-project-planets-page": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `PlanetPageElement` */
      "test-project-planet-page": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `SpeciesListPageElement` */
      "test-project-species-list-page": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `SpeciesPageElement` */
      "test-project-species-page": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `VehiclesPageElement` */
      "test-project-vehicles-page": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `VehiclePageElement` */
      "test-project-vehicle-page": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `StarshipsPageElement` */
      "test-project-starships-page": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `StarshipPageElement` */
      "test-project-starship-page": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `ReviewsPageElement` */
      "test-project-reviews-page": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `GalaxyGuideElement` */
      "test-project-galaxy-guide": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
