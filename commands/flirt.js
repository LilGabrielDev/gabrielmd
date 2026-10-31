const fetch = require("node-fetch");
const { ensureEnglish, isLikelyNonEnglish } = require("../lib/translateHelper");

const ENGLISH_FLIRT_LINES = [
  "Are you a magician? Because whenever I look at you, everyone else disappears.",
  "Do you have a map? Because I just keep getting lost in your eyes.",
  "Is your name Google? Because you have everything I’ve been searching for.",
  "If being beautiful was a crime, you’d be serving a life sentence.",
  "Do you believe in love at first sight, or should I walk by again?",
  "Are you a camera? Because every time I look at you, I smile.",
  "If you were a vegetable, you'd be a cute-cumber!",
  "Are you a bank loan? Because you definitely have my interest.",
  "I must be a snowflake, because I've fallen for you.",
  "You must be tired, because you've been running through my mind all day.",
  "Do you have a band-aid? Because I just scraped my knee falling for you.",
  "Is it hot in here, or is it just the spark between us?",
  "If beauty were time, you’d be an eternity.",
  "You must be made of copper and tellurium, because you are Cu-Te!",
  "Can you lend me a kiss? I promise I'll give it right back.",
  "Are you Wi-Fi? Because I'm feeling a really strong connection.",
  "If I could rearrange the alphabet, I’d put 'U' and 'I' together.",
  "Are you an interior decorator? Because when you walked in, the room became beautiful.",
  "I'm not a photographer, but I can definitely picture us together.",
  "Do you have an eraser? Because I can't get you out of my mind.",
  "Your smile must be a superpower, because it just made my whole day.",
  "Are you French? Because Eiffel for you.",
  "Is your dad an artist? Because you are a masterpiece.",
  "Are you a star? Because your light brightens up my whole universe.",
  "I was wondering if you had an extra heart, because mine was just stolen by you.",
];

function getRandomFlirt() {
  const index = Math.floor(Math.random() * ENGLISH_FLIRT_LINES.length);
  return ENGLISH_FLIRT_LINES[index];
}

async function flirtCommand(sock, chatId, message) {
  try {
    let flirtMessage = null;

    // Try Popcat pickuplines API (returns 100% English pickup lines)
    try {
      const res = await fetch("https://api.popcat.xyz/pickuplines", { timeout: 4000 });
      if (res.ok) {
        const json = await res.json();
        if (json && json.pickupline) {
          flirtMessage = json.pickupline;
        }
      }
    } catch (e) {
      // Popcat unavailable
    }

    // Try secondary API if Popcat didn't succeed
    if (!flirtMessage) {
      try {
        const res = await fetch("https://vincenttechblog.in/api/v1/pickup-lines", { timeout: 3000 });
        if (res.ok) {
          const json = await res.json();
          if (json && json.pickup_line) {
            flirtMessage = json.pickup_line;
          }
        }
      } catch (e) {
        // Secondary unavailable
      }
    }

    // If still null or contains non-English, use curated English collection
    if (!flirtMessage || isLikelyNonEnglish(flirtMessage)) {
      if (flirtMessage) {
        flirtMessage = await ensureEnglish(flirtMessage);
      }
      if (!flirtMessage || isLikelyNonEnglish(flirtMessage)) {
        flirtMessage = getRandomFlirt();
      }
    }

    // Send the flirt message
    await sock.sendMessage(chatId, { text: `💖 *Flirt:* ${flirtMessage}` }, { quoted: message });
  } catch (error) {
    console.error("Error in flirt command:", error);
    // Guaranteed English fallback
    await sock.sendMessage(
      chatId,
      { text: `💖 *Flirt:* ${getRandomFlirt()}` },
      { quoted: message },
    );
  }
}

module.exports = { flirtCommand };
