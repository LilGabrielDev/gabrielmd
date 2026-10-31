const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── Global in-memory stores ──────────────────────────────────────────
if (!global.groupMsgMap) global.groupMsgMap = new Map();
if (!global.groupJoinLog) global.groupJoinLog = new Map();
if (!global.antiDemoteGroups) global.antiDemoteGroups = new Set();
if (!global.pollRegistry) global.pollRegistry = new Map();

// ── Message tracking hook ────────────────────────────────────────────
// Called from main.js handleMessages after each message is processed.
async function handleMessageEvent(sock, message) {
    try {
        const chatId = message.key?.remoteJid;
        const senderId = message.key?.participant || message.key?.remoteJid;
        if (!chatId || !senderId) return;
        if (!chatId.endsWith("@g.us")) return;
        if (message.key?.fromMe) return;

        const msgMap = global.groupMsgMap;
        if (!msgMap.has(chatId)) msgMap.set(chatId, new Map());
        const senderMap = msgMap.get(chatId);
        const num = senderId.split("@")[0];
        senderMap.set(num, (senderMap.get(num) || 0) + 1);
    } catch { /* ignore */ }
}

// ── Group participant hook ───────────────────────────────────────────
// Called from main.js handleGroupParticipantUpdate.
async function handleGroupParticipantEvent(sock, update) {
    try {
        const { id, participants, action } = update;
        if (!id || !id.endsWith("@g.us")) return;

        const log = global.groupJoinLog.get(id) || [];
        const groupMetadata = await sock.groupMetadata(id).catch(() => null);
        const groupName = groupMetadata?.subject || id;

        for (const participant of participants) {
            const pId = typeof participant === "string" ? participant : participant.id;
            const num = pId.split("@")[0];
            let name = num;

            try {
                const contact = await sock.getBusinessProfile(pId);
                if (contact?.name) { name = contact.name; }
                else {
                    const parts = groupMetadata?.participants || [];
                    const found = parts.find((p) => p.id === pId);
                    if (found?.name) name = found.name;
                }
            } catch { /* use num as fallback */ }

            log.unshift({
                action,
                num,
                name,
                ts: Date.now(),
            });
        }

        while (log.length > 50) log.pop();
        global.groupJoinLog.set(id, log);

        // Anti-demote check on demote events
        if (action === "demote" && global.antiDemoteGroups.has(id)) {
            const { handleAntiDemote } = require("./commands/antidemote");
            await handleAntiDemote(sock, id, participants, update.author);
        }
    } catch { /* ignore */ }
}

// ── Poll update hook ─────────────────────────────────────────────────
// Called from index.js messages.upsert for poll update messages.
async function handlePollUpdateEvent(key, update, sock) {
    try {
        if (typeof global.pollUpdateHook === "function") {
            await global.pollUpdateHook(key, update, sock);
        }
    } catch { /* ignore */ }
}

// ── Export hook setters so command files can register their hooks ───
function setPollUpdateHook(fn) {
    global.pollUpdateHook = fn;
}

module.exports = {
    handleMessageEvent,
    handleGroupParticipantEvent,
    handlePollUpdateEvent,
    setPollUpdateHook,
};