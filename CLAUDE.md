<!-- autopilot:start -->
# KlgSynagogue — сайт синагоги Калининграда

Сайт общины и Новой синагоги Калининграда (ru/en/he): расписание по еврейскому календарю, новости, события, формы заявок, пожертвования, раздел для туристов, scroll-сцена здания на главной и админка. Бэкенд — NestJS 11 + TypeORM + PostgreSQL 17 (`backend/`), фронт — Expo 54 web, expo-router, MVVM + RTK Query (`frontend/`).

## Команды

Для Git Bash (инлайн-переменные — синтаксис bash).

| Что | Команда |
|---|---|
| API в dev (:3000, `/api/v1`, Swagger `/docs`, миграции при старте) | `cd backend && npm run start:dev` |
| Web (:8081) | `cd frontend && npx expo start --web --port 8081` |
| Unit бэка | `cd backend && npx jest` |
| E2E бэка (последовательно, своя БД) | `cd backend && TEST_DB_DATABASE=synagogue_test_09 npm run test:e2e` |
| Сборка / линт бэка | `cd backend && npm run build && npm run lint` |
| Unit фронта | `cd frontend && npx jest` |
| Типы / линт фронта | `cd frontend && npm run type-check && npm run lint` |
| Сиды контента (миграции + идемпотентные сиды) | `cd backend && npm run seed` |
| Демо-афиша и демо-сборы (slug `demo-*`, плашка «Пример»; даты от сегодня) | `cd backend && npm run seed:demo` (убрать — `-- --remove`) |
| Всё одной командой: встроенный Postgres `.devdata/pg` (:54329+) + API (:3000+) + web (:8081+) | `npm start` в корне (`npm run reset` — к дампу `dev-data/db.sql`; `README-DEV.md`) |
| Снимок dev-БД и dev-архив | `PG_BIN=<путь к bin PostgreSQL> npm run dev:dump`, затем `npm run dev:archive` → `~/Downloads/klg-synagogue-dev.zip` |
| Импорт новостей из Telegram | `cd backend && npm run import:telegram -- --since 2026-08-01` (`--channel <имя>`, по умолчанию `B_C_Kaliningrad`) |
| Хеш пароля для `ADMIN_USERS` | `cd backend && npm run admin:hash -- <пароль>` |
| Миграции вручную | `cd backend && npm run migration:run` (`migration:revert`) |
| Кадры scroll-сцены (`--film-only --film-crf 28` — «кино по главам» `v/*.mp4`) | `cd frontend && npm run build:scrub -- <видео \| папка фото> [--from s --to s --frames ≤120 --width 1600 --quality 72 --budget 12 --credit "…" --light 1024 --light-step 1 --light-quality 74 --light-budget 5.5 --touch 720 --touch-frames 162 --touch-aspect 0.5625 --touch-quality 72 --touch-budget 5]` (только лёгкий набор — `--light-only`; только портретный набор телефона — `<видео> --from 92 --to 118 --touch-only`) |
| Замеры телефона (демо-сборка: `DEMO_OUT=<папка> npm run build:demo`, `DEMO_DIST=<папка> node scripts/serve-demo.mjs <порт>`) | `cd frontend && WEB_URL=http://localhost:<порт> WEB_PATH=/klg-synagogue/ npm run bench:mobile -- <метка>` (плавность сцены) и `npm run bench:preloader -- <метка>` (время прелоадера); в Git Bash — с `MSYS_NO_PATHCONV=1` |
| Смоуки в Chrome | `cd frontend && npm run smoke` (ещё `smoke:schedule`, `smoke:content`, `smoke:forms`, `smoke:sections`, `smoke:payments`, `smoke:home`, `smoke:admin`, `smoke:mobile`, `smoke:interact`) |

## Структура

```
backend/src/
  main.ts, app.setup.ts          # bootstrap; configureApp — общий конвейер main и e2e (префикс, /media, pipe, interceptor, filter)
  common/localization/           # LocalizedString, localize/localizeFields, LocalizedStringDto
  common/forms/                  # @PublicForm (лимит + honeypot), @IdempotencyKey + createIdempotent
  common/pipes/                  # FieldValidationPipe — машинные ключи ошибок полей
  config/                        # registerAs: app, database, jwt, admin, swagger (+ неподключённые шаблона)
  modules/admin/                 # вход, AdminGuard/@AdminOnly (глобальный модуль)
  modules/calendar/              # hebcal, расписание молитв (шаблон + исключения)
  modules/content/               # новости, события, сборы, программы, подразделения, альбомы, настройки, поиск, загрузки, telegram/
  modules/requests/              # публичные формы, регистрации на события, подписка, йорцайты, CSV
  modules/payments/              # платежи, подписки, PaymentProvider (fake | real-заготовка)
  shared/database/               # TypeORM, data-source.ts (CLI), migrations/, seeds/
  shared/{email,redis,i18n,file-storage,queue}/  # остатки шаблона, не подключены, исключены из lint
backend/scripts/                 # admin-hash.ts, import-telegram.ts
backend/test/                    # e2e (supertest), helpers.ts, setup-env.ts, fixtures/telegram/*.html
backend/uploads/                 # загруженные/импортированные картинки → /media/* (не в git)
frontend/app/                    # маршруты expo-router — тонкие обёртки над экранами; admin/ — админка
frontend/src/screens/<name>/     # model.ts / model-view.tsx / view.tsx (+ *.test.ts)
frontend/src/ui/{kit,motion,judaica,layout}/  # кит, scroll-движок, символы, шапка/подвал/слоты
frontend/src/scenes/             # synagogue-scrub/ (canvas-сцена), preloader/
frontend/src/forms/              # общая механика форм заявок, slots/payment-slot.tsx
frontend/src/store/              # empty-api.ts, store.ts; api/<module>.ts — injectEndpoints
frontend/src/i18n/               # lang.ts, index.ts; locales/{ru,en,he}/<ns>.json
frontend/src/config/             # site.ts (факты), maps.ts
frontend/src/content/            # {ru,en,he}/sections.ts — длинные тексты разделов; photos.ts
frontend/public/media/           # scrub/ (кадры 1280 + manifest.json; t/ — портретный набор телефона, m/ — лёгкий 16:9), sections/ (фото Commons), CREDITS.md
frontend/scripts/build-scrub.mjs # видео/фото → кадры сцены
frontend/e2e/                    # смоуки *.mjs: puppeteer-core + системный Chrome
```

