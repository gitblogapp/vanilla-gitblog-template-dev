const paths = {
  journal: "M5 4h11v14H5zM9 8h4m-4 4h4M10 21h10V7",
  book: "M4 3h11a4 4 0 0 1 4 4v14H8a4 4 0 0 1-4-4V3Zm0 13h15M8 7h7m-7 4h7",
  file: "M14 2H5v20h14V7Zm0 0v6h5M8 12h8m-8 4h6",
  search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  folder: "M3 5h6l2 3h10v12H3V5Z",
  branch:
    "M6 3v12a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm12-9v7a5 5 0 0 1-5 5H9M9 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  chevron: "m6 9 6 6 6-6",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  back: "M20 12H4m6-6-6 6 6 6",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "m6 6 12 12M6 18 18 6",
  sun: "M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  moon: "M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z",
  rss: "M5 10a9 9 0 0 1 9 9M5 4a15 15 0 0 1 15 15M6 18v1H5v-1h1",
  external: "M14 3h7v7m0-7L11 13M10 3H3v18h18v-7",
  tag: "M3 3h8l10 10-8 8L3 11V3Zm4 4h.01",
  clock: "M12 7v5l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  check: "m5 12 4 4L19 6",
  lock: "M6 10h12v11H6V10Zm3 0V6a3 3 0 0 1 6 0v4m-3 5v2",
  globe:
    "M2 12h20M12 2c6 5 6 15 0 20-6-5-6-15 0-20Zm10 10a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
};
export function icon(name, className = "") {
  if (!paths[name]) throw new Error(`Unknown icon: ${name}`);
  return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]}"></path></svg>`;
}
