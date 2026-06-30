# AGENTS.md

## Cursor Cloud specific instructions

This repo is a **Flutter** web/mobile app: a French football quiz ("Quiz El Clásico"). It is fully client-side (no backend, no database, no network, all quiz data hardcoded).

### Environment
- The Flutter SDK (bundles Dart) is installed at `/opt/flutter` and is on `PATH` via `~/.bashrc`. If `flutter` is not found in a fresh non-login shell, use the full path `/opt/flutter/bin/flutter`.
- The startup update script runs `flutter pub get` (guarded on `pubspec.yaml` existing).

### Entry point (non-obvious)
- The application source lives in **`main.dart` at the repo root**, NOT in the conventional `lib/main.dart`. The project scaffolding (`pubspec.yaml`, `web/`, `analysis_options.yaml`) was generated around it.
- Therefore you must pass the target explicitly when running: `-t main.dart`. A bare `flutter run` would look for `lib/main.dart` and fail.

### Common commands (run from repo root)
- Lint / static analysis: `flutter analyze`
- Tests: none exist in this repo (`flutter test` reports "Test directory not found").
- Run dev server (web): `flutter run -d web-server --web-hostname 0.0.0.0 --web-port 8080 -t main.dart` then open `http://localhost:8080/`.
- Run directly in Chrome: set `CHROME_EXECUTABLE=/usr/local/bin/google-chrome` and use `flutter run -d chrome -t main.dart`.

### Gotchas
- On first paint of the web debug build, an answer-button glyph (e.g. "8" or "Xavi") may momentarily render blank/clipped. This is a transient Flutter-web font-loading artifact, not a code bug; quiz scoring is unaffected.