## Ключевые файлы

- `backend/src/app.setup.ts` — `configureApp`, `MEDIA_PREFIX='/media'` ← `UPLOAD_DIR`.
- `backend/src/common/localization/localize.ts` — `localize(field, lang) → {value, fallback}`, `localizeFields(row, keys, lang) → {values, fallback}`, `LANGS`, `isLang`; `@Lang()` (`common/decorators/lang.decorator.ts`) — `?lang=` → ru|en|he, по умолчанию ru.
- `backend/src/common/pipes/field-validation.pipe.ts` — 400 `{message:'Проверьте заполнение полей', fields:{'title.ru':'required', x:'unknown_field'}}`.
- `backend/src/common/forms/idempotency.ts` — заголовок `Idempotency-Key` (≤ 100 симв.), `createIdempotent(repo, key, create) → {entity, created}`; гонку разрешает уникальный индекс.
- `backend/src/common/forms/honeypot.guard.ts` — непустое поле `website` → 400 без `fields`.
- `backend/src/modules/admin/password-hash.ts` — `BCRYPT_COST`, `hashAdminPassword()`; `config/admin.config.ts` — `parseAdminUsers`.
- `backend/src/modules/calendar/calendar.config.ts` — координаты, `tzid Europe/Kaliningrad`, свечи −18 мин, havdalah 8.5°, `MAX_RANGE_DAYS=62`, `DEFAULT_RANGE_DAYS=14`.
- `backend/src/modules/content/content.module.ts` — регистрация админ-CRUD сущностей через фабрику `admin-crud.ts`.
- `backend/src/modules/content/price.ts` — `currentPrice(event, now)`, `currentTierIndex`.
- `backend/src/modules/content/uploads/image.ts` — `saveImageAsWebp`, `MAX_UPLOAD_BYTES`; sharp импортировать только через `uploads/sharp.ts`.
- `backend/src/modules/content/telegram/` — `telegram-import.ts` (`importTelegram(ds, opts)`), `telegram-parser.ts` (`parseChannelPage(html)`), `telegram-news.ts` (`postsToNews`), `safe-fetch.ts` (allowlist t.me/CDN, таймауты, лимит байт).
- `backend/src/modules/payments/payment-provider.ts` — `PAYMENT_PROVIDER`, `FakePaymentProvider`, заготовка `RealPaymentProvider`, `createPaymentProvider`.
- `backend/src/shared/database/migrations/` — `1790000000000-InitSchema` (вся схема), `…3000-SeedScheduleTemplate`, `…11000-NewsImagesSource`.
- `backend/src/shared/database/seeds/content.data.ts` — данные сидов с `// src:`; `content.seed.ts` берёт фото из `.autopilot/ref/kld-img` (`_sources.txt` → атрибуция).
- `backend/test/helpers.ts` — `createTestApp({imports?, override?})`, `resetDb(app)` (все таблицы из information_schema, кроме `migrations`; `schedule_template` → пустая строка id=1), `adminToken(app)`.
- `frontend/src/store/empty-api.ts` — `API_BASE_URL`, baseQuery: снятие обёртки, `?lang=`, Bearer для `/admin/*`, 401 → `reportAdminResponse`.
- `frontend/src/store/api/http.ts` — `ApiError{status:number|'network', message, fields?}`, `toApiError`, `unwrapData`.
- `frontend/src/store/api/admin-auth.ts` — `onAdminAuthLost`/`reportAdminResponse`: единая точка 401 для RTK и CSV.
- `frontend/src/ui/motion/engine.web.ts` — выставляет `html[data-motion]` и `html[data-anim]`, Lenis, rAF, IO.
- `frontend/src/scenes/synagogue-scrub/synagogue-scrub.tsx` — сцена (тач — `film` по умолчанию / `frames`, `?s=1|2`, `touchSceneMode`; десктоп — canvas), `DEFAULT_MANIFEST='/media/scrub/manifest.json'`; кино — `scene-film.tsx` (`SceneFilm`), загрузка фильмов — `film-blobs.ts` (`loadFilmBlobs`); модель — `scrub-model.ts` (`frameIndex`, `keyFrames`, `touchFrameCount`, `filmTarget`, `filmRate`, `filmChapterOf`, `blendCached`, `loadOrder`, `coverRect`, `parseManifest`); кеш кадров — `frame-cache.ts` (`startFrameCache`: ImageBitmap с resize или декодированные `<img>`).
- `frontend/src/ui/styles/scroll-timelines.css` — scroll-driven версия всей `--p`-хореографии (под `html[data-sda='on']`).
- `frontend/src/scenes/preloader/` — `pen.ts` (`penProfile`, `penAllowance`, `penStep`, `MIN_DRAW_MS`, `CEIL_MS`), `progress.ts` (`loadShare`, `sceneWorthWaiting`), `load-gate.ts` (`reportLoad(key, f)`, `loadOf`).
- `frontend/src/screens/home/home-model.ts` — `sceneChapters(history, todayLabel, todayTitle?)`, `dedicationItems`, `blockState`.
- `frontend/src/config/site.ts` — `SITE` (факты `{value, src, alt?}`, `unknown`), `SRC`, `MAPS`, `telHref()`.
- `frontend/src/forms/form-model.ts` — `errorMessageKey(apiKey)`: `seats_left:N` → ключ + `{n}`.
- `frontend/src/screens/search/static-pages.ts` — `staticPages`, `matchStaticPages(q, lang)`: статические страницы в поиске.
- `frontend/app/_kit.tsx` — демо примитивов кита на `/_kit`.

