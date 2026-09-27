# 09: Move a repo off the plugin

**What to build:** `update-codebase-for-agents` gets a step "move this repo off the plugin": run `fetch.sh`, wire hooks and switches into `.claude/settings.json`, then disable the plugin. Runs any time; setup and migration point to it. It is the exception to the "no manifest → stop" guard. Decision: [What the repo keeps so the plugin can be switched off](../../pocock-migration/issues/07-plugin-switch-off.md).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A plugin repo can run the step and ends with working hooks without the plugin
- [ ] Switch values carry over from plugin config to `env`
- [ ] Guard allows this step without a manifest
