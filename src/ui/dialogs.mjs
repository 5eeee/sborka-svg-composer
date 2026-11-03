const $ = (s) => document.querySelector(s);
export function toast(t) {
  const el = $("#toast");
  el.replaceChildren();
  const icon = document.createElement("span");
  icon.className = "toast-icon";
  const bad =
    /ошиб|некоррект|не удалось|нужн|выберите|нет |заполнен|отклон|недопустим|введите|цвет заднего плана совпадает/i.test(
      t,
    );
  icon.textContent = bad ? "!" : "✓";
  const text = document.createElement("span");
  text.textContent = t;
  const close = document.createElement("button");
  close.setAttribute("aria-label", "Закрыть уведомление");
  close.textContent = "×";
  close.onclick = () => el.classList.remove("show");
  el.append(icon, text, close);
  el.classList.toggle("notice", bad);
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(
    () => el.classList.remove("show"),
    bad ? 7500 : 4500,
  );
}
export function openFileDialog(kind) {
  const options = {
    svg: [
      "Импорт SVG",
      "Добавьте свои векторные объекты в библиотеку. Можно выбрать несколько файлов.",
      "SVG · несколько файлов",
      "#importFiles",
    ],
    palette: [
      "Импорт палитры",
      "Загрузите цветовую схему для холста, основных объектов и заднего плана.",
      "JSON · цветовая схема",
      "#paletteFile",
    ],
    project: [
      "Открыть проект",
      "Продолжите работу с сохранённой композицией. Размеры, цвета и расположение предметов восстановятся.",
      "JSON · проект «Сборки»",
      "#projectFile",
    ],
  };
  const [title, description, hint, target] = options[kind];
  $("#fileDialogTitle").textContent = title;
  $("#fileDialogDescription").textContent = description;
  $("#fileDialogHint").textContent = hint;
  $("#fileDialog").append($(target));
  $("#fileDialog .file-drop").onclick = () => $(target).click();
  $("#fileDialog").showModal();
}
export function bindFileDialogs() {
  $("#fileDialog .dialog-close").onclick = () => $("#fileDialog").close();
  $("#fileDialog").onclick = (e) => {
    if (e.target === $("#fileDialog")) {
      const r = e.target.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        e.target.close();
    }
  };
  for (const id of ["importFiles", "paletteFile", "projectFile"])
    $("#" + id).addEventListener("change", (e) => {
      if (e.target.files.length) $("#fileDialog").close();
    });
}