## Архитектура

### API (префикс `/api/v1`)

- Ответ: `{success:true,data,message}`; ошибка: `{success:false,statusCode,message,error,fields?:{поле: ключ}}`.
- Все публичные GET принимают `?lang=ru|en|he` → локализованные строки + `fallback:true`, если отдан ru вместо перевода. `?lang` вырезается из объектного `@Query()` до валидации.
- Админ-эндпоинты живут в модуле-владельце сущности под `/admin/...` с `@AdminOnly()` (Bearer JWT).
- **admin**: `POST /admin/login {email,password}` → 200 `{token}`; `GET /admin/ping`. Учётки — `ADMIN_USERS` (bcrypt), несколько редакторов.
- **calendar**: `GET /calendar/days?from&to&lang` → `Day[]{date, hebrewDate, weekday, services|null, candleLighting, havdalah, parasha, holidays[{key,name,link,yomTov}], zmanim, note, closed}` (14 дней по умолчанию, > 62 → 400); `GET /calendar/today` → `{today, nextCandles[{date,time,at}]×2, nextShabbat{candles,havdalah,parasha}}`; `GET /calendar/holidays/:key?year` → `{key,title,text,year,dates[]}`.
- Админ календаря: `GET/PUT /admin/schedule/template`, `GET /admin/schedule/overrides?from&to`, `GET/PUT/DELETE /admin/schedule/overrides/:date`.
- `CalendarService` (`@modules/calendar`, используется requests через DI): `isClosedForVisits(date)` (Шаббат/йом-тов), `hebrewAnniversary('YYYY-MM-DD', year)`.
- **content**: `GET /news?page&limit&kind` (по 9), `/events?page&limit&past=1` (по 12) → `{items,total,page,limit,hasMore}`; `/news/:slug` (+`images[{url,width?,height?}]`, `sourceUrl`), `/events/:slug` (`priceNow`, `priceTierIndex`), `/fundraisers` (активные; `/:slug` — и закрытые), `/programs`, `/departments`, `/albums`, `/albums/:slug` (+`photos`), `/search?q` → `{q, items[{type,id,slug,title,snippet,url,fallback}]}`, `/settings/public` → `{supportersCount,kaddishMonthRub,requisites,operator,socials,headerPhones,fallback}`.
- Админ контента: `GET|POST /admin/{news,events,fundraisers,programs,departments,albums,photos}`, `GET|PATCH|DELETE …/:id` (списки по 50, фото `?albumId=`); `GET|PUT /admin/settings` (snake_case, `null` удаляет ключ); `POST /admin/uploads` (multipart `file`) → `{url:'/media/<uuid>.webp'}`. Гонка слага → следующий слаг, затем 409 `fields.slug='taken'`.
- **requests**: `POST /requests/{prayer,excursion,appointment,rabbi-question,help,volunteer}` → `{id}` (`prayerType` misheberah|kaddish|yahrzeit|yizkor; дата экскурсии проверяется через `isClosedForVisits` → `date_closed`/`date_too_soon`); `POST /events/:slug/register` → `{id,eventId,isPaid,seats}`, нехватка → 409 `sold_out`/`not_enough_seats` + `fields.seats='seats_left:N'`; `POST /subscribe` → всегда 200 `{id}` (лимит + honeypot, без Idempotency-Key).
- Админ заявок: `GET /admin/requests?type&status&page&limit`, `GET|PATCH /admin/requests/:id` (status, adminNote; GET отдаёт `reminder`), `GET /admin/subscribers(.csv)`, `GET /admin/events/:id/registrations(.csv)`, `PATCH /admin/registrations/:id {status}`, `GET /admin/yahrzeits?days=30`.
- **payments**: `POST /payments` (`@PublicForm`, Idempotency-Key) → `{paymentId, confirmUrl, accessToken}`; `GET /payments/:id?token`; `GET /payments/mode`; `POST /payments/fake/:id/{pay|cancel}?token` (только fake); `POST /recurring/:id/cancel?token`; `GET /dedications?limit`. `:id` — `ParseUUIDPipe` (невалидный → 400).
- Статус платежа меняет только `PaymentsService.applyNotification(providerPaymentId, 'paid'|'canceled'|'failed')`; `paid` — только из pending/failed; повтор `POST /payments` для регистрации с живым pending возвращает его же. `countPaidDonations()` → `supportersCount`. content↔payments через `forwardRef`.
- Касса за `PAYMENT_PROVIDER`: `fake` — `confirmUrl='/dev-pay/:id?token=…'`, кнопки страницы идут через тот же `applyNotification`; `real` — заготовка, роняет старт.
- Админ платежей: `GET /admin/payments?purpose&status&page&limit`, `GET /admin/recurring`, `PATCH /admin/payments/:id/dedication {visible}`.
- Публичные формы (`@PublicForm`): общий лимит `FORMS_RATE_LIMIT` POST/мин/IP (по умолчанию 10) → 429, honeypot `website`.
- Логи HTTP пишутся без query-строки (токены не утекают).

### Схема (jsonb = локализуемое поле)

