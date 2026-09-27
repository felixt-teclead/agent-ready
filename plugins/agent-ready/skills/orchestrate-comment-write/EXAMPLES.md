# Worked examples

A tag, its rung, and the block that follows. The code is invented and the doc
is `docs/DESIGN.md`; substitute the repository's own.

## 1. `NAME`

```ts
const d = items.filter((i) => i.t > cutoff);
```

Tag: *what are `d` and `t`? I would invert the test.* `t` is a due timestamp
and `d` is the due set, not the deleted one.

`NAME`, file-local. Step 5 renames `d → due, t → dueAt`. A comment saying "d is
the due set" is a name written in the wrong syntax.

## 2. `TYPE`

```ts
const fee = base * 0.019 + 35;
```

Tag: *euros or cents? I would divide by 100.* Both are minor units.

`TYPE`, if `base` is declared in this file: `base: Cents`, `35 as Cents`.
Once the type says it, a comment has nothing left to add.

If `base` is a parameter of an exported function, the brand would ripple into
every caller. Then it is `WRITE`, one line at the parameter: `// Cents.`

## 3. `DROP` — the anchor says it

```ts
retries++;
```

No wrong edit, so it was never a tag. If it got in, strike every word readable
from the anchor and nothing is left.

## 4. `DROP` — nameable convention

```ts
export async function GET(req: NextRequest): Promise<Response>
```

Interface slot: failure behaviour is unstated. The answer is the framework's
documented default — a throw becomes a 500 — and the code follows it.

`DROP`. Nameable, and it would not move when the framework does. Where the
handler *departs* from the default, the same slot is `WRITE`.

## 5. `UNSURE`

```ts
const chunks = splitAmount(total, 50_000);
```

Tag: *why 50 000?* No test pins it, no doc names it, the gateway is outside the
repository.

`UNSURE`. Nothing is written. The block goes to the report with the question.

## 6. `DOC?` — the answer lives in a doc

```ts
const hold = placeHold(order);
```

Tag: *why no capture? I would call `capture()`.* Nothing in the file or its
tests says why; this smells like a rule other files obey.

```
src/checkout.ts:18  const hold = placeHold(order);
  Q  why no capture? I would call capture().
  →  DOC?  Orders are held, never captured, until settlement confirms.
```

Returned. Whoever holds the docs finds §Payments already states the rule, so
the anchor gets `See docs/DESIGN.md §"Payments"` and nothing enters the doc.
If §Payments said nothing, the sentence from the block goes into the section
and the anchor still gets only the pointer.

## 7. `WRITE` — a value

```ts
const key = stableStringify(req.body);
```

Tag: *why not `JSON.stringify`? I would swap it.* Local, one fact, established
in the test.

```
src/cache.ts:4  const key = stableStringify(req.body);
  Q  why not JSON.stringify? I would swap it.
  →  WRITE  tests/cache.test.ts:41
     Gateway field order varies per request.
```

The constraint, not the code's answer to it. "Stable stringify keeps the cache
key stable" dies when the line is rewritten; the gateway's behaviour does not.
The wrong edit from the tag never enters the comment.

## 8. `WRITE` — a block

```ts
for (const row of rows) {
  if (row.parent && !seen.has(row.parent)) { pending.push(row); continue; }
  seen.add(row.id);
  out.push(row);
}
while (pending.length) { /* … 12 lines … */ }
```

Tag: *what do these two loops do together?* Nineteen lines, and reading them
is the only way to learn it. No wrong edit; the size rule admits it.

```
src/tree.ts:22  for (const row of rows) {
  Q  block, 19 lines: what do the two loops accomplish?
  →  WRITE  src/tree.ts:22-40
     Emit rows in parent-before-child order.
```

A verb phrase at the level of intent, above the first loop. If the pair were
self-contained, `NAME` wins: extract `orderParentsFirst(rows)` and the comment
becomes the name.

## 9. Interface slot that is obvious and still a slot

```ts
export function listOpenPositions(): Position[]
```

Ordering and ownership are unstated. "Obviously insertion order" is not
something a caller can rely on, and no rung cuts an interface fact for being
unsurprising.

```
src/positions.ts:31  export function listOpenPositions(): Position[]
  Q  iface: ordering, ownership
  →  WRITE  store.ts:140
     /**
      * Ordered by open date, oldest first.
      * The array is a copy; mutating it does not affect the store.
      */
```

