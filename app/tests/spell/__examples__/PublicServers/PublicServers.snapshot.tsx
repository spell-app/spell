import { core, Thing, List, App, Place, prop, thing, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("GitHub:  a repository's issues, the people who wrote it, anyone by their login, and a search of people and repositories")
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ## GitHub:  a repository's issues, the people who wrote it, anyone by their login, and a search of people and repositories
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// A server other people run, and what it holds.  What's drawn from it is in GitHub.spell.
// `github` is what this wrote, from looking at the server:
//   spell place ingest https://api.github.com --into GitHub.api.spell --name github --no-ai --key-secret GITHUB_TOKEN
//     --collections "issues=/repos/solidjs/solid/issues,contributors=/repos/solidjs/solid/contributors,users=/users/{name},
//       users=/search/users?q=ryansolid,repositories=/search/repositories?q=solid"
//     --samples ryansolid,solidjs,octocat
// `spell place update GitHub.api.spell` looks again, and changes only this file and GitHub.api.json5.
// Its key is your own, named GITHUB_TOKEN, read from the environment and never written here (`gh auth token` gives one).
// Without it, GitHub answers 60 requests an hour;  with it, 5000.  A page in a browser always goes without.
// Its searches have a limit of their own:  10 a minute without a key, 30 with one.
// People and organizations are both users here:  their "kind" says which.

export class Issue extends Thing {
  // - its "url" is an issue
  static { this.declareProp("url", { type: "Issue", link: true, declaredAt: { path: "/GitHub.api.spell", start: 1737, end: 1758 } }) }
  get url(): Issue { return core.linked(this, "url", Issue) as Issue }
  set url(value: Issue) { this.setProp("url", value) }

  /** an address */
  // - its "repository url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1760, end: 1804 } })
  accessor repositoryUrl!: string

  /** an address */
  // - its "labels url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1806, end: 1846 } })
  accessor labelsUrl!: string

  /** an address */
  // - its "comments url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1848, end: 1890 } })
  accessor commentsUrl!: string

  /** an address */
  // - its "events url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1892, end: 1932 } })
  accessor eventsUrl!: string

  /** an address */
  // - its "html url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1934, end: 1972 } })
  accessor htmlUrl!: string

  // - its "node id" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 1974, end: 1995 } })
  accessor nodeId!: string

  // - its "number" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 1997, end: 2021 } })
  accessor number!: number

  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2023, end: 2042 } })
  accessor title!: string

  // - its "user" is an issue user
  @prop({ type: "IssueUser", declaredAt: { path: "/GitHub.api.spell", start: 2044, end: 2071 } })
  accessor user!: IssueUser

  // - its "labels" is a list of labels
  @prop({ itemType: "Label", init: () => new List<Label>({ instanceType: "Label" }), declaredAt: { path: "/GitHub.api.spell", start: 2073, end: 2105 } })
  accessor labels!: List<Label>

  // - its "state" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2107, end: 2126 } })
  accessor state!: string

  // - its "locked" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 2128, end: 2153 } })
  accessor locked!: boolean

  // - its "assignees" is a list of assignees
  @prop({ itemType: "Assignee", init: () => new List<Assignee>({ instanceType: "Assignee" }), declaredAt: { path: "/GitHub.api.spell", start: 2155, end: 2193 } })
  accessor assignees!: List<Assignee>

  // - its "comments" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 2195, end: 2221 } })
  accessor comments!: number

  // - its "created at" is a date
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 2223, end: 2249 } })
  accessor createdAt!: Date

  // - its "updated at" is a date
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 2251, end: 2277 } })
  accessor updatedAt!: Date

  // - its "author association" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2279, end: 2311 } })
  accessor authorAssociation!: string

  // - its "issue field values" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/GitHub.api.spell", start: 2313, end: 2355 } })
  accessor issueFieldValues!: List<string>

  // - its "sub issues summary" is a sub issues summary
  @prop({ type: "SubIssuesSummary", declaredAt: { path: "/GitHub.api.spell", start: 2357, end: 2405 } })
  accessor subIssuesSummary!: SubIssuesSummary

  // - its "issue dependencies summary" is an issue dependencies summary
  @prop({ type: "IssueDependenciesSummary", declaredAt: { path: "/GitHub.api.spell", start: 2407, end: 2472 } })
  accessor issueDependenciesSummary!: IssueDependenciesSummary

  // - its "body" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2474, end: 2492 } })
  accessor body!: string

  // - its "reactions" is a reaction
  @prop({ type: "Reaction", declaredAt: { path: "/GitHub.api.spell", start: 2494, end: 2523 } })
  accessor reactions!: Reaction

  /** an address */
  // - its "timeline url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2525, end: 2567 } })
  accessor timelineUrl!: string

  // - its "performed via github app" is a performed via github app
  @prop({ type: "PerformedViaGithubApp", declaredAt: { path: "/GitHub.api.spell", start: 2569, end: 2629 } })
  accessor performedViaGithubApp!: PerformedViaGithubApp

  // - its "state reason" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2631, end: 2657 } })
  accessor stateReason!: string

  // - its "draft" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 2659, end: 2683 } })
  accessor draft!: boolean

  // - its "pull request" is a pull request
  @prop({ type: "PullRequest", declaredAt: { path: "/GitHub.api.spell", start: 2685, end: 2721 } })
  accessor pullRequest!: PullRequest

  // - its "assignee" is an assignee
  @prop({ type: "Assignee", declaredAt: { path: "/GitHub.api.spell", start: 2723, end: 2752 } })
  accessor assignee!: Assignee

  @drawn draw() {
    return (
      <ui-card>
        <ui-content>
          <ui-header>
            {this.title}
            <ui-link link={this.htmlUrl} target="_blank" aria-label="On GitHub">
              <ui-icon name="github" />
            </ui-link>
          </ui-header>
          <ui-meta>#{this.number} · {this.state}</ui-meta>
        </ui-content>
      </ui-card>
    )
  }

  static savedIn = {
    place: "github",
    collection: "issues",
    times: ["created", "modified"], select: ["htmlUrl", "number", "title", "state", "comments", "createdAt", "body", "pullRequest"] }

  // - it lives in github
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 1717, end: 1735 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in github
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 1717, end: 1735 } })
  accessor modified!: any /* spell: type unknown */
}

export class Contributor extends Thing {
  // - its "login" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2802, end: 2821 } })
  accessor login!: string

  // - its "node id" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2823, end: 2844 } })
  accessor nodeId!: string

  /** an address */
  // - its "avatar url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2846, end: 2886 } })
  accessor avatarUrl!: string

  // - its "gravatar id" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2888, end: 2913 } })
  accessor gravatarId!: string

  /** an address */
  // - its "url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2915, end: 2948 } })
  accessor url!: string

  /** an address */
  // - its "html url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2950, end: 2988 } })
  accessor htmlUrl!: string

  /** an address */
  // - its "followers url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 2990, end: 3033 } })
  accessor followersUrl!: string

  /** an address */
  // - its "following url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3035, end: 3078 } })
  accessor followingUrl!: string

  /** an address */
  // - its "gists url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3080, end: 3119 } })
  accessor gistsUrl!: string

  /** an address */
  // - its "starred url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3121, end: 3162 } })
  accessor starredUrl!: string

  /** an address */
  // - its "subscriptions url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3164, end: 3211 } })
  accessor subscriptionsUrl!: string

  /** an address */
  // - its "organizations url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3213, end: 3260 } })
  accessor organizationsUrl!: string

  /** an address */
  // - its "repos url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3262, end: 3301 } })
  accessor reposUrl!: string

  /** an address */
  // - its "events url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3303, end: 3343 } })
  accessor eventsUrl!: string

  /** an address */
  // - its "received events url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3345, end: 3394 } })
  accessor receivedEventsUrl!: string

  // - its "kind" is text, stored as "type"
  @prop({ type: "text", storedAs: "type", declaredAt: { path: "/GitHub.api.spell", start: 3396, end: 3432 } })
  accessor kind!: string

  // - its "user view type" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3434, end: 3462 } })
  accessor userViewType!: string

  // - its "site admin" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 3464, end: 3493 } })
  accessor siteAdmin!: boolean

  // - its "contributions" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 3495, end: 3526 } })
  accessor contributions!: number

  static savedIn = {
    place: "github",
    collection: "contributors",
    times: ["created", "modified"], select: ["login", "avatarUrl", "htmlUrl", "kind"] }

  // - it lives in github
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 2782, end: 2800 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in github
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 2782, end: 2800 } })
  accessor modified!: any /* spell: type unknown */
}

export class User extends Thing {
  // - its "login" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3569, end: 3588 } })
  accessor login!: string

  // - its "number" is a number, stored as "id"
  @prop({ type: "number", storedAs: "id", declaredAt: { path: "/GitHub.api.spell", start: 3590, end: 3630 } })
  accessor number!: number

  // - its "node id" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3632, end: 3653 } })
  accessor nodeId!: string

  /** an address */
  // - its "avatar url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3655, end: 3695 } })
  accessor avatarUrl!: string

  // - its "gravatar id" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3697, end: 3722 } })
  accessor gravatarId!: string

  /** an address */
  // - its "url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3724, end: 3757 } })
  accessor url!: string

  /** an address */
  // - its "html url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3759, end: 3797 } })
  accessor htmlUrl!: string

  /** an address */
  // - its "followers url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3799, end: 3842 } })
  accessor followersUrl!: string

  /** an address */
  // - its "following url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3844, end: 3887 } })
  accessor followingUrl!: string

  /** an address */
  // - its "gists url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3889, end: 3928 } })
  accessor gistsUrl!: string

  /** an address */
  // - its "starred url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3930, end: 3971 } })
  accessor starredUrl!: string

  /** an address */
  // - its "subscriptions url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 3973, end: 4020 } })
  accessor subscriptionsUrl!: string

  /** an address */
  // - its "organizations url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4022, end: 4069 } })
  accessor organizationsUrl!: string

  /** an address */
  // - its "repos url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4071, end: 4110 } })
  accessor reposUrl!: string

  /** an address */
  // - its "events url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4112, end: 4152 } })
  accessor eventsUrl!: string

  /** an address */
  // - its "received events url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4154, end: 4203 } })
  accessor receivedEventsUrl!: string

  // - its "kind" is text, stored as "type"
  @prop({ type: "text", storedAs: "type", declaredAt: { path: "/GitHub.api.spell", start: 4205, end: 4241 } })
  accessor kind!: string

  // - its "user view type" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4243, end: 4271 } })
  accessor userViewType!: string

  // - its "site admin" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 4273, end: 4302 } })
  accessor siteAdmin!: boolean

  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4304, end: 4322 } })
  accessor name!: string

  // - its "company" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4324, end: 4345 } })
  accessor company!: string

  /** an address */
  // - its "blog" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4347, end: 4381 } })
  accessor blog!: string

  // - its "location" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4383, end: 4405 } })
  accessor location!: string

  // - its "email" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4407, end: 4426 } })
  accessor email!: string

  // - its "twitter username" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4428, end: 4458 } })
  accessor twitterUsername!: string

  // - its "public repos" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 4460, end: 4490 } })
  accessor publicRepos!: number

  // - its "public gists" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 4492, end: 4522 } })
  accessor publicGists!: number

  // - its "followers" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 4524, end: 4551 } })
  accessor followers!: number

  // - its "following" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 4553, end: 4580 } })
  accessor following!: number

  // - its "created at" is a date
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 4582, end: 4608 } })
  accessor createdAt!: Date

  // - its "updated at" is a date
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 4610, end: 4636 } })
  accessor updatedAt!: Date

  // - its "bio" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 4638, end: 4655 } })
  accessor bio!: string

  /** Their own page, in the GitHub tab */
  async lookAtUser() {
    publicServers.github.showing = this
  }

  /** Put their page away again, with its Back button */
  async lookAwayFromUser() {
    publicServers.github.showing = undefined
  }

  @drawn draw() {
    return (
      <ui-card onClick={core.pressed(this, async () => await this.lookAtUser())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
        <ui-content>
          <ui-stack direction="horizontal" align="center" spacing="sm">
            <ui-image src={this.avatarUrl} alt="" size="mini" appearance="circular" />
            <ui-stack spacing="none" align="start">
              <ui-header>
                {this.login}
                <ui-link link={this.htmlUrl} target="_blank" aria-label="On GitHub">
                  <ui-icon name="github" />
                </ui-link>
              </ui-header>
              <ui-meta>{this.kind}</ui-meta>
            </ui-stack>
          </ui-stack>
        </ui-content>
      </ui-card>
    )
  }

  drawPage() {
    return (
      <ui-stack spacing="xl" part="page">
        <ui-stack direction="horizontal" align="center" spacing="sm">
          <ui-button icon="arrow left" appearance="basic" aria-label="Back" title="Back" onClick={core.pressed(this, async () => await this.lookAwayFromUser())} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
          <ui-header size="large">
            {this.name ? this.name : this.login}
            <ui-link link={this.htmlUrl} target="_blank" aria-label="On GitHub">
              <ui-icon name="github" />
            </ui-link>
          </ui-header>
        </ui-stack>
        <ui-stack direction="horizontal" wrap={true} align="start" spacing="md">
          <ui-image src={this.avatarUrl} alt="" size="small" appearance="rounded" />
          <ui-stack spacing="sm">
            <ui-text color="grey">{this.login} · {this.kind}</ui-text>
            {core.drawIf(() => this.bio, () => <>
              <ui-text>{this.bio}</ui-text>
            </>)}
            {core.drawIf(() => core.dateShown(this.createdAt), () => <>
              <ui-text size="small" color="grey">
                {this.publicRepos}
                {" public repositories · "}
                {this.followers}
                {" followers"}
              </ui-text>
            </>)}
          </ui-stack>
        </ui-stack>
        <ui-stack spacing="sm">
          <ui-header size="medium">Most popular</ui-header>
          {core.drawRead(async () => await core.savedThings(Repository, { search: { "*": `user:${this.login} sort:stars` } }, "as drawn"), (repository: Repository) => core.drawThing(repository), {
            waitingSay: () => "Asking GitHub",
            none: () => <ui-text part="page">{"Nothing public yet."}</ui-text>,
            paging: () => "pages",
            items: () => <ui-cards columns="3" doubling={true} stackable={true} part="page" />
          })}
        </ui-stack>
      </ui-stack>
    )
  }

  static savedIn = {
    place: "github",
    collection: "users",
    times: ["created", "modified"], select: ["login", "number", "avatarUrl", "htmlUrl", "kind", "name", "email", "publicRepos", "followers", "createdAt", "bio"] }

  // - it lives in github
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 3549, end: 3567 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in github
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 3549, end: 3567 } })
  accessor modified!: any /* spell: type unknown */
}
core.describeAction(User, "lookAtUser", { title: "Look at It", undoneAs: "Look at It" })
core.describeAction(User, "lookAwayFromUser", { title: "Look Away from It", undoneAs: "Look Away from It" })

