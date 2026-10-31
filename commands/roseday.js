const fetch = require("node-fetch");
const { ensureEnglish, isLikelyNonEnglish } = require("../lib/translateHelper");

const ENGLISH_ROSEDAY_QUOTES = [
  "🌹 A single rose can be my garden, and a single friend, my world. Happy Rose Day!",
  "🌹 Sending you a bunch of roses to let you know how special you are to me. May your life be filled with happiness and blooming smiles!",
  "🌹 Just like a rose spreads its sweet fragrance everywhere, may your presence always brighten up everyone's day. Happy Rose Day!",
  "🌹 Life is like a rose: every petal represents a dream, and every thorn is a reality to conquer. Keep blooming!",
  "🌹 Sending you a rose filled with love, laughter, and blessings. Wishing you a beautiful Rose Day!",
  "🌹 Beauty may catch the attention, but character captures the heart. Like a rose, you bring grace everywhere you go.",
  "🌹 Roses are red, violets are blue, having a wonderful friend/person like you makes everything feel brand new. Happy Rose Day!",
];

function getRandomRoseDay() {
  const index = Math.floor(Math.random() * ENGLISH_ROSEDAY_QUOTES.length);
  return ENGLISH_ROSEDAY_QUOTES[index];
}

async function rosedayCommand(sock, chatId, message) {
  try {
    let rosedayMessage = null;

    try {
      const res = await fetch(
        `https://api.princetechn.com/api/fun/roseday?apikey=prince`,
        { timeout: 4000 },
      );
      if (res.ok) {
        const json = await res.json();
        if (json && json.result) {
          rosedayMessage = json.result;
        }
      }
    } catch (e) {
      // Primary API failed
    }

    if (rosedayMessage && isLikelyNonEnglish(rosedayMessage)) {
      rosedayMessage = await ensureEnglish(rosedayMessage);
    }

    if (!rosedayMessage || isLikelyNonEnglish(rosedayMessage)) {
      rosedayMessage = getRandomRoseDay();
    }

    // Send the roseday message
    await sock.sendMessage(
      chatId,
      { text: rosedayMessage },
      { quoted: message },
    );
  } catch (error) {
    console.error("Error in roseday command:", error);
    await sock.sendMessage(
      chatId,
      { text: getRandomRoseDay() },
      { quoted: message },
    );
  }
}

module.exports = { rosedayCommand };
