const HTML_TAG_RE = /<[^>]+>/g;
const URL_RE = /https?:\/\/\S+/g;
const WHITESPACE_RE = /\s+/g;
const REPEATED_CHAR_RE = /([!?.])\1{2,}/g;

export function cleanText(raw: string): string {
  return raw
    .replace(HTML_TAG_RE, " ")
    .replace(URL_RE, " ")
    .replace(REPEATED_CHAR_RE, "$1$1")
    .replace(WHITESPACE_RE, " ")
    .trim();
}

// Lightweight script/stopword based language guess covering the languages
// most likely to appear in Spotify feedback. Not a substitute for a proper
// language-ID model, but sufficient to route translation when needed and to
// keep the pipeline fully functional without external services.
const SCRIPT_RANGES: Array<{ lang: string; re: RegExp }> = [
  { lang: "ja", re: /[぀-ヿㇰ-ㇿ]/ },
  { lang: "ko", re: /[가-힯]/ },
  { lang: "zh", re: /[一-鿿]/ },
  { lang: "ar", re: /[؀-ۿ]/ },
  { lang: "ru", re: /[Ѐ-ӿ]/ },
  { lang: "th", re: /[฀-๿]/ },
  { lang: "hi", re: /[ऀ-ॿ]/ },
];

const STOPWORDS: Record<string, string[]> = {
  es: ["que", "para", "esto", "muy", "pero", "porque", "cancion", "canciones"],
  pt: ["que", "para", "muito", "mas", "porque", "musica", "musicas", "não"],
  fr: ["que", "pour", "très", "mais", "parce", "chanson", "chansons"],
  de: ["und", "aber", "sehr", "weil", "lied", "lieder", "nicht"],
  id: ["yang", "untuk", "sangat", "tapi", "karena", "lagu"],
};

export function detectLanguage(text: string): string {
  for (const { lang, re } of SCRIPT_RANGES) {
    if (re.test(text)) return lang;
  }
  const lower = ` ${text.toLowerCase()} `;
  let best: { lang: string; hits: number } = { lang: "en", hits: 0 };
  for (const [lang, words] of Object.entries(STOPWORDS)) {
    const hits = words.reduce((n, w) => n + (lower.includes(` ${w} `) ? 1 : 0), 0);
    if (hits > best.hits) best = { lang, hits };
  }
  return best.hits >= 2 ? best.lang : "en";
}