Two slots, two plain statements. An export gets a `/** */` block, so editors
show the contract on hover.

# Do and don't, cited

From John Ousterhout, *A Philosophy of Software Design* (2nd ed., 2021),
chapters 4 and 13. Most book examples come from the RAMCloud codebase
(`github.com/PlatformLab/RAMCloud`). Confidence per entry: **verbatim** (found
quoted), **source** (read in RAMCloud, wording close to the book), or
**paraphrased** (from summaries only; check the book before citing exactly).

## Block summary

**Do** — a higher-level statement of what the block accomplishes, so the reader
can skip the body. Ch. 13, "Higher-level comments enhance intuition". RAMCloud
`IndexLookup.cc`, `isReady()`, **source**:

```cpp
// Rule 5:
// Try to assign the current key hash to an existing RPC corresponding
// to the server that the request for this key hash should be sent to.
```

The body below is a dozen lines of session and state checks. The comment names
the goal and none of the checks. Our lens: block, question one. Our form: a
verb phrase at the level of intent.

**Don't** — a comment at the same level of detail as the code. Ch. 13, red
flag "Comment repeats code", **verbatim**:

```java
// Add a horizontal scroll bar
hScrollBar = new JScrollBar(scrollBar, HORIZONTAL);
add(hScrollBar, BorderLayout.SOUTH);
```

The book's test: could someone who has never seen the code write this comment
from the code next to it? Yes, so it adds nothing. Our test 4.

**Don't** — a summary that narrates the mechanics instead of the goal. Ch. 13,
**paraphrased**: the book contrasts a long low-level comment naming the
specific RPC, session and state being checked with the Rule 5 rewrite above.
The low-level version is longer than the code and dies with the first
refactor. Our test 1.

## Precision

**Do** — say exactly which one. Ch. 13, "Lower-level comments add precision".
RAMCloud `IndexLookup.h`, **source**:

```cpp
/// Offset of the first object in resp buffer that the client
/// has not yet processed.
uint32_t offset;
```

**Don't** — the same field with a vague comment, **paraphrased** from the book:
`// Current offset in resp Buffer`. "Current" has no referent; the reader
still has to find where the offset moves. Our lens: value; a name that carried
it (`firstUnprocessedOffset`) would be `NAME`, else `WRITE` with the precise
sentence.

## Interface

**Do** — complete: units, the partial case, the zero case. Ch. 4 and 13,
"Interface comments". RAMCloud `Buffer.cc`, **verbatim**:

```cpp
/**
 * Copy a range of bytes from a buffer to an external location.
 *
 * \param offset
 *      Index within the buffer of the first byte to copy.
 * \param length
 *      Number of bytes to copy.
 * \param dest
 *      Where to copy the bytes: must have room for at least length bytes.
 *
 * \return
 *      The return value is the actual number of bytes copied, which may be
 *      less than length if the requested range of bytes exceeds the length
 *      of the buffer. 0 is returned if there is no overlap between the
 *      requested range and the actual buffer.
 */
uint32_t Buffer::copy(uint32_t offset, uint32_t length, void* dest)
```

Every slot our interface lens lists that applies is filled: precondition on
`dest`, the short-copy case, the zero case. Nothing about how the copy is done.

**Don't** — implementation leaking into the interface. Ch. 13, red flag
"Implementation documentation contaminates interface". RAMCloud
`IndexLookup.cc`, **verbatim**:

```cpp
/**
 * This method returns an indication of whether the read
 * has made enough progress that getNext() can return immediately
 * without blocking. In addition, this method does most of the
 * real work for indexed reads, so it must be invoked (either
 * directly or indirectly by calling getNext()) in order for the
 * read to make progress.
 */
bool IndexLookup::isReady()
```

The first sentence is the contract. The second tells the caller how the class
is built inside, which the caller cannot use and which changes when the class
does. Our test 3, at interface scope.

**Don't** — an interface comment that restates the name. Ch. 13,
**paraphrased**: `getNormalizedResourceNames` documented as "obtain a
normalized resource name from REQ", which leaves "normalized" undefined and
the return shape unstated. Our interface lens: purpose and ordering slots
still open.

## Names

Ch. 14, **paraphrased**: `blinkStatus` for a boolean is ambiguous, `cursorVisible`
is not; `fileBlock` and `diskBlock` distinguish two numberings that a bare
`block` would merge. A name that removes the question is our `NAME` rung; the
book adds that a good name reduces the need for a comment and never removes
it at an interface.
