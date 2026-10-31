const fs = require("fs");
const path = require("path");
const isAdmin = require("../lib/isAdmin");
const isOwnerOrSudo = require("../lib/isOwner");
const { setAntiflood, getAntiflood, removeAntiflood } = require("../lib/index");
const { getPrimaryPrefix } = require("../lib/prefix");

const DATA_PATH = path.join(__dirname, "../data/userGroupData.json");

function loadUserGroupData() {
  try {
    if (fs.existsSync(DATA_PATH))
      return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  } catch {}
  return {};
}

function saveUserGroupData(data) {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  } catch {}
}

function getFloodConfig(chatId) {
  const data = loadUserGroupData();
  return data.antiflood?.[chatId] || null;
}

const floodTracker = new Map();

async function handleFloodDetection(sock, chatId, message, userMessage, senderId) {
  if (!chatId.endsWith("@g.us")) return;

  const cfg = getFloodConfig(chatId);
  if (!cfg || !cfg.enabled) return;

  if (message.key.fromMe) return;

  const adminStatus = await isAdmin(sock, chatId, senderId);
  const ownerStatus = await isOwnerOrSudo(senderId, sock, chatId);

  if (adminStatus.isSenderAdmin || ownerStatus) return;
  if (!adminStatus.isBotAdmin) return;

  const now = Date.now();
  const key = `${chatId}:${senderId}`;
  const windowMs = (typeof cfg.windowSeconds === "number" ? cfg.windowSeconds : 10) * 1000;
  const limit = typeof cfg.limit === "number" ? cfg.limit : 10;

  if (!floodTracker.has(key)) {
    floodTracker.set(key, []);
  }

  const timestamps = floodTracker.get(key);
  timestamps.push(now);

  const pruned = timestamps.filter((t) => now - t <= windowMs);
  floodTracker.set(key, pruned);

  if (pruned.length <= limit) return;

  const action = cfg.action || "delete";

  if (adminStatus.isBotAdmin) {
    try {
      await sock.sendMessage(chatId, { delete: message.key });
    } catch {}
  }

  if ((action === "delete+warn" || action === "kick") && adminStatus.isBotAdmin) {
    const senderNum = senderId.split("@")[0];
    const warnText =
      action === "delete+warn"
        ? `🚨 *Anti-Flood Alert*\n\n@${senderNum} — you are sending messages too fast.\nLimit: ${limit} messages in ${cfg.windowSeconds || 10}s`
        : `🚫 @${senderNum} was *removed* for flooding.`;

    try {
      if (action === "kick") {
        await sock.groupParticipantsUpdate(chatId, [senderId], "remove");
      }
      await sock.sendMessage(
        chatId,
        {
          text: warnText,
          mentions: [senderId],
        },
      );
    } catch {}
  }

  floodTracker.set(key, []);
}

