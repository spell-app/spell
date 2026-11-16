# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, and others)
when working with code in this folder, `src/app/` of the kit's app folder (`spell/app/app`),
and in the app's build folder, `app/` at the app folder's root.

**READ the app folder's [AGENTS.md](../../AGENTS.md) and [WWOD](../../agents/wwod/WWOD.md) FIRST:**
- the folder's:  its layout
- WWOD:  the house style every folder shares
- Only what's local is below.
  A section named like a WWOD rule extends it.

## Overview

- The top of the chain (below `cli`):  the web app and the embeddable web components.
  - Everything else is a folder it imports:  spell, lsp, parser, util, Spell UI ...
  - Its server is spaces' (below).
- The app is Solid 2 (READ the root's Solid 2 pointer for Solid work).
  - So is what compiled spell draws, on the page's Spell UI (epic `output-targets` P10-P11):
    `core`'s [drawing.ts](../../../parser/src/core/drawing.ts).
  - No React:  every `.tsx` is Solid.
  - `build.test.ts` pins that no chunk holds React, `spell-runtime.js` included.
  - Three test projects (the root's `vitest.config.ts`):
    - All read the app folder's `tests/app/`, where the tests live at the same paths as the code:
      the test of this folder's `index.tsx` is [solid.test.tsx](../../tests/app/solid.test.tsx).
    - `app:node`, for most tests:  there Solid is its SERVER build
      (`renderToString`;  writes NOT staged, see [solid.test.tsx](../../tests/app/solid.test.tsx))
    - `app:browser` (chromium), for `*.browser.test.ts(x)`:  Solid's client build, as in the app
    - `app:integration`, for `tests/app/pages/*.test.ts`:  headless Playwright over this checkout's running editor,
      one file at a time
  - `spell/app/app/solid` is the app's UI, all Solid (P8).
    - the pages' shell (`SpellPage`, `AppRoot`)
    - menus, panes, dialogs, and the plumbing
    - `cellsBridge.ts` makes every Solid computation follow spell cells:
      spell Things, `SP.*`, the editor (P11).
      - Each entry imports it before rendering.
      - `tracked()` is a memo over such a read.
- `src/` is the app:
  - `solid/`:  the UI
  - `pages/`:  the pages and the router;  among them a site's editor, `/site/<project>` (`SiteEditorPage`, epic
    `mockup` P4), which changes the site's file through `SiteWrites`;  a page's stories, `PageStories` (P6);
    its board of sections and cards, `SiteBoard` and `<SiteBoardView>` (T31);  a site of its routing alone, `X.site.spell`,
    each page a file of its own, made by a double click (`SiteWrites.openPart()`, P17);  a group's sites, `/site/<group>` (`SiteGroupPage`);  every site, `/site` (`SitesHomePage`)
  - `ui/`:  `UI`, shared UI types, Monaco's plumbing,
    and the editor's words, `AppTexts` ([README-app.md](../../README-app.md), "The editor's words")
  - `runner/`:  runs compiled spell (below)
  - `spellEditor/`:  `<spell-editor>`'s pane (below)
  - `editor.ts`:  the editor's state and actions, ONE `editor` for the page
  - `EditorHistory.ts`:  what's undone outside the code, the side bar's changes and a notebook's (`editor.history`);
    `solid/InspectorWrites.ts` writes the Inspector's changes through it;
    `solid/PartEdits.ts` the parts added, moved, cut, pasted and deleted, drawn by `solid/Palette.tsx`
    `solid/ChangeThis.tsx` asks a Claude session on this machine to change what's selected (`spaces`' `ChangeRequests`)
  - `layout/`:  how the editor loads its own Spell (`layoutSpell.ts`);  the Spell itself is ONE project of the group `@spell/editor`,
    `spell-editor`, one file, `SpellEditor.spell`:  the app `spell editor`, whose views are the top bar, the panes, the file tabs
    and the menus (P22, P29;  [README-app.md](../../README-app.md), "The editor in Spell");  opened as a project, its app
    pane draws each of its views in a zone of its own (`solid/EditorZones.tsx`, T63)
  - `index.tsx`:  the entry, drawing the app into `#app-root`
  - `ServerCompileStore.ts`:  the editor's compile cache, on the page server (`/api/compiles`;  epic `language` P27),
    installed by `index.tsx`, never in the static build
    - a reload doesn't compile a project that hasn't changed:  `compileApp()` runs what's kept at once, then
      compiles behind it, not from the cache and saving nothing, for what reads the parse and each file's compile:
      the side bar, the code's marks, the compiled-code pane (`editor.compileBehind()`;  epic `language` r11)
      - a compile behind that fails still parses, so hover and go to definition work before the first edit (I127)
    - the counts:  `SpellProject.compileCache.counts` in devtools, and a `compile-cache` line per compile
