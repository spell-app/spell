# Publishing to npm

One command publishes all of Spell, and a plain run never touches what `npm install spell` gets:

```sh
spell publish --help
```

<details>
<summary>Output</summary>

```text
Usage: spell publish [options]

build, pack and check spell, spell-ui and spell-epic, try them in a scratch
project, then publish

Options:
  --dry-run     stop before publishing:  build, pack, check, scratch install
  --no-scratch  skip the scratch install (it needs the network)
  --json        print the packed packages and every check as JSON
  --tag <tag>   the npm dist-tag to publish under;  only `--tag latest` moves
                latest (default: "next")
  -h, --help    display help for command
```

</details>

`npm publish` puts one folder on the registry, as `latest`, the moment you press Enter.
`spell publish` builds three packages from one checkout, proves each one installs and runs somewhere else first,
and publishes under `next`, so `latest` moves only when you say so.

## Three packages, one version

| Package | What's in it |
| --- | --- |
| `spell` | the whole kit:  its `src/` and every folder's, built to JavaScript in `dist/<folder>/`, and the `spell` command |
| `spell-ui` | Spell UI on its own, one library build with the element code inside |
| `spell-epic` | the epic plugin for Claude Code, its code `spell`'s |

- They share ONE version, the kit's `package.json` `version`.
- `spell` goes first:  the other two depend on it.
- How each is built, staged and checked:  [the command line's `spell publish`](cli.md#the-kit).

## What a run does

1. Builds each package and packs it into the kit's `dist-packs/` (git-ignored).
2. Checks each pack:  built code only, every file its `exports` names is in it, one copy of the element base class.
3. Installs the packs in a scratch project outside the checkout, and tries them:
   a node import, a Vite page that draws a `<ui-button>`, `npx spell help`, `npx epic --help`,
   and the epic server started from the install, an epic page and the epics pack answering.
4. Publishes each, `spell` first:  `npm publish <pack> --tag next`.

`--dry-run` stops after step 3, and is the run to make first.
Step 4 happens only when every check passed;
a failed check prints `N check(s) failed:  nothing more published`.

<details>
<summary>What it printed</summary>

The first and last lines of a dry run, from the command's own messages;  the middle is a pack summary and a `✓` or
`✗` line per check, for each package:

```text
spell publish --dry-run:  3 packages at 0.8.6, tag next
...
scratch install
...
dry run:  every check passed;  nothing published
```

</details>

### `next` until you say `latest`

`--tag` defaults to `next`.
Anyone can try the new version with `npm install spell@next`, while `npm install spell` still gets `latest`:
today the coming-soon placeholder, `spell@0.8.1`.

When a version under `next` is ready for everyone, point `latest` at it.
Nothing is rebuilt or republished:

```sh
npm dist-tag add spell@<version> latest
```

<details>
<summary>What it printed</summary>

```text
+latest: spell@<version>
```

</details>

`spell publish --tag latest` does the same in one go, for a version that isn't out yet.

## Publishing from GitHub

A real publish runs on GitHub, in the publish workflow, [publish.yml](../.github/workflows/publish.yml),
and needs no npm token:  npm trusts that one workflow by name.
That's npm's [trusted publishing](https://docs.npmjs.com/trusted-publishers):
nothing to keep in `~/.npmrc`, nothing that expires every 30 days.

1. Bump `version` in the kit's `package.json`, and commit it to `main`:  the workflow never changes the version.
2. On GitHub, open the repo's Actions tab, pick "publish", and press "Run workflow" on `main`.
3. Choose:
   - the tag:  `next` (the default) or `latest`
   - dry run:  yes or no;  make a dry run first

The run sets up the same machine the checks workflow does, builds the epic VS Code extension's package,
checks the dependencies (`spell deps check`), then runs `spell publish --tag <tag>`, with `--dry-run` when asked.

- `npm publish` finds the identity token GitHub hands the run, and npm checks it against the package's settings.
  No login at all.
- npm adds a provenance statement:  npmjs.com shows which commit and workflow built each version.
- The run's summary shows what the publish printed;  its artifact holds the packed `.tgz` files.
- Under `latest`, the publish turns the root marketplace file's `epic` entry to npm's `spell-epic`.
  Nobody commits on GitHub, so the run's summary prints the file:  commit it on `main` yourself.
- A real publish runs only from `main`;  a dry run, from any branch.
- It stops after an hour.

On a laptop, `spell publish --dry-run` still works, and needs no login:  it never publishes.

### Linking each package to the workflow, once

Only the packages' owner can, on npmjs.com, logged in with two-factor authentication.
Each package has to exist on npm already:  all three do.

1. For EACH of `spell`, `spell-ui` and `spell-epic`:
   open the package's Settings, find "Trusted Publisher", pick GitHub Actions, and fill in:

   | Setting | Value |
   | --- | --- |
   | Organization or user | `spell-app` |
   | Repository | `spell` |
   | Workflow filename | `publish.yml`, the name only, not its folder |
   | Environment | empty |

   Or from the terminal after a plain `npm login`, one line per package
   (a token that bypasses two-factor authentication is refused for this):

   ```sh
   npm trust github spell --repo spell-app/spell --file publish.yml --allow-publish
   ```

   npm offers to skip the one-time password for 5 minutes after the first, so the other two go through at once.
2. Within 2 days, start a dry run, then a real one under `next`.
   npm drops a new trusted publisher that hasn't published within 2 days, and it has to be made again.
3. Once a real run has published all three:
   - each package's Settings, "Publishing access":  "Require two-factor authentication and disallow tokens".
     The workflow keeps publishing;  only tokens are shut out.
   - revoke the 30-day token on npmjs.com, and delete its line from `~/.npmrc`

npm doesn't check a trusted publisher when you save it:  a typo shows up only as a failed publish.

### Until then:  a 30-day token

Before the workflow has published, a laptop publishes with a token.
An `npm login` session lasts about two hours, so it's gone by the time a slow dry run finishes.
Log in with a granular access token instead, made once a month:

1. On npmjs.com, under Access Tokens, make a new Granular Access Token.
2. Set it up like this:

   | Setting | Value | Why |
   | --- | --- | --- |
   | Permissions | Read and write | publishing writes |
   | Packages | All packages | the names are unscoped, and a package that doesn't exist yet can't be picked |
   | Bypass two-factor authentication | on | otherwise every `npm publish` stops for a one-time password |
   | Expiration | 30 days | a month of releases;  then make a new one |

3. Put it in `~/.npmrc`, REPLACING the line `npm login` wrote:  one token line for the registry, never two.

   ```text
   //registry.npmjs.org/:_authToken=npm_...
   ```

4. Check it:

   ```sh
   npm whoami
   ```

   <details>
   <summary>What it printed</summary>

   ```text
   owenoak
   ```

   </details>

The catch:  npm says tokens which bypass two-factor authentication lose direct publishing around January 2027.
After that, such a token can only stage a publish, which goes public once a person approves it.
The workflow doesn't need one.

## Things that trip people up

| Symptom | Cause | Fix |
| --- | --- | --- |
| a pasted command with a `#` comment after it fails | zsh doesn't take `#` comments typed at its prompt | paste commands without their comments |
| `npm publish dist-packs/x.tgz` goes looking for a GitHub repo | a path without `./` reads as `user/repo` | write `npm publish ./dist-packs/x.tgz` |
| `You cannot publish over the previously published versions` | a version can never be reused, not even one only staged and never released | bump `version` in the kit's `package.json`, and publish again |
| the workflow's `npm publish` fails with `E422`, `repository.url ... expected to match` | with provenance, npm checks that the package names the repo that built it | the folder's `package.json` `repository` names `https://github.com/spell-app/spell`, with its folder as `directory` |
| the workflow's `npm publish` asks for a login, or says it can't find a trusted publisher | the package's Trusted Publisher on npmjs.com doesn't match the run, or was dropped after 2 days unused | check its four settings (above), save it again, and run again within 2 days |
| `spell-ui` or `spell-epic` fails to install | it was published before the `spell` it depends on | publish `spell` first;  `spell publish` does |
| Claude stops at `npm publish` in auto mode | publishing isn't allowed by default | add `Bash(npm publish:*)` to `permissions.allow` in `~/.claude/settings.json` |

## Where things are

| File | What it does |
| --- | --- |
| [publish.yml](../.github/workflows/publish.yml) | the publish workflow:  started by hand, the tag, the dry run, no token |
| [publishCommand.ts](../src/cli/commands/publishCommand.ts) | `spell publish`:  the packages, the version, the order, the tag, the publish |
| [PublishedPackage.ts](../src/cli/publish/PublishedPackage.ts) | one package's staging folder, its published `package.json`, `npm pack`, the checks |
| [ScratchInstall.ts](../src/cli/publish/ScratchInstall.ts) | the packs installed in a scratch project, and what it tries |
| [package.json](../package.json) | the one `version` all three publish at |

## See also

- [README/cli.md](cli.md#the-kit):  `spell publish` beside the kit's other commands, and how each package is built
- [README/development.md](development.md):  the checks a change passes before it's worth publishing
- [README.md](../README.md):  setup from zero, and the index of every page