export class IssueUser extends Thing {
  // - its "login" is text
  @prop({ type: "text" })
  accessor login!: string

  // - its "number" is a number, stored as "id"
  @prop({ type: "number", storedAs: "id" })
  accessor number!: number

  // - its "node id" is text
  @prop({ type: "text" })
  accessor nodeId!: string

  /** an address */
  // - its "avatar url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor avatarUrl!: string

  // - its "gravatar id" is text
  @prop({ type: "text" })
  accessor gravatarId!: string

  /** an address */
  // - its "url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor url!: string

  /** an address */
  // - its "html url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor htmlUrl!: string

  /** an address */
  // - its "followers url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor followersUrl!: string

  /** an address */
  // - its "following url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor followingUrl!: string

  /** an address */
  // - its "gists url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor gistsUrl!: string

  /** an address */
  // - its "starred url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor starredUrl!: string

  /** an address */
  // - its "subscriptions url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor subscriptionsUrl!: string

  /** an address */
  // - its "organizations url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor organizationsUrl!: string

  /** an address */
  // - its "repos url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor reposUrl!: string

  /** an address */
  // - its "events url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor eventsUrl!: string

  /** an address */
  // - its "received events url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor receivedEventsUrl!: string

  // - its "kind" is text, stored as "type"
  @prop({ type: "text", storedAs: "type" })
  accessor kind!: string

  // - its "user view type" is text
  @prop({ type: "text" })
  accessor userViewType!: string

  // - its "site admin" is yes or no
  @prop({ type: "choice" })
  accessor siteAdmin!: boolean
}

export class Label extends Thing {
  // - its "number" is a number, stored as "id"
  @prop({ type: "number", storedAs: "id" })
  accessor number!: number

  // - its "node id" is text
  @prop({ type: "text" })
  accessor nodeId!: string

  /** an address */
  // - its "url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor url!: string

  // - its "name" is text
  @prop({ type: "text" })
  accessor name!: string

  // - its "color" is text
  @prop({ type: "text" })
  accessor color!: string

  // - its "default" is yes or no
  @prop({ type: "choice" })
  accessor default!: boolean

  // - its "description" is text
  @prop({ type: "text" })
  accessor description!: string
}

export class SubIssuesSummary extends Thing {
  // - its "total" is a number
  @prop({ type: "number" })
  accessor total!: number

  // - its "completed" is a number
  @prop({ type: "number" })
  accessor completed!: number

  // - its "percent completed" is a number
  @prop({ type: "number" })
  accessor percentCompleted!: number
}

export class IssueDependenciesSummary extends Thing {
  // - its "blocked by" is a number
  @prop({ type: "number" })
  accessor blockedBy!: number

  // - its "total blocked by" is a number
  @prop({ type: "number" })
  accessor totalBlockedBy!: number

  // - its "blocking" is a number
  @prop({ type: "number" })
  accessor blocking!: number

  // - its "total blocking" is a number
  @prop({ type: "number" })
  accessor totalBlocking!: number
}

export class Reaction extends Thing {
  /** an address */
  // - its "url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor url!: string

  // - its "total count" is a number
  @prop({ type: "number" })
  accessor totalCount!: number

  // - its "laugh" is a number
  @prop({ type: "number" })
  accessor laugh!: number

  // - its "hooray" is a number
  @prop({ type: "number" })
  accessor hooray!: number

  // - its "confused" is a number
  @prop({ type: "number" })
  accessor confused!: number

  // - its "heart" is a number
  @prop({ type: "number" })
  accessor heart!: number

  // - its "rocket" is a number
  @prop({ type: "number" })
  accessor rocket!: number

  // - its "eyes" is a number
  @prop({ type: "number" })
  accessor eyes!: number
}

export class PerformedViaGithubApp extends Thing {
  // - its "number" is a number, stored as "id"
  @prop({ type: "number", storedAs: "id" })
  accessor number!: number

  // - its "client id" is text
  @prop({ type: "text" })
  accessor clientId!: string

  // - its "slug" is text
  @prop({ type: "text" })
  accessor slug!: string

  // - its "node id" is text
  @prop({ type: "text" })
  accessor nodeId!: string

  // - its "owner" is an owner
  @prop({ type: "Owner" })
  accessor owner!: Owner

  // - its "name" is text
  @prop({ type: "text" })
  accessor name!: string

  // - its "description" is text
  @prop({ type: "text" })
  accessor description!: string

  /** an address */
  // - its "external url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor externalUrl!: string

  /** an address */
  // - its "html url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor htmlUrl!: string

  // - its "created at" is a date
  @prop({ type: "date" })
  accessor createdAt!: Date

  // - its "updated at" is a date
  @prop({ type: "date" })
  accessor updatedAt!: Date

  // - its "permissions" is a permission
  @prop({ type: "Permission" })
  accessor permissions!: Permission

  // - its "events" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }) })
  accessor events!: List<string>
}

export class Owner extends Thing {
  // - its "login" is text
  @prop({ type: "text" })
  accessor login!: string

  // - its "number" is a number, stored as "id"
  @prop({ type: "number", storedAs: "id" })
  accessor number!: number

  // - its "node id" is text
  @prop({ type: "text" })
  accessor nodeId!: string

  /** an address */
  // - its "avatar url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor avatarUrl!: string

  // - its "gravatar id" is text
  @prop({ type: "text" })
  accessor gravatarId!: string

  /** an address */
  // - its "url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor url!: string

  /** an address */
  // - its "html url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor htmlUrl!: string

  /** an address */
  // - its "followers url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor followersUrl!: string

  /** an address */
  // - its "following url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor followingUrl!: string

  /** an address */
  // - its "gists url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor gistsUrl!: string

  /** an address */
  // - its "starred url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor starredUrl!: string

  /** an address */
  // - its "subscriptions url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor subscriptionsUrl!: string

  /** an address */
  // - its "organizations url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor organizationsUrl!: string

  /** an address */
  // - its "repos url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor reposUrl!: string

  /** an address */
  // - its "events url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor eventsUrl!: string

  /** an address */
  // - its "received events url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor receivedEventsUrl!: string

  // - its "kind" is text, stored as "type"
  @prop({ type: "text", storedAs: "type" })
  accessor kind!: string

  // - its "user view type" is text
  @prop({ type: "text" })
  accessor userViewType!: string

  // - its "site admin" is yes or no
  @prop({ type: "choice" })
  accessor siteAdmin!: boolean
}

export class Permission extends Thing {
  // - its "actions" is text
  @prop({ type: "text" })
  accessor actions!: string

  // - its "administration" is text
  @prop({ type: "text" })
  accessor administration!: string

  // - its "checks" is text
  @prop({ type: "text" })
  accessor checks!: string

  // - its "contents" is text
  @prop({ type: "text" })
  accessor contents!: string

  // - its "discussions" is text
  @prop({ type: "text" })
  accessor discussions!: string

  // - its "issues" is text
  @prop({ type: "text" })
  accessor issues!: string

  // - its "members" is text
  @prop({ type: "text" })
  accessor members!: string

  // - its "merge queues" is text
  @prop({ type: "text" })
  accessor mergeQueues!: string

  // - its "metadata" is text
  @prop({ type: "text" })
  accessor metadata!: string

  // - its "pull requests" is text
  @prop({ type: "text" })
  accessor pullRequests!: string

  // - its "repository hooks" is text
  @prop({ type: "text" })
  accessor repositoryHooks!: string

  // - its "statuses" is text
  @prop({ type: "text" })
  accessor statuses!: string

  // - its "workflows" is text
  @prop({ type: "text" })
  accessor workflows!: string

  // - its "repository creation" is text
  @prop({ type: "text" })
  accessor repositoryCreation!: string
}

export class PullRequest extends Thing {
  /** an address */
  // - its "url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor url!: string

  /** an address */
  // - its "html url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor htmlUrl!: string

  /** an address */
  // - its "diff url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor diffUrl!: string

  /** an address */
  // - its "patch url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor patchUrl!: string
}

