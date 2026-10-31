'use strict';

const fs = require('fs');
const path = require('path');
const { fmt } = require('../lib/theme');
const isOwnerOrSudo = require('../lib/isOwner');
const isAdmin = require('../lib/isAdmin');

// ─── Scam phrase patterns ─────────────────────────────────────────────────────
// Each entry: { label, patterns: [RegExp] }
const SCAM_CATEGORIES = [
    {
        label: 'Investment Fraud',
        patterns: [
            /double\s+your\s+(money|investment|cash|crypto|funds?|deposit|btc|eth|usdt)/i,
            /\d+[x×%]\s*(profit|return|roi|gains?)\s*(guaranteed|daily|weekly|monthly)?/i,
            /guaranteed\s+(returns?|profits?|income|investment|payouts?)/i,
            /invest\s+(and|to)\s+(earn|make|get)\s+[$€£]?\d+/i,
            /minimum\s+invest(ment)?\s+of?\s+[a-z$€£]*\s*\d+/i,
            /withdrawal\s+of\s+[a-z$€£]*\s*\d+\s*(daily|weekly|per\s+day)/i,
            /\b(ponzi|pyramid\s+scheme)\b/i,
            /send\s+(btc|eth|usdt|crypto|coins?|money|funds?)\s+(to|and\s+get)/i,
            /(cash|money)\s*(flip|flipping|multiplier)/i,
            /earn\s+passive\s+income\s*(daily|weekly|guaranteed)/i,
        ]
    },
    {
        label: 'Fake Giveaway / Prize',
        patterns: [
            /you\s+(have|'ve|ve|hav)\s+(won|win|been\s+selected)/i,
            /congratulations[\s\S]{0,60}(won|prize|winner|selected|reward)/i,
            /claim\s+your\s+(prize|reward|gift|winnings?|free\s+iphone|cash|funds?)/i,
            /free\s+(iphone|airpods|laptop|car|cash|money|gift\s*card|airtime|recharge|data)/i,
            /click\s+(here|the\s+link|below)\s+to\s+(claim|collect|receive|win)/i,
            /\b(giveaway|give\s*away)\b[\s\S]{0,40}(click|link|dm|text|whatsapp|t\.me)/i,
            /send\s+(your\s+)?(details|info|number|address)\s+to\s+claim/i,
            /anniversary\s+giveaway/i,
            /spin\s+the\s+wheel[\s\S]{0,30}(win|prize)/i,
        ]
    },
    {
        label: 'Phishing / Credential Theft',
        patterns: [
            /verify\s+your\s+(account|whatsapp|bank|mpesa|paypal|number|wallet)/i,
            /your\s+account\s+(will\s+be\s+)?(suspended|closed|disabled|banned|blocked)/i,
            /enter\s+your\s+(pin|password|otp|code|details|passcode)/i,
            /otp\s+(code\s+)?(for\s+verification|expired|invalid|do\s+not\s+share)/i,
            /bank\s+(details?|account\s+number)\s+(required|needed|send)/i,
            /log\s*in\s+to\s+(verify|confirm|update)\s+your/i,
            /click\s+here\s+to\s+(unblock|reactivate)\s+your/i,
        ]
    },
    {
        label: 'Loan / Money Mule Scam',
        patterns: [
            /instant\s+loan[\s\S]{0,40}(no\s+(credit|collateral|security)|apply\s+now|approved)/i,
            /quick\s+(loan|cash)[\s\S]{0,40}(no\s+documents?|apply\s+now|within\s+\d+\s*(mins?|hours?))/i,
            /transfer\s+(money|funds?)\s+(for\s+me|on\s+my\s+behalf|to\s+this\s+account)/i,
            /i\s+will\s+pay\s+you\s+\d+(%|percent)\s+(commission|for\s+transferring)/i,
            /help\s+me\s+(transfer|move|send)\s+(money|funds?|cash)/i,
            /loan\s+without\s+(crb|collateral|interest|security)/i,
        ]
    },
    {
        label: 'Crypto / Forex Scam',
        patterns: [
            /forex\s+(trading\s+)?(signal|mentor|expert|guaranteed|profit|vip)/i,
            /crypto\s+(trading\s+)?(signal|mentor|expert|guaranteed|roi|mining|doubler)/i,
            /bitcoin\s+(flip|doubler|multiplier|generator|mining)/i,
            /(recover\s+lost\s+crypto|crypto\s+recovery\s+expert|wallet\s+recovery)/i,
            /trade\s+(with\s+)?(me|us|our\s+(team|expert))\s+(and\s+earn|for\s+guaranteed)/i,
            /\$\d+\s+(per\s+day|daily)\s+(trading|forex|crypto|signal)/i,
            /binary\s+options?\s+(trading|investment|guaranteed)/i,
        ]
    },
    {
        label: 'Fake Job Offer',
        patterns: [
            /earn\s+\$?\d+(,\d+)?\s+(per\s+(day|week|month)|daily|weekly)\s+(from\s+home|online|working)/i,
            /work\s+from\s+home[\s\S]{0,50}earn\s+\$?\d+/i,
            /part[\s-]time\s+(job|work|earn)[\s\S]{0,40}(no\s+experience|anyone\s+can|daily\s+pay)/i,
            /whatsapp\s+(job|task|earn)\s+(daily|weekly|\$\d+)/i,
            /typing\s+job[\s\S]{0,40}earn\s+\$?\d+/i,
            /data\s+entry[\s\S]{0,50}no\s+(experience|skill|qualification)/i,
            /like\s+(youtube|tiktok|instagram)\s+videos?\s+(and|to)\s+earn/i,
            /watch\s+videos?\s+(and|to)\s+earn\s+money/i,
        ]
    },
];

// ─── Persistence ──────────────────────────────────────────────────────────────
const DATA_PATH = path.join(__dirname, '../data/antiscam.json');

function loadData() {
    try {
        if (fs.existsSync(DATA_PATH)) {
            const raw = fs.readFileSync(DATA_PATH, 'utf8');
            return JSON.parse(raw);
        }
    } catch { /* ignore */ }
    return {};
}

function saveData(data) {
    try {
        const dir = path.dirname(DATA_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
    } catch { /* ignore */ }
}

// ─── Global & Group config helpers ────────────────────────────────────────────
const DEFAULT_GLOBAL = { enabled: true, action: 'delete+warn' };

function getGlobalCfg() {
    const data = loadData();
    if (!data.global || typeof data.global !== 'object') return { ...DEFAULT_GLOBAL };
    return {
        enabled: typeof data.global.enabled === 'boolean' ? data.global.enabled : DEFAULT_GLOBAL.enabled,
        action: ['delete+warn', 'delete', 'warn', 'kick'].includes(data.global.action) ? data.global.action : DEFAULT_GLOBAL.action,
    };
}

/**
 * Get effective configuration for a group.
 * If per-group override exists, it takes precedence; otherwise falls back to global.
 */
function getGroupCfg(jid) {
    const data = loadData();
    const globalCfg = getGlobalCfg();

    if (jid && data[jid] && typeof data[jid] === 'object') {
        return {
            enabled: typeof data[jid].enabled === 'boolean' ? data[jid].enabled : globalCfg.enabled,
            action: ['delete+warn', 'delete', 'warn', 'kick'].includes(data[jid].action) ? data[jid].action : globalCfg.action,
        };
    }

    return { ...globalCfg };
}

// ─── Match helper ─────────────────────────────────────────────────────────────
function detectScam(text) {
    if (!text || typeof text !== 'string') return null;
    const cleanText = text.replace(/[*_~`]/g, '');
    for (const cat of SCAM_CATEGORIES) {
        for (const pattern of cat.patterns) {
            if (pattern.test(text) || pattern.test(cleanText)) {
                return cat.label;
            }
        }
    }
    return null;
}

// ─── Text extraction helper ──────────────────────────────────────────────────
function extractText(message) {
    if (!message) return '';
    const m = message.message || message;
    return (
        m?.conversation ||
        m?.extendedTextMessage?.text ||
        m?.imageMessage?.caption ||
        m?.videoMessage?.caption ||
        m?.documentMessage?.caption ||
        m?.buttonsResponseMessage?.selectedDisplayText ||
        m?.templateButtonReplyMessage?.selectedId ||
        m?.listResponseMessage?.title ||
        ''
    );
}

// ─── Main Command Function ────────────────────────────────────────────────────
async function antiscamCommand(sock, chatId, message, args = []) {
    const senderId = message.key.participant || message.key.remoteJid;
    const isGroup = Boolean(chatId && chatId.endsWith('@g.us'));
    const reply = (text) => sock.sendMessage(chatId, { text }, { quoted: message });

    const rawText = (extractText(message) || '').trim();
    const rawCmd = rawText.split(/\s+/)[0].replace(/^[.!#/]/, '').toLowerCase();

    const sub = (args[0] || '').toLowerCase();

    // ─── Scam check command (public / test tool) ───
    if (rawCmd === 'scamcheck' || rawCmd === 'checkscam' || sub === 'check' || sub === 'test' || sub === 'scamcheck') {
        const checkArgs = (sub === 'check' || sub === 'test' || sub === 'scamcheck') ? args.slice(1) : args;
        const checkText = checkArgs.join(' ').trim();
        if (!checkText) {
            return reply(fmt('❓ Provide text to check.\n\nExample: `.scamcheck I will double your investment`'));
        }
        const hit = detectScam(checkText);
        if (hit) {
            return reply(fmt(`🚨 *Scam Detected!*\n\nCategory: *${hit}*\n\n_The provided text matches a known scam pattern._`));
        }
        return reply(fmt('✅ *No scam patterns detected.*\n\n_Text appears clean based on known patterns._'));
    }

    // ─── Permission checks for configuration ───
    let isOwner = false;
    let isAdminUser = false;
    try {
        isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        if (!isOwner && isGroup) {
            const adminStatus = await isAdmin(sock, chatId, senderId);
            isAdminUser = Boolean(adminStatus.isSenderAdmin);
        }
    } catch (e) {
        console.error('Antiscam auth error:', e);
    }

    if (!isOwner && !isAdminUser) {
        return reply(fmt('⛔ Only group admins or the bot owner can configure antiscam.'));
    }

    const data = loadData();
    const globalCfg = getGlobalCfg();
    const groupCfg = isGroup ? getGroupCfg(chatId) : globalCfg;

    // ─── No subcommand or 'status' → show status ───
    if (!sub || sub === 'status') {
        let statusMsg = `🕵️ *Anti-Scam Filter*\n\n`;
        if (isGroup) {
            statusMsg += `*This Group:*\n`;
            statusMsg += `• Status: ${groupCfg.enabled ? '✅ ON' : '❌ OFF'}\n`;
            statusMsg += `• Action: *${groupCfg.action}*\n\n`;
            statusMsg += `*Global Default:*\n`;
            statusMsg += `• Status: ${globalCfg.enabled ? '✅ ON' : '❌ OFF'}\n`;
            statusMsg += `• Action: *${globalCfg.action}*\n\n`;
        } else {
            statusMsg += `*Global Status:*\n`;
            statusMsg += `• Status: ${globalCfg.enabled ? '✅ ON' : '❌ OFF'}\n`;
            statusMsg += `• Action: *${globalCfg.action}*\n\n`;
        }
        statusMsg += `*Commands:*\n`;
        statusMsg += `• \`.antiscam on\` — enable anti-scam\n`;
        statusMsg += `• \`.antiscam off\` — disable anti-scam\n`;
        statusMsg += `• \`.antiscam delete\` — silent delete\n`;
        statusMsg += `• \`.antiscam warn\` — warn sender\n`;
        statusMsg += `• \`.antiscam kick\` — delete + kick sender\n`;
        statusMsg += `• \`.antiscam delete+warn\` — delete & warn\n`;
        statusMsg += `• \`.scamcheck <text>\` — test text against patterns\n`;
        if (isOwner) {
            statusMsg += `• \`.antiscam global <on|off|delete|warn|kick>\` — configure global\n`;
        }
        statusMsg += `\n*Detects:*\n` + SCAM_CATEGORIES.map(c => `• ${c.label}`).join('\n');
        return reply(fmt(statusMsg));
    }

    // ─── Global configuration (owner only or when in private chat) ───
    if (sub === 'global' || !isGroup) {
        if (!isOwner) {
            return reply(fmt('⛔ Global configuration is restricted to the bot owner or sudo.'));
        }
        const globalSub = sub === 'global' ? (args[1] || '').toLowerCase() : sub;
        if (!data.global || typeof data.global !== 'object') {
            data.global = { ...DEFAULT_GLOBAL };
        }

        if (globalSub === 'on') {
            data.global.enabled = true;
            saveData(data);
            return reply(fmt(`🕵️ *Global Anti-Scam: ON*\n\nAction: *${data.global.action}*\nScam detection is now active globally.`));
        }
        if (globalSub === 'off') {
            data.global.enabled = false;
            saveData(data);
            return reply(fmt('🕵️ *Global Anti-Scam: OFF*\n\nGlobal scam detection is now disabled.'));
        }

        let actionVal = globalSub === 'set' ? (args[2] || '').toLowerCase() : globalSub;
        if (actionVal === 'deletewarn') actionVal = 'delete+warn';
        if (['delete', 'warn', 'kick', 'delete+warn'].includes(actionVal)) {
            data.global.action = actionVal;
            saveData(data);
            return reply(fmt(`✅ Global anti-scam action set to *${actionVal}*.`));
        }

        return reply(fmt('Usage: `.antiscam global on | off | delete | warn | kick | delete+warn`'));
    }

    // ─── Per-group configuration ───
    if (!data[chatId] || typeof data[chatId] !== 'object') {
        data[chatId] = { enabled: groupCfg.enabled, action: groupCfg.action };
    }

    if (sub === 'on') {
        data[chatId].enabled = true;
        saveData(data);
        return reply(fmt(`🕵️ *Anti-Scam: ON*\n\nAction: *${data[chatId].action}*\nScam detection is now active for this group.`));
    }

    if (sub === 'off') {
        data[chatId].enabled = false;
        saveData(data);
        return reply(fmt('🕵️ *Anti-Scam: OFF*\n\nScam detection is now disabled for this group.'));
    }

    let actionVal = sub === 'set' ? (args[1] || '').toLowerCase() : sub;
    if (actionVal === 'deletewarn') actionVal = 'delete+warn';
    if (['delete', 'warn', 'kick', 'delete+warn'].includes(actionVal)) {
        data[chatId].action = actionVal;
        saveData(data);
        return reply(fmt(`✅ Anti-scam action for this group set to *${actionVal}*.`));
    }

    return reply(fmt('Usage: `.antiscam on | off | delete | warn | kick | delete+warn | check <text>`'));
}

// ─── Message event hook / scam detection ───────────────────────────────────────
async function handleScamDetection(sock, chatId, message, text, senderId) {
    if (!chatId || !chatId.endsWith('@g.us')) return;
    if (message._moderationHandled) return;

    // Check sender
    const sender = senderId || message.key?.participant || message.key?.remoteJid;
    if (!sender) return;

    // Ignore bot's own messages
    if (message.key?.fromMe) return;

    const candidateText = (text || extractText(message) || '').trim();
    if (!candidateText || candidateText.length < 5) return;

    // Ignore antiscam / scamcheck test commands
    if (['.', '!', '#', '/'].some((p) => candidateText.startsWith(p))) {
        const withoutPrefix = candidateText.slice(1).trim().toLowerCase();
        const cmd = withoutPrefix.split(/\s+/)[0];
        if (['antiscam', 'scamcheck', 'checkscam'].includes(cmd)) return;
    }

    const cfg = getGroupCfg(chatId);
    if (!cfg.enabled) return;

    const hit = detectScam(candidateText);
    if (!hit) return;

    // Exempt owner and sudo
    let isOwner = false;
    try {
        isOwner = await isOwnerOrSudo(sender, sock, chatId);
    } catch { /* ignore */ }
    if (isOwner) return;

    // Check admin status using lib/isAdmin for full Baileys v7 LID & phone support
    let isBotAdmin = false;
    let isSenderAdmin = false;
    try {
        const adminStatus = await isAdmin(sock, chatId, sender);
        isBotAdmin = Boolean(adminStatus.isBotAdmin);
        isSenderAdmin = Boolean(adminStatus.isSenderAdmin);
    } catch (err) {
        console.error('Error checking isAdmin in antiscam:', err);
    }

    // Exempt group admins
    if (isSenderAdmin) return;

    const senderNum = sender.split('@')[0].split(':')[0];
    const action = cfg.action || 'delete+warn';

    // Mark message as handled by moderation
    message._moderationHandled = true;

    // Delete scam message if bot is admin
    if (['delete', 'delete+warn', 'kick'].includes(action)) {
        if (isBotAdmin) {
            try {
                await sock.sendMessage(chatId, { delete: message.key });
            } catch (e) {
                console.error('Failed to delete scam message:', e?.message || e);
            }
        }
    }

    // Warn sender
    if (['delete+warn', 'warn'].includes(action)) {
        try {
            await sock.sendMessage(chatId, {
                text: fmt(
                    `🚨 *Scam Alert!*\n\n` +
                    `@${senderNum} — your message was flagged as potential *${hit}*.\n\n` +
                    `⚠️ Fraudulent schemes and scam messages are prohibited in this group.\n` +
                    `_Admins have been alerted._`
                ),
                mentions: [sender],
            });
        } catch (e) {
            console.error('Failed to send scam warning:', e?.message || e);
        }
    }

    // Kick sender
    if (action === 'kick') {
        if (isBotAdmin) {
            try {
                await sock.groupParticipantsUpdate(chatId, [sender], 'remove');
                await sock.sendMessage(chatId, {
                    text: fmt(
                        `🚫 @${senderNum} was *removed* for posting suspected *${hit}*.\n\n` +
                        `_Stay safe and never send crypto, cash, or OTP credentials to strangers._`
                    ),
                    mentions: [sender],
                });
            } catch (e) {
                console.error('Failed to kick scammer:', e?.message || e);
            }
        } else {
            try {
                await sock.sendMessage(chatId, {
                    text: fmt(
                        `🚨 *Scam Detected!*\n\n` +
                        `@${senderNum} posted suspected *${hit}*.\n` +
                        `⚠️ Bot requires admin permissions to remove this user.`,
                    ),
                    mentions: [sender],
                });
            } catch (e) {}
        }
    }
}

// ─── Plugin Interface ─────────────────────────────────────────────────────────
module.exports = {
    commands:    ['antiscam', 'scamcheck', 'checkscam'],
    description: 'Auto-detect and act on scam/fraud messages in groups',
    usage:       '.antiscam on | .antiscam off | .antiscam delete | .antiscam warn | .antiscam kick | .scamcheck <text>',
    permission:  'admin',
    group:       true,
    private:     true,

    run: async (sock, message, args, ctx) => {
        const chatId = ctx?.jid || message.key.remoteJid;
        return antiscamCommand(sock, chatId, message, args);
    },

    onMessage: async (sock, message, ctx) => {
        const chatId = ctx?.groupId || message.key.remoteJid;
        const senderId = ctx?.sender || message.key.participant || message.key.remoteJid;
        const text = extractText(message);
        return handleScamDetection(sock, chatId, message, text, senderId);
    }
};

// ─── Named exports (for main.js integration) ──────────────────────────────────
const pluginExport = module.exports;
pluginExport.antiscamCommand = antiscamCommand;
pluginExport.handleScamDetection = handleScamDetection;
pluginExport.detectScam = detectScam;
pluginExport.readState = loadData;
pluginExport.getGroupCfg = getGroupCfg;
pluginExport.getGlobalCfg = getGlobalCfg;
