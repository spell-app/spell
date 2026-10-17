# Spell Epic for VS Code

spell-epic's side of VS Code (epic `epic-eject` P7), built and installed from spell-epic's one checkout:

- **Review**, in the right side bar:  the epic page being reviewed (`/epic review <name>`).
  - And **Open Epic...**, to pick any registered repo's epic, from any window.
- **Epic Docs**, beside it:  docs pages (`epic open`, `/spell-docs`).
- Both are served live, by the first of these that runs:
  - spell-epic's one page server per machine (`epic hub`)
  - the file's checkout's page server
  - a small server of the extension's own
- The **window bridge**:  a Claude Code session reaches its own window.
  - To show a doc, add a folder, or hand the session over to a worktree's window.
  - Its registry is `~/.spell-epic/windows/`.

Every id is `spellEpic.*` (`spell-app.spell-epic`), so it runs beside the spell language extension.

```sh
yarn install      # once, here
yarn check        # typecheck
yarn package      # out/extension.js, then spell-epic.vsix
code --install-extension spell-epic.vsix
```
