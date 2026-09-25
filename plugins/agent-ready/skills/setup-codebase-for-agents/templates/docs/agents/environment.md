# Environment for AFK runs

What the `check` script and an AFK run need that the repo cannot tell you. Runtime and package manager are not here: the lockfile says them.

## Env vars

<name — where its value comes from>

## Services the checks need

<service — how it starts, or "none">

## Network egress the checks need

<host — why, or "none">

## Token scopes

An AFK run that opens a pull request needs: Issues read and write, Contents read and write, Pull requests read and write, Metadata read.
