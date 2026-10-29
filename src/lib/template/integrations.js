import { analyticsRequest } from "@gitblogapp/browser/analytics";
import { mountMembership } from "@gitblogapp/browser/membership";

export function mountIntegrations(data) {
  const readers = [...document.querySelectorAll("[data-member-id]")].map(
    (host) =>
      mountMembership(host, { id: host.dataset.memberId, locale: data.locale }),
  );
  const related = document.querySelector(".related-panel");
  if (related && data.post) {
    const script = document.createElement("script");
    script.src = "https://gitblog.app/related/v1/client.js";
    script.async = true;
    const attributes = {
      repo: data.integrations.repository,
      "post-id": data.post.id,
      lang: data.locale,
      theme: "auto",
      "show-thumbnail": String(data.integrations.thumbnails),
      limit: String(data.integrations.limit),
    };
    for (const [name, value] of Object.entries(attributes))
      script.setAttribute(`data-${name}`, value);
    related.replaceChildren(script);
  }
  const host = document.querySelector(".giscus"),
    s = data.site;
  let themeObserver;
  if (host && data.post && s.giscusEnabled) {
    const theme = () =>
      document.documentElement.dataset.theme === "dark"
        ? "dark_dimmed"
        : "light";
    const script = document.createElement("script");
    script.src = `${s.giscusHost}/client.js`;
    script.async = true;
    script.crossOrigin = "anonymous";
    const attributes = {
      repo: s.giscusRepo,
      "repo-id": s.giscusRepoId,
      category: s.giscusCategory,
      "category-id": s.giscusCategoryId,
      mapping: "specific",
      term: data.post.giscusTerm,
      strict: "0",
      "reactions-enabled": "1",
      "emit-metadata": "0",
      "input-position": "top",
      loading: "lazy",
      lang: data.locale.split("-")[0],
      theme: theme(),
    };
    for (const [name, value] of Object.entries(attributes))
      script.setAttribute(`data-${name}`, value);
    host.replaceChildren(script);
    themeObserver = new MutationObserver(() =>
      host
        .querySelector("iframe")
        ?.contentWindow?.postMessage(
          { giscus: { setConfig: { theme: theme() } } },
          s.giscusHost,
        ),
    );
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
  }
  const request = analyticsRequest(
    data.integrations.analytics,
    location.href,
    document.referrer,
    navigator.doNotTrack === "1" || navigator.globalPrivacyControl === true,
  );
  let timer,
    sent = false;
  const send = () => {
    if (!request || sent || document.visibilityState !== "visible") return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (sent || document.visibilityState !== "visible") return;
      sent = true;
      void fetch(request.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request.body),
        credentials: "omit",
        keepalive: true,
      }).catch(() => {});
    }, 800);
  };
  if (request) {
    document.addEventListener("visibilitychange", send);
    send();
  }
  window.addEventListener("pagehide", (event) => {
    clearTimeout(timer);
    if (!event.persisted) {
      readers.forEach((reader) => reader.destroy());
      themeObserver?.disconnect();
      document.removeEventListener("visibilitychange", send);
    }
  });
  window.addEventListener("pageshow", send);
}
