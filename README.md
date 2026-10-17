# plast-order-uniform-de

Статична веб-сторінка для пошуку та замовлення одностроїв Пласту для станиці Дюсельдорф (Німеччина). Працює без сервера, відкривається прямо в браузері.

Специфікація: [`docs/SPEC.md`](docs/SPEC.md) · формат таблиць: [`docs/CATALOG-CSV.md`](docs/CATALOG-CSV.md) · дизайн-бриф: [`docs/DESIGN-BRIEF.md`](docs/DESIGN-BRIEF.md).

## Запуск

```bash
npm install
npm run dev        # зразкові дані з public/sample, без Google
npm test           # тести
npm run lint       # типи + перевірка, що в компонентах немає захардкоджених текстів
npm run build      # config → знімок каталогу → tsc → vite build
```

## Конфігурація

Справжні адреси таблиць, форми та контакти **не зберігаються в репозиторії**. Вони лежать у GitHub Actions Variables:

- `SITE_CONFIG` — JSON за схемою `config.example.json` (станиця, `basePath`, три CSV-посилання, `formResponse` з `entry.*`, контакти координаторів). Усе, що в ній, потрапляє на сайт і є публічним.
- Для локальної розробки з реальними даними покладіть `SITE_CONFIG={...}` в один рядок у `.env` (він у `.gitignore`).

Без `SITE_CONFIG` використовується `config.example.json` зі зразками (`REQUIRE_CONFIG=1` у деплої забороняє це).

## Тексти

Усі тексти інтерфейсу: `src/i18n/uk.json`. Юридичні сторінки: `src/content/legal.tsx` (**заповніть заглушки в `[...]` перед публікацією**).

## Workflows

- `ci.yml` — lint, тести, пробна збірка (PR та перед деплоєм).
- `pages.yml` — деплой на Pages (push у `main`, щодня, вручну); щоденна сувора перевірка таблиці відкриває issue при помилках і не дає розкладу вимкнутись.
- `check-links.yml` — щотижнева перевірка посилань на scoutstyle.net.

Pages: Settings → Pages → Source: GitHub Actions.
