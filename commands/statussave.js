const settings = require("../settings");
const { getStr, fmt } = require("../lib/theme");
const { dlBuffer } = require("../lib/dlmedia");

async function statusSaveCommand(sock, chatId, message) {
  try {
    const quoted =
      message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted) {
      return sock.sendMessage(
        chatId,
        {
          text: fmt(
            "📌 *Reply to a status* to save it.\nExample: reply to a status image/video with `.save`",
          ),
        },
        { quoted: message },
      );
    }

    const isImage = !!quoted.imageMessage;
    const isVideo = !!quoted.videoMessage;

    if (!isImage && !isVideo) {
      return sock.sendMessage(
        chatId,
        {
          text: fmt("❌ Only *image* and *video* statuses can be saved."),
        },
        { quoted: message },
      );
    }

    const mediaType = isImage ? "image" : "video";

    await sock.sendPresenceUpdate("composing", chatId);

    const ctx = message.message?.extendedTextMessage?.contextInfo;
    const targetMessage = {
      key: {
        remoteJid: chatId,
        id: ctx?.stanzaId,
        participant: ctx?.participant,
      },
      message: quoted,
    };

    const buffer = await dlBuffer(sock, targetMessage);

    const caption =
      quoted[mediaType].caption ||
      `📥 *Status saved by ${getStr("botName") || "Gabriel MD Bot"}*`;

    await sock.sendMessage(
      chatId,
      {
        [mediaType]: buffer,
        caption,
      },
      { quoted: message },
    );

    await sock.sendPresenceUpdate("paused", chatId);
  } catch (err) {
    console.error("[StatusSave]", err.message);
    await sock.sendMessage(
      chatId,
      {
        text: fmt(`❌ Failed to save status: ${err.message}`),
      },
      { quoted: message },
    );
  }
}

module.exports = statusSaveCommand;
