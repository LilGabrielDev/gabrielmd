const { isJidGroup } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");
const {
  getAntilink,
  incrementWarningCount,
  resetWarningCount,
  isSudo,
} = require("../lib/index");
const isAdmin = require("../lib/isAdmin");
const isOwnerOrSudo = require("../lib/isOwner");
const config = require("../config");
const settings = require("../settings");

const WARN_COUNT = config.WARN_COUNT || 3;

const GLOBAL_ANTILINK_PATH = path.join(__dirname, "../data/globalAntilink.json");

// Simple in-memory cache to track last response time per user in a group
const responseCooldown = new Map();
const COOLDOWN_MS = 30000; // 30 seconds cooldown for the same response to the same user

const linkViolationMessages = [
  "🔗 links are not allowed here",
  "🚫 please don't share links in this group",
  "⛔ sharing links is prohibited in this group",
  "❌ stop sending links in this group",
  "⚠️ link sharing is disabled in this group",
];

function getRandomViolationMessage() {
  return linkViolationMessages[Math.floor(Math.random() * linkViolationMessages.length)];
}

function shouldSkipResponse(jid, sender) {
  const key = `${jid}:${sender}`;
  const now = Date.now();
  const lastTime = responseCooldown.get(key) || 0;
  if (now - lastTime < COOLDOWN_MS) return true;
  responseCooldown.set(key, now);
  return false;
}

function readGlobalAntilinkState() {
  try {
    if (!fs.existsSync(GLOBAL_ANTILINK_PATH))
      return { enabled: false, action: "delete" };
    const raw = fs.readFileSync(GLOBAL_ANTILINK_PATH, "utf8");
    const data = JSON.parse(raw || "{}");
    return {
      enabled: !!data.enabled,
      action:
        typeof data.action === "string" &&
        ["delete", "kick", "warn"].includes(data.action)
          ? data.action
          : "delete",
    };
  } catch {
    return { enabled: false, action: "delete" };
  }
}

/**
 * Checks if a string contains a URL.
 *
 * @param {string} str - The string to check.
 * @returns {boolean} - True if the string contains a URL, otherwise false.
 */
function containsURL(str) {
  const urlRegex = /(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/[^\s]*)?/i;
  return urlRegex.test(str);
}

/**
 * Handles the Antilink functionality for group chats.
 *
 * @param {object} msg - The message object to process.
 * @param {object} sock - The socket object to use for sending messages.
 */
