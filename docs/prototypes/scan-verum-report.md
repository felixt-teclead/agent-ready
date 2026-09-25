# Scan: verum (at 0709aa5b)

```
rows   3 of 16 in their home
lines  102 of 153 always-loaded lines pass
load   153 lines on every task

next   Make AGENTS.md the real steering file: move CLAUDE.md's 115 lines into AGENTS.md above the generated nextjs block, drop AGENTS.md:3-12 (stub pointer + hand-written dup of the block), replace CLAUDE.md with a symlink to AGENTS.md. One PR, touches AGENTS.md + CLAUDE.md. Steering diff: CLAUDE.md:92 requires explicit user consent; human merges.
```

## Inventory

| File | Lines | Cited by always-loaded file |
|---|---|---|
| **Always loaded** | | |
| `CLAUDE.md` | 115 | – |
| `AGENTS.md` | 22 | – (loaded by Codex etc.; Claude Code does not load it, CLAUDE.md does not import it) |
| `.claude/rules/governance.md` (no `paths:`) | 16 | CLAUDE.md:48 |
| **Loaded on a trigger** | | |
| `.claude/rules/extraction.md` (`paths:`) | 908 | CLAUDE.md:51 |
| `.claude/rules/ui.md` (`paths:`) | 361 | CLAUDE.md:50 |
| `.claude/rules/supabase.md` (`paths:`) | 266 | CLAUDE.md:49, :58 |
| `.claude/skills/` 20 dirs (16 `extract-*`, shared-extraction, test, lane-planung, monats-review) + 2 symlinks into `.agents/skills/` | 4495 SKILL.md lines incl. symlinked | test/SKILL.md cited CLAUDE.md:77; skills dir CLAUDE.md:79-88 |
| `.agents/skills/` (supabase, supabase-postgres-best-practices) | 168 | no |
| `docs/agents/` | absent | – |
| review-rules doc (`docs/CODING_CONVENTIONS.md`) | absent | – |
| **Pointed at** | | |
| `docs/ARCHITECTURE.md` | 96 | CLAUDE.md:36, :96 |
| `docs/architecture/*.md` (13 files) | 7784 | CLAUDE.md:37 |
| `docs/BANK_API_RESEARCH.md` | 258 | CLAUDE.md:38 |
| `references/requirements/2026-05-20_scope_proposal_ocean_investment.md` | exists | CLAUDE.md:20 |
| `docs/backlog/` (282 .md) | – | CLAUDE.md:21 |
| `mocks/ui-nemo/index.html` | exists | CLAUDE.md:29 |
| `tests/doc-pointers.test.ts` | exists | CLAUDE.md:68 |
| `docs/backlog/ad-hoc/AH89-…md` | exists | governance.md:16 |
| `node_modules/next/dist/docs/` | exists | AGENTS.md:11, :18; CLAUDE.md:14 |
| `client-input/` | gitignored, absent on this machine | CLAUDE.md:27, :86; governance.md:9, :12 |

## Rows

