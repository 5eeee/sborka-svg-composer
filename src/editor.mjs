import { setupWorkspace, finishStartup } from "./ui/workspace.mjs";
import { uniqueId } from "./domain/ids.mjs";
import { toast, openFileDialog, bindFileDialogs } from "./ui/dialogs.mjs";
import {
  OBJECTS,
  pickObjects,
  analyzeIdea,
  fitObjects,
  fitBackground,
  clamp,
  validPalette,
  backgroundTones,
  recolor,
  resizeScene,
} from "../core.mjs";
const $ = (s) => document.querySelector(s),
  NS = "http://www.w3.org/2000/svg";
const demoMode =
  typeof location !== "undefined" &&
  new URLSearchParams(location.search).has("demo");
const palettes = {
  lilac: {
    background: "#D7CDF5",
    objects: [
      "#D7CDF5",
      "#F9ECB0",
      "#AA9BF0",
      "#F9A3AA",
      "#7864D7",
      "#FFE3E1",
      "#181817",
      "#FFFFFF",
    ],
  },
  apricot: {
    background: "#FDD7B9",
    objects: [
      "#FDD7B9",
      "#F9ECB0",
      "#FAC896",
      "#80DADA",
      "#D27532",
      "#BEEBEB",
      "#181817",
      "#FFFFFF",
    ],
  },
  aqua: {
    background: "#BEEBEB",
    objects: [
      "#BEEBEB",
      "#FFD4F2",
      "#80DADA",
      "#6D7BFC",
      "#5ABEBE",
      "#B6C6FE",
      "#181817",
      "#FFFFFF",
    ],
  },
};
palettes.lilac.backgroundObjects = ["#D7CDF5", "#7864D7"];
palettes.apricot.backgroundObjects = ["#FDD7B9", "#D27532"];
palettes.aqua.backgroundObjects = ["#BEEBEB", "#5ABEBE"];
let manifest = [],
  assets = new Map(),
  customAssets = [],
  library = [...OBJECTS],
  state = {
    w: 1200,
    h: 630,
    size: "L",
    palette: "original",
    bg: "#D7CDF5",
    objects: [],
    variant: 0,
    idea: "Обучение без отвлечений",
    customPalette: null,
    backgroundEnabled: true,
  },
  selected = null,
  undo = [],
  drag = null;
