function organizeInspector(node: FrameNode, width: number) {
  const resize = (n: SceneNode, w: number) => {
    if (n.type === "INSTANCE") {
      n.resize(w, n.height);
      return;
    }
    if (n.type !== "FRAME") return;
    const children = n.children.filter(
      (c) => c.type === "FRAME" || c.type === "INSTANCE",
    );
    const old = children.map((c) => c.width);
    n.resize(w, n.height);
    if (n.layoutMode === "HORIZONTAL") {
      const usable = Math.max(
        10,
        w - n.itemSpacing * Math.max(0, children.length - 1),
      );
      const sum = old.reduce((a, b) => a + b, 0) || 1;
      children.forEach((c, i) => resize(c, (usable * old[i]) / sum));
    } else
      for (const c of children) resize(c, w - n.paddingLeft - n.paddingRight);
  };
  if (node.children.some((c) => c.name === "Settings section")) return;
  const children = [...node.children];
  const object = children.findIndex(
    (c) => c.type === "TEXT" && c.characters.startsWith("Объект"),
  );
  const layers = children.findIndex(
    (c) => c.type === "TEXT" && c.characters === "Слои",
  );
  if (object < 0 || layers < 0) return;
  node.layoutMode = "HORIZONTAL";
  node.resize(width, 100);
  node.primaryAxisSizingMode = "FIXED";
  node.counterAxisSizingMode = "AUTO";
  node.itemSpacing = 24;
  const col = (width - 48) / 3;
  for (const [i, items] of [
    children.slice(0, object),
    children.slice(object, layers),
    children.slice(layers),
  ].entries()) {
    const section = figma.createFrame();
    section.name = ["Settings section", "Object section", "Layers section"][i];
    section.fills = [];
    section.layoutMode = "VERTICAL";
    section.resize(col, 100);
    section.primaryAxisSizingMode = "AUTO";
    section.counterAxisSizingMode = "FIXED";
    section.itemSpacing = 16;
    section.clipsContent = false;
    node.appendChild(section);
    for (const item of items) {
      section.appendChild(item);
      resize(item, col);
    }
  }
}