- Its server is NOT here (epic `people-and-orgs` P14):  it's spaces' ([spaces' AGENTS.md](../spaces/AGENTS.md)).
  - the API, the editor's route module and `ProjectBuild`
  - in spaces' [route modules folder](../spaces/server/node/routes/)
- In its build folder, [app/](../../app/) at the app folder's root (Vite's root:  its paths are from there):
  - the page, `index.html`
  - `demo/`, `static/`, `scripts/` (App UI's data and pictures, `stop.mjs`)
  - the vite configs, `vite*.config.ts`;  the tests' are the root's `vitest.config.ts`
  - `docs/`, App UI (below);  the builds, `dist*/`
- Its scripts are the app folder's (its `package.json`), the builds `cd app && ...` (epic `repo-split` P11):
  - The editor (vite, port 3000 if free, else any) is the PAGE SERVER's child.
    - Spaces' [appRoutes.ts](../spaces/server/node/routes/appRoutes.ts) starts it (`EditorServer`)
      once the page server listens, and stops it with the page server.
      - It's a route module ([the kit's server AGENTS.md](../../../src/server/AGENTS.md)).
    - So `spell server` (the kit's root) runs the API AND the editor.
      - its URL:  in `.spell-server.editor.json`, at the checkout's root
      - its output:  in `.spell-server.editor.log`
    - `SPELL_NO_EDITOR=1` skips it.
  - `yarn start`:  restarts the page server, then runs `spell app serve --headless`,
    which waits for the editor and prints its URL.
    - `yarn stop` stops vite:  an orphan, or the page server's (then restart the page server).
    - `yarn start:server` / `start:server:prod` still run the API alone,
      on port 3001 ([its entry](../spaces/server/node/routes/cli.ts), in spaces).
  - `yarn build`:  the app.
    - `yarn build:runner`:  `app/dist-runner/`, VS Code's "Run Project" webview
    - `yarn build:element`:  `app/dist-element/`, the web components and their pack
      - `<spell-viewer>` and `<spell-editor>`
      - `<spell-code>` and `<spell-markdown>`, and `spell-language.js` (`vite.code.config.ts`, below)
      - their pack, `spell.pack.js`
    - `yarn build:page`:  `app/dist-page/`, the page side of a Python spell app (epic `python-target` P20)
      - `spell-page.js` ([spellPage.ts](runner/spellPage.ts)):  the page's `@spell/core`
        - It exports what `spell-runtime.js` does, `css` included:
          [spellPage.test.ts](../../tests/app/runner/spellPage.test.ts) fails on one it leaves out.
      - It sets the page up itself.
      - spaces' `spell_quart`, Python's web server, serves it ([spaces' AGENTS.md](../spaces/AGENTS.md)).
  - `spell app preview build`:  `app/dist-static/`, the STATIC build, the public preview (epic `debut` P9)
    - the editor in Vite's `static` mode, plus the examples and guides compiled, their lists and indexes as files
      ([PreviewSite.ts](../cli/PreviewSite.ts));  `spell app preview serve` shows it as a host would
    - ONE flag hides what needs a server:  `isStaticBuild` in code, `:root.spell-static` in CSS
      ([static/](static/));  the actions it leaves out are `HIDDEN_IN_STATIC_BUILD` (`Actions.tsx`)
    - Files load through `LoadableFile.fetch`, answered by `StaticFiles`:
      - the build's copies
      - a visitor's own projects, in the group `you@spell` (`LOCAL_PERSON`, in this build):
        the store `spell-static-projects`, their files' text with the edits
      - a visitor's edits, kept in their browser's database (`DatabasePlace`, the store `spell-static`):
        "Reset Example" forgets them
        - edits kept in `localStorage` before epic `prefs-and-undo` P3 move over once;  every read waits for that
      - what spell builds from them:  the page's memory only
  - ONE Solid per page, across those bundles.
    - `vite.solid.config.ts` builds FIRST, into each folder:
      - `spell-solid.js`:  Solid itself, plus
        - Spell UI's element core (`spell/ui/core`, which carries `spell/element`) and its root family
        - `@solidjs/h`, which compiled spell draws with
        - icon packs beside it
      - `spell-ui.js`:  the `spell-ui` barrel, lazy
        - its chunks in `ui/`
        - it also puts `registerPack` on `globalThis.SpellUI`
    - The element / editor / runner builds import them through `sharedSolid()` (`vite.shared.ts`),
      never bundling their own.
    - They take Solid and the core through `spell-solid-shared.js`:
      - the page's own, when it has them (a docs page's `SpellUI.packModules`)
      - else `spell-solid.js`
    - `<spell-code>` and `<spell-markdown>` take the Spell UI families they extend through `spell-ui-shared.js`
      (`SHARED_FAMILIES`, `vite.shared.ts`):
      - the page's own, on the same condition:  its `SpellUI.packModules` MUST then name them too
        (`spell/ui/components/ui-code`, `spell/ui/components/ui-markdown`), or the script stops with an error saying so
      - else `spell-ui.js`'s
    - `spell-runtime.js` takes Solid and `h` through it too, since compiled spell draws with Solid.
      It never takes `spell-ui.js`.
    - Pinned by `element.build.test.ts`.
  - `spell app vscode` is NOT here:  it's the app folder's (its `src/cli/`).
  - `yarn lsp:start` and `yarn lsp:scopes` are [lsp](../lsp/)'s.
- [The app's Monaco plumbing](ui/monaco/) (no UI).
  - Its language features call the SAME `LSP.SpellLanguageService`, in-process.
    So `spell/app/lsp` stays browser-safe:  [lsp's AGENTS.md](../lsp/AGENTS.md).
  - It draws Spell in the bubbly look as it's typed (epic `language` P50):  [SpellBubbly](ui/monaco/SpellBubbly.ts),
    from the parser's `SP.BubblyLayout`, marked by [BubblyMarks](ui/monaco/BubblyMarks.ts), styled by
    [bubbly.css](components/spell-code/bubbly.css)'s marked Monaco section, the look's one sheet.
    - The text stays ordinary text:  its pieces are decorations in the sheet's classes, room round a pill is injected
      text, the shapes a layer behind the editor, the room under a declaration a view zone.
    - On by default;  the code pane's "..." menu, "Settings…", "Bubbly look" turns it off (`codeLook`, `codePopups.ts`).
    - Not in a page file.
    - Both sides of a diff too (Publish's `<DiffView>`, epic `editor` T75):  Monaco lines them up round its view zones.
    - A `<CodeSlice>` (the Inspector's Code card) is drawn too (`SpellBubbly.showSlice()`, epic `editor` T72):
      only what's wholly in its lines, so the action whose body it shows draws no band or rail cut off at its edges.
    - An HTML file (a property editor page, `Card.editor.html`) is drawn as the drawn-bubbly page draws HTML:
      [MarkupMarks](ui/MarkupMarks.ts), from the page's own reading of it (`BubblyMarkup`), the box a
      `.bubbly-html` too;  both kinds of marks are worked out by [TextMarks](ui/TextMarks.ts), with no editor in
      them, and made Monaco's decorations by [MonacoMarks](ui/monaco/MonacoMarks.ts) (epic `codemirror` P3)
  - Nine helps as Spell is typed, in every Spell editor, the look on or off ([SpellTyping](ui/monaco/SpellTyping.ts)):
    what each decides from the lines is the language service's `LSP.SpellTyping`, which the CodeMirror test page
    reads too (epic `codemirror` P1);  Monaco's file holds only its wiring
    - the caret snaps into the body a blank line is drawn in:  clicked or arrowed onto, the line gets that body's
      indent, which goes again if it's left untyped;  Backspace takes the caret out a level
    - a letter typed on a blank line takes the next line's indent, so it lands in the body it's drawn in
    - `group `, `its `, `a ` ... at a line's start open a name's quotes, the caret between;  one undo takes them back
    - a space after a tag's name writes the rest of the tag, the caret where its next words go (epic `editor` T68):
      `<action ` => `<action "|" />`, the program's actions listed at once;  `<divider ` => `<divider | />`;
      any other, its closing tag written out, `<segment ` => `<segment |></segment>`;  one undo leaves `<action `
      - the shape choosing it from the suggestion list writes, from the same table (`LSP.CompletionShapes.spaceAfterTag()`)
      - only with nothing more of the tag written after the caret
    - a paste takes the indent where it lands, a drawing's markup laid out as a tree (epic `editor` I53, I59);
      Cmd+V and the right-click menu's Paste alike (I63)
    - Shift+Tab, or Backspace at a line's indent, takes the lines under it out a level with it:  a tag's children
      and closing tag, a body;  one undo
      - a line of a tag's attributes, under its first line, moves alone (I142);  so does a comment line (I161)
    - Enter between a tag's attributes puts the rest on a new line, lined up under its first attribute (epic `editor` I142):
      measured as it's drawn, tabs then spaces;  one undo
    - Enter before a comment after code puts the comment on its own line, at the level of the body under that line,
      so the body still reads as its body (epic `editor` I155, I161);  one undo
    - Enter leaves no tabs or spaces at the end of the line it splits (epic `editor` I160):  the same undo step
  - A drawing's attribute value switches between text and code as it's typed ([CodeOrTextTyping](ui/monaco/CodeOrTextTyping.ts),
    epic `editor` T74):  a `{` typed in `color="blue"` makes it `color={blue}`;  a `"` typed right after a code value's
    `{` makes it text again;  one undo leaves the character typed
    - the right-click menu's Refactor… and the light bulb do it too, "Make it code" / "Make it text"
      (`LSP.CodeOrText`, which both ask, so VS Code has them as well)
  - An error shows its message on a plain hover over its squiggle, though the hover info waits for ⌥
    ([ErrorHover](ui/monaco/ErrorHover.ts), epic `editor` I97)
  - Rename Symbol (F2) renames an action as the Inspector's Code card does, its calls and buttons too, one undo,
    refused in the same words (`renameRefusal()`, epic `editor` I147);  the right-click menu shows it only where
    something can be renamed (`SpellLanguageFeatures.followRenameRow()`), and F2 elsewhere says what can
  - A web address in the code opens on a click on the icon after it, or on ⌘-click as in VS Code,
    whatever key the hover takes
    ([LinkClick](ui/monaco/LinkClick.ts), epic `editor` I101)
  - Drawn bubbly, the code starts 8px from the pane's edge, the fold arrows half over it (`MonacoEditor.css`);
    a press on one folds through [FoldArrows](ui/monaco/FoldArrows.ts), as Monaco would take it as one on the code
    (epic `editor` I154)
  - A colour or an icon attribute's value is picked from its words list's first row, "Pick a color…":
    the palette or the icon picker at the caret ([ValuePicker](ui/monaco/ValuePicker.ts), epic `editor` T61)
  - An attribute's words show quietly under its value once the caret rests in it for a second, the value ticked
    ([ValueChoices](ui/monaco/ValueChoices.ts), epic `editor` T70):  typing or moving hides them, the keys stay with
    the code;  ⌥↓ steps in, a click chooses, Ctrl+Space is the suggestion list
  - Enter after an opening tag (`<content>`, `<toolbar class="x">`) goes in a level;  between `<x>` and `</x>`,
    the caret a level in and the closing tag on its own line (epic `editor` I65):  Spell's Enter rules,
    ONE table, `LSP.SpellTyping.ENTER_RULES`, which `SpellMonaco.CONFIGURATION` is built from,
    with VS Code's `language-configuration.json` kept the same by a test
  - Suggestions show by themselves only where they help (epic `editor` P28):  a tag after `<`, an attribute inside a tag,
    a property after `its` / `'s` / `of`, ONE list, `SUGGEST_WHERE_IT_HELPS` in `codePopups.ts`;
    "Settings…" › "Suggest as you type" makes it everywhere, or never.
    - Spell UI's tags and attributes say what each is, as listed and on hover:  the language service reads them
      through the component pack (`SP.ComponentPacks.help()`), from Spell UI's help table, `help.generated.ts`.
      On every line of a tag split over several, too (I64).
    - A tag or an attribute chosen from the list is written whole, the caret where you type next (I70):
      `<action "|" />`, `<divider />`, `<content>` a line in then `</>`, `color="|"` with its words listed at once;
      a tag that closes itself always with a space before its `/>` (I70 C4).
      The shapes are ONE table, the language service's `LSP.CompletionShapes`, so VS Code writes the same.
  - The files' addresses, `spell:/<file.path>`, are the language service's `LSP.AppAddresses`, with no Monaco in it:
    the scope explorer's packs and the CodeMirror test page use it too (epic `codemirror` P1)
  - What a hover says and which code actions show are decided once for both editors, Monaco-free:
    [CodeEditorFeatures](ui/CodeEditorFeatures.ts)
  - The editors on it are Solid:  `MonacoEditor`, `FileEditor` ([their folder](solid/monaco/)).
    Its barrel re-exports the plumbing.
  - Loaded LAZILY:
    - in the app, through `spell/app/app/solid`'s `LazyMonaco`
    - in `<spell-editor>`, through its `loadMonaco()`
    - NEVER import `spell/app/app/ui/monaco` or `spell/app/app/solid/monaco` statically outside those folders, types aside.
    - Or Monaco (~4.4 MB) lands in the main bundle again.
- [The CodeMirror plumbing](ui/codemirror/), the editor Monaco is moving to (epic `codemirror`):
  only the test page, `/demo/codemirror.html`, shows it until the swap (P6, Q4).
  - One state per file, `FileStates` (P2):  each file keeps its text, undo, folds and selection while another is shown;
    edits from outside the code go in through `applyEdits()`, one undo step each, marked with their `EditWay`.
    - Its own copy of `SpellModels`' editor-free half (J4):  a change to one is copied to the other by hand till P6.
  - Every CodeMirror editor starts from one base setup, `CodeMirrorSetup`:  keys, undo, find, the gutter
    (no line numbers, fold arrows over the code's padding), and CodeMirror's words, which are `AppTexts` keys (`cm...`),
    following `appTexts.lang`.
  - The language service's answers reach it through one converter, `LspToCodeMirror`, the twin of `LspToMonaco`.
  - Its Solid editors are `CodeMirrorEditor`, `FileEditor` and `CodeSlice`, in [their folder](solid/codemirror/),
    as Monaco's are.
  - The whole bubbly look (P3), drawn on the text itself, no layer behind it:  the look's one sheet, `bubbly.css`, has
    a CodeMirror section, and nothing of the look is in `codemirror.css`
    - Spell:  [CodeMirrorBubbly](ui/codemirror/CodeMirrorBubbly.ts), from the same `SP.BubblyLayout` as Monaco's;
      a head's description at its band's right end;  a drawing's tags as HTML's
    - HTML, an HTML file's and a drawing's tags:  [CodeMirrorMarkup](ui/codemirror/CodeMirrorMarkup.ts), from the
      editors' shared `MarkupMarks`, only the step from its stretches to CodeMirror's marks its own;  pointed ends
    - the look off (`codeLook`, through `CodeMirrorLook`'s compartment):  Spell coloured by the parser's own tokens,
      `SP.SpellHighlighter` ([CodeMirrorTokens](ui/codemirror/CodeMirrorTokens.ts)), no grammar of our own
    - ONE colour table for both editors, [CodeRules](ui/CodeRules.ts):  a role's `--ui-code-<role>` colour, Monaco's
      rules and CodeMirror's highlight tags;  the compiled JavaScript, TypeScript and Python pane is coloured by it
    - a slice of a file, `CodeSlice`:  `FileStates.showSlice()`, the file's own text in another view, its edits the
      file's;  only what's wholly in its lines bubbly;  both sides of a diff bubbly
  - All nine typing helps, Monaco's, on the same rules (`LSP.SpellTyping`), one undo each (P4):
    [CodeMirrorTyping](ui/codemirror/CodeMirrorTyping.ts);  and the code-or-text switch, `{` and `"` in an attribute's
    value, [CodeMirrorCodeOrText](ui/codemirror/CodeMirrorCodeOrText.ts) (`LSP.CodeOrText`)
    - each writes with its key, so only the editor typed in helps:  a file's editor and a slice of it both have them
    - the caret's snap and its undoing are kept out of undo, marked as not typed (`FileStates.EDIT_WAY`)
    - Enter between a tag's attributes measures tabs and spaces as CodeMirror draws them:  the bubbly look's tab stop
      isn't 4 of the font's spaces, so its text can differ from Monaco's, lined up all the same
  - NEVER import `spell/app/app/ui/codemirror` or `spell/app/app/solid/codemirror` statically outside those folders
    and the test page, types aside:  it's to load lazily, as Monaco does.
- Routing (P8):  [the routes](pages/routes.tsx), on `@solidjs/router@next` (`createRouter()`, pinned exactly).
  - The router ships its Solid JSX as SOURCE (`.jsx` files, in its dist folder).
    - [`NOT_SOLID_SOURCE`](../../app/vite.shared.ts) lets the Solid plugin compile it out of `node_modules`.
    - Another such package goes there too.
  - `explicitLinks`:  it takes only `<a link>` clicks, never a running program's own links.
  - `editor` navigates through `navigate()`, in [navigation.ts](pages/navigation.ts) (no Solid in it).
    - The router's root layout hands it its `navigate()`.
    - Route components call `followRoute()`, which hands the URL's params to `editor.selectPath()`.
  - The editor page's shortcuts are ONE list, `EDITOR_HOTKEYS` ([editorHotkeys.ts](pages/editorHotkeys.ts)):
    the page's keys (on Spell UI's keyboard), the code editor's commands and the top bar's menus all read it.
- `index.html` wraps the app in `<ui-root icons="fomantic">`.
  - So the app's icon names are Fomantic's ([loadUI.ts](solid/loadUI.ts)).
  - It still links `semantic.min.css`:  running programs draw with Semantic UI's class words.
- `runner/` runs compiled spell:  the pieces every runner shares.
  - the runners:
    - the web app's editor
    - VS Code's "Run Project" webview (`VSCodeRunner`, `yarn build:runner`)
      - Its Run Tests runs the project's tests on a runtime copy of their own (`testApp()`),
        as `spell test` does (`core.runTests()`, which both share).
      - How they went shows in Output ([testResults.ts](runner/testResults.ts)),
        and goes to the extension, which shows each failed check on its line (lsp's `spell/testDiagnostics`).
    - the `<spell-viewer>` web component, in `components/spell-viewer/`
      - built by `yarn build:element`, into `dist-element/`
      - its demo:  `/demo/spell-viewer.html`, on the dev server
  - Solid (P7), on `spell-ui`.
    - The runners import the Solid panes' FILES, never the `spell/app/app/solid` barrel (it pulls in the editor).
      - e.g. `spell/app/app/solid/ThingExplorer`, `.../ConsoleLines`, `.../loadUI`
    - `<spell-viewer>` is a root itself, with Fomantic's icons by default.
    - VS Code's webview HTML wraps its `#runner-root` in `<ui-root icons="fomantic">`.
  - The PROGRAM draws with the page's Solid too:  `App.start()` mounts its own root (`core.mountApp()`).
    - A runner hands it `appRoot`, a `<div>` drawn once and never touched again.
    - An app is a view:  it mounts as its own element, `<solitaire-app>`, its drawing that element's children
      (epic `elemental-spell` Q62), so the project's `.css` still reaches it.
    - Semantic UI's CSS stays wherever programs draw.
    - Each drawn thing has its own error boundary:  a stand-in, a `ui-error`, and the rest keeps drawing.
  - Programs run on `spell-runtime.js`, NEVER the page's own `core`.
    - It's built from [spellRuntime.ts](runner/spellRuntime.ts).
    - The app loads it once (`editor.loadRuntime()`), and so does the VS Code runner.
    - Each `<spell-viewer>` loads its OWN copy (`loadRuntime()`).
      So apps on a page don't share a `core`.
    - No import map:  `runCompiled()` links each program's imports.
    - A recompile of the same program with an app on the page takes the edit as it runs ([LiveEdit](runner/LiveEdit.ts),
      epic `editor`, Edit Without Redraw):  the same elements and things, only what changed drawn again.
      - What it can't take (a type removed or renamed, a line at the top level) waits for Restart, and the editor says so
        (`editor.restartNeededBecause`, `<RestartNeeded>`):  never a surprise reload.
      - A type ADDED is taken as it runs, with its top-level thing (epic `mockup` P4, J15):
        nothing running can be one of it yet, e.g. a site's new page.
      - A program that imports other projects takes it too, each import weighed the same way, deepest first
        (epic `editor`, Live Edit Everywhere);  one whose imports become other projects runs again.
      - A program with no app runs again instead:  nothing is drawn to keep.
      - A notebook's examples are each a part of the page's drawing (core's `drawPart()`):  an edit to one draws that
        one again, not the page;  a line typed above one only moves it (epic `notebook` P4).
        A move keeps every example and section it can, so only what moved goes elsewhere on the page (I6).
      - A property an edit adds shows as its element's attribute at once, both ways (epic `editor` I47):
        the tag's definition grows in place (`E.DOMElement.addAttributes()`), and the page hears of the new classes
        only once the running things are theirs (core's `takeNewClasses()`).
    - A recompile of the same program keeps its things, e.g. the game in progress
      (`keepThings`, epic `drawable-thing` P16).
      - Restart starts afresh, on purpose:  each runner's own (`restart()`, `editor.restartApp()`).
      - The program's start is skipped:  its top-level test calls, and starting its app (P17).
      - It starts afresh, all the same, when (`runCompiled()`):
        - the edit changed the file that starts its app
        - or one of its things can't come over
  - So ONLY `spellRuntime.ts` may value-import `spell/parser/core`.
    - The program finds its elements through `core.domRoot()`, never `document`.
    - SEE [core's AGENTS.md](../../../parser/src/core/AGENTS.md), "Who may value-import it".
    - Mind barrels:  `spell/app/app/runner` holds `runCompiled()`, so a bundle's entry imports its runner's file directly.
  - A view draws as its own Spell UI element (epic `drawable-thing`).
    - e.g. `a card is a view` draws as `<solitaire-card>`.
    - The element:  [SpellElement.tsx](runner/SpellElement.tsx).
    - A view's class names its tag as it's declared:
      `static elementTag = core.defineElement(this, ...)`.
      - Core asks `core.elementDefiner` once the class is whole.
      - `installSpellElements()` fills that in, per runtime copy.
    - `draw the card` then draws `<solitaire-card>`.
      Its `thing` is the card, which the element draws inside it (`drawOwn()`).
      - It loads the Spell UI families its drawing uses itself (`loadSpellUIFamilies()`):
        no root sees into its shadow root.  A Spanish program's `<es-texto>` too (epic `spanish` J96).
    - A viewable LIST's element holds its items as its children (`core.drawItems()`), shown through its drawing's slot.
      - Its `to draw it` is the wrapper in its shadow root;  each child is what its `to draw each item` draws,
        by default the item's own element (epic `spanish` P20).
    - The example:  `@spell/examples/Solitaire`, each card its own element, each pile styled by its `<css>`.
    - ONE tag per type per page, shared by every runtime copy (`SPELL_ELEMENTS`, on `globalThis`).
    - Compiled TypeScript writes each type's element class itself (P10):
      - e.g. `class CardElement extends SpellElement<Card>`
      - saying only its attributes, methods and sheet
      - and hands it over:  `core.useElement(Card, CardElement)`
      - The page builds the tag on it (`defineFor()`), adding what it left out:
        so both targets draw the same element.
      - It imports `SpellElement` by the name `@spell/elements` ([spellElements.ts](runner/spellElements.ts)):
        - the runtime exports it
        - `runCompiled()` points that name at the runtime too
  - Its Type Explorer reads scope packs, `<Project>.scopes.js` (`LSP.ScopePack`):  no parser in the page.
    - `yarn lsp:scopes [--compile] <projectId...>` writes them.
    - So does the language server, after each clean compile.
  - Its Thing Explorer reads the runtime copy's `core.things` (`ThingRegistry`).
    - Each `Thing`, and each instance of a `List` sub-class, registers itself as it's made.
    - The program's exports are its top-level things.
    - It labels their properties and actions in spell's words, `move (a card) to (a pile)`.
      - The words come from the project's words file, `<Project>.en.js`, in its build folder.
      - The code:  `SP.SpellWords`, and the runner's [words.ts](runner/words.ts).
      - Each runner loads the file beside the scope pack:
        - `<spell-viewer>`, by URL
        - VS Code's, from the extension's `run` message, which brings them
        - an editor's, in what it pushes
      - No words file:  each by its name, `move to pile`.
- `components/`:  `<spell-viewer>` and `<spell-editor>` (epic `spell-element`, P4);
  `<spell-code>` and `<spell-markdown>` (epic `repo-split` P2).
  - They're Spell UI components, written as a component pack's families are
    ([the `epic/` folder's AGENTS.md](../../../epic/src/AGENTS.md)).
  - `components/<tag>/` holds:
    - `<Name>.en.ts`:  the vocabulary
    - `<Name>.tsx`:  two classes
      - the DOM element class, with its script API (`DOMSpellViewerElement`)
      - then the component, on `E.UIComponent` (`import { E } from "spell/element"`).
        `<spell-viewer>`'s is on `UIRoot`.
    - Held to Spell UI's patterns by the lint guard, as every set's elements are (`spell-ui/*`:
      [ui's AGENTS.md](../../../ui/AGENTS.md), "The lint guard";  since epic `people-and-orgs` P17).
    - `index.ts`:  defines the tag;  also the bundle's entry
  - `spell/app/app/components/<tag>` imports one.
  - `<spell-viewer>` is a ROOT (`SpellViewer extends UIRoot`, J37):  a page needs nothing around it.
    - It loads each Spell UI family the runner draws, the first time one appears (in its shadow root too).
      A view's element loads its own:  a root never sees into another element's shadow root.
    - It never loads all of `spell-ui`:  `loadUI.ts` is the editor app's and VS Code's, not its.
    - A spell tag inside it loads from beside its script (`spell-editor` => `spell-editor.js`).
      So a page with only `<spell-viewer>`s never downloads the editor.
    - It takes a root's attributes, like its timeout, theme and size.
    - By default its icons are Fomantic's, and its `display` is `immediately`.
    - Inside another root (a docs page, the editor demo), it's a nested root.
  - A page loads them either way:
    - by itself:  `<script type="module" src="/element/spell-viewer.js">` (or `spell-editor.js`)
    - under a `<ui-root>`, once Spell UI is loaded (`spell-ui.js`)
      - `<ui-components source="/element/spell.pack.js">`
      - e.g. the editor demo:  its editors sit beside the apps, outside any `<spell-viewer>`
  - The pack is NOT `spell pack build`'s one classic script.
    - [vite.element.config.ts](../../app/vite.element.config.ts) writes it, with `componentPack()`:  a classic `spell.pack.js`.
    - Its `define()` imports each family's ES module beside it, one per folder of `components/`.
      - One that won't load is a warning, and the rest still define:
        `spell-code.js` on a docs page whose Spell UI shares no code family, where `<spell-viewer>` still runs.
    - They need lazy chunks (Monaco, the parser), and `spell-runtime.js` per app.
  - On a docs page (with Spell UI of its own), both take Solid and Spell UI's core from the page.
    - That's `SpellUI.packModules`, through `spell-solid-shared.js`.
    - Never a second copy (T3).
  - Leaving the page releases each (`domElement.dispose()`) a microtask later.
    A move in one go keeps it.
  - `<spell-code>` and `<spell-markdown>`:  spell's code and markdown, as SUBCLASSES of Spell UI's `<ui-code>` and
    `<ui-markdown>`, which hold nothing of spell (epic `repo-split` P2, Q19 / Q24).
    - `<spell-code>` (`SpellCode extends UICode`):  `language` is `spell` unless it says otherwise.
      - Its family registers `spell` with the page's `UI.code` as it loads ([SpellLanguage](components/spell-code/SpellLanguage.ts)),
        so EVERY `<ui-code language="spell">` on the page is coloured, and every spell block of a markdown.
      - The colours are spell's parser's (`SP.SpellHighlighter`), from source:  a lazy chunk, on first use.
      - Drawn in the bubbly look (epic `language` P49):  the parser's `SP.BubblyLayout`, as HTML by
        [BubblyHtml](components/spell-code/BubblyHtml.ts), styled by [bubbly.css](components/spell-code/bubbly.css),
        the look's ONE sheet;  `<ui-code>` shows a language's drawing (`CodeLanguage.draw`) unless it numbers or
        wraps its lines.
        - Its `--bubbly-` values for VS Code:  `bubbly.values.json`, `yarn tsx scripts/bubbly-values.ts`.
        - The drawn-bubbly page in the epic repo:  `yarn tsx scripts/bubbly-page.ts`.
    - `<spell-markdown>` (`SpellMarkdown extends UIMarkdown`):  drawn by spell's engine (`spell/parser/markdown`), plain and
      `editable`, in `ui-*` elements ([MDEngine](components/spell-markdown/MDEngine.ts), a lazy chunk).
      - It overrides `UIMarkdown.loadEngine()`;  its barrel imports the families the engine draws with, and
        `<spell-code>` for its spell blocks.
    - Built by [vite.code.config.ts](../../app/vite.code.config.ts), its own build (`yarn build:element` runs it last):
      - `spell-code.js`, `spell-markdown.js`:  the families' barrels;  the pack imports them too
      - `spell-language.js` ([spellLanguage.ts](spellLanguage.ts)):  ONLY `spell` registered, no element,
        on a page with Spell UI of its own
        - what the page server adds to the docs pages it serves (its `"pageScripts"`:
          [the kit's server AGENTS.md](../../../src/server/AGENTS.md)), so epic pages and guides colour spell (Q23)
        - it needs only the page's core, so any docs bundle will do
    - Compiled spell's `<markdown>` blocks stay `<ui-markdown>` (marked):
      they're plain text in a drawing (`LayoutSpell.ts`, `MarkdownBlock`).
- `app/docs/` is App UI (epic `epic-workflow` P11):  the docs pages of the app's components, a COMPONENT SET.
  - Served at `/components/app/`.
  - Laid out as every set is since P18 of `people-and-orgs` (the root's `AGENTS.md`).
  - ONE flat folder:
    - a page per documented component, `<Name>.html` (the web components' `spell-viewer.html` ...)
    - its home, `index.html`
    - `__parts/` (the layout and footer, every page's frame) and `__data/`
    - `_images/` (the pictures) and `_examples/` (snippets a page shows):
      they aren't frame or data, so they keep one `_`
  - Spell UI's page shape, on Spell UI's site bundle:  the page server lays its `_assets/` over the folder.
    - the page server's `componentSets` setting, in the app folder's [package.json](../../package.json)
  - Links are written as from the page's SERVED address (`/components/app/x.html`):
    - `../../` is the checkout's root
    - `../../ui/ui-button.html` is a Spell UI page
    - the layout and footer, in `__parts/`, are one level deeper
  - What it documents, and in which group:  [the hand-kept facts](../../app/docs/__data/pages.json5).
  - Each page's props, attributes and "Used in" tables come from the code:  `yarn site:data`.
    - [The data builder](tools/AppUIDataBuilder.ts) reads, for each listed file:
      - its exported components with a banner (`### `<Name>``)
      - their props types ([ComponentSource](tools/ComponentSource.ts))
      - and every JSX use in the app
    - The web components and a view's element:  their vocabularies, by Spell UI's own builder.
    - It writes the set's data, COMMITTED:  `components.json5` and `search.json5`, in `__data/`.
    - [Its test](../../tests/app/tools/AppUIDataBuilder.test.ts) fails while:
      - they're stale
      - a listed page is missing, or unlinked from the home
      - its component's banner doesn't point at it
    - So rerun it after changing a documented component's banner, props or uses.
  - Pictures, for what needs the whole editor around it:  `yarn site:pictures [name...]`.
    - headless screenshots of this checkout's running editor, into `app/docs/_images/` ([its script](../../app/scripts/site-pictures.ts))
    - Opening the editor compiles its project:  its `*.spell.js`, declarations and words go in `build/`,
      never committed, so nothing beside its source changes.
  - Live examples (the web components, the runner's pieces) need `yarn build:element`:
    the layout loads `/element/spell.pack.js`.
  - A new page:
    1. its entry in `pages.json5`, then `yarn site:data`
    2. a copy of a page like it:  `Notice.html` for a picture, `spell-viewer.html` for a live one
    3. linked from `index.html`
- `spellEditor/` is `<spell-editor>`'s pane:  the app's Monaco editor, as a web component.
  - `yarn build:element` => `spell-editor.js`
  - its demo:  `/demo/spell-editor.html`
  - It edits a server project, and feeds `<spell-viewer>`s what it compiles.
    - That's `SPELL_COMPILED_EVENT`, and `SpellCompiled` in [runner.types.ts](runner/runner.types.ts).
  - Its OWN build, `vite.editor.config.ts`, so Monaco's CSS stays out of `spell-app.css`.
    - Monaco is a lazy chunk:  the parser compiles, and apps run, before it loads.
    - Pinned by `element.build.test.ts`.
  - Several on a page edit several projects.
    - Each `SpellModels.use()`s its own.
    - Each listens with `SpellMonaco.onEdit()` / `onOpen()`, NOT through the app's editor.
    - NEVER import `UI` or `LazyMonaco` there.
- Styles:  WWOD §18 › "Plain `.css` beside its component" (no Less).
  - app-wide sheets:  `spell.css`, `syntax.css`
  - The top bar's SPACING is one rule, in `solid/chrome.css` (Owen, 2026-10-24):
    groups at least 60px apart (`--spell-bar-group-gap`), icons in a group 12px apart (`--spell-bar-icon-gap`),
    measured between what's drawn.
    A new item takes its place in a group;  never a margin of its own.
- Prod builds keep class names (`output.keepNames`, here):
  SEE [parser's AGENTS.md](../../../parser/src/parser/AGENTS.md), `keepNames`.

## Imports

- As WWOD §4, with our own source as `spell/app/app` / `spell/app/app/*`:  a file's path under the app folder's `src/`.
  - e.g. `import { UI } from "spell/app/app/ui"`, `import "spell/app/app/components/spell-code"`
  - Vite's own entries and `index.html`'s script are paths from `app/`, Vite's root:  `../src/app/index.tsx`.
    - The dev server asks for that one as `/src/app/index.tsx`, as a URL can't go above its root:
      `repoSourceInDev()`, in [vite.config.ts](../../app/vite.config.ts), finds it in the app folder's `src/`.
- Nothing imports THIS folder except `cli`.
  And the `<script>` entries in its own pages:  `index.html` and the demos.
- It may import spaces' models, `spell/app/spaces` (the same folder, `app/`);
  NEVER `spell/app/spaces/server/node/...`, which is node only.
  - Another folder's files by name (`spell/parser/spell`, `spell/ui/core` ...):
    the app folder's [AGENTS.md](../../AGENTS.md), "Import names and global types".
  - The editor ([editor.ts](editor.ts)) does:
    - a group's projects are `SPACES.SpellProjectRoot`
    - a project's file create, copy, rename and delete are `SPACES.ProjectFiles` (never `SpellProject`'s)
  - The "You" panel ([YouPanel.tsx](solid/modals/YouPanel.tsx), epic `people-and-orgs` P9)
    talks to spaces' people routes in plain JSON:  it never loads the people library.
    - the route:  `/api/people/me`
    - typed by `SPACES.MeAnswer`
  - `<spell-viewer>` loads only the light files, without the parser:
    - `spell/app/spaces/models/projectGroups`, which registers spell's project groups
    - `spell/parser/spell/SpellSetup`
    - `spell/parser/spell/SpellUrls`
  - Every project file's URL comes from `SP.SpellUrls`:  `/spaces/<project>/<file>`, compiled files too.

## Decorators

As WWOD §12, plus:

- The toolchain's decorator pre-pass, `spell/toolchain/decorators`, is used by every vite config here,
  `vitest.config.ts` included.
  - The server is fine, as `tsx` is esbuild already.

## Types / Exports

As WWOD §8, plus our self-namespace:

- `UI` ~== `spell/app/app/ui`
