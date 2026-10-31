'use strict';

const fs   = require('fs');
const path = require('path');
const { getPrimaryPrefix } = require('../lib/prefix');

const STATE_PATH = path.join(__dirname, '../data/antivv.json');

// ─── persistence helpers ─────────────────────────────────────────
function readState() {
    try {
        if (!fs.existsSync(STATE_PATH)) return { enabled: true };
        return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    } catch {
        return { enabled: true };
    }
}

function writeState(state) {
    try {
        const dir = path.dirname(STATE_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
    } catch (err) {
        console.error('[antivv] State save error:', err);
    }
}

// ─── command handler ─────────────────────────────────────────────
async function antivvCommand(sock, chatId, message, args) {
    const senderId = message.key.participant || message.key.remoteJid;

    // Owner-only guard
    const isOwnerOrSudo = require('../lib/isOwner');
    const isOwner = message.key.fromMe || (await isOwnerOrSudo(senderId, sock, chatId));
    if (!isOwner) {
        return sock.sendMessage(
            chatId,
            { text: '🚫 *Only the bot owner can use this command.*' },
            { quoted: message },
        );
    }

    const state = readState();
    const sub   = (Array.isArray(args) ? args[0] : (args || '')).toLowerCase();

    if (sub === 'on') {
        state.enabled = true;
    } else if (sub === 'off') {
        state.enabled = false;
    } else if (sub === 'status') {
        const icon  = state.enabled ? '✅' : '❌';
        const label = state.enabled ? 'ENABLED' : 'DISABLED';
        return sock.sendMessage(
            chatId,
            { text: `${icon} *Anti-ViewOnce is currently ${label}*` },
            { quoted: message },
        );
    } else {
        // No argument → flip current state
        state.enabled = !state.enabled;
    }

    writeState(state);

    const icon  = state.enabled ? '✅' : '❌';
    const label = state.enabled ? 'ENABLED' : 'DISABLED';

    await sock.sendMessage(chatId, {
        react: { text: state.enabled ? '👁️' : '🙈', key: message.key },
    });

    return sock.sendMessage(
        chatId,
        {
            text: `${icon} *Anti-ViewOnce ${label}*\n\n${
                state.enabled
                    ? '👁️ All view-once messages will be automatically revealed and forwarded to the owner.'
                    : '🙈 Automatic view-once reveal is now off.'
            }\n\n_Usage: ${getPrimaryPrefix()}antivv on | off | status_`,
        },
        { quoted: message },
    );
}

module.exports = { antivvCommand, readState };
