# Map My Panel - Quick Start Guide

Get your electrical panel mapping app up and running in minutes.

## Prerequisites

Before you start, make sure you have:
- **Node.js** (v18 or newer) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)

Check if you have them installed:
```bash
node --version  # Should show v18.x.x or higher
npm --version   # Should show 9.x.x or higher
```

## First Time Setup

### 1. Navigate to the project directory
```bash
cd /Users/broman/Documents/Programming/map-my-panel
```

### 2. Install dependencies
```bash
npm install
```

This will:
- Install all JavaScript packages
- Rebuild native modules (like better-sqlite3) for Electron
- Takes about 1-2 minutes

### 3. Start the development server
```bash
npm run dev
```

This command:
- Builds the Electron main process
- Builds the preload script
- Starts the Vite dev server for the React UI
- Launches the Electron app window
- Enables hot module reload (changes update automatically)

**The app window should open automatically!**

## Daily Usage

Every time you want to run the app:

```bash
cd /Users/broman/Documents/Programming/map-my-panel
npm run dev
```

## How to Restart the App

If you need to restart (for database migrations, major changes, etc.):

1. **Stop the app**: Press `Ctrl+C` in the terminal
2. **Start again**: Run `npm run dev`

## Database Location

Your panel data is stored in an SQLite database at:
```
~/Library/Application Support/map-my-panel/map-my-panel.db
```

**Note:** The database is created automatically on first run.

## Troubleshooting

### "Module not found" or "Cannot find module"
```bash
npm install
```

### "better-sqlite3" errors
```bash
npm run postinstall
# or
npx electron-rebuild -f -w better-sqlite3
```

### Port 5173 already in use
Kill the old process:
```bash
lsof -ti:5173 | xargs kill -9
npm run dev
```

### App won't start after code changes
Try a full restart:
```bash
# Stop the app (Ctrl+C)
rm -rf out/
npm run dev
```

### Database migrations not running
Migrations run automatically when the app starts. Check the terminal output for:
```
Running migration: 003_add_is_powered
Migration 003_add_is_powered completed
```

## Building for Production

To create a distributable app:

```bash
npm run build
```

This creates a packaged app in the `dist/` folder.

## Project Structure

```
map-my-panel/
├── src/
│   ├── main/          # Electron main process (Node.js)
│   ├── preload/       # Preload script (IPC bridge)
│   ├── renderer/      # React UI
│   └── shared/        # Shared types
├── out/               # Built files (generated)
└── dist/              # Production builds (generated)
```

## Available Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run postinstall  # Rebuild native modules
```

## Getting Help

- Check the terminal output for errors
- Migrations are logged on startup
- Hot reload updates show in terminal: `[vite] hmr update /components/...`

---

**Ready to map your panel!** 🔌
