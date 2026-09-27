# Where cleanup keeps its state and which files it skips

Type: grilling
Status: resolved
Assignee: Efte

## Question

Stacked continuous-mode PRs all edit `.agents/refactor-paths.txt` and conflict. Fast steps pick files without checking open branches, so a comment pass on a hot file breaks them. Decide where the path list's progress lives and which files a step skips.

## Answer

Grilled with the owner on 2026-09-27.

**State: write-once list plus one done file per PR.**
- `cleanup` §1 writes `refactor-paths.txt` once. Nobody edits it after.
- Each cleanup PR adds its own `.agents/refactor-done/<branch>.txt` with the files it covered.
- Files left = the list minus every done file. Works on both trackers. `refactor-phase.sh` needs no `gh`.
- The phase end deletes the list and the folder.

Rejected: the list in the parent issue (GitHub caps a body at 65,536 characters, a 3,000-file repo needs about 120k; needs `gh` in the hook and a second path for local trackers); keep the shared file (conflicts stay); batch pointers in the file (continuous mode cuts across batches, conflicts return); a PR pointer per path line (every PR edits the shared file).

**Open branches**:
- A fast step reads the files of every open PR (`gh pr list --json files`) and skips them. They stay for a later step.
- Continuous mode: unchanged, it cleans only its own logic PR's files.
- Unpushed local branches stay invisible. Accepted: the preflight push gate asks for pushes.
- Only held files left → the step lists them with their PRs and asks: wait, or clean anyway.
- Local tracker without `gh`: no check, one warning.

**"Review the calls made while building agent-ready:cleanup"** (agent-ready #46) stays open, outside this map. Points 1 (cap, now 10), 2 (over-cap files stay listed) and 3 (setup writes the `env` the fallback reads) are settled; 4–8 are cleanup internals. One comment on #46 says so.
