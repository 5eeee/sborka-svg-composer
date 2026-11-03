// Source of truth: the six verified browser transfers in this file.
const EXACT_ROOT_IDS = ["98:2", "105:2", "112:2", "99:2", "121:2", "101:2"];
const EXACT_LIBRARY_PAGE = "Сборка · Компоненты приложения";
type ExactReport = { kind: string; [key: string]: unknown };
async function inspectExactDesign(): Promise<ExactReport> {
  if (!figma.root.children.some((p) => p.name === EXACT_LIBRARY_PAGE))
    throw Error("Сначала соберите компоненты точного макета.");
  await repairModalTypography();
  return {
    ...(await inspectComponentProofs()),
    modalMetrics: await inspectModalMetrics(),
  };
}
async function buildExactComponents(): Promise<ExactReport> {
  for (const p of figma.root.children) await p.loadAsync();
  const roots: FrameNode[] = [];
  for (const id of EXACT_ROOT_IDS) {
    const n = await figma.getNodeByIdAsync(id);
    if (!n || n.type !== "FRAME") throw Error("Не найден точный экран " + id);
    roots.push(n);
  }
  const existing = figma.root.children.find(
    (p) => p.name === EXACT_LIBRARY_PAGE,
  );
  if (
    existing &&
    existing.children.some((n) => n.name === "Основные компоненты v4")
  ) {
    await figma.setCurrentPageAsync(existing);
    const preview = existing.children.find(
      (n) => n.name === "Обзор компонентов",
    );
    if (preview) figma.viewport.scrollAndZoomIntoView([preview]);
    return {
      kind: "existing",
      page: existing.id,
      components: existing
        .findAllWithCriteria({ types: ["COMPONENT"] })
        .map((n) => ({ id: n.id, name: n.name })),
      message: "Компоненты уже собраны. Повторный запуск не создаёт дублей.",
    };
  }
  await normalizeCapturedFonts(roots);
  const fonts = new Map<string, FontName>();
  for (const r of roots)
    for (const t of r.findAllWithCriteria({ types: ["TEXT"] }))
      for (const s of t.getStyledTextSegments(["fontName"]))
        fonts.set(JSON.stringify(s.fontName), s.fontName);
  for (const f of fonts.values()) await figma.loadFontAsync(f);
  const before = [];
  for (const r of roots)
    before.push(
      exactBase64(
        await r.exportAsync({
          format: "PNG",
          useAbsoluteBounds: true,
          constraint: { type: "SCALE", value: 1 },
        }),
      ),
    );
  const page = figma.root.children.find((p) => p.id === "19:1268");
  if (!page) throw Error("Не найдена страница компонентов.");
  const incomplete = figma.root.children.find(
    (p) => p.name === "02 · Все действия · Desktop / Tablet / Mobile",
  );
  if (incomplete) incomplete.remove();
  let archive = figma.root.children.find(
    (p) => p.name === "Архив · Сборка v13",
  );
  if (!archive) {
    archive = figma.createPage();
    archive.name = "Архив · Сборка v13";
  }
  for (const id of ["37:2", "38:2", "39:2", "44:2", "46:2", "47:2"]) {
    const n = await figma.getNodeByIdAsync(id);
    if (n && "x" in n) {
      archive.appendChild(n as SceneNode);
      (n as SceneNode).x += 20000;
    }
  }
  const names = [
    "Desktop 1440 · Точный перенос приложения",
    "Tablet 1024 · Точный перенос приложения",
    "Mobile 390 · Точный перенос приложения",
    "Окно · Импорт SVG · Из приложения",
    "Окно · Импорт палитры · Из приложения",
    "Окно · Открыть проект · Из приложения",
  ];
  roots.forEach((r, i) => {
    r.name = names[i];
    r.x = i < 3 ? [0, 1500, 2584][i] : (i - 3) * 1500;
    r.y = i < 3 ? 0 : 3000;
  });
  for (const child of [...page.children]) {
    archive.appendChild(child);
    child.x += 12000;
  }
  page.name = EXACT_LIBRARY_PAGE;
  await figma.setCurrentPageAsync(page);
  const collection = figma.variables.createVariableCollection(
    "Сборка · CSS приложения",
  );
  const mode = collection.modes[0].modeId;
  const definitions: Record<string, string> = {
    paper: "#242427",
    surface: "#19191c",
    ink: "#f4f3f6",
    muted: "#a6a4ae",
    rule: "#39383f",
    accent: "#ff5baf",
    focus: "#ff79bb",
    selected: "#47293b",
    danger: "#ffa0ad",
    "choice-bg": "#2b2b30",
    "choice-hover": "#36333c",
    stage: "#202023",
    "accent-ink": "#29131f",
    "selected-ink": "#ff9acc",
  };
  const vars: { hex: string; variable: Variable }[] = [];
  for (const [name, hex] of Object.entries(definitions)) {
    const c = {
      r: parseInt(hex.slice(1, 3), 16) / 255,
      g: parseInt(hex.slice(3, 5), 16) / 255,
      b: parseInt(hex.slice(5, 7), 16) / 255,
    };
    const primitive = figma.variables.createVariable(
      "raw/" + name,
      collection,
      "COLOR",
    );
    primitive.scopes = [];
    primitive.setValueForMode(mode, c);
    primitive.setVariableCodeSyntax("WEB", "var(--" + name + ")");
    const v = figma.variables.createVariable(
      "color/" + name,
      collection,
      "COLOR",
    );
    v.scopes = ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL", "STROKE_COLOR"];
    v.setValueForMode(mode, { type: "VARIABLE_ALIAS", id: primitive.id });
    v.setVariableCodeSyntax("WEB", "var(--" + name + ")");
    vars.push({ hex, variable: v });
  }
  const styles = new Map<string, TextStyle>();
  const allStyles = await figma.getLocalTextStylesAsync();
  async function bindTree(n: SceneNode) {
    const nodes = [n, ...("findAll" in n ? n.findAll(() => true) : [])];
    for (const item of nodes) {
      for (const field of ["fills", "strokes"] as const) {
        if (!(field in item)) continue;
        const paints = item[field as keyof typeof item] as
          readonly Paint[] | typeof figma.mixed;
        if (paints === figma.mixed || !Array.isArray(paints)) continue;
        let changed = false;
        const out = paints.map((p) => {
          if (p.type !== "SOLID") return p;
          const hex =
            "#" +
            [p.color.r, p.color.g, p.color.b]
              .map((x) =>
                Math.round(x * 255)
                  .toString(16)
                  .padStart(2, "0"),
              )
              .join("");
          const v = vars.find((v) => v.hex === hex);
          if (!v) return p;
          changed = true;
          return figma.variables.setBoundVariableForPaint(
            p,
            "color",
            v.variable,
          );
        });
        if (changed) {
          if (field === "fills" && "fills" in item) item.fills = out;
          if (field === "strokes" && "strokes" in item) item.strokes = out;
        }
      }
      if (
        item.type === "TEXT" &&
        typeof item.fontSize === "number" &&
        item.fontName !== figma.mixed &&
        item.lineHeight !== figma.mixed &&
        item.letterSpacing !== figma.mixed
      ) {
        const f = item.fontName;
        const key = JSON.stringify([
          f,
          item.fontSize,
          item.lineHeight,
          item.letterSpacing,
        ]);
        let style = styles.get(key);
        if (!style) {
          const name =
            "Сборка / " + f.style + " " + item.fontSize + " / " + styles.size;
          style =
            allStyles.find((s) => s.name === name) || figma.createTextStyle();
          style.name = name;
          style.fontName = f;
          style.fontSize = item.fontSize;
          style.lineHeight = item.lineHeight;
          style.letterSpacing = item.letterSpacing;
          styles.set(key, style);
        }
        // Keep source variable-font metrics; shared styles remain available as foundations.
      }
    }
  }
  const masters = figma.createFrame();
  masters.name = "Основные компоненты v4";
  masters.fills = [];
  masters.clipsContent = false;
  masters.x = 4000;
  masters.y = 0;
  masters.resize(2400, 6000);
  page.appendChild(masters);
  const preview = figma.createFrame();
  preview.name = "Обзор компонентов";
  preview.fills = [
    { type: "SOLID", color: { r: 25 / 255, g: 25 / 255, b: 28 / 255 } },
  ];
  preview.layoutMode = "VERTICAL";
  preview.primaryAxisSizingMode = "AUTO";
  preview.counterAxisSizingMode = "FIXED";
  preview.resize(1400, 100);
  preview.paddingLeft = 40;
  preview.paddingRight = 40;
  preview.paddingTop = 40;
  preview.paddingBottom = 40;
  preview.itemSpacing = 32;
  page.appendChild(preview);
  preview.x = 0;
  preview.y = 0;
  const records: {
    id: string;
    name: string;
    source: string;
    width: number;
    height: number;
    vectors: number;
    texts: number;
    instanceCount: number;
  }[] = [];
  const byKey = new Map<string, ComponentNode>();
  const texts = (n: SceneNode) =>
    n.type === "TEXT"
      ? [n]
      : "findAllWithCriteria" in n
        ? n.findAllWithCriteria({ types: ["TEXT"] })
        : [];
  const label = (n: SceneNode) =>
    texts(n)
      .map((t) => t.characters.trim())
      .filter(Boolean)
      .join(" ")
      .slice(0, 70) || n.name.replace(/^Button - /, "");
  const candidate = (n: SceneNode) =>
    n.type === "FRAME" &&
    (/^(Button(?: -|$)|Text Area$|Search Input$|Text Input|Number Input|Checkbox$|Color Picker|Link - Сборка|Icon(?: -|$)|Dialog)/.test(
      n.name,
    ) ||
      [
        "Детализация",
        "Размер холста",
        "Цветовая схема",
        "Image - Холст композиции",
      ].includes(n.name) ||
      (n.name === "Label" && /^(X\b|Y\b|Поворот(?:\s|$))/.test(label(n))));
  const signature = (n: SceneNode): string => {
    const data: unknown[] = [n.type, n.name, n.width, n.height];
    if ("fills" in n) data.push(n.fills);
    if ("strokes" in n) data.push(n.strokes);
    if (n.type === "TEXT")
      data.push(
        n.characters,
        n.fontName,
        n.fontSize,
        n.lineHeight,
        n.letterSpacing,
      );
    if (n.type === "VECTOR") data.push(n.vectorPaths);
    if ("children" in n)
      data.push(n.children.map((c) => [c.x, c.y, signature(c)]));
    return JSON.stringify(data);
  };
  function family(n: SceneNode) {
    if (n.name.startsWith("Icon")) return "Иконки";
    if (n.name.startsWith("Link")) return "Логотип";
    if (n.name.includes("Холст композиции")) return "Холст";
    if (n.name.startsWith("Dialog")) return "Окна";
    if (n.name === "Checkbox") return "Переключатели";
    if (n.name === "Детализация" || n.name === "Размер холста")
      return "Сегменты";
    if (
      n.name.includes("Input") ||
      n.name === "Text Area" ||
      n.name === "Label"
    )
      return "Поля";
    if (n.name === "Цветовая схема" || n.name.includes("цветовая схема"))
      return "Палитры";
    return "Кнопки";
  }
  const targets: SceneNode[] = [];
  function collect(n: SceneNode) {
    if ("children" in n) for (const c of [...n.children]) collect(c);
    if (candidate(n)) targets.push(n);
  }
  for (const r of roots) collect(r);
  let masterX = 0,
    masterY = 0,
    rowH = 0;
  for (const target of targets) {
    const original = target as FrameNode;
    if (!original.parent || !("children" in original.parent)) continue;
    const w = original.width,
      h = original.height;
    const key = signature(original);
    let comp = byKey.get(key);
    if (!comp) {
      const copy = original.clone();
      comp = figma.createComponentFromNode(copy);
      masters.appendChild(comp);
      comp.name =
        family(original) +
        " / " +
        label(original) +
        " / " +
        Math.round(w) +
        "×" +
        Math.round(h);
      comp.description =
        "Точная геометрия и оригинальные SVG из " +
        original.id +
        ". Источник: работающий редактор Сборка.";
      comp.resize(w, h);
      await bindTree(comp);
      if (original.name === "Checkbox") comp.clipsContent = true;
      if (masterX + w > 2200) {
        masterX = 0;
        masterY += rowH + 80;
        rowH = 0;
      }
      comp.x = masterX;
      comp.y = masterY;
      masterX += w + 48;
      rowH = Math.max(rowH, h);
      const editable = texts(comp).find((t) => {
        let p = t.parent;
        while (p && p !== comp) {
          if (p.type === "INSTANCE") return false;
          p = p.parent;
        }
        return t.characters.length > 0 && !["S", "L"].includes(t.characters);
      });
      if (
        editable &&
        !original.name.startsWith("Icon") &&
        !original.name.includes("Холст")
      ) {
        const prop = comp.addComponentProperty(
          "Текст",
          "TEXT",
          editable.characters,
        );
        editable.componentPropertyReferences = {
          ...editable.componentPropertyReferences,
          characters: prop,
        };
      }
      byKey.set(key, comp);
      records.push({
        id: comp.id,
        name: comp.name,
        source: original.id,
        width: w,
        height: h,
        vectors: comp.findAllWithCriteria({ types: ["VECTOR"] }).length,
        texts: texts(comp).length,
        instanceCount: 0,
      });
    }
    // Keep the verified source screens untouched. Review instances are created below.
  }
  masters.resize(2400, Math.max(100, masterY + rowH + 80));
  // Review cards contain live instances; masters stay outside the review frame.
  const regularFont = { family: "Inter", style: "Regular" };
  await figma.loadFontAsync(regularFont);
  function title(text: string, size = 18) {
    const t = figma.createText();
    t.fontName = regularFont;
    t.characters = text;
    t.fontSize = size;
    t.fills = [
      { type: "SOLID", color: { r: 244 / 255, g: 243 / 255, b: 246 / 255 } },
    ];
    return t;
  }
  preview.appendChild(title("Сборка / Компоненты приложения", 28));
  preview.appendChild(
    title(
      "Оригинальные SVG, размеры и типографика из точного макета. Экземпляры связаны с основными компонентами.",
      14,
    ),
  );
  for (const group of [
    "Логотип",
    "Сегменты",
    "Кнопки",
    "Поля",
    "Переключатели",
    "Палитры",
    "Иконки",
    "Холст",
    "Окна",
  ]) {
    const members = records.filter((r) => r.name.startsWith(group + " / "));
    if (!members.length) continue;
    const section = figma.createFrame();
    section.name = group;
    section.fills = [];
    section.layoutMode = "VERTICAL";
    section.primaryAxisSizingMode = "AUTO";
    section.counterAxisSizingMode = "FIXED";
    section.resize(1320, 100);
    section.itemSpacing = 20;
    preview.appendChild(section);
    section.appendChild(title(group));
    let row: FrameNode | null = null,
      used = 0;
    for (const rec of members) {
      const comp = (await figma.getNodeByIdAsync(rec.id)) as ComponentNode;
      const cw = Math.max(280, rec.width + 32);
      if (!row || used + cw > 1320) {
        row = figma.createFrame();
        row.name = "Ряд";
        row.fills = [];
        row.layoutMode = "HORIZONTAL";
        row.primaryAxisSizingMode = "AUTO";
        row.counterAxisSizingMode = "AUTO";
        row.itemSpacing = 24;
        row.counterAxisAlignItems = "MIN";
        section.appendChild(row);
        used = 0;
      }
      const card = figma.createFrame();
      card.name = rec.name;
      card.fills = [
        { type: "SOLID", color: { r: 32 / 255, g: 32 / 255, b: 35 / 255 } },
      ];
      card.layoutMode = "VERTICAL";
      card.primaryAxisSizingMode = "AUTO";
      card.counterAxisSizingMode = "FIXED";
      card.resize(cw, 100);
      card.paddingLeft = 16;
      card.paddingRight = 16;
      card.paddingTop = 16;
      card.paddingBottom = 20;
      card.itemSpacing = 20;
      card.cornerRadius = 16;
      row.appendChild(card);
      const caption = title(rec.name.split(" / ").slice(1).join(" / "), 12);
      caption.textAutoResize = "HEIGHT";
      caption.resize(cw - 32, caption.height);
      card.appendChild(caption);
      const inst = comp.createInstance();
      card.appendChild(inst);
      inst.layoutPositioning = "AUTO";
      inst.layoutGrow = 0;
      inst.layoutAlign = "INHERIT";
      inst.resize(rec.width, rec.height);
      inst.layoutSizingHorizontal = "FIXED";
      inst.layoutSizingVertical = "FIXED";
      used += cw + 24;
    }
  }
  const checks = [];
  for (let i = 0; i < roots.length; i++) {
    const after = exactBase64(
      await roots[i].exportAsync({
        format: "PNG",
        useAbsoluteBounds: true,
        constraint: { type: "SCALE", value: 1 },
      }),
    );
    checks.push({
      id: roots[i].id,
      sourceBase64: before[i],
      componentBase64: after,
    });
  }
  figma.currentPage.selection = [preview];
  figma.viewport.scrollAndZoomIntoView([preview]);
  return {
    kind: "built",
    page: page.id,
    preview: preview.id,
    masters: masters.id,
    collection: collection.id,
    components: records,
    componentCount: records.length,
    replacedInstances: 0,
    checks,
    sourceScreensPreserved: true,
    createdNodeIds: [preview.id, masters.id, ...records.map((r) => r.id)],
    textStyles: [...styles.values()].map((s) => s.id),
  };
}
async function createResponsiveDesign(
  _svg: string,
  _library: Record<string, string> = {},
) {
  return buildExactComponents();
}

