import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pickObjects,
  analyzeIdea,
  fitObjects,
  fitBackground,
  validPalette,
  recolor,
  backgroundTones,
  OBJECTS,
} from "../core.mjs";
test("метафора обучения выбирает книгу и наушники", () => {
  const r = pickObjects("Обучение без отвлечений");
  assert.equal(r.matched, true);
  assert.deepEqual(r.ids, ["book", "headphones"]);
});
test("денежный сюжет выбирает исходные денежные объекты", () => {
  const r = pickObjects("Накопить на мечту");
  assert.ok(r.ids.includes("coin"));
  assert.ok(r.ids.every((id) => OBJECTS.some((o) => o.id === id)));
});
test("неизвестный смысл не подменяется случайными объектами", () =>
  assert.deepEqual(pickObjects("космодром и динозавры"), {
    ids: [],
    matched: false,
  }));
test("метафоры интерпретируются в пределах исходной библиотеки", () => {
  assert.equal(pickObjects("Свет в конце тоннеля").ids[0], "lamp");
  assert.equal(pickObjects("Плоды труда").ids[0], "flowers");
  assert.ok(pickObjects("Финансовая подушка").ids.includes("wallet"));
  assert.ok(pickObjects("Learning without distractions").ids.includes("book"));
});
test("раскладка всех поддержанных форматов остаётся числовой", () => {
  for (const [w, h] of [
    [1200, 630],
    [1080, 1080],
    [1080, 1350],
  ])
    for (let v = 0; v < 3; v++) {
      const items = fitObjects(["book", "lamp", "pen", "phone"], w, h, v);
      assert.equal(items.length, 4);
      assert.equal(new Set(items.map((o) => o.uid)).size, 4);
      items.forEach((o) => {
        assert.ok(o.x > 0 && o.x < w);
        assert.ok(o.y > 0 && o.y < h);
        assert.ok(o.w > 0);
      });
    }
});
test("палитра допускает только ограниченный список hex цветов", () => {
  assert.throws(() =>
    validPalette({ background: "url(https://evil)", objects: ["red"] }),
  );
  assert.throws(() =>
    validPalette({
      background: "#ffffff",
      objects: ["#ffffff", "#123456", "javascript:bad"],
    }),
  );
  assert.doesNotThrow(() =>
    validPalette({
      background: "#ffffff",
      objects: ["#eeeeee", "#aaaaaa", "#111111"],
    }),
  );
});

test("задний план связан с темой и не дублирует основные предметы", () => {
  for (const idea of [
    "Обучение без отвлечений",
    "Финансовая подушка",
    "Командная работа",
    "Порядок в документах",
  ]) {
    const p = analyzeIdea(idea);
    assert.ok(p.matched);
    assert.ok(p.backgroundIds.length);
    assert.ok(p.backgroundIds.every((id) => !p.ids.includes(id)));
  }
  assert.deepEqual(analyzeIdea("Книга").backgroundIds, []);
});

test("явное исключение предмета учитывается в основном и заднем плане", () => {
  const p = analyzeIdea("Командная работа без телефона");
  assert.ok(p.ids.includes("puzzle"));
  assert.ok(![...p.ids, ...p.backgroundIds].includes("phone"));
});

test("все элементы автоматически помещаются в широкий, квадратный и вертикальный холст", () => {
  const ratios = {
    puzzle: 0.58,
    book: 0.68,
    phone: 0.58,
    headphones: 0.78,
    lamp: 1.19,
    wallet: 0.63,
    pen: 0.56,
    folder: 0.53,
    coin: 0.66,
    flowers: 1.27,
  };
  for (const [w, h] of [
    [1200, 630],
    [1080, 1080],
    [1080, 1350],
    [200, 5000],
    [5000, 200],
  ])
    for (let v = 0; v < 8; v++) {
      const objects = fitObjects(
        ["flowers", "lamp", "book", "phone"],
        w,
        h,
        v,
        ratios,
      );
      for (const o of objects) {
        const oh = o.w * ratios[o.id];
        assert.ok(o.x - o.w / 2 >= 0 && o.x + o.w / 2 <= w);
        assert.ok(o.y - oh / 2 >= 0 && o.y + oh / 2 <= h);
      }
      const b = fitBackground("lamp", w, h, objects, v, ratios.lamp);
      assert.ok(b.x - b.w / 2 >= 0 && b.x + b.w / 2 <= w);
      assert.ok(
        b.y - (b.w * ratios.lamp) / 2 >= 0 &&
          b.y + (b.w * ratios.lamp) / 2 <= h,
      );
    }
});

test("другой вариант меняет положение предметов, сохраняя исходный набор", () => {
  const variants = Array.from({ length: 6 }, (_, v) =>
    fitObjects(["book", "headphones"], 1200, 630, v),
  );
  assert.equal(
    new Set(variants.map((a) => JSON.stringify(a.map((o) => [o.x, o.y, o.w]))))
      .size,
    6,
  );
  assert.ok(
    variants.every((a) => a.map((o) => o.id).join(",") === "book,headphones"),
  );
});

