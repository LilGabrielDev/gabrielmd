'use strict';

const settings = require("../settings");
const { getPrimaryPrefix } = require("../lib/prefix");
const fs = require("fs");
const path = require("path");

// ─── Helpers for dynamic data ───────────────────────────────────
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
    const name = await sock.getName(senderId);
    const resolved = typeof name?.then === "function" ? await name : name;
    if (resolved && resolved !== senderId && resolved !== senderId.split("@")[0]) {
      return resolved;
    }
  } catch {}
  try {
    const store = require("../lib/lightweight_store");
    const contact = store.contacts[senderId];
    if (contact && contact.name) return contact.name;
  } catch {}
  return (senderId || "").split("@")[0];
}

// ─── Feature categories with full descriptions ──────────────────────────────
function getFeatureCategories(p) {
  return [
    {
      id: "general",
      title: "🌐 General & Utility",
      items: [
        { cmd: `${p} help / ${p}menu`, desc: "List all bot features and detailed descriptions" },
        { cmd: `${p} ping`, desc: "Check bot latency and server response speed" },
        { cmd: `${p} alive`, desc: "Display bot online status, version, and server details" },
        { cmd: `${p} speedtest`, desc: "Run a real-time internet speed test on the bot host" },
        { cmd: `${p} weather <city>`, desc: "Get live weather conditions and temperature forecast" },
        { cmd: `${p} news`, desc: "Fetch trending global and local news headlines" },
        { cmd: `${p} tts <text>`, desc: "Convert text to high-quality audio speech note" },
        { cmd: `${p} translate <text> <lang>`, desc: "Translate text to any supported language (e.g. en, fr, es)" },
        { cmd: `${p} lyrics <song>`, desc: "Search and retrieve full lyrics for any song" },
        { cmd: `${p} 8ball <question>`, desc: "Ask the magic eight-ball for fun predictions" },
        { cmd: `${p} attp <text>`, desc: "Generate an animated colorful sticker from text" },
        { cmd: `${p} url / ${p}tourl`, desc: "Upload media to generate a permanent shareable link" },
        { cmd: `${p} ss <url>`, desc: "Capture a full-page screenshot of any webpage" },
        { cmd: `${p} jid`, desc: "Get the unique WhatsApp JID identifier for user or chat" },
        { cmd: `${p} groupinfo`, desc: "Display group description, creation date, and metadata" },
        { cmd: `${p} staff / ${p}admins`, desc: "List all administrators and moderators in the group" },
        { cmd: `${p} topmembers`, desc: "Show most active contributors by message count" },
        { cmd: `${p} save / ${p}nitumie`, desc: "Save and download WhatsApp status (reply to status)" },
        { cmd: `${p} owner`, desc: "Show bot developer contact card and information" },
      ]
    },
    {
      id: "admin",
      title: "👮‍♂️ Group Moderation & Security",
      items: [
        { cmd: `${p} antiscam <on/off/action/check>`, desc: "Detect & block phishing, fraudulent links, and scams" },
        { cmd: `${p} scamcheck <text>`, desc: "Test any custom text against known scam/fraud patterns" },
        { cmd: `${p} antilink <on/off/set delete|kick|warn>`, desc: "Auto-detect and remove unauthorized WhatsApp group links" },
        { cmd: `${p} antibadword <on/off/set>`, desc: "Auto-censor profanity, curse words, and toxic speech" },
        { cmd: `${p} antiflood <on/off/set>`, desc: "Protect group from spam floods and repeated messages" },
        { cmd: `${p} antitag <on/off/set>`, desc: "Block unauthorized mass mentions and @everyone tags" },
        { cmd: `${p} antimention <on/off/set>`, desc: "Prevent malicious hidden mentions in messages" },
        { cmd: `${p} antibot <on/off>`, desc: "Automatically kick other bots that join the group" },
        { cmd: `${p} antidemote <on/off>`, desc: "Auto-restore admin privileges if an admin is demoted" },
        { cmd: `${p} antispam <on/off>`, desc: "Shield the group from rapid automated message spammers" },
        { cmd: `${p} antigm <type>`, desc: "Toggle anti-good-morning image/media spam filter" },
        { cmd: `${p} ban @user / ${p}unban @user`, desc: "Ban or unban a user from using the bot" },
        { cmd: `${p} kick @user`, desc: "Remove a member from the WhatsApp group" },
        { cmd: `${p} mute <minutes> / ${p}unmute`, desc: "Silence group chat for non-admins temporarily or indefinitely" },
        { cmd: `${p} warn @user / ${p}warnings @user`, desc: "Issue warnings to a member and check violation counts" },
        { cmd: `${p} promote @user / ${p}demote @user`, desc: "Grant or revoke admin permissions for a member" },
        { cmd: `${p} delete / ${p}del`, desc: "Delete an inappropriate message (reply to message)" },
        { cmd: `${p} tagall / ${p}hidetag <text>`, desc: "Notify all group participants with visible or hidden tag" },
        { cmd: `${p} tagnotadmin`, desc: "Tag all regular non-admin participants only" },
        { cmd: `${p} tag <text>`, desc: "Tag everyone with a custom announcement header" },
        { cmd: `${p} clear`, desc: "Clean up recent bot command output messages" },
        { cmd: `${p} welcome <on/off/set>`, desc: "Configure automated welcome message for new joins" },
        { cmd: `${p} goodbye <on/off/set>`, desc: "Configure automated farewell message when members leave" },
        { cmd: `${p} setgdesc <text>`, desc: "Update the group description" },
        { cmd: `${p} setgname <name>`, desc: "Update the group subject/name" },
        { cmd: `${p} setgpp`, desc: "Update group display photo (reply to image)" },
        { cmd: `${p} resetlink / ${p}revoke`, desc: "Reset and generate a new group invite link" },
        { cmd: `${p} grouplink`, desc: "Fetch the active WhatsApp invitation link for this group" },
        { cmd: `${p} grouprules / ${p}rules`, desc: "View, set, or update group guidelines and rules" },
        { cmd: `${p} pin / ${p}unpin`, desc: "Pin or unpin important messages in the group" },
        { cmd: `${p} poll <Q | Opt1 | Opt2>`, desc: "Create a native WhatsApp poll with options" },
        { cmd: `${p} pollresult`, desc: "View real-time voting counts for a poll (reply to poll)" },
        { cmd: `${p} chatbot <on/off>`, desc: "Enable or disable auto-reply chatbot in this group" },
      ]
    },
    {
      id: "media",
      title: "🎨 Sticker & Image Media",
      items: [
        { cmd: `${p} sticker / ${p}s`, desc: "Convert replied image or video into a WhatsApp sticker" },
        { cmd: `${p} simage`, desc: "Convert a sticker back into a full-size photo" },
        { cmd: `${p} crop / ${p}stickercrop`, desc: "Crop and convert media into a trimmed sticker" },
        { cmd: `${p} tgsticker <link>`, desc: "Download and convert full Telegram sticker sets" },
        { cmd: `${p} removebg / ${p}nobg`, desc: "Automatically strip backgrounds from images" },
        { cmd: `${p} remini / ${p}enhance`, desc: "Upscale resolution and enhance blurry photos" },
        { cmd: `${p} blur`, desc: "Apply privacy blur effect to an image (reply to image)" },
        { cmd: `${p} emojimix <e1>+<e2>`, desc: "Combine two emojis into a custom sticker graphic" },
        { cmd: `${p} meme`, desc: "Fetch and display trending memes" },
        { cmd: `${p} take <packname>`, desc: "Customize sticker metadata, pack name, and author" },
      ]
    },
    {
      id: "ai",
      title: "🤖 Artificial Intelligence",
      items: [
        { cmd: `${p} ai <question>`, desc: "Ask AI questions and get detailed, smart answers" },
        { cmd: `${p} imagine <prompt>`, desc: "Generate creative AI images from text descriptions" },
        { cmd: `${p} sora <prompt>`, desc: "Generate cinematic visual concepts with AI" },
        { cmd: `${p} silva / ${p}agent <text>`, desc: "Interact with Gabriel autonomous AI agent" },
      ]
    },
    {
      id: "download",
      title: "📥 Media Downloaders",
      items: [
        { cmd: `${p} play <song name>`, desc: "Search and play full audio track from YouTube" },
        { cmd: `${p} song <title>`, desc: "Download high-bitrate MP3 music file" },
        { cmd: `${p} video <title>`, desc: "Download YouTube video in MP4 format" },
        { cmd: `${p} spotify <query>`, desc: "Search and download tracks from Spotify" },
        { cmd: `${p} tiktok <link>`, desc: "Download TikTok video with watermark removed" },
        { cmd: `${p} instagram / ${p}igs <link>`, desc: "Download Instagram reels, posts, and carousels" },
        { cmd: `${p} facebook <link>`, desc: "Download public Facebook video clips" },
      ]
    },
    {
      id: "games",
      title: "🎮 Interactive Games",
      items: [
        { cmd: `${p} tictactoe @user`, desc: "Start a multiplayer Tic-Tac-Toe duel in chat" },
        { cmd: `${p} hangman / ${p}guess <letter>`, desc: "Play word guessing Hangman with clues" },
        { cmd: `${p} trivia / ${p}answer <ans>`, desc: "Test your knowledge with multiple-choice trivia" },
        { cmd: `${p} truth / ${p}dare`, desc: "Party truth-or-dare challenges for group members" },
      ]
    },
    {
      id: "fun",
      title: "🎯 Social & Banter",
      items: [
        { cmd: `${p} roast @user`, desc: "Drop a hilarious, harmless roast on a friend" },
        { cmd: `${p} compliment @user`, desc: "Send a genuinely uplifting compliment" },
        { cmd: `${p} insult @user`, desc: "Playful banter insults for fun" },
        { cmd: `${p} flirt`, desc: "Smooth and funny pick-up lines" },
        { cmd: `${p} shayari`, desc: "Share romantic and thoughtful poetry verses" },
        { cmd: `${p} goodnight / ${p}roseday`, desc: "Send sweet wishes and greetings" },
        { cmd: `${p} character @user`, desc: "Generate a funny personality profile for user" },
        { cmd: `${p} ship @user1 @user2`, desc: "Calculate love compatibility score between two people" },
        { cmd: `${p} simp @user`, desc: "Measure simp score percentage for a member" },
        { cmd: `${p} stupid @user`, desc: "Generate a playful meme rating for user" },
        { cmd: `${p} wasted @user`, desc: "Generate a GTA 'Wasted' styled overlay on user photo" },
      ]
    },
    {
      id: "textmaker",
      title: "🔤 Stylized Text Effects",
      items: [
        { cmd: `${p} metallic <text>`, desc: "Create metallic chrome 3D text graphic" },
        { cmd: `${p} ice / ${p}snow <text>`, desc: "Create frozen winter ice and snow typography" },
        { cmd: `${p} matrix / ${p}hacker <text>`, desc: "Create glowing green terminal hacker text" },
        { cmd: `${p} neon / ${p}light <text>`, desc: "Create vibrant glowing neon sign lettering" },
        { cmd: `${p} fire / ${p}glitch <text>`, desc: "Create fiery flame or digital distortion text" },
        { cmd: `${p} blackpink / ${p}devil <text>`, desc: "Create aesthetic themed stylized typography" },
      ]
    },
    {
      id: "owner",
      title: "🔒 Owner & System Controls",
      items: [
        { cmd: `${p} mode <public/private>`, desc: "Switch bot between public access and owner-only mode" },
        { cmd: `${p} settings`, desc: "Inspect active bot configurations and feature toggles" },
        { cmd: `${p} autostatus <on/off>`, desc: "Automatically view and react to contact status updates" },
        { cmd: `${p} autoread <on/off>`, desc: "Auto-mark incoming messages as read" },
        { cmd: `${p} autotyping <on/off>`, desc: "Display typing presence indicator before responding" },
        { cmd: `${p} alwaysonline <on/off>`, desc: "Maintain continuous online presence on WhatsApp" },
        { cmd: `${p} autobio <on/off>`, desc: "Auto-update WhatsApp account about bio with live uptime" },
        { cmd: `${p} anticall <on/reject/off>`, desc: "Auto-reject or block incoming WhatsApp voice/video calls" },
        { cmd: `${p} pmblocker <on/off>`, desc: "Block unauthorized private direct messages" },
        { cmd: `${p} antidelete <on/off>`, desc: "Detect and preserve revoked/deleted messages" },
        { cmd: `${p} antivv <on/off>`, desc: "Capture and save disappearing view-once media" },
        { cmd: `${p} setprefix <new_prefix>`, desc: "Change the active command trigger prefix" },
        { cmd: `${p} setpp`, desc: "Update bot's profile picture (reply to image)" },
        { cmd: `${p} clearsession`, desc: "Clear stored WhatsApp auth session cache" },
        { cmd: `${p} cleartmp`, desc: "Wipe temporary files and image processing cache" },
        { cmd: `${p} sudo @user`, desc: "Add or remove co-owner sudo permissions" },
        { cmd: `${p} update`, desc: "Check and download the latest bot source updates" },
      ]
    }
  ];
}

