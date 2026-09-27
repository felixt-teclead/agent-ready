# Accepted deviations

`.agents/deviations.md` lists the findings the user chose to keep, one line
each:

```
- `<file>`: "<the finding's line, pointer or path, quoted>" (<class>). <Why, one sentence.>
```

To keep a whole file or folder, the quoted text is its path.

`<class>` is a class of the scan's
[One next step](../scan-codebase-for-agents/SKILL.md#4-one-next-step), or a
check of another skill:

- `old setup`: an old-setup plugin, skill, hook, override or folder kept
  (measure.md's [Old setup](measure.md#4-old-setup));
- `repo-specific`: an item `retire-agent-setup` found that only this repo
  needs;
- `fit check`: `model-codebase-domain`;
- `levers`: `route-codebase-docs`;
- `domain`: no `CONTEXT.md` wanted.

A finding with the same file, quoted text and class is no finding: it stays
as it is, and no class counts it. A line an open PR adds to the file counts too,
so a finding the user just kept stays kept while its PR waits.

Only the user accepts a finding. The skill that asked writes the line into
its own PR, and a human merges that PR.