bindFileDialogs();
function snapshot(preserveFormat = false) {
  undo.push(JSON.stringify(state));
  if (!preserveFormat) delete state.formatBasis;
  if (undo.length > 50) undo.shift();
  $("#undo").disabled = false;
}
function persist() {
  if (demoMode) return;
  try {
    localStorage.setItem(
      "svg-assembly",
      JSON.stringify({ version: 1, state, customAssets }),
    );
  } catch {
    toast("Память браузера заполнена. Сохраните проект файлом.");
  }
}
function sanitize(raw) {
  const doc = new DOMParser().parseFromString(raw, "image/svg+xml");
  if (
    doc.querySelector("parsererror") ||
    doc.documentElement.localName !== "svg"
  )
    throw Error("Файл не является корректным SVG");
  if (raw.length > 2000000) throw Error("SVG должен быть не больше 2 МБ");
  doc
    .querySelectorAll(
      "script,foreignObject,image,style,animate,animateTransform,set,iframe,audio,video",
    )
    .forEach((e) => e.remove());
  for (const e of doc.querySelectorAll("*"))
    for (const a of [...e.attributes])
      if (
        /^on/i.test(a.name) ||
        (/href$/i.test(a.name) && !a.value.startsWith("#")) ||
        [...a.value.matchAll(/url\(\s*([^)]*)\)/gi)].some(
          (m) => !/^#[\w:-]+$/.test(m[1]),
        )
      )
        e.removeAttribute(a.name);
  return doc.documentElement;
}
function makeObject(o) {
  const role = o.background ? "background:" : "";
  const raw =
    assets.get(state.size + ":" + role + o.id) ||
    assets.get(state.size + ":" + o.id) ||
    assets.get("L:" + o.id);
  if (!raw) return null;
  const root = sanitize(raw);
  const dims = (root.getAttribute("viewBox") || "0 0 100 100")
      .split(/[ ,]+/)
      .map(Number),
    ratio = dims[3] / dims[2];
  const h = o.w * ratio;
  root.setAttribute("x", -o.w / 2);
  root.setAttribute("y", -h / 2);
  root.setAttribute("width", o.w);
  root.setAttribute("height", h);
  root.setAttribute("overflow", "visible");
  const ids = new Map();
  root.querySelectorAll("[id]").forEach((e) => {
    const old = e.id;
    ids.set(old, o.uid + "_id" + ids.size);
    e.id = ids.get(old);
  });
  for (const e of [root, ...root.querySelectorAll("*")])
    for (const a of [...e.attributes]) {
      let v = a.value;
      v = v.replace(/url\(#([^)]+)\)/g, (m, id) =>
        ids.has(id) ? "url(#" + ids.get(id) + ")" : m,
      );
      if (
        (a.name === "href" || a.name === "xlink:href") &&
        v.startsWith("#") &&
        ids.has(v.slice(1))
      )
        v = "#" + ids.get(v.slice(1));
      if (a.name === "fill" || a.name === "stroke" || a.name === "stop-color")
        v = recolor(
          v,
          state.palette === "custom"
            ? state.customPalette
            : palettes[state.palette],
          o.background,
        );
      e.setAttribute(a.name, v);
    }
  const g = document.createElementNS(NS, "g");
  g.setAttribute("transform", `translate(${o.x} ${o.y}) rotate(${o.r})`);
  g.setAttribute("data-uid", o.uid);
  g.setAttribute("data-object", o.id);
  g.setAttribute(
    "id",
    (o.background ? "background-" : "object-") + o.id + "-" + o.uid,
  );
  g.setAttribute("class", "scene-object");
  if (o.hidden) g.setAttribute("display", "none");
  g.append(root);
  return { g, h };
}
function render() {
  if (state.bgMode !== "manual") {
    const p =
      state.palette === "custom"
        ? state.customPalette
        : palettes[state.palette];
    state.bg = p?.background || "#D7CDF5";
  }
  const canvas = $("#canvas");
  canvas.replaceChildren();
  canvas.setAttribute("viewBox", `0 0 ${state.w} ${state.h}`);
  canvas.style.aspectRatio = `${state.w}/${state.h}`;
  canvas.style.maxWidth = `${(60 * state.w) / state.h}vh`;
  const bg = document.createElementNS(NS, "rect");
  bg.setAttribute("width", state.w);
  bg.setAttribute("height", state.h);
  bg.setAttribute("fill", state.bg);
  bg.setAttribute("data-background", "true");
  canvas.append(bg);
  const backdrop = assets.get(
    "canvas:" +
      state.size +
      ":" +
      (state.palette === "original" ? "lilac" : state.palette),
  );
  if (backdrop && state.canvasArtwork !== false && state.bgMode !== "manual") {
    const art = sanitize(backdrop);
    art.setAttribute("x", 0);
    art.setAttribute("y", 0);
    art.setAttribute("width", state.w);
    art.setAttribute("height", state.h);
    art.setAttribute("preserveAspectRatio", "xMidYMid slice");
    art.setAttribute("data-canvas-artwork", "true");
    art.style.pointerEvents = "none";
    canvas.append(art);
  }
  $("#canvasArtwork").checked = state.canvasArtwork !== false;
  for (const o of state.objects) {
    const built = makeObject(o);
    if (!built) continue;
    canvas.append(built.g);
    if (o.uid === selected && !o.hidden) {
      const ring = document.createElementNS(NS, "rect");
      ring.setAttribute("x", -o.w / 2 - 7);
      ring.setAttribute("y", -built.h / 2 - 7);
      ring.setAttribute("width", o.w + 14);
      ring.setAttribute("height", built.h + 14);
      ring.setAttribute("transform", `translate(${o.x} ${o.y}) rotate(${o.r})`);
      ring.setAttribute("fill", "none");
      ring.setAttribute(
        "stroke",
        getComputedStyle(document.documentElement)
          .getPropertyValue("--focus")
          .trim() || "#7864d7",
      );
      ring.setAttribute("stroke-width", "2");
      ring.setAttribute("stroke-dasharray", "6 5");
      ring.setAttribute("pointer-events", "none");
      ring.setAttribute("data-selection", "true");
      canvas.append(ring);
    }
  }
  document
    .querySelectorAll("[data-format]")
    .forEach((b) =>
      b.setAttribute(
        "aria-pressed",
        b.dataset.format ===
          ($("#format").querySelector(`option[value="${state.w},${state.h}"]`)
            ? state.w + "," + state.h
            : "custom"),
      ),
    );
  document
    .querySelectorAll("[data-palette]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", b.dataset.palette === state.palette),
    );
  $("#sizeS").setAttribute("aria-pressed", state.size === "S");
  $("#sizeL").setAttribute("aria-pressed", state.size === "L");
  $("#format").value = ["1200,630", "1080,1080", "1080,1350"].includes(
    state.w + "," + state.h,
  )
    ? state.w + "," + state.h
    : "custom";
  $("#customSize").hidden = $("#format").value !== "custom";
  $("#canvasW").value = state.w;
  $("#canvasH").value = state.h;
  $("#customPalette").hidden = state.palette !== "custom";
  $("#bgColor").value = state.bg;
  $("#bgHex").value = state.bg.slice(1).toUpperCase();
  $("#palette").value = state.palette;
  document.querySelectorAll(".palette-preview i").forEach((el, i) => {
    el.style.backgroundColor = (
      state.palette === "custom"
        ? state.customPalette
        : palettes[state.palette] || palettes.lilac
    ).objects[i];
  });
  $("#backgroundObjects").checked = state.backgroundEnabled !== false;
  const bgNames = state.objects
    .filter((o) => o.background && !o.hidden)
    .map((o) => library.find((a) => a.id === o.id)?.name || o.id);
  $("#backgroundInfo").textContent = bgNames.length
    ? "Задний план: " + bgNames.join(", ")
    : "Объекты заднего плана не добавлены";
  $("#canvasColorInfo").textContent =
    "Цвет холста " +
    state.bg.toUpperCase() +
    (state.bgMode === "manual" ? " выбран вручную" : " задан палитрой");
  $("#layerCount").textContent = state.objects.length;
  $("#sceneInfo").textContent =
    `${state.w} × ${state.h} px / ${state.size} / ${state.objects.length} объектов`;
  $("#undo").disabled = !undo.length;
  renderLayers();
  renderControls();
  persist();
}
function renderLayers() {
  const box = $("#layers");
  box.replaceChildren();
  [...state.objects].reverse().forEach((o) => {
    const b = document.createElement("button");
    b.className = "layer" + (selected === o.uid ? " selected" : "");
    b.setAttribute("aria-pressed", selected === o.uid);
    const img = document.createElement("img");
    img.src = assetUrl(o.id, o.background);
    img.alt = "";
    const name = document.createElement("span");
    name.className = "layer-name";
    name.textContent = library.find((a) => a.id === o.id)?.name || o.id;
    b.append(img, name);
    if (o.background) {
      const s = document.createElement("small");
      s.textContent = "фон";
      b.append(s);
    }
    b.onclick = () => {
      selected = o.uid;
      render();
    };
    box.append(b);
  });
}
function renderControls() {
  const o = state.objects.find((o) => o.uid === selected);
  $("#objectControls").disabled = !o;
  $("#objBackground").checked = !!o?.background;
  $("#selectedName").textContent = o
    ? library.find((a) => a.id === o.id)?.name || o.id
    : "Не выбран";
  for (const [id, key] of [
    ["objX", "x"],
    ["objY", "y"],
    ["objR", "r"],
  ])
    $("#" + id).value = o ? Math.round(o[key]) : "";
  $("#delete").disabled = !o;
  $("#forward").disabled = !o;
  $("#backward").disabled = !o;
}
function assetUrl(id, background = false) {
  const role = background ? "background:" : "";
  const raw =
    assets.get(state.size + ":" + role + id) || assets.get("L:" + role + id);
  return raw
    ? "data:image/svg+xml;charset=utf-8," + encodeURIComponent(raw)
    : "";
}
function renderLibrary() {
  const filter = $("#assetSearch").value.toLowerCase();
  const box = $("#libraryGrid");
  box.replaceChildren();
  const matches = library.filter((a) => a.name.toLowerCase().includes(filter));
  if (!matches.length) {
    const empty = document.createElement("p");
    empty.className = "empty-library";
    empty.textContent = "Ничего не найдено. Попробуйте другое название.";
    box.append(empty);
  }
  matches.forEach((a) => {
    const b = document.createElement("button");
    b.className = "asset";
    b.title = "Добавить: " + a.name;
    const img = document.createElement("img");
    img.src = assetUrl(a.id);
    img.alt = "";
    b.append(img, document.createTextNode(a.name));
    b.onclick = () => {
      snapshot();
      const item = {
        uid: "o" + uniqueId().replaceAll("-", ""),
        id: a.id,
        x: state.w / 2,
        y: state.h / 2,
        w: objectDimensions()[a.id]
          ? objectDimensions()[a.id].w * sceneScale()
          : Math.min(state.w, state.h) * 0.45,
        r: 0,
        background: false,
      };
      state.objects.push(item);
      normalizeSceneSizes();
      selected = item.uid;
      render();
    };
    box.append(b);
  });
}
function objectDimensions(background = false) {
  return Object.fromEntries(
    manifest
      .filter(
        (a) =>
          a.size === state.size &&
          a.role === (background ? "background" : "main"),
      )
      .map((a) => [a.id, { w: a.viewBox[2], h: a.viewBox[3] }]),
  );
}
function sceneScale() {
  const main = state.objects.find(
    (o) => !o.background && objectDimensions()[o.id],
  );
  return main
    ? main.w / objectDimensions()[main.id].w
    : Math.min(state.w, state.h) / 1500;
}
function normalizeSceneSizes() {
  const scale = sceneScale();
  let limit = 1;
  for (const o of state.objects) {
    const d = objectDimensions(o.background)[o.id];
    if (d) {
      o.w = d.w * scale;
      limit = Math.min(
        limit,
        (state.w * 0.86) / o.w,
        (state.h * 0.86) / (d.h * scale),
      );
    }
  }
  if (limit < 1) for (const o of state.objects) o.w *= limit;
}
function objectRatios(background = false) {
  return Object.fromEntries(
    manifest
      .filter(
        (a) =>
          a.size === state.size &&
          a.role === (background ? "background" : "main"),
      )
      .map((a) => [a.id, a.viewBox[3] / a.viewBox[2]]),
  );
}
function backgroundFor(result, objects, variant) {
  if (!result.backgroundIds.length) return null;
  const id = result.backgroundIds[variant % result.backgroundIds.length];
  return fitBackground(
    id,
    state.w,
    state.h,
    objects,
    variant,
    objectRatios(true)[id],
    objectDimensions(true)[id]?.w * sceneScale(),
  );
}
function compose(variant = 0) {
  const result = analyzeIdea($("#idea").value);
  if (!result.matched) {
    toast(
      "Нет уверенного соответствия в библиотеке. Добавьте нужные предметы вручную.",
    );
    $("#explanation").textContent =
      "Идея не распознана. Текущая композиция сохранена, случайные предметы не добавлены.";
    return;
  }
  snapshot();
  state.idea = $("#idea").value;
  state.variant = variant;
  state.backgroundEnabled = $("#backgroundObjects").checked;
  state.objects = fitObjects(
    result.ids,
    state.w,
    state.h,
    variant,
    objectRatios(),
    objectDimensions(),
  );
  const bg = state.backgroundEnabled
    ? backgroundFor(result, state.objects, variant)
    : null;
  if (bg) state.objects.unshift(bg);
  normalizeSceneSizes();
  selected = state.objects.find((o) => !o.background)?.uid;
  $("#explanation").textContent =
    "Основные предметы: " +
    result.ids.map((id) => library.find((a) => a.id === id).name).join(", ") +
    ". " +
    (bg
      ? "Задний план: " + library.find((a) => a.id === bg.id).name + ". "
      : "Для заднего плана нет уверенного соответствия. ") +
    "Цвет холста задаётся отдельно палитрой или вручную.";
  render();
}
function download(name, data, type) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(new Blob([data], { type }));
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportSvg() {
  const out = $("#canvas").cloneNode(true);
  out.querySelectorAll("[data-selection]").forEach((n) => n.remove());
  out.removeAttribute("tabindex");
  out.removeAttribute("role");
  out.removeAttribute("aria-label");
  out.removeAttribute("id");
  out.removeAttribute("style");
  out.setAttribute("width", state.w);
  out.setAttribute("height", state.h);
  const title = document.createElementNS(NS, "title");
  title.textContent = $("#idea").value || "Композиция";
  out.prepend(title);
  const raw = new XMLSerializer().serializeToString(out);
  if (/<image\b|<script\b|<foreignObject\b/.test(raw))
    throw Error("Экспорт содержит недопустимый элемент");
  download(
    "composition.svg",
    '<?xml version="1.0" encoding="UTF-8"?>\n' + raw,
    "image/svg+xml",
  );
  toast("SVG сохранён. Объекты остались векторными.");
}
document.querySelectorAll("[data-format]").forEach(
  (b) =>
    (b.onclick = () => {
      $("#format").value = b.dataset.format;
      $("#format").dispatchEvent(new Event("change", { bubbles: true }));
      document
        .querySelectorAll("[data-format]")
        .forEach((choice) => choice.setAttribute("aria-pressed", choice === b));
    }),
);
document.querySelectorAll("[data-palette]").forEach(
  (b) =>
    (b.onclick = () => {
      $("#palette").value = b.dataset.palette;
      $("#palette").dispatchEvent(new Event("change", { bubbles: true }));
    }),
);
$("#composeForm").onsubmit = (e) => {
  e.preventDefault();
  compose(0);
};
$("#shuffle").onclick = () => compose(state.variant + 1);
document.querySelectorAll("[data-idea]").forEach(
  (b) =>
    (b.onclick = () => {
      $("#idea").value = b.dataset.idea;
      compose(0);
    }),
);
$("#assetSearch").oninput = renderLibrary;
for (const size of ["S", "L"])
  $("#size" + size).onclick = () => {
    snapshot();
    state.size = size;
    normalizeSceneSizes();
    renderLibrary();
    render();
  };
