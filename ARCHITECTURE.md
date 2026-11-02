# Архитектура

Browser -> core.mjs semantic matching / layout -> app.js SVG DOM -> SVG / project JSON.

Sources -> prepare_assets.py -> assets/{S,L}/{main,background} -> manifest.json.

Данные проекта находятся только в localStorage или скачанном JSON. Сервер раздаёт статические файлы, не содержит ключей и не открывает внешних API. Геометрия SVG сохраняется в исходных path, преобразования применяются к группе экземпляра.