| Statement | Status | Examples |
|---|---|---|
| Steering index | misplaced | CLAUDE.md is the real file, AGENTS.md:3-4 points at it (inverted); steering rule sits at CLAUDE.md:92; no SSOT line, no skills block |
| Commands | misplaced | README.md:64-75 restates package.json scripts; CLAUDE.md:71; README.md:47-59 |
| Overview, stack, how to run | misplaced | CLAUDE.md:3-9 and AGENTS.md:8-9 restate README.md:1-27 |
| Why code is this way (comments) | home | not audited line-by-line in `src/` |
| Formatting, layout | misplaced | CLAUDE.md:26, :31-32 restate the tree; no formatter config exists |
| Procedures with a trigger | misplaced | `.claude/skills/` is a real dir, not a symlink to `.agents/skills/`; test, lane-planung, monats-review live there; procedure in CLAUDE.md:96-106 |
| Steps for one topic | misplaced | `.claude/rules/extraction.md` (908), `ui.md` (361), `supabase.md` (266) instead of `docs/<topic>.md` |
| Review rules | missing | no `docs/CODING_CONVENTIONS.md`; review rules at CLAUDE.md:55-57 ("review reject"), CLAUDE.md:61-70, `.claude/rules/*.md` |
| Mechanical rules | home | eslint.config.mjs:47-53 (parseFloat ban), tests/doc-pointers.test.ts |
| Architecture | home | docs/ARCHITECTURE.md + pointer CLAUDE.md:36 |
| Domain definitions | misplaced | docs/DATA_DICTIONARY.md (595 lines), no CONTEXT.md |
| Decisions | misplaced | docs/adr/ has 2; decisions also in docs/ARCHITECTURE.md:3 ("source of truth for why"), docs/planning/*, docs/superpowers/ |
| Specs | misplaced | docs/backlog/ (282 files), docs/superpowers/specs/, docs/planning/ |
| Tracker and triage | misplaced | CLAUDE.md:19-22, CLAUDE.md:108-115, docs/backlog/README.md:93-100; no docs/agents/ |
| Steering approval | misplaced | prose rule CLAUDE.md:92; no .github/CODEOWNERS |
| Auto-memory | missing | off only in machine-local, globally gitignored `.claude/settings.local.json`; no committed setting |

## Failing lines

AGENTS.md
- AGENTS.md:6, 8-12 — SSOT: restates the generated nextjs block, AGENTS.md:16-18

CLAUDE.md
- CLAUDE.md:3-9 — SSOT: README.md:1-11
- CLAUDE.md:19-22 — SSOT: README.md:31-33, docs/ARCHITECTURE.md:7-8
- CLAUDE.md:26, 31-32 — no-op: restates the tree
- CLAUDE.md:29-30 — SSOT: .claude/rules/ui.md:353-354
- CLAUDE.md:37 — SSOT: docs/ARCHITECTURE.md:80 (the map)
- CLAUDE.md:38 — SSOT: README.md:13, :35; docs/ARCHITECTURE.md:9
- CLAUDE.md:48 — no-op: governance.md is already loaded
- CLAUDE.md:55-57 — SSOT: .claude/rules/supabase.md:190-192; no-op: eslint.config.mjs:47-53 enforces parseFloat
- CLAUDE.md:59-60 — SSOT: CLAUDE.md:81-84
- CLAUDE.md:64-68 — no-op: tests/doc-pointers.test.ts enforces the pointer format
- CLAUDE.md:71-73 — SSOT: .claude/skills/test/SKILL.md:30-42
- CLAUDE.md:74-76 — SSOT: .claude/skills/test/SKILL.md:111-113
- CLAUDE.md:96-99 — SSOT: docs/ARCHITECTURE.md:11ff ("Update the matching domain file when")

.claude/rules/governance.md
- governance.md:3, 5-9 — SSOT: docs/architecture/data-model.md:68-71

Passing but misplaced (counted as pass, feed class 3): CLAUDE.md:61-63, 69-70 (comment convention; routing table says comments push zero lines), CLAUDE.md:101-106 (belongs beside the ARCHITECTURE.md update rule), CLAUDE.md:110-115 (tracker settings).

## Friction

- **Which files are "always loaded".** Skill lists all `.claude/rules/*.md`. In verum three of four have `paths:` frontmatter, so they load on a trigger. Counted them as trigger-loaded. Counted them as always-loaded and `load` jumps from 153 to 1688. Skill must say: `paths:` frontmatter means trigger-loaded.
- **AGENTS.md vs CLAUDE.md load.** Claude Code loads CLAUDE.md, not AGENTS.md (no `@AGENTS.md` import). Codex loads AGENTS.md. Summed both (153). Per agent the load is really 131 (Claude) or 22 (Codex). The `load` line needs a per-agent rule.
- **Blank lines and headings in B.** The skill says "every line", but blanks and headings can't be judged. Counted blanks as pass; a heading passed if any line under it passed. Unstated. Non-blank B would be ~125.
- **Tool-enforced vs useful.** CLAUDE.md:64-68: tests/doc-pointers.test.ts enforces the pointer format, but without the lines the agent learns the format only after a red test. Failed it by the letter of the rule. Same call on CLAUDE.md:55-57. The no-op test needs a tie-break: "tool fails loudly with the fix in the message" vs "tool fails, agent must guess".
- **Pointer lines.** Is "See X §Y" after a failing statement (CLAUDE.md:58, :77) a pass? Passed them. Also CLAUDE.md:36 passes (routing says architecture pointer belongs), but :38 fails (research doc, not steps). Guesswork. The skill needs an explicit pointer rule.
- **Which copy is the home in SSOT.** Both copies fail or neither? For CLAUDE.md:96-99 vs docs/ARCHITECTURE.md:11 I failed the always-loaded copy. For governance.md vs data-model.md I had to pick which one is the home. The skill says "name that file" but not which side fails.
- **Paths absent by design.** `client-input/` is gitignored and missing on this machine. Counted it as not a dead path. The skill's "points at a path that does not exist" should exclude gitignored paths.
- **Status overlap.** Review rules: the home is missing (`fixed`) AND the statements are misplaced. Only one status allowed; picked missing. Steering approval (`switch`): no CODEOWNERS, but prose substitute CLAUDE.md:92. `missing` is fixed-only and `n/a` means "not needed", so it had to be misplaced. Switch state is unknown before install, so switch rows need a rule.
- **Auto-memory row.** It's off in a machine-local, globally gitignored file. Not clear if that counts as home. Marked missing.
- **Runtime skills.** 16 `extract-*` skills + shared-extraction are loaded by src/lib/extraction/prompts.ts as production prompts (code), not agent procedures. The routing table has no row for them. Moving `.claude/skills` to a symlink of `.agents/skills` would affect runtime loading. Skill should say: check for code that reads skill dirs.
- **`.claude/worktrees/`.** 13 worktrees, each with its own CLAUDE.md/AGENTS.md, show up in a naive nested-file search. Excluded by hand (gitignored). The skill should say: skip gitignored paths.
- **Rows the skill can't check cheaply.** "Why code is this way" means auditing comments across src/. Marked home without doing that.
- **Cost of step 3.** Judged 153 lines (about 125 non-blank). To find duplicates I had to grep ~8 other files (test SKILL, supabase rules, ARCHITECTURE.md, data-model.md, README, eslint config, doc-pointers test, backlog README). Fit in context easily here. With `paths:` rules counted as always-loaded (1688 lines) it would not have fit in one pass. SSOT checks are also open-ended ("does another file already say it?" across 8k lines of architecture docs); I only grepped suspected homes, so there are likely false passes.
- **Next step, consent.** Class 1 wins, but verum's CLAUDE.md:92 forbids changing CLAUDE.md without explicit consent. The skill doesn't say to surface such repo-local gates. Also, the generated nextjs block must stay in AGENTS.md because `next dev` rewrites it. The skill has no notion of tool-owned lines.
- **Tools line.** A pure move writes no prose, so I omitted `tools`. But dropping AGENTS.md:3-12 and merging arguably is editing. Unclear where "writes prose" starts. Found on this machine: unslop, unslop-de-kompakt, comment-cleanup (~/.claude/skills). No comment-review.
- **Output target.** Skill says "report in chat". Caller asked for a file. No conflict, but the skill has no file mode.
