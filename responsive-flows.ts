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
