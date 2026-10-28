# Project skills

Use the installed skills in `.agents/skills` for all relevant project work. Read each applicable `SKILL.md` before acting and follow its referenced workflow. These are project requirements, not optional suggestions.

- **Ponytail** — `.agents/skills/ponytail/SKILL.md`: apply to coding, fixes, refactoring, dependency choices, and code review. Prefer the smallest complete solution and verify changed behavior.
- **Graphify** — `.agents/skills/graphify/SKILL.md`: apply to architecture, codebase relationships, impact analysis, and knowledge graph requests. Read and query an existing `graphify-out` graph before broad exploration; refresh it when relevant source changes make it stale. Install the `graphifyy` runtime in a project-local environment when graph execution is first needed. Adapt shell examples to PowerShell. Do not build a graph of an empty project or of the vendored skills themselves.
- **UI/UX Pro Max** — `.agents/skills/ui-ux-pro-max/SKILL.md`: use for UI structure, interaction, accessibility, responsive behavior, and design-system choices. Run its search script at `.agents/skills/ui-ux-pro-max/scripts/search.py`; replace upstream Claude plugin paths with this project-local path.
- **Taste** (`design-taste-frontend`) — `.agents/skills/taste-skill/SKILL.md`: use for visual direction and frontend implementation or review. Use its bundled references, library, and inspection tools as applicable.
- **Impeccable** — `.agents/skills/impeccable/SKILL.md`: use for frontend craft, critique, polish, accessibility, responsive checks, and UI states. Use its Windows `.cmd` launcher when needed and follow its documented fallback if unavailable.

For UI work, use UI/UX Pro Max to inform usability and system decisions, Taste to establish a coherent visual direction, and Impeccable to implement and review the craft. Integrate their guidance into one design rather than mixing conflicting styles. The user's brief, existing approved brand, accessibility, and functional correctness take precedence over aesthetic presets. Ponytail keeps implementation focused without omitting required verification.

State the applicable skills briefly when starting work. Report checks actually performed and any unavailable tools. Do not claim a skill check passed without running it. Installation does not authorize publishing, external messaging, or unrelated machine configuration changes.
