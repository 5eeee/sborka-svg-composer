# Плагин Сборка

## Автономный запуск

В Figma Desktop: Plugins → Development → Import plugin from manifest. Выберите manifest.json в этой папке. Библиотека и интерфейс встроены; внешний сервер не нужен.

## Версия аккаунта

https://www.figma.com/file/new?try-tool-resource-content-id=2137a770-4ae4-432e-8fb5-81003c111a93&try-tool-resource-type=gen_tool&type=design&mode=design

При запуске выберите комплектный library.json. В нём 40 исходных предметных SVG и 6 фонов холста. Данные обрабатываются в редакторе.

Соберите композицию, настройте S/L, палитру, слои и поворот. «Добавить в Figma» создаёт новую композицию редактируемыми векторными слоями. «Макеты UI» создаёт отдельные страницы экранов и компонентов.

Исходники: code.ts, ui.html; аккаунтная сборка: code-cloud.ts, ui-cloud.html. Готовый code.js включён. Пересборка из корня: npm ci, npm run build:plugin.

Макеты и ссылки: ../DESIGN.md. Актуальная версия в ../CURRENT.json. Получателю ничего не отправлено.
