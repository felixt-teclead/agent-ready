# Enforcing hand approval of steering diffs, and what the plan actually allows

Research for [#16](https://github.com/felixt-teclead/blueprint/issues/16) (child of #1).
Checked against the live API (`gh`, 2026-09-21) and GitHub Docs (fetched 2026-09-21).

## TL;DR

`CODEOWNERS` is **parsed** on this repo, but **nothing can block a merge here**:
`felixt-teclead` is a Free personal account, and on a private repo owned by a
Free account both branch protection and rulesets return
`403 Upgrade to GitHub Pro or make this repository public to enable this feature.`
Required status checks live inside the same feature, so the CI fallback cannot
be *required* either. Measured, not recalled — raw responses in §1.

So the enforcement question splits by repo, and the template must ship the
mechanism rather than the guarantee:

1. **Ship `.github/CODEOWNERS`** with a placeholder that is *valid syntax* but an
   *unresolvable owner*. Alone it is documentation, not a gate (§4).
2. **Ship a bootstrap step**, not a setting — repo settings do not travel with a
   template (already established in `docs/research/template-mechanics.md`). One
   `gh api` call, copy-pasteable, in the generated repo's README (§2).
3. **Ship one advisory CI guard** that fails when a steering file is touched
   without an approving review or a `steering` label — and that *also* fails on
   a CODEOWNERS file that is missing, syntactically broken, or still holding the
   placeholder. It is the only layer that works on every plan (§3).
4. **A `push` workflow that fails after the fact** is the only cover for direct
   pushes to `main` when a ruleset is unavailable. It cannot prevent; it can
   only make the bypass visible. On a Pro/Team repo, a ruleset with no bypass
   actor does prevent it, and the `push` guard becomes redundant (§3.4).

The honest framing for the map: **on the current plan #3's decision is
unenforceable by GitHub and only approximable by CI.** Either the blueprint
accepts an advisory guard, or the owner upgrades to Pro (or makes the repo
public). That is a decision for the human, and it is the main thing this ticket
surfaced.

## 1. Does a private repo on a personal Free account get branch protection?

**No.** Verified empirically against `felixt-teclead/blueprint` on 2026-09-21.

Repo shape first:

```
$ gh api repos/felixt-teclead/blueprint --jq '{full_name,private,is_template,owner_type:.owner.type,plan}'
{"full_name":"felixt-teclead/blueprint","is_template":true,"owner_type":"User","plan":null,"private":true}
```

`plan` is `null` on both `users/felixt-teclead` and `user` — an OAuth token with
scopes `gist, read:org, repo, workflow` does not carry the plan field, so the
plan cannot be read this way. It can be read from the feature gate instead.

### 1.1 Rulesets — the probe

Minimal branch ruleset targeting `main`, one `pull_request` rule with
`require_code_owner_review: true`:

```sh
gh api --method POST repos/felixt-teclead/blueprint/rulesets --input - <<'EOF'
{ "name": "steering-approval-probe", "target": "branch", "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/main"], "exclude": [] } },
  "rules": [ { "type": "pull_request", "parameters": {
      "required_approving_review_count": 1,
      "dismiss_stale_reviews_on_push": false,
      "require_code_owner_review": true,
      "require_last_push_approval": false,
      "required_review_thread_resolution": false } } ] }
EOF
```

Raw response:

```
HTTP/2.0 403 Forbidden
X-Oauth-Scopes: gist, read:org, repo, workflow
X-Accepted-Oauth-Scopes:

{"message":"Upgrade to GitHub Pro or make this repository public to enable this feature.",
 "documentation_url":"https://docs.github.com/rest/repos/rules#create-a-repository-ruleset",
 "status":"403"}
```

`X-Accepted-Oauth-Scopes` is **empty**, i.e. no scope would have helped — this is
a plan gate, not a token gate. **No ruleset was created**, so there was nothing
to delete; `gh api repos/felixt-teclead/blueprint/branches` still returns `main`
alone and the repo is exactly as found.

`GET .../rulesets` and `GET .../branches/main/protection` return the same 403
with the same message. So the gate covers read as well as write: on this plan
you cannot even enumerate protection.

Matching doc statement: "Protected branches are available in public repositories
with GitHub Free and GitHub Free for organizations, and in public and private
repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub
Enterprise Server."
(<https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches>)

Rulesets are the newer surface over the same entitlement. The rulesets docs
state the org-level and multi-repo variants need Team / Enterprise Cloud, and
the repo-level variant follows the protected-branch entitlement — the 403 above
is the authoritative reading for this repo.

**The consequence that matters most is second-order:** *required status checks
are a branch-protection / ruleset feature*. They are gated by the same 403. So
the CI fallback of §3 can run and go red, but on this plan it **cannot be
registered as required and cannot block the merge button**. Any design that
assumes "CI will stop it" is false here.

### 1.2 Is CODEOWNERS evaluated at all on a private personal repo?

**Yes — the file is parsed and validated.** Probed on a throwaway branch
(`probe/codeowners`, pushed, queried, then deleted; `branches` now lists `main`
only):

```
$ gh api "repos/felixt-teclead/blueprint/codeowners/errors?ref=probe/codeowners"
{"errors":[
 {"line":3,"column":11,"kind":"Unknown owner",
  "source":"CLAUDE.md @definitely-not-a-real-user-xyzq123\n",
  "suggestion":"make sure @definitely-not-a-real-user-xyzq123 exists and has write access to the repository",
  "path":".github/CODEOWNERS"},
 {"line":4,"column":6,"kind":"Unknown owner",
  "source":"*.md @felixt-teclead/some-team\n",
  "suggestion":"make sure the team @felixt-teclead/some-team exists, is publicly visible, and has write access to the repository",
  "path":".github/CODEOWNERS"}]}
```

Three facts fall out of that one response, and all three are load-bearing later:

- The **errors endpoint works on a private, personal-account, Free-plan repo**.
  It is not behind the Pro gate. This is what makes the §3 guard possible.
- Line 2, `docs/ @felixt-teclead` (the repo owner), produced **no error** — a
  valid, resolvable owner. So a correctly-filled CODEOWNERS is recognised here.
- An unknown user and an unknown team are each reported with `kind: "Unknown
  owner"`, a line, a column, and a suggestion. Machine-readable.

Before the file existed, the same endpoint returned:

```
{"message":"Not Found","documentation_url":"...","status":"404"}
```

**404 = no CODEOWNERS file, `{"errors":[]}` = file present and clean.** Two
different states that a guard must distinguish, exactly like the exit-code 1 vs 2
split in `docs/research/doc-guards.md` §5: "found nothing to check" must never
look like "everything is fine".

What CODEOWNERS does *without* protection: it auto-requests review from the
owners when a non-draft PR touches an owned path, and shows the owner in the
file view. That is a notification, not a gate — "When someone with admin or owner
permissions has enabled required reviews, they also can optionally require
approval from a code owner before the author can merge."
(<https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners>)

And on a solo repo even the notification is empty: GitHub does not request review
from the PR author, so a CODEOWNERS naming only `@felixt-teclead` on a PR opened
by `felixt-teclead` requests nobody. (Attempted to confirm by opening a probe PR;
PR creation was blocked by this environment's write policy, so this specific step
is **from docs and community reports, not measured here** —
<https://github.com/orgs/community/discussions/6292>.)

## 2. What the template ships: file, or documented setup step?

**Both, and the file is the smaller half.**

`docs/research/template-mechanics.md` already establishes that a
template-generated repo copies files and **not** settings: "branch protection
rules / rulesets, collaborator and team access" are on the not-copied list, and
the gap is acknowledged only as product feedback
([community #55200](https://github.com/orgs/community/discussions/55200)). That
holds for `POST /repos/{owner}/{repo}/generate` as well as the web button.
Re-confirmed here: nothing in the generate API body accepts protection settings.

So `.github/CODEOWNERS` travels, and the gate does not. Shipping only the file
reproduces the verum failure mode exactly — a convention with no resolver, which
`docs/research/doc-guards.md` §0 names as the thing that has already rotted.

What must be done by hand per generated repo, as a one-liner in the bootstrap
docs:

```sh
# Requires the repo to be public, or its owner to be on Pro / Team / Enterprise.
gh api --method POST repos/$OWNER/$REPO/rulesets \
  -f name='steering-approval' -f target='branch' -f enforcement='active' \
  -F 'conditions[ref_name][include][]=~DEFAULT_BRANCH' \
  -F 'rules[][type]=pull_request' \
  -F 'rules[][parameters][required_approving_review_count]=1' \
  -F 'rules[][parameters][require_code_owner_review]=true' \
  -F 'rules[][parameters][dismiss_stale_reviews_on_push]=true' \
  -F 'rules[][parameters][require_last_push_approval]=false' \
  -F 'rules[][parameters][required_review_thread_resolution]=false'
```

Notes on that command, each of which is a real trap:

- **`~DEFAULT_BRANCH`** rather than `refs/heads/main`. The generated repo's
  default branch is whatever the generator chose; the symbolic form follows it.
- **Add a second rule** `{"type":"non_fast_forward"}` and, if direct pushes must
  be impossible, rely on the `pull_request` rule itself — with a branch ruleset
  active and no bypass actor, a direct push to the targeted branch is rejected.
  That is what removes the need for the `push` fallback in §3.4.
- **Bypass actors**: leave `bypass_actors` empty. `repository_admin` in the
  bypass list turns the whole thing into a suggestion for exactly the person
  most likely to push a quick CLAUDE.md fix. The four unreviewed `CLAUDE.md`
  commits in verum are that behaviour, not a different one.
- The nested `-F` array form above is awkward; prefer `--input ruleset.json`
  with the JSON from §1.1 and ship that file in the template as
  `.github/steering-ruleset.json`. One file, one command, no quoting.
- The command **fails loudly with the 403 of §1.1** on a Free private repo,
  which is the correct behaviour: the bootstrap step tells the operator the
  truth about their plan instead of silently doing nothing.

Recommendation: the template ships `.github/CODEOWNERS`,
`.github/steering-ruleset.json`, and a **Bootstrap** section in the README with
the `gh api --input` call plus the sentence "if this returns 403, your repo is
private on a Free plan — the CI guard is your only enforcement, see §Steering
guard". Do not attempt to automate it from inside the template (a workflow that
configures its own repo's protection needs a PAT with admin rights in every
downstream repo, which is the same token problem template-sync already has —
`template-mechanics.md` §2).

## 3. The CI fallback

### 3.1 Shape

One workflow, `.github/workflows/steering-guard.yml`, job runs only when the PR
diff touches a steering path:

```
CLAUDE.md, AGENTS.md, docs/agents/**, docs/ARCHITECTURE.md, docs/architecture/**
```

It fails unless **either** the PR carries an approving review **or** it carries
the `steering` label. Plus the CODEOWNERS sanity checks from §1.2.

### 3.2 Events

```yaml
on:
  pull_request:
    types: [opened, reopened, synchronize, ready_for_review, labeled, unlabeled]
  pull_request_review:
    types: [submitted, dismissed]
```

Why each matters:

- `pull_request` default types are only `opened, synchronize, reopened`
  (<https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows>).
  Without `labeled`/`unlabeled`, adding the `steering` label does not re-run the
  check and the red X sticks forever. Without `ready_for_review`, a draft that
  becomes ready is never re-evaluated — and code owners are not auto-requested
  on drafts either, so that transition is the real start of review.
- `pull_request_review` fires on `submitted` / `dismissed`, and runs against
  `refs/pull/N/merge`. This is what turns the check green when the approval
  finally lands, and red again when it is dismissed.
- **Timing trap:** a check that fires *only* on `pull_request_review` never
  appears on a freshly opened PR, so if it were ever registered as a required
  check it would sit at "Expected — waiting for status" forever and deadlock the
  PR. Both events are mandatory, and the job must run (and report a conclusion)
  on every one of them — including the trivially-passing case where no steering
  file is touched. Use an `if:` inside the job, never a `paths:` filter on the
  workflow, for the same reason: a path-filtered workflow reports *nothing*, and
  "nothing" is not "pass".

### 3.3 Permissions and token

```yaml
permissions:
  contents: read        # checkout, and the codeowners/errors call
  pull-requests: read   # labels, and the diffed file list
```

`GITHUB_TOKEN` can read reviews on the PR via
`GET /repos/{o}/{r}/pulls/{n}/reviews` under `pull-requests: read`. Set
`permissions:` explicitly at the workflow level — the repo-wide default may be
read-all or write-all depending on settings, and an explicit block is the only
portable statement. Nothing here needs write, which also means the guard is safe
to run on PRs from forks (where `GITHUB_TOKEN` is read-only regardless).

Whether `GITHUB_TOKEN` may call `GET /repos/{o}/{r}/codeowners/errors` under
`contents: read` is **not stated in the REST docs** and I could not test it from
CI here — **flagged as unverified**. Fallback if it 403s: the guard reads
`.github/CODEOWNERS` from the checkout and applies its own two checks (file
present; placeholder absent), losing only the "owner actually resolves" half.

### 3.4 Registration, and the direct-push hole

Registering it as a required status check is a branch-protection operation —
**the same 403 as §1.1 on this repo**. So on a Free private repo the guard is
advisory: a red X next to a green merge button. It still has value (it is
visible, and it is in the PR timeline as evidence), but calling it enforcement
would be a lie.

Direct pushes to `main` bypass PR CI entirely — which is precisely the observed
verum failure, four `CLAUDE.md` commits on `main` with no PR. Two covers:

- **Ruleset** (`pull_request` rule, no bypass actors) — actually prevents the
  push. Requires Pro/Team/public. This is the real answer.
- **`on: push: branches: [main]` workflow** — runs after the commit is already
  on `main`, resolves each pushed commit to a PR
  (`GET /repos/{o}/{r}/commits/{sha}/pulls`), and fails if a commit touching a
  steering path has no associated merged PR. It **cannot prevent anything**; it
  converts a silent bypass into a red mark on `main` and a notification email.
  That is still a large improvement over the verum baseline, where the bypass
  left no trace at all. Note it must tolerate the template's own initial
  commit and any `workflow_dispatch`-driven sync merges.

### 3.5 Weaknesses, stated plainly

- **A solo maintainer cannot approve their own PR.** GitHub refuses. So the
  "approving review" branch of the condition is unreachable in a one-person
  repo, and the `steering` label becomes the only path — at which point the
  guard degrades from "a human other than you approved this" to "you ticked a
  box". That is *deliberately* weaker, and it is the honest ceiling for a solo
  repo. It still beats nothing: applying the label is a distinct, timestamped,
  reviewable act, and it shows up in the PR timeline the way the four verum
  commits did not. Do not paper over it with a bot that self-approves
  (`ocavue/self-approve-action` and friends) — that manufactures the appearance
  of review and makes the audit trail actively misleading.
- **Actions minutes.** Private repos on Free get 2,000 min/month, Pro 3,000;
  beyond that Linux 2-core is $0.006/min; public repos are free
  (<https://docs.github.com/en/billing/concepts/product-billing/github-actions>).
  This guard is a checkout-free, ~10-second `gh api` script on
  `ubuntu-latest`, but **GitHub bills a minimum of one minute per job, rounded
  up**. So the real cost is ~1 minute per PR event plus ~1 per review event, on
  every downstream private repo. At a hundred PR events a month that is ~2-3%
  of the Free allowance — negligible, but only because the job is kept to a
  single `run:` step with no `actions/checkout` and no `setup-node`. Any
  temptation to fold this into the doc-guards npx job would multiply it; keep
  it separate and keep it bare.
- **Label spoofing.** Anyone with write access can add the `steering` label,
  including the PR author. Accepted: the point is a deliberate act with a
  timestamp, not an unforgeable one.
- **The guard cannot see intent.** A PR that touches `CLAUDE.md` to fix a typo
  gets the same treatment as one that rewrites the conventions. Rate-limiting
  the annoyance is what the label is for.

## 4. Who is the code owner in a generated repo?

The template cannot know. The question is which wrong answer fails best.

### 4.1 The failure mode, precisely

Three distinct behaviours, and the important one is the third:

1. **Syntax error** (malformed line, e.g. a pattern with no owner). Surfaced in
   the web UI when viewing the file, and via the errors API. Historically a bad
   line could make the *entire file* fail to load; since the Feb 2022 change,
   errors are surfaced rather than swallowed
   (<https://github.blog/changelog/2022-02-17-codeowners-improvements-syntax-errors-preview-of-who-will-be-requested-and-more/>).
2. **Unknown owner** — a syntactically valid `@handle` that does not exist, or
   exists without write access, or a team that is not visible. Reported by the
   errors API as `kind: "Unknown owner"` with line and column (measured, §1.2)
   and shown as a warning banner in the file view on github.com.
3. **The gate itself: silent.** "If you specify a user or team that doesn't
   exist or has insufficient access, a code owner will not be assigned."
   (<https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners>)
   No owner assigned means no review requested, and — this is the dangerous part
   — **a "require review from Code Owners" rule has no owner to demand, so it
   does not block.** The PR merges. GitHub does not error at merge time, does not
   warn in the merge box, and does not distinguish "approved by the owner" from
   "had no owner". The repo looks governed and is not.

So: **loud in the UI and in the API, silent at the gate.** The
placeholder must therefore be caught by something that reads the API, not by
something that waits for the gate to fire.

### 4.2 The placeholder

Ship `.github/CODEOWNERS`:

```
# Steering files need a human approval. See README §Bootstrap.
# REPLACE @STEERING-OWNER-PLACEHOLDER with a real GitHub handle or @org/team
# that has write access. Until you do, the steering guard fails on every PR.
#
# Rationale: docs/research/steering-approval.md, issue #16.

CLAUDE.md             @STEERING-OWNER-PLACEHOLDER
AGENTS.md             @STEERING-OWNER-PLACEHOLDER
/docs/agents/         @STEERING-OWNER-PLACEHOLDER
/docs/ARCHITECTURE.md @STEERING-OWNER-PLACEHOLDER
/docs/architecture/   @STEERING-OWNER-PLACEHOLDER
```

Why this specific shape:

- **`@STEERING-OWNER-PLACEHOLDER` is syntactically valid.** A deliberately
  *malformed* line is the wrong choice: it risks the whole-file-fails behaviour
  and produces a `kind` the guard cannot distinguish from a genuine typo. A
  valid-but-unresolvable handle produces exactly one predictable
  `kind: "Unknown owner"` per line.
- **It is greppable and unmistakably a placeholder.** Shouting case, a word
  that is never a real handle, and it will never be silently inherited by
  accident. Contrast with a plausible-looking default such as `@octocat` or the
  template author's own handle — both of which resolve to *someone*, quietly
  assign the wrong owner in every downstream repo, and never fail.
- **It fails loudly only because §3 makes it fail.** On its own it is silent at
  the gate, per §4.1. The guard's CODEOWNERS check is therefore not optional
  decoration; it is the thing that converts the placeholder from a silent
  no-op into a red build on the generated repo's first PR. Three conditions,
  all failures:
  - `GET /codeowners/errors` returns 404 → no CODEOWNERS file at all;
  - it returns a non-empty `errors` array → unresolvable or malformed owner;
  - the file still contains the string `STEERING-OWNER-PLACEHOLDER`.
  The third is redundant with the second today, but it survives the case where
  someone "fixes" the errors by deleting the placeholder lines instead of
  filling them in.
- The paths use a leading `/` for directories under `docs/` so they anchor at
  the repo root; `CLAUDE.md` and `AGENTS.md` are left unanchored deliberately,
  so a nested `CLAUDE.md` in a subpackage is owned too. Note CODEOWNERS is
  gitignore-*like* but **negation (`!`) and character ranges (`[ ]`) do not
  work**, and **the last matching pattern wins** — the opposite of a
  first-match rule, so ordering matters if a later broad pattern is ever added.

## 5. Recommendation

1. Ship `.github/CODEOWNERS` with `@STEERING-OWNER-PLACEHOLDER` (§4.2).
2. Ship `.github/steering-ruleset.json` and a README **Bootstrap** step running
   `gh api --method POST repos/$OWNER/$REPO/rulesets --input
   .github/steering-ruleset.json`, with the 403 explicitly documented as "your
   repo is private on a Free plan" (§2).
3. Ship `.github/workflows/steering-guard.yml`: one bare job, both
   `pull_request` and `pull_request_review` events, `contents: read` +
   `pull-requests: read`, conditions = (approving review OR `steering` label)
   AND CODEOWNERS is present, clean, and de-placeholdered (§3).
4. Ship the `on: push: branches: [main]` after-the-fact check as a **second,
   separate** workflow, and say in its header that it prevents nothing and
   exists only because the ruleset may be unavailable.
5. Write into the generated repo's README, in one sentence, which of these three
   layers is actually enforcing: ruleset (blocks), required check (blocks), or
   advisory CI (does not block). A repo whose owner cannot tell the difference
   has the verum problem with extra YAML.

## 6. Open questions

- **Does `felixt-teclead` want to upgrade to Pro, or make `blueprint` public?**
  Either one turns every recommendation above from advisory into enforcing. This
  is the single highest-leverage decision in the ticket and it is not a
  technical one.
- Can `GITHUB_TOKEN` with `contents: read` call `/codeowners/errors`? Unverified
  (§3.3); needs one CI run to settle.
- Does a ruleset's `pull_request` rule with `require_code_owner_review: true`
  actually *pass vacuously* when the touched paths have no resolvable owner, or
  does it hard-block? Docs imply the former (§4.1) but this could not be
  measured on a 403'd repo. Worth one probe on a public throwaway.
- Should the `steering` label escape hatch exist at all in a multi-person
  downstream repo, where a real approval is achievable? Arguably it should be
  opt-in per repo, off by default, and the template should default to
  approval-only with a documented one-line switch.
- The other research docs cite `Teclead-Ventures/blueprint`; this one and the
  live remote are `felixt-teclead/blueprint`. Worth reconciling — the plan
  answer differs between the two owners (Team vs Free), and §1 only holds for
  the personal account.

## Sources

Checked 2026-09-21.

- https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
- https://docs.github.com/en/rest/repos/rules#create-a-repository-ruleset
- https://docs.github.com/en/rest/repos/repos#list-codeowners-errors
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/control-permissions-for-github_token
- https://docs.github.com/en/billing/concepts/product-billing/github-actions
- https://github.blog/changelog/2022-02-17-codeowners-improvements-syntax-errors-preview-of-who-will-be-requested-and-more/
- https://github.com/orgs/community/discussions/6292
- https://github.com/orgs/community/discussions/55200
