# Changelog

All notable changes to Map My Panel are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/).

## [0.1.0] — 2026-05-27

First public release. The app is feature-complete for documenting residential electrical panels and ready for friends-and-family use.

### Features

- **Multi-property support** — track multiple homes/buildings in one install
- **Panel + breaker grid** — visual breaker panel layout matching real-world numbering
- **Tandem breaker support** — base positions, container flags, expandable views
- **Entities** — items, events, outlets that map to breakers (with linking across breakers)
- **Custom entity types** — define your own beyond the defaults
- **Theming** — light and dark mode with semantic color tokens
- **Search** — intelligent entity search with relevance scoring
- **Backup & restore** — full database export/import as JSON
- **PDF export** — generate a printable summary of a panel
- **Cross-machine portability** — export from one machine, import on another

### Distribution

- macOS `.dmg` installers attached to this release (separate arm64 and x64 builds)
- Windows `.exe` installer planned for v0.1.1
- App is unsigned for v0.1.x — see README for how to bypass Gatekeeper warnings on first launch

### Known limitations

- macOS only for v0.1.0; Windows coming in v0.1.1
- No cloud sync — moving data between machines is manual (export JSON → import JSON)
- Installers are unsigned; signing is on the roadmap once usage justifies the cost
- Linux build not yet provided