```
news(slug uniq, title/lead/body jsonb, cover, images jsonb '[]', source_url UQ, kind news|announcement, status draft|published, published_at)
events(slug uniq, title/description/place jsonb, cover, starts_at, ends_at, is_paid, price_tiers jsonb [{until|null, priceRub}], capacity null, status)
event_registrations(event_id, name, phone, email, seats, status new|confirmed|canceled, payment_id, idempotency_key uniq)
schedule_template(id=1, weekday/friday/shabbat jsonb {shacharit,mincha,maariv: 'HH:MM'|null}); schedule_overrides(date pk, shacharit, mincha, maariv, note jsonb)
fundraisers(slug, title/body jsonb, cover, goal_rub, raised_rub, supporters, status active|closed, ends_at)
programs(title/audience/schedule jsonb, contact, cover, sort, published); departments(title/description/address/hours jsonb, phones text[], email, cover, sort, published)
albums(slug, title jsonb, cover, sort); photos(album_id, file, caption jsonb, credit, sort)
requests(type prayer|excursion|appointment|rabbi_question|help|volunteer, payload jsonb, contact_*, status new|in_progress|done|rejected, admin_note, idempotency_key uniq)
yahrzeit_reminders(request_id, deceased_name, father_name, death_date, hebrew_day, hebrew_month, email, phone, by_email, by_phone)
payments(purpose donation|prayer|event, amount_rub, fundraiser_id/request_id/registration_id, donor_name, anonymous, email, phone, comment, dedication, dedication_visible, recurring, status pending|paid|canceled|failed, provider_payment_id, access_token, idempotency_key uniq, paid_at)
recurring_donations(payment_id, amount_rub, email, status active|canceled, cancel_token); subscribers(name, email uniq, lives_in_city); site_settings(key pk, value jsonb)
```

### Фронт