async function createResponsiveDesign(
  previewSvg: string,
  vectorLibrary: Record<string, string> = {},
) {
  const existing = figma.root.children.find(
    (p) => p.name === "Сборка · Экраны",
  );
  if (existing) {
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    await figma.loadFontAsync({ family: "Inter", style: "Medium" });
    await figma.setCurrentPageAsync(existing);
    const frames = existing.findAll((n) => n.type === "FRAME") as FrameNode[];
    for (const n of frames) {
      if (n.layoutMode === "HORIZONTAL") {
        n.primaryAxisSizingMode = "FIXED";
        n.counterAxisSizingMode = "AUTO";
      }
      n.clipsContent = false;
    }
    const tablet = existing.children.find((n) => n.name === "Tablet / 1024");
    if (tablet && tablet.type === "FRAME") {
      const inspector = tablet.children.find((n) => n.name === "Inspector");
      if (inspector && inspector.type === "FRAME")
        organizeInspector(inspector, tablet.width - 48);
    }
    const top = existing.children.filter((n) =>
      ["Desktop / 1440", "Tablet / 1024", "Mobile / 390"].includes(n.name),
    ) as FrameNode[];
    figma.currentPage.selection = top;
    figma.viewport.scrollAndZoomIntoView(top);
    return {
      createdNodeIds: [],
      mutatedNodeIds: frames.map((n) => n.id),
      pages: [existing.id],
      desktop: top.find((n) => n.name === "Desktop / 1440")?.id,
      tablet: top.find((n) => n.name === "Tablet / 1024")?.id,
      mobile: top.find((n) => n.name === "Mobile / 390")?.id,
    };
  }
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });
  const C: Record<string, string> = {
    bg: "#19191C",
    panel: "#242427",
    ink: "#F4F3F6",
    muted: "#A6A4AE",
    line: "#39383F",
    pink: "#FF5BAF",
    pinkInk: "#29131F",
    selected: "#492B43",
  };
  const paint = (h: string) => ({
    type: "SOLID" as const,
    color: {
      r: parseInt(h.slice(1, 3), 16) / 255,
      g: parseInt(h.slice(3, 5), 16) / 255,
      b: parseInt(h.slice(5, 7), 16) / 255,
    },
  });
  const ids: string[] = [];
  const record = <T extends BaseNode>(n: T): T => {
    ids.push(n.id);
    return n;
  };
  const kit = record(figma.createPage());
  kit.name = "Сборка · Компоненты";
  await figma.setCurrentPageAsync(kit);
  const collection = figma.variables.createVariableCollection(
    "Сборка / Foundations",
  );
  const vars: Record<string, Variable> = {};
  for (const [name, color] of Object.entries(C)) {
    const v = figma.variables.createVariable(name, collection, "COLOR");
    v.scopes = ["ALL_FILLS"];
    v.setValueForMode(collection.defaultModeId, paint(color).color);
    vars[name] = v;
  }
  for (const [name, value] of Object.entries({
    space4: 4,
    space8: 8,
    space12: 12,
    space16: 16,
    space24: 24,
    radius12: 12,
    radius24: 24,
  })) {
    const v = figma.variables.createVariable(name, collection, "FLOAT");
    v.scopes = ["GAP", "CORNER_RADIUS"];
    v.setValueForMode(collection.defaultModeId, value);
  }
  function fill(n: GeometryMixin, key: string) {
    n.fills = [
      figma.variables.setBoundVariableForPaint(
        paint(C[key]),
        "color",
        vars[key],
      ),
    ];
  }
  function text(value: string, size = 13, key = "ink", medium = false) {
    const n = record(figma.createText());
    n.fontName = { family: "Inter", style: medium ? "Medium" : "Regular" };
    n.fontSize = size;
    n.characters = value;
    fill(n, key);
    return n;
  }
  function box(
    name: string,
    w: number,
    vertical = true,
    key: string | null = null,
    pad = 0,
    gap = 12,
  ) {
    const n = record(figma.createFrame());
    n.name = name;
    n.layoutMode = vertical ? "VERTICAL" : "HORIZONTAL";
    n.resize(w, 40);
    n.primaryAxisSizingMode = vertical ? "AUTO" : "FIXED";
    n.counterAxisSizingMode = vertical ? "FIXED" : "AUTO";
    n.clipsContent = false;
    n.paddingLeft = n.paddingRight = n.paddingTop = n.paddingBottom = pad;
    n.itemSpacing = gap;
    n.fills = [];
    if (key) fill(n, key);
    return n;
  }
  function label(
    parent: FrameNode | ComponentNode,
    value: string,
    size = 12,
    key = "muted",
  ) {
    const t = text(value, size, key);
    parent.appendChild(t);
    return t;
  }
  function component(
    name: string,
    value: string,
    w: number,
    h: number,
    key = "panel",
    ink = "ink",
    round = 999,
  ) {
    const n = record(figma.createComponent());
    n.name = name;
    n.resize(w, h);
    n.layoutMode = "HORIZONTAL";
    n.primaryAxisAlignItems = "CENTER";
    n.counterAxisAlignItems = "CENTER";
    n.itemSpacing = 8;
    n.cornerRadius = round;
    fill(n, key);
    n.appendChild(text(value, 13, ink));
    return n;
  }
  const primary = component(
    "Button / Primary",
    "Собрать идею",
    220,
    46,
    "pink",
    "pinkInk",
  );
  const secondary = component(
    "Button / Secondary",
    "Сохранить проект",
    160,
    44,
  );
  const chip = component("Chip / Default", "Накопить на мечту", 154, 32);
  const selectedChip = component("Chip / Selected", "L", 38, 36, "ink", "bg");
  const field = component("Field / Number", "612", 104, 44, "panel", "ink", 12);
  const search = component(
    "Field / Search",
    "Найти объект",
    220,
    44,
    "panel",
    "muted",
  );
  const textarea = component(
    "Field / Idea",
    "Обучение без отвлечений",
    220,
    112,
    "panel",
    "ink",
    20,
  );
  const tile = component("Asset / Tile", "Книга", 66, 76, "panel", "ink", 24);
  const layer = component(
    "Layer / Selected",
    "Книга",
    220,
    44,
    "selected",
    "ink",
  );
  const assetComponents: Record<string, ComponentNode> = {};
  const assetNames: Record<string, string> = {
    puzzle: "Пазлы",
    book: "Книга",
    phone: "Телефон",
    headphones: "Наушники",
    lamp: "Лампа",
    wallet: "Кошелёк",
    pen: "Ручка",
    folder: "Папка",
    coin: "Монета",
    flowers: "Цветы",
  };
  for (const [id, svg] of Object.entries(vectorLibrary)) {
    const c = record(figma.createComponent());
    c.name = "Asset / " + assetNames[id];
    c.resize(74, 90);
    c.layoutMode = "VERTICAL";
    c.primaryAxisAlignItems = "CENTER";
    c.counterAxisAlignItems = "CENTER";
    c.itemSpacing = 8;
    c.cornerRadius = 16;
    fill(c, "bg");
    const icon = record(figma.createNodeFromSvg(svg));
    icon.rescale(Math.min(46 / icon.width, 46 / icon.height));
    c.appendChild(icon);
    const caption = text(assetNames[id], 10, "muted");
    c.appendChild(caption);
    kit.appendChild(c);
    c.x = 900 + (Object.keys(assetComponents).length % 3) * 100;
    c.y = 150 + Math.floor(Object.keys(assetComponents).length / 3) * 120;
    assetComponents[assetNames[id]] = c;
  }
  const all = [
    primary,
    secondary,
    chip,
    selectedChip,
    field,
    search,
    textarea,
    tile,
    layer,
  ];
  all.forEach((n, i) => {
    kit.appendChild(n);
    n.x = (i % 3) * 280;
    n.y = Math.floor(i / 3) * 170 + 150;
  });
  const heading = text("Сборка / UI kit", 32, "ink", true);
  kit.appendChild(heading);
  heading.x = 0;
  heading.y = 30;
  const palette = box("Foundations / Colors", 800, false, null, 0, 16);
  kit.appendChild(palette);
  palette.x = 0;
  palette.y = 700;
  for (const key of Object.keys(C)) {
    const sw = component(
      "Color / " + key,
      key,
      90,
      70,
      key,
      key === "pink" ? "pinkInk" : "ink",
      12,
    );
    palette.appendChild(sw);
  }
  const art = record(figma.createComponent());
  art.name = "Canvas / Editable vector composition";
  art.clipsContent = true;
  art.resize(1200, 630);
  art.fills = [];
  const vector = record(figma.createNodeFromSvg(previewSvg));
  art.appendChild(vector);
  vector.x = 0;
  vector.y = 0;
  kit.appendChild(art);
  art.x = 0;
  art.y = 900;
  function instance(
    c: ComponentNode,
    parent: FrameNode | ComponentNode,
    value?: string,
    w?: number,
  ) {
    const n = record(c.createInstance());
    parent.appendChild(n);
    if (w) n.resize(w, n.height);
    if (value) {
      const t = n.findOne((x: SceneNode) => x.type === "TEXT");
      if (t && t.type === "TEXT") t.characters = value;
    }
    return n;
  }
  function fields(parent: FrameNode | ComponentNode, w: number) {
    const names = ["X", "Y"];
    const row = box("Coordinates", w, false, null, 0, 12);
    parent.appendChild(row);
    for (const name of names) {
      const cell = box(name, (w - 12) / 2, true, null, 0, 8);
      row.appendChild(cell);
      label(cell, name);
      instance(field, cell, name === "X" ? "612" : "362", (w - 12) / 2);
    }
    label(parent, "Поворот");
    instance(field, parent, "0°", w);
  }
  function library(w: number) {
    const n = box("Library", w, true, null, 0, 16);
    label(n, "Что соберём?", 25, "ink");
    label(n, "Идея композиции");
    instance(textarea, n, "Обучение без отвлечений", w);
    instance(primary, n, undefined, w);
    label(n, "Библиотека", 15, "ink");
    instance(search, n, undefined, w);
    const names = [
      "Пазлы",
      "Книга",
      "Телефон",
      "Наушники",
      "Лампа",
      "Кошелёк",
      "Ручка",
      "Папка",
      "Монета",
      "Цветы",
    ];
    for (let i = 0; i < names.length; i += 3) {
      const row = box("Objects / " + (i / 3 + 1), w, false, null, 0, 8);
      n.appendChild(row);
      for (const name of names.slice(i, i + 3))
        instance(
          assetComponents[name] || tile,
          row,
          assetComponents[name] ? undefined : name,
          (w - 16) / 3,
        );
    }
    instance(secondary, n, "↑ Импорт SVG", w);
    return n;
  }
  function inspector(w: number, wide = false) {
    const n = box("Inspector", w, true, null, 0, 16);
    label(n, "Настройки", 17, "ink");
    label(n, "Палитра");
    const row = box("Palettes", w, false, null, 0, 6);
    n.appendChild(row);
    for (const name of ["База", "Сирень", "Персик", "Мята"])
      instance(chip, row, name, (w - 18) / 4);
    label(n, "Цвет холста");
    instance(field, n, "# D7CDF5", w);
    instance(secondary, n, "↑ Импорт палитры", w);
    label(n, "Объект · Книга", 15, "ink");
    fields(n, w);
    const actions = box("Object actions", w, false, null, 0, 8);
    n.appendChild(actions);
    instance(secondary, actions, "Копия", (w - 8) / 2);
    instance(secondary, actions, "Удалить", (w - 8) / 2);
    label(n, "Слои", 15, "ink");
    instance(layer, n, "Книга", w);
    instance(layer, n, "Наушники", w);
    instance(layer, n, "Лампа · фон", w);
    instance(secondary, n, "Открыть проект", w);
    if (wide) organizeInspector(n, w);
    return n;
  }
  function workspace(w: number) {
    const n = box("Workspace", w, true, null, 0, 20);
    const toolbar = box("Canvas toolbar", w, false, null, 0, 8);
    n.appendChild(toolbar);
    instance(selectedChip, toolbar, "S");
    instance(selectedChip, toolbar, "L");
    instance(chip, toolbar, "▭    □    ▯    +", Math.min(220, w - 92));
    label(n, "Ваша композиция", 18, "ink");
    const a = record(art.createInstance());
    n.appendChild(a);
    a.rescale(w / 1200);
    const actions = box("Canvas actions", w, false, null, 0, 8);
    n.appendChild(actions);
    instance(
      secondary,
      actions,
      "↻ Другой вариант",
      Math.min(170, (w - 8) / 2),
    );
    instance(secondary, actions, "Очистить", Math.min(110, (w - 8) / 2));
    label(n, "Попробовать другую идею");
    instance(chip, n, "Накопить на мечту");
    return n;
  }
  const screens = record(figma.createPage());
  screens.name = "Сборка · Экраны";
  await figma.setCurrentPageAsync(screens);
  function screen(name: string, w: number, x: number) {
    const mobile = w < 600,
      tablet = w < 1200;
    const n = box(name, w, true, "bg", 24, 28);
    screens.appendChild(n);
    n.x = x;
    n.y = 0;
    n.clipsContent = false;
    const header = box("Header", w - 48, !mobile ? false : true, null, 0, 16);
    n.appendChild(header);
    label(header, "◕ Сборка", 28, "ink");
    const ha = box(
      "Header actions",
      w - 48 - (mobile ? 0 : 250),
      false,
      null,
      0,
      8,
    );
    header.appendChild(ha);
    instance(secondary, ha, "Отменить", mobile ? 96 : 100);
    instance(primary, ha, "Скачать SVG", mobile ? 170 : 150);
    if (mobile) {
      n.appendChild(workspace(w - 48));
      n.appendChild(library(w - 48));
      n.appendChild(inspector(w - 48));
    } else {
      const row = box("Editor layout", w - 48, false, null, 0, 24);
      n.appendChild(row);
      row.counterAxisAlignItems = "MIN";
      row.appendChild(library(220));
      row.appendChild(workspace(w - 48 - 220 - 24 - (tablet ? 0 : 244)));
      if (!tablet) row.appendChild(inspector(220));
      else n.appendChild(inspector(w - 48, true));
    }
    return n;
  }
  const desktop = screen("Desktop / 1440", 1440, 0),
    tablet = screen("Tablet / 1024", 1024, 1520),
    mobile = screen("Mobile / 390", 390, 2624);
  function modal(
    base: FrameNode,
    title: string,
    desc: string,
    x: number,
    y: number,
  ) {
    const n = record(base.clone());
    screens.appendChild(n);
    n.name = base.name + " / " + title;
    n.x = x;
    n.y = y;
    const overlay = record(figma.createRectangle());
    n.appendChild(overlay);
    overlay.layoutPositioning = "ABSOLUTE";
    overlay.resize(n.width, n.height);
    overlay.fills = [{ ...paint("#09090C"), opacity: 0.86 }];
    overlay.x = 0;
    overlay.y = 0;
    const w = Math.min(420, n.width - 32);
    const card = box("Dialog / " + title, w, true, "bg", 28, 20);
    n.appendChild(card);
    card.layoutPositioning = "ABSOLUTE";
    card.cornerRadius = 28;
    label(card, "↑", 28, "pink");
    label(card, title, 24, "ink");
    const description = text(desc, 13, "muted");
    card.appendChild(description);
    description.resize(w - 56, 60);
    description.textAutoResize = "HEIGHT";
    instance(primary, card, "Выбрать файл", w - 56);
    label(card, "Файлы остаются внутри редактора", 10);
    card.x = (n.width - w) / 2;
    card.y = 160;
    return n;
  }
  const below = Math.max(desktop.height, tablet.height, mobile.height) + 160;
  modal(
    desktop,
    "Импорт SVG",
    "Добавьте исходные векторные элементы в библиотеку.",
    0,
    below,
  );
  modal(
    tablet,
    "Импорт палитры",
    "Загрузите цветовую схему для всей композиции.",
    1520,
    below,
  );
  modal(
    mobile,
    "Открыть проект",
    "Продолжите работу с сохранённой композицией.",
    2624,
    below,
  );
  const note = text(
    "Редактируемые экраны, векторный холст и экземпляры компонентов. Модульный монолит: одна логика для веба и плагина.",
    18,
    "muted",
  );
  screens.appendChild(note);
  note.x = 0;
  note.y = -80;
  figma.currentPage.selection = [desktop, tablet, mobile];
  figma.viewport.scrollAndZoomIntoView([desktop, tablet, mobile]);
  return {
    createdNodeIds: ids,
    desktop: desktop.id,
    tablet: tablet.id,
    mobile: mobile.id,
    components: all.map((n) => n.id),
    pages: [kit.id, screens.id],
  };
}
