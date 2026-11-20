import { core, Thing, List, App, Place, prop, thing, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("The Met Museum:  every artwork in its collection, and a search of all of it")
/////////////////////////////////////////////////////////////////////////////////
// ## The Met Museum:  every artwork in its collection, and a search of all of it
/////////////////////////////////////////////////////////////////////////////////
// A server other people run, and what it holds.  What's drawn from it is in MetArtworks.spell.
// `met museum` is what this wrote, from looking at the server:
//   spell place ingest https://collectionapi.metmuseum.org/public/collection --kind "web server" --docs https://metmuseum.github.io
//     --into MetArtworks.api.spell --name "met museum" --no-ai --collections "artworks=/v1/objects,artworks=/v1.1/search?q=sunflowers"
// `spell place update MetArtworks.api.spell` looks again, and changes only this file and MetArtworks.api.json5.
// Its list is only ids, over 500,000 of them:  each artwork is read whole from its own address, only when something reads it.
// Its search finds ids too, looking at all of each artwork, its tags too:  `every artwork matching ...`.
// Asked only for artworks with pictures (`hasImages=true`, written in by hand):  the rest would be read for nothing.
// It asks for 80 requests a second at most, in its docs:  a program keeps to that.
// Its search pages by "limit" and "offset", up to 500 at a time;  its list of every id takes neither, and comes whole.

export class Artwork extends Thing {
  // - its "highlight" is yes or no, stored as "isHighlight"
  @prop({ type: "choice", storedAs: "isHighlight", declaredAt: { path: "/MetArtworks.api.spell", start: 1658, end: 1711 } })
  accessor highlight!: boolean

  // - its "accession number" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 1713, end: 1743 } })
  accessor accessionNumber!: string

  // - its "accession year" is a number
  @prop({ type: "number", declaredAt: { path: "/MetArtworks.api.spell", start: 1745, end: 1777 } })
  accessor accessionYear!: number

  // - its "public domain" is yes or no, stored as "isPublicDomain"
  @prop({ type: "choice", storedAs: "isPublicDomain", declaredAt: { path: "/MetArtworks.api.spell", start: 1779, end: 1839 } })
  accessor publicDomain!: boolean

  /** an address */
  // - its "primary image" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 1841, end: 1884 } })
  accessor primaryImage!: string

  /** an address */
  // - its "primary image small" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 1886, end: 1935 } })
  accessor primaryImageSmall!: string

  // - its "additional images" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/MetArtworks.api.spell", start: 1937, end: 1978 } })
  accessor additionalImages!: List<string>

  // - its "constituents" is a list of constituents
  @prop({ itemType: "Constituent", init: () => new List<Constituent>({ instanceType: "Constituent" }), declaredAt: { path: "/MetArtworks.api.spell", start: 1980, end: 2024 } })
  accessor constituents!: List<Constituent>

  // - its "department" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2026, end: 2050 } })
  accessor department!: string

  // - its "object name" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2052, end: 2077 } })
  accessor objectName!: string

  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2079, end: 2098 } })
  accessor title!: string

  // - its "culture" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2100, end: 2121 } })
  accessor culture!: string

  // - its "period" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2123, end: 2143 } })
  accessor period!: string

  // - its "dynasty" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2145, end: 2166 } })
  accessor dynasty!: string

  // - its "reign" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2168, end: 2187 } })
  accessor reign!: string

  // - its "portfolio" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2189, end: 2212 } })
  accessor portfolio!: string

  // - its "artist role" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2214, end: 2239 } })
  accessor artistRole!: string

  // - its "artist prefix" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2241, end: 2268 } })
  accessor artistPrefix!: string

  // - its "artist display name" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2270, end: 2303 } })
  accessor artistDisplayName!: string

  // - its "artist display bio" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2305, end: 2337 } })
  accessor artistDisplayBio!: string

  // - its "artist suffix" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2339, end: 2366 } })
  accessor artistSuffix!: string

  // - its "artist alpha sort" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2368, end: 2399 } })
  accessor artistAlphaSort!: string

  // - its "artist nationality" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2401, end: 2433 } })
  accessor artistNationality!: string

  // - its "artist begin date" is a number
  @prop({ type: "number", declaredAt: { path: "/MetArtworks.api.spell", start: 2435, end: 2470 } })
  accessor artistBeginDate!: number

  // - its "artist end date" is a number
  @prop({ type: "number", declaredAt: { path: "/MetArtworks.api.spell", start: 2472, end: 2505 } })
  accessor artistEndDate!: number

  // - its "artist gender" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2507, end: 2534 } })
  accessor artistGender!: string

  /** an address */
  // - its "artist wikidata url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2536, end: 2585 } })
  accessor artistWikidataUrl!: string

  /** an address */
  // - its "artist ulan url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2587, end: 2632 } })
  accessor artistUlanUrl!: string

  // - its "object date" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2634, end: 2659 } })
  accessor objectDate!: string

  // - its "object begin date" is a number
  @prop({ type: "number", declaredAt: { path: "/MetArtworks.api.spell", start: 2661, end: 2696 } })
  accessor objectBeginDate!: number

  // - its "object end date" is a number
  @prop({ type: "number", declaredAt: { path: "/MetArtworks.api.spell", start: 2698, end: 2731 } })
  accessor objectEndDate!: number

  // - its "medium" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2733, end: 2753 } })
  accessor medium!: string

  // - its "dimensions" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2755, end: 2779 } })
  accessor dimensions!: string

  // - its "measurements" is a list of measurements
  @prop({ itemType: "Measurement", init: () => new List<Measurement>({ instanceType: "Measurement" }), declaredAt: { path: "/MetArtworks.api.spell", start: 2781, end: 2825 } })
  accessor measurements!: List<Measurement>

  // - its "credit line" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2827, end: 2852 } })
  accessor creditLine!: string

  // - its "geography type" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2854, end: 2882 } })
  accessor geographyType!: string

  // - its "city" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2884, end: 2902 } })
  accessor city!: string

  // - its "state" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2904, end: 2923 } })
  accessor state!: string

  // - its "county" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2925, end: 2945 } })
  accessor county!: string

  // - its "country" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2947, end: 2968 } })
  accessor country!: string

  // - its "region" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2970, end: 2990 } })
  accessor region!: string

  // - its "subregion" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2992, end: 3015 } })
  accessor subregion!: string

  // - its "locale" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 3017, end: 3037 } })
  accessor locale!: string

  // - its "locus" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 3039, end: 3058 } })
  accessor locus!: string

  // - its "excavation" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 3060, end: 3084 } })
  accessor excavation!: string

  // - its "river" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 3086, end: 3105 } })
  accessor river!: string

  // - its "classification" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 3107, end: 3135 } })
  accessor classification!: string

  // - its "rights and reproduction" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 3137, end: 3174 } })
  accessor rightsAndReproduction!: string

  // - its "link resource" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 3176, end: 3203 } })
  accessor linkResource!: string

  // - its "metadata date" is a date
  @prop({ type: "date", declaredAt: { path: "/MetArtworks.api.spell", start: 3205, end: 3234 } })
  accessor metadataDate!: Date

  // - its "repository" is text
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 3236, end: 3260 } })
  accessor repository!: string

  /** an address */
  // - its "object url" is text, stored as "objectURL"
  //   -- an address
  @prop({ type: "text", storedAs: "objectURL", declaredAt: { path: "/MetArtworks.api.spell", start: 3262, end: 3325 } })
  accessor objectUrl!: string

  // - its "tags" is a list of tags
  @prop({ itemType: "Tag", init: () => new List<Tag>({ instanceType: "Tag" }), declaredAt: { path: "/MetArtworks.api.spell", start: 3327, end: 3355 } })
  accessor tags!: List<Tag>

  /** an address */
  // - its "object wikidata url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 3357, end: 3406 } })
  accessor objectWikidataUrl!: string

  // - its "timeline work" is yes or no, stored as "isTimelineWork"
  @prop({ type: "choice", storedAs: "isTimelineWork", declaredAt: { path: "/MetArtworks.api.spell", start: 3408, end: 3468 } })
  accessor timelineWork!: boolean

  // - its "gallery number" is a number
  @prop({ type: "number", declaredAt: { path: "/MetArtworks.api.spell", start: 3470, end: 3502 } })
  accessor galleryNumber!: number

  @drawn draw() {
    if (this.primaryImageSmall) {
      return (
        <ui-shape class="artwork" direction="over" flip-on="click" aria-label={this.title}>
          <ui-side>
            <ui-card fluid={true}>
              <ui-image src={this.primaryImageSmall} alt={this.title} />
              <ui-content>
                <ui-header size="small">{this.title}</ui-header>
                <ui-meta>{this.artistDisplayName}</ui-meta>
                <ui-meta>{this.objectDate}</ui-meta>
              </ui-content>
            </ui-card>
          </ui-side>
          <ui-side>{this.drawAboutCard()}</ui-side>
        </ui-shape>
      )
    }
  }

  drawAboutCard() {
    // What the Met knows of it:  the back of its card
    return (
      <ui-card fluid={true} part="about_card">
        <ui-content>
          <ui-header size="small">{this.title}</ui-header>
          <ui-meta>{this.artistDisplayName} · {this.objectDate}</ui-meta>
          <ui-description>
            <ui-text paragraph={true}>{this.medium}</ui-text>
            <ui-text paragraph={true}>{this.dimensions}</ui-text>
            <ui-text paragraph={true} color="grey">{this.department} · {this.creditLine}</ui-text>
          </ui-description>
        </ui-content>
        <ui-extra>
          <ui-link link={this.objectUrl} target="_blank">On the Met's own pages</ui-link>
        </ui-extra>
      </ui-card>
    )
  }

  static savedIn = {
    place: "met_museum",
    collection: "artworks",
    times: ["created", "modified"], select: ["primaryImageSmall", "department", "title", "artistDisplayName", "objectDate", "medium", "dimensions", "creditLine", "objectUrl"] }

  // - it lives in met museum
  @prop({ type: "date", declaredAt: { path: "/MetArtworks.api.spell", start: 1634, end: 1656 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in met museum
  @prop({ type: "date", declaredAt: { path: "/MetArtworks.api.spell", start: 1634, end: 1656 } })
  accessor modified!: any /* spell: type unknown */
}

export class Constituent extends Thing {
  // - its "constituent id" is a number, stored as "constituentID"
  @prop({ type: "number", storedAs: "constituentID" })
  accessor constituentId!: number

  // - its "role" is text
  @prop({ type: "text" })
  accessor role!: string

  // - its "name" is text
  @prop({ type: "text" })
  accessor name!: string

  /** an address */
  // - its "constituent ulan url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor constituentUlanUrl!: string

  /** an address */
  // - its "constituent wikidata url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor constituentWikidataUrl!: string

  // - its "gender" is text
  @prop({ type: "text" })
  accessor gender!: string
}

export class Measurement extends Thing {
  // - its "element name" is text
  @prop({ type: "text" })
  accessor elementName!: string

  // - its "element description" is text
  @prop({ type: "text" })
  accessor elementDescription!: string

  // - its "element measurements" is an element measurement
  @prop({ type: "ElementMeasurement" })
  accessor elementMeasurements!: ElementMeasurement
}

export class ElementMeasurement extends Thing {
  // - its "diameter" is a number
  @prop({ type: "number" })
  accessor diameter!: number

  // - its "height" is a number
  @prop({ type: "number" })
  accessor height!: number

  // - its "width" is a number
  @prop({ type: "number" })
  accessor width!: number

  // - its "depth" is a number
  @prop({ type: "number" })
  accessor depth!: number
}

export class Tag extends Thing {
  // - its "term" is text
  @prop({ type: "text" })
  accessor term!: string

  /** an address */
  // - its "aat url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor aatUrl!: string

  /** an address */
  // - its "wikidata url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor wikidataUrl!: string
}

export class MetMuseum extends Place {}
export const metMuseum = core.place(new MetMuseum(), {
  name: "met_museum",
  kind: "web server",
  at: "https://collectionapi.metmuseum.org/public/collection",
  idColumn: "objectID",
  rowsIn: "objectIDs",
  listsGive: ["objectID"],
  pagesByOffset: { limit: "limit", offset: "offset" },
  pageSize: 500,
  checkedEvery: 30,
  mostPerSecond: 80,
  searches: {
    param: "q",
    fields: [],
    at: "/v1.1/search?hasImages=true"
  },
  collections: { artworks: { at: "/v1/objects" } }
})

// -----------
core.heading("Artworks from the Met")
///////////////////////////
// ## Artworks from the Met
///////////////////////////
// Artworks of the Metropolitan Museum of Art, found by what you type:  a wall of pictures that goes on as you scroll.
// Every thing it shows is in MetArtworks.api.spell, as `spell place ingest` wrote it;  each type below adds to its type there,
// so looking again at the server never touches a line of this.
// Its search answers only ids:  each artwork is read from its own address as it's drawn, and no others.
// An artwork with no picture is left out:  the wall draws more as you scroll, so a short screen fills from the next ones.

@thing
export class MetArtwork extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "search" is text
  @prop({ type: "text" })
  accessor search!: string

  create() {
    this.search = "sunflowers"
  }

  /** What the Met finds for the search, looking at all of each artwork:  ids only, each read as it's drawn */
  static { this.declareProp("found", { declaredAt: { path: "/MetArtworks.spell", start: 661, end: 709 }, readsFrom: ["met_museum"] }) }
  get found() { return core.waitedValue(this, "found", async () => {
    return await core.savedThings(Artwork, { search: { "*": this.search } })
  }, () => [this.search]) }

  tryWords(words: string) {
    this.search = words
  }

  @drawn draw() {
    return (
      <ui-container>
        <ui-stack spacing="lg">
          <ui-form prop:value={this}>
            <ui-stack spacing="sm">
              <ui-stack direction="horizontal" wrap={true} align="center" justify="between" spacing="sm">
                <ui-header size="large">Artworks from the Met</ui-header>
                <ui-search name="search" parameter="art" icon="search" placeholder="A title, an artist, a subject" aria-label="Search the Met" />
              </ui-stack>
              <ui-toolbar appearance="secondary" size="small" aria-label="Try a search">
                <ui-text slot="title" size="small" color="grey">Try</ui-text>
                <ui-item onClick={core.pressed(this, () => this.tryWords("sunflowers"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  Sunflowers
                </ui-item>
                <ui-item onClick={core.pressed(this, () => this.tryWords("van gogh"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  Van Gogh
                </ui-item>
                <ui-item onClick={core.pressed(this, () => this.tryWords("hokusai"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  Hokusai
                </ui-item>
                <ui-item onClick={core.pressed(this, () => this.tryWords("armor"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  Armor
                </ui-item>
                <ui-item onClick={core.pressed(this, () => this.tryWords("cats"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  Cats
                </ui-item>
                <ui-item onClick={core.pressed(this, () => this.tryWords("egypt"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  Egypt
                </ui-item>
              </ui-toolbar>
            </ui-stack>
          </ui-form>
          {core.drawRead(() => this.found, (artwork: Artwork) => core.drawThing(artwork), {
            waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Asking the Met"}</ui-loader>,
            none: () => <ui-text>{"The Met has nothing for that."}</ui-text>,
            failedSay: () => "The Met can't be reached just now.",
            items: () => <ui-cards layout="mosaic" columns="4" doubling={true} />
          })}
          <ui-text size="small" color="grey" paragraph={true}>
            {"From "}
            <ui-link link="https://metmuseum.github.io">the Met Museum's API</ui-link>
            {", each artwork asked for as it's shown.  Press a picture to turn it over."}
          </ui-text>
        </ui-stack>
      </ui-container>
    )
  }
}

/**
 * `<test-project-app>`:  a met artwork, drawn in its own element, e.g. by `draw the met artwork`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its met artwork's properties;  its methods call its met artwork's.
 * - What every view's element does, e.g. drawing its met artwork, is `SpellElement`'s.
 */
export class MetArtworkElement extends SpellElement<MetArtwork> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "met artwork", [
    { name: "search", kind: "string", description: "Its search." }
  ])

  create() {
    return this.currentThing?.create()
  }

  tryWords(words: string) {
    return this.currentThing?.tryWords(words)
  }
}
core.useElement(MetArtwork, MetArtworkElement)
export const metArtworks = new MetArtwork()
core.describeAction(MetArtwork, "tryWords", { title: "Try Words", undoneAs: "Try Words" })

core.heading("An artwork")
////////////////
// ## An artwork
////////////////
// A card that turns over:  its picture on the front, what the Met knows of it on the back.
// Only what's in the public domain has a picture:  the rest draw nothing, so the wall is all pictures.

// -----------
if (!core.isCarryingOver) metArtworks.start()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `MetArtworkElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
