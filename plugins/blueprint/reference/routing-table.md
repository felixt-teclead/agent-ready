# Routing table (PROTOTYPE copy of #27)

`fixed` = same in every repo. `interviewed` = the setup skill asks. `switch` = `userConfig` accept/deny at install. `lazy` = created only when needed.

| Statement | Home | Kind |
|---|---|---|
| Steering index: single source of truth, the steering rule, the skills block | `AGENTS.md`; `CLAUDE.md` is a symlink to it | fixed |
| Commands | `package.json` or the stack's own manifest; never restated in prose | interviewed |
| Overview, stack, how to run | `README.md`, **only if a human needs it** — the interview asks whether the codebase needs setup before it runs. Agents find the stack themselves. | interviewed |
| Why code is this way, locally | a comment, written by `comment-review` | switch |
| Formatting, layout | config files and the tree; never restated | fixed |
| Procedures with a predictable trigger | `.agents/skills/`; `.claude/skills` is a symlink to it | fixed |
| Steps for one topic | `docs/<topic>.md` plus a pointer line in `AGENTS.md` | lazy |
| Review rules, universal and scoped | `docs/CODING_CONVENTIONS.md` | fixed; content interviewed |
| Mechanical rules | lint, typecheck, tests | interviewed |
| Architecture | **no `docs/ARCHITECTURE.md` shipped**. If a repo already has an architecture doc, the setup/scan skill writes one pointer line into `AGENTS.md`; no doc, no line, no context cost. Architecture *rules* go into `CODING_CONVENTIONS.md` as scoped sections. | lazy |
| Domain definitions | `CONTEXT.md` (`/domain-modeling`) | lazy |
| Decisions and rejected alternatives | `docs/adr/` | lazy |
| Specs | issues, closed once shipped; never kept in the repo | fixed |
| Tracker and triage settings | `docs/agents/*.md`. Default GitHub issues; interview offers local markdown or Linear | interviewed |
| Steering approval | `.github/CODEOWNERS` plus the ruleset bootstrap | switch |
| Auto-memory | off, always | fixed |

### `docs/CODING_CONVENTIONS.md`

- One line per mistake an agent actually made. Mechanical rules go to lint/typecheck/tests.
- May grow large; only review reads it.
- A scoped convention is a section naming its scope in prose. This is **not** `.claude/rules/`: prose scope cannot miss a file the way a glob does (#3 measured 20 verum files citing a rule whose globs missed them).
- Pocock's `code-review` skill finds it by search ("anything in the repo that documents how code should be written"), so `AGENTS.md` carries **no code-review pointer** — it would be a no-op.

### What `AGENTS.md` pushes

Keep: single source of truth, the steering rule, the agent-skills block. Cut: the code-review pointer, all three comment paragraphs. Comments push zero lines — the hook's block message carries the instruction.

