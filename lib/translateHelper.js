const fetch = require("node-fetch");

// Non-Latin character ranges (Devanagari, Arabic, Cyrillic, Chinese/Japanese/Korean, etc.)
const NON_LATIN_REGEX = /[\u0600-\u06FF\u0900-\u097F\u0A00-\u0A7F\u0B00-\u0B7F\u0C00-\u0C7F\u0D00-\u0D7F\u4E00-\u9FFF\u3040-\u30FF\u0400-\u04FF]/;

// Common non-English markers (Indonesian, Spanish, Hindi/Urdu, Swahili, etc.)
const FOREIGN_WORD_PATTERNS = [
  // Indonesian
  /\b(halo|apa\s+kabar|selamat\s+(pagi|siang|malam|datang)|terima\s+kasih|sama-sama|tidak|bisa|saya|kamu|adalah|ini|itu|dengan|untuk|dari|yang|sudah|bukan|hanya|mereka|kita|kami|kenapa|mengapa|bagaimana|siapa)\b/i,
  // Spanish
  /\b(hola|cómo\s+estás|buenos\s+(días|tardes|noches)|gracias|de\s+nada|por\s+favor|amigo|amiga|lo\s+siento|adiós|hasta\s+luego)\b/i,
  // Swahili
  /\b(habari|jambo|hujambo|sijambo|asante|karibu|rafiki|kwaheri|sawa|nzuri|hakuna\s+matata)\b/i,
  // Hindi / Urdu (Romanized)
  /\b(kaise\s+ho|kya\s+haal|shukriya|bahut\s+achha|mera\s+naam|tumhara|aapka|hum|tum|meri\s+jaan|zindagi|mohabbat|pyaar|ishq|dost|kese\s+ho|kya\s+kar\s+rahe\s+ho)\b/i,
];

/**
 * Checks if the given text likely contains non-English content.
 * @param {string} text
 * @returns {boolean}
 */
function isLikelyNonEnglish(text) {
  if (!text || typeof text !== "string") return false;
  const clean = text.trim();
  if (clean.length === 0) return false;

  // Check for non-Latin script characters
  if (NON_LATIN_REGEX.test(clean)) return true;

  // Check for common foreign phrases / words
  for (const pattern of FOREIGN_WORD_PATTERNS) {
    if (pattern.test(clean)) return true;
  }

  return false;
}

/**
 * Translates non-English text to English using free translation endpoints.
 * @param {string} text
 * @returns {Promise<string>}
 */
async function translateToEnglish(text) {
  if (!text || typeof text !== "string") return text;
  const clean = text.trim();
  if (!clean) return clean;

  // Attempt 1: MyMemory API
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean.slice(0, 1000))}&langpair=autodetect|en`;
    const res = await fetch(url, { timeout: 6000 });
    if (res.ok) {
      const data = await res.json();
      const translated = data?.responseData?.translatedText;
      if (
        translated &&
        !translated.startsWith("MYMEMORY WARNING") &&
        translated.trim() !== clean
      ) {
        return translated.trim();
      }
    }
  } catch (err) {
    // Fallback to next method
  }

  // Attempt 2: Lingva / Google API fallback
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(clean.slice(0, 1000))}`;
    const res = await fetch(url, {
      timeout: 5000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const full = data[0].map((chunk) => chunk[0]).join("");
        if (full && full.trim()) return full.trim();
      }
    }
  } catch (err) {
    // Fallback to original
  }

  return clean;
}

/**
 * Ensures a text response is in English. If non-English is detected, translates it.
 * @param {string} text
 * @returns {Promise<string>}
 */
async function ensureEnglish(text) {
  if (!text || typeof text !== "string") return text;
  if (!isLikelyNonEnglish(text)) {
    return text;
  }
  const translated = await translateToEnglish(text);
  return translated || text;
}

module.exports = {
  isLikelyNonEnglish,
  translateToEnglish,
  ensureEnglish,
};
