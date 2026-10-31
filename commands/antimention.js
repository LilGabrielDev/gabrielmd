const {
  setAntimention,
  getAntimention,
  removeAntimention,
  incrementWarningCount,
  resetWarningCount,
  setGlobalAntimention,
  getGlobalAntimention,
  removeGlobalAntimention,
} = require("../lib/index");
const isAdmin = require("../lib/isAdmin");
const isOwnerOrSudo = require("../lib/isOwner");
const { findUsedPrefix, getMessageText } = require("../lib/prefix");

function getRawText(message) {
  const msg = message.message || {};
  return (
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    msg.documentMessage?.caption ||
    ""
  ).toString();
}

function isGroupMention(message) {
  try {
    const msg = message.message || {};

    if (
      msg.groupMentionedMessage ||
      msg.extendedTextMessage?.groupMentionedMessage ||
      msg.groupMentionMessage
    ) {
      return true;
    }

    const contexts = [
      msg.contextInfo,
      msg.extendedTextMessage?.contextInfo,
      msg.imageMessage?.contextInfo,
      msg.videoMessage?.contextInfo,
      msg.documentMessage?.contextInfo,
      msg.stickerMessage?.contextInfo,
      msg.buttonsResponseMessage?.contextInfo,
      msg.listResponseMessage?.contextInfo,
    ].filter(Boolean);

    let mentionedJids = [];

    for (const ctx of contexts) {
      if (Array.isArray(ctx.mentionedJid)) {
        mentionedJids = mentionedJids.concat(ctx.mentionedJid);
      }
      if (Array.isArray(ctx.groupMentions) && ctx.groupMentions.length > 0) {
        return true;
      }
    }

    // Strictly treat mass mentions as group mentions only when a significant number of users are mentioned.
    if (mentionedJids.length >= 10) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error in isGroupMention:", error);
    return false;
  }
}

async function enforceAntimention(sock, chatId, message, senderId) {
  try {
    if (message.key?.fromMe) return;

    const globalConfig = await getGlobalAntimention();
    const groupConfig = await getAntimention(chatId, "on");

    const useGlobal = !!globalConfig?.enabled;
    const useGroup = !!groupConfig?.enabled;

    if (!useGlobal && !useGroup) return;

    const effectiveConfig = useGlobal ? globalConfig : groupConfig;
    const action = effectiveConfig?.action || "delete";

    const adminStatus = await isAdmin(sock, chatId, senderId);
    if (adminStatus.isSenderAdmin) return;

    if (action === "deletekick" && !adminStatus.isBotAdmin) return;

    if (!isGroupMention(message)) return;

    if (action === "delete" || action === "deletewarn" || action === "deletekick") {
      try {
        await sock.sendMessage(chatId, {
          delete: {
            remoteJid: chatId,
            fromMe: false,
            id: message.key.id,
            participant: senderId,
          },
        });
      } catch (error) {
        console.error("Error deleting mention message:", error);
      }
    }

    if (action === "deletewarn") {
      try {
        const warnCount = await incrementWarningCount(chatId, senderId);
        const maxWarnings = 3;

        if (warnCount >= maxWarnings) {
          await sock.groupParticipantsUpdate(chatId, [senderId], "remove");
          await sock.sendMessage(chatId, {
            text: `🚫 @${senderId.split("@")[0]} has been kicked for reaching the maximum number of warnings for mentioning the group.`,
            mentions: [senderId],
          });
          await resetWarningCount(chatId, senderId);
        } else {
          await sock.sendMessage(chatId, {
            text: `⚠️ @${senderId.split("@")[0]}, mentioning the group is not allowed here.\nWarnings: ${warnCount}/${maxWarnings}`,
            mentions: [senderId],
          });
        }
      } catch (error) {
        console.error("Error in warn action:", error);
      }
    }

    if (action === "deletekick") {
      try {
        await sock.groupParticipantsUpdate(chatId, [senderId], "remove");
        await sock.sendMessage(chatId, {
          text: `🚫 @${senderId.split("@")[0]} has been kicked for mentioning the group.`,
          mentions: [senderId],
        });
      } catch (error) {
        console.error("Error kicking user for group mentions:", error);
      }
    }
  } catch (error) {
    console.error("Error in mention detection:", error);
  }
}

