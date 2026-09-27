# Accepted deviations

`.agents/deviations.md` lists the findings the user chose to keep, one line
each:

```
- `<file>`: "<the finding's line, pointer or path, quoted>" (<class>). <Why, one sentence.>
```

A finding with the same file and quoted text is no finding: it stays as it
is, and no class counts it. A line an open PR adds to the file counts too,
so a finding the user just kept stays kept while its PR waits.

Only the user accepts a finding. The skill that asked writes the line into
its own PR, and a human merges that PR.
