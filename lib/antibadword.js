const fs = require("fs");
const path = require("path");
const isAdmin = require("./isAdmin");
const { incrementWarningCount, resetWarningCount } = require("../lib/index");

const DATA_PATH = path.join(__dirname, "../data/antibadword.json");

function loadData() {
  try {
    if (fs.existsSync(DATA_PATH)) return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  } catch {}
  return {};
}

function saveData(data) {
  try {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  } catch {}
}

function getGroupCfg(jid) {
  const data = loadData();
  return data[jid] || { enabled: false, action: "delete-warn" };
}

const badWords = [
  "bingwa", "sokoni", "data", "dm", "forex", "trading", "electronics", "sms", "bundle", "idiot", "till", "services", "okoa", "calls", "mins", "gb", "mb", "fuliza", "text", "boobs", "boobies", "tits", "deals", "nigga", "fuck", "dick", "bitch", "bastard", "asshole", "asu", "awyu", "teri ma ki chut", "teri maa ki", "lund", "lund ke baal", "mc", "lodu", "benchod", "shit", "damn", "hell", "piss", "crap", "slut", "whore", "prick", "motherfucker", "cock", "cunt", "pussy", "twat", "wanker", "douchebag", "jackass", "moron", "retard", "scumbag", "skank", "slutty", "arse", "bugger", "sod off", "chut", "laude ka baal", "madar", "behen ke lode", "chodne", "sala kutta", "harami", "randi ki aulad", "gaand mara", "chodu", "lund le", "gandu saala", "kameena", "haramzada", "chamiya", "chodne wala", "chudai", "chutiye ke baap", "fck", "fckr", "fcker", "fuk", "fukk", "fcuk", "btch", "bch", "bsdk", "f*ck", "assclown", "a**hole", "f@ck", "b!tch", "d!ck", "n!gga", "f***er", "s***head", "a$$", "l0du", "lund69", "spic", "chink", "cracker", "towelhead", "gook", "kike", "paki", "honky", "wetback", "raghead", "jungle bunny", "sand nigger", "beaner", "blowjob", "handjob", "cum", "cumshot", "jizz", "deepthroat", "fap", "hentai", "milf", "anal", "orgasm", "dildo", "vibrator", "gangbang", "threesome", "porn", "sex", "xxx", "fag", "faggot", "dyke", "tranny", "homo", "sissy", "fairy", "lesbo", "weed", "pot", "coke", "heroin", "meth", "crack", "dope", "bong", "kush", "hash", "trip", "rolling"
];

