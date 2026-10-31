// 🧹 Fix for ENOSPC / temp overflow in hosted panels
const fs = require("fs");
const path = require("path");

// Redirect temp storage away from system /tmp
const customTemp = path.join(process.cwd(), "temp");
if (!fs.existsSync(customTemp)) fs.mkdirSync(customTemp, { recursive: true });
process.env.TMPDIR = customTemp;
process.env.TEMP = customTemp;
process.env.TMP = customTemp;

// Auto-cleaner every 3 hours
setInterval(
  () => {
    fs.readdir(customTemp, (err, files) => {
      if (err) return;
      for (const file of files) {
        const filePath = path.join(customTemp, file);
        fs.stat(filePath, (err, stats) => {
          if (!err && Date.now() - stats.mtimeMs > 3 * 60 * 60 * 1000) {
            fs.unlink(filePath, () => {});
          }
        });
      }
    });
    console.log("🧹 Temp folder auto-cleaned");
  },
  3 * 60 * 60 * 1000,
);

const settings = require("./settings");
const { getMessageText, findUsedPrefix, getPrimaryPrefix } = require("./lib/prefix");
require("./config.js");
const { isBanned } = require("./lib/isBanned");
const yts = require("yt-search");
const { fetchBuffer } = require("./lib/myfunc");
const fetch = require("node-fetch");
const ytdl = require("ytdl-core");
const axios = require("axios");
const ffmpeg = require("fluent-ffmpeg");
const { isSudo } = require("./lib/index");
const isOwnerOrSudo = require("./lib/isOwner");
const {
  autotypingCommand,
  isAutotypingEnabled,
  handleAutotypingForMessage,
  handleAutotypingForCommand,
  showTypingAfterCommand,
} = require("./commands/autotyping");
const {
  autoreadCommand,
  isAutoreadEnabled,
  handleAutoread,
} = require("./commands/autoread");

// Command imports
const tagAllCommand = require("./commands/tagall");
const helpCommand = require("./commands/help");
const banCommand = require("./commands/ban");
const { blockCommand, unblockCommand, isBlocked } = require("./commands/block");
const { promoteCommand } = require("./commands/promote");
const { demoteCommand } = require("./commands/demote");
const muteCommand = require("./commands/mute");
const unmuteCommand = require("./commands/unmute");
const stickerCommand = require("./commands/sticker");
const isAdmin = require("./lib/isAdmin");
const warnCommand = require("./commands/warn");
const warningsCommand = require("./commands/warnings");
const ttsCommand = require("./commands/tts");
const {
  tictactoeCommand,
  handleTicTacToeMove,
} = require("./commands/tictactoe");
const { incrementMessageCount, topMembers } = require("./commands/topmembers");
const ownerCommand = require("./commands/owner");
const deleteCommand = require("./commands/delete");
const {
  handleAntilinkCommand,
  handleLinkDetection,
} = require("./commands/antilink");
const {
  handleAntitagCommand,
  handleTagDetection,
} = require("./commands/antitag");
const {
  handleAntimentionCommand,
  handleMentionDetection: handleAntimentionDetection,
  handleGlobalAntimentionCommand,
} = require("./commands/antimention");
const { Antilink } = require("./lib/antilink");
const {
  handleMentionDetection,
  mentionToggleCommand,
  setMentionCommand,
} = require("./commands/mention");
const memeCommand = require("./commands/meme");
const tagCommand = require("./commands/tag");
const tagNotAdminCommand = require("./commands/tagnotadmin");
const hideTagCommand = require("./commands/hidetag");
const jokeCommand = require("./commands/joke");
const quoteCommand = require("./commands/quote");
const factCommand = require("./commands/fact");
const weatherCommand = require("./commands/weather");
const newsCommand = require("./commands/news");
const kickCommand = require("./commands/kick");
const simageCommand = require("./commands/simage");
const attpCommand = require("./commands/attp");
const { startHangman, guessLetter } = require("./commands/hangman");
const { startTrivia, answerTrivia } = require("./commands/trivia");
const { complimentCommand } = require("./commands/compliment");
const { insultCommand } = require("./commands/insult");
const { eightBallCommand } = require("./commands/eightball");
const { lyricsCommand } = require("./commands/lyrics");
const { dareCommand } = require("./commands/dare");
const { truthCommand } = require("./commands/truth");
const { clearCommand } = require("./commands/clear");
const pingCommand = require("./commands/ping");
const aliveCommand = require("./commands/alive");
const blurCommand = require("./commands/img-blur");
const { welcomeCommand, handleJoinEvent } = require("./commands/welcome");
const { goodbyeCommand, handleLeaveEvent } = require("./commands/goodbye");
const githubCommand = require("./commands/github");
const {
  handleAntiBadwordCommand,
  handleBadwordDetection,
} = require("./lib/antibadword");
const antibadwordCommand = require("./commands/antibadword");
const {
  handleChatbotCommand,
  handleChatbotResponse,
} = require("./commands/chatbot");
const takeCommand = require("./commands/take");
const { flirtCommand } = require("./commands/flirt");
const characterCommand = require("./commands/character");
const wastedCommand = require("./commands/wasted");
const shipCommand = require("./commands/ship");
const groupInfoCommand = require("./commands/groupinfo");
const resetlinkCommand = require("./commands/resetlink");
const staffCommand = require("./commands/staff");
const unbanCommand = require("./commands/unban");
const emojimixCommand = require("./commands/emojimix");
const { handlePromotionEvent } = require("./commands/promote");
const { handleDemotionEvent } = require("./commands/demote");
const viewOnceCommand = require("./commands/viewonce");
const clearSessionCommand = require("./commands/clearsession");
const {
  autoStatusCommand,
  handleStatusUpdate,
} = require("./commands/autostatus");
const { simpCommand } = require("./commands/simp");
const { stupidCommand } = require("./commands/stupid");
const stickerTelegramCommand = require("./commands/stickertelegram");
const textmakerCommand = require("./commands/textmaker");
const {
  handleAntideleteCommand,
  handleMessageRevocation,
  storeMessage,
} = require("./commands/antidelete");
const clearTmpCommand = require("./commands/cleartmp");
const setProfilePicture = require("./commands/setpp");
const {
  setGroupDescription,
  setGroupName,
  setGroupPhoto,
} = require("./commands/groupmanage");
const instagramCommand = require("./commands/instagram");
const facebookCommand = require("./commands/facebook");
const spotifyCommand = require("./commands/spotify");
const playCommand = require("./commands/play");
const tiktokCommand = require("./commands/tiktok");
const songCommand = require("./commands/song");
const aiCommand = require("./commands/ai");
const urlCommand = require("./commands/url");
const { handleTranslateCommand } = require("./commands/translate");
const { handleSsCommand } = require("./commands/ss");
const { addCommandReaction, handleAreactCommand } = require("./lib/reactions");
const { goodnightCommand } = require("./commands/goodnight");
const { shayariCommand } = require("./commands/shayari");
const { rosedayCommand } = require("./commands/roseday");
const imagineCommand = require("./commands/imagine");
const videoCommand = require("./commands/video");
const sudoCommand = require("./commands/sudo");
const { miscCommand, handleHeart } = require("./commands/misc");
const { animeCommand } = require("./commands/anime");
const { piesCommand, piesAlias } = require("./commands/pies");
const stickercropCommand = require("./commands/stickercrop");
const updateCommand = require("./commands/update");
const removebgCommand = require("./commands/removebg");
const { reminiCommand } = require("./commands/remini");
const { igsCommand } = require("./commands/igs");
const {
  anticallCommand,
  readState: readAnticallState,
} = require("./commands/anticall");
const {
  pmblockerCommand,
  readState: readPmBlockerState,
} = require("./commands/pmblocker");
const {
  globalAntilinkCommand,
  readState: readGlobalAntilinkState,
} = require("./commands/globalAntilink");
const settingsCommand = require("./commands/settings");
const soraCommand = require("./commands/sora");
const {
  antivvCommand,
  readState: readAntivvState,
} = require("./commands/antivv");
const {
  alwaysonlineCommand,
  isAlwaysOnlineEnabled,
} = require("./commands/alwaysonline/alwaysonline");
const {
  antiscamCommand,
  handleScamDetection,
} = require("./commands/antiscam");
const {
  handleAntifloodCommand,
  handleFloodDetection,
} = require("./commands/antiflood");
const {
  autobioCommand,
  isAutobioEnabled,
  startAutobioLoop,
} = require("./commands/autobio");
const statusSaveCommand = require("./commands/statussave");
const setprefixCommand = require("./commands/setprefix");
const { getPlugin } = require("./handler");

