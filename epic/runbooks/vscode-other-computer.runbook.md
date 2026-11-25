---
title: The new VS Code extensions, on another computer
folder: ~/www/spell
---

# The new VS Code extensions, on another computer

Bring another computer's VS Code up to the extensions on GitHub's `main`:
spell-epic's (the side bar's Review, Details and Servers tabs) and Spell's language extension.
About 5 minutes.

Start it with `spell runbook start vscode-other-computer`, on that computer.
It runs the commands in `~/www/spell`, that computer's main checkout.

## Get main from GitHub

Its main checkout takes what was pushed.
Uncommitted work there stops the pull:  commit it or move it aside first.

```sh
git checkout main && git pull --ff-only
```

If not:  `Not possible to fast-forward` means that computer has commits GitHub doesn't:
tell Claude, and push them from there first.

## Install the packages

```sh
yarn install
```

## Build and install spell-epic's extension

It bundles the extension, writes `spell-epic.vsix`, and installs it into VS Code.
`code` must be on your `PATH`:  in VS Code, "Shell Command:  Install 'code' command in PATH".

```sh
cd epic/vscode && yarn install && yarn package && code --install-extension spell-epic.vsix
```

Should:  the last line says `Extension 'spell-epic.vsix' was successfully installed.`

## Build and install Spell's language extension

```sh
spell app vscode build && spell app vscode install
```

If not:  `spell: command not found` means this computer has no `spell` link yet:
run `yarn cli:install` here, then this step again.

## Reload every VS Code window

In each VS Code window, between Claude turns:  the Command Palette (⇧⌘P), "Developer:  Reload Window".
A window keeps running the old extension until it's reloaded.

Should:  the right side bar shows the Servers tab, between Epic Docs and Details.

## Check it took

In one of those windows, ask its Claude Code session to run this, or run it in that window's terminal:

```sh
epic window which
```

Should:  it prints a `pid` and the window's folders.

If not:  `no window:  the spell-epic extension's bridge isn't running` means that window wasn't reloaded yet.
