# Новая синагога, Калининград

Сайт синагоги Калининграда (ул. Октябрьская, 1а): жизнь общины и раздел для туристов, расписание молитв по еврейскому календарю, новости из Telegram-канала общины, пожертвования, заявки и админка редактора. Языки — русский, English, עברית.

**Демо:** https://aragam113.github.io/klg-synagogue/ — статическая версия со снимком данных (формы, оплата и админка в демо отключены).

## Стек

- `backend/` — NestJS 11, TypeORM, PostgreSQL 17
- `frontend/` — Expo 54 (web), expo-router, RTK Query, i18next

## Запуск локально

```bash
# backend (нужен PostgreSQL; переменные — backend/.env.example)
cd backend && npm install && npm run start:dev      # http://localhost:3000/api/v1, Swagger /docs
npm run seed                                          # стартовое наполнение
npm run import:telegram -- --since 2026-08-01         # новости из канала

# frontend
cd frontend && npm install && npx expo start --web    # http://localhost:8081
```

Демо-сборка для GitHub Pages: `cd frontend && npm run demo:snapshot && npm run build:demo` (публикуется workflow `.github/workflows/pages.yml`).

## Наполнение

Факты о синагоге взяты из открытых источников, у каждого — комментарий `src:` со ссылкой. Неизвестные данные помечены на сайте видимой заглушкой `[ВПИШИ: …]` и заполняются в админке («Настройки») или в `frontend/src/config/site.ts`. Фото — Wikimedia Commons со свободными лицензиями (авторы — `frontend/public/media/CREDITS.md`, `backend/seed-assets/photos/_sources.txt`). Кадры scroll-сцены — временная заглушка; заменить своим видео: `cd frontend && npm run build:scrub -- путь/к/видео.mp4`.
