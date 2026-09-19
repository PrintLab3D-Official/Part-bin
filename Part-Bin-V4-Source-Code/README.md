# Parts Bin V4 Source Code

Full source for Parts Bin V4, the desktop app.

## Structure

- `v4-app/` — the web frontend. HTML, CSS and JS, the actual UI of the app.
- `tauri/src-tauri/` — the Rust and Tauri wrapper that turns the frontend into a Windows desktop app, plus the installer assets.

These two folders were originally siblings in one project folder. They're split apart here for browsing. If you want to build it yourself, pull both folders out and put `src-tauri` next to `web` and the rest of `v4-app`'s contents in one folder first, matching the layout the config expects.

## Building

1. Install Node.js and Rust
2. `npm install` in the project root
3. `npm run tauri build`

The installer lands in `src-tauri/target/release/bundle/nsis/`.

## Data and privacy

Everything is stored locally in `%LOCALAPPDATA%\com.printlab3d.partsbin`. Nothing is uploaded. The app only goes online when you use a Buy link, the assistant, or Auto-fill on a part.
