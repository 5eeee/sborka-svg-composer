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
  document.querySelector("#composeForm").after(ideas);
  const compose = document.querySelector("#composeForm");
  const submit = compose.querySelector("button[type=submit]");
  submit.textContent = "Собрать идею";
  const actions = document.createElement("div");
  actions.className = "compose-actions";
  submit.before(actions);
  actions.append(submit);
  const generate = document.createElement("button");
  generate.type = "button";
  generate.id = "generateIdea";
  generate.setAttribute("aria-label", "Сгенерировать идею");
  generate.innerHTML = `<svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M15 3l3.5 8.5L27 15l-8.5 3.5L15 27l-3.5-8.5L3 15l8.5-3.5L15 3Z" fill="#D9C5FF"/><path d="M15 3v12H3l8.5-3.5L15 3Z" fill="#FF63BC"/><path d="M27 15H15v12l3.5-8.5L27 15Z" fill="#83E4DA"/><path d="M26 2l1.3 3.7L31 7l-3.7 1.3L26 12l-1.3-3.7L21 7l3.7-1.3L26 2Z" fill="#FFE598"/><circle cx="5" cy="26" r="2" fill="#FF85B8"/></svg>`;
  generate.title = "Предложить идею для композиции";
  generate.addEventListener("click", () => {
    const field = document.querySelector("#idea");
    const examples = [...document.querySelectorAll("[data-idea]")]
      .map((b) => b.dataset.idea)
      .filter((t) => t !== field.value);
    field.value = examples[Math.floor(Math.random() * examples.length)];
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.focus({ preventScroll: true });
  });
  actions.append(generate);
  ideas.tabIndex = 0;
  ideas.setAttribute("aria-label", "Примеры идей для генерации");
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
  setupIdeaTyping();
  document.body.classList.add("workspace-ready");
  splash.classList.add("leaving");
  splash.addEventListener("transitionend", () => splash.remove(), {
    once: true,
  });
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) splash.remove();
}

function setupIdeaTyping() {
  const field = document.querySelector("#idea");
  if (!field || field.dataset.typingReady) return;
  field.dataset.typingReady = "true";
  // Keep saved user text; the initial example becomes an animated hint only.
  if (
    field.value.trim() === "Обучение без отвлечений" &&
    !localStorage.getItem("svg-assembly")
  )
    field.value = "";
  const examples = [...document.querySelectorAll("[data-idea]")].map(
    (b) => b.dataset.idea,
  );
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    field.placeholder = "Например: " + examples[0];
    return;
  }
  let index = 0,
    chars = 0,
    deleting = false,
    timer;
  const tick = () => {
    clearTimeout(timer);
    if (document.activeElement === field || field.value || document.hidden)
      return;
    const text = examples[index];
    chars += deleting ? -1 : 1;
    field.placeholder = text.slice(0, chars) + "│";
    let delay = deleting ? 35 : 85;
    if (chars >= text.length) {
      deleting = true;
      delay = 1600;
    }
    if (chars <= 0) {
      deleting = false;
      index = (index + 1) % examples.length;
      delay = 350;
    }
    timer = setTimeout(tick, delay);
  };
  field.addEventListener("focus", () => {
    clearTimeout(timer);
    field.placeholder = "Опишите вашу идею";
  });
  field.addEventListener("input", () => clearTimeout(timer));
  field.addEventListener("blur", tick);
  document.addEventListener("visibilitychange", () => {
    clearTimeout(timer);
    if (!document.hidden) tick();
  });
  tick();
}