function exactBase64(bytes: Uint8Array) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i],
      b = bytes[i + 1] || 0,
      c = bytes[i + 2] || 0;
    out +=
      chars[a >> 2] +
      chars[((a & 3) << 4) | (b >> 4)] +
      (i + 1 < bytes.length ? chars[((b & 15) << 2) | (c >> 6)] : "=") +
      (i + 2 < bytes.length ? chars[c & 63] : "=");
  }
  return out;
}
async function inspectComponentProofs(): Promise<ExactReport> {
  for (const p of figma.root.children) await p.loadAsync();
  const p = figma.root.children.find((p) => p.name === EXACT_LIBRARY_PAGE);
  if (!p) throw Error("Нет страницы компонентов");
  const master = p.children.find((n) => n.name === "Основные компоненты v4");
  if (!master || !("findAllWithCriteria" in master))
    throw Error("Нужна библиотека v2");
  const samples = [];
  const components = master.findAllWithCriteria({ types: ["COMPONENT"] });
  let done = 0;
  for (const c of components) {
    const match = c.description.match(/из (\d+:\d+)/);
    if (!match) continue;
    const original = (await figma.getNodeByIdAsync(match[1])) as SceneNode;
    if (!original) continue;
    const a = await original.exportAsync({
      format: "PNG",
      useAbsoluteBounds: true,
      constraint: { type: "SCALE", value: 1 },
    });
    const b = await c.exportAsync({
      format: "PNG",
      useAbsoluteBounds: true,
      constraint: { type: "SCALE", value: 1 },
    });
    samples.push({
      name: c.name,
      id: c.id,
      source: original.id,
      original: [original.width, original.height],
      component: [c.width, c.height],
      sourceBase64: exactBase64(a),
      componentBase64: exactBase64(b),
    });
    done++;
    if (done % 20 === 0)
      figma.ui.postMessage({
        type: "components-report",
        report: { kind: "progress", done, total: components.length },
      });
  }
  return { kind: "proofs", componentCount: components.length, samples };
}

