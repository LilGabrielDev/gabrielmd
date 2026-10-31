const axios = require("axios");
const fetch = require("node-fetch");
const { getMessageText, parseCommand } = require("../lib/prefix");
const { ensureEnglish } = require("../lib/translateHelper");

async function aiCommand(sock, chatId, message) {
  try {
    const text = getMessageText(message);

    if (!text) {
      return await sock.sendMessage(
        chatId,
        {
          text: "❓ Please provide a question after .gpt or .gemini\n\nExample: .gpt write a basic html code",
        },
        {
          quoted: message,
        },
      );
    }

    const { usedPrefix, commandName, argsText: query } = parseCommand(text);

    if (!query) {
      return await sock.sendMessage(
        chatId,
        {
          text: `❓ Please provide a question after ${usedPrefix}${commandName}`,
        },
        { quoted: message },
      );
    }

    try {
      // Show processing message
      await sock.sendMessage(chatId, {
        react: { text: "🤖", key: message.key },
      });

      const englishPrompt = `${query}\n\n(Note: Strictly respond in English only)`;

      let answer = null;

      if (commandName === "gpt") {
        // Try Pollinations first (reliable, fast, English-first)
        try {
          const pollRes = await fetch(
            `https://text.pollinations.ai/${encodeURIComponent(query)}?model=openai&system=${encodeURIComponent("You are a helpful assistant. Always respond strictly in English.")}`,
            { timeout: 7000 },
          );
          if (pollRes.ok) {
            const pollText = await pollRes.text();
            if (pollText && pollText.length > 5 && !pollText.startsWith("<!DOCTYPE")) {
              answer = pollText;
            }
          }
        } catch (e) {
          // Pollinations failed
        }

        // Secondary: zellapi
        if (!answer) {
          try {
            const response = await axios.get(
              `https://zellapi.autos/ai/chatbot?text=${encodeURIComponent(englishPrompt)}`,
              { timeout: 8000 },
            );
            if (response.data && response.data.status && response.data.result) {
              answer = response.data.result;
            }
          } catch (e) {
            // zellapi failed
          }
        }

        if (!answer) {
          throw new Error("Invalid response from GPT API");
        }
      } else if (commandName === "gemini") {
        const apis = [
          // Pollinations with gemini / default model
          `https://text.pollinations.ai/${encodeURIComponent(query)}?model=searchgpt&system=${encodeURIComponent("You are a helpful assistant. Always respond strictly in English.")}`,
          `https://vapis.my.id/api/gemini?q=${encodeURIComponent(englishPrompt)}`,
          `https://api.siputzx.my.id/api/ai/gemini-pro?content=${encodeURIComponent(englishPrompt)}`,
          `https://api.ryzendesu.vip/api/ai/gemini?text=${encodeURIComponent(englishPrompt)}`,
          `https://zellapi.autos/ai/chatbot?text=${encodeURIComponent(englishPrompt)}`,
          `https://api.giftedtech.my.id/api/ai/geminiai?apikey=gifted&q=${encodeURIComponent(englishPrompt)}`,
          `https://api.giftedtech.my.id/api/ai/geminiaipro?apikey=gifted&q=${encodeURIComponent(englishPrompt)}`,
        ];

        for (const api of apis) {
          try {
            const response = await fetch(api, { timeout: 7000 });
            if (!response.ok) continue;

            const contentType = response.headers.get("content-type") || "";
            if (contentType.includes("json")) {
              const data = await response.json();
              if (data && (data.message || data.data || data.answer || data.result)) {
                answer = data.message || data.data || data.answer || data.result;
                break;
              }
            } else {
              const textResult = await response.text();
              if (textResult && textResult.length > 5 && !textResult.startsWith("<!DOCTYPE")) {
                answer = textResult;
                break;
              }
            }
          } catch (e) {
            continue;
          }
        }

        if (!answer) {
          throw new Error("All Gemini APIs failed");
        }
      }

      // Guarantee the response is in English before sending
      const finalEnglishAnswer = await ensureEnglish(answer);

      await sock.sendMessage(
        chatId,
        {
          text: finalEnglishAnswer,
        },
        {
          quoted: message,
        },
      );
    } catch (error) {
      console.error("API Error:", error);
      await sock.sendMessage(
        chatId,
        {
          text: "❌ Failed to get response. Please try again later.",
          contextInfo: {
            mentionedJid: [message.key.participant || message.key.remoteJid],
            quotedMessage: message.message,
          },
        },
        {
          quoted: message,
        },
      );
    }
  } catch (error) {
    console.error("AI Command Error:", error);
    await sock.sendMessage(
      chatId,
      {
        text: "❌ An error occurred. Please try again later.",
        contextInfo: {
          mentionedJid: [message.key.participant || message.key.remoteJid],
          quotedMessage: message.message,
        },
      },
      {
        quoted: message,
      },
    );
  }
}

module.exports = aiCommand;