// Global settings
global.packname = settings.packname;
global.author = settings.author;
global.ytch = "Lil Gabriel Dev";

const channelInfo = {};

async function handleMessages(sock, messageUpdate, printLog) {
  let chatId = null;
  try {
    const { messages, type } = messageUpdate;
    if (type !== "notify") return;

    const message = messages[0];
    if (!message?.message) return;

    chatId = message.key?.remoteJid;

    // Handle autoread functionality
    await handleAutoread(sock, message);

    // Store message for antidelete feature
    if (message.message) {
      storeMessage(sock, message);
    }

    // Handle message revocation
    if (message.message?.protocolMessage?.type === 0) {
      await handleMessageRevocation(sock, message);
      return;
    }

    const senderId = message.key.participant || message.key.remoteJid;
    const isGroup = chatId && chatId.endsWith("@g.us");
    const senderIsSudo = await isSudo(senderId);
    const senderIsOwnerOrSudo = await isOwnerOrSudo(senderId, sock, chatId);

    // Handle button responses
    if (message.message?.buttonsResponseMessage) {
      const buttonId = message.message.buttonsResponseMessage.selectedButtonId;
      const chatId = message.key.remoteJid;

      if (buttonId === "channel") {
        await sock.sendMessage(
          chatId,
          {
            text: "📢 *Gabriel MD Bot:*\n#",
          },
          { quoted: message },
        );
        return;
      } else if (buttonId === "owner") {
        const ownerCommand = require("./commands/owner");
        await ownerCommand(sock, chatId);
        return;
      } else if (buttonId === "support") {
        await sock.sendMessage(
          chatId,
          {
            text: `🔗 *Support*\n\n#`,
          },
          { quoted: message },
        );
        return;
      }
    }

    const rawText = getMessageText(message);
    const usedPrefix = findUsedPrefix(rawText);

    const userMessage = (
      rawText ||
      message.message?.buttonsResponseMessage?.selectedButtonId?.trim() ||
      ""
    )
      .toLowerCase()
      .trim();

    // Extract command and arguments prefix-agnostically
    const commandBody = usedPrefix ? userMessage.slice(usedPrefix.length).trim() : userMessage;
    const parts = commandBody.split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);
    const argsText = commandBody.slice(commandName.length).trim();
    
    // For backward compatibility with existing switch cases
    const normalizedMessage = usedPrefix ? "." + commandName : userMessage;
    const fullNormalizedMessage = usedPrefix ? "." + commandBody : userMessage;

    // Only log command usage
    if (usedPrefix) {
      console.log(
        `📝 Command used in ${isGroup ? "group" : "private"}: ${userMessage} (Prefix: ${usedPrefix})`,
      );
    }
    // Read bot mode once; don't early-return so moderation can still run in private mode
    let isPublic = true;
    try {
      const data = JSON.parse(fs.readFileSync("./data/messageCount.json"));
      if (typeof data.isPublic === "boolean") isPublic = data.isPublic;
    } catch (error) {
      console.error("Error checking access mode:", error);
      // default isPublic=true on error
    }
    const isOwnerOrSudoCheck = message.key.fromMe || senderIsOwnerOrSudo;
    // Check if user is banned (skip ban check for unban command)
    if (isBanned(senderId) && !normalizedMessage.startsWith(".unban")) {
      if (Math.random() < 0.1) {
        await sock.sendMessage(chatId, {
          text: "You are banned from using the bot. Contact an admin to get unbanned.",

        });
      }
      return;
    }

    // Check if user is blocked (skip block check for unblock command)
    if (isBlocked(senderId) && !normalizedMessage.startsWith(".unblock")) {
      if (Math.random() < 0.1) {
        await sock.sendMessage(chatId, {
          text: "You are blocked from contacting the bot.",

        });
      }
      return;
    }

    // First check if it's a game move
    if (
      /^[1-9]$/.test(userMessage) ||
      userMessage.toLowerCase() === "surrender"
    ) {
      await handleTicTacToeMove(sock, chatId, senderId, userMessage);
      return;
    }

    /*  // Basic message response in private chat
          if (!isGroup && (userMessage === 'hi' || userMessage === 'hello' || userMessage === 'bot' || userMessage === 'hlo' || userMessage === 'hey' || userMessage === 'bro')) {
              await sock.sendMessage(chatId, {
                  text: 'Hi, How can I help you?\nYou can use .menu for more info and commands.',
                  
              });
              return;
          } */

    if (!message.key.fromMe) incrementMessageCount(chatId, senderId);

    // Check for bad words and antilink FIRST, before ANY other processing
    // Always run moderation in groups, regardless of mode
    if (isGroup) {
      if (userMessage) {
        await handleBadwordDetection(
          sock,
          chatId,
          message,
          userMessage,
          senderId,
        );
      }
      // Antilink checks message text internally, so run it even if userMessage is empty
      await Antilink(message, sock);
      await handleFloodDetection(sock, chatId, message, userMessage, senderId);
      
      if (userMessage || rawText) {
        await handleScamDetection(
          sock,
          chatId,
          message,
          rawText || userMessage,
          senderId,
        );
      }
    }

    // PM blocker: block non-owner DMs when enabled (do not ban)
    if (!isGroup && !message.key.fromMe && !senderIsSudo) {
      try {
        const pmState = readPmBlockerState();
        if (pmState.enabled) {
          // Inform user, delay, then block without banning globally
          await sock.sendMessage(chatId, {
            text:
              pmState.message ||
              "Private messages are blocked. Please contact the owner in groups only.",
          });
          await new Promise((r) => setTimeout(r, 1500));
          try {
            await sock.updateBlockStatus(chatId, "block");
          } catch (e) {}
          return;
        }
      } catch (e) {}
    }

    // Then check for command prefix
    if (!usedPrefix) {
      // Always online presence update
      if (isAlwaysOnlineEnabled()) {
        await sock.sendPresenceUpdate("available", chatId);
      }

      // Show typing indicator if autotyping is enabled
      await handleAutotypingForMessage(sock, chatId, userMessage);

      if (isGroup) {
        // Always run moderation features (antitag) regardless of mode
        await handleTagDetection(sock, chatId, message, senderId);
        await handleMentionDetection(sock, chatId, message);
        await handleAntimentionDetection(sock, chatId, message, senderId);

        // Only run chatbot in public mode or for owner/sudo
        if (isPublic || isOwnerOrSudoCheck) {
          await handleChatbotResponse(
            sock,
            chatId,
            message,
            userMessage,
            senderId,
          );
        }
      }
      return;
    }
    // In private mode, only owner/sudo can run commands
    if (!isPublic && !isOwnerOrSudoCheck) {
      return;
    }

    // List of admin commands
    const adminCommands = [
      ".mute",
      ".unmute",
      ".ban",
      ".unban",
      ".promote",
      ".demote",
      ".kick",
      ".tagall",
      ".tagnotadmin",
      ".hidetag",
      ".antilink",
      ".antiscam",
      ".antitag",
      ".antimention",
      ".antiflood",
      ".setgdesc",
      ".setgname",
      ".setgpp",
    ];
    const isAdminCommand = adminCommands.some((cmd) =>
      fullNormalizedMessage.startsWith(cmd),
    );

    // List of owner commands
    const ownerCommands = [
      ".mode",
      ".autostatus",
      ".antivv",
      ".avv",
      ".antidelete",
      ".cleartmp",
      ".setpp",
      ".clearsession",
      ".areact",
      ".autoreact",
      ".autotyping",
      ".autoread",
      ".pmblocker",
      ".setprefix",
      ".globalantilink",
      ".block",
      ".unblock",
    ];
    const isOwnerCommand = ownerCommands.some((cmd) =>
      fullNormalizedMessage.startsWith(cmd),
    );

    let isSenderAdmin = false;
    let isBotAdmin = false;

    // Check admin status only for admin commands in groups
    if (isGroup && isAdminCommand) {
      const adminStatus = await isAdmin(sock, chatId, senderId);
      isSenderAdmin = adminStatus.isSenderAdmin;
      isBotAdmin = adminStatus.isBotAdmin;

      if (!isBotAdmin) {
        await sock.sendMessage(
          chatId,
          {
            text: "Please make the bot an admin to use admin commands.",
            
          },
          { quoted: message },
        );
        return;
      }

      if (
        normalizedMessage.startsWith(".mute") ||
        normalizedMessage === ".unmute" ||
        normalizedMessage.startsWith(".ban") ||
        normalizedMessage.startsWith(".unban") ||
        normalizedMessage.startsWith(".promote") ||
        normalizedMessage.startsWith(".demote")
      ) {
        if (!isSenderAdmin && !message.key.fromMe) {
          await sock.sendMessage(
            chatId,
            {
              text: "Sorry, only group admins can use this command.",
              
            },
            { quoted: message },
          );
          return;
        }
      }
    }

    // Check owner status for owner commands
    if (isOwnerCommand) {
      if (!message.key.fromMe && !senderIsOwnerOrSudo) {
        await sock.sendMessage(
          chatId,
          { text: "❌ This command is only available for the owner or sudo!" },
          { quoted: message },
        );
        return;
      }
    }

    // Command handlers - Execute commands immediately without waiting for typing indicator
    // We'll show typing indicator after command execution if needed
    let commandExecuted = false;

    switch (true) {
      case normalizedMessage === ".simage": {
        const quotedMessage =
          message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quotedMessage?.stickerMessage) {
          await simageCommand(sock, quotedMessage, chatId);
        } else {
          await sock.sendMessage(
            chatId,
            {
              text: "Please reply to a sticker with the .simage command to convert it.",
              
            },
            { quoted: message },
          );
        }
        commandExecuted = true;
        break;
      }
      case normalizedMessage.startsWith(".kick"):
        const mentionedJidListKick =
          message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
        await kickCommand(
          sock,
          chatId,
          senderId,
          mentionedJidListKick,
          message,
        );
        break;
      case normalizedMessage.startsWith(".mute"):
        {
          const parts = userMessage.trim().split(/\s+/);
          const muteArg = parts[1];
          const muteDuration =
            muteArg !== undefined ? parseInt(muteArg, 10) : undefined;
          if (
            muteArg !== undefined &&
            (isNaN(muteDuration) || muteDuration <= 0)
          ) {
            await sock.sendMessage(
              chatId,
              {
                text: "Please provide a valid number of minutes or use .mute with no number to mute immediately.",
                
              },
              { quoted: message },
            );
          } else {
            await muteCommand(sock, chatId, senderId, message, muteDuration);
          }
        }
        break;
      case normalizedMessage === ".unmute":
        await unmuteCommand(sock, chatId, senderId);
        break;
      case normalizedMessage.startsWith(".ban"):
        if (!isGroup) {
          if (!message.key.fromMe && !senderIsSudo) {
            await sock.sendMessage(
              chatId,
              { text: "Only owner/sudo can use .ban in private chat." },
              { quoted: message },
            );
            break;
          }
        }
        await banCommand(sock, chatId, message);
        break;
      case normalizedMessage.startsWith(".unban"):
        if (!isGroup) {
          if (!message.key.fromMe && !senderIsSudo) {
            await sock.sendMessage(
              chatId,
              { text: "Only owner/sudo can use .unban in private chat." },
              { quoted: message },
            );
            break;
          }
        }
        await unbanCommand(sock, chatId, message);
        break;
      case normalizedMessage.startsWith(".block"):
        if (!isGroup) {
          if (!message.key.fromMe) {
            const senderId = message.key.participant || message.key.remoteJid;
            if (!senderIsSudo) {
              await sock.sendMessage(
                chatId,
                { text: "Only owner/sudo can use .block in private chat." },
                { quoted: message },
              );
              break;
            }
          }
        }
        await blockCommand(sock, chatId, message);
        break;
      case normalizedMessage.startsWith(".unblock"):
        if (!isGroup) {
          if (!message.key.fromMe) {
            const senderId = message.key.participant || message.key.remoteJid;
            if (!senderIsSudo) {
              await sock.sendMessage(
                chatId,
                { text: "Only owner/sudo can use .unblock in private chat." },
                { quoted: message },
              );
              break;
            }
          }
        }
        await unblockCommand(sock, chatId, message);
        break;
      case normalizedMessage === ".help" ||
        normalizedMessage === ".menu" ||
        normalizedMessage === ".bot" ||
        normalizedMessage === ".list" ||
        normalizedMessage === ".features" ||
        normalizedMessage === ".commands" ||
        normalizedMessage.startsWith(".help ") ||
        normalizedMessage.startsWith(".menu ") ||
        normalizedMessage.startsWith(".features "):
        await helpCommand(sock, chatId, message, args);
        commandExecuted = true;
        break;
      case normalizedMessage === ".sticker" || normalizedMessage === ".s":
        await stickerCommand(sock, chatId, message);
        commandExecuted = true;
        break;
      case normalizedMessage === ".save" ||
        normalizedMessage === ".nitumie" ||
        normalizedMessage === ".statussave":
        await statusSaveCommand(sock, chatId, message);
        commandExecuted = true;
        break;
      case normalizedMessage.startsWith(".warnings"):
        const mentionedJidListWarnings =
          message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
        await warningsCommand(sock, chatId, mentionedJidListWarnings);
        break;
      case normalizedMessage.startsWith(".warn"):
        const mentionedJidListWarn =
          message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
        await warnCommand(
          sock,
          chatId,
          senderId,
          mentionedJidListWarn,
          message,
        );
        break;
      case commandName === "tts":
        await ttsCommand(sock, chatId, argsText, message);
        break;
      case normalizedMessage.startsWith(".delete") || normalizedMessage.startsWith(".del"):
        await deleteCommand(sock, chatId, message, senderId);
        break;
      case normalizedMessage.startsWith(".attp"):
        await attpCommand(sock, chatId, message);
        break;

      case normalizedMessage === ".settings":
        await settingsCommand(sock, chatId, message);
        break;
      case normalizedMessage.startsWith(".mode"):
        // Check if sender is the owner
        if (!message.key.fromMe && !senderIsOwnerOrSudo) {
          await sock.sendMessage(
            chatId,
            { text: "Only bot owner can use this command!" },
            { quoted: message },
          );
          return;
        }
        // Read current data first
        let data;
        try {
          data = JSON.parse(fs.readFileSync("./data/messageCount.json"));
        } catch (error) {
          console.error("Error reading access mode:", error);
          await sock.sendMessage(chatId, {
            text: "Failed to read bot mode status",
            
          });
          return;
        }

        const action = userMessage.split(" ")[1]?.toLowerCase();
        // If no argument provided, show current status
        if (!action) {
          const currentMode = data.isPublic ? "public" : "private";
          await sock.sendMessage(
            chatId,
            {
              text: `Current bot mode: *${currentMode}*\n\nUsage: ${getPrimaryPrefix()}mode public/private\n\nExample:\n${getPrimaryPrefix()}mode public - Allow everyone to use bot\n${getPrimaryPrefix()}mode private - Restrict to owner only`,
              
            },
            { quoted: message },
          );
          return;
        }

        if (action !== "public" && action !== "private") {
          await sock.sendMessage(
            chatId,
            {
              text: `Usage: ${getPrimaryPrefix()}mode public/private\n\nExample:\n${getPrimaryPrefix()}mode public - Allow everyone to use bot\n${getPrimaryPrefix()}mode private - Restrict to owner only`,
              
            },
            { quoted: message },
          );
          return;
        }

        try {
          // Update access mode
          data.isPublic = action === "public";

          // Save updated data
          fs.writeFileSync(
            "./data/messageCount.json",
            JSON.stringify(data, null, 2),
          );

          await sock.sendMessage(chatId, {
            text: `Bot is now in *${action}* mode`,
            
          });
        } catch (error) {
          console.error("Error updating access mode:", error);
          await sock.sendMessage(chatId, {
            text: "Failed to update bot access mode",
            
          });
        }
        break;
      case normalizedMessage.startsWith(".anticall"):
        if (!message.key.fromMe && !senderIsOwnerOrSudo) {
          await sock.sendMessage(
            chatId,
            { text: "Only owner/sudo can use anticall." },
            { quoted: message },
          );
          break;
        }
        {
          const args = userMessage.split(" ").slice(1).join(" ");
          await anticallCommand(sock, chatId, message, args);
        }
        break;
      case normalizedMessage.startsWith(".pmblocker"):
        {
          const args = userMessage.split(" ").slice(1).join(" ");
          await pmblockerCommand(sock, chatId, message, args);
        }
        commandExecuted = true;
        break;
      case normalizedMessage.startsWith(".globalantilink"):
        {
          const args = userMessage.split(" ").slice(1).join(" ");
          await globalAntilinkCommand(sock, chatId, message, args);
        }
        commandExecuted = true;
        break;
      case normalizedMessage.startsWith(".globalantimention"):
        await handleGlobalAntimentionCommand(sock, chatId, message, userMessage, senderId);
        commandExecuted = true;
        break;
      case normalizedMessage.startsWith(".alwaysonline"):
        await alwaysonlineCommand(sock, chatId, message);
        commandExecuted = true;
        break;
      case normalizedMessage.startsWith(".autobio"):
        await autobioCommand(sock, chatId, message);
        commandExecuted = true;
        break;

      case normalizedMessage === ".owner":
        await ownerCommand(sock, chatId);
        break;
      case normalizedMessage === ".tagall":
        await tagAllCommand(sock, chatId, senderId, message);
        break;
      case normalizedMessage === ".tagnotadmin":
        await tagNotAdminCommand(sock, chatId, senderId, message);
        break;
      case commandName === "hidetag":
        {
          const messageText = rawText.slice(usedPrefix.length + commandName.length).trim();
          const replyMessage =
            message.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            null;
          await hideTagCommand(
            sock,
            chatId,
            senderId,
            messageText,
            replyMessage,
            message,
          );
        }
        break;
      case commandName === "tag":
        const messageText = rawText.slice(usedPrefix.length + commandName.length).trim(); // use rawText here, not userMessage
        const replyMessage =
          message.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
          null;
        await tagCommand(
          sock,
          chatId,
          senderId,
          messageText,
          replyMessage,
          message,
        );
        break;
      case normalizedMessage.startsWith(".antilink"):
        if (!isGroup) {
          await sock.sendMessage(
            chatId,
            {
              text: "This command can only be used in groups.",
              
            },
            { quoted: message },
          );
          return;
        }
        if (!isBotAdmin) {
          await sock.sendMessage(
            chatId,
            {
              text: "Please make the bot an admin first.",
              
            },
            { quoted: message },
          );
          return;
        }
        await handleAntilinkCommand(
          sock,
          chatId,
          userMessage,
          senderId,
          isSenderAdmin,
          message,
        );
        break;
      case normalizedMessage.startsWith(".antiflood"):
        if (!isGroup) {
          await sock.sendMessage(
            chatId,
            {
              text: "This command can only be used in groups.",
              
            },
            { quoted: message },
          );
          return;
        }
        if (!isBotAdmin) {
          await sock.sendMessage(
            chatId,
            {
              text: "Please make the bot an admin first.",
              
            },
            { quoted: message },
          );
          return;
        }
        await handleAntifloodCommand(
          sock,
          chatId,
          userMessage,
          senderId,
          isSenderAdmin,
          message,
        );
        break;
      case normalizedMessage.startsWith(".antitag"):
        if (!isGroup) {
          await sock.sendMessage(
            chatId,
            {
              text: "This command can only be used in groups.",
              
            },
            { quoted: message },
          );
          return;
        }
        if (!isBotAdmin) {
          await sock.sendMessage(
            chatId,
            {
              text: "Please make the bot an admin first.",
              
            },
            { quoted: message },
          );
          return;
        }
        await handleAntitagCommand(
          sock,
          chatId,
          userMessage,
          senderId,
          isSenderAdmin,
          message,
        );
        break;
      case normalizedMessage.startsWith(".antimention"):
        if (!isGroup) {
          await sock.sendMessage(
            chatId,
            {
              text: "This command can only be used in groups.",
              
            },
            { quoted: message },
          );
          return;
        }
        if (!isBotAdmin) {
          await sock.sendMessage(
            chatId,
            {
              text: "Please make the bot an admin first.",
              
            },
            { quoted: message },
          );
          return;
        }
        await handleAntimentionCommand(
          sock,
          chatId,
          userMessage,
          senderId,
          isSenderAdmin,
          message,
        );
        break;
      case normalizedMessage === ".meme":
        await memeCommand(sock, chatId, message);
        break;
      case normalizedMessage === ".joke":
        await jokeCommand(sock, chatId, message);
        break;
      case normalizedMessage === ".quote":
        await quoteCommand(sock, chatId, message);
        break;
      case normalizedMessage === ".fact":
        await factCommand(sock, chatId, message, message);
        break;
      case commandName === "weather":
        const city = argsText;
        if (city) {
          await weatherCommand(sock, chatId, message, city);
        } else {
          await sock.sendMessage(
            chatId,
            {
              text: "Please specify a city, e.g., .weather London",
              
            },
            { quoted: message },
          );
        }
        break;
      case normalizedMessage === ".news":
        await newsCommand(sock, chatId);
        break;
      case normalizedMessage.startsWith(".ttt") ||
        normalizedMessage.startsWith(".tictactoe"):
        const tttText = userMessage.split(" ").slice(1).join(" ");
        await tictactoeCommand(sock, chatId, senderId, tttText);
        break;
      case normalizedMessage.startsWith(".move"):
        const position = parseInt(userMessage.split(" ")[1]);
        if (isNaN(position)) {
          await sock.sendMessage(
            chatId,
            {
              text: "Please provide a valid position number for Tic-Tac-Toe move.",
              
            },
            { quoted: message },
          );
        } else {
          tictactoeMove(sock, chatId, senderId, position);
        }
        break;
      case normalizedMessage === ".topmembers":
        topMembers(sock, chatId, isGroup);
        break;
      case normalizedMessage.startsWith(".hangman"):
        startHangman(sock, chatId);
        break;
      case normalizedMessage.startsWith(".guess"):
        const guessedLetter = userMessage.split(" ")[1];
        if (guessedLetter) {
          guessLetter(sock, chatId, guessedLetter);
        } else {
          sock.sendMessage(
            chatId,
            {
              text: "Please guess a letter using .guess <letter>",
              
            },
            { quoted: message },
          );
        }
        break;
      case normalizedMessage.startsWith(".trivia"):
        startTrivia(sock, chatId);
        break;
      case normalizedMessage.startsWith(".answer"):
        const answer = userMessage.split(" ").slice(1).join(" ");
        if (answer) {
          answerTrivia(sock, chatId, answer);
        } else {
          sock.sendMessage(
            chatId,
            {
              text: "Please provide an answer using .answer <answer>",
              
            },
            { quoted: message },
          );
        }
        break;
      case normalizedMessage.startsWith(".compliment"):
        await complimentCommand(sock, chatId, message);
        break;
      case normalizedMessage.startsWith(".insult"):
        await insultCommand(sock, chatId, message);
        break;
      case normalizedMessage.startsWith(".8ball"):
        const question = userMessage.split(" ").slice(1).join(" ");
        await eightBallCommand(sock, chatId, question);
        break;
      case normalizedMessage.startsWith(".lyrics"):
        const songTitle = userMessage.split(" ").slice(1).join(" ");
        await lyricsCommand(sock, chatId, songTitle, message);
        break;
      case normalizedMessage.startsWith(".simp"):
        const quotedMsg =
          message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const mentionedJid =
          message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        await simpCommand(sock, chatId, quotedMsg, mentionedJid, senderId);
        break;
      case normalizedMessage.startsWith(".stupid") ||
        normalizedMessage.startsWith(".itssostupid") ||
        normalizedMessage.startsWith(".iss"):
        const stupidQuotedMsg =
          message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const stupidMentionedJid =
          message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const stupidArgs = userMessage.split(" ").slice(1);
        await stupidCommand(
          sock,
          chatId,
          stupidQuotedMsg,
          stupidMentionedJid,
          senderId,
          stupidArgs,
        );
        break;
      case normalizedMessage === ".dare":
        await dareCommand(sock, chatId, message);
        break;
      case normalizedMessage === ".truth":
        await truthCommand(sock, chatId, message);
        break;
      case normalizedMessage === ".clear":
        if (isGroup) await clearCommand(sock, chatId);
        break;
      case normalizedMessage.startsWith(".promote"):
        const mentionedJidListPromote =
          message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
        await promoteCommand(sock, chatId, mentionedJidListPromote, message);
        break;
      case normalizedMessage.startsWith(".demote"):
        const mentionedJidListDemote =
          message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
        await demoteCommand(sock, chatId, mentionedJidListDemote, message);
        break;
      case normalizedMessage === ".ping":
        await pingCommand(sock, chatId, message);
        break;
      case normalizedMessage === ".alive":
        await aliveCommand(sock, chatId, message);
        break;
      case normalizedMessage.startsWith(".mention "):
        {
          const args = userMessage.split(" ").slice(1).join(" ");
          const isOwner = message.key.fromMe || senderIsSudo;
          await mentionToggleCommand(sock, chatId, message, args, isOwner);
        }
        break;
      case normalizedMessage === ".setmention":
        {
          const isOwner = message.key.fromMe || senderIsSudo;
          await setMentionCommand(sock, chatId, message, isOwner);
        }
        break;
      case normalizedMessage.startsWith(".blur"):
        const quotedMessage =
          message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        await blurCommand(sock, chatId, message, quotedMessage);
        break;
      case normalizedMessage.startsWith(".welcome"):
        if (isGroup) {
          // Check admin status if not already checked
          if (!isSenderAdmin) {
            const adminStatus = await isAdmin(sock, chatId, senderId);
            isSenderAdmin = adminStatus.isSenderAdmin;
          }

          if (isSenderAdmin || message.key.fromMe) {
            await welcomeCommand(sock, chatId, message);
          } else {
            await sock.sendMessage(
              chatId,
              {
                text: "Sorry, only group admins can use this command.",
                
              },
              { quoted: message },
            );
          }
        } else {
          await sock.sendMessage(
            chatId,
            {
              text: "This command can only be used in groups.",
              
            },
            { quoted: message },
          );
        }
        break;
      case normalizedMessage.startsWith(".goodbye"):
        if (isGroup) {
          // Check admin status if not already checked
          if (!isSenderAdmin) {
            const adminStatus = await isAdmin(sock, chatId, senderId);
            isSenderAdmin = adminStatus.isSenderAdmin;
          }

          if (isSenderAdmin || message.key.fromMe) {
            await goodbyeCommand(sock, chatId, message);
          } else {
            await sock.sendMessage(
              chatId,
              {
                text: "Sorry, only group admins can use this command.",
                
              },
              { quoted: message },
            );
          }
        } else {
          await sock.sendMessage(
            chatId,
            {
              text: "This command can only be used in groups.",
              
            },
            { quoted: message },
          );
        }
        break;
      case normalizedMessage === ".git":
      case normalizedMessage === ".github":
      case normalizedMessage === ".sc":
      case normalizedMessage === ".script":
      case normalizedMessage === ".repo":
        await githubCommand(sock, chatId, message);
        break;
      case normalizedMessage.startsWith(".antibadword"):
        if (!isGroup) {
          await sock.sendMessage(
            chatId,
            {
              text: "This command can only be used in groups.",
              
            },
            { quoted: message },
          );
          return;
        }

        const adminStatus = await isAdmin(sock, chatId, senderId);
        isSenderAdmin = adminStatus.isSenderAdmin;
        isBotAdmin = adminStatus.isBotAdmin;

        if (!isBotAdmin) {
          await sock.sendMessage(
            chatId,
            { text: "*Bot must be admin to use this feature*" },
            { quoted: message },
          );
          return;
        }

        await antibadwordCommand(sock, chatId, message);
        break;
      case commandName === "chatbot":
        if (!isGroup) {
          await sock.sendMessage(
            chatId,
            {
              text: "This command can only be used in groups.",
              
            },
            { quoted: message },
          );
          return;
        }

        // Check if sender is admin or bot owner
        const chatbotAdminStatus = await isAdmin(sock, chatId, senderId);
        if (!chatbotAdminStatus.isSenderAdmin && !message.key.fromMe) {
          await sock.sendMessage(
            chatId,
            {
              text: "*Only admins or bot owner can use this command*",
              
            },
            { quoted: message },
          );
          return;
        }

        await handleChatbotCommand(sock, chatId, message, argsText);
        break;
      case commandName === "take" || commandName === "steal":
        {
          await takeCommand(sock, chatId, message, args);
        }
        break;
      case normalizedMessage === ".flirt":
        await flirtCommand(sock, chatId, message);
        break;
      case normalizedMessage.startsWith(".character"):
        await characterCommand(sock, chatId, message);
        break;
      case normalizedMessage.startsWith(".waste"):
        await wastedCommand(sock, chatId, message);
        break;
      case normalizedMessage === ".ship":
        if (!isGroup) {
          await sock.sendMessage(
            chatId,
            {
              text: "This command can only be used in groups!",
              
            },
            { quoted: message },
          );
          return;
        }
        await shipCommand(sock, chatId, message);
        break;
      case normalizedMessage === ".groupinfo" ||
        normalizedMessage === ".infogp" ||
        normalizedMessage === ".infogrupo":
        if (!isGroup) {
          await sock.sendMessage(
            chatId,
            {
              text: "This command can only be used in groups!",
              
            },
            { quoted: message },
          );
          return;
        }
        await groupInfoCommand(sock, chatId, message);
        break;
      case normalizedMessage === ".resetlink" ||
        normalizedMessage === ".revoke" ||
        normalizedMessage === ".anularlink":
        if (!isGroup) {
          await sock.sendMessage(
            chatId,
            {
              text: "This command can only be used in groups!",
              
            },
            { quoted: message },
          );
          return;
        }
        await resetlinkCommand(sock, chatId, senderId);
        break;
      case normalizedMessage === ".staff" ||
        normalizedMessage === ".admins" ||
        normalizedMessage === ".listadmin":
        if (!isGroup) {
          await sock.sendMessage(
            chatId,
            {
              text: "This command can only be used in groups!",
              
            },
            { quoted: message },
          );
          return;
        }
        await staffCommand(sock, chatId, message);
        break;
      case normalizedMessage.startsWith(".tourl") || normalizedMessage.startsWith(".url"):
        await urlCommand(sock, chatId, message);
        break;
      case normalizedMessage.startsWith(".emojimix") ||
        normalizedMessage.startsWith(".emix"):
        await emojimixCommand(sock, chatId, message);
        break;
      case normalizedMessage.startsWith(".tg") ||
        normalizedMessage.startsWith(".stickertelegram") ||
        normalizedMessage.startsWith(".tgsticker") ||
        normalizedMessage.startsWith(".telesticker"):
        await stickerTelegramCommand(sock, chatId, message);
        break;

      case normalizedMessage === ".vv":
        await viewOnceCommand(sock, chatId, message);
        break;
      case normalizedMessage.startsWith(".antivv") ||
        normalizedMessage.startsWith(".avv"): {
        const antivvArgs = userMessage.split(" ").slice(1);
        await antivvCommand(sock, chatId, message, antivvArgs);
        commandExecuted = true;
        break;
      }
      case normalizedMessage.startsWith(".antiscam"): {
        const antiscamArgs = userMessage.split(/\s+/).slice(1);
        await antiscamCommand(sock, chatId, message, antiscamArgs);
        commandExecuted = true;
        break;
      }
      case normalizedMessage.startsWith(".scamcheck") ||
        normalizedMessage.startsWith(".checkscam"): {
        const scamCheckArgs = userMessage.split(/\s+/).slice(1);
        await antiscamCommand(sock, chatId, message, ["check", ...scamCheckArgs]);
        commandExecuted = true;
        break;
      }
      case normalizedMessage === ".clearsession" || normalizedMessage === ".clearsesi":
        await clearSessionCommand(sock, chatId, message);
        break;
      case normalizedMessage.startsWith(".autostatus"):
        const autoStatusArgs = userMessage.split(" ").slice(1);
        await autoStatusCommand(sock, chatId, message, autoStatusArgs);
        break;
      case normalizedMessage.startsWith(".simp"):
        await simpCommand(sock, chatId, message);
        break;
      case normalizedMessage.startsWith(".metallic"):
        await textmakerCommand(sock, chatId, message, userMessage, "metallic");
        break;
      case normalizedMessage.startsWith(".ice"):
        await textmakerCommand(sock, chatId, message, userMessage, "ice");
        break;
      case normalizedMessage.startsWith(".snow"):
        await textmakerCommand(sock, chatId, message, userMessage, "snow");
        break;
      case normalizedMessage.startsWith(".impressive"):
        await textmakerCommand(
          sock,
          chatId,
          message,
          userMessage,
          "impressive",
        );
        break;
      case normalizedMessage.startsWith(".matrix"):
        await textmakerCommand(sock, chatId, message, userMessage, "matrix");
        break;
      case normalizedMessage.startsWith(".light"):
        await textmakerCommand(sock, chatId, message, userMessage, "light");
        break;
      case normalizedMessage.startsWith(".neon"):
        await textmakerCommand(sock, chatId, message, userMessage, "neon");
        break;
      case normalizedMessage.startsWith(".devil"):
        await textmakerCommand(sock, chatId, message, userMessage, "devil");
        break;
      case normalizedMessage.startsWith(".purple"):
        await textmakerCommand(sock, chatId, message, userMessage, "purple");
        break;
      case normalizedMessage.startsWith(".thunder"):
        await textmakerCommand(sock, chatId, message, userMessage, "thunder");
        break;
      case normalizedMessage.startsWith(".leaves"):
        await textmakerCommand(sock, chatId, message, userMessage, "leaves");
        break;
      case normalizedMessage.startsWith(".1917"):
        await textmakerCommand(sock, chatId, message, userMessage, "1917");
        break;
      case normalizedMessage.startsWith(".arena"):
        await textmakerCommand(sock, chatId, message, userMessage, "arena");
        break;
      case normalizedMessage.startsWith(".hacker"):
        await textmakerCommand(sock, chatId, message, userMessage, "hacker");
        break;
      case normalizedMessage.startsWith(".sand"):
        await textmakerCommand(sock, chatId, message, userMessage, "sand");
        break;
      case normalizedMessage.startsWith(".blackpink"):
        await textmakerCommand(sock, chatId, message, userMessage, "blackpink");
        break;
      case normalizedMessage.startsWith(".glitch"):
        await textmakerCommand(sock, chatId, message, userMessage, "glitch");
        break;
      case normalizedMessage.startsWith(".fire"):
        await textmakerCommand(sock, chatId, message, userMessage, "fire");
        break;
      case commandName === "antidelete":
        await handleAntideleteCommand(sock, chatId, message, argsText);
        break;
      case normalizedMessage === ".surrender":
        // Handle surrender command for tictactoe game
        await handleTicTacToeMove(sock, chatId, senderId, "surrender");
        break;
      case normalizedMessage === ".cleartmp":
        await clearTmpCommand(sock, chatId, message);
        break;
      case normalizedMessage === ".setpp":
        await setProfilePicture(sock, chatId, message);
        break;
      case commandName === "setgdesc":
        {
          const text = rawText.slice(usedPrefix.length + commandName.length).trim();
          await setGroupDescription(sock, chatId, senderId, text, message);
        }
        break;
      case commandName === "setgname":
        {
          const text = rawText.slice(usedPrefix.length + commandName.length).trim();
          await setGroupName(sock, chatId, senderId, text, message);
        }
        break;
      case normalizedMessage.startsWith(".setgpp"):
        await setGroupPhoto(sock, chatId, senderId, message);
        break;
      case normalizedMessage.startsWith(".instagram") ||
        normalizedMessage.startsWith(".insta") ||
        normalizedMessage === ".ig" ||
        normalizedMessage.startsWith(".ig "):
        await instagramCommand(sock, chatId, message);
        break;
      case normalizedMessage.startsWith(".igsc"):
        await igsCommand(sock, chatId, message, true);
        break;
      case normalizedMessage.startsWith(".igs"):
        await igsCommand(sock, chatId, message, false);
        break;
      case normalizedMessage.startsWith(".fb") || normalizedMessage.startsWith(".facebook"):
        await facebookCommand(sock, chatId, message);
        break;
      case normalizedMessage.startsWith(".music"):
        await playCommand(sock, chatId, message);
        break;
      case normalizedMessage.startsWith(".spotify"):
        await spotifyCommand(sock, chatId, message);
        break;
      case normalizedMessage.startsWith(".play") ||
        normalizedMessage.startsWith(".mp3") ||
        normalizedMessage.startsWith(".ytmp3") ||
        normalizedMessage.startsWith(".song"):
        await songCommand(sock, chatId, message);
        break;
      case normalizedMessage.startsWith(".video") || normalizedMessage.startsWith(".ytmp4"):
        await videoCommand(sock, chatId, message);
        break;
      case normalizedMessage.startsWith(".tiktok") || normalizedMessage.startsWith(".tt"):
        await tiktokCommand(sock, chatId, message);
        break;
      case normalizedMessage.startsWith(".gpt") || normalizedMessage.startsWith(".gemini"):
        await aiCommand(sock, chatId, message);
        break;
      case commandName === "translate" || commandName === "trt":
        await handleTranslateCommand(
          sock,
          chatId,
          message,
          argsText,
        );
        return;
      case commandName === "ss" ||
        commandName === "ssweb" ||
        commandName === "screenshot":
        await handleSsCommand(
          sock,
          chatId,
          message,
          argsText,
        );
        break;
      case normalizedMessage.startsWith(".areact") ||
        normalizedMessage.startsWith(".autoreact") ||
        normalizedMessage.startsWith(".autoreaction"):
        await handleAreactCommand(sock, chatId, message, isOwnerOrSudoCheck);
        break;
      case normalizedMessage.startsWith(".sudo"):
        await sudoCommand(sock, chatId, message);
        break;
      case normalizedMessage.startsWith(".setprefix"):
        {
          const args = userMessage.split(" ").slice(1);
          await setprefixCommand(sock, chatId, message, args);
        }
        break;
      case normalizedMessage === ".goodnight" ||
        normalizedMessage === ".lovenight" ||
        normalizedMessage === ".gn":
        await goodnightCommand(sock, chatId, message);
        break;
      case normalizedMessage === ".shayari" || normalizedMessage === ".shayri":
        await shayariCommand(sock, chatId, message);
        break;
      case normalizedMessage === ".roseday":
        await rosedayCommand(sock, chatId, message);
        break;
      case normalizedMessage.startsWith(".imagine") ||
        normalizedMessage.startsWith(".flux") ||
        normalizedMessage.startsWith(".dalle"):
        await imagineCommand(sock, chatId, message);
        break;
      case normalizedMessage === ".jid":
        await groupJidCommand(sock, chatId, message);
        break;
      case normalizedMessage.startsWith(".autotyping"):
        await autotypingCommand(sock, chatId, message);
        commandExecuted = true;
        break;
      case normalizedMessage.startsWith(".autoread"):
        await autoreadCommand(sock, chatId, message);
        commandExecuted = true;
        break;
      case normalizedMessage.startsWith(".heart"):
        await handleHeart(sock, chatId, message);
        break;
      case normalizedMessage.startsWith(".horny"):
        {
          const parts = userMessage.trim().split(/\s+/);
          const args = ["horny", ...parts.slice(1)];
          await miscCommand(sock, chatId, message, args);
        }
        break;
      case normalizedMessage.startsWith(".circle"):
        {
          const parts = userMessage.trim().split(/\s+/);
          const args = ["circle", ...parts.slice(1)];
          await miscCommand(sock, chatId, message, args);
        }
        break;
      case normalizedMessage.startsWith(".lgbt"):
        {
          const parts = userMessage.trim().split(/\s+/);
          const args = ["lgbt", ...parts.slice(1)];
          await miscCommand(sock, chatId, message, args);
        }
        break;
      case normalizedMessage.startsWith(".lolice"):
        {
          const parts = userMessage.trim().split(/\s+/);
          const args = ["lolice", ...parts.slice(1)];
          await miscCommand(sock, chatId, message, args);
        }
        break;
      case normalizedMessage.startsWith(".simpcard"):
        {
          const parts = userMessage.trim().split(/\s+/);
          const args = ["simpcard", ...parts.slice(1)];
          await miscCommand(sock, chatId, message, args);
        }
        break;
      case normalizedMessage.startsWith(".tonikawa"):
        {
          const parts = userMessage.trim().split(/\s+/);
          const args = ["tonikawa", ...parts.slice(1)];
          await miscCommand(sock, chatId, message, args);
        }
        break;
      case normalizedMessage.startsWith(".its-so-stupid"):
        {
          const parts = userMessage.trim().split(/\s+/);
          const args = ["its-so-stupid", ...parts.slice(1)];
          await miscCommand(sock, chatId, message, args);
        }
        break;
      case normalizedMessage.startsWith(".namecard"):
        {
          const parts = userMessage.trim().split(/\s+/);
          const args = ["namecard", ...parts.slice(1)];
          await miscCommand(sock, chatId, message, args);
        }
        break;

      case normalizedMessage.startsWith(".oogway2"):
      case normalizedMessage.startsWith(".oogway"):
        {
          const parts = userMessage.trim().split(/\s+/);
          const sub = normalizedMessage.startsWith(".oogway2") ? "oogway2" : "oogway";
          const args = [sub, ...parts.slice(1)];
          await miscCommand(sock, chatId, message, args);
        }
        break;
      case normalizedMessage.startsWith(".tweet"):
        {
          const parts = userMessage.trim().split(/\s+/);
          const args = ["tweet", ...parts.slice(1)];
          await miscCommand(sock, chatId, message, args);
        }
        break;
      case normalizedMessage.startsWith(".ytcomment"):
        {
          const parts = userMessage.trim().split(/\s+/);
          const args = ["youtube-comment", ...parts.slice(1)];
          await miscCommand(sock, chatId, message, args);
        }
        break;
      case normalizedMessage.startsWith(".comrade"):
      case normalizedMessage.startsWith(".gay"):
      case normalizedMessage.startsWith(".glass"):
      case normalizedMessage.startsWith(".jail"):
      case normalizedMessage.startsWith(".passed"):
      case normalizedMessage.startsWith(".triggered"):
        {
          const parts = userMessage.trim().split(/\s+/);
          const args = [commandName, ...parts.slice(1)];
          await miscCommand(sock, chatId, message, args);
        }
        break;
      case normalizedMessage.startsWith(".animu"):
        {
          const parts = userMessage.trim().split(/\s+/);
          const args = parts.slice(1);
          await animeCommand(sock, chatId, message, args);
        }
        break;
      // animu aliases
      case normalizedMessage.startsWith(".nom"):
      case normalizedMessage.startsWith(".poke"):
      case normalizedMessage.startsWith(".cry"):
      case normalizedMessage.startsWith(".kiss"):
      case normalizedMessage.startsWith(".pat"):
      case normalizedMessage.startsWith(".hug"):
      case normalizedMessage.startsWith(".wink"):
      case normalizedMessage.startsWith(".facepalm"):
      case normalizedMessage.startsWith(".face-palm"):
      case normalizedMessage.startsWith(".animuquote"):
      case normalizedMessage.startsWith(".quote"):
      case normalizedMessage.startsWith(".loli"):
        {
          let sub = commandName;
          if (sub === "facepalm") sub = "face-palm";
          if (sub === "quote" || sub === "animuquote") sub = "quote";
          await animeCommand(sock, chatId, message, [sub]);
        }
        break;
      case normalizedMessage === ".crop":
        await stickercropCommand(sock, chatId, message);
        commandExecuted = true;
        break;
      case normalizedMessage.startsWith(".pies"):
        {
          const parts = rawText.trim().split(/\s+/);
          const args = parts.slice(1);
          await piesCommand(sock, chatId, message, args);
          commandExecuted = true;
        }
        break;
      case normalizedMessage === ".china":
        await piesAlias(sock, chatId, message, "china");
        commandExecuted = true;
        break;
      case normalizedMessage === ".indonesia":
        await piesAlias(sock, chatId, message, "indonesia");
        commandExecuted = true;
        break;
      case normalizedMessage === ".japan":
        await piesAlias(sock, chatId, message, "japan");
        commandExecuted = true;
        break;
      case normalizedMessage === ".korea":
        await piesAlias(sock, chatId, message, "korea");
        commandExecuted = true;
        break;
      case normalizedMessage === ".india":
        await piesAlias(sock, chatId, message, "india");
        commandExecuted = true;
        break;
      case normalizedMessage === ".malaysia":
        await piesAlias(sock, chatId, message, "malaysia");
        commandExecuted = true;
        break;
      case normalizedMessage === ".thailand":
        await piesAlias(sock, chatId, message, "thailand");
        commandExecuted = true;
        break;
      case normalizedMessage.startsWith(".update"):
        {
          const parts = rawText.trim().split(/\s+/);
          const zipArg =
            parts[1] && parts[1].startsWith("http") ? parts[1] : "";
          await updateCommand(sock, chatId, message, zipArg);
        }
        commandExecuted = true;
        break;
      case normalizedMessage.startsWith(".removebg") ||
        normalizedMessage.startsWith(".rmbg") ||
        normalizedMessage.startsWith(".nobg"):
        await removebgCommand.exec(
          sock,
          message,
          userMessage.split(" ").slice(1),
        );
        break;
      case normalizedMessage.startsWith(".remini") ||
        normalizedMessage.startsWith(".enhance") ||
        normalizedMessage.startsWith(".upscale"):
        await reminiCommand(
          sock,
          chatId,
          message,
          userMessage.split(" ").slice(1),
        );
        break;
      case normalizedMessage.startsWith(".sora"):
        await soraCommand(sock, chatId, message);
        break;
      default: {
        let pluginExecuted = false;
        if (usedPrefix) {
          const plugin = getPlugin(commandName);
          if (plugin && typeof plugin.run === "function") {
            try {
              let senderAdmin = isSenderAdmin;
              let botAdmin = isBotAdmin;
              if (isGroup && (plugin.permission === "admin" || !isBotAdmin)) {
                try {
                  const adminStatus = await isAdmin(sock, chatId, senderId);
                  senderAdmin = Boolean(adminStatus.isSenderAdmin);
                  botAdmin = Boolean(adminStatus.isBotAdmin);
                } catch {}
              }

              if (plugin.group && !plugin.private && !isGroup) {
                await sock.sendMessage(
                  chatId,
                  { text: "❌ This command can only be used in groups." },
                  { quoted: message },
                );
                commandExecuted = true;
                pluginExecuted = true;
                break;
              }
              if (plugin.permission === "owner" && !isOwnerOrSudoCheck) {
                await sock.sendMessage(
                  chatId,
                  { text: "❌ This command is only available for the owner or sudo!" },
                  { quoted: message },
                );
                commandExecuted = true;
                pluginExecuted = true;
                break;
              }
              if (plugin.permission === "admin" && isGroup && !senderAdmin && !isOwnerOrSudoCheck) {
                await sock.sendMessage(
                  chatId,
                  { text: "❌ Only group admins can use this command." },
                  { quoted: message },
                );
                commandExecuted = true;
                pluginExecuted = true;
                break;
              }

              const reply = (text, opts = {}) =>
                sock.sendMessage(
                  chatId,
                  typeof text === "string" ? { text, ...opts } : { ...text, ...opts },
                  { quoted: message }
                );
              const safeSend = (content, opts = {}) =>
                sock.sendMessage(chatId, content, { quoted: message, ...opts }).catch(() => {});

              const contextInfo = message.message?.extendedTextMessage?.contextInfo || {};
              const mentionedJid = contextInfo.mentionedJid || [];
              const participant = contextInfo.participant || message.key?.participant || senderId;

              let groupMetadata = null;
              if (isGroup) {
                try {
                  groupMetadata = await sock.groupMetadata(chatId);
                } catch (e) {}
              }

              const theme = {
                botName: settings.botName || "Gabriel MD Bot",
                admin: "⛔ Only admins can use this command.",
                botAdmin: "⛔ I need to be an admin to perform this action.",
                owner: "⛔ This command is only available for the owner or sudo!",
                group: "❌ This command can only be used in groups.",
                private: "❌ This command can only be used in private chats."
              };

              const ctx = {
                jid: chatId,
                chatId,
                groupId: isGroup ? chatId : null,
                sender: senderId,
                senderId,
                isGroup,
                isAdmin: senderAdmin,
                isBotAdmin: botAdmin,
                isOwner: isOwnerOrSudoCheck,
                usedPrefix,
                prefix: usedPrefix,
                args,
                argsText,
                query: argsText || args.join(" "),
                text: userMessage,
                command: commandName,
                reply,
                safeSend,
                theme,
                contextInfo,
                mentionedJid,
                participant,
                groupMetadata,
              };

              await plugin.run(sock, message, args, ctx);
              commandExecuted = true;
              pluginExecuted = true;
            } catch (pluginErr) {
              console.error(`❌ Error executing plugin ${commandName}:`, pluginErr);
              await sock.sendMessage(
                chatId,
                { text: `❌ Error executing *${usedPrefix}${commandName}*: ${pluginErr.message || "Failed"}` },
                { quoted: message }
              ).catch(() => {});
              commandExecuted = true;
              pluginExecuted = true;
            }
          }
        }

        if (!pluginExecuted && isGroup) {
          // Handle non-command group messages
          if (userMessage && !usedPrefix) {
            // Make sure there's a message
            await handleChatbotResponse(
              sock,
              chatId,
              message,
              userMessage,
              senderId,
            );
          }
          await handleTagDetection(sock, chatId, message, senderId);
          await handleMentionDetection(sock, chatId, message);
          await handleAntimentionDetection(sock, chatId, message, senderId);
        }
        if (!pluginExecuted) {
          commandExecuted = false;
        }
        break;
      }
    }

    // If a command was executed, show typing status after command execution
    if (commandExecuted !== false) {
      // Command was executed, now show typing status after command execution
      await showTypingAfterCommand(sock, chatId);
    }

    // Function to handle .groupjid command
    async function groupJidCommand(sock, chatId, message) {
      const groupJid = message.key.remoteJid;

      if (!groupJid.endsWith("@g.us")) {
        return await sock.sendMessage(chatId, {
          text: "❌ This command can only be used in a group.",
        });
      }

      await sock.sendMessage(
        chatId,
        {
          text: `✅ Group JID: ${groupJid}`,
        },
        {
          quoted: message,
        },
      );
    }

    if (usedPrefix) {
      // After command is processed successfully
      await addCommandReaction(sock, message);
    }
  } catch (error) {
    console.error("❌ Error in message handler:", error.message);
    // Only try to send error message if we have a valid chatId
    if (chatId) {
      await sock.sendMessage(chatId, {
        text: "❌ Failed to process command!",
        
      });
    }
  }
}

