/**
 * DOM + formatting helpers used by the UI layer.
 *
 * User-provided text is always applied via `textContent`, never `innerHTML`,
 * so player callsigns cannot inject markup or scripts.
 */

/**
 * Create an element with optional classes, text, attributes and children.
 * `text` is set with textContent (safe); use `html` only for trusted markup.
 */
export function el(tag, options = {}) {
  const node = document.createElement(tag);
  const { className, text, html, attrs, dataset, children, on } = options;
  if (className) node.className = className;
  if (text != null) node.textContent = String(text);
  if (html != null) node.innerHTML = html; // only ever called with static, trusted strings
  if (attrs) for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (dataset) for (const [k, v] of Object.entries(dataset)) node.dataset[k] = v;
  if (on) for (const [evt, fn] of Object.entries(on)) node.addEventListener(evt, fn);
  if (children) for (const child of [].concat(children)) if (child) node.append(child);
  return node;
}

/** Remove all children from a node. */
export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** Zero-padded score string, e.g. padScore(1250) -> "001250". */
export function padScore(value, width = 6) {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  return String(n).padStart(width, '0');
}

/** Whole-number metres with a locale-aware thousands separator. */
export function formatMetres(value) {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  return n.toLocaleString('en-US');
}

/**
 * Validate + clean a player callsign.
 * Returns { ok, value, error }. Rejects empty / too-short names, strips control
 * characters and trims to the 16-character maximum. Because the name is later
 * rendered with textContent, any remaining markup is shown as literal text.
 */
export function sanitizeCallsign(raw) {
  const cleaned = String(raw ?? '')
    .split('')
    .filter((ch) => ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) !== 127)
    .join('')
    .trim();
  if (cleaned.length < 2) {
    return { ok: false, value: cleaned, error: 'Callsign needs at least 2 characters.' };
  }
  return { ok: true, value: cleaned.slice(0, 16), error: null };
}
