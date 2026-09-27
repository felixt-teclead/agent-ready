# Worked examples

Each example is a comment as found, the fact rows the rewriter writes, and the
answers row that follows. Anchors are shortened. The code is invented and the
doc is `docs/DESIGN.md`; substitute the repository's own.

## 1. History, reason and pointer in one block

```ts
// Originally we charged the card here (T-412), but that double-charged on retry.
// A checkout HOLDS the amount and captures nothing; see docs/DESIGN.md §Payments.
const hold = placeHold(order);
```

| anchor | scope | fact | source | flag | truth |
| --- | --- | --- | --- | --- | --- |
| `const hold = placeHold(order);` | body | originally we charged the card here (T-412) | | `HISTORY` | |
| … | body | charging double-charged on retry | | `PROCESS` | true, but it narrates the path, not the present rule |
| … | body | a checkout holds the amount and captures nothing | `docs/DESIGN.md §"Payments"` | `DUPLICATE` | §"Payments" states it |

The pointer is not a row. It is the third fact's source, and because §Payments
states the fact, the fact is `DUPLICATE` at the code and only the pointer
survives.

| anchor | verdict | text | source | route | after |
| --- | --- | --- | --- | --- | --- |
| `const hold = placeHold(order);` | KEEP | | `docs/DESIGN.md §"Payments"` | DOC | |

Result in the file: `// See docs/DESIGN.md §"Payments"`. Nothing enters the
doc, because `text` is empty.

## 2. Same block, but the doc does not state it

If §Payments says nothing about holds, the third fact fires no flag. It is
`KEEP`, and the answers row carries it as a doc sentence with a placement hint:

| anchor | verdict | text | source | route | after |
| --- | --- | --- | --- | --- | --- |
| `const hold = placeHold(order);` | KEEP | A checkout holds the amount and captures nothing because retries are not idempotent at the gateway: capturing here charges twice on a retried request. | `docs/DESIGN.md §"Payments"` | DOC | "Capture runs when the order ships" |

The code gets the same pointer; the sentence goes to the worklist for the doc.

## 3. Restating, body scope

```ts
// increment the retry counter
retries++;
```

One fact, `RESTATES`. Verdict `CUT`. No answers row is placed.

## 4. Derivable, body scope, both directions

```ts
// amount is in cents
const amount = toMinorUnits(total);
```

`toMinorUnits` returns `Cents` (a branded type). The fact is `DERIVABLE`: the
callee's return type states it. `CUT`.

```ts
// amount is in cents
const amount = row.amount;
```

`row.amount` is `number`. The type leaves the unit bare, so the fact is not
derivable. `KEEP`, body form: `// amount because DB rows are minor units: a
major-unit caller over-pays a hundredfold`.

## 5. Derivable inverts at an interface

```ts
/** Returns the balance in cents. Throws when the account is unknown. */
export function getBalance(accountId: string): Promise<number>
```

The probe's bare pass returns `unstated` for units and failure: the signature's
`Promise<number>` carries neither, so neither fact is `DERIVABLE`. The
commented pass fills both, so both are `KEEP`, contract form, kept verbatim.
The boundary cell is `unstated` in both passes (does it read a cache or the
ledger?). The rewriter decides a caller must know it, and adds one row:

| anchor | scope | fact | source | flag | truth |
| --- | --- | --- | --- | --- | --- |
| `export function getBalance(` | interface | missing: boundary | | `KEEP` | reads the settled ledger, never the pending queue |

Answers text: `Returns the balance in cents.<br>Throws when the account is
unknown.<br>Reads the settled ledger, never the pending queue.` The placer
writes it above the export as a `/** */` block, one statement per line.

## 6. Implementation in the interface

```ts
/** Loops over items, groups by SKU with a Map, then sorts by quantity. */
export function summariseCart(items: LineItem[]): CartLine[]
```

`HOW-IN-INTERFACE`. A caller depending on "sorts by quantity" is the harm. If
the ordering is part of the contract, it survives as a contract statement:
`Returns lines ordered by descending quantity.` The Map and the loop are cut.

## 7. Private function, unearned and earned

```ts
// maps a DB row to the view model
function toViewModel(row: Row): ViewModel
```

`UNEARNED`: the name says it and a mapper is a codebase convention. `CUT`.

```ts
// Walks the org tree and decides which members inherit each grant.
function resolve(root: Org, grants: Grant[]): Effective
```

Two hundred lines, called from three files, and `resolve` does not carry
"decides which members inherit each grant". `KEEP`, private form, short.

## 8. Wrong, then corrected

```ts
// runs after the discount is applied
const tier = rankTiers(candidates);
```

The code applies the discount after `rankTiers`. The fact is `WRONG`: cut
first. Then the rewriter asks whether the corrected fact earns a row. Here a
caller who assumes the old order breaks the pricing, so the corrected fact is
`KEEP`: `// ranks before the discount because the discount flattens tiers:
ranking after it picks a tier the discount already collapsed`.

