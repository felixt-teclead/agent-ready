# Verum's documentation guards, and their repo-agnostic form

Research for [#7](https://github.com/Teclead-Ventures/blueprint/issues/7), child of map [#1](https://github.com/Teclead-Ventures/blueprint/issues/1).

Sources: `tests/doc-pointers.test.ts` (210 lines, 4 assertions), `tests/loading-coverage.test.ts`
(131 lines, 5 assertions), commits `f3d302c6` (pointer guard born), `9bcd7996` (single-source-of-truth
guards added), `e15f9004` (the pointer convention moved into `CLAUDE.md` §Conventions), plus
`docs/ARCHITECTURE.md` and the `paths:` frontmatter of `.claude/rules/*.md`.

## 0. What the guards are defending

One convention, written in verum's `CLAUDE.md` §Conventions:

> A pointer on its own line is `See <doc> §"<anchor>"`, quote closed — the anchor is a heading or a
> bold lead-in, quoted exactly. A reference inside a sentence names the file alone, e.g.
> `(.claude/rules/ui.md)`. A wrapped anchor is quoted collapsed to one line.

Two properties follow, and both guards exist to hold exactly those:

1. **A pointer resolves.** The quoted anchor text actually occurs in the named file.
2. **A statement has one home.** If the same anchor is defined twice, the pointer is ambiguous and an
   edit to one copy silently leaves the other stale.

The origin is documented in the test's own header: before `docs/ARCHITECTURE.md` was split into
`docs/architecture/<domain>.md` (PR #267), pointers were numeric — `§2`, `decision 6`, `§3.15` — and
**three of them already named the wrong target. Nothing noticed, because nothing resolved them.**
That is the failure mode. A prose convention with no resolver decays into decorative citations.

The same pattern recurs in `loading-coverage.test.ts`, stated in its header:

> This used to live as a prose list in CLAUDE.md naming three offenders; the list had drifted — the
> root landing page `/`, the first surface every signed-in user hits, had no skeleton and was not on
> it. A prose list of gaps is a list that only ever goes stale, so the check is here instead.

**The portable lesson is not the specific check. It is: a steering rule that a machine cannot resolve
is a rule that has already rotted and nobody has noticed yet.**

## 1. `tests/doc-pointers.test.ts` — four assertions

Scan set: `SCAN_ROOTS = ["src", "tests", ".claude", "docs", "README.md", "CLAUDE.md"]`, file
extensions `/\.(ts|tsx|mts|mjs|js|md|sql|json|css)$/`, skipping
`node_modules .next worktrees superpowers planning meeting-notes audits`. The four skipped doc folders
are historical: "Historical folders (docs/superpowers, docs/planning, meeting notes, audits) record
what was true at the time and are not scanned."

### A1 — every quoted pointer resolves to an existing anchor

```js
const POINTER = /((?:docs|\.claude|supabase)\/[\w./()\[\]-]+\.md)`?,?\s+§["„]([^"“”„]+)["“”]/g;
```

```js
if (doc === null) broken.push(`${where} — no such file`);
else if (!doc.includes(anchor.replace(/\s+/g, " "))) broken.push(`${where} — anchor not found`);
expect(checked).toBeGreaterThan(40);
expect(broken).toEqual([]);
```

Catches: a renamed heading, a moved or deleted doc, a typo'd quote, a pointer surviving a refactor
that moved its target. The target doc is read with `.replace(/\s+/g, " ")` — whitespace collapsed —
so a heading or bold lead-in that wrapped across lines still matches. German quotes `„…"` are
accepted because the repo's prose is German.

`expect(checked).toBeGreaterThan(40)` is the **guard on the guard**: if the regex or the walker ever
breaks, the test would otherwise pass vacuously with zero pointers checked. Any scan-based guard
needs this; it is the cheapest assertion in the file and the one most likely to save it.

### A2 — no live file points at an architecture doc by section or decision number

```js
const NUMERIC = /(?:ARCHITECTURE(?:\.md)?|docs\/architecture\/[\w-]+\.md`?)\s*(?:§\s*\d|decision\s+\d|§\d)/;
expect(hits).toEqual([]);
```

Catches a regression to the pre-split citation form. A numeric pointer cannot be resolved by A1 —
section numbers renumber themselves when a section is inserted — so A2 bans the unresolvable form
outright rather than trying to check it. Three exemptions, each with its reason inline:

```js
if (rel.startsWith("docs/backlog/")) continue;      // dated records; informal anchors stay as written
if (rel.startsWith("supabase/migrations/")) continue; // forward-only; a comment is never edited after the push
if (rel === "tests/doc-pointers.test.ts") continue;   // the file that contains the pattern
```

### A3 — `docs/ARCHITECTURE.md` stays an index

```js
expect(headings).toEqual(["## 1. System overview", "## 2. Map of `docs/architecture/`"]);
```

then, the map against the directory in both directions:

```js
const onDisk = readdirSync(join(ROOT, DOMAIN_DIR)).filter((n) => n.endsWith(".md")).sort();
const mapped = [...index.matchAll(/\]\(architecture\/([\w-]+\.md)\)/g)].map((m) => m[1]).sort();
expect(mapped).toEqual(onDisk);
```

Catches two things. First, the index regrowing reasoning: "A section of reasoning that regrows there
is a second copy of something a domain file already owns, and the two then drift apart silently —
which is exactly the state the split ended." Second, the map going stale in either direction — a new
domain file with no row, or a row pointing at a file that was renamed or deleted. An **exact array
equality on headings**, not a count or a threshold, is what makes this bite: a third heading fails
regardless of what it says.

The commit message (`9bcd7996`) records the counter-check: an appended index section, a renamed
domain file, and a decision copied into `loans-and-debt.md` each fail the right test, with file and
anchor in the message.

### A4 — no anchor is defined in two architecture docs

```js
const duplicated = [...owners].filter(([, docs]) => docs.length > 1)
  .map(([anchor, docs]) => `§"${anchor}" defined in ${docs.join(", ")}`);