// ─── Main Command ────────────────────────────────────────────────────
async function helpCommand(sock, chatId, message, args = []) {
  const senderId = message.key.participant || message.key.remoteJid || "";
  const isGroup = Boolean(chatId && chatId.endsWith("@g.us"));

  const senderName = await getSenderName(sock, senderId);
  const mode = await getBotMode(sock);
  const uptime = formatUptime();
  const senderNum = senderId.split("@")[0].split(":")[0];
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
  const country = settings.ownerNumber.startsWith("254") ? "Kenya" : "International";

  // Read the primary prefix
  const p = getPrimaryPrefix();

  const infoBoxes = `╭─❒ BOT INFO
│ 🤖 Name      :  ${settings.botName || "Gabriel MD Bot"}
│ ⚡ Version   :  V${settings.version || "1.0.1"}
│ 📦 Mode      :  ${mode}
│ 👑 Owner     :  ${settings.botOwner || "Lil Gabriel"}
│ 📈 Uptime    :  ${uptime}
│ 🔑 Prefix    :  ${p} (also supports !)
╰──────────────

╭─❒ USER INFO
│ 👤 User      :  ${senderName}
│ ⭐ Premium   :  ${isPremium ? "Yes" : "No"}
│ 📍 Country   :  ${country}
│ 📱 Platform  :  ${platform}
╰──────────────`;

  const headerBanner = `╭───────────────
   Developer: *Lil Gabriel*
   Bot: *${settings.botName || "Gabriel MD Bot"}*
   YT : ${global.ytch || "Lil Gabriel Dev"}
╰──────────────

*🌟 Multi-Device WhatsApp Features & Commands:*
_Use ${p}help or !help to view all features with descriptions._`;

  const categories = getFeatureCategories(p);

  // Check if user requested a specific category filter (e.g. !help admin, !help ai)
  const filterQuery = (args[0] || "").toLowerCase().trim();
  let selectedCategories = categories;

  if (filterQuery) {
    const matched = categories.filter(c =>
      c.id.includes(filterQuery) ||
      c.title.toLowerCase().includes(filterQuery)
    );
    if (matched.length > 0) {
      selectedCategories = matched;
    }
  }

  const categoryBlocks = selectedCategories.map(cat => {
    const lines = [`╭─❒ ${cat.title}:`];
    for (const item of cat.items) {
      lines.push(`│ ➤ *${item.cmd}* — ${item.desc}`);
    }
    lines.push(`╰──────────────`);
    return lines.join("\n");
  }).join("\n\n");

  const footer = `\n_💡 Tip: Type \`${p}help <category>\` (e.g., \`!help admin\` or \`!help ai\`) to view specific feature sections._`;

  const fullHelpMessage = `${infoBoxes}\n\n${headerBanner}\n\n${categoryBlocks}\n${footer}`;

  try {
    const imagePath = path.join(__dirname, "../assets/bot_image.jpg");

    if (fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath);

      await sock.sendMessage(
        chatId,
        {
          image: imageBuffer,
          caption: fullHelpMessage,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
          },
        },
        { quoted: message },
      );
    } else {
      await sock.sendMessage(
        chatId,
        {
          text: fullHelpMessage,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
          },
        },
        { quoted: message }
      );
    }
  } catch (error) {
    console.error("Error in help command:", error.message);
    await sock.sendMessage(chatId, { text: fullHelpMessage }, { quoted: message });
  }
}

// Export both default function and plugin structure for handler.js
module.exports = helpCommand;
module.exports.commands = ["help", "menu", "features", "commands", "bot", "list"];
module.exports.description = "Lists all available bot features and their descriptions";
module.exports.usage = "!help or .help [category]";
module.exports.permission = "public";
module.exports.group = true;
module.exports.private = true;
module.exports.run = async (sock, message, args, ctx) => {
  const chatId = ctx?.jid || ctx?.chatId || message.key.remoteJid;
  return helpCommand(sock, chatId, message, args);
};