- Сайт только web (`web.output: "single"`, без SSR): kit/layout рендерят DOM.
- Кит `@/ui/kit`: `Section tone="cream|canvas|deep|deeper|ink"` (+`pattern`/`curtain`/`grain`/`flush`, ставит `--p` детям), `Title text italicWord stroke="reveal|progress" size as`, `Page`, `Container`, `Button(variant, href, arrow)`, `Link`, `Eyebrow`, `Text`, `Field`/`Select`/`Checkbox`, `Form onSubmit` (honeypot внутри), `useFieldErrorText()`, `Card`, `ErrorBox(ApiError|string, onRetry)`, `Empty`, `Placeholder` (рисует `[ВПИШИ: …]`), `FallbackBadge(show)`.
- Нажатия — одна система кита, в компонентах ничего не нужно: `usePressFeedback()` (в `SiteShell`, сайт и админка) вешает делегированные pointer-события на документ (`src/ui/kit/press.web.ts`, модель `press-model.ts`: `pressTarget`, `pressKind` → `solid|card|plain|field|check` по `SOLID_SEL`/`CARD_SEL`, `PRESS_SLOP` 8px, `HOLD_MS` 350); ставит `data-pressed="<kind>"` + `data-press-kind` + `--rx/--ry/--rd`, через 350 мс `data-held`, при отпускании `data-released="pressed|held"` на 420 мс; сдвиг > 8px/уход с элемента/pointercancel снимают нажатие; клавиатура Enter/Space тоже; на Android `vibrate(8)` не чаще 100 мс. Вид — `src/ui/styles/interact.css`, только CSS-анимации `scale/filter/box-shadow/opacity` (свои transition компонентов не трогаются): press — сжатие + темнее, hold — глубже + ripple (`::before` у solid) или золотая кромка у карточек, отпускание — пружина с перелётом, поля — свечение без масштаба, выбранные чипы/языки/табы — `sel-pop`; reduced-motion — только цвет/свечение. `data-press="off"` — отключить, `data-press="<kind>"` — задать вид; `Button busy` — спиннер + `aria-busy`. Смоук — `npm run smoke:interact` (:8177, кадры `e2e/shots/interact_*`).
- Motion `@/ui/motion`: `<ScrollProvider>` в `_layout`; `useScrollProgress(ref,{mode:'through'|'pin', onChange})`, `useReveal`, `useMotionOn`, `usePinOn`, `<Reveal>`, `<Pinned chapters header renderAside counter>` (закреплён везде, где `data-motion='on'`, тач тоже; reduced-motion — статичная колонка глав), `<Marquee>`, `<HandStroke>`, `lockScroll`, `scrollToTop`, `reducedMotion()`, `useMotionOn()`.
- `html[data-motion='on']` — везде, кроме reduced-motion (тач тоже, таск 15): `--p`-хореография и scroll-сцена. CSS от `var(--p)` писать только под этим селектором. На точном указателе — Lenis и постоянный rAF. На тач (`touchMode()`, `html[data-touch='on']`, без Lenis; чистая математика — `src/ui/motion/touch-scroll.ts`): нативный скролл, `scrollY` опрашивается каждый rAF, `--p` догоняет lerp `TOUCH_LERP` 0.2; высота sticky-сцен в px (`--vh-fix`, меняется только при повороте). Автодокрутка: `useScrollProgress(ref, {mode:'pin', snap: глав})` — один раз на остановку: палец снят и страница стоит 150 мс → едет, только если остановилась МЕЖДУ главами (оба текста полупрозрачны: локальный прогресс > .72 одной и < .2 следующей; `snapProgress(p, n, dir)`): вниз — в следующую главу до «текст целиком» (локальный .22), вверх — обратно в предыдущую (.70), без направления — к ближней; никогда против движения и не дальше полглавы; на читаемой главе, у входа (раскрытие первой главы) и на выходе не трогает. Мягкий старт и посадка (`easeGlide` = cubic-bezier(.45,0,.25,1)), 350–800 мс по расстоянию (`snapDuration`); касание/колесо/клавиша/чужой скролл отменяют, сдвиг от адресной строки — нет. До 2026-10-13 докрутка тянула к серединам глав и могла тянуть против движения до 0,3 экрана (bench `backSnap` 4 за прогон) — пользователь называл это «работает странно». На десктопе докрутки нет. `--p` в пределах 2e-4 от 0/1 пишется ровно 0/1 (дробный top секции не оставляет 1e-4 после возврата). `<Pinned>` («Жизнь общины») на тач — тот же путь: высоты в `--vh-fix`, `--p` по lerp, `snap: глав` (та же докрутка); на ширине < 1024 в закреплённом экране сверху заголовок+счётчик, арка занимает остаток по высоте, текст главы — сцена фиксированной высоты 20rem; на телефоне (≤ 767px, тач) — «арка → фото на весь экран» (CSS в конце `home.css`): фото глав всегда на весь экран (портретные кропы `PHOTO_TALL`, `*-tall.jpg` 1200×2000; `life-photos.tsx` `LifePhotos` скачивает и декодирует все четыре (`img.decode()`) после ухода прелоадера, когда секция ближе 3 экранов; фото без `data-ready` — `display:none`), кроссфейд и Ken Burns на scroll-таймлайне, каждое фото рендерится только в своём окне (`visibility`) — не больше двух слоёв. На входе фото видно через арку: **плиты цвета секции вокруг арки** (`.home-life__mask`: верхняя с вырезом полукруга, нижняя со скруглёнными углами, две боковые полосы 16px; пути и `--life-top-h`/`--life-bottom-y`/`--life-bottom`/`--life-sx` рисует `useLifeMorph` (`life-morph.ts`) из `lifeArch` + `lifeMask` (`home/model.ts`) только по ResizeObserver). За первые 30 % главы 1 плиты раскрываются **только transform-ами** — верхняя scaleY um² от верха экрана (край поднимается, полукруг сплющивается, как прежний радиус) и scaleX до `--life-sx`, нижняя уезжает вниз на нижний отступ, боковые уходят в стороны; заголовок сжимается до eyebrow, приходят затемнение, плашка, номер, счётчик, stories-прогресс, текст съезжает на 12px (`LIFE_TEXT_LIFT`). До 2026-10-14 то же делал покадровый `clip-path` (на телефонах — «разрывы»), 14-го — упрощённый кроссфейд без морфа (пользователь не принял). Reduced-motion — колонка с фото во всю ширину. Сцена на тач — **два режима**, `?s=1` / `?s=2`, по умолчанию `DEFAULT_TOUCH_MODE = film` (`synagogue-scrub.tsx`). **film** (`scene-film.tsx`, с 2026-10-15 — «гибрид»): камера следует за прокруткой, **проигрывая** фильм, а не сикая его: цель — куда показывает прокрутка (`filmTarget`: остановки глав (k + .22)/n → стоянки `holds`, между ними линейно, с первых пикселей; сырой прогресс без lerp), `playbackRate` = темп прокрутки + догонка отставания (`filmRate`: 4/с, ±6×, шаг 1/4, при жесте не медленнее 1×); назад — реверс-файл с зеркальной точки (скрытое видео держится там, пока камера стоит; поворот без сика, если оно рядом); палец на экране «заводит» оба плеера на 1/16× (первые пиксели меняют только скорость, а не запускают плеер); отставание > 1,5 с фильма (флинг) — прыжок к цели под кроссфейдом со снимка кадра (`.scrub__snap`); в конце файла стоит (play() там перезапустил бы его); в покое камера там, куда показывает прокрутка (докрутка движка ставит страницу на остановку главы = стоянку). Текст главы — по фактической позиции камеры (`filmChapterOf`). Оба файла скачиваются целиком во время прелоадера (`film-blobs.ts`: fetch → Blob → object URL; `preload` мобильные браузеры игнорируют), прогреваются (muted play + pause у точки), где object URL не играет (WebKit на Windows) — те же http-URL из кеша; пока не готово — подстраховка: 40 кадров на canvas по той же камере; в прелоадер — 0,25 кадры + 0,75 фильмы, тот же потолок. Цикл rAF спит, когда камера стоит и прокрутки нет. Файлы — `public/media/scrub/v/scene-{p,p-rev,l,l-rev}.mp4` (406×720 и 720×406, crf 28, keyframe каждые 0,48 с и на каждой стоянке, ~3,2 МБ портретный); пересборка `build:scrub -- <видео> --from 92 --to 118 --film-only --film-crf 28`; в манифесте `film {p, pr, l, lr, duration, holds}`. Замер `bench-film` (система Chrome с GPU, Pixel 7 DPR 2,75, CPU ×6, тач-драги 400–2500 px/с): было (по главам) — первый кадр после начала жеста 6,9 с / 1,8 с / 0,9 с, отставание камеры 4,3 с фильма в среднем, догоняла через 4 с; стало — 46–131 мс (в среднем 60–71), отставание 0,1 с (p95 0,4–0,66), догоняет за ≤ 133 мс (p95), разрывов показа > 50 мс 0–5 на ~230 кадров. **frames** (`?s=1`): canvas-скраб `touchFrameCount` кадров портретного набора (120 / 80 / 54 по `deviceMemory`, неизвестно → 120), декодированных в `ImageBitmap` 540 px высотой (≤ 79 МБ; ландшафт — лёгкий набор 960×540), кроссфейд только соседей, перерисовка только при смене (a, b, alpha/32), canvas — свой слой; загрузка постер → каждый 8-й → дозаполнение. Замер (система Chrome с GPU, Pixel 7 DPR 2,75, CPU ×6, тач-драги 250–2000 px/с): film — `long33` 0,6 %, старт кино после пересечения главы ≤ 35 мс, видео 41–48 к/с, CV интервалов кадров 0,44, потеряно 1 кадр из 650; frames — `long33` 0,6 %, отставание картинки 53 мс в среднем / 326 мс p95, CV шага картинки 0,6–1,9 (неровно на медленном драге). Десктоп — полный набор 1280px как декодированные `<img>` на canvas, кроссфейд соседей и доводка до целого кадра в покое. Портретный набор кадров пересобирается `build:scrub -- <видео> --from 92 --to 118 --touch-only`; лёгкий — `build:scrub -- --light-only --light 1024 --light-step 1 --light-budget 5.5`.
- **Scroll timelines** (`html[data-sda='on']`, где есть `animation-timeline: view()` — Chrome 115+, Safari 26+; `?sda=0` — принудительно фолбэк): вся `--p`-хореография — CSS scroll-driven animations (`src/ui/styles/scroll-timelines.css`; `.sec` → таймлайн `--sec` = 'through' (`cover`), `.pinned`/`.scrub--live` → `--pin` = 'pin' (`contain`); главы — `animation-range` по `--i`/`--chapters`), на композиторе, без покадровой записи `--p`. Section регистрируется в движке `cssOnly` (без таймлайнов пишет `--p`, с ними — не регистрируется), `<Pinned>` и сцена — `timeline: true` (onChange для React/докрутки есть, `--p` не пишется). Почему: `--p` на секции каждый кадр перестилизовывал всё её поддерево (до 100 элементов/кадр, главный поток занят 83–94 % при CPU ×6, 6–27 к/с на тач-драге). Ещё: rAF-опрос тача останавливается после 12 спокойных кадров (раньше кадр каждый vsync впустую — 75–97 % занятости в покое), бесконечные анимации (призрачные слова, marquee, розетта, пламя, `home-cue`) на паузе вне экрана (`data-onscreen` от `registerOnscreen`), `home-cue` — transform вместо `top` (был layout каждый кадр), часы «Сегодня» перерисовывают только плитки (`TodayLive`), а не всю главную раз в секунду. Замер `prof2` (система Chrome, CPU ×6, тач-драг): в покое 2–25 % занятости (было 85–97 %), на драге 38–57 к/с (было 6–27).
- `html[data-pin='on']` — только точный указатель без reduced-motion (Lenis, `usePinOn()`/`pinAllowed()`); `<Pinned>` от него больше не зависит — его CSS под `data-motion`.
- `html[data-anim='on']` — везде, кроме reduced-motion: Reveal по IO, marquee, вход hero, HandStroke `reveal`, собственное вращение розетты в Dawn (`.home-dawn__spin`, 75 с).
- Judaica `@/ui/judaica`: `MagenDavid`, `HexPattern`, `Rosette`, `Menorah`, `GhostField seed words? density?{desk,phone} tone?(light|dark) titleAt?(center|start|end|top) anchor?(free|center)` — «Созвездие» призрачных ивритских слов за секцией (модель `ghost-model.ts`: `ghostLayout`, `GHOST_WORDS`, `DEFAULT_GHOST_WORDS`, `TITLE_ZONE`/`underTitle`; `SHALOM`, `BRUCHIM_HABAIM`), `ArchFrame`. Ставится первым ребёнком `<Section>`; `PageHero ghost` — набор слов (строка — якорь + общий набор). Только там, где призрачное слово было в опубликованной версии: hero и шторка главной, все `PageHero`, шапка /gallery, тёмные главы /history.
- Слоты layout (`src/ui/layout/slots/`): `today-widget.tsx` (`variant:'header'|'menu'`, < 1280px — только в бургере), `subscribe-form.tsx`, `contacts.ts`.
- i18n: `const {t, lang, dir, setLang} = useLang('<ns>')`; неймспейс = три файла `locales/{ru,en,he}/<ns>.json`, подхватываются `require.context` (index.ts не трогать). Выбор языка: `?lang=` → AsyncStorage `synagogue.lang` → ru. На `<html>` — `lang` и `dir` (`he` → rtl). При смене языка кэш RTK сбрасывается (`store.ts`).
- Иврит — машинный перевод (`src/content/he/README.md`), нужна вычитка.
- API-слайсы `src/store/api/<module>.ts` (`calendar`, `content`, `requests`, `payments`, `admin*`); `?lang=` добавляется сам; Bearer из AsyncStorage `synagogue.adminToken` (`admin-token.ts`).
- Сцена главной: `<SynagogueScrub chapters={[{id,label,title,italic?,text}]} manifest? creditsLabel? credit? ariaLabel?>` — позиция `p·(N−1)` строго по прокрутке (соседние кадры смешиваются по дробной части, в покое — целый кадр); canvas с `data-frame`/`data-frames`. Короткая подпись — i18n `home:scene.credit`, полная — `CREDITS.md`.
- `build:scrub`: видео (ffmpeg-static) режется на N кадров, папка фото (sharp) — плавный зум/панорама + кроссфейд; пишет `public/media/scrub/frame-NNN.webp` + `manifest.json {frames,width,height,credits,poster?}` (старые кадры удаляет), держит общий вес ≤ `--budget` МБ, upsert блока `<!-- scrub:start -->…<!-- scrub:end -->` в `CREDITS.md`. Из видео он же режет портретный набор телефона `t/` (`--touch`, по умолчанию 720 px высоты, 162 кадра, 9:16; `--touch 0` — без него) и пишет `"touch": "t/manifest.json"` в главный манифест; полная пересборка кадров из папки фото набора `t/` не делает. `serve-demo` кеширует как Pages (`max-age=600` + `last-modified`, Range 206) — тёплый кеш в `bench:preloader`.
- Прелоадер `@/scenes/preloader` (только `/`, на каждой загрузке, без него — только reduced-motion): линия слева направо, в центре одной чертой рисует звезду Давида (`starLinePath`) и уходит вправо; перо идёт по РЕАЛЬНОЙ загрузке, кадр за кадром (rAF, `stroke-dashoffset`): подводка свободна, звезда рисуется по мере загрузки (`penAllowance`: доля `loadShare` — шрифты 1, ответы API главной 1, картинки первого экрана 0,5, кеш кадров сцены 3; при застое — медленный «дрейф», линия не замирает), выход вправо — когда всё пришло. Не быстрее `MIN_DRAW_MS` = 1,8 с (звезда успевает сформироваться), замедление/разгон плавные (`penStep`); сцену ждёт, только пока её темп успевает до потолка (`sceneWorthWaiting`), потолок `CEIL_MS` = 7 с от старта — дальше сайт показывается, кеш догружается в фоне. При уходе ставит `html[data-app-ready]` и для замеров `data-preload-ms` (своя длительность), `data-preload-at` (от начала навигации), `data-preload-scene` (доля кеша, `none` — сцена не стартовала). Замер `npm run bench:preloader` (демо, 390×844, CPU ×4; от начала навигации, сам прелоадер в скобках): Fast 3G тёплый 3,9–4,5 с (2,6–2,9) — было 4,4; холодный 25 с (7,5, потолок: шрифты и данные не успевают, кеш в фоне ~57 с) — было 20 с без ожидания шрифтов; Slow 3G холодный 69 с (7,7) — было 64; локально/быстрая сеть — 2,0 с своих. `PRELOADER_KEY` экспортируется только для совместимости — не читается.
- Формы: `useSubmitForm<V>({path, initial, toBody?})`, `outcomeOf(ApiError) → {banner, fields}`; UI `src/forms/ui` (`FormPage`, `ConsentField`, `SubmitRow`, `RequestAccepted`). Слот оплаты — `src/forms/slots/payment-slot.tsx`.
- Внутри слотов импортировать формы из конкретных модулей (`@/forms/ui`, …), не из barrel `@/forms` — цикл импортов со слотом оплаты.
- Оплата: `<DonationForm ctx fixed? initialAmount?>`, `donate-model` (`PRESETS`, `amountError`, `kaddishTotal`, `pollStep`, `paymentBody`); `/dev-pay/[id]` работает только в fake (`GET /payments/mode`).
- Админка `/admin*`: `AdminGate`, `useAdminGate()`, `useDirtyGuard(dirty)`, модели `ENTITIES`, `toForm`, `toBody`, `validate` (`src/screens/admin/entity/entity-model.ts`); исключения расписания окнами по 62 дня (`overrideWindow`).

