# Админка сайта RICCA DESIGNS

Адрес: **/admin** — например, https://ricca-demo.netlify.app/admin (потом https://ricca.design/admin).

Что можно делать без программиста:

- **Нам доверяют** — добавить, убрать или переставить логотип клиента, задать его размер.
- **Фото и новые модели** — добавить фото к модели каталога (вид или крупный план) или завести новую модель с фото.

После «Опубликовать» сайт обновится сам через 1–2 минуты. Фото с телефона подходят — сайт сам их уменьшит.

Правила владельца действуют и здесь: только настоящие фото, без цен, без названий и логотипов поставщиков.

## Настроить один раз (10 минут)

1. **Аккаунт GitHub у того, кто будет добавлять фото.** Бесплатно: https://github.com/signup.
2. **Доступ к репозиторию.** Владелец репозитория `ricca122243/ricca-designs-`: GitHub → репозиторий → Settings → Collaborators → Add people → ввести логин из шага 1 (право Write). Приглашение нужно принять.
3. **Связать сайт Netlify с репозиторием.** Netlify → сайт → Site configuration → Build & deploy → Link repository → GitHub → `ricca-designs-`. Ветка — та, что указана в `ricca/admin/config.yml` (`branch`). Команда сборки и папка возьмутся из `netlify.toml`.
4. **Вход через GitHub.** GitHub → Settings → Developer settings → OAuth Apps → New OAuth App:
   - Homepage URL — адрес сайта (например, https://ricca-demo.netlify.app);
   - Authorization callback URL — `https://api.netlify.com/auth/done`.
   Нажать «Generate a new client secret». Затем Netlify → сайт → Site configuration → Access & security → OAuth → Install provider → GitHub, вставить Client ID и Client secret.
5. Открыть **/admin** → «Войти через GitHub».

## Как устроено (для разработчика)

- Админка — Decap CMS: `ricca/admin/index.html` и `ricca/admin/config.yml` (собирает `tools/cms-config.py`; после смены каталога запустить его, чтобы новые модели появились в списке «К какой модели»).
- Данные: `ricca/data/clients.json` и `ricca/data/models-extra.json`, фото — `ricca/img/uploads/`. Сайт читает их при открытии (`js/site.js`, блок «Админка»); фото уменьшает Netlify Image CDN (`/.netlify/images`).
- Сборка Netlify (`tools/cms-sync.sh`) переносит эти файлы в `dist/RICCA-site`.
- Вход Git Gateway (Netlify Identity) не используем: с сентября 2026 Netlify пишет, что он устарел.
