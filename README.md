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

## Name a steering owner (optional)

A diff to the steering files changes the rules the agents work by, so a human
decides it. The rule lives in `CLAUDE.md` and stops an agent before it merges.
Three layers can stand behind it, and you choose how many you want.

**Layer one, always on.** The doc-guards steering guard says on every run who
owns the steering files and how much enforcement is real. Out of the box
`.github/CODEOWNERS` names `@STEERING-OWNER-PLACEHOLDER`, so nobody owns
anything: anyone with write access can change a steering file, and the guard
warns on every run without failing. That is a supported state — a repo with one
maintainer has nobody to review anyway.

**Layer two: name owners.** Replace the placeholder with a handle or `@org/team`
that has **write access to this repo**, then set `requireOwners` in
`doc-guards.config.json`:

```json
"steering": { "enabled": true, "requireOwners": true }
```

GitHub now requests a review from the owner on every steering diff, and the
guard fails the build if a guarded path loses its owner. A handle *without*
write access is worse than the placeholder: GitHub assigns no owner, requests
nothing, and says nothing at merge time.

**Layer three: make it blocking.** Layers one and two still do not refuse a
merge. To make GitHub refuse one, run the bootstrap once:

```sh
sh .github/bootstrap-steering-ruleset.sh <owner>/<name>
```

It adds the ruleset in `.github/steering-ruleset.json`: a pull request with a
code-owner approval, and no bypass actor. A private repo on a Free account
cannot hold a ruleset, so the script says so and exits 0. The gate then stays
advisory, and a human merges every steering diff by hand.

Two paths are guarded alongside the steering files, because each one disarms the
guard in a single line: `doc-guards.config.json` and
`.github/workflows/doc-guards.yml`.

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
