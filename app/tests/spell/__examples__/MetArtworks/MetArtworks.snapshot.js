import { core, Thing, List, App, Place, h } from "@spell/core"

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
  static { this.declareProp("highlight", { type: "choice", storedAs: "isHighlight", declaredAt: { path: "/MetArtworks.api.spell", start: 1658, end: 1711 } }) }
  get highlight() { return this.getProp("highlight") }
  set highlight(value) { this.setProp("highlight", value) }

  // - its "accession number" is text
  static { this.declareProp("accessionNumber", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 1713, end: 1743 } }) }
  get accessionNumber() { return this.getProp("accessionNumber") }
  set accessionNumber(value) { this.setProp("accessionNumber", value) }

  // - its "accession year" is a number
  static { this.declareProp("accessionYear", { type: "number", declaredAt: { path: "/MetArtworks.api.spell", start: 1745, end: 1777 } }) }
  get accessionYear() { return this.getProp("accessionYear") }
  set accessionYear(value) { this.setProp("accessionYear", value) }

  // - its "public domain" is yes or no, stored as "isPublicDomain"
  static { this.declareProp("publicDomain", { type: "choice", storedAs: "isPublicDomain", declaredAt: { path: "/MetArtworks.api.spell", start: 1779, end: 1839 } }) }
  get publicDomain() { return this.getProp("publicDomain") }
  set publicDomain(value) { this.setProp("publicDomain", value) }

  /** an address */
  // - its "primary image" is text
  static { this.declareProp("primaryImage", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 1841, end: 1868 } }) }
  get primaryImage() { return this.getProp("primaryImage") }
  set primaryImage(value) { this.setProp("primaryImage", value) }

  /** an address */
  // - its "primary image small" is text
  static { this.declareProp("primaryImageSmall", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 1885, end: 1918 } }) }
  get primaryImageSmall() { return this.getProp("primaryImageSmall") }
  set primaryImageSmall(value) { this.setProp("primaryImageSmall", value) }

  // - its "additional images" is a list of text
  static { this.declareProp("additionalImages", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/MetArtworks.api.spell", start: 1935, end: 1976 } }) }
  get additionalImages() { return this.getProp("additionalImages") }
  set additionalImages(value) { this.setProp("additionalImages", value) }

  // - its "constituents" is a list of constituents
  static { this.declareProp("constituents", { itemType: "Constituent", init: () => new List({ instanceType: "Constituent" }), declaredAt: { path: "/MetArtworks.api.spell", start: 1978, end: 2022 } }) }
  get constituents() { return this.getProp("constituents") }
  set constituents(value) { this.setProp("constituents", value) }

  // - its "department" is text
  static { this.declareProp("department", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2024, end: 2048 } }) }
  get department() { return this.getProp("department") }
  set department(value) { this.setProp("department", value) }

  // - its "object name" is text
  static { this.declareProp("objectName", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2050, end: 2075 } }) }
  get objectName() { return this.getProp("objectName") }
  set objectName(value) { this.setProp("objectName", value) }

  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2077, end: 2096 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "culture" is text
  static { this.declareProp("culture", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2098, end: 2119 } }) }
  get culture() { return this.getProp("culture") }
  set culture(value) { this.setProp("culture", value) }

  // - its "period" is text
  static { this.declareProp("period", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2121, end: 2141 } }) }
  get period() { return this.getProp("period") }
  set period(value) { this.setProp("period", value) }

  // - its "dynasty" is text
  static { this.declareProp("dynasty", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2143, end: 2164 } }) }
  get dynasty() { return this.getProp("dynasty") }
  set dynasty(value) { this.setProp("dynasty", value) }

  // - its "reign" is text
  static { this.declareProp("reign", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2166, end: 2185 } }) }
  get reign() { return this.getProp("reign") }
  set reign(value) { this.setProp("reign", value) }

  // - its "portfolio" is text
  static { this.declareProp("portfolio", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2187, end: 2210 } }) }
  get portfolio() { return this.getProp("portfolio") }
  set portfolio(value) { this.setProp("portfolio", value) }

  // - its "artist role" is text
  static { this.declareProp("artistRole", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2212, end: 2237 } }) }
  get artistRole() { return this.getProp("artistRole") }
  set artistRole(value) { this.setProp("artistRole", value) }

  // - its "artist prefix" is text
  static { this.declareProp("artistPrefix", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2239, end: 2266 } }) }
  get artistPrefix() { return this.getProp("artistPrefix") }
  set artistPrefix(value) { this.setProp("artistPrefix", value) }

  // - its "artist display name" is text
  static { this.declareProp("artistDisplayName", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2268, end: 2301 } }) }
  get artistDisplayName() { return this.getProp("artistDisplayName") }
  set artistDisplayName(value) { this.setProp("artistDisplayName", value) }

  // - its "artist display bio" is text
  static { this.declareProp("artistDisplayBio", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2303, end: 2335 } }) }
  get artistDisplayBio() { return this.getProp("artistDisplayBio") }
  set artistDisplayBio(value) { this.setProp("artistDisplayBio", value) }

  // - its "artist suffix" is text
  static { this.declareProp("artistSuffix", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2337, end: 2364 } }) }
  get artistSuffix() { return this.getProp("artistSuffix") }
  set artistSuffix(value) { this.setProp("artistSuffix", value) }

  // - its "artist alpha sort" is text
  static { this.declareProp("artistAlphaSort", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2366, end: 2397 } }) }
  get artistAlphaSort() { return this.getProp("artistAlphaSort") }
  set artistAlphaSort(value) { this.setProp("artistAlphaSort", value) }

  // - its "artist nationality" is text
  static { this.declareProp("artistNationality", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2399, end: 2431 } }) }
  get artistNationality() { return this.getProp("artistNationality") }
  set artistNationality(value) { this.setProp("artistNationality", value) }

  // - its "artist begin date" is a number
  static { this.declareProp("artistBeginDate", { type: "number", declaredAt: { path: "/MetArtworks.api.spell", start: 2433, end: 2468 } }) }
  get artistBeginDate() { return this.getProp("artistBeginDate") }
  set artistBeginDate(value) { this.setProp("artistBeginDate", value) }

  // - its "artist end date" is a number
  static { this.declareProp("artistEndDate", { type: "number", declaredAt: { path: "/MetArtworks.api.spell", start: 2470, end: 2503 } }) }
  get artistEndDate() { return this.getProp("artistEndDate") }
  set artistEndDate(value) { this.setProp("artistEndDate", value) }

  // - its "artist gender" is text
  static { this.declareProp("artistGender", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2505, end: 2532 } }) }
  get artistGender() { return this.getProp("artistGender") }
  set artistGender(value) { this.setProp("artistGender", value) }

  /** an address */
  // - its "artist wikidata url" is text
  static { this.declareProp("artistWikidataUrl", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2534, end: 2567 } }) }
  get artistWikidataUrl() { return this.getProp("artistWikidataUrl") }
  set artistWikidataUrl(value) { this.setProp("artistWikidataUrl", value) }

  /** an address */
  // - its "artist ulan url" is text
  static { this.declareProp("artistUlanUrl", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2584, end: 2613 } }) }
  get artistUlanUrl() { return this.getProp("artistUlanUrl") }
  set artistUlanUrl(value) { this.setProp("artistUlanUrl", value) }

  // - its "object date" is text
  static { this.declareProp("objectDate", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2630, end: 2655 } }) }
  get objectDate() { return this.getProp("objectDate") }
  set objectDate(value) { this.setProp("objectDate", value) }

  // - its "object begin date" is a number
  static { this.declareProp("objectBeginDate", { type: "number", declaredAt: { path: "/MetArtworks.api.spell", start: 2657, end: 2692 } }) }
  get objectBeginDate() { return this.getProp("objectBeginDate") }
  set objectBeginDate(value) { this.setProp("objectBeginDate", value) }

  // - its "object end date" is a number
  static { this.declareProp("objectEndDate", { type: "number", declaredAt: { path: "/MetArtworks.api.spell", start: 2694, end: 2727 } }) }
  get objectEndDate() { return this.getProp("objectEndDate") }
  set objectEndDate(value) { this.setProp("objectEndDate", value) }

  // - its "medium" is text
  static { this.declareProp("medium", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2729, end: 2749 } }) }
  get medium() { return this.getProp("medium") }
  set medium(value) { this.setProp("medium", value) }

  // - its "dimensions" is text
  static { this.declareProp("dimensions", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2751, end: 2775 } }) }
  get dimensions() { return this.getProp("dimensions") }
  set dimensions(value) { this.setProp("dimensions", value) }

  // - its "measurements" is a list of measurements
  static { this.declareProp("measurements", { itemType: "Measurement", init: () => new List({ instanceType: "Measurement" }), declaredAt: { path: "/MetArtworks.api.spell", start: 2777, end: 2821 } }) }
  get measurements() { return this.getProp("measurements") }
  set measurements(value) { this.setProp("measurements", value) }

  // - its "credit line" is text
  static { this.declareProp("creditLine", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2823, end: 2848 } }) }
  get creditLine() { return this.getProp("creditLine") }
  set creditLine(value) { this.setProp("creditLine", value) }

  // - its "geography type" is text
  static { this.declareProp("geographyType", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2850, end: 2878 } }) }
  get geographyType() { return this.getProp("geographyType") }
  set geographyType(value) { this.setProp("geographyType", value) }

  // - its "city" is text
  static { this.declareProp("city", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2880, end: 2898 } }) }
  get city() { return this.getProp("city") }
  set city(value) { this.setProp("city", value) }

  // - its "state" is text
  static { this.declareProp("state", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2900, end: 2919 } }) }
  get state() { return this.getProp("state") }
  set state(value) { this.setProp("state", value) }

  // - its "county" is text
  static { this.declareProp("county", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2921, end: 2941 } }) }
  get county() { return this.getProp("county") }
  set county(value) { this.setProp("county", value) }

  // - its "country" is text
  static { this.declareProp("country", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2943, end: 2964 } }) }
  get country() { return this.getProp("country") }
  set country(value) { this.setProp("country", value) }

  // - its "region" is text
  static { this.declareProp("region", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2966, end: 2986 } }) }
  get region() { return this.getProp("region") }
  set region(value) { this.setProp("region", value) }

  // - its "subregion" is text
  static { this.declareProp("subregion", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 2988, end: 3011 } }) }
  get subregion() { return this.getProp("subregion") }
  set subregion(value) { this.setProp("subregion", value) }

  // - its "locale" is text
  static { this.declareProp("locale", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 3013, end: 3033 } }) }
  get locale() { return this.getProp("locale") }
  set locale(value) { this.setProp("locale", value) }

  // - its "locus" is text
  static { this.declareProp("locus", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 3035, end: 3054 } }) }
  get locus() { return this.getProp("locus") }
  set locus(value) { this.setProp("locus", value) }

  // - its "excavation" is text
  static { this.declareProp("excavation", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 3056, end: 3080 } }) }
  get excavation() { return this.getProp("excavation") }
  set excavation(value) { this.setProp("excavation", value) }

  // - its "river" is text
  static { this.declareProp("river", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 3082, end: 3101 } }) }
  get river() { return this.getProp("river") }
  set river(value) { this.setProp("river", value) }

  // - its "classification" is text
  static { this.declareProp("classification", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 3103, end: 3131 } }) }
  get classification() { return this.getProp("classification") }
  set classification(value) { this.setProp("classification", value) }

  // - its "rights and reproduction" is text
  static { this.declareProp("rightsAndReproduction", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 3133, end: 3170 } }) }
  get rightsAndReproduction() { return this.getProp("rightsAndReproduction") }
  set rightsAndReproduction(value) { this.setProp("rightsAndReproduction", value) }

  // - its "link resource" is text
  static { this.declareProp("linkResource", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 3172, end: 3199 } }) }
  get linkResource() { return this.getProp("linkResource") }
  set linkResource(value) { this.setProp("linkResource", value) }

  // - its "metadata date" is a date
  static { this.declareProp("metadataDate", { type: "date", declaredAt: { path: "/MetArtworks.api.spell", start: 3201, end: 3230 } }) }
  get metadataDate() { return this.getProp("metadataDate") }
  set metadataDate(value) { this.setProp("metadataDate", value) }

  // - its "repository" is text
  static { this.declareProp("repository", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 3232, end: 3256 } }) }
  get repository() { return this.getProp("repository") }
  set repository(value) { this.setProp("repository", value) }

  /** an address */
  // - its "object url" is text, stored as "objectURL"
  static { this.declareProp("objectUrl", { type: "text", storedAs: "objectURL", declaredAt: { path: "/MetArtworks.api.spell", start: 3258, end: 3305 } }) }
  get objectUrl() { return this.getProp("objectUrl") }
  set objectUrl(value) { this.setProp("objectUrl", value) }

  // - its "tags" is a list of tags
  static { this.declareProp("tags", { itemType: "Tag", init: () => new List({ instanceType: "Tag" }), declaredAt: { path: "/MetArtworks.api.spell", start: 3322, end: 3350 } }) }
  get tags() { return this.getProp("tags") }
  set tags(value) { this.setProp("tags", value) }

  /** an address */
  // - its "object wikidata url" is text
  static { this.declareProp("objectWikidataUrl", { type: "text", declaredAt: { path: "/MetArtworks.api.spell", start: 3352, end: 3385 } }) }
  get objectWikidataUrl() { return this.getProp("objectWikidataUrl") }
  set objectWikidataUrl(value) { this.setProp("objectWikidataUrl", value) }

  // - its "timeline work" is yes or no, stored as "isTimelineWork"
  static { this.declareProp("timelineWork", { type: "choice", storedAs: "isTimelineWork", declaredAt: { path: "/MetArtworks.api.spell", start: 3402, end: 3462 } }) }
  get timelineWork() { return this.getProp("timelineWork") }
  set timelineWork(value) { this.setProp("timelineWork", value) }

  // - its "gallery number" is a number
  static { this.declareProp("galleryNumber", { type: "number", declaredAt: { path: "/MetArtworks.api.spell", start: 3464, end: 3496 } }) }
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
    // What the Met knows of it:  the back of its card
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

  // - it lives in met museum
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/MetArtworks.api.spell", start: 1634, end: 1656 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in met museum
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/MetArtworks.api.spell", start: 1634, end: 1656 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Constituent extends Thing {
  // - its "constituent id" is a number, stored as "constituentID"
  static { this.declareProp("constituentId", { type: "number", storedAs: "constituentID" }) }
  get constituentId() { return this.getProp("constituentId") }
  set constituentId(value) { this.setProp("constituentId", value) }

  // - its "role" is text
  static { this.declareProp("role", { type: "text" }) }
  get role() { return this.getProp("role") }
  set role(value) { this.setProp("role", value) }

  // - its "name" is text
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  /** an address */
  // - its "constituent ulan url" is text
  static { this.declareProp("constituentUlanUrl", { type: "text" }) }
  get constituentUlanUrl() { return this.getProp("constituentUlanUrl") }
  set constituentUlanUrl(value) { this.setProp("constituentUlanUrl", value) }

  /** an address */
  // - its "constituent wikidata url" is text
  static { this.declareProp("constituentWikidataUrl", { type: "text" }) }
  get constituentWikidataUrl() { return this.getProp("constituentWikidataUrl") }
  set constituentWikidataUrl(value) { this.setProp("constituentWikidataUrl", value) }

  // - its "gender" is text
  static { this.declareProp("gender", { type: "text" }) }
  get gender() { return this.getProp("gender") }
  set gender(value) { this.setProp("gender", value) }
}