$("#format").onchange = (e) => {
  $("#customSize").hidden = e.target.value !== "custom";
  if (e.target.value === "custom") return;
  snapshot(true);
  const [w, h] = e.target.value.split(",").map(Number);
  resize(w, h);
};
function resize(w, h) {
  resizeScene(state, w, h);
  render();
}
$("#applySize").onclick = () => {
  snapshot(true);
  resize(
    clamp($("#canvasW").value, 200, 5000),
    clamp($("#canvasH").value, 200, 5000),
  );
};
$("#palette").onchange = (e) => {
  if (e.target.value === "custom" && !state.customPalette)
    state.customPalette = validPalette({
      background: state.bg,
      objects: ["#aa9bf0", "#f9a3aa", "#d7cdf5"],
    });
  snapshot();
  state.palette = e.target.value;
  $("#customPalette").hidden = state.palette !== "custom";
  if (palettes[state.palette]) {
    state.bg = palettes[state.palette].background;
    state.bgMode = "palette";
  } else if (state.palette === "original") {
    state.bg = "#D7CDF5";
    state.bgMode = "palette";
  }
  render();
};
$("#bgColor").oninput = (e) => {
  snapshot();
  state.bg = e.target.value;
  state.bgMode = "manual";
  render();
};
$("#applyPalette").onclick = () => {
  try {
    const tones = backgroundTones(state.bg);
    const palette = validPalette({
      background: state.bg,
      objects: [
        tones[0],
        $("#secondary").value,
        $("#accent").value,
        $("#secondary").value,
        tones[1],
        $("#light").value,
        "#181817",
        "#ffffff",
      ],
      backgroundObjects: tones,
    });
    snapshot();
    state.customPalette = palette;
    state.palette = "custom";
    render();
  } catch (e) {
    toast(e.message);
  }
};
$("#canvasArtwork").onchange = (e) => {
  snapshot();
  state.canvasArtwork = e.target.checked;
  render();
};
$("#bgHex").onchange = (e) => {
  const color = "#" + e.target.value.replace(/^#/, "");
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    toast("Введите шесть цифр HEX");
    render();
    return;
  }
  snapshot();
  state.bg = color;
  state.bgMode = "manual";
  render();
};
$("#resetBg").onclick = () => {
  snapshot();
  state.bg =
    (state.palette === "custom" ? state.customPalette : palettes[state.palette])
      ?.background || "#D7CDF5";
  state.bgMode = "palette";
  render();
};
$("#paletteFileBtn").onclick = () => openFileDialog("palette");
$("#paletteFile").onchange = async (e) => {
  try {
    const f = e.target.files[0];
    if (!f) return;
    const p = validPalette(JSON.parse(await f.text()));
    snapshot();
    state.customPalette = p;
    state.palette = "custom";
    state.bg = p.background;
    state.bgMode = "palette";
    $("#customPalette").hidden = false;
    render();
    toast("Палитра загружена");
  } catch (err) {
    toast(err.message);
  } finally {
    e.target.value = "";
  }
};
$("#objBackground").onchange = (e) => {
  const o = state.objects.find((o) => o.uid === selected);
  if (!o) return;
  if (!OBJECTS.some((a) => a.id === o.id)) {
    e.target.checked = false;
    toast("Для импортированного объекта нет исходного фонового варианта");
    return;
  }
  snapshot();
  o.background = e.target.checked;
  normalizeSceneSizes();
  if (o.background) {
    state.backgroundEnabled = true;
    o.hidden = false;
  }
  render();
};
function removeSelected() {
  if (!selected) return;
  snapshot();
  state.objects = state.objects.filter((o) => o.uid !== selected);
  selected = null;
  render();
}
$("#delete").onclick = removeSelected;
$("#duplicate").onclick = () => {
  const o = state.objects.find((o) => o.uid === selected);
  if (!o) return;
  snapshot();
  const copy = { ...o, uid: "o" + uniqueId(), x: o.x + 30, y: o.y + 30 };
  state.objects.push(copy);
  selected = copy.uid;
  render();
};
for (const [id, key] of [
  ["objX", "x"],
  ["objY", "y"],
  ["objR", "r"],
])
  $("#" + id).oninput = (e) => {
    const o = state.objects.find((o) => o.uid === selected);
    if (
      !o ||
      e.target.value.trim() === "" ||
      !Number.isFinite(Number(e.target.value))
    )
      return;
    snapshot();
    o[key] =
      key === "r"
        ? clamp(e.target.value, -180, 180)
        : clamp(e.target.value, -5000, 10000);
    render();
  };
