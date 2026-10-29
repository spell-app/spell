---
name: designer
description: Review a page's LOOK the way Owen would -- screenshot it headlessly (desktop, a narrow window and phone, light and dark, scrolled under its stuck bars, hover and open states), hold every shot up against the designer's rules (Owen's own design asks, quoted, then the craft rules from interfaces.dev and jakub.kr), and report findings ranked, each with the rule it breaks and the fix;  at the end of a UI phase it fixes the obvious ones itself and asks about bigger changes with before / after pictures.  Use for `/designer <page | URL> [focus]`, at the end of any epic phase that changed a page or an element, or when the person says "how does this look?", "review the design of ...", "what would a designer say about ...", "check the UI of ...".
argument-hint: "<page | URL> [focus]"
---

# /designer

A design review of one page (epic `epic-engine` P24, request r19), against the designer's rules in
[designer/](${CLAUDE_PLUGIN_ROOT}/designer/), three files, each one read:
- [designer.md](${CLAUDE_PLUGIN_ROOT}/designer/designer.md):  how the rules learn, where Owen's asks pull two ways, and
  **Owen's taste** (`T1` ...), his own asks word for word.  They WIN over craft.
  - `Theme: fruity` on a rule:  about the fruity theme's glass and pills;  another theme isn't held to it.
- [craft.md](${CLAUDE_PLUGIN_ROOT}/designer/craft.md):  **craft** (`C1` ...), interfaces.dev's and jakub.kr's rules, each
  with its source;  where one pulls against Owen's, it says so at the rule.
- [procedures.md](${CLAUDE_PLUGIN_ROOT}/designer/procedures.md):  the severity scale, reading a screenshot, reviewing a
  change against its intent (jakub.kr's skills).
- The same files drive the `designer` agent type ([designer-agent.md](${CLAUDE_PLUGIN_ROOT}/designer/designer-agent.md),
  Q11):  another session hands it a page and gets the findings back.
- Headless only:  never Claude-in-Chrome (Owen's standing rule).

## Forms

```
/designer guides/server.html                      a docs page
/designer ui/docs/ui-button.html "the tabs"  a component set's page, a focus
/designer http://127.0.0.1:4747/editor/            any URL
```

## Steps

1. Read the three rule files in full, every time:  they grow (step 6).
2. The shots, from the checkout the page is in:

   ```sh
   epic pages shots <page | URL> --full --out <scratch>/designer \
     --scroll <px | selector>  [--hover "<selector>"]... [--click "<selector>"]...
   ```

   - always:  `desk-*` (1440 wide), `mid-*` (900:  where bars wrap first), `phone-*` (390), each `-light` and `-dark`
   - `--full`:  the whole page at desk and phone width, cut into slices you can read (`desk-light-full-1.png` ...)
   - `--scroll`:  ALWAYS at least one, to a selector a screen or two down (a section's title):  stuck headers, and
     what shows through them, are only in these
   - a focus naming a control, a menu, a fold:  a `--hover` or `--click` on it
   - which server:  a docs page comes from this checkout's page server, a component set's page at its address (the tool
     finds both);  a worktree's page as the person sees it:  `--base http://127.0.0.1:4747/worktrees/<w>`
   - its JSON's `problems` (console errors, a selector that matched nothing) are findings too
3. Look at EVERY shot (`Read` on each PNG).
   - Reading one:  procedures.md, explain-interface's guide.  Sizes are ratios:  never report a px value from an image
     alone;  say "about twice the height of its content".
4. The findings:
   - Each:  what's wrong, WHERE (the shot and the spot:  "phone-dark, the toolbar's right end"), the rule's id and
     title, the fix (the CSS or markup change, as short as it can be said), and its severity, procedures.md's scale:
     `HIGH`, `MEDIUM`, `LOW` (its "HIGH on sight" list:  content overlapped, unreadable text ...).
   - Ranked:  by severity, then a broken T rule before a C rule, then what a person notices first.
   - One root cause, one finding, every place listed;  at most 15.  No padding to the cap, no praise.
   - Only what a shot shows:  a rule marked "Live look" (motion, timing) is a question for the person, never a finding.
   - Last, one line:  "Considered, left out:" with each rule you weighed and didn't apply, and why (a deliberate choice,
     another theme's rule).
5. What happens to them:
   - **The person asked** (`/designer ...`):  the numbered list, short;  then a modal, "Fix these?", the obvious ones
     recommended.
   - **The end of a UI phase** (Q12;  Owen, 2026-10-23:  "yes, and fix obvious things, ask about bigger changes with
     pictures"), before `epic phase ... done`, for a phase that changed a page or an element:
     - OBVIOUS:  ONE place, a SETTLED rule (any T rule not in designer.md's "Where his asks pull two ways", or a C rule
       no T rule pulls against), and no new look to choose:  an icon off centre, padding past the house spacing, a
       ring on a toolbar icon, a label wrapping, a contrast fail.  Fix it, shoot again, and list it in the phase's Done.
     - BIGGER (a layout, a new surface, a colour, anything in "pull two ways", anything the person could want either way):
       ASK, with pictures.
       - A details page ([the details skill](../details/SKILL.md)), one question per change:  the before shot, an after
         shot (the change tried in the page, shot, then undone), the rule it answers;  options "Do it" / "Leave it" /
         Other.
       - Each one also an issue on the epic page, calm unless it breaks one of Owen's own asks:
         `epic add <epic>#I "<what> (designer)" --details "..." --calm`.
   - **The agent type**:  returns the ranked list to the session that asked;  it changes nothing itself.
6. Learn (designer.md says so in its header):
   - The person gives design feedback, in any session:  add it to "Owen's taste" in the same turn, their words quoted, with
     the epic, phase and date (a new `T<n>`, or a quote added to the rule it repeats).
   - The person rejects a finding:  note it under its rule;  rejected twice, reword the rule or drop it.
   - Commit it with the turn's other spell-epic changes:  the rules are code, versioned per branch.
