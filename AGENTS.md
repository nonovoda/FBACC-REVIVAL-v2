# AGENTS.md

## Development Rules
- Follow `docs/ROADMAP.md`.
- Follow `docs/UI_STYLE_GUIDE.md`.
- Use modular architecture only.
- Do not create giant procedural files.
- Do not use inline spaghetti styles.
- Use reusable UI components.
- Keep bookmarklet-compatible architecture.
- All UI text must be in Russian.
- Do not silently change business logic.

## Process Rules
- Before implementation:
  - create implementation plan;
  - explain affected modules.
- After implementation:
  - summarize changed files;
  - summarize risks;
  - summarize how to test.

## Build/Release Rules
- Never edit `dist` manually.
- Build artifacts must be generated automatically.
- No dangerous/destructive actions by default.
- No hidden requests.
- No external servers.
- No packed/compressed source architecture.
