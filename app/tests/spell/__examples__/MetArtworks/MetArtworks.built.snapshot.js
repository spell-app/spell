import { core, Thing, List, App, Place, h } from "@spell/core"

export class Artwork extends Thing {
  static { this.declareProp("highlight", { type: "choice", storedAs: "isHighlight" }) }
  get highlight() { return this.getProp("highlight") }
  set highlight(value) { this.setProp("highlight", value) }

  static { this.declareProp("accessionNumber", { type: "text" }) }
  get accessionNumber() { return this.getProp("accessionNumber") }
  set accessionNumber(value) { this.setProp("accessionNumber", value) }

  static { this.declareProp("accessionYear", { type: "number" }) }
  get accessionYear() { return this.getProp("accessionYear") }
  set accessionYear(value) { this.setProp("accessionYear", value) }

  static { this.declareProp("publicDomain", { type: "choice", storedAs: "isPublicDomain" }) }
  get publicDomain() { return this.getProp("publicDomain") }
  set publicDomain(value) { this.setProp("publicDomain", value) }

  static { this.declareProp("primaryImage", { type: "text" }) }
  get primaryImage() { return this.getProp("primaryImage") }
  set primaryImage(value) { this.setProp("primaryImage", value) }

  static { this.declareProp("primaryImageSmall", { type: "text" }) }
  get primaryImageSmall() { return this.getProp("primaryImageSmall") }
  set primaryImageSmall(value) { this.setProp("primaryImageSmall", value) }