for (const [id, direction] of [
  ["backward", -1],
  ["forward", 1],
])
  $("#" + id).onclick = () => {
    const i = state.objects.findIndex((o) => o.uid === selected),
      j = i + direction;
    if (i < 0 || j < 0 || j >= state.objects.length) return;
    snapshot();
    [state.objects[i], state.objects[j]] = [state.objects[j], state.objects[i]];
    render();
  };
$("#backgroundObjects").onchange = (e) => {
  snapshot();
  state.backgroundEnabled = e.target.checked;
  state.objects.forEach((o) => {
    if (o.background) o.hidden = !e.target.checked;
  });
  if (e.target.checked && !state.objects.some((o) => o.background)) {
    const result = analyzeIdea(state.idea),
      bg = backgroundFor(result, state.objects, state.variant || 0);
    if (bg) {
      state.objects.unshift(bg);
      normalizeSceneSizes();
    } else
      toast("Выберите предмет вручную и включите для него «На задний план»");
  }
  render();
};
$("#clear").onclick = () => {
  if (!state.objects.length) return;
  snapshot();
  state.objects = [];
  selected = null;
  render();
};
$("#undo").onclick = () => {
  if (!undo.length) return;
  state = JSON.parse(undo.pop());
  selected = null;
  renderLibrary();
  render();
};
$("#export").onclick = () => {
  try {
    exportSvg();
  } catch (e) {
    toast(e.message);
  }
};
$("#saveProject").onclick = () =>
  download(
    "composition-project.json",
    JSON.stringify({ version: 1, state, customAssets }, null, 2),
    "application/json",
  );
