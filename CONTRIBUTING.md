# Contributing to Safely

Thanks for your interest in Safely! This document explains how to propose changes.

Found a security problem? **Do not open an issue** — follow [SECURITY.md](SECURITY.md) instead.

## Before you start

- For anything larger than a small fix, open an issue first so we can agree on the approach before
  you spend time on it.
- Changes to the sync protocol or the synced state format must start from the specs:
  [`packages/sync/doc/spec.md`](packages/sync/doc/spec.md) and
  [`packages/slottree/docs/spec.md`](packages/slottree/docs/spec.md). Update the spec in the same
  pull request.
- [`CLAUDE.md`](CLAUDE.md) and [`.claude/rules/`](.claude/rules) describe the repository layout,
  architecture rules and conventions. They are written for AI assistants but are the most complete
  guide for humans too.

## Development setup

See [README.md](README.md) for prerequisites and how to run the apps.

## Making a change

1. Fork the repository and create a branch from `master`.
2. Keep the change focused: one logical change per pull request.
3. Before pushing, run the checks CI runs:

    ```bash
    pnpm -r run compile
    pnpm --filter <package> run lint
    pnpm --filter <package> run test
    ```

    If you changed a native module under `apps/mobile/modules/` that has Swift/Kotlin host tests,
    run them too (see [`.claude/rules/mobile-app.md`](.claude/rules/mobile-app.md)).

4. Open a pull request against `master` and fill in the template.

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):
`feat(mobile): …`, `fix(sync): …`, `chore: …`, `test: …`.

## License

By contributing, you agree that your contributions are licensed under the
[Apache License 2.0](LICENSE), the same license that covers the project.
