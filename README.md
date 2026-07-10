# Shellf — Self-hosted каталог відеоігор

Self-hosted веб-сервіс для каталогізації фізичної колекції відеоігор: ROM-дампи, фото боксів, скани мануалів, метадані покупки, емулятор у браузері, IPS/BPS патчі та інтеграція з ScreenScraper.

## Можливості

- Каталог ігор по платформах (Famicom, NES, SNES, GBA тощо)
- Завантаження ROM з автоматичним обчисленням CRC/MD5/SHA1
- Фото боксу та скани мануалу (PDF/зображення)
- Ціна покупки, стан, регіон, нотатки
- Гра в браузері через EmulatorJS
- ROM-хаки: завантаження IPS/BPS патчів, застосування on-demand
- ScreenScraper: опис та обкладинки за хешем ROM
- Docker Compose для self-hosted деплою

## Швидкий старт (розробка)

```bash
# Встановити залежності
bun install

# Налаштувати env
cp .env.example .env

# Міграції та seed платформ
bun run db:migrate
bun run db:seed

# (Опційно) EmulatorJS для гри в браузері
bun run setup:emulator

# Запуск
bun run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## Docker (production)

```bash
# Створити htpasswd (логін/пароль для nginx)
htpasswd -c nginx/.htpasswd admin

# Запуск
docker compose up --build -d
```

Відкрийте http://localhost:8080 (логін за замовчуванням: `shellf` / `shellf` — змініть!)

## ScreenScraper

Отримайте dev credentials на https://www.screenscraper.fr та додайте в `.env`:

```
SCREENSCRAPER_DEV_ID=your_id
SCREENSCRAPER_DEV_PASSWORD=your_password
```

## Структура даних

Всі файли зберігаються в `./data/`:

```
data/
├── shellf.db          # SQLite база
├── roms/              # ROM файли
├── media/             # Фото боксів, мануали
├── patches/           # IPS/BPS патчі
└── cache/patched/     # Кеш патчених ROM
```

## Стек

- Bun + Turbo monorepo
- Hono + Drizzle ORM + SQLite
- React 19 + Vite + TanStack Query
- EmulatorJS
- Nginx + Docker Compose