### Импорт Telegram

- `npm run import:telegram -- --since YYYY-MM-DD [--channel имя]` листает `t.me/s/<channel>` (при недоступности — через `r.jina.ai`), до 200 страниц, накатывает миграции сам.
- Пост → новость `published`, дата по Калининграду (UTC+2); альбом → `news.images`, картинки → webp в `UPLOAD_DIR`; `source_url` — ссылка на пост.
- Посты только с фото дописываются к новости того же дня, без неё — пропуск с записью в лог; осиротевшие фото цепляются только к новостям из канала.
- Скачивание — `safeFetch` с allowlist (страницы t.me, CDN Telegram), 3 попытки на 5xx CDN; итог печатается одной строкой (создано/было/картинок/не скачалось).

## Соглашения кода

- Экран = `src/screens/<name>/`: `model.ts` — чистые функции и типы (`xModel(content, lang?)`), `model-view.tsx` — контейнер с хуками (`XScreen`), `view.tsx` — чистый `XView(props)`. Файл в `app/` только вызывает контейнер. Тесты — на `model.ts`.
- Ни одного выдуманного факта о синагоге/общине: телефон, цена, имя, часы, реквизиты — только с источником (`// src: <код>` в сидах, `src` URL в `site.ts`, комментарии `src:` в `content/ru/sections.ts`) или видимая заглушка `[ВПИШИ: …]`. Общие знания об иудаизме — можно.
- Контакты и факты на фронте — только из `@/config/site`; длинные тексты — `src/content/<lang>/sections.ts`; короткие подписи — i18n. Один текст живёт в одном месте.
- Локализуемое поле в БД — jsonb `{ru, en?, he?}`; в DTO — `@IsDefined() @ValidateNested() @Type(() => LocalizedStringDto)`; наружу — `localize`/`localizeFields`.
- Ключи ошибок полей — машинные snake_case (`required`, `email`, `phone`, `date`, `too_long`, `too_short`, `too_large`, `too_small`, `integer`, `number`, `boolean`, `invalid`, `invalid_format`, `invalid_choice`, `url`, `unknown_field`, `out_of_range`, `date_too_soon`, `date_closed`, `taken`, `seats_left:N`); свой ключ — `{message:'date_too_soon'}` в декораторе. Каждый новый ключ — перевод в `common:fieldErrors` всех трёх языков (`src/i18n/field-errors.test.ts`).
- Бэкенд-модуль: `*.module/controller/service.ts`, `dto/`, `entities/`, `index.ts`; сущности подключать `TypeOrmModule.forFeature` в своём модуле. Импорт между модулями — `@modules/<name>`.
- Новый фронт-эндпоинт — `emptyApi.injectEndpoints` в `src/store/api/<module>.ts`; ошибку хука — `asApiError(error)` из `@/store`.
- Слоты (`today-widget`, `subscribe-form`, `contacts`, `payment-slot`, `screens/event/register-slot.tsx`) заменяются файлом целиком, пропсы сохраняются.
- Алиасы: бэк `@common`, `@config`, `@modules`, `@shared`; фронт `@/`.

