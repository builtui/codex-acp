# Repository Guidelines

## Project Structure

- `src/` — ACP server implementation. Entry point: `src/index.ts`.
- `src/__tests__/` — Vitest suite (behavior-focused tests around ACP/Codex events).
- `src/app-server/` — generated Codex app-server API types (regenerate via `npm run generate-types`).
- `dist/bin/` — release-ready single-file executables and `*.zip` archives.
- `.github/workflows/fork-ci.yml` — bounded, read-only PR verification for this fork.
- `scripts/` — release tooling (`release-preflight.sh`, `next-preview-version.mjs`), kept outside `src/` so it stays out of `tsc`'s `rootDir` and the published tarball; its tests sit next to it as `*.test.mjs`.

## Coding Style & Naming Conventions

- Keep edits consistent with existing formatting.
- When adding env/config knobs, document them in `readme-dev.md`.
- When updating discriminated-union/event `switch` statements, do not add a trailing fallback like `return null` only to satisfy TypeScript.
- Handle each variant with an explicit `case`; if intentionally ignored, use an explicit no-op case.

## Testing Guidelines

- Tests live under `src/__tests__/` and use Vitest.
- Favor event-driven assertions (see `src/__tests__/CodexACPAgent/*`).
- Prefer snapshot-based tests using `toMatchFileSnapshot()` over inline assertions.
- When snapshot response data drifts, prefer replacing that response payload with a stable placeholder over asserting fragile fields (except for 'model/list').
- Focus on behavior and outputs rather than implementation details.
- Use `/run-codex` skill (`.claude/skills/run-codex/`) to test with real Codex and observe actual events.

## Pull Requests

- Use a conventional commit title for reviewable fork changes. Titles do not trigger a release in this fork.

## Fork release boundary

- This fork does not publish to npm, tag releases, dispatch registry updates, or run scheduled Codex updates. Its inherited workflows for those actions were removed before enabling fork PR checks.
- `release/codex-acp-1.13.0-builtui.1.tgz` is an owned, commit-addressed package artifact for Intent. Rebuild it together with `dist/index.js` when adapter source changes; the PR check compares both artifacts.
- Reintroducing any publishing or update automation requires a separate fork-owned review of destinations, credentials, and package identity.

## Docs

- Codex app-server usage: see https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md when touching protocol/transport details, adding or consuming JSON-RPC methods, handling approvals/turn events, or updating generated schema/clients.
- App-server events: prefer `thread/*`, `turn/*`, and `item/*` event surfaces; avoid the deprecated `codex/event/*` API (planned removal). Keep implementations aligned with generated types in `src/app-server` (including `v2` exports).
