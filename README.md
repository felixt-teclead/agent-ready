# blueprint

Template repo: documentation and steering conventions for agent-driven repos.

## Start a new repo from this template

```sh
gh repo create <owner>/<name> --template felixt-teclead/blueprint --private --clone
```

You need read access to `blueprint` to generate from it. The new repo gets a
file snapshot of `main` as one commit — no history, no issues, no secrets, no
settings. Its visibility is yours to choose; this template is private, so do not
make a generated repo public without checking what the conventions carry.

To retrofit an existing repo instead, follow `docs/retrofit.md`.

## Pulling a later blueprint change

A generated repo is a starting point, not a dependency. Its markdown is meant to
drift, and guard scripts will arrive as a published package. For the rare fix
that has to reach an existing repo, the payload carries
`.github/workflows/template-sync.yml`: manual dispatch only, never scheduled.

To make it work, the generated repo needs one secret, `TEMPLATE_SYNC_TOKEN`:

- A fine-grained PAT (or a GitHub App token) with **Contents: read** on
  `felixt-teclead/blueprint` and **Contents: write** plus **Workflows: write**
  on the generated repo; a classic PAT needs `repo` and `workflow`.
- The built-in `GITHUB_TOKEN` is not enough: it cannot read the private
  template, and GitHub refuses any push it makes that touches
  `.github/workflows/**`.

```sh
gh secret set TEMPLATE_SYNC_TOKEN --repo <owner>/<name>
gh workflow run "Template sync" --repo <owner>/<name> -f dry_run=true
```

A dispatch merges the template's default branch with
`--allow-unrelated-histories` and opens a single PR, reused until it is merged.
Review it like any other PR — the first one conflicts on every file the repo has
touched. `.templatesyncignore` lists what stays local; edit it per repo, since
the action never syncs that file itself.
