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
   /ask-agent-ready what's next for this repo?
   ```

   It reads the repo's state, recommends one next step, and explains the
   options and their tradeoffs. State a goal instead if you have one: "agents
   should take tickets unattended", "just fix our docs", "we use Superpowers".

The usual path:

| Step | Command | What you get |
|---|---|---|
| Set up | `/setup-codebase-for-agents` | `AGENTS.md`, hooks, tracker and labels, one pull request |
| Check | `/scan-codebase-for-agents` | three numbers and the next change |
| Migrate | `/adopt-pocock-methodology` | old setup retired, `CONTEXT.md` and ADRs, docs routed |
| Improve over time | `cleanup` | comments and docs fixed one pull request at a time |

A full migration pays off most for a team that wants agents to work in
parallel. Starting with one part is fine: `/ask-agent-ready` names the order
and how to compare before and after. From the plugin, commands carry its
prefix, e.g. `/agent-ready:ask-agent-ready`.

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
