# Safely wallet

## Prerequisites

- **Node 24.10.0** — `nvm install` in the project root picks up the version from `.nvmrc` (`brew install nvm` if you don't have it)
- **pnpm ≥ 10** — `brew install pnpm`; the exact version is resolved automatically from the `packageManager` field in `package.json`

## Getting started

In project root:

1. `nvm use`
2. `pnpm i`

## Mobile (`apps/mobile`, Expo dev-client)

Extra tooling on top of the prerequisites:

- **iOS**: full Xcode from the App Store, then `sudo xcodebuild -runFirstLaunch`, `brew install cocoapods watchman`
- **Android**: Android Studio with SDK + emulator, `ANDROID_HOME=$HOME/Library/Android/sdk`

```bash
pnpm --filter mobile ios       # build dev client & run in iOS simulator
pnpm --filter mobile android   # build dev client & run in Android emulator
pnpm --filter mobile start     # start dev server (dev client already installed)
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). Report security
issues privately as described in [SECURITY.md](SECURITY.md).

## License

[Apache License 2.0](LICENSE)
