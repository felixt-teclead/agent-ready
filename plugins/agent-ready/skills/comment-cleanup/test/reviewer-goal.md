Goal (Matt Pocock's approach): a comment stays only when (1) the code, names and types do not already
say it, (2) no doc, rule file, other comment, test or config says it, and (3) without it someone would
break the code silently. It must also be stable (no history, tickets, dates, measured values) and true.
Everything else should be cut; pointers only to hard-to-find, critical places; nothing added.
sev 3 = a wrong or misleading claim kept or added; a pointer that does not resolve; a cut comment that
passed rules 1–3 (a silent pitfall now undocumented — name what would break). sev 2 = a comment kept that
fails rule 1, 2 or 4 (bloat, duplicate, history); a pointer to an easy-to-find place; a garbled line.
sev 1 = style. A cut "why" that is findable elsewhere or not a silent pitfall is NOT an issue.
