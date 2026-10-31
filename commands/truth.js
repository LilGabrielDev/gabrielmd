const fetch = require("node-fetch");
const { ensureEnglish, isLikelyNonEnglish } = require("../lib/translateHelper");

const ENGLISH_TRUTHS = [
  "What is the most embarrassing thing you've ever done in public?",
  "What is your biggest fear that you have never told anyone?",
  "Who was your first crush, and do they know about it?",
  "What is the biggest lie you have ever told your parents?",
  "If you could trade lives with anyone in this group for 24 hours, who would it be?",
  "What is one secret you swore you would take to your grave?",
  "What is your weirdest habit when you are home completely alone?",
  "Have you ever stalked someone on social media for more than an hour?",
  "What is the most childish thing that you still do today?",
  "If you had to delete every app on your phone except three, which three would you keep?",
  "What was your worst date or most awkward romantic encounter?",
  "What is something you pretend to like just to fit in with others?",
  "Have you ever blamed a sibling or friend for something you did?",
  "What is your biggest regret from the past year?",
  "If a genie gave you three wishes right now, what would you ask for?",
];

function getRandomTruth() {
  const index = Math.floor(Math.random() * ENGLISH_TRUTHS.length);
  return ENGLISH_TRUTHS[index];
}

async function truthCommand(sock, chatId, message) {
  try {
    let truthMessage = null;

    try {
      const res = await fetch("https://api.truthordarebot.xyz/v1/truth", { timeout: 3500 });
      if (res.ok) {
        const json = await res.json();
        if (json && json.question) {
          truthMessage = json.question;
        }
      }
    } catch (e) {
      // Primary API failed
    }

    if (!truthMessage) {
      try {
        const res = await fetch("https://shizoapi.onrender.com/api/texts/truth?apikey=shizo", { timeout: 3500 });
        if (res.ok) {
          const json = await res.json();
          if (json && json.result) {
            truthMessage = json.result;
          }
        }
      } catch (e) {
        // Fallback failed
      }
    }

    // Ensure it's English; if non-English detected, translate or use curated list
    if (truthMessage && isLikelyNonEnglish(truthMessage)) {
      truthMessage = await ensureEnglish(truthMessage);
    }

    if (!truthMessage || isLikelyNonEnglish(truthMessage)) {
      truthMessage = getRandomTruth();
    }

    // Send the truth message
    await sock.sendMessage(chatId, { text: `🎯 *Truth:* ${truthMessage}` }, { quoted: message });
  } catch (error) {
    console.error("Error in truth command:", error);
    await sock.sendMessage(
      chatId,
      { text: `🎯 *Truth:* ${getRandomTruth()}` },
      { quoted: message },
    );
  }
}

module.exports = { truthCommand };
