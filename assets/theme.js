/* Shared light/dark handling. Load this with a plain <script src> in <head>
   (no defer) so the stored theme is applied before the first paint. */
(() => {
  const KEY = 'informatica-theme';
  const root = document.documentElement;

  const stored = (() => {
    try { return localStorage.getItem(KEY); } catch { return null; }
  })();

  const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (stored === 'dark' || stored === 'light') root.setAttribute('data-theme', stored);

  const current = () => root.getAttribute('data-theme') ?? (systemDark() ? 'dark' : 'light');

  function paint() {
    const dark = current() === 'dark';
    for (const btn of document.querySelectorAll('.theme-toggle')) {
      btn.setAttribute('aria-pressed', String(dark));
      btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
      const label = btn.querySelector('.label');
      if (label) label.textContent = dark ? 'dark' : 'light';
    }
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: dark ? 'dark' : 'light' } }));
  }

  function toggle() {
    const next = current() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem(KEY, next); } catch { /* private mode: session-only */ }
    paint();
  }

  // follow the OS while the visitor has not picked a theme
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!root.hasAttribute('data-theme')) paint();
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('.theme-toggle')) toggle();
  });

  document.addEventListener('DOMContentLoaded', paint);
})();
