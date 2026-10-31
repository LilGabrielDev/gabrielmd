const settings = require("../settings");
const { getPrimaryPrefix } = require("../lib/prefix");
const fs = require("fs");
const path = require("path");

// ─── helpers for dynamic data ───────────────────────────────────
function formatUptime() {
  const total = Math.floor(process.uptime());
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0) parts.push(`${s}s`);
  return parts.join(" ") || "0s";
}

async function getBotMode(sock) {
  try {
    const data = JSON.parse(fs.readFileSync("./data/messageCount.json"));
    if (typeof data.isPublic === "boolean") return data.isPublic ? "Public" : "Private";
  } catch {}
  if (sock && typeof sock.public === "boolean") return sock.public ? "Public" : "Private";
  return settings.commandMode === "public" ? "Public" : "Private";
}

async function getSenderName(sock, senderId) {
  try {
    // Use sock.getName to get the actual WhatsApp display name
    const name = await sock.getName(senderId);
    // getName returns a Promise for groups, string for individuals
    const resolved = typeof name?.then === "function" ? await name : name;
    if (resolved && resolved !== senderId && resolved !== senderId.split("@")[0]) {
      return resolved;
    }
  } catch {}
  // Fallback: check store.contacts directly
  try {
    const store = require("../lib/lightweight_store");
    const contact = store.contacts[senderId];
    if (contact && contact.name) return contact.name;
  } catch {}
  // Last fallback
  return senderId.split("@")[0];
}