async function Antilink(msg, sock) {
  const jid = msg.key.remoteJid;
  if (!isJidGroup(jid)) return;

  const SenderMessage =
    msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
  if (!SenderMessage || typeof SenderMessage !== "string") return;

  const sender = msg.key.participant;
  if (!sender) return;

  // Check if sender is bot itself — skip own messages
  if (msg.key.fromMe) return;

  // Skip if sender is group admin or sudo
  try {
    const { isSenderAdmin } = await isAdmin(sock, jid, sender);
    if (isSenderAdmin) return;
  } catch (_) {}
  const senderIsSudo = await isSudo(sender);
  if (senderIsSudo) return;

  if (!containsURL(SenderMessage.trim())) return;

  // ── GLOBAL ANTILINK CHECK ──
  const globalState = readGlobalAntilinkState();

  if (globalState.enabled) {
    // Check if the bot owner is an admin in this group
    let ownerIsAdmin = false;
    try {
      ownerIsAdmin = await isOwnerAdminInGroup(sock, jid);
    } catch (e) {
      console.error("Error checking owner admin status:", e);
    }

    if (ownerIsAdmin) {
      const action = globalState.action;
      try {
        // Delete message first
        await sock.sendMessage(jid, { delete: msg.key });

        const skipResponse = shouldSkipResponse(jid, sender);

        switch (action) {
          case "delete":
            if (!skipResponse) {
              await sock.sendMessage(jid, {
                text: `\`\`\`@${sender.split("@")[0]} ${getRandomViolationMessage()}\`\`\``,
                mentions: [sender],
              });
            }
            break;

          case "kick":
            await sock.groupParticipantsUpdate(jid, [sender], "remove");
            await sock.sendMessage(jid, {
              text: `\`\`\`@${sender.split("@")[0]} has been kicked for sending links\`\`\``,
              mentions: [sender],
            });
            break;

          case "warn":
            const warningCount = await incrementWarningCount(jid, sender);
            if (warningCount >= WARN_COUNT) {
              await sock.groupParticipantsUpdate(jid, [sender], "remove");
              await resetWarningCount(jid, sender);
              await sock.sendMessage(jid, {
                text: `\`\`\`@${sender.split("@")[0]} has been kicked after ${WARN_COUNT} warnings\`\`\``,
                mentions: [sender],
              });
            } else if (!skipResponse) {
              await sock.sendMessage(jid, {
                text: `\`\`\`@${sender.split("@")[0]} warning ${warningCount}/${WARN_COUNT} for sending links\`\`\``,
                mentions: [sender],
              });
            }
            break;
        }
      } catch (error) {
        console.error("Error in Global Antilink:", error);
      }
      return; // Global antilink handled — skip per-group check
    }
  }

  // ── PER-GROUP ANTILINK CHECK ──
  const antilinkConfig = await getAntilink(jid, "on");
  if (!antilinkConfig) return;

  const action = antilinkConfig.action;

  try {
    // Delete message first
    await sock.sendMessage(jid, { delete: msg.key });

    const skipResponse = shouldSkipResponse(jid, sender);

    switch (action) {
      case "delete":
        if (!skipResponse) {
          await sock.sendMessage(jid, {
            text: `\`\`\`@${sender.split("@")[0]} ${getRandomViolationMessage()}\`\`\``,
            mentions: [sender],
          });
        }
        break;

      case "kick":
        await sock.groupParticipantsUpdate(jid, [sender], "remove");
        await sock.sendMessage(jid, {
          text: `\`\`\`@${sender.split("@")[0]} has been kicked for sending links\`\`\``,
          mentions: [sender],
        });
        break;

      case "warn":
        const warningCount = await incrementWarningCount(jid, sender);
        if (warningCount >= WARN_COUNT) {
          await sock.groupParticipantsUpdate(jid, [sender], "remove");
          await resetWarningCount(jid, sender);
          await sock.sendMessage(jid, {
            text: `\`\`\`@${sender.split("@")[0]} has been kicked after ${WARN_COUNT} warnings\`\`\``,
            mentions: [sender],
          });
        } else if (!skipResponse) {
          await sock.sendMessage(jid, {
            text: `\`\`\`@${sender.split("@")[0]} warning ${warningCount}/${WARN_COUNT} for sending links\`\`\``,
            mentions: [sender],
          });
        }
        break;
    }
  } catch (error) {
    console.error("Error in Antilink:", error);
  }
}

/**
 * Checks if the bot owner is an admin in the given group.
 * Uses the same multi-format matching logic as isAdmin.js.
 */
async function isOwnerAdminInGroup(sock, groupId) {
  try {
    const ownerNumberClean = settings.ownerNumber.split(":")[0].split("@")[0];
    const metadata = await sock.groupMetadata(groupId);
    const participants = metadata.participants || [];

    return participants.some((p) => {
      if (p.admin !== "admin" && p.admin !== "superadmin") return false;

      const pPhoneNumber = p.phoneNumber
        ? p.phoneNumber.split("@")[0]
        : "";
      const pId = p.id ? p.id.split("@")[0] : "";
      const pLid = p.lid ? p.lid.split("@")[0] : "";

      return (
        pPhoneNumber === ownerNumberClean ||
        pId === ownerNumberClean ||
        pLid === ownerNumberClean
      );
    });
  } catch (e) {
    console.error("Error checking owner admin in group:", e);
    return false;
  }
}

module.exports = { Antilink };