expect(duplicated).toEqual([]);
```

Catches the same statement living in two files. `anchorsOf()` extracts what the convention permits as
an anchor: markdown headings, and **bold lead-ins that open a line** (a leading list marker is
stripped without eating the `**`; a wrapped lead-in is joined until the closing `**`). Fenced code
blocks are skipped. A pointer's own quoted text is deliberately **not** an anchor — "otherwise every
`See <doc>` line would register its target a second time and look like a duplicate."

Two filters, both reasoned in the source:

- `STRUCTURAL = new Set(["Design decisions"])` — "Every domain file closes with one; it is a section
  label, not a pointer target."
- `MIN_ANCHOR = 12` — "An anchor short enough to collide by accident is not one anyone quotes […] 12
  is where the noise stops: measured over the 460 anchors the architecture docs define, it leaves
  exactly the structural label above as a legitimate repeat."

The threshold is **measured, not guessed**, and the measurement is written down. That is the property
worth copying; `12` itself is a function of verum's corpus.

## 2. `tests/loading-coverage.test.ts` — five assertions

Domain-specific on its face (Next.js App Router `loading.tsx`), but it is the reference
implementation of the **exemption ledger**, which is the portable half.

| # | Assertion | Failure caught |
|---|---|---|
| L1 | `expect(routes.length).toBeGreaterThan(20)` | the route walker broke; the suite would otherwise pass on an empty set |
| L2 | `missing` (no `loading.tsx` at or above, not `EXEMPT`, not `KNOWN_GAPS`) `toEqual([])` | a new route shipped with no skeleton |
| L3 | `EXEMPT` names a route that no longer exists | the exemption list outliving its subject |
| L4a | `KNOWN_GAPS` names a route that no longer exists | same, for the debt list |
| L4b | a `KNOWN_GAPS` route that now *has* a `loading.tsx` | debt paid but not struck off — the list would drift upward forever |
| L5 | a key in both `EXEMPT` and `KNOWN_GAPS` | "forever exempt" smuggled in as "known gap" |

L3/L4/L5 are the invention. The header states the intent plainly: "Both lists below are asserted in
BOTH directions […] That is what stops this file from becoming the new place gaps hide." Without
them, the guard becomes a hiding place and re-creates the drifted prose list it replaced, only now
with a green checkmark on top.

`hasLoadingAtOrAbove()` (added in `e15f9004`) is a correctness fix worth noting as a general lesson:
the first cut checked only the route's own directory and reported two false gaps. **A guard's first
false positive costs more credibility than the bug it was meant to catch** — the reflex is to add the
route to the exemption list, and then the list is lying.

## 3. The exemption mechanism, and why every entry states a reason

Two lists, both `Map<key, reason>` — the reason is the value, so an entry **cannot be added without
typing one**:

```js
// Routes that need no loading.tsx by design. Every entry states why — an
// unexplained entry is how an exemption list turns into a backlog.
const EXEMPT = new Map([
  ["sign-in", "static form, nothing async to wait for"],
  ["settings", "redirect-only: routes to users/entities/banks-accounts by role"],
  ["statements/[id]/validate", "deliberately no loading.tsx — Suspense duplicates the statement row during hydration (AH110-01)"],
]);

