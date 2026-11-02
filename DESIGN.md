# Макеты из приложения

Актуальные экраны перенесены 3 ноября 2026 года из реального веб-редактора, с исходными SVG логотипа, холста, десяти объектов библиотеки и трёх превью слоёв. Временные blob-ссылки перед переносом заменяются встроенными SVG только на capture.html. Рабочее приложение не меняется.

- Desktop 1440: https://www.figma.com/design/aadh2KN9IgfjlrDEfzDLNM/Untitled?node-id=37-2
- Tablet 1024: https://www.figma.com/design/aadh2KN9IgfjlrDEfzDLNM/Untitled?node-id=38-2
- Mobile 390: https://www.figma.com/design/aadh2KN9IgfjlrDEfzDLNM/Untitled?node-id=39-2

Экраны содержат отдельные редактируемые слои и векторы, а не общий снимок. Проверены реальные размеры в Figma: 1440×1268, 1024×1438 и 390×2624. Псевдоним веб-шрифта SborkaInter заменён на Inter.

Старые экраны 19:2327 / 19:3418 / 19:4509 построены приближённо и не являются актуальным макетом. Старую команду плагина «Макеты UI» нельзя использовать для точного переноса. Библиотека компонентов той версии также не подтверждена как точное соответствие новому переносу.

Повторный перенос: node capture-build.mjs, затем node server.mjs. Страница /capture.html?demo=1 использует официальный инструмент HTML-to-Figma; обычный index.html не подключает его. Для модальных окон доступны параметры modal=svg, modal=palette, modal=project.

Скриншоты проверки находятся в screenshots/exact-transfer. Амире материалы не отправлялись.

Окна из приложения:
- Импорт SVG: https://www.figma.com/design/aadh2KN9IgfjlrDEfzDLNM/Untitled?node-id=44-2
- Импорт палитры: https://www.figma.com/design/aadh2KN9IgfjlrDEfzDLNM/Untitled?node-id=46-2
- Открытие проекта: https://www.figma.com/design/aadh2KN9IgfjlrDEfzDLNM/Untitled?node-id=47-2

Актуальная страница: «Сборка · Точный макет приложения». Приближённые экраны и компоненты первой версии помечены как архив. Пять промежуточных переносов с пустыми превью удалены.
