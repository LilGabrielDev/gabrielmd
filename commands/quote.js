const fetch = require("node-fetch");
const { ensureEnglish, isLikelyNonEnglish } = require("../lib/translateHelper");

const ENGLISH_QUOTES = [
  "\"The only way to do great work is to love what you do.\" — Steve Jobs",
  "\"Believe you can and you're halfway there.\" — Theodore Roosevelt",
  "\"It does not matter how slowly you go as long as you do not stop.\" — Confucius",
  "\"In the middle of every difficulty lies opportunity.\" — Albert Einstein",
  "\"Success is not final, failure is not fatal: it is the courage to continue that counts.\" — Winston Churchill",
  "\"What lies behind us and what lies before us are tiny matters compared to what lies within us.\" — Ralph Waldo Emerson",
  "\"The future belongs to those who believe in the beauty of their dreams.\" — Eleanor Roosevelt",
  "\"Do what you can, with what you have, where you are.\" — Theodore Roosevelt",
  "\"Happiness is not something ready made. It comes from your own actions.\" — Dalai Lama",
];

function getRandomEnglishQuote() {
  const index = Math.floor(Math.random() * ENGLISH_QUOTES.length);
  return ENGLISH_QUOTES[index];
}

module.exports = async function quoteCommand(sock, chatId, message) {
  try {
    let quoteMessage = null;

    // Try ZenQuotes API (100% English quotes with author)
    try {
      const res = await fetch("https://zenquotes.io/api/random", { timeout: 3500 });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json) && json[0]?.q) {
          quoteMessage = `"${json[0].q}" — *${json[0].a}*`;
        }
      }
    } catch (e) {
      // Primary quote API failed
    }

    if (!quoteMessage) {
      try {
        const res = await fetch(
          "https://shizoapi.onrender.com/api/texts/quotes?apikey=shizo",
          { timeout: 3500 },
        );
        if (res.ok) {
          const json = await res.json();
          if (json && json.result) {
            quoteMessage = json.result;
          }
        }
      } catch (e) {
        // Fallback API failed
      }
    }

    if (quoteMessage && isLikelyNonEnglish(quoteMessage)) {
      quoteMessage = await ensureEnglish(quoteMessage);
    }

    if (!quoteMessage || isLikelyNonEnglish(quoteMessage)) {
      quoteMessage = getRandomEnglishQuote();
    }

    // Send the quote message
    await sock.sendMessage(chatId, { text: `💬 ${quoteMessage}` }, { quoted: message });
  } catch (error) {
    console.error("Error in quote command:", error);
    await sock.sendMessage(
      chatId,
      { text: `💬 ${getRandomEnglishQuote()}` },
      { quoted: message },
    );
  }
};
