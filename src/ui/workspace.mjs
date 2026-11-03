const icon = (name) => {
  const paths = {
    undo: "M8 5 3 10l5 5M3 10h10a7 7 0 0 1 0 14",
    save: "M5 3h12l4 4v14H3V3h2Zm2 0v7h10V3M7 21v-7h10v7",
    export: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
    left: "m14 5-7 7 7 7",
    right: "m10 5 7 7-7 7",
    grid: "M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6z",
    strip: "M2 5h7v14H2zM13 5h7v14h-7z",
    expand: "m8 10 4 4 4-4",
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]}"/></svg>`;
};
export function setupWorkspace() {
  const $ = (s) => document.querySelector(s);
  for (const [id, glyph, title] of [
    ["undo", "undo", "Отменить"],
    ["saveProject", "save", "Сохранить проект"],
    ["export", "export", "Скачать SVG"],
  ]) {
    const b = $("#" + id);
    b.innerHTML = icon(glyph) + `<span>${title}</span>`;
    b.setAttribute("aria-label", title);
    if (id === "saveProject")
      b.insertAdjacentHTML(
        "beforeend",
        "<span class=mobile-label>Проект</span>",
      );
    if (id === "export")
      b.insertAdjacentHTML("beforeend", "<span class=mobile-label>SVG</span>");
  }
  for (const [index, section] of [
    ...document.querySelectorAll(".inspector-section"),
  ].entries()) {
    const header =
      section.querySelector(".line-title") || section.querySelector("h2");
    const details = document.createElement("details");
    details.className = "settings-group";
    details.open = true;
    const summary = document.createElement("summary");
    summary.setAttribute(
      "aria-label",
      ["Настройки палитры", "Настройки объекта", "Слои"][index],
    );
    summary.append(header);
    summary.insertAdjacentHTML("beforeend", icon("expand"));
    const body = document.createElement("div");
    body.className = "settings-content";
    while (section.firstChild) body.append(section.firstChild);
    details.append(summary, body);
    section.append(details);
  }
  const grid = $("#libraryGrid");
  const toolbar = document.createElement("div");
  toolbar.className = "library-view-toolbar";
  toolbar.setAttribute("role", "group");
  toolbar.setAttribute("aria-label", "Вид библиотеки");
  toolbar.innerHTML = `<div class="view-switch"><button type="button" data-library-view="strip" aria-label="Библиотека лентой" aria-pressed="true">${icon("strip")}</button><button type="button" data-library-view="grid" aria-label="Библиотека сеткой три на три" aria-pressed="false">${icon("grid")}</button></div><div class="library-scroll-actions"><button type="button" data-scroll="-1" aria-label="Предыдущие объекты">${icon("left")}</button><button type="button" data-scroll="1" aria-label="Следующие объекты">${icon("right")}</button></div>`;
  grid.before(toolbar);
  grid.dataset.view = "strip";
  grid.tabIndex = 0;
  for (const b of toolbar.querySelectorAll("[data-library-view]"))
    b.onclick = () => {
      grid.dataset.view = b.dataset.libraryView;
      grid.scrollTo({ left: 0, top: 0 });
      for (const other of toolbar.querySelectorAll("[data-library-view]"))
        other.setAttribute("aria-pressed", other === b);
      expand.hidden = b.dataset.libraryView !== "grid";
      toolbar.querySelector(".library-scroll-actions").hidden =
        b.dataset.libraryView === "grid";
    };
  for (const b of toolbar.querySelectorAll("[data-scroll]"))
    b.onclick = () =>
      grid.scrollBy({
        left: Number(b.dataset.scroll) * Math.max(160, grid.clientWidth * 0.85),
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  const syncScroll = () => {
    const max = grid.scrollWidth - grid.clientWidth;
    toolbar.querySelector('[data-scroll="-1"]').disabled = grid.scrollLeft < 2;
    toolbar.querySelector('[data-scroll="1"]').disabled =
      grid.scrollLeft >= max - 2;
  };
  grid.addEventListener("scroll", syncScroll, { passive: true });
  new ResizeObserver(syncScroll).observe(grid);
  new MutationObserver(syncScroll).observe(grid, { childList: true });
  const expand = document.createElement("button");
  expand.type = "button";
  expand.className = "library-expand";
  expand.hidden = true;
  expand.setAttribute("aria-expanded", "false");
  expand.textContent = "Показать все объекты";
  expand.onclick = () => {
    const on = grid.classList.toggle("expanded");
    expand.setAttribute("aria-expanded", on);
    expand.textContent = on ? "Свернуть библиотеку" : "Показать все объекты";
  };
  grid.after(expand);
  const ideas = $(".ideas");
  ideas.tabIndex = 0;
  ideas.setAttribute(
    "aria-label",
    "Примеры идей, прокручиваются горизонтально",
  );
  $('[data-palette="custom"]').title = "Настроить собственные цвета";
  $('[data-palette="custom"]').addEventListener("click", () => {
    $("#customPalette").scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
    $("#accent").focus({ preventScroll: true });
  });
}
export async function finishStartup(error) {
  const splash = document.querySelector("#startup");
  if (!splash) return;
  if (error) {
    splash.classList.add("startup-error");
    splash.querySelector('[role="status"]').textContent =
      "Не удалось запустить редактор. Проверьте соединение и повторите.";
    const b = document.createElement("button");
    b.textContent = "Повторить запуск";
    b.onclick = () => location.reload();
    splash.append(b);
    return;
  }
  await document.fonts.ready;
  const imgs = [...document.querySelectorAll(".asset img")];
  await Promise.all(imgs.map((i) => i.decode().catch(() => {})));
  document.body.classList.add("workspace-ready");
  splash.classList.add("leaving");
  splash.addEventListener("transitionend", () => splash.remove(), {
    once: true,
  });
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) splash.remove();
}
