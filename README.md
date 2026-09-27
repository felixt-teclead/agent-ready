# blueprint

The record of the documentation and steering conventions for agent-driven repos,
and the `agent-ready` Claude Code plugin that writes them into a codebase.

## Install the plugin

You need git read access to this repo.

```sh
claude plugin marketplace add felixt-teclead/blueprint
claude plugin install agent-ready@teclead
```

This installs `mattpocock-skills@teclead` too: Matt Pocock's skills, pinned to
the tag in `.claude-plugin/marketplace.json`, as `/mattpocock-skills:<name>`.

Then turn on auto-update under `/plugin` → Marketplaces. Every merge to `main`
ships. Pocock's skills move only when a merge bumps the tag.

## Set up a repo without the plugin

Stream the setup and update skills into the repo, then run
`/setup-codebase-for-agents`.
It copies the other skills, Pocock's skills at the pinned tag, and the hooks
itself. Nothing else is written.

```sh
mkdir -p .agents/skills
w=; tar --version | grep -q 'GNU tar' && w=--wildcards
gh api repos/felixt-teclead/blueprint/tarball/main |
  tar xzf - -C .agents/skills --strip-components=4 $w \
    '*/plugins/agent-ready/skills/setup-codebase-for-agents' \
    '*/plugins/agent-ready/skills/update-codebase-for-agents'
mkdir -p .claude && ln -s ../.agents/skills .claude/skills
```

The copies do not update themselves. Run `/update-codebase-for-agents` to
take the current `main`. It asks before it overwrites a file edited in your
repo, and opens a pull request that says what changes. A repo set up before
that skill existed runs the stream command above once first.

## Name a steering owner (optional)

A diff to the steering files changes the rules the agents work by, so a human
decides it. The rule lives in `AGENTS.md` and stops an agent before it merges.
Two layers can stand behind it.

**Name owners.** `.github/CODEOWNERS` names `@STEERING-OWNER-PLACEHOLDER`, so
nobody owns anything and anyone with write access can change a steering file.
Replace the placeholder with a handle or `@org/team` that has **write access to
this repo**. GitHub then requests a review from the owner on every steering
diff. A handle *without* write access is worse than the placeholder: GitHub
assigns no owner, requests nothing, and says nothing at merge time.

**Make it blocking.** Owners alone do not refuse a merge. To make GitHub refuse
one, run the bootstrap once:

```sh
sh .github/bootstrap-steering-ruleset.sh <owner>/<name>
```

It adds the ruleset in `.github/steering-ruleset.json`: a pull request with a
code-owner approval, and no bypass actor. A private repo on a Free account
cannot hold a ruleset, so the script says so and exits 0. The gate then stays
advisory, and a human merges every steering diff by hand.