async function handleAntimentionCommand(
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

    const prefix = findUsedPrefix(userMessage) || ".";
    const rest = userMessage.slice(prefix.length).trim();
    const parts = rest.split(/\s+/);
    const commandName = parts[0]?.toLowerCase();
    const subCommand = parts[1]?.toLowerCase();

    if (commandName !== "antimention" || !subCommand) {
      const usage = `\`\`\`ANTIMENTION SETUP\n\n${prefix}antimention on\n${prefix}antimention off\n${prefix}antimention delete\n${prefix}antimention deletewarn\n${prefix}antimention deletekick\n${prefix}antimention get\n\`\`\``;
      await sock.sendMessage(chatId, { text: usage }, { quoted: message });
      return;
    }

    switch (subCommand) {
      case "on": {
        const existingConfig = await getAntimention(chatId, "on");
        if (existingConfig?.enabled) {
          await sock.sendMessage(
            chatId,
            { text: "⚠️ Antimention is already on" },
            { quoted: message },
          );
          return;
        }
        const result = await setAntimention(chatId, "on", "delete");
        await sock.sendMessage(
          chatId,
          {
            text: result
              ? "*_Antimention has been turned ON (Default: delete)_*"
              : "*_Failed to turn on Antimention_*",
          },
          { quoted: message },
        );
        break;
      }

      case "off":
        await removeAntimention(chatId, "on");
        await sock.sendMessage(
          chatId,
          { text: "🛑 *_Antimention has been turned OFF_*" },
          { quoted: message },
        );
        break;

      case "delete":
      case "deletewarn":
      case "deletekick": {
        const setResult = await setAntimention(chatId, "on", subCommand);
        await sock.sendMessage(
          chatId,
          {
            text: setResult
              ? `*_Antimention action set to ${subCommand}_*`
              : "*_Failed to set Antimention action_*",
          },
          { quoted: message },
        );
        break;
      }

      case "get": {
        const config = await getAntimention(chatId, "on");
        await sock.sendMessage(
          chatId,
          {
            text: `*_Antimention Configuration:_*\nStatus: ${config?.enabled ? "ON" : "OFF"}\nAction: ${config ? config.action : "Not set"}`,
          },
          { quoted: message },
        );
        break;
      }

      default:
        await sock.sendMessage(
          chatId,
          { text: `*_Use ${prefix}antimention for usage._*` },
          { quoted: message },
        );
    }
  } catch (error) {
    console.error("Error in antimention command:", error);
    await sock.sendMessage(
      chatId,
      { text: "❌ *_Error processing antimention command_*" },
      { quoted: message },
    );
  }
}

async function handleGlobalAntimentionCommand(sock, chatId, message, userMessage, senderId) {
  try {
    const isOwner = message.key.fromMe || (await isOwnerOrSudo(senderId, sock, chatId));

    if (!isOwner) {
      await sock.sendMessage(
        chatId,
        { text: "🔒 Only bot owner can use this command." },
        { quoted: message },
      );
      return;
    }

    const prefix = findUsedPrefix(userMessage) || ".";
    const rest = userMessage.slice(prefix.length).trim();
    const parts = rest.split(/\s+/);
    const commandName = parts[0]?.toLowerCase();
    const subAction = parts[1]?.toLowerCase();

    if (commandName !== "globalantimention" || !subAction) {
      await sock.sendMessage(
        chatId,
        {
          text: `*GLOBAL ANTIMENTION (Owner only)*\n\n${prefix}globalantimention on\n${prefix}globalantimention off\n${prefix}globalantimention status\n${prefix}globalantimention set delete|deletewarn|deletekick`,
        },
        { quoted: message },
      );
      return;
    }

    if (subAction === "status") {
      const state = await getGlobalAntimention();
      await sock.sendMessage(
        chatId,
        {
          text: `Global Antimention is currently *${state.enabled ? "ON" : "OFF"}*\nAction: *${state.action}*`,
        },
        { quoted: message },
      );
      return;
    }

    if (subAction === "set") {
      const newAction = parts[2]?.toLowerCase();
      if (!["delete", "deletewarn", "deletekick"].includes(newAction)) {
        await sock.sendMessage(
          chatId,
          {
            text: `Usage: ${prefix}globalantimention set delete|deletewarn|deletekick`,
          },
          { quoted: message },
        );
        return;
      }
      const result = await setGlobalAntimention(true, newAction);
      await sock.sendMessage(
        chatId,
        {
          text: result
            ? `✅ Global antimention action set to *${newAction}*.`
            : "❌ Failed to set global antimention action.",
        },
        { quoted: message },
      );
      return;
    }

    if (subAction === "on" || subAction === "off") {
      const state = await getGlobalAntimention();
      const enable = subAction === "on";
      const result = await setGlobalAntimention(enable, state.action);
      await sock.sendMessage(
        chatId,
        {
          text: result
            ? `Global Antimention is now *${enable ? "ENABLED" : "DISABLED"}*.`
            : "❌ Failed to update global antimention.",
        },
        { quoted: message },
      );
      return;
    }

    await sock.sendMessage(
      chatId,
      {
        text: `*GLOBAL ANTIMENTION (Owner only)*\n\n${prefix}globalantimention on\n${prefix}globalantimention off\n${prefix}globalantimention status\n${prefix}globalantimention set delete|deletewarn|deletekick`,
      },
      { quoted: message },
    );
  } catch (error) {
    console.error("Error in global antimention command:", error);
    await sock.sendMessage(
      chatId,
      { text: "❌ Error processing global antimention command" },
      { quoted: message },
    );
  }
}

module.exports = {
  handleAntimentionCommand,
  handleMentionDetection: enforceAntimention,
  handleGlobalAntimentionCommand,
  isGroupMention,
};
