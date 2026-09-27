# agent-ready

The record of the documentation and steering conventions for agent-driven repos,
and the `agent-ready` Claude Code plugin that writes them into a codebase.

## Start here

agent-ready moves a repo onto
[Matt Pocock's skills](https://github.com/mattpocock/skills): one domain
glossary (`CONTEXT.md`), decisions as ADRs, docs agents can trust, and tickets
agents take on their own. You need no prior knowledge of Pocock's methodology.

1. [Install the plugin](#install-the-plugin).
2. In your repo, type `/what-to-do what's next for this repo?`. It reads the
   repo, recommends one next step and explains the tradeoffs. You can state a
   goal instead: "agents should take tickets unattended", "just fix our docs",
   "we use Superpowers".

## Tiers

Go as far as you want. Each tier builds on Basic. With the plugin, commands
carry its prefix, e.g. `/agent-ready:what-to-do`.

| Tier | You get | Command |
|---|---|---|
| **Basic** | `AGENTS.md` (with `CLAUDE.md` pointing at it) holds what an agent needs on every task. `docs/CODING_STANDARDS.md` holds the review rules. `CONTEXT.md` names the domain. Every pull request gets its new comments and docs reviewed. | `/setup-basics`. It asks first: guided by you, or done by the agent alone |
| **Stay Stubborn** | Superpowers stays. Design goes to grilling, specs and tickets to Pocock's skills, plans and execution to Superpowers. Superpowers only; with another framework, pick Basic or Migrate. | Setup's framework question: *Stubborn* |
| **Migrate** | One methodology. The old setup is retired, old specs and plans fold into `CONTEXT.md`, ADRs and issues, and each doc statement gets one home. Best when agents work in parallel and unattended. | Setup's framework question: *Migrate*, then `/adopt-pocock-methodology` |
| **Cleanup** | Docs routed and trimmed in one reviewed pull request. Then code comments rewritten in the background, as small pull requests that agents merge themselves unless a steering file changes. | `route-codebase-docs`, then a `cleanup` phase |

## Install the plugin

Ask the repo owner for git read access to this repo. Then:

```sh
claude plugin marketplace add felixt-teclead/agent-ready
claude plugin install agent-ready@teclead
```

This also installs Pocock's skills as `/mattpocock-skills:<name>`, pinned to
the tag in `.claude-plugin/marketplace.json`. Turn on auto-update under
`/plugin` → Marketplaces: every merge to `main` ships, and Pocock's skills move
only when a merge bumps the tag.

## Set up a repo without the plugin

Stream the setup and update skills into the repo:

```sh
mkdir -p .agents/skills
w=; tar --version | grep -q 'GNU tar' && w=--wildcards
gh api repos/felixt-teclead/agent-ready/tarball/main |
  tar xzf - -C .agents/skills --strip-components=4 $w \
    '*/plugins/agent-ready/skills/setup-codebase-for-agents' \
    '*/plugins/agent-ready/skills/update-codebase-for-agents'
mkdir -p .claude && ln -s ../.agents/skills .claude/skills
```

Then run `/setup-codebase-for-agents`. It copies the other skills, Pocock's
skills and the hooks. To take the current `main` later, run
`/update-codebase-for-agents`. It asks before it overwrites a file you edited,
and opens a pull request. A repo set up before that skill existed runs the
stream command once first.

## Name a steering owner (optional)

`AGENTS.md` stops an agent from merging a steering diff. Two GitHub layers can
back that rule.

**Name owners.** In `.github/CODEOWNERS`, replace `@STEERING-OWNER-PLACEHOLDER`
with a handle or `@org/team` that has **write access to this repo**. GitHub then
requests the owner's review on every steering diff. A handle without write
access does nothing, silently.

**Make it blocking.** Run once:

```sh
sh .github/bootstrap-steering-ruleset.sh <owner>/<name>
```

It adds the ruleset in `.github/steering-ruleset.json`: code-owner approval
required, no bypass. A private repo on a Free plan cannot hold a ruleset; the
script says so and exits 0, and the rule stays advisory.