// Routes that SHOULD have a loading.tsx and do not. This list must only ever
// shrink; adding to it is a deliberate, reviewable act, not a default.
const KNOWN_GAPS = new Map([
  ["", "root landing grid — async (getCurrentUser + getTranslations)"],
  ["reporting", "async report surface"],
]);
```

The design has four parts, and all four are portable:

1. **Two lists, not one.** `EXEMPT` = "correct as is, forever". `KNOWN_GAPS` = "wrong, not fixed yet".
   Collapsing them destroys the distinction between a decision and a debt, and debt then reads as a
   decision. L5 enforces the separation.
2. **The reason is mandatory by data structure.** A `Map` value, not a `Set` member. No reviewer
   discipline required.
3. **A reason carries provenance.** The strongest entries name a ticket (`AH110-01`, `AH33`) or point
   at a rule: `See .claude/rules/ui.md §"Loading and empty states"` — itself checked by A1, so the
   exemption's justification cannot rot either.
4. **Both lists are asserted in both directions.** An exemption whose subject is gone, or a gap
   that got fixed, fails. The list can only shrink by default; growing it is an explicit diff a
   reviewer sees.

The reason is what makes the entry **reviewable in a diff**. `"sign-in"` in a `Set` is invisible in
review. `["sign-in", "static form, nothing async to wait for"]` is a claim a reviewer can disagree
with — and that disagreement happens at the moment the exemption is added, not two years later when
someone wonders why the sign-in page is special.

## 4. Verum-specific versus portable

**Portable — the mechanisms:**

- Resolve every citation; fail on the unresolvable ones (A1).
- Ban a citation form that cannot be resolved (A2). Numeric sections are the archetype.
- Index/domain split with an exact-equality heading assertion and a bidirectional map↔directory check
  (A3).
- Anchor uniqueness across a document set (A4).
- The exemption ledger: two `Map`s, mandatory reasons, asserted in both directions, disjointness (L3–L5).
- `expect(count).toBeGreaterThan(N)` on every scan-based guard, so it cannot pass vacuously.
- Skip historical folders — records of what was true then, not claims about now.
- Whitespace-collapsed matching, so a reflowed heading still resolves.
- The bold-lead-in-as-anchor idea: not every anchor is a heading, and forcing them all to be headings
  would shred the prose.

**Verum-specific — the constants and the domain:**

- `docs/ARCHITECTURE.md` / `docs/architecture/` as names; the exact two index headings
  (`## 1. System overview`, `## 2. Map of \`docs/architecture/\``).
