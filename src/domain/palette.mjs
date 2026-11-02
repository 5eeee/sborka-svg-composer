const hex = /^#[0-9a-f]{6}$/i;
const rgb = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const toHex = (a) =>
  "#" +
  a
    .map((n) => Math.round(n).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
export function backgroundTones(canvas) {
  const a = rgb(canvas);
  return [
    toHex(a.map((v) => v * 0.65 + 255 * 0.35)),
    toHex(a.map((v) => v * 0.48 + 40 * 0.52)),
  ];
}
function hue(c) {
  const [r, g, b] = rgb(c).map((v) => v / 255),
    max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min;
  if (d < 0.04) return null;
  return (
    ((max === r ? (g - b) / d : max === g ? 2 + (b - r) / d : 4 + (r - g) / d) *
      60 +
      360) %
    360
  );
}
export function validPalette(data) {
  if (
    !data ||
    !hex.test(data.background) ||
    !Array.isArray(data.objects) ||
    data.objects.length < 3 ||
    data.objects.length > 12 ||
    !data.objects.every((c) => typeof c === "string" && hex.test(c))
  )
    throw Error("Палитра: background и objects (от 3 до 12 цветов #RRGGBB)");
  const out = {
    background: data.background.toUpperCase(),
    objects: data.objects.map((c) => c.toUpperCase()),
  };
  const supplied = data.backgroundObjects;
  if (
    supplied !== undefined &&
    (!Array.isArray(supplied) ||
      supplied.length < 1 ||
      supplied.length > 2 ||
      !supplied.every((c) => typeof c === "string" && hex.test(c)))
  )
    throw Error(
      "Для заднего плана нужны 1–2 цвета #RRGGBB в backgroundObjects",
    );
  out.backgroundObjects = (supplied || backgroundTones(data.background)).map(
    (c) => c.toUpperCase(),
  );
  const accents = new Set(
    (out.objects.length === 8
      ? [1, 2, 3, 5].map((i) => out.objects[i])
      : out.objects
    ).filter((c) => !["#181817", "#000000", "#FFFFFF"].includes(c)),
  );
  if (out.backgroundObjects.some((c) => accents.has(c)))
    throw Error(
      "Цвет заднего плана совпадает с акцентом основных объектов. Выделите отдельные тона в backgroundObjects",
    );
  const hues = out.backgroundObjects.map(hue).filter((h) => h !== null);
  if (
    hues.length > 1 &&
    Math.min(Math.abs(hues[0] - hues[1]), 360 - Math.abs(hues[0] - hues[1])) >
      18
  )
    throw Error(
      "Задний план должен быть монохромным: выберите два тона одного оттенка",
    );
  return out;
}
export function recolor(color, palette, background = false) {
  if (!palette || !color || color === "none" || color.startsWith("url("))
    return color;
  const c =
    color === "white"
      ? "#FFFFFF"
      : color === "black"
        ? "#000000"
        : color.toUpperCase();
  if (background) {
    if (["#FFFFFF", "#000000", "#181817"].includes(c)) return c;
    const dark = ["#7864D7", "#D27532", "#5ABEBE"].includes(c);
    const tones =
      palette.backgroundObjects || backgroundTones(palette.background);
    return tones[Math.min(dark ? 1 : 0, tones.length - 1)];
  }
  const rows = [
    [
      "#D7CDF5",
      "#F9ECB0",
      "#AA9BF0",
      "#F9A3AA",
      "#7864D7",
      "#FFE3E1",
      "#181817",
      "#FFFFFF",
    ],
    [
      "#FDD7B9",
      "#F9ECB0",
      "#FAC896",
      "#80DADA",
      "#D27532",
      "#BEEBEB",
      "#181817",
      "#FFFFFF",
    ],
    [
      "#BEEBEB",
      "#FFD4F2",
      "#80DADA",
      "#6D7BFC",
      "#5ABEBE",
      "#B6C6FE",
      "#181817",
      "#FFFFFF",
    ],
  ];
  for (const row of rows) {
    const i = row.indexOf(c);
    if (i >= 0)
      return i >= 6 && palette.objects.length < 8
        ? row[i]
        : palette.objects[i % palette.objects.length];
  }
  return color;
}
