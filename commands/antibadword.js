const { handleAntiBadwordCommand } = require("../lib/antibadword");
const { getMessageText } = require("../lib/prefix");

async function antibadwordCommand(sock, chatId, message) {
  try {
    const text = getMessageText(message);
    const match = text.trim().split(/\s+/).slice(1).join(" ");
    await handleAntiBadwordCommand(sock, chatId, message, match);
  } catch (error) {
    console.error("Error in antibadword command:", error);
    await sock.sendMessage(
      chatId,
      { text: "❌ *Error processing antibadword command*" },
      { quoted: message },
    );
  }
}

module.exports = antibadwordCommand;