export class Measurement extends Thing {
  // - its "element name" is text
  static { this.declareProp("elementName", { type: "text" }) }
  get elementName() { return this.getProp("elementName") }
  set elementName(value) { this.setProp("elementName", value) }

  // - its "element description" is text
  static { this.declareProp("elementDescription", { type: "text" }) }
  get elementDescription() { return this.getProp("elementDescription") }
  set elementDescription(value) { this.setProp("elementDescription", value) }

  // - its "element measurements" is an element measurement
  static { this.declareProp("elementMeasurements", { type: "ElementMeasurement" }) }
  get elementMeasurements() { return this.getProp("elementMeasurements") }
  set elementMeasurements(value) { this.setProp("elementMeasurements", value) }
}

export class ElementMeasurement extends Thing {
  // - its "diameter" is a number
  static { this.declareProp("diameter", { type: "number" }) }
  get diameter() { return this.getProp("diameter") }
  set diameter(value) { this.setProp("diameter", value) }

  // - its "height" is a number
  static { this.declareProp("height", { type: "number" }) }
  get height() { return this.getProp("height") }
  set height(value) { this.setProp("height", value) }

  // - its "width" is a number
  static { this.declareProp("width", { type: "number" }) }
  get width() { return this.getProp("width") }
  set width(value) { this.setProp("width", value) }

