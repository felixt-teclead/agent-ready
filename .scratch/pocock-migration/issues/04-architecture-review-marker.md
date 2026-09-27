# How the PR hook knows the last architecture review

Type: grilling
Status: open

## Question

How does the PR hook know when `/improve-codebase-architecture` last ran? The skill writes its report to `$TMPDIR` and leaves nothing in the repo. It is pinned, so we cannot change it. Decide what leaves the marker (our wrapper, the user, a commit trailer, an ADR date, a file) and where it lives.