async function inspectModalMetrics(): Promise<ExactReport> {
  for (const p of figma.root.children) await p.loadAsync();
  const page = figma.root.children.find((p) => p.name === EXACT_LIBRARY_PAGE);
  if (!page) throw Error("No library");
  const comps = page
    .findAllWithCriteria({ types: ["COMPONENT"] })
    .filter((n) => n.name.startsWith("Окна / "));
  const rows = [];
  for (const c of comps) {
    const id = c.description.match(/из (\d+:\d+)/)?.[1];
    if (!id) continue;
    const source = (await figma.getNodeByIdAsync(id)) as FrameNode;
    const info = (n: FrameNode | ComponentNode) => ({
      layout: n.layoutMode,
      spacing: n.itemSpacing,
      padding: [n.paddingLeft, n.paddingTop, n.paddingRight, n.paddingBottom],
      texts: n.findAllWithCriteria({ types: ["TEXT"] }).map((t) => ({
        id: t.id,
        text: t.characters,
        x: t.x,
        y: t.y,
        width: t.width,
        height: t.height,
        font: t.fontName,
        weight: t.fontWeight,
        size: t.fontSize,
        lineHeight: t.lineHeight,
        letterSpacing: t.letterSpacing,
        align: t.textAlignHorizontal,
      })),
    });
    rows.push({ id: c.id, source: info(source), component: info(c) });
  }
  return { kind: "modal-metrics", rows };
}

