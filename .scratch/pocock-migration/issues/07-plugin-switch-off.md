# What the repo keeps so the plugin can be switched off

Type: grilling
Status: open

## Question

Once setup and migration are done, the user must be able to switch the `agent-ready` plugin off and keep a working repo. Decide what the plugin copies into the repo for that: skills (Pocock's and the plugin's own), hooks, settings. The PR hook is planned for `plugins/agent-ready/hooks/`, which stops working when the plugin is off. Decide where it lives instead, and how copies stay current (`fetch.sh` manifest or something else).