## Окружение

`backend/.env` (шаблон `backend/.env.example`, не в git; корневой `.env.example` только ссылается на него):
- `NODE_ENV`, `PORT`, `API_PREFIX`, `BASE_URL`, `FRONTEND_URL`.
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`; `TEST_DB_DATABASE` — БД e2e.
- `JWT_SECRET` (обязателен), `JWT_EXPIRES_IN`; `ADMIN_USERS` — `email:bcrypthash,…`.
- `FORMS_RATE_LIMIT`, `UPLOAD_DIR`.
- `PAYMENT_MODE` (`fake` | `real` — роняет старт), `PAYMENT_SHOP_ID`, `PAYMENT_SECRET_KEY`.
- `SWAGGER_ENABLED`, `SWAGGER_USER`, `SWAGGER_PASSWORD` (basic-auth на `/docs` только в production).

Фронт: `EXPO_PUBLIC_API_URL` (по умолчанию `http://localhost:3000/api/v1`; `.env.example` у фронта нет).

Смоуки: `WEB_URL`, `API_URL`, `CHROME_PATH`, `SMOKE_SHOTS=<папка>`, `SMOKE_ADMIN_EMAIL`/`SMOKE_ADMIN_PASSWORD` (smoke:content/admin/payments; без них берут dev-админа из комментария в `backend/.env`), `SMOKE_ALL=1` (smoke:home — скриншоты всех экранов).

