const { setAntilink, getAntilink, removeAntilink } = require("../lib/index");
const isAdmin = require("../lib/isAdmin");
const { incrementWarningCount, resetWarningCount } = require("../lib/index");

async function handleAntilinkCommand(
  sock,
  chatId,
  userMessage,
  senderId,
  isSenderAdmin,
  message,
) {
  try {
    if (!isSenderAdmin) {
      await sock.sendMessage(
        chatId,
        { text: "🔒 ```For Group Admins Only!```" },
        { quoted: message },
      );
      return;
    }

    const prefix = ".";
    const args = userMessage.slice(9).toLowerCase().trim().split(" ");
    const action = args[0];

    if (!action) {
      const usage = `\`\`\`ANTILINK SETUP\n\n${prefix}antilink on\n${prefix}antilink set delete | kick | warn\n${prefix}antilink off\n\`\`\``;
      await sock.sendMessage(chatId, { text: usage }, { quoted: message });
      return;
    }

    switch (action) {
      case "on":
        const existingConfig = await getAntilink(chatId, "on");
        if (existingConfig?.enabled) {
          await sock.sendMessage(
            chatId,
            { text: "⚠️ *_Antilink is already on_*" },
            { quoted: message },
          );
          return;
        }
        const result = await setAntilink(chatId, "on", "delete");
        await sock.sendMessage(
          chatId,
          {
            text: result
              ? "*_Antilink has been turned ON_*"
              : "*_Failed to turn on Antilink_*",
          },
          { quoted: message },
        );
        break;

      case "off":
        await removeAntilink(chatId, "on");
        await sock.sendMessage(
          chatId,
          { text: "🛑 *_Antilink has been turned OFF_*" },
          { quoted: message },
        );
        break;

      case "set":
        if (args.length < 2) {
          await sock.sendMessage(
            chatId,
            {
              text: `*_Please specify an action: ${prefix}antilink set delete | kick | warn_*`,
            },
            { quoted: message },
          );
          return;
        }
        const setAction = args[1];
        if (!["delete", "kick", "warn"].includes(setAction)) {
          await sock.sendMessage(
            chatId,
            {
              text: "❌ *_Invalid action. Choose delete, kick, or warn._*",
            },
            { quoted: message },
          );
          return;
        }
        const setResult = await setAntilink(chatId, "on", setAction);
        await sock.sendMessage(
          chatId,
          {
            text: setResult
              ? `*_Antilink action set to ${setAction}_*`
              : "*_Failed to set Antilink action_*",
          },
          { quoted: message },
        );
        break;

      case "get":
        const status = await getAntilink(chatId, "on");
        const actionConfig = await getAntilink(chatId, "on");
        await sock.sendMessage(
          chatId,
          {
            text: `*_Antilink Configuration:_*\nStatus: ${status ? "ON" : "OFF"}\nAction: ${actionConfig ? actionConfig.action : "Not set"}`,
          },
          { quoted: message },
        );
        break;

      default:
        await sock.sendMessage(chatId, {
          text: `ℹ️ *_Use ${prefix}antilink for usage._*`,
        });
    }
  } catch (error) {
    console.error("Error in antilink command:", error);
    await sock.sendMessage(chatId, {
      text: "❌ *_Error processing antilink command_*",
    });
  }
}

async function handleLinkDetection(
  sock,
  chatId,
  message,
  userMessage,
  senderId,
) {
  try {
    const config = await getAntilink(chatId, "on");
    if (!config || !config.enabled) return;

    const action = config.action || "delete";
    const text = userMessage || "";
    if (!containsURL(text.trim())) return;

    const shouldDelete = true;
    const quotedMessageId = message.key.id;
    const quotedParticipant = message.key.participant || senderId;

    try {
      await sock.sendMessage(chatId, {
        delete: {
          remoteJid: chatId,
          fromMe: false,
          id: quotedMessageId,
          participant: quotedParticipant,
        },
      });
    } catch (error) {
      console.error("Failed to delete message:", error);
    }

    const skipResponse = shouldSkipResponse(chatId, senderId);

    switch (action) {
      case "delete":
        if (!skipResponse) {
          await sock.sendMessage(chatId, {
            text: `🔗 @${senderId.split("@")[0]}, links are not allowed.`,
            mentions: [senderId],
          });
        }
        break;

      case "kick":
        try {
          await sock.groupParticipantsUpdate(chatId, [senderId], "remove");
          await sock.sendMessage(chatId, {
            text: `🚫 @${senderId.split("@")[0]} has been kicked for sending links.`,
            mentions: [senderId],
          });
        } catch (error) {
          console.error("Error kicking user for antilink:", error);
        }
        break;

      case "warn":
        try {
          const warningCount = await incrementWarningCount(chatId, senderId);
          if (warningCount >= 3) {
            await sock.groupParticipantsUpdate(chatId, [senderId], "remove");
            await resetWarningCount(chatId, senderId);
            await sock.sendMessage(chatId, {
              text: `🚫 @${senderId.split("@")[0]} has been kicked after 3 warnings for sending links.`,
              mentions: [senderId],
            });
          } else if (!skipResponse) {
            await sock.sendMessage(chatId, {
              text: `⚠️ @${senderId.split("@")[0]}, warning ${warningCount}/3 for sending links.`,
              mentions: [senderId],
            });
          }
        } catch (error) {
          console.error("Error warning user for antilink:", error);
        }
        break;
    }
  } catch (error) {
    console.error("Error in link detection:", error);
  }
}

function containsURL(str) {
  const urlRegex = /(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/[^\s]*)?/i;
  return urlRegex.test(str);
}

function shouldSkipResponse(jid, sender) {
  const key = `${jid}:${sender}`;
  const now = Date.now();
  const lastTime = responseCooldown.get(key) || 0;
  if (now - lastTime < 30000) return true;
  responseCooldown.set(key, now);
  return false;
}

module.exports = {
  handleAntilinkCommand,
  handleLinkDetection,
};