  static { this.declareProp("additionalImages", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get additionalImages() { return this.getProp("additionalImages") }
  set additionalImages(value) { this.setProp("additionalImages", value) }

  static { this.declareProp("constituents", { itemType: "Constituent", init: () => new List({ instanceType: "Constituent" }) }) }
  get constituents() { return this.getProp("constituents") }
  set constituents(value) { this.setProp("constituents", value) }

  static { this.declareProp("department", { type: "text" }) }
  get department() { return this.getProp("department") }
  set department(value) { this.setProp("department", value) }

  static { this.declareProp("objectName", { type: "text" }) }
  get objectName() { return this.getProp("objectName") }
  set objectName(value) { this.setProp("objectName", value) }

  static { this.declareProp("title", { type: "text" }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  static { this.declareProp("culture", { type: "text" }) }
  get culture() { return this.getProp("culture") }
  set culture(value) { this.setProp("culture", value) }

  static { this.declareProp("period", { type: "text" }) }
  get period() { return this.getProp("period") }
  set period(value) { this.setProp("period", value) }

  static { this.declareProp("dynasty", { type: "text" }) }
  get dynasty() { return this.getProp("dynasty") }
  set dynasty(value) { this.setProp("dynasty", value) }

  static { this.declareProp("reign", { type: "text" }) }
  get reign() { return this.getProp("reign") }
  set reign(value) { this.setProp("reign", value) }

  static { this.declareProp("portfolio", { type: "text" }) }
  get portfolio() { return this.getProp("portfolio") }
  set portfolio(value) { this.setProp("portfolio", value) }

  static { this.declareProp("artistRole", { type: "text" }) }
  get artistRole() { return this.getProp("artistRole") }
  set artistRole(value) { this.setProp("artistRole", value) }

  static { this.declareProp("artistPrefix", { type: "text" }) }
  get artistPrefix() { return this.getProp("artistPrefix") }
  set artistPrefix(value) { this.setProp("artistPrefix", value) }

  static { this.declareProp("artistDisplayName", { type: "text" }) }
  get artistDisplayName() { return this.getProp("artistDisplayName") }
  set artistDisplayName(value) { this.setProp("artistDisplayName", value) }

  static { this.declareProp("artistDisplayBio", { type: "text" }) }
  get artistDisplayBio() { return this.getProp("artistDisplayBio") }
  set artistDisplayBio(value) { this.setProp("artistDisplayBio", value) }

  static { this.declareProp("artistSuffix", { type: "text" }) }
  get artistSuffix() { return this.getProp("artistSuffix") }
  set artistSuffix(value) { this.setProp("artistSuffix", value) }

  static { this.declareProp("artistAlphaSort", { type: "text" }) }
  get artistAlphaSort() { return this.getProp("artistAlphaSort") }
  set artistAlphaSort(value) { this.setProp("artistAlphaSort", value) }

  static { this.declareProp("artistNationality", { type: "text" }) }
  get artistNationality() { return this.getProp("artistNationality") }
  set artistNationality(value) { this.setProp("artistNationality", value) }

  static { this.declareProp("artistBeginDate", { type: "number" }) }
  get artistBeginDate() { return this.getProp("artistBeginDate") }
  set artistBeginDate(value) { this.setProp("artistBeginDate", value) }

  static { this.declareProp("artistEndDate", { type: "number" }) }
  get artistEndDate() { return this.getProp("artistEndDate") }
  set artistEndDate(value) { this.setProp("artistEndDate", value) }

  static { this.declareProp("artistGender", { type: "text" }) }
  get artistGender() { return this.getProp("artistGender") }
  set artistGender(value) { this.setProp("artistGender", value) }

  static { this.declareProp("artistWikidataUrl", { type: "text" }) }
  get artistWikidataUrl() { return this.getProp("artistWikidataUrl") }
  set artistWikidataUrl(value) { this.setProp("artistWikidataUrl", value) }

  static { this.declareProp("artistUlanUrl", { type: "text" }) }
  get artistUlanUrl() { return this.getProp("artistUlanUrl") }
  set artistUlanUrl(value) { this.setProp("artistUlanUrl", value) }

  static { this.declareProp("objectDate", { type: "text" }) }
  get objectDate() { return this.getProp("objectDate") }
  set objectDate(value) { this.setProp("objectDate", value) }

  static { this.declareProp("objectBeginDate", { type: "number" }) }
  get objectBeginDate() { return this.getProp("objectBeginDate") }
  set objectBeginDate(value) { this.setProp("objectBeginDate", value) }

  static { this.declareProp("objectEndDate", { type: "number" }) }
  get objectEndDate() { return this.getProp("objectEndDate") }
  set objectEndDate(value) { this.setProp("objectEndDate", value) }

  static { this.declareProp("medium", { type: "text" }) }
  get medium() { return this.getProp("medium") }
  set medium(value) { this.setProp("medium", value) }

  static { this.declareProp("dimensions", { type: "text" }) }
  get dimensions() { return this.getProp("dimensions") }
  set dimensions(value) { this.setProp("dimensions", value) }

  static { this.declareProp("measurements", { itemType: "Measurement", init: () => new List({ instanceType: "Measurement" }) }) }
  get measurements() { return this.getProp("measurements") }
  set measurements(value) { this.setProp("measurements", value) }

  static { this.declareProp("creditLine", { type: "text" }) }
  get creditLine() { return this.getProp("creditLine") }
  set creditLine(value) { this.setProp("creditLine", value) }

  static { this.declareProp("geographyType", { type: "text" }) }
  get geographyType() { return this.getProp("geographyType") }
  set geographyType(value) { this.setProp("geographyType", value) }

  static { this.declareProp("city", { type: "text" }) }
  get city() { return this.getProp("city") }
  set city(value) { this.setProp("city", value) }

  static { this.declareProp("state", { type: "text" }) }
  get state() { return this.getProp("state") }
  set state(value) { this.setProp("state", value) }

  static { this.declareProp("county", { type: "text" }) }
  get county() { return this.getProp("county") }
  set county(value) { this.setProp("county", value) }

  static { this.declareProp("country", { type: "text" }) }
  get country() { return this.getProp("country") }
  set country(value) { this.setProp("country", value) }

  static { this.declareProp("region", { type: "text" }) }
  get region() { return this.getProp("region") }
  set region(value) { this.setProp("region", value) }

  static { this.declareProp("subregion", { type: "text" }) }
  get subregion() { return this.getProp("subregion") }
  set subregion(value) { this.setProp("subregion", value) }

  static { this.declareProp("locale", { type: "text" }) }
  get locale() { return this.getProp("locale") }
  set locale(value) { this.setProp("locale", value) }

  static { this.declareProp("locus", { type: "text" }) }
  get locus() { return this.getProp("locus") }
  set locus(value) { this.setProp("locus", value) }

  static { this.declareProp("excavation", { type: "text" }) }
  get excavation() { return this.getProp("excavation") }
  set excavation(value) { this.setProp("excavation", value) }

  static { this.declareProp("river", { type: "text" }) }
  get river() { return this.getProp("river") }
  set river(value) { this.setProp("river", value) }

  static { this.declareProp("classification", { type: "text" }) }
  get classification() { return this.getProp("classification") }
  set classification(value) { this.setProp("classification", value) }

  static { this.declareProp("rightsAndReproduction", { type: "text" }) }
  get rightsAndReproduction() { return this.getProp("rightsAndReproduction") }
  set rightsAndReproduction(value) { this.setProp("rightsAndReproduction", value) }

  static { this.declareProp("linkResource", { type: "text" }) }
  get linkResource() { return this.getProp("linkResource") }
  set linkResource(value) { this.setProp("linkResource", value) }

  static { this.declareProp("metadataDate", { type: "date" }) }
  get metadataDate() { return this.getProp("metadataDate") }
  set metadataDate(value) { this.setProp("metadataDate", value) }

  static { this.declareProp("repository", { type: "text" }) }
  get repository() { return this.getProp("repository") }
  set repository(value) { this.setProp("repository", value) }

  static { this.declareProp("objectUrl", { type: "text", storedAs: "objectURL" }) }
  get objectUrl() { return this.getProp("objectUrl") }
  set objectUrl(value) { this.setProp("objectUrl", value) }

  static { this.declareProp("tags", { itemType: "Tag", init: () => new List({ instanceType: "Tag" }) }) }
  get tags() { return this.getProp("tags") }
  set tags(value) { this.setProp("tags", value) }

  static { this.declareProp("objectWikidataUrl", { type: "text" }) }
  get objectWikidataUrl() { return this.getProp("objectWikidataUrl") }
  set objectWikidataUrl(value) { this.setProp("objectWikidataUrl", value) }

  static { this.declareProp("timelineWork", { type: "choice", storedAs: "isTimelineWork" }) }
  get timelineWork() { return this.getProp("timelineWork") }
  set timelineWork(value) { this.setProp("timelineWork", value) }

  static { this.declareProp("galleryNumber", { type: "number" }) }
  get galleryNumber() { return this.getProp("galleryNumber") }
  set galleryNumber(value) { this.setProp("galleryNumber", value) }

  draw() {
    if (this.primaryImageSmall) {
      return h("ui-shape", { class: "artwork", direction: "over", "flip-on": "click", "aria-label": () => this.title },
        h("ui-side",
          h("ui-card", { fluid: true },
            h("ui-image", { src: () => this.primaryImageSmall, alt: () => this.title }),
            h("ui-content",
              h("ui-header", { size: "small" }, () => this.title),
              h("ui-meta", () => this.artistDisplayName),
              h("ui-meta", () => this.objectDate)
            )
          )
        ),
        h("ui-side", () => this.drawAboutCard())
      )
    }
  }

  drawAboutCard() {
    return h("ui-card", { fluid: true, part: "about_card" },
      h("ui-content",
        h("ui-header", { size: "small" }, () => this.title),
        h("ui-meta", () => this.artistDisplayName, " · ", () => this.objectDate),
        h("ui-description",
          h("ui-text", { paragraph: true }, () => this.medium),
          h("ui-text", { paragraph: true }, () => this.dimensions),
          h("ui-text", { paragraph: true, color: "grey" }, () => this.department, " · ", () => this.creditLine)
        )
      ),
      h("ui-extra",
        h("ui-link", { link: () => this.objectUrl, target: "_blank" }, "On the Met's own pages")
      )
    )
  }

  static savedIn = {
    place: "met_museum",
    collection: "artworks",
    times: ["created", "modified"], select: ["primaryImageSmall", "department", "title", "artistDisplayName", "objectDate", "medium", "dimensions", "creditLine", "objectUrl"] }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Constituent extends Thing {
  static { this.declareProp("constituentId", { type: "number", storedAs: "constituentID" }) }
  get constituentId() { return this.getProp("constituentId") }
  set constituentId(value) { this.setProp("constituentId", value) }

  static { this.declareProp("role", { type: "text" }) }
  get role() { return this.getProp("role") }
  set role(value) { this.setProp("role", value) }

  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("constituentUlanUrl", { type: "text" }) }
  get constituentUlanUrl() { return this.getProp("constituentUlanUrl") }
  set constituentUlanUrl(value) { this.setProp("constituentUlanUrl", value) }

  static { this.declareProp("constituentWikidataUrl", { type: "text" }) }
  get constituentWikidataUrl() { return this.getProp("constituentWikidataUrl") }
  set constituentWikidataUrl(value) { this.setProp("constituentWikidataUrl", value) }

  static { this.declareProp("gender", { type: "text" }) }
  get gender() { return this.getProp("gender") }
  set gender(value) { this.setProp("gender", value) }
}

export class Measurement extends Thing {
  static { this.declareProp("elementName", { type: "text" }) }
  get elementName() { return this.getProp("elementName") }
  set elementName(value) { this.setProp("elementName", value) }

  static { this.declareProp("elementDescription", { type: "text" }) }
  get elementDescription() { return this.getProp("elementDescription") }
  set elementDescription(value) { this.setProp("elementDescription", value) }

  static { this.declareProp("elementMeasurements", { type: "ElementMeasurement" }) }
  get elementMeasurements() { return this.getProp("elementMeasurements") }
  set elementMeasurements(value) { this.setProp("elementMeasurements", value) }
}

export class ElementMeasurement extends Thing {
  static { this.declareProp("diameter", { type: "number" }) }
  get diameter() { return this.getProp("diameter") }
  set diameter(value) { this.setProp("diameter", value) }

  static { this.declareProp("height", { type: "number" }) }
  get height() { return this.getProp("height") }
  set height(value) { this.setProp("height", value) }

  static { this.declareProp("width", { type: "number" }) }
  get width() { return this.getProp("width") }
  set width(value) { this.setProp("width", value) }

  static { this.declareProp("depth", { type: "number" }) }
  get depth() { return this.getProp("depth") }
  set depth(value) { this.setProp("depth", value) }
}

export class Tag extends Thing {
  static { this.declareProp("term", { type: "text" }) }
  get term() { return this.getProp("term") }
  set term(value) { this.setProp("term", value) }

  static { this.declareProp("aatUrl", { type: "text" }) }
  get aatUrl() { return this.getProp("aatUrl") }
  set aatUrl(value) { this.setProp("aatUrl", value) }

  static { this.declareProp("wikidataUrl", { type: "text" }) }
  get wikidataUrl() { return this.getProp("wikidataUrl") }
  set wikidataUrl(value) { this.setProp("wikidataUrl", value) }
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
export class MetArtwork extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  static { this.declareProp("search", { type: "text" }) }
  get search() { return this.getProp("search") }
  set search(value) { this.setProp("search", value) }

  create() {
    this.search = "sunflowers"
  }

  static { this.declareProp("found", { readsFrom: ["met_museum"] }) }
  get found() { return core.waitedValue(this, "found", async () => {
    return await core.savedThings(Artwork, { search: { "*": this.search } })
  }, () => [this.search]) }

  tryWords(words) {
    this.search = words
  }

  draw() {
    return h("ui-container",
      h("ui-stack", { spacing: "lg" },
        h("ui-form", { "prop:value": this },
          h("ui-stack", { spacing: "sm" },
            h("ui-stack", { direction: "horizontal", wrap: true, align: "center", justify: "between", spacing: "sm" },
              h("ui-header", { size: "large" }, "Artworks from the Met"),
              h("ui-search", {
                name: "search",
                parameter: "art",
                icon: "search",
                placeholder: "A title, an artist, a subject",
                "aria-label": "Search the Met"
              })
            ),
            h("ui-toolbar", { appearance: "secondary", size: "small", "aria-label": "Try a search" },
              h("ui-text", { slot: "title", size: "small", color: "grey" }, "Try"),
              h("ui-item", {
                onClick: core.pressed(this, () => this.tryWords("sunflowers")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "Sunflowers"),
              h("ui-item", {
                onClick: core.pressed(this, () => this.tryWords("van gogh")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "Van Gogh"),
              h("ui-item", {
                onClick: core.pressed(this, () => this.tryWords("hokusai")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "Hokusai"),
              h("ui-item", {
                onClick: core.pressed(this, () => this.tryWords("armor")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "Armor"),
              h("ui-item", {
                onClick: core.pressed(this, () => this.tryWords("cats")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "Cats"),
              h("ui-item", {
                onClick: core.pressed(this, () => this.tryWords("egypt")),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "Egypt")
            )
          )
        ),
        () => core.drawRead(() => this.found, (artwork) => core.drawThing(artwork), {
          waitingSay: () => "Asking the Met",
          none: () => h("ui-text", "The Met has nothing for that."),
          failedSay: () => "The Met can't be reached just now.",
          items: () => h("ui-cards", { layout: "mosaic", columns: "4", doubling: true })
        }),
        h("ui-text", { size: "small", color: "grey", paragraph: true },
          "From ",
          h("ui-link", { link: "https://metmuseum.github.io" }, "the Met Museum's API"),
          ", each artwork asked for as it's shown.  Press a picture to turn it over."
        )
      )
    )
  }
}
export const metArtworks = new MetArtwork()
core.describeAction(MetArtwork, "tryWords", { title: "Try Words", undoneAs: "Try Words" })

// -----------
if (!core.isCarryingOver) metArtworks.start()