$("#loadProjectBtn").onclick = () => openFileDialog("project");
$("#projectFile").onchange = async (e) => {
  try {
    const f = e.target.files[0];
    if (!f) return;
    const p = JSON.parse(await f.text());
    if (
      p.version !== 1 ||
      !p.state ||
      !/^#[0-9a-f]{6}$/i.test(p.state.bg) ||
      !Array.isArray(p.state.objects) ||
      p.state.objects.length > 100
    )
      throw Error("Некорректный проект");
    if (
      !["S", "L"].includes(p.state.size) ||
      !Number.isFinite(p.state.w) ||
      !Number.isFinite(p.state.h) ||
      p.state.w < 200 ||
      p.state.w > 5000 ||
      p.state.h < 200 ||
      p.state.h > 5000
    )
      throw Error("Некорректный размер проекта");
    const ca = p.customAssets || [];
    for (const a of ca) {
      a.svg = new XMLSerializer().serializeToString(sanitize(a.svg));
    }
    const allowed = new Set([
      ...OBJECTS.map((o) => o.id),
      ...ca.map((o) => o.id),
    ]);
    for (const o of p.state.objects)
      if (
        !allowed.has(o.id) ||
        !["x", "y", "w", "r"].every((k) => Number.isFinite(o[k])) ||
        o.w <= 0 ||
        o.w > 5000
      )
        throw Error("Некорректный объект проекта");
    if (p.state.palette === "custom")
      p.state.customPalette = validPalette(p.state.customPalette);
    snapshot();
    customAssets = ca;
    registerCustom();
    state = p.state;
    normalizeSceneSizes();
    $("#idea").value = state.idea || "";
    selected = null;
    renderLibrary();
    render();
    toast("Проект открыт");
  } catch (err) {
    toast(err.message);
  } finally {
    e.target.value = "";
  }
};
function registerCustom() {
  library = [
    ...OBJECTS,
    ...customAssets.map((a) => ({ id: a.id, name: a.name, tags: [] })),
  ];
  for (const a of customAssets)
    for (const size of ["S", "L"]) assets.set(size + ":" + a.id, a.svg);
}
$("#importBtn").onclick = () => openFileDialog("svg");
$("#importFiles").onchange = async (e) => {
  let count = 0;
  for (const f of e.target.files) {
    try {
      const svg = sanitize(await f.text());
      if (!svg.hasAttribute("viewBox")) {
        const w = parseFloat(svg.getAttribute("width")),
          h = parseFloat(svg.getAttribute("height"));
        if (!(w > 0 && h > 0)) throw Error("Нет viewBox или размеров");
        svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      }
      customAssets.push({
        id: "custom-" + uniqueId(),
        name: f.name.replace(/\.svg$/i, ""),
        svg: new XMLSerializer().serializeToString(svg),
      });
      count++;
    } catch (err) {
      toast(f.name + ": " + err.message);
    }
  }
  registerCustom();
  renderLibrary();
  persist();
  if (count) toast(`Добавлено SVG: ${count}`);
  e.target.value = "";
};
function point(e) {
  const p = $("#canvas").createSVGPoint();
  p.x = e.clientX;
  p.y = e.clientY;
  return p.matrixTransform($("#canvas").getScreenCTM().inverse());
}
$("#canvas").onpointerdown = (e) => {
  const g = e.target.closest("[data-uid]");
  if (!g) {
    selected = null;
    render();
    return;
  }
  selected = g.dataset.uid;
  const o = state.objects.find((o) => o.uid === selected);
  snapshot();
  const p = point(e);
  drag = { uid: o.uid, dx: p.x - o.x, dy: p.y - o.y };
  $("#canvas").setPointerCapture(e.pointerId);
  render();
};
$("#canvas").onpointermove = (e) => {
  if (!drag) return;
  const p = point(e),
    o = state.objects.find((o) => o.uid === drag.uid);
  o.x = clamp(p.x - drag.dx, -state.w, state.w * 2);
  o.y = clamp(p.y - drag.dy, -state.h, state.h * 2);
  render();
};
$("#canvas").onpointerup = () => (drag = null);
$("#canvas").onpointercancel = () => (drag = null);
document.onkeydown = (e) => {
  if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName))
    return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    $("#undo").click();
    return;
  }
  if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    removeSelected();
  }
  const o = state.objects.find((o) => o.uid === selected);
  if (
    !o ||
    !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
  )
    return;
  e.preventDefault();
  snapshot();
  const step = e.shiftKey ? 10 : 1;
  if (e.key === "ArrowLeft") o.x -= step;
  if (e.key === "ArrowRight") o.x += step;
  if (e.key === "ArrowUp") o.y -= step;
  if (e.key === "ArrowDown") o.y += step;
  render();
};
setupWorkspace();
async function init() {
  try {
    if (globalThis.__SBORKA_LIBRARY__) {
      manifest = globalThis.__SBORKA_MANIFEST__;
      assets = new Map(Object.entries(globalThis.__SBORKA_LIBRARY__));
    } else {
      manifest = await (await fetch("assets/manifest.json")).json();
      await Promise.all(
        manifest.map(async (a) => {
          const raw = await (await fetch(a.path)).text();
          sanitize(raw);
          assets.set(
            a.size +
              ":" +
              (a.role === "background" ? "background:" : "") +
              a.id,
            raw,
          );
        }),
      );
      await Promise.all(
        ["S", "L"].flatMap((size) =>
          ["lilac", "apricot", "aqua"].map(async (name) => {
            assets.set(
              "canvas:" + size + ":" + name,
              await (
                await fetch("assets/backgrounds/" + size + "-" + name + ".svg")
              ).text(),
            );
          }),
        ),
      );
    }
    const saved = demoMode ? null : localStorage.getItem("svg-assembly");
    if (saved) {
      try {
        const p = JSON.parse(saved);
        customAssets = p.customAssets || [];
        registerCustom();
        if (
          p.version === 1 &&
          p.state?.objects?.every((o) => library.some((a) => a.id === o.id))
        )
          state = p.state;
      } catch {
        localStorage.removeItem("svg-assembly");
      }
    }
    document
      .querySelectorAll("button,input,textarea,select")
      .forEach((e) => (e.disabled = false));
    $("#idea").value = state.idea || "Обучение без отвлечений";
    renderLibrary();
    if (state.backgroundEnabled === undefined)
      state.backgroundEnabled = !state.objects.some(
        (o) => o.background && o.hidden,
      );
    if (state.palette === "custom") {
      try {
        state.customPalette = validPalette(state.customPalette);
      } catch {
        state.palette = "original";
        toast(
          "Старая палитра не прошла проверку ролей. Загрузите исправленную.",
        );
      }
    }
    if (!state.objects.length) compose(0);
    else {
      normalizeSceneSizes();
      render();
    }
  } catch (e) {
    $("#sceneInfo").textContent = "Не удалось загрузить библиотеку";
    toast(e.message);
    await finishStartup(e);
    return;
  }
  await finishStartup();
}
document
  .querySelectorAll("button,input,textarea,select")
  .forEach((e) => (e.disabled = true));
init();
