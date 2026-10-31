const fs = require("fs");
const isOwnerOrSudo = require("../lib/isOwner");
const { getPrimaryPrefix } = require("../lib/prefix");

const GLOBAL_ANTILINK_PATH = "./data/globalAntilink.json";

function readState() {
  try {
    if (!fs.existsSync(GLOBAL_ANTILINK_PATH))
      return {
        enabled: false,
        action: "delete",
      };
    const raw = fs.readFileSync(GLOBAL_ANTILINK_PATH, "utf8");
    const data = JSON.parse(raw || "{}");
    return {
      enabled: !!data.enabled,
      action: typeof data.action === "string" && data.action.trim() ? data.action : "delete",
    };
  } catch {
    return {
      enabled: false,
      action: "delete",
    };
  }
}

function writeState(enabled, action) {
  try {
    if (!fs.existsSync("./data")) fs.mkdirSync("./data", { recursive: true });
    const current = readState();
    const payload = {
      enabled: !!enabled,
      action:
        typeof action === "string" && ["delete", "kick", "warn"].includes(action)
          ? action
          : current.action,
    };
    fs.writeFileSync(GLOBAL_ANTILINK_PATH, JSON.stringify(payload, null, 2));
  } catch {}
}

async function globalAntilinkCommand(sock, chatId, message, args) {
  const senderId = message.key.participant || message.key.remoteJid;
  const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

  if (!message.key.fromMe && !isOwner) {
    await sock.sendMessage(
      chatId,
      { text: "🔐 Only bot owner can use this command!" },
      { quoted: message },
    );
    return;
  }

  const argStr = (args || "").trim();
  const [sub, ...rest] = argStr.split(" ");
  const state = readState();

  if (!sub || !["on", "off", "status", "set", "action"].includes(sub.toLowerCase())) {
    await sock.sendMessage(
      chatId,
      {
        text: `*GLOBAL ANTILINK (Owner only)*\n\n${getPrimaryPrefix()}globalantilink on - Enable global antilink (auto-delete links in all groups where you are admin)\n${getPrimaryPrefix()}globalantilink off - Disable global antilink\n${getPrimaryPrefix()}globalantilink status - Show current status\n${getPrimaryPrefix()}globalantilink set delete|kick|warn - Set action for link violations`,

      },
      { quoted: message },
    );
    return;
  }

  if (sub.toLowerCase() === "status") {
    await sock.sendMessage(
      chatId,
      {
        text: `Global Antilink is currently *${state.enabled ? "ON" : "OFF"}*\nAction: *${state.action}*`,
      },
      { quoted: message },
    );
    return;
  }

  if (sub.toLowerCase() === "set" || sub.toLowerCase() === "action") {
    const newAction = rest.join(" ").trim().toLowerCase();
    if (!["delete", "kick", "warn"].includes(newAction)) {
      await sock.sendMessage(
        chatId,
        { text: `Usage: ${getPrimaryPrefix()}globalantilink set delete | kick | warn` },
        { quoted: message },
      );
      return;
    }
    writeState(state.enabled, newAction);
    await sock.sendMessage(
      chatId,
      { text: `✅ Global antilink action set to *${newAction}*.` },
      { quoted: message },
    );
    return;
  }

  const enable = sub.toLowerCase() === "on";
  writeState(enable, state.action);
  await sock.sendMessage(
    chatId,
    { text: `Global Antilink is now *${enable ? "ENABLED" : "DISABLED"}*.\nLinks will be auto-deleted in all groups where you are admin.` },
    { quoted: message },
  );
}

module.exports = { globalAntilinkCommand, readState };
