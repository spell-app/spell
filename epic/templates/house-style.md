# House style

How text is written in this repo:  comments, docstrings, `AGENTS.md` files, READMEs and epic pages.
Claude and the epic skills read this file before they write any of them (`epic voice code` prints it).
- It's yours:  change, add or delete anything.  `epic init` wrote it once, and never touches it again.
- Lines in `<angle brackets>` are placeholders:  fill them in, or delete them.

## Who reads it

Someone new to this part of the code, figuring it out:  not the person who wrote it.
- Say what a thing IS, and how to use it, first.  Why it's built that way comes after, if at all.
- Use the names a reader would look for, never the builder's private shorthand.
- `<who else reads your code:  new teammates, outside contributors, you in a year>`

## Comments and docstrings

- Every exported function, class and type gets a docstring:  one line saying what it is, then bullets if needed.
- Note what it throws, and any side effect, in its docstring.
- Explain WHY, not what:  the code already says what.
- Keep comments true:  when the code changes, change its comments in the same commit.
- `<your docstring format:  JSDoc tags, or plain prose;  your marker words, e.g. TODO:, NOTE:, HACK:>`

## Docs and READMEs

- Short paragraphs:  one or two sentences, else bullets.
- Lead with what it adds up to, then one fact per bullet.
- Show a command with what it prints.
- `<where your docs live, and what each kind of page is for>`

## Words

- `<words this project always uses, and the ones it never does:  "people", not "users">`
- `<your product's name, and how it's capitalised>`

## Code style

- `<anything a formatter or linter doesn't settle:  naming, error handling, file layout>`
