# Test Layout

The test suite is organized by concern so readers can find coverage quickly.

- `tests/unit/utils/` contains pure utility and export-pipeline tests.
- `tests/unit/components/` contains component-level tests.
- `tests/unit/tauri/` contains Tauri bridge and runtime integration tests.
- `tests/mocks/` contains shared test doubles used by Vitest aliases.

When adding a new test, prefer the closest behavioral folder instead of placing it at the root.