- `MIN_ANCHOR = 12` and `STRUCTURAL = {"Design decisions"}` — measured over verum's 460 anchors.
- `SCAN_ROOTS`, the `SKIP_DIRS` set, `checked > 40`, `routes.length > 20`.
- German quotes `„…"` in the pointer regex.
- The `docs/backlog/` and `supabase/migrations/` exemptions from A2.
- All of `loading-coverage.test.ts`'s subject matter (Next.js App Router, route groups, Suspense).
  The **shape** ports; the subject does not.

Everything on the first list is a rule about documents. Everything on the second is a constant, a
path, or a framework. **The blueprint ships the first list as code and the second as config.** That
split is the whole design of §5.

## 5. Rewriting them as `npx`-able Node scripts

Constraints from map #1: no plugin, no marketplace, template only; must work in a non-Node repo
(hence `npx`, not a vitest suite).

### CLI

```
npx @teclead/doc-guards [check] [--config <path>] [--only <guard,…>] [--format text|json|github]
                        [--fix-list] [--quiet]
npx @teclead/doc-guards init      # write a starter doc-guards.config.json, detecting docs/ layout
npx @teclead/doc-guards explain <guard>   # what it asserts and why, for the agent reading the failure
```

Default config resolution: `doc-guards.config.json` → `doc-guards.config.mjs` → the `docGuards` key
in `package.json` → built-in defaults. A `.mjs` config is what lets a repo supply a predicate
(`isHistorical(path)`) instead of only globs.

### Exit codes

| Code | Meaning |
|---|---|
| 0 | all enabled guards passed |
| 1 | at least one guard failed — a real violation |
| 2 | a guard could not run meaningfully: the vacuity floor was not met (`checked < minPointers`), a configured root does not exist, the config is invalid. **Distinct from 1 on purpose**: "found nothing to check" must never look like "everything is fine", and in CI it should page a different person than a broken pointer does. |
| 3 | internal error (crash, unreadable file) |

`--format github` emits `::error file=…,line=…::…` so failures land on the diff in a GitHub Action.
`--format json` gives an agent a machine-readable failure list — the reason the guard exists is that
an agent is the one editing these docs.

### Config shape

```jsonc
{
  "$schema": "https://…/doc-guards.schema.json",
  "root": ".",
  "scan": {
    "roots": ["src", "tests", "docs", ".claude", "README.md", "CLAUDE.md"],
    "extensions": ["ts", "tsx", "mts", "mjs", "js", "md", "sql", "json", "css"],
    "skipDirs": ["node_modules", ".next", "worktrees"],
    "historical": ["docs/superpowers/**", "docs/planning/**", "docs/meeting-notes/**", "docs/audits/**"]
  },
  "pointers": {
    "enabled": true,
    "quoteChars": ["\"", "„", "“", "”"],     // verum needs the German pair; most repos do not
    "docPrefixes": ["docs", ".claude", "supabase"],
    "minPointers": 40,                        // vacuity floor → exit 2, not 1
    "bannedForms": [
      { "pattern": "(?:ARCHITECTURE(?:\\.md)?|docs/architecture/[\\w-]+\\.md)\\s*(?:§\\s*\\d|decision\\s+\\d)",
        "reason": "numeric sections renumber; they cannot be resolved",
        "exempt": [
          { "glob": "docs/backlog/**", "reason": "dated records; informal anchors stay as written" },
          { "glob": "supabase/migrations/**", "reason": "forward-only; a comment is never edited after the push" }
        ] }
    ]
  },
  "index": {
    "enabled": true,
    "file": "docs/ARCHITECTURE.md",
    "domainDir": "docs/architecture",
    "allowedHeadings": ["## 1. System overview", "## 2. Map of `docs/architecture/`"],
    "mapLinkPattern": "\\]\\(architecture/([\\w-]+\\.md)\\)"
  },
  "anchors": {
    "enabled": true,
    "scope": ["docs/ARCHITECTURE.md", "docs/architecture/*.md"],
    "minLength": 12,
    "structural": [
      { "anchor": "Design decisions", "reason": "section label every domain file closes with, not a pointer target" }
    ]
  },
  "coverage": [
    {
      "id": "loading",
      "find": { "dirsContaining": "page.tsx", "under": "src/app" },
      "require": { "fileAtOrAbove": "loading.tsx" },
      "keyFrom": { "stripSegments": "^\\(.*\\)$" },      // route groups never appear in the URL
      "minSubjects": 20,
      "exempt":    { "sign-in": "static form, nothing async to wait for" },
      "knownGaps": { "": "root landing grid — async" }
    }
  ]
}
```