async function handleGroupParticipantUpdate(sock, update) {
  try {
    const { id, participants, action, author } = update;

    // Check if it's a group
    if (!id.endsWith("@g.us")) return;

    // Respect bot mode: only announce promote/demote in public mode
    let isPublic = true;
    try {
      const modeData = JSON.parse(fs.readFileSync("./data/messageCount.json"));
      if (typeof modeData.isPublic === "boolean") isPublic = modeData.isPublic;
    } catch (e) {
      // If reading fails, default to public behavior
    }

    // Handle promotion events
    if (action === "promote") {
      if (!isPublic) return;
      await handlePromotionEvent(sock, id, participants, author);
      return;
    }

    // Handle demotion events
    if (action === "demote") {
      if (!isPublic) return;
      await handleDemotionEvent(sock, id, participants, author);
      return;
    }

    // Handle join events
    if (action === "add") {
      await handleJoinEvent(sock, id, participants);
    }

    // Handle leave events
    if (action === "remove") {
      await handleLeaveEvent(sock, id, participants);
    }
  } catch (error) {
    console.error("Error in handleGroupParticipantUpdate:", error);
  }
}

// Instead, export the handlers along with handleMessages
module.exports = {
  handleMessages,
  handleGroupParticipantUpdate,
  handleStatus: async (sock, status) => {
    await handleStatusUpdate(sock, status);
  },
};