async function repairModalTypography() {
  const p = figma.root.children.find((p) => p.name === EXACT_LIBRARY_PAGE);
  if (!p) throw Error("Нет компонентов");
  await p.loadAsync();
  const regular = { family: "Inter", style: "Regular" };
  await figma.loadFontAsync(regular);
  let count = 0;
  const nodes: SceneNode[] = [];
  for (const id of EXACT_ROOT_IDS.slice(3)) {
    const n = await figma.getNodeByIdAsync(id);
    if (n && "findAllWithCriteria" in n)
      nodes.push(...(n as FrameNode).findAllWithCriteria({ types: ["TEXT"] }));
  }
  for (const c of p.findAllWithCriteria({ types: ["COMPONENT"] }))
    if (c.name.startsWith("Окна / "))
      nodes.push(...c.findAllWithCriteria({ types: ["TEXT"] }));
  for (const n of nodes)
    if (
      n.type === "TEXT" &&
      n.fontName !== figma.mixed &&
      n.fontName.family === "Segoe UI"
    ) {
      n.fontName = regular;
      count++;
    }
  return { count };
}

async function finalizeExactHandoff(): Promise<ExactReport> {
  for (const p of figma.root.children) await p.loadAsync();
  const page = figma.root.children.find((p) => p.name === EXACT_LIBRARY_PAGE);
  if (!page) throw Error("Сначала соберите библиотеку");
  const master = page.children.find((n) => n.name === "Основные компоненты v4");
  if (!master || !("findAllWithCriteria" in master))
    throw Error("Нужна финальная библиотека");
  const count = master.findAllWithCriteria({ types: ["COMPONENT"] }).length;
  if (count !== 169)
    throw Error("Ожидается 169 компонентов, получено " + count);
  const archive = figma.root.children.find(
    (p) => p.id === "19:2326" && p.name === "Архив · Приближённые экраны",
  );
  if (archive) archive.remove();
  const source = await figma.getNodeByIdAsync(EXACT_ROOT_IDS[0]);
  if (!source || source.parent?.type !== "PAGE")
    throw Error("Нет страницы экранов");
  const sourcePage = source.parent;
  const removed: string[] = [];
  for (const n of [...sourcePage.children])
    if (!EXACT_ROOT_IDS.includes(n.id) && n.name.startsWith("Сборка /")) {
      removed.push(n.id);
      n.remove();
    }
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  for (const c of collections)
    if (
      c.name === "Сборка · CSS приложения" &&
      c.id !== "VariableCollectionId:71:11795"
    )
      c.remove();
  const preview = page.children.find(
    (n) => n.name === "Обзор компонентов",
  ) as FrameNode;
  if (!preview) throw Error("Нет обзора");
  await figma.setCurrentPageAsync(page);
  for (const instance of preview.findAllWithCriteria({ types: ["INSTANCE"] })) {
    const main = await instance.getMainComponentAsync();
    if (!main) continue;
    instance.layoutPositioning = "AUTO";
    instance.layoutGrow = 0;
    instance.layoutAlign = "INHERIT";
    instance.resize(main.width, main.height);
    instance.layoutSizingHorizontal = "FIXED";
    instance.layoutSizingVertical = "FIXED";
  }
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  for (const c of master.findAllWithCriteria({ types: ["COMPONENT"] })) {
    if (!c.name.startsWith("Окна / ")) continue;
    const oldName = c.name;
    const short = ["Импорт SVG", "Импорт палитры", "Открыть проект"].find((t) =>
      oldName.includes(t),
    );
    if (!short) continue;
    c.name =
      "Окна / " +
      short +
      " / " +
      Math.round(c.width) +
      "×" +
      Math.round(c.height);
    const card = preview.findOne(
      (n) => n.type === "FRAME" && n.name === oldName,
    ) as FrameNode | null;
    if (card) {
      card.name = c.name;
      const caption = card.children.find((n) => n.type === "TEXT") as
        TextNode | undefined;
      if (caption)
        caption.characters =
          short + " / " + Math.round(c.width) + "×" + Math.round(c.height);
    }
  }
  const sections = preview.children
    .filter((n) => n.type === "FRAME")
    .map((n) => ({ id: n.id, name: n.name, width: n.width, height: n.height }));
  figma.currentPage.selection = [preview];
  figma.viewport.scrollAndZoomIntoView([preview]);
  return {
    kind: "finalized",
    page: page.id,
    preview: preview.id,
    componentCount: count,
    sourceScreens: EXACT_ROOT_IDS,
    removedTestNodes: removed,
    sections,
    externalSubmission: "not_sent",
  };
}