Notes on the shape:

- **Every exemption is an object with a `reason`, never a bare string.** The schema rejects a bare
  string. That is how "state a reason" survives being moved from a `Map<string,string>` in
  TypeScript into JSON — the data structure keeps enforcing it, exactly as the `Map` did.
- **`minPointers` / `minSubjects` are first-class**, not an afterthought, because exit 2 depends on them.
- `coverage` is an **array of declarative rules**, which is what generalises `loading-coverage.test.ts`
  past Next.js: "every directory containing X must have Y at or above it, keyed by Z." The same rule
  expresses "every migration has a rollback note", "every skill dir has a `SKILL.md`", "every ADR is
  linked from the ADR index". The `loading.tsx` case becomes one config entry, not a program.
- `--fix-list` rewrites only the `knownGaps`/`exempt` blocks (drop entries whose subject is gone or
  whose debt is paid) and prints the diff. It never adds an entry — L4b's "debt paid but not struck
  off" is mechanical and safe to automate; adding an exemption is a judgment call and must stay a
  human diff.
- Implementation: zero runtime deps, a single `#!/usr/bin/env node` ESM file plus a schema. Globs via
  `node:fs.glob` (Node 22+) so nothing is installed; anchors, pointers and headings are the same
  regexes and the same `anchorsOf()` walker verum already proved over 460 anchors.

**What is lost by leaving vitest:** the `expect(actual, message).toEqual([])` diff rendering, watch
mode, and running inside the existing suite so a PR cannot merge without it. The message argument is
cheap to reproduce; the CI wiring must become a workflow step (`npx @teclead/doc-guards --format github`)
that the template ships. **Verum should keep the vitest wrappers and have them shell out to, or
import, the same engine** — a repo that already has a test gate should not lose the gate.

## 6. A new guard: `paths:` coverage over rule citations

The idea: verum's path-scoped rule files carry frontmatter globs that decide when the rule loads into
an agent's context. Code cites a rule with `See .claude/rules/ui.md §"…"`. **If a file cites a rule
whose `paths:` do not match that file, the citation is a lie: the agent editing that file never sees
the rule it is told to follow.** Nothing checks this today.

### What it must parse

1. **The frontmatter of each `.claude/rules/*.md`** — leading `---` block, the `paths:` key, its YAML
   sequence of quoted globs. A hand-rolled parser suffices (verum's files are a flat list of quoted
   strings), but a rule file **without** `paths:` must be recognised as *always loaded* —
   `governance.md` has no frontmatter at all — and exempted from the check. That distinction is the
   first thing a naive implementation gets wrong.
2. **The globs themselves**, with Claude Code's semantics, not `minimatch` defaults:
   `**` crossing directory boundaries, `**/` matching zero segments, and literal `(app)` / `[id]`
   segments from Next.js route groups and dynamic routes. Those parens and brackets are **glob
   metacharacters that must be treated as literals here**; a regex translation that forgets to escape
   them, or that escapes `?` after inserting `(?:.*/)?` into the pattern, silently reports everything
   as uncovered. (I hit exactly that bug while measuring — 114 false gaps instead of 88.)
3. **The citations in code** — `\.claude/rules/([a-z-]+)\.md` across the same scan set A1 uses, in
   both citation forms (the `§"anchor"` pointer and the bare `(.claude/rules/ui.md)` in-sentence form;
   both mean "this file is governed by that rule").
