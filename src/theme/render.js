import { html } from "../lib/template/html.js";
import { icon } from "./icons.js";
import { copy } from "./copy.js";
import { articleAudio } from "../lib/template/audio-markup.js";
import { renderSlot } from "../extensions/slots.js";

const uiFor = (d) => ({
  ...copy(d.locale),
  ...(d.locale.split("-")[0] === "ko"
    ? {
        aboutLabel: "소개",
        repository: "저장소",
        articles: "개의 글",
        topicCount: "개의 토픽",
        latestUpdate: "최근 발행",
        introduction: "블로그 소개",
        by: "작성자",
        categories: "카테고리",
        browse: "글 살펴보기",
        allArticles: "모든 글",
        source: "원문",
        published: "발행",
        latestOrder: "최신순",
        notes: "기록",
        noPosts: "아직 발행된 글이 없습니다.",
        emptyIntro: "새로운 아이디어와 배운 것들이 이곳에 쌓입니다.",
      }
    : {
        aboutLabel: "About",
        repository: "Repository",
        articles: "articles",
        topicCount: "topics",
        latestUpdate: "Latest article",
        introduction: "About this blog",
        by: "Written by",
        categories: "Categories",
        browse: "Browse articles",
        allArticles: "All articles",
        source: "Source",
        published: "Published",
        latestOrder: "Newest first",
        notes: "Journal",
        noPosts: "No published articles yet.",
        emptyIntro: "A home for new ideas and things learned along the way.",
      }),
});
const dateText = (date, language) =>
  new Intl.DateTimeFormat(language, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
const topics = (d) => [...new Set(d.posts.map((p) => p.category))];
const categoryUrl = (d, c) => `${d.search}?category=${encodeURIComponent(c)}`;
const slot = (name, d) =>
  renderSlot({
    name,
    site: d.site,
    locale: d.locale,
    pathname: d.pathname,
    post: d.post,
  });

function categoryNav(d) {
  const ui = uiFor(d);
  return `<nav class="side-nav" aria-label="${html(ui.journal)}"><a class="nav-item" href="${html(d.home)}">${icon("book")}${html(ui.overview)}</a><a class="nav-item" href="${html(d.search)}">${icon("search")}${html(ui.allArticles)}<span class="counter">${d.posts.length}</span></a>
    ${
      topics(d).length
        ? `<details class="nav-collection" open><summary>${html(ui.library)}${icon("chevron")}</summary>${topics(
            d,
          )
            .map(
              (c) =>
                `<details class="nav-group" ${!d.post || d.post.category === c ? "open" : ""}><summary>${icon("folder")}<span>${html(c)}</span>${icon("chevron")}</summary><ul><li><a class="nav-post category-all" href="${html(categoryUrl(d, c))}">${html(ui.allArticles)}<span class="counter">${d.posts.filter((p) => p.category === c).length}</span></a></li>${d.posts
                  .filter((p) => p.category === c)
                  .slice(0, 6)
                  .map(
                    (p) =>
                      `<li><a class="nav-post" href="${html(p.url)}" ${d.post?.id === p.id ? 'aria-current="page"' : ""}>${html(p.title)}</a></li>`,
                  )
                  .join("")}</ul></details>`,
            )
            .join("")}</details>`
        : ""
    }
  </nav>`;
}
export function renderHeader(d) {
  const ui = uiFor(d);
  return `<header class="site-header"><div class="header-inner">
    <button class="icon-button mobile-menu" type="button" aria-label="${html(ui.menu)}" aria-controls="mobile-nav" aria-expanded="false">${icon("menu")}</button>
    <a class="brand" href="${html(d.home)}"><span>${html(d.site.title)}</span></a>
    <nav class="header-nav" aria-label="${html(ui.journal)}"><a href="${html(d.home)}" ${["home", "post"].includes(d.page) ? 'aria-current="page"' : ""}>${html(ui.allArticles)}</a><a href="${html(d.home)}#topics">${html(ui.topics)}</a><a href="${html(d.search)}" ${d.page === "search" ? 'aria-current="page"' : ""}>${html(ui.search)}</a></nav>
    <div class="header-tools"><a class="icon-button compact-search" href="${html(d.search)}" aria-label="${html(ui.search)}">${icon("search")}</a>
      ${d.languages.length > 1 ? `<details class="language-menu"><summary aria-label="${html(ui.language)}">${icon("globe")}<span>${html(d.locale.toUpperCase())}</span>${icon("chevron")}</summary><div class="dropdown">${d.languages.map((l) => `<a href="${html(l.href)}" lang="${html(l.locale)}" ${l.locale === d.locale ? 'aria-current="true"' : ""}>${html(l.label)}${l.locale === d.locale ? icon("check") : ""}</a>`).join("")}</div></details>` : ""}
      <button type="button" class="icon-button theme-toggle" aria-label="${html(ui.theme)}" title="${html(ui.theme)}">${icon("sun", "sun")}${icon("moon", "moon")}</button>

    </div>
  </div></header>
  <dialog id="mobile-nav" class="mobile-drawer"><div class="drawer-header"><strong>${html(d.site.title)}</strong><button class="icon-button" data-close-menu type="button" aria-label="${html(ui.close)}">${icon("close")}</button></div>${categoryNav(d)}</dialog>`;
}
function aside(d) {
  const ui = uiFor(d),
    post = d.post;
  const repository = /^[\w.-]+\/[\w.-]+$/.test(d.integrations.repository)
    ? `https://github.com/${d.integrations.repository}`
    : null;
  return `<aside class="blog-sidebar" data-pagefind-ignore>
    ${post?.toc.length ? `<nav class="desktop-toc" aria-label="${html(ui.toc)}"><h2>${html(ui.toc)}</h2><ol>${post.toc.map((h) => `<li class="${h.level === 3 ? "nested" : ""}"><a href="#${html(h.id)}">${html(h.text)}</a></li>`).join("")}</ol></nav>` : ""}
    <section class="sidebar-section"><h2>${html(ui.aboutLabel)}</h2><p class="about-description">${html(d.site.description)}</p><div class="sidebar-links"><a href="${html(d.home)}">${icon("book")}${html(ui.introduction)}</a><a href="${html(d.rss)}">${icon("rss")}${html(ui.rss)}</a>${repository ? `<a href="${html(repository)}" target="_blank" rel="noreferrer">${icon("external")}${html(ui.repository)}</a>` : ""}${d.site.socials.map((s) => `<a href="${html(s.url)}" target="_blank" rel="me noreferrer">${icon("external")}${html(s.label)}</a>`).join("")}</div></section>
    <section id="topics" class="sidebar-section"><h2>${html(ui.topics)}</h2><div class="topic-list">${
      topics(d)
        .map(
          (c) =>
            `<a href="${html(categoryUrl(d, c))}"><span>${html(c)}</span><span class="topic-count">${d.posts.filter((p) => p.category === c).length}</span></a>`,
        )
        .join("") || `<p class="muted">${html(ui.noPosts)}</p>`
    }</div></section>
    <div class="sidebar-credit">${html(d.site.footer)}</div>
  </aside>`;
}
function home(d) {
  const ui = uiFor(d);
  return `<div class="content-column">
    <header class="blog-intro"><h1>${html(d.site.tagline || d.site.title)}</h1><p>${html(d.site.description)}</p></header>
    <div class="list-toolbar"><strong>${html(ui.latest)}</strong><details class="topic-filter"><summary>${html(ui.categories)}${icon("chevron")}</summary><div class="dropdown"><a href="${html(d.search)}">${html(ui.allArticles)}</a>${topics(
      d,
    )
      .map((c) => `<a href="${html(categoryUrl(d, c))}">${html(c)}</a>`)
      .join("")}</div></details></div>
    <section id="articles" class="articles-panel panel" aria-label="${html(ui.latest)}">
      ${d.posts.map((p) => `<article class="article-row"><div class="row-content"><h2><a href="${html(p.url)}">${html(p.title)}</a>${p.access === "membership" ? `<span class="member-badge">${icon("lock")}${html(ui.members)}</span>` : ""}</h2><p>${html(p.description)}</p><div class="row-meta"><a class="row-category" href="${html(categoryUrl(d, p.category))}">${html(p.category)}</a><span>·</span><span>${p.readingMinutes} ${html(ui.minute)}</span><time datetime="${html(p.date)}">${dateText(p.date, d.site.language)}</time></div></div>${p.cover ? `<a class="row-cover" href="${html(p.url)}" tabindex="-1" aria-hidden="true"><img src="${html(p.cover)}" alt="" width="100" height="66" loading="lazy"></a>` : ""}</article>`).join("") || `<div class="empty-state">${icon("book")}<h2>${html(ui.noPosts)}</h2><p>${html(ui.emptyIntro)}</p></div>`}
    </section>
  </div>${aside(d)}`;
}
function integrations(d, post) {
  return `${post.access === "membership" ? `<section class="membership-embed" data-member-id="${html(post.membershipId)}" data-locale="${html(d.locale)}" data-pagefind-ignore><noscript>JavaScript is required to read this membership article.</noscript></section>` : ""}
    ${d.integrations.related ? `<section class="related-panel" data-repo="${html(d.integrations.repository)}" data-post-id="${html(post.id)}" data-lang="${html(d.locale)}" data-limit="${d.integrations.limit}" data-pagefind-ignore></section>` : ""}`;
}
function article(d) {
  const post = d.post,
    ui = uiFor(d),
    index = d.posts.findIndex((p) => p.id === post.id);
  const previous = d.posts[index + 1],
    next = d.posts[index - 1];
  const s = d.site,
    giscus =
      s.giscusEnabled &&
      s.giscusRepo &&
      s.giscusRepoId &&
      s.giscusCategory &&
      s.giscusCategoryId;
  return `<div class="content-column"><div class="article-breadcrumb"><a href="${html(d.home)}">${html(ui.allArticles)}</a><span>/</span><a href="${html(categoryUrl(d, post.category))}">${html(post.category)}</a></div>
    <div class="article-file panel"><div class="article-tools">${d.markdown ? `<a class="button button-small raw-link" href="${html(post.url)}index.md">Markdown</a>` : ""}</div>
      <article class="article" data-pagefind-body data-pagefind-filter="locale:${html(d.locale)}">
        <header class="article-header">${post.access === "membership" ? `<span class="member-badge">${icon("lock")}${html(ui.members)}</span>` : ""}<h1 id="post-title" data-pagefind-meta="title">${html(post.title)}</h1><p class="article-description" data-pagefind-meta="description">${html(post.description)}</p><div class="article-byline"><strong>${html(s.author)}</strong><span>${html(ui.published)} <time datetime="${html(post.date)}">${dateText(post.date, s.language)}</time></span><span>${post.readingMinutes} ${html(ui.minute)}</span></div><span class="sr-only" data-pagefind-meta="date">${html(post.date)}</span><span class="sr-only" data-pagefind-meta="category" data-pagefind-filter="category">${html(post.category)}</span><span class="sr-only">${html(post.aliases.join(" "))}</span></header>
        ${post.toc.length ? `<details class="mobile-toc" data-pagefind-ignore><summary>${html(ui.toc)}${icon("chevron")}</summary><nav aria-label="${html(ui.toc)}"><ol>${post.toc.map((h) => `<li class="${h.level === 3 ? "nested" : ""}"><a href="#${html(h.id)}">${html(h.text)}</a></li>`).join("")}</ol></nav></details>` : ""}
        ${post.cover ? `<img class="article-cover" src="${html(post.cover)}" alt="" width="1200" height="650" fetchpriority="high">` : ""}
        ${slot("article-before-body", d)}${post.audioUrl ? articleAudio(post.audioUrl, d.locale) : ""}
        <div class="prose article-content">${post.html || (post.access === "membership" ? `<p>${html(ui.memberPrompt)}</p>` : "")}</div>
        ${integrations(d, post)}${slot("article-after-body", d)}
        <div class="article-footer" data-pagefind-ignore><div class="tags">${post.tags.map((t) => `<a class="topic-pill" href="${html(d.search)}?q=${encodeURIComponent(t)}" data-pagefind-filter="tag:${html(t)}">${html(t)}</a>`).join("")}</div>${post.updated ? `<p>${html(ui.updated)} ${dateText(post.updated, s.language)}</p>` : ""}</div>
      </article>
    </div>
    ${giscus ? `<section class="comments panel" data-pagefind-ignore><div class="file-heading">${icon("book")}<h2>${html(ui.comments)}</h2></div><div class="giscus"></div></section>` : ""}
    <nav class="article-pagination" aria-label="${html(ui.journal)}">${previous ? `<a href="${html(previous.url)}">${icon("back")}<span><small>${html(ui.previous)}</small>${html(previous.title)}</span></a>` : "<span></span>"}${next ? `<a href="${html(next.url)}"><span><small>${html(ui.next)}</small>${html(next.title)}</span>${icon("arrow")}</a>` : ""}</nav>
  </div>${aside(d)}`;
}
function search(d) {
  const ui = uiFor(d);
  return `<section class="search-page content-column" data-locale="${html(d.locale)}" data-count="${d.posts.length}" data-index="${html(d.home)}search.json" data-pagefind="${html(d.base)}/pagefind/pagefind.js">
    <header class="search-heading"><h1>${html(ui.searchTitle)}</h1><p>${html(ui.searchHint)}</p></header>
    <form class="search-form" role="search"><label class="search-input">${icon("search")}<span class="sr-only">${html(ui.search)}</span><input id="query" type="search" name="q" placeholder="${html(ui.placeholder)}"></label><label class="category-select"><span class="sr-only">${html(ui.topics)}</span><select id="search-category" name="category"><option value="">${html(ui.all)}</option>${topics(
      d,
    )
      .map((c) => `<option>${html(c)}</option>`)
      .join(
        "",
      )}</select>${icon("chevron")}</label><button class="button button-primary" type="submit">${html(ui.search)}</button></form>
    <p class="search-status" role="status" aria-live="polite">${html(ui.searchStart)}</p><div class="search-results"></div>
    <noscript><div class="panel no-script-list">${d.posts.map((p) => `<p><a href="${html(p.url)}">${html(p.title)}</a></p>`).join("")}</div></noscript>
  </section>${aside(d)}`;
}
export function renderContent(d, custom) {
  const ui = uiFor(d);
  if (d.page === "home") return home(d);
  if (d.page === "post" && d.post) return article(d);
  if (d.page === "search") return search(d);
  if (d.page === "custom")
    return `<section class="content-column panel custom-page prose">${custom}</section>${aside(d)}`;
  return `<div class="empty-state full-width"><strong>404</strong><h1>${html(ui.notFound)}</h1><a class="button" href="${html(d.home)}">${icon("back")}${html(ui.back)}</a></div>`;
}
export function renderFooter(d) {
  return `<footer class="site-footer"><a class="footer-brand" href="${html(d.home)}"><span>© ${d.year} ${html(d.site.author)}</span></a><span>${html(d.site.footer)}</span><a href="${html(d.rss)}">RSS</a><a href="https://gitblog.app" target="_blank" rel="noreferrer">GitBlog${icon("external")}</a></footer>${slot("site-footer", d)}`;
}
