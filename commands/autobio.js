const fs = require("fs");
const path = require("path");
const isOwnerOrSudo = require("../lib/isOwner");
const { getPrimaryPrefix, getMessageText } = require("../lib/prefix");

const channelInfo = {
  contextInfo: {
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: "#",
      newsletterName: "GabrielBot MD",
      serverMessageId: -1,
    },
  },
};

const configPath = path.join(__dirname, "..", "data", "autobio.json");
const statuses = [
  "🤖 Gabriel MD Bot | Multi Device WhatsApp Bot",
  "👑 Owner: Lil Gabriel",
  "⚡ Fast & Powerful WhatsApp Bot",
  "🌿 Powered by Lil Gabriel Dev",
  "📱 Public Mode | 24/7 Online",
  "✨ Type .help or .menu",
  "🔥 The Best WhatsApp Bot Ever",
  "🚀 Multi-device Support",
  "💫 Group Management & Fun Commands",
  "🎮 Games | 🎨 Stickers | 🤖 AI",
];

function getDefaultConfig() {
  return { enabled: false, index: 0 };
}

function loadAutobioConfig() {
  try {
    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, JSON.stringify(getDefaultConfig()));
      return getDefaultConfig();
    }

    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    return {
      enabled: Boolean(config.enabled),
      index: Number.isInteger(config.index) ? config.index : 0,
    };
  } catch (error) {
    const defaultConfig = getDefaultConfig();
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig));
    return defaultConfig;
  }
}

function saveAutobioConfig(config) {
  const safeConfig = {
    enabled: Boolean(config.enabled),
    index: Number.isInteger(config.index) ? config.index : 0,
  };
  fs.writeFileSync(configPath, JSON.stringify(safeConfig));
}

let autobioInterval = null;

async function updateBioStatus(sock) {
  try {
    const config = loadAutobioConfig();
    const statusIndex = config.index % statuses.length;
    const statusText = statuses[statusIndex];

    await sock.updateProfileStatus(statusText);
    saveAutobioConfig({ enabled: config.enabled, index: (statusIndex + 1) % statuses.length });
    console.log("✅ Bio updated:", statusText);
  } catch (error) {
    console.error("❌ Error updating bio:", error.message);
  }
}

function stopAutobioLoop() {
  if (autobioInterval) {
    clearInterval(autobioInterval);
    autobioInterval = null;
  }
}

function startAutobioLoop(sock) {
  stopAutobioLoop();
  autobioInterval = setInterval(async () => {
    const config = loadAutobioConfig();
    if (config.enabled && sock) {
      await updateBioStatus(sock);
    }
  }, 30 * 60 * 1000);
}

async function autobioCommand(sock, chatId, message) {
  try {
    const senderId = message.key.participant || message.key.remoteJid;
    const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

    if (!message.key.fromMe && !isOwner) {
      await sock.sendMessage(chatId, {
        text: "❌ This command is only available for the owner!",
        ...channelInfo,
      });
      return;
    }

    const messageText = getMessageText(message);
    const args = messageText.trim().split(/\s+/).slice(1);
    const config = loadAutobioConfig();

    if (args.length > 0) {
      const action = args[0].toLowerCase();
      if (action === "on" || action === "enable") {
        config.enabled = true;
      } else if (action === "off" || action === "disable") {
        config.enabled = false;
      } else {
        await sock.sendMessage(chatId, {
          text: `❌ Invalid option! Use: ${getPrimaryPrefix()}autobio on/off`,
          ...channelInfo,
        });
        return;
      }
    } else {
      config.enabled = !config.enabled;
    }

    saveAutobioConfig(config);

    const actionText = config.enabled ? "enabled" : "disabled";
    await sock.sendMessage(chatId, {
      text: `✅ Auto Bio has been ${actionText}! Bio will change every 30 minutes.`,
      ...channelInfo,
    });

    if (config.enabled && sock) {
      await updateBioStatus(sock);
      startAutobioLoop(sock);
    } else {
      stopAutobioLoop();
    }
  } catch (error) {
    console.error("Error in autobio command:", error);
    await sock.sendMessage(chatId, {
      text: "❌ Error processing command!",
      ...channelInfo,
    });
  }
}

function isAutobioEnabled() {
  try {
    return loadAutobioConfig().enabled;
  } catch (error) {
    return false;
  }
}

module.exports = {
  autobioCommand,
  isAutobioEnabled,
  startAutobioLoop,
};
