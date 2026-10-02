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
| Импорт новостей из Telegram | `cd backend && npm run import:telegram -- --since 2026-08-01` (`--channel <имя>`, по умолчанию `B_C_Kaliningrad`) |
| Хеш пароля для `ADMIN_USERS` | `cd backend && npm run admin:hash -- <пароль>` |
| Миграции вручную | `cd backend && npm run migration:run` (`migration:revert`) |
| Кадры scroll-сцены | `cd frontend && npm run build:scrub -- <видео \| папка фото> [--from s --to s --frames ≤120 --width 1600 --quality 72 --budget 12 --credit "…"]` |
| Смоуки в Chrome | `cd frontend && npm run smoke` (ещё `smoke:schedule`, `smoke:content`, `smoke:forms`, `smoke:sections`, `smoke:payments`, `smoke:home`, `smoke:admin`, `smoke:mobile`) |

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
frontend/public/media/           # scrub/ (кадры + manifest.json), sections/ (фото Commons), CREDITS.md
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
- `frontend/src/scenes/synagogue-scrub/synagogue-scrub.tsx` — canvas-сцена, `DEFAULT_MANIFEST='/media/scrub/manifest.json'`; модель — `scrub-model.ts` (`frameIndex`, `nearestLoaded`, `coverRect`, `parseManifest`).
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
- Motion `@/ui/motion`: `<ScrollProvider>` в `_layout`; `useScrollProgress(ref,{mode:'through'|'pin', onChange})`, `useReveal`, `useMotionOn`, `usePinOn`, `<Reveal>`, `<Pinned chapters header renderAside counter>` (на телефоне — лента со scroll-snap и `.pinned__dots`), `<Marquee>`, `<HandStroke>`, `lockScroll`, `scrollToTop`, `reducedMotion()`, `useMotionOn()`.
- `html[data-motion='on']` — везде, кроме reduced-motion (тач тоже, таск 15): `--p`-хореография и scroll-сцена. CSS от `var(--p)` писать только под этим селектором. На точном указателе — Lenis и постоянный rAF. На тач — вариант `touchVariant()` (`src/ui/motion/touch-variant.ts`, `?a=1|2|3`, запоминается в sessionStorage, по умолчанию `DEFAULT_TOUCH_VARIANT = 2`): 1 — Lenis `syncTouch`; 2 — нативный скролл, `scrollY` опрашивается каждый rAF, `--p` догоняет lerp 0.18, сцена на лёгком наборе кадров (`public/media/scrub/m/`, `manifest.light`, постер до загрузки); 3 — проигрывание по времени при появлении. Во всех — высота sticky-сцен в px (`--vh-fix`, меняется только при повороте), `html[data-touch]`. Замеры — `npm run bench:mobile`; лёгкий набор — `build:scrub -- … --light 640` (резче — `--light 960`).
- `html[data-pin='on']` — только точный указатель без reduced-motion: закреплённые главы `<Pinned>` (`usePinOn()`/`pinAllowed()`); на телефоне — лента со свайпом.
- `html[data-anim='on']` — везде, кроме reduced-motion: Reveal по IO, marquee, вход hero, HandStroke `reveal`, собственное вращение розетты в Dawn (`.home-dawn__spin`, 75 с).
- Judaica `@/ui/judaica`: `MagenDavid`, `HexPattern`, `Rosette`, `Menorah`, `GhostField seed words? density?{desk,phone} tone?(light|dark) titleAt?(center|start|end|top) anchor?(free|center)` — «Созвездие» призрачных ивритских слов за секцией (модель `ghost-model.ts`: `ghostLayout`, `GHOST_WORDS`, `DEFAULT_GHOST_WORDS`, `TITLE_ZONE`/`underTitle`; `SHALOM`, `BRUCHIM_HABAIM`), `ArchFrame`. Ставится первым ребёнком `<Section>`; `PageHero ghost` — набор слов (строка — якорь + общий набор). Только там, где призрачное слово было в опубликованной версии: hero и шторка главной, все `PageHero`, шапка /gallery, тёмные главы /history.
- Слоты layout (`src/ui/layout/slots/`): `today-widget.tsx` (`variant:'header'|'menu'`, < 1280px — только в бургере), `subscribe-form.tsx`, `contacts.ts`.
- i18n: `const {t, lang, dir, setLang} = useLang('<ns>')`; неймспейс = три файла `locales/{ru,en,he}/<ns>.json`, подхватываются `require.context` (index.ts не трогать). Выбор языка: `?lang=` → AsyncStorage `synagogue.lang` → ru. На `<html>` — `lang` и `dir` (`he` → rtl). При смене языка кэш RTK сбрасывается (`store.ts`).
- Иврит — машинный перевод (`src/content/he/README.md`), нужна вычитка.
- API-слайсы `src/store/api/<module>.ts` (`calendar`, `content`, `requests`, `payments`, `admin*`); `?lang=` добавляется сам; Bearer из AsyncStorage `synagogue.adminToken` (`admin-token.ts`).
- Сцена главной: `<SynagogueScrub chapters={[{id,label,title,italic?,text}]} manifest? creditsLabel? credit? ariaLabel?>` — кадр = `round(p·(N−1))` строго по прокрутке; canvas с `data-frame`/`data-frames`. Короткая подпись — i18n `home:scene.credit`, полная — `CREDITS.md`.
- `build:scrub`: видео (ffmpeg-static) режется на N кадров, папка фото (sharp) — плавный зум/панорама + кроссфейд; пишет `public/media/scrub/frame-NNN.webp` + `manifest.json {frames,width,height,credits,poster?}` (старые кадры удаляет), держит общий вес ≤ `--budget` МБ, upsert блока `<!-- scrub:start -->…<!-- scrub:end -->` в `CREDITS.md`.
- Прелоадер `@/scenes/preloader`: рисует звезду линией (`starLinePath(w,h)`, `DRAW_MS=1900`) на каждой загрузке, по готовности ставит `html[data-app-ready]`. `PRELOADER_KEY` экспортируется только для совместимости — не читается.
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

- **Своё видео в scroll-сцене**: `cd frontend && npm run build:scrub -- <путь/к/видео.mp4> --from 2 --to 14 --credit "Автор, лицензия"` → заменит кадры и `manifest.json`, обновит блок в `CREDITS.md`; короткую подпись поправить в `src/i18n/locales/{ru,en,he}/home.json` (`scene.credit`); перезапустить Expo.
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
