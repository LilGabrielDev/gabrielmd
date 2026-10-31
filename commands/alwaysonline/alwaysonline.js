const fs = require("fs");
const path = require("path");
const isOwnerOrSudo = require("../../lib/isOwner");
const { getPrimaryPrefix } = require("../../lib/prefix");

const configPath = path.join(__dirname, "..", "..", "data", "alwaysonline.json");

function initConfig() {
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({ enabled: false }, null, 2));
  }
  return JSON.parse(fs.readFileSync(configPath));
}

async function alwaysonlineCommand(sock, chatId, message) {
  try {
    const senderId = message.key.participant || message.key.remoteJid;
    const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

    if (!message.key.fromMe && !isOwner) {
      await sock.sendMessage(chatId, {
        text: "❌ This command is only available for the owner!",
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "#",
            newsletterName: "Gabriel MD Bot",
            serverMessageId: -1,
          },
        },
      });
      return;
    }

    const args =
      message.message?.conversation?.trim().split(" ").slice(1) ||
      message.message?.extendedTextMessage?.text?.trim().split(" ").slice(1) ||
      [];

    const config = initConfig();

    if (args.length > 0) {
      const action = args[0].toLowerCase();
      if (action === "on" || action === "enable") {
        config.enabled = true;
      } else if (action === "off" || action === "disable") {
        config.enabled = false;
      } else {
        await sock.sendMessage(chatId, {
          text: `❌ Invalid option! Use: ${getPrimaryPrefix()}alwaysonline on/off`,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "#",
              newsletterName: "Gabriel MD Bot",
              serverMessageId: -1,
            },
          },
        });
        return;
      }
    } else {
      config.enabled = !config.enabled;
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    await sock.sendMessage(chatId, {
      text: `✅ Always Online has been ${config.enabled ? "enabled" : "disabled"}!`,
      contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: "#",
          newsletterName: "Gabriel MD Bot",
          serverMessageId: -1,
        },
      },
    });
    
    // Immediately update presence if enabled
    if (config.enabled) {
      await sock.sendPresenceUpdate("available", chatId);
    }
  } catch (error) {
    console.error("Error in alwaysonline command:", error);
    await sock.sendMessage(chatId, {
      text: "❌ Error processing command!",
    });
  }
}

function isAlwaysOnlineEnabled() {
  try {
    const config = initConfig();
    return config.enabled;
  } catch (error) {
    return false;
  }
}

module.exports = {
  alwaysonlineCommand,
  isAlwaysOnlineEnabled
};