export class Repository extends Thing {
  // - its "node id" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 7996, end: 8017 } })
  accessor nodeId!: string

  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8019, end: 8037 } })
  accessor name!: string

  // - its "full name" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8039, end: 8062 } })
  accessor fullName!: string

  // - its "private" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 8064, end: 8090 } })
  accessor private!: boolean

  // - its "owner" is an owner
  @prop({ type: "Owner", declaredAt: { path: "/GitHub.api.spell", start: 8092, end: 8115 } })
  accessor owner!: Owner

  /** an address */
  // - its "html url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8117, end: 8155 } })
  accessor htmlUrl!: string

  // - its "description" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8157, end: 8182 } })
  accessor description!: string

  // - its "fork" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 8184, end: 8207 } })
  accessor fork!: boolean

  /** an address */
  // - its "url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8209, end: 8242 } })
  accessor url!: string

  /** an address */
  // - its "forks url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8244, end: 8283 } })
  accessor forksUrl!: string

  /** an address */
  // - its "keys url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8285, end: 8323 } })
  accessor keysUrl!: string

  /** an address */
  // - its "collaborators url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8325, end: 8372 } })
  accessor collaboratorsUrl!: string

  /** an address */
  // - its "teams url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8374, end: 8413 } })
  accessor teamsUrl!: string

  /** an address */
  // - its "hooks url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8415, end: 8454 } })
  accessor hooksUrl!: string

  /** an address */
  // - its "issue events url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8456, end: 8502 } })
  accessor issueEventsUrl!: string

  /** an address */
  // - its "events url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8504, end: 8544 } })
  accessor eventsUrl!: string

  /** an address */
  // - its "assignees url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8546, end: 8589 } })
  accessor assigneesUrl!: string

  /** an address */
  // - its "branches url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8591, end: 8633 } })
  accessor branchesUrl!: string

  /** an address */
  // - its "tags url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8635, end: 8673 } })
  accessor tagsUrl!: string

  /** an address */
  // - its "blobs url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8675, end: 8714 } })
  accessor blobsUrl!: string

  /** an address */
  // - its "git tags url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8716, end: 8758 } })
  accessor gitTagsUrl!: string

  /** an address */
  // - its "git refs url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8760, end: 8802 } })
  accessor gitRefsUrl!: string

  /** an address */
  // - its "trees url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8804, end: 8843 } })
  accessor treesUrl!: string

  /** an address */
  // - its "statuses url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8845, end: 8887 } })
  accessor statusesUrl!: string

  /** an address */
  // - its "languages url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8889, end: 8932 } })
  accessor languagesUrl!: string

  /** an address */
  // - its "stargazers url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8934, end: 8978 } })
  accessor stargazersUrl!: string

  /** an address */
  // - its "contributors url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 8980, end: 9026 } })
  accessor contributorsUrl!: string

  /** an address */
  // - its "subscribers url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9028, end: 9073 } })
  accessor subscribersUrl!: string

  /** an address */
  // - its "subscription url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9075, end: 9121 } })
  accessor subscriptionUrl!: string

  /** an address */
  // - its "commits url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9123, end: 9164 } })
  accessor commitsUrl!: string

  /** an address */
  // - its "git commits url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9166, end: 9211 } })
  accessor gitCommitsUrl!: string

  /** an address */
  // - its "comments url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9213, end: 9255 } })
  accessor commentsUrl!: string

  /** an address */
  // - its "issue comment url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9257, end: 9304 } })
  accessor issueCommentUrl!: string

  /** an address */
  // - its "contents url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9306, end: 9348 } })
  accessor contentsUrl!: string

  /** an address */
  // - its "compare url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9350, end: 9391 } })
  accessor compareUrl!: string

  /** an address */
  // - its "merges url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9393, end: 9433 } })
  accessor mergesUrl!: string

  /** an address */
  // - its "archive url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9435, end: 9476 } })
  accessor archiveUrl!: string

  /** an address */
  // - its "downloads url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9478, end: 9521 } })
  accessor downloadsUrl!: string

  /** an address */
  // - its "issues url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9523, end: 9563 } })
  accessor issuesUrl!: string

  /** an address */
  // - its "pulls url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9565, end: 9604 } })
  accessor pullsUrl!: string

  /** an address */
  // - its "milestones url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9606, end: 9650 } })
  accessor milestonesUrl!: string

  /** an address */
  // - its "notifications url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9652, end: 9699 } })
  accessor notificationsUrl!: string

  /** an address */
  // - its "labels url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9701, end: 9741 } })
  accessor labelsUrl!: string

  /** an address */
  // - its "releases url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9743, end: 9785 } })
  accessor releasesUrl!: string

  /** an address */
  // - its "deployments url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9787, end: 9832 } })
  accessor deploymentsUrl!: string

  // - its "created at" is a date
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 9834, end: 9860 } })
  accessor createdAt!: Date

  // - its "updated at" is a date
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 9862, end: 9888 } })
  accessor updatedAt!: Date

  // - its "pushed at" is a date
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 9890, end: 9915 } })
  accessor pushedAt!: Date

  // - its "git url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9917, end: 9938 } })
  accessor gitUrl!: string

  // - its "ssh url" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9940, end: 9961 } })
  accessor sshUrl!: string

  /** an address */
  // - its "clone url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 9963, end: 10002 } })
  accessor cloneUrl!: string

  /** an address */
  // - its "svn url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 10004, end: 10041 } })
  accessor svnUrl!: string

  // - its "homepage" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 10043, end: 10065 } })
  accessor homepage!: string

  // - its "size" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 10067, end: 10089 } })
  accessor size!: number

  // - its "stargazers count" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 10091, end: 10125 } })
  accessor stargazersCount!: number

  // - its "watchers count" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 10127, end: 10159 } })
  accessor watchersCount!: number

  // - its "language" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 10161, end: 10183 } })
  accessor language!: string

  // - its "issues" is yes or no, stored as "has_issues"
  @prop({ type: "choice", storedAs: "has_issues", declaredAt: { path: "/GitHub.api.spell", start: 10185, end: 10234 } })
  accessor issues!: boolean

  // - its "projects" is yes or no, stored as "has_projects"
  @prop({ type: "choice", storedAs: "has_projects", declaredAt: { path: "/GitHub.api.spell", start: 10236, end: 10289 } })
  accessor projects!: boolean

  // - its "downloads" is yes or no, stored as "has_downloads"
  @prop({ type: "choice", storedAs: "has_downloads", declaredAt: { path: "/GitHub.api.spell", start: 10291, end: 10346 } })
  accessor downloads!: boolean

  // - its "wiki" is yes or no, stored as "has_wiki"
  @prop({ type: "choice", storedAs: "has_wiki", declaredAt: { path: "/GitHub.api.spell", start: 10348, end: 10393 } })
  accessor wiki!: boolean

  // - its "pages" is yes or no, stored as "has_pages"
  @prop({ type: "choice", storedAs: "has_pages", declaredAt: { path: "/GitHub.api.spell", start: 10395, end: 10442 } })
  accessor pages!: boolean

  // - its "discussions" is yes or no, stored as "has_discussions"
  @prop({ type: "choice", storedAs: "has_discussions", declaredAt: { path: "/GitHub.api.spell", start: 10444, end: 10503 } })
  accessor discussions!: boolean

  // - its "forks count" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 10505, end: 10534 } })
  accessor forksCount!: number

  // - its "archived" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 10536, end: 10563 } })
  accessor archived!: boolean

  // - its "disabled" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 10565, end: 10592 } })
  accessor disabled!: boolean

  // - its "open issues count" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 10594, end: 10629 } })
  accessor openIssuesCount!: number

  // - its "license" is a license
  @prop({ type: "License", declaredAt: { path: "/GitHub.api.spell", start: 10631, end: 10657 } })
  accessor license!: License

  // - its "allow forking" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 10659, end: 10691 } })
  accessor allowForking!: boolean

  // - its "template" is yes or no, stored as "is_template"
  @prop({ type: "choice", storedAs: "is_template", declaredAt: { path: "/GitHub.api.spell", start: 10693, end: 10745 } })
  accessor template!: boolean

  // - its "web commit signoff required" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/GitHub.api.spell", start: 10747, end: 10793 } })
  accessor webCommitSignoffRequired!: boolean

  // - its "pull requests" is yes or no, stored as "has_pull_requests"
  @prop({ type: "choice", storedAs: "has_pull_requests", declaredAt: { path: "/GitHub.api.spell", start: 10795, end: 10858 } })
  accessor pullRequests!: boolean

  // - its "pull request creation policy" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 10860, end: 10902 } })
  accessor pullRequestCreationPolicy!: string

  // - its "topics" is a list of users
  static { this.declareProp("topics", { itemType: "User", init: () => new List<User>({ instanceType: "User" }), declaredAt: { path: "/GitHub.api.spell", start: 10904, end: 10935 } }) }
  get topics(): List<User> { return core.linked(this, "topics", User) as List<User> }
  set topics(value: List<User>) { this.setProp("topics", value) }

  // - its "visibility" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 10937, end: 10961 } })
  accessor visibility!: string

  // - its "forks" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 10963, end: 10986 } })
  accessor forks!: number

  // - its "open issues" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 10988, end: 11017 } })
  accessor openIssues!: number

  // - its "watchers" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 11019, end: 11045 } })
  accessor watchers!: number

  // - its "default branch" is text
  @prop({ type: "text", declaredAt: { path: "/GitHub.api.spell", start: 11047, end: 11075 } })
  accessor defaultBranch!: string

  // - its "permissions" is a permission
  @prop({ type: "Permission", declaredAt: { path: "/GitHub.api.spell", start: 11077, end: 11110 } })
  accessor permissions!: Permission

  // - its "score" is a number
  @prop({ type: "number", declaredAt: { path: "/GitHub.api.spell", start: 11112, end: 11135 } })
  accessor score!: number

  @drawn draw() {
    return (
      <ui-card>
        <ui-content>
          <ui-header>
            {this.fullName}
            <ui-link link={this.htmlUrl} target="_blank" aria-label="On GitHub">
              <ui-icon name="github" />
            </ui-link>
          </ui-header>
          <ui-meta>★ {this.stargazersCount}{core.drawIf(() => this.language, () => <> · {this.language}</>)}</ui-meta>
          <ui-description>{this.description}</ui-description>
        </ui-content>
      </ui-card>
    )
  }

  static savedIn = {
    place: "github",
    collection: "repositories",
    times: ["created", "modified"], select: ["name", "fullName", "htmlUrl", "description", "createdAt", "stargazersCount", "language"] }

  // - it lives in github
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 7976, end: 7994 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in github
  @prop({ type: "date", declaredAt: { path: "/GitHub.api.spell", start: 7976, end: 7994 } })
  accessor modified!: any /* spell: type unknown */
}

export class Assignee extends Thing {
  // - its "login" is text
  @prop({ type: "text" })
  accessor login!: string

  // - its "number" is a number, stored as "id"
  @prop({ type: "number", storedAs: "id" })
  accessor number!: number

  // - its "node id" is text
  @prop({ type: "text" })
  accessor nodeId!: string

  /** an address */
  // - its "avatar url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor avatarUrl!: string

  // - its "gravatar id" is text
  @prop({ type: "text" })
  accessor gravatarId!: string

  /** an address */
  // - its "url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor url!: string

  /** an address */
  // - its "html url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor htmlUrl!: string

  /** an address */
  // - its "followers url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor followersUrl!: string

  /** an address */
  // - its "following url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor followingUrl!: string

  /** an address */
  // - its "gists url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor gistsUrl!: string

  /** an address */
  // - its "starred url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor starredUrl!: string

  /** an address */
  // - its "subscriptions url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor subscriptionsUrl!: string

  /** an address */
  // - its "organizations url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor organizationsUrl!: string

  /** an address */
  // - its "repos url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor reposUrl!: string

  /** an address */
  // - its "events url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor eventsUrl!: string

  /** an address */
  // - its "received events url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor receivedEventsUrl!: string

  // - its "kind" is text, stored as "type"
  @prop({ type: "text", storedAs: "type" })
  accessor kind!: string

  // - its "user view type" is text
  @prop({ type: "text" })
  accessor userViewType!: string

  // - its "site admin" is yes or no
  @prop({ type: "choice" })
  accessor siteAdmin!: boolean
}

export class License extends Thing {
  // - its "key" is text
  @prop({ type: "text" })
  accessor key!: string

  // - its "name" is text
  @prop({ type: "text" })
  accessor name!: string

  // - its "spdx id" is text
  @prop({ type: "text" })
  accessor spdxId!: string

  /** an address */
  // - its "url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor url!: string

  // - its "node id" is text
  @prop({ type: "text" })
  accessor nodeId!: string
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
core.heading("GitHub")
////////////
// ## GitHub
////////////
// Anyone on GitHub, a person or an organization, and any repository, found by what you type.
// Every thing it shows is in GitHub.api.spell, as `spell place ingest` wrote it;  each type below adds to its type there,
// with `<extend>`, so looking again at the server never touches a line of this.
// A page in a browser holds no key:  it may search 10 times a minute, so the field waits for you to stop typing.

@thing
export class GithubPage extends Thing {
  // - its "search" is text
  @prop({ type: "text" })
  accessor search!: string

  // - its "showing" is a user
  static { this.declareProp("showing", { type: "User", link: true }) }
  get showing(): User { return core.linked(this, "showing", User) as User }
  set showing(value: User) { this.setProp("showing", value) }

  create() {
    this.search = "solid"
  }

  async tryWords(words: string) {
    this.showing = undefined
    this.search = words
  }

