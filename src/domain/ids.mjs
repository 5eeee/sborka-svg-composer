let idCounter = 0;
export function uniqueId() {
  return (
    "u" +
    Date.now().toString(36) +
    (++idCounter).toString(36) +
    Math.random().toString(36).slice(2, 9)
  );
}