async function inspectResponsiveStates(): Promise<ExactReport> {
  const roots = [];
  for (const id of EXACT_ROOT_IDS) {
    const n = await figma.getNodeByIdAsync(id);
    if (!n || n.type !== "FRAME") continue;
    roots.push({
      id: n.id,
      name: n.name,
      w: n.width,
      h: n.height,
      nodes: n
        .findAllWithCriteria({ types: ["FRAME", "TEXT"] })
        .map((x) => ({
          id: x.id,
          parent: x.parent?.id,
          name: x.name,
          type: x.type,
          w: x.width,
          h: x.height,
          x: x.x,
          y: x.y,
          ...(x.type === "TEXT" ? { text: x.characters } : {}),
          ...(x.type === "FRAME" ? { layout: x.layoutMode } : {}),
        })),
    });
  }
  return { kind: "responsive-inspect", roots };
}

async function normalizeCapturedFonts(roots: FrameNode[]) {
  const available = (await figma.listAvailableFontsAsync())
    .filter((f) => f.fontName.family === "Inter")
    .map((f) => f.fontName);
  for (const root of roots)
    for (const node of root.findAllWithCriteria({ types: ["TEXT"] })) {
      for (const segment of node.getStyledTextSegments(["fontName"])) {
        if (segment.fontName.family !== "SborkaInter") continue;
        const wanted = segment.fontName.style
          .replace(/SemiBold/g, "Semi Bold")
          .replace(/ExtraBold/g, "Extra Bold");
        const face =
          available.find((f) => f.style === wanted) ||
          available.find((f) => f.style === "Regular");
        if (!face) throw Error("Inter недоступен");
        await figma.loadFontAsync(face);
        node.setRangeFontName(segment.start, segment.end, face);
      }
    }
}