async function handleAntifloodCommand(
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

    const prefix = getPrimaryPrefix();
    const args = userMessage.slice(10).toLowerCase().trim().split(" ");
    const action = args[0];

    if (!action) {
      const usage = `\`\`\`ANTIFLOOD SETUP\n\n${prefix}antiflood on\n${prefix}antiflood off\n${prefix}antiflood strict\n${prefix}antiflood set delete | delete+warn | kick | strict\n${prefix}antiflood setlimit <count> <seconds>\n${prefix}antiflood status\n\`\`\``;
      await sock.sendMessage(chatId, { text: usage }, { quoted: message });
      return;
    }

    switch (action) {
      case "on": {
        const existing = getFloodConfig(chatId);
        if (existing?.enabled) {
          await sock.sendMessage(
            chatId,
            { text: "⚠️ *_AntiFlood is already on_*" },
            { quoted: message },
          );
          return;
        }
        const result = await setAntiflood(chatId, "on", "kick", 10, 10);
        await sock.sendMessage(
          chatId,
          {
            text: result
              ? "*_AntiFlood has been turned ON_*\nAction: kick\nLimit: 10 messages in 10s"
              : "*_Failed to turn on AntiFlood_*",
          },
          { quoted: message },
        );
        break;
      }

      case "strict": {
        const existing = getFloodConfig(chatId);
        const result = await setAntiflood(chatId, "on", "kick", 10, 10);
        await sock.sendMessage(
          chatId,
          {
            text: result
              ? "*_AntiFlood strict mode has been enabled_*\nAction: kick\nLimit: 10 messages in 10s"
              : "*_Failed to enable AntiFlood strict mode_*",
          },
          { quoted: message },
        );
        break;
      }

      case "off": {
        await removeAntiflood(chatId, "on");
        await sock.sendMessage(
          chatId,
          { text: "🛑 *_AntiFlood has been turned OFF_*" },
          { quoted: message },
        );
        break;
      }

      case "set": {
        if (args.length < 2) {
          await sock.sendMessage(
            chatId,
            {
              text: `*_Please specify an action: ${prefix}antiflood set delete | delete+warn | kick | strict_*`,
            },
            { quoted: message },
          );
          return;
        }
        const setAction = args[1];
        if (!["delete", "delete+warn", "kick", "strict"].includes(setAction)) {
          await sock.sendMessage(
            chatId,
            {
              text: "❌ *_Invalid action. Choose delete, delete+warn, kick, or strict._*",
            },
            { quoted: message },
          );
          return;
        }

        const resolvedAction = setAction === "strict" ? "kick" : setAction;
        const cfg = getFloodConfig(chatId) || {};
        const setResult = await setAntiflood(
          chatId,
          "on",
          resolvedAction,
          typeof cfg.limit === "number" ? cfg.limit : 10,
          typeof cfg.windowSeconds === "number" ? cfg.windowSeconds : 10,
        );
        await sock.sendMessage(
          chatId,
          {
            text: setResult
              ? `*_AntiFlood action set to ${setAction === "strict" ? "kick (strict)" : setAction}_*`
              : "*_Failed to set AntiFlood action_*",
          },
          { quoted: message },
        );
        break;
      }

      case "setlimit": {
        const count = parseInt(args[1], 10);
        const seconds = parseInt(args[2], 10);
        if (isNaN(count) || count <= 0 || isNaN(seconds) || seconds <= 0) {
          await sock.sendMessage(
            chatId,
            {
              text: `*_Usage: ${prefix}antiflood setlimit <count> <seconds>_*\nExample: ${prefix}antiflood setlimit 5 5`,
            },
            { quoted: message },
          );
          return;
        }
        const cfg = getFloodConfig(chatId) || {};
        const setResult = await setAntiflood(
          chatId,
          cfg.enabled ? "on" : "off",
          cfg.action || "delete+warn",
          count,
          seconds,
        );
        await sock.sendMessage(
          chatId,
          {
            text: setResult
              ? `*_AntiFlood limit set to ${count} messages in ${seconds}s_*`
              : "*_Failed to set AntiFlood limit_*",
          },
          { quoted: message },
        );
        break;
      }

      case "get":
      case "status": {
        const status = getFloodConfig(chatId);
        await sock.sendMessage(
          chatId,
          {
            text: `*_AntiFlood Configuration:_*\nStatus: ${
              status ? (status.enabled ? "ON" : "OFF") : "OFF"
            }\nAction: ${status ? status.action : "Not set"}\nLimit: ${
              status ? status.limit : "10"
            } messages in ${status ? status.windowSeconds : "10"}s`,
          },
          { quoted: message },
        );
        break;
      }

      default:
        await sock.sendMessage(chatId, {
          text: `ℹ️ *_Use ${prefix}antiflood for usage._*`,
        });
    }
  } catch (error) {
    console.error("Error in antiflood command:", error);
    await sock.sendMessage(chatId, {
      text: "❌ *_Error processing antiflood command_*",
    });
  }
}

module.exports = { handleAntifloodCommand, handleFloodDetection };