// ─── command ────────────────────────────────────────────────────
async function helpCommand(sock, chatId, message) {
  const senderId = message.key.participant || message.key.remoteJid || "";
  const isGroup = message.key.remoteJid && message.key.remoteJid.endsWith("@g.us");

  const senderName = await getSenderName(sock, senderId);
  const mode = await getBotMode(sock);
  const uptime = formatUptime();
  const senderNum = senderId.split("@")[0];
  const isOwner = settings.ownerNumber === senderNum;

  // Read premium status from premium.json
  let isPremium = isOwner;
  try {
    const premiumData = JSON.parse(fs.readFileSync("./data/premium.json", "utf8"));
    if (Array.isArray(premiumData) && premiumData.includes(senderNum)) {
      isPremium = true;
    }
  } catch (e) {}

  const platform = isOwner
    ? "Host of the bot"
    : isGroup
      ? "Group"
      : "Private Chat";
  const country = settings.ownerNumber.startsWith("254") ? "Kenya" : "Unknown";

  // Read the current prefix from settings.js at runtime
  const p = getPrimaryPrefix();

  const infoBoxes = `╭─❒ BOT INFO
│ 🤖 Name      :  ${settings.botName || "Gabriel MD Bot"}
│ ⚡ Version   :  V${settings.version || "1.0.1"}
│ 📦 Mode      :  ${mode}
│ 👑 Owner     :  ${settings.botOwner || "Lil Gabriel"}
│ 📈 Uptime    :  ${uptime}
│ 🔑 Prefix    :  ${p}
╰──────────────

╭─❒ USER INFO
│ ⭐ Premium   :  ${isPremium ? "Yes" : "No"}
│ 📍 Country   :  ${country}
│ 📱 Platform  :  ${platform}
╰──────────────`;

  const helpMessage = `╭───────────────
   Developer: *Lil Gabriel*
   YT : ${global.ytch}
╰──────────────

*Multi Device Bot:*

╭─❒ 🌐 *General*:
│ ➤ ${p} help or ${p}menu
│ ➤ ${p} ping
│ ➤ ${p} alive
│ ➤ ${p} tts <text>
│ ➤ ${p} owner
│ ➤ ${p} joke
│ ➤ ${p} quote
│ ➤ ${p} fact
│ ➤ ${p} weather <city>
│ ➤ ${p} news
│ ➤ ${p} attp <text>
│ ➤ ${p} lyrics <song_title>
│ ➤ ${p} 8ball <question>
│ ➤ ${p} groupinfo
│ ➤ ${p} staff or ${p}admins 👨‍💼
│ ➤ ${p} vv 👀
│ ➤ ${p} trt <text> <lang> 🌐
│ ➤ ${p} ss <link> 📸
│ ➤ ${p} jid 🆔
│ ➤ ${p} url 🔗
│ ➤ ${p} topmembers 🏆
│ ➤ ${p} save or ${p}nitumie (reply to status) 📥
│ ➤ ${p} translate <text> <lang> 🌐
│ ➤ ${p} gif <query>
│ ➤ ${p} speedtest ⚡
╰──────────────

╭─❒ 👮‍♂️ *Admin*:
│ ➤ ${p} ban @user 🚫
│ ➤ ${p} unban @user ✅
│ ➤ ${p} promote @user 📈
│ ➤ ${p} demote @user 📉
│ ➤ ${p} mute <minutes> ⏳
│ ➤ ${p} unmute 🔊
│ ➤ ${p} delete or ${p}del 🗑️
│ ➤ ${p} kick @user 👢
│ ➤ ${p} warnings @user ⚠️
│ ➤ ${p} warn @user ❗
│ ➤ ${p} antilink <on/off/set delete|kick|warn> 🔗
│ ➤ ${p} antiscam <on/off/action/check> 🕵️
│ ➤ ${p} scamcheck <text> 🔍
│ ➤ ${p} antibadword <on/off/set> 🤐
│ ➤ ${p} clear 🧹
│ ➤ ${p} tag <message> 🏷️
│ ➤ ${p} tagall 📢
│ ➤ ${p} tagnotadmin 👤
│ ➤ ${p} hidetag <message> 👻
│ ➤ ${p} chatbot <on/off> 🤖
│ ➤ ${p} resetlink 🔄
│ ➤ ${p} antitag <on/off/set delete|kick> 🛡️
│ ➤ ${p} antimention <on/off/delete|deletewarn|deletekick|get> 🛡️
│ ➤ ${p} antiflood <on/off/set/setlimit/status> 🚦
│ ➤ ${p} welcome <on/off/set> 👋
│ ➤ ${p} goodbye <on/off/set> 🏃
│ ➤ ${p} setgdesc <description> 📝
│ ➤ ${p} setgname <new name> 🏷️
│ ➤ ${p} setgpp (reply to image) 🖼️
│ ➤ ${p} block @user 🚫
│ ➤ ${p} unblock @user ✅
│ ➤ ${p} antibot <on/off> 🤖
│ ➤ ${p} antidemote <on/off> 🛡️
│ ➤ ${p} antispam <on/off> 📛
│ ➤ ${p} antigm <type> 🎭
│ ➤ ${p} globalantilink <on/off> 🔗
│ ➤ ${p} grouplink (also invitelink, revoke) 🔗
│ ➤ ${p} groupmanage (setname/setdesc) ⚙️
│ ➤ ${p} setname <name> 🏷️
│ ➤ ${p} setdesc <desc> 📝
│ ➤ ${p} grouprules (rules/setrules) 📋
│ ➤ ${p} members 👥
│ ➤ ${p} pin <reply to msg> 📌
│ ➤ ${p} unpin 📌
│ ➤ ${p} poll <Question | Opt1 | Opt2> 📊
│ ➤ ${p} vote <option> 🗳️
│ ➤ ${p} viewonce 👁️
╰──────────────

╭─❒ 🔒 *Owner*:
│ ➤ ${p} mode <public/private> 🔐
│ ➤ ${p} clearsession 🧹
│ ➤ ${p} antidelete <on/off> 🛡️
│ ➤ ${p} cleartmp 🗑️
│ ➤ ${p} update 🔄
│ ➤ ${p} settings ⚙️
│ ➤ ${p} setpp <reply to image> 🖼️
│ ➤ ${p} areact <on/off> ✨
│ ➤ ${p} autostatus <on/off> 📱
│ ➤ ${p} autostatus react <on/off> ❤️
│ ➤ ${p} autotyping <on/off> ⌨️
│ ➤ ${p} autoread <on/off> 📖
│ ➤ ${p} anticall <on/reject/off/status> 📞
│ ➤ ${p} pmblocker <on/off/status/setmsg> 🛡️
│ ➤ ${p} pmblocker setmsg <text> 💬
│ ➤ ${p} alwaysonline <on/off> 🟢
│ ➤ ${p} autobio <on/off> 📝
│ ➤ ${p} setmention <reply to msg> 👤
│ ➤ ${p} mention <on/off> 🔔
│ ➤ ${p} sudo @user 👑
│ ➤ ${p} antiban <on/off/status> 🛡️
│ ➤ ${p} antivv <on/off/status> 👁️
│ ➤ ${p} setprefix <new_prefix> 🔑
│ ➤ ${p} blocklist 📋
│ ➤ ${p} setbio <text> 📝
│ ➤ ${p} autojoin <code> 🔗
│ ➤ ${p} speedtest ⚡
│ ➤ ${p} profile (reply to msg) 👤
│ ➤ ${p} readreceipt <on/off> 👁️
│ ➤ ${p} bluetick <on/off> 🔵
│ ➤ ${p} newsletter <manage> 📰
│ ➤ ${p} getpp / ${p}spp <reply or @user> 📸
│ ➤ ${p} pair <number> 🔗
│ ➤ ${p} statussave (reply to status) 💾
╰──────────────

╭─❒ 🎨 *Image/Sticker*:
│ ➤ ${p} blur <image>
│ ➤ ${p} simage <reply to sticker>
│ ➤ ${p} sticker <reply to image>
│ ➤ ${p} removebg
│ ➤ ${p} remini
│ ➤ ${p} crop <reply to image>
│ ➤ ${p} tgsticker <Link>
│ ➤ ${p} meme
│ ➤ ${p} take <packname>
│ ➤ ${p} emojimix <emj1>+<emj2>
│ ➤ ${p} igs <insta link>
│ ➤ ${p} igsc <insta link>
│ ➤ ${p} stickercrop <reply to sticker> ✂️
╰────────────── 

╭─❒ 🖼️ *Pies*:
│ ➤ ${p} pies <country>
│ ➤ ${p} china 
│ ➤ ${p} indonesia 
│ ➤ ${p} japan 
│ ➤ ${p} korea 
│ ➤ ${p} india
│ ➤ ${p} malaysia
│ ➤ ${p} thailand
╰──────────────

╭─❒ 🎮 *Game*:
│ ➤ ${p} tictactoe @user
│ ➤ ${p} hangman
│ ➤ ${p} guess <letter>
│ ➤ ${p} trivia
│ ➤ ${p} answer <answer>
│ ➤ ${p} truth
│ ➤ ${p} dare
│ ➤ ${p} surrender
╰──────────────

╭─❒ 🤖 *AI*:
│ ➤ ${p} gpt <question>
│ ➤ ${p} gemini <question>
│ ➤ ${p} imagine <prompt>
│ ➤ ${p} flux <prompt>
│ ➤ ${p} sora <prompt>
│ ➤ ${p} ai <question> 🧠
│ ➤ ${p} silva <question> 🤖
│ ➤ ${p} agent <question> 🤖
╰──────────────

╭─❒ 🎯 *Fun*:
│ ➤ ${p} compliment @user
│ ➤ ${p} insult @user
│ ➤ ${p} flirt 
│ ➤ ${p} shayari
│ ➤ ${p} goodnight
│ ➤ ${p} roseday
│ ➤ ${p} character @user
│ ➤ ${p} wasted @user
│ ➤ ${p} ship @user
│ ➤ ${p} simp @user
│ ➤ ${p} stupid @user [text]
│ ➤ ${p} roast @user 🔥
╰──────────────

╭─❒ 🔤 *Textmaker*:
│ ➤ ${p} metallic <text>
│ ➤ ${p} ice <text>
│ ➤ ${p} snow <text>
│ ➤ ${p} impressive <text>
│ ➤ ${p} matrix <text>
│ ➤ ${p} light <text>
│ ➤ ${p} neon <text>
│ ➤ ${p} devil <text>
│ ➤ ${p} purple <text>
│ ➤ ${p} thunder <text>
│ ➤ ${p} leaves <text>
│ ➤ ${p} 1917 <text>
│ ➤ ${p} arena <text>
│ ➤ ${p} hacker <text>
│ ➤ ${p} sand <text>
│ ➤ ${p} blackpink <text>
│ ➤ ${p} glitch <text>
│ ➤ ${p} fire <text>
│ ➤ ${p} textmaker <style> <text> 🔤
╰──────────────

╭─❒ 📥 *Downloader*:
│ ➤ ${p} play <song_name>
│ ➤ ${p} song <song_name>
│ ➤ ${p} spotify <query>
│ ➤ ${p} instagram <link>
│ ➤ ${p} facebook <link>
│ ➤ ${p} tiktok <link>
│ ➤ ${p} video <song name>
│ ➤ ${p} ytmp4 <Link>
│ ➤ ${p} music <song_name>
╰──────────────

╭─❒ 🧩 *MISC*:
│ ➤ ${p} heart
│ ➤ ${p} horny
│ ➤ ${p} circle
│ ➤ ${p} lgbt
│ ➤ ${p} lolice
│ ➤ ${p} its-so-stupid <text>
│ ➤ ${p} namecard u|b|d
│ ➤ ${p} tweet dn|un|c|t
│ ➤ ${p} ytcomment un|c
│ ➤ ${p} comrade 
│ ➤ ${p} gay 
│ ➤ ${p} glass 
│ ➤ ${p} jail 
│ ➤ ${p} passed 
│ ➤ ${p} triggered
│ ➤ ${p} lied
│ ➤ ${p} simpcard
│ ➤ ${p} tonikawa
│ ➤ ${p} oogway <quote>
│ ➤ ${p} oogway2 <quote>
│ ➤ ${p} vcfgen <number> 📇
│ ➤ ${p} pollresult 📊
│ ➤ ${p} misc 🧩
╰──────────────

╭─❒ 🖼️ *ANIME*:
│ ➤ ${p} nom 
│ ➤ ${p} poke 
│ ➤ ${p} cry 
│ ➤ ${p} kiss 
│ ➤ ${p} pat 
│ ➤ ${p} hug 
│ ➤ ${p} wink 
│ ➤ ${p} facepalm 
│ ➤ ${p} quote
│ ➤ ${p} animu <type>
│ ➤ ${p} anime <type>
╰──────────────

╭─❒ 💻 *Github:*
│ ➤ ${p} git
│ ➤ ${p} github
│ ➤ ${p} sc
│ ➤ ${p} script
│ ➤ ${p} repo
╰──────────────

`;

  try {
    // Combine info boxes and help message into one
    const combinedMessage = `${infoBoxes}\n\n${helpMessage}`;

    // Send the full help menu with image
    const imagePath = path.join(__dirname, "../assets/bot_image.jpg");

    if (fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath);

      await sock.sendMessage(
        chatId,
        {
          image: imageBuffer,
          caption: combinedMessage,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
          },
        },
        { quoted: message },
      );
    } else {
      console.error("Bot image not found at:", imagePath);
      await sock.sendMessage(chatId, {
        text: combinedMessage,
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
        },
      }, { quoted: message });
    }
  } catch (error) {
    console.error("Error in help command:", error);
    const fallbackMessage = `${infoBoxes}\n\n${helpMessage}`;
    await sock.sendMessage(chatId, { text: fallbackMessage }, { quoted: message });
  }
}

module.exports = helpCommand;