4. **The file list**, from `git ls-files` rather than a directory walk, so gitignored trees
   (`client-input/`, `worktrees/`) never enter.
5. **Two exemption classes**, each with a reason:
   - rule files with no `paths:` (always loaded — no coverage to check);
   - prose that *discusses* a rule rather than being governed by it: `CLAUDE.md`,
     `docs/architecture/*.md`, `docs/backlog/**`, and the historical folders. Without this the guard
     drowns in true-but-useless hits.

### It has two directions, and the second is the more valuable one

- **Citation → glob:** a file cites a rule that would not load for it. Either the citation is wrong or
  the glob is too narrow.
- **Glob → filesystem (dead glob):** a `paths:` entry that matches **no file in the repo**. This is
  the check that finds a silently stale rule. A path-scoped rule that matches nothing never loads and
  nobody ever notices, because the failure is an absence.

### Measured against verum today

With the exemptions above applied, **20 code files cite a rule whose `paths:` do not match them**:

```
src/app/(review)/statements/[id]/validate/use-validator-payload.ts -> extraction.md
src/app/(app)/loans/kpi-tiles.tsx                                  -> supabase.md
src/app/(review)/statements/[id]/validate/page.tsx                 -> supabase.md
src/lib/dashboard/as-of-lag.ts, reporting-detail-view.ts            -> ui.md
src/lib/data-quality/{load-recategorisable-assets,recategorise-codes}.ts -> ui.md
src/lib/fx/manual-rate-command.ts, src/lib/loan-leverage/format.ts, src/lib/mcp/setup-steps.ts -> ui.md
supabase/migrations/…{legacy_holdings,ah349_recategorise_asset,fix_v_entity_summary}.sql -> extraction.md / ui.md
tests/{citi-holding-rule,ibkr-csv-identities,payload-lint}.test.ts  -> extraction.md
tests/ibkr-csv-ingest.test.ts                                      -> supabase.md
tests/{loading-coverage,mcp-tools.integration}.test.ts             -> ui.md
eslint.config.mjs                                                  -> supabase.md
```

Three findings from that list:

- **A genuinely dead glob.** `extraction.md` lists
  `"src/app/(app)/statements/**/use-validator-payload.ts"`, but that file has lived at
  `src/app/(review)/statements/[id]/validate/use-validator-payload.ts` since the route-group move
  (AH110-01a, PR #250). The glob matches nothing. The rule stopped loading for the one file the glob
  was written for, and nothing said so.
- **A systematic hole.** `supabase.md` lists `"src/app/**/*.ts"` but not `*.tsx`, so every `.tsx`
  citing it is uncovered.
- **`ui.md`'s `src/lib/` globs enumerate four specific files** (`sign-colour.ts`,
  `locale/number.ts`, `dashboard/formatters.ts`, `time/**`) while eight more `src/lib` files cite
  the rule. The enumeration was never widened as the code grew.

None of these is catastrophic on its own. Together they are the same failure as the three wrong
numeric pointers before A1 existed: **a convention nobody can resolve is a convention that is already
partly false.** The guard is worth building, and it should ship with a `knownGaps` ledger seeded from
exactly this list so it can go green on day one and only shrink after.

## 7. Recommendations for the blueprint

1. Ship `pointers`, `index`, `anchors` and one declarative `coverage` rule as a single
   zero-dependency `npx` binary with the config shape in §5.
2. Make `reason` structurally mandatory on every exemption; reject a bare string in the schema.
3. Keep exit code 2 (could not run) separate from 1 (violation), and keep the vacuity floors.
4. Seed `paths:`-coverage as a fourth guard, with both directions and a seeded `knownGaps`.
5. Copy the mechanisms, not the constants: `MIN_ANCHOR = 12` and `checked > 40` are verum's corpus,
   and the blueprint's contribution is the instruction to *measure your own and write down what you
   measured*.
