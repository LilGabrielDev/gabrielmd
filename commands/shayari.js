const fetch = require("node-fetch");
const { translateToEnglish, isLikelyNonEnglish } = require("../lib/translateHelper");

const ENGLISH_SHAYARI_COLLECTION = [
  {
    verse: "The stars shine brightest when the night is at its deepest,\nJust as true hearts reveal their beauty through the hardest storms.",
    theme: "Hope & Resilience",
  },
  {
    verse: "In the quiet garden of memories, your smile blooms like a morning rose,\nUntouched by seasons, unbroken by the coldest wind that blows.",
    theme: "Love & Longing",
  },
  {
    verse: "We walked through shadows just to find each other's gentle light,\nAnd now the darkest wilderness feels like morning's golden sight.",
    theme: "Connection",
  },
  {
    verse: "Words left unsaid often echo the loudest within the soul,\nLike soft rain reminding a parched desert it can still be whole.",
    theme: "Emotion",
  },
  {
    verse: "Eyes can speak a thousand poems without uttering a single sound,\nFor wherever love is genuine, silent miracles are found.",
    theme: "Poetic Romance",
  },
  {
    verse: "Like a river seeking the boundless embrace of the ocean sea,\nEvery quiet breath of mine yearns to live in peace and harmony.",
    theme: "Inner Peace",
  },
  {
    verse: "Do not count the steps behind you in sadness or regret,\nLook at the horizon ahead where your brightest dawn is set.",
    theme: "Inspiration",
  },
  {
    verse: "True beauty is not what the eye captures in fleeting light,\nIt is what the soul cherishes through the deepest, silent night.",
    theme: "Soulful Wisdom",
  },
];

function getRandomEnglishShayari() {
  const item =
    ENGLISH_SHAYARI_COLLECTION[
      Math.floor(Math.random() * ENGLISH_SHAYARI_COLLECTION.length)
    ];
  return `✨ *Poetic Shayari (${item.theme})* ✨\n\n"${item.verse}"`;
}

async function shayariCommand(sock, chatId, message) {
  try {
    let finalOutput = null;

    // Try fetching from API
    try {
      const response = await fetch(
        "https://shizoapi.onrender.com/api/texts/shayari?apikey=shizo",
        { timeout: 4000 },
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.result) {
          const raw = String(data.result).trim();
          // If the fetched shayari is in Hindi/Devanagari, translate it to English
          if (isLikelyNonEnglish(raw)) {
            const translated = await translateToEnglish(raw);
            if (translated && translated !== raw && !isLikelyNonEnglish(translated)) {
              finalOutput = `✨ *Poetic Shayari (English)* ✨\n\n"${translated}"`;
            }
          } else {
            finalOutput = `✨ *Poetic Shayari* ✨\n\n"${raw}"`;
          }
        }
      }
    } catch (apiError) {
      // API unavailable
    }

    if (!finalOutput) {
      finalOutput = getRandomEnglishShayari();
    }

    const buttons = [
      {
        buttonId: ".shayari",
        buttonText: { displayText: "Shayari 🪄" },
        type: 1,
      },
      {
        buttonId: ".roseday",
        buttonText: { displayText: "🌹 RoseDay" },
        type: 1,
      },
    ];

    await sock.sendMessage(
      chatId,
      {
        text: finalOutput,
        buttons: buttons,
        headerType: 1,
      },
      { quoted: message },
    );
  } catch (error) {
    console.error("Error in shayari command:", error);
    await sock.sendMessage(
      chatId,
      {
        text: getRandomEnglishShayari(),
      },
      { quoted: message },
    );
  }
}

module.exports = { shayariCommand };
