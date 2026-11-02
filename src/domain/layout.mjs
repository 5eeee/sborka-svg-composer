const RATIOS = {
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
const intersection = (a, b) =>
  Math.max(
    0,
    Math.min(a.x + a.w / 2, b.x + b.w / 2) -
      Math.max(a.x - a.w / 2, b.x - b.w / 2),
  ) *
  Math.max(
    0,
    Math.min(a.y + a.h / 2, b.y + b.h / 2) -
      Math.max(a.y - a.h / 2, b.y - b.h / 2),
  );
export function fitObjects(
  ids,
  width,
  height,
  variant = 0,
  ratios = {},
  dimensions = {},
) {
  const margin = Math.min(width, height) * 0.07,
    placed = [],
    phase = ((variant % 11) + 11) % 11;
  const requested = ids.slice(0, 10);
  const naturalScale = Math.min(
    ...requested.map((id) => {
      const d = dimensions[id];
      return d
        ? Math.min((width * 0.46) / d.w, (height * 0.58) / d.h)
        : Infinity;
    }),
  );
  for (const [i, id] of requested.entries()) {
    const ratio = ratios[id] || RATIOS[id] || 1;
    const w =
        dimensions[id] && Number.isFinite(naturalScale)
          ? dimensions[id].w * naturalScale
          : Math.min(
              width * (i === 0 ? 0.46 : 0.28),
              (height * (i === 0 ? 0.58 : 0.31)) / ratio,
            ),
      h = w * ratio;
    const item = {
      uid: "o" + Math.random().toString(36).slice(2, 10),
      id,
      x: width * 0.51,
      y: height * 0.55,
      w,
      r: 0,
      background: false,
    };
    if (i === 0) {
      item.x += Math.sin(phase * 1.7) * width * 0.035;
      item.y += Math.cos(phase * 1.3) * height * 0.025;
    } else {
      let best = null;
      for (let step = 0; step < 48; step++) {
        const angle = ((step + phase * 2 + i * 7) * Math.PI) / 24;
        const x = width * 0.5 + Math.cos(angle) * width * 0.31,
          y = height * 0.51 + Math.sin(angle) * height * 0.29;
        const candidate = {
          x: Math.min(width - margin - w / 2, Math.max(margin + w / 2, x)),
          y: Math.min(height - margin - h / 2, Math.max(margin + h / 2, y)),
          w,
          h,
        };
        const overlap = placed.reduce(
          (n, p) => n + intersection(candidate, p) / Math.min(w * h, p.w * p.h),
          0,
        );
        const balance =
          Math.abs(candidate.y / height - (i === 1 ? 0.68 : 0.27)) * 0.08;
        const score =
          overlap * 20 + balance + ((step + phase * 5) % 48) * 0.0003;
        if (!best || score < best.score) best = { ...candidate, score };
      }
      item.x = best.x;
      item.y = best.y;
    }
    item.x = Math.min(width - margin - w / 2, Math.max(margin + w / 2, item.x));
    item.y = Math.min(
      height - margin - h / 2,
      Math.max(margin + h / 2, item.y),
    );
    placed.push({ ...item, h });
  }
  return placed.map(({ h, ...o }) => o);
}
export function fitBackground(
  id,
  width,
  height,
  objects,
  variant = 0,
  ratio = RATIOS[id] || 1,
  requestedWidth = null,
) {
  const w = requestedWidth || Math.min(width * 0.3, (height * 0.43) / ratio),
    h = w * ratio;
  const candidates = [
    [0.2, 0.24],
    [0.8, 0.22],
    [0.2, 0.75],
    [0.8, 0.75],
  ].map(([x, y], i) => ({
    x: Math.max(
      w / 2 + width * 0.05,
      Math.min(width - w / 2 - width * 0.05, width * x),
    ),
    y: Math.max(
      h / 2 + height * 0.05,
      Math.min(height - h / 2 - height * 0.05, height * y),
    ),
    w,
    h,
    i,
  }));
  candidates.sort((a, b) => {
    const score = (c) =>
      objects.reduce(
        (n, o) => n + intersection(c, { ...o, h: o.w * (RATIOS[o.id] || 1) }),
        0,
      ) /
        (w * h) +
      ((c.i + variant) % 4) * 0.025;
    return score(a) - score(b);
  });
  return {
    uid: "bg" + Math.random().toString(36).slice(2, 10),
    id,
    x: candidates[0].x,
    y: candidates[0].y,
    w,
    r: 0,
    background: true,
  };
}
export function clamp(v, min, max) {
  return Math.min(max, Math.max(min, Number(v) || 0));
}
export function resizeScene(state, w, h) {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0)
    throw Error("Некорректный размер холста");
  let b = state.formatBasis;
  if (
    !b ||
    !Number.isFinite(b.w) ||
    !Number.isFinite(b.h) ||
    b.w <= 0 ||
    b.h <= 0 ||
    state.objects.some((o) => !b.objects?.[o.uid])
  ) {
    b = state.formatBasis = {
      w: state.w,
      h: state.h,
      objects: Object.fromEntries(
        state.objects.map((o) => [o.uid, { x: o.x, y: o.y, w: o.w }]),
      ),
    };
  }
  const scale = Math.min(w / b.w, h / b.h);
  for (const o of state.objects) {
    const p = b.objects[o.uid];
    o.x = w === b.w ? p.x : (p.x / b.w) * w;
    o.y = h === b.h ? p.y : (p.y / b.h) * h;
    o.w = scale === 1 ? p.w : p.w * scale;
  }
  state.w = w;
  state.h = h;
  return state;
}