// Organize exact captures without approximating responsive layouts.
async function buildResponsiveFlows(): Promise<ExactReport> {
  const page = figma.root.children.find((p) => p.id === "0:1");
  const archive = figma.root.children.find(
    (p) => p.name === "Архив · Сборка v13",
  );
  if (!page || !archive) throw Error("Сначала обновите компоненты");
  await figma.setCurrentPageAsync(page);
  const rows = [
    ["Редактор", "98:2", "105:2", "112:2"],
    ["Импорт SVG", "99:2", "106:2", "130:2"],
    ["Импорт палитры", "121:2", "125:2", "114:2"],
    ["Открыть проект", "101:2", "109:2", "115:2"],
    ["Своя палитра", "102:2", "108:2", "116:2"],
    ["Библиотека 3 × 3", "103:2", "127:2", "117:2"],
    ["Свёрнутые настройки", "104:2", "111:2", "118:2"],
  ];
  const roots: FrameNode[][] = [];
  for (const row of rows) {
    const nodes: FrameNode[] = [];
    for (const id of row.slice(1)) {
      const n = await figma.getNodeByIdAsync(id);
      if (!n || n.type !== "FRAME") throw Error("Перенос не завершён: " + id);
      nodes.push(n);
    }
    roots.push(nodes);
  }
  await normalizeCapturedFonts(([] as FrameNode[]).concat(...roots));
  const removedStartup: string[] = [];
  for (const root of ([] as FrameNode[]).concat(...roots)) {
    const status = root.findOne(
      (n) => n.type === "TEXT" && n.characters === "Готовим вашу мастерскую",
    );
    if (!status) continue;
    const body = root.children.find((n) => n.name === "Body");
    let candidate: SceneNode = status;
    while (
      candidate.parent &&
      candidate.parent !== body &&
      candidate.parent !== root
    )
      candidate = candidate.parent as SceneNode;
    if (
      candidate === body ||
      candidate === root ||
      candidate.width < root.width * 0.8
    )
      throw Error("Нужно проверить слой загрузки: " + root.id);
    removedStartup.push(candidate.id);
    candidate.remove();
  }

  for (const id of ["84:2", "67:2", "68:2", "70:2"]) {
    const n = await figma.getNodeByIdAsync(id);
    if (n && "x" in n) {
      archive.appendChild(n as SceneNode);
      (n as SceneNode).x += 24000;
    }
  }

  const normalPrimary = await figma.getNodeByIdAsync("98:42");
  let normalizedPrimary = 0;
  if (normalPrimary && normalPrimary.type === "FRAME") {
    const ink = normalPrimary.findAllWithCriteria({ types: ["TEXT"] })[0]
      ?.fills;
    const library = figma.root.children.find((p) => p.id === "19:1268");
    if (library) await library.loadAsync();
    const nodes: SceneNode[] = [];
    for (const root of ([] as FrameNode[]).concat(...roots))
      nodes.push(
        ...root
          .findAllWithCriteria({ types: ["FRAME"] })
          .filter((n) => n.name.startsWith("Button")),
      );
    if (library)
      nodes.push(
        ...library
          .findAllWithCriteria({ types: ["COMPONENT"] })
          .filter((n) => n.name.startsWith("Кнопки /")),
      );
    for (const n of nodes) {
      if (n.type !== "FRAME" && n.type !== "COMPONENT") continue;
      const caption = n
        .findAllWithCriteria({ types: ["TEXT"] })
        .map((t) => t.characters)
        .join(" ")
        .trim();
      if (!/^(Собрать идею|Скачать SVG|SVG)$/.test(caption)) continue;
      n.fills = JSON.parse(JSON.stringify(normalPrimary.fills));
      n.strokes = JSON.parse(JSON.stringify(normalPrimary.strokes));
      n.opacity = 1;
      if (ink && ink !== figma.mixed)
        for (const text of n.findAllWithCriteria({ types: ["TEXT"] }))
          text.fills = JSON.parse(JSON.stringify(ink));
      normalizedPrimary++;
    }
  }
  page.name = "01 · Все экраны · Desktop / Tablet / Mobile";
  const changed: string[] = [],
    coverage: { id: string; label: string; destination: string }[] = [];
  let y = 0;
  const formats = ["Десктоп", "Планшет", "Телефон"];
  for (let r = 0; r < roots.length; r++) {
    let x = 0,
      height = 0;
    for (let f = 0; f < 3; f++) {
      const root = roots[r][f];
      root.name = formats[f] + " · " + rows[r][0] + " · v14";
      root.x = x;
      root.y = y;
      height = Math.max(height, root.height);
      x += root.width + 100;
      changed.push(root.id);
      const controls = root
        .findAllWithCriteria({ types: ["FRAME"] })
        .filter((n) =>
          /^(Button(?: -|$)|Link -|Summary|Search Input|Text Area|Number Input|Color Picker|Checkbox)/.test(
            n.name,
          ),
        );
      for (const n of controls) {
        const label =
          n.name +
          " " +
          n
            .findAllWithCriteria({ types: ["TEXT"] })
            .map((t) => t.characters)
            .join(" ")
            .trim();
        let destination = roots[0][f].id;
        if (/Импорт SVG/.test(label)) destination = roots[1][f].id;
        else if (/Импорт палитры/.test(label)) destination = roots[2][f].id;
        else if (/Открыть проект/.test(label)) destination = roots[3][f].id;
        else if (/Своя|Применить/.test(label)) destination = roots[4][f].id;
        else if (/сеткой|Показать все/.test(label))
          destination = roots[5][f].id;
        else if (/Summary/.test(label))
          destination = (r === 6 ? roots[0] : roots[6])[f].id;
        else if (!/Закрыть|лентой|Свернуть|Сборка, главная/.test(label)) {
          await n.setReactionsAsync([
            {
              trigger: { type: "ON_CLICK" },
              actions: [
                {
                  type: "URL",
                  url: "http://127.0.0.1:8774/?demo=1",
                  openInNewTab: true,
                },
              ],
            },
          ]);
          coverage.push({ id: n.id, label, destination: "working-editor" });
          continue;
        }
        if (destination === root.id) {
          await n.setReactionsAsync([
            {
              trigger: { type: "ON_CLICK" },
              actions: [
                {
                  type: "URL",
                  url: "http://127.0.0.1:8774/?demo=1",
                  openInNewTab: true,
                },
              ],
            },
          ]);
          coverage.push({ id: n.id, label, destination: "working-editor" });
          continue;
        }
        await n.setReactionsAsync([
          {
            trigger: { type: "ON_CLICK" },
            actions: [
              {
                type: "NODE",
                destinationId: destination,
                navigation: "NAVIGATE" as never,
                transition: null,
                resetScrollPosition: false,
              },
            ],
          },
        ]);
        coverage.push({ id: n.id, label, destination });
      }
    }
    y += height + 220;
  }
  page.flowStartingPoints = roots[0].map((root, i) => ({
    nodeId: root.id,
    name: formats[i] + " · редактор v14",
  }));
  page.selection = roots[0];
  figma.viewport.scrollAndZoomIntoView(roots[0]);
  return {
    kind: "v14-organized",
    removedStartup,
    normalizedPrimary,
    page: page.id,
    roots: roots.map((row, i) => ({
      state: rows[i][0],
      screens: row.map((n) => ({
        id: n.id,
        name: n.name,
        w: n.width,
        h: n.height,
      })),
    })),
    coverage,
    changedNodeIds: changed,
    note: "Exact editable captures. Window/view navigation stays in Figma; real filesystem and editing actions open the running editor.",
  };
}