## 9. Pointer-only comment

```ts
// see docs/DESIGN.md §Matching
const hit = keywordMatch(line);
```

No fact of its own. The rewriter reads §Matching and writes the fact the
section states as the row, source `docs/DESIGN.md §"Matching"`, `DUPLICATE`.
The pointer survives as `// See docs/DESIGN.md §"Matching"`. If §Matching states nothing about this
code, the row is `WRONG` and cut: the pointer was dangling.

## 10. Facts that split across routes

```ts
// Only verified accounts may post (rule for every write path).
// The `verified_at` null-check below is what enforces it here.
if (account.verified_at) {
```

First fact is a rule every write path must obey: route `DOC`. Second is local:
route `COMMENT`. The anchor gets two answers rows, and the file gets a pointer
and a one-line reason above the same `if`.

## 11. Reason one hop away, inside the callee's body

```ts
// Uses stableStringify, not JSON.stringify: the cache key must not change with
// property order, and the gateway returns fields in arrival order.
export function cacheKey(req: Request): string
```

`stableStringify`'s signature says `(value: unknown) => string`. The reason it
is used here sits in its body and in the gateway, not at its signature, so the
fact is not `DERIVABLE`. `KEEP`, interface form: `Key is independent of
property order; the gateway returns fields in arrival order.` Cutting it would
leave the export with no description because the reason is "just one import
away"; that hop is exactly what the comment saves the reader.

## 12. Truth cannot be established

```ts
// The gateway rejects amounts above 50 000 in one call.
const chunks = splitAmount(total, 50_000);
```

No test pins the limit, no doc names it, and the gateway is outside the
repository. The fact fires no flag, and `truth` is `unknown`: `KEEP?`. The
answers row carries the original words unchanged; nothing is reworded, since a
reworded guess reads like a verified fact. The verifier marks the line
`UNVERIFIABLE`; the fix loop leaves it because the anchor is `KEEP?`, and the
report lists `file:line` with the words, for the human who can ask the gateway.

## 13. Misleading: true words, wrong reader

```ts
// Sorted so the newest entry wins.
const byDate = [...rows].sort((a, b) => a.date - b.date);
```

The sort is ascending and a later `find` takes the *first* match, so the oldest
entry wins. The comment does not say "descending", so `WRONG` does not fire on
its words. The sighted reader wrote "newest wins"; the truth is "oldest wins".
`MISLEADING`: the comment produced the wrong belief. Cut. The corrected fact is
then judged on its own, as in example 8, and here earns `KEEP`: `// ascending
because find() takes the first hit: the oldest entry wins`.

## 14. Blind reader confirms, or discovers

```ts
// retry once
const res = await fetchWithRetry(url, 1);
```

`RESTATES` cuts the only fact. The blind reader, given the stripped copy, wrote
"retries once because the upstream is flaky" and the truth is "retries once
because a second failure must surface to the caller within the SLA". Every fact
is cut and the blind reader is wrong: the reason was never written. One row is
added, `fact` = `missing: reason`, `KEEP`, body form: `// one retry because the
SLA caps this call at two attempts: a third would time out the request`.

Had the blind reader answered correctly, nothing would change: the anchor stays
`CUT`, and a reader who worked it out is not a reason to keep a restatement.

## 15. Provenance is history, the fact is not

```ts
// Confirmed by the client twice: ticket T-113 AC4 and the 2026-08-26 call,
// minuted as consensus. A negative quantity is a sell.
{ bank: "ACME", quantity: "signed", status: "calibrated" }
```

Two facts. "A negative quantity is a sell" is judged on its own: true, not
derivable from `"signed"`, `KEEP`. "Confirmed by the client twice, T-113 and
the 2026-08-26 call" names where the fact came from: `HISTORY`, cut. The
decision record already exists as an ADR, so it is the kept fact's `source`; the code shows the fact, and the record is one pointer
away for whoever needs to know who decided.

## 16. Long text at the code is a doc section

```ts
// The row count argues the opposite of the truth: 20 of this bank's 103 trade
// rows are quantity-only, which by count clears the bar for `unsigned`. But all
// 20 sit in one run of one statement whose sibling run scores zero, as do the
// bank's other eleven runs. A print style cannot change between two runs of the
// same PDF, so those 20 are a sign column the model lost. Registering
// `unsigned` would hide that defect for the whole bank.
{ bank: "BIGBANK" /* keeps the default */ },
```

Every fact is true and none is derivable. It is a trap, and it is six lines.
Route `DOC`: the write-up goes under its section in `docs/CODING_STANDARDS.md`
with the wrong shape, the right shape and the consequence; the code gets
`// See docs/CODING_STANDARDS.md §"<heading>"`. Kept at the code it would be the
one paragraph a reader skips, and the rule it states binds every bank, not this
row.
