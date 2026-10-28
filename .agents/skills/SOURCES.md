# Installed project skills

Installed from GitHub on 2026-10-28. Skill directories include upstream companion files. Repositories may evolve; installed files are local copies, not auto-updating dependencies.

| Skill | Upstream | Source path | Branch |
| --- | --- | --- | --- |
| Ponytail | https://github.com/DietrichGebert/ponytail | skills/ponytail | main |
| Graphify | https://github.com/Graphify-Labs/graphify | graphify/skill-codex.md and graphify/skills/agents/references | v8 |
| UI/UX Pro Max | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | .claude/skills/ui-ux-pro-max | main |
| Impeccable | https://github.com/pbakaus/impeccable | .agents/skills/impeccable | main |
| Taste | https://github.com/Leonxlnx/taste-skill | skills/taste-skill | main |

Graphify's standalone `skill-codex.md` is installed as `graphify/SKILL.md`. Its execution runtime (`graphifyy`) is a separate dependency to install locally when needed. UI/UX Pro Max's Python search uses its bundled data and needs no external Python dependencies. Impeccable may download its binary on first use. Taste's browser inspection has its own Node/browser requirements described in its SKILL.md.

All five skills are required for applicable work by the project-root AGENTS.md. They become discoverable on the next Codex turn. No application files existed at installation time, so no application UI or architecture checks could be run.