  // - its "depth" is a number
  static { this.declareProp("depth", { type: "number" }) }
  get depth() { return this.getProp("depth") }
  set depth(value) { this.setProp("depth", value) }
}

export class Tag extends Thing {
  // - its "term" is text
  static { this.declareProp("term", { type: "text" }) }
  get term() { return this.getProp("term") }
  set term(value) { this.setProp("term", value) }

  /** an address */
  // - its "aat url" is text
  static { this.declareProp("aatUrl", { type: "text" }) }
  get aatUrl() { return this.getProp("aatUrl") }
  set aatUrl(value) { this.setProp("aatUrl", value) }

  /** an address */
  // - its "wikidata url" is text
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
core.heading("Artworks from the Met")
///////////////////////////
// ## Artworks from the Met
///////////////////////////
// Artworks of the Metropolitan Museum of Art, found by what you type:  a wall of pictures that goes on as you scroll.
// Every thing it shows is in MetArtworks.api.spell, as `spell place ingest` wrote it;  each type below adds to its type there,
// so looking again at the server never touches a line of this.
// Its search answers only ids:  each artwork is read from its own address as it's drawn, and no others.
// An artwork with no picture is left out:  the wall draws more as you scroll, so a short screen fills from the next ones.

export class MetArtwork extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "search" is text
  static { this.declareProp("search", { type: "text" }) }
  get search() { return this.getProp("search") }
  set search(value) { this.setProp("search", value) }

  create() {
    this.search = "sunflowers"
  }

  /** What the Met finds for the search, looking at all of each artwork:  ids only, each read as it's drawn */
  static { this.declareProp("found", { declaredAt: { path: "/MetArtworks.spell", start: 661, end: 709 }, readsFrom: ["met_museum"] }) }
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
          waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Asking the Met"),
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

core.heading("An artwork")
////////////////
// ## An artwork
////////////////
// A card that turns over:  its picture on the front, what the Met knows of it on the back.
// Only what's in the public domain has a picture:  the rest draw nothing, so the wall is all pictures.

// -----------
if (!core.isCarryingOver) metArtworks.start()