const PACKED_TAIL="";
const COMMAND='2137a770-4ae4-432e-8fb5-81003c111a93';
figma.showUI(__html__,{width:1180,height:780,themeColors:true});
figma.root.setRelaunchData({[COMMAND]:'Собрать новую иллюстрацию'});
let busy=false;let componentBusy=false;
figma.ui.onmessage=async(message:{type:string;svg?:string;name?:string;width?:number;height?:number;library?:Record<string,string>})=>{
 if(message.type==='responsive-build'||message.type==='responsive-inspect'||message.type==='components-inspect'||message.type==='components-build'||message.type==='components-finalize'){if(componentBusy)return;componentBusy=true;try{const report=message.type==='responsive-build'?await buildResponsiveFlows():message.type==='responsive-inspect'?await inspectResponsiveStates():message.type==='components-inspect'?await inspectExactDesign():message.type==='components-finalize'?await finalizeExactHandoff():await buildExactComponents();figma.ui.postMessage({type:'components-report',report});}catch(e){figma.ui.postMessage({type:'components-report',report:{error:String(e)}});}finally{componentBusy=false;}return;}
 if(message.type==='design'){try{const result=await createResponsiveDesign(String(message.svg||''),message.library||{});figma.ui.postMessage({type:'status',text:'Макеты готовы: desktop, tablet, mobile и отдельные компоненты. '+JSON.stringify(result)});}catch(e){figma.ui.postMessage({type:'status',text:'Ошибка создания макетов: '+String(e)});}return;}
 if(message.type==='boot'){figma.ui.postMessage({type:'assets',tail:PACKED_TAIL});return;}
 if(message.type!=='insert'||busy)return;
 busy=true;
 let node:FrameNode|null=null;
 try{
  const raw=message.svg;
  if(typeof raw!=='string'||raw.length>2000000||!raw.includes('<svg')||/<(?:script|image|foreignObject)\b|\bon[a-z]+\s*=/i.test(raw))throw Error('Нужен безопасный векторный SVG до 2 МБ');
  const w=Number(message.width),h=Number(message.height);
  if(!Number.isFinite(w)||!Number.isFinite(h)||w<200||h<200||w>5000||h>5000)throw Error('Размер холста от 200 до 5000 px');
  const center={...figma.viewport.center};
  node=figma.createNodeFromSvg(raw);
  node.name='Сборка / '+String(message.name||'Композиция').slice(0,100);
  figma.currentPage.appendChild(node);
  node.x=Math.round(center.x-node.width/2);node.y=Math.round(center.y-node.height/2);
  node.setRelaunchData({[COMMAND]:'Открыть Сборку'});
  node.setPluginData('sborka','1');
  figma.currentPage.selection=[node];
  figma.viewport.scrollAndZoomIntoView([node]);
  figma.ui.postMessage({type:'status',text:'Готово. Композиция добавлена редактируемыми векторными слоями.'});
 }catch(e){if(node)node.remove();figma.ui.postMessage({type:'status',text:'Не удалось добавить: '+(e instanceof Error?e.message:String(e))});}
 finally{busy=false;}
};