const fs = require('fs');
const path = require('path');

// ── JID resolution helpers ─────────────────────────────────────────────

function extractNumber(jid) {
  if (!jid || typeof jid !== 'string') return '';
  // Remove LID suffix like ":4@lid"
  let num = jid.split(':')[0];
  // Remove domain suffix
  num = num.split('@')[0];
  return num.replace(/\D/g, '');
}

function resolvePhoneJid(jid) {
  const num = extractNumber(jid);
  if (num.length >= 7) return `${num}@s.whatsapp.net`;
  return null;
}

function resolveGroupJid(jid) {
  const num = extractNumber(jid);
  if (num.length >= 3) return `${num}@g.us`;
  return null;
}

function isGroupJid(jid) {
  return typeof jid === 'string' && jid.endsWith('@g.us');
}

function isUserJid(jid) {
  return typeof jid === 'string' && (
    jid.endsWith('@s.whatsapp.net') ||
    jid.includes('@lid')
  );
}

module.exports = {
  extractNumber,
  resolvePhoneJid,
  resolveGroupJid,
  isGroupJid,
  isUserJid,
};
