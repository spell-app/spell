import { core, Thing, List, App, Place, h } from "@spell/core"

export class Issue extends Thing {
  static { this.declareProp("url", { type: "Issue", link: true }) }
  get url() { return core.linked(this, "url", Issue) }
  set url(value) { this.setProp("url", value) }

  static { this.declareProp("repositoryUrl", { type: "text" }) }
  get repositoryUrl() { return this.getProp("repositoryUrl") }
  set repositoryUrl(value) { this.setProp("repositoryUrl", value) }

  static { this.declareProp("labelsUrl", { type: "text" }) }
  get labelsUrl() { return this.getProp("labelsUrl") }
  set labelsUrl(value) { this.setProp("labelsUrl", value) }

  static { this.declareProp("commentsUrl", { type: "text" }) }
  get commentsUrl() { return this.getProp("commentsUrl") }
  set commentsUrl(value) { this.setProp("commentsUrl", value) }

  static { this.declareProp("eventsUrl", { type: "text" }) }
  get eventsUrl() { return this.getProp("eventsUrl") }
  set eventsUrl(value) { this.setProp("eventsUrl", value) }

  static { this.declareProp("htmlUrl", { type: "text" }) }
  get htmlUrl() { return this.getProp("htmlUrl") }
  set htmlUrl(value) { this.setProp("htmlUrl", value) }

  static { this.declareProp("nodeId", { type: "text" }) }
  get nodeId() { return this.getProp("nodeId") }
  set nodeId(value) { this.setProp("nodeId", value) }

