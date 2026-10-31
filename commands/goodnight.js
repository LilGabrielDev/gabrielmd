const fetch = require("node-fetch");
const { ensureEnglish, isLikelyNonEnglish } = require("../lib/translateHelper");

const ENGLISH_GOODNIGHT_MESSAGES = [
  "🌙 Good night! May the stars guide your dreams and the morning bring you joy and peace.",
  "✨ As the day turns into night, keep your worries out of sight. Close your eyes and go to sleep, good night and sweet dreams!",
  "🌌 May gentle dreams wrap around you tonight like a warm blanket. Rest well and wake up refreshed!",
  "🌠 Look up at the stars tonight; each one is a gentle reminder to rest your mind and recharge your spirit. Sleep tight!",
  "😴 Tonight, let go of yesterday's stress and embrace tomorrow's possibilities. Wishing you a peaceful and restful night.",
  "🌙 The night whispers calmness to those who listen. Close your eyes, breathe deeply, and drift into peaceful slumber.",
  "⭐ May your sleep be sweet, your dreams be bright, and your morning full of new energy. Good night!",
  "🌟 Leave your troubles under the pillow and let sweet dreams fill your sleep tonight. Have a wonderful rest!",
  "💤 May the quiet of the night bring peace to your mind, rest to your body, and calm to your soul. Good night!",
  "✨ May angels watch over your sleep tonight and welcome you to a bright and cheerful tomorrow.",
  "🌙 Drift into dreamland with a smile on your face and peace in your heart. Good night and sweet dreams!",
  "🌠 The darker the night, the brighter the stars shine. Rest your mind, tomorrow is full of promise. Sleep well!",
];

function getRandomGoodnight() {
  const index = Math.floor(Math.random() * ENGLISH_GOODNIGHT_MESSAGES.length);
  return ENGLISH_GOODNIGHT_MESSAGES[index];
}

async function goodnightCommand(sock, chatId, message) {
  try {
    let goodnightMessage = null;

    // Check if external quote API has an English bedtime/goodnight quote
    try {
      const res = await fetch("https://zenquotes.io/api/random", { timeout: 3500 });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json) && json[0]?.q) {
          goodnightMessage = `🌙 *Good Night!* 🌙\n\n_"${json[0].q}"_\n— *${json[0].a}*\n\nSleep peacefully and sweet dreams! ✨`;
        }
      }
    } catch (e) {
      // API fallback
    }

    if (!goodnightMessage || isLikelyNonEnglish(goodnightMessage)) {
      goodnightMessage = getRandomGoodnight();
    }

    // Always ensure message is strictly in English
    goodnightMessage = await ensureEnglish(goodnightMessage);

    await sock.sendMessage(
      chatId,
      { text: goodnightMessage },
      { quoted: message },
    );
  } catch (error) {
    console.error("Error in goodnight command:", error);
    await sock.sendMessage(
      chatId,
      { text: getRandomGoodnight() },
      { quoted: message },
    );
  }
}

module.exports = { goodnightCommand };
