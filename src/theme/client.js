import { copy } from "./copy.js";

export function mountShell(data) {
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute(
      "content",
      document.documentElement.dataset.theme === "dark" ? "#181a1d" : "#ffffff",
    );
  const toggle = document.querySelector(".theme-toggle");
  toggle?.addEventListener("click", () => {
    const theme =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#181a1d" : "#ffffff");
    try {
      localStorage.setItem("gitblog-theme", theme);
    } catch {
      /* optional storage */
    }
  });
  const dialog = document.getElementById("mobile-nav"),
    trigger = document.querySelector(".mobile-menu");
  let previousOverflow = "";
  trigger?.addEventListener("click", () => {
    previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    trigger.setAttribute("aria-expanded", "true");
  });
  dialog?.addEventListener("close", () => {
    document.body.style.overflow = previousOverflow;
    trigger?.setAttribute("aria-expanded", "false");
  });
  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog || event.target.closest("[data-close-menu], a"))
      dialog.close();
  });
  const dropdowns = [
    ...document.querySelectorAll(".language-menu, .topic-filter"),
  ];
  document.addEventListener("pointerdown", (event) =>
    dropdowns.forEach((menu) => {
      if (!menu.contains(event.target)) menu.open = false;
    }),
  );
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape")
      dropdowns.forEach((menu) => {
        menu.open = false;
      });
    const editable =
      event.target instanceof Element &&
      event.target.closest('input, textarea, select, [contenteditable="true"]');
    if (
      !editable &&
      (event.key === "/" ||
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k"))
    ) {
      event.preventDefault();
      const input = document.getElementById("query");
      if (input) input.focus();
      else location.assign(data.search);
    }
  });
  if ("IntersectionObserver" in window) {
    const links = [...document.querySelectorAll(".desktop-toc a")];
    const observer = new IntersectionObserver(
      (entries) => {
        const heading = entries.find((e) => e.isIntersecting);
        if (!heading) return;
        links.forEach((link) => {
          if (
            link.hash === `#${heading.target.id}` ||
            decodeURIComponent(link.hash) === `#${heading.target.id}`
          )
            link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      },
      { rootMargin: "-80px 0px -65% 0px" },
    );
    document
      .querySelectorAll(".article-content h2, .article-content h3")
      .forEach((el) => observer.observe(el));
    window.addEventListener("pagehide", (event) => {
      if (!event.persisted) observer.disconnect();
    });
  }
}
export function mountSearch(data) {
  const root = document.querySelector(".search-page");
  if (!root) return;
  const ui = copy(data.locale),
    input = root.querySelector("#query"),
    select = root.querySelector("#search-category");
  const status = root.querySelector(".search-status"),
    results = root.querySelector(".search-results");
  let pagefind,
    entries,
    revision = 0,
    timer;
  const readParams = () => {
    const params = new URLSearchParams(location.search);
    input.value = params.get("q") || "";
    select.value = params.get("category") || "";
  };
  async function search() {
    const current = ++revision,
      query = input.value.trim(),
      category = select.value;
    const url = new URL(location.href);
    query ? url.searchParams.set("q", query) : url.searchParams.delete("q");
    category
      ? url.searchParams.set("category", category)
      : url.searchParams.delete("category");
    history.replaceState(null, "", url);
    try {
      let found = [];
      if (Number(root.dataset.count)) {
        if (!query) {
          entries ??= fetch(root.dataset.index).then((response) => {
            if (!response.ok) throw new Error("Search unavailable");
            return response.json();
          });
          found = (await entries).filter(
            (entry) => !category || entry.category === category,
          );
        } else {
          pagefind ??= import(root.dataset.pagefind);
          const response = await (
            await pagefind
          ).search(query, {
            filters: { locale: data.locale, ...(category ? { category } : {}) },
          });
          found = await Promise.all(
            response.results.map(async (item) => {
              const entry = await item.data();
              return { ...entry.meta, url: entry.url };
            }),
          );
        }
      }
      if (current !== revision) return;
      results.replaceChildren();
      status.textContent = found.length
        ? `${found.length} ${ui.results}`
        : ui.empty;
      for (const entry of found) {
        const article = document.createElement("article");
        article.className = "search-result";
        const meta = document.createElement("p");
        meta.className = "post-meta";
        meta.textContent = `${entry.category || ""} · ${(entry.date || "").slice(0, 10)}`;
        const title = document.createElement("h2"),
          link = document.createElement("a");
        link.href = entry.url;
        link.textContent = entry.title;
        title.append(link);
        const description = document.createElement("p");
        description.textContent = entry.description;
        article.append(meta, title, description);
        results.append(article);
      }
    } catch {
      if (current === revision) {
        entries = undefined;
        pagefind = undefined;
        results.replaceChildren();
        status.textContent = ui.error;
      }
    }
  }
  const schedule = () => {
    clearTimeout(timer);
    revision++;
    timer = setTimeout(search, 120);
  };
  input.addEventListener("input", schedule);
  select.addEventListener("change", schedule);
  root.querySelector("form").addEventListener("submit", (event) => {
    event.preventDefault();
    clearTimeout(timer);
    void search();
  });
  window.addEventListener("popstate", () => {
    readParams();
    void search();
  });
  readParams();
  void search();
}
