import { core, Thing, List, App, Place, h } from "@spell/core"

core.heading("GitHub:  a repository's issues, the people who wrote it, and anyone by their login")
////////////////////////////////////////////////////////////////////////////////////////
// ## GitHub:  a repository's issues, the people who wrote it, and anyone by their login
////////////////////////////////////////////////////////////////////////////////////////
// A server other people run, and what it holds.  What's drawn from it is in GitHub.spellml.
// `github` is what this wrote, from looking at the server:
//   spell place ingest https://api.github.com --into GitHub.api.spell --name github --no-ai --key-secret GITHUB_TOKEN
//     --collections "issues=/repos/solidjs/solid/issues,contributors=/repos/solidjs/solid/contributors,users=/users/{name}"
//     --samples ryansolid,octocat
// `spell place update GitHub.api.spell` looks again, and changes only this file and GitHub.api.json5.
// Its key is your own, named GITHUB_TOKEN, read from the environment and never written here (`gh auth token` gives one).
// Without it, GitHub answers 60 requests an hour;  with it, 5000.  A page in a browser always goes without.

export class Issue extends Thing {
  // - its "url" is an issue
  static { this.declareProp("url", { type: "Issue", link: true, declaredAt: { path: "/GitHub.api.spell", start: 1294, end: 1315 } }) }
  get url() { return core.linked(this, "url", Issue) }
  set url(value) { this.setProp("url", value) }

