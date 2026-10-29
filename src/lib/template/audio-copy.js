const labels = {
  en: [
    "AI narration",
    "Listen to this article",
    "Play",
    "Pause",
    "Audio position",
    "Playback speed",
    "Loading audio\u2026",
    "Unable to load audio. Press play to try again.",
  ],
  ko: [
    "AI \uC74C\uC131",
    "\uC774 \uAE00\uC744 \uC74C\uC131\uC73C\uB85C \uB4E3\uAE30",
    "\uC7AC\uC0DD",
    "\uC77C\uC2DC\uC815\uC9C0",
    "\uC7AC\uC0DD \uC704\uCE58",
    "\uC7AC\uC0DD \uC18D\uB3C4",
    "\uC74C\uC131\uC744 \uBD88\uB7EC\uC624\uB294 \uC911\u2026",
    "\uC74C\uC131\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uC7AC\uC0DD \uBC84\uD2BC\uC73C\uB85C \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.",
  ],
  ja: [
    "AI\u97F3\u58F0",
    "\u3053\u306E\u8A18\u4E8B\u3092\u8074\u304F",
    "\u518D\u751F",
    "\u4E00\u6642\u505C\u6B62",
    "\u518D\u751F\u4F4D\u7F6E",
    "\u518D\u751F\u901F\u5EA6",
    "\u97F3\u58F0\u3092\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026",
    "\u97F3\u58F0\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u518D\u751F\u30DC\u30BF\u30F3\u3067\u518D\u8A66\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  ],
  de: [
    "KI-Erz\xE4hlung",
    "Diesen Artikel anh\xF6ren",
    "Abspielen",
    "Pause",
    "Audioposition",
    "Wiedergabegeschwindigkeit",
    "Audio wird geladen\u2026",
    "Audio konnte nicht geladen werden. Dr\xFCcke auf Wiedergabe, um es erneut zu versuchen.",
  ],
  es: [
    "Narraci\xF3n con IA",
    "Escuchar este art\xEDculo",
    "Reproducir",
    "Pausar",
    "Posici\xF3n del audio",
    "Velocidad de reproducci\xF3n",
    "Cargando audio\u2026",
    "No se pudo cargar el audio. Pulsa reproducir para reintentarlo.",
  ],
  fr: [
    "Narration par IA",
    "\xC9couter cet article",
    "Lire",
    "Pause",
    "Position audio",
    "Vitesse de lecture",
    "Chargement audio\u2026",
    "Impossible de charger l\u2019audio. Appuyez sur lecture pour r\xE9essayer.",
  ],
  it: [
    "Narrazione IA",
    "Ascolta questo articolo",
    "Riproduci",
    "Pausa",
    "Posizione audio",
    "Velocit\xE0 di riproduzione",
    "Caricamento audio\u2026",
    "Impossibile caricare l\u2019audio. Premi Riproduci per riprovare.",
  ],
  pt: [
    "Narra\xE7\xE3o por IA",
    "Ouvir este artigo",
    "Reproduzir",
    "Pausar",
    "Posi\xE7\xE3o do \xE1udio",
    "Velocidade de reprodu\xE7\xE3o",
    "A carregar \xE1udio\u2026",
    "N\xE3o foi poss\xEDvel carregar o \xE1udio. Prima reproduzir para tentar novamente.",
  ],
  "pt-br": [
    "Narra\xE7\xE3o por IA",
    "Ouvir este artigo",
    "Reproduzir",
    "Pausar",
    "Posi\xE7\xE3o do \xE1udio",
    "Velocidade de reprodu\xE7\xE3o",
    "Carregando \xE1udio\u2026",
    "N\xE3o foi poss\xEDvel carregar o \xE1udio. Toque em reproduzir para tentar novamente.",
  ],
  ar: [
    "\u0633\u0631\u062F \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A",
    "\u0627\u0633\u062A\u0645\u0639 \u0625\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u0645\u0642\u0627\u0644",
    "\u062A\u0634\u063A\u064A\u0644",
    "\u0625\u064A\u0642\u0627\u0641 \u0645\u0624\u0642\u062A",
    "\u0645\u0648\u0636\u0639 \u0627\u0644\u0635\u0648\u062A",
    "\u0633\u0631\u0639\u0629 \u0627\u0644\u062A\u0634\u063A\u064A\u0644",
    "\u062C\u0627\u0631\u064D \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0635\u0648\u062A\u2026",
    "\u062A\u0639\u0630\u0651\u0631 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0635\u0648\u062A. \u0627\u0636\u063A\u0637 \u0639\u0644\u0649 \u062A\u0634\u063A\u064A\u0644 \u0644\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u062C\u062F\u062F\u064B\u0627.",
  ],
  "zh-hans": [
    "AI \u6717\u8BFB",
    "\u6536\u542C\u672C\u6587",
    "\u64AD\u653E",
    "\u6682\u505C",
    "\u64AD\u653E\u4F4D\u7F6E",
    "\u64AD\u653E\u901F\u5EA6",
    "\u6B63\u5728\u52A0\u8F7D\u97F3\u9891\u2026",
    "\u65E0\u6CD5\u52A0\u8F7D\u97F3\u9891\u3002\u8BF7\u70B9\u51FB\u64AD\u653E\u91CD\u8BD5\u3002",
  ],
  "zh-hant": [
    "AI \u6717\u8B80",
    "\u6536\u807D\u672C\u6587",
    "\u64AD\u653E",
    "\u66AB\u505C",
    "\u64AD\u653E\u4F4D\u7F6E",
    "\u64AD\u653E\u901F\u5EA6",
    "\u6B63\u5728\u8F09\u5165\u97F3\u8A0A\u2026",
    "\u7121\u6CD5\u8F09\u5165\u97F3\u8A0A\u3002\u8ACB\u9EDE\u64CA\u64AD\u653E\u91CD\u8A66\u3002",
  ],
};
function audioCopy(locale) {
  const normalized = locale.toLowerCase().replaceAll("_", "-");
  const [eyebrow, title, play, pause, position, speed, loading, error] =
    labels[normalized] ??
    labels[normalized.split("-")[0]] ??
    (normalized === "zh" ? labels["zh-hans"] : labels.en);
  return { eyebrow, title, play, pause, position, speed, loading, error };
}
function audioTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "\u2013:\u2013\u2013";
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return `${hours ? `${hours}:${String(minutes).padStart(2, "0")}` : minutes}:${String(total % 60).padStart(2, "0")}`;
}
export { audioCopy, audioTime };