## Тесты

- Бэк unit: `backend/src/**/*.spec.ts`; один файл — `cd backend && npx jest src/modules/content/telegram/telegram-parser.spec.ts`.
- Бэк e2e: `backend/test/*.e2e-spec.ts`, `--runInBand`; один файл — `cd backend && TEST_DB_DATABASE=synagogue_test_09 npx jest --config ./test/jest-e2e.json --runInBand test/calendar.e2e-spec.ts`.
- У каждого параллельного исполнителя своя БД `synagogue_test_NN` (03–09, владелец `synagogue`): `resetDb` стирает всё, общая БД ломает чужие прогоны.
- `test/setup-env.ts` сам задаёт окружение (NODE_ENV=test, тестовые JWT и `ADMIN_USERS`, `FORMS_RATE_LIMIT=1000`, fake-касса, `UPLOAD_DIR=./test/fixtures/uploads`); из `backend/.env` берёт только доступ к БД.
- `test/schema.e2e-spec.ts` сверяет сущности с миграциями; `test/content-seed.e2e-spec.ts` требует `// src:` у строк сидов с телефоном/ценой/email/ссылкой.
- Фронт unit: jest-expo, `frontend/src/**/*.test.ts(x)`; один файл — `cd frontend && npx jest src/i18n/lang.test.ts`.
- Смоуки `frontend/e2e/*.mjs` — не jest, против живых API и web: по умолчанию :8081, `smoke:home` — :8121, `smoke:mobile` — :8150. Все поднимают Expo сами, если порт пуст; `smoke:schedule`, `smoke:content`, `smoke:forms`, `smoke:payments`, `smoke:admin` поднимают и `nest start`, если API нет.

## Подводные камни

- Metro на E:\ не видит изменений файлов — после правок перезапускать `expo start`.
- `start:dev` бэка на E:\ не видит новых файлов — после добавления модулей/файлов перезапускать.
- PowerShell 5.1 портит UTF-8 (русский, иврит): файлы править Edit/Write или Node; запросы с кириллицей — через Node, не curl.
- `schema.e2e` краснеет при расхождении сущностей и миграций: новая колонка/сущность — миграция вручную в `src/shared/database/migrations/<ts>-Name.ts`, `@Check` и имена FK как в миграции; `migration:generate` шумит именами ограничений.
- `@hebcal/core` закреплён на 5.10.1: 6.x — только ESM, не обновлять.
- Лимит 10 POST/мин с IP на все публичные формы общий: `smoke:forms` (8 POST) гонять не чаще раза в минуту.
- Повторный `import:telegram` добавляет только новые посты (дубли — по `source_url`); `--since` можно ставить тем же.
- `public/media/CREDITS.md` правится только своим разделом: блок сцены пишет `build:scrub` между маркерами `scrub:`, раздел фото генерируется из `src/content/photos.ts`.
- `npm run seed` читает фото из `.autopilot/ref/kld-img` — папка нужна для сидов альбомов.
- `type-check` фронта видит новые маршруты `app/` только после `expo start` (типы роутов в `.expo/types`).
- `backend/docker-compose.yml`, `backend/Dockerfile`, `backend/src/i18n/`, `frontend/README.md` — нетронутые файлы шаблонов.

## Частые задачи

- **Своё видео в scroll-сцене**: `cd frontend && npm run build:scrub -- <путь/к/видео.mp4> --from 2 --to 14 --credit "Автор, лицензия"` → заменит кадры, `manifest.json` и портретный набор телефона `t/`, обновит блок в `CREDITS.md`; короткую подпись поправить в `src/i18n/locales/{ru,en,he}/home.json` (`scene.credit`); перезапустить Expo.
- **Новости из канала**: `cd backend && npm run import:telegram -- --since <дата последнего импорта>`; картинки лягут в `backend/uploads/`.
- **Факты сайта**: контакты/часы/цены/транспорт — `frontend/src/config/site.ts` (null в `SITE` → заглушка); тексты разделов — `frontend/src/content/{ru,en,he}/sections.ts`; программы, подразделения, новости-сиды, альбомы, настройки — `backend/src/shared/database/seeds/content.data.ts`; реквизиты/соцсети/телефоны шапки в рантайме — `/admin/settings`.
- **Где `[ВПИШИ]`**: `frontend/src/config/site.ts`, `frontend/src/content/{ru,en,he}/sections.ts`, `frontend/src/ui/layout/slots/contacts.ts`, `frontend/src/ui/layout/footer.tsx`, `frontend/src/screens/donate/requisites.tsx`, `frontend/src/screens/legal/model.ts`, `backend/src/shared/database/seeds/content.data.ts`; поиск — `grep -rn "ВПИШИ" frontend/src backend/src`.

## Как здесь работает Autopilot

Сборка ведётся навыком `/autopilot`. Требования, спецификация и таски — в `.autopilot/`.
Прогресс — `.autopilot/dashboard.html`. Правило: требование из `manifest.md`
может снять только пользователь.

Если работа продолжается — скажи «продолжи автопилот»: состояние поднимется
из `.autopilot/state.js`, переспрашивать ничего не нужно.
<!-- autopilot:end -->
