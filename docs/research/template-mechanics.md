# GitHub template mechanics, and how a generated repo takes a later upstream fix

Research for [#8](https://github.com/Teclead-Ventures/blueprint/issues/8) (child of #1).
Checked against the live API where checkable (`gh`, 2026-09-21).

## TL;DR

Use the template for **creation only**, and split the payload by how it wants to
travel:

- **guard scripts** → published npm package, consumed via `npx pkg@version`.
  Propagation is a version bump, not a file copy. This is the only channel that
  updates without a merge.
- **CI workflow** → a thin caller of that package in the template. It then rarely
  changes, and when it does, the change is one line.
- **markdown conventions** (CONTEXT.md, CLAUDE.md, `.claude/rules/`,
  `docs/architecture/`) → copied at creation, then **accept divergence** by
  default. Downstream repos are *meant* to edit these; a sync mechanism fights
  the payload.
- For the rare "everyone must get this fix" case: run
  `AndreasAugustin/actions-template-sync` manually (`workflow_dispatch`) from the
  downstream repo, or do the one-off `git remote add upstream` +
  `merge --allow-unrelated-histories` by hand. Do not schedule it.

Do **not** fork. See §"Template vs fork".

## What "Use this template" / `gh repo create --template` copies

The generated repo is a **fresh repo with a single initial commit** containing a
file copy of the template's default branch.

Copied:

- directory structure and file contents of the default branch — including
  `.github/`, `.github/workflows/*`, `CODEOWNERS`, issue/PR templates, dotfiles.
  These are just files; nothing about them is special-cased.
- optionally all branches, with `--include-all-branches` / the "Include all
  branches" checkbox. Caveat from the docs: "Branches created from a template
  have unrelated histories, which means you cannot create pull requests or merge
  between the branches."

Not copied:

- **commit history** — "A new fork includes the entire commit history of the
  parent repository, while a repository created from a template starts with a
  single commit."
- issues, pull requests, discussions, wiki, releases, tags, stars, watchers
- labels, milestones, projects
- Actions secrets and variables, Dependabot secrets, environments
- branch protection rules / rulesets, collaborator and team access, topics,
  and repo feature toggles (wiki/discussions/merge strategies)

The settings gap is long-standing and acknowledged only as product feedback, not
a bug: community discussion
[#55200](https://github.com/orgs/community/discussions/55200) (relabelled
"Product Feedback", April 2025) and
[#144277](https://github.com/orgs/community/discussions/144277) (secrets and
variables).

Other mechanics worth knowing:

- The template repo **cannot contain Git LFS files**.
- Commits in a generated repo *do* count on the contribution graph (fork commits
  do not, unless merged upstream).
- API: `POST /repos/{owner}/{repo}/generate`, body `name`, `owner`,
  `private`, `include_all_branches`, `description`. `gh repo create --template`
  wraps it. `is_template: true` on the template; the generated repo carries a
  `template_repository` object in the full repo response — that is the only
  built-in way to enumerate "repos made from blueprint", and it only appears on
  endpoints returning the full representation, not the compact one.

## Template vs fork for later updates

| | template | fork |
|---|---|---|
| history | single initial commit, unrelated | full, shared with upstream |
| later upstream pull | manual, `--allow-unrelated-histories` | `git pull upstream` / "Sync fork" button, clean |
| independence | total — no network link | lives in upstream's repo network |
| private repo in org | fine | fork's visibility is tied to the upstream network; if a user loses access to the private upstream, **their forks are deleted** |
| Actions | run normally | disabled by default in forks, restricted `GITHUB_TOKEN`, `pull_request` from fork gets no secrets |
| PRs | back to template impossible (unrelated histories) | default PR target is upstream — a constant footgun |

A fork buys exactly one thing we want (clean merges) and costs repo-network
coupling, Actions friction, a "contribute to upstream" default on every PR, and
the deletion hazard above. For client project repos that must stand alone, that
trade is bad. **Template.**

## Private template inside the org

`Teclead-Ventures` is on the **Team** plan (`plan.name: "team"`,
`members_can_fork_private_repositories: true`), `blueprint` is `private` and
currently `is_template: false` — flipping that switch is step one.

Rules that apply:

- A private template works. "Anyone with access to the template repository can
  generate a new repository" — so read access to `blueprint` is enough; the
  generator needs create-repo permission in the target org.
- REST: "If the repository is not public, the authenticated user must own or be
  a member of an organization that owns the repository."
- Visibility of the generated repo is **chosen freely** (`--private` /
  `--public`), it is not inherited. A private template can seed a public repo —
  worth a policy line, since the blueprint carries client-shaped conventions.
- `--internal` needs Enterprise Cloud; on Team it is unavailable, so
  "internal template visible to the whole company" is not on the table.
- Token scopes: PAT (classic) needs `repo` to generate a private repo,
  `public_repo` otherwise. Fine-grained tokens need Administration: write on the
  target owner.

## Options for propagating an upstream fix

### 1. Upstream remote + manual merge

```sh
git remote add upstream https://github.com/Teclead-Ventures/blueprint.git
git fetch upstream
git merge upstream/main --allow-unrelated-histories
```

Works, and the first merge records a merge base so subsequent merges are normal
three-way merges. Cost: the first merge conflicts on **every file the downstream
repo touched**, which for CLAUDE.md and `.claude/rules/` is all of them. Zero
infrastructure, fully auditable, no tokens. Good as the escape hatch, bad as the
routine.

### 2. `AndreasAugustin/actions-template-sync`

A workflow *in the downstream repo* that pulls from the template and opens a PR.
Relevant details:

- Uses `--allow-unrelated-histories` by default, so it works on
  template-generated repos out of the box; source and target need no shared
  history.
- `.templatesyncignore` (gitignore syntax) excludes paths. The ignore file
  itself cannot be synced — template changes to it are reverted.
- Opens one PR and reuses it until merged; `is_dry_run` for testing; lifecycle
  hooks `prepull`/`precommit`/`prepush`/`precleanup`/`prepr`.
- **Token**: `GITHUB_TOKEN` is not enough for two reasons — a private source
  repo needs a `source_gh_token` (PAT / GitHub App / SSH deploy key), and any
  sync that touches `.github/workflows/**` needs the `workflow` scope, which
  `GITHUB_TOKEN` does not have (`refusing to allow ... to create or update
  workflow ... without workflows permission`). So each downstream repo needs a
  PAT or an org GitHub App installed. That is the real cost, not the YAML.

Alternatives in the same shape: `ahmadnassri/action-template-repository-sync`
(push-based, template pushes to a list of targets — one token, but the template
must know its children), `kota65535/github-template-sync-action`.

### 3. copier / cruft

Real template *updating*, not file copying. `copier update` regenerates the
project at the old template version, diffs against the working copy, and
replays the delta onto the new version — variable substitution (client name,
repo name) survives updates, which neither a GitHub template nor
`actions-template-sync` can do. Requires: a committed `.copier-answers.yml`,
git tags on the template, a clean git tree downstream. `cruft` is the same idea
bolted onto cookiecutter.

Cost: a Python tool in the loop for a TypeScript/markdown org, template files
become Jinja templates (so `blueprint` stops being a repo you can read as a
working example), and "Use this template" on github.com no longer produces a
usable repo — bootstrap becomes `copier copy gh:Teclead-Ventures/blueprint`.
Justified only once the payload needs parameterisation. It does not today.

### 4. git subtree / submodule for the guard scripts

- **submodule**: a pinned pointer, update is `git submodule update --remote`.
  But every clone needs `--recurse-submodules`, agents and CI trip over the
  empty directory, and a private submodule needs credentials at clone time.
- **subtree**: `git subtree pull` works and needs no client-side ceremony, but
  the command is folklore-grade and the merge story is the same as option 1.

Both are the wrong shape here: the scripts are already `npx`-able, i.e. they are
a package. A package registry is a better submodule.

### 5. Accept divergence

The repo is a **starting point**, not a runtime dependency. A generated repo's
CLAUDE.md is supposed to drift — that is the product. Fixes to conventions reach
existing repos the same way any other knowledge does: the next person to open
the file. The cost is that a genuinely wrong rule keeps producing wrong output
in old repos until someone notices.

## Recommendation

Split by volatility, as in the TL;DR:

1. Flip `blueprint` to `is_template: true`. Bootstrap is
   `gh repo create Teclead-Ventures/<x> --template Teclead-Ventures/blueprint --private --clone`.
2. Move the guard scripts out of the copied payload into a published package
   (npm, private or public) and call them as `npx @teclead/guards@^1 ...` from
   the workflow. A fix then ships by publishing, and every repo on `^1` gets it
   with no merge, no token, no PR. This is the single highest-leverage change,
   and it is the reason a sync mechanism is not needed for the part that
   actually breaks.
3. Keep the workflow file thin — checkout, setup-node, `npx @teclead/guards`.
   Then it almost never needs to change, which sidesteps the `workflow`-scope
   token problem entirely.
4. Ship `actions-template-sync` in the template as `workflow_dispatch`-only,
   disabled by default, with a `.templatesyncignore` covering
   `docs/architecture/**` and anything else that is per-project by design. It
   costs one YAML file in the payload and is there when a convention fix is
   worth pushing. Do not schedule it: a weekly PR nobody merges is worse than
   nothing.
5. Accept divergence for the markdown otherwise. Revisit copier only if the
   template starts needing variables (client name, entity codes) rather than
   placeholders.

Trade-offs accepted: existing repos will not auto-receive markdown fixes
(mitigated by 2 and 4); each downstream repo that wants sync must add a token
(mitigated by making sync opt-in and rare); we give up the fork's clean merge
base (deliberate, see §"Template vs fork").

## Open questions

- Is there an org GitHub App we can install once (Administration + Contents +
  Workflows) so opt-in sync needs no per-repo PAT?
- Registry for the guard package: npm private (paid seats) vs GitHub Packages
  (`.npmrc` auth in every repo and in CI) vs public with a neutral name.
- Do we want `template_repository` scanning as a periodic inventory of
  blueprint-derived repos?

## Sources

- https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template
- https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-template-repository
- https://docs.github.com/en/rest/repos/repos#create-a-repository-using-a-template
- https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/about-forks
- https://docs.github.com/en/actions/automating-your-workflow-with-github-actions/authenticating-with-the-github_token
- https://cli.github.com/manual/gh_repo_create
- https://github.com/orgs/community/discussions/55200
- https://github.com/orgs/community/discussions/144277
- https://github.com/orgs/community/discussions/27072
- https://github.com/AndreasAugustin/actions-template-sync
- https://github.com/ahmadnassri/action-template-repository-sync
- https://github.com/kota65535/github-template-sync-action
- https://copier.readthedocs.io/en/stable/updating/
- https://cruft.github.io/cruft/