  /** an address */
  // - its "repository url" is text
  static { this.declareProp("repositoryUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1319, end: 1347 } }) }
  get repositoryUrl() { return this.getProp("repositoryUrl") }
  set repositoryUrl(value) { this.setProp("repositoryUrl", value) }

  /** an address */
  // - its "labels url" is text
  static { this.declareProp("labelsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1366, end: 1390 } }) }
  get labelsUrl() { return this.getProp("labelsUrl") }
  set labelsUrl(value) { this.setProp("labelsUrl", value) }

  /** an address */
  // - its "comments url" is text
  static { this.declareProp("commentsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1409, end: 1435 } }) }
  get commentsUrl() { return this.getProp("commentsUrl") }
  set commentsUrl(value) { this.setProp("commentsUrl", value) }

  /** an address */
  // - its "events url" is text
  static { this.declareProp("eventsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1454, end: 1478 } }) }
  get eventsUrl() { return this.getProp("eventsUrl") }
  set eventsUrl(value) { this.setProp("eventsUrl", value) }

  /** an address */
  // - its "html url" is text
  static { this.declareProp("htmlUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1497, end: 1519 } }) }
  get htmlUrl() { return this.getProp("htmlUrl") }
  set htmlUrl(value) { this.setProp("htmlUrl", value) }

  // - its "node id" is text
  static { this.declareProp("nodeId", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1538, end: 1559 } }) }
  get nodeId() { return this.getProp("nodeId") }
  set nodeId(value) { this.setProp("nodeId", value) }

  // - its "number" is a number
  static { this.declareProp("number", { type: "number", declaredAt: { path: "/GitHub.api.spell", start: 1563, end: 1587 } }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1591, end: 1610 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "user" is an issue user
  static { this.declareProp("user", { type: "IssueUser", declaredAt: { path: "/GitHub.api.spell", start: 1614, end: 1641 } }) }
  get user() { return this.getProp("user") }
  set user(value) { this.setProp("user", value) }

  // - its "labels" is a list of labels
  static { this.declareProp("labels", { itemType: "Label", init: () => new List({ instanceType: "Label" }), declaredAt: { path: "/GitHub.api.spell", start: 1645, end: 1677 } }) }
  get labels() { return this.getProp("labels") }
  set labels(value) { this.setProp("labels", value) }

  // - its "state" is text
  static { this.declareProp("state", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1681, end: 1700 } }) }
  get state() { return this.getProp("state") }
  set state(value) { this.setProp("state", value) }

  // - its "locked" is yes or no
  static { this.declareProp("locked", { type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 1704, end: 1729 } }) }
  get locked() { return this.getProp("locked") }
  set locked(value) { this.setProp("locked", value) }

  // - its "assignees" is a list of text
  static { this.declareProp("assignees", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/GitHub.api.spell", start: 1733, end: 1766 } }) }
  get assignees() { return this.getProp("assignees") }
  set assignees(value) { this.setProp("assignees", value) }

  // - its "comments" is a number
  static { this.declareProp("comments", { type: "number", declaredAt: { path: "/GitHub.api.spell", start: 1770, end: 1796 } }) }
  get comments() { return this.getProp("comments") }
  set comments(value) { this.setProp("comments", value) }

  // - its "created at" is a date
  static { this.declareProp("createdAt", { type: "date", declaredAt: { path: "/GitHub.api.spell", start: 1800, end: 1826 } }) }
  get createdAt() { return this.getProp("createdAt") }
  set createdAt(value) { this.setProp("createdAt", value) }

  // - its "updated at" is a date
  static { this.declareProp("updatedAt", { type: "date", declaredAt: { path: "/GitHub.api.spell", start: 1830, end: 1856 } }) }
  get updatedAt() { return this.getProp("updatedAt") }
  set updatedAt(value) { this.setProp("updatedAt", value) }

  // - its "author association" is text
  static { this.declareProp("authorAssociation", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1860, end: 1892 } }) }
  get authorAssociation() { return this.getProp("authorAssociation") }
  set authorAssociation(value) { this.setProp("authorAssociation", value) }

  // - its "issue field values" is a list of text
  static { this.declareProp("issueFieldValues", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/GitHub.api.spell", start: 1896, end: 1938 } }) }
  get issueFieldValues() { return this.getProp("issueFieldValues") }
  set issueFieldValues(value) { this.setProp("issueFieldValues", value) }

  // - its "sub issues summary" is a sub issues summary
  static { this.declareProp("subIssuesSummary", { type: "SubIssuesSummary", declaredAt: { path: "/GitHub.api.spell", start: 1942, end: 1990 } }) }
  get subIssuesSummary() { return this.getProp("subIssuesSummary") }
  set subIssuesSummary(value) { this.setProp("subIssuesSummary", value) }

  // - its "issue dependencies summary" is an issue dependencies summary
  static { this.declareProp("issueDependenciesSummary", { type: "IssueDependenciesSummary", declaredAt: { path: "/GitHub.api.spell", start: 1994, end: 2059 } }) }
  get issueDependenciesSummary() { return this.getProp("issueDependenciesSummary") }
  set issueDependenciesSummary(value) { this.setProp("issueDependenciesSummary", value) }

  // - its "body" is text
  static { this.declareProp("body", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2063, end: 2081 } }) }
  get body() { return this.getProp("body") }
  set body(value) { this.setProp("body", value) }

  // - its "reactions" is a reaction
  static { this.declareProp("reactions", { type: "Reaction", declaredAt: { path: "/GitHub.api.spell", start: 2085, end: 2114 } }) }
  get reactions() { return this.getProp("reactions") }
  set reactions(value) { this.setProp("reactions", value) }

  /** an address */
  // - its "timeline url" is text
  static { this.declareProp("timelineUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2118, end: 2144 } }) }
  get timelineUrl() { return this.getProp("timelineUrl") }
  set timelineUrl(value) { this.setProp("timelineUrl", value) }

  // - its "performed via github app" is a performed via github app
  static { this.declareProp("performedViaGithubApp", { type: "PerformedViaGithubApp", declaredAt: { path: "/GitHub.api.spell", start: 2163, end: 2223 } }) }
  get performedViaGithubApp() { return this.getProp("performedViaGithubApp") }
  set performedViaGithubApp(value) { this.setProp("performedViaGithubApp", value) }

  // - its "state reason" is text
  static { this.declareProp("stateReason", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2227, end: 2253 } }) }
  get stateReason() { return this.getProp("stateReason") }
  set stateReason(value) { this.setProp("stateReason", value) }

  // - its "draft" is yes or no
  static { this.declareProp("draft", { type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 2257, end: 2281 } }) }
  get draft() { return this.getProp("draft") }
  set draft(value) { this.setProp("draft", value) }

  // - its "pull request" is a pull request
  static { this.declareProp("pullRequest", { type: "PullRequest", declaredAt: { path: "/GitHub.api.spell", start: 2285, end: 2321 } }) }
  get pullRequest() { return this.getProp("pullRequest") }
  set pullRequest(value) { this.setProp("pullRequest", value) }

  draw() {
    return h("ui-card", { class: "issue" },
      h("ui-content",
        h("ui-header", "#", () => this.number, () => this.title),
        h("ui-meta",
          () => this.state,
          " · ",
          () => this.user?.login,
          " · ",
          () => core.whileWaiting(() => this.comments),
          " comments"
        )
      )
    )
  }

  static savedIn = { place: "github", collection: "issues", select: ["number", "title", "user", "state", "comments", "body"] }
}

export class Contributor extends Thing {
  // - its "login" is text
  static { this.declareProp("login", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2376, end: 2395 } }) }
  get login() { return this.getProp("login") }
  set login(value) { this.setProp("login", value) }

  // - its "node id" is text
  static { this.declareProp("nodeId", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2399, end: 2420 } }) }
  get nodeId() { return this.getProp("nodeId") }
  set nodeId(value) { this.setProp("nodeId", value) }

  /** an address */
  // - its "avatar url" is text
  static { this.declareProp("avatarUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2424, end: 2448 } }) }
  get avatarUrl() { return this.getProp("avatarUrl") }
  set avatarUrl(value) { this.setProp("avatarUrl", value) }

  // - its "gravatar id" is text
  static { this.declareProp("gravatarId", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2467, end: 2492 } }) }
  get gravatarId() { return this.getProp("gravatarId") }
  set gravatarId(value) { this.setProp("gravatarId", value) }

  /** an address */
  // - its "url" is text
  static { this.declareProp("url", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2496, end: 2513 } }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  /** an address */
  // - its "html url" is text
  static { this.declareProp("htmlUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2532, end: 2554 } }) }
  get htmlUrl() { return this.getProp("htmlUrl") }
  set htmlUrl(value) { this.setProp("htmlUrl", value) }

  /** an address */
  // - its "followers url" is text
  static { this.declareProp("followersUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2573, end: 2600 } }) }
  get followersUrl() { return this.getProp("followersUrl") }
  set followersUrl(value) { this.setProp("followersUrl", value) }

  /** an address */
  // - its "following url" is text
  static { this.declareProp("followingUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2619, end: 2646 } }) }
  get followingUrl() { return this.getProp("followingUrl") }
  set followingUrl(value) { this.setProp("followingUrl", value) }

  /** an address */
  // - its "gists url" is text
  static { this.declareProp("gistsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2665, end: 2688 } }) }
  get gistsUrl() { return this.getProp("gistsUrl") }
  set gistsUrl(value) { this.setProp("gistsUrl", value) }

  /** an address */
  // - its "starred url" is text
  static { this.declareProp("starredUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2707, end: 2732 } }) }
  get starredUrl() { return this.getProp("starredUrl") }
  set starredUrl(value) { this.setProp("starredUrl", value) }

  /** an address */
  // - its "subscriptions url" is text
  static { this.declareProp("subscriptionsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2751, end: 2782 } }) }
  get subscriptionsUrl() { return this.getProp("subscriptionsUrl") }
  set subscriptionsUrl(value) { this.setProp("subscriptionsUrl", value) }

  /** an address */
  // - its "organizations url" is text
  static { this.declareProp("organizationsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2801, end: 2832 } }) }
  get organizationsUrl() { return this.getProp("organizationsUrl") }
  set organizationsUrl(value) { this.setProp("organizationsUrl", value) }

  /** an address */
  // - its "repos url" is text
  static { this.declareProp("reposUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2851, end: 2874 } }) }
  get reposUrl() { return this.getProp("reposUrl") }
  set reposUrl(value) { this.setProp("reposUrl", value) }

  /** an address */
  // - its "events url" is text
  static { this.declareProp("eventsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2893, end: 2917 } }) }
  get eventsUrl() { return this.getProp("eventsUrl") }
  set eventsUrl(value) { this.setProp("eventsUrl", value) }

  /** an address */
  // - its "received events url" is text
  static { this.declareProp("receivedEventsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2936, end: 2969 } }) }
  get receivedEventsUrl() { return this.getProp("receivedEventsUrl") }
  set receivedEventsUrl(value) { this.setProp("receivedEventsUrl", value) }

  // - its "kind" is text, stored as "type"
  static { this.declareProp("kind", { type: "text", storedAs: "type", declaredAt: { path: "/GitHub.api.spell", start: 2988, end: 3024 } }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  // - its "user view type" is text
  static { this.declareProp("userViewType", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3028, end: 3056 } }) }
  get userViewType() { return this.getProp("userViewType") }
  set userViewType(value) { this.setProp("userViewType", value) }

  // - its "site admin" is yes or no
  static { this.declareProp("siteAdmin", { type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 3060, end: 3089 } }) }
  get siteAdmin() { return this.getProp("siteAdmin") }
  set siteAdmin(value) { this.setProp("siteAdmin", value) }

  // - its "contributions" is a number
  static { this.declareProp("contributions", { type: "number", declaredAt: { path: "/GitHub.api.spell", start: 3093, end: 3124 } }) }
  get contributions() { return this.getProp("contributions") }
  set contributions(value) { this.setProp("contributions", value) }

  draw() {
    return h("ui-card", { class: "person" },
      h("ui-image", { src: () => this.avatarUrl, alt: "" }),
      h("ui-content",
        h("ui-header", () => this.login),
        h("ui-meta", () => this.contributions, " contributions")
      )
    )
  }

  static savedIn = { place: "github", collection: "contributors", select: ["login", "avatarUrl", "contributions"] }
}

export class User extends Thing {
  // - its "login" is text
  static { this.declareProp("login", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3172, end: 3191 } }) }
  get login() { return this.getProp("login") }
  set login(value) { this.setProp("login", value) }

  // - its "number" is a number, stored as "id"
  static { this.declareProp("number", { type: "number", storedAs: "id", declaredAt: { path: "/GitHub.api.spell", start: 3195, end: 3235 } }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  // - its "node id" is text
  static { this.declareProp("nodeId", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3239, end: 3260 } }) }
  get nodeId() { return this.getProp("nodeId") }
  set nodeId(value) { this.setProp("nodeId", value) }

  /** an address */
  // - its "avatar url" is text
  static { this.declareProp("avatarUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3264, end: 3288 } }) }
  get avatarUrl() { return this.getProp("avatarUrl") }
  set avatarUrl(value) { this.setProp("avatarUrl", value) }

  // - its "gravatar id" is text
  static { this.declareProp("gravatarId", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3307, end: 3332 } }) }
  get gravatarId() { return this.getProp("gravatarId") }
  set gravatarId(value) { this.setProp("gravatarId", value) }

  /** an address */
  // - its "url" is text
  static { this.declareProp("url", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3336, end: 3353 } }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  /** an address */
  // - its "html url" is text
  static { this.declareProp("htmlUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3372, end: 3394 } }) }
  get htmlUrl() { return this.getProp("htmlUrl") }
  set htmlUrl(value) { this.setProp("htmlUrl", value) }

  /** an address */
  // - its "followers url" is text
  static { this.declareProp("followersUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3413, end: 3440 } }) }
  get followersUrl() { return this.getProp("followersUrl") }
  set followersUrl(value) { this.setProp("followersUrl", value) }

  /** an address */
  // - its "following url" is text
  static { this.declareProp("followingUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3459, end: 3486 } }) }
  get followingUrl() { return this.getProp("followingUrl") }
  set followingUrl(value) { this.setProp("followingUrl", value) }

  /** an address */
  // - its "gists url" is text
  static { this.declareProp("gistsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3505, end: 3528 } }) }
  get gistsUrl() { return this.getProp("gistsUrl") }
  set gistsUrl(value) { this.setProp("gistsUrl", value) }

  /** an address */
  // - its "starred url" is text
  static { this.declareProp("starredUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3547, end: 3572 } }) }
  get starredUrl() { return this.getProp("starredUrl") }
  set starredUrl(value) { this.setProp("starredUrl", value) }

  /** an address */
  // - its "subscriptions url" is text
  static { this.declareProp("subscriptionsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3591, end: 3622 } }) }
  get subscriptionsUrl() { return this.getProp("subscriptionsUrl") }
  set subscriptionsUrl(value) { this.setProp("subscriptionsUrl", value) }

  /** an address */
  // - its "organizations url" is text
  static { this.declareProp("organizationsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3641, end: 3672 } }) }
  get organizationsUrl() { return this.getProp("organizationsUrl") }
  set organizationsUrl(value) { this.setProp("organizationsUrl", value) }

  /** an address */
  // - its "repos url" is text
  static { this.declareProp("reposUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3691, end: 3714 } }) }
  get reposUrl() { return this.getProp("reposUrl") }
  set reposUrl(value) { this.setProp("reposUrl", value) }

  /** an address */
  // - its "events url" is text
  static { this.declareProp("eventsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3733, end: 3757 } }) }
  get eventsUrl() { return this.getProp("eventsUrl") }
  set eventsUrl(value) { this.setProp("eventsUrl", value) }

  /** an address */
  // - its "received events url" is text
  static { this.declareProp("receivedEventsUrl", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3776, end: 3809 } }) }
  get receivedEventsUrl() { return this.getProp("receivedEventsUrl") }
  set receivedEventsUrl(value) { this.setProp("receivedEventsUrl", value) }

  // - its "kind" is text, stored as "type"
  static { this.declareProp("kind", { type: "text", storedAs: "type", declaredAt: { path: "/GitHub.api.spell", start: 3828, end: 3864 } }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  // - its "user view type" is text
  static { this.declareProp("userViewType", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3868, end: 3896 } }) }
  get userViewType() { return this.getProp("userViewType") }
  set userViewType(value) { this.setProp("userViewType", value) }

  // - its "site admin" is yes or no
  static { this.declareProp("siteAdmin", { type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 3900, end: 3929 } }) }
  get siteAdmin() { return this.getProp("siteAdmin") }
  set siteAdmin(value) { this.setProp("siteAdmin", value) }

  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3933, end: 3951 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "company" is text
  static { this.declareProp("company", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3955, end: 3976 } }) }
  get company() { return this.getProp("company") }
  set company(value) { this.setProp("company", value) }

  /** an address */
  // - its "blog" is text
  static { this.declareProp("blog", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3980, end: 3998 } }) }
  get blog() { return this.getProp("blog") }
  set blog(value) { this.setProp("blog", value) }

  // - its "location" is text
  static { this.declareProp("location", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4017, end: 4039 } }) }
  get location() { return this.getProp("location") }
  set location(value) { this.setProp("location", value) }

  // - its "email" is text
  static { this.declareProp("email", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4043, end: 4062 } }) }
  get email() { return this.getProp("email") }
  set email(value) { this.setProp("email", value) }

  // - its "twitter username" is text
  static { this.declareProp("twitterUsername", { type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4066, end: 4096 } }) }
  get twitterUsername() { return this.getProp("twitterUsername") }
  set twitterUsername(value) { this.setProp("twitterUsername", value) }

  // - its "public repos" is a number
  static { this.declareProp("publicRepos", { type: "number", declaredAt: { path: "/GitHub.api.spell", start: 4100, end: 4130 } }) }
  get publicRepos() { return this.getProp("publicRepos") }
  set publicRepos(value) { this.setProp("publicRepos", value) }

  // - its "public gists" is a number
  static { this.declareProp("publicGists", { type: "number", declaredAt: { path: "/GitHub.api.spell", start: 4134, end: 4164 } }) }
  get publicGists() { return this.getProp("publicGists") }
  set publicGists(value) { this.setProp("publicGists", value) }

  // - its "followers" is a number
  static { this.declareProp("followers", { type: "number", declaredAt: { path: "/GitHub.api.spell", start: 4168, end: 4195 } }) }
  get followers() { return this.getProp("followers") }
  set followers(value) { this.setProp("followers", value) }

  // - its "following" is a number
  static { this.declareProp("following", { type: "number", declaredAt: { path: "/GitHub.api.spell", start: 4199, end: 4226 } }) }
  get following() { return this.getProp("following") }
  set following(value) { this.setProp("following", value) }

  // - its "created at" is a date
  static { this.declareProp("createdAt", { type: "date", declaredAt: { path: "/GitHub.api.spell", start: 4230, end: 4256 } }) }
  get createdAt() { return this.getProp("createdAt") }
  set createdAt(value) { this.setProp("createdAt", value) }

  // - its "updated at" is a date
  static { this.declareProp("updatedAt", { type: "date", declaredAt: { path: "/GitHub.api.spell", start: 4260, end: 4286 } }) }
  get updatedAt() { return this.getProp("updatedAt") }
  set updatedAt(value) { this.setProp("updatedAt", value) }

  drawCard() {
    return h("ui-card", { class: "person", part: "card" },
      h("ui-image", { src: () => this.avatarUrl, alt: "" }),
      h("ui-content",
        h("ui-header", () => this.name),
        h("ui-meta", () => this.login)
      ),
      h("ui-extra", () => this.publicRepos, " public repositories · ", () => this.followers, " followers")
    )
  }

  static savedIn = { place: "github", collection: "users", select: ["login", "number", "avatarUrl", "name", "email", "publicRepos", "followers"] }
}

export class IssueUser extends Thing {
  // - its "login" is text
  static { this.declareProp("login", { type: "text" }) }
  get login() { return this.getProp("login") }
  set login(value) { this.setProp("login", value) }

  // - its "number" is a number, stored as "id"
  static { this.declareProp("number", { type: "number", storedAs: "id" }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  // - its "node id" is text
  static { this.declareProp("nodeId", { type: "text" }) }
  get nodeId() { return this.getProp("nodeId") }
  set nodeId(value) { this.setProp("nodeId", value) }

  // - its "avatar url" is text
  static { this.declareProp("avatarUrl", { type: "text" }) }
  get avatarUrl() { return this.getProp("avatarUrl") }
  set avatarUrl(value) { this.setProp("avatarUrl", value) }

  // - its "gravatar id" is text
  static { this.declareProp("gravatarId", { type: "text" }) }
  get gravatarId() { return this.getProp("gravatarId") }
  set gravatarId(value) { this.setProp("gravatarId", value) }

  // - its "url" is text
  static { this.declareProp("url", { type: "text" }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  // - its "html url" is text
  static { this.declareProp("htmlUrl", { type: "text" }) }
  get htmlUrl() { return this.getProp("htmlUrl") }
  set htmlUrl(value) { this.setProp("htmlUrl", value) }

  // - its "followers url" is text
  static { this.declareProp("followersUrl", { type: "text" }) }
  get followersUrl() { return this.getProp("followersUrl") }
  set followersUrl(value) { this.setProp("followersUrl", value) }

  // - its "following url" is text
  static { this.declareProp("followingUrl", { type: "text" }) }
  get followingUrl() { return this.getProp("followingUrl") }
  set followingUrl(value) { this.setProp("followingUrl", value) }

  // - its "gists url" is text
  static { this.declareProp("gistsUrl", { type: "text" }) }
  get gistsUrl() { return this.getProp("gistsUrl") }
  set gistsUrl(value) { this.setProp("gistsUrl", value) }

  // - its "starred url" is text
  static { this.declareProp("starredUrl", { type: "text" }) }
  get starredUrl() { return this.getProp("starredUrl") }
  set starredUrl(value) { this.setProp("starredUrl", value) }

  // - its "subscriptions url" is text
  static { this.declareProp("subscriptionsUrl", { type: "text" }) }
  get subscriptionsUrl() { return this.getProp("subscriptionsUrl") }
  set subscriptionsUrl(value) { this.setProp("subscriptionsUrl", value) }

  // - its "organizations url" is text
  static { this.declareProp("organizationsUrl", { type: "text" }) }
  get organizationsUrl() { return this.getProp("organizationsUrl") }
  set organizationsUrl(value) { this.setProp("organizationsUrl", value) }

  // - its "repos url" is text
  static { this.declareProp("reposUrl", { type: "text" }) }
  get reposUrl() { return this.getProp("reposUrl") }
  set reposUrl(value) { this.setProp("reposUrl", value) }

  // - its "events url" is text
  static { this.declareProp("eventsUrl", { type: "text" }) }
  get eventsUrl() { return this.getProp("eventsUrl") }
  set eventsUrl(value) { this.setProp("eventsUrl", value) }

  // - its "received events url" is text
  static { this.declareProp("receivedEventsUrl", { type: "text" }) }
  get receivedEventsUrl() { return this.getProp("receivedEventsUrl") }
  set receivedEventsUrl(value) { this.setProp("receivedEventsUrl", value) }

  // - its "kind" is text, stored as "type"
  static { this.declareProp("kind", { type: "text", storedAs: "type" }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  // - its "user view type" is text
  static { this.declareProp("userViewType", { type: "text" }) }
  get userViewType() { return this.getProp("userViewType") }
  set userViewType(value) { this.setProp("userViewType", value) }

  // - its "site admin" is yes or no
  static { this.declareProp("siteAdmin", { type: "choice" }) }
  get siteAdmin() { return this.getProp("siteAdmin") }
  set siteAdmin(value) { this.setProp("siteAdmin", value) }
}

export class Label extends Thing {
  // - its "number" is a number, stored as "id"
  static { this.declareProp("number", { type: "number", storedAs: "id" }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  // - its "node id" is text
  static { this.declareProp("nodeId", { type: "text" }) }
  get nodeId() { return this.getProp("nodeId") }
  set nodeId(value) { this.setProp("nodeId", value) }

  // - its "url" is text
  static { this.declareProp("url", { type: "text" }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  // - its "name" is text
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "color" is text
  static { this.declareProp("color", { type: "text" }) }
  get color() { return this.getProp("color") }
  set color(value) { this.setProp("color", value) }

  // - its "default" is yes or no
  static { this.declareProp("default", { type: "choice" }) }
  get default() { return this.getProp("default") }
  set default(value) { this.setProp("default", value) }

  // - its "description" is text
  static { this.declareProp("description", { type: "text" }) }
  get description() { return this.getProp("description") }
  set description(value) { this.setProp("description", value) }
}

export class SubIssuesSummary extends Thing {
  // - its "total" is a number
  static { this.declareProp("total", { type: "number" }) }
  get total() { return this.getProp("total") }
  set total(value) { this.setProp("total", value) }

  // - its "completed" is a number
  static { this.declareProp("completed", { type: "number" }) }
  get completed() { return this.getProp("completed") }
  set completed(value) { this.setProp("completed", value) }

  // - its "percent completed" is a number
  static { this.declareProp("percentCompleted", { type: "number" }) }
  get percentCompleted() { return this.getProp("percentCompleted") }
  set percentCompleted(value) { this.setProp("percentCompleted", value) }
}

export class IssueDependenciesSummary extends Thing {
  // - its "blocked by" is a number
  static { this.declareProp("blockedBy", { type: "number" }) }
  get blockedBy() { return this.getProp("blockedBy") }
  set blockedBy(value) { this.setProp("blockedBy", value) }

  // - its "total blocked by" is a number
  static { this.declareProp("totalBlockedBy", { type: "number" }) }
  get totalBlockedBy() { return this.getProp("totalBlockedBy") }
  set totalBlockedBy(value) { this.setProp("totalBlockedBy", value) }

  // - its "blocking" is a number
  static { this.declareProp("blocking", { type: "number" }) }
  get blocking() { return this.getProp("blocking") }
  set blocking(value) { this.setProp("blocking", value) }

  // - its "total blocking" is a number
  static { this.declareProp("totalBlocking", { type: "number" }) }
  get totalBlocking() { return this.getProp("totalBlocking") }
  set totalBlocking(value) { this.setProp("totalBlocking", value) }
}

export class Reaction extends Thing {
  // - its "url" is text
  static { this.declareProp("url", { type: "text" }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  // - its "total count" is a number
  static { this.declareProp("totalCount", { type: "number" }) }
  get totalCount() { return this.getProp("totalCount") }
  set totalCount(value) { this.setProp("totalCount", value) }

  // - its "laugh" is a number
  static { this.declareProp("laugh", { type: "number" }) }
  get laugh() { return this.getProp("laugh") }
  set laugh(value) { this.setProp("laugh", value) }

  // - its "hooray" is a number
  static { this.declareProp("hooray", { type: "number" }) }
  get hooray() { return this.getProp("hooray") }
  set hooray(value) { this.setProp("hooray", value) }

  // - its "confused" is a number
  static { this.declareProp("confused", { type: "number" }) }
  get confused() { return this.getProp("confused") }
  set confused(value) { this.setProp("confused", value) }

  // - its "heart" is a number
  static { this.declareProp("heart", { type: "number" }) }
  get heart() { return this.getProp("heart") }
  set heart(value) { this.setProp("heart", value) }

  // - its "rocket" is a number
  static { this.declareProp("rocket", { type: "number" }) }
  get rocket() { return this.getProp("rocket") }
  set rocket(value) { this.setProp("rocket", value) }

  // - its "eyes" is a number
  static { this.declareProp("eyes", { type: "number" }) }
  get eyes() { return this.getProp("eyes") }
  set eyes(value) { this.setProp("eyes", value) }
}

export class PerformedViaGithubApp extends Thing {
  // - its "number" is a number, stored as "id"
  static { this.declareProp("number", { type: "number", storedAs: "id" }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  // - its "client id" is text
  static { this.declareProp("clientId", { type: "text" }) }
  get clientId() { return this.getProp("clientId") }
  set clientId(value) { this.setProp("clientId", value) }

  // - its "slug" is text
  static { this.declareProp("slug", { type: "text" }) }
  get slug() { return this.getProp("slug") }
  set slug(value) { this.setProp("slug", value) }

  // - its "node id" is text
  static { this.declareProp("nodeId", { type: "text" }) }
  get nodeId() { return this.getProp("nodeId") }
  set nodeId(value) { this.setProp("nodeId", value) }

  // - its "owner" is an owner
  static { this.declareProp("owner", { type: "Owner" }) }
  get owner() { return this.getProp("owner") }
  set owner(value) { this.setProp("owner", value) }

  // - its "name" is text
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "description" is text
  static { this.declareProp("description", { type: "text" }) }
  get description() { return this.getProp("description") }
  set description(value) { this.setProp("description", value) }

  // - its "external url" is text
  static { this.declareProp("externalUrl", { type: "text" }) }
  get externalUrl() { return this.getProp("externalUrl") }
  set externalUrl(value) { this.setProp("externalUrl", value) }

  // - its "html url" is text
  static { this.declareProp("htmlUrl", { type: "text" }) }
  get htmlUrl() { return this.getProp("htmlUrl") }
  set htmlUrl(value) { this.setProp("htmlUrl", value) }

  // - its "created at" is a date
  static { this.declareProp("createdAt", { type: "date" }) }
  get createdAt() { return this.getProp("createdAt") }
  set createdAt(value) { this.setProp("createdAt", value) }

  // - its "updated at" is a date
  static { this.declareProp("updatedAt", { type: "date" }) }
  get updatedAt() { return this.getProp("updatedAt") }
  set updatedAt(value) { this.setProp("updatedAt", value) }

  // - its "permissions" is a permission
  static { this.declareProp("permissions", { type: "Permission" }) }
  get permissions() { return this.getProp("permissions") }
  set permissions(value) { this.setProp("permissions", value) }

  // - its "events" is a list of text
  static { this.declareProp("events", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get events() { return this.getProp("events") }
  set events(value) { this.setProp("events", value) }
}

export class Owner extends Thing {
  // - its "login" is text
  static { this.declareProp("login", { type: "text" }) }
  get login() { return this.getProp("login") }
  set login(value) { this.setProp("login", value) }

  // - its "number" is a number, stored as "id"
  static { this.declareProp("number", { type: "number", storedAs: "id" }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  // - its "node id" is text
  static { this.declareProp("nodeId", { type: "text" }) }
  get nodeId() { return this.getProp("nodeId") }
  set nodeId(value) { this.setProp("nodeId", value) }

  // - its "avatar url" is text
  static { this.declareProp("avatarUrl", { type: "text" }) }
  get avatarUrl() { return this.getProp("avatarUrl") }
  set avatarUrl(value) { this.setProp("avatarUrl", value) }

  // - its "gravatar id" is text
  static { this.declareProp("gravatarId", { type: "text" }) }
  get gravatarId() { return this.getProp("gravatarId") }
  set gravatarId(value) { this.setProp("gravatarId", value) }

  // - its "url" is text
  static { this.declareProp("url", { type: "text" }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  // - its "html url" is text
  static { this.declareProp("htmlUrl", { type: "text" }) }
  get htmlUrl() { return this.getProp("htmlUrl") }
  set htmlUrl(value) { this.setProp("htmlUrl", value) }

  // - its "followers url" is text
  static { this.declareProp("followersUrl", { type: "text" }) }
  get followersUrl() { return this.getProp("followersUrl") }
  set followersUrl(value) { this.setProp("followersUrl", value) }

  // - its "following url" is text
  static { this.declareProp("followingUrl", { type: "text" }) }
  get followingUrl() { return this.getProp("followingUrl") }
  set followingUrl(value) { this.setProp("followingUrl", value) }

  // - its "gists url" is text
  static { this.declareProp("gistsUrl", { type: "text" }) }
  get gistsUrl() { return this.getProp("gistsUrl") }
  set gistsUrl(value) { this.setProp("gistsUrl", value) }

  // - its "starred url" is text
  static { this.declareProp("starredUrl", { type: "text" }) }
  get starredUrl() { return this.getProp("starredUrl") }
  set starredUrl(value) { this.setProp("starredUrl", value) }

  // - its "subscriptions url" is text
  static { this.declareProp("subscriptionsUrl", { type: "text" }) }
  get subscriptionsUrl() { return this.getProp("subscriptionsUrl") }
  set subscriptionsUrl(value) { this.setProp("subscriptionsUrl", value) }

  // - its "organizations url" is text
  static { this.declareProp("organizationsUrl", { type: "text" }) }
  get organizationsUrl() { return this.getProp("organizationsUrl") }
  set organizationsUrl(value) { this.setProp("organizationsUrl", value) }

  // - its "repos url" is text
  static { this.declareProp("reposUrl", { type: "text" }) }
  get reposUrl() { return this.getProp("reposUrl") }
  set reposUrl(value) { this.setProp("reposUrl", value) }

  // - its "events url" is text
  static { this.declareProp("eventsUrl", { type: "text" }) }
  get eventsUrl() { return this.getProp("eventsUrl") }
  set eventsUrl(value) { this.setProp("eventsUrl", value) }

  // - its "received events url" is text
  static { this.declareProp("receivedEventsUrl", { type: "text" }) }
  get receivedEventsUrl() { return this.getProp("receivedEventsUrl") }
  set receivedEventsUrl(value) { this.setProp("receivedEventsUrl", value) }

  // - its "kind" is text, stored as "type"
  static { this.declareProp("kind", { type: "text", storedAs: "type" }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  // - its "user view type" is text
  static { this.declareProp("userViewType", { type: "text" }) }
  get userViewType() { return this.getProp("userViewType") }
  set userViewType(value) { this.setProp("userViewType", value) }

  // - its "site admin" is yes or no
  static { this.declareProp("siteAdmin", { type: "choice" }) }
  get siteAdmin() { return this.getProp("siteAdmin") }
  set siteAdmin(value) { this.setProp("siteAdmin", value) }
}

export class Permission extends Thing {
  // - its "actions" is text
  static { this.declareProp("actions", { type: "text" }) }
  get actions() { return this.getProp("actions") }
  set actions(value) { this.setProp("actions", value) }

  // - its "administration" is text
  static { this.declareProp("administration", { type: "text" }) }
  get administration() { return this.getProp("administration") }
  set administration(value) { this.setProp("administration", value) }

  // - its "checks" is text
  static { this.declareProp("checks", { type: "text" }) }
  get checks() { return this.getProp("checks") }
  set checks(value) { this.setProp("checks", value) }

  // - its "contents" is text
  static { this.declareProp("contents", { type: "text" }) }
  get contents() { return this.getProp("contents") }
  set contents(value) { this.setProp("contents", value) }

  // - its "discussions" is text
  static { this.declareProp("discussions", { type: "text" }) }
  get discussions() { return this.getProp("discussions") }
  set discussions(value) { this.setProp("discussions", value) }

  // - its "issues" is text
  static { this.declareProp("issues", { type: "text" }) }
  get issues() { return this.getProp("issues") }
  set issues(value) { this.setProp("issues", value) }

  // - its "members" is text
  static { this.declareProp("members", { type: "text" }) }
  get members() { return this.getProp("members") }
  set members(value) { this.setProp("members", value) }

  // - its "merge queues" is text
  static { this.declareProp("mergeQueues", { type: "text" }) }
  get mergeQueues() { return this.getProp("mergeQueues") }
  set mergeQueues(value) { this.setProp("mergeQueues", value) }

  // - its "metadata" is text
  static { this.declareProp("metadata", { type: "text" }) }
  get metadata() { return this.getProp("metadata") }
  set metadata(value) { this.setProp("metadata", value) }

  // - its "pull requests" is text
  static { this.declareProp("pullRequests", { type: "text" }) }
  get pullRequests() { return this.getProp("pullRequests") }
  set pullRequests(value) { this.setProp("pullRequests", value) }

  // - its "repository hooks" is text
  static { this.declareProp("repositoryHooks", { type: "text" }) }
  get repositoryHooks() { return this.getProp("repositoryHooks") }
  set repositoryHooks(value) { this.setProp("repositoryHooks", value) }

  // - its "statuses" is text
  static { this.declareProp("statuses", { type: "text" }) }
  get statuses() { return this.getProp("statuses") }
  set statuses(value) { this.setProp("statuses", value) }

  // - its "workflows" is text
  static { this.declareProp("workflows", { type: "text" }) }
  get workflows() { return this.getProp("workflows") }
  set workflows(value) { this.setProp("workflows", value) }
}

export class PullRequest extends Thing {
  // - its "url" is text
  static { this.declareProp("url", { type: "text" }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  // - its "html url" is text
  static { this.declareProp("htmlUrl", { type: "text" }) }
  get htmlUrl() { return this.getProp("htmlUrl") }
  set htmlUrl(value) { this.setProp("htmlUrl", value) }

  // - its "diff url" is text
  static { this.declareProp("diffUrl", { type: "text" }) }
  get diffUrl() { return this.getProp("diffUrl") }
  set diffUrl(value) { this.setProp("diffUrl", value) }

  // - its "patch url" is text
  static { this.declareProp("patchUrl", { type: "text" }) }
  get patchUrl() { return this.getProp("patchUrl") }
  set patchUrl(value) { this.setProp("patchUrl", value) }
}

export class Github extends Place {}
export const github = core.place(new Github(), {
  name: "github",
  kind: "web server",
  at: "https://api.github.com",
  keyNamed: "GITHUB_TOKEN",
  keyIfSet: true,
  nextPageInLink: true,
  checkedEvery: 1800,
  namesLike: "repository_url",
  collections: {
    issues: { at: "/repos/solidjs/solid/issues" },
    contributors: { at: "/repos/solidjs/solid/contributors" },
    users: { at: "/users/{id}", fields: { id: "login" } }
  }, firstReads: () => [[Contributor], [Issue]] })

// -----------
core.heading("Open Library:  books by what they're called, who wrote them, and their covers")
///////////////////////////////////////////////////////////////////////////////////
// ## Open Library:  books by what they're called, who wrote them, and their covers
///////////////////////////////////////////////////////////////////////////////////
// A server other people run, and what it holds.  What's drawn from it is in OpenLibrary.spellml.
// `open library` is what this wrote, from looking at the server:
//   spell place ingest https://openlibrary.org --into OpenLibrary.api.spell --name "open library" --no-ai
//     --collections "books=/search.json?q=dune,authors=/authors/{name}.json,editions=/books/{name}.json"
//     --samples authors=OL79034A,editions=OL32848840M --pictures "cover_i=https://covers.openlibrary.org/b/id/{id}-M.jpg"
// `spell place update OpenLibrary.api.spell` looks again, and changes only this file and OpenLibrary.api.json5.
// It has no list of every book:  a program searches it, `every book where its title includes ...`.
// Each book's authors are their ids, each read from the author's own record when something reads it;
// its cover is a picture on another server, covers.openlibrary.org, its address built from the book's cover id.

export class Book extends Thing {
  // - its "authors" is a list of authors, stored as "author_key"
  static { this.declareProp("authors", { itemType: "Author", storedAs: "author_key", init: () => new List({ instanceType: "Author" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 1489, end: 1547 } }) }
  get authors() { return core.linked(this, "authors", Author) }
  set authors(value) { this.setProp("authors", value) }

  // - its "author name" is a list of text
  static { this.declareProp("authorName", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 1551, end: 1586 } }) }
  get authorName() { return this.getProp("authorName") }
  set authorName(value) { this.setProp("authorName", value) }

  // - its "cover edition" is an edition, stored as "cover_edition_key"
  static { this.declareProp("coverEdition", { type: "Edition", storedAs: "cover_edition_key", link: true, declaredAt: { path: "/OpenLibrary.api.spell", start: 1590, end: 1654 } }) }
  get coverEdition() { return core.linked(this, "coverEdition", Edition) }
  set coverEdition(value) { this.setProp("coverEdition", value) }

  // - its "cover height" is a number
  static { this.declareProp("coverHeight", { type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 1658, end: 1688 } }) }
  get coverHeight() { return this.getProp("coverHeight") }
  set coverHeight(value) { this.setProp("coverHeight", value) }

  /** a picture's address */
  // - its "cover i" is text
  static { this.declareProp("coverI", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 1692, end: 1713 } }) }
  get coverI() { return this.getProp("coverI") }
  set coverI(value) { this.setProp("coverI", value) }

  // - its "cover width" is a number
  static { this.declareProp("coverWidth", { type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 1741, end: 1770 } }) }
  get coverWidth() { return this.getProp("coverWidth") }
  set coverWidth(value) { this.setProp("coverWidth", value) }

  // - its "ebook access" is text
  static { this.declareProp("ebookAccess", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 1774, end: 1800 } }) }
  get ebookAccess() { return this.getProp("ebookAccess") }
  set ebookAccess(value) { this.setProp("ebookAccess", value) }

  // - its "edition count" is a number
  static { this.declareProp("editionCount", { type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 1804, end: 1835 } }) }
  get editionCount() { return this.getProp("editionCount") }
  set editionCount(value) { this.setProp("editionCount", value) }

  // - its "first publish year" is a number
  static { this.declareProp("firstPublishYear", { type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 1839, end: 1875 } }) }
  get firstPublishYear() { return this.getProp("firstPublishYear") }
  set firstPublishYear(value) { this.setProp("firstPublishYear", value) }

  // - its "fulltext" is yes or no, stored as "has_fulltext"
  static { this.declareProp("fulltext", { type: "choice", storedAs: "has_fulltext", declaredAt: { path: "/OpenLibrary.api.spell", start: 1879, end: 1932 } }) }
  get fulltext() { return this.getProp("fulltext") }
  set fulltext(value) { this.setProp("fulltext", value) }

  // - its "ia" is a list of text
  static { this.declareProp("ia", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 1936, end: 1962 } }) }
  get ia() { return this.getProp("ia") }
  set ia(value) { this.setProp("ia", value) }

  // - its "ia collection" is a list of text
  static { this.declareProp("iaCollection", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 1966, end: 2003 } }) }
  get iaCollection() { return this.getProp("iaCollection") }
  set iaCollection(value) { this.setProp("iaCollection", value) }

  // - its "language" is a list of text
  static { this.declareProp("language", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2007, end: 2039 } }) }
  get language() { return this.getProp("language") }
  set language(value) { this.setProp("language", value) }

  // - its "lending edition s" is text
  static { this.declareProp("lendingEditionS", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2043, end: 2074 } }) }
  get lendingEditionS() { return this.getProp("lendingEditionS") }
  set lendingEditionS(value) { this.setProp("lendingEditionS", value) }

  // - its "lending identifier s" is text
  static { this.declareProp("lendingIdentifierS", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2078, end: 2112 } }) }
  get lendingIdentifierS() { return this.getProp("lendingIdentifierS") }
  set lendingIdentifierS(value) { this.setProp("lendingIdentifierS", value) }

  // - its "public scan b" is yes or no
  static { this.declareProp("publicScanB", { type: "choice", declaredAt: { path: "/OpenLibrary.api.spell", start: 2116, end: 2148 } }) }
  get publicScanB() { return this.getProp("publicScanB") }
  set publicScanB(value) { this.setProp("publicScanB", value) }

  // - its "series key" is a list of text
  static { this.declareProp("seriesKey", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2152, end: 2186 } }) }
  get seriesKey() { return this.getProp("seriesKey") }
  set seriesKey(value) { this.setProp("seriesKey", value) }

  // - its "series name" is a list of text
  static { this.declareProp("seriesName", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2190, end: 2225 } }) }
  get seriesName() { return this.getProp("seriesName") }
  set seriesName(value) { this.setProp("seriesName", value) }

  // - its "series position" is a list of text
  static { this.declareProp("seriesPosition", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2229, end: 2268 } }) }
  get seriesPosition() { return this.getProp("seriesPosition") }
  set seriesPosition(value) { this.setProp("seriesPosition", value) }

  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2272, end: 2291 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "subtitle" is text
  static { this.declareProp("subtitle", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2295, end: 2317 } }) }
  get subtitle() { return this.getProp("subtitle") }
  set subtitle(value) { this.setProp("subtitle", value) }

  /** Who wrote it first:  read from Open Library's record of them, by their id */
  static { this.declareProp("writer", { declaredAt: { path: "/OpenLibrary.spellml", start: 1714, end: 1850 }, readsFrom: ["open_library"] }) }
  get writer() {
    return core.getItemAt(this.authors, 0)
  }

  draw() {
    return h("ui-card", {
      class: "book",
      onClick: core.pressed(this, async () => await this.open()),
      style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
    },
      h("ui-image", { src: () => this.coverI, alt: "" }),
      h("ui-content",
        h("ui-header", () => this.title),
        h("ui-meta", () => core.getItemAt(this.authorName, 0), " · ", () => this.firstPublishYear)
      )
    )
  }

  drawPage() {
    return h("ui-stack", { class: "book-page", direction: "horizontal", wrap: true, align: "start", part: "page" },
      h("ui-image", { class: "cover", src: () => this.coverI, alt: "" }),
      h("ui-stack",
        h("ui-header", { size: "large" }, () => this.title),
        h("ui-text",
          "First published in ",
          () => this.firstPublishYear,
          " · ",
          () => this.editionCount,
          " editions"
        ),
        () => this.drawWriting()
      )
    )
  }

  static drawsWaiting = true
  drawWriting() {
    if (this.writer) return this.writer.drawCard()

    core.readRider("waiting", () => h("ui-loader", { visible: true, inline: true, text: true, part: "writing" },
      "Asking Open Library who wrote it"
    ))
    core.readRider("failed", () => h("ui-text", { part: "writing" }, "Open Library can't say who wrote it just now."))
  }

  ///////////////////////////////////////
  // ## What a book can do, from anywhere
  ///////////////////////////////////////
  // Only this file can name the public servers:  so its other files ask this.

  async open() {
    publicServers.library.showing = this
  }

  static savedIn = { place: "open_library", collection: "books", select: ["authors", "authorName", "coverI", "editionCount", "firstPublishYear", "title"] }
}

export class Author extends Thing {
  // - its "links" is a list of links
  static { this.declareProp("links", { itemType: "Link", init: () => new List({ instanceType: "Link" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2374, end: 2404 } }) }
  get links() { return this.getProp("links") }
  set links(value) { this.setProp("links", value) }

  // - its "kind" is a kind, stored as "type"
  static { this.declareProp("kind", { type: "Kind", storedAs: "type", declaredAt: { path: "/OpenLibrary.api.spell", start: 2408, end: 2446 } }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  // - its "key" is text
  static { this.declareProp("key", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2450, end: 2467 } }) }
  get key() { return this.getProp("key") }
  set key(value) { this.setProp("key", value) }

  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2471, end: 2489 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "source records" is a list of text
  static { this.declareProp("sourceRecords", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2493, end: 2531 } }) }
  get sourceRecords() { return this.getProp("sourceRecords") }
  set sourceRecords(value) { this.setProp("sourceRecords", value) }

  // - its "birth date" is text
  static { this.declareProp("birthDate", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2535, end: 2559 } }) }
  get birthDate() { return this.getProp("birthDate") }
  set birthDate(value) { this.setProp("birthDate", value) }

  // - its "bio" is text
  static { this.declareProp("bio", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2563, end: 2580 } }) }
  get bio() { return this.getProp("bio") }
  set bio(value) { this.setProp("bio", value) }

  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2584, end: 2603 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "alternate names" is a list of text
  static { this.declareProp("alternateNames", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2607, end: 2646 } }) }
  get alternateNames() { return this.getProp("alternateNames") }
  set alternateNames(value) { this.setProp("alternateNames", value) }

  // - its "remote ids" is a remote id
  static { this.declareProp("remoteIds", { type: "RemoteId", declaredAt: { path: "/OpenLibrary.api.spell", start: 2650, end: 2681 } }) }
  get remoteIds() { return this.getProp("remoteIds") }
  set remoteIds(value) { this.setProp("remoteIds", value) }

  // - its "photos" is a list of numbers
  static { this.declareProp("photos", { itemType: "number", init: () => new List({ instanceType: "number" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2685, end: 2718 } }) }
  get photos() { return this.getProp("photos") }
  set photos(value) { this.setProp("photos", value) }

  // - its "death date" is text
  static { this.declareProp("deathDate", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2722, end: 2746 } }) }
  get deathDate() { return this.getProp("deathDate") }
  set deathDate(value) { this.setProp("deathDate", value) }

  // - its "personal name" is text
  static { this.declareProp("personalName", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2750, end: 2777 } }) }
  get personalName() { return this.getProp("personalName") }
  set personalName(value) { this.setProp("personalName", value) }

  // - its "latest revision" is a number
  static { this.declareProp("latestRevision", { type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 2781, end: 2814 } }) }
  get latestRevision() { return this.getProp("latestRevision") }
  set latestRevision(value) { this.setProp("latestRevision", value) }

  // - its "revision" is a number
  static { this.declareProp("revision", { type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 2818, end: 2844 } }) }
  get revision() { return this.getProp("revision") }
  set revision(value) { this.setProp("revision", value) }

  // - its "created" is a created
  static { this.declareProp("created", { type: "Created", declaredAt: { path: "/OpenLibrary.api.spell", start: 2848, end: 2874 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - its "last modified" is a last modified
  static { this.declareProp("lastModified", { type: "LastModified", declaredAt: { path: "/OpenLibrary.api.spell", start: 2878, end: 2916 } }) }
  get lastModified() { return this.getProp("lastModified") }
  set lastModified(value) { this.setProp("lastModified", value) }

  drawCard() {
    return h("ui-card", { class: "author", part: "card" },
      h("ui-content",
        h("ui-header", () => this.name),
        h("ui-meta", "Born ", () => this.birthDate),
        h("ui-description", () => this.bio)
      )
    )
  }

  static savedIn = { place: "open_library", collection: "authors", select: ["name", "birthDate", "bio", "title"] }
}

export class Edition extends Thing {
  // - its "kind" is a kind, stored as "type"
  static { this.declareProp("kind", { type: "Kind", storedAs: "type", declaredAt: { path: "/OpenLibrary.api.spell", start: 2974, end: 3012 } }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 3016, end: 3035 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "authors" is a list of edition authors
  static { this.declareProp("authors", { itemType: "EditionAuthor", init: () => new List({ instanceType: "EditionAuthor" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 3039, end: 3081 } }) }
  get authors() { return this.getProp("authors") }
  set authors(value) { this.setProp("authors", value) }

  // - its "publish date" is text
  static { this.declareProp("publishDate", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 3085, end: 3111 } }) }
  get publishDate() { return this.getProp("publishDate") }
  set publishDate(value) { this.setProp("publishDate", value) }

  // - its "source records" is a list of text
  static { this.declareProp("sourceRecords", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 3115, end: 3153 } }) }
  get sourceRecords() { return this.getProp("sourceRecords") }
  set sourceRecords(value) { this.setProp("sourceRecords", value) }

  // - its "number of pages" is a number
  static { this.declareProp("numberOfPages", { type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 3157, end: 3190 } }) }
  get numberOfPages() { return this.getProp("numberOfPages") }
  set numberOfPages(value) { this.setProp("numberOfPages", value) }

  // - its "publishers" is a list of text
  static { this.declareProp("publishers", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 3194, end: 3228 } }) }
  get publishers() { return this.getProp("publishers") }
  set publishers(value) { this.setProp("publishers", value) }

  // - its "physical format" is text
  static { this.declareProp("physicalFormat", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 3232, end: 3261 } }) }
  get physicalFormat() { return this.getProp("physicalFormat") }
  set physicalFormat(value) { this.setProp("physicalFormat", value) }

  // - its "notes" is a note
  static { this.declareProp("notes", { type: "Note", declaredAt: { path: "/OpenLibrary.api.spell", start: 3265, end: 3286 } }) }
  get notes() { return this.getProp("notes") }
  set notes(value) { this.setProp("notes", value) }

  // - its "full title" is text
  static { this.declareProp("fullTitle", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 3290, end: 3314 } }) }
  get fullTitle() { return this.getProp("fullTitle") }
  set fullTitle(value) { this.setProp("fullTitle", value) }

  // - its "covers" is a list of numbers
  static { this.declareProp("covers", { itemType: "number", init: () => new List({ instanceType: "number" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 3318, end: 3351 } }) }
  get covers() { return this.getProp("covers") }
  set covers(value) { this.setProp("covers", value) }

  // - its "works" is a list of works
  static { this.declareProp("works", { itemType: "Work", init: () => new List({ instanceType: "Work" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 3355, end: 3385 } }) }
  get works() { return this.getProp("works") }
  set works(value) { this.setProp("works", value) }

  // - its "key" is text
  static { this.declareProp("key", { type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 3389, end: 3406 } }) }
  get key() { return this.getProp("key") }
  set key(value) { this.setProp("key", value) }

  // - its "local id" is a list of text
  static { this.declareProp("localId", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 3410, end: 3442 } }) }
  get localId() { return this.getProp("localId") }
  set localId(value) { this.setProp("localId", value) }

  // - its "latest revision" is a number
  static { this.declareProp("latestRevision", { type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 3446, end: 3479 } }) }
  get latestRevision() { return this.getProp("latestRevision") }
  set latestRevision(value) { this.setProp("latestRevision", value) }

  // - its "revision" is a number
  static { this.declareProp("revision", { type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 3483, end: 3509 } }) }
  get revision() { return this.getProp("revision") }
  set revision(value) { this.setProp("revision", value) }

  // - its "created" is a created
  static { this.declareProp("created", { type: "Created", declaredAt: { path: "/OpenLibrary.api.spell", start: 3513, end: 3539 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - its "last modified" is a last modified
  static { this.declareProp("lastModified", { type: "LastModified", declaredAt: { path: "/OpenLibrary.api.spell", start: 3543, end: 3581 } }) }
  get lastModified() { return this.getProp("lastModified") }
  set lastModified(value) { this.setProp("lastModified", value) }

  static savedIn = { place: "open_library", collection: "editions", select: ["title", "authors"] }
}

export class Link extends Thing {
  // - its "title" is text
  static { this.declareProp("title", { type: "text" }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  /** an address */
  // - its "url" is text
  static { this.declareProp("url", { type: "text" }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  // - its "kind" is a kind, stored as "type"
  static { this.declareProp("kind", { type: "Kind", storedAs: "type" }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }
}

export class Kind extends Thing {
  // - its "key" is text
  static { this.declareProp("key", { type: "text" }) }
  get key() { return this.getProp("key") }
  set key(value) { this.setProp("key", value) }
}

export class RemoteId extends Thing {
  // - its "viaf" is a number
  static { this.declareProp("viaf", { type: "number" }) }
  get viaf() { return this.getProp("viaf") }
  set viaf(value) { this.setProp("viaf", value) }

  // - its "wikidata" is text
  static { this.declareProp("wikidata", { type: "text" }) }
  get wikidata() { return this.getProp("wikidata") }
  set wikidata(value) { this.setProp("wikidata", value) }

  // - its "isni" is a number
  static { this.declareProp("isni", { type: "number" }) }
  get isni() { return this.getProp("isni") }
  set isni(value) { this.setProp("isni", value) }

  // - its "amazon" is text
  static { this.declareProp("amazon", { type: "text" }) }
  get amazon() { return this.getProp("amazon") }
  set amazon(value) { this.setProp("amazon", value) }

  // - its "bookbrainz" is text
  static { this.declareProp("bookbrainz", { type: "text" }) }
  get bookbrainz() { return this.getProp("bookbrainz") }
  set bookbrainz(value) { this.setProp("bookbrainz", value) }

  // - its "goodreads" is a number
  static { this.declareProp("goodreads", { type: "number" }) }
  get goodreads() { return this.getProp("goodreads") }
  set goodreads(value) { this.setProp("goodreads", value) }

  // - its "gnd" is a number
  static { this.declareProp("gnd", { type: "number" }) }
  get gnd() { return this.getProp("gnd") }
  set gnd(value) { this.setProp("gnd", value) }

  // - its "imdb" is text
  static { this.declareProp("imdb", { type: "text" }) }
  get imdb() { return this.getProp("imdb") }
  set imdb(value) { this.setProp("imdb", value) }

  // - its "lc naf" is text
  static { this.declareProp("lcNaf", { type: "text" }) }
  get lcNaf() { return this.getProp("lcNaf") }
  set lcNaf(value) { this.setProp("lcNaf", value) }

  // - its "librarything" is text
  static { this.declareProp("librarything", { type: "text" }) }
  get librarything() { return this.getProp("librarything") }
  set librarything(value) { this.setProp("librarything", value) }

  // - its "musicbrainz" is text
  static { this.declareProp("musicbrainz", { type: "text" }) }
  get musicbrainz() { return this.getProp("musicbrainz") }
  set musicbrainz(value) { this.setProp("musicbrainz", value) }

  // - its "storygraph" is text
  static { this.declareProp("storygraph", { type: "text" }) }
  get storygraph() { return this.getProp("storygraph") }
  set storygraph(value) { this.setProp("storygraph", value) }

  // - its "inventaire" is text
  static { this.declareProp("inventaire", { type: "text" }) }
  get inventaire() { return this.getProp("inventaire") }
  set inventaire(value) { this.setProp("inventaire", value) }

  // - its "librivox" is a number
  static { this.declareProp("librivox", { type: "number" }) }
  get librivox() { return this.getProp("librivox") }
  set librivox(value) { this.setProp("librivox", value) }

  // - its "project gutenberg" is a number
  static { this.declareProp("projectGutenberg", { type: "number" }) }
  get projectGutenberg() { return this.getProp("projectGutenberg") }
  set projectGutenberg(value) { this.setProp("projectGutenberg", value) }

  // - its "opac sbn" is text
  static { this.declareProp("opacSbn", { type: "text" }) }
  get opacSbn() { return this.getProp("opacSbn") }
  set opacSbn(value) { this.setProp("opacSbn", value) }
}

export class Created extends Thing {
  // - its "kind" is text, stored as "type"
  static { this.declareProp("kind", { type: "text", storedAs: "type" }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  // - its "value" is a date
  static { this.declareProp("value", { type: "date" }) }
  get value() { return this.getProp("value") }
  set value(value) { this.setProp("value", value) }
}

export class LastModified extends Thing {
  // - its "kind" is text, stored as "type"
  static { this.declareProp("kind", { type: "text", storedAs: "type" }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  // - its "value" is a date
  static { this.declareProp("value", { type: "date" }) }
  get value() { return this.getProp("value") }
  set value(value) { this.setProp("value", value) }
}

export class EditionAuthor extends Thing {
  // - its "key" is text
  static { this.declareProp("key", { type: "text" }) }
  get key() { return this.getProp("key") }
  set key(value) { this.setProp("key", value) }
}

export class Note extends Thing {
  // - its "kind" is text, stored as "type"
  static { this.declareProp("kind", { type: "text", storedAs: "type" }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  // - its "value" is text
  static { this.declareProp("value", { type: "text" }) }
  get value() { return this.getProp("value") }
  set value(value) { this.setProp("value", value) }
}

export class Work extends Thing {
  // - its "key" is text
  static { this.declareProp("key", { type: "text" }) }
  get key() { return this.getProp("key") }
  set key(value) { this.setProp("key", value) }
}

export class OpenLibrary extends Place {}
export const openLibrary = core.place(new OpenLibrary(), {
  name: "open_library",
  kind: "web server",
  at: "https://openlibrary.org",
  idColumn: "key",
  rowsIn: "docs",
  checkedEvery: 30,
  namesLike: "author_key",
  searches: { param: "q", fields: ["titles"] },
  collections: {
    books: {
      at: "/search.json",
      searchedOnly: true,
      pictures: { coverI: "https://covers.openlibrary.org/b/id/{id}-M.jpg" }
    },
    authors: { at: "/authors/{id}.json" },
    editions: { at: "/books/{id}.json" }
  }
})

// -----------
core.heading("Open Library")
//////////////////
// ## Open Library
//////////////////
// Books by what they're called, who wrote them, and their covers.
// Every thing it shows is in OpenLibrary.api.spell, as `spell place ingest` wrote it;  each type below adds to its type there,
// with `<spell-more-of>`, so looking again at the server never touches a line of this.
// Open Library has no list of every book, only a search:  so the page always searches, for what's typed.

export class OpenLibraryPage extends Thing {
  // - its "search" is text
  static { this.declareProp("search", { type: "text" }) }
  get search() { return this.getProp("search") }
  set search(value) { this.setProp("search", value) }

  // - its "showing" is a book
  static { this.declareProp("showing", { type: "Book", link: true }) }
  get showing() { return core.linked(this, "showing", Book) }
  set showing(value) { this.setProp("showing", value) }

  create() {
    this.search = "dune"
  }

  /** What the search finds:  Open Library looks, by the title, and gives back the first hundred */
  static { this.declareProp("found", { declaredAt: { path: "/OpenLibrary.spellml", start: 546, end: 715 }, readsFrom: ["open_library"] }) }
  get found() { return core.waitedValue(this, "found", async () => {
    return core.filter(await core.savedThings(Book, { search: { title: this.search } }, "looks through"), (book) => core.includes(book.title, this.search))
  }, () => [this.search]) }

  static drawsWaiting = true
  draw() {
    return [
      h("ui-header", { size: "large" }, "Books, from Open Library"),
      h("ui-form", { class: "find", value: this },
        h("ui-field", { label: "A book, by its title" },
          h("ui-input", { name: "search", icon: "search", placeholder: "Dune" })
        )
      ),
      this.showing ? [
        h("ui-button", {
          class: "back",
          appearance: "basic",
          icon: "arrow left",
          onClick: core.pressed(this, async () => (this.showing = undefined)),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Back"),
        this.showing?.drawPage()
      ] : core.drawRead(() => this.found, (book) => core.drawThing(book), {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Asking Open Library"),
        none: () => h("ui-text", "No book is called that."),
        failedSay: () => "Open Library can't be reached just now.",
        paging: () => "pages",
        items: () => h("ui-cards", { columns: "5", doubling: true })
      }),
      h("ui-text", { class: "credits", size: "small" },
        "From ",
        h("ui-link", { link: "https://openlibrary.org/developers/api" }, "Open Library's API"),
        ", asked for as you look;  its covers from its covers server."
      )
    ]
  }
}

core.heading("A book")
////////////
// ## A book
////////////
// Its cover, its title and who wrote it:  on its card, the first name the search gave;  on its own page, its first author, read from their own record.

core.heading("Who wrote it")
//# Who wrote it

// -----------
core.heading("Public Servers")
////////////////////
// ## Public Servers
////////////////////
// Servers other people run, each read through the Spell `spell place ingest` wrote for it, untouched:  each a page of its own.
// GitHub's is first, then Open Library's, then JSONPlaceholder's, which takes writes.

export class PublicServer extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "tab" is text
  static { this.declareProp("tab", { type: "text" }) }
  get tab() { return this.getProp("tab") }
  set tab(value) { this.setProp("tab", value) }

  // - its "library" is a new open library page
  static { this.declareProp("library", { init: () => new OpenLibraryPage(), early: true }) }
  get library() { return this.getProp("library") }
  set library(value) { this.setProp("library", value) }

  create() {
    this.tab = "github"
  }

  showServer(server) {
    this.tab = server
  }

  draw() {
    return [
      h("ui-toolbar", { class: "tabs", appearance: "secondary pointing", "aria-label": "Servers" },
        h("ui-item", {
          active: () => this.tab === "github",
          onClick: core.pressed(this, () => this.showServer("github")),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "GitHub"),
        h("ui-item", {
          active: () => this.tab === "open library",
          onClick: core.pressed(this, () => this.showServer("open library")),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Open Library"),
        h("ui-item", {
          active: () => this.tab === "jsonplaceholder",
          onClick: core.pressed(this, () => this.showServer("jsonplaceholder")),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "JSONPlaceholder")
      ),
      this.tab === "github" ? core.drawThing(new GithubPage()) : this.tab === "open library" ? core.drawThing(this.library) : this.tab === "jsonplaceholder" ? core.drawThing(new JsonplaceholderPage()) : undefined
    ]
  }
}
export const publicServers = new PublicServer()

core.heading("What a book can do, from anywhere")
// -----------
core.heading("GitHub")
////////////
// ## GitHub
////////////
// Who wrote Solid, its issues, and anyone on GitHub by their login.
// Every thing it shows is in GitHub.api.spell, as `spell place ingest` wrote it;  each type below adds to its type there,
// with `<spell-more-of>`, so looking again at the server never touches a line of this.
// A page in a browser holds no key:  it asks as anyone does, 60 times an hour, so it checks for changes every half hour.

export class GithubPage extends Thing {
  // - its "login" is text
  static { this.declareProp("login", { type: "text" }) }
  get login() { return this.getProp("login") }
  set login(value) { this.setProp("login", value) }

  create() {
    this.login = "ryansolid"
  }

  /** Whoever has that login:  GitHub finds them by it, with no list of everyone */
  static { this.declareProp("person", { declaredAt: { path: "/GitHub.spellml", start: 522, end: 660 }, readsFrom: ["github"] }) }
  get person() { return core.waitedValue(this, "person", async () => {
    return await core.savedThingWithId(User, this.login)
  }, () => [this.login]) }

  draw() {
    return [
      h("ui-header", { size: "large" }, "Solid, on GitHub"),
      h("ui-form", { class: "find", value: this },
        h("ui-field", { label: "Anyone on GitHub, by their login" },
          h("ui-input", { name: "login", icon: "search", placeholder: "ryansolid" })
        )
      ),
      h("slot", { name: "profile" }, () => this.drawProfile()),
      h("ui-header", { size: "medium" }, "Who wrote it"),
      core.drawRead(async () => await core.savedThings(Contributor, {}, "as drawn"), (contributor) => core.drawThing(contributor), {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Asking GitHub"),
        failedSay: () => "GitHub can't be reached just now.",
        items: () => h("ui-cards", { columns: "5", doubling: true })
      }),
      h("ui-header", { size: "medium" }, "Its issues"),
      core.drawRead(async () => await core.savedThings(Issue, {}, "as drawn"), (issue) => core.drawThing(issue), {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Asking GitHub"),
        failedSay: () => "GitHub can't be reached just now.",
        items: () => h("ui-cards", { columns: "2", doubling: true })
      }),
      h("ui-text", { class: "credits", size: "small" },
        "From ",
        h("ui-link", { link: "https://docs.github.com/en/rest" }, "GitHub's REST API"),
        ", asked for as you look."
      )
    ]
  }

  static drawsWaiting = true
  drawProfile() {
    if (this.person) return this.person?.drawCard()

    core.readRider("waiting", () => h("ui-loader", { visible: true, inline: true, text: true, part: "profile" }, "Asking GitHub"))
    core.readRider("failed", () => h("ui-text", { part: "profile" }, "Nobody on GitHub has that login."))
  }
}

core.heading("Someone on GitHub")
///////////////////////
// ## Someone on GitHub
///////////////////////
// Their picture, their name, and what they've made public.

core.heading("An issue")
//////////////
// ## An issue
//////////////
// Its number, its title, whose it is, and how much it's been talked about.

// -----------
core.heading("JSONPlaceholder:  posts and their comments, people, and their todos, on a server for practice")
///////////////////////////////////////////////////////////////////////////////////////////////////
// ## JSONPlaceholder:  posts and their comments, people, and their todos, on a server for practice
///////////////////////////////////////////////////////////////////////////////////////////////////
// A server other people run, and what it holds.  What's drawn from it is in JSONPlaceholder.spellml.
// `jsonplaceholder` is what this wrote, from looking at the server:
//   spell place ingest https://jsonplaceholder.typicode.com --into JSONPlaceholder.api.spell --name jsonplaceholder
//     --no-ai --try-writes --collections "posts=/posts,comments=/comments,users=/users,todos=/todos"
// `spell place update JSONPlaceholder.api.spell` looks again, and changes only this file and JSONPlaceholder.api.json5.
// It takes adding, changing and deleting, and answers as if each was saved, but keeps nothing:
// what you add is gone when it's read again (JSONPlaceholder.api.json5, its "write").

export class Post extends Thing {
  // - its "user id" is a number
  static { this.declareProp("userId", { type: "number", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1295, end: 1320 } }) }
  get userId() { return this.getProp("userId") }
  set userId(value) { this.setProp("userId", value) }

  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1324, end: 1343 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "body" is text
  static { this.declareProp("body", { type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1347, end: 1365 } }) }
  get body() { return this.getProp("body") }
  set body(value) { this.setProp("body", value) }

  // - its "comments" is a list of comments
  static { this.declareProp("comments", { itemType: "Comment", init: () => new List({ instanceType: "Comment" }), declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1369, end: 1405 } }) }
  get comments() { return core.linked(this, "comments", Comment) }
  set comments(value) { this.setProp("comments", value) }

  draw() {
    return [
      h("ui-header", { size: "small" }, () => this.title),
      h("ui-text", () => this.body),
      core.drawRead(() => this.comments, (comment) => core.drawThing(comment), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Asking for its comments") })
    ]
  }

  static savedIn = { place: "jsonplaceholder", collection: "posts" }
}

export class Comment extends Thing {
  // - its "post id" is a number
  static { this.declareProp("postId", { type: "number", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1465, end: 1490 } }) }
  get postId() { return this.getProp("postId") }
  set postId(value) { this.setProp("postId", value) }

  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1494, end: 1512 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "email" is text
  static { this.declareProp("email", { type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1516, end: 1535 } }) }
  get email() { return this.getProp("email") }
  set email(value) { this.setProp("email", value) }

  // - its "body" is text
  static { this.declareProp("body", { type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1539, end: 1557 } }) }
  get body() { return this.getProp("body") }
  set body(value) { this.setProp("body", value) }

  draw() {
    return h("ui-comment",
      h("ui-content",
        h("ui-author", () => this.email),
        h("ui-description", () => this.body)
      )
    )
  }

  static savedIn = { place: "jsonplaceholder", collection: "comments", select: ["name", "email", "body"] }
}

export class JsonplaceholderUser extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1630, end: 1648 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "username" is text
  static { this.declareProp("username", { type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1652, end: 1674 } }) }
  get username() { return this.getProp("username") }
  set username(value) { this.setProp("username", value) }

  // - its "email" is text
  static { this.declareProp("email", { type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1678, end: 1697 } }) }
  get email() { return this.getProp("email") }
  set email(value) { this.setProp("email", value) }

  // - its "address" is an address
  static { this.declareProp("address", { type: "Address", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1701, end: 1728 } }) }
  get address() { return this.getProp("address") }
  set address(value) { this.setProp("address", value) }

  // - its "phone" is text
  static { this.declareProp("phone", { type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1732, end: 1751 } }) }
  get phone() { return this.getProp("phone") }
  set phone(value) { this.setProp("phone", value) }

  // - its "website" is text
  static { this.declareProp("website", { type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1755, end: 1776 } }) }
  get website() { return this.getProp("website") }
  set website(value) { this.setProp("website", value) }

  // - its "company" is a company
  static { this.declareProp("company", { type: "Company", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1780, end: 1806 } }) }
  get company() { return this.getProp("company") }
  set company(value) { this.setProp("company", value) }

  // - its "posts" is a list of posts
  static { this.declareProp("posts", { itemType: "Post", init: () => new List({ instanceType: "Post" }), declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1810, end: 1840 } }) }
  get posts() { return core.linked(this, "posts", Post) }
  set posts(value) { this.setProp("posts", value) }

  // - its "todos" is a list of todos
  static { this.declareProp("todos", { itemType: "Todo", init: () => new List({ instanceType: "Todo" }), declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1844, end: 1874 } }) }
  get todos() { return core.linked(this, "todos", Todo) }
  set todos(value) { this.setProp("todos", value) }

  static savedIn = { place: "jsonplaceholder", collection: "jsonplaceholder_users", select: ["name", "email", "posts", "todos"] }
}

export class Todo extends Thing {
  // - its "user id" is a number
  static { this.declareProp("userId", { type: "number", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1931, end: 1956 } }) }
  get userId() { return this.getProp("userId") }
  set userId(value) { this.setProp("userId", value) }

  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1960, end: 1979 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "completed" is yes or no
  static { this.declareProp("completed", { type: "choice", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1983, end: 2011 } }) }
  get completed() { return this.getProp("completed") }
  set completed(value) { this.setProp("completed", value) }

  draw() {
    return h("ui-form", { class: "todo", value: this },
      h("ui-stack", { direction: "horizontal", align: "center" },
        h("ui-checkbox", { name: "completed", label: () => this.title }),
        h("ui-button", {
          class: "remove",
          icon: "close",
          size: "mini",
          appearance: "transparent",
          "aria-label": "Remove",
          title: "Remove",
          onClick: core.pressed(this, () => core.removeSaved(this)),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        })
      )
    )
  }

  static savedIn = { place: "jsonplaceholder", collection: "todos" }
}

export class Address extends Thing {
  // - its "street" is text
  static { this.declareProp("street", { type: "text" }) }
  get street() { return this.getProp("street") }
  set street(value) { this.setProp("street", value) }

  // - its "suite" is text
  static { this.declareProp("suite", { type: "text" }) }
  get suite() { return this.getProp("suite") }
  set suite(value) { this.setProp("suite", value) }

  // - its "city" is text
  static { this.declareProp("city", { type: "text" }) }
  get city() { return this.getProp("city") }
  set city(value) { this.setProp("city", value) }

  // - its "zipcode" is text
  static { this.declareProp("zipcode", { type: "text" }) }
  get zipcode() { return this.getProp("zipcode") }
  set zipcode(value) { this.setProp("zipcode", value) }

  // - its "geo" is a geo
  static { this.declareProp("geo", { type: "Geo" }) }
  get geo() { return this.getProp("geo") }
  set geo(value) { this.setProp("geo", value) }
}

export class Geo extends Thing {
  // - its "lat" is a number
  static { this.declareProp("lat", { type: "number" }) }
  get lat() { return this.getProp("lat") }
  set lat(value) { this.setProp("lat", value) }

  // - its "lng" is a number
  static { this.declareProp("lng", { type: "number" }) }
  get lng() { return this.getProp("lng") }
  set lng(value) { this.setProp("lng", value) }
}

export class Company extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "catch phrase" is text
  static { this.declareProp("catchPhrase", { type: "text" }) }
  get catchPhrase() { return this.getProp("catchPhrase") }
  set catchPhrase(value) { this.setProp("catchPhrase", value) }

  // - its "bs" is text
  static { this.declareProp("bs", { type: "text" }) }
  get bs() { return this.getProp("bs") }
  set bs(value) { this.setProp("bs", value) }
}

export class Jsonplaceholder extends Place {}
export const jsonplaceholder = core.place(new Jsonplaceholder(), {
  name: "jsonplaceholder",
  kind: "web server",
  at: "https://jsonplaceholder.typicode.com",
  checkedEvery: 30,
  searches: { param: "q", fields: ["names", "titles"] },
  collections: {
    posts: { at: "/posts" },
    comments: { at: "/comments" },
    jsonplaceholderUsers: { at: "/users" },
    todos: { at: "/todos" }
  },
  listsUnder: { posts: { comments: "/posts/{id}/comments" }, jsonplaceholderUsers: { posts: "/users/{id}/posts", todos: "/users/{id}/todos" } }
})

// -----------
core.heading("JSONPlaceholder")
/////////////////////
// ## JSONPlaceholder
/////////////////////
// A server for practice:  someone's todos to tick, add and remove, and posts with their comments.
// Every thing it shows is in JSONPlaceholder.api.spell, as `spell place ingest` wrote it;  each type below adds to its type there,
// with `<spell-more-of>`, so looking again at the server never touches a line of this.
// It answers each change as if it saved it, and keeps nothing:  what you add here is gone when it's asked again.

export class JsonplaceholderPage extends Thing {
  // - its "new todo" is a new todo with user id = 1
  static { this.declareProp("newTodo", { init: () => new Todo({ userId: 1 }), early: true }) }
  get newTodo() { return core.linked(this, "newTodo", Todo) }
  set newTodo(value) { this.setProp("newTodo", value) }

  /** Whose todos and posts these are:  the first person it has */
  static { this.declareProp("person", { declaredAt: { path: "/JSONPlaceholder.spellml", start: 547, end: 676 }, readsFrom: ["jsonplaceholder"] }) }
  get person() { return core.waitedValue(this, "person", async () => {
    return await core.savedThingWithId(JsonplaceholderUser, 1)
  }) }

  /** Theirs, from every todo */
  static { this.declareProp("todos", { declaredAt: { path: "/JSONPlaceholder.spellml", start: 689, end: 778 }, readsFrom: ["jsonplaceholder"] }) }
  get todos() { return core.waitedValue(this, "todos", async () => {
    return await core.savedThings(Todo, { filter: { userId: 1 } })
  }) }

  async addTheNewTodo() {
    core.saveThing(await core.answerOf(this, "newTodo"))
    this.newTodo = new Todo({ userId: 1 })
  }

  draw() {
    return [
      h("ui-header", { size: "large" }, "Practice, on JSONPlaceholder"),
      h("ui-text", { color: "grey" },
        "Tick a todo, add one, remove one:  each goes to the server, which answers as if it saved it, and keeps nothing."
      ),
      h("ui-header", { size: "medium" }, "Their todos"),
      h("slot", { name: "checklist" }, () => this.drawChecklist()),
      h("ui-header", { size: "medium" }, "What they wrote"),
      core.drawRead(() => this.person?.posts, (post) => core.drawThing(post), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Asking JSONPlaceholder"), failedSay: () => "JSONPlaceholder can't be reached just now." }),
      h("ui-text", { class: "credits", size: "small" },
        "From ",
        h("ui-link", { link: "https://jsonplaceholder.typicode.com" }, "JSONPlaceholder"),
        ", asked for as you look."
      )
    ]
  }

  static drawsWaiting = true
  drawChecklist() {
    return [
      h("ui-form", { class: "new-todo", "prop:value": () => this.newTodo },
        h("ui-field", { label: "Something to do" },
          h("ui-input", { name: "title", placeholder: "Water the plants" })
        )
      ),
      h("ui-button", {
        class: "add",
        size: "small",
        color: "primary",
        disabled: () => this.newTodo.title === "",
        onClick: core.pressed(this, async () => await this.addTheNewTodo()),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      }, "Add"),
      core.drawRead(() => this.todos, (todo) => core.drawThing(todo), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "checklist" },
        "Asking JSONPlaceholder"
      ), failedSay: () => "JSONPlaceholder can't be reached just now." })
    ]
  }
}

core.heading("A todo")
////////////
// ## A todo
////////////
// Ticked as it's done;  each tick, and each removal, goes to the server at once.

core.heading("A post")
////////////
// ## A post
////////////
// Its title, what it says, and its comments:  read from the post's own address, the first time it's drawn.

// Each comment, as Spell UI draws one:  named in full, `<ui-comment>`, as `<comment>` is a comment in spellml.

// -----------
core.installStyles(undefined, `.person image {¬  aspect-ratio: 1;¬}¬¬.book image {¬  aspect-ratio: 2 / 3;¬  object-fit: cover;¬}¬¬.book-page .cover {¬  max-width: 16rem;¬}¬`)
// -----------
if (!core.isCarryingOver) publicServers.start()
