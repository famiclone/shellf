# Shellf — Self-hosted video game catalog

Self-hosted web app for cataloging a physical video game collection: ROM dumps, box art, manual scans, purchase metadata, in-browser emulator, IPS/BPS patches, and ScreenScraper integration.

## Features

- Catalog games by platform (Famicom, NES, SNES, GBA, etc.)
- ROM upload with automatic CRC/MD5/SHA1 hashing
- Box photos and manual scans (PDF/images)
- Purchase price, condition, region, notes
- Play in the browser via EmulatorJS
- ROM hacks: upload IPS/BPS patches, apply on demand
- ScreenScraper: descriptions and covers by ROM hash
- Docker Compose for self-hosted deploy

## Prerequisites

- [Bun](https://bun.sh) (package manager and runtime)
- (Optional) Docker + Docker Compose for production
- (Optional) `htpasswd` (from `apache2-utils` / `httpd-tools`) for Docker auth

## Quick start (development)

```bash
# Install dependencies
bun install

# Configure environment
cp .env.example .env

# Run migrations and seed platforms
bun run db:migrate
bun run db:seed

# (Optional) Download EmulatorJS for in-browser play
bun run setup:emulator

# Start frontend + backend
bun run dev
```

Then open:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3100

`bun run dev` also runs the emulator setup automatically if needed.

## Docker (production)

```bash
# Create htpasswd (login/password for nginx)
htpasswd -c nginx/.htpasswd admin

# Build and start
docker compose up --build -d
```

Open http://localhost:8180

Default credentials are `shellf` / `shellf` — change them before exposing the service.

## ScreenScraper

Get developer credentials at https://www.screenscraper.fr, then configure them either:

1. **In the UI** — Settings → Scraper (stored in the database), or
2. **Via `.env`** (fallback if UI values are empty):

```
SCREENSCRAPER_DEV_ID=your_id
SCREENSCRAPER_DEV_PASSWORD=your_password
```

## Data layout

All files are stored under `./data/`:

```
data/
├── shellf.db          # SQLite database
├── roms/              # ROM files
├── media/             # Box photos, manuals
├── patches/           # IPS/BPS patches
└── cache/patched/     # Patched ROM cache
```

## Stack

- Bun + Turbo monorepo
- Hono + Drizzle ORM + SQLite
- React 19 + Vite + TanStack Query
- EmulatorJS
- Nginx + Docker Compose
