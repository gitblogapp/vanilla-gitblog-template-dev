import { audioCopy } from "./audio-copy.js";
import { html } from "./html.js";

export function articleAudio(src, locale = "en") {
  const copy = audioCopy(locale);
  return `<section class="article-audio" data-article-audio data-locale="${html(locale)}" data-pagefind-ignore aria-label="${html(copy.title)}">
    <span class="sr-only">${html(copy.eyebrow)}</span>
    <audio src="${html(src)}" preload="none" controls aria-label="${html(copy.title)}"></audio>
    <div class="audio-controls" hidden>
      <button class="audio-play" type="button" aria-label="${html(copy.play)}" aria-busy="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path data-play-icon d="m9 5 11 7-11 7Z"/><path data-pause-icon d="M8 5v14M16 5v14" data-hidden/></svg></button>
      <div class="audio-timeline"><input type="range" min="0" max="1" step="0.1" value="0" disabled aria-label="${html(copy.position)}" aria-valuetext="0:00 / –:––" style="--progress:0%"><div class="audio-time" aria-hidden="true"><span data-elapsed>0:00</span><span data-duration>–:––</span></div></div>
      <div class="audio-speed"><button class="speed-trigger" type="button" aria-label="${html(copy.speed)}: 1×" aria-haspopup="menu" aria-expanded="false"><span data-speed-label>1×</span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></button>
        <div class="speed-menu" role="menu" tabindex="-1" aria-label="${html(copy.speed)}" hidden>${[0.75, 1, 1.25, 1.5, 2].map((rate) => `<button type="button" role="menuitemradio" aria-checked="${rate === 1}" tabindex="${rate === 1 ? 0 : -1}" data-rate="${rate}"><span>${rate}×</span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3 3 7-7"/></svg></button>`).join("")}</div>
      </div>
    </div><span class="audio-feedback sr-only" role="status"></span>
  </section>`;
}