test("короткая пользовательская палитра не передаёт акценты заднему плану", () => {
  const p = validPalette({
    background: "#ffffff",
    objects: ["#ff0000", "#00ff00", "#0000ff"],
  });
  assert.equal(p.backgroundObjects.length, 2);
  for (const c of ["#D7CDF5", "#7864D7", "#F9A3AA", "#AA9BF0"]) {
    const result = recolor(c, p, true);
    assert.ok(p.backgroundObjects.includes(result));
    assert.ok(!p.objects.includes(result));
  }
  assert.equal(recolor("white", p, true), "#FFFFFF");
  assert.equal(recolor("#181817", p, false), "#181817");
});

test("явные акценты и разноцветные тона заднего плана отклоняются", () => {
  const p = {
    background: "#ffffff",
    objects: ["#ff0000", "#00ff00", "#0000ff"],
  };
  assert.throws(
    () => validPalette({ ...p, backgroundObjects: ["#ff0000"] }),
    /акцент/,
  );
  assert.throws(() => validPalette({ ...p, backgroundObjects: [] }), /1–2/);
  assert.throws(
    () => validPalette({ ...p, backgroundObjects: "#eeeeee" }),
    /1–2/,
  );
  assert.throws(
    () => validPalette({ ...p, backgroundObjects: ["#88aacc", "#ccaa88"] }),
    /монохром/,
  );
  assert.doesNotThrow(() =>
    validPalette({ ...p, backgroundObjects: backgroundTones("#f5f1fc") }),
  );
});

test("основные объекты могут использовать фоновые тона, обратное запрещено", () => {
  const p = validPalette({
    background: "#F5F1FC",
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
    backgroundObjects: ["#D7CDF5", "#7864D7"],
  });
  assert.equal(recolor("#D7CDF5", p, false), "#D7CDF5");
  assert.equal(recolor("#7864D7", p, false), "#7864D7");
  assert.throws(
    () => validPalette({ ...p, backgroundObjects: ["#AA9BF0"] }),
    /акцент/,
  );
});
import { resizeScene } from "../core.mjs";
test("возврат к исходному формату восстанавливает размеры и координаты", () => {
  const state = {
    w: 1200,
    h: 630,
    objects: [{ uid: "a", x: 333, y: 210, w: 412, r: 17 }],
  };
  resizeScene(state, 1080, 1080);
  resizeScene(state, 1080, 1350);
  resizeScene(state, 1200, 630);
  assert.deepEqual(state.objects, [
    { uid: "a", x: 333, y: 210, w: 412, r: 17 },
  ]);
  delete state.formatBasis;
  state.objects[0].w = 500;
  resizeScene(state, 1080, 1080);
  resizeScene(state, 1200, 630);
  assert.equal(state.objects[0].w, 500);
});

test("исходный относительный масштаб сохраняется для всех объектов, размеров и форматов", async () => {
  const fs = await import("node:fs/promises");
  const manifest = JSON.parse(
    await fs.readFile(
      new URL("../assets/manifest.json", import.meta.url),
      "utf8",
    ),
  );
  for (const size of ["S", "L"])
    for (const [w, h] of [
      [1200, 630],
      [1080, 1080],
      [1080, 1350],
    ]) {
      const entries = manifest.filter(
        (a) => a.size === size && a.role === "main",
      );
      const dims = Object.fromEntries(
        entries.map((a) => [a.id, { w: a.viewBox[2], h: a.viewBox[3] }]),
      );
      const ratios = Object.fromEntries(
        entries.map((a) => [a.id, a.viewBox[3] / a.viewBox[2]]),
      );
      for (let i = 0; i < entries.length; i++) {
        const ids = [
          entries[i].id,
          entries[(i + 1) % entries.length].id,
          entries[(i + 4) % entries.length].id,
        ];
        const objects = fitObjects(ids, w, h, 2, ratios, dims);
        const scales = objects.map((o) => o.w / dims[o.id].w);
        assert.ok(scales.every((v) => Math.abs(v - scales[0]) < 1e-10));
      }
    }
});

test("сценарий перечисления сохраняет все явно названные компоненты", () => {
  const result = analyzeIdea(
    "Книга, телефон, наушники, лампа, кошелек, ручка, папка, монета, цветы, пазлы",
  );
  assert.equal(result.ids.length, 10);
  assert.equal(fitObjects(result.ids, 1200, 630).length, 10);
});

test("новые формулировки метафор выбирают предметы по смыслу", () => {
  for (const [text, id] of [
    ["Войти в поток", "headphones"],
    ["Разгрести завалы", "folder"],
    ["Включить голову", "lamp"],
    ["Копить на отпуск", "coin"],
    ["Мысли на бумаге", "pen"],
    ["Протянуть руку", "puzzle"],
  ])
    assert.ok(analyzeIdea(text).ids.includes(id), text);
});
