import "./theme/global.css";
import "./theme/audio.css";
import { mountShell, mountSearch } from "./theme/client.js";
import { mountArticleAudio } from "./lib/template/article-audio.js";
import { mountIntegrations } from "./lib/template/integrations.js";
import { mountExtensions } from "./extensions/client.js";

const payload = document.getElementById("page-data");
if (payload) {
  const data = JSON.parse(payload.textContent);
  mountShell(data);
  mountSearch(data);
  document.querySelectorAll("[data-article-audio]").forEach(mountArticleAudio);
  mountIntegrations(data);
  mountExtensions(data);
}
