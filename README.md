# agent-ready

The record of the documentation and steering conventions for agent-driven repos,
and the `agent-ready` Claude Code plugin that writes them into a codebase.

## Start here

agent-ready moves a repo to one shared way of working with agents, built on
[Matt Pocock's skills](https://github.com/mattpocock/skills): one domain
glossary (`CONTEXT.md`), decisions as ADRs, docs agents can trust, and work as
tickets agents can take on their own. You don't need to know Pocock's
methodology first.

1. Install the plugin (below).
2. In your repo, ask:

   ```
   /what-to-do what's next for this repo?
   ```

   It reads the repo's state, recommends one next step, and explains the
   options and their tradeoffs. State a goal instead if you have one: "agents
   should take tickets unattended", "just fix our docs", "we use Superpowers".

## Pick how deep you go

Every tier starts with setup and leaves the repo better prepared for agents.
Go as far as you want; the tiers combine.

| Tier | You get | Commands |
|---|---|---|
| **A. Prepare** | Lean steering files: `AGENTS.md` (with `CLAUDE.md` pointing at it) holds only what an agent needs on every task, `docs/CODING_STANDARDS.md` holds the review rules, `CONTEXT.md` names the domain. New comments and docs get reviewed on every pull request from then on. | `/setup-codebase-for-agents`, then `model-codebase-domain`; the scan and `cleanup` trim the steering files one pull request at a time |
| **B. Keep your framework** | Superpowers stays. agent-ready maps its steps onto the blueprint's flow: design by grilling, specs and tickets by Pocock's skills, plans and execution by Superpowers. Setup calls this answer **Stubborn**. | Setup's framework question: *Stubborn* |
| **C. Migrate** | One methodology: the old setup retired, old specs and plans folded into `CONTEXT.md`, ADRs and issues, the docs agents read routed to one home each. Best for a team that wants agents to work in parallel and unattended. | Setup's framework question: *Migrate*, then `/adopt-pocock-methodology` |
| **D. Clean what exists** | On top of A, B or C: existing code comments rewritten and checked, architecture and other docs routed and trimmed, dead pointers fixed. Runs in the background as small pull requests, merged by agents where no steering file changes. | `route-codebase-docs` for the docs, a `cleanup` phase for the comments |

Not sure which? `/what-to-do` recommends one from the repo's state and
your goal, and explains the tradeoffs. Tier B maps Superpowers only; with
another framework, pick A or C. From the plugin, commands carry its prefix,
e.g. `/agent-ready:what-to-do`.

## Install the plugin

You need git read access to this repo: ask the repo owner to add you.

```sh
claude plugin marketplace add felixt-teclead/agent-ready
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
gh api repos/felixt-teclead/agent-ready/tarball/main |
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
