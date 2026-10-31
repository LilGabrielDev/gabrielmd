const fetch = require("node-fetch");
const { ensureEnglish, isLikelyNonEnglish } = require("../lib/translateHelper");

const ENGLISH_DARES = [
  "Send a funny voice note to this group singing the chorus of your favorite song.",
  "Change your WhatsApp status to 'I love potatoes' for the next 2 hours.",
  "Send a screenshot of your screen time to this group without deleting anything.",
  "Text the 3rd person in your recent chats: 'I have something urgent to confess...'",
  "Type your name using only your nose and send it in this chat.",
  "Send the most awkward selfie you can take right now.",
  "Speak in rhymes for the next 5 messages you send in this group.",
  "Send the first meme in your phone gallery with no context whatsoever.",
  "Change your profile bio to 'Currently running on 1% battery and 99% pure luck'.",
  "Call a friend or family member and try to keep them on the line for 1 minute speaking like a robot.",
  "Send a 10-second audio clip telling your best joke.",
  "Tell the group the most awkward photo currently saved on your phone.",
  "Compliment every person who speaks in this chat for the next 10 minutes.",
  "Send your last searched item on YouTube or Google.",
  "Do 15 push-ups or 20 jumping jacks and send a voice note counting them out loud.",
];

function getRandomDare() {
  const index = Math.floor(Math.random() * ENGLISH_DARES.length);
  return ENGLISH_DARES[index];
}

async function dareCommand(sock, chatId, message) {
  try {
    let dareMessage = null;

    try {
      const res = await fetch("https://api.truthordarebot.xyz/v1/dare", { timeout: 3500 });
      if (res.ok) {
        const json = await res.json();
        if (json && json.question) {
          dareMessage = json.question;
        }
      }
    } catch (e) {
      // Primary API failed
    }

    if (!dareMessage) {
      try {
        const res = await fetch("https://shizoapi.onrender.com/api/texts/dare?apikey=shizo", { timeout: 3500 });
        if (res.ok) {
          const json = await res.json();
          if (json && json.result) {
            dareMessage = json.result;
          }
        }
      } catch (e) {
        // Fallback failed
      }
    }

    // Ensure it's English; if non-English detected, translate or use curated list
    if (dareMessage && isLikelyNonEnglish(dareMessage)) {
      dareMessage = await ensureEnglish(dareMessage);
    }

    if (!dareMessage || isLikelyNonEnglish(dareMessage)) {
      dareMessage = getRandomDare();
    }

    // Send the dare message
    await sock.sendMessage(chatId, { text: `🔥 *Dare:* ${dareMessage}` }, { quoted: message });
  } catch (error) {
    console.error("Error in dare command:", error);
    await sock.sendMessage(
      chatId,
      { text: `🔥 *Dare:* ${getRandomDare()}` },
      { quoted: message },
    );
  }
}

module.exports = { dareCommand };
