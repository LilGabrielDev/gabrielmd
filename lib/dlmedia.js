const { downloadMediaMessage } = require("@whiskeysockets/baileys");

async function dlBuffer(sock, targetMessage) {
  const buffer = await downloadMediaMessage(
    targetMessage,
    "buffer",
    {},
    {
      logger: undefined,
      reuploadRequest: sock.updateMediaMessage,
    },
  );

  if (!buffer) {
    throw new Error("Media download returned empty buffer");
  }

  return buffer;
}

module.exports = { dlBuffer };