  @drawn draw() {
    return (
      <ui-stack spacing="xl">
        <ui-form prop:value={this}>
          <ui-stack spacing="sm">
            <ui-stack direction="horizontal" wrap={true} align="center" justify="between" spacing="sm">
              <ui-header size="large">People and code, on GitHub</ui-header>
              <ui-search name="search" parameter="who" icon="search" placeholder="A person, an organization, a repository" aria-label="Search GitHub" />
            </ui-stack>
            <ui-toolbar appearance="secondary" size="small" aria-label="Try a search">
              <ui-text slot="title" size="small" color="grey">Try</ui-text>
              <ui-item onClick={core.pressed(this, async () => await this.tryWords("ryansolid"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                ryansolid
              </ui-item>
              <ui-item onClick={core.pressed(this, async () => await this.tryWords("solidjs"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                solidjs
              </ui-item>
              <ui-item onClick={core.pressed(this, async () => await this.tryWords("vite"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                vite
              </ui-item>
              <ui-item onClick={core.pressed(this, async () => await this.tryWords("torvalds"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                torvalds
              </ui-item>
              <ui-item onClick={core.pressed(this, async () => await this.tryWords("spreadsheet"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                spreadsheet
              </ui-item>
            </ui-toolbar>
          </ui-stack>
        </ui-form>
        {this.drawFound()}
        {this.drawIssues()}
        <ui-text size="small" paragraph={true}>
          {"From "}
          <ui-link link="https://docs.github.com/en/rest">GitHub's REST API</ui-link>
          , asked for as you look.
        </ui-text>
      </ui-stack>
    )
  }

  drawIssues() {
    // Solid's newest issues and pull requests, told apart:  GitHub lists both as issues, and only a pull request has a pull request
    return (
      <ui-stack spacing="sm" part="issues">
        <ui-header size="medium">Solid's issues</ui-header>
        {core.drawRead(async () => await core.savedThings(Issue, {}, "looks through", { first: 6, where: (issue: Issue) => issue.pullRequest === undefined }), (issue: Issue) => core.drawThing(issue), {
          waitingSay: () => "Asking GitHub",
          none: () => <ui-text part="issues">{"No open issues."}</ui-text>,
          items: () => <ui-cards columns="3" doubling={true} stackable={true} part="issues" />
        })}
        <ui-header size="medium">Solid's pull requests</ui-header>
        {core.drawRead(async () => await core.savedThings(Issue, {}, "looks through", { first: 6, where: (issue: Issue) => issue.pullRequest !== undefined }), (issue: Issue) => core.drawThing(issue), {
          waitingSay: () => "Asking GitHub",
          none: () => <ui-text part="issues">{"No open pull requests."}</ui-text>,
          items: () => <ui-cards columns="3" doubling={true} stackable={true} part="issues" />
        })}
      </ui-stack>
    )
  }

  drawFound() { return core.drawWaiting(() => {
    // Someone's own page, while one is picked;  else what the search finds
    if (this.showing) return core.drawRead(async () => (await core.savedThingWithId(User, (await core.answerOf(this, "showing"))?.login!)).drawPage(), undefined, { waiting: () => <ui-loader visible={true} inline={true} text={true} part="found">Asking GitHub</ui-loader> })
    else {
      return (
        <ui-stack spacing="xl" part="found">
          <ui-stack spacing="sm">
            <ui-header size="medium">People and organizations</ui-header>
            {core.drawRead(async () => await core.savedThings(User, { search: { "*": this.search } }, "as drawn"), (user: User) => core.drawThing(user), {
              waitingSay: () => "Asking GitHub",
              none: () => <ui-text part="found">{"Nobody on GitHub goes by that."}</ui-text>,
              paging: () => "pages",
              items: () => <ui-cards columns="4" doubling={true} stackable={true} part="found" />
            })}
          </ui-stack>
          <ui-stack spacing="sm">
            <ui-header size="medium">Repositories</ui-header>
            {core.drawRead(async () => await core.savedThings(Repository, { search: { "*": this.search } }, "as drawn"), (repository: Repository) => core.drawThing(repository), {
              waitingSay: () => "Asking GitHub",
              none: () => <ui-text part="found">{"No repository matches that."}</ui-text>,
              paging: () => "pages",
              items: () => <ui-cards columns="3" doubling={true} stackable={true} part="found" />
            })}
          </ui-stack>
        </ui-stack>
      )
    }
  }) }
}
core.describeAction(GithubPage, "tryWords", { title: "Try Words", undoneAs: "Try Words" })

core.heading("Someone on GitHub")
///////////////////////
// ## Someone on GitHub
///////////////////////
// A person or an organization:  a card in a search, and a page of their own, with their bio and their most popular repositories.
// A search gives only a little of each:  their page reads them whole, by their login.

core.heading("An issue")
//////////////
// ## An issue
//////////////
// GitHub lists a pull request among a repository's issues:  this page tells them apart by its "pull request".

core.heading("A repository")
//////////////////
// ## A repository
//////////////////
// Its name, what it's for, and how many people starred it;  its GitHub icon opens it on GitHub, in a new window.

// -----------
core.heading("Open Library:  books by what they're called, who wrote them, and their covers")
///////////////////////////////////////////////////////////////////////////////////
// ## Open Library:  books by what they're called, who wrote them, and their covers
///////////////////////////////////////////////////////////////////////////////////
// A server other people run, and what it holds.  What's drawn from it is in OpenLibrary.spell.
// `open library` is what this wrote, from looking at the server:
//   spell place ingest https://openlibrary.org --into OpenLibrary.api.spell --name "open library" --no-ai
//     --collections "books=/search.json?q=dune,authors=/authors/{name}.json,editions=/books/{name}.json"
//     --samples authors=OL79034A,editions=OL32848840M --pictures "cover_i=https://covers.openlibrary.org/b/id/{id}-M.jpg"
// `spell place update OpenLibrary.api.spell` looks again, and changes only this file and OpenLibrary.api.json5.
// It has no list of every book:  a program searches it, `every book where its title includes ...`.
// A book's editions are read from its own list of them, when its page shows them.
// Each book's authors are their ids, each read from the author's own record when something reads it;
// its cover is a picture on another server, covers.openlibrary.org, its address built from the book's cover id.

export class Book extends Thing {
  // - its "authors" is a list of authors, stored as "author_key"
  static { this.declareProp("authors", { itemType: "Author", storedAs: "author_key", init: () => new List<Author>({ instanceType: "Author" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 1594, end: 1652 } }) }
  get authors(): List<Author> { return core.linked(this, "authors", Author) as List<Author> }
  set authors(value: List<Author>) { this.setProp("authors", value) }

  // - its "author name" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 1654, end: 1689 } })
  accessor authorName!: List<string>

  // - its "cover edition" is an edition, stored as "cover_edition_key"
  static { this.declareProp("coverEdition", { type: "Edition", storedAs: "cover_edition_key", link: true, declaredAt: { path: "/OpenLibrary.api.spell", start: 1691, end: 1755 } }) }
  get coverEdition(): Edition { return core.linked(this, "coverEdition", Edition) as Edition }
  set coverEdition(value: Edition) { this.setProp("coverEdition", value) }

  // - its "cover height" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 1757, end: 1787 } })
  accessor coverHeight!: number

  /** a picture's address */
  // - its "cover i" is text
  //   -- a picture's address
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 1789, end: 1835 } })
  accessor coverI!: string

  // - its "cover width" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 1837, end: 1866 } })
  accessor coverWidth!: number

  // - its "ebook access" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 1868, end: 1894 } })
  accessor ebookAccess!: string

  // - its "edition count" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 1896, end: 1927 } })
  accessor editionCount!: number

  // - its "first publish year" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 1929, end: 1965 } })
  accessor firstPublishYear!: number

  // - its "fulltext" is yes or no, stored as "has_fulltext"
  @prop({ type: "choice", storedAs: "has_fulltext", declaredAt: { path: "/OpenLibrary.api.spell", start: 1967, end: 2020 } })
  accessor fulltext!: boolean

  // - its "ia" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2022, end: 2048 } })
  accessor ia!: List<string>

  // - its "ia collection" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2050, end: 2087 } })
  accessor iaCollection!: List<string>

  // - its "language" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2089, end: 2121 } })
  accessor language!: List<string>

  // - its "lending edition s" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2123, end: 2154 } })
  accessor lendingEditionS!: string

  // - its "lending identifier s" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2156, end: 2190 } })
  accessor lendingIdentifierS!: string

  // - its "public scan b" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/OpenLibrary.api.spell", start: 2192, end: 2224 } })
  accessor publicScanB!: boolean

  // - its "editions" is a list of editions
  static { this.declareProp("editions", { itemType: "Edition", init: () => new List<Edition>({ instanceType: "Edition" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2226, end: 2262 } }) }
  get editions(): List<Edition> { return core.linked(this, "editions", Edition) as List<Edition> }
  set editions(value: List<Edition>) { this.setProp("editions", value) }

  // - its "series key" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2264, end: 2298 } })
  accessor seriesKey!: List<string>

  // - its "series name" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2300, end: 2335 } })
  accessor seriesName!: List<string>

  // - its "series position" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2337, end: 2376 } })
  accessor seriesPosition!: List<string>

  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2378, end: 2397 } })
  accessor title!: string

  // - its "subtitle" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2399, end: 2421 } })
  accessor subtitle!: string

  /** Who wrote it first:  read from Open Library's record of them, by their id */
  static { this.declareProp("writer", { declaredAt: { path: "/OpenLibrary.spell", start: 1946, end: 1991 }, readsFrom: ["open_library"] }) }
  get writer() {
    return core.getItemAt(this.authors, 0)
  }

  /** Its own page, on the library's tab */
  async open() {
    publicServers.library.showing = this
  }

  /** Back to what the search found */
  async close() {
    publicServers.library.showing = undefined
  }

  @drawn draw() {
    return (
      <ui-card class="book" onClick={core.pressed(this, async () => await this.open())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
        <ui-image src={this.coverI} alt="" aspect-ratio="2:3" crop={true} />
        <ui-content>
          <ui-header>{this.title}</ui-header>
          <ui-meta>{core.listShown(this.authorName)} · {this.firstPublishYear}</ui-meta>
        </ui-content>
      </ui-card>
    )
  }

  drawPage() {
    return (
      <ui-stack spacing="xl" part="page">
        <ui-stack direction="horizontal" align="center" spacing="sm">
          <ui-button icon="arrow left" appearance="basic" aria-label="Back" title="Back" onClick={core.pressed(this, async () => await this.close())} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
          <ui-header size="large">{this.title}</ui-header>
        </ui-stack>
        <ui-stack direction="horizontal" wrap={true} align="start" spacing="md">
          <ui-image src={this.coverI} alt="" size="small" />
          <ui-stack spacing="sm">
            <ui-text>First published in {this.firstPublishYear} · {this.editionCount} editions</ui-text>
            {this.drawWriting()}
          </ui-stack>
        </ui-stack>
        <ui-stack spacing="sm">
          <ui-header size="medium">Editions</ui-header>
          {core.drawRead(() => this.editions, (edition: Edition) => core.drawThing(edition), {
            waitingSay: () => "Asking Open Library for its editions",
            none: () => <ui-text part="page">{"No editions listed."}</ui-text>,
            paging: () => "pages",
            items: () => <ui-cards columns="4" doubling={true} stackable={true} part="page" />
          })}
        </ui-stack>
      </ui-stack>
    )
  }

  drawWriting() { return core.drawWaiting(() => {
    if (this.writer) return this.writer.drawCard()
    core.readRider("waiting", () => <ui-loader visible={true} inline={true} text={true} part="writing">Asking Open Library who wrote it</ui-loader>)
    core.readRider("failed", () => <ui-text part="writing">Open Library can't say who wrote it just now.</ui-text>)
  }) }

  static savedIn = {
    place: "open_library",
    collection: "books",
    times: ["created", "modified"], select: ["authors", "authorName", "coverI", "editionCount", "firstPublishYear", "language", "editions", "title"] }

  // - it lives in open library
  @prop({ type: "date", declaredAt: { path: "/OpenLibrary.api.spell", start: 1568, end: 1592 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in open library
  @prop({ type: "date", declaredAt: { path: "/OpenLibrary.api.spell", start: 1568, end: 1592 } })
  accessor modified!: any /* spell: type unknown */
}
core.describeAction(Book, "open", { title: "Open It", undoneAs: "Open It" })
core.describeAction(Book, "close", { title: "Close It", undoneAs: "Close It" })

export class Author extends Thing {
  // - its "links" is a list of links
  @prop({ itemType: "Link", init: () => new List<Link>({ instanceType: "Link" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2473, end: 2503 } })
  accessor links!: List<Link>

  // - its "kind" is a kind, stored as "type"
  @prop({ type: "Kind", storedAs: "type", declaredAt: { path: "/OpenLibrary.api.spell", start: 2505, end: 2543 } })
  accessor kind!: Kind

  // - its "key" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2545, end: 2562 } })
  accessor key!: string

  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2564, end: 2582 } })
  accessor name!: string

  // - its "source records" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2584, end: 2622 } })
  accessor sourceRecords!: List<string>

  // - its "birth date" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2624, end: 2648 } })
  accessor birthDate!: string

  // - its "bio" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2650, end: 2667 } })
  accessor bio!: string

  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2669, end: 2688 } })
  accessor title!: string

  // - its "alternate names" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2690, end: 2729 } })
  accessor alternateNames!: List<string>

  // - its "remote ids" is a remote id
  @prop({ type: "RemoteId", declaredAt: { path: "/OpenLibrary.api.spell", start: 2731, end: 2762 } })
  accessor remoteIds!: RemoteId

  // - its "photos" is a list of numbers
  @prop({ itemType: "number", init: () => new List<number>({ instanceType: "number" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 2764, end: 2797 } })
  accessor photos!: List<number>

  // - its "death date" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2799, end: 2823 } })
  accessor deathDate!: string

  // - its "personal name" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 2825, end: 2852 } })
  accessor personalName!: string

  // - its "latest revision" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 2854, end: 2887 } })
  accessor latestRevision!: number

  // - its "revision" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 2889, end: 2915 } })
  accessor revision!: number

  // - its "created" is a created
  @prop({ type: "Created", declaredAt: { path: "/OpenLibrary.api.spell", start: 2917, end: 2943 } })
  accessor created!: Created

  // - its "last modified" is a last modified
  @prop({ type: "LastModified", declaredAt: { path: "/OpenLibrary.api.spell", start: 2945, end: 2983 } })
  accessor lastModified!: LastModified

  drawCard() {
    return (
      <ui-card part="card">
        <ui-content>
          <ui-header>{this.name}</ui-header>
          <ui-meta>Born {this.birthDate}</ui-meta>
          <ui-description>{this.bio}</ui-description>
        </ui-content>
      </ui-card>
    )
  }

  static savedIn = {
    place: "open_library",
    collection: "authors",
    times: ["modified"], select: ["kind", "name", "birthDate", "bio", "title"] }

  // - it lives in open library
  @prop({ type: "date", declaredAt: { path: "/OpenLibrary.api.spell", start: 2447, end: 2471 } })
  accessor modified!: any /* spell: type unknown */
}

export class Edition extends Thing {
  // - its "kind" is a kind, stored as "type"
  @prop({ type: "Kind", storedAs: "type", declaredAt: { path: "/OpenLibrary.api.spell", start: 3036, end: 3074 } })
  accessor kind!: Kind

  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 3076, end: 3095 } })
  accessor title!: string

  // - its "authors" is a list of edition authors
  @prop({ itemType: "EditionAuthor", init: () => new List<EditionAuthor>({ instanceType: "EditionAuthor" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 3097, end: 3139 } })
  accessor authors!: List<EditionAuthor>

  // - its "publish date" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 3141, end: 3167 } })
  accessor publishDate!: string

  // - its "source records" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 3169, end: 3207 } })
  accessor sourceRecords!: List<string>

  // - its "number of pages" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 3209, end: 3242 } })
  accessor numberOfPages!: number

  // - its "publishers" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 3244, end: 3278 } })
  accessor publishers!: List<string>

  // - its "physical format" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 3280, end: 3309 } })
  accessor physicalFormat!: string

  // - its "notes" is a note
  @prop({ type: "Note", declaredAt: { path: "/OpenLibrary.api.spell", start: 3311, end: 3332 } })
  accessor notes!: Note

  // - its "full title" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 3334, end: 3358 } })
  accessor fullTitle!: string

  // - its "covers" is a list of numbers
  @prop({ itemType: "number", init: () => new List<number>({ instanceType: "number" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 3360, end: 3393 } })
  accessor covers!: List<number>

  // - its "works" is a list of works
  @prop({ itemType: "Work", init: () => new List<Work>({ instanceType: "Work" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 3395, end: 3425 } })
  accessor works!: List<Work>

  // - its "key" is text
  @prop({ type: "text", declaredAt: { path: "/OpenLibrary.api.spell", start: 3427, end: 3444 } })
  accessor key!: string

  // - its "local id" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/OpenLibrary.api.spell", start: 3446, end: 3478 } })
  accessor localId!: List<string>

  // - its "latest revision" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 3480, end: 3513 } })
  accessor latestRevision!: number

  // - its "revision" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenLibrary.api.spell", start: 3515, end: 3541 } })
  accessor revision!: number

  // - its "created" is a created
  @prop({ type: "Created", declaredAt: { path: "/OpenLibrary.api.spell", start: 3543, end: 3569 } })
  accessor created!: Created

  // - its "last modified" is a last modified
  @prop({ type: "LastModified", declaredAt: { path: "/OpenLibrary.api.spell", start: 3571, end: 3609 } })
  accessor lastModified!: LastModified

  @drawn draw() {
    return (
      <ui-card>
        <ui-content>
          <ui-header>{this.title}</ui-header>
          <ui-meta>{this.publishDate} · {core.getItemAt(this.publishers, 0)}</ui-meta>
        </ui-content>
      </ui-card>
    )
  }

  static savedIn = {
    place: "open_library",
    collection: "editions",
    times: ["modified"], select: ["kind", "title", "authors", "publishDate", "publishers"] }

  // - it lives in open library
  @prop({ type: "date", declaredAt: { path: "/OpenLibrary.api.spell", start: 3010, end: 3034 } })
  accessor modified!: any /* spell: type unknown */
}

export class Link extends Thing {
  // - its "title" is text
  @prop({ type: "text" })
  accessor title!: string

  /** an address */
  // - its "url" is text
  //   -- an address
  @prop({ type: "text" })
  accessor url!: string

  // - its "kind" is a kind, stored as "type"
  @prop({ type: "Kind", storedAs: "type" })
  accessor kind!: Kind
}

export class Kind extends Thing {
  // - its "key" is text
  @prop({ type: "text" })
  accessor key!: string
}

export class RemoteId extends Thing {
  // - its "viaf" is a number
  @prop({ type: "number" })
  accessor viaf!: number

  // - its "wikidata" is text
  @prop({ type: "text" })
  accessor wikidata!: string

  // - its "isni" is a number
  @prop({ type: "number" })
  accessor isni!: number

  // - its "amazon" is text
  @prop({ type: "text" })
  accessor amazon!: string

  // - its "bookbrainz" is text
  @prop({ type: "text" })
  accessor bookbrainz!: string

  // - its "goodreads" is a number
  @prop({ type: "number" })
  accessor goodreads!: number

  // - its "gnd" is a number
  @prop({ type: "number" })
  accessor gnd!: number

  // - its "imdb" is text
  @prop({ type: "text" })
  accessor imdb!: string

  // - its "lc naf" is text
  @prop({ type: "text" })
  accessor lcNaf!: string

  // - its "librarything" is text
  @prop({ type: "text" })
  accessor librarything!: string

  // - its "musicbrainz" is text
  @prop({ type: "text" })
  accessor musicbrainz!: string

  // - its "storygraph" is text
  @prop({ type: "text" })
  accessor storygraph!: string

  // - its "inventaire" is text
  @prop({ type: "text" })
  accessor inventaire!: string

  // - its "librivox" is a number
  @prop({ type: "number" })
  accessor librivox!: number

  // - its "project gutenberg" is a number
  @prop({ type: "number" })
  accessor projectGutenberg!: number

  // - its "opac sbn" is text
  @prop({ type: "text" })
  accessor opacSbn!: string
}

export class Created extends Thing {
  // - its "kind" is text, stored as "type"
  @prop({ type: "text", storedAs: "type" })
  accessor kind!: string

  // - its "value" is a date
  @prop({ type: "date" })
  accessor value!: Date
}

export class LastModified extends Thing {
  // - its "kind" is text, stored as "type"
  @prop({ type: "text", storedAs: "type" })
  accessor kind!: string

  // - its "value" is a date
  @prop({ type: "date" })
  accessor value!: Date
}

export class EditionAuthor extends Thing {
  // - its "key" is text
  @prop({ type: "text" })
  accessor key!: string
}

export class Note extends Thing {
  // - its "kind" is text, stored as "type"
  @prop({ type: "text", storedAs: "type" })
  accessor kind!: string

  // - its "value" is text
  @prop({ type: "text" })
  accessor value!: string
}

export class Work extends Thing {
  // - its "key" is text
  @prop({ type: "text" })
  accessor key!: string
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
core.heading("Open Library")
//////////////////
// ## Open Library
//////////////////
// Books by what they're called, who wrote them, and their covers.
// Every thing it shows is in OpenLibrary.api.spell, as `spell place ingest` wrote it;  each type below adds to its type there,
// with `<extend>`, so looking again at the server never touches a line of this.
// Open Library has no list of every book, only a search:  so the page always searches, for what's typed.

@thing
export class OpenLibraryPage extends Thing {
  // - its "search" is text
  @prop({ type: "text" })
  accessor search!: string

  // - its "showing" is a book
  static { this.declareProp("showing", { type: "Book", link: true }) }
  get showing(): Book { return core.linked(this, "showing", Book) as Book }
  set showing(value: Book) { this.setProp("showing", value) }

  create() {
    this.search = "dune"
  }

  /** What the search finds:  Open Library looks, by the title, and gives back the first hundred */
  static { this.declareProp("found", { declaredAt: { path: "/OpenLibrary.spell", start: 543, end: 604 }, readsFrom: ["open_library"] }) }
  get found() { return core.waitedValue(this, "found", async () => {
    return core.filter(await core.savedThings(Book, { search: { title: this.search } }, "looks through"), (book: Book) => core.includes(book.title, this.search))
  }, () => [this.search]) }

  @drawn draw() {
    return (
      <ui-stack spacing="xl">
        <ui-form prop:value={this}>
          <ui-stack direction="horizontal" wrap={true} align="center" justify="between" spacing="sm">
            <ui-header size="large">Books, from Open Library</ui-header>
            <ui-search name="search" parameter="book" icon="search" placeholder="A book, by its title" aria-label="Search Open Library" />
          </ui-stack>
        </ui-form>
        {this.drawShelf()}
        <ui-text size="small" paragraph={true}>
          {"From "}
          <ui-link link="https://openlibrary.org/developers/api">Open Library's API</ui-link>
          {", asked for as you look;  its covers from its covers server."}
        </ui-text>
      </ui-stack>
    )
  }

  drawShelf() { return core.drawWaiting(() => {
    // A book's own page, while one is open;  else what the search finds
    if (this.showing) return this.showing.drawPage()
    else return this.drawBookList()
  }) }

  drawBookList() {
    return core.drawRead(() => this.found, (book: Book) => core.drawThing(book), {
      waiting: () => <ui-loader visible={true} inline={true} text={true} part="book_list">{"Asking Open Library"}</ui-loader>,
      none: () => <ui-text part="book_list">{"No book is called that."}</ui-text>,
      failedSay: () => "Open Library can't be reached just now.",
      paging: () => "pages",
      items: () => <ui-cards columns="5" doubling={true} part="book_list" />
    })
  }
}

core.heading("A book")
////////////
// ## A book
////////////
// Its cover, its title and who wrote it:  on its card, every name the search gave;  on its own page, its first author, read from their own record.

core.heading("An edition")
////////////////
// ## An edition
////////////////
// One printing of a book:  read from the book's own list of editions, when its page is open.

core.heading("Who wrote it")
//# Who wrote it

// -----------
core.heading("JSONPlaceholder:  posts and their comments, people, and their todos, on a server for practice")
///////////////////////////////////////////////////////////////////////////////////////////////////
// ## JSONPlaceholder:  posts and their comments, people, and their todos, on a server for practice
///////////////////////////////////////////////////////////////////////////////////////////////////
// A server other people run, and what it holds.  What's drawn from it is in JSONPlaceholder.spell.
// `jsonplaceholder` is what this wrote, from looking at the server:
//   spell place ingest https://jsonplaceholder.typicode.com --into JSONPlaceholder.api.spell --name jsonplaceholder
//     --no-ai --try-writes --collections "posts=/posts,comments=/comments,users=/users,todos=/todos"
// `spell place update JSONPlaceholder.api.spell` looks again, and changes only this file and JSONPlaceholder.api.json5.
// It takes adding, changing and deleting, and answers as if each was saved, but keeps nothing:
// what you add is gone when it's read again (JSONPlaceholder.api.json5, its "write").

export class Post extends Thing {
  // - its "user id" is a number
  @prop({ type: "number", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1293, end: 1318 } })
  accessor userId!: number

  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1320, end: 1339 } })
  accessor title!: string

  // - its "body" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1341, end: 1359 } })
  accessor body!: string

  // - its "comments" is a list of comments
  static { this.declareProp("comments", { itemType: "Comment", init: () => new List<Comment>({ instanceType: "Comment" }), declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1361, end: 1397 } }) }
  get comments(): List<Comment> { return core.linked(this, "comments", Comment) as List<Comment> }
  set comments(value: List<Comment>) { this.setProp("comments", value) }

  @drawn draw() {
    return [
      <ui-header size="small">{this.title}</ui-header>,
      <ui-text>{this.body}</ui-text>,
      core.drawRead(() => this.comments, (comment: Comment) => core.drawThing(comment), { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Asking for its comments"}</ui-loader> })
    ]
  }

  static savedIn = {
    place: "jsonplaceholder",
    collection: "posts",
    times: ["created", "modified"], select: ["userId", "title", "body", "comments"] }

  // - it lives in jsonplaceholder
  @prop({ type: "date", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1264, end: 1291 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in jsonplaceholder
  @prop({ type: "date", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1264, end: 1291 } })
  accessor modified!: any /* spell: type unknown */
}

export class Comment extends Thing {
  // - its "post id" is a number
  @prop({ type: "number", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1452, end: 1477 } })
  accessor postId!: number

  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1479, end: 1497 } })
  accessor name!: string

  // - its "email" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1499, end: 1518 } })
  accessor email!: string

  // - its "body" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1520, end: 1538 } })
  accessor body!: string

  @drawn draw() {
    return (
      <ui-comment>
        <ui-content>
          <ui-author>{this.email}</ui-author>
          <ui-description>{this.body}</ui-description>
        </ui-content>
      </ui-comment>
    )
  }

  static savedIn = {
    place: "jsonplaceholder",
    collection: "comments",
    times: ["created", "modified"], select: ["name", "email", "body"] }

  // - it lives in jsonplaceholder
  @prop({ type: "date", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1423, end: 1450 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in jsonplaceholder
  @prop({ type: "date", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1423, end: 1450 } })
  accessor modified!: any /* spell: type unknown */
}

export class JsonplaceholderUser extends Thing {
  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1606, end: 1624 } })
  accessor name!: string

  // - its "username" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1626, end: 1648 } })
  accessor username!: string

  // - its "email" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1650, end: 1669 } })
  accessor email!: string

  // - its "address" is an address
  @prop({ type: "Address", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1671, end: 1698 } })
  accessor address!: Address

  // - its "phone" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1700, end: 1719 } })
  accessor phone!: string

  // - its "website" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1721, end: 1742 } })
  accessor website!: string

  // - its "company" is a company
  @prop({ type: "Company", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1744, end: 1770 } })
  accessor company!: Company

  // - its "posts" is a list of posts
  static { this.declareProp("posts", { itemType: "Post", init: () => new List<Post>({ instanceType: "Post" }), declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1772, end: 1802 } }) }
  get posts(): List<Post> { return core.linked(this, "posts", Post) as List<Post> }
  set posts(value: List<Post>) { this.setProp("posts", value) }

  // - its "todos" is a list of todos
  static { this.declareProp("todos", { itemType: "Todo", init: () => new List<Todo>({ instanceType: "Todo" }), declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1804, end: 1834 } }) }
  get todos(): List<Todo> { return core.linked(this, "todos", Todo) as List<Todo> }
  set todos(value: List<Todo>) { this.setProp("todos", value) }

  static savedIn = {
    place: "jsonplaceholder",
    collection: "jsonplaceholder_users",
    times: ["created", "modified"], select: ["name", "email", "posts", "todos"] }

  // - it lives in jsonplaceholder
  @prop({ type: "date", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1577, end: 1604 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in jsonplaceholder
  @prop({ type: "date", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1577, end: 1604 } })
  accessor modified!: any /* spell: type unknown */
}

export class Todo extends Thing {
  // - its "user id" is a number
  @prop({ type: "number", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1886, end: 1911 } })
  accessor userId!: number

  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1913, end: 1932 } })
  accessor title!: string

  // - its "completed" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1934, end: 1962 } })
  accessor completed!: boolean

  @drawn draw() {
    return (
      <ui-form prop:value={this}>
        <ui-stack direction="horizontal" align="center" justify="between" spacing="sm">
          <ui-checkbox name="completed" label={this.title} />
          <ui-button icon="close" size="mini" appearance="transparent" aria-label="Remove" title="Remove" onClick={core.pressed(this, () => core.removeSaved(this))} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
        </ui-stack>
      </ui-form>
    )
  }

  static savedIn = {
    place: "jsonplaceholder",
    collection: "todos",
    times: ["created", "modified"]
  }

  // - it lives in jsonplaceholder
  @prop({ type: "date", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1857, end: 1884 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in jsonplaceholder
  @prop({ type: "date", declaredAt: { path: "/JSONPlaceholder.api.spell", start: 1857, end: 1884 } })
  accessor modified!: any /* spell: type unknown */
}

export class Address extends Thing {
  // - its "street" is text
  @prop({ type: "text" })
  accessor street!: string

  // - its "suite" is text
  @prop({ type: "text" })
  accessor suite!: string

  // - its "city" is text
  @prop({ type: "text" })
  accessor city!: string

  // - its "zipcode" is text
  @prop({ type: "text" })
  accessor zipcode!: string

  // - its "geo" is a geo
  @prop({ type: "Geo" })
  accessor geo!: Geo
}

export class Geo extends Thing {
  // - its "lat" is a number
  @prop({ type: "number" })
  accessor lat!: number

  // - its "lng" is a number
  @prop({ type: "number" })
  accessor lng!: number
}

export class Company extends Thing {
  // - its "name" is text
  @prop({ type: "text" })
  accessor name!: string

  // - its "catch phrase" is text
  @prop({ type: "text" })
  accessor catchPhrase!: string

  // - its "bs" is text
  @prop({ type: "text" })
  accessor bs!: string
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
core.heading("JSONPlaceholder")
/////////////////////
// ## JSONPlaceholder
/////////////////////
// A server for practice:  someone's todos to tick, add and remove, and posts with their comments.
// Every thing it shows is in JSONPlaceholder.api.spell, as `spell place ingest` wrote it;  each type below adds to its type there,
// with `<extend>`, so looking again at the server never touches a line of this.
// It answers each change as if it saved it, and keeps nothing:  what you add here is gone when it's asked again.

export class JsonplaceholderPage extends Thing {
  // "new todo" is a new todo with user id = 1
  static { this.declareProp("newTodo", { init: () => new Todo({ userId: 1 }), early: true }) }
  get newTodo(): Todo { return core.linked(this, "newTodo", Todo) as Todo }
  set newTodo(value: Todo) { this.setProp("newTodo", value) }

  /** Whose todos and posts these are:  the first person it has */
  static { this.declareProp("person", { declaredAt: { path: "/JSONPlaceholder.spell", start: 525, end: 579 }, readsFrom: ["jsonplaceholder"] }) }
  get person() { return core.waitedValue(this, "person", async () => {
    return await core.savedThingWithId(JsonplaceholderUser, 1)
  }) }

  /** Theirs, from every todo */
  static { this.declareProp("todos", { declaredAt: { path: "/JSONPlaceholder.spell", start: 644, end: 692 }, readsFrom: ["jsonplaceholder"] }) }
  get todos() { return core.waitedValue(this, "todos", async () => {
    return await core.savedThings(Todo, { filter: { userId: 1 } })
  }) }

  async addTheNewTodo() {
    core.saveThing(await core.answerOf(this, "newTodo"))
    this.newTodo = new Todo({ userId: 1 })
  }

  @drawn draw() {
    return (
      <ui-stack spacing="xl">
        <ui-stack spacing="sm">
          <ui-header size="large">Practice, on JSONPlaceholder</ui-header>
          <ui-text color="grey">
            {"Tick a todo, add one, remove one:  each goes to the server, which answers as if it saved it, and keeps nothing."}
          </ui-text>
        </ui-stack>
        <ui-stack spacing="sm">
          <ui-header size="medium">Their todos</ui-header>
          {this.drawChecklist()}
        </ui-stack>
        <ui-stack spacing="sm">
          <ui-header size="medium">What they wrote</ui-header>
          {this.drawPostList()}
        </ui-stack>
        <ui-text size="small" paragraph={true}>
          {"From "}
          <ui-link link="https://jsonplaceholder.typicode.com">JSONPlaceholder</ui-link>
          , asked for as you look.
        </ui-text>
      </ui-stack>
    )
  }

  drawChecklist() {
    return (
      <ui-stack spacing="sm" part="checklist">
        {core.drawWaiting(() => <ui-form prop:value={this.newTodo}>
          <ui-input name="title" placeholder="Water the plants" aria-label="Something to do" fluid={true} action={true}>
            {core.drawWaiting(() => <ui-button slot="action" color="primary" disabled={this.newTodo.title === ""} onClick={core.pressed(this, async () => await this.addTheNewTodo())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Add
            </ui-button>, "ui-button")}
          </ui-input>
        </ui-form>, "ui-form")}
        {this.drawTodoList()}
      </ui-stack>
    )
  }

  drawTodoList() {
    return core.drawRead(() => this.todos, (todo) => core.drawThing(todo), { waiting: () => <ui-loader visible={true} inline={true} text={true} part="todo_list">{"Asking JSONPlaceholder"}</ui-loader>, failedSay: () => "JSONPlaceholder can't be reached just now." })
  }

  drawPostList() {
    return core.drawRead(() => this.person?.posts, (post) => core.drawThing(post), { waiting: () => <ui-loader visible={true} inline={true} text={true} part="post_list">{"Asking JSONPlaceholder"}</ui-loader>, failedSay: () => "JSONPlaceholder can't be reached just now." })
  }
}
core.describeAction(JsonplaceholderPage, "addTheNewTodo", { title: "Add the New Todo", undoneAs: "Add the New Todo" })

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

// Each comment, as Spell UI draws one:  named in full, `<ui-comment>`.

// -----------
core.heading("Open-Meteo:  the weather to come, hour by hour, for anywhere on Earth")
///////////////////////////////////////////////////////////////////////////
// ## Open-Meteo:  the weather to come, hour by hour, for anywhere on Earth
///////////////////////////////////////////////////////////////////////////
// A server other people run, and what it holds.  What's drawn from it is in OpenMeteo.spell.
// `open meteo` is what this wrote, from looking at the server:
//   spell place ingest https://api.open-meteo.com --into OpenMeteo.api.spell --name "open meteo" --no-ai
//     --collections "forecasts=/v1/forecast?latitude=52.52&longitude=13.41&hourly=temperature_2m,precipitation,wind_speed_10m&timezone=auto&forecast_days=2"
// `spell place update OpenMeteo.api.spell` looks again, and changes only this file and OpenMeteo.api.json5.
// It has no list of forecasts:  each is asked for by where it's for, `every forecast where its latitude is ... and its longitude is ...`.
// Its hours come as lists side by side, one of times and one of each measure:  each hour is read as one of each.
// Each measure is in the unit its answer names, and shows in the reader's own:  a temperature in °F in the US.

export class Forecast extends Thing {
  // - its "latitude" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenMeteo.api.spell", start: 1320, end: 1346 } })
  accessor latitude!: number

  // - its "longitude" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenMeteo.api.spell", start: 1348, end: 1375 } })
  accessor longitude!: number

  // - its "generationtime ms" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenMeteo.api.spell", start: 1377, end: 1412 } })
  accessor generationtimeMs!: number

  // - its "utc offset seconds" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenMeteo.api.spell", start: 1414, end: 1450 } })
  accessor utcOffsetSeconds!: number

  // - its "timezone" is text
  @prop({ type: "text", declaredAt: { path: "/OpenMeteo.api.spell", start: 1452, end: 1474 } })
  accessor timezone!: string

  // - its "timezone abbreviation" is text
  @prop({ type: "text", declaredAt: { path: "/OpenMeteo.api.spell", start: 1476, end: 1511 } })
  accessor timezoneAbbreviation!: string

  // - its "elevation" is a number
  @prop({ type: "number", declaredAt: { path: "/OpenMeteo.api.spell", start: 1513, end: 1540 } })
  accessor elevation!: number

  // - its "hours" is a list of hours, stored as "hourly"
  @prop({ itemType: "Hour", storedAs: "hourly", init: () => new List<Hour>({ instanceType: "Hour" }), declaredAt: { path: "/OpenMeteo.api.spell", start: 1542, end: 1592 } })
  accessor hours!: List<Hour>

  drawHourTable() {
    return core.drawRead(() => this.hours, (hour: Hour) => <>
      <ui-cell data-column="Day">
        {core.drawIf(() => core.hourOf(hour.time) === 0, () => <>{core.dateShown(hour.time)}</>)}
      </ui-cell>
      <ui-cell data-column="Hour" align="right">{core.hourOf(hour.time)}:00</ui-cell>
      <ui-cell data-column="Temperature" align="right">
        {core.measureShown(hour.temperature, "Temperature", "celsius")}
      </ui-cell>
      <ui-cell data-column="Rain" align="right">
        {core.measureShown(hour.precipitation, "Length", "millimeter")}
      </ui-cell>
      <ui-cell data-column="Wind" align="right">
        {core.measureShown(hour.windSpeed, "Speed", "kilometerPerHour")}
      </ui-cell>
    </>, { items: () => <ui-table appearance="very-basic" padding="compact" collapsing={true} unstackable={true} part="hour_table">
      <ui-row />
    </ui-table> })
  }

  static savedIn = {
    place: "open_meteo",
    collection: "forecasts",
    times: ["created", "modified"], select: ["latitude", "longitude", "timezone", "hours"] }

  // - it lives in open meteo
  @prop({ type: "date", declaredAt: { path: "/OpenMeteo.api.spell", start: 1296, end: 1318 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in open meteo
  @prop({ type: "date", declaredAt: { path: "/OpenMeteo.api.spell", start: 1296, end: 1318 } })
  accessor modified!: any /* spell: type unknown */
}

export class Hour extends Thing {
  // - its "time" is a date
  @prop({ type: "date" })
  accessor time!: Date

  // - its "temperature" is a temperature in °C, stored as "temperature_2m"
  @prop({ type: "number", storedAs: "temperature_2m" })
  accessor temperature!: number

  // - its "precipitation" is a length in mm
  @prop({ type: "number" })
  accessor precipitation!: number

  // - its "wind speed" is a speed in km/h, stored as "wind_speed_10m"
  @prop({ type: "number", storedAs: "wind_speed_10m" })
  accessor windSpeed!: number
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
core.heading("Open-Meteo")
////////////////
// ## Open-Meteo
////////////////
// The weather to come, hour by hour, today and tomorrow, for a few cities.
// Every thing it shows is in OpenMeteo.api.spell, as `spell place ingest` wrote it;  each type below adds to its type there,
// with `<extend>`, so looking again at the server never touches a line of this.
// Open-Meteo has no list of forecasts:  each is asked for by a latitude and a longitude, so the page always says both.

@thing
export class OpenMeteoPage extends Thing {
  // - its "cities" is a list of cities
  @prop({ itemType: "City", init: () => new List<City>({ instanceType: "City" }) })
  accessor cities!: List<City>

  // - its "city" is a city
  @prop({ type: "City" })
  accessor city!: City

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

  /** The city's, from Open-Meteo:  asked for by where it is, with no list of them all */
  static { this.declareProp("forecasts", { declaredAt: { path: "/OpenMeteo.spell", start: 945, end: 1072 }, readsFrom: ["open_meteo"] }) }
  get forecasts() { return core.waitedValue(this, "forecasts", async () => {
    return await core.savedThings(Forecast, { filter: { latitude: this.city?.latitude, longitude: this.city?.longitude } })
  }, () => [this.city]) }

  /** Its one forecast:  Open-Meteo answers with one, for the nearest place it has */
  static { this.declareProp("forecast", { declaredAt: { path: "/OpenMeteo.spell", start: 1160, end: 1209 }, readsFrom: ["open_meteo"] }) }
  get forecast() {
    return core.getItemAt(this.forecasts, 0)
  }

  @drawn draw() {
    return (
      <ui-stack spacing="xl">
        <ui-stack spacing="sm">
          <ui-header size="large">The weather, from Open-Meteo</ui-header>
          <ui-toolbar appearance="secondary" aria-label="Cities">{core.drawItems(this.cities)}</ui-toolbar>
        </ui-stack>
        {this.drawForecastTable()}
        <ui-text size="small" paragraph={true}>
          {"From "}
          <ui-link link="https://open-meteo.com/en/docs">Open-Meteo's API</ui-link>
          {", asked for as you look;  each measure in your own units."}
        </ui-text>
      </ui-stack>
    )
  }

  drawForecastTable() { return core.drawWaiting(() => {
    if (this.forecast) {
      return (
        <ui-stack spacing="sm" part="forecast_table">
          <ui-text color="grey">
            {"The next two days in "}
            {core.whileWaiting(() => this.forecast.timezone)}
            , hour by hour.
          </ui-text>
          {core.whileWaiting(() => this.forecast.drawHourTable())}
        </ui-stack>
      )
    }
    core.readRider("waiting", () => <ui-loader visible={true} inline={true} text={true} part="forecast_table">Asking Open-Meteo</ui-loader>)
    core.readRider("failed", () => <ui-text part="forecast_table">Open-Meteo can't be reached just now.</ui-text>)
  }) }
}

core.heading("A city")
////////////
// ## A city
////////////
// Where it is on Earth:  what its forecast is asked for by.

export class City extends Thing {
  // - its "name" is text
  @prop({ type: "text" })
  accessor name!: string

  // - its "latitude" is a number
  @prop({ type: "number" })
  accessor latitude!: number

  // - its "longitude" is a number
  @prop({ type: "number" })
  accessor longitude!: number

  /** The city the weather's for */
  pick() {
    publicServers.weather.city = this
  }

  @drawn draw() {
    return (
      <ui-item active={this === publicServers.weather.city} onClick={core.pressed(this, () => this.pick())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
        {this.name}
      </ui-item>
    )
  }
}
core.describeAction(City, "pick", { title: "Pick It", undoneAs: "Pick It" })

core.heading("Its hours")
///////////////
// ## Its hours
///////////////
// A row an hour:  the day at midnight, the hour, and each measure, in the units the reader's region reads, °F and inches in the US.

// -----------
core.heading("The Met Museum:  every artwork in its collection, and a search of all of it")
/////////////////////////////////////////////////////////////////////////////////
// ## The Met Museum:  every artwork in its collection, and a search of all of it
/////////////////////////////////////////////////////////////////////////////////
// A server other people run, and what it holds.  What's drawn from it is in MetMuseum.spell.
// `met museum` is what this wrote, from looking at the server:
//   spell place ingest https://collectionapi.metmuseum.org/public/collection --kind "web server" --docs https://metmuseum.github.io
//     --into MetMuseum.api.spell --name "met museum" --no-ai --collections "artworks=/v1/objects,artworks=/v1.1/search?q=sunflowers"
// `spell place update MetMuseum.api.spell` looks again, and changes only this file and MetMuseum.api.json5.
// Its list is only ids, over 500,000 of them:  each artwork is read whole from its own address, only when something reads it.
// Its search finds ids too, looking at all of each artwork, its tags too:  `every artwork matching ...`.
// It asks for 80 requests a second at most, in its docs:  a program keeps to that.
// Its search pages by "limit" and "offset", up to 500 at a time;  its list of every id takes neither, and comes whole.

export class Artwork extends Thing {
  // - its "highlight" is yes or no, stored as "isHighlight"
  @prop({ type: "choice", storedAs: "isHighlight", declaredAt: { path: "/MetMuseum.api.spell", start: 1517, end: 1570 } })
  accessor highlight!: boolean

  // - its "accession number" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 1572, end: 1602 } })
  accessor accessionNumber!: string

  // - its "accession year" is a number
  @prop({ type: "number", declaredAt: { path: "/MetMuseum.api.spell", start: 1604, end: 1636 } })
  accessor accessionYear!: number

  // - its "public domain" is yes or no, stored as "isPublicDomain"
  @prop({ type: "choice", storedAs: "isPublicDomain", declaredAt: { path: "/MetMuseum.api.spell", start: 1638, end: 1698 } })
  accessor publicDomain!: boolean

  /** an address */
  // - its "primary image" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 1700, end: 1743 } })
  accessor primaryImage!: string

  /** an address */
  // - its "primary image small" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 1745, end: 1794 } })
  accessor primaryImageSmall!: string

  // - its "additional images" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/MetMuseum.api.spell", start: 1796, end: 1837 } })
  accessor additionalImages!: List<string>

  // - its "constituents" is a list of constituents
  @prop({ itemType: "Constituent", init: () => new List<Constituent>({ instanceType: "Constituent" }), declaredAt: { path: "/MetMuseum.api.spell", start: 1839, end: 1883 } })
  accessor constituents!: List<Constituent>

  // - its "department" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 1885, end: 1909 } })
  accessor department!: string

  // - its "object name" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 1911, end: 1936 } })
  accessor objectName!: string

  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 1938, end: 1957 } })
  accessor title!: string

  // - its "culture" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 1959, end: 1980 } })
  accessor culture!: string

  // - its "period" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 1982, end: 2002 } })
  accessor period!: string

  // - its "dynasty" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2004, end: 2025 } })
  accessor dynasty!: string

  // - its "reign" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2027, end: 2046 } })
  accessor reign!: string

  // - its "portfolio" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2048, end: 2071 } })
  accessor portfolio!: string

  // - its "artist role" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2073, end: 2098 } })
  accessor artistRole!: string

  // - its "artist prefix" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2100, end: 2127 } })
  accessor artistPrefix!: string

  // - its "artist display name" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2129, end: 2162 } })
  accessor artistDisplayName!: string

  // - its "artist display bio" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2164, end: 2196 } })
  accessor artistDisplayBio!: string

  // - its "artist suffix" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2198, end: 2225 } })
  accessor artistSuffix!: string

  // - its "artist alpha sort" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2227, end: 2258 } })
  accessor artistAlphaSort!: string

  // - its "artist nationality" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2260, end: 2292 } })
  accessor artistNationality!: string

  // - its "artist begin date" is a number
  @prop({ type: "number", declaredAt: { path: "/MetMuseum.api.spell", start: 2294, end: 2329 } })
  accessor artistBeginDate!: number

  // - its "artist end date" is a number
  @prop({ type: "number", declaredAt: { path: "/MetMuseum.api.spell", start: 2331, end: 2364 } })
  accessor artistEndDate!: number

  // - its "artist gender" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2366, end: 2393 } })
  accessor artistGender!: string

  /** an address */
  // - its "artist wikidata url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2395, end: 2444 } })
  accessor artistWikidataUrl!: string

  /** an address */
  // - its "artist ulan url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2446, end: 2491 } })
  accessor artistUlanUrl!: string

  // - its "object date" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2493, end: 2518 } })
  accessor objectDate!: string

  // - its "object begin date" is a number
  @prop({ type: "number", declaredAt: { path: "/MetMuseum.api.spell", start: 2520, end: 2555 } })
  accessor objectBeginDate!: number

  // - its "object end date" is a number
  @prop({ type: "number", declaredAt: { path: "/MetMuseum.api.spell", start: 2557, end: 2590 } })
  accessor objectEndDate!: number

  // - its "medium" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2592, end: 2612 } })
  accessor medium!: string

  // - its "dimensions" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2614, end: 2638 } })
  accessor dimensions!: string

  // - its "measurements" is a list of measurements
  @prop({ itemType: "Measurement", init: () => new List<Measurement>({ instanceType: "Measurement" }), declaredAt: { path: "/MetMuseum.api.spell", start: 2640, end: 2684 } })
  accessor measurements!: List<Measurement>

  // - its "credit line" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2686, end: 2711 } })
  accessor creditLine!: string

  // - its "geography type" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2713, end: 2741 } })
  accessor geographyType!: string

  // - its "city" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2743, end: 2761 } })
  accessor city!: string

  // - its "state" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2763, end: 2782 } })
  accessor state!: string

  // - its "county" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2784, end: 2804 } })
  accessor county!: string

  // - its "country" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2806, end: 2827 } })
  accessor country!: string

  // - its "region" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2829, end: 2849 } })
  accessor region!: string

  // - its "subregion" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2851, end: 2874 } })
  accessor subregion!: string

  // - its "locale" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2876, end: 2896 } })
  accessor locale!: string

  // - its "locus" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2898, end: 2917 } })
  accessor locus!: string

  // - its "excavation" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2919, end: 2943 } })
  accessor excavation!: string

  // - its "river" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2945, end: 2964 } })
  accessor river!: string

  // - its "classification" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2966, end: 2994 } })
  accessor classification!: string

  // - its "rights and reproduction" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 2996, end: 3033 } })
  accessor rightsAndReproduction!: string

  // - its "link resource" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 3035, end: 3062 } })
  accessor linkResource!: string

  // - its "metadata date" is a date
  @prop({ type: "date", declaredAt: { path: "/MetMuseum.api.spell", start: 3064, end: 3093 } })
  accessor metadataDate!: Date

  // - its "repository" is text
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 3095, end: 3119 } })
  accessor repository!: string

  /** an address */
  // - its "object url" is text, stored as "objectURL"
  //   -- an address
  @prop({ type: "text", storedAs: "objectURL", declaredAt: { path: "/MetMuseum.api.spell", start: 3121, end: 3184 } })
  accessor objectUrl!: string

  // - its "tags" is a list of tags
  @prop({ itemType: "Tag", init: () => new List<Tag>({ instanceType: "Tag" }), declaredAt: { path: "/MetMuseum.api.spell", start: 3186, end: 3214 } })
  accessor tags!: List<Tag>

  /** an address */
  // - its "object wikidata url" is text
  //   -- an address
  @prop({ type: "text", declaredAt: { path: "/MetMuseum.api.spell", start: 3216, end: 3265 } })
  accessor objectWikidataUrl!: string

  // - its "timeline work" is yes or no, stored as "isTimelineWork"
  @prop({ type: "choice", storedAs: "isTimelineWork", declaredAt: { path: "/MetMuseum.api.spell", start: 3267, end: 3327 } })
  accessor timelineWork!: boolean

  // - its "gallery number" is a number
  @prop({ type: "number", declaredAt: { path: "/MetMuseum.api.spell", start: 3329, end: 3361 } })
  accessor galleryNumber!: number

  @drawn draw() {
    if (this.title && this.primaryImageSmall) {
      return (
        <ui-shape class="artwork" direction="over" flip-on="click" aria-label={this.title}>
          <ui-side>
            <ui-card fluid={true}>
              <ui-image src={this.primaryImageSmall} alt={this.title} />
              <ui-content>
                <ui-header>{this.title}</ui-header>
                <ui-meta>{this.artistDisplayName}</ui-meta>
              </ui-content>
            </ui-card>
          </ui-side>
          <ui-side>{this.drawAboutCard()}</ui-side>
        </ui-shape>
      )
    } else if (this.title) return <slot name="about_card">{this.drawAboutCard()}</slot>
  }

  drawAboutCard() {
    // What the Met knows of it:  the back of a picture's card, or the whole card of one with no picture
    return (
      <ui-card fluid={true} part="about_card">
        <ui-content>
          <ui-header>{this.title}</ui-header>
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
    times: ["created", "modified"], select: ["primaryImageSmall", "department", "title", "artistDisplayName", "objectDate", "medium", "dimensions", "creditLine", "city", "state", "region", "objectUrl"] }

  // - it lives in met museum
  @prop({ type: "date", declaredAt: { path: "/MetMuseum.api.spell", start: 1493, end: 1515 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in met museum
  @prop({ type: "date", declaredAt: { path: "/MetMuseum.api.spell", start: 1493, end: 1515 } })
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
    at: "/v1.1/search"
  },
  collections: { artworks: { at: "/v1/objects" } }
})

// -----------
core.heading("The Met Museum")
////////////////////
// ## The Met Museum
////////////////////
// Artworks of the Metropolitan Museum of Art, found by what you type.
// Every thing it shows is in MetMuseum.api.spell, as `spell place ingest` wrote it;  the type below adds to its type there,
// with `<extend>`, so looking again at the server never touches a line of this.
// Its search answers only ids:  each artwork is read from its own address as it's drawn, a page at a time, and no others.

@thing
export class MetMuseumPage extends Thing {
  // - its "search" is text
  @prop({ type: "text" })
  accessor search!: string

  create() {
    this.search = "sunflowers"
  }

  /** What the Met finds for the search, looking at all of each artwork:  ids only, each read as it's drawn */
  static { this.declareProp("found", { declaredAt: { path: "/MetMuseum.spell", start: 538, end: 586 }, readsFrom: ["met_museum"] }) }
  get found() { return core.waitedValue(this, "found", async () => {
    return await core.savedThings(Artwork, { search: { "*": this.search } })
  }, () => [this.search]) }

  async tryWords(words: string) {
    this.search = words
  }

  @drawn draw() {
    return (
      <ui-stack spacing="xl">
        <ui-form class="find" prop:value={this}>
          <ui-stack spacing="sm">
            <ui-stack direction="horizontal" wrap={true} align="center" justify="between" spacing="sm">
              <ui-header size="large">Artworks, from the Met</ui-header>
              <ui-search name="search" parameter="art" icon="search" placeholder="A title, an artist, a subject" aria-label="Search the Met" />
            </ui-stack>
            <ui-toolbar appearance="secondary" size="small" aria-label="Try a search">
              <ui-text slot="title" size="small" color="grey">Try</ui-text>
              <ui-item onClick={core.pressed(this, async () => await this.tryWords("sunflowers"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                Sunflowers
              </ui-item>
              <ui-item onClick={core.pressed(this, async () => await this.tryWords("van gogh"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                Van Gogh
              </ui-item>
              <ui-item onClick={core.pressed(this, async () => await this.tryWords("armor"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                Armor
              </ui-item>
              <ui-item onClick={core.pressed(this, async () => await this.tryWords("egypt"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                Egypt
              </ui-item>
              <ui-item onClick={core.pressed(this, async () => await this.tryWords("cats"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                Cats
              </ui-item>
              <ui-item onClick={core.pressed(this, async () => await this.tryWords("hokusai"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                Hokusai
              </ui-item>
            </ui-toolbar>
          </ui-stack>
        </ui-form>
        {core.drawRead(() => this.found, (artwork: Artwork) => core.drawThing(artwork), {
          waitingSay: () => "Asking the Met",
          none: () => <ui-text>{"The Met has nothing for that."}</ui-text>,
          failedSay: () => "The Met can't be reached just now.",
          paging: () => "pages",
          items: () => <ui-cards layout="mosaic" columns="4" doubling={true} />
        })}
        <ui-text class="credits" size="small" paragraph={true}>
          {"From "}
          <ui-link link="https://metmuseum.github.io">the Met Museum's API</ui-link>
          {", each artwork asked for as it's shown.  Press a picture to turn it over."}
        </ui-text>
      </ui-stack>
    )
  }
}
core.describeAction(MetMuseumPage, "tryWords", { title: "Try Words", undoneAs: "Try Words" })

core.heading("An artwork")
////////////////
// ## An artwork
////////////////
// A card that turns over:  its picture on the front, what the Met knows of it on the back.
// Each is read from its own address the first time it's drawn;  one the Met won't give is left out.
// Only what's in the public domain has a picture:  the rest show what the Met knows of them, with nothing to turn over.

// -----------
core.heading("REST Countries:  every country in the world, its flag, its capital, its money, its languages and its names")
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ## REST Countries:  every country in the world, its flag, its capital, its money, its languages and its names
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// A server other people run, and what it holds.  What's drawn from it is in RestCountries.spell.
// `rest countries` is what this wrote, from looking at the server:
//   spell place ingest https://cdn.jsdelivr.net/gh/mledoze/countries@5.1.0 --into RestCountries.api.spell
//     --name "rest countries" --no-ai --collections "countries=/countries.json"
// `spell place update RestCountries.api.spell` looks again, and changes only this file and RestCountries.api.json5.
// It's the data restcountries.com serves, from the repository that keeps it:  every country in one answer, with no paging.
// Its money, its languages and its names come keyed by a code, `"EUR": { ... }`, `"fra": "French"`:
// each is a list of things, each with its code, `the first translation in its translations where its code is "fra"`.

export class Country extends Thing {
  // - its "name" is a name
  @prop({ type: "Name", declaredAt: { path: "/RestCountries.api.spell", start: 1130, end: 1150 } })
  accessor name!: Name

  // - its "tld" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/RestCountries.api.spell", start: 1152, end: 1179 } })
  accessor tld!: List<string>

  // - its "cca2" is text
  @prop({ type: "text", declaredAt: { path: "/RestCountries.api.spell", start: 1181, end: 1199 } })
  accessor cca2!: string

  // - its "ccn3" is text
  @prop({ type: "text", declaredAt: { path: "/RestCountries.api.spell", start: 1201, end: 1219 } })
  accessor ccn3!: string

  // - its "cca3" is text
  @prop({ type: "text", declaredAt: { path: "/RestCountries.api.spell", start: 1221, end: 1239 } })
  accessor cca3!: string

  // - its "cioc" is text
  @prop({ type: "text", declaredAt: { path: "/RestCountries.api.spell", start: 1241, end: 1259 } })
  accessor cioc!: string

  // - its "independent" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/RestCountries.api.spell", start: 1261, end: 1291 } })
  accessor independent!: boolean

  // - its "status" is text
  @prop({ type: "text", declaredAt: { path: "/RestCountries.api.spell", start: 1293, end: 1313 } })
  accessor status!: string

  // - its "un member" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/RestCountries.api.spell", start: 1315, end: 1343 } })
  accessor unMember!: boolean

  // - its "un regional group" is text
  @prop({ type: "text", declaredAt: { path: "/RestCountries.api.spell", start: 1345, end: 1376 } })
  accessor unRegionalGroup!: string

  // - its "currencies" is a list of currencies
  @prop({ itemType: "Currency", init: () => new List<Currency>({ instanceType: "Currency" }), declaredAt: { path: "/RestCountries.api.spell", start: 1378, end: 1418 } })
  accessor currencies!: List<Currency>

  // - its "idd" is an idd
  @prop({ type: "Idd", declaredAt: { path: "/RestCountries.api.spell", start: 1420, end: 1439 } })
  accessor idd!: Idd

  // - its "capital" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/RestCountries.api.spell", start: 1441, end: 1472 } })
  accessor capital!: List<string>

  // - its "alt spellings" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/RestCountries.api.spell", start: 1474, end: 1511 } })
  accessor altSpellings!: List<string>

  // - its "region" is text
  @prop({ type: "text", declaredAt: { path: "/RestCountries.api.spell", start: 1513, end: 1533 } })
  accessor region!: string

  // - its "subregion" is text
  @prop({ type: "text", declaredAt: { path: "/RestCountries.api.spell", start: 1535, end: 1558 } })
  accessor subregion!: string

  // - its "languages" is a list of languages
  @prop({ itemType: "Language", init: () => new List<Language>({ instanceType: "Language" }), declaredAt: { path: "/RestCountries.api.spell", start: 1560, end: 1598 } })
  accessor languages!: List<Language>

  // - its "translations" is a list of translations
  @prop({ itemType: "Translation", init: () => new List<Translation>({ instanceType: "Translation" }), declaredAt: { path: "/RestCountries.api.spell", start: 1600, end: 1644 } })
  accessor translations!: List<Translation>

  // - its "latlng" is a list of numbers
  @prop({ itemType: "number", init: () => new List<number>({ instanceType: "number" }), declaredAt: { path: "/RestCountries.api.spell", start: 1646, end: 1679 } })
  accessor latlng!: List<number>

  // - its "landlocked" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/RestCountries.api.spell", start: 1681, end: 1710 } })
  accessor landlocked!: boolean

  // - its "borders" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/RestCountries.api.spell", start: 1712, end: 1743 } })
  accessor borders!: List<string>

  // - its "area" is a number
  @prop({ type: "number", declaredAt: { path: "/RestCountries.api.spell", start: 1745, end: 1767 } })
  accessor area!: number

  // - its "flag" is text
  @prop({ type: "text", declaredAt: { path: "/RestCountries.api.spell", start: 1769, end: 1787 } })
  accessor flag!: string

  // - its "demonyms" is a demonym
  @prop({ type: "Demonym", declaredAt: { path: "/RestCountries.api.spell", start: 1789, end: 1816 } })
  accessor demonyms!: Demonym

  static savedIn = {
    place: "rest_countries",
    collection: "countries",
    times: ["created", "modified"], select: ["name", "currencies", "capital", "region", "languages", "translations", "flag"] }

  // - it lives in rest countries
  @prop({ type: "date", declaredAt: { path: "/RestCountries.api.spell", start: 1102, end: 1128 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in rest countries
  @prop({ type: "date", declaredAt: { path: "/RestCountries.api.spell", start: 1102, end: 1128 } })
  accessor modified!: any /* spell: type unknown */
}

export class Name extends Thing {
  // - its "common" is text
  @prop({ type: "text" })
  accessor common!: string

  // - its "official" is text
  @prop({ type: "text" })
  accessor official!: string

  // - its "native" is a list of natives
  @prop({ itemType: "Native", init: () => new List<Native>({ instanceType: "Native" }) })
  accessor native!: List<Native>
}

export class Native extends Thing {
  // - its "code" is text
  @prop({ type: "text" })
  accessor code!: string

  // - its "official" is text
  @prop({ type: "text" })
  accessor official!: string

  // - its "common" is text
  @prop({ type: "text" })
  accessor common!: string
}

export class Currency extends Thing {
  // - its "code" is text
  @prop({ type: "text" })
  accessor code!: string

  // - its "name" is text
  @prop({ type: "text" })
  accessor name!: string

  // - its "symbol" is text
  @prop({ type: "text" })
  accessor symbol!: string

  @drawn draw() {
    return (
      <ui-text>
        {this.name}
        {" ("}
        {this.symbol}
        {") "}
        <ui-text color="grey">{this.code}</ui-text>
      </ui-text>
    )
  }
}

export class Idd extends Thing {
  // - its "root" is text
  @prop({ type: "text" })
  accessor root!: string

  // - its "suffixes" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }) })
  accessor suffixes!: List<string>
}

export class Language extends Thing {
  // - its "code" is text
  @prop({ type: "text" })
  accessor code!: string

  // - its "name" is text
  @prop({ type: "text" })
  accessor name!: string

  @drawn draw() {
    return <ui-text>{this.name}</ui-text>
  }
}

export class Translation extends Thing {
  // - its "code" is text
  @prop({ type: "text" })
  accessor code!: string

  // - its "official" is text
  @prop({ type: "text" })
  accessor official!: string

  // - its "common" is text
  @prop({ type: "text" })
  accessor common!: string
}

export class Demonym extends Thing {
  // - its "eng" is an eng
  @prop({ type: "Eng" })
  accessor eng!: Eng

  // - its "fra" is a fra
  @prop({ type: "Fra" })
  accessor fra!: Fra
}

export class Eng extends Thing {
  // - its "f" is text
  @prop({ type: "text" })
  accessor f!: string

  // - its "m" is text
  @prop({ type: "text" })
  accessor m!: string
}

export class Fra extends Thing {
  // - its "f" is text
  @prop({ type: "text" })
  accessor f!: string

  // - its "m" is text
  @prop({ type: "text" })
  accessor m!: string
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
core.heading("REST Countries")
////////////////////
// ## REST Countries
////////////////////
// Every country in the world, by region:  its flag, its capital, its money and its languages, and its name in another language.
// Every thing it shows is in RestCountries.api.spell, as `spell place ingest` wrote it;  each type below adds to its type there,
// with `<extend>`, so looking again at the server never touches a line of this.
// All 250 come in one request, with no paging:  picking a region only looks through them again.

@thing
export class RestCountriesPage extends Thing {
  // - its "region" is text
  @prop({ type: "text" })
  accessor region!: string

  /** its language's code, as REST Countries keys its names:  `fra`, `spa`, `deu`, `jpn` */
  // - its "language" is text
  //   -- its language's code, as REST Countries keys its names: `fra`, `spa`, `deu`, `jpn`
  @prop({ type: "text" })
  accessor language!: string

  create() {
    this.region = "Europe"
    this.language = "fra"
  }

  /** The region's, looked through here:  REST Countries sends every one at once */
  static { this.declareProp("countries", { declaredAt: { path: "/RestCountries.spell", start: 719, end: 826 }, readsFrom: ["rest_countries"] }) }
  get countries() { return core.waitedValue(this, "countries", async () => {
    return core.sortedBy(core.filter(await core.savedThings(Country, {}, "looks through"), (country: Country) => country.region === this.region), (item: Country) => item.name?.common)
  }, () => [this.region]) }

  pickRegionRegion(region: string) {
    this.region = region
  }

  @drawn draw() {
    return (
      <ui-stack spacing="xl">
        <ui-stack spacing="sm">
          <ui-form prop:value={this}>
            <ui-stack direction="horizontal" wrap={true} align="center" justify="between" spacing="sm">
              <ui-header size="large">The world's countries, from REST Countries</ui-header>
              <ui-select name="language" aria-label="Names in">
                <ui-item value="fra">Français</ui-item>
                <ui-item value="spa">Español</ui-item>
                <ui-item value="deu">Deutsch</ui-item>
                <ui-item value="jpn">日本語</ui-item>
              </ui-select>
            </ui-stack>
          </ui-form>
          <ui-toolbar appearance="secondary" aria-label="Regions">
            <ui-item active={this.region === "Africa"} onClick={core.pressed(this, () => this.pickRegionRegion("Africa"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Africa
            </ui-item>
            <ui-item active={this.region === "Americas"} onClick={core.pressed(this, () => this.pickRegionRegion("Americas"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              The Americas
            </ui-item>
            <ui-item active={this.region === "Asia"} onClick={core.pressed(this, () => this.pickRegionRegion("Asia"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Asia
            </ui-item>
            <ui-item active={this.region === "Europe"} onClick={core.pressed(this, () => this.pickRegionRegion("Europe"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Europe
            </ui-item>
            <ui-item active={this.region === "Oceania"} onClick={core.pressed(this, () => this.pickRegionRegion("Oceania"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Oceania
            </ui-item>
            <ui-item active={this.region === "Antarctic"} onClick={core.pressed(this, () => this.pickRegionRegion("Antarctic"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              The Antarctic
            </ui-item>
          </ui-toolbar>
        </ui-stack>
        {this.drawCountriesTable()}
        <ui-text size="small" paragraph={true}>
          {"From "}
          <ui-link link="https://github.com/mledoze/countries">the data REST Countries serves</ui-link>
          , every country in one request.
        </ui-text>
      </ui-stack>
    )
  }

  drawCountriesTable() {
    // A row a country:  its flag and name, its name in the language picked, its capital, its money and its languages;  each of those keyed by a code, `EUR`, `fra`, a list of things with that code
    return core.drawRead(() => this.countries, (country: Country) => <>
      <ui-cell data-column="Flag" align="center">
        <ui-text size="big">{country.flag}</ui-text>
      </ui-cell>
      <ui-cell data-column="Country" header={true}>{country.name?.common}</ui-cell>
      <ui-cell data-column="Its name there">
        {core.getItemAt(core.filter(country.translations, (translation: Translation) => translation.code === publicServers.atlas.language), 0)?.common}
      </ui-cell>
      <ui-cell data-column="Capital">{core.getItemAt(country.capital, 0)}</ui-cell>
      <ui-cell data-column="Money">
        <ui-stack spacing="none">{core.drawItems(country.currencies)}</ui-stack>
      </ui-cell>
      <ui-cell data-column="Languages">
        <ui-stack direction="horizontal" wrap={true} spacing="xs">{core.drawItems(country.languages)}</ui-stack>
      </ui-cell>
    </>, {
      waiting: () => <ui-loader visible={true} inline={true} text={true} part="countries_table">{"Asking REST Countries"}</ui-loader>,
      failedSay: () => "REST Countries can't be reached just now.",
      items: () => <ui-table appearance="very-basic" padding="compact" vertical-align="top" part="countries_table">
        <ui-row />
      </ui-table>
    })
  }
}
core.describeAction(RestCountriesPage, "pickRegionRegion", { title: "Pick Region Region", undoneAs: "Pick Region Region" })

core.heading("Its money")
///////////////
// ## Its money
///////////////
// Its name, its symbol and its code:  `Euro`, `€`, `EUR`.

core.heading("A language")
////////////////
// ## A language
////////////////
// Its name in English, keyed by its code:  `French`, `fra`.

// -----------
core.heading("Public Servers")
////////////////////
// ## Public Servers
////////////////////
// Servers other people run, each read through the Spell `spell place ingest` wrote for it, untouched:  each a page of its own, on a tab, in one centred column.
// The tab chosen, and each page's search, are kept in the page's address (`?server=met&art=van+gogh`), so Back steps through them.
// GitHub's is first, then Open Library's, then JSONPlaceholder's, which takes writes, then Open-Meteo's, the weather, then the Met Museum's artworks, then REST Countries', every country.

@thing
export class PublicServer extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "tab" is text
  @prop({ type: "text" })
  accessor tab!: string

  // "github" is a new github page
  @prop({ init: () => new GithubPage({ id: "github" }), early: true })
  accessor github!: GithubPage

  // "library" is a new open library page
  @prop({ init: () => new OpenLibraryPage({ id: "library" }), early: true })
  accessor library!: OpenLibraryPage

  // "weather" is a new open meteo page
  @prop({ init: () => new OpenMeteoPage({ id: "weather" }), early: true })
  accessor weather!: OpenMeteoPage

  // "museum" is a new met museum page
  @prop({ init: () => new MetMuseumPage({ id: "museum" }), early: true })
  accessor museum!: MetMuseumPage

  // "atlas" is a new rest countries page
  @prop({ init: () => new RestCountriesPage({ id: "atlas" }), early: true })
  accessor atlas!: RestCountriesPage

  create() {
    this.tab = "github"
  }

  @drawn draw() {
    return (
      <ui-container>
        <ui-stack spacing="lg">
          <ui-form prop:value={this}>
            <ui-tabs name="tab" parameter="server" appearance="secondary pointing basic" aria-label="Servers">
              <ui-tab label="GitHub" value="github" />
              <ui-tab label="Open Library" value="library" />
              <ui-tab label="JSONPlaceholder" value="jsonplaceholder" />
              <ui-tab label="Open-Meteo" value="weather" />
              <ui-tab label="The Met" value="met" />
              <ui-tab label="REST Countries" value="countries" />
            </ui-tabs>
          </ui-form>
          {this.drawServer()}
        </ui-stack>
      </ui-container>
    )
  }

  drawServer() {
    // The tab's page:  its own drawing, so its `if` picks just one, and only that one asks its server
    if (this.tab === "github") return core.drawThing(this.github)
    else if (this.tab === "library") return core.drawThing(this.library)
    else if (this.tab === "jsonplaceholder") return core.drawThing(new JsonplaceholderPage())
    else if (this.tab === "weather") return core.drawThing(this.weather)
    else if (this.tab === "met") return core.drawThing(this.museum)
    else if (this.tab === "countries") return core.drawThing(this.atlas)
  }
}

/**
 * `<test-project-app>`:  a public server, drawn in its own element, e.g. by `draw the public server`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its public server's properties;  its methods call its public server's.
 * - What every view's element does, e.g. drawing its public server, is `SpellElement`'s.
 */
export class PublicServerElement extends SpellElement<PublicServer> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "public server", [
    { name: "tab", kind: "string", description: "Its tab." },
    { name: "github", kind: "json", description: "Its github." },
    { name: "library", kind: "json", description: "Its library." },
    { name: "weather", kind: "json", description: "Its weather." },
    { name: "museum", kind: "json", description: "Its museum." },
    { name: "atlas", kind: "json", description: "Its atlas." }
  ])

  create() {
    return this.currentThing?.create()
  }

  drawServer() {
    return this.currentThing?.drawServer()
  }
}
core.useElement(PublicServer, PublicServerElement)
export const publicServers = new PublicServer()
// -----------
if (!core.isCarryingOver) publicServers.start()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `PublicServerElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
