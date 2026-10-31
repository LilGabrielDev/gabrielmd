const settings = require("../settings");
const { getPrimaryPrefix } = require("../lib/prefix");
async function aliveCommand(sock, chatId, message) {
  try {
    const p = getPrimaryPrefix();
    const message1 =
      `*🤖 Gabriel MD Bot is Alive!*\n\n` +
      `*Version:* ${settings.version}\n` +
      `*Status:* Online\n` +
      `*Mode:* Public\n` +
      `*Prefix:* ${p}\n\n` +
      `*🌟 Features:*\n` +
      `• Group Management\n` +
      `• Antilink Protection\n` +
      `• Fun Commands\n` +
      `• And more!\n\n` +
      `Type *${p}menu* for full command list`;

    await sock.sendMessage(
      chatId,
      {
        text: message1,

      },
      { quoted: message },
    );
  } catch (error) {
    console.error("Error in alive command:", error);
    await sock.sendMessage(
      chatId,
      { text: "🤖 Bot is alive and running!" },
      { quoted: message },
    );
  }
}

module.exports = aliveCommand;
