# Copilot Instructions for mikewjackson/jackson-house

Purpose
- Help Copilot sessions understand repo structure, build steps, and conventions for editing and generating the static site.

Quick commands
- Install Python deps: python -m pip install -r requirements.txt
- Build site (produces dist/): python .\scripts\build.py
- Serve built site for local review: python -m http.server --directory dist 8000
- Lint CSS: npx stylelint "static/**/*.css" --config stylelint.config.mjs

Tests
- No automated test suite is present in this repository.
- If tests are later added using pytest, run a single test with:
  - pytest path/to/test_file.py::test_name
  - or pytest -k "expression" to run matching tests

High-level architecture
- Purpose: Small static site generator for the Jackson House site.
- Source content: content/ (one JSON file per page). Page JSON keys used by templates: hero, title, team, memberships, reviews, etc.
- Menu data: content/menu.json defines menu panels, groups, dishes, prices, and optional add-ons for templates/menu.html.
- Templates: templates/ (Jinja2). base.html composes head/header/footer and page templates (index.html, menu.html, team.html, membership.html, private-events.html).
- Build: scripts/build.py loads Jinja2 templates, merges page content + site metadata, renders HTML to dist/, and copies static/ files into dist/.
- Static assets: static/ contains CSS, JS, and images referenced by templates and content.
- Output: dist/ (ready to deploy as static site).

Key conventions (repo-specific)
- content/*.json: Each page is a single JSON file. Keys are used directly as template variables. Keep structure consistent with existing files (see content/index.json).
- content/menu.json: Defines the menu panels, groups, items, prices, descriptions, and add-ons rendered on the menu page.
- templates: Use Jinja2 idioms; expect page-level context variables populated by build.py. Prefer changing JSON content over editing templates for copy updates.
- Windows-first commands: README and build steps are written for Windows Terminal; use the project root (D:\jackson-house) when running commands.
- Linting: stylelint.config.mjs is present and stylelint is a devDependency in package.json. Running the npx command above uses that config.

Important files to reference
- README.md — short, practical edit workflow (git pull, edit, python scripts/build.py, validate, commit/push).
- scripts/build.py — the canonical build logic (context assembly, rendering, and static copy).
- templates/ — visual/layout logic (edit templates for structural/markup changes).

AI assistant files checked
- No .github/copilot-instructions.md, CLAUDE.md, .cursorrules, AGENTS.md, or other assistant-specific rule files were found. This file was created to fill that gap.

Notes for Copilot sessions
- Prefer editing content/*.json, especially content/menu.json for menu updates; change templates only for layout/structure.
- When proposing changes that affect rendering, include a local build step (python .\scripts\build.py) and a quick manual check in dist/ or via the local server.

---

If you'd like, I can also add an MCP server configuration (e.g., Playwright) for browser-based checks. Would you like that configured for this project?