  static { this.declareProp("number", { type: "number" }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  static { this.declareProp("title", { type: "text" }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  static { this.declareProp("user", { type: "IssueUser" }) }
  get user() { return this.getProp("user") }
  set user(value) { this.setProp("user", value) }

  static { this.declareProp("labels", { itemType: "Label", init: () => new List({ instanceType: "Label" }) }) }
  get labels() { return this.getProp("labels") }
  set labels(value) { this.setProp("labels", value) }

  static { this.declareProp("state", { type: "text" }) }
  get state() { return this.getProp("state") }
  set state(value) { this.setProp("state", value) }

  static { this.declareProp("locked", { type: "choice" }) }
  get locked() { return this.getProp("locked") }
  set locked(value) { this.setProp("locked", value) }

  static { this.declareProp("assignees", { itemType: "Assignee", init: () => new List({ instanceType: "Assignee" }) }) }
  get assignees() { return this.getProp("assignees") }
  set assignees(value) { this.setProp("assignees", value) }

  static { this.declareProp("comments", { type: "number" }) }
  get comments() { return this.getProp("comments") }
  set comments(value) { this.setProp("comments", value) }

  static { this.declareProp("createdAt", { type: "date" }) }
  get createdAt() { return this.getProp("createdAt") }
  set createdAt(value) { this.setProp("createdAt", value) }

  static { this.declareProp("updatedAt", { type: "date" }) }
  get updatedAt() { return this.getProp("updatedAt") }
  set updatedAt(value) { this.setProp("updatedAt", value) }

  static { this.declareProp("authorAssociation", { type: "text" }) }
  get authorAssociation() { return this.getProp("authorAssociation") }
  set authorAssociation(value) { this.setProp("authorAssociation", value) }

  static { this.declareProp("issueFieldValues", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get issueFieldValues() { return this.getProp("issueFieldValues") }
  set issueFieldValues(value) { this.setProp("issueFieldValues", value) }

  static { this.declareProp("subIssuesSummary", { type: "SubIssuesSummary" }) }
  get subIssuesSummary() { return this.getProp("subIssuesSummary") }
  set subIssuesSummary(value) { this.setProp("subIssuesSummary", value) }

  static { this.declareProp("issueDependenciesSummary", { type: "IssueDependenciesSummary" }) }
  get issueDependenciesSummary() { return this.getProp("issueDependenciesSummary") }
  set issueDependenciesSummary(value) { this.setProp("issueDependenciesSummary", value) }

  static { this.declareProp("body", { type: "text" }) }
  get body() { return this.getProp("body") }
  set body(value) { this.setProp("body", value) }

  static { this.declareProp("reactions", { type: "Reaction" }) }
  get reactions() { return this.getProp("reactions") }
  set reactions(value) { this.setProp("reactions", value) }

  static { this.declareProp("timelineUrl", { type: "text" }) }
  get timelineUrl() { return this.getProp("timelineUrl") }
  set timelineUrl(value) { this.setProp("timelineUrl", value) }

  static { this.declareProp("performedViaGithubApp", { type: "PerformedViaGithubApp" }) }
  get performedViaGithubApp() { return this.getProp("performedViaGithubApp") }
  set performedViaGithubApp(value) { this.setProp("performedViaGithubApp", value) }

  static { this.declareProp("stateReason", { type: "text" }) }
  get stateReason() { return this.getProp("stateReason") }
  set stateReason(value) { this.setProp("stateReason", value) }

  static { this.declareProp("draft", { type: "choice" }) }
  get draft() { return this.getProp("draft") }
  set draft(value) { this.setProp("draft", value) }

  static { this.declareProp("pullRequest", { type: "PullRequest" }) }
  get pullRequest() { return this.getProp("pullRequest") }
  set pullRequest(value) { this.setProp("pullRequest", value) }

  static { this.declareProp("assignee", { type: "Assignee" }) }
  get assignee() { return this.getProp("assignee") }
  set assignee(value) { this.setProp("assignee", value) }

  draw() {
    return h("ui-card",
      h("ui-content",
        h("ui-header",
          () => this.title,
          h("ui-link", { link: () => this.htmlUrl, target: "_blank", "aria-label": "On GitHub" },
            h("ui-icon", { name: "github" })
          )
        ),
        h("ui-meta", "#", () => this.number, " · ", () => this.state)
      )
    )
  }

  static savedIn = {
    place: "github",
    collection: "issues",
    times: ["created", "modified"], select: ["htmlUrl", "number", "title", "state", "comments", "createdAt", "body", "pullRequest"] }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Contributor extends Thing {
  static { this.declareProp("login", { type: "text" }) }
  get login() { return this.getProp("login") }
  set login(value) { this.setProp("login", value) }

  static { this.declareProp("nodeId", { type: "text" }) }
  get nodeId() { return this.getProp("nodeId") }
  set nodeId(value) { this.setProp("nodeId", value) }

  static { this.declareProp("avatarUrl", { type: "text" }) }
  get avatarUrl() { return this.getProp("avatarUrl") }
  set avatarUrl(value) { this.setProp("avatarUrl", value) }

  static { this.declareProp("gravatarId", { type: "text" }) }
  get gravatarId() { return this.getProp("gravatarId") }
  set gravatarId(value) { this.setProp("gravatarId", value) }

  static { this.declareProp("url", { type: "text" }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  static { this.declareProp("htmlUrl", { type: "text" }) }
  get htmlUrl() { return this.getProp("htmlUrl") }
  set htmlUrl(value) { this.setProp("htmlUrl", value) }

  static { this.declareProp("followersUrl", { type: "text" }) }
  get followersUrl() { return this.getProp("followersUrl") }
  set followersUrl(value) { this.setProp("followersUrl", value) }

  static { this.declareProp("followingUrl", { type: "text" }) }
  get followingUrl() { return this.getProp("followingUrl") }
  set followingUrl(value) { this.setProp("followingUrl", value) }

  static { this.declareProp("gistsUrl", { type: "text" }) }
  get gistsUrl() { return this.getProp("gistsUrl") }
  set gistsUrl(value) { this.setProp("gistsUrl", value) }

  static { this.declareProp("starredUrl", { type: "text" }) }
  get starredUrl() { return this.getProp("starredUrl") }
  set starredUrl(value) { this.setProp("starredUrl", value) }

  static { this.declareProp("subscriptionsUrl", { type: "text" }) }
  get subscriptionsUrl() { return this.getProp("subscriptionsUrl") }
  set subscriptionsUrl(value) { this.setProp("subscriptionsUrl", value) }

  static { this.declareProp("organizationsUrl", { type: "text" }) }
  get organizationsUrl() { return this.getProp("organizationsUrl") }
  set organizationsUrl(value) { this.setProp("organizationsUrl", value) }

  static { this.declareProp("reposUrl", { type: "text" }) }
  get reposUrl() { return this.getProp("reposUrl") }
  set reposUrl(value) { this.setProp("reposUrl", value) }

  static { this.declareProp("eventsUrl", { type: "text" }) }
  get eventsUrl() { return this.getProp("eventsUrl") }
  set eventsUrl(value) { this.setProp("eventsUrl", value) }

  static { this.declareProp("receivedEventsUrl", { type: "text" }) }
  get receivedEventsUrl() { return this.getProp("receivedEventsUrl") }
  set receivedEventsUrl(value) { this.setProp("receivedEventsUrl", value) }

  static { this.declareProp("kind", { type: "text", storedAs: "type" }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  static { this.declareProp("userViewType", { type: "text" }) }
  get userViewType() { return this.getProp("userViewType") }
  set userViewType(value) { this.setProp("userViewType", value) }

  static { this.declareProp("siteAdmin", { type: "choice" }) }
  get siteAdmin() { return this.getProp("siteAdmin") }
  set siteAdmin(value) { this.setProp("siteAdmin", value) }

  static { this.declareProp("contributions", { type: "number" }) }
  get contributions() { return this.getProp("contributions") }
  set contributions(value) { this.setProp("contributions", value) }

  static savedIn = {
    place: "github",
    collection: "contributors",
    times: ["created", "modified"], select: ["login", "avatarUrl", "htmlUrl", "kind"] }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class User extends Thing {
  static { this.declareProp("login", { type: "text" }) }
  get login() { return this.getProp("login") }
  set login(value) { this.setProp("login", value) }

  static { this.declareProp("number", { type: "number", storedAs: "id" }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  static { this.declareProp("nodeId", { type: "text" }) }
  get nodeId() { return this.getProp("nodeId") }
  set nodeId(value) { this.setProp("nodeId", value) }

  static { this.declareProp("avatarUrl", { type: "text" }) }
  get avatarUrl() { return this.getProp("avatarUrl") }
  set avatarUrl(value) { this.setProp("avatarUrl", value) }

  static { this.declareProp("gravatarId", { type: "text" }) }
  get gravatarId() { return this.getProp("gravatarId") }
  set gravatarId(value) { this.setProp("gravatarId", value) }

  static { this.declareProp("url", { type: "text" }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  static { this.declareProp("htmlUrl", { type: "text" }) }
  get htmlUrl() { return this.getProp("htmlUrl") }
  set htmlUrl(value) { this.setProp("htmlUrl", value) }

  static { this.declareProp("followersUrl", { type: "text" }) }
  get followersUrl() { return this.getProp("followersUrl") }
  set followersUrl(value) { this.setProp("followersUrl", value) }

  static { this.declareProp("followingUrl", { type: "text" }) }
  get followingUrl() { return this.getProp("followingUrl") }
  set followingUrl(value) { this.setProp("followingUrl", value) }

  static { this.declareProp("gistsUrl", { type: "text" }) }
  get gistsUrl() { return this.getProp("gistsUrl") }
  set gistsUrl(value) { this.setProp("gistsUrl", value) }

  static { this.declareProp("starredUrl", { type: "text" }) }
  get starredUrl() { return this.getProp("starredUrl") }
  set starredUrl(value) { this.setProp("starredUrl", value) }

  static { this.declareProp("subscriptionsUrl", { type: "text" }) }
  get subscriptionsUrl() { return this.getProp("subscriptionsUrl") }
  set subscriptionsUrl(value) { this.setProp("subscriptionsUrl", value) }

  static { this.declareProp("organizationsUrl", { type: "text" }) }
  get organizationsUrl() { return this.getProp("organizationsUrl") }
  set organizationsUrl(value) { this.setProp("organizationsUrl", value) }

  static { this.declareProp("reposUrl", { type: "text" }) }
  get reposUrl() { return this.getProp("reposUrl") }
  set reposUrl(value) { this.setProp("reposUrl", value) }

  static { this.declareProp("eventsUrl", { type: "text" }) }
  get eventsUrl() { return this.getProp("eventsUrl") }
  set eventsUrl(value) { this.setProp("eventsUrl", value) }

  static { this.declareProp("receivedEventsUrl", { type: "text" }) }
  get receivedEventsUrl() { return this.getProp("receivedEventsUrl") }
  set receivedEventsUrl(value) { this.setProp("receivedEventsUrl", value) }

  static { this.declareProp("kind", { type: "text", storedAs: "type" }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  static { this.declareProp("userViewType", { type: "text" }) }
  get userViewType() { return this.getProp("userViewType") }
  set userViewType(value) { this.setProp("userViewType", value) }

  static { this.declareProp("siteAdmin", { type: "choice" }) }
  get siteAdmin() { return this.getProp("siteAdmin") }
  set siteAdmin(value) { this.setProp("siteAdmin", value) }

  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("company", { type: "text" }) }
  get company() { return this.getProp("company") }
  set company(value) { this.setProp("company", value) }

  static { this.declareProp("blog", { type: "text" }) }
  get blog() { return this.getProp("blog") }
  set blog(value) { this.setProp("blog", value) }

  static { this.declareProp("location", { type: "text" }) }
  get location() { return this.getProp("location") }
  set location(value) { this.setProp("location", value) }

  static { this.declareProp("email", { type: "text" }) }
  get email() { return this.getProp("email") }
  set email(value) { this.setProp("email", value) }

  static { this.declareProp("twitterUsername", { type: "text" }) }
  get twitterUsername() { return this.getProp("twitterUsername") }
  set twitterUsername(value) { this.setProp("twitterUsername", value) }

  static { this.declareProp("publicRepos", { type: "number" }) }
  get publicRepos() { return this.getProp("publicRepos") }
  set publicRepos(value) { this.setProp("publicRepos", value) }

  static { this.declareProp("publicGists", { type: "number" }) }
  get publicGists() { return this.getProp("publicGists") }
  set publicGists(value) { this.setProp("publicGists", value) }

  static { this.declareProp("followers", { type: "number" }) }
  get followers() { return this.getProp("followers") }
  set followers(value) { this.setProp("followers", value) }

  static { this.declareProp("following", { type: "number" }) }
  get following() { return this.getProp("following") }
  set following(value) { this.setProp("following", value) }

  static { this.declareProp("createdAt", { type: "date" }) }
  get createdAt() { return this.getProp("createdAt") }
  set createdAt(value) { this.setProp("createdAt", value) }

  static { this.declareProp("updatedAt", { type: "date" }) }
  get updatedAt() { return this.getProp("updatedAt") }
  set updatedAt(value) { this.setProp("updatedAt", value) }

  static { this.declareProp("bio", { type: "text" }) }
  get bio() { return this.getProp("bio") }
  set bio(value) { this.setProp("bio", value) }

  async lookAtUser() {
    publicServers.github.showing = this
  }

  async lookAwayFromUser() {
    publicServers.github.showing = undefined
  }

  draw() {
    return h("ui-card", {
      onClick: core.pressed(this, async () => await this.lookAtUser()),
      style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
    },
      h("ui-content",
        h("ui-stack", { direction: "horizontal", align: "center", spacing: "sm" },
          h("ui-image", { src: () => this.avatarUrl, alt: "", size: "mini", appearance: "circular" }),
          h("ui-stack", { spacing: "none", align: "start" },
            h("ui-header",
              () => this.login,
              h("ui-link", { link: () => this.htmlUrl, target: "_blank", "aria-label": "On GitHub" },
                h("ui-icon", { name: "github" })
              )
            ),
            h("ui-meta", () => this.kind)
          )
        )
      )
    )
  }

  drawPage() {
    return h("ui-stack", { spacing: "xl", part: "page" },
      h("ui-stack", { direction: "horizontal", align: "center", spacing: "sm" },
        h("ui-button", {
          icon: "arrow left",
          appearance: "basic",
          "aria-label": "Back",
          title: "Back",
          onClick: core.pressed(this, async () => await this.lookAwayFromUser()),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }),
        h("ui-header", { size: "large" },
          () => this.name ? this.name : this.login,
          h("ui-link", { link: () => this.htmlUrl, target: "_blank", "aria-label": "On GitHub" },
            h("ui-icon", { name: "github" })
          )
        )
      ),
      h("ui-stack", { direction: "horizontal", wrap: true, align: "start", spacing: "md" },
        h("ui-image", { src: () => this.avatarUrl, alt: "", size: "small", appearance: "rounded" }),
        h("ui-stack", { spacing: "sm" },
          h("ui-text", { color: "grey" }, () => this.login, " · ", () => this.kind),
          () => core.drawIf(() => this.bio, () => [h("ui-text", () => this.bio)]),
          () => core.drawIf(() => core.dateShown(this.createdAt), () => [
            h("ui-text", { size: "small", color: "grey" },
              () => this.publicRepos,
              " public repositories · ",
              () => this.followers,
              " followers"
            )
          ])
        )
      ),
      h("ui-stack", { spacing: "sm" },
        h("ui-header", { size: "medium" }, "Most popular"),
        () => core.drawRead(async () => await core.savedThings(Repository, { search: { "*": `user:${this.login} sort:stars` } }, "as drawn"), (repository) => core.drawThing(repository), {
          waitingSay: () => "Asking GitHub",
          none: () => h("ui-text", { part: "page" }, "Nothing public yet."),
          paging: () => "pages",
          items: () => h("ui-cards", { columns: "3", doubling: true, stackable: true, part: "page" })
        })
      )
    )
  }

  static savedIn = {
    place: "github",
    collection: "users",
    times: ["created", "modified"], select: ["login", "number", "avatarUrl", "htmlUrl", "kind", "name", "email", "publicRepos", "followers", "createdAt", "bio"] }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}
core.describeAction(User, "lookAtUser", { title: "Look at It", undoneAs: "Look at It" })
core.describeAction(User, "lookAwayFromUser", { title: "Look Away from It", undoneAs: "Look Away from It" })

export class IssueUser extends Thing {
  static { this.declareProp("login", { type: "text" }) }
  get login() { return this.getProp("login") }
  set login(value) { this.setProp("login", value) }

  static { this.declareProp("number", { type: "number", storedAs: "id" }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  static { this.declareProp("nodeId", { type: "text" }) }
  get nodeId() { return this.getProp("nodeId") }
  set nodeId(value) { this.setProp("nodeId", value) }

  static { this.declareProp("avatarUrl", { type: "text" }) }
  get avatarUrl() { return this.getProp("avatarUrl") }
  set avatarUrl(value) { this.setProp("avatarUrl", value) }

  static { this.declareProp("gravatarId", { type: "text" }) }
  get gravatarId() { return this.getProp("gravatarId") }
  set gravatarId(value) { this.setProp("gravatarId", value) }

  static { this.declareProp("url", { type: "text" }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  static { this.declareProp("htmlUrl", { type: "text" }) }
  get htmlUrl() { return this.getProp("htmlUrl") }
  set htmlUrl(value) { this.setProp("htmlUrl", value) }

  static { this.declareProp("followersUrl", { type: "text" }) }
  get followersUrl() { return this.getProp("followersUrl") }
  set followersUrl(value) { this.setProp("followersUrl", value) }

  static { this.declareProp("followingUrl", { type: "text" }) }
  get followingUrl() { return this.getProp("followingUrl") }
  set followingUrl(value) { this.setProp("followingUrl", value) }

  static { this.declareProp("gistsUrl", { type: "text" }) }
  get gistsUrl() { return this.getProp("gistsUrl") }
  set gistsUrl(value) { this.setProp("gistsUrl", value) }

  static { this.declareProp("starredUrl", { type: "text" }) }
  get starredUrl() { return this.getProp("starredUrl") }
  set starredUrl(value) { this.setProp("starredUrl", value) }

  static { this.declareProp("subscriptionsUrl", { type: "text" }) }
  get subscriptionsUrl() { return this.getProp("subscriptionsUrl") }
  set subscriptionsUrl(value) { this.setProp("subscriptionsUrl", value) }

  static { this.declareProp("organizationsUrl", { type: "text" }) }
  get organizationsUrl() { return this.getProp("organizationsUrl") }
  set organizationsUrl(value) { this.setProp("organizationsUrl", value) }

  static { this.declareProp("reposUrl", { type: "text" }) }
  get reposUrl() { return this.getProp("reposUrl") }
  set reposUrl(value) { this.setProp("reposUrl", value) }

  static { this.declareProp("eventsUrl", { type: "text" }) }
  get eventsUrl() { return this.getProp("eventsUrl") }
  set eventsUrl(value) { this.setProp("eventsUrl", value) }

  static { this.declareProp("receivedEventsUrl", { type: "text" }) }
  get receivedEventsUrl() { return this.getProp("receivedEventsUrl") }
  set receivedEventsUrl(value) { this.setProp("receivedEventsUrl", value) }

  static { this.declareProp("kind", { type: "text", storedAs: "type" }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  static { this.declareProp("userViewType", { type: "text" }) }
  get userViewType() { return this.getProp("userViewType") }
  set userViewType(value) { this.setProp("userViewType", value) }

  static { this.declareProp("siteAdmin", { type: "choice" }) }
  get siteAdmin() { return this.getProp("siteAdmin") }
  set siteAdmin(value) { this.setProp("siteAdmin", value) }
}

export class Label extends Thing {
  static { this.declareProp("number", { type: "number", storedAs: "id" }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  static { this.declareProp("nodeId", { type: "text" }) }
  get nodeId() { return this.getProp("nodeId") }
  set nodeId(value) { this.setProp("nodeId", value) }

  static { this.declareProp("url", { type: "text" }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("color", { type: "text" }) }
  get color() { return this.getProp("color") }
  set color(value) { this.setProp("color", value) }

  static { this.declareProp("default", { type: "choice" }) }
  get default() { return this.getProp("default") }
  set default(value) { this.setProp("default", value) }

  static { this.declareProp("description", { type: "text" }) }
  get description() { return this.getProp("description") }
  set description(value) { this.setProp("description", value) }
}

export class SubIssuesSummary extends Thing {
  static { this.declareProp("total", { type: "number" }) }
  get total() { return this.getProp("total") }
  set total(value) { this.setProp("total", value) }

  static { this.declareProp("completed", { type: "number" }) }
  get completed() { return this.getProp("completed") }
  set completed(value) { this.setProp("completed", value) }

  static { this.declareProp("percentCompleted", { type: "number" }) }
  get percentCompleted() { return this.getProp("percentCompleted") }
  set percentCompleted(value) { this.setProp("percentCompleted", value) }
}

export class IssueDependenciesSummary extends Thing {
  static { this.declareProp("blockedBy", { type: "number" }) }
  get blockedBy() { return this.getProp("blockedBy") }
  set blockedBy(value) { this.setProp("blockedBy", value) }

  static { this.declareProp("totalBlockedBy", { type: "number" }) }
  get totalBlockedBy() { return this.getProp("totalBlockedBy") }
  set totalBlockedBy(value) { this.setProp("totalBlockedBy", value) }

  static { this.declareProp("blocking", { type: "number" }) }
  get blocking() { return this.getProp("blocking") }
  set blocking(value) { this.setProp("blocking", value) }

  static { this.declareProp("totalBlocking", { type: "number" }) }
  get totalBlocking() { return this.getProp("totalBlocking") }
  set totalBlocking(value) { this.setProp("totalBlocking", value) }
}

export class Reaction extends Thing {
  static { this.declareProp("url", { type: "text" }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  static { this.declareProp("totalCount", { type: "number" }) }
  get totalCount() { return this.getProp("totalCount") }
  set totalCount(value) { this.setProp("totalCount", value) }

  static { this.declareProp("laugh", { type: "number" }) }
  get laugh() { return this.getProp("laugh") }
  set laugh(value) { this.setProp("laugh", value) }

  static { this.declareProp("hooray", { type: "number" }) }
  get hooray() { return this.getProp("hooray") }
  set hooray(value) { this.setProp("hooray", value) }

  static { this.declareProp("confused", { type: "number" }) }
  get confused() { return this.getProp("confused") }
  set confused(value) { this.setProp("confused", value) }

  static { this.declareProp("heart", { type: "number" }) }
  get heart() { return this.getProp("heart") }
  set heart(value) { this.setProp("heart", value) }

  static { this.declareProp("rocket", { type: "number" }) }
  get rocket() { return this.getProp("rocket") }
  set rocket(value) { this.setProp("rocket", value) }

  static { this.declareProp("eyes", { type: "number" }) }
  get eyes() { return this.getProp("eyes") }
  set eyes(value) { this.setProp("eyes", value) }
}

export class PerformedViaGithubApp extends Thing {
  static { this.declareProp("number", { type: "number", storedAs: "id" }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  static { this.declareProp("clientId", { type: "text" }) }
  get clientId() { return this.getProp("clientId") }
  set clientId(value) { this.setProp("clientId", value) }

  static { this.declareProp("slug", { type: "text" }) }
  get slug() { return this.getProp("slug") }
  set slug(value) { this.setProp("slug", value) }

  static { this.declareProp("nodeId", { type: "text" }) }
  get nodeId() { return this.getProp("nodeId") }
  set nodeId(value) { this.setProp("nodeId", value) }

  static { this.declareProp("owner", { type: "Owner" }) }
  get owner() { return this.getProp("owner") }
  set owner(value) { this.setProp("owner", value) }

  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("description", { type: "text" }) }
  get description() { return this.getProp("description") }
  set description(value) { this.setProp("description", value) }

  static { this.declareProp("externalUrl", { type: "text" }) }
  get externalUrl() { return this.getProp("externalUrl") }
  set externalUrl(value) { this.setProp("externalUrl", value) }

  static { this.declareProp("htmlUrl", { type: "text" }) }
  get htmlUrl() { return this.getProp("htmlUrl") }
  set htmlUrl(value) { this.setProp("htmlUrl", value) }

  static { this.declareProp("createdAt", { type: "date" }) }
  get createdAt() { return this.getProp("createdAt") }
  set createdAt(value) { this.setProp("createdAt", value) }

  static { this.declareProp("updatedAt", { type: "date" }) }
  get updatedAt() { return this.getProp("updatedAt") }
  set updatedAt(value) { this.setProp("updatedAt", value) }

  static { this.declareProp("permissions", { type: "Permission" }) }
  get permissions() { return this.getProp("permissions") }
  set permissions(value) { this.setProp("permissions", value) }

  static { this.declareProp("events", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get events() { return this.getProp("events") }
  set events(value) { this.setProp("events", value) }
}

export class Owner extends Thing {
  static { this.declareProp("login", { type: "text" }) }
  get login() { return this.getProp("login") }
  set login(value) { this.setProp("login", value) }

  static { this.declareProp("number", { type: "number", storedAs: "id" }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  static { this.declareProp("nodeId", { type: "text" }) }
  get nodeId() { return this.getProp("nodeId") }
  set nodeId(value) { this.setProp("nodeId", value) }

  static { this.declareProp("avatarUrl", { type: "text" }) }
  get avatarUrl() { return this.getProp("avatarUrl") }
  set avatarUrl(value) { this.setProp("avatarUrl", value) }

  static { this.declareProp("gravatarId", { type: "text" }) }
  get gravatarId() { return this.getProp("gravatarId") }
  set gravatarId(value) { this.setProp("gravatarId", value) }

  static { this.declareProp("url", { type: "text" }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  static { this.declareProp("htmlUrl", { type: "text" }) }
  get htmlUrl() { return this.getProp("htmlUrl") }
  set htmlUrl(value) { this.setProp("htmlUrl", value) }

  static { this.declareProp("followersUrl", { type: "text" }) }
  get followersUrl() { return this.getProp("followersUrl") }
  set followersUrl(value) { this.setProp("followersUrl", value) }

  static { this.declareProp("followingUrl", { type: "text" }) }
  get followingUrl() { return this.getProp("followingUrl") }
  set followingUrl(value) { this.setProp("followingUrl", value) }

  static { this.declareProp("gistsUrl", { type: "text" }) }
  get gistsUrl() { return this.getProp("gistsUrl") }
  set gistsUrl(value) { this.setProp("gistsUrl", value) }

  static { this.declareProp("starredUrl", { type: "text" }) }
  get starredUrl() { return this.getProp("starredUrl") }
  set starredUrl(value) { this.setProp("starredUrl", value) }

  static { this.declareProp("subscriptionsUrl", { type: "text" }) }
  get subscriptionsUrl() { return this.getProp("subscriptionsUrl") }
  set subscriptionsUrl(value) { this.setProp("subscriptionsUrl", value) }

  static { this.declareProp("organizationsUrl", { type: "text" }) }
  get organizationsUrl() { return this.getProp("organizationsUrl") }
  set organizationsUrl(value) { this.setProp("organizationsUrl", value) }

  static { this.declareProp("reposUrl", { type: "text" }) }
  get reposUrl() { return this.getProp("reposUrl") }
  set reposUrl(value) { this.setProp("reposUrl", value) }

  static { this.declareProp("eventsUrl", { type: "text" }) }
  get eventsUrl() { return this.getProp("eventsUrl") }
  set eventsUrl(value) { this.setProp("eventsUrl", value) }

  static { this.declareProp("receivedEventsUrl", { type: "text" }) }
  get receivedEventsUrl() { return this.getProp("receivedEventsUrl") }
  set receivedEventsUrl(value) { this.setProp("receivedEventsUrl", value) }

  static { this.declareProp("kind", { type: "text", storedAs: "type" }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  static { this.declareProp("userViewType", { type: "text" }) }
  get userViewType() { return this.getProp("userViewType") }
  set userViewType(value) { this.setProp("userViewType", value) }

  static { this.declareProp("siteAdmin", { type: "choice" }) }
  get siteAdmin() { return this.getProp("siteAdmin") }
  set siteAdmin(value) { this.setProp("siteAdmin", value) }
}

export class Permission extends Thing {
  static { this.declareProp("actions", { type: "text" }) }
  get actions() { return this.getProp("actions") }
  set actions(value) { this.setProp("actions", value) }

  static { this.declareProp("administration", { type: "text" }) }
  get administration() { return this.getProp("administration") }
  set administration(value) { this.setProp("administration", value) }

  static { this.declareProp("checks", { type: "text" }) }
  get checks() { return this.getProp("checks") }
  set checks(value) { this.setProp("checks", value) }

  static { this.declareProp("contents", { type: "text" }) }
  get contents() { return this.getProp("contents") }
  set contents(value) { this.setProp("contents", value) }

  static { this.declareProp("discussions", { type: "text" }) }
  get discussions() { return this.getProp("discussions") }
  set discussions(value) { this.setProp("discussions", value) }

  static { this.declareProp("issues", { type: "text" }) }
  get issues() { return this.getProp("issues") }
  set issues(value) { this.setProp("issues", value) }

  static { this.declareProp("members", { type: "text" }) }
  get members() { return this.getProp("members") }
  set members(value) { this.setProp("members", value) }

  static { this.declareProp("mergeQueues", { type: "text" }) }
  get mergeQueues() { return this.getProp("mergeQueues") }
  set mergeQueues(value) { this.setProp("mergeQueues", value) }

  static { this.declareProp("metadata", { type: "text" }) }
  get metadata() { return this.getProp("metadata") }
  set metadata(value) { this.setProp("metadata", value) }

  static { this.declareProp("pullRequests", { type: "text" }) }
  get pullRequests() { return this.getProp("pullRequests") }
  set pullRequests(value) { this.setProp("pullRequests", value) }

  static { this.declareProp("repositoryHooks", { type: "text" }) }
  get repositoryHooks() { return this.getProp("repositoryHooks") }
  set repositoryHooks(value) { this.setProp("repositoryHooks", value) }

  static { this.declareProp("statuses", { type: "text" }) }
  get statuses() { return this.getProp("statuses") }
  set statuses(value) { this.setProp("statuses", value) }

  static { this.declareProp("workflows", { type: "text" }) }
  get workflows() { return this.getProp("workflows") }
  set workflows(value) { this.setProp("workflows", value) }

  static { this.declareProp("repositoryCreation", { type: "text" }) }
  get repositoryCreation() { return this.getProp("repositoryCreation") }
  set repositoryCreation(value) { this.setProp("repositoryCreation", value) }
}

export class PullRequest extends Thing {
  static { this.declareProp("url", { type: "text" }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  static { this.declareProp("htmlUrl", { type: "text" }) }
  get htmlUrl() { return this.getProp("htmlUrl") }
  set htmlUrl(value) { this.setProp("htmlUrl", value) }

  static { this.declareProp("diffUrl", { type: "text" }) }
  get diffUrl() { return this.getProp("diffUrl") }
  set diffUrl(value) { this.setProp("diffUrl", value) }

  static { this.declareProp("patchUrl", { type: "text" }) }
  get patchUrl() { return this.getProp("patchUrl") }
  set patchUrl(value) { this.setProp("patchUrl", value) }
}

export class Repository extends Thing {
  static { this.declareProp("nodeId", { type: "text" }) }
  get nodeId() { return this.getProp("nodeId") }
  set nodeId(value) { this.setProp("nodeId", value) }

  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("fullName", { type: "text" }) }
  get fullName() { return this.getProp("fullName") }
  set fullName(value) { this.setProp("fullName", value) }

  static { this.declareProp("private", { type: "choice" }) }
  get private() { return this.getProp("private") }
  set private(value) { this.setProp("private", value) }

  static { this.declareProp("owner", { type: "Owner" }) }
  get owner() { return this.getProp("owner") }
  set owner(value) { this.setProp("owner", value) }

  static { this.declareProp("htmlUrl", { type: "text" }) }
  get htmlUrl() { return this.getProp("htmlUrl") }
  set htmlUrl(value) { this.setProp("htmlUrl", value) }

  static { this.declareProp("description", { type: "text" }) }
  get description() { return this.getProp("description") }
  set description(value) { this.setProp("description", value) }

  static { this.declareProp("fork", { type: "choice" }) }
  get fork() { return this.getProp("fork") }
  set fork(value) { this.setProp("fork", value) }

  static { this.declareProp("url", { type: "text" }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  static { this.declareProp("forksUrl", { type: "text" }) }
  get forksUrl() { return this.getProp("forksUrl") }
  set forksUrl(value) { this.setProp("forksUrl", value) }

  static { this.declareProp("keysUrl", { type: "text" }) }
  get keysUrl() { return this.getProp("keysUrl") }
  set keysUrl(value) { this.setProp("keysUrl", value) }

  static { this.declareProp("collaboratorsUrl", { type: "text" }) }
  get collaboratorsUrl() { return this.getProp("collaboratorsUrl") }
  set collaboratorsUrl(value) { this.setProp("collaboratorsUrl", value) }

  static { this.declareProp("teamsUrl", { type: "text" }) }
  get teamsUrl() { return this.getProp("teamsUrl") }
  set teamsUrl(value) { this.setProp("teamsUrl", value) }

  static { this.declareProp("hooksUrl", { type: "text" }) }
  get hooksUrl() { return this.getProp("hooksUrl") }
  set hooksUrl(value) { this.setProp("hooksUrl", value) }

  static { this.declareProp("issueEventsUrl", { type: "text" }) }
  get issueEventsUrl() { return this.getProp("issueEventsUrl") }
  set issueEventsUrl(value) { this.setProp("issueEventsUrl", value) }

  static { this.declareProp("eventsUrl", { type: "text" }) }
  get eventsUrl() { return this.getProp("eventsUrl") }
  set eventsUrl(value) { this.setProp("eventsUrl", value) }

  static { this.declareProp("assigneesUrl", { type: "text" }) }
  get assigneesUrl() { return this.getProp("assigneesUrl") }
  set assigneesUrl(value) { this.setProp("assigneesUrl", value) }

  static { this.declareProp("branchesUrl", { type: "text" }) }
  get branchesUrl() { return this.getProp("branchesUrl") }
  set branchesUrl(value) { this.setProp("branchesUrl", value) }

  static { this.declareProp("tagsUrl", { type: "text" }) }
  get tagsUrl() { return this.getProp("tagsUrl") }
  set tagsUrl(value) { this.setProp("tagsUrl", value) }

  static { this.declareProp("blobsUrl", { type: "text" }) }
  get blobsUrl() { return this.getProp("blobsUrl") }
  set blobsUrl(value) { this.setProp("blobsUrl", value) }

  static { this.declareProp("gitTagsUrl", { type: "text" }) }
  get gitTagsUrl() { return this.getProp("gitTagsUrl") }
  set gitTagsUrl(value) { this.setProp("gitTagsUrl", value) }

  static { this.declareProp("gitRefsUrl", { type: "text" }) }
  get gitRefsUrl() { return this.getProp("gitRefsUrl") }
  set gitRefsUrl(value) { this.setProp("gitRefsUrl", value) }

  static { this.declareProp("treesUrl", { type: "text" }) }
  get treesUrl() { return this.getProp("treesUrl") }
  set treesUrl(value) { this.setProp("treesUrl", value) }

  static { this.declareProp("statusesUrl", { type: "text" }) }
  get statusesUrl() { return this.getProp("statusesUrl") }
  set statusesUrl(value) { this.setProp("statusesUrl", value) }

  static { this.declareProp("languagesUrl", { type: "text" }) }
  get languagesUrl() { return this.getProp("languagesUrl") }
  set languagesUrl(value) { this.setProp("languagesUrl", value) }

  static { this.declareProp("stargazersUrl", { type: "text" }) }
  get stargazersUrl() { return this.getProp("stargazersUrl") }
  set stargazersUrl(value) { this.setProp("stargazersUrl", value) }

  static { this.declareProp("contributorsUrl", { type: "text" }) }
  get contributorsUrl() { return this.getProp("contributorsUrl") }
  set contributorsUrl(value) { this.setProp("contributorsUrl", value) }

  static { this.declareProp("subscribersUrl", { type: "text" }) }
  get subscribersUrl() { return this.getProp("subscribersUrl") }
  set subscribersUrl(value) { this.setProp("subscribersUrl", value) }

  static { this.declareProp("subscriptionUrl", { type: "text" }) }
  get subscriptionUrl() { return this.getProp("subscriptionUrl") }
  set subscriptionUrl(value) { this.setProp("subscriptionUrl", value) }

  static { this.declareProp("commitsUrl", { type: "text" }) }
  get commitsUrl() { return this.getProp("commitsUrl") }
  set commitsUrl(value) { this.setProp("commitsUrl", value) }

  static { this.declareProp("gitCommitsUrl", { type: "text" }) }
  get gitCommitsUrl() { return this.getProp("gitCommitsUrl") }
  set gitCommitsUrl(value) { this.setProp("gitCommitsUrl", value) }

  static { this.declareProp("commentsUrl", { type: "text" }) }
  get commentsUrl() { return this.getProp("commentsUrl") }
  set commentsUrl(value) { this.setProp("commentsUrl", value) }

  static { this.declareProp("issueCommentUrl", { type: "text" }) }
  get issueCommentUrl() { return this.getProp("issueCommentUrl") }
  set issueCommentUrl(value) { this.setProp("issueCommentUrl", value) }

  static { this.declareProp("contentsUrl", { type: "text" }) }
  get contentsUrl() { return this.getProp("contentsUrl") }
  set contentsUrl(value) { this.setProp("contentsUrl", value) }

  static { this.declareProp("compareUrl", { type: "text" }) }
  get compareUrl() { return this.getProp("compareUrl") }
  set compareUrl(value) { this.setProp("compareUrl", value) }

  static { this.declareProp("mergesUrl", { type: "text" }) }
  get mergesUrl() { return this.getProp("mergesUrl") }
  set mergesUrl(value) { this.setProp("mergesUrl", value) }

  static { this.declareProp("archiveUrl", { type: "text" }) }
  get archiveUrl() { return this.getProp("archiveUrl") }
  set archiveUrl(value) { this.setProp("archiveUrl", value) }

  static { this.declareProp("downloadsUrl", { type: "text" }) }
  get downloadsUrl() { return this.getProp("downloadsUrl") }
  set downloadsUrl(value) { this.setProp("downloadsUrl", value) }

  static { this.declareProp("issuesUrl", { type: "text" }) }
  get issuesUrl() { return this.getProp("issuesUrl") }
  set issuesUrl(value) { this.setProp("issuesUrl", value) }

  static { this.declareProp("pullsUrl", { type: "text" }) }
  get pullsUrl() { return this.getProp("pullsUrl") }
  set pullsUrl(value) { this.setProp("pullsUrl", value) }

  static { this.declareProp("milestonesUrl", { type: "text" }) }
  get milestonesUrl() { return this.getProp("milestonesUrl") }
  set milestonesUrl(value) { this.setProp("milestonesUrl", value) }

  static { this.declareProp("notificationsUrl", { type: "text" }) }
  get notificationsUrl() { return this.getProp("notificationsUrl") }
  set notificationsUrl(value) { this.setProp("notificationsUrl", value) }

  static { this.declareProp("labelsUrl", { type: "text" }) }
  get labelsUrl() { return this.getProp("labelsUrl") }
  set labelsUrl(value) { this.setProp("labelsUrl", value) }

  static { this.declareProp("releasesUrl", { type: "text" }) }
  get releasesUrl() { return this.getProp("releasesUrl") }
  set releasesUrl(value) { this.setProp("releasesUrl", value) }

  static { this.declareProp("deploymentsUrl", { type: "text" }) }
  get deploymentsUrl() { return this.getProp("deploymentsUrl") }
  set deploymentsUrl(value) { this.setProp("deploymentsUrl", value) }

  static { this.declareProp("createdAt", { type: "date" }) }
  get createdAt() { return this.getProp("createdAt") }
  set createdAt(value) { this.setProp("createdAt", value) }

  static { this.declareProp("updatedAt", { type: "date" }) }
  get updatedAt() { return this.getProp("updatedAt") }
  set updatedAt(value) { this.setProp("updatedAt", value) }

  static { this.declareProp("pushedAt", { type: "date" }) }
  get pushedAt() { return this.getProp("pushedAt") }
  set pushedAt(value) { this.setProp("pushedAt", value) }

  static { this.declareProp("gitUrl", { type: "text" }) }
  get gitUrl() { return this.getProp("gitUrl") }
  set gitUrl(value) { this.setProp("gitUrl", value) }

  static { this.declareProp("sshUrl", { type: "text" }) }
  get sshUrl() { return this.getProp("sshUrl") }
  set sshUrl(value) { this.setProp("sshUrl", value) }

  static { this.declareProp("cloneUrl", { type: "text" }) }
  get cloneUrl() { return this.getProp("cloneUrl") }
  set cloneUrl(value) { this.setProp("cloneUrl", value) }

  static { this.declareProp("svnUrl", { type: "text" }) }
  get svnUrl() { return this.getProp("svnUrl") }
  set svnUrl(value) { this.setProp("svnUrl", value) }

  static { this.declareProp("homepage", { type: "text" }) }
  get homepage() { return this.getProp("homepage") }
  set homepage(value) { this.setProp("homepage", value) }

  static { this.declareProp("size", { type: "number" }) }
  get size() { return this.getProp("size") }
  set size(value) { this.setProp("size", value) }

  static { this.declareProp("stargazersCount", { type: "number" }) }
  get stargazersCount() { return this.getProp("stargazersCount") }
  set stargazersCount(value) { this.setProp("stargazersCount", value) }

  static { this.declareProp("watchersCount", { type: "number" }) }
  get watchersCount() { return this.getProp("watchersCount") }
  set watchersCount(value) { this.setProp("watchersCount", value) }

  static { this.declareProp("language", { type: "text" }) }
  get language() { return this.getProp("language") }
  set language(value) { this.setProp("language", value) }

  static { this.declareProp("issues", { type: "choice", storedAs: "has_issues" }) }
  get issues() { return this.getProp("issues") }
  set issues(value) { this.setProp("issues", value) }

  static { this.declareProp("projects", { type: "choice", storedAs: "has_projects" }) }
  get projects() { return this.getProp("projects") }
  set projects(value) { this.setProp("projects", value) }

  static { this.declareProp("downloads", { type: "choice", storedAs: "has_downloads" }) }
  get downloads() { return this.getProp("downloads") }
  set downloads(value) { this.setProp("downloads", value) }

  static { this.declareProp("wiki", { type: "choice", storedAs: "has_wiki" }) }
  get wiki() { return this.getProp("wiki") }
  set wiki(value) { this.setProp("wiki", value) }

  static { this.declareProp("pages", { type: "choice", storedAs: "has_pages" }) }
  get pages() { return this.getProp("pages") }
  set pages(value) { this.setProp("pages", value) }

  static { this.declareProp("discussions", { type: "choice", storedAs: "has_discussions" }) }
  get discussions() { return this.getProp("discussions") }
  set discussions(value) { this.setProp("discussions", value) }

  static { this.declareProp("forksCount", { type: "number" }) }
  get forksCount() { return this.getProp("forksCount") }
  set forksCount(value) { this.setProp("forksCount", value) }

  static { this.declareProp("archived", { type: "choice" }) }
  get archived() { return this.getProp("archived") }
  set archived(value) { this.setProp("archived", value) }

  static { this.declareProp("disabled", { type: "choice" }) }
  get disabled() { return this.getProp("disabled") }
  set disabled(value) { this.setProp("disabled", value) }

  static { this.declareProp("openIssuesCount", { type: "number" }) }
  get openIssuesCount() { return this.getProp("openIssuesCount") }
  set openIssuesCount(value) { this.setProp("openIssuesCount", value) }

  static { this.declareProp("license", { type: "License" }) }
  get license() { return this.getProp("license") }
  set license(value) { this.setProp("license", value) }

  static { this.declareProp("allowForking", { type: "choice" }) }
  get allowForking() { return this.getProp("allowForking") }
  set allowForking(value) { this.setProp("allowForking", value) }

  static { this.declareProp("template", { type: "choice", storedAs: "is_template" }) }
  get template() { return this.getProp("template") }
  set template(value) { this.setProp("template", value) }

  static { this.declareProp("webCommitSignoffRequired", { type: "choice" }) }
  get webCommitSignoffRequired() { return this.getProp("webCommitSignoffRequired") }
  set webCommitSignoffRequired(value) { this.setProp("webCommitSignoffRequired", value) }

  static { this.declareProp("pullRequests", { type: "choice", storedAs: "has_pull_requests" }) }
  get pullRequests() { return this.getProp("pullRequests") }
  set pullRequests(value) { this.setProp("pullRequests", value) }

  static { this.declareProp("pullRequestCreationPolicy", { type: "text" }) }
  get pullRequestCreationPolicy() { return this.getProp("pullRequestCreationPolicy") }
  set pullRequestCreationPolicy(value) { this.setProp("pullRequestCreationPolicy", value) }

  static { this.declareProp("topics", { itemType: "User", init: () => new List({ instanceType: "User" }) }) }
  get topics() { return core.linked(this, "topics", User) }
  set topics(value) { this.setProp("topics", value) }

  static { this.declareProp("visibility", { type: "text" }) }
  get visibility() { return this.getProp("visibility") }
  set visibility(value) { this.setProp("visibility", value) }

  static { this.declareProp("forks", { type: "number" }) }
  get forks() { return this.getProp("forks") }
  set forks(value) { this.setProp("forks", value) }

  static { this.declareProp("openIssues", { type: "number" }) }
  get openIssues() { return this.getProp("openIssues") }
  set openIssues(value) { this.setProp("openIssues", value) }

  static { this.declareProp("watchers", { type: "number" }) }
  get watchers() { return this.getProp("watchers") }
  set watchers(value) { this.setProp("watchers", value) }

  static { this.declareProp("defaultBranch", { type: "text" }) }
  get defaultBranch() { return this.getProp("defaultBranch") }
  set defaultBranch(value) { this.setProp("defaultBranch", value) }

  static { this.declareProp("permissions", { type: "Permission" }) }
  get permissions() { return this.getProp("permissions") }
  set permissions(value) { this.setProp("permissions", value) }

  static { this.declareProp("score", { type: "number" }) }
  get score() { return this.getProp("score") }
  set score(value) { this.setProp("score", value) }

  draw() {
    return h("ui-card",
      h("ui-content",
        h("ui-header",
          () => this.fullName,
          h("ui-link", { link: () => this.htmlUrl, target: "_blank", "aria-label": "On GitHub" },
            h("ui-icon", { name: "github" })
          )
        ),
        h("ui-meta",
          "★ ",
          () => this.stargazersCount,
          () => core.drawIf(() => this.language, () => [" · ", () => this.language])
        ),
        h("ui-description", () => this.description)
      )
    )
  }

  static savedIn = {
    place: "github",
    collection: "repositories",
    times: ["created", "modified"], select: ["name", "fullName", "htmlUrl", "description", "createdAt", "stargazersCount", "language"] }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Assignee extends Thing {
  static { this.declareProp("login", { type: "text" }) }
  get login() { return this.getProp("login") }
  set login(value) { this.setProp("login", value) }

  static { this.declareProp("number", { type: "number", storedAs: "id" }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  static { this.declareProp("nodeId", { type: "text" }) }
  get nodeId() { return this.getProp("nodeId") }
  set nodeId(value) { this.setProp("nodeId", value) }

  static { this.declareProp("avatarUrl", { type: "text" }) }
  get avatarUrl() { return this.getProp("avatarUrl") }
  set avatarUrl(value) { this.setProp("avatarUrl", value) }

  static { this.declareProp("gravatarId", { type: "text" }) }
  get gravatarId() { return this.getProp("gravatarId") }
  set gravatarId(value) { this.setProp("gravatarId", value) }

  static { this.declareProp("url", { type: "text" }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  static { this.declareProp("htmlUrl", { type: "text" }) }
  get htmlUrl() { return this.getProp("htmlUrl") }
  set htmlUrl(value) { this.setProp("htmlUrl", value) }

  static { this.declareProp("followersUrl", { type: "text" }) }
  get followersUrl() { return this.getProp("followersUrl") }
  set followersUrl(value) { this.setProp("followersUrl", value) }

  static { this.declareProp("followingUrl", { type: "text" }) }
  get followingUrl() { return this.getProp("followingUrl") }
  set followingUrl(value) { this.setProp("followingUrl", value) }

  static { this.declareProp("gistsUrl", { type: "text" }) }
  get gistsUrl() { return this.getProp("gistsUrl") }
  set gistsUrl(value) { this.setProp("gistsUrl", value) }

  static { this.declareProp("starredUrl", { type: "text" }) }
  get starredUrl() { return this.getProp("starredUrl") }
  set starredUrl(value) { this.setProp("starredUrl", value) }

  static { this.declareProp("subscriptionsUrl", { type: "text" }) }
  get subscriptionsUrl() { return this.getProp("subscriptionsUrl") }
  set subscriptionsUrl(value) { this.setProp("subscriptionsUrl", value) }

  static { this.declareProp("organizationsUrl", { type: "text" }) }
  get organizationsUrl() { return this.getProp("organizationsUrl") }
  set organizationsUrl(value) { this.setProp("organizationsUrl", value) }

  static { this.declareProp("reposUrl", { type: "text" }) }
  get reposUrl() { return this.getProp("reposUrl") }
  set reposUrl(value) { this.setProp("reposUrl", value) }

  static { this.declareProp("eventsUrl", { type: "text" }) }
  get eventsUrl() { return this.getProp("eventsUrl") }
  set eventsUrl(value) { this.setProp("eventsUrl", value) }

  static { this.declareProp("receivedEventsUrl", { type: "text" }) }
  get receivedEventsUrl() { return this.getProp("receivedEventsUrl") }
  set receivedEventsUrl(value) { this.setProp("receivedEventsUrl", value) }

  static { this.declareProp("kind", { type: "text", storedAs: "type" }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  static { this.declareProp("userViewType", { type: "text" }) }
  get userViewType() { return this.getProp("userViewType") }
  set userViewType(value) { this.setProp("userViewType", value) }

  static { this.declareProp("siteAdmin", { type: "choice" }) }
  get siteAdmin() { return this.getProp("siteAdmin") }
  set siteAdmin(value) { this.setProp("siteAdmin", value) }
}

export class License extends Thing {
  static { this.declareProp("key", { type: "text" }) }
  get key() { return this.getProp("key") }
  set key(value) { this.setProp("key", value) }

  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("spdxId", { type: "text" }) }
  get spdxId() { return this.getProp("spdxId") }
  set spdxId(value) { this.setProp("spdxId", value) }

  static { this.declareProp("url", { type: "text" }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  static { this.declareProp("nodeId", { type: "text" }) }
  get nodeId() { return this.getProp("nodeId") }
  set nodeId(value) { this.setProp("nodeId", value) }
}

export class Github extends Place {}
export const github = core.place(new Github(), {
  name: "github",
  kind: "web server",
  at: "https://api.github.com",
  keyNamed: "GITHUB_TOKEN",
  keyIfSet: true,
  nextPageInLink: true,
  pageSize: 100,
  pageSizeAskedWith: "per_page",
  checkedEvery: 2400,
  namesLike: "repository_url",
  collections: {
    issues: { at: "/repos/solidjs/solid/issues" },
    contributors: { at: "/repos/solidjs/solid/contributors" },
    users: {
      at: "/users/{id}",
      fields: { id: "login" },
      searches: {
        param: "q",
        fields: [],
        at: "/search/users"
      }
    },
    repositories: {
      searches: {
        param: "q",
        fields: [],
        at: "/search/repositories"
      },
      at: "/search/repositories",
      searchedOnly: true
    }
  }
})

// -----------
export class GithubPage extends Thing {
  static { this.declareProp("search", { type: "text" }) }
  get search() { return this.getProp("search") }
  set search(value) { this.setProp("search", value) }

  static { this.declareProp("showing", { type: "User", link: true }) }
  get showing() { return core.linked(this, "showing", User) }
  set showing(value) { this.setProp("showing", value) }

  create() {
    this.search = "solid"
  }

  async tryWords(words) {
    this.showing = undefined
    this.search = words
  }

  draw() {
    return h("ui-stack", { spacing: "xl" },
      h("ui-form", { "prop:value": this },
        h("ui-stack", { spacing: "sm" },
          h("ui-stack", { direction: "horizontal", wrap: true, align: "center", justify: "between", spacing: "sm" },
            h("ui-header", { size: "large" }, "People and code, on GitHub"),
            h("ui-search", {
              name: "search",
              parameter: "who",
              icon: "search",
              placeholder: "A person, an organization, a repository",
              "aria-label": "Search GitHub"
            })
          ),
          h("ui-toolbar", { appearance: "secondary", size: "small", "aria-label": "Try a search" },
            h("ui-text", { slot: "title", size: "small", color: "grey" }, "Try"),
            h("ui-item", {
              onClick: core.pressed(this, async () => await this.tryWords("ryansolid")),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "ryansolid"),
            h("ui-item", {
              onClick: core.pressed(this, async () => await this.tryWords("solidjs")),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "solidjs"),
            h("ui-item", {
              onClick: core.pressed(this, async () => await this.tryWords("vite")),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "vite"),
            h("ui-item", {
              onClick: core.pressed(this, async () => await this.tryWords("torvalds")),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "torvalds"),
            h("ui-item", {
              onClick: core.pressed(this, async () => await this.tryWords("spreadsheet")),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "spreadsheet")
          )
        )
      ),
      () => this.drawFound(),
      () => this.drawIssues(),
      h("ui-text", { size: "small", paragraph: true },
        "From ",
        h("ui-link", { link: "https://docs.github.com/en/rest" }, "GitHub's REST API"),
        ", asked for as you look."
      )
    )
  }

  drawIssues() {
    return h("ui-stack", { spacing: "sm", part: "issues" },
      h("ui-header", { size: "medium" }, "Solid's issues"),
      () => core.drawRead(async () => await core.savedThings(
        Issue,
        {},
        "looks through",
        { first: 6, where: (issue) => issue.pullRequest === undefined }
      ), (issue) => core.drawThing(issue), {
        waitingSay: () => "Asking GitHub",
        none: () => h("ui-text", { part: "issues" }, "No open issues."),
        items: () => h("ui-cards", { columns: "3", doubling: true, stackable: true, part: "issues" })
      }),
      h("ui-header", { size: "medium" }, "Solid's pull requests"),
      () => core.drawRead(async () => await core.savedThings(
        Issue,
        {},
        "looks through",
        { first: 6, where: (issue) => issue.pullRequest !== undefined }
      ), (issue) => core.drawThing(issue), {
        waitingSay: () => "Asking GitHub",
        none: () => h("ui-text", { part: "issues" }, "No open pull requests."),
        items: () => h("ui-cards", { columns: "3", doubling: true, stackable: true, part: "issues" })
      })
    )
  }

  drawFound() { return core.drawWaiting(() => {
    if (this.showing) return core.drawRead(async () => (await core.savedThingWithId(User, (await core.answerOf(this, "showing"))?.login)).drawPage(), undefined, { waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "found" }, "Asking GitHub") })
    else {
      return h("ui-stack", { spacing: "xl", part: "found" },
        h("ui-stack", { spacing: "sm" },
          h("ui-header", { size: "medium" }, "People and organizations"),
          () => core.drawRead(async () => await core.savedThings(User, { search: { "*": this.search } }, "as drawn"), (user) => core.drawThing(user), {
            waitingSay: () => "Asking GitHub",
            none: () => h("ui-text", { part: "found" }, "Nobody on GitHub goes by that."),
            paging: () => "pages",
            items: () => h("ui-cards", { columns: "4", doubling: true, stackable: true, part: "found" })
          })
        ),
        h("ui-stack", { spacing: "sm" },
          h("ui-header", { size: "medium" }, "Repositories"),
          () => core.drawRead(async () => await core.savedThings(Repository, { search: { "*": this.search } }, "as drawn"), (repository) => core.drawThing(repository), {
            waitingSay: () => "Asking GitHub",
            none: () => h("ui-text", { part: "found" }, "No repository matches that."),
            paging: () => "pages",
            items: () => h("ui-cards", { columns: "3", doubling: true, stackable: true, part: "found" })
          })
        )
      )
    }
  }) }
}
core.describeAction(GithubPage, "tryWords", { title: "Try Words", undoneAs: "Try Words" })

// -----------
export class Book extends Thing {
  static { this.declareProp("authors", { itemType: "Author", storedAs: "author_key", init: () => new List({ instanceType: "Author" }) }) }
  get authors() { return core.linked(this, "authors", Author) }
  set authors(value) { this.setProp("authors", value) }

  static { this.declareProp("authorName", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get authorName() { return this.getProp("authorName") }
  set authorName(value) { this.setProp("authorName", value) }

  static { this.declareProp("coverEdition", { type: "Edition", storedAs: "cover_edition_key", link: true }) }
  get coverEdition() { return core.linked(this, "coverEdition", Edition) }
  set coverEdition(value) { this.setProp("coverEdition", value) }

  static { this.declareProp("coverHeight", { type: "number" }) }
  get coverHeight() { return this.getProp("coverHeight") }
  set coverHeight(value) { this.setProp("coverHeight", value) }

  static { this.declareProp("coverI", { type: "text" }) }
  get coverI() { return this.getProp("coverI") }
  set coverI(value) { this.setProp("coverI", value) }

  static { this.declareProp("coverWidth", { type: "number" }) }
  get coverWidth() { return this.getProp("coverWidth") }
  set coverWidth(value) { this.setProp("coverWidth", value) }

  static { this.declareProp("ebookAccess", { type: "text" }) }
  get ebookAccess() { return this.getProp("ebookAccess") }
  set ebookAccess(value) { this.setProp("ebookAccess", value) }

  static { this.declareProp("editionCount", { type: "number" }) }
  get editionCount() { return this.getProp("editionCount") }
  set editionCount(value) { this.setProp("editionCount", value) }

  static { this.declareProp("firstPublishYear", { type: "number" }) }
  get firstPublishYear() { return this.getProp("firstPublishYear") }
  set firstPublishYear(value) { this.setProp("firstPublishYear", value) }

  static { this.declareProp("fulltext", { type: "choice", storedAs: "has_fulltext" }) }
  get fulltext() { return this.getProp("fulltext") }
  set fulltext(value) { this.setProp("fulltext", value) }

  static { this.declareProp("ia", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get ia() { return this.getProp("ia") }
  set ia(value) { this.setProp("ia", value) }

  static { this.declareProp("iaCollection", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get iaCollection() { return this.getProp("iaCollection") }
  set iaCollection(value) { this.setProp("iaCollection", value) }

  static { this.declareProp("language", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get language() { return this.getProp("language") }
  set language(value) { this.setProp("language", value) }

  static { this.declareProp("lendingEditionS", { type: "text" }) }
  get lendingEditionS() { return this.getProp("lendingEditionS") }
  set lendingEditionS(value) { this.setProp("lendingEditionS", value) }

  static { this.declareProp("lendingIdentifierS", { type: "text" }) }
  get lendingIdentifierS() { return this.getProp("lendingIdentifierS") }
  set lendingIdentifierS(value) { this.setProp("lendingIdentifierS", value) }

  static { this.declareProp("publicScanB", { type: "choice" }) }
  get publicScanB() { return this.getProp("publicScanB") }
  set publicScanB(value) { this.setProp("publicScanB", value) }

  static { this.declareProp("editions", { itemType: "Edition", init: () => new List({ instanceType: "Edition" }) }) }
  get editions() { return core.linked(this, "editions", Edition) }
  set editions(value) { this.setProp("editions", value) }

  static { this.declareProp("seriesKey", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get seriesKey() { return this.getProp("seriesKey") }
  set seriesKey(value) { this.setProp("seriesKey", value) }

  static { this.declareProp("seriesName", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get seriesName() { return this.getProp("seriesName") }
  set seriesName(value) { this.setProp("seriesName", value) }

  static { this.declareProp("seriesPosition", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get seriesPosition() { return this.getProp("seriesPosition") }
  set seriesPosition(value) { this.setProp("seriesPosition", value) }

  static { this.declareProp("title", { type: "text" }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  static { this.declareProp("subtitle", { type: "text" }) }
  get subtitle() { return this.getProp("subtitle") }
  set subtitle(value) { this.setProp("subtitle", value) }

  static { this.declareProp("writer", { readsFrom: ["open_library"] }) }
  get writer() {
    return core.getItemAt(this.authors, 0)
  }

  async open() {
    publicServers.library.showing = this
  }

  async close() {
    publicServers.library.showing = undefined
  }

  draw() {
    return h("ui-card", {
      class: "book",
      onClick: core.pressed(this, async () => await this.open()),
      style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
    },
      h("ui-image", { src: () => this.coverI, alt: "", "aspect-ratio": "2:3", crop: true }),
      h("ui-content",
        h("ui-header", () => this.title),
        h("ui-meta", () => core.listShown(this.authorName), " · ", () => this.firstPublishYear)
      )
    )
  }

  drawPage() {
    return h("ui-stack", { spacing: "xl", part: "page" },
      h("ui-stack", { direction: "horizontal", align: "center", spacing: "sm" },
        h("ui-button", {
          icon: "arrow left",
          appearance: "basic",
          "aria-label": "Back",
          title: "Back",
          onClick: core.pressed(this, async () => await this.close()),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }),
        h("ui-header", { size: "large" }, () => this.title)
      ),
      h("ui-stack", { direction: "horizontal", wrap: true, align: "start", spacing: "md" },
        h("ui-image", { src: () => this.coverI, alt: "", size: "small" }),
        h("ui-stack", { spacing: "sm" },
          h("ui-text",
            "First published in ",
            () => this.firstPublishYear,
            " · ",
            () => this.editionCount,
            " editions"
          ),
          () => this.drawWriting()
        )
      ),
      h("ui-stack", { spacing: "sm" },
        h("ui-header", { size: "medium" }, "Editions"),
        () => core.drawRead(() => this.editions, (edition) => core.drawThing(edition), {
          waitingSay: () => "Asking Open Library for its editions",
          none: () => h("ui-text", { part: "page" }, "No editions listed."),
          paging: () => "pages",
          items: () => h("ui-cards", { columns: "4", doubling: true, stackable: true, part: "page" })
        })
      )
    )
  }

  drawWriting() { return core.drawWaiting(() => {
    if (this.writer) return this.writer.drawCard()
    core.readRider("waiting", () => h("ui-loader", { visible: true, inline: true, text: true, part: "writing" },
      "Asking Open Library who wrote it"
    ))
    core.readRider("failed", () => h("ui-text", { part: "writing" }, "Open Library can't say who wrote it just now."))
  }) }

  static savedIn = {
    place: "open_library",
    collection: "books",
    times: ["created", "modified"], select: ["authors", "authorName", "coverI", "editionCount", "firstPublishYear", "language", "editions", "title"] }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}
core.describeAction(Book, "open", { title: "Open It", undoneAs: "Open It" })
core.describeAction(Book, "close", { title: "Close It", undoneAs: "Close It" })

export class Author extends Thing {
  static { this.declareProp("links", { itemType: "Link", init: () => new List({ instanceType: "Link" }) }) }
  get links() { return this.getProp("links") }
  set links(value) { this.setProp("links", value) }

  static { this.declareProp("kind", { type: "Kind", storedAs: "type" }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  static { this.declareProp("key", { type: "text" }) }
  get key() { return this.getProp("key") }
  set key(value) { this.setProp("key", value) }

  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("sourceRecords", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get sourceRecords() { return this.getProp("sourceRecords") }
  set sourceRecords(value) { this.setProp("sourceRecords", value) }

  static { this.declareProp("birthDate", { type: "text" }) }
  get birthDate() { return this.getProp("birthDate") }
  set birthDate(value) { this.setProp("birthDate", value) }

  static { this.declareProp("bio", { type: "text" }) }
  get bio() { return this.getProp("bio") }
  set bio(value) { this.setProp("bio", value) }

  static { this.declareProp("title", { type: "text" }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  static { this.declareProp("alternateNames", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get alternateNames() { return this.getProp("alternateNames") }
  set alternateNames(value) { this.setProp("alternateNames", value) }

  static { this.declareProp("remoteIds", { type: "RemoteId" }) }
  get remoteIds() { return this.getProp("remoteIds") }
  set remoteIds(value) { this.setProp("remoteIds", value) }

  static { this.declareProp("photos", { itemType: "number", init: () => new List({ instanceType: "number" }) }) }
  get photos() { return this.getProp("photos") }
  set photos(value) { this.setProp("photos", value) }

  static { this.declareProp("deathDate", { type: "text" }) }
  get deathDate() { return this.getProp("deathDate") }
  set deathDate(value) { this.setProp("deathDate", value) }

  static { this.declareProp("personalName", { type: "text" }) }
  get personalName() { return this.getProp("personalName") }
  set personalName(value) { this.setProp("personalName", value) }

  static { this.declareProp("latestRevision", { type: "number" }) }
  get latestRevision() { return this.getProp("latestRevision") }
  set latestRevision(value) { this.setProp("latestRevision", value) }

  static { this.declareProp("revision", { type: "number" }) }
  get revision() { return this.getProp("revision") }
  set revision(value) { this.setProp("revision", value) }

  static { this.declareProp("created", { type: "Created" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("lastModified", { type: "LastModified" }) }
  get lastModified() { return this.getProp("lastModified") }
  set lastModified(value) { this.setProp("lastModified", value) }

  drawCard() {
    return h("ui-card", { part: "card" },
      h("ui-content",
        h("ui-header", () => this.name),
        h("ui-meta", "Born ", () => this.birthDate),
        h("ui-description", () => this.bio)
      )
    )
  }

  static savedIn = {
    place: "open_library",
    collection: "authors",
    times: ["modified"], select: ["kind", "name", "birthDate", "bio", "title"] }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Edition extends Thing {
  static { this.declareProp("kind", { type: "Kind", storedAs: "type" }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  static { this.declareProp("title", { type: "text" }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  static { this.declareProp("authors", { itemType: "EditionAuthor", init: () => new List({ instanceType: "EditionAuthor" }) }) }
  get authors() { return this.getProp("authors") }
  set authors(value) { this.setProp("authors", value) }

  static { this.declareProp("publishDate", { type: "text" }) }
  get publishDate() { return this.getProp("publishDate") }
  set publishDate(value) { this.setProp("publishDate", value) }

  static { this.declareProp("sourceRecords", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get sourceRecords() { return this.getProp("sourceRecords") }
  set sourceRecords(value) { this.setProp("sourceRecords", value) }

  static { this.declareProp("numberOfPages", { type: "number" }) }
  get numberOfPages() { return this.getProp("numberOfPages") }
  set numberOfPages(value) { this.setProp("numberOfPages", value) }

  static { this.declareProp("publishers", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get publishers() { return this.getProp("publishers") }
  set publishers(value) { this.setProp("publishers", value) }

  static { this.declareProp("physicalFormat", { type: "text" }) }
  get physicalFormat() { return this.getProp("physicalFormat") }
  set physicalFormat(value) { this.setProp("physicalFormat", value) }

  static { this.declareProp("notes", { type: "Note" }) }
  get notes() { return this.getProp("notes") }
  set notes(value) { this.setProp("notes", value) }

  static { this.declareProp("fullTitle", { type: "text" }) }
  get fullTitle() { return this.getProp("fullTitle") }
  set fullTitle(value) { this.setProp("fullTitle", value) }

  static { this.declareProp("covers", { itemType: "number", init: () => new List({ instanceType: "number" }) }) }
  get covers() { return this.getProp("covers") }
  set covers(value) { this.setProp("covers", value) }

  static { this.declareProp("works", { itemType: "Work", init: () => new List({ instanceType: "Work" }) }) }
  get works() { return this.getProp("works") }
  set works(value) { this.setProp("works", value) }

  static { this.declareProp("key", { type: "text" }) }
  get key() { return this.getProp("key") }
  set key(value) { this.setProp("key", value) }

  static { this.declareProp("localId", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get localId() { return this.getProp("localId") }
  set localId(value) { this.setProp("localId", value) }

  static { this.declareProp("latestRevision", { type: "number" }) }
  get latestRevision() { return this.getProp("latestRevision") }
  set latestRevision(value) { this.setProp("latestRevision", value) }

  static { this.declareProp("revision", { type: "number" }) }
  get revision() { return this.getProp("revision") }
  set revision(value) { this.setProp("revision", value) }

  static { this.declareProp("created", { type: "Created" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("lastModified", { type: "LastModified" }) }
  get lastModified() { return this.getProp("lastModified") }
  set lastModified(value) { this.setProp("lastModified", value) }

  draw() {
    return h("ui-card",
      h("ui-content",
        h("ui-header", () => this.title),
        h("ui-meta", () => this.publishDate, " · ", () => core.getItemAt(this.publishers, 0))
      )
    )
  }

  static savedIn = {
    place: "open_library",
    collection: "editions",
    times: ["modified"], select: ["kind", "title", "authors", "publishDate", "publishers"] }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Link extends Thing {
  static { this.declareProp("title", { type: "text" }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  static { this.declareProp("url", { type: "text" }) }
  get url() { return this.getProp("url") }
  set url(value) { this.setProp("url", value) }

  static { this.declareProp("kind", { type: "Kind", storedAs: "type" }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }
}

export class Kind extends Thing {
  static { this.declareProp("key", { type: "text" }) }
  get key() { return this.getProp("key") }
  set key(value) { this.setProp("key", value) }
}

export class RemoteId extends Thing {
  static { this.declareProp("viaf", { type: "number" }) }
  get viaf() { return this.getProp("viaf") }
  set viaf(value) { this.setProp("viaf", value) }

  static { this.declareProp("wikidata", { type: "text" }) }
  get wikidata() { return this.getProp("wikidata") }
  set wikidata(value) { this.setProp("wikidata", value) }

  static { this.declareProp("isni", { type: "number" }) }
  get isni() { return this.getProp("isni") }
  set isni(value) { this.setProp("isni", value) }

  static { this.declareProp("amazon", { type: "text" }) }
  get amazon() { return this.getProp("amazon") }
  set amazon(value) { this.setProp("amazon", value) }

  static { this.declareProp("bookbrainz", { type: "text" }) }
  get bookbrainz() { return this.getProp("bookbrainz") }
  set bookbrainz(value) { this.setProp("bookbrainz", value) }

  static { this.declareProp("goodreads", { type: "number" }) }
  get goodreads() { return this.getProp("goodreads") }
  set goodreads(value) { this.setProp("goodreads", value) }

  static { this.declareProp("gnd", { type: "number" }) }
  get gnd() { return this.getProp("gnd") }
  set gnd(value) { this.setProp("gnd", value) }

  static { this.declareProp("imdb", { type: "text" }) }
  get imdb() { return this.getProp("imdb") }
  set imdb(value) { this.setProp("imdb", value) }

  static { this.declareProp("lcNaf", { type: "text" }) }
  get lcNaf() { return this.getProp("lcNaf") }
  set lcNaf(value) { this.setProp("lcNaf", value) }

  static { this.declareProp("librarything", { type: "text" }) }
  get librarything() { return this.getProp("librarything") }
  set librarything(value) { this.setProp("librarything", value) }

  static { this.declareProp("musicbrainz", { type: "text" }) }
  get musicbrainz() { return this.getProp("musicbrainz") }
  set musicbrainz(value) { this.setProp("musicbrainz", value) }

  static { this.declareProp("storygraph", { type: "text" }) }
  get storygraph() { return this.getProp("storygraph") }
  set storygraph(value) { this.setProp("storygraph", value) }

  static { this.declareProp("inventaire", { type: "text" }) }
  get inventaire() { return this.getProp("inventaire") }
  set inventaire(value) { this.setProp("inventaire", value) }

  static { this.declareProp("librivox", { type: "number" }) }
  get librivox() { return this.getProp("librivox") }
  set librivox(value) { this.setProp("librivox", value) }

  static { this.declareProp("projectGutenberg", { type: "number" }) }
  get projectGutenberg() { return this.getProp("projectGutenberg") }
  set projectGutenberg(value) { this.setProp("projectGutenberg", value) }

  static { this.declareProp("opacSbn", { type: "text" }) }
  get opacSbn() { return this.getProp("opacSbn") }
  set opacSbn(value) { this.setProp("opacSbn", value) }
}

export class Created extends Thing {
  static { this.declareProp("kind", { type: "text", storedAs: "type" }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  static { this.declareProp("value", { type: "date" }) }
  get value() { return this.getProp("value") }
  set value(value) { this.setProp("value", value) }
}

export class LastModified extends Thing {
  static { this.declareProp("kind", { type: "text", storedAs: "type" }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  static { this.declareProp("value", { type: "date" }) }
  get value() { return this.getProp("value") }
  set value(value) { this.setProp("value", value) }
}

export class EditionAuthor extends Thing {
  static { this.declareProp("key", { type: "text" }) }
  get key() { return this.getProp("key") }
  set key(value) { this.setProp("key", value) }
}

export class Note extends Thing {
  static { this.declareProp("kind", { type: "text", storedAs: "type" }) }
  get kind() { return this.getProp("kind") }
  set kind(value) { this.setProp("kind", value) }

  static { this.declareProp("value", { type: "text" }) }
  get value() { return this.getProp("value") }
  set value(value) { this.setProp("value", value) }
}

export class Work extends Thing {
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
  },
  listsUnder: { books: { editions: "{id}/editions.json" } }
})

// -----------
export class OpenLibraryPage extends Thing {
  static { this.declareProp("search", { type: "text" }) }
  get search() { return this.getProp("search") }
  set search(value) { this.setProp("search", value) }

  static { this.declareProp("showing", { type: "Book", link: true }) }
  get showing() { return core.linked(this, "showing", Book) }
  set showing(value) { this.setProp("showing", value) }

  create() {
    this.search = "dune"
  }

  static { this.declareProp("found", { readsFrom: ["open_library"] }) }
  get found() { return core.waitedValue(this, "found", async () => {
    return core.filter(await core.savedThings(Book, { search: { title: this.search } }, "looks through"), (book) => core.includes(book.title, this.search))
  }, () => [this.search]) }

  draw() {
    return h("ui-stack", { spacing: "xl" },
      h("ui-form", { "prop:value": this },
        h("ui-stack", { direction: "horizontal", wrap: true, align: "center", justify: "between", spacing: "sm" },
          h("ui-header", { size: "large" }, "Books, from Open Library"),
          h("ui-search", {
            name: "search",
            parameter: "book",
            icon: "search",
            placeholder: "A book, by its title",
            "aria-label": "Search Open Library"
          })
        )
      ),
      () => this.drawShelf(),
      h("ui-text", { size: "small", paragraph: true },
        "From ",
        h("ui-link", { link: "https://openlibrary.org/developers/api" }, "Open Library's API"),
        ", asked for as you look;  its covers from its covers server."
      )
    )
  }

  drawShelf() { return core.drawWaiting(() => {
    if (this.showing) return this.showing.drawPage()
    else return this.drawBookList()
  }) }

  drawBookList() {
    return core.drawRead(() => this.found, (book) => core.drawThing(book), {
      waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "book_list" }, "Asking Open Library"),
      none: () => h("ui-text", { part: "book_list" }, "No book is called that."),
      failedSay: () => "Open Library can't be reached just now.",
      paging: () => "pages",
      items: () => h("ui-cards", { columns: "5", doubling: true, part: "book_list" })
    })
  }
}

// -----------
export class Post extends Thing {
  static { this.declareProp("userId", { type: "number" }) }
  get userId() { return this.getProp("userId") }
  set userId(value) { this.setProp("userId", value) }

  static { this.declareProp("title", { type: "text" }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  static { this.declareProp("body", { type: "text" }) }
  get body() { return this.getProp("body") }
  set body(value) { this.setProp("body", value) }

  static { this.declareProp("comments", { itemType: "Comment", init: () => new List({ instanceType: "Comment" }) }) }
  get comments() { return core.linked(this, "comments", Comment) }
  set comments(value) { this.setProp("comments", value) }

  draw() {
    return [
      h("ui-header", { size: "small" }, () => this.title),
      h("ui-text", () => this.body),
      core.drawRead(() => this.comments, (comment) => core.drawThing(comment), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Asking for its comments") })
    ]
  }

  static savedIn = {
    place: "jsonplaceholder",
    collection: "posts",
    times: ["created", "modified"], select: ["userId", "title", "body", "comments"] }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Comment extends Thing {
  static { this.declareProp("postId", { type: "number" }) }
  get postId() { return this.getProp("postId") }
  set postId(value) { this.setProp("postId", value) }

  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("email", { type: "text" }) }
  get email() { return this.getProp("email") }
  set email(value) { this.setProp("email", value) }

  static { this.declareProp("body", { type: "text" }) }
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

  static savedIn = {
    place: "jsonplaceholder",
    collection: "comments",
    times: ["created", "modified"], select: ["name", "email", "body"] }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class JsonplaceholderUser extends Thing {
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("username", { type: "text" }) }
  get username() { return this.getProp("username") }
  set username(value) { this.setProp("username", value) }

  static { this.declareProp("email", { type: "text" }) }
  get email() { return this.getProp("email") }
  set email(value) { this.setProp("email", value) }

  static { this.declareProp("address", { type: "Address" }) }
  get address() { return this.getProp("address") }
  set address(value) { this.setProp("address", value) }

  static { this.declareProp("phone", { type: "text" }) }
  get phone() { return this.getProp("phone") }
  set phone(value) { this.setProp("phone", value) }

  static { this.declareProp("website", { type: "text" }) }
  get website() { return this.getProp("website") }
  set website(value) { this.setProp("website", value) }

  static { this.declareProp("company", { type: "Company" }) }
  get company() { return this.getProp("company") }
  set company(value) { this.setProp("company", value) }

  static { this.declareProp("posts", { itemType: "Post", init: () => new List({ instanceType: "Post" }) }) }
  get posts() { return core.linked(this, "posts", Post) }
  set posts(value) { this.setProp("posts", value) }

  static { this.declareProp("todos", { itemType: "Todo", init: () => new List({ instanceType: "Todo" }) }) }
  get todos() { return core.linked(this, "todos", Todo) }
  set todos(value) { this.setProp("todos", value) }

  static savedIn = {
    place: "jsonplaceholder",
    collection: "jsonplaceholder_users",
    times: ["created", "modified"], select: ["name", "email", "posts", "todos"] }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Todo extends Thing {
  static { this.declareProp("userId", { type: "number" }) }
  get userId() { return this.getProp("userId") }
  set userId(value) { this.setProp("userId", value) }

  static { this.declareProp("title", { type: "text" }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  static { this.declareProp("completed", { type: "choice" }) }
  get completed() { return this.getProp("completed") }
  set completed(value) { this.setProp("completed", value) }

  draw() {
    return h("ui-form", { "prop:value": this },
      h("ui-stack", { direction: "horizontal", align: "center", justify: "between", spacing: "sm" },
        h("ui-checkbox", { name: "completed", label: () => this.title }),
        h("ui-button", {
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

  static savedIn = {
    place: "jsonplaceholder",
    collection: "todos",
    times: ["created", "modified"]
  }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Address extends Thing {
  static { this.declareProp("street", { type: "text" }) }
  get street() { return this.getProp("street") }
  set street(value) { this.setProp("street", value) }

  static { this.declareProp("suite", { type: "text" }) }
  get suite() { return this.getProp("suite") }
  set suite(value) { this.setProp("suite", value) }

  static { this.declareProp("city", { type: "text" }) }
  get city() { return this.getProp("city") }
  set city(value) { this.setProp("city", value) }

  static { this.declareProp("zipcode", { type: "text" }) }
  get zipcode() { return this.getProp("zipcode") }
  set zipcode(value) { this.setProp("zipcode", value) }

  static { this.declareProp("geo", { type: "Geo" }) }
  get geo() { return this.getProp("geo") }
  set geo(value) { this.setProp("geo", value) }
}

export class Geo extends Thing {
  static { this.declareProp("lat", { type: "number" }) }
  get lat() { return this.getProp("lat") }
  set lat(value) { this.setProp("lat", value) }

  static { this.declareProp("lng", { type: "number" }) }
  get lng() { return this.getProp("lng") }
  set lng(value) { this.setProp("lng", value) }
}

export class Company extends Thing {
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("catchPhrase", { type: "text" }) }
  get catchPhrase() { return this.getProp("catchPhrase") }
  set catchPhrase(value) { this.setProp("catchPhrase", value) }

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
    todos: { filters: ["userId"], at: "/todos" }
  },
  listsUnder: { posts: { comments: "/posts/{id}/comments" }, jsonplaceholderUsers: { posts: "/users/{id}/posts", todos: "/users/{id}/todos" } }
})

// -----------
export class JsonplaceholderPage extends Thing {
  static { this.declareProp("newTodo", { init: () => new Todo({ userId: 1 }), early: true }) }
  get newTodo() { return core.linked(this, "newTodo", Todo) }
  set newTodo(value) { this.setProp("newTodo", value) }

  static { this.declareProp("person", { readsFrom: ["jsonplaceholder"] }) }
  get person() { return core.waitedValue(this, "person", async () => {
    return await core.savedThingWithId(JsonplaceholderUser, 1)
  }) }

  static { this.declareProp("todos", { readsFrom: ["jsonplaceholder"] }) }
  get todos() { return core.waitedValue(this, "todos", async () => {
    return await core.savedThings(Todo, { filter: { userId: 1 } })
  }) }

  async addTheNewTodo() {
    core.saveThing(await core.answerOf(this, "newTodo"))
    this.newTodo = new Todo({ userId: 1 })
  }

  draw() {
    return h("ui-stack", { spacing: "xl" },
      h("ui-stack", { spacing: "sm" },
        h("ui-header", { size: "large" }, "Practice, on JSONPlaceholder"),
        h("ui-text", { color: "grey" },
          "Tick a todo, add one, remove one:  each goes to the server, which answers as if it saved it, and keeps nothing."
        )
      ),
      h("ui-stack", { spacing: "sm" },
        h("ui-header", { size: "medium" }, "Their todos"),
        () => this.drawChecklist()
      ),
      h("ui-stack", { spacing: "sm" },
        h("ui-header", { size: "medium" }, "What they wrote"),
        () => this.drawPostList()
      ),
      h("ui-text", { size: "small", paragraph: true },
        "From ",
        h("ui-link", { link: "https://jsonplaceholder.typicode.com" }, "JSONPlaceholder"),
        ", asked for as you look."
      )
    )
  }

  drawChecklist() {
    return h("ui-stack", { spacing: "sm", part: "checklist" },
      () => core.drawWaiting(() => h("ui-form", { "prop:value": () => this.newTodo },
        h("ui-input", {
          name: "title",
          placeholder: "Water the plants",
          "aria-label": "Something to do",
          fluid: true,
          action: true
        },
          () => core.drawWaiting(() => h("ui-button", {
            slot: "action",
            color: "primary",
            disabled: () => this.newTodo.title === "",
            onClick: core.pressed(this, async () => await this.addTheNewTodo()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Add"), "ui-button")
        )
      ), "ui-form"),
      () => this.drawTodoList()
    )
  }

  drawTodoList() {
    return core.drawRead(() => this.todos, (todo) => core.drawThing(todo), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "todo_list" },
      "Asking JSONPlaceholder"
    ), failedSay: () => "JSONPlaceholder can't be reached just now." })
  }

  drawPostList() {
    return core.drawRead(() => this.person?.posts, (post) => core.drawThing(post), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "post_list" },
      "Asking JSONPlaceholder"
    ), failedSay: () => "JSONPlaceholder can't be reached just now." })
  }
}
core.describeAction(JsonplaceholderPage, "addTheNewTodo", { title: "Add the New Todo", undoneAs: "Add the New Todo" })

// -----------
export class Forecast extends Thing {
  static { this.declareProp("latitude", { type: "number" }) }
  get latitude() { return this.getProp("latitude") }
  set latitude(value) { this.setProp("latitude", value) }

  static { this.declareProp("longitude", { type: "number" }) }
  get longitude() { return this.getProp("longitude") }
  set longitude(value) { this.setProp("longitude", value) }

  static { this.declareProp("generationtimeMs", { type: "number" }) }
  get generationtimeMs() { return this.getProp("generationtimeMs") }
  set generationtimeMs(value) { this.setProp("generationtimeMs", value) }

  static { this.declareProp("utcOffsetSeconds", { type: "number" }) }
  get utcOffsetSeconds() { return this.getProp("utcOffsetSeconds") }
  set utcOffsetSeconds(value) { this.setProp("utcOffsetSeconds", value) }

  static { this.declareProp("timezone", { type: "text" }) }
  get timezone() { return this.getProp("timezone") }
  set timezone(value) { this.setProp("timezone", value) }

  static { this.declareProp("timezoneAbbreviation", { type: "text" }) }
  get timezoneAbbreviation() { return this.getProp("timezoneAbbreviation") }
  set timezoneAbbreviation(value) { this.setProp("timezoneAbbreviation", value) }

  static { this.declareProp("elevation", { type: "number" }) }
  get elevation() { return this.getProp("elevation") }
  set elevation(value) { this.setProp("elevation", value) }

  static { this.declareProp("hours", { itemType: "Hour", storedAs: "hourly", init: () => new List({ instanceType: "Hour" }) }) }
  get hours() { return this.getProp("hours") }
  set hours(value) { this.setProp("hours", value) }

  drawHourTable() {
    return core.drawRead(() => this.hours, (hour) => [
      h("ui-cell", { "data-column": "Day" },
        () => core.drawIf(() => core.hourOf(hour.time) === 0, () => [() => core.dateShown(hour.time)])
      ),
      h("ui-cell", { "data-column": "Hour", align: "right" }, () => core.hourOf(hour.time), ":00"),
      h("ui-cell", { "data-column": "Temperature", align: "right" },
        () => core.measureShown(hour.temperature, "Temperature", "celsius")
      ),
      h("ui-cell", { "data-column": "Rain", align: "right" },
        () => core.measureShown(hour.precipitation, "Length", "millimeter")
      ),
      h("ui-cell", { "data-column": "Wind", align: "right" },
        () => core.measureShown(hour.windSpeed, "Speed", "kilometerPerHour")
      )
    ], { items: () => h("ui-table", {
      appearance: "very-basic",
      padding: "compact",
      collapsing: true,
      unstackable: true,
      part: "hour_table"
    }, h("ui-row")) })
  }

  static savedIn = {
    place: "open_meteo",
    collection: "forecasts",
    times: ["created", "modified"], select: ["latitude", "longitude", "timezone", "hours"] }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Hour extends Thing {
  static { this.declareProp("time", { type: "date" }) }
  get time() { return this.getProp("time") }
  set time(value) { this.setProp("time", value) }

  static { this.declareProp("temperature", { type: "number", storedAs: "temperature_2m" }) }
  get temperature() { return this.getProp("temperature") }
  set temperature(value) { this.setProp("temperature", value) }

  static { this.declareProp("precipitation", { type: "number" }) }
  get precipitation() { return this.getProp("precipitation") }
  set precipitation(value) { this.setProp("precipitation", value) }

  static { this.declareProp("windSpeed", { type: "number", storedAs: "wind_speed_10m" }) }
  get windSpeed() { return this.getProp("windSpeed") }
  set windSpeed(value) { this.setProp("windSpeed", value) }
}

export class OpenMeteo extends Place {}
export const openMeteo = core.place(new OpenMeteo(), {
  name: "open_meteo",
  kind: "web server",
  at: "https://api.open-meteo.com",
  checkedEvery: 30,
  namesLike: "generationtime_ms",
  collections: { forecasts: { at: "/v1/forecast?hourly=temperature_2m,precipitation,wind_speed_10m&timezone=auto&forecast_days=2", askedBy: ["latitude", "longitude"] } }
})

// -----------
export class OpenMeteoPage extends Thing {
  static { this.declareProp("cities", { itemType: "City", init: () => new List({ instanceType: "City" }) }) }
  get cities() { return this.getProp("cities") }
  set cities(value) { this.setProp("cities", value) }

  static { this.declareProp("city", { type: "City" }) }
  get city() { return this.getProp("city") }
  set city(value) { this.setProp("city", value) }

  create() {
    core.append(this.cities, new City({
      name: "Berlin",
      latitude: 52.52,
      longitude: 13.41
    }))
    core.append(this.cities, new City({
      name: "New York",
      latitude: 40.71,
      longitude: -74.01
    }))
    core.append(this.cities, new City({
      name: "Tokyo",
      latitude: 35.68,
      longitude: 139.69
    }))
    core.append(this.cities, new City({
      name: "Buenos Aires",
      latitude: -34.6,
      longitude: -58.38
    }))
    this.city = core.getItemAt(this.cities, 0)
  }

  static { this.declareProp("forecasts", { readsFrom: ["open_meteo"] }) }
  get forecasts() { return core.waitedValue(this, "forecasts", async () => {
    return await core.savedThings(Forecast, { filter: { latitude: this.city?.latitude, longitude: this.city?.longitude } })
  }, () => [this.city]) }

  static { this.declareProp("forecast", { readsFrom: ["open_meteo"] }) }
  get forecast() {
    return core.getItemAt(this.forecasts, 0)
  }

  draw() {
    return h("ui-stack", { spacing: "xl" },
      h("ui-stack", { spacing: "sm" },
        h("ui-header", { size: "large" }, "The weather, from Open-Meteo"),
        h("ui-toolbar", { appearance: "secondary", "aria-label": "Cities" },
          () => core.drawItems(this.cities)
        )
      ),
      () => this.drawForecastTable(),
      h("ui-text", { size: "small", paragraph: true },
        "From ",
        h("ui-link", { link: "https://open-meteo.com/en/docs" }, "Open-Meteo's API"),
        ", asked for as you look;  each measure in your own units."
      )
    )
  }

  drawForecastTable() { return core.drawWaiting(() => {
    if (this.forecast) {
      return h("ui-stack", { spacing: "sm", part: "forecast_table" },
        h("ui-text", { color: "grey" },
          "The next two days in ",
          () => core.whileWaiting(() => this.forecast.timezone),
          ", hour by hour."
        ),
        () => core.whileWaiting(() => this.forecast.drawHourTable())
      )
    }
    core.readRider("waiting", () => h("ui-loader", { visible: true, inline: true, text: true, part: "forecast_table" },
      "Asking Open-Meteo"
    ))
    core.readRider("failed", () => h("ui-text", { part: "forecast_table" }, "Open-Meteo can't be reached just now."))
  }) }
}

export class City extends Thing {
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("latitude", { type: "number" }) }
  get latitude() { return this.getProp("latitude") }
  set latitude(value) { this.setProp("latitude", value) }

  static { this.declareProp("longitude", { type: "number" }) }
  get longitude() { return this.getProp("longitude") }
  set longitude(value) { this.setProp("longitude", value) }

  pick() {
    publicServers.weather.city = this
  }

  draw() {
    return h("ui-item", {
      active: () => this === publicServers.weather.city,
      onClick: core.pressed(this, () => this.pick()),
      style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
    }, () => this.name)
  }
}
core.describeAction(City, "pick", { title: "Pick It", undoneAs: "Pick It" })

// -----------
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
    if (this.title && this.primaryImageSmall) {
      return h("ui-shape", { class: "artwork", direction: "over", "flip-on": "click", "aria-label": () => this.title },
        h("ui-side",
          h("ui-card", { fluid: true },
            h("ui-image", { src: () => this.primaryImageSmall, alt: () => this.title }),
            h("ui-content",
              h("ui-header", () => this.title),
              h("ui-meta", () => this.artistDisplayName)
            )
          )
        ),
        h("ui-side", () => this.drawAboutCard())
      )
    } else if (this.title) return h("slot", { name: "about_card" }, () => this.drawAboutCard())
  }

  drawAboutCard() {
    return h("ui-card", { fluid: true, part: "about_card" },
      h("ui-content",
        h("ui-header", () => this.title),
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
    times: ["created", "modified"], select: ["primaryImageSmall", "department", "title", "artistDisplayName", "objectDate", "medium", "dimensions", "creditLine", "city", "state", "region", "objectUrl"] }

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
    at: "/v1.1/search"
  },
  collections: { artworks: { at: "/v1/objects" } }
})

// -----------
export class MetMuseumPage extends Thing {
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

  async tryWords(words) {
    this.search = words
  }

  draw() {
    return h("ui-stack", { spacing: "xl" },
      h("ui-form", { class: "find", "prop:value": this },
        h("ui-stack", { spacing: "sm" },
          h("ui-stack", { direction: "horizontal", wrap: true, align: "center", justify: "between", spacing: "sm" },
            h("ui-header", { size: "large" }, "Artworks, from the Met"),
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
              onClick: core.pressed(this, async () => await this.tryWords("sunflowers")),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "Sunflowers"),
            h("ui-item", {
              onClick: core.pressed(this, async () => await this.tryWords("van gogh")),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "Van Gogh"),
            h("ui-item", {
              onClick: core.pressed(this, async () => await this.tryWords("armor")),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "Armor"),
            h("ui-item", {
              onClick: core.pressed(this, async () => await this.tryWords("egypt")),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "Egypt"),
            h("ui-item", {
              onClick: core.pressed(this, async () => await this.tryWords("cats")),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "Cats"),
            h("ui-item", {
              onClick: core.pressed(this, async () => await this.tryWords("hokusai")),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "Hokusai")
          )
        )
      ),
      () => core.drawRead(() => this.found, (artwork) => core.drawThing(artwork), {
        waitingSay: () => "Asking the Met",
        none: () => h("ui-text", "The Met has nothing for that."),
        failedSay: () => "The Met can't be reached just now.",
        paging: () => "pages",
        items: () => h("ui-cards", { layout: "mosaic", columns: "4", doubling: true })
      }),
      h("ui-text", { class: "credits", size: "small", paragraph: true },
        "From ",
        h("ui-link", { link: "https://metmuseum.github.io" }, "the Met Museum's API"),
        ", each artwork asked for as it's shown.  Press a picture to turn it over."
      )
    )
  }
}
core.describeAction(MetMuseumPage, "tryWords", { title: "Try Words", undoneAs: "Try Words" })

// -----------
export class Country extends Thing {
  static { this.declareProp("name", { type: "Name" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("tld", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get tld() { return this.getProp("tld") }
  set tld(value) { this.setProp("tld", value) }

  static { this.declareProp("cca2", { type: "text" }) }
  get cca2() { return this.getProp("cca2") }
  set cca2(value) { this.setProp("cca2", value) }

  static { this.declareProp("ccn3", { type: "text" }) }
  get ccn3() { return this.getProp("ccn3") }
  set ccn3(value) { this.setProp("ccn3", value) }

  static { this.declareProp("cca3", { type: "text" }) }
  get cca3() { return this.getProp("cca3") }
  set cca3(value) { this.setProp("cca3", value) }

  static { this.declareProp("cioc", { type: "text" }) }
  get cioc() { return this.getProp("cioc") }
  set cioc(value) { this.setProp("cioc", value) }

  static { this.declareProp("independent", { type: "choice" }) }
  get independent() { return this.getProp("independent") }
  set independent(value) { this.setProp("independent", value) }

  static { this.declareProp("status", { type: "text" }) }
  get status() { return this.getProp("status") }
  set status(value) { this.setProp("status", value) }

  static { this.declareProp("unMember", { type: "choice" }) }
  get unMember() { return this.getProp("unMember") }
  set unMember(value) { this.setProp("unMember", value) }

  static { this.declareProp("unRegionalGroup", { type: "text" }) }
  get unRegionalGroup() { return this.getProp("unRegionalGroup") }
  set unRegionalGroup(value) { this.setProp("unRegionalGroup", value) }

  static { this.declareProp("currencies", { itemType: "Currency", init: () => new List({ instanceType: "Currency" }) }) }
  get currencies() { return this.getProp("currencies") }
  set currencies(value) { this.setProp("currencies", value) }

  static { this.declareProp("idd", { type: "Idd" }) }
  get idd() { return this.getProp("idd") }
  set idd(value) { this.setProp("idd", value) }

  static { this.declareProp("capital", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get capital() { return this.getProp("capital") }
  set capital(value) { this.setProp("capital", value) }

  static { this.declareProp("altSpellings", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get altSpellings() { return this.getProp("altSpellings") }
  set altSpellings(value) { this.setProp("altSpellings", value) }

  static { this.declareProp("region", { type: "text" }) }
  get region() { return this.getProp("region") }
  set region(value) { this.setProp("region", value) }

  static { this.declareProp("subregion", { type: "text" }) }
  get subregion() { return this.getProp("subregion") }
  set subregion(value) { this.setProp("subregion", value) }

  static { this.declareProp("languages", { itemType: "Language", init: () => new List({ instanceType: "Language" }) }) }
  get languages() { return this.getProp("languages") }
  set languages(value) { this.setProp("languages", value) }

  static { this.declareProp("translations", { itemType: "Translation", init: () => new List({ instanceType: "Translation" }) }) }
  get translations() { return this.getProp("translations") }
  set translations(value) { this.setProp("translations", value) }

  static { this.declareProp("latlng", { itemType: "number", init: () => new List({ instanceType: "number" }) }) }
  get latlng() { return this.getProp("latlng") }
  set latlng(value) { this.setProp("latlng", value) }

  static { this.declareProp("landlocked", { type: "choice" }) }
  get landlocked() { return this.getProp("landlocked") }
  set landlocked(value) { this.setProp("landlocked", value) }

  static { this.declareProp("borders", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get borders() { return this.getProp("borders") }
  set borders(value) { this.setProp("borders", value) }

  static { this.declareProp("area", { type: "number" }) }
  get area() { return this.getProp("area") }
  set area(value) { this.setProp("area", value) }

  static { this.declareProp("flag", { type: "text" }) }
  get flag() { return this.getProp("flag") }
  set flag(value) { this.setProp("flag", value) }

  static { this.declareProp("demonyms", { type: "Demonym" }) }
  get demonyms() { return this.getProp("demonyms") }
  set demonyms(value) { this.setProp("demonyms", value) }

  static savedIn = {
    place: "rest_countries",
    collection: "countries",
    times: ["created", "modified"], select: ["name", "currencies", "capital", "region", "languages", "translations", "flag"] }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Name extends Thing {
  static { this.declareProp("common", { type: "text" }) }
  get common() { return this.getProp("common") }
  set common(value) { this.setProp("common", value) }

  static { this.declareProp("official", { type: "text" }) }
  get official() { return this.getProp("official") }
  set official(value) { this.setProp("official", value) }

  static { this.declareProp("native", { itemType: "Native", init: () => new List({ instanceType: "Native" }) }) }
  get native() { return this.getProp("native") }
  set native(value) { this.setProp("native", value) }
}

export class Native extends Thing {
  static { this.declareProp("code", { type: "text" }) }
  get code() { return this.getProp("code") }
  set code(value) { this.setProp("code", value) }

  static { this.declareProp("official", { type: "text" }) }
  get official() { return this.getProp("official") }
  set official(value) { this.setProp("official", value) }

  static { this.declareProp("common", { type: "text" }) }
  get common() { return this.getProp("common") }
  set common(value) { this.setProp("common", value) }
}

export class Currency extends Thing {
  static { this.declareProp("code", { type: "text" }) }
  get code() { return this.getProp("code") }
  set code(value) { this.setProp("code", value) }

  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("symbol", { type: "text" }) }
  get symbol() { return this.getProp("symbol") }
  set symbol(value) { this.setProp("symbol", value) }

  draw() {
    return h("ui-text",
      () => this.name,
      " (",
      () => this.symbol,
      ") ",
      h("ui-text", { color: "grey" }, () => this.code)
    )
  }
}

export class Idd extends Thing {
  static { this.declareProp("root", { type: "text" }) }
  get root() { return this.getProp("root") }
  set root(value) { this.setProp("root", value) }

  static { this.declareProp("suffixes", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get suffixes() { return this.getProp("suffixes") }
  set suffixes(value) { this.setProp("suffixes", value) }
}

export class Language extends Thing {
  static { this.declareProp("code", { type: "text" }) }
  get code() { return this.getProp("code") }
  set code(value) { this.setProp("code", value) }

  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  draw() {
    return h("ui-text", () => this.name)
  }
}

export class Translation extends Thing {
  static { this.declareProp("code", { type: "text" }) }
  get code() { return this.getProp("code") }
  set code(value) { this.setProp("code", value) }

  static { this.declareProp("official", { type: "text" }) }
  get official() { return this.getProp("official") }
  set official(value) { this.setProp("official", value) }

  static { this.declareProp("common", { type: "text" }) }
  get common() { return this.getProp("common") }
  set common(value) { this.setProp("common", value) }
}

export class Demonym extends Thing {
  static { this.declareProp("eng", { type: "Eng" }) }
  get eng() { return this.getProp("eng") }
  set eng(value) { this.setProp("eng", value) }

  static { this.declareProp("fra", { type: "Fra" }) }
  get fra() { return this.getProp("fra") }
  set fra(value) { this.setProp("fra", value) }
}

export class Eng extends Thing {
  static { this.declareProp("f", { type: "text" }) }
  get f() { return this.getProp("f") }
  set f(value) { this.setProp("f", value) }

  static { this.declareProp("m", { type: "text" }) }
  get m() { return this.getProp("m") }
  set m(value) { this.setProp("m", value) }
}

export class Fra extends Thing {
  static { this.declareProp("f", { type: "text" }) }
  get f() { return this.getProp("f") }
  set f(value) { this.setProp("f", value) }

  static { this.declareProp("m", { type: "text" }) }
  get m() { return this.getProp("m") }
  set m(value) { this.setProp("m", value) }
}

export class RestCountry extends Place {}
export const restCountries = core.place(new RestCountry(), {
  name: "rest_countries",
  kind: "web server",
  at: "https://cdn.jsdelivr.net/gh/mledoze/countries@5.1.0",
  checkedEvery: 30,
  collections: { countries: { at: "/countries.json" } }
})

// -----------
export class RestCountriesPage extends Thing {
  static { this.declareProp("region", { type: "text" }) }
  get region() { return this.getProp("region") }
  set region(value) { this.setProp("region", value) }

  static { this.declareProp("language", { type: "text" }) }
  get language() { return this.getProp("language") }
  set language(value) { this.setProp("language", value) }

  create() {
    this.region = "Europe"
    this.language = "fra"
  }

  static { this.declareProp("countries", { readsFrom: ["rest_countries"] }) }
  get countries() { return core.waitedValue(this, "countries", async () => {
    return core.sortedBy(core.filter(await core.savedThings(Country, {}, "looks through"), (country) => country.region === this.region), (item) => item.name?.common)
  }, () => [this.region]) }

  pickRegionRegion(region) {
    this.region = region
  }

  draw() {
    return h("ui-stack", { spacing: "xl" },
      h("ui-stack", { spacing: "sm" },
        h("ui-form", { "prop:value": this },
          h("ui-stack", { direction: "horizontal", wrap: true, align: "center", justify: "between", spacing: "sm" },
            h("ui-header", { size: "large" }, "The world's countries, from REST Countries"),
            h("ui-select", { name: "language", "aria-label": "Names in" },
              h("ui-item", { value: "fra" }, "Français"),
              h("ui-item", { value: "spa" }, "Español"),
              h("ui-item", { value: "deu" }, "Deutsch"),
              h("ui-item", { value: "jpn" }, "日本語")
            )
          )
        ),
        h("ui-toolbar", { appearance: "secondary", "aria-label": "Regions" },
          h("ui-item", {
            active: () => this.region === "Africa",
            onClick: core.pressed(this, () => this.pickRegionRegion("Africa")),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Africa"),
          h("ui-item", {
            active: () => this.region === "Americas",
            onClick: core.pressed(this, () => this.pickRegionRegion("Americas")),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "The Americas"),
          h("ui-item", {
            active: () => this.region === "Asia",
            onClick: core.pressed(this, () => this.pickRegionRegion("Asia")),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Asia"),
          h("ui-item", {
            active: () => this.region === "Europe",
            onClick: core.pressed(this, () => this.pickRegionRegion("Europe")),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Europe"),
          h("ui-item", {
            active: () => this.region === "Oceania",
            onClick: core.pressed(this, () => this.pickRegionRegion("Oceania")),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Oceania"),
          h("ui-item", {
            active: () => this.region === "Antarctic",
            onClick: core.pressed(this, () => this.pickRegionRegion("Antarctic")),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "The Antarctic")
        )
      ),
      () => this.drawCountriesTable(),
      h("ui-text", { size: "small", paragraph: true },
        "From ",
        h("ui-link", { link: "https://github.com/mledoze/countries" }, "the data REST Countries serves"),
        ", every country in one request."
      )
    )
  }

  drawCountriesTable() {
    return core.drawRead(() => this.countries, (country) => [
      h("ui-cell", { "data-column": "Flag", align: "center" },
        h("ui-text", { size: "big" }, () => country.flag)
      ),
      h("ui-cell", { "data-column": "Country", header: true }, () => country.name?.common),
      h("ui-cell", { "data-column": "Its name there" },
        () => core.getItemAt(core.filter(country.translations, (translation) => translation.code === publicServers.atlas.language), 0)?.common
      ),
      h("ui-cell", { "data-column": "Capital" }, () => core.getItemAt(country.capital, 0)),
      h("ui-cell", { "data-column": "Money" },
        h("ui-stack", { spacing: "none" }, () => core.drawItems(country.currencies))
      ),
      h("ui-cell", { "data-column": "Languages" },
        h("ui-stack", { direction: "horizontal", wrap: true, spacing: "xs" },
          () => core.drawItems(country.languages)
        )
      )
    ], {
      waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "countries_table" },
        "Asking REST Countries"
      ),
      failedSay: () => "REST Countries can't be reached just now.",
      items: () => h("ui-table", { appearance: "very-basic", padding: "compact", "vertical-align": "top", part: "countries_table" },
        h("ui-row")
      )
    })
  }
}
core.describeAction(RestCountriesPage, "pickRegionRegion", { title: "Pick Region Region", undoneAs: "Pick Region Region" })

// -----------
export class PublicServer extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  static { this.declareProp("tab", { type: "text" }) }
  get tab() { return this.getProp("tab") }
  set tab(value) { this.setProp("tab", value) }

  static { this.declareProp("github", { init: () => new GithubPage({ id: "github" }), early: true }) }
  get github() { return this.getProp("github") }
  set github(value) { this.setProp("github", value) }

  static { this.declareProp("library", { init: () => new OpenLibraryPage({ id: "library" }), early: true }) }
  get library() { return this.getProp("library") }
  set library(value) { this.setProp("library", value) }

  static { this.declareProp("weather", { init: () => new OpenMeteoPage({ id: "weather" }), early: true }) }
  get weather() { return this.getProp("weather") }
  set weather(value) { this.setProp("weather", value) }

  static { this.declareProp("museum", { init: () => new MetMuseumPage({ id: "museum" }), early: true }) }
  get museum() { return this.getProp("museum") }
  set museum(value) { this.setProp("museum", value) }

  static { this.declareProp("atlas", { init: () => new RestCountriesPage({ id: "atlas" }), early: true }) }
  get atlas() { return this.getProp("atlas") }
  set atlas(value) { this.setProp("atlas", value) }

  create() {
    this.tab = "github"
  }

  draw() {
    return h("ui-container",
      h("ui-stack", { spacing: "lg" },
        h("ui-form", { "prop:value": this },
          h("ui-tabs", { name: "tab", parameter: "server", appearance: "secondary pointing basic", "aria-label": "Servers" },
            h("ui-tab", { label: "GitHub", value: "github" }),
            h("ui-tab", { label: "Open Library", value: "library" }),
            h("ui-tab", { label: "JSONPlaceholder", value: "jsonplaceholder" }),
            h("ui-tab", { label: "Open-Meteo", value: "weather" }),
            h("ui-tab", { label: "The Met", value: "met" }),
            h("ui-tab", { label: "REST Countries", value: "countries" })
          )
        ),
        () => this.drawServer()
      )
    )
  }

  drawServer() {
    if (this.tab === "github") return core.drawThing(this.github)
    else if (this.tab === "library") return core.drawThing(this.library)
    else if (this.tab === "jsonplaceholder") return core.drawThing(new JsonplaceholderPage())
    else if (this.tab === "weather") return core.drawThing(this.weather)
    else if (this.tab === "met") return core.drawThing(this.museum)
    else if (this.tab === "countries") return core.drawThing(this.atlas)
  }
}
export const publicServers = new PublicServer()
// -----------
if (!core.isCarryingOver) publicServers.start()