function containsBadWord(text) {
  const lowerMessage = text.toLowerCase();
  for (const badWord of badWords) {
    const escapedBadWord = badWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(\\b|\\s|^)${escapedBadWord}(\\b|\\s|$)`, 'i');
    if (regex.test(lowerMessage)) return true;
  }
  return false;
}

async function handleAntiBadwordCommand(sock, chatId, message, match) {
  const senderId = message.key.participant || message.key.remoteJid;
  const isOwnerOrSudo = require("../lib/isOwner");
  const isOwner = message.key.fromMe || (await isOwnerOrSudo(senderId, sock, chatId));

  if (!match) {
    const data = loadData();
    const cfg = getGroupCfg(chatId);
    return sock.sendMessage(
      chatId,
      {
        text: `🔊 *ANTIBADWORD SETUP*\n\n*.antibadword on* — Enable (default: delete-warn)\n*.antibadword off* — Disable\n*.antibadword action <type>* — Set action\n*.antibadword check <text>* — Test text\n\n*Current:* ${cfg.enabled ? "ON" : "OFF"} | Action: ${cfg.action}\n\n*Actions:* delete-only, delete-warn, delete-kick, warn-kick`,
      },
      { quoted: message },
    );
  }

  const args = match.trim().split(" ");
  const sub = args[0].toLowerCase();

  if (sub === "check" || sub === "test") {
    const checkText = args.slice(1).join(" ");
    if (!checkText) {
      return sock.sendMessage(
        chatId,
        { text: "❓ Provide text to check.\n\nExample: `.antibadword check badword here`" },
        { quoted: message },
      );
    }
    const hit = containsBadWord(checkText);
    return sock.sendMessage(
      chatId,
      {
        text: hit
          ? "🚨 *Bad word detected!* That text contains prohibited words."
          : "✅ *No bad words detected.* That text appears clean.",
      },
      { quoted: message },
    );
  }

  if (!isOwner) {
    const adminStatus = await isAdmin(sock, chatId, senderId);
    if (!adminStatus.isSenderAdmin) {
      return sock.sendMessage(
        chatId,
        { text: "🚫 *Only admins can configure antibadword.*" },
        { quoted: message },
      );
    }
  }

  if (sub === "on") {
    const cfg = getGroupCfg(chatId);
    if (cfg.enabled) {
      return sock.sendMessage(
        chatId,
        { text: "✅ *AntiBadword is already enabled for this group*" },
        { quoted: message },
      );
    }
    const data = loadData();
    data[chatId] = { enabled: true, action: "delete-warn" };
    saveData(data);
    return sock.sendMessage(
      chatId,
      {
        text: "✅ *AntiBadword has been enabled.*\nAction: *delete-warn*\nUse `.antibadword action <type>` to customize.",
      },
      { quoted: message },
    );
  }

  if (sub === "off") {
    const cfg = getGroupCfg(chatId);
    if (!cfg.enabled) {
      return sock.sendMessage(
        chatId,
        { text: "⚠️ *AntiBadword is already disabled for this group*" },
        { quoted: message },
      );
    }
    const data = loadData();
    data[chatId] = { ...data[chatId], enabled: false };
    saveData(data);
    return sock.sendMessage(
      chatId,
      { text: "✅ *AntiBadword has been disabled for this group*" },
      { quoted: message },
    );
  }

  if (sub === "action") {
    const act = (args[1] || "").toLowerCase();
    const valid = ["delete-only", "delete-warn", "delete-kick", "warn-kick"];
    if (!valid.includes(act)) {
      return sock.sendMessage(
        chatId,
        { text: `❌ Invalid action. Choose: ${valid.map((a) => `\`${a}\``).join(", ")}` },
        { quoted: message },
      );
    }
    const data = loadData();
    data[chatId] = { ...(data[chatId] || {}), enabled: true, action: act };
    saveData(data);
    return sock.sendMessage(
      chatId,
      { text: `✅ AntiBadword action set to *${act}*.` },
      { quoted: message },
    );
  }

  return sock.sendMessage(
    chatId,
    {
      text: "❌ *Invalid command. Use .antibadword to see usage*",
    },
    { quoted: message },
  );
}

async function handleBadwordDetection(sock, chatId, message, userMessage, senderId) {
  const cfg = getGroupCfg(chatId);
  if (!cfg || !cfg.enabled) return;

  if (!chatId.endsWith("@g.us")) return;
  if (message.key.fromMe) return;

  if (!containsBadWord(userMessage)) return;

  try {
    const { isBotAdmin, isSenderAdmin } = await isAdmin(sock, chatId, senderId);
    if (!isBotAdmin) return;
    if (isSenderAdmin) return;
  } catch (err) {
    console.error("Error checking admin status in antibadword:", err);
    return;
  }

  try {
    await sock.sendMessage(chatId, {
      delete: message.key,
    });
  } catch (err) {
    console.error("Error deleting message:", err);
    return;
  }
  message._moderationHandled = true;

  const action = cfg.action || "delete-warn";

  switch (action) {
    case "delete-only":
      break;

    case "delete-warn":
      await sock.sendMessage(chatId, {
        text: `*@${senderId.split("@")[0]} bad words are not allowed here. Warning 1/3*`,
        mentions: [senderId],
      });
      const warningCountDeleteWarn = await incrementWarningCount(chatId, senderId);
      if (warningCountDeleteWarn >= 3) {
        try {
          await sock.groupParticipantsUpdate(chatId, [senderId], "remove");
          await resetWarningCount(chatId, senderId);
          await sock.sendMessage(chatId, {
            text: `*@${senderId.split("@")[0]} has been kicked after 3 warnings*`,
            mentions: [senderId],
          });
        } catch (error) {
          console.error("Error kicking user after warnings:", error);
        }
      }
      break;

    case "delete-kick":
      try {
        await sock.groupParticipantsUpdate(chatId, [senderId], "remove");
        await sock.sendMessage(chatId, {
          text: `*@${senderId.split("@")[0]} has been kicked for using bad words*`,
          mentions: [senderId],
        });
      } catch (error) {
        console.error("Error kicking user:", error);
      }
      break;

    case "warn-kick":
      const warningCountWarnKick = await incrementWarningCount(chatId, senderId);
      if (warningCountWarnKick >= 3) {
        try {
          await sock.groupParticipantsUpdate(chatId, [senderId], "remove");
          await resetWarningCount(chatId, senderId);
          await sock.sendMessage(chatId, {
            text: `*@${senderId.split("@")[0]} has been kicked after 3 warnings*`,
            mentions: [senderId],
          });
        } catch (error) {
          console.error("Error kicking user after warnings:", error);
        }
      } else {
        await sock.sendMessage(chatId, {
          text: `*@${senderId.split("@")[0]} warning ${warningCountWarnKick}/3 for using bad words*`,
          mentions: [senderId],
        });
      }
      break;
  }
}

module.exports = {
  handleAntiBadwordCommand,
  handleBadwordDetection,
  readState: loadData,
};
